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
  registerModule({ id: 'hld06', title: 'Caching', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
