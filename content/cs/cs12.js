(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // compact problem builder (cs track: code optional, but solution.approach is a full written answer)
  function mk(o) {
    var p = {
      title: o.t, level: o.l, tags: o.tags, companies: o.co || undefined,
      statement: o.s, constraints: o.c || 'Pure numbers and reasoning. Show your working step by step.',
      example: o.ex,
      brute: { why: o.b },
      mcq: { q: o.q, options: o.o, answer: o.a, explain: o.e + ' Check this against the worked solution below.' },
      hints: o.h.map(function (x) { return x.replace(/<\/p>$/, ' Try it on paper first, then compare with the full solution.</p>'); }),
      solution: { approach: o.ap, complexity: o.cx || '<p>Hand calculation: a handful of steps. In an interview, say each formula out loud before plugging numbers in.</p>', followUps: o.f }
    };
    if (o.d) p.solution.dry = o.d;
    if (o.code) p.solution.code = o.code;
    return p;
  }

  topics.push({
    title: 'UDP: The Postcard Protocol',
    analogy: `<p><b>UDP is a postcard.</b> You write the address, drop it in the box, and walk away. No ring-the-bell, no "did you get it?", no guarantee the postcards arrive in order. <b>TCP is registered mail with a phone call first</b>: you agree to talk, every parcel is numbered, lost ones are re-sent, and you say goodbye at the end. Postcards are cheap and fast. Registered mail is safe and slower to start.</p>`,
    explain: `<p>The <b>transport layer</b> sits on top of IP. IP only moves packets from machine A to machine B ("best effort", they can be lost, duplicated or reordered). The transport layer adds <b>ports</b> (which program on that machine?) and, for TCP, extra promises.</p>
      <p><b>UDP (User Datagram Protocol)</b> adds almost nothing on top of IP: just ports, a length and a checksum. The whole header is only <b>8 bytes</b>.</p>
      ${H.table(['UDP field', 'Size', 'What it means'], [['Source port', '16 bits', 'Which program sent it (so replies can come back)'], ['Destination port', '16 bits', 'Which program should get it (53 = DNS, 443 = QUIC/HTTP3)'], ['Length', '16 bits', 'Header + data in bytes (min 8)'], ['Checksum', '16 bits', 'Detects corruption (optional in IPv4, required in IPv6)']])}
      <p>What UDP does <b>not</b> do: no connection set-up, no retransmission, no ordering, no flow control, no congestion control. Each datagram stands alone with its message boundary kept (send 3 datagrams, receive 3 datagrams). TCP is a <i>byte stream</i> with no message boundaries.</p>
      <p><b>Why use something with fewer promises?</b> Because sometimes late data is worse than lost data, and because you may want to build your own promises:</p>
      <ul><li><b>DNS</b>: one tiny question, one tiny answer. A handshake would triple the cost. If lost, just ask again.</li><li><b>Video calls / live streaming</b>: a frame that arrives 2 seconds late is useless. Skip it.</li><li><b>Online games</b>: "where is the player now" is outdated in 50 ms. Always send the newest state.</li><li><b>QUIC / HTTP/3</b>: built on UDP so it can do its own reliability per stream without TCP's head-of-line blocking, and it can be updated in user space.</li><li><b>Others</b>: DHCP, NTP, VoIP (RTP), WireGuard, mDNS, syslog, SNMP.</li></ul>`,
    clues: ['"real-time", "low latency", "OK to drop a frame / old data is useless" → UDP', '"one small request and one small response" (DNS, NTP, DHCP) → UDP', '"broadcast or multicast" → only UDP can do it (TCP is strictly one-to-one)', '"must not lose or reorder bytes" (file, payment, SSH, database) → TCP', '"build own reliability / avoid head-of-line blocking / HTTP/3" → QUIC over UDP', '"header overhead" asked → UDP 8 bytes vs TCP 20+ bytes'],
    code: [{ lang: 'python', title: 'UDP echo with real sockets on localhost (read-only, not run in browser)', check: true, code: `# A tiny UDP echo pair. Note: no connect/accept, no handshake.
import socket

def server_once(sock):
    data, addr = sock.recvfrom(2048)       # one whole datagram, boundaries preserved
    sock.sendto(b"echo:" + data, addr)     # reply straight to whoever sent it

def demo():
    srv = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)   # SOCK_DGRAM = UDP
    srv.bind(("127.0.0.1", 0))                                # port 0 = OS picks a free port
    cli = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    cli.sendto(b"hello", srv.getsockname())                   # fire and forget
    server_once(srv)
    print(cli.recvfrom(2048)[0])

if __name__ == "__main__":
    print("run demo() on your own machine")` },
    `// C++ UDP sender: one datagram, no connection at all
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstring>
#include <cstdio>

int main() {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);          // SOCK_DGRAM = UDP
    if (fd < 0) { perror("socket"); return 1; }
    sockaddr_in dst{};
    dst.sin_family = AF_INET;
    dst.sin_port = htons(9999);                       // network byte order (big endian)
    inet_pton(AF_INET, "127.0.0.1", &dst.sin_addr);
    const char* msg = "ping";
    // sendto returns right away. Nobody tells us whether it arrived.
    ssize_t n = sendto(fd, msg, strlen(msg), 0, reinterpret_cast<sockaddr*>(&dst), sizeof dst);
    printf("sent %zd bytes\\n", n);
    close(fd);
    return 0;
}`],
    codeTitle: ['Python: UDP echo (no handshake)', 'C++: send one UDP datagram'],
    viz: {
      title: 'UDP vs TCP: headers, then pick a protocol per app',
      input: 'DNS, video call, bank transfer, online game, file download',
      inputLabel: 'Apps (comma separated)',
      gen: function (input) {
        var apps = String(input).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!apps.length) throw new Error('Type a few app names separated by commas, e.g. DNS, video call, bank transfer');
        if (apps.length > 6) throw new Error('Use at most 6 apps');
        var frames = [];
        frames.push({ narr: '<b>UDP header: only 8 bytes.</b> Four 16-bit fields. Nothing about order, windows or connections.', parts: [
          { type: 'table', label: 'UDP header (8 bytes)', columns: ['Field', 'Bits', 'Byte offset'], rows: [['Source port', 16, '0-1'], ['Destination port', 16, '2-3'], ['Length', 16, '4-5'], ['Checksum', 16, '6-7']], hl: { 0: 'cur', 1: 'cur', 2: 'win', 3: 'win' } }
        ] });
        frames.push({ narr: '<b>TCP header: 20 bytes minimum</b> (up to 60 with options). Every extra field is a promise: ordering, reliability, flow control.', parts: [
          { type: 'table', label: 'TCP header (20+ bytes)', columns: ['Field', 'Bits', 'Why it exists'], rows: [['Source / Dest port', '16 + 16', 'Which programs'], ['Sequence number', 32, 'Position of my first byte'], ['Acknowledgment number', 32, 'Next byte I expect from you'], ['Data offset + flags', '4 + 9', 'Header length; SYN ACK FIN RST PSH URG...'], ['Window', 16, 'Receiver window: flow control'], ['Checksum + urgent ptr', '16 + 16', 'Corruption check'], ['Options', 'varies', 'MSS, window scale, SACK, timestamps']], hl: { 1: 'sel', 2: 'sel', 4: 'ok' } }
        ] });
        frames.push({ narr: 'Side by side: UDP trades promises for speed and simplicity.', parts: [
          { type: 'table', label: 'UDP vs TCP', columns: ['Feature', 'UDP', 'TCP'], rows: [['Header', '8 bytes', '20-60 bytes'], ['Connection', 'None', '3-way handshake'], ['Delivery', 'Best effort', 'Reliable, retransmits'], ['Ordering', 'No', 'Yes'], ['Flow / congestion control', 'No', 'Yes'], ['Boundaries', 'Kept per datagram', 'Byte stream'], ['Broadcast / multicast', 'Yes', 'No']] }
        ] });
        var udp = { dns: 'tiny request/response, retry is cheap', ntp: 'tiny and time-sensitive', dhcp: 'client has no IP yet, broadcast', video: 'late frame is useless, skip it', voip: 'late audio is useless', call: 'late frames are useless', stream: 'live data, newest wins', game: 'newest state matters, old is junk', quic: 'QUIC is built on UDP to avoid TCP head-of-line blocking', http3: 'HTTP/3 runs on QUIC over UDP', wireguard: 'VPN does its own thing over UDP' };
        var tcp = { bank: 'every byte must arrive exactly once, in order', payment: 'money cannot be lost or doubled', file: 'one flipped byte corrupts the file', download: 'reliable bytes, congestion friendly', web: 'HTTP/1.1 and HTTP/2 need ordered bytes', http: 'HTTP/1.1 and HTTP/2 need ordered bytes', ssh: 'every keystroke must arrive in order', email: 'SMTP needs reliable delivery', smtp: 'SMTP needs reliable delivery', database: 'queries and results must not be lost', sql: 'queries and results must not be lost' };
        var rows = [];
        apps.forEach(function (a, idx) {
          var k = a.toLowerCase(), verdict = null, why = '';
          Object.keys(udp).forEach(function (w) { if (!verdict && k.indexOf(w) >= 0) { verdict = 'UDP'; why = udp[w]; } });
          Object.keys(tcp).forEach(function (w) { if (!verdict && k.indexOf(w) >= 0) { verdict = 'TCP'; why = tcp[w]; } });
          if (!verdict) { verdict = 'TCP'; why = 'default: when unsure and data must be correct, start with TCP'; }
          rows.push([a, verdict, why]);
          frames.push({ narr: 'Ask: <i>"Is late data worse than lost data?"</i> For <b>' + H.esc(a) + '</b> → <b class="' + (verdict === 'UDP' ? 'c-y' : 'c-g') + '">' + verdict + '</b> (' + why + ').', parts: [
            { type: 'table', label: 'Verdicts so far', columns: ['App', 'Pick', 'Reason'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[idx] = 'sel'; return h; })() }
          ] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'Header overhead: why DNS loves UDP', html: `<p>A DNS question is about 30 bytes. Over UDP: 1 packet out, 1 packet back. Over TCP: SYN, SYN-ACK, ACK, query, answer, FIN... around <b>7+ packets</b> and 1.5 extra round trips of waiting. That is why DNS defaults to UDP (port 53) and only falls back to TCP for large answers (over about 512 bytes without EDNS, or DNSSEC / zone transfers).</p>` },
      { title: 'Reading the UDP Length field', html: `<p>A captured datagram has Length = <b>108</b>. The header is always 8 bytes, so the payload is <b>108 − 8 = 100 bytes</b>. The theoretical max Length is 65,535, so max payload is 65,507 over IPv4 (minus a 20-byte IP header too).</p>` },
      { title: 'A game server loop', html: `<p>Every 16 ms (60 Hz) the client sends its position. If packet #7 is lost, resending it is pointless because packet #8 already carries newer data. With TCP, one lost packet would <b>stall</b> all later ones until the resend arrives. This is the classic "head-of-line blocking" a game cannot afford.</p>` }
    ],
    deepDive: `<p><b>Checksum details.</b> UDP and TCP checksums cover the payload <i>and</i> a "pseudo-header" (source IP, destination IP, protocol, length). So a packet delivered to the wrong IP is caught. A zero checksum in UDP/IPv4 means "not computed"; in IPv6 it is mandatory (except special tunnels). The checksum is weak (16-bit ones' complement), which is why TLS or application checksums still matter for files.</p>
      <p><b>Datagram size and fragmentation.</b> Ethernet MTU is 1500 bytes, so a safe UDP payload is about 1472 bytes (1500 − 20 IP − 8 UDP). Bigger datagrams get IP-fragmented, and losing any fragment loses the whole datagram. Real systems (QUIC, WebRTC, DNS with EDNS0) keep packets near 1200-1400 bytes to dodge fragmentation and path-MTU black holes.</p>
      <p><b>"UDP is unreliable" does not mean "UDP is bad".</b> It means the network layer promise is exposed raw. QUIC, RTP, game netcode, Aeron, and many databases add exactly the reliability they need: per-stream ordering, selective repeat, forward error correction, or none at all. UDP is also easier to push through NAT and to hardware-offload (GSO/GRO, <code>sendmmsg</code>, <code>recvmmsg</code>).</p>
      <p><b>Amplification attacks.</b> Because UDP has no handshake, the source IP can be forged. Attackers send a tiny DNS/NTP/memcached query with the victim's IP as source, and a big reply hits the victim (amplification factors up to thousands for memcached). Defences: ingress filtering (BCP38), response rate limiting, disabling open resolvers, and QUIC's rule that the server may send only 3x what it received before the address is validated.</p>`,
    aiEra: `<p><b>What AI changes:</b> real-time AI is UDP-heavy. Voice assistants and live translation stream audio over WebRTC (RTP over UDP) because a 300 ms delay ruins a conversation. Model token streaming, in contrast, runs over TCP (HTTP/SSE or WebSockets) because every token must arrive and in order.</p>
      <p><b>Use AI as a partner:</b> ask <code>Give me 5 apps and make me justify TCP vs UDP for each without looking</code>, or <code>Read this pcap summary and tell me which flows are UDP and why</code>. Let it generate Wireshark filters (<code>udp.port == 53</code>).</p>
      <p><b>Where AI goes wrong:</b> it often says "UDP is faster than TCP" as a blanket rule. Not true for bulk transfer: TCP with window scaling and good congestion control saturates a link, and badly written UDP can be slower and unfair. It may also forget QUIC runs on UDP.</p>
      <p><b>What you must still own:</b> the question "what is worse, a late packet or a lost one?", and explaining who provides reliability when TCP is not used.</p>`,
    problems: [mk({
      t: 'Pick the Transport for Six Apps', l: 'Easy', tags: ['tcp vs udp', 'fundamentals'], co: ['Amazon', 'Cisco'],
      s: `<p>For each app choose TCP or UDP and give one reason: (1) DNS lookup, (2) Zoom video call, (3) online banking transfer, (4) multiplayer shooter position updates, (5) software update download, (6) HTTP/3 web page.</p>`,
      ex: `<p>DNS lookup → ${H.c('y', 'UDP')}: one small question, one small answer, retry is cheap.</p>`,
      b: `<p>"Always TCP, it is safer." This pays handshake cost for DNS and stalls games and calls behind one lost packet (head-of-line blocking).</p>`,
      q: 'The key question to ask for each app is…', o: ['Which is faster on paper?', 'Is late data worse than lost data, and who guarantees correctness?', 'Which has a bigger header?', 'Which port number is used?'], a: 1,
      e: 'Real-time apps prefer dropping to waiting; correctness-critical apps need TCP (or a reliable layer on top of UDP).',
      h: [`<p>Hint 1: Ask "if one packet vanishes, can I just move on?"</p>`, `<p>Hint 2: Anything involving money or files needs every byte.</p>`, `<p>Hint 3: HTTP/3 is not a trick: it rides on QUIC, which rides on UDP.</p>`],
      ap: `<p>1) DNS: UDP, tiny exchange, client retries if no answer. 2) Zoom: UDP (RTP/SRTP), an old video frame is worthless, codecs hide loss. 3) Banking: TCP, with TLS on top, no byte may be lost or reordered. 4) Shooter: UDP, only the newest position matters; the game adds its own sequence numbers and sends critical events reliably. 5) Update download: TCP, one flipped byte corrupts the file and TCP fills the pipe fairly. 6) HTTP/3: UDP via QUIC, which adds per-stream reliability, encryption and avoids TCP head-of-line blocking.</p>`,
      d: { head: ['App', 'Late worse than lost?', 'Pick'], rows: [['DNS', 'No, just retry', 'UDP'], ['Zoom', 'Yes', 'UDP'], ['Bank', 'No, lost is fatal', 'TCP'], ['Shooter', 'Yes', 'UDP'], ['Update', 'No', 'TCP'], ['HTTP/3', 'QUIC handles it', 'UDP (QUIC)']] },
      f: ['Which of these could use TCP and which could not? (Broadcast cannot.)', 'How does QUIC give reliability on UDP?']
    })]
  });
  topics.push({
    title: 'TCP Header, Sequence Numbers & ACKs',
    analogy: `<p>Imagine sending a long book by mail, one page-bundle per envelope. You write on each envelope <b>"this starts at byte 1001"</b> (sequence number). The reader replies <b>"I have everything up to 1100, send 1101 next"</b> (acknowledgment number). If envelope 1101 is missing, they keep saying "send 1101" until it shows up. TCP numbers <i>bytes</i>, not packets.</p>`,
    explain: `<p>Every TCP segment has a 20-byte (minimum) header. These fields matter most for interviews:</p>
      ${H.table(['Field', 'Size', 'Plain meaning'], [['Source / Dest port', '16 + 16', 'Which programs talk. A connection is the 4-tuple (src IP, src port, dst IP, dst port)'], ['<b>Sequence number</b>', '32', 'Byte-stream position of the <i>first data byte</i> in this segment'], ['<b>Acknowledgment number</b>', '32', 'The <i>next byte I expect</i> from you (valid if ACK flag is set)'], ['Data offset', '4', 'Header length in 4-byte words (5 = 20 bytes)'], ['Flags', '9', 'SYN (open), ACK, FIN (close), RST (abort), PSH (push now), URG, ECE, CWR'], ['<b>Window</b>', '16', 'How many more bytes I can buffer (rwnd). Scaled by an option'], ['Checksum', '16', 'Header + data + pseudo-header'], ['Options', 'up to 40 B', 'MSS, window scale, SACK-permitted, timestamps']])}
      <p><b>The one rule of the maths:</b> the ACK number = (last byte received in order) + 1 = the sequence number of the next byte wanted. For a data segment, next expected = seq + length.</p>
      <p><b>SYN and FIN each consume one sequence number</b>, even though they carry no data. A pure ACK carries no data and consumes none.</p>
      ${H.table(['Step', 'Segment', 'seq', 'ack', 'len', 'Why'], [['1', 'client → SYN', '1000', '-', '0', 'ISN = 1000, uses 1 number'], ['2', 'server → SYN+ACK', '5000', '1001', '0', 'wants client byte 1001 next'], ['3', 'client → ACK', '1001', '5001', '0', 'server SYN used 5000'], ['4', 'client → DATA', '1001', '5001', '100', 'bytes 1001-1100'], ['5', 'server → ACK', '5001', '1101', '0', '1001 + 100 = 1101']])}
      <p><b>Cumulative ACK:</b> an ACK of 1101 means "everything before 1101 is received". One ACK can confirm many segments. <b>Duplicate ACK:</b> the same number again means "I'm stuck waiting for this byte".</p>
      <p><b>MSS</b> (maximum segment size) is the biggest data chunk per segment: usually 1460 bytes on Ethernet (1500 MTU − 20 IP − 20 TCP). Both sides announce theirs in the SYN options.</p>`,
    clues: ['"fill in the seq and ack numbers" → ack = seq + length (SYN/FIN count as 1)', '"what ACK does the receiver send" → next byte expected, not last byte received', '"ISN" / "initial sequence number" → random 32-bit value so old packets from past connections are not confused', '"three duplicate ACKs" → same ack number repeated: a hole in the stream', '"sequence number wraps" → arithmetic is modulo 2<sup>32</sup> (about 4.29 billion)', '"does TCP number packets or bytes" → bytes'],
    code: [{ lang: 'python', run: true, title: 'Handshake + data + teardown with seq/ack math (runnable)', code: `# Prints a TCP conversation and computes every seq/ack for you.
# Rules: SYN and FIN consume 1 sequence number, data consumes len, pure ACK consumes 0.
MOD = 2 ** 32  # sequence numbers wrap

def show(n, who, flags, seq, ack, ln):
    arrow = "--->" if who == "C" else "<---"
    a = "-" if ack is None else ack
    print(f"{n:>2}  C {arrow} S  [{flags:<8}] seq={seq:<10} ack={a:<10} len={ln}")

def conversation(c_isn, s_isn, chunks):
    n = 1
    # three-way handshake
    show(n, "C", "SYN", c_isn, None, 0); n += 1
    show(n, "S", "SYN,ACK", s_isn, (c_isn + 1) % MOD, 0); n += 1
    c_next = (c_isn + 1) % MOD      # next seq the client will use
    s_next = (s_isn + 1) % MOD      # next seq the server will use
    show(n, "C", "ACK", c_next, s_next, 0); n += 1
    # client sends data, server ACKs each segment (cumulative)
    for size in chunks:
        show(n, "C", "PSH,ACK", c_next, s_next, size); n += 1
        c_next = (c_next + size) % MOD          # next byte after this segment
        show(n, "S", "ACK", s_next, c_next, 0); n += 1   # ack = seq + len
    # teardown: client closes first
    show(n, "C", "FIN,ACK", c_next, s_next, 0); n += 1
    c_next = (c_next + 1) % MOD                 # FIN used one number
    show(n, "S", "ACK", s_next, c_next, 0); n += 1
    show(n, "S", "FIN,ACK", s_next, c_next, 0); n += 1
    s_next = (s_next + 1) % MOD
    show(n, "C", "ACK", c_next, s_next, 0); n += 1
    print("client now waits 2*MSL in TIME_WAIT, server is CLOSED")

conversation(1000, 5000, [100, 100, 50])
print("--- wrap-around demo ---")
conversation(4294967290, 7, [20])` }],
    codeTitle: ['Python: seq/ack conversation printer'],
    viz: {
      title: 'Seq/ack ladder: handshake then data',
      input: '1000 5000 100 200 50',
      inputLabel: 'client ISN, server ISN, then data sizes (space separated)',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 3 || t.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error('Enter: clientISN serverISN size1 [size2 ...] (non-negative numbers)');
        if (t.length > 8) throw new Error('At most 6 data segments');
        var MOD = 4294967296, c = t[0] % MOD, s = t[1] % MOD, sizes = t.slice(2);
        var rows = [], frames = [];
        function add(dir, flags, seq, ack, len, narr, vals) {
          rows.push([rows.length + 1, dir, flags, seq, ack === null ? '-' : ack, len]);
          var hl = {}; hl[rows.length - 1] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'Message ladder', columns: ['#', 'Direction', 'Flags', 'seq', 'ack', 'len'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'vars', label: 'Next numbers', vals: vals }
          ] });
        }
        var cn = (c + 1) % MOD, sn = (s + 1) % MOD;
        add('C ──SYN──▶ S', 'SYN', c, null, 0, 'Client picks ISN <b>' + c + '</b> and sends SYN. The SYN itself uses one number, so the next client byte will be <b>' + cn + '</b>.', { client_next_seq: cn, server_next_seq: '?' });
        add('C ◀──SYN,ACK── S', 'SYN,ACK', s, cn, 0, 'Server picks ISN <b>' + s + '</b> and acknowledges <b>' + c + ' + 1 = ' + cn + '</b> ("I expect byte ' + cn + ' next").', { client_next_seq: cn, server_next_seq: sn });
        add('C ──ACK──▶ S', 'ACK', cn, sn, 0, 'Client acknowledges the server SYN: <b>' + s + ' + 1 = ' + sn + '</b>. Connection ESTABLISHED. Pure ACK uses no sequence number.', { client_next_seq: cn, server_next_seq: sn });
        sizes.forEach(function (len, i) {
          var after = (cn + len) % MOD;
          add('C ──DATA──▶ S', 'PSH,ACK', cn, sn, len, 'Segment ' + (i + 1) + ': bytes <b>' + cn + '</b> to <b>' + ((cn + len - 1) % MOD) + '</b> (' + len + ' bytes).', { client_next_seq: after, server_next_seq: sn });
          add('C ◀──ACK── S', 'ACK', sn, after, 0, 'Server answers <b>ack = ' + cn + ' + ' + len + ' = ' + after + '</b>: "got everything before ' + after + '".', { client_next_seq: after, server_next_seq: sn });
          cn = after;
        });
        return frames;
      }
    },
    examples: [
      { title: 'Fill the blanks', html: `<p>Client ISN = 1000, server ISN = 5000. After the handshake the client sends 100 bytes. Segment: <b>seq = 1001, ack = 5001, len = 100</b>. Server's reply: <b>ack = 1101</b>.</p>` },
      { title: 'Two segments, one ACK (cumulative)', html: `<p>Client sends seq=1101 len=100 and seq=1201 len=50. Server may send just one ACK: <b>ack = 1251</b> (1201 + 50). This is why ACK count is often half the segment count (delayed ACK: ACK every second full segment).</p>` },
      { title: 'Wrap around', html: `<p>Sequence numbers are mod 2<sup>32</sup>. ISN = 4294967290 and 20 bytes of data starting at 4294967291: next seq = (4294967291 + 20) mod 4294967296 = <b>15</b>. Comparisons use "serial number arithmetic" so 15 counts as "after" 4294967291.</p>`, code: { lang: 'python', run: true, code: `MOD = 2 ** 32\nseq = 4294967291\nprint((seq + 20) % MOD)   # 15` } }
    ],
    deepDive: `<p><b>Why a random ISN?</b> If every connection started at 0, a delayed packet from an old connection with the same 4-tuple could land inside a new one and look valid. Modern stacks use a keyed hash of the 4-tuple plus a clock (RFC 6528), so attackers also cannot guess it and inject packets (blind spoofing).</p>
      <p><b>Segments vs bytes.</b> The sender's <code>write()</code> calls do not map to segments. The kernel may merge three small writes into one segment (Nagle) or split one 1 MB write into 700 segments. The receiver's <code>read()</code> can return any split too. That is why protocols on TCP need their own framing (length prefix, delimiter).</p>
      <p><b>SACK (selective acknowledgment).</b> A plain cumulative ACK says nothing about data after a hole. With SACK (option negotiated in SYN) the receiver adds blocks: "I have 1201-1400 and 1501-1700", so the sender retransmits only the real holes. Nearly all stacks use it today.</p>
      <p><b>Timestamps and PAWS.</b> On very fast links, 2<sup>32</sup> bytes can pass in about 3 seconds at 10 Gbps, so an old segment could reappear with a legal-looking seq. TCP timestamps (PAWS) reject segments with older timestamps. The same option feeds better RTT measurements.</p>
      <p><b>Checksum offload.</b> NICs compute the checksum, so captures on the sending host often show "incorrect checksum" falsely. Not a bug.</p>`,
    aiEra: `<p><b>What AI changes:</b> reading a packet capture is now a chat. Paste a <code>tcpdump -nn -S</code> trace and ask an assistant to explain each line. It is good at spotting retransmissions and zero windows.</p>
      <p><b>Use AI as a partner:</b> ask it to produce 10 random seq/ack fill-in-the-blank exercises with answers hidden, then check yourself. Ask it to generate a Python script that parses <code>tcpdump</code> output and flags duplicate ACKs.</p>
      <p><b>Where AI goes wrong:</b> off-by-one in the ACK number (says last byte received instead of next byte expected), forgetting SYN/FIN consume a number, or claiming the sequence number counts packets. Always recompute by hand.</p>
      <p><b>What you must still own:</b> the rule "ack = seq + len (+1 for SYN/FIN)". You will be asked to do it on a whiteboard with no tool.</p>`,
    problems: [mk({
      t: 'Fill the Seq and Ack Numbers', l: 'Easy', tags: ['seq/ack', 'handshake'], co: ['Cisco', 'Juniper', 'Google'],
      s: `<p>Client ISN = 1000, server ISN = 5000. After the 3-way handshake, the client sends three segments of 100, 100 and 50 bytes. The server ACKs each. Then the client sends FIN. Fill in seq/ack for every message and the final ACK to the FIN.</p>`,
      ex: `${H.table(['#', 'From', 'seq', 'ack'], [['1', 'C SYN', '1000', '-'], ['2', 'S SYN+ACK', '5000', '1001'], ['3', 'C ACK', '1001', '5001']])}<p>Start of the answer: the SYN used number 1000, so the next is 1001.</p>`,
      b: `<p>Guessing ack = "the last seq received". That is off by one: ACK is always the <i>next</i> byte expected.</p>`,
      q: 'Server receives seq=1101, len=100. What ack does it send?', o: ['1100', '1101', '1201', '1200'], a: 2, e: 'Next expected byte = 1101 + 100 = 1201.',
      h: [`<p>Hint 1: SYN consumes one sequence number.</p>`, `<p>Hint 2: ack = seq + len for data.</p>`, `<p>Hint 3: FIN consumes one number too, so the ACK to FIN is seq + 1.</p>`],
      ap: `<p>Handshake: SYN seq=1000; SYN+ACK seq=5000 ack=1001; ACK seq=1001 ack=5001. Data: seg1 seq=1001 len=100 → server ack=1101; seg2 seq=1101 len=100 → ack=1201; seg3 seq=1201 len=50 → ack=1251. The server's own seq stays 5001 because it sent no data. FIN: client seq=1251, ack=5001; server ACK has ack=1252 (FIN used number 1251). Rule: next = seq + len, add 1 for SYN or FIN.</p>`,
      d: { head: ['#', 'Segment', 'seq', 'ack', 'len'], rows: [['1', 'C SYN', '1000', '-', '0'], ['2', 'S SYN+ACK', '5000', '1001', '0'], ['3', 'C ACK', '1001', '5001', '0'], ['4', 'C data1', '1001', '5001', '100'], ['5', 'S ACK', '5001', '1101', '0'], ['6', 'C data2', '1101', '5001', '100'], ['7', 'S ACK', '5001', '1201', '0'], ['8', 'C data3', '1201', '5001', '50'], ['9', 'S ACK', '5001', '1251', '0'], ['10', 'C FIN', '1251', '5001', '0'], ['11', 'S ACK', '5001', '1252', '0']] },
      f: ['What if the server ACKs only after segments 2 and 3?', 'What if segment 2 is lost: which ack does the server send after segment 3 arrives?']
    })]
  });
  topics.push({
    title: 'Handshake, Teardown, Half-Close & the State Machine',
    analogy: `<p><b>A phone call.</b> Handshake: "Hello?" (SYN) / "Hello, I can hear you, can you hear me?" (SYN-ACK) / "Yes, I hear you" (ACK). Now both know both directions work. Hanging up politely: "I'm done talking" (FIN) / "OK" (ACK) ... later "I'm done too" (FIN) / "OK" (ACK). Each direction is closed separately, so one person may say "I'm done" but keep listening: that is a <b>half-close</b>.</p>`,
    explain: `<p><b>Why 3 messages to open?</b> Both sides must (1) say their starting sequence number (ISN) and (2) get proof the other heard it. SYN carries client ISN; SYN-ACK carries server ISN and acks the client's; the final ACK acks the server's. Two messages would leave the server unsure its reply was received.</p>
      ${H.table(['#', 'Message', 'Client state', 'Server state'], [['0', '-', 'CLOSED', 'LISTEN'], ['1', 'C → S: SYN, seq=x', 'SYN_SENT', 'LISTEN'], ['2', 'S → C: SYN+ACK, seq=y, ack=x+1', 'SYN_SENT', 'SYN_RCVD'], ['3', 'C → S: ACK, ack=y+1', 'ESTABLISHED', 'ESTABLISHED']])}
      <p><b>Closing takes 4 messages</b> because each direction closes on its own: FIN, ACK, FIN, ACK. The side that sends the first FIN is the <b>active closer</b>; it ends in <b>TIME_WAIT</b>. The other side goes through CLOSE_WAIT then LAST_ACK, then CLOSED.</p>
      ${H.table(['#', 'Message', 'Active closer', 'Passive closer'], [['1', 'A → B: FIN', 'FIN_WAIT_1', 'ESTABLISHED'], ['2', 'B → A: ACK', 'FIN_WAIT_2', 'CLOSE_WAIT'], ['3', 'B → A: FIN', 'FIN_WAIT_2', 'LAST_ACK'], ['4', 'A → B: ACK', 'TIME_WAIT (2·MSL)', 'CLOSED']])}
      <p><b>Half-close:</b> after A sends FIN, A can no longer send, but B may keep sending for a long time (<code>shutdown(fd, SHUT_WR)</code>). Example: a client sends a whole request, half-closes to say "that's all", then reads the response. B being in <b>CLOSE_WAIT</b> just means "the other side finished, my app has not called close() yet". Many CLOSE_WAIT sockets = a bug in <i>your</i> program (forgot close()).</p>
      <p><b>Other lifecycle bits:</b> <code>RST</code> aborts at once (no graceful close): sent when connecting to a closed port or when a process crashes with unread data. Combining FIN with ACK in message 3 is normal; if both sides close at the same time you get the rare <b>CLOSING</b> state.</p>
      <p>The kernel keeps two queues per listening socket: the <b>SYN queue</b> (half-open, SYN_RCVD) and the <b>accept queue</b> (fully established, waiting for <code>accept()</code>). <code>listen(fd, backlog)</code> sizes the accept queue.</p>`,
    clues: ['"why three-way, not two" → agree on both ISNs + prove both directions work', '"why four messages to close" → each direction closed independently (half-close)', '"which side ends in TIME_WAIT" → the one that sent the first FIN (active closer)', '"many CLOSE_WAIT sockets" → application forgot to call close()', '"many SYN_RECV" → SYN flood or tiny backlog', '"connection refused" → got RST (nothing listening); "timed out" → SYN dropped by firewall/unreachable', '"draw the TCP state diagram" → CLOSED → LISTEN/SYN_SENT → ESTABLISHED → FIN states'],
    code: [`// A TCP echo server in C++ (POSIX). Shows the server-side lifecycle:
// socket -> setsockopt -> bind -> listen -> accept -> read/write -> close
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>   // TCP_NODELAY
#include <arpa/inet.h>
#include <unistd.h>
#include <cstdio>
#include <cstring>

int main() {
    int srv = socket(AF_INET, SOCK_STREAM, 0);             // SOCK_STREAM = TCP
    if (srv < 0) { perror("socket"); return 1; }

    // SO_REUSEADDR: allow bind() even if old connections are still in TIME_WAIT
    // on this port. Without it, restarting the server fails with "Address already in use".
    int on = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);              // all interfaces
    addr.sin_port = htons(8080);                           // network byte order
    if (bind(srv, reinterpret_cast<sockaddr*>(&addr), sizeof addr) < 0) { perror("bind"); return 1; }

    // listen() moves the socket to LISTEN. 128 = accept-queue length (backlog).
    if (listen(srv, 128) < 0) { perror("listen"); return 1; }

    for (;;) {
        sockaddr_in peer{};
        socklen_t len = sizeof peer;
        // accept() returns a NEW fd for an ESTABLISHED connection (handshake already done by kernel)
        int c = accept(srv, reinterpret_cast<sockaddr*>(&peer), &len);
        if (c < 0) { perror("accept"); continue; }

        // TCP_NODELAY: turn off Nagle so small replies go out immediately (low latency).
        setsockopt(c, IPPROTO_TCP, TCP_NODELAY, &on, sizeof on);

        char buf[4096];
        ssize_t n;
        // read() returns 0 when the peer sent FIN (half-close seen: we are in CLOSE_WAIT)
        while ((n = read(c, buf, sizeof buf)) > 0) {
            ssize_t sent = 0;
            while (sent < n) {                             // write() may send only part
                ssize_t w = write(c, buf + sent, n - sent);
                if (w < 0) { perror("write"); break; }
                sent += w;
            }
        }
        close(c);   // sends our FIN. If we close first we become the active closer: TIME_WAIT here.
    }
}`],
    codeTitle: ['C++: TCP echo server with SO_REUSEADDR and TCP_NODELAY'],
    viz: [{
      title: 'Handshake and teardown ladder with state per side',
      input: '1000 5000',
      inputLabel: 'client ISN, server ISN',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error('Enter two numbers: clientISN serverISN');
        var x = t[0], y = t[1], rows = [], frames = [];
        function step(arrow, label, seq, ack, cs, ss, narr) {
          rows.push([rows.length + 1, arrow, label, seq, ack, cs, ss]);
          var hl = {}; hl[rows.length - 1] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'Message ladder', columns: ['#', 'Direction', 'Flags', 'seq', 'ack', 'Client state', 'Server state'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'vars', label: 'State per side', vals: { client: cs, server: ss }, hl: { client: 'cur', server: 'sel' } }
          ] });
        }
        frames.push({ narr: 'Before anything: the server called <code>listen()</code> and sits in LISTEN. The client is CLOSED.', parts: [
          { type: 'vars', label: 'State per side', vals: { client: 'CLOSED', server: 'LISTEN' }, hl: { client: 'cur', server: 'sel' } }
        ] });
        step('C ──▶ S', 'SYN', x, '-', 'SYN_SENT', 'LISTEN', 'Client <code>connect()</code>: sends <b>SYN</b> with ISN ' + x + ' and moves to SYN_SENT.');
        step('C ◀── S', 'SYN,ACK', y, x + 1, 'SYN_SENT', 'SYN_RCVD', 'Server gets the SYN, replies with its own ISN <b>' + y + '</b> and ack <b>' + (x + 1) + '</b>. Half-open entry sits in the SYN queue.');
        step('C ──▶ S', 'ACK', x + 1, y + 1, 'ESTABLISHED', 'ESTABLISHED', 'Client acks <b>' + (y + 1) + '</b>. Both ESTABLISHED. The server connection moves to the accept queue until <code>accept()</code>.');
        step('C ──▶ S', 'FIN,ACK', x + 1, y + 1, 'FIN_WAIT_1', 'ESTABLISHED', 'Client calls <code>close()</code> first, so it is the <b>active closer</b>. It sends FIN (uses sequence number ' + (x + 1) + ').');
        step('C ◀── S', 'ACK', y + 1, x + 2, 'FIN_WAIT_2', 'CLOSE_WAIT', 'Server acks <b>' + (x + 2) + '</b>. Client direction is closed. Server may still send data: <b>half-close</b>. Server is in CLOSE_WAIT until its app calls <code>close()</code>.');
        step('C ◀── S', 'FIN,ACK', y + 1, x + 2, 'FIN_WAIT_2', 'LAST_ACK', 'Server app closes: sends its own FIN, moves to LAST_ACK.');
        step('C ──▶ S', 'ACK', x + 2, y + 2, 'TIME_WAIT', 'CLOSED', 'Client acks the FIN (<b>' + (y + 2) + '</b>). Server CLOSED immediately. Client waits <b>2·MSL</b> in TIME_WAIT in case this last ACK was lost.');
        frames.push({ narr: 'After 2·MSL (60 s on Linux) the client socket is finally CLOSED and the port can be reused.', parts: [
          { type: 'vars', label: 'State per side', vals: { client: 'CLOSED', server: 'CLOSED' }, hl: { client: 'ok', server: 'ok' } }
        ] });
        return frames;
      }
    }, {
      title: 'TCP state machine: walk a path',
      input: 'client',
      inputLabel: 'Path: client (active open+active close), server (passive), or simultaneous',
      gen: function (input) {
        var which = String(input).trim().toLowerCase();
        var paths = {
          client: ['CLOSED', 'SYN_SENT', 'ESTABLISHED', 'FIN_WAIT_1', 'FIN_WAIT_2', 'TIME_WAIT', 'CLOSED'],
          server: ['CLOSED', 'LISTEN', 'SYN_RCVD', 'ESTABLISHED', 'CLOSE_WAIT', 'LAST_ACK', 'CLOSED'],
          simultaneous: ['CLOSED', 'SYN_SENT', 'ESTABLISHED', 'FIN_WAIT_1', 'CLOSING', 'TIME_WAIT', 'CLOSED']
        };
        if (!paths[which]) throw new Error('Type client, server or simultaneous');
        var p = paths[which];
        var P = { CLOSED: [10, 6], LISTEN: [40, 6], SYN_SENT: [10, 22], SYN_RCVD: [40, 22], ESTABLISHED: [25, 40], FIN_WAIT_1: [10, 58], CLOSE_WAIT: [50, 58], FIN_WAIT_2: [10, 74], CLOSING: [32, 74], LAST_ACK: [50, 74], TIME_WAIT: [22, 90] };
        var nodes = Object.keys(P).map(function (k) { return { id: k, label: k, x: P[k][0] + 12, y: P[k][1], shape: 'box', w: 17 }; });
        var edges = [['CLOSED', 'LISTEN', 'listen()'], ['CLOSED', 'SYN_SENT', 'connect: SYN'], ['LISTEN', 'SYN_RCVD', 'rcv SYN, snd SYN+ACK'], ['SYN_SENT', 'ESTABLISHED', 'rcv SYN+ACK, snd ACK'], ['SYN_RCVD', 'ESTABLISHED', 'rcv ACK'], ['ESTABLISHED', 'FIN_WAIT_1', 'close: snd FIN'], ['ESTABLISHED', 'CLOSE_WAIT', 'rcv FIN, snd ACK'], ['FIN_WAIT_1', 'FIN_WAIT_2', 'rcv ACK'], ['FIN_WAIT_1', 'CLOSING', 'rcv FIN, snd ACK'], ['FIN_WAIT_2', 'TIME_WAIT', 'rcv FIN, snd ACK'], ['CLOSING', 'TIME_WAIT', 'rcv ACK'], ['TIME_WAIT', 'CLOSED', '2 MSL timeout'], ['CLOSE_WAIT', 'LAST_ACK', 'close: snd FIN'], ['LAST_ACK', 'CLOSED', 'rcv ACK']];
        var notes = { CLOSED: 'No connection exists.', LISTEN: 'Server waits for a SYN.', SYN_SENT: 'Client sent SYN, waiting for SYN+ACK.', SYN_RCVD: 'Server got SYN, sent SYN+ACK, waiting for the final ACK (half-open).', ESTABLISHED: 'Data flows both ways.', FIN_WAIT_1: 'Sent FIN, waiting for its ACK.', FIN_WAIT_2: 'FIN was ACKed; waiting for the peer FIN (half-closed).', CLOSING: 'Both sent FIN at the same time; waiting for the ACK.', TIME_WAIT: 'Wait 2 x MSL so the last ACK can be re-sent and stale packets die.', CLOSE_WAIT: 'Peer closed; our app has not called close() yet.', LAST_ACK: 'We sent our FIN, waiting for the final ACK.' };
        var frames = [];
        for (var i = 0; i < p.length; i++) {
          var hl = {}, ehl = {};
          for (var j = 0; j < i; j++) { hl[p[j]] = 'done'; ehl[p[j] + '-' + p[j + 1]] = 'ok'; }
          hl[p[i]] = 'cur';
          var tag = {}; tag[p[i]] = 'you are here';
          frames.push({ narr: 'Step ' + i + ': <b>' + p[i] + '</b>. ' + notes[p[i]] + (i > 0 ? ' (arrived because of: <i>' + (edges.filter(function (e) { return e[0] === p[i - 1] && e[1] === p[i]; })[0] || [0, 0, ''])[2] + '</i>)' : ''), parts: [
            { type: 'graph', label: 'TCP state diagram (' + which + ')', directed: true, height: 98, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tag }
          ] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Why does connect() to a closed port fail instantly?', html: `<p>The SYN reaches the host, no process listens, the kernel replies with <b>RST</b>. The client sees "Connection refused" in about one RTT. If a firewall silently drops the SYN instead, the client retries (1 s, 2 s, 4 s ...) and finally "Connection timed out" after about 2 minutes. Two different symptoms, two different causes.</p>` },
      { title: 'Half-close in practice: send everything, then read', html: `<p>A client uploads a request and calls <code>shutdown(fd, SHUT_WR)</code>. Server's <code>read()</code> returns 0 (end of input), it still writes the full response, then closes. Without half-close the server could not tell "end of request" in a raw stream protocol. HTTP avoids this with Content-Length.</p>`, code: `// client side: signal "no more data from me" but keep reading\n#include <sys/socket.h>\nvoid finish_request(int fd) { shutdown(fd, SHUT_WR); }` },
      { title: 'Spot the bug: 20,000 sockets in CLOSE_WAIT', html: `<p><code>ss -tan state close-wait | wc -l</code> shows 20,000. Remote peers already sent FIN. Your program read EOF but never called <code>close()</code> (leaked descriptor, missing finally/RAII). The kernel can do nothing: the app owns the close. Fix the code; no kernel setting helps.</p>` }
    ],
    deepDive: `<p><b>Simultaneous open and close.</b> If both sides send SYN at the same time (rare, used in NAT hole punching), both go SYN_SENT → SYN_RCVD → ESTABLISHED with just 2 messages each way. Simultaneous close takes the FIN_WAIT_1 → CLOSING → TIME_WAIT path, so <i>both</i> sides end in TIME_WAIT.</p>
      <p><b>SYN retransmission and backlog.</b> If the SYN or SYN-ACK is lost, SYNs are retried with exponential backoff (initial RTO 1 s; Linux <code>tcp_syn_retries=6</code> is about 127 s total; servers retry SYN-ACK with <code>tcp_synack_retries</code>). If the accept queue is full, Linux drops the final ACK (or the SYN), and the client thinks it is connected but sees stalls. Watch <code>ss -ltn</code> (Recv-Q vs Send-Q on a listener) and <code>nstat -az TcpExtListenOverflows</code>.</p>
      <p><b>TCP Fast Open (TFO).</b> Data can ride in the SYN on repeat connections using a cookie, saving one RTT. Adoption is limited by middleboxes; QUIC's 0-RTT does something similar with TLS.</p>
      <p><b>FIN_WAIT_2 forever.</b> If the peer never sends FIN, the active closer would wait forever; Linux limits orphaned FIN_WAIT_2 sockets with <code>tcp_fin_timeout</code> (60 s). <b>RST vs FIN:</b> closing a socket with unread data in its receive buffer sends RST, discarding the peer's unread data; this surprises people who close right after writing a response (use <code>shutdown</code> + drain, or SO_LINGER carefully).</p>
      <p><b>Accept-queue design.</b> Epoll servers should accept in a loop until EAGAIN. Multiple processes can share a port with <code>SO_REUSEPORT</code>, and the kernel spreads connections by 4-tuple hash.</p>`,
    aiEra: `<p><b>What AI changes:</b> state-machine bugs now often appear in LLM gateways and agent tool servers: thousands of short HTTPS calls per second, leaked sockets in CLOSE_WAIT, ephemeral port exhaustion. Observability tools summarise <code>ss</code> output with AI, but the root cause is still the state diagram.</p>
      <p><b>Use AI as a partner:</b> paste <code>ss -tan | awk '{print $1}' | sort | uniq -c</code> output and ask for the likely cause and a next command. Ask it to quiz you: "give me a state, I name the event that leaves it".</p>
      <p><b>Where AI goes wrong:</b> it mixes up which side holds TIME_WAIT, or says CLOSE_WAIT "will time out by itself". It also writes server code that forgets SO_REUSEADDR, ignores partial <code>write()</code>, or leaks fds on error paths.</p>
      <p><b>What you must still own:</b> drawing the diagram from memory and attaching the right owner to each state (kernel vs application).</p>`,
    problems: [mk({
      t: 'Name the State on Each Side', l: 'Medium', tags: ['state machine', 'teardown'], co: ['Cisco', 'Arista', 'Amazon'],
      s: `<p>Client and server are ESTABLISHED. The client app calls <code>close()</code>. After exactly the first two teardown messages (FIN, then ACK) what state is each side in? Then the server app calls <code>close()</code>; list every message and both states until both are CLOSED. Which side holds the socket for 2·MSL?</p>`,
      ex: `${H.table(['After msg', 'Client', 'Server'], [['FIN', 'FIN_WAIT_1', 'ESTABLISHED'], ['ACK', 'FIN_WAIT_2', 'CLOSE_WAIT']])}`,
      b: `<p>Memorising the names as a list. Without the logic "who sent FIN, who got the ACK", you mix up CLOSE_WAIT and LAST_ACK.</p>`,
      q: 'A server shows thousands of CLOSE_WAIT sockets. Who must act?', o: ['The kernel, after a timeout', 'The remote client', 'The local application: call close()', 'The router'], a: 2, e: 'CLOSE_WAIT means we received FIN and our app has not closed yet.',
      h: [`<p>Hint 1: The side that sends the first FIN is the active closer.</p>`, `<p>Hint 2: The passive side waits for its own app: CLOSE_WAIT.</p>`, `<p>Hint 3: Last ACK sender (the active closer) must linger: TIME_WAIT.</p>`],
      ap: `<p>Client close(): sends FIN, goes FIN_WAIT_1. Server receives FIN, sends ACK, goes CLOSE_WAIT. Client receives ACK: FIN_WAIT_2 (the client side is half-closed; server may still send data). When the server app calls close(): server sends FIN and goes LAST_ACK. Client receives FIN, sends ACK, goes TIME_WAIT. Server receives that ACK and goes CLOSED. The client holds the socket for 2·MSL (60 s on Linux) then CLOSED. So the active closer (client) holds TIME_WAIT, not the server.</p>`,
      d: { head: ['Event', 'Client', 'Server'], rows: [['start', 'ESTABLISHED', 'ESTABLISHED'], ['C close → FIN', 'FIN_WAIT_1', 'ESTABLISHED'], ['S ACK', 'FIN_WAIT_2', 'CLOSE_WAIT'], ['S close → FIN', 'FIN_WAIT_2', 'LAST_ACK'], ['C ACK', 'TIME_WAIT', 'CLOSED'], ['2·MSL', 'CLOSED', 'CLOSED']] },
      f: ['What if both sides call close() at the same moment?', 'What if the final ACK is lost?']
    })]
  });
  topics.push({
    title: 'Flow Control: Receiver Window & the Sliding Window',
    analogy: `<p><b>A conveyor belt into a small kitchen.</b> The cook (receiver) tells the delivery truck (sender): "I only have room for 4 boxes on my counter right now." The truck may have 4 unconfirmed boxes on the road at once. When the cook finishes one and shouts "got it!", the window <b>slides</b> forward by one and the truck sends the next box. If the counter is full, the cook says "room for 0" and the truck waits.</p>`,
    explain: `<p><b>Flow control</b> protects the <i>receiver</i>: do not send faster than the app can read. Every ACK carries the <b>receive window (rwnd)</b>: free bytes in the receiver's buffer.</p>
      <p>The sender tracks three pointers in the byte stream:</p>
      ${H.table(['Zone', 'Meaning'], [[H.c('m', 'Acked'), 'Done. Safe to forget (bytes below the left edge, SND.UNA)'], [H.c('y', 'Sent, not yet acked'), 'In flight. Must be kept in memory in case of a resend'], [H.c('b', 'Usable'), 'Allowed to send now (window not yet filled)'], ['Beyond window', 'Cannot be sent until the window slides']])}
      <p><b>Rule:</b> bytes in flight ≤ min(rwnd, cwnd). (cwnd is the congestion window from the next topic: the sender obeys whichever is smaller.)</p>
      <p><b>Worked example.</b> Ten 1000-byte segments, rwnd = 4000 bytes, ACK per segment:</p>
      ${H.table(['Event', 'Sent so far', 'In flight', 'Acked', 'Can send more?'], [['Start', '-', '0', '0', 'yes, 4 segments'], ['Send s1-s4', '4', '4000', '0', 'no (window full)'], ['ACK s1', '4', '3000', '1', 'yes, 1 more → send s5'], ['ACK s2', '5', '3000', '2', 'send s6']])}
      <p><b>Zero window:</b> if rwnd = 0 the sender stops. It sends tiny <b>zero-window probes</b> periodically so that a lost "window opened" update cannot deadlock the connection.</p>
      <p><b>Throughput rule of thumb:</b> throughput ≈ window / RTT. With 64 KB window and 50 ms RTT: 65,536 B / 0.05 s ≈ 1.31 MB/s ≈ <b>10.5 Mbps</b>, even on a 1 Gbps link. To fill a link you need window ≥ bandwidth × RTT (the <b>bandwidth-delay product, BDP</b>). 1 Gbps × 100 ms = 12.5 MB.</p>
      <p>The 16-bit window field tops out at 65,535 bytes, so the <b>window-scale option</b> (set in the SYN, shift up to 14) multiplies it: max ≈ 1 GiB.</p>`,
    clues: ['"throughput = window / RTT" → fill-in numeric question', '"high-latency / long fat network, low throughput" → window too small, enable window scaling, bigger buffers', '"receiver is slow" → rwnd shrinks to 0, sender stalls: flow control, not congestion', '"bandwidth-delay product" → data in flight needed to keep the pipe full', '"silly window syndrome" → tiny windows advertised and tiny segments sent', '"zero window" in Wireshark → receiving app not reading'],
    code: [{ lang: 'python', run: true, title: 'Sliding-window sender simulation (runnable)', code: `# Go-back-free sliding window: bytes in flight never exceed the window.
# Each round: send what fits, then the receiver ACKs the oldest segment.
def simulate(total_segments, window, shrink_after_ack=None, shrink_to=None):
    base = 0          # oldest unacked segment (left edge)
    nxt = 0           # next segment to send (right edge of "sent")
    acked_count = 0
    print(f"{'event':<12}{'base':>5}{'next':>5}{'in flight':>10}{'window':>7}")
    while base < total_segments:
        # send while the window has room and data remains
        while nxt < total_segments and nxt - base < window:
            print(f"{'send s' + str(nxt + 1):<12}{base:>5}{nxt + 1:>5}{nxt + 1 - base:>10}{window:>7}")
            nxt += 1
        # receiver acks the oldest in-flight segment; ack also carries a (maybe new) window
        base += 1
        acked_count += 1
        if shrink_after_ack is not None and acked_count == shrink_after_ack:
            window = shrink_to           # receiver app is slow: it advertises less room
            note = f"ack s{base} (rwnd->{window})"
        else:
            note = f"ack s{base}"
        print(f"{note:<12}{base:>5}{nxt:>5}{nxt - base:>10}{window:>7}")
    print("all", total_segments, "segments acked")

simulate(8, 4)
print("--- receiver shrinks window to 2 after 2 acks ---")
simulate(8, 4, shrink_after_ack=2, shrink_to=2)

# throughput ~ window / RTT
for win_bytes, rtt in [(65536, 0.05), (65536, 0.2), (4 * 1024 * 1024, 0.1)]:
    mbps = win_bytes * 8 / rtt / 1e6
    print(f"window {win_bytes:>8} B, RTT {rtt * 1000:>4.0f} ms -> {mbps:8.2f} Mbps")` },
    `// C++: ask the OS for bigger socket buffers so the window can grow on long fat networks
#include <sys/socket.h>
#include <cstdio>

int main() {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    int rcv = 4 * 1024 * 1024;                         // 4 MiB; kernel doubles it for bookkeeping
    // Set BEFORE connect()/listen(): the window-scale factor is chosen in the SYN.
    setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &rcv, sizeof rcv);
    int got = 0; socklen_t len = sizeof got;
    getsockopt(fd, SOL_SOCKET, SO_RCVBUF, &got, &len);
    printf("receive buffer is now %d bytes\\n", got);
    return 0;
}`],
    codeTitle: ['Python: sliding window + throughput', 'C++: size the receive buffer'],
    viz: {
      title: 'Sliding window over a byte stream',
      input: '10 4 2',
      inputLabel: 'segments, window (in segments), optional shrink-to window after 3rd ACK',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(function (x) { return !isFinite(x) || x < 0 || x !== Math.floor(x); })) throw new Error('Enter: segments window [shrinkTo]');
        var N = t[0], W = t[1], shrinkTo = t.length > 2 ? t[2] : null;
        if (N < 2 || N > 14) throw new Error('segments must be 2..14');
        if (W < 1 || W > N) throw new Error('window must be 1..segments');
        var base = 0, nxt = 0, acks = 0, frames = [];
        function snap(narr) {
          var vals = [], hl = {}, i, ptr = {};
          for (i = 0; i < N; i++) {
            vals.push('s' + (i + 1));
            if (i < base) hl[i] = 'done';
            else if (i < nxt) hl[i] = 'cur';
            else if (i < base + W) hl[i] = 'win';
          }
          ptr[Math.min(base, N - 1)] = 'UNA';
          if (nxt < N) ptr[nxt] = 'NXT';
          frames.push({ narr: narr, parts: [
            { type: 'array', label: 'Byte stream (faded = acked, amber = in flight, blue = usable now)', values: vals, hl: hl, ptr: ptr, range: [base, Math.min(base + W, N) - 1] },
            { type: 'vars', label: 'Sender state', vals: { window: W, in_flight: nxt - base, acked: base, usable_now: Math.max(0, Math.min(base + W, N) - nxt) }, hl: { in_flight: 'cur', usable_now: 'win' } }
          ] });
        }
        snap('Nothing sent yet. Window = <b>' + W + '</b> segments, so up to ' + W + ' may be in flight at once.');
        while (base < N) {
          while (nxt < N && nxt - base < W) {
            nxt++;
            snap('Send <b>s' + nxt + '</b>. In flight = ' + (nxt - base) + ' of ' + W + (nxt - base === W ? ' → <span class="c-r">window full, must wait for an ACK</span>' : '') + '.');
          }
          base++; acks++;
          var extra = '';
          if (shrinkTo !== null && acks === 3 && shrinkTo >= 1) { W = Math.min(shrinkTo, N); extra = ' ACK carries <b>rwnd = ' + W + '</b>: the receiver app is slow, window shrinks!'; }
          snap('ACK for <b>s' + base + '</b> arrives; left edge slides right.' + extra);
        }
        return frames;
      }
    },
    examples: [
      { title: 'Throughput cap from the window', html: `<p>RTT = 50 ms, window = 64 KB. Per RTT you can send 65,536 bytes → 65,536 / 0.05 = 1,310,720 B/s = <b>10.5 Mbps</b>. A 1 Gbps link would be 99% idle. Fix: window scaling so the window reaches the BDP.</p>` },
      { title: 'BDP for a transatlantic link', html: `<p>1 Gbps, RTT 100 ms: BDP = (10<sup>9</sup>/8) B/s × 0.1 s = 12.5 MB. Receiver buffer and cwnd must reach ~12.5 MB. With 65,535 max (no scaling) you get only 5.2 Mbps.</p>` },
      { title: 'Zero window deadlock avoided', html: `<p>Receiver says rwnd = 0. Its app finally reads, the window update ACK is lost. Sender waits forever? No: the sender's <b>persist timer</b> sends 1-byte probes (backing off), and the next ACK reveals the new window.</p>` }
    ],
    deepDive: `<p><b>Receiver-side mechanics.</b> rwnd = buffer size − bytes waiting to be read. Linux auto-tunes the buffer (<code>tcp_rmem</code> min/default/max, e.g. 4 KB / 128 KB / 6 MB), growing it as the link needs. Setting <code>SO_RCVBUF</code> manually can <i>disable</i> auto-tuning, so measure before doing it.</p>
      <p><b>Silly window syndrome.</b> A slow reader frees 1 byte, the receiver advertises window = 1, the sender sends a 1-byte segment (41 bytes on the wire for 1 byte of data). Cures: the receiver does not advertise a window until it can open at least min(MSS, buffer/2) (Clark); the sender does not send small segments unless it can fill an MSS (this is Nagle's role).</p>
      <p><b>Effective window</b> = min(rwnd, cwnd) − bytes in flight. Never confuse them: a "limited by receiver" connection shows rwnd small or zero in captures; a "limited by network" one shows cwnd small. <code>ss -ti</code> prints both (<code>cwnd:10 rcv_space:...</code>).</p>
      <p><b>Go-Back-N vs Selective Repeat.</b> TCP is a hybrid: cumulative ACKs like Go-Back-N, but with SACK it retransmits selectively. The classic textbook window size limits (N-1 for GBN with seq space N) matter for the 32-bit space only on very fast links, where PAWS (timestamps) protects against wrap.</p>
      <p><b>Window scale caveat.</b> The scale factor is exchanged only in SYN segments; if a middlebox strips the option, one side thinks the window is 64 KB while the other multiplies. Result: a throughput ceiling and mysterious slowness.</p>`,
    aiEra: `<p><b>What AI changes:</b> model weights and datasets move across regions and clouds (hundreds of GB). Those long fat pipes make window tuning matter again. Training clusters use RDMA/InfiniBand or RoCE instead of TCP because even tuned TCP costs CPU, but many data pipelines still run over TCP with BBR and big windows.</p>
      <p><b>Use AI as a partner:</b> ask it to compute BDP and window-scale shifts for a link, then verify with <code>iperf3 -w</code> and <code>ss -ti</code>. Paste a Wireshark "TCP Window Full" or "Zero Window" analysis and ask for the likely bottleneck.</p>
      <p><b>Where AI goes wrong:</b> it blames "the network" when rwnd=0 proves the <i>receiving application</i> is slow; or it advises huge <code>SO_RCVBUF</code> values on every socket, which wastes RAM across 100k connections.</p>
      <p><b>What you must still own:</b> separating flow control (receiver) from congestion control (network), and doing window/RTT maths quickly.</p>`,
    problems: [mk({
      t: 'Sliding Window with a Shrinking rwnd', l: 'Medium', tags: ['sliding window', 'flow control'], co: ['Google', 'Cisco'],
      s: `<p>A sender has 8 segments of 1000 bytes. The receiver advertises rwnd = 4000 bytes initially. Each segment is ACKed individually and the sender sends as soon as it is allowed. After the <b>3rd</b> ACK, the receiver advertises rwnd = 2000. Build the table of events: which segments are sent, how many are in flight, until everything is acked. Also find the effective throughput if RTT is 40 ms and the window stays at 4000 bytes.</p>`,
      ex: `<p>Start: window 4 segments. Send s1, s2, s3, s4 → in flight = 4 → stop.</p>`,
      b: `<p>Sending all 8 at once ignores rwnd and overflows the receiver, which drops the excess (wasted bandwidth and extra retransmissions).</p>`,
      q: 'In flight = 4 segments, window = 4. An ACK for s1 arrives (window unchanged). What next?', o: ['Wait for all ACKs', 'Send s5', 'Send s5 and s6', 'Retransmit s1'], a: 1, e: 'One segment left the window, so exactly one new segment may enter.',
      h: [`<p>Hint 1: in flight ≤ window, always.</p>`, `<p>Hint 2: the left edge moves with each ACK, the right edge = left + window.</p>`, `<p>Hint 3: when the window shrinks, you simply send nothing until in flight drops below the new window (never "unsend").</p>`],
      ap: `<p>Initial window 4. Send s1-s4 (in flight 4). ACK s1: in flight 3, send s5 (4). ACK s2: send s6 (4). ACK s3 carries rwnd=2000, so window 2: in flight is 3 (s4,s5,s6) which exceeds 2, so send nothing. ACK s4: in flight 2 (s5,s6) = window, nothing. ACK s5: in flight 1, send s7 (2). ACK s6: in flight 1, send s8 (2). ACK s7, ACK s8: done. Throughput with window 4000 B and RTT 40 ms is 4000 / 0.04 = 100,000 B/s = 800 kbps. After shrinking to 2000 B, 400 kbps. The shrink halves the speed even if the network is empty.</p>`,
      d: { head: ['Event', 'Window (seg)', 'In flight', 'Action'], rows: [['start', '4', '0', 'send s1-s4'], ['ACK s1', '4', '3', 'send s5'], ['ACK s2', '4', '3', 'send s6'], ['ACK s3 (rwnd=2000)', '2', '3', 'none (over window)'], ['ACK s4', '2', '2', 'none'], ['ACK s5', '2', '1', 'send s7'], ['ACK s6', '2', '1', 'send s8'], ['ACK s7, s8', '2', '0', 'done']] },
      f: ['What if rwnd drops to 0?', 'What if the ACKs are cumulative every 2 segments?']
    })]
  });
  topics.push({
    title: 'Congestion Control: Slow Start, AIMD, Fast Retransmit & Recovery',
    analogy: `<p><b>Merging onto a highway in the dark.</b> You do not know how much traffic there is. So you start slowly, then speed up fast (slow start: doubling). When you get near the point where you crashed or braked last time (ssthresh), you ease up and add speed carefully, one notch at a time (congestion avoidance). If you see a small bump (3 dup ACKs: light braking) you halve your speed. If everything goes silent (timeout), you stop and start over from a crawl.</p>`,
    explain: `<p>Flow control protects the receiver. <b>Congestion control protects the network</b> (routers' queues). Nobody tells the sender the link capacity, so it <i>probes</i> and treats loss as the signal. The sender keeps a <b>congestion window (cwnd)</b>, measured in MSS units here: allowed in flight = min(cwnd, rwnd).</p>
      <p><b>Phases (TCP Reno / NewReno style):</b></p>
      <ol><li><b>Slow start:</b> cwnd starts small (1 MSS in textbooks, 10 MSS in modern Linux) and <b>doubles every RTT</b> (+1 MSS per ACK). Exponential, "slow" only compared with dumping a full window at once.</li><li><b>Congestion avoidance (AIMD):</b> once cwnd ≥ <b>ssthresh</b> (slow-start threshold), grow by <b>+1 MSS per RTT</b>. This is <i>Additive Increase</i>.</li><li><b>Loss by 3 duplicate ACKs</b> (mild: packets are still flowing): <b>fast retransmit</b> the missing segment at once, set ssthresh = cwnd/2, and cwnd = ssthresh (+3) in <b>fast recovery</b>. This is <i>Multiplicative Decrease</i>.</li><li><b>Loss by timeout</b> (severe: nothing is getting through): ssthresh = cwnd/2, cwnd = 1 MSS, back to slow start.</li></ol>
      <p>Worked example (units: MSS, initial cwnd = 1, ssthresh = 16, a 3-dup-ACK loss in round 8):</p>
      ${H.table(['RTT', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], [['cwnd', '1', '2', '4', '8', '16', '17', '18', '19', H.c('r', '9'), '10', '11'], ['phase', 'SS', 'SS', 'SS', 'SS', 'CA', 'CA', 'CA', 'CA (loss)', 'CA', 'CA', 'CA']])}
      <p>At RTT 8 cwnd = 19; 3 dup ACKs → ssthresh = ⌊19/2⌋ = 9, cwnd = 9. If it had been a <b>timeout</b>: ssthresh = 9, cwnd = 1, then 1, 2, 4, 8, 9, 10, ... (slow start up to 9, then +1).</p>
      <p>The classic <b>sawtooth</b>: ramp up linearly, cut in half on loss, ramp again. Many connections sharing a link with AIMD converge to a fair share (the reason AIMD was chosen).</p>
      <p><b>Throughput with loss</b> (Mathis formula): throughput ≈ (MSS / RTT) × 1.22 / √p. For MSS 1460 B, RTT 100 ms, loss p = 1%: 14,600 B/s × 12.2 ≈ <b>178 KB/s ≈ 1.4 Mbps</b>. At p = 0.01%: ~14 Mbps. Even tiny loss hurts long-RTT paths.</p>`,
    clues: ['"cwnd doubles each RTT" → slow start; "increases by 1 per RTT" → congestion avoidance', '"3 duplicate ACKs" → fast retransmit + fast recovery, cwnd halves, no slow start', '"timeout" → ssthresh = cwnd/2, cwnd = 1 MSS, slow start again', '"AIMD" → additive increase (+1 MSS/RTT), multiplicative decrease (×0.5)', '"sawtooth graph" → Reno/NewReno; BBR is flatter', '"why is the transfer slow only on lossy wifi/mobile" → loss misread as congestion', '"CUBIC vs BBR" → loss-based vs model-based (bandwidth and RTT)'],
    code: [{ lang: 'python', run: true, title: 'Congestion control cwnd simulator with loss events (runnable)', code: `# Reno-style simulator. Units: MSS. One step = one RTT.
# losses: dict {rtt_number: "dup" or "rto"}  (dup = 3 duplicate ACKs, rto = timeout)
def simulate(rounds, ssthresh, losses, init_cwnd=1):
    cwnd = init_cwnd
    print(f"{'RTT':>3} {'cwnd':>5} {'ssthresh':>8}  phase / event")
    for rtt in range(1, rounds + 1):
        phase = "slow start" if cwnd < ssthresh else "cong. avoid"
        event = losses.get(rtt)
        note = phase
        if event == "dup":
            # fast retransmit + fast recovery: halve, keep going (no slow start)
            print(f"{rtt:>3} {cwnd:>5} {ssthresh:>8}  {phase}; LOSS 3 dup ACKs")
            ssthresh = max(cwnd // 2, 2)
            cwnd = ssthresh
            continue
        if event == "rto":
            # timeout: the network looks dead; restart from 1 MSS
            print(f"{rtt:>3} {cwnd:>5} {ssthresh:>8}  {phase}; LOSS timeout")
            ssthresh = max(cwnd // 2, 2)
            cwnd = 1
            continue
        print(f"{rtt:>3} {cwnd:>5} {ssthresh:>8}  {note}")
        if cwnd < ssthresh:
            cwnd = min(cwnd * 2, ssthresh)   # slow start: double, but stop at ssthresh
        else:
            cwnd += 1                        # additive increase

print("Case A: 3-dup-ACK loss at RTT 8")
simulate(12, 16, {8: "dup"})
print()
print("Case B: timeout at RTT 8")
simulate(14, 16, {8: "rto"})

# Mathis estimate: throughput ~ MSS/RTT * 1.22/sqrt(p)
mss, rtt = 1460, 0.1
for p in (0.01, 0.0001):
    bps = mss / rtt * 1.22 / p ** 0.5 * 8
    print(f"loss {p:.4%}: about {bps / 1e6:.1f} Mbps")` }],
    codeTitle: ['Python: cwnd simulator'],
    viz: {
      title: 'cwnd over RTTs: slow start, AIMD, loss',
      input: '16 13 8:dup 12:rto',
      inputLabel: 'ssthresh, rounds, then loss events round:dup or round:rto',
      gen: function (input) {
        var tk = String(input).trim().split(/\s+/);
        var ss = parseInt(tk[0], 10), R = parseInt(tk[1], 10);
        if (!(ss >= 2 && ss <= 64) || !(R >= 4 && R <= 24)) throw new Error('Format: ssthresh(2-64) rounds(4-24) 8:dup 12:rto');
        var loss = {};
        for (var i = 2; i < tk.length; i++) {
          var m = /^(\d+):(dup|rto)$/.exec(tk[i]);
          if (!m) throw new Error('Loss events look like 8:dup or 12:rto');
          loss[parseInt(m[1], 10)] = m[2];
        }
        var cwnd = 1, hist = [], texts = [], hl = {}, frames = [];
        for (var r = 1; r <= R; r++) {
          var phase = cwnd < ss ? 'slow start' : 'congestion avoidance';
          hist.push(cwnd); texts.push(String(cwnd));
          var ev = loss[r], narr, thisHl = {};
          for (var q = 0; q < hist.length; q++) if (hl[q]) thisHl[q] = hl[q];
          if (ev === 'dup') {
            hl[r - 1] = 'bad'; thisHl[r - 1] = 'bad';
            var ns = Math.max(Math.floor(cwnd / 2), 2);
            narr = 'RTT ' + r + ': cwnd = ' + cwnd + ' (' + phase + '). <span class="c-r">3 duplicate ACKs</span> → fast retransmit, ssthresh = ⌊' + cwnd + '/2⌋ = <b>' + ns + '</b>, cwnd = ' + ns + ' (fast recovery).';
            frames.push({ narr: narr, parts: [{ type: 'bars', label: 'cwnd per RTT (MSS)', values: hist.slice(), hl: thisHl, texts: texts.slice() }, { type: 'vars', vals: { RTT: r, cwnd: cwnd, ssthresh_before: ss, ssthresh_after: ns, event: '3 dup ACKs' }, hl: { event: 'bad', ssthresh_after: 'sel' } }] });
            ss = ns; cwnd = ns;
          } else if (ev === 'rto') {
            hl[r - 1] = 'bad'; thisHl[r - 1] = 'bad';
            var ns2 = Math.max(Math.floor(cwnd / 2), 2);
            narr = 'RTT ' + r + ': cwnd = ' + cwnd + '. <span class="c-r">Timeout!</span> ssthresh = ⌊' + cwnd + '/2⌋ = <b>' + ns2 + '</b>, cwnd resets to <b>1</b> and slow start restarts.';
            frames.push({ narr: narr, parts: [{ type: 'bars', label: 'cwnd per RTT (MSS)', values: hist.slice(), hl: thisHl, texts: texts.slice() }, { type: 'vars', vals: { RTT: r, cwnd: cwnd, ssthresh_before: ss, ssthresh_after: ns2, event: 'timeout' }, hl: { event: 'bad', ssthresh_after: 'sel' } }] });
            ss = ns2; cwnd = 1;
          } else {
            thisHl[r - 1] = phase === 'slow start' ? 'ok' : 'win'; hl[r - 1] = thisHl[r - 1];
            var nx = cwnd < ss ? Math.min(cwnd * 2, ss) : cwnd + 1;
            narr = 'RTT ' + r + ': cwnd = <b>' + cwnd + '</b>, ' + phase + '. ' + (cwnd < ss ? 'Doubles → ' + nx + (nx === ss ? ' (capped at ssthresh)' : '') + '.' : 'Adds 1 MSS → ' + nx + '.');
            frames.push({ narr: narr, parts: [{ type: 'bars', label: 'cwnd per RTT (MSS)', values: hist.slice(), hl: thisHl, texts: texts.slice() }, { type: 'vars', vals: { RTT: r, cwnd: cwnd, ssthresh: ss, phase: phase }, hl: { phase: cwnd < ss ? 'ok' : 'win' } }] });
            cwnd = nx;
          }
        }
        return frames;
      }
    },
    examples: [
      { title: 'Slow start is exponential', html: `<p>Start cwnd = 1. RTT1: send 1, get 1 ACK → cwnd 2. RTT2: send 2, get 2 ACKs → 4. RTT3: 8. After n RTTs the window is 2<sup>n</sup>. To reach 1024 segments you need only 10 RTTs. Modern Linux starts at <b>10 MSS</b> (IW10), so small web pages (≤ 14.6 KB) finish in one round trip.</p>` },
      { title: 'Timeout vs 3 dup ACKs from cwnd = 20', html: `<p>3 dup ACKs: ssthresh = 10, cwnd = 10 → continue additively 10, 11, 12... Timeout: ssthresh = 10, cwnd = 1 → 1, 2, 4, 8, 10, 11 ... The timeout version is far slower because it throws away all the progress. Hence "fast retransmit" matters.</p>` },
      { title: 'Why AIMD and not AIAD?', html: `<p>Two flows, A has 80% of a link, B 20%. AIMD: halving cuts A by a lot more in absolute terms than B, then both add the same +1/RTT, so the gap shrinks every cycle, converging to a 50/50 split. Additive decrease would keep the gap forever. (Chiu-Jain 1989.)</p>` }
    ],
    deepDive: `<p><b>Fast recovery in detail (Reno).</b> On the 3rd dup ACK: ssthresh = max(flight/2, 2), retransmit the lost segment, set cwnd = ssthresh + 3 (the three dup ACKs mean three segments left the network). Each further dup ACK inflates cwnd by 1, allowing new data to be sent. When the ACK for the new data arrives, cwnd = ssthresh ("deflate") and congestion avoidance resumes. <b>NewReno</b> handles multiple losses in one window (partial ACKs keep it in recovery). <b>SACK-based recovery</b> (RFC 6675) is what Linux does.</p>
      <p><b>CUBIC (Linux default since 2.6.19).</b> cwnd grows as a cubic function of time since the last loss: fast, then flat near the old maximum W<sub>max</sub>, then probing again. It is RTT-fair and scales on high BDP paths. <b>BBR</b> (Google) instead estimates bottleneck bandwidth and min RTT and paces packets at that rate, keeping queues short, so it is not crushed by random loss. BBRv1 was unfair to CUBIC flows; BBRv2/v3 improve this. Check yours with <code>sysctl net.ipv4.tcp_congestion_control</code>.</p>
      <p><b>Other signals.</b> ECN (routers mark packets instead of dropping), DCTCP in data centres (reduce proportionally to the fraction marked), delay-based schemes (Vegas). <b>Pacing</b> spreads a window across the RTT instead of sending bursts, so queues do not overflow.</p>
      <p><b>Bufferbloat.</b> Oversized router buffers hold a standing queue, so loss-based TCP sees no loss until seconds of delay build up. Fixes: AQM like CoDel / fq_codel, ECN, BBR.</p>
      <p><b>Application effects.</b> Short flows never leave slow start (raising the initial window helps); idle connections may reset cwnd after idle (<code>tcp_slow_start_after_idle</code>), a gotcha for keep-alive APIs; many parallel connections gain an unfair share. HTTP/2 multiplexing over one TCP connection suffers when a single loss halves cwnd for all streams.</p>`,
    aiEra: `<p><b>What AI changes:</b> huge synchronized flows (all-reduce during training, checkpoint writes, token streaming for millions of chats) create incast and microbursts. Data-centre fabrics use ECN-based DCTCP, DCQCN (RDMA), and AI-driven congestion tuning. Hyperscalers research learned congestion controllers, but the stable ones in production are still CUBIC, BBR and DCTCP.</p>
      <p><b>Use AI as a partner:</b> ask for a cwnd table for a given loss pattern, then diff it against your own. Paste <code>ss -ti</code> output (cwnd, ssthresh, rtt, retrans) and ask what phase the connection is in.</p>
      <p><b>Where AI goes wrong:</b> mixing "timeout → cwnd=1" with "3 dup ACKs → cwnd=ssthresh", forgetting that ssthresh is based on the cwnd at loss time, or claiming BBR is "always better".</p>
      <p><b>What you must still own:</b> the two loss reactions and the arithmetic. Interviews love "compute cwnd at RTT 12".</p>`,
    problems: [mk({
      t: 'cwnd per RTT Through a Loss', l: 'Medium', tags: ['congestion control', 'AIMD', 'numeric'], co: ['Cisco', 'Amazon', 'Google', 'Juniper'],
      s: `<p>Reno-style TCP, units of MSS, initial cwnd = 1, ssthresh = 16. Each RTT you send one cwnd of data. Compute cwnd (at the start of each RTT) for RTT 1..13 in two scenarios. <b>(A)</b> three duplicate ACKs during RTT 8. <b>(B)</b> a timeout during RTT 8. Give the new ssthresh in each.</p>`,
      ex: `<p>RTT 1..8 (same for both): ${H.c('g', '1, 2, 4, 8, 16, 17, 18, 19')}. Slow start until 16 = ssthresh, then +1 per RTT.</p>`,
      b: `<p>Doubling forever: 1, 2, 4 ... 128. Ignores ssthresh and loss; in reality packets are dropped as soon as router queues overflow.</p>`,
      q: 'After a timeout at cwnd = 20 what are cwnd and ssthresh?', o: ['cwnd 10, ssthresh 10', 'cwnd 1, ssthresh 10', 'cwnd 1, ssthresh 20', 'cwnd 20, ssthresh 10'], a: 1, e: 'Timeout: ssthresh = cwnd/2 = 10 and cwnd restarts at 1 in slow start.',
      h: [`<p>Hint 1: below ssthresh double, at or above add 1.</p>`, `<p>Hint 2: the loss uses the cwnd value at the time of loss (19), ssthresh = ⌊19/2⌋ = 9.</p>`, `<p>Hint 3: 3 dup ACKs → cwnd = ssthresh. Timeout → cwnd = 1. Then continue with the same growth rules; slow start is capped at ssthresh.</p>`],
      ap: `<p>Common prefix: RTT1-8 = 1, 2, 4, 8, 16, 17, 18, 19 (cap at 16 because ssthresh 16, then additive). Loss in RTT 8 when cwnd = 19: ssthresh = ⌊19/2⌋ = 9. (A) 3 dup ACKs: cwnd = 9 at RTT 9, then 10, 11, 12, 13 for RTT 10-13: sequence 9, 10, 11, 12, 13 (cwnd ≥ ssthresh so additive from the start). (B) Timeout: cwnd = 1 at RTT 9, then slow start 2, 4, 8 (RTT 10, 11, 12), RTT 13 = min(16, 9) = 9 reached; so sequence 1, 2, 4, 8, 9: RTT 9..13. After that +1 each RTT. By RTT 13 (A) is at 13 versus (B) at 9: fast retransmit saved four MSS of window and the entire climb.</p>`,
      d: { head: ['RTT', 'A cwnd', 'A phase', 'B cwnd', 'B phase'], rows: [['1-4', '1,2,4,8', 'SS', '1,2,4,8', 'SS'], ['5', '16', 'CA starts', '16', 'CA starts'], ['6-8', '17,18,19', 'CA', '17,18,19', 'CA, loss in 8'], ['9', '9 (ssthresh 9)', 'CA', '1 (ssthresh 9)', 'SS'], ['10', '10', 'CA', '2', 'SS'], ['11', '11', 'CA', '4', 'SS'], ['12', '12', 'CA', '8', 'SS'], ['13', '13', 'CA', '9', 'CA']] },
      f: ['What is initial cwnd 10 (IW10) do to the first rows?', 'How would BBR behave differently?']
    })]
  });
  topics.push({
    title: 'Retransmission: RTT Estimation, RTO & Fast Retransmit',
    analogy: `<p><b>Waiting for a friend's text reply.</b> If your friend usually answers in 2 minutes, you would not worry at 3 minutes but you would nudge at 10. And if they answer between 1 and 5 minutes (jittery), you wait longer before nudging. TCP does the same: it measures how long ACKs normally take (RTT), how jumpy that is, and sets a <b>retransmission timeout (RTO)</b> a bit above the usual. And if a friend replies "I'm still missing message 3!" three times in a row, you resend at once without waiting for the timer: <b>fast retransmit</b>.</p>`,
    explain: `<p>TCP promises reliability with <b>ACK + retransmit</b>. A segment is resent in two ways:</p>
      <ol><li><b>Timeout (RTO):</b> no ACK for that data before a timer expires. Slow, because you wait the whole RTO. Used when too few packets are flowing to create dup ACKs.</li><li><b>Fast retransmit:</b> the receiver sends a <b>duplicate ACK</b> each time an out-of-order segment arrives (same ack number again). After <b>3 duplicate ACKs</b> the sender resends the missing segment immediately, without waiting for the timer.</li></ol>
      ${H.table(['Segment', 'seq range', 'arrives?', 'Receiver sends'], [['1', '1-100', 'yes', 'ack 101'], ['2', '101-200', 'yes', 'ack 201'], ['3', '201-300', H.c('r', 'LOST'), '-'], ['4', '301-400', 'yes (out of order)', 'ack 201 (dup 1)'], ['5', '401-500', 'yes', 'ack 201 (dup 2)'], ['6', '501-600', 'yes', 'ack 201 (dup 3) → sender resends 201-300'], ['3 again', '201-300', 'yes', 'ack 601 (jumps: 4-6 were buffered)']])}
      <p><b>How long should the RTO be?</b> Too short: spurious retransmissions waste bandwidth. Too long: slow recovery. So TCP measures RTT samples (time from sending a segment to its ACK) and smooths them (Jacobson/Karels, RFC 6298):</p>
      <ul><li>First sample R: SRTT = R, RTTVAR = R/2, RTO = SRTT + 4 × RTTVAR.</li><li>Later samples: <b>RTTVAR = 0.75 × RTTVAR + 0.25 × |SRTT − R|</b>, then <b>SRTT = 0.875 × SRTT + 0.125 × R</b> (update RTTVAR first, with the old SRTT), then RTO = SRTT + 4 × RTTVAR.</li></ul>
      ${H.table(['Sample R (ms)', 'RTTVAR', 'SRTT', 'RTO = SRTT + 4·RTTVAR'], [['100 (first)', '50', '100', '300'], ['140', '0.75·50 + 0.25·40 = 47.5', '0.875·100 + 0.125·140 = 105', '105 + 190 = 295'], ['60', '0.75·47.5 + 0.25·45 = 46.875', '0.875·105 + 0.125·60 = 99.375', '99.375 + 187.5 ≈ 286.9']])}
      <p><b>Karn's rule:</b> never take an RTT sample from a retransmitted segment (you cannot tell which transmission the ACK is for; timestamps option fixes this). <b>Exponential backoff:</b> each time the RTO fires, double the RTO (up to 120 s on Linux) and try again; after about 15 tries (<code>tcp_retries2</code>, around 15 minutes) the connection is dropped. A minimum RTO exists: 1 s in the RFC, 200 ms in Linux.</p>`,
    clues: ['"three duplicate ACKs" → fast retransmit without waiting for RTO', '"RTO = SRTT + 4·RTTVAR" and "α = 1/8, β = 1/4" → Jacobson/Karels', '"retransmission timer doubles" → exponential backoff', '"ambiguous ACK for retransmitted segment" → Karn\'s algorithm', '"SACK" → retransmit only the holes', '"tail loss" (last packets of a burst) → no dup ACKs, only RTO or tail loss probe (TLP)', '"RTT spikes / jitter" → RTTVAR grows, RTO grows'],
    code: [{ lang: 'python', run: true, title: 'RTO estimator, Jacobson/Karels (runnable)', code: `# RFC 6298 retransmission timer. alpha = 1/8, beta = 1/4, K = 4.
def rto_estimator(samples, min_rto=None):
    srtt = rttvar = None
    print(f"{'R':>6} {'RTTVAR':>8} {'SRTT':>8} {'RTO':>8}")
    for r in samples:
        if srtt is None:                    # first measurement
            srtt = r
            rttvar = r / 2
        else:
            rttvar = 0.75 * rttvar + 0.25 * abs(srtt - r)   # uses OLD srtt
            srtt = 0.875 * srtt + 0.125 * r
        rto = srtt + 4 * rttvar
        if min_rto is not None:
            rto = max(rto, min_rto)         # Linux clamps to 200 ms, RFC says 1000 ms
        print(f"{r:>6} {rttvar:>8.3f} {srtt:>8.3f} {rto:>8.3f}")
    return srtt, rttvar, rto

print("Stable then a spike (ms):")
rto_estimator([100, 140, 60, 100, 100, 300, 100])

# Exponential backoff when the timer fires with no ACK
rto = 300
print("backoff after repeated timeouts:", end=" ")
for _ in range(5):
    print(rto, end=" -> ")
    rto = min(rto * 2, 120000)
print(rto)

# Fast retransmit detector: feed a list of ack numbers and report the resend point
def fast_retransmit(acks):
    last, dups = None, 0
    for i, a in enumerate(acks, 1):
        if a == last:
            dups += 1
            print(f"ack#{i}: {a} duplicate #{dups}")
            if dups == 3:
                print(f"3 dup ACKs -> resend segment starting at byte {a}")
                return a
        else:
            last, dups = a, 0
            print(f"ack#{i}: {a} new")
    return None

fast_retransmit([101, 201, 201, 201, 201])` }],
    codeTitle: ['Python: RTO estimator + fast retransmit detector'],
    viz: {
      title: 'Dup ACKs trigger fast retransmit',
      input: '6 3',
      inputLabel: 'segments sent (3..10), index of the lost segment',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(function (x) { return !isFinite(x) || x !== Math.floor(x); })) throw new Error('Enter: segments lostIndex');
        var N = t[0], L = t[1];
        if (N < 3 || N > 10 || L < 1 || L > N) throw new Error('segments 3..10, lost index 1..segments');
        var SZ = 100, frames = [], i;
        var sent = [];
        for (i = 1; i <= N; i++) sent.push('seg' + i + (i === L ? ' (lost)' : ''));
        frames.push({ narr: 'Sender fires ' + N + ' segments of ' + SZ + ' bytes. <b>seg' + L + '</b> (bytes ' + ((L - 1) * SZ + 1) + '-' + (L * SZ) + ') is dropped by the network.', parts: [
          { type: 'queue', label: 'In flight (front → back)', items: sent, hl: (function () { var h = {}; h[L - 1] = 'bad'; return h; })(), frontLabel: 'oldest', backLabel: 'newest' },
          { type: 'queue', label: 'ACKs seen by sender', items: [], frontLabel: 'first', backLabel: 'latest' }
        ] });
        var acks = [], dups = 0, expect = (L - 1) * SZ + 1, retrans = false;
        for (i = 1; i <= N; i++) {
          if (i === L) continue;
          var a, label;
          if (i < L) { a = i * SZ + 1; label = 'ack ' + a; }
          else { a = expect; dups++; label = 'ack ' + a + ' (dup ' + dups + ')'; }
          acks.push(label);
          var hl = {}; hl[acks.length - 1] = i < L ? 'ok' : 'cur';
          var narr = i < L ? 'seg' + i + ' arrives in order → cumulative <b>ack ' + a + '</b>.' : 'seg' + i + ' arrives but a hole remains at byte ' + expect + ' → receiver repeats <b>ack ' + a + '</b> (duplicate #' + dups + ').';
          if (dups === 3) narr += ' <span class="c-r">Third duplicate → FAST RETRANSMIT of seg' + L + ' now, no timer needed.</span>';
          frames.push({ narr: narr, parts: [
            { type: 'queue', label: 'ACKs seen by sender', items: acks.slice(), hl: hl, frontLabel: 'first', backLabel: 'latest' },
            { type: 'vars', vals: { expected_byte: expect, dup_ack_count: dups, action: dups >= 3 ? 'retransmit' : 'wait' }, hl: (dups >= 3 ? { dup_ack_count: 'bad', action: 'bad' } : (dups ? { dup_ack_count: 'cur' } : {})) }
          ] });
          if (dups === 3 && !retrans) {
            retrans = true;
            frames.push({ narr: 'Sender resends <b>seg' + L + '</b> (seq ' + expect + ', len ' + SZ + '). Meanwhile cwnd is halved (fast recovery, previous topic).', parts: [
              { type: 'queue', label: 'Retransmission', items: ['seg' + L + ' (resend)'], hl: { 0: 'ok' } },
              { type: 'queue', label: 'ACKs seen by sender', items: acks.slice(), hl: (function () { var h = {}; h[acks.length - 1] = 'bad'; return h; })() }
            ] });
          }
        }
        if (dups < 3) {
          frames.push({ narr: 'Only <b>' + dups + '</b> duplicate ACK(s): not enough for fast retransmit. The sender must wait for the <b>RTO timer</b>, which is much slower. (Lost tail packets cause this.)', parts: [
            { type: 'queue', label: 'ACKs seen by sender', items: acks.slice(), hl: (function () { var h = {}; h[acks.length - 1] = 'bad'; return h; })() },
            { type: 'vars', vals: { dup_ack_count: dups, action: 'wait for RTO' }, hl: { action: 'bad' } }
          ] });
        }
        frames.push({ narr: 'The retransmitted segment fills the hole. Receiver already buffered everything after it, so one big cumulative ACK: <b>ack ' + (N * SZ + 1) + '</b>.', parts: [
          { type: 'queue', label: 'ACKs seen by sender', items: acks.concat(['ack ' + (N * SZ + 1) + ' (all caught up)']), hl: (function () { var h = {}; h[acks.length] = 'sel'; return h; })() }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'RTO after the first sample', html: `<p>First RTT sample = 80 ms: SRTT = 80, RTTVAR = 40, RTO = 80 + 4 × 40 = <b>240 ms</b> (Linux would clamp at least 200 ms; the RFC at least 1 s).</p>` },
      { title: 'Jitter inflates RTO', html: `<p>Samples 100, 100, 100 give RTTVAR → small, RTO close to 100 + a margin. If one sample is 400, |SRTT − R| = 300, RTTVAR jumps by 0.25 × 300 = 75, so RTO grows by about 4 × 56 ≈ 225 ms. This is how a single latency spike makes TCP patient.</p>` },
      { title: 'Why Karn\'s rule', html: `<p>You send seg A at t = 0, it times out, you resend at t = 300. ACK arrives at t = 320. Is RTT 320 or 20? Unknown (maybe the original arrived late). Using the wrong one would corrupt SRTT, so retransmitted segments are skipped, unless TCP timestamps give the answer.</p>` }
    ],
    deepDive: `<p><b>Why 3, not 1 or 2, dup ACKs?</b> Packets can be reordered in the network. One or two dup ACKs often come from mild reordering; three suggests a real loss. Modern Linux uses RACK-TLP (time-based loss detection) to be robust against reordering and to recover tail losses without waiting for RTO: if a segment sent later has been ACKed and the older one remained unacked longer than RTT + a reordering window, it is declared lost. <b>TLP</b> sends a probe after ~2 × SRTT so the last packet of a burst triggers an ACK or SACK.</p>
      <p><b>Spurious retransmissions.</b> A delay spike (mobile handover, wifi retry) can make an RTO fire although nothing was lost. The sender halves cwnd for no reason. F-RTO and Eifel (timestamps / DSACK) detect this and undo the damage.</p>
      <p><b>Delayed ACKs and RTT.</b> A receiver may delay the ACK up to 40 ms (Linux) or 200 ms (older), inflating RTT samples for one-segment-at-a-time senders. <b>RTO min</b> of 200 ms in Linux is a pragmatic compromise; data centres often set it lower (1 ms to 5 ms) to survive incast (many servers answering one client at once overflow a switch buffer and everyone waits 200 ms).</p>
      <p><b>Connection-level give-up.</b> <code>TCP_USER_TIMEOUT</code> aborts the connection when data stays unacked for N ms: useful for mobile apps that want faster failure than 15 minutes. Application keepalive or TCP keepalive (<code>SO_KEEPALIVE</code>, default 2 hours) detects dead peers.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM streaming responses and agent tool calls hold HTTP connections open for long stretches with bursts of tokens. A mobile user switching Wi-Fi to 5G sees spurious RTOs and "frozen" streams. Apps add retries and resumable streams (SSE with Last-Event-ID) on top.</p>
      <p><b>Use AI as a partner:</b> have it write a tcpdump/tshark filter for retransmissions (<code>tcp.analysis.retransmission</code>, <code>tcp.analysis.fast_retransmission</code>), or explain <code>ss -ti</code> fields (<code>rto:204 rtt:3.2/1.5 retrans:0/12</code>). Ask for 5 random RTO calculation exercises and verify with the script above.</p>
      <p><b>Where AI goes wrong:</b> it updates SRTT before RTTVAR (wrong order), forgets Karn's rule, or quotes "RTO min = 1 s" as if Linux used it.</p>
      <p><b>What you must still own:</b> choosing timeouts and retries in your own application layer without causing retry storms (jittered exponential backoff, budgets).</p>`,
    problems: [mk({
      t: 'RTO From RTT Samples', l: 'Medium', tags: ['RTO', 'Jacobson/Karels', 'numeric'], co: ['Cisco', 'Arista', 'Google'],
      s: `<p>Use α = 1/8, β = 1/4, RTO = SRTT + 4·RTTVAR. First RTT sample is 100 ms, then 140 ms, then 60 ms. Compute SRTT, RTTVAR and RTO after each sample. Then the RTO fires once with no ACK: what is the new RTO after backoff? Finally, say whether you may use an RTT sample from a retransmitted segment.</p>`,
      ex: `<p>After sample 1: SRTT = 100, RTTVAR = 50, RTO = 100 + 4×50 = ${H.c('g', '300 ms')}.</p>`,
      b: `<p>A fixed timeout like 1 second: far too long for a 5 ms data-centre link and too short for satellite links with 600 ms RTT.</p>`,
      q: 'Which update goes first when a new sample arrives?', o: ['SRTT, then RTTVAR', 'RTTVAR (using the old SRTT), then SRTT', 'They are updated at the same moment, order is irrelevant', 'RTO only'], a: 1, e: 'RTTVAR needs |SRTT − R| with the previous SRTT.',
      h: [`<p>Hint 1: first sample sets SRTT = R, RTTVAR = R/2.</p>`, `<p>Hint 2: RTTVAR = 0.75·RTTVAR + 0.25·|SRTT − R|.</p>`, `<p>Hint 3: SRTT = 0.875·SRTT + 0.125·R; RTO = SRTT + 4·RTTVAR; backoff doubles RTO; Karn: skip retransmitted samples.</p>`],
      ap: `<p>Sample 100: SRTT 100, RTTVAR 50, RTO 300. Sample 140: RTTVAR = 0.75×50 + 0.25×|100−140| = 37.5 + 10 = 47.5; SRTT = 0.875×100 + 0.125×140 = 87.5 + 17.5 = 105; RTO = 105 + 4×47.5 = 295. Sample 60: RTTVAR = 0.75×47.5 + 0.25×|105−60| = 35.625 + 11.25 = 46.875; SRTT = 0.875×105 + 0.125×60 = 91.875 + 7.5 = 99.375; RTO = 99.375 + 187.5 = 286.875 ms. If the timer fires with no ACK, the RTO doubles to about 573.75 ms (exponential backoff), and the next one 1147.5 ms, up to a cap (120 s on Linux). Karn's algorithm: do not take RTT samples from retransmitted segments since the ACK cannot be matched to a transmission, unless TCP timestamps disambiguate. Then the backed-off RTO is kept until a fresh valid sample arrives.</p>`,
      d: { head: ['Sample R', 'RTTVAR', 'SRTT', 'RTO'], rows: [['100', '50', '100', '300'], ['140', '47.5', '105', '295'], ['60', '46.875', '99.375', '286.875'], ['timer fires', '-', '-', '573.75 (x2)']] },
      f: ['Why does Linux clamp RTO at 200 ms?', 'What changes with TCP timestamps?']
    }), mk({
      t: 'Three Duplicate ACKs: Trace the Recovery', l: 'Medium', tags: ['fast retransmit', 'dup ack'], co: ['Amazon', 'Cisco'],
      s: `<p>Sender sends 6 segments of 100 bytes, first byte number 1. Segment 3 is lost; the rest arrive. List every ACK the receiver sends, say when the sender retransmits, and give the ACK after the retransmission arrives.</p>`,
      ex: `${H.table(['seg', 'bytes', 'ack sent'], [['1', '1-100', '101'], ['2', '101-200', '201']])}`,
      b: `<p>Waiting for the RTO (say 300 ms on a 20 ms RTT path) wastes 15 RTTs of idle line.</p>`,
      q: 'What is a "duplicate ACK" here?', o: ['An ACK with a new higher number', 'The same ack number repeated for out-of-order data', 'An ACK with RST set', 'An ACK sent twice by mistake'], a: 1, e: 'The receiver re-announces the next byte it needs.',
      h: [`<p>Hint 1: ack = next byte wanted; segment 3 starts at byte 201.</p>`, `<p>Hint 2: segments 4, 5 and 6 each trigger an ACK of 201.</p>`, `<p>Hint 3: after the resend the receiver delivers 201-600 and acks 601.</p>`],
      ap: `<p>seg1 (bytes 1-100) → ack 101. seg2 (101-200) → ack 201. seg3 (201-300) lost. seg4 (301-400) arrives out of order → ack 201 (duplicate 1). seg5 (401-500) → ack 201 (duplicate 2). seg6 (501-600) → ack 201 (duplicate 3). At the third duplicate the sender immediately retransmits bytes 201-300 (fast retransmit) and sets ssthresh = cwnd/2, cwnd = ssthresh. The receiver already has 301-600 buffered, so when 201-300 arrives it acks 601 at once: a single cumulative ACK covers segments 3-6. Compared with waiting for an RTO, this recovers in about one RTT.</p>`,
      d: { head: ['Arrives', 'Hole?', 'ACK sent', 'Note'], rows: [['seg1', 'no', '101', ''], ['seg2', 'no', '201', ''], ['seg4', 'yes: 201', '201', 'dup 1'], ['seg5', 'yes', '201', 'dup 2'], ['seg6', 'yes', '201', 'dup 3 → resend 201-300'], ['seg3 (resent)', 'filled', '601', 'cumulative jump']] },
      f: ['What if only two segments follow the lost one?', 'How does SACK change the ACKs?']
    })]
  });
  topics.push({
    title: 'TIME_WAIT: Why 2·MSL, Thousands of Sockets & Port Exhaustion',
    analogy: `<p><b>Keeping a phone number "reserved" after a call.</b> After you hang up, the line stays marked busy for a minute. Why? Maybe your last "goodbye" got lost and the other person repeats theirs: you must still be there to answer. Also any late echo of the old call must fade away before a new caller with the same number gets confused by it. TIME_WAIT is that cooling-off minute, and it belongs to whoever hung up first.</p>`,
    explain: `<p><b>TIME_WAIT</b> is the state of the <i>active closer</i> after it sends the last ACK. The socket stays (kernel keeps a small record) for <b>2 × MSL</b>. MSL = Maximum Segment Lifetime: how long a packet may wander in the network before it is certainly dead (RFC says 2 min; Linux uses a fixed 60 s for the whole TIME_WAIT).</p>
      <p><b>Two reasons for 2·MSL:</b></p>
      <ol><li><b>Reliable last ACK:</b> if our final ACK is lost, the peer resends its FIN after a timeout. We must still be around to ACK again. One MSL for our ACK to travel, one MSL for their FIN resend to come back = 2·MSL. If we were already CLOSED, we would answer RST and the peer would see an error.</li><li><b>Kill stale packets:</b> old duplicates of the previous connection (same 4-tuple) must expire so they can't be mistaken for data in a new connection that reuses the same source port. Waiting 2·MSL guarantees all of them are gone.</li></ol>
      <p><b>Why does a busy server have thousands of TIME_WAIT sockets?</b> Because it is the one calling close() first: e.g. it closes after each HTTP/1.0 response, or a proxy/load balancer closes backend connections after each request, or idle timeouts close connections server-side. Count ≈ <b>(new closed connections per second) × (TIME_WAIT duration)</b>. At 5,000 closes/s × 60 s = <b>300,000</b> TIME_WAIT sockets. They are cheap on a server (about 0.3 KB each in the TW bucket; they do not use a file descriptor or a port the server needs, since the server's side is fixed port 443) and usually harmless. The harm shows up on the <b>client</b> side.</p>
      <p><b>Port exhaustion:</b> a client connecting to one server IP:port can use only the ephemeral port range as the source port. Linux default <code>32768-60999</code> = <b>28,232</b> ports. Each closed connection occupies a port for 60 s, so max sustained new connections to the same destination ≈ 28,232 / 60 ≈ <b>470 per second</b>. Beyond that you see <code>connect(): Cannot assign requested address</code> (EADDRNOTAVAIL). Load testers, API gateways calling one backend, or a NAT gateway hit this.</p>
      ${H.table(['Remedy', 'How', 'Caveat'], [['Reuse connections', 'HTTP keep-alive, connection pools, HTTP/2 multiplexing', 'Best fix: fewer connections at all'], ['Let the <i>client</i> close', 'Move TIME_WAIT to the side with more ports/less load', 'Design choice'], ['Widen port range / more IPs', '<code>ip_local_port_range</code>, extra source IPs or backend IPs', 'More 4-tuples'], ['<code>tcp_tw_reuse=1</code>', 'Outgoing connects may reuse a TIME_WAIT socket if timestamps prove safe', 'Safe for clients; needs timestamps'], ['<code>SO_REUSEADDR</code>', 'Server can re-bind its listening port with old sockets in TIME_WAIT', 'Does not cure client port exhaustion'], ['<i>Not</i> a fix: <code>tcp_tw_recycle</code>', 'Removed in Linux 4.12; broke NAT users', 'Never use']])}`,
    clues: ['"server has thousands of TIME_WAIT" → server closes first; usually harmless; count = rate × 60 s', '"Cannot assign requested address" / "out of ephemeral ports" → client port exhaustion, connect storm to one destination', '"Address already in use when restarting the server" → SO_REUSEADDR', '"why 2·MSL" → last-ACK reliability + old duplicate packets', '"which side is in TIME_WAIT" → the active closer', '"HTTP keep-alive / connection pooling" is the expected remedy', '"SO_LINGER with zero timeout" → sends RST, skips TIME_WAIT but risky'],
    code: [{ lang: 'python', run: true, title: 'TIME_WAIT and ephemeral port math (runnable)', code: `# How many TIME_WAIT sockets, and how fast can a client open NEW connections
# to ONE destination ip:port before running out of source ports?
TIME_WAIT_SECONDS = 60            # Linux fixed value (2 * MSL with MSL = 30 s)
PORT_RANGE = (32768, 60999)       # Linux default net.ipv4.ip_local_port_range
ports = PORT_RANGE[1] - PORT_RANGE[0] + 1

def server_time_wait(closes_per_second):
    # steady state: every close lives TIME_WAIT_SECONDS
    return closes_per_second * TIME_WAIT_SECONDS

def max_new_conn_rate_per_dest():
    return ports / TIME_WAIT_SECONDS

print("ephemeral ports available:", ports)
for rate in (100, 1000, 5000):
    print(f"server closing {rate:>5}/s -> ~{server_time_wait(rate):>7} sockets in TIME_WAIT")
print(f"client limit to ONE server ip:port: ~{max_new_conn_rate_per_dest():.0f} new connections/s")

# With N backend IPs (or N source IPs) every distinct 4-tuple has its own port space
for n in (1, 2, 4):
    print(f"{n} destination IP(s): ~{n * max_new_conn_rate_per_dest():.0f} new connections/s")

# Watch it grow over time for 500 closes/s
rate = 500
print("t(s)  TIME_WAIT")
for t in (10, 30, 60, 90, 120):
    print(f"{t:>4}  {rate * min(t, TIME_WAIT_SECONDS):>8}")` }],
    codeTitle: ['Python: TIME_WAIT and port budget'],
    viz: {
      title: 'TIME_WAIT sockets build up, then plateau',
      input: '500 60',
      inputLabel: 'connections closed per second, TIME_WAIT seconds',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/).map(Number);
        if (t.length < 2 || t.some(function (x) { return !isFinite(x) || x <= 0; })) throw new Error('Enter: closesPerSecond timeWaitSeconds (positive numbers)');
        var rate = t[0], tw = t[1];
        if (rate > 100000 || tw > 240) throw new Error('rate up to 100000/s, TIME_WAIT up to 240 s');
        var PORTS = 28232, frames = [], vals = [], texts = [], idx = [];
        var step = Math.max(1, Math.round(tw / 6)), maxT = tw * 2;
        for (var s = step; s <= maxT + 0.001; s += step) {
          var count = Math.round(rate * Math.min(s, tw));
          vals.push(count); texts.push(String(count)); idx.push(s + 's');
          var plateau = s >= tw;
          var hl = {}; hl[vals.length - 1] = plateau ? 'sel' : 'cur';
          frames.push({ narr: 'At <b>t = ' + s + ' s</b>: ' + (plateau ? 'old entries now expire as fast as new ones arrive → steady state <b>' + count + '</b> = ' + rate + '/s × ' + tw + ' s.' : rate + '/s × ' + s + ' s = <b>' + count + '</b> sockets, nothing has expired yet.'), parts: [
            { type: 'bars', label: 'TIME_WAIT sockets over time', values: vals.slice(), hl: hl, texts: texts.slice(), idxLabels: idx.slice() },
            { type: 'vars', vals: { closes_per_sec: rate, time_wait_seconds: tw, sockets_in_TIME_WAIT: count, client_ports_in_range: PORTS, client_ports_still_free: Math.max(0, PORTS - count) }, hl: PORTS - count <= 0 ? { client_ports_still_free: 'bad' } : { sockets_in_TIME_WAIT: 'cur' } }
          ] });
        }
        frames.push({ narr: 'Reading it: the <b>server</b> just keeps ' + Math.round(rate * tw) + ' tiny records. A <b>client</b> opening ' + rate + ' new connections/s to ONE destination needs ' + Math.round(rate * tw) + ' ports but has only ' + PORTS + ': ' + (rate * tw > PORTS ? '<span class="c-r">port exhaustion!</span> Limit ≈ ' + Math.floor(PORTS / tw) + ' new conn/s.' : '<span class="c-g">it still fits.</span>'), parts: [
          { type: 'vars', vals: { needed_ports: Math.round(rate * tw), available_ports: PORTS, max_new_conn_per_sec: Math.floor(PORTS / tw) }, hl: rate * tw > PORTS ? { needed_ports: 'bad' } : { needed_ports: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'Count the TIME_WAIT sockets', html: `<p>A reverse proxy closes 2,000 backend connections per second (no keep-alive). Steady state: 2,000 × 60 = <b>120,000</b> TIME_WAIT sockets, and the proxy cannot open more than ~470/s to a single backend IP:port. It fails with EADDRNOTAVAIL. Fix: keep-alive pool to the backend.</p>` },
      { title: 'Who has TIME_WAIT: client or server?', html: `<p>Whoever closes first. Normal HTTP/1.1 keep-alive: server often closes idle connections after 60 s, so the server holds them. With <code>Connection: close</code> from the client, the client holds them. Check with <code>ss -tan state time-wait | head</code> and look at which side has the ephemeral port.</p>` },
      { title: 'Restarting a server', html: `<p>You kill and restart your server. It crashes with "bind: Address already in use" for 60 seconds because the old connections on port 8080 are in TIME_WAIT. Add <code>setsockopt(SO_REUSEADDR)</code> before <code>bind()</code> and the restart works instantly.</p>`, code: `#include <sys/socket.h>\nvoid enable_reuse(int fd) {\n    int on = 1;\n    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &on, sizeof on); // call before bind()\n}` }
    ],
    deepDive: `<p><b>Is the TIME_WAIT really 2·MSL?</b> RFC 793 suggests MSL = 2 minutes (TIME_WAIT 4 min). BSD uses 30 s MSL (60 s), Windows 4 min by default (tunable <code>TcpTimedWaitDelay</code>), Linux hardcodes <code>TCP_TIMEWAIT_LEN = 60 s</code>. You cannot tune it via sysctl on Linux (only the number of entries with <code>tcp_max_tw_buckets</code>; over it, old entries are destroyed with a log line, which is risky).</p>
      <p><b>What a TIME_WAIT entry does.</b> It remembers the 4-tuple, the last sequence numbers and timestamp. A new SYN with a higher ISN (and newer timestamp) for the same 4-tuple is allowed to reuse it ("TIME_WAIT assassination" protection and RFC 6191). An old duplicate segment hitting a TIME_WAIT socket is ACKed again or ignored; an RST arriving in TIME_WAIT can terminate it early (RFC 1337 says to ignore, Linux has <code>tcp_rfc1337</code>).</p>
      <p><b>tcp_tw_reuse.</b> Lets a client's <code>connect()</code> pick a source port still in TIME_WAIT if the timestamp shows the new connection is strictly newer, so stale packets can't confuse the peer. Values: 0 off, 1 on, 2 loopback only (default on modern kernels). The reverse direction (accepting a SYN) is handled by the kernel automatically.</p>
      <p><b>SO_LINGER {1, 0}.</b> Close sends RST instead of FIN: no TIME_WAIT, but unsent data is dropped and the peer sees "connection reset". Sometimes used by load generators; never as a general fix.</p>
      <p><b>Design level.</b> The real solution is rarely a sysctl. It is architecture: connection pools, HTTP/2 or gRPC multiplexing, QUIC (no TIME_WAIT: connection IDs), letting the peer with spare ports close first, and spreading across IPs. Cloud NAT gateways have per-IP port limits (about 64k ports per IP, split among VMs), a frequent production gotcha.</p>`,
    aiEra: `<p><b>What AI changes:</b> agent frameworks and LLM gateways make many short HTTPS calls to the same few API hosts (model provider, vector DB, tools). If every call opens a new connection, you get TIME_WAIT storms and NAT port exhaustion. Fix: shared HTTP client sessions with pooling (e.g. one <code>requests.Session</code> or httpx client reused across tasks).</p>
      <p><b>Use AI as a partner:</b> paste <code>ss -s</code> and <code>sysctl net.ipv4.ip_local_port_range</code> and ask for a diagnosis. Ask for a load-test script that reuses connections and compare socket counts before/after.</p>
      <p><b>Where AI goes wrong:</b> it recommends <code>tcp_tw_recycle</code> (removed), blindly sets <code>tcp_tw_reuse</code> or SO_LINGER=0 "to fix TIME_WAIT", or says TIME_WAIT sockets "use up server file descriptors" (they don't).</p>
      <p><b>What you must still own:</b> understanding <i>why</i> the state exists so you can say when it's harmless and when it's the symptom of a missing connection pool.</p>`,
    problems: [mk({
      t: 'Thousands of TIME_WAIT Sockets', l: 'Medium', tags: ['TIME_WAIT', 'port exhaustion', 'debugging'], co: ['Amazon', 'Cloudflare', 'Uber'],
      s: `<p>A web server shows <code>ss -s</code> with 240,000 TIME_WAIT sockets, and the team panics. (a) Is it a problem on the server? (b) How many closes per second does that imply (TIME_WAIT = 60 s)? (c) A load-test client machine hammers one server IP:port with new connections and fails with "Cannot assign requested address" at about 500 requests/s. Why that number? (d) Give three fixes.</p>`,
      ex: `<p>240,000 / 60 s = ${H.c('g', '4,000 connections closed per second')} by whichever side closed first.</p>`,
      b: `<p>"Just set tcp_tw_recycle and tcp_fin_timeout=1." The first is removed from Linux and broke NATed users; the second does not affect TIME_WAIT at all.</p>`,
      q: 'Where can too many TIME_WAIT sockets actually cause an outage?', o: ['On a server listening on port 443', 'On a client making many new connections to one destination', 'On a switch', 'In UDP applications'], a: 1, e: 'The client runs out of ephemeral source ports; the server only stores small records.',
      h: [`<p>Hint 1: count = rate × 60 s.</p>`, `<p>Hint 2: ports per destination = 32768..60999 = 28,232.</p>`, `<p>Hint 3: 28,232 / 60 ≈ 470/s; fix = reuse connections.</p>`],
      ap: `<p>(a) On the server side the entries are cheap (a few hundred bytes each, no file descriptor, the listening port is shared), so 240k is usually harmless; check memory and <code>tcp_max_tw_buckets</code>. It is a hint that the server closes connections itself (no keep-alive, short idle timeout, HTTP/1.0 style). (b) 240,000 / 60 = 4,000 closes per second. (c) A client's 4-tuple is (srcIP, srcPort, dstIP, dstPort). With one destination only the source port varies: 28,232 ports, each blocked 60 s after close, so a sustainable rate ≈ 28,232/60 ≈ 470 new connections per second, matching the 500/s failure. (d) Fix 1: keep-alive/connection pool or HTTP/2 so fewer connections are needed. Fix 2: widen <code>ip_local_port_range</code> and add destination IPs or source IPs to multiply 4-tuples. Fix 3: enable <code>tcp_tw_reuse</code> (client side, with timestamps) or let the other side close first. Never use SO_LINGER=0 or tw_recycle as the default answer.</p>`,
      d: { head: ['Quantity', 'Formula', 'Value'], rows: [['TIME_WAIT sockets', 'rate × 60', '240,000'], ['implied close rate', '240,000 / 60', '4,000/s'], ['client ports', '60999 − 32768 + 1', '28,232'], ['max sustained new conns to one dst', '28,232 / 60', '≈ 470/s']] },
      f: ['What changes with 4 backend IPs?', 'Does SO_REUSEADDR fix this?']
    })]
  });
  topics.push({
    title: 'Nagle\'s Algorithm, Delayed ACK & the 40 ms Stall',
    analogy: `<p><b>A shuttle bus driver who hates leaving half-empty.</b> A passenger boards (small write). The driver says "I'll wait until the last bus is back or I'm full" (Nagle). Meanwhile the dispatcher at the other end says "I'll radio confirmation of the last bus in a bit, maybe a passenger will come along to travel with it" (delayed ACK). Each waits for the other. After a 40 ms timeout the dispatcher radios anyway and the bus leaves. Both rules are sensible alone; together they create a pointless pause.</p>`,
    explain: `<p><b>Nagle's algorithm</b> (sender side) stops a flood of tiny packets: if there is unacknowledged data in flight, new <i>small</i> data (less than a full MSS) is buffered until an ACK arrives or enough data collects to fill an MSS. A 1-byte telnet keystroke would otherwise cost 41 bytes on the wire (40 header + 1 payload).</p>
      <p><b>Delayed ACK</b> (receiver side) stops a flood of pure ACKs: the receiver waits up to ~40 ms (Linux; up to 200 ms elsewhere) hoping to piggyback the ACK on outgoing data, and ACKs at least every second full-sized segment.</p>
      <p><b>The bad interaction (the "write-write-read" pattern):</b> the client writes a small header then a small body in two <code>write()</code> calls, then waits for the reply.</p>
      ${H.table(['Time', 'Event'], [['0 ms', 'Client sends header (4 B). Now unacked data is in flight.'], ['0 ms', 'Client body (100 B, small) is held back by Nagle: waiting for the ACK.'], ['0.2 ms', 'Server gets 4 B, has no reply yet, delays its ACK, hoping for data to piggyback.'], ['40 ms', 'Delayed-ACK timer fires, ACK sent.'], ['40 ms', 'Client gets ACK, Nagle releases the body. Server finally gets the request.']])}
      <p>A <b>40 ms stall</b> per request, on a link with 0.2 ms RTT. A 200x slowdown that looks like "mysterious latency".</p>
      <p><b>Fixes (best first):</b></p>
      <ol><li><b>Send the message in one write</b>: build the buffer, or use <code>writev()</code> / <code>sendmsg()</code> to gather header and body in one call. The cleanest fix.</li><li><b>Set <code>TCP_NODELAY</code></b> on the socket to turn Nagle off. The right default for RPC, HTTP servers, databases, games, and anything request-response latency sensitive.</li><li><code>TCP_CORK</code> (Linux): hold output until you uncork, then flush a full packet. Good for header + sendfile body.</li><li><code>TCP_QUICKACK</code> on the receiver: ACK immediately (resets on each use).</li></ol>
      <p>When to keep Nagle on: bulk transfer is not hurt (full MSS segments are sent anyway); it only helps chatty tiny-write streams such as keystrokes. Modern guidance: <b>enable TCP_NODELAY and batch writes in your application</b>.</p>`,
    clues: ['"requests take exactly ~40 ms (or 200 ms) extra even on a fast LAN" → Nagle + delayed ACK', '"two small writes then wait for response" → write-write-read pattern', '"low-latency RPC / game / trading" → TCP_NODELAY', '"many tiny packets, high header overhead" → Nagle helps (keystrokes, telnet/SSH of old)', '"writev / sendmsg / TCP_CORK" → batching header+body', '"ACK every second segment" → delayed ACK rule'],
    code: [{ lang: 'python', run: true, title: 'Nagle + delayed ACK timeline simulator (runnable)', code: `# Simulates when the client's small BODY write actually leaves the host.
# RTT is tiny (0.4 ms), so any big delay comes from Nagle + delayed ACK.
def timeline(nagle, delayed_ack, delayed_ms=40.0, rtt_ms=0.4):
    events = []
    t = 0.0
    events.append((t, "client writes header (4 B) -> sent immediately (nothing in flight)"))
    events.append((t, "client writes body (100 B)"))
    server_gets_header = t + rtt_ms / 2
    # server's ACK of the header
    if delayed_ack:
        ack_time = server_gets_header + delayed_ms     # waits for the delayed-ACK timer
        events.append((server_gets_header, "server got header, delays its ACK (hoping to piggyback)"))
    else:
        ack_time = server_gets_header                  # ACK right away
        events.append((server_gets_header, "server got header, ACKs immediately"))
    ack_at_client = ack_time + rtt_ms / 2
    if nagle:
        body_sent = ack_at_client                      # Nagle holds small data until the ACK
        events.append((ack_at_client, "ACK reaches client; Nagle releases the body"))
    else:
        body_sent = t                                  # TCP_NODELAY: sent at once
        events.append((t, "TCP_NODELAY: body goes out immediately"))
    done = body_sent + rtt_ms / 2
    events.append((done, "server has the full request"))
    for when, what in sorted(events, key=lambda e: e[0]):
        print(f"  t={when:7.2f} ms  {what}")
    return done

for nagle, dack in [(True, True), (True, False), (False, True), (False, False)]:
    print(f"Nagle={'on' if nagle else 'off'}, delayed ACK={'on' if dack else 'off'}")
    total = timeline(nagle, dack)
    print(f"  => request complete after {total:.2f} ms")
    print()` },
    `// C++: three ways to avoid the stall
#include <sys/socket.h>
#include <sys/uio.h>        // writev
#include <netinet/in.h>
#include <netinet/tcp.h>    // TCP_NODELAY, TCP_CORK, TCP_QUICKACK
#include <cstdint>
#include <cstring>

// 1) Best: one gathered write, header + body leave in the same segment
ssize_t send_message(int fd, const char* hdr, size_t hl, const char* body, size_t bl) {
    iovec parts[2] = { { const_cast<char*>(hdr), hl }, { const_cast<char*>(body), bl } };
    return writev(fd, parts, 2);            // may be partial: real code loops until all bytes sent
}

// 2) Turn Nagle off for latency-sensitive request/response sockets
void set_nodelay(int fd) {
    int on = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &on, sizeof on);
}

// 3) Linux: cork, write the pieces, uncork to flush as full packets
void send_corked(int fd, const char* a, size_t al, const char* b, size_t bl) {
    int on = 1, off = 0;
    setsockopt(fd, IPPROTO_TCP, TCP_CORK, &on, sizeof on);
    send(fd, a, al, MSG_NOSIGNAL);
    send(fd, b, bl, MSG_NOSIGNAL);
    setsockopt(fd, IPPROTO_TCP, TCP_CORK, &off, sizeof off);   // flush now
}`],
    codeTitle: ['Python: Nagle + delayed ACK timeline', 'C++: avoiding the stall'],
    viz: {
      title: 'Header + body writes: where does the 40 ms come from?',
      input: 'nagle=on delayed=on',
      inputLabel: 'nagle=on|off delayed=on|off',
      gen: function (input) {
        var s = String(input).toLowerCase();
        var n = /nagle\s*=\s*(on|off)/.exec(s), d = /delayed\s*=\s*(on|off)/.exec(s);
        if (!n || !d) throw new Error('Format: nagle=on delayed=on  (each on or off)');
        var nagle = n[1] === 'on', del = d[1] === 'on', rows = [], frames = [];
        var vars = function (o) { return { type: 'vars', label: 'Settings', vals: { 'Nagle': nagle ? 'on' : 'off (TCP_NODELAY)', 'delayed ACK': del ? 'on (40 ms)' : 'off', client_waiting_for: o }, hl: { client_waiting_for: 'cur' } }; };
        function add(t, who, what, note, hlcls, w) {
          rows.push([t + ' ms', who, what]);
          var hl = {}; hl[rows.length - 1] = hlcls || 'cur';
          frames.push({ narr: note, parts: [{ type: 'table', label: 'Timeline (RTT 0.4 ms)', columns: ['Time', 'Who', 'What'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }, vars(w)] });
        }
        add('0', 'Client', 'write(header 4 B) → segment sent', 'First small write: nothing is in flight, so it is sent immediately.', 'ok', 'nothing');
        if (nagle) {
          add('0', 'Client', 'write(body 100 B) → HELD by Nagle', 'Second write is small and the header is still unacked, so <b>Nagle holds it back</b>.', 'bad', 'ACK for header');
        } else {
          add('0', 'Client', 'write(body 100 B) → sent immediately', 'TCP_NODELAY: no waiting. The body leaves right away.', 'ok', 'reply');
        }
        add('0.2', 'Server', del ? 'got header; delays ACK' : 'got header; ACKs now', del ? 'Delayed ACK: the server holds its ACK up to 40 ms, hoping to piggyback it on a reply.' : 'Delayed ACK is off: the server ACKs immediately.', del ? 'win' : 'ok', nagle ? 'ACK for header' : 'reply');
        var total;
        if (nagle && del) {
          add('40.2', 'Server', 'delayed-ACK timer fires → ACK', 'Neither side can move: client waits for the ACK, server waits for data. After 40 ms the timer breaks the deadlock.', 'bad', 'ACK for header');
          add('40.4', 'Client', 'ACK arrives; body released', 'Nagle finally releases the body.', 'sel', 'reply');
          total = 40.6;
        } else if (nagle) {
          add('0.4', 'Client', 'ACK arrives; body released', 'The ACK came back at once, so Nagle lets the body go after one RTT.', 'sel', 'reply');
          total = 0.6;
        } else {
          add('0.2', 'Server', 'body arrives with header', 'The request is complete after half an RTT. The delayed ACK is harmless because the reply carries the ACK.', 'sel', 'reply');
          total = 0.2;
        }
        frames.push({ narr: 'Request fully received after <b>' + total + ' ms</b>. ' + (total > 10 ? '<span class="c-r">That is 100x slower than the network needs. Fix: one write (writev) or TCP_NODELAY.</span>' : '<span class="c-g">Fast.</span>'), parts: [{ type: 'vars', vals: { request_complete_ms: total }, hl: { request_complete_ms: total > 10 ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The classic symptom', html: `<p>A client library sends <code>"GET /x HTTP/1.1\\r\\n"</code> then headers in separate writes. A benchmark shows every request takes just over 40 ms even to localhost. Packet capture: a ~40 ms gap between the first and second segment. Cause: Nagle + delayed ACK. Fix: build one buffer or set TCP_NODELAY.</p>` },
      { title: 'Why Nagle exists', html: `<p>Typing in a remote shell sends 1 byte per key: 1 byte of data in a 41-byte packet (about 2.4% efficiency). Nagle groups quick typing into fewer segments. On a slow WAN in the 1980s this saved real bandwidth. Today an SSH session is still fine because SSH sets TCP_NODELAY for interactivity.</p>` },
      { title: 'Delayed ACK rule of thumb', html: `<p>Receiver ACKs at least every <b>second</b> full-size segment, or within ~40 ms (Linux). Bulk download of 10 segments: about 5 ACKs. That halves ACK traffic but also slows slow-start growth slightly (cwnd grows per ACK in classic implementations; Appropriate Byte Counting fixes this).</p>` }
    ],
    deepDive: `<p><b>The exact Nagle rule:</b> if there is unacknowledged data outstanding AND the pending data is less than one MSS, buffer it. Otherwise send. It is self-clocking: the ACK is the "go" signal. Linux also has <code>tcp_autocorking</code> and TSQ, which batch small writes at the qdisc level when the NIC is busy, a smarter variant that adds little latency.</p>
      <p><b>Quick-ACK mode.</b> Linux begins connections in "quickack" mode (ACK every segment) during slow start to let cwnd grow quickly, then switches to delayed ACK. <code>TCP_QUICKACK</code> only lasts until the next event; it is a hack you must re-apply.</p>
      <p><b>Write-write-read is the real bug.</b> Even with NODELAY, two writes produce two packets (extra syscalls, extra headers, and possibly two TLS records). Frameworks like gRPC and HTTP libraries coalesce headers and body before writing. <b>TLS</b> compounds this: each <code>SSL_write</code> creates a record; small records waste bytes and hit the same interplay.</p>
      <p><b>Throughput effects.</b> For bulk transfer none of this matters. For tiny request/response over long RTT, the cost of Nagle is up to one extra RTT. Systems like Redis, memcached, Kafka, and nginx set TCP_NODELAY by default (nginx: <code>tcp_nodelay on</code> for keep-alive connections).</p>
      <p><b>Interaction with congestion control.</b> Interactive sessions with little data never grow cwnd; the delayed-ACK timer (40 ms vs 200 ms) also changes the RTO floor needed (RTO ≥ RTT + delayed ACK delay, otherwise spurious retransmits on the first packet).</p>`,
    aiEra: `<p><b>What AI changes:</b> token-by-token streaming is exactly the "many small writes" pattern. Each token is a few bytes. Servers flush every token with TCP_NODELAY (users see smooth typing) and often batch a few tokens per network write under load. Inference servers use HTTP/2 or gRPC streaming, whose frame sizes interact with the same effects.</p>
      <p><b>Use AI as a partner:</b> give it a packet capture summary showing a 40 ms gap and ask for hypotheses; make it write a repro with two <code>send()</code> calls and a fix with <code>writev</code>. Ask it to audit a code base for sockets missing TCP_NODELAY on RPC paths.</p>
      <p><b>Where AI goes wrong:</b> advising TCP_NODELAY as a cure-all (the app may still send tiny packets), or claiming Nagle slows bulk transfers (it does not), or mixing it up with TCP slow start.</p>
      <p><b>What you must still own:</b> spotting the "write-write-read" smell in code review and explaining why 40 ms (the delayed-ACK timer) is the telltale number.</p>`,
    problems: [mk({
      t: 'Why Is Every Request 40 ms Slow?', l: 'Hard', tags: ['Nagle', 'delayed ACK', 'latency'], co: ['Google', 'Meta', 'Amazon'],
      s: `<p>A microservice client sends a 4-byte length header, then a 100-byte payload using two separate <code>write()</code> calls, and then reads a reply. LAN RTT is 0.4 ms but every call takes about 40.5 ms. (a) Explain exactly what happens on the wire, (b) list three fixes in order of preference, (c) give the request time after fixing, (d) say if the fix changes anything for bulk transfers.</p>`,
      ex: `${H.table(['t', 'event'], [['0', 'header sent'], ['0', 'payload held by Nagle'], ['0.2', 'server delays ACK'], ['40.2', 'ACK sent'], ['40.4', 'payload released']])}`,
      b: `<p>"Switch the transport to UDP" or "buy a faster network". The wire is idle; the delay is two timers waiting on each other.</p>`,
      q: 'Which timer value is the usual fingerprint of this bug on Linux?', o: ['1 s', '40 ms', '2 minutes', '10 µs'], a: 1, e: 'The delayed-ACK timer (about 40 ms on Linux, 200 ms on others) is what finally breaks the wait.',
      h: [`<p>Hint 1: the second write is smaller than an MSS and the first is not yet acknowledged.</p>`, `<p>Hint 2: who is holding back what: the sender (Nagle) holds data, the receiver (delayed ACK) holds the ACK.</p>`, `<p>Hint 3: remove either hold, or avoid the second small write altogether.</p>`],
      ap: `<p>(a) At t=0 the header is sent. The payload is small (100 B &lt; MSS) and there is unacknowledged data in flight, so Nagle buffers it. The server received only 4 bytes, has nothing to send yet, and delays its ACK for up to 40 ms hoping to piggyback it. Both sides wait on each other until the delayed-ACK timer fires at about 40 ms, the ACK reaches the client at 40.4 ms, Nagle releases the payload, and the server gets the full request at about 40.6 ms. (b) Fix 1 (best): coalesce the header and payload into a single write, or use writev/sendmsg, so only one segment is sent and nothing is waiting. Fix 2: set TCP_NODELAY on the socket so Nagle never holds the payload. Fix 3: use TCP_CORK around the two writes, or TCP_QUICKACK on the server (fragile). (c) After fixing, the request arrives in about half an RTT (0.2 ms) and the call completes in roughly one RTT plus processing, about 0.4 ms plus server work. (d) Bulk transfers send full-MSS segments anyway, so Nagle never delayed them; TCP_NODELAY changes nothing there except it allows tiny trailing segments.</p>`,
      d: { head: ['t (ms)', 'Client', 'Server', 'Wire'], rows: [['0', 'write header, write body', '-', 'header (4 B) out'], ['0', 'body held (Nagle)', '-', '-'], ['0.2', '-', 'got header, delays ACK', '-'], ['40.2', '-', 'timer fires', 'ACK back'], ['40.4', 'ACK in, body released', '-', 'body (100 B) out'], ['40.6', '-', 'request complete', '-']] },
      f: ['What if the first write were already a full MSS?', 'Does HTTP/2 or TLS change this?']
    })]
  });
  topics.push({
    title: 'SYN Floods, SYN Cookies & TCP Under Attack',
    analogy: `<p><b>A restaurant that holds a table for every phone reservation.</b> A prankster phones in 500 fake reservations a second. Every table is "reserved" for a guest who never shows up, and real customers find the place full. <b>SYN cookies</b> are the trick: instead of holding a table, the host writes a secret code on a ticket and hands it back. Only a real caller who returns with that ticket gets a table. The restaurant remembers nothing until the ticket comes back.</p>`,
    explain: `<p>Remember the handshake: the server, after getting a SYN, creates a half-open entry (SYN_RCVD) in its <b>SYN queue</b>, sends SYN+ACK, and waits for the final ACK. That entry costs memory and lasts a long time (the server retries SYN+ACK about 5 times, roughly 60 s).</p>
      <p><b>SYN flood:</b> an attacker sends huge numbers of SYNs, usually with <b>spoofed random source IPs</b>. The server's SYN+ACK goes to nobody, the final ACK never comes, and the queue fills. Real clients get dropped SYNs: denial of service. Cost to attacker: 1 tiny packet. Cost to server: a table slot for ~60 s.</p>
      ${H.table(['Numbers', 'Value'], [['SYN queue size', '128 entries (example)'], ['Attack rate', '1,000 SYN/s'], ['Time to fill the queue', '128 / 1000 = 0.128 s'], ['Each fake entry lives', '~60 s (SYN+ACK retries)'], ['Entries the attack would want to hold', '1,000 × 60 = 60,000']])}
      <p><b>SYN cookies (the defence):</b> when the queue is full, the server stops storing state. It encodes what it needs into the <b>sequence number of its SYN+ACK</b> (the ISN): a keyed hash (secret + client IP/port + server IP/port + a slowly changing timestamp) plus a few bits for the MSS value. A legitimate client answers with ACK carrying ack = cookie + 1. The server recomputes the hash from the packet itself; if it matches, it builds the connection <i>then</i>, with no memory used before. Spoofed senders never respond, so they cost nothing.</p>
      <p><b>Trade-offs:</b> the options (window scale, SACK) are stored in less space or lost (unless timestamps are used to carry them), and the server cannot retransmit the SYN+ACK. So Linux turns cookies on only when the queue overflows (<code>net.ipv4.tcp_syncookies=1</code>).</p>
      <p><b>Other defences:</b> bigger backlog (<code>tcp_max_syn_backlog</code>, <code>somaxconn</code>), fewer SYN+ACK retries, rate limiting per source, upstream DDoS scrubbing / anycast CDNs (Cloudflare, AWS Shield) and hardware that handles SYN proxying (the edge completes the handshake and only then connects to your server).</p>`,
    clues: ['"many connections in SYN_RECV state" → SYN flood or tiny backlog', '"half-open connections", "spoofed source IPs" → SYN flood', '"stateless defence", "encode state in the ISN" → SYN cookies', '"server unreachable but CPU is idle and bandwidth is low" → exhausted queue, not bandwidth', '"RST attack / connection reset injection" → needs the right 4-tuple and sequence in window (hence random ISN)', '"amplification / reflection" → UDP services with spoofed source IPs'],
    code: [{ lang: 'python', run: true, title: 'SYN queue under flood, with and without SYN cookies (runnable)', code: `# Tiny simulation: a server with a fixed SYN queue. Each half-open entry lives HOLD seconds.
# Legit clients complete the handshake quickly; fake SYNs never do.
import hashlib

def cookie(secret, src, sport, dst, dport, minute):
    # Real SYN cookies pack a 24-bit keyed hash + MSS index + counter into the 32-bit ISN.
    h = hashlib.sha256(f"{secret}|{src}|{sport}|{dst}|{dport}|{minute}".encode()).digest()
    return int.from_bytes(h[:4], "big")

def run(queue_size, flood_per_sec, legit_per_sec, seconds, hold, use_cookies):
    entries = []              # list of expiry times for half-open entries
    legit_ok = legit_bad = 0
    for sec in range(seconds):
        entries = [t for t in entries if t > sec]            # drop expired entries
        # attack SYNs arrive first in this second
        for _ in range(flood_per_sec):
            if len(entries) < queue_size:
                entries.append(sec + hold)                   # fake entry that never completes
            elif use_cookies:
                pass                                         # stateless: nothing stored
        # legit SYNs
        for _ in range(legit_per_sec):
            if len(entries) < queue_size:
                legit_ok += 1                                # got a slot, finishes quickly
            elif use_cookies:
                legit_ok += 1                                # cookie path: no slot needed
            else:
                legit_bad += 1                               # SYN dropped: user sees timeout
    return legit_ok, legit_bad

for cookies in (False, True):
    ok, bad = run(queue_size=128, flood_per_sec=1000, legit_per_sec=20, seconds=30, hold=60, use_cookies=cookies)
    print(f"cookies={cookies!s:<5} legit connected={ok:>4} dropped={bad:>4}")

# Cookie validation: server stores nothing, recomputes the hash from the returning ACK
secret = "server-secret"
isn = cookie(secret, "198.51.100.7", 40001, "203.0.113.5", 443, 12345)
print("SYN+ACK seq (the cookie):", isn)
ack_from_client = (isn + 1) % 2 ** 32
print("valid ACK?", ack_from_client == (cookie(secret, "198.51.100.7", 40001, "203.0.113.5", 443, 12345) + 1) % 2 ** 32)
print("spoofed source valid?", False, "(it never sees the SYN+ACK, so it cannot echo the cookie)")` }],
    codeTitle: ['Python: SYN queue and cookie model'],
    viz: {
      title: 'SYN flood vs the SYN queue',
      input: '128 1000 20 cookies=off',
      inputLabel: 'queue size, attack SYN/s, legit SYN/s, cookies=on|off',
      gen: function (input) {
        var tk = String(input).trim().split(/\s+/);
        var Q = parseInt(tk[0], 10), A = parseInt(tk[1], 10), Lg = parseInt(tk[2], 10), ck = /cookies\s*=\s*on/i.test(String(input));
        if (!(Q >= 1 && Q <= 100000) || !(A >= 0 && A <= 10000000) || !(Lg >= 0 && Lg <= 100000)) throw new Error('Format: queueSize attackSynPerSec legitSynPerSec cookies=on|off');
        var nodes = [
          { id: 'A', label: 'Attacker (spoofed IPs)', x: 15, y: 10, shape: 'box', w: 28 },
          { id: 'L', label: 'Legit client', x: 15, y: 50, shape: 'box', w: 22 },
          { id: 'S', label: 'Server SYN queue', x: 75, y: 30, shape: 'box', w: 26 }
        ];
        var frames = [];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Handshake path', directed: true, height: 62, nodes: nodes, edges: [['A', 'S', 'SYN flood'], ['L', 'S', 'SYN'], ['S', 'L', 'SYN+ACK']], hl: hl, ehl: ehl, tags: tags || {} }; }
        frames.push({ narr: 'Normal day: a legit client sends SYN, server allocates a half-open entry in a queue of <b>' + Q + '</b> slots and answers SYN+ACK.', parts: [g({ L: 'ok', S: 'cur' }, { 'L-S': 'ok', 'S-L': 'ok' }, { S: '0 / ' + Q + ' used' })] });
        var fillSec = A > 0 ? Q / A : Infinity;
        frames.push({ narr: 'Attack: <b>' + A + ' SYN/s</b> with forged source IPs. Each one creates a half-open entry that will never be completed (nobody receives the SYN+ACK).', parts: [g({ A: 'bad', S: 'cur' }, { 'A-S': 'bad' }, { S: 'filling' }), { type: 'vars', vals: { queue_size: Q, attack_rate_per_s: A, seconds_to_fill: A > 0 ? Math.round(fillSec * 1000) / 1000 : 'never' }, hl: { seconds_to_fill: 'bad' } }] });
        frames.push({ narr: 'Each fake entry survives about <b>60 s</b> (SYN+ACK retransmits). To keep the queue full the attacker needs only <b>' + Math.ceil(Q / 60) + ' SYN/s</b>; here it sends ' + A + '/s: ' + (A * 60 > Q ? '<span class="c-r">far more than enough</span>.' : '<span class="c-g">not enough to keep it full</span>.'), parts: [{ type: 'vars', vals: { entries_attacker_wants_to_hold: A * 60, queue_size: Q, min_rate_to_hold_queue_full: Math.ceil(Q / 60) }, hl: { min_rate_to_hold_queue_full: 'sel' } }] });
        if (!ck && A * 60 > Q) {
          frames.push({ narr: 'Queue is <b>full</b>. Every new legit SYN is dropped; the user just sees a timeout and retries after 1 s, 2 s, 4 s.', parts: [g({ A: 'bad', L: 'bad', S: 'bad' }, { 'A-S': 'bad', 'L-S': 'bad' }, { S: Q + ' / ' + Q + ' FULL' }), { type: 'vars', vals: { legit_syn_per_s: Lg, outcome: 'dropped: denial of service' }, hl: { outcome: 'bad' } }] });
          frames.push({ narr: 'Fix: turn on <b>SYN cookies</b> (<code>tcp_syncookies=1</code>) and re-run with <code>cookies=on</code>. Server keeps no state until a valid ACK returns.', parts: [{ type: 'text', html: 'Try the input <code>' + Q + ' ' + A + ' ' + Lg + ' cookies=on</code>.' }] });
        } else {
          frames.push({ narr: ck ? 'Queue full, so the server switches to <b>SYN cookies</b>: the SYN+ACK sequence number = keyed hash of (secret, client IP/port, server IP/port, time) + MSS bits. <b>Nothing is stored.</b>' : 'The attack is too weak to fill the queue; legit clients still get slots.', parts: [g({ S: 'ok' }, { 'S-L': 'ok' }, { S: ck ? 'stateless' : 'has room' })] });
          if (ck) {
            frames.push({ narr: 'Legit client receives the SYN+ACK and replies ACK with ack = cookie + 1. Server <b>recomputes the hash</b> from the packet; match → create the connection now. Forged-IP attackers never see the cookie, so their ACKs never come: they waste only their own bandwidth.', parts: [g({ L: 'ok', S: 'ok', A: 'done' }, { 'L-S': 'ok', 'S-L': 'ok' }, { S: 'connection created' }), { type: 'vars', vals: { legit_connected_per_s: Lg, state_used_by_attack: 0 }, hl: { state_used_by_attack: 'ok' } }] });
          }
        }
        return frames;
      }
    },
    examples: [
      { title: 'Spot a SYN flood', html: `<p><code>ss -n state syn-recv | wc -l</code> shows 70,000 and <code>nstat | grep -i syn</code> shows TcpExtTCPReqQFullDoCookies or ListenDrops rising. Bandwidth is low (SYN packets are 60 bytes) and CPU is idle: the queue is exhausted, not the link. Logs: "possible SYN flooding on port 443. Sending cookies."</p>` },
      { title: 'Why spoofing is essential to the attack', html: `<p>If the attacker used its real IP, the server's SYN+ACK would arrive at a real machine that replies RST (it never sent a SYN), freeing the slot at once. And per-IP rate limits would block it. Forged random sources make both defences useless, so network filtering (BCP38 anti-spoofing at ISPs) matters.</p>` },
      { title: 'Why the cookie contains an MSS index', html: `<p>The server must know the client's MSS later but remembers nothing. So 3 bits of the cookie select one of 8 common MSS values (e.g. 536, 1220, 1440, 1460). Other options like window scaling were historically lost, which is why cookies are used only under attack, and why TCP timestamps are used on Linux to smuggle SACK / wscale in.</p>` }
    ],
    deepDive: `<p><b>Cookie layout (simplified):</b> the 32-bit ISN mixes a coarse counter that changes every 64 s, a 3-bit MSS index and a keyed hash of the 4-tuple (Linux also folds in the client's ISN). The server accepts the current and previous counter values (a window of roughly two minutes). Collision/forgery probability per guess is 2<sup>-24</sup>, which is why attackers can't just brute-force an ACK flood to bypass it, though ACK floods with <i>valid</i> cookies are possible if they can see traffic.</p>
      <p><b>Two queues on Linux.</b> The SYN queue (<code>tcp_max_syn_backlog</code>, half-open) and the accept queue (<code>min(backlog, somaxconn)</code>, completed). A full accept queue (app too slow to call accept) drops the final ACK and appears as slow connects, not SYN floods. <code>ss -ltn</code> Recv-Q vs Send-Q on LISTEN shows it.</p>
      <p><b>Other transport attacks.</b> <i>ACK/RST floods</i> (stateless packets that the kernel must look up), <i>connection exhaustion</i> (Slowloris: many slow HTTP connections), <i>reflection/amplification</i> with UDP (DNS, NTP, memcached, CLDAP), <i>TCP reset injection</i> (needs 4-tuple + in-window sequence; RFC 5961 makes it harder by challenge-ACKs), <i>sequence prediction</i> (the classic Mitnick attack, fixed by random ISNs).</p>
      <p><b>Real mitigation stack.</b> Anycast network spreads attack traffic to many sites; edge scrubbing with SYN proxy; kernel cookies as last line; eBPF/XDP programs (e.g. Cloudflare's, Cilium) drop bad SYNs at the NIC driver at tens of millions of packets per second; app tier uses connection limits and timeouts. <b>QUIC</b> changes the picture: Retry tokens and the amplification limit (3x) serve the role of cookies.</p>`,
    aiEra: `<p><b>What AI changes:</b> attackers use AI to randomise traffic patterns and craft low-and-slow attacks that evade static thresholds; defenders use ML-based anomaly detection on flow data. LLM API endpoints are attractive targets (expensive per request), so rate limiting by token and per-key is more important than raw packets.</p>
      <p><b>Use AI as a partner:</b> ask it to explain a <code>dmesg</code> "possible SYN flooding" message, draft an incident runbook, or generate <code>iptables</code>/<code>nftables</code> rules for rate-limiting new connections, then review them carefully before applying in production.</p>
      <p><b>Where AI goes wrong:</b> it suggests blocking source IPs (useless against spoofed floods), or recommends disabling syncookies "for performance", or confuses SYN flood (state exhaustion) with volumetric DDoS (bandwidth exhaustion).</p>
      <p><b>What you must still own:</b> a clear mental model of what resource is exhausted (queue slots, CPU, bandwidth, file descriptors) because the right fix follows from it.</p>`,
    problems: [mk({
      t: 'Explain SYN Flood and SYN Cookies', l: 'Hard', tags: ['security', 'SYN flood', 'SYN cookies'], co: ['Cloudflare', 'Akamai', 'Cisco'],
      s: `<p>Your HTTPS server has a SYN queue of 128 slots and half-open entries live 60 s. An attacker sends 1,000 spoofed SYN/s. (a) How long until the queue is full? (b) What is the minimum attack rate that keeps it full? (c) Why can't you simply block the attacker's IP? (d) Describe exactly how SYN cookies let the server survive, step by step, including what the server stores. (e) Name two costs of SYN cookies.</p>`,
      ex: `<p>Queue full after 128 / 1000 = ${H.c('r', '0.128 s')}. After that, every legit SYN is dropped.</p>`,
      b: `<p>"Increase the queue to a million slots." The attacker sends more; memory is wasted on ghosts; each entry still lives 60 s.</p>`,
      q: 'What does the server store when it answers a SYN with a SYN cookie?', o: ['The client IP and port in a hash table', 'Nothing: state is encoded in the sequence number', 'A copy of the client SYN packet', 'A TLS session ticket'], a: 1, e: 'Stateless: validation happens by recomputing the hash from the returning ACK.',
      h: [`<p>Hint 1: time to fill = queue / rate.</p>`, `<p>Hint 2: steady-state occupancy = rate × lifetime, so the minimal rate = queue / lifetime.</p>`, `<p>Hint 3: the cookie is the ISN: hash(secret, 4-tuple, time) + MSS index. The returning ACK must be cookie + 1.</p>`],
      ap: `<p>(a) 128 / 1000 = 0.128 s. (b) Entries live 60 s, so the attacker needs 128 / 60 ≈ 2.1, i.e. about 3 SYN/s to keep the queue full: a trivial cost, which is why SYN floods are so cheap. (c) Source addresses are forged and random, so there is no single IP to block, and blocking spoofed addresses would block innocent victims whose IPs were forged. (d) When the queue overflows, the server computes ISN = hash(secret key, client IP, client port, server IP, server port, coarse timestamp) combined with a small MSS index, sends SYN+ACK with that value and stores nothing. A real client replies ACK with ack = ISN + 1. The server recomputes the hash from the 4-tuple and the time window; if it matches, the connection is valid and is created now with the MSS decoded from the cookie. A spoofing attacker never receives the SYN+ACK and cannot produce a valid ACK (24-bit hash, secret key). (e) Costs: TCP options such as window scaling and SACK may be lost or squeezed (unless timestamps carry them) so throughput suffers; and the server cannot retransmit a lost SYN+ACK because it kept no record. Hence cookies are enabled only when the queue overflows. Complement with edge filtering, upstream scrubbing and rate limits.</p>`,
      d: { head: ['Step', 'Server stores', 'Notes'], rows: [['Flood arrives, queue < full', 'half-open entries', 'normal path'], ['Queue full', 'switch to cookies', 'log "Sending cookies"'], ['Send SYN+ACK', 'nothing', 'seq = cookie'], ['Valid ACK returns (ack = cookie+1)', 'create connection now', 'recompute hash'], ['Spoofed SYNs', 'nothing', 'never answered']] },
      f: ['How does QUIC solve the same issue?', 'What if the attacker sends valid-looking ACK floods?']
    })]
  });
  // ---------------- PRACTICE ----------------
  practice.push(mk({
    t: 'Read the Headers: Payload Sizes', l: 'Easy', tags: ['headers', 'UDP', 'TCP'], co: ['Cisco'],
    s: `<p>(a) A UDP datagram has Length = 508. How many payload bytes? (b) A TCP segment has Data offset = 8 and the IP packet Total Length = 1500 (IPv4, no IP options). How many TCP payload bytes? What do the extra header bytes usually carry?</p>`,
    ex: `<p>UDP header is always 8 bytes. TCP header = Data offset × 4 bytes.</p>`,
    b: `<p>Assuming TCP headers are always 20 bytes gives 1460, which is wrong whenever options (timestamps) are present.</p>`,
    q: 'Data offset = 5 means a TCP header of…', o: ['5 bytes', '20 bytes', '50 bytes', '40 bytes'], a: 1, e: 'The field counts 4-byte words: 5 × 4 = 20.',
    h: [`<p>UDP Length includes its own header.</p>`, `<p>TCP header bytes = offset × 4.</p>`, `<p>Payload = IP total − IP header (20) − TCP header.</p>`],
    ap: `<p>(a) 508 − 8 = 500 bytes of payload. (b) TCP header = 8 × 4 = 32 bytes, so payload = 1500 − 20 (IP) − 32 (TCP) = 1448 bytes. The extra 12 bytes beyond the base 20 are options, typically TCP timestamps (10 bytes + 2 padding/NOPs), which is why 1448 is the common real-world MSS on Linux links with MTU 1500.</p>`,
    d: { head: ['Part', 'Bytes'], rows: [['IP header', '20'], ['TCP header (8 × 4)', '32'], ['Payload', '1500 − 52 = 1448']] }
  }));
  practice.push(mk({
    t: 'Throughput from Window and RTT', l: 'Easy', tags: ['throughput', 'window'], co: ['Amazon', 'Cisco'],
    s: `<p>A TCP connection has an effective window of 128 KB (131,072 bytes) and RTT = 80 ms on a 1 Gbps link with no loss. What is the maximum throughput in Mbps? What limits it? What window would fill the link?</p>`,
    ex: `<p>Rule: throughput ≈ window / RTT.</p>`,
    b: `<p>"1 Gbps link, so 1 Gbps throughput": ignores that the sender must stop and wait after each window.</p>`,
    q: 'Which change raises throughput on this link?', o: ['A bigger window (buffers + window scaling)', 'A faster CPU', 'Using UDP checksums', 'A smaller MSS'], a: 0, e: 'Throughput is window / RTT, and the window is the limit here.',
    h: [`<p>Convert bytes to bits.</p>`, `<p>131,072 B / 0.08 s.</p>`, `<p>Needed window = bandwidth × RTT.</p>`],
    ap: `<p>Throughput = 131,072 B / 0.08 s = 1,638,400 B/s = 13.1 Mbps (about 1.3% of the link). The window (not the network) is the bottleneck: after sending 128 KB the sender must wait for the first ACK, a full RTT. To fill 1 Gbps with an 80 ms RTT the window must equal the BDP: 125,000,000 B/s × 0.08 s = 10,000,000 B (10 MB), which needs window scaling and buffers of at least that size.</p>`,
    d: { head: ['Step', 'Value'], rows: [['window', '131,072 B'], ['÷ RTT', '/ 0.08 s = 1,638,400 B/s'], ['× 8', '13.1 Mbps'], ['BDP', '125e6 × 0.08 = 10 MB']] }
  }));
  practice.push(mk({
    t: 'Why Not a Two-Way Handshake?', l: 'Easy', tags: ['handshake', 'concepts'], co: ['Microsoft', 'Amazon'],
    s: `<p>Explain why TCP uses three messages to open a connection and not two. Include what each message carries and what could go wrong with only two.</p>`,
    ex: `<p>Client ISN x, server ISN y.</p>`,
    b: `<p>"Because that's how the RFC says so." That is not a reason.</p>`,
    q: 'What does the third message prove?', o: ['The client received the server ISN, so both directions work and both ISNs are agreed', 'The data is encrypted', 'The server has a free port', 'The window size is fixed'], a: 0, e: 'ACK of y+1 confirms the server\'s ISN reached the client.',
    h: [`<p>Each side needs its ISN acknowledged.</p>`, `<p>With two messages the server cannot know its SYN+ACK arrived.</p>`, `<p>Think about delayed duplicate SYNs from old connections.</p>`],
    ap: `<p>TCP is full-duplex, so each direction has its own sequence space that must be synchronized: the client announces ISN x (SYN), the server announces ISN y and acknowledges x+1 (SYN+ACK), and the client acknowledges y+1 (ACK). Two messages would leave the server with no proof that the client received y: it would think the connection was open and allocate resources while the client might never have heard it. Worse, a delayed duplicate SYN from an old, dead connection would make the server open a connection nobody wants; with the third message, the real client would answer such a stray SYN+ACK with RST (since it sent no SYN), so the server discards it. Also it proves the client address is reachable (anti-spoofing).</p>`
  }));
  practice.push(mk({
    t: 'Seq and Ack with ISN 7000', l: 'Easy', tags: ['seq/ack'], co: ['Cisco', 'Juniper'],
    s: `<p>Client ISN = 7000, server ISN = 90000. Handshake, then client sends two segments of 250 bytes each. Write every segment (flags, seq, ack, len).</p>`,
    ex: `<p>SYN seq=7000 → SYN+ACK seq=90000 ack=7001 → ACK seq=7001 ack=90001.</p>`,
    b: `<p>Forgetting that SYN consumes a sequence number gives ack=7000.</p>`,
    q: 'Server gets seq=7251, len=250. Its ack is…', o: ['7250', '7251', '7500', '7501'], a: 3, e: '7251 + 250 = 7501.',
    h: [`<p>First data byte is 7001.</p>`, `<p>ack = seq + len.</p>`, `<p>Server seq stays 90001 (no data sent).</p>`],
    ap: `<p>1) C→S SYN seq=7000. 2) S→C SYN+ACK seq=90000 ack=7001. 3) C→S ACK seq=7001 ack=90001. 4) C→S data seq=7001 ack=90001 len=250. 5) S→C ACK seq=90001 ack=7251. 6) C→S data seq=7251 ack=90001 len=250. 7) S→C ACK seq=90001 ack=7501. If the server delays ACKs and acks both segments at once, the single ACK is ack=7501.</p>`,
    d: { head: ['#', 'Dir', 'seq', 'ack', 'len'], rows: [['1', 'C SYN', '7000', '-', '0'], ['2', 'S SYN+ACK', '90000', '7001', '0'], ['3', 'C ACK', '7001', '90001', '0'], ['4', 'C data', '7001', '90001', '250'], ['5', 'S ACK', '90001', '7251', '0'], ['6', 'C data', '7251', '90001', '250'], ['7', 'S ACK', '90001', '7501', '0']] }
  }));
  practice.push(mk({
    t: 'Window Scale for a 10 Gbps Link', l: 'Medium', tags: ['BDP', 'window scale'], co: ['Google', 'Cloudflare'],
    s: `<p>A 10 Gbps path has RTT 80 ms. (a) What is the BDP? (b) The plain TCP window field is 16 bits. What throughput results without scaling? (c) What is the minimal window-scale shift count to cover the BDP? (d) What is the largest possible window?</p>`,
    ex: `<p>BDP = bandwidth (bytes/s) × RTT.</p>`,
    b: `<p>Opening 100 parallel connections "to fill the link" instead of fixing the window works but wastes sockets and is unfair to others.</p>`,
    q: 'The window scale option is negotiated…', o: ['In every data segment', 'Only in the SYN and SYN+ACK', 'After 10 segments', 'In the FIN'], a: 1, e: 'Both ends must agree during the handshake; it can\'t be added later.',
    h: [`<p>10 Gbps = 1.25e9 B/s.</p>`, `<p>Window max = 65,535 × 2<sup>shift</sup>.</p>`, `<p>Shift max is 14.</p>`],
    ap: `<p>(a) 1.25e9 B/s × 0.08 s = 100,000,000 bytes (100 MB). (b) Without scaling: 65,535 B / 0.08 s = 819,187 B/s = 6.55 Mbps, about 0.07% of the link. (c) Need 65,535 × 2^n ≥ 1e8, so 2^n ≥ 1,526, n = 11 (2^11 = 2048 gives a 134 MB max window; n = 10 gives only 67 MB). (d) Maximum is shift 14: 65,535 × 16,384 ≈ 1,073,725,440 bytes (about 1 GiB). Also send and receive buffers must be at least the BDP, and cwnd must grow that big, so congestion control (CUBIC/BBR) needs a loss-free run of many RTTs to get there.</p>`,
    d: { head: ['Shift', 'Max window', 'Enough for 100 MB?'], rows: [['0', '65 KB', 'no'], ['10', '67 MB', 'no'], ['11', '134 MB', '<span class="c-g">yes</span>'], ['14', '1.07 GB', 'yes (max)']] }
  }));
  practice.push(mk({
    t: 'Throughput Under Loss (Mathis)', l: 'Medium', tags: ['congestion', 'throughput'], co: ['Google', 'Netflix'],
    s: `<p>Using throughput ≈ (MSS / RTT) × 1.22 / √p, compute the Reno-style throughput for MSS = 1460 B, RTT = 100 ms with loss rate p = 1% and again p = 0.01%. What does it say about long-RTT, lossy paths?</p>`,
    ex: `<p>MSS/RTT = 14,600 B/s = 116,800 bit/s.</p>`,
    b: `<p>"Throughput = link rate": ignores that loss repeatedly halves the window.</p>`,
    q: 'Loss rate falls 100x. Throughput rises about…', o: ['100x', '10x', '2x', '1x'], a: 1, e: 'Throughput ∝ 1/√p, so 100x less loss gives 10x more.',
    h: [`<p>√0.01 = 0.1, √0.0001 = 0.01.</p>`, `<p>1.22 / 0.1 = 12.2.</p>`, `<p>Multiply by 8 for bits.</p>`],
    ap: `<p>For p = 1%: factor 1.22/0.1 = 12.2; 116,800 bit/s × 12.2 ≈ 1.42 Mbps. For p = 0.01%: factor 1.22/0.01 = 122; 116,800 × 122 ≈ 14.2 Mbps. Throughput scales as 1/√p and 1/RTT, so a 100 ms path with only 1% loss cannot exceed about 1.4 Mbps regardless of link speed. This is why Wi-Fi/mobile loss that is not congestion hurts so much, why CDNs put servers near users (shorter RTT), and why BBR (which does not treat each loss as a halving signal) can do much better on such paths.</p>`,
    d: { head: ['p', '1.22/√p', 'Throughput'], rows: [['1%', '12.2', '≈ 1.42 Mbps'], ['0.01%', '122', '≈ 14.2 Mbps']] }
  }));
  practice.push(mk({
    t: 'Debug: CLOSE_WAIT Pile-Up', l: 'Medium', tags: ['CLOSE_WAIT', 'debugging'], co: ['Amazon', 'Uber'],
    s: `<p>A Java service's <code>ss -tan</code> shows 15,000 sockets in CLOSE_WAIT and climbing; it eventually fails with "Too many open files". Explain what CLOSE_WAIT means, why no timeout clears it, how you find the leak, and what the fix looks like.</p>`,
    ex: `<p>CLOSE_WAIT = peer sent FIN, our kernel ACKed it, our app has not called close().</p>`,
    b: `<p>Raise the file descriptor limit and restart nightly. It hides the bug until the next limit.</p>`,
    q: 'Which state would the PEER of these sockets be in?', o: ['LISTEN', 'FIN_WAIT_2 (then TIME_WAIT after we close)', 'SYN_SENT', 'CLOSING'], a: 1, e: 'The peer closed first and awaits our FIN in FIN_WAIT_2.',
    h: [`<p>Whose job is it to leave CLOSE_WAIT?</p>`, `<p>Use <code>ss -tanp</code> or <code>lsof -p PID</code> to see which remote and which thread.</p>`, `<p>Look for exception paths that skip close().</p>`],
    ap: `<p>CLOSE_WAIT means the remote end already closed its half (we got FIN, kernel sent ACK) and the local application has not yet called close() on the descriptor. The TCP state machine waits indefinitely for the application, so no timer clears it; the descriptors leak until the process hits the file limit. Diagnose: <code>ss -tanp state close-wait</code> to see the owning process and the remote peers (often one downstream dependency such as a DB or HTTP backend), then take a thread dump or heap dump to find the objects holding the sockets (unclosed HTTP response bodies, connections never returned to the pool, error paths that skip finally). Fix: use try-with-resources or finally to always close, consume and close response bodies, set client timeouts, and configure the pool's max lifetime and validation. Add an alert on the CLOSE_WAIT count and the fd usage ratio.</p>`,
    d: { head: ['Step', 'Observation', 'Action'], rows: [['1', 'CLOSE_WAIT count rises', 'ss -tanp state close-wait'], ['2', 'Same remote peer', 'inspect that client code'], ['3', 'fd count near ulimit', 'lsof -p PID | wc -l'], ['4', 'Missing close on error path', 'try-with-resources / finally']] }
  }));
  practice.push(mk({
    t: 'How Many RTTs to Download 100 KB?', l: 'Medium', tags: ['slow start', 'latency'], co: ['Google', 'Meta'],
    s: `<p>A server sends a 100 KB file (100 segments of 1 KB) on a fresh TCP connection, no loss, ample bandwidth, rwnd large. Count RTTs after the handshake with (a) initial cwnd = 1 and (b) initial cwnd = 10. Add the handshake RTT for the total time to the last byte (ignore transmission time).</p>`,
    ex: `<p>Segments sent per RTT in slow start: IW, 2·IW, 4·IW ...</p>`,
    b: `<p>"100 KB at 1 Gbps takes 0.8 ms": bandwidth is not the constraint; round trips are.</p>`,
    q: 'Why does a larger initial window help small web pages?', o: ['More segments fit in the first RTT', 'Shorter headers', 'Fewer ACKs', 'Higher link speed'], a: 0, e: 'Small pages finish before slow start has time to grow.',
    h: [`<p>Cumulative segments after k RTTs: IW × (2<sup>k</sup> − 1).</p>`, `<p>Find the smallest k with cumulative ≥ 100.</p>`, `<p>Add 1 RTT for the handshake (data starts after the final ACK).</p>`],
    ap: `<p>(a) IW = 1: cumulative sent after RTT 1..7 = 1, 3, 7, 15, 31, 63, 127. 100 ≤ 127, so 7 RTTs of data. Total ≈ 1 (handshake) + 7 = 8 RTTs (plus half an RTT for the last segment to arrive). (b) IW = 10: cumulative = 10, 30, 70, 150, so 4 RTTs of data and 1 (handshake) = 5 RTTs total. With RTT 50 ms: 400 ms vs 250 ms. This is exactly why Linux uses IW10 and why web performance people count round trips, why HTTP/3 and TLS 1.3 trim handshake RTTs, and why CDNs bring the server close.</p>`,
    d: { head: ['RTT', 'cwnd IW=1', 'cum.', 'cwnd IW=10', 'cum.'], rows: [['1', '1', '1', '10', '10'], ['2', '2', '3', '20', '30'], ['3', '4', '7', '40', '70'], ['4', '8', '15', '80', '150 (done)'], ['5', '16', '31', '-', '-'], ['6', '32', '63', '-', '-'], ['7', '64', '127 (done)', '-', '-']] }
  }));
  practice.push(mk({
    t: 'The Last ACK Is Lost', l: 'Medium', tags: ['TIME_WAIT', 'teardown'], co: ['Cisco', 'Arista'],
    s: `<p>During a normal close, the active closer's final ACK is lost on the network. Walk through what happens on both sides, naming states, and explain how this justifies TIME_WAIT. What would happen if the active closer had moved straight to CLOSED?</p>`,
    ex: `<p>Passive side is in LAST_ACK, waiting for the ACK of its FIN.</p>`,
    b: `<p>"Nothing, the connection is already over": the passive side is still waiting and will retransmit.</p>`,
    q: 'The passive closer, still in LAST_ACK, does what when its FIN is unacknowledged?', o: ['Closes immediately', 'Retransmits the FIN after its RTO', 'Sends RST', 'Waits forever silently'], a: 1, e: 'It retransmits FIN until ACKed or retries run out.',
    h: [`<p>Who needs the final ACK?</p>`, `<p>What does the active side do when it sees a repeated FIN in TIME_WAIT?</p>`, `<p>What does a CLOSED socket answer to a stray FIN?</p>`],
    ap: `<p>State before: active closer (A) is in TIME_WAIT after sending its final ACK; passive closer (P) is in LAST_ACK. The ACK is lost, so P never sees it. P's retransmission timer fires and it resends FIN. Because A is still in TIME_WAIT, it recognises the FIN, sends the ACK again and restarts the 2·MSL timer. P receives it and moves to CLOSED; A later expires to CLOSED. If A had gone straight to CLOSED, it would respond to the retransmitted FIN with RST (no such connection). P would then see an error ("connection reset") instead of a clean close, and could mistake a fully successful exchange for a failure. That is the first reason for 2·MSL (one MSL for the lost ACK's lifetime plus one MSL for the FIN to return). The second reason is to let stale packets from this 4-tuple die before it's reused.</p>`,
    d: { head: ['Step', 'A (active)', 'P (passive)'], rows: [['final ACK sent (lost)', 'TIME_WAIT', 'LAST_ACK'], ['P timer fires, resend FIN', 'TIME_WAIT', 'LAST_ACK'], ['A re-ACKs, restarts 2·MSL', 'TIME_WAIT', 'CLOSED'], ['2·MSL later', 'CLOSED', 'CLOSED']] }
  }));
  practice.push(mk({
    t: 'Slow Downloads on Lossy Wi-Fi', l: 'Hard', tags: ['congestion', 'diagnosis', 'design'], co: ['Google', 'Netflix', 'Meta'],
    s: `<p>Users on café Wi-Fi report 2 Mbps downloads although speed tests show 100 Mbps link capacity. Packet loss is about 2% (radio errors, not congestion) and RTT 60 ms. (a) Estimate the Reno/CUBIC-style throughput with the Mathis formula. (b) Explain why. (c) Give at least four mitigations at different layers.</p>`,
    ex: `<p>MSS/RTT = 1460 / 0.06 ≈ 24,333 B/s.</p>`,
    b: `<p>"Blame the Wi-Fi and tell users to move closer." True but no engineering answer.</p>`,
    q: 'Why does random radio loss hurt loss-based TCP so much?', o: ['TCP treats each loss as congestion and halves cwnd', 'Radio packets are larger', 'ACKs are slower', 'MSS shrinks'], a: 0, e: 'Loss-based congestion control cannot tell corruption from congestion.',
    h: [`<p>1.22/√0.02 ≈ 8.63.</p>`, `<p>Multiply by 8 for bits.</p>`, `<p>Think link layer, transport and application.</p>`],
    ap: `<p>(a) 24,333 B/s × (1.22 / 0.1414) ≈ 24,333 × 8.63 ≈ 210,000 B/s ≈ 1.7 Mbps, matching the observed ~2 Mbps. (b) Every loss event is read as "network congestion", so the sender halves cwnd and climbs back only +1 MSS per RTT; with 2% loss it never gets large, while the radio link is mostly idle. (c) Mitigations: transport: BBR (model-based, less sensitive to random loss) or a delay-based/ECN-aware algorithm; QUIC/HTTP/3 whose loss recovery is cleaner and has per-stream independence; SACK/RACK-TLP enabled for faster recovery. Link layer: Wi-Fi retransmissions and rate adaptation, better channel, 5 GHz, fewer clients. Application: parallelise with a few connections or HTTP/2 range requests, use adaptive bitrate for video, resumable downloads, smaller payloads and compression. Infrastructure: CDN edge closer to users (lower RTT improves throughput linearly), split-TCP proxies/PEPs for the wireless hop. Measure first with <code>ss -ti</code> (retrans, cwnd) and a capture.</p>`,
    d: { head: ['Quantity', 'Value'], rows: [['MSS/RTT', '24,333 B/s'], ['1.22/√0.02', '8.63'], ['Throughput', '≈ 210 KB/s ≈ 1.7 Mbps']] }
  }));
  practice.push(mk({
    t: 'Design Transport for a Multiplayer Game', l: 'Hard', tags: ['UDP', 'design', 'reliability'], co: ['Riot', 'Epic', 'Roblox'],
    s: `<p>Design the network transport for a 60 Hz multiplayer shooter. Position updates must be fast; "player bought an item" and "match ended" must never be lost. Which protocol(s), what goes on which channel, and how do you add reliability where needed?</p>`,
    ex: `<p>Two kinds of messages: ephemeral state (position) and critical events (purchase, kill).</p>`,
    b: `<p>"Everything over TCP": one lost packet blocks all later position updates (head-of-line blocking), causing visible lag spikes.</p>`,
    q: 'Why not send positions over TCP?', o: ['A lost packet delays newer packets behind it', 'TCP cannot carry small messages', 'TCP has no checksum', 'TCP uses more ports'], a: 0, e: 'Retransmitting an outdated position wastes time and blocks fresh data.',
    h: [`<p>Newer state supersedes older state.</p>`, `<p>Add sequence numbers and ACKs in your own header on UDP.</p>`, `<p>Consider QUIC datagrams / WebRTC data channels.</p>`],
    ap: `<p>Use UDP for the realtime channel. Put a small header on each packet: sequence number, last-received remote sequence, and a bitfield of the previous 32 acks (as in Gaffer On Games' reliable UDP design). State snapshots/inputs are sent unreliably at 60 Hz and the receiver simply uses the newest; lost ones are never resent, but the next packet may carry delta-compressed state relative to the last acknowledged snapshot. Critical events go on a reliable channel implemented over the same UDP socket: tag messages with IDs, resend until acked (with RTO-like timer), deduplicate and order them per channel; or put them on a separate TCP/QUIC stream. Add congestion awareness (rate limit, adapt snapshot rate), client-side prediction and server reconciliation, interpolation buffers (~100 ms), encryption and token-based handshake to stop spoofing/amplification, and keep datagrams under ~1200 bytes to avoid fragmentation. Alternative: QUIC (unreliable datagrams extension plus reliable streams) or WebRTC data channels with configurable reliability for browser clients. This is the same pattern as RTP + RTCP or ENet/Steam Sockets.</p>`
  }));
  practice.push(mk({
    t: 'Page Load Latency: DNS + TCP + TLS + HTTP', l: 'Hard', tags: ['latency', 'handshake', 'HTTP3'], co: ['Google', 'Cloudflare', 'Meta'],
    s: `<p>RTT to everything is 50 ms (simplify: DNS resolver also 50 ms away, nothing cached). Compute time to first byte for (a) HTTPS over TCP + TLS 1.2, (b) TCP + TLS 1.3, (c) HTTP/3 (QUIC), (d) HTTP/3 with 0-RTT resumption, (e) reusing an already open connection.</p>`,
    ex: `<p>Count round trips, multiply by 50 ms.</p>`,
    b: `<p>Optimising server compute from 5 ms to 3 ms while three of the four RTTs remain.</p>`,
    q: 'What does QUIC save versus TCP+TLS 1.3?', o: ['One round trip, because transport and crypto handshakes are combined', 'All round trips', 'The DNS lookup', 'Nothing'], a: 0, e: 'TCP needs 1 RTT before TLS starts; QUIC merges them.',
    h: [`<p>DNS = 1 RTT here.</p>`, `<p>TCP handshake = 1 RTT; TLS 1.2 = 2 RTT; TLS 1.3 = 1 RTT.</p>`, `<p>Request + first response byte = 1 RTT.</p>`],
    ap: `<p>(a) DNS 1 + TCP 1 + TLS 1.2 2 + HTTP 1 = 5 RTTs = 250 ms. (b) TLS 1.3 saves one: 1 + 1 + 1 + 1 = 4 RTTs = 200 ms. (c) HTTP/3: DNS 1 + QUIC handshake (transport + TLS 1.3 together) 1 + HTTP 1 = 3 RTTs = 150 ms. (d) With 0-RTT on a resumed session the client sends the request in its first flight: DNS 1 + HTTP 1 = 2 RTTs = 100 ms (note: 0-RTT data is replayable, so only idempotent requests). (e) Already-open connection: only the request/response: 1 RTT = 50 ms. This is why connection reuse, HTTP/2 and 3, CDNs near users, DNS caching and preconnect hints are the real performance levers; server compute is usually minor compared with 3-5 round trips.</p>`,
    d: { head: ['Case', 'DNS', 'TCP', 'TLS', 'HTTP', 'Total'], rows: [['TCP + TLS1.2', '1', '1', '2', '1', '5 RTT = 250 ms'], ['TCP + TLS1.3', '1', '1', '1', '1', '4 RTT = 200 ms'], ['QUIC', '1', '-', '1 (combined)', '1', '3 RTT = 150 ms'], ['QUIC 0-RTT', '1', '-', '0', '1', '2 RTT = 100 ms'], ['warm connection', '0', '0', '0', '1', '1 RTT = 50 ms']] }
  }));
  practice.push(mk({
    t: 'Clients Time Out but the Server CPU Is Idle', l: 'Hard', tags: ['accept queue', 'SYN queue', 'diagnosis'], co: ['Amazon', 'Cloudflare', 'Stripe'],
    s: `<p>Intermittently, clients get connect timeouts to your service during traffic spikes; CPU and network are low, no errors in app logs. Find the likely causes in the TCP layer, how to confirm each with commands, and how to fix them.</p>`,
    ex: `<p>Two queues sit between the network and your <code>accept()</code> loop: SYN queue and accept queue.</p>`,
    b: `<p>"Add more CPU / more instances" does nothing if the listen queue overflows because the accept loop is single-threaded or blocked.</p>`,
    q: 'A full accept queue most directly causes…', o: ['Dropped final ACKs / SYNs and client connect retries', 'High disk usage', 'RST from the app', 'Slow DNS'], a: 0, e: 'The kernel can\'t enqueue new established connections, so handshakes stall or are dropped.',
    h: [`<p>ss -ltn shows Recv-Q vs Send-Q for listening sockets.</p>`, `<p>nstat for ListenOverflows, ListenDrops, SYN cookies.</p>`, `<p>Check TIME_WAIT/ephemeral ports on the calling side too.</p>`],
    ap: `<p>Suspect 1: accept queue overflow. The app calls accept() too slowly (blocked thread, single accept loop, GC pause) or the listen backlog is small (min of listen() argument and net.core.somaxconn, default 128 or 4096 depending on kernel). Confirm: <code>ss -ltn</code> shows Recv-Q near Send-Q on the listener, <code>nstat -az TcpExtListenOverflows TcpExtListenDrops</code> increments. Fix: faster accept (dedicated accept thread, multiple acceptors with SO_REUSEPORT), larger backlog and somaxconn, scale instances, shed load. Suspect 2: SYN queue/SYN flood or tcp_max_syn_backlog too low; confirm with kernel log "possible SYN flooding" and many SYN_RECV; fix with syncookies enabled, larger backlog, upstream filtering. Suspect 3: connection tracking table full in a firewall/NAT or load balancer (nf_conntrack full in dmesg). Suspect 4: client-side ephemeral port exhaustion or SNAT port limits (EADDRNOTAVAIL, TIME_WAIT counts) fixed by pooling. Suspect 5: a security group or health check flapping. Method: capture on the server with tcpdump to see whether SYNs arrive and whether SYN+ACKs leave; compare with the client's view.</p>`,
    d: { head: ['Symptom', 'Command', 'Cause'], rows: [['Listener Recv-Q ≈ Send-Q', 'ss -ltn', 'accept queue full'], ['ListenOverflows rising', 'nstat -az', 'app too slow / backlog small'], ['many SYN_RECV', 'ss -n state syn-recv', 'SYN flood or backlog'], ['conntrack: table full', 'dmesg', 'firewall state exhausted'], ['EADDRNOTAVAIL on clients', 'ss -s', 'ephemeral ports / TIME_WAIT']] }
  }));

  // ---------------- QUIZ ----------------
  quiz.push({ q: 'A server receives a segment with seq = 2000 and 500 bytes of data. What ACK number does it send?', options: ['2000', '2499', '2500', '2501'], answer: 2, explain: 'ACK = next byte expected = 2000 + 500 = 2500.' });
  quiz.push({ q: 'How many bytes is a UDP header?', options: ['4', '8', '20', '32'], answer: 1, explain: 'Source port, destination port, length, checksum: 4 x 16 bits = 8 bytes.' });
  quiz.push({ q: 'Which side of a TCP connection ends in TIME_WAIT?', options: ['The client always', 'The server always', 'The side that sends the first FIN', 'The side that sends the last FIN'], answer: 2, explain: 'The active closer (first FIN) waits 2·MSL after sending the final ACK.' });
  quiz.push({ q: 'In slow start with cwnd = 8 MSS, no loss and ssthresh = 64, what is cwnd after one RTT?', options: ['9', '16', '10', '64'], answer: 1, explain: 'Slow start doubles cwnd each RTT.' });
  quiz.push({ q: 'cwnd = 20 MSS and a timeout occurs. New cwnd and ssthresh?', options: ['cwnd 10, ssthresh 10', 'cwnd 1, ssthresh 10', 'cwnd 1, ssthresh 20', 'cwnd 20, ssthresh 20'], answer: 1, explain: 'Timeout: ssthresh = cwnd/2 = 10 and cwnd restarts from 1.' });
  quiz.push({ q: 'What triggers fast retransmit?', options: ['The RTO timer expiring', 'Three duplicate ACKs', 'A RST segment', 'rwnd = 0'], answer: 1, explain: 'Three duplicate ACKs indicate a hole while later segments still arrive.' });
  quiz.push({ q: 'Which socket option lets a server restart and bind to a port that still has connections in TIME_WAIT?', options: ['TCP_NODELAY', 'SO_KEEPALIVE', 'SO_REUSEADDR', 'SO_LINGER'], answer: 2, explain: 'SO_REUSEADDR allows bind() despite TIME_WAIT leftovers.' });
  quiz.push({ q: 'A connection with a 64 KB window and 100 ms RTT can reach about…', options: ['5.2 Mbps', '520 Mbps', '52 Mbps', '1 Gbps'], answer: 0, explain: '65,536 B / 0.1 s = 655,360 B/s, which is about 5.2 Mbps, no matter how fast the link is.' });
  quiz.push({ q: 'SYN cookies work by…', options: ['Encrypting the payload', 'Encoding state in the server ISN so nothing is stored for half-open connections', 'Blocking spoofed IPs at the router', 'Increasing the accept queue'], answer: 1, explain: 'The cookie is a keyed hash in the SYN+ACK sequence number, validated when the ACK returns.' });
  quiz.push({ q: 'Every request takes about 40 ms extra on a LAN with two small writes. The likely cause?', options: ['Slow start', 'Nagle\'s algorithm + delayed ACK', 'SYN flood', 'TIME_WAIT'], answer: 1, explain: 'Nagle holds the second small write waiting for an ACK that the receiver delays by up to 40 ms.' });
  quiz.push({ q: 'Thousands of CLOSE_WAIT sockets on your server mean…', options: ['A SYN flood', 'The remote peers are slow', 'Your application is not calling close()', 'The network is congested'], answer: 2, explain: 'CLOSE_WAIT persists until the local app closes the socket.' });
  quiz.push({ q: 'Why is a random ISN used?', options: ['To save bandwidth', 'To avoid confusion with old packets and make blind spoofing hard', 'To speed up the handshake', 'To compress headers'], answer: 1, explain: 'Random (hashed) ISNs reduce stale-packet confusion and prevent sequence prediction attacks.' });
  quiz.push({ q: 'Which best describes AIMD?', options: ['Add 1 per ACK, halve on loss', 'Add 1 MSS per RTT, halve on loss', 'Double per RTT, reset to 1 on loss', 'Multiply by 1.5 on loss'], answer: 1, explain: 'Additive increase of one MSS per RTT, multiplicative decrease (halve) on loss.' });

  // ---------------- INTERVIEW ----------------
  interview.push({ q: 'Compare TCP and UDP. When would you choose each?', level: 'B', a: `<p>TCP is connection-oriented, reliable, ordered, with flow and congestion control; it presents a byte stream. UDP is connectionless, best effort, no ordering, no retransmission, 8-byte header, preserves message boundaries, supports broadcast and multicast. Choose TCP when every byte must arrive in order (web, databases, SSH, email, file transfer). Choose UDP when latency matters more than completeness (DNS, VoIP, video calls, games, live streaming), for tiny one-shot exchanges, or when you want your own reliability model (QUIC, WebRTC, game netcode). The deciding question: is a late packet worse than a lost one? Never say "UDP is faster" without that nuance: for bulk transfer TCP is perfectly fast.</p>`, followUps: ['Why does DNS use UDP but sometimes TCP?', 'How does QUIC give reliability over UDP?'] });
  interview.push({ q: 'Walk me through the TCP three-way handshake with sequence numbers.', level: 'B', a: `<p>Client picks ISN x and sends SYN (seq=x). Server picks ISN y and replies SYN+ACK (seq=y, ack=x+1). Client replies ACK (seq=x+1, ack=y+1) and both are ESTABLISHED. SYN consumes one sequence number, so the first data byte is x+1. States: client CLOSED → SYN_SENT → ESTABLISHED; server LISTEN → SYN_RCVD → ESTABLISHED. The point: both sides announce and acknowledge their starting numbers, proving two-way reachability; the third message also lets the server filter spoofed and stale SYNs. Options like MSS, window scale, SACK and timestamps are negotiated in the SYNs.</p>`, followUps: ['Why not two messages?', 'What if the final ACK is lost?', 'What is TCP Fast Open?'] });
  interview.push({ q: 'Explain the four-way close and the TIME_WAIT state. Why 2·MSL?', level: 'I', a: `<p>Each direction closes independently: A sends FIN, B ACKs (B may still send: half-close), later B sends FIN and A ACKs. The active closer ends in TIME_WAIT for 2·MSL (60 s on Linux). Reasons: (1) if A's last ACK is lost B resends FIN, and A must still exist to re-ACK rather than reply RST; (2) packets from the old incarnation of the 4-tuple must die before the same ports are reused, otherwise they could corrupt a new connection. One MSL covers the ACK's maximum life and one more covers a retransmitted FIN's return trip.</p>`, followUps: ['What is CLOSE_WAIT and who must fix it?', 'What is tcp_tw_reuse and when is it safe?'] });
  interview.push({ q: 'A busy server has 200,000 TIME_WAIT sockets. Is that a problem?', level: 'I', a: `<p>Usually not on the server: each entry is small, uses no file descriptor and no listening port. The count is simply close-rate times 60 s (about 3,300 closes/s here), which tells you the server (or a proxy) is closing connections itself, often due to missing keep-alive. It becomes a real problem for a <i>client</i> opening many connections to one destination IP:port because ephemeral ports (about 28k) are held for 60 s: a ceiling of roughly 470 new connections/s ("Cannot assign requested address"). Fixes: connection pooling/keep-alive, HTTP/2 multiplexing, more destination or source IPs, wider port range, tcp_tw_reuse for outbound connections, and letting the side with more resources close. Do not use tcp_tw_recycle (removed) or SO_LINGER 0 as general fixes.</p>`, followUps: ['How do cloud NAT gateways make this worse?', 'Does SO_REUSEADDR help the client?'] });
  interview.push({ q: 'Explain TCP flow control. How is it different from congestion control?', level: 'I', a: `<p>Flow control protects the receiver: each ACK advertises the receive window (rwnd), the free space in the receiver's buffer, and the sender keeps bytes in flight below it (sliding window; the left edge advances with each cumulative ACK). Zero window stops the sender, which probes periodically. Congestion control protects the network: the sender maintains cwnd, a guess of available path capacity, grown by slow start and AIMD, reduced on loss. The sender may have min(rwnd, cwnd) bytes in flight. Diagnose: rwnd small/zero means a slow receiving application; cwnd small with retransmissions means network loss.</p>`, followUps: ['What is the bandwidth-delay product?', 'What is window scaling?'] });
  interview.push({ q: 'Describe slow start, congestion avoidance, fast retransmit and fast recovery.', level: 'I', a: `<p>Slow start: cwnd starts at the initial window (10 MSS in Linux) and doubles each RTT until ssthresh. Congestion avoidance: above ssthresh, +1 MSS per RTT (additive increase). On three duplicate ACKs: fast retransmit the missing segment immediately; fast recovery sets ssthresh = cwnd/2 and cwnd = ssthresh (+3 for the dup ACKs, inflating per further dup ACK) and continues in congestion avoidance (multiplicative decrease). On timeout: ssthresh = cwnd/2, cwnd = 1 MSS and slow start again, because a timeout signals severe congestion. Modern stacks use CUBIC or BBR and SACK/RACK, but the Reno rules are the interview baseline.</p>`, followUps: ['Compute cwnd for the first 10 RTTs with ssthresh = 16 and a loss at RTT 8.', 'How does BBR differ from CUBIC?'] });
  interview.push({ q: 'How does TCP compute its retransmission timeout?', level: 'I', a: `<p>It measures RTT samples from non-retransmitted segments (Karn's rule). RFC 6298: first sample sets SRTT = R, RTTVAR = R/2. Later: RTTVAR = 0.75·RTTVAR + 0.25·|SRTT − R|, then SRTT = 0.875·SRTT + 0.125·R; RTO = SRTT + 4·RTTVAR, with a floor (1 s RFC, 200 ms Linux). When the timer fires the RTO doubles (exponential backoff) up to a cap. The variance term makes the RTO adapt to jitter, so jittery links get patient timers while stable ones react quickly. Timestamps allow safe sampling of retransmitted data.</p>`, followUps: ['Why would a small RTO min matter in data centres?', 'What is a spurious retransmission?'] });
  interview.push({ q: 'What are Nagle\'s algorithm and delayed ACK, and how can they hurt together?', level: 'A', a: `<p>Nagle buffers small writes while earlier data is unacknowledged, to avoid tiny packets. Delayed ACK lets a receiver wait (about 40 ms on Linux, up to 200 ms elsewhere) to piggyback ACKs or ACK every second segment. A write-write-read client sends a small header, then a small body; Nagle holds the body until the header is ACKed; the server holds the ACK because it has nothing to send yet; both wait until the delayed-ACK timer fires, adding about 40 ms to each request. Fixes: coalesce into one write (writev), set TCP_NODELAY for latency-sensitive sockets, or use TCP_CORK. Bulk transfers are unaffected.</p>`, followUps: ['Why do most RPC frameworks set TCP_NODELAY?', 'What is TCP_QUICKACK?'] });
  interview.push({ q: 'What is a SYN flood and how do SYN cookies mitigate it?', level: 'A', a: `<p>A SYN flood sends many SYNs (often with spoofed sources) so the server fills its SYN queue with half-open connections that never complete, blocking legitimate clients; the attacker needs only tens of packets per second since entries live about 60 s. SYN cookies make the server stateless during the handshake: the SYN+ACK sequence number is a keyed hash of the 4-tuple, a time counter and an MSS index; the server stores nothing. A valid ACK (ack = cookie+1) lets it recompute and verify the hash, then create the connection. Costs: some TCP options are lost or restricted, and no SYN+ACK retransmission. Combine with larger backlogs, rate limits, edge scrubbing and anycast.</p>`, followUps: ['Why can\'t you just block the attacker IP?', 'How does QUIC address amplification and floods?'] });
  interview.push({ q: 'How would you size a TCP connection for a 10 Gbps, 80 ms path?', level: 'A', a: `<p>Compute the BDP: 10 Gb/s ÷ 8 × 0.08 s = 100 MB. Window and buffers must reach that: enable window scaling (shift ≥ 11 since 65,535 × 2^11 ≈ 134 MB), raise tcp_rmem/tcp_wmem max and rmem_max/wmem_max, let auto-tuning work (don't set SO_RCVBUF carelessly), use a congestion control suited to high BDP (CUBIC or BBR), enable SACK and timestamps, and ensure minimal loss because a single loss halves a huge window (Mathis). Test with iperf3 and check cwnd/rtt/retrans in <code>ss -ti</code>. Consider multiple parallel streams or UDP-based transfer tools (QUIC, UDT) when loss is unavoidable.</p>`, followUps: ['What throughput results without window scaling?', 'What does bufferbloat do here?'] });
  interview.push({ q: 'A service shows connect timeouts under load but low CPU. Walk me through diagnosing at the TCP level.', level: 'E', a: `<p>Hypothesise on the queues and tables: (1) Accept queue overflow: <code>ss -ltn</code> Recv-Q near Send-Q on the listener, <code>nstat</code> ListenOverflows/ListenDrops; fix slow accept, backlog/somaxconn, SO_REUSEPORT acceptors. (2) SYN queue exhaustion or flood: many SYN_RECV, kernel log "possible SYN flooding"; syncookies, larger tcp_max_syn_backlog, upstream filtering. (3) Conntrack/NAT table full: dmesg, conntrack counters. (4) Client side ephemeral port exhaustion / NAT port limits: EADDRNOTAVAIL, TIME_WAIT counts, pooling. (5) Packet loss/MTU/ECMP asymmetry: tcpdump on both ends to see whether SYNs arrive and SYN+ACKs leave; compare retransmitted SYN timing (1 s, 2 s, 4 s) with client behaviour. Fix according to the evidence, then add alerts on queue depth and drops.</p>`, followUps: ['What does a 1 s, 3 s, 7 s connect delay pattern indicate?', 'How does SO_REUSEPORT change the picture?'] });
  interview.push({ q: 'Why does QUIC run over UDP, and which TCP problems does it fix?', level: 'E', a: `<p>QUIC is a transport implemented in user space over UDP because UDP passes through middleboxes and can be deployed without kernel or OS changes. It fixes: head-of-line blocking (independent streams, loss on one doesn't stall others), handshake latency (transport and TLS 1.3 combined, 1 RTT, 0-RTT on resumption), connection migration (connection IDs survive IP/port changes on Wi-Fi to cellular), always-on encryption including most headers (less ossification), better loss detection (unique packet numbers remove retransmission ambiguity), and pluggable congestion control. Cookies-like retry tokens and a 3x amplification limit defend against spoofing. Costs: more CPU (no kernel offloads historically), UDP blocked or throttled on some networks, so clients fall back to TCP.</p>`, followUps: ['How does QUIC avoid TIME_WAIT?', 'What breaks when UDP is rate-limited by a network?'] });
  interview.push({ q: 'What happens at the TCP level when you call close() on a socket with unread data in its receive buffer?', level: 'E', a: `<p>The kernel sends RST instead of the normal FIN. By TCP rules, discarding received-but-unread data means the stream was not cleanly consumed, so the peer is told the connection was aborted. Any data the peer had in flight and not yet read by its application may be discarded, and the peer sees "connection reset by peer". It commonly bites servers that send an HTTP error response and close() without reading the request body: the client may never see the response. Correct pattern: shutdown(SHUT_WR) to send a FIN after writing, keep reading (drain) for a short time until EOF, then close. SO_LINGER with zero timeout deliberately forces this RST behaviour and skips TIME_WAIT.</p>`, followUps: ['What is lingering close in nginx?', 'How do you do a graceful half-close?'] });
  registerModule({
    id: 'cs12',
    title: 'TCP & UDP Deep Dive',
    intro: `<p>Almost every network question in an interview ends at the transport layer: "what happens when a packet is lost?", "why is my upload slow?", "why 40 ms?", "why thousands of TIME_WAIT sockets?". This module takes TCP and UDP apart with small numbers you can do by hand: header fields, the three-way handshake with real sequence numbers, the teardown and its state machine, sliding windows, slow start and AIMD with loss, RTO estimation, fast retransmit, TIME_WAIT, Nagle and delayed ACK, and SYN floods with SYN cookies. You will read and write socket code in C++, and run simulators in Python right in your browser.</p>`,
    goals: ['Choose TCP or UDP for any application and defend it with the late-versus-lost rule', 'Fill in sequence and ACK numbers for a handshake, data transfer and teardown by hand', 'Compute cwnd per RTT through slow start, congestion avoidance and both kinds of loss', 'Work out window/RTT throughput, BDP and window-scale shifts', 'Compute SRTT, RTTVAR and RTO, and trace fast retransmit on three duplicate ACKs', 'Explain TIME_WAIT, CLOSE_WAIT, port exhaustion, the Nagle/delayed-ACK stall and SYN cookies, and diagnose each with ss/nstat'],
    prereqs: `CS Core module "Networking Basics: OSI & TCP/IP" (layers, ports, packets) and "IP Addressing, Subnetting, Routing & NAT". Basic C++ or Python reading skills help for the code samples.`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
