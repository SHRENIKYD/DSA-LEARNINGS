(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small shared helpers for the visualizers in this module ---------- */
  function words(input) { return String(input == null ? '' : input).trim().split(/[\s,;]+/).filter(Boolean); }
  function host(u) { var s = String(u).toLowerCase().replace(/^https?:[/][/]/, ''); var i = s.indexOf('/'); return i < 0 ? s : s.slice(0, i); }

  /* ================= TOPIC 1: WEB CRAWLER ================= */
  topics.push({
    title: 'Design a Web Crawler: URL Frontier, Politeness, robots.txt & Dedupe',
    analogy: `<p>Picture a <b>librarian who must copy every book in every library in the country</b>. She keeps a giant to-do list of book addresses. Two rules keep her welcome: she never sends more than one helper into the same small library at a time (otherwise the librarian there throws her out), and she always reads the sign on the door ("no copying in the rare-books room"). She also keeps a list of books already copied, because many books are listed in ten other books' bibliographies.</p>
      <p>That is a web crawler: a <b>to-do list (the URL frontier)</b>, a <b>politeness rule per website</b>, the <b>door sign (robots.txt)</b>, and a <b>"seen it" list (dedupe)</b>.</p>`,
    explain: `<p><b>Goal:</b> download a large part of the public web (for a search index, an LLM training corpus or an archive), keep it fresh, and never hammer any single website.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> start from seed URLs; fetch pages; extract links; add new links to the to-do list; store page content; re-crawl pages so the copy stays fresh; obey <code>robots.txt</code>.</li>
        <li><b>Non-functional:</b> <b>polite</b> (at most one open connection per host and a delay between hits); <b>scalable</b> to billions of pages; <b>robust</b> against spider traps, huge files, broken HTML and slow servers; <b>extensible</b> (new content types, new parsers); prioritise important pages.</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Pages per month', '1 billion pages fetched per month', '1B / (30 × 86,400) ≈ <b>400 pages/s</b>, peak ≈ 800/s'],
        ['Average page', '~100 KB HTML (compressed ≈ 20 KB)', '400 × 100 KB ≈ <b>40 MB/s</b> download ≈ 320 Mbit/s'],
        ['Storage per month', '1B × 100 KB', '≈ <b>100 TB/month</b> raw, ≈ 20 TB compressed'],
        ['Seen-URL set', '10B URLs ever seen × 8-byte hash', '≈ <b>80 GB</b> - too big for one box, shard it or use a Bloom filter'],
        ['Hosts', '~100M distinct hosts, very skewed', 'Frontier must hold millions of per-host queues']
      ])}
      <p>The insight: bandwidth is cheap; <b>the real limits are politeness (per-host speed) and duplicate detection</b>. A naive crawler with 1,000 threads would send 1,000 requests to Wikipedia in one second and get banned.</p>
      <h4>3. APIs (internal)</h4>
      ${H.table(['Call', 'Who', 'Notes'], [
        ['<code>POST /frontier/urls</code> {urls[], priority, discovered_from}', 'Parsers', 'Batched. The frontier normalises, dedupes, then queues.'],
        ['<code>GET /frontier/next?worker=w7&amp;max=50</code>', 'Fetchers', 'Returns URLs whose host is ready (politeness timer expired), each with a lease.'],
        ['<code>POST /frontier/done</code> {url, status, etag, next_recrawl}', 'Fetchers', 'Releases the host, schedules the next crawl.'],
        ['<code>PUT /store/pages/{url_hash}</code>', 'Fetchers', 'Content + headers into a blob store (WARC files on S3/HDFS).']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>URL record:</b> <code>url_hash → (url, host, last_fetch, etag, last_modified, content_hash, priority, next_fetch_at, fail_count)</code> in a wide-column store (Bigtable / Cassandra), sharded by host hash so one host lives on one shard.</li>
        <li><b>Host record:</b> <code>host → (ip, robots_rules, robots_fetched_at, crawl_delay, next_allowed_at, error_rate)</code>.</li>
        <li><b>Content:</b> large append-only WARC files in object storage; a <code>content_hash → url_hash</code> index finds exact duplicates; SimHash fingerprints find near-duplicates.</li>
      </ul>
      <h4>5. High-level design</h4>
      <ol>
        <li><b>URL frontier</b>: front queues by <b>priority</b> (PageRank-ish score, freshness need), back queues <b>one per host</b>, and a min-heap keyed by "host may be hit again at time T".</li>
        <li><b>Fetcher workers</b> pull ready URLs, resolve DNS (through a <b>local DNS cache</b> - DNS is a classic hidden bottleneck), check robots rules, download with timeouts and a size cap.</li>
        <li><b>Parser / extractor</b> pulls links and text, <b>normalises</b> URLs (lowercase host, drop default port and #fragment, sort query params, strip session ids).</li>
        <li><b>URL filter + dedupe</b>: Bloom filter, then the exact seen-set; new URLs go back to the frontier.</li>
        <li><b>Content dedupe</b>: hash of the body; if seen, store only a pointer.</li>
      </ol>
      <p>The visualizer below runs a tiny frontier: per-host queues and a "next allowed time" for each host. Watch how the crawler interleaves hosts instead of draining one site.</p>`,
    clues: [
      '"crawl billions of pages" / "build a search index" → <b>URL frontier + distributed fetchers + dedupe</b>',
      '"do not overload websites" / "be polite" → <b>one queue per host</b> and a per-host delay (crawl-delay, adaptive to response time)',
      '"obey site rules" → fetch and cache <b>robots.txt</b> per host before any page on it',
      '"same page under many URLs" → <b>URL normalisation</b> + seen-set (Bloom filter) and content hash / SimHash for near-duplicates',
      '"keep the index fresh" → per-URL <b>re-crawl schedule</b> using change rate, ETag / If-Modified-Since',
      '"crawler gets stuck on a calendar site" → <b>spider trap</b> defences: depth / URL length limits, per-host page budget'
    ],
    code: [{
      lang: 'js', run: true, title: 'URL frontier with per-host politeness, normalisation, robots rules and dedupe (runnable)',
      code: `// A tiny single-process model of a crawler's URL frontier.
// Each host has its own FIFO queue; a min-heap orders hosts by the time they may be hit next.

class MinHeap {
  constructor(less) { this.a = []; this.less = less; }
  size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!this.less(a[i], a[p])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

// Normalise: lowercase scheme and host, drop fragment and default port, sort query params.
function normalise(raw) {
  const u = new URL(raw);
  u.hash = '';
  if ((u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443')) u.port = '';
  const params = [...u.searchParams.entries()].filter(([k]) => k !== 'sessionid').sort();
  u.search = '';
  for (const [k, v] of params) u.searchParams.append(k, v);
  return u.toString();
}

class Frontier {
  constructor(delayMs, robots) {
    this.delay = delayMs;          // politeness gap per host
    this.robots = robots;          // host -> list of disallowed path prefixes
    this.seen = new Set();         // exact seen-set (a Bloom filter in front at scale)
    this.queues = new Map();       // host -> array of URLs (back queues)
    this.ready = new MinHeap((x, y) => x.at < y.at || (x.at === y.at && x.host < y.host));
  }
  add(raw) {
    const url = normalise(raw), u = new URL(url);
    if (this.seen.has(url)) return 'dup';
    this.seen.add(url);
    const rules = this.robots[u.host] || [];
    if (rules.some((p) => u.pathname.startsWith(p))) return 'robots-blocked';
    if (!this.queues.has(u.host)) { this.queues.set(u.host, []); this.ready.push({ host: u.host, at: 0 }); }
    this.queues.get(u.host).push(url);
    return 'queued';
  }
  // Return the next URL whose host is allowed at time now (or null), plus when to try again.
  next(now) {
    while (this.ready.size()) {
      const top = this.ready.pop();
      const q = this.queues.get(top.host);
      if (!q.length) { this.queues.delete(top.host); continue; }   // host drained
      if (top.at > now) { this.ready.push(top); return { url: null, wake: top.at }; }
      const url = q.shift();
      this.ready.push({ host: top.host, at: now + this.delay });      // politeness timer
      return { url, wake: now };
    }
    return { url: null, wake: -1 };
  }
}

const f = new Frontier(1000, { 'b.com': ['/private'] });
const input = [
  'https://A.com/1#top', 'https://a.com:443/1', 'https://a.com/2?y=2&x=1', 'https://a.com/2?x=1&y=2',
  'https://a.com/3', 'https://b.com/1', 'https://b.com/private/x', 'https://c.com/1', 'https://b.com/2'
];
for (const u of input) console.log(f.add(u).padEnd(15), u);

let now = 0, fetched = 0;
while (fetched < 20) {
  const r = f.next(now);
  if (r.url) { console.log('t=' + String(now).padStart(4) + 'ms fetch ' + r.url); fetched++; now += 100; }
  else if (r.wake < 0) break;
  else now = r.wake;                      // sleep until the next host is allowed
}
console.log('fetched', fetched, 'pages; never hit a host twice within 1000 ms');
`
    }],
    codeTitle: ['URL frontier with politeness + dedupe (JavaScript, runnable)'],
    viz: [{
      title: 'URL frontier: per-host queues and politeness timers',
      input: 'a.com/1 a.com/2 a.com/3 b.com/1 b.com/2 c.com/1 a.com/1 | delay=3',
      inputLabel: 'URLs (host/path), then "| delay=N" ticks between hits to one host',
      gen: function (input) {
        var raw = String(input || '');
        var parts = raw.split('|'), delay = 3;
        var dm = /delay\s*=\s*(\d+)/.exec(parts[1] || '');
        if (dm) delay = Number(dm[1]);
        if (!(delay >= 1 && delay <= 6)) throw new Error('delay must be 1-6, e.g. "a.com/1 b.com/1 | delay=3"');
        var urls = words(parts[0]).slice(0, 14);
        if (urls.length < 2) throw new Error('Give at least two URLs like a.com/1 b.com/2');
        var frames = [], queues = {}, order = [], seen = {}, nextAt = {}, log = [];
        function mapPart(hlKey) {
          var e = order.filter(function (h) { return queues[h]; }).map(function (h) { return [h, (queues[h].length ? queues[h].join(', ') : '(empty)') + '  · next allowed t=' + nextAt[h]]; });
          var hl = {}; if (hlKey) hl[hlKey] = 'cur';
          return { type: 'map', label: 'Back queues: one FIFO per host', entries: e.length ? e : [['(none)', '-']], hl: hl };
        }
        urls.forEach(function (u) {
          var key = u.toLowerCase();
          if (seen[key]) {
            frames.push({ narr: 'Discovered <b>' + u + '</b> again. The seen-set already has it, so it is <b>dropped</b>. Without dedupe, popular pages (linked from millions of places) would be fetched millions of times.', parts: [mapPart(), { type: 'set', label: 'Seen-set', items: Object.keys(seen), hl: (function () { var o = {}; o[key] = 'bad'; return o; })() }] });
            return;
          }
          seen[key] = 1;
          var h = host(u);
          if (!queues[h]) { queues[h] = []; order.push(h); nextAt[h] = 0; }
          queues[h].push(u);
          frames.push({ narr: 'Add <b>' + u + '</b> to the back queue of host <b>' + h + '</b>. Grouping by host is what lets us be polite: one host = one queue = one fetch at a time.', parts: [mapPart(h), { type: 'set', label: 'Seen-set', items: Object.keys(seen), hl: (function () { var o = {}; o[key] = 'ok'; return o; })() }] });
        });
        var t = 0, guard = 0;
        while (guard++ < 60) {
          var left = order.filter(function (h) { return queues[h] && queues[h].length; });
          if (!left.length) break;
          var ready = left.filter(function (h) { return nextAt[h] <= t; }).sort(function (a, b) { return nextAt[a] - nextAt[b] || (a < b ? -1 : 1); });
          if (!ready.length) {
            var wake = Math.min.apply(null, left.map(function (h) { return nextAt[h]; }));
            frames.push({ narr: 'Tick t=' + t + ': every host with work is still cooling down. The fetcher <b>waits until t=' + wake + '</b> instead of breaking politeness. (A real crawler has millions of hosts, so some host is almost always ready.)', parts: [mapPart(), { type: 'vars', vals: { t: t, 'next wake': wake, delay: delay } }] });
            t = wake; continue;
          }
          var h2 = ready[0], u2 = queues[h2].shift();
          nextAt[h2] = t + delay;
          log.push(['t=' + t, h2, u2]);
          frames.push({ narr: 'Tick t=' + t + ': host <b>' + h2 + '</b> is allowed, so fetch <b>' + u2 + '</b>. Its timer moves to t=' + (t + delay) + ' - no other request to ' + h2 + ' until then.', parts: [mapPart(h2), { type: 'table', label: 'Fetch log', columns: ['time', 'host', 'url'], rows: log.slice(), hl: (function () { var o = {}; o[log.length - 1] = 'ok'; return o; })() }] });
          t += 1;
        }
        frames.push({ narr: 'Done: ' + log.length + ' fetches. Notice the order <b>interleaves hosts</b>: the crawler is fast overall but gentle with each site. Throughput comes from <b>many hosts in parallel</b>, never from hammering one.', parts: [{ type: 'table', label: 'Final fetch order', columns: ['time', 'host', 'url'], rows: log }, { type: 'vars', vals: { pages: log.length, 'duplicates dropped': urls.length - Object.keys(seen).length, 'per-host delay': delay } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Why one queue per host?', html: `<p>Suppose the frontier is one big FIFO and the first 10,000 URLs all come from <code>wikipedia.org</code> (common, because a page links mostly to its own site). 500 fetcher threads would all hit Wikipedia at once. With <b>back queues keyed by host</b> and a heap of "ready times", each host gets at most one in-flight request and a delay (often ~1-10 s, or a multiple of the last response time - a slow server gets an even longer gap). Mercator, the classic crawler design, maps each back queue to a host and keeps about 3× as many back queues as fetcher threads so threads always find a ready host.</p>` },
      { title: 'robots.txt in practice', html: `<p>Before the first page on <code>shop.example</code>, fetch <code>https://shop.example/robots.txt</code>, parse it, and cache it for ~24 h (RFC 9309 says caches should not be used for more than 24 h). Rules are matched against our user agent; the <b>longest matching</b> Allow/Disallow rule wins. If robots.txt returns 404, everything is allowed; if it returns 5xx (server error), treat the site as fully disallowed for now and retry later.</p>`, code: { lang: 'text', title: 'Example robots.txt', code: `User-agent: *
Disallow: /cart/
Disallow: /search
Allow: /search/help
Crawl-delay: 5        # non-standard, but many crawlers honour it
Sitemap: https://shop.example/sitemap.xml` } },
      { title: 'Spider traps', html: `<p>A calendar page links to "next month" forever: <code>/cal?m=2026-11</code>, <code>/cal?m=2026-12</code>, ... An infinite URL space. Defences: a <b>per-host page budget</b> (e.g. 10K pages unless the host is important), a <b>max URL length</b> and <b>path depth</b>, detect repeating path segments (<code>/a/b/a/b/a/b</code>), and lower priority for URLs whose content hash keeps matching (near-duplicate pages).</p>` },
      { title: 'Dedupe in two layers', html: `<p><b>URL dedupe</b> before fetching: normalise, then check a Bloom filter (say 10 bits per URL, ~1% false positives, 10B URLs ≈ 12.5 GB). A "maybe seen" answer is checked against the exact sharded store; a "definitely not seen" answer skips that lookup. <b>Content dedupe</b> after fetching: an exact SHA-256 of the body catches mirrors; a 64-bit <b>SimHash</b> catches near-duplicates (same article with a different ad block) - two pages whose fingerprints differ in ≤ 3 bits are treated as the same.</p>` }
    ],
    deepDive: `<h4>🟣 Inside the Mercator-style frontier</h4>
      <ul>
        <li><b>Front queues (priority):</b> F queues, one per priority level. A prioritiser assigns each URL a level from page importance and how often it changes. A biased selector picks higher levels more often.</li>
        <li><b>Back queues (politeness):</b> B queues, each holding URLs of exactly one host. A table maps host → back queue. When a back queue empties, the router refills it from the front queues (moving URLs of a new host in).</li>
        <li><b>Heap of ready times:</b> entry (host, earliest next fetch). A fetcher pops the top, waits if needed, fetches, then pushes the host back with <code>now + max(crawl_delay, k × last_download_time)</code>.</li>
        <li><b>Disk-backed:</b> billions of URLs cannot sit in RAM. Queues are files on disk with in-memory head and tail buffers.</li>
      </ul>
      <h4>Distribution</h4>
      <p>Partition by <b>host hash</b>: each crawler node owns a set of hosts, so politeness and robots caches stay local (no cross-node locks). A discovered link for a host owned by another node is forwarded in batches. Consistent hashing lets nodes join or leave. The node handling a host also does DNS for it, with a big local cache because DNS calls can take 10-200 ms.</p>
      <h4>Freshness</h4>
      <p>Re-crawl interval per URL adapts: if the content hash changed since last time, shorten the interval (e.g. halve it); if not, lengthen it. Conditional GETs (<code>If-None-Match</code> / <code>If-Modified-Since</code>) return <code>304 Not Modified</code> with no body - cheap. Sitemaps with <code>lastmod</code> and push protocols (IndexNow) help too.</p>
      <h4>Bottlenecks and trade-offs</h4>
      <ul>
        <li><b>DNS</b> and <b>slow servers</b> (use async I/O; thousands of concurrent connections per box; strict timeouts and max body size).</li>
        <li><b>Seen-set</b> size: Bloom filter (memory-cheap, small false-positive rate means a few new pages are skipped) vs exact store (more I/O).</li>
        <li><b>Breadth vs depth vs priority:</b> BFS finds important pages early; pure priority may starve new hosts - mix them.</li>
        <li><b>Rendering JavaScript:</b> headless browsers are ~10-100× more expensive per page; only render hosts that need it.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> crawlers now feed LLM training and retrieval systems, so <b>content quality classifiers</b> decide priority, and sites publish AI-specific rules: many robots.txt files now name AI user agents (GPTBot, ClaudeBot, Google-Extended, CCBot) separately. Respecting those directives and rate limits is both an ethical and legal expectation.</p>
      <p><b>Use AI as a partner:</b> ask it to write a robots.txt parser test suite (longest-match, wildcards, <code>$</code> end anchors), to list spider-trap URL patterns, or to sketch a SimHash implementation you then verify.</p>
      <p><b>Where AI goes wrong:</b> it often designs a single global FIFO with many threads (impolite), forgets DNS caching, dedupes raw URLs without normalising, or treats robots.txt 5xx as "allow everything". It also tends to ignore the cost of storing the seen-set.</p>
      <p><b>What you must still own:</b> the politeness model, the frontier data structures, and the numbers (pages/s, bandwidth, seen-set size).</p>`,
    problems: [{
      title: 'Crawl 1 Billion Pages a Month Politely', level: 'Medium', tags: ['crawler', 'frontier', 'politeness', 'hld'], companies: ['Google', 'Microsoft', 'Common Crawl', 'OpenAI'],
      statement: `<p>Design a crawler that fetches 1 billion pages per month from about 50 million hosts, never sends a host more than one request at a time or more than one request per second, obeys robots.txt, and avoids re-downloading duplicate pages. Describe the frontier, the worker layout, dedupe, and how the work is split across machines.</p>`,
      constraints: `≈ 400 pages/s average, 800/s peak · 100 KB average page · politeness ≥ 1 s per host · robots cached ≤ 24 h · seen-set 10B URLs.`,
      example: `<p>Seeds: <code>news.example/</code>. It links to 300 pages on news.example and 20 on other hosts. ${H.c('g', 'Good crawler:')} fetches news.example once per second while fetching the 20 other hosts in parallel. ${H.c('r', 'Naive crawler:')} fires 300 requests at news.example in a burst and gets a 429 / IP ban.</p>`,
      brute: { why: `<p>One shared FIFO queue, a <code>HashSet</code> of URLs in one process, and 1,000 threads. It is impolite (bursts to one host), the set does not fit in memory at 10B URLs, a single process is a single point of failure, and it never re-crawls.</p>` },
      mcq: { q: 'What enforces per-host politeness most simply?', options: ['A global rate limit of 400 requests per second', 'One back queue per host plus a heap of the next allowed time of each host', 'Randomly shuffling the frontier', 'Using more fetcher threads'], answer: 1, explain: 'A global limit does not stop 400 requests all going to one host. Per-host queues with a ready-time heap guarantee at most one request per host per delay.' },
      hints: [`<p>Politeness is a property of a <b>host</b>, so organise the to-do list by host, not as one global line.</p>`, `<p>Priority front queues → per-host back queues → a min-heap of next-allowed times. Partition hosts across nodes by hash so each host's state is local.</p>`, `<p>Add: DNS cache, robots cache with 24 h expiry, URL normalisation + Bloom filter + exact store, content hash/SimHash, per-host page budget for traps, conditional GETs for re-crawls.</p>`],
      solution: {
        approach: `<p><b>Layout.</b> ~20 crawler nodes, each owning a slice of hosts by consistent hashing on host. Each node runs: a frontier (front priority queues on disk, back queues per host, a ready-time heap), async fetchers (thousands of concurrent connections), a DNS cache, a robots cache, and parsers. Links for hosts owned by another node are batched and forwarded.</p>
          <p><b>Flow.</b> Fetcher pops the host with the smallest ready time; if robots rules are missing or older than 24 h it first fetches robots.txt; checks the URL path against the rules; downloads with a 30 s timeout and a 10 MB cap; schedules the host again at <code>now + max(1 s, crawl-delay, 10 × last response time)</code>. Content goes to WARC files in object storage; metadata (status, ETag, content hash, next crawl) goes to a wide-column table sharded by host.</p>
          <p><b>Dedupe.</b> Normalise each discovered URL; a Bloom filter rejects most already-seen URLs in memory; the exact sharded store settles the "maybe" cases. After download, SHA-256 detects exact copies and SimHash near copies, so they are stored as pointers. Traps are capped by depth, URL length and per-host budgets.</p>
          <p><b>Freshness and failure.</b> Re-crawl intervals adapt to observed change rate; conditional GETs make unchanged pages cheap. URLs handed to a fetcher carry a lease, so a crashed fetcher's URLs return to the queue. Frontier queues are persistent, so a node restart resumes where it left off.</p>`,
        complexity: `<p>Per URL: O(log H) heap operations (H hosts on the node) and O(1) expected seen-set checks. Storage ≈ 100 TB/month raw; seen-set ≈ 12.5 GB of Bloom filter for 10B URLs at 1% false positives.</p>`,
        followUps: ['How would you crawl JavaScript-heavy sites cheaply?', 'How do you choose which pages to re-crawl first?']
      }
    }]
  });

  /* ================= TOPIC 2: DISTRIBUTED JOB SCHEDULER ================= */
  topics.push({
    title: 'Design a Distributed Job Scheduler: Cron at Scale, Leases & Exactly-Once Triggering',
    analogy: `<p>Think of a <b>hotel wake-up-call desk</b> with a big board of "Room 412 - 6:00 am". Several night clerks share the board. When a call is due, a clerk puts <b>her name and the time on a sticky note</b> next to it ("Maria, until 6:05") and makes the call. If Maria faints, the note expires at 6:05 and another clerk takes the job. If Maria wakes up at 6:07 and tries to mark it done, the desk checks the note number and says "sorry, that is not your note any more".</p>
      <p>The board is the <b>job store</b>, the sticky note is a <b>lease</b>, and the note number is a <b>fencing token</b>. Together they make "each wake-up call happens once" true even when clerks fail.</p>`,
    explain: `<p><b>Goal:</b> a service that lets teams register jobs ("run report X every day at 02:00 UTC", "send this reminder at 15:30 tomorrow", "retry this webhook in 5 minutes") and fires each due run reliably on a fleet of workers.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> create / update / pause / delete jobs with a cron expression or a one-shot time; payload and target (HTTP endpoint, queue, container); retries with backoff; run history and status; manual "run now".</li>
        <li><b>Non-functional:</b> <b>each scheduled run is triggered once</b> (no misses, no duplicates visible to the job); fires within ~1 s of its due time; survives node crashes; scales to tens of millions of jobs; multi-tenant fairness (one team cannot starve others).</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Registered jobs', '50M jobs (many one-shot reminders)', '50M rows × ~500 B ≈ <b>25 GB</b> metadata'],
        ['Runs per day', 'average job fires 4 times/day', '200M runs/day ≈ <b>2,300 runs/s</b> average'],
        ['Peak', 'everyone writes <code>0 * * * *</code> (top of the hour)', '<b>10-50×</b> spike at :00 → 50K+ runs in the first seconds'],
        ['Run history', '200M/day × 200 B, kept 30 days', '≈ <b>1.2 TB</b> - time-partitioned, TTL']
      ])}
      <p>The insight: the hard parts are <b>not</b> throughput but <b>correctness under failure</b> (no duplicate or lost runs) and the <b>top-of-the-hour thundering herd</b>.</p>
      <h4>3. API</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>POST /v1/jobs</code> {name, schedule: "0 2 * * *", tz, target, payload, retry: {max: 5, backoff: "exp"}, timeout_s}', 'Returns job_id. Idempotency-Key header.'],
        ['<code>PATCH /v1/jobs/{id}</code> {paused: true}', 'Pause / resume / edit schedule (bumps a version).'],
        ['<code>POST /v1/jobs/{id}/run</code>', 'Manual run: creates a run with a fresh run_id.'],
        ['<code>GET /v1/jobs/{id}/runs?from=...</code>', 'Run history: state, attempts, worker, timings.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>jobs</b>(job_id, tenant, schedule, tz, target, payload, version, paused, <b>next_run_at</b>) - sharded by job_id.</li>
        <li><b>runs</b>(<b>run_id = hash(job_id, scheduled_time)</b>, job_id, scheduled_time, state QUEUED/LEASED/SUCCEEDED/FAILED, attempt, <b>lease_owner, lease_until, fencing_token</b>). Deterministic run_id means "create the run for 02:00 today" is idempotent.</li>
        <li><b>due index</b>: (shard, time-bucket) → job ids, or simply an index on <code>next_run_at</code>.</li>
      </ul>
      <h4>5. High-level design</h4>
      <ol>
        <li><b>API service</b> writes jobs; computes the first <code>next_run_at</code>.</li>
        <li><b>Schedulers</b> (one per shard, chosen by a lease / leader election) poll "jobs with next_run_at ≤ now + 30 s", <b>insert the run row</b> (unique on run_id), advance <code>next_run_at</code> in the same transaction, and push the run onto a <b>queue</b>.</li>
        <li><b>Workers</b> take runs from the queue, <b>acquire a lease</b> (CAS QUEUED → LEASED with lease_until = now + 30 s and a new fencing token), execute, renew the lease with heartbeats, and finish with a CAS that checks the token.</li>
        <li><b>Reaper</b>: runs whose lease expired go back to QUEUED (attempt + 1) or to FAILED after max attempts, then a dead-letter queue.</li>
      </ol>
      <p>"Exactly-once" in a distributed system really means <b>at-least-once delivery + idempotent effects</b>. The scheduler guarantees one run <i>record</i> per (job, time); the worker passes run_id as an idempotency key to the target so a retried run does not double-send.</p>`,
    clues: [
      '"run millions of cron jobs" / "schedule tasks for later" → <b>job store indexed by next_run_at</b> + partitioned schedulers + worker queue',
      '"job must run exactly once even if a worker crashes" → <b>lease with timeout + fencing token + idempotent run_id</b>',
      '"a worker paused for a long GC and woke up" → <b>fencing tokens</b>: the store rejects writes with an old token',
      '"many jobs at midnight / top of the hour" → <b>thundering herd</b>: pre-load, jitter, spread, rate limit per tenant',
      '"retries with backoff" → attempt counter + exponential backoff + dead-letter queue',
      '"timezones / daylight saving" → store tz with the job, compute next_run_at in that zone, define DST skip / repeat rules'
    ],
    code: [{
      lang: 'js', run: true, title: 'Lease-based job scheduler: each run fires once despite a crashed worker (runnable)',
      code: `// Simulated clock + a store that supports compare-and-set (like a SQL UPDATE ... WHERE, or etcd txn).
let now = 0;
const LEASE = 5;

class RunStore {
  constructor() { this.runs = new Map(); this.token = 0; this.effects = new Map(); }
  // Idempotent creation: run_id is derived from (job, scheduled time).
  createRun(jobId, at) {
    const id = jobId + '@' + at;
    if (!this.runs.has(id)) this.runs.set(id, { id, state: 'QUEUED', owner: null, until: 0, token: 0, attempt: 0 });
    return id;
  }
  // CAS: take the run if it is queued, or if the old lease has expired.
  acquire(id, worker) {
    const r = this.runs.get(id);
    const free = r.state === 'QUEUED' || (r.state === 'LEASED' && r.until <= now);
    if (!free) return null;
    r.state = 'LEASED'; r.owner = worker; r.until = now + LEASE; r.token = ++this.token; r.attempt++;
    return r.token;
  }
  renew(id, token) {
    const r = this.runs.get(id);
    if (r.token !== token || r.until <= now) return false;
    r.until = now + LEASE; return true;
  }
  // The target applies an effect keyed by run_id (idempotent) only when the fencing token is current.
  complete(id, token, effect) {
    const r = this.runs.get(id);
    if (r.token !== token) return 'REJECTED stale token ' + token + ' (current ' + r.token + ')';
    if (!this.effects.has(id)) this.effects.set(id, effect);
    r.state = 'SUCCEEDED';
    return 'OK';
  }
}

const store = new RunStore();
const id = store.createRun('daily-report', 120);
store.createRun('daily-report', 120);              // a second scheduler replica: same id, no duplicate
console.log('runs created:', store.runs.size);

now = 120;
const tA = store.acquire(id, 'worker-A');
console.log('t=' + now, 'worker-A leased token', tA);
console.log('t=' + now, 'worker-B tries:', store.acquire(id, 'worker-B'));   // null: lease held

now = 123; console.log('t=' + now, 'A renews:', store.renew(id, tA));
// worker-A now freezes (long GC pause / network partition) and stops renewing.
now = 129;
const tB = store.acquire(id, 'worker-B');
console.log('t=' + now, 'lease expired, worker-B leased token', tB);
console.log('t=' + now, 'B completes:', store.complete(id, tB, 'email sent by B'));
now = 131;
console.log('t=' + now, 'A wakes up and completes:', store.complete(id, tA, 'email sent by A'));
console.log('effects applied:', [...store.effects.entries()]);
console.log('attempts:', store.runs.get(id).attempt, 'state:', store.runs.get(id).state);
`
    }],
    codeTitle: ['Lease + fencing token scheduler model (JavaScript, runnable)'],
    viz: [{
      title: 'Lease, crash, takeover: the fencing token stops the zombie',
      input: 'lease=5 crash=3 pause=8',
      inputLabel: 'lease seconds, worker A crashes after N s, A wakes up after M more s',
      gen: function (input) {
        var o = { lease: 5, crash: 3, pause: 8 };
        words(input).forEach(function (w) { var m = /^(lease|crash|pause)=(\d+)$/.exec(w); if (m) o[m[1]] = Number(m[2]); });
        if (!(o.lease >= 2 && o.lease <= 10 && o.crash >= 1 && o.crash <= 10 && o.pause >= 1 && o.pause <= 20)) throw new Error('Use e.g. "lease=5 crash=3 pause=8" (lease 2-10, crash 1-10, pause 1-20)');
        var frames = [], t = 0, token = 0, run = { state: 'QUEUED', owner: '-', until: '-', token: 0 }, log = [];
        function g(hl, ehl) {
          return { type: 'graph', label: 'Scheduler cluster', height: 60, directed: true, nodes: [
            { id: 'S', label: 'Scheduler', x: 10, y: 30, shape: 'box' }, { id: 'DB', label: 'Run store (CAS)', x: 45, y: 30, shape: 'box' },
            { id: 'A', label: 'Worker A', x: 85, y: 12, shape: 'box' }, { id: 'B', label: 'Worker B', x: 85, y: 48, shape: 'box' }],
            edges: [['S', 'DB', 'create run'], ['A', 'DB'], ['B', 'DB']], hl: hl || {}, ehl: ehl || {} };
        }
        function st() { return { type: 'vars', label: 'run daily-report@02:00', vals: { t: t, state: run.state, owner: run.owner, 'lease until': run.until, 'fencing token': run.token } }; }
        frames.push({ narr: 'At 02:00 the scheduler <b>inserts the run row</b> with id = hash(job, 02:00). Inserting it twice (two scheduler replicas, a retry) is harmless: the unique key makes creation idempotent.', parts: [g({ S: 'cur', DB: 'ok' }, { 'S-DB': 'cur' }), st()] });
        token++; run = { state: 'LEASED', owner: 'A', until: t + o.lease, token: token }; log.push(['t=' + t, 'A', 'acquire → token ' + token]);
        frames.push({ narr: 'Worker A does a <b>compare-and-set</b>: QUEUED → LEASED, lease until t=' + run.until + ', fencing token <b>' + token + '</b>. Worker B asks too and gets "no" because the lease is live.', parts: [g({ A: 'ok', DB: 'cur', B: 'bad' }, { 'A-DB': 'ok' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice() }] });
        var renewEvery = Math.max(1, Math.floor(o.lease / 2));
        for (var r = renewEvery; r < o.crash; r += renewEvery) {
          t = r; run.until = t + o.lease; log.push(['t=' + t, 'A', 'heartbeat → lease until ' + run.until]);
          frames.push({ narr: 'At t=' + t + ' worker A is healthy and <b>renews</b> the lease (heartbeat every ~lease/2). Long jobs stay owned as long as the owner keeps renewing.', parts: [g({ A: 'ok' }, { 'A-DB': 'ok' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice() }] });
        }
        t = o.crash; log.push(['t=' + t, 'A', 'freezes (GC pause / partition)']);
        frames.push({ narr: 'At t=' + t + ' worker A <b>freezes</b>: a long GC pause, a network partition, or a crash. It stops renewing. Nobody can tell yet whether A is dead or just slow - that is the core problem of distributed systems.', parts: [g({ A: 'bad' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice() }] });
        t = Math.max(t, run.until); token++;
        log.push(['t=' + t, 'B', 'lease expired → acquire → token ' + token]);
        run = { state: 'LEASED', owner: 'B', until: t + o.lease, token: token };
        frames.push({ narr: 'At t=' + t + ' the lease <b>expires</b>. Worker B’s CAS now succeeds and the store hands out a <b>bigger</b> fencing token (' + token + '). The run is not lost.', parts: [g({ B: 'ok', DB: 'cur', A: 'bad' }, { 'B-DB': 'ok' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice() }] });
        t += 1; run.state = 'SUCCEEDED'; log.push(['t=' + t, 'B', 'complete(token ' + token + ') → OK, effect keyed by run_id']);
        frames.push({ narr: 'B finishes and commits with token ' + token + '. The target system (email sender, payment API) also receives <b>run_id as an idempotency key</b>, so even a duplicate call would be ignored there.', parts: [g({ B: 'ok', DB: 'ok' }, { 'B-DB': 'ok' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice() }] });
        var wake = o.crash + o.pause;
        if (wake <= t) wake = t + 1;
        t = wake; log.push(['t=' + t, 'A', 'wakes, complete(token 1) → REJECTED']);
        frames.push({ narr: 'At t=' + t + ' zombie worker A wakes up and tries to commit with <b>old token 1</b>. The store compares tokens and <b>rejects</b> it. Without fencing, A would overwrite B’s result or send a second email.', parts: [g({ A: 'bad', DB: 'cur' }, { 'A-DB': 'bad' }), st(), { type: 'table', label: 'Event log', columns: ['time', 'who', 'what'], rows: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = 'bad'; return h; })() }] });
        frames.push({ narr: '<b>Summary:</b> lease (who may work now) + fencing token (who may write) + deterministic run_id (idempotent effects) = "fires once" behaviour on top of at-least-once execution.', parts: [{ type: 'table', label: 'Three mechanisms', columns: ['Mechanism', 'Prevents'], rows: [['unique run_id per (job, time)', 'duplicate run records'], ['lease with expiry', 'lost runs when a worker dies'], ['fencing token check', 'zombie writes after a pause']] }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Polling the due index without double-firing', html: `<p>Each scheduler shard runs, every second:</p>${H.table(['Step', 'SQL-ish'], [['1. claim due jobs', '<code>SELECT ... WHERE shard=7 AND next_run_at &lt;= now()+30s FOR UPDATE SKIP LOCKED LIMIT 500</code>'], ['2. create runs', '<code>INSERT INTO runs(run_id,...) ON CONFLICT DO NOTHING</code>'], ['3. advance', '<code>UPDATE jobs SET next_run_at = next_fire(schedule, tz, next_run_at)</code>'], ['4. commit, then enqueue', 'push run_ids to the queue (or use an outbox table)']])}<p><code>SKIP LOCKED</code> lets several scheduler instances share one table without blocking each other; the unique run_id makes a retry of steps 1-3 harmless.</p>` },
      { title: 'Timing wheel for the next 60 seconds', html: `<p>Loading "everything due in the next 30-60 s" into memory lets the scheduler fire on time instead of polling the DB every millisecond. A <b>hierarchical timing wheel</b> (used by Kafka and Netty) is an array of buckets, one per second; a pointer ticks forward and fires everything in the current bucket. Insert and fire are O(1). If the node dies, nothing is lost - the DB still holds the rows and the next owner reloads them.</p>` },
      { title: 'Top-of-the-hour stampede', html: `<p>40% of cron jobs use minute 0. At 09:00:00, 80,000 runs become due in the same second and all hit downstream services together. Fixes: <b>pre-fetch</b> runs a minute early, let jobs opt into a <b>jitter window</b> ("any time in 09:00-09:05" - Jenkins' <code>H</code> syntax does this with a hash of the job name), <b>per-tenant concurrency limits</b>, and a <b>priority queue</b> so latency-sensitive jobs go first.</p>` },
      { title: 'Daylight saving time', html: `<p>A job at "02:30 America/New_York, daily". On the spring-forward day 02:30 does not exist; on fall-back day it happens twice. Pick and document a rule: e.g. run at the next valid time when skipped, and run once (first occurrence) when repeated. Store <code>next_run_at</code> in UTC, computed with the IANA tz database, and recompute from the schedule rather than adding 24 h.</p>` }
    ],
    deepDive: `<h4>🟣 Why "exactly once" needs three pieces</h4>
      <p>No protocol can make a remote side effect happen exactly once over an unreliable network (the worker may crash right after the effect and before recording it). So we guarantee <b>at-least-once execution</b> (leases + retries) and make the <b>effect idempotent</b> (run_id as idempotency key, or the target checks it). Fencing tokens are the protection from Martin Kleppmann's well-known analysis of lock-based designs: a lease alone is unsafe because a paused process does not know its lease expired; the storage system must reject the old token.</p>
      <h4>Partitioning the scheduler</h4>
      <ul>
        <li>Split jobs into N shards (hash of job_id). Each shard has exactly one active scheduler, chosen by a lease in ZooKeeper / etcd / a DB row. If that node dies, another acquires the shard lease in seconds.</li>
        <li>Alternatively, all schedulers share the table with <code>SKIP LOCKED</code> - simpler, but the DB becomes the bottleneck at high rates.</li>
        <li>Separate <b>triggering</b> (cheap, must be on time) from <b>execution</b> (expensive, may take hours) via the queue, so a slow job never delays triggers.</li>
      </ul>
      <h4>Lease duration trade-off</h4>
      <p>Short leases (10 s) = fast recovery but more heartbeat traffic and more false takeovers during GC pauses; long leases (5 min) = cheap but a dead worker blocks a run for 5 min. Common choice: 30 s lease, heartbeat every 10 s, and job-level timeout separately.</p>
      <h4>Bottlenecks and trade-offs</h4>
      <ul>
        <li>Hot rows: one job running every second updates one row constantly - fine; a single global "next due" query on a huge table is not - partition the due index by time bucket.</li>
        <li>Missed runs after an outage: <b>catch-up policy</b> per job (run all missed, run only the latest, or skip) - like Kubernetes CronJob's <code>startingDeadlineSeconds</code> and Airflow's <code>catchup</code>.</li>
        <li>Concurrency policy: if yesterday's run is still running, Allow / Forbid / Replace (Kubernetes names).</li>
        <li>Clock skew: decisions use the store's time (or bounded skew); leases must be much longer than the skew.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> schedulers now launch AI batch work (embeddings refresh, evaluation suites, agent tasks) that runs long and costs GPUs, so <b>cost-aware and capacity-aware scheduling</b> (queue until GPUs are free, preempt low-priority jobs) matters more. Agents also create jobs ("remind me", "check this PR every hour") - another reason to enforce per-tenant quotas.</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate failure interleavings ("worker crashes after effect, before commit") and check your design against each; ask for cron-expression edge cases and DST test dates.</p>
      <p><b>Where AI goes wrong:</b> it says "use a distributed lock so the job runs exactly once" without fencing, or claims Kafka gives end-to-end exactly-once to an external HTTP call. It also forgets the top-of-hour spike.</p>
      <p><b>What you must still own:</b> the run state machine, lease/fencing reasoning, and catch-up / concurrency policies.</p>`,
    problems: [{
      title: 'Cron for 50 Million Jobs', level: 'Hard', tags: ['scheduler', 'leases', 'exactly-once', 'hld'], companies: ['Google', 'Amazon', 'Airbnb', 'Uber'],
      statement: `<p>Design a multi-tenant job scheduler holding 50M jobs (cron and one-shot). Each due run must trigger within 2 s, must not be lost if a scheduler or worker dies, and must not produce two visible effects. Handle the top-of-the-hour spike and retries.</p>`,
      constraints: `50M jobs · 2,300 runs/s average, 50K/s at :00 · trigger delay ≤ 2 s · runs up to 6 h long · 30-day history.`,
      example: `<p>Job "invoice-email" at 02:00. Worker A starts, then its VM freezes for 90 s. ${H.c('g', 'Correct:')} lease expires at 02:00:30, worker B runs it; when A wakes, its write is rejected (old token) and the email service ignores the duplicate run_id. ${H.c('r', 'Broken:')} two invoices sent.</p>`,
      brute: { why: `<p>One cron daemon on one server reading a crontab. Single point of failure (a dead box misses every run), cannot hold 50M entries, no history, no retries, and two copies for high availability would fire every job twice.</p>` },
      mcq: { q: 'Worker A held a lease, paused, and the lease was given to B. What stops A from overwriting B’s result?', options: ['A heartbeat', 'A longer lease', 'A fencing token checked by the store on every write', 'NTP-synchronised clocks'], answer: 2, explain: 'A paused process cannot know that its lease ended. A monotonically increasing fencing token lets the store reject writes from the older holder.' },
      hints: [`<p>Separate <b>deciding a run is due</b> from <b>executing it</b>, and give each run a deterministic id.</p>`, `<p>Shard jobs; one scheduler per shard via leader lease; next_run_at index + timing wheel; runs go to a queue; workers take a lease with a fencing token and heartbeat.</p>`, `<p>Edge cases: duplicate creation (unique run_id), zombie workers (fencing), outage catch-up policy, DST, :00 spike (prefetch, jitter, per-tenant limits), retries with backoff and a DLQ.</p>`],
      solution: {
        approach: `<p><b>Storage.</b> Jobs table sharded by job_id (e.g. 256 shards on a distributed SQL store like Spanner / CockroachDB / sharded Postgres) with an index on (shard, next_run_at). Runs table keyed by run_id = hash(job_id, scheduled_time), partitioned by day with a 30-day TTL.</p>
          <p><b>Triggering.</b> Each shard has one active scheduler chosen by a lease in etcd. Every few seconds it loads runs due in the next 60 s into a timing wheel, and for each due job it, in one transaction, inserts the run (ON CONFLICT DO NOTHING) and advances next_run_at, writing an outbox row. A relay pushes run_ids to a partitioned queue (Kafka / SQS) - so a crash between DB commit and enqueue cannot lose a run. Prefetching one minute ahead smooths the :00 spike; optional jitter windows and per-tenant token buckets protect downstream services.</p>
          <p><b>Execution.</b> Workers consume run_ids and CAS the run QUEUED → LEASED with lease_until = now + 30 s and a new fencing token; they heartbeat every 10 s. Completion is a CAS checking the token. The target receives run_id as an idempotency key. A reaper returns expired leases to QUEUED with attempt + 1 and backoff, and after max attempts moves the run to FAILED and a dead-letter queue with an alert.</p>
          <p><b>Policies.</b> Catch-up (all / latest / none), concurrency (allow / forbid / replace) and DST rules are per job. Metrics: trigger lag p99, lease takeovers, retries, DLQ size.</p>`,
        complexity: `<p>Trigger: O(log n) index scan per batch + O(1) wheel operations. Storage: ~25 GB of jobs + ~1.2 TB of history. Throughput scales linearly with shards and workers.</p>`,
        followUps: ['How would you support job dependencies (DAGs) like Airflow?', 'How do you give one tenant a guaranteed share of workers?']
      }
    }]
  });

  /* ================= TOPIC 3: REAL-TIME LEADERBOARD ================= */
  topics.push({
    title: 'Design a Real-Time Leaderboard: Sorted Sets, Ties, Rank Queries & Sharding',
    analogy: `<p>Think of a <b>school sports day scoreboard</b>. Every time a runner finishes a race, a teacher updates her total. Parents keep asking two things: "Who is in the top 10?" and "What place is <i>my</i> kid in?". A clever teacher keeps the names <b>already sorted</b>, so both answers are instant, instead of re-sorting the whole school every time someone asks.</p>
      <p>A leaderboard is exactly that: a <b>constantly re-sorted list</b> that answers <b>top-K</b> and <b>rank-of-me</b> quickly while scores keep changing.</p>`,
    explain: `<p><b>Goal:</b> a game (or fitness app, coding contest) with millions of players shows a global leaderboard, the player's own rank, and friends / regional boards, updated within a second of each score change.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> submit score events; show top 100; show my rank and the players around me (±5); boards per period (daily, weekly, all-time) and per region / friends; clear tie rules.</li>
        <li><b>Non-functional:</b> rank reads &lt; 50 ms; updates visible in ~1 s; very read-heavy around events; anti-cheat validation of scores; no lost scores.</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Players', '50M monthly, 5M daily active', 'board size up to 50M entries'],
        ['Score updates', '5M DAU × 10 matches/day', '50M/day ≈ <b>600/s</b>, peak ≈ 5K/s'],
        ['Reads', 'leaderboard screen opened 20× per update', '≈ <b>12K-100K reads/s</b>'],
        ['Memory', '50M × (member id 16 B + score 8 B + skiplist overhead ~40 B)', '≈ <b>3-4 GB</b> - one Redis sorted set fits']
      ])}
      <p>The insight: the whole all-time board fits in memory on one machine. The real problems are <b>hot reads</b>, <b>ties</b>, <b>periodic boards</b>, and staying correct if the cache dies.</p>
      <h4>3. API</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>POST /v1/scores</code> {player_id, match_id, delta | score, signature}', 'Server-validated; match_id makes it idempotent.'],
        ['<code>GET /v1/boards/{board}/top?k=100</code>', 'Cached for 1 s; the same response serves everyone.'],
        ['<code>GET /v1/boards/{board}/rank/{player_id}?around=5</code>', 'Rank (1-based) plus neighbours.'],
        ['<code>GET /v1/boards/{board}/friends/{player_id}</code>', 'Scores of up to a few hundred friends, sorted on read.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>Source of truth</b>: <code>score_events(match_id PK, player_id, delta, ts)</code> and <code>player_scores(board, player_id, score, updated_at)</code> in a durable DB.</li>
        <li><b>Serving index</b>: Redis sorted set per board: <code>ZADD lb:2026-W44 score player</code>; <code>ZREVRANGE lb 0 99 WITHSCORES</code> (top 100), <code>ZREVRANK lb player</code> (rank), both O(log N) (+ K for ranges) thanks to a <b>skip list</b> with span counts.</li>
        <li>Board key includes the period (<code>lb:daily:2026-10-28</code>) with a TTL, so "reset weekly" is just a new key - no mass delete.</li>
      </ul>
      <h4>5. High-level design</h4>
      <ol>
        <li>Game server → <b>Score service</b> (validate, dedupe by match_id, write DB) → event to Kafka.</li>
        <li><b>Leaderboard updater</b> consumes events and runs <code>ZINCRBY</code> on each affected board (global, weekly, region).</li>
        <li><b>Read API</b>: top-K served from a 1-second cache / CDN; rank queries go to Redis replicas.</li>
        <li>Recovery: rebuild the sorted set from <code>player_scores</code> if Redis is lost.</li>
      </ol>
      <h4>6. Ties</h4>
      <p>Equal scores must be ordered deterministically. Two standard choices: <b>competition rank</b> ("1, 2, 2, 4": equal scores share a rank and the next rank is skipped) or a <b>tie-break</b> like "who reached it first wins". To tie-break by time inside one number, encode <code>score × 2<sup>k</sup> + (MAX_TS − ts)</code> so the earlier achiever sorts higher. The visualizer shows both.</p>`,
    clues: [
      '"top 10 players" + "my rank" with millions of users → <b>sorted set (skip list / order-statistic tree)</b>, O(log N) rank',
      '"real-time scores" → incremental <b>ZINCRBY</b> from an event stream, not periodic full sorts',
      '"players with equal scores" → define <b>tie rule</b>: competition rank or earliest-achiever via composite score',
      '"weekly / daily boards" → one key per period with TTL; reset is free',
      '"100M+ players, one board" → <b>shard by score range</b> or approximate rank via histogram for the long tail',
      '"friends leaderboard" → fetch friends’ scores and sort on read (small N), do not build a board per user'
    ],
    code: [{
      lang: 'js', run: true, title: 'Top-K leaderboard with competition ranks, earliest-first tie-break and around-me (runnable)',
      code: `// Order-statistic structure kept as a sorted array (binary search insert).
// In production Redis uses a skip list with span counts; the queries are the same.
class Leaderboard {
  constructor() { this.byPlayer = new Map(); this.sorted = []; this.clock = 0; }
  // Higher score first; on a tie, whoever reached that score earlier first; then by name for stability.
  static before(a, b) { return a.score !== b.score ? a.score > b.score : a.at !== b.at ? a.at < b.at : a.id < b.id; }
  indexOf(e) {
    let lo = 0, hi = this.sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (Leaderboard.before(this.sorted[mid], e)) lo = mid + 1; else hi = mid; }
    return lo;
  }
  add(id, delta) {
    const old = this.byPlayer.get(id);
    if (old) this.sorted.splice(this.indexOf(old), 1);
    const e = { id, score: (old ? old.score : 0) + delta, at: ++this.clock };
    this.sorted.splice(this.indexOf(e), 0, e);
    this.byPlayer.set(id, e);
  }
  // Position in the ordering (1-based, tie-broken: no two players share it).
  position(id) { return this.indexOf(this.byPlayer.get(id)) + 1; }
  // Competition rank: 1 + number of players with a strictly higher score ("1, 2, 2, 4").
  rank(id) {
    const s = this.byPlayer.get(id).score;
    let lo = 0, hi = this.sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.sorted[mid].score > s) lo = mid + 1; else hi = mid; }
    return lo + 1;
  }
  top(k) { return this.sorted.slice(0, k).map((e) => e.id + ':' + e.score + ' (rank ' + this.rank(e.id) + ')'); }
  around(id, n) {
    const p = this.position(id) - 1;
    return this.sorted.slice(Math.max(0, p - n), p + n + 1).map((e) => e.id + ':' + e.score);
  }
}

const lb = new Leaderboard();
[['ana', 50], ['ben', 70], ['cy', 50], ['dee', 90], ['eve', 20], ['ben', 30], ['fay', 50]].forEach(([p, d]) => lb.add(p, d));
console.log('top 4      :', lb.top(4).join(' | '));
console.log('rank of cy :', lb.rank('cy'), '(competition rank, ties share it)');
console.log('position cy:', lb.position('cy'), '(ana reached 50 first, so ana is listed before cy)');
console.log('around fay :', lb.around('fay', 1).join(' | '));
lb.add('eve', 85);
console.log('after eve +85 -> top 3:', lb.top(3).join(' | '));
`
    }],
    codeTitle: ['Leaderboard with ties and rank queries (JavaScript, runnable)'],
    viz: [{
      title: 'Score updates re-sorting the board (ties share a rank)',
      input: 'ana 50, ben 70, cy 50, dee 90, eve 20, ben +30, eve +80',
      inputLabel: 'player score pairs; "+N" adds to the existing score',
      gen: function (input) {
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12);
        if (items.length < 2) throw new Error('Give at least two "name score" pairs separated by commas');
        var players = {}, clock = 0, frames = [];
        function board() {
          return Object.keys(players).map(function (k) { return players[k]; }).sort(function (a, b) { return b.score - a.score || a.at - b.at || (a.id < b.id ? -1 : 1); });
        }
        function parts(hlId, note) {
          var b = board(), rows = [], hl = {};
          b.forEach(function (e, i) {
            var higher = b.filter(function (x) { return x.score > e.score; }).length;
            rows.push([String(i + 1), String(higher + 1), e.id, String(e.score)]);
            if (e.id === hlId) hl[i] = 'cur';
          });
          return [{ type: 'bars', label: 'Scores in board order', values: b.map(function (e) { return e.score; }), texts: b.map(function (e) { return e.id; }), hl: (function () { var h = {}; b.forEach(function (e, i) { if (e.id === hlId) h[i] = 'cur'; }); return h; })() },
            { type: 'table', label: 'Board (position = tie-broken order; rank = competition rank)' + (note ? ' - ' + note : ''), columns: ['position', 'rank', 'player', 'score'], rows: rows, hl: hl }];
        }
        items.forEach(function (it) {
          var m = /^([A-Za-z][A-Za-z0-9_]{0,11})\s+(\+?)(-?\d{1,6})$/.exec(it);
          if (!m) throw new Error('Bad item "' + it + '". Use "name 50" or "name +30"');
          var id = m[1], add = m[2] === '+', v = Number(m[3]);
          var had = players[id];
          var ns = add && had ? had.score + v : v;
          var oldPos = had ? board().indexOf(had) + 1 : null;
          players[id] = { id: id, score: ns, at: ++clock };
          var newPos = board().indexOf(players[id]) + 1;
          var tie = board().filter(function (x) { return x.score === ns && x.id !== id; }).map(function (x) { return x.id; });
          var narr = (had ? '<b>' + id + '</b> goes from ' + had.score + ' to <b>' + ns + '</b> (ZINCRBY). It moves from position ' + oldPos + ' to <b>' + newPos + '</b>.' : 'New player <b>' + id + '</b> with <b>' + ns + '</b> (ZADD) lands at position <b>' + newPos + '</b>.') + ' Only one O(log N) remove + insert happens - nobody re-sorts the whole board.';
          if (tie.length) narr += ' Tie with ' + tie.join(', ') + ': they share the same <b>rank</b>, but ' + id + ' reached the score later, so it is listed after them.';
          frames.push({ narr: narr, parts: parts(id) });
        });
        var b = board();
        frames.push({ narr: 'Final board. <b>Top-K</b> = first K rows (ZREVRANGE 0 K-1). <b>Rank of a player</b> = 1 + number of strictly higher scores (ZCOUNT score+1 +inf, or ZREVRANK with a tie-broken composite score). Leader: <b>' + b[0].id + '</b>.', parts: parts(b[0].id, 'final') });
        frames.push({ narr: 'At 50M players the same queries cost about log₂(50M) ≈ 26 skip-list steps. The bigger risk is a hot key: 100K reads/s on one sorted set. Cache the top-100 response for 1 s and serve rank reads from replicas.', parts: [{ type: 'vars', vals: { players: b.length, 'top-K cost': 'O(log N + K)', 'rank cost': 'O(log N)', 'update cost': 'O(log N)' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Earliest achiever wins a tie, inside one number', html: `<p>Redis orders equal scores by member name (lexicographic) - not what players expect. Encode a composite: <code>composite = score × 10<sup>10</sup> + (9,999,999,999 − unix_seconds)</code>. Two players with 500 points: the one who reached it at t=1,700,000,000 gets a larger tail than one at t=1,700,000,500, so ranks higher. Keep it within 2<sup>53</sup> because Redis scores are doubles (exact integers only up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup>): this encoding allows scores up to ~900,000.</p>` },
      { title: 'Rank for 500M players: approximate the tail', html: `<p>Exact rank for the top 10,000 matters; "you are #31,402,117" vs "#31,402,120" does not. Keep an exact sorted set for the top N and a <b>histogram</b> of score buckets for everyone: rank ≈ (players in higher buckets) + (position inside the bucket estimated linearly). Display "Top 7%". This turns a giant single key into small counters that shard trivially.</p>${H.table(['Bucket', 'Players'], [['900+', '10K (exact board)'], ['800-899', '250K'], ['700-799', '2.1M'], ['your 742', '≈ 10K + 250K + 2.1M × (799−742)/100 ≈ 1.46M']])}` },
      { title: 'Sharding by score range', html: `<p>If one Redis node cannot take the write load, split by <b>score ranges</b>: shard 1 holds 0-999, shard 2 holds 1000-4999, shard 3 holds 5000+. Rank = (count of all players in higher shards, cached per shard) + local rank. A player crossing a boundary moves shards (remove + add). Sharding by <b>player id hash</b> spreads writes evenly but makes top-K a <b>scatter-gather</b>: ask each of S shards for its top K, merge S×K candidates.</p>` },
      { title: 'Friends leaderboard', html: `<p>A player has 300 friends. Do not maintain a sorted set per player (300× writes on every score change). On read: get friend ids from the social graph, <code>ZMSCORE lb f1 f2 ...</code> in one call, sort 300 numbers in the API - microseconds. Cache per player for a few seconds.</p>` }
    ],
    deepDive: `<h4>🟣 Why Redis sorted sets are fast</h4>
      <p>A sorted set is a <b>hash map</b> (member → score, O(1) lookup) plus a <b>skip list</b> ordered by (score, member). Each skip-list pointer stores a <b>span</b>: how many elements it jumps. Summing spans along the search path gives the rank in O(log N) - an order-statistic structure. Small sets use a compact listpack instead.</p>
      <h4>Durability and rebuild</h4>
      <ul>
        <li>The DB (<code>player_scores</code>) is the source of truth; Redis is a <b>derived index</b>. Use AOF persistence + replicas for fast failover, and keep a rebuild job (scan DB, pipeline ZADDs) for disasters: 50M entries load in minutes.</li>
        <li>Updates from Kafka are idempotent if the updater writes absolute scores (<code>ZADD</code> with the DB value) instead of blind <code>ZINCRBY</code> - a replayed event then does no harm. If you must use increments, dedupe by match_id.</li>
      </ul>
      <h4>Hot reads</h4>
      <p>The global top-100 is identical for everyone: cache the rendered JSON for 1 s at the API/CDN - 100K reads/s become 1 Redis call per second per region. "My rank" is per user: send to read replicas; slightly stale (≤ 1 s) is fine.</p>
      <h4>Periodic boards</h4>
      <p>Each period has its own key with an expiry after the period plus a grace window. At period end, snapshot the final top-N to durable storage for prizes. Time zones: define the period in UTC or per region.</p>
      <h4>Trade-offs</h4>
      <ul>
        <li>Exact global rank for everyone vs approximate rank for the long tail.</li>
        <li>Score-range sharding (cheap rank, uneven load) vs hash sharding (even load, scatter-gather top-K).</li>
        <li>Real-time updates vs batching (micro-batch every 1 s cuts Redis ops a lot at tiny latency cost).</li>
        <li>Anti-cheat: scores computed on the server or verified with replays; a client-sent score is never trusted.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> AI is used for <b>cheat detection</b> (anomalous score jumps, bot play patterns) before scores enter the board, and for matchmaking based on skill ratings. The leaderboard data structure itself stays classic.</p>
      <p><b>Use AI as a partner:</b> ask it to generate tie-heavy test data, to compute the max safe score for a composite encoding in a double, or to write a load test that hammers one board.</p>
      <p><b>Where AI goes wrong:</b> it often proposes <code>SELECT ... ORDER BY score DESC</code> + <code>COUNT(*)</code> on every rank query (full scans at 50M rows), forgets that Redis breaks ties lexicographically, or builds per-user friend boards updated on every write.</p>
      <p><b>What you must still own:</b> the tie rule (product decision), the source-of-truth vs index split, and the hot-key plan.</p>`,
    problems: [{
      title: 'Global Leaderboard for 50M Players', level: 'Medium', tags: ['leaderboard', 'sorted set', 'redis', 'hld'], companies: ['Riot Games', 'King', 'Supercell', 'LeetCode'],
      statement: `<p>Design a leaderboard for a mobile game with 50M players. It must show the global top 100, each player's exact rank and 5 neighbours, and daily and weekly boards. Scores update after every match. Equal scores: whoever reached the score first ranks higher.</p>`,
      constraints: `5K score updates/s peak · 100K reads/s peak · rank read p99 &lt; 50 ms · update visible in ≤ 1 s · boards reset daily / weekly.`,
      example: `<p>Scores: dee 90, ben 100, ana 50 (at 10:01), cy 50 (at 10:05). ${H.c('g', 'Top 4: ben, dee, ana, cy')}. ana and cy both have 50, but ana reached it first, so ana is #3 and cy #4.</p>`,
      brute: { why: `<p><code>SELECT COUNT(*) + 1 FROM scores WHERE score &gt; :mine</code> per rank request. With 50M rows and 100K reads/s that is billions of row visits per second, even with an index the count walks huge ranges. Re-sorting everything in a cron job every minute makes ranks stale.</p>` },
      mcq: { q: 'Which structure answers both "top K" and "rank of player X" in O(log N)?', options: ['A hash map from player to score', 'A sorted set (skip list with span counts) plus a member→score map', 'A max-heap of all players', 'A B-tree index on player_id'], answer: 1, explain: 'A heap only gives the max cheaply; rank would need a scan. A skip list with spans (or an order-statistic tree) gives both top-K ranges and rank in logarithmic time.' },
      hints: [`<p>The data fits in memory. You need a structure that is <b>always sorted</b> and can count "how many are above me".</p>`, `<p>Redis sorted set per board (key includes the period), fed from a score event stream; DB as source of truth.</p>`, `<p>Ties: composite score with inverted timestamp, safe under 2<sup>53</sup>. Hot reads: 1 s cache for top 100, replicas for rank. Rebuild from DB; idempotent updates by match_id.</p>`],
      solution: {
        approach: `<p>Game servers send validated match results to the Score service, which dedupes by match_id, updates <code>player_scores</code> (all-time, daily, weekly rows) in a durable DB in one transaction and emits an event. A leaderboard updater consumes events and writes the <b>absolute</b> composite score to three Redis sorted sets: <code>lb:all</code>, <code>lb:d:2026-10-28</code>, <code>lb:w:2026-W44</code> (period keys expire after the period + 7 days). Composite = score × 10<sup>10</sup> + (10<sup>10</sup> − 1 − achieved_at_seconds), so ties favour the earliest achiever and the value stays an exact integer in a double.</p>
          <p>Reads: top 100 via <code>ZREVRANGE 0 99</code>, cached as JSON for 1 s per region; rank via <code>ZREVRANK</code> and neighbours via <code>ZREVRANGE rank-5 rank+5</code> on read replicas. 50M members ≈ 4 GB per board - one primary with two replicas per region. If Redis is lost, rebuild from the DB with pipelined ZADDs while serving a "ranks updating" banner. Period ends: snapshot the top 1,000 for rewards. If players reach 500M, keep an exact board for the top 100K and approximate ranks from a score histogram for the rest.</p>`,
        complexity: `<p>Update O(log N), top-K O(log N + K), rank O(log N). Memory ~80 B per member per board.</p>`,
        followUps: ['How do you show a "rank changed by +12" arrow cheaply?', 'How would you handle a regional board for 200 countries?']
      }
    }]
  });

  /* ================= TOPIC 4: STOCK EXCHANGE - ORDER BOOK & MATCHING ================= */
  topics.push({
    title: 'Design a Stock Exchange I: Order Book & Price-Time Priority Matching',
    analogy: `<p>Imagine a <b>farmers' market for one kind of apple</b>. Sellers write "I sell 10 kg at $3.00" on cards and pin them to a board sorted from cheapest up; buyers pin "I buy 5 kg at $2.90" cards sorted from highest down. When a new buyer arrives willing to pay $3.05, the market keeper matches her with the <b>cheapest</b> seller first, and among sellers at the same price, with <b>whoever pinned their card first</b>. Nobody negotiates; the board decides.</p>
      <p>That board is the <b>order book</b>, and "best price first, then earliest" is <b>price-time priority</b>.</p>`,
    explain: `<p><b>Goal:</b> an electronic exchange that accepts buy and sell orders for thousands of instruments, matches them fairly and instantly, and publishes trades and market data.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> place <b>limit</b> orders (price cap) and <b>market</b> orders (any price); cancel / modify; match by price-time priority; partial fills; publish executions to the two parties and market data (best bid/ask, depth, trades) to everyone; risk checks before an order enters the book.</li>
        <li><b>Non-functional:</b> <b>deterministic and fair</b> (same input order → same trades); extremely low and predictable latency (tens of microseconds inside the engine, p99 matters more than average); no lost or duplicated orders; full audit trail; recover to the exact state after a crash.</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Instruments', '~10,000 symbols', 'one order book each'],
        ['Order messages', 'peak 1M msgs/s across the exchange (most are adds and cancels)', 'hot symbols take 100K+/s'],
        ['Orders resting in a book', 'busy symbol ~100K live orders', 'a few MB per book - fits in L2/L3 cache-friendly RAM'],
        ['Daily log', '~5 billion messages × 100 B', '≈ <b>500 GB/day</b> append-only journal'],
        ['Latency budget', 'gateway → engine → ack', 'tens of µs inside the colocated data centre']
      ])}
      <p>The insight: each order book is <b>small but extremely hot</b>, and fairness needs a <b>single, total order</b> of events per instrument. So the matching core is <b>single-threaded per symbol (or per shard of symbols), in memory</b> - no locks, no database in the hot path.</p>
      <h4>3. API</h4>
      ${H.table(['Message (FIX / binary like ITCH/OUCH)', 'Notes'], [
        ['<code>NewOrder</code> {client_order_id, symbol, side, type, price, qty, time_in_force}', 'client_order_id unique per session → idempotent resend.'],
        ['<code>Cancel</code> / <code>Replace</code> {orig_client_order_id, new qty/price}', 'Reducing qty keeps time priority; raising qty or changing price loses it.'],
        ['<code>ExecutionReport</code> (to the client)', 'Ack / partial fill / fill / cancelled / rejected, with exec_id and sequence number.'],
        ['<code>MarketData</code> (multicast)', 'Order added/removed, trade, best bid/offer, each with a sequence number for gap detection.']
      ])}
      <h4>4. Data model (in memory per symbol)</h4>
      <ul>
        <li><b>Bids</b>: price levels sorted high → low; <b>asks</b>: low → high. Each level is a <b>FIFO queue</b> of orders (time priority).</li>
        <li><b>order_id → order</b> hash map, so cancel is O(1) to find (then unlink from its level's doubly linked list).</li>
        <li>Prices are <b>integers in ticks</b> (e.g. 1 tick = $0.01 → $101.25 = 10125), never floating point.</li>
      </ul>
      <h4>5. Matching algorithm</h4>
      <ol>
        <li>A buy limit at price P: while qty &gt; 0 and the best ask ≤ P, take the <b>oldest</b> order at the best ask level, trade min(qty, its qty) <b>at the resting order's price</b>, remove it if filled.</li>
        <li>Remaining qty rests in the bid side at level P (back of the queue), unless the order is IOC (cancel the rest) or a market order.</li>
        <li>Mirror logic for sells. Every step emits events in order.</li>
      </ol>`,
    clues: [
      '"design a stock exchange / trading engine / crypto exchange" → <b>in-memory order book per symbol</b> + single-threaded deterministic matching',
      '"best price first, then first come" → <b>price-time priority</b>: sorted price levels, FIFO queue per level',
      '"cancel in O(1)" → order_id map + <b>doubly linked list</b> inside the level',
      '"prices like 101.25" → integer <b>ticks</b>, never doubles',
      '"partial fills" → loop while incoming qty &gt; 0 and the book crosses; trade at the resting price',
      '"market data feed" → every book change becomes a sequenced event (ITCH-style)'
    ],
    code: [{
      lang: 'java', title: 'Price-time priority matching engine (Java, compiles; run main to see trades)',
      code: `import java.util.*;

public class MatchingEngine {
    enum Side { BUY, SELL }

    static final class Order {
        final long id; final Side side; final long price; long qty; final long seq;
        Order(long id, Side side, long price, long qty, long seq) {
            this.id = id; this.side = side; this.price = price; this.qty = qty; this.seq = seq;
        }
    }

    // Bids: highest price first. Asks: lowest price first. Each level is a FIFO queue (time priority).
    private final TreeMap<Long, ArrayDeque<Order>> bids = new TreeMap<>(Comparator.reverseOrder());
    private final TreeMap<Long, ArrayDeque<Order>> asks = new TreeMap<>();
    private final Map<Long, Order> live = new HashMap<>();
    private long seq = 0;
    final List<String> events = new ArrayList<>();

    /** Limit order. Prices are integer ticks. Returns the quantity left resting in the book. */
    long submit(long id, Side side, long price, long qty) {
        Order in = new Order(id, side, price, qty, ++seq);
        TreeMap<Long, ArrayDeque<Order>> opposite = side == Side.BUY ? asks : bids;
        while (in.qty > 0 && !opposite.isEmpty()) {
            Map.Entry<Long, ArrayDeque<Order>> best = opposite.firstEntry();
            boolean crosses = side == Side.BUY ? best.getKey() <= price : best.getKey() >= price;
            if (!crosses) break;
            ArrayDeque<Order> level = best.getValue();
            Order rest = level.peekFirst();                       // oldest order at the best price
            long fill = Math.min(in.qty, rest.qty);
            in.qty -= fill; rest.qty -= fill;
            events.add("TRADE " + fill + " @ " + rest.price + " (taker " + in.id + ", maker " + rest.id + ")");
            if (rest.qty == 0) { level.pollFirst(); live.remove(rest.id); }
            if (level.isEmpty()) opposite.pollFirstEntry();
        }
        if (in.qty > 0) {
            (side == Side.BUY ? bids : asks).computeIfAbsent(price, p -> new ArrayDeque<>()).addLast(in);
            live.put(in.id, in);
            events.add("REST " + side + " " + in.qty + " @ " + price + " (order " + id + ")");
        }
        return in.qty;
    }

    /** Cancel by id. A production book unlinks from an intrusive doubly linked list in O(1). */
    boolean cancel(long id) {
        Order o = live.remove(id);
        if (o == null) return false;                               // already filled or unknown: reject
        TreeMap<Long, ArrayDeque<Order>> book = o.side == Side.BUY ? bids : asks;
        ArrayDeque<Order> level = book.get(o.price);
        level.remove(o);
        if (level.isEmpty()) book.remove(o.price);
        events.add("CANCEL order " + id);
        return true;
    }

    String top() {
        String b = bids.isEmpty() ? "-" : bids.firstKey() + "x" + bids.firstEntry().getValue().stream().mapToLong(o -> o.qty).sum();
        String a = asks.isEmpty() ? "-" : asks.firstKey() + "x" + asks.firstEntry().getValue().stream().mapToLong(o -> o.qty).sum();
        return "best bid " + b + " | best ask " + a;
    }

    public static void main(String[] args) {
        MatchingEngine m = new MatchingEngine();
        m.submit(1, Side.SELL, 10100, 5);   // ask 101.00 x5
        m.submit(2, Side.SELL, 10100, 3);   // same price, later: queued behind order 1
        m.submit(3, Side.SELL, 10200, 4);
        m.submit(4, Side.BUY, 9900, 6);     // bid 99.00
        m.submit(5, Side.BUY, 10200, 10);   // crosses: fills 1 (5), then 2 (3), then 3 (2) at their prices
        m.cancel(4);
        m.submit(6, Side.SELL, 9800, 1);    // empty bid side now: rests
        m.events.forEach(System.out::println);
        System.out.println(m.top());
    }
}
`
    }],
    codeTitle: ['Order book + price-time matching (Java)'],
    viz: [{
      title: 'Order book: a crossing order walks the levels',
      input: 'S 101 5, S 101 3, S 102 4, B 99 6, B 100 2, B 102 10',
      inputLabel: 'orders: side (B/S) price qty, comma-separated',
      gen: function (input) {
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12);
        if (!items.length) throw new Error('Enter orders like "S 101 5, B 102 10"');
        var bids = [], asks = [], id = 0, trades = [], frames = [];
        function bookTable(hlId) {
          var rows = [], hl = {};
          var a = asks.slice().sort(function (x, y) { return y.p - x.p || y.t - x.t; });
          a.forEach(function (o) { rows.push(['ASK', String(o.p), String(o.q), '#' + o.id]); if (o.id === hlId) hl[rows.length - 1] = 'cur'; });
          rows.push(['----', 'spread', '', '']);
          var b = bids.slice().sort(function (x, y) { return y.p - x.p || x.t - y.t; });
          b.forEach(function (o) { rows.push(['BID', String(o.p), String(o.q), '#' + o.id]); if (o.id === hlId) hl[rows.length - 1] = 'cur'; });
          return { type: 'table', label: 'Order book (asks on top, bids below; same price = time order)', columns: ['side', 'price', 'qty', 'order'], rows: rows, hl: hl };
        }
        function tradeTable() { return { type: 'table', label: 'Trades', columns: ['qty', 'price', 'taker', 'maker'], rows: trades.length ? trades.slice() : [['-', '-', '-', '-']], hl: trades.length ? (function () { var h = {}; h[trades.length - 1] = 'ok'; return h; })() : {} }; }
        items.forEach(function (it) {
          var m = /^([BbSs])\s+(\d{1,5})\s+(\d{1,5})$/.exec(it);
          if (!m) throw new Error('Bad order "' + it + '". Use "B 100 5" or "S 101 3"');
          var side = m[1].toUpperCase(), p = Number(m[2]), q = Number(m[3]);
          if (q <= 0) throw new Error('Quantity must be positive');
          var o = { id: ++id, p: p, q: q, t: id };
          frames.push({ narr: 'Order <b>#' + o.id + '</b> arrives: ' + (side === 'B' ? 'BUY' : 'SELL') + ' ' + q + ' at ' + p + '. The engine checks the <b>opposite</b> side for a price that crosses.', parts: [bookTable(), tradeTable()] });
          var opp = side === 'B' ? asks : bids;
          for (;;) {
            if (!o.q || !opp.length) break;
            opp.sort(side === 'B' ? function (x, y) { return x.p - y.p || x.t - y.t; } : function (x, y) { return y.p - x.p || x.t - y.t; });
            var best = opp[0];
            var crosses = side === 'B' ? best.p <= p : best.p >= p;
            if (!crosses) break;
            var f = Math.min(o.q, best.q);
            o.q -= f; best.q -= f;
            trades.push([String(f), String(best.p), '#' + o.id, '#' + best.id]);
            frames.push({ narr: 'Best opposite order is <b>#' + best.id + '</b> at ' + best.p + ' (best price, and oldest at that price). Trade <b>' + f + ' @ ' + best.p + '</b> - the <b>resting</b> order’s price, so the aggressive buyer may get a better price than its limit.' + (best.q ? ' #' + best.id + ' still has ' + best.q + ' left.' : ' #' + best.id + ' is fully filled and leaves the book.'), parts: [bookTable(best.id), tradeTable()] });
            if (!best.q) opp.shift();
          }
          if (o.q) {
            (side === 'B' ? bids : asks).push(o);
            frames.push({ narr: '#' + o.id + ' has <b>' + o.q + '</b> left and nothing else crosses, so it <b>rests</b> in the book at ' + p + ', at the <b>back</b> of that price level’s queue.', parts: [bookTable(o.id), tradeTable()] });
          }
        });
        var bb = bids.length ? Math.max.apply(null, bids.map(function (x) { return x.p; })) : '-';
        var ba = asks.length ? Math.min.apply(null, asks.map(function (x) { return x.p; })) : '-';
        frames.push({ narr: 'Final state. The book is never crossed (best bid &lt; best ask). Every event above would be journaled and sent as market data with a sequence number.', parts: [bookTable(), tradeTable(), { type: 'vars', vals: { 'best bid': bb, 'best ask': ba, trades: trades.length } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Which order fills first?', html: `<p>Asks resting: #1 SELL 5 @ 101 (09:00:00.001), #2 SELL 3 @ 101 (09:00:00.005), #3 SELL 4 @ 102. Incoming BUY 10 @ 102:</p>${H.table(['Step', 'Match', 'Why'], [['1', '5 @ 101 with #1', 'best price, earliest'], ['2', '3 @ 101 with #2', 'same price, later'], ['3', '2 @ 102 with #3', 'next level; #3 keeps 2']])}<p>The buyer paid 101 for 8 shares although willing to pay 102: <b>trades happen at the resting price</b>.</p>` },
      { title: 'Data structure choices for a level', html: `<p>A tree map of price → level is O(log L) for a new level. Real engines often use an <b>array indexed by tick</b> around the current price (O(1) level lookup, prices are dense) plus a pointer to the best level. Each level is an <b>intrusive doubly linked list</b> so cancelling order #48291 is: look up in the id map, unlink - O(1). Objects are pre-allocated in pools to avoid garbage-collection pauses.</p>` },
      { title: 'Order types in one loop', html: `<p><b>Market</b>: price = +∞ for buy (−∞ for sell), never rests. <b>IOC</b> (immediate or cancel): match, then cancel the rest. <b>FOK</b> (fill or kill): first check that enough quantity crosses, else reject without trading. <b>Post-only</b>: reject (or reprice) if it would trade immediately. <b>Stop</b>: kept outside the book and injected when the last trade price hits the trigger.</p>` },
      { title: 'Modify rules', html: `<p>Reducing quantity keeps your place in the queue (you only made yourself smaller). Increasing quantity or changing price is treated as <b>cancel + new</b>: you go to the back. Otherwise traders could reserve the front of the queue with 1 share and enlarge it later - unfair to everyone behind them.</p>` }
    ],
    deepDive: `<h4>🟣 Why single-threaded?</h4>
      <p>Matching must be <b>deterministic</b>: the same sequence of inputs always gives the same trades. Locks across threads would let two orders race and the winner would depend on scheduling - unfair and impossible to replay. One thread per book (or per group of books) processing a totally ordered input stream is simpler <i>and</i> faster: no locks, no cache-line bouncing, data stays in CPU cache. LMAX's open-source Disruptor pattern famously reported millions of events per second on a single business-logic thread.</p>
      <h4>Risk checks before the book</h4>
      <p>Pre-trade risk (buying power, position limits, fat-finger price bands, self-trade prevention) runs in the gateway / risk layer so the matching thread only does matching. Exchange-level circuit breakers halt a symbol when price moves too far too fast.</p>
      <h4>Market data</h4>
      <p>Every book change becomes an event: add order, execute, cancel, trade. Feeds are published over UDP <b>multicast</b> with sequence numbers (like Nasdaq ITCH); a receiver that sees a gap asks a retransmit server or a snapshot service. Level 1 = best bid/ask, Level 2 = aggregated depth per price, Level 3 = every order.</p>
      <h4>Bottlenecks and trade-offs</h4>
      <ul>
        <li>A single hot symbol cannot be split across threads without losing determinism - scale by <b>sharding symbols</b> across engines.</li>
        <li>Language: C++ / Rust / Java with off-heap memory and no allocation in the hot path; GC pauses are latency spikes.</li>
        <li>Pro-rata matching (used in some futures markets) allocates fills by size instead of time - a different fairness choice.</li>
        <li>Self-trade prevention, auctions at open/close (a single price maximising matched volume) and halts are extra state machines around the core loop.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> market participants use ML for trading signals and the exchange uses ML-based <b>market surveillance</b> (spoofing, layering, wash trading detection) on the event log. The matching core stays hand-written, deterministic code - an LLM never sits in the hot path.</p>
      <p><b>Use AI as a partner:</b> ask it to generate adversarial order sequences (same-price bursts, cancel/replace races, self-trades) and compare your engine's output against a slow reference implementation - property-based testing.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>double</code> prices, stores the book in a database with row locks, lets several threads match one symbol, or fills at the incoming order's price instead of the resting price.</p>
      <p><b>What you must still own:</b> fairness semantics (price-time, modify rules), determinism, and the latency budget.</p>`,
    problems: [{
      title: 'Order Matching Engine for One Symbol', level: 'Medium', tags: ['order book', 'matching', 'exchange', 'hld'], companies: ['Nasdaq', 'Coinbase', 'Jane Street', 'Citadel'],
      statement: `<p>Design the in-memory order book and matching loop for one instrument. Support limit and market orders, partial fills, cancel and quantity-reduce, and price-time priority. Explain the data structures and the complexity of each operation, and how book changes are published.</p>`,
      constraints: `100K order messages/s for this symbol · 100K resting orders · add/cancel O(1) or O(log L) · deterministic output · integer tick prices.`,
      example: `<p>Book: asks 101×5 (#1), 101×3 (#2), 102×4 (#3). BUY 10 @ 102 arrives. ${H.c('g', 'Trades: 5@101 (#1), 3@101 (#2), 2@102 (#3); #3 rests with 2 left.')}</p>`,
      brute: { why: `<p>Keep all orders in one list and, for every new order, scan and sort all opposite orders to find the best. O(N log N) per message with 100K resting orders is ~2M operations per message - far beyond a microsecond budget. Storing the book in SQL with row locks is even slower and non-deterministic under concurrency.</p>` },
      mcq: { q: 'An aggressive BUY limit at 105 meets a resting SELL at 103. At what price is the trade?', options: ['105', '104 (midpoint)', '103', 'The last trade price'], answer: 2, explain: 'In a continuous limit order book the trade happens at the resting (maker) order’s price; the aggressor gets price improvement.' },
      hints: [`<p>You always need the <b>best price</b> and, at that price, the <b>oldest</b> order. What structure gives "sorted keys" and what gives "FIFO"?</p>`, `<p>Sorted map (or tick-indexed array) of price → FIFO list, for each side; plus an id → order map for cancels.</p>`, `<p>Loop while qty &gt; 0 and the best opposite price crosses; fill at the resting price; remove empty levels. Integer ticks. Emit add/trade/cancel events with sequence numbers.</p>`],
      solution: {
        approach: `<p><b>Structures.</b> Per side, a sorted structure of price levels: a red-black tree / TreeMap (O(log L)), or an array indexed by tick offset with a best-level pointer (O(1) typical). Each level holds an intrusive doubly linked list of orders and a cached total quantity. An <code>order_id → node</code> hash map supports O(1) cancel and reduce.</p>
          <p><b>Matching.</b> For an incoming buy at P (market = +∞): while remaining &gt; 0 and best ask ≤ P, take the head order of the best ask level, fill min(remaining, head.qty) at the head's price, emit a trade event, remove the head if empty and the level if empty. Then rest any remainder (limit, GTC) at the tail of its level, or cancel it (IOC / market). Sells mirror this. Reduce-qty keeps position; price change or qty increase = cancel + new.</p>
          <p><b>Publishing.</b> Each operation appends events (accepted, trade, cancelled, book delta) with a per-symbol sequence number to an output ring buffer that feeds the journal, execution reports and multicast market data. Only the single matching thread touches the book, so no locks are needed and replaying the same input reproduces identical output.</p>`,
        complexity: `<p>Add without match: O(log L) tree or O(1) array. Each fill: O(1). Cancel: O(1). Best bid/ask: O(1). Memory: O(resting orders).</p>`,
        followUps: ['How would you implement an opening auction?', 'How do you add self-trade prevention?']
      }
    }]
  });

  /* ================= TOPIC 5: STOCK EXCHANGE - SEQUENCING, LATENCY & FAIRNESS ================= */
  topics.push({
    title: 'Design a Stock Exchange II: Sequencer, Event Log, Low Latency & Fairness',
    analogy: `<p>Think of a <b>deli counter with a ticket machine</b>. It does not matter who shouts loudest; whoever pulls ticket #47 is served before #48. Two clerks behind the counter each keep a copy of the ticket list, so if one goes home sick the other knows exactly who is next and what each customer ordered. Everyone stands the same distance from the machine, so nobody gets a head start.</p>
      <p>The ticket machine is the <b>sequencer</b>, the list is the <b>event log</b>, the second clerk is a <b>replica that replays the log</b>, and "same distance" is exchange <b>fairness</b> (equal cable lengths in colocation).</p>`,
    explain: `<p>Topic 4 built the matching core. Now the system around it: how orders get a <b>single total order</b>, how the engine survives crashes without losing a trade, and how latency stays tiny and fair.</p>
      <h4>1. Requirements (system level)</h4>
      <ul>
        <li>Every accepted order gets a <b>global sequence number</b>; the engine processes in that order only.</li>
        <li>Zero data loss: an acknowledged order or trade is never forgotten, even if the primary engine dies.</li>
        <li>Failover in milliseconds to seconds with <b>identical state</b>.</li>
        <li>Fair access: no participant can see or act on information before others through the exchange's own systems.</li>
      </ul>
      <h4>2. Numbers that drive the design</h4>
      ${H.table(['Item', 'Typical figure', 'Consequence'], [
        ['Disk fsync', '~10-100 µs on NVMe, more on cloud disks', 'too slow per message → batch, or replicate to memory of other nodes first'],
        ['Same-rack network hop', '~5-20 µs with kernel-bypass NICs', 'replicate to 2 standbys before acking is affordable'],
        ['GC pause (untuned JVM)', 'ms to 100s of ms', 'pre-allocate, off-heap, or C++/Rust'],
        ['Messages/day', '~5B × 100 B', '~500 GB journal per day']
      ])}
      <h4>3. Architecture</h4>
      <ol>
        <li><b>Gateways</b> (FIX / binary) authenticate sessions, check message format, dedupe by client_order_id.</li>
        <li><b>Pre-trade risk</b> checks.</li>
        <li><b>Sequencer</b>: stamps each inbound message with a monotonically increasing sequence number and writes it to the <b>replicated journal</b>. This is the moment an order "exists".</li>
        <li><b>Matching engines</b> (primary + hot standbys) consume the journal <b>in sequence order</b> and run the deterministic matching logic. Because input and logic are identical, every replica has the same book.</li>
        <li><b>Output</b>: execution reports, market data (multicast), drop copies, clearing/settlement and the trade database consume the engine's output events - all <b>off the hot path</b>.</li>
      </ol>
      <h4>4. Event sourcing = recovery for free</h4>
      <p>The book is just <code>fold(apply, emptyBook, journal)</code>. Snapshots every N million messages bound replay time: restart = load snapshot at seq S, replay S+1 to the end. This is the <b>state machine replication</b> idea (same as Raft logs), applied to trading.</p>
      <p>The visualizer sends interleaved messages from two gateways through a sequencer, then shows a standby engine replaying the same log and ending in exactly the same state.</p>`,
    clues: [
      '"must be fair / deterministic / auditable" → <b>single sequencer</b> + append-only journal; engine is a deterministic state machine',
      '"no trade may be lost if the engine crashes" → replicate the journal (quorum or primary + standbys) <b>before</b> acknowledging',
      '"failover with identical state" → hot standby <b>replays the same sequenced log</b> (state machine replication)',
      '"microsecond latency" → in-memory, single-threaded, kernel bypass, no GC, batching of journal writes',
      '"market data to thousands of clients" → UDP multicast with sequence numbers + retransmit/snapshot service',
      '"why can’t we scale with more threads on one symbol?" → total order per symbol; scale by <b>sharding symbols</b>'
    ],
    code: [{
      lang: 'js', run: true, title: 'Sequencer + journal + deterministic replay on a standby engine (runnable)',
      code: `// Gateways send messages concurrently; the sequencer gives one total order.
// Two engine replicas apply the same journal and must end in identical states.

class Sequencer {
  constructor() { this.next = 1; this.journal = []; this.seenClientIds = new Set(); }
  accept(msg) {
    const key = msg.session + ':' + msg.clOrdId;
    if (this.seenClientIds.has(key)) return null;            // resent duplicate from the gateway
    this.seenClientIds.add(key);
    const entry = Object.assign({ seq: this.next++ }, msg);
    this.journal.push(entry);                                  // replicated + persisted in a real system
    return entry.seq;
  }
}

class Engine {
  constructor(name) { this.name = name; this.bids = []; this.asks = []; this.trades = []; this.lastSeq = 0; }
  apply(e) {
    if (e.seq !== this.lastSeq + 1) throw new Error(this.name + ' gap before seq ' + e.seq);
    this.lastSeq = e.seq;
    const buy = e.side === 'B', book = buy ? this.asks : this.bids;
    let qty = e.qty;
    while (qty > 0 && book.length && (buy ? book[0].price <= e.price : book[0].price >= e.price)) {
      const r = book[0], f = Math.min(qty, r.qty);
      qty -= f; r.qty -= f;
      this.trades.push(f + '@' + r.price + '(' + e.clOrdId + 'x' + r.id + ')');
      if (r.qty === 0) book.shift();
    }
    if (qty > 0) {
      const side = buy ? this.bids : this.asks;
      side.push({ id: e.clOrdId, price: e.price, qty, seq: e.seq });
      // Price priority, then time priority (= sequence number, not wall-clock time).
      side.sort((a, b) => (buy ? b.price - a.price : a.price - b.price) || a.seq - b.seq);
    }
  }
  digest() {
    const s = JSON.stringify([this.bids, this.asks, this.trades]);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }
}

const seq = new Sequencer();
const arrivals = [
  { session: 'g1', clOrdId: 'A1', side: 'S', price: 101, qty: 5 },
  { session: 'g2', clOrdId: 'B1', side: 'S', price: 101, qty: 3 },
  { session: 'g1', clOrdId: 'A1', side: 'S', price: 101, qty: 5 },   // network retry: duplicate
  { session: 'g2', clOrdId: 'B2', side: 'B', price: 102, qty: 6 },
  { session: 'g1', clOrdId: 'A2', side: 'B', price: 100, qty: 4 },
  { session: 'g2', clOrdId: 'B3', side: 'S', price: 99, qty: 2 }
];
for (const m of arrivals) console.log(m.session, m.clOrdId, '-> seq', seq.accept(m));

const primary = new Engine('primary');
for (const e of seq.journal) primary.apply(e);
// The primary "crashes". A standby that replays the same journal reaches the same state.
const standby = new Engine('standby');
for (const e of seq.journal) standby.apply(e);
console.log('trades:', primary.trades.join(', '));
console.log('primary digest', primary.digest(), 'standby digest', standby.digest(), primary.digest() === standby.digest() ? 'IDENTICAL' : 'DIVERGED');
`
    }],
    codeTitle: ['Sequencer + deterministic replay (JavaScript, runnable)'],
    viz: [{
      title: 'Two gateways, one sequencer, two identical engines',
      input: 'g1:S101x5 g2:S101x3 g1:B102x6 g2:B100x4 g1:S99x2',
      inputLabel: 'messages gateway:SIDEpricexqty in arrival order',
      gen: function (input) {
        var toks = words(input).slice(0, 10);
        if (toks.length < 2) throw new Error('Give at least two messages like g1:S101x5 g2:B102x6');
        var msgs = toks.map(function (t, i) {
          var m = /^(g\d):([BS])(\d{1,5})x(\d{1,5})$/i.exec(t);
          if (!m) throw new Error('Bad message "' + t + '". Use g1:S101x5');
          return { gw: m[1].toLowerCase(), side: m[2].toUpperCase(), price: Number(m[3]), qty: Number(m[4]), id: 'm' + (i + 1) };
        });
        var frames = [], journal = [];
        function g(hl, ehl) {
          return { type: 'graph', directed: true, height: 60, label: 'Exchange core', nodes: [
            { id: 'g1', label: 'Gateway 1', x: 8, y: 14, shape: 'box' }, { id: 'g2', label: 'Gateway 2', x: 8, y: 46, shape: 'box' },
            { id: 'SQ', label: 'Sequencer + journal', x: 42, y: 30, shape: 'box' },
            { id: 'P', label: 'Engine (primary)', x: 82, y: 14, shape: 'box' }, { id: 'S', label: 'Engine (standby)', x: 82, y: 46, shape: 'box' }],
            edges: [['g1', 'SQ'], ['g2', 'SQ'], ['SQ', 'P'], ['SQ', 'S']], hl: hl || {}, ehl: ehl || {} };
        }
        msgs.forEach(function (m) {
          journal.push([String(journal.length + 1), m.gw, m.side + ' ' + m.qty + ' @ ' + m.price]);
          var eh = {}; eh[m.gw + '-SQ'] = 'cur'; var nh = {}; nh[m.gw] = 'cur'; nh.SQ = 'ok';
          frames.push({ narr: m.gw + ' sends ' + (m.side === 'B' ? 'BUY' : 'SELL') + ' ' + m.qty + ' @ ' + m.price + '. The sequencer stamps it <b>seq ' + journal.length + '</b> and appends it to the replicated journal. Only now does the order officially exist - its time priority <b>is</b> this number.', parts: [g(nh, eh), { type: 'table', label: 'Journal (total order)', columns: ['seq', 'from', 'message'], rows: journal.slice(), hl: (function () { var h = {}; h[journal.length - 1] = 'ok'; return h; })() }] });
        });
        function run() {
          var bids = [], asks = [], trades = [];
          msgs.forEach(function (m, i) {
            var buy = m.side === 'B', book = buy ? asks : bids, q = m.qty;
            while (q > 0 && book.length && (buy ? book[0].p <= m.price : book[0].p >= m.price)) {
              var r = book[0], f = Math.min(q, r.q); q -= f; r.q -= f; trades.push(f + '@' + r.p);
              if (!r.q) book.shift();
            }
            if (q > 0) { var side = buy ? bids : asks; side.push({ p: m.price, q: q, s: i }); side.sort(function (a, b) { return (buy ? b.p - a.p : a.p - b.p) || a.s - b.s; }); }
          });
          return { bids: bids.map(function (o) { return o.q + '@' + o.p; }).join(' ') || '-', asks: asks.map(function (o) { return o.q + '@' + o.p; }).join(' ') || '-', trades: trades.join(', ') || '-' };
        }
        var r = run();
        frames.push({ narr: 'The <b>primary engine</b> reads the journal in sequence order and matches. Output: trades and the resulting book.', parts: [g({ P: 'ok', SQ: 'cur' }, { 'SQ-P': 'ok' }), { type: 'vars', label: 'Primary state', vals: { bids: r.bids, asks: r.asks, trades: r.trades } }] });
        frames.push({ narr: 'The <b>standby</b> reads the <i>same</i> journal with the <i>same</i> deterministic code (no clocks, no random, no thread races), so it reaches the <b>same</b> state, step by step.', parts: [g({ S: 'ok', SQ: 'cur' }, { 'SQ-S': 'ok' }), { type: 'vars', label: 'Standby state', vals: { bids: r.bids, asks: r.asks, trades: r.trades } }] });
        frames.push({ narr: 'The primary <b>crashes</b>. The standby is promoted: it already holds the identical book and continues from the next sequence number. No acknowledged order is lost because acks are sent only after the journal entry is replicated.', parts: [g({ P: 'bad', S: 'sel' }, { 'SQ-P': 'bad', 'SQ-S': 'ok' }), { type: 'vars', vals: { 'last seq': journal.length, 'next seq': journal.length + 1, 'state equal': 'yes' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Ack only after replication', html: `<p>Timeline for one order: gateway → sequencer assigns seq 9,001 → journal entry sent to 2 replicas (in memory) → both confirm (~20 µs) → engine processes → ack to client. If we acked before replication and the sequencer died, the client would believe an order exists that no replica knows about. Batching: the sequencer can replicate 100 messages in one network packet, keeping throughput high while each message still waits only microseconds. Disk persistence happens asynchronously from the replicas.</p>` },
      { title: 'Time priority = sequence number, not clocks', html: `<p>Two gateways' clocks differ by 30 µs. If priority used gateway timestamps, a participant on a fast-clock gateway would jump the queue. Using the sequencer's number as the only notion of "earlier" makes the order unambiguous and replayable. Wall-clock timestamps are still recorded for regulators (e.g. MiFID II requires clock sync to UTC within 100 µs for high-frequency trading activity), but they never decide priority.</p>` },
      { title: 'Fairness in the physical world', html: `<p>Exchanges offer <b>colocation</b>: traders rent racks in the exchange's data centre. To be fair, every cage gets <b>equal-length cables</b> to the exchange switch, so nobody is closer. Some venues add a <b>speed bump</b> (IEX: a 350 µs delay from 38 miles of coiled fibre) so fast traders cannot exploit stale quotes. Others run <b>frequent batch auctions</b> (match every few ms at one price) to remove the speed race altogether.</p>` },
      { title: 'Recovery math', html: `<p>Snapshot every 10M messages. Replay speed 5M msgs/s. Worst case after a crash: load snapshot (~1 s) + replay ≤ 10M messages (2 s) ≈ 3 s. A hot standby that is already replaying in real time fails over in milliseconds - the snapshot path is for cold restarts and new replicas.</p>` }
    ],
    deepDive: `<h4>🟣 Sequencer high availability</h4>
      <p>The sequencer is a single logical point. Make it highly available with a <b>consensus-replicated log</b> (Raft, or Aeron Cluster in the Java low-latency world): the leader assigns numbers, a majority must store the entry before it is committed. On leader failure a new leader is elected and continues numbering from the last committed entry. Uncommitted entries were never acked, so clients resend them (dedupe by client_order_id).</p>
      <h4>Determinism rules for the engine</h4>
      <ul>
        <li>No reading wall-clock time inside matching - time comes from the journal entry.</li>
        <li>No hash-map iteration order dependence, no randomness, no multithreading over one book.</li>
        <li>Same code version on all replicas; upgrades happen at a known sequence number.</li>
      </ul>
      <h4>Low-latency techniques</h4>
      <ul>
        <li><b>Kernel bypass</b> networking (DPDK, Solarflare/OpenOnload, RDMA), busy-spinning threads pinned to isolated CPU cores.</li>
        <li><b>Ring buffers</b> between stages (Disruptor) - no locks, no allocation, mechanical sympathy with CPU caches.</li>
        <li>Binary protocols (SBE, ITCH/OUCH) instead of text FIX on the hottest paths.</li>
        <li>FPGAs for feed handlers and pre-trade risk at the very top end.</li>
      </ul>
      <h4>Scaling</h4>
      <p>Shard instruments across engine groups (each group: sequencer + primary + standbys). Cross-symbol features (portfolio margin) happen in risk services fed by the output events. Clearing, settlement (T+1 in the US since May 2024), reporting and analytics read the event stream into durable databases - slow and safe, separated from the fast core.</p>
      <h4>Trade-offs</h4>
      <ul>
        <li>Replicating before ack adds microseconds but guarantees no lost orders.</li>
        <li>One thread per book is the throughput ceiling for a single symbol - accepted for determinism.</li>
        <li>Continuous matching rewards speed; batch auctions trade immediacy for fairness.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> surveillance models read the sequenced event log to flag manipulation; capacity planning uses forecasting for volatile days. The sequencer and engine remain deterministic code with exhaustive tests; nondeterministic models are kept out of the critical path by design.</p>
      <p><b>Use AI as a partner:</b> ask it to list every source of nondeterminism in a code sample, or to build a replay-diff tool that runs two engine versions on a production journal and reports the first divergent event.</p>
      <p><b>Where AI goes wrong:</b> it proposes Kafka with default settings as the sequencer (millisecond latency, consumer-group rebalancing), timestamps from many servers as priority, or "scale matching with a thread pool".</p>
      <p><b>What you must still own:</b> the ack-after-replication rule, determinism discipline and the fairness story.</p>`,
    problems: [{
      title: 'Crash an Exchange Engine Without Losing a Trade', level: 'Hard', tags: ['sequencer', 'event sourcing', 'replication', 'hld'], companies: ['Nasdaq', 'LMAX', 'CME Group', 'Coinbase'],
      statement: `<p>Your matching engine is in-memory. Design the sequencing, journaling and replication so that (1) every acknowledged order and trade survives a crash of any single machine, (2) a standby takes over within 100 ms with identical state, and (3) latency stays in tens of microseconds.</p>`,
      constraints: `200K msgs/s per engine group · ack p99 &lt; 50 µs · failover &lt; 100 ms · 500 GB journal per day · full audit replay for regulators.`,
      example: `<p>Orders seq 1-1000 processed; the primary dies while processing seq 1001. ${H.c('g', 'Standby')} has the same book through seq 1000 and seq 1001 in its journal (it was replicated before being acked), processes it, and continues. ${H.c('r', 'Without a sequenced journal')} the standby would not know which orders were accepted or in what order.</p>`,
      brute: { why: `<p>Write every order and book update to a relational DB in a transaction, and on crash reload from the DB. Each commit costs milliseconds (fsync, locks), so 200K msgs/s is impossible, and two app servers writing concurrently produce a non-deterministic order.</p>` },
      mcq: { q: 'Why must the engine avoid reading the wall clock while matching?', options: ['Clocks are slow to read', 'Replicas replaying the log would see different times and could diverge', 'Regulators forbid timestamps', 'It makes the order book larger'], answer: 1, explain: 'State machine replication only works if applying the same log gives the same result. Any input not in the log (clock, randomness, thread timing) can make replicas diverge.' },
      hints: [`<p>Make the book a pure function of an ordered list of inputs.</p>`, `<p>Sequencer assigns numbers and replicates each entry to standbys (or a consensus majority) before ack; engines replay the log deterministically.</p>`, `<p>Add snapshots for bounded restart, client_order_id dedupe for resends after failover, gap detection by sequence number, async disk persistence and an archive for audits.</p>`],
      solution: {
        approach: `<p><b>Pipeline.</b> Gateways → risk → <b>sequencer leader</b> (part of a 3-node Raft-style cluster on the same switch). The leader assigns seq numbers, batches entries and sends them to followers; when a majority has the entry in memory, it is committed and passed to the matching engine. Primary and standby engines both consume committed entries; the primary's output is used, the standby's is compared via periodic state digests.</p>
          <p><b>Durability.</b> Committed entries are on at least two machines' memory before any ack; each node writes them to local NVMe asynchronously, and an archiver copies the journal to durable storage for regulators. Snapshots of each book every few million messages allow restarts in seconds.</p>
          <p><b>Failover.</b> Health checks / missed heartbeats (a few ms) trigger election of a new sequencer leader, which continues from the last committed seq; the standby engine is promoted. Clients reconnect and resend unacknowledged orders; dedupe by (session, client_order_id) prevents doubles. Market data consumers detect gaps by sequence number and request retransmits.</p>
          <p><b>Latency.</b> Pinned single-threaded stages with ring buffers, kernel-bypass NICs, no allocation in the hot path, binary protocol. The replication hop adds ~10-20 µs - the accepted price of zero loss.</p>`,
        complexity: `<p>O(1) work per message per stage; replication cost one network round trip per batch. Recovery time bounded by snapshot interval / replay speed.</p>`,
        followUps: ['How do you upgrade the engine code without downtime?', 'How do you prove to a regulator that the replay matches what happened?']
      }
    }]
  });

  /* ================= TOPIC 6: COLLABORATIVE EDITOR ================= */
  function otApply(doc, op) {
    if (!op || op.t === 'noop') return doc;
    return op.t === 'ins' ? doc.slice(0, op.p) + op.c + doc.slice(op.p) : doc.slice(0, op.p) + doc.slice(op.p + 1);
  }
  // Transform op a so it can be applied after op b (both made on the same version). site breaks insert ties.
  function otT(a, b) {
    if (a.t === 'noop' || b.t === 'noop') return a;
    var r = { t: a.t, p: a.p, c: a.c, s: a.s };
    if (a.t === 'ins' && b.t === 'ins') { if (b.p < a.p || (b.p === a.p && b.s < a.s)) r.p++; }
    else if (a.t === 'ins' && b.t === 'del') { if (b.p < a.p) r.p--; }
    else if (a.t === 'del' && b.t === 'ins') { if (b.p <= a.p) r.p++; }
    else { if (b.p < a.p) r.p--; else if (b.p === a.p) return { t: 'noop', s: a.s }; }
    return r;
  }
  function otStr(op) { return op.t === 'noop' ? 'no-op' : op.t === 'ins' ? 'insert "' + op.c + '" at ' + op.p : 'delete at ' + op.p; }

  topics.push({
    title: 'Design a Collaborative Editor (Google Docs): OT vs CRDTs, Presence & Offline Sync',
    analogy: `<p>Two friends edit the same <b>shopping list on paper copies</b>, far apart. Ana writes "milk" at line 2; Ben, at the same moment, crosses out line 1. When they phone each other to sync, Ana cannot just say "put milk at line 2" - after Ben's deletion, her line 2 is now Ben's line 1. She has to <b>adjust her instruction</b> for what Ben did. Do it right and both lists end up identical.</p>
      <p>Adjusting instructions is <b>Operational Transformation (OT)</b>. The other trick is to give every word a <b>permanent name tag</b> ("insert milk after the tag 'eggs#ana'") so instructions never need adjusting - that is a <b>CRDT</b>.</p>`,
    explain: `<p><b>Goal:</b> many people edit one document at the same time, see each other's changes and cursors in real time, can work offline, and everyone always ends up with <b>the same text</b> without losing anyone's typing.</p>
      <h4>1. Requirements</h4>
      <ul>
        <li><b>Functional:</b> real-time co-editing of rich text; live cursors / selections (<b>presence</b>); comments; version history and restore; sharing permissions; offline editing that syncs later.</li>
        <li><b>Non-functional:</b> local typing feels instant (apply locally first, &lt; 16 ms); remote edits appear within ~100-300 ms; <b>convergence</b> (all replicas reach the same state); <b>intention preservation</b>; durability of every acknowledged edit; scale to millions of documents, typically &lt; 100 concurrent editors per doc.</li>
      </ul>
      <h4>2. Back-of-envelope estimates</h4>
      ${H.table(['Quantity', 'Assumption', 'Result'], [
        ['Concurrent docs open', '10M users online, 1.5 docs each', '~15M open docs, most with 1 editor'],
        ['Operations', 'active typist ≈ 5 ops/s; 3M typing at once', '≈ <b>15M ops/s</b> - batch keystrokes per ~50-100 ms'],
        ['Op size', '~50-100 B with metadata', '~1 GB/s ingest before batching; far less after'],
        ['Presence', 'cursor updates throttled to 10/s per user', 'ephemeral, never stored']
      ])}
      <p>The insight: each document is a <b>small, independent, hot</b> unit. Route all editors of one doc to <b>one document server</b> (by doc_id) - that gives a natural place to order operations - and scale by having many docs on many servers.</p>
      <h4>3. API</h4>
      ${H.table(['Call', 'Notes'], [
        ['<code>GET /docs/{id}?version=v</code>', 'Snapshot + version number (or CRDT state).'],
        ['<code>WS /docs/{id}/session</code>', 'Client sends {base_version, ops[], client_seq}; server broadcasts transformed ops with new version; also presence messages.'],
        ['<code>GET /docs/{id}/history?from=v1&amp;to=v2</code>', 'Ops log for history and catch-up after reconnect.'],
        ['<code>POST /docs/{id}/restore</code> {version}', 'Implemented as new ops, never by rewriting history.']
      ])}
      <h4>4. Data model</h4>
      <ul>
        <li><b>ops log</b>(doc_id, version, user, op, ts) - append-only, the source of truth; sharded by doc_id.</li>
        <li><b>snapshots</b>(doc_id, version, content) every N ops - so loading does not replay from version 0.</li>
        <li><b>presence</b>: in memory on the doc server (user → cursor, colour, last_seen) with a short TTL.</li>
      </ul>
      <h4>5. High-level design (OT, the Google Docs way)</h4>
      <ol>
        <li>Client applies an edit locally at once, then sends it with the server version it was based on. It keeps at most one batch <b>in flight</b> and buffers newer edits.</li>
        <li>The <b>doc server</b> (one owner per document) transforms the incoming op against all ops committed since its base version, assigns the next version, appends it to the log, and broadcasts it.</li>
        <li>Other clients transform the incoming op against their own pending local ops, then apply it. The sender receives an ack and sends its next batch.</li>
      </ol>
      <p>The central server gives a <b>single order</b>, which makes OT much simpler (the Jupiter model): only client-vs-server transforms are needed, never peer-to-peer ones. The visualizer below runs exactly this transform on two concurrent edits.</p>`,
    clues: [
      '"Google Docs / Figma / Notion style real-time co-editing" → <b>OT with a central server</b> or <b>CRDTs</b>',
      '"two users type at the same position at the same time" → transform with a deterministic <b>tie-break</b> (site id)',
      '"works offline and merges later" / "peer-to-peer" → <b>CRDT</b> (Yjs, Automerge) - merge without a central order',
      '"show other people’s cursors" → <b>presence</b>: ephemeral, throttled, not persisted, transform cursor positions too',
      '"version history" → append-only <b>ops log + periodic snapshots</b>',
      '"millions of docs, few editors each" → <b>route by doc_id</b> to one stateful doc server (consistent hashing)'
    ],
    code: [{
      lang: 'js', run: true, title: 'OT for insert/delete with a central server, checked for convergence (runnable)',
      code: `// Character-level OT. An op is { t: 'ins'|'del'|'noop', p: position, c: char, s: siteId }.
function apply(doc, op) {
  if (op.t === 'noop') return doc;
  return op.t === 'ins' ? doc.slice(0, op.p) + op.c + doc.slice(op.p) : doc.slice(0, op.p) + doc.slice(op.p + 1);
}
// Transform a so that it applies after b; both were made against the same document.
function transform(a, b) {
  if (a.t === 'noop' || b.t === 'noop') return a;
  const r = Object.assign({}, a);
  if (a.t === 'ins' && b.t === 'ins') { if (b.p < a.p || (b.p === a.p && b.s < a.s)) r.p++; }
  else if (a.t === 'ins' && b.t === 'del') { if (b.p < a.p) r.p--; }
  else if (a.t === 'del' && b.t === 'ins') { if (b.p <= a.p) r.p++; }
  else { if (b.p < a.p) r.p--; else if (b.p === a.p) return { t: 'noop', s: a.s }; }   // both deleted the same char
  return r;
}

// Central server: keeps the log; transforms an op made at baseVersion against everything after it.
class Server {
  constructor(text) { this.doc = text; this.log = []; }
  receive(op, baseVersion) {
    let t = op;
    for (let v = baseVersion; v < this.log.length; v++) t = transform(t, this.log[v]);
    this.log.push(t); this.doc = apply(this.doc, t);
    return { op: t, version: this.log.length };
  }
}

// Exhaustively check TP1 convergence for all pairs of single ops on a short document.
const base = 'abcd';
const ops = [];
for (let p = 0; p <= base.length; p++) { ops.push({ t: 'ins', p, c: 'X', s: 1 }); ops.push({ t: 'ins', p, c: 'Y', s: 2 }); }
for (let p = 0; p < base.length; p++) { ops.push({ t: 'del', p, s: 1 }); ops.push({ t: 'del', p, s: 2 }); }
let pairs = 0, bad = 0;
for (const a of ops) for (const b of ops) {
  if (a.s === b.s) continue;                         // concurrent ops come from different sites
  const left = apply(apply(base, a), transform(b, a));
  const right = apply(apply(base, b), transform(a, b));
  pairs++; if (left !== right) bad++;
}
console.log('checked', pairs, 'concurrent pairs, divergent:', bad);

// A session: Ana inserts "X" at 1, Ben deletes index 2, both based on version 0.
const srv = new Server('abcd');
const ana = { t: 'ins', p: 1, c: 'X', s: 1 }, ben = { t: 'del', p: 2, s: 2 };
const r1 = srv.receive(ana, 0);
const r2 = srv.receive(ben, 0);        // transformed against Ana's op: delete moves to index 3
console.log('server applied', JSON.stringify(r1.op), 'then', JSON.stringify(r2.op), '->', srv.doc);
// Ana's client: has applied her op; receives Ben's transformed op.
const anaDoc = apply(apply('abcd', ana), r2.op);
// Ben's client: applied his op locally first; transforms Ana's op against his pending one.
const benDoc = apply(apply('abcd', ben), transform(ana, ben));
console.log('ana sees', anaDoc, '| ben sees', benDoc, '| server', srv.doc);
`
    }, {
      lang: 'js', run: true, title: 'A tiny sequence CRDT (RGA-style): concurrent inserts merge without transforms (runnable)',
      code: `// Each character gets a unique, permanent id (counter, site). Insert says "put me after id X".
// Concurrent inserts after the same id are ordered by id (higher first): every replica decides the same way.
class RGA {
  constructor(site) { this.site = site; this.clock = 0; this.items = []; }   // items in document order
  static greater(a, b) { return a.ctr !== b.ctr ? a.ctr > b.ctr : a.site > b.site; }
  localInsert(afterId, ch) {
    const id = { ctr: Math.max(this.clock, ...this.items.map((i) => i.id.ctr)) + 1, site: this.site };
    this.clock = id.ctr;
    const op = { type: 'ins', id, after: afterId, ch };
    this.applyOp(op); return op;
  }
  localDelete(id) { const op = { type: 'del', id }; this.applyOp(op); return op; }
  find(id) { return this.items.findIndex((i) => i.id.ctr === id.ctr && i.id.site === id.site); }
  applyOp(op) {
    if (op.type === 'del') { const k = this.find(op.id); if (k >= 0) this.items[k].dead = true; return; }   // tombstone
    if (this.find(op.id) >= 0) return;                                                              // idempotent
    let k = op.after ? this.find(op.after) + 1 : 0;
    // Skip over items inserted concurrently after the same anchor that have a greater id.
    while (k < this.items.length && RGA.greater(this.items[k].id, op.id)) k++;
    this.items.splice(k, 0, { id: op.id, ch: op.ch, dead: false });
  }
  text() { return this.items.filter((i) => !i.dead).map((i) => i.ch).join(''); }
}

const ana = new RGA('ana'), ben = new RGA('ben');
const h = ana.localInsert(null, 'H'); ben.applyOp(h);
const i = ana.localInsert(h.id, 'i'); ben.applyOp(i);
// Offline: both type after "H" at the same time, and Ben deletes "i".
const a1 = ana.localInsert(h.id, '!');
const b1 = ben.localInsert(h.id, '?');
const b2 = ben.localDelete(i.id);
// Reconnect: exchange ops in any order (even twice) - same result.
[b1, b2, b1].forEach((op) => ana.applyOp(op));
[a1].forEach((op) => ben.applyOp(op));
console.log('ana:', ana.text(), '| ben:', ben.text(), '| converged:', ana.text() === ben.text());
`
    }],
    codeTitle: ['Operational transformation (JavaScript, runnable)', 'RGA-style sequence CRDT (JavaScript, runnable)'],
    viz: [{
      title: 'Two concurrent edits, transformed so both screens agree',
      input: 'abcd | A: ins 1 X | B: del 2',
      inputLabel: 'start text | A: ins POS CHAR or del POS | B: ins POS CHAR or del POS',
      gen: function (input) {
        var segs = String(input || '').split('|').map(function (s) { return s.trim(); });
        if (segs.length < 3) throw new Error('Format: abcd | A: ins 1 X | B: del 2');
        var doc = segs[0];
        if (!/^[a-z]{1,10}$/i.test(doc)) throw new Error('Start text: 1-10 letters');
        function parse(s, who, site) {
          var m = /^([AB])\s*:\s*(ins|del)\s+(\d+)(?:\s+(\S))?$/i.exec(s);
          if (!m || m[1].toUpperCase() !== who) throw new Error('Write "' + who + ': ins 1 X" or "' + who + ': del 2"');
          var t = m[2].toLowerCase(), p = Number(m[3]);
          if (t === 'ins' && (p > doc.length || !m[4])) throw new Error(who + ': insert position 0-' + doc.length + ' and one character');
          if (t === 'del' && p >= doc.length) throw new Error(who + ': delete position 0-' + (doc.length - 1));
          return { t: t, p: p, c: m[4], s: site };
        }
        var a = parse(segs[1], 'A', 1), b = parse(segs[2], 'B', 2);
        function arr(s, label, hl) { return { type: 'array', label: label, values: s.split(''), showIdx: true, hl: hl || {} }; }
        var frames = [];
        var docA = otApply(doc, a), docB = otApply(doc, b);
        frames.push({ narr: 'Both users start from <b>"' + doc + '"</b> (version 0). Ana and Ben edit <b>at the same time</b>, without seeing each other’s change yet.', parts: [arr(doc, 'Shared document v0'), { type: 'vars', vals: { 'Ana (site 1)': otStr(a), 'Ben (site 2)': otStr(b) } }] });
        frames.push({ narr: 'Each applies <b>their own</b> edit locally at once (typing must feel instant). Now the screens differ: Ana sees "' + docA + '", Ben sees "' + docB + '".', parts: [arr(docA, 'Ana’s screen'), arr(docB, 'Ben’s screen')] });
        var naiveA = otApply(docA, b), naiveB = otApply(docB, a);
        frames.push({ narr: '<b>Naive sync</b>: each just applies the other’s op as-is. Ana gets "' + naiveA + '", Ben gets "' + naiveB + '". ' + (naiveA === naiveB ? 'This time they happen to match, but positions can still mean different characters - try ins 1 X with del 0.' : '<b>They diverge!</b> Position numbers referred to the old document.'), parts: [arr(naiveA, 'Ana (naive)', naiveA === naiveB ? {} : { 0: 'bad' }), arr(naiveB, 'Ben (naive)', naiveA === naiveB ? {} : { 0: 'bad' })] });
        var bT = otT(b, a), aT = otT(a, b);
        frames.push({ narr: 'The server received Ana’s op first (version 1). Ben’s op was based on v0, so the server <b>transforms</b> it against Ana’s: ' + otStr(b) + ' → <b>' + otStr(bT) + '</b>. Rule: an earlier insert shifts later positions right; an earlier delete shifts them left; equal-position inserts are ordered by site id.', parts: [{ type: 'table', label: 'Transform', columns: ['op', 'against', 'result'], rows: [['B: ' + otStr(b), 'A: ' + otStr(a), otStr(bT)], ['A: ' + otStr(a), 'B: ' + otStr(b), otStr(aT)]], hl: { 0: 'cur' } }] });
        var finA = otApply(docA, bT), finB = otApply(docB, aT);
        frames.push({ narr: 'Ana applies Ben’s <b>transformed</b> op → "' + finA + '". Ben, whose own op was still pending, transforms Ana’s op against it → ' + otStr(aT) + ' → "' + finB + '".', parts: [arr(finA, 'Ana’s screen', {}), arr(finB, 'Ben’s screen', {})] });
        frames.push({ narr: finA === finB ? '<b>Converged</b>: both see "' + finA + '", and both intentions survived (Ana’s insert and Ben’s delete). This property, apply(a, T(b,a)) = apply(b, T(a,b)), is called <b>TP1</b>.' : 'Diverged - this input hit an unsupported case.', parts: [{ type: 'vars', vals: { 'Ana final': finA, 'Ben final': finB, converged: finA === finB ? 'yes' : 'no' }, hl: { converged: finA === finB ? 'ok' : 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Same position, same moment', html: `<p>Doc "ab". Ana (site 1) inserts "X" at 1, Ben (site 2) inserts "Y" at 1. Without a tie-break, Ana gets "aXYb" and Ben "aYXb". Rule: on equal position, the lower site id goes first. Ben transforms Ana's op: same position, Ana's site is lower, so it stays at 1 → "aXYb". Ana transforms Ben's op: same position, Ana's site lower, so Ben's shifts to 2 → "aXYb". Converged.</p>` },
      { title: 'OT vs CRDT in one table', html: `${H.table(['', 'OT (Google Docs)', 'CRDT (Yjs, Automerge, Figma-like)'], [['Ordering', 'central server orders ops', 'no central order needed'], ['Identity of positions', 'integer indexes, transformed', 'unique ids per element'], ['Offline / P2P', 'hard (long divergence = many transforms)', 'natural - merge any time'], ['Metadata', 'small', 'ids + tombstones (compressed heavily in modern libraries)'], ['Server role', 'transform + order', 'relay + store (optional)'], ['Correctness', 'transform functions are notoriously tricky', 'proved convergent by construction']])}<p>Figma uses a server-authoritative model inspired by CRDTs (per-property last-writer-wins for design objects); Google Docs uses OT; Notion, Linear and many newer apps use CRDT libraries for text or sync engines.</p>` },
      { title: 'Presence without load', html: `<p>Cursor moves are frequent but worthless after a second. Send them over the same WebSocket, <b>throttled</b> to ~10/s, as <code>{user, anchor, head}</code>; do not log them. Positions are expressed relative to a version (OT: transform cursors like inserts; CRDT: anchor to element ids, so they survive concurrent edits). A user who disconnects disappears after a TTL of a few seconds.</p>` },
      { title: 'Offline for 2 hours', html: `<p>Ben edits 400 times on a plane. With a CRDT his client stores the ops; on reconnect it sends its <b>state vector</b> (highest counter seen from each site), the server returns the missing ops, and both merge - order does not matter and duplicates are ignored. With OT the server must transform Ben's 400 ops against everything committed meanwhile (can be thousands); doable, but expensive and it is why OT systems prefer short divergence.</p>` }
    ],
    deepDive: `<h4>🟣 The doc server tier</h4>
      <ul>
        <li><b>Routing</b>: consistent hashing on doc_id to a doc server; a lookup service (or a lease in etcd) records the owner so all WebSockets for a doc land there, possibly through a gateway tier that holds connections and forwards to the owner.</li>
        <li><b>Commit path</b>: transform → append to the ops log (durable, e.g. Spanner/Bigtable/Postgres partitioned by doc) → ack → broadcast. Batch per 50-100 ms to cut writes.</li>
        <li><b>Failover</b>: the owner holds no state that is not in the log; a new owner loads the latest snapshot + ops tail and continues. Clients reconnect, send their last acked version and resend pending ops (idempotent via client_seq).</li>
        <li><b>Hot doc</b> (a company all-hands doc with 2,000 viewers): editors are few, viewers many - fan out read-only updates through a pub/sub tier; cap active editors.</li>
      </ul>
      <h4>CRDT internals</h4>
      <p>Sequence CRDTs (RGA, YATA used by Yjs, Fugue) give every character an id <code>(site, counter)</code> and an insertion anchor; deletes leave <b>tombstones</b>. Concurrent inserts at one spot are ordered by id, so every replica places them the same way. Memory grew with tombstones in early designs; modern libraries run-length encode consecutive characters from one user and garbage-collect tombstones when all replicas have seen them. <b>Interleaving anomaly</b>: two users typing words at the same place can get letters interleaved in some algorithms; Fugue was designed to minimise it.</p>
      <h4>Rich text and other data</h4>
      <p>Formatting (bold ranges), tables and comments need extra op types and transform rules (OT) or mark/attribute CRDTs (Peritext). Comments anchor to ranges that must move with edits.</p>
      <h4>Trade-offs</h4>
      <ul>
        <li>OT: simpler data, central server required, complex transforms for rich text.</li>
        <li>CRDT: offline and P2P friendly, more metadata, still needs a server for auth, storage and access control.</li>
        <li>Snapshot frequency: more snapshots = faster loads, more storage.</li>
        <li>Permissions are checked per op on the server - a viewer's client must never be trusted to send edits.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants are now <b>another collaborator</b> in the document: they stream long edits while humans keep typing. That makes the merge layer matter more - AI edits should be ops like any other (so they transform/merge and can be undone per author), often proposed as <b>suggestions</b> rather than direct writes.</p>
      <p><b>Use AI as a partner:</b> ask it for adversarial concurrent-edit scenarios and run them through a convergence checker like the one above (property-based testing is how real OT/CRDT bugs are found).</p>
      <p><b>Where AI goes wrong:</b> it suggests "last write wins on the whole document" (loses edits), locks paragraphs, or claims OT works peer-to-peer with the same simple transforms. It also forgets cursor transformation and tombstones.</p>
      <p><b>What you must still own:</b> the choice OT vs CRDT for the product, convergence reasoning, and the doc-server routing and recovery story.</p>`,
    problems: [{
      title: 'Real-Time Co-Editing for 15 Million Open Documents', level: 'Hard', tags: ['ot', 'crdt', 'websocket', 'hld'], companies: ['Google', 'Microsoft', 'Notion', 'Figma'],
      statement: `<p>Design the real-time editing backend for a Google-Docs-like product. Up to 50 people edit one document; edits must appear for others within 300 ms; all copies must converge; users can go offline briefly; full version history is kept. Explain the sync algorithm, the servers, storage and recovery.</p>`,
      constraints: `15M open docs · ~3M active typists · ≤ 50 editors per doc · remote latency &lt; 300 ms · zero lost acknowledged edits.`,
      example: `<p>"abcd": Ana inserts X at 1, Ben deletes index 2 concurrently. ${H.c('g', 'Both end with "aXbd"')} after transformation; ${H.c('r', 'naive replay')} gives Ana "aXcd" and Ben "aXbd".</p>`,
      brute: { why: `<p>Each client sends the full document on every keystroke and the server keeps the last one received (last-writer-wins). Concurrent typists overwrite each other's work, bandwidth explodes for large docs, and there is no history. Paragraph locking avoids conflicts but makes co-editing frustrating.</p>` },
      mcq: { q: 'When is a CRDT clearly a better fit than server-based OT?', options: ['When documents are tiny', 'When long offline editing or peer-to-peer sync must merge without a central order', 'When you need permission checks', 'When there is only one editor'], answer: 1, explain: 'CRDTs merge in any order without a coordinator, which suits offline-first and P2P. Server OT relies on a central ordering point.' },
      hints: [`<p>Typing must be local-first; the hard part is merging concurrent ops so everyone converges.</p>`, `<p>One owner server per document (route by doc_id) orders ops, transforms them, appends to a log and broadcasts; or use a CRDT and let the server relay and store.</p>`, `<p>Add: snapshots + ops log for history and fast load, ack/version protocol for reconnect, presence as throttled ephemeral messages, permission checks per op, failover by reloading snapshot + tail.</p>`],
      solution: {
        approach: `<p><b>Algorithm.</b> Server-ordered OT (Jupiter style): each client applies ops locally, sends batches tagged with the last server version it saw, and keeps one batch in flight. The doc owner transforms incoming ops against ops committed since that version, assigns version numbers, appends to the log and broadcasts. Clients transform remote ops against their pending local ops before applying. (A CRDT such as Yjs is an equally valid choice, especially if offline-first matters; then the server merges updates and stores the CRDT state.)</p>
          <p><b>Servers.</b> WebSocket gateways hold connections; a directory (consistent hashing + leases) maps doc_id → doc server; each doc server keeps open docs in memory (text, recent ops, presence). Batches every ~50 ms reduce traffic. Read-only viewers get updates through pub/sub fan-out.</p>
          <p><b>Storage.</b> Append-only ops log partitioned by doc_id (versions are the primary key, so a duplicate append fails cleanly); snapshots every ~500 ops or on idle; history UI reads snapshots + ops. Restore = new ops that produce the old content.</p>
          <p><b>Recovery and offline.</b> If a doc server dies, the lease moves; the new owner loads snapshot + tail; clients reconnect with their last acked version and resend pending ops (dedup by client id + seq). Short offline periods are handled by the same catch-up; long ones are transformed in bulk or rebased by the client. Presence is throttled to 10/s, kept in memory with a TTL, and cursors are transformed like inserts.</p>`,
        complexity: `<p>Transform cost O(k) per incoming op where k = ops committed since its base version (small when online). Storage grows with ops; snapshots bound load time.</p>`,
        followUps: ['How would you implement undo for one user in a shared document?', 'How do you add comments anchored to text ranges?']
      }
    }]
  });

  /* ================= PRACTICE ARENA ================= */
  practice.push({
    title: 'robots.txt Cache for a Crawler Fleet', level: 'Easy', tags: ['crawler', 'robots.txt', 'caching'], companies: ['Google', 'Bing', 'Common Crawl'],
    statement: `<p>Your crawler fleet visits 50M hosts. Design how robots.txt is fetched, parsed, cached and applied so that every page fetch obeys the current rules without fetching robots.txt before every page.</p>`,
    constraints: `50M hosts · 400 page fetches/s · rules may change daily · robots.txt fetch can fail (404, 5xx, timeout).`,
    example: `<p>Host shop.example: robots.txt says <code>Disallow: /cart/</code>. URL <code>/cart/42</code> ${H.c('r', 'blocked')}; <code>/shoes</code> ${H.c('g', 'allowed')}. robots.txt returns 503 → ${H.c('y', 'treat the whole host as disallowed and retry later')}.</p>`,
    brute: { why: `<p>Fetch robots.txt before every page: doubles the request count, is impolite, and adds a round trip of latency. Never fetching it again after the first time misses rule changes.</p>` },
    mcq: { q: 'robots.txt returns HTTP 500 for a host. What should a polite crawler do?', options: ['Assume everything is allowed', 'Assume full disallow for now and retry robots.txt later', 'Crawl only the homepage', 'Ignore the host forever'], answer: 1, explain: 'RFC 9309: on a server error the crawler must assume complete disallow; a 4xx (like 404) means no restrictions.' },
    hints: [`<p>Rules belong to a <b>host</b>, and the node that owns the host in the frontier can own its rules too.</p>`, `<p>Cache parsed rules per host with a fetch time; refresh after ~24 h; check rules when a URL is dequeued.</p>`, `<p>Handle 404 (allow all), 5xx/timeouts (disallow, retry with backoff), redirects (follow a few), size limit (RFC: parse at least 500 KiB), longest-match rule wins, and your user agent group.</p>`],
    solution: {
      approach: `<p>Since the frontier is partitioned by host, the node owning a host also owns its robots entry: <code>host → {rules, fetched_at, status}</code> in memory with an on-disk backing store. Before dispatching the first URL of a host (or when the entry is older than 24 h), the fetcher fetches <code>/robots.txt</code> first, through the same politeness slot. Parse into the group matching our user agent (fallback <code>*</code>), store rules as a list sorted for longest-prefix matching (support <code>*</code> and <code>$</code>). On each dequeue, match the URL path: the most specific matching rule wins; Allow wins ties. Status handling: 2xx → parse; 3xx → follow up to 5 redirects; 4xx → allow all; 5xx or network error → disallow all and schedule a retry with backoff (and after a long outage, keep the last good copy). Crawl-delay, if present, raises the host's politeness gap. Blocked URLs stay in the frontier with a "blocked" mark and are rechecked when rules refresh.</p>`,
      complexity: `<p>Rule check O(number of rules) or O(path length) with a trie. Memory ≈ a few KB per active host; inactive hosts are evicted to disk.</p>`,
      followUps: ['How do you handle a host whose robots.txt is 5 MB?', 'How do you honour AI-specific user agents?']
    }
  });
  practice.push({
    title: 'Weekly Leaderboard Reset', level: 'Easy', tags: ['leaderboard', 'redis', 'ttl'], companies: ['Supercell', 'Duolingo', 'Strava'],
    statement: `<p>A fitness app has weekly leaderboards that reset every Monday 00:00 UTC. At reset, last week's top 100 must receive badges. Design the reset with no downtime and no lost scores at the boundary.</p>`,
    constraints: `10M weekly participants · scores arrive continuously · badge award within 10 minutes of the week ending · late events allowed up to 5 minutes.`,
    example: `<p>A run finishing at Sunday 23:59:50 but uploaded at Monday 00:02 ${H.c('g', 'counts for last week')} (event time), not this week.</p>`,
    brute: { why: `<p>One key <code>lb:weekly</code> that a cron job deletes at midnight. Scores arriving during the delete are lost or counted in the wrong week; the top 100 must be read before deletion, and a crash between read and delete corrupts both.</p>` },
    mcq: { q: 'Best way to "reset" a weekly board?', options: ['DEL the key at midnight', 'Use a new key per week (e.g. lb:w:2026-W44) and expire old keys later', 'Set all scores to 0 with a loop', 'Restart Redis'], answer: 1, explain: 'A per-period key makes the reset implicit and atomic: writes simply go to the new key, and the old one remains readable until it expires.' },
    hints: [`<p>Make the week part of the <b>key</b>, chosen by the event's own timestamp.</p>`, `<p>Old key stays readable for a grace period, then a job snapshots its top 100 and awards badges.</p>`, `<p>Late events within 5 minutes still update the old key; the award job runs after the grace window; badges are idempotent by (week, user).</p>`],
    solution: {
      approach: `<p>Compute the ISO week from the activity's <b>event time</b> and write to <code>lb:w:{year-week}</code>. There is no reset action at all: on Monday the first event simply lands in the new key. The previous key keeps receiving late events until the grace window (5 minutes) ends. A scheduled job at 00:10 reads <code>ZREVRANGE 0 99</code> from the old key, stores the snapshot durably (week, rank, user, score) and awards badges with an idempotency key (week, user) so a rerun is harmless. The old key gets <code>EXPIRE</code> of a few weeks for "last week" views. The DB keeps per-week scores as the source of truth, so the board can be rebuilt if Redis loses data.</p>`,
      complexity: `<p>O(log N) per update, O(log N + 100) for the snapshot. Memory ≈ 2-3 live weekly boards at a time.</p>`,
      followUps: ['How do you handle users in different time zones wanting a local-week board?', 'What if a cheater is discovered after badges are awarded?']
    }
  });
  practice.push({
    title: 'Who Else Is in This Document?', level: 'Easy', tags: ['presence', 'websocket', 'collaboration'], companies: ['Google', 'Notion', 'Figma'],
    statement: `<p>Show avatars and live cursors of everyone currently viewing or editing a document. People close laptops without logging out. Design the presence feature.</p>`,
    constraints: `Up to 200 viewers per doc · cursor latency &lt; 200 ms · stale users vanish within 30 s · no impact on document storage.`,
    example: `<p>Ana closes her laptop lid at 10:00:00. ${H.c('g', 'By 10:00:30 her avatar disappears')} for everyone else, even though no "leave" message was ever sent.</p>`,
    brute: { why: `<p>Write each cursor move to the documents database and poll it every second. Thousands of useless writes per second, extra DB load, and users who vanish without "leave" stay forever.</p>` },
    mcq: { q: 'Where should cursor positions live?', options: ['In the document ops log', 'In memory on the document server, with a heartbeat TTL', 'In a relational table', 'In the browser only'], answer: 1, explain: 'Presence is ephemeral and frequent: keep it in memory with a TTL and broadcast over the existing WebSocket. It has no value after the session.' },
    hints: [`<p>Presence is <b>ephemeral</b>: losing it costs nothing, so do not persist it.</p>`, `<p>Use the doc's WebSocket; keep user → {cursor, colour, last_seen} in memory on the doc server; heartbeat every 10 s.</p>`, `<p>Throttle cursor updates (~10/s), drop users whose last_seen is older than 30 s, transform cursor positions on edits, and send a full presence list on join.</p>`],
    solution: {
      approach: `<p>All sessions of a document connect to its owning doc server. The server keeps a presence map <code>user/session → {name, colour, cursor anchor, selection, last_seen}</code> in memory. Clients send cursor updates throttled to 10 per second plus a heartbeat every 10 s; the server batches presence changes every ~50 ms and broadcasts them. A sweep removes entries not seen for 30 s and broadcasts "left". On join, the client receives the full presence list. Cursor positions refer to a document version (OT) or element ids (CRDT) so they stay correct as text moves. For docs with hundreds of viewers, show a capped number of avatars ("+180") and send cursors only for active editors. Nothing is persisted; if the server restarts, clients reconnect and presence rebuilds within one heartbeat.</p>`,
      complexity: `<p>O(1) per update, broadcast O(viewers). Memory ~100 B per session.</p>`,
      followUps: ['How would you show presence across a whole folder of documents?', 'How do you hide presence for privacy-sensitive users?']
    }
  });
  practice.push({
    title: 'Near-Duplicate Pages with SimHash', level: 'Medium', tags: ['crawler', 'dedupe', 'simhash'], companies: ['Google', 'Microsoft', 'Common Crawl'],
    statement: `<p>Many crawled pages are the same article with different ads, timestamps or navigation. Design near-duplicate detection for 10 billion pages so duplicates are stored once and not re-indexed.</p>`,
    constraints: `10B pages · 400 new pages/s · "near duplicate" = 64-bit fingerprints differ in ≤ 3 bits · lookups &lt; 10 ms.`,
    example: `<p>Page A and page B share 97% of their text. SHA-256 differs completely, ${H.c('g', 'SimHash fingerprints differ in 2 bits → duplicate')}.</p>`,
    brute: { why: `<p>Compare each new page to all stored pages with a text diff: 10B comparisons per page is impossible. An exact hash misses near-duplicates because one changed byte changes the whole hash.</p>` },
    mcq: { q: 'Why can SimHash detect near duplicates when SHA-256 cannot?', options: ['SimHash is longer', 'Similar inputs produce fingerprints with small Hamming distance', 'SimHash uses encryption', 'SHA-256 collides often'], answer: 1, explain: 'SimHash is locality-sensitive: small text changes flip only a few bits. Cryptographic hashes are designed so any change flips about half of the bits.' },
    hints: [`<p>You need a fingerprint where <b>similar inputs give similar outputs</b> (locality-sensitive hashing).</p>`, `<p>SimHash: hash each shingle, add/subtract per bit with weights, take the signs → 64 bits. Duplicates differ in ≤ k bits.</p>`, `<p>Finding all fingerprints within 3 bits fast: split 64 bits into 4 blocks of 16; by pigeonhole, a match within 3 bits shares at least one block exactly - index tables by each block.</p>`],
    solution: {
      approach: `<p><b>Fingerprint.</b> Strip boilerplate (nav, ads) with a main-content extractor, split into shingles (e.g. 4-word windows), hash each shingle to 64 bits, and for each bit add the shingle weight if the bit is 1 or subtract it if 0. The sign of each sum gives the SimHash bit. Similar documents → small Hamming distance.</p>
        <p><b>Search.</b> To find any stored fingerprint within distance 3 among 10B, use the pigeonhole trick (as in Google's Manku et al. 2007 paper): split 64 bits into 4 blocks of 16. Two fingerprints within distance 3 must agree exactly on at least one block. Keep 4 tables (or more permutations for smaller candidate lists), each keyed by one block; look up the 4 keys, fetch candidates, compute exact Hamming distance with XOR + popcount. Tables are sharded by block value in a key-value store. If a near-duplicate is found, store a pointer to the canonical page and lower the crawl priority of the duplicate URL; choose the canonical by <code>rel=canonical</code>, PageRank, or first seen.</p>`,
      complexity: `<p>Fingerprint O(page length). Lookup: 4 key lookups + O(candidates) popcounts. Storage 8 B × 10B × 4 tables ≈ 320 GB + ids.</p>`,
      followUps: ['How would MinHash compare for Jaccard similarity?', 'How do you handle pages that are near-duplicates of each other only partially (quoted articles)?']
    }
  });
  practice.push({
    title: 'Delayed Jobs: "Send This Reminder in 3 Days"', level: 'Medium', tags: ['scheduler', 'delay queue', 'retries'], companies: ['Amazon', 'Uber', 'Shopify'],
    statement: `<p>Product teams need one-shot delayed jobs: "send reminder email at T", "cancel unpaid order after 30 minutes", "retry webhook in 5 minutes". Design a delay service that holds hundreds of millions of pending jobs, fires each within 1 s of T, supports cancel, and retries failures.</p>`,
    constraints: `300M pending jobs · 20K fires/s peak · delays from 1 s to 1 year · cancel must win if called before fire time.`,
    example: `<p>Order 77 created at 10:00 → job "cancel-if-unpaid" at 10:30. User pays at 10:12 → ${H.c('g', 'job cancelled; nothing fires')}. If payment arrives at 10:30:00.400 the handler must re-check order state.</p>`,
    brute: { why: `<p>A table of jobs scanned every second with <code>WHERE fire_at &lt;= now()</code> on one unsharded DB. At 300M rows and 20K fires/s the scan and updates overwhelm it; a cron per job does not scale; in-memory timers lose everything on restart.</p>` },
    mcq: { q: 'How should a long delay (6 months) and a short one (5 s) be stored efficiently?', options: ['Both in an in-memory timer only', 'Durable store bucketed by time; load each upcoming bucket into an in-memory timing wheel shortly before it is due', 'A Kafka topic per second', 'A sleep() call in a worker thread'], answer: 1, explain: 'Long delays sit cheaply on disk in time buckets; only the next minute or so is held in memory, where a timing wheel fires them precisely. Restarts reload from the durable store.' },
    hints: [`<p>Only jobs due <b>soon</b> need to be in memory. Everything else can sit on disk grouped by time.</p>`, `<p>Partition by (time bucket, shard); a loader moves the next minute's bucket into a timing wheel; firing enqueues to workers with leases.</p>`, `<p>Cancel = state CAS (PENDING → CANCELLED) that firing also checks; handlers re-validate business state; retries with exponential backoff create a new fire_at; DLQ after N attempts.</p>`],
    solution: {
      approach: `<p><b>Store.</b> Jobs table keyed by job_id with state and fire_at, plus a bucket index <code>(fire_minute, shard) → job ids</code> in a wide-column store (Cassandra/DynamoDB) so each minute's jobs are one partition range. Creating a job writes both (or writes the job and derives the index from CDC).</p>
        <p><b>Firing.</b> Shards are owned by scheduler nodes via leases. Each node loads buckets due in the next 1-2 minutes into a timing wheel. At fire time it does a CAS PENDING → FIRING on the job (so a concurrent cancel either wins first or sees FIRING), then publishes to a work queue. Workers lease the job, call the handler with job_id as an idempotency key and mark DONE. Failure → state PENDING with fire_at = now + backoff (exponential with jitter) and attempt + 1; after 10 attempts → FAILED + DLQ.</p>
        <p><b>Cancel.</b> CAS PENDING → CANCELLED; the wheel skips cancelled jobs at fire time by re-checking state. Because cancellation may race with firing, handlers re-check business state (is the order still unpaid?). Hot minutes (lots of reminders at 09:00) are spread by sharding each bucket into many sub-partitions. Recovery: a new shard owner reloads current and overdue buckets.</p>`,
      complexity: `<p>Create/cancel O(1). Fire O(1) per job amortised. Memory holds only ~2 minutes of jobs (~2.4M at peak).</p>`,
      followUps: ['How would you support "fire at T, but no earlier than the previous job of this user"?', 'How do you rate-limit fires per tenant?']
    }
  });
  practice.push({
    title: 'Friends and Regional Leaderboards', level: 'Medium', tags: ['leaderboard', 'fan-out', 'sharding'], companies: ['King', 'Riot Games', 'Zynga'],
    statement: `<p>Besides the global board, the game needs a board per country (200 countries) and a friends board (up to 1,000 friends). Design both, keeping write cost low.</p>`,
    constraints: `50M players · 5K updates/s · friend lists change often · friends board p99 &lt; 100 ms.`,
    example: `<p>Mia (Brazil) scores 40. Her update touches ${H.c('g', '2 sorted sets: global and lb:BR')}, not one set per friend.</p>`,
    brute: { why: `<p>Maintain a sorted set per player containing their friends: each score update must update up to 1,000 friends' sets (fan-out on write) - 5M writes/s, and every friend-list change needs repair.</p>` },
    mcq: { q: 'For a friends board with up to 1,000 friends, which is cheapest overall?', options: ['A sorted set per player updated on each friend’s score change', 'Read friends’ scores on demand and sort them in the API', 'One global SQL query with a JOIN per request', 'Precompute friend ranks nightly'], answer: 1, explain: 'Reading up to 1,000 scores in one batched call and sorting in memory is microseconds, and nothing has to be updated on writes or friend changes.' },
    hints: [`<p>Count writes: how many structures change when one player scores?</p>`, `<p>Country boards: one extra sorted set per country (a constant 2 writes per update). Friends: compute on read.</p>`, `<p>Batched score lookup (ZMSCORE / MGET), sort, cache a few seconds; country change moves the player between sets.</p>`],
    solution: {
      approach: `<p><b>Country boards.</b> Each update writes the global set and <code>lb:{country}</code> - a constant two writes. Country boards are much smaller, so rank queries are fast; a country change is a ZREM + ZADD. Very large countries are fine (they are smaller than the global board).</p>
        <p><b>Friends board.</b> Computed on read: get the friend ids from the social graph service (cached), call <code>ZMSCORE lb:all id1 ... idN</code> in one round trip (or pipeline in chunks of 200), add the player, sort the ≤ 1,001 entries in memory, return with ranks. Cache the result per player for 5-10 s. No write amplification and friend-list changes take effect instantly. If some players have very large follower graphs (influencers), cap the board to the top 1,000 most active friends.</p>`,
      complexity: `<p>Writes O(log N) × 2 per update. Friends read O(F log F) with F ≤ 1,000 plus one batched lookup.</p>`,
      followUps: ['How would you show "you passed 3 friends today" notifications?', 'What changes for a clan board of 50 members?']
    }
  });
  practice.push({
    title: 'Market Data Feed with Gap Recovery', level: 'Medium', tags: ['exchange', 'multicast', 'sequencing'], companies: ['Nasdaq', 'NYSE', 'CME Group'],
    statement: `<p>Publish every order book change of an exchange to thousands of subscribers with minimal latency. Subscribers must detect lost packets and rebuild their book copy exactly.</p>`,
    constraints: `1M messages/s at peak · sub-10 µs added latency · UDP loss happens · late joiners must catch up mid-day.`,
    example: `<p>A subscriber receives seq 1001, 1002, 1005. ${H.c('r', 'Gap 1003-1004')} → it requests them from the retransmit server and buffers 1005 until the gap is filled.</p>`,
    brute: { why: `<p>One TCP connection per subscriber: the exchange's send loop blocks on slow consumers, latency differs per subscriber (unfair), and thousands of streams multiply CPU cost.</p>` },
    mcq: { q: 'Why do exchanges use UDP multicast for market data?', options: ['It is reliable', 'One packet reaches all subscribers at the same time with no per-client sending cost', 'It encrypts data', 'It avoids sequence numbers'], answer: 1, explain: 'Multicast is replicated by the network switches, so every subscriber gets the same packet at nearly the same time. Reliability is added with sequence numbers and recovery services.' },
    hints: [`<p>Fairness and latency favour sending <b>once</b> to everybody.</p>`, `<p>Multicast A and B feeds (redundant paths) with per-channel sequence numbers.</p>`, `<p>Gap → TCP retransmit server; late join → snapshot service (book state at seq S) then apply the live feed from S+1; arbitrate A/B by sequence number.</p>`],
    solution: {
      approach: `<p>The matching engine's output events (add, modify, delete, execute, trade) are encoded in a compact binary format (ITCH-like) and published by a feed handler over UDP multicast. Each channel (group of symbols) has its own sequence number. Two identical feeds (A and B) go over physically separate networks; subscribers take whichever copy of each sequence number arrives first (line arbitration), which hides most single-path losses. If both lose a message, the subscriber asks a <b>retransmission server</b> (TCP, request seq range) and buffers newer messages meanwhile. A <b>snapshot service</b> periodically publishes full book state tagged with the last included seq, so a late joiner or a badly lagging client loads the snapshot then applies live messages with seq greater than it. Slow subscribers only hurt themselves. Conflated feeds (top of book every 100 ms) serve retail-grade consumers cheaply.</p>`,
      complexity: `<p>O(1) send per message regardless of subscriber count; recovery traffic proportional to loss.</p>`,
      followUps: ['How do you prove all subscribers got data at the same time?', 'How would you offer this feed in the cloud?']
    }
  });
  practice.push({
    title: 'Approximate Rank for 500M Players', level: 'Medium', tags: ['leaderboard', 'histogram', 'approximation'], companies: ['Activision', 'Epic Games', 'Tencent'],
    statement: `<p>A battle-royale game has 500M ranked players. Show the exact rank for the top 10,000 and a percentile ("Top 3.2%") for everyone else, updated within a minute. Design it.</p>`,
    constraints: `500M players · 50K score updates/s · rank lookups 200K/s · memory budget 10 GB.`,
    example: `<p>A player at 2,140 points: 3.1M players have more → ${H.c('g', 'shows "Top 0.7%"')} rather than an exact number.</p>`,
    brute: { why: `<p>One sorted set with 500M members needs ~40 GB, every update hits one hot key, and the exact rank of player #312,455,019 has no product value.</p>` },
    mcq: { q: 'What is enough to compute an approximate percentile for any score?', options: ['A sorted list of all players', 'A histogram of player counts per score bucket, plus totals', 'The average score', 'Only the top 100'], answer: 1, explain: 'Players above you = sum of counts in higher buckets (+ an interpolated part of your bucket). Counts per bucket are tiny and shard well.' },
    hints: [`<p>Separate the "exact matters" head from the long tail.</p>`, `<p>Exact sorted set for the head; bucketed counters (e.g. 1 point wide near the top, wider below) for everyone.</p>`, `<p>Update both on score change (decrement old bucket, increment new); prefix sums recomputed every few seconds; shard counters to avoid hot keys.</p>`],
    solution: {
      approach: `<p><b>Head.</b> A sorted set holds players whose score is above the current 10,000th score plus a margin (say the top 20,000), giving exact ranks. Players enter or leave as they cross the threshold.</p>
        <p><b>Tail.</b> A histogram: score range split into buckets (fine near the top, wider lower down). Each score update does <code>bucket[old]--</code>, <code>bucket[new]++</code> - counters sharded by bucket (and sub-sharded for the busiest buckets) to spread write load. Every few seconds an aggregator computes suffix sums (players above each bucket) and caches them. A rank query: above = suffix[bucket + 1] + interpolation inside the player's bucket; percentile = above / total. Memory: a few thousand counters - kilobytes. Updates go through the event stream so counters can be rebuilt from the durable per-player scores.</p>`,
      complexity: `<p>Update O(1) (+ O(log H) if in the head). Query O(1) after the periodic O(B) suffix-sum pass.</p>`,
      followUps: ['How accurate is linear interpolation inside a bucket?', 'How do you handle season resets?']
    }
  });
  practice.push({
    title: 'Keeping a News Index Fresh', level: 'Hard', tags: ['crawler', 'freshness', 'scheduling'], companies: ['Google', 'Apple', 'Bing'],
    statement: `<p>A search engine must show breaking news within 5 minutes of publication, while still re-crawling 20 billion ordinary pages with a fixed fetch budget. Design the re-crawl scheduler that decides what to fetch next.</p>`,
    constraints: `Budget 10K fetches/s · 20B known URLs · news hosts publish thousands of articles/hour · politeness still applies.`,
    example: `<p>A news homepage changes every 2 minutes; an old encyclopedia page changes yearly. ${H.c('g', 'Homepage revisited every ~1 min, encyclopedia every few months.')}</p>`,
    brute: { why: `<p>Re-crawl everything in a fixed round-robin cycle: 20B / 10K per s ≈ 23 days per cycle, so news is weeks late, and the budget is wasted on pages that never change.</p>` },
    mcq: { q: 'Which signal best decides how often to re-crawl a page?', options: ['URL length', 'Its estimated change rate weighted by importance', 'Alphabetical order', 'Random sampling'], answer: 1, explain: 'Fetching unchanged pages wastes budget. Estimate how often each page changes (from history) and how much a stale copy costs (importance), then spend fetches where the expected gain is highest.' },
    hints: [`<p>Think of each URL as having a <b>change rate</b> and a <b>value</b>; the budget is fixed.</p>`, `<p>Priority = expected staleness × importance; adapt the interval per URL from observed changes; use push signals (sitemaps, RSS, IndexNow) for news.</p>`, `<p>Keep politeness via per-host queues; a separate fast lane for hubs (homepages, feeds) that discover new article URLs; conditional GETs to make unchanged checks cheap.</p>`],
    solution: {
      approach: `<p><b>Model.</b> For each URL keep estimated change rate λ (Poisson model from past fetches: number of observed changes over time), importance w (link-based score, traffic), and last fetch time. The probability the stored copy is stale after t seconds is 1 − e<sup>−λt</sup>; priority = w × (1 − e<sup>−λt</sup>). Pages that never change are pushed far into the future; hot pages come up often.</p>
        <p><b>Scheduler.</b> Partition URLs by host; each partition keeps a priority queue of next-fetch times derived from the formula and a target budget share. Global budget is split between tiers: a <b>fast lane</b> for discovery hubs (news homepages, section pages, RSS/Atom feeds, sitemaps with lastmod, IndexNow pings) checked every 30-120 s, a <b>fresh lane</b> for newly discovered article URLs (fetched immediately, then a few times in the first hours as they get updated), and the <b>long tail</b> lane. Politeness still caps per-host rate, so for big news sites negotiate higher limits or rely on their sitemaps.</p>
        <p><b>Cheap checks.</b> Conditional GETs with ETag/If-Modified-Since return 304 without bodies. Measured outcomes update λ (changed → increase, unchanged → decrease). The indexer prioritises the fresh lane so a new article goes from discovery to search results in minutes.</p>`,
      complexity: `<p>O(log n) per scheduling decision per partition; state ≈ 30-50 bytes per URL (20B × 40 B ≈ 800 GB, sharded).</p>`,
      followUps: ['How do you detect that a hub page is a good discovery source?', 'How do you avoid starving brand-new sites?']
    }
  });
  practice.push({
    title: 'Workflow Scheduler with Dependencies (Airflow-like)', level: 'Hard', tags: ['scheduler', 'dag', 'retries'], companies: ['Airbnb', 'Netflix', 'Databricks'],
    statement: `<p>Data teams define DAGs of tasks ("extract → clean → [train, report]") that run daily. Design a scheduler that runs tasks only when parents succeed, retries failed tasks, supports backfills for past dates, and never runs the same task instance twice concurrently.</p>`,
    constraints: `20K DAGs · 2M task instances/day · tasks run seconds to hours · backfill of 365 days must not starve daily runs.`,
    example: `<p>DAG run 2026-10-27: extract ✔, clean ✗ (retry 1 ✔), train and report then start in parallel. ${H.c('g', 'report waits only for clean')}, not for train.</p>`,
    brute: { why: `<p>One cron entry per task with fixed times ("clean at 02:30 because extract usually ends by then"). Breaks when extract runs late, cannot express fan-in, and retries are manual.</p>` },
    mcq: { q: 'What uniquely identifies a task instance so retries and backfills are safe?', options: ['Task name only', '(dag_id, task_id, logical_date) plus a try number', 'Worker hostname', 'Wall-clock start time'], answer: 1, explain: 'The logical date ties a task instance to the data interval it processes; the try number distinguishes attempts. That key makes scheduling idempotent and lets backfills run safely.' },
    hints: [`<p>The unit of work is a <b>task instance for a logical date</b>, with a state machine.</p>`, `<p>A scheduler loop finds DAG runs due, creates task instances, and marks a task ready when all upstream instances succeeded.</p>`, `<p>Leases + fencing for workers, pools / priority to keep backfills from starving daily runs, max active runs per DAG, idempotent tasks writing partitions keyed by logical date.</p>`],
    solution: {
      approach: `<p><b>Model.</b> DAG definitions (versioned); DAG runs (dag_id, logical_date, state); task instances (dag_id, task_id, logical_date, try_number, state, lease, token). States: NONE → SCHEDULED → QUEUED → RUNNING → SUCCESS / FAILED / UP_FOR_RETRY / UPSTREAM_FAILED.</p>
        <p><b>Scheduler loop</b> (several instances, using <code>SELECT ... FOR UPDATE SKIP LOCKED</code> on DAG runs, as Airflow 2 does for HA): create DAG runs whose schedule interval has ended; for each running DAG run, evaluate task instances whose upstream instances are all SUCCESS (or per trigger rule) and move them to SCHEDULED; push to executor queues subject to <b>pools</b> (slots per resource), per-DAG concurrency, and priority weights.</p>
        <p><b>Execution.</b> Workers take a task instance with a lease and fencing token, heartbeat, and report results with the token. A dead worker's lease expires → UP_FOR_RETRY with backoff. Tasks are written to be idempotent: they overwrite the output partition for their logical date, so a rerun is safe.</p>
        <p><b>Backfills</b> create DAG runs for past dates with low priority and a separate pool / max active runs, so the daily schedule keeps its slots. Sensors (waiting on external data) run in "reschedule" mode to free slots while waiting. Metrics: scheduling delay, task duration, SLA misses with alerts.</p>`,
      complexity: `<p>Each scheduler pass is O(active task instances); dependency checks O(edges) per DAG run.</p>`,
      followUps: ['How do you deploy a new DAG version while runs are in progress?', 'How would you trigger DAGs from data arrival rather than time?']
    }
  });
  practice.push({
    title: 'Opening Auction for an Exchange', level: 'Hard', tags: ['exchange', 'auction', 'matching'], companies: ['NYSE', 'Nasdaq', 'LSEG'],
    statement: `<p>Before continuous trading starts at 09:30, orders accumulate without matching. At 09:30 the exchange runs an auction to find a single opening price and match as much as possible. Design the price discovery and the transition into continuous trading.</p>`,
    constraints: `Hundreds of thousands of orders per hot symbol · auction must finish in milliseconds · deterministic tie-break rules · publish indicative price during the call period.`,
    example: `<p>Buys: 100 @ 10.05, 200 @ 10.00. Sells: 150 @ 10.00, 100 @ 10.02. At 10.00: buy volume 300, sell volume 150 → 150 matched. At 10.02: buy 100, sell 250 → 100. ${H.c('g', 'Opening price 10.00 (max matched volume 150).')}</p>`,
    brute: { why: `<p>Just start continuous matching at 09:30 in time order. The first few orders set wild prices, early arrivals get worse fills than an auction would give, and fairness depends on who sent first in the first microsecond.</p>` },
    mcq: { q: 'What is the primary criterion for the auction price?', options: ['The last closing price', 'The price that maximises executable volume', 'The midpoint of the best bid and ask', 'The earliest order price'], answer: 1, explain: 'Call auctions choose the price that matches the most shares; ties are broken by minimum imbalance, then closeness to a reference price.' },
    hints: [`<p>For each candidate price, how many shares could trade? Buyers at or above it, sellers at or below it.</p>`, `<p>Cumulative buy volume from high prices down, cumulative sell volume from low prices up; matched = min of the two; pick the max.</p>`, `<p>Tie-breaks: minimum surplus, market pressure, reference price. Fill by price-time priority at the single price; leftover orders rest in the book for continuous trading.</p>`],
    solution: {
      approach: `<p><b>Call period.</b> Orders (limit, market-on-open) are accepted and sequenced but not matched. Every second the engine publishes an <b>indicative opening price</b> and imbalance so participants can react.</p>
        <p><b>Price discovery.</b> Collect distinct limit prices. Compute cumulative buy volume D(p) = all buy qty with limit ≥ p (plus market buys) and cumulative sell volume S(p) = all sell qty with limit ≤ p (plus market sells) with two prefix-sum sweeps over sorted price levels - O(L). Executable volume V(p) = min(D(p), S(p)). Choose p maximising V; ties broken by smallest imbalance |D − S|, then by the side of the imbalance, then closest to the reference (previous close) price. This is a deterministic rule set published by the exchange.</p>
        <p><b>Uncross.</b> All matched trades print at the single auction price. Allocation within each side follows price then time priority (sequence number). Partially filled orders keep their remainder. Unmatched limit orders stay in the book; market-on-open leftovers are cancelled.</p>
        <p><b>Transition.</b> The engine emits the auction trade report and full book snapshot with a sequence number, then switches the symbol state to CONTINUOUS. A price band check can extend the call period if the price moved too far (volatility protection).</p>`,
      complexity: `<p>O(L log L) to sort levels (often already sorted) + O(L) sweeps + O(orders filled) for allocation.</p>`,
      followUps: ['How is a closing auction different?', 'How would you handle a halt and re-opening auction mid-day?']
    }
  });
  practice.push({
    title: 'Offline-First Notes Sync with CRDTs', level: 'Hard', tags: ['crdt', 'offline', 'sync'], companies: ['Apple', 'Notion', 'Linear'],
    statement: `<p>A notes app works fully offline on phone, laptop and web. Edits made on any device must merge automatically when they reconnect - no "conflict copy" files. Design the data model, sync protocol and server.</p>`,
    constraints: `20M users · 3 devices each · devices offline up to weeks · notes up to 1 MB of text · end-to-end encryption is a later requirement.`,
    example: `<p>Phone (offline) adds a line after "Groceries"; laptop deletes the title word "Old". ${H.c('g', 'After sync both devices show both edits.')}</p>`,
    brute: { why: `<p>Upload the whole note with a timestamp and keep the newest (last-writer-wins at document level). The phone's line or the laptop's deletion is silently lost; clock skew decides the winner.</p>` },
    mcq: { q: 'How does a device learn which operations it is missing?', options: ['It downloads everything every time', 'It exchanges a state vector (latest counter seen per device) and receives only newer ops', 'It compares file timestamps', 'It asks the user'], answer: 1, explain: 'A state (version) vector summarises what each replica has. The difference tells exactly which ops to send, and CRDT ops are idempotent so duplicates are harmless.' },
    hints: [`<p>Pick a data type where merge is <b>commutative, associative and idempotent</b>.</p>`, `<p>Sequence CRDT for text (Yjs / Automerge style), map CRDT for note metadata; device id as site id.</p>`, `<p>Sync with state vectors; server stores updates + compacted snapshots; tombstone GC; with E2EE the server only relays opaque encrypted updates.</p>`],
    solution: {
      approach: `<p><b>Data model.</b> Each note is a CRDT document: text as a sequence CRDT (YATA/RGA ids = (device id, counter)), metadata (title, tags, pinned) as LWW registers inside a map CRDT with Lamport timestamps + device id tie-break. Each device persists its CRDT state and a log of local updates in local storage (SQLite/IndexedDB).</p>
        <p><b>Sync protocol.</b> On connect, the device sends its state vector for each changed note; the server replies with updates the device lacks and requests those the server lacks. Updates are idempotent and commute, so order and duplicates do not matter; while online, updates stream over a WebSocket. Push notifications wake other devices.</p>
        <p><b>Server.</b> Stores per-note update logs (append-only, partitioned by user/note) and periodically compacts them into a snapshot (merged state); serves new devices from the snapshot. Tombstones are garbage-collected once all of a user's known devices have acknowledged a version (devices inactive for months are treated as needing a full snapshot). Large notes: run-length encoded CRDT structures keep metadata overhead to a small fraction of the text size.</p>
        <p><b>E2EE later.</b> Because merge happens on devices, the server can store encrypted update blobs and state vectors only - CRDTs make this possible, while server-side OT would require reading plaintext.</p>`,
      complexity: `<p>Merge cost O(missing updates). Storage O(note size + metadata); compaction bounds the update log.</p>`,
      followUps: ['How do you support undo per device?', 'How do you migrate the CRDT schema when the app adds rich text?']
    }
  });
  practice.push({
    title: 'Pre-Trade Risk and Self-Trade Prevention', level: 'Hard', tags: ['exchange', 'risk', 'latency'], companies: ['Coinbase', 'Binance', 'Kraken'],
    statement: `<p>A crypto exchange must reject orders a customer cannot pay for, stop "fat-finger" prices, and prevent a customer's buy from matching their own sell. Design these checks without slowing the matching engine.</p>`,
    constraints: `500K orders/s · risk check &lt; 10 µs · balances change with every fill · no overdrafts.`,
    example: `<p>Alice has 1,000 USDT and places BUY 1 BTC @ 60,000. ${H.c('r', 'Rejected: insufficient funds.')} Bob places SELL @ 10 when the last trade is 60,000 → ${H.c('r', 'rejected by the price band')}.</p>`,
    brute: { why: `<p>Check balances by querying the accounts database for each order: milliseconds per check, and two concurrent orders can both pass before either is filled - overdraft.</p>` },
    mcq: { q: 'How do you stop two quick orders from spending the same balance?', options: ['Check the balance after matching', 'Reserve (hold) funds at order entry in a single-threaded risk engine; release on cancel, settle on fill', 'Use a nightly reconciliation', 'Trust the client app'], answer: 1, explain: 'Holding funds when the order enters makes the available balance drop immediately, so the second order sees the reduced amount. Fills convert holds into transfers.' },
    hints: [`<p>The check must see balances that already account for <b>open orders</b>, not just settled money.</p>`, `<p>Sequenced, single-threaded risk engine with in-memory balances: available = total − holds; place a hold at entry.</p>`, `<p>Price bands relative to a reference price; self-trade prevention inside the matching loop (cancel newest / oldest / both); journal and replay risk state like the engine.</p>`],
    solution: {
      approach: `<p><b>Risk engine.</b> Partitioned by account (or co-located with the engine for the symbol's quote currency), single-threaded, consuming the sequenced order stream. In memory it keeps per-account <code>total</code> and <code>held</code> per asset. A new buy needs price × qty (+ fee) ≤ total − held; if yes it adds a hold and forwards the order; if not, it rejects. Cancels release the remaining hold; fills (from engine output events) move funds and reduce holds. Market buys use a protective price cap to size the hold. State is recovered by replaying the journal, exactly like the matching engine, and is reconciled with the ledger database asynchronously.</p>
        <p><b>Fat-finger protection.</b> Static and dynamic price bands (e.g. ±10% from the last trade or a reference index price), max order size and max notional per account; violations are rejected at entry. Exchange-wide circuit breakers pause the symbol if price moves too far in a window.</p>
        <p><b>Self-trade prevention</b> lives in the matching loop: when the best resting order has the same account (or STP group) as the incoming order, apply the configured mode - cancel newest, cancel oldest, cancel both, or decrement both - instead of trading. This keeps wash trades out of volume statistics.</p>`,
      complexity: `<p>O(1) per order for balance checks and bands; STP adds an O(1) comparison per potential fill.</p>`,
      followUps: ['How do you handle withdrawals racing with order placement?', 'What changes for margin (leveraged) accounts?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'Why does a crawler frontier keep a separate back queue per host?', options: ['To sort URLs alphabetically', 'So at most one request per host is in flight and a delay can be enforced per host', 'Because DNS requires it', 'To save disk space'], answer: 1, explain: 'Politeness is per host. Grouping URLs by host lets a heap of "next allowed" times guarantee gaps between hits to the same site while many hosts are crawled in parallel.' });
  quiz.push({ q: 'A crawler sees <code>https://A.com:443/x#top</code> and <code>https://a.com/x</code>. What should happen?', options: ['Fetch both, they are different strings', 'Normalise both to the same URL and fetch once', 'Fetch only the one with the fragment', 'Block the host'], answer: 1, explain: 'Host case, default ports and fragments do not change the resource. Normalising before the seen-set check avoids duplicate fetches.' });
  quiz.push({ q: 'A Bloom filter used as the crawler’s seen-set can make which mistake?', options: ['Say a new URL was already seen (false positive), so it is skipped', 'Say a seen URL is new (false negative)', 'Lose URLs already in the frontier', 'Store URLs twice'], answer: 0, explain: 'Bloom filters have no false negatives but a tunable false-positive rate. A rare false positive means a page is wrongly skipped, which is why a "maybe" can be confirmed against an exact store.' });
  quiz.push({ q: 'A worker holding a job lease pauses for 60 s; the lease (30 s) expires and another worker runs the job. What prevents the first worker from committing a stale result?', options: ['Its heartbeat', 'A fencing token that the store checks on every write', 'Synchronised clocks', 'A longer timeout on the HTTP call'], answer: 1, explain: 'The paused worker does not know its lease ended. The store rejects any write carrying an older, smaller token.' });
  quiz.push({ q: 'What does "exactly-once" job execution usually mean in practice?', options: ['The network never duplicates messages', 'At-least-once execution plus idempotent effects keyed by a run id', 'Only one worker exists', 'Running jobs inside a database transaction'], answer: 1, explain: 'A crash can always happen between doing the effect and recording it, so the system retries; idempotency keys make the retry harmless.' });
  quiz.push({ q: 'Why should a scheduler derive run_id from (job_id, scheduled_time)?', options: ['It is shorter', 'Creating the run twice (retries, two schedulers) hits a unique key instead of creating a duplicate', 'It encrypts the job', 'It sorts runs by priority'], answer: 1, explain: 'A deterministic id turns "create the run for 02:00" into an idempotent operation.' });
  quiz.push({ q: 'Scores 90, 70, 70, 50 under competition ranking ("1224") give the player with 50 which rank?', options: ['3', '4', '5', '2'], answer: 1, explain: 'Rank = 1 + number of strictly higher scores = 1 + 3 = 4. Dense ranking would give 3.' });
  quiz.push({ q: 'Redis sorted sets answer ZREVRANK in O(log N) because', options: ['They scan from the top', 'The skip list stores span counts, so the rank is summed along the search path', 'They keep a separate array of ranks', 'They cache every rank'], answer: 1, explain: 'Each skip-list link records how many elements it skips; adding spans along the search gives the position - an order-statistic structure.' });
  quiz.push({ q: 'A resting SELL of 5 @ 101 entered before another SELL of 3 @ 101. A BUY of 4 @ 102 arrives. What trades?', options: ['4 @ 102 with the second order', '4 @ 101 with the first order', '2 @ 101 with each order', 'Nothing, prices differ'], answer: 1, explain: 'Price-time priority: best price (101), then the earliest order at that price. The trade happens at the resting price.' });
  quiz.push({ q: 'Why do matching engines store prices as integers (ticks)?', options: ['Integers use less disk', 'Floating point cannot represent many decimal prices exactly, causing wrong comparisons', 'FIX requires it', 'To make prices private'], answer: 1, explain: '0.1 + 0.2 ≠ 0.3 in binary floating point. Integer ticks make equality and ordering exact.' });
  quiz.push({ q: 'Why is the order book for one symbol processed by a single thread?', options: ['Threads are not available in Java', 'To keep processing deterministic and lock-free so replicas and replays give identical results', 'To save memory', 'Because orders are rare'], answer: 1, explain: 'Matching depends on order of events. A single thread over a sequenced input stream is deterministic, fast (cache friendly, no locks) and replayable.' });
  quiz.push({ q: 'In an exchange, when should an order be acknowledged to the client?', options: ['As soon as the gateway receives it', 'After the sequenced journal entry is replicated so it survives a single-machine failure', 'After the end-of-day report', 'After the trade settles'], answer: 1, explain: 'Acking before replication risks telling a client about an order that no surviving replica knows about.' });
  quiz.push({ q: 'Doc "ab". Ana inserts X at 1; Ben concurrently deletes index 0. Ana receives Ben’s delete. With OT, what should she apply?', options: ['delete at 1', 'delete at 0', 'insert at 0', 'nothing'], answer: 1, explain: 'Ben’s delete at 0 is before Ana’s insert at 1, so its position is unchanged. (Ben, conversely, shifts Ana’s insert left to 0.) Both end with "Xb".' });
  quiz.push({ q: 'Which property makes CRDTs well-suited to offline editing?', options: ['They need a central server to order operations', 'Merges are commutative, associative and idempotent, so updates can arrive in any order', 'They store no metadata', 'They lock paragraphs'], answer: 1, explain: 'Any replica can apply any set of updates in any order (even twice) and reach the same state, which is exactly what reconnecting offline devices need.' });
  quiz.push({ q: 'Live cursors (presence) in a collaborative editor should be', options: ['Persisted in the ops log for history', 'Kept in memory, throttled, with a heartbeat TTL', 'Stored in the CDN', 'Sent by email'], answer: 1, explain: 'Presence is high-frequency and worthless after the session; storing it wastes writes. A TTL removes users who disappear without saying goodbye.' });

  /* ================= INTERVIEW ================= */
  interview.push({ q: 'Walk me through the URL frontier of a large-scale web crawler.', level: 'I',
    a: `<p>The frontier answers "which URL next?" under two goals: priority and politeness. New URLs are normalised and checked against the seen-set, then enter <b>front queues</b> by priority (importance, freshness need). A router moves URLs into <b>back queues, one per host</b>. A <b>min-heap</b> holds (host, next allowed time). A fetcher pops the host with the smallest time, waits if needed, takes the head URL, and after the fetch pushes the host back with now + max(crawl-delay, k × response time). Queues live on disk with memory buffers, and the frontier is partitioned across nodes by host hash so all politeness and robots state for a host is local. Fetches carry leases so a crashed fetcher's URLs return to the queue.</p>`,
    followUps: ['How many back queues per fetcher thread?', 'How do you handle a host with 50 million URLs?'] });
  interview.push({ q: 'How do you avoid fetching the same content many times in a crawler?', level: 'I',
    a: `<p>Two layers. Before fetching: normalise URLs (lowercase host, remove default ports, fragments and session parameters, sort query params, resolve relative paths, respect rel=canonical), then check a Bloom filter and an exact sharded seen-store. After fetching: compute an exact hash of the cleaned body to catch mirrors and a SimHash to catch near-duplicates (fingerprints within a few bits), using block-permuted tables for fast Hamming search. Duplicates are stored as pointers to a canonical copy and their URLs get lower crawl priority. For re-crawls, conditional GETs with ETag and If-Modified-Since avoid downloading unchanged bodies at all.</p>`,
    followUps: ['What false-positive rate would you choose for the Bloom filter, and why?', 'How do you pick the canonical URL among duplicates?'] });
  interview.push({ q: 'How would you defend a crawler against spider traps and hostile sites?', level: 'A',
    a: `<p>Traps create infinite URL spaces (calendars, session ids, faceted search, symlink loops) or waste resources (tarpits that drip bytes, giant files). Defences: per-host page budgets proportional to importance; max URL length and path depth; detecting repeated path segments; stripping known session parameters; strict connect and total timeouts plus a maximum body size; content-type allow-lists; limiting redirects; and deprioritising URLs whose pages are near-duplicates of already-seen pages. Monitoring per-host statistics (URLs discovered vs unique content) catches new trap patterns, and a manual blocklist handles the rest. All of this runs in the frontier/fetcher, so one bad host cannot affect others.</p>`,
    followUps: ['How do you crawl sites that require JavaScript rendering?', 'What do you do when a site returns 429?'] });
  interview.push({ q: 'Design a distributed cron service. How do you make sure each run fires exactly once?', level: 'A',
    a: `<p>Jobs live in a sharded store with an index on next_run_at. One active scheduler per shard (a leader lease in etcd or ZooKeeper) loads soon-due jobs into a timing wheel. For each due job it inserts a run with id = hash(job, scheduled time) — a unique key, so duplicates are impossible — advances next_run_at in the same transaction, and enqueues the run through an outbox. Workers acquire a <b>lease</b> on the run via compare-and-set and get a <b>fencing token</b>; they heartbeat while running and commit with the token, so a paused zombie cannot overwrite a newer attempt. Expired leases are retried with backoff and eventually dead-lettered. Because a crash can happen after the effect but before the commit, the target receives run_id as an idempotency key. That combination — at-least-once execution plus idempotent effects — is what "exactly once" means in practice.</p>`,
    followUps: ['What if the scheduler for a shard dies at 01:59:59?', 'How do you choose the lease length?'] });
  interview.push({ q: 'Thousands of jobs are scheduled at 00:00. How do you handle the spike?', level: 'I',
    a: `<p>First, separate triggering from execution: triggering is cheap and must be on time; execution goes through a queue with a worker pool, so a spike becomes queueing delay rather than failures. Pre-load the runs a minute early into the timing wheel so the database is not hit at 00:00. Offer a jitter window (like Jenkins' H syntax) and make it the default for jobs that do not need an exact second. Enforce per-tenant concurrency limits and token buckets so one tenant cannot flood workers, and give latency-sensitive jobs higher priority. Autoscale workers ahead of known peaks. Finally, protect downstream services with their own rate limits, because 50K jobs calling the same API at once can take it down.</p>`,
    followUps: ['How do you measure "on time" for a scheduler?', 'What is a fair scheduling policy across tenants?'] });
  interview.push({ q: 'How do you handle time zones and daylight saving time in a job scheduler?', level: 'A',
    a: `<p>Store each schedule with its IANA time zone, and compute next_run_at as a UTC instant using the time-zone database, from the schedule expression rather than by adding 24 hours. Define and document DST rules: when a local time is skipped (spring forward), run at the next valid time (or skip, configurable); when it repeats (fall back), run once at the first occurrence. Keep the tz database updated because governments change rules. Prefer UTC schedules for infrastructure jobs. Tests should include the DST transition dates for each supported zone, the end of February, and months with 31 days for jobs like "the 31st of each month".</p>`,
    followUps: ['How should "every 90 minutes" behave across DST?', 'What happens when the tz database changes for a zone?'] });
  interview.push({ q: 'Design a real-time leaderboard for 50 million players.', level: 'I',
    a: `<p>Scores are validated server-side and written to a durable store keyed by player and period, with match_id for idempotency; an event goes to a stream. An updater writes absolute scores into Redis sorted sets: global, per period (key per day/week with TTL) and per region. Top-K is ZREVRANGE (cached as JSON for a second because everyone sees the same list), rank is ZREVRANK on replicas, neighbours are a small range around the rank. Ties follow a product rule: competition rank, or earliest achiever by encoding score and inverted timestamp into one exact number. 50M entries take a few GB per board. Redis is a derived index rebuilt from the DB if lost. Friends boards are computed on read. For hundreds of millions of players I would keep the exact board for the head and use a score histogram for approximate percentiles in the tail.</p>`,
    followUps: ['How do you shard one board if writes exceed one node?', 'How do you prevent cheating?'] });
  interview.push({ q: 'How would you shard a leaderboard that no longer fits on one machine, and what does top-K cost then?', level: 'A',
    a: `<p>Two options. <b>Hash sharding by player</b>: writes spread evenly, but top-K becomes scatter-gather — each of S shards returns its top K and we merge S × K candidates (cheap for K = 100). Exact rank needs the count of higher scores on every shard, also scatter-gather; caching per-shard score histograms makes it approximate but O(1). <b>Range sharding by score</b>: shard boundaries by score ranges; rank = (cached count of players in higher shards) + local rank, top-K reads only the top shard; but load is uneven (the top range is hot and small) and players move between shards as scores change. Many systems combine them: exact top board on one node, histograms for everyone else.</p>`,
    followUps: ['How do you rebalance score-range shards?', 'How stale can cached shard counts be?'] });
  interview.push({ q: 'Design the core of a stock exchange.', level: 'E',
    a: `<p>Clients connect through gateways (FIX or binary), which authenticate and dedupe by client order id; pre-trade risk checks run next. A <b>sequencer</b> assigns every message a monotonically increasing number and replicates it to a journal (consensus or primary + standbys) before acknowledging. A matching engine per symbol shard is a <b>single-threaded deterministic state machine</b>: an in-memory order book with price levels (sorted map or tick array) holding FIFO lists, an id map for O(1) cancels, integer tick prices, and price-time matching where trades print at the resting price. Hot standbys replay the same journal and hold identical state, so failover is fast and lossless. Outputs — execution reports, multicast market data with sequence numbers, drop copies, clearing — are consumed off the hot path. Latency comes from memory-only processing, kernel bypass, ring buffers and no garbage collection; fairness from the sequencer, equal colocation cables, and clear priority rules.</p>`,
    followUps: ['How would you add an opening auction?', 'How do you scale to 10,000 symbols?'] });
  interview.push({ q: 'Why not run the matching engine on a database with transactions?', level: 'A',
    a: `<p>A database gives durability and isolation, but at the wrong cost and with the wrong semantics. Each transaction commit takes at least tens of microseconds to milliseconds (log flush, locks), far above the microsecond budget, and concurrent transactions are ordered by lock acquisition timing rather than by a fair, published sequence, so results are not reproducible. Instead, durability comes from the replicated input journal (event sourcing): the book is a deterministic function of the sequenced inputs, kept in memory, and can be rebuilt by replay from snapshots. Databases still appear downstream — for trade records, clearing, reporting and analytics — fed asynchronously from the engine's output events.</p>`,
    followUps: ['How do you take consistent snapshots without pausing?', 'What does the journal look like on disk?'] });
  interview.push({ q: 'Explain how OT keeps two editors consistent, and where it gets hard.', level: 'A',
    a: `<p>Each client applies its edits locally and sends them with the server version they were based on. A central server orders operations; when an op arrives based on an older version, the server transforms it against every op committed since, so its position refers to the current document (an earlier insert shifts positions right, an earlier delete shifts them left, same-position inserts are ordered by a site id). Clients do the same for incoming ops against their unacknowledged local ops. The transform must satisfy TP1: applying a then T(b, a) equals applying b then T(a, b). It gets hard with rich text (formatting ranges, tables), with undo, with long offline periods (many transforms), and without a central server, where stronger properties (TP2) are required and many published algorithms turned out to be wrong. Using a central server — as Google Docs does — sidesteps the peer-to-peer cases.</p>`,
    followUps: ['How do you transform cursor positions?', 'How is undo implemented in OT?'] });
  interview.push({ q: 'OT or CRDT for a new collaborative product? Defend your choice.', level: 'E',
    a: `<p>It depends on the product constraints. If the product is online-first, has a server that must see content anyway (search, permissions, AI features) and needs a small wire format, server-ordered OT is proven (Google Docs) and simple when the server is the only ordering point. If offline-first, local-first, peer-to-peer or end-to-end encryption matter, CRDTs win because merges happen anywhere in any order and the server can relay opaque updates. Modern CRDT libraries (Yjs, Automerge) have made metadata overhead and performance acceptable through run-length encoding and compaction, and they come with editor bindings, which often decides it for new products. I would also consider the data type: for structured data (design tools, task boards) per-property last-writer-wins registers under a server authority, like Figma, are simpler than general text algorithms.</p>`,
    followUps: ['How would you garbage-collect CRDT tombstones?', 'What is the interleaving anomaly?'] });
  interview.push({ q: 'Across these five systems, what is the one invariant you protect in each, and how?', level: 'E',
    a: `<p><b>Crawler:</b> never overload a host and never fetch forbidden pages — per-host queues with a ready-time heap and cached robots rules. <b>Job scheduler:</b> each scheduled run happens once in effect — deterministic run ids, leases with fencing tokens and idempotent effects. <b>Leaderboard:</b> ranks are consistent and ties are deterministic — a sorted set fed from a durable source of truth with a defined tie rule. <b>Exchange:</b> fair, deterministic matching with no lost orders — a sequencer, a replicated journal and a single-threaded state machine with price-time priority. <b>Collaborative editor:</b> convergence without losing anyone's intention — OT with a central order or a CRDT with unique element ids. In each design, strong guarantees are concentrated on a small hot core and everything else (analytics, history, market data, presence) is eventually consistent and off the hot path.</p>`,
    followUps: ['Which of these would you build on managed cloud services?', 'Pick one and describe its behaviour during a regional outage.'] });

  registerModule({
    id: 'hld17',
    title: 'Case Studies IV: Web Crawler, Job Scheduler, Leaderboard, Stock Exchange, Collaborative Editor',
    intro: `<p>The fourth set of full system designs. Each case study keeps the interview shape you know from Case Studies I-III: <b>requirements → estimates → API → data model → high-level design → deep dives → bottlenecks and trade-offs</b>. Each one teaches a new core idea: a <b>URL frontier with per-host politeness, robots.txt and dedupe</b> for a web crawler; <b>leases, fencing tokens and idempotent run ids</b> for a distributed job scheduler; <b>sorted sets, ties and rank queries</b> for a real-time leaderboard; <b>price-time priority matching</b> and a <b>sequencer with deterministic replay</b> for a stock exchange; and <b>operational transformation vs CRDTs</b>, presence and offline sync for a collaborative editor.</p>
      <p>Every topic starts with an everyday analogy, then numbers, tables and an animated visualizer (a frontier interleaving hosts, a lease takeover stopped by a fencing token, a board re-sorting with ties, an order walking the book, two engines replaying one journal, two concurrent edits being transformed). Each comes with a runnable model in JavaScript or Java that you can read, run and change.</p>`,
    goals: [
      'Run complete designs for a web crawler, a distributed job scheduler, a real-time leaderboard, a stock exchange and a collaborative editor: requirements, estimates, API, data model, architecture, deep dives and trade-offs',
      'Build a URL frontier with per-host queues and politeness timers, robots.txt handling, URL normalisation, Bloom-filter dedupe and SimHash near-duplicate detection',
      'Make a scheduler fire each run once in effect using deterministic run ids, leases, fencing tokens and idempotent effects; handle top-of-hour spikes and DST',
      'Answer top-K and rank-of-me in O(log N) with sorted sets, define tie rules, and shard or approximate boards at hundreds of millions of players',
      'Implement price-time priority matching and explain sequencing, replicated journals, deterministic replay, low-latency techniques and exchange fairness',
      'Explain how OT and CRDTs make concurrent edits converge, and design presence, history and offline sync'
    ],
    prereqs: `HLD 11 and Case Studies I (HLD 14) are required; the other case studies help with the shared building blocks (sharding, queues, idempotency, streaming).`,
    hours: 16,
    langExplain: `<p>HLD lessons are mostly language-neutral diagrams, APIs and schemas. The runnable models here are in JavaScript (run them in the browser) and one Java class (the matching engine); the ideas carry over directly to Python, Go, C++ or any other language.</p>`,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
