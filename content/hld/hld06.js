(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (pure, deterministic) ---------- */
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function cp(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function entries(o) { var r = []; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r.push([k, o[k]]); return r; }
  function pct(a, b) { return b ? Math.round(1000 * a / b) / 10 + '%' : '—'; }

  /* =====================================================================
     TOPIC 1 — Why cache? + Cache-aside (lazy loading)
     ===================================================================== */
  topics.push({
    title: 'Why Cache? The Cache-Aside (Lazy Loading) Pattern',
    analogy: `<p>You keep a <b>bottle of water on your desk</b>. When you are thirsty you grab the bottle (fast — a <b>cache hit</b>). If the bottle is empty you walk to the kitchen, fill it up, drink, and put the full bottle back on your desk (slow — a <b>cache miss</b>), so the next sip is fast again. The kitchen is the database: always correct, always there, but far away. The desk bottle is the cache: tiny, close, and sometimes empty or a bit stale.</p>`,
    explain: `<p>A <b>cache</b> is a small, fast copy of data that lives closer to whoever needs it. You keep the <b>source of truth</b> (the database) and put a cache in front so that most reads never have to travel all the way to it.</p>
<p><b>Why bother?</b> Look at rough 2026 latency numbers inside one data centre:</p>
${H.table(['Where the data lives', 'Typical time', 'Feels like'], [['In-process memory (a HashMap)', '~100 ns', 'grabbing the bottle on your desk'], ['Redis / Memcached over the network', '~0.2 – 1 ms', 'walking to the next desk'], ['Database query with an index (SSD)', '~2 – 20 ms', 'walking to the kitchen'], ['Heavy query / join / aggregation', '50 ms – seconds', 'driving to the shop']])}
<p>If 90% of reads hit a 0.5 ms cache instead of a 20 ms database, the <b>average</b> read drops from 20 ms to about <code>0.9·0.5 + 0.1·(0.5+20) ≈ 2.5 ms</code>, and the database only sees 10% of the traffic. That second part matters even more: caches let one database survive 10× more users.</p>
<p><b>Cache-aside</b> (also called <b>lazy loading</b>) is the most common pattern. The <i>application</i> is in charge — the cache is just a dumb key-value store sitting "aside":</p>
<ol>
<li><b>Read:</b> ask the cache for <code>user:42</code>. ${H.c('g', 'Hit')} → return it. ${H.c('r', 'Miss')} → read from the DB, <b>store it in the cache with a TTL</b>, return it.</li>
<li><b>Write:</b> update the DB first, then <b>delete</b> (invalidate) the cache key. The next read reloads a fresh copy.</li>
</ol>
${H.kv([['hit rate', 'hits ÷ total reads (aim 80 – 99%)'], ['miss penalty', 'cache check + DB read + cache set'], ['TTL', 'time-to-live: auto-delete after N seconds (safety net for staleness)']], { label: 'Three words you will use all day' })}
<p><b>Strengths:</b> only data that is actually requested gets cached (no wasted memory), and if the cache dies the app still works — it just gets slower. <b>Weaknesses:</b> the first read of every key is a miss (a "cold" cache), there is a small window where the cache can be stale, and every service has to repeat the same "check, load, set" logic.</p>`,
    clues: ['"read-heavy" / "reads outnumber writes 100:1" → put a cache in front of the DB', '"p99 latency must be under 50 ms" while the DB query takes 30 ms → cache the hot reads', '"the same product page / profile is viewed millions of times" → hot keys, cache-aside with TTL', '"the database CPU is at 90% and most queries are identical" → caching beats a bigger DB', '"it is OK if a profile picture is a few seconds stale" → TTL-based cache-aside is acceptable', '"the system must still work if the cache cluster goes down" → cache-aside (cache is optional, DB is truth)'],
    code: [{ lang: 'python', run: true, title: 'Cache-aside simulation (runnable)', code: `import time

class FakeDB:
    """Pretend database: slow (we count 20 ms per query) but always correct."""
    def __init__(self):
        self.rows = {"user:1": "Asha", "user:2": "Ben", "user:3": "Chen"}
        self.queries = 0
    def get(self, key):
        self.queries += 1          # every call costs a round trip to the DB
        return self.rows.get(key)
    def put(self, key, value):
        self.rows[key] = value

class TTLCache:
    """Tiny cache with a time-to-live per key. 'now' is passed in so the demo is deterministic."""
    def __init__(self):
        self.data = {}             # key -> (value, expires_at)
    def get(self, key, now):
        item = self.data.get(key)
        if item is None:
            return None
        value, expires_at = item
        if now >= expires_at:      # expired: behave like a miss and clean up lazily
            del self.data[key]
            return None
        return value
    def set(self, key, value, ttl, now):
        self.data[key] = (value, now + ttl)
    def delete(self, key):
        self.data.pop(key, None)

db, cache = FakeDB(), TTLCache()
stats = {"hit": 0, "miss": 0}

def read_user(key, now):
    value = cache.get(key, now)                # 1. try the cache
    if value is not None:
        stats["hit"] += 1
        return value
    stats["miss"] += 1
    value = db.get(key)                        # 2. miss -> go to the source of truth
    if value is not None:
        cache.set(key, value, ttl=60, now=now) # 3. populate for next time
    return value

def update_user(key, value):
    db.put(key, value)                         # 1. write the truth first
    cache.delete(key)                          # 2. then invalidate (do not update!)

reads = ["user:1", "user:2", "user:1", "user:1", "user:3", "user:2", "user:1"]
for t, k in enumerate(reads):
    print(f"t={t:>2}s read {k} -> {read_user(k, now=t)}")

update_user("user:1", "Asha K.")              # write path
print("after update:", read_user("user:1", now=10))
print("after TTL expiry:", read_user("user:2", now=100))

total = stats["hit"] + stats["miss"]
print(f"hits={stats['hit']} misses={stats['miss']} hit-rate={stats['hit']/total:.0%} db-queries={db.queries}")` }, { lang: 'java', title: 'Cache-aside in Java (generic, thread-safe map as the cache)', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;

class CacheAside<K, V> {
    // value + absolute expiry time in millis
    private record Entry<T>(T value, long expiresAt) {}

    private final ConcurrentHashMap<K, Entry<V>> cache = new ConcurrentHashMap<>();
    private final Function<K, V> loader;   // e.g. key -> jdbc.queryUser(key)
    private final long ttlMillis;

    CacheAside(Function<K, V> loader, long ttlMillis) {
        this.loader = loader;
        this.ttlMillis = ttlMillis;
    }

    V get(K key) {
        long now = System.currentTimeMillis();
        Entry<V> e = cache.get(key);
        if (e != null && e.expiresAt() > now) return e.value();   // HIT
        V fresh = loader.apply(key);                                 // MISS -> source of truth
        if (fresh != null) cache.put(key, new Entry<>(fresh, now + ttlMillis));
        return fresh;
    }

    // Write path: caller updates the DB first, then calls this.
    void invalidate(K key) { cache.remove(key); }

    public static void main(String[] args) {
        Map<String, String> db = new HashMap<>(Map.of("user:1", "Asha"));
        int[] dbCalls = {0};
        CacheAside<String, String> c = new CacheAside<>(k -> { dbCalls[0]++; return db.get(k); }, 60_000);
        c.get("user:1"); c.get("user:1"); c.get("user:1");
        System.out.println("DB calls for 3 reads = " + dbCalls[0]);   // 1
    }
}` }],
    codeTitle: ['Cache-aside, step by step (Python)', 'Reusable cache-aside wrapper (Java 21)'],
    viz: {
      title: 'Cache-aside: watch each read hit (green) or miss (red)',
      input: 'user:1 user:2 user:1 user:1 user:3 user:2 user:1 user:4 user:1',
      inputLabel: 'Keys requested, in order (space separated, ≤ 14)',
      gen: function (input) {
        var keys = String(input || '').trim().split(/[\s,]+/).filter(Boolean);
        if (!keys.length) throw new Error('Enter keys separated by spaces, e.g. user:1 user:2 user:1');
        if (keys.length > 14) throw new Error('Use at most 14 requests');
        var cache = {}, hits = 0, misses = 0, ms = 0, frames = [];
        function g(hl, ehl, labels) {
          return { type: 'graph', directed: true, height: 60, label: 'Request path', nodes: [box('C', 'Client', 8, 30), box('A', 'App server', 38, 30), box('R', 'Cache (Redis)', 78, 10), box('D', 'Database', 78, 50)],
            edges: [['C', 'A', labels.ca || 'GET'], ['A', 'R', labels.ar || 'GET key'], ['A', 'D', labels.ad || 'SELECT']], hl: hl, ehl: ehl };
        }
        function st(extraHl) { return { type: 'vars', label: 'Running score', vals: { hits: hits, misses: misses, 'hit rate': pct(hits, hits + misses), 'total time': ms.toFixed(1) + ' ms' }, hl: extraHl || {} }; }
        frames.push({ narr: 'Start: the cache is <b>empty</b> ("cold"). Every key will miss once, then later reads of the same key should hit.', parts: [g({}, {}, {}), { type: 'map', label: 'Cache contents', entries: [] }, st()] });
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i], hit = Object.prototype.hasOwnProperty.call(cache, k);
          if (hit) {
            hits++; ms += 0.5;
            var h1 = {}; h1[k] = 'ok';
            frames.push({ narr: 'Request ' + (i + 1) + ': <b>' + k + '</b>. App asks Redis → <span class="c-g">HIT</span>. Answer in ~0.5 ms; the database is not touched at all.', parts: [g({ A: 'cur', R: 'ok' }, { 'C-A': 'ok', 'A-R': 'ok' }, { ar: 'GET ' + k + ' → hit' }), { type: 'map', label: 'Cache contents', entries: entries(cache), hl: h1 }, st({ hits: 'ok' })] });
          } else {
            misses++; ms += 0.5;
            frames.push({ narr: 'Request ' + (i + 1) + ': <b>' + k + '</b>. App asks Redis → <span class="c-r">MISS</span> (not stored yet). Now we must pay for the slow path.', parts: [g({ A: 'cur', R: 'bad' }, { 'C-A': 'ok', 'A-R': 'bad' }, { ar: 'GET ' + k + ' → nil' }), { type: 'map', label: 'Cache contents', entries: entries(cache) }, st({ misses: 'bad' })] });
            ms += 20;
            frames.push({ narr: 'Miss path step 2: the app queries the <b>database</b> (~20 ms). The DB is the source of truth, so the answer is correct.', parts: [g({ A: 'cur', D: 'cur' }, { 'A-D': 'cur' }, { ad: 'SELECT … WHERE id=' + k }), { type: 'map', label: 'Cache contents', entries: entries(cache) }, st()] });
            cache[k] = 'row(' + k + ')'; ms += 0.5;
            var h2 = {}; h2[k] = 'ok';
            frames.push({ narr: 'Miss path step 3: the app <b>writes the row into Redis with a TTL</b> (<code>SET ' + k + ' … EX 300</code>) so the next read of ' + k + ' is a hit.', parts: [g({ A: 'cur', R: 'ok' }, { 'A-R': 'ok' }, { ar: 'SET ' + k + ' EX 300' }), { type: 'map', label: 'Cache contents', entries: entries(cache), hl: h2 }, st()] });
          }
        }
        var noCache = (keys.length * 20).toFixed(1);
        frames.push({ narr: 'Done. With the cache: <b>' + ms.toFixed(1) + ' ms</b> total and <b>' + misses + '</b> DB queries. Without a cache it would be ~<b>' + noCache + ' ms</b> and <b>' + keys.length + '</b> DB queries. Repeated keys are what make caching pay off.', parts: [g({ R: 'sel' }, {}, {}), { type: 'map', label: 'Cache contents', entries: entries(cache) }, st({ 'hit rate': 'sel' }), { type: 'bars', label: 'DB queries: with cache vs without', values: [misses, keys.length], idxLabels: ['cache-aside', 'no cache'], hl: { 0: 'ok', 1: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Hit-rate math for a profile service', html: `<p>Profile reads: 20,000 QPS. DB read = 15 ms, Redis = 0.5 ms. With a <b>95%</b> hit rate:</p>${H.table(['Quantity', 'Math', 'Result'], [['DB QPS', '20,000 × 0.05', '<b>1,000 QPS</b> (was 20,000)'], ['Avg latency', '0.95·0.5 + 0.05·(0.5 + 15)', '<b>≈ 1.25 ms</b> (was 15 ms)'], ['If hit rate drops to 80%', '20,000 × 0.20', '<span class="c-r">4,000 QPS — 4× more DB load</span>']])}<p>Notice how sensitive DB load is to the <i>miss</i> rate: going from 95% to 80% hits is only "15 points", but DB traffic quadruples.</p>` },
      { title: 'Write path: why DELETE, not SET', html: `<p>User renames herself. Two app servers handle two updates at almost the same time:</p>${H.table(['Time', 'Server A', 'Server B'], [['t1', 'UPDATE db name=\'X\'', ''], ['t2', '', 'UPDATE db name=\'Y\''], ['t3', '', 'SET cache name=\'Y\''], ['t4', 'SET cache name=\'X\'', '']])}<p>The DB says <b>Y</b> but the cache says <b>X</b> ${H.c('r', '(stale until TTL!)')}. If both servers simply <b>delete</b> the key, the next read reloads Y from the DB. Deleting is idempotent and order-independent, which is why cache-aside invalidates rather than updates.</p>` },
      { title: 'Cold start after a deploy', html: `<p>You flush Redis during a migration. For the next minute the hit rate is ~0%, so the DB suddenly receives 100% of reads — maybe 20× its normal load. Fixes: <b>warm the cache</b> before switching traffic (replay the top 10k keys), bring traffic back gradually, or never flush everything at once (rename key prefixes, e.g. <code>v2:user:42</code>, and let the old ones expire).</p>` },
      { title: 'What NOT to cache', html: `<p>${H.chips(['bank balance used for a withdrawal decision', 'inventory count at checkout', 'one-time password', 'data read once and never again'], { label: 'Poor cache candidates' })} These need perfect freshness or have no reuse. ${H.chips(['product details', 'user profile', 'rendered home feed', 'config / feature flags', 'session'], { label: 'Great candidates', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'g' } })}</p>` }
    ],
    deepDive: `<p><b>Where does the cache sit?</b> Cache-aside means the application owns the logic. That makes it the most flexible pattern (you can cache a computed object, not just a row) and the most resilient (cache outage = slower, not broken — but see the stampede topic: a sudden 0% hit rate can still melt the DB).</p>
<p><b>The race that remains.</b> Even with "update DB, then delete cache" there is a rare race: Reader R misses and reads the <i>old</i> row from the DB; Writer W updates the DB and deletes the key; R then <i>sets</i> the old row into the cache. Now stale data lives until the TTL. It requires R's DB read to start before W's commit and R's cache-set to land after W's delete, so it is rare — but at Facebook scale "rare" happens every second. Fixes: short TTLs as a safety net, <b>leases</b> (Facebook's memcache paper: the cache hands a lease token on miss; a delete invalidates the lease, so the late set is rejected), <b>versioned values</b> with compare-and-set, or a delayed second delete ("double delete").</p>
<p><b>Serialization cost.</b> A "fast" cache hit still pays for network + deserialization. A 200 KB JSON blob can take longer to parse than a 1 ms DB query. Keep values small (store IDs + compact fields), use efficient formats (MessagePack, Protobuf), and consider compression only for large values.</p>
<p><b>Key design.</b> Use namespaced, versioned keys: <code>v3:user:42:profile</code>. Bumping the version prefix is an instant, safe "invalidate everything of this type" during schema changes. Avoid unbounded keys built from user input (cache-key explosion) and very large values (Redis is single-threaded per shard for commands; a 10 MB GET blocks others).</p>
<p><b>Measure it.</b> Track hit rate per key prefix, p50/p99 latency of hits vs misses, eviction count and memory. A global "95% hit rate" can hide one endpoint at 10%.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants will happily generate a cache-aside wrapper, a Redis client config and TTLs in seconds. The boilerplate is no longer the hard part; <b>deciding what to cache, for how long and how it gets invalidated</b> still is. LLM-powered apps also introduced new caches: <b>prompt/response caches</b>, embedding caches and <b>semantic caches</b> (look up by vector similarity instead of exact key). The same cache-aside logic applies — check, miss, compute (call the model, which can cost cents and seconds), store with a TTL.</p>
<p><b>Use AI as a partner:</b> ask <code>List every write path that changes the users table and tell me which cache keys each must invalidate</code> — great for finding forgotten invalidations. Or <code>Given these QPS and latency numbers, compute DB load at 80/90/99% hit rates</code>.</p>
<p><b>Where AI goes wrong:</b> it often writes "update DB then <i>set</i> cache" (racy), forgets the TTL, caches <code>null</code> forever, or caches per-user data under a shared key (a privacy bug). <b>What you must still own:</b> the consistency requirement ("can this be 30 s stale?"), the key design, and the failure mode when the cache disappears.</p>`,
    problems: [{
      title: 'Speed Up a Product Detail Page', level: 'Easy', tags: ['cache-aside', 'TTL', 'read-heavy'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>An e-commerce site serves product pages from PostgreSQL. Reads are 50,000 QPS at peak, writes (price/stock edits) are ~50 QPS. Each page needs a 3-table join that takes 25 ms and the DB is at 85% CPU. Product descriptions and prices may be up to 60 seconds stale, but <b>stock at checkout must be exact</b>. Design the caching layer.</p>`,
      constraints: `<p>p99 page latency &lt; 100 ms · 2 million products, ~20% of them get 90% of views · average cached object 4 KB · DB must stay under 50% CPU.</p>`,
      example: `<p>Reads of ${H.c('b', 'product:812')} arrive 3,000 times per second during a sale. With cache-aside + 60 s TTL, the DB sees ${H.c('g', 'about 1 query per minute')} for that product instead of ${H.c('r', '180,000 per minute')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> add read replicas and a bigger DB instance, no cache. Each replica still runs the 25 ms join for every view, so you need many replicas (50,000 × 25 ms ≈ 1,250 CPU-seconds per second ≈ 1,250 busy cores). Cost explodes and replica lag still exists. The work is wasted because the <i>same</i> join result is recomputed thousands of times per second.</p>` },
      mcq: { q: 'Which data should NOT be served from the 60-second cache?', options: ['Product title and description', 'Product images URLs', 'Stock count used to approve checkout', 'Average star rating'], answer: 2, explain: 'Checkout must see exact stock; read it from the DB (or decrement atomically there). Everything else tolerates 60 s staleness.' },
      hints: [`<p>Hint 1: Reads outnumber writes 1000:1 and the same products repeat → the join result is a perfect cache value.</p>`, `<p>Hint 2: Cache-aside with Redis, key <code>v1:product:{id}</code>, value = the fully assembled page object, TTL ≈ 60 s. Writes update the DB then DELETE the key.</p>`, `<p>Hint 3: Size it: hot set = 20% × 2M = 400k products × 4 KB ≈ 1.6 GB (+ overhead ≈ 3 GB). Keep the checkout stock check on the DB path. Add TTL jitter so keys do not all expire together.</p>`],
      solution: {
        approach: `<p><b>Design.</b> Put a Redis cluster (2 primaries + replicas, ~8 GB total) in front of PostgreSQL using <b>cache-aside</b>:</p>
<ol><li><b>Read:</b> <code>GET v1:product:{id}</code>. Hit → render. Miss → run the 25 ms join, build a compact product object, <code>SET v1:product:{id} obj EX 60+rand(0..10)</code> (jitter avoids synchronized expiry), render.</li>
<li><b>Write</b> (price/description edit): commit to PostgreSQL, then <code>DEL v1:product:{id}</code>. With 50 writes/s this is trivial. The TTL is a safety net if a delete is ever lost.</li>
<li><b>Checkout:</b> never trust the cache for stock — do <code>UPDATE stock SET qty = qty-1 WHERE id=? AND qty &gt; 0</code> on the DB. The page may <i>display</i> cached stock ("only 3 left") because 60 s staleness is acceptable for display.</li>
<li><b>Sizing:</b> hot working set ≈ 400k × 4 KB = 1.6 GB, ×2 for Redis overhead and growth ≈ 3–4 GB; give each shard headroom and use <code>allkeys-lru</code> eviction.</li></ol>
<p><b>Result:</b> at a 95% hit rate the DB sees 2,500 QPS of joins instead of 50,000; p99 is dominated by the 0.5 ms Redis hit. If Redis fails, requests fall through to the DB — protect it with a rate limiter / request coalescing so the fallback does not overload it.</p>`,
        complexity: `<p>Hit: 1 network round trip (~0.5 ms). Miss: round trip + 25 ms join + SET. Memory ≈ hot keys × value size × ~2 overhead ≈ 3–4 GB.</p>`,
        followUps: ['Price changes must appear within 1 second — what changes?', 'A celebrity tweet sends 200k QPS to one product — what breaks?', 'How do you warm the cache before a big sale?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Read-through, Write-through, Write-around, Write-back
     ===================================================================== */
  topics.push({
    title: 'Read-Through, Write-Through, Write-Around & Write-Back',
    analogy: `<p>Think of a <b>restaurant waiter</b> (the cache) and the <b>kitchen</b> (the database). <b>Read-through:</b> you only talk to the waiter; if he does not have your dish ready, <i>he</i> walks to the kitchen. <b>Write-through:</b> you tell the waiter a change to your order and he immediately runs it to the kitchen before saying "done". <b>Write-around:</b> you phone the kitchen directly and the waiter forgets what he knew. <b>Write-back:</b> the waiter scribbles your changes on his notepad and only takes the notepad to the kitchen every few minutes — super fast for you, but if he trips and loses the notepad, your changes are gone.</p>`,
    explain: `<p>Cache-aside puts the <i>application</i> in charge. The other patterns put the <b>cache itself</b> (or a caching library) in the middle of the data path. They answer two separate questions:</p>
<p><b>1. Who loads data on a read miss?</b></p>
<ul><li><b>Cache-aside:</b> the app does: check cache → read DB → set cache.</li>
<li><b>Read-through:</b> the cache does. The app only calls <code>cache.get(key)</code>; on a miss the cache calls a <i>loader</i> you registered (e.g. Caffeine <code>LoadingCache</code>, Amazon DAX in front of DynamoDB). Same flow, cleaner code, one place to add coalescing.</li></ul>
<p><b>2. What happens on a write?</b></p>
${H.table(['Policy', 'Write goes to', 'Write latency', 'Read after write', 'Risk'], [['<b>Write-through</b>', 'cache <b>and</b> DB, synchronously', 'slower (both)', 'always fresh hit', 'caches data nobody reads'], ['<b>Write-around</b>', 'DB only; cache key deleted', 'DB only', 'first read is a miss', 'brief miss after every write'], ['<b>Write-back</b> (write-behind)', 'cache only; DB updated later in batches', '<span class="c-g">fastest</span>', 'fresh hit', '<span class="c-r">data loss if cache dies before flush</span>']])}
<p><b>Write-through</b> keeps cache and DB in step: the write is acknowledged only when both succeed. Great when data is read right after being written (user settings, a just-posted comment). Downside: every write pays two latencies, and rarely-read data fills the cache (pair it with a TTL).</p>
<p><b>Write-around</b> is what cache-aside does on writes: write the DB, invalidate the cache. Good when written data is not read soon (logs, bulk imports) so the cache is not polluted.</p>
<p><b>Write-back</b> is how your CPU caches and the operating system's page cache work. Writes land in fast memory and are marked <b>dirty</b>; a background flusher writes them to the slow store later. Ten updates to the same counter become <b>one</b> DB write (write coalescing). Perfect for view counters, likes, game scores, metrics — anything where losing a few seconds of updates is acceptable. Never for money unless the cache itself is durable and replicated.</p>
<p><b>Refresh-ahead</b> is a bonus pattern: the cache reloads a hot key <i>before</i> it expires (e.g. at 80% of its TTL), so popular keys never miss.</p>`,
    clues: ['"writes must never be lost" / "financial" → write-through or write-around to a durable DB, never pure write-back', '"millions of like/view counter increments per second" → write-back (buffer + batch flush)', '"user expects to see their change immediately after saving" → write-through (or delete + read-your-writes)', '"bulk import / logs that are rarely read back" → write-around (do not pollute the cache)', '"we want one place that loads data on a miss" / "DAX", "LoadingCache" → read-through', '"hot keys must never miss" → refresh-ahead'],
    code: [{ lang: 'python', run: true, title: 'Compare write policies (runnable)', code: `class DB:
    def __init__(self):
        self.data, self.writes = {}, 0
    def write(self, k, v):
        self.writes += 1
        self.data[k] = v

class WriteThrough:
    def __init__(self, db): self.db, self.cache = db, {}
    def put(self, k, v):
        self.db.write(k, v)        # durable first ...
        self.cache[k] = v          # ... then cache, before acknowledging

class WriteAround:
    def __init__(self, db): self.db, self.cache = db, {}
    def put(self, k, v):
        self.db.write(k, v)
        self.cache.pop(k, None)    # invalidate; next read reloads

class WriteBack:
    def __init__(self, db): self.db, self.cache, self.dirty = db, {}, set()
    def put(self, k, v):
        self.cache[k] = v          # acknowledge immediately
        self.dirty.add(k)          # remember to persist later
    def flush(self):               # runs every N ms in a background thread
        for k in sorted(self.dirty):
            self.db.write(k, self.cache[k])
        self.dirty.clear()
    def crash(self):
        lost = sorted(self.dirty)  # dirty data only lived in memory
        self.cache, self.dirty = {}, set()
        return lost

ops = [("views:42", n) for n in range(1, 101)]   # 100 increments of one counter
for cls in (WriteThrough, WriteAround, WriteBack):
    db = DB()
    c = cls(db)
    for k, v in ops:
        c.put(k, v)
    if isinstance(c, WriteBack):
        c.flush()
    print(f"{cls.__name__:12} DB writes = {db.writes:3}  final value = {db.data['views:42']}")

wb_db = DB(); wb = WriteBack(wb_db)
wb.put("likes:7", 10); wb.flush(); wb.put("likes:7", 11); wb.put("likes:9", 3)
print("crash before flush loses:", wb.crash(), "| DB still has likes:7 =", wb_db.data["likes:7"])` }],
    codeTitle: ['Write-through vs write-around vs write-back'],
    viz: {
      title: 'Write policies: through vs around vs back (with a crash)',
      input: 'back | W x=1, W x=2, W x=3, R x, W y=7, FLUSH, W x=4, CRASH, R x',
      inputLabel: 'mode (through | around | back) | ops: W k=v, R k, FLUSH, CRASH',
      gen: function (input) {
        var s = String(input || '');
        var parts = s.split('|');
        if (parts.length !== 2) throw new Error('Format: mode | ops   e.g. back | W x=1, R x, FLUSH');
        var mode = parts[0].trim().toLowerCase();
        if (['through', 'around', 'back'].indexOf(mode) < 0) throw new Error('mode must be through, around or back');
        var ops = parts[1].split(',').map(function (o) { return o.trim(); }).filter(Boolean);
        if (!ops.length || ops.length > 14) throw new Error('Give 1–14 ops separated by commas');
        var cache = {}, db = {}, dirty = [], dbWrites = 0, lat = 0, lost = 0, frames = [];
        function g(hl, ehl, lab) {
          return { type: 'graph', directed: true, height: 60, label: 'Write-' + mode + ' topology', nodes: [box('A', 'App', 10, 35), box('C', 'Cache', 50, 10), box('D', 'Database', 90, 35)],
            edges: [['A', 'C', lab.ac || ''], ['C', 'D', lab.cd || ''], ['A', 'D', lab.ad || '']], hl: hl, ehl: ehl };
        }
        function state(hlC, hlD) {
          var out = [{ type: 'map', label: 'Cache', entries: entries(cache), hl: hlC || {} }, { type: 'map', label: 'Database (durable)', entries: entries(db), hl: hlD || {} }];
          if (mode === 'back') out.push({ type: 'set', label: 'Dirty keys (not yet in DB)', items: dirty.slice() });
          out.push({ type: 'vars', label: 'Counters', vals: { 'DB writes': dbWrites, 'write latency so far': lat + ' ms', 'updates lost': lost }, hl: lost ? { 'updates lost': 'bad' } : {} });
          return out;
        }
        var intro = { through: 'Write-through: every write updates the cache <b>and</b> the DB before the app gets "OK".', around: 'Write-around: writes go straight to the DB and the cache key is <b>deleted</b>.', back: 'Write-back: writes go to the cache only and are marked <b>dirty</b>; a flush copies them to the DB later.' };
        frames.push({ narr: intro[mode] + ' Watch the DB-write counter and what happens on a crash.', parts: [g({}, {}, {})].concat(state()) });
        ops.forEach(function (op, i) {
          var m;
          if ((m = /^W\s+(\w+)\s*=\s*(\S+)$/i.exec(op))) {
            var k = m[1], v = m[2], hc = {}, hd = {};
            if (mode === 'through') {
              cache[k] = v; db[k] = v; dbWrites++; lat += 11; hc[k] = 'ok'; hd[k] = 'ok';
              frames.push({ narr: '<b>' + op + '</b>: cache set (1 ms) <i>and</i> DB write (10 ms) synchronously. Slower write, but cache and DB agree.', parts: [g({ C: 'ok', D: 'ok' }, { 'A-C': 'ok', 'C-D': 'ok' }, { ac: 'SET ' + k, cd: 'UPDATE ' + k })].concat(state(hc, hd)) });
            } else if (mode === 'around') {
              var had = Object.prototype.hasOwnProperty.call(cache, k);
              db[k] = v; dbWrites++; lat += 10; delete cache[k]; hd[k] = 'ok';
              frames.push({ narr: '<b>' + op + '</b>: write the DB directly (10 ms)' + (had ? ' and <span class="c-r">delete</span> the stale cached copy' : '') + '. The cache is not filled, so the next read of ' + k + ' will miss.', parts: [g({ D: 'ok', C: had ? 'bad' : '' }, { 'A-D': 'ok' }, { ad: 'UPDATE ' + k, ac: had ? 'DEL ' + k : '' })].concat(state({}, hd)) });
            } else {
              cache[k] = v; lat += 1; if (dirty.indexOf(k) < 0) dirty.push(k); hc[k] = 'cur';
              frames.push({ narr: '<b>' + op + '</b>: written to the cache only (1 ms) and marked <span class="c-y">dirty</span>. The DB still has the old value — fast, but not durable yet.', parts: [g({ C: 'cur' }, { 'A-C': 'cur' }, { ac: 'SET ' + k })].concat(state(hc, {})) });
            }
          } else if ((m = /^R\s+(\w+)$/i.exec(op))) {
            var rk = m[1], h1 = {};
            if (Object.prototype.hasOwnProperty.call(cache, rk)) {
              h1[rk] = 'ok';
              frames.push({ narr: '<b>' + op + '</b>: <span class="c-g">cache hit</span> → ' + rk + ' = ' + cache[rk] + '.', parts: [g({ C: 'ok' }, { 'A-C': 'ok' }, { ac: 'GET ' + rk + ' → hit' })].concat(state(h1, {})) });
            } else if (Object.prototype.hasOwnProperty.call(db, rk)) {
              cache[rk] = db[rk]; h1[rk] = 'ok';
              frames.push({ narr: '<b>' + op + '</b>: <span class="c-r">miss</span>, so the cache loads ' + rk + ' = ' + db[rk] + ' from the DB (read-through) and keeps it.', parts: [g({ C: 'bad', D: 'cur' }, { 'A-C': 'bad', 'C-D': 'cur' }, { ac: 'GET ' + rk + ' → miss', cd: 'SELECT ' + rk })].concat(state(h1, {})) });
            } else {
              frames.push({ narr: '<b>' + op + '</b>: not in the cache and <span class="c-r">not in the DB either</span> — the value is gone.', parts: [g({ C: 'bad', D: 'bad' }, { 'A-C': 'bad', 'C-D': 'bad' }, { ac: 'GET ' + rk, cd: 'SELECT ' + rk })].concat(state()) });
            }
          } else if (/^FLUSH$/i.test(op)) {
            var hd2 = {};
            dirty.forEach(function (k2) { db[k2] = cache[k2]; dbWrites++; hd2[k2] = 'ok'; });
            var n = dirty.length; dirty = [];
            frames.push({ narr: '<b>FLUSH</b>: ' + (mode === 'back' ? 'the background flusher writes ' + n + ' dirty key(s) to the DB in one batch. Several updates to the same key were <b>coalesced</b> into one write.' : 'nothing to flush — this mode already writes the DB synchronously.'), parts: [g({ D: 'ok' }, { 'C-D': 'ok' }, { cd: 'batch write ×' + n })].concat(state({}, hd2)) });
          } else if (/^CRASH$/i.test(op)) {
            lost += mode === 'back' ? dirty.length : 0;
            var lostKeys = mode === 'back' ? dirty.slice() : [];
            cache = {}; dirty = [];
            frames.push({ narr: '<b>CRASH</b>: the cache node restarts and its memory is wiped. ' + (lostKeys.length ? '<span class="c-r">Dirty keys ' + lostKeys.join(', ') + ' never reached the DB — those updates are lost.</span>' : '<span class="c-g">No data lost</span>: the DB already had every write; the cache will simply refill on misses.'), parts: [g({ C: 'bad' }, {}, {})].concat(state()) });
          } else {
            throw new Error('Unknown op "' + op + '". Use W k=v, R k, FLUSH, CRASH');
          }
        });
        frames.push({ narr: 'Summary for write-' + mode + ': <b>' + dbWrites + '</b> DB writes, <b>' + lat + ' ms</b> of write latency, <b>' + lost + '</b> lost update(s). Try the same ops with the other two modes and compare.', parts: [g({}, {}, {})].concat(state()) });
        return frames;
      }
    },
    examples: [
      { title: 'Choosing per data type in one app (social network)', html: `${H.table(['Data', 'Pattern', 'Why'], [['Profile & settings', 'write-through + TTL', 'user expects to see the change instantly; writes are rare'], ['Like / view counters', '<b>write-back</b> (INCR in Redis, flush every 5 s)', '100k increments/s on hot posts; losing 5 s of likes is OK'], ['Posts / comments', 'cache-aside (write-around)', 'many written posts are never re-read; avoid pollution'], ['Payments ledger', 'no write caching at all', 'DB transaction is the only source of truth']])}` },
      { title: 'Write coalescing math', html: `<p>A viral video gets <b>50,000 views/s</b>. Write-through = 50,000 DB writes/s on one row (row-lock contention, the DB melts). Write-back with a 1 s flush = <b>1 write/s</b> of <code>views = views + 50000</code>. That is a <b>50,000× reduction</b>. Worst case on a crash: lose ~1 s of views — invisible to users.</p>` },
      { title: 'Write-through failure handling', html: `<p>Write-through writes two systems — what if the DB write succeeds and the cache write fails (or the reverse)? Rule: <b>DB first</b>; if the cache write fails, <b>delete</b> the key (or let its TTL expire) and still return success. Never return success when only the cache has the data. If the DB write fails, do not touch the cache and return an error.</p>` },
      { title: 'Read-through with a loader (Caffeine, Java)', html: `<p>The app never sees misses — the cache calls the loader for you and also coalesces concurrent misses for the same key:</p>`, code: { lang: 'text', code: `LoadingCache<Long, User> users = Caffeine.newBuilder()
    .maximumSize(100_000)                       // bound memory (W-TinyLFU eviction)
    .expireAfterWrite(Duration.ofMinutes(5))    // TTL
    .refreshAfterWrite(Duration.ofMinutes(4))   // refresh-ahead for hot keys
    .build(id -> userRepository.findById(id));  // the loader = read-through
User u = users.get(42L);                        // hit, or loads exactly once` } }
    ],
    deepDive: `<p><b>Write-back durability options.</b> Pure in-memory write-back loses dirty data on a crash. Production systems narrow the window: Redis with <b>AOF</b> (<code>appendfsync everysec</code> loses ≤ 1 s), replicating dirty data to a replica before acknowledging, or writing the change to a durable <b>log</b> (Kafka) first and letting a consumer update the DB — the "log is the write-back buffer" pattern. Flushers must be idempotent (write absolute values or use dedup IDs) because a crash mid-flush means retries.</p>
<p><b>Ordering and consistency.</b> Write-back flushes may reorder writes across keys; if key B's meaning depends on key A (foreign keys, invariants), batch them in the same transaction. Reads that bypass the cache (analytics jobs reading the DB) see stale data until the flush — document the lag.</p>
<p><b>Write-through is not magic consistency.</b> Two concurrent writers can interleave "DB write, cache write" pairs (W1 DB, W2 DB, W2 cache, W1 cache → cache holds W1, DB holds W2). Fix with versioned values (only overwrite if newer version), or fall back to delete-on-write.</p>
<p><b>Hardware echo.</b> CPU L1/L2 caches are write-back with dirty bits and coherence protocols (MESI); the OS page cache is write-back, which is why databases call <code>fsync</code>. The same trade-off — speed vs. durability window — appears at every layer.</p>
<p><b>Read-through gotchas.</b> The cache library now needs DB access (a dependency and failure domain), negative results must be handled (cache "not found" briefly, see penetration), and loaders must time out so one slow DB call does not block every waiter.</p>`,
    aiEra: `<p><b>What AI changes:</b> frameworks (Spring Cache, Caffeine, DAX, Hibernate L2) already give you read-through and write-through with an annotation, and AI tools will add <code>@Cacheable</code> everywhere if you let them. The real decision — <i>which</i> write policy per data type, and what loss window is acceptable — is a product and risk decision that AI cannot make for you.</p>
<p><b>Use AI as a partner:</b> <code>Here are my entities and their read/write ratios and freshness needs. Propose a write policy for each and the failure mode of each choice.</code> Then challenge it: <code>What happens to the like counter if the Redis primary fails over before AOF fsync?</code></p>
<p><b>Where AI goes wrong:</b> suggests write-back for anything "high write volume" including orders or payments; forgets that write-through to two systems is not atomic; adds <code>@CachePut</code> on methods whose return value differs from what is stored. In LLM systems, conversation memory stores often silently act as write-back buffers — know where the durable copy lives.</p>
<p><b>What you must still own:</b> the data-loss budget, idempotent flushers, and the decision of where the source of truth is.</p>`,
    problems: [{
      title: 'Pick a Write Policy for Three Features', level: 'Medium', tags: ['write-through', 'write-back', 'write-around'], companies: ['Meta', 'Twitter/X', 'LinkedIn'],
      statement: `<p>You run a short-video app. Choose and justify a caching strategy for: <b>(a)</b> the per-video view counter (2M increments/s globally, top video 80k/s), <b>(b)</b> the user's privacy settings (rare writes, must apply immediately), <b>(c)</b> uploaded video metadata (1k writes/s, 60% of uploads get &lt; 10 views ever).</p>`,
      constraints: `<p>DB can handle ~20k writes/s per shard. View counts may lag by a few seconds and may lose ≤ 5 s of data on a crash. Privacy changes must never be lost and must apply on the next request.</p>`,
      example: `<p>Hot video: 80k increments/s. ${H.c('r', 'Write-through')} → 80k row updates/s on one row (lock contention). ${H.c('g', 'Write-back + 1 s flush')} → 1 update/s: <code>views += 80000</code>.</p>`,
      brute: { why: `<p><b>Naive design:</b> one policy for everything, e.g. write-through everywhere. The view counter hammers a single DB row 80k times/s (impossible), and metadata for never-viewed uploads fills cache memory. Or write-back everywhere: a Redis crash silently loses someone's "make my account private" change — a privacy incident.</p>` },
      mcq: { q: 'Which feature is the best fit for write-back?', options: ['Privacy settings', 'View counter', 'Payment status', 'Password hash'], answer: 1, explain: 'Counters tolerate a small loss window and benefit hugely from coalescing many increments into one write.' },
      hints: [`<p>Hint 1: Ask for each feature: how often is it written, how soon is it read after writing, and what does losing a write cost?</p>`, `<p>Hint 2: Counters → Redis <code>INCRBY</code> + periodic flush. Must-not-lose + read-immediately → DB first then cache (write-through or delete). Rarely re-read → write-around.</p>`, `<p>Hint 3: Shard hot counters (<code>views:42:{0..15}</code>) to avoid one hot Redis key; make the flusher idempotent; give every cached value a TTL as a safety net.</p>`],
      solution: {
        approach: `<p><b>(a) View counter → write-back.</b> Each view does <code>INCR views:{video}</code> in Redis (≈ 0.2 ms). A flusher every 1–5 s reads-and-resets the counters (<code>GETDEL</code> or a Lua script) and runs <code>UPDATE videos SET views = views + :delta</code> in batches. 2M increments/s become a few thousand DB updates/s. For an 80k/s video, split the key into 16 sub-counters to spread load across Redis shards. Enable AOF everysec so a crash loses ≤ ~1 s. Display counts read Redis + DB sum (or just the DB value, lagging seconds).</p>
<p><b>(b) Privacy settings → write-through (DB first).</b> Commit to the DB in a transaction; then set (or delete) the cache key; only then acknowledge. Reads use read-through with a TTL. Because writes are rare, the extra latency does not matter, and the next request sees the new setting. If the cache update fails, delete the key so the next read reloads from the DB.</p>
<p><b>(c) Video metadata → write-around (cache-aside).</b> Write to the DB, do not populate the cache. The first view triggers a miss and caches it with a TTL; never-viewed uploads never consume cache memory. Optionally pre-warm metadata for uploads by creators with millions of followers.</p>`,
        complexity: `<p>(a) DB writes drop from O(views) to O(videos touched per flush interval). (b) each write = 1 DB txn + 1 cache op. (c) zero cache cost until first read.</p>`,
        followUps: ['How do you show an "approximately live" count while the flush lags?', 'What if the flusher crashes halfway through a batch?', 'How would you make (b) consistent across regions?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Eviction: LRU, LFU, FIFO, Random (+ TTL-aware)
     ===================================================================== */
  function parseCapSeq(input, example) {
    var s = String(input || '').split('|');
    if (s.length !== 2) throw new Error('Format: capacity | keys   e.g. ' + example);
    var cap = parseInt(s[0], 10);
    if (!(cap >= 1 && cap <= 6)) throw new Error('Capacity must be 1–6');
    var seq = s[1].trim().split(/[\s,]+/).filter(Boolean);
    if (!seq.length || seq.length > 16) throw new Error('Give 1–16 keys');
    return { cap: cap, seq: seq };
  }
  topics.push({
    title: 'Eviction Policies: LRU, LFU, FIFO, Random',
    analogy: `<p>Your <b>fridge</b> is full and you just bought milk. Something has to go. <b>LRU</b> (Least Recently Used): throw out the thing you have not touched for the longest time — that jar at the back. <b>LFU</b> (Least Frequently Used): throw out the thing you use least often overall, even if you touched it yesterday. <b>FIFO</b>: throw out whatever went in first. <b>Random</b>: close your eyes and grab something. A cache has the same problem: memory is limited, so when it is full, a new item must push an old one out.</p>`,
    explain: `<p>A cache is <b>smaller</b> than the data behind it, so it must decide what to forget. That rule is the <b>eviction policy</b>. A good policy keeps the items most likely to be asked for next.</p>
${H.table(['Policy', 'Evicts', 'Good at', 'Weak at'], [['<b>LRU</b>', 'the item untouched for the longest time', 'recency: "recently used → used again soon"', '<span class="c-r">scans</span>: one big one-off scan flushes all hot items'], ['<b>LFU</b>', 'the item with the fewest hits', 'stable popularity (a top-100 list)', 'old popular items never leave unless counts decay; new items die young'], ['<b>FIFO</b>', 'the oldest inserted item', 'simple, no bookkeeping on hits', 'ignores popularity completely'], ['<b>Random</b>', 'a random item', 'zero overhead, surprisingly OK', 'can evict the hottest item'], ['<b>TTL-based</b>', 'items closest to expiry (<code>volatile-ttl</code>)', 'data with natural lifetimes', 'needs TTLs on keys']])}
<p><b>LRU in O(1):</b> combine a <b>HashMap</b> (key → node, for instant lookup) with a <b>doubly linked list</b> ordered by recency (most recent at the head). On every hit, unlink the node and move it to the head. On insert when full, remove the <b>tail</b> (least recent) and delete it from the map. Every step is O(1).</p>
${H.arr(['E', 'A', 'B', 'D'], { label: 'list after accesses … (head = most recent → tail = evict next)', hl: { 0: 'g', 3: 'r' } })}
<p><b>LFU</b> keeps a counter per key and evicts the smallest count (ties broken by least recent). An O(1) version keeps a map from <i>frequency</i> → list of keys plus the current minimum frequency.</p>
<p><b>What real systems do:</b></p>
<ul><li><b>Redis</b> (<code>maxmemory-policy</code>): <code>noeviction</code> (default — writes fail when full!), <code>allkeys-lru</code>, <code>allkeys-lfu</code>, <code>volatile-lru/lfu/random/ttl</code> (only keys with a TTL), <code>allkeys-random</code>. Its LRU is <b>approximated</b>: it samples a few keys (<code>maxmemory-samples 5</code>) and evicts the oldest of the sample — no linked list, almost no memory overhead.</li>
<li><b>Memcached</b>: per-slab-class <b>segmented LRU</b> (hot / warm / cold queues) so one-time items do not push out repeat items.</li>
<li><b>Caffeine</b> (Java): <b>W-TinyLFU</b> — a small LRU "window" for newcomers plus a frequency sketch that only admits a new item if it is more popular than the victim. Near-optimal hit rates.</li></ul>`,
    clues: ['"design an LRU cache with O(1) get and put" → HashMap + doubly linked list', '"cache is full" / "memory limit" → you must name an eviction policy', '"popular items stay popular for days" (top songs, trending products) → LFU / TinyLFU', '"a nightly batch job scans every row and our hit rate collapses" → scan-resistant policy (SLRU, 2Q, W-TinyLFU)', '"Redis started returning OOM errors on writes" → maxmemory-policy is noeviction', '"keys have natural lifetimes" → TTL + volatile-* policy'],
    code: [{ lang: 'java', title: 'LRU cache from scratch: HashMap + doubly linked list', code: `class LRUCache {
    // One node per cached key. prev/next form the recency list.
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int k, int v) { key = k; val = v; }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    // Sentinels: head.next = most recently used, tail.prev = least recently used.
    private final Node head = new Node(0, 0), tail = new Node(0, 0);

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;      // miss
        moveToFront(n);                // a hit makes it "most recent"
        return n.val;
    }

    void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) {               // update existing key
            n.val = value;
            moveToFront(n);
            return;
        }
        if (map.size() == capacity) {  // full: evict least recent (tail.prev)
            Node lru = tail.prev;
            unlink(lru);
            map.remove(lru.key);
        }
        Node fresh = new Node(key, value);
        map.put(key, fresh);
        addAfterHead(fresh);
    }

    private void moveToFront(Node n) { unlink(n); addAfterHead(n); }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addAfterHead(Node n) {
        n.next = head.next; n.prev = head;
        head.next.prev = n; head.next = n;
    }

    public static void main(String[] args) {
        LRUCache c = new LRUCache(2);
        c.put(1, 1); c.put(2, 2);
        System.out.println(c.get(1));  // 1  (1 is now most recent)
        c.put(3, 3);                   // evicts key 2
        System.out.println(c.get(2));  // -1
    }
}` }, { lang: 'java', title: 'LRU in 6 lines with LinkedHashMap (access order)', code: `class LruMap<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    LruMap(int capacity) {
        super(16, 0.75f, true);        // true = order by ACCESS, not insertion
        this.capacity = capacity;
    }
    @Override
    protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
        return size() > capacity;      // auto-evict the least recently accessed
    }
}` }, { lang: 'python', run: true, title: 'LRU vs LFU hit rates on the same trace (runnable)', code: `from collections import OrderedDict, defaultdict

def lru_hits(trace, cap):
    cache, hits = OrderedDict(), 0
    for k in trace:
        if k in cache:
            hits += 1
            cache.move_to_end(k)          # most recent at the end
        else:
            if len(cache) == cap:
                cache.popitem(last=False) # evict least recent (front)
            cache[k] = True
    return hits

def lfu_hits(trace, cap):
    freq, last, hits = defaultdict(int), {}, 0
    cache = set()
    for t, k in enumerate(trace):
        if k in cache:
            hits += 1
        else:
            if len(cache) == cap:
                # smallest frequency, ties -> least recently used
                victim = min(cache, key=lambda x: (freq[x], last[x]))
                cache.remove(victim)
            cache.add(k)
        freq[k] += 1
        last[k] = t
    return hits

hot = ["A", "B"] * 6                       # two popular keys
scan = [f"s{i}" for i in range(6)]        # a one-off scan of cold keys
trace = hot[:6] + scan + hot[6:]
print("trace:", " ".join(trace))
for cap in (2, 3, 4):
    print(f"cap={cap}: LRU hits={lru_hits(trace, cap):2}  LFU hits={lfu_hits(trace, cap):2}")` }],
    codeTitle: ['LRU from scratch (Java)', 'LinkedHashMap shortcut (Java)', 'LRU vs LFU on a scan (Python)'],
    viz: [{
      title: 'LRU eviction: linked list (recency) + hash map (lookup)',
      input: '3 | A B C A D A B E A',
      inputLabel: 'capacity (1–6) | keys accessed in order',
      gen: function (input) {
        var p = parseCapSeq(input, '3 | A B C A D B E A C'), cap = p.cap, seq = p.seq;
        var list = [], hits = 0, misses = 0, evicted = [], frames = [];
        function mp(hlKey, cls) { var h = {}; if (hlKey) h[hlKey] = cls; return { type: 'map', label: 'HashMap key → node position', entries: list.map(function (k, i) { return [k, 'node #' + i + (i === 0 ? ' (MRU)' : i === list.length - 1 ? ' (LRU)' : '')]; }), hl: h }; }
        function ls(hl, ptr) { return { type: 'list', label: 'Doubly linked list: head (most recent) → tail (least recent)', values: list.slice(), hl: hl || {}, ptr: ptr || {} }; }
        function vs() { return { type: 'vars', label: 'Stats', vals: { capacity: cap, size: list.length, hits: hits, misses: misses, evicted: evicted.join(' ') || '—' } }; }
        frames.push({ narr: 'Empty LRU cache with capacity <b>' + cap + '</b>. The <b>map</b> finds a key in O(1); the <b>list</b> remembers recency so we know who to evict in O(1).', parts: [ls(), mp(), vs()] });
        seq.forEach(function (k, step) {
          var at = list.indexOf(k);
          if (at >= 0) {
            hits++;
            var h = {}; h[at] = 'ok'; var pt = {}; pt[at] = 'hit';
            frames.push({ narr: 'Access <b>' + k + '</b>: found in the map → <span class="c-g">HIT</span> at list position ' + at + '. Unlink it and move it to the head (it is now the most recent).', parts: [ls(h, pt), mp(k, 'ok'), vs()] });
            list.splice(at, 1); list.unshift(k);
            frames.push({ narr: '<b>' + k + '</b> moved to the head. Everyone it passed slides one step toward the tail.', parts: [ls({ 0: 'ok' }, { 0: 'head' }), mp(k, 'ok'), vs()] });
          } else {
            misses++;
            if (list.length === cap) {
              var victim = list[list.length - 1], hb = {}, pb = {};
              hb[list.length - 1] = 'bad'; pb[list.length - 1] = 'tail';
              frames.push({ narr: 'Access <b>' + k + '</b>: <span class="c-r">MISS</span> and the cache is full. The tail <b>' + victim + '</b> is the least recently used → evict it from the list <i>and</i> the map.', parts: [ls(hb, pb), mp(victim, 'bad'), vs()] });
              list.pop(); evicted.push(victim);
            } else {
              frames.push({ narr: 'Access <b>' + k + '</b>: <span class="c-r">MISS</span>. There is free space (' + list.length + '/' + cap + '), so no eviction needed.', parts: [ls(), mp(), vs()] });
            }
            list.unshift(k);
            frames.push({ narr: 'Load <b>' + k + '</b> from the DB and insert it at the head + add it to the map (step ' + (step + 1) + ' of ' + seq.length + ').', parts: [ls({ 0: 'ok' }, { 0: 'head' }), mp(k, 'ok'), vs()] });
          }
        });
        frames.push({ narr: 'Finished: <b>' + hits + '</b> hits, <b>' + misses + '</b> misses (hit rate ' + pct(hits, hits + misses) + '). Evicted in order: ' + (evicted.join(', ') || 'nothing') + '.', parts: [ls(), mp(), vs(), { type: 'bars', label: 'hits vs misses', values: [hits, misses], idxLabels: ['hits', 'misses'], hl: { 0: 'ok', 1: 'bad' } }] });
        return frames;
      }
    }, {
      title: 'LFU eviction: evict the smallest frequency (ties → least recent)',
      input: '3 | A A A B C B D A E C',
      inputLabel: 'capacity (1–6) | keys accessed in order',
      gen: function (input) {
        var p = parseCapSeq(input, '3 | A A A B C B D A E'), cap = p.cap, seq = p.seq;
        var freq = {}, last = {}, cache = [], hits = 0, misses = 0, frames = [];
        function parts(hlKey, cls, note) {
          var hm = {}; if (hlKey) hm[hlKey] = cls;
          var hb = {}; if (hlKey && cache.indexOf(hlKey) >= 0) hb[cache.indexOf(hlKey)] = cls;
          return [{ type: 'map', label: 'key → hit count (freq)', entries: cache.map(function (k) { return [k, freq[k]]; }), hl: hm },
            { type: 'bars', label: 'frequency per cached key', values: cache.map(function (k) { return freq[k]; }), idxLabels: cache.slice(), hl: hb },
            { type: 'vars', label: 'Stats', vals: { capacity: cap, hits: hits, misses: misses, note: note || '' } }];
        }
        frames.push({ narr: 'LFU keeps a <b>counter</b> per key. When full, it evicts the key with the <b>lowest count</b>; if two tie, the one used longest ago.', parts: parts() });
        seq.forEach(function (k, t) {
          if (cache.indexOf(k) >= 0) {
            hits++; freq[k]++; last[k] = t;
            frames.push({ narr: 'Access <b>' + k + '</b>: <span class="c-g">HIT</span>, its count rises to <b>' + freq[k] + '</b>.', parts: parts(k, 'ok', 'hit') });
          } else {
            misses++;
            if (cache.length === cap) {
              var victim = cache.slice().sort(function (a, b) { return freq[a] - freq[b] || last[a] - last[b]; })[0];
              frames.push({ narr: 'Access <b>' + k + '</b>: <span class="c-r">MISS</span>, cache full. Lowest count is <b>' + victim + '</b> (freq ' + freq[victim] + ') → evict it. Note LRU might have chosen differently.', parts: parts(victim, 'bad', 'evict ' + victim) });
              cache.splice(cache.indexOf(victim), 1);
            }
            cache.push(k); freq[k] = 1; last[k] = t;
            frames.push({ narr: 'Insert <b>' + k + '</b> with count 1. (Real LFU caches let counts <b>decay</b> over time so yesterday\'s hits do not protect a key forever.)', parts: parts(k, 'ok', 'inserted') });
          }
        });
        frames.push({ narr: 'Done: ' + hits + ' hits, ' + misses + ' misses (hit rate ' + pct(hits, hits + misses) + '). Heavy hitters like the most-accessed key survive even when other keys were touched more recently.', parts: parts() });
        return frames;
      }
    }],
    examples: [
      { title: 'Hand-trace LRU, capacity 3', html: `<p>Accesses: <code>A B C A D B</code></p>${H.table(['Access', 'Result', 'List (MRU → LRU)', 'Evicted'], [['A', '<span class="c-r">miss</span>', 'A', ''], ['B', '<span class="c-r">miss</span>', 'B A', ''], ['C', '<span class="c-r">miss</span>', 'C B A', ''], ['A', '<span class="c-g">hit</span>', 'A C B', ''], ['D', '<span class="c-r">miss</span>', 'D A C', '<b>B</b>'], ['B', '<span class="c-r">miss</span>', 'B D A', '<b>C</b>']])}<p>Hit rate = 1/6. Small caches + many distinct keys = low hit rates; capacity matters.</p>` },
      { title: 'The scan problem (why LRU alone is not enough)', html: `<p>Hot keys A and B are used constantly. A report job reads 1 million cold rows once. Under pure LRU each cold row becomes "most recent" and pushes A and B out → hit rate collapses until the job ends. ${H.c('g', 'Segmented LRU / 2Q')} put newcomers in a probation segment; only a <b>second</b> hit promotes them to the protected segment, so a one-pass scan never displaces the hot set. W-TinyLFU goes further: a newcomer is admitted only if it is more frequent than the victim.</p>` },
      { title: 'Redis approximate LRU', html: `<p>Real LRU needs two pointers per key (16 bytes × 100M keys = 1.6 GB of pointers!). Redis instead stores a 24-bit "last access clock" per object and, on eviction, <b>samples</b> <code>maxmemory-samples</code> keys (default 5) and evicts the oldest of the sample, keeping a small pool of good candidates between rounds. With 10 samples it is almost indistinguishable from true LRU at a fraction of the memory.</p>` },
      { title: 'Choosing a Redis policy', html: `${H.table(['Situation', 'maxmemory-policy'], [['Pure cache, all keys disposable', '<code>allkeys-lru</code> (or <code>allkeys-lfu</code> for skewed popularity)'], ['Same Redis also holds data that must not be evicted (keys without TTL)', '<code>volatile-lru</code> — only evicts keys with a TTL'], ['Redis used as a primary store / queue', '<code>noeviction</code> — fail writes loudly instead of losing data'], ['Uniform access, want minimum CPU', '<code>allkeys-random</code>']])}` }
    ],
    deepDive: `<p><b>Optimal is impossible, but measurable.</b> Bélády's MIN algorithm (evict the item whose next use is furthest in the future) is the provably optimal policy — it needs to see the future, so it is only used offline to measure how far your policy is from perfect on a recorded trace.</p>
<p><b>LFU details.</b> Raw counts overflow and never forget. Redis LFU uses an 8-bit <b>logarithmic (Morris) counter</b>: the more hits a key already has, the less likely each new hit increments it (<code>lfu-log-factor</code>), so 255 can represent millions of hits; counts are halved every <code>lfu-decay-time</code> minutes so popularity fades. Caffeine uses a <b>Count-Min Sketch</b> with periodic halving ("aging"), costing ~8 bytes per entry for frequency info on keys that are not even in the cache.</p>
<p><b>Adaptive policies.</b> <b>ARC</b> (Adaptive Replacement Cache, used in ZFS) keeps two LRU lists (seen once / seen twice) plus "ghost" lists of recently evicted keys and adapts the split between recency and frequency automatically. <b>LIRS</b> and <b>W-TinyLFU</b> beat LRU on most real traces by 5–20 percentage points of hit rate.</p>
<p><b>Concurrency.</b> A textbook LRU list is a global mutable structure — every <i>read</i> moves a node, so every read needs a lock. High-performance caches avoid that: Caffeine records reads in lock-free ring buffers and replays them in batches; Memcached bumps an item at most once every 60 s; Redis is single-threaded per shard and uses sampling.</p>
<p><b>Size-aware eviction.</b> Evicting one 1 MB value frees as much as 1,000 small ones. Policies like GDSF weigh hit value against size; Memcached's slab classes isolate sizes (but can suffer "slab calcification", fixed by the slab rebalancer).</p>`,
    aiEra: `<p><b>What AI changes:</b> "Implement an LRU cache" is now a solved autocomplete — any assistant produces the HashMap + doubly-linked-list version instantly. Interviewers therefore push on the <b>why</b>: scan resistance, concurrency, memory overhead per entry, and why Redis samples instead. In LLM serving, eviction is back in a new form: the <b>KV-cache</b> of attention states and <b>prefix caches</b> (vLLM PagedAttention, prompt caching) evict blocks with LRU-like policies, and semantic caches evict by recency and similarity.</p>
<p><b>Use AI as a partner:</b> <code>Simulate LRU, LFU and FIFO with capacity 1000 on this access log and report hit rates</code> — a fast way to pick a policy from real data. Ask it for adversarial traces that break each policy.</p>
<p><b>Where AI goes wrong:</b> forgets to remove the evicted key from the map (memory leak), uses a singly linked list (O(N) removal), recommends LFU without decay, or claims Redis implements exact LRU.</p>
<p><b>What you must still own:</b> the access pattern of <i>your</i> data, the memory budget, and verifying hit rate in production metrics after the change.</p>`,
    problems: [{
      title: 'LRU Cache with O(1) Operations', level: 'Medium', tags: ['LRU', 'hash map', 'linked list'], companies: ['Amazon', 'Google', 'Microsoft', 'Uber'],
      statement: `<p>Design a data structure for an in-process cache with a fixed <code>capacity</code>. <code>get(key)</code> returns the value or -1; <code>put(key, value)</code> inserts or updates and, when full, evicts the <b>least recently used</b> key. Both must run in O(1) average time. Then explain how you would make it safe for many threads.</p>`,
      constraints: `<p>1 ≤ capacity ≤ 3000 · up to 2·10<sup>5</sup> calls · keys and values are ints.</p>`,
      example: `<p>cap = 2: put(1,1), put(2,2), get(1) → ${H.c('g', '1')}, put(3,3) evicts ${H.c('r', 'key 2')} (1 was used more recently), get(2) → ${H.c('r', '-1')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> store entries in an array with a "last used" timestamp and scan for the minimum on eviction → O(N) per put. Or keep a list and move items by searching → O(N) per get. At 2·10<sup>5</sup> calls × 3000 entries that is 6·10<sup>8</sup> steps.</p>`, code: { lang: 'python', code: `class SlowLRU:
    def __init__(self, cap):
        self.cap, self.order, self.vals = cap, [], {}
    def get(self, k):
        if k not in self.vals:
            return -1
        self.order.remove(k)      # O(N) search + shift
        self.order.append(k)
        return self.vals[k]
    def put(self, k, v):
        if k in self.vals:
            self.order.remove(k)
        elif len(self.vals) == self.cap:
            old = self.order.pop(0)   # O(N) shift
            del self.vals[old]
        self.vals[k] = v
        self.order.append(k)` } },
      mcq: { q: 'Why a DOUBLY linked list rather than a singly linked one?', options: ['To save memory', 'So a node can unlink itself in O(1) given only a pointer to it', 'Because Java requires it', 'To sort keys'], answer: 1, explain: 'With prev pointers we can remove any node (found via the map) without walking from the head.' },
      hints: [`<p>Hint 1: You need two things at once — find a key fast (hash map) and know the oldest key fast (an ordered structure).</p>`, `<p>Hint 2: Map key → node in a doubly linked list ordered by recency. Use dummy head/tail sentinels to avoid null checks.</p>`, `<p>Hint 3: get: lookup, move node to head. put: update+move, or (if full) remove tail.prev from list and map, then add new node at head. For threads: one lock is simplest; at scale stripe or buffer reads (Caffeine).</p>`],
      solution: {
        approach: `<p>Keep a <code>HashMap&lt;key, Node&gt;</code> and a doubly linked list with sentinel <code>head</code>/<code>tail</code>. The node right after head is most recent; the node before tail is least recent.</p>
<ul><li><b>get:</b> look up the node; if absent return -1; else unlink it and re-insert after head; return value.</li>
<li><b>put:</b> if present, update value and move to head. Else if size == capacity, remove <code>tail.prev</code> from the list and its key from the map; create a node, insert after head, put in the map.</li></ul>
<p><b>Thread safety:</b> the simplest correct option is a single <code>ReentrantLock</code> (or <code>synchronized</code>) around get/put, because even <code>get</code> mutates the list. For high concurrency, shard the cache into N independent LRUs by <code>hash(key) % N</code> (striping), or use Caffeine, which buffers read events and applies them in batches without blocking readers.</p>`,
        code: { lang: 'java', code: `class LRU {
    private static class Node { int k, v; Node p, n; Node(int k, int v) { this.k = k; this.v = v; } }
    private final int cap;
    private final Map<Integer, Node> m = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);
    LRU(int cap) { this.cap = cap; head.n = tail; tail.p = head; }
    private void unlink(Node x) { x.p.n = x.n; x.n.p = x.p; }
    private void front(Node x) { x.n = head.n; x.p = head; head.n.p = x; head.n = x; }
    public synchronized int get(int k) {
        Node x = m.get(k);
        if (x == null) return -1;
        unlink(x); front(x);
        return x.v;
    }
    public synchronized void put(int k, int v) {
        Node x = m.get(k);
        if (x != null) { x.v = v; unlink(x); front(x); return; }
        if (m.size() == cap) { Node old = tail.p; unlink(old); m.remove(old.k); }
        x = new Node(k, v); m.put(k, x); front(x);
    }
}` },
        complexity: `<p>O(1) average per get/put; O(capacity) memory (each entry: map slot + node with 2 pointers).</p>`,
        followUps: ['Add a per-key TTL', 'Make it LFU instead (O(1))', 'How does Redis avoid storing the linked list at all?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — TTL, Expiry & Cache Invalidation
     ===================================================================== */
  topics.push({
    title: 'TTL, Expiry & Cache Invalidation',
    analogy: `<p>Milk has a <b>"best before" date</b> (a TTL): after that day you throw it away, even if it still looks fine. That is the lazy, automatic way to stay fresh. But if the shop calls you and says <b>"that batch was bad — throw it out now"</b>, you do not wait for the date. That phone call is <b>explicit invalidation</b>. Good caching uses both: the date as a safety net, the phone call for changes that matter right away.</p>`,
    explain: `<p>Every cached value is a <b>copy</b>. The moment the database changes, the copy may be wrong ("stale"). <b>Cache invalidation</b> is the job of removing or fixing those copies. It is famously one of the "two hard things in computer science" because copies live in many places and changes happen concurrently.</p>
<p><b>1. TTL (time-to-live).</b> Store every key with an expiry: <code>SET user:42 … EX 300</code>. After 300 s the key disappears and the next read reloads it. TTL gives <b>bounded staleness</b>: data is never more than 300 s old. Short TTL = fresher but more misses; long TTL = more hits but staler.</p>
${H.table(['TTL', 'Max staleness', 'Misses per hot key per hour', 'Typical use'], [['5 s', '5 s', '720', 'stock prices on a dashboard, live scores'], ['60 s', '1 min', '60', 'product pages, feeds'], ['1 h', '1 h', '1', 'config, country lists, rendered static pages'], ['none', 'forever', '0', '<span class="c-r">dangerous</span> unless invalidated explicitly']])}
<p><b>How Redis expires keys:</b> <i>lazily</i> (when you touch an expired key it is deleted and you get a miss) and <i>actively</i> (about 10 times a second it samples ~20 keys with TTLs and deletes expired ones, repeating if more than 25% were expired). So memory is reclaimed even for keys nobody reads again.</p>
<p><b>2. Explicit invalidation on write.</b> When the app writes the DB it deletes the affected keys (<code>DEL user:42</code>). Fresh within milliseconds — but you must remember <i>every</i> key derived from that row (profile, "friends of 42" lists, search snippets…).</p>
<p><b>3. Event-driven invalidation (CDC).</b> Instead of trusting every code path to delete keys, a <b>change-data-capture</b> process (e.g. Debezium) tails the database's commit log, publishes "row user 42 changed" to Kafka, and an invalidator service deletes the matching keys. Catches writes from <i>any</i> service, script or migration.</p>
<p><b>4. Versioned keys.</b> Put a version in the key: <code>user:42:v7</code>. A write bumps the version stored in the DB row (or a tiny "version" key); readers build the key from the current version, so old entries are simply never read again and age out. Bumping a <b>namespace</b> version (<code>v3:</code> → <code>v4:</code>) invalidates a whole family of keys in one step.</p>
<p><b>Rule of thumb:</b> always set a TTL (safety net) <i>and</i> invalidate explicitly where freshness matters.</p>`,
    clues: ['"users must see their own update immediately" → explicit delete on write (+ read-your-writes)', '"data can be up to N seconds stale" → TTL = N seconds is enough', '"many services write to the same table" → CDC / event-driven invalidation', '"cache sometimes shows old data forever after a write" → missing TTL or the stale-set race', '"invalidate all cached product pages after a template change" → bump a namespace version', '"local in-memory caches on 200 servers" → pub/sub invalidation broadcast + short TTL'],
    code: [{ lang: 'python', run: true, title: 'The stale-set race, with and without leases (runnable)', code: `class Cache:
    """Cache with Facebook-style leases: a miss hands out a token,
    a DELETE invalidates outstanding tokens, and SET needs a valid token."""
    def __init__(self, use_leases):
        self.data, self.leases, self.next_token = {}, {}, 1
        self.use_leases = use_leases
    def get(self, k):
        if k in self.data:
            return self.data[k], None
        token = self.next_token
        self.next_token += 1
        self.leases[k] = token          # remember who is allowed to fill this key
        return None, token
    def set(self, k, v, token):
        if self.use_leases and self.leases.get(k) != token:
            return False                # lease was invalidated -> refuse stale fill
        self.data[k] = v
        self.leases.pop(k, None)
        return True
    def delete(self, k):
        self.data.pop(k, None)
        self.leases.pop(k, None)        # any in-flight filler is now invalid

def scenario(use_leases):
    db = {"user:1": "Old name"}
    c = Cache(use_leases)
    _, token = c.get("user:1")          # 1. reader misses, gets lease token
    stale = db["user:1"]                # 2. reader reads DB  -> "Old name"
    db["user:1"] = "New name"           # 3. writer updates DB
    c.delete("user:1")                  # 4. writer invalidates cache
    ok = c.set("user:1", stale, token)  # 5. slow reader tries to fill with OLD value
    value, _ = c.get("user:1")
    label = "with leases" if use_leases else "no leases  "
    print(f"{label}: late SET accepted={ok!s:5}  cache now holds={value!r}  db holds={db['user:1']!r}")

scenario(False)   # stale value stuck in cache until TTL
scenario(True)    # late fill rejected; next read loads the new value` }],
    codeTitle: ['Invalidation race + lease fix'],
    viz: [{
      title: 'TTL expiry timeline (lazy expiry + refill on read)',
      input: 'A ttl=4 set=0; B ttl=2 set=1; C ttl=6 set=2; read A 3; read B 4; read A 5; read C 7; read A 9',
      inputLabel: 'key ttl=N set=T; … ; read key T; …  (times 0–12)',
      gen: function (input) {
        var keys = [], meta = {}, reads = [];
        String(input || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (cl) {
          var m;
          if ((m = /^(\w+)\s+ttl=(\d+)\s+set=(\d+)$/i.exec(cl))) { if (keys.indexOf(m[1]) < 0) keys.push(m[1]); meta[m[1]] = { ttl: +m[2], set: +m[3] }; }
          else if ((m = /^read\s+(\w+)\s+(\d+)$/i.exec(cl))) reads.push({ k: m[1], t: +m[2] });
          else throw new Error('Could not parse "' + cl + '". Use "A ttl=4 set=0" or "read A 3"');
        });
        if (!keys.length || keys.length > 5) throw new Error('Define 1–5 keys like "A ttl=4 set=0"');
        var T = 12, frames = [], hits = 0, misses = 0;
        reads.forEach(function (r) { if (!meta[r.k]) throw new Error('read of unknown key ' + r.k); if (r.t > T) throw new Error('times must be ≤ 12'); });
        var setAt = {}, exp = {};
        keys.forEach(function (k) { if (meta[k].set > T) throw new Error('times must be ≤ 12'); });
        var cols = []; for (var c = 0; c <= T; c++) cols.push('t' + c);
        var rows = keys.map(function () { return cols.map(function () { return ''; }); });
        function grid(t, hl) { return { type: 'grid', label: 'Timeline (● live · ✕ expired · ↻ refilled on read)', rowHead: keys.slice(), colHead: cols, rows: rows.map(function (r) { return r.slice(); }), hl: hl }; }
        frames.push({ narr: 'Each key is cached at its <b>set</b> time with a <b>TTL</b>. It is live for TTL seconds, then expires. A read after expiry is a <span class="c-r">miss</span> that reloads the key and starts a new TTL.', parts: [grid(-1, {}), { type: 'vars', label: 'Stats', vals: { t: '—', hits: 0, misses: 0 } }] });
        for (var t = 0; t <= T; t++) {
          var hl = {}, notes = [];
          keys.forEach(function (k, r) {
            if (meta[k].set === t) { setAt[k] = t; exp[k] = t + meta[k].ttl; notes.push(k + ' cached (expires at t' + exp[k] + ')'); }
          });
          reads.filter(function (rd) { return rd.t === t; }).forEach(function (rd) {
            var r = keys.indexOf(rd.k);
            if (exp[rd.k] !== undefined && t < exp[rd.k]) { hits++; hl[r + ',' + t] = 'ok'; notes.push('read ' + rd.k + ' → <span class="c-g">hit</span>'); rows[r][t] = '● hit'; }
            else { misses++; hl[r + ',' + t] = 'bad'; exp[rd.k] = t + meta[rd.k].ttl; notes.push('read ' + rd.k + ' → <span class="c-r">miss</span> (expired or never set) → reload, new expiry t' + exp[rd.k]); rows[r][t] = '↻'; }
          });
          keys.forEach(function (k, r) {
            if (exp[k] === undefined) return;
            if (rows[r][t] === '') rows[r][t] = t < exp[k] ? '●' : '✕';
            if (!hl[r + ',' + t]) hl[r + ',' + t] = t < exp[k] ? 'win' : 'done';
            if (t === exp[k]) notes.push(k + ' <b>expired</b> (deleted lazily on access or by Redis\'s active sampler)');
          });
          for (var rr = 0; rr < keys.length; rr++) if (!hl[rr + ',' + t]) hl[rr + ',' + t] = 'cur';
          frames.push({ narr: '<b>t = ' + t + '</b>: ' + (notes.length ? notes.join('; ') : 'nothing happens — live keys tick toward expiry.'), parts: [grid(t, hl), { type: 'vars', label: 'Stats', vals: { t: t, hits: hits, misses: misses, 'hit rate': pct(hits, hits + misses) }, hl: {} }] });
        }
        frames.push({ narr: 'Summary: ' + hits + ' hit(s), ' + misses + ' miss(es). A longer TTL turns some ✕ cells into ● (more hits) but lets data be staler. Pick TTL = the staleness your product can tolerate.', parts: [grid(T, {}), { type: 'bars', label: 'TTL per key (seconds)', values: keys.map(function (k) { return meta[k].ttl; }), idxLabels: keys.slice() }] });
        return frames;
      }
    }, {
      title: 'The stale-set race: delete-on-write is not enough (and how leases fix it)',
      input: 'none',
      inputLabel: 'fix: none | lease',
      gen: function (input) {
        var fix = String(input || 'none').trim().toLowerCase();
        if (fix !== 'none' && fix !== 'lease') throw new Error('Type none or lease');
        var log = [], frames = [];
        function g(hl, ehl, lab) { return { type: 'graph', directed: true, height: 60, label: 'Two app requests racing', nodes: [box('R', 'Reader (slow)', 10, 12), box('W', 'Writer', 10, 50), box('C', 'Cache', 60, 12), box('D', 'Database', 60, 50)], edges: [['R', 'C', lab.rc || ''], ['R', 'D', lab.rd || ''], ['W', 'D', lab.wd || ''], ['W', 'C', lab.wc || '']], hl: hl, ehl: ehl }; }
        function tl(hlRow) { var h = {}; if (hlRow !== undefined) h[hlRow] = hlRow === log.length - 1 ? 'cur' : ''; return { type: 'table', label: 'Timeline', columns: ['step', 'who', 'action', 'cache', 'db'], rows: log.map(function (r) { return r.slice(); }), hl: h }; }
        function add(row) { log.push(row); return log.length - 1; }
        var i;
        i = add(['1', 'Reader', 'GET user:1 → miss' + (fix === 'lease' ? ' (gets lease #7)' : ''), '—', 'Old']);
        frames.push({ narr: 'The key just expired. The Reader misses' + (fix === 'lease' ? ' and the cache hands it <b>lease token #7</b>, meaning "you may fill this key".' : '.'), parts: [g({ R: 'cur', C: 'bad' }, { 'R-C': 'bad' }, { rc: 'GET → miss' }), tl(i)] });
        i = add(['2', 'Reader', 'SELECT → "Old"', '—', 'Old']);
        frames.push({ narr: 'The Reader queries the DB and gets <b>"Old"</b>. Then it gets paused (GC pause, slow network…).', parts: [g({ R: 'cur', D: 'cur' }, { 'R-D': 'cur' }, { rd: 'SELECT → Old' }), tl(i)] });
        i = add(['3', 'Writer', 'UPDATE → "New"', '—', 'New']);
        frames.push({ narr: 'Meanwhile the Writer commits <b>"New"</b> to the DB.', parts: [g({ W: 'cur', D: 'ok' }, { 'W-D': 'ok' }, { wd: 'UPDATE → New' }), tl(i)] });
        i = add(['4', 'Writer', 'DEL user:1' + (fix === 'lease' ? ' (lease #7 revoked)' : ''), '—', 'New']);
        frames.push({ narr: 'The Writer deletes the key (correct cache-aside behaviour)' + (fix === 'lease' ? ' — the delete also <b>revokes lease #7</b>.' : '. Nothing was cached, so this delete does nothing useful.'), parts: [g({ W: 'cur', C: 'cur' }, { 'W-C': 'cur' }, { wc: 'DEL user:1' }), tl(i)] });
        if (fix === 'none') {
          i = add(['5', 'Reader', 'SET user:1 = "Old"', '<span class="c-r">Old</span>', 'New']);
          frames.push({ narr: '<span class="c-r">The Reader wakes up and SETs "Old" into the cache.</span> The cache now disagrees with the DB.', parts: [g({ R: 'cur', C: 'bad' }, { 'R-C': 'bad' }, { rc: 'SET Old' }), tl(i)] });
          i = add(['6', 'Anyone', 'GET user:1 → "Old" (stale)', '<span class="c-r">Old</span>', 'New']);
          frames.push({ narr: 'Every reader now gets <b>stale "Old"</b> until the TTL expires. With no TTL, forever. This is why a TTL is a mandatory safety net. Re-run with <code>lease</code> to see the fix.', parts: [g({ C: 'bad' }, { 'R-C': 'bad' }, { rc: 'GET → Old (stale!)' }), tl(i)] });
        } else {
          i = add(['5', 'Reader', 'SET user:1 = "Old" with lease #7 → rejected', '—', 'New']);
          frames.push({ narr: '<span class="c-g">The late SET carries lease #7, which was revoked → the cache rejects it.</span> Stale data never enters.', parts: [g({ R: 'cur', C: 'ok' }, { 'R-C': 'ok' }, { rc: 'SET Old (#7) → refused' }), tl(i)] });
          i = add(['6', 'Anyone', 'GET → miss → SELECT "New" → SET', '<span class="c-g">New</span>', 'New']);
          frames.push({ narr: 'The next reader misses, loads <b>"New"</b>, and fills the cache with a fresh lease. Cache and DB agree. (Leases also rate-limit fills per key — a built-in stampede guard.)', parts: [g({ C: 'ok', D: 'ok' }, { 'R-C': 'ok', 'R-D': 'ok' }, { rc: 'SET New', rd: 'SELECT → New' }), tl(i)] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Picking a TTL from requirements', html: `<p>"Follower counts may lag by up to 30 s; profile bios by up to 5 min." → <code>followers:{id}</code> TTL 30 s, <code>bio:{id}</code> TTL 300 s. A hot profile read 2,000×/s with TTL 300 s is loaded ~once per 5 minutes: hit rate ≈ 1 − 1/(2000·300) ≈ <b>99.9998%</b>.</p>` },
      { title: 'Derived keys: the forgotten invalidation', html: `<p>User 42 changes her display name. Keys that contain it:</p>${H.chips(['user:42', 'profile_page:42', 'comments:post:9 (shows her name)', 'search:"asha"', 'followers_list:7 (shows her name)'], { label: 'keys to invalidate', hl: { 0: 'g', 1: 'g', 2: 'r', 3: 'r', 4: 'r' } })}<p>Red ones are easy to forget. Options: store only IDs in list caches and join names at read time from <code>user:{id}</code> (one key to invalidate), or accept a short TTL on the derived keys.</p>` },
      { title: 'CDC-based invalidation pipeline', html: `<p>${H.table(['Step', 'Component', 'What happens'], [['1', 'MySQL / Postgres', 'commit writes the binlog / WAL'], ['2', 'Debezium connector', 'reads the log: <code>{table: users, id: 42, op: UPDATE}</code>'], ['3', 'Kafka topic <code>db.users</code>', 'ordered per key, durable, replayable'], ['4', 'Invalidator service', 'maps row → keys, issues <code>DEL user:42 profile_page:42</code>']])}Even a manual SQL fix by an engineer invalidates the cache. Meta's <b>McSqueal</b> does exactly this across regions.</p>` },
      { title: 'Delayed double delete', html: `<p>A cheap mitigation for the stale-set race without leases: on write, <code>DEL key</code>, commit, then schedule a <b>second</b> <code>DEL key</code> ~500 ms later (longer than a typical read-then-set). Any stale value set in between is removed. It narrows the window rather than closing it — leases or versioned compare-and-set close it.</p>` }
    ],
    deepDive: `<p><b>Why invalidation is hard.</b> (1) <i>Concurrency</i>: reads and writes interleave across servers (the stale-set race above). (2) <i>Fan-out</i>: one row change affects many derived keys. (3) <i>Failure</i>: the DB commit succeeds but the DEL is lost (network blip, crash between the two). Because DB + cache is not one transaction, you need a reliable path: retry the DEL from a queue, use the <b>transactional outbox</b> (write an "invalidate" event in the same DB transaction) or CDC, and keep TTLs as the final net.</p>
<p><b>Read-your-writes.</b> Even with perfect invalidation, a replica-backed DB can serve the old row right after a write (replication lag) and re-cache it. Fixes: after a user writes, route <i>that user's</i> reads to the primary for a few seconds, or have the writer populate the cache with the value it just committed (versioned so it cannot overwrite something newer).</p>
<p><b>Version / CAS approach.</b> Store <code>{value, version}</code>; the DB row has a monotonically increasing version. Fillers use a Lua script "set only if new version &gt; cached version". Late fills with old versions are rejected — the same guarantee as leases without the token bookkeeping.</p>
<p><b>TTL tricks.</b> Add <b>jitter</b> (TTL 300 ± 30 s) so keys loaded together do not expire together (avalanche). Use <b>soft TTL + hard TTL</b>: after the soft TTL serve the stale value while one request refreshes in the background (stale-while-revalidate); after the hard TTL never serve it. HTTP has the same ideas: <code>Cache-Control: max-age=60, stale-while-revalidate=30</code>, and CDNs support purge by URL or by <b>surrogate key / cache tag</b> ("purge everything tagged product-42").</p>
<p><b>Expiry internals.</b> Redis stores expiry times in a separate dict; the active cycle samples 20 keys from it, deletes expired ones, and repeats while &gt; 25% were expired (bounded to ~25% CPU). Replicas do not expire keys themselves — they wait for the primary's <code>DEL</code>, but report expired keys as missing to readers.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI code generators readily add caching to a function but rarely add the matching invalidation on every write path — and invalidation bugs are silent (users just see old data). AI-era systems also cache <b>model outputs</b> and <b>embeddings</b>, whose "source of truth" changes when you change the prompt template or model version — so put the model and prompt version in the cache key (<code>emb:v3:text-embed-2026-05:{sha}</code>), exactly the versioned-key technique.</p>
<p><b>Use AI as a partner:</b> <code>Find every place in this repo that writes to the orders table and list the cache keys that must be invalidated; flag writes with no invalidation</code>. Or have it draft a CDC → Kafka → invalidator design and then ask it to enumerate failure cases.</p>
<p><b>Where AI goes wrong:</b> suggests "update cache then DB", omits TTLs, invents a <code>KEYS user:*</code> + DEL loop (KEYS blocks Redis — use SCAN, or better, versioned namespaces), or misses derived keys.</p>
<p><b>What you must still own:</b> the staleness budget for each data type, the inventory of derived keys, and the guarantee that a lost invalidation is eventually fixed (TTL, CDC replay).</p>`,
    problems: [{
      title: 'Stale Profile After Edit', level: 'Medium', tags: ['invalidation', 'TTL', 'race condition', 'CDC'], companies: ['Meta', 'LinkedIn', 'Airbnb'],
      statement: `<p>Support tickets say: "I changed my profile name, refreshed, and saw the <b>old</b> name — sometimes for hours." The service uses cache-aside: read Redis → miss → read a MySQL <b>read replica</b> → SET with <b>no TTL</b>. Writes go to the MySQL primary, then DEL the key. Find all the causes and redesign invalidation.</p>`,
      constraints: `<p>Replica lag p99 = 800 ms · 30k profile reads/s · 200 writes/s · other services (admin tool, GDPR job) also update the users table directly.</p>`,
      example: `<p>t=0 write primary "New" → t=1 ms DEL key → t=5 ms a read misses, hits the ${H.c('r', 'lagging replica')} → gets "Old" → SETs "Old" with ${H.c('r', 'no TTL')} → stale forever.</p>`,
      brute: { why: `<p><b>Naive fix:</b> "just delete the key twice" or "disable the cache for profiles". Double delete only narrows the window; disabling the cache sends 30k reads/s to MySQL. Neither addresses the admin tool and GDPR job, which never invalidate at all.</p>` },
      mcq: { q: 'Which single change guarantees stale entries cannot live forever?', options: ['Bigger Redis', 'A TTL on every key', 'Using write-back', 'Reading from more replicas'], answer: 1, explain: 'A TTL bounds staleness no matter which invalidation path failed.' },
      hints: [`<p>Hint 1: There are three independent bugs: replica lag re-caching old data, no TTL, and writers that never invalidate.</p>`, `<p>Hint 2: Bound staleness with TTL + jitter; close the race with leases or versioned compare-and-set; catch every writer with CDC.</p>`, `<p>Hint 3: For the editing user, guarantee read-your-writes: read from the primary (or a cached copy written by the writer) for a few seconds after their write.</p>`],
      solution: {
        approach: `<p><b>Root causes:</b> (1) the miss path reads a lagging replica after the DEL, re-caching "Old"; (2) no TTL, so a stale entry is permanent; (3) the admin tool and GDPR job update MySQL without invalidating.</p>
<p><b>Redesign:</b></p>
<ol><li><b>TTL on everything:</b> 10 min ± 10% jitter. Worst-case staleness is now bounded.</li>
<li><b>Versioned values:</b> add a <code>version</code> column incremented on every update. Cache stores <code>{name, version}</code>; fills use a Lua CAS "only set if version &gt; cached". A lagging replica returns an older version, which cannot overwrite a newer cached one; combined with delete-on-write and a short "tombstone" (<code>user:42 = DELETED@v8</code> for 2 s) the replica-lag re-fill is rejected.</li>
<li><b>CDC invalidation:</b> Debezium tails the primary binlog → Kafka <code>db.users</code> → invalidator DELs <code>user:{id}</code> and derived keys. Every writer, including scripts, is covered; the invalidator retries until success, and Kafka lets you replay after outages.</li>
<li><b>Read-your-writes for the editor:</b> after a write, set a short-lived cookie/flag so that user's profile reads go to the primary for 2 s (longer than p99 lag).</li></ol>
<p>Monitor: rate of CAS rejections, invalidation lag (commit time → DEL time), and a sampled "cache vs DB" consistency checker that compares random keys.</p>`,
        complexity: `<p>Extra cost: one Lua script per fill, one Kafka event per write (200/s — trivial), a few primary reads for recent editors. Staleness: ≤ invalidation lag (~100 ms) normally, ≤ TTL in the worst case.</p>`,
        followUps: ['How would you invalidate in 3 regions?', 'What if Kafka is down for 10 minutes?', 'How do you test for stale-cache bugs automatically?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Redis vs Memcached (and running them at scale)
     ===================================================================== */
  function crc16(s) {
    var crc = 0;
    for (var i = 0; i < s.length; i++) {
      crc ^= (s.charCodeAt(i) & 0xff) << 8;
      for (var j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc;
  }
  function hashPart(key) {
    var a = key.indexOf('{');
    if (a >= 0) { var b = key.indexOf('}', a + 1); if (b > a + 1) return key.substring(a + 1, b); }
    return key;
  }
  topics.push({
    title: 'Redis vs Memcached (and Running Them at Scale)',
    analogy: `<p><b>Memcached</b> is a giant wall of <b>numbered lockers</b>: you put a box in locker "user:42", you get the box back. Nothing more — but it is cheap, fast and many people can use it at once. <b>Redis</b> is a <b>workshop with smart shelves</b>: besides plain boxes it has ready-made counters, queues, sorted leaderboards, sets and timers, it can photocopy itself to a backup shelf, and it can even keep a diary so it remembers things after a power cut.</p>`,
    explain: `<p>Both are <b>in-memory key-value stores</b> reached over the network in well under a millisecond. Both are used as caches. They differ in how much they do.</p>
${H.table(['', 'Redis (and forks: Valkey, KeyDB, Dragonfly)', 'Memcached'], [['Values', 'strings, hashes, lists, sets, <b>sorted sets</b>, streams, bitmaps, HyperLogLog, geo, JSON, vectors', 'opaque strings/bytes only (default max item 1 MB)'], ['Atomic ops', '<code>INCR</code>, <code>ZADD</code>, <code>LPUSH</code>, Lua scripts / Functions, transactions (<code>MULTI</code>)', '<code>incr</code>/<code>decr</code>, <code>cas</code> (check-and-set)'], ['Threads', 'commands run on one main thread per instance (I/O threads help networking)', '<b>multi-threaded</b> — scales on one big box'], ['Persistence', 'RDB snapshots, AOF log (optional)', 'none — restart = empty'], ['Replication / HA', 'primary → replicas (async), Sentinel, <b>Redis Cluster</b> (16,384 hash slots)', 'none built in; clients shard with consistent hashing (mcrouter, ketama)'], ['Eviction', '8 policies incl. approximated LRU/LFU', 'segmented LRU per slab class'], ['Extras', 'pub/sub, streams, keyspace notifications, TTL per key', 'very lean, predictable memory']])}
<p><b>Pick Memcached when</b> you need a simple, huge, multi-threaded look-aside cache of blobs (rendered HTML fragments, serialized objects) and you are fine with losing it all on restart. Meta still runs enormous Memcached fleets.</p>
<p><b>Pick Redis (or Valkey) when</b> you need data structures (leaderboards with sorted sets, rate-limit counters, session stores, queues, distributed locks), replication and failover, persistence, or server-side atomic logic. It is the default choice in most interviews and most companies.</p>
<p><b>Licensing note (2026):</b> in 2024 Redis moved from BSD to source-available licences, and the Linux Foundation forked it as <b>Valkey</b> (now the default engine in several cloud offerings); Redis 8 added an AGPLv3 option in 2025. In a design interview, "Redis-compatible cache (Redis/Valkey, e.g. ElastiCache)" is the safe phrase.</p>
<p><b>Scaling Redis:</b> one instance does roughly 100k–1M simple ops/s. Beyond that, or beyond one machine's RAM, use <b>Redis Cluster</b>: the key space is cut into <b>16,384 slots</b>; <code>slot = CRC16(key) mod 16384</code>; each primary owns a range of slots and has replicas. Clients cache the slot map and get a <code>MOVED</code> redirect if it changes. Multi-key commands only work when all keys share a slot — force that with a <b>hash tag</b>: only the text inside <code>{…}</code> is hashed, so <code>{user:42}:cart</code> and <code>{user:42}:wishlist</code> live together.</p>`,
    clues: ['"leaderboard / top-K by score" → Redis sorted set (ZADD / ZREVRANGE)', '"rate limiter counters shared by all servers" → Redis INCR + EXPIRE (or Lua)', '"just cache rendered HTML blobs, losing them on restart is fine, need multi-core throughput" → Memcached is enough', '"cache must survive a node failure without a cold start" → Redis replicas + Sentinel/Cluster failover', '"dataset is 500 GB of hot data" → shard: Redis Cluster or client-side consistent hashing', '"atomically update two related keys" → same hash slot via {hash tag} + MULTI/Lua'],
    code: [{ lang: 'bash', title: 'Redis commands you will actually use (redis-cli)', code: `# Plain cache entry with a 5-minute TTL; NX = only if it does not exist yet
SET user:42 '{"name":"Asha","plan":"pro"}' EX 300
GET user:42
TTL user:42                       # seconds left (-2 = gone, -1 = no TTL)

# Counters (atomic, no read-modify-write race)
INCR views:video:9
EXPIRE views:video:9 3600

# Leaderboard with a sorted set
ZADD leaderboard 4200 asha 3900 ben 5100 chen
ZREVRANGE leaderboard 0 2 WITHSCORES   # top 3

# Hash: one key, many fields (memory efficient for small objects)
HSET session:abc user_id 42 cart_items 3
HGETALL session:abc

# Same slot in Redis Cluster thanks to the {hash tag}
MSET {user:42}:cart 3 {user:42}:wishlist 7
CLUSTER KEYSLOT {user:42}:cart        # same number as the line below
CLUSTER KEYSLOT {user:42}:wishlist

# Memory and eviction
CONFIG SET maxmemory 8gb
CONFIG SET maxmemory-policy allkeys-lfu
INFO stats                            # keyspace_hits / keyspace_misses / evicted_keys` }, { lang: 'python', title: 'Cache-aside with redis-py (needs a Redis server; compile-only here)', code: `import json
import random
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def get_user(user_id, db):
    key = f"v1:user:{user_id}"
    cached = r.get(key)
    if cached is not None:
        return json.loads(cached)                 # hit
    row = db.fetch_user(user_id)                  # miss -> source of truth
    if row is None:
        r.set(key, json.dumps(None), ex=30)       # short negative cache (penetration guard)
        return None
    ttl = 300 + random.randint(0, 30)             # jitter avoids synchronized expiry
    r.set(key, json.dumps(row), ex=ttl)
    return row

def rename_user(user_id, name, db):
    db.update_user_name(user_id, name)            # 1. commit to DB
    r.delete(f"v1:user:{user_id}")                # 2. invalidate` }, { lang: 'python', run: true, title: 'Compute Redis Cluster hash slots (runnable)', code: `def crc16_xmodem(data: bytes) -> int:
    """CRC16-CCITT (XMODEM) - the exact checksum Redis Cluster uses."""
    crc = 0
    for byte in data:
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return crc

def key_slot(key: str) -> int:
    # Hash tag: if the key has {something} with non-empty content, hash only that part
    start = key.find("{")
    if start != -1:
        end = key.find("}", start + 1)
        if end > start + 1:
            key = key[start + 1:end]
    return crc16_xmodem(key.encode()) % 16384

owners = [(0, 5460, "node-A"), (5461, 10922, "node-B"), (10923, 16383, "node-C")]
def owner(slot):
    return next(name for lo, hi, name in owners if lo <= slot <= hi)

print("sanity check: slot('123456789') =", key_slot("123456789"), "(Redis docs: 12739)")
for k in ["user:7", "user:2", "session:abc", "{user:7}:cart", "{user:7}:wishlist"]:
    s = key_slot(k)
    print(f"{k:20} slot {s:5} -> {owner(s)}")` }],
    codeTitle: ['redis-cli cheat sheet', 'redis-py cache-aside', 'Hash slot calculator'],
    viz: [{
      title: 'Redis Cluster routing: CRC16(key) mod 16384 → slot → node',
      input: 'user:7 user:2 session:abc {user:7}:cart {user:7}:wishlist product:9',
      inputLabel: 'Keys (space separated, ≤ 10). Try {tags}!',
      gen: function (input) {
        var keys = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!keys.length || keys.length > 10) throw new Error('Enter 1–10 keys separated by spaces');
        var ranges = [['A', 0, 5460], ['B', 5461, 10922], ['C', 10923, 16383]], frames = [], placed = { A: [], B: [], C: [] };
        function g(hl, ehl, lab) {
          return { type: 'graph', directed: true, height: 64, label: 'Client with cached slot map → 3 primaries (each with a replica)', nodes: [box('CL', 'Client', 8, 32), box('A', 'Primary A 0–5460', 52, 8), box('B', 'Primary B 5461–10922', 52, 32), box('C', 'Primary C 10923–16383', 52, 56), box('RA', 'Replica A', 90, 8), box('RB', 'Replica B', 90, 32), box('RC', 'Replica C', 90, 56)],
            edges: [['CL', 'A', lab.A || ''], ['CL', 'B', lab.B || ''], ['CL', 'C', lab.C || ''], ['A', 'RA', 'async'], ['B', 'RB', 'async'], ['C', 'RC', 'async']], hl: hl, ehl: ehl };
        }
        function mp(hlk) { var h = {}; if (hlk) h[hlk] = 'ok'; return { type: 'map', label: 'Which keys live where', entries: [['Primary A', placed.A.join(', ') || '—'], ['Primary B', placed.B.join(', ') || '—'], ['Primary C', placed.C.join(', ') || '—']], hl: h }; }
        frames.push({ narr: 'A Redis Cluster splits the key space into <b>16,384 slots</b>. Each primary owns a slot range and replicates asynchronously to its replica. The client keeps a copy of this slot map.', parts: [g({}, {}, {}), mp()] });
        keys.forEach(function (k) {
          var hp = hashPart(k), crc = crc16(hp), slot = crc % 16384, node = null;
          ranges.forEach(function (r) { if (slot >= r[1] && slot <= r[2]) node = r[0]; });
          frames.push({ narr: 'Key <b>' + H.esc(k) + '</b>: hash ' + (hp !== k ? 'only the hash tag <b>{' + H.esc(hp) + '}</b>' : 'the whole key') + ' → CRC16 = ' + crc + ' → ' + crc + ' mod 16384 = <b>slot ' + slot + '</b>.', parts: [g({ CL: 'cur' }, {}, {}), { type: 'vars', label: 'Routing math', vals: { key: k, 'hashed part': hp, crc16: crc, slot: slot }, hl: { slot: 'cur' } }, mp()] });
          placed[node].push(k);
          var hl = { CL: 'cur' }; hl[node] = 'ok'; var ehl = {}; ehl['CL-' + node] = 'ok'; var lab = {}; lab[node] = 'slot ' + slot;
          frames.push({ narr: 'Slot ' + slot + ' belongs to <b>Primary ' + node + '</b>, so the client sends the command straight there (one hop, no proxy). If the map were stale, the node would reply <code>MOVED ' + slot + '</code> and the client would retry and refresh its map.', parts: [g(hl, ehl, lab), mp('Primary ' + node)] });
        });
        frames.push({ narr: 'Keys sharing a <b>{hash tag}</b> land in the same slot, so <code>MGET</code>, <code>MULTI</code> and Lua scripts over them work. Keys without a shared tag may be on different nodes → <code>CROSSSLOT</code> error for multi-key commands.', parts: [g({}, {}, {}), mp(), { type: 'bars', label: 'keys per primary', values: [placed.A.length, placed.B.length, placed.C.length], idxLabels: ['A', 'B', 'C'] }] });
        return frames;
      }
    }, {
      title: 'Redis failover: async replication can lose the last writes',
      input: '3',
      inputLabel: 'writes not yet replicated when the primary dies (0–5)',
      gen: function (input) {
        var lag = parseInt(input, 10);
        if (!(lag >= 0 && lag <= 5)) throw new Error('Enter a number 0–5');
        var frames = [], prim = [], repl = [];
        function g(hl, ehl, lab) { return { type: 'graph', directed: true, height: 56, label: 'Primary + replica + Sentinel quorum', nodes: [box('APP', 'App', 8, 28), box('P', 'Primary', 45, 12), box('R', 'Replica', 45, 46), box('S', 'Sentinels ×3', 88, 28)], edges: [['APP', 'P', lab.ap || 'writes'], ['P', 'R', lab.pr || 'async repl'], ['S', 'P', lab.sp || 'PING'], ['S', 'R', lab.sr || 'PING'], ['APP', 'R', lab.ar || '']], hl: hl, ehl: ehl }; }
        function st(h1, h2) { return [{ type: 'list', label: 'Primary log', values: prim.slice(), hl: h1 || {} }, { type: 'list', label: 'Replica log', values: repl.slice(), hl: h2 || {} }]; }
        for (var i = 1; i <= 5; i++) { prim.push('w' + i); repl.push('w' + i); }
        frames.push({ narr: 'Normal life: the app writes to the primary; the primary acknowledges <b>immediately</b> and streams writes to the replica a moment later (asynchronous). Sentinels watch both.', parts: [g({ P: 'ok', R: 'ok' }, { 'APP-P': 'ok', 'P-R': 'ok' }, {})].concat(st()) });
        var nh = {};
        for (var j = 1; j <= lag; j++) { prim.push('w' + (5 + j)); nh[prim.length - 1] = 'cur'; }
        frames.push({ narr: lag ? 'The app writes <b>' + lag + '</b> more value(s). The primary has acknowledged them, but they have <b>not reached the replica yet</b> (replication lag).' : 'Replication is fully caught up — the replica has everything the primary has.', parts: [g({ P: 'cur' }, { 'APP-P': 'cur', 'P-R': lag ? 'bad' : 'ok' }, { pr: lag ? 'lagging' : 'in sync' })].concat(st(nh)) });
        frames.push({ narr: '<span class="c-r">The primary crashes.</span> Sentinels stop receiving PING replies. After <code>down-after-milliseconds</code> a majority of Sentinels agree it is down (quorum).', parts: [g({ P: 'bad', S: 'cur' }, { 'S-P': 'bad' }, { sp: 'no reply' })].concat(st(nh)) });
        frames.push({ narr: 'Sentinels <b>promote the replica</b> to primary and tell clients the new address. Total failover typically takes a few seconds.', parts: [g({ R: 'ok', S: 'cur', P: 'bad' }, { 'S-R': 'ok' }, { sr: 'REPLICAOF NO ONE' })].concat(st()) });
        var lostHl = {}; for (var k = 5; k < prim.length; k++) lostHl[k] = 'bad';
        frames.push({ narr: lag ? '<span class="c-r">Writes ' + prim.slice(5).join(', ') + ' were acknowledged but never replicated — they are lost.</span> For a cache this is fine (the DB still has the truth). For Redis used as a primary store it is not: use <code>WAIT</code>, AOF, or a durable store such as MemoryDB.' : '<span class="c-g">Nothing lost</span>: the replica was caught up. The app now writes to the new primary.', parts: [g({ R: 'ok', APP: 'cur' }, { 'APP-R': 'ok' }, { ar: 'writes (new primary)' })].concat(st(lostHl)) });
        return frames;
      }
    }],
    examples: [
      { title: 'Feature → data structure', html: `${H.table(['Feature', 'Redis structure', 'Commands'], [['Game leaderboard', 'sorted set', '<code>ZINCRBY lb 10 asha</code>, <code>ZREVRANGE lb 0 9</code>'], ['Unique visitors per day (approx.)', 'HyperLogLog (12 KB, ~0.8% error)', '<code>PFADD uv:2026-10-14 u42</code>, <code>PFCOUNT</code>'], ['Session store', 'hash + TTL', '<code>HSET sess:abc …</code>, <code>EXPIRE sess:abc 1800</code>'], ['Rate limit 100 req/min', 'string counter + TTL', '<code>INCR rl:u42:202610141205</code>, <code>EXPIRE … 60</code>'], ['Recent activity feed', 'capped list', '<code>LPUSH</code> + <code>LTRIM feed:42 0 99</code>']])}` },
      { title: 'Sizing memory', html: `<p>50M sessions × (≈ 200 B value + ≈ 60 B key + ≈ 50 B per-key overhead) ≈ <b>15.5 GB</b>. Add ~30% for fragmentation and growth → ~20 GB. With one replica per shard, that is 40 GB of RAM. Spread over 4 shards of ~5 GB each so a failover or resync (full copy of the dataset) is quick.</p>` },
      { title: 'Memcached at Meta scale (lessons)', html: `<p>Meta's 2013 "Scaling Memcache at Facebook" paper: thousands of Memcached servers, routed by <b>mcrouter</b>; <b>leases</b> fix stale sets and thundering herds; <b>gutter pools</b> absorb load when a server dies (instead of rehashing its keys onto healthy servers); <b>regional pools</b> share rarely-used keys; invalidations come from the MySQL commit log (McSqueal). These are the same ideas in this module, at planet scale.</p>` },
      { title: 'Hot key on one shard', html: `<p>A celebrity's profile <code>user:1</code> gets 300k reads/s, all on the shard owning its slot — that shard melts while others idle. Fixes: an <b>L1 in-process cache</b> for that key (seconds of TTL), <b>read from replicas</b> (<code>READONLY</code>), or <b>key replication</b>: store copies <code>user:1#0..#7</code> on different slots and read a random one.</p>` }
    ],
    deepDive: `<p><b>Single-threaded execution.</b> Redis runs commands one at a time on its main thread, which makes every command atomic and avoids locks, but means one slow command (<code>KEYS *</code>, <code>HGETALL</code> on a 1M-field hash, a long Lua script, <code>DEL</code> of a huge set — use <code>UNLINK</code>) stalls everyone. Throughput scales by adding shards, not cores. I/O threads (Redis 6+) parallelize socket reads/writes; Dragonfly and KeyDB use multi-threaded shared-nothing designs for more per-box throughput.</p>
<p><b>Persistence trade-offs.</b> RDB = periodic <code>fork()</code> + snapshot (compact, fast restart, but loses minutes; fork of a 50 GB process needs copy-on-write memory headroom). AOF = append every write (<code>appendfsync everysec</code> ≈ ≤ 1 s loss), periodically rewritten. For a pure cache many teams disable both and accept a cold start — but then plan for the stampede on restart.</p>
<p><b>Cluster mechanics.</b> Nodes gossip on a cluster bus; resharding moves slots live (<code>MIGRATING</code>/<code>IMPORTING</code> states, <code>ASK</code> redirects during migration). Failover needs a majority of primaries to agree. Async replication means a split-brain minority primary can accept writes that are later discarded. <code>WAIT numreplicas timeout</code> reduces (not eliminates) loss.</p>
<p><b>Memcached internals.</b> Memory is pre-split into 1 MB pages assigned to <b>slab classes</b> of growing chunk sizes (×1.25); an item uses the smallest chunk that fits, wasting the rest. If traffic shifts from small to large items, the slab automover rebalances pages. Its multi-threaded design with fine-grained locks gives excellent per-node throughput for simple GET/SET.</p>
<p><b>Client-side matters.</b> Connection pooling, pipelining (send 100 commands, read 100 replies — cuts round trips), timeouts of a few ms, and circuit breakers so a sick cache does not stall your app threads.</p>`,
    aiEra: `<p><b>What AI changes:</b> Redis has become a common <b>AI infrastructure</b> piece: vector search (Redis Query Engine, Valkey modules) for RAG, semantic caches for LLM responses, agent short-term memory and session state, and rate limiting for expensive model APIs. AI assistants generate correct redis-cli and client code fluently, so the interview focus moves to choosing structures, sizing memory and planning failure.</p>
<p><b>Use AI as a partner:</b> <code>Estimate Redis memory for 80M keys with these value shapes, including overhead, and propose a shard count</code>; <code>Rewrite this read-modify-write into a single Lua script</code>; <code>Review this Redis usage for O(N) commands that could block</code>.</p>
<p><b>Where AI goes wrong:</b> uses <code>KEYS</code> in production code, assumes Redis replication is synchronous, forgets <code>CROSSSLOT</code> limits in Cluster, gives outdated licensing info, or proposes Redis as the only copy of important data without persistence.</p>
<p><b>What you must still own:</b> whether the cache may lose data, the shard/replica topology, hot-key handling, and the operational runbook for failover and cold start.</p>`,
    problems: [{
      title: 'Global Game Leaderboard', level: 'Medium', tags: ['Redis', 'sorted set', 'sharding'], companies: ['Riot Games', 'Supercell', 'Microsoft'],
      statement: `<p>Design the cache/storage for a live leaderboard: 50M players, 20k score updates/s, players view their rank and the top 100 constantly (200k reads/s). Should you use Memcached or Redis? How do you shard it?</p>`,
      constraints: `<p>Rank must be accurate within ~1 s · top-100 page p99 &lt; 20 ms · tolerate one node failure without losing the leaderboard.</p>`,
      example: `<p>${H.c('b', 'ZINCRBY lb 50 asha')} then ${H.c('b', 'ZREVRANK lb asha')} → 1,204,551 (0-based). ${H.c('b', 'ZREVRANGE lb 0 99 WITHSCORES')} → top 100 in O(log N + 100).</p>`,
      brute: { why: `<p><b>Naive design:</b> store scores in SQL and run <code>SELECT COUNT(*) FROM scores WHERE score &gt; :mine</code> for each rank lookup, cached in Memcached for 1 s. COUNT over 50M rows at 200k reads/s is impossible, and Memcached cannot compute ranks — it only stores blobs, so every rank must be precomputed for every player.</p>` },
      mcq: { q: 'Which structure gives O(log N) rank lookups?', options: ['Memcached string', 'Redis list', 'Redis sorted set (skip list)', 'Redis set'], answer: 2, explain: 'A sorted set is a skip list + hash: ZADD, ZRANK and ZREVRANGE are O(log N) (+ M returned).' },
      hints: [`<p>Hint 1: You need the server to keep scores <i>ordered</i> — that rules out plain key-value caches.</p>`, `<p>Hint 2: One Redis sorted set with 50M members ≈ 5 GB fits on one shard; reads can go to replicas. Durable copy of scores lives in a DB.</p>`, `<p>Hint 3: If it outgrows one node, split by score buckets (or by region) and compute global rank as the sum of counts in higher buckets (<code>ZCOUNT</code>).</p>`],
      solution: {
        approach: `<p><b>Use Redis (sorted sets).</b> Memcached cannot order or rank. Design:</p>
<ul><li><b>Write path:</b> game servers send score events to Kafka (durable log); a consumer writes the authoritative score to a DB (DynamoDB/Postgres) and applies <code>ZADD lb GT score player</code> to Redis (GT = only increase).</li>
<li><b>Read path:</b> top 100 via <code>ZREVRANGE lb 0 99 WITHSCORES</code>, cached for 1 s in an L1 in-process cache on API servers (all 200k reads/s hit the same key → the L1 absorbs it). Personal rank via <code>ZREVRANK</code> served from Redis replicas.</li>
<li><b>Size:</b> 50M members × ~100 B ≈ 5 GB → one primary + 2 replicas (replicas spread read load and provide failover via Sentinel/Cluster).</li>
<li><b>Failure:</b> if Redis loses data, rebuild from the DB or by replaying Kafka. Async replication may lose ~1 s of updates on failover — acceptable and repaired by replay.</li>
<li><b>Bigger scale:</b> partition by score range into multiple sorted sets on different shards; rank = Σ <code>ZCARD</code> of higher buckets + rank within own bucket.</li></ul>`,
        complexity: `<p>ZADD/ZREVRANK O(log N) ≈ 26 steps for 50M; top-100 O(log N + 100). Memory ≈ 5 GB per copy.</p>`,
        followUps: ['Daily / weekly leaderboards with automatic reset?', 'Friends-only leaderboard?', 'How do you handle ties fairly (earlier achiever ranks higher)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Thundering Herd / Cache Stampede
     ===================================================================== */
  topics.push({
    title: 'Thundering Herd & Cache Stampede',
    analogy: `<p>A busy office has one <b>coffee machine</b>. The pot runs empty at 9:00 sharp. Fifty people walk up at the same moment, see it is empty, and <b>all fifty start brewing their own pot</b> — the machine jams and nobody gets coffee for ten minutes. The smart office has a rule: <b>the first person who finds it empty brews; everyone else waits two minutes and shares that pot</b>. Even smarter: someone tops it up at 8:55, <i>before</i> it runs dry.</p>`,
    explain: `<p>A <b>cache stampede</b> (also called <b>thundering herd</b>, <b>dog-piling</b>, or <b>cache breakdown</b> for a single hot key) happens when a popular key disappears — TTL expiry, eviction, a deploy that flushed the cache — and <b>many concurrent requests miss at the same time</b>. Each one runs the same expensive DB query or computation. The DB slows down, so each query takes longer, so even more requests pile up behind them. Latency explodes and the DB can fall over — a feedback loop.</p>
${H.table(['Moment', 'Hot key: 5,000 req/s, recompute 200 ms'], [['Key valid', '0 DB queries — all hits'], ['Key expires', 'every request in the next 200 ms misses → <b>1,000</b> identical queries'], ['DB slows to 2 s under load', 'now <b>10,000</b> requests miss before anyone refills the key'], ['Result', '<span class="c-r">DB at 100% CPU, timeouts, retries make it worse</span>']])}
<p><b>The fixes (use more than one):</b></p>
<ol><li><b>Request coalescing / single-flight:</b> within one server, only the first miss for a key calls the DB; other threads wait on the same in-flight future. Cuts duplicates per server from thousands to one.</li>
<li><b>Distributed lock (mutex) on refill:</b> across servers, the first miss does <code>SET lock:key token NX PX 3000</code>. Winner recomputes and fills; losers briefly sleep and re-read the cache, or serve a stale copy. Now the whole fleet sends ~1 query.</li>
<li><b>Stale-while-revalidate (soft TTL):</b> keep the old value past its "soft" expiry; serve it instantly while one request refreshes in the background. Users never wait.</li>
<li><b>Probabilistic early expiration (XFetch):</b> each request, as expiry approaches, rolls a die and with growing probability refreshes the key <i>early</i>. One lucky request refreshes before the deadline, so the key never actually expires under load.</li>
<li><b>TTL jitter:</b> <code>TTL = 300 + random(0..60)</code> so keys loaded together do not expire together (prevents a <i>mass</i> stampede, a.k.a. cache avalanche).</li>
<li><b>Never-expire hot keys + background refresh:</b> a job refreshes the top-N keys every few seconds.</li></ol>`,
    clues: ['"every hour on the hour our DB CPU spikes to 100%" → synchronized TTL expiry, add jitter', '"a viral post / celebrity key expires and the DB falls over" → hot-key stampede: single-flight + lock + stale-while-revalidate', '"after a deploy that cleared the cache, the site went down" → cold-start herd: warmup, gradual traffic, coalescing', '"recomputing this value takes 5 seconds" → expensive recompute = stampede risk; refresh ahead of expiry', '"retries make the outage worse" → herd + retry storm: backoff with jitter, circuit breaker', '"millions of clients reconnect at the same time" → thundering herd beyond caches; add jittered backoff'],
    code: [{ lang: 'java', title: 'Single-flight: one loader per key per JVM', code: `class SingleFlight<K, V> {
    // key -> the load currently in progress for that key
    private final ConcurrentHashMap<K, CompletableFuture<V>> inFlight = new ConcurrentHashMap<>();

    V load(K key, Function<K, V> loader) {
        CompletableFuture<V> mine = new CompletableFuture<>();
        CompletableFuture<V> existing = inFlight.putIfAbsent(key, mine);
        if (existing != null) {
            return existing.join();              // someone else is loading: wait and share
        }
        try {
            V v = loader.apply(key);             // we are the leader: do the expensive work once
            mine.complete(v);
            return v;
        } catch (RuntimeException e) {
            mine.completeExceptionally(e);       // waiters see the same failure (no retry storm)
            throw e;
        } finally {
            inFlight.remove(key, mine);          // next miss after this starts a fresh load
        }
    }

    public static void main(String[] args) throws Exception {
        SingleFlight<String, String> sf = new SingleFlight<>();
        AtomicInteger dbCalls = new AtomicInteger();
        Function<String, String> slowDb = k -> {
            dbCalls.incrementAndGet();
            try { Thread.sleep(200); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return "value-of-" + k;
        };
        ExecutorService pool = Executors.newFixedThreadPool(50);
        List<Future<String>> results = new ArrayList<>();
        for (int i = 0; i < 50; i++) results.add(pool.submit(() -> sf.load("hot:key", slowDb)));
        for (Future<String> f : results) f.get();
        pool.shutdown();
        System.out.println("50 concurrent misses -> DB calls = " + dbCalls.get());   // usually 1
    }
}` }, { lang: 'python', run: true, title: 'Naive vs lock vs XFetch early refresh (deterministic simulation)', code: `import math
import random

RATE = 1000        # requests per second on one hot key
TTL = 60.0         # seconds
DELTA = 2.0        # seconds to recompute the value (slow query)
DURATION = 300.0   # simulate 5 minutes
BETA = 1.0         # XFetch aggressiveness (>1 refreshes earlier)

def simulate(strategy, seed=7):
    rng = random.Random(seed)
    expiry = TTL                 # key was loaded at t=0
    refresh_done = None          # time an in-flight recompute finishes
    recomputes, waits = 0, 0
    for i in range(int(RATE * DURATION)):
        now = i / RATE
        if refresh_done is not None and now >= refresh_done:   # recompute finished
            expiry, refresh_done = refresh_done + TTL, None
        expired = now >= expiry
        if strategy == "naive":
            if expired:
                recomputes += 1          # every miss queries the DB until someone refills
                if refresh_done is None:
                    refresh_done = now + DELTA
        elif strategy == "lock":
            if expired:
                if refresh_done is None:
                    recomputes += 1      # only the lock winner recomputes
                    refresh_done = now + DELTA
                else:
                    waits += 1           # others wait (or serve stale)
        elif strategy == "xfetch":
            # refresh early with probability rising as expiry approaches
            early = now - DELTA * BETA * math.log(rng.random()) >= expiry
            if (expired or early) and refresh_done is None:
                recomputes += 1
                refresh_done = now + DELTA
            elif expired:
                waits += 1
    return recomputes, waits

for s in ("naive", "lock", "xfetch"):
    r, w = simulate(s)
    print(f"{s:7} DB recomputes in 5 min = {r:5}   requests that had to wait = {w}")` }],
    codeTitle: ['Request coalescing (Java)', 'Stampede strategies compared (Python)'],
    viz: {
      title: 'Stampede: concurrent misses vs request coalescing',
      input: '8 both',
      inputLabel: 'number of concurrent requests (2–12) and mode: naive | coalesce | both',
      gen: function (input) {
        var m = /^\s*(\d+)\s*(naive|coalesce|both)?\s*$/i.exec(String(input || ''));
        if (!m) throw new Error('Format: N mode   e.g. 8 both');
        var n = +m[1], mode = (m[2] || 'both').toLowerCase();
        if (n < 2 || n > 12) throw new Error('N must be 2–12');
        var frames = [], reqs = []; for (var i = 1; i <= n; i++) reqs.push('r' + i);
        function g(title, hl, ehl, lab) { return { type: 'graph', directed: true, height: 56, label: title, nodes: [box('Q', n + ' concurrent requests', 10, 28), box('A', 'App fleet', 40, 28), box('C', 'Cache', 75, 8), box('D', 'Database', 75, 48)], edges: [['Q', 'A', lab.qa || ''], ['A', 'C', lab.ac || ''], ['A', 'D', lab.ad || '']], hl: hl, ehl: ehl }; }
        function naive() {
          frames.push({ narr: '<b>NAIVE.</b> The hot key <code>feed:top</code> just hit its TTL. ' + n + ' requests arrive within the same few milliseconds.', parts: [g('No protection', { C: 'bad' }, {}, { ac: 'feed:top expired' }), { type: 'queue', label: 'Requests in flight', items: reqs.slice(), frontLabel: 'first', backLabel: 'last' }, { type: 'bars', label: 'DB queries running', values: [0], idxLabels: ['DB'] }] });
          var hlq = {}; reqs.forEach(function (r, i) { hlq[i] = 'bad'; });
          frames.push({ narr: 'Every request checks the cache → <span class="c-r">MISS</span>, ' + n + ' times. None of them knows the others are about to do the same work.', parts: [g('No protection', { C: 'bad', A: 'cur' }, { 'Q-A': 'cur', 'A-C': 'bad' }, { ac: n + '× GET → miss' }), { type: 'queue', label: 'Requests in flight', items: reqs.slice(), hl: hlq }, { type: 'bars', label: 'DB queries running', values: [0], idxLabels: ['DB'] }] });
          var load = [], labels = [];
          for (var k = 1; k <= n; k++) { load.push(k); labels.push('t' + k); }
          frames.push({ narr: 'All ' + n + ' run the <b>same expensive query</b>. DB concurrency jumps from 0 to ' + n + '; each query slows down because they fight for CPU and locks (latency ≈ ' + (200 * n / 2) + ' ms instead of 200 ms).', parts: [g('No protection', { D: 'bad', A: 'cur' }, { 'A-D': 'bad' }, { ad: n + '× SELECT (same!)' }), { type: 'queue', label: 'Requests in flight', items: reqs.slice(), hl: hlq }, { type: 'bars', label: 'DB concurrent queries as the herd arrives', values: load, idxLabels: labels, hl: (function () { var h = {}; h[n - 1] = 'bad'; return h; })() }] });
          frames.push({ narr: 'Finally all ' + n + ' write the <b>same value</b> into the cache. ' + (n - 1) + ' of those DB queries were pure waste. With 5,000 req/s instead of ' + n + ', this is how a DB falls over.', parts: [g('No protection', { C: 'ok', D: 'bad' }, { 'A-C': 'ok' }, { ac: n + '× SET (same value)' }), { type: 'vars', label: 'Cost', vals: { 'DB queries': n, 'useful': 1, 'wasted': n - 1 }, hl: { wasted: 'bad' } }] });
        }
        function coal() {
          frames.push({ narr: '<b>COALESCED.</b> Same situation: <code>feed:top</code> expired and ' + n + ' requests arrive together.', parts: [g('Single-flight + lock', { C: 'bad' }, {}, { ac: 'feed:top expired' }), { type: 'queue', label: 'Requests in flight', items: reqs.slice() }, { type: 'bars', label: 'DB queries running', values: [0], idxLabels: ['DB'] }] });
          var hl = { 0: 'ok' }; for (var i = 1; i < n; i++) hl[i] = 'cur';
          frames.push({ narr: '<b>r1</b> misses first and wins the lock: <code>SET lock:feed:top token NX PX 3000</code> → OK. The other ' + (n - 1) + ' see the lock is taken (or find an in-flight future in their process) and <b>wait</b> instead of querying.', parts: [g('Single-flight + lock', { A: 'cur', C: 'cur' }, { 'A-C': 'cur' }, { ac: 'SET lock NX → r1 wins' }), { type: 'queue', label: 'r1 = leader (green), others waiting (amber)', items: reqs.slice(), hl: hl }, { type: 'stack', label: 'Lock holder', items: ['lock:feed:top = r1'] }] });
          frames.push({ narr: 'Only r1 queries the DB. DB concurrency stays at <b>1</b>, so the query runs at its normal 200 ms.', parts: [g('Single-flight + lock', { D: 'ok', A: 'cur' }, { 'A-D': 'ok' }, { ad: '1× SELECT' }), { type: 'queue', label: 'waiting on r1', items: reqs.slice(), hl: hl }, { type: 'bars', label: 'DB concurrent queries', values: [1], idxLabels: ['DB'], hl: { 0: 'ok' } }] });
          var all = {}; for (var j = 0; j < n; j++) all[j] = 'ok';
          frames.push({ narr: 'r1 writes the fresh value (with a jittered TTL), releases the lock, and all ' + (n - 1) + ' waiters read it from the cache (or receive the shared future). Everyone answered, <b>1</b> DB query total.', parts: [g('Single-flight + lock', { C: 'ok' }, { 'A-C': 'ok', 'Q-A': 'ok' }, { ac: 'SET value; DEL lock', qa: 'all served' }), { type: 'queue', label: 'Requests served', items: reqs.slice(), hl: all }, { type: 'vars', label: 'Cost', vals: { 'DB queries': 1, 'useful': 1, 'wasted': 0 }, hl: { wasted: 'ok' } }] });
          frames.push({ narr: 'Even better: with <b>stale-while-revalidate</b> the waiters would not wait at all — they get the slightly old value instantly while r1 refreshes. And with <b>early refresh</b> (XFetch / refresh-ahead) the key is renewed before it ever expires.', parts: [{ type: 'table', label: 'Stampede defences', columns: ['technique', 'scope', 'waiters'], rows: [['single-flight', 'one process', 'wait on future'], ['distributed lock', 'whole fleet', 'sleep + re-read, or stale'], ['stale-while-revalidate', 'whole fleet', 'served instantly (stale)'], ['XFetch / refresh-ahead', 'whole fleet', 'never miss'], ['TTL jitter', 'many keys', 'prevents mass expiry']] }] });
        }
        if (mode === 'naive' || mode === 'both') naive();
        if (mode === 'coalesce' || mode === 'both') coal();
        if (mode === 'both') frames.push({ narr: 'Side by side: <b>' + n + '</b> DB queries without protection vs <b>1</b> with coalescing. At real traffic (thousands per second) the gap is the difference between an outage and a non-event.', parts: [{ type: 'bars', label: 'DB queries for one expiry', values: [n, 1], idxLabels: ['naive', 'coalesced'], hl: { 0: 'bad', 1: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Redis lock-based refill (pseudocode)', html: `<p>Use a unique token so you never delete someone else's lock, and an expiry so a crashed leader cannot block forever:</p>`, code: { lang: 'text', code: `value = GET key
if value != nil: return value
token = random_uuid()
if SET lock:key token NX PX 3000:          # I am the leader
    value = db.load(key)
    SET key value EX 300 + rand(0, 30)
    EVAL "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) end" 1 lock:key token
    return value
else:                                       # someone else is loading
    repeat up to 20 times: sleep 25ms; value = GET key; if value: return value
    return stale_copy_or_fallback()         # never pile onto the DB` } },
      { title: 'XFetch formula in plain words', html: `<p>Refresh early if <code>now − Δ·β·ln(rand()) ≥ expiry</code>, where Δ = how long a recompute takes and β ≥ 1. Because <code>−ln(rand())</code> is usually small but occasionally large, far from expiry almost nobody refreshes; within the last few Δ before expiry, the chance rises fast, so typically <b>one</b> request refreshes slightly early. Slow-to-compute keys (big Δ) get refreshed earlier automatically.</p>` },
      { title: 'The hourly spike', html: `<p>A batch job warms 2M keys at 02:00 with <code>EX 3600</code>. Every hour on the hour they all expire together → DB CPU 15% → 95% for 3 minutes. Fix: <code>EX 3600 + rand(0, 600)</code> spreads expiries over 10 minutes; peak extra load drops ~6×. Combine with refresh-ahead for the top 1% of keys.</p>` },
      { title: 'Herds outside caches', html: `<p>The same pattern appears when 1M mobile clients reconnect after a server restart, when cron jobs on 500 servers all fire at <code>0 * * * *</code>, or when clients retry a failed call immediately. Same cure: <b>jitter</b> (randomized delays), <b>exponential backoff</b>, and <b>coalescing</b>.</p>` }
    ],
    deepDive: `<p><b>Why it is a feedback loop.</b> Little's Law: concurrent requests = arrival rate × latency. If the DB slows from 200 ms to 2 s under the herd, the number of concurrent misses grows 10× at the same arrival rate, which slows the DB further. Without coalescing, the system has an unstable equilibrium — a small expiry can tip it into collapse ("metastable failure"). Retries (often 3× per layer, multiplied across layers) amplify this into a <b>retry storm</b>.</p>
<p><b>Lock details.</b> The lock TTL must exceed the recompute time; otherwise a second leader starts. Use a random token and a compare-and-delete Lua script to release. Losers must have a bounded wait and a fallback (stale value, default, or 503) — never "wait forever". A lock-free alternative is Facebook's <b>lease</b>: the cache itself gives only one client per key per ~10 s a fill token and tells others "hot miss — retry shortly", which also fixes stale sets.</p>
<p><b>Stale-while-revalidate needs two TTLs.</b> Store <code>{value, softExpiry}</code> with a Redis TTL = hard expiry (e.g. soft 60 s, hard 600 s). Past soft expiry: serve the value and trigger an async refresh guarded by single-flight/lock. Past hard expiry: genuine miss. HTTP CDNs implement exactly this via <code>stale-while-revalidate</code> and <b>request collapsing</b> (Varnish, Fastly, Cloudflare, nginx <code>proxy_cache_lock</code>).</p>
<p><b>Cold-start herd.</b> After a full cache flush, every key misses at once. Protect the DB with <b>admission control</b>: a concurrency limit (bulkhead) on DB calls, load shedding of low-priority traffic, and gradual traffic ramp-up; pre-warm by replaying the most frequent keys from access logs.</p>
<p><b>Math check:</b> XFetch (Vattani et al., 2015) is shown to be optimal in expectation among memoryless early-refresh schemes; with β = 1 the expected number of early refreshes per expiry is close to one.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM calls are the ultimate expensive recompute — seconds of latency and real money per call. A popular prompt (a shared summary, a trending question) with a semantic/response cache that expires can trigger a <b>cost stampede</b>: hundreds of identical model calls billed at once and rate-limit errors from the provider. Single-flight, stale-while-revalidate and refresh-ahead are now cost controls, not just latency tools.</p>
<p><b>Use AI as a partner:</b> <code>Review this cache code for stampede risk: what happens when 10k requests miss the same key within 100 ms?</code>; <code>Write a Redis Lua compare-and-delete for my lock and a test that kills the leader mid-refresh</code>.</p>
<p><b>Where AI goes wrong:</b> generates a Redis lock without expiry or without a unique token (deleting other clients' locks), uses <code>SETNX</code> then a separate <code>EXPIRE</code> (not atomic), makes losers spin-wait without a bound, or "fixes" a stampede by raising DB connection limits (feeding the herd).</p>
<p><b>What you must still own:</b> spotting which keys are hot and expensive, choosing between waiting and serving stale, and load-testing the expiry moment — the incident only happens under real concurrency.</p>`,
    problems: [{
      title: 'Fix the Homepage Stampede', level: 'Hard', tags: ['stampede', 'single-flight', 'stale-while-revalidate', 'jitter'], companies: ['Netflix', 'Reddit', 'Twitter/X'],
      statement: `<p>The homepage calls <code>getTrending()</code>, cached in Redis under one key with TTL 60 s. Computing it takes a 3-second aggregation query. Traffic is 40k req/s across 200 app servers. Every minute, p99 latency spikes to 10 s and DB CPU hits 100%. Explain what is happening and design a fix.</p>`,
      constraints: `<p>Trending may be up to 2 minutes stale · DB can run at most ~5 concurrent aggregations · no request should wait more than 100 ms for trending data.</p>`,
      example: `<p>At expiry, during the 3 s recompute: 40,000 × 3 = ${H.c('r', '120,000 misses')} → potentially 120k identical aggregations. With coalescing + stale-while-revalidate: ${H.c('g', '1 aggregation')}, and every request is served the previous value instantly.</p>`,
      brute: { why: `<p><b>Naive fixes:</b> increase TTL to 10 min (the spike still happens, just less often, and data is staler than allowed); add DB read replicas (each replica gets its own herd); add a per-server in-memory lock (still 200 servers × 1 = 200 concurrent 3-second aggregations — 40× the DB limit).</p>` },
      mcq: { q: 'Why is a per-process single-flight alone not enough here?', options: ['Java cannot do it', 'There are 200 servers, so up to 200 aggregations still run', 'Redis does not support it', 'It increases staleness'], answer: 1, explain: 'Single-flight dedups within one process. Fleet-wide you need a distributed lock, a lease, or a background refresher.' },
      hints: [`<p>Hint 1: The value is expensive (3 s) and shared by everyone → one key, one recompute, everyone else must not wait on the DB.</p>`, `<p>Hint 2: Store the value with a soft expiry; serve stale past it; refresh behind a Redis lock (<code>SET NX PX</code>) — or move refresh to a background job entirely.</p>`, `<p>Hint 3: Add an L1 in-process copy (a few seconds) so 40k req/s do not all hit one Redis key; keep a hard TTL far beyond soft TTL; alert if the value is older than 2 min.</p>`],
      solution: {
        approach: `<p><b>Diagnosis:</b> a classic hot-key stampede. When the key expires, every request that arrives during the 3-second recompute misses and runs the aggregation; the DB slows, the window widens, and more requests pile in.</p>
<p><b>Fix (layered):</b></p>
<ol><li><b>Decouple refresh from requests:</b> a scheduled worker (leader-elected, or guarded by <code>SET lock:trending NX PX 10000</code>) recomputes trending every 30 s and writes <code>{value, computedAt}</code> with a hard TTL of 10 min. The request path never computes it.</li>
<li><b>Stale-while-revalidate fallback:</b> if a request finds <code>computedAt</code> older than 60 s (worker failed), it serves the stale value immediately and tries to take the lock to trigger one refresh asynchronously.</li>
<li><b>L1 cache:</b> each app server keeps trending in memory for 5 s with single-flight on its Redis read → Redis sees ~200 × 0.2 = 40 reads/s on that key instead of 40k.</li>
<li><b>Hard miss path</b> (cold start): single-flight + distributed lock; losers return a default "popular" list rather than waiting more than 100 ms.</li>
<li><b>Guardrails:</b> DB bulkhead (max 5 concurrent aggregations), alert on value age &gt; 2 min, jittered TTLs for other keys.</li></ol>
<p>Result: exactly ~2 aggregations/minute, no request waits on the DB, staleness ≤ ~60 s normally and ≤ 2 min worst case.</p>`,
        complexity: `<p>DB: O(1) aggregations per refresh interval regardless of traffic. Redis: O(servers / L1 TTL) reads/s for the hot key. Request latency: one in-memory lookup.</p>`,
        followUps: ['What if the worker that holds the lock dies mid-refresh?', 'How would you do this per-country (200 trending keys)?', 'How do you load-test the expiry moment?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Cache Penetration, Breakdown & Avalanche
     ===================================================================== */
  function bloomPos(x) { return [((x * 7 + 3) % 16 + 16) % 16, ((x * 11 + 5) % 16 + 16) % 16]; }
  topics.push({
    title: 'Cache Penetration, Breakdown & Avalanche',
    analogy: `<p>A library has a <b>front desk</b> (the cache) and a huge <b>basement archive</b> (the database). <b>Penetration:</b> a prankster keeps asking for books that <i>do not exist</i>; the desk never has them, so a librarian runs to the basement every time — and finds nothing. <b>Breakdown:</b> the one bestseller everyone wants is missing from the desk for a minute and a crowd runs to the basement. <b>Avalanche:</b> the whole front desk closes at once and <i>everyone</i> heads downstairs. The fix for the prankster is a <b>catalogue card index</b> at the door (a Bloom filter) and a note saying "we don't have that book" (a negative cache).</p>`,
    explain: `<p>Three failure modes are often confused in interviews. All three push traffic past the cache onto the database:</p>
${H.table(['Name', 'What happens', 'Main fixes'], [['<b>Penetration</b>', 'requests for keys that <b>do not exist</b> in the DB; nothing is ever cached, so <b>every</b> request reaches the DB (bugs, scrapers, attackers sending random IDs)', 'negative caching, <b>Bloom filter</b>, input validation, rate limiting'], ['<b>Breakdown</b> (hot-key miss)', 'one very hot key expires; many concurrent requests miss it (previous topic)', 'single-flight, lock, stale-while-revalidate, refresh-ahead'], ['<b>Avalanche</b>', '<b>many</b> keys expire at the same time, or the cache cluster restarts/fails; the DB gets the whole read load', 'TTL jitter, HA cache (replicas), multi-level caches, warmup, circuit breakers / rate limits on the DB path']])}
<p><b>Negative caching:</b> when the DB says "not found", cache that answer too: <code>SET user:999 "∅" EX 60</code>. Repeated lookups of the same missing ID become hits. Keep the TTL short so a newly-created item appears quickly (or delete the negative entry when the item is created).</p>
<p>But an attacker can send <i>different</i> random IDs every time — negative caching never hits, and it fills the cache with junk. That is where a <b>Bloom filter</b> helps: a compact bit array that answers <b>"definitely not present"</b> or <b>"maybe present"</b>.</p>
<ul><li><b>Add</b> a key: hash it with <i>k</i> hash functions, set those <i>k</i> bits to 1.</li>
<li><b>Check</b> a key: if <i>any</i> of its k bits is 0 → ${H.c('g', 'definitely not in the set')} → reject without touching cache or DB. If all are 1 → ${H.c('y', 'maybe')} → continue normally (false positives possible, false negatives impossible).</li></ul>
${H.bits(0b1011110111000011, 16, { label: 'Bloom filter, 16 bits, after adding user IDs 1–6 with 2 hash functions' })}
<p>Real sizes: 100M keys at a 1% false-positive rate need only ~120 MB (≈ 9.6 bits per key, 7 hash functions) — tiny compared to caching 100M negative answers. Bloom filters cannot delete items (use a <b>counting</b> Bloom filter or a <b>Cuckoo filter</b> if keys get deleted) and must be rebuilt as the dataset grows.</p>`,
    clues: ['"attackers request random non-existent product IDs and the DB is overloaded" → penetration: Bloom filter + rate limit', '"many lookups return not found" (username availability, coupon codes) → negative cache / Bloom filter', '"after the Redis cluster restarted, the database went down" → avalanche: warmup, HA, circuit breaker', '"all keys were loaded by one batch job and expire together" → avalanche: TTL jitter', '"must answer is X definitely absent using little memory" → Bloom filter (no false negatives)', '"keys are deleted often" → counting Bloom or Cuckoo filter'],
    code: [{ lang: 'python', run: true, title: 'Bloom filter guard in front of the DB (runnable)', code: `import hashlib
import math

class BloomFilter:
    def __init__(self, expected_items, fp_rate):
        # Optimal size m and hash count k for the target false-positive rate
        self.m = math.ceil(-expected_items * math.log(fp_rate) / (math.log(2) ** 2))
        self.k = max(1, round(self.m / expected_items * math.log(2)))
        self.bits = bytearray((self.m + 7) // 8)

    def _positions(self, key):
        # Double hashing: derive k positions from two 64-bit hashes
        d = hashlib.sha256(key.encode()).digest()
        h1 = int.from_bytes(d[:8], "big")
        h2 = int.from_bytes(d[8:16], "big") | 1
        return [(h1 + i * h2) % self.m for i in range(self.k)]

    def add(self, key):
        for p in self._positions(key):
            self.bits[p // 8] |= 1 << (p % 8)

    def might_contain(self, key):
        return all(self.bits[p // 8] >> (p % 8) & 1 for p in self._positions(key))

# Load every existing product ID at startup (and on each insert)
existing = [f"product:{i}" for i in range(100_000)]
bf = BloomFilter(expected_items=len(existing), fp_rate=0.01)
for key in existing:
    bf.add(key)
print(f"m = {bf.m:,} bits ({bf.m / 8 / 1024:.0f} KB), k = {bf.k} hash functions")

# No false negatives: every real key passes
assert all(bf.might_contain(k) for k in existing[:5000])

# Attack: 50,000 random IDs that do NOT exist
attack = [f"product:{i}" for i in range(10_000_000, 10_050_000)]
reached_db = sum(bf.might_contain(k) for k in attack)
print(f"attack requests: {len(attack):,}; reached the DB (false positives): {reached_db} "
      f"({reached_db / len(attack):.2%})")` }],
    codeTitle: ['Bloom filter sizing + attack simulation'],
    viz: {
      title: 'Penetration: random missing IDs vs negative cache vs Bloom filter',
      input: 'bloom | 3 999 42 999 1234 77 5 500',
      inputLabel: 'mode (none | negative | bloom) | IDs requested (users 1–6 exist)',
      gen: function (input) {
        var sp = String(input || '').split('|');
        if (sp.length !== 2) throw new Error('Format: mode | ids   e.g. bloom | 3 999 42');
        var mode = sp[0].trim().toLowerCase();
        if (['none', 'negative', 'bloom'].indexOf(mode) < 0) throw new Error('mode must be none, negative or bloom');
        var ids = sp[1].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!ids.length || ids.length > 12 || ids.some(function (x) { return !(x >= 0 && x < 1e7 && Math.floor(x) === x); })) throw new Error('Give 1–12 non-negative integer IDs');
        var bloom = 0; for (var u = 1; u <= 6; u++) bloomPos(u).forEach(function (p) { bloom |= (1 << p); });
        var cache = {}, dbq = 0, rejected = 0, frames = [];
        function g(hl, ehl, lab) {
          var nodes = [box('CL', 'Clients / attacker', 8, 30), box('A', 'App', 34, 30), box('C', 'Cache', 66, 10), box('D', 'Database', 92, 30)];
          var edges = [['CL', 'A', lab.ca || ''], ['A', 'C', lab.ac || ''], ['A', 'D', lab.ad || '']];
          if (mode === 'bloom') { nodes.push(box('B', 'Bloom filter', 66, 52)); edges.push(['A', 'B', lab.ab || '']); }
          return { type: 'graph', directed: true, height: 60, label: 'Mode: ' + mode, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
        }
        function st(bh) {
          var out = [];
          if (mode === 'bloom') out.push({ type: 'bits', label: 'Bloom bits (users 1–6 added, 2 hashes)', value: bloom, width: 16, hl: bh || {} });
          out.push({ type: 'map', label: 'Cache', entries: entries(cache) });
          out.push({ type: 'vars', label: 'Counters', vals: { 'DB queries': dbq, 'rejected early': rejected } });
          return out;
        }
        frames.push({ narr: 'Users <b>1–6</b> exist in the DB. Requests for other IDs are for things that do not exist. Mode: <b>' + mode + '</b>.', parts: [g({}, {}, {})].concat(st()) });
        ids.forEach(function (id) {
          var exists = id >= 1 && id <= 6, key = 'user:' + id;
          if (mode === 'bloom') {
            var ps = bloomPos(id), bh = {}, maybe = ps.every(function (p) { return (bloom >> p) & 1; });
            ps.forEach(function (p) { bh[p] = ((bloom >> p) & 1) ? 'ok' : 'bad'; });
            if (!maybe) {
              rejected++;
              frames.push({ narr: 'ID <b>' + id + '</b>: hash positions ' + ps.join(' & ') + '. At least one bit is <b>0</b> → <span class="c-g">definitely not present</span>. Return 404 instantly; cache and DB untouched.', parts: [g({ B: 'ok', A: 'cur' }, { 'A-B': 'ok' }, { ab: 'check ' + id + ' → no' })].concat(st(bh)) });
              return;
            }
            frames.push({ narr: 'ID <b>' + id + '</b>: positions ' + ps.join(' & ') + ' are both 1 → <span class="c-y">maybe present</span>' + (exists ? '' : ' (this is a <b>false positive</b> — the bits were set by other IDs)') + '. Continue to the cache.', parts: [g({ B: 'cur', A: 'cur' }, { 'A-B': 'cur' }, { ab: 'check ' + id + ' → maybe' })].concat(st(bh)) });
          }
          if (Object.prototype.hasOwnProperty.call(cache, key)) {
            frames.push({ narr: 'ID <b>' + id + '</b>: cache <span class="c-g">hit</span> (' + (cache[key] === '∅' ? 'a cached "not found" — negative caching at work' : 'real row') + '). No DB query.', parts: [g({ C: 'ok' }, { 'CL-A': 'ok', 'A-C': 'ok' }, { ac: 'GET ' + key + ' → hit' })].concat(st()) });
            return;
          }
          dbq++;
          if (exists) {
            cache[key] = 'row';
            frames.push({ narr: 'ID <b>' + id + '</b>: cache miss → DB finds the row → cache it. Normal cache-aside.', parts: [g({ C: 'bad', D: 'ok' }, { 'A-C': 'bad', 'A-D': 'ok' }, { ac: 'miss', ad: 'SELECT → row' })].concat(st()) });
          } else if (mode === 'none') {
            frames.push({ narr: 'ID <b>' + id + '</b>: cache miss → DB says <b>not found</b> → <span class="c-r">nothing to cache</span>. The next request for ' + id + ' will hit the DB again. This is <b>cache penetration</b>.', parts: [g({ C: 'bad', D: 'bad' }, { 'A-C': 'bad', 'A-D': 'bad' }, { ac: 'miss', ad: 'SELECT → none' })].concat(st()) });
          } else {
            cache[key] = '∅';
            frames.push({ narr: 'ID <b>' + id + '</b>: cache miss → DB says not found → cache <b>"∅"</b> with a short TTL (negative caching). Repeats of ' + id + ' become hits — but a <i>new</i> random ID still reaches the DB.', parts: [g({ C: 'cur', D: 'bad' }, { 'A-C': 'cur', 'A-D': 'bad' }, { ac: 'SET ' + key + ' ∅ EX 60', ad: 'SELECT → none' })].concat(st()) });
          }
        });
        var bad = ids.filter(function (x) { return !(x >= 1 && x <= 6); }).length;
        frames.push({ narr: 'Done (' + mode + '): <b>' + dbq + '</b> DB queries for ' + ids.length + ' requests, ' + bad + ' of which asked for non-existent IDs. Try the same IDs with <code>none</code>, <code>negative</code> and <code>bloom</code> to compare.', parts: [g({}, {}, {}), { type: 'bars', label: 'DB queries vs requests', values: [ids.length, dbq, rejected], idxLabels: ['requests', 'DB queries', 'rejected early'], hl: { 1: dbq > ids.length / 2 ? 'bad' : 'ok', 2: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Bloom filter sizing by hand', html: `<p>Formulas: <code>m = −n·ln(p) / (ln 2)²</code>, <code>k = (m/n)·ln 2</code>.</p>${H.table(['n keys', 'false-positive p', 'bits per key', 'total memory', 'k'], [['10M', '1%', '9.6', '≈ 12 MB', '7'], ['100M', '1%', '9.6', '≈ 120 MB', '7'], ['100M', '0.1%', '14.4', '≈ 180 MB', '10']])}<p>Each 10× better false-positive rate costs only ~4.8 more bits per key.</p>` },
      { title: 'Username availability check', html: `<p>Sign-up form checks "is <code>cool_dev_99</code> taken?" on every keystroke — most answers are "not taken", i.e. a <b>miss</b> for a key that does not exist. A Bloom filter of all 500M usernames (~600 MB at 1%) answers "definitely available" locally for most keystrokes; only "maybe taken" goes to the DB for the definitive answer. Final sign-up still relies on a unique index in the DB.</p>` },
      { title: 'Avalanche drill: Redis cluster restart', html: `<p>Normal: 100k QPS reads, 97% hit rate → DB sees 3k QPS. Cache restarts empty → DB would see 100k QPS (33×). Plan: replicas + automatic failover (so a node loss is not a full flush), <b>circuit breaker / concurrency limit</b> on the DB path (shed load, serve defaults), warm the top keys from a snapshot or log replay before admitting full traffic, and per-key single-flight to collapse duplicates.</p>` },
      { title: 'Validate before you cache', html: `<p>Cheap checks stop most junk before any lookup: ID format (<code>^[0-9]{1,12}$</code>), range checks (IDs below the current max), signed/opaque IDs (an HMAC in the ID so random guesses are rejected), and per-client rate limits. Defence in depth: validation → rate limit → Bloom → negative cache → DB.</p>` }
    ],
    deepDive: `<p><b>Why negative caching alone fails under attack.</b> With uniformly random IDs from a 64-bit space, the chance of repeating an ID is ~0, so the negative cache hit rate is ~0% and it evicts real hot keys (cache pollution). Bloom filters fix the cost side: constant memory per <i>real</i> key, independent of attack volume.</p>
<p><b>Keeping the filter correct.</b> A missing entry in the filter means a <i>real</i> item is rejected — a false negative, which is a correctness bug. So: add to the filter <b>before</b> (or atomically with) committing a new item, rebuild periodically from the DB, and if the filter cannot be trusted (just restarted, rebuilding), bypass it rather than reject. Distributed options: RedisBloom (<code>BF.ADD</code>/<code>BF.EXISTS</code>, scalable filters that grow by adding layers) or a filter shipped to each app server and refreshed.</p>
<p><b>Alternatives:</b> Cuckoo filters support deletion and slightly better space at low FP rates; quotient filters merge well; XOR/binary-fuse filters are smaller but static. Databases use the same idea internally — LSM-tree stores (RocksDB, Cassandra) keep a Bloom filter per SSTable to skip disk reads for absent keys.</p>
<p><b>Avalanche engineering.</b> Spread expiry (jitter), avoid "flush all" operations, use replicas so a node loss is partial, run multi-level caches so an L2 outage still leaves L1 hits, and put a <b>bulkhead</b> on DB access: a fixed pool (say 200 connections) plus load shedding, so the DB serves what it can at full speed rather than everything slowly. Netflix's EVCache replicates each cache across zones so a zone loss does not cold-start the fleet.</p>
<p><b>Observability:</b> track "not found" rate per endpoint, DB QPS from cache misses, Bloom-rejected count and the filter's estimated FP rate (fill ratio); a sudden rise in not-found misses is often an attack or a client bug looping on deleted IDs.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI scrapers and agents generate huge volumes of long-tail, often non-existent lookups (guessing URLs, probing IDs, hallucinated product SKUs), so penetration is now an everyday problem, not just an attack scenario. LLM agents calling your APIs may also retry aggressively — avalanche risk grows with automated clients.</p>
<p><b>Use AI as a partner:</b> <code>Size a Bloom filter for 300M keys at 0.5% FP and estimate how much DB load it removes under 20k random-ID QPS</code>; <code>Generate a load test mixing 70% hot keys, 20% cold keys and 10% non-existent IDs</code>.</p>
<p><b>Where AI goes wrong:</b> claims Bloom filters can have false negatives (they cannot, unless you forget to add items), caches "not found" forever (new items stay invisible), or suggests caching every negative result with no TTL — turning an attack into cache pollution.</p>
<p><b>What you must still own:</b> the threat model (who sends missing keys and why), the false-positive budget, how the filter stays in sync with inserts, and the DB protection (rate limits, circuit breakers) that remains when every cache layer fails.</p>`,
    problems: [{
      title: 'Stop Random-ID Scraping', level: 'Medium', tags: ['penetration', 'Bloom filter', 'negative cache', 'rate limiting'], companies: ['Amazon', 'Cloudflare', 'Shopee'],
      statement: `<p>A scraper hits <code>GET /products/{id}</code> with random IDs at 30k req/s. 99% of those IDs do not exist. The cache hit rate collapses from 95% to 40% and the product DB is overloaded. There are 80M real products, 50k new ones per day. Design the protection.</p>`,
      constraints: `<p>Real users must never get a false 404 · added memory ≤ 1 GB per region · new products must be visible within 5 s.</p>`,
      example: `<p>Without protection: ${H.c('r', '29,700 DB lookups/s')} for missing IDs. With a 1% FP Bloom filter: ${H.c('g', '~297/s')} reach the DB, and those few become negative-cache hits on repeat.</p>`,
      brute: { why: `<p><b>Naive design:</b> negative-cache every not-found with TTL 1 h. Random IDs never repeat, so the negative cache never hits, and 30k junk keys/s × 3600 s = 108M junk entries evicting real products (cache pollution). Blocking IPs alone fails against rotating proxies.</p>` },
      mcq: { q: 'A Bloom filter says "maybe present" for a missing ID. What happens?', options: ['A real user gets a 404 wrongly', 'The request continues to cache/DB and gets a correct not-found', 'The filter is corrupted', 'Redis crashes'], answer: 1, explain: 'False positives only cost one extra lookup; correctness is preserved. Only false negatives (impossible if every insert is added) would hurt users.' },
      hints: [`<p>Hint 1: You need a cheap "definitely not here" check whose memory depends on the 80M real IDs, not on attack volume.</p>`, `<p>Hint 2: Bloom filter with n = 100M (growth room), p = 1% → ~120 MB, k = 7. Check it before the cache.</p>`, `<p>Hint 3: Add new IDs to the filter in the same flow that creates the product (before returning success); short-TTL negative cache for false positives; rate-limit per client/ASN; rebuild the filter nightly.</p>`],
      solution: {
        approach: `<p><b>Layers, cheapest first:</b></p>
<ol><li><b>Validation:</b> reject malformed IDs at the edge (format/range). Optionally make public IDs opaque (e.g. Base62 with an HMAC check digit) so random guesses fail instantly.</li>
<li><b>Rate limiting</b> per client key / IP / ASN at the API gateway; bot detection for the scraper.</li>
<li><b>Bloom filter</b> of all product IDs: n = 100M, p = 1% → ~120 MB, k = 7. Kept in RedisBloom (shared) or loaded into each API server's memory (fastest). Check before the cache: "definitely absent" → 404 immediately.</li>
<li><b>Keeping it fresh:</b> the product-creation service adds the ID to the filter <i>before</i> acknowledging creation; a CDC consumer also adds IDs (belt and braces) so new products are visible within seconds; nightly rebuild from the DB to reset the fill ratio.</li>
<li><b>Negative cache</b> (TTL 60 s) for the ~1% false positives so repeated probes of the same ID are cheap; deleted on product creation.</li>
<li><b>DB bulkhead:</b> fixed connection pool + load shedding so the DB can never be pushed over regardless of layers above.</li></ol>
<p>Result: missing-ID DB traffic drops ~100×, the cache stays full of real products (hit rate back to ~95%), memory cost ~120 MB per copy.</p>`,
        complexity: `<p>Bloom check: k = 7 hash computations, O(1), no network if local. Memory ≈ 9.6 bits × 100M ≈ 120 MB. FP traffic ≈ 1% of junk requests.</p>`,
        followUps: ['Products get deleted often — what changes?', 'How do you rebuild the filter without a window of false negatives?', 'How would a Cuckoo filter compare here?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Multi-level caches + sizing with hit-rate math
     ===================================================================== */
  function genHarmonic(n, s) {
    // sum_{i=1..n} i^-s : exact for the first 5000 terms, midpoint integral for the tail
    var a = Math.min(n, 5000), sum = 0, i;
    for (i = 1; i <= a; i++) sum += Math.pow(i, -s);
    if (n > a) {
      var lo = a + 0.5, hi = n + 0.5;
      sum += Math.abs(s - 1) < 1e-9 ? Math.log(hi / lo) : (Math.pow(hi, 1 - s) - Math.pow(lo, 1 - s)) / (1 - s);
    }
    return sum;
  }
  topics.push({
    title: 'Multi-Level Caches & Sizing with Hit-Rate Math',
    analogy: `<p>Think of where you keep <b>snacks</b>: a few in your <b>pocket</b> (instant), more in your <b>desk drawer</b> (a few seconds), a box in the <b>office kitchen</b> (a minute), and the <b>supermarket</b> (half an hour). You reach for the closest place first and only go further when it is empty. Each level is bigger and slower than the one before. And the question "how big should my drawer be?" has a math answer: big enough to hold the snacks you eat <i>most often</i> — the rest are not worth the space.</p>`,
    explain: `<p>Real systems stack several caches. A request stops at the <b>first level that has the answer</b>:</p>
${H.table(['Level', 'Where', 'Latency to user', 'Size', 'Shared by'], [['Browser / app cache', "user's device (HTTP <code>Cache-Control</code>, ETag)", '0 ms', 'MBs', 'one user'], ['CDN edge (+ origin shield)', 'PoP near the user', '5–30 ms', 'TBs per PoP', 'users in a region'], ['Reverse proxy', 'nginx / Varnish at origin', '+1 ms', 'GBs', 'all users'], ['<b>L1</b> in-process', "app server's heap (Caffeine, a dict)", '~100 ns', '100 MB – few GB', 'one server'], ['<b>L2</b> distributed', 'Redis / Memcached cluster', '~0.5 ms', '10s – 1000s GB', 'whole fleet'], ['DB buffer pool / page cache', 'inside the database host', 'ms', 'RAM of DB', 'the DB'], ['Disk / object store', 'source of truth', '5 ms – 100 ms', 'unbounded', '—']])}
<p><b>Combined hit rate:</b> if each level catches a fraction <i>h<sub>i</sub></i> of what reaches it, the fraction reaching the database is <code>(1−h<sub>1</sub>)(1−h<sub>2</sub>)…</code>. Example: CDN 60%, L1 50%, L2 90% → DB sees <code>0.4 × 0.5 × 0.1 = 2%</code> of requests.</p>
<p><b>Effective latency</b> = Σ (fraction served at level i × latency of level i). A 1% change in the hit rate of a slow level often matters more than halving the latency of a fast one.</p>
<p><b>The L1 trade-off:</b> an in-process cache is ~5,000× faster than Redis and absorbs hot keys perfectly, but every server has its <b>own copy</b>: 200 servers = 200 copies to keep fresh. Keep L1 small (hot keys only), give it a short TTL (seconds), and broadcast invalidations (Redis pub/sub, or Redis <b>client-side caching</b> with <code>CLIENT TRACKING</code>, where the server tells clients which keys changed).</p>
<p><b>Sizing a cache</b> — three questions:</p>
<ol><li><b>Working set:</b> how many distinct keys are requested in a TTL window? Only those need to fit.</li>
<li><b>Popularity skew:</b> real traffic is roughly <b>Zipf</b>-distributed — the k-th most popular key gets traffic ∝ 1/k<sup>s</sup> (s ≈ 0.7–1.1). So caching the top 10% of keys often yields 70–90% hit rate, and each extra GB helps less (diminishing returns).</li>
<li><b>Bytes:</b> memory ≈ keys × (key + value + ~50–100 B overhead) × 1.2–1.5 (fragmentation, growth) × replicas.</li></ol>
<p>Pick the size where the curve flattens and the miss rate keeps the DB comfortably within capacity.</p>`,
    clues: ['"hot key gets 500k QPS" → L1 in-process cache in front of Redis', '"global users, static or semi-static content" → CDN edge + origin shield', '"how much memory does the cache need?" → working set × object size × overhead, using hit-rate curve', '"DB can handle 5k QPS, traffic is 200k QPS" → required hit rate ≥ 97.5%', '"80% of traffic goes to 20% of items" → Zipf/power-law: a small cache gives a high hit rate', '"200 app servers each cache config locally" → L1 coherence: short TTL + pub/sub invalidation'],
    code: [{ lang: 'python', run: true, title: 'Size a cache with hit-rate math (runnable)', code: `# 1) Required hit rate from capacity
total_qps, db_capacity_qps = 200_000, 5_000
required = 1 - db_capacity_qps / total_qps
print(f"DB can take {db_capacity_qps:,} of {total_qps:,} QPS -> need hit rate >= {required:.1%}")

# 2) Zipf popularity: what hit rate do we get by caching the top C of N keys?
N, s = 1_000_000, 0.99
weights = [1 / (i ** s) for i in range(1, N + 1)]
total = sum(weights)
prefix, running = {}, 0.0
targets = {N // 1000, N // 100, N // 20, N // 10, N // 5, N // 2}
for i, w in enumerate(weights, start=1):
    running += w
    if i in targets:
        prefix[i] = running / total

value_bytes, key_bytes, overhead = 2_048, 40, 80
print(f"\\n{'cached keys':>12} {'share':>7} {'hit rate':>9} {'memory':>10}")
for c in sorted(prefix):
    mem_mb = c * (value_bytes + key_bytes + overhead) * 1.3 / 1e6   # x1.3 fragmentation/headroom
    print(f"{c:>12,} {c / N:>7.1%} {prefix[c]:>9.1%} {mem_mb:>7.0f} MB")

# 3) Multi-level: fraction reaching the DB and effective latency
levels = [("CDN", 0.60, 20.0), ("L1", 0.50, 60.0), ("L2", 0.90, 60.5)]   # (name, hit rate, ms when served here)
db_ms = 70.5
remaining, latency = 1.0, 0.0
for name, h, ms in levels:
    served = remaining * h
    latency += served * ms
    remaining -= served
    print(f"{name}: serves {served:.1%} of all requests")
latency += remaining * db_ms
print(f"DB sees {remaining:.1%} of traffic; average latency = {latency:.1f} ms")` }],
    codeTitle: ['Hit-rate & memory sizing'],
    viz: [{
      title: 'Multi-level cache: how 10,000 requests trickle down the layers',
      input: '10000 | browser=0.3 cdn=0.6 l1=0.5 l2=0.9',
      inputLabel: 'requests | hit rate per layer (0–1)',
      gen: function (input) {
        var sp = String(input || '').split('|');
        if (sp.length !== 2) throw new Error('Format: N | browser=0.3 cdn=0.6 l1=0.5 l2=0.9');
        var n = parseInt(sp[0], 10);
        if (!(n >= 10 && n <= 1e7)) throw new Error('N must be between 10 and 10,000,000');
        var rates = { browser: 0, cdn: 0, l1: 0, l2: 0 };
        sp[1].trim().split(/\s+/).forEach(function (kv) {
          var m = /^(browser|cdn|l1|l2)=([0-9.]+)$/i.exec(kv);
          if (!m) throw new Error('Use browser=0.3 cdn=0.6 l1=0.5 l2=0.9');
          var v = parseFloat(m[2]); if (!(v >= 0 && v <= 1)) throw new Error('Hit rates must be between 0 and 1');
          rates[m[1].toLowerCase()] = v;
        });
        var layers = [['U', 'browser', 'Browser cache', 0], ['E', 'cdn', 'CDN edge', 20], ['L1', 'l1', 'App L1 (in-process)', 60], ['L2', 'l2', 'Redis L2', 60.5]];
        var dbMs = 70.5, frames = [], remaining = n, served = [], lat = 0, reach = [];
        function g(hl, ehl, lab) { return { type: 'graph', directed: true, height: 40, label: 'Request path (closest level first)', nodes: [box('U', 'Browser', 6, 20), box('E', 'CDN edge', 29, 20), box('L1', 'App L1', 52, 20), box('L2', 'Redis L2', 74, 20), box('D', 'Database', 95, 20)], edges: [['U', 'E', lab.UE || ''], ['E', 'L1', lab.EL1 || ''], ['L1', 'L2', lab.L1L2 || ''], ['L2', 'D', lab.L2D || '']], hl: hl, ehl: ehl }; }
        frames.push({ narr: '<b>' + n.toLocaleString() + '</b> requests start at the user\'s browser. Each layer answers what it can (hit) and passes the rest (miss) to the next, slower layer.', parts: [g({ U: 'cur' }, {}, {}), { type: 'vars', label: 'Hit rate per layer', vals: { browser: rates.browser, cdn: rates.cdn, l1: rates.l1, l2: rates.l2 } }] });
        var nextId = { U: 'E', E: 'L1', L1: 'L2', L2: 'D' };
        layers.forEach(function (L) {
          reach.push(Math.round(remaining));
          var hits = remaining * rates[L[1]], miss = remaining - hits;
          served.push(Math.round(hits)); lat += hits * L[3];
          var hl = {}; hl[L[0]] = hits >= miss ? 'ok' : 'bad'; var eh = {}; eh[L[0] + '-' + nextId[L[0]]] = 'bad'; var lab = {}; lab[L[0] + nextId[L[0]]] = Math.round(miss).toLocaleString() + ' miss';
          frames.push({ narr: '<b>' + L[2] + '</b> receives ' + Math.round(remaining).toLocaleString() + ' requests, hits <span class="c-g">' + Math.round(hits).toLocaleString() + '</span> (' + Math.round(rates[L[1]] * 100) + '%) served in ~' + L[3] + ' ms, and passes <span class="c-r">' + Math.round(miss).toLocaleString() + '</span> misses down.', parts: [g(hl, eh, lab), { type: 'bars', label: 'Requests reaching each level so far', values: reach.slice(), idxLabels: layers.slice(0, reach.length).map(function (x) { return x[1]; }), hl: (function () { var h = {}; h[reach.length - 1] = 'cur'; return h; })() }] });
          remaining = miss;
        });
        reach.push(Math.round(remaining)); lat += remaining * dbMs;
        frames.push({ narr: 'The <b>database</b> receives only <b>' + Math.round(remaining).toLocaleString() + '</b> of ' + n.toLocaleString() + ' requests (' + pct(remaining, n) + ') — the product of all the miss rates.', parts: [g({ D: remaining / n > 0.1 ? 'bad' : 'ok' }, {}, {}), { type: 'bars', label: 'Requests reaching each level', values: reach.slice(), idxLabels: ['browser', 'cdn', 'l1', 'l2', 'db'], hl: { 4: remaining / n > 0.1 ? 'bad' : 'ok' } }] });
        frames.push({ narr: 'Effective average latency = Σ(share × latency) = <b>' + (lat / n).toFixed(1) + ' ms</b>. Compare: with no caches every request would cost ~' + dbMs + ' ms. Raise one hit rate in the input and watch the DB bar shrink.', parts: [{ type: 'table', label: 'Where requests were answered', columns: ['level', 'served', 'share', 'latency each'], rows: layers.map(function (L, i) { return [L[2], served[i].toLocaleString(), pct(served[i], n), L[3] + ' ms']; }).concat([['Database', Math.round(remaining).toLocaleString(), pct(remaining, n), dbMs + ' ms']]), hl: { 4: 'sel' } }, { type: 'vars', label: 'Result', vals: { 'avg latency': (lat / n).toFixed(1) + ' ms', 'DB share': pct(remaining, n) }, hl: { 'avg latency': 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Sizing: Zipf hit-rate curve (diminishing returns)',
      input: 'keys=10000000 s=0.9 kb=2',
      inputLabel: 'keys=N s=skew(0.5–1.5) kb=avg value size',
      gen: function (input) {
        var m = /keys=(\d+)\s+s=([0-9.]+)\s+kb=([0-9.]+)/i.exec(String(input || ''));
        if (!m) throw new Error('Format: keys=10000000 s=0.9 kb=2');
        var N = +m[1], s = +m[2], kb = +m[3];
        if (!(N >= 1000 && N <= 1e10)) throw new Error('keys must be 1,000 – 10,000,000,000');
        if (!(s >= 0.5 && s <= 1.5)) throw new Error('s must be 0.5 – 1.5');
        if (!(kb > 0 && kb <= 1024)) throw new Error('kb must be 0 – 1024');
        var total = genHarmonic(N, s), shares = [0.001, 0.01, 0.05, 0.1, 0.2, 0.5], vals = [], labs = [], frames = [], rows = [];
        frames.push({ narr: 'Popularity follows <b>Zipf(s = ' + s + ')</b>: the k-th most popular key gets traffic ∝ 1/k<sup>' + s + '</sup>. If we cache the top C keys, hit rate = (traffic of top C) ÷ (total traffic). Let us grow C.', parts: [{ type: 'vars', label: 'Inputs', vals: { 'distinct keys': N.toLocaleString(), skew: s, 'value size': kb + ' KB', 'per-key overhead': '~100 B' } }] });
        shares.forEach(function (f, i) {
          var c = Math.max(1, Math.round(N * f)), hr = genHarmonic(c, s) / total, gb = c * (kb * 1024 + 100) * 1.3 / 1e9;
          vals.push(Math.round(hr * 1000) / 10); labs.push((f * 100) + '%');
          rows.push([(f * 100) + '%', c.toLocaleString(), (hr * 100).toFixed(1) + '%', gb.toFixed(gb < 10 ? 2 : 0) + ' GB']);
          var gain = i ? (vals[i] - vals[i - 1]).toFixed(1) : vals[0];
          frames.push({ narr: 'Cache the top <b>' + (f * 100) + '%</b> (' + c.toLocaleString() + ' keys, ≈ ' + gb.toFixed(gb < 10 ? 2 : 0) + ' GB with overhead) → hit rate <b>' + (hr * 100).toFixed(1) + '%</b>' + (i ? ' (+' + gain + ' points for ' + (f / shares[i - 1]).toFixed(0) + '× the memory).' : '.'), parts: [{ type: 'bars', label: 'hit rate (%) vs share of keys cached', values: vals.slice(), idxLabels: labs.slice(), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }, { type: 'table', label: 'Sizing table', columns: ['share cached', 'keys', 'hit rate', 'memory'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }] });
        });
        frames.push({ narr: 'Notice the <b>diminishing returns</b>: the first sliver of keys buys most of the hit rate; going from 20% to 50% of keys costs 2.5× memory for a few points. Choose the smallest size whose miss traffic your DB can absorb (e.g. DB handles 5% of QPS → need ≥ 95%).', parts: [{ type: 'bars', label: 'hit rate (%) vs share of keys cached', values: vals.slice(), idxLabels: labs.slice(), hl: { 3: 'sel' } }, { type: 'table', label: 'Sizing table', columns: ['share cached', 'keys', 'hit rate', 'memory'], rows: rows.map(function (r) { return r.slice(); }) }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Size a cache end to end', html: `<p>Requirements: 120k read QPS, DB safe at 6k QPS, 50M items, 1.5 KB each, Zipf s ≈ 1.</p>${H.table(['Step', 'Math', 'Result'], [['Required hit rate', '1 − 6k / 120k', '<b>≥ 95%</b>'], ['Keys needed (Zipf s=1, 50M keys)', 'H(C)/H(N) ≈ ln C / ln N: top 10% → ≈ 87%, top 20% → ≈ 91%, top 40% → ≈ 95%', '<b>≈ 20M keys</b>'], ['Bytes', '20M × (1.5 KB + 0.1 KB) × 1.3', '<b>≈ 42 GB</b>'], ['Topology', '42 GB × 2 (replica) ÷ 6 shards', '<b>~14 GB RAM per node</b>']])}<p>Then validate with real traces: measure the hit-rate curve (e.g. by simulating the access log, or Redis <code>keyspace_hits/misses</code> while varying maxmemory).</p>` },
      { title: 'Little\'s Law sanity check on the cache cluster', html: `<p>120k QPS × 0.5 ms average Redis latency = <b>60 concurrent requests</b> in flight at the cache tier. One Redis shard handles ~100k+ simple ops/s, so 6 shards give generous headroom — the cluster is sized by <b>memory</b>, not throughput. For hot keys it is the opposite: one key's QPS lands on one shard, so add L1.</p>` },
      { title: 'L1 + L2 coherence via pub/sub', html: `<p>Each app server keeps an L1 (Caffeine, 10k entries, TTL 10 s). On write: update DB → <code>DEL</code> in Redis → <code>PUBLISH invalidate user:42</code>. Every server subscribes and evicts <code>user:42</code> from its L1. Pub/sub is fire-and-forget (a disconnected server misses messages), so the 10 s L1 TTL bounds staleness anyway. Redis 6+ client-side caching (<code>CLIENT TRACKING ON</code>) automates this: the server remembers which keys each client read and pushes invalidation messages.</p>` },
      { title: 'HTTP caching headers as a cache layer', html: `${H.table(['Header', 'Meaning'], [['<code>Cache-Control: public, max-age=300</code>', 'browser + CDN may reuse for 5 min'], ['<code>s-maxage=3600</code>', 'shared caches (CDN) use 1 h; browsers use max-age'], ['<code>stale-while-revalidate=60</code>', 'serve stale up to 60 s while refreshing in background'], ['<code>ETag</code> + <code>If-None-Match</code>', 'revalidate cheaply: <code>304 Not Modified</code> with no body'], ['<code>private, no-store</code>', 'personal or sensitive data: never in shared caches']])}` }
    ],
    deepDive: `<p><b>Inclusive vs exclusive levels.</b> Most web stacks are <i>inclusive</i> by accident: the same hot object sits in CDN, L1 and L2, wasting memory but making each level independently useful. CPU caches choose deliberately (some L3s are exclusive). For app caches, inclusive is fine — L1 is small and only holds the hottest keys.</p>
<p><b>Hit-rate curves from real traces.</b> Instead of guessing Zipf parameters, compute a <b>miss-ratio curve</b> from an access log using stack distances (Mattson's algorithm: for LRU, a request hits in any cache larger than its reuse distance). Tools like SHARDS sample the trace so it runs in constant memory. This answers "what if we double the cache?" before buying RAM.</p>
<p><b>Admission matters at every level.</b> A CDN should not cache one-hit wonders (most long-tail objects are requested once) — "cache on second hit" or TinyLFU admission raises hit rates of byte-limited caches. L1 should only hold keys above a popularity threshold.</p>
<p><b>Latency tails and request fan-out.</b> A page that needs 50 cache lookups in parallel sees the <i>max</i> of 50 latencies; if each lookup has a 1% chance of 50 ms (a miss or GC pause), ~40% of pages hit the slow tail (1 − 0.99<sup>50</sup>). Multi-level caching, batching (<code>MGET</code>) and hedged requests reduce the tail.</p>
<p><b>Cost model.</b> RAM is the expensive part: an extra 100 GB of Redis may cost far less than the DB replicas it avoids — or far more if the extra hit rate is 0.3 points. Compute "DB QPS saved per GB" at the margin and stop where it drops below the DB's cost per QPS.</p>
<p><b>Warm vs cold L1.</b> Rolling deploys restart servers with empty L1s; with 200 servers deploying 10 at a time, L2 sees a modest bump — but a full fleet restart shifts all hot-key traffic to Redis at once (plan capacity for it).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI applications add new levels to the hierarchy: <b>provider-side prompt caching</b> (reusing the computed prefix of long prompts for a fraction of the price), <b>exact-match response caches</b> keyed by a hash of model + prompt + parameters, <b>semantic caches</b> (embedding similarity lookup — a hit when a new question is "close enough" to a cached one, with a tunable similarity threshold that trades accuracy for hit rate), and embedding caches. The same hit-rate math decides whether they pay off — but a miss now costs dollars, not milliseconds.</p>
<p><b>Use AI as a partner:</b> <code>Given this access log sample, fit a Zipf exponent and produce a hit-rate vs memory table</code>; <code>Compute cost saved per month for a semantic cache at 30% hit rate on 2M LLM calls/day</code>.</p>
<p><b>Where AI goes wrong:</b> adds hit rates instead of multiplying miss rates, ignores per-key overhead and replicas when sizing, assumes uniform popularity, or proposes a semantic cache for personalised or time-sensitive answers (wrong answers served to the wrong user).</p>
<p><b>What you must still own:</b> the latency/cost budget per level, what each level may cache (privacy: never put per-user data in a shared CDN cache), and the coherence story across levels.</p>`,
    problems: [{
      title: 'Size the Cache for a URL Shortener', level: 'Medium', tags: ['sizing', 'hit rate', 'Zipf', 'multi-level'], companies: ['Bitly', 'Google', 'Microsoft'],
      statement: `<p>A URL shortener stores 2 billion short links (key 8 B, long URL avg 120 B). Redirect traffic: 300k reads/s average, 1M/s peak. The database cluster can serve 20k reads/s. Traffic is heavily skewed: ~90% of clicks go to links created in the last week, and popularity is roughly Zipf (s ≈ 1). Decide the caching layers and the cache size.</p>`,
      constraints: `<p>p99 redirect &lt; 50 ms globally · DB ≤ 20k QPS at peak · links never change after creation (except deletion for abuse).</p>`,
      example: `<p>Required hit rate at peak: ${H.c('b', '1 − 20k / 1M = 98%')}. Caching all 2B links: 2B × ~250 B ≈ ${H.c('r', '500 GB+')}. Caching the hot 100M: ≈ ${H.c('g', '25–35 GB')}.</p>`,
      brute: { why: `<p><b>Naive design:</b> "cache everything in Redis" → 2B × (8 + 120 + ~100 overhead) × 1.3 ≈ 600 GB of RAM, ×2 for replicas — expensive, and most of those links are never clicked again. Or "cache nothing, scale the DB" → 50 DB replicas to absorb 1M QPS.</p>` },
      mcq: { q: 'Links are immutable once created. What does that mean for invalidation?', options: ['Very short TTLs are mandatory', 'Long TTLs are safe; only abuse deletions need explicit invalidation', 'Write-back is required', 'You cannot use a CDN'], answer: 1, explain: 'Immutable data is the easiest case: cache long, purge explicitly on the rare deletion.' },
      hints: [`<p>Hint 1: Start from the required hit rate (98% at peak) and the skew (recent + Zipf).</p>`, `<p>Hint 2: Layer it: CDN/edge caching of 301/302 responses for the hottest links, L1 in-process for the top few thousand, Redis L2 for the hot 5%.</p>`, `<p>Hint 3: Memory per entry ≈ 8 + 120 + ~100 overhead ≈ 230 B; ×1.3 headroom. Use allkeys-lfu so long-lived popular links stay. Abuse deletions → DEL + CDN purge.</p>`],
      solution: {
        approach: `<p><b>1. Required hit rate:</b> peak 1M QPS, DB budget 20k → combined hit rate ≥ 98%.</p>
<p><b>2. Layers:</b></p>
<ul><li><b>CDN edge</b> caches redirect responses (<code>Cache-Control: public, max-age=86400</code> on 301/302 for non-tracked links). Viral links are absorbed at the edge: say 50% of traffic.</li>
<li><b>L1 in-process</b> on each redirect server: top ~100k links (≈ 25 MB), TTL 10 min — handles hot keys without hitting one Redis shard.</li>
<li><b>Redis L2</b>: ~90% of clicks go to last week's links (~50M), and the older 10% is itself Zipf-skewed, so caching ~100M links (last week + the hottest older ones, 5% of all keys) should catch ≈ 95% of the traffic reaching it (verify with a trace simulation). 100M × ~230 B × 1.3 ≈ <b>30 GB</b> → 4 shards × ~8 GB primaries + replicas. Policy <code>allkeys-lfu</code>; TTL 7 days with jitter (immutable data, TTL only for memory hygiene).</li></ul>
<p><b>3. Check the math:</b> edge 50% → 500k reach origin; L1 40% → 300k; Redis 95% → 15k reach the DB ≤ 20k budget. Latency: edge hits ~10–20 ms, origin hits ~30–40 ms, DB path ~45 ms → p99 within 50 ms.</p>
<p><b>4. Invalidation:</b> links never change; on abuse deletion: DB tombstone → DEL Redis key → pub/sub L1 evict → CDN purge by URL. <b>Penetration:</b> random short codes are common (bots) — Bloom filter of existing codes (2B keys at 1% ≈ 2.4 GB) or negative cache with short TTL.</p>`,
        complexity: `<p>Redis ≈ 30 GB (×2 with replicas); L1 ≈ 25 MB per server; DB peak ≈ 15k QPS. Each redirect: O(1) lookups across levels.</p>`,
        followUps: ['Analytics needs every click counted — how does CDN caching affect that?', 'A link goes viral in one region — which layer absorbs it?', 'How do you measure the real hit-rate curve before buying RAM?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Hit Rate → Database Load', level: 'Easy', tags: ['hit rate', 'estimation'], companies: ['Amazon', 'Google'],
    statement: `<p>A service handles 80,000 read QPS. The database can safely serve 4,000 QPS. Each cache hit costs 0.4 ms, each DB read 12 ms (a miss costs both). (a) What minimum hit rate is needed? (b) What is the average read latency at a 97% hit rate? (c) What happens to DB load if the hit rate drops to 90%?</p>`,
    constraints: `<p>Assume all misses go to the DB; ignore write traffic.</p>`,
    example: `<p>${H.c('b', '(a)')} 1 − 4,000/80,000 = <b>95%</b>. ${H.c('b', '(b)')} 0.4 + 0.03 × 12 = <b>0.76 ms</b>. ${H.c('r', '(c)')} 80,000 × 0.10 = <b>8,000 QPS</b> — twice what the DB can take.</p>`,
    brute: { why: `<p><b>Naive reasoning:</b> "97% vs 90% is only 7 points, it barely matters." Wrong: the DB sees the <i>miss</i> rate, which goes from 3% to 10% — a 3.3× increase. Always reason in miss rates when talking about backend load.</p>` },
    mcq: { q: 'Hit rate goes from 99% to 98%. DB load…', options: ['drops 1%', 'rises 1%', 'doubles', 'stays the same'], answer: 2, explain: 'Miss rate goes from 1% to 2% — twice as many requests reach the DB.' },
    hints: [`<p>Hint 1: DB QPS = total QPS × miss rate. Set that ≤ capacity and solve for the hit rate.</p>`, `<p>Hint 2: Average latency = cache latency (always paid) + miss rate × DB latency.</p>`, `<p>Hint 3: Compare miss rates (3% vs 10%) rather than hit rates to see the real change in load.</p>`],
    solution: {
      approach: `<p>(a) DB load = 80,000 × (1 − h) ≤ 4,000 → 1 − h ≤ 0.05 → <b>h ≥ 95%</b>.</p><p>(b) Every request checks the cache (0.4 ms); 3% also go to the DB (12 ms): 0.4 + 0.03 × 12 = <b>0.76 ms</b> average. Without a cache, 12 ms. Note p99 is still ≈ 12.4 ms because the slowest 3% are misses — averages hide tails.</p><p>(c) At 90%: 80,000 × 0.1 = <b>8,000 QPS</b>, 2× DB capacity → queueing, timeouts, likely an outage. Design implication: alert on hit-rate drops, protect the DB with a concurrency limit / load shedding, and keep headroom (target 97–98% so that a dip to 95% is survivable).</p>`,
      complexity: `<p>Pure arithmetic: DB QPS = QPS × (1 − h); latency = t<sub>cache</sub> + (1 − h)·t<sub>db</sub>.</p>`,
      followUps: ['How does p99 latency relate to the miss rate?', 'What hit rate is needed if traffic doubles next year?']
    }
  });
  practice.push({
    title: 'Choose a TTL for a Weather API Cache', level: 'Easy', tags: ['TTL', 'third-party API', 'cache-aside'], companies: ['Uber', 'Booking.com'],
    statement: `<p>Your app shows current weather for a city. A third-party weather API charges $1 per 1,000 calls and allows 50 calls/s. Weather data updates every 10 minutes upstream. You have 2,000 cities and 30k weather views/s. Design the cache and pick a TTL.</p>`,
    constraints: `<p>Weather may be up to 10 minutes old · stay under the API rate limit · minimise cost.</p>`,
    example: `<p>No cache: 30,000 calls/s → ${H.c('r', '$2.6M/day and 600× over the rate limit')}. Cache per city with TTL 10 min: ≤ 2,000 calls / 10 min ≈ ${H.c('g', '3.3 calls/s, ≈ $290/day')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> call the API on every page view — blows the rate limit instantly and costs millions. A TTL of 10 s would still cost 200 calls/s and break the limit; a TTL of 24 h shows wrong weather.</p>` },
    mcq: { q: 'What is the natural cache key?', options: ['user ID', 'city ID (or rounded lat/long)', 'request timestamp', 'session ID'], answer: 1, explain: 'Weather is the same for everyone in a city — keying by user would destroy the hit rate.' },
    hints: [`<p>Hint 1: Key by what determines the answer: the city, not the user.</p>`, `<p>Hint 2: TTL = upstream update interval (10 min). Add jitter so 2,000 cities do not refresh in the same second.</p>`, `<p>Hint 3: Protect against stampedes on popular cities with single-flight, and serve stale data if the API is down (stale-if-error).</p>`],
    solution: {
      approach: `<p><b>Cache-aside in Redis</b>, key <code>weather:{cityId}</code>, value = compact JSON, <b>TTL = 600 s ± 60 s jitter</b> (matches upstream freshness; jitter spreads refreshes). Expected API calls ≈ 2,000 cities per 10 min ≈ 3.3/s — far below the 50/s limit, about 290k calls/day ≈ $290.</p><p><b>Extras:</b> single-flight + Redis lock per city so a popular city expiring does not trigger many simultaneous API calls; <b>stale-if-error</b>: keep a second copy with a 24 h TTL and serve it (marked "updated 25 min ago") if the API fails or rate-limits; a background refresher for the top 100 cities (refresh-ahead) so they never miss. HTTP layer: <code>Cache-Control: public, max-age=300</code> lets the CDN and browsers absorb repeat views too.</p>`,
      complexity: `<p>API calls ≈ cities / TTL (independent of traffic). Memory ≈ 2,000 × ~1 KB = 2 MB.</p>`,
      followUps: ['Users can search any lat/long, not just 2,000 cities — how do you key it?', 'How do you show "last updated" honestly?']
    }
  });
  practice.push({
    title: 'Where Do Sessions Live?', level: 'Easy', tags: ['sessions', 'Redis', 'Memcached', 'stateless'], companies: ['Microsoft', 'Salesforce'],
    statement: `<p>A web app with 20 servers behind a load balancer stores login sessions in each server's memory, so users get logged out when the load balancer sends them to a different server or a server restarts. Fix it. Compare sticky sessions, Memcached and Redis.</p>`,
    constraints: `<p>5M active sessions × 1 KB · 30-minute idle expiry · servers deploy several times a day.</p>`,
    example: `<p>User logs in on ${H.c('b', 'server 3')}; next request goes to ${H.c('b', 'server 11')} → no session → ${H.c('r', 'logged out')}. With a shared Redis session store, any server finds <code>sess:abc</code>.</p>`,
    brute: { why: `<p><b>Naive fix:</b> sticky sessions on the load balancer. Users still lose sessions on every deploy/restart of "their" server, load spreads unevenly, and scaling in kills sessions. It hides the statefulness instead of removing it.</p>` },
    mcq: { q: 'Why is Redis usually preferred over Memcached for sessions?', options: ['Memcached is slower', 'Redis offers replication/persistence so a node loss does not log everyone out', 'Memcached has no TTL', 'Redis is multi-threaded'], answer: 1, explain: 'Both have TTLs and are fast; Redis replicas + failover (and optional AOF) keep sessions through failures.' },
    hints: [`<p>Hint 1: Make the app servers stateless — session data must live somewhere every server can reach.</p>`, `<p>Hint 2: 5M × 1 KB ≈ 5 GB + overhead — fits a small Redis primary + replica. Use a hash per session with a TTL refreshed on activity.</p>`, `<p>Hint 3: Consider signed tokens (JWT) for stateless auth, but note revocation needs a server-side check anyway.</p>`],
    solution: {
      approach: `<p>Move sessions to a <b>shared Redis</b> (primary + replica, Sentinel or a managed service for automatic failover). Key <code>sess:{randomId}</code> (128-bit random, in an HttpOnly Secure cookie), value = hash of user ID, roles, CSRF token; <code>EXPIRE sess:… 1800</code> refreshed on each request (sliding expiry). Memory ≈ 5M × (1 KB + overhead) ≈ 6–7 GB. App servers become stateless → any server can handle any request, deploys and autoscaling no longer log people out.</p><p><b>Memcached</b> would work for speed and TTL, but a node failure logs out the users whose sessions hashed to it, and there is no replication. <b>Sticky sessions</b> are only a stopgap. <b>JWT</b> avoids the lookup but cannot be revoked instantly without a deny-list (which is again a cache) — common hybrid: short-lived JWT + Redis-backed refresh/revocation.</p>`,
      complexity: `<p>One Redis round trip (~0.5 ms) per request; ~7 GB RAM ×2 for the replica.</p>`,
      followUps: ['How do you log a user out of all devices?', 'What if the session store is down — fail open or closed?']
    }
  });
  practice.push({
    title: 'Redis Returns OOM on Writes', level: 'Easy', tags: ['eviction', 'maxmemory', 'operations'], companies: ['Stripe', 'Atlassian'],
    statement: `<p>Your cache-aside Redis suddenly makes every <code>SET</code> fail with <code>OOM command not allowed when used memory &gt; 'maxmemory'</code>. Reads still work. The DB load has tripled because nothing new can be cached. Explain the cause and the fix.</p>`,
    constraints: `<p>Redis 7, <code>maxmemory 16gb</code>, default config otherwise · all keys are disposable cache entries · some were written without TTL.</p>`,
    example: `<p><code>CONFIG GET maxmemory-policy</code> → ${H.c('r', 'noeviction')}. Memory = 16 GB. New keys cannot be written, so every miss stays a miss.</p>`,
    brute: { why: `<p><b>Naive fix:</b> keep raising <code>maxmemory</code> or <code>FLUSHALL</code>. Raising memory just delays the next outage (and can push the box into swap/OOM-kill); flushing causes an avalanche of misses onto an already stressed DB.</p>` },
    mcq: { q: 'Best policy for a pure cache where all keys are disposable?', options: ['noeviction', 'volatile-ttl', 'allkeys-lru or allkeys-lfu', 'volatile-random'], answer: 2, explain: 'allkeys-* can evict any key; volatile-* would never evict the keys written without a TTL.' },
    hints: [`<p>Hint 1: Check the eviction policy — the default <code>noeviction</code> refuses writes when full.</p>`, `<p>Hint 2: For a pure cache use <code>allkeys-lru</code> or <code>allkeys-lfu</code>. <code>volatile-*</code> would not help with keys lacking TTLs.</p>`, `<p>Hint 3: Also add TTLs to every key, leave memory headroom for fragmentation and replication buffers, and alert on <code>used_memory</code> and <code>evicted_keys</code>.</p>`],
    solution: {
      approach: `<p><b>Cause:</b> Redis' default <code>maxmemory-policy</code> is <code>noeviction</code>: once memory reaches <code>maxmemory</code>, write commands return OOM. Keys without a TTL accumulated forever, so the instance filled up and stopped accepting new cache entries — hit rate collapsed and DB load tripled.</p><p><b>Fix now:</b> <code>CONFIG SET maxmemory-policy allkeys-lfu</code> (or <code>allkeys-lru</code>) and persist it in the config/managed parameter group. Redis immediately starts evicting cold keys and SETs succeed.</p><p><b>Fix properly:</b> enforce a TTL on every cache write (code review rule / client wrapper), keep <code>maxmemory</code> at ~75% of RAM to leave room for fragmentation, client buffers and fork copy-on-write, dashboards for <code>used_memory</code>, <code>evicted_keys</code>, <code>keyspace_hits/misses</code>, and alert before the limit. If the same Redis also stores data that must not be evicted, split it into a separate instance.</p>`,
      complexity: `<p>Eviction runs on writes, sampling <code>maxmemory-samples</code> keys each time: O(samples) per eviction.</p>`,
      followUps: ['When is noeviction the right policy?', 'Why can Redis use more RAM than maxmemory?']
    }
  });
  practice.push({
    title: 'Cache a Personalized News Feed', level: 'Medium', tags: ['feed', 'cache-aside', 'precompute', 'invalidation'], companies: ['Meta', 'LinkedIn', 'Twitter/X'],
    statement: `<p>Users open their home feed (top 50 posts from people they follow, ranked). Building it takes 300 ms (fetch follows, recent posts, rank). 100M daily users, 50k feed loads/s at peak. Posts are created at 5k/s. Design the caching so feeds load in &lt; 100 ms and new posts appear within a minute.</p>`,
    constraints: `<p>Average user follows 200 accounts · a few accounts have 50M followers · feed freshness ≤ 60 s.</p>`,
    example: `<p>Cache the whole ranked feed per user (<code>feed:{uid}</code>, 50 post IDs ≈ 400 B). ${H.c('g', 'Hit')} → hydrate 50 posts from <code>post:{id}</code> via MGET (~2 ms). ${H.c('r', 'Miss')} → 300 ms build.</p>`,
    brute: { why: `<p><b>Naive design:</b> cache rendered feed HTML per user with a 1-hour TTL → stale for an hour; or invalidate every follower's feed on each new post → a celebrity post triggers 50M deletes (and 50M rebuilds).</p>` },
    mcq: { q: 'Why store post IDs in the feed cache rather than full post objects?', options: ['IDs are prettier', 'Edits/likes on a post then need one invalidation (post:{id}), not millions of feed entries', 'Redis cannot store JSON', 'It is required by the CDN'], answer: 1, explain: 'Normalise: list caches hold IDs; objects live under their own keys with their own invalidation.' },
    hints: [`<p>Hint 1: Separate the <b>list</b> (which post IDs) from the <b>objects</b> (post content, author name, counts).</p>`, `<p>Hint 2: Fan-out on write for normal authors (push the new post ID into followers' cached feed lists), fan-out on read for celebrities (merge their recent posts at read time).</p>`, `<p>Hint 3: TTL the feed list (e.g. 60 s soft, hours hard) and only keep feeds for active users; hydrate posts with MGET; L1 cache celebrity posts.</p>`],
    solution: {
      approach: `<p><b>Two kinds of keys:</b> <code>feed:{uid}</code> = Redis list/sorted set of ~500 candidate post IDs; <code>post:{id}</code> = post object (cache-aside, TTL 1 h, invalidated on edit). Counters (likes) separately with write-back.</p><p><b>Write path (hybrid fan-out):</b> on a new post by a normal author, a worker reads the author's followers and <code>ZADD</code>s the post ID into each <i>active</i> follower's feed (bounded with <code>ZREMRANGEBYRANK</code>). Authors with &gt; 100k followers are <b>not</b> fanned out.</p><p><b>Read path:</b> <code>ZREVRANGE feed:{uid} 0 199</code> + merge recent posts of the celebrities the user follows (those posts are hot and live in an L1 cache on every server) → rank → take 50 → <code>MGET post:{ids}</code> → render. Typical latency ~10–30 ms.</p><p><b>Miss / inactive user:</b> build on read (300 ms) once, behind single-flight, then cache. Memory: only active users (say 30M × 500 IDs × 8 B ≈ 120 GB + overhead) → sharded Redis Cluster. Freshness: fan-out workers lag seconds; feeds of users whose feed key expired rebuild on next load.</p>`,
      complexity: `<p>Write: O(followers) for normal authors, O(1) for celebrities. Read: O(log N + 200) sorted-set read + one MGET of 50 posts.</p>`,
      followUps: ['A user unfollows someone — how do their posts leave the cached feed?', 'How do you rank with an ML model without recomputing on every load?']
    }
  });
  practice.push({
    title: 'One Celebrity Key Melts a Redis Shard', level: 'Medium', tags: ['hot key', 'L1 cache', 'replication'], companies: ['Twitter/X', 'Weibo', 'TikTok'],
    statement: `<p>A celebrity posts; their profile and post keys receive 400k reads/s. In Redis Cluster those keys live on one shard, which saturates its CPU (~150k ops/s max) while the other 23 shards idle. Latency for <i>all</i> keys on that shard spikes. Design a fix that works automatically for whatever key becomes hot.</p>`,
    constraints: `<p>Hot keys appear without warning · data may be ≤ 5 s stale · 300 app servers.</p>`,
    example: `<p>400k reads/s ÷ 300 servers ≈ 1,333/s per server. An ${H.c('g', 'L1 cache with 2 s TTL')} turns that into ${H.c('g', '0.5 Redis reads/s per server ≈ 150/s total')}.</p>`,
    brute: { why: `<p><b>Naive fix:</b> add more shards. A single key always maps to a single slot, so more shards do nothing for one hot key. Upgrading the instance size buys maybe 2× — not 3×.</p>` },
    mcq: { q: 'Why does adding shards not fix a single hot key?', options: ['Sharding is broken', 'One key hashes to one slot on one node regardless of shard count', 'Redis limits shards to 3', 'Replicas cannot be read'], answer: 1, explain: 'Sharding distributes different keys; it cannot split the traffic of one key.' },
    hints: [`<p>Hint 1: The traffic of one key must be spread across many machines — either many copies or a layer in front.</p>`, `<p>Hint 2: Detect hot keys (client-side counters, Redis <code>--hotkeys</code> with LFU, sampling) and put them in an in-process L1 with a short TTL.</p>`, `<p>Hint 3: Alternatives: read from replicas, or key splitting (<code>key#0..#N</code> copies on different slots, read a random one).</p>`],
    solution: {
      approach: `<p><b>1. Automatic hot-key detection</b> in the client library: count reads per key in a sliding window (Count-Min Sketch / top-K); any key above, say, 1,000 reads/s per server is "hot".</p><p><b>2. L1 in-process cache for hot keys</b> (Caffeine, a few thousand entries, TTL 2 s, single-flight on refill). 300 servers × 0.5 refresh/s ≈ 150 Redis reads/s for that key instead of 400k. Staleness ≤ 2 s (within the 5 s budget); writes publish an invalidation on pub/sub for faster convergence.</p><p><b>3. Spread what still reaches Redis:</b> enable replica reads (<code>READONLY</code>) for the shard, or replicate known-hot keys as <code>post:9#0..#15</code> placed on different slots and read a random suffix (writes update all copies).</p><p><b>4. Protect neighbours:</b> per-shard client timeouts and circuit breakers so one saturated shard degrades only its keys. Long term: shard-level CPU alerts and a hot-key dashboard.</p>`,
      complexity: `<p>Redis load for a hot key becomes O(servers / L1 TTL) instead of O(traffic). L1 memory: tiny (only hot keys).</p>`,
      followUps: ['How do you handle a hot key that is also written frequently (a like counter)?', 'What does Meta/Twitter do with hot keys in practice?']
    }
  });
  practice.push({
    title: 'Cache an Expensive Third-Party Pricing API', level: 'Medium', tags: ['stale-while-revalidate', 'rate limits', 'resilience'], companies: ['Expedia', 'Airbnb', 'Skyscanner'],
    statement: `<p>Flight prices come from a partner API: 1.5 s latency, 200 calls/s quota, sometimes down for minutes. Searches: 10k/s, heavily repeated for popular routes (route + date). Prices may be up to 5 minutes old in search results, but the final booking must re-check the live price. Design the caching.</p>`,
    constraints: `<p>Search p95 &lt; 300 ms · never exceed the quota · stay useful when the partner is down.</p>`,
    example: `<p>Popular route ${H.c('b', 'DEL→BOM, 2026-11-20')} searched 50 times/s. Soft TTL 5 min: ${H.c('g', '1 partner call per 5 min')} and every search served from cache in ~1 ms.</p>`,
    brute: { why: `<p><b>Naive design:</b> plain cache-aside with TTL 5 min. Every expiry of a popular route makes the user who triggers it wait 1.5 s (p95 blown), concurrent misses stampede the quota, and when the partner is down, expired routes return errors.</p>` },
    mcq: { q: 'Which technique keeps search fast when an entry just expired?', options: ['write-back', 'stale-while-revalidate', 'noeviction', 'Bloom filter'], answer: 1, explain: 'Serve the slightly old price immediately and refresh in the background.' },
    hints: [`<p>Hint 1: Users should never wait for the 1.5 s call in the search path if any previous value exists.</p>`, `<p>Hint 2: Soft TTL 5 min (serve + async refresh), hard TTL 2 h (stale-if-error), single-flight per route, a token-bucket limiter for partner calls.</p>`, `<p>Hint 3: Prioritise refreshes by popularity when the quota is tight; booking always bypasses the cache.</p>`],
    solution: {
      approach: `<p><b>Cache layout:</b> key <code>price:{route}:{date}:{cabin}</code> → <code>{fares, fetchedAt}</code>; Redis TTL = 2 h (hard), soft TTL = 5 min.</p><p><b>Read path:</b> fresh (&lt; 5 min) → serve. Stale but &lt; 2 h → <b>serve immediately</b> labelled with its age, and enqueue a refresh (deduplicated with <code>SET refresh:{key} NX EX 30</code>). Missing → call the partner within a deadline (e.g. 1 s) via single-flight; on timeout show "prices loading".</p><p><b>Quota protection:</b> all partner calls go through a refresh worker pool with a global token bucket at 180/s (10% headroom). The refresh queue is a priority queue ordered by recent search count, so popular routes are refreshed first; long-tail routes may age toward the hard TTL. <b>Partner down:</b> circuit breaker opens; keep serving stale prices (stale-if-error) up to 2 h with a banner. <b>Booking:</b> always calls the partner live and shows a price-change notice if it differs.</p>`,
      complexity: `<p>Partner calls ≤ 180/s regardless of search volume; search latency = 1 Redis read for any route seen in the last 2 h.</p>`,
      followUps: ['How do you pre-warm routes before a holiday sale?', 'How would you cache partial results (one airline down)?']
    }
  });
  practice.push({
    title: 'Survive a Full Cache Restart (Avalanche)', level: 'Medium', tags: ['avalanche', 'warmup', 'load shedding'], companies: ['Netflix', 'Pinterest'],
    statement: `<p>Your Redis cluster (no persistence) must be migrated to new hardware, which means starting empty. Normally it serves 150k QPS at 98% hit rate; the DB handles 3k QPS today and at most ~10k. Plan the migration and the general avalanche defences so the site stays up.</p>`,
    constraints: `<p>No downtime allowed · old and new clusters can run in parallel for a few hours · hot set ≈ 40 GB.</p>`,
    example: `<p>Cold switch: DB load jumps from ${H.c('g', '3k')} to ${H.c('r', '~150k QPS')} — 15× its maximum. Warmed switch: DB stays near ${H.c('g', '3–5k QPS')}.</p>`,
    brute: { why: `<p><b>Naive plan:</b> flip the config to the new empty cluster at night. Even at 30% of peak traffic, 45k QPS of misses hits a DB that tops out at 10k → outage; and synchronized TTLs of the refilled keys cause another spike an hour later.</p>` },
    mcq: { q: 'Which technique fills the new cluster with the right keys before switching?', options: ['FLUSHALL', 'Dual-write + replay of recent hot reads (warmup)', 'noeviction', 'Shorter TTLs'], answer: 1, explain: 'Warm the new cache with the actual hot set, then cut over gradually.' },
    hints: [`<p>Hint 1: Never let the new cluster face full traffic while empty — warm it first, then shift traffic gradually.</p>`, `<p>Hint 2: Dual-write (or dual-populate on read) to both clusters, and replay the most frequent keys from access logs or a key dump.</p>`, `<p>Hint 3: General defences: TTL jitter, replicas, single-flight, DB bulkhead and load shedding, feature flags to degrade expensive features.</p>`],
    solution: {
      approach: `<p><b>Migration plan:</b></p><ol><li><b>Dual populate:</b> deploy a client change so every cache fill (on miss) and every invalidation goes to <i>both</i> clusters; reads still use the old one.</li><li><b>Warm:</b> run a job that scans the old cluster (<code>SCAN</code> + <code>DUMP/RESTORE</code> or a replication-based migration tool) or replays the top keys from the last hour of access logs into the new cluster, with TTLs re-jittered.</li><li><b>Shift reads gradually:</b> 1% → 10% → 50% → 100% of servers read from the new cluster, watching its hit rate and DB QPS at each step.</li><li><b>Decommission</b> the old cluster after a full TTL period.</li></ol><p><b>Avalanche defences in general:</b> replicas + failover (a node loss is not a cold start), optional RDB/AOF for faster warm restart, TTL jitter, single-flight + locks per key, a DB <b>bulkhead</b> (bounded connection pool) with load shedding of low-priority endpoints, a circuit breaker returning degraded content, and feature flags to disable heavy features during recovery.</p>`,
      complexity: `<p>Warmup cost ≈ hot set size (40 GB) streamed over the network — minutes. DB load stays ≈ baseline throughout.</p>`,
      followUps: ['How would you do this if old and new cannot run in parallel?', 'How long until hit rate recovers without warmup?']
    }
  });
  practice.push({
    title: 'Pick an Eviction Policy for a Mixed Workload', level: 'Medium', tags: ['LRU', 'LFU', 'scan resistance', 'Caffeine'], companies: ['Google', 'Datadog'],
    statement: `<p>An analytics API caches query results (~50 KB each). Interactive dashboards repeatedly hit ~5k popular queries all day. Every night a reporting job requests ~2M distinct one-off queries through the same cache. After each nightly run, morning hit rate drops from 92% to 30% for an hour. Fix it.</p>`,
    constraints: `<p>Cache capacity 20 GB (~400k entries) · cannot change the reporting job's code path easily.</p>`,
    example: `<p>Pure LRU: 2M one-off results are each "most recent" once and push the 5k dashboard queries out → ${H.c('r', 'morning misses')}. W-TinyLFU / allkeys-lfu: one-off entries have frequency 1 and are ${H.c('g', 'not admitted over popular ones')}.</p>`,
    brute: { why: `<p><b>Naive fix:</b> double the cache size. 2M × 50 KB = 100 GB of junk would still flush a 40 GB cache. The issue is the <i>policy</i> (scan pollution), not the size.</p>` },
    mcq: { q: 'Which policy is scan-resistant?', options: ['LRU', 'FIFO', 'W-TinyLFU / SLRU', 'MRU'], answer: 2, explain: 'Frequency-aware admission (TinyLFU) or segmented LRU keeps one-time items from displacing the hot set.' },
    hints: [`<p>Hint 1: The batch job's keys are seen once — recency-only policies cannot tell them apart from hot keys.</p>`, `<p>Hint 2: Use frequency information: Redis <code>allkeys-lfu</code>, Caffeine W-TinyLFU, or segmented LRU / 2Q.</p>`, `<p>Hint 3: Even better, route the batch job around the cache (no-cache header) or to a separate small cache.</p>`],
    solution: {
      approach: `<p><b>Root cause:</b> LRU is not scan-resistant. The nightly job touches 2M distinct keys once each; each becomes the most recent entry and evicts the 5k popular dashboard results.</p><p><b>Fixes (combine):</b></p><ol><li><b>Switch policy:</b> Redis <code>allkeys-lfu</code> (logarithmic counters with decay) or, for an in-process cache, Caffeine's W-TinyLFU, which only admits a newcomer if its estimated frequency beats the eviction victim — one-off queries are rejected at the door.</li><li><b>Bypass:</b> have the reporting job send a <code>Cache-Control: no-store</code> / internal header so its results are neither read from nor written to the shared cache (or give it a separate cache namespace with its own small memory budget).</li><li><b>Protect the hot set:</b> refresh-ahead for the top dashboard queries so they never expire.</li></ol><p>Validate by replaying a day's access log through LRU vs LFU vs W-TinyLFU simulators and comparing hit rates per hour.</p>`,
      complexity: `<p>LFU/TinyLFU bookkeeping is O(1) per access (sketch increments); memory overhead a few bytes per entry.</p>`,
      followUps: ['How does LFU decay prevent yesterday\'s popular queries from staying forever?', 'How would ARC adapt here?']
    }
  });
  practice.push({
    title: 'Size a Redis Cluster for a Social Profile Service', level: 'Medium', tags: ['sizing', 'hit rate', 'sharding'], companies: ['Meta', 'Snap'],
    statement: `<p>500M users, profile object 1.2 KB, 250k profile reads/s at peak, 2k writes/s. The DB tier can serve 15k reads/s. 30% of users are daily-active and generate 95% of reads. Size the cache (memory, shards, replicas) and justify with hit-rate math.</p>`,
    constraints: `<p>Redis shards limited to ~25 GB data each for fast failover/resync · one replica per shard · 30% memory headroom.</p>`,
    example: `<p>Required hit rate: ${H.c('b', '1 − 15k/250k = 94%')}. Caching daily-actives: 150M × (1.2 KB + 0.1 KB) × 1.3 ≈ ${H.c('g', '253 GB')} → ~11 shards.</p>`,
    brute: { why: `<p><b>Naive sizing:</b> cache all 500M users: 500M × 1.3 KB × 1.3 ≈ 845 GB, ×2 replicas = 1.7 TB of RAM, mostly for users who never log in. Or "one big Redis" — no single box has that RAM and failover would take forever.</p>` },
    mcq: { q: 'Caching the 30% daily-active users gives what hit rate (ignoring TTL misses)?', options: ['30%', '~95%', '100%', '5%'], answer: 1, explain: 'They generate 95% of reads, so caching them covers ~95% of requests — just above the 94% required.' },
    hints: [`<p>Hint 1: Required hit rate = 1 − DB capacity / peak QPS.</p>`, `<p>Hint 2: The working set is the daily-actives: 150M × ~1.3 KB including overhead, ×1.3 headroom.</p>`, `<p>Hint 3: Divide by the per-shard limit for shard count; double for replicas; check throughput per shard (250k / shards) is fine.</p>`],
    solution: {
      approach: `<p><b>Hit rate needed:</b> 1 − 15k/250k = <b>94%</b>. Caching the daily-active 30% (150M users) covers ~95% of reads — just enough, so add margin with an L1 for the hottest profiles and keep TTLs long enough (e.g. 24 h ± jitter) that active users stay cached all day.</p><p><b>Memory:</b> 150M × (1.2 KB value + ~0.1 KB key/overhead) ≈ 195 GB; ×1.3 headroom ≈ <b>253 GB</b>. At ≤ 25 GB per shard → <b>11–12 primaries</b> (round to 12 for even slot ranges), each with one replica → 24 nodes, ~600 GB RAM total.</p><p><b>Throughput:</b> 250k reads/s ÷ 12 ≈ 21k ops/s per shard — far below Redis limits; replica reads add headroom. Writes: 2k/s update DB then DEL (cache-aside). <b>Policy:</b> <code>allkeys-lru</code>; compact serialization (MessagePack) to shrink the 1.2 KB. <b>Risk:</b> DB headroom is thin (95% vs 94%); monitor hit rate and consider growing the DB read tier or caching more users (e.g. weekly-actives) if growth continues.</p>`,
      complexity: `<p>≈ 253 GB data across 12 primaries + 12 replicas; ~21k ops/s per shard at peak.</p>`,
      followUps: ['How would you shrink each profile to fit more users?', 'What happens to the hit rate on Monday mornings when weekly users return?']
    }
  });

  practice.push({
    title: 'Multi-Region Cache Invalidation', level: 'Hard', tags: ['invalidation', 'multi-region', 'CDC', 'consistency'], companies: ['Meta', 'Netflix', 'Google'],
    statement: `<p>A product catalog is served from 3 regions (US, EU, APAC). The primary DB is in US with async replicas in EU and APAC (replication lag 100 ms – 2 s). Each region has its own Redis cache. Sellers update prices in any region (writes go to US). Design cache invalidation so no region serves a stale price for more than ~5 s, and never re-caches an old price after an update.</p>`,
    constraints: `<p>20k writes/s globally, 2M reads/s · cross-region link may partition for minutes · prices shown must converge within 5 s normally.</p>`,
    example: `<p>Price update committed in US at t=0. EU cache deleted at t=50 ms, but the EU replica still has the ${H.c('r', 'old price until t=800 ms')}. An EU miss at t=100 ms reads the replica and ${H.c('r', 're-caches the old price')} — unless invalidation is tied to replication.</p>`,
    brute: { why: `<p><b>Naive design:</b> the writer in US sends DEL to all three regional caches right after commit. Remote DELs race ahead of DB replication, so remote regions re-fill from lagging replicas with old data; during a partition DELs are lost entirely and stale prices live until TTL.</p>` },
    mcq: { q: 'Where should each region\'s invalidations come from to avoid the replica-lag race?', options: ['From the writer app immediately after commit', 'From that region\'s own replica replication stream (CDC on the local replica)', 'From the CDN', 'From browser clients'], answer: 1, explain: 'If the invalidation is emitted when the change arrives at the local replica, a re-fill after the DEL can only read the new value.' },
    hints: [`<p>Hint 1: The danger is invalidating a region's cache <i>before</i> that region's DB replica has the new data.</p>`, `<p>Hint 2: Drive each region's invalidation from its local replica's change stream (like Meta's McSqueal) — the DEL happens only after the replica has the new row.</p>`, `<p>Hint 3: Add versioned values (CAS on version) to reject late fills, TTLs as a net, and replay-from-position after partitions.</p>`],
    solution: {
      approach: `<p><b>Principle:</b> invalidate a region's cache only <i>after</i> that region's data source has the change.</p><ol><li><b>Regional CDC invalidators:</b> in each region, a CDC reader tails the <b>local replica's</b> binlog/WAL. When the price row change is applied locally, it DELs <code>product:{id}</code> (and derived keys) in that region's Redis. A subsequent miss reads the local replica, which already has the new price → no stale re-fill.</li><li><b>Versioned values:</b> rows carry a monotonically increasing <code>version</code>; cache fills use a Lua CAS (set only if newer) so an in-flight read that started before replication cannot overwrite a newer cached entry.</li><li><b>Partitions:</b> the CDC reader stores its log position; after a partition heals it resumes and replays all missed invalidations. If lag exceeds a threshold (e.g. 5 s), the region shortens TTLs or marks prices "may be outdated", and checkout always verifies with the US primary.</li><li><b>TTL safety net:</b> 5 min ± jitter on all product keys.</li><li><b>Read-your-writes for sellers:</b> the seller's own UI reads from the primary for a few seconds after an update.</li></ol><p>Convergence = replication lag + CDC processing (~100 ms – 2 s) ≤ 5 s normally; correctness of money flows is ensured by checkout reading the primary.</p>`,
      complexity: `<p>One invalidation per write per region (60k DEL/s total) — cheap. Staleness ≈ replication lag; worst case bounded by TTL.</p>`,
      followUps: ['What if writes could happen in any region (multi-primary)?', 'How do you monitor cache-vs-DB divergence per region?']
    }
  });
  practice.push({
    title: 'Flash Sale: 1M QPS on 500 Products', level: 'Hard', tags: ['CDN', 'L1', 'hot keys', 'stampede', 'inventory'], companies: ['Alibaba', 'Flipkart', 'Amazon'],
    statement: `<p>A flash sale opens at 12:00:00 for 500 products. Expect 1M product-page QPS in the first minute and 50k checkout attempts/s. Product pages must load in &lt; 200 ms; stock shown may lag by 2 s; overselling is forbidden. Design the caching hierarchy and how stock is handled.</p>`,
    constraints: `<p>Origin app fleet: 400 servers · DB: 20k writes/s max · Redis cluster: 16 shards.</p>`,
    example: `<p>Without layering, product <code>p:17</code> alone gets ${H.c('r', '~100k QPS on one Redis shard')}. With CDN (static page) + L1 (dynamic bits, 1 s TTL), Redis sees ${H.c('g', '~400 reads/s for it')}.</p>`,
    brute: { why: `<p><b>Naive design:</b> cache-aside in Redis with a 60 s TTL, decrement stock in the DB on every checkout. Hot product keys saturate single shards, the first expiry at 12:01 causes a stampede, and 50k/s row-level stock updates on 500 rows exceed the DB and lock up.</p>` },
    mcq: { q: 'Where should the authoritative, oversell-proof stock decrement happen at 50k/s?', options: ['In each app server\'s L1 cache', 'Atomic decrement in Redis (Lua) with async durable order write', 'In the CDN', 'A cron job every minute'], answer: 1, explain: 'An atomic Redis DECR/Lua check is fast and single-threaded per key; the DB records orders asynchronously via a queue.' },
    hints: [`<p>Hint 1: Split the page: static content (images, description) vs dynamic (price, stock badge). Push static to the CDN.</p>`, `<p>Hint 2: Pre-warm everything before 12:00: CDN, L1 and Redis — no cold misses at the moment of the spike; no TTL expiry during the sale (refresh-ahead).</p>`, `<p>Hint 3: Stock: pre-load counts into Redis; reserve with an atomic Lua script (check &gt; 0 then DECR); enqueue the order to Kafka; DB writes asynchronously; reconcile later.</p>`],
    solution: {
      approach: `<p><b>Read hierarchy:</b></p><ol><li><b>CDN:</b> the product page is static HTML/JS + images, pre-pushed and cached for the sale duration (<code>s-maxage=600</code>). ~95% of traffic ends here.</li><li><b>Dynamic JSON</b> (<code>/api/sale/p17</code>: price, stock badge) via CDN with <code>max-age=1, stale-while-revalidate=2</code> + request collapsing → origin sees ~1 request/s per product per PoP.</li><li><b>L1 on app servers:</b> all 500 products × small JSON in memory, refreshed every 1 s by a background thread (refresh-ahead, never expire during the sale).</li><li><b>Redis:</b> source for L1 refreshes; 500 keys replicated as <code>p:17#0..#15</code> across shards to avoid hot shards.</li></ol><p><b>Stock (write path):</b> pre-load <code>stock:{id}</code> into Redis. Checkout runs a Lua script: if stock &gt; 0 then DECR and create a reservation <code>res:{orderId}</code> with a 10-minute TTL; else "sold out". The reservation event goes to Kafka; consumers write orders to the DB at a sustainable rate (batching). Payment timeout → script returns stock (INCR) and deletes the reservation. Redis primary + replica with AOF <code>always</code> on the stock shard (or a strongly consistent store) for durability; nightly reconciliation against the order DB.</p><p><b>Before 12:00:</b> warm everything, load-test the exact traffic shape, set DB bulkheads and a waiting-room queue at the edge as a last resort.</p>`,
      complexity: `<p>Origin reads ≈ O(products × PoPs) per second, not O(users). Stock ops: one Lua call (O(1), ~0.1 ms) per checkout; DB writes smoothed via Kafka.</p>`,
      followUps: ['How do you show "sold out" to everyone within 2 s?', 'What if the Redis stock shard fails over and loses the last 200 decrements?']
    }
  });
  practice.push({
    title: 'Design a Semantic Cache for an LLM Assistant', level: 'Hard', tags: ['semantic cache', 'LLM', 'embeddings', 'invalidation'], companies: ['OpenAI', 'Anthropic', 'Microsoft', 'Notion'],
    statement: `<p>A customer-support assistant answers 2M questions/day with an LLM (avg cost $0.01 and 3 s per answer). Many questions are paraphrases ("how do I reset my password" / "forgot password, help"). Design a cache that cuts cost and latency without serving wrong or someone else's answers. Knowledge-base articles change several times a day.</p>`,
    constraints: `<p>Wrong-answer rate from the cache must stay &lt; 0.5% · answers may contain account-specific data for some questions · p95 for cache hits &lt; 200 ms.</p>`,
    example: `<p>${H.c('b', '"forgot my password, help"')} embeds close (cosine 0.95) to cached ${H.c('g', '"how do I reset my password"')} → serve cached answer in 50 ms for $0.0001 instead of 3 s / $0.01.</p>`,
    brute: { why: `<p><b>Naive designs:</b> (1) exact-match cache on the raw prompt — paraphrases never hit (hit rate ~5%); (2) semantic cache with a loose threshold and no scoping — "cancel my order #123" returns another user's cancellation answer, and answers keep citing articles that were edited hours ago.</p>` },
    mcq: { q: 'Which answers must never go into a shared semantic cache?', options: ['Generic how-to answers', 'Answers containing account-specific or personal data', 'Answers about public pricing', 'FAQ answers'], answer: 1, explain: 'Personalised answers must be excluded or cached only per user — otherwise the cache leaks data across users.' },
    hints: [`<p>Hint 1: Two layers: exact-match (normalised prompt hash) first, then semantic (embedding similarity) with a strict threshold.</p>`, `<p>Hint 2: Scope keys: model version + prompt template version + KB version/tenant + locale. Classify questions as generic vs personal; only cache generic.</p>`, `<p>Hint 3: Invalidate by the KB articles an answer cited (tag-based invalidation); measure wrong-hit rate by sampling with an LLM judge plus human review; tune the threshold.</p>`],
    solution: {
      approach: `<p><b>Flow:</b> normalise question → <b>L1 exact cache</b> (hash of normalised text + scope) → <b>semantic cache</b>: embed the question (~20 ms), vector search (HNSW in Redis/pgvector) restricted to the same scope; hit only if similarity ≥ threshold (e.g. 0.93, tuned) and the cached entry's cited articles are still current → else call the LLM (RAG), then store the answer.</p><p><b>Safety:</b> a lightweight classifier (or the LLM's own tool-use trace) marks answers as <i>generic</i> or <i>personal</i>; personal answers (anything that used account tools or contains PII) are never stored in the shared cache. The key scope includes tenant, locale, model ID and prompt-template version, so upgrading the model or template naturally starts a fresh namespace (versioned keys).</p><p><b>Invalidation:</b> each entry stores the IDs of KB articles it cited; when an article is updated, a CDC/event consumer deletes all entries tagged with it (tag-based invalidation). TTL 24 h as a net.</p><p><b>Quality control:</b> sample 1% of semantic hits and have an LLM judge + humans compare to a fresh answer; track wrong-hit rate and adjust the threshold; let users flag bad answers (evict on flag). <b>Stampede:</b> single-flight on the exact key so a trending question triggers one LLM call. Expected: 30–50% hit rate on support traffic → large cost and latency savings.</p>`,
      complexity: `<p>Hit: embed (~20 ms) + ANN search (~5–20 ms). Memory: entries × (embedding 1–3 KB + answer ~2 KB). Cost per hit ≈ embedding cost only.</p>`,
      followUps: ['How do you choose the similarity threshold scientifically?', 'How does provider-side prompt caching differ from this?']
    }
  });
  practice.push({
    title: 'Protect a 10-Second ML Recommendation Recompute', level: 'Hard', tags: ['stampede', 'refresh-ahead', 'XFetch', 'distributed lock'], companies: ['Netflix', 'Spotify', 'YouTube'],
    statement: `<p>Per-user recommendations take 10 s of GPU time to compute and are cached for 6 h. 40M users open the app each morning between 7 and 9 am; many have expired recommendations. GPU capacity: 2,000 concurrent computations. Multiple devices of the same user often open simultaneously. Design caching so users never wait 10 s and the GPU fleet is not overwhelmed.</p>`,
    constraints: `<p>Recommendations up to 24 h old are acceptable as a fallback · per-user dedup required · GPU work must be spread out.</p>`,
    example: `<p>Naive: 40M users × 10 s = 400M GPU-seconds crammed into 2 h → needs ${H.c('r', '~55,000 concurrent GPUs')}. Spread over 24 h with pre-computation: ${H.c('g', '~4,600 concurrent')} — or less by skipping inactive users.</p>`,
    brute: { why: `<p><b>Naive design:</b> compute on cache miss. Morning traffic synchronises misses → GPU queue explodes, users stare at spinners for minutes, and two devices of the same user trigger two identical 10 s jobs.</p>` },
    mcq: { q: 'What turns the morning spike into smooth background work?', options: ['A larger TTL only', 'Predictive pre-computation (refresh-ahead) scheduled across the night', 'noeviction', 'write-around'], answer: 1, explain: 'Compute before users arrive, spread over off-peak hours, prioritised by likelihood of an app open.' },
    hints: [`<p>Hint 1: Never compute in the request path when any previous result exists — serve stale and refresh asynchronously.</p>`, `<p>Hint 2: Predict who will open the app (usage history) and pre-compute overnight in a rate-limited queue; jitter schedules.</p>`, `<p>Hint 3: Per-user dedup via a Redis lock / queue job ID; priority lanes (active user waiting &gt; background refresh); fall back to popular/trending lists for brand-new users.</p>`],
    solution: {
      approach: `<p><b>Data:</b> <code>recs:{uid}</code> → {items, computedAt}; soft TTL 6 h, hard TTL 48 h.</p><p><b>Request path never computes:</b> fresh → serve. Stale (6–48 h) → serve immediately and enqueue a refresh. Missing (new user) → serve a cheap fallback (trending in their region, onboarding picks) and enqueue a high-priority job.</p><p><b>Dedup:</b> enqueue with an idempotent job ID <code>recs:{uid}:{date-bucket}</code> (<code>SET job:… NX EX 900</code>); a second device opening at the same time finds the job already queued — exactly one GPU job per user.</p><p><b>Spread the work:</b> a scheduler pre-computes recommendations for users likely to open the app tomorrow morning (based on history), spread across off-peak hours with jitter, at a rate that keeps GPUs at ~80% utilisation. Two queues: <i>interactive</i> (users currently in the app with stale/no recs) and <i>background</i> (predictive refresh); workers drain interactive first.</p><p><b>Early refresh:</b> for active users, apply XFetch-style probabilistic early refresh near the soft TTL so refreshes drift apart instead of aligning. <b>Backpressure:</b> if the interactive queue grows, extend soft TTLs (serve older recs) rather than adding latency.</p>`,
      complexity: `<p>GPU load ≈ (active users × 10 s) / 24 h, smoothed; request latency = one cache read. Exactly one compute per user per refresh window.</p>`,
      followUps: ['How do you invalidate recs after a user binge-watches something new?', 'How would you measure the cost of serving stale recommendations?']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'In cache-aside, what should a write do to the cache?', options: ['Update the cache, then the DB', 'Update the DB, then delete the cache key', 'Nothing; wait for TTL', 'Flush the whole cache'], answer: 1, explain: 'DB first (truth), then delete — deleting is idempotent and avoids racing writers leaving the older value in the cache.' });
  quiz.push({ q: 'Which write policy gives the fastest writes but can lose data if the cache crashes?', options: ['Write-through', 'Write-around', 'Write-back', 'Read-through'], answer: 2, explain: 'Write-back acknowledges after writing only to the cache; dirty data not yet flushed is lost on a crash.' });
  quiz.push({ q: 'An LRU cache with capacity 2 sees: A, B, A, C. Which key is evicted when C arrives?', options: ['A', 'B', 'C', 'Nothing'], answer: 1, explain: 'After A, B, A the order (MRU→LRU) is A, B; B is least recently used.' });
  quiz.push({ q: 'O(1) LRU uses which pair of structures?', options: ['Array + binary search', 'Hash map + doubly linked list', 'Heap + stack', 'Trie + queue'], answer: 1, explain: 'The map finds the node; the doubly linked list maintains recency with O(1) unlink/move.' });
  quiz.push({ q: 'Redis\'s default maxmemory-policy is…', options: ['allkeys-lru', 'volatile-lru', 'noeviction', 'allkeys-random'], answer: 2, explain: 'noeviction: writes fail with OOM when memory is full — set an allkeys-* policy for pure caches.' });
  quiz.push({ q: 'Requests for IDs that do not exist keep reaching the DB. This is called…', options: ['Cache avalanche', 'Cache penetration', 'Cache breakdown', 'Write amplification'], answer: 1, explain: 'Penetration: nothing is ever cached for missing keys. Fix with negative caching and Bloom filters.' });
  quiz.push({ q: 'A Bloom filter answers "maybe present". Which is true?', options: ['The key is definitely present', 'The key may or may not be present (false positive possible)', 'The key is definitely absent', 'The filter must be rebuilt'], answer: 1, explain: 'Bloom filters have no false negatives but can have false positives.' });
  quiz.push({ q: 'Thousands of keys loaded by one batch job all expire at the same time. Best simple fix?', options: ['Remove TTLs', 'Add random jitter to TTLs', 'Use write-back', 'Use FIFO eviction'], answer: 1, explain: 'Jitter spreads expiries over time, avoiding a synchronized wave of misses (avalanche).' });
  quiz.push({ q: 'In Redis Cluster, which keys are guaranteed to be on the same slot?', options: ['user:1 and user:2', '{user:1}:cart and {user:1}:orders', 'Any keys with the same TTL', 'Keys written by the same client'], answer: 1, explain: 'Only the hash-tag content inside {…} is hashed, so both map to the same slot.' });
  quiz.push({ q: 'Layers hit rates: CDN 50%, L1 60%, L2 90%. What fraction of requests reach the DB?', options: ['2%', '10%', '20%', '0.5%'], answer: 0, explain: '0.5 × 0.4 × 0.1 = 0.02 → 2%. Multiply miss rates.' });
  quiz.push({ q: 'Which technique lets users get an instant (possibly slightly old) answer while one request refreshes the key?', options: ['Write-through', 'Stale-while-revalidate', 'noeviction', 'Negative caching'], answer: 1, explain: 'Serve stale past the soft TTL, refresh asynchronously behind single-flight/lock.' });
  quiz.push({ q: 'Why is Memcached sometimes preferred over Redis?', options: ['It supports sorted sets', 'It is multi-threaded and very simple for pure blob caching', 'It persists to disk', 'It has built-in replication'], answer: 1, explain: 'Memcached is lean and multi-threaded; it has no persistence or replication and only stores opaque values.' });
  quiz.push({ q: 'A reader misses, reads the old row, a writer updates + deletes, then the reader sets the old row. Which mechanism prevents this?', options: ['Longer TTL', 'Leases / versioned compare-and-set', 'LFU eviction', 'Write-around'], answer: 1, explain: 'The delete invalidates the reader\'s lease (or the old version loses the CAS), so the stale set is rejected.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ level: 'B', q: 'What is a cache and why do we use one in system design?', a: `<p>A cache is a small, fast store holding copies of data that is expensive to fetch or compute, placed close to where it is needed. We use it to <b>cut latency</b> (a Redis hit ~0.5 ms vs a DB query ~10 ms+) and to <b>reduce load</b> on the source of truth — at a 95% hit rate the DB sees only 5% of reads. The price is <b>staleness</b> and complexity (invalidation, memory sizing, failure modes). I cache data that is read much more than written and can tolerate some staleness, and I always define the TTL and the invalidation path.</p>`, followUps: ['What would you not cache?', 'Where can caches live in a request path?'] });
  interview.push({ level: 'B', q: 'Explain cache-aside step by step.', a: `<p>Read: the app checks the cache; on a hit it returns; on a miss it reads the DB, stores the result in the cache with a TTL, and returns. Write: the app updates the DB and then <b>deletes</b> the cache key, so the next read reloads fresh data. The app owns the logic and the cache is optional — if it fails, reads fall back to the DB (slower). Drawbacks: cold misses, a small stale window (including the read-then-set race), and duplicated logic in each service.</p>`, followUps: ['Why delete rather than update on write?', 'What happens if the delete fails?'] });
  interview.push({ level: 'I', q: 'Compare write-through, write-around and write-back.', a: `<p><b>Write-through</b>: write cache and DB synchronously — reads after writes hit fresh data, writes are slower, and rarely-read data pollutes the cache. <b>Write-around</b>: write only the DB and invalidate — no pollution, but the first read after a write misses. <b>Write-back</b>: write only the cache and flush later in batches — fastest and coalesces many updates into one, but dirty data is lost if the cache dies before flushing. I pick per data type: write-back for counters, write-through for settings a user expects to see immediately, write-around for bulk or rarely re-read data, and never write-back for money.</p>`, followUps: ['How would you make write-back safer?', 'Is write-through atomic across cache and DB?'] });
  interview.push({ level: 'I', q: 'How would you implement an LRU cache and make it thread-safe?', a: `<p>Hash map from key to node, plus a doubly linked list ordered by recency with sentinel head/tail. Get: look up, move the node to the head. Put: update or insert at head; if over capacity remove the tail node and its map entry. All O(1). For threads, the simplest correct answer is one lock around get/put because even reads mutate the list. At scale: stripe into N independent LRUs by key hash, or use Caffeine-style read buffers that record accesses lock-free and apply them in batches. Redis avoids the list entirely by sampling keys and evicting the oldest in the sample.</p>`, followUps: ['How would you add TTL per entry?', 'How does LinkedHashMap do it?'] });
  interview.push({ level: 'I', q: 'LRU vs LFU — when does each win?', a: `<p>LRU wins when recent access predicts future access (sessions, recently viewed items) and is simple and cheap. It is <b>not scan-resistant</b>: a one-off scan flushes the hot set. LFU wins when popularity is stable (top products, trending songs) and resists scans, but needs <b>decay</b> or old favourites never leave and newcomers get evicted before they can build counts. Modern caches blend both: W-TinyLFU (Caffeine) uses a small LRU window plus a frequency sketch for admission; Redis offers <code>allkeys-lfu</code> with logarithmic counters and time decay.</p>`, followUps: ['What is Bélády\'s algorithm?', 'How would you pick from real data?'] });
  interview.push({ level: 'I', q: 'What is a cache stampede and how do you prevent it?', a: `<p>When a hot key expires or is evicted, many concurrent requests miss together and all recompute the same value, overloading the DB — which slows down and widens the window, a feedback loop. Defences: <b>single-flight</b> per process (one in-flight load per key), a <b>distributed lock</b> (<code>SET NX PX</code>) so one request fleet-wide recomputes, <b>stale-while-revalidate</b> (serve old value while refreshing), <b>probabilistic early refresh</b> (XFetch) or refresh-ahead jobs for hot keys, and <b>TTL jitter</b> to avoid mass expiry. Plus a DB bulkhead so overload degrades gracefully.</p>`, followUps: ['What if the lock holder crashes?', 'How does XFetch decide when to refresh?'] });
  interview.push({ level: 'I', q: 'Differentiate cache penetration, breakdown and avalanche.', a: `<p><b>Penetration</b>: requests for keys that do not exist anywhere, so the cache never helps and every request hits the DB — fix with negative caching (short TTL), Bloom filters, validation and rate limiting. <b>Breakdown</b>: a single hot key expires and its concurrent misses stampede the DB — fix with locks/single-flight, stale-while-revalidate, never-expire + background refresh. <b>Avalanche</b>: many keys expire together or the whole cache goes down — fix with TTL jitter, replicated/HA caches, multi-level caches, warmup and DB protection (circuit breakers, load shedding).</p>`, followUps: ['How big is a Bloom filter for 100M keys at 1%?', 'How would you warm a cache?'] });
  interview.push({ level: 'I', q: 'Redis or Memcached — how do you choose?', a: `<p>Memcached: simple multi-threaded key → blob cache, slab allocator, no persistence or replication; great for huge, simple look-aside caches where losing data on restart is fine. Redis (or Valkey): rich data structures (sorted sets, hashes, streams, HyperLogLog), atomic ops and Lua, replication with Sentinel/Cluster failover, optional persistence, pub/sub. I default to Redis because most designs also need counters, leaderboards, rate limiting, locks or sessions, and HA matters. I mention its single-threaded command execution (avoid O(N) commands) and that replication is asynchronous.</p>`, followUps: ['How does Redis Cluster shard keys?', 'What happens on Redis failover?'] });
  interview.push({ level: 'A', q: 'How do you keep a cache consistent with the database?', a: `<p>Perfect consistency is not possible without making cache + DB one transactional system, so I target <b>bounded staleness</b> with layers: TTL on every key (upper bound), delete-on-write after commit (fast path), a reliable invalidation channel — transactional outbox or CDC from the DB log (Debezium → Kafka → invalidator) so no writer is missed and lost deletes are retried — and protection against the stale-set race with leases or versioned compare-and-set. For read-your-writes I route the writing user's reads to the primary briefly. For data needing strict correctness (balances, stock at checkout) I read the DB directly.</p>`, followUps: ['Walk through the stale-set race.', 'How does Meta invalidate memcache across regions?'] });
  interview.push({ level: 'A', q: 'How would you size a cache for a new service?', a: `<p>Start from capacity: required hit rate = 1 − (DB capacity ÷ peak read QPS). Estimate the working set — distinct keys requested within a TTL — and the popularity skew (Zipf). Use the hit-rate curve: with skewed traffic, caching the top 10–20% of keys often gives 85–95%. Memory = keys × (key + value + ~50–100 B overhead) × ~1.3 headroom × replicas. Then pick shard count from per-node limits (memory per shard for fast failover, ops/s per shard) and check hot keys separately. Finally validate with trace replay (miss-ratio curves) and production metrics, and leave headroom for hit-rate dips.</p>`, followUps: ['Why does a 1% hit-rate change matter so much?', 'How would you build a miss-ratio curve?'] });
  interview.push({ level: 'A', q: 'When would you add an in-process L1 cache in front of Redis, and what problems does it bring?', a: `<p>When there are hot keys (one key at 100k+ QPS saturating a shard), when per-request latency must be sub-millisecond for many lookups, or to survive a Redis blip. L1 is ~100 ns and spreads hot-key load across all app servers. Problems: N copies → <b>coherence</b> (each server may be stale), memory per instance, cold L1 after deploys. Mitigations: keep L1 small (hot keys only), short TTLs (seconds), pub/sub or Redis client-side caching (<code>CLIENT TRACKING</code>) invalidations, single-flight on L1 misses, and never put data needing strict freshness in L1.</p>`, followUps: ['How do you detect hot keys automatically?', 'What staleness can L1 introduce in the worst case?'] });
  interview.push({ level: 'A', q: 'Design a distributed lock for cache refills. What can go wrong?', a: `<p><code>SET lock:key &lt;uuid&gt; NX PX 3000</code>: only one client wins; the expiry prevents a crashed holder from blocking forever; release with a Lua compare-and-delete using the uuid so you never delete someone else's lock. Pitfalls: if the work exceeds the lock TTL, two refillers run (fine for idempotent cache fills, dangerous for side effects — use fencing tokens there); GC pauses; Redis failover can lose a lock (async replication) — acceptable for cache refills because the worst case is a duplicate recompute, not corruption. Losers need bounded waiting and a fallback (stale value).</p>`, followUps: ['What are fencing tokens?', 'Why is Redlock controversial?'] });
  interview.push({ level: 'E', q: 'Walk through how Meta scaled memcache. What ideas generalise?', a: `<p>Key ideas from "Scaling Memcache at Facebook": look-aside caching with delete-on-write; <b>leases</b> that both stop stale sets and throttle thundering herds (one filler per key per few seconds, others wait or get stale); <b>mcrouter</b> for routing, batching and connection pooling; <b>gutter pools</b> that take over a failed server's traffic instead of rehashing (avoiding cascading misses); regional pools for rarely-used data; cross-region invalidation from the MySQL commit log (McSqueal) so caches are invalidated only after local replicas have the change; and "remote markers" to give read-your-writes across regions. These generalise to any large cache tier: control fills, invalidate from the DB log, isolate failures.</p>`, followUps: ['Why not rehash a dead server\'s keys?', 'How do remote markers work?'] });
  interview.push({ level: 'E', q: 'How do caching ideas apply to LLM-based systems in 2026?', a: `<p>Several new layers: <b>provider prompt caching</b> (reuse computed prefixes of long, stable prompts — structure prompts so the static part comes first), <b>exact response caches</b> keyed by model + prompt-template version + normalised input, <b>semantic caches</b> using embedding similarity with a tuned threshold and strict scoping (tenant, locale, never personal answers), embedding caches, and KV-cache/prefix-cache management inside inference servers with LRU-like eviction. Classic concerns transfer directly: invalidation when knowledge or model versions change (versioned keys, tag-based invalidation by source document), stampedes on trending prompts (single-flight), and hit-rate math — where a miss costs money as well as seconds.</p>`, followUps: ['How do you measure wrong hits in a semantic cache?', 'What should be in the cache key for an LLM response?'] });

  registerModule({
  langExplain: `<p><b>About the code here.</b> System design is language-neutral, and interviews never require a particular language for it. The short samples are Python (and occasionally Java) only to make an idea concrete, such as an estimate, a hash ring or a rate limiter. Read them like pseudocode; the runnable ones are calculators you can change and re-run.</p>`,
    id: 'hld06',
    title: 'Caching',
    intro: `<p>Almost every fast system you use — a feed that loads instantly, a product page that survives a sale, a leaderboard that updates live — is fast because of <b>caching</b>. A cache keeps a copy of hot data close to where it is needed so that most requests never reach the slow, expensive source of truth.</p>
<p>In this module you will learn the patterns (<b>cache-aside, read-through, write-through, write-around, write-back</b>), how caches decide what to forget (<b>LRU, LFU, TTL</b>), the two workhorses (<b>Redis and Memcached</b>), the hardest part (<b>invalidation</b>), and the classic failure modes that take real companies down: <b>stampedes, penetration and avalanches</b>. Finally you will stack <b>multi-level caches</b> and size them with simple <b>hit-rate math</b>. Every topic has an animated visualizer showing requests hitting (green) or missing (red).</p>
<p>Caching shows up in nearly every HLD interview — usually as "how do you make this fast?" followed by "and how do you keep it correct?". By the end you will answer both with numbers.</p>`,
    goals: [
      'Choose between cache-aside, read-through, write-through, write-around and write-back for each type of data, and explain the failure mode of each',
      'Implement an O(1) LRU cache and explain LRU vs LFU vs TTL eviction, including what Redis and Memcached actually do',
      'Design invalidation with TTLs, delete-on-write, CDC and leases/versioning, and explain the stale-set race',
      'Recognise and fix cache stampedes, penetration and avalanches (single-flight, locks, stale-while-revalidate, XFetch, Bloom filters, jitter)',
      'Size a cache and a multi-level hierarchy with hit-rate, latency and memory math'
    ],
    prereqs: `<p>HLD 1–3 (request flow, scalability, estimation) and HLD 5 (Databases at Scale: replication and sharding). Helpful: DSA hashing and linked lists (for the LRU implementation).</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
