(function () {
var topics = [], practice = [], quiz = [], interview = [];

// ---------- shared helpers for the visualizers ----------
function p2n(s) {
  var m = String(s).trim().split('.');
  if (m.length !== 4) throw new Error('Use a dotted IPv4 address like 192.168.10.77');
  var n = 0;
  m.forEach(function (x) {
    if (!/^\d{1,3}$/.test(x) || +x > 255) throw new Error('Each octet must be a number 0-255 (got "' + x + '")');
    n = n * 256 + (+x);
  });
  return n >>> 0;
}
function n2p(n) { n = n >>> 0; return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
function maskOf(p) { return p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0); }
function parseCidr(s) {
  var m = String(s).trim().split('/');
  if (m.length !== 2) throw new Error('Use CIDR form like 192.168.10.77/26');
  var p = +m[1];
  if (!/^\d{1,2}$/.test(m[1]) || p < 0 || p > 32) throw new Error('Prefix length must be 0-32');
  return { ip: p2n(m[0]), p: p };
}
function netHl(p) { var h = {}; for (var i = 0; i < 32; i++) h[31 - i] = i < p ? 'sel' : 'cur'; return h; }
function usable(p) { return p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2; }
function bin8(n) { return ('00000000' + n.toString(2)).slice(-8); }
function dotBin(n) { n = n >>> 0; return [bin8((n >>> 24) & 255), bin8((n >>> 16) & 255), bin8((n >>> 8) & 255), bin8(n & 255)].join('.'); }
function bothWays(e) { var o = {}; Object.keys(e || {}).forEach(function (k) { var t = k.split('-'); o[k] = e[k]; o[t[1] + '-' + t[0]] = e[k]; }); return o; }
function inNet(ip, net, p) { return ((ip & maskOf(p)) >>> 0) === ((net & maskOf(p)) >>> 0); }

// =====================================================================
// TOPIC 1 — IPv4 structure, classes (history), special ranges
// =====================================================================
topics.push({
  title: 'IPv4 Structure, Classes (Historical) and Special Ranges',
  analogy: `<p>An IP address is like a <b>postal address written as one long number</b>: the first part tells the post office which <i>city/street</i> (the network) and the last part tells the postman which <i>house</i> (the host). IPv4 writes that number as four chunks, like <code>192.168.10.77</code>. The old "classes" were a rigid rule that said "streets always have 1, 2 or 3 chunks of city name" - simple, but wasteful, so the world dropped it.</p>`,
  explain: `<p><b>🟢 The plain idea.</b> An IPv4 address is a <b>32-bit number</b>. Humans read it as 4 "octets" (8 bits each) separated by dots, each 0-255. So there are 2<sup>32</sup> = about <b>4.3 billion</b> addresses in total.</p>
    ${H.bits(77, 8, { label: 'last octet 77 =', hl: { 6: 'g', 3: 'g', 2: 'g', 0: 'g' } })}
    <p>Every address has two parts: the <b>network part</b> (which LAN/street) and the <b>host part</b> (which device on it). How many bits belong to each is decided by the <b>subnet mask / prefix length</b> (next topics). Routers look only at the network part; the last router on the path looks at the host part.</p>
    <p><b>Classful addressing (history, still asked in interviews).</b> Before 1993 the split was fixed by the first bits of the address:</p>
    ${H.table(['Class', 'First bits', 'First octet', 'Network / Host bits', 'Hosts per network', 'Use'], [
      ['A', '0', '1 - 126', '8 / 24', '16,777,214', 'huge orgs'],
      ['B', '10', '128 - 191', '16 / 16', '65,534', 'big orgs'],
      ['C', '110', '192 - 223', '24 / 8', '254', 'small LANs'],
      ['D', '1110', '224 - 239', '-', '-', 'multicast'],
      ['E', '1111', '240 - 255', '-', '-', 'experimental']
    ])}
    <p>The big problem: a company needing 2,000 hosts was too big for a Class C (254) so it got a Class B (65,534) and <span class="c-r">wasted 63,000 addresses</span>. That waste, plus the explosion of routing tables, killed classes. <b>CIDR (1993)</b> replaced them: the prefix length can be <i>any</i> number from 0 to 32 (topic 3).</p>
    <p><b>Special ranges you must recognise instantly:</b></p>
    ${H.table(['Range', 'Meaning'], [
      ['10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16', 'Private (RFC 1918) - not routed on the internet'],
      ['127.0.0.0/8 (127.0.0.1)', 'Loopback - "this machine"'],
      ['169.254.0.0/16', 'Link-local (APIPA) - self-assigned when DHCP fails'],
      ['100.64.0.0/10', 'Carrier-Grade NAT shared space (RFC 6598)'],
      ['0.0.0.0', '"Unknown / any" - e.g. a client with no IP yet; also the default route 0.0.0.0/0'],
      ['255.255.255.255', 'Limited broadcast - to everyone on my own LAN'],
      ['224.0.0.0/4', 'Multicast (class D)'],
      ['192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24', 'Documentation only (safe for examples)']
    ])}`,
  clues: ['"Which class is 172.20.4.9?" - look at the FIRST octet only (128-191 = B)', '"169.254.x.x" on a laptop - DHCP failed, OS self-assigned (APIPA / link-local)', '"Why did classful addressing fail?" - wasted addresses + exploding routing tables', '"Is this address routable on the internet?" - check RFC 1918, 127/8, 169.254/16, 100.64/10', '"How many IPv4 addresses exist?" - 2<sup>32</sup> = 4,294,967,296', '"100.64.x.x on my home router WAN" - your ISP is doing CGNAT'],
  code: [`#include <arpa/inet.h>   // inet_pton, ntohl
// Parse dotted IPv4 text into a 32-bit number and classify it.
static bool inCidr(uint32_t ip, const char* base, int prefix) {
    in_addr b;
    inet_pton(AF_INET, base, &b);
    uint32_t net = ntohl(b.s_addr);
    uint32_t mask = prefix == 0 ? 0u : (0xFFFFFFFFu << (32 - prefix));
    return (ip & mask) == (net & mask);
}
static string classOf(uint32_t ip) {
    uint32_t a = ip >> 24;               // first octet
    if (a < 128) return "A";             // leading bit 0
    if (a < 192) return "B";             // leading bits 10
    if (a < 224) return "C";             // leading bits 110
    if (a < 240) return "D (multicast)"; // leading bits 1110
    return "E (reserved)";
}
int main() {
    const char* tests[] = {"192.168.10.77", "10.0.0.1", "172.16.5.9", "172.32.0.1",
                           "127.0.0.1", "224.0.0.5", "169.254.3.4", "100.64.1.1", "8.8.8.8", "999.1.1.1"};
    for (const char* s : tests) {
        in_addr a;
        if (inet_pton(AF_INET, s, &a) != 1) { cout << s << " -> INVALID" << endl; continue; }
        uint32_t ip = ntohl(a.s_addr);   // network byte order -> host number
        string kind = "public";
        if (inCidr(ip, "10.0.0.0", 8) || inCidr(ip, "172.16.0.0", 12) || inCidr(ip, "192.168.0.0", 16)) kind = "private (RFC1918)";
        else if (inCidr(ip, "127.0.0.0", 8)) kind = "loopback";
        else if (inCidr(ip, "169.254.0.0", 16)) kind = "link-local";
        else if (inCidr(ip, "100.64.0.0", 10)) kind = "CGNAT shared";
        else if (inCidr(ip, "224.0.0.0", 4)) kind = "multicast";
        cout << s << " -> class " << classOf(ip) << ", " << kind << endl;
    }
    return 0;
}`, { lang: 'bash', check: false, title: 'Look at your own machine', code: `# Linux: show my IPv4 addresses (prefix length after the slash)
ip -4 addr show
# macOS / BSD
ifconfig | grep "inet "
# Windows
ipconfig` }],
  codeTitle: ['C++: inet_pton + classification', 'See your own addresses (bash)'],
  viz: {
    title: 'IPv4 address: bits, class and special range',
    input: '172.16.5.9',
    inputLabel: 'IPv4 address',
    gen: function (input) {
      var ip = p2n(input), a = ip >>> 24, frames = [];
      var cls = a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D' : 'E';
      var hlAll = {}; for (var i = 0; i < 32; i++) hlAll[i] = 'win';
      frames.push({ narr: 'The address <b>' + n2p(ip) + '</b> is really one 32-bit number: <b>' + ip + '</b>. We split it into 4 octets of 8 bits.', parts: [
        { type: 'bits', label: n2p(ip), value: ip, width: 32, hl: hlAll },
        { type: 'text', html: dotBin(ip) }] });
      var h2 = {}; for (var j = 24; j < 32; j++) h2[j] = 'cur';
      frames.push({ narr: 'For the old classful rule only the <b>first octet</b> (' + a + ') matters: <code>' + bin8(a) + '</code>.', parts: [
        { type: 'bits', label: 'first octet highlighted', value: ip, width: 32, hl: h2 }] });
      var lead = cls === 'A' ? 1 : cls === 'B' ? 2 : cls === 'C' ? 3 : cls === 'D' ? 4 : 4;
      var h3 = {}; for (var k = 0; k < lead; k++) h3[31 - k] = 'sel';
      frames.push({ narr: 'Leading bits <b>' + bin8(a).slice(0, lead) + '</b> -> <b>Class ' + cls + '</b>. 0 = A, 10 = B, 110 = C, 1110 = D (multicast), 1111 = E.', parts: [
        { type: 'bits', label: 'leading bits decide the class', value: ip, width: 32, hl: h3 }] });
      var rows = [['A', '0', '1-126', '/8'], ['B', '10', '128-191', '/16'], ['C', '110', '192-223', '/24'], ['D', '1110', '224-239', 'multicast'], ['E', '1111', '240-255', 'reserved']];
      var hlr = {}; hlr[{ A: 0, B: 1, C: 2, D: 3, E: 4 }[cls]] = 'sel';
      frames.push({ narr: 'In the class table the winner is <b>Class ' + cls + '</b>' + (cls === 'A' || cls === 'B' || cls === 'C' ? ' (default mask ' + (cls === 'A' ? '/8' : cls === 'B' ? '/16' : '/24') + ').' : '.') + (a === 0 || a === 127 ? ' Note: 0.x and 127.x are special inside class A.' : ''), parts: [
        { type: 'table', label: 'Classful table', columns: ['Class', 'Leading bits', 'First octet', 'Default mask'], rows: rows, hl: hlr }] });
      var kind = 'Public (globally routable) address', tag = 'ok';
      if (inNet(ip, p2n('10.0.0.0'), 8) || inNet(ip, p2n('172.16.0.0'), 12) || inNet(ip, p2n('192.168.0.0'), 16)) { kind = 'PRIVATE (RFC 1918) - never routed on the public internet; needs NAT to go out'; tag = 'cur'; }
      else if (inNet(ip, p2n('127.0.0.0'), 8)) { kind = 'LOOPBACK - this very machine'; tag = 'cur'; }
      else if (inNet(ip, p2n('169.254.0.0'), 16)) { kind = 'LINK-LOCAL (APIPA) - DHCP failed, OS invented this'; tag = 'bad'; }
      else if (inNet(ip, p2n('100.64.0.0'), 10)) { kind = 'CGNAT shared space - your ISP shares one public IP among many homes'; tag = 'cur'; }
      else if (inNet(ip, p2n('224.0.0.0'), 4)) { kind = 'MULTICAST - one-to-many group address'; tag = 'cur'; }
      else if (ip === 0 || ip === 0xFFFFFFFF) { kind = ip === 0 ? '0.0.0.0 - "unknown/any"' : '255.255.255.255 - limited broadcast'; tag = 'cur'; }
      var vh = {}; vh.kind = tag;
      frames.push({ narr: 'Last check - is it a special range? ' + kind + '.', parts: [
        { type: 'vars', label: 'verdict', vals: { address: n2p(ip), 'class': cls, kind: kind }, hl: vh }] });
      return frames;
    }
  },
  examples: [
    { title: 'Dotted decimal to binary, by hand', html: `<p>Convert <code>192.168.10.77</code>: use the place values 128 64 32 16 8 4 2 1 for each octet.</p>
      ${H.table(['Octet', 'Breakdown', 'Binary'], [['192', '128 + 64', '11000000'], ['168', '128 + 32 + 8', '10101000'], ['10', '8 + 2', '00001010'], ['77', '64 + 8 + 4 + 1', '01001101']])}
      <p>Full: <code>11000000.10101000.00001010.01001101</code>. Starts with <b>110</b> so it was a historical <b>Class C</b>.</p>` },
    { title: 'Classify five addresses', html: `${H.table(['Address', 'Class', 'Note'], [['10.4.4.4', 'A', 'private 10/8'], ['172.20.4.9', 'B', 'private (inside 172.16-172.31)'], ['172.32.0.1', 'B', '<span class="c-r">public!</span> (just outside the private block)'], ['192.168.1.1', 'C', 'private - typical home router'], ['127.0.0.1', 'A', 'loopback, not a real class-A host']])}`, code: { lang: 'python', run: true, code: `# Python: let the stdlib tell you the same thing
import ipaddress
for s in ["10.4.4.4", "172.32.0.1", "169.254.1.1", "100.64.0.9", "8.8.8.8"]:
    ip = ipaddress.ip_address(s)
    print(s, "private" if ip.is_private else "public", "link-local" if ip.is_link_local else "", "global" if ip.is_global else "not-global")` } },
    { title: 'Why the first and last address of a network are not usable', html: `<p>In <code>192.168.10.0/24</code> the address <code>.0</code> (all host bits 0) is the <b>network address</b> - the name of the street. <code>.255</code> (all host bits 1) is the <b>broadcast address</b> - shouting to every house. So usable hosts = 2<sup>8</sup> - 2 = <b>254</b>. This "minus 2" shows up in every subnetting question.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals and reality.</b> The IPv4 header carries a 32-bit source and 32-bit destination address; routers never need to know "classes" - they only use prefix lengths. Classful behaviour survives in <b>defaults</b>: some old tools and exam questions still assume /8, /16, /24 when no mask is given, and RIPv1 could not carry masks at all (a reason it is obsolete).</p>
    <p><b>Exhaustion.</b> IANA handed out its last /8 blocks in 2011; RIRs (APNIC, RIPE, ARIN...) followed. Survival tools: <b>CIDR</b> (no waste), <b>NAT</b> (many devices share one public IP), <b>CGNAT</b> (ISP does a second NAT; the 100.64/10 range exists so it does not collide with home 192.168 networks), address <b>trading/leasing</b> (public IPv4 now costs real money per address), and finally <b>IPv6</b>. Cloud providers charge for each public IPv4 address, and AWS started billing hourly for them in 2024.</p>
    <p><b>Byte order trap.</b> IP addresses travel in <b>network byte order</b> (big-endian). On x86 the CPU is little-endian, so C code uses <code>htonl/ntohl</code>. Forgetting this produces a "reversed" address such as 77.10.168.192. That is why <code>inet_pton</code> returns network order and our code calls <code>ntohl</code> before doing mask math.</p>
    <p><b>Special cases:</b> /31 point-to-point links (RFC 3021) use both addresses (no network/broadcast waste); /32 is a single host (loopbacks on routers); 0.0.0.0/8 "this network" is never a destination; 240.0.0.0/4 is "reserved" but a few OSes accept it.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Nobody hand-computes class boundaries at work any more - chat assistants, <code>ipcalc</code> and cloud consoles do it. But AI-generated Terraform, Kubernetes and firewall configs still contain addresses, and a wrong CIDR is a silent outage or a security hole.</p>
    <p><b>Use AI as a partner:</b> ask "Explain why 172.32.0.1 is public but 172.31.0.1 is private" or "Generate 10 tricky is-this-private questions, no answers yet". <b>Where AI goes wrong:</b> it confidently says "172.x is private" (only 172.16-172.31 is), or treats 100.64/10 as normal public space, or invents Class-based rules for CIDR networks. <b>What you must own:</b> the memorised private/special ranges and the habit of verifying with a tool (<code>python -c "import ipaddress..."</code>) before pasting any address plan into infrastructure code.</p>`,
  problems: []
});

// =====================================================================
// TOPIC 2 — IPv6
// =====================================================================
function v6expand(s) {
  s = String(s).trim().toLowerCase();
  if (!s) throw new Error('Enter an IPv6 address like 2001:db8::ff00:42:8329');
  if (s.split('::').length > 2) throw new Error('"::" may appear only once');
  var g;
  if (s.indexOf('::') >= 0) {
    var halves = s.split('::');
    var L = halves[0] ? halves[0].split(':') : [], R = halves[1] ? halves[1].split(':') : [];
    var miss = 8 - L.length - R.length;
    if (miss < 1) throw new Error('Too many groups around "::"');
    g = L.concat(new Array(miss + 1).join('0,').split(',').slice(0, miss), R);
  } else g = s.split(':');
  if (g.length !== 8) throw new Error('An IPv6 address has 8 groups (or use "::")');
  return g.map(function (x) {
    if (!/^[0-9a-f]{1,4}$/.test(x)) throw new Error('Bad group "' + x + '" - use 1-4 hex digits');
    return ('0000' + x).slice(-4);
  });
}
function v6compress(groups) {
  var g = groups.map(function (x) { return x.replace(/^0+(?=.)/, ''); });
  var bestS = -1, bestL = 0, i = 0;
  while (i < 8) {
    if (g[i] === '0') { var j = i; while (j < 8 && g[j] === '0') j++; if (j - i > bestL) { bestL = j - i; bestS = i; } i = j; } else i++;
  }
  if (bestL < 2) return { text: g.join(':'), s: -1, l: 0, g: g };
  var left = g.slice(0, bestS).join(':'), right = g.slice(bestS + bestL).join(':');
  return { text: left + '::' + right, s: bestS, l: bestL, g: g };
}

topics.push({
  title: 'IPv6: Format, Shortening Rules and Why It Exists',
  analogy: `<p>IPv4 is a <b>phone number that ran out</b> - the city has more people than numbers, so families share one line (NAT). IPv6 is the new national numbering plan with so many digits that <b>every grain of sand could have its own number</b>. Writing it is like writing a very long number: you are allowed to drop useless leading zeros and replace one long run of zeros with "::", like saying "and then lots of zeros".</p>`,
  explain: `<p><b>🟢 The idea.</b> An IPv6 address is <b>128 bits</b>, written as <b>8 groups</b> of 16 bits in hexadecimal, separated by colons: <code>2001:0db8:0000:0000:0000:ff00:0042:8329</code>. Total space: 2<sup>128</sup> = about 3.4 x 10<sup>38</sup> addresses.</p>
    <p><b>Two shortening rules (memorise both):</b></p>
    <ol><li><b>Drop leading zeros</b> inside each group: <code>0db8 -> db8</code>, <code>0042 -> 42</code>, <code>0000 -> 0</code>.</li>
    <li><b>Replace ONE run of consecutive all-zero groups with <code>::</code></b>. Use it only once (otherwise you could not tell how many zeros each one hides). Pick the <i>longest</i> run; on a tie pick the <i>leftmost</i>. Do not use it for a single zero group.</li></ol>
    ${H.table(['Step', 'Result'], [['Full', '2001:0db8:0000:0000:0000:ff00:0042:8329'], ['1. drop leading zeros', '2001:db8:0:0:0:ff00:42:8329'], ['2. squeeze longest zero run', '<b>2001:db8::ff00:42:8329</b>']])}
    <p><b>Expanding</b> is the reverse: count the groups you can see, the missing ones (8 - seen) are zero groups at the <code>::</code>, then pad each group to 4 digits.</p>
    <p><b>Structure.</b> The usual layout is <code>/48</code> from the ISP to a site, <code>/64</code> per LAN, and the last 64 bits identify the interface. A standard LAN is <b>always /64</b> (SLAAC needs it). One /48 gives 2<sup>16</sup> = 65,536 subnets.</p>
    ${H.table(['Prefix', 'Meaning'], [['2000::/3', 'Global unicast (the public internet)'], ['fe80::/10', 'Link-local (auto on every interface, never routed)'], ['fc00::/7', 'Unique Local (like IPv4 private ranges)'], ['ff00::/8', 'Multicast (replaces broadcast)'], ['::1/128', 'Loopback'], ['::/128', 'Unspecified'], ['2001:db8::/32', 'Documentation examples']])}
    <p><b>Differences you will be asked about:</b> no broadcast (multicast instead), <b>no ARP</b> (NDP uses ICMPv6 Neighbor Solicitation), addresses self-configure (SLAAC) or use DHCPv6, routers never fragment (hosts do Path-MTU discovery), the header is simpler with a fixed 40 bytes and <b>no header checksum</b>, and end-to-end connectivity returns because <b>NAT is not needed</b>.</p>`,
  clues: ['"Shorten / compress / expand this IPv6 address"', '"How many addresses in a /64? in a /48?" - 2<sup>64</sup> hosts; 2<sup>16</sup> subnets per /48', '"ARP in IPv6?" - no, Neighbor Discovery (ICMPv6)', '"fe80::" address - link-local, only valid on that LAN', '"Why IPv6?" - IPv4 exhaustion, end-to-end connectivity, simpler header', '"Dual stack / 6to4 / NAT64" - migration techniques'],
  code: [{ lang: 'python', run: true, title: 'IPv6 expand and compress (stdlib)', code: `import ipaddress

def expand(s):
    # Fully expanded 8 x 4 hex digits
    return ipaddress.IPv6Address(s).exploded

def compress(s):
    # RFC 5952 canonical short form
    return ipaddress.IPv6Address(s).compressed

def manual_compress(full):
    # Same thing by hand so you can explain the algorithm.
    groups = [g.lstrip("0") or "0" for g in full.split(":")]   # rule 1
    best_start, best_len, i = -1, 0, 0
    while i < 8:                                               # rule 2: longest zero run
        if groups[i] == "0":
            j = i
            while j < 8 and groups[j] == "0":
                j += 1
            if j - i > best_len:                               # strictly longer keeps leftmost on ties
                best_start, best_len = i, j - i
            i = j
        else:
            i += 1
    if best_len < 2:                                           # never "::" for a single zero group
        return ":".join(groups)
    left = ":".join(groups[:best_start])
    right = ":".join(groups[best_start + best_len:])
    return left + "::" + right

tests = ["2001:0db8:0000:0000:0000:ff00:0042:8329",
         "2001:0:0:1:0:0:0:1",
         "0:0:0:0:0:0:0:1",
         "fe80:0000:0000:0000:0202:b3ff:fe1e:8329",
         "2001:db8:0:1:1:1:1:1"]
for t in tests:
    print(t)
    print("  compress :", compress(t), "| manual:", manual_compress(expand(t)))
print(expand("2001:db8::1"))
net = ipaddress.ip_network("2001:db8:abcd::/48")
print("a /48 holds", 2 ** (64 - 48), "subnets of /64;", "each /64 holds 2^64 =", 2 ** 64, "addresses")` },
  `#include <arpa/inet.h>
// The OS libraries already do the shortening: inet_pton parses, inet_ntop prints canonical form.
int main() {
    const char* in[] = {"2001:0db8:0000:0000:0000:ff00:0042:8329", "2001:db8::1", "0:0:0:0:0:0:0:1", "::ffff:192.0.2.128"};
    for (const char* s : in) {
        in6_addr a;
        if (inet_pton(AF_INET6, s, &a) != 1) { cout << s << " -> invalid" << endl; continue; }
        char out[INET6_ADDRSTRLEN];
        inet_ntop(AF_INET6, &a, out, sizeof out);
        cout << s << "\\n   -> " << out << endl;
        // The 16 raw bytes (128 bits) as hex
        for (int i = 0; i < 16; i++) printf("%02x%s", a.s6_addr[i], (i % 2 && i < 15) ? ":" : "");
        cout << endl;
    }
    return 0;
}`],
  codeTitle: ['Python: expand and compress', 'C++: inet_pton / inet_ntop for IPv6'],
  viz: {
    title: 'IPv6 shortening, step by step',
    input: '2001:0db8:0000:0000:0000:ff00:0042:8329',
    inputLabel: 'IPv6 address (full or with ::)',
    gen: function (input) {
      var full = v6expand(input), c = v6compress(full), frames = [];
      var raw = String(input).trim().toLowerCase();
      frames.push({ narr: 'Start with <code>' + raw + '</code>. It has 8 groups of 16 bits (128 bits total); if it contains <b>::</b> some zero groups are hidden.', parts: [{ type: 'text', html: '<code>' + raw + '</code>' }] });
      frames.push({ narr: 'Step 0 - <b>expand</b> to the 8 full groups of 4 hex digits (each group = 16 bits).', parts: [
        { type: 'array', label: 'expanded groups', values: full, showIdx: true }] });
      var h1 = {}; full.forEach(function (x, i) { if (x.replace(/^0+(?=.)/, '') !== x) h1[i] = 'ok'; });
      frames.push({ narr: 'Rule 1 - <b>drop leading zeros</b> in every group (keep at least one digit). Changed groups are green.', parts: [
        { type: 'array', label: 'after rule 1', values: c.g, hl: h1, showIdx: true }] });
      var h2 = {};
      c.g.forEach(function (x, i) { if (x === '0') h2[i] = 'cur'; });
      if (c.l >= 2) for (var i = c.s; i < c.s + c.l; i++) h2[i] = 'win';
      frames.push({ narr: c.l >= 2 ? 'Rule 2 - find the <b>longest run</b> of all-zero groups: groups ' + c.s + ' to ' + (c.s + c.l - 1) + ' (' + c.l + ' groups, blue). Other lone zeros (amber) stay because only one <code>::</code> is allowed.' : 'Rule 2 - no run of <b>two or more</b> zero groups, so <b>no "::"</b> is used (a single zero group is written as 0).', parts: [
        { type: 'array', label: 'zero runs', values: c.g, hl: h2, showIdx: true }] });
      frames.push({ narr: 'Result: <b>' + c.text + '</b>. To get back: count visible groups, the missing ones (8 - visible) are zeros at "::", pad each group to 4 digits.', parts: [
        { type: 'vars', vals: { input: raw, 'compressed': c.text, 'expanded': full.join(':') }, hl: { compressed: 'ok' } },
        { type: 'text', html: 'Tie rule: with two equal zero runs the <b>leftmost</b> gets the "::".' }] });
      return frames;
    }
  },
  examples: [
    { title: 'Compress 2001:0db8:0000:0000:0000:ff00:0042:8329', html: `<p>Drop leading zeros: <code>2001:db8:0:0:0:ff00:42:8329</code>. Longest zero run = three groups (3rd, 4th, 5th) -> <code>2001:db8::ff00:42:8329</code>.</p>` },
    { title: 'Tie-break and single-zero cases', html: `${H.table(['Full', 'Short', 'Why'], [['2001:0:0:1:0:0:0:1', '2001:0:0:1::1', 'runs of 2 and 3 - the longer (3) wins, even though it is not first'], ['2001:db8:0:1:1:1:1:1', '2001:db8:0:1:1:1:1:1', 'only ONE zero group - never use ::'], ['0:0:0:0:0:0:0:1', '::1', 'loopback'], ['fe80:0:0:0:202:b3ff:fe1e:8329', 'fe80::202:b3ff:fe1e:8329', 'link-local']])}` },
    { title: 'Expand 2001:db8::1', html: `<p>Visible groups: <code>2001</code>, <code>db8</code>, <code>1</code> = 3. Hidden zero groups = 8 - 3 = <b>5</b>. So: <code>2001:0db8:0000:0000:0000:0000:0000:0001</code>.</p>` },
    { title: 'How many /64 LANs in a /48?', html: `<p>The prefix grows from 48 to 64 bits: 16 extra bits -> 2<sup>16</sup> = <b>65,536</b> subnets, each with 2<sup>64</sup> addresses. That is why IPv6 subnetting is about <i>neatness</i>, not saving addresses.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> The IPv6 header is a fixed 40 bytes (version, traffic class, flow label, payload length, next header, hop limit, source, destination). Options live in <b>extension headers</b> chained by "next header". There is no checksum (link layer and TCP/UDP already protect data) and routers never fragment - hosts discover the path MTU (minimum 1280 bytes).</p>
    <p><b>Auto-configuration.</b> Every interface builds a link-local <code>fe80::/64</code> address, then asks the router with a <b>Router Solicitation</b>; the router replies with a <b>Router Advertisement</b> that carries the /64 prefix. The host appends 64 bits of interface ID (formerly EUI-64 derived from the MAC, today usually random "privacy" addresses, RFC 4941/7217) = <b>SLAAC</b>. <b>DHCPv6</b> is used when you also want DNS or tracked leases.</p>
    <p><b>Neighbor Discovery</b> replaces ARP using ICMPv6 Neighbor Solicitation to the target's <i>solicited-node multicast</i> address (<code>ff02::1:ffXX:XXXX</code>), so only machines with the same last 24 bits wake up - far less noise than ARP broadcast.</p>
    <p><b>Deployment in 2026.</b> Roughly half of Google users reach it over IPv6; big mobile networks are IPv6-only with <b>NAT64/DNS64</b> for old IPv4 sites. Hosts run <b>dual stack</b> and use "Happy Eyeballs" (try both, keep the faster). <b>6to4/Teredo</b> are legacy tunnels. IPv4-mapped addresses look like <code>::ffff:192.0.2.128</code>.</p>
    <p><b>Gotcha:</b> when writing an address with a port you need brackets: <code>[2001:db8::1]:443</code>, because the colons collide with the port separator.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Copy-pasting IPv6 into configs is error-prone and AI is great at converting between short and long forms. But LLMs are surprisingly weak at "count the zero groups" - they often produce an address with 7 or 9 groups, or use "::" twice. In 2026 more services are dual-stack, and AI-written firewall rules that only mention IPv4 leave an <b>open IPv6 side door</b>.</p>
    <p><b>Use AI as a partner:</b> "Give me 8 IPv6 addresses to compress, hide the answers", then verify with <code>python -c "import ipaddress; print(ipaddress.ip_address('...').compressed)"</code>. <b>Where AI goes wrong:</b> inventing a /64 sized for "only 100 hosts", suggesting NAT for IPv6 by habit, forgetting brackets around the address in URLs. <b>What you must own:</b> the two shortening rules, /64 per LAN, and knowing that security groups and firewalls need separate IPv6 rules.</p>`,
  problems: [{
    title: 'Compress and expand IPv6 addresses (guided)', level: 'Easy', tags: ['ipv6', 'notation'], companies: ['Cisco', 'Juniper'],
    statement: `<p>(a) Compress <code>2001:0DB8:0000:0000:0008:0800:200C:417A</code>. (b) Expand <code>ff02::1:ff00:42</code>. Show every step.</p>`,
    constraints: `Follow RFC 5952: lowercase, drop leading zeros, one "::" for the longest zero run (min 2 groups).`,
    example: `<p>${H.c('g', '2001:0db8:0000:0000:0008:0800:200c:417a')} -> ${H.c('b', '2001:db8::8:800:200c:417a')}</p>`,
    brute: { why: `<p>Guessing by eye often compresses a <i>single</i> zero group or uses "::" twice, which makes the address ambiguous. Work group by group so no step is skipped.</p>` },
    mcq: { q: 'In 2001:0:0:1:0:0:0:1 where does "::" go?', options: ['At the first zero run (groups 2-3)', 'At the longest zero run (groups 5-7)', 'At both runs', 'Nowhere'], answer: 1, explain: 'Longest run wins (3 groups beats 2). Only one :: is allowed.' },
    hints: [`<p>First lowercase everything and strip leading zeros group by group.</p>`, `<p>Write the 8 groups in a row and mark the runs of <code>0</code>.</p>`, `<p>Pick the longest run (min 2). For expanding: hidden zero groups = 8 - visible groups.</p>`],
    solution: {
      approach: `<p>(a) Groups: 2001, 0db8, 0000, 0000, 0008, 0800, 200c, 417a -> strip zeros: 2001, db8, 0, 0, 8, 800, 200c, 417a. The only zero run is groups 3-4 (length 2) -> <b>2001:db8::8:800:200c:417a</b>.</p><p>(b) <code>ff02::1:ff00:42</code> shows ff02 | 1, ff00, 42 = 4 groups, so 8 - 4 = 4 zero groups hide at "::" -> <b>ff02:0000:0000:0000:0000:0001:ff00:0042</b>.</p>`,
      dry: { head: ['group #', 'original', 'drop leading 0s', 'zero?'], rows: [['1', '2001', '2001', 'no'], ['2', '0DB8', 'db8', 'no'], ['3', '0000', '0', '<span class="c-g">yes</span>'], ['4', '0000', '0', '<span class="c-g">yes (run length 2)</span>'], ['5', '0008', '8', 'no'], ['6', '0800', '800', 'no'], ['7', '200C', '200c', 'no'], ['8', '417A', '417a', 'no']] },
      complexity: `<p>Constant work: 8 groups.</p>`,
      followUps: ['What if both ends are zero runs of equal length?', 'How would you write this address in a URL?']
    }
  }]
});

// =====================================================================
// TOPIC 3 — CIDR, masks, subnet math
// =====================================================================
topics.push({
  title: 'CIDR, Subnet Masks and Subnet Math (Network, Broadcast, Range, Hosts)',
  analogy: `<p>A street address like "Flat 77, Block C, Green Park" - the mask is the <b>rule that says where the block name ends and the flat number begins</b>. "/26" means "the first 26 bits are the block name; the last 6 bits are the flat number". A bigger prefix number = a smaller block with fewer flats. Subnet math is just: "which block does flat 77 fall in, what is the first flat of that block, the last, and how many flats are there?"</p>`,
  explain: `<p><b>🟢 CIDR (Classless Inter-Domain Routing)</b> writes an address plus how many leading bits are the network: <code>192.168.10.77/26</code>. The number after the slash is the <b>prefix length</b>. The <b>subnet mask</b> is the same information as 32 bits: first 26 ones, then 6 zeros.</p>
    ${H.bits(0xFFFFFFC0, 32, { label: '/26 mask', hl: { 31: 'p', 30: 'p', 29: 'p', 28: 'p', 27: 'p', 26: 'p', 5: 'y', 4: 'y', 3: 'y', 2: 'y', 1: 'y', 0: 'y' } })}
    <p>26 ones = 255.255.255.<b>192</b> (11000000 in the last octet). The 6 zero bits are the <b>host bits</b>: 2<sup>6</sup> = 64 addresses in the block, <b>62 usable</b> (minus network and broadcast).</p>
    <p><b>The 5 formulas (all you need):</b></p>
    ${H.table(['Want', 'How', 'For 192.168.10.77/26'], [
      ['Network address', 'IP AND mask (keep network bits, zero the host bits)', '192.168.10.<b>64</b>'],
      ['Broadcast', 'network OR (NOT mask) (set all host bits to 1)', '192.168.10.<b>127</b>'],
      ['First host', 'network + 1', '192.168.10.65'],
      ['Last host', 'broadcast - 1', '192.168.10.126'],
      ['Usable hosts', '2<sup>(32-prefix)</sup> - 2', '2<sup>6</sup> - 2 = <b>62</b>']
    ])}
    <p><b>The "magic number" shortcut (no binary needed).</b> Find the <i>interesting octet</i> (the one where the mask is not 0 or 255). Block size = 256 - mask value in that octet. Here: 256 - 192 = <b>64</b>. Blocks start at 0, 64, 128, 192. The address 77 lies in 64..127 -> network .64, broadcast .127. Done in 10 seconds.</p>
    ${H.table(['Prefix', 'Mask', 'Block size', 'Usable hosts'], [['/24', '255.255.255.0', '256', '254'], ['/25', '255.255.255.128', '128', '126'], ['/26', '255.255.255.192', '64', '62'], ['/27', '255.255.255.224', '32', '30'], ['/28', '255.255.255.240', '16', '14'], ['/29', '255.255.255.248', '8', '6'], ['/30', '255.255.255.252', '4', '2'], ['/31', '255.255.255.254', '2', '2 (point-to-point, RFC 3021)'], ['/32', '255.255.255.255', '1', '1 (one host)']])}
    <p><b>Same subnet?</b> Two hosts are on the same subnet when (A AND mask) == (B AND mask). If not, they must talk through a <b>router (default gateway)</b>.</p>
    <p><b>Picking a size:</b> need H hosts -> find the smallest h with 2<sup>h</sup> - 2 &ge; H, then prefix = 32 - h. Need 100 hosts: h = 7 (126) -> /25. Need 500: h = 9 (510) -> /23 (mask 255.255.254.0).</p>
    <p><b>Supernetting (summarization)</b> is the reverse: combine adjacent blocks into one shorter prefix. 192.168.0.0/24 + .1.0/24 + .2.0/24 + .3.0/24 = <b>192.168.0.0/22</b> (4 aligned blocks, so 2 borrowed bits).</p>`,
  clues: ['"Find the network address / broadcast address / usable range of X/N"', '"How many hosts can a /27 hold?" - 2<sup>5</sup> - 2 = 30', '"Are these two hosts in the same subnet?" - AND both with the mask', '"Mask 255.255.255.240" - /28, block size 16', '"Minimum prefix for 500 hosts" - /23', '"Summarize these routes" - supernet; the blocks must be aligned and contiguous', '"Wildcard mask 0.0.0.63" - inverse of /26 (used in ACLs / OSPF)'],
  code: [`#include <arpa/inet.h>
// Subnet calculator with inet_pton + bit arithmetic.
static string dotted(uint32_t x) {
    in_addr a; a.s_addr = htonl(x);      // host number -> network byte order
    char buf[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &a, buf, sizeof buf);
    return buf;
}
static bool parseCidr(const string& s, uint32_t& ip, int& p) {
    size_t slash = s.find('/');
    if (slash == string::npos) return false;
    p = stoi(s.substr(slash + 1));
    if (p < 0 || p > 32) return false;
    in_addr a;
    if (inet_pton(AF_INET, s.substr(0, slash).c_str(), &a) != 1) return false;
    ip = ntohl(a.s_addr);                // now ip is a plain number, 192.168.10.77 = 0xC0A80A4D
    return true;
}
static void report(const string& cidr) {
    uint32_t ip; int p;
    if (!parseCidr(cidr, ip, p)) { cout << cidr << " -> invalid" << endl; return; }
    // p == 0 would shift by 32 (undefined behaviour), so special-case it.
    uint32_t mask = (p == 0) ? 0u : (0xFFFFFFFFu << (32 - p));
    uint32_t network = ip & mask;        // keep network bits, clear host bits
    uint32_t broadcast = network | ~mask;// set every host bit to 1
    uint64_t total = 1ull << (32 - p);   // use 64-bit: /0 has 2^32 addresses
    uint64_t hosts = p >= 31 ? (p == 31 ? 2 : 1) : total - 2;
    cout << cidr << endl;
    cout << "  mask      " << dotted(mask) << endl;
    cout << "  wildcard  " << dotted(~mask) << endl;
    cout << "  network   " << dotted(network) << endl;
    cout << "  broadcast " << dotted(broadcast) << endl;
    cout << "  range     " << dotted(p >= 31 ? network : network + 1) << " - "
         << dotted(p >= 31 ? broadcast : broadcast - 1) << endl;
    cout << "  usable    " << hosts << endl;
}
int main() {
    for (string s : {"192.168.10.77/26", "10.1.2.3/20", "172.16.5.9/30", "8.8.8.8/32", "300.1.1.1/24"}) report(s);
    // Same-subnet test: AND both with the mask and compare
    uint32_t a, b; int p;
    parseCidr("10.0.5.200/22", a, p); parseCidr("10.0.7.9/22", b, p);
    uint32_t m = 0xFFFFFFFFu << (32 - p);
    cout << "same subnet? " << ((a & m) == (b & m) ? "yes" : "no") << endl;
    return 0;
}`, { lang: 'python', run: true, title: 'Subnet calculator (stdlib only)', code: `import ipaddress

def to_int(dotted):
    a, b, c, d = (int(x) for x in dotted.split("."))
    return (a << 24) | (b << 16) | (c << 8) | d

def to_dotted(n):
    return ".".join(str((n >> s) & 255) for s in (24, 16, 8, 0))

def calc(cidr):
    ip_s, p_s = cidr.split("/")
    ip, p = to_int(ip_s), int(p_s)
    mask = (0xFFFFFFFF << (32 - p)) & 0xFFFFFFFF if p else 0
    network = ip & mask                  # AND keeps the network bits
    broadcast = network | (~mask & 0xFFFFFFFF)   # OR with inverted mask sets host bits
    usable = max(2 ** (32 - p) - 2, 0) if p < 31 else (2 if p == 31 else 1)
    first = network + 1 if p < 31 else network
    last = broadcast - 1 if p < 31 else broadcast
    return {"mask": to_dotted(mask), "network": to_dotted(network), "broadcast": to_dotted(broadcast),
            "first": to_dotted(first), "last": to_dotted(last), "usable": usable}

for c in ["192.168.10.77/26", "10.1.2.3/20", "172.16.5.9/30", "203.0.113.200/25"]:
    r = calc(c)
    print(c, "->", r)
    # Cross-check with the standard library
    n = ipaddress.ip_network(c, strict=False)
    assert str(n.network_address) == r["network"] and str(n.broadcast_address) == r["broadcast"]

# Same subnet?
a, b = ipaddress.ip_interface("10.0.5.200/22"), ipaddress.ip_interface("10.0.7.9/22")
print("same subnet:", a.network == b.network, a.network)

# Split a /24 into /27s and summarize four /24s back into one
print([str(s) for s in ipaddress.ip_network("192.168.1.0/24").subnets(new_prefix=27)])
nets = [ipaddress.ip_network("192.168.%d.0/24" % i) for i in range(4)]
print("summary:", list(ipaddress.collapse_addresses(nets)))` }],
  codeTitle: ['C++: inet_pton + mask arithmetic', 'Python: subnet calculator'],
  viz: {
    title: 'Subnet calculator: bits of IP, mask, network and broadcast',
    input: '192.168.10.77/26',
    inputLabel: 'IP/prefix (try 10.1.2.3/20)',
    gen: function (input) {
      var c = parseCidr(input), ip = c.ip, p = c.p, m = maskOf(p), net = (ip & m) >>> 0, bc = (net | (~m >>> 0)) >>> 0;
      var hl = netHl(p), frames = [];
      var first = p >= 31 ? net : net + 1, last = p >= 31 ? bc : bc - 1;
      frames.push({ narr: 'Write <b>' + n2p(ip) + '</b> as 32 bits. The first <b>' + p + '</b> bits (purple) are the <b>network part</b>, the last <b>' + (32 - p) + '</b> (amber) are the <b>host part</b>.', parts: [
        { type: 'bits', label: 'IP ' + n2p(ip), value: ip, width: 32, hl: hl, dec: n2p(ip) }, { type: 'text', html: dotBin(ip) }] });
      frames.push({ narr: 'The mask for /' + p + ' is ' + p + ' ones followed by ' + (32 - p) + ' zeros = <b>' + n2p(m) + '</b>.', parts: [
        { type: 'bits', label: 'mask /' + p, value: m, width: 32, hl: hl, dec: n2p(m) }, { type: 'text', html: dotBin(m) }] });
      frames.push({ narr: '<b>IP AND mask</b> -> where the mask has 0 the result is 0, where it has 1 the IP bit is kept. Result = <b>network address ' + n2p(net) + '</b>.', parts: [
        { type: 'bits', label: 'IP', value: ip, width: 32, hl: hl, dec: n2p(ip) },
        { type: 'bits', label: 'mask', value: m, width: 32, hl: hl, dec: n2p(m) },
        { type: 'bits', label: 'AND = network', value: net, width: 32, hl: hl, dec: n2p(net) }] });
      frames.push({ narr: 'Set <b>all host bits to 1</b> (network OR NOT-mask) -> <b>broadcast ' + n2p(bc) + '</b>.', parts: [
        { type: 'bits', label: 'network', value: net, width: 32, hl: hl, dec: n2p(net) },
        { type: 'bits', label: 'NOT mask (wildcard)', value: (~m) >>> 0, width: 32, hl: hl, dec: n2p((~m) >>> 0) },
        { type: 'bits', label: 'OR = broadcast', value: bc, width: 32, hl: hl, dec: n2p(bc) }] });
      var u = usable(p);
      frames.push({ narr: 'Collect the answers. Usable hosts = 2<sup>' + (32 - p) + '</sup> ' + (p >= 31 ? '(special /31 and /32 rules)' : '- 2 = ' + u) + '.', parts: [
        { type: 'table', label: 'Subnet summary', columns: ['Item', 'Value'], rows: [
          ['Subnet mask', n2p(m)], ['Wildcard mask', n2p((~m) >>> 0)], ['Network address', n2p(net)], ['First usable host', n2p(first)], ['Last usable host', n2p(last)], ['Broadcast', n2p(bc)], ['Total addresses', Math.pow(2, 32 - p)], ['Usable hosts', u]], hl: { 2: 'sel', 5: 'sel', 7: 'win' } }] });
      if (p % 8 !== 0 && p > 0) {
        var oct = Math.floor((p - 1) / 8), mo = (m >>> (24 - 8 * oct)) & 255, blk = 256 - mo, io = (ip >>> (24 - 8 * oct)) & 255, st = Math.floor(io / blk) * blk;
        var starts = []; for (var s = 0; s < 256 && starts.length < 16; s += blk) starts.push(s);
        var hh = {}; hh[Math.floor(io / blk)] = 'sel';
        frames.push({ narr: 'Shortcut: interesting octet #' + (oct + 1) + ', mask value ' + mo + ' -> block size 256 - ' + mo + ' = <b>' + blk + '</b>. Block starts: 0, ' + blk + ', ' + (2 * blk) + '... The value ' + io + ' falls in the block starting at <b>' + st + '</b>.', parts: [
          { type: 'array', label: 'block starts in octet ' + (oct + 1), values: starts, hl: hh }] });
      } else {
        frames.push({ narr: 'The prefix ends exactly on an octet boundary, so no magic-number trick is needed: the host octets are simply all 0 (network) or all 255 (broadcast).', parts: [{ type: 'text', html: 'Try a prefix like /26, /20 or /29 to see the block-size shortcut.' }] });
      }
      return frames;
    }
  },
  examples: [
    { title: '192.168.10.77/26 - the full answer', html: `${H.table(['Item', 'Value', 'How'], [['Mask', '255.255.255.192', '26 ones'], ['Block size', '64', '256 - 192'], ['Network', '192.168.10.64', '77 is in 64..127'], ['Broadcast', '192.168.10.127', 'next block start (128) - 1'], ['Range', '192.168.10.65 - .126', 'network+1 .. broadcast-1'], ['Hosts', '62', '2<sup>6</sup> - 2']])}` },
    { title: 'A mask that crosses an octet: 10.1.2.3/20', html: `<p>/20 = 255.255.<b>240</b>.0. The interesting octet is the 3rd: block = 256 - 240 = <b>16</b>. The third octet is 2, which sits in 0..15 -> network <b>10.1.0.0</b>, broadcast <b>10.1.15.255</b>, hosts 2<sup>12</sup> - 2 = <b>4,094</b>. Note the last octet becomes 255 in the broadcast.</p>` },
    { title: 'Same subnet or not? 10.0.5.200/22 vs 10.0.7.9/22', html: `<p>/22 = 255.255.252.0, block size 4 in octet 3. 5 and 7 are both inside 4..7 -> both belong to <b>10.0.4.0/22</b> (range 10.0.4.0 - 10.0.7.255). <span class="c-g">Same subnet</span>, so they talk directly without a router.</p>` },
    { title: 'Tricky: is 10.0.0.255/23 a valid host?', html: `<p>/23 -> block size 2 in octet 3: network 10.0.0.0, broadcast 10.0.1.255. Hence <code>10.0.0.255</code> is an ordinary <b>valid host</b>, even though it ends in .255! The last octet alone never tells you; always use the mask.</p>` },
    { title: 'Summarizing four /24s', html: `<p>192.168.0.0/24, .1.0/24, .2.0/24, .3.0/24: third octets 0-3 are an aligned block of 4 -> borrow 2 bits -> <b>192.168.0.0/22</b>. If it were .1 to .4 it would NOT collapse into one prefix.</p>` }
  ],
  deepDive: `<p><b>🟣 Why the AND works.</b> The network address is the "common prefix" of every address in the block. A router needs just <code>(dst AND mask) == network</code>, one AND and one compare - cheap in hardware. Mask bits must be contiguous ones (11110000), which is why CIDR can be written as a single number.</p>
    <p><b>Alignment.</b> A block of size 2<sup>h</sup> must start at a multiple of 2<sup>h</sup>. That is why 192.168.1.64/26 is valid but 192.168.1.32/26 is not (32 is not a multiple of 64) - it silently means 192.168.1.0/26. This alignment rule is the basis of VLSM and of route summarization.</p>
    <p><b>Special sizes.</b> /31 = two addresses used as a point-to-point link (RFC 3021) because broadcast is pointless on a 2-node link. /32 = a single host route (loopbacks, anycast, "this exact VM"). /0 = everything (default route).</p>
    <p><b>Cloud reality.</b> AWS and Azure reserve extra addresses per subnet (AWS: first four and last one, so a /28 gives only 11 usable). Kubernetes gives each node a pod CIDR (often a /24 = 254 pods) and the cluster CIDR must not overlap your VPC or on-prem ranges - overlapping CIDRs are a classic painful mistake, since two networks with the same range cannot be peered or routed.</p>
    <p><b>Performance link:</b> a router's forwarding table is keyed by prefix, so good summarization (fewer, shorter prefixes) means smaller tables and faster lookups; the global IPv4 BGP table is about 1 million prefixes today.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Tools like <code>ipcalc</code>, Terraform's <code>cidrsubnet()</code> and AI assistants compute subnets instantly. The risk moves from "can you calculate?" to "can you <i>check</i> what was generated?" A model can output a plausible but misaligned CIDR (like 10.0.0.32/26) that the cloud rejects - or worse accepts as something else.</p>
    <p><b>Use AI as a partner:</b> ask it to generate 10 practice problems with a mix of /19-/30, then verify each with the stdlib <code>ipaddress</code> module (the runnable calculator above). Ask it to "explain why my VPC peering failed" and paste both CIDRs - overlap detection is a great AI use. <b>Where AI goes wrong:</b> off-by-one in usable hosts (forgetting -2, or applying it to /31), wrong block size for non-octet masks, ignoring cloud-reserved addresses. <b>What you must own:</b> being able to do /26 in your head, and always validating a plan with code before applying it.</p>`,
  problems: [{
    title: 'Network, broadcast, range and hosts of 192.168.10.77/26 (guided)', level: 'Easy', tags: ['subnetting', 'cidr', 'masks'], companies: ['Cisco', 'Amazon', 'Juniper'],
    statement: `<p>A laptop has the address <code>192.168.10.77/26</code>. Find: (a) subnet mask, (b) network address, (c) broadcast address, (d) first and last usable host, (e) number of usable hosts, (f) is <code>192.168.10.130</code> in the same subnet?</p>`,
    constraints: `Show the work with the block-size method and also the binary AND for the last octet.`,
    example: `<p>${H.c('g', 'Network 192.168.10.64')} | ${H.c('r', 'Broadcast 192.168.10.127')} | ${H.c('b', 'Hosts .65 - .126 (62)')}</p>`,
    brute: { why: `<p>Writing all 32 bits and doing the AND for all four octets works but is slow and error-prone under interview pressure. Only the octet where the mask is neither 0 nor 255 needs work - the others copy straight through.</p>` },
    mcq: { q: 'The mask 255.255.255.192 has block size...', options: ['32', '64', '128', '192'], answer: 1, explain: '256 - 192 = 64: blocks start at 0, 64, 128, 192.' },
    hints: [`<p>/26 -> 26 ones: three full octets (24) + 2 bits in the last octet = 11000000 = 192.</p>`, `<p>Block size = 256 - 192 = 64. List multiples of 64: 0, 64, 128, 192.</p>`, `<p>77 lies between 64 and 128, so network = .64 and broadcast = (next start 128) - 1 = .127. Usable = 64 - 2.</p>`],
    solution: {
      approach: `<p>Interesting octet = the 4th. Mask value 192, block size 64. 77 &isin; [64, 127]. So the network is 192.168.10.<b>64</b>, the broadcast is 192.168.10.<b>127</b>, first host .65, last host .126, hosts = 2<sup>6</sup> - 2 = <b>62</b>. Binary check: 77 = 01001101, mask 11000000 -> AND = 01000000 = 64. For (f): 130 &isin; [128, 191] belongs to the block 192.168.10.128/26 -> <b>different subnet</b>; a router is needed.</p>`,
      code: { lang: 'python', run: true, code: `import ipaddress
n = ipaddress.ip_interface("192.168.10.77/26")
print("mask", n.netmask, "network", n.network.network_address, "broadcast", n.network.broadcast_address)
hosts = list(n.network.hosts())
print("first", hosts[0], "last", hosts[-1], "count", len(hosts))
print("130 in same subnet:", ipaddress.ip_address("192.168.10.130") in n.network)` },
      dry: { head: ['Step', 'Work', 'Result'], rows: [['1. Mask', '/26 = 24 + 2 bits -> 128+64 = 192', '255.255.255.192'], ['2. Block size', '256 - 192', '64'], ['3. Find block', 'multiples: 0, 64, 128, 192; 64 &le; 77 &lt; 128', 'start = 64'], ['4. Network', 'copy first 3 octets, last = 64', '192.168.10.64'], ['5. Broadcast', 'next start 128 - 1', '192.168.10.127'], ['6. Range', '64+1 .. 127-1', '.65 - .126'], ['7. Hosts', '2^(32-26) - 2', '62'], ['8. Check .130', '130 in 128..191', '<span class="c-r">different subnet</span>']] },
      complexity: `<p>O(1) arithmetic.</p>`,
      followUps: ['What changes if it were /27?', 'What if the mask were 255.255.255.224?']
    }
  }]
});

// =====================================================================
// TOPIC 4 — VLSM
// =====================================================================
function needPrefix(hosts) { var h = 2; while (Math.pow(2, h) - 2 < hosts) h++; return 32 - h; }

topics.push({
  title: 'VLSM: Carving One Network into Different-Sized Subnets',
  analogy: `<p>You have one big <b>chocolate bar of 256 squares</b> and several friends who want different amounts: 60, 30, 12 and 2. Fixed-size subnetting would cut equal pieces of 64 - the friend who wants 2 squares gets 64 and wastes 62. <b>VLSM (Variable Length Subnet Masking)</b> cuts <i>each piece to the smallest power of two that fits</i>, starting with the biggest so nothing is cut across a crooked line.</p>`,
  explain: `<p><b>🟢 The idea.</b> Real networks are not equal: an office LAN needs 60 hosts, a server room 30, a printer VLAN 12, a router-to-router link only 2. VLSM lets each subnet have its <b>own prefix length</b>, carved from one parent block. It only works with classless routing (CIDR and protocols that send masks: OSPF, EIGRP, RIPv2, BGP).</p>
    <p><b>The recipe (always the same 5 steps):</b></p>
    <ol><li><b>List</b> each subnet with its host need.</li>
    <li><b>Sort from largest to smallest</b> (this keeps every block aligned).</li>
    <li>For each, pick the <b>smallest block with usable hosts &ge; need</b>: 2<sup>h</sup> - 2 &ge; need.</li>
    <li>Place it at the <b>next free address</b> (cursor). The cursor then jumps by the block size.</li>
    <li>Whatever is left at the end is your spare room for growth.</li></ol>
    <p><b>Worked example: split 192.168.1.0/24 for 60, 30, 12 and 2 hosts.</b></p>
    ${H.table(['Need', 'Block (2<sup>h</sup>-2 &ge; need)', 'Prefix / Mask', 'Network', 'Usable range', 'Broadcast'], [
      ['60', '64 (62 usable)', '/26 - .192', '192.168.1.0', '.1 - .62', '.63'],
      ['30', '32 (30 usable)', '/27 - .224', '192.168.1.64', '.65 - .94', '.95'],
      ['12', '16 (14 usable)', '/28 - .240', '192.168.1.96', '.97 - .110', '.111'],
      ['2', '4 (2 usable)', '/30 - .252', '192.168.1.112', '.113 - .114', '.115']
    ])}
    ${H.arr(['0-63', '64-95', '96-111', '112-115', '116-255 (free)'], { label: 'carving of 0..255', hl: { 0: 'g', 1: 'b', 2: 'y', 3: 'p', 4: 'm' } })}
    <p>Used: 64 + 32 + 16 + 4 = 116 addresses; <b>140 left</b> in one contiguous chunk (.116 - .255, which can later be carved into /26 .128 etc. respecting alignment). With equal /26 pieces you would need 4 x 64 = 256 and have nothing left.</p>
    <p><b>Why biggest first?</b> A block of 64 must start at a multiple of 64. If you place the /30 first at .0, the next /26 cannot start at .4 - it must jump to .64, wasting .4 - .63. Sorting descending makes every cursor position a multiple of the next block size automatically.</p>
    <p><b>Do not forget</b>: point-to-point router links need only a /30 (2 hosts) or a /31; every VLAN needs its own subnet; leave growth room (plan 30-50% headroom for LANs).</p>`,
  clues: ['"Divide the network 192.168.1.0/24 for 60, 30, 12 and 2 hosts"', '"Minimize wasted addresses" / "most efficient addressing"', '"Different subnets need different numbers of hosts"', '"Router-to-router link" - /30 (or /31)', '"Allocate largest first"', '"Variable Length Subnet Mask" in the question title'],
  code: [{ lang: 'python', run: true, title: 'VLSM allocator (stdlib only)', code: `import ipaddress

def prefix_for(hosts):
    # Smallest prefix whose usable hosts (2^h - 2) cover the need. Minimum /30.
    h = 2
    while 2 ** h - 2 < hosts:
        h += 1
    return 32 - h

def vlsm(parent, needs):
    # needs: list of (name, hosts). Returns allocations, largest first.
    parent = ipaddress.ip_network(parent)
    cursor = int(parent.network_address)
    end = int(parent.broadcast_address) + 1
    out = []
    for name, hosts in sorted(needs, key=lambda x: -x[1]):    # biggest first keeps blocks aligned
        p = prefix_for(hosts)
        size = 2 ** (32 - p)
        if cursor % size:                                    # defensive: align the cursor
            cursor += size - cursor % size
        if cursor + size > end:
            raise ValueError("not enough room for " + name)
        net = ipaddress.ip_network((cursor, p))
        out.append((name, hosts, net))
        cursor += size
    return out, ipaddress.ip_address(cursor), end - cursor

allocs, next_free, spare = vlsm("192.168.1.0/24", [("A", 60), ("B", 30), ("C", 12), ("D", 2)])
print("%-4s %-5s %-18s %-16s %-24s %s" % ("name", "need", "subnet", "mask", "usable range", "broadcast"))
for name, need, net in allocs:
    hosts = list(net.hosts())
    print("%-4s %-5d %-18s %-16s %-24s %s" % (name, need, net, net.netmask, str(hosts[0]) + " - " + str(hosts[-1]), net.broadcast_address))
print("next free:", next_free, "| spare addresses:", spare)

# A bigger plan: head office, sales, lab, management, one WAN link
allocs, next_free, spare = vlsm("10.10.0.0/24", [("HQ", 100), ("Sales", 50), ("Lab", 25), ("Mgmt", 10), ("WAN", 2)])
for name, need, net in allocs:
    print(name, need, net)
print("spare:", spare)
try:
    vlsm("192.168.1.0/24", [("X", 200), ("Y", 100)])
except ValueError as e:
    print("error:", e)` }],
  codeTitle: ['Python: VLSM allocator'],
  viz: {
    title: 'VLSM carving: biggest first, smallest block that fits',
    input: '192.168.1.0/24 | 60 30 12 2',
    inputLabel: 'Parent block | host needs',
    gen: function (input) {
      var parts = String(input).split('|');
      if (parts.length !== 2) throw new Error('Format: 192.168.1.0/24 | 60 30 12 2');
      var c = parseCidr(parts[0]);
      var needs = parts[1].trim().split(/[\s,]+/).map(Number);
      if (!needs.length || needs.some(function (x) { return !(x >= 1) || x !== Math.floor(x); })) throw new Error('Host needs must be positive whole numbers');
      if (needs.length > 10) throw new Error('Use at most 10 subnets');
      if (c.p < 16) throw new Error('Use a parent prefix of /16 or longer');
      var total = Math.pow(2, 32 - c.p), base = (c.ip & maskOf(c.p)) >>> 0;
      needs = needs.slice().sort(function (a, b) { return b - a; });
      var frames = [], sizes = [], texts = [], idx = [], rows = [], cursor = 0;
      frames.push({ narr: 'Parent block <b>' + n2p(base) + '/' + c.p + '</b> = ' + total + ' addresses. Needs sorted <b>largest first</b>: ' + needs.join(', ') + '.', parts: [
        { type: 'bars', label: 'free space (addresses)', values: [total], texts: [total + ' free'], idxLabels: ['parent'] },
        { type: 'array', label: 'sorted needs', values: needs }] });
      for (var i = 0; i < needs.length; i++) {
        var p = needPrefix(needs[i]), size = Math.pow(2, 32 - p);
        if (cursor % size) cursor += size - cursor % size;
        if (cursor + size > total) throw new Error('Not enough room: ' + needs[i] + ' hosts need a /' + p + ' but the parent has no space left');
        var net = base + cursor, bc = net + size - 1;
        frames.push({ narr: 'Need <b>' + needs[i] + '</b> hosts: smallest h with 2<sup>h</sup> - 2 &ge; ' + needs[i] + ' is h = ' + (32 - p) + ' (' + (size - 2) + ' usable) -> <b>/' + p + '</b>, block of ' + size + '. Place it at the cursor (offset ' + cursor + ').', parts: [
          { type: 'bars', label: 'allocated blocks so far (addresses)', values: sizes.concat([size]), texts: texts.concat(['NEW /' + p]), idxLabels: idx.concat(['#' + (i + 1)]), hl: (function () { var h = {}; h[sizes.length] = 'cur'; return h; })() },
          { type: 'vars', vals: { need: needs[i], prefix: '/' + p, block: size, network: n2p(net) }, hl: { network: 'ok' } }] });
        sizes.push(size); texts.push('/' + p + ' (' + size + ')'); idx.push('#' + (i + 1));
        rows.push([i + 1, needs[i], '/' + p + ' (' + n2p(maskOf(p)) + ')', n2p(net) + '/' + p, n2p(net + 1) + ' - ' + n2p(bc - 1), n2p(bc)]);
        cursor += size;
      }
      var left = total - cursor, hl2 = {}; for (var j = 0; j < sizes.length; j++) hl2[j] = 'ok';
      var finalSizes = sizes.slice(), finalTexts = texts.slice(), finalIdx = idx.slice();
      if (left > 0) { finalSizes.push(left); finalTexts.push('free ' + left); finalIdx.push('spare'); hl2[sizes.length] = 'done'; }
      frames.push({ narr: 'Done. Used <b>' + cursor + '</b> of ' + total + ' addresses; <b>' + left + '</b> remain' + (left ? ' starting at ' + n2p(base + cursor) + ' for future growth.' : ' (exactly full).'), parts: [
        { type: 'bars', label: 'final layout', values: finalSizes, texts: finalTexts, idxLabels: finalIdx, hl: hl2 },
        { type: 'table', label: 'Allocation table', columns: ['#', 'Hosts needed', 'Prefix (mask)', 'Subnet', 'Usable range', 'Broadcast'], rows: rows }] });
      return frames;
    }
  },
  examples: [
    { title: 'The 60 / 30 / 12 / 2 split on 192.168.1.0/24', html: `<p>Follow the cursor: start .0 -> /26 takes .0-.63 -> cursor 64 -> /27 takes .64-.95 -> cursor 96 -> /28 takes .96-.111 -> cursor 112 -> /30 takes .112-.115 -> cursor 116. Free: .116 - .255.</p>` },
    { title: 'What goes wrong if you place the small one first', html: `<p>Put the /30 at .0-.3 first. The /26 (size 64) cannot start at .4; it must start on a multiple of 64 = .64. So .4-.63 (60 addresses) are stranded. Always sort <b>descending</b>.</p>` },
    { title: 'Five-subnet company plan on 10.10.0.0/24', html: `${H.table(['Name', 'Need', 'Subnet'], [['HQ', '100', '10.10.0.0/25 (126 usable)'], ['Sales', '50', '10.10.0.128/26 (62)'], ['Lab', '25', '10.10.0.192/27 (30)'], ['Mgmt', '10', '10.10.0.224/28 (14)'], ['WAN link', '2', '10.10.0.240/30 (2)']])}<p>Total 128+64+32+16+4 = 244; spare 12 addresses (.244-.255).</p>` },
    { title: 'Impossible request detected', html: `<p>200 hosts needs a /24 (254) and 100 hosts needs a /25. Together 256 + 128 = 384 > 256, so you must request a bigger parent (a /23 holds 512). Always check the sum of block sizes before promising a plan.</p>` }
  ],
  deepDive: `<p><b>🟣 Why it is a bin-packing problem with a gift.</b> Normally bin packing is NP-hard, but because every block size is a power of two and blocks must be aligned, sorting by size descending and placing greedily is <b>optimal</b> for fitting into one parent block: the total never exceeds the sum of block sizes. Think of it as a binary buddy allocator - the same idea as the Linux kernel's <b>buddy system</b> for physical memory pages (OS module link!).</p>
    <p><b>Routing consequence.</b> VLSM only helps if routers keep the mask with each route. That is why RIPv1 (classful, no masks) could not do it and RIPv2/OSPF/EIGRP/BGP can. Each carved subnet becomes its own routing-table entry, so plan <b>hierarchically</b>: give each site one summarizable block (e.g. site A = 10.1.0.0/20) and VLSM <i>inside</i> it. Then the core only needs a single summary route per site.</p>
    <p><b>Real-world sizing rules.</b> (1) Count growth - typically 2x. (2) Account for reserved addresses: the gateway (.1), HSRP/VRRP virtual IPs, and in AWS five reserved per subnet. (3) Do not put thousands of hosts in one broadcast domain - ARP and broadcast traffic grows; split into VLANs of /24 or smaller. (4) Use /31 for new point-to-point links if your gear supports it.</p>
    <p><b>Cloud tip:</b> VPC designs usually give one /16 per VPC, a /20 per Availability Zone, then /24 per tier - plan to keep ranges non-overlapping across regions and on-prem so peering and VPN stay possible.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Planning an address layout is exactly the kind of tedious, rule-based task AI and IaC modules (Terraform <code>cidrsubnets()</code>) now do for you. The new job is <b>specifying the constraints</b> correctly: growth factor, reserved addresses, hierarchy for summarization, no overlap with other environments.</p>
    <p><b>Use AI as a partner:</b> describe your sites and ask for a plan and a reasoning table, then <b>re-run the allocation with the runnable allocator above</b> and diff the two. Ask "what breaks if this site doubles in size?". <b>Where AI goes wrong:</b> assigns blocks in the order you listed them (misaligned or overlapping), forgets that /30 only has 2 usable hosts, ignores cloud-reserved addresses, or gives each site non-contiguous ranges so nothing summarizes. <b>What you must own:</b> the descending-order alignment logic so you can spot an overlap by reading the table.</p>`,
  problems: [{
    title: 'VLSM: split 192.168.1.0/24 for 60, 30, 12 and 2 hosts (guided)', level: 'Medium', tags: ['vlsm', 'subnetting'], companies: ['Cisco', 'TCS', 'Infosys'],
    statement: `<p>Divide <code>192.168.1.0/24</code> into four subnets that fit 60, 30, 12 and 2 hosts with the least waste. Give network address, mask, usable range and broadcast of each, and say what is left.</p>`,
    constraints: `Subnets must not overlap and each must start on its natural boundary. Largest first.`,
    example: `<p>${H.c('g', '60 -> 192.168.1.0/26')}, ${H.c('b', '30 -> 192.168.1.64/27')}, ${H.c('y', '12 -> 192.168.1.96/28')}, ${H.c('p', '2 -> 192.168.1.112/30')}</p>`,
    brute: { why: `<p>Four equal /26 subnets: the 2-host link gets 62 spare addresses and the 12-host LAN wastes 50. It "works" but burns the entire /24 and leaves no growth room.</p>` },
    mcq: { q: 'Which prefix gives at least 30 usable hosts with the least waste?', options: ['/26', '/27', '/28', '/25'], answer: 1, explain: '/27 has 32 addresses, 30 usable - an exact fit. /28 has only 14 usable.' },
    hints: [`<p>Needs: usable = 2<sup>h</sup> - 2, so 60 needs h=6 (62), 30 needs h=5 (30), 12 needs h=4 (14), 2 needs h=2 (2).</p>`, `<p>Start the cursor at 0. Place the biggest block, then move the cursor forward by its size.</p>`, `<p>Block sizes 64, 32, 16, 4 -> starts 0, 64, 96, 112. Broadcast = start + size - 1.</p>`],
    solution: {
      approach: `<p>Sort descending (60, 30, 12, 2). For each find the smallest block: 64 (/26), 32 (/27), 16 (/28), 4 (/30). Place sequentially: .0/26 (hosts .1-.62, bc .63), .64/27 (hosts .65-.94, bc .95), .96/28 (hosts .97-.110, bc .111), .112/30 (hosts .113-.114, bc .115). Addresses .116-.255 (140 addresses) stay free for growth, e.g. another /26 at .128.</p>`,
      dry: { head: ['Need', 'h (2^h-2 &ge; need)', 'Prefix', 'Cursor start', 'Broadcast', 'Next cursor'], rows: [['60', '6 (62)', '/26', '0', '63', '64'], ['30', '5 (30)', '/27', '64', '95', '96'], ['12', '4 (14)', '/28', '96', '111', '112'], ['2', '2 (2)', '/30', '112', '115', '116']] },
      complexity: `<p>O(n log n) for sorting n subnets, then O(n) placement.</p>`,
      followUps: ['What is the largest block still available after this plan?', 'What if a 5th subnet needs 70 hosts?']
    }
  }]
});

// =====================================================================
// TOPIC 5 — Routing tables, LPM, static vs dynamic
// =====================================================================
var DEFAULT_ROUTES = [['0.0.0.0/0', '192.168.1.1', 'eth0 (default)'], ['10.0.0.0/8', '10.255.0.1', 'eth1'], ['10.1.0.0/16', '10.1.0.1', 'eth2'], ['10.1.2.0/24', '10.1.2.1', 'eth3'], ['10.1.2.64/26', '172.16.0.9', 'eth4'], ['192.168.1.0/24', 'connected', 'eth0']];

topics.push({
  title: 'Routing Tables, Longest-Prefix Match, Static vs Dynamic Routing',
  analogy: `<p>A router is a <b>road-sign at a junction</b>. It does not know the whole country; it only has a list: "to 10.x.x.x go left", "to 10.1.2.x go right", "anything else go straight (default)". When two signs both fit, you obey the <b>most specific</b> one - "to the airport" beats "to the city". That is <b>longest-prefix match</b>. Static routing = signs you painted by hand. Dynamic routing = signs that update themselves when neighbours gossip about road closures.</p>`,
  explain: `<p><b>🟢 The routing table.</b> Each router has a table with rows like:</p>
    ${H.table(['Destination prefix', 'Next hop (gateway)', 'Interface', 'Metric'], [['10.1.2.0/24', '10.1.2.1', 'eth3', '1'], ['10.0.0.0/8', '10.255.0.1', 'eth1', '20'], ['192.168.1.0/24', 'directly connected', 'eth0', '0'], ['0.0.0.0/0', '192.168.1.1', 'eth0', '100']])}
    <p>For every packet the router: (1) reads the <b>destination IP</b>; (2) finds all rows where <code>(dest AND mask) == network</code> - the <i>candidates</i>; (3) picks the one with the <b>longest prefix (largest /n)</b>; (4) sends the packet out of that interface to that next hop (it ARPs for the next hop's MAC, topic 6); (5) decrements TTL and if TTL hits 0 drops it and sends an ICMP "Time Exceeded".</p>
    <p><b>Worked LPM:</b> destination <code>10.1.2.77</code> against the sample table (/0, /8, /16, /24, /26):</p>
    ${H.table(['Route', 'Does 10.1.2.77 match?', 'Why'], [['0.0.0.0/0', '<span class="c-g">yes</span>', 'matches everything'], ['10.0.0.0/8', '<span class="c-g">yes</span>', 'first octet 10'], ['10.1.0.0/16', '<span class="c-g">yes</span>', '10.1'], ['10.1.2.0/24', '<span class="c-g">yes</span>', '10.1.2'], ['10.1.2.64/26', '<span class="c-b"><b>yes - WINNER</b></span>', '77 is inside 64-127, prefix 26 is longest'], ['192.168.1.0/24', '<span class="c-r">no</span>', 'different network']])}
    <p>The default route <code>0.0.0.0/0</code> is just the shortest possible prefix: "if nothing else matches". If there is no default and no match, the packet is dropped (ICMP "Destination unreachable").</p>
    <p><b>Where rows come from:</b> (1) <b>Connected</b> - networks on the router's own interfaces (added automatically). (2) <b>Static</b> - typed by an admin: <code>ip route add 10.1.2.0/24 via 10.0.0.2</code>. (3) <b>Dynamic</b> - learned from neighbours via a routing protocol. If several sources offer the same prefix, the lower <b>administrative distance</b> wins (connected 0, static 1, OSPF 110, RIP 120); within one protocol the lower <b>metric</b> wins.</p>
    ${H.table(['', 'Static', 'Dynamic'], [['Config effort', 'manual per route', 'configure once, auto-learns'], ['Reacts to link failure', 'no (unless monitored)', 'yes, re-converges'], ['CPU / bandwidth cost', 'none', 'some (updates)'], ['Best for', 'small/stub networks, default route, security-sensitive', 'larger changing networks']])}
    <p><b>Two dynamic families at a glance.</b></p>
    ${H.table(['', 'Distance-vector (RIP, EIGRP-like)', 'Link-state (OSPF, IS-IS)'], [['What neighbours share', 'my whole table: "I can reach X in 3 hops"', 'facts about my direct links (LSAs), flooded to everyone'], ['View of network', 'only what neighbours say ("routing by rumour")', 'every router builds the full map'], ['Algorithm', 'Bellman-Ford', 'Dijkstra (shortest path first)'], ['Convergence', 'slow; count-to-infinity problem', 'fast'], ['Memory / CPU', 'low', 'higher']])}
    <p>Between companies and ISPs the internet uses <b>BGP</b>, a <i>path-vector</i> protocol that picks routes by policy, not just shortest distance (covered in the advanced networking module).</p>`,
  clues: ['"Which route will the packet use?" - collect matching prefixes, take the longest', '"Default gateway / default route 0.0.0.0/0"', '"Route to 10.0.0.0/8 and 10.1.0.0/16 both match"', '"Router sends packet - what does it change?" - TTL, header checksum, and the L2 MAC addresses (IP stays)', '"RIP vs OSPF" - distance-vector hop count vs link-state Dijkstra cost', '"Count to infinity" / "split horizon" - distance-vector problems', '"Tie between equal prefixes" - lower admin distance, then lower metric (or ECMP)'],
  code: [{ lang: 'python', run: true, title: 'Longest-prefix-match router (stdlib)', code: `import ipaddress

ROUTES = [  # (prefix, next hop, interface, metric)
    ("0.0.0.0/0",      "192.168.1.1", "eth0", 100),
    ("10.0.0.0/8",     "10.255.0.1",  "eth1", 20),
    ("10.1.0.0/16",    "10.1.0.1",    "eth2", 20),
    ("10.1.2.0/24",    "10.1.2.1",    "eth3", 20),
    ("10.1.2.64/26",   "172.16.0.9",  "eth4", 20),
    ("192.168.1.0/24", "connected",   "eth0", 0),
]
TABLE = [(ipaddress.ip_network(p), nh, itf, m) for p, nh, itf, m in ROUTES]

def lookup(dest):
    # Linear scan: collect candidates, pick longest prefix, break ties by lower metric.
    ip = ipaddress.ip_address(dest)
    cands = [r for r in TABLE if ip in r[0]]
    if not cands:
        return None, []
    best = max(cands, key=lambda r: (r[0].prefixlen, -r[3]))
    return best, cands

for d in ["10.1.2.77", "10.1.2.5", "10.9.9.9", "10.1.77.1", "192.168.1.50", "8.8.8.8"]:
    best, cands = lookup(d)
    print("%-13s candidates=%s" % (d, [str(c[0]) for c in cands]))
    print("%-13s -> %s via %s dev %s" % ("", best[0], best[1], best[2]))

# The same idea with a binary trie: walk one bit per level, remember the deepest route seen.
class Node:
    def __init__(self):
        self.kids = [None, None]
        self.route = None

root = Node()
def insert(net, info):
    node = root
    bits = int(net.network_address)
    for i in range(net.prefixlen):
        b = (bits >> (31 - i)) & 1
        if node.kids[b] is None:
            node.kids[b] = Node()
        node = node.kids[b]
    node.route = info

def trie_lookup(dest):
    node, best = root, root.route
    ip = int(ipaddress.ip_address(dest))
    for i in range(32):
        node = node.kids[(ip >> (31 - i)) & 1]
        if node is None:
            break
        if node.route:
            best = node.route
    return best

for net, nh, itf, m in TABLE:
    insert(net, (str(net), nh))
print("trie:", trie_lookup("10.1.2.77"), trie_lookup("8.8.4.4"))` },
  `#include <arpa/inet.h>
// Longest-prefix match with plain structs and mask arithmetic.
struct Route { uint32_t net; int prefix; string nextHop; };

static uint32_t toNum(const char* s) { in_addr a; inet_pton(AF_INET, s, &a); return ntohl(a.s_addr); }
static uint32_t maskOf(int p) { return p == 0 ? 0u : 0xFFFFFFFFu << (32 - p); }

int main() {
    vector<Route> table = {
        {toNum("0.0.0.0"), 0, "192.168.1.1"},
        {toNum("10.0.0.0"), 8, "10.255.0.1"},
        {toNum("10.1.0.0"), 16, "10.1.0.1"},
        {toNum("10.1.2.0"), 24, "10.1.2.1"},
        {toNum("10.1.2.64"), 26, "172.16.0.9"},
    };
    for (const char* d : {"10.1.2.77", "10.1.2.5", "10.9.9.9", "8.8.8.8"}) {
        uint32_t dst = toNum(d);
        const Route* best = nullptr;
        for (const Route& r : table)
            if ((dst & maskOf(r.prefix)) == r.net)                 // candidate?
                if (!best || r.prefix > best->prefix) best = &r;   // keep the longest prefix
        cout << d << " -> " << (best ? best->nextHop : string("unreachable"))
             << " (/" << (best ? best->prefix : -1) << ")" << endl;
    }
    return 0;
}`,
  { lang: 'bash', check: false, title: 'Inspect real routing on Linux', code: `ip route show                 # the routing table: prefix via next-hop dev interface
ip route get 10.1.2.77        # which route will THIS destination use? (the kernel does LPM)
ip route add 10.1.2.0/24 via 192.168.1.254   # add a static route
ip route add default via 192.168.1.1         # the default route (0.0.0.0/0)
traceroute 8.8.8.8            # list the routers (hops) along the path
netstat -rn                   # older equivalent of ip route show` }],
  codeTitle: ['Python: LPM router + binary trie', 'C++: LPM with masks', 'Linux commands for routes'],
  viz: {
    title: 'Longest-prefix match against a routing table',
    input: '10.1.2.77',
    inputLabel: 'Destination IP (optional: ip | 10.0.0.0/8 A; 10.1.0.0/16 B ...)',
    gen: function (input) {
      var s = String(input), pieces = s.split('|'), dst = p2n(pieces[0]), routes = DEFAULT_ROUTES.slice();
      if (pieces.length > 1) {
        routes = pieces[1].split(';').map(function (r) { var t = r.trim().split(/\s+/); if (t.length < 2) throw new Error('Route format: 10.0.0.0/8 NextHop'); return [t[0], t[1], '-']; });
      }
      if (routes.length > 10) throw new Error('Use at most 10 routes');
      var parsed = routes.map(function (r) { var c = parseCidr(r[0]); return { net: (c.ip & maskOf(c.p)) >>> 0, p: c.p, text: n2p((c.ip & maskOf(c.p)) >>> 0) + '/' + c.p, nh: r[1], itf: r[2] }; });
      var status = parsed.map(function () { return '?'; }), hl = {}, frames = [];
      function rows() { return parsed.map(function (r, i) { return [r.text, r.nh, r.itf, status[i]]; }); }
      function hlHits() { var h = {}; Object.keys(hl).forEach(function (k) { h[k] = hl[k]; }); return h; }
      frames.push({ narr: 'A packet arrives for <b>' + n2p(dst) + '</b>. The router will test it against every route: <code>(dest AND mask) == network</code>?', parts: [
        { type: 'bits', label: 'destination ' + n2p(dst), value: dst, width: 32, dec: n2p(dst) },
        { type: 'table', label: 'Routing table', columns: ['Prefix', 'Next hop', 'Interface', 'Match?'], rows: rows() }] });
      for (var i = 0; i < parsed.length; i++) {
        var r = parsed[i], ok = inNet(dst, r.net, r.p), h = hlHits();
        status[i] = ok ? 'MATCH (/' + r.p + ')' : 'no'; hl[i] = ok ? 'ok' : 'done'; h[i] = 'cur';
        frames.push({ narr: 'Route <b>' + r.text + '</b>: the first ' + r.p + ' bits ' + (ok ? '<span class="c-g">are the same</span> -> it is a <b>candidate</b>.' : '<span class="c-r">differ</span> -> not a candidate.'), parts: [
          { type: 'bits', label: 'dest, first ' + r.p + ' bits (purple) compared', value: dst, width: 32, hl: netHl(r.p), dec: n2p(dst) },
          { type: 'bits', label: 'route network ' + r.text, value: r.net, width: 32, hl: netHl(r.p), dec: n2p(r.net) },
          { type: 'table', label: 'Routing table', columns: ['Prefix', 'Next hop', 'Interface', 'Match?'], rows: rows(), hl: h }] });
      }
      var best = -1; parsed.forEach(function (r, i) { if (inNet(dst, r.net, r.p) && (best < 0 || r.p > parsed[best].p)) best = i; });
      if (best < 0) {
        frames.push({ narr: '<b>No route matches</b> and there is no default route -> the packet is dropped and the router sends ICMP "Destination Unreachable".', parts: [{ type: 'table', label: 'Routing table', columns: ['Prefix', 'Next hop', 'Interface', 'Match?'], rows: rows(), hl: hlHits() }] });
      } else {
        status[best] = 'WINNER (longest /' + parsed[best].p + ')'; hl[best] = 'win';
        frames.push({ narr: 'Among the candidates the <b>longest prefix wins</b>: <b>' + parsed[best].text + '</b> (/' + parsed[best].p + '). The packet leaves via <b>' + parsed[best].nh + '</b>' + (parsed[best].nh === 'connected' ? ' (destination is on a directly connected LAN: ARP for the host itself).' : ' (ARP for that next hop, then forward; TTL is decremented).'), parts: [
          { type: 'table', label: 'Routing table', columns: ['Prefix', 'Next hop', 'Interface', 'Match?'], rows: rows(), hl: hlHits() },
          { type: 'vars', vals: { destination: n2p(dst), 'chosen route': parsed[best].text, 'next hop': parsed[best].nh }, hl: { 'chosen route': 'ok' } }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Same table, different destinations', html: `${H.table(['Destination', 'Candidates', 'Winner'], [['10.1.2.77', '/0 /8 /16 /24 /26', '<b>10.1.2.64/26</b> via 172.16.0.9'], ['10.1.2.5', '/0 /8 /16 /24', '<b>10.1.2.0/24</b> (5 is not in 64-127)'], ['10.9.9.9', '/0 /8', '<b>10.0.0.0/8</b>'], ['192.168.1.50', '/0 /24', '<b>192.168.1.0/24</b> connected'], ['8.8.8.8', '/0', '<b>default</b> via 192.168.1.1']])}` },
    { title: 'What the router rewrites on each hop', html: `<p>The <b>IP source/destination stay the same</b> (unless NAT). The router rewrites the <b>Ethernet header</b>: source MAC = its outgoing interface, destination MAC = next hop's MAC (found by ARP). It also decrements <b>TTL</b> by 1 and recalculates the IPv4 header checksum. That is why <code>traceroute</code> works: it sends packets with TTL 1, 2, 3... and the routers that kill them reply.</p>` },
    { title: 'Floating static route (backup)', html: `<p>A static route given a high administrative distance (say 200) only enters the table when the OSPF route (110) disappears: <code>ip route 0.0.0.0/0 203.0.113.1 200</code>. It floats up as a backup when the primary dies.</p>` },
    { title: 'Count-to-infinity in two lines', html: `<p>Routers A - B - C. C's network dies. B still believes A knows a path (A's old advert), A believes B does: they keep raising the hop count 3, 4, 5 ... to 16 (RIP "infinity"). <b>Split horizon</b> (never advertise a route back to where you learned it), <b>poison reverse</b> and hold-down timers fix it.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> Linear search is fine on a toy router. A real core router holds ~1,000,000 IPv4 routes, so it uses specialised structures: <b>binary/multibit tries</b> (as in the Python trie above), <b>DIR-24-8</b> (Linux/DPDK: a 2<sup>24</sup>-entry table for /24-and-shorter plus a small second level), and in hardware <b>TCAM</b> (ternary CAM) that compares the destination to every prefix in one clock cycle, with the longest prefix pre-ordered. Linux's FIB uses an LC-trie (level-compressed trie).</p>
    <p><b>Equal-cost multipath (ECMP).</b> If two routes tie on prefix and metric, the router hashes the 5-tuple (src IP, dst IP, protocol, ports) to pick one next hop per <i>flow</i>, so packets of one TCP connection do not get reordered. Data-center fabrics run entirely on this.</p>
    <p><b>OSPF in a paragraph.</b> Each router floods LSAs describing its links and costs (cost = reference bandwidth / link bandwidth); every router runs <b>Dijkstra</b> on the same link-state database and so computes loop-free shortest paths. Areas (area 0 backbone) limit flooding in big networks. A DR/BDR is elected on broadcast LANs to avoid n<sup>2</sup> adjacencies. <b>RIP</b> sends its whole table every 30 s with hop-count metric, max 15. <b>EIGRP</b> is Cisco's advanced distance-vector. <b>BGP</b> runs on TCP port 179.</p>
    <p><b>Gotchas:</b> asymmetric routing (forward and return paths differ - breaks stateful firewalls), routing loops (TTL saves you), black holes (a summary route covering addresses that no longer exist - mitigate with a null route), and the order Linux checks: <i>policy rules -> longest prefix -> metric</i>. Reverse-path filtering (rp_filter) drops packets whose source would not be routed back via the arriving interface.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Network automation (Ansible, Terraform, intent-based tools) pushes routes for you, and AI assistants now read <code>show ip route</code> output and explain why traffic took a path. Cloud route tables (AWS VPC, Azure UDR) use the very same longest-prefix rule: a /32 you add by mistake can silently hijack traffic.</p>
    <p><b>Use AI as a partner:</b> paste a route table and a destination and ask "walk me through candidate matches", then check with <code>ip route get</code>. Ask it to generate overlapping-prefix puzzles for practice. <b>Where AI goes wrong:</b> picking the <i>first</i> matching row instead of the longest, ignoring administrative distance, treating a default route as "no route", and suggesting a static route to a next hop that is not on a connected network (it would not even install). <b>What you must own:</b> the four-step lookup (candidates -> longest -> AD -> metric) and the ability to predict where a packet goes <i>before</i> you change a production route table.</p>`,
  problems: [{
    title: 'Longest-prefix match against a routing table (guided)', level: 'Medium', tags: ['routing', 'lpm'], companies: ['Cisco', 'Arista', 'Google'],
    statement: `<p>A router has these routes:</p>${H.table(['#', 'Prefix', 'Next hop'], [['R1', '0.0.0.0/0', 'A'], ['R2', '172.16.0.0/12', 'B'], ['R3', '172.16.0.0/16', 'C'], ['R4', '172.16.5.0/24', 'D'], ['R5', '172.16.5.128/25', 'E']])}<p>Where do packets for (a) 172.16.5.200, (b) 172.16.5.99, (c) 172.17.3.4, (d) 172.16.200.1, (e) 8.8.8.8 go?</p>`,
    constraints: `Use longest-prefix match. Explain which candidates matched.`,
    example: `<p>${H.c('g', '172.16.5.200')} -> candidates R1 R2 R3 R4 R5 -> ${H.c('b', 'R5 (/25) -> E')}</p>`,
    brute: { why: `<p>Picking the first row that matches (like a firewall rule list) would always choose R1, the default route, because it matches everything. Routers must compare prefix lengths of <i>all</i> candidates.</p>` },
    mcq: { q: 'Two routes match a destination: 10.0.0.0/8 (metric 1) and 10.1.0.0/16 (metric 50). Which wins?', options: ['/8 because the metric is lower', '/16 because it is the longer prefix', 'Both are used equally', 'The first one in the table'], answer: 1, explain: 'Prefix length is compared before metric. Metrics only break ties between routes with the SAME prefix.' },
    hints: [`<p>For each route ask: do the first n bits match? For /12 compare 172.16-172.31 in the 2nd octet; /16 compares 172.16; /24 compares 172.16.5; /25 splits the 4th octet at 128.</p>`, `<p>List candidates, then choose the largest prefix length.</p>`, `<p>R5 = 172.16.5.128/25 covers .128 - .255; R4 covers 172.16.5.0-255.</p>`],
    solution: {
      approach: `<p>(a) 172.16.5.200: 200 &ge; 128, so R5 matches; candidates R1-R5, longest is /25 -> <b>E</b>. (b) 172.16.5.99: 99 &lt; 128 so R5 fails; R4 (/24) matches -> <b>D</b>. (c) 172.17.3.4: second octet 17 is inside 16-31 so R2 (/12) matches but R3 (/16, needs 172.16) does not -> <b>B</b>. (d) 172.16.200.1: matches R1, R2, R3; R4 needs third octet 5 -> longest R3 /16 -> <b>C</b>. (e) 8.8.8.8: only the default -> <b>A</b>.</p>`,
      dry: { head: ['Destination', 'Candidates', 'Longest', 'Next hop'], rows: [['172.16.5.200', 'R1 R2 R3 R4 R5', 'R5 /25', 'E'], ['172.16.5.99', 'R1 R2 R3 R4', 'R4 /24', 'D'], ['172.17.3.4', 'R1 R2', 'R2 /12', 'B'], ['172.16.200.1', 'R1 R2 R3', 'R3 /16', 'C'], ['8.8.8.8', 'R1', 'R1 /0', 'A']] },
      complexity: `<p>Linear scan O(R) per packet; a trie gives O(32); TCAM gives O(1) in hardware.</p>`,
      followUps: ['What happens if R1 (the default route) is deleted and the destination is 8.8.8.8?', 'How would you store 1M prefixes for fast lookup?']
    }
  }]
});

// =====================================================================
// TOPIC 6 — ARP
// =====================================================================
topics.push({
  title: 'ARP: Finding the MAC Address Behind an IP (Request, Reply, Cache)',
  analogy: `<p>You know your friend's name (the IP) but need their <b>face to hand over a parcel inside a big hall</b> (the LAN). You stand up and shout: <b>"Who is 192.168.1.20? Please tell me your MAC!"</b> Everyone hears it (broadcast), but only that friend raises a hand and answers you directly (unicast reply). You write the answer in a small notebook (ARP cache) so you do not need to shout again for a while.</p>`,
  explain: `<p><b>🟢 Why ARP exists.</b> IP addresses are for routing across networks, but on one Ethernet/Wi-Fi LAN frames are delivered by <b>MAC address</b> (48-bit hardware address like <code>aa:bb:cc:00:11:22</code>). Before sending an IP packet to a neighbour, a host must learn that neighbour's MAC. <b>ARP (Address Resolution Protocol)</b> does exactly that: IP -> MAC for the <i>same LAN only</i>.</p>
    <p><b>The exchange (4 beats):</b></p>
    <ol><li><b>Decide whom to ask.</b> Host A applies its mask to the destination. Same subnet -> ARP for the <i>destination itself</i>. Different subnet -> ARP for the <b>default gateway's</b> IP (the packet still carries the real destination IP; only the frame goes to the router's MAC).</li>
    <li><b>Check the ARP cache.</b> If the mapping is there, skip to sending.</li>
    <li><b>ARP Request</b> - broadcast to <code>ff:ff:ff:ff:ff:ff</code>: "Who has 192.168.1.20? Tell 192.168.1.10 (my MAC is ...)".</li>
    <li><b>ARP Reply</b> - only the owner answers, <i>unicast</i> back: "192.168.1.20 is at bb:bb:bb:00:00:02". A stores it in its cache with a timeout (seconds to minutes).</li></ol>
    ${H.table(['ARP packet field', 'Request example', 'Reply example'], [['Opcode', '1 (request)', '2 (reply)'], ['Sender MAC', 'aa:aa:aa:00:00:01', 'bb:bb:bb:00:00:02'], ['Sender IP', '192.168.1.10', '192.168.1.20'], ['Target MAC', '00:00:00:00:00:00 (unknown)', 'aa:aa:aa:00:00:01'], ['Target IP', '192.168.1.20', '192.168.1.10'], ['Ethernet dst', 'ff:ff:ff:ff:ff:ff', 'aa:aa:aa:00:00:01']])}
    <p><b>ARP cache</b> example (<code>arp -a</code>): <code>192.168.1.1 at cc:cc:cc:00:00:01 dynamic</code>. Entries age out (e.g. ~30 s to a few minutes) and are refreshed on use.</p>
    <p><b>The off-subnet case is the favourite interview twist.</b> Laptop 192.168.1.10/24 pings 8.8.8.8: not in my subnet -> ARP for the gateway 192.168.1.1 -> frame: dst MAC = <i>router's MAC</i>, dst IP = <i>8.8.8.8</i>. Each next router repeats this on its own LAN; the destination IP never changes but the MACs change at every hop.</p>
    <p><b>Related ARP tricks:</b> <b>Gratuitous ARP</b> - a host announces its own IP/MAC (after boot, failover, or to detect duplicate IPs). <b>Proxy ARP</b> - a router answers for hosts behind it. <b>ARP spoofing</b> - an attacker answers "that IP is at MY MAC" to intercept traffic (man-in-the-middle). IPv6 has no ARP: <b>Neighbor Discovery (ICMPv6)</b> does the job.</p>`,
  clues: ['"How does a host find the MAC for an IP?" - ARP', '"ARP request is broadcast, reply is unicast"', '"Why does the packet go to the gateway&rsquo;s MAC but keep the server&rsquo;s IP?"', '"Host pings a different subnet - what does it ARP for?" - the default gateway', '"ARP spoofing / poisoning / man-in-the-middle" - Dynamic ARP Inspection', '"ARP works only inside a broadcast domain"', '"Gratuitous ARP" - announce or duplicate-IP check'],
  code: [{ lang: 'python', run: true, title: 'Build and parse a real ARP packet (struct)', code: `import struct

def mac_bytes(m):
    return bytes(int(x, 16) for x in m.split(":"))

def ip_bytes(ip):
    return bytes(int(x) for x in ip.split("."))

def build_arp(op, smac, sip, tmac, tip):
    # 28-byte ARP payload for Ethernet + IPv4
    return struct.pack("!HHBBH6s4s6s4s",
                       1,           # hardware type: Ethernet
                       0x0800,      # protocol type: IPv4
                       6, 4,        # hardware size (MAC), protocol size (IP)
                       op,          # 1 = request, 2 = reply
                       mac_bytes(smac), ip_bytes(sip), mac_bytes(tmac), ip_bytes(tip))

def ethernet(dst, src, payload):
    return mac_bytes(dst) + mac_bytes(src) + struct.pack("!H", 0x0806) + payload   # EtherType 0x0806 = ARP

def parse_arp(p):
    htype, ptype, hl, pl, op, smac, sip, tmac, tip = struct.unpack("!HHBBH6s4s6s4s", p)
    mac = lambda b: ":".join("%02x" % x for x in b)
    ip = lambda b: ".".join(str(x) for x in b)
    return {"op": {1: "request", 2: "reply"}[op], "sender": (mac(smac), ip(sip)), "target": (mac(tmac), ip(tip))}

A_MAC, A_IP = "aa:aa:aa:00:00:01", "192.168.1.10"
B_MAC, B_IP = "bb:bb:bb:00:00:02", "192.168.1.20"

req = build_arp(1, A_MAC, A_IP, "00:00:00:00:00:00", B_IP)
frame = ethernet("ff:ff:ff:ff:ff:ff", A_MAC, req)
print("request frame (%d bytes):" % len(frame), frame.hex())
print(parse_arp(req))

rep = build_arp(2, B_MAC, B_IP, A_MAC, A_IP)
print("reply payload:", rep.hex())
print(parse_arp(rep))

cache = {}
r = parse_arp(rep)
cache[r["sender"][1]] = r["sender"][0]      # learn: IP -> MAC
print("A's ARP cache:", cache)` },
  `#include <arpa/inet.h>
// The 28-byte ARP payload as a packed struct (what the kernel really sends).
#pragma pack(push, 1)
struct ArpPacket {
    uint16_t htype;      // 1 = Ethernet
    uint16_t ptype;      // 0x0800 = IPv4
    uint8_t  hlen;       // 6  (MAC length)
    uint8_t  plen;       // 4  (IPv4 length)
    uint16_t op;         // 1 request, 2 reply
    uint8_t  smac[6];
    uint8_t  sip[4];
    uint8_t  tmac[6];
    uint8_t  tip[4];
};
#pragma pack(pop)

int main() {
    ArpPacket p{};
    p.htype = htons(1); p.ptype = htons(0x0800); p.hlen = 6; p.plen = 4; p.op = htons(1);
    uint8_t mac[6] = {0xaa, 0xaa, 0xaa, 0x00, 0x00, 0x01};
    memcpy(p.smac, mac, 6);
    inet_pton(AF_INET, "192.168.1.10", p.sip);    // sender IP (already network order)
    inet_pton(AF_INET, "192.168.1.20", p.tip);    // who-has this?
    // target MAC stays all zeros: that is the question being asked
    cout << "sizeof(ArpPacket) = " << sizeof(ArpPacket) << " bytes" << endl;
    const uint8_t* raw = reinterpret_cast<const uint8_t*>(&p);
    for (size_t i = 0; i < sizeof p; i++) printf("%02x", raw[i]);
    cout << endl;
    return 0;
}`,
  { lang: 'bash', check: false, title: 'Watch ARP on a real machine', code: `arp -a                    # show the ARP cache (IP -> MAC)
ip neigh show             # Linux: same thing with states REACHABLE/STALE/FAILED
ip neigh flush all        # empty the cache (needs root)
sudo arping -I eth0 192.168.1.20      # send ARP requests like ping
sudo tcpdump -n -e arp    # capture ARP frames: "who-has ... tell ..." / "is-at ..."` }],
  codeTitle: ['Python: build and parse ARP', 'C++: ARP packet struct', 'ARP commands'],
  viz: {
    title: 'ARP request and reply on a LAN',
    input: '192.168.1.10/24 -> 192.168.1.20',
    inputLabel: 'my IP/prefix -> destination IP (try 8.8.8.8)',
    gen: function (input) {
      var parts = String(input).split('->');
      if (parts.length !== 2) throw new Error('Format: 192.168.1.10/24 -> 192.168.1.20');
      var me = parseCidr(parts[0]), dst = p2n(parts[1]), m = maskOf(me.p), net = (me.ip & m) >>> 0;
      var gw = net + 1, same = inNet(dst, net, me.p);
      if (me.p > 29) throw new Error('Use a prefix of /29 or shorter so the LAN has room for a gateway');
      var tip = same ? dst : gw, toGw = !same || tip === gw;
      var nodes = [
        { id: 'A', label: 'Host A ' + n2p(me.ip), x: 14, y: 30, shape: 'box', w: 22 },
        { id: 'SW', label: 'Switch', x: 50, y: 30, shape: 'box', w: 14 },
        { id: 'T', label: (toGw ? 'Gateway ' : 'Host ') + n2p(tip), x: 86, y: 10, shape: 'box', w: 24 },
        { id: 'O', label: 'Host C .99', x: 86, y: 30, shape: 'box', w: 20 },
        { id: 'P', label: 'Printer .50', x: 86, y: 50, shape: 'box', w: 20 }];
      var edges = [['A', 'SW'], ['SW', 'T'], ['SW', 'O'], ['SW', 'P']];
      function g(ehl, hl, tags) { return { type: 'graph', directed: false, height: 60, nodes: nodes, edges: edges, ehl: bothWays(ehl), hl: hl || {}, tags: tags || {} }; }
      var macA = 'aa:aa:aa:00:00:01', macT = 'cc:cc:cc:00:00:07', frames = [];
      frames.push({ narr: 'Host A (' + n2p(me.ip) + '/' + me.p + ') wants to send to <b>' + n2p(dst) + '</b>. First it ANDs the destination with its mask: network ' + n2p(net) + '/' + me.p + ' vs ' + n2p((dst & m) >>> 0) + ' -> ' + (same ? '<span class="c-g">same subnet</span>' : '<span class="c-r">different subnet</span>') + '.', parts: [
        { type: 'vars', vals: { 'my network': n2p(net) + '/' + me.p, 'dest AND mask': n2p((dst & m) >>> 0), 'same subnet?': same ? 'yes' : 'no' }, hl: { 'same subnet?': same ? 'ok' : 'bad' } }, g({}, { A: 'cur' })] });
      frames.push({ narr: same ? 'Same subnet -> A needs the MAC of <b>' + n2p(tip) + '</b> itself. The ARP cache is empty, so it must ask.' : 'Different subnet -> the packet must go through the <b>default gateway ' + n2p(gw) + '</b> (assumed first address). A needs the <b>gateway\'s MAC</b>, not the MAC of ' + n2p(dst) + ' (which is not even on this LAN). Cache is empty.', parts: [
        { type: 'table', label: 'A\'s ARP cache', columns: ['IP', 'MAC', 'age'], rows: [['(empty)', '-', '-']] }, g({}, { A: 'cur', T: 'win' })] });
      frames.push({ narr: '<b>ARP Request</b>, broadcast: "Who has <b>' + n2p(tip) + '</b>? Tell ' + n2p(me.ip) + '". Ethernet dst = ff:ff:ff:ff:ff:ff.', parts: [
        { type: 'table', label: 'ARP request frame', columns: ['Eth dst', 'Eth src', 'Opcode', 'Sender', 'Target'], rows: [['ff:ff:ff:ff:ff:ff', macA, '1 (request)', n2p(me.ip) + ' / ' + macA, n2p(tip) + ' / 00:00:00:00:00:00']] }, g({ 'A-SW': 'ok' }, { A: 'cur' })] });
      frames.push({ narr: 'The switch <b>floods</b> a broadcast out of every other port; it also learns that ' + macA + ' lives behind port 1. Everybody receives it, but only <b>' + n2p(tip) + '</b> recognises its own IP; the others silently ignore it.', parts: [
        { type: 'queue', label: 'who hears the broadcast', items: ['Gateway/Target ' + n2p(tip) + ': MATCH', 'Host C: ignore', 'Printer: ignore'], hl: { 0: 'ok', 1: 'done', 2: 'done' }, frontLabel: 'first', backLabel: 'last' }, g({ 'SW-T': 'ok', 'SW-O': 'bad', 'SW-P': 'bad' }, { SW: 'cur' }, { O: 'ignores', P: 'ignores', T: 'MATCH' })] });
      frames.push({ narr: '<b>ARP Reply</b>, unicast straight back: "' + n2p(tip) + ' is at <b>' + macT + '</b>". Only A receives it (the switch already knows A\'s port).', parts: [
        { type: 'table', label: 'ARP reply frame', columns: ['Eth dst', 'Eth src', 'Opcode', 'Sender', 'Target'], rows: [[macA, macT, '2 (reply)', n2p(tip) + ' / ' + macT, n2p(me.ip) + ' / ' + macA]] }, g({ 'T-SW': 'ok', 'SW-A': 'ok' }, { T: 'win' })] });
      frames.push({ narr: 'A stores the answer in its <b>ARP cache</b> (it will age out in a few minutes). The target also learned A\'s MAC from the request, so it will not need to ask back.', parts: [
        { type: 'table', label: 'A\'s ARP cache', columns: ['IP', 'MAC', 'age'], rows: [[n2p(tip), macT, '0 s']], hl: { 0: 'ok' } }, g({}, { A: 'cur' })] });
      frames.push({ narr: 'Now the real packet is sent. Ethernet dst = <b>' + macT + '</b> (' + (toGw ? 'the router' : 'the host') + '), IP dst = <b>' + n2p(dst) + '</b>' + (toGw ? ' - the IP stays the final destination, only the frame is addressed to the gateway.' : '.'), parts: [
        { type: 'table', label: 'Frame sent after ARP', columns: ['Layer', 'Source', 'Destination'], rows: [['Ethernet (L2)', macA, macT], ['IP (L3)', n2p(me.ip), n2p(dst)]], hl: { 0: 'sel', 1: 'win' } }, g({ 'A-SW': 'ok', 'SW-T': 'ok' }, { A: 'cur', T: 'win' })] });
      return frames;
    }
  },
  examples: [
    { title: 'Laptop pings a printer in the same subnet', html: `<p>192.168.1.10/24 -> 192.168.1.50. AND with mask: same /24 -> ARP request for 192.168.1.50 -> reply -> ICMP echo frame goes directly to the printer's MAC. 2 ARP frames + the ping frames.</p>` },
    { title: 'Laptop opens google.com (off-subnet)', html: `${H.table(['Step', 'What happens'], [['1', 'Dest 142.250.x.x is not in 192.168.1.0/24'], ['2', 'ARP who-has <b>192.168.1.1</b> (the gateway) - NOT who-has 142.250.x.x'], ['3', 'Reply: 192.168.1.1 is-at cc:cc:cc:00:00:01'], ['4', 'Frame: dst MAC = router, dst IP = 142.250.x.x'], ['5', 'The router repeats the lookup on its next hop LAN']])}` },
    { title: 'ARP spoofing in one picture', html: `<p>Attacker M sends unsolicited replies: "192.168.1.1 is at M's MAC" to victims. Their caches now point the gateway IP at M; M forwards the traffic onward and reads it. Defences: <b>Dynamic ARP Inspection</b> on managed switches (checks against a DHCP-snooping table), static entries for critical hosts, port security, and above all <b>TLS</b>, so a sniffer sees nothing useful.</p>` },
    { title: 'Gratuitous ARP for failover', html: `<p>Two routers share a virtual IP (VRRP/HSRP). When the backup takes over it sends a <b>gratuitous ARP</b>: "192.168.1.1 is at MY MAC", so every host and switch updates immediately instead of waiting for cache timeout.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> ARP sits between layers 2 and 3. The Ethernet frame has EtherType <b>0x0806</b>; the ARP payload is 28 bytes (hardware type, protocol type, lengths, opcode, sender MAC/IP, target MAC/IP). Because each frame is padded to Ethernet's 60-byte minimum, you see "padding" in captures.</p>
    <p><b>Cache states (Linux neighbour table).</b> INCOMPLETE (request sent), REACHABLE (confirmed recently, ~30 s base), STALE (unused but kept; reconfirmed on next use), DELAY/PROBE (unicast re-check), FAILED. Packets waiting for an unresolved ARP are queued (a small number) and dropped if no reply arrives - that is why the <b>first ping is sometimes slower or lost</b>.</p>
    <p><b>Scale limits.</b> ARP is a broadcast, so a very large flat LAN (thousands of hosts) wastes bandwidth and CPU, and switch MAC tables overflow. This is why we split networks with routers/VLANs, and why large data-center fabrics use layer-3 to the top-of-rack or EVPN with ARP suppression. Cloud networks (AWS, GCP) do not actually flood ARP - the hypervisor's virtual switch answers it from its own mapping.</p>
    <p><b>Security notes.</b> ARP has no authentication; anyone can claim any IP. Duplicate-IP detection uses ARP probes (source IP 0.0.0.0). In IPv6, <b>SEND</b> (secured ND) exists but is rarely deployed; RA-guard and DHCP snooping are used instead. <b>MAC flooding</b> attacks fill the switch table so it falls back to hubbing.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Packet analysis assistants can read a <code>tcpdump</code> / Wireshark capture and tell you "this host sent 4000 ARP who-has requests per second - a scan or a loop". AI-driven anomaly detection flags ARP spoofing (one IP suddenly changing MAC) in network monitoring.</p>
    <p><b>Use AI as a partner:</b> paste an ARP capture and ask "which host owns which IP and is anything duplicated?" Ask for a diagram of an off-subnet ping and compare with the visualizer. <b>Where AI goes wrong:</b> it often says "the host ARPs for the destination server" even when the server is off-subnet (it ARPs for the gateway), or claims ARP replies are broadcast, or says IPv6 uses ARP. <b>What you must own:</b> the on-link vs off-link decision, and the fact that IPs stay end-to-end while MACs change every hop - the key to debugging "can ping the router but not the internet" problems.</p>`,
  problems: [{
    title: 'Trace the ARP traffic for an off-subnet ping (guided)', level: 'Medium', tags: ['arp', 'gateway'], companies: ['Cisco', 'Microsoft'],
    statement: `<p>Host A is <code>192.168.1.10/24</code> (MAC A), gateway <code>192.168.1.1</code> (MAC G), and A has an empty ARP cache. A pings <code>10.5.5.5</code>. List every ARP frame A sends/receives and give the Ethernet and IP source/destination of the first ICMP echo frame.</p>`,
    constraints: `Assume the router already knows the way to 10.5.5.5.`,
    example: `<p>${H.c('g', 'ARP: who-has 192.168.1.1')} then ${H.c('b', 'ICMP frame: Eth dst = G, IP dst = 10.5.5.5')}</p>`,
    brute: { why: `<p>Answering "A ARPs for 10.5.5.5" is the classic wrong answer: 10.5.5.5 is not reachable on A's LAN so nobody there would ever reply and the ping would fail forever.</p>` },
    mcq: { q: 'What destination MAC does the first ICMP frame carry?', options: ['MAC of 10.5.5.5', 'ff:ff:ff:ff:ff:ff', 'MAC of the default gateway', 'MAC of the switch'], answer: 2, explain: 'Off-subnet traffic is addressed at layer 2 to the gateway; the IP header holds the final destination.' },
    hints: [`<p>AND 10.5.5.5 with 255.255.255.0: is the result 192.168.1.0?</p>`, `<p>If not, the next hop is the default gateway. Whose MAC do you need?</p>`, `<p>Write 2 ARP frames (request + reply) and then the ICMP frame with both layers' addresses.</p>`],
    solution: {
      approach: `<p>10.5.5.5 AND /24 = 10.5.5.0 &ne; 192.168.1.0, so it is off-link: A must ARP for the gateway 192.168.1.1. Frame 1 (broadcast request): Eth src A, Eth dst ff:ff:ff:ff:ff:ff, "who-has 192.168.1.1 tell 192.168.1.10". Frame 2 (unicast reply): Eth src G, Eth dst A, "192.168.1.1 is-at G". Frame 3 (ICMP echo): Eth src A, Eth dst G, IP src 192.168.1.10, IP dst 10.5.5.5. A caches 192.168.1.1 -> G; later packets to ANY off-subnet host reuse that entry with no more ARP.</p>`,
      dry: { head: ['#', 'Frame', 'Eth src', 'Eth dst', 'Notes'], rows: [['1', 'ARP request', 'A', 'ff:ff:ff:ff:ff:ff', 'who-has 192.168.1.1 tell 192.168.1.10'], ['2', 'ARP reply', 'G', 'A', '192.168.1.1 is-at G'], ['3', 'ICMP echo', 'A', 'G', 'IP 192.168.1.10 -> 10.5.5.5'], ['4', 'cache', '-', '-', '192.168.1.1 = G (reused)']] },
      complexity: `<p>One broadcast + one unicast per cold cache entry.</p>`,
      followUps: ['What if the router has no ARP entry for A yet?', 'What changes if A uses a /16 mask instead?']
    }
  }]
});

// =====================================================================
// TOPIC 7 — DHCP
// =====================================================================
topics.push({
  title: 'DHCP: The DORA Handshake (Discover, Offer, Request, Ack)',
  analogy: `<p>You walk into a new office on day one with <b>no desk and no phone extension</b>. You shout "Is there someone who can give me a desk?" (Discover). The office manager walks over: "Desk 42 is free, extension 142, restroom is down the hall, you can keep it for a day" (Offer). You say "Great, I will take desk 42!" (Request) and the manager says "Done, it is yours" (Acknowledge). Before the day ends you ask "may I keep it another day?" (renewal).</p>`,
  explain: `<p><b>🟢 The idea.</b> Typing IP addresses by hand on every laptop and phone is impossible. <b>DHCP (Dynamic Host Configuration Protocol)</b> hands them out automatically. A new device has <b>no IP yet</b>, so it uses the placeholder source <code>0.0.0.0</code> and talks by <b>broadcast</b> on UDP: client port <b>68</b>, server port <b>67</b>.</p>
    ${H.table(['Step', 'Name', 'From -> To', 'Meaning'], [
      ['1', '<b>D</b>iscover', '0.0.0.0 -> 255.255.255.255 (broadcast)', '"Any DHCP server out there? My MAC is ..."'],
      ['2', '<b>O</b>ffer', 'server -> client (broadcast or unicast to MAC)', '"You may use 192.168.1.142, mask /24, gateway .1, DNS .1, lease 24 h"'],
      ['3', '<b>R</b>equest', '0.0.0.0 -> 255.255.255.255 (broadcast)', '"I accept 192.168.1.142 from server X" (broadcast so other servers withdraw their offers)'],
      ['4', '<b>A</b>cknowledge', 'server -> client', '"Confirmed. The lease starts now."']
    ])}
    <p>The ACK carries the full configuration (the <i>options</i>): <b>IP address, subnet mask (option 1), default gateway (3), DNS servers (6), lease time (51)</b>. That is everything a laptop needs: its address, which addresses are local (mask), where to send everything else (gateway) and how to resolve names (DNS).</p>
    <p><b>Laptop joining Wi-Fi - the whole story in order:</b></p>
    <ol><li>Wi-Fi association + WPA authentication (layer 2 link is up).</li>
    <li>DHCP DORA gives IP/mask/gateway/DNS.</li>
    <li>Laptop sends an <b>ARP probe/announcement</b> for its new IP (duplicate check).</li>
    <li>It <b>ARPs for the gateway</b> (192.168.1.1) to learn the router's MAC.</li>
    <li>It sends a <b>DNS query</b> (UDP 53) for the website, then opens TCP to the answer via the gateway.</li></ol>
    <p><b>Leases.</b> The address is only rented. At <b>T1 = 50%</b> of the lease the client unicasts a Request to the same server to renew. If that fails, at <b>T2 = 87.5%</b> it broadcasts to any server. If the lease expires, it must stop using the address and restart DORA. If no server answers at all, many OSes self-assign <code>169.254.x.x</code> (link-local / APIPA) - the famous "no internet" symptom.</p>
    <p><b>DHCP relay.</b> Broadcasts do not cross routers, so a router interface can be configured as a <b>relay agent</b> (<code>ip helper-address</code>) that forwards the client's broadcast as unicast to a central DHCP server and adds the giaddr field so the server knows which subnet pool to use.</p>`,
  clues: ['"Laptop connects to Wi-Fi - what happens before the first web page?"', '"DHCP uses UDP ports 67 and 68"', '"Why is the Discover a broadcast with source 0.0.0.0?"', '"DORA" - Discover, Offer, Request, Acknowledge', '"IP starts with 169.254" - DHCP failure', '"DHCP across routers" - relay agent / ip helper-address', '"Rogue DHCP server" - DHCP snooping on the switch', '"Lease time / renewal at 50%"'],
  code: [`// Parse the DHCP "options" field: a list of [code][length][data...] ending with 255.
// This is exactly how the client reads message type, mask, router, DNS and lease time out of an Offer/Ack.
int main() {
    vector<uint8_t> opts = {
        53, 1, 5,                       // option 53: DHCP message type = 5 (ACK)
        1, 4, 255, 255, 255, 0,         // option 1 : subnet mask
        3, 4, 192, 168, 1, 1,           // option 3 : router (default gateway)
        6, 4, 8, 8, 8, 8,               // option 6 : DNS server
        51, 4, 0, 1, 81, 128,           // option 51: lease time = 0x00015180 = 86400 s
        255                             // end
    };
    const char* typeName[] = {"?", "DISCOVER", "OFFER", "REQUEST", "DECLINE", "ACK", "NAK", "RELEASE"};
    size_t i = 0;
    while (i < opts.size() && opts[i] != 255) {
        uint8_t code = opts[i], len = opts[i + 1];
        const uint8_t* d = &opts[i + 2];
        if (code == 53) cout << "message type: " << typeName[d[0]] << endl;
        else if (code == 1 || code == 3 || code == 6)
            printf("option %d: %d.%d.%d.%d\\n", code, d[0], d[1], d[2], d[3]);
        else if (code == 51) {
            uint32_t secs = (uint32_t(d[0]) << 24) | (uint32_t(d[1]) << 16) | (uint32_t(d[2]) << 8) | d[3];
            cout << "lease: " << secs << " s = " << secs / 3600 << " h" << endl;
        }
        i += 2 + len;                   // jump over code, length byte and data
    }
    return 0;
}`, { lang: 'python', run: true, title: 'A tiny DHCP server pool + lease times (simulation)', code: `import ipaddress

class DhcpServer:
    def __init__(self, cidr, start, end, gateway, dns, lease=86400):
        self.net = ipaddress.ip_network(cidr)
        self.pool = [ipaddress.ip_address(x) for x in range(int(ipaddress.ip_address(start)), int(ipaddress.ip_address(end)) + 1)]
        self.gateway, self.dns, self.lease = gateway, dns, lease
        self.leases = {}                       # mac -> ip

    def discover(self, mac):
        # OFFER: reuse the old lease for this MAC, else the first free address
        if mac in self.leases:
            return self.leases[mac]
        used = set(self.leases.values())
        for ip in self.pool:
            if ip not in used:
                return ip
        return None                            # pool exhausted: no offer

    def request(self, mac, ip):
        # ACK or NAK
        if ip in self.leases.values() and self.leases.get(mac) != ip:
            return "NAK"
        self.leases[mac] = ip
        return {"type": "ACK", "ip": str(ip), "mask": str(self.net.netmask), "router": self.gateway, "dns": self.dns,
                "lease_s": self.lease, "T1_renew_s": self.lease // 2, "T2_rebind_s": self.lease * 7 // 8}

srv = DhcpServer("192.168.1.0/24", "192.168.1.100", "192.168.1.102", "192.168.1.1", "192.168.1.1")
for mac in ["aa:aa:aa:00:00:01", "bb:bb:bb:00:00:02", "aa:aa:aa:00:00:01", "cc:cc:cc:00:00:03", "dd:dd:dd:00:00:04"]:
    offer = srv.discover(mac)
    print(mac, "OFFER ->", offer)
    if offer:
        print("   ", srv.request(mac, offer))
    else:
        print("    pool exhausted - client falls back to 169.254.x.x")` },
  { lang: 'bash', check: false, title: 'DHCP on real machines', code: `# Linux: release/renew and view the lease
sudo dhclient -r eth0 && sudo dhclient -v eth0      # -v prints DISCOVER/OFFER/REQUEST/ACK
ip addr show eth0                                    # new address + "valid_lft" (lease time)
nmcli device show wlan0 | grep -E "IP4|DNS"          # NetworkManager view
# Windows
ipconfig /release  &  ipconfig /renew  &  ipconfig /all
# Watch the real packets
sudo tcpdump -n -i wlan0 port 67 or port 68` }],
  codeTitle: ['C++: parse DHCP options', 'Python: DHCP server simulation', 'DHCP commands'],
  viz: {
    title: 'DHCP DORA for a laptop joining Wi-Fi',
    input: 'aa:bb:cc:dd:ee:37',
    inputLabel: 'Laptop MAC address',
    gen: function (input) {
      var mac = String(input).trim().toLowerCase();
      if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac)) throw new Error('Use a MAC like aa:bb:cc:dd:ee:37');
      var last = parseInt(mac.slice(-2), 16), ip = '192.168.1.' + (100 + last % 100);
      var nodes = [{ id: 'C', label: 'Laptop ' + mac.slice(-8), x: 14, y: 30, shape: 'box', w: 24 }, { id: 'AP', label: 'Wi-Fi AP / switch', x: 50, y: 30, shape: 'box', w: 24 }, { id: 'S', label: 'DHCP server 192.168.1.1', x: 86, y: 30, shape: 'box', w: 26 }];
      var edges = [['C', 'AP'], ['AP', 'S']];
      var steps = ['Discover', 'Offer', 'Request', 'Ack'];
      function g(ehl, hl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: edges, ehl: bothWays(ehl), hl: hl || {}, tags: tags || {} }; }
      function q(n) { var h = {}; for (var i = 0; i < n; i++) h[i] = i === n - 1 ? 'cur' : 'ok'; return { type: 'queue', label: 'DORA progress', items: steps.slice(0, n), hl: h, frontLabel: 'first', backLabel: 'latest' }; }
      var frames = [];
      frames.push({ narr: 'The laptop has just joined the Wi-Fi (layer 2 link is up) but has <b>no IP address</b>: its interface shows <code>0.0.0.0</code>. It cannot ARP, ping or browse yet.', parts: [{ type: 'vars', vals: { 'laptop IP': '0.0.0.0', 'laptop MAC': mac, gateway: '?', DNS: '?' }, hl: { 'laptop IP': 'bad' } }, g({}, { C: 'cur' })] });
      frames.push({ narr: '<b>1. DISCOVER</b> - broadcast "is there a DHCP server?". Source 0.0.0.0:68 -> destination 255.255.255.255:67, Ethernet dst ff:ff:ff:ff:ff:ff, and the client\'s MAC (chaddr) so the server can recognise it.', parts: [q(1), { type: 'table', label: 'DISCOVER', columns: ['field', 'value'], rows: [['IP src -> dst', '0.0.0.0:68 -> 255.255.255.255:67'], ['Eth dst', 'ff:ff:ff:ff:ff:ff'], ['client MAC (chaddr)', mac], ['options', '53=Discover, 55=parameter request list']] }, g({ 'C-AP': 'ok', 'AP-S': 'ok' }, { C: 'cur' })] });
      frames.push({ narr: '<b>2. OFFER</b> - the server picks a free address from its pool and offers it, with the other settings and a lease time. It is addressed to the client\'s MAC because the client still has no IP.', parts: [q(2), { type: 'table', label: 'OFFER', columns: ['field', 'value'], rows: [['your IP (yiaddr)', ip], ['subnet mask', '255.255.255.0'], ['router', '192.168.1.1'], ['DNS', '192.168.1.1'], ['lease time', '86400 s (24 h)'], ['server id', '192.168.1.1']], hl: { 0: 'sel' } }, g({ 'S-AP': 'ok', 'AP-C': 'ok' }, { S: 'cur' })] });
      frames.push({ narr: '<b>3. REQUEST</b> - the client picks this offer and says so by <b>broadcast</b> ("I want ' + ip + ' from server 192.168.1.1"). Broadcasting lets any other DHCP server see that its own offer was not chosen and release that address.', parts: [q(3), { type: 'table', label: 'REQUEST', columns: ['field', 'value'], rows: [['IP src -> dst', '0.0.0.0:68 -> 255.255.255.255:67'], ['requested IP (opt 50)', ip], ['server id (opt 54)', '192.168.1.1']] }, g({ 'C-AP': 'ok', 'AP-S': 'ok' }, { C: 'cur' })] });
      frames.push({ narr: '<b>4. ACK</b> - the server records the lease (MAC -> ' + ip + ') and confirms. Only now may the laptop use the address.', parts: [q(4), { type: 'map', label: 'server lease table', entries: [[mac, ip + '  (expires in 24h)']], hl: {} }, g({ 'S-AP': 'ok', 'AP-C': 'ok' }, { S: 'cur', C: 'win' })] });
      frames.push({ narr: 'The laptop applies the settings. Next it sends an <b>ARP probe</b> for ' + ip + ' (is anyone else using it?), then <b>ARPs for the gateway</b> 192.168.1.1 and finally asks <b>DNS</b> for the website - the first web page is a few milliseconds away.', parts: [{ type: 'vars', label: 'configured', vals: { 'laptop IP': ip + '/24', gateway: '192.168.1.1', DNS: '192.168.1.1', lease: '24 h' }, hl: { 'laptop IP': 'ok' } }, { type: 'queue', label: 'what happens next', items: ['ARP probe for ' + ip, 'ARP who-has 192.168.1.1', 'DNS query', 'TCP SYN to the web server'], hl: { 0: 'cur' }, frontLabel: 'now', backLabel: 'later' }, g({}, { C: 'win' })] });
      frames.push({ narr: 'Renewal timers: at <b>T1 = 12 h (50%)</b> the laptop unicasts a REQUEST to renew; at <b>T2 = 21 h (87.5%)</b> it broadcasts to any server; at 24 h the lease expires and DORA restarts. If no server ever answers: fallback to 169.254.x.x.', parts: [{ type: 'table', label: 'Lease timeline', columns: ['time', 'event'], rows: [['0 h', 'ACK received, lease starts'], ['12 h (T1)', 'unicast renew to same server'], ['21 h (T2)', 'broadcast renew to any server'], ['24 h', 'expire - restart DISCOVER']], hl: { 1: 'win' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Why Request is broadcast even though the client chose a server', html: `<p>Two DHCP servers (A and B) both answered the Discover. The client picks A. The broadcast REQUEST names A in the server-identifier option. B sees it, realises it lost, and returns its offered address to the pool. If the REQUEST were unicast to A, B would hold the address in limbo until a timeout.</p>` },
    { title: '169.254.x.x on a laptop', html: `<p>No DHCP answer (server down, VLAN wrong, Wi-Fi isolation, pool exhausted) -> the OS picks a random 169.254.x.x/16, ARP-probes it, and uses it. Devices on the same LAN can still talk to each other, but nothing reaches the router or the internet because there is no gateway.</p>` },
    { title: 'DHCP pool and reservations', html: `${H.table(['Item', 'Typical value'], [['Subnet', '192.168.1.0/24'], ['Router / DNS', '192.168.1.1'], ['Static (servers, printers)', '.2 - .99'], ['Dynamic pool', '.100 - .199'], ['Reservation', 'printer MAC -> always .50 (so its address never changes)'], ['Lease', '24 h at home, 1-8 h in cafes/campus (short, high turnover)']])}` },
    { title: 'DHCP packet size and format', html: `<p>DHCP descends from BOOTP: fixed header (op, htype, hlen, xid, secs, flags, ciaddr, yiaddr, siaddr, giaddr, chaddr, ...) followed by magic cookie 99.130.83.99 and options. The <b>xid</b> (transaction ID) lets the client match replies to its request.</p>` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> A DHCP message is carried in UDP, so there is no connection and reliability is done by retransmission with back-off. Client state machine: INIT -> SELECTING (collect offers) -> REQUESTING -> BOUND -> RENEWING (T1) -> REBINDING (T2) -> INIT. A server may answer a Request with <b>NAK</b> (e.g. the client moved to another network and its remembered address is wrong); the client then restarts from DISCOVER. Clients often skip D+O on reboot and send a Request for the old address (<b>INIT-REBOOT</b>) - two messages instead of four.</p>
    <p><b>Fast Wi-Fi roaming tricks.</b> Rapid commit (RFC 4039) allows Discover -> Ack in two messages; modern phones randomise their MAC per network, so a lease tied to a MAC no longer identifies "this phone" across networks.</p>
    <p><b>Security.</b> DHCP is unauthenticated. A <b>rogue DHCP server</b> can hand out an attacker's gateway/DNS (man-in-the-middle); <b>DHCP starvation</b> exhausts the pool with fake MACs. Defences: <b>DHCP snooping</b> (switch trusts DHCP replies only from designated ports and builds an IP-MAC-port binding table that Dynamic ARP Inspection and IP Source Guard reuse), port security, short leases in high-churn networks.</p>
    <p><b>IPv6.</b> Hosts usually need no DHCP: Router Advertisements + SLAAC provide the prefix. <b>DHCPv6</b> (UDP 546/547, multicast ff02::1:2) adds DNS or stateful addressing. <b>Cloud:</b> VPC DHCP option sets (AWS) deliver DNS and domain; the instance's private IP is fixed by the hypervisor, and the DHCP server is at the VPC's reserved .1/.2 address.</p>
    <p><b>Containers/Kubernetes</b> do not use DHCP; the CNI plugin assigns pod IPs from a per-node CIDR.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> AIOps tools now watch DHCP logs and warn "pool 92% used - 14 phones renewing every minute" or "unknown device with a new MAC joined the VLAN". Zero-trust network access uses DHCP fingerprinting (option 55 order, hostname) to guess device types.</p>
    <p><b>Use AI as a partner:</b> paste a <code>tcpdump</code> or <code>dhclient -v</code> log and ask "at which step of DORA did this fail?" Missing OFFER = relay/VLAN/firewall; OFFER but no ACK = NAK or race; ACK then immediate DECLINE = duplicate IP. <b>Where AI goes wrong:</b> it says DHCP uses TCP, mixes up ports 67/68, forgets that the Request is a broadcast, or claims the client "has" 0.0.0.0 as a real address. <b>What you must own:</b> the DORA order, what each message contains, and the debugging reflex "169.254 means DHCP never answered".</p>`,
  problems: []
});

// =====================================================================
// TOPIC 8 — NAT / PAT
// =====================================================================
function parseSock(t) {
  var m = String(t).trim().match(/^(\d+\.\d+\.\d+\.\d+):(\d{1,5})$/);
  if (!m) throw new Error('Flow format: 192.168.1.10:51000>93.184.216.34:443 (separate flows with ;)');
  p2n(m[1]);
  if (+m[2] < 1 || +m[2] > 65535) throw new Error('Ports are 1-65535');
  return { ip: m[1], port: +m[2], text: m[1] + ':' + m[2] };
}

topics.push({
  title: 'NAT/PAT, Private Ranges and Why NAT Breaks Inbound Connections',
  analogy: `<p>A big office building has <b>one public phone number</b> but 200 employees. Every employee has an internal extension (private IP). When Asha (ext. 12) calls out, the <b>receptionist</b> (NAT router) dials from the main number and writes in a notebook: "line 5 = ext. 12". When the reply comes back on line 5, she transfers it to ext. 12. But if a stranger phones the main number asking for "someone", she has no notebook entry and no idea who to connect - the call dies. That is exactly why <b>NAT blocks unsolicited inbound connections</b>.</p>`,
  explain: `<p><b>🟢 Private addresses.</b> Three ranges are reserved for use inside homes and companies (RFC 1918). Routers on the internet <b>refuse to forward</b> them, so anyone can reuse them:</p>
    ${H.table(['Range', 'CIDR', 'Addresses', 'Typical use'], [['10.0.0.0 - 10.255.255.255', '10.0.0.0/8', '16,777,216', 'big companies, cloud VPCs'], ['172.16.0.0 - 172.31.255.255', '172.16.0.0/12', '1,048,576', 'medium networks, Docker default 172.17/16'], ['192.168.0.0 - 192.168.255.255', '192.168.0.0/16', '65,536', 'home Wi-Fi routers']])}
    <p><b>NAT (Network Address Translation)</b> lets private hosts reach the internet through a router that owns a public IP. The router <b>rewrites the source address</b> of each outgoing packet and remembers the mapping so replies can be rewritten back.</p>
    <p><b>Kinds of NAT:</b></p>
    ${H.table(['Type', 'Mapping', 'Use'], [['Static NAT', '1 private IP <-> 1 public IP (fixed)', 'publish one internal server'], ['Dynamic NAT', 'private IP -> any free IP from a public pool', 'rare today'], ['<b>PAT / NAPT</b> ("NAT overload")', 'many private IP:port -> ONE public IP : different ports', '<b>what every home router does</b>']])}
    <p><b>PAT in action.</b> Public IP of the router: <code>203.0.113.5</code>. Two laptops both use source port 51000 to reach the same server:</p>
    ${H.table(['Inside (private)', 'Outside (public) after PAT', 'Remote'], [['192.168.1.10:51000', '203.0.113.5:51000', '93.184.216.34:443'], ['192.168.1.11:51000', '203.0.113.5:<b>40000</b> (clash -> new port)', '93.184.216.34:443'], ['192.168.1.10:51001', '203.0.113.5:51001', '1.1.1.1:53']])}
    <p>The server sees only <code>203.0.113.5</code> with different ports. A reply to <code>203.0.113.5:40000</code> is looked up in the table, the destination is rewritten to <code>192.168.1.11:51000</code> and delivered. The NAT table is the <b>port number as an index into the private network</b>. Capacity: ~65k ports per public IP (per destination), which is why large ISPs use pools.</p>
    <p><b>Why NAT breaks inbound connections.</b> The mapping is created <i>only by an outgoing packet</i>. A connection that starts from outside arrives at <code>203.0.113.5:22</code> but there is no entry saying which inside host owns port 22 -> the router <b>drops it</b>. Side effects: (1) it works like a crude firewall (accidentally!); (2) you cannot host a server or do peer-to-peer without help; (3) two users behind NAT cannot connect directly (video calls, games, WebRTC need tricks).</p>
    <p><b>Workarounds:</b> <b>port forwarding</b> / static DNAT rule ("outside :443 -> 192.168.1.20:443"), UPnP/NAT-PMP (apps ask the router to open a port), <b>STUN + hole punching</b> (both sides send outbound first so each NAT creates a mapping), <b>TURN</b> relays (traffic bounces through a public server), reverse tunnels (ngrok, Cloudflare Tunnel, SSH -R), and the real fix: <b>IPv6</b> where every device has a global address (the firewall still blocks unsolicited traffic, but by policy, not by accident).</p>`,
  clues: ['"Many devices share one public IP - how?" - PAT / NAT overload', '"Why can&rsquo;t I host a server at home / reach a device behind NAT?"', '"Port forwarding" / "DNAT" / "static NAT"', '"Private ranges: 10/8, 172.16/12, 192.168/16"', '"Peer-to-peer, WebRTC, video call behind NAT" - STUN/TURN/ICE', '"Symmetric NAT" vs "full cone"', '"CGNAT" - your ISP does the NAT too (double NAT)', '"Does NAT change the TCP/UDP checksum?" - yes, recomputed'],
  code: [{ lang: 'python', run: true, title: 'PAT / NAT translation simulator', code: `class Nat:
    # A tiny PAT (NAPT) router: many inside sockets share one public IP.
    def __init__(self, public_ip, first_free=40000):
        self.public_ip = public_ip
        self.first_free = first_free
        self.out = {}      # (inside_ip, inside_port) -> public_port
        self.back = {}     # public_port -> (inside_ip, inside_port)

    def outbound(self, src_ip, src_port, dst_ip, dst_port):
        key = (src_ip, src_port)
        if key not in self.out:
            # Prefer to keep the original port ("port preservation"); otherwise take the next free one.
            port = src_port if src_port not in self.back else None
            if port is None:
                port = self.first_free
                while port in self.back:
                    port += 1
            self.out[key] = port
            self.back[port] = key
        pub = self.out[key]
        return (self.public_ip, pub, dst_ip, dst_port)

    def inbound(self, src_ip, src_port, dst_ip, dst_port):
        # Packet arriving from the internet to public_ip:dst_port
        if dst_ip != self.public_ip or dst_port not in self.back:
            return None                              # no mapping -> DROP
        in_ip, in_port = self.back[dst_port]
        return (src_ip, src_port, in_ip, in_port)    # destination rewritten back to the private host

nat = Nat("203.0.113.5")
flows = [("192.168.1.10", 51000, "93.184.216.34", 443),
         ("192.168.1.11", 51000, "93.184.216.34", 443),
         ("192.168.1.10", 51001, "1.1.1.1", 53),
         ("192.168.1.11", 51000, "1.1.1.1", 53)]       # same inside socket: reuses its mapping
print("%-22s %-20s %-22s" % ("INSIDE (private)", "OUTSIDE (public)", "REMOTE"))
for f in flows:
    pub_ip, pub_port, dip, dport = nat.outbound(*f)
    print("%-22s %-20s %-22s" % (f[0] + ":" + str(f[1]), pub_ip + ":" + str(pub_port), dip + ":" + str(dport)))

print("reply to :40000 ->", nat.inbound("93.184.216.34", 443, "203.0.113.5", 40000))
print("unsolicited ssh to :22 ->", nat.inbound("198.51.100.99", 4444, "203.0.113.5", 22))

# Port forwarding = a manually pre-created mapping, so inbound works
nat.back[8080] = ("192.168.1.20", 80)
print("after forwarding 8080->192.168.1.20:80 ->", nat.inbound("198.51.100.99", 4444, "203.0.113.5", 8080))` },
  `#include <arpa/inet.h>
// A PAT table in C++: key = inside "ip:port", value = public port.
struct Pat {
    string publicIp;
    map<string, int> out;      // "192.168.1.10:51000" -> 51000
    map<int, string> back;     // public port -> inside socket
    int nextFree = 40000;
    int translate(const string& inside, int port) {
        string key = inside + ":" + to_string(port);
        auto it = out.find(key);
        if (it != out.end()) return it->second;       // existing flow: reuse the mapping
        int pub = back.count(port) ? -1 : port;       // try to preserve the port
        if (pub == -1) { while (back.count(nextFree)) nextFree++; pub = nextFree; }
        out[key] = pub;
        back[pub] = key;
        return pub;
    }
    string reverse(int pubPort) const {               // inbound lookup
        auto it = back.find(pubPort);
        return it == back.end() ? string("DROP (no mapping)") : it->second;
    }
};
// RFC 1918 check with inet_pton + mask arithmetic
static bool isPrivate(const char* s) {
    in_addr a;
    if (inet_pton(AF_INET, s, &a) != 1) return false;
    uint32_t ip = ntohl(a.s_addr);
    return (ip >> 24) == 10                      // 10.0.0.0/8
        || (ip >> 20) == 0xAC1                   // 172.16.0.0/12  (172.16 = 0xAC10, top 12 bits = 0xAC1)
        || (ip >> 16) == 0xC0A8;                 // 192.168.0.0/16
}
int main() {
    Pat nat; nat.publicIp = "203.0.113.5";
    cout << nat.translate("192.168.1.10", 51000) << endl;   // 51000
    cout << nat.translate("192.168.1.11", 51000) << endl;   // 40000 (clash)
    cout << nat.translate("192.168.1.10", 51000) << endl;   // 51000 again (same flow)
    cout << nat.reverse(40000) << endl;                     // 192.168.1.11:51000
    cout << nat.reverse(22) << endl;                        // DROP
    for (const char* s : {"10.2.3.4", "172.16.0.1", "172.32.0.1", "192.168.5.5", "8.8.8.8"})
        cout << s << (isPrivate(s) ? " private" : " public") << endl;
    return 0;
}`,
  { lang: 'bash', check: false, title: 'NAT rules on Linux (iptables / nftables world)', code: `# Source NAT (PAT): everything leaving eth0 gets the router's public address
sudo iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth0 -j MASQUERADE
# Port forwarding (DNAT): outside :8080 -> inside web server
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.20:80
# Look at the live NAT table (connection tracking)
sudo conntrack -L | head
# Must be on for a Linux box to route at all
sysctl net.ipv4.ip_forward` }],
  codeTitle: ['Python: PAT simulator', 'C++: PAT table + private-range check', 'Linux NAT rules'],
  viz: {
    title: 'PAT translation table: rewrites, collisions and inbound drops',
    input: '192.168.1.10:51000>93.184.216.34:443; 192.168.1.11:51000>93.184.216.34:443; 192.168.1.10:51001>1.1.1.1:53',
    inputLabel: 'Outbound flows: privIP:port>remoteIP:port ; ...',
    gen: function (input) {
      var flows = String(input).split(';').map(function (f) {
        var t = f.trim().split('>'); if (t.length !== 2) throw new Error('Flow format: 192.168.1.10:51000>93.184.216.34:443');
        return { src: parseSock(t[0]), dst: parseSock(t[1]) };
      });
      if (flows.length < 1 || flows.length > 8) throw new Error('Use 1 to 8 flows');
      var PUB = '203.0.113.5', out = {}, back = {}, rows = [], frames = [];
      var nodes = [{ id: 'L', label: 'LAN hosts (private)', x: 14, y: 30, shape: 'box', w: 26 }, { id: 'N', label: 'NAT router ' + PUB, x: 50, y: 30, shape: 'box', w: 30 }, { id: 'I', label: 'Internet servers', x: 86, y: 30, shape: 'box', w: 24 }];
      function g(ehl, hl) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['L', 'N'], ['N', 'I']], ehl: bothWays(ehl), hl: hl || {} }; }
      function tbl(hl) { return { type: 'table', label: 'NAT (PAT) translation table', columns: ['Inside (private)', 'Outside (public)', 'Remote'], rows: rows.length ? rows.slice() : [['(empty)', '-', '-']], hl: hl || {} }; }
      frames.push({ narr: 'The NAT router owns one public IP, <b>' + PUB + '</b>. Its translation table is empty. Hosts inside use private addresses that cannot be routed on the internet.', parts: [tbl(), g({}, { N: 'cur' })] });
      var next = 40000;
      flows.forEach(function (f, i) {
        var key = f.src.text, reuse = out.hasOwnProperty(key), note;
        if (!reuse) {
          var port = f.src.port;
          if (back[port]) { while (back[next]) next++; port = next; note = 'Port <b>' + f.src.port + '</b> is already used by another inside host -> the router picks a free public port <b>' + port + '</b> (that is the "P" in PAT).'; }
          else note = 'New flow. Public port ' + port + ' is free, so the router keeps (preserves) the same port number.';
          out[key] = port; back[port] = key;
        } else note = 'The same inside socket already has a mapping -> it is <b>reused</b> (endpoint-independent mapping).';
        var pub = out[key];
        if (!reuse) rows.push([key, PUB + ':' + pub, f.dst.text]);
        var hl = {}; hl[rows.length - 1] = 'win';
        frames.push({ narr: 'Flow ' + (i + 1) + ': <b>' + key + '</b> sends to ' + f.dst.text + '. ' + note + ' Source is rewritten <b>' + key + ' -> ' + PUB + ':' + pub + '</b>.', parts: [
          { type: 'table', label: 'Packet before and after NAT', columns: ['', 'Source', 'Destination'], rows: [['leaves the LAN', key, f.dst.text], ['leaves the router', PUB + ':' + pub, f.dst.text]], hl: { 1: 'ok' } }, tbl(hl), g({ 'L-N': 'ok', 'N-I': 'ok' }, { N: 'cur' })] });
      });
      var first = flows[0], pub0 = out[first.src.text];
      var h0 = {}; h0[0] = 'win';
      frames.push({ narr: 'The server replies to <b>' + PUB + ':' + pub0 + '</b>. The router looks up public port ' + pub0 + ' in the table and rewrites the destination back to <b>' + first.src.text + '</b>. This works only because an <i>outgoing</i> packet created the mapping.', parts: [
        { type: 'table', label: 'Reply packet', columns: ['', 'Source', 'Destination'], rows: [['arrives from internet', first.dst.text, PUB + ':' + pub0], ['delivered to LAN', first.dst.text, first.src.text]], hl: { 1: 'ok' } }, tbl(h0), g({ 'I-N': 'ok', 'N-L': 'ok' }, { N: 'cur' })] });
      var port2 = 22; while (back[port2]) port2++;
      frames.push({ narr: 'Now a stranger on the internet connects <b>first</b> to ' + PUB + ':' + port2 + '. No table row has public port ' + port2 + ', so the router does not know which inside host should get it -> <span class="c-r"><b>DROP</b></span>. This is why NAT breaks inbound connections; to host a server you add a static <b>port-forward</b> row by hand.', parts: [
        { type: 'table', label: 'Unsolicited inbound packet', columns: ['Source', 'Destination', 'Table lookup', 'Result'], rows: [['198.51.100.99:4444', PUB + ':' + port2, 'no match', 'DROPPED']], hl: { 0: 'bad' } }, tbl(), g({ 'I-N': 'bad' }, { N: 'bad' })] });
      return frames;
    }
  },
  examples: [
    { title: 'Fill a PAT table (home router)', html: `<p>Public IP 203.0.113.5. Laptop 192.168.1.10 opens two tabs (source ports 52001, 52002) to 142.250.1.1:443; phone 192.168.1.11 uses 52001 too.</p>${H.table(['Inside', 'Outside', 'Remote'], [['192.168.1.10:52001', '203.0.113.5:52001', '142.250.1.1:443'], ['192.168.1.10:52002', '203.0.113.5:52002', '142.250.1.1:443'], ['192.168.1.11:52001', '203.0.113.5:<b>40000</b>', '142.250.1.1:443']])}<p>Same remote server, same public IP - the server tells the three flows apart only by the public port.</p>` },
    { title: 'Port forwarding for a home web server', html: `<p>Rule: <code>203.0.113.5:8080 -> 192.168.1.20:80</code>. An outsider connecting to the public IP port 8080 hits a pre-made row, the destination is rewritten to the private server, and replies are rewritten back. Add a firewall rule too: forwarded ports are open to the whole internet.</p>` },
    { title: 'Two phones behind two NATs call each other (WebRTC)', html: `<p>Neither can connect first. Each asks a public <b>STUN server</b> "what public IP:port do you see for me?", they swap those via a signalling server, then both send packets at each other at the same moment. Each NAT sees an outgoing packet, creates a mapping, and the other side's packet now matches it -> direct path (<b>UDP hole punching</b>). With a <b>symmetric NAT</b> (new port per destination) this fails and the call falls back to a <b>TURN</b> relay.</p>` },
    { title: 'Which of these is private?', html: `${H.table(['Address', 'Private?', 'Why'], [['172.16.5.9', '<span class="c-g">yes</span>', '172.16-172.31'], ['172.32.0.1', '<span class="c-r">no</span>', 'outside /12'], ['192.169.1.1', '<span class="c-r">no</span>', 'only 192.168 is private'], ['10.255.255.254', '<span class="c-g">yes</span>', '10/8'], ['100.64.2.2', '<span class="c-r">no (CGNAT)</span>', 'shared space, not RFC 1918']])}` }
  ],
  deepDive: `<p><b>🟣 Internals.</b> NAT lives in the router's <b>connection-tracking</b> table (Linux <code>conntrack</code>). Each entry stores the 5-tuple in both directions, a state (NEW/ESTABLISHED), and a <b>timeout</b>: ~5 days for established TCP on some systems, but 30-120 seconds for UDP and ICMP. Apps send keep-alives so the mapping does not expire (a classic cause of "my VPN/game disconnects after 30 s of silence"). The router must also fix the <b>IP header checksum and the TCP/UDP checksum</b> (the pseudo-header includes addresses), and for ICMP errors it must rewrite the embedded packet.</p>
    <p><b>NAT behaviours (RFC 4787).</b> <i>Full cone</i>: once inside:port is mapped, anyone can send to the public port. <i>Restricted cone</i>: only IPs the host has contacted. <i>Port-restricted</i>: only IP+port contacted. <i>Symmetric</i>: a different public port for every destination - defeats hole punching. Home routers are usually port-restricted or full-cone.</p>
    <p><b>Protocols that hide addresses inside payloads</b> (active FTP, SIP/VoIP, some games) break unless the router runs an <b>ALG</b> (application-layer gateway) that rewrites the payload. Modern protocols avoid embedded addresses or use ICE.</p>
    <p><b>Scale.</b> One public IP gives ~64k simultaneous flows <i>per remote endpoint</i>. Busy offices and <b>CGNAT</b> (ISP shares one IPv4 among many homes, using 100.64.0.0/10 on the inside) use port-block allocation and logging (for legal traceability). Double NAT (home + CGNAT) makes port forwarding impossible without IPv6 or a tunnel. In cloud, a <b>NAT Gateway</b> gives private subnets outbound-only internet - and charges per GB.</p>
    <p><b>Security view.</b> NAT is not a firewall; it just happens to block unsolicited inbound. Malware inside still calls out. With IPv6 you write the firewall policy deliberately. <b>Kubernetes</b> uses NAT heavily (kube-proxy DNAT for Services, SNAT/masquerade for pod egress), and a full conntrack table is a known source of dropped packets.</p>`,
  aiEra: `<p><b>🤖 What AI changes.</b> Remote-work and AI developer tools rely on NAT traversal: local model servers are exposed with tunnels (ngrok, Cloudflare Tunnel, Tailscale), and agent/MCP servers on a laptop are unreachable from the cloud unless you open an outbound tunnel. AI-assisted config generators write iptables/nftables or cloud NAT rules for you.</p>
    <p><b>Use AI as a partner:</b> ask it to explain a <code>conntrack -L</code> dump, or to generate a port-forward plus the matching firewall rule, then <b>review it</b> - never paste a DNAT rule you cannot read. <b>Where AI goes wrong:</b> it says "NAT provides security" (it does not), exposes a service to 0.0.0.0/0 with a casual port-forward, forgets the reverse (SNAT/MASQUERADE) rule, or suggests NAT for IPv6 out of habit. <b>What you must own:</b> why inbound fails (no mapping), the table rewrite on both directions, and the safe alternatives (tunnels with auth, VPN, IPv6 + firewall) when someone asks "how do I reach my home server?".</p>`,
  problems: [{
    title: 'Fill the PAT translation table (guided)', level: 'Medium', tags: ['nat', 'pat', 'ports'], companies: ['Cisco', 'Amazon', 'Zscaler'],
    statement: `<p>A PAT router has public IP <code>198.51.100.7</code>. It preserves the source port when free, otherwise uses the next free port starting at 40000, and reuses the mapping for the same inside socket. Outbound packets arrive in this order:</p>${H.table(['#', 'Inside source', 'Destination'], [['1', '10.0.0.5:5000', '93.184.216.34:80'], ['2', '10.0.0.6:5000', '93.184.216.34:80'], ['3', '10.0.0.5:5001', '1.1.1.1:53'], ['4', '10.0.0.6:5000', '1.1.1.1:53']])}<p>Fill the table. Then say what happens to an unsolicited packet to <code>198.51.100.7:5000</code> from the internet (a) before flow 1 and (b) after flow 1 from host 203.0.113.9 (a random stranger).</p>`,
    constraints: `Endpoint-independent mapping (same inside socket -> same public port).`,
    example: `<p>${H.c('g', '10.0.0.5:5000 -> 198.51.100.7:5000')}, ${H.c('b', '10.0.0.6:5000 -> 198.51.100.7:40000')}</p>`,
    brute: { why: `<p>Assigning a fresh public port for every packet creates a new row each time and breaks existing connections (the replies come back on a port no longer mapped). Mappings must be per flow/socket, not per packet.</p>` },
    mcq: { q: 'Why does the second host get port 40000?', options: ['It is faster', 'Public port 5000 is already mapped to the first host', 'The server asked for it', 'Ports below 40000 are reserved'], answer: 1, explain: 'Two inside sockets cannot share one public port, so the clash forces a new port - that is Port Address Translation.' },
    hints: [`<p>Keep a map of used public ports. For each new inside socket, try its own source port first.</p>`, `<p>If the port is taken, scan up from 40000 for the first free port.</p>`, `<p>If the inside socket already has a row, reuse it - no new row. For the inbound questions ask: is there a row with that public port?</p>`],
    solution: {
      approach: `<p>Flow 1: 5000 is free -> 198.51.100.7:5000. Flow 2: inside socket 10.0.0.6:5000 is new but public 5000 is taken -> next free from 40000 = <b>40000</b>. Flow 3: 5001 free -> <b>5001</b>. Flow 4: 10.0.0.6:5000 already maps to 40000 -> <b>reuse 40000</b> (no new row). Inbound: (a) before flow 1 there is no row for public port 5000 -> dropped. (b) After flow 1 a row exists for 5000, but a strict (port-restricted) NAT also checks that the sender is the remote the host contacted (93.184.216.34:80); the stranger 203.0.113.9 does not match -> dropped; a full-cone NAT would let it through.</p>`,
      code: { lang: 'python', run: true, code: `used, table = {}, []
nxt = 40000
flows = [("10.0.0.5", 5000, "93.184.216.34:80"), ("10.0.0.6", 5000, "93.184.216.34:80"),
         ("10.0.0.5", 5001, "1.1.1.1:53"), ("10.0.0.6", 5000, "1.1.1.1:53")]
inside_map = {}
for ip, port, dst in flows:
    k = (ip, port)
    if k not in inside_map:
        pub = port
        if pub in used:
            while nxt in used:
                nxt += 1
            pub = nxt
        used[pub] = k
        inside_map[k] = pub
    table.append((ip + ":" + str(port), "198.51.100.7:" + str(inside_map[k]), dst))
for row in table:
    print(row)` },
      dry: { head: ['#', 'Inside socket', 'Own port free?', 'Public port', 'New row?'], rows: [['1', '10.0.0.5:5000', 'yes', '5000', 'yes'], ['2', '10.0.0.6:5000', 'no (5000 used)', '40000', 'yes'], ['3', '10.0.0.5:5001', 'yes', '5001', 'yes'], ['4', '10.0.0.6:5000', 'already mapped', '40000', '<span class="c-m">no, reuse</span>']] },
      complexity: `<p>O(1) per packet with hash maps; port scan worst case O(ports) only when the range is nearly full.</p>`,
      followUps: ['What happens when all 65k ports are used?', 'How would a symmetric NAT differ for flow 4?']
    }
  }]
});

// =====================================================================
// PRACTICE — Easy
// =====================================================================
practice.push({
  title: 'Usable hosts per prefix', level: 'Easy', tags: ['subnetting', 'hosts'], companies: ['TCS', 'Cisco'],
  statement: `<p>Give the number of usable hosts and the dotted mask for each prefix: /27, /28, /29, /30, /22, /16.</p>`,
  constraints: `Usable = total addresses minus network and broadcast.`,
  example: `${H.table(['Prefix', 'Host bits', 'Usable'], [['/27', '5', '2<sup>5</sup> - 2 = 30'], ['/28', '4', '14']])}`,
  brute: { why: `<p>Writing out all addresses of each block is silly; you only need the number of host bits h = 32 - prefix, then 2<sup>h</sup> - 2.</p>` },
  mcq: { q: 'How many usable hosts does a /29 give?', options: ['8', '6', '4', '2'], answer: 1, explain: '2^3 = 8 addresses, minus network and broadcast = 6.' },
  hints: [`<p>Host bits = 32 - prefix.</p>`, `<p>Total = 2<sup>host bits</sup>, usable = total - 2.</p>`, `<p>Mask: write the prefix as ones; the last non-255 octet = 256 - block size.</p>`],
  solution: {
    approach: `<p>/27: 5 host bits, 32 addresses, <b>30</b> usable, mask 255.255.255.224. /28: 16 addresses, <b>14</b>, mask .240. /29: 8, <b>6</b>, mask .248. /30: 4, <b>2</b>, mask .252. /22: 10 host bits = 1024, <b>1,022</b>, mask 255.255.252.0. /16: 16 host bits = 65,536, <b>65,534</b>, mask 255.255.0.0.</p>`,
    code: { lang: 'python', run: true, code: `for p in (27, 28, 29, 30, 22, 16):
    h = 32 - p
    mask = (0xFFFFFFFF << h) & 0xFFFFFFFF
    dotted = ".".join(str((mask >> s) & 255) for s in (24, 16, 8, 0))
    print("/%d  mask %-15s total %-6d usable %d" % (p, dotted, 2 ** h, 2 ** h - 2))` },
    complexity: `<p>O(1).</p>`, followUps: ['Why is /31 an exception?', 'Which prefix do you need for 1,000 hosts?']
  }
});
practice.push({
  title: 'Private, public or special?', level: 'Easy', tags: ['private ranges', 'special'], companies: ['Amazon', 'Microsoft'],
  statement: `<p>Classify each: 172.31.4.5, 172.32.0.1, 192.169.0.1, 10.200.1.1, 169.254.9.9, 100.64.0.1, 127.0.0.5, 224.0.0.9.</p>`,
  constraints: `Use RFC 1918 and the special ranges from the lesson.`,
  example: `<p>${H.c('g', '10.200.1.1')} is inside 10/8, so it is private.</p>`,
  brute: { why: `<p>Guessing "starts with 172 so private" is the classic trap: only 172.16.0.0 - 172.31.255.255 is private.</p>` },
  mcq: { q: 'Which is NOT a private address?', options: ['172.16.0.1', '172.31.255.254', '172.32.0.1', '192.168.100.100'], answer: 2, explain: '/12 stops at 172.31.255.255.' },
  hints: [`<p>Memorise: 10/8, 172.16/12 (16-31), 192.168/16.</p>`, `<p>Special: 127/8 loopback, 169.254/16 link-local, 100.64/10 CGNAT, 224/4 multicast.</p>`, `<p>Everything else that is not reserved is public.</p>`],
  solution: {
    approach: `<p>172.31.4.5 - private (second octet 31 is the last in 16-31). 172.32.0.1 - <b>public</b>. 192.169.0.1 - <b>public</b> (only 192.168 is private). 10.200.1.1 - private. 169.254.9.9 - link-local/APIPA (DHCP failed). 100.64.0.1 - CGNAT shared space (not private, not public-routable on the internet). 127.0.0.5 - loopback. 224.0.0.9 - multicast (RIPv2 uses 224.0.0.9).</p>`,
    complexity: `<p>O(1) per address.</p>`, followUps: ['How would you check this in code?', 'Is 100.64.0.1 reachable from the internet?']
  }
});
practice.push({
  title: 'Shorten these IPv6 addresses', level: 'Easy', tags: ['ipv6'], companies: ['Cisco', 'Juniper'],
  statement: `<p>Compress: (a) <code>2001:0db8:0000:0000:0000:0000:0000:0001</code>, (b) <code>fe80:0000:0000:0000:0a00:27ff:fe00:0001</code>, (c) <code>2001:0db8:0000:0001:0000:0000:0000:0001</code>, (d) <code>0000:0000:0000:0000:0000:0000:0000:0000</code>.</p>`,
  constraints: `RFC 5952: lowercase, longest zero run only, never for one group.`,
  example: `<p>${H.c('g', '2001:db8::1')}</p>`,
  brute: { why: `<p>Using "::" for every zero run would make the address ambiguous. Only one is allowed.</p>` },
  mcq: { q: 'Which is the correct short form of 2001:0db8:0000:0001:0000:0000:0000:0001?', options: ['2001:db8::1:0:0:0:1', '2001:db8:0:1::1', '2001:db8::1::1', '2001:db8:0:1:0:0:0:1'], answer: 1, explain: 'The longest zero run (3 groups) becomes ::, the lone zero group stays as 0.' },
  hints: [`<p>Strip leading zeros group by group.</p>`, `<p>Mark runs of 0 groups.</p>`, `<p>Replace the longest run (min 2) with ::; all-zero address is just ::.</p>`],
  solution: {
    approach: `<p>(a) <b>2001:db8::1</b> (b) <b>fe80::a00:27ff:fe00:1</b> (c) <b>2001:db8:0:1::1</b> - runs are 1 group (3rd) and 3 groups (5th-7th); the longer wins and the single 0 stays (d) <b>::</b> (the unspecified address). Verify: <code>ipaddress.ip_address(x).compressed</code>.</p>`,
    complexity: `<p>O(8).</p>`, followUps: ['Expand fe80::1', 'Which of these is link-local?']
  }
});
practice.push({
  title: 'Mask conversions', level: 'Easy', tags: ['masks'], companies: ['TCS', 'Wipro'],
  statement: `<p>Convert: /20 to dotted, /13 to dotted, 255.255.255.248 to prefix, 255.255.254.0 to prefix, and say the block size of each.</p>`,
  constraints: `No calculator.`,
  example: `<p>/20 = 255.255.<b>240</b>.0, block size 16 in the 3rd octet.</p>`,
  brute: { why: `<p>Counting ones across 32 written bits is slow. Count full octets (8 each), then the leftover bits give the octet value 128, 192, 224, 240, 248, 252, 254.</p>` },
  mcq: { q: '255.255.254.0 is...', options: ['/22', '/23', '/24', '/25'], answer: 1, explain: '16 + 7 ones = 23 (254 = 11111110).' },
  hints: [`<p>Leftover bits 1..8 map to 128, 192, 224, 240, 248, 252, 254, 255.</p>`, `<p>/20: 2 full octets + 4 bits -> third octet 240.</p>`, `<p>Block size = 256 - mask octet.</p>`],
  solution: {
    approach: `<p>/20 = 255.255.240.0 (block 16). /13 = 255.248.0.0 (8 + 5 bits -> 248; block 8 in the 2nd octet). 255.255.255.248 = 24 + 5 = <b>/29</b> (block 8). 255.255.254.0 = 16 + 7 = <b>/23</b> (block 2 in the 3rd octet, so a /23 spans two consecutive third-octet values, e.g. 10.0.4.0 - 10.0.5.255).</p>`,
    complexity: `<p>O(1).</p>`, followUps: ['What is the wildcard mask of /23?', 'Why must mask bits be contiguous?']
  }
});
practice.push({
  title: 'AND it by hand: 172.20.10.99/28', level: 'Easy', tags: ['subnetting', 'binary'], companies: ['Infosys', 'Cisco'],
  statement: `<p>For <code>172.20.10.99</code> with mask <code>255.255.255.240</code> write the last octet in binary, do the AND, and give the network, broadcast and first/last host.</p>`,
  constraints: `Show binary for the last octet.`,
  example: `${H.bits(99, 8, { label: '99', hl: { 7: 'm', 6: 'g', 5: 'g' } })}`,
  brute: { why: `<p>Converting the whole address to 32 bits works but only the last octet changes because the first three octets are masked by 255.</p>` },
  mcq: { q: 'What is 99 AND 240?', options: ['64', '96', '99', '112'], answer: 1, explain: '01100011 AND 11110000 = 01100000 = 96.' },
  hints: [`<p>99 = 64 + 32 + 2 + 1 = 01100011.</p>`, `<p>240 = 11110000 keeps the top 4 bits.</p>`, `<p>Block size 16: 96 &le; 99 &lt; 112.</p>`],
  solution: {
    approach: `<p>99 = 01100011; 240 = 11110000; AND = 01100000 = 96. Network <b>172.20.10.96</b>, broadcast = 96 + 16 - 1 = <b>172.20.10.111</b>, first host .97, last host .110, 14 usable. Same answer by block method: multiples of 16 are 96, 112 - 99 sits in the 96 block.</p>`,
    dry: { head: ['bit weight', '128', '64', '32', '16', '8', '4', '2', '1'], rows: [['99', '0', '1', '1', '0', '0', '0', '1', '1'], ['mask 240', '1', '1', '1', '1', '0', '0', '0', '0'], ['AND', '0', '1', '1', '0', '0', '0', '0', '0']] },
    complexity: `<p>O(1).</p>`, followUps: ['Do the same for /27', 'What is the next subnet\'s network address?']
  }
});

// =====================================================================
// PRACTICE — Medium
// =====================================================================
practice.push({
  title: 'Same subnet or not?', level: 'Medium', tags: ['subnetting', 'gateway'], companies: ['Cisco', 'VMware'],
  statement: `<p>With mask /22, are these pairs in the same subnet? (a) 10.0.5.200 and 10.0.7.9 (b) 10.0.7.255 and 10.0.8.1 (c) 192.168.1.130/25 and 192.168.1.20/25.</p>`,
  constraints: `State the network of each host.`,
  example: `<p>${H.c('g', '10.0.5.200 and 10.0.7.9')} both in 10.0.4.0/22.</p>`,
  brute: { why: `<p>Comparing "first three octets equal" is wrong for non-/24 masks: 10.0.5.x and 10.0.7.x differ in the third octet yet share a /22.</p>` },
  mcq: { q: 'Hosts A and B are in different subnets. What must happen for A to reach B?', options: ['A ARPs for B directly', 'A sends to its default gateway', 'A broadcasts', 'They cannot communicate'], answer: 1, explain: 'Off-subnet traffic goes to the gateway; the router forwards.' },
  hints: [`<p>/22: third octet block size is 4 (256 - 252).</p>`, `<p>Find the block start of each third octet: floor(x/4)*4.</p>`, `<p>/25: last octet block size 128 (0 or 128).</p>`],
  solution: {
    approach: `<p>(a) 5 and 7 both in the block 4-7 -> 10.0.4.0/22 -> <b>same</b>. (b) 7 is in 4-7 (10.0.4.0/22), 8 is in 8-11 (10.0.8.0/22) -> <b>different</b>, even though the addresses are adjacent. (c) 130 -> 128 block (192.168.1.128/25), 20 -> 0 block (192.168.1.0/25) -> <b>different</b>. Different subnets must go via the default gateway.</p>`,
    dry: { head: ['Host', 'block size', 'block start', 'network'], rows: [['10.0.5.200 /22', '4 (3rd octet)', '4', '10.0.4.0/22'], ['10.0.7.9 /22', '4', '4', '10.0.4.0/22'], ['10.0.7.255 /22', '4', '4', '10.0.4.0/22'], ['10.0.8.1 /22', '4', '8', '10.0.8.0/22']] },
    complexity: `<p>O(1).</p>`, followUps: ['What mask would put (b) in one subnet?', 'Is 10.0.7.255/22 a broadcast?']
  }
});
practice.push({
  title: 'Is 10.0.0.255/23 a valid host? (the .255 trap)', level: 'Medium', tags: ['broadcast', 'cidr'], companies: ['Google', 'Cisco'],
  statement: `<p>A junior engineer refuses to assign <code>10.0.0.255</code> to a server on the network <code>10.0.0.0/23</code> because "it ends in .255 so it is a broadcast". Is he right? Give the network, broadcast and range, and also say whether 10.0.1.255 and 10.0.1.0 are valid.</p>`,
  constraints: `Use the mask, not the last octet.`,
  example: `<p>Range 10.0.0.0 - 10.0.1.255: broadcast is ${H.c('r', '10.0.1.255')}.</p>`,
  brute: { why: `<p>Looking only at the last octet works for /24, then fails on every other prefix. Always derive the block from the mask.</p>` },
  mcq: { q: 'In 10.0.0.0/23, which is the broadcast address?', options: ['10.0.0.255', '10.0.1.0', '10.0.1.255', '10.0.0.254'], answer: 2, explain: 'The /23 spans two /24s; all host bits set means 10.0.1.255.' },
  hints: [`<p>/23 means 9 host bits: last octet plus the lowest bit of the 3rd octet.</p>`, `<p>Block size in the 3rd octet is 2: 0-1.</p>`, `<p>Network = all host bits 0, broadcast = all host bits 1.</p>`],
  solution: {
    approach: `<p>/23 = 255.255.254.0, block size 2 in the 3rd octet; 0 sits in block 0-1, so network <b>10.0.0.0</b>, broadcast <b>10.0.1.255</b>, usable <b>10.0.0.1 - 10.0.1.254</b> (510 hosts). Hence <b>10.0.0.255 is a perfectly valid host</b> and so is 10.0.1.0. The junior is wrong. Only 10.0.0.0 (network) and 10.0.1.255 (broadcast) are reserved.</p>`,
    complexity: `<p>O(1).</p>`, followUps: ['Which hosts in a /22 end in .0 or .255 but are valid?', 'How many usable hosts?']
  }
});
practice.push({
  title: 'Longest-prefix match with overlapping routes', level: 'Medium', tags: ['routing', 'lpm'], companies: ['Cisco', 'Arista', 'Juniper'],
  statement: `<p>Routing table: <code>0.0.0.0/0 -> R1</code>, <code>192.168.0.0/16 -> R2</code>, <code>192.168.10.0/24 -> R3</code>, <code>192.168.10.64/26 -> R4</code>, <code>192.168.10.128/25 -> R5</code>, <code>10.0.0.0/8 -> R6</code>. Find the next hop for: 192.168.10.77, 192.168.10.130, 192.168.10.20, 192.168.99.1, 10.9.9.9, 11.1.1.1.</p>`,
  constraints: `Longest prefix wins; list the candidates.`,
  example: `<p>192.168.10.77: candidates /0, /16, /24, /26 -> ${H.c('b', 'R4')}</p>`,
  brute: { why: `<p>First-match (as in firewall rules) would send everything to R1. Routers compare all matching prefixes.</p>` },
  mcq: { q: 'Destination 192.168.10.20 matches which longest route?', options: ['/16 R2', '/24 R3', '/26 R4', '/0 R1'], answer: 1, explain: '20 is outside 64-127 and outside 128-255, so /26 and /25 fail; /24 is the longest match.' },
  hints: [`<p>For each route, test (dest AND mask) == network.</p>`, `<p>/26 at .64 covers .64-.127; /25 at .128 covers .128-.255.</p>`, `<p>If only the default matches, the default is used.</p>`],
  solution: {
    approach: `<p>192.168.10.77 -> candidates /0 /16 /24 /26 -> <b>R4</b>. 192.168.10.130 -> /0 /16 /24 /25 -> <b>R5</b>. 192.168.10.20 -> /0 /16 /24 -> <b>R3</b>. 192.168.99.1 -> /0 /16 -> <b>R2</b>. 10.9.9.9 -> /0 /8 -> <b>R6</b>. 11.1.1.1 -> only /0 -> <b>R1</b>.</p>`,
    dry: { head: ['Dest', 'Matching prefixes', 'Winner'], rows: [['192.168.10.77', '/0 /16 /24 /26', 'R4 (/26)'], ['192.168.10.130', '/0 /16 /24 /25', 'R5 (/25)'], ['192.168.10.20', '/0 /16 /24', 'R3 (/24)'], ['192.168.99.1', '/0 /16', 'R2 (/16)'], ['10.9.9.9', '/0 /8', 'R6 (/8)'], ['11.1.1.1', '/0', 'R1 (default)']] },
    complexity: `<p>Linear scan O(R); trie O(32).</p>`, followUps: ['What if R4 goes down?', 'What if two /24 routes tie?']
  }
});
practice.push({
  title: 'Split 172.16.0.0/16 into 8 equal subnets', level: 'Medium', tags: ['subnetting', 'borrowing bits'], companies: ['Cisco', 'HCL'],
  statement: `<p>Divide <code>172.16.0.0/16</code> into 8 equal subnets. Give the new prefix, mask, block size, usable hosts per subnet and all 8 network addresses.</p>`,
  constraints: `Subnets must be equal and contiguous.`,
  example: `<p>8 subnets = 3 borrowed bits -> /19.</p>`,
  brute: { why: `<p>Dividing 65,536 by 8 gives the size but not the boundaries; you also need the third-octet step.</p>` },
  mcq: { q: 'How many bits must be borrowed to make at least 8 subnets?', options: ['2', '3', '4', '8'], answer: 1, explain: '2^3 = 8.' },
  hints: [`<p>Subnets = 2<sup>borrowed bits</sup>.</p>`, `<p>New prefix = 16 + borrowed bits.</p>`, `<p>Block in the 3rd octet = 256 / 8 = 32.</p>`],
  solution: {
    approach: `<p>3 bits borrowed -> prefix <b>/19</b>, mask 255.255.<b>224</b>.0, block size 32 in the third octet, usable hosts per subnet 2<sup>13</sup> - 2 = <b>8,190</b>. Networks: 172.16.0.0, 172.16.32.0, 172.16.64.0, 172.16.96.0, 172.16.128.0, 172.16.160.0, 172.16.192.0, 172.16.224.0 (all /19).</p>`,
    code: { lang: 'python', run: true, code: `import ipaddress
for s in ipaddress.ip_network("172.16.0.0/16").subnets(new_prefix=19):
    print(s, s.netmask, "usable", s.num_addresses - 2)` },
    complexity: `<p>O(subnets).</p>`, followUps: ['How many subnets if we use /26 instead?', 'Which subnet holds 172.16.100.5?']
  }
});
practice.push({
  title: 'VLSM plan: 90, 45, 20, 10, 2, 2 hosts', level: 'Medium', tags: ['vlsm'], companies: ['Cisco', 'Accenture'],
  statement: `<p>Allocate subnets from <code>10.20.0.0/24</code> for LANs needing 90, 45, 20, 10 hosts and two router-to-router links (2 hosts each). Give each subnet in CIDR and the free space left.</p>`,
  constraints: `Largest first, no overlaps.`,
  example: `<p>90 hosts -> /25 (126 usable) -> ${H.c('g', '10.20.0.0/25')}</p>`,
  brute: { why: `<p>Giving every LAN a /26 cannot satisfy the 90-host LAN at all (62 usable). Sizing each request individually is the point of VLSM.</p>` },
  mcq: { q: 'A router-to-router link between two routers needs which prefix (traditional)?', options: ['/29', '/30', '/28', '/24'], answer: 1, explain: '/30 gives exactly 2 usable addresses (a /31 also works on modern gear).' },
  hints: [`<p>Prefix by need: 90 -> /25, 45 -> /26, 20 -> /27, 10 -> /28, 2 -> /30.</p>`, `<p>Cursor positions: 0, 128, 192, 224, 240, 244.</p>`, `<p>Sum of blocks = 128+64+32+16+4+4 = 248; free = 8.</p>`],
  solution: {
    approach: `<p>90 -> <b>10.20.0.0/25</b> (hosts .1-.126). 45 -> <b>10.20.0.128/26</b> (.129-.190). 20 -> <b>10.20.0.192/27</b> (.193-.222). 10 -> <b>10.20.0.224/28</b> (.225-.238). Link 1 -> <b>10.20.0.240/30</b> (.241-.242). Link 2 -> <b>10.20.0.244/30</b> (.245-.246). Free: 10.20.0.248 - .255 (8 addresses, room for a /29).</p>`,
    code: { lang: 'python', run: true, code: `import ipaddress
def prefix_for(h):
    k = 2
    while 2 ** k - 2 < h:
        k += 1
    return 32 - k
cur = int(ipaddress.ip_address("10.20.0.0"))
for need in sorted([90, 45, 20, 10, 2, 2], reverse=True):
    p = prefix_for(need)
    net = ipaddress.ip_network((cur, p))
    print(need, net)
    cur += net.num_addresses
print("free from", ipaddress.ip_address(cur))` },
    dry: { head: ['Need', 'Prefix', 'Network', 'Usable', 'Next cursor'], rows: [['90', '/25', '10.20.0.0', '126', '128'], ['45', '/26', '10.20.0.128', '62', '192'], ['20', '/27', '10.20.0.192', '30', '224'], ['10', '/28', '10.20.0.224', '14', '240'], ['2', '/30', '10.20.0.240', '2', '244'], ['2', '/30', '10.20.0.244', '2', '248']] },
    complexity: `<p>O(n log n).</p>`, followUps: ['Where would a new 5-host VLAN go?', 'Could the links be /31?']
  }
});
practice.push({
  title: 'Route summarization: when can you not aggregate?', level: 'Medium', tags: ['summarization', 'supernet'], companies: ['Cisco', 'Juniper'],
  statement: `<p>Summarize (a) 192.168.4.0/24 through 192.168.7.0/24 into one route. (b) Can 192.168.2.0/24 through 192.168.5.0/24 become a single prefix? If not, what is the smallest set of routes?</p>`,
  constraints: `Exact coverage, no extra addresses.`,
  example: `<p>(a) ${H.c('g', '192.168.4.0/22')}</p>`,
  brute: { why: `<p>Taking the first and last network and using the "common prefix" greedily could overshoot: summarizing 2..5 with a /21 would also cover 0, 1, 6 and 7, which are not yours (black-holing traffic or leaking routes).</p>` },
  mcq: { q: 'A single /22 can start only at third-octet values that are...', options: ['any number', 'multiples of 2', 'multiples of 4', 'multiples of 8'], answer: 2, explain: 'A /22 spans 4 third-octet values and must be aligned.' },
  hints: [`<p>4 blocks = 2 borrowed bits -> /22 needs start divisible by 4.</p>`, `<p>4 is divisible by 4; 2 is not.</p>`, `<p>Split 2..5 into aligned pairs: 2-3 and 4-5.</p>`],
  solution: {
    approach: `<p>(a) third octets 4,5,6,7: aligned (4 divisible by 4) -> <b>192.168.4.0/22</b>. (b) 2,3,4,5: start 2 is not divisible by 4, so no single /22. Smallest exact cover is two /23s: <b>192.168.2.0/23</b> (2-3) and <b>192.168.4.0/23</b> (4-5). A single bigger summary like 192.168.0.0/21 would wrongly include .0, .1, .6, .7.</p>`,
    code: { lang: 'python', run: true, code: `import ipaddress
a = [ipaddress.ip_network("192.168.%d.0/24" % i) for i in range(4, 8)]
b = [ipaddress.ip_network("192.168.%d.0/24" % i) for i in range(2, 6)]
print(list(ipaddress.collapse_addresses(a)))
print(list(ipaddress.collapse_addresses(b)))` },
    complexity: `<p>O(n).</p>`, followUps: ['What is the null-route trick?', 'Why do ISPs love summarization?']
  }
});
practice.push({
  title: 'IPv6 prefix arithmetic', level: 'Medium', tags: ['ipv6', 'subnetting'], companies: ['Cisco', 'Google'],
  statement: `<p>(a) How many /64 LANs fit in a /48? (b) How many /48 sites in an ISP's /32? (c) A home gets a /56: how many /64 networks? (d) What is the first /64 inside 2001:db8:abcd::/48 and the second?</p>`,
  constraints: `Powers of two.`,
  example: `<p>/48 to /64 = 16 bits = ${H.c('g', '65,536')}.</p>`,
  brute: { why: `<p>Trying to count addresses (2<sup>80</sup>) is pointless; count how many prefix bits are added.</p>` },
  mcq: { q: 'Why is a LAN almost always a /64?', options: ['Because /64 saves addresses', 'SLAAC needs a 64-bit interface identifier', 'IPv6 masks are fixed', 'ARP needs it'], answer: 1, explain: 'SLAAC builds the host part from 64 bits, so smaller LAN prefixes break auto-configuration.' },
  hints: [`<p>Extra bits = new prefix - old prefix.</p>`, `<p>Count = 2<sup>extra bits</sup>.</p>`, `<p>The 4th group (16 bits) after /48 is the subnet ID.</p>`],
  solution: {
    approach: `<p>(a) 64 - 48 = 16 bits -> <b>65,536</b>. (b) 48 - 32 = 16 -> <b>65,536</b> sites. (c) 64 - 56 = 8 -> <b>256</b> LANs. (d) the 4th group is the subnet ID: first <b>2001:db8:abcd:0::/64</b> = 2001:db8:abcd::/64, second <b>2001:db8:abcd:1::/64</b>.</p>`,
    complexity: `<p>O(1).</p>`, followUps: ['How big is the host space in one /64?', 'Why is NAT unnecessary?']
  }
});
practice.push({
  title: 'Laptop shows 169.254.x.x - debug it', level: 'Medium', tags: ['dhcp', 'troubleshooting'], companies: ['Dell', 'Cisco'],
  statement: `<p>A new laptop on office Wi-Fi shows IP 169.254.37.201 and cannot open any site, although it can ping another laptop with a 169.254 address. Explain what happened and list the checks in order.</p>`,
  constraints: `Answer as a troubleshooting plan.`,
  example: `<p>${H.c('r', '169.254.x.x')} = DHCP never answered, OS self-assigned.</p>`,
  brute: { why: `<p>Setting a static IP "to make it work" hides the real fault (no DHCP service on that VLAN, rogue snooping port, exhausted pool) and risks address conflicts.</p>` },
  mcq: { q: 'Why can two 169.254 laptops ping each other but not the internet?', options: ['They share a gateway', 'Link-local addresses are on-link only, with no gateway or DNS', 'ICMP is blocked', 'DNS is slow'], answer: 1, explain: 'APIPA gives only an address and /16 mask - no default gateway.' },
  hints: [`<p>169.254/16 means the OS gave up waiting for DHCP.</p>`, `<p>Check from the client outward: link, VLAN, DHCP reachability, pool.</p>`, `<p>Use tcpdump on port 67/68 to see which of D-O-R-A is missing.</p>`],
  solution: {
    approach: `<p>The DHCP Discover got no Offer, so after the timeout the OS picked a random 169.254.x.x/16 (APIPA), ARP-probed it and used it; that range has no gateway and no DNS, so only on-link peers are reachable. Checklist: (1) is Wi-Fi really associated to the right SSID/VLAN? (2) Run <code>tcpdump port 67 or 68</code>: Discover leaving? Offer returning? If no Offer: DHCP server down, pool exhausted (all leases used), relay/ip-helper missing for that VLAN, or client isolation/ACL blocking UDP 67/68. (3) Offer but no Ack: server NAK, duplicate address detection. (4) Fix the root cause, then <code>ipconfig /renew</code> or <code>dhclient -r; dhclient</code>.</p>`,
    complexity: `<p>Not applicable - diagnosis.</p>`, followUps: ['How does DHCP snooping fit?', 'What if only some laptops fail?']
  }
});

// =====================================================================
// PRACTICE — Hard
// =====================================================================
practice.push({
  title: 'Trace everything: laptop joins Wi-Fi and loads http://example.com', level: 'Hard', tags: ['dhcp', 'arp', 'nat', 'routing', 'end-to-end'], companies: ['Google', 'Cisco', 'Amazon', 'Meta'],
  statement: `<p>A laptop (MAC <code>AA</code>) joins home Wi-Fi: router LAN <code>192.168.1.1/24</code> (MAC <code>GG</code>), router WAN IP <code>203.0.113.5</code>, DHCP and DNS on the router. List <b>in order</b> every packet exchange until the first byte of the web page arrives: DHCP, ARP, DNS, TCP, HTTP. For the first TCP SYN give the Ethernet and IP source/destination <b>before and after NAT</b>.</p>`,
  constraints: `Assume empty caches; example.com resolves to 93.184.216.34; the laptop gets 192.168.1.142.`,
  example: `<p>${H.c('g', 'DORA')} -> ${H.c('b', 'ARP gateway')} -> ${H.c('y', 'DNS')} -> ${H.c('p', 'TCP + HTTP via NAT')}</p>`,
  brute: { why: `<p>A weak answer says "the laptop sends an HTTP request to the server". It skips that the laptop has no IP yet, does not know the gateway's MAC, cannot resolve the name, and that the router rewrites the source address. Interviewers want the dependency chain: link -> IP -> MAC of next hop -> name -> transport -> app.</p>` },
  mcq: { q: 'Which message comes FIRST after Wi-Fi association?', options: ['DNS query', 'ARP for the gateway', 'DHCP Discover', 'TCP SYN'], answer: 2, explain: 'Without an IP address and gateway nothing else can be built; DHCP comes first.' },
  hints: [`<p>What does the laptop have right after joining? Only a MAC. What must it get first?</p>`, `<p>Before sending to anything off-subnet it needs the gateway's MAC (ARP) and before it can name a server IP it needs DNS.</p>`, `<p>At the router: NAT rewrites source IP:port to the public IP and a public port; Ethernet addresses change to the ISP-side next hop.</p>`],
  solution: {
    approach: `<p><b>1. DHCP (broadcast, UDP 68 -> 67):</b> Discover (0.0.0.0 -> 255.255.255.255) -> Offer (192.168.1.142, /24, router .1, DNS .1, lease) -> Request (broadcast) -> Ack. <b>2. ARP:</b> the laptop may ARP-probe 192.168.1.142 for duplicates, then needs the MAC for off-link traffic: ARP who-has 192.168.1.1 -> reply "is-at GG". <b>3. DNS:</b> UDP query for example.com from 192.168.1.142:random to 192.168.1.1:53 (on-link, Eth dst GG); the router resolves (or forwards upstream via NAT) and replies 93.184.216.34. <b>4. TCP handshake:</b> 93.184.216.34 is not in 192.168.1.0/24, so the frame goes to the gateway: SYN with Eth src AA, Eth dst GG, IP src 192.168.1.142:51000, IP dst 93.184.216.34:80. <b>At the router NAT:</b> row 192.168.1.142:51000 <-> 203.0.113.5:51000; the packet leaves with IP src 203.0.113.5:51000, IP dst unchanged, and a NEW Ethernet header (src = router WAN MAC, dst = ISP next hop MAC). SYN-ACK returns to 203.0.113.5:51000, NAT rewrites the destination back to 192.168.1.142:51000. <b>5.</b> ACK, then HTTP GET, and the first response byte arrives. Total round trips before the first byte: DHCP (1) + ARP (1) + DNS (1) + TCP (1) + HTTP (1); on HTTPS add a TLS handshake.</p>`,
    dry: { head: ['#', 'Protocol', 'Src -> Dst (IP)', 'Eth dst', 'Purpose'], rows: [['1', 'DHCP Discover', '0.0.0.0 -> 255.255.255.255', 'ff:ff..', 'find a server'], ['2', 'DHCP Offer', '192.168.1.1 -> .142', 'AA', 'propose IP'], ['3', 'DHCP Request', '0.0.0.0 -> 255.255.255.255', 'ff:ff..', 'accept'], ['4', 'DHCP Ack', '192.168.1.1 -> .142', 'AA', 'lease starts'], ['5', 'ARP who-has .1', '-', 'ff:ff..', 'learn gateway MAC'], ['6', 'ARP reply', '-', 'AA', '.1 is-at GG'], ['7', 'DNS query', '.142 -> .1:53', 'GG', 'name to IP'], ['8', 'DNS answer', '.1 -> .142', 'AA', '93.184.216.34'], ['9', 'TCP SYN (LAN side)', '.142:51000 -> 93.184.216.34:80', 'GG', 'open connection'], ['10', 'TCP SYN (WAN side)', '203.0.113.5:51000 -> 93.184.216.34:80', 'ISP hop', 'after NAT'], ['11', 'HTTP GET / reply', 'via NAT table', 'GG / ISP', 'page bytes']] },
    complexity: `<p>About 5 sequential round trips (more with TLS).</p>`,
    followUps: ['What changes if the laptop already had a valid lease?', 'Which steps disappear when DNS is cached?', 'What if the site were IPv6-only?']
  }
});
practice.push({
  title: 'Design the addressing plan for a 3-site company', level: 'Hard', tags: ['vlsm', 'design', 'summarization'], companies: ['Cisco', 'Amazon', 'Accenture'],
  statement: `<p>A company has HQ (500 hosts), Branch 1 (120 hosts), Branch 2 (60 hosts) and two WAN point-to-point links. You are given <code>10.50.0.0/22</code>. Produce a VLSM plan with growth awareness, the summary route each site advertises, and the spare space. Then say what you would change if HQ will double in two years.</p>`,
  constraints: `Largest first; every site should be summarizable if possible.`,
  example: `<p>HQ 500 hosts -> /23 (510 usable) ${H.c('g', '10.50.0.0/23')}</p>`,
  brute: { why: `<p>A flat plan with equal /24 per site wastes space (Branch 2 uses 60 of 254) and cannot hold HQ's 500 hosts in one /24. Handing out blocks in request order (smallest first) leaves unaligned holes.</p>` },
  mcq: { q: 'Which prefix covers 500 hosts?', options: ['/24', '/23', '/22', '/25'], answer: 1, explain: '/23 has 510 usable hosts. /24 has only 254.' },
  hints: [`<p>Prefixes: 500 -> /23, 120 -> /25, 60 -> /26, links -> /30.</p>`, `<p>Total 1024 addresses in the /22: 512 + 128 + 64 + 4 + 4 = 712 used.</p>`, `<p>Keep each site in one contiguous block so it summarizes to a single route.</p>`],
  solution: {
    approach: `<p>Sorted: HQ -> <b>10.50.0.0/23</b> (10.50.0.0 - 10.50.1.255, 510 hosts). Branch 1 -> <b>10.50.2.0/25</b> (.1-.126, 126 hosts). Branch 2 -> <b>10.50.2.128/26</b> (.129-.190, 62). WAN 1 -> <b>10.50.2.192/30</b>, WAN 2 -> <b>10.50.2.196/30</b>. Spare: 10.50.2.200 - 10.50.3.255 (312 addresses). Summaries: HQ advertises 10.50.0.0/23; the two branches could be moved into one block 10.50.2.0/24 so the core sees 10.50.2.0/24. The whole company summarizes as <b>10.50.0.0/22</b> to the outside world. If HQ doubles to ~1,000 hosts it needs a /22 on its own, so the plan collides: avoid by reserving a /22 per large site from a bigger parent (e.g. a /20 company block, 10.50.0.0/20), putting HQ at 10.50.0.0/22 with room to grow. Always plan 2x growth for LANs, leave a gap after each large block, document everything in an IPAM tool.</p>`,
    code: { lang: 'python', run: true, code: `import ipaddress
plan = [("HQ", "10.50.0.0/23"), ("Branch1", "10.50.2.0/25"), ("Branch2", "10.50.2.128/26"), ("WAN1", "10.50.2.192/30"), ("WAN2", "10.50.2.196/30")]
nets = [(n, ipaddress.ip_network(c)) for n, c in plan]
# 1. no overlaps
for i in range(len(nets)):
    for j in range(i + 1, len(nets)):
        assert not nets[i][1].overlaps(nets[j][1]), (nets[i][0], nets[j][0])
# 2. everything inside the parent, 3. summary + usable hosts
parent = ipaddress.ip_network("10.50.0.0/22")
print("all inside parent:", all(n.subnet_of(parent) for _, n in nets))
for name, n in nets:
    print(name, n, "usable", n.num_addresses - 2)
print("company summary:", list(ipaddress.collapse_addresses(n for _, n in nets)))
used = sum(n.num_addresses for _, n in nets)
print("used", used, "of", parent.num_addresses, "spare", parent.num_addresses - used)` },
    complexity: `<p>Planning is O(n log n); verification O(n<sup>2</sup>) for n subnets.</p>`,
    followUps: ['How would you give each site IPv6 space?', 'Where do loopbacks (/32) come from?']
  }
});
practice.push({
  title: 'Why can\'t my friends connect to my home game server?', level: 'Hard', tags: ['nat', 'port forwarding', 'cgnat', 'stun'], companies: ['Google', 'Zoom', 'Discord'],
  statement: `<p>You run a game server on 192.168.1.20:25565 at home. Friends cannot connect to your public IP. Explain (a) why NAT drops their packets, (b) every fix you know in increasing order of effort, (c) what you check if port forwarding is set up but still fails, (d) how a video call between two people each behind NAT works anyway.</p>`,
  constraints: `Answer as an interview explanation, with the NAT table.`,
  example: `<p>Row needed: ${H.c('g', '203.0.113.5:25565 -> 192.168.1.20:25565')}</p>`,
  brute: { why: `<p>A weak answer is "NAT is a firewall". The real reason is mechanical: NAT mappings are created by outgoing packets; an unsolicited inbound packet matches no row and the router cannot know which private host to give it to.</p>` },
  mcq: { q: 'Two users behind two different NATs want a direct video call. What do they use?', options: ['ARP', 'STUN/ICE with UDP hole punching (TURN as fallback)', 'DHCP', 'Static routes'], answer: 1, explain: 'Each side learns its public mapping via STUN and sends packets simultaneously so both NATs create matching rows.' },
  hints: [`<p>Think: what creates a NAT row? Who sends the first packet here?</p>`, `<p>Fix options: manual row (port forward), ask router automatically (UPnP), relay (TURN/tunnel), avoid NAT (IPv6).</p>`, `<p>Port forward still fails? Check CGNAT (WAN IP 100.64.x or differs from what whatismyip says), server firewall, server bound to 127.0.0.1, wrong protocol (TCP vs UDP), hairpin NAT when testing from inside.</p>`],
  solution: {
    approach: `<p><b>(a)</b> A friend's SYN arrives at 203.0.113.5:25565. The NAT table has rows only for connections started from inside, so nothing matches and the router drops it (or replies RST). <b>(b)</b> 1) Static <b>port forward</b> (DNAT row 25565 -> 192.168.1.20:25565) plus a DHCP reservation so the server IP does not change. 2) <b>UPnP/NAT-PMP</b> lets the game ask the router to create the row (convenient, but a security risk). 3) A <b>VPN/overlay</b> such as Tailscale or WireGuard so friends reach a stable private address with auth. 4) A <b>reverse tunnel/relay</b> (ngrok, Cloudflare Tunnel, rented VPS with SSH -R) when you have no control of the router or are behind CGNAT. 5) <b>IPv6</b> with a firewall rule - no NAT at all. <b>(c)</b> Checks: is the WAN IP on the router a public one or 100.64/10 (CGNAT, then forwarding can never work)? Is the server listening on 0.0.0.0, not 127.0.0.1? Host firewall open? TCP vs UDP? Testing from inside needs hairpin NAT, so test from mobile data. <b>(d)</b> Calls use <b>ICE</b>: both peers ask a STUN server for their public IP:port, exchange candidates via a signalling server and send UDP at the same moment, which punches matching holes; with symmetric NAT it fails and traffic relays through a TURN server.</p>`,
    complexity: `<p>Not applicable - design explanation.</p>`,
    followUps: ['Why is exposing UPnP risky?', 'What is hairpin NAT?', 'How does CGNAT change the answer?']
  }
});
practice.push({
  title: 'Cloud VPC design: spot overlapping CIDRs before peering', level: 'Hard', tags: ['cidr', 'cloud', 'design', 'overlap'], companies: ['Amazon', 'Microsoft', 'Google'],
  statement: `<p>You have VPCs: prod <code>10.0.0.0/16</code>, staging <code>10.0.128.0/17</code>, dev <code>10.1.0.0/16</code>, on-prem <code>10.1.64.0/18</code>, partner <code>192.168.0.0/20</code>. Which pairs overlap, why does that block peering/VPN routing, and how would you redesign for 6 VPCs plus on-prem across 3 regions? Write a checker.</p>`,
  constraints: `Use real CIDR math, not intuition.`,
  example: `<p>${H.c('r', '10.0.0.0/16 overlaps 10.0.128.0/17')} (the /17 is inside the /16).</p>`,
  brute: { why: `<p>Comparing the first octets ("both start with 10") finds nothing useful; comparing every pair of CIDRs by eye misses nested containment like a /17 inside a /16.</p>` },
  mcq: { q: 'Why can two VPCs with overlapping CIDRs not be peered?', options: ['The cloud forbids private IPs', 'A route to "10.0.0.0/16" would be ambiguous: the router cannot tell which network a packet belongs to', 'Overlap increases cost', 'Peering needs public IPs'], answer: 1, explain: 'Routing decides by destination prefix; duplicate prefixes on both sides make the correct next hop impossible.' },
  hints: [`<p>Two CIDR blocks overlap if one contains the other's network address (aligned blocks either nest or are disjoint).</p>`, `<p>Python's <code>ip_network.overlaps()</code> does the check.</p>`, `<p>Design: carve one big RFC1918 supernet per environment/region with room to grow, reserve space for on-prem, document in an IPAM.</p>`],
  solution: {
    approach: `<p>Pairs: prod 10.0.0.0/16 (10.0.0.0-10.0.255.255) <b>overlaps staging</b> 10.0.128.0/17 (inside prod). dev 10.1.0.0/16 <b>overlaps on-prem</b> 10.1.64.0/18 (inside dev). partner 192.168.0.0/20 overlaps nothing but is a common home range so VPN users may clash. Overlap breaks peering/VPN because a route table entry for 10.0.128.0/17 could mean either network, and longest-prefix would send prod traffic into staging. Redesign: reserve 10.0.0.0/8 for the company, give each region a /12 (10.0, 10.16, 10.32), each VPC a /16 inside it (non-overlapping), keep on-prem in its own /16 (10.200.0.0/16), carve /20 per AZ and /24 per tier. Never use 192.168.0.0/16 or 172.17.0.0/16 (Docker) for cloud networks that VPN laptops reach. Check with code on every change in CI.</p>`,
    code: { lang: 'python', run: true, code: `import ipaddress, itertools
vpcs = {"prod": "10.0.0.0/16", "staging": "10.0.128.0/17", "dev": "10.1.0.0/16", "onprem": "10.1.64.0/18", "partner": "192.168.0.0/20"}
nets = {k: ipaddress.ip_network(v) for k, v in vpcs.items()}
clashes = [(a, b) for a, b in itertools.combinations(nets, 2) if nets[a].overlaps(nets[b])]
print("overlaps:", clashes)
for a, b in clashes:
    big, small = (a, b) if nets[a].prefixlen < nets[b].prefixlen else (b, a)
    print(" ", small, vpcs[small], "is inside", big, vpcs[big], "->", nets[small].subnet_of(nets[big]))
# Suggest a clean layout: one /16 per environment out of 10.0.0.0/8, skipping what is taken
free = ipaddress.ip_network("10.0.0.0/8").subnets(new_prefix=16)
print("clean /16s:", [str(next(free)) for _ in range(6)])` },
    complexity: `<p>O(n<sup>2</sup>) pair checks; trivial for dozens of VPCs.</p>`,
    followUps: ['How does Transit Gateway handle overlap?', 'What is IPv6 doing to this problem?', 'How would you renumber a live VPC?']
  }
});

// =====================================================================
// QUIZ
// =====================================================================
quiz.push({ q: 'How many usable host addresses does 192.168.10.77/26 have?', options: ['64', '62', '30', '126'], answer: 1, explain: '26 network bits leave 6 host bits: 2^6 = 64 addresses minus network and broadcast = 62.' });
quiz.push({ q: 'What is the broadcast address of 192.168.10.77/26?', options: ['192.168.10.63', '192.168.10.127', '192.168.10.128', '192.168.10.255'], answer: 1, explain: 'Block size 64: 77 lies in 64..127, so the broadcast (all host bits 1) is .127.' });
quiz.push({ q: 'Which is a private (RFC 1918) address?', options: ['172.32.1.1', '192.169.1.1', '172.20.5.5', '100.64.0.1'], answer: 2, explain: '172.16.0.0/12 covers 172.16-172.31. 100.64/10 is CGNAT shared space, not RFC 1918.' });
quiz.push({ q: 'A router has routes 10.0.0.0/8 (metric 1) and 10.1.0.0/16 (metric 100). A packet to 10.1.2.3 uses...', options: ['10.0.0.0/8 because its metric is lower', '10.1.0.0/16 because it is the longest prefix', 'Both routes in round robin', 'The default route'], answer: 1, explain: 'Longest-prefix match is decided before the metric.' });
quiz.push({ q: 'How many VLSM-sized blocks does 60 hosts need (smallest that fits)?', options: ['/25 (126)', '/26 (62)', '/27 (30)', '/24 (254)'], answer: 1, explain: '2^6 - 2 = 62 >= 60, so /26.' });
quiz.push({ q: 'Why does VLSM allocate the largest subnet first?', options: ['Larger subnets are faster', 'It keeps every block aligned to its size boundary and wastes no addresses', 'DHCP requires it', 'Routers sort by size'], answer: 1, explain: 'A block must start on a multiple of its size; sorting descending makes that automatic.' });
quiz.push({ q: 'Which is the correct shortest form of 2001:0db8:0000:0000:0000:0000:0000:0001?', options: ['2001:db8:0:0:0:0:0:1', '2001:db8::1', '2001:db8::0:1', '2001:0db8::1'], answer: 1, explain: 'Drop leading zeros and replace the longest zero run with ::.' });
quiz.push({ q: 'Host 192.168.1.10/24 pings 8.8.8.8. Which IP does it send an ARP request for?', options: ['8.8.8.8', '192.168.1.1 (the default gateway)', '255.255.255.255', 'No ARP is needed'], answer: 1, explain: '8.8.8.8 is off-subnet, so the frame is addressed to the gateway\'s MAC.' });
quiz.push({ q: 'In which order do the DHCP messages occur?', options: ['Offer, Discover, Request, Ack', 'Discover, Offer, Request, Ack', 'Request, Offer, Discover, Ack', 'Discover, Request, Offer, Ack'], answer: 1, explain: 'DORA: Discover, Offer, Request, Acknowledge.' });
quiz.push({ q: 'Why does NAT block a connection started from the internet to a laptop behind it?', options: ['Private IPs are encrypted', 'There is no translation-table entry because no outgoing packet created one', 'The laptop has no MAC', 'TCP forbids it'], answer: 1, explain: 'Mappings are created by outbound traffic; inbound with no mapping cannot be delivered.' });
quiz.push({ q: 'PAT lets many hosts share one public IP by...', options: ['Using different MAC addresses', 'Rewriting source ports as well as addresses', 'Splitting packets', 'Using multicast'], answer: 1, explain: 'The public port number identifies which inside socket owns the flow.' });
quiz.push({ q: 'Which statement about ARP is TRUE?', options: ['Request is unicast, reply is broadcast', 'Request is broadcast, reply is unicast', 'Both are routed across the internet', 'IPv6 still uses ARP'], answer: 1, explain: 'Request goes to ff:ff:ff:ff:ff:ff; the owner replies directly. IPv6 uses ICMPv6 Neighbor Discovery.' });
quiz.push({ q: 'A laptop obtains 169.254.12.7. The most likely cause is...', options: ['NAT overload', 'DHCP never answered', 'A routing loop', 'Wrong DNS'], answer: 1, explain: 'APIPA/link-local addresses are self-assigned when DHCP fails.' });

// =====================================================================
// INTERVIEW
// =====================================================================
interview.push({ level: 'B', q: 'What is the difference between an IP address and a MAC address?', a: `<p>A <b>MAC address</b> is a 48-bit hardware identifier burned into (or assigned to) a network interface; it is only meaningful on the <b>local link</b> (the same Ethernet/Wi-Fi LAN) and is used for frame delivery. An <b>IP address</b> is a logical, hierarchical address (32-bit v4, 128-bit v6) assigned by network configuration; it is used for <b>routing across networks</b>. On every hop the MAC pair changes (source = my interface, destination = next hop) while the IP pair stays the same end to end (except with NAT). ARP/NDP bridges the two by mapping next-hop IP to MAC.</p>`, followUps: ['Can two devices share a MAC on different networks?', 'Why not route on MAC addresses?'] });
interview.push({ level: 'B', q: 'Explain CIDR notation and why classful addressing was abandoned.', a: `<p>CIDR writes an address with a prefix length (<code>192.168.10.0/26</code>) meaning the first 26 bits are the network. Classful addressing fixed the split at /8, /16 or /24 by the leading bits, so organisations had to take far too many addresses (a 2,000-host company took a 65,534-host Class B), and routing tables exploded because every class C was a separate route. CIDR (1993) allows any prefix from /0 to /32, so allocations match need and ISPs can <b>aggregate</b> many customer prefixes into one route.</p>`, followUps: ['What is route aggregation?', 'What did classful mean for RIPv1?'] });
interview.push({ level: 'B', q: 'For 192.168.10.77/26, find the network, broadcast, host range and number of hosts.', a: `<p>/26 means mask 255.255.255.192, block size 256 - 192 = 64. The blocks in the last octet start at 0, 64, 128, 192, and 77 falls in the block that starts at 64. So: network <b>192.168.10.64</b>, broadcast <b>192.168.10.127</b>, usable range <b>.65 - .126</b>, hosts 2<sup>6</sup> - 2 = <b>62</b>. Binary check: 77 = 01001101, mask 11000000, AND = 01000000 = 64.</p>`, followUps: ['What if the prefix were /27?', 'Is 192.168.10.130 in the same subnet?'] });
interview.push({ level: 'I', q: 'How does a router choose a route when several match? Explain longest-prefix match.', a: `<p>For a destination IP the router finds every entry where <code>(dest AND mask) == network</code>. Among those it chooses the one with the <b>longest prefix</b> (most specific). Only if prefix lengths tie does it use administrative distance (which source of route is trusted more: connected 0, static 1, OSPF 110, RIP 120) and then the protocol metric; equal-cost ties may be load-shared (ECMP) by flow hash. The default route 0.0.0.0/0 is the shortest prefix, so it is used only if nothing more specific matches. Implementations use tries, DIR-24-8 tables or TCAM to do this at line rate.</p>`, followUps: ['Why is the longest prefix, not the lowest metric, the first criterion?', 'How does a trie speed this up?'] });
interview.push({ level: 'I', q: 'Walk me through VLSM for a /24 serving 60, 30, 12 and 2 hosts.', a: `<p>Sort descending and give each the smallest block that fits: 60 needs 2<sup>6</sup> - 2 = 62 -> /26; 30 needs 32 addresses -> /27 (30 usable); 12 -> /28 (14 usable); 2 -> /30. Allocate sequentially from the start: 192.168.1.0/26, .64/27, .96/28, .112/30, leaving .116 - .255 free. Largest first guarantees alignment (a block starts on a multiple of its size) so no space is stranded. Also leave growth room and keep each site contiguous for summarization.</p>`, followUps: ['What breaks if you allocate smallest first?', 'Could the 2-host link use /31?'] });
interview.push({ level: 'I', q: 'Explain ARP step by step. What happens when the destination is on another network?', a: `<p>The sender ANDs the destination with its mask. If it is on-link, it ARPs for the destination; if not, it ARPs for the <b>default gateway</b>. Cache miss -> broadcast ARP request (Eth dst ff:ff:ff:ff:ff:ff) "who has X, tell me"; only X replies, unicast, with its MAC; the sender caches IP -> MAC for a few minutes and sends the frame. For off-subnet traffic the Ethernet destination is the gateway's MAC but the IP destination remains the final host; each router repeats the decision at its next hop. ARP is unauthenticated, so spoofing is possible (mitigated by Dynamic ARP Inspection).</p>`, followUps: ['What is gratuitous ARP used for?', 'What replaces ARP in IPv6?'] });
interview.push({ level: 'I', q: 'Describe DHCP DORA and what happens when a laptop joins Wi-Fi.', a: `<p>After Wi-Fi association the laptop has no IP. <b>Discover</b>: broadcast from 0.0.0.0:68 to 255.255.255.255:67. <b>Offer</b>: server proposes an address plus mask, gateway, DNS and lease. <b>Request</b>: client broadcasts which offer it accepts (so other servers withdraw theirs). <b>Ack</b>: server commits the lease. The client then ARP-probes its new address for conflicts, ARPs for the gateway, queries DNS, and starts TCP. Renewal is attempted at 50% (unicast) and 87.5% (broadcast) of the lease; if nobody answers the OS falls back to 169.254.x.x. Broadcasts do not cross routers, so a relay agent forwards them to a central server.</p>`, followUps: ['Why is Request a broadcast?', 'What is DHCP snooping?'] });
interview.push({ level: 'I', q: 'How does NAT/PAT work, and what are its downsides?', a: `<p>NAT rewrites addresses at a border router. With <b>PAT/NAPT</b> many private hosts share one public IP: for each outgoing flow the router rewrites the source to <code>publicIP:port</code> (choosing a unique port) and records the mapping in a table; return packets are matched on the public port and the destination is rewritten back. Downsides: breaks inbound connections (no mapping until an outbound packet exists), complicates peer-to-peer and protocols with embedded addresses (FTP, SIP, needing ALGs or STUN/TURN), the router keeps per-flow state with timeouts (idle UDP flows die), traceability is harder with CGNAT, and ~65k ports limit concurrent flows per destination per public IP. IPv6 removes the need.</p>`, followUps: ['What are full-cone and symmetric NAT?', 'Is NAT a security feature?'] });
interview.push({ level: 'I', q: 'Compare distance-vector and link-state routing protocols.', a: `<p><b>Distance-vector</b> (RIP, EIGRP-style): each router tells its neighbours its whole table with distances; routers only know "via neighbour X, cost N" (Bellman-Ford). Simple and light, but slow convergence and risk of routing loops / count-to-infinity (fixed by split horizon, poison reverse, hold-down). <b>Link-state</b> (OSPF, IS-IS): each router floods facts about its own links so every router builds the same map and runs Dijkstra for shortest paths: fast convergence and loop-free but more memory/CPU, with areas to limit scale. Between autonomous systems the internet uses <b>BGP</b> (path-vector, policy-based).</p>`, followUps: ['What is the count-to-infinity problem?', 'What is an OSPF area?'] });
interview.push({ level: 'A', q: 'How do you shorten and expand IPv6 addresses, and how do IPv6 LANs get addresses without ARP or broadcast?', a: `<p>Shorten: drop leading zeros in each 16-bit group, then replace the longest run (at least two) of all-zero groups with <code>::</code> once; expand by counting visible groups, filling 8 minus that many zero groups at <code>::</code> and padding to 4 digits. A LAN is a /64. A host forms a link-local fe80:: address, uses ICMPv6 <b>Router Solicitation</b> and learns the prefix from the router's <b>Router Advertisement</b>, then builds its address by SLAAC (random or stable-privacy interface ID) or asks DHCPv6. Neighbor Discovery replaces ARP, using solicited-node multicast instead of broadcast, and Duplicate Address Detection checks the new address.</p>`, followUps: ['Why must a LAN be /64?', 'What are privacy extensions?'] });
interview.push({ level: 'A', q: 'Your service in a private subnet must call the internet but must not be reachable from it. How do you design it?', a: `<p>Put it in a <b>private subnet</b> with no route to an Internet Gateway; add a <b>NAT gateway</b> in a public subnet and a route <code>0.0.0.0/0 -> nat-gw</code> in the private route table. Outbound flows get SNAT/PAT to the gateway's elastic IP; there is no inbound mapping so the internet cannot initiate connections (reinforce with security groups). Use one NAT gateway per AZ for resilience, VPC endpoints (PrivateLink) for AWS APIs to avoid per-GB NAT cost, and IPv6 egress-only gateways for IPv6. Size subnets with room for growth and reserved addresses (AWS reserves 5 per subnet).</p>`, followUps: ['What are the cost traps of NAT gateways?', 'How would you allow a partner to call in?'] });
interview.push({ level: 'A', q: 'Two VPCs have overlapping CIDRs and must communicate. What are your options?', a: `<p>Direct peering or route-table entries cannot work because the destination prefix is ambiguous. Options: (1) <b>renumber</b> one VPC (best, painful if workloads are live); (2) place a <b>NAT/PrivateLink service</b> between them so only specific services are exposed under non-overlapping addresses (service endpoints, NLB-backed PrivateLink); (3) use <b>double NAT</b> / translating gateways (some SD-WAN, Transit Gateway with NAT appliances); (4) migrate to IPv6 or a secondary CIDR. Prevention: central IPAM with a company-wide allocation plan (never 192.168.0.0/16, a /16 per VPC from 10/8 with regional /12s) and a CI check using CIDR overlap tests.</p>`, followUps: ['How does IPAM prevent this?', 'What does PrivateLink actually expose?'] });
interview.push({ level: 'E', q: 'How does a high-speed router implement longest-prefix match for a million IPv4 routes?', a: `<p>Software routers use tries: a path-compressed or level-compressed binary trie (Linux LC-trie) or the <b>DIR-24-8</b> scheme where a 2<sup>24</sup>-entry table indexed by the top 24 bits resolves any prefix up to /24 in one memory read, with a small second-level table for longer prefixes. Hardware uses <b>TCAM</b>, a ternary content-addressable memory that compares the destination to all stored prefixes simultaneously (mask bits are "don't care"), returning the highest-priority (longest) hit in one cycle, at the cost of power and size; some chips use algorithmic TCAM (hash + trie in SRAM). Route updates are done with make-before-break and incremental updates because the full BGP table has ~1M prefixes and churns constantly; hierarchical FIBs let next-hop changes apply to many prefixes at once.</p>`, followUps: ['What does a hierarchical FIB buy during link failure?', 'How does ECMP interact with LPM?'] });
interview.push({ level: 'E', q: 'What is CGNAT, what breaks under it, and how do we get out of it?', a: `<p>Carrier-grade NAT puts a second layer of NAT in the ISP network: customers' routers get addresses from 100.64.0.0/10 (RFC 6598, kept separate from RFC 1918 to avoid clashes with home networks) and the ISP translates to a shared pool of public IPv4 addresses using port blocks per subscriber. It breaks inbound port forwarding, UPnP, many peer-to-peer and gaming features, IP-based reputation/rate-limits (thousands of users look like one IP), and law-enforcement attribution needs extensive logging. Mitigations: IPv6 (native or via 464XLAT/DS-Lite), explicit port control protocols, tunnels/relays (Tailscale, Cloudflare Tunnel), ICE/STUN/TURN for real-time apps, or paying for a dedicated public IPv4.</p>`, followUps: ['What is 464XLAT?', 'Why is 100.64/10 not RFC 1918?'] });
interview.push({ level: 'I', q: 'How would you debug "I can ping the router but not the internet"?', a: `<p>Work outward layer by layer. Check the IP config (<code>ip addr</code>, <code>ip route</code>): is there a <b>default route</b> and correct mask? 169.254 means DHCP failed. Ping the gateway (ARP resolved? <code>ip neigh</code>), then a public IP like 8.8.8.8 (routing/NAT works?), then a name (DNS broken if the IP works but names fail). Use <code>traceroute</code> to see where the path stops, <code>ip route get 8.8.8.8</code> to see which route and interface the kernel picks, and check that the router has NAT/masquerade enabled and a default route to the ISP. Packet captures show whether SYNs leave and replies return (asymmetric routing, firewall drops, wrong MTU).</p>`, followUps: ['What does a ping to 8.8.8.8 working but google.com failing mean?', 'How would MTU problems look?'] });

registerModule({
  id: 'cs11',
  title: 'IP Addressing, Subnetting, Routing & NAT',
  intro: `<p>This module turns "networking trivia" into <b>numbers you can compute in your head</b>: split a network, find the broadcast address, pick the right route, trace what a laptop does when it joins Wi-Fi, and explain why your home server is invisible to the world. You will go from IPv4 and IPv6 formats, through CIDR, subnet masks and VLSM, to routing tables with longest-prefix match, ARP, DHCP and NAT/PAT. Every topic has an editable visualizer and runnable Python/C++ so you can check your own answers. It builds on the OSI/TCP-IP layers module and prepares you for TCP/UDP and the application layer.</p>`,
  goals: [
    'Compute network, broadcast, first/last host and host count for any IP/prefix (like 192.168.10.77/26) in under a minute',
    'Split a block into subnets with VLSM (e.g. a /24 for 60/30/12/2 hosts) and summarize routes without wasting space',
    'Predict the next hop with longest-prefix match and explain static vs dynamic routing (distance-vector vs link-state)',
    'Compress and expand IPv6 addresses and explain /64 LANs, SLAAC and why IPv6 removes NAT',
    'Trace ARP and DHCP (DORA) for a laptop joining Wi-Fi and explain what changes at each hop',
    'Fill a PAT translation table and explain precisely why NAT breaks inbound connections and how to work around it'
  ],
  prereqs: `Networking Basics: OSI &amp; TCP/IP (layers, MAC vs IP, packets and frames) and comfort with binary numbers and bit operations (AND, OR, NOT).`,
  hours: 10,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
