(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function note(html, label) { return { type: 'text', label: label || 'What is happening and why', html: html }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toks(input, max, hint) {
    var t = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!t.length) throw new Error(hint);
    if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return t;
  }

  /* ======================================================================
     TOPIC 1 — DNS resolution and caching
     ====================================================================== */
  topics.push({
    title: 'DNS Resolution & Caching: The Internet\'s Phone Book',
    analogy: `<p>Imagine you want to call a shop called <b>"Shop"</b> but you only know its name, not its number. You ask a helpful <b>librarian</b> (the <i>recursive resolver</i>). The librarian does not know either, so she walks to the <b>main desk</b> (the <i>root server</i>), which says "anything ending in <code>.com</code>? Go to the .com desk." The <b>.com desk</b> (the <i>TLD server</i>) says "shop.com keeps its own directory — ask their front office." The <b>shop's front office</b> (the <i>authoritative server</i>) finally gives the real phone number.</p>
<p>The clever part: the librarian writes every answer on a <b>sticky note with an expiry time</b> (the <i>TTL</i>). The next person who asks for Shop gets the answer instantly from the sticky note — until the note expires and she has to walk again.</p>`,
    explain: `<p><b>DNS (Domain Name System)</b> turns a name people can remember (<code>api.shop.com</code>) into an IP address computers can route to (<code>203.0.113.10</code>). Every web request, every API call, every mobile app launch starts with it, so it is the very first box in any system design diagram — and the first thing that breaks in many outages.</p>
<h4>The cast of characters</h4>
${H.table(['Who', 'Plain meaning', 'Real examples'], [
  ['Stub resolver', 'The tiny DNS client inside your OS / browser. It only asks one question: "resolver, please find this for me."', 'Chrome\'s host cache, systemd-resolved, the JVM\'s InetAddress cache'],
  ['Recursive resolver', 'The librarian. Does all the walking for you and caches every answer it sees.', 'Your ISP\'s resolver, 8.8.8.8 (Google), 1.1.1.1 (Cloudflare), a company resolver'],
  ['Root servers', 'The main desk. Knows only who runs each top-level domain.', '13 names a–m.root-servers.net, served by 1,900+ machines worldwide via anycast'],
  ['TLD servers', 'The .com / .org / .in desk. Knows which nameservers own each domain.', 'Verisign runs .com and .net'],
  ['Authoritative server', 'The shop\'s own front office. Holds the real records and the final answer.', 'Route 53, Cloudflare DNS, NS1, Google Cloud DNS']
])}
<h4>A cold lookup, step by step</h4>
<ol>
<li>Browser cache → OS cache → (miss) → ask the <b>recursive resolver</b>.</li>
<li>Resolver asks a <b>root</b> server: "api.shop.com?" → <i>referral</i>: "ask the .com servers" (+ their addresses).</li>
<li>Resolver asks a <b>.com TLD</b> server → <i>referral</i>: "shop.com is served by ns1.shop.com".</li>
<li>Resolver asks <b>ns1.shop.com</b> (authoritative) → <i>answer</i>: <code>A 203.0.113.10, TTL 300</code>.</li>
<li>Resolver caches <b>every</b> piece (the .com referral, the shop.com referral and the answer) and returns the IP.</li>
</ol>
<p>The client makes <b>one recursive query</b> ("do everything for me"); the resolver makes <b>iterative queries</b> ("tell me what you know or who to ask next").</p>
<h4>Record types you must know</h4>
${H.table(['Type', 'Holds', 'Typical use'], [
  ['A / AAAA', 'IPv4 / IPv6 address', 'api.shop.com → 203.0.113.10'],
  ['CNAME', 'An alias to another name', 'www.shop.com → shop.cdn-provider.net (hand traffic to a CDN)'],
  ['NS', 'Which servers are authoritative for a zone', 'shop.com → ns1.shop.com'],
  ['MX', 'Mail servers', 'Email routing'],
  ['TXT', 'Free text', 'Domain verification, SPF/DKIM for email'],
  ['SOA', 'Zone metadata, incl. negative-cache TTL', 'How long "does not exist" answers are cached'],
  ['ALIAS / ANAME (vendor)', 'CNAME-like behaviour at the zone apex', 'shop.com (no www) → load balancer name']
])}
<h4>TTL: the speed vs agility dial</h4>
${H.table(['TTL', 'Good for', 'Cost'], [
  [H.c('g', '86400 s (1 day)'), 'Things that never move (NS records, MX)', 'A change takes up to a day to reach everyone'],
  [H.c('b', '300 s (5 min)'), 'Normal web/API records', 'Balanced'],
  [H.c('y', '30–60 s'), 'Failover / GSLB records, planned migrations', 'More queries to your DNS provider, a bit more lookup latency']
])}
<p><b>Key rule:</b> <i>a DNS change is never instant</i>. Anyone holding a cached answer keeps using the old IP until their TTL runs out — and some clients cache longer than you asked.</p>`,
    clues: [
      '"What happens when you type a URL in the browser?" → start with DNS: browser cache → OS → resolver → root → TLD → authoritative',
      '"We changed the IP but some users still hit the old server" → cached answers + TTL (and clients that ignore TTL)',
      '"Migrate to a new load balancer with zero downtime" → lower TTL days before, run both, then flip',
      '"Point the bare domain (shop.com) at a load balancer / CDN" → CNAME is illegal at the apex → ALIAS/ANAME or A records',
      '"First request is slow, later ones are fast" → cold DNS + TCP + TLS; DNS caching and connection reuse fix the later ones',
      '"Route users to the nearest region" → DNS-based GSLB (latency/geo records) — see the Global Load Balancing topic'
    ],
    code: [{
      lang: 'java', title: 'A TTL-respecting DNS cache (what every resolver does)', code: `
import java.util.*;

class DnsCache {
    // One cached answer: the IP and the moment it stops being valid.
    record Entry(String ip, long expiresAtMillis) {}

    private final Map<String, Entry> cache = new HashMap<>();
    // Stands in for the real root -> TLD -> authoritative walk.
    private final Map<String, String> authoritative;
    private final long ttlSeconds;
    int upstreamQueries = 0;          // how often we had to "walk"

    DnsCache(Map<String, String> authoritative, long ttlSeconds) {
        this.authoritative = authoritative;
        this.ttlSeconds = ttlSeconds;
    }

    String resolve(String name, long nowMillis) {
        Entry e = cache.get(name);
        if (e != null && nowMillis < e.expiresAtMillis()) {
            return e.ip();                         // HIT: answer from the sticky note
        }
        cache.remove(name);                        // expired (or never seen)
        upstreamQueries++;                         // MISS: do the slow walk
        String ip = authoritative.get(name);
        if (ip == null) throw new IllegalArgumentException("NXDOMAIN " + name);
        cache.put(name, new Entry(ip, nowMillis + ttlSeconds * 1000));
        return ip;
    }

    public static void main(String[] args) {
        Map<String, String> zone = new HashMap<>(Map.of("api.shop.com", "203.0.113.10"));
        DnsCache r = new DnsCache(zone, 300);
        r.resolve("api.shop.com", 0);              // miss  -> walk
        r.resolve("api.shop.com", 120_000);        // hit   (180 s left)
        zone.put("api.shop.com", "198.51.100.7");  // operator moves the server
        System.out.println(r.resolve("api.shop.com", 200_000)); // still OLD ip: cached!
        System.out.println(r.resolve("api.shop.com", 301_000)); // expired -> new ip
        System.out.println("upstream queries = " + r.upstreamQueries); // 2
    }
}` }, {
      lang: 'text', check: false, title: 'dig +trace shows the real walk (trimmed)', code: `
$ dig +trace api.shop.com

.                 518400  IN  NS   a.root-servers.net.      <- root referral (from resolver hints)
com.              172800  IN  NS   a.gtld-servers.net.      <- root says: ask .com
shop.com.         172800  IN  NS   ns1.shop.com.            <- .com says: ask shop.com's servers
api.shop.com.        300  IN  A    203.0.113.10             <- final answer, cache for 300 s

$ dig api.shop.com          # ask again a minute later via the resolver
api.shop.com.        241  IN  A    203.0.113.10             <- TTL counts DOWN: served from cache` }],
    codeTitle: ['Java sketch: TTL cache', 'Reading dig +trace'],
    viz: {
      title: 'DNS walk: resolver → root → TLD → authoritative, with a TTL cache',
      input: 'api.shop.com ttl=300 at=0,120,400',
      inputLabel: 'hostname  ttl=seconds  at=lookup times in seconds (comma separated)',
      gen: function (input) {
        var t = String(input === undefined || input === null ? '' : input).trim().split(/\s+/).filter(function (x) { return x.length; });
        if (!t.length || t.length > 3) throw new Error('Format: api.shop.com ttl=300 at=0,120,400');
        var name = null, ttl = 300, times = [0, 120, 400];
        t.forEach(function (x) {
          if (/^ttl=/i.test(x)) ttl = Number(x.slice(4));
          else if (/^at=/i.test(x)) times = x.slice(3).split(/[;|]/).join(',').split(',').filter(function (s) { return s.length; }).map(Number);
          else name = x.toLowerCase().replace(/\.$/, '');
        });
        if (!name || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(name)) throw new Error('Give a hostname like api.shop.com');
        if (!(ttl >= 5 && ttl <= 86400)) throw new Error('ttl must be between 5 and 86400 seconds');
        if (!times.length || times.length > 6 || times.some(function (v) { return isNaN(v) || v < 0 || v > 1000000; })) throw new Error('at= needs 1-6 times in seconds, e.g. at=0,120,400');
        times = times.slice().sort(function (a, b) { return a - b; });
        var labels = name.split('.');
        var tld = labels[labels.length - 1] + '.';
        var zone = labels.slice(-2).join('.') + '.';
        var ip = '203.0.113.10';
        var cache = []; // {rec, type, val, ttl, exp}
        var frames = [];
        var nodes = [
          box('C', 'Your laptop (browser + OS cache)', 10, 30, 22),
          box('R', 'Recursive resolver (ISP / 1.1.1.1)', 42, 30, 22),
          box('Root', 'Root server  "."', 82, 8, 22),
          box('TLD', '.' + labels[labels.length - 1] + ' TLD server', 82, 30, 22),
          box('Auth', 'ns1.' + zone.slice(0, -1) + ' (authoritative)', 82, 52, 24)
        ];
        function g(now, hl, ehl, labelsOn, tags) {
          var e = [['C', 'R', labelsOn.CR || ''], ['R', 'Root', labelsOn.RRoot || ''], ['R', 'TLD', labelsOn.RTLD || ''], ['R', 'Auth', labelsOn.RAuth || '']];
          return { type: 'graph', label: 'DNS hierarchy (t = ' + now + ' s)', directed: true, height: 60, nodes: nodes, edges: e, hl: hl, ehl: ehl, tags: tags || {} };
        }
        function tbl(now, hlRow) {
          var rows = cache.map(function (c) { return [c.rec, c.type, c.val, Math.max(0, c.exp - now)]; });
          if (!rows.length) rows = [['(empty)', '', '', '']];
          return { type: 'table', label: 'Resolver cache (TTL counts down)', columns: ['record', 'type', 'value', 'TTL left (s)'], rows: rows, hl: hlRow || {} };
        }
        function find(rec) { for (var i = 0; i < cache.length; i++) if (cache[i].rec === rec) return i; return -1; }
        function put(rec, type, val, ttlS, now) { var i = find(rec); var c = { rec: rec, type: type, val: val, ttl: ttlS, exp: now + ttlS }; if (i >= 0) cache[i] = c; else cache.push(c); return find(rec); }
        var totalMs = 0, totalUp = 0;
        frames.push({ narr: 'Setup: you will look up <b>' + name + '</b> ' + times.length + ' time(s), at t = ' + times.join(', ') + ' s. The answer\'s TTL is <b>' + ttl + ' s</b>. The resolver\'s cache starts <b>empty</b> (a "cold" cache). For simplicity we assume the browser and OS caches are empty too, so every lookup reaches the resolver.',
          parts: [g(times[0], {}, {}, {}), tbl(times[0]), { type: 'vars', label: 'Counters', vals: { 'lookups done': 0, 'upstream queries': 0, 'total DNS wait (ms)': 0 } }] });
        times.forEach(function (now, k) {
          var expired = cache.filter(function (c) { return c.exp <= now; });
          if (expired.length) {
            var hlE = {};
            cache.forEach(function (c, i) { if (c.exp <= now) hlE[i] = 'bad'; });
            frames.push({ narr: 't = ' + now + ' s: before answering, the resolver notices ' + expired.length + ' record(s) whose TTL hit <b>0</b> (red). Expired notes are thrown away — the resolver is <i>not allowed</i> to trust them any more.', parts: [g(now, {}, {}, {}), tbl(now, hlE)] });
            cache = cache.filter(function (c) { return c.exp > now; });
          }
          var ms = 2; // client <-> resolver
          frames.push({ narr: 'Lookup #' + (k + 1) + ' at t = ' + now + ' s: your laptop asks the resolver <b>"what is ' + name + '?"</b> This is a <i>recursive</i> query — "please do all the work for me".', parts: [g(now, { C: 'cur', R: 'cur' }, { 'C-R': 'cur' }, { CR: 'A ' + name + '?' }), tbl(now)] });
          var ai = find(name);
          if (ai >= 0) {
            totalMs += ms;
            frames.push({ narr: '<span class="c-g">Cache HIT.</span> The resolver already has <code>' + name + ' A ' + ip + '</code> with <b>' + (cache[ai].exp - now) + ' s</b> left, so it answers in about <b>' + ms + ' ms</b> without asking anyone else. The TTL it hands back is the <i>remaining</i> time, so your laptop will also forget it at the same moment.', parts: [g(now, { R: 'ok', C: 'ok' }, { 'C-R': 'ok' }, { CR: ip + ' (TTL ' + (cache[ai].exp - now) + ')' }), tbl(now, one(ai, 'ok')), { type: 'vars', label: 'Counters', vals: { 'lookups done': k + 1, 'upstream queries': totalUp, 'total DNS wait (ms)': totalMs }, hl: { 'total DNS wait (ms)': 'ok' } }] });
            return;
          }
          var zi = find(zone), ti = find(tld);
          if (zi < 0 && ti < 0) {
            ms += 20; totalUp++;
            frames.push({ narr: 'Cache MISS and the resolver knows nothing about <code>' + tld + '</code> either, so it starts at the very top: it asks a <b>root server</b>. Root servers never know final answers — they only hand out <i>referrals</i>: "I don\'t know ' + name + ', but here are the servers for <code>' + tld + '</code>." (~20 ms; root servers are anycast so one is usually nearby.)', parts: [g(now, { R: 'cur', Root: 'cur' }, { 'R-Root': 'cur' }, { RRoot: 'NS for ' + tld + '?' }), tbl(now)] });
            ti = put(tld, 'NS', 'a.gtld-servers.net', 172800, now);
            frames.push({ narr: 'The resolver <b>caches the referral</b> for <code>' + tld + '</code> (TTL 172800 s = 2 days). Next time anyone asks for <i>any</i> name ending in ' + tld + ' it can skip the root completely. This is why root servers see surprisingly little traffic.', parts: [g(now, { Root: 'ok', R: 'cur' }, { 'R-Root': 'ok' }, { RRoot: 'referral: ' + tld + ' NS' }), tbl(now, one(ti, 'ok'))] });
          }
          if (zi < 0) {
            ms += 30; totalUp++;
            frames.push({ narr: 'Next the resolver asks a <b>' + tld + ' TLD server</b>: "who is responsible for <code>' + zone + '</code>?" The TLD answers with another referral: the nameservers of the domain (the <i>NS records</i> set at your registrar). (~30 ms)', parts: [g(now, { R: 'cur', TLD: 'cur', Root: 'done' }, { 'R-TLD': 'cur' }, { RTLD: 'NS for ' + zone + '?' }), tbl(now)] });
            zi = put(zone, 'NS', 'ns1.' + zone.slice(0, -1), 86400, now);
            frames.push({ narr: 'Cached: <code>' + zone + ' NS ns1.' + zone.slice(0, -1) + '</code> for 86400 s (1 day). From now on, lookups for <i>any</i> name inside ' + zone + ' go <b>straight to the authoritative server</b>.', parts: [g(now, { TLD: 'ok', R: 'cur' }, { 'R-TLD': 'ok' }, { RTLD: 'referral: ns1' }), tbl(now, one(zi, 'ok'))] });
          } else {
            frames.push({ narr: 'The final answer expired, but the resolver <b>still remembers who owns ' + zone + '</b> (its NS record has ' + (cache[zi].exp - now) + ' s left). So it <span class="c-g">skips the root and the TLD</span> and goes straight to the authoritative server. Hierarchical caching saves two round trips.', parts: [g(now, { R: 'cur', Root: 'done', TLD: 'done' }, {}, {}), tbl(now, one(zi, 'win'))] });
          }
          ms += 40; totalUp++;
          frames.push({ narr: 'The resolver asks the <b>authoritative server</b> ns1.' + zone.slice(0, -1) + ': "A record for ' + name + '?" This server holds the real zone file (in Route 53, Cloudflare DNS etc.) and gives the final answer: <code>' + ip + '</code>, TTL ' + ttl + ' s. (~40 ms)', parts: [g(now, { R: 'cur', Auth: 'cur', Root: 'done', TLD: 'done' }, { 'R-Auth': 'cur' }, { RAuth: 'A ' + name + '?' }), tbl(now)] });
          ai = put(name, 'A', ip, ttl, now);
          totalMs += ms;
          frames.push({ narr: 'Answer cached for <b>' + ttl + ' s</b> and returned to your laptop. This lookup cost about <b>' + ms + ' ms</b> of pure waiting before the browser could even open a TCP connection. ' + (ms > 50 ? 'That is why a cold DNS lookup makes the <i>first</i> request feel slow.' : 'Cached referrals made this miss much cheaper than a fully cold one.'), parts: [g(now, { C: 'ok', R: 'ok', Auth: 'ok', Root: 'done', TLD: 'done' }, { 'R-Auth': 'ok', 'C-R': 'ok' }, { RAuth: ip, CR: ip + ' (TTL ' + ttl + ')' }), tbl(now, one(ai, 'ok')), { type: 'vars', label: 'Counters', vals: { 'lookups done': k + 1, 'upstream queries': totalUp, 'total DNS wait (ms)': totalMs }, hl: { 'upstream queries': 'cur' } }] });
        });
        frames.push({ narr: 'Summary: ' + times.length + ' lookups cost <b>' + totalUp + '</b> upstream queries in total and ~' + totalMs + ' ms of total DNS waiting. Try <code>at=0,10,20,30</code> (all cache hits after the first) or <code>ttl=30</code> (more misses — the price of fast failover).', parts: [g(times[times.length - 1], { C: 'sel' }, {}, {}), tbl(times[times.length - 1]), note('Big TTL = fewer lookups, slower changes. Small TTL = faster changes, more lookups. Referrals (NS) live much longer than answers, so even a "miss" is usually cheap.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Cold vs warm lookup cost', html: `<p>A cold lookup for <code>api.shop.com</code> from Mumbai through a nearby resolver: root ~10 ms + .com ~30 ms + authoritative ~40 ms ≈ <b>80 ms</b>. A warm lookup (answer cached at the resolver) ≈ <b>1–5 ms</b>; cached in the browser ≈ <b>0 ms</b>. On a page that pulls assets from 6 different hostnames, cold DNS alone can add hundreds of ms — which is why sites use few hostnames and add <code>&lt;link rel="dns-prefetch"&gt;</code> / <code>preconnect</code> hints.</p>` },
      { title: 'Zero-downtime migration: lower the TTL first', html: `<p>You must move <code>api.shop.com</code> from the old load balancer (TTL 86400) to a new one.</p>
${H.table(['When', 'Action', 'Why'], [['Day −2', 'Change TTL 86400 → 60', 'Resolvers holding the old 1-day TTL must first age it out — that takes up to a day'], ['Day 0', 'Point the A/ALIAS record to the new LB; keep the old one running', 'Within ~60 s most clients move'], ['Day 0 + hours', 'Watch traffic drain from the old LB', 'Some clients (old JVMs, embedded devices) ignore TTL'], ['Day +7', 'Shut old LB, raise TTL back to 300+', 'Fewer queries, lower cost']])}
<p>Mistake to avoid: lowering the TTL and switching <i>at the same time</i> — the old 86400 s answers are still out there.</p>` },
      { title: 'Negative caching bites after a typo', html: `<p>Someone queries <code>new-api.shop.com</code> five minutes before you create the record. The resolver gets <b>NXDOMAIN</b> ("does not exist") and caches that "no" for the SOA\'s negative TTL (often 300–3600 s). You create the record, but users of that resolver keep seeing "site not found" until the negative entry expires. Fix: create records <i>before</i> announcing them, and keep the SOA minimum/negative TTL modest.</p>` },
      { title: 'Handing a hostname to a CDN with CNAME', html: `<p><code>www.shop.com CNAME shop.cdn-provider.net</code> → the CDN\'s own DNS then answers with the IP of the edge PoP closest to the user. You can <b>not</b> put a CNAME on the bare apex <code>shop.com</code> (it must also hold SOA/NS records, and CNAME must stand alone), so providers offer <b>ALIAS / ANAME / CNAME flattening</b>, which resolves the target on the server side and returns plain A records.</p>`, code: { lang: 'text', check: false, code: `www.shop.com.   300  IN  CNAME  shop.cdn-provider.net.
shop.cdn-provider.net.  20  IN  A  198.51.100.44   ; CDN picks a nearby edge, short TTL` } }
    ],
    deepDive: `<p><b>Transport.</b> DNS runs over UDP port 53 (one packet each way, no handshake). Classic responses were limited to 512 bytes; EDNS(0) raises that, and anything too big sets the TC (truncated) bit so the client retries over TCP. Encrypted variants: <b>DoT</b> (DNS over TLS, port 853) and <b>DoH</b> (DNS over HTTPS) hide queries from the network; browsers increasingly use DoH directly to a chosen resolver.</p>
<p><b>Root scale.</b> There are only 13 root <i>names</i> (a–m) because of the old 512-byte limit, but each is served by many machines via <b>anycast</b> (the same IP announced from hundreds of sites; BGP routes you to the nearest one).</p>
<p><b>TTL in the real world.</b> Resolvers may clamp TTLs (minimum ~30 s, maximum ~1–7 days). Some clients ignore TTL: older JVMs cached forever when a security manager was installed; the modern default is ~30 s (<code>networkaddress.cache.ttl</code>). Mobile OSes, IoT firmware and long-lived connection pools effectively "cache" too — an open TCP connection never re-resolves. <b>Serve-stale</b> (RFC 8767) lets a resolver keep answering with an expired record when the authoritative servers are unreachable, which softens outages.</p>
<p><b>DNS as a load balancer.</b> Returning several A records (round-robin DNS) spreads clients roughly, but DNS has no idea about server health or load, clients often pick the first IP, and caching makes changes slow. Use it to pick a <i>region</i> or a <i>load balancer</i>, then let a real load balancer pick a server.</p>
<p><b>EDNS Client Subnet (ECS).</b> A public resolver in Singapore asking on behalf of a user in Jakarta can pass a truncated client subnet so the authoritative server picks a Jakarta-friendly answer. Without it, GeoDNS sees only the resolver\'s location.</p>
<p><b>Outages are DNS-shaped.</b> Dyn (2016) was a DDoS against an authoritative DNS provider; Facebook (2021) withdrew the BGP routes to its own DNS servers and became unreachable. Lessons: use two DNS providers (or one with strong anycast), keep TTLs sane, and never make your recovery tools depend on the DNS that is broken. <b>DNSSEC</b> signs records so resolvers can detect forged answers (cache poisoning), at the price of operational complexity.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are great at turning intent into records ("Terraform for a Route 53 latency-based record set for api.shop.com in two regions") and at reading <code>dig</code> output with you. Agents that call many external APIs make lots of lookups, so a local caching resolver on the agent host is a cheap latency win.</p>
<p><b>Use AI as a partner:</b> paste <code>dig +trace</code> output and ask "which hop is slow and why?"; ask for a migration runbook with TTL timings and then check the timings yourself.</p>
<p><b>Where AI goes wrong:</b> it happily suggests a <b>CNAME at the zone apex</b>, forgets that lowering a TTL only takes effect after the <i>old</i> TTL expires, invents record types or provider flags, and treats "DNS round robin" as health-aware load balancing. It also tends to forget the JVM/OS cache and connection reuse when explaining why "some users still hit the old IP".</p>
<p><b>What you must still own:</b> the mental model of the cache chain (browser → OS → resolver → authoritative), choosing TTLs as a business trade-off (failover speed vs query cost), and planning DNS changes so that no step depends on everyone instantly seeing the new answer.</p>`,
    problems: [{
      title: 'Cut Over to a New Load Balancer Without Downtime', level: 'Medium', tags: ['dns', 'ttl', 'migration'], companies: ['Amazon', 'Stripe', 'Shopify'],
      statement: `<p><code>api.shop.com</code> currently has an A record (TTL 86400) pointing at an old load balancer in a data center. You are moving to a cloud load balancer with a different IP. The business wants <b>no failed requests</b> and the ability to <b>roll back within minutes</b>. Plan the DNS side of the migration.</p>`,
      constraints: `<p>~20k requests/s, clients include browsers, mobile apps and partner servers (some written in Java). The old LB can run in parallel for at most 2 weeks.</p>`,
      example: `<p>Bad plan: change the record and TTL together on Friday evening → ${H.c('r', 'resolvers keep the old IP for up to 24 h; if the old LB is shut down, those users fail')}. Good plan: ${H.c('g', 'lower TTL two days earlier, run both, flip, watch, keep the old one alive until traffic is ~0')}.</p>`,
      brute: { why: `<p>"Just edit the A record." The old answer is cached in thousands of resolvers for up to <b>86400 s</b>, so the switch is slow and uneven, and rolling back is also slow (the new answer is now cached for a day too). If the old LB is turned off quickly, everyone holding the stale answer gets connection errors.</p>` },
      mcq: { q: 'You lower the TTL from 86400 to 60 at 10:00. When can you be confident (for well-behaved resolvers) that all caches hold the 60 s version?', options: ['Immediately at 10:00', 'At 10:01', 'Around 10:00 the next day', 'Never'], answer: 2, explain: 'Resolvers that cached the record just before 10:00 hold it for up to 86400 s. Only after the old TTL has fully elapsed do all caches reflect the new 60 s TTL.' },
      hints: [`<p>Hint 1: a change only reaches a resolver when its cached copy expires. Which TTL matters at the moment you flip — the new one or the old one?</p>`, `<p>Hint 2: make both the old and new load balancers able to serve the same traffic, so it does not matter which IP a client has cached.</p>`, `<p>Hint 3: recipe — lower TTL early → wait one old TTL → flip → monitor both LBs → keep old alive for clients that ignore TTL → raise TTL back.</p>`],
      solution: {
        approach: `<p><b>1. Prepare (T−2 days).</b> Lower the TTL of <code>api.shop.com</code> from 86400 to 60 s. Wait at least one full old TTL (24 h) plus a margin so every resolver has picked up the short TTL.</p>
<p><b>2. Make both paths equivalent.</b> Stand up the new cloud LB with the same TLS certificate, same routing rules and same backends (or backends that share the same database/session store). Test it by overriding DNS locally (<code>/etc/hosts</code> or <code>curl --resolve</code>).</p>
<p><b>3. Flip.</b> Change the record to the new LB (as an ALIAS if it is the apex). Optionally use <b>weighted records</b> (90/10 → 50/50 → 0/100) for a gradual move. Rollback = flip back; it takes ~60 s because the TTL is short.</p>
<p><b>4. Watch.</b> Track requests on <i>both</i> LBs. Expect a long tail on the old one from clients that ignore TTL (old JVM settings, embedded devices, partner servers with long-lived connection pools). Contact big partners if they stay on the old IP.</p>
<p><b>5. Retire.</b> When old-LB traffic is ~0 (days, not minutes), shut it down and raise the TTL back to 300 s or more to cut query cost and lookup latency.</p>`,
        complexity: `<p>Calendar time ≈ old TTL + observation window (≈ 3–7 days). Extra cost: two LBs for a week and ~1400× more DNS queries while TTL is 60 s instead of 86400 s (still cheap: DNS queries cost cents per million).</p>`,
        followUps: ['How would you do the same move for a mobile app that pins IPs or caches DNS aggressively?', 'What changes if the record is the bare apex shop.com?', 'How do weighted DNS records help a canary migration?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — CDN: push vs pull, hits and misses
     ====================================================================== */
  topics.push({
    title: 'CDN: Push vs Pull, Cache Hits & Misses',
    analogy: `<p>A big online store keeps everything in one <b>central warehouse</b> (the <i>origin</i>). Shipping from there to every city is slow. So it opens small <b>neighbourhood shops</b> (the <i>edge PoPs</i>, points of presence) in hundreds of cities.</p>
<p>A <b>pull</b> shop starts with empty shelves: the first time someone asks for an item, the shop orders it from the warehouse (slow, once), puts it on the shelf, and every later customer gets it instantly. A <b>push</b> shop is stocked <i>in advance</i>: before a big book launch, the publisher ships boxes to every shop overnight, so even the very first customer gets it instantly — but you pay to stock shelves in towns where nobody may buy it.</p>`,
    explain: `<p>A <b>CDN (Content Delivery Network)</b> is a worldwide set of caching reverse proxies. Users connect to the nearest <b>edge</b> (picked by DNS or anycast — see the DNS and Global Load Balancing topics). The edge answers from its cache when it can (a <b>hit</b>) and goes back to your <b>origin</b> only when it must (a <b>miss</b>).</p>
<h4>Why it matters</h4>
<ul>
<li><b>Latency:</b> light needs ~65 ms just to cross from Mumbai to Virginia one way. An edge 10 ms away turns a 250 ms fetch into a 10 ms one.</li>
<li><b>Origin protection:</b> at a 99% hit ratio the origin sees only 1 of every 100 requests.</li>
<li><b>Bandwidth cost and DDoS absorption:</b> the CDN\'s huge network soaks up traffic before it reaches you.</li>
</ul>
<h4>Pull vs push</h4>
${H.table(['', 'Pull (origin pull)', 'Push (pre-positioning)'], [
  ['How content arrives', 'Edge fetches from origin on the first request (cache miss), then caches it', 'You upload / the system copies content to edges <i>before</i> anyone asks'],
  ['First request', H.c('r', 'Slow (miss goes to origin)'), H.c('g', 'Fast (already there)')],
  ['Storage used', 'Only what people actually request', 'Everything you push, everywhere you push it'],
  ['Effort', 'Almost none — set Cache-Control headers', 'You manage uploads, expiry and deletions'],
  ['Best for', 'Websites, APIs, long-tail catalogs, anything unpredictable', 'Huge predictable files: a new episode at 9 pm, game patches, OS updates, model weights'],
  ['Real examples', 'Cloudflare, CloudFront, Fastly, Akamai default mode', 'Netflix Open Connect fills appliances off-peak; app stores pre-stage updates']
])}
<h4>The words you will be asked about</h4>
<ul>
<li><b>Cache key</b> — what makes two requests "the same". Usually host + path (+ some query params). A bad key (including random tracking params) destroys the hit ratio.</li>
<li><b>Cache-Control</b> — origin headers that tell the CDN and browser how long to keep a response: <code>max-age</code> (browser), <code>s-maxage</code> (shared caches like CDNs), <code>no-store</code>, <code>private</code>, <code>stale-while-revalidate</code>, <code>stale-if-error</code>.</li>
<li><b>Revalidation</b> — when a cached copy is old, the edge asks the origin "changed since ETag X?" and gets a tiny <code>304 Not Modified</code> if not.</li>
<li><b>Invalidation / purge</b> — tell every edge to drop an object now. Simpler and safer: <b>versioned file names</b> (<code>app.3f9a1c.js</code>) cached for a year, so a new deploy simply uses a new name.</li>
<li><b>Origin shield</b> (tiered cache) — one middle cache between all edges and the origin, so 300 edge misses become 1 origin request.</li>
<li><b>Hit ratio</b> — hits ÷ total requests. The number every CDN dashboard leads with.</li>
</ul>`,
    clues: [
      '"Users all over the world", "static assets", "images/video" → put a CDN in front',
      '"Origin is overloaded by repeated identical requests" → cache at the edge + origin shield + request collapsing',
      '"New episode / patch released at a known time to millions" → push / pre-warm the CDN',
      '"Huge catalog, most items rarely watched (long tail)" → pull; pushing everything wastes storage',
      '"Deploy changed CSS but users still see the old one" → cache-busting with hashed filenames, not purges',
      '"CDN hit ratio is low" → look at the cache key (query strings, cookies, Vary) and TTLs'
    ],
    code: [{
      lang: 'python', run: true, title: 'Pull CDN edge with LRU eviction + origin shield (runnable)', code: `
from collections import OrderedDict

class Edge:
    """A pull-CDN edge: small LRU cache in front of a bigger shield cache."""
    def __init__(self, capacity, shield):
        self.capacity = capacity
        self.cache = OrderedDict()   # key -> body, oldest first
        self.shield = shield         # shared middle tier (a set of keys here)
        self.hits = self.misses = self.origin_fetches = 0

    def get(self, key):
        if key in self.cache:                 # HIT: serve locally
            self.cache.move_to_end(key)       # mark as most recently used
            self.hits += 1
            return "edge-hit"
        self.misses += 1
        if key in self.shield:                # edge miss, shield hit
            where = "shield-hit"
        else:                                 # both missed: go to origin once
            self.origin_fetches += 1
            self.shield.add(key)
            where = "origin"
        self.cache[key] = "body-of-" + key    # pull: store on the way back
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)    # evict least recently used
        return where

shield = set()
mumbai = Edge(capacity=3, shield=shield)
tokyo = Edge(capacity=3, shield=shield)
requests = ["/v/1.ts", "/v/2.ts", "/v/1.ts", "/logo.png", "/v/3.ts", "/v/1.ts", "/v/2.ts"]
for r in requests:
    print("mumbai", r, "->", mumbai.get(r))
for r in ["/v/1.ts", "/v/2.ts", "/v/1.ts"]:
    print("tokyo ", r, "->", tokyo.get(r))   # Tokyo misses, but the shield saves the origin

total = mumbai.hits + mumbai.misses + tokyo.hits + tokyo.misses
hits = mumbai.hits + tokyo.hits
origin = mumbai.origin_fetches + tokyo.origin_fetches
print(f"edge hit ratio = {hits}/{total} = {hits / total:.0%}, origin fetches = {origin}")
` }, {
      lang: 'text', check: false, title: 'nginx as a small pull cache in front of an origin', code: `
# A mini "edge": cache responses from the origin on local disk.
proxy_cache_path /var/cache/edge levels=1:2 keys_zone=edge:100m
                 max_size=50g inactive=7d use_temp_path=off;

server {
    listen 443 ssl;
    server_name static.shop.com;

    location / {
        proxy_pass https://origin.shop.internal;
        proxy_cache edge;
        proxy_cache_key $scheme$host$uri;          # ignore query strings (tracking params)
        proxy_cache_valid 200 301 1h;              # used if origin sends no Cache-Control
        proxy_cache_lock on;                       # collapse concurrent misses: 1 origin fetch
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        proxy_cache_background_update on;          # refresh in background, serve stale meanwhile
        add_header X-Cache-Status $upstream_cache_status;   # HIT / MISS / STALE in responses
    }
}` }, {
      lang: 'http', title: 'Cache-Control headers that make a CDN work', code: `
# Fingerprinted asset: safe to cache "forever"
GET /assets/app.3f9a1c.js
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable

# HTML page: browsers revalidate, CDN keeps it 60 s and may serve stale while refreshing
GET /index.html
HTTP/1.1 200 OK
Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=30
ETag: "v42"

# Personal data: never in a shared cache
GET /api/me
HTTP/1.1 200 OK
Cache-Control: private, no-store` }],
    codeTitle: ['Pull CDN simulation (Python)', 'nginx caching proxy', 'Cache headers'],
    viz: [{
      title: 'CDN cache hit / miss flow (edge LRU + origin shield)',
      input: 'cap=3 /v/1.ts /v/2.ts /v/1.ts /logo.png /v/3.ts /v/1.ts /v/2.ts /v/4.ts /v/2.ts',
      inputLabel: 'cap=edge capacity, then requested paths (space separated)',
      gen: function (input) {
        var t = toks(input, 17, 'Format: cap=3 /a.js /b.png /a.js');
        var cap = 3, reqs = [];
        t.forEach(function (x) { if (/^cap=\d+$/i.test(x)) cap = Number(x.slice(4)); else reqs.push(x); });
        if (cap < 1 || cap > 8) throw new Error('cap must be between 1 and 8');
        if (!reqs.length) throw new Error('Add some paths after cap=, e.g. /a.js /b.png /a.js');
        if (reqs.length > 16) throw new Error('Use at most 16 requests');
        var edge = [], shield = [], hits = 0, misses = 0, sh = 0, org = 0, frames = [];
        var nodes = [box('U', 'Viewer (Mumbai)', 9, 30, 16), box('E', 'Edge PoP Mumbai (~10 ms)', 36, 30, 20), box('S', 'Origin shield Singapore (~60 ms)', 64, 30, 20), box('O', 'Origin us-east (~250 ms)', 91, 30, 16)];
        function g(hl, ehl, lab) { return { type: 'graph', label: 'Request path', directed: true, height: 60, nodes: nodes, edges: [['U', 'E', lab.UE || ''], ['E', 'S', lab.ES || ''], ['S', 'O', lab.SO || '']], hl: hl, ehl: ehl }; }
        function st(extraHl) {
          var total = hits + misses;
          return { type: 'vars', label: 'Scoreboard', vals: { 'edge hits': hits, 'edge misses': misses, 'shield hits': sh, 'origin fetches': org, 'edge hit ratio': total ? Math.round(100 * hits / total) + '%' : '-' }, hl: extraHl || {} };
        }
        frames.push({ narr: 'A <b>pull</b> CDN starts cold: the Mumbai edge holds at most <b>' + cap + '</b> objects (LRU: the least recently used one is evicted when full). Between all edges and the origin sits an <b>origin shield</b> — a bigger regional cache that many edges share.', parts: [g({}, {}, {}), { type: 'queue', label: 'Edge cache (oldest → newest)', items: [], frontLabel: 'evict next', backLabel: 'newest' }, { type: 'set', label: 'Shield cache', items: [] }, st()] });
        reqs.forEach(function (r, k) {
          var i = edge.indexOf(r);
          if (i >= 0) {
            hits++;
            var qh = {}; qh[i] = 'ok';
            frames.push({ narr: 'Request ' + (k + 1) + ': <code>' + H.esc(r) + '</code> → <span class="c-g">edge HIT</span>. Served straight from Mumbai in ~10 ms; the origin never hears about it. (Highlighted item was found in the cache.)', parts: [g({ U: 'ok', E: 'ok' }, { 'U-E': 'ok' }, { UE: 'HIT ' + r }), { type: 'queue', label: 'Edge cache (oldest → newest)', items: edge.slice(), hl: qh, frontLabel: 'evict next', backLabel: 'newest' }, { type: 'set', label: 'Shield cache', items: shield.slice() }, st({ 'edge hits': 'ok' })] });
            edge.splice(i, 1); edge.push(r);
            frames.push({ narr: 'LRU bookkeeping: <code>' + H.esc(r) + '</code> moves to the <b>newest</b> end, so popular objects stay and rarely used ones drift towards eviction.', parts: [g({ E: 'cur' }, {}, {}), { type: 'queue', label: 'Edge cache (oldest → newest)', items: edge.slice(), hl: one(edge.length - 1, 'cur'), frontLabel: 'evict next', backLabel: 'newest' }, { type: 'set', label: 'Shield cache', items: shield.slice() }, st()] });
            return;
          }
          misses++;
          var inShield = shield.indexOf(r) >= 0, evicted = null;
          var narr = 'Request ' + (k + 1) + ': <code>' + H.esc(r) + '</code> → <span class="c-r">edge MISS</span>. ';
          var hl, ehl, lab, shHl = {};
          if (inShield) {
            sh++;
            narr += 'The edge asks the shield, which <span class="c-g">has it</span> (~60 ms). The origin is still untouched — that is the whole point of a shield.';
            hl = { U: 'ok', E: 'cur', S: 'ok' }; ehl = { 'U-E': 'cur', 'E-S': 'ok' }; lab = { UE: 'MISS', ES: 'shield HIT' };
            shHl[r] = 'ok';
          } else {
            org++;
            shield.push(r);
            narr += 'The shield misses too, so <b>one</b> request goes all the way to the origin (~250 ms). On the way back the object is stored in the shield <i>and</i> the edge ("pull through").';
            hl = { U: 'ok', E: 'cur', S: 'cur', O: 'bad' }; ehl = { 'U-E': 'cur', 'E-S': 'cur', 'S-O': 'bad' }; lab = { UE: 'MISS', ES: 'MISS', SO: 'fetch ' + r };
            shHl[r] = 'ok';
          }
          edge.push(r);
          if (edge.length > cap) { evicted = edge.shift(); narr += ' The edge was full, so it <span class="c-r">evicts</span> the least recently used object <code>' + H.esc(evicted) + '</code>.'; }
          frames.push({ narr: narr, parts: [g(hl, ehl, lab), { type: 'queue', label: 'Edge cache (oldest → newest)', items: edge.slice(), hl: one(edge.length - 1, 'ok'), frontLabel: 'evict next', backLabel: 'newest' }, { type: 'set', label: 'Shield cache', items: shield.slice(), hl: shHl }, st(inShield ? { 'shield hits': 'ok' } : { 'origin fetches': 'bad' })] });
        });
        var total = hits + misses;
        frames.push({ narr: 'Done: ' + total + ' requests, ' + hits + ' edge hits (' + Math.round(100 * hits / total) + '%), and only <b>' + org + '</b> origin fetches — one per <i>distinct</i> object, no matter how many edges or viewers. Try a bigger <code>cap=</code> to see the hit ratio climb, or repeat one path many times to see a "hot" object.', parts: [g({ O: 'sel' }, {}, {}), { type: 'queue', label: 'Edge cache (oldest → newest)', items: edge.slice(), frontLabel: 'evict next', backLabel: 'newest' }, { type: 'set', label: 'Shield cache', items: shield.slice() }, st({ 'edge hit ratio': 'sel' })] });
        return frames;
      }
    }, {
      title: 'Push vs pull for a new episode release',
      gen: function () {
        var cols = ['PoP', 'PULL CDN', 'PUSH CDN'];
        function tb(rows, hl) { return { type: 'table', label: 'State of each edge PoP', columns: cols, rows: rows, hl: hl || {} }; }
        return [
          { narr: '20:55 — Episode 5 (2 GB of video segments) lands in the origin. Release is at 21:00, millions will press play at once.', parts: [tb([['Mumbai', 'empty', 'empty'], ['Tokyo', 'empty', 'empty'], ['Frankfurt', 'empty', 'empty'], ['São Paulo', 'empty', 'empty']]), { type: 'vars', label: 'Origin', vals: { 'episode 5': 'uploaded', 'origin load': 'idle' } }] },
          { narr: '<b>Push</b>: overnight (or right after upload) the system copies the episode to every PoP. Bandwidth is used <i>before</i> the rush, when it is cheap. <b>Pull</b> does nothing yet.', parts: [tb([['Mumbai', 'empty', 'ready ✓'], ['Tokyo', 'empty', 'ready ✓'], ['Frankfurt', 'empty', 'ready ✓'], ['São Paulo', 'empty', 'ready ✓']]), { type: 'vars', label: 'Origin', vals: { 'episode 5': 'copied to 4 PoPs', 'origin load': 'moderate, off-peak' }, hl: { 'episode 5': 'ok' } }] },
          { narr: '21:00:00 — first viewers press play in every city. <b>Pull</b>: every PoP misses at the same moment and asks the origin (a mini thundering herd, softened by request collapsing and a shield). <b>Push</b>: every first viewer gets a hit.', parts: [tb([['Mumbai', 'MISS → origin', 'HIT'], ['Tokyo', 'MISS → origin', 'HIT'], ['Frankfurt', 'MISS → origin', 'HIT'], ['São Paulo', 'MISS → origin', 'HIT']], { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad' }), { type: 'vars', label: 'Origin', vals: { 'origin load': 'SPIKE (pull only)' }, hl: { 'origin load': 'bad' } }] },
          { narr: '21:00:05 — after the first fetch, pull PoPs are warm and both models serve hits. Pull paid a few seconds of slow starts; push paid storage and transfer in advance.', parts: [tb([['Mumbai', 'HIT', 'HIT'], ['Tokyo', 'HIT', 'HIT'], ['Frankfurt', 'HIT', 'HIT'], ['São Paulo', 'HIT', 'HIT']], { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' }), { type: 'vars', label: 'Origin', vals: { 'origin load': 'calm' } }] },
          { narr: 'Now the <b>long tail</b>: a 2009 documentary watched by 3 people a month, only in São Paulo. Push would have copied it to all PoPs (wasted storage everywhere). Pull fetches it once, only where it is wanted, and lets it be evicted later.', parts: [tb([['Mumbai', 'not stored', 'stored, never watched'], ['Tokyo', 'not stored', 'stored, never watched'], ['Frankfurt', 'not stored', 'stored, never watched'], ['São Paulo', 'MISS once, then HIT', 'HIT']], { 3: 'win' })] },
          { narr: 'Rule of thumb: <b>push the head, pull the tail</b>. Predictable, huge, time-critical content (new releases, game patches) gets pushed/pre-warmed; everything else is pulled. Big streaming services do exactly this hybrid.', parts: [note('<b>Push</b> = pay in storage + planning, win on first-request latency and origin safety.<br><b>Pull</b> = zero effort, pay a miss per object per PoP, perfect for unpredictable demand.', 'Takeaway')] }
        ];
      }
    }],
    examples: [
      { title: 'Hit ratio math: why 95% vs 99% is a 5× difference', html: `<p>Traffic: 100,000 requests/s for static content.</p>
${H.table(['Hit ratio', 'Requests reaching origin', 'Origin servers needed (2k rps each)'], [['90%', '10,000 /s', '5'], ['95%', '5,000 /s', '3'], [H.c('g', '99%'), H.c('g', '1,000 /s'), H.c('g', '1')]])}
<p>Going from 95% to 99% sounds tiny but cuts origin load <b>5×</b>. Always reason about the <i>miss</i> ratio (5% vs 1%), not the hit ratio.</p>` },
      { title: 'Deploying a new CSS file without purges', html: `<p>Build step names the file after its content hash: <code>main.8c1d2e.css</code>. HTML (short TTL, e.g. <code>s-maxage=60</code>) references it. Next deploy produces <code>main.b77f01.css</code>, the HTML points to the new name, and the old file simply ages out. No purge race, instant rollback (point HTML back), and assets can be cached for a year with <code>immutable</code>.</p>` },
      { title: 'Video streaming = perfect CDN workload', html: `<p>HLS/DASH split a video into 2–6 second <b>segments</b> (<code>/v/42/1080p/seg_0001.ts</code>). Every viewer of the same title and bitrate requests the <i>same</i> segment URLs, so a popular live match or new episode can hit &gt;98% at the edge. The manifest (playlist) changes often for live streams, so it gets a tiny TTL (1–2 s); segments never change, so they get long TTLs.</p>` },
      { title: 'Caching an API response safely', html: `<p><code>GET /api/products/42</code> is the same for every user → <code>Cache-Control: public, s-maxage=30, stale-while-revalidate=60</code>. 30 s of staleness on a product page is fine, and the CDN absorbs a flash sale. <code>GET /api/cart</code> is per user → <code>private, no-store</code>. Never let a response with <code>Set-Cookie</code> or user data into the shared cache — that is how one user sees another user\'s account page.</p>` }
    ],
    deepDive: `<p><b>Request collapsing (coalescing).</b> When 10,000 viewers miss on the same new object at the same instant, a good edge sends <b>one</b> origin request and makes the rest wait for it (nginx <code>proxy_cache_lock</code>, Varnish/Fastly do this by default). Without it a popular miss becomes a thundering herd against your origin.</p>
<p><b>Tiered caching.</b> Edge → regional/shield → origin. Each tier has a bigger, colder cache. With 300 PoPs and no shield, one new object can cause 300 origin fetches; with a shield it causes one.</p>
<p><b>Cache-key hygiene.</b> Strip marketing params (<code>utm_*</code>, <code>fbclid</code>), normalise case, sort query params. <code>Vary: User-Agent</code> can split one object into thousands of variants — vary on a normalised device class instead. Cookies on static paths often make CDNs bypass caching entirely.</p>
<p><b>Staleness as a feature.</b> <code>stale-while-revalidate</code> serves the old copy instantly while fetching a fresh one in the background; <code>stale-if-error</code> keeps the site up when the origin is down — the CDN becomes a reliability layer, not just a speed layer.</p>
<p><b>Purges</b> propagate in seconds on modern CDNs but are still eventually consistent; tag-based purge (surrogate keys) lets you drop "everything about product 42" at once. <b>Signed URLs / tokens</b> let the edge enforce access (paid video) without calling origin. <b>Range requests</b> let video players seek; the CDN must cache partial objects sensibly.</p>
<p><b>Dynamic acceleration.</b> Even uncacheable requests benefit: TLS and TCP handshakes terminate at a nearby edge (saving 1–2 long round trips), and the edge keeps warm, persistent connections to the origin over the CDN\'s optimised backbone. HTTP/3 (QUIC) is now standard at most CDN edges. <b>Edge compute</b> (Workers, Compute@Edge, Lambda@Edge) runs code at the PoP for auth checks, A/B splits, header rewrites.</p>
<p><b>Cost.</b> CDN egress is billed per GB and varies by region; a 1% hit-ratio gain on petabytes is real money. Big players run <b>multi-CDN</b> setups steered by real-user measurements for both price and resilience.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI crawlers and agents now generate a large share of traffic on many sites, often fetching rare long-tail pages that are <i>not</i> in cache, so they hammer origins. CDNs added bot management, "pay per crawl" and robots rules for AI crawlers. Large model weights and datasets (tens of GB) are distributed through CDNs and object-storage edges — a classic <b>push/pre-warm</b> case before a big rollout to GPU clusters.</p>
<p><b>Personalised content hurts caching:</b> AI-generated, per-user pages are uncacheable by default. Patterns that help: cache the shared shell and stream the personal part, or cache model outputs by a normalised prompt key (semantic caching) at the edge where it is safe.</p>
<p><b>Use AI as a partner:</b> feed it a sample of CDN logs and ask it to group misses by cache-key component ("which query params create the most unique keys?"). Ask it to draft Cache-Control policies per route, then review each one for user data leaks.</p>
<p><b>Where AI goes wrong:</b> it suggests <code>public, max-age=31536000</code> on HTML or API responses with user data, forgets <code>Vary</code> implications, and recommends purging on every deploy instead of hashed file names.</p>
<p><b>What you must still own:</b> deciding what is safe to share between users, the miss-ratio math for origin sizing, and the push-vs-pull call for each content type.</p>`,
    problems: [{
      title: 'Why Is Our CDN Hit Ratio Only 40%?', level: 'Medium', tags: ['cdn', 'cache key', 'debugging'], companies: ['Cloudflare', 'Netflix', 'Flipkart'],
      statement: `<p>An e-commerce site put all product images and JS/CSS behind a pull CDN. The dashboard shows an edge hit ratio of <b>40%</b> and the origin is still overloaded during sales. Find the likely causes and fix them.</p>`,
      constraints: `<p>~50k static requests/s at peak. Images are served from <code>/img/{productId}.jpg?w=400&amp;utm_source=…</code>. JS/CSS are deployed 10 times a day under fixed names like <code>/static/app.js</code> and the team purges everything after each deploy. Responses include <code>Set-Cookie: session=…</code> because the app server adds it everywhere.</p>`,
      example: `<p>Sample log: ${H.c('r', '/img/42.jpg?w=400&amp;utm_source=mail&amp;fbclid=abc → MISS')}, ${H.c('r', '/img/42.jpg?w=400&amp;utm_source=ad → MISS')}, ${H.c('g', '/img/42.jpg?w=400 → HIT')} — same image, three cache keys.</p>`,
      brute: { why: `<p>"Add more origin servers" or "buy a bigger CDN plan". Neither fixes the root cause: the CDN is treating identical content as different objects (bad cache key), refusing to cache responses with cookies, and being emptied 10 times a day by full purges. You pay for a CDN and still run at origin scale.</p>` },
      mcq: { q: 'Which single change most likely gives the biggest hit-ratio jump here?', options: ['Increase origin server count', 'Exclude tracking query params (utm_*, fbclid) from the cache key', 'Lower the TTL', 'Switch from pull to push for images'], answer: 1, explain: 'Tracking params create a unique cache key per campaign/click, so the same image is fetched again and again. Normalising the key merges them into one object.' },
      hints: [`<p>Hint 1: look at what makes two requests "the same" for the CDN — the cache key. Count how many distinct keys exist for one product image.</p>`, `<p>Hint 2: check response headers — many CDNs refuse to cache responses that set cookies or say <code>private</code>/<code>no-cache</code>.</p>`, `<p>Hint 3: deploys purge everything 10× a day. How can a deploy change JS/CSS without throwing the whole cache away? (Think file names.)</p>`],
      solution: {
        approach: `<p><b>1. Fix the cache key.</b> Keep only params that change the bytes (<code>w</code>, <code>format</code>); drop <code>utm_*</code>, <code>fbclid</code>, <code>gclid</code>; sort what remains. Better still, move resize options into the path (<code>/img/42/w400.jpg</code>) and restrict widths to a few allowed sizes so the variant count is small.</p>
<p><b>2. Stop cookies leaking onto static responses.</b> Strip <code>Set-Cookie</code> on <code>/img</code> and <code>/static</code> at the origin (or at the CDN), and ignore request cookies in the key for those paths. Send <code>Cache-Control: public, max-age=…</code> explicitly.</p>
<p><b>3. Replace purges with versioned assets.</b> Build <code>/static/app.3f9a1c.js</code>; cache with <code>max-age=31536000, immutable</code>. Only the HTML (short TTL) changes per deploy. No more full purges.</p>
<p><b>4. Add an origin shield and request collapsing</b> so the remaining misses from hundreds of PoPs become single origin fetches.</p>
<p><b>5. Pre-warm before big sales</b>: request the top 1,000 product images through each major PoP (a light "push") an hour before the sale.</p>
<p><b>6. Measure</b>: hit ratio by path prefix, number of unique keys per object, origin rps. Expected result: images &gt; 95%, static assets &gt; 99%.</p>`,
        complexity: `<p>Origin load ∝ miss ratio: going from 60% misses to 3% misses cuts origin traffic ~20×. Storage at the edge grows only with true variants (products × allowed widths).</p>`,
        followUps: ['How would you cache images that need user-specific watermarks?', 'What if marketing insists the utm params must reach analytics?', 'How do you measure hit ratio per PoP and spot a cold PoP?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Forward vs reverse proxy
     ====================================================================== */
  topics.push({
    title: 'Forward Proxy vs Reverse Proxy',
    analogy: `<p>A <b>forward proxy</b> is your <b>personal assistant</b>. You say "book me a table at Luigi\'s"; the assistant makes the call. Luigi\'s sees the assistant\'s number, not yours. Your company can also tell the assistant "never call these places" — that is a corporate web filter.</p>
<p>A <b>reverse proxy</b> is a <b>hotel receptionist</b>. Guests call one main number; the receptionist answers, checks who they are, and connects them to the right room. Guests never learn the direct line of any room, and the receptionist can take messages, turn away troublemakers, or send calls to another room when one is busy.</p>
<p>Same job (a middleman passing messages), but the forward proxy <b>works for the client</b> and the reverse proxy <b>works for the server</b>.</p>`,
    explain: `<p>A <b>proxy</b> is a server that receives a request and makes a new request on someone\'s behalf. The only real question is: <i>whose side is it on?</i></p>
${H.table(['', 'Forward proxy', 'Reverse proxy'], [
  ['Sits in front of', 'Clients (your laptop, your servers making outbound calls)', 'Servers (your web/app fleet)'],
  ['Who configures it', 'The client side (browser settings, <code>HTTPS_PROXY</code> env var, PAC file, or transparent interception)', 'The service owner (DNS for shop.com points at it)'],
  ['Who it hides', 'Hides the <b>client</b> from the website', 'Hides the <b>servers</b> from the client'],
  ['Typical jobs', 'Content filtering, egress allowlists, auditing, caching downloads, giving many machines one static outbound IP, bypassing geo-blocks', 'TLS termination, load balancing, caching, compression, routing by path/host, rate limiting, WAF, auth, hiding internal topology'],
  ['Examples', 'Squid, corporate proxies (Zscaler), egress gateways, VPN-style privacy proxies, an AI-agent sandbox proxy', 'nginx, HAProxy, Envoy, Traefik, cloud load balancers, CDNs, API gateways']
])}
<h4>How a forward proxy carries HTTPS</h4>
<p>The client sends <code>CONNECT shop.com:443</code> to the proxy; the proxy opens a TCP tunnel and just copies encrypted bytes both ways. It sees the <i>hostname</i> but not the URL path or body — unless the company installs its own root certificate on laptops and does TLS inspection.</p>
<h4>How a reverse proxy keeps the real client IP</h4>
<p>The app server\'s TCP connection comes <b>from the proxy</b>, so <code>remoteAddr</code> is the proxy\'s IP. The proxy therefore adds headers:</p>
<ul>
<li><code>X-Forwarded-For: 203.0.113.7</code> (client IP, each proxy appends one more), <code>X-Forwarded-Proto: https</code>, <code>X-Forwarded-Host</code> — or the standard <code>Forwarded: for=203.0.113.7;proto=https</code>.</li>
<li>For non-HTTP (L4) proxies, the <b>PROXY protocol</b> prepends a tiny header with the original IP/port to the TCP stream.</li>
</ul>
<h4>Family tree</h4>
<p>A <b>load balancer</b> is a reverse proxy that spreads traffic over many servers. A <b>CDN</b> is a worldwide caching reverse proxy. An <b>API gateway</b> is a reverse proxy with API features (auth, quotas, transformations). A <b>service-mesh sidecar</b> (Envoy) is both: a forward proxy for the app\'s outbound calls and a reverse proxy for its inbound calls.</p>`,
    clues: [
      '"Hide our internal servers" / "single entry point" / "terminate TLS in one place" → reverse proxy',
      '"Employees must not reach certain sites" / "log all outbound traffic" → forward proxy',
      '"Partner allowlists our IP; we have 200 autoscaling servers" → egress (forward) proxy or NAT gateway with a static IP',
      '"Our logs show every request coming from the load balancer IP" → X-Forwarded-For / PROXY protocol',
      '"Slow mobile clients tie up our app threads" → reverse proxy buffering in front of the app',
      '"Agent / sandbox may only call approved domains" → forward proxy with a domain allowlist'
    ],
    code: [{
      lang: 'text', check: false, title: 'nginx reverse proxy: TLS termination + routing + real-IP headers', code: `
upstream app_pool {
    server 10.0.0.11:8080;
    server 10.0.0.12:8080;
    keepalive 64;                       # reuse connections to backends
}

server {
    listen 443 ssl http2;
    server_name shop.com;
    ssl_certificate     /etc/ssl/shop.com.crt;
    ssl_certificate_key /etc/ssl/shop.com.key;

    client_max_body_size 10m;           # protect the app from giant uploads
    gzip on;

    location / {
        proxy_pass http://app_pool;     # TLS ends here; plain HTTP inside the VPC
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}` }, {
      lang: 'text', check: false, title: 'Squid forward proxy: only allow approved outbound domains', code: `
http_port 3128
acl office_net src 10.1.0.0/16
acl allowed_sites dstdomain .github.com .pypi.org .api.partner-bank.com
acl SSL_ports port 443
acl CONNECT method CONNECT

http_access deny CONNECT !SSL_ports          # tunnels only to 443
http_access allow office_net allowed_sites   # approved destinations
http_access deny all                         # everything else blocked + logged
access_log /var/log/squid/access.log` }, {
      lang: 'java', title: 'Finding the real client IP safely (trust only your own proxies)', code: `
import java.util.*;

class ClientIp {
    // Proxies WE run. Anything else in X-Forwarded-For could be forged by the client.
    static final Set<String> TRUSTED = Set.of("10.0.0.2", "10.0.0.3");

    /**
     * Walk X-Forwarded-For from RIGHT to LEFT (the right side was added by
     * the proxies closest to us). The first address that is not one of our
     * proxies is the real client.
     */
    static String realClientIp(String remoteAddr, String xForwardedFor) {
        if (!TRUSTED.contains(remoteAddr) || xForwardedFor == null || xForwardedFor.isBlank()) {
            return remoteAddr;                       // direct connection: trust the socket
        }
        String[] hops = xForwardedFor.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String ip = hops[i].trim();
            if (!TRUSTED.contains(ip)) return ip;    // first untrusted hop = client
        }
        return hops[0].trim();
    }

    public static void main(String[] args) {
        // Attacker sends a fake header "1.2.3.4"; our proxy appends the real IP.
        System.out.println(realClientIp("10.0.0.2", "1.2.3.4, 203.0.113.7")); // 203.0.113.7
        System.out.println(realClientIp("198.51.100.9", "1.2.3.4"));         // 198.51.100.9 (not via our proxy)
    }
}` }],
    codeTitle: ['nginx reverse proxy', 'Squid forward proxy', 'Java: real client IP'],
    viz: {
      title: 'One request through a forward proxy and a reverse proxy',
      input: 'both',
      inputLabel: 'forward | reverse | both',
      gen: function (input) {
        var mode = String(input === undefined || input === null ? 'both' : input).trim().toLowerCase();
        if (['forward', 'reverse', 'both'].indexOf(mode) < 0) throw new Error('Type forward, reverse or both');
        var useF = mode !== 'reverse', useR = mode !== 'forward';
        var nodes = [box('L', 'Laptop 10.1.2.3 (office)', 8, 30, 16)];
        if (useF) nodes.push(box('F', 'Forward proxy (egress IP 198.51.100.9)', 32, 30, 20));
        if (useR) { nodes.push(box('R', 'Reverse proxy shop.com 203.0.113.10', 62, 30, 20)); nodes.push(box('A1', 'app-1 10.0.0.11', 91, 14, 14)); nodes.push(box('A2', 'app-2 10.0.0.12', 91, 46, 14)); }
        else nodes.push(box('W', 'shop.com web server', 70, 30, 20));
        var edges = [];
        if (useF) edges.push(['L', 'F', '']), edges.push(['F', useR ? 'R' : 'W', '']); else edges.push(['L', 'R', '']);
        if (useR) edges.push(['R', 'A1', '']), edges.push(['R', 'A2', '']);
        function g(hl, ehl, lab) {
          var e = edges.map(function (x) { var k = x[0] + '-' + x[1]; return [x[0], x[1], lab[k] || '']; });
          return { type: 'graph', label: 'Path of one HTTPS request', directed: true, height: 60, nodes: nodes, edges: e, hl: hl, ehl: ehl };
        }
        var seen = [];
        function tbl(hlLast) { return { type: 'table', label: 'What each receiver sees', columns: ['receiver', 'TCP source IP it sees', 'knows real client?', 'notes'], rows: seen.length ? seen.slice() : [['(nothing yet)', '', '', '']], hl: hlLast ? one(seen.length - 1, 'cur') : {} }; }
        var f = [];
        f.push({ narr: 'Mode <b>' + mode + '</b>. ' + (useF ? 'The office forces all web traffic through a <b>forward proxy</b> (it works for the <i>clients</i>). ' : '') + (useR ? 'shop.com puts a <b>reverse proxy</b> in front of its app servers (it works for the <i>servers</i>). ' : '') + 'Watch which IP each machine sees.', parts: [g({}, {}, {}), tbl()] });
        var dst = useR ? 'R' : 'W';
        if (useF) {
          seen.push(['forward proxy', '10.1.2.3', 'yes', 'gets CONNECT shop.com:443']);
          f.push({ narr: 'The browser is configured (PAC file or <code>HTTPS_PROXY</code>) to use the forward proxy. For HTTPS it sends <code>CONNECT shop.com:443</code>: "please open a tunnel for me". The proxy sees the <b>hostname</b>, not the encrypted path or body.', parts: [g({ L: 'cur', F: 'cur' }, { 'L-F': 'cur' }, { 'L-F': 'CONNECT shop.com:443' }), tbl(true)] });
          f.push({ narr: 'Policy check: is <code>shop.com</code> on the allowlist? Is the user authenticated? The proxy logs the request (who, when, which host, how many bytes). A blocked domain would get <code>403</code> right here and never leave the building.', parts: [g({ F: 'ok' }, {}, {}), tbl(), { type: 'map', label: 'Forward proxy policy', entries: [['shop.com', 'allow'], ['*.gambling.example', 'deny'], ['default', 'deny + log']], hl: { 'shop.com': 'ok' } }] });
          seen.push([useR ? 'reverse proxy' : 'shop.com server', '198.51.100.9', 'NO', 'sees the proxy\'s egress IP']);
          f.push({ narr: 'The forward proxy opens its own TCP connection to shop.com. From the internet\'s point of view the request comes from <b>198.51.100.9</b> — the proxy\'s egress IP. Your laptop\'s address is hidden. (This is also how 500 autoscaling servers can share one IP that a partner allowlists.)', parts: [g({ F: 'cur', [dst]: 'cur' }, { ['F-' + dst]: 'cur' }, { ['F-' + dst]: 'TLS tunnel' }), tbl(true)] });
        } else {
          seen.push(['reverse proxy', '10.1.2.3 (or the office NAT IP)', 'yes', 'direct connection, no forward proxy']);
          f.push({ narr: 'No forward proxy: the laptop connects to shop.com directly (DNS points <code>shop.com</code> at the reverse proxy\'s IP). The client has no idea a proxy is there.', parts: [g({ L: 'cur', R: 'cur' }, { 'L-R': 'cur' }, { 'L-R': 'HTTPS' }), tbl(true)] });
        }
        if (useR) {
          var client = useF ? '198.51.100.9' : '10.1.2.3';
          f.push({ narr: 'The <b>reverse proxy terminates TLS</b>: it owns the shop.com certificate, decrypts, and now reads the full HTTP request (method, path, headers, cookies). It can reject bad requests (WAF, rate limit), serve cached responses, and choose a backend. It adds <code>X-Forwarded-For: ' + client + '</code> and <code>X-Forwarded-Proto: https</code>.', parts: [g({ R: 'cur' }, {}, {}), tbl(), { type: 'map', label: 'Headers added by the reverse proxy', entries: [['X-Forwarded-For', client], ['X-Forwarded-Proto', 'https'], ['Host', 'shop.com']], hl: { 'X-Forwarded-For': 'ok' } }] });
          seen.push(['app-1', '10.0.0.2 (reverse proxy)', 'only via X-Forwarded-For', 'plain HTTP inside the private network']);
          f.push({ narr: 'The proxy picks <b>app-1</b> (load balancing) and forwards over a private network, often reusing a warm keep-alive connection. app-1\'s socket says the caller is the proxy (10.0.0.2); the real client is only known through the header — so the app must trust that header <i>only</i> when it comes from its own proxy.', parts: [g({ R: 'ok', A1: 'cur' }, { 'R-A1': 'cur' }, { 'R-A1': 'GET /cart' }), tbl(true)] });
          f.push({ narr: 'Response path: app-1 answers the proxy; the proxy compresses it, adds security headers, maybe caches it, and sends it back through the TLS connection. The client never learns that app-1 or app-2 exist — internal topology stays private and can change freely.', parts: [g({ A1: 'ok', R: 'ok', L: 'ok' }, { 'R-A1': 'ok' }, { 'R-A1': '200 OK' }), tbl()] });
        } else {
          f.push({ narr: 'The web server answers; the reply flows back through the tunnel. The website only ever saw the proxy\'s IP — great for privacy and egress control, but it also means the site cannot rate-limit individual office users.', parts: [g({ W: 'ok', F: 'ok', L: 'ok' }, {}, {}), tbl()] });
        }
        f.push({ narr: '<b>Summary:</b> ' + (useF ? 'the forward proxy <b>hid the client</b> and enforced the client organisation\'s rules. ' : '') + (useR ? 'The reverse proxy <b>hid the servers</b>, terminated TLS and chose a backend. ' : '') + 'Try the other modes to compare.', parts: [g({ L: 'sel' }, {}, {}), tbl(), note('Forward = on the client\'s side (outbound). Reverse = on the server\'s side (inbound). Load balancers, CDNs and API gateways are all reverse proxies.')] });
        return f;
      }
    },
    examples: [
      { title: 'Egress proxy for a partner allowlist', html: `<p>A bank partner only accepts calls from <b>two fixed IPs</b>, but your service runs on 200 autoscaling containers with changing IPs. Route their outbound calls through a pair of forward (egress) proxies or a NAT gateway with elastic IPs. The bank sees two stable IPs; you also get one place to log and rate-limit outbound traffic.</p>` },
      { title: 'Spoofed X-Forwarded-For', html: `<p>A client sends <code>X-Forwarded-For: 1.2.3.4</code> to dodge a rate limit. Your proxy appends the real IP: <code>1.2.3.4, 203.0.113.7</code>. If the app takes the <b>leftmost</b> value it believes the lie. Correct rule: walk from the <b>right</b>, skipping your own trusted proxies; the first untrusted address is the client (see the Java snippet). Or have the edge proxy <i>overwrite</i> the header instead of appending.</p>` },
      { title: 'Reverse proxy shields a slow app from slow clients', html: `<p>A Java app has 200 worker threads. Mobile users on 2G upload a 5 MB photo at 20 KB/s — each upload holds a thread for 4 minutes, so 200 slow users freeze the site. nginx in front <b>buffers</b> the whole request first, then hands it to the app in milliseconds. One proxy with event-driven I/O can hold 10,000+ slow connections cheaply.</p>` },
      { title: 'TLS: terminate, pass through, or re-encrypt', html: `${H.table(['Option', 'Proxy sees HTTP?', 'Use when'], [['Terminate at proxy', 'yes', 'Normal web traffic: routing, caching, WAF need the plaintext'], ['Pass-through (L4, SNI routing)', 'no (only SNI hostname)', 'Backend must hold the key, end-to-end encryption required'], ['Terminate + re-encrypt (TLS to backend, or mTLS)', 'yes', 'Zero-trust networks, compliance (PCI) inside the data center']])}` }
    ],
    deepDive: `<p><b>Buffering and connection management.</b> A reverse proxy turns many slow, flaky client connections into a few fast, persistent backend connections (keep-alive pools). It can speak HTTP/2 or HTTP/3 to clients and plain HTTP/1.1 to backends. Event-loop proxies (nginx, Envoy, HAProxy) handle tens of thousands of idle connections per core.</p>
<p><b>Request smuggling.</b> If the proxy and the backend disagree about where one request ends (<code>Content-Length</code> vs <code>Transfer-Encoding: chunked</code>), an attacker can hide a second request inside the first. Mitigations: normalise/reject ambiguous requests at the proxy, use HTTP/2 end-to-end, keep proxy and server versions current.</p>
<p><b>SSRF and egress.</b> Servers that fetch user-supplied URLs (webhooks, link previews) should go through an egress proxy that blocks private ranges (<code>169.254.169.254</code> cloud metadata, <code>10.0.0.0/8</code>). That is a forward proxy used for security.</p>
<p><b>PROXY protocol.</b> L4 proxies can\'t add HTTP headers, so HAProxy\'s PROXY protocol (v1 text, v2 binary) prepends the original source/destination to the TCP stream; the receiver must be configured to expect it, or it will see garbage.</p>
<p><b>Transparent proxies</b> intercept traffic without client configuration (via routing/iptables) — common in corporate networks and Kubernetes meshes (iptables redirects pod traffic into the Envoy sidecar).</p>
<p><b>Single point of failure.</b> Every proxy is a new hop that can fail or saturate. Run at least two behind a floating IP (keepalived/VRRP), DNS with health checks, or a managed cloud LB, and watch its CPU (TLS handshakes are the expensive part).</p>`,
    aiEra: `<p><b>What AI changes:</b> two very current proxy patterns. (1) <b>LLM / AI gateways</b> (LiteLLM, Cloudflare AI Gateway, Envoy AI Gateway, cloud-native gateways): from your company\'s point of view this is an <i>egress</i> (forward) proxy to model providers — one place for API keys, per-team quotas, logging, prompt/response redaction, caching and fallback from one provider or model to another. (2) <b>Agent sandboxes</b>: coding agents and tool-using agents run behind a forward proxy with a domain allowlist so a prompt-injected agent cannot exfiltrate data to an arbitrary host.</p>
<p><b>Use AI as a partner:</b> ask it to generate nginx/Envoy config and then ask it "which headers would let a client spoof its IP here?" — it is good at reviewing when asked a pointed question.</p>
<p><b>Where AI goes wrong:</b> it mixes up forward/reverse terminology, trusts the leftmost X-Forwarded-For value, sets <code>proxy_read_timeout</code> far too low for streaming LLM responses (SSE), and forgets to disable proxy buffering for token streaming (<code>proxy_buffering off</code>).</p>
<p><b>What you must still own:</b> trust boundaries — which hop is allowed to assert the client identity — and where TLS ends.</p>`,
    problems: [{
      title: 'Every Request Seems to Come From 10.0.0.5', level: 'Easy', tags: ['reverse proxy', 'x-forwarded-for', 'rate limiting'], companies: ['Uber', 'Atlassian'],
      statement: `<p>After putting the app behind a new load balancer (a reverse proxy at 10.0.0.5), three things broke: access logs show every request coming from <code>10.0.0.5</code>, the per-IP rate limiter blocks <b>everyone</b> at once, and geo-based pricing shows all users as being in the data-center country. Explain why and fix it.</p>`,
      constraints: `<p>The LB is an L7 HTTP load balancer. A separate TCP-only (L4) service for an IoT protocol also sits behind an L4 LB. Clients can send arbitrary headers.</p>`,
      example: `<p>Before: socket remote address = ${H.c('g', '203.0.113.7')} (the user). After: ${H.c('r', '10.0.0.5')} for all users → the rate limiter sees one "user" making 20k requests/s.</p>`,
      brute: { why: `<p>"Disable the rate limiter" or "allowlist 10.0.0.5" — the limiter then protects nothing. Or "take the leftmost X-Forwarded-For" — any client can forge that header and pretend to be any IP, so rate limits and geo rules become trivially bypassable.</p>` },
      mcq: { q: 'Your L7 proxy appends to X-Forwarded-For. A request arrives with "X-Forwarded-For: 9.9.9.9, 203.0.113.7" from the proxy. Which is the client?', options: ['9.9.9.9 (leftmost)', '203.0.113.7 (rightmost, added by our proxy)', '10.0.0.5', 'Cannot tell'], answer: 1, explain: 'Our proxy appended 203.0.113.7 — the address it actually saw. Anything to its left came from the client and may be forged.' },
      hints: [`<p>Hint 1: a proxy opens a <i>new</i> TCP connection to the backend. Whose IP is on that new connection?</p>`, `<p>Hint 2: L7 proxies can carry the original IP in a header; L4 proxies need a different trick because they never parse HTTP.</p>`, `<p>Hint 3: only believe the header when the socket peer is your own proxy, and read it from the right, skipping your trusted proxy IPs.</p>`],
      solution: {
        approach: `<p><b>Why:</b> the backend\'s TCP peer is now the proxy, so <code>remoteAddr = 10.0.0.5</code> for everyone. Logging, rate limiting and geo-IP all keyed on that.</p>
<p><b>Fix for HTTP (L7):</b> configure the LB to set <code>X-Forwarded-For</code> (append) and <code>X-Forwarded-Proto</code>. In the app (or framework setting such as a "trusted proxies" list / nginx <code>real_ip_from</code> + <code>real_ip_header</code>), accept the header <b>only</b> when the socket peer is a trusted proxy, and take the right-most untrusted address. Use that value for logs, rate limiting and geo-IP.</p>
<p><b>Fix for the L4 service:</b> enable <b>PROXY protocol</b> on the L4 LB and on the backend listener (both sides must agree), or use a LB mode that preserves the client source IP.</p>
<p><b>Harden:</b> strip any incoming <code>X-Forwarded-*</code> headers at the outermost edge and set them fresh; block direct access to backends so nobody can bypass the proxy and inject headers; add a test that a forged header does not change the computed client IP.</p>`,
        complexity: `<p>O(number of hops) per request to parse the header — negligible. Operationally: one config change per LB plus one trusted-proxy list in the app.</p>`,
        followUps: ['What changes if traffic passes through a CDN first, then your LB?', 'How does IPv6 or carrier-grade NAT affect per-IP rate limiting?', 'Why is the standard Forwarded header rarely used in practice?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — L4 vs L7 load balancers
     ====================================================================== */
  topics.push({
    title: 'L4 vs L7 Load Balancers',
    analogy: `<p>An office mailroom has two kinds of sorters. The <b>L4 sorter</b> only looks at the <b>address on the envelope</b> (which building, which door) and never opens it. He is incredibly fast and can sort any kind of envelope — letters, parcels, anything.</p>
<p>The <b>L7 sorter</b> <b>opens each letter and reads it</b>: "this is a billing question → billing team; this is a job application → HR; this one is spam → bin". He is slower and needs permission to open mail (the TLS certificate), but he can make much smarter decisions — even split one envelope full of letters to different teams.</p>`,
    explain: `<p>"L4" and "L7" come from the OSI network model. <b>Layer 4</b> is the transport layer (TCP/UDP: IP addresses and ports). <b>Layer 7</b> is the application layer (HTTP: URL path, host name, headers, cookies, gRPC method).</p>
${H.table(['', 'L4 load balancer', 'L7 load balancer'], [
  ['Decides using', 'Source/destination IP + port (the "5-tuple")', 'Host, path, headers, cookies, method, body size'],
  ['Unit it balances', 'A whole <b>connection</b> (or UDP flow)', 'Each <b>request</b> (even many requests on one connection)'],
  ['Opens the payload?', 'No — bytes pass through untouched (TLS stays end-to-end)', 'Yes — terminates TLS and parses HTTP'],
  ['Speed / cost', H.c('g', 'Very fast, millions of connections, little CPU'), H.c('y', 'More CPU per request (TLS, parsing); adds ~0.1–few ms')],
  ['Protocols', 'Anything on TCP/UDP: databases, MQTT, game UDP, SMTP, raw TLS', 'HTTP/1.1, HTTP/2, HTTP/3, gRPC, WebSockets'],
  ['Smart features', 'Few: health checks, source-IP hash, client IP preservation', 'Path/host routing, canary by header, retries, redirects, rewrites, auth, WAF, compression, caching'],
  ['Examples', 'AWS NLB, GCP passthrough Network LB, HAProxy <code>mode tcp</code>, LVS/IPVS, Google Maglev, Meta Katran', 'AWS ALB, GCP Application LB, HAProxy <code>mode http</code>, nginx, Envoy, Traefik']
])}
<h4>Balancing algorithms (quick recap)</h4>
<ul>
<li><b>Round robin</b> / <b>weighted round robin</b> — take turns (weights for bigger machines).</li>
<li><b>Least connections</b> / <b>least outstanding requests</b> — send to the least busy; great when requests vary in cost.</li>
<li><b>Power of two choices (P2C)</b> — pick 2 random backends, send to the less loaded. Nearly as good as "least loaded" with almost no coordination (Envoy\'s default for least-request).</li>
<li><b>Hashing</b> (source IP, header, consistent hashing) — same key → same backend; used for affinity and caches.</li>
</ul>
<h4>The common real-world shape</h4>
<p><b>Internet → L4 (or anycast) tier → fleet of L7 proxies → services.</b> The L4 tier is cheap and spreads raw connections over many L7 boxes; the L7 tier does the smart, per-request work. Inside the cluster, L7 sidecars or client-side balancing (gRPC) handle service-to-service calls.</p>`,
    clues: [
      '"Route /api to one service and /images to another" or "by hostname" → L7',
      '"Non-HTTP protocol" (Postgres, Redis, MQTT, game traffic over UDP) → L4',
      '"Millions of connections, lowest latency, keep TLS end-to-end / client cert at the backend" → L4 (pass-through)',
      '"gRPC / HTTP/2 traffic is uneven across pods" → connection-level (L4) balancing of long-lived connections → use L7 or client-side LB',
      '"Canary 5% of users / route by header or cookie / A/B test" → L7',
      '"Static IP per zone for firewall allowlists" → L4 (e.g. NLB) often in front of L7'
    ],
    code: [{
      lang: 'text', check: false, title: 'HAProxy: the same box doing L4 and L7', code: `
# ---------- L4: Postgres. HAProxy never looks inside the bytes ----------
frontend pg_in
    mode tcp
    bind :5432
    default_backend pg_replicas

backend pg_replicas
    mode tcp
    balance leastconn                   # connections are long-lived
    server db-r1 10.0.1.11:5432 check
    server db-r2 10.0.1.12:5432 check

# ---------- L7: HTTPS. TLS terminated, routing by path and header ----------
frontend web_in
    mode http
    bind :443 ssl crt /etc/haproxy/shop.pem
    acl is_api    path_beg /api/
    acl is_video  path_beg /video/
    acl is_canary req.hdr(X-Canary) -m str yes
    http-request deny if { path_beg /admin } !{ src 10.0.0.0/8 }
    use_backend api_canary if is_api is_canary
    use_backend api        if is_api
    use_backend video      if is_video
    default_backend web

backend api
    mode http
    balance roundrobin
    option httpchk GET /healthz
    server api-1 10.0.2.11:8080 check
    server api-2 10.0.2.12:8080 check

backend api_canary
    mode http
    server api-canary 10.0.2.99:8080 check

backend video
    mode http
    server video-1 10.0.3.11:8080 check

backend web
    mode http
    server web-1 10.0.4.11:8080 check` }, {
      lang: 'python', run: true, title: 'Tiny L7 router: prefix rules + round robin + power-of-two-choices', code: `
import random
from itertools import cycle

random.seed(7)  # deterministic demo

RULES = [                      # first match wins, like an ALB listener rule list
    ("/api/", "api"),
    ("/static/", "static"),
    ("/video/", "video"),
    ("/", "web"),
]
POOLS = {
    "api": ["api-1", "api-2"],
    "static": ["static-1"],
    "video": ["video-1", "video-2", "video-3"],
    "web": ["web-1", "web-2"],
}
rr = {name: cycle(servers) for name, servers in POOLS.items()}
in_flight = {s: 0 for servers in POOLS.values() for s in servers}

def route(path, algo="rr"):
    pool = next(name for prefix, name in RULES if path.startswith(prefix))
    if algo == "rr":
        server = next(rr[pool])
    else:  # power of two choices: sample 2, take the less busy one
        a, b = random.sample(POOLS[pool], 2) if len(POOLS[pool]) > 1 else (POOLS[pool][0],) * 2
        server = a if in_flight[a] <= in_flight[b] else b
    in_flight[server] += 1
    return pool, server

for p in ["/api/users", "/static/app.js", "/video/9/seg1.ts", "/api/orders", "/checkout"]:
    print(f"{p:20s} -> {route(p)}")

for _ in range(30):
    route("/video/9/seg2.ts", algo="p2c")
print("video in-flight after 30 P2C picks:", {s: in_flight[s] for s in POOLS["video"]})
` }],
    codeTitle: ['HAProxy L4 + L7', 'L7 router sketch (Python)'],
    viz: [{
      title: 'L7 routing by path (and what an L4 balancer would see instead)',
      input: '/api/users /static/app.js /video/42/seg1.ts /api/orders /admin /static/logo.png /checkout /api/cart',
      inputLabel: 'Request paths (space separated)',
      gen: function (input) {
        var reqs = toks(input, 12, 'Enter request paths like /api/users /static/a.js');
        reqs.forEach(function (r) { if (r.charAt(0) !== '/') throw new Error('Each path must start with /, e.g. /api/users'); });
        var rules = [['/api/*', 'api pool', 'API'], ['/static/*', 'static pool', 'ST'], ['/video/*', 'video pool', 'VID'], ['/admin*', '403 unless internal IP', 'DENY'], ['/* (default)', 'web pool', 'WEB']];
        var pools = { API: ['api-1', 'api-2'], ST: ['static-1'], VID: ['video-1', 'video-2'], WEB: ['web-1', 'web-2'] };
        var rr = { API: 0, ST: 0, VID: 0, WEB: 0 }, counts = { API: 0, ST: 0, VID: 0, WEB: 0, DENY: 0 };
        var nodes = [box('C', 'Client 203.0.113.7', 8, 36, 15), box('LB', 'L7 load balancer (TLS ends here)', 34, 36, 20),
          box('API', 'api pool: api-1, api-2', 80, 6, 24), box('ST', 'static pool: static-1', 80, 21, 24), box('VID', 'video pool: video-1, video-2', 80, 36, 24), box('DENY', '403 Forbidden', 80, 51, 24), box('WEB', 'web pool: web-1, web-2', 80, 66, 24)];
        function g(hl, ehl, lab, tags) {
          var e = [['C', 'LB', lab.C || '']];
          ['API', 'ST', 'VID', 'DENY', 'WEB'].forEach(function (k) { e.push(['LB', k, lab[k] || '']); });
          return { type: 'graph', label: 'L7 routing', directed: true, height: 72, nodes: nodes, edges: e, hl: hl, ehl: ehl, tags: tags || {} };
        }
        function rt(hlRow) { return { type: 'table', label: 'Listener rules (first match wins)', columns: ['#', 'path match', 'action'], rows: rules.map(function (r, i) { return [i + 1, r[0], r[1]]; }), hl: hlRow === undefined ? {} : one(hlRow, 'sel') }; }
        function cv() { return { type: 'vars', label: 'Requests per destination', vals: { api: counts.API, static: counts.ST, video: counts.VID, web: counts.WEB, denied: counts.DENY } }; }
        var f = [];
        f.push({ narr: 'An <b>L7</b> load balancer terminates TLS, so it can read each request\'s <b>path</b>. It checks the rules top to bottom and the first match wins (exactly how AWS ALB listener rules or an nginx/HAProxy config behave).', parts: [g({ LB: 'cur' }, {}, {}), rt(), cv()] });
        reqs.forEach(function (p, k) {
          var idx = p.indexOf('/api/') === 0 ? 0 : p.indexOf('/static/') === 0 ? 1 : p.indexOf('/video/') === 0 ? 2 : p.indexOf('/admin') === 0 ? 3 : 4;
          var key = rules[idx][2];
          counts[key]++;
          var hl = { C: 'cur', LB: 'cur' }, ehl = { 'C-LB': 'cur' }, lab = { C: 'GET ' + p }, tags = {}, narr;
          if (key === 'DENY') {
            hl.DENY = 'bad'; ehl['LB-DENY'] = 'bad'; lab.DENY = 'blocked';
            narr = 'Request ' + (k + 1) + ': <code>GET ' + H.esc(p) + '</code> matches rule 4. The client IP is not internal, so the LB answers <span class="c-r">403</span> itself — the request never reaches any server. Only an L7 balancer can make decisions based on the URL like this.';
          } else {
            var srv = pools[key][rr[key] % pools[key].length]; rr[key]++;
            hl[key] = 'ok'; ehl['LB-' + key] = 'ok'; lab[key] = srv; tags[key] = '→ ' + srv;
            narr = 'Request ' + (k + 1) + ': <code>GET ' + H.esc(p) + '</code> matches rule ' + (idx + 1) + ' (<b>' + rules[idx][0] + '</b>) → <b>' + rules[idx][1] + '</b>. Inside the pool, round robin picks <b>' + srv + '</b>. Different paths on the <i>same</i> connection can go to completely different services.';
          }
          f.push({ narr: narr, parts: [g(hl, ehl, lab, tags), rt(idx), cv()] });
        });
        f.push({ narr: 'Now imagine an <b>L4</b> balancer in the same spot. It never decrypts anything. All it sees is a TCP connection <code>203.0.113.7:51234 → 203.0.113.10:443</code> carrying encrypted bytes, so it must send the <b>whole connection</b> to one backend — which therefore has to handle /api, /video and /admin itself. In exchange it is far cheaper and faster.', parts: [
          { type: 'table', label: 'What each balancer can see', columns: ['field', 'L4 sees?', 'L7 sees?'], rows: [['source IP + port', 'yes', 'yes'], ['dest IP + port', 'yes', 'yes'], ['TLS SNI hostname', 'only by peeking', 'yes'], ['URL path /api/users', 'NO', 'yes'], ['headers, cookies', 'NO', 'yes'], ['each request separately', 'NO (whole connection)', 'yes']] },
          note('Pick L7 when you need to understand requests; pick L4 when you just need to move bytes fast (or the protocol is not HTTP).')] });
        return f;
      }
    }, {
      title: 'Why long-lived HTTP/2 / gRPC connections break L4 balancing',
      input: '900 60 30 10',
      inputLabel: 'Requests carried by each long-lived connection (space separated, 2-8 values)',
      gen: function (input) {
        var c = toks(input, 8, 'Enter 2-8 numbers like 900 60 30 10').map(Number);
        if (c.length < 2 || c.some(function (x) { return isNaN(x) || x < 0 || x > 100000 || Math.floor(x) !== x; })) throw new Error('Enter 2-8 whole numbers between 0 and 100000');
        var S = ['pod-1', 'pod-2', 'pod-3'], l4 = [0, 0, 0], f = [];
        var total = c.reduce(function (a, b) { return a + b; }, 0);
        f.push({ narr: c.length + ' clients each open <b>one</b> long-lived HTTP/2 (gRPC) connection and send many requests over it: ' + c.join(', ') + ' requests. Total = ' + total + '. Three pods behind the balancer.', parts: [{ type: 'bars', label: 'Requests handled (L4)', values: l4.slice(), idxLabels: S }, { type: 'array', label: 'requests per connection', values: c }] });
        c.forEach(function (n, i) {
          var s = i % 3; l4[s] += n;
          f.push({ narr: '<b>L4</b>: connection ' + (i + 1) + ' is assigned to <b>' + S[s] + '</b> when it opens (round robin over connections). All ' + n + ' of its requests stick to that pod for the life of the connection — the L4 balancer cannot see the individual requests inside.', parts: [{ type: 'bars', label: 'Requests handled (L4)', values: l4.slice(), idxLabels: S, hl: one(s, 'cur') }, { type: 'array', label: 'requests per connection', values: c, hl: one(i, 'y') }] });
        });
        var mx = Math.max.apply(null, l4), avg = total / 3;
        f.push({ narr: 'L4 result: the busiest pod handles <b>' + mx + '</b> requests vs a fair share of ' + Math.round(avg) + ' — ' + (avg ? (mx / avg).toFixed(1) : '0') + '× overload while others idle. Adding pods does not help: new pods get no traffic until clients reconnect.', parts: [{ type: 'bars', label: 'Requests handled (L4)', values: l4.slice(), idxLabels: S, hl: one(l4.indexOf(mx), 'bad') }] });
        var base = Math.floor(total / 3), l7 = [base, base, base];
        for (var r = 0; r < total - base * 3; r++) l7[r]++;
        f.push({ narr: '<b>L7</b> (Envoy, ALB with gRPC, or client-side gRPC balancing) terminates the HTTP/2 connection and balances <b>each request</b> (stream) over its own connections to the pods. Result: ' + l7.join(' / ') + ' — even, and new pods get traffic immediately.', parts: [{ type: 'bars', label: 'Requests handled (L4)', values: l4.slice(), idxLabels: S, hl: one(l4.indexOf(mx), 'bad') }, { type: 'bars', label: 'Requests handled (L7, per request)', values: l7, idxLabels: S, hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Choosing per service', html: `${H.table(['Service', 'Pick', 'Why'], [['Public website + REST API', 'L7', 'Path/host routing, TLS termination, WAF, per-request balancing'], ['PostgreSQL read replicas', 'L4', 'Not HTTP; long-lived connections; leastconn'], ['Multiplayer game (UDP)', 'L4', 'UDP flows; latency critical'], ['gRPC microservices', 'L7 (or client-side LB)', 'HTTP/2 multiplexing breaks connection-level balancing'], ['MQTT for 2M IoT devices', 'L4', 'Huge numbers of idle TCP connections, non-HTTP'], ['Partner API that requires mutual TLS at the app', 'L4 pass-through (or L7 that forwards the client cert)', 'App must see the client certificate']])}` },
      { title: 'Two-tier edge: L4 in front of L7', html: `<p>A big site gets 2 million new connections per second. One L7 proxy handles ~50k TLS handshakes/s per box, so you need ~40+ L7 boxes. Something must spread connections over them without itself being a bottleneck: an <b>L4</b> layer (ECMP routers + Maglev/Katran-style balancers, or a cloud NLB). Result: L4 does cheap packet steering, L7 does smart request work, and either tier can scale out independently.</p>` },
      { title: 'Canary release needs L7', html: `<p>"Send 5% of traffic, plus every request with header <code>X-Canary: yes</code>, to version 2." An L4 balancer can only split by connection (and a single browser connection carries many requests), so the split is lumpy and cannot read headers. An L7 balancer does weighted routing per request and header matches, and can automatically roll back if v2\'s error rate rises.</p>` },
      { title: 'WebSockets through an L7 balancer', html: `<p>A WebSocket starts as an HTTP request with <code>Upgrade: websocket</code>, so L7 can route it by path (<code>/ws/chat</code>). After the upgrade it is a long-lived connection pinned to one backend — the L7 LB then behaves like an L4 pipe for it. Remember the idle timeout (often 60 s by default on cloud LBs): send pings or raise the timeout, and drain gracefully on deploys.</p>` }
    ],
    deepDive: `<p><b>How L4 balancers move packets.</b> (1) <b>NAT</b>: rewrite destination IP to the backend (and source IP too in "full NAT"), so replies flow back through the LB. (2) <b>DSR (direct server return)</b>: the LB forwards the packet unchanged (MAC rewrite or IP-in-IP tunnel); the backend owns the virtual IP on a loopback and replies <i>directly</i> to the client — the LB only handles the small inbound direction, great for video where responses are huge. (3) Tunnelling (GRE/IPIP/GUE) lets backends live in other subnets.</p>
<p><b>Scaling the balancer itself.</b> Routers spread packets across many L4 LB machines with ECMP. Each LB must send packets of the same connection to the same backend even if a different LB box receives them, so they use <b>consistent hashing</b> (Google\'s Maglev hashing) plus a connection-tracking table. This is why an LB box can die without breaking most connections.</p>
<p><b>L7 costs.</b> TLS handshakes dominate CPU (use ECDSA certs, session resumption, TLS 1.3). Buffering, header parsing and retries add latency and memory. Default limits (header size, idle timeouts, max body) cause mysterious 4xx/5xx — know them.</p>
<p><b>Retries are double-edged.</b> L7 balancers can retry idempotent requests on another backend — a huge reliability win — but unbounded retries amplify overload. Use retry budgets (e.g. retries ≤ 20% of requests) and only retry safe methods or requests with idempotency keys.</p>
<p><b>HTTP/3 (QUIC)</b> runs over UDP; an L4 balancer must route by QUIC connection ID, not just the 5-tuple, because clients can change IP (Wi-Fi → 5G) mid-connection.</p>
<p><b>Where balancing happens</b>: edge LB, internal LB, sidecar proxy (service mesh), or <b>client-side</b> (gRPC with xDS, Finagle): the client gets the list of endpoints and balances itself — no extra hop, but every client must be smart.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM inference is a new, very L7-shaped workload. Requests differ wildly in cost (10 tokens vs 100k-token prompts), responses stream for seconds or minutes, and GPUs keep a <b>KV cache</b> of recent prompt prefixes. Plain round robin wastes GPUs, so inference gateways do <b>L7, model-aware routing</b>: by model name, queue depth, KV-cache utilisation and prefix-cache affinity (for example the Kubernetes Gateway API Inference Extension, vLLM/SGLang routers, llm-d).</p>
<p><b>Use AI as a partner:</b> describe your services and ask for an L4/L7 decision table — then challenge every row with "what breaks under HTTP/2?" and "what is the idle timeout?".</p>
<p><b>Where AI goes wrong:</b> suggesting an L4 balancer for gRPC "because it is faster", leaving default 60 s idle timeouts that cut off streaming LLM responses, or enabling automatic retries on non-idempotent POSTs (double charges, double agent actions).</p>
<p><b>What you must still own:</b> knowing what each layer can see, the cost model (TLS CPU, extra hop), and which requests are safe to retry.</p>`,
    problems: [{
      title: 'gRPC Pods Are Unevenly Loaded After Scaling Out', level: 'Medium', tags: ['l4', 'l7', 'grpc', 'http2'], companies: ['Google', 'Lyft', 'Databricks'],
      statement: `<p>An order service calls a pricing service over gRPC. Pricing runs on 4 pods behind a Kubernetes <code>Service</code> (kube-proxy, connection-level L4 balancing). During a sale you scale pricing to 12 pods, but CPU shows <b>4 pods at 95%</b> and <b>8 pods nearly idle</b>, and latency keeps rising. Explain and fix.</p>`,
      constraints: `<p>Order service: 6 pods, each keeps one gRPC channel (HTTP/2 connection) open for hours. 30k RPC/s at peak. You may add a proxy or change client config.</p>`,
      example: `<p>Each order pod opened its HTTP/2 connection when pricing had 4 pods → ${H.c('r', 'all 6 connections land on the original 4 pods')}; the 8 new pods ${H.c('m', 'never receive a connection')}.</p>`,
      brute: { why: `<p>"Scale pricing to 30 pods." New pods still get no connections, so the hot pods stay hot. "Restart the order service" re-spreads connections once, but the imbalance returns at the next scale-out, and with only 6 connections over 12 pods half the pods get nothing anyway.</p>` },
      mcq: { q: 'Root cause of the imbalance?', options: ['gRPC is single-threaded', 'L4 balancing assigns whole long-lived HTTP/2 connections, and the requests inside are never re-balanced', 'Kubernetes health checks failed', 'DNS TTL is too long'], answer: 1, explain: 'kube-proxy balances connections. HTTP/2 multiplexes thousands of RPCs on one connection, so balance is decided once per connection, at connect time.' },
      hints: [`<p>Hint 1: count connections, not requests. How many TCP connections exist between the two services, and when were they balanced?</p>`, `<p>Hint 2: something must look at each RPC (each HTTP/2 stream) and pick a pod per request — that is L7 behaviour.</p>`, `<p>Hint 3: options — client-side balancing over all pod IPs (headless service + round_robin policy), a sidecar/mesh L7 proxy, or a max connection age so clients reconnect regularly.</p>`],
      solution: {
        approach: `<p><b>Why:</b> HTTP/2 multiplexes many requests on one long-lived connection. An L4 balancer (kube-proxy/iptables/IPVS) chooses a pod only when the connection opens. With 6 clients × 1 connection, at most 6 pods ever get traffic, and pods added later get none.</p>
<p><b>Fix options (pick one or combine):</b></p>
<ol>
<li><b>Client-side L7 balancing:</b> use a headless Service (DNS returns all pod IPs) or xDS, and configure the gRPC channel with the <code>round_robin</code> (or least-request) policy. Each client opens a connection to <i>every</i> pod and balances per RPC. Re-resolution picks up new pods.</li>
<li><b>L7 proxy / service mesh:</b> an Envoy sidecar (Istio/Linkerd) or a gRPC-aware L7 gateway terminates HTTP/2 and balances each stream across pods with least-request/P2C.</li>
<li><b>Connection recycling:</b> set <code>MAX_CONNECTION_AGE</code> (e.g. 5 min, with grace) on the server so clients reconnect and get re-spread. A cheap mitigation, not a full fix.</li>
</ol>
<p><b>Also:</b> autoscale on CPU <i>and</i> on per-pod request rate, and alert on load skew (max/avg pod CPU &gt; 1.5).</p>`,
        complexity: `<p>Client-side LB: each client holds N connections (N = pods), fine up to hundreds of pods; beyond that use subsetting. Sidecar: +1 local hop (~0.2–1 ms) and some CPU per pod.</p>`,
        followUps: ['How would subsetting keep connection counts sane with 1,000 clients and 1,000 servers?', 'What is the risk of setting MAX_CONNECTION_AGE too low?', 'Why does least-request beat round robin when RPC costs vary?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Health checks
     ====================================================================== */
  topics.push({
    title: 'Health Checks: Taking Sick Servers Out of Rotation',
    analogy: `<p>A restaurant manager hands out orders to cooks. Every few minutes she leans into the kitchen and asks each cook <b>"you OK?"</b>. If a cook does not answer <b>twice in a row</b>, she stops giving him new orders (one missed answer might just be a noisy kitchen). When he answers "yes" <b>a couple of times in a row</b>, she slowly starts giving him orders again.</p>
<p>She also learns from customers: if every dish from one cook comes back cold, she stops sending orders to him even if he says he is fine. That is a <i>passive</i> health check.</p>`,
    explain: `<p>A load balancer is only as good as its list of <b>healthy</b> backends. Health checks keep that list honest.</p>
<h4>Two kinds of checks</h4>
${H.table(['', 'Active health check', 'Passive health check (outlier detection)'], [
  ['How', 'LB sends a probe every <i>interval</i>: TCP connect, or <code>GET /healthz</code> expecting 200', 'LB watches real traffic: 5xx responses, timeouts, connection resets'],
  ['Pros', 'Finds a dead server even with zero traffic; predictable', 'Catches problems the probe misses ("gray failures"); no extra traffic'],
  ['Cons', 'Probe can pass while real requests fail; probe traffic adds up', 'Needs real users to fail first'],
  ['Examples', 'HAProxy <code>check</code>, ALB target group checks, Kubernetes probes', 'Envoy outlier detection, nginx <code>max_fails</code>']
])}
<h4>The knobs (and the detection-time math)</h4>
${H.table(['Knob', 'Meaning', 'Typical'], [
  ['interval', 'How often to probe', '2–30 s'],
  ['timeout', 'How long to wait for a reply', '1–5 s'],
  ['unhealthy threshold (fall)', 'Consecutive failures before marking DOWN', '2–3'],
  ['healthy threshold (rise)', 'Consecutive passes before marking UP again', '2–5']
])}
<p><b>Worst-case time to detect a dead server ≈ interval × fall (+ timeout).</b> With interval 10 s and fall 3, a crashed server keeps receiving traffic for up to ~30 s — every request sent to it in that window fails (or is retried). Faster detection = more probe traffic and more false alarms (flapping). Requiring several passes to come back (<i>rise</i>) adds <b>hysteresis</b> so a server that is half-alive does not bounce in and out.</p>
<h4>Shallow vs deep checks</h4>
<ul>
<li><b>Liveness / shallow</b>: "is the process up and able to answer HTTP?" Cheap, no dependencies.</li>
<li><b>Readiness / deep</b>: "can I actually serve traffic right now?" (warm caches loaded, DB pool connected, not shutting down).</li>
<li>Kubernetes splits these: <b>livenessProbe</b> failing → container is <i>restarted</i>; <b>readinessProbe</b> failing → pod is <i>removed from the Service</i> but left running; <b>startupProbe</b> gives slow starters time before the other probes begin.</li>
</ul>
<h4>Graceful removal (draining)</h4>
<p>On deploy or scale-in: mark the instance not-ready → LB stops sending <i>new</i> requests → in-flight requests finish within a <b>deregistration delay / drain timeout</b> → process exits. Without draining, every deploy throws a burst of 502s.</p>`,
    clues: [
      '"Users get errors for ~30 seconds when a server dies" → detection window = interval × unhealthy threshold; add passive checks + retries',
      '"A database blip took the whole site down" → deep health checks that depend on a shared dependency fail everywhere at once',
      '"502s during every deploy" → missing readiness/draining (deregistration delay, preStop hook)',
      '"Server keeps flapping in and out of the pool" → raise healthy threshold (hysteresis), check timeouts',
      '"The health endpoint is green but users see errors" → gray failure: use passive/outlier detection, check the real request path',
      '"Pod restarts in a loop while loading a big model" → liveness probe too aggressive; use a startup probe'
    ],
    code: [{
      lang: 'java', title: 'The fall / rise state machine every load balancer runs', code: `
class HealthTracker {
    enum State { UP, DOWN }

    private final int fall;   // consecutive failures needed to mark DOWN
    private final int rise;   // consecutive passes needed to mark UP again
    private State state = State.UP;
    private int failStreak = 0, passStreak = 0;

    HealthTracker(int fall, int rise) { this.fall = fall; this.rise = rise; }

    /** Feed one probe result; returns the (possibly new) state. */
    State record(boolean probePassed) {
        if (probePassed) {
            passStreak++;
            failStreak = 0;
            if (state == State.DOWN && passStreak >= rise) state = State.UP;
        } else {
            failStreak++;
            passStreak = 0;
            if (state == State.UP && failStreak >= fall) state = State.DOWN;
        }
        return state;
    }

    boolean inRotation() { return state == State.UP; }

    public static void main(String[] args) {
        HealthTracker s2 = new HealthTracker(2, 2);
        boolean[] probes = { true, false, true, false, false, false, true, true, true };
        for (int i = 0; i < probes.length; i++) {
            System.out.println("probe " + i + " passed=" + probes[i] + " -> " + s2.record(probes[i]));
        }
        // One stray failure (probe 1) does NOT remove the server: fall = 2.
        // It goes DOWN at probe 4 and returns only after 2 passes (probe 7).
    }
}` }, {
      lang: 'text', check: false, title: 'HAProxy: active checks + passive (observe) + slow start', code: `
backend api
    mode http
    balance leastconn
    option httpchk GET /healthz
    http-check expect status 200
    default-server inter 5s fastinter 1s downinter 10s fall 3 rise 2 slowstart 30s
    # observe layer7: also count real 5xx responses (passive check)
    default-server observe layer7 error-limit 10 on-error mark-down
    server api-1 10.0.2.11:8080 check
    server api-2 10.0.2.12:8080 check
    server api-3 10.0.2.13:8080 check` }, {
      lang: 'yaml', check: false, title: 'Kubernetes: startup, readiness and liveness probes + graceful drain', code: `
containers:
  - name: api
    image: shop/api:2.4.1
    ports: [{ containerPort: 8080 }]
    startupProbe:            # give slow starters (JIT warm-up, model load) time
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 5
      failureThreshold: 60   # up to 5 minutes
    readinessProbe:          # failing => removed from Service endpoints, NOT restarted
      httpGet: { path: /ready, port: 8080 }
      periodSeconds: 5
      failureThreshold: 2
    livenessProbe:           # failing => container restarted; keep it shallow!
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 10
      failureThreshold: 3
    lifecycle:
      preStop:               # let the LB notice we are leaving before we stop
        exec: { command: ["sh", "-c", "sleep 10"] }
terminationGracePeriodSeconds: 40` }],
    codeTitle: ['Java: fall/rise tracker', 'HAProxy checks', 'Kubernetes probes'],
    viz: {
      title: 'Health checks mark a backend bad and traffic shifts',
      input: 'fall=2 rise=2 S1:++++++++++ S2:+++-+----+++ S3:++++++++++',
      inputLabel: 'fall=N rise=N then Name:probe results (+ pass, - fail) per round',
      gen: function (input) {
        var t = toks(input, 7, 'Format: fall=2 rise=2 S1:+++ S2:+-- S3:+++');
        var fall = 2, rise = 2, srv = [];
        t.forEach(function (x) {
          if (/^fall=\d+$/i.test(x)) fall = Number(x.slice(5));
          else if (/^rise=\d+$/i.test(x)) rise = Number(x.slice(5));
          else {
            var m = /^([A-Za-z0-9_-]{1,10}):([+-]+)$/.exec(x);
            if (!m) throw new Error('Servers look like S1:++-+ (only + and -)');
            srv.push({ name: m[1], seq: m[2], state: 'UP', fs: 0, ps: 0 });
          }
        });
        if (fall < 1 || fall > 5 || rise < 1 || rise > 5) throw new Error('fall and rise must be 1-5');
        if (srv.length < 2 || srv.length > 5) throw new Error('Give 2-5 servers');
        var rounds = Math.max.apply(null, srv.map(function (s) { return s.seq.length; }));
        if (rounds > 16) throw new Error('At most 16 rounds per server');
        srv.forEach(function (s) { while (s.seq.length < rounds) s.seq += '+'; });
        var nodes = [box('C', 'Users (100 req per round)', 8, 36, 16), box('LB', 'Load balancer', 36, 36, 16)];
        var gap = 72 / srv.length;
        srv.forEach(function (s, i) { nodes.push(box(s.name, s.name, 84, Math.round(gap / 2 + i * gap), 14)); });
        var leaked = 0, served = 0, f = [];
        function share(up) { var r = {}; srv.forEach(function (s) { r[s.name] = 0; }); var n = up.length; up.forEach(function (s, i) { r[s.name] = Math.floor(100 / n) + (i < 100 % n ? 1 : 0); }); return r; }
        function parts(round, sh, actual, hlRow) {
          var hl = { LB: 'cur' }, ehl = {}, edges = [['C', 'LB', '100 req']], tags = {};
          srv.forEach(function (s) {
            edges.push(['LB', s.name, sh[s.name] ? sh[s.name] + '%' : '']);
            if (s.state === 'DOWN') { hl[s.name] = 'bad'; tags[s.name] = 'DOWN'; }
            else { hl[s.name] = actual && actual[s.name] === '-' ? 'cur' : 'ok'; tags[s.name] = 'UP'; if (sh[s.name]) ehl['LB-' + s.name] = actual && actual[s.name] === '-' ? 'bad' : 'ok'; }
          });
          return [
            { type: 'graph', label: 'Traffic in round ' + round, directed: true, height: 72, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
            { type: 'table', label: 'Health checker state (fall=' + fall + ', rise=' + rise + ')', columns: ['server', 'probe this round', 'fail streak', 'pass streak', 'marked'], rows: srv.map(function (s) { return [s.name, actual ? (actual[s.name] === '+' ? 'pass' : 'FAIL') : '-', s.fs, s.ps, s.state === 'UP' ? 'UP' : 'DOWN']; }), hl: hlRow || {} },
            { type: 'bars', label: 'Traffic share % this round', values: srv.map(function (s) { return sh[s.name]; }), idxLabels: srv.map(function (s) { return s.name; }) },
            { type: 'vars', label: 'Running totals', vals: { round: round, 'requests served OK': served, 'requests sent to a broken server': leaked }, hl: leaked ? { 'requests sent to a broken server': 'bad' } : {} }
          ];
        }
        var up0 = srv.filter(function (s) { return s.state === 'UP'; });
        f.push({ narr: 'All servers start <b>UP</b>. Each round: users send 100 requests, split evenly over servers <i>marked</i> UP; then the LB probes every server. A server is marked DOWN after <b>' + fall + '</b> failed probes in a row and UP again after <b>' + rise + '</b> passes in a row.', parts: parts(0, share(up0), null) });
        for (var r = 0; r < rounds; r++) {
          var actual = {}; srv.forEach(function (s) { actual[s.name] = s.seq.charAt(r); });
          var up = srv.filter(function (s) { return s.state === 'UP'; });
          var panic = false;
          if (!up.length) { up = srv.slice(); panic = true; }
          var sh = share(up), lost = 0;
          up.forEach(function (s) { if (actual[s.name] === '-') lost += sh[s.name]; });
          leaked += lost; served += 100 - lost;
          var changes = [], hlRow = {};
          srv.forEach(function (s, i) {
            var ok = actual[s.name] === '+';
            if (ok) { s.ps++; s.fs = 0; if (s.state === 'DOWN' && s.ps >= rise) { s.state = 'UP'; changes.push('<span class="c-g">' + s.name + ' back UP</span> after ' + rise + ' passes'); hlRow[i] = 'ok'; } }
            else { s.fs++; s.ps = 0; if (s.state === 'UP' && s.fs >= fall) { s.state = 'DOWN'; changes.push('<span class="c-r">' + s.name + ' marked DOWN</span> after ' + fall + ' failures'); hlRow[i] = 'bad'; } else if (s.state === 'UP') hlRow[i] = 'cur'; }
          });
          var narr = 'Round ' + (r + 1) + ': ';
          if (panic) narr += '<span class="c-y">Every server is marked DOWN, so the LB "fails open" (panic mode) and sends to all of them — some answers are better than none.</span> ';
          narr += lost ? (panic ? '<span class="c-r">' + lost + ' requests</span> failed because those servers really are broken. ' : '<span class="c-r">' + lost + ' requests</span> went to a server that is actually broken but still marked UP (the detection gap). ') : 'All requests went to working servers. ';
          narr += changes.length ? changes.join('; ') + '. Traffic will shift next round.' : 'No state change.';
          if (!changes.length && srv.some(function (s) { return s.state === 'UP' && s.fs > 0; })) narr += ' A single failure is tolerated — it could be a blip, and fall=' + fall + ' protects against flapping.';
          f.push({ narr: narr, parts: parts(r + 1, sh, actual, hlRow) });
        }
        f.push({ narr: 'Summary: ' + served + ' requests succeeded, <b>' + leaked + '</b> hit a broken server before the checker caught up. Lower <code>fall</code> or the interval to shrink that gap (at the cost of flapping and probe load), and add <b>retries + passive outlier detection</b> so those requests are retried on a healthy server.', parts: parts(rounds, share(srv.filter(function (s) { return s.state === 'UP'; }).length ? srv.filter(function (s) { return s.state === 'UP'; }) : srv), null) });
        return f;
      }
    },
    examples: [
      { title: 'Detection time math', html: `${H.table(['interval', 'fall', 'timeout', 'worst-case time to remove a dead server', 'errors at 2,000 rps over 4 servers'], [['30 s', '2', '5 s', '≈ 65 s', '≈ 32,500'], ['10 s', '3', '2 s', '≈ 32 s', '≈ 16,000'], [H.c('g', '2 s'), H.c('g', '2'), H.c('g', '1 s'), H.c('g', '≈ 5 s'), H.c('g', '≈ 2,500 (and retries can hide most)')]])}<p>Each dead server gets 1/4 of 2,000 rps = 500 rps until it is removed. That is why serious setups combine fast active checks with passive ejection on real errors and one retry on another backend.</p>` },
      { title: 'The deep health check that caused an outage', html: `<p><code>/healthz</code> on every app server ran <code>SELECT 1</code> against the primary database. The DB had a 20-second failover. Every app server failed its check at the same moment → the LB removed <b>all</b> of them → the whole site returned 503, even the pages that did not need the DB (and stayed down longer because servers needed <i>rise</i> passes to return). Fix: liveness checks only the process; readiness reflects things <i>local</i> to the instance; dependency failures are handled inside the app (degrade, serve cache, return errors for just those endpoints).</p>` },
      { title: 'Zero-downtime deploy with draining', html: `<ol><li>Pod gets SIGTERM; <code>preStop</code> sleeps 10 s while readiness flips to failing.</li><li>LB/endpoint controller removes it; no new requests arrive.</li><li>In-flight requests finish (deregistration delay ~30 s).</li><li>Process exits cleanly. The next pod already passed readiness before receiving traffic.</li></ol><p>Skipping step 1 is the classic cause of "a few 502s on every deploy": the process dies while the LB still thinks it is healthy.</p>` },
      { title: 'Gray failure: probe green, users red', html: `<p>A server\'s disk is full: <code>/healthz</code> returns 200 (it touches nothing), but every checkout request fails writing a temp file. Active checks say UP forever. <b>Passive outlier detection</b> (e.g. eject a host after 5 consecutive 5xx for 30 s, never ejecting more than 50% of the pool) catches it from real traffic. Better probes exercise a cheap version of the real path.</p>` }
    ],
    deepDive: `<p><b>Health-check load.</b> 50 LB nodes × 400 backends × 1 probe/s = 20,000 probes/s hitting your fleet. Big setups use centralised health checking (one checker shares results) or hierarchical checks, and keep <code>/healthz</code> trivially cheap.</p>
<p><b>Panic threshold / fail open.</b> If health checks say most backends are down, it is often the checker (or a shared dependency) that is wrong. Envoy\'s <i>panic threshold</i> (default 50%) ignores health and balances across all hosts when too few look healthy; AWS ALB routes to all targets when all are unhealthy. Failing <i>closed</i> would turn a partial problem into a total outage.</p>
<p><b>Max ejection percent.</b> Passive outlier detection must cap how much of the pool it can eject (e.g. 10–50%), otherwise a bad deploy of a dependency ejects everyone.</p>
<p><b>Slow start.</b> A server that just came back (cold JIT, empty caches) can be crushed if it instantly receives its full share. Slow start ramps its weight over 30–60 s.</p>
<p><b>Liveness restarts are dangerous.</b> A liveness probe that fails under load (slow responses) restarts busy pods, which shifts load to the others, which then also fail → a restart storm. Keep liveness generous and shallow; use readiness to shed traffic.</p>
<p><b>Health of the LB itself.</b> LBs run in pairs (VRRP / keepalived floating IP), in managed multi-AZ fleets, or behind DNS health checks / anycast. Cross-zone checks also tell you when a whole AZ is sick so traffic can be shifted away (zonal shift).</p>
<p><b>Health signals beyond up/down.</b> Modern balancers use load feedback (queue depth, CPU, "server is shedding" responses like 503 + Retry-After, or ORCA load reports in gRPC) to adjust weights, not just remove hosts.</p>`,
    aiEra: `<p><b>What AI changes:</b> GPU inference servers are the new hard case for health checks. Loading model weights can take minutes (needs a <b>startup probe</b>), a server can be "up" but have its KV cache full or a GPU in a bad state (needs readiness tied to real capacity), and a request can legitimately run for minutes (draining must wait for streams to finish). Agent backends add another twist: the service is healthy only if the tools/MCP servers it depends on are reachable — but making that a hard health check repeats the "deep check takes everything down" mistake.</p>
<p><b>AIOps:</b> anomaly detection on error rates and latency can flag gray failures faster than fixed thresholds; LLM assistants can summarise "which hosts were ejected and why" from LB logs during an incident.</p>
<p><b>Where AI goes wrong:</b> generated probes often check the database or downstream APIs in <code>/healthz</code>, set aggressive liveness probes that restart slow-starting containers in a loop, and forget <code>preStop</code>/drain delays.</p>
<p><b>What you must still own:</b> the failure-mode reasoning — what happens when <i>every</i> instance fails the same check at once — and the detection-gap math.</p>`,
    problems: [{
      title: 'Design Health Checks That Survive a Database Blip', level: 'Medium', tags: ['health checks', 'readiness', 'cascading failure'], companies: ['Amazon', 'Netflix', 'Zomato'],
      statement: `<p>Your API fleet (40 instances behind an L7 LB) serves product pages (cacheable, read from Redis) and checkout (needs PostgreSQL). Last month a 30-second PostgreSQL failover made <b>every</b> instance fail its health check, the LB removed all of them, and the <b>whole site</b> was down for 3 minutes. Design the health-check setup so this cannot happen again, while still removing truly broken instances quickly.</p>`,
      constraints: `<p>8,000 rps peak. Instances run on Kubernetes. Dead instances must be out of rotation within ~10 s. Deploys happen 20 times a day.</p>`,
      example: `<p>Old <code>/healthz</code>: ${H.c('r', 'process OK AND Redis OK AND Postgres OK')} → one shared dependency failing = 40/40 instances DOWN. New design: ${H.c('g', 'liveness = process only; readiness = instance-local readiness; dependency failure → degrade only checkout')}.</p>`,
      brute: { why: `<p>"Check everything in one deep health endpoint so we never route to a broken server." Because every instance shares the same dependencies, they all fail together, and the LB turns a partial outage (checkout down) into a total one (everything down). Removing health checks entirely is no better: crashed instances would keep receiving traffic.</p>` },
      mcq: { q: 'Which check should fail when the shared PostgreSQL primary is down for 30 s?', options: ['Liveness — restart all pods', 'Readiness — remove all pods from the LB', 'Neither; the app should return errors (or a degraded response) only for endpoints that need the DB', 'The LB\'s TCP check'], answer: 2, explain: 'A shared dependency failing is not an instance problem. Health checks should judge the instance; dependency failures are handled per request (circuit breaker, degraded mode).' },
      hints: [`<p>Hint 1: ask "if this check fails, will removing <i>this</i> instance help?" If every instance would fail it together, it is not an instance health signal.</p>`, `<p>Hint 2: separate liveness (restart me), readiness (do not send me traffic) and dependency health (degrade features).</p>`, `<p>Hint 3: add a safety net — panic/fail-open thresholds and max ejection percent — plus fast passive detection and one retry for truly dead instances.</p>`],
      solution: {
        approach: `<p><b>1. Liveness (<code>/healthz</code>):</b> returns 200 if the process event loop / thread pool responds. No external calls. Generous: period 10 s, failureThreshold 3. A failure means "restart me".</p>
<p><b>2. Readiness (<code>/ready</code>):</b> only instance-local conditions — startup done, local caches warm, not draining, thread pool not saturated. It does <b>not</b> fail just because a <i>shared</i> dependency is down. Period 2–5 s, failureThreshold 2 → dead/unready instances leave in ≤ 10 s.</p>
<p><b>3. Dependencies inside the app:</b> circuit breaker around PostgreSQL; checkout returns a friendly 503 "try again in a minute" while the breaker is open; product pages keep working from Redis/CDN cache. Expose dependency status on a separate <code>/status</code> endpoint for dashboards and alerts, not for the LB.</p>
<p><b>4. Fast removal of truly broken instances:</b> LB passive outlier detection (eject after 5 consecutive 5xx/connection failures for 30 s), capped at max 30% ejection; LB retries idempotent GETs once on another instance.</p>
<p><b>5. Safety nets:</b> LB fail-open / panic threshold (if fewer than 50% look healthy, route to all); alert when more than 20% of instances are unready at once — that is almost always a shared cause.</p>
<p><b>6. Deploys:</b> preStop sleep + readiness flip + 30 s drain, slow start for new pods, maxUnavailable small.</p>`,
        complexity: `<p>Probe load: 40 instances × 1 probe / 3 s × LB nodes (e.g. 3) ≈ 40 probes/s — negligible. Detection: active ≤ ~10 s, passive within a handful of failed requests.</p>`,
        followUps: ['How would you test this design before the next real failover (chaos experiment)?', 'What if Redis also goes down — which features degrade?', 'Should the LB retry POST /checkout? Under what conditions?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Sticky sessions (session affinity)
     ====================================================================== */
  topics.push({
    title: 'Sticky Sessions (Session Affinity)',
    analogy: `<p>You always go to the <b>same barber</b> because he remembers exactly how you like your hair. Great — until he is off sick: the new barber knows nothing about you and you start from zero. And if everyone in town insists on the same barber, he has a queue out the door while the other barbers sit idle.</p>
<p>The fix many shops use: write your preferences on a <b>card kept at the front desk</b> (a shared session store). Now <i>any</i> barber can give you the right cut, and nobody is stuck waiting for one person.</p>`,
    explain: `<p><b>Sticky sessions</b> (session affinity) means the load balancer keeps sending the <b>same client to the same backend</b>, instead of choosing freely for every request.</p>
<h4>Why people use it</h4>
<ul>
<li>The app keeps <b>session state in server memory</b> (logged-in user, shopping cart, multi-step form). Without stickiness the next request may land on a server that has never heard of you.</li>
<li><b>Local caches</b> are warmer if the same user keeps hitting the same box.</li>
<li>Some protocols are naturally per-connection: <b>WebSockets</b>, long uploads, game sessions.</li>
</ul>
<h4>How the LB makes it sticky</h4>
${H.table(['Method', 'How it works', 'Weak spot'], [
  ['LB-inserted cookie', 'LB adds <code>Set-Cookie: SRV=s2</code> (AWS ALB <code>AWSALB</code>, HAProxy <code>cookie SRV insert</code>); later requests carrying it go to s2', 'Only works for clients that keep cookies (browsers, not every API client)'],
  ['Application cookie', 'LB keys on the app\'s own session cookie (e.g. <code>JSESSIONID</code>)', 'Needs the LB to understand the cookie'],
  ['Source-IP hash', 'hash(client IP) → server; no cookie needed, works at L4', 'Thousands of users behind one NAT/carrier IP land on one server; mobile users change IP'],
  ['Hash of a header / user id', 'Consistent hashing on <code>X-User-Id</code>, tenant id, conversation id', 'Hot keys (one huge tenant) overload one server']
])}
<h4>Why it hurts</h4>
<ul>
<li><b>Uneven load:</b> heavy users stay glued to one server; new servers only get <i>new</i> users.</li>
<li><b>Lost state on failure or deploy:</b> when a server dies or restarts, everyone pinned to it loses their session.</li>
<li><b>Slow scale-in and deploys:</b> you must wait for sessions to drain off a server before removing it.</li>
</ul>
<h4>The usual better answer</h4>
<p>Make servers <b>stateless</b>: keep sessions in a shared store (Redis/Memcached/DB) or in a signed token on the client (JWT / signed cookie). Then the LB can pick any healthy server for every request. Keep stickiness only where it buys real performance (cache affinity) and treat it as a <i>preference</i>, not a requirement — if the preferred server is gone, any other server must still work.</p>`,
    clues: [
      '"Users get logged out / lose their cart when we deploy or a server crashes" → in-memory sessions + stickiness → externalise sessions',
      '"One server is overloaded while others are idle" + "mobile users" / "corporate users" → source-IP affinity behind NAT',
      '"Must scale in quickly" / "autoscaling" → avoid hard stickiness; stateless servers',
      '"WebSocket / long-lived connection / multiplayer room" → affinity is natural per connection; plan reconnects and draining',
      '"Cache hit rate per server matters" (per-user caches, LLM prefix cache) → soft affinity via consistent hashing',
      '"Stateful legacy app cannot be changed" → LB cookie stickiness as a stopgap'
    ],
    code: [{
      lang: 'python', run: true, title: 'Affinity by hashing: modulo vs consistent hashing when a server leaves', code: `
import hashlib
from bisect import bisect

def h(key):
    return int(hashlib.md5(key.encode()).hexdigest(), 16)

users = [f"user{i}" for i in range(10_000)]

# --- modulo hashing: server = hash(user) % N ---
def modulo(servers):
    return {u: servers[h(u) % len(servers)] for u in users}

before = modulo(["s1", "s2", "s3", "s4"])
after = modulo(["s1", "s2", "s3"])            # s4 removed
moved = sum(before[u] != after[u] for u in users)
print(f"modulo:     {moved / len(users):.0%} of users moved to a new server")

# --- consistent hashing ring with virtual nodes ---
def ring(servers, vnodes=100):
    points = sorted((h(f"{s}#{v}"), s) for s in servers for v in range(vnodes))
    keys = [p for p, _ in points]
    def owner(u):
        i = bisect(keys, h(u)) % len(keys)
        return points[i][1]
    return {u: owner(u) for u in users}

before = ring(["s1", "s2", "s3", "s4"])
after = ring(["s1", "s2", "s3"])
moved = sum(before[u] != after[u] for u in users)
print(f"consistent: {moved / len(users):.0%} of users moved (only s4's users)")
` }, {
      lang: 'java', title: 'Same interface, two session stores: sticky-only vs stateless', code: `
import java.util.*;
import java.util.concurrent.*;

interface SessionStore {
    Map<String, String> load(String sessionId);
    void save(String sessionId, Map<String, String> data);
}

/** Lives inside ONE server's memory: requires sticky sessions, dies with the server. */
class InMemorySessionStore implements SessionStore {
    private final Map<String, Map<String, String>> sessions = new ConcurrentHashMap<>();
    public Map<String, String> load(String id) { return sessions.getOrDefault(id, new HashMap<>()); }
    public void save(String id, Map<String, String> data) { sessions.put(id, data); }
}

/** Stand-in for Redis: one store shared by ALL servers, so any server can serve any user. */
class SharedSessionStore implements SessionStore {
    static final Map<String, Map<String, String>> REDIS = new ConcurrentHashMap<>();
    public Map<String, String> load(String id) { return new HashMap<>(REDIS.getOrDefault(id, Map.of())); }
    public void save(String id, Map<String, String> data) { REDIS.put(id, new HashMap<>(data)); }
}

class Demo {
    public static void main(String[] args) {
        SessionStore s1 = new SharedSessionStore(), s2 = new SharedSessionStore();
        Map<String, String> cart = s1.load("abc");
        cart.put("items", "3");
        s1.save("abc", cart);                         // request 1 handled by server 1
        System.out.println(s2.load("abc"));           // request 2 on server 2 still sees {items=3}

        SessionStore m1 = new InMemorySessionStore(), m2 = new InMemorySessionStore();
        m1.save("abc", new HashMap<>(Map.of("items", "3")));
        System.out.println(m2.load("abc"));           // {} : without stickiness the cart "vanishes"
    }
}` }, {
      lang: 'text', check: false, title: 'HAProxy and nginx stickiness options', code: `
# HAProxy: LB-inserted cookie (browser clients)
backend web
    mode http
    balance roundrobin
    cookie SRV insert indirect nocache httponly secure
    server web-1 10.0.4.11:8080 check cookie w1
    server web-2 10.0.4.12:8080 check cookie w2

# nginx: consistent hash on a conversation id header (soft affinity for caches)
upstream chat_backends {
    hash $http_x_conversation_id consistent;
    server 10.0.5.11:8080;
    server 10.0.5.12:8080;
    server 10.0.5.13:8080;
}` }],
    codeTitle: ['Modulo vs consistent hashing (Python)', 'Java: in-memory vs shared session store', 'LB stickiness configs'],
    viz: {
      title: 'Sticky sessions: pinned users, uneven load and a crash that loses carts',
      input: 'alice bob carol alice dave alice X bob alice carol bob erin',
      inputLabel: 'User names in request order; X = server S2 crashes at that moment',
      gen: function (input) {
        var reqs = toks(input, 16, 'Enter user names in request order, and X where S2 crashes');
        reqs.forEach(function (r) { if (!/^[A-Za-z][A-Za-z0-9]{0,9}$/.test(r)) throw new Error('Names must be letters/digits (max 10), e.g. alice bob X carol'); });
        var S = ['S1', 'S2', 'S3'], alive = { S1: true, S2: true, S3: true };
        var mem = { S1: {}, S2: {}, S3: {} }, pin = {}, load = { S1: 0, S2: 0, S3: 0 }, rr = 0, lost = 0, crashed = false, f = [];
        var nodes = [box('U', 'Browsers (cookie SRV=...)', 8, 36, 17), box('LB', 'Load balancer (sticky cookie)', 36, 36, 18), box('S1', 'S1', 84, 10, 14), box('S2', 'S2', 84, 36, 14), box('S3', 'S3', 84, 62, 14)];
        function g(hl, ehl, lab) {
          var tags = {}; S.forEach(function (s) { tags[s] = alive[s] ? Object.keys(mem[s]).length + ' sessions' : 'CRASHED'; if (!alive[s]) hl[s] = 'bad'; });
          return { type: 'graph', label: 'Request routing', directed: true, height: 72, nodes: nodes, edges: [['U', 'LB', lab.U || ''], ['LB', 'S1', lab.S1 || ''], ['LB', 'S2', lab.S2 || ''], ['LB', 'S3', lab.S3 || '']], hl: hl, ehl: ehl, tags: tags };
        }
        function memT(hlRow) { return { type: 'table', label: 'Session data in each server\'s RAM', columns: ['server', 'sessions (user: cart items)'], rows: S.map(function (s) { var k = Object.keys(mem[s]); return [s, alive[s] ? (k.length ? k.map(function (u) { return u + ': ' + mem[s][u]; }).join(', ') : '(none)') : 'memory wiped']; }), hl: hlRow || {} }; }
        function pinM(hlKey) { var e = Object.keys(pin).map(function (u) { return [u, pin[u]]; }); return { type: 'map', label: 'Cookie SRV per user (stickiness)', entries: e, hl: hlKey || {} }; }
        function bars() { return { type: 'bars', label: 'Requests handled per server', values: S.map(function (s) { return load[s]; }), idxLabels: S }; }
        f.push({ narr: 'Three app servers keep each user\'s <b>cart in local memory</b>. To make that work, the LB sets a cookie <code>SRV=…</code> on the first response and routes every later request with that cookie to the same server. New users are spread round robin.', parts: [g({}, {}, {}), pinM(), memT(), bars()] });
        reqs.forEach(function (u, k) {
          if (u === 'X') {
            if (crashed) { f.push({ narr: 'S2 is already down — nothing more to crash.', parts: [g({}, {}, {}), pinM(), memT(), bars()] }); return; }
            crashed = true; alive.S2 = false;
            var victims = Object.keys(mem.S2); mem.S2 = {};
            f.push({ narr: '<span class="c-r">S2 crashes</span> (or is redeployed). Its RAM is gone, and with it the carts of <b>' + (victims.length ? victims.join(', ') : 'nobody yet') + '</b>. Health checks remove S2; their browsers still carry <code>SRV=S2</code> cookies that now point nowhere.', parts: [g({ S2: 'bad' }, {}, {}), pinM(victims.reduce(function (a, v) { a[v] = 'bad'; return a; }, {})), memT(one(1, 'bad')), bars()] });
            return;
          }
          var s = pin[u], narr, hl = { U: 'cur', LB: 'cur' }, ehl = { 'U-LB': 'cur' }, lab = { U: u };
          if (s && alive[s]) {
            narr = '<b>' + u + '</b> has cookie <code>SRV=' + s + '</code> → the LB sends them to <b>' + s + '</b> again, where their cart lives. Cart now ' + (mem[s][u] + 1) + ' item(s). (Stickiness working as intended.)';
            mem[s][u]++;
          } else {
            var live = S.filter(function (x) { return alive[x]; });
            var pick = live[rr % live.length]; rr++;
            if (s && !alive[s]) { lost++; narr = '<b>' + u + '</b> arrives with <code>SRV=' + s + '</code>, but ' + s + ' is dead. The LB re-pins them to <b>' + pick + '</b> — which has never seen them. <span class="c-r">Their cart is empty: session lost.</span> This is the core weakness of in-memory sessions + stickiness.'; }
            else narr = 'New user <b>' + u + '</b> (no cookie). Round robin picks <b>' + pick + '</b>; the LB sets <code>SRV=' + pick + '</code> on the response, so ' + u + ' is now glued to ' + pick + '.';
            s = pick; pin[u] = pick; mem[pick][u] = 1;
          }
          load[s]++;
          hl[s] = 'ok'; ehl['LB-' + s] = 'ok'; lab[s] = u;
          f.push({ narr: 'Request ' + (k + 1) + ': ' + narr, parts: [g(hl, ehl, lab), pinM(one(u, 'cur')), memT(one(S.indexOf(s), 'cur')), bars()] });
        });
        var mx = Math.max(load.S1, load.S2, load.S3), mn = Math.min(load.S1, load.S2, load.S3);
        f.push({ narr: 'Result: <b>' + lost + '</b> user(s) lost their session, and load is uneven (' + S.map(function (s) { return s + '=' + load[s]; }).join(', ') + '; busiest/quietest ' + mx + '/' + mn + ') because heavy users stay glued to one server. <b>Fix:</b> keep sessions in a shared store (Redis) or a signed cookie; then the LB can send each request anywhere and a crash loses nothing.', parts: [g({}, {}, {}), memT(), bars(), note('Stickiness is fine as a <i>performance hint</i> (warm caches). It is dangerous as the <i>only place</i> state lives.', 'Takeaway')] });
        return f;
      }
    },
    examples: [
      { title: 'The carrier-NAT hotspot', html: `<p>A mobile carrier puts 40,000 subscribers behind a handful of public IPs. With <code>ip_hash</code> stickiness, all of them map to the <b>same</b> server, which melts at 20× average load while the others idle. Cookie- or user-id-based affinity (or no affinity) fixes it. Same story for big companies behind one corporate proxy IP.</p>` },
      { title: 'Scale-in takes hours', html: `<p>Autoscaling wants to remove 10 of 30 servers at night. With in-memory sticky sessions (30-minute idle timeout), each server must wait until its users go idle or be killed and log them out. Teams end up setting 1-hour deregistration delays — the fleet scales down slowly and costs more. Stateless servers can be removed in seconds.</p>` },
      { title: 'WebSocket chat: stickiness by nature', html: `<p>A WebSocket is one long TCP connection, so it is pinned to one server for its life whether you like it or not. The real design questions: (1) how does a message for user B reach the server holding B\'s socket? → a pub/sub backbone (Redis pub/sub, Kafka, or a presence service mapping user → server); (2) what happens on deploy? → drain: tell clients to reconnect with jitter so they spread across servers.</p>` },
      { title: 'Good stickiness: cache affinity', html: `<p>A recommendation service keeps a 2 GB per-tenant feature cache. Routing <code>tenant_id</code> by consistent hashing to the same 2 servers keeps hit rates at 95% instead of 30%. If a server dies, its tenants move to the next server on the ring and just rebuild cache — no correctness problem, only a temporary slowdown. That is "soft" affinity done right.</p>` }
    ],
    deepDive: `<p><b>Duration-based vs application-based cookies.</b> LB-generated cookies (e.g. AWS ALB <code>AWSALB</code>) expire after a set duration; application-based stickiness follows the app\'s session cookie. Both require clients that store cookies; many API clients do not.</p>
<p><b>Consistent hashing with bounded loads</b> (Google, 2017; used in HAProxy's <code>hash-balance-factor</code>) keeps affinity but caps any server at, say, 125% of average load — overflow keys spill to the next server. This fixes the hot-key problem of pure hashing while keeping most affinity.</p>
<p><b>Session replication</b> (e.g. Tomcat clustering) copies sessions between servers so failover keeps state, but costs network and memory and scales poorly beyond a few nodes. A central store (Redis with replication) is the usual choice; signed/encrypted cookies or JWTs move state to the client (no lookups, but size limits and harder revocation — keep a deny-list or short expiry).</p>
<p><b>Stickiness across layers.</b> CDN → global LB → regional LB → pod. Affinity at one layer is useless if another layer re-balances (e.g. a user bounced between regions loses their regional session). Multi-region apps need session data available in every region or region-pinned users.</p>
<p><b>Accidental stickiness.</b> HTTP keep-alive and HTTP/2 connection reuse mean a single client often keeps hitting one server even without affinity. Load tests from a few clients therefore look badly balanced — use many client connections.</p>
<p><b>Draining sticky servers.</b> Stop assigning <i>new</i> sessions to a server first ("drain" state in HAProxy, weight 0), let existing ones finish, then remove it.</p>`,
    aiEra: `<p><b>What AI changes:</b> stickiness is back — for performance. LLM servers keep a <b>KV cache</b> of the prompt prefix (system prompt + conversation so far). Routing the next turn of the same conversation to the same GPU replica can skip recomputing thousands of tokens, cutting time-to-first-token sharply. Inference routers (vLLM/SGLang routers, llm-d, gateway inference extensions) do <b>prefix-aware soft affinity</b> with load-aware fallback — the "cache affinity" pattern, not the "state lives only here" anti-pattern.</p>
<p><b>Agents and MCP:</b> the MCP streamable HTTP transport can use an <code>Mcp-Session-Id</code> header for stateful sessions; if a server keeps that state in memory, you need affinity on that header behind a load balancer — or a shared session store.</p>
<p><b>Where AI goes wrong:</b> generated configs reach for <code>ip_hash</code> (NAT hotspots), or "solve" lost carts by turning on stickiness instead of externalising state.</p>
<p><b>What you must still own:</b> the rule "affinity may make things faster but must never be needed for correctness", and what happens to pinned users on crash, deploy and scale-in.</p>`,
    problems: [{
      title: 'Users Get Logged Out After Every Deploy', level: 'Medium', tags: ['sticky sessions', 'stateless', 'sessions'], companies: ['Booking.com', 'Salesforce', 'Swiggy'],
      statement: `<p>A Java web app runs on 12 servers behind an ALB with cookie stickiness enabled. Sessions (login + cart) live in the servers\' memory. Every deploy (rolling, 2 servers at a time) logs out ~1/6 of users per step and empties their carts; support tickets spike. Product also wants autoscaling that can scale in quickly at night. Redesign session handling.</p>`,
      constraints: `<p>2M daily users, ~50k concurrent sessions, average session 4 KB, 30-minute idle expiry. Deploys 5× per day. Session reads on every request (~6k rps).</p>`,
      example: `<p>Step 1 of the deploy restarts S1 and S2 → ${H.c('r', 'every user pinned to S1/S2 loses login + cart')}. With a shared store: ${H.c('g', 'restarted servers are irrelevant; the next request on any server loads the session from Redis')}.</p>`,
      brute: { why: `<p>"Increase the stickiness duration and drain servers for 30 minutes before each restart." Deploys now take hours (6 steps × 30+ minutes), crashes still lose sessions, load stays uneven and scale-in remains slow. It treats the symptom, not the cause: state living in one process\'s RAM.</p>` },
      mcq: { q: 'What is the root cause of the logouts?', options: ['ALB cookie duration too short', 'Session state is stored only in the memory of the server the user is pinned to', 'Too few servers', 'DNS TTL'], answer: 1, explain: 'Any restart or crash destroys that memory. Stickiness only hides the problem while servers never change.' },
      hints: [`<p>Hint 1: ask where the session bytes physically live. What happens to them when that process restarts?</p>`, `<p>Hint 2: move state out of the web servers — a shared low-latency store, or the client itself (signed cookie / token).</p>`, `<p>Hint 3: size the store (50k × 4 KB), make it highly available, plan the migration so existing sessions are not dropped, then turn stickiness off.</p>`],
      solution: {
        approach: `<p><b>Target:</b> stateless web servers; sessions in a <b>shared store</b>; stickiness off (or kept only as a soft cache hint).</p>
<p><b>Store choice:</b> Redis (managed, primary + replica across AZs). Size: 50k sessions × 4 KB ≈ 200 MB — tiny. Key <code>sess:{id}</code>, value = serialized session, <code>EXPIRE 1800</code> refreshed on access (sliding expiry). ~6k reads/s is trivial for one Redis node; Spring Session (or similar) plugs in without rewriting the app.</p>
<p><b>Alternative:</b> keep the login identity in a signed, encrypted cookie / short-lived JWT (no store lookup), and only the cart in Redis or the DB (carts are business data — many shops persist them in the database so they survive across devices).</p>
<p><b>Migration without logging everyone out:</b> deploy a version that <i>reads</i> from memory then Redis and <i>writes</i> to both; wait 30 minutes (one idle timeout) so all active sessions exist in Redis; deploy the Redis-only version; then disable ALB stickiness.</p>
<p><b>Result:</b> rolling deploys and crashes lose nothing; LB can use least-outstanding-requests; scale-in needs only a short connection drain (~30 s).</p>
<p><b>Risks handled:</b> Redis outage → app degrades (treat as logged-out, read-only browsing) rather than crash; session fixation → regenerate ids at login; keep sessions small to avoid network cost.</p>`,
        complexity: `<p>Extra latency: ~0.3–1 ms per request for a Redis GET in the same AZ. Memory ≈ 200 MB (+ replica). Deploy time drops from hours (drain-based) to minutes.</p>`,
        followUps: ['How do you revoke a JWT-based session immediately (e.g. stolen device)?', 'What if Redis becomes the single point of failure?', 'Where would you still keep soft affinity, and why?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Global load balancing (GSLB)
     ====================================================================== */
  var GEO_REGIONS = ['us-east', 'eu-west', 'ap-south', 'ap-northeast'];
  var GEO_RTT = {
    mumbai: [190, 120, 5, 120], tokyo: [160, 220, 120, 5], london: [75, 12, 115, 220], newyork: [8, 70, 190, 160],
    sydney: [200, 260, 150, 110], saopaulo: [115, 190, 300, 260], singapore: [220, 160, 60, 70], frankfurt: [90, 25, 110, 230],
    sanfrancisco: [65, 140, 230, 105], dubai: [190, 110, 35, 160], jakarta: [230, 170, 70, 80], seoul: [180, 240, 130, 30]
  };
  topics.push({
    title: 'Global Load Balancing: Sending Users to the Right Region',
    analogy: `<p>A pizza chain advertises <b>one phone number</b> for the whole country. When you call, the system connects you to the <b>nearest open branch</b>. If that branch has a kitchen fire, your call is quietly sent to the next nearest one — slower delivery, but you still get pizza. If one branch is swamped on a Friday night, some calls are sent to a neighbour with spare ovens.</p>
<p>Global load balancing is that phone system for your data centers: one name (<code>shop.com</code>), many regions, and a brain that picks the best <i>healthy</i> region for each user.</p>`,
    explain: `<p>Once you run in more than one <b>region</b> (for latency, disaster recovery or data-residency laws), something must decide <b>which region</b> each user reaches. That is <b>global server load balancing (GSLB)</b>. A regional load balancer then picks a server inside the region.</p>
<h4>The three main techniques</h4>
${H.table(['Technique', 'How it picks', 'Failover speed', 'Examples'], [
  ['DNS-based (GeoDNS / latency-based DNS)', 'Authoritative DNS answers with a different IP depending on the resolver\'s (or client subnet\'s) location, measured latency, weights and health', H.c('y', 'Bounded by DNS TTL + resolvers that ignore it (30 s – minutes)'), 'Route 53 latency/geo/failover/weighted records, Cloudflare/NS1/Azure Traffic Manager'],
  ['Anycast', 'The same IP is announced via BGP from many locations; the internet routes each packet to the "nearest" (by BGP) site', H.c('g', 'Seconds: withdraw the route and traffic moves'), 'Cloudflare, Google Front End, AWS Global Accelerator, CDNs, DNS roots'],
  ['Global L7 proxy (anycast front + smart routing)', 'Users hit the nearest edge via anycast; the edge proxy picks a backend region by health, capacity and latency', H.c('g', 'Seconds, per request'), 'Google Cloud global external Application LB, Cloudflare Load Balancing, Azure Front Door']
])}
<h4>Routing policies</h4>
<ul>
<li><b>Latency-based</b>: lowest measured RTT region.</li>
<li><b>Geolocation / geoproximity</b>: by country/continent — also used for <b>data residency</b> (EU users stay in the EU).</li>
<li><b>Weighted</b>: 90/10 splits for migrations, canaries, or matching regional capacity.</li>
<li><b>Failover</b>: primary/secondary — active-passive disaster recovery.</li>
</ul>
<h4>Active-active vs active-passive</h4>
<p><b>Active-active:</b> all regions serve users all the time — best latency, capacity already "warm", but the <b>data layer</b> must handle writes in several regions (or route writes to one home region). <b>Active-passive:</b> one region serves, the other waits — simpler data, but failover is a rarely-tested event and the standby may be cold.</p>
<p><b>Capacity rule:</b> if one of N regions fails, the others must absorb its traffic. With 3 equal regions each must be able to run at 150% of normal load (or you shed load during the event).</p>
<h4>Layers working together</h4>
<p>GSLB (DNS / anycast) → regional L4 → L7 proxies → services. Each layer health-checks the next one, and each layer can route around failures at its own scope: server, zone, region.</p>`,
    clues: [
      '"Users in Asia/Europe are slow" → is there a region (or CDN edge) near them, and is GSLB sending them there?',
      '"Survive a whole region going down" → multi-region + GSLB failover + data replicated to the other region + spare capacity',
      '"EU data must stay in the EU" (GDPR, data residency) → geolocation routing + region-pinned data',
      '"Failover took 20 minutes even though health checks fired in 30 s" → DNS TTL and resolvers/clients caching',
      '"One IP address worldwide" / "DDoS absorption" → anycast',
      '"Shift 10% of traffic to the new region" → weighted routing'
    ],
    code: [{
      lang: 'python', run: true, title: 'A GSLB decision: lowest latency among healthy regions with spare capacity', code: `
REGIONS = ["us-east", "eu-west", "ap-south", "ap-northeast"]
RTT_MS = {                      # measured round-trip times from each user area
    "mumbai":    [190, 120,   5, 120],
    "singapore": [220, 160,  60,  70],
    "london":    [ 75,  12, 115, 220],
    "tokyo":     [160, 220, 120,   5],
}
healthy = {"us-east": True, "eu-west": True, "ap-south": True, "ap-northeast": True}
load = {r: 0.0 for r in REGIONS}             # current utilisation 0..1
MAX_UTIL = 0.8                               # keep headroom for failover

def pick_region(area):
    options = sorted(zip(RTT_MS[area], REGIONS))
    for rtt, region in options:              # nearest first
        if healthy[region] and load[region] < MAX_UTIL:
            return region, rtt
    # everything unhealthy or full: fail open to the nearest healthy region
    for rtt, region in options:
        if healthy[region]:
            return region, rtt
    raise RuntimeError("no healthy region at all")

print("normal:", {a: pick_region(a) for a in RTT_MS})

healthy["ap-south"] = False                  # Mumbai region fails health checks
print("ap-south down:", {a: pick_region(a) for a in RTT_MS})

load["ap-northeast"] = 0.85                  # Tokyo is now nearly full
print("tokyo full:", {a: pick_region(a) for a in ["mumbai", "singapore"]})
` }, {
      lang: 'yaml', check: false, title: 'Route 53 latency records with health checks (CloudFormation-style)', code: `
ApiUsEast:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneName: shop.com.
    Name: api.shop.com.
    Type: A
    SetIdentifier: us-east-1
    Region: us-east-1                 # latency-based routing
    HealthCheckId: !Ref UsEastHealth  # unhealthy => never returned
    AliasTarget:
      DNSName: !GetAtt UsEastAlb.DNSName
      HostedZoneId: !GetAtt UsEastAlb.CanonicalHostedZoneID
      EvaluateTargetHealth: true

ApiApSouth:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneName: shop.com.
    Name: api.shop.com.
    Type: A
    SetIdentifier: ap-south-1
    Region: ap-south-1
    HealthCheckId: !Ref ApSouthHealth
    AliasTarget:
      DNSName: !GetAtt ApSouthAlb.DNSName
      HostedZoneId: !GetAtt ApSouthAlb.CanonicalHostedZoneID
      EvaluateTargetHealth: true` }],
    codeTitle: ['GSLB decision (Python)', 'Latency-based DNS (YAML)'],
    viz: {
      title: 'GSLB: nearest healthy region, then a region failure',
      input: 'Mumbai Tokyo London NewYork Singapore Dubai down=ap-south',
      inputLabel: 'User cities (Mumbai Tokyo London NewYork Sydney SaoPaulo Singapore Frankfurt SanFrancisco Dubai Jakarta Seoul) and down=region',
      gen: function (input) {
        var t = toks(input, 9, 'Format: Mumbai Tokyo London down=ap-south');
        var users = [], down = null;
        t.forEach(function (x) {
          if (/^down=/i.test(x)) { down = x.slice(5).toLowerCase(); if (GEO_REGIONS.indexOf(down) < 0) throw new Error('down= must be one of ' + GEO_REGIONS.join(', ')); }
          else { var k = x.toLowerCase(); if (!GEO_RTT[k]) throw new Error('Unknown city ' + x + '. Use: ' + Object.keys(GEO_RTT).join(', ')); if (users.indexOf(k) < 0) users.push(k); }
        });
        if (!users.length) throw new Error('Add at least one city');
        if (users.length > 8) throw new Error('At most 8 cities');
        var healthy = { 'us-east': true, 'eu-west': true, 'ap-south': true, 'ap-northeast': true };
        var nodes = [], gapU = 72 / users.length;
        users.forEach(function (u, i) { nodes.push(box('u_' + u, u, 9, Math.round(gapU / 2 + i * gapU), 14)); });
        nodes.push(box('G', 'GSLB (latency DNS / anycast)', 40, 36, 18));
        var regLbl = { 'us-east': 'us-east (Virginia)', 'eu-west': 'eu-west (Ireland)', 'ap-south': 'ap-south (Mumbai)', 'ap-northeast': 'ap-northeast (Tokyo)' };
        GEO_REGIONS.forEach(function (r, i) { nodes.push(box(r, regLbl[r], 86, 9 + i * 18, 20)); });
        var assign = {};
        function best(u) { var b = null; GEO_REGIONS.forEach(function (r, i) { if (healthy[r] && (b === null || GEO_RTT[u][i] < GEO_RTT[u][GEO_REGIONS.indexOf(b)])) b = r; }); return b; }
        function g(hl, ehl) {
          var e = [];
          users.forEach(function (u) { if (assign[u]) e.push(['u_' + u, assign[u], GEO_RTT[u][GEO_REGIONS.indexOf(assign[u])] + ' ms']); });
          GEO_REGIONS.forEach(function (r) { if (!healthy[r]) hl[r] = 'bad'; });
          return { type: 'graph', label: 'Who is served where', directed: true, height: 72, nodes: nodes, edges: e, hl: hl, ehl: ehl };
        }
        function lt(hlRow) {
          return { type: 'table', label: 'Measured RTT (ms) from each city to each region', columns: ['city'].concat(GEO_REGIONS.map(function (r) { return healthy[r] ? r : r + ' (DOWN)'; })), rows: users.map(function (u) { return [u].concat(GEO_RTT[u].map(function (v, i) { var r = GEO_REGIONS[i]; return assign[u] === r ? v + ' ✓' : healthy[r] ? String(v) : v + ' ✗'; })); }), hl: hlRow || {} };
        }
        var f = [];
        f.push({ narr: 'We run in <b>4 regions</b>. The GSLB (latency-based DNS, or an anycast front door) knows the measured round-trip time from each user area to each region, plus each region\'s health. Goal: send every user to the <b>nearest healthy</b> region.', parts: [g({ G: 'cur' }, {}), lt()] });
        users.forEach(function (u, i) {
          var r = best(u); assign[u] = r;
          var e = {}; e['u_' + u + '-' + r] = 'ok';
          var hl = { G: 'cur' }; hl['u_' + u] = 'cur'; hl[r] = 'ok';
          f.push({ narr: '<b>' + u + '</b>: the lowest RTT is to <b>' + r + '</b> (' + GEO_RTT[u][GEO_REGIONS.indexOf(r)] + ' ms). DNS returns that region\'s load balancer IP (or anycast routes there), so ' + u + '\'s requests stay close to home.', parts: [g(hl, e), lt(one(i, 'cur'))] });
        });
        if (down) {
          healthy[down] = false;
          var hit = users.filter(function (u) { return assign[u] === down; });
          var hl0 = {}; hl0[down] = 'bad';
          f.push({ narr: '<span class="c-r">Region ' + down + ' fails.</span> Health checkers in several locations all see it down (several vantage points avoid a false alarm caused by one bad network path). ' + (hit.length ? 'Affected users: <b>' + hit.join(', ') + '</b>.' : 'No user in this list was using it — try another down= region.'), parts: [g(hl0, {}), lt()] });
          f.push({ narr: 'With <b>DNS-based</b> GSLB the authoritative server stops returning ' + down + ' immediately, but resolvers keep the old answer until its <b>TTL</b> expires (say 60 s), and some clients longer. During that window affected users see errors (unless the region\'s own LB can forward elsewhere). With <b>anycast</b>, the region withdraws its BGP route and traffic moves within seconds.', parts: [g(hl0, {}), { type: 'vars', label: 'Failover timeline (DNS GSLB, TTL 60 s)', vals: { 'detect (3 checks × 10 s)': '~30 s', 'TTL expiry': 'up to 60 s', 'stragglers ignoring TTL': 'minutes', 'total for most users': '~1.5 min' }, hl: { 'TTL expiry': 'cur' } }] });
          hit.forEach(function (u) {
            var old = GEO_RTT[u][GEO_REGIONS.indexOf(down)];
            var r = best(u); assign[u] = r;
            var e = {}; e['u_' + u + '-' + r] = 'cur';
            var hl = {}; hl['u_' + u] = 'cur'; hl[r] = 'ok';
            f.push({ narr: '<b>' + u + '</b> is re-routed to the next best healthy region, <b>' + r + '</b>: ' + old + ' ms → <b>' + GEO_RTT[u][GEO_REGIONS.indexOf(r)] + ' ms</b>. Slower, but working. That region must have <b>spare capacity</b> for this extra traffic — plan for it before the incident, not during.', parts: [g(hl, e), lt(one(users.indexOf(u), 'win'))] });
          });
        }
        var avg = Math.round(users.reduce(function (a, u) { return a + GEO_RTT[u][GEO_REGIONS.indexOf(assign[u])]; }, 0) / users.length);
        f.push({ narr: 'Final routing: average RTT <b>' + avg + ' ms</b>. Routing users is the easy half; the hard half is the <b>data</b>: a user moved to another region needs their data there too (replication, and a plan for writes). Try <code>down=eu-west</code> with London and Frankfurt.', parts: [g({ G: 'sel' }, {}), lt(), note('GSLB = pick a <b>region</b>. Regional LB = pick a <b>server</b>. Health checks at both levels; spare capacity in every region for its neighbour\'s users.', 'Takeaway')] });
        return f;
      }
    },
    examples: [
      { title: 'Why physics forces multi-region', html: `<p>Light in fibre travels ~200 km per ms. Mumbai → Virginia is ~13,000 km in a straight line, more along real cables: <b>≥ 65 ms one way, ~130 ms+ RTT</b> in theory, 180–220 ms in practice. A page needing 4 sequential round trips (DNS, TCP, TLS, request) costs ~800 ms before any server work. A Mumbai region or edge brings each RTT down to ~5–20 ms.</p>` },
      { title: 'Public resolvers and the "wrong region" bug', html: `<p>Users in Jakarta use a public DNS resolver whose nearest instance is in Singapore; without <b>EDNS Client Subnet</b> your GeoDNS sees "Singapore" and that is usually fine. But a corporate VPN that sends all DNS through a Virginia resolver makes Indian employees look American → they are routed to us-east (200 ms). Anycast and latency measured from real users (RUM) avoid this class of bug.</p>` },
      { title: 'Data residency with geolocation routing', html: `<p>Rule: EU customers\' personal data must stay in the EU. Geolocation routing sends EU users to <code>eu-west</code>; their data lives only in EU databases. Failover for EU users goes to <code>eu-central</code>, <b>never</b> to us-east, even if us-east is closer to healthy. GSLB policy is therefore a legal decision as much as a latency one.</p>` },
      { title: 'Capacity planning for regional failure', html: `${H.table(['Regions', 'Normal load per region', 'Load per survivor if one fails', 'Provision each region for'], [['2', '50%', '100%', '2× normal (or shed load)'], ['3', '33%', '50%', '1.5× normal'], ['4', '25%', '33%', '1.33× normal']])}<p>More regions = cheaper failover headroom, but more operational complexity and harder data consistency.</p>` }
    ],
    deepDive: `<p><b>DNS GSLB limits.</b> DNS sees the <i>resolver</i>, not the user (ECS helps when supported); answers are cached for the TTL and clients may cache longer; failover is coarse. It is cheap, simple and works for any protocol, which is why it is still the most common first layer.</p>
<p><b>Anycast details.</b> BGP picks paths by policy and AS-path length, not latency, so "nearest" is approximate. TCP over anycast works because routes are mostly stable; a route change mid-connection can move packets to a different site that has no connection state (rare, but real — long-lived connections and QUIC connection IDs help). Anycast is excellent at absorbing DDoS: attack traffic is split across every site.</p>
<p><b>Global L7 front doors</b> terminate TLS at the nearest edge, then carry the request over the provider\'s private backbone to the chosen backend region, with per-request health and capacity-aware routing ("waterfall" to the next region when one is full). Failover becomes seconds and invisible to DNS.</p>
<p><b>Data layer is the real problem.</b> Options: (1) <i>Read local, write global</i>: reads from a local replica, writes to one primary region (simple; remote writes are slow). (2) <i>Home region per user</i>: each user\'s data lives in one region; GSLB or the edge routes them there. (3) <i>Multi-primary</i> databases (Spanner, CockroachDB, DynamoDB global tables, Cassandra) with conflict resolution or consensus — at the cost of write latency or eventual consistency. Failover must also promote replicas and fence the old primary to avoid split brain.</p>
<p><b>Failure traps:</b> failover creates a <b>thundering herd</b> (cold caches, connection storms) on the surviving region; health checks that only test "is the LB up" miss a broken database behind it; untested failover usually fails. Run regular game days and regional evacuation drills (shift traffic away on purpose).</p>`,
    aiEra: `<p><b>What AI changes:</b> for AI inference the scarce resource is <b>GPU capacity</b>, not distance. Global routing for LLM APIs often sends requests to whichever region has free accelerators ("cross-region inference"), accepting 100+ ms of extra network latency because generation itself takes seconds. Model and data-residency rules (where prompts may be processed) add geolocation constraints on top.</p>
<p><b>Use AI as a partner:</b> give it your regions, user distribution and latency matrix and ask for a routing/capacity table for each single-region failure; ask it to list everything that must also fail over (DNS, certificates, secrets, queues, databases).</p>
<p><b>Where AI goes wrong:</b> it designs a beautiful multi-region routing layer and hand-waves the database ("just replicate it"), ignores DNS caching in failover-time estimates, and forgets the surviving region needs headroom.</p>
<p><b>What you must still own:</b> RTO/RPO targets, which data may live where, and the honest failover timeline (detection + TTL + data promotion + cache warm-up).</p>`,
    problems: [{
      title: 'Plan Region Failover for a Two-Region App', level: 'Hard', tags: ['gslb', 'multi-region', 'failover', 'dns'], companies: ['Amazon', 'Microsoft', 'PhonePe'],
      statement: `<p>A payments-adjacent consumer app runs in <code>ap-south</code> (primary, all writes) and <code>ap-southeast</code> (warm standby with an async read replica). Leadership wants: if ap-south fails, users are served from ap-southeast within <b>5 minutes</b> (RTO) losing at most <b>30 seconds</b> of data (RPO). Design the global load balancing and the failover procedure.</p>`,
      constraints: `<p>15k rps at peak, 90% reads. Mobile apps + web. Current DNS TTL is 3600 s. PostgreSQL with async streaming replication (lag usually &lt; 2 s). The standby runs at 30% of primary capacity.</p>`,
      example: `<p>Today: ap-south dies → someone notices after 10 min → manual DNS change → ${H.c('r', '1-hour TTL keeps clients on the dead region')} → standby is too small and falls over. Target: ${H.c('g', 'automatic detection, 60 s TTL or anycast, pre-scaled standby, scripted DB promotion')}.</p>`,
      brute: { why: `<p>"We have a second region, so we're covered." With a 1-hour TTL, manual detection, a standby sized at 30% and an unrehearsed database promotion, real RTO is hours and the standby collapses under full load. And promoting a replica without fencing the old primary risks split-brain double writes.</p>` },
      mcq: { q: 'With DNS-based failover, which change matters most for hitting a 5-minute RTO?', options: ['A bigger database', 'Lowering the record TTL (e.g. 60 s) and automating health-check-driven failover', 'Adding a CDN', 'Using HTTP/3'], answer: 1, explain: 'Clients keep using cached answers until the TTL expires. A 3600 s TTL alone makes a 5-minute RTO impossible for DNS-based failover.' },
      hints: [`<p>Hint 1: write the failover timeline as a sum: detection + decision + DNS/anycast propagation + DB promotion + capacity ramp. Every term must fit in 5 minutes.</p>`, `<p>Hint 2: the standby must be able to take 100% of traffic quickly — pre-scale or autoscale with warm pools, and keep caches warm.</p>`, `<p>Hint 3: the data side needs promotion + fencing (stop the old primary from accepting writes) + an RPO check on replication lag.</p>`],
      solution: {
        approach: `<p><b>Routing layer.</b> Use a failover (primary/secondary) policy for <code>api.shop.com</code> with health checks from multiple vantage points against a deep-but-regional endpoint (LB → app → DB read). Lower TTL to 60 s. Better: put a global anycast L7 front door in front of both regions so failover happens at the edge in seconds and is immune to DNS caching (mobile apps also cache DNS).</p>
<p><b>Detection.</b> Unhealthy after 3 consecutive failures at 10 s intervals from ≥ 3 regions (≈ 30 s). Automatic for traffic routing; database promotion gated by an on-call "big red button" runbook or automation with strict checks (to avoid flapping into a split-brain).</p>
<p><b>Capacity.</b> Keep the standby at 100% of peak for stateless tiers (or autoscaling with warm pools and pre-pulled images that reach 100% in &lt; 3 min). Keep caches warm by replaying a fraction of read traffic or using a replicated cache.</p>
<p><b>Data.</b> Monitor replication lag; alert if &gt; 10 s (RPO budget 30 s). Failover: fence the old primary (revoke its network/credentials, STONITH), promote the replica, repoint connection strings via service discovery/DNS with low TTL. Use idempotency keys on payment-like writes so client retries after failover cannot double-apply.</p>
<p><b>Timeline:</b> detect 30 s + decide 60 s + routing ≤ 60 s + DB promote 60 s + ramp ≤ 60 s ≈ 4.5 min.</p>
<p><b>Prove it:</b> quarterly game days that evacuate ap-south for real, measure RTO/RPO, and fail back.</p>`,
        complexity: `<p>Cost: roughly doubles stateless compute (hot standby) — or ~1.3× with fast autoscaling; DNS query cost rises with 60 s TTL (negligible). RTO ≈ 4–5 min, RPO ≈ replication lag (seconds).</p>`,
        followUps: ['How would you fail back without losing writes made in the standby?', 'What changes if you go active-active instead?', 'How do you stop the health checker itself from triggering a false failover?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Choose L4 or L7 for Each Service', level: 'Easy', tags: ['l4', 'l7', 'load balancer'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Your company is moving to the cloud. For each workload, choose an <b>L4</b> or <b>L7</b> load balancer and give one reason: (a) the public website and REST API, (b) a PostgreSQL read-replica pool, (c) a UDP multiplayer game server fleet, (d) gRPC calls between microservices, (e) an MQTT broker cluster for 1M IoT devices, (f) an endpoint where partners authenticate with client TLS certificates that the <i>app</i> must verify.</p>`,
    constraints: `<p>You may use more than one tier. Justify each choice in one sentence based on what the balancer needs to see.</p>`,
    example: `<p>(a) → ${H.c('g', 'L7')}: needs path/host routing, TLS termination, WAF and per-request balancing. (b) → ${H.c('b', 'L4')}: not HTTP, long-lived connections, balance with least-connections.</p>`,
    brute: { why: `<p>"Use L7 everywhere because it is smarter" fails for UDP games, databases and MQTT (L7 HTTP balancers cannot parse them) and breaks app-level client-cert auth. "Use L4 everywhere because it is faster" loses path routing, canaries and per-request balancing, and badly unbalances gRPC.</p>` },
    mcq: { q: 'Which question decides L4 vs L7 most often?', options: ['How many servers you have', 'Whether the balancer must look inside the request (path, headers, each HTTP/2 stream)', 'Which cloud you use', 'The programming language of the service'], answer: 1, explain: 'L7 is needed exactly when decisions depend on application-level content or per-request balancing; otherwise L4 is cheaper and protocol-agnostic.' },
    hints: [`<p>Hint 1: for each workload ask "is it HTTP?" If not, L7 HTTP balancers cannot help — that points to L4.</p>`, `<p>Hint 2: if it is HTTP, ask "do I need to route or balance per request?" (paths, headers, HTTP/2 multiplexing) → L7.</p>`, `<p>Hint 3: if the backend itself must see the raw TLS handshake (client certs) → L4 pass-through, or an L7 that forwards the verified cert in a header.</p>`],
    solution: {
      approach: `<p>${H.table(['Workload', 'Choice', 'Reason'], [['(a) Website + REST', 'L7', 'Path/host routing, TLS termination, WAF, retries, canary, per-request balancing'], ['(b) Postgres replicas', 'L4', 'Not HTTP; connections are long-lived; least-connections; app-side pooling'], ['(c) UDP game', 'L4 (UDP)', 'L7 HTTP LBs cannot handle custom UDP; latency critical'], ['(d) gRPC', 'L7 (mesh / gRPC-aware LB) or client-side LB', 'HTTP/2 multiplexing makes connection-level balancing lumpy'], ['(e) MQTT', 'L4 (TCP)', 'Millions of idle TCP connections, non-HTTP protocol; consider PROXY protocol to keep client IP'], ['(f) Client-cert partners', 'L4 TLS pass-through (or L7 mTLS that forwards the cert)', 'The app needs the client certificate from the handshake']])}</p><p>Common production shape: an L4 tier (cloud NLB / anycast) in front of an L7 fleet for HTTP traffic, and separate L4 balancers for non-HTTP protocols.</p>`,
      complexity: `<p>L4: millions of connections per balancer, microseconds of added latency. L7: more CPU per request (TLS + parsing), ~0.1–1 ms added latency, but far richer behaviour.</p>`,
      followUps: ['Where would you terminate TLS for (a) and why?', 'How would you preserve the client IP for (e)?', 'What changes for (d) if you have 2,000 client pods?']
    }
  });

  practice.push({
    title: 'Trace a Cold DNS Lookup and Count the Round Trips', level: 'Easy', tags: ['dns', 'latency'], companies: ['Google', 'Cloudflare'],
    statement: `<p>A user in Delhi opens <code>https://img.photos-app.com/cat.jpg</code> for the first time. Their resolver\'s cache is completely cold. List every DNS query the resolver makes, what each server answers, what gets cached (with plausible TTLs), and estimate total time to the first byte of the image, including TCP and TLS.</p>`,
    constraints: `<p>Assume RTTs: laptop→resolver 5 ms, resolver→root 15 ms, resolver→.com TLD 30 ms, resolver→authoritative 60 ms, laptop→server 80 ms. TLS 1.3 (1 RTT). No CDN.</p>`,
    example: `<p>Second visit 2 minutes later: ${H.c('g', 'resolver cache hit → ~5 ms DNS')} (or 0 ms from the browser cache), TCP + TLS still needed unless the connection is reused.</p>`,
    brute: { why: `<p>Saying "DNS converts the name to an IP" and stopping there misses the hierarchy, the caching of referrals and the fact that DNS + TCP + TLS each cost round trips before a single byte of the image moves — the real reason first visits are slow.</p>` },
    mcq: { q: 'Which server returns the actual A record for img.photos-app.com?', options: ['A root server', 'The .com TLD server', 'The authoritative nameserver for photos-app.com', 'The browser'], answer: 2, explain: 'Root and TLD servers only return referrals (NS records). The authoritative server for the zone holds the final answer.' },
    hints: [`<p>Hint 1: the resolver walks root → TLD → authoritative, and each step answers either with a referral or with the final answer.</p>`, `<p>Hint 2: every response is cached for its own TTL; NS referrals typically live for days, A records for minutes.</p>`, `<p>Hint 3: add up DNS (5 + 15 + 30 + 60), then TCP handshake (1 RTT), TLS 1.3 (1 RTT) and the HTTP request (1 RTT).</p>`],
    solution: {
      approach: `<p><b>DNS walk:</b> (1) laptop → resolver: recursive query for <code>img.photos-app.com</code>. (2) resolver → root: referral to <code>.com</code> NS (cache ~2 days). (3) resolver → .com TLD: referral to <code>ns1.photos-app.com</code> etc. (cache ~1–2 days). (4) resolver → authoritative: <code>A 198.51.100.20</code>, TTL e.g. 300 s (cache 5 min). (5) resolver → laptop: answer; browser and OS cache it too.</p>
<p><b>Time:</b> DNS ≈ 5 + 15 + 30 + 60 = <b>110 ms</b>. TCP handshake 80 ms, TLS 1.3 80 ms, HTTP request/first byte 80 ms → <b>≈ 350 ms</b> to first byte (+ server time).</p>
<p><b>Improvements:</b> a CDN edge 10 ms away would cut the last three round trips to ~30 ms; <code>dns-prefetch</code>/<code>preconnect</code> hints start DNS/TCP/TLS early; connection reuse and HTTP/2 avoid repeating handshakes; TLS session resumption / 0-RTT helps returning users.</p>`,
      complexity: `<p>Cold: 4 DNS round trips (resolver side) + 3 connection/request round trips. Warm: ~0–5 ms DNS + reused connection = 1 RTT per request.</p>`,
      followUps: ['What changes if the hostname is a CNAME to a CDN?', 'Why is the first visit to a new domain much slower than later ones?', 'How does HTTP/3 change the handshake count?']
    }
  });

  practice.push({
    title: 'Set Cache-Control Headers for a Web App', level: 'Easy', tags: ['cdn', 'http caching'], companies: ['Shopify', 'Vercel', 'Meesho'],
    statement: `<p>Choose <code>Cache-Control</code> headers (and file-naming strategy) for: (1) <code>/assets/app.[hash].js</code>, (2) <code>/index.html</code>, (3) <code>/api/products/42</code> (same for all users, prices change a few times a day), (4) <code>/api/me</code> (logged-in user profile), (5) <code>/img/products/42.jpg</code> (replaced rarely, same URL).</p>`,
    constraints: `<p>A pull CDN sits in front. Deploys happen 10×/day and must show new UI within 1 minute. Personal data must never be served to another user.</p>`,
    example: `<p>(1) ${H.c('g', 'public, max-age=31536000, immutable')} — the hash changes whenever content changes, so the old URL can be cached forever.</p>`,
    brute: { why: `<p>"Disable caching everywhere to be safe" puts every request on the origin (CDN pointless, slow pages). "Cache everything for a day" serves stale UI after deploys and — worst case — caches <code>/api/me</code> and shows one user\'s account to others.</p>` },
    mcq: { q: 'Which directive lets the CDN cache a response for 60 s while browsers always revalidate?', options: ['max-age=60', 's-maxage=60 with max-age=0', 'no-store', 'private, max-age=60'], answer: 1, explain: 's-maxage applies to shared caches (CDNs) and overrides max-age there; max-age=0 makes browsers revalidate.' },
    hints: [`<p>Hint 1: split responses into "same for everyone" (shared caches OK) and "per user" (private / no-store).</p>`, `<p>Hint 2: content that changes but keeps its URL needs short TTLs or revalidation; content whose URL changes when it changes can be cached forever.</p>`, `<p>Hint 3: use s-maxage for the CDN, max-age for browsers, and stale-while-revalidate to hide refresh latency.</p>`],
    solution: {
      approach: `<p>${H.table(['Path', 'Header', 'Why'], [['/assets/app.[hash].js', 'public, max-age=31536000, immutable', 'URL changes on every content change'], ['/index.html', 'public, max-age=0, s-maxage=30, stale-while-revalidate=30 (+ ETag)', 'New deploy visible within ~1 min; CDN still absorbs load'], ['/api/products/42', 'public, s-maxage=60, stale-while-revalidate=120, stale-if-error=600', 'Shared data, small staleness OK, survives origin blips'], ['/api/me', 'private, no-store', 'Personal data must never be in a shared cache'], ['/img/products/42.jpg', 'public, max-age=86400, s-maxage=604800 + ETag; purge by URL/tag when replaced (or move to versioned URLs)', 'Rare changes; purge or version on replace']])}</p><p>Also: strip <code>Set-Cookie</code> from cacheable responses, normalise the cache key (ignore tracking params), and add <code>Vary: Accept-Encoding</code> only (avoid <code>Vary: User-Agent</code>).</p>`,
      complexity: `<p>Expected hit ratios: hashed assets ~99%+, images 95%+, product API depends on traffic per product (s-maxage 60 → at most one origin call per product per minute per tier).</p>`,
      followUps: ['How do you invalidate product 42 immediately when its price changes?', 'Why is immutable useful even with a long max-age?', 'What breaks if /api/me accidentally gets public caching?']
    }
  });

  practice.push({
    title: 'Forward or Reverse Proxy? Classify the Scenarios', level: 'Easy', tags: ['proxy', 'forward proxy', 'reverse proxy'], companies: ['Cisco', 'Zscaler', 'Infosys'],
    statement: `<p>Classify each as a <b>forward</b> or <b>reverse</b> proxy (or both) and say whose side it is on: (1) nginx terminating TLS for <code>shop.com</code>; (2) a school network blocking social media; (3) a CDN edge; (4) an egress gateway giving 300 containers one static outbound IP; (5) an Envoy sidecar in a service mesh; (6) an API gateway in front of microservices; (7) an LLM gateway your company uses to call several external model providers.</p>`,
    constraints: `<p>One line of justification each. Mention who configures the proxy.</p>`,
    example: `<p>(2) → ${H.c('b', 'forward')}: configured by the school for its clients; hides/controls clients\' outbound access.</p>`,
    brute: { why: `<p>Classifying by product name ("nginx is a reverse proxy") fails: nginx, Envoy and Squid can all play either role. The role depends on <b>whose side</b> the proxy is on and who configured it — client side (forward) or server side (reverse).</p>` },
    mcq: { q: 'A proxy is configured by the website owner, and clients do not know it exists. It is a…', options: ['Forward proxy', 'Reverse proxy', 'Transparent forward proxy', 'VPN'], answer: 1, explain: 'Reverse proxies sit in front of servers and are set up by the service owner; clients just resolve the site name to the proxy.' },
    hints: [`<p>Hint 1: ask "who set this up, and whose traffic does it control?" — clients\' outbound traffic or a service\'s inbound traffic.</p>`, `<p>Hint 2: anything that hides servers, terminates TLS for a domain or balances load is reverse; anything that controls or hides clients going out is forward.</p>`, `<p>Hint 3: sidecars handle both directions for their pod, so they can be both.</p>`],
    solution: {
      approach: `<p>(1) <b>Reverse</b> — set up by shop.com\'s owner, hides app servers, terminates TLS. (2) <b>Forward</b> — set up by the school for clients, filters outbound. (3) <b>Reverse</b> — a caching reverse proxy for the site, distributed worldwide. (4) <b>Forward (egress)</b> — on the client side of outbound calls; partners see one IP. (5) <b>Both</b> — outbound calls from the app go through it (forward), inbound calls to the app arrive through it (reverse). (6) <b>Reverse</b> — single entry point for clients, routes to services, adds auth/rate limits. (7) <b>Forward (egress) from your company\'s view</b> — central keys, quotas, logging and failover for outbound calls to providers; from the providers\' side, their own front doors are reverse proxies.</p>`,
      complexity: `<p>Each proxy adds a hop (typically &lt; 1 ms in-region) and must be redundant to avoid becoming a single point of failure.</p>`,
      followUps: ['Why do egress proxies help against SSRF?', 'What does a forward proxy see of an HTTPS request without TLS inspection?', 'How do reverse proxies protect apps from slow clients?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Debug: "Users in Asia Are Slow"', level: 'Medium', tags: ['debugging', 'latency', 'cdn', 'gslb', 'dns'], companies: ['Netflix', 'Airbnb', 'Grab', 'Flipkart'],
    statement: `<p>Your SaaS app is hosted only in <code>us-east</code>. Dashboards show p50 page load 0.9 s in the US but <b>4.8 s in India, Singapore and Japan</b>. Asia is now 35% of signups. Walk through how you would diagnose the cause and what you would change, in order of impact vs effort.</p>`,
    constraints: `<p>Single-page app (2 MB of JS/CSS/images), REST API with ~12 sequential calls on page load, PostgreSQL in us-east. Budget allows a CDN and, later, one more region.</p>`,
    example: `<p>Mumbai → Virginia RTT ≈ ${H.c('r', '200 ms')}. Page load needs DNS + TCP + TLS + 12 sequential API calls ≈ ${H.c('r', '15+ round trips ≈ 3 s')} of pure network waiting, plus 2 MB of assets fetched across the ocean.</p>`,
    brute: { why: `<p>"Add bigger servers in us-east" — server CPU is not the problem; the time is spent in round trips across ~13,000 km of fibre. "Immediately build a full second region with a multi-master database" is expensive and slow, and still leaves the chatty API design and uncached assets.</p>` },
    mcq: { q: 'First thing to check?', options: ['CPU usage of us-east servers', 'A breakdown of where the time goes for Asian users (DNS, connect, TLS, TTFB, download) from real-user monitoring or synthetic probes', 'Database indexes', 'Rewrite the app in another language'], answer: 1, explain: 'Measure before fixing. A waterfall from Asian vantage points shows whether time goes to round trips, payload size or server time.' },
    hints: [`<p>Hint 1: get a waterfall from Asia (RUM, WebPageTest-style probes): how much is DNS/TCP/TLS, how much is time-to-first-byte, how much is download?</p>`, `<p>Hint 2: count round trips. Latency × number of sequential round trips usually explains everything. Which of those can be terminated or cached near the user?</p>`, `<p>Hint 3: order the fixes — CDN for static assets, edge TLS termination, fewer sequential API calls, edge caching of shared API data, then a regional deployment (read-local) if still needed.</p>`],
    solution: {
      approach: `<p><b>1. Measure.</b> RUM split by country + synthetic tests from Mumbai/Singapore/Tokyo. Expect: DNS ok, TCP/TLS ~400 ms (2 RTTs), each API call ~200 ms+, assets slow. Also check DNS answers: are Asian users resolving to the right endpoints? (Corporate VPN resolvers can mis-geolocate.)</p>
<p><b>2. Quick wins (days):</b> put a <b>CDN</b> in front of everything: hashed static assets cached at Asian edges (2 MB now comes from ~10 ms away); TLS terminates at the edge, saving ~2 long RTTs per new connection; the edge keeps warm connections to us-east for API calls (dynamic acceleration). Enable HTTP/2 or HTTP/3, compression, preconnect hints.</p>
<p><b>3. Reduce round trips (weeks):</b> batch the 12 sequential API calls into 1–2 (BFF endpoint or GraphQL), parallelise the rest; cache shared API responses at the edge with short <code>s-maxage</code>.</p>
<p><b>4. Regional presence (months):</b> deploy stateless app servers + read replicas in <code>ap-south</code>/<code>ap-southeast</code>; route with latency-based DNS or a global anycast front door; reads local, writes forwarded to us-east (or home-region per tenant). Watch replica lag and read-your-writes (route a user\'s reads to primary briefly after they write).</p>
<p><b>5. Verify</b> with the same RUM metrics; set an SLO per region (e.g. p75 LCP &lt; 2.5 s).</p>`,
      complexity: `<p>CDN + edge TLS typically cuts Asia load times by 40–60%; collapsing 12 calls into 2 saves ~2 s at 200 ms RTT; a regional deployment brings API RTT from ~200 ms to ~10–40 ms but adds data-consistency work and ~1.5–2× infra cost.</p>`,
      followUps: ['How do you give read-your-writes consistency with a regional read replica?', 'How would you choose between GeoDNS and anycast for routing?', 'What if Asian traffic is mostly from mobile networks with high packet loss?']
    }
  });

  practice.push({
    title: 'Survive a DNS Provider Outage', level: 'Medium', tags: ['dns', 'reliability', 'multi-provider'], companies: ['Twitter', 'GitHub', 'Atlassian'],
    statement: `<p>In 2016 a DDoS on a single DNS provider made many major sites unreachable even though their servers were fine. Your company uses one managed DNS provider for <code>shop.com</code>. Design a setup that keeps the site reachable if that provider goes down for hours.</p>`,
    constraints: `<p>Records change ~20 times a day (deploys, failovers) via Terraform. Some records use provider-specific features (latency routing, health-checked failover).</p>`,
    example: `<p>Provider A down → resolvers can\'t refresh records → as cached TTLs expire, ${H.c('r', 'users get SERVFAIL')}. With NS records listing provider A <i>and</i> provider B: ${H.c('g', 'resolvers retry the other nameservers')}.</p>`,
    brute: { why: `<p>"Raise all TTLs to a week so caches carry us through." Helps a little for already-cached names, but new visitors and expired caches still fail, and a week-long TTL kills your ability to fail over or migrate quickly. "Self-host BIND on two VMs" trades a DDoS-hardened anycast network for two easily overwhelmed boxes.</p>` },
    mcq: { q: 'What makes multi-provider DNS work for resolvers?', options: ['Listing nameservers from both providers in the domain\'s NS records at the registrar, both serving identical zones', 'Using two A records', 'A CNAME from provider A to provider B', 'DNSSEC'], answer: 0, explain: 'Resolvers pick among all listed nameservers and retry others on failure, so both providers must be authoritative with the same data.' },
    hints: [`<p>Hint 1: resolvers already know how to retry another nameserver when one fails — give them nameservers from two independent providers.</p>`, `<p>Hint 2: both providers must serve the same zone. How do you keep them in sync when you change records 20 times a day?</p>`, `<p>Hint 3: provider-specific routing features don\'t exist on both sides — decide which records need them and what the fallback answer is.</p>`],
    solution: {
      approach: `<p><b>Two authoritative providers.</b> Register NS records from provider A and provider B at the registrar (e.g. 2 + 2 nameservers). Both host the full zone.</p>
<p><b>Sync.</b> One source of truth in Git; Terraform (or OctoDNS/DNSControl) pushes to both providers in the same pipeline; a checker compares answers from both every minute and alerts on drift.</p>
<p><b>Advanced records.</b> Latency/failover records are provider-specific. Options: keep plain A/ALIAS-equivalent records on both (simpler, slightly worse routing), or put routing logic behind an anycast global LB with a stable IP so DNS records are static and identical everywhere.</p>
<p><b>TTLs.</b> Moderate TTLs (300 s for most, longer for NS) so caches ride out short blips while keeping agility; resolvers with serve-stale help further.</p>
<p><b>Also:</b> registrar lock and MFA (hijacking is another DNS failure mode), keep internal tooling/runbooks reachable without depending on the same DNS, and test by removing provider A\'s NS from a test domain.</p>`,
      complexity: `<p>Cost: second provider (cheap, per-query billing) plus sync tooling. Availability: two independent anycast networks; an outage of one causes only extra retries (tens to hundreds of ms) for some lookups.</p>`,
      followUps: ['How does DNSSEC complicate multi-provider setups?', 'What happens to health-checked failover records during the outage?', 'How would you detect drift between providers?']
    }
  });

  practice.push({
    title: 'Zero-Downtime Deploys Behind a Load Balancer', level: 'Medium', tags: ['health checks', 'draining', 'deploys'], companies: ['Stripe', 'Uber', 'Razorpay'],
    statement: `<p>Every rolling deploy of your API (30 pods behind an L7 load balancer) causes a burst of ~500 HTTP 502/503 errors and some timeouts on long requests. Explain exactly where the errors come from and design the deploy lifecycle so that a deploy causes zero failed requests.</p>`,
    constraints: `<p>Kubernetes, ~3k rps, some requests (report exports) take up to 20 s, WebSocket notifications exist on 5% of connections. New pods need ~15 s to warm the JIT and caches.</p>`,
    example: `<p>Timeline today: ${H.c('r', 'SIGTERM → process exits in 1 s → LB still routes to it for ~10 s → 502s')}; new pod ${H.c('r', 'receives full traffic while cold → timeouts')}.</p>`,
    brute: { why: `<p>"Deploy at 3 am" hides the errors for fewer users but they still happen, and urgent fixes can\'t wait for 3 am. "Retry everything at the client" double-submits non-idempotent requests and does nothing for in-flight long requests that are cut off.</p>` },
    mcq: { q: 'Why do 502s appear right after a pod gets SIGTERM?', options: ['The new image is broken', 'The pod stops before the load balancer has removed it from its endpoint list', 'DNS TTL', 'TLS certificate expiry'], answer: 1, explain: 'Endpoint removal propagates asynchronously. If the process exits immediately, the LB keeps sending requests to a closed port for a few seconds.' },
    hints: [`<p>Hint 1: two races — the LB still sending to a pod that is shutting down, and the LB sending full traffic to a pod that is not warm yet.</p>`, `<p>Hint 2: shutdown order should be "stop receiving new work → finish existing work → exit", with timeouts larger than the longest request.</p>`, `<p>Hint 3: start-up order should be "start → warm → pass readiness → receive a ramp of traffic (slow start)".</p>`],
    solution: {
      approach: `<p><b>Shutdown:</b> (1) on SIGTERM, a <code>preStop</code> hook sleeps ~10 s so endpoint removal reaches every LB/proxy; readiness starts failing immediately. (2) The server stops accepting new connections, finishes in-flight requests (graceful shutdown), sends <code>Connection: close</code> / HTTP/2 GOAWAY. (3) WebSockets get a "reconnect" message with random jitter. (4) <code>terminationGracePeriodSeconds</code> = 10 + 20 (longest request) + margin ≈ 45 s; LB deregistration delay ≈ 30 s.</p>
<p><b>Startup:</b> startup probe allows warm-up; readiness only passes after caches are loaded and a self-warm request loop has run; LB <b>slow start</b> ramps traffic over 30 s.</p>
<p><b>Rollout:</b> maxUnavailable 0, maxSurge 25% so capacity never drops; automatic rollback if the error rate or p99 rises during rollout.</p>
<p><b>Safety net:</b> LB retries idempotent requests once on another pod on connection errors (not on timeouts of non-idempotent requests).</p>`,
      complexity: `<p>Deploy takes longer (≈ pods/surge × (warm-up + drain) ≈ a few minutes) and briefly runs 25% extra pods; errors drop to ~0.</p>`,
      followUps: ['How do you drain WebSocket connections that last hours?', 'What is the difference between deregistration delay and terminationGracePeriodSeconds?', 'How would you test that a deploy really causes zero errors?']
    }
  });

  practice.push({
    title: 'Breaking News: Invalidate CDN Caches Fast', level: 'Medium', tags: ['cdn', 'invalidation', 'caching'], companies: ['The Guardian', 'BBC', 'Times Internet'],
    statement: `<p>A news site serves article pages through a CDN with a 10-minute TTL. An article published with a serious factual error must be corrected <b>everywhere within 30 seconds</b>, including the homepage, section pages, AMP versions and the JSON API used by apps. At the same time, the homepage must survive 50× traffic spikes during breaking news. Design the caching and invalidation strategy.</p>`,
    constraints: `<p>~200 PoPs, 5k pages change per day, 500k rps at spike peak, origin can handle 5k rps.</p>`,
    example: `<p>Purging only <code>/2026/10/article-123</code> ${H.c('r', 'leaves the homepage, section page and /api/articles/123 showing the wrong headline')}. Tag-based purge of <code>article-123</code> ${H.c('g', 'drops every object that embedded it')}.</p>`,
    brute: { why: `<p>"Set TTL to 0 so pages are always fresh": the origin would see all 500k rps and collapse during breaking news. "Purge everything" on each correction empties all 200 PoPs at once → a thundering herd on the origin exactly when traffic is highest.</p>` },
    mcq: { q: 'Which feature lets you invalidate every page that shows article 123 without knowing their URLs?', options: ['Shorter TTL', 'Surrogate keys / cache tags', 'Versioned file names', 'Origin shield'], answer: 1, explain: 'The origin tags each response with the content ids it contains (e.g. Surrogate-Key: article-123 home section-politics), and one purge-by-tag call drops them all.' },
    hints: [`<p>Hint 1: one article appears in many cached objects (article page, homepage, lists, API). You need to purge by <i>content</i>, not by URL.</p>`, `<p>Hint 2: decouple freshness from load: allow serving slightly stale content while refreshing, and make sure misses collapse into single origin requests.</p>`, `<p>Hint 3: combine tag-based purge + soft purge (mark stale, not delete) + stale-while-revalidate + origin shield + request collapsing.</p>`],
    solution: {
      approach: `<p><b>Tag everything.</b> The origin adds <code>Surrogate-Key</code> / <code>Cache-Tag</code> headers listing every content id in the response (<code>article-123 homepage section-politics author-77</code>). The CMS publish/edit hook calls the CDN\'s purge-by-tag API (propagates globally in ~seconds on modern CDNs).</p>
<p><b>Soft purge.</b> Mark tagged objects stale instead of deleting them; with <code>stale-while-revalidate</code> the first request after the purge triggers one background refresh while users get the old copy for at most a second or two — no herd.</p>
<p><b>Protect the origin.</b> Origin shield so 200 PoPs refresh through one tier; request collapsing at edge and shield; render pages from a cache of article JSON so regeneration is cheap.</p>
<p><b>TTLs.</b> Keep long TTLs (minutes to hours) because purges handle correctness; short browser max-age (e.g. 30 s) so readers\' browsers also pick up corrections.</p>
<p><b>Apps and AMP.</b> The JSON API and AMP caches get the same tags; for third-party AMP caches, use their update-cache API.</p>
<p><b>Verify.</b> After a correction, a job fetches the URLs from several PoPs and checks the new headline, alerting if any is stale after 30 s.</p>`,
      complexity: `<p>Origin load after a purge ≈ (number of tagged objects) × (shield tiers) refreshes, not × PoPs × users. Purge API: one call per edit.</p>`,
      followUps: ['What if the CDN purge API itself is slow or rate-limited?', 'How do you handle personalised parts of the homepage?', 'How do edge-side includes (ESI) change the design?']
    }
  });

  practice.push({
    title: 'Egress Proxy for a Partner That Allowlists IPs', level: 'Medium', tags: ['forward proxy', 'egress', 'nat'], companies: ['PayPal', 'Visa', 'Paytm'],
    statement: `<p>A banking partner only accepts API calls from at most <b>2 fixed IP addresses</b>, and your security team wants every outbound call from production logged and limited to approved domains. Your services run on 400 autoscaling containers across 3 availability zones. Design the outbound (egress) path.</p>`,
    constraints: `<p>~2k outbound rps to the bank, mTLS required by the bank, outbound must survive the loss of one AZ.</p>`,
    example: `<p>Without egress control: ${H.c('r', '400 changing container IPs → the bank rejects calls')}. With an egress tier: ${H.c('g', 'all calls leave through 2 elastic IPs, logged and allowlisted')}.</p>`,
    brute: { why: `<p>"Give every container a public IP and send the bank the list" — the list changes with every scale event and deploy, exceeds the 2-IP limit, and leaves outbound traffic uncontrolled (a compromised container can talk to anything, a classic data-exfiltration and SSRF risk).</p>` },
    mcq: { q: 'Which component gives many private instances one stable public source IP?', options: ['An L7 reverse proxy', 'A NAT gateway or egress (forward) proxy with elastic IPs', 'A CDN', 'GeoDNS'], answer: 1, explain: 'Outbound traffic is source-NATed or proxied through a few machines whose public IPs never change.' },
    hints: [`<p>Hint 1: the bank sees the source IP of the last hop before the internet — make that hop a small, fixed set of machines.</p>`, `<p>Hint 2: a NAT gateway gives stable IPs; a forward proxy additionally gives domain allowlists, auth and logs.</p>`, `<p>Hint 3: 2 IPs but 3 AZs — think about which AZs hold the egress nodes and what happens when one fails.</p>`],
    solution: {
      approach: `<p><b>Egress tier:</b> two forward proxies (e.g. Envoy/Squid) in two AZs, each with one elastic IP — the 2 IPs given to the bank. Containers reach them via an internal L4 load balancer; the proxies also accept traffic from the third AZ (cross-AZ hop).</p>
<p><b>Policy:</b> domain allowlist per service (only the payments service may reach <code>api.bank.example</code>), authentication by workload identity (mTLS/SPIFFE), full access logs to the SIEM, per-service rate limits. Block private/metadata ranges to stop SSRF.</p>
<p><b>mTLS to the bank:</b> either the payments service does mTLS end-to-end through a CONNECT tunnel (the proxy never sees the key), or the proxy originates mTLS with a centrally managed client certificate — easier rotation, but the proxy becomes highly sensitive.</p>
<p><b>Availability:</b> if one proxy\'s AZ fails, all traffic flows through the other IP; size each proxy for 100% of load. Health-check the proxies; alert on queueing.</p>
<p><b>Default deny:</b> network policy blocks direct internet egress from pods, so the proxy is the only way out. A managed NAT gateway is a simpler option if you only need fixed IPs and not domain-level policy.</p>`,
      complexity: `<p>Each proxy: ~2k rps of mostly long-lived TLS tunnels — modest CPU. Added latency ~1 ms in-region. Cost: 2 small instances + cross-AZ data transfer.</p>`,
      followUps: ['What if the bank later allows only ONE IP?', 'How do you rotate the client certificate without downtime?', 'How would you let a sandboxed AI agent call only approved APIs using the same design?']
    }
  });

  practice.push({
    title: 'WebSocket Chat Behind Load Balancers', level: 'Medium', tags: ['websockets', 'sticky sessions', 'l7'], companies: ['Slack', 'Discord', 'Microsoft Teams'],
    statement: `<p>Design the load-balancing layer for a chat app with <b>2 million concurrent WebSocket connections</b>. A message from user A must reach user B, who may be connected to a different server. Deploys happen daily and servers autoscale. Explain affinity, routing between servers, timeouts and how to deploy without dropping everyone at once.</p>`,
    constraints: `<p>Each chat server holds ~50k connections. Messages: 200k/s peak. Clients are mobile and web.</p>`,
    example: `<p>A on server 3 sends to B on server 17. ${H.c('r', 'Server 3 has no socket for B')}; it needs a ${H.c('g', 'presence map (B → server 17) or pub/sub channel per user/room')}.</p>`,
    brute: { why: `<p>"Use sticky sessions so A and B end up on the same server" — impossible in general (millions of users, arbitrary pairs and groups). "One giant server" cannot hold 2M connections reliably and is a single point of failure.</p>` },
    mcq: { q: 'Why does a WebSocket naturally stay on one backend?', options: ['Because of DNS caching', 'It is a single long-lived TCP connection; the LB picks the backend once at the upgrade', 'Because of cookies', 'Because UDP is used'], answer: 1, explain: 'After the HTTP Upgrade, the LB just relays bytes on that connection, so the backend choice holds for its lifetime.' },
    hints: [`<p>Hint 1: separate "which server holds B\'s socket" (connection routing) from "which server receives a new connection" (load balancing).</p>`, `<p>Hint 2: a pub/sub backbone or presence service lets any server deliver to any user.</p>`, `<p>Hint 3: idle timeouts, heartbeats, and staggered reconnects with jitter on deploy.</p>`],
    solution: {
      approach: `<p><b>Edge:</b> anycast/GeoDNS → L4 tier → L7 proxies that terminate TLS and route <code>/ws</code> to the chat fleet with least-connections (new connections go to the emptiest servers, which also helps newly added ones fill up).</p>
<p><b>Cross-server delivery:</b> each chat server subscribes to channels for the users/rooms it holds (Redis pub/sub cluster, NATS, or Kafka + a presence service storing <code>user → server</code>). Server 3 publishes to B\'s channel; server 17 pushes it down B\'s socket. Messages are also persisted, so offline or reconnecting clients fetch missed messages by sequence number.</p>
<p><b>Timeouts:</b> app-level ping every 25–30 s to stay under LB/NAT idle timeouts (often 60 s); raise LB idle timeout for <code>/ws</code>.</p>
<p><b>Deploys/scale-in:</b> mark a server draining (no new connections), send clients a "reconnect" frame spread over several minutes with random jitter, then stop. Clients reconnect with exponential backoff + jitter to avoid a reconnect storm.</p>
<p><b>Capacity:</b> 2M / 50k = 40 servers + 25% headroom ≈ 50; watch file descriptors, memory per connection and LB connection limits.</p>`,
      complexity: `<p>Fan-out cost: one publish per recipient server rather than per recipient. Memory ~10–50 KB per connection → 50k connections ≈ 0.5–2.5 GB per server.</p>`,
      followUps: ['How do you deliver to a 100k-member channel efficiently?', 'What happens if the pub/sub cluster fails?', 'How would you shard presence data?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Design the Edge Layer for a Video Streaming Site', level: 'Hard', tags: ['cdn', 'dns', 'load balancing', 'video', 'edge'], companies: ['Netflix', 'YouTube', 'Hotstar', 'Twitch'],
    statement: `<p>Design everything between a viewer pressing <b>Play</b> and bytes arriving from your origin for a video platform: DNS, CDN (push vs pull), load balancers, proxies, health checks and global routing. Cover video-on-demand (huge catalog) and <b>live events</b> (a cricket final with 25M concurrent viewers).</p>`,
    constraints: `<p>Peak egress ~60 Tbps during the live final (25M × ~2.5 Mbps average). Catalog 200k titles, each encoded in 6 bitrates with 4-second HLS/DASH segments. Viewers in 40 countries, majority in South Asia. Origin = object storage + packagers in two regions. Paid content: only entitled users may fetch segments.</p>`,
    example: `<p>Without a CDN: 60 Tbps from two regions → ${H.c('r', 'impossible (and ruinously expensive)')}. With a well-tuned edge: ${H.c('g', '&gt; 98% of segment requests served from edges/ISP-embedded caches; origin sees only cache-fill traffic')}.</p>`,
    brute: { why: `<p>"Put all video on S3 behind one regional load balancer." Every viewer crosses continents for every 4-second segment (rebuffering), the region\'s egress caps out at a tiny fraction of 60 Tbps, and one region failure stops all playback. Even "just add a pull CDN" alone fails the live final: millions of simultaneous misses on brand-new segments stampede the origin every 4 seconds.</p>` },
    mcq: { q: 'For the live final, what protects the origin from millions of simultaneous requests for each new segment?', options: ['Longer DNS TTL', 'Tiered caching (edge → mid-tier/shield) with request collapsing, so each new segment is fetched from origin about once per tier', 'Sticky sessions', 'L4 load balancing at the origin'], answer: 1, explain: 'Collapsing turns N concurrent misses into 1 upstream fetch per cache node, and tiering turns hundreds of PoPs into a handful of shield fetches.' },
    hints: [`<p>Hint 1: separate the control plane (login, entitlement, picking a CDN/edge, manifest URLs) from the data plane (segment bytes). Only the data plane needs terabits.</p>`, `<p>Hint 2: VOD is long-tail (pull, plus push/pre-position the popular head off-peak); live is "everyone wants the same new segment right now" (tiered cache + collapsing + short manifest TTLs).</p>`, `<p>Hint 3: steering — GeoDNS/anycast for edge selection, multi-CDN and ISP-embedded caches, signed URLs/tokens checked at the edge, and health checks at every tier.</p>`],
    solution: {
      approach: `<p><b>1. Control plane (L7, regional).</b> <code>api.video.com</code> via latency-based DNS / anycast front door → L7 LBs → playback service. It checks entitlement, picks the best CDN/edge for this viewer (by RUM measurements, ISP, cost, current load) and returns a manifest URL with a short-lived <b>signed token</b>.</p>
<p><b>2. Edge selection.</b> Segment hostnames (<code>cdn1.video.com</code>) CNAME to CDN providers whose DNS/anycast picks a nearby PoP; for the biggest ISPs, <b>embedded caches inside the ISP</b> (Open Connect-style) serve most bytes with zero transit cost. Multi-CDN for capacity and resilience; the playback service shifts share between CDNs in near real time.</p>
<p><b>3. VOD caching.</b> Segments are immutable → <code>max-age</code> of days, cache key = path only (token validated at edge, stripped from key). <b>Push</b> the predicted head (new releases, trending) to ISP caches overnight; <b>pull</b> the long tail through edge → regional shield → origin.</p>
<p><b>4. Live.</b> Encoders → packagers (two regions, active-active) → origin shield. Manifests TTL 1–2 s, segments long TTL. Request collapsing at every tier; pre-warm edges by having them fetch each new segment as soon as the manifest lists it. Low-latency HLS/CMAF chunks if near-real-time is required.</p>
<p><b>5. Load balancing &amp; health.</b> Inside each PoP: L4 (ECMP + Maglev-style) in front of cache servers, consistent hashing by URL so each segment lives on few servers (higher hit ratio); hot segments replicated to more servers. Health checks + passive checks remove bad cache nodes; the player fails over to another CDN host on errors (client-side failover).</p>
<p><b>6. Global routing &amp; failure.</b> Anycast/GeoDNS with health checks; per-region capacity limits with spillover to neighbours; origins in 2 regions. Load-shed gracefully: cap max bitrate for everyone before refusing anyone.</p>
<p><b>7. Observability.</b> Real-user metrics from players (startup time, rebuffer ratio, bitrate) per ISP/PoP/CDN feed the steering decisions.</p>`,
      code: { lang: 'text', check: false, code: `# Edge cache node (nginx sketch) for video segments
proxy_cache_path /data/cache levels=1:2 keys_zone=video:500m max_size=20t inactive=30d;

server {
    listen 443 ssl http2;
    server_name cdn1.video.com;

    location ~ \\.m3u8$ {                       # manifests change every few seconds (live)
        secure_link $arg_token,$arg_exp;         # token check at the edge
        if ($secure_link = "") { return 403; }
        proxy_pass https://shield.video.internal;
        proxy_cache video;
        proxy_cache_key $uri;
        proxy_cache_valid 200 1s;
        proxy_cache_lock on;                     # collapse concurrent misses
    }

    location ~ \\.(ts|m4s)$ {                    # segments never change
        secure_link $arg_token,$arg_exp;
        if ($secure_link = "") { return 403; }
        proxy_pass https://shield.video.internal;
        proxy_cache video;
        proxy_cache_key $uri;                    # token NOT part of the key
        proxy_cache_valid 200 30d;
        proxy_cache_lock on;
        proxy_cache_use_stale error timeout updating;
    }
}` },
      complexity: `<p>60 Tbps / ~100 Gbps per cache server ≈ 600+ busy servers at peak, spread over hundreds of PoPs + ISP caches. Origin egress ≈ (distinct segments × shield count), tiny vs viewer egress. Startup target &lt; 2 s, rebuffer ratio &lt; 0.5%.</p>`,
      followUps: ['How would you handle a CDN provider failing mid-match?', 'How do you stop token sharing / link leeching?', 'Where would you put ad insertion (server-side vs client-side) and how does it affect caching?']
    }
  });

  practice.push({
    title: 'Active-Active Multi-Region E-commerce Edge', level: 'Hard', tags: ['gslb', 'multi-region', 'anycast', 'failover'], companies: ['Amazon', 'Walmart', 'Flipkart'],
    statement: `<p>Design the global traffic layer for an e-commerce site running <b>active-active in 3 regions</b> (us-east, eu-west, ap-south). Requirements: users go to the nearest healthy region; EU personal data stays in the EU; a full region failure is absorbed within <b>60 seconds</b> with no checkout double-charges; planned maintenance can drain a region gradually.</p>`,
    constraints: `<p>150k rps peak, 5% writes. Each user has a home region where their account/orders live; catalog is replicated everywhere. Mobile apps cache DNS aggressively.</p>`,
    example: `<p>eu-west fails: ${H.c('g', 'EU users move to eu-central (not us-east)')} because of residency rules; ${H.c('g', 'Indian users stay in ap-south')}; capacity in eu-central must already allow for this.</p>`,
    brute: { why: `<p>"Latency-based DNS with health checks, TTL 300." Failover takes 5+ minutes (and longer for mobile apps that ignore TTL), EU users might be routed to the US (residency violation), and nothing prevents a retried checkout from being processed twice in two regions.</p>` },
    mcq: { q: 'Why add an anycast front door instead of relying only on DNS for regional failover?', options: ['Anycast is cheaper', 'Failover happens at the edge per request in seconds, independent of DNS caching in resolvers and apps', 'DNS cannot do health checks', 'Anycast encrypts traffic'], answer: 1, explain: 'The anycast IP never changes; the edge proxies choose a healthy backend region per request, so cached DNS answers don\'t matter.' },
    hints: [`<p>Hint 1: split the problem into (a) getting the user to a nearby edge, (b) choosing a backend region per request, (c) making the data correct after a switch.</p>`, `<p>Hint 2: routing policy is constrained by data: a user\'s writes must reach their home region (or its designated failover region inside the same legal zone).</p>`, `<p>Hint 3: idempotency keys on checkout, capacity headroom per region, and gradual weight shifts for maintenance.</p>`],
    solution: {
      approach: `<p><b>Edge:</b> one anycast IP (global L7 front door / CDN) terminates TLS near the user. Static and catalog pages cached at the edge.</p>
<p><b>Region selection (per request):</b> the edge reads the user\'s <b>home region</b> from a signed cookie/token claim (set at login) and routes account/order/checkout calls there; anonymous browsing goes to the nearest healthy region. Health: each region exposes a regional health endpoint checked from many edge locations every few seconds; unhealthy → the edge routes to that region\'s designated <b>failover partner within the same legal zone</b> (eu-west → eu-central; us-east → us-west; ap-south → ap-southeast).</p>
<p><b>Data:</b> each region\'s user data replicated (synchronously or near-synchronously) to its partner region; on failover the partner promotes. Catalog is read-only replicated everywhere.</p>
<p><b>No double charges:</b> client generates an idempotency key per checkout; the payment service stores it with the order (replicated with the order data); retries after failover find the existing result.</p>
<p><b>Capacity:</b> each partner pair provisioned so one side can absorb the other (or autoscale with warm pools + load shedding of non-critical features like recommendations).</p>
<p><b>Maintenance:</b> weighted routing at the edge — shift a region 100 → 75 → 25 → 0% over 30 minutes while watching errors and latency.</p>
<p><b>Fallback:</b> DNS still has health-checked records (TTL 60) in case the front door itself has an incident.</p>`,
      complexity: `<p>Failover time ≈ detection (3 × 5 s) + edge config propagation (seconds) + DB promotion (≤ 30 s) ≈ under 60 s. Cost: N+1 capacity per partner pair, cross-region replication bandwidth.</p>`,
      followUps: ['How do you handle a user travelling from India to Europe?', 'What if the front-door provider has a global outage?', 'How do you test failover without hurting real customers?']
    }
  });

  practice.push({
    title: 'Design a GeoDNS / GSLB Service', level: 'Hard', tags: ['dns', 'gslb', 'distributed systems'], companies: ['AWS', 'Cloudflare', 'Akamai', 'NS1'],
    statement: `<p>Design a managed authoritative DNS service with traffic steering (like Route 53 or NS1): customers create zones and records, including <b>latency-based, geolocation, weighted and health-checked failover</b> records. It must answer queries for millions of domains worldwide in a few milliseconds and keep answering even when the control plane is down.</p>`,
    constraints: `<p>5M hosted zones, 2M queries/s globally (10× during DDoS), record changes visible worldwide within 60 s, health checks every 10–30 s for 1M endpoints, 100% availability target for query answering.</p>`,
    example: `<p>Query <code>api.shop.com</code> from a Mumbai resolver (ECS 49.36.0.0/24) → latency record set has ap-south (healthy) and us-east → answer ${H.c('g', 'ap-south LB IP, TTL 60')}.</p>`,
    brute: { why: `<p>"A few BIND servers reading from a central SQL database on every query." Each query would cross the world to the DB (slow), the DB becomes the single point of failure and DDoS target, and any control-plane outage stops all DNS answers for every customer.</p>` },
    mcq: { q: 'Key principle for the query-answering data plane?', options: ['Every query reads the central database', 'Each edge nameserver holds a full local copy of zone data and health state, so it can answer with no remote calls', 'Answers are computed by the control plane', 'Use TCP only'], answer: 1, explain: 'Separating data plane from control plane (static stability) means edge servers keep answering from local state even when everything upstream is down.' },
    hints: [`<p>Hint 1: split control plane (API, validation, storage of zones, health checkers) from data plane (anycast nameservers answering queries).</p>`, `<p>Hint 2: push compiled zone data to every PoP; answers must need only local memory. How do changes propagate within 60 s?</p>`, `<p>Hint 3: latency routing needs a latency map (resolver/ECS subnet → region RTT); health checks need distributed checkers with quorum to avoid false failovers.</p>`],
    solution: {
      approach: `<p><b>Data plane:</b> hundreds of PoPs, each announcing the customer nameserver IPs via <b>anycast</b> (customers get 4 NS names on different anycast prefixes/TLDs for diversity). Each nameserver keeps all zones in memory (compiled into fast lookup structures, sharded by zone hash across server groups if needed). Answering logic: look up record set → apply policy (geo via IP/ECS → location DB; latency via precomputed subnet→region RTT table; weighted via deterministic hashing; failover via local health table) → answer. No network calls on the query path.</p>
<p><b>Control plane:</b> API + validation → durable versioned store (replicated DB / log). A distribution system publishes change deltas (log/streaming) to all PoPs; each PoP applies them and reports its version; the API can report "change propagated" when all PoPs ack. Target &lt; 60 s.</p>
<p><b>Health checks:</b> checkers in ~15 regions probe endpoints; an endpoint is unhealthy only if a quorum of regions agree. Results flow to PoPs via the same distribution pipe. Fail-open if all endpoints in a set appear unhealthy (return all).</p>
<p><b>Static stability:</b> if the control plane or health pipeline dies, PoPs keep serving the last known state.</p>
<p><b>DDoS:</b> anycast spreads load; per-PoP rate limiting, response-rate limiting, random subdomain attack detection, overprovisioned capacity; shuffle-sharding customers across nameserver sets so one attacked zone doesn\'t hurt others.</p>
<p><b>Latency map:</b> built from RUM / probes, updated hourly, versioned and shipped like zone data.</p>`,
      complexity: `<p>Memory: 5M zones × ~2 KB ≈ 10 GB per full replica (or sharded). Query cost: a few hash lookups (microseconds). Propagation: seconds to a minute. Health checks: 1M endpoints × 15 regions / 30 s ≈ 500k probes/s across the checker fleet.</p>`,
      followUps: ['How do you prevent a bad config push from breaking every PoP at once?', 'How do you support DNSSEC signing with dynamic answers?', 'How would shuffle sharding limit the blast radius of an attack?']
    }
  });

  practice.push({
    title: 'Load Balancing for an LLM Inference Platform', level: 'Hard', tags: ['l7', 'ai', 'load balancing', 'sticky sessions'], companies: ['OpenAI', 'Anthropic', 'Google', 'Together AI'],
    statement: `<p>Design the request routing layer for an LLM API serving several models on GPU replicas in 4 regions. Requests vary from 50-token prompts to 200k-token documents; responses stream for up to several minutes. Multi-turn chats resend the whole conversation each turn, and replicas keep a <b>prefix KV cache</b>. Goals: low time-to-first-token, high GPU utilisation, fair sharing between customers, graceful behaviour when a region runs out of GPUs.</p>`,
    constraints: `<p>50k concurrent streams, 20k requests/s at peak, each replica handles a limited number of concurrent sequences, model weights take ~5 min to load on a new replica.</p>`,
    example: `<p>Round robin sends turn 7 of a 100k-token chat to a replica without its prefix → ${H.c('r', 'recomputes 100k tokens, TTFT 8 s')}. Prefix-aware routing to the replica that served turn 6 → ${H.c('g', 'reuses cached prefix, TTFT 0.6 s')}.</p>`,
    brute: { why: `<p>"Kubernetes Service + round robin." Ignores request cost (one 200k-token prompt equals hundreds of small ones), throws away prefix-cache locality, can\'t see queue depth or KV memory, and its default idle timeouts cut off long streams. Hard sticky sessions per user instead create hot replicas and lose everything when a replica restarts.</p>` },
    mcq: { q: 'Best signal for choosing a replica?', options: ['Round robin order', 'Number of TCP connections', 'A score combining queue depth / KV-cache usage with prefix-cache affinity for this conversation', 'Client IP hash'], answer: 2, explain: 'Load-aware routing avoids overloaded GPUs; prefix affinity avoids recomputation. Combining them is the core of modern inference routers.' },
    hints: [`<p>Hint 1: the unit of load is tokens (prefill + decode) and KV-cache memory, not requests or connections.</p>`, `<p>Hint 2: "soft" stickiness — prefer the replica that probably holds the conversation prefix, but fall back when it is busy.</p>`, `<p>Hint 3: layers — global (region with free capacity), regional L7 gateway (per-tenant quotas, model routing), replica picker (load + prefix), plus streaming-friendly timeouts and draining.</p>`],
    solution: {
      approach: `<p><b>Global layer:</b> anycast/latency DNS to the nearest regional gateway; the gateway may forward to another region when local GPU capacity for that model is exhausted (cross-region spill, cost of +50–150 ms is small vs generation time). Data-residency flags restrict which regions a tenant may use.</p>
<p><b>Regional L7 gateway:</b> authenticates, applies per-tenant token-based rate limits and priority classes, routes by model name to that model\'s pool, and keeps HTTP/2 or SSE streams open with long idle timeouts (minutes) and no response buffering.</p>
<p><b>Replica picker (the smart part):</b> each replica reports queue length, running sequences and KV-cache utilisation every ~100 ms. For a request, compute a hash of its prefix blocks (system prompt + earlier turns); prefer replicas likely holding the longest matching prefix (consistent hashing on conversation/prefix id) unless their load score exceeds a threshold — then pick the least-loaded (power of two choices). This is "consistent hashing with bounded load".</p>
<p><b>Admission &amp; overload:</b> queue with deadlines; shed lowest-priority traffic first; return 429/529 with Retry-After rather than letting queues explode.</p>
<p><b>Health:</b> startup probe covers the 5-minute weight load; readiness = model loaded and GPU healthy; passive ejection on error bursts; draining waits for active streams (or migrates them) before shutdown.</p>
<p><b>Scaling:</b> autoscale on queue depth/token throughput, keep warm spare replicas because cold start is minutes.</p>`,
      complexity: `<p>Routing decision: O(1) per request with cached load reports. Prefix affinity can cut prefill compute substantially for chat workloads; cross-region spill trades ~100 ms latency for capacity.</p>`,
      followUps: ['How do you guarantee fairness between a huge tenant and many small ones?', 'What happens to a 3-minute stream when its replica dies mid-way?', 'How would you route between a small fast model and a large model automatically?']
    }
  });

  practice.push({
    title: 'Flash Crowd: Concert Ticket Sale at the Edge', level: 'Hard', tags: ['cdn', 'rate limiting', 'waiting room', 'load balancing'], companies: ['Ticketmaster', 'BookMyShow', 'Cloudflare'],
    statement: `<p>A stadium concert goes on sale at 10:00:00. <b>3 million fans</b> (plus bots) hit the site within 60 seconds, but there are only 60,000 seats and the booking backend can safely handle 2,000 checkouts/s. Design the edge layer (DNS, CDN, proxies, load balancers) so the site stays up, the sale is fair, and bots don\'t take the tickets.</p>`,
    constraints: `<p>Normal traffic 5k rps; peak attempt rate 500k+ rps. Backend: inventory service + payment provider (rate-limited). Users must see their place in line.</p>`,
    example: `<p>Without edge control: ${H.c('r', '500k rps hits origin → LBs and DB melt → everyone gets errors, bots retry fastest')}. With a virtual waiting room at the edge: ${H.c('g', 'origin sees a steady 2k checkouts/s; users see a queue position')}.</p>`,
    brute: { why: `<p>"Autoscale the backend to 500k rps for one minute." Autoscaling cannot react within seconds, the inventory database has one hot row per seat block, and the payment provider has its own limits. Retries from failed users multiply the load (retry storm), and bots with fast retry loops win the race.</p>` },
    mcq: { q: 'Where should excess demand be absorbed?', options: ['At the database with bigger instances', 'At the edge (CDN / L7 proxies) with a waiting room that admits users at the rate the backend can handle', 'At the client by asking users to wait', 'At DNS by lowering TTL'], answer: 1, explain: 'The edge has massive capacity and is the cheapest place to hold, queue and filter traffic before it reaches scarce backend resources.' },
    hints: [`<p>Hint 1: the backend\'s safe rate (2,000 checkouts/s) is fixed — design everything to admit at most that rate.</p>`, `<p>Hint 2: serve everything static (event page, queue page) from the CDN with long TTLs; only admitted users get a signed token that lets them reach origin.</p>`, `<p>Hint 3: bot defense and fairness — randomised queue positions for those who arrive before the start, challenge/proof-of-work, per-account limits, token validated at the edge.</p>`],
    solution: {
      approach: `<p><b>Pre-event:</b> pre-warm CDN with the event page and queue page; raise LB/proxy limits and pre-scale backends; lower nothing in DNS (keep stable anycast IP); rehearse with load tests.</p>
<p><b>Waiting room at the edge:</b> every request to <code>/event/123/*</code> without a valid admission token gets a cached queue page. Users arriving before 10:00 get a <b>random</b> position at 10:00 (fair, no benefit from refreshing early); later arrivals join the end. Edge workers + a small, highly available counter service issue position cookies and release N users per second.</p>
<p><b>Admission control:</b> release rate is driven by backend health (checkout latency, error rate) — a feedback loop targeting ~2,000 checkouts/s. Admitted users get a short-lived signed token; the edge validates it locally and forwards only those requests to origin.</p>
<p><b>Bots:</b> bot score/challenges at the edge, per-account and per-payment-method limits, token bound to session + device, reject requests without the token at the LB.</p>
<p><b>Backend protection:</b> L7 rate limits per user and global; seat holds with TTL (e.g. 8 minutes) so abandoned carts return seats; idempotency keys for payment.</p>
<p><b>Graceful failure:</b> if origin struggles, the waiting room simply slows the release rate — users wait longer instead of seeing errors; static pages and queue keep working from cache.</p>`,
      complexity: `<p>Edge absorbs ~500k rps of cacheable queue traffic (cheap); origin sees ~2k admitted users/s. 3M users / 2k per s ≈ 25 min to cycle everyone — seats sell out after the first ~60k admissions, so the queue page should announce sell-out quickly.</p>`,
      followUps: ['How do you keep the queue counter itself from becoming a bottleneck?', 'How would you handle users switching devices mid-queue?', 'What metrics drive the release rate?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'A recursive resolver has a cached NS record for shop.com but its A record for api.shop.com has expired. What does it do?', options: ['Starts again at a root server', 'Asks the .com TLD server', 'Asks the shop.com authoritative server directly', 'Returns the expired answer'], answer: 2, explain: 'The cached NS referral (long TTL) lets it skip root and TLD and go straight to the authoritative server. (Some resolvers may serve stale answers only when the authoritative servers are unreachable.)' },
    { q: 'You lower a record\'s TTL from 3600 to 60 and immediately change its IP. Worst case, how long can a well-behaved resolver keep the OLD IP?', options: ['60 s', '3600 s', '0 s', '86400 s'], answer: 1, explain: 'The old answer was cached with TTL 3600. Lowering the TTL does not shorten copies already cached — lower it at least one old-TTL in advance.' },
    { q: 'Why can\'t you put a CNAME on the bare domain shop.com?', options: ['CNAMEs are slow', 'The apex must hold SOA and NS records, and a CNAME cannot coexist with other records for the same name', 'Browsers reject it', 'It breaks HTTPS'], answer: 1, explain: 'DNS rules forbid other records alongside a CNAME. Providers offer ALIAS/ANAME/CNAME flattening to get the same effect at the apex.' },
    { q: 'A pull CDN\'s first request for a brand-new file in a PoP is…', options: ['Always a hit', 'A miss that fetches from the origin (or shield) and then caches the file', 'Rejected', 'Served from the browser cache'], answer: 1, explain: 'Pull CDNs fill on demand; the first request per PoP (or per tier) is a miss.' },
    { q: 'Hit ratio rises from 95% to 99%. Origin request load…', options: ['Drops by about 4%', 'Drops by about 5× (from 5% to 1% of requests)', 'Stays the same', 'Doubles'], answer: 1, explain: 'Origin load is proportional to the miss ratio: 5% → 1% is a 5× reduction.' },
    { q: 'Which is a forward proxy?', options: ['nginx terminating TLS for your website', 'A corporate proxy that filters employees\' web browsing', 'A CDN edge', 'An API gateway'], answer: 1, explain: 'Forward proxies act for clients (outbound). The others act for servers (inbound) — reverse proxies.' },
    { q: 'An L4 load balancer can route requests based on…', options: ['URL path', 'HTTP headers', 'IP addresses and ports', 'Cookies'], answer: 2, explain: 'L4 sees only the transport layer (5-tuple). Paths, headers and cookies require parsing HTTP (L7).' },
    { q: 'gRPC traffic behind an L4 balancer is uneven across pods mainly because…', options: ['gRPC uses UDP', 'HTTP/2 multiplexes many requests on one long-lived connection, and L4 balances connections', 'gRPC cannot be load balanced', 'Health checks fail'], answer: 1, explain: 'Balance is decided once per connection; all RPCs on it go to the same pod.' },
    { q: 'Health check interval 10 s, unhealthy threshold 3, timeout 2 s. Roughly how long can a crashed server still receive traffic?', options: ['2 s', '10 s', 'About 30 s', '5 minutes'], answer: 2, explain: 'Detection ≈ interval × threshold (+ timeout) ≈ 30–32 s. Passive checks and retries reduce the impact.' },
    { q: 'Why is a "deep" health check that queries the shared database dangerous?', options: ['It is slow', 'If the database blips, every instance fails together and the LB removes all of them — a total outage', 'It leaks passwords', 'It increases cache misses'], answer: 1, explain: 'Health checks should judge the instance. Shared-dependency failures should degrade features, not empty the pool.' },
    { q: 'Source-IP sticky sessions cause hot spots mostly because…', options: ['IPv6 addresses are long', 'Many users share one IP behind carrier NAT or corporate proxies', 'Cookies are disabled', 'TLS hides the IP'], answer: 1, explain: 'Thousands of users behind one public IP hash to the same backend.' },
    { q: 'Which GSLB technique fails over fastest regardless of client DNS caching?', options: ['GeoDNS with TTL 300', 'Anycast / global anycast front door', 'Round-robin DNS', 'Raising the TTL'], answer: 1, explain: 'With anycast the IP never changes; routing (BGP or the edge proxy) changes in seconds, so cached DNS answers stay valid.' },
    { q: 'Three equal regions run active-active. If one fails, each survivor\'s load becomes about…', options: ['100% of its normal load', '150% of its normal load', '300%', '33%'], answer: 1, explain: 'Each carried 1/3; the survivors now carry 1/2 each = 1.5× their normal share. Provision headroom accordingly.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What happens, at the DNS level, when you type <code>www.example.com</code> into a browser?', a: `<p>The browser checks its own cache, then the OS stub resolver checks its cache (and the hosts file). On a miss the OS sends a <b>recursive</b> query to the configured resolver (ISP, 8.8.8.8, 1.1.1.1, company resolver). If the resolver has nothing cached it asks a <b>root</b> server (referral to .com), then a <b>.com TLD</b> server (referral to example.com\'s nameservers), then the <b>authoritative</b> server, which returns the A/AAAA record (possibly via a CNAME chain, e.g. to a CDN). Every answer and referral is cached for its TTL at the resolver, and the final answer also in the OS and browser. Then the browser opens TCP + TLS to that IP. Cold lookups cost tens to a couple hundred ms; warm ones ~0–5 ms.</p>`, followUps: ['What is the difference between recursive and iterative queries?', 'Why are there only 13 root server names?', 'What do DoH and DoT change?'] },
    { level: 'B', q: 'What is TTL in DNS and how do you choose it?', a: `<p>TTL (time to live) is how many seconds a resolver or client may cache an answer before asking again. Long TTLs (hours/days) mean fewer queries, faster lookups and resilience if your DNS provider blips, but changes propagate slowly. Short TTLs (30–60 s) allow fast failover and migrations but cost more queries and slightly more latency. Typical: NS/MX long, normal web records ~300 s, health-checked failover or GSLB records 30–60 s. Before a planned change, lower the TTL at least one old-TTL in advance. Remember some clients (JVMs, devices, connection pools) cache longer than the TTL.</p>`, followUps: ['What is negative caching?', 'How do resolvers treat very small TTLs?', 'Why doesn\'t a short TTL help clients with open keep-alive connections?'] },
    { level: 'B', q: 'What is a CDN and when would you NOT use one?', a: `<p>A CDN is a global network of caching reverse proxies (edge PoPs) near users. It serves cacheable content from nearby (lower latency), absorbs load and DDoS, terminates TLS close to users, and reduces origin egress cost. You get little benefit for purely internal traffic, for highly personalised responses that cannot be cached (though edge TLS termination and connection reuse still help), for very low-traffic sites where cost/complexity outweigh gains, or for data that must never leave a jurisdiction unless the CDN can be restricted to certain regions. Also be careful with anything user-specific: a misconfigured cache can serve one user\'s data to another.</p>`, followUps: ['Push vs pull CDN?', 'What is an origin shield?', 'How do you deploy new assets without purging?'] },
    { level: 'I', q: 'Push CDN vs pull CDN — trade-offs and when to use each?', a: `<p><b>Pull</b>: the edge fetches from origin on the first miss and caches according to headers. Zero upload management, stores only what users request, ideal for websites, APIs and long-tail catalogs. Cost: the first request per PoP is slow, and a simultaneous wave of misses can stampede the origin (mitigate with shields and request collapsing). <b>Push</b>: you upload/pre-position content before demand. First requests are fast and origin is protected during launches, but you pay storage everywhere and must manage expiry. Use push for large, predictable, time-critical content (new episodes, game patches, OS updates, model weights); pull for everything else. Real systems use both: push the head, pull the tail.</p>`, followUps: ['How does Netflix Open Connect fit here?', 'What is request collapsing?', 'How do you pre-warm a pull CDN?'] },
    { level: 'I', q: 'Explain forward proxy vs reverse proxy with examples.', a: `<p>A <b>forward proxy</b> acts on behalf of <b>clients</b>: it is configured on the client side, makes outbound requests for them and hides their IPs. Uses: corporate filtering and logging, egress control with fixed outbound IPs, caching, SSRF protection, sandboxing agents to approved domains. For HTTPS it typically tunnels with CONNECT. A <b>reverse proxy</b> acts on behalf of <b>servers</b>: clients think it is the server. Uses: TLS termination, load balancing, caching, compression, routing by path/host, WAF, rate limiting, hiding internal topology, buffering slow clients. nginx, HAProxy, Envoy can play either role; load balancers, CDNs and API gateways are reverse proxies; a service-mesh sidecar is both.</p>`, followUps: ['How does the backend learn the real client IP?', 'What is PROXY protocol?', 'What is request smuggling?'] },
    { level: 'I', q: 'L4 vs L7 load balancing — what is the difference and how do you choose?', a: `<p>L4 balancers work on TCP/UDP: they see IPs and ports and forward whole connections without reading the payload. They are fast, cheap, protocol-agnostic and can keep TLS end-to-end, but cannot route by URL/header or balance individual requests. L7 balancers terminate TLS and parse HTTP, so they can route by host/path/header/cookie, do canaries, retries, auth, compression, and balance each request (important for HTTP/2 and gRPC). They cost more CPU and add a little latency. Choose L4 for non-HTTP protocols, extreme connection counts, pass-through TLS, and as the first tier in front of L7 fleets; choose L7 whenever you need request-level understanding. Many architectures use both: L4 tier → L7 proxies → services.</p>`, followUps: ['What is DSR?', 'How is the L4 tier itself scaled (ECMP, Maglev)?', 'Why does gRPC need L7 or client-side balancing?'] },
    { level: 'I', q: 'How do health checks work and how do you tune them?', a: `<p>The LB periodically probes each backend (TCP connect or an HTTP endpoint like <code>/healthz</code>) with an <b>interval</b> and <b>timeout</b>. After <b>fall</b> consecutive failures it marks the backend down and stops sending traffic; after <b>rise</b> consecutive successes it brings it back (hysteresis prevents flapping). Detection time ≈ interval × fall. Combine with <b>passive</b> checks (outlier detection on real 5xx/timeouts) to catch gray failures, and with retries on another backend. Keep liveness shallow, make readiness reflect instance-local ability to serve, never fail all instances because of a shared dependency, cap ejection percentage, use fail-open/panic mode, and use slow start for returning servers. Pair with draining on deploys.</p>`, followUps: ['Liveness vs readiness in Kubernetes?', 'What is a gray failure?', 'How do you avoid health-check storms with thousands of LB nodes?'] },
    { level: 'I', q: 'What are sticky sessions? Are they a good idea?', a: `<p>Sticky sessions (session affinity) make the LB send a client to the same backend each time — via an LB cookie, the app\'s session cookie, a source-IP hash or a hash of a header/user id. They let legacy apps keep session state in memory and improve cache locality. Downsides: uneven load (heavy users and NATed IPs), lost sessions when a server crashes or redeploys, slow scale-in, and harder deploys. Prefer stateless servers with sessions in a shared store (Redis) or signed tokens, and use affinity only as a soft performance hint (e.g. consistent hashing with bounded load for caches or LLM prefix caches) where any server can still serve any request correctly.</p>`, followUps: ['How would you migrate a sticky app to stateless without logging everyone out?', 'What is consistent hashing with bounded loads?', 'Why are WebSockets sticky by nature?'] },
    { level: 'A', q: 'How does global server load balancing work, and DNS vs anycast?', a: `<p>GSLB decides which region a user reaches. <b>DNS-based</b>: the authoritative DNS returns different IPs based on resolver/ECS location, measured latency, weights and health. It works for any protocol and is simple, but it sees resolvers not users, and failover is bounded by TTLs and clients that cache longer. <b>Anycast</b>: the same IP is announced from many sites; BGP delivers packets to a nearby site, failover is a route withdrawal (seconds), and DDoS is naturally spread — but "nearest" is BGP-nearest, not latency-nearest, and it requires owning IP space and a network presence. <b>Global L7 front doors</b> combine anycast edges with per-request backend-region selection by health and capacity. Most large systems use anycast or DNS for edge selection and L7 for region choice.</p>`, followUps: ['What is EDNS Client Subnet?', 'How do you keep EU traffic in the EU during failover?', 'Why is the data layer the hard part of multi-region?'] },
    { level: 'A', q: 'How would you preserve the real client IP through a CDN, an L4 balancer and an L7 proxy?', a: `<p>At the CDN: it adds a header with the client IP (e.g. <code>X-Forwarded-For</code> or a CDN-specific one) and you restrict origin access to the CDN\'s IP ranges or mTLS so nobody can bypass it and forge headers. At the L4 balancer: either preserve the source IP (DSR / transparent mode) or enable <b>PROXY protocol</b> so the original addresses are prepended to the TCP stream; the next hop must be configured to expect it. At the L7 proxy: read the PROXY header, then set/append <code>X-Forwarded-For</code> and <code>X-Forwarded-Proto</code>. In the app: trust forwarding headers only from known proxy IPs, and pick the right-most untrusted address. Strip client-supplied forwarding headers at the outermost trusted hop.</p>`, followUps: ['Why is the leftmost XFF value unsafe?', 'What breaks if PROXY protocol is enabled on only one side?', 'How does this affect per-IP rate limiting?'] },
    { level: 'A', q: 'A region\'s health checks are green but users routed there see errors. What could be happening and what do you change?', a: `<p>This is a <b>gray failure</b>: the probe tests something different from what users exercise. Examples: <code>/healthz</code> hits the LB or a static page while the database behind the app is broken; checks come from inside the region while the region\'s internet egress or a cross-region dependency is failing; only some AZs or some backends are bad and the check averages them away; TLS certificates or DNS for a dependency expired. Fixes: health endpoints that exercise a cheap version of the real path (app → DB read); probes from outside the region and from multiple vantage points; passive signals (real error rate, latency from RUM) feeding GSLB decisions; per-AZ health; and synthetic transactions (login, add to cart) as canaries. Keep humans able to manually drain a region quickly.</p>`, followUps: ['How do you avoid a false region failover?', 'What is a synthetic canary?', 'How can error-rate-based steering itself cause oscillation?'] },
    { level: 'E', q: 'Design the edge layer for a global video platform: what are the key decisions?', a: `<p>Separate the control plane (auth, entitlement, CDN/edge selection, manifests with signed URLs — L7, regional, anycast/latency DNS) from the data plane (segment delivery at terabits). For data: multi-CDN plus ISP-embedded caches; edge selection via DNS/anycast and player-side steering using real-user metrics; immutable segments with long TTLs and cache keys without tokens; manifests with tiny TTLs for live. VOD: push/pre-position popular titles off-peak, pull the long tail through edge → shield → origin. Live: tiered caches, request collapsing, pre-fetching new segments, two active packaging regions. Inside PoPs: L4 (ECMP/Maglev) to cache servers with consistent hashing by URL, replication for hot objects. Health checks and passive ejection everywhere; player failover between CDN hosts; graceful degradation by lowering max bitrate before rejecting viewers.</p>`, followUps: ['How do you estimate the number of edge servers for 25M viewers?', 'How do you prevent link sharing?', 'How does low-latency live streaming change caching?'] },
    { level: 'E', q: 'How do load balancers themselves avoid being a single point of failure?', a: `<p>At small scale, run LBs in an active-passive pair sharing a floating virtual IP (VRRP/keepalived) or use a managed cloud LB that is already multi-AZ. At large scale, routers spread packets across many L4 LB machines with <b>ECMP</b>; each LB uses <b>consistent hashing</b> (e.g. Maglev) plus connection tracking so any LB box picks the same backend for a given connection, letting boxes fail or be added with minimal disruption. L7 proxy fleets sit behind that L4 tier and scale horizontally. Above everything, anycast or DNS with health checks spreads traffic across sites and regions. Also protect the control plane: config pushes are staged and validated so a bad config cannot take down every LB at once.</p>`, followUps: ['What happens to existing connections when an L4 LB box dies?', 'Why stage LB config rollouts?', 'How does DSR change LB capacity needs?'] },
    { level: 'E', q: 'How do AI workloads change load balancing and edge design?', a: `<p>LLM inference requests vary enormously in cost (tokens, not requests, are the unit of load), stream for seconds to minutes, and benefit from <b>prefix KV-cache locality</b>. So routing moves up to L7 and becomes model-aware: route by model, by queue depth and KV-cache usage, with soft prefix affinity (consistent hashing with bounded load), long streaming timeouts and no proxy buffering. Global routing follows GPU availability more than distance (cross-region spill is acceptable because generation dominates latency), constrained by data-residency rules. Health checks need startup probes for multi-minute model loads and drains that wait for active streams. At the edge, AI crawlers increase uncacheable long-tail traffic, so bot management and origin protection matter more. Egress "AI gateways" centralise keys, quotas, logging and provider failover — forward proxies in modern clothes.</p>`, followUps: ['How do you enforce per-tenant fairness in token terms?', 'What does an AI gateway add over a normal API gateway?', 'How would you cache LLM responses safely?'] }
  );

  registerModule({
    id: 'hld04',
    title: 'DNS, CDN, Proxies & Load Balancing',
    intro: `<p>Before a single line of your application code runs, a user\'s request has already passed through a whole <b>edge layer</b>: DNS turned a name into an address, a CDN may have answered from a server a few kilometres away, proxies terminated TLS and checked the request, and load balancers chose a region and then a server — skipping any that health checks marked as sick.</p>
<p>This module walks that path from the browser outwards, the way an interviewer expects you to: <b>DNS resolution and caching</b>, <b>CDN push vs pull</b>, <b>forward vs reverse proxies</b>, <b>L4 vs L7 load balancers</b>, <b>health checks</b>, <b>sticky sessions</b> and <b>global load balancing</b>. Every topic starts with an everyday analogy, then an animated visualizer (watch a resolver walk root → TLD → authoritative, a CDN fill on a miss, an L7 balancer route by path, a health checker pull a server out of rotation), then deep dives on production pitfalls and what changes in the AI era. You finish by designing the edge for a video platform, debugging "users in Asia are slow" and choosing L4 vs L7 like a senior engineer.</p>`,
    goals: [
      'Trace a DNS lookup through browser, OS, resolver, root, TLD and authoritative servers, and pick TTLs for migrations and failover',
      'Decide push vs pull CDN per content type, set Cache-Control headers, and fix a low cache hit ratio',
      'Explain forward vs reverse proxies and preserve the real client IP safely through every hop',
      'Choose L4 or L7 load balancing for any workload (HTTP, gRPC, databases, UDP, WebSockets) and justify it',
      'Design health checks, draining and failover that remove broken servers fast without causing cascading outages',
      'Route users globally with GeoDNS, anycast and global front doors, and design the edge layer of a large video or e-commerce system'
    ],
    prereqs: `<p>HLD 1 (Client-Server &amp; Request Flow), HLD 2 (Scalability Basics — load balancer algorithms, stateless services) and HLD 3 (Estimation &amp; the Interview Framework). Basic idea of TCP, TLS and HTTP headers helps; consistent hashing is covered in depth in HLD 7.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
