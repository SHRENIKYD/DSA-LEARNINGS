(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (pure, deterministic) ---------- */
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function gpart(nodes, edges, ehl, hl, tags, label, height) {
    return { type: 'graph', label: label || 'Architecture', directed: true, height: height || 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  /* steps = [[narr, ehl, hl, tags], ...]  -> frames of a request flowing through a box diagram */
  function flowFrames(nodes, edges, steps, height, label, extra) {
    var frames = [];
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      var parts = [gpart(nodes, edges, s[1], s[2], s[3], label, height)];
      if (s[4]) parts = parts.concat(s[4]);
      frames.push({ narr: s[0], parts: parts });
    }
    return frames;
  }
  var B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  function b62(n) { var d = [], q = n; do { d.push(B62.charAt(q % 62)); q = Math.floor(q / 62); } while (q > 0); return d.reverse().join(''); }

  /* =====================================================================
     TOPIC 1 — URL SHORTENER
     ===================================================================== */
  topics.push({
    title: 'Design a URL Shortener (bit.ly / TinyURL)',
    analogy: `<p>Think of the <b>coat-check desk</b> at a theatre. You hand over a big, bulky winter coat and get back a tiny numbered ticket. Later you show the ticket, the attendant finds the coat in a split second, and you walk off with it. A URL shortener is that desk: the <b>long URL</b> is the bulky coat, the <b>short code</b> (like <code>short.ly/Ab3</code>) is the ticket, and the redirect is the attendant fetching your coat. The ticket must be <b>unique</b> (no two coats share one), <b>tiny</b>, and the desk must be <b>fast</b> because a long queue of people is waiting.</p>`,
    explain: `<p>This is the "hello world" of system design interviews. It looks tiny, but it hides almost every classic idea: ID generation, caching, read-heavy scaling, sharding, and analytics. We will follow the standard six-step frame: <b>requirements → estimates → API → data model → architecture → deep dives</b>.</p>
<h4>1. Requirements (ask these out loud)</h4>
${H.table(['Type', 'Requirement', 'Why it matters'], [
  ['Functional', 'Given a long URL, return a short URL', 'The core write path'],
  ['Functional', 'Opening the short URL redirects to the long URL', 'The core read path — 99% of traffic'],
  ['Functional (optional)', 'Custom alias (<code>short.ly/my-sale</code>), expiry date, click analytics', 'Variants interviewers love to add'],
  ['Non-functional', 'Redirect latency &lt; 50 ms at p99, availability 99.99%', 'A slow redirect makes every link on the internet feel slow'],
  ['Non-functional', 'Short codes must not be guessable one-by-one (nice to have)', 'Private links should not be enumerable'],
  ['Out of scope', 'Link previews, user accounts UI, billing', 'Say it out loud so the interviewer agrees']])}
<h4>2. Back-of-envelope estimates</h4>
${H.table(['Quantity', 'Math', 'Result'], [
  ['New URLs', '100M per month ÷ (30 × 86,400 s)', '≈ <b>40 writes / sec</b>'],
  ['Redirects', 'read : write = 100 : 1 → 10B per month', '≈ <b>4,000 reads / sec</b> (peak 3× ≈ 12K)'],
  ['Storage (5 years)', '100M × 12 × 5 = 6B rows × ~500 bytes', '≈ <b>3 TB</b> — fits a few DB nodes'],
  ['Code length', '62<sup>7</sup> = 3.5 trillion &gt; 6 billion', '<b>7 characters</b> is plenty'],
  ['Hot cache', '4K/s × 86,400 = 345M reads/day; cache the top 20% × 500 B', '≈ <b>35 GB</b> — one or two Redis boxes'],
  ['Bandwidth', '4,000/s × 500 B', '≈ 2 MB/s — trivial']])}
<p>Lesson from the numbers: writes are tiny (40/s), reads are modest (4K/s) and the data is only a few TB. This is <b>not</b> a hard "scale" problem — it is an <b>ID-generation + caching + availability</b> problem. Say that in the interview.</p>
<h4>3. API</h4>
<pre>POST /v1/urls          body: { "long_url": "https://...", "alias": "my-sale"?, "expires_at": "2026-12-31"? }
                       201 -> { "short_url": "https://short.ly/Ab3xK9q" }   409 if alias taken
GET  /{code}           302 Found, Location: https://...   404 if unknown, 410 Gone if expired
GET  /v1/urls/{code}/stats   -> { clicks, by_country, by_day }   (analytics variant)</pre>
<h4>4. Data model</h4>
${H.table(['Column', 'Type', 'Notes'], [['code (PK)', 'string(7..16)', 'the short code — the only lookup key'], ['long_url', 'string(2048)', ''], ['owner_id', 'bigint', 'optional'], ['created_at / expires_at', 'timestamp', 'expires_at is NULL for "never"'], ['click_count', 'bigint', 'better kept in the analytics store']])}
<p>The only query is <b>"get by code"</b> — no joins, no range scans. That points to a <b>key-value / wide-column store</b> (DynamoDB, Cassandra) or a sharded SQL table. Both work at 3 TB.</p>
<h4>5. High-level architecture</h4>
<p>Client → <b>Load balancer</b> → stateless <b>app servers</b> → <b>cache (Redis)</b> → <b>database</b>. Writes also call an <b>ID generator</b>. Every click also drops a message on a <b>queue</b> for analytics so the redirect itself stays fast. Press play on the first visualizer below and watch the three flows (shorten, redirect with cache hit, redirect with cache miss).</p>
<h4>6. How do we create the short code? (the heart of the problem)</h4>
${H.table(['Approach', 'How', 'Good', 'Bad'], [
  ['A. Hash & truncate', 'MD5(long_url) → take first 7 base62 chars', 'Same URL → same code (free dedupe); no counter', 'Collisions (birthday paradox) → need check-and-retry loop'],
  ['B. Counter + base62', 'Global counter 125 → base62 → "21"', 'No collisions ever; shortest codes', 'Predictable (enumerable); counter is a single point of failure'],
  ['C. Counter ranges', 'Each app server leases a block of 1,000 IDs from a coordinator, hands them out locally', 'No per-request coordination; survives coordinator blips', 'IDs lost if a server crashes (fine — 3.5T space)'],
  ['D. Key Generation Service (KGS)', 'Pre-generate random unused codes into a table; servers take batches', 'Unpredictable codes, no collisions', 'One more service to run; must mark keys used'],
  ['E. Snowflake-style 64-bit ID', 'timestamp + machine id + sequence → base62', 'Fully distributed, no coordinator', 'Longer codes (≈ 11 chars)']])}
<p><b>Recommended answer:</b> counter ranges (C) + a reversible scramble if codes must not be guessable. Encode the number with <b>base62</b> (<code>0-9 A-Z a-z</code>). Use the second visualizer to see exactly how 125 becomes <code>"21"</code>.</p>`,
    clues: [
      '"Design a URL shortener" / "design bit.ly" — the opener of almost every system design loop',
      '"100M new URLs per month", "read-heavy, 100:1" → cache + read replicas, not write sharding',
      '"Short code must be unique and as short as possible" → counter + base62, 62<sup>7</sup> ≈ 3.5 trillion',
      '"Custom alias" → unique index + conditional insert (reserve-or-409), never check-then-insert',
      '"Links should expire" → <code>expires_at</code> column, lazy check on read + background sweeper (TTL in DynamoDB/Cassandra)',
      '"Track clicks / analytics" → do NOT write to the main DB on redirect; publish an event to a queue',
      '"301 or 302?" → 301 is cached by browsers (less load, no analytics), 302 keeps you in the loop'
    ],
    code: [
      `import java.util.*;

public class Base62 {
    // 62 symbols: digits, upper-case, lower-case. Index in this string == digit value.
    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    /** Turn a non-negative ID (e.g. 125) into a short string (e.g. "21"). */
    public static String encode(long id) {
        if (id == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (id > 0) {
            sb.append(ALPHABET.charAt((int) (id % 62))); // remainder = next digit (rightmost first)
            id /= 62;                                      // drop that digit
        }
        return sb.reverse().toString();                    // we built it backwards
    }

    /** Reverse: "21" -> 125. Horner's rule: result = result * 62 + digit. */
    public static long decode(String code) {
        long result = 0;
        for (char c : code.toCharArray()) {
            int digit = ALPHABET.indexOf(c);
            if (digit < 0) throw new IllegalArgumentException("bad char: " + c);
            result = result * 62 + digit;
        }
        return result;
    }

    public static void main(String[] args) {
        long[] ids = {0, 61, 62, 125, 3844, 1_000_000_007L};
        for (long id : ids) {
            String code = encode(id);
            System.out.println(id + " -> " + code + " -> " + decode(code));
        }
        // How long is a code for 6 billion URLs?
        System.out.println("6e9 needs " + encode(6_000_000_000L).length() + " chars");
    }
}`,
      { lang: 'python', title: 'Base62 + counter-range allocator (runnable)', run: true, code: `ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def encode(n: int) -> str:
    """125 -> '21'. Repeated divmod by 62, collect remainders, reverse."""
    if n == 0:
        return ALPHABET[0]
    out = []
    while n > 0:
        n, r = divmod(n, 62)
        out.append(ALPHABET[r])
    return "".join(reversed(out))

def decode(code: str) -> int:
    n = 0
    for ch in code:
        n = n * 62 + ALPHABET.index(ch)
    return n

class RangeAllocator:
    """Pretend coordinator (ZooKeeper/etcd/DB sequence): hands out blocks of IDs."""
    def __init__(self, block=1000):
        self.next_start = 1
        self.block = block
    def lease(self):
        start = self.next_start
        self.next_start += self.block
        return start, start + self.block - 1

class AppServer:
    """Each app server keeps its own block, so it needs NO network call per new URL."""
    def __init__(self, name, allocator):
        self.name, self.alloc = name, allocator
        self.cur, self.end = allocator.lease()
    def shorten(self, long_url):
        if self.cur > self.end:                # block used up -> lease another
            self.cur, self.end = self.alloc.lease()
        code = encode(self.cur)
        self.cur += 1
        return code

alloc = RangeAllocator(block=1000)
a, b = AppServer("A", alloc), AppServer("B", alloc)
print("A:", a.shorten("https://example.com/1"), a.shorten("https://example.com/2"))
print("B:", b.shorten("https://example.com/3"), b.shorten("https://example.com/4"))
print("round trip 125:", encode(125), decode(encode(125)))
print("62**7 =", 62 ** 7, "codes of length 7")` }
    ],
    codeTitle: ['Base62 encoder / decoder (Java)', 'Base62 + counter-range allocator (Python)'],
    viz: [
      {
        title: 'URL shortener: request flow (shorten / redirect hit / redirect miss)',
        input: 'shorten',
        inputLabel: 'Scenario: shorten, hit or miss',
        gen: function (input) {
          var sc = String(input).trim().toLowerCase();
          if (sc !== 'shorten' && sc !== 'hit' && sc !== 'miss') throw new Error('Type one word: shorten, hit or miss');
          var nodes = [box('C', 'Client', 8, 30), box('LB', 'Load Balancer', 27, 30, 17), box('API', 'App Server', 49, 30, 15), box('IDG', 'ID Generator', 49, 6, 16), box('CA', 'Redis Cache', 77, 8, 15), box('DB', 'URL Database', 77, 34, 17), box('Q', 'Click Queue', 49, 54, 15)];
          var edges = [['C', 'LB'], ['LB', 'API'], ['API', 'IDG', 'next id'], ['API', 'CA'], ['API', 'DB'], ['API', 'Q', 'click event']];
          var steps;
          if (sc === 'shorten') {
            steps = [
              ['<b>The map.</b> Seven boxes. We will send a <b>POST /v1/urls</b> (create a short link) through them. Writes are rare (≈ 40/s) so this path may do a little extra work.', {}, {}, {}],
              ['The client sends <code>POST /v1/urls {"long_url": "https://shop.com/very/long/path?x=1"}</code> over HTTPS to the load balancer.', { 'C-LB': 'cur' }, { C: 'cur' }, {}],
              ['The load balancer picks any healthy app server. The servers are <b>stateless</b>, so any one will do — that is what lets us add more when traffic grows.', { 'LB-API': 'cur' }, { LB: 'cur' }, {}],
              ['The app server needs a unique number. It already holds a <b>leased block</b> of IDs (say 1–1000), so it just takes the next one locally. Here the ID is <b>125</b>.', { 'API-IDG': 'ok' }, { API: 'cur', IDG: 'ok' }, { IDG: 'id = 125' }],
              ['Convert <b>125 → base62 → "21"</b> (see the next visualizer). In real life the code would be 6-7 chars once IDs reach the billions.', {}, { API: 'sel' }, { API: 'code = 21' }],
              ['Insert <code>(21, long_url, created_at, expires_at)</code> into the database with a <b>conditional insert</b> ("only if the key does not exist"). If it already exists, we retry with a new ID.', { 'API-DB': 'ok' }, { API: 'cur', DB: 'ok' }, { DB: 'row saved' }],
              ['Optionally <b>warm the cache</b> so the first click is already a hit. New links are often clicked soon after creation.', { 'API-CA': 'ok' }, { CA: 'ok' }, { CA: 'set 21' }],
              ['The server answers <b>201 Created</b> with <code>https://short.ly/21</code>. The whole write path touched one DB write and (maybe) one cache write.', { 'C-LB': 'ok', 'LB-API': 'ok' }, { C: 'ok' }, { C: 'short.ly/21' }]
            ];
          } else if (sc === 'hit') {
            steps = [
              ['<b>The map.</b> Now a user clicks <code>short.ly/21</code>. This is the path that carries 99% of traffic, so every millisecond counts.', {}, {}, {}],
              ['The browser sends <code>GET /21</code> to the load balancer.', { 'C-LB': 'cur' }, { C: 'cur' }, {}],
              ['The load balancer forwards it to a stateless app server.', { 'LB-API': 'cur' }, { LB: 'cur' }, {}],
              ['The app server asks Redis: <code>GET url:21</code>. This takes about <b>0.5 ms</b>.', { 'API-CA': 'cur' }, { API: 'cur', CA: 'cur' }, {}],
              ['<span class="c-g">Cache HIT.</span> Redis returns the long URL. The database is never touched. With a 95% hit rate the database sees only 5% of the 4K reads/s — about 200/s.', { 'API-CA': 'ok' }, { CA: 'ok' }, { CA: 'HIT' }],
              ['In the background the server drops a tiny <b>click event</b> (code, time, country, user-agent) on a queue. It does <b>not wait</b> for it — analytics must never slow the redirect.', { 'API-Q': 'ok' }, { Q: 'ok' }, { Q: 'async' }],
              ['The server replies <code>302 Found, Location: https://shop.com/very/long/path?x=1</code>. The browser jumps to the real page. Total server time: a few milliseconds.', { 'C-LB': 'ok', 'LB-API': 'ok' }, { C: 'ok' }, { C: '302 redirect' }]
            ];
          } else {
            steps = [
              ['<b>The map.</b> A click on a link that is <b>not in the cache</b> (a cold or rarely used link). Slower, but still fine.', {}, {}, {}],
              ['The browser sends <code>GET /9xQ</code> to the load balancer, which forwards it to an app server.', { 'C-LB': 'cur', 'LB-API': 'cur' }, { C: 'cur', LB: 'cur' }, {}],
              ['The app server asks Redis for <code>url:9xQ</code>.', { 'API-CA': 'cur' }, { API: 'cur', CA: 'cur' }, {}],
              ['<span class="c-r">Cache MISS</span> — Redis has nothing. We must go to the source of truth.', { 'API-CA': 'bad' }, { CA: 'bad' }, { CA: 'MISS' }],
              ['The server reads the row from the database by primary key: <code>SELECT long_url, expires_at FROM urls WHERE code = "9xQ"</code>. About 5–10 ms. If there is no row → <b>404</b>; if expired → <b>410 Gone</b>.', { 'API-DB': 'ok' }, { DB: 'ok' }, { DB: 'found' }],
              ['Store the answer in Redis with a <b>TTL</b> (for example 1 hour, or until <code>expires_at</code>), so the next click is a hit. This is the <b>cache-aside</b> pattern.', { 'API-CA': 'ok' }, { CA: 'ok' }, { CA: 'set + TTL' }],
              ['Send the click event to the queue (async) and reply <b>302</b> with the long URL. For missing codes we also cache a short-lived "not found" marker so attackers cannot hammer the DB with random codes.', { 'API-Q': 'ok', 'C-LB': 'ok' }, { Q: 'ok', C: 'ok' }, { C: '302 redirect' }]
            ];
          }
          return flowFrames(nodes, edges, steps, 60, 'URL shortener architecture');
        }
      },
      {
        title: 'Base62: turning an ID into a short code',
        input: '125',
        inputLabel: 'Numeric ID (0 – 9,000,000,000,000,000)',
        gen: function (input) {
          var n = Number(String(input).trim());
          if (!isFinite(n) || n < 0 || n > 9000000000000000 || Math.floor(n) !== n) throw new Error('Enter a whole number between 0 and 9000000000000000');
          var frames = [], digits = [], cur = n;
          frames.push({ narr: 'We want to write the number <b>' + n + '</b> using 62 symbols: <code>0-9</code> (values 0-9), <code>A-Z</code> (10-35), <code>a-z</code> (36-61). It is just like writing a number in decimal, except every "digit" can go up to 61. Method: divide by 62, keep the <b>remainder</b>, repeat until nothing is left.', parts: [{ type: 'vars', label: 'Start', vals: { id: n, base: 62 } }, { type: 'array', label: 'Symbol table (value → symbol): 0-9, A-Z, a-z', values: B62.split('').slice(0, 24), showIdx: true }] });
          do {
            var q = Math.floor(cur / 62), r = cur - q * 62, ch = B62.charAt(r);
            digits.push(ch);
            var hl = {}; hl[digits.length - 1] = 'ok';
            frames.push({ narr: '<b>' + cur + ' ÷ 62 = ' + q + '</b> remainder <b>' + r + '</b> → symbol <b>"' + ch + '"</b>. The remainder is the <i>rightmost</i> digit still missing, so we collect digits right-to-left. ' + (q > 0 ? 'Continue with the quotient ' + q + '.' : 'Quotient is 0 — we are done dividing.'), parts: [{ type: 'vars', label: 'Division step', vals: { n: cur, quotient: q, remainder: r, symbol: ch }, hl: { remainder: 'cur', symbol: 'ok' } }, { type: 'array', label: 'Digits collected so far (rightmost first)', values: digits.slice(), hl: hl, showIdx: true }] });
            cur = q;
          } while (cur > 0);
          var code = digits.slice().reverse();
          var all = {}; for (var i = 0; i < code.length; i++) all[i] = 'sel';
          frames.push({ narr: 'We collected the digits backwards, so <b>reverse</b> them. Short code = <b>"' + code.join('') + '"</b> (' + code.length + ' character' + (code.length > 1 ? 's' : '') + ').', parts: [{ type: 'array', label: 'Short code', values: code, hl: all, showIdx: true }, { type: 'vars', vals: { id: n, code: code.join(''), length: code.length }, hl: { code: 'sel' } }] });
          frames.push({ narr: 'Decoding is the same idea backwards (Horner\'s rule): start at 0 and for every symbol do <code>result = result × 62 + value</code>. We get back <b>' + n + '</b>, so the mapping is reversible and collision-free. Capacity check: 62<sup>6</sup> = 56.8 billion, 62<sup>7</sup> = 3.5 trillion — so 7 characters cover 6 billion URLs about 580 times over.', parts: [{ type: 'table', label: 'Capacity by code length', columns: ['Length', 'Combinations'], rows: [['5', '916,132,832'], ['6', '56,800,235,584'], ['7', '3,521,614,606,208'], ['8', '218,340,105,584,896']], hl: { 2: 'sel' } }, { type: 'vars', vals: { decoded: n } , hl: { decoded: 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example: sizing the system in 60 seconds', html: `<p>Say it like a story. "We create 100 million links a month. A month has about 2.6 million seconds, so that is <b>~40 writes per second</b>. People click far more than they create — assume 100 clicks per link → <b>~4,000 reads per second</b>, peaking near 12,000. Each row is about 500 bytes, 6 billion rows in five years is <b>3 TB</b>."</p>
${H.table(['Step', 'Number', 'Conclusion'], [['Writes/sec', '100M ÷ 2.6M', '≈ 40 — one small DB primary is enough'], ['Reads/sec', '40 × 100', '≈ 4K avg, 12K peak — cache absorbs 90%+'], ['Rows (5 yr)', '6B', 'Need ≥ log<sub>62</sub>(6B) ≈ 5.6 → 6 chars minimum, 7 for comfort'], ['Storage', '6B × 500 B', '3 TB — shard by code hash for headroom, not necessity']])}
<p>Notice what we did <b>not</b> need: no message-broker cluster for the write path, no giant sharding. Good designs match the numbers.</p>`
      },
      {
        title: 'Collisions: why hash-and-truncate needs a retry loop', html: `<p>Take MD5 of the long URL, keep the first 42 bits (7 base62 characters). With <b>n = 6 billion</b> codes already used out of <b>N = 3.5 trillion</b>, the chance a brand-new URL lands on an existing code is about n ÷ N = <b>0.17%</b>. That sounds tiny, but at 40 writes/s it means a collision every ~2.5 minutes!</p>
<p>So the write path must be: <code>code = hash(url + salt)</code> → conditional insert → if it fails, bump the salt and try again. This still works, but counters need none of this. A good one-liner for the interview: "Hashing gives dedupe for free but costs a retry loop; a counter gives uniqueness for free but costs a coordinator. I would use leased counter ranges."</p>`
      },
      {
        title: 'Custom alias race condition (check-then-insert is a bug)', html: `<p>Two users both ask for alias <code>summer-sale</code> at the same moment.</p>
<p><span class="c-r"><b>Broken:</b></span> app does <code>SELECT ... WHERE code='summer-sale'</code> → both see "not found" → both <code>INSERT</code> → one silently overwrites the other (or crashes on a unique constraint).</p>
<p><span class="c-g"><b>Correct:</b></span> make the database decide in a single atomic step: <code>INSERT ... ON CONFLICT DO NOTHING</code> (SQL) or <code>PutItem with ConditionExpression attribute_not_exists(code)</code> (DynamoDB). Exactly one writer wins; the loser gets <b>409 Conflict</b> and the UI asks for another alias. Also reserve a namespace: generated codes use only base62 of fixed length, aliases must contain a hyphen or be longer than 8 characters, so the two can never collide.</p>`
      },
      {
        title: '301 vs 302: a small choice with big consequences', html: `${H.table(['', '301 Moved Permanently', '302 Found (temporary)'], [['Browser caches it?', 'Yes, forever — repeat clicks never reach you', 'No — every click comes to your servers'], ['Server load', 'Lowest', 'Higher (but you already built the cache)'], ['Click analytics', '<span class="c-r">Misses repeat clicks</span>', '<span class="c-g">Sees every click</span>'], ['Change/expire the target later', '<span class="c-r">Hard — browsers remember the old target</span>', '<span class="c-g">Easy</span>'], ['Typical choice', 'Static, never-changing links', 'Products with analytics, expiry or edits (most shorteners)']])}
<p>If the interviewer mentions analytics or expiry, answer <b>302</b> and explain why in one sentence.</p>`
      }
    ],
    deepDive: `<h4>Making codes unguessable</h4>
<p>A plain counter gives <code>1, 2, 3 …</code> → <code>"1","2","3"</code>: anyone can walk through all links. Fix: run the number through a <b>reversible scramble</b> (a small Feistel network or multiply by a large odd number modulo 62<sup>7</sup>) before base62-encoding. It is still a bijection (no collisions), but neighbours look random. Do not use "random 7 chars + check DB" at scale unless you accept the retry loop.</p>
<h4>ID generator availability</h4>
<p>The generator is a classic single point of failure. Leased ranges solve it: a server holds 1,000 IDs in memory, so the coordinator (etcd/ZooKeeper/a DB sequence row updated with <code>UPDATE ... RETURNING</code>) can be down for minutes and writes keep working. Crash = lose the unused part of a block, which costs nothing in a 3.5-trillion space. Multi-region: give each region its own range prefix (region id in the top bits) so regions never need to talk.</p>
<h4>Database and sharding</h4>
<p>Access pattern is pure point lookup → <b>shard by hash(code)</b> (consistent hashing so adding nodes moves little data). Don't shard by user (hot users) or by creation time (all writes hit the newest shard). Replicate each shard 3× for durability; reads can be served from replicas because a short link is <b>write-once</b>: stale reads are harmless (except for delete/expire, handled by a short cache TTL).</p>
<h4>Caching details</h4>
<ul><li>LRU eviction, TTL = min(1 h, time until <code>expires_at</code>).</li><li><b>Negative caching</b>: remember "404" for ~60 s to blunt scanners (cache penetration).</li><li><b>Hot key</b> (a viral link at 100K req/s): add a tiny in-process cache on every app server (1-5 s) so Redis isn't one hot shard; or serve the redirect from a CDN with a short TTL.</li></ul>
<h4>Analytics without hurting latency</h4>
<p>App server publishes <code>{code, ts, ip-country, ua, referrer}</code> to Kafka (fire-and-forget, batched). A stream job aggregates per code per minute into a column store (ClickHouse/Druid) and writes totals back; the dashboard reads aggregates, never raw events. If Kafka is down, drop or buffer locally — analytics may be lossy, redirects may not.</p>
<h4>Expiry and cleanup</h4>
<p>Expiry is enforced on <b>read</b> (compare <code>expires_at</code> to now → 410) so correctness never depends on a cleaner. Space is reclaimed by a background sweeper scanning old partitions, or by a native TTL feature (DynamoDB TTL, Cassandra TTL). Never <code>DELETE ... WHERE expires_at &lt; now()</code> in one giant transaction on the hot table.</p>
<h4>Abuse and safety</h4>
<p>Shorteners are favourite tools for phishing. Check submitted URLs against a malware list (Google Safe Browsing), rate-limit creation per IP/user (topic 3!), block redirect loops to yourself, and let owners disable a code instantly (cache invalidation on disable).</p>
<h4>Trade-offs summary</h4>
${H.table(['Decision', 'Choice', 'Cost you accept'], [['Code generation', 'Leased counter ranges + scramble', 'Gaps in IDs, tiny coordinator dependency'], ['Storage', 'Sharded KV / wide-column', 'No ad-hoc queries (use analytics store)'], ['Redirect', '302 + Redis', 'More traffic than 301, worth it for analytics'], ['Analytics', 'Async queue', 'Counts are eventually consistent (seconds-minutes)']])}`,
    aiEra: `<p><b>What AI changes:</b> the architecture is the same, but around it you now see <b>link-intelligence features</b>: an ML/LLM classifier scores each submitted URL for phishing before you accept it, an LLM can suggest readable custom aliases ("summer-sale-2026") from the page title, and AI crawlers/agents click your short links in huge numbers — so your analytics must separate <b>human vs bot traffic</b> (user-agent, ASN, behaviour) or the click counts become fiction.</p>
<p><b>Use AI as a partner:</b> ask <code>Here is my URL shortener design. List 5 failure modes and what the user sees in each</code>, or have it generate load-test scripts and realistic skewed traffic (Zipf: a few links get most clicks). Ask it to review your capacity math — then check the arithmetic yourself.</p>
<p><b>Where AI goes wrong:</b> it often proposes "hash the URL with MD5 and take 7 chars" without the collision retry loop, or "just use a UUID" (22+ chars, defeats the purpose), and it likes to add Kafka + microservices for 40 writes/s. It also forgets that check-then-insert is a race.</p>
<p><b>What you must still own:</b> the estimates, the choice of 302 vs 301, the uniqueness argument, and the ability to explain what happens when the ID service is down.</p>`,
    problems: [{
      title: 'Add custom aliases and expiry to the shortener', level: 'Medium', tags: ['url shortener', 'unique index', 'ttl'], companies: ['Amazon', 'Google'],
      statement: `<p>Your basic shortener works. Product now wants: (1) users can choose an <b>alias</b> such as <code>short.ly/summer-sale</code>; (2) a link may carry an <b>expiry time</b> after which clicks show "link expired"; (3) once expired, storage must eventually be reclaimed. Describe the schema, API changes, the write and read paths, how you avoid races, and what happens to caches.</p>`,
      constraints: `Aliases: 4-32 chars, letters/digits/hyphen. 100M links/month, 4K redirects/s. Expired links must never redirect, even for one request, once the expiry time has passed (±1 s).`,
      example: `<p>Alice creates alias <code>summer-sale</code> expiring tonight 23:59. Bob tries the same alias a second later.</p>${H.table(['Request', 'Result'], [['Alice POST alias=summer-sale', '<span class="c-g">201</span> short.ly/summer-sale'], ['Bob POST alias=summer-sale', '<span class="c-r">409 Conflict</span> — taken'], ['GET /summer-sale at 23:00', '302 → target'], ['GET /summer-sale at 00:01', '<span class="c-r">410 Gone</span>']])}`,
      brute: { why: `<p>Naive design: separate tables for "generated" and "alias" links; on create do <code>SELECT</code> then <code>INSERT</code>; on expiry run a cron every night doing <code>DELETE FROM urls WHERE expires_at &lt; NOW()</code>, and cache entries live 24 hours. Breaks because: the SELECT-then-INSERT is a race (two users both win); the nightly delete is a huge transaction that locks the hot table and leaves links alive for up to 24 h; the cache keeps serving expired links; and two namespaces double the lookup cost.</p>` },
      mcq: { q: 'Two users submit the same alias at the same instant. What is the correct way to guarantee only one wins?', options: ['SELECT first, INSERT if empty', 'A single atomic conditional insert on a unique key', 'Lock the whole table in the app server', 'Hope the load balancer serialises them'], answer: 1, explain: 'Only the database can arbitrate atomically. A unique key plus INSERT-if-absent (or a DynamoDB condition) lets exactly one writer succeed and returns an error to the other.' },
      hints: [
        `<p>Hint 1: Use the <b>same table and the same lookup path</b> for generated codes and aliases — an alias is just a code chosen by the user. One primary key, one cache.</p>`,
        `<p>Hint 2: Let the database arbitrate: primary key on <code>code</code> plus a conditional insert. Check expiry at <b>read time</b> and also cap the cache TTL by <code>expires_at</code>.</p>`,
        `<p>Hint 3: Reclaim space with native TTL or a sweeper that walks old partitions in small batches. Keep generated codes and aliases from colliding by giving aliases a rule (contains a hyphen or length &gt; 8).</p>`
      ],
      solution: {
        approach: `<p><b>Schema:</b> one table <code>urls(code PK, long_url, owner_id, created_at, expires_at NULLABLE, is_custom)</code>, sharded by hash(code). Generated codes and aliases share the key space; aliases must contain a hyphen or be &gt; 8 chars so a generator (fixed 7 chars, no hyphen) can never produce the same string.</p>
<p><b>Write path:</b> validate alias with a regex and a blocklist (profanity, <code>admin</code>, <code>api</code>). Do <code>INSERT ... IF NOT EXISTS</code> / <code>ON CONFLICT DO NOTHING</code>. If 0 rows inserted → return <b>409</b>. For generated codes, take the next ID from the leased range, encode, insert. Validate <code>expires_at</code> is in the future and ≤ 1 year ahead.</p>
<p><b>Read path:</b> cache lookup → on miss load the row → if <code>expires_at &lt;= now</code> return <b>410</b> and cache that tombstone briefly → else cache with <b>TTL = min(1 h, expires_at − now)</b>, so the cache can never outlive the link. Redirect with 302.</p>
<p><b>Reclaim:</b> enable native TTL on <code>expires_at</code> (+ a day of grace for support) where available; otherwise a sweeper scans the oldest time-bucketed partitions and deletes in batches of ~1,000 with sleeps. Correctness never depends on the sweeper because reads check expiry themselves. Owner-initiated delete/disable also does a cache <code>DEL</code>.</p>
<p><b>Failure modes:</b> clock skew between servers → use DB time or allow ±1 s; alias squatting → per-user alias quota and rate limit; reuse of an expired alias → only after a cool-down so old cached 302s elsewhere don't send traffic to a stranger's page.</p>`,
        complexity: `<p>Redirect: O(1) cache lookup, O(1) DB point read on miss. Create: one conditional write. Storage reclaimed in the background at O(batch) cost per sweep.</p>`,
        followUps: ['How would you let a user change the target of an existing link?', 'How do you stop someone buying a reused expired alias to hijack old traffic?', 'How does this change if links must be deleted globally within 1 second?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — PASTEBIN
     ===================================================================== */
  topics.push({
    title: 'Design Pastebin (Text Sharing with Expiry)',
    analogy: `<p>Picture a <b>community notice board</b> in a cafe with a locked storeroom behind it. You pin a small index card on the board that says "Note #A7k2 — in storeroom shelf 9" (that is the <b>metadata</b>), while the actual bulky document sits in the storeroom (that is the <b>blob storage</b>). Anyone with the card number gets the document. A caretaker walks round every night and removes cards — and documents — whose "take down by" date has passed. Keeping the small card and the big document <b>in different places</b> is the whole trick of Pastebin.</p>`,
    explain: `<p>Pastebin lets people paste text (code, logs, notes), get a link, and share it. It looks like the URL shortener, but the thing we store is <b>big</b> (kilobytes to megabytes) instead of tiny. That one difference changes the design: you stop putting content in your database and start using <b>object storage</b>.</p>
<h4>1. Requirements</h4>
${H.table(['Type', 'Requirement'], [
  ['Functional', 'Create a paste (text up to 10 MB), get a unique link'],
  ['Functional', 'Read a paste by link; optional syntax highlighting, <i>raw</i> view'],
  ['Functional', 'Expiry (10 min / 1 day / 1 week / never), visibility (public, unlisted, private)'],
  ['Variants', 'Burn after reading, password protection, edit/fork, per-user paste history, abuse reporting'],
  ['Non-functional', 'Reads ≈ 10× writes; read latency &lt; 200 ms; durable (never lose a paste); available 99.9%+'],
  ['Non-functional', 'Unlisted pastes must not be guessable']])}
<h4>2. Estimates</h4>
${H.table(['Quantity', 'Math', 'Result'], [
  ['Writes', '1M new pastes/day ÷ 86,400', '≈ <b>12 / sec</b> (peak ≈ 40)'],
  ['Reads', '10 : 1', '≈ <b>120 / sec</b> (peak ≈ 400)'],
  ['Storage / day', '1M × 10 KB average', '≈ <b>10 GB / day</b>'],
  ['Storage / 5 years', '10 GB × 365 × 5', '≈ <b>18 TB</b> content (most pastes are small; a few are huge)'],
  ['Metadata / 5 years', '1.8B rows × ~200 B', '≈ <b>360 GB</b> — fits one shardable DB'],
  ['Read bandwidth', '120/s × 10 KB', '≈ 1.2 MB/s average — easy; CDN makes it nearly free']])}
<p>The request rate is tiny. The pressure is <b>bytes</b>: 18 TB of content with strict durability. Databases are great at small, structured rows and poor and costly at storing terabytes of blobs. Object storage (S3-style) is built for exactly this: cheap, 11-nines durable, and scales without us doing anything.</p>
<h4>3. API</h4>
<pre>POST /v1/pastes   { "content": "...", "title"?, "language"?, "expires_in": "1d", "visibility": "unlisted", "burn_after_read"?: true }
                  201 -> { "id": "Xk29qPzR", "url": "https://paste.io/Xk29qPzR" }
GET  /v1/pastes/{id}        -> metadata + content (or 404 / 410)
GET  /raw/{id}              -> text/plain, served from a SEPARATE domain (no cookies, no XSS)
DELETE /v1/pastes/{id}      -> owner only</pre>
<h4>4. Data model — split small from big</h4>
${H.table(['Where', 'What', 'Why there'], [
  ['Metadata DB (SQL or KV)', 'paste_id (PK), owner_id, title, language, visibility, size, created_at, expires_at, <b>blob_key</b>, content_sha256', 'Small, queryable rows (list my pastes, find expired ones)'],
  ['Object store (S3/GCS)', 'The text itself under key <code>pastes/ab/Xk29qPzR</code> (gzip)', 'Cheap per GB, huge, durable, no capacity planning'],
  ['Redis cache', 'Hot pastes (content &lt; 100 KB) and hot metadata', 'Viral pastes get hammered; cache absorbs it'],
  ['CDN', 'Cacheable <code>/raw/{id}</code> responses', 'Offload reads to the edge for free']])}
<h4>5. Architecture</h4>
<p><b>Write:</b> client → app server → get a unique ID from the Key Generation Service → write the text to the object store → write the metadata row (with the blob key) → return the link. <b>Read:</b> CDN (hit? done) → app server → cache → metadata DB (check expiry/visibility) → object store → response. A <b>cleanup job</b> removes expired pastes. Run the visualizer to see all three flows.</p>
<h4>6. How is this different from the URL shortener?</h4>
${H.table(['', 'URL shortener', 'Pastebin'], [['Payload', '~500 bytes, in the DB', '10 KB - 10 MB, in object storage'], ['Main risk', 'ID uniqueness, redirect speed', 'Cost + durability of bytes, abuse of free storage'], ['Cache value', 'Very high (tiny, hot)', 'Medium (only small/hot pastes)'], ['Write path', 'One DB row', 'Blob write + metadata write — two systems → must be ordered carefully'], ['Security', 'Phishing links', 'XSS, malware, leaked secrets, illegal content']])}
<p><b>The ordering rule</b> for two-system writes: write the <b>blob first</b>, then the metadata row. If we crash in between we have an orphan blob (harmless garbage, swept later). The other way round gives a metadata row pointing at nothing — a user-visible 500 error.</p>`,
    clues: [
      '"Design Pastebin / GitHub Gist / a text sharing service" — the "big payload" cousin of URL shortener',
      '"Content up to 10 MB", "store 18 TB" → blob/object storage, not the primary database',
      '"Pastes expire after N days" → expires_at + lazy check + background sweeper / TTL',
      '"Private or unlisted links" → unguessable ID (128-bit random) rather than a short counter',
      '"Read-heavy" + "popular pastes" → CDN + Redis for hot objects',
      '"Burn after reading" → atomic single-use delete (compare-and-delete), not "read then delete"',
      '"Users can paste anything" → abuse: size limits, malware scanning, secret scanning, rate limits'
    ],
    code: [
      { lang: 'sql', title: 'Metadata table + expiry sweeper (runnable SQLite)', code: `-- Metadata lives in a database; the big text lives in object storage (blob_key points to it).
CREATE TABLE pastes (
  paste_id   TEXT PRIMARY KEY,
  blob_key   TEXT NOT NULL,                       -- e.g. pastes/ab/Xk29qPzR in the object store
  size_bytes INTEGER NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'unlisted',
  created_at TEXT NOT NULL,
  expires_at TEXT                                  -- NULL = never expires
);
-- Partial index: only rows that can expire are indexed, so the sweeper is cheap.
CREATE INDEX idx_pastes_expiry ON pastes(expires_at) WHERE expires_at IS NOT NULL;

INSERT INTO pastes VALUES ('Ab12', 'pastes/Ab/Ab12', 2048,  'unlisted', '2026-01-01 10:00:00', '2026-01-02 10:00:00');
INSERT INTO pastes VALUES ('Cd34', 'pastes/Cd/Cd34', 90000, 'public',   '2026-01-01 11:00:00', NULL);
INSERT INTO pastes VALUES ('Ef56', 'pastes/Ef/Ef56', 512,   'unlisted', '2026-01-01 12:00:00', '2026-01-01 13:00:00');

-- Sweeper step 1: find a small batch of expired pastes (oldest first). The app then deletes each blob.
SELECT paste_id, blob_key FROM pastes
WHERE expires_at IS NOT NULL AND expires_at <= '2026-01-02 12:00:00'
ORDER BY expires_at LIMIT 100;

-- Sweeper step 2: after the blobs are gone, remove the metadata rows (same predicate, same batch size).
DELETE FROM pastes WHERE expires_at IS NOT NULL AND expires_at <= '2026-01-02 12:00:00';

SELECT paste_id, visibility, expires_at FROM pastes ORDER BY paste_id;` }
    ],
    codeTitle: ['Metadata table + expiry sweeper'],
    viz: [
      {
        title: 'Pastebin: create / read / cleanup flows',
        input: 'create',
        inputLabel: 'Scenario: create, read or cleanup',
        gen: function (input) {
          var sc = String(input).trim().toLowerCase();
          if (sc !== 'create' && sc !== 'read' && sc !== 'cleanup') throw new Error('Type one word: create, read or cleanup');
          var nodes = [box('C', 'Client', 7, 30), box('CDN', 'CDN', 24, 30, 10), box('API', 'App Server', 46, 30, 15), box('KG', 'Key Gen Service', 46, 6, 18), box('CA', 'Redis Cache', 76, 6, 15), box('META', 'Metadata DB', 76, 30, 16), box('BLOB', 'Object Store', 76, 54, 16), box('SW', 'Cleanup Job', 24, 54, 15)];
          var edges = [['C', 'CDN'], ['CDN', 'API'], ['API', 'KG'], ['API', 'CA'], ['API', 'META'], ['API', 'BLOB'], ['SW', 'META'], ['SW', 'BLOB']];
          var steps;
          if (sc === 'create') {
            steps = [
              ['<b>The map.</b> Creating a paste. Notice the data splits in two: a small <b>metadata row</b> and a big <b>blob</b>.', {}, {}, {}],
              ['The client sends <code>POST /v1/pastes</code> with 12 KB of text and "expires in 1 day". Writes bypass the CDN cache and go straight to an app server.', { 'C-CDN': 'cur', 'CDN-API': 'cur' }, { C: 'cur' }, {}],
              ['The app server validates: size ≤ 10 MB, content-type is text, user is under their rate limit, and the text is scanned for obvious malware or leaked secrets.', {}, { API: 'cur' }, { API: 'validate' }],
              ['It asks the <b>Key Generation Service</b> for a fresh, unguessable ID such as <code>Xk29qPzR</code>. IDs are pre-generated in batches, so this is a cheap local pop, not a network round trip.', { 'API-KG': 'ok' }, { KG: 'ok' }, { KG: 'id = Xk29qPzR' }],
              ['<b>Blob first:</b> the text (gzipped to ~4 KB) is written to the object store under <code>pastes/Xk/Xk29qPzR</code>. Wait for the success reply — object stores confirm only after the data is safely replicated.', { 'API-BLOB': 'ok' }, { BLOB: 'ok' }, { BLOB: 'saved' }],
              ['<b>Then metadata:</b> insert the row (id, blob_key, size, visibility, expires_at = now + 1 day). If we crashed between the two writes we would only have an orphan blob — harmless garbage that a sweep removes.', { 'API-META': 'ok' }, { META: 'ok' }, { META: 'row saved' }],
              ['Reply <b>201 Created</b> with <code>https://paste.io/Xk29qPzR</code>. We do not need to fill the cache now; the first reader will do it (cache-aside).', { 'C-CDN': 'ok', 'CDN-API': 'ok' }, { C: 'ok' }, { C: 'link ready' }]
            ];
          } else if (sc === 'read') {
            steps = [
              ['<b>The map.</b> A friend opens the link. The read path is the busy one, so it has two chances to skip the expensive parts: the CDN and the cache.', {}, {}, {}],
              ['The request first reaches the <b>CDN</b>. For public pastes the response is cacheable with <code>Cache-Control: max-age = min(1 hour, time-to-expiry)</code>. Suppose this is a CDN <span class="c-r">miss</span>.', { 'C-CDN': 'cur' }, { CDN: 'bad', C: 'cur' }, { CDN: 'MISS' }],
              ['The CDN forwards to an app server (a stateless box behind a load balancer).', { 'CDN-API': 'cur' }, { API: 'cur' }, {}],
              ['The app server checks Redis for the paste. Small, hot pastes are cached. Here: <span class="c-r">miss</span> — maybe it is the first read.', { 'API-CA': 'bad' }, { CA: 'bad' }, { CA: 'MISS' }],
              ['Load the <b>metadata row</b> by primary key. Check: does it exist (404)? has <code>expires_at</code> passed (410 Gone)? is visibility ok for this viewer (403)? All answered from a tiny row — no need to touch the big blob yet.', { 'API-META': 'ok' }, { META: 'ok' }, { META: 'valid' }],
              ['Now fetch the content from the object store using <code>blob_key</code>. Object-store reads take about 20-50 ms and cost almost nothing.', { 'API-BLOB': 'ok' }, { BLOB: 'ok' }, { BLOB: 'bytes' }],
              ['Put it in Redis (if &lt; 100 KB) with a TTL, then answer the client and let the CDN keep a copy. The next 10,000 readers of a viral paste never reach us.', { 'API-CA': 'ok', 'CDN-API': 'ok', 'C-CDN': 'ok' }, { CA: 'ok', CDN: 'ok', C: 'ok' }, { CA: 'set + TTL', CDN: 'cached' }]
            ];
          } else {
            steps = [
              ['<b>The map.</b> Every night (or every few minutes) a <b>cleanup job</b> removes expired pastes. Correctness never depends on it — reads already refuse expired pastes — it only reclaims space.', {}, {}, {}],
              ['The job asks the metadata DB for a small batch (say 500) of rows where <code>expires_at ≤ now</code>. A partial index on <code>expires_at</code> makes this fast and avoids scanning 1.8 billion rows.', { 'SW-META': 'cur' }, { SW: 'cur', META: 'cur' }, { META: '500 expired' }],
              ['For each row it deletes the blob from the object store (or lets the bucket\'s lifecycle rule do it). Deleting <b>blobs first</b> means a crash leaves metadata with no content — still safely "expired" — not the reverse.', { 'SW-BLOB': 'ok' }, { BLOB: 'bad' }, { BLOB: 'deleted' }],
              ['Then the job deletes the metadata rows in the same small batch and also issues <code>DEL</code> to Redis and a CDN purge for any still-cached copy.', { 'SW-META': 'ok' }, { META: 'ok', CA: 'bad' }, { META: 'rows removed' }],
              ['Sleep a little, then repeat. Small batches with pauses mean no long locks and no spike in database load. Deletion is <b>idempotent</b>, so if the job is killed half-way it simply re-runs.', {}, { SW: 'sel' }, { SW: 'next batch' }]
            ];
          }
          return flowFrames(nodes, edges, steps, 60, 'Pastebin architecture');
        }
      },
      {
        title: 'Why blobs do not belong in the database: storage growth',
        input: '1000000 10',
        inputLabel: 'Pastes per day, average KB per paste',
        gen: function (input) {
          var p = String(input).trim().split(/[\s,]+/).map(Number);
          if (p.length !== 2 || p.some(function (x) { return !isFinite(x) || x <= 0; })) throw new Error('Enter two positive numbers, e.g. 1000000 10');
          if (p[0] > 1e9 || p[1] > 1e6) throw new Error('Please keep pastes/day ≤ 1e9 and KB ≤ 1e6');
          var perDayGB = p[0] * p[1] / 1e6, frames = [], cum = [], i;
          frames.push({ narr: 'Every day we add <b>' + p[0].toLocaleString('en-US') + '</b> pastes × <b>' + p[1] + ' KB</b> = <b>' + perDayGB.toFixed(1) + ' GB/day</b> of raw text. Let us watch it pile up year by year (before compression and replication).', parts: [{ type: 'vars', vals: { 'pastes/day': p[0], 'avg KB': p[1], 'GB/day': Number(perDayGB.toFixed(2)) } }] });
          for (i = 1; i <= 5; i++) {
            cum.push(Number((perDayGB * 365 * i / 1000).toFixed(2)));
            var texts = cum.map(function (v) { return v + ' TB'; });
            var hl = {}; hl[i - 1] = 'cur';
            frames.push({ narr: 'After <b>year ' + i + '</b>: about <b>' + cum[i - 1] + ' TB</b>. ' + (cum[i - 1] > 10 ? 'That is already more than one comfortable database node holds — we would need sharding, backups of terabytes and expensive SSDs.' : 'Still modest, but remember it only ever grows (unless pastes expire).'), parts: [{ type: 'bars', label: 'Cumulative content (TB)', values: cum.slice(), hl: hl, texts: texts, idxLabels: cum.map(function (v, k) { return 'Y' + (k + 1); }) }, { type: 'vars', vals: { year: i, 'TB so far': cum[i - 1] }, hl: { 'TB so far': 'cur' } }] });
          }
          var tb5 = cum[4], dbCost = Math.round(tb5 * 1000 * 0.30), s3Cost = Math.round(tb5 * 1000 * 0.023);
          frames.push({ narr: 'Rough monthly storage cost for ' + tb5 + ' TB: SSD-backed database ≈ <b>$' + dbCost.toLocaleString('en-US') + '</b> (about $0.10 per GB × 3 replicas), object storage ≈ <b>$' + s3Cost.toLocaleString('en-US') + '</b> (about $0.023 per GB, replication included). Object storage is roughly 13× cheaper <i>and</i> needs no resharding. The database keeps only ~200-byte metadata rows (' + (p[0] * 365 * 5 * 200 / 1e9).toFixed(0) + ' GB over 5 years).', parts: [{ type: 'table', label: 'Where should the bytes live?', columns: ['Option', '~$ / month (5-yr data)', 'Verdict'], rows: [['Primary DB (SSD, 3 replicas)', '$' + dbCost.toLocaleString('en-US'), 'Costly, hard to shard'], ['Object store (S3-class)', '$' + s3Cost.toLocaleString('en-US'), 'Cheap, durable, elastic'], ['Metadata only in DB', '~$' + Math.max(1, Math.round(p[0] * 365 * 5 * 200 / 1e9 * 0.3)), 'Tiny, fast, queryable']], hl: { 1: 'ok', 2: 'ok' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example: why 18 TB and not 18 GB', html: `<p>Common slip: "1M pastes a day, that is nothing!" True for <i>requests</i> (12/sec), false for <i>bytes</i>. Do the multiplication on the page:</p>
${H.table(['Step', 'Number'], [['Pastes per day', '1,000,000'], ['× average size', '10 KB = 10<sup>4</sup> bytes'], ['= per day', '10<sup>10</sup> bytes = 10 GB'], ['× 365 × 5 years', '≈ 18,250 GB ≈ 18 TB'], ['× 3 replicas (if you ran it yourself)', '≈ 55 TB']])}
<p>Even with gzip (text compresses 3-5×) this is firmly "storage problem, not throughput problem" — the signal to reach for object storage and a CDN.</p>`
      },
      {
        title: 'Burn after reading — the atomic way', html: `<p>"The paste disappears after the first view." A naive server does <code>read → show → delete</code>. Two people opening the link at the same moment can <b>both</b> read it before either delete runs.</p>
<p>The fix is one atomic step on the metadata row: <code>UPDATE pastes SET consumed = 1 WHERE id = ? AND consumed = 0</code>. If it reports <b>1 row changed</b>, you are the first (and only) reader — now fetch the blob. If <b>0 rows</b>, answer 410 Gone. In Redis the same trick is <code>GETDEL</code>. Also: mark such responses <code>Cache-Control: no-store</code> so neither CDN nor browser keeps a copy, and exclude them from link-preview bots (Slack/Teams unfurlers would "burn" the paste before the human opens it — require a click-through "Reveal" button that does a POST).</p>`
      },
      {
        title: 'Serving user content safely (XSS and friends)', html: `<p>If someone pastes <code>&lt;script&gt;steal(document.cookie)&lt;/script&gt;</code> and you serve it as HTML from your main domain, every visitor's session is at risk. Defences, cheapest first:</p>
<ul><li>Serve raw content as <code>Content-Type: text/plain</code> with <code>X-Content-Type-Options: nosniff</code>.</li><li>Serve it from a <b>separate domain</b> (<code>paste-usercontent.io</code>) so cookies of your main site are never sent.</li><li>Render highlighted code on the client with a library that escapes HTML; add a strict <code>Content-Security-Policy</code>.</li><li>Add <code>Content-Disposition: attachment</code> for anything that is not plain text.</li></ul>
<p>Interviewers love hearing "user-generated content = untrusted input" in the first minute.</p>`
      }
    ],
    deepDive: `<h4>ID strategy: public vs unlisted</h4>
<p>For <b>public</b> pastes an 8-character base62 ID (218 trillion values) from a key-generation service is fine. For <b>unlisted</b> pastes the link <i>is</i> the secret, so use 128 bits of randomness (22 base62 chars or a UUIDv4/v7-style token) — 8 chars can be brute-forced at API speed over time if you do not rate limit. Never derive IDs from a counter for private data.</p>
<h4>Key Generation Service (KGS)</h4>
<p>Pre-compute random unused IDs into two tables (<code>unused</code>, <code>used</code>). App servers fetch a batch of e.g. 1,000 IDs, move them to <code>used</code> in one transaction, and keep them in memory. If a server crashes, those IDs are simply lost — fine. Run KGS replicated; a standby takes over; servers hold enough IDs to survive a minute-long outage.</p>
<h4>Blob layout and durability</h4>
<ul><li>Key = <code>pastes/{first2chars}/{id}</code> to spread load across storage partitions (older S3 needed this; modern stores balance themselves, but it helps listing and humans).</li><li>Compress with gzip/zstd before storing; store the SHA-256 in metadata for integrity and <b>deduplication</b> (identical pastes share one blob with a reference count — useful for pasted logs).</li><li>Tiny pastes (&lt; 4 KB, the majority) can be <b>inlined in the metadata row</b> — one read instead of two.</li><li>Large pastes: use multipart/presigned upload so the bytes go client → object store directly, not through your app servers.</li></ul>
<h4>Cleanup done right</h4>
<p>Three layers: (1) reads check <code>expires_at</code> — correctness; (2) the cache TTL never exceeds time-to-expiry — freshness; (3) the sweeper and bucket lifecycle rules reclaim space — cost. Partition the metadata table by <b>expiry day</b> so cleanup is "drop yesterday's partition" (O(1)) instead of millions of row deletes.</p>
<h4>Scaling the read path</h4>
<p>CDN first (public pastes are immutable → perfect for caching; tiny TTL for private ones or skip). Redis second. Then read replicas of the metadata DB. A viral paste is a hot key: the CDN and a short in-process cache on the app server flatten it.</p>
<h4>Abuse and legal</h4>
<p>Free text storage attracts spam, malware C2 configs, leaked credentials, and illegal content. Add per-IP/user rate limits and size caps, async scanning (antivirus, secret detectors such as regexes for AWS keys), a report button with fast takedown (delete blob + purge CDN), and retention rules for law-enforcement requests.</p>
<h4>Trade-offs</h4>
${H.table(['Choice', 'Alternative', 'Why we picked it'], [['Blob store + metadata DB', 'Everything in one SQL table', 'Cost, scale and durability of large objects'], ['Blob first, then row', 'Row first', 'Orphan blob is invisible; orphan row is a visible error'], ['Lazy expiry + sweeper', 'Only cron deletion', 'Correct to the second, cheap to reclaim'], ['Random IDs for private pastes', 'Counter IDs', 'Unguessable = the link is the permission']])}`,
    aiEra: `<p><b>What AI changes:</b> pastes are now often <b>logs, stack traces, prompts and LLM transcripts</b> — people paste secrets (API keys, tokens) without noticing. A modern Pastebin runs a <b>secret scanner and a lightweight AI classifier</b> on upload to warn "this looks like a private key", and can auto-summarise or auto-tag a 5,000-line log. Also, AI crawlers love public pastes as training data and scrape them hard, so rate limiting, robots rules and per-paste "do not index" flags become real product features.</p>
<p><b>Use AI as a partner:</b> ask <code>Given this Pastebin design, list the security risks of serving user text, ranked by severity</code>; have it write the abuse-report workflow; ask for a cost model of S3 Standard vs Infrequent Access with 90% of reads in the first 2 days.</p>
<p><b>Where AI goes wrong:</b> it happily stores the content in a Postgres <code>TEXT</code> column "for simplicity", forgets that blob + row is a two-system write that needs an ordering rule, and ignores read-your-own-write issues (user creates a paste, immediately reads from a lagging replica and gets 404).</p>
<p><b>What you must still own:</b> the bytes-vs-requests insight, the failure-ordering argument, and the security story for untrusted content.</p>`,
    problems: [{
      title: 'Burn-after-reading pastes that survive link-preview bots', level: 'Medium', tags: ['pastebin', 'atomicity', 'security'], companies: ['Meta', 'Atlassian'],
      statement: `<p>Add a "burn after reading" option to Pastebin: the first successful view deletes the paste forever. Problems reported by beta users: (1) two friends clicking at the same time both saw it, (2) Slack's link preview "used up" the paste before the human opened it, (3) the CDN kept serving it afterwards. Design the read path and API changes that fix all three.</p>`,
      constraints: `Up to 400 reads/s peak overall; burn pastes are ~2% of traffic. Exactly-once reveal. Link previews must not consume the paste. After consumption, no cache layer may serve the content.`,
      example: `${H.table(['Event', 'Naive', 'Correct'], [['Slack unfurls the link', 'Paste burned', 'Preview shows "private paste — click to reveal"'], ['Alice and Bob both click within 5 ms', 'Both see it', 'One sees it, other gets 410'], ['Alice reloads after reveal', 'Still cached by CDN', '410 Gone']])}`,
      brute: { why: `<p>Naive: <code>GET /{id}</code> reads the blob, returns it, then deletes it. Race: both concurrent requests pass the read before either delete. Bots with GET requests (Slack, Teams, antivirus link scanners, browser prefetch) consume it. The CDN or browser cache may keep a copy. GET is also supposed to be safe and repeatable, so mutating on GET breaks the HTTP contract.</p>` },
      mcq: { q: 'Which design correctly prevents two simultaneous readers from both seeing a burn-after-reading paste?', options: ['Read the paste, then delete it', 'Atomically flip a consumed flag (UPDATE ... WHERE consumed = 0) and only the winner reads the blob', 'Delete the paste from the cache first', 'Use a longer expiry'], answer: 1, explain: 'A single atomic compare-and-set on the metadata row gives a unique winner. Everything else leaves a window where both requests pass the check.' },
      hints: [
        `<p>Hint 1: A GET that destroys data is dangerous — any crawler or previewer will trigger it. Separate "see that it exists" from "reveal it".</p>`,
        `<p>Hint 2: Use an interstitial: GET shows a tiny HTML page with a Reveal button; the button sends a POST that performs the atomic consume.</p>`,
        `<p>Hint 3: Make the consume a compare-and-set on the metadata row, then fetch/delete the blob; mark responses no-store and purge caches; exclude burn pastes from the CDN and the Redis cache entirely.</p>`
      ],
      solution: {
        approach: `<p><b>API:</b> <code>GET /{id}</code> for a burn paste returns only a small static interstitial ("This paste self-destructs after viewing — Reveal") with <code>Cache-Control: no-store</code> and <code>X-Robots-Tag: noindex</code>; bots stop there. The Reveal button sends <code>POST /v1/pastes/{id}/reveal</code> (a POST, so prefetchers and unfurlers do not fire it) carrying a CSRF token.</p>
<p><b>Consume step:</b> in the metadata DB run <code>UPDATE pastes SET consumed_at = now() WHERE id = ? AND consumed_at IS NULL AND (expires_at IS NULL OR expires_at &gt; now())</code> and check affected rows. 1 → this caller is the unique winner: read the blob, stream it to the client, then enqueue blob deletion and metadata tombstone. 0 → return <b>410 Gone</b>. In a KV store use a conditional write (compare-and-set on a version) instead.</p>
<p><b>Caches:</b> never put burn pastes in the CDN or Redis; responses carry <code>no-store</code>. For a non-burn paste that gets converted to burn, purge the CDN and Redis key first.</p>
<p><b>Failure handling:</b> if the server crashes after consuming but before delivering, the reader loses it — acceptable by design, but we can allow a 30-second "grace token": store a one-time reveal token in the row so the same browser session can retry. Delete the blob asynchronously with retries; deletion is idempotent.</p>`,
        complexity: `<p>One DB conditional write per reveal (O(1)), one object-store read, one async delete. No extra load on the hot read path because burn pastes are excluded from caches.</p>`,
        followUps: ['How would you support "burn after N views"?', 'What if the metadata DB is eventually consistent (Dynamo-style)?', 'How do you tell a real browser from a link-preview bot without breaking accessibility?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — RATE LIMITER
     ===================================================================== */
  topics.push({
    title: 'Design a Distributed Rate Limiter',
    analogy: `<p>A <b>nightclub bouncer</b> with a bucket of wristbands. The bucket holds 5 wristbands and a helper drops in 1 new wristband every second. Each guest needs a wristband to enter. If a group of 5 walks in together, they all get in at once (a burst is fine!), but the 6th person must wait for the next wristband to appear. The bouncer does not care who is famous — only whether there is a wristband in the bucket. That is the <b>token bucket</b>. Now imagine 20 bouncers at 20 doors who all need to share <i>one</i> bucket: that is the "distributed" part, and it is where the real design work lives.</p>`,
    explain: `<p>A <b>rate limiter</b> caps how many requests a client may make in a time window — "100 requests per minute per user". It protects you from abusive clients, buggy retry loops, scrapers, and traffic spikes that would knock your servers over. It also enforces fair use and paid tiers (free = 60/min, pro = 6,000/min).</p>
<h4>1. Requirements</h4>
${H.table(['Type', 'Requirement'], [
  ['Functional', 'Limit requests by <b>user id / API key / IP / endpoint</b>; rules are configurable (per user, per IP, global, per endpoint)'],
  ['Functional', 'Over the limit → <b>HTTP 429 Too Many Requests</b> with <code>Retry-After</code> and <code>X-RateLimit-*</code> headers'],
  ['Functional', 'Allow short bursts but enforce the average rate'],
  ['Non-functional', 'Adds &lt; 2 ms to a request (it sits on the hot path of <i>everything</i>)'],
  ['Non-functional', 'Accurate enough across many servers; highly available — the limiter must never be the reason the site is down'],
  ['Non-functional', 'Rules changeable without redeploy']])}
<h4>2. Estimates</h4>
${H.table(['Quantity', 'Math', 'Result'], [
  ['Checks per second', '100M daily users, peak 500K requests/s at the edge', '≈ <b>500K checks / sec</b> (one per request)'],
  ['Active keys', '20M users active in any window, ~100 bytes each (key + counters)', '≈ <b>2 GB</b> — fits in memory easily'],
  ['One Redis node', '~80-100K simple ops/s (Lua scripts a bit less)', '→ <b>8-10 shards</b> for 500K/s with headroom'],
  ['Latency budget', 'same-AZ Redis round trip ≈ 0.3-0.5 ms', 'fits in 2 ms']])}
<p>The state is small and the operation is simple. The challenge is doing it <b>atomically</b> across many servers with tiny latency.</p>
<h4>3. Where does it live?</h4>
${H.table(['Placement', 'Pros', 'Cons'], [['In each app server (library)', 'Zero network hop', 'Each server sees only its share of traffic → inaccurate'], ['<b>API gateway / sidecar</b> (most common)', 'One place, protects everything, language-agnostic', 'Gateway must be scaled and made highly available'], ['Separate rate-limit service (gRPC)', 'Shared by many gateways, central rules', 'Extra network hop, another service to keep alive']])}
<h4>4. The five classic algorithms</h4>
${H.table(['Algorithm', 'Idea', 'Memory/key', 'Bursts', 'Weakness'], [
  ['<b>Token bucket</b>', 'Bucket of N tokens, refill r per sec; a request takes 1', '2 numbers (tokens, last_ts)', 'Allows burst up to N', 'Two knobs to tune'],
  ['Leaky bucket', 'Requests enter a queue that drains at a fixed rate', 'queue / 2 numbers', 'Smooths bursts (no burst out)', 'Bursts queue or drop; added latency'],
  ['Fixed window counter', 'Count per calendar minute, reset at :00', '1 counter', 'Up to 2× at window edge', '100 at 12:00:59 + 100 at 12:01:00 = 200 in 2 s'],
  ['Sliding window log', 'Store a timestamp per request; count those in last 60 s', 'O(limit) timestamps', 'Exact', 'Memory-hungry'],
  ['Sliding window counter', 'Weighted blend of previous and current window counters', '2 counters', 'Close to exact (~99%)', 'Approximation']])}
<p>Most real systems (Stripe, AWS API Gateway, Envoy) use a <b>token bucket</b> or <b>sliding window counter</b> because they need one or two numbers per key.</p>
<h4>5. API and rules</h4>
<pre>Request ->  GET /v1/orders   Authorization: Bearer ...   (key = user:42)
Allowed  ->  200   X-RateLimit-Limit: 100   X-RateLimit-Remaining: 37   X-RateLimit-Reset: 1767225600
Blocked  ->  429   Retry-After: 12   { "error": "rate_limited" }

rules.yaml (hot-reloaded):
  - match: { endpoint: "POST /v1/orders", tier: free }  limit: 10 / min   burst: 5
  - match: { endpoint: "*",              tier: pro  }   limit: 6000 / min burst: 200
  - match: { scope: global, endpoint: "GET /v1/search" } limit: 50000 / min</pre>
<h4>6. Architecture and the atomicity trap</h4>
<p>Client → gateway → limiter middleware → <b>Redis</b> (state) → backend. The check is "read tokens, refill, subtract 1, write back". If two gateways do that as separate Redis commands at once, both read "1 token left" and both let the request through — a <b>race</b>. The fix is to do the whole thing in one atomic step: a <b>Lua script</b> (Redis runs it single-threaded, nothing interleaves), or <code>INCR</code>/<code>EXPIRE</code> for simple counters. Watch the token-bucket visualizer for the refill arithmetic and the request-flow visualizer for the end-to-end path.</p>`,
    clues: [
      '"Design a rate limiter" / "throttle API calls" / "limit 100 requests per user per minute"',
      '"Allow bursts but enforce an average rate" → token bucket (capacity = burst, refill = sustained rate)',
      '"Multiple servers share the limit" → central store (Redis) + atomic Lua script, or sharded sticky routing',
      '"Per-user and global limits" → two keys per request, check both; think about atomicity across shards',
      '"What happens if the limiter is down?" → fail-open vs fail-closed decision, per endpoint',
      '"Limit is exceeded just at the edge of the minute" → fixed-window boundary problem → sliding window',
      '"Different limits for free and paid users" → rules service with tiers, hot reload, cached in the gateway'
    ],
    code: [
      `import java.util.function.LongSupplier;

/** Thread-safe token bucket. The clock is injected so we can test it with fake time. */
public class TokenBucket {
    private final double capacity;        // max tokens = max burst size
    private final double refillPerNano;   // tokens added per nanosecond (sustained rate)
    private final LongSupplier clock;     // returns "now" in nanoseconds
    private double tokens;                // tokens available right now
    private long lastRefill;              // when we last topped up

    public TokenBucket(double capacity, double refillPerSecond, LongSupplier clock) {
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000.0;
        this.clock = clock;
        this.tokens = capacity;           // start full: a new client may burst immediately
        this.lastRefill = clock.getAsLong();
    }

    /** Try to take 'cost' tokens. true = allowed, false = rate limited (HTTP 429). */
    public synchronized boolean tryAcquire(double cost) {
        long now = clock.getAsLong();
        // 1) Lazy refill: we do not run a timer, we just compute what arrived since last time.
        double added = (now - lastRefill) * refillPerNano;
        tokens = Math.min(capacity, tokens + added);   // bucket can never overflow
        lastRefill = now;
        // 2) Spend.
        if (tokens >= cost) {
            tokens -= cost;
            return true;
        }
        return false;
    }

    public static void main(String[] args) {
        long[] fakeNow = {0};                              // fake clock in nanoseconds
        TokenBucket b = new TokenBucket(5, 1.0, () -> fakeNow[0]); // burst 5, refill 1/sec
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 7; i++) sb.append(b.tryAcquire(1) ? "Y" : "n");
        System.out.println("t=0s  burst of 7: " + sb);        // YYYYYnn  (5 allowed, 2 rejected)
        fakeNow[0] = 2_000_000_000L;                           // two seconds later -> 2 new tokens
        sb = new StringBuilder();
        for (int i = 0; i < 3; i++) sb.append(b.tryAcquire(1) ? "Y" : "n");
        System.out.println("t=2s  3 requests: " + sb);        // YYn
    }
}`,
      { lang: 'python', title: 'Token bucket vs sliding-window counter (runnable)', run: true, code: `class TokenBucket:
    """Burst up to 'capacity', long-run average = refill_per_sec."""
    def __init__(self, capacity, refill_per_sec, now=0.0):
        self.capacity, self.rate = capacity, refill_per_sec
        self.tokens, self.last = float(capacity), now

    def allow(self, now, cost=1):
        # lazy refill: add what accumulated since the last call, never above capacity
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False

class SlidingWindowCounter:
    """Approximate sliding window using two fixed-window counters."""
    def __init__(self, limit, window=60):
        self.limit, self.window = limit, window
        self.cur_start, self.cur, self.prev = 0, 0, 0
    def allow(self, now):
        start = now - (now % self.window)
        if start != self.cur_start:                      # moved to a new window
            self.prev = self.cur if start - self.cur_start == self.window else 0
            self.cur, self.cur_start = 0, start
        elapsed = (now - start) / self.window            # 0.0 .. 1.0 into current window
        estimate = self.prev * (1 - elapsed) + self.cur  # weight the previous window
        if estimate < self.limit:
            self.cur += 1
            return True
        return False

# --- token bucket: capacity 5, refill 1 token/sec, 6 requests at t=0 then more later
tb = TokenBucket(5, 1)
times = [0, 0, 0, 0, 0, 0, 1, 2, 2, 6]
print("token bucket :", "".join("Y" if tb.allow(t) else "n" for t in times), "for t =", times)

# --- fixed window would allow 2x at the boundary; sliding window counter does not
sw = SlidingWindowCounter(limit=10, window=60)
burst1 = sum(sw.allow(59) for _ in range(10))    # 10 requests at 12:00:59
burst2 = sum(sw.allow(61) for _ in range(10))    # 10 more at 12:01:01
print("sliding window: allowed", burst1, "then", burst2, "(fixed window would allow 10 + 10)")` },
      { lang: 'text', check: false, title: 'Atomic token bucket in Redis (Lua)', code: `-- KEYS[1] = bucket key, e.g. rl:user:42:POST/orders
-- ARGV: capacity, refill_per_sec, cost, ttl_seconds
local cap, rate, cost, ttl = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local t = redis.call('TIME')                       -- use Redis's clock: no skew between app servers
local now = tonumber(t[1]) + tonumber(t[2]) / 1e6
local h = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens, ts = tonumber(h[1]), tonumber(h[2])
if tokens == nil then tokens, ts = cap, now end    -- first sight of this client: full bucket
tokens = math.min(cap, tokens + (now - ts) * rate) -- lazy refill
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('EXPIRE', KEYS[1], ttl)                 -- idle clients disappear: memory stays bounded
return { allowed, math.floor(tokens) }` }
    ],
    codeTitle: ['Token bucket (Java)', 'Token bucket vs sliding-window counter (Python)', 'Atomic token bucket in Redis (Lua)'],
    viz: [
      {
        title: 'Token bucket: refill and spend',
        input: 'capacity=5 refill=1 req=0,0,0,0,0,0,1,2,2,6',
        inputLabel: 'capacity, refill (tokens/sec), request times in seconds',
        gen: function (input) {
          var s = String(input);
          var cm = s.match(/capacity\s*=\s*(\d+)/i), rm = s.match(/refill\s*=\s*(\d+)/i), qm = s.match(/req\s*=\s*([\d,\s]+)/i);
          if (!cm || !rm || !qm) throw new Error('Format: capacity=5 refill=1 req=0,0,1,3');
          var cap = Number(cm[1]), rate = Number(rm[1]);
          var req = qm[1].split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
          if (cap < 1 || cap > 10) throw new Error('capacity must be 1..10');
          if (rate < 0 || rate > 10) throw new Error('refill must be 0..10');
          if (req.length < 1 || req.length > 16) throw new Error('Give 1 to 16 request times');
          for (var i = 0; i < req.length; i++) { if (isNaN(req[i]) || req[i] < 0 || req[i] > 120 || (i > 0 && req[i] < req[i - 1])) throw new Error('Times must be increasing numbers between 0 and 120'); }
          function bucket(tokens, hlmode) {
            var vals = [], hl = {}, texts = [];
            for (var k = 0; k < cap; k++) { vals.push(k < tokens ? 1 : 0.12); hl[k] = k < tokens ? 'ok' : (hlmode === 'bad' ? 'bad' : 'done'); texts.push(k < tokens ? 'T' : ''); }
            return { type: 'bars', label: 'Bucket: each bar is one token slot (' + tokens + ' of ' + cap + ' full)', values: vals, hl: hl, texts: texts };
          }
          var frames = [], tokens = cap, last = 0, log = [], allowedN = 0;
          frames.push({ narr: 'Bucket holds up to <b>' + cap + '</b> tokens (the maximum burst) and gets <b>' + rate + '</b> new token(s) every second (the sustained rate). It starts <b>full</b>, so a brand-new client may burst right away. Every request costs 1 token.', parts: [bucket(tokens), { type: 'vars', vals: { capacity: cap, 'refill / sec': rate, tokens: tokens } }] });
          for (var j = 0; j < req.length; j++) {
            var t = req[j], before = tokens, added = (t - last) * rate;
            tokens = Math.min(cap, tokens + added);
            var afterRefill = tokens, ok = tokens >= 1;
            if (ok) { tokens -= 1; allowedN++; }
            last = t;
            log.push([t, before, '+' + (afterRefill - before), afterRefill, ok ? 'ALLOWED' : 'REJECTED 429']);
            frames.push({
              narr: 'Request #' + (j + 1) + ' at <b>t = ' + t + 's</b>. Lazy refill: ' + (t - last === 0 && j > 0 && req[j - 1] === t ? 'no time has passed, so +0 tokens. ' : 'time since last request × ' + rate + ' = +' + added + ' (capped at ' + cap + '), now ' + afterRefill + ' token(s). ') + (ok ? '<span class="c-g">A token is available → ALLOWED</span>, tokens left: <b>' + tokens + '</b>.' : '<span class="c-r">Bucket empty → REJECTED with 429</span>. The client should wait about ' + (rate > 0 ? Math.ceil(1 / rate) : 'forever') + ' s (<code>Retry-After</code>).'),
              parts: [bucket(tokens, ok ? '' : 'bad'), { type: 'vars', vals: { time: t, 'tokens after refill': afterRefill, 'tokens now': tokens, decision: ok ? 'ALLOWED' : 'REJECTED' }, hl: { decision: ok ? 'ok' : 'bad' } }, { type: 'table', label: 'Request log', columns: ['t (s)', 'tokens before', 'refill', 'after refill', 'decision'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = ok ? 'ok' : 'bad'; return h; })() }]
            });
          }
          frames.push({ narr: 'Done: <b>' + allowedN + '</b> of ' + req.length + ' requests allowed. Notice the two behaviours: a <b>burst</b> up to ' + cap + ' is fine when the bucket is full, but over the long run you can never average more than <b>' + rate + ' request(s) per second</b>.', parts: [bucket(tokens), { type: 'vars', vals: { allowed: allowedN, rejected: req.length - allowedN }, hl: { allowed: 'ok', rejected: 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'Rate limiter request flow (allowed / blocked / Redis down)',
        input: 'allowed',
        inputLabel: 'Scenario: allowed, blocked or down',
        gen: function (input) {
          var sc = String(input).trim().toLowerCase();
          if (sc !== 'allowed' && sc !== 'blocked' && sc !== 'down') throw new Error('Type one word: allowed, blocked or down');
          var nodes = [box('C', 'Client', 7, 30), box('GW', 'API Gateway', 28, 30, 16), box('RL', 'Limiter Logic', 53, 30, 16), box('R', 'Redis (counters)', 82, 8, 18), box('RU', 'Rules Store', 82, 34, 16), box('SVC', 'Backend Service', 53, 56, 18)];
          var edges = [['C', 'GW'], ['GW', 'RL'], ['RL', 'R', 'Lua script'], ['RL', 'RU', 'cached rules'], ['GW', 'SVC']];
          var steps;
          if (sc === 'allowed') {
            steps = [
              ['<b>The map.</b> Every request passes through the gateway, which asks the limiter before touching the backend. Case 1: a polite client within its limit.', {}, {}, {}],
              ['Client sends <code>GET /v1/orders</code> with its API key. The gateway identifies the caller: <code>user:42</code>, tier <b>free</b>.', { 'C-GW': 'cur' }, { C: 'cur', GW: 'cur' }, {}],
              ['The gateway calls the limiter logic (an in-process filter or a sidecar — no slow network hop).', { 'GW-RL': 'cur' }, { RL: 'cur' }, {}],
              ['The limiter looks up the matching rule: "free tier, GET /orders: 100 per minute, burst 20". Rules are <b>cached locally</b> and refreshed every few seconds from the rules store, so this is a memory lookup.', { 'RL-RU': 'ok' }, { RU: 'ok' }, { RU: 'rule found' }],
              ['It builds the key <code>rl:user:42:GET/orders</code> and runs the <b>Lua script</b> on the Redis shard that owns this key. Inside Redis, refill + check + subtract happen as one atomic step.', { 'RL-R': 'cur' }, { R: 'cur' }, { R: 'allowed=1' }],
              ['Redis answers: <span class="c-g">allowed</span>, 37 tokens left. The limiter adds headers <code>X-RateLimit-Remaining: 37</code>.', { 'RL-R': 'ok' }, { R: 'ok', RL: 'ok' }, { RL: 'remaining 37' }],
              ['The gateway forwards the request to the backend and relays the answer. Added latency: about <b>1 ms</b>.', { 'GW-SVC': 'ok', 'C-GW': 'ok' }, { SVC: 'ok', C: 'ok' }, { C: '200 OK' }]
            ];
          } else if (sc === 'blocked') {
            steps = [
              ['<b>The map.</b> Case 2: a scraper hammering the API. Same path, different ending.', {}, {}, {}],
              ['The scraper (<code>user:99</code>) sends request number 1,500 this minute. Gateway identifies it and calls the limiter.', { 'C-GW': 'cur', 'GW-RL': 'cur' }, { C: 'cur', GW: 'cur' }, {}],
              ['Limiter loads the cached rule and builds the key <code>rl:user:99:GET/orders</code>, then runs the Lua script in Redis.', { 'RL-RU': 'ok', 'RL-R': 'cur' }, { RL: 'cur', R: 'cur' }, {}],
              ['The bucket for this key is empty and the refill since the last call was only 0.2 tokens. Redis answers <span class="c-r">allowed = 0</span>.', { 'RL-R': 'bad' }, { R: 'bad' }, { R: 'allowed=0' }],
              ['The gateway <b>stops here</b>: the backend never sees the request — that is the whole point (it is protected). It replies <b>429 Too Many Requests</b> with <code>Retry-After: 12</code> so well-behaved clients back off.', { 'C-GW': 'bad' }, { C: 'bad', GW: 'bad', SVC: 'done' }, { C: '429', SVC: 'untouched' }],
              ['The decision is also counted in metrics ("blocked per rule") and sampled into logs. If one key is blocked over and over, an abuse system can escalate: temporary ban, CAPTCHA, or alert.', {}, { RL: 'sel' }, { RL: 'metrics++' }]
            ];
          } else {
            steps = [
              ['<b>The map.</b> Case 3: the limiter\'s own dependency (Redis) is broken. A limiter that takes the whole site down is worse than no limiter.', {}, {}, {}],
              ['A normal request arrives and the limiter runs its Lua script call.', { 'C-GW': 'cur', 'GW-RL': 'cur', 'RL-R': 'cur' }, { C: 'cur', RL: 'cur' }, {}],
              ['Redis does not answer within the <b>5 ms timeout</b> (shard failover in progress). We must not wait — the request is already late.', { 'RL-R': 'bad' }, { R: 'bad' }, { R: 'timeout' }],
              ['A <b>circuit breaker</b> opens after a few failures, so we stop even trying Redis for a few seconds (no wasted time per request).', {}, { RL: 'bad' }, { RL: 'breaker open' }],
              ['Policy decision: <b>fail-open</b> for ordinary reads (let traffic through; better a few extra requests than an outage) but <b>fail-closed</b> for sensitive endpoints like login or SMS-sending (abuse there is costly). A small in-memory per-server limiter gives rough protection meanwhile.', { 'GW-SVC': 'ok' }, { SVC: 'ok', RL: 'sel' }, { RL: 'local fallback' }],
              ['Alerts fire, replicas get promoted, the breaker half-opens and probes Redis. Once healthy, normal limiting resumes. Counters may have lost a few seconds of state — acceptable for rate limiting.', { 'RL-R': 'ok' }, { R: 'ok' }, { R: 'recovered' }]
            ];
          }
          return flowFrames(nodes, edges, steps, 62, 'Rate limiter architecture');
        }
      }
    ],
    examples: [
      {
        title: 'Worked example: the fixed-window boundary bug', html: `<p>Limit: 100 requests per minute, counted per clock minute. A clever client sends 100 requests at <b>12:00:59</b> (allowed, window 12:00 has 100) and another 100 at <b>12:01:00</b> (new window, counter reset, allowed). That is <b>200 requests in 2 seconds</b> — double the intended limit — and every rule was "followed".</p>
${H.table(['Algorithm', 'Result for the same traffic'], [['Fixed window', '<span class="c-r">200 allowed in 2 s</span>'], ['Sliding window log', '<span class="c-g">100 allowed, 100 rejected</span> (exact)'], ['Sliding window counter', 'about 100 allowed (weights previous window ≈ 98%)'], ['Token bucket (cap 100, 100/min)', '100 at :59 uses the bucket; at :00 only ~2 tokens have refilled']])}
<p>When an interviewer says "what is wrong with a simple counter?", this is the answer.</p>`
      },
      {
        title: 'Worked example: sizing the Redis tier', html: `<p>500K checks/s at peak. A Redis node does roughly 80-100K Lua calls/s, so we need ≥ 6 shards; plan 10 for headroom and failover. Choose the shard by <code>hash(key)</code> — all state for <code>user:42</code> lives on one shard, so a check is a single-node, atomic operation. Memory: 20M active keys × ~100 B = 2 GB total, 200 MB per shard. Each shard has a replica for failover (async replication — we accept losing the last second of counters).</p>
<p>Network: 500K × ~200 B ≈ 100 MB/s across the tier — comfortable. If that is still too much: batch checks per gateway or move to <b>local-first counting</b> (each gateway keeps a local bucket and syncs to Redis every 100 ms; accuracy drops slightly but Redis load drops 10-100×).</p>`
      },
      {
        title: 'Per-user vs global limits — which key, what happens', html: `<p>Real systems stack several limits at once. For <code>POST /v1/orders</code>:</p>
${H.table(['Limit', 'Key', 'Typical value', 'Protects against'], [['Per user', '<code>rl:user:42:orders</code>', '10 / min', 'One abusive or buggy client'], ['Per IP', '<code>rl:ip:203.0.113.9</code>', '300 / min', 'Unauthenticated floods, many accounts behind one box'], ['Per endpoint (global)', '<code>rl:global:orders</code>', '50,000 / min', 'The database behind the endpoint melting'], ['Per tier', 'rule lookup by plan', 'free 10, pro 1,000', 'Fair use and paid tiers']])}
<p>A request must pass <b>all</b> of them. Order the checks cheapest first, and do not charge the per-user bucket if the global check rejects (otherwise honest users get punished for an overloaded system).</p>`
      }
    ],
    deepDive: `<h4>Atomicity and races</h4>
<p>Separate <code>GET tokens</code> / <code>SET tokens-1</code> commands are a classic race. Solutions: (1) a <b>Lua script</b> (Redis executes it as one uninterruptible unit); (2) <code>INCR</code> + <code>EXPIRE</code> for fixed windows (still set EXPIRE in a pipeline or script — if the process dies between INCR and EXPIRE the key lives forever); (3) optimistic <code>WATCH/MULTI</code> (retries under contention — avoid); (4) route all requests for a key to the <b>same owner</b> (sharded in-memory limiter) so a local mutex is enough.</p>
<h4>Clocks</h4>
<p>If every gateway uses its own clock for refill calculations, small skews produce wrong refills. Use the store's clock (<code>redis.call('TIME')</code>) inside the script, or compute the window id on the server side. Never trust a client-supplied timestamp.</p>
<h4>Multi-region</h4>
<p>Cross-ocean round trips (80+ ms) are unacceptable per request. Options: keep limits <b>per region</b> (each region gets a share of the global quota, e.g. 60/40 by traffic), or sync counters asynchronously and accept brief overshoot. Rate limiting is a place where being <b>approximately right and fast</b> beats being exactly right and slow.</p>
<h4>Hot keys and cardinality</h4>
<p>One enormous customer behind one API key hits one Redis shard; split a heavy key into N sub-buckets (<code>key#0..#7</code>), each with limit/N, chosen at random — fast, a little less exact. For huge cardinality of IP keys (botnets with millions of IPs) memory is bounded by <code>EXPIRE</code> = time to refill from empty.</p>
<h4>Soft vs hard limits and responses</h4>
<p>Return <code>429</code> with <code>Retry-After</code> (seconds). Add jitter in the client's retry (exponential backoff + jitter) so a thousand throttled clients do not all return in the same millisecond. Offer a <b>soft limit</b> (log and warn) before the <b>hard limit</b> (reject), and <b>shadow mode</b> (count but never block) when rolling out new rules so you can see who would be hit.</p>
<h4>Cost-based limiting</h4>
<p>Not all requests cost the same. Give each endpoint a <b>cost</b> (search = 5 tokens, list = 1) and spend that many tokens — the same bucket protects the backend's real capacity. Concurrency limits ("max 10 in-flight requests per user") are a different, complementary tool that protects against slow requests piling up.</p>
<h4>Operations</h4>
<p>Metrics: allowed/blocked per rule, Redis latency, fail-open count. Rules in a versioned config store with staged rollout. Always expose the headers so good clients self-throttle. Test with chaos: kill a Redis shard and verify the policy actually fires.</p>
<h4>Trade-offs</h4>
${H.table(['Decision', 'Pro', 'Con'], [['Central Redis + Lua', 'Accurate, simple mental model', 'Extra hop; Redis becomes critical (needs fail-open plan)'], ['Local counters + async sync', 'Fastest, scales to millions/s', 'Overshoot by roughly (#servers × sync interval × rate)'], ['Token bucket', 'Bursts allowed, 2 numbers', 'Two parameters to explain to users'], ['Sliding window counter', 'Smooth, 2 counters', 'Approximate']])}`,
    aiEra: `<p><b>What AI changes:</b> the biggest new rate-limiting problem is <b>LLM and agent traffic</b>. Requests are wildly uneven in cost (a 200-token chat vs a 100K-token document), so modern APIs limit in <b>tokens per minute (TPM)</b> as well as requests per minute (RPM), and bill concurrency. A token bucket still works — the "cost" is simply the number of LLM tokens (estimated up-front, corrected after the response). AI agents also retry aggressively and run in loops, so limiters need per-agent identity, loop detection and budget caps ("this agent may spend $5 today"). Meanwhile scrapers harvesting content for models are a top reason to add limits and bot detection.</p>
<p><b>Use AI as a partner:</b> ask <code>Generate 20 adversarial traffic patterns for a token-bucket limiter (burst at refill boundary, many IPs, slow-drip)</code> and turn them into a load test. Use AI to draft the Lua script, then test it with fake time.</p>
<p><b>Where AI goes wrong:</b> it writes read-modify-write limiter code with separate Redis commands (race condition), forgets <code>EXPIRE</code> (memory leak), uses the app server's clock, and says "just use Redis" without a failure policy.</p>
<p><b>What you must still own:</b> choosing the algorithm for the product's burst needs, the fail-open vs fail-closed policy, and the argument for why the check is atomic.</p>`,
    problems: [{
      title: 'Per-user and global limits that stay correct under load', level: 'Hard', tags: ['rate limiter', 'redis', 'atomicity', 'fairness'], companies: ['Stripe', 'Cloudflare'],
      statement: `<p>Your <code>POST /v1/search</code> endpoint costs real money. Rules: each user may do <b>20 requests/min</b>, and the endpoint as a whole may do <b>50,000/min</b> (backend capacity). Requests must be rejected quickly when either limit is exceeded. Requirements: honest users must not lose budget when the <i>global</i> limit rejects them; there must be no race condition between servers; Redis runs as 10 shards. Describe the data layout, the check algorithm and failure behaviour.</p>`,
      constraints: `500K checks/s peak, 10 Redis shards, p99 added latency &lt; 3 ms, 20M active users. Global counter is one very hot key.`,
      example: `${H.table(['Situation', 'Desired result'], [['User 7 at 21st request this minute', '429 (user limit)'], ['Global at 50,000 and user 8 has budget', '429 (global limit), user 8 budget NOT consumed'], ['Redis shard 4 down', 'Keys on shard 4 fail-open; others unaffected']])}`,
      brute: { why: `<p>Naive: one Redis, two <code>INCR</code> calls per request (user key then global key). Breaks because: (a) a single Redis cannot take 500K ops/s, and the global key is one hot key on one shard; (b) when the global INCR rejects, the user's counter has already been incremented, so honest users are charged for rejected requests; (c) two separate commands are not atomic across servers; (d) if Redis dies, everything fails.</p>` },
      mcq: { q: 'The global limit key lives on a different Redis shard than the user key. What is the most practical way to avoid one hot shard handling 500K ops/s for the global counter?', options: ['Put everything on one bigger Redis', 'Split the global limit into N sub-buckets across shards (or let each gateway lease a slice of the quota)', 'Remove the global limit', 'Check the global limit only on Mondays'], answer: 1, explain: 'A hot key cannot be scaled by adding shards. Splitting the quota into slices, or letting each gateway lease a chunk of tokens and refill it periodically, spreads the load and trades a little accuracy for a lot of throughput.' },
      hints: [
        `<p>Hint 1: Two different problems: the <b>user key</b> is naturally sharded (50K users per shard), but the <b>global key</b> is one hot counter.</p>`,
        `<p>Hint 2: Make the global limit approximate and local: each gateway leases a slice of the global quota (e.g. 1% = 500 tokens) from Redis and spends it locally; renew when low.</p>`,
        `<p>Hint 3: Order: check the cheap local global slice first, then do one Lua call on the user's shard. Only charge the user after the global slice accepted. Define fail-open/closed per rule.</p>`
      ],
      solution: {
        approach: `<p><b>Layout.</b> User state: token bucket per user in Redis, key <code>rl:u:{userId}:search</code>, hash(userId) picks 1 of 10 shards, updated by an atomic Lua script (refill + check + spend, EXPIRE 120 s). Global state: a <b>quota-lease</b> scheme. A coordinator key <code>rl:g:search</code> holds the global bucket (50,000 tokens/min refill). Each gateway (say 100 of them) keeps a local slice; when its slice drops below 20% it asks Redis for a lease of e.g. 500 tokens (one Lua call, atomic: grant min(request, available)). Gateways spend local tokens with no network hop. This turns 500K ops/s on the hot key into ~100-1,000 lease calls/s.</p>
<p><b>Check order per request.</b> (1) local global slice: if empty and lease denied → <b>429 (global)</b>, charge nothing to the user. (2) take one local global token, then run the user Lua script; if the user is over limit → <b>429 (user)</b> and <i>return</i> the local token to the slice so honest budget is not wasted. (3) forward to backend.</p>
<p><b>Accuracy.</b> The global limit may overshoot by at most (gateways × slice size) briefly, e.g. 100 × 500 = 50K worst case if all leases are held at once — reduce by shrinking slices when the global bucket is nearly empty (lease size = min(500, remaining/gateways)).</p>
<p><b>Failure.</b> Shard down: user checks for that shard fail-open for ordinary endpoints (with a tiny local per-user fallback bucket), fail-closed for abuse-sensitive ones; breaker prevents timeouts from adding latency. Coordinator down: gateways continue spending existing slices, then fall back to a conservative static share (50,000 ÷ gateways). Observe: blocked counts per rule, lease sizes, shard latencies, and run shadow mode before enforcing a new rule.</p>`,
        complexity: `<p>Per request: O(1) local memory op + one Lua call on one shard (O(1)). Hot-key load reduced from 500K/s to roughly (#gateways × lease renewals) per second.</p>`,
        followUps: ['How would you make the global limit exactly correct, and what would it cost?', 'How do you handle a gateway that leases tokens and then crashes?', 'How do you roll out a new rule safely?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — NOTIFICATION SYSTEM
     ===================================================================== */
  topics.push({
    title: 'Design a Notification System (Push, Email, SMS)',
    analogy: `<p>Imagine the <b>post office sorting room</b> of a big city. Letters arrive from thousands of senders. Some are urgent telegrams ("your bank code is 482913"), some are normal letters (order updates), some are bulk flyers ("50% off!"). Clerks sort them into <b>three bins by urgency</b>, check each person's preference card ("no flyers, please; no calls after 10 pm"), and hand each item to the right courier — bike (push), van (email), phone operator (SMS). If a courier is sick, the clerk tries again later, and if it keeps failing the item goes in a "problem" tray for a human. The urgent telegrams must <b>never</b> wait behind a mountain of flyers. That is a notification system.</p>`,
    explain: `<p>A <b>notification system</b> lets any product team say "tell user X about event Y" and takes care of <i>how</i>: which channel (mobile push, email, SMS, in-app), which language, when (not at 3 am), how often (not 20 times), what if it fails, and how to prove it was delivered. It is a classic <b>fan-out + queues + third-party providers</b> problem.</p>
<h4>1. Requirements</h4>
${H.table(['Type', 'Requirement'], [
  ['Functional', 'Channels: mobile push (APNs for iOS, FCM for Android), email, SMS, in-app / web push'],
  ['Functional', 'Triggered (order shipped), scheduled (reminder at 9 am local), and bulk campaigns (10M users)'],
  ['Functional', 'User preferences: opt-in/out per channel and per category, quiet hours, language'],
  ['Variants', '<b>Priority</b> (OTP and security alerts first), templates, de-duplication, rate limit per user, delivery tracking, channel fallback, digests'],
  ['Non-functional', 'High priority delivered in &lt; 2 s; at-least-once delivery, no duplicates visible to users; survives provider outages'],
  ['Non-functional', 'Scales to a 10M-user blast without blocking transactional messages']])}
<h4>2. Estimates</h4>
${H.table(['Quantity', 'Math', 'Result'], [
  ['Daily volume', '10M users × 5 notifications/day', '≈ 50M / day ≈ <b>580 / sec</b> average'],
  ['Campaign burst', 'Marketing push to 10M users within 10 minutes', '≈ <b>16,700 / sec</b> (×3 channels worst case ≈ 50K/s)'],
  ['Log storage', '50M/day × ~300 B', '≈ 15 GB/day ≈ 5.5 TB/year (keep 90 days hot ≈ 1.4 TB)'],
  ['Device tokens', '10M users × ~2 devices × 200 B', '≈ 4 GB — fits in a cache'],
  ['Provider limits', 'FCM/SES/Twilio each have rate limits and cost money', 'We must <b>throttle outbound</b> and batch']])}
<p>The average rate is easy; the <b>burst</b> and <b>third-party limits</b> are the real problem. That is why we put queues everywhere.</p>
<h4>3. API (internal, used by other services)</h4>
<pre>POST /v1/notifications
{ "user_id": "u42", "type": "order_shipped", "priority": "normal",
  "data": { "order_id": "A991", "eta": "Fri" },
  "dedup_key": "order_shipped:A991",        // makes the call safe to retry
  "send_at": null }                          // or an ISO time for scheduling
-> 202 Accepted { "notification_id": "n_8f2c" }     (we accept fast, deliver asynchronously)

POST /v1/campaigns   { "audience": "segment:lapsed_30d", "template": "winback", "priority": "low", "rate_per_sec": 5000 }
GET  /v1/notifications/{id}   -> status: queued | sent | delivered | failed | suppressed</pre>
<h4>4. Data model</h4>
${H.table(['Table', 'Key columns', 'Notes'], [
  ['notification', 'id, user_id, type, channel, priority, status, dedup_key, created_at, sent_at', 'Append-heavy log; partition by day; TTL 90 days'],
  ['user_preferences', 'user_id, channel flags, per-category opt-outs, quiet_hours, timezone, locale', 'Read on every send → cache in Redis'],
  ['device_token', 'user_id, platform, token, last_seen', 'Delete tokens that providers report as invalid'],
  ['template', 'id, channel, locale, version, body', 'Rendering = template + data; versioned']])}
<h4>5. Architecture</h4>
<p>Producers → <b>Notification API</b> (validate, dedupe, accept with 202) → <b>message bus</b> (Kafka) → <b>router workers</b> (load preferences, render template, apply rate limit and quiet hours, decide channels) → <b>one queue per channel and priority</b> → <b>channel senders</b> (push / email / SMS workers that call APNs, FCM, SES, Twilio) → delivery webhooks → status updates. Failures go to a <b>retry queue with backoff</b>, and finally a <b>dead-letter queue</b>. Play the flow visualizer for single, bulk and failure paths.</p>
<h4>6. Priority — why separate queues, not one sorted queue</h4>
<p>A single queue sorted by priority sounds neat, but a 10M-message campaign still sits in the same system and eats worker capacity. The robust pattern is <b>separate queues (or topics) per priority</b> with <b>dedicated workers</b> for each: OTP workers never process promos. Inside the worker pool you can also use <i>strict priority</i> (always serve high first) or <i>weighted fair</i> (e.g. 8 : 3 : 1) — and add <b>aging</b> so low priority is delayed, never starved forever. The queue visualizer shows strict priority in action.</p>`,
    clues: [
      '"Design a notification system / push notification service / email + SMS sender"',
      '"OTP / security alerts must arrive fast even during a marketing blast" → separate priority queues + dedicated workers',
      '"Send to 10 million users" → fan-out in chunks, throttled by provider limits, via a queue',
      '"Do not send duplicates" → idempotency / dedup key + at-least-once delivery (exactly-once is a myth)',
      '"Third-party provider is down" → retries with exponential backoff + jitter, DLQ, secondary provider',
      '"User preferences, quiet hours, time zones" → preference service + scheduler (delayed queue)',
      '"Track delivered / opened" → provider webhooks → status events → analytics'
    ],
    code: [
      { lang: 'python', title: 'Priority dispatcher with dedup, retries and backoff (runnable)', run: true, code: `import heapq

PRIORITY = {"critical": 0, "high": 1, "normal": 2, "low": 3}   # smaller number = served first

class Dispatcher:
    def __init__(self, provider):
        self.ready = []        # heap of (priority, seq, id): messages that can be sent now
        self.delayed = []      # heap of (retry_time, priority, seq, id): waiting for backoff
        self.seen = set()      # dedup keys already accepted (a Redis SET with TTL in real life)
        self.attempts = {}     # id -> number of tries so far
        self.dead = []         # dead-letter list
        self.seq = 0           # tie-breaker: keeps FIFO order inside one priority level
        self.provider = provider

    def submit(self, nid, priority, dedup_key):
        if dedup_key in self.seen:
            print(f"  drop duplicate {nid} (dedup_key={dedup_key})")
            return
        self.seen.add(dedup_key)
        self.seq += 1
        heapq.heappush(self.ready, (PRIORITY[priority], self.seq, nid))

    def run(self, max_attempts=3):
        t = 0
        while self.ready or self.delayed:
            while self.delayed and self.delayed[0][0] <= t:       # backoff finished -> try again
                _, pr, sq, nid = heapq.heappop(self.delayed)
                heapq.heappush(self.ready, (pr, sq, nid))
            if self.ready:
                pr, sq, nid = heapq.heappop(self.ready)           # always the most urgent one
                n = self.attempts[nid] = self.attempts.get(nid, 0) + 1
                if self.provider(nid, n):
                    print(f"t={t} sent    {nid} (attempt {n})")
                elif n >= max_attempts:
                    self.dead.append(nid)
                    print(f"t={t} DEAD    {nid} after {n} attempts -> dead-letter queue")
                else:
                    wait = 2 ** n                                  # exponential backoff: 2s, 4s, ...
                    heapq.heappush(self.delayed, (t + wait, pr, sq, nid))
                    print(f"t={t} failed  {nid} (attempt {n}) -> retry in {wait}s")
            t += 1

def flaky_provider(nid, attempt):
    if nid == "sms-otp-7":   return attempt >= 2     # fails once, then works
    if nid == "email-promo-3": return False          # never works (bad address)
    return True

d = Dispatcher(flaky_provider)
d.submit("email-promo-1", "low", "promo:1")
d.submit("email-promo-2", "low", "promo:2")
d.submit("email-promo-3", "low", "promo:3")
d.submit("sms-otp-7", "critical", "otp:7")        # arrives AFTER the promos...
d.submit("push-order-5", "normal", "order:5")
d.submit("push-order-5-again", "normal", "order:5")   # same dedup key -> dropped
d.run()
print("dead letters:", d.dead)` },
      `import java.util.*;

public class BackoffDemo {
    /** Full jitter: wait a random time in [0, min(cap, base * 2^attempt)]. */
    static long delayMillis(int attempt, long baseMs, long capMs, Random rnd) {
        long ceiling = Math.min(capMs, baseMs * (1L << attempt)); // 1s, 2s, 4s, 8s ... up to the cap
        return (long) (rnd.nextDouble() * ceiling);              // random so clients do not retry in lockstep
    }

    public static void main(String[] args) {
        Random rnd = new Random(42);                              // fixed seed -> repeatable demo
        for (int attempt = 0; attempt < 6; attempt++) {
            long ceiling = Math.min(60_000L, 1000L * (1L << attempt));
            System.out.println("attempt " + attempt + ": ceiling " + ceiling + " ms, chosen "
                + delayMillis(attempt, 1000, 60_000, rnd) + " ms");
        }
    }
}`
    ],
    codeTitle: ['Priority dispatcher with dedup, retries and backoff (Python)', 'Exponential backoff with full jitter (Java)'],
    viz: [
      {
        title: 'Priority queues: OTP jumps ahead of the promo flood',
        input: 'promo1:L promo2:L order:M promo3:L chat:M otp:H promo4:L otp2:H',
        inputLabel: 'name:priority (H, M or L), optional workers=2',
        gen: function (input) {
          var s = String(input), re = /([A-Za-z0-9_\-]+)\s*:\s*([HMLhml])/g, m, items = [];
          while ((m = re.exec(s))) items.push({ n: m[1], p: m[2].toUpperCase() });
          var wm = s.match(/workers\s*=\s*(\d)/i), W = wm ? Number(wm[1]) : 2;
          if (items.length < 2 || items.length > 10) throw new Error('Give 2 to 10 items like otp:H promo:L order:M');
          if (W < 1 || W > 4) throw new Error('workers must be 1..4');
          var Q = { H: [], M: [], L: [] }, frames = [], sent = [], arrival = [];
          function qparts(pick) {
            var parts = [];
            [['H', 'HIGH queue (OTP, security)'], ['M', 'NORMAL queue (orders, chat)'], ['L', 'LOW queue (promos)']].forEach(function (x) {
              var hl = {}; if (pick && pick[x[0]]) for (var i = 0; i < pick[x[0]]; i++) hl[i] = 'cur';
              parts.push({ type: 'queue', label: x[1], items: Q[x[0]].map(function (e) { return e.n; }), hl: hl, frontLabel: 'next out', backLabel: 'newest' });
            });
            return parts;
          }
          frames.push({ narr: 'Notifications arrive in this order: <b>' + items.map(function (e) { return e.n + '(' + e.p + ')'; }).join(', ') + '</b>. We keep <b>three separate queues</b> by priority, and <b>' + W + ' worker(s)</b> that send ' + W + ' message(s) per tick. Rule: always serve the highest non-empty queue first.', parts: qparts().concat([{ type: 'vars', vals: { workers: W, 'arriving': items.length } }]) });
          items.forEach(function (e) {
            Q[e.p].push(e); arrival.push(e.n);
            frames.push({ narr: '<b>' + e.n + '</b> arrives with priority <b>' + ({ H: 'HIGH', M: 'NORMAL', L: 'LOW' })[e.p] + '</b> and is appended to the back of the ' + ({ H: 'HIGH', M: 'NORMAL', L: 'LOW' })[e.p] + ' queue. Arrival order is not the same as sending order — that is the point.', parts: qparts() });
          });
          var tick = 0;
          while (Q.H.length + Q.M.length + Q.L.length > 0) {
            tick++;
            var pick = { H: 0, M: 0, L: 0 }, picked = [], left = W, order = ['H', 'M', 'L'];
            order.forEach(function (k) { var take = Math.min(left, Q[k].length); pick[k] = take; left -= take; });
            order.forEach(function (k) { for (var i = 0; i < pick[k]; i++) picked.push(Q[k][i].n); });
            var why = pick.H ? 'HIGH is not empty, so it goes first' : (pick.M ? 'HIGH is empty, so we take from NORMAL' : 'only LOW is left, so promos finally go out');
            frames.push({ narr: '<b>Tick ' + tick + ':</b> workers pick <b>' + picked.join(', ') + '</b> (highlighted). ' + why + '. Lower queues wait, even though some of those items arrived earlier.', parts: qparts(pick).concat([{ type: 'queue', label: 'Sent so far (oldest first)', items: sent.slice(), frontLabel: 'first', backLabel: 'latest' }]) });
            order.forEach(function (k) { for (var i = 0; i < pick[k]; i++) sent.push(Q[k].shift().n); });
          }
          frames.push({ narr: 'All sent. Compare the two orders: arrival was <b>' + arrival.join(' → ') + '</b>, sending was <b>' + sent.join(' → ') + '</b>. The OTPs went out first even though they arrived late. Caveat: with strict priority, a never-ending stream of HIGH could starve LOW — production systems add <b>aging</b> or a weighted share (for example 8 : 3 : 1) and give each priority its own worker pool.', parts: [{ type: 'queue', label: 'Final sending order', items: sent.slice(), frontLabel: 'first', backLabel: 'last' }, { type: 'text', html: '<b>Rule of thumb:</b> separate queues + separate workers for critical traffic; shared pool with weights for the rest.' }] });
          return frames;
        }
      },
      {
        title: 'Notification pipeline: single event, campaign fan-out, provider failure',
        input: 'single',
        inputLabel: 'Scenario: single, campaign or failure',
        gen: function (input) {
          var sc = String(input).trim().toLowerCase();
          if (sc !== 'single' && sc !== 'campaign' && sc !== 'failure') throw new Error('Type one word: single, campaign or failure');
          var nodes = [box('SRC', 'Order Service', 7, 30, 14), box('API', 'Notification API', 25, 30, 16), box('DD', 'Dedup Store', 25, 56, 14), box('BUS', 'Message Bus', 43, 30, 14), box('WK', 'Router Workers', 60, 30, 15), box('PREF', 'Prefs + Templates', 60, 56, 17), box('DLQ', 'Retry / DLQ', 60, 4, 14), box('PUSH', 'Push Sender', 87, 8, 14), box('EM', 'Email Sender', 87, 30, 14), box('SMS', 'SMS Sender', 87, 52, 14)];
          var edges = [['SRC', 'API'], ['API', 'DD'], ['API', 'BUS'], ['BUS', 'WK'], ['WK', 'PREF'], ['WK', 'PUSH'], ['WK', 'EM'], ['WK', 'SMS'], ['PUSH', 'DLQ'], ['DLQ', 'WK']];
          var steps;
          if (sc === 'single') {
            steps = [
              ['<b>The map.</b> One event: "order A991 shipped". Follow it left to right. Everything after the API is <b>asynchronous</b>, so the order service never waits for email servers.', {}, {}, {}],
              ['The Order Service calls <code>POST /v1/notifications</code> with <code>dedup_key = order_shipped:A991</code>.', { 'SRC-API': 'cur' }, { SRC: 'cur', API: 'cur' }, {}],
              ['The API checks the <b>dedup store</b> (a Redis SET with a 24 h TTL). Key not seen → remember it. If the service retries the same call, the second one is silently dropped — this is how we get "no visible duplicates" on top of at-least-once delivery.', { 'API-DD': 'ok' }, { DD: 'ok' }, { DD: 'new key' }],
              ['The API writes the event to the <b>message bus</b> (topic <code>notify.normal</code>) and answers <b>202 Accepted</b> immediately. If the bus has it, it will be processed — even if workers are down right now.', { 'API-BUS': 'ok' }, { BUS: 'ok', SRC: 'ok' }, { BUS: 'queued', SRC: '202' }],
              ['A router worker picks it up and loads the user\'s <b>preferences</b> and the right <b>template + language</b>. Result: user u42 allows push and email for "order updates", quiet hours are off, locale is Hindi.', { 'BUS-WK': 'cur', 'WK-PREF': 'ok' }, { WK: 'cur', PREF: 'ok' }, { PREF: 'u42 prefs' }],
              ['The worker renders the message and drops it on the <b>push</b> and <b>email</b> sender queues (not SMS — the user did not opt in, and SMS costs money).', { 'WK-PUSH': 'ok', 'WK-EM': 'ok' }, { PUSH: 'ok', EM: 'ok', SMS: 'done' }, { PUSH: 'send', EM: 'send', SMS: 'skipped' }],
              ['Senders call the providers (FCM/APNs, SES). Providers reply later with webhooks (<i>delivered</i>, <i>bounced</i>); those update the notification status to <code>delivered</code>.', {}, { PUSH: 'sel', EM: 'sel' }, { PUSH: 'delivered', EM: 'delivered' }]
            ];
          } else if (sc === 'campaign') {
            steps = [
              ['<b>The map.</b> A marketing campaign for 10 million users. Dangerous: if we push all 10M messages at once, they would crush workers and block urgent messages.', {}, {}, {}],
              ['Marketing calls <code>POST /v1/campaigns {audience, template, priority: "low", rate_per_sec: 5000}</code>. The API stores the campaign and does <b>not</b> expand the audience inline.', { 'SRC-API': 'cur' }, { SRC: 'cur', API: 'cur' }, { SRC: 'Marketing' }],
              ['A campaign job splits the audience into <b>chunks of 10,000 user ids</b> (1,000 chunks) and publishes chunk messages to the <b>low-priority</b> topic — a tiny number of messages, not 10M.', { 'API-BUS': 'ok' }, { BUS: 'ok' }, { BUS: '1000 chunks' }],
              ['Workers pull chunks at the configured pace (5,000 notifications/sec, ramping up gradually). Each worker expands a chunk, loads preferences in <b>bulk</b> and suppresses opted-out users, users over their daily cap, and users in quiet hours.', { 'BUS-WK': 'cur', 'WK-PREF': 'ok' }, { WK: 'cur', PREF: 'ok' }, { WK: '~30% suppressed' }],
              ['Rendered messages go to the sender queues. Senders are <b>throttled to provider limits</b> (batching 500 FCM messages per call, SES sending rate). The low-priority workers are a separate pool, so OTP traffic keeps its own workers and sub-second latency.', { 'WK-PUSH': 'ok', 'WK-EM': 'ok', 'WK-SMS': 'bad' }, { PUSH: 'ok', EM: 'ok', SMS: 'done' }, { PUSH: '5K/s', EM: '2K/s', SMS: 'not used' }],
              ['Progress is tracked per chunk (queued → done). If something goes wrong (bad template, angry users) marketing can <b>pause</b> the campaign: workers check a flag between chunks. Total time: ~35 minutes at 5K/s, by design.', {}, { BUS: 'sel' }, { BUS: 'pausable' }]
            ];
          } else {
            steps = [
              ['<b>The map.</b> The push provider starts returning errors. A reliable system expects this and plans for it.', {}, {}, {}],
              ['A router worker hands a message to the Push Sender, which calls the provider.', { 'WK-PUSH': 'cur' }, { WK: 'cur', PUSH: 'cur' }, {}],
              ['The provider answers <span class="c-r">503 Service Unavailable</span>. This is a <b>transient</b> error (worth retrying). Compare: "token invalid / app uninstalled" is <b>permanent</b> — delete the device token, never retry.', { 'WK-PUSH': 'bad' }, { PUSH: 'bad' }, { PUSH: '503' }],
              ['The message goes to the <b>retry queue</b> with a delay: attempt 1 → ~2 s, attempt 2 → ~4 s, attempt 3 → ~8 s, each with random <b>jitter</b> so thousands of failed messages do not all return at the same instant and re-crush the provider.', { 'PUSH-DLQ': 'cur' }, { DLQ: 'cur' }, { DLQ: 'retry in 2s' }],
              ['After the delay the message re-enters the normal flow. Meanwhile a <b>circuit breaker</b> on the push sender opens after repeated failures so we stop hammering a sick provider and keep the queues from exploding.', { 'DLQ-WK': 'ok' }, { WK: 'ok' }, { WK: 'retry' }],
              ['If it still fails after N attempts: for important messages <b>fall back</b> to another channel (push failed → send email) or another provider (SES → SendGrid); otherwise move to the <b>dead-letter queue</b> for inspection and replay. Status becomes <code>failed</code>, never silently lost.', { 'PUSH-DLQ': 'bad' }, { DLQ: 'bad', EM: 'ok' }, { DLQ: 'DLQ', EM: 'fallback' }]
            ];
          }
          return flowFrames(nodes, edges, steps, 62, 'Notification system architecture');
        }
      }
    ],
    examples: [
      {
        title: 'Worked example: why OTP latency collapses without separate queues', html: `<p>One shared queue. At 10:00 a campaign adds <b>10,000,000</b> promos. Workers send 20,000/s. An OTP arrives at 10:00:01 and joins the <i>back</i> of the line: it waits for the remaining ~9.9M messages = <b>~8 minutes</b>. The user abandons login.</p>
${H.table(['Design', 'OTP wait', 'Cost'], [['One FIFO queue', '<span class="c-r">≈ 8 minutes</span>', 'Cheapest'], ['One queue sorted by priority', 'Seconds, but promos still share the worker pool and storage', 'Complex; priority inversions'], ['<b>Separate topics + dedicated worker pools</b>', '<span class="c-g">&lt; 1 second</span>', 'More pools to size (worth it)']])}
<p>The lesson generalises: <b>isolate critical traffic physically</b> — different queues, workers, even different providers/sender IDs — not just logically.</p>`
      },
      {
        title: 'At-least-once + idempotency = "effectively once"', html: `<p>Workers can crash <i>after</i> calling the provider but <i>before</i> acknowledging the queue message. The message is redelivered and the user gets two pushes. We cannot get true exactly-once across a network, so we make duplicates harmless:</p>
<ol><li>Every notification has a <b>dedup key</b> (<code>order_shipped:A991:push</code>).</li><li>Before sending, <code>SET key NX EX 86400</code> in Redis. If it returns "already exists" → skip.</li><li>Pass the notification id as the provider's idempotency/collapse key (FCM <code>collapse_key</code>, APNs <code>apns-collapse-id</code>, SES message id) so even a double call shows once on the device.</li></ol>
<p>Order matters: claim the key <i>before</i> sending means a crash between claim and send loses one notification (at-most-once); claim <i>after</i> means a rare duplicate (at-least-once). For most notifications choose at-least-once; for "money moved" choose reliability over duplicates and say so.</p>`
      },
      {
        title: 'Respecting people: preferences, quiet hours, frequency caps', html: `${H.table(['Rule', 'Example', 'Where enforced'], [['Opt-out per channel / category', 'No marketing SMS ever', 'Router worker, from cached preferences'], ['Quiet hours with time zone', 'No promos 22:00-08:00 local', 'Router → delayed queue until 08:00 local'], ['Frequency cap', 'Max 3 promos/day, 1 push/10 min per type', 'Per-user counter (rate limiter from topic 3!)'], ['Legal', 'Unsubscribe link in every email; honour STOP in SMS; GDPR consent', 'Template + suppression list checked at send time'], ['Critical exemption', 'OTP, fraud alert ignore quiet hours and caps', 'Priority class = critical']])}
<p>Delayed delivery is done with a <b>scheduler</b>: a queue ordered by <code>send_at</code> (Redis sorted set, DB index, or a timing wheel) polled every second, which pushes due items to the normal path.</p>`
      }
    ],
    deepDive: `<h4>Fan-out strategies</h4>
<p>"Notify all followers of a celebrity" is fan-out. Two designs: <b>fan-out on write</b> (expand the audience immediately into per-user queue entries; fast reads, huge write burst) and <b>fan-out on read</b> (store one event, expand when the user opens the app). Notifications are time-sensitive and pushed, so they are usually fan-out on write — but in <b>chunks</b> (messages carry ranges of users) so the bus holds thousands of chunk messages instead of millions of items.</p>
<h4>Delivery guarantees and ordering</h4>
<p>Bus: Kafka with replication 3. Consumers commit offsets after the downstream write succeeds (at-least-once). Ordering matters rarely ("shipped" must not arrive after "delivered") — partition by <code>user_id</code> so one user's events stay ordered; do not demand global order.</p>
<h4>Provider reality</h4>
<ul><li>APNs/FCM accept HTTP/2 batches; throttle per connection; tokens expire — handle <code>Unregistered</code> by deleting the token.</li><li>Email: warm up IPs, authenticate with SPF/DKIM/DMARC, separate transactional vs marketing sending domains so a spam complaint on promos does not land your receipts in spam.</li><li>SMS: costly, carrier filtering, per-country sender rules, registration (10DLC in the US).</li><li>Keep a <b>second provider per channel</b> behind a small adapter interface; fail over automatically.</li></ul>
<h4>Retries, backoff, DLQ</h4>
<p>Exponential backoff with full jitter (<code>sleep = random(0, min(cap, base·2<sup>n</sup>))</code>) beats fixed delays. Cap total retry time by message value: OTP is useless after 60 s (don't retry forever — expire it), a receipt can retry for hours. DLQ entries are stored with the error and are replayable after a fix.</p>
<h4>Back-pressure</h4>
<p>If the SMS provider slows down, the SMS queue grows. Autoscale senders only up to the provider's limit; beyond that, <b>shed low-priority load first</b> (drop or delay promos), and alert on queue age (not just queue size). Queue <i>age</i> of the oldest message is the best health metric.</p>
<h4>Status tracking</h4>
<p>States: <code>accepted → queued → sent → delivered → opened</code> or <code>failed / suppressed</code>. Providers send webhooks; ingest them into the same bus. Store the log in a write-optimised partitioned store; analytics (open rate, bounce rate) are computed offline. Suppression list: hard bounces and complaints are never mailed again.</p>
<h4>Scheduling and digests</h4>
<p>Digest ("5 new comments") = hold events for a window in a per-user bucket, then emit one message. Scheduled sends use the delayed queue; "send at 9 am local" computes the UTC instant per user at schedule time and re-evaluates on time-zone changes.</p>
<h4>Trade-offs</h4>
${H.table(['Decision', 'Choice', 'Cost'], [['Sync vs async API', 'Async (202 + queue)', 'Callers do not get instant delivery status'], ['Priority', 'Separate queues + pools', 'More infra, much better isolation'], ['Delivery semantics', 'At-least-once + dedup key', 'Rare duplicates if dedup store loses data'], ['Per-channel senders', 'Independent services', 'More deploys; independent scaling and failure domains']])}`,
    aiEra: `<p><b>What AI changes:</b> notification <i>content and timing</i> are becoming AI-driven: an LLM writes or personalises subject lines and push text, a model predicts the <b>best send time per user</b> and whether a notification is worth sending at all ("notification fatigue" scoring), and an AI summary can collapse 40 chat pings into one digest. Mobile OSes now summarise notifications with on-device AI, which changes how the first line should be written. Agents also <i>produce</i> notifications ("your agent finished the task") at high volume, making per-user frequency caps and digests more important.</p>
<p><b>Use AI as a partner:</b> ask <code>List failure scenarios for each box in this notification pipeline and what the user sees</code>; generate localised templates and then have a native speaker check them; use it to build a replay tool for the DLQ.</p>
<p><b>Where AI goes wrong:</b> LLM-generated copy can hallucinate offers or leak personal data into a push preview; AI-suggested designs often forget dedup, preference checks and quiet hours — and happily call SMS providers in a loop. Never let an unreviewed model decide <i>who</i> gets a legally sensitive message (consent, unsubscribe).</p>
<p><b>What you must still own:</b> the priority isolation, delivery semantics, the compliance rules, and the guardrails around any AI-generated content.</p>`,
    problems: [{
      title: 'Keep OTP delivery under 2 seconds during a 10M-user campaign', level: 'Hard', tags: ['notifications', 'priority', 'queues', 'isolation'], companies: ['Uber', 'Twilio', 'Swiggy'],
      statement: `<p>Your notification system sends OTPs (critical), order updates (normal) and marketing blasts (low). During the last campaign, OTP delivery time rose from 800 ms to 6 minutes and sign-ups dropped. Redesign so critical messages are always delivered in under 2 s (p99), even while a 10M-user campaign runs, and explain how you protect the SMS provider budget and avoid duplicates.</p>`,
      constraints: `Campaign: 10M users in ~30 min. OTP peak: 3,000/s. Providers: SMS provider allows 5,000 msgs/s total; push provider 20,000/s. Cost matters: SMS costs about 100× a push.`,
      example: `${H.table(['Before', 'After'], [['One queue, 8 workers', 'Three topics, dedicated pools: critical 4 workers, normal 8, low 16 (autoscaled)'], ['OTP waits behind promos: 6 min', 'OTP p99 &lt; 1 s'], ['Marketing sends SMS at will', 'Marketing is push/email only; SMS needs explicit approval + budget']])}`,
      brute: { why: `<p>Single shared FIFO queue and one worker pool for all message types. A campaign enqueues 10M messages; OTPs wait behind them. Increasing workers only moves the bottleneck to provider rate limits, and a retry storm from a throttled provider makes things worse. There is no budget control, so promos can burn through the SMS quota that OTPs need.</p>` },
      mcq: { q: 'What is the most robust way to keep critical messages fast during a huge low-priority burst?', options: ['Sort one big queue by priority', 'Separate queues/topics with dedicated workers and reserved provider capacity per priority', 'Add more workers to the single pool', 'Tell marketing to send fewer messages'], answer: 1, explain: 'Isolation beats sorting: critical traffic gets its own queue, workers and reserved provider quota, so a flood in another class cannot touch its capacity.' },
      hints: [
        `<p>Hint 1: Identify what is shared and can saturate: the queue, the worker pool, and the provider rate limit. All three must be isolated per priority.</p>`,
        `<p>Hint 2: Per-priority topics and worker pools; reserve part of each provider's rate limit for critical (for example 3,000 of 5,000 SMS/s) using a token bucket per priority.</p>`,
        `<p>Hint 3: Throttle the campaign at the source (chunks, rate_per_sec), expire OTPs after 60 s instead of retrying forever, use dedup keys, and alert on oldest-message age.</p>`
      ],
      solution: {
        approach: `<p><b>Isolation.</b> Three Kafka topics (<code>critical</code>, <code>normal</code>, <code>low</code>) with separate consumer groups and worker pools. Critical workers are over-provisioned and never autoscale down below a floor; low workers autoscale on queue age but are capped by provider quota. A campaign cannot enqueue to <code>critical</code> — the API enforces a class per notification <i>type</i>, not per caller wish.</p>
<p><b>Provider capacity.</b> Per-provider token buckets per priority: SMS provider 5,000/s → reserve 3,000/s for critical, 1,500 normal, 500 low; unused reserved capacity may be borrowed by lower classes but returns instantly when critical needs it. Use a secondary SMS provider for failover and a separate sender ID/number pool for OTPs so marketing reputation cannot affect OTP deliverability.</p>
<p><b>Campaign shaping.</b> Campaigns are expanded in chunks at <code>rate_per_sec</code> (e.g. 6,000/s → ~28 min), ramp up gradually, pause/cancel flag checked between chunks. Marketing uses push/email; SMS marketing needs a budget approval and a separate lower cap. Suppress opted-out/over-cap users before queueing, not after.</p>
<p><b>Correctness.</b> OTP gets a short TTL (60 s) — expired messages are dropped, never retried late. Retries: 2 quick attempts with jitter, then fall back from push to SMS only for critical. Dedup key per (user, otp_request_id, channel) via Redis SET NX; providers' collapse keys avoid double display.</p>
<p><b>Observability.</b> Alert on the age of the oldest message per topic (critical &gt; 500 ms), provider error rate, retry rate and DLQ growth; run a synthetic OTP every minute to measure end-to-end latency. Load test: replay a 10M campaign on staging while measuring OTP p99.</p>`,
        complexity: `<p>Enqueue and dequeue are O(1) per message; capacity planning is by class: critical needs peak 3,000/s with 3× headroom; low is bounded by the shaper and provider quota.</p>`,
        followUps: ['How would you detect and handle a regional SMS provider outage for OTPs?', 'What if two OTP requests for the same user arrive 1 s apart?', 'How do you test the isolation continuously, not only once?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — DISTRIBUTED KEY-VALUE STORE
     ===================================================================== */
  topics.push({
    title: 'Design a Distributed Key-Value Store (Dynamo-style)',
    analogy: `<p>Think of a <b>chain of libraries</b> that each keep copies of the same popular books. A librarian in the head office does not know every shelf; she just knows a rule: "book titled X lives in libraries 3, 4 and 5". To <b>borrow-return a new edition</b> (a write) she calls all three and is happy once <b>2 of 3</b> confirm. To <b>look something up</b> (a read) she asks 2 of the 3 and trusts whichever has the newest edition. Because any 2 libraries out of 3 must share at least one, she is guaranteed to meet the newest edition — even if one library is closed for a holiday. That "ask a majority" rule is a <b>quorum</b>, and it is the heart of this design.</p>`,
    explain: `<p>A <b>key-value store</b> is the simplest database: <code>put(key, value)</code> and <code>get(key)</code>. A <b>distributed</b> one spreads billions of keys over many machines so it keeps working when machines die. Amazon Dynamo, Cassandra, Riak and DynamoDB follow the same blueprint, and "design a distributed key-value store" tests whether you understand partitioning, replication, consistency and failure.</p>
<h4>1. Requirements</h4>
${H.table(['Type', 'Requirement'], [
  ['Functional', '<code>put(key, value)</code>, <code>get(key)</code>, <code>delete(key)</code>; values up to ~1 MB (typically 1 KB)'],
  ['Functional', '<b>Tunable consistency</b> per request: fast-and-maybe-stale vs slower-and-fresh'],
  ['Non-functional', 'Highly available writes: accept writes even when some nodes are down (<b>AP</b> leaning)'],
  ['Non-functional', 'Scales horizontally: add nodes, data and load rebalance automatically; no single point of failure'],
  ['Non-functional', 'Low latency: p99 &lt; 10 ms; durable; survives a node, rack, even a zone failure'],
  ['Out of scope', 'Joins, secondary indexes, multi-key transactions (mention as extensions)']])}
<h4>2. Estimates</h4>
${H.table(['Quantity', 'Math', 'Result'], [
  ['Data', '1B keys × 1 KB', '1 TB logical → <b>3 TB</b> with 3 replicas'],
  ['Traffic', '200K ops/s peak: 70% reads, 30% writes', '140K reads/s, 60K writes/s'],
  ['Replica work', 'reads touch R=2 replicas, writes touch N=3', '140K×2 + 60K×3 = <b>≈ 460K replica-ops/s</b>'],
  ['Nodes', 'one SSD node ≈ 20K ops/s, run at 50% → 10K', '≈ <b>46 → plan ~50 nodes</b>'],
  ['Disk per node', '3 TB ÷ 50 nodes', '≈ 60 GB — tiny, so <b>QPS, not storage, decides the cluster size</b>']])}
<h4>3. API</h4>
<pre>put(key, value, consistency = QUORUM, context?) -> ok | error
get(key, consistency = QUORUM)                  -> value(s) + context (version info)
delete(key)                                     -> writes a TOMBSTONE (a marker), cleaned up later

consistency levels:  ONE (fastest, may be stale) | QUORUM (R=W=majority) | ALL (slowest, most consistent)</pre>
<h4>4. The big ideas (each solves one problem)</h4>
${H.table(['Problem', 'Idea', 'Detail'], [
  ['Too much data for one machine', '<b>Partitioning</b> with consistent hashing', 'Keys and nodes are hashed onto a ring; a key belongs to the next node clockwise. Virtual nodes (vnodes) smooth load; adding a node moves only ~1/N of the data'],
  ['A machine will die', '<b>Replication</b> factor N = 3', 'Store each key on the next N <i>distinct</i> nodes on the ring (the preference list), ideally in different racks/zones'],
  ['Which copy is right?', '<b>Quorums</b>: write to W, read from R, choose R + W &gt; N', 'The read set and write set overlap in at least one node holding the newest value'],
  ['Node temporarily down', '<b>Sloppy quorum + hinted handoff</b>', 'Another node takes the write with a "hint" and hands it to the real owner when it returns'],
  ['Replicas drift apart', '<b>Read repair</b> + <b>anti-entropy</b> (Merkle trees)', 'Fix stale copies when a read spots them; compare hash trees in the background to find differences cheaply'],
  ['Concurrent writes', '<b>Versioning</b>: vector clocks or last-write-wins', 'Detect conflicts and either merge (siblings) or pick the newest timestamp'],
  ['Who is alive?', '<b>Gossip</b> membership + failure detection', 'Nodes chat with random peers; no central master to fail'],
  ['Fast local storage', '<b>LSM tree</b> engine', 'WAL + memtable + immutable sorted files (SSTables) + compaction + Bloom filters']])}
<h4>5. Architecture in one paragraph</h4>
<p>Any node can be the <b>coordinator</b> for a request (clients connect to any, or use a smart client that knows the ring). The coordinator hashes the key, finds the N replicas, sends the write to all of them in parallel and returns success once <b>W</b> acknowledge; for a read it asks the replicas and waits for <b>R</b> answers, returns the one with the newest version and quietly repairs stale replicas. Press play on the quorum visualizer, then try the settings from the table below.</p>
<h4>6. Tuning consistency with N, R, W</h4>
${H.table(['N, R, W', 'R + W &gt; N?', 'Behaviour', 'Use for'], [
  ['3, 2, 2 (QUORUM)', '<span class="c-g">Yes (4 &gt; 3)</span>', 'Fresh reads, tolerates 1 node down for both reads and writes', 'Default; user profiles, carts'],
  ['3, 1, 3', '<span class="c-g">Yes</span>', 'Very fast reads; writes need ALL nodes up (one failure blocks writes)', 'Read-heavy config data'],
  ['3, 3, 1', '<span class="c-g">Yes</span>', 'Very fast, always-available writes; reads need ALL nodes', 'Write-heavy logs, then read rarely'],
  ['3, 1, 1', '<span class="c-r">No (2 &lt; 3)</span>', 'Fastest, always available, <b>may read stale data</b>', 'Counters of likes, caches, sessions where staleness is OK']])}`,
    clues: [
      '"Design a key-value store / Dynamo / Cassandra / distributed cache with persistence"',
      '"Highly available, always writable, even during network partitions" → AP, sloppy quorum, hinted handoff',
      '"Tunable consistency" → N, R, W with R + W &gt; N for overlap; ONE / QUORUM / ALL levels',
      '"Scale to petabytes by adding nodes" → consistent hashing with virtual nodes, minimal data movement',
      '"Two clients write the same key at the same time" → vector clocks / siblings, or LWW with timestamp',
      '"How do you detect a failed node without a master?" → gossip + phi-accrual failure detector',
      '"Replicas drift apart" → read repair + Merkle-tree anti-entropy',
      '"Fast writes on disk" → LSM tree: WAL, memtable, SSTables, compaction, Bloom filter'
    ],
    code: [
      { lang: 'python', title: 'Mini Dynamo: consistent-hash ring + quorum read/write (runnable)', run: true, code: `import bisect
import hashlib

def h(s):
    """Hash a string to a position on the 32-bit ring (md5 is fine here: we need spread, not security)."""
    return int(hashlib.md5(s.encode()).hexdigest(), 16) % (2 ** 32)

class Ring:
    def __init__(self, nodes, vnodes=50):
        # each physical node appears many times on the ring (virtual nodes) -> smoother load
        self.points = sorted((h(f"{n}#{i}"), n) for n in nodes for i in range(vnodes))
        self.keys = [p for p, _ in self.points]

    def preference_list(self, key, n):
        """Walk clockwise from hash(key); collect the first n DISTINCT physical nodes."""
        i = bisect.bisect(self.keys, h(key)) % len(self.points)
        out = []
        while len(out) < n:
            node = self.points[i % len(self.points)][1]
            if node not in out:
                out.append(node)
            i += 1
        return out

class Cluster:
    def __init__(self, nodes, n=3):
        self.ring, self.n = Ring(nodes), n
        self.data = {node: {} for node in nodes}      # node -> {key: (version, value)}
        self.version = {}                             # stand-in for vector clock / timestamp

    def put(self, key, value, w, down=()):
        self.version[key] = self.version.get(key, 0) + 1
        acks = 0
        for node in self.ring.preference_list(key, self.n):
            if node not in down:                      # a down node simply never answers
                self.data[node][key] = (self.version[key], value)
                acks += 1
        return acks >= w                              # success only if W replicas acknowledged

    def get(self, key, r):
        pref = self.ring.preference_list(key, self.n)
        # worst case for us: the coordinator happens to ask the stalest replicas first
        pref.sort(key=lambda nd: self.data[nd].get(key, (0, None))[0])
        asked = pref[:r]
        answers = [self.data[nd].get(key, (0, None)) for nd in asked]
        best = max(answers)                           # highest version wins
        for nd in asked:                              # read repair: fix stale replicas we touched
            self.data[nd][key] = best
        return best[1], asked

for label, w, r in [("W=1,R=1 (R+W=2 <= N)", 1, 1), ("W=2,R=2 (R+W=4 > N)", 2, 2)]:
    c = Cluster(["n1", "n2", "n3", "n4", "n5"], n=3)
    pref = c.ring.preference_list("cart:42", 3)
    c.put("cart:42", "[book]", w=3)                   # everyone has version 1
    ok = c.put("cart:42", "[book, pen]", w=w, down={pref[2]})   # third replica is down: misses v2
    value, asked = c.get("cart:42", r)                # it comes back, still stale
    print(f"{label}: replicas={pref} write_ok={ok} read_from={asked} -> {value}")` },
      `import java.util.BitSet;

/** Tiny Bloom filter: answers "definitely not here" or "maybe here". LSM stores use one per SSTable. */
public class Bloom {
    private final BitSet bits;
    private final int m;   // number of bits
    private final int k;   // number of hash functions

    public Bloom(int m, int k) { this.bits = new BitSet(m); this.m = m; this.k = k; }

    // Double hashing: derive k positions from two base hashes (cheap and good enough).
    private int pos(String key, int i) {
        int h1 = key.hashCode();
        int h2 = (h1 >>> 16) | 1;                       // force odd so positions differ
        return Math.floorMod(h1 + i * h2, m);
    }

    public void add(String key) {
        for (int i = 0; i < k; i++) bits.set(pos(key, i));
    }

    public boolean mightContain(String key) {
        for (int i = 0; i < k; i++) if (!bits.get(pos(key, i))) return false; // any 0 bit => definitely absent
        return true;                                                          // all 1 bits => probably present
    }

    public static void main(String[] args) {
        Bloom b = new Bloom(10_000, 4);                 // 10 bits per key for 1,000 keys
        for (int i = 0; i < 1000; i++) b.add("user:" + i);
        int falseHits = 0;
        for (int i = 1000; i < 11000; i++) if (b.mightContain("user:" + i)) falseHits++;
        System.out.println("present key found: " + b.mightContain("user:7"));
        System.out.println("false positives: " + falseHits + " / 10000");
    }
}`
    ],
    codeTitle: ['Mini Dynamo: ring + quorum (Python)', 'Bloom filter used by SSTables (Java)'],
    viz: [
      {
        title: 'Quorum write and read (N, W, R) with a failed replica',
        input: 'N=3 W=2 R=2 down=C',
        inputLabel: 'N, W, R and which replicas are down (letters)',
        gen: function (input) {
          var s = String(input);
          var nm = s.match(/N\s*=\s*(\d)/i), wm = s.match(/W\s*=\s*(\d)/i), rm = s.match(/R\s*=\s*(\d)/i), dm = s.match(/down\s*=\s*([A-Ea-e,]*)/i);
          if (!nm || !wm || !rm) throw new Error('Format: N=3 W=2 R=2 down=C  (down is optional, letters A-E)');
          var N = Number(nm[1]), W = Number(wm[1]), R = Number(rm[1]);
          if (N < 1 || N > 5) throw new Error('N must be 1..5');
          if (W < 1 || W > N || R < 1 || R > N) throw new Error('W and R must be between 1 and N');
          var names = 'ABCDE'.slice(0, N).split(''), down = {};
          (dm ? dm[1].toUpperCase().replace(/,/g, '').split('') : []).forEach(function (c) { if (names.indexOf(c) < 0) throw new Error('down letters must be among ' + names.join(',')); down[c] = true; });
          var rep = {}; names.forEach(function (c) { rep[c] = { v: 'v1', ver: 1, state: 'alive' }; });
          var nodes = [box('CL', 'Client', 6, 31, 10), box('CO', 'Coordinator', 30, 31, 15)];
          var edges = [['CL', 'CO']];
          names.forEach(function (c, i) {
            var y = N === 1 ? 31 : 5 + i * (52 / (N - 1));
            nodes.push(box(c, 'Replica ' + c, 76, y, 15));
            edges.push(['CO', c]);
          });
          function rows() { return names.map(function (c) { return [c, rep[c].v, rep[c].ver, down[c] ? 'DOWN' : rep[c].state]; }); }
          function tbl(hl) { return { type: 'table', label: 'What each replica stores for key "cart"', columns: ['Replica', 'Value', 'Version', 'State'], rows: rows(), hl: hl || {} }; }
          function gp(ehl, hl, tags) { return gpart(nodes, edges, ehl, hl, tags, 'Quorum flow (N=' + N + ', W=' + W + ', R=' + R + ')', 62); }
          var overlap = R + W > N, frames = [], c0;
          var downList = names.filter(function (c) { return down[c]; });
          frames.push({ narr: 'Setup: <b>N = ' + N + '</b> copies of the key, a write needs <b>W = ' + W + '</b> acknowledgements, a read asks <b>R = ' + R + '</b> replicas. <b>R + W = ' + (R + W) + '</b> vs N = ' + N + ': ' + (overlap ? '<span class="c-g">R + W &gt; N, so every read set overlaps every successful write set — a fresh copy is always found.</span>' : '<span class="c-r">R + W ≤ N, so a read can miss the newest write (stale read possible).</span>') + (downList.length ? ' Replica(s) <b>' + downList.join(', ') + '</b> are down.' : ' All replicas are healthy.') + ' All start with value v1, version 1.', parts: [gp({}, {}, {}), tbl()] });
          frames.push({ narr: 'The client sends <code>put(cart, v2)</code> to any node, which becomes the <b>coordinator</b> for this request.', parts: [gp({ 'CL-CO': 'cur' }, { CL: 'cur', CO: 'cur' }, {}), tbl()] });
          var e1 = {}; names.forEach(function (c) { e1['CO-' + c] = 'cur'; });
          frames.push({ narr: 'The coordinator hashes the key and finds its ' + N + ' replicas (the preference list). It sends the write to <b>all ' + N + ' in parallel</b> — not just W of them — and waits for W answers.', parts: [gp(e1, { CO: 'cur' }, {}), tbl()] });
          var e2 = {}, h2 = { CO: 'cur' }, t2 = {}, acks = 0;
          names.forEach(function (c) {
            if (down[c]) { e2['CO-' + c] = 'bad'; h2[c] = 'bad'; t2[c] = 'no reply'; }
            else { e2['CO-' + c] = 'ok'; h2[c] = 'ok'; t2[c] = 'ack v2'; acks++; rep[c] = { v: 'v2', ver: 2, state: 'fresh' }; }
          });
          frames.push({ narr: 'Healthy replicas store <b>v2</b> (version 2) and send an ack. Down replicas never answer. Acks received: <b>' + acks + '</b>.', parts: [gp(e2, h2, t2), tbl((function () { var h = {}; names.forEach(function (c, i) { h[i] = down[c] ? 'bad' : 'ok'; }); return h; })())] });
          var writeOk = acks >= W;
          frames.push({ narr: writeOk ? '<span class="c-g">' + acks + ' ≥ W (' + W + '): the write SUCCEEDS.</span> The coordinator tells the client "OK" as soon as W acks arrive; it does not wait for slow or dead replicas.' + (downList.length ? ' For the down replica(s) the cluster keeps a <b>hint</b> (hinted handoff) and delivers it when they return.' : '') : '<span class="c-r">' + acks + ' &lt; W (' + W + '): the write FAILS</span> with "not enough replicas". That is the price of a strict W: consistency over availability. (Replicas that did store v2 keep it; the client should retry.)', parts: [gp({ 'CL-CO': writeOk ? 'ok' : 'bad' }, { CL: writeOk ? 'ok' : 'bad', CO: writeOk ? 'ok' : 'bad' }, { CL: writeOk ? 'put OK' : 'put FAILED' }), tbl()] });
          if (downList.length) {
            downList.forEach(function (c) { rep[c].state = 'back, STALE'; down[c] = false; });
            frames.push({ narr: 'Later, replica(s) <b>' + downList.join(', ') + '</b> come back online — but they still hold the <b>old value v1</b>. Until hints, read repair or anti-entropy fix them, they are stale. This is exactly what a read must cope with.', parts: [gp({}, (function () { var h = {}; downList.forEach(function (c) { h[c] = 'cur'; }); return h; })(), (function () { var t = {}; downList.forEach(function (c) { t[c] = 'stale v1'; }); return t; })()), tbl((function () { var h = {}; names.forEach(function (c, i) { if (rep[c].state !== 'fresh') h[i] = 'cur'; }); return h; })())] });
          }
          var order = names.slice().sort(function (a, b) { return rep[a].ver - rep[b].ver; }), asked = order.slice(0, R);
          frames.push({ narr: 'Now <code>get(cart)</code>. The coordinator asks <b>R = ' + R + '</b> replicas. To be fair to the worst case we let it pick the stalest ones first: <b>' + asked.join(', ') + '</b>.', parts: [gp((function () { var e = { 'CL-CO': 'cur' }; asked.forEach(function (c) { e['CO-' + c] = 'cur'; }); return e; })(), (function () { var h = { CO: 'cur' }; asked.forEach(function (c) { h[c] = 'cur'; }); return h; })(), {}), tbl((function () { var h = {}; names.forEach(function (c, i) { if (asked.indexOf(c) >= 0) h[i] = 'cur'; }); return h; })())] });
          var best = 0, bestV = 'v1'; asked.forEach(function (c) { if (rep[c].ver > best) { best = rep[c].ver; bestV = rep[c].v; } });
          var stale = best < 2 && writeOk;
          frames.push({ narr: 'Answers: ' + asked.map(function (c) { return c + ' → ' + rep[c].v + ' (ver ' + rep[c].ver + ')'; }).join(', ') + '. The coordinator returns the <b>highest version</b>: <b>' + bestV + '</b>. ' + (stale ? '<span class="c-r">STALE READ! All R replicas asked were behind, because R + W ≤ N allowed the read set to miss the write set.</span>' : (best === 2 ? '<span class="c-g">Fresh value found — the overlap between read set and write set guarantees at least one up-to-date replica.</span>' : 'Only v1 exists because the write did not complete.')), parts: [gp({ 'CL-CO': stale ? 'bad' : 'ok' }, { CL: stale ? 'bad' : 'ok' }, { CL: 'got ' + bestV }), tbl((function () { var h = {}; names.forEach(function (c, i) { if (asked.indexOf(c) >= 0) h[i] = rep[c].ver === best ? 'ok' : 'bad'; }); return h; })())] });
          var repaired = 0;
          asked.forEach(function (c) { if (best === 2 && rep[c].ver < 2) { rep[c] = { v: 'v2', ver: 2, state: 'repaired' }; repaired++; } });
          frames.push({ narr: repaired ? '<b>Read repair:</b> the coordinator noticed ' + repaired + ' stale replica(s) among those it asked and writes v2 to them in the background. Replicas it did not ask are fixed later by hinted handoff or <b>anti-entropy</b> (Merkle-tree comparison between nodes).' : 'Nothing to repair among the replicas we asked. Any other stale replica would be fixed by hinted handoff or <b>anti-entropy</b> (background Merkle-tree comparison).', parts: [gp({}, (function () { var h = {}; names.forEach(function (c) { h[c] = rep[c].state === 'repaired' ? 'sel' : (rep[c].ver === 2 ? 'ok' : 'cur'); }); return h; })(), {}), tbl()] });
          return frames;
        }
      },
      {
        title: 'LSM tree: the write path on one node (WAL, memtable, SSTables, compaction)',
        input: 'a=1 b=2 c=3 a=9 d=4 e=5 f=6 b=7 limit=3',
        inputLabel: 'key=value puts, and limit = memtable size',
        gen: function (input) {
          var s = String(input), re = /([a-z0-9]+)\s*=\s*([A-Za-z0-9]+)/g, m, puts = [];
          var lm = s.match(/limit\s*=\s*(\d)/i), limit = lm ? Number(lm[1]) : 3;
          s = s.replace(/limit\s*=\s*\d/i, '');
          while ((m = re.exec(s))) puts.push([m[1], m[2]]);
          if (puts.length < 2 || puts.length > 12) throw new Error('Give 2 to 12 puts like a=1 b=2 (and optional limit=3)');
          if (limit < 2 || limit > 5) throw new Error('limit must be 2..5');
          var wal = [], mem = {}, ssts = [], frames = [], sstNo = 0;
          function memKeys() { return Object.keys(mem).sort(); }
          function view(hlKey) {
            var mk = memKeys(), hl = {}; mk.forEach(function (k, i) { if (k === hlKey) hl[i] = 'ok'; });
            var parts = [{ type: 'array', label: 'WAL: append-only log on disk (crash safety)', values: wal.map(function (e) { return e[0] + '=' + e[1]; }), showIdx: true }, { type: 'array', label: 'Memtable: sorted, in RAM (limit ' + limit + ' keys)', values: mk.map(function (k) { return k + '=' + mem[k]; }), hl: hl }];
            ssts.forEach(function (t) { parts.push({ type: 'array', label: 'SSTable #' + t.no + ': immutable, sorted, on disk', values: t.rows.map(function (e) { return e[0] + '=' + e[1]; }), hl: t.rows.length ? { 0: 'win' } : {} }); });
            return parts;
          }
          frames.push({ narr: 'One storage node. Writes are made fast by <b>never updating files in place</b>: first append to a log (sequential disk write), then update a small sorted in-memory table. When the memtable is full it is written out as an immutable sorted file (SSTable). Memtable holds up to <b>' + limit + '</b> keys here.', parts: view() });
          puts.forEach(function (p) {
            wal.push(p);
            var existed = Object.prototype.hasOwnProperty.call(mem, p[0]);
            mem[p[0]] = p[1];
            frames.push({ narr: '<b>put(' + p[0] + ', ' + p[1] + ')</b>: (1) append to the WAL — if the machine crashes now we can replay it; (2) ' + (existed ? 'overwrite <b>' + p[0] + '</b> in the memtable (old value simply replaced in RAM)' : 'insert <b>' + p[0] + '</b> into the sorted memtable') + '. The client gets "OK" now — no random disk I/O happened.', parts: view(p[0]) });
            if (memKeys().length >= limit) {
              sstNo++;
              var rows = memKeys().map(function (k) { return [k, mem[k]]; });
              ssts.unshift({ no: sstNo, rows: rows });
              mem = {}; wal = [];
              frames.push({ narr: 'Memtable is full → <b>flush</b>: write its sorted contents as <b>SSTable #' + sstNo + '</b> (one big sequential write), empty the memtable and truncate the WAL (its data is now safely in the SSTable). SSTables are never modified again.', parts: view() });
              if (ssts.length >= 3) {
                var merged = {}, order = ssts.slice().reverse();
                order.forEach(function (t) { t.rows.forEach(function (e) { merged[e[0]] = e[1]; }); });
                var mrows = Object.keys(merged).sort().map(function (k) { return [k, merged[k]]; });
                var before = ssts.reduce(function (a, t) { return a + t.rows.length; }, 0);
                sstNo++; ssts = [{ no: sstNo, rows: mrows }];
                frames.push({ narr: '<b>Compaction:</b> 3 SSTables are merged (like merge-sort). When the same key appears twice the <b>newest wins</b>, so old versions disappear: ' + before + ' entries became ' + mrows.length + '. Fewer files = fewer places to look on a read. (Deletes are written as tombstones and removed here too.)', parts: view() });
              }
            }
          });
          var key = puts[0][0], found = 'not found', where = 'nowhere';
          if (Object.prototype.hasOwnProperty.call(mem, key)) { found = mem[key]; where = 'the memtable'; }
          else { for (var i = 0; i < ssts.length; i++) { var hit = ssts[i].rows.filter(function (e) { return e[0] === key; })[0]; if (hit) { found = hit[1]; where = 'SSTable #' + ssts[i].no; break; } } }
          frames.push({ narr: '<b>get(' + key + ')</b>: look in the memtable first, then SSTables from <b>newest to oldest</b>; the first hit wins (it is the latest write). Each SSTable has a <b>Bloom filter</b> ("definitely not here / maybe here") so we skip files that cannot contain the key. Result: <b>' + found + '</b> found in ' + where + '.', parts: view().concat([{ type: 'vars', vals: { key: key, value: found, 'found in': where }, hl: { value: 'ok' } }]) });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Worked example: pick N, R, W for three products', html: `${H.table(['Product', 'Need', 'Choice', 'Why'], [
          ['Shopping cart', 'Never refuse an "add to cart"; merging is OK', 'N=3, W=1 or 2, R=2; merge siblings', 'Availability beats freshness; Dynamo was built for this'],
          ['User session store', 'Fast, stale-tolerant, expires anyway', 'N=3, W=1, R=1 (ONE)', 'Lowest latency; losing a session is a re-login'],
          ['Bank balance / inventory counter', 'Never lose or double-apply an update', 'Not an AP store: use a CP store (Raft/Paxos per shard) or a database with transactions', 'Quorum alone does not give linearizability or atomic read-modify-write']])}
<p>Interview gold: say the last row out loud. "R + W &gt; N is <i>not</i> the same as strong consistency" — sloppy quorums, concurrent writers and clock problems can still return stale or conflicting values.</p>`
      },
      {
        title: 'Worked example: why consistent hashing, not "key mod N"', html: `<p>With <code>node = hash(key) mod N</code> and N = 10 nodes, adding an 11th changes the answer for almost every key: a key stays only if <code>h mod 10 == h mod 11</code> — about <b>9%</b> of keys. So ~<b>91%</b> of the data must move. That is a cluster-wide reshuffle at the worst moment (usually when load is already high).</p>
<p>On a hash ring with virtual nodes the new node claims many small arcs and takes data only from its neighbours: about <b>1/11 ≈ 9%</b> of keys move — 10× less. Removing a dead node is symmetric: its arcs are absorbed by the next nodes clockwise (which already hold replicas), so recovery is mostly "bring replica count back to 3".</p>
${H.table(['Event (10 → 11 nodes)', 'mod N', 'Hash ring + vnodes'], [['Keys that move', '<span class="c-r">≈ 91%</span>', '<span class="c-g">≈ 9%</span>'], ['Who sends data', 'everyone to everyone', 'each old node sends a slice to the new node'], ['Load balance', 'good', 'good with ≥ 100 vnodes per node']])}`
      },
      {
        title: 'Worked example: two concurrent writers (vector clock vs last-write-wins)', html: `<p>Alice's phone adds <i>"milk"</i> to cart v1 on replica A; at the same moment her laptop adds <i>"eggs"</i> to cart v1 on replica B (network split). Now two writes descend from the same parent and neither knows about the other.</p>
${H.table(['Strategy', 'What happens', 'Result'], [
  ['Last-write-wins (timestamps)', 'Pick the write with the larger timestamp; the other is silently dropped', '<span class="c-r">Cart has only eggs — "milk" lost</span> (and clock skew can drop the actually newer one)'],
  ['Vector clocks', 'Versions <code>[A:1]</code> vs <code>[B:1]</code> are concurrent → keep both as siblings; client merges on next read', '<span class="c-g">Cart = {milk, eggs}</span> — the application resolves the conflict'],
  ['CRDTs', 'Data type merges itself (e.g., a set union)', '<span class="c-g">No conflicts by construction</span>, limited to suitable types']])}
<p>Cassandra chose LWW (simple, fast, lossy); Dynamo/Riak exposed vector clocks (correct, pushes work to the application). Say which one you choose and the cost.</p>`
      },
      {
        title: 'Worked example: delete is a write (tombstones)', html: `<p>If you simply erase a key on replica A while replica B (down at that moment) still has it, later anti-entropy sees "B has it, A does not" and <b>resurrects</b> the deleted data. So <code>delete(k)</code> writes a special <b>tombstone</b> record with a version, which replicates like any other write and wins against older values. Tombstones are only purged after a grace period (for example 10 days, longer than the longest expected outage) so every replica has learned about the delete. Forgetting this is the classic "zombie data" bug.</p>`
      }
    ],
    deepDive: `<h4>Partitioning details</h4>
<ul><li><b>Virtual nodes:</b> each machine owns ~128-256 small, scattered ranges. Heterogeneous hardware gets more vnodes; a failed node's load spreads over <i>many</i> peers instead of dumping onto one neighbour.</li><li><b>Replica placement:</b> the next N distinct <i>physical</i> nodes, skipping vnodes of the same machine; use rack/zone awareness so the 3 copies are in 3 failure domains.</li><li><b>Hot keys</b> are not solved by hashing: replicate hot keys more, add a client-side cache, or split the key (<code>key#0..#7</code>).</li><li>Alternative to the ring: fixed number of partitions (e.g. 1,024) assigned to nodes in a table — simpler rebalancing (Kafka, Elasticsearch, DynamoDB internally).</li></ul>
<h4>Write path on a node (LSM tree)</h4>
<p>WAL append (durability, <code>fsync</code> policy: every write vs every 10 ms group commit) → memtable (skip list) → flush to immutable SSTable → background <b>compaction</b> (size-tiered favours writes, leveled favours reads and uses more I/O). <b>Write amplification</b> (data rewritten by compaction) and <b>read amplification</b> (many SSTables checked) are the trade-offs; Bloom filters, block indexes and caching fight read amplification. B-tree engines (e.g. LMDB, InnoDB) update in place — better reads, worse random writes.</p>
<h4>Failure handling</h4>
<ul><li><b>Failure detection:</b> gossip heartbeats every second; a <b>phi-accrual</b> detector turns "no heartbeat for X" into a suspicion level, avoiding flapping on a slow network.</li><li><b>Hinted handoff:</b> while A is down, a neighbour stores A's writes with a hint; hints expire (e.g. 3 h) so a dead node does not accumulate unbounded hints — long outages need full repair.</li><li><b>Anti-entropy:</b> each replica keeps a Merkle (hash) tree per key range; two replicas compare roots and descend only into differing branches, transferring a tiny fraction of the data.</li><li><b>Permanent loss:</b> a fresh node streams its ranges from surviving replicas (bootstrapping), throttled so it does not starve foreground traffic.</li></ul>
<h4>Consistency, CAP, PACELC</h4>
<p>During a partition (<b>CAP</b>) the Dynamo family stays available and accepts divergence (<b>AP</b>). Even without partitions (<b>PACELC</b>), it trades latency for consistency every request via R/W. A <b>strongly consistent</b> alternative runs a <b>Raft group per shard</b> (etcd, TiKV, Spanner, CockroachDB): one leader serialises writes, followers replicate through a replicated log, reads go through the leader or use leases — linearizable but unavailable on the minority side of a partition. Choose by the cost of a stale or lost update.</p>
<h4>Session guarantees</h4>
<p>Cheap upgrades over plain eventual consistency: <b>read-your-writes</b> (route a client's reads to a replica that saw its write, or send the write's version with the read), <b>monotonic reads</b> (stick to one replica per session), <b>causal consistency</b> (vector clocks / dependency tracking).</p>
<h4>Operational reality</h4>
<ul><li>Secondary indexes and range scans fight the hash partitioning: use a global index service, scatter-gather, or choose a range-partitioned store (Bigtable/HBase) when you need scans.</li><li>Capacity: watch compaction backlog, p99 per node, and disk headroom (compaction needs 50% free for size-tiered).</li><li>Rolling upgrades one node at a time; repair after every long node outage; backups = snapshot SSTables (they are immutable, so snapshots are hard links).</li><li>Multi-datacenter: LOCAL_QUORUM within a region (low latency) plus async cross-region replication.</li></ul>
<h4>Trade-offs summary</h4>
${H.table(['Choice', 'Benefit', 'Cost'], [['AP with quorums', 'Always writable, low latency', 'Stale reads and conflicts possible'], ['LWW resolution', 'Simple', 'Silent data loss under concurrency'], ['Vector clocks', 'No silent loss', 'Client complexity, sibling growth'], ['Leaderless replication', 'No failover step, no single bottleneck', 'No linearizability, repair machinery'], ['Raft per shard (CP)', 'Linearizable, simpler semantics', 'Leader hot spot, unavailable without majority']])}`,
    aiEra: `<p><b>What AI changes:</b> key-value stores are now the memory layer of AI systems: <b>feature stores</b> serve per-user features to models in a few ms, <b>KV caches</b> for LLM inference store attention keys/values per conversation (a different "KV" with the same cache-and-evict thinking), agent frameworks keep <b>session and tool state</b> in Redis/DynamoDB-style stores, and embedding vector databases often sit on an LSM or partitioned KV engine underneath. Workloads are bursty (agents fan out dozens of parallel calls) and values can be large (conversation history of 100 KB-1 MB), so value-size limits, compression and TTL policy matter more than before. Operations also improve: AI-assisted anomaly detection spots compaction stalls or skewed partitions before users do.</p>
<p><b>Use AI as a partner:</b> ask <code>Simulate my N/R/W settings against these failure sequences and list every stale-read case</code>; generate Jepsen-style test scenarios (partition, clock skew, node pause); have it review your tombstone and repair policy for zombie-data risks. Then actually run the tests.</p>
<p><b>Where AI goes wrong:</b> it conflates "R + W &gt; N" with linearizability, ignores sloppy quorums and clock skew in LWW, forgets tombstones and hint expiry, and may propose a single "master" coordinator (reintroducing the single point of failure you were avoiding). It also likes to recommend Cassandra or DynamoDB without stating which consistency level it would use.</p>
<p><b>What you must still own:</b> the consistency decision per use case, failure-mode reasoning, capacity math (QPS-bound vs storage-bound), and the honest statement of what the system does <i>not</i> guarantee.</p>`,
    problems: [{
      title: 'Choose consistency settings and repair strategy for a shopping cart', level: 'Medium', tags: ['key-value store', 'quorum', 'consistency'], companies: ['Amazon', 'Netflix'],
      statement: `<p>You run a Dynamo-style cluster (N = 3 across three availability zones) that stores shopping carts, one value per user. Marketing says "adding an item to the cart must <b>never fail</b>, even during a zone outage". Support says "customers complain that items they removed come back". Choose R and W, explain what happens when one zone is down, how concurrent updates from phone and laptop are merged, and why deleted items reappear and how to stop it.</p>`,
      constraints: `Cart value ≤ 50 KB, 5K writes/s, 20K reads/s, p99 &lt; 15 ms. One AZ may be offline for hours. Concurrent updates from multiple devices are common.`,
      example: `${H.table(['Scenario', 'Required behaviour'], [['Zone B is down, user adds "milk"', 'Write succeeds (2 of 3 replicas ack)'], ['Phone adds milk, laptop adds eggs concurrently', 'Final cart contains both'], ['User removes "pen", replica C was down at that moment', '"pen" does not return after C recovers']])}`,
      brute: { why: `<p>Naive design: N = 3, W = 3, R = 1, last-write-wins on timestamps, and removal implemented by physically deleting the item from the cart value. W = 3 means any single zone failure makes adds fail (violates "never fail"). LWW silently drops one of two concurrent updates (milk or eggs lost). Physically deleting an item lets a stale replica "resurrect" it during repair because nothing records that the removal happened.</p>` },
      mcq: { q: 'Cart service: N=3. Which setting best satisfies "writes must succeed with one zone down" while keeping reads reasonably fresh?', options: ['W=3, R=1', 'W=2, R=2', 'W=1, R=3', 'W=3, R=3'], answer: 1, explain: 'W=2 tolerates one failed zone for writes, R=2 does too for reads, and R + W = 4 > 3 means read and write sets overlap, so reads normally see the newest write.' },
      hints: [
        `<p>Hint 1: Pick W so one zone failure still leaves W replicas, then choose R so that R + W &gt; N.</p>`,
        `<p>Hint 2: Concurrent edits need conflict <b>detection</b> (vector clocks / version vectors) and a <b>merge rule</b> for carts, such as set union of items with per-item add/remove markers.</p>`,
        `<p>Hint 3: Removes must be recorded as data (tombstones with versions) and kept longer than the longest outage; repair needs hinted handoff, read repair and periodic Merkle-tree anti-entropy.</p>`
      ],
      solution: {
        approach: `<p><b>Settings.</b> N = 3 with one replica per AZ. Writes use <b>W = 2</b> (QUORUM), reads <b>R = 2</b>: one zone can be down and both operations still succeed, and R + W = 4 &gt; 3 so a read normally includes at least one replica with the latest write. Use a <i>sloppy quorum</i> with hinted handoff for cart adds so even if two zones are impaired, "add to cart" is still accepted (at the cost of weaker freshness).</p>
<p><b>Concurrency.</b> Each cart value carries a version vector (<code>{zoneA:3, zoneB:1}</code>). A write sends the version it read as context. If a read returns two <i>concurrent</i> versions (siblings), the application merges them and writes back the merged cart. The cart is modelled as an <b>OR-set CRDT</b>: each add gets a unique tag; a remove deletes the observed tags; merge = union of adds minus removed tags. This makes merges deterministic and loses no adds.</p>
<p><b>Why items reappear and the fix.</b> A physical delete leaves no trace, so a replica that missed the delete (down) later sends its old copy during repair and the item returns. Store removal as a <b>tombstone</b> inside the cart (the removed tags), which replicates like any write and beats older data. Keep tombstones for a grace period longer than the maximum outage plus repair interval (e.g. 10 days), then compact them away.</p>
<p><b>Repair and operations.</b> Hinted handoff covers short outages (hint TTL a few hours); read repair fixes carts customers actually read; weekly Merkle-tree anti-entropy fixes the cold tail; after a multi-hour AZ outage run a full repair of that zone. Alert on hint backlog, sibling counts per read (a sign of heavy conflicts), p99 latency and repair lag. Cart size is bounded (50 KB) and old carts expire with TTL.</p>`,
        complexity: `<p>Write touches 3 replicas and waits for 2: O(1) with latency of the second-fastest replica. Read asks 2 replicas; merging siblings is O(items). Storage is 3× the cart data.</p>`,
        followUps: ['What changes if the business wants "inventory is never oversold"?', 'How would you add a global per-user "recently viewed" list on the same store?', 'How do you test that tombstones are not purged too early?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE PROBLEMS (Easy -> Medium -> Hard)
     ===================================================================== */
  function P(title, level, tags, companies, statement, constraints, example, bruteWhy, mcq, hints, approach, complexity, followUps) {
    return {
      title: title, level: level, tags: tags, companies: companies,
      statement: statement, constraints: constraints, example: example,
      brute: { why: bruteWhy },
      mcq: { q: mcq[0], options: mcq[1], answer: mcq[2], explain: mcq[3] },
      hints: hints,
      solution: { approach: approach, complexity: complexity, followUps: followUps }
    };
  }

  /* ---------------- EASY ---------------- */
  practice.push(P('Size a URL shortener for 500M links a month', 'Easy', ['estimation', 'url shortener'], ['Amazon', 'Microsoft'],
    `<p>Your new product creates <b>500 million</b> short links per month and each link gets about <b>50 clicks</b> in its lifetime (spread over the next 3 months). Links are kept for 5 years. A row takes about 400 bytes. Compute: writes/sec, reads/sec, 5-year storage, and the minimum base62 code length. Say what each number tells you about the design.</p>`,
    `Assume 30-day months (2.6 million seconds). Peak traffic = 3× average.`,
    `${H.table(['Quantity', 'Working', 'Answer'], [['Writes/sec', '500M ÷ 2.6M', '≈ 190/s (peak ≈ 580/s)'], ['Reads/sec', '190 × 50', '≈ 9,600/s (peak ≈ 29K/s)'], ['Rows in 5 years', '500M × 12 × 5', '30 billion'], ['Storage', '30B × 400 B', '≈ 12 TB'], ['Code length', '62<sup>6</sup> = 5.7×10<sup>10</sup> ≥ 3×10<sup>10</sup>', '6 chars is just enough; use 7']])}`,
    `<p>Guessing numbers or sizing for "1 million" requests/sec without computing leads to over-engineering (a giant Kafka cluster for 190 writes/s) or under-engineering (forgetting that 12 TB needs sharding and that the code space must exceed 30 billion).</p>`,
    ['A counter must produce at least 30 billion distinct codes. What is the shortest base62 length that is enough?', ['5 characters', '6 characters (tight) – 7 for comfort', '4 characters', '12 characters'], 1, '62<sup>5</sup> = 916M is too small; 62<sup>6</sup> = 56.8B just covers 30B (but is 53% full); 7 characters (3.5T) leaves ample headroom.'],
    [`<p>Hint 1: Convert "per month" to "per second" by dividing by about 2.6 million (30 days × 86,400).</p>`, `<p>Hint 2: Reads = writes × reads-per-link. Storage = rows × bytes per row. Rows = links per month × months kept.</p>`, `<p>Hint 3: Code length: find the smallest L with 62<sup>L</sup> ≥ total rows, then add one character of headroom. Interpret each result: low write rate, moderate read rate, tens of TB means sharded storage.</p>`],
    `<p>Writes: 500M / 2.6M ≈ <b>190 per second</b>, peak ~580. Reads: each link gets 50 clicks, so 190 × 50 ≈ <b>9,600 per second</b>, peak ~29K. Rows over five years: 500M × 60 months = <b>30 billion</b>; at 400 B that is <b>12 TB</b>. Code length: 62<sup>6</sup> ≈ 56.8 billion exceeds 30 billion but would be more than half full, so choose <b>7 characters</b> (3.5 trillion).</p><p>Design consequences: writes are small (one primary or a few shards could handle 190/s), reads are the main load and are served by a cache (hot ~20% of links), storage needs a sharded key-value store because 12 TB plus replication is beyond one comfortable node, and the ID generator can use leased ranges because the rate is modest. State these in the interview before drawing boxes.</p>`,
    `<p>Pure arithmetic, O(1). The point is to derive requirements: ~10K reads/s, 12 TB, 7-character codes.</p>`,
    ['How would the numbers change if each link is clicked 5,000 times?', 'What if you keep click events for analytics, 100 bytes each?']));

  practice.push(P('301 or 302: choose redirect codes for three products', 'Easy', ['http', 'url shortener', 'trade-offs'], ['Google', 'Atlassian'],
    `<p>Three teams use your shortener. (A) A marketing team needs per-click analytics and the ability to change a link\'s target next week. (B) A documentation site wants permanent short links that search engines treat as the real page and wants minimum server load. (C) A coupon team needs links that expire at midnight. Choose 301 or 302 for each and justify.</p>`,
    `Browsers cache 301 responses indefinitely; 302 is not cached unless headers say so.`,
    `${H.table(['Team', 'Choice', 'Reason'], [['A marketing', '302', 'Every click must reach us; target may change'], ['B docs', '301', 'Permanent, SEO equity passes to the target, fewer requests'], ['C coupons', '302 (or 307) with Cache-Control: no-store', 'Expiry must be enforced on every click']])}`,
    `<p>Using 301 everywhere "because it is faster" means the browser never asks again: analytics miss repeat clicks, edited targets are not seen by returning visitors, and expired coupons keep working in browsers that cached the redirect.</p>`,
    ['Why does 301 hurt click analytics?', ['It is slower', 'Browsers cache it so repeat clicks never reach the server', 'It cannot carry a Location header', 'It removes cookies'], 1, 'A cached 301 means the browser goes straight to the target next time, so the shortener never sees (or counts) those clicks.'],
    [`<p>Hint 1: Ask "does the server need to see every click or be able to change its mind later?" If yes, the browser must not cache the redirect.</p>`, `<p>Hint 2: 301 = permanent (cached, SEO passes link value). 302/307 = temporary (not cached by default).</p>`, `<p>Hint 3: For hard expiry add <code>Cache-Control: no-store</code> or a short <code>max-age</code> so even intermediaries do not keep it.</p>`],
    `<p><b>Team A: 302.</b> Analytics require every click to hit the servers, and a changed target must be visible immediately; a cached 301 would break both. <b>Team B: 301.</b> The links are permanent and meant to be the canonical address; browsers and search engines cache it, so load drops, and link equity flows to the destination page. <b>Team C: 302 with <code>Cache-Control: no-store</code></b> (or a short max-age) because the server must be able to answer 410 Gone the moment a coupon expires.</p><p>Mention the cost: 302 sends every click to you, so you need the cache (Redis) and a CDN with a short TTL to absorb it. A hybrid is possible: 301 for specific customer-marked permanent links, 302 for all others.</p>`,
    `<p>Decision question, O(1). Server cost with 302 is the redirect lookup (cache hit ≈ 0.5 ms).</p>`,
    ['Is 307 or 308 better than 302 or 301? When?', 'How do CDNs interact with redirect caching?']));

  practice.push(P('Which rate limiting algorithm for each endpoint?', 'Easy', ['rate limiter', 'algorithms'], ['Stripe', 'Amazon'],
    `<p>Pick an algorithm (token bucket, leaky bucket, fixed window counter, sliding window log, sliding window counter) and justify: (1) <code>POST /login</code>: at most 5 attempts per minute per account, exactness matters. (2) The public search API: sustained 10 req/s per key but short bursts of 50 are fine. (3) A downstream SMS provider that can only accept a perfectly steady 100 messages/s. (4) A cheap "page views" counter for a dashboard where approximate is fine and memory must be tiny.</p>`,
    `Think about memory per key, burst handling and accuracy.`,
    `${H.table(['Endpoint', 'Algorithm', 'Why'], [['/login', 'Sliding window log (5 timestamps)', 'Exact and cheap because the limit is tiny'], ['search API', 'Token bucket (cap 50, refill 10/s)', 'Allows bursts, enforces the average'], ['SMS provider', 'Leaky bucket (queue draining at 100/s)', 'Smooths output into a steady stream'], ['dashboard counter', 'Fixed window counter', 'One integer per key, boundary error acceptable']])}`,
    `<p>Using one fixed-window counter for everything allows 2× the limit at window edges (bad for login security), refuses legitimate bursts on the search API, and does nothing to smooth traffic to a strict downstream.</p>`,
    ['Which algorithm lets a client send a burst of 50 requests but averages 10/s over time?', ['Fixed window counter', 'Token bucket', 'Leaky bucket', 'Sliding window log'], 1, 'Token bucket: capacity gives the burst size and the refill rate gives the long-run average.'],
    [`<p>Hint 1: Identify what matters per endpoint: exactness, burst tolerance, steady output, or tiny memory.</p>`, `<p>Hint 2: Token bucket = bursts allowed; leaky bucket = steady outflow; sliding log = exact but memory proportional to the limit.</p>`, `<p>Hint 3: Fixed window is the cheapest (one counter) but suffers the boundary problem; sliding window counter is the cheap, near-exact middle ground.</p>`],
    `<p><b>1. Login:</b> sliding window log. The limit is only 5, so storing 5 timestamps per account is trivial and gives exact "5 in the last 60 s" with no boundary loophole — important for security. <b>2. Search API:</b> token bucket with capacity 50 and refill 10 per second: a client idle for 5 s may burst 50, but cannot average more than 10/s. <b>3. SMS provider:</b> leaky bucket — requests wait in a queue drained at exactly 100/s, protecting a provider that rejects bursts (accept the added queueing delay and a bounded queue that drops or rejects beyond a size). <b>4. Dashboard counter:</b> fixed window counter with <code>INCR</code> and <code>EXPIRE</code>; the boundary double-count does not matter for approximate analytics.</p><p>General rule: token bucket is the default for APIs; sliding window counter when you need smooth "per minute" semantics; sliding window log only for small limits.</p>`,
    `<p>Memory per key: log O(limit), others O(1). Time per check: O(1) for all except log which is O(limit) to prune.</p>`,
    ['What would you pick for a limit of 10,000 requests per hour per key?', 'How would you present the choice to a product manager?']));

  practice.push(P('Classify notifications by priority and channel', 'Easy', ['notifications', 'priority'], ['Uber', 'Flipkart'],
    `<p>For each message pick a <b>priority</b> (critical / normal / low), the <b>channel(s)</b> (push, email, SMS, in-app), whether it should respect <b>quiet hours</b>, and a sensible <b>expiry</b>: (a) login OTP, (b) "your order has shipped", (c) weekly newsletter, (d) fraud alert on a card, (e) "someone liked your photo".</p>`,
    `Consider cost (SMS is expensive), urgency, and annoyance to the user.`,
    `${H.table(['Message', 'Priority', 'Channel', 'Quiet hours?', 'Expiry'], [['OTP', 'critical', 'SMS (+ push)', 'ignore', '60 s'], ['Order shipped', 'normal', 'push + email', 'respect', 'none'], ['Newsletter', 'low', 'email', 'respect', '24 h'], ['Fraud alert', 'critical', 'push + SMS', 'ignore', 'none'], ['Photo like', 'low', 'in-app / batched push', 'respect', '1 h']])}`,
    `<p>Treating everything as the same priority sends OTPs behind newsletters, wakes people at 3 am with "likes", and burns SMS budget on trivia.</p>`,
    ['Why should OTP messages have a short expiry in the queue?', ['To save disk space', 'A late OTP is useless and retrying it just wastes money and confuses the user', 'Because SMS is slow', 'Providers require it'], 1, 'An OTP is valid for about a minute. If it cannot be delivered quickly, dropping it is better than delivering a code that no longer works.'],
    [`<p>Hint 1: Priority follows "what breaks if this is 10 minutes late?" OTP and fraud: user is blocked or money at risk.</p>`, `<p>Hint 2: Channel follows cost and reliability: SMS only where reach and speed justify the cost; push/email for the rest.</p>`, `<p>Hint 3: Critical messages bypass quiet hours and frequency caps, but non-critical must respect them. Set expiries so stale messages are dropped.</p>`],
    `<p><b>OTP</b>: critical, SMS with push fallback, ignores quiet hours, expires after 60 s. <b>Order shipped</b>: normal, push and email, respects quiet hours (can wait until morning), no expiry. <b>Newsletter</b>: low, email only, scheduled at the user\'s preferred local time, expires if not sent within 24 hours. <b>Fraud alert</b>: critical, push plus SMS, ignores quiet hours and frequency caps, no expiry (still useful later). <b>Photo like</b>: low, in-app first and a batched/digest push (for example one summary per hour), respects quiet hours, expires after an hour.</p><p>Implementation consequence: the <em>type</em> of notification determines its class in a server-side table, not the caller — otherwise a marketing team will mark everything critical. Each class maps to its own queue, worker pool and provider quota.</p>`,
    `<p>Design decision, O(1). Operationally: three queues and three worker pools, class chosen by notification type.</p>`,
    ['Who decides priority: the caller or the platform?', 'What happens when a critical SMS fails — do you retry, fall back, or both?']));

  /* ---------------- MEDIUM ---------------- */
  practice.push(P('Click analytics for the URL shortener without slowing redirects', 'Medium', ['analytics', 'kafka', 'url shortener'], ['Google', 'LinkedIn'],
    `<p>Add analytics: total clicks, unique visitors, top countries and referrers per link, shown in a dashboard that updates within about a minute. Redirect latency must not increase and a spike on one viral link (100K clicks/s) must not break anything. Describe the event pipeline, storage and query path, and how you handle failures.</p>`,
    `4K to 100K redirects/s, 10B events/month, p99 redirect &lt; 50 ms, dashboard freshness 1 minute, approximate unique counts are OK.`,
    `${H.table(['Click', 'Event emitted'], [['GET /Ab3 from India via Twitter', '{code: Ab3, ts, country: IN, ref: twitter.com, visitor: hash}'], ['100K clicks/s on one link', 'Batched, partitioned by code, aggregated per minute']])}`,
    `<p>Naive: increment <code>click_count</code> in the main URL row on every redirect. Every click becomes a database write on the hot path (4K-100K writes/s on a read-optimised store), a viral link creates a hot row with lock contention, redirects slow down, and unique visitors or per-country breakdowns are impossible with a single counter.</p>`,
    ['Where should the click event be written so redirect latency is unaffected?', ['Synchronously into the URL table', 'Fire-and-forget to a queue/log, consumed asynchronously', 'Into the CDN', 'Into the browser cookie only'], 1, 'Publishing to a message bus is a non-blocking append. Aggregation happens off the request path, so redirects stay fast and analytics failures never break redirects.'],
    [`<p>Hint 1: The redirect only needs to <b>emit</b> an event, never to update counters itself.</p>`, `<p>Hint 2: Put events in a log (Kafka) partitioned by code, aggregate in a stream processor into per-minute buckets, store in a column/time-series store.</p>`, `<p>Hint 3: Hot keys: pre-aggregate in the app server (count in memory, flush every second). Unique visitors: HyperLogLog, not exact sets.</p>`],
    `<p><b>Pipeline.</b> The redirect handler builds a tiny event (code, timestamp, country from the IP via a local GeoIP database, referrer, user-agent class, hashed visitor id) and hands it to an in-memory buffer that is flushed in batches (every 100 ms or 500 events) to <b>Kafka</b>, topic partitioned by <code>code</code>. The handler never waits for the broker; if the buffer is full or Kafka is down it drops events (analytics may be lossy, redirects may not) and increments a counter metric.</p>
<p><b>Aggregation.</b> A stream job (Flink/Kafka Streams) groups by <code>(code, minute)</code> and emits counts per country and referrer plus a <b>HyperLogLog</b> sketch for unique visitors (12 KB per bucket gives ~1% error and is mergeable across minutes). Output is written to a column store/time-series DB (ClickHouse, Druid) keyed by code and time. Raw events also land in object storage (Parquet) for reprocessing.</p>
<p><b>Hot links.</b> App servers first count clicks per code in memory and publish pre-aggregated deltas once per second, turning 100K events/s into at most (servers × 1 per second) messages for that link. Kafka partitions by code would make a single hot partition, so for known-hot codes add a salt (<code>code#0..#7</code>) and merge in the aggregator.</p>
<p><b>Query.</b> Dashboard reads pre-aggregated minute/hour/day rollups from the column store (a few hundred rows per link), cached for 30-60 s. Freshness ≈ batch interval + stream window ≈ under a minute. <b>Failure handling:</b> at-least-once from Kafka plus idempotent writes keyed by (code, minute, partition offset range); late events within a watermark window update past buckets; lossy client-side buffer is acceptable and measured.</p>`,
    `<p>Redirect path adds O(1) in-memory work. Event volume 10B/month ≈ 3.8K/s average (≈ 3.8 MB/s at 1 KB), well within one Kafka cluster; aggregated storage is small.</p>`,
    ['How would you make unique visitors exact for the top 100 links only?', 'How do you filter bot clicks from the counts?']));

  practice.push(P('Pastebin: upload 10 MB pastes and de-duplicate identical content', 'Medium', ['pastebin', 'object storage', 'dedup'], ['Dropbox', 'Meta'],
    `<p>Users now paste logs up to 10 MB and many paste the same log file (CI failures). The app servers are running out of memory and bandwidth when handling large uploads, and storage cost is growing quickly. Redesign the upload path and add de-duplication of identical content. Cover how partial uploads, integrity and deletion work.</p>`,
    `1M pastes/day, 5% are larger than 1 MB, about 30% of large pastes are duplicates of earlier content; uploads must not pass through app servers\' memory.`,
    `${H.table(['Step', 'Flow'], [['1', 'Client requests an upload URL with the content hash'], ['2', 'Server finds the hash already stored → skips the upload'], ['3', 'Otherwise client uploads directly to the object store with a presigned URL']])}`,
    `<p>Naive: the client POSTs 10 MB to an app server, which buffers it in memory, writes it to the DB, and stores a full copy every time. 1,000 concurrent big uploads need 10 GB of RAM, bandwidth is doubled (client → app → storage), a dropped connection restarts from zero, and identical logs are stored thousands of times.</p>`,
    ['What lets large uploads bypass the app servers?', ['A bigger load balancer', 'Presigned URLs for direct client-to-object-store (multipart) uploads', 'Gzip only', 'WebSockets'], 1, 'The app server only authorises and records metadata. A time-limited presigned URL lets the client send bytes straight to object storage, which handles multipart and resumable uploads.'],
    [`<p>Hint 1: Separate control (small API calls) from data (big bytes). The app server should never carry the bytes.</p>`, `<p>Hint 2: Content-addressable storage: key the blob by the SHA-256 of its content; identical content maps to one object with a reference count.</p>`, `<p>Hint 3: Plan failure: multipart upload with resume, commit step that verifies the hash, orphan cleanup, and decrementing references on delete.</p>`],
    `<p><b>Upload flow.</b> (1) Client computes SHA-256 of the content and calls <code>POST /v1/pastes/init {size, sha256}</code>. (2) The server checks the <code>blobs</code> table: if the hash exists, it creates only a new metadata row pointing to the existing blob and increments <code>refcount</code> — <b>no upload needed</b> (this is the de-dup win, ideal for repeated CI logs). (3) Otherwise it returns a presigned <b>multipart upload</b> URL set (e.g. 5 MB parts). The client uploads parts in parallel directly to the object store and can resume a failed part. (4) Client calls <code>POST /v1/pastes/{id}/complete</code>; the server asks the store to assemble the object, verifies size/hash (or uses the store\'s checksum) and inserts the blob and paste metadata atomically.</p>
<p><b>Storage layout.</b> Blob key = <code>blobs/{sha256[0:2]}/{sha256}</code>; <code>blobs(hash, size, refcount)</code> and <code>pastes(id, blob_hash, expires_at, ...)</code>. Always gzip/zstd before hashing consistently (hash the original bytes, store compressed).</p>
<p><b>Integrity and security.</b> Verify the hash server-side (never trust the client\'s claim, otherwise an attacker could claim a hash and read someone else\'s private blob — require proof by uploading or a hash-challenge for private content); scan asynchronously and quarantine bad blobs; enforce per-user quotas.</p>
<p><b>Deletion.</b> Deleting or expiring a paste decrements <code>refcount</code> in a transaction; when it reaches 0 the blob is queued for deletion after a grace period (protects against races with a concurrent paste of the same content). Unfinished multipart uploads are aborted by a lifecycle rule after 24 hours so orphans do not accumulate.</p>`,
    `<p>App servers handle only small JSON calls (O(1) memory). Storage drops by roughly the duplicate fraction (~30% of the large pastes\' bytes). Hashing cost O(size) on the client.</p>`,
    ['How do you prevent a user from probing which private logs exist via the hash check?', 'How would chunk-level (content-defined) dedup change the design?']));

  practice.push(P('Rate limiter with a sliding window counter in Redis', 'Medium', ['rate limiter', 'redis', 'lua'], ['Cloudflare', 'Shopify'],
    `<p>Implement "100 requests per minute per API key" with a sliding window counter on Redis, shared by 40 gateway instances. Define the Redis keys, the algorithm step by step, the atomic operation, the response headers, memory use, and what happens at minute boundaries and on Redis failure.</p>`,
    `500K checks/s peak, 5M active keys, &lt; 2 ms added latency, small accuracy error (&lt; 1-2%) is acceptable.`,
    `${H.table(['Time', 'prev window count', 'cur window count', 'estimate'], [['12:01:15 (25% into minute)', '80', '30', '80 × 0.75 + 30 = <b>90</b> → allow'], ['12:01:15 after 10 more', '80', '40', '80 × 0.75 + 40 = <b>100</b> → reject next']])}`,
    `<p>Fixed window counting resets on the minute so a client can send 100 at 12:00:59 and 100 at 12:01:00. Reading and writing counters with separate Redis commands from many gateways is a race. Storing a timestamp for every request (sliding log) costs O(100) memory per key × 5M keys = too much.</p>`,
    ['In a sliding window counter, what does the weight on the previous window represent?', ['The probability of failure', 'The fraction of the sliding window that still overlaps the previous fixed window', 'The number of gateways', 'The retry delay'], 1, 'If we are 25% into the current minute, the last 60 seconds include the final 75% of the previous minute, so the previous count is weighted by 0.75.'],
    [`<p>Hint 1: Keep two counters per key: one for the current minute window, one for the previous minute window. Key includes the window number.</p>`, `<p>Hint 2: Estimate = prev × (1 − elapsed_fraction) + current. Allow if estimate &lt; limit, then increment current.</p>`, `<p>Hint 3: Use a Lua script (or a pipeline of INCR + EXPIRE with a script) so check and increment are atomic; set EXPIRE to 2 × window.</p>`],
    `<p><b>Keys.</b> <code>rl:{apiKey}:{windowId}</code> where <code>windowId = floor(now / 60)</code>. Only two keys are live per client (current and previous); each expires after 120 s, so memory is about 2 × 5M × ~60 B ≈ 600 MB across the cluster.</p>
<p><b>Atomic script.</b> One Lua call per request on the shard owning <code>{apiKey}</code> (use a hash tag so both window keys land on the same shard): read <code>now</code> from <code>redis.call('TIME')</code>; compute <code>cur = GET key(w)</code>, <code>prev = GET key(w-1)</code>, <code>elapsed = (now mod 60)/60</code>; <code>estimate = prev × (1 − elapsed) + cur</code>; if <code>estimate &lt; limit</code> then <code>INCR key(w)</code>, <code>EXPIRE key(w) 120</code> and return allowed with remaining = limit − estimate − 1, else return denied plus <code>retryAfter</code> = seconds until the estimate would drop below the limit.</p>
<p><b>Response.</b> Allowed: <code>X-RateLimit-Limit: 100</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>. Denied: <b>429</b> with <code>Retry-After</code>.</p>
<p><b>Accuracy.</b> The weighted estimate assumes the previous window\'s requests were evenly spread; measured error against the exact log is typically under 1%. At the boundary the client can no longer send 200 in two seconds because the previous count still weighs ~100% at second zero of the new window.</p>
<p><b>Failure.</b> Redis timeout &gt; 5 ms → circuit breaker → fail-open for normal endpoints (with a local in-memory limiter per gateway, limit/40 × safety factor) and fail-closed for login/SMS endpoints. Metrics: allow/deny per rule, script latency, breaker state.</p>`,
    `<p>O(1) time and 2 counters of memory per active key; one Redis round trip per request. Throughput scales linearly with the number of shards.</p>`,
    ['How would you support different limits per endpoint and per plan?', 'How does the design change for multi-region active-active?']));

  practice.push(P('Schedule notifications at 9 am local time with quiet hours', 'Medium', ['notifications', 'scheduler', 'time zones'], ['Duolingo', 'Swiggy'],
    `<p>Marketing wants a daily reminder sent at <b>9 am in each user\'s local time</b>, but never during quiet hours (the user\'s own setting, default 22:00-08:00). Users travel and change time zones; daylight-saving shifts happen. Design the scheduling component for 20M users: data model, how due notifications are found and released, and how you avoid thundering herds at 9:00 sharp.</p>`,
    `20M users, one reminder per day, delivery within a 5-minute window of the target time, workers must not be overloaded at the top of the hour.`,
    `${H.table(['User', 'Time zone', '9 am local = UTC'], [['Asha', 'Asia/Kolkata', '03:30'], ['Ben', 'America/New_York (EDT)', '13:00'], ['Chen', 'Asia/Tokyo', '00:00']])}`,
    `<p>Naive: one cron job at 09:00 UTC loops over all 20M users and sends everything at once. It ignores time zones, floods workers and providers in a single spike, and a crash half-way means some users get nothing and a retry sends duplicates.</p>`,
    ['What should be stored to schedule "9 am local" correctly across DST changes?', ['A fixed UTC offset like +05:30', 'The IANA time zone name (e.g. Asia/Kolkata) and the local time, converted to UTC at scheduling time', 'The server time zone', 'The user\'s phone model'], 1, 'Offsets change with daylight saving. Store the zone name and compute the next UTC instant each day.'],
    [`<p>Hint 1: Do not loop over all users at one instant. Compute each user\'s next send time (UTC) in advance and index by it.</p>`, `<p>Hint 2: A scheduler table or sorted set keyed by <code>send_at</code>; pollers pull due items in small slices and push them to the normal queue.</p>`, `<p>Hint 3: Add random jitter (up to a few minutes) to spread the load; re-compute when the user changes zone; make claiming a due item idempotent.</p>`],
    `<p><b>Data model.</b> <code>user_schedule(user_id, tz, local_time, next_send_utc, last_sent_date)</code> indexed by <code>next_send_utc</code>. <code>tz</code> is an IANA zone name. After each send (or on zone change) the scheduler recomputes <code>next_send_utc</code> using a tz library, which handles DST, and adds a per-user <b>jitter</b> of 0-4 minutes derived from a hash of the user id (stable, spread evenly).</p>
<p><b>Release.</b> A fleet of scheduler workers is sharded by user id range. Every second each worker queries its shard for rows with <code>next_send_utc &lt;= now</code> in batches of 1,000 and claims them with a conditional update (<code>UPDATE ... SET status='enqueued' WHERE user_id=? AND last_sent_date &lt; today</code>) so two workers or a retry cannot enqueue twice. Claimed items go to the low/normal notification topic, rate-shaped to the provider limit. In Redis the same pattern uses a sorted set scored by send time and <code>ZPOPMIN</code>/Lua to claim.</p>
<p><b>Quiet hours and preferences.</b> The router worker checks quiet hours again at send time (preferences may have changed). If a send falls inside quiet hours it is re-scheduled to the quiet-hours end time, or dropped if it would arrive more than 2 hours late (a "9 am reminder" at 3 pm is wrong). Critical messages bypass this.</p>
<p><b>Edge cases.</b> Time zone change: recompute next send; if the new local 9 am is within the past 12 hours and not yet sent today, send soon rather than skip. DST gap (local time does not exist): move to the next valid instant. Spikes: peak around :00 and :30 in populous zones is smoothed by jitter. Observability: lag between target and actual send time (p99 &lt; 5 min).</p>`,
    `<p>Each user is touched once per day: O(users) overall, O(log n) per release with an index. Peak rate after jitter ≈ 20M / (several time zones × 5-minute spread), typically a few thousand per second.</p>`,
    ['How would you support "send at the user\'s most active hour" from an ML model?', 'What if the user has two devices in different time zones?']));

  practice.push(P('Add a node to a running key-value cluster', 'Medium', ['key-value store', 'consistent hashing', 'rebalancing'], ['Amazon', 'Uber'],
    `<p>Your 50-node Dynamo-style cluster (N = 3, 256 virtual nodes per machine) is running at 80% capacity. You add node 51. Describe step by step what happens: how the ring changes, which data moves from where, how reads and writes behave during the move, how you throttle it, and how you know it is finished. Compare with a "key mod N" scheme.</p>`,
    `3 TB logical data, 9 TB replicated, traffic must stay within SLO (p99 &lt; 10 ms) during the operation; no downtime.`,
    `${H.table(['Scheme', 'Data moved when 50 → 51 nodes'], [['key mod N', '≈ 98% of keys'], ['Consistent hashing + vnodes', '≈ 1/51 ≈ 2% of keys (the new node takes ~256 small ranges)']])}`,
    `<p>With <code>hash(key) mod N</code> nearly every key changes owner when N changes, so the cluster must reshuffle almost everything under production load. Another naive approach stops writes while copying data, causing downtime.</p>`,
    ['Why do virtual nodes make adding a machine less disruptive?', ['They make hashing faster', 'The new machine takes many small ranges from many different neighbours, spreading the transfer', 'They remove replication', 'They compress data'], 1, 'With 256 scattered ranges, the new node streams from many existing nodes in parallel, each giving up a small slice, instead of one neighbour giving up a big arc.'],
    [`<p>Hint 1: The new node picks 256 token positions on the ring; each position steals the range up to the previous token from its current owner.</p>`, `<p>Hint 2: Bootstrap in phases: join as "joining" (receives writes for its ranges, not reads) → stream data → become "normal".</p>`, `<p>Hint 3: Throttle streaming, verify with repair/Merkle trees, then remove data the old owners no longer own (cleanup).</p>`],
    `<p><b>1. Join.</b> The new node contacts seeds, gets cluster metadata via gossip, and chooses 256 tokens (random, or computed to balance). It announces itself in state <b>JOINING</b>; the ring change propagates by gossip within seconds.</p>
<p><b>2. Which data moves.</b> For each token the node becomes a replica for the range preceding it (and, because N = 3, the next two ranges). So for every range it newly owns, one of the three existing replicas can stop being a replica. Total moved ≈ 3 TB × 3 replicas × 1/51 ≈ 180 GB, streamed from about 40 different peers in parallel (each sends ~4-5 GB).</p>
<p><b>3. Live traffic.</b> From the moment the node is JOINING, <b>writes</b> for its ranges are sent to it as well as to old replicas (so nothing written during streaming is missed). <b>Reads</b> continue to go to the old replicas until streaming completes, so clients never see missing data. Streaming is throttled (e.g. 50 MB/s per peer, lower priority than foreground I/O) and runs at off-peak load if possible.</p>
<p><b>4. Finish.</b> When all ranges are streamed and verified (compare Merkle-tree roots for each range, or run a targeted repair), the node flips to <b>NORMAL</b> and begins serving reads. The old owners run <b>cleanup</b> to delete data they no longer own — only after verification, otherwise a bug would destroy the last good copy. Monitor streaming progress, p99 latency, compaction backlog, and disk space on senders (compaction needs headroom). Add one node at a time (or a controlled few) to keep the movement predictable.</p>
<p><b>Compared with mod N:</b> the ring moves ~2% of data and never all-at-once; mod N would move ~98%, which usually forces downtime or a very risky copy.</p>`,
    `<p>Data moved ≈ total/(N+1); streaming time ≈ 180 GB ÷ (parallel peers × throttle rate) ≈ minutes to an hour. Per-request overhead during the move: slightly more write fan-out.</p>`,
    ['How do you remove a node gracefully versus handle a crashed node?', 'What changes if the cluster uses fixed partitions instead of a token ring?']));

  practice.push(P('Multi-region URL shortener with unique IDs and fast redirects', 'Medium', ['url shortener', 'multi-region', 'id generation'], ['Netflix', 'Cloudflare'],
    `<p>Users in the US, Europe and India must all get redirects in under 50 ms and be able to create links even if another region is offline. Extend the design: how do you generate globally unique codes without cross-region coordination, where is data stored and replicated, how do custom aliases avoid cross-region collisions, and what happens during a region outage?</p>`,
    `3 regions, 40 creates/s total, 12K reads/s peak, links readable from any region within a few seconds of creation, RPO of a few seconds.`,
    `${H.table(['Region', 'First character of generated code', 'Example'], [['US', 'a-z', 'k3Xp9Qa'], ['EU', 'A-Z', 'Rt81LmZ'], ['IN', '0-9', '7vB2cdE']])}`,
    `<p>Naive: one global primary database and one global counter in the US. Users in India pay 250 ms round trips for every create and redirect cache miss; if the US region fails nobody can create links; a global lock for aliases adds even more cross-ocean latency.</p>`,
    ['What is the simplest way to generate globally unique IDs without talking across regions?', ['Use the same counter in all regions', 'Include a region identifier (or disjoint ID ranges) in the ID so regions can never produce the same value', 'Generate random 3-character codes', 'Ask the user'], 1, 'Disjoint spaces guarantee uniqueness by construction. Each region allocates its own IDs locally and independently.'],
    [`<p>Hint 1: Make IDs unique by <b>construction</b>: partition the ID space by region (prefix bits or separate ranges) so no coordination is needed.</p>`, `<p>Hint 2: Replicate asynchronously across regions; reads are served locally; links are immutable so conflicts are rare.</p>`, `<p>Hint 3: Custom aliases are the real conflict risk: route alias creation to a home region by hash(alias), or use a conditional write on a globally replicated table and accept slower alias creation.</p>`],
    `<p><b>IDs.</b> Reserve the first base62 character for the region (or use the top bits of the 64-bit counter): US = a-z block, EU = A-Z block, IN = 0-9 block. Each region runs its own leased-range allocator, so generated codes are unique with no cross-region call and the creation path is entirely local (&lt; 10 ms). Scramble the counter so codes are not sequential.</p>
<p><b>Storage and replication.</b> Each region has a sharded KV store holding all links. A create is committed in the local region (quorum within the region) and replicated asynchronously to the other regions via a replication log (typical lag 1-2 s). Because a link is immutable once written (only expiry/disable change), there are no write-write conflicts for generated codes. Reads are served from the local region: Redis, then the local store. A cache miss for a link created seconds ago in another region (not yet replicated) falls back to asking the home region (decode the region from the code prefix) — a rare, slightly slower path.</p>
<p><b>Custom aliases.</b> Aliases have no region prefix, so two regions could accept the same alias at the same time. Resolve by giving every alias a <b>home region = hash(alias) mod regions</b>; creating an alias is a conditional insert in the home region (cross-region latency ~100-200 ms, acceptable for a rare action). Reads still hit the local replica. Alternative: globally consistent store (Spanner/DynamoDB global tables with conditional writes) at higher cost.</p>
<p><b>Disable/expire.</b> Disabling a link must propagate quickly: publish an invalidation event to all regions (cache purge) in addition to the replicated row change. Expiry is checked at read time by timestamp.</p>
<p><b>Region outage.</b> DNS/Anycast shifts users to the nearest healthy region. That region can still create links (its own ID range) and serve every link replicated before the outage; the last 1-2 seconds of the failed region\'s creates may be unavailable until it recovers (RPO ≈ replication lag). After recovery, replication catches up in order. Aliases homed in the failed region cannot be created until recovery or a failover of that alias range.</p>`,
    `<p>Creates are O(1) local; replication bandwidth is tiny (40 writes/s × 500 B); reads are served locally at cache speed.</p>`,
    ['How would you let a link owner change the target and have all regions update within a second?', 'How do you choose between active-active and active-passive for this service?']));

  /* ---------------- HARD ---------------- */
  practice.push(P('Notification delivery with failover between providers and no duplicates', 'Hard', ['notifications', 'idempotency', 'reliability'], ['Twilio', 'Stripe'],
    `<p>Your SMS provider A starts failing 30% of requests and timing out on others. You have a second provider B. Design the sender so that notifications still go out, the user rarely receives duplicate SMS, the second provider is not overwhelmed, and you can prove later what happened to each message. Consider the case where provider A accepted the request but your client saw a timeout.</p>`,
    `3,000 SMS/s peak, provider timeouts of 3 s, SMS costs money, OTP validity is 60 s, regulatory rule: no more than 1 identical OTP per request.`,
    `${H.table(['Event', 'Correct action'], [['A returns 503', 'Retry on B (transient), record attempt'], ['A times out (unknown outcome)', 'Check status by message id if possible; do not blindly resend a non-idempotent OTP'], ['A succeeded late and B also sent', 'User gets two SMS — minimise with outcome check and dedup keys']])}`,
    `<p>Naive: on any error immediately resend through provider B and keep retrying both until success. A timeout is ambiguous (the SMS may already be on its way), so this creates duplicates; retries from thousands of workers at once overload B; with no record of attempts you cannot answer "did user 42 get the SMS?".</p>`,
    ['A provider call timed out. What is the correct mental model?', ['The message definitely failed', 'The outcome is unknown; use idempotency keys or status lookup before resending', 'The message definitely succeeded', 'Delete the message'], 1, 'A timeout means "no answer", not "no delivery". Without an idempotency mechanism, retrying can duplicate. Use a stable message id and ask the provider or wait for the delivery receipt.'],
    [`<p>Hint 1: Give every logical notification a stable id and persist an attempt log (state machine) before and after each provider call.</p>`, `<p>Hint 2: Decide per outcome: definite failure (4xx/5xx with body) → fail over; unknown outcome (timeout) → check status / wait for receipt, then decide by message value.</p>`, `<p>Hint 3: Protect provider B with a circuit breaker per provider, weighted routing (shift 30%/70%/100% gradually) and per-provider token buckets.</p>`],
    `<p><b>State machine.</b> Each notification has an id and states <code>QUEUED → ATTEMPTING(provider, attempt_id) → SENT | FAILED | UNKNOWN → DELIVERED | EXPIRED</code>. Before calling a provider the worker writes <code>ATTEMPTING</code> (with the provider\'s client reference id = notification id) to a durable store; after the response it records the outcome. This log is the proof for audits and disputes.</p>
<p><b>Outcome handling.</b> Definite failure (HTTP 5xx/429 with a clear error, connection refused): safe to fail over to B immediately for critical messages; non-critical go through the backoff retry queue. Ambiguous (timeout or connection reset after the request was sent): mark <code>UNKNOWN</code> and (1) if the provider supports client references/idempotency keys, resend to the <i>same</i> provider with the same key (it dedups), or query status by reference; (2) otherwise wait for the delivery receipt webhook for a short window (e.g. 5 s for OTP). If still unknown and the message is an OTP with time left, send via B but <b>invalidate the earlier code and send a new one</b> (the new code supersedes — duplicates become harmless); for an informational message prefer at-most-once and accept a possible loss, or send once more because a duplicate is cheap.</p>
<p><b>Routing and protection.</b> A health-based router tracks success rate and latency per provider over a sliding window. When A\'s error rate passes 20% the circuit opens and traffic shifts to B <b>gradually</b> (weights 70/30 → 30/70 → 0/100) under B\'s own token-bucket quota (its rate limit, plus reserved capacity for critical traffic). Half-open probes send 1% to A to detect recovery. Budget guards cap total spend per hour and alert.</p>
<p><b>Duplicate minimisation.</b> Redis <code>SET NX</code> dedup key per (notification id, channel) with TTL, receipts keyed by the same id, and provider-side collapse/idempotency where available. Expect rare duplicates and design OTP flows so they are harmless (latest code wins).</p>
<p><b>Observability.</b> Per-provider success/latency dashboards, queue age, UNKNOWN count (rising UNKNOWN is a signal of provider trouble), reconciliation job that matches provider delivery reports with our log daily to find silent drops.</p>`,
    `<p>Constant extra work per message (one log write per attempt). Capacity: B must absorb up to 100% of A\'s traffic, so negotiate quota or pre-warm.</p>`,
    ['How would you decide when to stop retrying an informational notification?', 'What changes if the channel is email, where bounces arrive asynchronously?']));

  practice.push(P('Multi-datacenter key-value store: local quorums and conflict resolution', 'Hard', ['key-value store', 'multi-dc', 'consistency'], ['Netflix', 'Apple'],
    `<p>Your Dynamo-style store spans two data centers (US-East, EU-West), each with 3 replicas (N = 6 total). Requirements: users should read their own writes quickly in their home DC; the system must survive losing a whole DC; and concurrent updates in both DCs must not silently lose data for profile settings stored as one JSON document per user. Choose consistency levels, replication, conflict handling and describe failure behaviour. State clearly what is not guaranteed.</p>`,
    `Cross-DC RTT 90 ms, p99 write latency 20 ms for local operations, RPO ≈ seconds, 50K writes/s, values ≤ 20 KB.`,
    `${H.table(['Operation', 'Level', 'Latency'], [['Normal read/write', 'LOCAL_QUORUM (2 of 3 in home DC)', '~2-5 ms'], ['Rare critical read', 'EACH_QUORUM / global quorum', '~100 ms'], ['Cross-DC copy', 'async replication', 'seconds']])}`,
    `<p>Naive: global quorum (4 of 6) for every request — every write waits 90 ms across the ocean and fails when the other DC is unreachable. The opposite naive choice, ONE everywhere with last-write-wins, is fast but silently drops one of two concurrent edits and gives stale reads after failover.</p>`,
    ['Why choose LOCAL_QUORUM for most operations in a two-DC deployment?', ['It is the strongest possible guarantee', 'It gives strong-enough consistency within a DC at local latency and keeps working when the other DC is unreachable', 'It removes the need for replication', 'It makes clocks synchronised'], 1, 'Requests only wait for a majority in the local DC (fast and available during a cross-DC partition), while asynchronous replication keeps the other DC eventually consistent.'],
    [`<p>Hint 1: Treat "within a DC" and "across DCs" as two separate problems with different consistency levels.</p>`, `<p>Hint 2: Concurrent updates in two DCs are inevitable with async replication: detect them (version vectors with a DC id) instead of trusting timestamps.</p>`, `<p>Hint 3: Resolve at the data-model level: split the JSON document into fields (per-field LWW) or use CRDT-style maps so merges are automatic; reserve global quorum for rare critical data.</p>`],
    `<p><b>Replication topology.</b> Each key has 3 replicas in each DC (rack/zone-aware). Writes are coordinated in the user\'s home DC at <b>LOCAL_QUORUM</b> (2 of 3), then the coordinator (or a replication stream) forwards the mutation asynchronously to the remote DC, where it is applied at LOCAL_QUORUM too. Reads use LOCAL_QUORUM. Because R + W = 4 &gt; 3 inside a DC, a user gets <b>read-your-writes</b> as long as they stay in their home DC; sticky routing by user id keeps that true.</p>
<p><b>Conflicts.</b> If the same user changes settings in both DCs within the replication lag (travelling user, failover), the two mutations are concurrent. Each value carries a <b>version vector</b> <code>{US:5, EU:3}</code>. When a replica receives an update that is neither newer nor older (concurrent), it keeps both as siblings. Resolution options, in order of preference: (1) model the profile as <b>independent fields</b> with per-field version stamps so non-overlapping edits merge cleanly; (2) a field-level CRDT (LWW-register per field using hybrid logical clocks, add-wins sets for lists); (3) return siblings and let the application merge. Plain wall-clock LWW is only acceptable for fields where losing an update is harmless, and hybrid logical clocks limit skew damage.</p>
<p><b>DC failure.</b> If EU-West is down, US users are unaffected (LOCAL_QUORUM). EU users fail over to US via traffic management: they now read/write the US replicas; their last few seconds of writes (not yet replicated) are missing until EU recovers — RPO = replication lag, which is documented. On recovery, hinted handoff and repair replay the backlog; concurrent writes made in the meantime are resolved by the version-vector rules.</p>
<p><b>Rare strong operations.</b> For data that must never fork (changing the account email, deleting the account) use EACH_QUORUM or route to a single "home" leader region with a Raft group (CP store), accepting ~100 ms and unavailability if the leader DC is partitioned.</p>
<p><b>Not guaranteed:</b> global linearizability, instantaneous cross-DC visibility, or convergence without repair after long outages. Operationally: monitor replication lag, sibling counts, hinted-handoff backlog; run scheduled cross-DC anti-entropy repairs; test with partition and DC-kill game days.</p>`,
    `<p>Local ops cost 3 replica messages and wait for 2 (O(1), ms). Cross-DC cost is one async stream of 50K writes/s × 20 KB ≈ 1 GB/s worst case — compress and batch, and consider delta/field-level replication.</p>`,
    ['How would you offer read-your-writes to a user whose requests can land in either DC?', 'When would you pick a Spanner-style globally consistent store instead?']));

  practice.push(P('Token-based rate limiting for an LLM API gateway', 'Hard', ['rate limiter', 'ai', 'cost control'], ['OpenAI', 'Anthropic', 'Databricks'],
    `<p>You operate a gateway in front of a large language model. Cost per request depends on prompt tokens (known up front) and output tokens (unknown until the stream ends, up to 8K). Customers have plans with limits in <b>tokens per minute</b> and <b>requests per minute</b> and a maximum number of <b>concurrent streams</b>. Design the limiter so it is fair, prevents one customer from exhausting GPU capacity, can charge actual usage after the fact, and behaves well with streaming responses and client retries.</p>`,
    `100K requests/s at the gateway, streams last up to 60 s, plans: free 20K TPM, pro 400K TPM, enterprise custom; GPU capacity is shared and finite.`,
    `${H.table(['Request', 'Estimated cost', 'Actual cost'], [['Chat, 500 prompt tokens, max_tokens 1000', 'reserve 1,500', 'settles at 700 (refund 800)'], ['Long document, 60K prompt, max_tokens 4000', 'reserve 64,000', 'settles at 61,200']])}`,
    `<p>Naive: count requests per minute only. One request with 100K tokens counts the same as a 10-token ping, so a single customer can consume all GPU capacity. Charging only after the response lets a customer launch hundreds of expensive requests at once; retries after timeouts double-charge or double-run.</p>`,
    ['Why reserve tokens up front and settle after the response?', ['Output length is unknown until the end, but we must not admit more work than the limit allows', 'It is faster', 'Because GPUs need warm-up', 'It avoids authentication'], 0, 'Reserving the worst case (prompt + max_tokens) prevents overshoot; settling the actual usage afterwards refunds unused tokens so customers are charged fairly.'],
    [`<p>Hint 1: Use a token bucket measured in <b>LLM tokens</b>, with cost = prompt tokens + max_tokens at admission, corrected when the stream ends.</p>`, `<p>Hint 2: Three independent limits: TPM bucket, RPM bucket, concurrency counter (semaphore with lease expiry). A request must pass all.</p>`, `<p>Hint 3: Protect shared capacity with weighted fair queuing per customer plus a global admission limit; make retries safe with idempotency keys.</p>`],
    `<p><b>Admission.</b> On request arrival the gateway counts prompt tokens (fast local tokenizer), computes <code>reserve = prompt + min(max_tokens, plan cap)</code> and runs one atomic Redis Lua script on the customer\'s shard that: (1) refills the TPM bucket, (2) checks the RPM bucket, (3) checks concurrency (a set of active stream ids with leases), and (4) if all pass, subtracts <code>reserve</code> tokens, adds 1 to RPM use and registers the stream id with a lease of 90 s. Otherwise it returns 429 with <code>Retry-After</code> and the header showing which limit tripped (tokens, requests, or concurrency).</p>
<p><b>Settlement.</b> When the stream finishes (or is cancelled/times out) the gateway reports <code>actual</code> tokens; a second script credits <code>reserve − actual</code> back to the bucket (capped at capacity), releases the concurrency slot, and writes the usage event to a billing log (Kafka → ledger). If the gateway crashes the lease expires and the reserve is treated as spent; a reconciler corrects billing from the model server\'s own counters, which are the source of truth.</p>
<p><b>Fairness and capacity.</b> Per-customer limits alone cannot protect the GPU pool if the sum of limits exceeds capacity. Add a global admission controller: requests enter per-customer queues served by <b>weighted fair queuing</b> (weights by plan) with a bounded queue and deadline; under overload, shed free tier first (429/503 with Retry-After) while enterprise keeps its reserved share. Use a smaller prompt-cost multiplier for cached prefixes if the platform offers prompt caching.</p>
<p><b>Retries.</b> Clients send an <code>Idempotency-Key</code>; the gateway remembers key → request state for a few minutes so a retry after a timeout either attaches to the running stream or returns the stored result instead of running and charging twice. Document exponential backoff with jitter, and return structured <code>retry-after-ms</code>.</p>
<p><b>Failure.</b> Redis shard down: fail-closed for expensive models (cost risk), with a conservative local per-gateway budget as fallback; fail-open only for cheap models. Observability: tokens admitted vs settled, refund ratio (reveals over-reserving by clients who set huge max_tokens), 429 rate per plan, queue wait times, GPU utilisation.</p>`,
    `<p>O(1) Redis operations per admission and per settlement; queue operations O(log customers). State per customer is a handful of counters plus the active-stream set (bounded by the concurrency cap).</p>`,
    ['How do you stop customers from always setting max_tokens to the maximum to game "reserve"?', 'How would you add a monthly spend cap with hard stop and soft warning?']));

  practice.push(P('Take down a malicious short link everywhere within 60 seconds', 'Hard', ['url shortener', 'cache invalidation', 'abuse'], ['Google', 'Microsoft'],
    `<p>Security reports that a short link serving malware has 40K clicks/min. You must disable it globally within 60 seconds. The link is cached in Redis in 3 regions, on a CDN (TTL 5 minutes), in browsers (some links use 301), and in in-process caches on 2,000 app servers. Design the takedown pipeline and the changes to the original design that make fast, reliable invalidation possible. Also handle bulk takedown (a whole malicious campaign of 100K links) and appeals.</p>`,
    `Takedown propagation &lt; 60 s p99, no downtime for good links, 12K redirects/s, 3 regions, CDN and browsers outside direct control.`,
    `${H.table(['Layer', 'Cache TTL before', 'Takedown mechanism'], [['App in-process', '5 s', 'Subscribe to disable events'], ['Redis (3 regions)', '1 h', 'DEL + tombstone'], ['CDN', '5 min', 'Purge API / surrogate-key'], ['Browser', 'forever (301)', 'Cannot recall: do not use 301 for user links']])}`,
    `<p>Naive: set <code>disabled = true</code> in the database and wait. Redis keeps serving the cached redirect for up to an hour, the CDN for 5 minutes, app server caches until restart, and browsers that stored a 301 never ask again. The malware campaign continues for hours.</p>`,
    ['Why is the original choice of 302 (not 301) important for abuse takedown?', ['302 is faster', 'Browsers do not cache 302 by default, so every click reaches us and a disabled link stops working at once', '302 hides the URL', '301 cannot be logged'], 1, 'A cached 301 cannot be recalled, so permanent redirects for user-generated links make takedown impossible for returning browsers.'],
    [`<p>Hint 1: List every cache layer between the user and the source of truth, and for each one decide how a "disable" event reaches it.</p>`, `<p>Hint 2: Combine push (event bus broadcasts disable events, CDN purge API) with pull safety nets (short TTLs, version checks).</p>`, `<p>Hint 3: Plan for scale (100K links at once) with batching, and for mistakes (appeals, reversible disable with a "tombstone version").</p>`],
    `<p><b>Design principle.</b> The database row is the truth; every cache layer must be (a) short-lived enough to bound staleness, and (b) reachable by an explicit invalidation. Redirects use <b>302</b> with <code>Cache-Control: private, max-age=0</code> (or a few seconds) for user-generated links, so browsers do not retain them.</p>
<p><b>Takedown pipeline.</b> (1) An abuse tool calls <code>POST /internal/links/{code}/disable</code>. The service writes <code>status = BLOCKED, version++</code> to the primary store with a quorum write (this alone makes any cache miss correct). (2) It publishes a <code>LinkDisabled(code, version)</code> event on a replicated message bus with a dedicated high-priority topic delivered to all regions. (3) Subscribers act: each region\'s Redis consumer does <code>SET url:{code} BLOCKED EX 3600</code> (a short-lived "blocked" marker, safer than DEL because it also stops stampedes to the DB); app servers subscribe too and evict their in-process entry (or simply keep in-process TTL at 5 s as a backstop); a CDN worker calls the purge API with a surrogate key for this code. (4) Acknowledgements are collected in an audit table; a watchdog re-publishes any region that has not acked in 20 s and alerts after 45 s.</p>
<p><b>Safety nets.</b> Version-stamped cache entries: the app compares the cached version with a tiny per-region "blocklist version" or a Bloom filter of blocked codes refreshed every 5 s, so even if an event is lost the link dies within seconds. CDN TTL for redirects is short (30-60 s) since the app tier can absorb the load.</p>
<p><b>Bulk campaigns.</b> Accept a list or pattern (same destination domain, same creator) and write blocked rows in batches, publish one event per batch carrying up to 1,000 codes, and use CDN purge-by-tag (e.g. tag = destination host or campaign id) instead of 100K individual purges. Rate-limit the purge API to stay within vendor limits and prioritise highest-traffic codes first.</p>
<p><b>Landing page and appeals.</b> A blocked link returns <b>451/410</b> with a warning interstitial (not a redirect) and an appeal link. Appeals set status back via the same pipeline; old tombstone versions are kept so ordering is clear (version numbers prevent an old "enable" from overriding a newer "disable"). Prevention: scan new URLs against threat-intel feeds at creation, re-scan existing links periodically (targets can turn malicious later), rate-limit creation per account.</p>`,
    `<p>Single link: O(layers) operations, typically 1-5 s end to end. Bulk: O(batches) bus events plus purge-by-tag calls, finishing well inside the 60 s target.</p>`,
    ['How would you detect that a previously safe destination became malicious?', 'How do you test this pipeline regularly without disabling real links?']));

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'A URL shortener must support 6 billion links. What is the smallest base62 code length that can hold them comfortably?', options: ['4 characters', '5 characters', '7 characters (62^7 ≈ 3.5 trillion)', '16 characters'], answer: 2, explain: '62^5 ≈ 916 million is too small, 62^6 ≈ 56.8 billion barely fits, and 62^7 ≈ 3.5 trillion gives plenty of headroom for 6 billion links.' });
  quiz.push({ q: 'Two users request the same custom alias at the same time. What guarantees only one succeeds?', options: ['SELECT then INSERT in the application', 'A unique key plus an atomic conditional insert in the database', 'A bigger cache', 'A longer alias'], answer: 1, explain: 'Check-then-insert is a race. The database must arbitrate with a unique constraint or conditional write so exactly one insert wins.' });
  quiz.push({ q: 'Why do shorteners that offer click analytics usually answer with 302 instead of 301?', options: ['302 is cheaper to compute', 'Browsers cache 301, so repeat clicks would never reach the server', '301 cannot include a Location header', '302 is encrypted'], answer: 1, explain: 'A cached permanent redirect bypasses the shortener on later visits, so clicks are not counted and the target cannot be changed or expired reliably.' });
  quiz.push({ q: 'In Pastebin, why is the paste content stored in object storage and only metadata in the database?', options: ['Databases cannot store text', 'Terabytes of blobs are cheaper, more durable and easier to scale in object storage; the DB keeps small queryable rows', 'Object storage is faster than Redis', 'It is required by HTTP'], answer: 1, explain: 'Object storage is built for large immutable objects (cheap per GB, highly durable, elastic). The database stays small and fast for lookups and expiry queries.' });
  quiz.push({ q: 'When writing to both object storage and a metadata DB for a new paste, which order is safer?', options: ['Metadata first, then blob', 'Blob first, then metadata', 'Both at the same time, ignore failures', 'Order does not matter'], answer: 1, explain: 'If the process crashes in between, blob-first leaves an invisible orphan blob (cleaned later). Metadata-first leaves a visible row pointing to nothing, causing user-facing errors.' });
  quiz.push({ q: 'A token bucket has capacity 10 and refills 2 tokens per second. A client has been idle for a long time. How many requests can it send instantly, and what is its long-run average?', options: ['2 instantly, 10 per second', '10 instantly, 2 per second', '20 instantly, 2 per second', '10 instantly, 10 per second'], answer: 1, explain: 'Capacity is the maximum burst (10). The refill rate is the sustained average (2 per second).' });
  quiz.push({ q: 'What is the main weakness of a fixed window counter?', options: ['It uses too much memory', 'A client can send up to 2× the limit around a window boundary', 'It cannot be implemented in Redis', 'It rejects all bursts'], answer: 1, explain: 'With 100 requests at 12:00:59 and 100 more at 12:01:00, both windows are within their limit, yet 200 requests arrived within two seconds.' });
  quiz.push({ q: 'Why should a Redis-based limiter use a Lua script (or equivalent) for its check?', options: ['Lua is faster than C', 'It makes read-refill-subtract-write one atomic step, avoiding races between gateways', 'It encrypts the counters', 'It avoids the need for EXPIRE'], answer: 1, explain: 'Separate GET and SET commands from different gateways can interleave and both see "1 token left". A script runs without interleaving.' });
  quiz.push({ q: 'The rate-limit store becomes unreachable. For a normal read endpoint the best default policy is usually:', options: ['Fail-closed: reject everything', 'Fail-open with a local fallback limiter, while failing closed on abuse-sensitive endpoints', 'Crash the gateway', 'Block only paying customers'], answer: 1, explain: 'A limiter must not become the cause of an outage. Let normal traffic through (with rough local protection) and be strict where abuse is expensive, such as login or SMS.' });
  quiz.push({ q: 'OTP messages are delayed by a huge marketing campaign sharing the same queue. The most robust fix is:', options: ['Add a priority field to the single queue only', 'Separate queues/topics with dedicated worker pools and reserved provider quota per priority', 'Retry OTPs more often', 'Make marketing run at night only'], answer: 1, explain: 'Physical isolation prevents a flood in one class from consuming capacity of another; sorting inside one shared system does not.' });
  quiz.push({ q: 'A notification worker sent a push, then crashed before acknowledging the queue message. What property does the system need to avoid showing the user two pushes?', options: ['Exactly-once networking', 'Idempotent sends via a dedup key (and provider collapse key)', 'A faster queue', 'Larger batches'], answer: 1, explain: 'Delivery is at-least-once, so duplicates are possible. A stable dedup key makes the second attempt a no-op.' });
  quiz.push({ q: 'In a Dynamo-style store with N = 3, which setting can return stale reads even when no replica is down?', options: ['W = 2, R = 2', 'W = 3, R = 1', 'W = 1, R = 1', 'W = 1, R = 3'], answer: 2, explain: 'R + W = 2 is not greater than N = 3, so the replica read may not be among those that received the latest write.' });
  quiz.push({ q: 'Why does a key-value store write a tombstone when a key is deleted?', options: ['To save disk space', 'So the delete replicates and wins against older copies; otherwise a stale replica can resurrect the data', 'To speed up reads', 'To compress the log'], answer: 1, explain: 'A plain erase leaves no record. A tombstone is a versioned write that propagates and overrides older values until it is safely compacted away.' });
  quiz.push({ q: 'What problem do virtual nodes on a consistent-hash ring solve?', options: ['They remove the need for replication', 'They spread each machine\'s load and make adding/removing machines move small slices from many peers', 'They guarantee strong consistency', 'They encrypt data'], answer: 1, explain: 'Each physical node owns many small scattered ranges, which evens out load and spreads rebalancing work.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ level: 'B', q: 'Walk me through designing a URL shortener in 5 minutes.',
    a: `<p>Clarify requirements first: shorten, redirect, optional alias/expiry/analytics; redirects must be fast and highly available. Estimate: ~100M links/month = ~40 writes/s, 100:1 reads = ~4K reads/s, 6B rows in 5 years = ~3 TB, so 7 base62 characters (3.5 trillion) are plenty. API: <code>POST /v1/urls</code> and <code>GET /{code}</code> returning 302. Data: key-value table keyed by code. Architecture: load balancer, stateless app servers, Redis cache-aside in front of a sharded KV store, ID generation via leased counter ranges encoded in base62 (with a scramble if codes must be unguessable), analytics events through a queue. Then deep dives: collisions, hot keys, expiry, abuse.</p>`,
    followUps: ['Why not hash the URL and take the first 7 characters?', 'What happens when the ID generator is down?'] });
  interview.push({ level: 'B', q: 'How do you generate unique short codes without collisions?',
    a: `<p>Use a unique number and encode it in base62. A global counter works but is a single point of failure, so give each app server a leased block of IDs (for example 1,000) from a coordinator such as etcd or a DB sequence; the server hands them out locally without any network call. Lost IDs on a crash are irrelevant in a 3.5-trillion space. If codes must not be guessable, pass the number through a reversible scramble (Feistel/multiplicative permutation) before encoding. The alternative, hashing and truncating, gives free dedupe but needs a conditional-insert retry loop because collisions appear as the table fills.</p>`,
    followUps: ['How would you make it work across regions?', 'How do you decode a code back to its ID?'] });
  interview.push({ level: 'I', q: 'Why is Pastebin different from a URL shortener, and how does that change the storage design?',
    a: `<p>The payload is large (KB to MB) instead of a few hundred bytes. Request rates are low but bytes add up: 1M pastes a day at 10 KB is ~18 TB over five years. So content goes to object storage (cheap, durable, elastic), and the database holds only small metadata rows with a blob key, expiry and visibility. Write the blob first, then the metadata row, so a crash leaves an invisible orphan rather than a dangling row. Add a CDN for public pastes, Redis for small hot ones, a sweeper plus lifecycle rules for expiry, and a security story for untrusted content: serve raw text from a separate domain, nosniff, size limits and abuse scanning.</p>`,
    followUps: ['How would you support burn-after-reading?', 'How do you deduplicate identical pastes?'] });
  interview.push({ level: 'I', q: 'Compare token bucket, leaky bucket, fixed window and sliding window rate limiting.',
    a: `<p><b>Token bucket</b>: tokens refill at a steady rate up to a capacity; each request takes one — allows bursts, two numbers per key. <b>Leaky bucket</b>: requests enter a queue that drains at a fixed rate — smooths output, adds latency. <b>Fixed window</b>: one counter per clock window — simplest, but allows 2× the limit across a boundary. <b>Sliding window log</b>: stores timestamps — exact but memory grows with the limit. <b>Sliding window counter</b>: weights the previous and current window counts — near-exact with two counters. For public APIs I default to a token bucket (bursts are normal) and use sliding-window counters when smooth per-minute semantics are required.</p>`,
    followUps: ['Which would you use for login attempts?', 'How do you implement token bucket without a timer thread?'] });
  interview.push({ level: 'I', q: 'How do you make a distributed rate limiter accurate across many servers?',
    a: `<p>Put the state in a shared store (Redis) and make the whole decision atomic with a Lua script: compute the refill from the store's own clock, check, subtract and write back in one step. Shard by key (user or API key) so each check touches one shard. To cut latency or load, use local-first counters synced periodically, accepting overshoot of roughly servers times sync interval times rate; for hot global limits, lease quota slices to gateways. Decide the failure policy up front (fail-open with local limits for ordinary endpoints, fail-closed for abuse-sensitive ones) and expose standard headers plus <code>Retry-After</code>.</p>`,
    followUps: ['What if one customer is a hot key?', 'How would you do multi-region limiting?'] });
  interview.push({ level: 'I', q: 'How would you design priority handling in a notification system?',
    a: `<p>Classify by notification type on the server (OTP and fraud = critical, order updates = normal, marketing = low) rather than letting callers choose. Use separate topics or queues per class with dedicated worker pools and reserved provider rate-limit capacity, so a 10M-message campaign cannot delay an OTP. Inside shared pools use weighted fair scheduling with aging so low priority is delayed, not starved. Give critical messages short expiries, bypass quiet hours and frequency caps, and monitor the age of the oldest message per queue as the main health metric.</p>`,
    followUps: ['What if the critical SMS provider fails?', 'How do campaigns avoid flooding the system?'] });
  interview.push({ level: 'I', q: 'How do you avoid sending duplicate notifications?',
    a: `<p>Assume at-least-once delivery, since exactly-once across networks is not achievable, and make duplicates harmless. Every notification carries a stable dedup key (for example <code>order_shipped:A991:push</code>); the API and senders do an atomic <code>SET NX</code> with a TTL before sending. Pass the id to providers as an idempotency or collapse key (FCM collapse_key, APNs collapse-id) so even a double call shows once. Choose the order consciously: claim-then-send risks a lost message on crash, send-then-claim risks a rare duplicate; pick per message value, and for OTPs make the newest code supersede older ones.</p>`,
    followUps: ['What if the dedup store loses data?', 'What about a timeout from the provider?'] });
  interview.push({ level: 'A', q: 'Explain how a Dynamo-style key-value store partitions, replicates and keeps replicas in sync.',
    a: `<p>Keys and nodes are hashed onto a ring; a key belongs to the next node clockwise and is replicated to the next N distinct nodes (the preference list), spread over racks and zones. Virtual nodes smooth load and make rebalancing incremental. Any node can coordinate: writes go to all N replicas and succeed after W acks; reads ask R replicas and return the highest version. Choosing R + W &gt; N makes read and write sets overlap. Temporary failures are covered by hinted handoff; staleness is fixed by read repair and Merkle-tree anti-entropy; membership uses gossip; concurrent versions are detected with vector clocks or resolved with last-write-wins.</p>`,
    followUps: ['What does R + W > N not guarantee?', 'How do tombstones fit in?'] });
  interview.push({ level: 'A', q: 'Does R + W > N give you strong consistency? Be precise.',
    a: `<p>No, it gives overlap, not linearizability. Problems remain: sloppy quorums and hinted handoff can place writes on nodes outside the preference list so a later read set misses them; concurrent writers without proper versioning can both succeed and conflict; a write that fails with fewer than W acks may still be visible on some replicas; clocks used for last-write-wins can pick the wrong winner; and reads during membership changes may use different replica sets. Real linearizability needs a single ordering mechanism, such as a consensus log (Raft or Paxos) per shard, at the cost of availability on the minority side of a partition.</p>`,
    followUps: ['How do session guarantees like read-your-writes help?', 'When would you choose a Raft-based store instead?'] });
  interview.push({ level: 'I', q: 'What is an LSM tree and why do key-value stores use it?',
    a: `<p>A log-structured merge tree optimises writes by avoiding in-place updates. A write is appended to a write-ahead log for durability and inserted into a sorted in-memory memtable. When the memtable fills, it is flushed as an immutable sorted file (SSTable). Background compaction merges SSTables, keeping the newest version of each key and dropping tombstones. Reads check the memtable and then SSTables from newest to oldest, using Bloom filters and indexes to skip files. It gives high write throughput with sequential I/O at the cost of read and write amplification and compaction overhead.</p>`,
    followUps: ['Size-tiered vs leveled compaction?', 'How does a Bloom filter help reads?'] });
  interview.push({ level: 'A', q: 'How would you choose N, R and W for a shopping cart, a session store and an account balance?',
    a: `<p>Cart: N = 3, W = 2, R = 2 with sibling merging (OR-set), because adds must never fail and a lost item is worse than a stale one. Session store: N = 3, W = 1, R = 1; speed matters and a lost session means a re-login. Account balance: not an AP quorum store at all. It needs atomic read-modify-write and linearizability, so use a transactional database or a Raft-replicated CP store, where a minority partition refuses writes instead of risking a double spend. The principle is to match the consistency level to the business cost of stale or conflicting data, then state what the store does not guarantee.</p>`,
    followUps: ['What if the business wants carts to be consistent across regions?', 'How do you detect conflicts?'] });
  interview.push({ level: 'I', q: 'Your design depends on Redis for caching, rate limiting and deduplication. What happens when it fails and how do you limit the blast radius?',
    a: `<p>List each use and its failure policy. Cache-aside: the app falls back to the database; protect it with request coalescing, short in-process caches and rate limits so the stampede does not melt it. Rate limiting: fail-open with a local limiter for normal endpoints, fail-closed on sensitive ones, with a circuit breaker so timeouts do not add latency. Dedup: accept rare duplicates for informational messages, but for money-like operations use the database with unique constraints as the source of truth. Reduce blast radius by sharding with replicas, separate clusters per use case, timeouts of a few ms, and regular failure drills.</p>`,
    followUps: ['Should cache and limiter share a cluster?', 'How do you warm a cold cache safely?'] });
  interview.push({ level: 'E', q: 'You have 45 minutes for a system design interview. How do you split your time across a case study like these?',
    a: `<p>Roughly: 5 minutes on requirements and scope (functional, non-functional, what is out of scope); 5 minutes on estimates that drive decisions (QPS, storage, bandwidth) — say what the numbers imply; 5 minutes on API and data model; 10 minutes on the high-level diagram, walking one write and one read through it; 15 minutes on deep dives chosen with the interviewer (ID generation, caching, consistency, failure handling, the hot spot of this particular system); and 5 minutes on trade-offs, bottlenecks and how you would monitor and evolve it. Keep checking in, and name trade-offs explicitly instead of presenting one answer as the only option.</p>`,
    followUps: ['What do you do when the interviewer pushes on a weak spot?', 'How do you decide which deep dive matters most?'] });

  registerModule({
    id: 'hld14',
    title: 'Case Studies I: URL Shortener, Pastebin, Rate Limiter, Notifications, KV Store',
    intro: `<p>This is where the earlier HLD modules come together. We design five classic systems end to end, always in the same interview-ready frame: <b>requirements → back-of-envelope estimates → API → data model → high-level architecture → deep dives → trade-offs</b>. You will meet ID generation and base62 in the <b>URL Shortener</b>, blob storage and expiry in <b>Pastebin</b>, token buckets and atomic counters in the <b>Rate Limiter</b>, queues, priorities and retries in the <b>Notification System</b>, and partitioning, quorums and LSM storage in the <b>Distributed Key-Value Store</b>. Every topic has animated visualizers (request flows through architecture boxes, base62 steps, token refills, priority queues, quorum reads and writes), worked examples, variants (custom aliases, analytics, expiry, per-user vs global limits, priority notifications, tunable consistency) and 14 practice problems.</p>`,
    goals: [
      'Run the full six-step design frame on any of the five systems in 35-45 minutes, with numbers that drive each decision',
      'Generate unique short codes with base62 and leased counter ranges, and explain cache-aside, 301 vs 302, expiry and analytics',
      'Separate metadata from large blobs (Pastebin) and order multi-system writes so failures leave only harmless orphans',
      'Choose a rate-limiting algorithm, make the check atomic in Redis, and decide fail-open vs fail-closed',
      'Design priority-isolated notification pipelines with idempotent sends, retries with jitter and dead-letter queues',
      'Explain Dynamo-style partitioning, N/R/W quorums, hinted handoff, read repair, tombstones and LSM storage, and say what they do not guarantee'
    ],
    prereqs: `HLD 3 (Estimation &amp; the Interview Framework), HLD 6 (Caching), HLD 7 (Consistent Hashing), HLD 8 (Messaging &amp; Streaming), HLD 9 (APIs, Gateways &amp; Rate Limiting) and HLD 10 (Distributed Systems Theory) are strongly recommended before this module.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
