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
  registerModule({ id: 'hld06', title: 'Caching', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
