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
      input: '3 | A B C A D B E A C',
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
  registerModule({ id: 'hld06', title: 'Caching', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
