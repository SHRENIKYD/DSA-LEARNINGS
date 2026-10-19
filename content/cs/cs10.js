(function () { var topics = [], practice = [], quiz = [], interview = [];

topics.push({
  title: 'Why Layers? OSI 7 Layers vs TCP/IP 4 Layers',
  analogy: `<p>Think of the <b>postal system</b>. You write a letter (your message). You do not care which truck, plane or sorting machine carries it. The post office does not care what is <i>inside</i> the envelope. Each job is separate: <b>writer</b> → <b>envelope with address</b> → <b>sorting centre</b> → <b>truck on the road</b>. Computer networks do the same thing with <b>layers</b>: each layer does one small job and only talks to the layer above and below it.</p>`,
  explain: `<p>Sending data across the world is too big a job for one program. So we cut it into <b>layers</b>. Each layer offers a simple service to the layer above and uses the service of the layer below. Why is this good?</p>
<ul><li><b>Swap one part without breaking others.</b> Wi-Fi to cable? Only the bottom layer changes. Your browser does not care.</li><li><b>Easier to learn and debug.</b> "The cable is fine, the IP is wrong" — you know where to look.</li><li><b>Different teams, one standard.</b> Intel builds the network card, Microsoft the OS, Google the website — they all agree on the layer rules.</li></ul>
<p>There are two famous "maps" of the layers. <b>OSI</b> has 7 layers (a teaching model). <b>TCP/IP</b> has 4 layers (what the Internet really uses).</p>
${H.table(['#', 'OSI layer', 'Job in one line', 'PDU', 'Real examples'], [
['7', 'Application', 'What the user program speaks', 'Data', 'HTTP, DNS, SMTP, SSH'],
['6', 'Presentation', 'Format, encrypt, compress', 'Data', 'TLS, JPEG, UTF-8'],
['5', 'Session', 'Open / keep / close a conversation', 'Data', 'RPC, NetBIOS, TLS session'],
['4', 'Transport', 'Process-to-process delivery (ports)', 'Segment / Datagram', 'TCP, UDP, QUIC'],
['3', 'Network', 'Host-to-host across networks (IP)', 'Packet', 'IP, ICMP, routers'],
['2', 'Data Link', 'Next device on same network (MAC)', 'Frame', 'Ethernet, Wi-Fi, ARP, switches'],
['1', 'Physical', 'Bits as signals', 'Bits', 'Cable, fibre, radio, hubs']])}
<p><b>TCP/IP 4 layers</b> squeeze these: <b>Application</b> (OSI 5+6+7) · <b>Transport</b> (4) · <b>Internet</b> (3) · <b>Network Access / Link</b> (1+2). Easy trick to remember OSI from the top: <b>A</b>ll <b>P</b>eople <b>S</b>eem <b>T</b>o <b>N</b>eed <b>D</b>ata <b>P</b>rocessing.</p>
<p>Key idea: <span class="c-b">layer N on the sender talks to layer N on the receiver</span> (a "peer"), but physically the data goes down the stack, across the wire, and up the other stack.</p>`,
  clues: ['"Which layer does X operate at?" → decide: bits, MAC, IP, port, or app data', '"Router vs switch" → layer 3 vs layer 2', '"Why did the Internet choose TCP/IP over OSI?" → TCP/IP was working and free first', '"HTTPS is at which layer?" → trick question: HTTP is L7, TLS sits around L5/6', '"Troubleshoot bottom-up" → check cable (L1), then link (L2), IP (L3), port (L4), app (L7)'],
  code: [{ lang: 'python', run: true, title: 'Layer classifier quiz (runnable)', code: `# A tiny quiz: which layer does each protocol / device live at?
ANSWERS = {
    "HTTP": (7, "Application"), "DNS": (7, "Application"), "SMTP": (7, "Application"),
    "SSH": (7, "Application"), "TLS": (6, "Presentation (roughly)"),
    "TCP": (4, "Transport"), "UDP": (4, "Transport"),
    "IP": (3, "Network"), "ICMP": (3, "Network"), "Router": (3, "Network"),
    "Ethernet": (2, "Data Link"), "ARP": (2, "Data Link (bridges L2/L3)"),
    "Switch": (2, "Data Link"), "Hub": (1, "Physical"), "Fibre cable": (1, "Physical"),
}
TCPIP = {7: "Application", 6: "Application", 5: "Application", 4: "Transport",
         3: "Internet", 2: "Link", 1: "Link"}

def classify(name):
    layer, label = ANSWERS[name]
    return layer, label, TCPIP[layer]

# the "student" answers - one is deliberately wrong
student = {"HTTP": 7, "TCP": 4, "IP": 3, "Switch": 3, "Hub": 1, "ARP": 2}
score = 0
for item, guess in student.items():
    layer, label, tcpip = classify(item)
    ok = guess == layer
    score += ok
    print(f"{item:8} guess=L{guess} real=L{layer} ({label}) -> TCP/IP: {tcpip:11} {'OK' if ok else 'WRONG'}")
print(f"Score: {score}/{len(student)}")
print("All 15 items by layer:")
for L in range(7, 0, -1):
    names = [n for n, (l, _) in ANSWERS.items() if l == L]
    print(f"  L{L}: {', '.join(names) if names else '-'}")
` }],
  codeTitle: ['Layer classifier'],
  viz: {
    title: 'OSI vs TCP/IP side by side — where does a protocol sit?',
    input: 'HTTP, TCP, IP, Ethernet, Switch',
    inputLabel: 'Protocols/devices (comma separated, from: HTTP DNS SSH TLS TCP UDP IP ICMP Router Ethernet ARP Switch Hub)',
    gen: function (input) {
      var map = { http: 0, dns: 0, ssh: 0, smtp: 0, tls: 1, tcp: 3, udp: 3, ip: 4, icmp: 4, router: 4, ethernet: 5, arp: 5, switch: 5, hub: 6 };
      var rows = [['7 Application', 'Application', 'HTTP, DNS, SSH'], ['6 Presentation', 'Application', 'TLS, UTF-8'], ['5 Session', 'Application', 'RPC, sessions'], ['4 Transport', 'Transport', 'TCP, UDP'], ['3 Network', 'Internet', 'IP, ICMP, Router'], ['2 Data Link', 'Link', 'Ethernet, ARP, Switch'], ['1 Physical', 'Link', 'Cable, Hub, radio']];
      var items = String(input).split(/[,\s]+/).filter(function (s) { return s; }).slice(0, 8);
      if (!items.length) throw new Error('Type a few names like: HTTP, TCP, IP, Switch');
      var frames = [{ narr: 'Two maps of the same road. <b>OSI</b> has 7 layers (left), <b>TCP/IP</b> groups them into 4 (middle). Real protocols sit in the right column.', parts: [{ type: 'table', label: 'OSI vs TCP/IP', columns: ['OSI layer', 'TCP/IP layer', 'Examples'], rows: rows }] }];
      items.forEach(function (it) {
        var k = it.toLowerCase();
        if (!(k in map)) throw new Error('Unknown name: ' + it + '. Try HTTP DNS SSH TLS TCP UDP IP ICMP Router Ethernet ARP Switch Hub');
        var h = {}; h[map[k]] = 'cur';
        frames.push({ narr: '<b>' + H.esc(it) + '</b> lives at <b>' + rows[map[k]][0] + '</b> in OSI, which is the <b>' + rows[map[k]][1] + '</b> layer in TCP/IP.', parts: [{ type: 'table', label: 'Where is ' + it + '?', columns: ['OSI layer', 'TCP/IP layer', 'Examples'], rows: rows, hl: h }] });
      });
      return frames;
    }
  },
  examples: [
    { title: 'HTTPS: which layer?', html: `<p>HTTP is <b>L7</b>. TLS encrypts it and is usually drawn at <b>L5/L6</b> (it really runs on top of TCP). TCP is <b>L4</b>. People saying "HTTPS is layer 7" are fine in interviews; saying "it spans 7, 6 and 4" shows depth.</p>` },
    { title: 'ARP: the awkward one', html: `<p>ARP maps an IP address to a MAC address. It needs IP (L3) knowledge but is carried directly inside an Ethernet frame (L2). Most books file it as <b>L2</b>; some say "L2.5". Say both and explain why.</p>` },
    { title: 'Layer-3 switch', html: `<p>A "L3 switch" is a switch that can also route between VLANs in hardware. It shows that devices are not always locked to one layer — the layer is the <i>highest header the device reads</i>.</p>` }
  ],
  deepDive: `<p><b>Why TCP/IP won:</b> OSI was designed by a committee (ISO) <i>before</i> running code; TCP/IP grew from working ARPANET software and was shipped free in BSD Unix. OSI survives as a <b>vocabulary</b>: engineers still say "layer 2 problem" or "layer 7 load balancer".</p>
<p><b>Layers leak.</b> Pure layering is a lie in practice: TCP checksums include IP addresses (a "pseudo-header"), NAT rewrites L3 and L4 together, and QUIC rebuilds reliability <i>on top of UDP</i> in user space so it can ship faster than OS updates. Middleboxes (firewalls, load balancers) peek at higher layers than their "official" one. The good rule: <i>a layer should only depend on the service below, but real products cheat for speed.</i></p>
<p><b>Peer-to-peer view:</b> layer N headers are only read by layer N on the other side (or by a middlebox of that layer). The switch never reads TCP ports; the router never reads HTTP.</p>`,
  aiEra: `<p><b>What AI changes:</b> Assistants can instantly explain any packet capture or error ("connection reset" = L4 RST). <b>Use AI as a partner:</b> paste a <code>tcpdump</code> line and ask "which layer is each field from? explain like I'm new". <b>Where AI goes wrong:</b> it may claim "HTTPS = TLS 1.3 = layer 6" with full confidence, or mix up router/switch layers when a product marketing page says "smart switch". <b>What you must still own:</b> the mental model — which layer a symptom belongs to — because that tells you which questions to ask the AI. Also remember AI agents calling APIs still ride on this exact stack: an agent's "tool call failed" is often a DNS (L7), TLS (L6) or TCP (L4) problem.</p>`,
  problems: [{
    title: 'Place 15 protocols and devices in the right layer', level: 'Easy', tags: ['osi', 'layers'],
    statement: `<p>Put each into its OSI layer: HTTP, DNS, SMTP, SSH, TLS, TCP, UDP, IP, ICMP, Router, Ethernet, ARP, Switch, Hub, Fibre cable.</p>`,
    constraints: `Use OSI layer numbers 1–7. Mention the TCP/IP layer too.`,
    example: `<p>HTTP → ${H.c('g', 'L7 Application')} (TCP/IP: Application). Switch → ${H.c('b', 'L2 Data Link')}.</p>`,
    brute: { why: `<p>Memorising a list with no logic fails the moment a new protocol appears. Instead ask: <i>what is the biggest header this thing reads?</i></p>` },
    mcq: { q: 'A device reads only MAC addresses to forward frames. Which layer?', options: ['L1', 'L2', 'L3', 'L4'], answer: 1, explain: 'MAC addresses are Data Link (L2) addresses.' },
    hints: [`<p>Ask: does it deal with bits, MACs, IPs, ports or application messages?</p>`, `<p>Devices go by the highest header they read.</p>`, `<p>Recipe: L7 HTTP DNS SMTP SSH; L6 TLS; L4 TCP UDP; L3 IP ICMP Router; L2 Ethernet ARP Switch; L1 Hub Fibre.</p>`],
    solution: {
      approach: `<p>Sort by what is read: application messages (L7) = HTTP, DNS, SMTP, SSH. Encryption/format (L6) = TLS. Ports and delivery to a process (L4) = TCP, UDP. IP addresses (L3) = IP, ICMP, Router. MAC addresses (L2) = Ethernet, ARP, Switch. Raw signals (L1) = Hub (just repeats bits), Fibre. TCP/IP mapping: L5–7 → Application, L4 → Transport, L3 → Internet, L1–2 → Link.</p>`,
      dry: { head: ['Item', 'Reads/uses', 'OSI', 'TCP/IP'], rows: [['HTTP', 'web messages', 'L7', 'Application'], ['TCP', 'ports, sequence', 'L4', 'Transport'], ['Router', 'IP address', 'L3', 'Internet'], ['Switch', 'MAC address', 'L2', 'Link'], ['Hub', 'nothing, repeats bits', 'L1', 'Link']] },
      complexity: `<p>Not an algorithm — O(1) recall once the rule "highest header read" is clear.</p>`,
      followUps: ['Where would a firewall that filters on ports sit?', 'Where does a load balancer that routes by URL sit?']
    }
  }]
});

topics.push({
  title: 'Encapsulation & Decapsulation: Headers Added at Each Layer',
  analogy: `<p>Mailing a gift: you put the <b>gift</b> in a <b>box</b> (with a note), put the box in an <b>envelope</b> with the street address, and the courier puts the envelope in a <b>truck bag</b> with a route tag. The receiver does the reverse: open the bag, open the envelope, open the box. Each wrapper is a <b>header</b>; wrapping is <b>encapsulation</b>, unwrapping is <b>decapsulation</b>.</p>`,
  explain: `<p>When your browser sends <code>GET /</code>, each layer <b>adds its own header</b> in front (Ethernet also adds a small trailer at the end). The name of the chunk changes at each layer (the <b>PDU</b>, protocol data unit):</p>
${H.table(['Layer', 'Name of chunk', 'Header added', 'Size (typical)', 'What the header holds'], [
['Application', 'Data / message', 'HTTP headers', 'varies', 'method, URL, cookies'],
['Transport', '<b>Segment</b> (TCP) / datagram (UDP)', 'TCP header', '20 bytes (UDP: 8)', 'src port, dst port, seq no, flags'],
['Network', '<b>Packet</b>', 'IPv4 header', '20 bytes (IPv6: 40)', 'src IP, dst IP, TTL, protocol'],
['Data Link', '<b>Frame</b>', 'Ethernet header + FCS trailer', '14 + 4 bytes', 'dst MAC, src MAC, type, CRC check'],
['Physical', 'Bits', '(preamble 8 B on the wire)', '-', 'electrical / light / radio signal']])}
<p><b>Worked example</b> — a 1000-byte payload over TCP / IPv4 / Ethernet:</p>
<ul><li>1000 data + 20 TCP = <b>1020</b> (segment)</li><li>+ 20 IPv4 = <b>1040</b> (packet)</li><li>+ 14 Ethernet header + 4 FCS = <b>1058</b> bytes (frame)</li></ul>
<p>Overhead = 58 bytes, so useful share = 1000 / 1058 = <span class="c-g">94.5%</span>. With the wire extras (8 preamble + 12 inter-frame gap) it is 1078 bytes → 92.8%.</p>
<p>The receiver does <b>decapsulation</b>: the NIC checks the FCS and the MAC → the OS removes the Ethernet header, reads the IP header → removes it, reads the TCP header (port → which program) → hands the payload to the app.</p>
<p><b>MTU</b> (maximum transmission unit) on Ethernet is <b>1500 bytes</b> of IP packet. So TCP's max segment payload (<b>MSS</b>) is 1500 − 20 − 20 = <b>1460</b>. A bigger message is cut into several segments.</p>`,
  clues: ['"What happens when you type a URL?" → encapsulation down the stack', '"Header overhead for N bytes" → add TCP 20 + IP 20 + Eth 14 + 4', '"Segment vs packet vs frame" → L4 vs L3 vs L2 names', '"MTU 1500 / MSS 1460" → splitting large data', '"Which header changes hop by hop?" → Ethernet changes, IP stays (except TTL)'],
  code: [{ lang: 'python', run: true, title: 'Encapsulation simulator (runnable)', code: `# Wrap a payload with TCP, IPv4 and Ethernet headers and print sizes.
import struct

def tcp_header(sport, dport):
    # src port, dst port, seq, ack, offset+flags, window, checksum, urgent  = 20 bytes
    return struct.pack("!HHIIHHHH", sport, dport, 1, 0, (5 << 12) | 0x18, 65535, 0, 0)

def ipv4_header(src, dst, total_len):
    s = bytes(int(x) for x in src.split("."))
    d = bytes(int(x) for x in dst.split("."))
    # ver/ihl, tos, total len, id, flags/frag, ttl, proto(6=TCP), checksum, src, dst = 20 bytes
    return struct.pack("!BBHHHBBH4s4s", 0x45, 0, total_len, 0, 0, 64, 6, 0, s, d)

def eth_header(dst_mac, src_mac):
    mac = lambda m: bytes(int(x, 16) for x in m.split(":"))
    return mac(dst_mac) + mac(src_mac) + struct.pack("!H", 0x0800)  # 0x0800 = IPv4

payload = b"x" * 1000                       # pretend this is HTTP data
segment = tcp_header(52344, 443) + payload
packet = ipv4_header("10.0.1.5", "93.184.216.34", 20 + len(segment)) + segment
fcs = b"\\x00" * 4                           # real NICs compute a CRC-32 here
frame = eth_header("aa:bb:cc:00:00:01", "de:ad:be:ef:00:01") + packet + fcs

print("payload :", len(payload), "bytes")
print("segment :", len(segment), "bytes  (+20 TCP)")
print("packet  :", len(packet), "bytes  (+20 IPv4)")
print("frame   :", len(frame), "bytes  (+14 Ethernet header +4 FCS)")
overhead = len(frame) - len(payload)
print("overhead:", overhead, "bytes ->", round(100 * len(payload) / len(frame), 1), "% useful")

# Decapsulation: peel headers off in reverse order
eth_dst = frame[:6].hex(":"); body = frame[14:-4]
ihl = (body[0] & 0x0F) * 4; ip_dst = ".".join(str(b) for b in body[16:20])
sport, dport = struct.unpack("!HH", body[ihl:ihl + 4])
print("receiver sees: MAC", eth_dst, "-> IP", ip_dst, "-> port", dport, "(from", sport, ")")
` }],
  codeTitle: ['Encapsulation simulator'],
  viz: {
    title: 'Encapsulation: wrapping a payload layer by layer (and unwrapping)',
    input: '1000',
    inputLabel: 'Payload size in bytes (1 to 1460)',
    gen: function (input) {
      var n = parseInt(input, 10);
      if (isNaN(n) || n < 1 || n > 1460) throw new Error('Enter a payload size between 1 and 1460 bytes');
      var frames = [], items = ['App data ' + n + ' B'];
      function f(narr, hl, total) { frames.push({ narr: narr, parts: [{ type: 'stack', label: 'Bottom = data, top = outermost wrapper', items: items.slice(), hl: hl }, { type: 'vars', vals: { 'size so far': total + ' B' } }] }); }
      f('The browser hands <b>' + n + ' bytes</b> of data (e.g. an HTTP request) to the transport layer.', { 0: 'cur' }, n);
      items.push('TCP hdr 20 B'); f('<b>Transport layer</b> adds a TCP header (ports, sequence number). Data + TCP header is a <b>segment</b>.', { 1: 'cur' }, n + 20);
      items.push('IPv4 hdr 20 B'); f('<b>Network layer</b> adds an IP header (source and destination IP). Now it is a <b>packet</b>.', { 2: 'cur' }, n + 40);
      items.push('Ethernet hdr 14 B + FCS 4 B'); f('<b>Data link layer</b> adds an Ethernet header (MACs) on the front and a 4-byte FCS check at the end. Now it is a <b>frame</b> of <b>' + (n + 58) + ' bytes</b>.', { 3: 'cur' }, n + 58);
      f('The frame is sent as <b>bits</b> on the wire. The receiver starts at the outside: <b>decapsulation</b>.', { 3: 'sel' }, n + 58);
      items.pop(); f('Receiver NIC checks MAC + FCS, strips the <b>Ethernet</b> header.', { 2: 'cur' }, n + 40);
      items.pop(); f('IP layer checks the destination IP is me, strips the <b>IP</b> header.', { 1: 'cur' }, n + 20);
      items.pop(); f('TCP reads the port, strips its header, and gives <b>' + n + ' bytes</b> to the right program. Overhead was ' + 58 + ' B = ' + (100 * n / (n + 58)).toFixed(1) + '% useful.', { 0: 'ok' }, n);
      return frames;
    }
  },
  examples: [
    { title: 'Tiny payload: a 1-byte keypress over SSH', html: `<p>1 + 20 + 20 + 14 + 4 = 59 bytes on the frame (Ethernet pads to a 64-byte minimum with FCS). Useful share is about <span class="c-r">1.6%</span> — small packets are mostly headers!</p>` },
    { title: 'UDP/IPv6 instead', html: `<p>1000 B + 8 (UDP) + 40 (IPv6) + 14 + 4 = <b>1066</b> bytes. UDP header is tiny, IPv6 header is bigger but simpler.</p>` },
    { title: 'Big file: 4000 B at MSS 1460', html: `<p>4000 / 1460 → <b>3 segments</b> (1460 + 1460 + 1080). Each pays 58 bytes of overhead → 174 B total, so 4174 bytes on the wire.</p>` }
  ],
  deepDive: `<p><b>Why a trailer at L2 only?</b> Ethernet's FCS is a CRC-32 over the whole frame, computed by the NIC hardware while the frame streams out, so it is most natural to put it at the end. Layers 3 and 4 use checksums in the header (TCP/UDP checksums cover a pseudo-header with the IP addresses).</p>
<p><b>Hop-by-hop vs end-to-end.</b> The Ethernet header is <i>rewritten at every router</i> (new source/destination MAC), but the IP header stays the same except TTL (minus 1) and the checksum. TCP ports are untouched unless NAT rewrites them.</p>
<p><b>Real-life extras:</b> VLAN tag (+4 B), PPPoE (+8 B), VPN/tunnel headers (IPsec, WireGuard, VXLAN +50 B) shrink the usable MSS; if you forget this you get mysterious "big packets hang, small ones work" bugs (MTU black holes, fixed by Path MTU discovery). Jumbo frames (MTU 9000) cut overhead in data centres. NICs use <b>TSO/GSO</b> to let the OS hand a 64 KB chunk and have hardware slice it into frames.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM APIs stream tokens over HTTP/2 or SSE — each tiny token chunk is wrapped in the same TCP/IP/Ethernet headers, so many small events waste bandwidth; batching matters. <b>Use AI as a partner:</b> ask "write a Scapy script that builds Ethernet/IP/TCP layers and prints each size", then compare with your hand math. <b>Where AI goes wrong:</b> it often forgets the 4-byte FCS or the 12-byte inter-frame gap, or mixes "packet" and "frame". <b>What you must still own:</b> the arithmetic (58 bytes of header for TCP/IPv4/Ethernet) and the rule that Ethernet changes per hop while IP does not.</p>`,
  problems: [{
    title: 'Header overhead for a 1000-byte payload', level: 'Easy', tags: ['encapsulation', 'math'],
    statement: `<p>An app sends a 1000-byte payload over TCP / IPv4 / Ethernet (no options, no VLAN). How many bytes are in the Ethernet frame and what percentage is useful data?</p>`,
    constraints: `TCP header 20, IPv4 header 20, Ethernet header 14 + FCS 4. Ignore preamble and gap.`,
    example: `<p>1000 + 20 + 20 + 14 + 4 = ${H.c('g', '1058 bytes')}; 1000 / 1058 ≈ ${H.c('g', '94.5%')}.</p>`,
    brute: { why: `<p>Guessing "about 1000 bytes" ignores that each layer adds its own header; the error matters when you size links for millions of small packets.</p>` },
    mcq: { q: 'Which header is rewritten at every router hop?', options: ['TCP', 'Ethernet', 'HTTP', 'None'], answer: 1, explain: 'A router builds a brand-new Ethernet header (new MACs) for each link.' },
    hints: [`<p>Go layer by layer from the top, one header at a time.</p>`, `<p>Add TCP, then IP, then Ethernet header and trailer.</p>`, `<p>Total = 1000 + 20 + 20 + 14 + 4. Percent = 1000 / total × 100.</p>`],
    solution: {
      approach: `<p>Each layer adds its header: segment = 1000 + 20 = 1020; packet = 1020 + 20 = 1040; frame = 1040 + 14 + 4 = 1058 bytes. Overhead = 58 bytes. Efficiency = 1000 / 1058 = 94.5%. If you also count the 8-byte preamble and 12-byte gap that actually occupy the wire time, it is 1078 bytes and 92.8%.</p>`,
      dry: { head: ['Step', 'Added', 'Running size'], rows: [['Payload', '-', '1000'], ['TCP', '+20', '1020'], ['IPv4', '+20', '1040'], ['Ethernet hdr+FCS', '+18', '1058']] },
      complexity: `<p>O(1) arithmetic: just a few additions and one division.</p>`,
      followUps: ['What if the payload is 10 bytes?', 'What changes with IPv6?']
    }
  }]
});

topics.push({
  title: 'Hub vs Switch vs Router: Collision and Broadcast Domains',
  analogy: `<p>Picture an office. A <b>hub</b> is a person with a megaphone: whatever you tell them, they shout to the whole room. A <b>switch</b> is a smart receptionist who learns where everyone sits and walks each note to the right desk. A <b>router</b> is the front door to the next building: it decides which building (network) a letter should go to next, using street addresses (IPs).</p>`,
  explain: `${H.table(['Device', 'Layer', 'Reads', 'Sends a frame to…', 'Collision domain', 'Broadcast domain'], [
['Hub', 'L1', 'nothing (repeats bits)', 'ALL other ports', 'ONE big shared domain', 'one'],
['Switch', 'L2', 'dest MAC', 'ONE port (if known), else flood', 'one per port', 'one (same VLAN)'],
['Router', 'L3', 'dest IP', 'the next hop', 'one per port', '<b>one per port</b> (it blocks broadcasts)']])}
<p><b>Collision domain</b> = the group of devices whose signals can crash into each other. Old hubs: everybody shares one wire, so two talking at once = collision (CSMA/CD had to retry). A modern full-duplex switch gives every port its own private lane, so no collisions.</p>
<p><b>Broadcast domain</b> = the group that receives a frame sent to <code>ff:ff:ff:ff:ff:ff</code> (e.g. an ARP "who has this IP?"). Switches <i>forward</i> broadcasts to all ports (same domain). Routers <i>stop</i> them. Each VLAN is its own broadcast domain.</p>
<p><b>Why does a switch learn MACs?</b> It is not told where hosts are. Every time a frame arrives, the switch reads the <b>source MAC</b> and writes "this MAC lives on port N" into its <b>MAC address table</b> (CAM table). Later, a frame for that MAC is sent to port N only. Unknown destination? <b>Flood</b> to all ports except the one it came from. Broadcast? Flood too. Entries expire after about 5 minutes if unused (aging).</p>
<p><b>Same broadcast domain?</b> Two hosts are in the same broadcast domain when they are on the same IP subnet/VLAN and joined only by hubs/switches. E.g. 192.168.1.10/24 and 192.168.1.200/24 → same. 192.168.1.10/24 and 192.168.2.10/24 → different (a router is needed).</p>
<p><b>Python MAC-learning switch</b> (below) shows exactly the learn → forward-or-flood loop.</p>`,
  clues: ['"Collision domain" → hub shared, switch per port', '"Broadcast storm / ARP flooding" → too big a broadcast domain, add VLANs/routers', '"Same subnet?" → AND IP with mask, compare', '"Switch table full / MAC flooding attack" → CAM overflow makes a switch act like a hub', '"Which device connects two different networks?" → router'],
  code: [{ lang: 'python', run: true, title: 'Switch MAC-learning table simulation (runnable)', code: `# A learning switch: learn source MAC, forward to known port or flood.
class Switch:
    def __init__(self, ports):
        self.ports = ports          # list of port numbers
        self.table = {}             # MAC -> port  (the CAM table)

    def receive(self, in_port, src, dst):
        self.table[src] = in_port   # LEARN: src lives behind in_port
        if dst == "ff:ff" :         # broadcast -> flood
            out = [p for p in self.ports if p != in_port]
            action = "BROADCAST flood"
        elif dst in self.table:     # known -> forward to one port only
            out = [self.table[dst]]
            action = "forward"
            if out[0] == in_port:   # same segment, nothing to do
                out, action = [], "filter (same port)"
        else:                       # unknown unicast -> flood
            out = [p for p in self.ports if p != in_port]
            action = "unknown -> flood"
        print(f"port{in_port} {src}->{dst}: {action:18} out={out}")

sw = Switch([1, 2, 3, 4])
host_port = {"A": 1, "B": 2, "C": 3, "D": 4}
traffic = [("A", "B"), ("B", "A"), ("C", "A"), ("A", "C"), ("D", "ff:ff"), ("B", "D")]
for s, d in traffic:
    sw.receive(host_port[s], s, d)
print("MAC table:", sw.table)
` }, { lang: 'bash', check: false, title: 'See your own MAC / neighbours / routes (Linux)', code: `ip link show            # your interfaces and their MAC addresses (L2)
ip neigh show           # ARP table: IP -> MAC of neighbours on the LAN
ip route show           # the routing table (L3): default via <gateway>
bridge fdb show         # a Linux bridge's MAC table (software switch)` }],
  codeTitle: ['MAC-learning switch', 'Inspect your network'],
  viz: [{
    title: 'Hub vs Switch: who receives the frame A → C?',
    input: 'switch',
    inputLabel: 'Device in the middle: hub or switch',
    gen: function (input) {
      var mode = String(input).trim().toLowerCase();
      if (mode !== 'hub' && mode !== 'switch') throw new Error('Type hub or switch');
      var nodes = [{ id: 'A', label: 'A', x: 10, y: 12, shape: 'box' }, { id: 'B', label: 'B', x: 10, y: 48, shape: 'box' }, { id: 'X', label: mode.toUpperCase(), x: 48, y: 30, shape: 'box' }, { id: 'C', label: 'C', x: 88, y: 12, shape: 'box' }, { id: 'D', label: 'D', x: 88, y: 48, shape: 'box' }];
      var edges = [['A', 'X'], ['B', 'X'], ['X', 'C'], ['X', 'D']];
      function g(ehl, hl, tags) { return { type: 'graph', height: 60, nodes: nodes, edges: edges, ehl: ehl, hl: hl, tags: tags || {} }; }
      var fr = [];
      fr.push({ narr: 'Four computers on one ' + mode + '. A wants to send a frame to <b>C</b>.', parts: [g({}, { A: 'cur' })] });
      fr.push({ narr: 'A sends the frame into the ' + mode + '.', parts: [g({ 'A-X': 'cur' }, { A: 'cur', X: 'cur' })] });
      if (mode === 'hub') {
        fr.push({ narr: 'A <b>hub</b> does not read anything. It repeats the bits out of <b>every other port</b>: B, C and D all hear it. B and D just ignore it, but it is wasteful, and anyone can sniff it.', parts: [g({ 'A-X': 'ok', 'X-C': 'ok', 'X-D': 'bad', 'B-X': 'bad' }, { X: 'cur', C: 'ok', B: 'bad', D: 'bad' }, { B: 'heard it', D: 'heard it', C: 'target' })] });
        fr.push({ narr: 'While this frame is on the shared wire, nobody else can talk without a <b>collision</b>. All four share ONE collision domain.', parts: [g({ 'A-X': 'bad', 'B-X': 'bad' }, { A: 'bad', B: 'bad' }, { A: 'both send', B: 'both send' })] });
      } else {
        fr.push({ narr: 'The <b>switch</b> reads the destination MAC. It has learned that C is on port 3, so it forwards to <b>C only</b>.', parts: [g({ 'A-X': 'ok', 'X-C': 'ok' }, { X: 'cur', C: 'ok' }, { C: 'port 3' })] });
        fr.push({ narr: 'At the same time B can talk to D on other ports. Each port is its own <b>collision domain</b>, so there are no collisions and total speed is far higher.', parts: [g({ 'A-X': 'ok', 'X-C': 'ok', 'B-X': 'win', 'X-D': 'win' }, { C: 'ok', D: 'ok' }, { D: 'B to D', C: 'A to C' })] });
        fr.push({ narr: 'If the switch did NOT know where C was, it would <b>flood</b> like a hub just once, then learn when C replies.', parts: [g({ 'A-X': 'cur', 'X-C': 'sel', 'X-D': 'sel', 'B-X': 'sel' }, { X: 'sel' }, { X: 'unknown dst' })] });
      }
      return fr;
    }
  }, {
    title: 'Switch learns MACs (CAM table builds up)',
    input: 'A>B, B>A, C>A, A>C, D>*',
    inputLabel: 'Frames as src>dst (hosts A-D on ports 1-4, * = broadcast)',
    gen: function (input) {
      var list = String(input).split(/\s*,\s*/).filter(function (s) { return s; }).slice(0, 10);
      if (!list.length) throw new Error('Use a form like A>B, B>A, C>*');
      var port = { A: 1, B: 2, C: 3, D: 4 }, table = [], fr = [];
      fr.push({ narr: 'Switch just booted: its MAC table is <b>empty</b>. Hosts A,B,C,D plug into ports 1,2,3,4.', parts: [{ type: 'map', label: 'MAC table (MAC → port)', entries: [] }] });
      list.forEach(function (p) {
        var m = p.trim().toUpperCase().split('>');
        if (m.length !== 2 || !(m[0] in port) || (m[1] !== '*' && !(m[1] in port))) throw new Error('Bad frame "' + p + '". Use letters A-D and * for broadcast, e.g. A>B');
        var s = m[0], d = m[1], known = false, i;
        for (i = 0; i < table.length; i++) if (table[i][0] === s) known = true;
        if (!known) table.push([s, 'port ' + port[s]]);
        var hl = {}; hl[s] = known ? 'cur' : 'ok';
        var dknown = false; table.forEach(function (e) { if (e[0] === d) dknown = true; });
        var act = d === '*' ? '<span class="c-y">broadcast → flood</span> to all other ports' : (dknown ? '<span class="c-g">destination known → forward only to port ' + port[d] + '</span>' : '<span class="c-r">destination unknown → flood</span> to all other ports, hoping it answers');
        fr.push({ narr: 'Frame <b>' + s + ' → ' + (d === '*' ? 'everyone' : d) + '</b> arrives on port ' + port[s] + '. ' + (known ? 'Already knew ' + s + '.' : '<b>Learn:</b> ' + s + ' is on port ' + port[s] + '.') + ' Then ' + act + '.', parts: [{ type: 'map', label: 'MAC table (MAC → port)', entries: table.map(function (e) { return e.slice(); }), hl: hl }, { type: 'vars', vals: { 'frame': s + ' → ' + d, 'arrived on': 'port ' + port[s] } }] });
      });
      return fr;
    }
  }],
  examples: [
    { title: 'Same broadcast domain? 192.168.1.10/24 vs 192.168.1.200/24', html: `<p>Mask 255.255.255.0 keeps the first 3 bytes: both are <code>192.168.1</code>. ${H.c('g', 'Same subnet → same broadcast domain')} (if joined by switches). They talk directly with ARP + switch.</p>` },
    { title: 'Different subnets: 192.168.1.10/24 vs 192.168.2.10/24', html: `<p>Network parts differ (1 vs 2). ${H.c('r', 'Different broadcast domains')}: traffic must go through the <b>default gateway (router)</b>.</p>` },
    { title: 'Count the domains: 1 router, 2 switches (one per side), 6 hosts (3 per side)', html: `<p>Broadcast domains = <b>2</b> (one per router port). Collision domains = every cable segment: 6 host links + 2 switch-to-router links = <b>8</b> (full-duplex switches, no hubs).</p>` }
  ],
  deepDive: `<p><b>CAM table internals.</b> A switch keeps the MAC table in fast hardware (CAM / TCAM or a hash table). Size is limited (thousands to hundreds of thousands). A <b>MAC flooding</b> attack fills it with fake MACs, so the switch "fails open" and floods everything — an attacker can sniff. Defences: port security (limit MACs per port), 802.1X, dynamic ARP inspection.</p>
<p><b>Loops and STP.</b> Flooding plus a loop in cabling creates a <b>broadcast storm</b> (frames circle forever; Ethernet has no TTL). The Spanning Tree Protocol blocks redundant links to make a loop-free tree; modern DCs use routed fabrics (L3 leaf-spine) instead.</p>
<p><b>VLANs.</b> One physical switch can carve itself into several broadcast domains using 802.1Q tags (4 bytes, 12-bit VLAN id → 4094 VLANs). Traffic between VLANs must go through a router ("router on a stick" or an L3 switch).</p>
<p><b>Router vs L3 switch.</b> Same idea (look at the IP, pick next hop), different hardware: an L3 switch does lookups in ASICs at line rate; classic routers also do NAT, BGP, firewalling. A home "router" is really router + switch + Wi-Fi AP + NAT + DHCP server in a box.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI training clusters use huge flat, lossless fabrics (RoCE / InfiniBand) where a few switch design choices (buffers, congestion control) decide training speed — network knowledge is suddenly a GPU-cost topic. <b>Use AI as a partner:</b> describe your office topology and ask "how many broadcast and collision domains? show your reasoning", then check it against the rules above. <b>Where AI goes wrong:</b> it often counts the router as one domain, or says "a switch splits broadcast domains" (it does not, VLANs/routers do). <b>What you must still own:</b> the rule "switch splits collision domains, router splits broadcast domains" — it is the most-asked Beginner networking question.</p>`,
  problems: [{
    title: 'Why does a switch learn MAC addresses?', level: 'Easy', tags: ['switch', 'mac'],
    statement: `<p>Explain in plain words how a switch builds its MAC table and what it does with a frame whose destination is not in the table.</p>`,
    constraints: `Cover: learning, forwarding, flooding, aging.`,
    example: `<p>Frame from A (port 1) to B on an empty table → learn ${H.c('g', 'A=port 1')}, B unknown → ${H.c('y', 'flood')}. B replies from port 2 → learn ${H.c('g', 'B=port 2')}. Next A→B goes only to port 2.</p>`,
    brute: { why: `<p>An admin could type every MAC into every switch by hand — impossible at scale and breaks when a laptop moves. Learning makes the switch plug-and-play.</p>` },
    mcq: { q: 'Which part of the frame does the switch read to LEARN?', options: ['Destination MAC', 'Source MAC', 'Source IP', 'TCP port'], answer: 1, explain: 'The source MAC tells it who sent the frame and which port that sender is behind.' },
    hints: [`<p>Think about what the switch can see when a frame arrives on port N.</p>`, `<p>The source MAC + arrival port is a free fact about where that device lives.</p>`, `<p>Recipe: on arrival → save (src MAC, port). Look up dst MAC: found → send out that one port; not found or broadcast → flood to all other ports. Delete entries unused for ~5 min.</p>`],
    solution: {
      approach: `<p>The switch is not configured with host locations, so it discovers them. Whenever a frame arrives on port N it records source MAC → port N (refreshing a timer). It then looks up the destination MAC. If found, it forwards out only that port, so other ports stay free (separate collision domains, more privacy, more speed). If the destination is unknown or is the broadcast address, it floods the frame out of all ports except the arrival port. When the unknown host answers, the switch learns it, so flooding happens only once. Entries age out (about 300 s) so a laptop that moves to another port is found again. If the destination is on the same port as the source, the frame is dropped (filtered).</p>`,
      dry: { head: ['Frame', 'Arrives on', 'Learn', 'Action'], rows: [['A→B', 'port 1', 'A=1', 'B unknown: flood'], ['B→A', 'port 2', 'B=2', 'A known: port 1 only'], ['A→B', 'port 1', 'A=1 (refresh)', 'B known: port 2 only']] },
      complexity: `<p>Lookup is O(1) average in a hash/CAM table; memory is O(number of hosts).</p>`,
      followUps: ['What if two MACs claim the same port?', 'What attack fills the table?']
    }
  }]
});

topics.push({
  title: 'MAC vs IP Addressing: Why We Need Both',
  analogy: `<p>Your <b>name</b> stays the same when you move house, but your <b>home address</b> changes. A <b>MAC address</b> is like a name tattooed on the network card: it identifies the device on the <i>local</i> street. An <b>IP address</b> is like a postal address: it says which neighbourhood (network) you are in, so mail can be routed across the country. A courier uses the full address to find the town, then asks the local street "who is Sam?" for the last metre. That last question is <b>ARP</b>.</p>`,
  explain: `${H.table(['', 'MAC address', 'IP address'], [
['Layer', '2 (Data Link)', '3 (Network)'],
['Size', '48 bits, e.g. <code>de:ad:be:ef:00:01</code>', 'IPv4 32 bits <code>10.0.1.5</code>; IPv6 128 bits'],
['Assigned by', 'Manufacturer (burned in; can be spoofed)', 'Network admin / DHCP (changes by location)'],
['Scope', 'Only the current local link', 'Whole Internet (end to end)'],
['Structure', 'Flat (vendor prefix + serial)', 'Hierarchical (network part + host part)'],
['Changes per hop?', '<span class="c-r">YES</span>, rewritten at every router', '<span class="c-g">NO</span> (except NAT)']])}
<p><b>Why both?</b> MACs are flat and random, so you cannot "route" them: a router would need an entry for each of billions of devices. IPs are hierarchical, so a router keeps one entry like <code>10.0.2.0/24 → send to R2</code> for a whole network. But the final delivery on a LAN still needs a hardware address, because the wire only understands the NIC. So: <b>IP = where to go (end to end), MAC = who is next (hop by hop).</b></p>
<p><b>ARP</b> bridges them: host asks everyone "who has 10.0.1.1?" (broadcast), the owner replies with its MAC, and the answer is cached.</p>
<p><b>One packet, many frames.</b> From H1 (10.0.1.5) to H2 (10.0.2.9) via router R: IP src/dst stays 10.0.1.5 → 10.0.2.9 all the way. The frame is addressed to <b>R's MAC</b> on the first leg (H1 sends to its gateway), then R makes a <b>new frame</b> with R's other-side MAC as source and H2's MAC as destination.</p>`,
  clues: ['"What changes at each hop?" → MAC addresses (and TTL)', '"Why not use only MAC?" → flat, cannot aggregate, tied to hardware', '"Why not only IP?" → the link layer needs a hardware address', '"ARP / who-has" → IP→MAC resolution on the same LAN', '"Default gateway" → host sends non-local traffic to the router\'s MAC'],
  code: [{ lang: 'bash', check: false, title: 'Watch addresses on a real machine', code: `ip addr show eth0        # IP address + MAC (link/ether) of this interface
ip neigh show            # ARP cache: which MAC answered for which IP
ping -c 3 10.0.2.9       # ICMP echo: checks L3 reachability
traceroute 10.0.2.9      # each router hop (IP changes? no, TTL does)
arp -n                   # older tool, same ARP table` }],
  codeTitle: ['Inspect addresses'],
  viz: {
    title: 'A packet hops host → switch → router → switch → host (watch MAC change, IP stay)',
    input: '',
    inputLabel: '(no input needed — press Next)',
    gen: function () {
      var nodes = [{ id: 'H1', label: 'H1 10.0.1.5', x: 8, y: 30, shape: 'box', w: 16 }, { id: 'S1', label: 'Switch 1', x: 30, y: 30, shape: 'box' }, { id: 'R', label: 'Router', x: 52, y: 30, shape: 'box' }, { id: 'S2', label: 'Switch 2', x: 72, y: 30, shape: 'box' }, { id: 'H2', label: 'H2 10.0.2.9', x: 92, y: 30, shape: 'box', w: 16 }];
      var edges = [['H1', 'S1'], ['S1', 'R'], ['R', 'S2'], ['S2', 'H2']];
      function fr(narr, e, hl, v, vh) { return { narr: narr, parts: [{ type: 'graph', height: 60, nodes: nodes, edges: edges, ehl: e, hl: hl }, { type: 'vars', label: 'Headers on this link', vals: v, hl: vh || {} }] }; }
      var ip = { 'src IP': '10.0.1.5', 'dst IP': '10.0.2.9' };
      function v(sm, dm, ttl) { var o = { 'src MAC': sm, 'dst MAC': dm }; o['src IP'] = ip['src IP']; o['dst IP'] = ip['dst IP']; o['TTL'] = ttl; return o; }
      return [
        { narr: 'H1 (10.0.1.5) wants to reach H2 (10.0.2.9) on a <b>different network</b>. H1 sees that it is not local, so it must send to its <b>default gateway</b> (the router).', parts: [{ type: 'graph', height: 60, nodes: nodes, edges: edges, hl: { H1: 'cur' } }, { type: 'vars', vals: { 'H1 asks ARP': 'who has 10.0.1.1 (gateway)?', 'answer': 'router MAC 00:aa:r1' } }] },
        fr('H1 builds a frame: dst MAC = <b>router left port</b> (not H2!), dst IP = H2.', { 'H1-S1': 'cur' }, { H1: 'cur' }, v('00:aa:h1', '00:aa:r1', 64), { 'dst MAC': 'cur' }),
        fr('The <b>switch</b> reads only the MAC, forwards the frame out the port where it learned 00:aa:r1. Nothing in the frame changes.', { 'S1-R': 'cur' }, { S1: 'cur' }, v('00:aa:h1', '00:aa:r1', 64)),
        fr('The <b>router</b> accepts the frame (it is for its MAC), removes the Ethernet header, reads the <b>IP</b>, looks up its routing table: 10.0.2.0/24 is on the right port. It lowers TTL by 1 and builds a <b>new frame</b>.', { 'S1-R': 'ok' }, { R: 'cur' }, v('00:aa:h1', '00:aa:r1', 64), { 'src MAC': 'bad', 'dst MAC': 'bad' }),
        fr('New frame leaves the right port: src MAC = router right port, dst MAC = <b>H2</b> (found by ARP on that side). <b>IPs unchanged</b>, TTL 63.', { 'R-S2': 'cur' }, { R: 'ok' }, v('00:bb:r2', '00:bb:h2', 63), { 'src MAC': 'ok', 'dst MAC': 'ok', 'TTL': 'cur' }),
        fr('Switch 2 forwards by MAC to the port of H2.', { 'S2-H2': 'cur' }, { S2: 'cur' }, v('00:bb:r2', '00:bb:h2', 63)),
        fr('H2 gets the frame: MAC matches, IP matches, TCP port picks the program. <b>MACs changed twice, the IPs never did</b> — that is why we need both.', { 'S2-H2': 'ok' }, { H2: 'ok' }, v('00:bb:r2', '00:bb:h2', 63), { 'src IP': 'ok', 'dst IP': 'ok' })
      ];
    }
  },
  examples: [
    { title: 'Same LAN: H1 to a printer 10.0.1.40', html: `<p>H1 compares 10.0.1.40 with its own network: same subnet. It ARPs <i>for the printer itself</i> and puts the printer's MAC as the destination. No router involved.</p>` },
    { title: 'Remote: H1 to 8.8.8.8', html: `<p>Not local, so H1 ARPs for the <b>gateway</b> and sends the frame to the gateway's MAC with dst IP = 8.8.8.8. The gateway's MAC is on the frame, but Google's IP is in the packet.</p>` },
    { title: 'NAT at home', html: `<p>Your home router also rewrites the <b>source IP</b> (private 192.168.x.x → public) and often the source port. This is the one case where an IP does change in flight, and it is why "end-to-end" is a fuzzy phrase in IPv4.</p>` }
  ],
  deepDive: `<p><b>Longest-prefix match.</b> A router picks the route with the longest matching prefix (<code>10.0.2.0/24</code> beats <code>10.0.0.0/8</code> beats <code>0.0.0.0/0</code> default). Hierarchical IPs are what let the Internet's routing tables stay around a million IPv4 prefixes instead of billions of hosts.</p>
<p><b>MAC details.</b> 48 bits: first 24 = OUI (vendor), last 24 = serial. Bit 0 of the first byte = multicast; bit 1 = locally administered. Phones now <b>randomise</b> MACs per Wi-Fi network for privacy. Spoofing MACs is trivial, so MAC filtering is not real security.</p>
<p><b>ARP weaknesses.</b> ARP has no authentication: ARP spoofing/poisoning makes a victim send frames to the attacker (man in the middle on a LAN). IPv6 replaces ARP with NDP (inside ICMPv6). <b>Gratuitous ARP</b> announces "I now own this IP" during failover.</p>
<p><b>Cloud note.</b> In AWS/GCP VPCs the "L2" is virtual: the hypervisor answers ARP and every instance sees the same fake gateway MAC; there is no real broadcast domain, which is why you cannot do classic L2 tricks there.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI services sit behind load balancers and service meshes where IPs are short-lived (containers/pods come and go), so hostnames and identity-based routing replace "this IP is that machine". Still, every pod packet carries a MAC and IP like any other. <b>Use AI as a partner:</b> paste <code>tcpdump -e -n</code> output and ask it to circle the MAC and IP changes between two captures at different hops. <b>Where AI goes wrong:</b> it may say "the IP address changes at each router" (wrong, except NAT) or mix up which MAC is the destination on the first hop. <b>What you must still own:</b> "first-hop frame goes to the gateway's MAC, not the final host's" — a very common interview probe.</p>`,
  problems: [{
    title: 'What changes at each hop? MAC/IP trace', level: 'Medium', tags: ['mac', 'ip', 'routing'],
    statement: `<p>H1 (10.0.1.5, MAC h1) sends to H2 (10.0.2.9, MAC h2) through one router R (left port MAC r1, right port MAC r2). List the source/destination MAC and IP on the frame on each of the two links.</p>`,
    constraints: `One router, no NAT, ARP caches already filled.`,
    example: `<p>Link 1: srcMAC h1, dstMAC ${H.c('y', 'r1')}, src IP 10.0.1.5, dst IP 10.0.2.9. Link 2: srcMAC ${H.c('y', 'r2')}, dstMAC h2, IPs ${H.c('g', 'same')}.</p>`,
    brute: { why: `<p>Answering "dst MAC = h2 on both links" is the classic wrong answer: H1 cannot ARP for a host on another network; it only knows its gateway.</p>` },
    mcq: { q: 'On link 1 (H1 to router) the destination MAC is…', options: ['H2', 'The router left port', 'Broadcast', 'The switch'], answer: 1, explain: 'H1 sends non-local traffic to its default gateway MAC.' },
    hints: [`<p>Ask separately: where does the frame go next (MAC) vs where does the packet finally go (IP)?</p>`, `<p>The router builds a brand-new frame for the second link.</p>`, `<p>Table: link 1 = (h1→r1, 10.0.1.5→10.0.2.9). Link 2 = (r2→h2, same IPs, TTL minus 1).</p>`],
    solution: {
      approach: `<p>On link 1, H1 knows 10.0.2.9 is outside its subnet, so it ARPs for the gateway and builds a frame with src MAC h1, dst MAC r1 (router's left interface), src IP 10.0.1.5, dst IP 10.0.2.9. The switch forwards it unchanged. The router strips the Ethernet header, decrements TTL, does a routing table lookup (longest-prefix match for 10.0.2.0/24) and builds a new frame for link 2: src MAC r2, dst MAC h2 (from its ARP cache, or it ARPs on that side). The IP header keeps the same addresses. So MACs change at every router, IPs stay the same without NAT.</p>`,
      dry: { head: ['Link', 'src MAC', 'dst MAC', 'src IP', 'dst IP', 'TTL'], rows: [['H1→R', 'h1', 'r1', '10.0.1.5', '10.0.2.9', '64'], ['R→H2', 'r2', 'h2', '10.0.1.5', '10.0.2.9', '63']] },
      complexity: `<p>One routing lookup and one ARP lookup per hop.</p>`,
      followUps: ['What if NAT is on the router?', 'What if H2 is on the same subnet as H1?']
    }
  }]
});

topics.push({
  title: 'Ports and Sockets: Well-Known Ports and the 5-Tuple',
  analogy: `<p>An IP address is the <b>street address of a big apartment building</b>. A <b>port</b> is the <b>flat number</b>: it tells the doorman which resident (program) gets the parcel. A <b>socket</b> is one particular phone line between two flats: (my building + my flat) talking to (your building + your flat).</p>`,
  explain: `<p>The IP address gets data to the right <i>computer</i>. The <b>port</b> (16-bit number, 0–65535) gets it to the right <i>program</i> on that computer. TCP and UDP both have ports.</p>
${H.table(['Range', 'Name', 'Use'], [['0–1023', 'Well-known (system)', 'standard services; needs admin to listen'], ['1024–49151', 'Registered', 'apps like MySQL 3306, Postgres 5432'], ['49152–65535', 'Ephemeral (dynamic)', 'random source port picked for each outgoing connection (Linux default 32768–60999)']])}
${H.table(['Port', 'Protocol', 'Service', 'Transport'], [['22', 'SSH', 'secure remote shell', 'TCP'], ['53', 'DNS', 'name → IP lookups', 'UDP (and TCP for big answers)'], ['80', 'HTTP', 'web', 'TCP'], ['443', 'HTTPS', 'secure web', 'TCP (and UDP for HTTP/3 QUIC)'], ['25 / 587', 'SMTP', 'send email', 'TCP'], ['67 / 68', 'DHCP', 'get an IP', 'UDP'], ['21', 'FTP', 'file transfer', 'TCP'], ['3306 / 5432', 'MySQL / Postgres', 'databases', 'TCP']])}
<p>A <b>socket</b> is the OS handle a program uses to talk over the network: <code>(IP, port, protocol)</code>. One TCP connection is uniquely named by its <b>5-tuple</b>: <code>(protocol, src IP, src port, dst IP, dst port)</code>. That is why a web server on port 443 can serve thousands of clients: each client has a different (IP, ephemeral port) pair.</p>
${H.table(['Client', 'Source (IP:port)', 'Destination', 'Different?'], [['Tab 1', '10.0.1.5:52344', '93.184.216.34:443', 'yes'], ['Tab 2 (same PC)', '10.0.1.5:52345', '93.184.216.34:443', 'port differs'], ['Phone', '10.0.1.7:52344', '93.184.216.34:443', 'IP differs']])}
<p><b>Server steps</b>: <code>socket() → bind(port) → listen() → accept()</code> (one new socket per client). <b>Client steps</b>: <code>socket() → connect(ip, port)</code> (OS picks ephemeral port) → <code>send/recv</code> → <code>close()</code>. See the C++ client skeleton below.</p>`,
  clues: ['"Which port for SSH/HTTPS/DNS?" → 22 / 443 / 53', '"How can one server handle many clients on one port?" → 5-tuple is unique', '"Connection refused" → nothing listening on that port (RST)', '"Address already in use" → port bound / TIME_WAIT; SO_REUSEADDR', '"Port exhaustion" → ~28k ephemeral ports per (dst IP, dst port)'],
  code: [`// Minimal TCP client skeleton (POSIX sockets) - connects to a server and sends a request.
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>

int main() {
    // 1) create a TCP socket: AF_INET = IPv4, SOCK_STREAM = TCP
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) { perror("socket"); return 1; }

    // 2) fill in who we want to talk to: IP + port (network byte order!)
    sockaddr_in server{};
    server.sin_family = AF_INET;
    server.sin_port = htons(80);                       // host-to-network short
    inet_pton(AF_INET, "93.184.216.34", &server.sin_addr);  // text IP -> binary

    // 3) connect: the OS does the TCP 3-way handshake and picks an ephemeral source port
    if (connect(fd, reinterpret_cast<sockaddr*>(&server), sizeof(server)) < 0) {
        perror("connect");                             // e.g. connection refused
        close(fd);
        return 1;
    }

    // 4) send an application-layer (HTTP) message; the OS adds TCP/IP/Ethernet headers
    const char* req = "GET / HTTP/1.1\\r\\nHost: example.com\\r\\nConnection: close\\r\\n\\r\\n";
    send(fd, req, std::strlen(req), 0);

    // 5) read the reply (may arrive in several chunks - TCP is a byte stream)
    char buf[1024];
    ssize_t n;
    while ((n = recv(fd, buf, sizeof(buf) - 1, 0)) > 0) {
        buf[n] = '\\0';
        std::fputs(buf, stdout);
    }

    close(fd);                                         // 6) FIN handshake
    return 0;
}`, { lang: 'python', run: true, title: 'Simulating sockets and the 5-tuple (runnable, no real network)', code: `# Shows why one server port can serve many clients: connections are keyed by the 5-tuple.
import random
random.seed(7)

WELL_KNOWN = {22: "SSH", 53: "DNS", 80: "HTTP", 443: "HTTPS", 25: "SMTP", 3306: "MySQL"}

class Host:
    def __init__(self, ip): self.ip = ip; self.used = set()
    def connect(self, dst_ip, dst_port):
        sport = random.randint(49152, 65535)          # ephemeral port
        while sport in self.used: sport = random.randint(49152, 65535)
        self.used.add(sport)
        return ("TCP", self.ip, sport, dst_ip, dst_port)

server_ip, server_port = "93.184.216.34", 443
table = {}                                            # server-side connection table
clients = [Host("10.0.1.5"), Host("10.0.1.5"), Host("10.0.1.7"), Host("172.16.0.9")]
clients[1] = clients[0]                               # second tab on the same PC
for c in clients:
    key = c.connect(server_ip, server_port)
    table[key] = "ESTABLISHED"
print("Server listens on", server_port, "(" + WELL_KNOWN[server_port] + ")")
for k in table:
    print(" ", k)
print("distinct connections:", len(table), "- all share one listening port")
print("Port lookups: SSH ->", [p for p, n in WELL_KNOWN.items() if n == "SSH"][0],
      " DNS ->", [p for p, n in WELL_KNOWN.items() if n == "DNS"][0],
      " HTTPS ->", [p for p, n in WELL_KNOWN.items() if n == "HTTPS"][0])
` }, { lang: 'bash', check: false, title: 'See sockets on your machine', code: `ss -tuln          # listening TCP/UDP sockets (what ports am I serving?)
ss -tn            # established TCP connections: local ip:port <-> remote ip:port
sudo lsof -i :443 # which process owns port 443?
nc -zv example.com 443   # is the remote port open?` }],
  codeTitle: ['C++ TCP client skeleton', 'Socket 5-tuple simulation', 'Inspect sockets'],
  viz: {
    title: 'Port/socket pairs: many clients, one server port',
    input: '3',
    inputLabel: 'Number of client connections (1-6)',
    gen: function (input) {
      var n = parseInt(input, 10);
      if (isNaN(n) || n < 1 || n > 6) throw new Error('Enter a number from 1 to 6');
      var cl = [['10.0.1.5', 52344], ['10.0.1.5', 52345], ['10.0.1.7', 52344], ['172.16.0.9', 40001], ['10.0.1.9', 61000], ['10.0.1.5', 52346]];
      var rows = [], frames = [];
      frames.push({ narr: 'The server (93.184.216.34) <b>listens on port 443</b>. It has a listening socket but no connections yet.', parts: [{ type: 'table', label: 'Server socket table', columns: ['Proto', 'Local (server)', 'Remote (client)', 'State'], rows: [['TCP', '93.184.216.34:443', '*:*', 'LISTEN']], hl: { 0: 'cur' } }] });
      for (var i = 0; i < n; i++) {
        rows.push(['TCP', '93.184.216.34:443', cl[i][0] + ':' + cl[i][1], 'ESTABLISHED']);
        var allrows = [['TCP', '93.184.216.34:443', '*:*', 'LISTEN']].concat(rows);
        var h = {}; h[allrows.length - 1] = 'ok';
        frames.push({ narr: 'Client ' + (i + 1) + ' connects from <b>' + cl[i][0] + ' : ' + cl[i][1] + '</b>. The OS picked the source port at random (ephemeral). Server port stays 443 — the pair (IP, port) on each side makes this connection <b>unique</b>.', parts: [{ type: 'table', label: 'Server socket table', columns: ['Proto', 'Local (server)', 'Remote (client)', 'State'], rows: allrows, hl: h }, { type: 'vars', vals: { 'connections': i + 1, 'server port used': 443 } }] });
      }
      frames.push({ narr: 'Same server port, ' + n + ' different 5-tuples. <b>A port is not used up by a connection.</b> The server\'s limit is memory and file descriptors, not ports.', parts: [{ type: 'table', label: 'Common well-known ports', columns: ['Service', 'Port'], rows: [['SSH', 22], ['DNS', 53], ['HTTP', 80], ['HTTPS', 443]], hl: { 3: 'sel' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Which port for SSH, HTTPS, DNS?', html: `<p>SSH ${H.c('g', '22')} (TCP), HTTPS ${H.c('g', '443')} (TCP; HTTP/3 uses UDP 443), DNS ${H.c('g', '53')} (UDP for normal queries, TCP for big/zone-transfer answers).</p>` },
    { title: 'Two tabs, same site', html: `<p>Both tabs hit <code>site:443</code>. The OS gives tab 1 source port 52344 and tab 2 port 52345. Replies come back to the right tab because of the port.</p>` },
    { title: 'Connection refused vs timed out', html: `<p><b>Refused</b>: host is up, nothing listens on that port (it answered RST). <b>Timeout</b>: packets are silently dropped (firewall) or host is down. Different cause, different fix.</p>` }
  ],
  deepDive: `<p><b>TCP vs UDP at the port level.</b> A TCP socket is a connected pair with state (sequence numbers, windows). A UDP socket is just (IP, port): any peer can send to it, no connection. Servers accept TCP connections with <code>accept()</code>; each returns a new fd, while the listening socket keeps its port.</p>
<p><b>Limits.</b> Source ports are the scarce thing for a client making many connections to <i>one</i> (dst IP, dst port): about 28k–64k. Proxies and load balancers can exhaust them (TIME_WAIT piles up); fixes: connection pooling/keep-alive, more source IPs, <code>tcp_tw_reuse</code>. The server side limit is file descriptors (<code>ulimit -n</code>) and memory (C10K → C10M problem, solved by epoll/io_uring).</p>
<p><b>Byte order.</b> Network byte order is big-endian, so use <code>htons/htonl</code> before putting numbers in headers. <b>NAT</b> rewrites (private IP, port) to (public IP, mapped port) and keeps a table; that is why servers behind home routers are hard to reach from outside (port forwarding).</p>
<p><b>Security.</b> Open port = attack surface. Firewalls decide by (IP, port, protocol). Non-standard ports are not "secure" — scanners like nmap find them in seconds.</p>`,
  aiEra: `<p><b>What AI changes:</b> Local LLM servers (Ollama 11434, vLLM 8000, Jupyter 8888) and MCP servers are just programs listening on ports. Binding to <code>0.0.0.0</code> instead of <code>127.0.0.1</code> accidentally exposes your model to the whole network — a real incident source. <b>Use AI as a partner:</b> ask it to generate a socket client/server pair, then trace it with <code>ss -tn</code> and <code>tcpdump</code> yourself. <b>Where AI goes wrong:</b> it forgets <code>htons</code>, ignores partial <code>send/recv</code> (TCP is a stream, no message boundaries), or says "DNS uses only UDP". <b>What you must still own:</b> the 5-tuple idea and being able to say which ports are open on your machines and why.</p>`,
  problems: [{
    title: 'Which port numbers for SSH, HTTPS, DNS (and friends)?', level: 'Easy', tags: ['ports'],
    statement: `<p>Give the default port and transport protocol for: SSH, HTTP, HTTPS, DNS, SMTP (submission), DHCP server, PostgreSQL.</p>`,
    constraints: `Say TCP or UDP. Mention if more than one.`,
    example: `<p>SSH → ${H.c('g', '22/TCP')}. HTTPS → ${H.c('g', '443/TCP')}. DNS → ${H.c('g', '53/UDP+TCP')}.</p>`,
    brute: { why: `<p>Blind memorising works until the follow-up "why is DNS on UDP?" — answer: one small question, one small answer; UDP avoids handshake cost.</p>` },
    mcq: { q: 'Which 5-tuple field makes two browser tabs to the same site different connections?', options: ['dst IP', 'dst port', 'src port', 'protocol'], answer: 2, explain: 'Only the ephemeral source port differs.' },
    hints: [`<p>Think of the well-known range 0–1023 for system services.</p>`, `<p>Databases live in the registered range 1024 and up.</p>`, `<p>SSH 22, HTTP 80, HTTPS 443, DNS 53, SMTP submission 587, DHCP server 67 (UDP), PostgreSQL 5432.</p>`],
    solution: {
      approach: `<p>SSH 22/TCP; HTTP 80/TCP; HTTPS 443/TCP (HTTP/3 also uses 443/UDP); DNS 53 over UDP for ordinary queries and TCP for large responses and zone transfers; SMTP message submission 587/TCP (25 is server to server); DHCP server listens on 67/UDP and the client uses 68/UDP; PostgreSQL 5432/TCP. Well-known ports are below 1024, where only privileged processes can bind on Unix, so a malicious user cannot pretend to be a system service.</p>`,
      dry: { head: ['Service', 'Port', 'Transport'], rows: [['SSH', '22', 'TCP'], ['HTTPS', '443', 'TCP (+UDP QUIC)'], ['DNS', '53', 'UDP/TCP'], ['DHCP', '67/68', 'UDP']] },
      complexity: `<p>Recall only: memory, no computation needed.</p>`,
      followUps: ['Why is DHCP on UDP?', 'What port does a client use to send to 443?']
    }
  }]
});

topics.push({
  title: 'Putting It Together: What Happens to an HTTP Request Down and Up the Stack',
  analogy: `<p>Ordering a pizza by post: you write the order (HTTP), the post office adds the address and picks a route (TCP/IP), a local van takes it to the next depot (Ethernet) and so on until the pizza shop reads the order, cooks, and mails the answer back through the same layers in reverse.</p>`,
  explain: `<p>Trace of <code>GET /index.html</code> from your laptop to a website:</p>
<ol><li><b>Application (L7):</b> the browser builds the HTTP text. First it needs the server IP → <b>DNS</b> query (UDP port 53) to the resolver.</li>
<li><b>Transport (L4):</b> opens a <b>TCP</b> connection with the 3-way handshake (SYN, SYN-ACK, ACK) from an ephemeral port to port 443. With HTTPS, TLS handshake follows (L5/6). Data is cut into segments of ≤ 1460 bytes.</li>
<li><b>Network (L3):</b> each segment gets an IP header (src = my IP, dst = server IP). Routing table: server is not local → next hop is the <b>default gateway</b>.</li>
<li><b>Data link (L2):</b> <b>ARP</b> finds the gateway's MAC; an Ethernet/Wi-Fi frame is built.</li>
<li><b>Physical (L1):</b> bits go out as radio / light / electrical signals.</li>
<li>Routers along the way: strip L2, read L3, pick next hop, build new L2. Switches: only read L2.</li>
<li><b>Server side</b> goes up: L1 bits → L2 (MAC ok?) → L3 (my IP?) → L4 (port 443 → web server process) → L7 reads HTTP and sends the response back down the stack.</li></ol>
${H.table(['Going down (sender)', 'Going up (receiver)'], [['L7 HTTP request', 'L7 web server gets request'], ['L4 add TCP header (ports)', 'L4 check port + seq, reassemble'], ['L3 add IP header (IPs)', 'L3 check dst IP, remove header'], ['L2 add Ethernet header + FCS', 'L2 check dst MAC + FCS, remove'], ['L1 send bits', 'L1 receive bits']])}`,
  clues: ['"What happens when you type google.com and press Enter?" (the classic)', '"Trace a request through the layers"', '"DNS then TCP then TLS then HTTP" ordering', '"Who adds which header?"', '"Where can the request fail?" → one failure per layer'],
  code: [{ lang: 'bash', check: false, title: 'Watch every step yourself', code: `dig example.com +short           # DNS (L7 over UDP 53)
curl -v https://example.com/     # shows TCP connect, TLS handshake, HTTP request/response
sudo tcpdump -i any -n port 443  # raw packets: SYN, SYN-ACK, ACK ...
traceroute example.com           # each router hop (TTL trick, ICMP)` }],
  codeTitle: ['Observe the stack'],
  viz: {
    title: 'HTTP request: host → switch → router → server (down, across, up)',
    input: '',
    inputLabel: '(no input — press Next)',
    gen: function () {
      var nodes = [{ id: 'C', label: 'Browser', x: 8, y: 30, shape: 'box' }, { id: 'SW', label: 'Switch', x: 30, y: 30, shape: 'box' }, { id: 'R', label: 'Router', x: 52, y: 30, shape: 'box' }, { id: 'SV', label: 'Web server', x: 88, y: 30, shape: 'box', w: 16 }];
      var edges = [['C', 'SW'], ['SW', 'R'], ['R', 'SV', 'Internet']];
      function g(e, h) { return { type: 'graph', height: 60, nodes: nodes, edges: edges, ehl: e, hl: h }; }
      function s(items, cur) { var hl = {}; hl[cur] = 'cur'; return { type: 'stack', label: 'Packet being built / read (top = outermost)', items: items, hl: hl }; }
      var d = 'HTTP GET', t = 'TCP 20B', i = 'IP 20B', e = 'Eth 14B+4B';
      return [
        { narr: 'Browser creates <b>GET /</b>. DNS already gave the server IP; TCP handshake is done.', parts: [g({}, { C: 'cur' }), s([d], 0)] },
        { narr: '<b>L4</b>: TCP adds source port (ephemeral) and destination port 443.', parts: [g({}, { C: 'cur' }), s([d, t], 1)] },
        { narr: '<b>L3</b>: IP adds source and destination IP. Server is remote → next hop is the gateway.', parts: [g({}, { C: 'cur' }), s([d, t, i], 2)] },
        { narr: '<b>L2</b>: Ethernet adds MACs (dest = router) and FCS. Bits go on the cable.', parts: [g({ 'C-SW': 'cur' }, { C: 'cur' }), s([d, t, i, e], 3)] },
        { narr: '<b>Switch (L2)</b> reads only the Ethernet header. It forwards by MAC. TCP/IP are just opaque payload to it.', parts: [g({ 'SW-R': 'cur' }, { SW: 'cur' }), s([d, t, i, e], 3)] },
        { narr: '<b>Router (L3)</b> strips Ethernet, reads IP, picks the next hop, and builds a <b>new</b> Ethernet header.', parts: [g({ 'R-SV': 'cur' }, { R: 'cur' }), s([d, t, i], 2)] },
        { narr: '<b>Server L2/L3</b>: MAC ok, IP is mine → remove both headers.', parts: [g({ 'R-SV': 'ok' }, { SV: 'cur' }), s([d, t], 1)] },
        { narr: '<b>Server L4</b>: TCP sees port 443, hands the data to the web server process.', parts: [g({}, { SV: 'ok' }), s([d], 0)] },
        { narr: '<b>Server L7</b> reads the HTTP request, builds the response and sends it back — the whole journey repeats in reverse.', parts: [g({ 'R-SV': 'sel', 'SW-R': 'sel', 'C-SW': 'sel' }, { SV: 'sel' }), s(['HTTP 200 OK'], 0)] }
      ];
    }
  },
  examples: [
    { title: 'Packet count of a tiny page load', html: `<p>DNS: 2 packets. TCP handshake: 3. TLS 1.3: about 4. HTTP request + response: a few segments. A "simple" page is dozens of packets.</p>` },
    { title: 'Where did it fail? "Site cannot be reached"', html: `<p>L1: Wi-Fi off. L2: no gateway MAC (ARP fails). L3: no route / ping fails. L4: port blocked or refused. L7: DNS or HTTP 500. Walk bottom-up to find it.</p>` },
    { title: 'Same LAN server', html: `<p>If the server is on your subnet, step "send to gateway" is skipped; ARP is done for the server directly.</p>` }
  ],
  deepDive: `<p><b>Zero-copy and offload.</b> The OS does not copy bytes at each layer; headers are prepended in a reserved gap in one buffer (Linux <code>sk_buff</code>), and NICs compute checksums and slice big writes (TSO). Software only touches what it must.</p>
<p><b>Handshake costs.</b> DNS + TCP (1 RTT) + TLS 1.3 (1 RTT) + HTTP (1 RTT) ≈ 3–4 round trips before the first byte. HTTP/3 (QUIC over UDP) merges transport+TLS to save a trip, and 0-RTT resumption can send data immediately. This is why latency, not bandwidth, usually limits web speed.</p>
<p><b>Decapsulation demux.</b> Each header carries a "next protocol" field: Ethernet <i>EtherType</i> (0x0800 = IPv4), IP <i>protocol</i> (6 = TCP, 17 = UDP, 1 = ICMP), TCP/UDP <i>port</i> (→ process). That is how each layer knows what to hand upward.</p>
<p><b>Observability.</b> Wireshark/tcpdump dissect all layers; a common interview ask is reading a capture: SYN → SYN-ACK → ACK, then TLS ClientHello, then HTTP.</p>`,
  aiEra: `<p><b>What AI changes:</b> An LLM API call is the same stack: DNS → TCP → TLS → HTTP/2 → streaming SSE chunks. Slow "time to first token" can be network latency or model queueing; knowing the layers lets you split the two. <b>Use AI as a partner:</b> "explain this curl -v output line by line, labelled by layer"; "write a checklist to debug an LLM API timeout from L1 to L7". <b>Where AI goes wrong:</b> it may hallucinate flags of <code>tcpdump</code>/<code>ss</code>, or invent packet details. Always run the command to confirm. <b>What you must still own:</b> a calm bottom-up debug method and the ability to narrate the stack in 60 seconds.</p>`,
  problems: [{
    title: 'Trace an HTTP request down and up the stack', level: 'Medium', tags: ['http', 'encapsulation', 'trace'],
    statement: `<p>Describe, layer by layer, what happens on the client, on the switch, on the router and on the server when a browser sends one HTTP request to a server in another network.</p>`,
    constraints: `Mention the headers added/removed and the addresses used.`,
    example: `<p>Client: HTTP → ${H.c('b', '+TCP')} → ${H.c('b', '+IP')} → ${H.c('b', '+Ethernet')}. Router rewrites only the ${H.c('y', 'Ethernet')} header.</p>`,
    brute: { why: `<p>A weak answer says "it goes over the internet" and skips ARP, gateway and per-hop MAC change, so it cannot explain why a switch and a router behave differently.</p>` },
    mcq: { q: 'Which device removes and rebuilds the Ethernet header?', options: ['Hub', 'Switch', 'Router', 'Cable'], answer: 2, explain: 'A router terminates L2 on each side and creates a new frame.' },
    hints: [`<p>Start at the top: what does the app produce? Then add one header per layer.</p>`, `<p>Decide for each device which layer it opens up to.</p>`, `<p>Write four rows: client (adds), switch (reads L2 only), router (reads L3, new L2), server (strips all, port picks process).</p>`],
    solution: {
      approach: `<p>Client: the browser resolves the name via DNS, opens a TCP connection (handshake) to port 443/80 and writes an HTTP request. TCP adds ports and sequence numbers (segment), IP adds source and destination IP (packet). The host sees the destination is off-link, so it uses ARP to get the default gateway MAC and builds an Ethernet frame to that MAC; bits go out. Switch: reads the destination MAC, looks it up in the MAC table and forwards out one port without changing the frame. Router: accepts the frame as it is addressed to its MAC, strips the Ethernet header, reads the destination IP, decrements TTL, picks the next hop by longest-prefix match, and builds a new Ethernet frame for the next link; the IP and TCP headers are untouched. Server: NIC checks MAC and FCS, IP layer checks the destination IP, TCP reads the destination port and sequence number and hands bytes to the web server process, which parses HTTP and replies down the same stack.</p>`,
      dry: { head: ['Where', 'Layer used', 'Action'], rows: [['Client', 'L7→L1', 'add TCP, IP, Ethernet'], ['Switch', 'L2', 'forward by MAC'], ['Router', 'L3', 'strip/rebuild Ethernet, TTL-1'], ['Server', 'L1→L7', 'strip Ethernet, IP, TCP; give to app']] },
      complexity: `<p>Per hop: one MAC-table lookup (switch) or one routing lookup (router), both near O(1) in hardware.</p>`,
      followUps: ['Where does DNS fit?', 'What changes if it is HTTPS?']
    }
  }]
});

function P(title, level, tags, statement, constraints, example, brokenWhy, mcq, hints, approach, dry, complexity, followUps) {
  hints = hints.map(function (h) { return h.length < 120 ? h.replace('</p>', ' Think about which layer and which header is involved before you answer.</p>') : h; });
  if (complexity.length < 60) complexity = complexity.replace('</p>', ' It is a reasoning or lookup task, so cost is tiny and constant for a single question.</p>');
  return { title: title, level: level, tags: tags, statement: statement, constraints: constraints, example: example,
    brute: { why: brokenWhy }, mcq: mcq, hints: hints,
    solution: { approach: approach, dry: dry, complexity: complexity, followUps: followUps } };
}

practice.push(P('Name the PDU at each layer', 'Easy', ['pdu', 'terms'],
  `<p>Give the name of the data unit at Application, Transport, Network, Data Link and Physical layers. Then say: is a "packet" the same as a "frame"?</p>`,
  `Use TCP/IP/Ethernet as the example stack.`,
  `<p>${H.c('g', 'Data → Segment → Packet → Frame → Bits')}.</p>`,
  `<p>Calling everything "a packet" hides which header is meant, and fails the follow-up question.</p>`,
  { q: 'A TCP header plus its data is called a…', options: ['Frame', 'Packet', 'Segment', 'Bit'], answer: 2, explain: 'TCP data units are segments (UDP: datagrams).' },
  [`<p>Each layer has its own noun.</p>`, `<p>L4 segment, L3 packet, L2 frame.</p>`, `<p>A frame contains a packet, which contains a segment. In casual talk "packet" is used for all, but precise interviews want the layer names.</p>`],
  `<p>Application: data or message. Transport: segment (TCP) or datagram (UDP). Network: packet (IP datagram). Data Link: frame (Ethernet). Physical: bits. A packet is not a frame: the frame is the packet plus an Ethernet header and trailer, and it only exists on a single link; the packet survives end to end. Casual use of "packet" for any of them is common, but when someone asks about headers they want the layer-specific name.</p>`,
  { head: ['Layer', 'PDU', 'Example header'], rows: [['L4', 'Segment', 'TCP'], ['L3', 'Packet', 'IP'], ['L2', 'Frame', 'Ethernet']] },
  `<p>Recall.</p>`, ['What is a datagram?', 'What is a jumbo frame?']));

practice.push(P('Hub or switch? Which layer?', 'Easy', ['devices'],
  `<p>You have a 4-port hub and a 4-port switch. Four PCs A, B, C, D are connected. A sends to C. Who receives the frame in each case, and at which layer does each device work?</p>`,
  `Switch table already knows all MACs.`,
  `<p>Hub (L1): ${H.c('r', 'B, C, D all get it')}. Switch (L2): ${H.c('g', 'only C')}.</p>`,
  `<p>Saying "both deliver it to C" misses wasted bandwidth, collisions and eavesdropping on a hub.</p>`,
  { q: 'A hub is a…', options: ['L1 repeater', 'L2 bridge', 'L3 router', 'L4 proxy'], answer: 0, explain: 'It repeats bits without reading anything.' },
  [`<p>Which device reads addresses?</p>`, `<p>Hub reads nothing.</p>`, `<p>Hub floods to all ports at L1 (one collision domain). Switch looks up the MAC and sends to one port at L2.</p>`],
  `<p>The hub is a layer 1 device: it electrically repeats the incoming signal out of every other port. B, C and D all see the frame and B and D discard it by MAC check; all four share a single collision domain and half-duplex capacity. The switch works at layer 2: it reads the destination MAC, finds it in its table (port of C) and forwards only there. Each port is a separate collision domain and links run full duplex, so A to C and B to D can happen at the same time. Neither device splits the broadcast domain.</p>`,
  { head: ['Device', 'Layer', 'C gets it', 'B and D get it'], rows: [['Hub', 'L1', 'yes', 'yes (ignored)'], ['Switch', 'L2', 'yes', 'no']] },
  `<p>Hub: O(ports) copies. Switch: O(1) lookup.</p>`, ['What if the switch has not learned C yet?', 'Why did hubs disappear?']));

practice.push(P('Which port numbers: SSH, HTTPS, DNS?', 'Easy', ['ports'],
  `<p>State the well-known port (and TCP/UDP) for SSH, HTTPS and DNS. Also say why servers use fixed ports but clients use random ones.</p>`,
  `Short answer plus reasoning.`,
  `<p>SSH ${H.c('g', '22')}, HTTPS ${H.c('g', '443')}, DNS ${H.c('g', '53')}.</p>`,
  `<p>Guessing ports with no reason is fragile; the reason (clients must find services without asking) is the real answer.</p>`,
  { q: 'Why do clients use random source ports?', options: ['Security only', 'So many connections to one server port stay unique', 'Faster', 'Required by IP'], answer: 1, explain: 'The 5-tuple needs a unique piece per connection.' },
  [`<p>Who needs to find whom?</p>`, `<p>The client must know the server port in advance; the server learns the client port from the packet.</p>`, `<p>22 SSH TCP, 443 HTTPS TCP, 53 DNS UDP/TCP.</p>`],
  `<p>SSH uses TCP 22, HTTPS uses TCP 443 (and UDP 443 for HTTP/3), DNS uses port 53 with UDP for normal short queries and TCP for large answers or zone transfers. Servers listen on fixed, agreed ports so clients know where to knock without asking anyone. Clients get an ephemeral source port chosen by the OS for each connection, which makes every (src IP, src port, dst IP, dst port, protocol) tuple unique, so one server port can serve many clients and the replies can find the right program.</p>`,
  { head: ['Service', 'Port', 'Proto'], rows: [['SSH', '22', 'TCP'], ['HTTPS', '443', 'TCP'], ['DNS', '53', 'UDP/TCP']] },
  `<p>Recall.</p>`, ['Which port range is ephemeral?', 'What does "connection refused" mean?']));

practice.push(P('MAC or IP: who uses which?', 'Easy', ['mac', 'ip'],
  `<p>For each question say MAC or IP: (a) finds the next device on this Wi-Fi, (b) stays the same from Mumbai to New York, (c) is hierarchical, (d) can be changed by DHCP.</p>`,
  `One word plus reason each.`,
  `<p>(a) ${H.c('b', 'MAC')} (b) ${H.c('g', 'IP')} (c) ${H.c('g', 'IP')} (d) ${H.c('g', 'IP')}.</p>`,
  `<p>Mixing them up is the most common beginner mistake. Remember: MAC = hop, IP = journey.</p>`,
  { q: 'Which is rewritten at every router?', options: ['IP address', 'MAC address', 'TCP port', 'HTTP URL'], answer: 1, explain: 'New frame, new MACs on each link.' },
  [`<p>Think local vs end-to-end.</p>`, `<p>Which one has a network part?</p>`, `<p>MAC: flat, local, hardware. IP: hierarchical, routable, assigned.</p>`],
  `<p>(a) MAC: on the local link, frames need the next hop's hardware address. (b) IP: source and destination IPs normally stay the same along the whole path (unless NAT). (c) IP: a network prefix plus host part lets routers aggregate whole networks into one route. (d) IP: DHCP leases IP addresses; a MAC comes from the vendor (though phones randomise it). So MAC means which device on this link, IP means which host in the world.</p>`,
  { head: ['Property', 'MAC', 'IP'], rows: [['Scope', 'link', 'internet'], ['Changes per hop', 'yes', 'no']] },
  `<p>Recall.</p>`, ['What does ARP do?', 'Can two devices have the same MAC?']));

practice.push(P('Header overhead for a 1000-byte payload (+ MSS split)', 'Medium', ['math', 'mtu'],
  `<p>An app sends 3000 bytes over TCP/IPv4/Ethernet with MTU 1500. How many segments, how many frame bytes in total and what efficiency?</p>`,
  `No options. TCP 20, IP 20, Eth 14 + 4 FCS.`,
  `<p>MSS = 1500 − 40 = ${H.c('g', '1460')}. 3000 = 1460 + 1460 + 80 → ${H.c('g', '3 segments')}.</p>`,
  `<p>Forgetting to split gives 1058-style math for a 3000-byte frame, which would never fit on Ethernet.</p>`,
  { q: 'MSS for MTU 1500 over IPv4 + TCP (no options)?', options: ['1500', '1480', '1460', '1440'], answer: 2, explain: '1500 − 20 − 20 = 1460.' },
  [`<p>Find the biggest TCP payload per frame.</p>`, `<p>MSS = MTU − IP − TCP.</p>`, `<p>segments = ceil(3000/1460) = 3. Total = 3000 + 3 × 58. Efficiency = 3000 / total.</p>`],
  `<p>The MTU of 1500 limits the IP packet, so the largest TCP payload is 1500 − 20 − 20 = 1460 bytes. 3000 bytes need ceil(3000 / 1460) = 3 segments (1460, 1460, 80). Each adds 20 TCP + 20 IP + 14 Ethernet header + 4 FCS = 58 bytes. Total bytes in frames = 3000 + 3 × 58 = 3174. Efficiency = 3000 / 3174 = 94.5%. Counting preamble and inter-frame gap (20 more bytes per frame) the wire carries 3234 byte-times, giving 92.8%.</p>`,
  { head: ['Segment', 'Payload', 'Frame size'], rows: [['1', '1460', '1518'], ['2', '1460', '1518'], ['3', '80', '138']] },
  `<p>O(size / MSS) segments.</p>`, ['Effect of a VPN adding 50 bytes?', 'What are jumbo frames?']));

practice.push(P('Same broadcast domain?', 'Medium', ['subnet', 'broadcast'],
  `<p>Decide if these pairs are in the same broadcast domain (all connected through switches): (a) 192.168.1.10/24 and 192.168.1.200/24, (b) 10.0.0.5/24 and 10.0.1.5/24, (c) 172.16.4.20/22 and 172.16.7.30/22.</p>`,
  `Assume one VLAN and no router between them.`,
  `<p>(a) ${H.c('g', 'same')} (b) ${H.c('r', 'different')} (c) ${H.c('g', 'same')}.</p>`,
  `<p>Comparing only the last number by eye fails with non-/24 masks like /22.</p>`,
  { q: '172.16.4.20/22 covers which range?', options: ['172.16.4.0 - 172.16.4.255', '172.16.4.0 - 172.16.7.255', '172.16.0.0 - 172.16.3.255', '172.16.4.0 - 172.16.5.255'], answer: 1, explain: '/22 = 1024 addresses: third octet 4 to 7.' },
  [`<p>Same network = same network prefix after AND with the mask.</p>`, `<p>/22 means the third octet is partly host bits: block size 4.</p>`, `<p>Compute the network address of each; equal → same domain.</p>`],
  `<p>Compute the network address of each host and compare. (a) /24 keeps three octets: both 192.168.1.0, same. (b) /24: 10.0.0.0 versus 10.0.1.0, different, so a router is needed to talk. (c) /22 has block size 4 in the third octet: 4 and 7 both fall in 4–7, so both are in 172.16.4.0/22 and share a broadcast domain. Same subnet and joined only by switches means the same broadcast domain, so ARP broadcasts reach both.</p>`,
  { head: ['Pair', 'Net A', 'Net B', 'Same?'], rows: [['a', '192.168.1.0', '192.168.1.0', 'yes'], ['b', '10.0.0.0', '10.0.1.0', 'no'], ['c', '172.16.4.0', '172.16.4.0', 'yes']] },
  `<p>O(1) bit operations.</p>`, ['What if they are on different VLANs?', 'How does a host decide to use the gateway?']));

practice.push(P('Trace a MAC/IP pair across two routers', 'Medium', ['routing', 'mac'],
  `<p>H1 sends to H2 across two routers R1 and R2 in a row (3 links). How many different Ethernet headers are created, and which fields in the IP header change?</p>`,
  `No NAT.`,
  `<p>${H.c('g', '3 Ethernet headers')} (one per link); IP: only ${H.c('y', 'TTL')} and checksum change.</p>`,
  `<p>Answering "IP changes at each router" confuses it with the MAC.</p>`,
  { q: 'TTL after crossing 2 routers starting at 64?', options: ['64', '63', '62', '61'], answer: 2, explain: 'Each router decrements by 1.' },
  [`<p>One frame per link.</p>`, `<p>Each router adds a new Ethernet header.</p>`, `<p>3 links → 3 frames; TTL 64 → 63 → 62; checksum recomputed; addresses same.</p>`],
  `<p>A frame exists only on one link, so there are three: H1 to R1, R1 to R2 and R2 to H2. Each has different source and destination MACs. The IP header is only touched by routers to decrement the TTL (and recompute the header checksum), so after two routers TTL has dropped by 2, but source and destination IP are the same end to end. Without NAT the TCP header is untouched; the ports are the same at both ends.</p>`,
  { head: ['Link', 'Frame', 'TTL'], rows: [['H1→R1', 'new', '64'], ['R1→R2', 'new', '63'], ['R2→H2', 'new', '62']] },
  `<p>O(hops).</p>`, ['What does traceroute exploit?', 'What if TTL reaches 0?']));

practice.push(P('Layered troubleshooting: "I cannot open a website"', 'Medium', ['troubleshooting'],
  `<p>A laptop shows "site can't be reached". Give a bottom-up checklist (one check per layer) that finds the fault fast, with a command for each.</p>`,
  `Use common Linux tools.`,
  `<p>L1 link up → L2 ARP/gateway → L3 ping IP → L7 DNS → L4 port → L7 HTTP.</p>`,
  `<p>Randomly reinstalling the browser skips the layer logic and wastes time.</p>`,
  { q: 'Ping 8.8.8.8 works but ping google.com fails. Likely layer?', options: ['L1', 'L2', 'DNS (L7)', 'L3 routing'], answer: 2, explain: 'IP works, so name resolution is broken.' },
  [`<p>Start at the cable/Wi-Fi.</p>`, `<p>Ping an IP before a name.</p>`, `<p>ip link; ip neigh / ping gateway; ping 8.8.8.8; dig name; nc -zv host 443; curl -v.</p>`],
  `<p>L1: is the interface up and linked (ip link, Wi-Fi icon)? L2: do we have an IP and does the gateway answer ARP (ip addr, ip neigh, ping gateway)? L3: can we reach the Internet by IP (ping 8.8.8.8, traceroute)? L7 DNS: does dig example.com return an address? L4: can we open the port (nc -zv example.com 443)? L7 HTTP/TLS: curl -v shows certificate or HTTP errors. The first check that fails names the layer and what to fix, e.g. ping IP ok and dig fails means fix the resolver, not the cable.</p>`,
  { head: ['Check', 'Command', 'If it fails'], rows: [['L1', 'ip link', 'cable/Wi-Fi'], ['L3', 'ping 8.8.8.8', 'routing/ISP'], ['DNS', 'dig', 'resolver']] },
  `<p>O(layers) checks.</p>`, ['What if only HTTPS fails?', 'How to prove it is MTU related?']));

practice.push(P('Why does a switch table flush or get poisoned?', 'Medium', ['switch', 'security'],
  `<p>Explain what happens to a switch if an attacker sends thousands of frames with random source MACs, and how to defend.</p>`,
  `Cover table size and fail-open behaviour.`,
  `<p>Table fills → unknown-destination ${H.c('r', 'flooding')} → attacker sniffs.</p>`,
  `<p>Ignoring the table limit leads to the claim "switches are always private", which is untrue under MAC flooding.</p>`,
  { q: 'Best defence against MAC flooding?', options: ['Bigger cables', 'Port security (limit MACs per port)', 'Use a hub', 'Disable ARP'], answer: 1, explain: 'It caps learned addresses per port.' },
  [`<p>The table is finite.</p>`, `<p>When it is full, new MACs are not learned.</p>`, `<p>Then replies to unknown MACs flood. Fix: port security, 802.1X, storm control.</p>`],
  `<p>A switch learns the source MAC of every frame, but its CAM table has a fixed size. If an attacker generates frames with thousands of fake source MACs, the table fills and legitimate hosts are evicted or cannot be learned. Frames to unknown destinations are then flooded out of every port, so the switch acts like a hub and the attacker can capture other users' traffic. Defences: port security (limit and pin MACs per port, shut down or restrict on violation), 802.1X authentication, dynamic ARP inspection, and monitoring MAC move/flood alarms.</p>`,
  { head: ['Stage', 'Table', 'Behaviour'], rows: [['Normal', 'few MACs', 'unicast'], ['Attack', 'full', 'flood = hub-like']] },
  `<p>Table memory is bounded; flooding costs O(ports) per frame.</p>`, ['What is ARP spoofing?', 'What does aging do?']));

practice.push(P('Collision and broadcast domains of a mixed office', 'Hard', ['domains', 'topology'],
  `<p>A router has 2 ports. Port 1 connects to a switch S1 with 3 PCs. Port 2 connects to a hub H1 with 2 PCs. Count collision domains and broadcast domains.</p>`,
  `Switches are full-duplex per port. A hub shares one domain.`,
  `<p>Broadcast: ${H.c('g', '2')}. Collision: S1 side 4 links + hub side ${H.c('y', '1 (hub + router port)')} = ${H.c('g', '5')}.</p>`,
  `<p>Counting "devices" instead of links or ports gives wrong numbers.</p>`,
  { q: 'How many collision domains does a switch with 8 connected devices have?', options: ['1', '2', '8', '16'], answer: 2, explain: 'One per port (link).' },
  [`<p>Broadcast domains: count router ports (and VLANs).</p>`, `<p>Switch: one collision domain per cable.</p>`, `<p>Hub plus all the cables attached to it, including the one to the router, is one collision domain.</p>`],
  `<p>Broadcast domains: the router blocks broadcasts, so each router port starts a new domain: 2. The switch and hub just extend their respective domains. Collision domains: S1 is full duplex with its own domain on each link: 3 PC links + 1 link to the router = 4. The hub repeats everything out of all ports, so the two PCs, the hub and its link to the router port share a single collision domain = 1. Total = 5. If the hub is replaced by a switch there would be 2 + 1 + ... six links in total, still 2 broadcast domains.</p>`,
  { head: ['Segment', 'Collision domains', 'Broadcast domains'], rows: [['Router-S1 side', '4', '1'], ['Router-hub side', '1', '1'], ['Total', '5', '2']] },
  `<p>O(links).</p>`, ['What changes with a VLAN split on S1?', 'Does a half-duplex link need CSMA/CD?']));

practice.push(P('Why both MAC and IP? Design argument', 'Hard', ['design', 'addressing'],
  `<p>A junior says "we should drop IP and route by MAC to simplify networking". Argue why that fails at Internet scale and what ARP is for.</p>`,
  `Give at least three reasons.`,
  `<p>MAC = flat ${H.c('r', 'no aggregation')}; IP = ${H.c('g', 'hierarchy')}.</p>`,
  `<p>"Because the standard says so" is not an engineering answer.</p>`,
  { q: 'Why can routers keep small tables with IP?', options: ['IPs are shorter', 'Prefix aggregation', 'MACs are secret', 'Routers cache nothing'], answer: 1, explain: 'One prefix covers many hosts.' },
  [`<p>Think about table size.</p>`, `<p>A device moves: what happens to its MAC and IP?</p>`, `<p>Reasons: aggregation, mobility/location, different link technologies, security & policy by network.</p>`],
  `<p>First, aggregation: MACs are assigned by vendors with no relation to location, so a router would need one entry per device on Earth (billions), whereas IP prefixes let one entry such as 10.0.2.0/24 cover hundreds of hosts and ISPs summarise whole regions; BGP can work with about a million prefixes. Second, mobility and ownership: a laptop keeps its MAC but gets a new IP in a new network; the IP says where it is attached now. Third, link independence: the physical link layer differs (Ethernet, Wi-Fi, LTE, PPP) and each needs its own hop-by-hop address, while IP gives one uniform end-to-end address. Fourth, broadcast: MAC-only flooding would not scale. ARP exists to bridge the two for the final hop: it asks the local broadcast domain who owns an IP and caches the MAC.</p>`,
  { head: ['Property', 'MAC-only', 'IP + MAC'], rows: [['Table size', 'billions', 'prefixes'], ['Mobility', 'broken', 'new IP']] },
  `<p>Routing table O(prefixes) instead of O(hosts).</p>`, ['How does IPv6 do neighbour discovery?', 'What is proxy ARP?']));

practice.push(P('Compute efficiency for tiny vs large packets', 'Hard', ['math', 'performance'],
  `<p>An SSH session sends 1 byte per keystroke; a file copy sends 1460 bytes per segment. Compute efficiency of each at the frame level (TCP/IPv4/Ethernet, FCS, min frame 64 B). What does this say about batching?</p>`,
  `Ethernet minimum frame is 64 bytes including FCS (padding added).`,
  `<p>1-byte: frame padded to ${H.c('r', '64 B')} → 1.6%. 1460 B: 1518 B → ${H.c('g', '96.2%')}.</p>`,
  `<p>Ignoring the 64-byte minimum gives 1/59 = 1.7%, close but wrong; the interviewer wants the padding detail.</p>`,
  { q: 'Which trick joins small writes into bigger segments?', options: ['Nagle algorithm', 'ARP', 'NAT', 'CRC'], answer: 0, explain: 'Nagle delays tiny sends so they combine.' },
  [`<p>Compute frame sizes first.</p>`, `<p>1 + 40 + 18 = 59 is under 64, so pad.</p>`, `<p>Efficiency = payload / 64 and payload / 1518.</p>`],
  `<p>Keystroke: 1 + 20 + 20 + 14 + 4 = 59 bytes, below the 64-byte Ethernet minimum, so the NIC pads to 64: efficiency = 1/64 = 1.6%. Full segment: 1460 + 58 = 1518 bytes, efficiency = 1460/1518 = 96.2%. The lesson: headers are a fixed cost, so small messages are dominated by overhead. Fixes: batch writes, Nagle's algorithm (disable with TCP_NODELAY when latency matters), HTTP/2 multiplexing, larger MTU (jumbo frames), and compressing headers. Real-time systems accept the overhead in exchange for latency.</p>`,
  { head: ['Case', 'Payload', 'Frame', 'Efficiency'], rows: [['keystroke', '1', '64 (padded)', '1.6%'], ['bulk', '1460', '1518', '96.2%']] },
  `<p>O(1).</p>`, ['What does TCP_NODELAY do?', 'Why do voice calls use small packets anyway?']));

practice.push(P('Design the layer map for a new protocol', 'Hard', ['design', 'layers'],
  `<p>A team builds a video-call app that sends media over UDP with its own retransmission and encryption. Place each concern in an OSI layer, and explain what the OS stack, the app and the network devices each handle. Why is it OK that QUIC "breaks" the layers?</p>`,
  `Mention transport, security, application framing.`,
  `<p>Media framing L7, crypto ~L6, reliability ${H.c('b', 'in the app over UDP (L4 service)')}.</p>`,
  `<p>Saying "UDP is unreliable so it cannot be used" misses how apps rebuild just the reliability they need.</p>`,
  { q: 'QUIC runs on top of…', options: ['TCP', 'UDP', 'ICMP', 'Ethernet only'], answer: 1, explain: 'QUIC is built on UDP in user space.' },
  [`<p>Which service does UDP give you? Which does it not?</p>`, `<p>Who can update faster: kernel or app?</p>`, `<p>Write each concern with the layer and who implements it (kernel, library, app).</p>`],
  `<p>Network devices only handle L1–L3 (and NAT/firewalls peek at L4). The OS provides UDP (L4: ports, checksum, no reliability) and IP (L3). The app (or a library like QUIC/WebRTC) implements on top: reliability and ordering only for what needs it (retransmit key frames, skip stale audio), congestion control, encryption (DTLS/QUIC TLS 1.3, roughly L6), session setup and media framing (L5–L7). Putting these in user space lets the team ship improvements without waiting for OS updates and avoids head-of-line blocking of TCP. Layers are an organising idea, not a law: a layer is allowed to be re-implemented above if it is the right trade-off, as long as the interfaces below (UDP/IP) are respected and the middleboxes can still pass the packets.</p>`,
  { head: ['Concern', 'Layer', 'Who'], rows: [['Ports, checksum', 'L4', 'OS (UDP)'], ['Reliability', 'L4-ish', 'app/QUIC'], ['Encryption', 'L6', 'library'], ['Media format', 'L7', 'app']] },
  `<p>Design reasoning, no complexity.</p>`, ['Why does UDP need port numbers?', 'How do NATs treat UDP flows?']));

practice.push(P('Debug: can ping gateway, cannot reach the Internet', 'Hard', ['troubleshooting', 'routing'],
  `<p>A host can ping its gateway (192.168.1.1) but not 8.8.8.8. List possible causes by layer and the evidence you would collect to separate them.</p>`,
  `At least four distinct causes.`,
  `<p>L2 fine → suspect ${H.c('y', 'L3 route / NAT / ISP / firewall')}.</p>`,
  `<p>Rebooting everything may hide the cause and teaches nothing for next time.</p>`,
  { q: 'Which command shows the default route?', options: ['ip route show', 'ip link', 'ss -tn', 'arp -a'], answer: 0, explain: 'The routing table lists "default via".' },
  [`<p>Gateway ping proves L1–L3 on the local link.</p>`, `<p>Next suspects: missing default route, router NAT, ISP, firewall.</p>`, `<p>Evidence: ip route, traceroute 8.8.8.8, ping from the router, tcpdump on both sides.</p>`],
  `<p>Pinging the gateway proves the cable, ARP and local IP are fine, so the fault is beyond the local link. Candidate causes: (1) no or wrong default route on the host (ip route show, expect default via 192.168.1.1); (2) the router lacks its upstream route or WAN link is down (check router status, ping its WAN IP); (3) NAT or firewall rule on the router blocks outbound traffic (counters, tcpdump on the WAN interface to see if packets leave); (4) the ISP or upstream is down (traceroute stops at the first hop after the router); (5) MTU or ICMP filtering problems (small pings work, big ones hang); (6) DNS is not the cause because we ping an IP. Collect evidence in order and change one thing at a time.</p>`,
  { head: ['Test', 'Result', 'Meaning'], rows: [['ping gateway', 'ok', 'L1-L3 local ok'], ['ping 8.8.8.8', 'fail', 'route/NAT/ISP'], ['traceroute', 'stops at hop 1', 'router/WAN']] },
  `<p>O(layers).</p>`, ['What if only large packets fail?', 'What does a TTL exceeded message mean?']));

quiz.push({ q: 'Which OSI layer is responsible for MAC addresses?', options: ['Network', 'Data Link', 'Transport', 'Physical'], answer: 1, explain: 'Layer 2 (Data Link) uses MAC addresses.' });
quiz.push({ q: 'A router mainly makes decisions using…', options: ['MAC address', 'IP address', 'TCP flags', 'HTTP cookies'], answer: 1, explain: 'Routers are layer 3 and route by destination IP.' });
quiz.push({ q: 'The TCP/IP model has how many layers?', options: ['3', '4', '5', '7'], answer: 1, explain: 'Application, Transport, Internet, Link.' });
quiz.push({ q: 'What is the name of the L4 PDU for TCP?', options: ['Frame', 'Packet', 'Segment', 'Bit'], answer: 2, explain: 'TCP data units are called segments.' });
quiz.push({ q: 'Total frame bytes for 1000 B payload over TCP/IPv4/Ethernet (with FCS)?', options: ['1040', '1054', '1058', '1078'], answer: 2, explain: '1000 + 20 + 20 + 14 + 4 = 1058.' });
quiz.push({ q: 'A switch splits…', options: ['Broadcast domains', 'Collision domains', 'IP subnets', 'DNS zones'], answer: 1, explain: 'Each port is a collision domain; a router (or VLAN) splits broadcast domains.' });
quiz.push({ q: 'A switch learns a host location from…', options: ['Destination MAC', 'Source MAC', 'Destination IP', 'DNS reply'], answer: 1, explain: 'It records the source MAC with the arrival port.' });
quiz.push({ q: 'Default port for HTTPS?', options: ['80', '22', '443', '8080'], answer: 2, explain: 'HTTPS uses TCP port 443 by default.' });
quiz.push({ q: 'Which field stays the same (without NAT) from sender to receiver across routers?', options: ['Destination MAC', 'Source MAC', 'Destination IP', 'Ethernet FCS'], answer: 2, explain: 'MACs and FCS are per link; the IP stays.' });
quiz.push({ q: 'Why can one server port serve thousands of clients?', options: ['Ports are infinite', 'Each connection has a unique 5-tuple', 'UDP only', 'Because of NAT'], answer: 1, explain: 'Source IP/port differ per client.' });
quiz.push({ q: 'A hub operates at which layer?', options: ['1', '2', '3', '4'], answer: 0, explain: 'It repeats bits (physical).' });
quiz.push({ q: 'A frame sent to ff:ff:ff:ff:ff:ff is…', options: ['Dropped by switches', 'Flooded within the broadcast domain', 'Routed to the Internet', 'Sent to the gateway only'], answer: 1, explain: 'Switches flood broadcasts inside the domain; routers stop them.' });

interview.push({ q: 'Explain the OSI model and why we use layers.', level: 'B', a: `<p>OSI splits networking into 7 layers: Physical (bits), Data Link (frames, MAC), Network (packets, IP), Transport (segments, ports; TCP/UDP), Session, Presentation and Application. Layers give modularity: each layer offers a simple service to the one above and can be replaced without touching the others (Wi-Fi vs cable, IPv4 vs IPv6). They also make debugging and teamwork easier because everyone shares vocabulary like "layer 2 problem". In practice the internet runs TCP/IP's 4 layers, and OSI remains the teaching vocabulary.</p>`, followUps: ['Which layers merge in TCP/IP?', 'Give a protocol per layer.'] });
interview.push({ q: 'OSI vs TCP/IP: what are the differences?', level: 'B', a: `<p>OSI has 7 layers and was designed as a reference model by a standards body; TCP/IP has 4 (Application, Transport, Internet, Link) and grew from working protocols. TCP/IP merges OSI session+presentation+application into one Application layer and physical+data link into one Link layer. OSI separates service, interface and protocol more strictly. TCP/IP won because implementations existed first and were free; OSI is used as a vocabulary.</p>`, followUps: ['Where does TLS fit?', 'Where does ARP fit?'] });
interview.push({ q: 'Describe encapsulation and decapsulation.', level: 'B', a: `<p>Encapsulation is each layer wrapping the data from the layer above with its own header (and sometimes a trailer): HTTP data gets a TCP header (segment), then an IP header (packet), then an Ethernet header and FCS (frame), then goes out as bits. Decapsulation is the reverse on the receiver: the NIC checks the frame and removes the Ethernet header, IP checks the destination and removes its header, TCP uses the port and hands the data to the app. Each header has a field that says what is inside (EtherType, IP protocol number, port), which tells the layer where to send the payload upward.</p>`, followUps: ['How many bytes of overhead for TCP/IPv4/Ethernet?', 'Which header changes per hop?'] });
interview.push({ q: 'Hub vs switch vs router?', level: 'B', a: `<p>A hub (L1) repeats bits to all ports: one collision domain, no intelligence. A switch (L2) reads destination MACs, learns source MACs in a table and forwards to a single port: one collision domain per port, still one broadcast domain. A router (L3) forwards packets between networks using IP and routing tables, and it separates broadcast domains. Home gear combines router, switch and Wi-Fi access point in one box. Layer-3 switches add routing in hardware.</p>`, followUps: ['What is a collision domain?', 'What is an L3 switch?'] });
interview.push({ q: 'Why do we need both MAC and IP addresses?', level: 'B', a: `<p>MAC addresses identify a network interface on the local link and are used for hop-by-hop delivery; they are flat and tied to hardware, so they cannot be aggregated for routing. IP addresses are hierarchical and assigned by location, so routers can store one prefix for a whole network and deliver end to end. At each hop IP says where the packet finally goes, and the MAC says who gets the frame next. ARP translates the next hop IP into its MAC.</p>`, followUps: ['What does ARP do?', 'Which of the two changes at a router?'] });
interview.push({ q: 'What is a port and a socket? What is the 5-tuple?', level: 'B', a: `<p>A port is a 16-bit number that identifies a program or service on a host for TCP/UDP. A socket is the OS endpoint (IP, port, protocol) a program uses to communicate. A TCP connection is uniquely identified by the 5-tuple (protocol, source IP, source port, destination IP, destination port), which is why a server can accept many clients on one listening port, since each client has a different IP or ephemeral port. Well-known ports: 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS.</p>`, followUps: ['What is the ephemeral range?', 'What is port exhaustion?'] });
interview.push({ q: 'How does a switch work? What is flooding?', level: 'B', a: `<p>A switch builds a MAC address table by learning the source MAC and arrival port of each frame. For a destination MAC found in the table it forwards to that port only; for broadcast or an unknown destination it floods the frame out of every port except the arrival port. Entries age out (about 5 minutes). Flooding is how it discovers hosts initially, and why a flooded network without STP and loops can suffer a broadcast storm.</p>`, followUps: ['How do VLANs change this?', 'What is MAC flooding?'] });
interview.push({ q: 'Walk through what happens when you open a website, focusing on layers.', level: 'I', a: `<p>The browser resolves the domain with DNS (UDP 53), opens a TCP connection to port 443 (SYN, SYN-ACK, ACK), does the TLS handshake and then sends the HTTP request. TCP adds ports, IP adds addresses, and because the server is remote the packet is sent to the default gateway: ARP finds the gateway MAC and an Ethernet frame is built. Switches forward by MAC; each router strips the L2 header, decrements TTL, looks up the route and builds a new frame. The server decapsulates upward, TCP passes bytes to the web server, and the response travels back the same way.</p>`, followUps: ['Where does NAT happen?', 'How many round trips before the first byte?'] });
interview.push({ q: 'Segment vs packet vs frame vs datagram?', level: 'I', a: `<p>They are the PDUs of different layers: a TCP segment (L4) is data plus a TCP header; an IP packet (L3) is a segment plus an IP header; an Ethernet frame (L2) is a packet plus Ethernet header and FCS. A UDP unit is called a datagram (and an IP packet is sometimes called an IP datagram). The packet survives end to end, the frame only on one link. People say "packet" loosely for all of them.</p>`, followUps: ['What is MTU and MSS?', 'What is fragmentation?'] });
interview.push({ q: 'Compute the header overhead of sending 1000 bytes over TCP/IPv4/Ethernet and explain the impact on small packets.', level: 'I', a: `<p>TCP 20 + IPv4 20 + Ethernet header 14 + FCS 4 = 58 bytes, so the frame is 1058 bytes and efficiency is about 94.5% (92.8% with preamble and inter-frame gap). Headers are a fixed cost, so one-byte messages reach only about 1.6% efficiency (the frame is padded to the 64-byte minimum). That is why we batch writes (Nagle), use larger MTUs in data centres and multiplex requests with HTTP/2. IPv6 and VLAN tags add more header bytes.</p>`, followUps: ['MSS for MTU 1500?', 'What does TSO do?'] });
interview.push({ q: 'What are collision and broadcast domains, and what splits them?', level: 'I', a: `<p>A collision domain is a set of devices that can interfere with each other on a shared medium; hubs create big ones, and each switch port (full duplex) is its own, so switches split collision domains. A broadcast domain is the set of devices that receive a layer-2 broadcast; switches pass broadcasts through, while routers and VLAN boundaries split them. Large broadcast domains cause ARP/broadcast noise and security risk, so networks are segmented with VLANs and routers.</p>`, followUps: ['How many domains in this topology?', 'Why can a broadcast storm occur?'] });
interview.push({ q: 'How do layers "leak" in the real world, and is that a problem?', level: 'A', a: `<p>Real systems cross layers for performance or function: NAT rewrites IP and ports together; TCP/UDP checksums cover IP pseudo-headers; firewalls and L7 load balancers inspect higher layers than routers should; QUIC re-implements reliability and TLS over UDP in user space; L3 switches route in L2 gear; TLS offload and TSO/GRO blur the boundaries between NIC and OS. This is acceptable when the interfaces stay stable and the trade-off is explicit, but it makes middlebox ossification a risk (new protocols break on boxes that expect TCP/UDP only), which is why QUIC encrypts almost everything.</p>`, followUps: ['What is ossification?', 'Why is QUIC over UDP not a new IP protocol?'] });

registerModule({
  langExplain: `<p><b>About the code here.</b> The examples show what the operating system or the network actually does, written in C++ (close to the real system calls) and short Python scripts you can run in the page. Read them to see the mechanism; you do not need to write C++ or Python to follow the lessons, the quiz or the interview questions. The same facilities exist in every language: threads and locks (<code>java.util.concurrent</code>, Python <code>threading</code>, Node worker threads, <code>std::thread</code>), sockets (<code>java.net</code>, Python <code>socket</code>, Node <code>net</code>, POSIX sockets) and files (<code>java.nio</code>, Python <code>open</code>, Node <code>fs</code>, <code>fstream</code>).</p>`,
  id: 'cs10',
  title: 'Networking Basics: OSI & TCP/IP',
  lang: 'cpp',
  intro: `<p>Everything online - a chat message, a video call, an AI API request - travels through <b>layers</b> of software and hardware. This module explains why networks are layered, what the OSI 7 layers and TCP/IP 4 layers are, how data is wrapped with headers on its way down and unwrapped on its way up, how hubs, switches and routers differ, why we need both MAC and IP addresses, and how ports and sockets get data to the right program. Everything starts with a post-office analogy and ends with real packet maths and interview-ready answers.</p>`,
  goals: ['Name the OSI 7 and TCP/IP 4 layers, with a real protocol and data unit for each', 'Trace an HTTP request down the sender stack, across switches and routers, and up the receiver stack', 'Compute header overhead and frame size for a payload over TCP/IPv4/Ethernet', 'Tell hub, switch and router apart, and count collision and broadcast domains', 'Explain what changes at each hop (MAC) and what stays (IP), and why both addresses exist', 'Use ports, sockets and the 5-tuple, and write a basic TCP client in C++'],
  prereqs: `Nothing special: basic comfort with the command line helps. Good to know: binary numbers and what an IP address looks like.`,
  hours: 8,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
