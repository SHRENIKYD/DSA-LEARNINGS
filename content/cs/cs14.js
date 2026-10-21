(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ---------- tiny helpers shared by the visualizers ---------- */
function bx(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
function gph(label, h, nodes, edges, hl, ehl, tags, directed) {
  return { type: 'graph', label: label, directed: directed !== false, height: h, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
}
function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

/* =====================================================================
   TOPIC 1 - QUIC
   ===================================================================== */
topics.push({
  title: 'QUIC Internals: Streams, Connection IDs, 0-RTT and Loss Recovery',
  analogy: `<p>TCP is a <b>single-lane tunnel</b>: if one car breaks down, every car behind it waits, even cars going to a different town. QUIC is a <b>multi-lane highway</b> built on top of a cheap, no-promises road (UDP): each lane (stream) has its own order, so a breakdown in lane 2 never stops lane 1. And your QUIC "address" is not your street (IP) but a <b>membership card number</b> (connection ID), so when you move house, the club still knows it is you.</p>`,
  explain: `<p>QUIC (RFC 9000, the transport under HTTP/3) is a transport protocol that runs <b>inside UDP packets</b> and fixes four old pains of TCP + TLS:</p>
  <ul>
  <li>🟢 <b>No head-of-line (HOL) blocking between streams.</b> TCP gives the app one ordered byte stream. If packet 3 is lost, packets 4, 5, 6 sit in the kernel until 3 is re-sent, even if they belong to a different image or API call. QUIC has many independent <b>streams</b>; ordering is only enforced <i>inside</i> one stream.</li>
  <li>🟢 <b>Faster start.</b> TCP handshake (1 RTT) + TLS 1.3 handshake (1 more RTT) = 2 round trips before the first byte of the request. QUIC merges transport and TLS 1.3 into one handshake: <b>1 RTT</b> on a new server, and <b>0-RTT</b> when you have talked to the server before (you send the request in your very first packet).</li>
  <li>🟢 <b>Connections survive network changes.</b> TCP identifies a connection by the 4-tuple (src IP, src port, dst IP, dst port). Change from Wi-Fi to LTE and your source IP changes: the connection is dead. QUIC identifies a connection by a <b>Connection ID</b> chosen by the endpoints, so the same connection continues on a new path (<i>connection migration</i>).</li>
  <li>🟢 <b>Always encrypted.</b> TLS 1.3 is built in. Almost everything, even most of the header, is encrypted, so middleboxes cannot meddle (this is why QUIC can evolve quickly, no more "ossification").</li>
  </ul>
  ${H.table(['Feature', 'TCP + TLS 1.3', 'QUIC (HTTP/3)'], [
    ['Runs on', 'IP directly (kernel)', 'UDP (usually user space)'],
    ['Handshake to first request byte', '2 RTT (1 TCP + 1 TLS)', '1 RTT (0-RTT on resumption)'],
    ['Lost packet blocks...', '<span class="c-r">everything on the connection</span>', '<span class="c-g">only that stream</span>'],
    ['Connection identity', '4-tuple (IP+port)', '<span class="c-g">Connection ID</span>'],
    ['Encryption', 'Optional layer on top', 'Mandatory, built in']
  ])}
  <p>🔵 <b>Loss recovery</b> in QUIC is similar in spirit to TCP (RFC 9002) but cleaner. Every packet gets a <b>new, ever-increasing packet number</b> (a retransmitted frame travels in a NEW packet), so there is no "retransmission ambiguity". Receivers send ACK ranges. A packet is declared lost if a later packet was acknowledged by 3 packets (packet threshold) or if it is older than about 9/8 of the RTT (time threshold); a <b>Probe Timeout (PTO)</b> sends probes when nothing is acknowledged at all. Congestion control (Cubic, BBR...) is pluggable and lives in user space, so apps can upgrade it without a kernel update.</p>`,
  clues: ['"Why does HTTP/3 help on lossy mobile networks?" → streams without head-of-line blocking', '"User walks from Wi-Fi to LTE and the video call keeps going" → connection ID + migration', '"Reduce handshake latency / time to first byte" → 1-RTT QUIC, 0-RTT resumption', '"Why UDP?" → avoid middlebox/kernel ossification, deploy in user space', '"Replay attack" + "0-RTT" → only idempotent requests, anti-replay', '"Firewall blocks UDP/443" → client falls back to HTTP/2 over TCP'],
  code: [
    { lang: 'python', run: true, title: 'QUIC vs TCP head-of-line blocking (simulation)', code: `# 6 packets leave in order. Packet LOST gets dropped and arrives again at tick 10.
# We compute WHEN the application can finally read each packet's data.
# packet number -> (stream, index inside that stream)
packets = {1: ('A', 0), 2: ('B', 0), 3: ('C', 0), 4: ('A', 1), 5: ('B', 1), 6: ('C', 1)}
LOST = 3

def arrival(n):
    # normal packets arrive at tick n, the lost one is re-sent and arrives at tick 10
    return 10 if n == LOST else n

def tcp_ready(n):
    # TCP: one ordered byte stream -> data n is readable only when ALL packets <= n arrived
    return max(arrival(k) for k in packets if k <= n)

def quic_ready(n):
    # QUIC: ordering only inside the same stream
    s, idx = packets[n]
    return max(arrival(k) for k, (s2, i2) in packets.items() if s2 == s and i2 <= idx)

print("pkt stream  arrives  TCP readable  QUIC readable")
tcp_wait = quic_wait = 0
for n in sorted(packets):
    t, q = tcp_ready(n), quic_ready(n)
    tcp_wait += t - arrival(n)
    quic_wait += q - arrival(n)
    print(f"{n:>3} {packets[n][0]:>6} {arrival(n):>8} {t:>13} {q:>14}")
print("extra waiting ticks stuck behind the loss -> TCP:", tcp_wait, " QUIC:", quic_wait)
` },
    { lang: 'bash', check: false, title: 'Try QUIC from the command line', code: `# curl built with HTTP/3 support
curl --http3 -I https://cloudflare-quic.com/

# See the Alt-Svc header a server uses to advertise HTTP/3 on UDP 443
curl -sI https://www.google.com | grep -i alt-svc

# Capture QUIC packets (Wireshark decodes them if you export TLS keys with SSLKEYLOGFILE)
sudo tcpdump -ni any 'udp port 443' -c 10` }
  ],
  codeTitle: ['Simulation: one lost packet, TCP vs QUIC', 'Commands to observe QUIC'],
  viz: [{
    title: 'One lost packet: TCP byte stream vs QUIC streams',
    input: '3',
    inputLabel: 'Which packet (1-6) is lost?',
    gen: function (input) {
      var lost = parseInt(String(input).trim(), 10);
      if (isNaN(lost) || lost < 1 || lost > 6) throw new Error('Type a packet number from 1 to 6');
      var names = ['A1', 'B1', 'C1', 'A2', 'B2', 'C2'], streams = ['A', 'B', 'C'];
      var sOf = function (n) { return (n - 1) % 3; }, iOf = function (n) { return Math.floor((n - 1) / 3); };
      var colHead = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
      function tcpGrid(stage) { // stage: 0 sent, 1 loss, 2 blocked, 3 fixed
        var row = [], hl = {};
        for (var n = 1; n <= 6; n++) {
          var c = n - 1;
          if (stage === 0) { row.push(names[c] + ' sent'); hl['0,' + c] = 'win'; }
          else if (n < lost) { row.push(names[c] + ' read'); hl['0,' + c] = 'ok'; }
          else if (n === lost) { row.push(stage === 3 ? names[c] + ' read' : 'LOST'); hl['0,' + c] = stage === 3 ? 'ok' : 'bad'; }
          else { row.push(stage === 3 ? names[c] + ' read' : names[c] + ' stuck'); hl['0,' + c] = stage === 3 ? 'ok' : 'cur'; }
        }
        return { type: 'grid', label: 'TCP: ONE ordered byte stream (packets in order)', colHead: colHead, rowHead: ['bytes'], rows: [row], hl: hl };
      }
      function quicGrid(stage) {
        var rows = [[], [], []], hl = {};
        for (var n = 1; n <= 6; n++) {
          var r = sOf(n), c = iOf(n), txt, cls;
          var blockedByLoss = (n !== lost) && sOf(lost) === r && iOf(lost) < c;
          if (stage === 0) { txt = names[n - 1] + ' sent'; cls = 'win'; }
          else if (n === lost) { txt = stage === 3 ? names[n - 1] + ' read' : 'LOST'; cls = stage === 3 ? 'ok' : 'bad'; }
          else if (blockedByLoss && stage < 3) { txt = names[n - 1] + ' waits'; cls = 'cur'; }
          else { txt = names[n - 1] + ' read'; cls = 'ok'; }
          rows[r].push(txt); hl[r + ',' + c] = cls;
        }
        return { type: 'grid', label: 'QUIC: three independent streams', colHead: ['1st frame', '2nd frame'], rowHead: ['stream A', 'stream B', 'stream C'], rows: rows, hl: hl };
      }
      var lostStream = streams[sOf(lost)];
      var stuckQuic = (iOf(lost) === 0) ? 1 : 0;
      return [
        { narr: 'A page needs 3 things (streams A, B, C). Each sends 2 packets, numbered 1-6 in the order they leave. <b>Same data, same network</b>, two transports.', parts: [tcpGrid(0), quicGrid(0)] },
        { narr: 'Packet <b>' + lost + '</b> (' + names[lost - 1] + ') is dropped by the network. Everything else arrives fine.', parts: [tcpGrid(1), quicGrid(1)] },
        { narr: '<b>TCP</b>: the kernel only hands over bytes in order. Packets after #' + lost + ' arrived but are <span class="c-y">stuck</span> in the receive buffer: ' + (lost === 6 ? 'nothing was behind it this time (try 1!).' : 'streams that did not lose anything wait anyway.'), parts: [tcpGrid(2), quicGrid(1)] },
        { narr: '<b>QUIC</b>: only stream <b>' + lostStream + '</b> waits, and only for its own later frame (' + stuckQuic + ' frame blocked). Streams ' + streams.filter(function (s) { return s !== lostStream; }).join(' and ') + ' keep flowing, so the page keeps rendering.', parts: [tcpGrid(2), quicGrid(2)] },
        { narr: 'Sender notices the loss (a later ACK skipped #' + lost + ') and re-sends the frame. In QUIC it travels in a <b>new packet number</b> (7), so the ACK is unambiguous.', parts: [tcpGrid(2), quicGrid(2), { type: 'vars', vals: { 'lost packet': lost, 'retransmitted as packet': 7 }, hl: { 'retransmitted as packet': 'ok' } }] },
        { narr: 'Recovered. TCP made <b>everything</b> wait for one hole; QUIC made at most one stream wait. On a lossy phone link this is a big win.', parts: [tcpGrid(3), quicGrid(3)] }
      ];
    }
  }, {
    title: 'Connection migration: same Connection ID, new path',
    gen: function () {
      var N = function (hlId) {
        return [bx('P', 'Phone', 8, 25, 14), bx('W', 'Wi-Fi AP', 40, 8, 14), bx('L', 'LTE tower', 40, 42, 14), bx('S', 'QUIC server', 85, 25, 18)];
      };
      return [
        { narr: 'Phone talks to the server over <b>Wi-Fi</b> (IP 192.168.1.5). The server remembers the connection by <b>Connection ID = 7f3a</b>, not by the IP.', parts: [gph('Path 1: Wi-Fi', 52, N(), [['P', 'W', 'CID 7f3a'], ['W', 'S', '']], { W: 'ok', S: 'ok' }, { 'P-W': 'ok', 'W-S': 'ok' }, { P: 'IP 192.168.1.5' })] },
        { narr: 'User walks out of the building. Wi-Fi fades; the phone now has a <b>different IP</b> (10.7.3.9) from the LTE network. A TCP connection would break here (4-tuple changed).', parts: [gph('Wi-Fi dies', 52, N(), [['P', 'W', ''], ['W', 'S', ''], ['P', 'L', '']], { W: 'bad' }, { 'P-W': 'bad', 'W-S': 'bad' }, { P: 'new IP 10.7.3.9' })] },
        { narr: 'The phone sends a packet from the new address with the <b>same Connection ID 7f3a</b>. The server sees a known CID from an unknown address and starts <b>path validation</b>: it sends a random PATH_CHALLENGE to the new address (this blocks attackers who spoof addresses).', parts: [gph('Path validation', 52, N(), [['P', 'L', 'CID 7f3a'], ['L', 'S', 'PATH_CHALLENGE?']], { L: 'cur', S: 'cur' }, { 'P-L': 'cur', 'L-S': 'cur' }, { S: 'validating' })] },
        { narr: 'The phone echoes the challenge as PATH_RESPONSE. The server now trusts the new path, resets congestion state for it (new path, unknown capacity) and continues the <b>same</b> connection: same streams, same TLS keys, no new handshake.', parts: [gph('Migrated', 52, N(), [['P', 'L', 'CID 7f3a'], ['L', 'S', 'PATH_RESPONSE ok']], { L: 'ok', S: 'ok' }, { 'P-L': 'ok', 'L-S': 'ok' }, { S: 'same session' })] },
        { narr: 'Privacy detail: the endpoints give each other <b>many</b> spare Connection IDs (NEW_CONNECTION_ID frames) and use a fresh one after migrating, so an observer cannot link your Wi-Fi traffic to your LTE traffic by the CID.', parts: [{ type: 'table', label: 'Connection ID pool', columns: ['CID', 'used on', 'state'], rows: [['7f3a', 'Wi-Fi', 'retired'], ['b21c', 'LTE', 'active'], ['e90d', '-', 'spare'], ['04aa', '-', 'spare']], hl: { 1: 'sel' } }] }
      ];
    }
  }],
  examples: [
    { title: 'Why video keeps playing when you leave Wi-Fi', html: `<p>Video app uses HTTP/3. Wi-Fi to LTE changes the source IP. The server looks up the connection by <b>CID</b>, validates the new path (1 RTT) and keeps sending. With TCP the app would see a reset, open a new connection, redo TCP + TLS (2 RTT) and often restart the segment download. Typical result: a tiny hiccup vs a visible stall.</p>` },
    { title: '1-RTT vs 0-RTT numbers', html: `<p>RTT = 50 ms. HTTP/2 over TCP + TLS 1.3: TCP SYN/SYN-ACK (50) + TLS (50) + request/response (50) = <b>150 ms</b> to first byte. QUIC first visit: handshake+request (50) + response... = <b>100 ms</b>. QUIC resumed with 0-RTT: request rides in the first flight, so <b>50 ms</b>.</p>${H.table(['Case', 'Round trips before response arrives'], [['TCP + TLS 1.3', '3'], ['QUIC first visit', '2'], ['QUIC 0-RTT', '1']])}` },
    { title: 'Why 0-RTT is only for safe requests', html: `<p>0-RTT data is encrypted with a key from a <i>previous</i> session, so an attacker who records it can <b>replay</b> the same packet to the server. A replayed <code>GET /home</code> is harmless; a replayed <code>POST /transfer?to=bob</code> is not. Servers should accept 0-RTT only for idempotent requests (or add anti-replay tokens) and clients must not send unsafe methods in 0-RTT.</p>`, code: { lang: 'text', check: false, code: `Client                                   Server
  | Initial + 0-RTT(GET /feed) ------->  |   request in FIRST flight
  | <------ Handshake + 1-RTT response   |   server may reject 0-RTT -> client re-sends after handshake
  | ---- 1-RTT data (everything safe) -->|` } }
  ],
  deepDive: `<p><b>Packet structure.</b> A QUIC UDP datagram holds one or more packets; each packet holds <b>frames</b> (STREAM, ACK, CRYPTO, NEW_CONNECTION_ID, PATH_CHALLENGE, MAX_DATA...). Long headers (Initial, Handshake, 0-RTT) carry both Connection IDs and version; short headers (1-RTT) carry just the destination CID, packet number (header-protected) and ciphertext. The packet number is encrypted, and header protection hides it from middleboxes.</p>
  <p><b>Flow control is two-level:</b> per-stream (MAX_STREAM_DATA) and per-connection (MAX_DATA). A slow-reading stream cannot eat all the receive buffer. <b>Stream IDs</b> encode who opened it (client/server) and whether it is bidirectional; a stream ends with a FIN bit and can be reset (RESET_STREAM) without killing the connection, which makes cancelling a download free.</p>
  <p><b>Amplification limit.</b> Until the server validated the client address, it may send at most 3x the bytes it received. This stops QUIC servers from being used in reflection attacks. Initial packets from clients are padded to 1200 bytes for this reason. A <b>Retry</b> packet (stateless token round trip) lets an overloaded server demand proof of address before allocating state.</p>
  <p><b>Load balancing consequence.</b> Because the 4-tuple changes on migration, an L4 load balancer that hashes the 5-tuple would send a migrated flow to a different backend. Production deployments encode a <b>server ID inside the connection ID</b> (QUIC-LB draft) so any LB can route by CID. The Linux kernel does not do QUIC; stacks (quiche, msquic, ngtcp2, quic-go) run in user space, so they cost more CPU than TCP unless using UDP GSO/GRO and sendmmsg. Also, some networks rate-limit or block UDP/443, so browsers race QUIC against TCP and fall back.</p>
  <p><b>Loss recovery details.</b> Separate packet number spaces for Initial, Handshake and Application data (each has its own ACKs). RTT is measured per ACK with the receiver's reported ack_delay removed. PTO = smoothed_rtt + 4*rttvar + max_ack_delay, doubling on each consecutive timeout. Because retransmitted data gets a new packet number, spurious retransmits are easy to detect and congestion windows are not wrongly shrunk. Head-of-line blocking still exists <i>within</i> one stream, and HTTP/3 maps each request to its own stream, which is exactly where it matters. QUIC DATAGRAM frames (RFC 9221) give unreliable delivery for games and real-time media.</p>`,
  aiEra: `<p><b>What AI changes:</b> Modern recommendation feeds, voice assistants and LLM chat UIs stream tokens over HTTP/3 or WebTransport; many tiny streams on flaky mobile links are exactly where QUIC shines. AI inference gateways also use QUIC-based protocols for multiplexed token streaming.</p>
  <p><b>Use AI as a partner:</b> paste a Wireshark/qlog trace and ask <code>Explain the PTO events and which stream was blocked</code>; ask it to generate qlog visualisation scripts or a table comparing congestion controllers. It is also great for producing "what if packet 2 is lost" quizzes.</p>
  <p><b>Where AI goes wrong:</b> it often says "QUIC removes all head-of-line blocking" (false: it removes <i>cross-stream</i> blocking, not blocking inside one stream), claims 0-RTT is "as safe as 1-RTT" (it is replayable), or says QUIC is faster in all cases (on clean wired links the gain is small and CPU cost is higher).</p>
  <p><b>You must still own:</b> the exact mechanism (connection IDs, path validation, packet numbers) and the trade-offs (UDP blocking, CPU, LB routing).</p>`,
  problems: [{
    title: 'Why does a QUIC call survive a Wi-Fi to LTE switch?',
    level: 'Medium', tags: ['QUIC', 'migration'], companies: ['Google', 'Cloudflare', 'Meta'],
    statement: `<p>A video-call app moves from a TCP-based protocol to HTTP/3 (QUIC). Users report that when they leave the office Wi-Fi the old TCP calls dropped and had to reconnect, but QUIC calls continue with only a short glitch. Explain exactly why, which packets are exchanged, and what could still break it on the server side.</p>`,
    constraints: `Explain at the protocol level (IDs, validation, keys). Mention one load-balancer pitfall.`,
    example: `<p>Before: phone IP 192.168.1.5, connection = (192.168.1.5:50000, server:443). After: phone IP 10.7.3.9. TCP: new 4-tuple = unknown connection → RST. QUIC: packet arrives with Connection ID <b>7f3a</b> → known connection.</p>`,
    brute: { why: `<p>"Just reconnect on failure": the app notices a timeout after several seconds, re-resolves, redoes TCP + TLS (2 RTT) and loses in-flight data. That is the weak answer: user-visible stall and no explanation of identity.</p>` },
    mcq: { q: 'What identifies a QUIC connection to the server after the client IP changes?', options: ['The source IP and port', 'The Connection ID carried in every packet', 'The TLS certificate'], answer: 1, explain: 'QUIC packets carry a Connection ID chosen by the endpoints; the 4-tuple is only the current path.' },
    hints: [`<p>Aha: the connection identity is no longer the 4-tuple, it is a number inside the packet.</p>`, `<p>Think about the security problem of accepting packets from a "new" address, spoofing, and how the server proves the client really owns it.</p>`, `<p>Recipe: new packet with old CID → server PATH_CHALLENGE → client PATH_RESPONSE → switch path, reset congestion window, retire old CID. Pitfall: an L4 LB hashing the 5-tuple sends the packet to another backend that knows nothing about the CID.</p>`],
    solution: {
      approach: `<p><b>Why it works.</b> In QUIC each endpoint chooses the Connection IDs that the peer must put in packets sent to it. The server's table is keyed by CID, so when the phone's source IP changes the datagram still carries a known CID and decrypts with the existing 1-RTT keys. The TLS session, stream state and flow-control credits all live in the connection, not in the network path.</p>
      <p><b>Safety.</b> The server does not blindly trust the new address (an attacker could forge it to redirect your video to a victim). It sends a PATH_CHALLENGE with random data to the new address; only a client that really receives it can answer with PATH_RESPONSE. Until validated, the server limits what it sends to the new address (anti-amplification). After validation, it starts congestion control from scratch for the new path because LTE and Wi-Fi have different capacity and RTT. The client also switches to a fresh Connection ID so on-path observers cannot correlate both networks.</p>
      <p><b>What can still break.</b> (1) A load balancer that picks the backend by hashing the 5-tuple will send the migrated flow to a different server, which resets it; fix by routing on a server ID encoded inside the Connection ID (QUIC-LB) or by a stateful CID table. (2) Networks that block or throttle UDP; clients should have a TCP fallback. (3) NAT rebinding on the same path looks like migration and works too, but a stateful firewall without a UDP flow entry for the new address may drop the first packet.</p>`,
      complexity: `<p>Cost: one extra round trip for path validation, no new handshake, no lost streams.</p>`,
      followUps: ['How does the server prevent amplification attacks during migration?', 'Why does the client rotate to a new CID after migrating?']
    }
  }]
});

/* =====================================================================
   TOPIC 2 - BGP
   ===================================================================== */
topics.push({
  title: 'BGP and Internet Routing: ASes, Path Selection, Hijacks and RPKI',
  analogy: `<p>The internet is a <b>network of countries</b> (autonomous systems). Inside a country, the government decides the roads (IGP like OSPF). Between countries, there are <b>treaties</b>: "I will carry your mail to these cities if you pay me / swap mail with me". BGP is the way countries <i>announce</i> "you can reach these cities through me, via this chain of countries". There is no world government checking the claims, so a country can lie ("all mail to Netflix comes to me!"). RPKI is a notary stamp that says which country is really allowed to announce which city.</p>`,
  explain: `<p>🟢 An <b>Autonomous System (AS)</b> is one organisation's network with its own routing policy, identified by an AS number (ASN): Google is AS15169, Cloudflare AS13335. More than 75,000 ASes appear in the global routing table. <b>BGP</b> (Border Gateway Protocol, v4) is the protocol they use to tell neighbours which IP <b>prefixes</b> (like 203.0.113.0/24) they can reach. It runs over TCP port 179.</p>
  <ul>
  <li><b>eBGP</b> = BGP between two different ASes (the "border"). <b>iBGP</b> = BGP between routers inside the same AS, to spread the externally learned routes. iBGP does not add the AS number to the path and needs a full mesh (or route reflectors) because iBGP routes are not re-advertised to other iBGP peers.</li>
  <li>An announcement carries the prefix plus <b>attributes</b>: the <b>AS_PATH</b> (list of ASes crossed so far, newest first, used for loop prevention and as a length metric), NEXT_HOP, LOCAL_PREF (only inside an AS), MED, ORIGIN, communities.</li>
  <li>Relationships drive policy: <b>customer</b> pays provider (provider carries customer's traffic to everywhere), <b>peers</b> swap their own customer traffic for free, <b>provider</b> sells transit. Rule of thumb ("valley-free"): prefer routes from customers (earn money), then peers, then providers (cost money); never give a peer's or provider's routes to another peer or provider.</li>
  </ul>
  <p>🔵 <b>Best-path selection (simplified, Cisco/Juniper-like order).</b> If a router hears the same prefix from several neighbours it keeps ONE best route by walking this list and stopping at the first tie-break that decides:</p>
  ${H.table(['#', 'Rule', 'Winner'], [['1', 'Highest <b>LOCAL_PREF</b>', 'your policy: customer 200 &gt; peer 150 &gt; provider 100'], ['2', 'Shortest <b>AS_PATH</b>', 'fewer ASes crossed'], ['3', 'Lowest ORIGIN', 'IGP &lt; EGP &lt; incomplete'], ['4', 'Lowest <b>MED</b>', 'only compared between routes from the same neighbour AS'], ['5', 'eBGP over iBGP', 'leave the AS soon'], ['6', 'Lowest IGP cost to NEXT_HOP', 'hot-potato routing'], ['7', 'Lowest router ID', 'final tie-break']])}
  <p>🔴 <b>Hijacks and leaks.</b> BGP trusts what neighbours say. A <b>hijack</b> is when an AS announces a prefix it does not own (or a more specific one, e.g. a /24 inside the victim's /22; the <b>longest prefix match</b> wins before any BGP rule!). A <b>route leak</b> is when an AS re-announces routes against the business rules (e.g. a customer passes provider A's routes to provider B), attracting traffic it cannot carry. Famous: Pakistan Telecom/YouTube 2008, Cloudflare 1.1.1.1 leaks, the 2019 Verizon leak.</p>
  <p>🛡️ <b>Defence: RPKI + ROV.</b> The owner of a prefix signs a <b>ROA</b> (Route Origin Authorization): "AS64500 may originate 203.0.113.0/22, max length 24". Networks doing <b>Route Origin Validation</b> (ROV) check each announcement: <span class="c-g">valid</span> (ROA matches origin AS and length), <span class="c-r">invalid</span> (ROA exists but origin or length is wrong → drop), <span class="c-m">not-found</span> (no ROA → accept for now). RPKI stops "wrong origin" and "too specific" hijacks, but not forged AS paths; <b>ASPA</b> and BGPsec/path validation are the next step. Other hygiene: IRR filters, max-prefix limits, prefix lists for customers, MANRS norms.</p>`,
  clues: ['"Which path does the router pick for this prefix?" → LOCAL_PREF, then AS-path length, then origin, MED...', '"Traffic to our site went through another country" → BGP hijack / leak', '"Longer prefix wins" even when AS path is longer → more-specific hijack', '"Customer vs peer vs transit" → LOCAL_PREF policy, valley-free', '"How do we make sure only the owner announces the prefix?" → RPKI ROA + ROV', '"iBGP vs eBGP" → AS_PATH untouched inside, route reflectors, next-hop-self'],
  code: [
    { lang: 'python', run: true, title: 'BGP best-path selector with RPKI origin validation', code: `# Each announcement a router has learned for the SAME prefix.
# Fields: neighbour, local_pref, as_path (newest first), origin, med, ebgp, igp_cost, router_id
ANN = [
    dict(nbr='ISP-A (provider)', lp=100, path=[100, 300, 64500], origin='IGP', med=0,  ebgp=True,  igp=10, rid='10.0.0.1'),
    dict(nbr='PEER-B (peer)',    lp=150, path=[200, 64500],      origin='IGP', med=50, ebgp=True,  igp=20, rid='10.0.0.2'),
    dict(nbr='CUST-C (customer)',lp=200, path=[400, 500, 600, 64500], origin='IGP', med=0, ebgp=True, igp=30, rid='10.0.0.3'),
    dict(nbr='EVIL-D (hijacker)',lp=100, path=[666],             origin='IGP', med=0,  ebgp=True,  igp=5,  rid='10.0.0.4'),
]
PREFIX = '203.0.113.0/24'
# RPKI ROAs: prefix block -> (authorised origin AS, max prefix length)
ROAS = {'203.0.113.0/24': (64500, 24)}
ORIGIN_RANK = {'IGP': 0, 'EGP': 1, '?': 2}

def rov(a):
    """Route Origin Validation: valid / invalid / not-found."""
    roa = ROAS.get(PREFIX)
    if roa is None:
        return 'not-found'
    asn, maxlen = roa
    return 'valid' if a['path'][-1] == asn else 'invalid'   # last AS in path = origin

def key(a):
    # smaller tuple wins, so negate "higher is better" fields
    return (-a['lp'], len(a['path']), ORIGIN_RANK[a['origin']], a['med'],
            0 if a['ebgp'] else 1, a['igp'], a['rid'])

def best(cands, use_rov):
    steps = []
    if use_rov:
        kept = []
        for a in cands:
            v = rov(a)
            steps.append(f"ROV {a['nbr']:<20} origin AS{a['path'][-1]} -> {v}")
            if v != 'invalid':
                kept.append(a)
        cands = kept
    names = ['local_pref (higher)', 'as_path length', 'origin', 'MED', 'eBGP>iBGP', 'IGP cost', 'router id']
    for i, nm in enumerate(names):
        vals = [key(a)[i] for a in cands]
        m = min(vals)
        keep = [a for a, v in zip(cands, vals) if v == m]
        if len(keep) < len(cands):
            steps.append(f"rule {i+1} {nm}: keep {[a['nbr'] for a in keep]}")
        cands = keep
        if len(cands) == 1:
            break
    return cands[0], steps

for use in (False, True):
    w, steps = best(ANN, use)
    print('=== ROV enabled:' , use, '===')
    for s in steps:
        print('  ', s)
    print('  BEST PATH ->', w['nbr'], 'AS_PATH', w['path'])
print()
print('Note: without ROV the hijacker has the shortest AS path (1 hop) but LOCAL_PREF was checked first;')
print('the customer route wins on policy. Try setting EVIL-D lp=200 to see a real hijack succeed, then re-enable ROV.')
` },
    { lang: 'text', check: false, title: 'FRRouting-style eBGP/iBGP config + RPKI (illustrative)', code: `router bgp 64500
 bgp router-id 10.0.0.1
 neighbor 192.0.2.1 remote-as 100        ! eBGP: different ASN = border
 neighbor 192.0.2.1 route-map FROM-ISP-A in
 neighbor 10.0.0.9  remote-as 64500      ! iBGP: same ASN
 neighbor 10.0.0.9  next-hop-self
 address-family ipv4 unicast
  network 203.0.113.0/24
  neighbor 192.0.2.1 maximum-prefix 800000   ! protect against leaks
 exit-address-family
!
route-map FROM-ISP-A permit 10
 match rpki valid
 set local-preference 100
route-map FROM-ISP-A permit 20
 match rpki notfound
 set local-preference 90
! 'invalid' routes match nothing -> implicit deny (dropped)
rpki
 rpki cache 198.51.100.7 3323 preference 1   ! RTR server feeding validated ROAs` }
  ],
  codeTitle: ['Best-path selection + ROV in Python', 'Router config sketch'],
  viz: [{
    title: 'AS topology: three announcements, one best path',
    gen: function () {
      var nodes = [bx('Y', 'You AS64500 router', 8, 24, 22), bx('A', 'ISP-A AS100 (provider)', 42, 4, 24), bx('B', 'Peer-B AS200', 42, 24, 22), bx('C', 'Cust-C AS400', 42, 44, 22), bx('D', 'Dest AS64999', 88, 24, 20)];
      var base = [['A', 'Y', ''], ['B', 'Y', ''], ['C', 'Y', ''], ['D', 'A', ''], ['D', 'B', ''], ['D', 'C', '']];
      function g(lbl, hl, ehl, tags) { return gph(lbl, 52, nodes, base, hl, ehl, tags); }
      return [
        { narr: 'Prefix 198.51.100.0/24 belongs to AS64999. Your router hears about it from <b>three neighbours</b>. Which one will it use to send traffic?', parts: [g('3 announcements reach you', {}, {}, { A: 'path: 100 300 64999', B: 'path: 200 64999', C: 'path: 400 500 64999' })] },
        { narr: 'Rule 1: <b>LOCAL_PREF</b>. Your policy: customers 200, peers 150, providers 100. So C=200, B=150, A=100. Highest wins: <b>Cust-C</b>, even though its AS path is the longest. Policy (money) beats distance.', parts: [g('Rule 1: LOCAL_PREF', { C: 'win', B: 'done', A: 'done' }, { 'C-Y': 'ok' }, { C: 'lp 200', B: 'lp 150', A: 'lp 100' }), { type: 'table', columns: ['neighbour', 'local_pref', 'as_path len'], rows: [['Cust-C', 200, 3], ['Peer-B', 150, 2], ['ISP-A', 100, 3]], hl: { 0: 'sel' } }] },
        { narr: 'Now imagine Cust-C is down. The remaining routes: Peer-B (lp 150) and ISP-A (lp 100) → <b>Peer-B</b> wins by LOCAL_PREF again.', parts: [g('Customer withdrawn', { C: 'bad', B: 'win', A: 'done' }, { 'B-Y': 'ok' }, { C: 'withdrawn', B: 'lp 150' })] },
        { narr: 'If two routes tie on LOCAL_PREF (say both providers at 100), rule 2 decides: the <b>shorter AS_PATH</b>. ISP-A: 3 ASes, another provider: 2 ASes → the 2-AS one wins. Prepending your own ASN several times is how an origin makes a path look longer on purpose (traffic engineering).', parts: [{ type: 'table', label: 'Tie on LOCAL_PREF', columns: ['route', 'lp', 'AS_PATH', 'len', 'verdict'], rows: [['via ISP-A', 100, '100 300 64999', 3, 'loses'], ['via ISP-E', 100, '500 64999', 2, 'WINS (shorter)']], hl: { 1: 'sel' } }] }
      ];
    }
  }, {
    title: 'A prefix hijack and how RPKI stops it',
    gen: function () {
      var nodes = [bx('U', 'User', 6, 24, 10), bx('T', 'Transit AS300', 32, 24, 18), bx('V', 'Victim AS64500 owns /22', 70, 6, 28), bx('H', 'Hijacker AS666', 70, 42, 22)];
      var edges = [['U', 'T', ''], ['T', 'V', ''], ['T', 'H', '']];
      function g(l, hl, ehl, tags) { return gph(l, 52, nodes, edges, hl, ehl, tags); }
      return [
        { narr: 'Normal: AS64500 announces <b>203.0.113.0/22</b>. Transit AS300 learns it and the user reaches the real server.', parts: [g('Normal day', { V: 'ok' }, { 'U-T': 'ok', 'T-V': 'ok' }, { V: 'announces /22' })] },
        { narr: 'The hijacker announces a <b>more specific 203.0.113.0/24</b> (a piece of the victim\'s block) with itself as origin. Routers always prefer the longest matching prefix BEFORE comparing any BGP attribute.', parts: [g('Hijack announced', { H: 'bad' }, { 'T-H': 'bad' }, { H: 'announces /24' })] },
        { narr: 'Without validation, AS300 accepts it. Traffic to addresses inside the /24 now flows to the hijacker (a black hole or a man-in-the-middle with a fake site). The real owner sees a sudden traffic drop.', parts: [g('Traffic stolen', { H: 'bad', V: 'done' }, { 'U-T': 'bad', 'T-H': 'bad' }, { H: 'gets traffic' })] },
        { narr: 'With <b>RPKI</b>: the owner published a ROA "AS64500, 203.0.113.0/22, maxLength 22". The hijack has the wrong origin AND is longer than maxLength → <span class="c-r">INVALID</span>. AS300 does ROV and drops it.', parts: [g('ROV drops the hijack', { V: 'ok', H: 'done' }, { 'U-T': 'ok', 'T-V': 'ok' }, { H: 'INVALID, dropped' }), { type: 'table', label: 'ROV decision', columns: ['announcement', 'origin', 'len', 'ROA says', 'result'], rows: [['203.0.113.0/22', 'AS64500', 22, 'AS64500 max 22', 'valid'], ['203.0.113.0/24', 'AS666', 24, 'AS64500 max 22', 'INVALID']], hl: { 1: 'sel' } }] },
        { narr: 'Limit: if the attacker forges the path as <code>300 64500</code> (pretending to be adjacent to the real origin) the origin looks correct, so ROV passes it. Path validation (ASPA / BGPsec) is needed for that. Also set <b>maxLength</b> tight; a loose maxLength lets the attacker announce a valid-looking /24.', parts: [{ type: 'text', html: '<b>Defence in depth:</b> RPKI ROV + ASPA, strict customer prefix filters, max-prefix limits, monitoring (RIPE RIS, BGPStream alerts), and a contact at your upstreams.' }] }
      ];
    }
  }],
  examples: [
    { title: 'Pick the best of 3 announcements', html: `<p>Prefix 10.8.0.0/16, learned from three eBGP neighbours:</p>${H.table(['Via', 'LOCAL_PREF', 'AS_PATH', 'MED'], [['N1', '100', '10 20 30', '0'], ['N2', '100', '50 30', '20'], ['N3', '90', '60 30', '0']])}<p>Rule 1: N3 loses (90). Rule 2: N2 has path length 2 &lt; N1's 3 → <b>N2 wins</b>. MED was never needed.</p>` },
    { title: 'Longest prefix beats everything', html: `<p>The victim announces /22. A hijacker announces a /24 inside it with a long AS path. A router holds both entries (different prefixes!) and the forwarding table picks the <b>/24</b> for addresses inside it. Best-path selection only compares routes for the <i>same</i> prefix. That is why max-length matters in a ROA.</p>` },
    { title: 'iBGP needs next-hop-self (or an IGP route to the edge)', html: `<p>Edge router R1 learns a route via eBGP with NEXT_HOP 192.0.2.1 (an external link). It tells core router R2 through iBGP; R2 has no route to 192.0.2.1, so the BGP route is unusable. Fix: R1 sets <code>next-hop-self</code> so R2 uses R1's loopback, which the IGP knows.</p>` }
  ],
  deepDive: `<p><b>Convergence.</b> BGP is a path-vector protocol: it can take minutes to converge after a failure (path exploration: routers try progressively longer backup paths). MRAI timers, route flap dampening (mostly discouraged now) and BFD (fast failure detection) matter. A single bad announcement spreads worldwide in seconds because every AS re-announces its best route.</p>
  <p><b>Route reflectors and confederations</b> remove the iBGP full-mesh requirement: a reflector re-advertises routes from one client to the others. Hot-potato (exit at the closest egress by IGP cost) vs cold-potato (carry traffic inside your network to the exit nearest the destination, used by content providers for quality). <b>Communities</b> tag routes ("do not export to peers", "blackhole", "prepend twice to AS X"), the real-world remote control for upstream routing, including <b>RTBH</b> (remotely triggered blackhole) used during DDoS.</p>
  <p><b>RPKI details.</b> The trust chain is: five RIRs (ARIN, RIPE, APNIC, LACNIC, AFRINIC) as trust anchors → certificates for resource holders → ROAs. Validators (Routinator, rpki-client, Fort) fetch and cryptographically verify objects and feed routers via the RTR protocol. States: valid / invalid / not-found. Over half of IPv4 prefixes now have ROAs, and most large transit networks drop invalids. Weaknesses: only origin validation (not the path), stale or misconfigured ROAs can cause self-inflicted outages (wrong maxLength after splitting a block), and the repository is a central dependency (validators cache). ASPA lets an AS publish its set of upstream providers so route leaks and many forged paths become detectable; BGPsec signs the whole path but is heavy and rarely deployed.</p>
  <p><b>Security of the session itself:</b> BGP runs over TCP/179, so use TCP-AO or MD5, GTSM (TTL 255 security check) so only directly-connected peers can talk to you, and control-plane policing. Internet-scale incidents: 2008 YouTube (Pakistan), 2018 Amazon Route 53 / MyEtherWallet DNS hijack, 2021 Facebook outage (not a hijack: Facebook withdrew its own routes by a config mistake, so its DNS servers vanished from the internet).</p>`,
  aiEra: `<p><b>What AI changes:</b> Network operators now use ML-assisted anomaly detection on BGP update streams (RIPE RIS, RouteViews) to flag hijacks and leaks in minutes; LLM agents draft route-maps and prefix filters from intent ("accept only my customer's registered prefixes") and review changes before push.</p>
  <p><b>Use AI as a partner:</b> ask it to explain a <code>show ip bgp</code> output line by line, generate test cases of 3 announcements with tricky ties, or convert a peering policy to FRR/Juniper syntax, then <b>verify in a lab</b> (containerlab, GNS3).</p>
  <p><b>Where AI goes wrong:</b> it mixes vendor order of decision steps (Cisco weight, Juniper preference), forgets that MED is only compared between the same neighbouring AS by default, treats RPKI as "authenticates traffic" (it only validates the origin), or happily generates a config with no max-prefix and no prefix filters, a ready-made route leak.</p>
  <p><b>You must still own:</b> the policy (who is customer/peer/provider), the blast radius of a change, and a rollback plan. Config pushed by an AI agent to a border router without human review is how outages go global.</p>`,
  problems: [{
    title: 'Pick the BGP best path from three announcements',
    level: 'Medium', tags: ['BGP', 'path selection'], companies: ['Cisco', 'Juniper', 'Cloudflare'],
    statement: `<p>Your router received three announcements for 198.51.100.0/24. All are eBGP, ORIGIN = IGP.</p>${H.table(['Neighbour', 'LOCAL_PREF', 'AS_PATH', 'MED', 'IGP cost to next hop'], [['A', '100', '65010 65020 65030', '10', '5'], ['B', '100', '65040 65030', '50', '9'], ['C', '200', '65050 65060 65070 65030', '0', '20']])}<p>Which one is installed? If C is later withdrawn, which one wins? Explain every step.</p>`,
    constraints: `Use the standard order: LOCAL_PREF, AS_PATH length, ORIGIN, MED (same neighbour AS only), eBGP over iBGP, IGP cost, router ID.`,
    example: `<p>${H.c('g', 'Winner: C')} (LOCAL_PREF 200 beats 100). After C withdraws: A and B tie on 100 → AS_PATH length B(2) &lt; A(3) → ${H.c('g', 'B wins')}.</p>`,
    brute: { why: `<p>"Pick the shortest AS path": that ignores LOCAL_PREF, which is evaluated first and is the operator's business policy. It would choose B and be wrong.</p>` },
    mcq: { q: 'Which attribute is compared first among those listed?', options: ['AS_PATH length', 'LOCAL_PREF', 'MED'], answer: 1, explain: 'Highest LOCAL_PREF is the first (policy) rule, evaluated before AS_PATH length.' },
    hints: [`<p>Write the order of rules on paper, then eliminate candidates, stopping when one remains.</p>`, `<p>LOCAL_PREF: higher wins. AS_PATH: count the ASes, shorter wins. MED is only for routes from the same neighbouring AS.</p>`, `<p>Edge cases: if C is withdrawn, A and B tie at rule 1; B's path is shorter. MED (50 vs 10) and IGP cost are never reached; A's lower MED is irrelevant because rule 2 already decided.</p>`],
    solution: {
      approach: `<p>Step 1, LOCAL_PREF: C = 200 beats A = B = 100. C is the only survivor, so <b>C is installed</b>, even though its AS path has 4 ASes, the longest. LOCAL_PREF encodes policy (C is probably a customer: we get paid to carry that traffic).</p>
      <p>If C is withdrawn: LOCAL_PREF ties (100 vs 100). Step 2, AS_PATH length: A has 3, B has 2, so <b>B wins</b>. We never get to MED (A's 10 would have beaten B's 50, but also MED is only comparable between routes from the same neighbouring AS, and here neighbours are 65010 vs 65040 so it would not be compared by default) or IGP cost.</p>
      <p>The lesson for interviews: recite the order, show where it stops, and say what a tie would fall through to (origin, MED, eBGP vs iBGP, IGP metric, router ID). Also mention that BGP picks one best route per prefix, but ECMP/multipath can install several equal ones if configured.</p>`,
      complexity: `<p>Selection per prefix is O(k) for k candidate routes.</p>`,
      followUps: ['What changes if the attacker announces a /25 inside this /24?', 'How would you steer inbound traffic towards provider B?']
    }
  }]
});

/* =====================================================================
   TOPIC 3 - ANYCAST
   ===================================================================== */
topics.push({
  title: 'Anycast: How CDNs and DNS Reach the Nearest PoP',
  analogy: `<p>Think of a <b>toll-free number</b> like 1-800-PIZZA. You always dial the same number, but the phone company connects you to the <b>nearest branch</b>. If the Mumbai branch closes, the company simply stops routing calls there and calls go to the next nearest one. You never change the number. Anycast is exactly that for IP addresses: many places announce the <b>same IP</b>, and the internet's routing sends each user to the closest announcer.</p>`,
  explain: `<p>🟢 In normal (<b>unicast</b>) IP, one address = one machine. In <b>anycast</b>, the <i>same prefix</i> (for example 1.1.1.0/24 or a CDN's 104.16.0.0/13) is announced by BGP from <b>many locations</b> (PoPs, points of presence) at once. Each router on the internet keeps the best path to that prefix (see BGP: usually shortest AS-path after policy), so packets from a user in India end up in Mumbai, from Germany in Frankfurt, without any special client logic.</p>
  <ul>
  <li><b>Who uses it:</b> DNS root servers (13 letters, 1,700+ instances), public resolvers (1.1.1.1, 8.8.8.8), CDNs (Cloudflare, Fastly, Google), DDoS scrubbing services.</li>
  <li><b>Why:</b> low latency (nearest PoP), automatic failover (a PoP stops announcing → traffic reroutes in seconds to minutes), and <b>DDoS absorption</b> (attack traffic is split across all PoPs by geography instead of hitting one site).</li>
  <li><b>"Nearest" means BGP-nearest, not geographic-nearest.</b> BGP picks by policy and AS-path length. A user in one city can land at a far PoP because their ISP peers with the CDN somewhere else. CDNs tune this with selective announcements, prepending and communities.</li>
  </ul>
  <p>🔵 <b>The catch: stateful connections.</b> UDP queries (DNS) are one packet, so anycast is perfect. TCP connections are many packets: if a BGP change moves you from PoP A to PoP B in the middle of a connection, B has no state and replies with RST. Practical fixes: (1) keep routes stable, short-lived connections; (2) PoPs share nothing but every server can handle any request (stateless web tier, TLS tickets with shared keys); (3) QUIC/Connection-ID aware routing; (4) per-PoP unicast addresses are kept for management and for DNS-based steering (<b>DNS + anycast hybrid</b>: a GeoDNS reply gives a regional anycast IP).</p>
  ${H.table(['Technique', 'How user finds a PoP', 'Failover speed', 'Weakness'], [['GeoDNS / latency DNS', 'DNS answer differs by resolver location', 'DNS TTL (seconds to minutes)', 'Based on the resolver\'s location, caching delays'], ['<b>Anycast</b>', 'BGP routing to nearest announcer', 'Seconds (withdraw route)', 'Route flaps break TCP; coarse control'], ['Client-side (app picks)', 'Probe and choose', 'Fast', 'Needs client logic']])}
  <p>🔴 Defensive view: anycast is one of the strongest DDoS tools, because a 1 Tbps flood from a botnet spread over the world arrives as maybe 20 Gbps at each of 50 PoPs, which each can absorb it.</p>`,
  clues: ['"Same IP served from many data centers" → anycast', '"How does 1.1.1.1 / a DNS root server stay fast and up?"', '"Failover without waiting for DNS TTL"', '"Attack traffic spread across PoPs" → anycast absorption', '"TCP resets after route change" → anycast + stateful flows problem', '"User in city X served from a far PoP" → BGP-nearest is not geography-nearest'],
  code: [
    { lang: 'python', run: true, title: 'Anycast: pick the nearest PoP by AS-path length', code: `# Each PoP announces the same prefix 198.51.100.0/24. For each user network we know how
# many AS hops lie between them and each PoP (BGP uses the shortest AS path after policy).
HOPS = {
    'user-Delhi':   {'Mumbai': 2, 'Frankfurt': 4, 'Virginia': 6},
    'user-Berlin':  {'Mumbai': 5, 'Frankfurt': 2, 'Virginia': 4},
    'user-Boston':  {'Mumbai': 7, 'Frankfurt': 4, 'Virginia': 2},
    'user-Cairo':   {'Mumbai': 3, 'Frankfurt': 3, 'Virginia': 5},   # tie -> router id / IGP cost decides
}
TIE_BREAK = ['Frankfurt', 'Mumbai', 'Virginia']   # stand-in for lowest router id

def route(user, live):
    cands = {p: h for p, h in HOPS[user].items() if p in live}
    best = min(cands.values())
    winners = [p for p in cands if cands[p] == best]
    return min(winners, key=TIE_BREAK.index)

def show(live, title):
    print(title, 'live PoPs =', sorted(live))
    for u in HOPS:
        print('   ', u.ljust(12), '->', route(u, live))

live = {'Mumbai', 'Frankfurt', 'Virginia'}
show(live, 'normal:')
live.discard('Frankfurt')          # Frankfurt withdraws its BGP announcement (outage or maintenance)
show(live, 'Frankfurt down:')
# Defensive view: spread a 600 Gbps attack by where the bots live
bots = {'user-Delhi': 150, 'user-Berlin': 250, 'user-Boston': 200}
load = {}
for u, gbps in bots.items():
    pop = route(u, {'Mumbai', 'Frankfurt', 'Virginia'})
    load[pop] = load.get(pop, 0) + gbps
print('attack split per PoP (Gbps):', load, ' max single PoP =', max(load.values()), 'of 600 total')
` },
    { lang: 'bash', check: false, title: 'Observe anycast in the wild', code: `# Which PoP answered me? (Cloudflare shows the airport code in the 'colo' field)
curl -s https://www.cloudflare.com/cdn-cgi/trace | grep colo

# DNS root/resolver instance identity (CHAOS class query)
dig +short CH TXT id.server @1.1.1.1
dig +short CH TXT hostname.bind @k.root-servers.net

# Path to an anycast IP; compare from different vantage points / looking glasses
mtr -rwc 10 1.1.1.1` }
  ],
  codeTitle: ['Anycast routing and failover simulation', 'Commands to see the serving PoP'],
  viz: [{
    title: 'Anycast: users reach the nearest PoP, failover when one withdraws',
    input: 'none',
    inputLabel: 'PoP to take down (Mumbai / Frankfurt / Virginia / none)',
    gen: function (input) {
      var down = String(input).trim().toLowerCase();
      var names = { mumbai: 'M', frankfurt: 'F', virginia: 'V', none: '' };
      if (!(down in names)) throw new Error('Type Mumbai, Frankfurt, Virginia or none');
      var dk = names[down];
      var nodes = [bx('U1', 'Delhi users', 6, 6, 16), bx('U2', 'Berlin users', 6, 24, 16), bx('U3', 'Boston users', 6, 42, 16),
        bx('M', 'PoP Mumbai', 80, 6, 18), bx('F', 'PoP Frankfurt', 80, 24, 20), bx('V', 'PoP Virginia', 80, 42, 20)];
      var hops = { U1: { M: 2, F: 4, V: 6 }, U2: { M: 5, F: 2, V: 4 }, U3: { M: 7, F: 4, V: 2 } };
      function pick(u, live) { var b = null; Object.keys(hops[u]).forEach(function (p) { if (live.indexOf(p) >= 0 && (b === null || hops[u][p] < hops[u][b])) b = p; }); return b; }
      function view(live, label) {
        var edges = [], ehl = {}, hl = {}, tags = {};
        ['U1', 'U2', 'U3'].forEach(function (u) { var p = pick(u, live); edges.push([u, p, hops[u][p] + ' hops']); ehl[u + '-' + p] = 'ok'; });
        ['M', 'F', 'V'].forEach(function (p) { hl[p] = live.indexOf(p) >= 0 ? 'ok' : 'bad'; tags[p] = live.indexOf(p) >= 0 ? 'announcing 198.51.100.0/24' : 'WITHDRAWN'; });
        return gph(label, 52, nodes, edges, hl, ehl, tags);
      }
      var all = ['M', 'F', 'V'];
      var frames = [
        { narr: 'Three PoPs all announce the <b>same prefix</b> via BGP. Nothing tells a user which PoP to use; the internet\'s routers each pick their best path.', parts: [gph('Same IP everywhere', 52, nodes, [], { M: 'ok', F: 'ok', V: 'ok' }, {}, { M: '198.51.100.1', F: '198.51.100.1', V: '198.51.100.1' })] },
        { narr: 'Each user network sends packets to 198.51.100.1. Routers choose the shortest AS-path: Delhi → Mumbai (2 hops), Berlin → Frankfurt (2), Boston → Virginia (2).', parts: [view(all, 'Nearest by BGP')] }
      ];
      if (dk) {
        var live = all.filter(function (p) { return p !== dk; });
        frames.push({ narr: '<b>' + down + '</b> has an outage (or planned maintenance) and its routers <b>withdraw</b> the BGP announcement. Within seconds routers drop that path.', parts: [view(live, 'PoP withdrawn (before reconvergence shown on edges)')] });
        frames.push({ narr: 'Everyone re-picks the best remaining path. Users that used ' + down + ' now go to the next nearest PoP; the other users are unaffected. <b>No DNS change, no client change.</b>', parts: [view(live, 'After failover'), { type: 'table', label: 'Who moved?', columns: ['users', 'before', 'after'], rows: [['Delhi', pick('U1', all), pick('U1', live)], ['Berlin', pick('U2', all), pick('U2', live)], ['Boston', pick('U3', all), pick('U3', live)]], hl: { 0: pick('U1', all) !== pick('U1', live) ? 'sel' : undefined } }] });
        frames.push({ narr: 'Caveat: a TCP connection that was in progress to the failed PoP is reset (the new PoP has no state). Short requests + retries hide this; long downloads need resumable transfers or QUIC-aware routing.', parts: [view(live, 'Stateful flows break'), { type: 'text', html: '<span class="c-y">In-flight TCP flows to the withdrawn PoP must reconnect.</span>' }] });
      } else {
        frames.push({ narr: 'Type a PoP name in the input box and press Run to watch it fail. Right now all three PoPs are healthy and every user takes its closest one.', parts: [view(all, 'All healthy')] });
        frames.push({ narr: 'Defensive bonus: a flood from bots in all three regions is split by geography: each PoP sees only its region\'s share, instead of one site seeing everything.', parts: [view(all, 'Attack split by region'), { type: 'table', columns: ['PoP', 'attack share'], rows: [['Mumbai', '25%'], ['Frankfurt', '42%'], ['Virginia', '33%']], hl: { 1: 'cur' } }] });
      }
      return frames;
    }
  }],
  examples: [
    { title: 'DNS root servers', html: `<p>There are 13 root server <i>addresses</i> (a.root-servers.net ... m), but each is anycast from dozens to hundreds of sites. Your resolver\'s query to "a" lands at the nearest instance. If one site dies, BGP removes it, and queries are single UDP packets so nothing is lost beyond a retry.</p>` },
    { title: 'Why a user in Pune gets Singapore', html: `<p>The user\'s ISP does not peer with the CDN in India, only in Singapore, where the AS path is shortest. "Nearest" in BGP = fewest ASes after policy, not kilometres. The CDN fixes it by peering in Mumbai or announcing the prefix there with better attributes.</p>` },
    { title: 'Anycast + TCP: the route-flap problem', html: `<p>Two equal-cost paths lead to PoP A and PoP B from the same ISP. ECMP in the ISP hashes flows, so a flow always uses the same path; but if a link flaps, some flows shift to B mid-connection and get RST. Mitigations: tie-break stability, more specific announcements for sensitive traffic, session tickets shared across PoPs, connection draining by prepending before maintenance.</p>`, code: { lang: 'text', check: false, code: `Graceful PoP maintenance:
 1. Add AS-path prepending x3 on this PoP\'s announcement   (traffic drifts away)
 2. Wait until connections drain (watch active conns)
 3. Withdraw the announcement and do the work
 4. Re-announce, remove the prepend gradually` } }
  ],
  deepDive: `<p><b>Control plane vs data plane.</b> BGP only chooses a path per <i>network</i>, not per user. Users behind one ISP mostly go to the same PoP. The CDN\'s traffic engineering knobs are: where it announces (selective announcement per peer/transit), AS-path prepending, communities and, for fine control, announcing different prefixes from different PoPs ("regional anycast": /24s per region plus DNS steering). Load imbalance is a real problem: a PoP with huge catchment can be overloaded while others idle, so CDNs shift traffic by withdrawing a more specific prefix or by internal redirects (L7 hand-off, Tunneling to a less busy PoP).</p>
  <p><b>Health-driven withdrawal.</b> A local daemon (e.g. ExaBGP, BIRD, or a router with BFD) announces the service prefix only while health checks pass; if the local service is dead, the announcement is withdrawn automatically. This is how a DNS or load-balancer cluster uses anycast inside one data center too (anycast VIP + ECMP across the L4 LBs).</p>
  <p><b>Measuring catchments.</b> Operators use probes (RIPE Atlas), CHAOS TXT queries, and traceroutes to map which user networks hit which PoP, and detect "path inflation" (users routed to far PoPs). Anycast also hides unicast IPs of PoPs, making targeted attacks on one PoP harder, but also complicates debugging ("which PoP did this request hit?" so PoPs add headers like CF-Ray / Via / colo).</p>
  <p><b>DDoS angle.</b> Anycast does not defeat attacks by itself: if one PoP\'s catchment contains most bots it still gets overwhelmed. Operators then "shed load" by withdrawing the prefix from that PoP so traffic spills to others (risking a cascade), or by blackholing / scrubbing locally. Capacity planning is per-PoP, not just global.</p>
  <p><b>Anycast and TLS/QUIC:</b> every PoP must hold the certificate private keys (or use keyless SSL), and QUIC connection IDs are generated so that any server in the PoP can find the owner. Session ticket keys are shared and rotated across PoPs so resumption works after a shift.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI inference endpoints are increasingly served through anycast fronts; the front door (anycast PoP) terminates TLS close to the user, then forwards to GPU regions. Traffic-engineering systems use ML to predict load and shift catchments (withdraw/prepend) before a PoP saturates.</p>
  <p><b>Use AI as a partner:</b> give it a table of AS-path lengths and a failure, and have it compute the new catchments, then check by hand. Ask it to review an ExaBGP health-check script for "flapping on every failed probe" bugs.</p>
  <p><b>Where AI goes wrong:</b> it says anycast "routes to the geographically nearest server" (false: BGP-nearest), claims anycast is only for UDP (CDNs run TCP/QUIC on it), or suggests announcing a /30 from each PoP (prefixes longer than /24 are filtered on the public internet).</p>
  <p><b>You must still own:</b> the stateful-connection story, the rollout/drain procedure and the monitoring that tells you which PoP serves whom. In interviews, explain failure modes, not just the happy path.</p>`,
  problems: [{
    title: 'How does anycast route users to the nearest PoP?',
    level: 'Easy', tags: ['anycast', 'CDN', 'BGP'], companies: ['Cloudflare', 'Akamai', 'Google'],
    statement: `<p>Your CDN has PoPs in Mumbai, Frankfurt and Virginia, all serving IP 198.51.100.1. Explain how a user ends up at the nearest PoP, what happens when Frankfurt fails, and why a long file download might break during the failover.</p>`,
    constraints: `Mention BGP announcements, withdrawal, and one weakness of anycast.`,
    example: `<p>Berlin user → AS path to Frankfurt 2 hops, Virginia 4. Frankfurt withdraws → Berlin user now goes to Virginia (4 hops).</p>`,
    brute: { why: `<p>GeoDNS only: a different A record per region. Failover waits for the DNS TTL and resolver caching (minutes); a user\'s resolver may be far from them, so they get the wrong region.</p>` },
    mcq: { q: 'What decides which anycast PoP a user reaches?', options: ['The user\'s GPS position', 'BGP best-path selection at the routers between user and PoPs', 'A DNS server picking randomly'], answer: 1, explain: 'Each router keeps the best BGP path to the shared prefix; that implicitly picks the closest announcer.' },
    hints: [`<p>Many sites announce the same prefix; routers keep one best path.</p>`, `<p>Think about what happens to the announcement when the PoP dies.</p>`, `<p>Edge case: TCP connections in flight; ties; ISP without local peering sends users far away.</p>`],
    solution: {
      approach: `<p>Every PoP announces 198.51.100.0/24 to its transit providers and peers. Routers across the internet receive several paths and keep the best one by normal BGP rules (policy, then shortest AS_PATH), so the user\'s packets travel to the announcer that is BGP-closest, which is usually, but not always, geographically close.</p>
      <p>Failure: a health-check agent in each PoP withdraws the announcement when the service is unhealthy (or the whole site loses power and the sessions drop). Neighbours remove the route within seconds; the next-best path (Virginia for Berlin users) becomes the best. No DNS change is needed, so no TTL wait.</p>
      <p>Weakness: TCP connections are bound to one server. When routing shifts mid-connection the new PoP sends RST. Mitigate with drain before maintenance (prepend, wait, withdraw), stateless backends, session-ticket sharing, resumable downloads (Range requests) or QUIC connection-ID routing. Also note catchments may be unbalanced and need traffic engineering.</p>`,
      complexity: `<p>Failover time = BGP withdrawal propagation, typically seconds to a minute.</p>`,
      followUps: ['How would you drain a PoP gracefully?', 'How can you tell which PoP served a request?']
    }
  }]
});

/* =====================================================================
   TOPIC 4 - LOAD BALANCER INTERNALS
   ===================================================================== */
topics.push({
  title: 'Load Balancer Internals: L4 vs L7, ECMP, Consistent Hashing, Maglev and DSR',
  analogy: `<p>A <b>L4 load balancer</b> is a mail-room clerk who only reads the <i>envelope</i> (IP addresses and ports) and drops it in one of N trucks: super fast, never opens the letter. A <b>L7 load balancer</b> is a receptionist who <i>opens the letter</i> (HTTP path, headers, cookies) and sends it to the right department: smarter but slower. <b>ECMP</b> is a road with 4 equal lanes where a toll gate decides the lane from your car\'s licence plate. If one lane closes and the gate uses "plate number mod lanes", EVERY car may need a new lane (chaos). <b>Consistent hashing</b> is a gate smart enough that only the cars that used the closed lane move.</p>`,
  explain: `<p>🟢 <b>L4 vs L7.</b></p>
  ${H.table(['', 'L4 (transport) LB', 'L7 (application) LB'], [
    ['Looks at', 'IP + port (5-tuple)', 'HTTP method, URL, headers, cookies, gRPC method'],
    ['TLS', 'Passes through (or terminates only if asked)', 'Usually terminates TLS'],
    ['Speed', 'Millions of packets/s, tiny state', 'Slower, buffers requests, more CPU'],
    ['Can do', 'Spread connections, health check, DSR', 'Path routing, retries, rate limits, canary, WAF, sticky by cookie'],
    ['Examples', 'LVS/IPVS, Maglev, Katran, AWS NLB, HAProxy tcp mode', 'Nginx, Envoy, HAProxy http mode, AWS ALB']
  ])}
  <p>🔵 <b>ECMP (Equal-Cost Multi-Path)</b> is how traffic is spread across several equal routes or several L4 LBs/servers that all announce the same VIP: the router computes a hash of the <b>5-tuple</b> (src IP, dst IP, src port, dst port, protocol) and picks <code>next_hop[hash % N]</code>. Same flow → same hash → same next hop, so packets of one connection are never split (no reordering). But if N changes (a backend dies), <code>hash % N</code> changes for almost everybody: with 4 → 3 backends roughly <b>3/4 of flows move</b> and their TCP connections break.</p>
  <p>🔵 <b>Consistent hashing</b> fixes that. Put servers on a hash ring (many virtual nodes each); a flow goes to the next server clockwise from its hash. Remove a server: only <i>its</i> flows (about 1/N) move to the next ones. Variants: rendezvous (HRW: pick server with highest hash(flow, server)), and Google\'s <b>Maglev hashing</b>: build a lookup table of size M (a prime, like 65537) where each backend fills slots following its own permutation, taking turns. Result: near-equal load (each gets M/N ± 1 slots), O(1) lookup <code>table[hash % M]</code>, minimal (not zero) disruption when the backend set changes.</p>
  <p>🔵 <b>Connection affinity</b> in real LBs combines: a per-LB <b>connection table</b> (flow → backend, so existing connections stay even if the hash changes) + the consistent table for new flows. If an LB itself restarts or another LB in the ECMP group takes over, the hash alone must give the same backend, that is why Maglev tables are built deterministically from the backend list on every LB.</p>
  <p>🔵 <b>DSR (Direct Server Return).</b> Normally the reply goes back through the LB (which rewrites addresses, "NAT"). In DSR the LB only forwards the <b>request</b> (rewriting just the destination MAC, or encapsulating in IP-in-IP/GRE); the backend has the VIP configured on a loopback interface (not ARPing for it) and answers the client <b>directly</b>. Responses are usually much bigger than requests (video, downloads), so the LB sees only a small fraction of the bytes. Trade-offs: L4 only (the LB cannot read or change responses), backends must share L2 (MAC mode) or support tunnels, health checking and MTU need care.</p>`,
  clues: ['"Spread connections across servers without breaking existing ones when one dies" → consistent hashing / Maglev', '"hash(5-tuple) % N" → ECMP, the remap-on-change problem', '"LB should route /api to service A and /img to service B" → L7', '"Millions of packets per second, tiny CPU" → L4, DSR, XDP', '"Responses are 100x bigger than requests" → DSR', '"Sticky sessions" → cookie (L7) or source-IP hash (L4)', '"LB itself is a single point of failure" → anycast/ECMP over multiple LBs + BGP/BFD'],
  code: [
    { lang: 'python', run: true, title: 'ECMP hash % N vs consistent hashing: how many flows move?', code: `import hashlib
from bisect import bisect

def h(s):
    # stable 32-bit hash of a string (md5 is fine for load spreading, NOT for security)
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)

# 10,000 synthetic flows: (src_ip, src_port, dst_ip, dst_port, proto)
flows = [f"10.{i % 250}.{i // 250}.7:{40000 + i % 20000}->198.51.100.1:443/tcp" for i in range(10000)]
backends = ['b0', 'b1', 'b2', 'b3']

# 1) Naive ECMP: backend = hash(5-tuple) % N
def naive(flow, bs):
    return bs[h(flow) % len(bs)]

# 2) Consistent hashing ring with virtual nodes
def build_ring(bs, vnodes=100):
    ring = sorted((h(f"{b}#{v}"), b) for b in bs for v in range(vnodes))
    return [k for k, _ in ring], [b for _, b in ring]
def ring_pick(flow, ring):
    keys, owners = ring
    return owners[bisect(keys, h(flow)) % len(keys)]

# 3) Maglev table (size M prime): each backend fills slots following its own permutation
def maglev_table(bs, M=1009):
    offsets = [h(b + 'o') % M for b in bs]
    skips = [h(b + 's') % (M - 1) + 1 for b in bs]
    nxt, table, filled = [0] * len(bs), [-1] * M, 0
    while True:
        for i in range(len(bs)):
            c = (offsets[i] + nxt[i] * skips[i]) % M
            while table[c] >= 0:
                nxt[i] += 1
                c = (offsets[i] + nxt[i] * skips[i]) % M
            table[c] = i
            nxt[i] += 1
            filled += 1
            if filled == M:
                return [bs[i] for i in table]
def maglev_pick(flow, table):
    return table[h(flow) % len(table)]

def moved(before, after, ignore):
    # flows whose backend changed although their backend was NOT the removed one
    return sum(1 for b, a in zip(before, after) if b != a and b != ignore)

removed = 'b2'
rest = [b for b in backends if b != removed]

nb = [naive(f, backends) for f in flows];  na = [naive(f, rest) for f in flows]
r1, r2 = build_ring(backends), build_ring(rest)
cb = [ring_pick(f, r1) for f in flows];    ca = [ring_pick(f, r2) for f in flows]
t1, t2 = maglev_table(backends), maglev_table(rest)
mb = [maglev_pick(f, t1) for f in flows];  ma = [maglev_pick(f, t2) for f in flows]

on_removed = sum(1 for b in nb if b == removed)
print("flows on the removed backend (must move anyway):", on_removed, "of", len(flows))
print("method       innocent flows that moved   (lower is better)")
print("naive %N    ", moved(nb, na, removed))
print("ring (100vn)", moved(cb, ca, removed))
print("maglev      ", moved(mb, ma, removed))
for name, arr in (('naive', nb), ('ring', cb), ('maglev', mb)):
    counts = {b: arr.count(b) for b in backends}
    print(name, 'load before removal:', counts)
` },
    { lang: 'cpp', title: 'Maglev lookup-table builder (C++)', code: `#include <bits/stdc++.h>
using namespace std;

// Simple FNV-1a 64-bit hash (use a better seeded hash such as SipHash/xxHash in production).
static uint64_t fnv1a(const string& s) {
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : s) { h ^= c; h *= 1099511628211ULL; }
    return h;
}

// Build the Maglev table of size M (M must be prime and much larger than the backend count).
// Every backend has a permutation of slots: slot(j) = (offset + j * skip) % M.
// Backends take turns claiming their next free preferred slot, so each gets ~M/N slots.
vector<int> buildMaglev(const vector<string>& backends, size_t M) {
    size_t n = backends.size();
    vector<size_t> offset(n), skip(n), next(n, 0);
    for (size_t i = 0; i < n; i++) {
        offset[i] = fnv1a(backends[i] + "#offset") % M;
        skip[i]   = fnv1a(backends[i] + "#skip") % (M - 1) + 1;   // 1..M-1, coprime with prime M
    }
    vector<int> table(M, -1);
    size_t filled = 0;
    while (true) {
        for (size_t i = 0; i < n; i++) {
            size_t c = (offset[i] + next[i] * skip[i]) % M;
            while (table[c] >= 0) { next[i]++; c = (offset[i] + next[i] * skip[i]) % M; }
            table[c] = (int)i;
            next[i]++;
            if (++filled == M) return table;
        }
    }
}

// Pick a backend for a flow: O(1).
int pick(const vector<int>& table, const string& fiveTuple) {
    return table[fnv1a(fiveTuple) % table.size()];
}

int main() {
    vector<string> be = {"b0", "b1", "b2", "b3"};
    auto t = buildMaglev(be, 65537);
    vector<int> cnt(be.size());
    for (int s : t) cnt[s]++;
    for (size_t i = 0; i < be.size(); i++) cout << be[i] << " owns " << cnt[i] << " slots\\n";
    cout << "flow -> " << be[pick(t, "10.0.0.5:5555->198.51.100.1:443/tcp")] << "\\n";
}` },
    { lang: 'bash', check: false, title: 'Linux IPVS / nftables examples of L4 balancing and DSR', code: `# IPVS (kernel L4 load balancer): virtual service 198.51.100.1:443, weighted round robin
ipvsadm -A -t 198.51.100.1:443 -s wrr
# -g = direct routing (DSR); the backend must own the VIP on loopback with arp_ignore=1
ipvsadm -a -t 198.51.100.1:443 -r 10.0.0.11:443 -g -w 1
ipvsadm -a -t 198.51.100.1:443 -r 10.0.0.12:443 -g -w 1

# On each DSR backend: own the VIP but never answer ARP for it
ip addr add 198.51.100.1/32 dev lo
sysctl -w net.ipv4.conf.all.arp_ignore=1 net.ipv4.conf.all.arp_announce=2

# nftables: simple hash-based L4 spread by source address (consistent per client)
nft add rule ip nat prerouting ip daddr 198.51.100.1 tcp dport 443 \\
    dnat to jhash ip saddr mod 2 map { 0 : 10.0.0.11, 1 : 10.0.0.12 }` }
  ],
  codeTitle: ['Python: remap counter for naive vs ring vs Maglev', 'C++: Maglev table builder', 'IPVS DSR and nftables hash balancing'],
  viz: [{
    title: 'Remove a backend: naive hash % N vs rendezvous vs Maglev',
    input: 'B2',
    inputLabel: 'Backend to remove (B0, B1, B2 or B3)',
    gen: function (input) {
      var rm = String(input).trim().toUpperCase();
      var all = ['B0', 'B1', 'B2', 'B3'];
      if (all.indexOf(rm) < 0) throw new Error('Type one of B0, B1, B2, B3');
      var rest = all.filter(function (b) { return b !== rm; });
      var flows = ['10.0.0.5:4001', '10.0.0.5:4002', '10.0.0.9:5100', '10.0.1.2:6000', '10.0.1.3:6001', '10.0.2.7:7000', '10.0.2.8:7001', '10.0.3.4:8000'];
      function hs(f, extra) { return hashStr(f + (extra || '')); }
      function naive(f, bs) { return bs[hs(f) % bs.length]; }
      function hrw(f, bs) { var best = null, bv = -1; bs.forEach(function (b) { var v = hs(f, '|' + b); if (v > bv) { bv = v; best = b; } }); return best; }
      var M = 13;
      function maglev(bs) {
        var off = bs.map(function (b) { return hashStr(b + 'o') % M; }), sk = bs.map(function (b) { return hashStr(b + 's') % (M - 1) + 1; });
        var nx = bs.map(function () { return 0; }), t = [], i, n = 0;
        for (i = 0; i < M; i++) t.push(-1);
        while (n < M) { for (i = 0; i < bs.length && n < M; i++) { var c = (off[i] + nx[i] * sk[i]) % M; while (t[c] >= 0) { nx[i]++; c = (off[i] + nx[i] * sk[i]) % M; } t[c] = i; nx[i]++; n++; } }
        return t.map(function (x) { return bs[x]; });
      }
      var mt1 = maglev(all), mt2 = maglev(rest);
      var rowsN = [], hlN = {}, mvN = 0, rowsH = [], hlH = {}, mvH = 0, rowsM = [], hlM = {}, mvM = 0;
      flows.forEach(function (f, i) {
        var a = naive(f, all), b = naive(f, rest);
        rowsN.push([f, hs(f) % 4, a, hs(f) % 3, b, a === b ? 'same' : (a === rm ? 'must move' : 'MOVED')]);
        if (a !== b) { mvN += (a === rm ? 0 : 1); hlN[i] = a === rm ? 'cur' : 'bad'; }
        var c = hrw(f, all), d = hrw(f, rest);
        rowsH.push([f, c, d, c === d ? 'same' : (c === rm ? 'must move' : 'MOVED')]);
        if (c !== d) { mvH += (c === rm ? 0 : 1); hlH[i] = c === rm ? 'cur' : 'bad'; }
        var e = mt1[hs(f) % M], g = mt2[hs(f) % M];
        rowsM.push([f, hs(f) % M, e, g, e === g ? 'same' : (e === rm ? 'must move' : 'MOVED')]);
        if (e !== g) { mvM += (e === rm ? 0 : 1); hlM[i] = e === rm ? 'cur' : 'bad'; }
      });
      var hlA = {}, hlB = {};
      mt1.forEach(function (b, i) { hlA[i] = b === rm ? 'cur' : ''; });
      mt1.forEach(function (b, i) { if (mt2[i] !== b) hlB[i] = b === rm ? 'cur' : 'bad'; });
      return [
        { narr: 'Eight flows (client ip:port to the VIP) and four backends B0-B3. The LB hashes the 5-tuple. Let us see what happens when <b>' + rm + '</b> dies.', parts: [{ type: 'table', label: 'Flows', columns: ['flow', 'hash'], rows: flows.map(function (f) { return [f, hs(f) % 1000]; }) }, { type: 'array', label: 'Backends', values: all, hl: (function () { var o = {}; o[all.indexOf(rm)] = 'bad'; return o; })() }] },
        { narr: '<b>Naive ECMP</b>: backend = hash % N. With N = 4 then N = 3 the remainder changes for most flows. <span class="c-r">Red rows moved even though their backend was healthy</span>: their TCP connections break. Amber rows had to move anyway.', parts: [{ type: 'table', label: 'hash % 4 then hash % 3 (innocent flows moved: ' + mvN + ' of ' + flows.length + ')', columns: ['flow', 'h%4', 'before', 'h%3', 'after', 'result'], rows: rowsN, hl: hlN }] },
        { narr: '<b>Rendezvous (a cousin of consistent hashing)</b>: every flow picks the backend with the highest hash(flow, backend). When ' + rm + ' disappears, only flows whose winner was ' + rm + ' re-pick. Innocent flows moved: <b>' + mvH + '</b>.', parts: [{ type: 'table', label: 'highest-random-weight', columns: ['flow', 'before', 'after', 'result'], rows: rowsH, hl: hlH }] },
        { narr: '<b>Maglev table</b> (13 slots, filled by taking turns). Slots owned by ' + rm + ' (amber) must be given to others.', parts: [{ type: 'array', label: 'table before (slot index below)', values: mt1, hl: hlA, showIdx: true }, { type: 'array', label: 'table after ' + rm + ' removed', values: mt2, hl: hlB, showIdx: true }] },
        { narr: 'Maglev lookup is just <code>table[hash % 13]</code>. Innocent flows moved: <b>' + mvM + '</b>. Maglev trades a little disruption (a few slots of other backends can shift) for perfectly even load and O(1) lookup.', parts: [{ type: 'table', label: 'Maglev result', columns: ['flow', 'slot', 'before', 'after', 'result'], rows: rowsM, hl: hlM }] },
        { narr: 'Summary: naive moved <b>' + mvN + '</b>, rendezvous <b>' + mvH + '</b>, Maglev <b>' + mvM + '</b> healthy flows. With 8 flows the numbers are small; with millions of flows naive breaks about 75% of connections while consistent schemes break only the dead backend\'s share.', parts: [{ type: 'vars', vals: { 'naive moved': mvN, 'rendezvous moved': mvH, 'maglev moved': mvM }, hl: { 'naive moved': 'bad', 'rendezvous moved': 'ok', 'maglev moved': 'ok' } }] }
      ];
    }
  }, {
    title: 'Direct Server Return: the reply skips the load balancer',
    gen: function () {
      var nodes = [bx('C', 'Client 203.0.113.9', 8, 24, 22), bx('LB', 'L4 LB (VIP 198.51.100.1)', 44, 24, 26), bx('S1', 'Backend 1 (VIP on lo)', 86, 6, 26), bx('S2', 'Backend 2 (VIP on lo)', 86, 42, 26)];
      var e = [['C', 'LB', 'SYN -> VIP'], ['LB', 'S1', 'same packet, new MAC'], ['LB', 'S2', ''], ['S1', 'C', 'SYN-ACK from VIP']];
      function g(l, hl, ehl, tags) { return gph(l, 52, nodes, e, hl, ehl, tags); }
      return [
        { narr: 'The client sends a SYN to the VIP. It arrives at the L4 LB, the only box that answers ARP for the VIP.', parts: [g('1. request to VIP', { LB: 'cur' }, { 'C-LB': 'ok' }, {})] },
        { narr: 'The LB hashes the 5-tuple, picks Backend 1 and forwards the <b>unchanged IP packet</b> by rewriting only the destination MAC (same L2 network) or by tunnelling it.', parts: [g('2. forward to chosen backend', { LB: 'cur', S1: 'win' }, { 'LB-S1': 'ok' }, { LB: 'hash -> backend 1' })] },
        { narr: 'Backend 1 owns the VIP on its loopback, so it accepts the packet as its own and replies with <b>source = VIP</b>, straight to the client. The reply does <b>not</b> pass through the LB.', parts: [g('3. direct return', { S1: 'ok' }, { 'S1-C': 'ok' }, { S1: 'source IP = VIP' })] },
        { narr: 'Win: the LB only handles small requests, so one LB can front huge download/video traffic. Cost: L4 only, no response rewriting, backends need the VIP on lo + ARP suppression, and a connection table or consistent hash is still needed to keep following packets on the same backend.', parts: [{ type: 'table', columns: ['traffic', 'passes LB?'], rows: [['requests (small)', 'yes'], ['responses (large)', 'NO, direct'], ['TLS termination', 'not possible at LB']], hl: { 1: 'sel' } }] }
      ];
    }
  }],
  examples: [
    { title: 'Compute which backend ECMP picks', html: `<p>5-tuple hash gives <b>h = 4,827,105,311</b>. Backends: [A, B, C, D] → <code>h mod 4 = 3</code> → <b>D</b>. Backend D dies → [A, B, C]: <code>h mod 3 = 2</code> → <b>C</b>. That flow was on the dead server, so it must move. But take h = 4,827,105,310: mod 4 = 2 → <b>C</b>, mod 3 = 1 → <b>B</b>. This flow was on a healthy backend, yet it moved: connection reset. That is the problem with naive mod.</p>${H.table(['h', 'mod 4 (backend)', 'mod 3 (backend)', 'verdict'], [['...311', '3 (D)', '2 (C)', 'D died: must move'], ['...310', '2 (C)', '1 (B)', '<span class="c-r">moved needlessly</span>'], ['...312', '0 (A)', '0 (A)', 'stable (lucky)']])}` },
    { title: 'L4 or L7? A quick decision', html: `<p>Need to send <code>/video/*</code> to the media cluster and <code>/api/*</code> to the API cluster, add auth headers and retry idempotent GETs → <b>L7</b>. Need to forward raw TCP for a game server or database at 10 million packets/s → <b>L4</b>. Common production design: <b>anycast/ECMP → L4 fleet (Maglev/Katran) → L7 proxies (Envoy) → services</b>.</p>` },
    { title: 'Why the Maglev table size is prime and large', html: `<p>Each backend\'s permutation is <code>(offset + j*skip) mod M</code>. If M is prime, every skip in 1..M-1 visits all M slots exactly once, so every backend\'s preference list covers the table. M much larger than the number of backends (Google used 65537; 655,373 for bigger) keeps imbalance below about 1% and disruption small.</p>${H.table(['M', 'backends N', 'slots per backend', 'max imbalance'], [['13', '4', '3 or 4', '~25%'], ['65537', '4', '16384.25', '&lt; 0.01%']])}` }
  ],
  deepDive: `<p><b>Where the state lives.</b> A software L4 LB (Katran with XDP/eBPF, Maglev, Cloudflare Unimog) keeps a per-flow table (LRU) so that an existing connection survives backend-set changes; the consistent table only handles <i>new</i> flows and the case where an LB node restarts. Two LB nodes behind ECMP must compute the <i>same</i> table from the same backend list (deterministic seeds), otherwise a router reshuffle sends packets to an LB that disagrees. Backend health changes are propagated with versioned config so tables on all LBs converge.</p>
  <p><b>ECMP hardware.</b> Routers/switches hash header fields in silicon; flowlet/adaptive load balancing and "elephant flows" cause polarization: two hash stages using the same function and seed lead to correlated choices and unused links. Fixes: different seeds per tier, adding entropy fields (UDP source port in VXLAN/GRE/QUIC probes), weighted ECMP and resilient/consistent hashing in the switch ASIC so adding or removing a next hop only moves a bounded number of flows. With <b>resilient hashing</b> a link failure remaps just that link\'s buckets.</p>
  <p><b>Consistent hashing details.</b> Ring with V virtual nodes per server: lookup O(log(NV)) with binary search; load standard deviation about 1/√V, so ~100-200 vnodes give ±10%. "Bounded loads" variants cap each server at (1+ε)·average and spill over. Jump consistent hash is memory-free but only supports adding/removing the last bucket. Rendezvous hashing is O(N) per lookup but trivial. Maglev: lookup O(1), build O(M log M) on average (about O(M²) worst case), minimal disruption not guaranteed (Google measured ~1% extra flows moved). Rebuild time (tens of ms) is why tables are built off the datapath and swapped atomically.</p>
  <p><b>DSR pitfalls.</b> MTU: tunnelling (IPIP/GUE) adds 20+ bytes, so cut MSS or raise MTU. Health checking must be done with the VIP as destination. Firewalls with asymmetric paths: the stateful firewall in front of the client sees only the reply (source VIP) and may drop it if it never saw the request. DSR does not work through cloud NAT in most clouds; "Direct Server Return" in AWS NLB-like products is implemented in the fabric. L7 features (WAF, cache, TLS) cannot sit on the DSR path.</p>
  <p><b>Health & draining.</b> Active checks (TCP connect, HTTP 200, gRPC health), passive outlier detection (eject after 5 consecutive 5xx), slow-start (ramp a new backend\'s weight), connection draining (stop new flows, let old ones finish up to a timeout), and panic mode (if &lt;50% healthy, send to all rather than overload the few). L7 LBs must also handle HTTP/2 multiplexing (balance per request, not per connection) and long-lived gRPC streams, which defeats connection-level balancing.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM inference traffic is long-lived streaming and wildly uneven (a 10-token and a 10,000-token request look the same at L4). Modern AI gateways add <b>L7 + model-aware balancing</b>: route by prompt-cache locality (send same-prefix requests to the replica holding the KV cache, i.e. consistent hashing on a prompt prefix!), by queue depth or GPU memory, and by token budgets.</p>
  <p><b>Use AI as a partner:</b> ask it for a randomized test harness that counts remapped flows for your hash scheme, explain an Envoy cluster config, or convert an HAProxy config. Have it argue against your design ("what happens when two LBs disagree?").</p>
  <p><b>Where AI goes wrong:</b> it equates "consistent hashing" with "zero remap" (a fraction still moves), says DSR works for HTTPS termination at the LB (it cannot), or picks plain least-connections for LLM streams without noticing token-length variance. It may also quote Maglev table sizes or numbers confidently without sources.</p>
  <p><b>You must still own:</b> the state model (what survives an LB or backend change), failure modes (polarization, drain, panic) and measuring actual skew.</p>`,
  problems: [{
    title: 'Which backend does ECMP pick, and what happens when one is removed?',
    level: 'Medium', tags: ['ECMP', 'consistent hashing', 'load balancer'], companies: ['Google', 'Meta', 'Cloudflare'],
    statement: `<p>A router hashes the 5-tuple of a flow to the 32-bit value <b>h = 1000</b> and picks <code>backend[h mod N]</code> from the list [S0, S1, S2, S3, S4]. (a) Which server gets the flow? (b) S3 is removed (list becomes [S0, S1, S2, S4]); which server gets it now, and was the move necessary? (c) Explain how a consistent scheme avoids the problem and what share of flows is expected to move.</p>`,
    constraints: `Show the arithmetic. Compare naive vs consistent for N = 5 → 4.`,
    example: `<p>1000 mod 5 = 0 → S0. After removal: 1000 mod 4 = 0 → S0. Stable here. For h = 1001: mod 5 = 1 → S1; mod 4 = 1 → S1. For h = 1003: mod 5 = 3 → S3 (dead, must move); mod 4 = 3 → S4. For h = 1002: mod 5 = 2 → S2; mod 4 = 2 → ${H.c('g', 'S2')} same.</p>`,
    brute: { why: `<p>Naive <code>hash % N</code>: when N changes, the quotient shifts so a large fraction of flows (for 5→4 about 80% of the hash space maps differently: only h with h mod 20 in {0,1,2,19} agree) get a new backend, breaking established TCP connections and cold-starting caches.</p>` },
    mcq: { q: 'Expected fraction of flows that change backend with hash % N when N goes 5 → 4 (uniform hashes)?', options: ['About 20% (the removed one\'s share)', 'About 75%', 'Exactly 0%'], answer: 1, explain: 'h mod 5 equals h mod 4 only when h mod 20 lies in {0,1,2,19} (4 of 20 = 20%), so roughly 80% change (closest option: about 75%).' },
    hints: [`<p>Compute the remainders for both N values, side by side.</p>`, `<p>Look at h mod 20 (the lcm of 5 and 4). Count the residues where the same server is chosen before and after (S4 sits at position 4, then position 3).</p>`, `<p>Consistent hashing: ring or table; only the removed server\'s ~1/N = 20% of flows must move, plus a tiny extra with Maglev.</p>`],
    solution: {
      approach: `<p>(a) 1000 mod 5 = 0 → <b>S0</b>. (b) After removing S3 the list is [S0, S1, S2, S4] and 1000 mod 4 = 0 → <b>S0</b> again; here the move was not needed and did not happen. For other flows, such as h = 1004: before 1004 mod 5 = 4 → S4; after 1004 mod 4 = 0 → S0, so a flow on the healthy S4 is reassigned and its TCP connection is reset.</p>
      <p>Fraction moved: the two functions pick the same server only when h mod 20 ∈ {0,1,2} (same position) or 19 (S4 at position 4 before, position 3 after), so about 20% stay and <b>about 80% move</b>, although only 20% of flows were on the dead server. Everything else is collateral damage.</p>
      <p>(c) Consistent hashing (ring with virtual nodes, rendezvous or Maglev table): each flow\'s preferred server depends on the flow and on the server identity, not on how many servers exist. Removing S3 only re-assigns the flows that preferred S3, about 1/5 = <b>20%</b> (spread over the others), and every other flow keeps its server. Maglev may move a few percent more because filling order interacts, but it is still near the minimum and gives perfectly balanced load. In practice add a per-flow connection table so even those few established flows survive.</p>`,
      complexity: `<p>Lookup O(1) for naive and Maglev, O(log(N·V)) for a ring, O(N) for rendezvous.</p>`,
      followUps: ['What if a backend is ADDED instead of removed?', 'How do two LBs behind ECMP stay in sync?']
    }
  }]
});

/* =====================================================================
   TOPIC 5 - FIREWALLS
   ===================================================================== */
topics.push({
  title: 'Firewalls: Stateless vs Stateful and Connection Tracking (conntrack)',
  analogy: `<p>A <b>stateless</b> firewall is a guard with a rule list who checks every person at the door as if he had never seen them: "Anyone coming FROM port 443 may enter" (so an attacker just sets his source port to 443). A <b>stateful</b> firewall is a guard with a <b>guest book</b>: "Did someone inside call this visitor? Yes, they are on the list (an outgoing request), so let the reply in." Only invited replies enter; strangers knocking on random doors are turned away. The guest book is the <b>connection tracking table (conntrack)</b>.</p>`,
  explain: `<p>🟢 A firewall decides, packet by packet, to <b>accept</b>, <b>drop</b> (silently) or <b>reject</b> (send an error). Rules are checked <b>top to bottom, first match wins</b>, and if nothing matches the chain\'s <b>default policy</b> applies. Good security default: <b>default drop (deny by default)</b>, then open only what you need.</p>
  <ul>
  <li><b>Stateless (packet filter / ACL):</b> looks only at the single packet: addresses, ports, protocol, TCP flags. Very fast, no memory. Weakness: to allow replies you must allow broad "source port 443" or "ACK flag set" rules, which attackers can forge. Typical in routers, cloud NACLs, switch hardware.</li>
  <li><b>Stateful:</b> remembers each flow in a table keyed by the 5-tuple (+ direction). The first packet of a connection (TCP SYN) is checked against the rules (<code>ct state new</code>). If allowed, an entry is created. Later packets in either direction match <code>ct state established</code> without being re-examined against every rule. Related traffic (ICMP errors, FTP data channel) is <code>related</code>. A packet that fits no flow and is not a legal start (e.g. a stray ACK, bad flags) is <code>invalid</code>: drop it.</li>
  <li><b>Next-gen / L7 firewalls and WAFs</b> additionally inspect application data (HTTP, TLS SNI, DNS) and apply threat signatures. A <b>WAF</b> protects web apps (SQL injection, XSS patterns) at L7.</li>
  </ul>
  <p>🔵 <b>Conntrack states for TCP</b> roughly follow the handshake: SYN_SENT → SYN_RECV → ESTABLISHED → FIN_WAIT/CLOSE_WAIT → TIME_WAIT, each with a timeout (ESTABLISHED idle default ~5 days in Linux, SYN_SENT 120 s, TIME_WAIT 120 s). UDP has no connection, so the firewall invents a pseudo-flow: first packet creates an entry, a reply within ~30 s marks it as "assured", then it expires on idle. ICMP echo replies match echo requests.</p>
  <p>🔵 <b>Why the table matters:</b> memory per flow, a <b>finite table size</b> (<code>nf_conntrack_max</code>). When it is full, new connections get dropped; a SYN flood or a million-connection NAT gateway can exhaust it. Tuning: bigger table, shorter timeouts, SYN cookies, <code>NOTRACK</code> for stateless high-rate traffic (DNS servers, load-balancer data path).</p>`,
  clues: ['"Allow replies but not unsolicited inbound traffic" → stateful firewall / ct state established', '"Default deny" + "least privilege" → policy drop, explicit allow list', '"Rules are evaluated in order" → first match wins, put specific rules before general', '"Firewall table full / connection tracking exhausted" → conntrack limits, SYN flood', '"NAT + firewall" → conntrack stores the translation too', '"Block SQL injection" → WAF (L7), not a packet filter'],
  code: [
    { lang: 'bash', check: false, title: 'Stateful rules for a web server (nftables)', code: `# /etc/nftables.conf  - a web server: SSH only from the office, HTTP(S) from everyone
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;     # default deny

    ct state invalid drop                                # junk / out-of-state packets
    ct state established,related accept                  # replies to our own connections
    iif "lo" accept                                      # loopback

    ip saddr 10.0.0.0/8 tcp dport 22 ct state new accept # SSH from the corporate network only
    tcp dport { 80, 443 } ct state new accept            # the website
    udp dport 443 ct state new accept                    # HTTP/3 (QUIC)
    icmp type echo-request limit rate 5/second accept    # ping, rate limited
    ip6 nexthdr icmpv6 accept                            # IPv6 needs ICMPv6 (neighbour discovery)

    limit rate 5/minute log prefix "fw-drop: "           # log a sample of what we drop
  }
  chain forward { type filter hook forward priority 0; policy drop; }
  chain output  { type filter hook output  priority 0; policy accept; }
}` },
    { lang: 'bash', check: false, title: 'Same idea in iptables + inspecting conntrack', code: `iptables -P INPUT DROP
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 22 -m conntrack --ctstate NEW -j ACCEPT
iptables -A INPUT -p tcp -m multiport --dports 80,443 -m conntrack --ctstate NEW -j ACCEPT

conntrack -L | head                         # list tracked flows
cat /proc/sys/net/netfilter/nf_conntrack_count /proc/sys/net/netfilter/nf_conntrack_max
sysctl net.netfilter.nf_conntrack_tcp_timeout_established` },
    { lang: 'python', run: true, title: 'Stateful firewall with a conntrack table (simulation)', code: `# A tiny stateful firewall for a web server at 198.51.100.10.
# Rules are checked in order; first match wins; the default policy is DROP.
SERVER = '198.51.100.10'
RULES = [
    ('drop invalid',            lambda p, st: st == 'invalid',                                   'DROP'),
    ('accept established',      lambda p, st: st == 'established',                               'ACCEPT'),
    ('accept ssh from 10/8',    lambda p, st: p['proto'] == 'tcp' and p['dport'] == 22 and p['src'].startswith('10.') and st == 'new', 'ACCEPT'),
    ('accept web (new)',        lambda p, st: p['proto'] == 'tcp' and p['dport'] in (80, 443) and st == 'new', 'ACCEPT'),
]
conntrack = {}          # (src, sport, dst, dport, proto) -> state

def classify(p):
    """new / established / invalid, like 'ct state'."""
    key = (p['src'], p['sport'], p['dst'], p['dport'], p['proto'])
    if key in conntrack:
        return 'established'
    if p['proto'] == 'tcp' and p['flags'] == 'S':        # a clean SYN may start a flow
        return 'new'
    if p['proto'] == 'tcp':                              # ACK/data/FIN with no flow = out of state
        return 'invalid'
    return 'new'

def stateful(p):
    st = classify(p)
    for name, cond, action in RULES:
        if cond(p, st):
            if action == 'ACCEPT':
                conntrack[(p['src'], p['sport'], p['dst'], p['dport'], p['proto'])] = 'ESTABLISHED'
            return action, name, st
    return 'DROP', 'default policy', st

def stateless(p):
    # classic ACL: "allow web, allow ssh from 10/8, allow any ACK (to let replies in)"
    if p['proto'] == 'tcp' and p['dport'] in (80, 443): return 'ACCEPT'
    if p['proto'] == 'tcp' and p['dport'] == 22 and p['src'].startswith('10.'): return 'ACCEPT'
    if p['proto'] == 'tcp' and 'A' in p['flags']: return 'ACCEPT'
    return 'DROP'

def pkt(src, sport, dport, flags, proto='tcp'):
    return dict(src=src, sport=sport, dst=SERVER, dport=dport, flags=flags, proto=proto)

TRACE = [
    ('client opens HTTPS (SYN)',       pkt('203.0.113.9', 51000, 443, 'S')),
    ('client sends data (ACK)',        pkt('203.0.113.9', 51000, 443, 'A')),
    ('stray ACK scan to port 443',     pkt('192.0.2.77', 4444, 443, 'A')),
    ('outsider tries SSH',             pkt('8.8.8.8', 40000, 22, 'S')),
    ('office laptop SSH',              pkt('10.1.2.3', 40001, 22, 'S')),
    ('probe MySQL',                    pkt('203.0.113.9', 51001, 3306, 'S')),
    ('ACK to closed port 3306',        pkt('203.0.113.9', 51002, 3306, 'A')),
]
print(f"{'packet':<30}{'stateful':<9}{'matched rule':<22}{'ct state':<12}stateless")
for label, p in TRACE:
    act, rule, st = stateful(p)
    print(f"{label:<30}{act:<9}{rule:<22}{st:<12}{stateless(p)}")
print('conntrack table:', list(conntrack))
print('Stateless let in the ACK-only probes (3306 and the stray 443 scan); stateful dropped them.')
` }
  ],
  codeTitle: ['nftables ruleset for a web server', 'iptables equivalent + conntrack commands', 'Python: stateful vs stateless'],
  viz: [{
    title: 'Rule evaluation: first match wins, conntrack remembers',
    gen: function () {
      var rules = [['1', 'ct state invalid', 'DROP'], ['2', 'ct state established,related', 'ACCEPT'], ['3', 'iif lo', 'ACCEPT'], ['4', 'src 10.0.0.0/8, tcp dport 22, new', 'ACCEPT'], ['5', 'tcp dport 80/443, new', 'ACCEPT'], ['6', '(default policy)', 'DROP']];
      var pk = [
        ['SYN 203.0.113.9:51000 → :443', 4, 'New flow, matches the web rule. A conntrack entry is created.', 'new'],
        ['ACK/data 203.0.113.9:51000 → :443', 1, 'Matches an existing conntrack entry → established → accepted at rule 2 without checking ports again.', 'established'],
        ['stray ACK 192.0.2.77:4444 → :443', 0, 'No such flow and not a SYN → <b>invalid</b>. Dropped at rule 1. A stateless ACL would have let it in (ACK flag set).', 'invalid'],
        ['SYN 8.8.8.8:40000 → :22', 5, 'SSH is only for 10.0.0.0/8; nothing matches, so the <b>default policy DROP</b> applies.', 'new'],
        ['SYN 10.1.2.3:40001 → :22', 3, 'Source in 10/8, dport 22, new → accepted at rule 4.', 'new']
      ];
      var ct = [], frames = [];
      frames.push({ narr: 'The ruleset (like nftables <code>policy drop</code>). Packets are tested <b>top to bottom</b>; the first rule that matches decides. The conntrack table is empty at the start.', parts: [{ type: 'table', label: 'Rules', columns: ['#', 'match', 'action'], rows: rules }, { type: 'table', label: 'Conntrack table', columns: ['flow', 'state'], rows: [['(empty)', '-']] }] });
      pk.forEach(function (p) {
        var rows = rules.slice();
        if (p[3] === 'new' && p[1] <= 4 && p[1] >= 3) { ct.push([p[0].replace(/^SYN /, ''), 'ESTABLISHED (after handshake)']); }
        frames.push({ narr: '<b>' + p[0] + '</b>. State seen by the firewall: <b>' + p[3] + '</b>. ' + p[2], parts: [{ type: 'table', label: 'Rules (purple = matched)', columns: ['#', 'match', 'action'], rows: rows, hl: (function () { var o = {}; o[p[1]] = 'sel'; return o; })() }, { type: 'table', label: 'Conntrack table', columns: ['flow', 'state'], rows: ct.length ? ct.slice() : [['(empty)', '-']] }] });
      });
      frames.push({ narr: 'Result: web users and the office SSH get in, everything else is dropped by default. Because reply packets match <code>established</code> via conntrack, we never needed risky rules like "accept any packet with source port 443".', parts: [{ type: 'table', columns: ['packet', 'verdict'], rows: [['web SYN', 'ACCEPT'], ['web data', 'ACCEPT (established)'], ['stray ACK', 'DROP (invalid)'], ['outside SSH', 'DROP (default)'], ['office SSH', 'ACCEPT']], hl: { 2: 'bad', 3: 'bad' } }] });
      return frames;
    }
  }],
  examples: [
    { title: 'Why "allow ACK" in a stateless ACL is weak', html: `<p>A stateless ACL author wants replies to get back in, so writes <code>permit tcp any any established</code> (meaning "ACK or RST bit set"). Attackers simply craft packets with the ACK bit set: they pass the filter and can scan the internal network or send crafted payloads. A stateful firewall ignores flag claims and asks "do I have this flow in the table?".</p>` },
    { title: 'Order matters: a mistake', html: `<p>If the rule <code>accept tcp dport 22</code> (from anywhere) is placed <i>above</i> <code>accept tcp dport 22 from 10.0.0.0/8</code>, the broad one matches first and the "office only" rule is useless. Always put the narrow/specific rules and the <code>invalid</code> drop first, the broad ones later, and end with the default policy.</p>`, code: { lang: 'text', check: false, code: `BAD ORDER                              GOOD ORDER
1 accept tcp dport 22   (anyone!)      1 accept src 10.0.0.0/8 tcp dport 22
2 accept src 10/8 tcp dport 22         2 (broad rules after it, or none)
(rule 2 never reached for new SSH)     policy drop` } },
    { title: 'Conntrack exhaustion during a SYN flood', html: `<p>A flood of 2 million spoofed SYNs per second can fill a <code>nf_conntrack_max = 262144</code> table in a fraction of a second; legitimate users then get "nf_conntrack: table full, dropping packet". Defences: SYN cookies / SYN proxy (do not allocate state until the handshake completes), bigger table + shorter SYN_RECV timeout, rate-limit new connections per source, and <code>NOTRACK</code> or stateless filtering at the edge, with the stateful firewall further inside.</p>` }
  ],
  deepDive: `<p><b>Where firewalls live.</b> Host firewall (iptables/nftables, Windows Defender Firewall), network appliances, cloud <b>security groups</b> (stateful, attached to instances: allow rules only, replies automatic) vs <b>network ACLs</b> (stateless, per subnet: both directions must be allowed, numbered rules). Kubernetes NetworkPolicy and service-mesh policy add identity-based rules (zero trust): "service A may call service B", not "IP range X".</p>
  <p><b>Linux netfilter pipeline.</b> Packets traverse hooks: prerouting → (routing decision) → input / forward → postrouting, plus output for local traffic. Conntrack hooks early (prerouting/output) so every later hook can match on <code>ct state</code>; NAT is also stored in conntrack (SNAT/DNAT entries so replies are translated back). nftables replaced iptables with a unified, set-based rule language (large IP sets are hashed so lookup is O(1) rather than a linear chain scan). XDP/eBPF firewalls (Cilium, Katran, Cloudflare\'s Gatebot) drop packets in the NIC driver before the kernel allocates an skb, handling 10+ million pps per core.</p>
  <p><b>Subtleties.</b> (1) Asymmetric routing: a stateful firewall that sees only one direction treats replies as <i>invalid</i>. (2) Fragments: reassemble or drop; overlapping fragments are an evasion trick. (3) TCP window tracking: conntrack checks sequence numbers are in window to stop blind injection (<code>nf_conntrack_tcp_be_liberal</code>). (4) UDP/QUIC: firewall timeouts are short (30 to 120 s); long idle connections need keepalives, and QUIC connection migration can look like a new flow from a new IP. (5) FTP/SIP use helper modules to open "related" ports; in modern setups prefer protocols that use a single port. (6) Log sparingly, a drop-log flood is its own DoS. (7) Egress filtering stops compromised hosts from phoning home or being used for reflection attacks.</p>
  <p><b>Limits of a firewall.</b> It cannot stop attacks over allowed ports (an exploit in your web app arrives on 443), encrypted C2 traffic, insider abuse or a stolen password. It is one layer in defence in depth: patching, least privilege, WAF, IDS/IPS, segmentation, monitoring.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-assisted security tools cluster traffic, suggest rules from observed flows ("microsegmentation": learn who talks to whom, then propose a default-deny policy), and triage alerts. AI agents themselves create a new egress problem: tool-using agents can call arbitrary URLs, so teams put an <b>egress allow-list firewall / proxy</b> in front of agent sandboxes.</p>
  <p><b>Use AI as a partner:</b> have it translate iptables to nftables, explain what a rule does, or generate test packets (scapy, nmap, hping3 in a lab) to verify the ruleset. Ask it to find shadowed or redundant rules in a long list.</p>
  <p><b>Where AI goes wrong:</b> it likes to write <code>iptables -F</code> followed by <code>-P INPUT DROP</code> over SSH (you lock yourself out), forgets loopback and ICMPv6 rules on IPv6 hosts, sets the ESTABLISHED rule below the drop, or invents nftables syntax. Always test on a console-reachable machine with an automatic rollback (<code>at now + 5 min -f restore.sh</code>).</p>
  <p><b>You must still own:</b> the threat model (what must be reachable by whom), rule ordering, change safety, and the knowledge that a firewall is not the whole defence.</p>`,
  problems: [{
    title: 'Write stateful firewall rules for a web server',
    level: 'Medium', tags: ['firewall', 'conntrack', 'nftables'], companies: ['Cloudflare', 'Palo Alto Networks', 'Amazon'],
    statement: `<p>A Linux web server must serve HTTP/HTTPS (TCP 80/443) and HTTP/3 (UDP 443) to the world, allow SSH only from the office network 10.0.0.0/8, answer ping at a limited rate, and refuse everything else. Write the input chain (nftables or iptables) and explain why you need <code>ct state established,related</code> and <code>ct state invalid</code>.</p>`,
    constraints: `Default deny. Rule order matters. Include loopback.`,
    example: `<p>SYN to :443 from anywhere → ${H.c('g', 'accept (new)')}; SYN to :22 from 8.8.8.8 → ${H.c('r', 'drop (default)')}; stray ACK with no flow → ${H.c('r', 'drop (invalid)')}.</p>`,
    brute: { why: `<p>A stateless "allow source port 443 and any ACK packet" ACL lets attackers forge ACK packets to any port, and a missing default drop leaves unlisted services open. It also needs mirrored rules for the reverse direction.</p>` },
    mcq: { q: 'Why is "ct state established,related accept" placed near the top?', options: ['So replies and later packets of allowed flows are accepted fast and without re-checking ports', 'To allow new connections from anywhere', 'To log packets'], answer: 0, explain: 'Most packets belong to existing flows. Accepting them via conntrack early is faster and removes the need for risky reply-matching rules.' },
    hints: [`<p>Start with <code>policy drop</code> on the input hook so everything not allowed is denied.</p>`, `<p>First drop invalid, then accept established/related, then loopback, then service rules restricted to <code>ct state new</code>.</p>`, `<p>Edge cases: IPv6 needs ICMPv6, rate-limit ICMP, rate-limit logging, never test over SSH without a rollback timer.</p>`],
    solution: {
      approach: `<p>Use a default-drop input chain, then a short ordered allow list:</p>
      <pre>table inet filter { chain input { type filter hook input priority 0; policy drop;
  ct state invalid drop
  ct state established,related accept
  iif "lo" accept
  ip saddr 10.0.0.0/8 tcp dport 22 ct state new accept
  tcp dport { 80, 443 } ct state new accept
  udp dport 443 ct state new accept
  icmp type echo-request limit rate 5/second accept
  ip6 nexthdr icmpv6 accept } }</pre>
      <p><b>Why established,related:</b> the table remembers flows that were allowed when they started. Every later packet (both directions) and related traffic like ICMP errors is accepted at once, so we never have to open high ports for replies. <b>Why invalid first:</b> packets that belong to no flow (stray ACK/FIN, bad flag combos, out-of-window segments) are scan or injection attempts; dropping them early denies reconnaissance and saves CPU. <b>Why new on service rules:</b> only the first packet of a flow needs to be checked against the service list.</p>
      <p>Operational notes: apply with an automatic rollback, watch <code>nf_conntrack_count/max</code>, keep rules ordered narrow to broad, and add L7 protection (WAF, rate limits) because 443 is open to attackers too.</p>`,
      complexity: `<p>Per-packet cost: conntrack hash lookup O(1), then at most the few rules above; memory grows with the number of concurrent flows.</p>`,
      followUps: ['How would you make ssh brute-force attempts costly (rate limit with a meter or fail2ban)?', 'What changes if the server sits behind a NAT or load balancer?']
    }
  }]
});

/* =====================================================================
   TOPIC 6 - VPNs
   ===================================================================== */
topics.push({
  title: 'VPNs: IPsec vs WireGuard vs TLS VPNs',
  analogy: `<p>The internet is a public road. A VPN builds a <b>sealed armoured tube</b> through it: you put your letter (the original packet) into the tube, the tube is sent along the public road wrapped in a plain envelope that only shows "to the VPN gateway", and at the other end the gateway opens the tube and delivers the letter inside your private office network. Anyone watching the road sees only tube traffic between two points, never what is inside. <b>IPsec</b> is a big standards-based tube kit with many parts and options; <b>WireGuard</b> is a small, modern, opinionated tube with one cipher suite; a <b>TLS VPN</b> hides the tube inside ordinary HTTPS so it passes through almost any firewall.</p>`,
  explain: `<p>🟢 A <b>VPN</b> (virtual private network) creates an encrypted, authenticated <b>tunnel</b> between two points, so that traffic across an untrusted network stays private, unmodified and from the right peer. Two classic uses: <b>site-to-site</b> (join two office networks) and <b>remote access</b> (a laptop joins the company network). Mechanically: <b>encapsulation</b> (wrap the original IP packet inside a new one) plus <b>encryption + integrity</b> (so nobody can read or change it) plus <b>authentication</b> (certificates, pre-shared keys or public keys).</p>
  ${H.table(['', 'IPsec (IKEv2 + ESP)', 'WireGuard', 'TLS/SSL VPN (OpenVPN, AnyConnect)'], [
    ['Layer / transport', 'L3, IP protocol 50 (ESP) or UDP 4500 for NAT-T; IKE on UDP 500', 'L3, one UDP port (e.g. 51820)', 'TLS over TCP/443 or UDP (DTLS); user-space'],
    ['Handshake', 'IKEv2: two phases, many options, certificates/EAP', '1-RTT Noise_IK with static public keys', 'TLS handshake + app-level login'],
    ['Crypto agility', 'Huge menu (AES-GCM, ChaCha, DH groups...) = flexible but easy to misconfigure', 'Fixed: ChaCha20-Poly1305, Curve25519, BLAKE2s', 'Whatever TLS negotiates'],
    ['Code size', 'Very large (kernel + IKE daemon)', '~4,000 lines in kernel: easy to audit', 'Large (OpenSSL etc.)'],
    ['Firewall friendliness', 'Needs UDP 500/4500 or ESP; can be blocked', 'UDP only, can be blocked', '<span class="c-g">Looks like HTTPS, passes almost everywhere</span>'],
    ['Performance', 'Excellent with hardware offload', 'Excellent, in-kernel, roaming friendly', 'Lower (user space, TCP-over-TCP risk)'],
    ['Best for', 'Site-to-site, interop with vendors, mobile (IKEv2 MOBIKE)', 'Modern remote access, mesh VPNs (Tailscale, Netbird), cloud links', 'Clientless / strict networks, SSL portals']
  ])}
  <p>🔵 <b>IPsec modes.</b> <b>Transport mode</b> encrypts only the payload (host to host). <b>Tunnel mode</b> wraps the entire original packet in a new IP header (gateway to gateway): <code>[new IP][ESP header][original IP + data (encrypted)][ESP trailer + auth]</code>. <b>IKE</b> negotiates keys (Diffie-Hellman, gives <i>forward secrecy</i>) and sets up <b>Security Associations (SAs)</b>; <b>ESP</b> carries the data with a sequence number (anti-replay window) and an AEAD cipher. <b>AH</b> (integrity only) is rare today. NAT breaks IPsec, so ESP is wrapped in UDP 4500 (NAT-T).</p>
  <p>🔵 <b>WireGuard idea:</b> each peer has a key pair; the config says "peer with public key X is allowed to use IPs 10.0.0.2/32" (<b>cryptokey routing</b>: the key IS the identity and the AllowedIPs list is both the routing table and the ACL). No negotiation, no connection state visible to users, silent to unauthenticated packets (a port scan sees nothing), keys rotate every ~2 minutes (forward secrecy), and roaming works because the peer\'s latest authenticated source address is remembered, like QUIC migration.</p>
  <p>🔵 <b>TLS VPN pitfall:</b> carrying TCP inside a TCP tunnel ("TCP meltdown") makes two retransmission timers fight; good designs use UDP/DTLS or QUIC (MASQUE) as the carrier. <b>Split tunnel</b> (only company subnets via the VPN) vs <b>full tunnel</b> (everything, easier to monitor, slower). Modern direction: zero-trust access (per-app, identity-aware proxies) instead of "VPN = full network access".</p>`,
  clues: ['"Connect two data centers securely over the internet" → site-to-site IPsec (or WireGuard)', '"Works from a hotel network that only allows 443" → TLS VPN / WireGuard over TCP wrapper / MASQUE', '"Small attack surface, easy audit, mobile roaming" → WireGuard', '"VPN drops when NAT gateway rebinds" → NAT-T, keepalives', '"Forward secrecy" → ephemeral Diffie-Hellman in IKEv2 / Noise', '"VPN gives employees access to everything" → least privilege, split tunnel, zero trust'],
  code: [
    { lang: 'text', check: false, title: 'WireGuard: two configs (cryptokey routing)', code: `# --- /etc/wireguard/wg0.conf on the SERVER (gateway) ---
[Interface]
Address    = 10.8.0.1/24
ListenPort = 51820
PrivateKey = <server-private-key>          # generated with: wg genkey

[Peer]                                      # laptop of Asha
PublicKey  = <asha-public-key>              # wg pubkey < privatekey
AllowedIPs = 10.8.0.2/32                    # routing table AND source-address ACL for this peer

# --- /etc/wireguard/wg0.conf on Asha's LAPTOP ---
[Interface]
Address    = 10.8.0.2/24
PrivateKey = <asha-private-key>

[Peer]
PublicKey  = <server-public-key>
Endpoint   = vpn.example.com:51820
AllowedIPs = 10.20.0.0/16                   # split tunnel: only the company network goes inside
PersistentKeepalive = 25                    # keep the NAT mapping alive` },
    { lang: 'text', check: false, title: 'IPsec site-to-site (strongSwan swanctl.conf style)', code: `connections {
  hq-to-branch {
    version = 2                             # IKEv2
    local_addrs  = 203.0.113.1
    remote_addrs = 198.51.100.1
    local  { auth = pubkey; certs = hq.pem }
    remote { auth = pubkey; id = branch.example.com }
    proposals = aes256gcm16-prfsha384-ecp384   # strong AEAD + ECDH (forward secrecy)
    children {
      lan-to-lan {
        local_ts  = 10.1.0.0/16
        remote_ts = 10.2.0.0/16
        esp_proposals = aes256gcm16-ecp384
        mode = tunnel
        start_action = start                # bring the tunnel up on boot
        dpd_action = restart                # dead peer detection
      }
    }
  }
}` },
    { lang: 'python', run: true, title: 'What gets wrapped: packet sizes in tunnels', code: `# Encapsulation costs bytes -> MTU matters. Compute the largest inner packet for a 1500-byte link.
LINK_MTU = 1500
overheads = {
    'WireGuard (IPv4 outer)': 20 + 8 + 16 + 16,        # IP + UDP + WG header(16) + auth tag(16)
    'IPsec ESP tunnel (AES-GCM)': 20 + 8 + 8 + 8 + 16 + 2,  # outer IP + NAT-T UDP + SPI/seq + IV + tag + trailer ~ approx
    'OpenVPN UDP': 20 + 8 + 41,                        # typical, depends on cipher/mode
}
for name, o in overheads.items():
    inner = LINK_MTU - o
    print(f"{name:<28} overhead ~{o:>3} B -> inner MTU ~{inner} B, TCP MSS ~{inner - 40}")
print("Tip: set the tunnel interface MTU (WireGuard default 1420) and clamp TCP MSS, or large packets get dropped/fragmented.")
` }
  ],
  codeTitle: ['WireGuard configs', 'IPsec/IKEv2 site-to-site', 'Tunnel overhead and MTU'],
  viz: [{
    title: 'A packet entering a VPN tunnel: wrap, travel, unwrap',
    gen: function () {
      var nodes = [bx('L', 'Laptop 10.8.0.2', 8, 24, 20), bx('I', 'Public internet', 44, 24, 20), bx('G', 'VPN gateway', 70, 24, 18), bx('S', 'Intranet 10.20.0.5', 92, 24, 16)];
      var e = [['L', 'I', ''], ['I', 'G', ''], ['G', 'S', '']];
      function g(l, hl, ehl, tags) { return gph(l, 48, nodes, e, hl, ehl, tags); }
      return [
        { narr: 'The laptop wants to reach the intranet server <b>10.20.0.5</b>. The app creates a normal packet: <code>src 10.8.0.2 → dst 10.20.0.5</code>, payload "GET /payroll". On the open internet this address is not routable.', parts: [g('Inner packet', { L: 'cur' }, {}, { L: 'inner IP 10.8.0.2 → 10.20.0.5' }), { type: 'stack', label: 'Packet layers (bottom to top)', items: ['payload: GET /payroll', 'inner IP: 10.8.0.2 → 10.20.0.5'], hl: { 1: 'cur' } }] },
        { narr: 'The VPN client <b>encrypts the whole inner packet</b> with the session key (AEAD: confidentiality + integrity) and wraps it: a UDP header (for WireGuard, port 51820) and a new outer IP header addressed to the VPN gateway\'s public IP.', parts: [g('Encapsulated', { L: 'ok' }, { 'L-I': 'ok' }, { L: 'outer IP → gateway' }), { type: 'stack', items: ['payload: GET /payroll', 'inner IP: 10.8.0.2 → 10.20.0.5', 'ENCRYPTED + AUTH TAG', 'VPN header (WG / ESP)', 'UDP 51820', 'outer IP: laptop → gateway'], hl: { 2: 'sel', 3: 'win', 4: 'win', 5: 'win' } }] },
        { narr: 'On the internet, observers see only: laptop public IP → gateway, UDP, some random-looking bytes and their size. They cannot read the URL, the inner addresses or alter the payload without failing the authentication tag.', parts: [g('Travelling through the untrusted network', { I: 'cur' }, { 'L-I': 'ok', 'I-G': 'ok' }, { I: 'sees ciphertext only' })] },
        { narr: 'The gateway checks the sender\'s key and AllowedIPs / SA, verifies the tag, <b>decrypts</b>, replay-checks the counter, drops the outer headers and routes the inner packet into the intranet. The server replies, and the reverse happens.', parts: [g('Unwrapped at the gateway', { G: 'ok', S: 'ok' }, { 'I-G': 'ok', 'G-S': 'ok' }, { G: 'decrypt + route' }), { type: 'stack', items: ['payload: GET /payroll', 'inner IP: 10.8.0.2 → 10.20.0.5'], hl: { 1: 'ok' } }] },
        { narr: 'Policy check: with <b>split tunnel</b> only 10.20.0.0/16 enters the VPN, other websites go straight out. With <b>full tunnel</b> everything is wrapped, so the company can inspect/filter it, at the cost of latency and gateway load.', parts: [{ type: 'table', columns: ['destination', 'split tunnel', 'full tunnel'], rows: [['10.20.0.5 (intranet)', 'via VPN', 'via VPN'], ['news.example.com', 'direct', 'via VPN'], ['printer on home LAN', 'direct', 'blocked or via VPN']], hl: { 1: 'sel' } }] }
      ];
    }
  }],
  examples: [
    { title: 'Pick the VPN', html: `<p>Branch office to HQ with a Cisco router on one side and a Palo Alto firewall on the other → <b>IPsec/IKEv2</b> (the common denominator for vendor interop). A start-up giving 50 engineers access to cloud VPCs, laptops roam a lot → <b>WireGuard</b> (or Tailscale built on it). Traveller on a hotel network that blocks all UDP except 443 → <b>TLS VPN</b> or WireGuard over a TCP/HTTPS wrapper.</p>` },
    { title: 'MTU black hole', html: `<p>A WireGuard tunnel adds 60 bytes (IPv4). Inner packets of 1500 bytes no longer fit in the 1500-byte link and must be fragmented, or dropped if DF is set and ICMP "fragmentation needed" is filtered. Symptom: SSH works, big downloads or some HTTPS sites hang. Fix: tunnel MTU 1420 + TCP MSS clamping.</p>` },
    { title: 'Forward secrecy', html: `<p>Both IKEv2 and WireGuard derive fresh session keys using ephemeral Diffie-Hellman. If an attacker records all traffic today and steals the long-term private key next year, they still cannot decrypt past sessions, because the ephemeral keys were deleted. Pre-shared keys in WireGuard are an optional extra layer against future quantum attackers on the key exchange.</p>` }
  ],
  deepDive: `<p><b>IKEv2 flow.</b> IKE_SA_INIT (negotiate algorithms, exchange DH values + nonces → shared secret, all following messages encrypted) → IKE_AUTH (identify and authenticate with certificates, EAP or PSK; create the first Child SA) → CREATE_CHILD_SA for extra tunnels and rekeying. MOBIKE lets a mobile client change IP without renegotiating. DPD (dead peer detection) finds a failed peer. Policy-based IPsec uses traffic selectors (which subnets go into the SA); route-based IPsec presents a virtual tunnel interface (VTI) and lets normal routing (and BGP over the tunnel) decide.</p>
  <p><b>WireGuard internals.</b> Noise_IK handshake (initiator knows the responder\'s static public key): 1 round trip, mutual authentication, derives two transport keys. Data packets: type + receiver index + 64-bit counter + ChaCha20-Poly1305 ciphertext. The counter prevents replays (sliding window). The responder uses a cookie mechanism under load to avoid DoS by handshake floods. No dynamic IP assignment or user management exists in the protocol: higher layers (Tailscale control plane, your config management) do that; that minimalism is a feature and a limitation (no per-user revocation story built in beyond removing the peer).</p>
  <p><b>Comparing the attack surface.</b> IPsec: complex negotiation, historic vulnerabilities in IKEv1 aggressive mode with PSKs, weak DH groups, and many vendor appliances with TLS VPN portal bugs (a leading cause of real-world breaches: unpatched SSL VPN appliances). WireGuard: no algorithm negotiation means no downgrade attacks; a stolen private key equals full impersonation, so protect keys (TPM, hardware keys) and rotate. Post-quantum: hybrid key exchange (ML-KEM + X25519) is rolling out in IKEv2 (RFC 9370) and WireGuard-based products.</p>
  <p><b>Beyond classic VPNs.</b> Zero Trust Network Access (ZTNA) authenticates each user + device + app request (identity-aware proxies, mTLS) so a compromised laptop does not get the whole network. Mesh VPNs build direct peer-to-peer WireGuard tunnels, using NAT traversal (STUN/ICE-like hole punching) and relays (DERP) when that fails. Cloud VPNs (AWS Site-to-Site VPN, Azure VPN) are IPsec endpoints with BGP over the tunnel.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI agents and remote GPU clusters need private connectivity: mesh VPNs (WireGuard) connect laptops, training clusters and tool servers without public IPs; agent sandboxes often use a scoped VPN or ZTNA identity so a prompt-injected agent only reaches allowed services. Attackers also use AI to find and exploit vulnerable VPN appliances faster, which makes patching cadence a first-order concern.</p>
  <p><b>Use AI as a partner:</b> ask it to draft WireGuard/strongSwan configs for a topology, then check <b>every</b> subnet and key placeholder; ask it to explain a failing IKE log (<code>NO_PROPOSAL_CHOSEN</code> means a cipher mismatch).</p>
  <p><b>Where AI goes wrong:</b> it mixes up AllowedIPs semantics (it is both routing and ACL), omits MTU/MSS, suggests IKEv1 aggressive mode with a PSK, claims WireGuard "hides" that you use a VPN (it is easily fingerprinted), or puts private keys in a pasted config you then commit.</p>
  <p><b>You must still own:</b> key management, least-privilege routing (who can reach what), and the decision between VPN and zero trust.</p>`,
  problems: [{
    title: 'Choose a VPN for three scenarios and justify it',
    level: 'Easy', tags: ['VPN', 'IPsec', 'WireGuard'], companies: ['Cisco', 'Tailscale', 'Amazon'],
    statement: `<p>Pick IPsec, WireGuard or a TLS VPN, with a reason and one risk, for: (1) joining two offices that use different router vendors, (2) 200 remote engineers on laptops that roam between Wi-Fi and LTE, (3) a contractor in a hotel network that only allows outbound TCP 443.</p>`,
    constraints: `Give one security and one operational consideration per scenario.`,
    example: `<p>(1) IPsec/IKEv2 tunnel mode: standard on every vendor. Risk: mismatched proposals; use route-based VTI.</p>`,
    brute: { why: `<p>"Always use whatever is fastest": ignores interoperability, firewall traversal and the operational burden of key distribution.</p>` },
    mcq: { q: 'Which VPN best survives a network that only allows HTTPS?', options: ['IPsec ESP (protocol 50)', 'A TLS-based VPN on TCP 443', 'Plain GRE tunnel'], answer: 1, explain: 'A TLS VPN looks like normal HTTPS on 443 and passes nearly any firewall; ESP and GRE are separate IP protocols often blocked.' },
    hints: [`<p>What is each scenario\'s hardest constraint: interop, roaming, or firewall traversal?</p>`, `<p>IPsec = interop; WireGuard = roaming + simplicity; TLS VPN = traversal.</p>`, `<p>Add the risk: IPsec misconfiguration, WireGuard key distribution/revocation, TLS VPN performance and appliance patching.</p>`],
    solution: {
      approach: `<p><b>(1) IPsec (IKEv2, tunnel mode, route-based).</b> Every router and firewall vendor implements it, certificates or strong PSKs authenticate the peers, and with AES-GCM and ECDH you get forward secrecy. Use BGP over the VTI for failover. Risk: large option space; mismatched proposals/lifetimes or NAT-T problems cause flapping tunnels; monitor SA state and DPD.</p>
      <p><b>(2) WireGuard (managed via a control plane such as Tailscale or your own config management).</b> It handles roaming naturally (authenticated packet from a new IP updates the endpoint), has a tiny audited codebase, is fast in-kernel, and AllowedIPs gives per-peer routing and an ACL. Risk: no built-in user directory or revocation, so key lifecycle must be automated; stolen private keys equal access (use device-bound keys and short-lived access via an identity provider).</p>
      <p><b>(3) TLS VPN (OpenVPN over TCP 443, a vendor SSL VPN, or MASQUE/QUIC-based tunnel).</b> It looks like HTTPS and crosses restrictive firewalls. Risk: TCP-over-TCP performance, user-space CPU cost, and the attack surface of the VPN portal itself (patch quickly, require MFA). Better: prefer UDP/DTLS or QUIC carriers where allowed and fall back to TCP/443 only here.</p>`,
      complexity: `<p>Not algorithmic; compare handshake RTTs (WireGuard 1 RTT, IKEv2 2 exchanges, TLS VPN TCP+TLS+auth) and per-packet overhead (~32-60 bytes).</p>`,
      followUps: ['How would you give contractors access to just one internal app?', 'Why is split tunnelling a security trade-off?']
    }
  }]
});

/* =====================================================================
   TOPIC 7 - DDoS MITIGATION (defensive)
   ===================================================================== */
topics.push({
  title: 'DDoS Mitigation: Layered Defense (Volumetric, Protocol, Application)',
  analogy: `<p>A famous restaurant gets 10,000 fake phone calls that block the line so real customers cannot book. A good defence is <b>layers</b>: (1) the phone company spreads calls across many call centres in many cities (anycast absorption), (2) a screening service removes obviously fake callers before they reach you (scrubbing), (3) the receptionist only writes a booking after the caller confirms their number (SYN cookies), (4) each caller gets only a few attempts per minute (rate limiting), and (5) the manager gives priority to known regulars (reputation, login, challenge). No single layer wins; together they keep real guests served.</p>`,
  explain: `<p>🟢 A <b>DDoS</b> (distributed denial of service) attack tries to make a service unavailable by overwhelming a resource with traffic from many sources (often a botnet of hacked devices). Defence means <b>keeping real users served</b>. Know which resource is under attack:</p>
  ${H.table(['Type', 'What is exhausted', 'Examples', 'Main defence'], [
    ['<b>Volumetric</b> (L3/L4)', 'Bandwidth, link capacity', 'UDP floods, DNS/NTP/memcached <i>reflection &amp; amplification</i>', 'Big pipes, <b>anycast absorption</b>, scrubbing centres, upstream filtering/blackhole, BCP38 anti-spoofing'],
    ['<b>Protocol / state</b> (L3/L4)', 'State tables, CPU of firewalls/LBs/servers', 'SYN flood, ACK flood, fragment floods, conntrack exhaustion', '<b>SYN cookies</b>, SYN proxy, stateless filtering, bigger tables, rate limits per source'],
    ['<b>Application</b> (L7)', 'App threads, DB, expensive endpoints', 'HTTP floods, slowloris, expensive search / login / API calls, "cache-busting" queries', 'Rate limiting, caching, WAF, bot detection / challenges, autoscaling with caps, graceful degradation']
  ])}
  <p>🔵 <b>Key defensive tools.</b></p>
  <ul>
  <li><b>Anycast absorption:</b> announce the same IPs from many PoPs; attack traffic is split by where bots are, and each PoP only needs capacity for its share.</li>
  <li><b>Scrubbing:</b> divert traffic (BGP re-announcement or DNS) to a centre that drops attack packets (by signature, rate, protocol sanity) and forwards clean traffic back through a tunnel (GRE/private link). Always-on vs on-demand.</li>
  <li><b>SYN cookies:</b> when the SYN queue is full, the server does not store state. It encodes a cryptographic hash of (addresses, ports, secret, time) into the initial sequence number of its SYN-ACK. A real client\'s ACK returns <code>cookie + 1</code>; the server validates it and only then creates the connection. Spoofed SYNs never answer, so they cost no memory.</li>
  <li><b>Rate limiting:</b> token bucket or sliding window per IP, per user, per API key, per endpoint. Prefer cheap limits early (at the edge, in the kernel/XDP), expensive checks later.</li>
  <li><b>Reduce amplification:</b> do not run open resolvers or reflectors, disable unused UDP services, rate-limit responses (RRL), and filter spoofed sources at the network edge (BCP38 / uRPF).</li>
  <li><b>Remotely triggered blackhole (RTBH):</b> last resort, the ISP drops all traffic to the attacked IP (saves the network, sacrifices that IP). Better: FlowSpec rules to drop only the attack pattern.</li>
  <li><b>Design for resilience:</b> CDN in front, cache static and semi-static content, separate hidden origin (accept traffic only from the CDN/scrubber), autoscaling with spend limits, degrade gracefully (read-only mode, queue, drop expensive features), runbooks and a contact list.</li>
  </ul>`,
  clues: ['"Design a layered DDoS defense" → anycast/CDN, scrubbing, SYN cookies, rate limiting, WAF, origin lockdown', '"Spoofed source IPs" + "amplification factor" → reflection (DNS/NTP/memcached); BCP38, response rate limiting', '"SYN queue full / half-open connections" → SYN cookies', '"Many slow connections hold threads" → slowloris; timeouts, reverse proxy, event-driven server', '"Legitimate-looking requests overwhelm the database" → L7 attack; cache, rate limit, challenges', '"Our origin IP leaked" → origin lockdown (allow-list CDN ranges, mTLS, private link)'],
  code: [
    { lang: 'python', run: true, title: 'Token-bucket rate limiter and SYN-cookie idea (simulation)', code: `import hashlib, time

# ---------- 1) Token bucket per client: allows bursts but caps the average rate ----------
class TokenBucket:
    def __init__(self, rate, burst):
        self.rate, self.burst = rate, burst          # tokens per second, bucket size
        self.tokens, self.t = burst, 0.0
    def allow(self, now):
        self.tokens = min(self.burst, self.tokens + (now - self.t) * self.rate)
        self.t = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False

buckets = {}
def handle(ip, now, rate=5, burst=10):
    b = buckets.setdefault(ip, TokenBucket(rate, burst))
    return b.allow(now)

served = {'normal user': 0, 'attacker bot': 0}
sent = {'normal user': 0, 'attacker bot': 0}
for tick in range(100):                              # 10 seconds, 100 ms steps
    now = tick / 10
    # normal user: 2 requests/second; bot: 200 requests/second
    senders = [('normal user', '203.0.113.5')] if tick % 5 == 0 else []
    senders += [('attacker bot', '192.0.2.66')] * 20
    for who, ip in senders:
        sent[who] += 1
        if handle(ip, now):
            served[who] += 1
print('sent  :', sent)
print('served:', served, '  -> bot capped near 5 req/s average, the normal user is unaffected')

# ---------- 2) SYN cookie: no memory until the client proves it can receive packets ----------
SECRET = b'rotate-me-often'
def cookie(src, sport, dst, dport, minute):
    msg = f"{src}:{sport}->{dst}:{dport}@{minute}".encode()
    return int.from_bytes(hashlib.sha256(SECRET + msg).digest()[:4], 'big')   # 32-bit initial sequence number

def syn(src, sport, minute):
    return cookie(src, sport, '198.51.100.10', 443, minute)    # server replies SYN-ACK with this ISN, stores NOTHING

def ack(src, sport, ack_num, minute):
    isn = ack_num - 1                                          # a real client acks ISN + 1
    return any(isn == cookie(src, sport, '198.51.100.10', 443, m) for m in (minute, minute - 1))   # allow 1 minute of drift

c = syn('203.0.113.5', 51000, 100)
print('real client ACK accepted :', ack('203.0.113.5', 51000, c + 1, 100))
print('forged ACK (no SYN seen) :', ack('192.0.2.66', 4444, 123456789, 100))
print('server memory used by 1,000,000 spoofed SYNs: 0 entries (state lives in the cookie)')
` },
    { lang: 'bash', check: false, title: 'Host-level mitigations (Linux, defensive)', code: `# SYN cookies when the SYN backlog overflows, and a bigger backlog
sysctl -w net.ipv4.tcp_syncookies=1
sysctl -w net.ipv4.tcp_max_syn_backlog=8192
# Reverse-path filtering drops packets with spoofed sources arriving on the wrong interface
sysctl -w net.ipv4.conf.all.rp_filter=1

# nftables: limit new connections per source address, with a dynamic set that expires entries
nft add set inet filter flood '{ type ipv4_addr; flags dynamic,timeout; timeout 1m; }'
nft add rule inet filter input tcp dport 443 ct state new \\
    add @flood '{ ip saddr limit rate over 50/second }' drop

# Nginx: per-IP request rate and connection limits, plus short timeouts against slow attacks
# limit_req_zone  $binary_remote_addr zone=perip:10m rate=10r/s;
# limit_conn_zone $binary_remote_addr zone=conn:10m;
# server { limit_req zone=perip burst=20 nodelay; limit_conn conn 20;
#          client_header_timeout 10s; client_body_timeout 10s; send_timeout 10s; }` }
  ],
  codeTitle: ['Rate limiter and SYN cookies in Python', 'Linux kernel / nftables / Nginx hardening'],
  viz: [{
    title: 'Layered defense: attack traffic is filtered at every layer',
    gen: function () {
      var layers = ['Origin servers', 'App layer: rate limit + WAF + cache', 'Edge LB: SYN cookies, conntrack limits', 'Scrubbing centre', 'Anycast PoPs (absorb + spread)'];
      function q(good, bad) { var it = [], hl = {}, i; for (i = 0; i < good; i++) it.push('good'); for (i = 0; i < bad; i++) { hl[it.length] = 'bad'; it.push('atk'); } return { items: it, hl: hl }; }
      function frame(narr, depth, good, bad, note) {
        var st = layers.slice(0, depth), hl = {}; if (depth) hl[depth - 1] = 'cur';
        var qq = q(good, bad);
        return { narr: narr, parts: [{ type: 'queue', label: 'Traffic reaching this point (sample of 20 slots = ' + good + ' good + ' + bad + ' attack)', items: qq.items, hl: qq.hl, frontLabel: 'next to be served', backLabel: 'newest' }, { type: 'stack', label: 'Layers that already filtered it (top = innermost)', items: st.length ? st : ['(none: raw internet)'], hl: hl }, { type: 'text', html: note }] };
      }
      return [
        frame('Attack starts: the raw internet delivers a mix. Real users are a tiny part of the packets (here 2 of 20); a volumetric flood would overwhelm any single 10 Gbps link.', 0, 2, 18, '<b>Unprotected:</b> the link or server saturates, real users get timeouts.'),
        frame('<b>Layer 1, anycast PoPs:</b> the same IP is announced from many sites, so the bots\' traffic is split by geography. Each PoP sees a fraction and has the capacity to absorb it. Nothing is filtered yet, but nothing is overloaded.', 1, 2, 18, 'Absorption: 1 Tbps ÷ 50 PoPs ≈ 20 Gbps each.'),
        frame('<b>Layer 2, scrubbing:</b> stateless filters drop obviously bad packets: spoofed or amplification sources (UDP from port 53/123/11211 you never asked for), malformed packets, protocols you do not serve.', 2, 2, 8, 'Volumetric junk removed: 10 attack slots dropped.'),
        frame('<b>Layer 3, edge LB / firewall:</b> SYN cookies keep half-open connections from using memory; per-source new-connection limits and conntrack protections shed the protocol/state attack.', 3, 2, 4, 'Spoofed SYNs never complete the handshake, so they cost no state.'),
        frame('<b>Layer 4, app layer:</b> HTTP floods look like real requests, so the defence is behavioural: cache hits, per-client rate limits, WAF rules, bot challenges for suspicious clients, priority for logged-in users.', 4, 2, 1, 'Cheap requests answered from cache; expensive endpoints protected.'),
        frame('<b>Origin:</b> only a trickle of attack requests remains, and real users are served. The origin accepts connections only from the CDN/scrubber ranges, so attackers cannot bypass the layers.', 5, 2, 0, '<span class="c-g">Real users served, attack absorbed.</span> Keep monitoring and have a runbook for the next wave.')
      ];
    }
  }],
  examples: [
    { title: 'Amplification arithmetic', html: `<p>An attacker sends a 60-byte spoofed DNS query (source = victim) to an open resolver that answers with 3,000 bytes. Amplification factor = 3000 / 60 = <b>50x</b>. 100 Mbps of attacker traffic becomes 5 Gbps at the victim. Defences: close open resolvers, response rate limiting, BCP38 so spoofed packets never leave their network, and at the victim: drop unsolicited UDP responses.</p>${H.table(['Protocol', 'Typical amplification', 'Defence'], [['DNS', '~30-50x', 'no open resolvers, RRL'], ['NTP monlist', '~500x (patched)', 'upgrade, disable monlist'], ['memcached UDP', 'up to ~50,000x', 'bind to localhost, disable UDP']])}` },
    { title: 'SYN cookie trade-off', html: `<p>Cookies encode only a few options (MSS, maybe window scale) in 32 bits, so under a SYN flood connections lose features like large windows or SACK unless TCP timestamps carry them. That is why SYN cookies are used only <i>when the backlog is full</i>, not always.</p>` },
    { title: 'App-layer attack that looks legitimate', html: `<p>10,000 bots each send 1 request per second to <code>/search?q=random</code>. Each request is a valid HTTPS call and under a per-IP limit, but the database collapses because every query is a cache miss. Defences: cache or reject unknown deep queries, per-endpoint cost limits, require login or proof-of-work/challenge for anonymous heavy endpoints, and queue with load shedding so the DB is protected.</p>`, code: { lang: 'text', check: false, code: `if request is cacheable:      serve from CDN
elif client is trusted:       allow within its quota
elif suspicious (score high): challenge (CAPTCHA/JS/proof-of-work) or tarpit
else:                         allow with low per-IP quota
if DB queue length > limit:   shed load: 503 + Retry-After for anonymous traffic first` } }
  ],
  deepDive: `<p><b>Capacity and economics.</b> Attacks exceeding 5 Tbps and 1 billion packets per second have been recorded. Two numbers matter: bits per second (fills links) and packets per second (exhausts CPU/NIC even at modest bandwidth). Defenders therefore filter early and cheaply: NIC hardware filters, XDP/eBPF in the driver (drop at 10+ Mpps per core), kernel bypass (DPDK), and programmable switches. L7 floods through HTTP/2 can be very efficient for attackers (e.g. the "Rapid Reset" attack of 2023 abused cancelled streams; mitigated by limiting stream resets and per-connection request budgets), so protocol-level limits in servers are important.</p>
  <p><b>Detection.</b> Baseline normal traffic (pps, bps, SYN ratio, request rate, geo, ASN, TLS fingerprint such as JA3/JA4, HTTP header order). Alert on deviations; automated systems fingerprint the attack and push a drop rule within seconds (e.g. Cloudflare\'s Gatebot, FlowSpec). False positives are costly: during a flash crowd (product launch, news) legitimate traffic looks like an attack. Prefer mitigations that degrade gracefully (challenge, rate-limit) rather than hard blocks; keep allow-lists for critical partners.</p>
  <p><b>Architecture to survive.</b> Hide the origin (never expose its IP; rotate if leaked, only allow CDN ranges / mTLS / private connectivity); use separate infrastructure for critical paths (login, payments) with strict quotas; autoscaling with a budget cap to avoid "economic denial of sustainability"; DNS on anycast with multiple providers; multi-region failover; static fallback pages. Practise with game days and agreed run-books, including the ISP contacts and the decision criteria for RTBH.</p>
  <p><b>Why anycast is not enough.</b> Attackers also target BGP/DNS, the origin directly (bypassing the CDN), or choose an uneven catchment (botnet concentrated in one region). Therefore: per-PoP capacity headroom, ability to shift traffic (withdraw/prepend per PoP), and the scrubbing layer behind. Legal/ethical note: this module is about defending systems you own; launching or "testing with" attacks against others' systems is illegal. Test with consent, in labs or with approved load-testing services.</p>`,
  aiEra: `<p><b>What AI changes:</b> Attackers use AI to produce more human-like request patterns, rotate fingerprints and solve simple challenges; defenders respond with ML-based bot detection, anomaly detection on traffic baselines and automated rule generation. LLM endpoints are a new L7 target: a single long prompt can cost real GPU money, so <b>token-based rate limits</b>, per-user quotas and cost caps are the new "expensive endpoint" protection.</p>
  <p><b>Use AI as a partner:</b> have it draft a DDoS runbook and tabletop exercise, review an Nginx/Envoy rate-limit config, summarise traffic logs during an incident, and propose hypotheses (which ASN, which URL, which user agent). Always verify queries on real data.</p>
  <p><b>Where AI goes wrong:</b> it recommends simply "scale up" (attackers outscale you cheaply), suggests IP blocklists as the primary L7 defence (botnets use residential IPs), or invents mitigation features of a vendor. It may also mix attack-tool details into answers; stay on the defensive side.</p>
  <p><b>You must still own:</b> the layered design, the decision criteria under pressure (block vs challenge vs degrade), and protecting real users from false positives.</p>`,
  problems: [{
    title: 'Design a layered DDoS defense for a public API',
    level: 'Hard', tags: ['DDoS', 'rate limiting', 'anycast', 'system design'], companies: ['Cloudflare', 'Akamai', 'Google', 'Amazon'],
    statement: `<p>You run a public web/API service (HTTPS + a UDP-based real-time feed) that serves 50,000 requests per second normally. Describe a layered defense against (a) a 500 Gbps UDP reflection flood, (b) a 20 million pps SYN flood, (c) an HTTP flood of 300,000 requests per second from 40,000 residential IPs hitting an expensive search endpoint. For each layer, state what it stops and its limits.</p>`,
    constraints: `Defensive design only. Cover edge, network, transport, application and operations.`,
    example: `<p>(a) absorbed at anycast edge + scrubbed; (b) SYN cookies + stateless drop; (c) cache + per-key limits + challenge, with origin locked to the CDN.</p>`,
    brute: { why: `<p>"Buy bigger servers and autoscale": 500 Gbps exceeds any single data-centre link, autoscaling turns the attack into a huge bill, and it does nothing about state exhaustion or expensive queries.</p>` },
    mcq: { q: 'Which defence best protects against spoofed-source SYN floods without storing per-connection state?', options: ['Bigger conntrack table', 'SYN cookies', 'Blocking one source IP'], answer: 1, explain: 'SYN cookies encode the state in the SYN-ACK sequence number so spoofed sources use no memory; blocking a single IP is useless with spoofed or many sources.' },
    hints: [`<p>Classify each attack by the resource it exhausts: bandwidth, state, application cost.</p>`, `<p>Pick one cheap, early control per class: anycast and scrubbing, SYN cookies, caching + rate limits + challenge.</p>`, `<p>Add operations: hide the origin, capacity headroom per PoP, monitoring, runbook, graceful degradation, communicating with the ISP.</p>`],
    solution: {
      approach: `<p><b>Layer 0, prepare.</b> Put the service behind an anycast CDN/DDoS provider with capacity far above 1 Tbps; announce your own prefixes through them (or use their IPs). Lock the origin: accept traffic only from the provider\'s ranges (allow-list or private connectivity / mTLS) and never expose origin IPs in DNS history or email headers. Keep per-PoP headroom and a runbook with contacts.</p>
      <p><b>(a) 500 Gbps UDP reflection flood.</b> Volumetric: absorbed by anycast, because the botnet and reflectors are spread over the world and each PoP only handles its share. Scrubbing drops unsolicited UDP responses (source ports 53, 123, 11211, 1900...), fragments and protocols you do not serve; a firewall that only exposes TCP/443 and the specific UDP port for your feed makes this cheap. If one link still saturates, ask the upstream for FlowSpec or RTBH as the last resort. For your own UDP feed use QUIC/DTLS-style handshakes with address validation (retry tokens) so the service cannot be used for amplification.</p>
      <p><b>(b) 20 Mpps SYN flood.</b> State exhaustion and PPS. Drop at the earliest point (NIC/XDP), enable SYN cookies at the edge LBs, keep conntrack off or limited on the data path, add per-source and per-prefix limits for new connections, shorten SYN_RECV timeouts, and use a proxy that completes the handshake itself (SYN proxy) before talking to the backend. Anycast again divides the pps.</p>
      <p><b>(c) 300k rps HTTP flood from residential IPs.</b> IP blocklists fail (botnet of real home users), so use behaviour: cache everything cacheable (including short TTL for search results), normalise and bound query cost, per-API-key and per-session rate limits, challenge anonymous traffic with suspicious fingerprints (JA4, header order, missing JS), require auth for the expensive endpoint, and apply load shedding: if DB queue is long, serve cached or 503 + Retry-After to anonymous clients first while keeping logged-in users alive. HTTP/2 protections: cap concurrent streams and reset rates.</p>
      <p><b>Operations.</b> Real-time dashboards on pps/bps/rps/error rate and per-PoP load, automatic mitigation with manual override, a staged escalation (rate limit → challenge → block), post-incident review. Know the limits: layers add latency and false positives (flash crowds), and anycast cannot help if the attacker bypasses it by hitting the origin directly, hence origin lockdown.</p>`,
      complexity: `<p>Cost model: cheap per-packet drops at the edge (O(1) lookups) so defence cost is much lower than attack cost; the expensive layers (L7 inspection) see only the filtered remainder.</p>`,
      followUps: ['How do you distinguish a flash crowd from an attack?', 'What do you do if the attacker finds the origin IP?']
    }
  }]
});

/* =====================================================================
   PRACTICE (15 problems, Easy -> Hard)
   ===================================================================== */
function P(title, level, tags, companies, statement, constraints, example, bwhy, mcq, hints, approach, complexity, followUps) {
  practice.push({
    title: title, level: level, tags: tags, companies: companies,
    statement: statement, constraints: constraints, example: example,
    brute: { why: bwhy }, mcq: mcq, hints: hints,
    solution: { approach: approach, complexity: complexity, followUps: followUps }
  });
}

P('Which transport blocks more: TCP or QUIC?', 'Easy', ['QUIC', 'HOL blocking'], ['Google', 'Cloudflare'],
  `<p>A web page loads an image, a script and a JSON call over one connection. One packet carrying part of the image is lost. Explain what the browser can and cannot process while waiting for the retransmission, for HTTP/2 over TCP and for HTTP/3 over QUIC.</p>`,
  `One lost packet, three parallel requests, same connection.`,
  `<p>${H.c('r', 'TCP/HTTP2')}: script and JSON bytes that arrived after the lost packet wait in the kernel buffer. ${H.c('g', 'QUIC')}: only the image stream waits; the script and JSON are delivered immediately.</p>`,
  `<p>Saying "HTTP/2 multiplexes, so it is fine" ignores that all HTTP/2 streams share one TCP byte stream, so TCP still delivers bytes strictly in order.</p>`,
  { q: 'Where does head-of-line blocking remain in QUIC?', options: ['Between different streams', 'Inside one stream', 'Nowhere'], answer: 1, explain: 'Each stream is still ordered, so a lost packet delays later data of the same stream; other streams continue.' },
  [`<p>Ask: what ordering guarantee does the transport give the application?</p>`, `<p>TCP: one ordered byte stream per connection. QUIC: one ordered byte stream per stream.</p>`, `<p>Mention that a loss in the image stream still delays the later image bytes in QUIC, and that the lost data is re-sent in a new packet number.</p>`],
  `<p>With HTTP/2 over TCP, the three responses are interleaved frames inside one TCP byte stream. TCP only delivers bytes to the application in sequence. When the packet with part of the image is lost, all later packets, including those holding the script and JSON frames, are buffered by the kernel until the retransmission fills the hole. The browser sees nothing new for roughly one RTT (or a timeout) even though the data has already arrived.</p>
  <p>With HTTP/3 over QUIC each request is its own stream and the receiver orders data per stream. The lost packet only holds back the image stream; frames for the script and JSON are delivered as soon as they arrive. The retransmitted image data is sent in a new packet with a new packet number. The benefit is largest on lossy mobile networks and pages with many parallel resources; on a clean link both behave almost the same.</p>`,
  `<p>Delay for unaffected streams: TCP adds about 1 RTT (or RTO); QUIC adds 0.</p>`,
  ['What if the lost packet is the last of the image?', 'Does QUIC remove head-of-line blocking completely?']);

P('L4 or L7 load balancer?', 'Easy', ['load balancer', 'L4', 'L7'], ['Amazon', 'Netflix'],
  `<p>For each requirement choose L4 or L7 and say why: (1) route <code>/api</code> and <code>/static</code> to different clusters; (2) forward 5 million packets/s of game UDP traffic; (3) sticky sessions based on a login cookie; (4) terminate TLS and add a header with the client ID.</p>`,
  `One choice per item with a one-line reason.`,
  `<p>(1) L7, needs the URL. (2) L4, no need to parse. (3) L7, cookie is in HTTP. (4) L7, must decrypt and edit the request.</p>`,
  `<p>Putting an L7 proxy for everything wastes CPU on traffic that needs no inspection; putting L4 for path routing is impossible because the path is not visible.</p>`,
  { q: 'What does an L4 balancer see?', options: ['URL and cookies', 'IP addresses, ports and protocol', 'The SQL query'], answer: 1, explain: 'L4 balancing uses transport-layer information only: the 5-tuple.' },
  [`<p>What information must the balancer read to make the decision?</p>`, `<p>If the data is inside the HTTP request, you need L7 (and usually TLS termination).</p>`, `<p>Note combos: L4 in front (fast, resilient) feeding L7 proxies.</p>`],
  `<p>The deciding question is "what must the LB look at?". Path routing (1), cookie stickiness (3) and header injection (4) require parsing HTTP, and because HTTPS is encrypted the balancer must terminate TLS: that is an L7 load balancer (Nginx, Envoy, HAProxy http mode, ALB). The game UDP traffic (2) needs only fast spreading by 5-tuple, with no per-packet parsing and no state beyond a flow table: an L4 balancer (IPVS, Katran, NLB), perhaps with DSR.</p>
  <p>Real systems stack them: anycast/ECMP spreads traffic to an L4 tier, which spreads TCP connections over an L7 proxy tier, which routes requests to services. Cost: L7 is slower and holds more state, but gives retries, observability and policy.</p>`,
  `<p>L4 is O(1) per packet; L7 is per request with buffering and parsing cost.</p>`,
  ['What changes for gRPC / HTTP/2 long-lived connections?', 'How can L4 achieve stickiness?']);

P('Stateless vs stateful firewall in one example', 'Easy', ['firewall', 'conntrack'], ['Palo Alto Networks', 'Cisco'],
  `<p>Your internal laptop opens a connection to a web server on port 443. The reply comes from port 443 to your ephemeral port 51000. Explain how a stateless filter and a stateful firewall each decide to let the reply in, and what an attacker can abuse in the stateless case.</p>`,
  `Mention the connection table and one forged-packet example.`,
  `<p>Stateless: rule "allow tcp source port 443" (or "allow ACK"). Stateful: reply matches the entry created by the outgoing SYN.</p>`,
  `<p>Opening all high ports "to let replies back" exposes every service on the laptop.</p>`,
  { q: 'Which statement is true of a stateful firewall?', options: ['It checks only one packet at a time', 'It remembers flows in a connection table', 'It cannot filter by port'], answer: 1, explain: 'Stateful firewalls track connections, so replies are allowed because they belong to an existing flow.' },
  [`<p>Where could a stateless filter learn that this reply was asked for? It cannot.</p>`, `<p>So it must trust header hints such as source port or ACK flag.</p>`, `<p>Attacker crafts packets with source port 443 or ACK set and reaches internal ports.</p>`],
  `<p>A stateless filter evaluates every packet independently. To let the web server\'s reply in it needs a rule such as "permit tcp any eq 443 to the internal net" or "permit tcp ... established" (ACK or RST set). Both depend on values the sender controls. An attacker can send packets with source port 443 or the ACK flag set to any internal port and the filter lets them pass, enabling port scans and exploit delivery.</p>
  <p>A stateful firewall creates a conntrack entry when it sees the outgoing SYN (allowed by policy). The reply, with the 5-tuple reversed, is matched to that entry and accepted as <code>ct state established</code>. A forged packet with no entry is <code>invalid</code> or <code>new</code> and falls to the normal inbound rules (default drop). The cost is memory per flow and a finite table that must be protected against exhaustion.</p>`,
  `<p>Stateful: O(1) hash lookup per packet, memory proportional to concurrent flows.</p>`,
  ['What happens to UDP replies?', 'How does asymmetric routing break a stateful firewall?']);

P('Classify the DDoS attack', 'Easy', ['DDoS', 'classification'], ['Cloudflare', 'Akamai'],
  `<p>Classify each as volumetric, protocol/state or application-layer, and give the first mitigation: (1) 400 Gbps of DNS responses from open resolvers hitting your IP; (2) millions of SYNs from random spoofed sources, server shows many half-open connections; (3) 200,000 valid HTTPS requests/s to <code>/search?q=random-words</code>; (4) 5,000 clients open connections and send one byte every 10 seconds.</p>`,
  `One class and one primary mitigation each.`,
  `<p>(1) volumetric → anycast absorption/scrubbing. (2) protocol → SYN cookies. (3) application → cache + rate limit + challenge. (4) application (slowloris) → timeouts, event-driven proxy.</p>`,
  `<p>Blocking source IPs for all four: useless for spoofed or reflected traffic and for large residential botnets.</p>`,
  { q: 'Which defence stops spoofed SYN floods from consuming memory?', options: ['SYN cookies', 'More RAM', 'Round-robin DNS'], answer: 0, explain: 'SYN cookies keep no per-connection state before the client proves it received the SYN-ACK.' },
  [`<p>Ask which resource runs out: bandwidth, connection state, or app work.</p>`, `<p>Reflection with unsolicited responses is volumetric. Half-open connections are state. Valid requests are L7.</p>`, `<p>Slowloris ties up worker threads with slow, legitimate-looking connections: L7 resource exhaustion.</p>`],
  `<p>(1) <b>Volumetric</b>: the link is the bottleneck, not your servers. Absorb with anycast and a large scrubbing provider, drop unsolicited UDP responses (source port 53) at the edge, ask the upstream for filtering, and ensure your own resolvers are not open. (2) <b>Protocol/state</b>: SYN flood. Enable SYN cookies, drop at the NIC/XDP, limit new connections per source, shorten SYN_RECV timeouts. (3) <b>Application</b>: the requests are valid but expensive. Cache, bound the cost of queries, per-key rate limits, bot challenges, shed load. (4) <b>Application (slowloris)</b>: use an event-driven reverse proxy, short header/body timeouts, per-IP connection caps.</p>`,
  `<p>Identify the exhausted resource first; each class has a different cheap control point (network edge, kernel, application).</p>`,
  ['Why is blocking IPs a poor primary defence for (3)?', 'What is the amplification factor in (1) if queries are 60 bytes and answers 3000?']);

P('Is 0-RTT safe? Design the rule', 'Medium', ['QUIC', '0-RTT', 'replay'], ['Google', 'Cloudflare'],
  `<p>Your API supports TLS 1.3 / QUIC 0-RTT to cut latency. A teammate wants to enable it for every endpoint. Explain the replay risk, which endpoints are safe, and what server-side protections you would add.</p>`,
  `Cover idempotency, anti-replay, and forward secrecy limits.`,
  `<p>${H.c('g', 'GET /feed')} in 0-RTT: replay harmless. ${H.c('r', 'POST /pay')} in 0-RTT: attacker replays the captured packet and the payment runs twice.</p>`,
  `<p>Enabling 0-RTT for all endpoints because "TLS is encrypted": encryption does not stop an attacker from re-sending recorded ciphertext.</p>`,
  { q: 'What property do 0-RTT data lack compared with 1-RTT data?', options: ['Confidentiality', 'Replay protection (and forward secrecy)', 'Compression'], answer: 1, explain: '0-RTT is encrypted with a resumption key, so it can be replayed by an attacker and is not forward secret.' },
  [`<p>Who can send the same bytes twice? Anyone who recorded them.</p>`, `<p>Which operations are idempotent (safe to repeat)?</p>`, `<p>Options: restrict 0-RTT to GET/HEAD, single-use tickets with a server anti-replay cache, short ticket lifetime, or a replay-safe token in the request.</p>`],
  `<p>0-RTT data is protected by a key derived from a previous session (the PSK), before the server contributed any fresh randomness. An on-path attacker can record the first flight and replay it to the server, perhaps to a different server in the cluster that shares ticket keys. The server cannot tell it is a replay unless it keeps state. Also, 0-RTT data is not forward secret: if the ticket key leaks later, the recorded data can be decrypted.</p>
  <p>Policy: accept 0-RTT only for idempotent, side-effect-free requests (GET/HEAD to cacheable or read-only endpoints), reject or delay anything else, which makes the client retry after the 1-RTT handshake. Add server-side protection: tickets valid for minutes, a single-use ticket store (or a strike register per ticket window) shared by the cluster, and the <code>Early-Data: 1</code> header (RFC 8470) so the app can answer 425 Too Early. Never allow money-moving or state-changing requests in early data.</p>`,
  `<p>Savings: one RTT per resumed connection. Cost: anti-replay state or restricted endpoints.</p>`,
  ['How does a 425 Too Early response work?', 'Why is 0-RTT not available on the very first connection?']);

P('Explain a BGP hijack and how RPKI helps', 'Medium', ['BGP', 'RPKI', 'hijack'], ['Cloudflare', 'Cisco', 'Google'],
  `<p>Owner AS64500 announces 203.0.113.0/22. Another AS announces 203.0.113.0/24 as its own. (a) What happens to traffic? (b) Why does a longer AS path not save the victim? (c) How does RPKI route origin validation change the outcome, and what can it NOT detect?</p>`,
  `Use longest-prefix match, ROA fields (prefix, origin AS, maxLength), valid/invalid/not-found.`,
  `<p>ROA: (203.0.113.0/22, AS64500, maxLength 22). Hijack: /24 from AS666 → ${H.c('r', 'invalid (wrong origin and longer than maxLength)')}.</p>`,
  `<p>"Prepend the AS path to look more attractive": best-path selection compares routes for the same prefix only; the forwarding table prefers the longest prefix first.</p>`,
  { q: 'A router has 203.0.113.0/22 (victim) and 203.0.113.0/24 (hijacker). A packet to 203.0.113.50 follows:', options: ['The /22 because its AS path is shorter', 'The /24 because longest prefix wins', 'Both, load balanced'], answer: 1, explain: 'Forwarding uses longest-prefix match before any BGP attribute comparison.' },
  [`<p>Compare prefixes before AS paths: which prefix is more specific?</p>`, `<p>ROA says who may originate which prefix and up to what length.</p>`, `<p>Limits: forged AS paths that end in the right origin AS, route leaks (valid origin, wrong path), loose maxLength, networks that do not do ROV.</p>`],
  `<p>(a) Routers install both routes because they are different prefixes. For destinations inside the /24, the forwarding lookup picks the longest match, the hijacker\'s /24, so traffic is attracted there regardless of AS-path length. The hijacker can black-hole it or relay it (man in the middle). (b) AS-path length and LOCAL_PREF only break ties among routes for the <i>same</i> prefix, so the victim cannot out-prepend a more specific route; the usual response is to announce the /24s themselves (which only works if there is no ROV on them) and to contact upstreams.</p>
  <p>(c) The owner publishes a ROA: AS64500 may originate 203.0.113.0/22 with maxLength 22. Networks running ROV compare each announcement with validated ROAs: the /24 from AS666 is <b>invalid</b> (origin not authorised and length exceeds maxLength) and is dropped, so it never reaches the forwarding tables of those networks. What RPKI does not detect: a hijacker who forges the path to end with AS64500 (origin looks right), route leaks (valid origin, illegitimate path), and anything for prefixes without ROAs (not-found is accepted). Complement with ASPA, strict customer filters, max-prefix limits, and monitoring plus tight maxLength values.</p>`,
  `<p>ROV is a table lookup per announcement; deployed in routers via the RTR protocol.</p>`,
  ['Why is a loose maxLength dangerous?', 'What is the difference between a hijack and a route leak?']);

P('RPKI validation by hand', 'Medium', ['RPKI', 'BGP'], ['Cloudflare', 'Juniper'],
  `<p>ROAs: (192.0.2.0/24, AS100, max 24), (198.51.100.0/22, AS200, max 24). Classify as valid / invalid / not-found: (1) 192.0.2.0/24 from AS100; (2) 192.0.2.0/24 from AS999; (3) 198.51.100.0/24 from AS200; (4) 198.51.100.0/25 from AS200; (5) 203.0.113.0/24 from AS300.</p>`,
  `A route is valid if a covering ROA matches origin AS and prefix length ≤ maxLength; invalid if covered but no match; not-found if nothing covers it.`,
  `<p>(1) ${H.c('g', 'valid')} (2) ${H.c('r', 'invalid (wrong AS)')} (3) ${H.c('g', 'valid')} (4) ${H.c('r', 'invalid (/25 &gt; max 24)')} (5) ${H.c('m', 'not-found')}.</p>`,
  `<p>Treating "no ROA" as invalid would break most of the internet at once (many prefixes still have no ROA).</p>`,
  { q: 'A /25 inside a ROA with maxLength 24 from the right AS is:', options: ['valid', 'invalid', 'not-found'], answer: 1, explain: 'The route is covered by a ROA but its prefix length exceeds maxLength, so it does not match: invalid.' },
  [`<p>First find which ROAs cover the announced prefix.</p>`, `<p>Then compare origin AS and length ≤ maxLength.</p>`, `<p>No covering ROA at all → not-found (accepted in practice).</p>`],
  `<p>Method: for each announcement find all ROAs whose prefix covers it. If none: <b>not-found</b>. If at least one has the same origin AS and the announced length ≤ its maxLength: <b>valid</b>. Otherwise: <b>invalid</b>.</p>
  <p>(1) covered by ROA 1, origin AS100, length 24 ≤ 24: valid. (2) covered, origin AS999 differs: invalid. (3) 198.51.100.0/24 is covered by the /22 ROA, origin AS200, length 24 ≤ 24: valid. (4) covered by the /22 ROA, origin matches but 25 &gt; 24: invalid, which prevents deaggregation hijacks. (5) no ROA covers 203.0.113.0/24: not-found. Policy: drop invalid, accept valid and not-found (with lower local-pref for not-found if you want to be stricter).</p>`,
  `<p>O(number of covering ROAs) per route; routers use a trie.</p>`,
  ['What if two ROAs cover the same prefix with different origins?', 'How do you safely publish a ROA when you plan to split a block?']);

P('ECMP: how many flows move (6 to 5 backends)?', 'Medium', ['ECMP', 'hashing'], ['Google', 'Meta'],
  `<p>A router uses <code>backend[h mod N]</code>. N goes from 6 to 5 because the LAST backend (index 5) dies. For uniformly random hashes, what fraction of flows (a) were on the dead backend, (b) keep the same backend, (c) move needlessly? Compare with consistent hashing.</p>`,
  `Use h mod 30 (lcm of 6 and 5) as the cycle.`,
  `<p>h mod 30 = r. Same server only if r mod 6 = r mod 5, i.e. r ∈ {0,1,2,3,4}: 5 of 30 stay = ${H.c('g', '16.7%')}.</p>`,
  `<p>Assuming only the dead backend\'s 1/6 (16.7%) moves; the modulus change reshuffles almost all.</p>`,
  { q: 'Expected fraction of flows that move needlessly (not on the dead backend) from 6 → 5?', options: ['0%', 'about 67%', 'about 17%'], answer: 1, explain: 'Moved = 1 − 1/6 stay = 83.3%; of those 16.7% were on the dead one, so 66.7% move needlessly.' },
  [`<p>Write residues r = h mod 30 from 0 to 29 and compute r mod 6 and r mod 5 side by side.</p>`, `<p>They agree only when r is below 5 (r mod 6 equals r mod 5 just for r = 0 to 4).</p>`, `<p>Then split the moved fraction into forced (dead backend, 1/6) and needless (the rest).</p>`],
  `<p>Take r = h mod 30, uniform on 0..29. Before: server index r mod 6. After: r mod 5. They are equal for r = 0..4 only (for r = 5: 5 vs 0; r = 6: 0 vs 1, and so on), so 5/30 = <b>16.7% stay</b> and <b>83.3% move</b>. Flows that were on the dead backend: r mod 6 = 5 → 5/30 = <b>16.7%</b> (forced). Needless moves = 83.3% − 16.7% = <b>66.7%</b>.</p>
  <p>With consistent hashing (ring, rendezvous, Maglev), flows depend on identity not on count: only the dead backend\'s 16.7% move and are spread among the remaining five (each gets about 3.3%). Maglev may move a small extra percent because of slot-filling order. Operational follow-up: keep a connection table so established flows survive even those few changes.</p>`,
  `<p>Closed-form via lcm; simulation with 10<sup>6</sup> random hashes confirms it.</p>`,
  ['What if a backend is added (5 → 6)?', 'How does resilient hashing in a switch ASIC help?']);

P('When is DSR the right choice?', 'Medium', ['DSR', 'load balancer'], ['Netflix', 'Google'],
  `<p>A video-streaming service serves 2 Gbps of requests-in and 100 Gbps of responses-out. Explain how DSR changes the load balancer\'s job, what must be configured on the backends, and the limitations.</p>`,
  `Cover ARP, loopback VIP, L2 adjacency or tunnels, and what you lose.`,
  `<p>Request path: client → LB → backend. Response path: backend → client directly with source = VIP. LB sees ${H.c('g', '2 Gbps')} instead of 102 Gbps.</p>`,
  `<p>NAT-mode balancing: both directions pass the LB, so it needs 100+ Gbps of capacity for responses and is a bottleneck and a cost.</p>`,
  { q: 'Which backend setting prevents DSR backends from fighting the LB for the VIP?', options: ['Disable ARP replies for the VIP (arp_ignore) while holding it on loopback', 'Use a different MAC for every packet', 'Enable NAT on the backend'], answer: 0, explain: 'Backends own the VIP on lo but must not answer ARP for it, otherwise traffic bypasses the LB.' },
  [`<p>Compare which direction carries the bytes.</p>`, `<p>The backend must accept packets destined to the VIP and answer with the VIP as source.</p>`, `<p>Limitations: L4 only, no TLS termination or response rewriting, harder health checks, MTU with tunnels, asymmetric paths through stateful firewalls.</p>`],
  `<p>In NAT/proxy mode every response byte goes back through the LB, so a 100 Gbps response stream needs a 100 Gbps LB. With DSR the LB only forwards the small request packets (it rewrites the destination MAC for same-subnet backends, or encapsulates in IPIP/GRE/GUE for routed ones). Each backend holds the VIP on a loopback interface and has ARP suppression enabled (arp_ignore=1, arp_announce=2) so only the LB advertises the VIP. The backend sends the response with source IP = VIP straight to the client, bypassing the LB. The LB handles ~2% of the bytes.</p>
  <p>Limitations: the LB cannot see or change responses (no L7 features, no TLS termination, no caching), connection tracking must still keep a flow on one backend (consistent hash plus flow table), health checks must hit the VIP path, tunnelling reduces MTU (clamp MSS), and stateful firewalls that see only half of a flow may drop it. For L7 needs, use a two-tier design: DSR L4 tier for the heavy video path and L7 proxies for APIs.</p>`,
  `<p>LB throughput scales with request bytes, not response bytes.</p>`,
  ['How would you do DSR across subnets or in a cloud VPC?', 'How do you drain a backend in DSR mode?']);

P('Anycast failover and TCP: plan a safe PoP maintenance', 'Medium', ['anycast', 'operations'], ['Cloudflare', 'Fastly'],
  `<p>You must patch one PoP of an anycast CDN carrying long TCP downloads and QUIC video. Write the procedure so users see almost no resets. Explain what breaks if you simply withdraw the route.</p>`,
  `Include prepending/drain, monitoring, rollback and re-introduction.`,
  `<p>Step list: prepend ×3 → watch connections fall → withdraw → patch → announce with prepend → remove prepend gradually.</p>`,
  `<p>Withdraw immediately: every in-flight connection hits another PoP that has no state and answers RST; users see failed downloads.</p>`,
  { q: 'What does AS-path prepending do in a drain?', options: ['Makes the PoP\'s route look longer so new flows prefer other PoPs', 'Encrypts BGP', 'Raises LOCAL_PREF'], answer: 0, explain: 'A longer AS path is less preferred, so traffic drifts away gradually while existing connections finish.' },
  [`<p>Think about gradual vs abrupt traffic shift.</p>`, `<p>New flows move at the first sign of a worse route; old flows end naturally.</p>`, `<p>Check the PoP\'s catchment is sufficiently covered by neighbours and watch their load before withdrawing.</p>`],
  `<p>1) Verify neighbours have capacity for this PoP\'s catchment (look at peak and the 95th percentile). 2) Announce the PoP\'s prefix with AS-path prepending (or lower LOCAL_PREF through a community at upstreams) so BGP-nearest changes for most networks; new connections go elsewhere. 3) Stop accepting new flows at L4/L7 (mark the PoP draining), wait for active connections to fall under a threshold or a timeout (e.g. 5 to 15 minutes; for QUIC send GOAWAY so clients migrate). 4) Withdraw the announcement; confirm via looking glasses that routes are gone. 5) Patch, run health checks. 6) Re-announce with the prepend still on, check metrics, then remove the prepend step by step. 7) Keep a rollback (re-announce) ready.</p>
  <p>Without draining, a plain withdraw makes routers pick another PoP within seconds; established TCP flows arrive there with no state and receive RST, which breaks downloads. With QUIC the connection ID may let a routing layer forward to the right backend, but only if the new PoP shares the necessary state; usually you simply rely on the client reconnecting. Also use short TTL on DNS-based hints if used, and tell your NOC.</p>`,
  `<p>Operational: time bounded by connection lifetimes; shift is gradual to avoid cascading overload.</p>`,
  ['What if the neighbour PoP would overload?', 'How do you detect catchment changes?']);

P('Tunnel MTU and MSS for a WireGuard link', 'Medium', ['VPN', 'MTU', 'WireGuard'], ['Tailscale', 'Cloudflare'],
  `<p>Underlying link MTU is 1500. WireGuard over IPv4 adds 20 (IP) + 8 (UDP) + 16 (WG header) + 16 (auth tag) bytes. Compute the tunnel MTU, the TCP MSS you should clamp (IPv4, 20 byte IP + 20 byte TCP headers), and explain why users see "SSH works but big downloads hang" when this is wrong.</p>`,
  `Show arithmetic; mention PMTU discovery and ICMP filtering.`,
  `<p>Overhead 60 → inner MTU 1440 (WireGuard default is 1420 to also fit IPv6). MSS = 1440 − 40 = ${H.c('g', '1400')}.</p>`,
  `<p>Leaving the tunnel MTU at 1500: full-size packets cannot fit after encapsulation and are fragmented or dropped.</p>`,
  { q: 'Why do small packets (SSH keystrokes) work while large transfers hang when MTU is wrong?', options: ['Small packets fit within the real path MTU, large ones are dropped if PMTUD is broken', 'SSH uses UDP', 'Small packets are not encrypted'], answer: 0, explain: 'Only packets larger than the effective MTU are dropped; if ICMP "frag needed" is filtered, PMTUD never corrects the sender.' },
  [`<p>Subtract the encapsulation overhead from the link MTU.</p>`, `<p>MSS = inner MTU − IP header − TCP header.</p>`, `<p>Explain PMTUD: DF bit + ICMP type 3 code 4; firewalls that drop ICMP make a black hole. Fix with MSS clamping.</p>`],
  `<p>Overhead = 20 + 8 + 16 + 16 = 60 bytes, so inner MTU = 1500 − 60 = 1440 (WireGuard\'s default 1420 leaves room for IPv6 outer headers, which are 20 bytes larger). TCP MSS for IPv4 = inner MTU − 20 (IP) − 20 (TCP) = <b>1400</b>. Configure the interface MTU and clamp the MSS on the gateway (<code>iptables -t mangle ... --clamp-mss-to-pmtu</code> or nftables <code>tcp option maxseg size set rt mtu</code>).</p>
  <p>Symptom: handshakes and interactive traffic use small packets and work. A large download uses full 1500-byte segments; after encapsulation they exceed the path MTU. With the DF bit set the router should return ICMP "fragmentation needed", but if firewalls drop ICMP, the sender never learns and keeps retransmitting the same large segment: the connection stalls (an MTU black hole). Clamping MSS makes the endpoints choose segments that always fit.</p>`,
  `<p>Cost: ~4% less payload per packet (60 of 1500 bytes).</p>`,
  ['How does QUIC handle PMTU?', 'What changes with IPv6 outer headers?']);

P('Design a load-balancing tier that survives LB and backend failures', 'Hard', ['load balancer', 'Maglev', 'ECMP', 'system design'], ['Google', 'Meta', 'Cloudflare'],
  `<p>Design the L4 tier of a service with 8 load balancers and 200 backends, 1 million new connections/s. Requirements: any LB can fail, backends can be added or removed daily, existing connections must survive as much as possible, and traffic should be evenly spread. Explain routing to the LBs, the backend selection algorithm, state, health checks and failure scenarios.</p>`,
  `Cover ECMP/BGP, Maglev or consistent hashing, flow table, health, draining, consistency of tables across LBs.`,
  `<p>Router ECMP (resilient hashing) → LB k (Maglev table + flow cache) → backend (DSR or IPIP). LB dies → router rehashes → other LB computes the SAME backend from the same table.</p>`,
  `<p>Round-robin per packet in each LB with independent state: after an LB failure or ECMP reshuffle the other LB does not know which backend owns a connection and breaks it.</p>`,
  { q: 'Why must all LBs build identical lookup tables?', options: ['So any LB maps a flow to the same backend after an ECMP reshuffle', 'To save memory', 'Because routers require it'], answer: 0, explain: 'If two LBs disagree, a flow that moves between them lands on a different backend and breaks.' },
  [`<p>List the failure events: LB crash, backend crash, backend added, router rehash. What must stay stable for each?</p>`, `<p>The backend decision must be a deterministic function of (flow, backend set, version), plus a local flow cache for established flows.</p>`, `<p>Think about the order of table updates across LBs and drain/slow-start for new backends.</p>`],
  `<p><b>Front door.</b> The service VIP is announced by all 8 LBs via BGP (with BFD for fast failure detection); the upstream routers use ECMP (ideally resilient hashing) to spread flows. If an LB fails its BGP session drops and only its share of flows is rehashed to others; with resilient hashing the other flows stay put.</p>
  <p><b>Backend choice.</b> Each LB maps a flow by Maglev hashing: <code>table[hash(5-tuple) mod M]</code> with M a large prime (e.g. 65537 or higher, ≥100× the number of backends) so load is even within about 1%. All LBs build the table deterministically from the same ordered, versioned backend list (config distribution with versions, apply atomically, slow convergence is tolerated because tables differ only for the changed backend\'s slots). New flows follow the table; each LB also keeps an LRU <b>flow table</b> so established connections stay on their original backend even when the table changes (backend added) or an LB restarts (then the hash gives the same answer in most cases).</p>
  <p><b>Backends.</b> DSR via IPIP/GUE so responses bypass the LBs; health checks (active + passive) mark backends unhealthy; removal triggers a table rebuild where only that backend\'s slots (plus a small spill) change; draining means stop adding to new flows while keeping the flow-table entries until connections end. New backends ramp up with a lower weight (slow start) to avoid cold-cache overload.</p>
  <p><b>Failure scenarios.</b> LB crash: bounded rehash, consistent table gives the same backend. Backend crash: its ~1/200 of flows (0.5%) reset; others untouched. Simultaneous backend change and LB failure: some flows differ if tables are at different versions; mitigate by versioned rollout and by encoding a backend ID in later packets (for QUIC, in the connection ID). Monitoring: per-backend load skew, table version per LB, flow-table hit rate. Compared with plain hash mod N, disruption falls from ~99% to ~0.5% per backend event.</p>`,
  `<p>Lookup O(1), flow table memory ~ concurrent flows (e.g. 10 million entries × ~64 B), table rebuild O(M) off the data path.</p>`,
  ['How would you add QUIC connection migration support?', 'What if the backend set changes while an LB is partitioned from the config service?']);

P('Design a global anycast DNS/CDN service and defend it against hijacks', 'Hard', ['anycast', 'BGP', 'RPKI', 'design'], ['Cloudflare', 'Google', 'Akamai'],
  `<p>You operate an authoritative DNS service on anycast prefixes from 40 PoPs. Design the BGP announcements, health-based withdrawal, load balancing across catchments, and the protections against hijacks and route leaks (yours and the internet\'s). What do you monitor?</p>`,
  `Cover prefix design, ROAs, communities, max-prefix, RTBH/FlowSpec, per-PoP capacity, and detection.`,
  `<p>Announce 2 diversified anycast /24s from every PoP, ROA with maxLength 24, health daemon withdraws a prefix when the local resolver fails.</p>`,
  `<p>One single prefix from every PoP with a loose ROA and no monitoring: one PoP or one hijacker can pull the entire world\'s traffic, and a loose maxLength lets a hijacker announce a valid-looking /24.</p>`,
  { q: 'What is the safest ROA maxLength for a /24 that you announce as /24 everywhere?', options: ['24', '28', '32'], answer: 0, explain: 'maxLength equals the longest prefix you actually announce; larger values invite valid-looking more-specific hijacks.' },
  [`<p>Separate three concerns: reachability (anycast), robustness (withdrawal + capacity), and trust (RPKI + monitoring).</p>`, `<p>Use multiple prefixes (and providers) so one can be withdrawn or attacked without taking everything down.</p>`, `<p>Monitoring: BGP route collectors, looking glasses, RIPE Atlas probes for catchments, alerts on new origins or more-specifics.</p>`],
  `<p><b>Addressing and announcements.</b> Use at least two anycast prefixes (e.g. two /24s from different aggregates), advertise each from every PoP to local transit and peers, and give each prefix its own NS records so resolvers can fall back. Keep the announced prefixes at /24 (the longest accepted globally) so nothing more specific can be announced by an attacker with a valid ROA: publish ROAs with <b>maxLength 24</b> exactly matching what you announce, and register route objects in IRRs. Ask upstreams to enforce ROV and prefix filters on your sessions.</p>
  <p><b>Health and traffic engineering.</b> A local daemon (ExaBGP/BIRD with BFD) announces a prefix only if the local resolver answers synthetic queries; failure withdraws it, so queries flow to neighbouring PoPs within seconds. Capacity is planned per PoP with at least 2x headroom for neighbour failover plus attack headroom. Use communities and prepending for drains and to rebalance catchments; use FlowSpec/RTBH coordination with upstreams for attacks.</p>
  <p><b>Defence against hijacks and leaks.</b> Your sessions: max-prefix limits, GTSM/TCP-AO, strict import filters (accept only expected prefixes from customers, never re-advertise provider routes to peers), ROV on imports, ASPA when available. Detection: subscribe to BGP monitoring (RIPE RIS, RouteViews, BGPalerter) for new origins and more-specifics of your prefixes, plus RIPE Atlas/looking-glass probes checking catchments and latency; pre-agree an incident process with upstreams (contacts, how to request filtering or a withdrawal of the bogus route). Also use DNSSEC so a hijacked response cannot be forged without keys, and keep a secondary DNS provider on separate prefixes.</p>
  <p><b>Limits.</b> RPKI does not cover path forgery; DNSSEC does not stop a black hole; anycast does not stop a flood concentrated in one catchment (hence scrubbing and withdraw-to-shed). Test everything with failure drills.</p>`,
  `<p>Operational design: no algorithmic complexity; convergence time of BGP is seconds to a minute.</p>`,
  ['How would you detect a hijack in under 5 minutes?', 'How do you shift load from an overloaded PoP?']);

P('Post-incident: a customer leaked routes. What failed and how do you prevent it?', 'Hard', ['BGP', 'route leak', 'incident'], ['Cloudflare', 'Verizon', 'Cisco'],
  `<p>At 10:02 a small customer AS (a datacentre) re-announces routes it learned from Provider A to Provider B, which accepts them and prefers them (customer routes have high LOCAL_PREF). Traffic for large sites flows through the tiny customer and its link melts. Reconstruct what went wrong, list the controls at each AS, and propose an action plan.</p>`,
  `Explain valley-free routing, LOCAL_PREF policy, filters, max-prefix, RPKI/ASPA and communities.`,
  `<p>Leak path: Provider A → Customer → Provider B. B sees a "customer route" with high LOCAL_PREF and sends traffic to the customer, which cannot carry it.</p>`,
  `<p>"Block the customer\'s session and move on": stops the damage but leaves the missing filters. The next misconfiguration repeats it.</p>`,
  { q: 'Which control directly stops a customer from announcing routes it should not?', options: ['An inbound prefix filter built from the customer\'s registered prefixes (IRR/RPKI)', 'A bigger link', 'Lower MED'], answer: 0, explain: 'Providers should accept only the prefixes a customer is authorised to originate or transit; this is the primary leak control.' },
  [`<p>Recall valley-free: a customer should not pass routes from one provider to another provider.</p>`, `<p>Which AS could have stopped it? The customer (export policy), provider B (import filters), and everyone (ASPA/RPKI).</p>`, `<p>Add immediate mitigation (shut the session, lower the LOCAL_PREF), then permanent controls and a blameless review.</p>`],
  `<p><b>What went wrong.</b> The customer\'s export policy allowed routes learned from a provider to be advertised to another provider (no "only announce my own prefixes" filter). Provider B accepted them because it had no strict import filter or max-prefix limit for this customer and, since the routes came from a customer, assigned a high LOCAL_PREF (customer routes earn money), which overrides AS-path length. The result: traffic that would flow directly now detours through a small network that cannot carry it, causing an outage for victims, often far away.</p>
  <p><b>Immediate response.</b> Provider B shuts the session or sets the leaked routes to a lower preference / drops them with a community; Provider A and the victims contact the NOC; collect evidence from route collectors. <b>Permanent controls.</b> (1) Customer: export filters allowing only owned prefixes; BGP communities to mark learned-from-provider routes and block their export. (2) Provider B: inbound prefix lists generated from IRR/RPKI data per customer; max-prefix limit with restart delay; AS-path filter (customer may only originate its own AS or known downstream cones); ROV drop of invalid; ASPA verification so a route seen from a customer that includes a provider-to-provider hop is rejected; peer-lock style protection at large networks (do not accept a Tier-1 ASN in a path from a small customer). (3) Detection: monitoring and alerting on sudden path changes and traffic shifts. (4) Process: change review, staged rollouts, canary sessions, and MANRS compliance.</p>
  <p>Lesson: BGP trust is local policy; every AS must filter at its edges because one missing filter can affect the whole internet.</p>`,
  `<p>Prefix-list lookups per update are O(log n) with tries; prevention cost is operational discipline, not CPU.</p>`,
  ['How does ASPA detect this leak?', 'Why is RPKI ROV alone not enough for leaks?']);

P('Route QUIC connections through a load balancer that survives migration', 'Hard', ['QUIC', 'load balancer', 'connection ID'], ['Google', 'Meta', 'Cloudflare'],
  `<p>You run a stateless L4 tier in front of QUIC servers. A phone changes IP mid-connection. Why does 5-tuple ECMP/hash break it, and design a routing scheme that keeps the connection on the same server through migration, server drains and LB failures. Consider security and privacy of the connection ID.</p>`,
  `Explain server-ID-in-CID (QUIC-LB), encryption of the CID, retry, and fallbacks.`,
  `<p>CID = encrypt(server_id || random nonce). LB decrypts the first bytes to find the server_id. New 5-tuple, same CID → same server.</p>`,
  `<p>Hash the 5-tuple: the migrated packet gets a different hash, lands on another server that has no matching connection and sends a stateless reset; the user\'s call drops.</p>`,
  { q: 'What information does QUIC-LB put into the connection ID?', options: ['The user\'s password', 'A (possibly encrypted) server identifier so the LB can route by CID', 'The client IP'], answer: 1, explain: 'Servers embed their ID in the CIDs they issue; the LB extracts it from the destination CID to route any packet of the connection.' },
  [`<p>The LB needs something stable across paths: the connection ID. Who chooses it? The server (for packets sent to the server).</p>`, `<p>So the server can encode who it is into the CID; the LB reads it.</p>`, `<p>Encrypt/obfuscate the server ID so observers cannot link flows or learn the topology; rotate CIDs on migration.</p>`],
  `<p>For packets to the server, the destination Connection ID is chosen by the server (it issues CIDs in the handshake and via NEW_CONNECTION_ID frames). So the server can embed a <b>server ID</b> in every CID. The LB parses the destination CID of each packet and routes by the embedded ID (QUIC-LB draft). Plain, obfuscated or encrypted variants exist; the encrypted form uses a small block cipher with a shared key between LB and servers so an observer cannot see the server ID or correlate CIDs, and the LB needs no per-connection state.</p>
  <p>Initial packets from a client use a client-chosen random CID before the server has issued one, so the LB falls back to 5-tuple hashing for those (a client usually sends only a few packets before the server\'s CID arrives); a Retry token can also carry the chosen server ID. After migration the 5-tuple differs but the CID is the same, so the LB sends packets to the same server. When a server is drained, the LB keeps routing by CID until the connections end; new connections no longer get that server. If an LB fails any other LB makes the same decision (stateless, same key). If the server ID is unknown (server dead), the LB can forward to any server that sends a stateless reset, prompting the client to reconnect quickly.</p>
  <p>Security: rotate the CID on migration, give out several CIDs, keep keys rotated, and limit amplification via Retry/address validation. Operationally, configure QUIC-LB parameters consistently across the fleet, and keep a fallback on TCP.</p>`,
  `<p>Routing is O(1) per packet: decrypt a few bytes of the CID; no per-flow LB state.</p>`,
  ['What if a client uses a 0-length CID?', 'How does this interact with anycast PoP shifts?']);

/* =====================================================================
   QUIZ
   ===================================================================== */
quiz.push({ q: 'What exactly does QUIC avoid that TCP suffers from when ONE packet is lost on a connection carrying many requests?', options: ['Cross-stream head-of-line blocking', 'Congestion control', 'All retransmissions'], answer: 0, explain: 'QUIC orders data per stream, so a loss delays only the affected stream; TCP delays every byte behind the hole.' });
quiz.push({ q: 'A phone switches from Wi-Fi to LTE and its IP changes. Why can the QUIC connection continue?', options: ['The server identifies the connection by Connection ID, then validates the new path', 'QUIC copies the IP address', 'The router forwards the old IP'], answer: 0, explain: 'QUIC packets carry a connection ID. After PATH_CHALLENGE/RESPONSE validates the new address, the same connection (keys, streams) continues.' });
quiz.push({ q: 'Why is 0-RTT data dangerous for non-idempotent requests?', options: ['It is unencrypted', 'It can be replayed by an attacker', 'It uses UDP'], answer: 1, explain: '0-RTT data is protected with an old resumption key, so recorded packets can be replayed to the server.' });
quiz.push({ q: 'A router has routes for 203.0.113.0/22 (AS path length 2) and 203.0.113.0/24 (AS path length 5). A packet goes to 203.0.113.9. Which route is used?', options: ['The /22: shorter AS path', 'The /24: longest prefix match', 'Neither: BGP rejects both'], answer: 1, explain: 'Forwarding uses longest prefix match first; AS-path length only compares routes for the same prefix.' });
quiz.push({ q: 'Which BGP attribute is evaluated FIRST in the standard best-path decision (after weight on Cisco)?', options: ['AS_PATH length', 'MED', 'Highest LOCAL_PREF'], answer: 2, explain: 'LOCAL_PREF encodes the operator\'s policy and wins before AS-path length.' });
quiz.push({ q: 'A ROA says (198.51.100.0/22, AS200, maxLength 22). An announcement 198.51.100.0/24 from AS200 is:', options: ['valid', 'invalid, because the length exceeds maxLength', 'not-found'], answer: 1, explain: 'It is covered by the ROA and has the right origin, but 24 > 22, so it does not match: invalid.' });
quiz.push({ q: 'What makes anycast useful for DDoS defence?', options: ['It encrypts all packets', 'Attack traffic is spread across many PoPs by where the bots are', 'It hides the IP address from BGP'], answer: 1, explain: 'Each PoP only absorbs its catchment share of the attack, so aggregate capacity across PoPs protects the service.' });
quiz.push({ q: 'With backend = hash % N, what happens when N changes from 4 to 3?', options: ['Only the removed backend\'s flows move', 'Most flows are remapped, including healthy ones', 'No flows move'], answer: 1, explain: 'The modulus change reshuffles most hash values; roughly three quarters of flows move.' });
quiz.push({ q: 'What is the main benefit of Maglev hashing over a plain hash ring?', options: ['O(1) lookups with very even load and minimal disruption', 'It needs no hashing at all', 'It encrypts connections'], answer: 0, explain: 'Maglev uses a precomputed lookup table: constant-time lookup, near-equal slot counts per backend and small disruption.' });
quiz.push({ q: 'In DSR (Direct Server Return), the response packet:', options: ['Goes back through the load balancer', 'Goes directly from the backend to the client with the VIP as source', 'Is dropped'], answer: 1, explain: 'Backends hold the VIP on loopback and answer the client directly, bypassing the LB for the large response traffic.' });
quiz.push({ q: 'Why does a stateful firewall accept a reply to your outgoing request without an explicit inbound rule?', options: ['It matches an entry in the connection tracking table', 'It trusts source port 443', 'Replies are never filtered'], answer: 0, explain: 'The outgoing packet created a conntrack entry; the reversed 5-tuple matches it as established.' });
quiz.push({ q: 'Which VPN type is most likely to pass through a hotel network that only allows TCP 443?', options: ['IPsec ESP', 'TLS-based VPN on TCP/443', 'GRE tunnel'], answer: 1, explain: 'A TLS VPN looks like ordinary HTTPS; ESP and GRE are different IP protocols and often blocked.' });
quiz.push({ q: 'How do SYN cookies protect a server during a SYN flood?', options: ['They encode connection state in the SYN-ACK sequence number so no memory is allocated until the final ACK validates', 'They drop all SYNs', 'They increase the SYN queue indefinitely'], answer: 0, explain: 'The server stays stateless until the client proves it received the SYN-ACK; spoofed sources never complete.' });
quiz.push({ q: 'Which attack is mitigated mainly by BCP38 (source address validation) in networks?', options: ['Reflection and amplification attacks using spoofed sources', 'SQL injection', 'Slowloris'], answer: 0, explain: 'Reflection attacks need spoofed source addresses; ingress filtering stops spoofed packets leaving their network.' });

/* =====================================================================
   INTERVIEW
   ===================================================================== */
interview.push({ q: 'Why does QUIC survive a Wi-Fi to LTE switch while TCP does not?', level: 'I', a: `<p>TCP identifies a connection by the 4-tuple (src IP, src port, dst IP, dst port). When the phone moves to LTE, its source IP changes, so the server sees a different, unknown tuple and the old connection is dead; the app must reconnect with a new TCP + TLS handshake.</p><p>QUIC identifies a connection by a <b>Connection ID</b> carried in every packet. When packets with a known CID arrive from a new address, the server runs <b>path validation</b> (PATH_CHALLENGE / PATH_RESPONSE) to prove the client owns the address, then continues with the same keys and streams, resetting congestion control for the new path. The client also switches to a fresh CID so observers cannot link the two networks. Caveat: load balancers must route by CID, not by 5-tuple, or migration breaks.</p>`, followUps: ['What stops an attacker from redirecting a connection to a victim\'s address?', 'What happens to the congestion window after migration?'] });
interview.push({ q: 'What is head-of-line blocking and how does QUIC address it?', level: 'B', a: `<p>Head-of-line (HOL) blocking is when one stalled item holds up everything queued behind it. In TCP, the application gets one ordered byte stream; a lost packet creates a hole, and later data (even for unrelated requests multiplexed over HTTP/2) waits in the receive buffer until the retransmission arrives.</p><p>QUIC runs many independent streams in one connection and orders data per stream. A lost packet only delays the stream(s) whose data it carried; other streams are delivered immediately. Blocking still exists within a single stream. Loss recovery uses new packet numbers for retransmissions, ACK ranges and PTO timers, with pluggable congestion control in user space.</p>`, followUps: ['Does HTTP/3 help on a perfectly clean network?', 'How does packet-number-space separation help loss recovery?'] });
interview.push({ q: 'Explain 0-RTT in QUIC/TLS 1.3 and its security trade-offs.', level: 'A', a: `<p>On resumption the client uses a pre-shared key from an earlier session to encrypt application data in its very first flight, so the request travels with the handshake and the first response needs only one RTT. Risks: (1) <b>replay</b>: an attacker can resend the recorded first flight, so the server may process the request twice; (2) no forward secrecy for the early data (if the ticket key leaks, recorded data can be decrypted); (3) reduced server-authentication freshness.</p><p>Mitigations: accept 0-RTT only for idempotent requests (GET), use single-use tickets or an anti-replay cache shared across the cluster, short ticket lifetimes, return 425 Too Early so the client retries after the full handshake, and make the application treat Early-Data requests as potentially replayed.</p>`, followUps: ['How would a cluster of servers share anti-replay state?', 'Is a replayed GET truly harmless?'] });
interview.push({ q: 'How does BGP choose between multiple announcements for the same prefix?', level: 'I', a: `<p>The router evaluates attributes in order and stops when one decides: (vendor weight), highest LOCAL_PREF (policy: customer &gt; peer &gt; provider), shortest AS_PATH, lowest ORIGIN, lowest MED (compared among routes from the same neighbouring AS), prefer eBGP over iBGP, lowest IGP metric to the next hop (hot potato), then lowest router ID as the final tie-break.</p><p>Remember that this chooses the best route per <b>prefix</b>; forwarding then uses longest-prefix match across all prefixes. Multipath can install several equal-cost routes if configured. Example: a customer route with a long AS path still beats a provider route because LOCAL_PREF comes first.</p>`, followUps: ['Where would you use AS-path prepending?', 'What is hot-potato vs cold-potato routing?'] });
interview.push({ q: 'Explain a BGP prefix hijack and RPKI\'s role in stopping it.', level: 'A', a: `<p>BGP has no built-in proof that an AS owns the prefix it announces. A hijacker announces someone else\'s prefix (or a more specific piece of it); neighbours accept, propagate, and traffic is attracted, because routers prefer the longest prefix. Result: black hole, interception or impersonation (famous cases: Pakistan Telecom / YouTube 2008, Amazon Route 53 / MyEtherWallet 2018).</p><p><b>RPKI</b> adds cryptographically signed ROAs stating which AS may originate a prefix and the max length. Routers doing Route Origin Validation classify each route as valid, invalid or not-found and drop invalid ones. It stops wrong-origin and too-specific hijacks but not forged AS paths or route leaks; ASPA and path validation address those. Also use IRR/prefix filters, max-prefix limits and monitoring.</p>`, followUps: ['Why keep maxLength tight?', 'What is the difference between a leak and a hijack?'] });
interview.push({ q: 'How does anycast route a user to the nearest PoP and what are its weaknesses?', level: 'I', a: `<p>Multiple PoPs announce the same IP prefix via BGP. Every router on the internet keeps the best path (policy, then shortest AS-path), so each user network flows to the BGP-closest announcer. If a PoP fails or withdraws, routes converge to the next best PoP without DNS changes.</p><p>Weaknesses: "nearest" is by BGP topology, not distance, so some users get far PoPs; route changes can move a user mid-connection and break TCP (use short connections, resumable transfers, QUIC CID routing, graceful drains); catchments can be unbalanced; debugging is harder (which PoP served this?). Strengths: low latency, fast failover, DDoS absorption by splitting traffic across PoPs.</p>`, followUps: ['How do you drain a PoP?', 'How would you fix a user in Pune landing in Singapore?'] });
interview.push({ q: 'L4 vs L7 load balancing: when would you pick each, and how are they combined?', level: 'B', a: `<p>L4 balances connections/packets using IP and port, without reading the payload; it is very fast, simple and can use DSR. L7 terminates TLS and reads HTTP, enabling path/host routing, header manipulation, cookies stickiness, retries, rate limiting, canaries and observability, at higher CPU cost and complexity.</p><p>Typical production stack: anycast or ECMP spreads clients across a fleet of L4 balancers (Maglev, Katran, NLB), which spread TCP/QUIC flows across L7 proxies (Envoy, Nginx), which route individual requests to services. Choose L4 for raw TCP/UDP at huge rates (games, databases, first tier); L7 whenever you need application awareness.</p>`, followUps: ['How does HTTP/2 multiplexing affect L7 balancing?', 'How do you do sticky sessions at L4?'] });
interview.push({ q: 'You hash the 5-tuple modulo N to choose a backend. What happens when a backend is removed, and what do you do about it?', level: 'A', a: `<p>Changing N changes <code>h mod N</code> for most hashes: going from 4 to 3 backends moves about 75% of flows, not just the dead backend\'s 25%. Established TCP connections hit a server with no state and reset, caches go cold.</p><p>Use consistent hashing: ring with virtual nodes, rendezvous hashing, or Maglev (a lookup table of prime size filled by per-backend permutations). Only the failed backend\'s flows (about 1/N) need to move; Maglev adds O(1) lookup and near-perfect balance. Add a local flow table so established flows are pinned, version and distribute backend lists so all LBs compute identical tables, and use resilient hashing in the ECMP routers.</p>`, followUps: ['How many vnodes do you need for ±10% balance?', 'What if two LBs have different backend lists?'] });
interview.push({ q: 'What is DSR and when would you use it?', level: 'I', a: `<p>In Direct Server Return the load balancer forwards only the client\'s request to a backend (by rewriting the destination MAC or tunnelling); the backend, which holds the VIP on loopback with ARP suppressed, sends the response straight to the client with the VIP as source. The LB therefore only handles small inbound traffic and avoids being a bottleneck for large outbound flows like video or downloads.</p><p>Limits: L4 only (no TLS termination, no response rewriting), backends need special network config, MTU shrink with tunnels, harder health checking and issues with stateful firewalls on asymmetric paths.</p>`, followUps: ['How do you make DSR work across subnets?', 'How do health checks work in DSR?'] });
interview.push({ q: 'Stateless vs stateful firewall: explain with conntrack, and give the risks of a stateful design.', level: 'I', a: `<p>A stateless filter checks each packet alone against rules (addresses, ports, flags). A stateful firewall keeps a connection tracking table: the first packet of a flow is evaluated against policy (<code>ct state new</code>), and if allowed an entry is created; later packets in both directions match the entry (<code>established</code>) and replies are allowed without opening high ports. Out-of-state packets are <code>invalid</code> and dropped. UDP and ICMP are tracked with pseudo-flows and timeouts.</p><p>Risks: the table is finite (exhausted by SYN floods or NAT-heavy gateways), costs memory and CPU, breaks on asymmetric routing and needs timeout tuning. Mitigate with SYN cookies, larger tables, <code>NOTRACK</code> on edge or high-rate paths, and rate limits.</p>`, followUps: ['Why put "ct state invalid drop" first?', 'How does NAT use conntrack?'] });
interview.push({ q: 'Compare IPsec, WireGuard and TLS VPNs. Which would you choose for what?', level: 'I', a: `<p><b>IPsec (IKEv2 + ESP)</b>: standards-based, supported by all vendors, great for site-to-site; complex, large option space, needs UDP 500/4500 or ESP. <b>WireGuard</b>: tiny codebase, fixed modern crypto (Noise, Curve25519, ChaCha20-Poly1305), fast in-kernel, roaming-friendly, simple peer model (AllowedIPs = routing + ACL), but no user management or dynamic negotiation. <b>TLS VPN</b> (OpenVPN, SSL VPN portals): works through restrictive firewalls as HTTPS, flexible authentication, but slower in user space and often a big attack surface in appliances.</p><p>Choose IPsec for vendor interop and cloud gateways, WireGuard for modern remote access and mesh networks, TLS VPN for hostile networks or clientless access; consider zero-trust access instead of full network VPN.</p>`, followUps: ['Why does MTU matter in tunnels?', 'What is forward secrecy in a VPN?'] });
interview.push({ q: 'Design a layered DDoS defense for a public website.', level: 'E', a: `<p>Classify attacks: volumetric (bandwidth), protocol/state (SYN floods, conntrack), application (HTTP floods). Layers: (1) CDN/anycast network with huge capacity so volumetric attacks are absorbed and split across PoPs; (2) scrubbing for what slips through, using stateless filters and signatures, with BGP/DNS diversion on demand; (3) edge LB/firewall with SYN cookies, per-source connection limits, XDP drops; (4) L7: cache, WAF, per-client rate limiting, bot detection and challenges, protection of expensive endpoints; (5) origin lockdown (accept traffic only from the CDN), autoscaling with caps, graceful degradation and load shedding.</p><p>Operations: baselines and alerts, automatic mitigation with manual override, runbooks, ISP contacts, RTBH/FlowSpec as last resort, DNS redundancy, regular game days. Anticipate false positives and flash crowds. Everything defensive; test only on systems you own.</p>`, followUps: ['How do you distinguish a flash crowd from an attack?', 'What is the weakness of IP blocklists against residential botnets?'] });
interview.push({ q: 'What are reflection and amplification attacks and how do defenders reduce them?', level: 'A', a: `<p>The attacker sends small requests with a <b>spoofed source address</b> (the victim) to servers that answer with much larger responses (DNS, NTP, memcached, CLDAP). The victim receives the amplified flood of unsolicited responses. Amplification factor = response bytes / request bytes (DNS ~30-50x, memcached up to tens of thousands).</p><p>Defences: ingress/egress source filtering (BCP38, uRPF) so spoofed packets are dropped near the source; do not run open resolvers or UDP services without need, rate-limit responses (RRL), require address validation (QUIC Retry, DNS cookies, TCP); at the victim, drop unsolicited UDP responses at the edge, use anycast and scrubbing capacity, and coordinate with upstream providers (FlowSpec).</p>`, followUps: ['Why does QUIC limit server responses to 3x before address validation?', 'What does the TCP three-way handshake do for spoofing?'] });

registerModule({
  id: 'cs14',
  title: 'Advanced Networking: QUIC, BGP, Load Balancing & Security',
  lang: 'cpp',
  intro: `<p>This module takes you from "I know TCP and DNS" to the networking questions asked in senior infrastructure interviews: how <b>QUIC</b> keeps your call alive when you leave Wi-Fi, how the internet agrees on routes with <b>BGP</b> (and how <b>hijacks</b> and <b>RPKI</b> fit in), how <b>anycast</b> sends you to the nearest data center, how <b>load balancers</b> pick a backend and survive failures (<b>ECMP</b>, consistent hashing, Maglev, DSR), how <b>firewalls</b> track connections, how <b>VPNs</b> wrap packets, and how to design a <b>layered DDoS defence</b>. Every topic starts with an everyday analogy, has an animated visualizer, runnable simulations, and interview practice. All security content is defensive.</p>`,
  goals: [
    'Explain why QUIC avoids cross-stream head-of-line blocking, how connection IDs enable migration, and the 0-RTT replay trade-off',
    'Run the BGP best-path algorithm by hand, explain a prefix hijack and what RPKI/ROV does and does not stop',
    'Describe how anycast steers users to the nearest PoP, how it fails over and what it does to TCP connections',
    'Compare L4/L7 load balancers and compute which backend ECMP hashing picks, and how many flows move when a backend is removed (naive vs consistent vs Maglev)',
    'Write stateful firewall rules with conntrack for a web server and reason about rule order and default deny',
    'Choose between IPsec, WireGuard and TLS VPNs, and design a layered DDoS defence (volumetric, protocol, application)'
  ],
  prereqs: `Earlier CS Core networking modules (TCP/IP, TCP handshake and congestion control, DNS, HTTP and TLS basics) and the OS modules on sockets and kernel networking. Basic Python helps for the runnable simulations.`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
