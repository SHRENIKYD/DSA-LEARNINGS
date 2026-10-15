(function () { var topics = [], practice = [], quiz = [], interview = [];
topics.push({
  title: 'Redis Data Structures: Strings, Hashes, Lists, Sets, Sorted Sets',
  analogy: `<p>Think of Redis as a <b>very fast kitchen with labelled containers</b>. A <b>string</b> is a jar with one label and one thing inside. A <b>hash</b> is a spice rack: one rack, many small labelled jars. A <b>list</b> is a row of order tickets on a rail — add at one end, take from the other. A <b>set</b> is a bowl of unique marbles (no two the same). A <b>sorted set</b> is a <em>scoreboard</em>: every name has a score and the board always stays in rank order. The whole kitchen sits on the counter (RAM), so grabbing anything takes microseconds.</p>`,
  explain: `<p>Redis is an <b>in-memory data-structure server</b>. Your app talks to it over the network with small commands like <code>SET</code> and <code>GET</code>. It is not just "a cache with strings" — each value has a <b>type</b>, and each type comes with its own commands that run <b>atomically</b> (all-or-nothing, one at a time, because Redis runs commands on a single thread).</p>
    ${H.table(['Type', 'Core commands', 'Plain meaning', 'Typical use'], [
      ['String', 'SET / GET / INCR / EXPIRE', 'one value (text, number, JSON blob)', 'cache a page, counters, session token, simple lock'],
      ['Hash', 'HSET / HGET / HGETALL / HINCRBY', 'a small map of field → value under one key', 'a user profile, a product row, cart items'],
      ['List', 'LPUSH / RPUSH / LPOP / BRPOP / LRANGE', 'ordered list, fast at both ends', 'simple job queue, "latest 10 items"'],
      ['Set', 'SADD / SISMEMBER / SMEMBERS / SINTER', 'unique items, no order', 'tags, "who liked this", dedup ids, unique visitors'],
      ['Sorted set', 'ZADD / ZINCRBY / ZREVRANGE / ZRANK / ZRANGEBYSCORE', 'unique members, each with a number score, kept sorted', 'leaderboard, rate-limit windows, delayed jobs, "top N"']
    ])}
    <p><b>Three habits that matter from day one:</b></p>
    <ul>
      <li><b>Key naming:</b> use a pattern like <code>product:42</code>, <code>user:7:cart</code>, <code>lb:game1</code>. Colons are just a team habit, Redis does not care.</li>
      <li><b>Always set a TTL</b> (time to live) on cache keys: <code>SET product:42 "..." EX 300</code> means "forget this after 300 seconds". A cache without TTLs is a slow memory leak.</li>
      <li><b>Never use <code>KEYS *</code> in production.</b> It walks every key and blocks the single thread. Use <code>SCAN</code> (small steps).</li>
    </ul>
    <p>Rule of thumb for choosing: <span class="c-b">one blob? string.</span> <span class="c-b">object with fields you update separately? hash.</span> <span class="c-b">queue or recent items? list.</span> <span class="c-b">uniqueness or membership? set.</span> <span class="c-b">ranking or time-ordered window? sorted set.</span></p>`,
  clues: [
    '"top 10 players / most viewed / ranked by score" → sorted set (ZADD + ZREVRANGE)',
    '"have we seen this id before?" / "unique visitors" → set (SADD returns 0 if it already existed)',
    '"store a user object but update one field often" → hash (HSET field) instead of re-serialising JSON',
    '"counter that many servers increment safely" → INCR (atomic, no read-modify-write race)',
    '"latest 20 events, newest first" → list with LPUSH + LTRIM 0 19',
    '"expire automatically after N minutes" → EXPIRE / SET ... EX'
  ],
  code: [
    {
      lang: 'java', check: false, title: 'Jedis: one example per type (connection from env, never hard-coded)',
      code: `import redis.clients.jedis.JedisPooled;
import java.util.List;
import java.util.Map;

public class RedisTour {
    public static void main(String[] args) {
        // Host/port come from the environment: no secrets or hosts in source code.
        String host = System.getenv().getOrDefault("REDIS_HOST", "localhost");
        int port = Integer.parseInt(System.getenv().getOrDefault("REDIS_PORT", "6379"));
        JedisPooled redis = new JedisPooled(host, port); // thread-safe, pooled

        // STRING: a cached value with a 5 minute TTL, and an atomic counter
        redis.setex("product:42", 300, "{\\"id\\":42,\\"name\\":\\"Mug\\"}");
        long views = redis.incr("views:product:42");

        // HASH: one object, fields updated independently
        redis.hset("user:7", Map.of("name", "Asha", "plan", "free"));
        redis.hincrBy("user:7", "logins", 1);

        // LIST: newest-first activity feed capped at 20 items
        redis.lpush("feed:7", "liked post 9");
        redis.ltrim("feed:7", 0, 19);
        List<String> latest = redis.lrange("feed:7", 0, 4);

        // SET: unique ids (SADD returns 1 if new, 0 if it was already there)
        long isNew = redis.sadd("seen:msg-ids", "msg-1001");

        // SORTED SET: leaderboard, score = points
        redis.zadd("lb:game1", 250, "asha");
        redis.zincrby("lb:game1", 40, "asha");
        List<String> top3 = redis.zrevrange("lb:game1", 0, 2);

        System.out.println(views + " " + latest + " " + isNew + " " + top3);
    }
}`
    },
    {
      lang: 'bash', title: 'redis-cli: try each type in 30 seconds',
      code: `redis-cli SET product:42 '{"name":"Mug"}' EX 300   # string with TTL
redis-cli TTL product:42                           # seconds left
redis-cli HSET user:7 name Asha plan free          # hash
redis-cli HGETALL user:7
redis-cli RPUSH jobs email:1 email:2               # list used as a queue
redis-cli LPOP jobs                                # -> email:1
redis-cli SADD tags redis cache redis              # set: duplicate ignored
redis-cli SCARD tags                               # -> 2
redis-cli ZADD lb 250 asha 310 ben                 # sorted set
redis-cli ZREVRANGE lb 0 -1 WITHSCORES             # -> ben 310, asha 250`
    }
  ],
  codeTitle: ['Java (Jedis) tour of the five types', 'Same thing from the shell'],
  viz: {
    title: 'Building a small Redis keyspace, one command at a time',
    input: 'asha',
    inputLabel: 'User name (letters/digits)',
    gen: function (input) {
      var u = String(input || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      if (!u) throw new Error('Type a short user name such as asha');
      var rows = [];
      var frames = [];
      var steps = [
        ['SET session:' + u + ' "tok_9f2" EX 3600', 'string', 'session:' + u, 'string', '"tok_9f2"', '3600s', 'A <b>string</b>: one value, and it will vanish by itself in one hour (TTL).'],
        ['HSET user:' + u + ' name ' + u + ' plan free', 'hash', 'user:' + u, 'hash', '{name:' + u + ', plan:free}', '-', 'A <b>hash</b>: several fields under one key. You can change <code>plan</code> without touching <code>name</code>.'],
        ['LPUSH feed:' + u + ' "liked post 9"', 'list', 'feed:' + u, 'list', '["liked post 9"]', '-', 'A <b>list</b>: LPUSH adds to the left end, so the newest item is always first.'],
        ['LPUSH feed:' + u + ' "followed ben"', 'list-update', 'feed:' + u, 'list', '["followed ben", "liked post 9"]', '-', 'Second push: the new item goes in front. Reading the first N items is cheap.'],
        ['SADD tags:' + u + ' redis cache', 'set', 'tags:' + u, 'set', '{redis, cache}', '-', 'A <b>set</b>: unique members only, no order.'],
        ['SADD tags:' + u + ' redis', 'set-dup', 'tags:' + u, 'set', '{redis, cache}', '-', 'Adding <code>redis</code> again does nothing (returns 0). Sets are perfect for "have I seen this?".'],
        ['ZADD lb:game1 250 ' + u + ' 310 ben', 'zset', 'lb:game1', 'sorted set', 'ben:310, ' + u + ':250', '-', 'A <b>sorted set</b>: each member has a score, and the board is always in score order.'],
        ['ZINCRBY lb:game1 100 ' + u, 'zset-up', 'lb:game1', 'sorted set', u + ':350, ben:310', '-', 'Score changed from 250 to 350, and ' + u + ' jumped to rank 1 automatically. No manual sorting!']
      ];
      frames.push({ narr: 'An empty Redis. We will run 8 commands and watch the keyspace (the table of all keys) grow.', parts: [{ type: 'table', label: 'Keyspace', columns: ['key', 'type', 'value', 'TTL'], rows: [['(empty)', '', '', '']] }] });
      steps.forEach(function (s) {
        var idx = -1;
        for (var i = 0; i < rows.length; i++) if (rows[i][0] === s[2]) idx = i;
        var row = [s[2], s[3], s[4], s[5]];
        if (idx >= 0) rows[idx] = row; else { rows.push(row); idx = rows.length - 1; }
        var hl = {}; hl[idx] = s[1].indexOf('dup') >= 0 ? 'bad' : 'ok';
        frames.push({ narr: s[6], parts: [
          { type: 'text', label: 'Command', html: '<code>' + String(s[0]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>' },
          { type: 'table', label: 'Keyspace', columns: ['key', 'type', 'value', 'TTL'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }
        ] });
      });
      return frames;
    }
  },
  examples: [
    { title: 'Why INCR beats GET-then-SET', html: `<p>Two servers both want to add 1 to a counter that is 10. With <code>GET</code> then <code>SET</code>, both read 10 and both write 11 — one increment is <b>lost</b>. <code>INCR</code> runs inside Redis as one step, so the answer is always 12. Rule: if Redis has a command that does the whole job, use it instead of read-modify-write in your app.</p>
      ${H.table(['Step', 'Server A (GET+SET)', 'Server B (GET+SET)', 'Value'], [['1', 'GET → 10', '', '10'], ['2', '', 'GET → 10', '10'], ['3', 'SET 11', '', '11'], ['4', '', 'SET 11', '<span class="c-r">11 (should be 12)</span>']])}`,
      code: `// Safe: one atomic command, many servers\nlong n = redis.incr("counter:signups");`, },
    { title: 'Hash vs JSON string for a user profile', html: `<p>Store the profile as a JSON string and every tiny change (<code>logins + 1</code>) means: GET the whole blob, parse, change, serialise, SET. Two servers doing this at once can overwrite each other. A <b>hash</b> lets you do <code>HINCRBY user:7 logins 1</code> — only that field, atomically, and you can read just <code>HGET user:7 plan</code>.</p><p>Use a JSON string when you always read and write the whole object together (a cached API response). Use a hash when fields change on their own.</p>` },
    { title: 'Set operations: mutual friends in one command', html: `<p><code>SADD friends:asha ben cara dev</code> and <code>SADD friends:ben asha cara eli</code>. Then <code>SINTER friends:asha friends:ben</code> returns <code>cara</code> — the mutual friend. Redis does the intersection inside the server, so you never ship both lists to your app.</p>${H.chips(['ben', 'cara', 'dev'], { label: 'friends:asha', hl: { 1: 'g' } })}${H.chips(['asha', 'cara', 'eli'], { label: 'friends:ben', hl: { 1: 'g' } })}` }
  ],
  deepDive: `<p><b>Why Redis is fast:</b> data lives in RAM, commands are tiny, and one thread executes them in order (no locks needed inside the server). Since Redis 6 extra I/O threads help with network reading/writing, but command execution is still single-threaded. One slow command (<code>KEYS *</code>, <code>SMEMBERS</code> on a 5-million-member set, a huge Lua script) blocks <b>everyone</b>.</p>
    <p><b>Internals worth knowing:</b> small hashes/lists/sets/sorted sets use compact encodings (listpack) that save memory; when they grow past a limit Redis converts them to hash tables, linked quicklists, or a <b>skip list + hash table</b> (sorted sets). The skip list gives O(log N) insert and rank lookups, and the hash table gives O(1) "what is this member's score?".</p>
    <p><b>Big-key and hot-key problems:</b> one key with millions of members is slow to delete and to replicate. Prefer <code>UNLINK</code> (async delete) over <code>DEL</code> for big keys, and split huge structures (<code>lb:game1:2026-10</code> per month). A single very popular key lives on one cluster shard, so it can become a hot spot — use local in-process caching or key replicas for those.</p>
    <p><b>Persistence and durability:</b> RDB snapshots and AOF logs let Redis reload after a restart, but Redis is usually used as a <b>cache or a fast helper</b>, not the source of truth. Losing a few seconds on a crash is accepted. Memory is limited: set <code>maxmemory</code> and an eviction policy (<code>allkeys-lru</code> is common for caches; <code>noeviction</code> for queues you cannot lose).</p>
    <p><b>Other types you will meet:</b> Streams (a Kafka-like append-only log with consumer groups), HyperLogLog (approximate unique counts in 12 KB), bitmaps (daily-active flags), geo (nearby search), pub/sub (fire-and-forget messages, <em>not</em> durable).</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write Redis code fast, but they often reach for the <em>string + JSON</em> habit for everything and forget TTLs. They also love <code>KEYS pattern*</code> in examples because it is short — that is a production outage waiting to happen. Redis is now also used as a <b>vector store and semantic cache</b> for LLM apps (store embeddings, find a similar earlier question, return the saved answer).</p>
    <p><b>Use AI as a partner:</b> ask <code>Given these 4 access patterns, which Redis type fits each and why? List the commands and their Big-O.</code> Then check each answer against the table above. Ask for a memory estimate: <code>how much RAM for 5 million sorted-set members?</code> and verify with <code>MEMORY USAGE</code>.</p>
    <p><b>Where AI goes wrong:</b> missing TTLs, unbounded lists (no <code>LTRIM</code>), non-atomic read-modify-write, treating pub/sub as a durable queue, and inventing commands that do not exist.</p>
    <p><b>What you must still own:</b> choosing the structure from the access pattern, key naming, TTL and eviction policy, and knowing which commands are O(N) and therefore dangerous on big keys.</p>`
});
topics.push({
  title: 'Cache-Aside with TTL: A Cached Product Endpoint',
  analogy: `<p>You are a shop assistant and customers ask for product details all day. Walking to the warehouse (the database) every time is slow. So you keep a <b>sticky-note pad at the counter</b> (the cache). A customer asks about the mug: you glance at the pad. Note there? Read it out — <b>hit</b>. No note? Walk to the warehouse, copy the details onto a new note, and stick it up — <b>miss</b>. Each note has a <b>"throw away after 5 minutes"</b> time (TTL), and when the warehouse changes a price you <b>tear off that note</b> so nobody reads old info. That is cache-aside.</p>`,
  explain: `<p><b>Cache-aside</b> (also called "lazy loading") means <b>your app code</b> manages the cache — the cache never talks to the database by itself. The read path is always the same three steps:</p>
    <ol>
      <li><b>Check the cache</b> with <code>GET product:42</code>. If found → return it (hit).</li>
      <li>If not found (miss) → <b>read the database</b>.</li>
      <li><b>Put the result in the cache</b> with a TTL (<code>SETEX product:42 300 ...</code>) and return it.</li>
    </ol>
    <p>The write path: update the database first, then <b>delete</b> the cache key (<code>DEL product:42</code>). The next read is a miss, which reloads fresh data. We delete instead of overwriting the cache because it is simpler and avoids a nasty race (more in the next topic).</p>
    ${H.table(['Request', 'Cache result', 'DB reads so far', 'Hits / Misses'], [
      ['GET product 1', '<span class="c-r">miss</span> → load from DB, store 300 s', '1', '0 / 1'],
      ['GET product 1', '<span class="c-g">hit</span>', '1', '1 / 1'],
      ['GET product 1', '<span class="c-g">hit</span>', '1', '2 / 1'],
      ['PUT product 1 (price change)', 'write DB, <b>DEL</b> key', '1', '2 / 1'],
      ['GET product 1', '<span class="c-r">miss</span> → reload fresh', '2', '2 / 2']
    ])}
    <p><b>Hit ratio</b> = hits ÷ (hits + misses). A product page with a 95% hit ratio sends only 1 in 20 requests to the database — your DB suddenly feels 20× bigger. Measure it; a cache with a 30% hit ratio is probably the wrong thing to cache or has a bad TTL.</p>
    <p><b>What to cache:</b> data that is read far more than it is written, expensive to compute, and okay to be a few seconds or minutes old (product pages, config, user profile, "top 10" lists). <b>What not to cache:</b> account balances, stock counts at checkout, anything that must be exactly right at the moment of use.</p>
    <p><b>Choosing a TTL:</b> short TTL = fresher data but more DB load; long TTL = fewer DB hits but staler data. Start with 1–10 minutes for catalog data, and let delete-on-write do the freshness work. TTL is your <em>safety net</em> if a delete is ever missed.</p>`,
  clues: [
    '"read-heavy endpoint", "DB is the bottleneck", "p99 latency too high" → add a cache in front',
    '"it is okay if data is a few minutes stale" → TTL-based cache-aside',
    '"cache hit ratio", "hit/miss metrics" → count hits and misses, alert if ratio drops',
    '"after an update users still see the old price" → missing delete-on-write or too-long TTL',
    '"the cache is down, what happens?" → app must fall back to the database (cache is an optimisation, not a dependency)',
    '"read-through / write-through / write-behind" → other patterns; cache-aside is the app-controlled one'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Runnable model: cache-aside with TTL and hit/miss counters (fake clock)',
      code: `// A tiny in-memory model of cache-aside. A fake clock keeps the output predictable.
var now = 0;                       // "seconds"
var dbReads = 0;
var db = { 1: { name: 'Mug', price: 10 }, 2: { name: 'Pen', price: 2 } };

function dbGet(id) {               // pretend this is a slow SQL query
  dbReads++;
  var row = db[id];
  return row ? { id: id, name: row.name, price: row.price } : null;
}

function TtlCache(ttl) {
  this.ttl = ttl; this.map = new Map(); this.hits = 0; this.misses = 0;
}
TtlCache.prototype.get = function (key) {
  var e = this.map.get(key);
  if (!e) { this.misses++; return undefined; }
  if (e.expiresAt <= now) {        // expired: treat like a miss and clean up
    this.map.delete(key); this.misses++; return undefined;
  }
  this.hits++; return e.value;
};
TtlCache.prototype.set = function (key, value) {
  this.map.set(key, { value: value, expiresAt: now + this.ttl });
};
TtlCache.prototype.del = function (key) { this.map.delete(key); };

var cache = new TtlCache(5);       // TTL = 5 seconds

function getProduct(id) {          // the cache-aside READ path
  var key = 'product:' + id;
  var cached = cache.get(key);
  if (cached !== undefined) return cached;
  var fresh = dbGet(id);           // miss -> go to the database
  if (fresh) cache.set(key, fresh);
  return fresh;
}
function updatePrice(id, price) {  // the cache-aside WRITE path
  db[id].price = price;            // 1) DB first
  cache.del('product:' + id);      // 2) then delete the cache key
}

function show(label) {
  var total = cache.hits + cache.misses;
  console.log(label + ' | hits=' + cache.hits + ' misses=' + cache.misses +
    ' dbReads=' + dbReads + ' ratio=' + (total ? (cache.hits / total).toFixed(2) : '-'));
}
getProduct(1); show('t=0 GET 1 (miss)');
now = 1; getProduct(1); show('t=1 GET 1 (hit)');
now = 2; getProduct(2); show('t=2 GET 2 (miss)');
now = 3; updatePrice(1, 12); show('t=3 PUT 1 -> DEL key');
now = 4; console.log('t=4 GET 1 sees price', getProduct(1).price); show('t=4 GET 1 (miss, fresh)');
now = 10; getProduct(1); show('t=10 GET 1 (TTL expired -> miss)');`
    },
    {
      lang: 'java', title: 'Plain Java: a thread-safe TTL cache with ConcurrentHashMap',
      code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

public class TtlCache<K, V> {
    // One entry = the value plus the moment it should die.
    private record Entry<V>(V value, long expiresAtMillis) {}

    private final ConcurrentHashMap<K, Entry<V>> map = new ConcurrentHashMap<>();
    private final long ttlMillis;
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();

    public TtlCache(long ttlMillis) { this.ttlMillis = ttlMillis; }

    // Cache-aside "get": return cached value, or call the loader (the DB) and store the result.
    public V get(K key, Function<K, V> loader) {
        long now = System.currentTimeMillis();
        Entry<V> e = map.get(key);
        if (e != null && e.expiresAtMillis() > now) {
            hits.incrementAndGet();
            return e.value();
        }
        misses.incrementAndGet();
        V fresh = loader.apply(key);             // slow path: database
        if (fresh != null) map.put(key, new Entry<>(fresh, now + ttlMillis));
        return fresh;
    }

    public void invalidate(K key) { map.remove(key); }   // call this after a DB write

    public double hitRatio() {
        long h = hits.get(), total = h + misses.get();
        return total == 0 ? 0 : (double) h / total;
    }

    public static void main(String[] args) {
        TtlCache<Integer, String> cache = new TtlCache<>(200);
        Function<Integer, String> db = id -> { System.out.println("DB read " + id); return "product-" + id; };
        cache.get(1, db);                  // miss, prints "DB read 1"
        cache.get(1, db);                  // hit
        cache.invalidate(1);
        cache.get(1, db);                  // miss again after invalidate
        System.out.println("hit ratio = " + cache.hitRatio());
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Spring Boot: cache-aside product endpoint with Redis (TTL + delete-on-write)',
      code: `@RestController
@RequestMapping("/products")
public class ProductController {

    private static final Duration TTL = Duration.ofMinutes(5);
    private final StringRedisTemplate redis;          // talks to Redis (host from env / config)
    private final ProductRepository repo;             // talks to the database
    private final ObjectMapper json;

    public ProductController(StringRedisTemplate redis, ProductRepository repo, ObjectMapper json) {
        this.redis = redis; this.repo = repo; this.json = json;
    }

    @GetMapping("/{id}")
    public Product get(@PathVariable long id) throws Exception {
        String key = "product:" + id;
        String cached = redis.opsForValue().get(key);          // 1) check the cache
        if (cached != null) return json.readValue(cached, Product.class);   // hit

        Product p = repo.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        // 3) store with TTL; the TTL is the safety net if a delete is ever missed
        redis.opsForValue().set(key, json.writeValueAsString(p), TTL);
        return p;
    }

    @PutMapping("/{id}")
    @Transactional
    public Product update(@PathVariable long id, @RequestBody ProductUpdate body) {
        Product p = repo.findById(id).orElseThrow();
        p.setPrice(body.price());
        Product saved = repo.save(p);                          // 1) database first
        // 2) delete the key AFTER the transaction commits, otherwise a reader can re-cache old data
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { redis.delete("product:" + id); }
        });
        return saved;
    }
}`
    }
  ],
  codeTitle: ['JS model: cache-aside + TTL + counters', 'Java ConcurrentHashMap TTL cache', 'Spring Boot endpoint'],
  viz: {
    title: 'Cache-aside request flow: hit, miss, expiry and update',
    input: '1 1 2 u1 1 w 1',
    inputLabel: 'Requests: product id (1-3), u1 = update product 1, w = wait past the TTL',
    gen: function (input) {
      var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
      if (!toks.length || toks.length > 10) throw new Error('Use 1 to 10 tokens like: 1 1 2 u1 w 1  (ids 1-3, uN = update, w = wait)');
      var TTL = 4, clock = 0, hits = 0, misses = 0, dbReads = 0;
      var cache = {};
      var names = { 1: 'Mug', 2: 'Pen', 3: 'Lamp' };
      var price = { 1: 10, 2: 2, 3: 30 };
      var frames = [];
      function nodes() {
        return [
          { id: 'C', label: 'Client', x: 9, y: 25, shape: 'box' },
          { id: 'API', label: 'API server', x: 36, y: 25, shape: 'box' },
          { id: 'R', label: 'Redis cache', x: 74, y: 8, shape: 'box' },
          { id: 'D', label: 'Database', x: 74, y: 42, shape: 'box' }
        ];
      }
      var edges = [['C', 'API'], ['API', 'R'], ['API', 'D']];
      function cacheRows() {
        var rows = [], keys = Object.keys(cache).sort();
        keys.forEach(function (k) { rows.push([k, cache[k].v, cache[k].exp, cache[k].exp <= clock ? 'expired' : 'fresh']); });
        return rows.length ? rows : [['(empty)', '', '', '']];
      }
      function snap(narr, hl, ehl, tags) {
        var rows = cacheRows(), th = {};
        rows.forEach(function (r, i) { if (r[3] === 'expired') th[i] = 'bad'; });
        frames.push({ narr: narr, parts: [
          { type: 'graph', label: 'Request path', directed: true, height: 50, nodes: nodes(), edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} },
          { type: 'vars', label: 'Counters', vals: { clock: clock, hits: hits, misses: misses, dbReads: dbReads, hitRatio: (hits + misses) ? (hits / (hits + misses)).toFixed(2) : '-' }, hl: { hits: 'ok', misses: 'bad' } },
          { type: 'table', label: 'Redis keys (TTL = ' + TTL + ')', columns: ['key', 'value', 'expires at', 'state'], rows: rows, hl: th }
        ] });
      }
      snap('Empty cache, clock = 0. TTL is ' + TTL + ' time units. Each request moves the clock by 1.', {}, {}, {});
      toks.forEach(function (t) {
        var m;
        if (t === 'w') {
          clock += TTL + 1;
          snap('<b>Wait ' + (TTL + 1) + ' units.</b> Clock is now ' + clock + '. Any key older than its TTL is expired (red).', { R: 'cur' }, {}, { R: 'time passes' });
          return;
        }
        if ((m = /^u([1-3])$/.exec(t))) {
          var id = +m[1], key = 'product:' + id;
          clock++; price[id] += 5;
          snap('<b>PUT /products/' + id + '</b>: step 1, write the new price (' + price[id] + ') to the database.', { D: 'ok', API: 'cur' }, { 'C-API': 'cur', 'API-D': 'ok' }, { D: 'price=' + price[id] });
          delete cache[key];
          snap('Step 2: <b>DEL ' + key + '</b>. The next read is a miss and reloads the fresh price.', { R: 'bad', API: 'cur' }, { 'API-R': 'bad' }, { R: 'key deleted' });
          return;
        }
        if (!/^[1-3]$/.test(t)) throw new Error('Bad token "' + t + '". Use ids 1-3, uN (update) or w (wait).');
        var pid = +t, k = 'product:' + pid;
        clock++;
        snap('<b>GET /products/' + pid + '</b> arrives at the API.', { API: 'cur', C: 'cur' }, { 'C-API': 'cur' }, {});
        var e = cache[k];
        if (e && e.exp > clock) {
          hits++;
          snap('<span class="c-g">HIT.</span> Redis has <code>' + k + '</code> and it has not expired. Answer returned without touching the database.', { R: 'ok', API: 'cur' }, { 'API-R': 'ok', 'C-API': 'ok' }, { R: 'HIT' });
        } else {
          misses++;
          snap('<span class="c-r">MISS.</span> ' + (e ? 'The key expired.' : 'The key is not there.') + ' The API must ask the database.', { R: 'bad', API: 'cur' }, { 'API-R': 'bad' }, { R: 'MISS' });
          dbReads++;
          snap('The API reads product ' + pid + ' from the database (slow path). dbReads = ' + dbReads + '.', { D: 'cur', API: 'cur' }, { 'API-D': 'cur' }, { D: 'SELECT' });
          cache[k] = { v: names[pid] + ' $' + price[pid], exp: clock + TTL };
          snap('The API stores the row in Redis: <code>SETEX ' + k + ' ' + TTL + '</code> and returns it. Next time this is a hit.', { R: 'ok', API: 'ok' }, { 'API-R': 'ok' }, { R: 'stored' });
        }
      });
      return frames;
    }
  },
  examples: [
    { title: 'Hit path: the happy 95%', html: `<p>Request 2 for the same product, 1 second later. Redis returns the stored JSON in ~0.3 ms. The database is never touched. If your endpoint serves 1,000 requests per second for 50 popular products, almost all of them are hits and the database sees about 50 queries per TTL window instead of 1,000 per second.</p>` },
    { title: 'Miss path: first request and after expiry', html: `<p>Key missing → one database query (~5-20 ms) → <code>SETEX</code> → response. After the TTL passes the key vanishes, so the <em>next</em> request is a miss again and refreshes it. The TTL guarantees data is never older than the TTL even if you forget a delete somewhere.</p>`, code: { lang: 'bash', code: `redis-cli GET product:42        # (nil) -> miss\nredis-cli SETEX product:42 300 '{"id":42,"price":10}'\nredis-cli TTL product:42        # 297\nredis-cli GET product:42        # hit` } },
    { title: 'Write path: update DB, then delete the key', html: `<p>Admin changes the mug price from 10 to 12. Steps: (1) <code>UPDATE products SET price = 12</code>, commit; (2) <code>DEL product:1</code>. Why delete rather than <code>SET</code> the new value? If you wrote the cache from the update handler, two concurrent updates can finish in a different order in the cache than in the database and leave the <b>older</b> value cached until TTL. A delete cannot store a wrong value; at worst it causes one extra miss.</p>` },
    { title: 'Cache is down: degrade, do not die', html: `<p>Wrap every Redis call in try/catch (or a circuit breaker). If Redis throws a timeout, log it, skip the cache, and read the database. Use short timeouts (e.g. 50-100 ms) so a sick cache does not make every request slow. The cache is an optimisation — the product page must still work without it, just slower.</p>` }
  ],
  deepDive: `<p><b>Other caching patterns (know the names):</b> <b>Read-through</b> — the cache library loads from the DB for you on a miss (same idea, hidden inside the cache). <b>Write-through</b> — every write goes to cache and DB together, so reads are always fresh but writes are slower. <b>Write-behind / write-back</b> — write to cache, flush to the DB later: fast, but you can lose data if the cache dies. <b>Refresh-ahead</b> — reload popular keys just before they expire. Cache-aside is the default for web apps because it is simple and survives cache failure.</p>
    <p><b>Serialisation matters:</b> JSON is easy to debug; MessagePack/Protobuf are smaller and faster. Whatever you pick, <b>version your cached shape</b> (<code>product:v2:42</code>). During a deploy, old servers and new servers share one Redis, and a new field can crash old readers.</p>
    <p><b>Don't cache the "not found" forever, and don't cache errors:</b> cache only successful, complete results. For missing rows use a short "negative cache" (30-60 s) — see the next topic on penetration.</p>
    <p><b>Local + remote (two-level cache):</b> a tiny in-process cache (Caffeine in Java, <code>lru-cache</code> in Node) with a 5-30 s TTL in front of Redis removes network trips for the hottest keys. Cost: each server may hold a slightly different stale copy.</p>
    <p><b>Spring's abstraction:</b> <code>@Cacheable</code>, <code>@CachePut</code>, <code>@CacheEvict</code> hide the pattern behind annotations. Great for simple cases, but know what they do — they use the method arguments as the key, and self-invocation (calling a cached method from the same class) bypasses the proxy so nothing is cached.</p>
    <p><b>Observability:</b> export <code>keyspace_hits</code> / <code>keyspace_misses</code> from <code>INFO stats</code>, plus your own per-endpoint hit ratio. Watch evictions: if Redis evicts hot keys because memory is full, your hit ratio silently collapses.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant will happily add <code>@Cacheable</code> everywhere in seconds. The danger is the part it cannot see: which data may be stale, what the invalidation story is, and whether the cached object contains user-specific or permission-filtered fields (leaking one user's data to another through a shared key is a real incident type). Also, LLM apps now add a <b>semantic cache</b> — hash/embedding of the prompt as key — to save tokens and latency; the same TTL and invalidation questions apply when the underlying documents change.</p>
    <p><b>Use AI as a partner:</b> paste your endpoint and ask <code>List every code path that changes this entity and tell me which ones forget to evict the cache.</code> Ask it to generate a hit/miss/expiry test with a fake clock (like the model above).</p>
    <p><b>Where AI goes wrong:</b> forgets TTL, caches inside a transaction before commit, builds keys without the tenant/user id, caches null results forever, and swallows Redis exceptions silently with no metric.</p>
    <p><b>What you must still own:</b> deciding what staleness the business accepts, the key design (what makes two requests "the same"), and the invalidation rule for every writer.</p>`,
  problems: [
    {
      title: 'Cache the Product Details Endpoint',
      level: 'Medium', tags: ['cache-aside', 'redis', 'ttl'], companies: ['Amazon', 'Flipkart', 'Shopify'],
      statement: `<p>Your <code>GET /products/{id}</code> endpoint runs a join across three tables and takes ~40 ms. Traffic is 2,000 requests/second, 98% reads, spread over ~20,000 popular products. Add a Redis cache with cache-aside. Describe the key design, TTL, what happens on <code>PUT /products/{id}</code>, and how you will know it works.</p>`,
      constraints: `Products change a few times per day. A price may be up to 5 minutes stale on the product page, but never wrong at checkout. Redis may be briefly unavailable.`,
      example: `<p>Read: <code>GET product:v1:42</code> → miss → DB → <code>SETEX product:v1:42 300 json</code>. Write: update DB → commit → <code>DEL product:v1:42</code>.</p><p>${H.c('g', 'After warm-up: ~95% hits, DB load drops from 2,000 qps to ~100 qps.')}</p>`,
      brute: { why: `<p>Every request hits the database: 2,000 × 40 ms of query work per second needs dozens of busy DB connections. The pool saturates, latency climbs for everybody, and one slow day takes the whole site down.</p>` },
      mcq: { q: 'Which write-path is safest for a cache-aside product cache?', options: ['Update the DB, then delete the cache key', 'Update the cache, then update the DB', 'Delete the cache key, then update the DB', 'Never invalidate; rely only on TTL'], answer: 0, explain: 'DB-first then delete avoids caching a value the DB does not have. Deleting before the DB write lets a concurrent reader re-cache the old row. TTL-only means up to a full TTL of stale data.' },
      hints: [`<p>Think in two paths: the <b>read path</b> (check cache → DB → store with TTL) and the <b>write path</b> (DB → delete key). Write them as 3-line lists first.</p>`, `<p>Key = <code>product:v1:{id}</code> (version prefix lets you change the JSON shape safely). Value = JSON string. TTL = 300 s plus a few seconds of random jitter.</p>`, `<p>Edge cases: Redis down (catch + fall back to DB with a short timeout), missing product (short negative cache), delete only after the transaction commits, metrics for hit ratio.</p>`],
      solution: {
        approach: `<p><b>Read path.</b> Build the key <code>product:v1:{id}</code>. Try <code>GET</code> with a 50 ms timeout. Hit: parse JSON and return. Miss (or Redis error): query the database, and if the row exists store it with <code>SET key json EX 300+random(0..30)</code> (jitter stops many keys expiring at the same second). If the row does not exist, return 404 and optionally store a tiny marker with a 30-60 s TTL so repeated bad ids do not reach the database.</p>
          <p><b>Write path.</b> In the same service method that updates the product: update the DB inside a transaction, and register an after-commit hook that runs <code>DEL product:v1:{id}</code>. Deleting after commit matters: if you delete before commit, a concurrent reader can miss, read the still-old row, and re-cache it for 5 minutes. The TTL is the safety net for the rare case where the delete fails (log it and alert).</p>
          <p><b>Checkout.</b> Because the business says checkout must be exact, the cart/checkout service reads the price directly from the database (or a versioned price table), not from this cache.</p>
          <p><b>Failure handling.</b> Redis down means more load on the DB, so use a circuit breaker so we stop calling Redis for a few seconds after repeated failures, and keep DB connection-pool limits so a cold cache does not flatten the database.</p>
          <p><b>Proof it works.</b> Dashboard: hit ratio per endpoint (target above 90%), DB queries per second before/after, p50/p99 latency, Redis evictions and memory. Load-test with a cold cache to confirm the DB survives the warm-up.</p>`,
        complexity: `<p>Cache hit: O(1), ~0.3 ms plus JSON parse. Miss: one DB query plus one Redis write. Memory: 20,000 products × ~2 KB ≈ 40 MB, tiny.</p>`,
        followUps: ['What if one hot product gets 50,000 qps? (local in-process cache + request coalescing)', 'How would you cache a list endpoint like /products?category=mugs&page=2?']
      }
    }
  ]
});
topics.push({
  title: 'Cache Invalidation in Real Apps: Stale Data, Stampedes, Penetration',
  analogy: `<p>There is a famous joke that the two hard things in computing are naming things and cache invalidation. Picture a <b>restaurant menu board</b> outside the door. When the chef runs out of fish, somebody has to walk out and wipe fish off the board. If they forget, customers keep ordering fish (stale data). If a famous dish expires at noon and <b>200 people ask for it at 12:00:01</b>, all 200 rush the kitchen at once (stampede). If people keep asking for a dish that was never on the menu, the kitchen wastes time checking every time (penetration). Invalidation is the job of keeping the board honest without crushing the kitchen.</p>`,
  explain: `<p>"Invalidation" means making sure the cache stops serving data that is no longer true. You have four tools, and good apps combine them:</p>
    ${H.table(['Tool', 'How it works', 'Good for', 'Weakness'], [
      ['TTL (expire)', 'key dies after N seconds', 'a safety net for everything', 'data can be stale up to N seconds'],
      ['Delete on write', 'after DB commit, <code>DEL key</code>', 'one entity changed (product, profile)', 'you must find <em>every</em> key affected (lists, search pages)'],
      ['Versioned keys', 'key contains a version: <code>product:42:v7</code>; bump version on write', 'lists and groups: bump one counter and all old keys become unreachable', 'old keys stay until TTL, so use short TTLs'],
      ['Event-driven', 'a change event (outbox/Kafka) tells every cache owner to delete', 'microservices, many caches', 'needs reliable delivery, small delay']
    ])}
    <p><b>The three classic cache failures:</b></p>
    <ul>
      <li><b>Stampede (thundering herd):</b> a hot key expires and hundreds of requests all miss at once and all hit the database. <span class="c-b">Fix:</span> let only <em>one</em> request rebuild it (a lock or "single-flight"), add <b>TTL jitter</b> (random extra seconds so keys do not expire together), or refresh popular keys before they expire.</li>
      <li><b>Penetration:</b> requests for keys that <em>do not exist</em> (a bot asking product ids 9,000,000+) always miss, always hit the DB. <span class="c-b">Fix:</span> cache the "not found" result for 30-60 s (negative caching), validate ids, rate-limit, or use a Bloom filter of valid ids.</li>
      <li><b>Avalanche:</b> many keys (or the whole Redis) disappear at once, so the database takes the full load. <span class="c-b">Fix:</span> jittered TTLs, Redis replicas/cluster, a circuit breaker, and DB connection limits so the DB survives a cold cache.</li>
    </ul>
    <p><b>The ordering rule:</b> <span class="c-g">update the database first, delete the cache key second (after commit).</span> Reversing it can leave stale data cached for a full TTL — see the race visualiser below.</p>`,
  clues: [
    '"the cache and the DB disagree" / "users see the old value after update" → invalidation bug (ordering, missed key, or no TTL)',
    '"popular key expires and the DB spikes" → stampede → single-flight lock, jitter, refresh-ahead',
    '"requests for ids that do not exist keep hitting the DB" → penetration → negative cache / Bloom filter',
    '"all cache entries were created at deploy time and died together" → avalanche → TTL jitter',
    '"list pages and search results must update when one item changes" → versioned keys or short TTL, not per-key delete',
    '"many services keep their own cache of this entity" → event-driven invalidation'
  ],
  code: [
    {
      lang: 'java', title: 'Plain Java: single-flight so only ONE thread rebuilds a missing key',
      code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

public class SingleFlight<K, V> {
    // key -> the one in-progress load. Everyone else waits on the same future.
    private final ConcurrentHashMap<K, CompletableFuture<V>> inFlight = new ConcurrentHashMap<>();

    public V load(K key, Supplier<V> loader) throws Exception {
        CompletableFuture<V> mine = new CompletableFuture<>();
        CompletableFuture<V> existing = inFlight.putIfAbsent(key, mine);
        if (existing != null) {
            return existing.get();                  // someone else is already loading: just wait
        }
        try {
            V v = loader.get();                     // I am the leader: do the slow DB call once
            mine.complete(v);
            return v;
        } catch (RuntimeException e) {
            mine.completeExceptionally(e);          // waiters see the failure too
            throw e;
        } finally {
            inFlight.remove(key);                   // next miss can start a new load
        }
    }

    public static void main(String[] args) throws Exception {
        SingleFlight<String, String> sf = new SingleFlight<>();
        AtomicInteger dbCalls = new AtomicInteger();
        ExecutorService pool = Executors.newFixedThreadPool(20);
        CountDownLatch go = new CountDownLatch(1);
        for (int i = 0; i < 20; i++) {
            pool.submit(() -> {
                go.await();                          // release all 20 threads at the same moment
                return sf.load("product:1", () -> {
                    dbCalls.incrementAndGet();
                    try { Thread.sleep(100); } catch (InterruptedException ignored) {}
                    return "Mug";
                });
            });
        }
        go.countDown();
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("DB calls for 20 concurrent requests: " + dbCalls.get());
    }
}`
    },
    {
      lang: 'python', run: true, title: 'Runnable model: stampede with and without a rebuild lock, plus TTL jitter',
      code: `import random

def stampede(requests, use_lock):
    """All requests arrive in the same instant right after a hot key expired."""
    db_calls = 0
    rebuilding = False
    for _ in range(requests):
        if use_lock:
            if not rebuilding:          # first request wins the lock and rebuilds
                rebuilding = True
                db_calls += 1
            # the rest wait and read the freshly cached value (no DB call)
        else:
            db_calls += 1               # everybody misses and queries the DB
    return db_calls

print("200 requests, no protection :", stampede(200, False), "DB calls")
print("200 requests, rebuild lock  :", stampede(200, True), "DB call")

# TTL jitter: 1000 keys all cached at the same second
random.seed(7)
base = 300
same = {base for _ in range(1000)}
jittered = [base + random.randint(0, 60) for _ in range(1000)]
print("distinct expiry moments, fixed TTL   :", len(same))
print("distinct expiry moments, jittered TTL:", len(set(jittered)))
print("worst second, fixed TTL   : 1000 keys expire together")
worst = max(jittered.count(x) for x in set(jittered))
print("worst second, jittered TTL:", worst, "keys expire together")`
    },
    {
      lang: 'java', check: false, title: 'Redis lock for rebuilding + negative caching + jitter (Spring Data Redis)',
      code: `public Product getProduct(long id) throws Exception {
    String key = "product:v1:" + id;
    String cached = redis.opsForValue().get(key);
    if (cached != null) {
        return NOT_FOUND_MARKER.equals(cached) ? null : json.readValue(cached, Product.class);
    }

    // Only one server rebuilds. SET NX with a short expiry so a crashed server cannot hold it forever.
    String lockKey = "lock:" + key;
    Boolean gotLock = redis.opsForValue().setIfAbsent(lockKey, "1", Duration.ofSeconds(5));
    if (Boolean.TRUE.equals(gotLock)) {
        try {
            Optional<Product> row = repo.findById(id);
            if (row.isPresent()) {
                long jitter = ThreadLocalRandom.current().nextLong(0, 60);   // spread expiry times
                redis.opsForValue().set(key, json.writeValueAsString(row.get()), Duration.ofSeconds(300 + jitter));
                return row.get();
            }
            // penetration guard: remember "does not exist" for a short time
            redis.opsForValue().set(key, NOT_FOUND_MARKER, Duration.ofSeconds(45));
            return null;
        } finally {
            redis.delete(lockKey);
        }
    }
    // Lost the race: wait briefly and re-read the cache instead of hitting the DB.
    Thread.sleep(50);
    String again = redis.opsForValue().get(key);
    return again == null ? repo.findById(id).orElse(null) : json.readValue(again, Product.class);
}`
    },
    {
      lang: 'java', check: false, title: 'Event-driven invalidation after commit (Spring)',
      code: `// 1) The service publishes a domain event inside the transaction.
@Transactional
public void changePrice(long id, BigDecimal price) {
    Product p = repo.findById(id).orElseThrow();
    p.setPrice(price);
    events.publishEvent(new ProductChanged(id));
}

// 2) The listener runs ONLY after the transaction committed successfully.
@Component
class ProductCacheEvictor {
    private final StringRedisTemplate redis;
    ProductCacheEvictor(StringRedisTemplate redis) { this.redis = redis; }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void on(ProductChanged e) {
        redis.delete("product:v1:" + e.id());
        // list pages are cheaper to version than to find: bump one counter
        redis.opsForValue().increment("products:list:version");
    }
}`
    }
  ],
  codeTitle: ['Single-flight (plain Java, compiles and runs)', 'Stampede and jitter model (Python)', 'Lock + negative cache + jitter', 'Event-driven eviction after commit'],
  viz: [
    {
      title: 'Cache stampede: 200 requests hit an expired hot key',
      input: '8',
      inputLabel: 'Number of simultaneous requests (2-12)',
      gen: function (input) {
        var n = parseInt(input, 10);
        if (isNaN(n) || n < 2 || n > 12) throw new Error('Enter a number between 2 and 12');
        var frames = [], reqs = [], i;
        for (i = 1; i <= n; i++) reqs.push('req' + i);
        frames.push({ narr: 'The hot key <code>product:42</code> just <b>expired</b>. ' + n + ' requests arrive in the same instant. First, what happens with <b>no protection</b>.', parts: [
          { type: 'queue', label: 'Incoming requests', items: reqs.slice(), frontLabel: 'first', backLabel: 'last' },
          { type: 'vars', label: 'Database load', vals: { cacheHit: 'no', dbQueries: 0 }, hl: {} }
        ] });
        var hl = {}; reqs.forEach(function (r, k) { hl[k] = 'bad'; });
        frames.push({ narr: 'Every request checks Redis, sees a <span class="c-r">miss</span>, and decides to rebuild the value. All ' + n + ' go to the database together.', parts: [
          { type: 'queue', label: 'All requests are sent to the DB', items: reqs.slice(), hl: hl },
          { type: 'vars', label: 'Database load', vals: { cacheHit: 'no', dbQueries: n }, hl: { dbQueries: 'bad' } },
          { type: 'bars', label: 'Queries hitting the DB (one bar per request)', values: reqs.map(function () { return 1; }), hl: hl }
        ] });
        frames.push({ narr: 'With 200 or 2,000 real requests the database falls over, which makes the rebuild slower, which lets <em>more</em> requests miss. This feedback loop is how a small cache expiry becomes an outage.', parts: [
          { type: 'vars', label: 'Result without protection', vals: { dbQueries: n, outcome: 'DB overloaded' }, hl: { outcome: 'bad', dbQueries: 'bad' } }
        ] });
        frames.push({ narr: 'Now <b>single-flight</b>: the first request grabs a rebuild lock (<code>SET lock:product:42 NX PX 5000</code>) and becomes the <b>leader</b>. The others wait.', parts: [
          { type: 'queue', label: 'Requests', items: reqs.slice(), hl: (function () { var h = { 0: 'ok' }; for (var k = 1; k < n; k++) h[k] = 'cur'; return h; })() },
          { type: 'vars', label: 'State', vals: { leader: 'req1', waiting: n - 1, dbQueries: 0 }, hl: { leader: 'ok' } }
        ] });
        frames.push({ narr: 'The leader runs <b>one</b> database query and writes the result to Redis with a fresh TTL. The waiting requests are still parked.', parts: [
          { type: 'graph', label: 'Rebuild', directed: true, height: 40, nodes: [{ id: 'L', label: 'Leader req1', x: 12, y: 20, shape: 'box' }, { id: 'D', label: 'Database', x: 50, y: 20, shape: 'box' }, { id: 'R', label: 'Redis', x: 86, y: 20, shape: 'box' }], edges: [['L', 'D', '1 query'], ['D', 'R', 'SETEX']], hl: { L: 'ok', D: 'cur', R: 'ok' }, ehl: { 'L-D': 'ok', 'D-R': 'ok' } },
          { type: 'vars', label: 'State', vals: { dbQueries: 1, cache: 'filled' }, hl: { dbQueries: 'ok', cache: 'ok' } }
        ] });
        frames.push({ narr: 'The waiting requests wake up, read the fresh value from Redis, and answer. Database queries: <b>1</b> instead of ' + n + '.', parts: [
          { type: 'queue', label: 'Requests now served from cache', items: reqs.slice(), hl: (function () { var h = {}; for (var k = 0; k < n; k++) h[k] = 'ok'; return h; })() },
          { type: 'bars', label: 'DB queries: before (no lock) vs after (single-flight)', values: [n, 1], texts: [String(n), '1'], idxLabels: ['no lock', 'single-flight'], hl: { 0: 'bad', 1: 'ok' } }
        ] });
        return frames;
      }
    },
    {
      title: 'Ordering race: why DB-first then DELETE',
      input: 'delete-first',
      inputLabel: 'Order: delete-first | db-first | rare-race',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        var plans = {
          'delete-first': [
            ['Writer', 'DEL product:1 (cache deleted before the DB write)', 10, null, 'Writer deletes the key <b>first</b>. DB still says 10.'],
            ['Reader', 'GET product:1 → miss, SELECT price → 10', 10, null, 'A reader arrives, misses, and reads the <b>old</b> price 10 from the DB.'],
            ['Writer', 'UPDATE price = 12, commit', 12, null, 'Writer now updates the DB to 12.'],
            ['Reader', 'SET product:1 = 10 (EX 300)', 12, 10, '<span class="c-r">Reader caches the old value 10.</span> DB says 12. This stale value stays for the whole TTL.']
          ],
          'db-first': [
            ['Writer', 'UPDATE price = 12, commit', 12, null, 'Writer updates the DB <b>first</b> and commits.'],
            ['Writer', 'DEL product:1', 12, null, 'Writer deletes the cache key.'],
            ['Reader', 'GET product:1 → miss, SELECT price → 12', 12, null, 'Reader misses and reads the <b>new</b> price 12.'],
            ['Reader', 'SET product:1 = 12 (EX 300)', 12, 12, '<span class="c-g">Cache and DB agree: 12.</span> Safe.']
          ],
          'rare-race': [
            ['Reader', 'GET product:1 → miss, SELECT price → 10', 10, null, 'Reader misses and reads the old price 10 (slow query still running).'],
            ['Writer', 'UPDATE price = 12, commit', 12, null, 'Writer updates the DB to 12.'],
            ['Writer', 'DEL product:1 (nothing to delete yet)', 12, null, 'Writer deletes the key, but the reader has not cached anything yet.'],
            ['Reader', 'SET product:1 = 10 (EX 300)', 12, 10, '<span class="c-r">Reader finally caches the old 10.</span> Rare (needs a slow read overlapping a write), and the TTL limits the damage to 300 s.']
          ]
        };
        var plan = plans[mode];
        if (!plan) throw new Error('Type one of: delete-first, db-first, rare-race');
        var frames = [{ narr: 'Start: DB price = 10 and the cache is empty. A writer wants to change the price to 12 while a reader is reading. Order: <b>' + mode + '</b>.', parts: [{ type: 'vars', label: 'State', vals: { dbPrice: 10, cachePrice: 'empty' }, hl: {} }] }];
        var hist = [];
        plan.forEach(function (st, i) {
          hist.push([String(i + 1), st[0], st[1]]);
          var last = i === plan.length - 1;
          var bad = last && st[3] !== null && st[3] !== st[2];
          var good = last && st[3] !== null && st[3] === st[2];
          frames.push({ narr: st[4], parts: [
            { type: 'table', label: 'Timeline', columns: ['#', 'Who', 'Action'], rows: hist.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = bad ? 'bad' : 'cur'; return h; })() },
            { type: 'vars', label: 'State', vals: { dbPrice: st[2], cachePrice: st[3] === null ? 'empty' : st[3] }, hl: bad ? { cachePrice: 'bad' } : (good ? { cachePrice: 'ok' } : {}) }
          ] });
        });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'TTL jitter in one line', html: `<p>You warm 10,000 product keys at deploy time, all with TTL 300. Five minutes later all 10,000 expire in the same second and the database takes 10,000 queries at once. Add randomness: <code>ttl = 300 + random(0, 60)</code>. Now expiries spread over a minute — about 170 per second, which the DB handles easily.</p>`, code: { lang: 'java', check: false, code: `long ttl = 300 + ThreadLocalRandom.current().nextLong(0, 60);\nredis.opsForValue().set(key, value, Duration.ofSeconds(ttl));` } },
    { title: 'Negative caching stops id-scanning bots', html: `<p>A scraper requests <code>/products/9000001</code>, <code>/products/9000002</code>, ... None exist, so none are ever cached and every request runs a DB query. Store a small marker <code>NOT_FOUND</code> for 45 seconds. A repeated bad id now costs one Redis read. For a scan of <em>new</em> ids each time, also validate the id range and rate-limit the client; a Bloom filter of valid ids answers "definitely not there" in memory.</p>` },
    { title: 'Versioned keys for list pages', html: `<p>Keys like <code>products:list:page=2&amp;cat=mugs</code> are impossible to find and delete when one mug changes. Instead include a version: <code>products:list:v{N}:page=2&amp;cat=mugs</code> where N is a counter in Redis. On any product write do <code>INCR products:list:version</code>. All old list keys become unreachable immediately and expire on their own TTL.</p>${H.table(['Event', 'version counter', 'key read'], [['start', '7', 'products:list:v7:page=2'], ['product edited → INCR', '8', 'products:list:v8:page=2 (miss, rebuilt)'], ['old key', '-', 'v7 entries die at TTL']])}` },
    { title: 'Write-through vs delete: which one?', html: `<p>Write-through (put the new value in the cache on every write) gives fresh reads immediately but can store a value that was later rolled back, and two concurrent writers can leave the older value in the cache. Delete-on-write gives one extra miss but is always correct. Choose write-through only when read-after-write freshness is critical and you serialise writes per key.</p>` }
  ],
  deepDive: `<p><b>Why "delete after commit" and not "inside the transaction":</b> if you delete the key before commit, a reader on another connection cannot yet see your change (default isolation), so it reloads the old row and re-caches it. After-commit hooks (<code>afterCommit</code>, <code>@TransactionalEventListener(AFTER_COMMIT)</code>) close that window. A remaining tiny race (the "rare-race" in the visualiser) exists with any cache-aside design; TTL bounds it. If you need stronger guarantees, use <b>delayed double delete</b> (delete again ~500 ms later), or <b>versioned values</b> (write cache only if the version is newer, using a Lua script or compare-and-set), or read from the primary DB for critical paths.</p>
    <p><b>Delete can fail.</b> Redis may be unreachable at the moment of the write. Options: retry from a queue; write the invalidation into an <b>outbox</b> table in the same DB transaction and have a worker delete keys until it succeeds (see Microservices Patterns, transactional outbox); or rely on a short TTL. Alert on failed evictions.</p>
    <p><b>Stampede mitigation menu:</b> (1) single-flight / lock, (2) <b>stale-while-revalidate</b>: serve the expired value once more while one background thread refreshes, (3) <b>probabilistic early expiry</b>: each reader has a tiny, growing chance to refresh before the TTL (the "XFetch" idea), (4) pre-warm known hot keys, (5) request coalescing at the CDN or gateway.</p>
    <p><b>Locks in cache rebuilds are different from business locks.</b> A rebuild lock only prevents wasted work; if it fails, the worst case is a few duplicate DB reads, so a simple <code>SET NX PX</code> is fine. A lock that protects <em>correctness</em> (never charge twice) needs more care — see the distributed lock topic.</p>
    <p><b>Multi-level caches:</b> browser/CDN, in-process (Caffeine), Redis, DB. Each level multiplies staleness. Document the maximum staleness of each (e.g. CDN 60 s + local 10 s + Redis 300 s) and be honest in the product requirements about the sum.</p>
    <p><b>Cache keys must include everything that changes the answer:</b> tenant id, locale, currency, user role/permissions, API version, feature-flag variant. Forgetting one gives wrong prices or, worse, leaks another customer's data.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI makes it very easy to sprinkle caches everywhere, which multiplies the invalidation surface. It also changes <em>what</em> is cached: LLM responses, embeddings, and retrieval results. Those caches are invalidated by <b>content change</b> (a document was edited, a policy was updated) and by <b>model/prompt version</b> change — so include the model name and prompt version in the key (<code>answer:gpt-x:prompt-v3:hash(question)</code>), or yesterday's answer will be served from today's new prompt.</p>
    <p><b>Use AI as a partner:</b> give it your entity-write code paths and ask <code>For each write path, which cache keys become stale? Build a table: write operation → keys to evict.</code> Ask it to design a chaos test: kill Redis for 30 seconds during load and report DB connections.</p>
    <p><b>Where AI goes wrong:</b> suggests delete-before-write, forgets list and aggregate keys, uses a single fixed TTL for everything, and proposes "just use a distributed lock" for problems a TTL jitter would fix.</p>
    <p><b>What you must still own:</b> the staleness budget agreed with product, the exhaustive list of writers, and testing the failure modes (Redis down, delete failed, slow reader overlapping a writer).</p>`,
  problems: [
    {
      title: 'Stop a Cache Stampede on the Homepage Banner',
      level: 'Medium', tags: ['stampede', 'cache', 'locks'], companies: ['Netflix', 'Twitter', 'Uber'],
      statement: `<p>The homepage banner JSON is cached in Redis for 60 seconds and costs 800 ms of database work to rebuild. At 3,000 requests/second, every 60 seconds the database spikes to hundreds of concurrent identical queries and the site slows down for about 10 seconds. Propose and describe a fix, including what happens when the rebuilding server crashes.</p>`,
      constraints: `Five app servers, one Redis. Serving a banner up to 10 seconds old is acceptable. Do not add new infrastructure.`,
      example: `<p>Before: at second 60, <b>~2,400</b> requests miss during the 800 ms rebuild → 2,400 identical DB queries.</p><p>After: ${H.c('g', '1 DB query')}; the other 2,399 requests either get the slightly-stale copy or wait a few milliseconds for the fresh one.</p>`,
      brute: { why: `<p>"Just make the TTL longer" only moves the spike to a later time and makes data staler. "Rebuild on every request" is the problem itself. Without coordination every miss triggers its own rebuild, so database load is proportional to traffic during the rebuild window.</p>` },
      mcq: { q: 'Which technique lets users keep getting a response while ONE worker refreshes the value?', options: ['Stale-while-revalidate', 'Negative caching', 'Larger connection pool', 'Cache penetration filter'], answer: 0, explain: 'Stale-while-revalidate serves the old (slightly expired) value while a single background refresh runs, so nobody waits and the DB sees one query.' },
      hints: [`<p>The problem is not the miss itself; it is <b>many parallel rebuilds</b> of the same value. How can you make sure only one rebuild runs?</p>`, `<p>Two tools together: a rebuild lock (<code>SET lock:banner NX PX 5000</code>) and a <b>soft TTL</b>: store the value with a hard TTL of 120 s but an inner "refreshAfter" time of 50 s.</p>`, `<p>Recipe: read value; if now &gt; refreshAfter, try the lock; the winner refreshes in the background; everyone else returns the old value. The lock has an expiry so a crashed server cannot block refreshes forever.</p>`],
      solution: {
        approach: `<p><b>Design.</b> Store the banner as a small JSON envelope <code>{"data": ..., "refreshAfter": epochSeconds}</code> with a <b>hard</b> Redis TTL of 120 s, but a <b>soft</b> expiry (refreshAfter) of 50 s. Readers behave like this:</p>
          <ol><li>Read the envelope. If missing (cold start): take the rebuild lock, rebuild, store, return. Losers wait 50-100 ms and re-read.</li>
          <li>If present and <code>now &lt; refreshAfter</code>: return it (normal hit).</li>
          <li>If present but <code>now ≥ refreshAfter</code>: try <code>SET lock:banner 1 NX PX 5000</code>. If you win, refresh (the 800 ms query) and write the new envelope. Everyone else just returns the current (up to ~10 s old) data without waiting.</li></ol>
          <p><b>Crash safety.</b> The lock key has a 5 s expiry, so if the leader dies mid-rebuild the next request after 5 s takes over. The hard TTL (120 s) is longer than the soft expiry so the value is never absent during a normal refresh. Release the lock only if it is still yours (store a random token and delete via a small Lua script) so a slow leader does not delete someone else's lock.</p>
          <p><b>Extras.</b> Add 0-10 s of jitter to refreshAfter so the five app servers do not all try at the same instant, and export a metric for "refresh happened", "refresh failed" and "served stale". The result: exactly one 800 ms query per refresh period instead of thousands, and users never wait.</p>`,
        complexity: `<p>Per request: one Redis GET (O(1)). Per refresh period: one DB query and a few Redis writes.</p>`,
        followUps: ['What if the refresh keeps failing? (keep serving stale up to the hard TTL, alert, back off)', 'How is this different from a CDN stale-while-revalidate header?']
      }
    }
  ]
});
topics.push({
  title: 'Sorted Sets: Real-Time Leaderboards and Ranking',
  analogy: `<p>A <b>sorted set</b> is the big scoreboard in a bowling alley. Each player's name is written once, next to a score. When someone bowls a strike and their score goes up, they slide up the board on their own — nobody re-sorts the whole list. You can ask "who are the top 3?", "what rank is Asha?" or "who is just above and below me?", and the answer comes back instantly even if ten million people are on the board.</p>`,
  explain: `<p>A Redis <b>sorted set</b> (ZSET) stores unique <b>members</b>, each with a numeric <b>score</b>. Redis keeps them ordered by score all the time. The key commands:</p>
    ${H.table(['Command', 'What it does', 'Cost'], [
      ['<code>ZADD lb 250 asha</code>', 'add member or set its score', 'O(log N)'],
      ['<code>ZINCRBY lb 40 asha</code>', 'add 40 to asha\'s score (atomic)', 'O(log N)'],
      ['<code>ZREVRANGE lb 0 9 WITHSCORES</code>', 'top 10, highest first', 'O(log N + 10)'],
      ['<code>ZREVRANK lb asha</code>', 'asha\'s rank, 0 = first place', 'O(log N)'],
      ['<code>ZSCORE lb asha</code>', 'asha\'s score', 'O(1)'],
      ['<code>ZRANGEBYSCORE lb 100 200</code>', 'members with a score in a range', 'O(log N + M)'],
      ['<code>ZREM lb asha</code>', 'remove a player', 'O(log N)']
    ])}
    <p><b>Leaderboard recipe:</b> when a game ends, call <code>ZINCRBY lb:game1 points playerId</code>. The home screen calls <code>ZREVRANGE lb:game1 0 9 WITHSCORES</code> for the top 10 and <code>ZREVRANK</code> + <code>ZSCORE</code> for "your rank". Note ranks start at <b>0</b>; show <code>rank + 1</code> to humans.</p>
    <p><b>"Near me" view:</b> get your rank <code>r</code>, then <code>ZREVRANGE lb (r-2) (r+2)</code> to show two players above and two below.</p>
    <p><b>Time-based boards:</b> use one key per period: <code>lb:daily:2026-10-15</code>, <code>lb:weekly:2026-W42</code>. Give each an <code>EXPIRE</code> and combine them with <code>ZUNIONSTORE</code> for "all time this week".</p>
    <p><b>Ties:</b> two players with the same score are ordered by member name (alphabetical). If you want "who got there first wins", fold the time into the score: <code>score = points + (1 - timestampMillis / 1e13)</code>. The fraction is bigger for earlier times. The points stay the whole-number part.</p>
    <p>The database is still the <b>source of truth</b>. Redis holds the fast ranking; if it is lost you rebuild it from the game-results table.</p>`,
  clues: [
    '"top N players / most viewed articles / trending" → sorted set + ZREVRANGE',
    '"what is my rank among 10 million users?" → ZREVRANK is O(log N); SQL COUNT(*) WHERE score &gt; x would scan',
    '"daily / weekly / monthly leaderboard" → one ZSET per period with EXPIRE',
    '"players with similar rank" → ZREVRANK then ZREVRANGE around it',
    '"ordered by time / delayed job / scheduled retry" → ZSET with score = timestamp (ZRANGEBYSCORE 0 now)',
    '"sliding window of events" → ZSET score = timestamp, ZREMRANGEBYSCORE old ones'
  ],
  code: [
    {
      lang: 'python', run: true, title: 'Runnable model: a sorted set with ZADD / ZINCRBY / ZREVRANGE / ZREVRANK',
      code: `import bisect

class SortedSet:
    """Same behaviour as a Redis ZSET (Redis uses a skip list + hash table)."""
    def __init__(self):
        self.score_of = {}   # member -> score   : O(1) lookup, like the hash table
        self.order = []      # sorted [(score, member)] : like the skip list

    def zadd(self, member, score):
        if member in self.score_of:                       # update = remove old entry first
            self.order.remove((self.score_of[member], member))
        self.score_of[member] = score
        bisect.insort(self.order, (score, member))        # keep sorted by (score, member)

    def zincrby(self, member, delta):
        self.zadd(member, self.score_of.get(member, 0) + delta)
        return self.score_of[member]

    def zrevrange(self, start, stop):
        """Highest first. stop is inclusive like Redis; -1 means 'to the end'."""
        rev = self.order[::-1]
        stop = len(rev) - 1 if stop == -1 else stop
        return [(m, s) for (s, m) in rev[start:stop + 1]]

    def zrevrank(self, member):
        if member not in self.score_of:
            return None
        return len(self.order) - 1 - self.order.index((self.score_of[member], member))

lb = SortedSet()
for player, pts in [("asha", 250), ("ben", 310), ("cara", 180), ("dev", 310)]:
    lb.zadd(player, pts)

print("top 3          :", lb.zrevrange(0, 2))
print("asha rank      :", lb.zrevrank("asha") + 1, "(human rank, 1 = first)")
print("asha +100 ->   :", lb.zincrby("asha", 100))
print("top 3 after    :", lb.zrevrange(0, 2))
r = lb.zrevrank("cara")
print("near cara      :", lb.zrevrange(max(r - 1, 0), r + 1))
print("ties (ben, dev):", [m for m, s in lb.zrevrange(0, -1) if s == 310], "<- same score, ordered by name (reverse)")`
    },
    {
      lang: 'java', title: 'Plain Java model: leaderboard with TreeSet + HashMap (thread-safe by synchronized)',
      code: `import java.util.*;

public class Leaderboard {
    private record Entry(String member, double score) {}

    // Highest score first; ties broken by member name so the order is stable and unique.
    private final TreeSet<Entry> ranked = new TreeSet<>(
        Comparator.comparingDouble(Entry::score).reversed().thenComparing(Entry::member));
    private final Map<String, Entry> byMember = new HashMap<>();

    public synchronized double incrementBy(String member, double delta) {
        Entry old = byMember.get(member);
        double next = (old == null ? 0 : old.score()) + delta;
        if (old != null) ranked.remove(old);
        Entry e = new Entry(member, next);
        ranked.add(e);
        byMember.put(member, e);
        return next;
    }

    public synchronized List<String> top(int n) {
        List<String> out = new ArrayList<>();
        for (Entry e : ranked) {
            if (out.size() == n) break;
            out.add(e.member() + "=" + (long) e.score());
        }
        return out;
    }

    // Rank starting at 1. (Redis does this in O(log N); this simple version is O(N).)
    public synchronized int rankOf(String member) {
        int r = 1;
        for (Entry e : ranked) {
            if (e.member().equals(member)) return r;
            r++;
        }
        return -1;
    }

    public static void main(String[] args) {
        Leaderboard lb = new Leaderboard();
        lb.incrementBy("asha", 250);
        lb.incrementBy("ben", 310);
        lb.incrementBy("cara", 180);
        lb.incrementBy("asha", 100);
        System.out.println(lb.top(3));
        System.out.println("cara is rank " + lb.rankOf("cara"));
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Jedis: game-over handler and the three leaderboard queries',
      code: `public class LeaderboardService {
    private final JedisPooled redis;
    LeaderboardService(JedisPooled redis) { this.redis = redis; }

    private String key(LocalDate day) { return "lb:daily:" + day; }

    // Called when a game finishes. Atomic, safe from many servers at once.
    public void recordScore(String playerId, int points) {
        String k = key(LocalDate.now(ZoneOffset.UTC));
        redis.zincrby(k, points, playerId);
        redis.expire(k, 8 * 24 * 3600);          // keep a week, then Redis cleans up by itself
    }

    public List<Tuple> top(int n) {              // Tuple = member + score
        return redis.zrevrangeWithScores(key(LocalDate.now(ZoneOffset.UTC)), 0, n - 1);
    }

    public Long myRank(String playerId) {        // 1-based for humans, null if not on the board
        Long r = redis.zrevrank(key(LocalDate.now(ZoneOffset.UTC)), playerId);
        return r == null ? null : r + 1;
    }

    public List<Tuple> nearMe(String playerId, int radius) {
        String k = key(LocalDate.now(ZoneOffset.UTC));
        Long r = redis.zrevrank(k, playerId);
        if (r == null) return List.of();
        return redis.zrevrangeWithScores(k, Math.max(0, r - radius), r + radius);
    }
}`
    }
  ],
  codeTitle: ['Python sorted-set model', 'Java TreeSet leaderboard', 'Jedis leaderboard service'],
  viz: {
    title: 'A Redis sorted set as a live ranked table',
    input: 'asha+250 ben+310 cara+180 asha+100 dev+310 cara+200',
    inputLabel: 'Score events: name+points, separated by spaces (max 10)',
    gen: function (input) {
      var toks = String(input || '').trim().split(/\s+/).filter(Boolean);
      if (!toks.length || toks.length > 10) throw new Error('Give 1-10 events like asha+250 ben+310');
      var score = {}, frames = [];
      function rowsOf() {
        var arr = Object.keys(score).map(function (m) { return [m, score[m]]; });
        arr.sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? 1 : -1); });   // Redis ZREVRANGE: score desc, ties reverse-lexicographic
        return arr;
      }
      function table(arr, changed, tag) {
        var hl = {};
        var rows = arr.map(function (r, i) { if (r[0] === changed) hl[i] = tag || 'ok'; return [i + 1, r[0], r[1]]; });
        return { type: 'table', label: 'lb:game1 (ZREVRANGE lb:game1 0 -1 WITHSCORES)', columns: ['rank', 'member', 'score'], rows: rows.length ? rows : [['-', '(empty)', '-']], hl: hl };
      }
      frames.push({ narr: 'An empty sorted set <code>lb:game1</code>. Each event will run <code>ZINCRBY</code>; Redis keeps the members sorted for us.', parts: [table([], null)] });
      toks.forEach(function (t) {
        var m = /^([a-zA-Z0-9]{1,10})\+(\d{1,6})$/.exec(t);
        if (!m) throw new Error('Bad event "' + t + '". Use name+points, e.g. asha+250');
        var name = m[1].toLowerCase(), pts = +m[2];
        var existed = Object.prototype.hasOwnProperty.call(score, name);
        var oldArr = rowsOf();
        var oldRank = -1; oldArr.forEach(function (r, i) { if (r[0] === name) oldRank = i + 1; });
        score[name] = (score[name] || 0) + pts;
        var arr = rowsOf();
        var newRank = -1; arr.forEach(function (r, i) { if (r[0] === name) newRank = i + 1; });
        var tie = arr.filter(function (r) { return r[1] === score[name]; }).length > 1;
        frames.push({ narr: '<code>ZINCRBY lb:game1 ' + pts + ' ' + name + '</code> → ' + (existed ? name + ' already existed, new score <b>' + score[name] + '</b>.' : name + ' is new, score <b>' + score[name] + '</b>.') + (existed && newRank < oldRank ? ' <span class="c-g">Moved up from rank ' + oldRank + ' to ' + newRank + '.</span>' : '') + (tie ? ' <span class="c-y">Tie: equal scores are ordered by member name.</span>' : ''), parts: [
          table(arr, name, tie ? 'cur' : 'ok'),
          { type: 'vars', label: 'Queries you can run now', vals: { ZREVRANK: name + ' → ' + (newRank - 1) + ' (human rank ' + newRank + ')', ZSCORE: score[name], ZCARD: arr.length } }
        ] });
      });
      var arr2 = rowsOf();
      frames.push({ narr: 'Done. The top spot is <b>' + arr2[0][0] + '</b> with ' + arr2[0][1] + '. <code>ZREVRANGE lb:game1 0 2</code> returns just the top 3 in O(log N + 3), no matter how many players exist.', parts: [table(arr2.slice(0, 3), arr2[0][0], 'sel'), { type: 'vars', label: 'Players on board', vals: { total: arr2.length, shown: Math.min(3, arr2.length) } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Top 10 + "you are #4,217"', html: `<p>The home screen needs two numbers: the top 10 (one <code>ZREVRANGE 0 9</code>) and the viewer's own rank (one <code>ZREVRANK</code>). Total: two commands, under 1 ms. With SQL you would sort or count millions of rows per request; with a ZSET the ranking is maintained as scores arrive.</p>`, code: { lang: 'bash', code: `redis-cli ZREVRANGE lb:daily:2026-10-15 0 9 WITHSCORES\nredis-cli ZREVRANK lb:daily:2026-10-15 player:991\nredis-cli ZSCORE lb:daily:2026-10-15 player:991` } },
    { title: 'Weekly board from 7 daily boards', html: `<p><code>ZUNIONSTORE lb:week:42 7 lb:daily:d1 ... lb:daily:d7</code> sums each player's scores across the seven daily keys into a new key. Cache that result for a few minutes (<code>EXPIRE</code>) instead of recomputing on every page view.</p>${H.table(['player', 'Mon', 'Tue', 'Wed', 'week total'], [['asha', '250', '0', '90', '<b>340</b>'], ['ben', '100', '300', '0', '<b>400</b>']])}` },
    { title: 'Tie-break: earlier wins', html: `<p>Asha and Ben both reach 300 points, Asha at 10:00 and Ben at 10:05. Store <code>score = points + (1 - tsMillis/1e13)</code>. Asha gets 300.83 (bigger fraction because her timestamp is smaller), Ben gets 300.829... so Asha ranks higher. To show points to users, use <code>floor(score)</code>. Because this score is no longer a plain sum, compute it in your app and use <code>ZADD</code> instead of <code>ZINCRBY</code>.</p>` },
    { title: 'Same trick for a delayed-job queue', html: `<p>Use the score as "run at this time". <code>ZADD delayed 1760000000 job:77</code>. A worker asks <code>ZRANGEBYSCORE delayed -inf now LIMIT 0 10</code> for jobs that are due, then <code>ZREM</code>s the ones it claims. That is how many retry-with-delay systems are built.</p>` }
  ],
  deepDive: `<p><b>How it works inside:</b> a ZSET is a <b>skip list</b> (layers of linked lists that let you jump ahead, giving O(log N) search/insert and rank by position) plus a <b>hash table</b> from member to score (so <code>ZSCORE</code> is O(1)). For small sets Redis uses a compact array-like listpack to save memory.</p>
    <p><b>Scores are doubles</b> (64-bit floating point). Integers are exact up to 2<sup>53</sup> ≈ 9×10<sup>15</sup>. When you pack a timestamp into the score, check you stay below that. Fractions beyond ~15 significant digits are lost, so two "different" scores may compare equal.</p>
    <p><b>Scaling:</b> one ZSET lives on one node. 10 million members × ~100 bytes ≈ 1 GB, fine. For 500 million, shard by player-id range or by region/league and merge top-N lists in the app (take the top 100 of each shard and merge). Global exact rank across shards is expensive; many games show "top 1%" or an approximate rank instead.</p>
    <p><b>Durability:</b> if Redis restarts without persistence the board is empty. Keep results in a database table (<code>game_results</code>) and write a job to rebuild the ZSET. Often you write the DB first, publish an event, and a consumer does <code>ZINCRBY</code>, which makes the update <em>at-least-once</em>, so the consumer must be idempotent (see the idempotent consumer topic) or the score will be double counted on a retry.</p>
    <p><b>Pagination:</b> use rank ranges (<code>ZREVRANGE lb 50 99</code>) for page 2. Deep paging (rank 1,000,000) is still O(log N + page size) — fine. The user's rank may change between page loads; that is acceptable for a leaderboard.</p>
    <p><b>Related structures:</b> <code>ZRANGEBYLEX</code> for autocomplete on same-score members; <code>ZRANDMEMBER</code>; Redis 7 <code>ZINTER/ZUNION/ZRANGESTORE</code>; for approximate unique counts use HyperLogLog, not a ZSET.</p>`,
  aiEra: `<p><b>What AI changes:</b> rankings now include <b>recommendation scores</b>. A sorted set is a handy place to store "top 50 candidates per user" produced by a model offline: <code>ZADD rec:user7 0.93 item:12</code>. The online service just reads the top N in microseconds and can re-rank with fresh signals. Retrieval systems also keep a ZSET of recent/popular documents as a cheap first-stage candidate list.</p>
    <p><b>Use AI as a partner:</b> ask it to generate load-test data (10 million random scores) and a script measuring ZREVRANK latency, or to review your tie-break math for double-precision loss. Ask <code>List ways this leaderboard can double-count a score</code> and compare with your retry design.</p>
    <p><b>Where AI goes wrong:</b> uses 1-based ranks directly from Redis (off by one), forgets <code>EXPIRE</code> on period boards, recomputes the whole board in SQL "just in case", and builds scores by multiplying timestamps into integers beyond 2<sup>53</sup>.</p>
    <p><b>What you must still own:</b> the fairness rules (ties, cheating, late events), the rebuild plan when Redis is wiped, and idempotency of score updates.</p>`,
  problems: [
    {
      title: 'Leaderboard With Rank and Neighbours',
      level: 'Medium', tags: ['redis', 'sorted-set', 'leaderboard'], companies: ['Zynga', 'Dream11', 'Riot Games'],
      statement: `<p>Design the Redis side of a mobile game's daily leaderboard: record points when a match ends, show the top 10, show a player's own rank, and show two players above and below them. Ties go to whoever reached the score first. Say exactly which commands you use and how you handle a Redis restart.</p>`,
      constraints: `5 million daily players, 200 score updates/second at peak, reads 10× writes. Boards must disappear after 8 days.`,
      example: `<p>Scores: asha 350 (reached 10:00), ben 350 (reached 10:05), cara 180.</p><p>${H.c('g', 'Top: 1 asha, 2 ben, 3 cara.')} Cara's neighbours with radius 1 are ben (above) and nobody below.</p>`,
      brute: { why: `<p>A SQL table with <code>ORDER BY points DESC LIMIT 10</code> is okay for the top 10 with an index, but "my rank" needs <code>COUNT(*) WHERE points &gt; mine</code>, which walks millions of index entries on every request, and updates fight for the same hot rows.</p>` },
      mcq: { q: 'Redis returns ZREVRANK = 0 for a player. What rank do you show the user?', options: ['1', '0', '2', 'Depends on ties only'], answer: 0, explain: 'Redis ranks start at 0, so rank 0 is first place; show rank + 1 to people.' },
      hints: [`<p>You need an always-sorted structure with fast "rank of X" lookup. Which Redis type keeps members sorted by a number?</p>`, `<p>One key per day: <code>lb:daily:YYYY-MM-DD</code>. Commands: ZADD/ZINCRBY, ZREVRANGE 0 9, ZREVRANK, ZREVRANGE around rank.</p>`, `<p>Tie-break: put time in the fractional part of the score. Restart: write the match result to the database first and rebuild the board from it. Add EXPIRE on every period key.</p>`],
      solution: {
        approach: `<p><b>Data model.</b> One sorted set per UTC day: <code>lb:daily:2026-10-15</code>, member = playerId, score = points plus a small time fraction. Because the fraction is not additive, the service keeps each player's whole-number points in a companion hash <code>pts:daily:2026-10-15</code> (<code>HINCRBY</code>), computes <code>score = points + (1 - nowMillis/1e13)</code>, and writes it with <code>ZADD</code>. A Lua script (or MULTI/EXEC) runs both steps atomically so concurrent matches for the same player do not interleave. If ties are not important, a plain <code>ZINCRBY</code> is simpler.</p>
          <p><b>Queries.</b> Top 10: <code>ZREVRANGE key 0 9 WITHSCORES</code>. Own rank: <code>ZREVRANK key player</code> then add 1. Neighbours: take r from ZREVRANK, call <code>ZREVRANGE key max(0,r-2) r+2 WITHSCORES</code>. All O(log N + page), well under a millisecond for 5 million members.</p>
          <p><b>Lifecycle.</b> After the first write of the day, <code>EXPIRE key 8*86400</code>. Old boards disappear automatically.</p>
          <p><b>Restart / data loss.</b> Redis is not the source of truth. Every finished match is first saved in the <code>match_results</code> table. A rebuild job reads today's results (<code>SELECT player, SUM(points) ... GROUP BY player</code>) and bulk-loads the ZSET via a pipeline. In the meantime the service can show the top 10 from a short-lived cached copy. For durability between restarts enable AOF (<code>appendfsync everysec</code>) so at most about one second of updates is lost.</p>
          <p><b>Duplicate events.</b> If scoring updates arrive through a queue, a redelivered message must not add points twice: record the matchId in a processed set or use <code>SET match:{id} NX</code> before updating.</p>`,
        complexity: `<p>Writes O(log N) each; reads O(log N + K). Memory for 5M members is about 500 MB - 1 GB; plan for it or shard by league.</p>`,
        followUps: ['How do you show a global rank across 10 shards?', 'How would you handle a cheater being removed after the fact? (ZREM + audit)']
      }
    }
  ]
});
topics.push({
  title: 'Rate Limiting with Redis: Fixed Window, Sliding Window, Token Bucket',
  analogy: `<p>A <b>nightclub bouncer</b> with a clicker. Fixed window: "only 3 people may enter every 10 minutes, counted on the clock face". The clicker resets at :00, :10, :20. Sneaky guests wait until :09 and :10 and 6 people slip in within 2 minutes. Sliding window: the bouncer remembers the <em>exact time</em> each person entered and always looks back "the last 10 minutes" — no loophole. Token bucket: a jar that gets one new token every few seconds (up to a maximum); each guest needs a token, so short bursts are fine but the long-run speed is capped.</p>`,
  explain: `<p>A <b>rate limiter</b> says "this client may make at most N requests per time window". It protects your API from abuse, bugs (an endless retry loop), and one noisy customer using everyone's capacity. When the limit is exceeded you return <b>HTTP 429 Too Many Requests</b> with a <code>Retry-After</code> header.</p>
    <p>Because you run several app servers, the counters must live in one shared place — Redis. The three popular algorithms:</p>
    ${H.table(['Algorithm', 'Redis building block', 'Pros', 'Cons'], [
      ['Fixed window counter', '<code>INCR key</code> + <code>EXPIRE key 10</code>', 'dead simple, 1 tiny key per client', 'boundary burst: up to 2× the limit around a window edge'],
      ['Sliding window log', 'sorted set, score = timestamp; <code>ZREMRANGEBYSCORE</code> old, <code>ZCARD</code>, <code>ZADD</code>', 'exact, no edge burst', 'memory grows with the limit (one entry per request)'],
      ['Token bucket', 'hash {tokens, lastRefill} updated in a Lua script', 'allows controlled bursts, smooth average', 'a little more logic; needs a script for atomicity'],
      ['Sliding window counter', 'two fixed counters, weighted blend', 'cheap and close to exact', 'approximate']
    ])}
    <p><b>The fixed-window recipe in three lines:</b></p>
    <pre>key = "rl:" + clientId + ":" + (now / 10)     # one key per client per 10 s window
count = INCR key
if count == 1: EXPIRE key 10                  # first hit starts the countdown
allow = count &lt;= LIMIT</pre>
    <p><b>Atomicity warning:</b> if you do <code>INCR</code> then <code>EXPIRE</code> as two network calls and the app crashes in between, that key never expires and the client is blocked forever. Put both in a Lua script (or <code>SET key 0 EX 10 NX</code> first). Likewise "read count, compare, write" must be one atomic step.</p>
    <p><b>Who is the "client"?</b> API key or user id (best), otherwise IP address (careful: many users share one IP behind a company NAT, and attackers rotate IPs). Common to layer: per-IP at the edge, per-user in the app, per-endpoint stricter limits for login and password reset.</p>
    <p><b>Fail open or closed?</b> If Redis is down, most APIs <em>fail open</em> (allow requests, log it) so the cache failure does not become a total outage. For login brute-force protection you might fail closed or fall back to a local in-memory limiter.</p>`,
  clues: [
    '"limit each user to 100 requests per minute across all servers" → shared counter in Redis, not a per-server variable',
    '"burst of 2× the limit at the window boundary" → fixed window weakness → sliding window or token bucket',
    '"allow short bursts but cap the average rate" → token bucket / leaky bucket',
    '"return 429 with Retry-After" → compute seconds until the window resets or a token is available',
    '"INCR then EXPIRE" → must be atomic (Lua or SET NX EX) or keys may live forever',
    '"login brute force / OTP abuse / expensive endpoint" → stricter per-endpoint limits plus lockouts'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Runnable model: fixed window vs sliding window vs token bucket (boundary burst)',
      code: `// Limit: 3 requests per 10 seconds. Requests arrive at these seconds:
var times = [8, 9, 10, 11, 12, 25];
var LIMIT = 3, WINDOW = 10;

function fixedWindow(times) {
  var counts = {};                      // windowId -> count  (like INCR rl:client:windowId)
  return times.map(function (t) {
    var w = Math.floor(t / WINDOW);
    counts[w] = (counts[w] || 0) + 1;
    return counts[w] <= LIMIT;
  });
}
function slidingLog(times) {
  var log = [];                         // timestamps in the last WINDOW seconds (a ZSET in Redis)
  return times.map(function (t) {
    log = log.filter(function (x) { return x > t - WINDOW; });   // ZREMRANGEBYSCORE old
    if (log.length < LIMIT) { log.push(t); return true; }
    return false;
  });
}
function tokenBucket(times, capacity, refillPerSec) {
  var tokens = capacity, last = times[0];
  return times.map(function (t) {
    tokens = Math.min(capacity, tokens + (t - last) * refillPerSec);   // refill since last call
    last = t;
    if (tokens >= 1) { tokens -= 1; return true; }
    return false;
  });
}
function show(name, res) {
  console.log(name.padEnd(14) + times.map(function (t, i) { return t + ':' + (res[i] ? 'ok ' : 'NO '); }).join(' ') +
    ' | allowed ' + res.filter(Boolean).length);
}
console.log('times:', times.join(', '), ' (limit', LIMIT, 'per', WINDOW + 's)');
show('fixed window', fixedWindow(times));     // lets 5 through between t=8 and t=12!
show('sliding log', slidingLog(times));       // exact: only 3 in any 10 s
show('token bucket', tokenBucket(times, 3, 0.3));`
    },
    {
      lang: 'java', title: 'Plain Java: per-client fixed-window limiter (thread-safe, in memory)',
      code: `import java.util.concurrent.ConcurrentHashMap;

public class FixedWindowLimiter {
    private static final class Window {
        long windowId; int count;
    }
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final int limit;
    private final long windowMillis;

    public FixedWindowLimiter(int limit, long windowMillis) {
        this.limit = limit;
        this.windowMillis = windowMillis;
    }

    public boolean allow(String clientId, long nowMillis) {
        long id = nowMillis / windowMillis;
        boolean[] ok = new boolean[1];
        // compute() runs atomically per key, like a single Redis Lua script
        windows.compute(clientId, (k, w) -> {
            if (w == null || w.windowId != id) { w = new Window(); w.windowId = id; }
            w.count++;
            ok[0] = w.count <= limit;
            return w;
        });
        return ok[0];
    }

    public static void main(String[] args) {
        FixedWindowLimiter rl = new FixedWindowLimiter(3, 10_000);
        long[] t = {8_000, 9_000, 10_000, 11_000, 12_000, 25_000};
        for (long x : t) System.out.println((x / 1000) + "s -> " + (rl.allow("user-1", x) ? "allowed" : "429"));
    }
}`
    },
    {
      lang: 'text', title: 'Redis Lua script: atomic fixed-window check (called with EVAL / EVALSHA)',
      code: `-- KEYS[1] = rl:<client>:<windowId>   ARGV[1] = window seconds   ARGV[2] = limit
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])     -- first hit starts the countdown
end
local ttl = redis.call('TTL', KEYS[1])
if count > tonumber(ARGV[2]) then
  return {0, ttl}                            -- blocked, retry after ttl seconds
end
return {1, ttl}                              -- allowed`
    },
    {
      lang: 'java', check: false, title: 'Spring filter using the script (limit values from config, no secrets)',
      code: `@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redis;
    private final RedisScript<List> script;       // loaded from the Lua file above
    private final int limit = Integer.parseInt(System.getenv().getOrDefault("RATE_LIMIT", "100"));

    RateLimitFilter(StringRedisTemplate redis, RedisScript<List> script) { this.redis = redis; this.script = script; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String client = req.getHeader("X-Api-Key") != null ? req.getHeader("X-Api-Key") : req.getRemoteAddr();
        long window = System.currentTimeMillis() / 60_000;                   // 1-minute windows
        String key = "rl:" + client + ":" + window;
        try {
            List<Long> r = redis.execute(script, List.of(key), "60", String.valueOf(limit));
            if (r != null && r.get(0) == 0L) {
                res.setStatus(429);
                res.setHeader("Retry-After", String.valueOf(r.get(1)));
                return;
            }
        } catch (RuntimeException redisDown) {
            // fail OPEN: a cache outage must not become an API outage (log + metric in real code)
        }
        chain.doFilter(req, res);
    }
}`
    }
  ],
  codeTitle: ['JS model: three algorithms side by side', 'Java in-memory fixed-window limiter', 'Lua script for Redis', 'Spring filter'],
  viz: {
    title: 'Fixed window vs sliding window: who gets a 429?',
    input: 'fixed 3 8 9 10 11 12 25',
    inputLabel: 'mode (fixed|sliding) limit then request seconds (window = 10 s)',
    gen: function (input) {
      var t = String(input || '').trim().split(/\s+/).filter(Boolean);
      var mode = (t[0] || '').toLowerCase();
      var limit = parseInt(t[1], 10);
      var times = t.slice(2).map(Number);
      if ((mode !== 'fixed' && mode !== 'sliding') || isNaN(limit) || limit < 1 || limit > 6 || !times.length || times.length > 12 || times.some(function (x) { return isNaN(x) || x < 0 || x > 59; })) throw new Error('Format: fixed 3 8 9 10 11 12 25  (mode, limit 1-6, then up to 12 seconds in 0-59, ascending)');
      for (var q = 1; q < times.length; q++) if (times[q] < times[q - 1]) throw new Error('Seconds must be ascending');
      var W = 10, frames = [], counts = [0, 0, 0, 0, 0, 0], log = [], allowed = 0, blocked = 0, allowedTimes = [];
      frames.push({ narr: 'Mode <b>' + mode + '</b>, limit <b>' + limit + '</b> requests per <b>' + W + '</b> seconds. Requests arrive at: ' + times.join(', ') + '. We will see who gets <b>429</b>.', parts: [
        mode === 'fixed' ? { type: 'bars', label: 'INCR counter per 10 s window', values: counts.slice(), idxLabels: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59'] } : { type: 'set', label: 'ZSET of timestamps in the last 10 s', items: [] },
        { type: 'vars', label: 'Totals', vals: { allowed: 0, blocked: 0 } }
      ] });
      times.forEach(function (x) {
        var ok, why;
        if (mode === 'fixed') {
          var w = Math.floor(x / W);
          counts[w]++;
          ok = counts[w] <= limit;
          why = 'Window ' + (w * W) + '-' + (w * W + 9) + ': <code>INCR</code> gives <b>' + counts[w] + '</b> (limit ' + limit + ').';
          var hl = {}; hl[w] = ok ? 'ok' : 'bad';
          frames.push({ narr: '<b>t = ' + x + '</b>. ' + why + (ok ? ' <span class="c-g">Allowed.</span>' : ' <span class="c-r">429 Too Many Requests.</span>'), parts: [
            { type: 'bars', label: 'INCR counter per 10 s window', values: counts.slice(), idxLabels: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59'], hl: hl },
            { type: 'vars', label: 'Totals', vals: { time: x, allowed: allowed + (ok ? 1 : 0), blocked: blocked + (ok ? 0 : 1) }, hl: ok ? { allowed: 'ok' } : { blocked: 'bad' } }
          ] });
        } else {
          var before = log.length;
          log = log.filter(function (y) { return y > x - W; });
          ok = log.length < limit;
          if (ok) log.push(x);
          why = 'Removed ' + (before - (ok ? log.length - 1 : log.length)) + ' old entries; now ' + (ok ? log.length - 1 : log.length) + ' in the last ' + W + ' s (limit ' + limit + ').';
          var h2 = {}; if (ok) h2[String(x)] = 'ok';
          frames.push({ narr: '<b>t = ' + x + '</b>. ' + why + (ok ? ' <span class="c-g">Allowed, ZADD ' + x + '.</span>' : ' <span class="c-r">429: the window already holds ' + limit + '.</span>'), parts: [
            { type: 'set', label: 'ZSET of timestamps in the last 10 s', items: log.slice(), hl: h2 },
            { type: 'vars', label: 'Totals', vals: { time: x, inWindow: log.length, allowed: allowed + (ok ? 1 : 0), blocked: blocked + (ok ? 0 : 1) }, hl: ok ? { allowed: 'ok' } : { blocked: 'bad' } }
          ] });
        }
        if (ok) { allowed++; allowedTimes.push(x); } else blocked++;
      });
      var burst = 0;
      allowedTimes.forEach(function (a) { var c = allowedTimes.filter(function (b) { return b > a - W && b <= a; }).length; if (c > burst) burst = c; });
      frames.push({ narr: 'Result: <b>' + allowed + '</b> allowed, <b>' + blocked + '</b> blocked. Largest number of allowed requests inside any rolling ' + W + ' seconds: <b>' + burst + '</b>' + (burst > limit ? ' <span class="c-r">which is MORE than the limit (' + limit + '): the fixed-window edge burst.</span>' : ' <span class="c-g">never above the limit.</span>') + ' Try <code>sliding</code> with the same numbers.', parts: [
        { type: 'array', label: 'Allowed request times', values: allowedTimes.length ? allowedTimes : ['none'] },
        { type: 'vars', label: 'Summary', vals: { allowed: allowed, blocked: blocked, maxInRolling10s: burst, limit: limit }, hl: burst > limit ? { maxInRolling10s: 'bad' } : { maxInRolling10s: 'ok' } }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Edge burst: how 6 requests get through a "3 per 10 s" limit', html: `<p>Fixed windows are 0-9 and 10-19. A client sends 3 requests at seconds 7, 8, 9 (all allowed, window 0 is full) and 3 more at 10, 11, 12 (window 1 starts at zero, all allowed). That is <b>6 requests in 6 seconds</b> against a limit of 3 per 10 seconds. For most APIs 2× is acceptable; for login or SMS sending it is not.</p>${H.table(['second', '7', '8', '9', '10', '11', '12'], [['window', '0', '0', '0', '1', '1', '1'], ['counter', '1', '2', '3', '1', '2', '3'], ['result', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok']])}` },
    { title: 'Token bucket: bursts allowed, average capped', html: `<p>Capacity 5 tokens, refill 1 token/second. A mobile app wakes up and sends 5 calls immediately: all succeed (bucket drained). The 6th call right away is rejected. After 3 seconds there are 3 tokens, so 3 more calls pass. Long-run rate is 1 per second, but a short burst up to 5 is friendly to real users. Stripe, GitHub and most API gateways use a variant of this.</p>` },
    { title: 'Telling clients what to do', html: `<p>Return <code>429</code> plus <code>Retry-After: 7</code> (seconds) and informative headers such as <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, <code>X-RateLimit-Reset</code>. Good clients back off; bad clients ignore you, which is why you also need server-side protection.</p>`, code: { lang: 'http', code: `HTTP/1.1 429 Too Many Requests\nRetry-After: 7\nX-RateLimit-Limit: 100\nX-RateLimit-Remaining: 0\nContent-Type: application/json\n\n{"error":"rate_limited","message":"Try again in 7 seconds"}` } },
    { title: 'Different limits for different endpoints', html: `<p>Reading the product list: 600/min per user. <code>POST /login</code>: 5/min per IP <em>and</em> 10/hour per username (stops password guessing without letting an attacker lock out a real user from many IPs). <code>POST /sms/otp</code>: 3/hour per phone number. Put the endpoint name in the Redis key: <code>rl:login:ip:1.2.3.4:minute</code>.</p>` }
  ],
  deepDive: `<p><b>Atomicity is the whole game.</b> The sliding window log needs "remove old, count, maybe add" as one unit. Do it in a Lua script or <code>MULTI/EXEC</code> (note: MULTI/EXEC does not let you branch on a result mid-way; Lua does). Redis runs a script without interleaving other commands, so no two servers can both read "2 of 3" and both let a request through. In Redis Cluster all keys in one script must live in the same hash slot (use hash tags like <code>{user42}:rl</code>).</p>
    <p><b>Memory:</b> sliding log costs O(limit) per client. At 1,000 requests/min and 1 million active clients that is up to a billion entries — too much. The <b>sliding window counter</b> keeps two integers per client and estimates <code>current + previous × (fraction of previous window still inside)</code>; error is small and memory is O(1).</p>
    <p><b>Clock issues:</b> use the Redis server time (<code>TIME</code> inside Lua) rather than each app server's clock, since app clocks drift by milliseconds to seconds.</p>
    <p><b>Where to put the limiter:</b> CDN/WAF for floods, API gateway for per-key quotas, in-app for business rules (per-user, per-plan). A local in-memory limiter per instance costs no network call but multiplies the limit by the number of instances; a hybrid keeps a local counter and syncs with Redis every few hundred ms.</p>
    <p><b>Distributed fairness and cost:</b> every request now makes a Redis call (about 0.2 ms). Use pipelining or local prefilters for the hot path, and measure the added p99. Limits should also apply to expensive <em>work</em> (a report that costs 30 s of CPU counts as 30 units), not only request count — a "cost-based" or leaky bucket.</p>
    <p><b>Related concepts:</b> concurrency limits (max 5 in-flight requests per client, via a semaphore), quotas (1 million calls per month, with billing), and load shedding (rejecting low-priority traffic when the server is overloaded). Do not confuse them with per-second rate limits.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM APIs are priced and limited in <b>tokens</b> and requests per minute, so your own gateway needs <b>token-based rate limits</b> (count prompt + completion tokens, a cost-based token bucket) and per-user spend caps. AI agents also hammer APIs in tight retry loops, which makes sane limits and clear <code>Retry-After</code> responses more important than ever — agents can obey them if you send them.</p>
    <p><b>Use AI as a partner:</b> ask it to write the Lua script, then ask <code>Prove this is atomic and say what happens if the script is called with a key in another hash slot.</code> Have it generate a load test that sends a boundary burst and checks the allowed count.</p>
    <p><b>Where AI goes wrong:</b> separate <code>INCR</code> and <code>EXPIRE</code> calls (immortal keys), per-server in-memory counters called "distributed", using client-supplied headers (like <code>X-Forwarded-For</code>) as a trustworthy IP, and no Retry-After.</p>
    <p><b>What you must still own:</b> choosing the limit values from real traffic data, deciding fail-open vs fail-closed, and abuse cases (many accounts, rotating IPs).</p>`,
  problems: [
    {
      title: 'Design a Per-User API Rate Limiter',
      level: 'Medium', tags: ['rate-limiting', 'redis', 'lua'], companies: ['Stripe', 'Cloudflare', 'Atlassian'],
      statement: `<p>Build a rate limiter for a public API: 100 requests per minute per API key, short bursts allowed, no loophole at minute boundaries, working correctly across 12 app servers. Explain the algorithm, the Redis data, the atomicity story, the 429 response, and what you do when Redis is down.</p>`,
      constraints: `Peak 20,000 requests/second overall; added latency under 2 ms p99; 200,000 active keys.`,
      example: `<p>A key sends 100 requests at 12:00:55 and tries 100 more at 12:01:02.</p><p>${H.c('r', 'Fixed window: all 200 allowed (new window).')} ${H.c('g', 'Sliding/token bucket: second batch mostly rejected.')}</p>`,
      brute: { why: `<p>A per-server in-memory counter lets each of 12 servers allow 100, so the real limit becomes 1,200. A fixed-window counter lets a client send double the limit across the boundary. A SQL table counter adds a write per request and becomes the bottleneck.</p>` },
      mcq: { q: 'Why must INCR and EXPIRE be done in one Lua script (or with SET NX EX)?', options: ['A crash between them can leave a counter that never expires', 'Lua is faster than INCR', 'EXPIRE cannot be called after INCR', 'Redis forbids two commands on one key'], answer: 0, explain: 'If the app dies after INCR but before EXPIRE the key has no TTL, so the client stays blocked forever. A script runs both as one atomic step.' },
      hints: [`<p>A shared store plus an atomic check. Which Redis structures can count events inside a rolling time range?</p>`, `<p>Token bucket in a hash: fields <code>tokens</code> and <code>ts</code>. Refill = elapsed × rate, capped at capacity (100). Do the whole read-refill-consume in a Lua script.</p>`, `<p>Return {allowed, remaining, retryAfterSeconds}. Use Redis <code>TIME</code> as the clock. Wrap the call with a 5-10 ms timeout; on error allow the request and increment a "limiter_failed_open" metric.</p>`],
      solution: {
        approach: `<p><b>Algorithm.</b> Token bucket: capacity 100, refill 100/60 tokens per second. This allows a burst of up to 100 and a sustained average of 100/minute, and it has no boundary loophole because tokens refill continuously.</p>
          <p><b>Redis data.</b> One hash per key: <code>rl:{apiKey}</code> with fields <code>tokens</code> and <code>ts</code> (last refill time in ms), plus <code>PEXPIRE</code> to 2 minutes so idle keys vanish. 200,000 keys × ~100 bytes = 20 MB.</p>
          <p><b>Atomic script.</b> (1) read tokens and ts (defaults: full bucket, now); (2) <code>tokens = min(100, tokens + (now - ts) × rate)</code>; (3) if tokens ≥ 1, subtract 1, store tokens and ts, return allowed with the remaining count; else return blocked with <code>retryAfter = ceil((1 - tokens)/rate)</code>. Because Redis executes scripts one at a time, 12 servers calling concurrently cannot both spend the same token. The key uses a hash tag if Redis Cluster is used. Load the script once and call it by <code>EVALSHA</code>.</p>
          <p><b>Response.</b> Allowed: pass through with <code>X-RateLimit-Remaining</code>. Blocked: <code>429</code>, <code>Retry-After</code>, JSON error body.</p>
          <p><b>Failure modes.</b> Redis timeout or error: fail open for normal endpoints (the API stays up), log and alert; for sensitive endpoints such as login fall back to a small local in-memory limiter. Keep a circuit breaker to stop calling a dead Redis. At 20,000 requests/s one Redis handles this easily (about 100k simple ops/s), and p99 added latency is about 1 ms when Redis is in the same zone.</p>`,
        complexity: `<p>O(1) time and O(1) memory per key. One round trip per request.</p>`,
        followUps: ['How would you allow different limits per pricing plan?', 'How do you rate limit by tokens for an LLM proxy?']
      }
    }
  ]
});
topics.push({
  title: 'Distributed Locks with Redis: How They Work and Where They Break',
  analogy: `<p>A lock in one program is like the <b>key to a single toilet in a cafe</b>: whoever holds the key is inside. A <b>distributed lock</b> is the same idea for many servers, but the key is a <b>hotel room card that stops working after 30 minutes</b> (the TTL) so a guest who disappears cannot block the room forever. The danger: you fall asleep for 40 minutes (a long GC pause or a slow network call), your card expires, the hotel gives the room to someone else, and then you wake up and walk in believing the room is still yours. Now two people are in the room. That is the core caveat of distributed locks.</p>`,
  explain: `<p>A <b>distributed lock</b> makes sure only one server at a time does a piece of work (send the daily report, rebuild a cache key, process a specific order). The simplest Redis lock is one command:</p>
    <pre>SET lock:order:42 &lt;random-token&gt; NX PX 30000</pre>
    <ul>
      <li><code>NX</code> = set only if the key does not exist (so only one caller wins).</li>
      <li><code>PX 30000</code> = auto-expire in 30 seconds (so a crashed server cannot hold it forever).</li>
      <li>The value is a <b>random token unique to the holder</b>.</li>
    </ul>
    <p><b>Release carefully:</b> only delete the key if the value is still <em>your</em> token. Otherwise, if your lock already expired and someone else took it, you would delete their lock. Checking and deleting must be atomic, so use a small Lua script:</p>
    <pre>if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end</pre>
    <p><b>The caveats (the part interviewers love):</b></p>
    ${H.table(['Problem', 'What happens', 'Mitigation'], [
      ['Lock expires while you are still working', 'GC pause, slow DB, network stall → TTL runs out → another worker enters → two workers at once', 'keep work short, renew the TTL (watchdog), and use <b>fencing tokens</b> at the resource'],
      ['Releasing someone else\'s lock', 'plain <code>DEL</code> after your lock expired', 'compare token, then delete, in Lua'],
      ['Failover loses the lock', 'replication is asynchronous: master grants lock, crashes before copying it, replica promoted, another client gets the same lock', 'accept it for "efficiency" locks; for "correctness" use a database or a consensus system (etcd, ZooKeeper)'],
      ['Clock jumps', 'wall-clock jumps make TTLs shorter or longer than expected', 'use monotonic timers, generous TTLs, fencing'],
      ['Lock held forever by a bug', 'infinite retry or no TTL', 'always set a TTL; always bound waiting time']
    ])}
    <p><b>Two kinds of locks:</b> an <b>efficiency lock</b> avoids duplicated work (two servers both rebuilding a cache entry). If it fails now and then, you only waste effort. A <b>correctness lock</b> protects data (never charge a card twice). If it fails, you lose money. Redis single-instance locks are fine for the first kind. For the second, don't trust a lock alone: back it up with a <b>database unique constraint, a version column, or an idempotency key</b>.</p>
    <p><b>Fencing token:</b> each time the lock is granted, give out an ever-increasing number (33, then 34...). The protected resource (database, file store) remembers the highest token it has seen and <b>rejects any write with a lower token</b>. The late, expired worker's write is refused. This is the real fix for the sleeping-guest problem.</p>`,
  clues: [
    '"only one instance should run this" / "avoid duplicate processing across servers" → distributed lock (or leader election)',
    '"what if the lock holder crashes?" → TTL (lease)',
    '"what if the holder is slow and the lock expires?" → fencing token or idempotent operation',
    '"two clients think they hold the lock" → expiry + pause; fix with fencing',
    '"is Redlock safe?" → debated; fine for efficiency, not for correctness without fencing',
    '"inventory / payment must not be double applied" → DB constraint or optimistic locking, not just a Redis lock'
  ],
  code: [
    {
      lang: 'java', check: false, title: 'Safe acquire and release with Jedis (token + Lua compare-and-delete)',
      code: `public class RedisLock {
    private static final String RELEASE_LUA =
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

    private final JedisPooled redis;
    RedisLock(JedisPooled redis) { this.redis = redis; }

    /** Returns the owner token if we got the lock, or null if someone else holds it. */
    public String tryLock(String name, long ttlMillis) {
        String token = UUID.randomUUID().toString();          // unique per attempt
        String ok = redis.set("lock:" + name, token, SetParams.setParams().nx().px(ttlMillis));
        return "OK".equals(ok) ? token : null;
    }

    /** Releases only if the lock is still ours. Returns true if we deleted it. */
    public boolean unlock(String name, String token) {
        Object r = redis.eval(RELEASE_LUA, List.of("lock:" + name), List.of(token));
        return Long.valueOf(1L).equals(r);
    }

    public void runExclusive(String name, Runnable work) {
        String token = tryLock(name, 30_000);
        if (token == null) return;                            // someone else is doing it: skip, do not block
        try {
            work.run();                                       // keep this SHORT compared with the TTL
        } finally {
            unlock(name, token);                              // no-op if the lock already expired
        }
    }
}`
    },
    {
      lang: 'java', title: 'Plain Java model: lease lock with owner check and fencing tokens',
      code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class LeaseLock {
    private record Lease(String owner, long token, long expiresAt) {}

    private final ConcurrentHashMap<String, Lease> leases = new ConcurrentHashMap<>();
    private final AtomicLong tokenCounter = new AtomicLong();

    /** Returns a fencing token (> 0) if acquired, or -1 if another owner holds an unexpired lease. */
    public long tryLock(String name, String owner, long now, long ttl) {
        long[] result = {-1};
        leases.compute(name, (k, cur) -> {
            if (cur == null || cur.expiresAt() <= now) {          // free or expired
                long t = tokenCounter.incrementAndGet();          // ever-increasing
                result[0] = t;
                return new Lease(owner, t, now + ttl);
            }
            return cur;
        });
        return result[0];
    }

    /** Release only if we are still the owner (like the Lua compare-and-delete). */
    public boolean unlock(String name, String owner) {
        boolean[] released = {false};
        leases.computeIfPresent(name, (k, cur) -> {
            if (cur.owner().equals(owner)) { released[0] = true; return null; }
            return cur;
        });
        return released[0];
    }

    /** The protected resource: rejects writes carrying an old token. */
    static class FencedStore {
        private long highestToken = 0;
        private String value = "";
        synchronized boolean write(long token, String v) {
            if (token < highestToken) return false;               // stale writer, refuse
            highestToken = token; value = v; return true;
        }
        synchronized String read() { return value; }
    }

    public static void main(String[] args) {
        LeaseLock lock = new LeaseLock();
        FencedStore store = new FencedStore();
        long tA = lock.tryLock("report", "A", 0, 10);             // A gets token 1, lease until t=10
        System.out.println("A token = " + tA);
        // A pauses (GC). At t=11 the lease has expired and B takes over.
        long tB = lock.tryLock("report", "B", 11, 10);
        System.out.println("B token = " + tB);
        System.out.println("B writes: " + store.write(tB, "written by B"));
        System.out.println("A wakes up and writes: " + store.write(tA, "written by A (stale)"));
        System.out.println("A's unlock is ignored: " + lock.unlock("report", "A"));
        System.out.println("stored value = " + store.read());
    }
}`
    },
    {
      lang: 'python', run: true, title: 'Runnable model: a paused lock holder with and without fencing',
      code: `def simulate(use_fencing):
    lock = {"owner": None, "expires": 0, "token": 0}
    store = {"value": "", "highest": 0}
    log = []

    def acquire(who, now, ttl):
        if lock["owner"] is None or lock["expires"] <= now:
            lock["token"] += 1
            lock.update(owner=who, expires=now + ttl)
            return lock["token"]
        return None

    def write(who, token, now):
        if use_fencing and token < store["highest"]:
            log.append(f"t={now:>2} {who} write REJECTED (token {token} < {store['highest']})")
            return
        store["highest"] = max(store["highest"], token)
        store["value"] = f"written by {who}"
        log.append(f"t={now:>2} {who} write accepted (token {token})")

    ta = acquire("A", 0, 10)
    log.append(f"t= 0 A got lock, token {ta}, TTL 10")
    # ... A hits a long GC pause until t=15 ...
    tb = acquire("B", 11, 10)
    log.append(f"t=11 B got lock, token {tb} (A's lease expired)")
    write("B", tb, 12)
    write("A", ta, 15)            # A wakes up and still believes it holds the lock
    return log, store["value"]

for fencing in (False, True):
    log, final = simulate(fencing)
    print("--- fencing:", fencing)
    print("\\n".join(log))
    print("final value:", final)`
    },
    {
      lang: 'java', check: false, title: 'Redisson (popular client) with automatic lock renewal',
      code: `Config config = new Config();
config.useSingleServer().setAddress("redis://" + System.getenv("REDIS_HOST") + ":6379");
RedissonClient redisson = Redisson.create(config);

RLock lock = redisson.getLock("lock:daily-report");
// Wait up to 2 s to get it. With no explicit lease time, Redisson's watchdog keeps extending the
// lock every ~10 s while this JVM is alive, and it expires on its own if the JVM dies.
if (lock.tryLock(2, TimeUnit.SECONDS)) {
    try {
        generateReport();
    } finally {
        if (lock.isHeldByCurrentThread()) lock.unlock();
    }
}`
    }
  ],
  codeTitle: ['Jedis lock with token + Lua release', 'Plain Java lease lock + fencing store (compiles)', 'Python model of the pause problem', 'Redisson with watchdog'],
  viz: {
    title: 'The sleeping lock holder: expiry, takeover, stale write',
    input: 'no-fencing',
    inputLabel: 'Mode: no-fencing | fencing',
    gen: function (input) {
      var mode = String(input || '').trim().toLowerCase();
      if (mode !== 'no-fencing' && mode !== 'fencing') throw new Error('Type no-fencing or fencing');
      var fenced = mode === 'fencing';
      var nodes = [
        { id: 'A', label: 'Worker A', x: 10, y: 8, shape: 'box' },
        { id: 'B', label: 'Worker B', x: 10, y: 42, shape: 'box' },
        { id: 'L', label: 'Redis lock', x: 48, y: 25, shape: 'box' },
        { id: 'S', label: fenced ? 'Storage (checks token)' : 'Storage (no check)', x: 86, y: 25, shape: 'box', w: 24 }
      ];
      var edges = [['A', 'L'], ['B', 'L'], ['A', 'S'], ['B', 'S']];
      function f(narr, hl, ehl, tags, vals, vh) {
        return { narr: narr, parts: [
          { type: 'graph', label: 'Who is talking to whom', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags },
          { type: 'vars', label: 'State', vals: vals, hl: vh || {} }
        ] };
      }
      return [
        f('<b>t = 0.</b> Worker A asks for the lock and gets it with <b>token 33</b> and a TTL of 10 seconds.', { A: 'ok', L: 'ok' }, { 'A-L': 'ok' }, { A: 'token 33' }, { time: 0, lockOwner: 'A (token 33)', storageValue: '(empty)', highestTokenSeen: 0 }),
        f('<b>t = 1 to 14.</b> A starts a big job and then freezes: a long GC pause or a slow network call. It does <em>not know</em> time is passing.', { A: 'cur' }, {}, { A: 'paused...' }, { time: 8, lockOwner: 'A (token 33)', storageValue: '(empty)', highestTokenSeen: 0 }),
        f('<b>t = 10.</b> The lock TTL runs out. Redis deletes the key. Nobody holds the lock.', { L: 'bad' }, {}, { L: 'expired' }, { time: 10, lockOwner: 'nobody', storageValue: '(empty)', highestTokenSeen: 0 }, { lockOwner: 'bad' }),
        f('<b>t = 11.</b> Worker B asks for the lock and gets it with <b>token 34</b>. This is correct behaviour: the lease expired.', { B: 'ok', L: 'ok' }, { 'B-L': 'ok' }, { B: 'token 34' }, { time: 11, lockOwner: 'B (token 34)', storageValue: '(empty)', highestTokenSeen: 0 }),
        f('<b>t = 12.</b> B writes to storage with token 34. Storage accepts it' + (fenced ? ' and remembers 34 as the highest token.' : '.'), { B: 'ok', S: 'ok' }, { 'B-S': 'ok' }, { S: 'B wrote' }, { time: 12, lockOwner: 'B (token 34)', storageValue: 'written by B', highestTokenSeen: fenced ? 34 : 'not tracked' }),
        f('<b>t = 15.</b> Worker A wakes up. It still thinks it holds the lock and writes with token 33.', { A: 'cur', S: 'cur' }, { 'A-S': 'cur' }, { A: 'woke up' }, { time: 15, lockOwner: 'B (token 34)', storageValue: 'written by B', highestTokenSeen: fenced ? 34 : 'not tracked' }),
        fenced
          ? f('<span class="c-g">Storage rejects A:</span> token 33 is lower than the highest seen (34). The stale write never lands. Data is safe even though the lock failed.', { A: 'bad', S: 'ok' }, { 'A-S': 'bad' }, { S: 'rejected 33' }, { time: 15, lockOwner: 'B (token 34)', storageValue: 'written by B', highestTokenSeen: 34 }, { storageValue: 'ok' })
          : f('<span class="c-r">Storage accepts A\'s stale write</span> and overwrites B\'s work. Two workers ran at the same time and one of them destroyed the other\'s result. This is the failure the TTL cannot prevent.', { A: 'bad', S: 'bad' }, { 'A-S': 'bad' }, { S: 'corrupted' }, { time: 15, lockOwner: 'B (token 34)', storageValue: 'written by A (stale)', highestTokenSeen: 'not tracked' }, { storageValue: 'bad' })
      ];
    }
  },
  examples: [
    { title: 'Good use: only one server rebuilds the daily report', html: `<p>Five servers wake up at 02:00 for the nightly report. Each tries <code>SET lock:report:2026-10-15 token NX PX 600000</code>. One wins and builds the report; the other four see the lock exists and simply skip. If the winner crashes, the lock disappears after 10 minutes and the next run can retry. Worst case on a lock failure: the report is built twice — wasteful but harmless, because it overwrites with identical data. This is an <b>efficiency lock</b>.</p>` },
    { title: 'Bad use: "the lock makes payments safe"', html: `<p>Worker A locks <code>pay:order:42</code>, calls the card provider, then pauses; the lock expires; worker B locks and charges again. Result: a double charge. The fix is not a better lock but an <b>idempotency key</b> sent to the provider and a <b>unique constraint</b> <code>UNIQUE(order_id)</code> on the payments table, so the second insert fails no matter what the lock did.</p>` },
    { title: 'Release bug: deleting someone else\'s lock', html: `<p>A's lock expired at t=10, B acquired it at t=11. At t=15 A finishes and runs a plain <code>DEL lock:x</code>. That deletes <b>B's</b> lock, so C can enter while B is still working. With the token compare-and-delete script, A's <code>DEL</code> does nothing because the value is B's token.</p>`, code: { lang: 'text', code: `-- returns 1 only if the stored value equals MY token\nif redis.call('get', KEYS[1]) == ARGV[1] then\n  return redis.call('del', KEYS[1])\nelse\n  return 0\nend` } },
    { title: 'Picking a TTL', html: `<p>Too short: the lock expires during normal work. Too long: after a crash nobody can take over for a long time. Rule of thumb: TTL = 3 to 10 × the typical job time, with renewal ("heartbeat") if the job can vary. And keep the critical section as small as possible: lock only the step that must be exclusive, not the whole request.</p>` }
  ],
  deepDive: `<p><b>Redlock</b> is an algorithm that takes the lock on a majority of N independent Redis nodes (usually 5) with a time budget. It removes the single-master failover problem, but critics (notably Martin Kleppmann) argue it still depends on bounded clock drift and bounded pauses, which real systems do not guarantee, and that it does not provide fencing tokens. The pragmatic reading: Redlock is okay for efficiency locks; for correctness use a consensus-backed store (etcd, ZooKeeper, Consul), a database transaction, or fencing at the resource.</p>
    <p><b>Database alternatives are often better:</b> <code>SELECT ... FOR UPDATE</code> row locks inside one transaction; PostgreSQL <code>pg_advisory_lock</code>; a unique constraint to "claim" work (<code>INSERT ... ON CONFLICT DO NOTHING</code>); optimistic locking with a <code>version</code> column (<code>UPDATE ... WHERE id=? AND version=?</code>). These give real atomicity with the same data you are protecting, and no separate lock service to fail.</p>
    <p><b>Fencing tokens need support from the resource.</b> A database can implement them with a column (<code>WHERE last_token &lt;= ?</code>). An external HTTP API that ignores your token cannot be fenced, so you need idempotency keys instead. Redis itself does not return a monotonic token with <code>SET NX</code>; you can create one with <code>INCR lock:x:token</code> right after acquiring (with the caveat that failover can still reset it, so the DB or etcd revision numbers are safer).</p>
    <p><b>Renewal (watchdog):</b> a background thread extends the TTL (<code>PEXPIRE</code> if the token still matches, in Lua) every TTL/3 while work continues. If the process stalls, the renewal stops, the lease expires, and another worker may proceed — so renewal narrows the window but cannot close it.</p>
    <p><b>Blocking vs try-lock:</b> avoid waiting forever. Prefer <code>tryLock</code> with a timeout and a clear fallback (skip, retry later with backoff + jitter). Spinning at full speed against Redis turns a lock into a load problem.</p>
    <p><b>Leader election is a lock with a lease:</b> a long-lived lock renewed by one instance, for singleton jobs like schedulers (next topics). Same caveats apply, same remedy: make the job idempotent.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI agents and workflow engines run long, multi-step jobs (calls to LLMs that take 30+ seconds), which are exactly the kind of long critical sections that make lock TTLs expire. Agent frameworks therefore lean on <b>durable workflow engines</b> (Temporal, Step Functions) or per-task idempotency keys instead of ad-hoc locks. When an agent calls tools that have side effects (send email, create ticket), you want each call to carry an idempotency key so a retry or a duplicated agent run does not repeat the effect.</p>
    <p><b>Use AI as a partner:</b> paste your lock code and ask <code>List every way two workers can run this critical section at once, including pauses, clock jumps and Redis failover.</code> It is good at generating failure scenarios you can turn into tests. Ask for the DB-constraint version of the same protection.</p>
    <p><b>Where AI goes wrong:</b> generating <code>SET NX</code> then a separate <code>EXPIRE</code> (non-atomic), releasing with plain <code>DEL</code>, or presenting Redlock as "perfectly safe". It also often forgets to handle the case where the lock is not acquired.</p>
    <p><b>What you must still own:</b> classifying each lock as efficiency or correctness, and adding the second line of defence (unique constraint, version check, idempotency key) wherever a double run would cost money or trust.</p>`,
  problems: [
    {
      title: 'Is a Redis Lock Enough to Prevent Double Charges?',
      level: 'Hard', tags: ['locks', 'idempotency', 'payments'], companies: ['Stripe', 'PayPal', 'Razorpay'],
      statement: `<p>A teammate proposes: "Before charging an order, take a Redis lock <code>SET lock:pay:{orderId} NX PX 30000</code>. Only the holder calls the card provider." Explain what can still go wrong, and design a version that cannot double-charge even when the lock misbehaves.</p>`,
      constraints: `Charging takes 1-5 s normally but occasionally 40 s. App servers can pause (GC). Redis can fail over. The card provider supports an Idempotency-Key header.`,
      example: `<p>t=0 A takes the lock (30 s) and calls the provider. t=40 the provider answers slowly. t=31 B takes the (expired) lock and calls the provider as well.</p><p>${H.c('r', 'Two charge requests for one order.')} With an idempotency key both requests refer to the same charge, so ${H.c('g', 'the provider charges once.')}</p>`,
      brute: { why: `<p>Relying on the lock alone: the 40 s call outlives the 30 s TTL, a second worker enters, and both charge. A Redis failover can also hand out the same lock twice. The lock gives a false sense of safety.</p>` },
      mcq: { q: 'Which is the strongest protection against double charging?', options: ['Idempotency key + UNIQUE constraint on (order_id) for the payment attempt', 'A longer lock TTL', 'Two Redis locks', 'Checking the order status before the call (no other guard)'], answer: 0, explain: 'A unique constraint and an idempotency key make the second attempt a no-op regardless of timing or lock failures. A longer TTL or more locks only narrow the window; a status check alone is a read-then-write race.' },
      hints: [`<p>Ask: "what if the lock expires while I am inside it?" The lock is only an optimisation; the real guard must live where the data lives.</p>`, `<p>Create a <code>payment_attempt</code> row first with <code>UNIQUE(order_id)</code> and a generated <code>idempotency_key</code>. Only the transaction that inserts it proceeds.</p>`, `<p>Send the same idempotency key to the provider on every retry. Update the row's status (PENDING → SUCCEEDED/FAILED). A lock (optional) just reduces wasted attempts.</p>`],
      solution: {
        approach: `<p><b>What goes wrong with the lock-only design.</b> (1) The lease can expire during a slow call (40 s vs 30 s TTL) and a second worker enters. (2) A Redis failover can lose the lock key. (3) Clock jumps change effective TTLs. (4) The lock release can delete someone else's lock if it is not token-checked. None of these are rare enough to ignore when money is involved.</p>
          <p><b>Safe design.</b> Treat the Redis lock as an <i>efficiency</i> tool and make correctness come from the database and the provider:</p>
          <ol>
            <li>Insert <code>INSERT INTO payment_attempts(order_id, idempotency_key, status) VALUES (?, ?, 'PENDING')</code> with <code>UNIQUE(order_id)</code>. If the insert hits the unique constraint, another attempt owns it: read its status and return it (or poll). Only one transaction can ever insert.</li>
            <li>Call the provider with header <code>Idempotency-Key: &lt;idempotency_key&gt;</code>. If our worker pauses and a retry happens later, the provider recognises the key and returns the original result instead of charging again.</li>
            <li>Update the row to SUCCEEDED or FAILED with <code>UPDATE ... WHERE order_id=? AND status='PENDING'</code> so a late worker cannot overwrite a final state (optimistic guard).</li>
            <li>A reconciliation job looks for PENDING rows older than a few minutes and asks the provider for the real state using the idempotency key.</li>
          </ol>
          <p><b>Optional lock.</b> Keep <code>SET lock:pay:{orderId} token NX PX 30000</code> if you want to avoid two workers racing the first INSERT, with a token-checked Lua release, but do not depend on it. If a fencing token is available, pass it along as part of the update predicate.</p>
          <p><b>Why this works.</b> Safety no longer depends on timing: any number of workers, pauses, retries, or lock failures end up referring to the same row and the same idempotency key, so exactly one charge exists.</p>`,
        complexity: `<p>One extra indexed INSERT and UPDATE per payment: O(log N) each, negligible next to the 1-5 s provider call.</p>`,
        followUps: ['What if the provider has no idempotency support? (query-by-reference before retry, reconcile, accept a small manual-review queue)', 'When would you choose etcd/ZooKeeper over Redis for the lock?']
      }
    }
  ]
});
topics.push({
  title: 'Message Queues from Code: RabbitMQ, Kafka and SQS',
  analogy: `<p>A busy restaurant has a <b>ticket rail</b> between the waiters and the kitchen. A waiter (producer) clips an order ticket on the rail and immediately goes back to serving customers — they do not stand and wait for the pasta to be cooked. Cooks (consumers) take tickets one at a time, cook, and call "done" (acknowledge). If a cook faints, the ticket goes back on the rail. If the dinner rush is huge, the rail gets long, but nothing is lost, and the manager just adds cooks. A message queue is that ticket rail between two parts of your system.</p>`,
  explain: `<p>A <b>message queue</b> (or "message broker") lets one part of your app hand work to another part <b>without waiting</b>. The three roles are always the same:</p>
    <ul><li><b>Producer:</b> your web API. It puts a small message on the queue ("send welcome email to user 7") and returns right away.</li>
    <li><b>Broker:</b> RabbitMQ, Kafka, SQS... It stores messages safely until someone takes them.</li>
    <li><b>Consumer (worker):</b> a separate process that reads messages and does the slow work (sends the email).</li></ul>
    <p><b>Why bother?</b> (1) <b>Faster responses</b> — signup returns in 50 ms instead of 2 s waiting for the email server. (2) <b>Smoothing spikes</b> — 10,000 signups in a minute just make the queue longer. (3) <b>Isolation</b> — if the email provider is down the signup still works; emails wait in the queue. (4) <b>Scale workers</b> independently of the web servers.</p>
    ${H.table(['', 'RabbitMQ', 'Apache Kafka', 'Amazon SQS'], [
      ['Style', 'smart broker, routes messages to queues', 'distributed append-only <b>log</b>', 'fully managed queue service'],
      ['Basic terms', 'exchange → binding/routing key → queue', 'topic → partitions → consumer group, offsets', 'queue, visibility timeout, DLQ'],
      ['After a message is read', 'removed when the consumer <b>acks</b>', 'stays in the log; consumer just moves its <b>offset</b>', 'hidden for the visibility timeout, removed when you <b>delete</b> it'],
      ['Ordering', 'per queue (one consumer)', 'per <b>partition</b> (same key → same partition)', 'FIFO queues only (with message group id)'],
      ['Replay old messages', 'no (unless streams)', '<span class="c-g">yes</span>, reset the offset', 'no'],
      ['Best for', 'task queues, routing, request/reply', 'event streams, huge throughput, many readers, replay', 'simple cloud task queues, low operations effort']
    ])}
    <p><b>Acknowledgement is the key idea.</b> The broker does not forget a message until the consumer confirms it finished. If the consumer crashes before confirming, the message is delivered <em>again</em>. So the normal guarantee is <b>at-least-once delivery</b>: nothing is lost, but a message may arrive more than once. That is why consumers must be idempotent (later topic).</p>
    <p><b>Sending email the right way:</b> API handler: save user → publish <code>{"type":"WELCOME_EMAIL","userId":7}</code> → return 201. Email worker: read message → load user → call email provider → ack. Keep messages <b>small</b> (ids, not whole documents) and <b>versioned</b>.</p>
    <p><b>Do not publish before the database commits.</b> If you publish inside the transaction and it later rolls back, the email goes out for a user that does not exist. Publish after commit, or use the transactional outbox pattern when you cannot lose the event.</p>`,
  clues: [
    '"do not block the request on slow work (email, PDF, image resize, webhook)" → queue + worker',
    '"traffic spikes, protect the database / third-party API" → queue as a buffer, limit worker concurrency',
    '"if the consumer crashes the message must not be lost" → ack after processing; at-least-once',
    '"many services need the same event / replay history" → Kafka topic with consumer groups',
    '"simple managed queue, no servers to run on AWS" → SQS',
    '"route messages by type or pattern (fan-out, topic routing)" → RabbitMQ exchanges'
  ],
  code: [
    {
      lang: 'python', run: true, title: 'Runnable model: inline email vs queued email (what the user waits for)',
      code: `import queue, threading, time

SEND_SECONDS = 0.30                      # pretend the email provider is slow

def send_email(to):
    time.sleep(SEND_SECONDS)

# --- Version 1: inline. The request waits for every email. -----------------
t0 = time.time()
for u in range(3):
    send_email("user%d@example.com" % u)
inline = time.time() - t0

# --- Version 2: queue + worker. The request only enqueues. -----------------
q = queue.Queue()
done = []

def worker():
    while True:
        to = q.get()
        if to is None:
            break
        send_email(to)
        done.append(to)
        q.task_done()                    # "ack": this message is finished

w = threading.Thread(target=worker)
w.start()
t1 = time.time()
for u in range(3):
    q.put("user%d@example.com" % u)      # publish: returns instantly
queued = time.time() - t1                # this is all the user waits for
q.join()                                 # (demo only) wait until the worker is done
q.put(None); w.join()

print("inline : user waited about %.2f s" % inline)
print("queued : user waited about %.4f s, emails still sent: %d" % (queued, len(done)))`
    },
    {
      lang: 'java', title: 'Plain Java: producer/consumer with a BlockingQueue and worker threads',
      code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class EmailQueueDemo {
    record EmailJob(int userId, String template) {}

    public static void main(String[] args) throws Exception {
        // Bounded queue = built-in backpressure: put() blocks when the queue is full.
        BlockingQueue<EmailJob> queue = new ArrayBlockingQueue<>(100);
        AtomicInteger sent = new AtomicInteger();
        ExecutorService workers = Executors.newFixedThreadPool(3);

        for (int w = 0; w < 3; w++) {
            final int id = w;
            workers.submit(() -> {
                try {
                    while (true) {
                        EmailJob job = queue.take();                  // waits for work
                        if (job.userId() < 0) return;                 // poison pill = stop
                        Thread.sleep(50);                             // pretend to send the email
                        sent.incrementAndGet();
                        System.out.println("worker " + id + " sent " + job.template() + " to user " + job.userId());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return;
            });
        }

        long t0 = System.nanoTime();
        for (int u = 1; u <= 6; u++) queue.put(new EmailJob(u, "WELCOME")); // the "API" only enqueues
        System.out.println("API returned after " + (System.nanoTime() - t0) / 1_000_000 + " ms");

        for (int i = 0; i < 3; i++) queue.put(new EmailJob(-1, "STOP"));
        workers.shutdown();
        workers.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("emails sent: " + sent.get());
    }
}`
    },
    {
      lang: 'java', check: false, title: 'RabbitMQ with Spring AMQP: publish after commit, consume with manual ack',
      code: `// ---- Producer (inside the signup service) ----
@Service
public class SignupService {
    private final UserRepository users;
    private final RabbitTemplate rabbit;
    SignupService(UserRepository users, RabbitTemplate rabbit) { this.users = users; this.rabbit = rabbit; }

    @Transactional
    public User signup(String email) {
        User u = users.save(new User(email));
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {       // publish ONLY after the row is committed
                rabbit.convertAndSend("email.exchange", "email.welcome",
                    new EmailJob(UUID.randomUUID().toString(), u.getId(), "WELCOME"));
            }
        });
        return u;
    }
}

// ---- Consumer (separate worker process) ----
@Component
public class EmailWorker {
    @RabbitListener(queues = "email.welcome.q", ackMode = "MANUAL", concurrency = "3")
    public void handle(EmailJob job, Channel ch, @Header(AmqpHeaders.DELIVERY_TAG) long tag) throws IOException {
        try {
            mailer.send(job.userId(), job.template());   // slow work
            ch.basicAck(tag, false);                      // success: remove from the queue
        } catch (TransientMailException e) {
            ch.basicNack(tag, false, true);               // temporary problem: requeue
        } catch (Exception e) {
            ch.basicNack(tag, false, false);              // permanent problem: do not requeue (goes to DLQ)
        }
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Kafka with Spring Kafka: key = userId keeps one user\'s events in order',
      code: `// ---- Producer ----
@Service
public class OrderEvents {
    private final KafkaTemplate<String, String> kafka;     // bootstrap servers come from env/config
    OrderEvents(KafkaTemplate<String, String> kafka) { this.kafka = kafka; }

    public void orderPlaced(String userId, String json) {
        // same key -> same partition -> events for one user stay in order
        kafka.send("orders.placed", userId, json);
    }
}

// ---- Consumer group "email-service": each partition is read by exactly one member ----
@Component
public class OrderEmailConsumer {
    @KafkaListener(topics = "orders.placed", groupId = "email-service",
                   containerFactory = "manualAckFactory")   // AckMode.MANUAL
    public void on(ConsumerRecord<String, String> rec, Acknowledgment ack) {
        sendConfirmationEmail(rec.key(), rec.value());
        ack.acknowledge();                                  // commit the offset only AFTER the work is done
    }
}`
    },
    {
      lang: 'java', check: false, title: 'AWS SQS (SDK v2): long polling, process, then delete',
      code: `SqsClient sqs = SqsClient.create();                                   // region + credentials from the environment / IAM role
String queueUrl = System.getenv("EMAIL_QUEUE_URL");                     // never hard-code

// Producer
sqs.sendMessage(SendMessageRequest.builder()
    .queueUrl(queueUrl)
    .messageBody("{\\"type\\":\\"WELCOME_EMAIL\\",\\"userId\\":7}")
    .build());

// Consumer loop
while (running) {
    ReceiveMessageResponse resp = sqs.receiveMessage(ReceiveMessageRequest.builder()
        .queueUrl(queueUrl)
        .maxNumberOfMessages(10)
        .waitTimeSeconds(20)               // long polling: fewer empty calls, lower cost
        .visibilityTimeout(60)             // hidden from others for 60 s while we work
        .build());
    for (Message m : resp.messages()) {
        process(m.body());                 // if this throws, we do NOT delete -> reappears after 60 s
        sqs.deleteMessage(DeleteMessageRequest.builder()
            .queueUrl(queueUrl).receiptHandle(m.receiptHandle()).build());
    }
}`
    },
    {
      lang: 'js', check: false, title: 'Node.js: amqplib worker with prefetch and ack',
      code: `const amqp = require('amqplib');

async function main() {
  const conn = await amqp.connect(process.env.AMQP_URL);   // e.g. amqps://user:pass@host injected by the platform
  const ch = await conn.createChannel();
  await ch.assertQueue('email.welcome.q', { durable: true });
  ch.prefetch(5);                                           // at most 5 un-acked messages per worker

  await ch.consume('email.welcome.q', async (msg) => {
    if (!msg) return;
    try {
      const job = JSON.parse(msg.content.toString());
      await sendEmail(job.userId, job.template);
      ch.ack(msg);                                          // done
    } catch (err) {
      ch.nack(msg, false, false);                           // reject without requeue -> dead-letter exchange
    }
  });
}
main();`
    }
  ],
  codeTitle: ['Python model: inline vs queued', 'Java BlockingQueue email workers', 'RabbitMQ (Spring AMQP)', 'Kafka (Spring Kafka)', 'SQS (AWS SDK v2)', 'RabbitMQ from Node.js'],
  viz: [
    {
      title: 'Producer → queue → consumers: emails instead of inline work',
      input: '6 2',
      inputLabel: 'messages (1-8) and consumers (1-3)',
      gen: function (input) {
        var p = String(input || '').trim().split(/\s+/).map(Number);
        var n = p[0], c = p[1];
        if (!(n >= 1 && n <= 8) || !(c >= 1 && c <= 3)) throw new Error('Type two numbers: messages (1-8) and consumers (1-3), like 6 2');
        var frames = [], q = [], acked = 0, published = 0, i;
        var ys = c === 1 ? [25] : (c === 2 ? [10, 40] : [6, 25, 44]);
        function nodes() {
          var ns = [{ id: 'P', label: 'Web API (producer)', x: 12, y: 25, shape: 'box', w: 22 }, { id: 'Q', label: 'Queue', x: 48, y: 25, shape: 'box' }];
          for (var k = 0; k < c; k++) ns.push({ id: 'C' + k, label: 'Worker ' + (k + 1), x: 86, y: ys[k], shape: 'box' });
          return ns;
        }
        function edges() { var e = [['P', 'Q', 'publish']]; for (var k = 0; k < c; k++) e.push(['Q', 'C' + k]); return e; }
        function fr(narr, hl, ehl, tags, inflight) {
          return { narr: narr, parts: [
            { type: 'graph', label: 'Flow', directed: true, height: 50, nodes: nodes(), edges: edges(), hl: hl || {}, ehl: ehl || {}, tags: tags || {} },
            { type: 'queue', label: 'Messages waiting in the queue', items: q.length ? q.slice() : ['(empty)'], frontLabel: 'next out', backLabel: 'newest' },
            { type: 'vars', label: 'Counters', vals: { published: published, waiting: q.length, inFlight: inflight || 0, acked: acked }, hl: { acked: 'ok' } }
          ] };
        }
        frames.push(fr('Signups arrive. Instead of sending emails inline, the API will put one small message per signup on the queue and reply <b>201 Created</b> right away.'));
        for (i = 1; i <= n; i++) {
          q.push('email#' + i); published++;
          frames.push(fr('Signup ' + i + ': API publishes <code>email#' + i + '</code> and returns immediately. The user is not waiting for any email.', { P: 'cur', Q: 'ok' }, { 'P-Q': 'ok' }, { Q: q.length + ' queued' }));
        }
        var round = 0;
        while (q.length) {
          round++;
          var take = q.splice(0, c), hl = {}, ehl = {}, tags = {};
          take.forEach(function (m, k) { hl['C' + k] = 'cur'; ehl['Q-C' + k] = 'cur'; tags['C' + k] = m; });
          frames.push(fr('Round ' + round + ': each free worker takes one message. The messages are now <b>in flight</b> (delivered, not yet acked).', hl, ehl, tags, take.length));
          acked += take.length;
          var hl2 = {}, tags2 = {};
          take.forEach(function (m, k) { hl2['C' + k] = 'ok'; tags2['C' + k] = 'acked ' + m; });
          frames.push(fr('Workers finish sending and <b>ack</b>. Only now does the broker delete those messages. If a worker had crashed here, its message would go back on the queue.', hl2, {}, tags2, 0));
        }
        frames.push(fr('All ' + n + ' messages were handled by ' + c + ' worker(s). Need more speed? Add workers; the API does not change.', {}, {}, {}, 0));
        return frames;
      }
    },
    {
      title: 'Kafka partitions: same key, same partition, same order',
      input: 'u1 u2 u3 u1 u2 u1',
      inputLabel: 'Message keys (e.g. user ids), 1-10 of them',
      gen: function (input) {
        var keys = String(input || '').trim().split(/\s+/).filter(Boolean);
        if (!keys.length || keys.length > 10) throw new Error('Give 1 to 10 keys like: u1 u2 u3 u1');
        var parts = [[], [], []], frames = [], owner = { 0: 'consumer A', 1: 'consumer B', 2: 'consumer B' };
        function part(k) { var s = 0; for (var i = 0; i < k.length; i++) s += k.charCodeAt(i); return s % 3; }
        function view(narr, lastP) {
          var ps = parts.map(function (items, i) {
            var hl = {}; if (i === lastP && items.length) hl[items.length - 1] = 'ok';
            return { type: 'queue', label: 'Partition ' + i + ' (read by ' + owner[i] + ')', items: items.length ? items.slice() : ['(empty)'], hl: hl, frontLabel: 'offset 0', backLabel: 'latest' };
          });
          return { narr: narr, parts: ps };
        }
        frames.push(view('Topic <code>orders</code> has 3 partitions. Consumer group has 2 consumers: A reads partition 0, B reads partitions 1 and 2. Each partition is read by exactly one member of the group.', -1));
        keys.forEach(function (k, idx) {
          var p = part(k);
          parts[p].push(k + '#' + (idx + 1));
          frames.push(view('Message ' + (idx + 1) + ' has key <b>' + String(k).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</b>. hash(key) mod 3 = <b>' + p + '</b>, so it is appended to partition ' + p + ' at offset ' + (parts[p].length - 1) + '. The same key always lands on the same partition, which keeps that key\'s messages in order.', p));
        });
        frames.push(view('Order is guaranteed <b>inside</b> a partition, not across partitions. That is why you choose a key (userId, orderId) that groups the events that must stay in order.', -1));
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Signup: inline email vs queue', html: `<p><b>Inline:</b> save user (20 ms) + call email API (800 ms, sometimes 5 s, sometimes fails) → the user stares at a spinner and a provider outage breaks signup. <b>Queue:</b> save user (20 ms) + publish (2 ms) → respond in about 25 ms. The worker retries the email provider as long as needed. Signup availability no longer depends on the email vendor.</p>${H.table(['', 'Inline', 'Queue'], [['Response time', '~820 ms', '~25 ms'], ['Email provider down', '<span class="c-r">signup fails</span>', '<span class="c-g">signup works, email waits</span>'], ['Traffic spike', 'threads pile up', 'queue grows, workers drain it']])}` },
    { title: 'RabbitMQ routing in one picture', html: `<p>Producers never write to a queue directly: they publish to an <b>exchange</b> with a <b>routing key</b>. Bindings connect the exchange to queues. A <code>direct</code> exchange sends to queues bound with the exact key (<code>email.welcome</code>); a <code>topic</code> exchange matches patterns (<code>email.*</code>); a <code>fanout</code> exchange copies to every bound queue (analytics + email + search index each get the event).</p>`, code: { lang: 'yaml', code: `exchange: order.events   (type: topic)\nbindings:\n  - queue: email.q      key: "order.placed"\n  - queue: analytics.q  key: "order.*"\n  - queue: audit.q      key: "#"          # everything` } },
    { title: 'SQS visibility timeout', html: `<p>Worker A receives message M. SQS hides M from everyone for the visibility timeout (say 60 s). If A deletes M within 60 s, done. If A crashes, M becomes visible again after 60 s and worker B picks it up — that is the redelivery. Set the timeout longer than your typical processing time, or extend it while working (<code>ChangeMessageVisibility</code>). Too short → duplicates while still running; too long → slow recovery after a crash.</p>` },
    { title: 'Choosing the broker', html: `<p>"Send emails / resize images / call a webhook": a task queue, so SQS (on AWS) or RabbitMQ. "Every click and order must be available to billing, search, analytics, and be replayable for 7 days": Kafka. "Request must be answered in 100 ms and also trigger background work": synchronous API + a queue message. Do not pick Kafka just because it is popular: it brings partitions, rebalances and operations cost that a simple job queue does not need.</p>` }
  ],
  deepDive: `<p><b>Delivery guarantees.</b> <i>At-most-once</i> (ack before processing: crash = lost message), <i>at-least-once</i> (ack after processing: crash = duplicate), and <i>exactly-once</i>. True exactly-once across a network and a side effect (sending email, charging a card) is not possible in general. Kafka offers exactly-once <em>within Kafka</em> (idempotent producer + transactions), but your database or email call is outside it. In practice: <b>at-least-once delivery + idempotent processing = effectively once</b>.</p>
    <p><b>RabbitMQ details:</b> classic queues vs <b>quorum queues</b> (Raft replicated, the recommended durable type); set <code>durable</code> queues and <code>persistent</code> messages; <b>publisher confirms</b> tell the producer the broker really stored the message; <b>prefetch</b> limits how many unacked messages a consumer holds (too high = unfair distribution and big redeliveries; 1-20 is typical for slow jobs). RabbitMQ Streams add a Kafka-like log.</p>
    <p><b>Kafka details:</b> a topic is split into partitions; ordering and parallelism are per partition, so max useful consumers in a group = number of partitions. The consumer commits an <b>offset</b>: committing before processing risks loss, after processing risks duplicates. When consumers join/leave, a <b>rebalance</b> pauses reading briefly (cooperative rebalancing reduces this). Producer settings: <code>acks=all</code> + <code>enable.idempotence=true</code> for safe writes; retention (time/size) decides how long data stays replayable. A slow message ("poison pill") blocks its whole partition unless you route failures to a retry/dead-letter topic.</p>
    <p><b>SQS details:</b> Standard queues are nearly unlimited and may deliver duplicates and out of order; FIFO queues give order per <code>MessageGroupId</code> and exactly-once-ish deduplication within 5 minutes (<code>MessageDeduplicationId</code>) at lower throughput. Max message size 256 KB (use S3 for big payloads and send a pointer). Use a redrive policy with <code>maxReceiveCount</code> to move failures to a DLQ.</p>
    <p><b>Message design:</b> include a unique <code>messageId</code>, <code>type</code>, <code>version</code>, <code>occurredAt</code>, and a correlation/trace id. Prefer events that state facts ("OrderPlaced") over commands that depend on order when several consumers exist. Keep schemas backward-compatible (add optional fields; use a schema registry for Avro/Protobuf on Kafka).</p>
    <p><b>Backpressure:</b> unbounded queues hide overload until memory or disk runs out. Alert on <b>queue depth</b> and <b>message age</b> (age of the oldest message is the best SLO signal), and scale workers on that.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features are naturally asynchronous: generating a summary, embedding a document, running an agent task or transcribing audio can take 5-120 seconds. The standard design is: API enqueues a job, returns a job id, a worker calls the model, and the client polls or receives a webhook/WebSocket update. Queues also protect you from LLM provider rate limits (workers pull at the speed the provider allows) and let you batch embeddings cheaply.</p>
    <p><b>Use AI as a partner:</b> have it scaffold producer/consumer boilerplate for your framework, then review ack semantics yourself. Ask <code>Walk through every crash point between "message received" and "email sent" and tell me what happens at each.</code> Ask it to design a load test that fills the queue and measures drain time.</p>
    <p><b>Where AI goes wrong:</b> auto-acking before processing (silent message loss), unbounded retry loops, publishing inside a transaction before commit, calling Kafka "exactly-once" without caveats, and giant messages that should be S3 pointers.</p>
    <p><b>What you must still own:</b> choosing the broker for the actual access pattern, the ack/commit point, message schema evolution, and monitoring of queue depth and age.</p>`,
  problems: [
    {
      title: 'Send Welcome Emails Through a Queue',
      level: 'Easy', tags: ['queue', 'rabbitmq', 'sqs', 'async'], companies: ['Swiggy', 'Atlassian', 'Zoho'],
      statement: `<p>Your <code>POST /signup</code> currently creates the user and then calls the email provider inline. Some days the provider takes 8 seconds or errors, and signups fail. Redesign it with a message queue. Describe what the API does, what the message contains, what the worker does, and what to do when the email send fails.</p>`,
      constraints: `Up to 300 signups per minute. A user must never get zero welcome emails; getting two is acceptable but annoying. Choose any one broker and justify it.`,
      example: `<p>Request → ${H.c('g', '201 Created in ~30 ms')} + message <code>{"id":"m-91","type":"WELCOME_EMAIL","userId":7}</code> on the queue. Worker sends the email, acks. If the provider errors, the message is retried later.</p>`,
      brute: { why: `<p>Inline email: response time includes the provider's latency, a provider outage makes signup return 500, and a retry from the user may create duplicate accounts. Catching the exception and ignoring it loses the email forever.</p>` },
      mcq: { q: 'When should the worker ack the message?', options: ['After the email provider accepted the email', 'As soon as it is received', 'Before parsing the JSON', 'Never; the broker deletes it by itself'], answer: 0, explain: 'Acking after the work means a crash leads to a redelivery (maybe a duplicate email) instead of a lost email.' },
      hints: [`<p>Split the job in two: the API only records the user and enqueues a tiny message; the slow call to the email provider moves to a separate worker process.</p>`, `<p>Message = ids and type only (<code>userId</code>, <code>template</code>, a unique <code>messageId</code>). The worker loads the user from the database when it runs, so it sends current data.</p>`, `<p>Publish after the DB commit. Worker: process, then ack. Temporary failures: retry with delay; permanent failures (invalid address): send to a dead-letter queue and stop.</p>`],
      solution: {
        approach: `<p><b>API.</b> In one transaction insert the user. After commit, publish <code>{"messageId": uuid, "type": "WELCOME_EMAIL", "userId": 7, "version": 1}</code> to a durable queue and return <code>201</code>. If the publish itself fails (broker down), either retry briefly or keep a small <code>outbox</code> row written in the same transaction and let a background relay publish it, so a signup can never exist without its email job.</p>
          <p><b>Broker.</b> 300/min is tiny; SQS (no servers to run on AWS) or RabbitMQ both work. Pick SQS if the team already lives on AWS, use a standard queue with a redrive policy to a DLQ (<code>maxReceiveCount = 5</code>).</p>
          <p><b>Worker.</b> Long-poll (or consume with prefetch 5). For each message: load the user, skip if already marked <code>welcome_sent</code>, call the provider with a 10 s timeout, set <code>welcome_sent = true</code>, then ack/delete. Duplicate delivery therefore results in at most a skipped send (or, in the rare crash between send and flag, one extra email — acceptable per the requirement).</p>
          <p><b>Failures.</b> Provider 5xx or timeout: do not ack; the message reappears after the visibility timeout and is retried (add exponential backoff). Invalid address or 4xx: ack and write to a DLQ / mark the user "email invalid" because retrying cannot help. Alert when queue age exceeds 5 minutes or the DLQ is not empty.</p>
          <p><b>Result.</b> Signup latency is independent of the email vendor, spikes only lengthen the queue, and workers scale horizontally.</p>`,
        complexity: `<p>API: one DB write plus one publish (O(1)). Workers: throughput scales with the number of workers divided by provider latency (10 workers × 1 email/s = 10 emails/s).</p>`,
        followUps: ['How would you send the email at most once?', 'How do you prioritise password-reset emails over marketing emails? (separate queues)']
      }
    }
  ]
});
topics.push({
  title: 'Background Jobs, Retries with Backoff, and Dead-Letter Queues',
  analogy: `<p>You call a friend and they do not pick up. A sensible person does not call 50 times in one minute. You wait a bit, call again; if still no answer, wait a <em>longer</em> bit, then longer again (that is <b>exponential backoff</b>). Also, you and your 100 colleagues should not all redial at exactly 10:00:00 (so you add a little randomness — <b>jitter</b>). After 5 tries you stop and put a note in the "could not reach" folder for a human to look at. That folder is the <b>dead-letter queue (DLQ)</b>.</p>`,
  explain: `<p>A <b>background job</b> is work done outside the web request: sending email, generating a PDF, resizing an image, syncing to a partner API, rebuilding a search index. Your web handler puts a job on a queue and returns; a worker runs it later. Popular tools: Spring <code>@Async</code> / JobRunr / Quartz (Java), BullMQ (Node), Celery (Python), Sidekiq (Ruby), or plain RabbitMQ/SQS/Kafka consumers.</p>
    <p><b>Jobs fail.</b> The network blips, the third-party API returns 503, the database is mid-failover. Good systems retry the <em>right</em> failures in the <em>right</em> way:</p>
    ${H.table(['Failure type', 'Examples', 'What to do'], [
      ['Transient (temporary)', 'timeout, 503, connection reset, deadlock, rate limited (429)', 'retry with backoff + jitter'],
      ['Permanent', 'validation error, 400/404, malformed JSON, unknown user', 'do NOT retry; send to DLQ immediately'],
      ['Poison message', 'always crashes the worker (bug, huge payload)', 'stop after max attempts; DLQ; fix code; redrive']
    ])}
    <p><b>Exponential backoff:</b> wait <code>base × 2<sup>attempt</sup></code>, capped at a maximum. With base 1 s: 1, 2, 4, 8, 16, 32... seconds. This gives a struggling dependency room to recover instead of hammering it.</p>
    <p><b>Jitter:</b> if 1,000 jobs failed together and all retry exactly 4 s later, they cause a second spike (a "retry storm"). <b>Full jitter</b> picks a random delay between 0 and the backoff value: <code>delay = random(0, min(cap, base × 2<sup>n</sup>))</code>. The retries spread out nicely.</p>
    ${H.table(['Attempt', 'Backoff (no jitter)', 'Full jitter picks from', 'Total worst-case wait'], [['1', '1 s', '0 - 1 s', '1 s'], ['2', '2 s', '0 - 2 s', '3 s'], ['3', '4 s', '0 - 4 s', '7 s'], ['4', '8 s', '0 - 8 s', '15 s'], ['5', '16 s', '0 - 16 s', '31 s']])}
    <p><b>Dead-letter queue (DLQ):</b> after the maximum attempts (commonly 3-10) the message is moved to a separate queue instead of being retried forever or thrown away. Someone is alerted, inspects the failure, fixes the bug (or the bad data), and <b>redrives</b> the messages back to the main queue. The DLQ must be <em>monitored</em>: an unwatched DLQ is just a place where customer orders go to die.</p>
    <p><b>Rules of a healthy job system:</b> every job has a <b>timeout</b>; every retry has a <b>limit</b>; jobs are <b>idempotent</b> (safe to run twice); failures log the job id, attempt number, and error; and the queue depth, oldest-message age, failure rate and DLQ size are on a dashboard with alerts.</p>`,
  clues: [
    '"the third-party API is flaky / returns 503 sometimes" → retry with exponential backoff and jitter',
    '"thousands of jobs retry at the same moment" → missing jitter (retry storm)',
    '"a bad message keeps failing and blocks the queue" → max attempts + DLQ',
    '"we lost failed messages" → no DLQ / auto-ack before processing',
    '"retry validation errors forever" → classify permanent vs transient errors',
    '"job must survive a server restart" → persistent queue (not an in-memory @Async executor)'
  ],
  code: [
    {
      lang: 'python', run: true, title: 'Runnable model: backoff schedule, full jitter, and a job that ends in the DLQ',
      code: `import random

def backoff(attempt, base=1.0, factor=2.0, cap=30.0):
    """Delay before retry number attempt (1-based), no jitter."""
    return min(cap, base * (factor ** (attempt - 1)))

def full_jitter(attempt, rng, base=1.0, factor=2.0, cap=30.0):
    return rng.uniform(0, backoff(attempt, base, factor, cap))

print("attempt  backoff  (cap 30s)")
total = 0
for a in range(1, 8):
    d = backoff(a)
    total += d
    print("%5d  %6.1fs   total so far %.1fs" % (a, d, total))

rng = random.Random(42)                     # fixed seed -> repeatable output
print("\\nfull jitter for attempt 4 (max 8s), five different jobs:")
print([round(full_jitter(4, rng), 2) for _ in range(5)])

# A tiny consumer: job "bad" always fails, others succeed on the 1st or 3rd try.
MAX_ATTEMPTS = 4
jobs = {"ok-1": 1, "flaky-2": 3, "bad-3": 999}     # name -> succeeds on this attempt number
dlq, done = [], []
for name, succeeds_on in jobs.items():
    for attempt in range(1, MAX_ATTEMPTS + 1):
        if attempt >= succeeds_on:
            done.append((name, attempt)); break
        if attempt == MAX_ATTEMPTS:
            dlq.append(name)
        else:
            print("%s failed attempt %d -> retry in about %.1fs" % (name, attempt, backoff(attempt)))
print("\\ndone:", done)
print("dead-letter queue:", dlq)`
    },
    {
      lang: 'java', title: 'Plain Java: retry helper with exponential backoff, jitter and a dead-letter list',
      code: `import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

public class RetryRunner {
    public static class PermanentFailure extends RuntimeException {
        public PermanentFailure(String m) { super(m); }
    }

    private final int maxAttempts;
    private final long baseMillis, capMillis;
    private final List<String> deadLetters = new ArrayList<>();

    public RetryRunner(int maxAttempts, long baseMillis, long capMillis) {
        this.maxAttempts = maxAttempts; this.baseMillis = baseMillis; this.capMillis = capMillis;
    }

    /** Full jitter: random between 0 and min(cap, base * 2^(attempt-1)). */
    long delayFor(int attempt) {
        long ceiling = Math.min(capMillis, baseMillis * (1L << (attempt - 1)));
        return ThreadLocalRandom.current().nextLong(0, ceiling + 1);
    }

    public boolean run(String jobId, Supplier<Boolean> job) throws InterruptedException {
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (job.get()) { System.out.println(jobId + " succeeded on attempt " + attempt); return true; }
                throw new RuntimeException("transient error");           // job reported failure
            } catch (PermanentFailure e) {
                System.out.println(jobId + " permanent failure -> DLQ now: " + e.getMessage());
                deadLetters.add(jobId);
                return false;                                           // do not retry
            } catch (RuntimeException e) {
                if (attempt == maxAttempts) {
                    System.out.println(jobId + " gave up after " + attempt + " attempts -> DLQ");
                    deadLetters.add(jobId);
                    return false;
                }
                long wait = delayFor(attempt);
                System.out.println(jobId + " attempt " + attempt + " failed, retrying in " + wait + " ms");
                Thread.sleep(wait);
            }
        }
        return false;
    }

    public static void main(String[] args) throws Exception {
        RetryRunner r = new RetryRunner(4, 20, 200);
        int[] calls = {0};
        r.run("flaky", () -> ++calls[0] >= 3);                           // fails twice, then works
        r.run("always-bad", () -> false);                                // never works
        r.run("invalid", () -> { throw new PermanentFailure("user not found"); });
        System.out.println("dead letters: " + r.deadLetters);
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Spring Retry: declarative retry with backoff, then a recovery (DLQ) method',
      code: `@Service
public class WebhookSender {

    @Retryable(
        retryFor = { HttpServerErrorException.class, ResourceAccessException.class },   // transient only
        noRetryFor = { HttpClientErrorException.class },                                 // 4xx: do not retry
        maxAttempts = 5,
        backoff = @Backoff(delay = 1000, multiplier = 2.0, maxDelay = 30000, random = true)) // random = jitter
    public void send(WebhookJob job) {
        restClient.post().uri(job.url()).body(job.payload()).retrieve().toBodilessEntity();
    }

    // Runs after the last attempt failed: park the job for humans.
    @Recover
    public void giveUp(Exception e, WebhookJob job) {
        deadLetterRepository.save(new DeadLetter(job.id(), job.url(), e.toString()));
        alerts.notifyOnCall("webhook " + job.id() + " dead-lettered");
    }
}`
    },
    {
      lang: 'java', check: false, title: 'RabbitMQ: retry queue with TTL + dead-letter exchange (Spring declarables)',
      code: `@Configuration
public class EmailQueues {
    // Main work queue: failed (rejected) messages are dead-lettered into the retry queue.
    @Bean Queue work() {
        return QueueBuilder.durable("email.q")
            .deadLetterExchange("").deadLetterRoutingKey("email.retry.q").build();
    }
    // Retry queue: nobody consumes it. Messages sit for 30 s (TTL) and are dead-lettered BACK to email.q.
    @Bean Queue retry() {
        return QueueBuilder.durable("email.retry.q").ttl(30_000)
            .deadLetterExchange("").deadLetterRoutingKey("email.q").build();
    }
    // Final graveyard, inspected by humans / redrive tool.
    @Bean Queue dlq() { return QueueBuilder.durable("email.dlq").build(); }
}

@Component
class EmailConsumer {
    private static final int MAX = 5;
    @RabbitListener(queues = "email.q")
    void handle(Message msg, Channel ch) throws IOException {
        long tries = deathCount(msg);                       // from the x-death header RabbitMQ adds
        try {
            mailer.send(parse(msg));
            ch.basicAck(msg.getMessageProperties().getDeliveryTag(), false);
        } catch (TransientException e) {
            if (tries >= MAX) {                              // too many: publish to the DLQ and ack the original
                rabbit.send("email.dlq", msg);
                ch.basicAck(msg.getMessageProperties().getDeliveryTag(), false);
            } else {                                         // reject without requeue -> goes to email.retry.q
                ch.basicNack(msg.getMessageProperties().getDeliveryTag(), false, false);
            }
        }
    }
}`
    },
    {
      lang: 'js', check: false, title: 'Node.js BullMQ: attempts, exponential backoff, and failed-job inspection',
      code: `import { Queue, Worker } from 'bullmq';

const connection = { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT || 6379) };
const emails = new Queue('emails', { connection });

await emails.add('welcome', { userId: 7 }, {
  attempts: 5,                                        // total tries
  backoff: { type: 'exponential', delay: 1000 },      // 1s, 2s, 4s, 8s ...
  removeOnComplete: 1000,                             // keep the last 1000 successes
  removeOnFail: false,                                // keep failed jobs: this is our "DLQ"
});

new Worker('emails', async (job) => {
  if (!job.data.userId) throw new UnrecoverableError('missing userId');   // permanent: no retries
  await sendEmail(job.data.userId);                                          // throw = retry
}, { connection, concurrency: 10 });`
    },
    {
      lang: 'bash', title: 'SQS: redrive policy so a message moves to the DLQ after 5 receives',
      code: `# Attributes of the MAIN queue (DLQ ARN comes from your infrastructure code, not from source control)
aws sqs set-queue-attributes --queue-url "$EMAIL_QUEUE_URL" --attributes '{
  "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"'"$EMAIL_DLQ_ARN"'\\",\\"maxReceiveCount\\":\\"5\\"}",
  "VisibilityTimeout": "60"
}'
# After fixing the bug, move messages from the DLQ back to the source queue:
aws sqs start-message-move-task --source-arn "$EMAIL_DLQ_ARN"`
    }
  ],
  codeTitle: ['Python backoff + DLQ model', 'Java retry runner with jitter + DLQ', 'Spring Retry', 'RabbitMQ retry via TTL + DLX', 'BullMQ (Node)', 'SQS redrive'],
  viz: [
    {
      title: 'Exponential backoff: how long we wait before each retry',
      input: '1 2 6 30',
      inputLabel: 'base seconds, factor, attempts (1-8), cap seconds',
      gen: function (input) {
        var p = String(input || '').trim().split(/\s+/).map(Number);
        var base = p[0], factor = p[1], n = p[2], cap = p[3];
        if (!(base > 0 && base <= 10) || !(factor >= 1 && factor <= 4) || !(n >= 1 && n <= 8) || !(cap >= base && cap <= 600)) throw new Error('Type: base factor attempts cap, for example 1 2 6 30 (base 0-10, factor 1-4, attempts 1-8, cap at least base)');
        var delays = [], texts = [], labels = [], total = 0, frames = [], hl = {};
        frames.push({ narr: 'A job calls a flaky service. Each failure makes it wait <b>' + base + ' s × ' + factor + '<sup>attempt-1</sup></b> before the next try, but never more than <b>' + cap + ' s</b>.', parts: [{ type: 'vars', label: 'Policy', vals: { base: base + 's', factor: factor, maxAttempts: n, cap: cap + 's' } }] });
        for (var a = 1; a <= n; a++) {
          var raw = base * Math.pow(factor, a - 1), d = Math.min(cap, raw), capped = raw > cap;
          delays.push(d); texts.push(d + 's'); labels.push('try ' + a); total += d;
          hl = {}; hl[a - 1] = capped ? 'sel' : 'cur';
          frames.push({ narr: 'Attempt ' + a + ' failed. Wait <b>' + d + ' s</b>' + (capped ? ' (raw value ' + raw + ' s was <span class="c-p">capped</span> at ' + cap + ' s)' : '') + '. Total waiting so far: <b>' + total + ' s</b>.', parts: [
            { type: 'bars', label: 'Delay after each failure', values: delays.slice(), texts: texts.slice(), idxLabels: labels.slice(), hl: hl },
            { type: 'vars', label: 'Totals', vals: { failedAttempts: a, nextDelay: d + 's', totalWait: total + 's' }, hl: { nextDelay: capped ? 'sel' : 'cur' } }
          ] });
        }
        var jit = delays.map(function (d) { return Math.round(d / 2 * 10) / 10; });
        frames.push({ narr: 'With <b>full jitter</b> every job picks a random wait between 0 and the value above (average about half). Average total wait is around <b>' + Math.round(total / 2 * 10) / 10 + ' s</b>, and 1,000 jobs no longer retry in the same instant.', parts: [
          { type: 'bars', label: 'Maximum delay (without jitter) vs average delay (full jitter)', values: delays.concat(jit), texts: delays.map(function (d) { return d + 's'; }).concat(jit.map(function (d) { return '~' + d + 's'; })), idxLabels: labels.map(function (l) { return l + ' max'; }).concat(labels.map(function (l) { return l + ' avg'; })), hl: (function () { var h = {}; for (var i = n; i < 2 * n; i++) h[i] = 'ok'; return h; })() }
        ] });
        return frames;
      }
    },
    {
      title: 'Poison message: retries, then the dead-letter queue',
      input: '3',
      inputLabel: 'Max attempts before DLQ (1-5)',
      gen: function (input) {
        var max = parseInt(input, 10);
        if (isNaN(max) || max < 1 || max > 5) throw new Error('Enter max attempts between 1 and 5');
        var main = ['m1', 'm2-poison', 'm3'], dlq = [], done = [], attempts = { 'm2-poison': 0 }, frames = [];
        function fr(narr, hlMain, hlDlq, active) {
          return { narr: narr, parts: [
            { type: 'queue', label: 'Main queue', items: main.length ? main.slice() : ['(empty)'], hl: hlMain || {}, frontLabel: 'next', backLabel: 'back' },
            { type: 'queue', label: 'Dead-letter queue (DLQ)', items: dlq.length ? dlq.slice() : ['(empty)'], hl: hlDlq || {} },
            { type: 'vars', label: 'Progress', vals: { processing: active || '-', succeeded: done.join(', ') || '-', poisonAttempts: attempts['m2-poison'] + ' / ' + max }, hl: attempts['m2-poison'] >= max ? { poisonAttempts: 'bad' } : {} }
          ] };
        }
        frames.push(fr('Three messages are waiting. <code>m2-poison</code> has bad data and will throw an exception every time. Max attempts: <b>' + max + '</b>.', { 1: 'bad' }));
        var guard = 0;
        while (main.length && guard++ < 40) {
          var m = main.shift();
          if (m !== 'm2-poison') {
            frames.push(fr('Worker takes <b>' + m + '</b> and processes it successfully, then acks it.', {}, {}, m));
            done.push(m);
            frames.push(fr(m + ' is done and removed from the queue.', {}, {}, '-'));
          } else {
            attempts[m]++;
            frames.push(fr('Worker takes <b>m2-poison</b>: <span class="c-r">exception</span>. This was attempt ' + attempts[m] + ' of ' + max + '.', {}, {}, m));
            if (attempts[m] >= max) {
              dlq.push(m);
              frames.push(fr('Limit reached. Instead of retrying forever, the broker moves <b>m2-poison</b> to the <b>DLQ</b>. An alert fires. The healthy messages keep flowing.', {}, { 0: 'bad' }, '-'));
            } else {
              main.push(m);
              var h = {}; h[main.length - 1] = 'cur';
              frames.push(fr('It goes back on the queue (after a backoff delay) for another try.', h, {}, '-'));
            }
          }
        }
        frames.push(fr('Final state: m1 and m3 succeeded, the poison message sits safely in the DLQ for a human to inspect, fix, and <b>redrive</b>. Nothing was lost and nothing blocked the line.', {}, { 0: 'sel' }, '-'));
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Retry or not? Classify the error', html: `<p>The worker calls the shipping partner. <b>HTTP 503</b> or timeout → transient, retry. <b>HTTP 429</b> → retry, and respect <code>Retry-After</code>. <b>HTTP 400 "invalid postcode"</b> → permanent, do not retry, DLQ (a human or the customer must fix the address). <b>HTTP 401</b> → config problem (expired API key): retries will not help, alert immediately. Mapping errors to retry/no-retry up front is the most valuable part of a retry policy.</p>${H.table(['Error', 'Retry?', 'Why'], [['timeout / 503', '<span class="c-g">yes</span>', 'dependency might recover'], ['429 Too Many Requests', '<span class="c-g">yes, slower</span>', 'back off at least Retry-After'], ['400 / 422', '<span class="c-r">no</span>', 'same input will fail again'], ['401 / 403', '<span class="c-r">no (alert)</span>', 'credentials/config problem']])}` },
    { title: 'Retry storm without jitter', html: `<p>The email provider is down for 60 seconds. 5,000 jobs fail at about the same time and all schedule a retry for exactly +4 s. At +4 s the provider has just come back and receives 5,000 simultaneous calls, goes down again, and the same thing repeats at +8 s. With full jitter the same 5,000 retries are spread across 0-4 s (about 1,250 per second) and the provider recovers.</p>` },
    { title: 'Inspecting and redriving a DLQ', html: `<p>Alert: "DLQ has 17 messages". An engineer opens the DLQ, sees all 17 fail with <code>NullPointerException: user.address</code> — a bug in a new release for users without an address. They fix and deploy the code, then <b>redrive</b> (SQS "start message move task", RabbitMQ shovel, or a small script) so the 17 messages are processed again. Because consumers are idempotent, any message that had half-succeeded is safe to replay.</p>` },
    { title: 'Background job vs @Async', html: `<p>Spring's <code>@Async</code> just runs a method on another thread in the same JVM. If the server restarts, queued work vanishes; there is no retry, no visibility, no scale-out. Fine for "write an audit line without blocking". For anything you cannot lose (emails, invoices, payments), use a persistent queue or a job library backed by a database or Redis.</p>` }
  ],
  deepDive: `<p><b>Backoff formula variants (from the AWS Architecture Blog):</b> <i>Full jitter</i> <code>sleep = random(0, min(cap, base·2^n))</code>; <i>Equal jitter</i> <code>temp = min(cap, base·2^n); sleep = temp/2 + random(0, temp/2)</code> (never too short); <i>Decorrelated jitter</i> <code>sleep = min(cap, random(base, prev·3))</code>. Full jitter minimises total work in contention tests; pick one and move on.</p>
    <p><b>Where does the delay come from?</b> Not by sleeping in the worker (that wastes a worker slot). Real systems schedule the retry: SQS <code>ChangeMessageVisibility</code> (visibility timeout grows with the attempt), RabbitMQ TTL retry queues or the delayed-message plugin, Kafka separate retry topics (<code>orders.retry.1m</code>, <code>orders.retry.10m</code>) with a consumer that waits until the message is old enough, BullMQ/Sidekiq store the next run time in a Redis sorted set (score = run-at time).</p>
    <p><b>Retry amplification:</b> if service A retries 3 times to B, and B retries 3 times to C, one user action can become 9 calls to C. Retry at one layer only (usually the outermost), keep a <b>retry budget</b> (retries limited to e.g. 10% of traffic), and use a <b>circuit breaker</b> (Resilience4j) that stops calling a dependency that is clearly down.</p>
    <p><b>Ordering and blocking:</b> in Kafka, retrying inside the consumer loop blocks the partition ("head-of-line blocking"). Use non-blocking retry topics so one bad message does not stall every message behind it, at the cost of losing strict order for retried messages.</p>
    <p><b>Poison messages:</b> some crash the whole worker (out-of-memory, infinite loop). Always set a job timeout and a max payload size, and limit concurrency per message type. Keep the original message and the <b>failure reason, attempt count, first-failed time and stack trace</b> as headers on the DLQ copy.</p>
    <p><b>DLQ operations:</b> alert on DLQ depth &gt; 0, set a retention longer than your on-call response (SQS max 14 days), never auto-redrive without fixing the cause, and review DLQ messages for PII since they contain real customer data.</p>
    <p><b>Visibility timeout vs processing time:</b> if a job legitimately takes 10 minutes but the visibility timeout is 60 s, SQS redelivers it while the first run is still going, creating duplicates and (with retries) a pile-up. Extend the timeout with a heartbeat while working.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM calls fail in new ways: 429 rate limits, 529/overloaded, timeouts on long generations, and "successful" responses that are wrong (invalid JSON, refusals). Retry policies for AI jobs need to retry transient HTTP errors with backoff, <em>validate</em> the output (schema check) and retry with a repair prompt a limited number of times, and also have a cost cap: five automatic retries of a 20,000-token request are real money. Agent workflows often run on durable-execution engines (Temporal, Step Functions) that give you retries, timeouts, and a "dead" state out of the box.</p>
    <p><b>Use AI as a partner:</b> paste a worker and ask <code>Classify each exception this code can throw as transient or permanent, and propose the retry policy and DLQ routing.</code> Have it generate a chaos test that makes the dependency fail 30% of the time. Use AI to summarise DLQ contents ("17 messages: 15 are missing address") during an incident, but do the redrive decision yourself.</p>
    <p><b>Where AI goes wrong:</b> <code>while(true) { try { ... } catch { Thread.sleep(1000) } }</code> infinite fixed-delay loops, retrying non-idempotent calls, catching <code>Exception</code> and acking, no jitter, no DLQ, and logging whole payloads with personal data.</p>
    <p><b>What you must still own:</b> the transient/permanent classification, the maximum attempts and total time budget (must fit inside user-facing deadlines), idempotency of every retried operation, and the DLQ runbook.</p>`,
  problems: [
    {
      title: 'Design a Retry Policy with a DLQ for a Webhook Sender',
      level: 'Medium', tags: ['retries', 'backoff', 'dlq', 'sqs'], companies: ['Stripe', 'Shopify', 'Twilio'],
      statement: `<p>Your platform sends webhooks to customers' servers when an order changes. Customer endpoints are often slow or down. Design the retry policy: which responses are retried, the delay schedule, how long you keep trying, where failed deliveries go, what the customer and your on-call engineer see, and how you avoid hammering a customer who is down.</p>`,
      constraints: `1 million webhooks/day. A customer endpoint may be down for hours. At-least-once delivery is acceptable; customers must dedupe using an event id header.`,
      example: `<p>Attempt 1 at 0 s → 503. Retries wait about 30 s, 2 min, 10 min, 1 h, 6 h (with jitter) → 5xx all the way → after ~8 hours the delivery is marked ${H.c('r', 'FAILED')} and parked in the DLQ; the customer sees it in a dashboard with a "Resend" button.</p>`,
      brute: { why: `<p>Retry immediately in a loop: a down customer gets thousands of requests per second, your workers are all stuck waiting on timeouts so other customers' webhooks are delayed, and after a few minutes you give up and silently drop the event.</p>` },
      mcq: { q: 'A customer endpoint returns HTTP 410 Gone for a webhook. What should the sender do?', options: ['Stop retrying; mark the endpoint disabled/failed and notify the customer', 'Retry every second for an hour', 'Retry with a longer jitter', 'Ack and silently delete the event'], answer: 0, explain: '410 means the receiver says the endpoint is permanently gone. More retries cannot help; surface it to the customer and disable the endpoint instead of dropping silently.' },
      hints: [`<p>First split responses into groups: success (2xx), retryable (timeouts, 5xx, 429) and permanent (most 4xx, 410).</p>`, `<p>Use a growing schedule with jitter, e.g. 30 s, 2 min, 10 min, 1 h, 6 h, and a total deadline. Use separate queues per customer or a per-endpoint circuit breaker so one dead customer does not use up all workers.</p>`, `<p>After the last attempt: dead-letter with the failure history, notify the customer, and offer manual replay. Include a stable <code>Event-Id</code> header so retries can be deduplicated by the receiver.</p>`],
      solution: {
        approach: `<p><b>Classify responses.</b> 2xx = success. Network error, timeout (use a 10 s limit), 5xx, 408, 429 = retry (honour <code>Retry-After</code> on 429/503). 410 = disable endpoint. Other 4xx (400, 401, 403, 404) = most likely a configuration problem on the customer side: retry a smaller number of times (they may be deploying) and then stop and notify.</p>
          <p><b>Schedule.</b> Delay = full-jitter over the sequence 30 s, 2 min, 10 min, 1 h, 6 h (roughly exponential with a cap), giving about 8 hours of total trying. The delay is implemented by scheduling the next attempt (SQS visibility timeout or a delayed queue / sorted set keyed by run-at time), never by sleeping in a worker.</p>
          <p><b>Isolation.</b> A slow or dead customer must not consume all workers. Use per-endpoint concurrency limits (e.g. 5 in flight), a circuit breaker that pauses deliveries to an endpoint after N consecutive failures and probes occasionally, and separate queues for big customers. Deliveries to different customers proceed in parallel.</p>
          <p><b>Terminal state and DLQ.</b> After the last attempt (or a permanent response) the delivery goes to a DLQ table/queue with every attempt's status, latency and response snippet. The customer dashboard shows FAILED deliveries with a Resend button (redrive); an email warns them when an endpoint is auto-disabled. On-call alerts only on platform-level signals: queue age, overall failure rate, DLQ growth across many customers.</p>
          <p><b>Duplicates.</b> Delivery is at-least-once: every request carries <code>Event-Id</code> and a signature; receivers dedupe on the id. Our own worker marks a delivery SUCCEEDED in the database before acking the queue message so a redelivered queue message is dropped quickly.</p>`,
        complexity: `<p>O(1) per attempt. Storage: delivery attempts rows, about 1M/day × ~1.3 attempts, with a retention of 30 days.</p>`,
        followUps: ['How would you guarantee ordering of events per order id?', 'How do you rate-limit your own webhook sender per customer?']
      }
    }
  ]
});
topics.push({
  title: 'Idempotent Consumers: Safe to Receive the Same Message Twice',
  analogy: `<p>You press the lift button. Pressing it again, and again, does not call three lifts: the button is already lit, so extra presses change nothing. That is <b>idempotent</b>: doing it many times has the same effect as doing it once. Compare a vending machine that takes a coin each time you press: that one is <em>not</em> idempotent. A queue consumer must behave like the lift button, because the broker may hand you the same message more than once.</p>`,
  explain: `<p>Brokers promise <b>at-least-once</b> delivery. Duplicates happen when: the worker processes a message but crashes before the ack; the ack is lost on the network; the visibility timeout expires while the job is still running; the producer retries a publish it thought failed; or an operator redrives a DLQ. So: <b>assume every message can arrive twice</b>.</p>
    <p>An <b>idempotent consumer</b> produces the same final state no matter how many times it receives a message. Techniques, from simplest to strongest:</p>
    ${H.table(['Technique', 'How', 'Example'], [
      ['Naturally idempotent operation', 'set a value instead of adding to it', '<code>UPDATE orders SET status=\'SHIPPED\'</code> (not <code>count = count + 1</code>)'],
      ['Processed-ids table', 'store each message id; skip if already stored', '<code>INSERT INTO processed_messages(id)</code> with a PRIMARY KEY'],
      ['Business unique constraint', 'the data itself forbids a second row', '<code>UNIQUE(order_id)</code> on payments'],
      ['Version / state check', 'only apply if state is as expected', '<code>UPDATE ... WHERE status=\'PENDING\'</code>'],
      ['Idempotency key to a downstream API', 'pass the same key on every retry', 'payment provider <code>Idempotency-Key</code> header']
    ])}
    <p><b>The payment consumer recipe.</b> Each message has a unique <code>messageId</code> (or business id like <code>paymentId</code>). In <b>one database transaction</b>:</p>
    <ol><li><code>INSERT INTO processed_messages(message_id) VALUES (?)</code> — if it fails with a duplicate-key error, this message was already handled: just ack and stop.</li>
    <li>Apply the business change (debit account, mark order paid).</li>
    <li>Commit, then ack the message.</li></ol>
    <p>Because the "I have seen it" row and the business change commit together, a crash can never leave one without the other. If you checked a Redis set and then did the work as two separate steps you could still lose the race; the database transaction is what makes it correct.</p>
    <p><b>Cleanup:</b> the processed-ids table grows, so delete rows older than your maximum redelivery window (e.g. 7-14 days, matching broker retention) with a scheduled job.</p>
    <p><b>Producers also need ids.</b> The message id must be created by the producer <em>once</em> (a UUID or a business key) and stay the same on republish. A fresh UUID generated by the consumer on every delivery defeats the purpose.</p>`,
  clues: [
    '"at-least-once delivery" → consumers must be idempotent',
    '"customer was charged twice / email sent twice after a retry" → missing dedup',
    '"exactly-once processing" → at-least-once + idempotent handler (effectively once)',
    '"processed-ids table", "inbox pattern", "dedup key" → record id and business change in one transaction',
    '"increment a counter / add to a balance from a message" → not naturally idempotent, needs a dedup record',
    '"the same API call may be retried by the client" → idempotency key header'
  ],
  code: [
    {
      lang: 'js', run: true, title: 'Runnable model: at-least-once redelivery, with and without an idempotent consumer',
      code: `// A broker that redelivers a message if the consumer's ack is lost (at-least-once).
function runBroker(messages, ackLostFor, handler) {
  var pending = messages.slice();            // messages not yet acked
  var deliveries = 0;
  var lost = Object.assign({}, ackLostFor);  // id -> how many acks to lose
  while (pending.length) {
    var msg = pending.shift();
    deliveries++;
    handler(msg);                            // the consumer does its work
    if (lost[msg.id] > 0) {                  // ...but the ack never reaches the broker
      lost[msg.id]--;
      pending.push(msg);                     // so the broker delivers it again
    }
  }
  return deliveries;
}

var messages = [{ id: 'pay-1', amount: 50 }, { id: 'pay-2', amount: 30 }, { id: 'pay-3', amount: 20 }];
var ackLost = { 'pay-2': 1 };                // pay-2's first ack is lost

// 1) Naive consumer: adds the amount every time
var balance1 = 0;
var d1 = runBroker(messages, ackLost, function (m) { balance1 += m.amount; });
console.log('naive      : deliveries=' + d1 + ' total charged=' + balance1 + '  (expected 100)');

// 2) Idempotent consumer: remember processed ids (a DB table in real life)
var balance2 = 0, processed = new Set(), skipped = 0;
var d2 = runBroker(messages, ackLost, function (m) {
  if (processed.has(m.id)) { skipped++; return; }   // duplicate -> do nothing, still ack
  processed.add(m.id);
  balance2 += m.amount;
});
console.log('idempotent : deliveries=' + d2 + ' total charged=' + balance2 + '  duplicates skipped=' + skipped);`
    },
    {
      lang: 'sql', title: 'SQL (runs in SQLite): processed-ids table makes the payment update safe to replay',
      code: `CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL);
CREATE TABLE processed_messages (message_id TEXT PRIMARY KEY, processed_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT INTO accounts VALUES (1, 100);

-- Delivery 1 of message pay-9 (in a real consumer these statements share one transaction)
BEGIN;
INSERT OR IGNORE INTO processed_messages(message_id) VALUES ('pay-9');
-- changes() = 1 when the id was new; only then apply the business change
UPDATE accounts SET balance = balance - 30
 WHERE id = 1 AND changes() = 1;
COMMIT;

-- Delivery 2 of the SAME message (redelivery): the insert is ignored, changes() = 0, nothing happens
BEGIN;
INSERT OR IGNORE INTO processed_messages(message_id) VALUES ('pay-9');
UPDATE accounts SET balance = balance - 30
 WHERE id = 1 AND changes() = 1;
COMMIT;

SELECT balance AS balance_after_two_deliveries FROM accounts WHERE id = 1;`
    },
    {
      lang: 'java', title: 'Plain Java: idempotent handler with a concurrent processed-ids set',
      code: `import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class IdempotentConsumer {
    record PaymentMessage(String id, String account, long cents) {}

    // add() is atomic: exactly one thread gets 'true' for a given id.
    private final Set<String> processed = ConcurrentHashMap.newKeySet();
    private final Map<String, AtomicLong> balances = new ConcurrentHashMap<>();

    public void handle(PaymentMessage m) {
        if (!processed.add(m.id())) {
            System.out.println("duplicate " + m.id() + " ignored");
            return;                                             // still ack the message
        }
        balances.computeIfAbsent(m.account(), k -> new AtomicLong()).addAndGet(-m.cents());
        System.out.println("applied " + m.id());
    }

    public static void main(String[] args) {
        IdempotentConsumer c = new IdempotentConsumer();
        PaymentMessage a = new PaymentMessage("pay-1", "acc-7", 5000);
        c.handle(a);
        c.handle(a);                                            // redelivery
        c.handle(new PaymentMessage("pay-2", "acc-7", 3000));
        System.out.println("balance change = " + c.balances.get("acc-7").get());
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Spring: payment consumer with processed-ids table in ONE transaction',
      code: `@Component
public class PaymentConsumer {
    private final JdbcTemplate jdbc;
    PaymentConsumer(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @KafkaListener(topics = "payments.requested", groupId = "ledger")
    @Transactional                                   // dedup row + balance change commit together
    public void on(PaymentRequested msg, Acknowledgment ack) {
        try {
            // PRIMARY KEY (message_id): the 2nd insert of the same id throws
            jdbc.update("INSERT INTO processed_messages(message_id) VALUES (?)", msg.messageId());
        } catch (DuplicateKeyException dup) {
            ack.acknowledge();                       // already done earlier: just move on
            return;
        }
        int rows = jdbc.update(
            "UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?",
            msg.amountCents(), msg.accountId(), msg.amountCents());
        if (rows == 0) throw new InsufficientFundsException(msg.accountId());  // rolls back the dedup row too
        ack.acknowledge();                           // ack only after the DB work is committed (end of method)
    }
}`
    }
  ],
  codeTitle: ['JS model: duplicates with and without dedup', 'SQL processed-ids table', 'Java idempotent handler', 'Spring payment consumer'],
  viz: {
    title: 'A duplicate message rejected by the idempotency set',
    input: 'm1 m2 m1 m3 m2',
    inputLabel: 'Delivery order of message ids (m1-m9), up to 10 deliveries; m1 is $10, m2 is $20...',
    gen: function (input) {
      var ids = String(input || '').trim().split(/\s+/).filter(Boolean);
      if (!ids.length || ids.length > 10 || ids.some(function (x) { return !/^m[1-9]$/.test(x); })) throw new Error('Use ids m1..m9 separated by spaces, e.g. m1 m2 m1 m3');
      var seen = [], balance = 0, naive = 0, dups = 0, frames = [], queue = ids.slice();
      function fr(narr, current, hlSet, hlQ, vh) {
        return { narr: narr, parts: [
          { type: 'queue', label: 'Deliveries from the broker', items: queue.length ? queue.slice() : ['(none left)'], hl: hlQ || {}, frontLabel: 'next', backLabel: 'last' },
          { type: 'set', label: 'processed_messages (idempotency set)', items: seen.slice(), hl: hlSet || {} },
          { type: 'vars', label: 'Money', vals: { current: current || '-', naiveConsumerTotal: '$' + naive, idempotentTotal: '$' + balance, duplicatesSkipped: dups }, hl: vh || {} }
        ] };
      }
      frames.push(fr('The broker will deliver these ids in this order. Some may be repeated (a lost ack or a retry). Each message id <code>mN</code> means "charge $N0".', null));
      while (queue.length) {
        var id = queue.shift(), amt = 10 * parseInt(id.charAt(1), 10);
        naive += amt;
        frames.push(fr('Delivery: <b>' + id + '</b> arrives. Check the set: <code>INSERT INTO processed_messages(' + id + ')</code>.', id, {}, { 0: 'cur' }));
        if (seen.indexOf(id) >= 0) {
          dups++;
          var h = {}; h[id] = 'bad';
          frames.push(fr('<span class="c-r">Duplicate!</span> ' + id + ' is already in the set (primary-key violation). Skip the charge, but <b>still ack</b> so the broker stops redelivering. The naive consumer would have charged $' + amt + ' again.', id, h, {}, { duplicatesSkipped: 'bad', naiveConsumerTotal: 'bad' }));
        } else {
          seen.push(id); balance += amt;
          var h2 = {}; h2[id] = 'ok';
          frames.push(fr('<span class="c-g">New id.</span> Insert it into the set and apply the charge of $' + amt + ' in the same transaction, then ack.', id, h2, {}, { idempotentTotal: 'ok' }));
        }
      }
      frames.push(fr('Done. Idempotent consumer total: <b>$' + balance + '</b>. Naive consumer total: <b>$' + naive + '</b>' + (naive !== balance ? ' (<span class="c-r">overcharged by $' + (naive - balance) + '</span>)' : '') + '. Duplicates skipped: ' + dups + '.', null, {}, {}, { idempotentTotal: 'ok' }));
      return frames;
    }
  },
  examples: [
    { title: 'Not idempotent vs idempotent SQL', html: `<p><code>UPDATE stock SET qty = qty - 1</code> run twice removes 2. <code>UPDATE orders SET status='PAID' WHERE id=5</code> run twice leaves the order PAID. When you can phrase the effect as "set to X" instead of "add Y", you get idempotency for free. Messages that carry the <b>new state</b> ("balance is now 70", "status is SHIPPED") are easier to handle than messages that carry <b>deltas</b> ("subtract 30").</p>` },
    { title: 'Inbox pattern vs outbox pattern', html: `<p><b>Outbox</b> (producer side): write the event to an <code>outbox</code> table in the same transaction as the business change, and a relay publishes it, so you never lose an event. It can publish twice. <b>Inbox</b> (consumer side): write the message id to an <code>inbox</code>/<code>processed_messages</code> table in the same transaction as your change so you never apply it twice. Outbox + inbox together give effectively-once end-to-end.</p>` },
    { title: 'The check-then-act race', html: `<p>Buggy: <code>if (!redis.sismember("seen", id)) { charge(); redis.sadd("seen", id); }</code>. Two copies of the same message processed by two workers both pass the check before either adds. Also if the worker crashes after charge() and before sadd, a redelivery charges again. Fix: make the "claim" atomic (<code>SADD</code> returns 1 only for the first caller, or a DB unique insert) and put the claim and the effect in one transaction. When the effect is an external call, pass the id as the downstream idempotency key.</p>` },
    { title: 'Emails and other effects you cannot roll back', html: `<p>You cannot put "send email" in a database transaction. Options: record <code>email_sent(message_id)</code> <em>after</em> sending (a crash in between may send twice — acceptable for a welcome mail), or record <code>SENDING</code> first and reconcile stuck rows, or give the email provider your message id as its idempotency key. Pick based on how bad a duplicate is.</p>` }
  ],
  deepDive: `<p><b>What does "exactly-once" really mean?</b> Delivery: impossible over unreliable networks (the two generals problem). Processing: achievable as <i>idempotent consumer + at-least-once delivery</i>. Kafka's transactions give atomic "read offsets + write output topic" only when input and output are both Kafka. Once a side effect leaves the system (database, email, payment API), you need your own dedup.</p>
    <p><b>Where to put the dedup record.</b> In the same database as the business change, committed atomically — the strongest. In Redis with <code>SET id 1 NX EX 604800</code> — fast, but not atomic with the DB change, so a crash between the two leaves you either with a lost message (claimed but not applied) or a duplicate. Use Redis dedup only for cheap, repeatable effects or as a fast pre-filter before the transactional check.</p>
    <p><b>Message id design.</b> Prefer a natural business id (<code>paymentId</code>, <code>orderId + eventType + version</code>) over a random one when the same business action could be published twice by different producer retries. For HTTP APIs the client sends an <code>Idempotency-Key</code> header; the server stores key → response for 24 h and returns the saved response for a repeat.</p>
    <p><b>Retention window.</b> Dedup rows only need to live as long as a duplicate can still arrive: broker retention, DLQ retention, plus a safety margin. Partition the table by day and drop old partitions instead of a huge <code>DELETE</code>.</p>
    <p><b>Out-of-order and stale messages.</b> Dedup does not fix ordering. If "shipped" arrives before "paid", use a version number or state machine: apply only if <code>incoming.version &gt; stored.version</code>, ignore older ones. Last-write-wins on a timestamp is dangerous with clock skew; use the producer's per-entity sequence.</p>
    <p><b>Partial failure inside the handler.</b> A handler doing three steps (DB update, call API, publish event) can fail in the middle. Make each step idempotent, or record progress ("steps done") per message so a retry resumes from the failed step. Workflow engines (Temporal) do this for you.</p>`,
  aiEra: `<p><b>What AI changes:</b> agents call tools, and tool calls get retried by the agent loop, the framework, or the user. A "create_ticket" or "send_refund" tool without an idempotency key will eventually run twice. Good tool design for AI: every side-effecting tool takes a client-generated <code>request_id</code> and returns the original result on repeat. The same holds for webhooks you receive from AI vendors and for async batch jobs.</p>
    <p><b>Use AI as a partner:</b> ask <code>Here is my consumer. List every point where a crash or redelivery produces a duplicate or lost effect.</code> and turn each into a test that delivers the message twice. Ask for a migration that adds the <code>processed_messages</code> table and a cleanup job.</p>
    <p><b>Where AI goes wrong:</b> a Redis check-then-act "dedup", generating a new UUID in the consumer, acking before the transaction commits, and applying deltas without any dedup.</p>
    <p><b>What you must still own:</b> choosing the message id, putting the dedup record and the effect in one transaction, and the retention policy for dedup rows.</p>`,
  problems: [
    {
      title: 'Make the Payment Consumer Idempotent',
      level: 'Medium', tags: ['idempotency', 'kafka', 'sql', 'payments'], companies: ['PayPal', 'Paytm', 'Square'],
      statement: `<p>A Kafka consumer reads <code>PaymentRequested {messageId, accountId, amountCents}</code> and runs <code>UPDATE accounts SET balance = balance - amount</code>. During a rebalance the same message was processed twice and a customer was charged double. Fix the consumer so it is safe under redelivery, concurrency (two consumers may get the same message), and crashes between steps. Describe table design, transaction boundaries, ack timing and cleanup.</p>`,
      constraints: `The ledger database is PostgreSQL. 2,000 messages/second peak. Duplicates can arrive up to 7 days later (DLQ redrive).`,
      example: `<p>Message <code>pay-77</code> ($30) delivered twice. Account balance 100.</p><p>${H.c('r', 'Naive: 100 → 70 → 40.')} ${H.c('g', 'Idempotent: 100 → 70, second delivery skipped.')}</p>`,
      brute: { why: `<p>Plain <code>balance = balance - amount</code> applies every delivery. Checking a Redis set before charging is a check-then-act race and is not atomic with the database change; a crash between the two steps loses or duplicates the charge.</p>` },
      mcq: { q: 'Where should the processed-message record be written for the strongest guarantee?', options: ['In the same DB transaction as the balance update', 'In Redis after the DB commit', 'In the consumer\'s memory', 'In a log file'], answer: 0, explain: 'Only a single transaction makes "recorded as processed" and "effect applied" succeed or fail together.' },
      hints: [`<p>Give every message a stable unique id and remember which ids you have finished.</p>`, `<p>Table <code>processed_messages(message_id PRIMARY KEY, processed_at)</code>. <code>INSERT ... ON CONFLICT DO NOTHING</code> tells you (rows affected 0/1) whether you are first.</p>`, `<p>One transaction: insert the id; if 0 rows, rollback/skip and ack; else update balance, commit; ack after commit. Delete rows older than 8 days on a schedule (leader-locked).</p>`],
      solution: {
        approach: `<p><b>Schema.</b> <code>processed_messages(message_id text PRIMARY KEY, processed_at timestamptz default now())</code>, partitioned by day if volume is high. The producer fills <code>messageId</code> with the business payment id, so a republished event has the same id.</p>
          <p><b>Handler.</b> Open a transaction. Run <code>INSERT INTO processed_messages(message_id) VALUES (:id) ON CONFLICT DO NOTHING</code>. If it affected 0 rows, this is a duplicate: commit/rollback, then ack and return. If it affected 1 row, run <code>UPDATE accounts SET balance = balance - :amt WHERE id = :acct AND balance &gt;= :amt</code>. If that updates 0 rows (insufficient funds) throw so the whole transaction, including the dedup row, rolls back — or record a FAILED outcome in a payments table and ack, depending on whether a retry could ever succeed. Commit, <b>then</b> ack the Kafka offset.</p>
          <p><b>Why it is correct.</b> The primary key makes the claim atomic across concurrent consumers: only one transaction can insert the id; the other blocks until the first commits, then sees the conflict and skips. A crash before commit leaves nothing; a crash after commit but before ack leads to a redelivery that hits the conflict path. So the balance is debited exactly once.</p>
          <p><b>Cleanup.</b> Duplicates can come back for up to 7 days, so keep rows for 8 days; a nightly job (guarded by a leader lock so only one instance runs it) drops old partitions or deletes rows older than that.</p>
          <p><b>Extras.</b> Keep a <code>ledger_entries</code> table (append-only) with <code>UNIQUE(message_id)</code>, which is itself a natural dedup and an audit trail. Metrics: duplicates skipped per minute (a spike means rebalance or redrive trouble).</p>`,
        complexity: `<p>One indexed insert and one indexed update per message: O(log N) each. The extra table adds roughly 50-100 bytes per message.</p>`,
        followUps: ['What if the payment also needs to call an external card network?', 'How would this change if messages could arrive out of order?']
      }
    }
  ]
});
topics.push({
  title: 'Scheduled Jobs and Avoiding Double Runs Across Instances',
  analogy: `<p>A school has an alarm bell that must ring at 9:00. If three caretakers each own a bell and all follow the same timetable, the bell rings three times. Fine for a bell, terrible for "send every customer their invoice". The fix: caretakers agree on a rule — <b>only the one holding the master key rings the bell</b>. If the key holder is sick, the key becomes available after a while and another caretaker takes it. That key is a leader lock, and the "sick" case is why the key must expire.</p>`,
  explain: `<p>A <b>scheduled job</b> runs on a clock: "every night at 02:00 build reports", "every 5 minutes retry failed payments", "every Monday send a digest". Locally it is easy (<code>@Scheduled</code>, <code>ScheduledExecutorService</code>, cron). The trap appears the moment you run <b>more than one instance</b> of the app (2 pods, autoscaling, blue/green deploys): <b>every instance has the same timer</b>, so the job runs N times — N invoices, N emails, N database cleanups at once.</p>
    <p>Ways to run a job exactly once per tick:</p>
    ${H.table(['Approach', 'How', 'Good / bad'], [
      ['Separate scheduler outside the app', 'Kubernetes <code>CronJob</code>, AWS EventBridge Scheduler, cloud cron that triggers one task or puts one message on a queue', '<span class="c-g">best default</span>: the platform guarantees one trigger; your app has no timer at all'],
      ['Distributed lock per run', 'each instance tries <code>SET lock:job:2026-10-15T02:00 id NX PX ttl</code>; only the winner runs (ShedLock does this with a DB table or Redis)', 'simple; needs a sensible TTL and an idempotent job'],
      ['Leader election', 'one instance holds a renewed lease and is "the scheduler" while it lives', 'good for many jobs; watch failover gap and split brain'],
      ['One scheduler instance only', 'deploy a separate "scheduler" deployment with replicas = 1', 'simple but a single point of failure, restarts miss ticks'],
      ['Database claim', '<code>UPDATE jobs SET status=\'RUNNING\' WHERE id=? AND status=\'DUE\'</code> (check rows affected)', 'strong; the DB arbitrates; works for per-record jobs']
    ])}
    <p><b>Cron syntax in 20 seconds:</b> five fields <code>minute hour day-of-month month day-of-week</code>. <code>0 2 * * *</code> = 02:00 every day. <code>*/5 * * * *</code> = every 5 minutes. <code>0 9 * * MON</code> = 09:00 Mondays. Spring uses six fields with seconds first: <code>0 0 2 * * *</code>. Always state the <b>time zone</b> (UTC in servers) and remember daylight-saving shifts.</p>
    <p><b>Make every scheduled job idempotent and re-runnable.</b> Even with a lock it may run twice (lock expiry, a retry, a manual re-run after an incident). Use a run key such as the date: "invoice run 2026-10-15 for customer 7" can exist only once (<code>UNIQUE(customer_id, run_date)</code>).</p>
    <p><b>Also decide:</b> what happens if the job takes longer than its interval (skip, queue, or overlap)? What if the app was down at 02:00 (catch up or skip)? Who is alerted when it did <em>not</em> run? A "dead man's switch" monitor (the job pings a URL on success; alert if no ping) catches silent failures.</p>`,
  clues: [
    '"runs on every pod so we get N emails / N cleanups" → needs a lock, leader election, or external scheduler',
    '"@Scheduled in a clustered deployment" → ShedLock or Kubernetes CronJob',
    '"what if the instance holding the lock dies?" → lock TTL / lease expiry',
    '"job takes longer than the interval" → overlap policy (skip if still running)',
    '"missed run while the service was down" → catch-up design, run keys, monitoring',
    '"run at 02:00 in the customer\'s time zone" → store zone, handle DST (02:30 may not exist or may happen twice)'
  ],
  code: [
    {
      lang: 'java', title: 'Plain Java: ScheduledExecutorService job with overlap protection and error handling',
      code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

public class NightlyJob {
    private final AtomicBoolean running = new AtomicBoolean(false);   // skip a tick if the last run is still going
    private final AtomicInteger runs = new AtomicInteger();

    void tick() {
        // An exception that escapes would silently cancel all FUTURE runs of scheduleAtFixedRate!
        try {
            if (!running.compareAndSet(false, true)) {
                System.out.println("previous run still active, skipping this tick");
                return;
            }
            try {
                int n = runs.incrementAndGet();
                System.out.println("run #" + n + " started on " + Thread.currentThread().getName());
                Thread.sleep(30);                                      // pretend work
            } finally {
                running.set(false);
            }
        } catch (Throwable t) {
            System.out.println("job failed, will try at the next tick: " + t);
        }
    }

    public static void main(String[] args) throws Exception {
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> new Thread(r, "job-scheduler"));
        NightlyJob job = new NightlyJob();
        // scheduleWithFixedDelay waits 'delay' AFTER a run ends, so runs never overlap in one JVM
        scheduler.scheduleWithFixedDelay(job::tick, 0, 50, TimeUnit.MILLISECONDS);
        Thread.sleep(220);
        scheduler.shutdown();
        scheduler.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println("total runs: " + job.runs.get());
    }
}`
    },
    {
      lang: 'python', run: true, title: 'Runnable model: 3 instances, same schedule, with and without a per-tick lock',
      code: `INSTANCES = 3
TICKS = 4

def run(use_lock):
    runs = []                                   # (tick, instance) pairs that executed the job
    for tick in range(TICKS):
        lock_owner = None                       # SET lock:job:<tick> NX  (one key per tick)
        order = [(tick + i) % INSTANCES for i in range(INSTANCES)]   # who reaches Redis first varies
        for inst in order:
            if use_lock:
                if lock_owner is None:
                    lock_owner = inst           # got the lock -> run
                    runs.append((tick, inst))
                # else: lock exists -> skip
            else:
                runs.append((tick, inst))       # everyone runs
    return runs

for use_lock in (False, True):
    r = run(use_lock)
    print("lock" if use_lock else "no lock", "-> executions:", len(r), "(wanted", TICKS, ")")
    for t in range(TICKS):
        print("   tick", t, "ran on instances", [i for (tt, i) in r if tt == t])`
    },
    {
      lang: 'java', check: false, title: 'Spring @Scheduled + ShedLock: only one instance runs each tick',
      code: `@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "10m")      // safety: lock auto-releases even if the node dies
class SchedulingConfig {
    @Bean LockProvider lockProvider(DataSource ds) {       // locks live in a small table "shedlock"
        return new JdbcTemplateLockProvider(ds);
    }
}

@Component
class InvoiceJobs {
    @Scheduled(cron = "0 0 2 * * *", zone = "UTC")          // seconds minutes hours day month weekday
    @SchedulerLock(name = "nightlyInvoices",
                   lockAtMostFor = "30m",                   // upper bound if the holder crashes
                   lockAtLeastFor = "1m")                   // stops a fast job from re-running on a clock-skewed node
    public void run() {
        LocalDate runDate = LocalDate.now(ZoneOffset.UTC);
        invoiceService.generateAll(runDate);                // idempotent: UNIQUE(customer_id, run_date)
    }
}`
    },
    {
      lang: 'java', check: false, title: 'Cron job with a Redis leader lock (acquire, renew, step down)',
      code: `@Component
public class LeaderScheduler {
    private final StringRedisTemplate redis;
    private final String me = UUID.randomUUID().toString();     // this instance's identity
    private static final String KEY = "leader:scheduler";
    private static final Duration LEASE = Duration.ofSeconds(30);

    LeaderScheduler(StringRedisTemplate redis) { this.redis = redis; }

    // Every 10 s: try to become leader, or renew the lease if we already are.
    @Scheduled(fixedDelay = 10_000)
    public void electOrRenew() {
        Boolean won = redis.opsForValue().setIfAbsent(KEY, me, LEASE);
        if (Boolean.TRUE.equals(won)) return;                    // became leader
        if (me.equals(redis.opsForValue().get(KEY))) {
            redis.expire(KEY, LEASE);                            // still leader: extend (use a Lua script for strict atomicity)
        }
    }

    private boolean isLeader() { return me.equals(redis.opsForValue().get(KEY)); }

    @Scheduled(cron = "0 */5 * * * *", zone = "UTC")             // all instances fire...
    public void retryFailedPayments() {
        if (!isLeader()) return;                                 // ...but only the leader works
        payments.retryPending();                                 // job is idempotent in case two leaders overlap briefly
    }
}`
    },
    {
      lang: 'yaml', title: 'Kubernetes CronJob: the platform triggers exactly one pod per schedule',
      code: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-invoices
spec:
  schedule: "0 2 * * *"            # 02:00
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid        # skip a tick if the previous run is still going
  startingDeadlineSeconds: 600     # if missed (e.g. control plane down), still start within 10 min
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2              # retry a failed pod twice
      activeDeadlineSeconds: 3600  # kill it if it runs longer than 1 hour
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: invoices
              image: registry.example.com/invoice-job:1.4.2
              env:
                - name: DB_URL
                  valueFrom:
                    secretKeyRef: { name: invoice-db, key: url }   # secret injected, not in the image`
    }
  ],
  codeTitle: ['Java ScheduledExecutorService job', 'Python model: lock vs no lock', 'Spring @Scheduled + ShedLock', 'Redis leader lease', 'Kubernetes CronJob'],
  viz: {
    title: 'Three instances, one schedule: who runs the job?',
    input: '3 4 nolock',
    inputLabel: 'instances (2-4), ticks (2-6), mode: nolock | lock | crash',
    gen: function (input) {
      var p = String(input || '').trim().split(/\s+/);
      var n = parseInt(p[0], 10), t = parseInt(p[1], 10), mode = (p[2] || '').toLowerCase();
      if (!(n >= 2 && n <= 4) || !(t >= 2 && t <= 6) || ['nolock', 'lock', 'crash'].indexOf(mode) < 0) throw new Error('Type: instances ticks mode, for example 3 4 lock (mode = nolock, lock or crash)');
      var frames = [], rowHead = [], colHead = [], rows = [], hl = {}, i, k;
      for (i = 0; i < n; i++) colHead.push('Pod ' + (i + 1));
      var leader = 0, leaseLeft = 0, crashed = -1, doubles = 0, missed = 0;
      function grid(narr, extra) {
        frames.push({ narr: narr, parts: [
          { type: 'grid', label: 'Job executions per tick (RUN = executed the job)', rowHead: rowHead.slice(), colHead: colHead.slice(), rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) },
          { type: 'vars', label: 'Health', vals: Object.assign({ ticks: rows.length, doubleRuns: doubles, missedTicks: missed }, extra || {}), hl: { doubleRuns: doubles ? 'bad' : 'ok', missedTicks: missed ? 'bad' : 'ok' } }
        ] });
      }
      frames.push({ narr: 'Every pod has the same timer (<code>0 2 * * *</code>). Mode: <b>' + mode + '</b>. We want exactly <b>one</b> execution per tick.', parts: [{ type: 'vars', label: 'Setup', vals: { pods: n, ticks: t, mode: mode } }] });
      for (k = 0; k < t; k++) {
        rowHead.push('tick ' + (k + 1));
        var row = [], runners = [];
        if (mode === 'nolock') {
          for (i = 0; i < n; i++) { row.push('RUN'); hl[k + ',' + i] = 'bad'; runners.push(i); }
          doubles += n - 1;
          rows.push(row);
          grid('Tick ' + (k + 1) + ': all ' + n + ' pods fire and run the job. <span class="c-r">' + n + ' invoices sent to every customer.</span>');
        } else if (mode === 'lock') {
          var winner = k % n;
          for (i = 0; i < n; i++) { row.push(i === winner ? 'RUN' : 'skip'); hl[k + ',' + i] = i === winner ? 'ok' : 'done'; }
          rows.push(row);
          grid('Tick ' + (k + 1) + ': all pods try <code>SET lock:job:tick' + (k + 1) + ' NX</code>. Pod ' + (winner + 1) + ' wins and runs; the others see the lock and skip. <span class="c-g">Exactly one run.</span>');
        } else {
          if (k === 2 && crashed < 0) crashed = leader;
          if (crashed >= 0 && leaseLeft > 0) {
            for (i = 0; i < n; i++) { row.push(i === crashed ? 'DEAD' : 'wait'); hl[k + ',' + i] = i === crashed ? 'bad' : 'cur'; }
            leaseLeft--; missed++;
            rows.push(row);
            grid('Tick ' + (k + 1) + ': pod ' + (crashed + 1) + ' (the leader) is dead but its lease has not expired yet, so nobody else may run. <span class="c-r">Missed tick</span> (the price of safety).');
            if (leaseLeft === 0) { leader = (crashed + 1) % n; }
          } else if (crashed >= 0 && k > 2 && crashed === leader) {
            for (i = 0; i < n; i++) { row.push(i === crashed ? 'DEAD' : (i === (crashed + 1) % n ? 'RUN' : 'skip')); hl[k + ',' + i] = i === crashed ? 'bad' : (i === (crashed + 1) % n ? 'ok' : 'done'); }
            leader = (crashed + 1) % n; crashed = -2;
            rows.push(row);
            grid('Tick ' + (k + 1) + ': the lease expired, another pod took the lock and runs the job again. Service recovered by itself.');
          } else {
            for (i = 0; i < n; i++) {
              if (crashed === -2 && i === 0) { row.push('DEAD'); hl[k + ',' + i] = 'bad'; continue; }
              row.push(i === leader ? 'RUN' : 'skip'); hl[k + ',' + i] = i === leader ? 'ok' : 'done';
            }
            if (k === 2) { /* crash begins this tick */
              row = []; for (i = 0; i < n; i++) { row.push(i === leader ? 'DEAD' : 'wait'); hl[k + ',' + i] = i === leader ? 'bad' : 'cur'; }
              crashed = leader; leaseLeft = 1; missed++;
              rows.push(row);
              grid('Tick ' + (k + 1) + ': the leader (pod ' + (leader + 1) + ') crashes before running. Its lock lease (TTL) is still valid, so others wait. <span class="c-r">Missed tick.</span>');
            } else {
              rows.push(row);
              grid('Tick ' + (k + 1) + ': pod ' + (leader + 1) + ' holds the leader lease and runs the job; the others skip.');
            }
          }
        }
      }
      grid(mode === 'nolock' ? 'Result: <b>' + doubles + '</b> extra executions. Without coordination, scaling out multiplies the job.' : (mode === 'lock' ? 'Result: one execution per tick. The lock key has a TTL so a crash never blocks the job forever.' : 'Result: at most a short gap (' + missed + ' tick) while the lease expires, then another pod resumes. That gap is why jobs should be idempotent and catch up on missed windows.'));
      return frames;
    }
  },
  examples: [
    { title: 'Double run: the invoice incident', html: `<p>Team moves from 1 pod to 3 pods for traffic. The <code>@Scheduled</code> invoice job still exists in the code. Next morning every customer has three identical invoices and three "payment due" emails. The fix: a ShedLock (or CronJob), and a <code>UNIQUE(customer_id, billing_month)</code> constraint so even a second concurrent run cannot create duplicates.</p>` },
    { title: 'Choosing lockAtMostFor', html: `<p>If the job normally takes 5 minutes, set <code>lockAtMostFor</code> to about 30 minutes: long enough that a slow run does not lose the lock, short enough that a crashed node does not block the job all day. And set <code>lockAtLeastFor</code> to about a minute so a quick run on node A is not immediately repeated by node B whose clock is a few seconds behind.</p>` },
    { title: 'Job longer than its interval', html: `<p>A 5-minute interval job takes 7 minutes on a busy day. With <code>scheduleAtFixedRate</code> ticks pile up and run back-to-back; with <code>scheduleWithFixedDelay</code> the next run starts 5 minutes after the previous <em>ends</em>. In a cluster, use <code>concurrencyPolicy: Forbid</code> (Kubernetes) or a held lock so a new tick is skipped while the old run is alive.</p>` },
    { title: 'Daylight saving trap', html: `<p>A local-time job at 02:30 in a DST zone does not exist on the "spring forward" night and happens twice on "fall back" night. Run jobs in <b>UTC</b>, or use a scheduler that understands zones and skip/duplicate rules, and key runs by date so the second 02:30 is harmless.</p>${H.table(['Local time', 'What happens at 02:30 (clocks go forward 02:00 → 03:00)'], [['Naive cron in local time', '<span class="c-r">never fires that night</span>'], ['UTC cron', 'fires at a fixed UTC moment every day']])}` }
  ],
  deepDive: `<p><b>Lease-based leader election</b> is the same machinery as the distributed lock topic: a key with a TTL that the leader renews every TTL/3. Failure modes are identical: a leader that pauses past its lease can keep working while a new leader starts, giving two leaders for a short time. So scheduled jobs must be idempotent, or use fencing tokens on the writes they perform. For hard guarantees, use a coordination service (etcd, ZooKeeper, Consul sessions) or the database itself, or Kubernetes' built-in <code>Lease</code> objects used by controllers.</p>
    <p><b>"Claim the work" instead of "elect a leader".</b> For per-record jobs ("retry each failed payment"), use the database to hand out work: <code>SELECT ... WHERE status='DUE' ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED</code>. Many instances can run the same query at the same time and get <em>different</em> rows. This scales the job horizontally and has no leader at all. Mark rows RUNNING with a timestamp and have a sweeper reset stale RUNNING rows (worker crashed).</p>
    <p><b>Scheduler as a producer.</b> Cleanest architecture: the schedule only <i>enqueues</i> a small "run nightly invoices for 2026-10-15" message (or one message per customer batch), and normal queue workers execute it. You get retries, DLQ, backoff and horizontal scaling for free, and a duplicate trigger is just a duplicate message to an idempotent consumer.</p>
    <p><b>Clock and time.</b> Use <code>Clock</code> injection in Java so tests can move time. Spring's cron is evaluated in the JVM time zone unless you pass <code>zone</code>. Cloud schedulers (EventBridge Scheduler, Cloud Scheduler) are at-least-once and may fire a minute late; never assume a precise second.</p>
    <p><b>Observability for jobs:</b> log start/end/duration/records processed with a run id; emit a metric <code>job_last_success_timestamp</code> and alert when <code>now - last_success &gt; 2 × interval</code>; use heartbeat monitors (Healthchecks-style) for "job did not run". Jobs that "silently stopped last month" are very common.</p>
    <p><b>Long-running scheduled work:</b> checkpoint progress (last processed id) so a restart resumes instead of starting over, run in batches of 500-1000 rows with small transactions, and throttle so it does not starve online traffic.</p>
    <p><b>Delayed one-off jobs</b> ("send reminder in 24 hours") are different from cron: use a delay queue, a sorted set keyed by run time, SQS delay seconds (max 15 min) plus re-enqueue, or a workflow engine timer.</p>`,
  aiEra: `<p><b>What AI changes:</b> a lot of AI work is scheduled: nightly embedding refresh, re-indexing changed documents, evaluation runs of prompts against a test set, usage and cost reports, drift checks. These are batch jobs with the same double-run risk; a doubled embedding job doubles your bill. Agents are also given "schedule this for tomorrow" abilities, which turn into rows in a schedule table that your platform must run once, reliably, in the right time zone.</p>
    <p><b>Use AI as a partner:</b> ask it to translate "every second Tuesday at 9am New York time" into cron and a safe implementation, and to list DST edge cases. Ask <code>Review this @Scheduled method for multi-instance, overlap, and crash-recovery problems.</code></p>
    <p><b>Where AI goes wrong:</b> proposes <code>@Scheduled</code> with no mention of multiple instances, uses local time zones, lets exceptions escape from <code>scheduleAtFixedRate</code> (silently cancelling it), or "solves" double runs with an in-memory flag that only works inside one JVM.</p>
    <p><b>What you must still own:</b> the overlap and catch-up policy, the idempotency key for each run, the alert for "did not run", and the decision to move the schedule out of the app (CronJob/EventBridge) when the app scales out.</p>`,
  problems: [
    {
      title: 'Cron Job with a Leader Lock',
      level: 'Medium', tags: ['scheduling', 'redis', 'leader-election'], companies: ['Uber', 'Salesforce', 'Walmart'],
      statement: `<p>Your Spring Boot service runs on 6 pods. A job <code>@Scheduled(cron = "0 */5 * * * *")</code> retries pending payments and must run once per tick across the whole cluster. If the running pod dies, another pod must take over within about a minute. Design it with a Redis leader lock: key, value, TTL, renewal, what the job does when it loses leadership mid-run, and how to make a double run harmless.</p>`,
      constraints: `One Redis (with replicas). The job takes 30 s to 2 min. Missing one tick is acceptable; running twice at once is not.`,
      example: `<p>12:00 all 6 pods fire. Pod 3 wins <code>SET leader:retry-payments pod3 NX PX 60000</code> and runs. Pods 1,2,4,5,6 skip. If pod 3 dies at 12:00:40 the key expires at 12:01:00; the next tick (12:05) pod 5 wins.</p>`,
      brute: { why: `<p>Leaving the cron in all pods: 6 executions per tick, each retrying the same pending payments, causing double charges or at least 6× load on the payment provider. An in-memory <code>isRunning</code> flag only protects one JVM.</p>` },
      mcq: { q: 'Why must the leader lock key have a TTL?', options: ['So a crashed leader does not block the job forever', 'To make Redis faster', 'To allow many leaders', 'To avoid using a token'], answer: 0, explain: 'Without an expiry a dead leader would hold the lock permanently. The TTL lets another instance take over after the lease runs out.' },
      hints: [`<p>Every pod fires, but only one should do the work. What shared object can they race for, and what makes it release when the winner dies?</p>`, `<p><code>SET leader:retry-payments &lt;podId&gt; NX PX 60000</code> at the start of each tick; the winner runs, others return. Release with a token-checked Lua delete when finished.</p>`, `<p>If the job might run longer than the TTL, renew every TTL/3 and stop work if renewal fails. Regardless, make the job idempotent: claim each payment row with <code>UPDATE ... WHERE status='PENDING'</code> and check rows affected.</p>`],
      solution: {
        approach: `<p><b>Lock.</b> At the start of each tick every pod runs <code>SET lock:retry-payments:{tickId} {podId-uuid} NX PX 240000</code> (a per-tick key, TTL a bit less than the 5-minute interval). The pod that gets <code>OK</code> is the runner; the others log "skipped, lock held" and return. Using a per-tick key (tickId = the scheduled time) rather than one global key means a slow job cannot block the next tick and lock names are self-documenting.</p>
          <p><b>Crash recovery.</b> If the runner dies, the key expires after 240 s; the missed tick is simply lost, and the next tick (5 minutes later) is won by another pod. If the requirement is a takeover within about a minute, use a shorter lease (60 s) and have the runner <b>renew</b> it every 20 s with a Lua script (<code>if get == myId then pexpire</code>). A dead runner stops renewing, so the lease ends within 60 s and a standby pod can pick up work on its next check (fire the check every 30 s via <code>fixedDelay</code>, not only on the cron tick).</p>
          <p><b>Losing leadership mid-run.</b> Before each batch the runner checks that the lock value is still its id. If not, it stops cleanly. This narrows but cannot close the double-leader window (GC pauses), so the work itself must be safe.</p>
          <p><b>Idempotent job.</b> Process payments in batches using <code>SELECT ... FOR UPDATE SKIP LOCKED</code> or an atomic claim <code>UPDATE payments SET status='RETRYING', claimed_by=? WHERE id=? AND status='PENDING'</code> and continue only when it affects one row. Send the payment id as the provider's idempotency key. Then even two concurrent runners cannot charge anyone twice.</p>
          <p><b>Operations.</b> Metrics: ticks won/skipped per pod, run duration, last success timestamp with an alert if older than 15 minutes. Alternative if the cluster is on Kubernetes: replace all of this with a CronJob (<code>concurrencyPolicy: Forbid</code>) that enqueues one message.</p>`,
        complexity: `<p>One Redis command per pod per tick (6 per 5 minutes); trivial. Job cost is dominated by the payment retries themselves.</p>`,
        followUps: ['What changes if Redis fails over right as the lock is taken?', 'Why might a DB-backed lock (ShedLock JDBC) be better here?']
      }
    }
  ]
});
function P(o) {
  practice.push({
    title: o.title, level: o.level, tags: o.tags, companies: o.companies,
    statement: o.statement, constraints: o.constraints, example: o.example,
    brute: { why: o.brute },
    mcq: { q: o.q, options: o.opts, answer: 0, explain: o.why },
    hints: o.hints,
    solution: { approach: o.approach, code: o.code, complexity: o.complexity, followUps: o.follow }
  });
}

P({
  title: 'Pick the Redis Type', level: 'Easy', tags: ['redis', 'data-structures'], companies: ['Amazon', 'Zoho'],
  statement: `<p>For each requirement choose the Redis type and the main commands: (a) cache one rendered HTML page, (b) store a user profile where the "last_login" field changes often, (c) "latest 10 notifications" per user, (d) block duplicate order ids, (e) top 100 most viewed articles today, (f) count page views.</p>`,
  constraints: `Use the simplest structure that fits. One short sentence of reasoning per item.`,
  example: `<p>(f) page views → ${H.c('g', 'String + INCR')} (atomic, no read-modify-write).</p>`,
  brute: `<p>Storing everything as one JSON string works but forces read-modify-write for small changes, loses atomicity for counters, and makes ranking or uniqueness an application-side loop over big blobs.</p>`,
  q: 'Which type best fits "top 100 most viewed articles"?', opts: ['Sorted set', 'List', 'String', 'Hash'], why: 'A sorted set keeps members ordered by score (views) and supports ZINCRBY and ZREVRANGE efficiently.',
  hints: [`<p>For each item ask: is it one value, a set of fields, an ordered sequence, a unique collection, or a ranking?</p>`, `<p>Match: string, hash, list, set, sorted set. Counters want an atomic command like INCR or ZINCRBY.</p>`, `<p>Add TTLs where data is a cache (a, e), trim lists (c), and think about key naming such as notif:{userId}.</p>`],
  approach: `<p>(a) <b>String</b>: <code>SET page:home html EX 60</code>. (b) <b>Hash</b>: <code>HSET user:7 name Asha last_login 1760000000</code>; update one field with HSET, read with HGET, no need to parse a blob. (c) <b>List</b>: <code>LPUSH notif:7 msg</code> then <code>LTRIM notif:7 0 9</code> so it never grows past 10; read with <code>LRANGE notif:7 0 9</code>. (d) <b>Set</b>: <code>SADD orders:seen id</code> returns 0 for a duplicate, which is the check and the claim in one atomic step (add EXPIRE or use a per-day key to bound memory). (e) <b>Sorted set</b>: <code>ZINCRBY views:2026-10-15 1 article:55</code> on every view and <code>ZREVRANGE views:2026-10-15 0 99 WITHSCORES</code> to read; one key per day with EXPIRE. (f) <b>String</b> with <code>INCR views:article:55</code>. In every case choose the structure from the access pattern, then add TTL or trimming so memory stays bounded.</p>`,
  complexity: `<p>All commands are O(1) or O(log N) except LRANGE/ZREVRANGE which are O(log N + page).</p>`,
  follow: ['When would you use a HyperLogLog instead of a set?', 'What is the risk of calling SMEMBERS on a huge set?']
});

P({
  title: 'Compute the Cache Hit Ratio', level: 'Easy', tags: ['cache', 'metrics'], companies: ['Flipkart', 'Infosys'],
  statement: `<p>Over one minute, the product endpoint made 12,000 cache lookups: 10,800 found a value, 1,200 did not. Each miss costs one 25 ms database query. (1) What is the hit ratio? (2) How many DB queries per second does the database see? (3) A teammate wants to double the TTL; what should you check first?</p>`,
  constraints: `Round to sensible numbers. Explain in plain words.`,
  example: `<p>Hit ratio = 10,800 / 12,000 = ${H.c('g', '90%')}. DB queries = 1,200 per 60 s = ${H.c('b', '20 per second')}.</p>`,
  brute: `<p>Judging a cache only by "it feels faster" hides whether it is helping. Without counting hits and misses you cannot tune TTLs or see an eviction problem until the database is overloaded.</p>`,
  q: 'Hit ratio is defined as:', opts: ['hits / (hits + misses)', 'misses / hits', 'hits / TTL', 'DB reads / requests per second'], why: 'It is the fraction of lookups answered from the cache.',
  hints: [`<p>Hit ratio is hits divided by all lookups (hits plus misses).</p>`, `<p>Every miss becomes one DB query, so queries per second = misses / seconds.</p>`, `<p>Before changing TTL ask what freshness the business accepts and whether misses come from expiry, evictions or never-seen keys.</p>`],
  approach: `<p>(1) 10,800 / 12,000 = 0.90, a 90% hit ratio. (2) The 1,200 misses each cause one query, so 1,200 / 60 = 20 queries per second, each 25 ms, which is only 0.5 database connections busy on average, a healthy load. Without the cache, all 12,000 lookups (200 per second) would hit the DB, ten times more. (3) Before doubling the TTL, check how stale the data may be (a price shown for 10 minutes instead of 5?), whether misses are caused by TTL expiry or by evictions from a full Redis (<code>evicted_keys</code> in INFO), and whether the misses are concentrated in a few hot keys (use jitter or single-flight) or spread across rarely repeated keys (a longer TTL will not help). Make the decision from the measured breakdown, not by guessing.</p>`,
  complexity: `<p>Counting hits and misses is O(1) per lookup with two atomic counters.</p>`,
  follow: ['What hit ratio would make you worry?', 'How would you measure hit ratio per endpoint?']
});

P({
  title: 'Ack Before or After Processing?', level: 'Easy', tags: ['queue', 'ack', 'delivery'], companies: ['Amazon', 'Swiggy'],
  statement: `<p>A worker reads "send invoice email" messages. Compare acking <b>before</b> sending and acking <b>after</b> sending. What happens on a crash in each case, which delivery guarantee does each give, and which would you choose for invoices?</p>`,
  constraints: `Use the words at-most-once and at-least-once. State the consequence for the customer.`,
  example: `<p>Ack first, crash → ${H.c('r', 'invoice never sent')}. Ack after, crash → ${H.c('y', 'invoice may be sent twice')}.</p>`,
  brute: `<p>Auto-ack on receive is the default in many libraries. It looks fine in tests, but any crash, deploy or out-of-memory between receive and finish silently loses the message with no trace.</p>`,
  q: 'Acking after successful processing gives:', opts: ['At-least-once delivery', 'At-most-once delivery', 'Exactly-once delivery', 'No guarantee'], why: 'A crash before the ack makes the broker redeliver, so the message is never lost but may be duplicated.',
  hints: [`<p>Think about what the broker believes after each ack and what it does if the worker disappears.</p>`, `<p>Ack before = at-most-once (can lose). Ack after = at-least-once (can duplicate).</p>`, `<p>Pair ack-after with an idempotent handler (invoice id recorded) so duplicates become harmless.</p>`],
  approach: `<p><b>Ack before sending:</b> the broker deletes the message immediately. If the worker crashes before the email is sent, nothing remains to retry, so the customer never gets the invoice and no error is visible. This is <b>at-most-once</b>: no duplicates, possible loss. <b>Ack after sending:</b> the broker keeps the message until it is confirmed. A crash before the ack leads to a redelivery, so the invoice is sent again, giving <b>at-least-once</b>: no loss, possible duplicates. For invoices losing is worse than a duplicate, so choose ack-after. To avoid a visible duplicate, make the handler idempotent: store the invoice id in a <code>sent_invoices</code> table (unique key) and skip if present, or pass the invoice id to the email provider as an idempotency key. Also set a prefetch/visibility timeout longer than the typical send time to avoid needless redelivery while the worker is still working.</p>`,
  complexity: `<p>Ack-after adds no real cost; a dedup lookup adds one indexed read/insert per message.</p>`,
  follow: ['What is exactly-once and why is it hard?', 'What happens if the visibility timeout is shorter than processing time?']
});

P({
  title: 'Exponential Backoff Schedule', level: 'Easy', tags: ['retries', 'backoff', 'jitter'], companies: ['Google', 'Stripe'],
  statement: `<p>A job retries with base delay 2 seconds, doubling each time, capped at 40 seconds, for at most 7 retries. List the delay before each retry (no jitter), the total waiting time, and explain what full jitter changes.</p>`,
  constraints: `delay(n) = min(cap, base × 2^(n-1)), n from 1 to 7.`,
  example: `<p>2, 4, 8, 16, 32, ${H.c('p', '40')}, ${H.c('p', '40')} (capped) → total <b>142 s</b>.</p>`,
  brute: `<p>Retrying every second forever hammers a failing dependency, delays recovery, and fills logs. Waiting a fixed long time wastes time when the failure was a one-second blip.</p>`,
  q: 'Why add jitter to backoff?', opts: ['To spread retries so many clients do not retry at the same instant', 'To make delays longer', 'To skip the cap', 'To avoid using a queue'], why: 'Without jitter all clients that failed together retry together, causing repeated spikes (retry storms).',
  hints: [`<p>Write the uncapped values first: 2, 4, 8, 16, 32, 64, 128.</p>`, `<p>Apply the cap of 40 to each value, then add them up.</p>`, `<p>Full jitter picks a random number between 0 and each capped delay, so the average total is about half.</p>`],
  approach: `<p>Uncapped: 2, 4, 8, 16, 32, 64, 128. After the 40 s cap: 2, 4, 8, 16, 32, 40, 40. The sum is 2+4+8+16+32+40+40 = 142 seconds. With <b>full jitter</b> each wait is a random value from 0 to that capped delay, so the expected total is about 71 s, and, more importantly, 1,000 clients that failed at the same moment retry at 1,000 different times instead of all at +2 s, +4 s and so on. This protects a dependency that has just recovered from an immediate second spike. In real systems implement the delay by scheduling the next attempt (visibility timeout or delayed queue) rather than sleeping inside a worker.</p>`,
  code: { lang: 'python', run: true, code: `base, cap, retries = 2, 40, 7\ndelays = [min(cap, base * 2 ** (n - 1)) for n in range(1, retries + 1)]\nprint(delays, "total =", sum(delays))` },
  complexity: `<p>O(retries) to compute the schedule; trivial.</p>`,
  follow: ['Compare full jitter with equal jitter.', 'What should the total retry budget be for a user-facing request?']
});

P({
  title: 'Fix the Immortal Rate-Limit Key', level: 'Medium', tags: ['rate-limiting', 'redis', 'atomicity'], companies: ['Cloudflare', 'Razorpay'],
  statement: `<p>A rate limiter does <code>count = INCR rl:user7</code> and then, in a separate call, <code>EXPIRE rl:user7 60</code>. In production some users are permanently blocked. Find the bug and give two fixes, one with Lua and one without a script.</p>`,
  constraints: `Limit is 100/minute per user. App servers can crash or time out at any moment.`,
  example: `<p>INCR succeeds, server crashes, EXPIRE never runs → key lives forever → count passes 100 → ${H.c('r', 'user blocked permanently')}.</p>`,
  brute: `<p>Two separate commands are not atomic. Any failure between them leaves a key without a TTL, and the fixed counter never resets.</p>`,
  q: 'Which command sets a value and a TTL in one atomic step?', opts: ['SET key value EX 60', 'INCR then EXPIRE', 'GET then SET', 'EXPIRE then INCR'], why: 'SET with EX/PX is a single command; two separate commands can be interrupted between them.',
  hints: [`<p>What state is left behind if the process dies between the two calls?</p>`, `<p>Either run both operations inside one Lua script, or set the key with a TTL first so it can never be without one.</p>`, `<p>Alternative: put the window id in the key name (<code>rl:user7:{minute}</code>) and give it EXPIRE 120; stale keys die anyway.</p>`],
  approach: `<p><b>Bug:</b> INCR creates the key with no expiry; EXPIRE is a second network call. If the app crashes, loses its connection, or hits a timeout between them, the key persists forever and the counter only grows, so the user is blocked permanently. <b>Fix 1 (Lua, atomic):</b> <code>local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c</code>. Redis executes the whole script without interruption. <b>Fix 2 (no script):</b> include the window in the key (<code>rl:user7:28934511</code> where the number is epoch minute) and always call EXPIRE for 2 windows; even if EXPIRE is skipped once, the next window uses a different key, and a later request in the same window will set it again. Alternatively use <code>SET rl:user7 0 EX 60 NX</code> first (creates it with TTL only if missing) followed by INCR, which keeps the TTL because INCR does not change expiry. Also monitor with <code>SCAN</code> for rl:* keys with TTL -1.</p>`,
  complexity: `<p>O(1) per request, one round trip when using a script.</p>`,
  follow: ['How would you find existing keys without TTL?', 'How does a sliding window avoid the boundary burst?']
});

P({
  title: 'Redis Session Store with Sliding Expiry', level: 'Medium', tags: ['sessions', 'hash', 'ttl'], companies: ['Okta', 'Atlassian'],
  statement: `<p>Store login sessions in Redis. A session has userId, roles, and createdAt. It should expire after 30 minutes of inactivity, but no session may live longer than 12 hours. Describe the data model and what each request does. How do you log a user out everywhere?</p>`,
  constraints: `Session id is a random 128-bit value. 500,000 concurrent sessions. Do not store passwords.`,
  example: `<p>Request at minute 29 → TTL reset to 30 more minutes. Request at hour 12 → ${H.c('r', 'rejected even if active')} (absolute limit).</p>`,
  brute: `<p>Storing sessions in app memory breaks with multiple servers and logs everyone out on a deploy. A fixed TTL set once logs active users out in the middle of work.</p>`,
  q: 'Which gives a sliding expiry?', opts: ['Refresh the TTL with EXPIRE on each request', 'Set the TTL once at login', 'Use a list', 'Never expire'], why: 'Refreshing the TTL on activity pushes the expiry forward, while a one-time TTL is fixed.',
  hints: [`<p>A session has several fields and you may update only some, so which type?</p>`, `<p>Hash at <code>sess:{id}</code> with fields, EXPIRE 1800 on each request, and a createdAt field for the 12-hour cap.</p>`, `<p>For "log out everywhere" keep a set <code>user:{id}:sessions</code> of session ids and delete them all.</p>`],
  approach: `<p><b>Model.</b> Key <code>sess:{randomId}</code> is a hash with <code>userId</code>, <code>roles</code>, <code>createdAt</code>. At login: <code>HSET</code> the fields, <code>EXPIRE sess:{id} 1800</code>, and <code>SADD user:{userId}:sessions {id}</code>. <b>Each request:</b> <code>HGETALL</code> (or HMGET); if missing → 401. If <code>now - createdAt &gt; 12h</code> → delete and 401. Otherwise <code>EXPIRE sess:{id} 1800</code> (sliding inactivity timeout), batched in a pipeline with the read. <b>Logout:</b> <code>DEL sess:{id}</code> and <code>SREM</code> from the user's set. <b>Logout everywhere</b> (password change): <code>SMEMBERS user:{id}:sessions</code> then <code>UNLINK</code> each and delete the set; keep the set's own TTL of 12 h. <b>Security:</b> cookie flags HttpOnly, Secure, SameSite; rotate the session id on login and privilege change; never put secrets in the hash. <b>Memory:</b> 500,000 × ~300 bytes ≈ 150 MB. <b>Availability:</b> use replication; a Redis failure logs users out (acceptable) or falls back to JWT sessions if that is not acceptable.</p>`,
  complexity: `<p>O(1) per request (HGETALL on a tiny hash plus EXPIRE).</p>`,
  follow: ['Session store in Redis vs JWT: trade-offs?', 'How to avoid refreshing TTL on every single request?']
});

P({
  title: 'Stop Bots Asking for Non-Existent Products', level: 'Medium', tags: ['cache', 'penetration', 'bloom-filter'], companies: ['Amazon', 'Myntra'],
  statement: `<p>A bot requests <code>/products/{id}</code> for random ids that do not exist. Every request misses the cache and queries the database, which becomes slow for real users. Propose layered defences.</p>`,
  constraints: `Real product ids are numeric between 1 and 5,000,000. 50,000 bot requests/second at peak.`,
  example: `<p>Id 9,000,017 → cache miss → DB miss → ${H.c('r', 'nothing cached → repeat forever')}.</p>`,
  brute: `<p>Caching only successful lookups means "not found" is never remembered, so the database answers the same empty question endlessly. Increasing DB capacity just makes the attack more expensive for you.</p>`,
  q: 'What does negative caching do?', opts: ['Caches the "not found" result for a short time', 'Deletes valid keys', 'Disables TTL', 'Encrypts the cache'], why: 'Remembering "not found" briefly prevents repeated database lookups for the same missing id.',
  hints: [`<p>Stop the request as early as possible: validate, filter, then cache, then DB.</p>`, `<p>Range check, Bloom filter of valid ids, negative cache with a short TTL, rate limit per IP/API key.</p>`, `<p>Bloom filters have false positives but no false negatives; rebuild or update on product create.</p>`],
  approach: `<p>Layer the defences from cheapest to most expensive. (1) <b>Validate the input</b>: ids must be integers from 1 to 5,000,000; reject others with 400/404 before any I/O. (2) <b>Rate limit</b> per IP and per API key at the gateway (token bucket), plus a WAF/bot rule for obvious scanners. (3) <b>Bloom filter</b> of valid product ids kept in memory (5 million ids at 1% false positives ≈ 6 MB) or in Redis (RedisBloom): if the filter says "definitely not present", return 404 without touching Redis or DB; false positives (about 1%) fall through to the next layers. Add new ids to the filter on product creation and rebuild it nightly. (4) <b>Negative cache</b>: on a DB miss store a marker for the id for 30-60 seconds, so repeated attempts at the same missing id cost one Redis read. (5) Make sure a real new product becomes visible quickly: on create, delete any negative cache key for that id. (6) Monitor the miss rate and top offenders. The database now sees only the 1% false positives that survive the filter, and those are cached negatively afterwards.</p>`,
  complexity: `<p>Bloom filter check is O(k) hashes (k ≈ 7); the negative cache is one O(1) Redis lookup.</p>`,
  follow: ['What if ids are UUIDs so there is no valid range?', 'Why not cache "not found" for an hour?']
});

P({
  title: 'Unique Visitors: Set, Bitmap or HyperLogLog?', level: 'Medium', tags: ['redis', 'hyperloglog', 'capacity'], companies: ['Google', 'Meta'],
  statement: `<p>Count daily unique visitors for a site with 50 million visitors per day (user ids are integers up to 200 million, anonymous visitors have random UUID cookies). Compare SET, BITMAP and HyperLogLog by memory, accuracy and features, and pick one for (a) logged-in users where exact counts are needed, (b) the anonymous traffic dashboard.</p>`,
  constraints: `Memory matters. Dashboard error under 1% is fine. Billing needs exact counts for logged-in users.`,
  example: `<p>(a) bitmap: 200M bits = ${H.c('g', '25 MB')} exact. (b) HyperLogLog: ${H.c('g', '12 KB')} with about 0.81% error.</p>`,
  brute: `<p>A SET of 50 million UUID strings takes several gigabytes per day and every SADD allocates memory; it is exact but wasteful when approximate counts suffice.</p>`,
  q: 'Which structure estimates unique counts in about 12 KB?', opts: ['HyperLogLog', 'Sorted set', 'List', 'Hash'], why: 'HyperLogLog uses a fixed small memory (12 KB) and gives roughly 0.81% standard error.',
  hints: [`<p>Exact for dense integer ids: use one bit per possible id. Approximate for huge arbitrary ids: probabilistic counting.</p>`, `<p>SETBIT visitors:2026-10-15 userId 1 and BITCOUNT; PFADD uv:anon:2026-10-15 cookieId and PFCOUNT.</p>`, `<p>Merge days with BITOP OR / PFMERGE for weekly numbers; set EXPIRE on daily keys.</p>`],
  approach: `<p><b>Set:</b> exact for any id type, but about 50-100 bytes per member, so 50 million visitors ≈ 3-5 GB per day; supports membership checks and listing. <b>Bitmap:</b> one bit per integer id: 200 million ids = 25 MB per day, exact, very fast (<code>SETBIT</code>, <code>BITCOUNT</code>, <code>BITOP</code> for retention: users seen on both day 1 and day 7). It only works for dense integer ids. <b>HyperLogLog:</b> 12 KB per counter regardless of cardinality, standard error 0.81%, supports <code>PFADD</code>, <code>PFCOUNT</code>, and <code>PFMERGE</code> for unions, but cannot test membership or list members. <b>Choice:</b> (a) logged-in users, exact for billing → <b>bitmap</b> keyed by day (25 MB/day, set EXPIRE for 35 days, or move to the data warehouse monthly). (b) Anonymous cookie UUIDs on a dashboard where 1% error is fine → <b>HyperLogLog</b> per day (and per page if needed: 12 KB × 10,000 pages = 120 MB). Persist daily final numbers to the analytics database so Redis data loss only affects the current day.</p>`,
  complexity: `<p>SETBIT/PFADD O(1); BITCOUNT O(N/8 bytes) done once per report; PFCOUNT O(1) for one key.</p>`,
  follow: ['How would you compute weekly uniques from daily HLLs?', 'How do you handle users who log in mid-session after being anonymous?']
});

P({
  title: 'Delayed Jobs with a Sorted Set', level: 'Medium', tags: ['redis', 'sorted-set', 'scheduling'], companies: ['Uber', 'Shopify'],
  statement: `<p>Implement "send reminder in 24 hours" on Redis without a job library. Producers enqueue jobs with a run-at time; several workers poll and must never process the same job twice at the same time. Describe the commands, how a worker safely claims a job, and what happens if a worker crashes after claiming.</p>`,
  constraints: `1 million pending reminders, 5 workers polling every second, jobs must not be lost on worker crash.`,
  example: `<p><code>ZADD delayed 1760086400 job:77</code>. Worker at time 1760086401: due jobs = score ≤ now → claims job:77.</p>`,
  brute: `<p>Scanning all pending jobs on every poll is O(N), and a plain GET-then-DELETE claim lets two workers read the same job before either deletes it.</p>`,
  q: 'What should the sorted-set score be for a delayed-job queue?', opts: ['The time the job should run', 'The job name length', 'A random number', 'The worker id'], why: 'Ordering by run-at time lets workers fetch due jobs with ZRANGEBYSCORE up to the current time.',
  hints: [`<p>If the score is the run-at time, which command fetches everything that is due?</p>`, `<p>The claim must be atomic: a Lua script that finds a due job, removes it from the delayed set, and inserts it into an "in progress" set with a visibility deadline.</p>`, `<p>Add a sweeper that moves in-progress jobs whose deadline passed back to the delayed set (crash recovery) and make jobs idempotent.</p>`],
  approach: `<p><b>Enqueue:</b> <code>HSET job:77 payload ...</code> and <code>ZADD delayed {runAtEpoch} 77</code>. <b>Claim (atomic Lua):</b> <code>local ids = redis.call('ZRANGEBYSCORE', 'delayed', '-inf', ARGV[1], 'LIMIT', 0, 1); if #ids == 0 then return nil end; redis.call('ZREM', 'delayed', ids[1]); redis.call('ZADD', 'inflight', ARGV[2], ids[1]); return ids[1]</code> where ARGV[1] is now and ARGV[2] is now + 60 s (visibility deadline). Because it is a single script, two workers can never claim the same id. <b>Complete:</b> the worker runs the job and then <code>ZREM inflight id</code> and deletes the hash. <b>Crash recovery:</b> a sweeper (leader-locked, every few seconds) runs <code>ZRANGEBYSCORE inflight -inf now</code> and moves those ids back to <code>delayed</code> with score now (maybe incrementing an attempt counter and sending to a DLQ after N attempts). <b>Duplicates:</b> a slow worker whose deadline expired may finish after the job was re-run, so the job must be idempotent. <b>Scale:</b> ZRANGEBYSCORE with LIMIT is O(log N + 1); one million members is fine. For higher throughput shard by id hash across several keys. This is essentially what Sidekiq and BullMQ do internally.</p>`,
  code: { lang: 'text', code: `-- KEYS[1]=delayed  KEYS[2]=inflight  ARGV[1]=now  ARGV[2]=deadline\nlocal ids = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, 1)\nif #ids == 0 then return nil end\nredis.call('ZREM', KEYS[1], ids[1])\nredis.call('ZADD', KEYS[2], ARGV[2], ids[1])\nreturn ids[1]` },
  complexity: `<p>Enqueue and claim are O(log N); sweeper is O(log N + M) for M expired jobs.</p>`,
  follow: ['How would you add retries with backoff on top?', 'Redis Cluster: how do multi-key scripts behave?']
});

P({
  title: 'Invalidate Cached List and Search Pages', level: 'Hard', tags: ['cache', 'invalidation', 'versioned-keys'], companies: ['Amazon', 'eBay', 'Booking.com'],
  statement: `<p>An e-commerce site caches <code>/products?category=mugs&sort=price&page=2</code> and thousands of other filter combinations. Three services (admin UI, bulk importer, pricing engine) change products. Sellers complain that edits take up to an hour to appear. Design caching and invalidation so list pages are fresh within seconds without a stampede.</p>`,
  constraints: `10,000 distinct list keys at any time, 20 product changes per second at peak, bulk imports of 100,000 products, freshness target 10 seconds.`,
  example: `<p>Changing one mug's price must refresh every list that could include it: ${H.c('r', 'impossible to enumerate by key')}.</p>`,
  brute: `<p>Deleting individual list keys on each change requires knowing which of thousands of query keys contain the product, which is infeasible. A one-hour TTL is simple but stale; a 5-second TTL gives low hit ratio and many rebuilds.</p>`,
  q: 'What lets one operation invalidate all cached list pages of a category at once?', opts: ['A version number included in the key that is incremented on change', 'KEYS * then DEL', 'A longer TTL', 'Caching in the browser only'], why: 'Bumping a version makes all keys with the old version unreachable immediately; they expire later by TTL.',
  hints: [`<p>Instead of deleting many keys, change something that all of those keys depend on.</p>`, `<p>Key = <code>list:{category}:v{version}:{sort}:{page}</code>, version stored in Redis as <code>ver:category:mugs</code>.</p>`, `<p>Debounce bumps during bulk import (one bump at the end), single-flight rebuilds, jitter TTLs, and publish change events from all three writers through the same path.</p>`],
  approach: `<p><b>Keys.</b> Cache list responses under <code>list:{category}:v{N}:{sort}:{page}</code> where N is the current value of <code>ver:category:{category}</code> in Redis. A read first does <code>GET ver:category:mugs</code> (a tiny cached value, can be held in-process for 1-2 s) then <code>GET list:mugs:v{N}:...</code>. TTL for list entries: 5-10 minutes with jitter, as old versions are simply abandoned and expire by themselves. <b>Invalidation.</b> Any product change in that category does <code>INCR ver:category:mugs</code> (and for each category the product belongs to, plus a global version for search). Old keys become unreachable instantly. <b>Single path for writers.</b> Admin UI, importer and pricing engine all go through a product service, or each publishes <code>ProductChanged</code> events through an outbox to a topic; a small invalidation consumer bumps versions. This avoids three codebases each remembering to invalidate. <b>Bulk imports.</b> Do not bump per row: bump once per affected category at the end of the batch (or at most once per few seconds, debounced) so list pages are not rebuilt 100,000 times. <b>Stampede.</b> After a bump, popular pages all miss together; use single-flight locks per key, serve a stale previous version briefly (stale-while-revalidate: read v{N-1} if v{N} is not ready), and pre-warm the first page of top categories asynchronously. <b>Freshness.</b> Event delay is well under 10 seconds, satisfying the target; the TTL is a safety net if an event is lost. <b>Individual product pages</b> still use delete-on-write. <b>Monitoring.</b> hit ratio per list endpoint, version bump rate, rebuild latency.</p>`,
  complexity: `<p>Invalidation is O(1) per change (one INCR), regardless of how many list keys exist. Reads add one tiny extra lookup.</p>`,
  follow: ['What is the memory cost of abandoned old versions?', 'How would you serve search results (Elasticsearch) fresh within seconds?']
});

P({
  title: 'Exactly-Once Effect in an Order Pipeline', level: 'Hard', tags: ['outbox', 'inbox', 'idempotency', 'kafka'], companies: ['Amazon', 'Uber', 'Zalando'],
  statement: `<p>Order service saves an order and must publish <code>OrderPlaced</code> to Kafka. The inventory service consumes it and decrements stock. Today, crashes cause orders without events and stock decremented twice. Design the producer and consumer sides so each order decrements stock exactly once in effect.</p>`,
  constraints: `PostgreSQL in both services, Kafka between them. 1,000 orders/second. No distributed transactions across services.`,
  example: `<p>Crash after DB commit, before publish → ${H.c('r', 'event lost')}. Redelivery after consumer crash → ${H.c('r', 'stock decremented twice')}.</p>`,
  brute: `<p>Publishing inside the DB transaction before commit can announce an order that rolls back; publishing after commit can lose the event if the process dies between the two; a consumer that just subtracts on every delivery double-counts.</p>`,
  q: 'What does the transactional outbox pattern guarantee?', opts: ['An event is recorded atomically with the business change and published at least once later', 'Exactly-once delivery by Kafka alone', 'No duplicate events ever', 'No need for consumers to be idempotent'], why: 'Event and data commit together; a relay publishes it at least once, so consumers must still dedupe.',
  hints: [`<p>The two problems are different: losing an event (producer side) and applying it twice (consumer side).</p>`, `<p>Producer: write an <code>outbox</code> row in the same transaction as the order; a relay publishes rows and marks them sent. Consumer: processed-ids table (inbox) in the same transaction as the stock update.</p>`, `<p>Use the order id as the Kafka key (ordering per order), a stable event id, stock updates guarded by <code>WHERE qty &gt;= ?</code>, and a DLQ for events that cannot be applied.</p>`],
  approach: `<p><b>Producer side (outbox).</b> In the order service one local transaction inserts the order and an <code>outbox(id uuid, aggregate_id, type, payload, created_at, sent_at null)</code> row. A relay (a poller with <code>FOR UPDATE SKIP LOCKED</code>, or Debezium change-data-capture reading the WAL) publishes unsent rows to Kafka with key = orderId and the outbox id as the event id, then marks them sent. If the relay crashes after publishing but before marking, it republishes: the event may be duplicated but is never lost. Producer config: <code>acks=all</code>, idempotence on. <b>Consumer side (inbox).</b> The inventory consumer handles each event in one DB transaction: <code>INSERT INTO processed_events(event_id) ... ON CONFLICT DO NOTHING</code>; if 0 rows, skip and commit the offset; else <code>UPDATE stock SET qty = qty - :n WHERE sku = :sku AND qty &gt;= :n</code> and, if 0 rows updated, record an <code>OutOfStock</code> outcome event (another outbox row) instead of failing forever. Commit the DB transaction, then commit the Kafka offset (manual ack). A crash before the offset commit → redelivery → inbox conflict → skipped. <b>Ordering</b> is per order via the key, so events for one order apply in sequence. <b>Failures.</b> Permanent errors go to a retry topic then a DLQ with the event id; alerts on DLQ depth, outbox lag (oldest unsent row age) and consumer lag. <b>Cleanup:</b> delete sent outbox rows after a few days and inbox rows after the topic retention plus margin. End to end: at-least-once delivery plus idempotent consumption gives an exactly-once <i>effect</i>.</p>`,
  complexity: `<p>Each side adds one extra indexed insert per event; relay throughput scales with batch size and partitions.</p>`,
  follow: ['How would you handle an order cancellation arriving before the placement event is processed?', 'What are the pros and cons of Debezium vs a polling relay?']
});

P({
  title: 'Global Leaderboard Across Redis Shards', level: 'Hard', tags: ['sorted-set', 'sharding', 'leaderboard'], companies: ['Riot Games', 'Supercell', 'Dream11'],
  statement: `<p>A game has 300 million players and one global leaderboard that does not fit comfortably on one Redis node (about 30 GB of sorted-set data). Design the sharding, the writes, the "top 100", and "my global rank" queries, and say where you accept approximation.</p>`,
  constraints: `5,000 score updates/second, 20,000 reads/second, top 100 must be exact within 5 seconds, my-rank may be approximate.`,
  example: `<p>Top 100 = merge of each shard's top 100 → ${H.c('g', 'exact')}. My exact rank would need counts from every shard.</p>`,
  brute: `<p>One giant sorted set on one node is a memory and failover risk (and a single hot shard); sharding by player id makes rank queries need a scatter-gather across all shards.</p>`,
  q: 'For an exact top-100 across S shards, how many entries must each shard return?', opts: ['Its own top 100', 'Only its top 1', 'All members', 'Nothing; Redis merges them'], why: 'The global top 100 must lie within the union of each shard top 100, so merging those lists is enough.',
  hints: [`<p>Partition by player-id hash, so each player's score lives in exactly one shard.</p>`, `<p>Top-N: ask every shard for its top N and merge. Rank: sum of counts of members with a greater score in all shards (ZCOUNT).</p>`, `<p>Cache the merged top 100 for 1-5 s, use score buckets / sampling for approximate rank on huge boards, and keep the database as the source of truth.</p>`],
  approach: `<p><b>Sharding.</b> Use 16 independent sorted sets <code>lb:global:{0..15}</code> on a Redis Cluster (or 16 key slots), shard = hash(playerId) mod 16. A player's score lives in exactly one shard, so <code>ZINCRBY</code> stays O(log N) and atomic. 300M members become ~19M per shard (~2 GB each). <b>Top 100.</b> A background aggregator (or the read path with a short cache) runs <code>ZREVRANGE lb:global:i 0 99 WITHSCORES</code> on all 16 shards in parallel, merges 1,600 entries in memory, takes the top 100, and stores the result in <code>lb:top100</code> with a 2-5 s TTL (single-flight rebuild). This is exact because any global top-100 member is necessarily in its own shard's top 100. 20,000 reads per second are served from the cached key. <b>My global rank.</b> Exact: local rank in my shard doesn't help; compute <code>sum over shards of ZCOUNT lb:global:i (myScore +inf</code> (exclusive), 16 parallel calls of O(log N) each, ~2 ms total; fine at moderate QPS and cacheable per player for several seconds. At 20,000 req/s that is 320,000 ZCOUNTs per second, which is heavy, so for most users return an <b>approximate</b> rank: maintain a coarse histogram (e.g. counts per score bucket updated by a stream job) and interpolate; show exact ranks only for the top 10,000 (from the merged list) and "top 12%" elsewhere. <b>Writes.</b> Score events arrive through a queue (idempotent consumer, dedup by match id) which updates the shard and the database. <b>Failures and rebuild.</b> Each shard has a replica; if lost, rebuild from the <code>player_scores</code> table in bulk with pipelines. <b>Alternative:</b> range-partition by score so ranks are the sum of counts of higher ranges, but hot ranges develop and rebalancing is complex.</p>`,
  complexity: `<p>Writes O(log N). Top 100: 16 parallel O(log N + 100) calls then a 1,600-element merge, amortised by caching. Exact rank: 16 ZCOUNT calls O(log N) each.</p>`,
  follow: ['How would you add friends-only leaderboards?', 'How do you handle ties fairly across shards?']
});

P({
  title: 'Design a Reliable Background Job Platform', level: 'Hard', tags: ['queues', 'retries', 'dlq', 'scheduling', 'design'], companies: ['Shopify', 'Atlassian', 'Stripe'],
  statement: `<p>Design the internal job platform used by 40 teams: enqueue a job from any service, run it with retries and backoff, delayed and recurring (cron) jobs, per-team rate limits, dead-lettering and visibility into failures. State the broker choice, message contract, worker behaviour, scheduling without double runs, and the operational metrics.</p>`,
  constraints: `20 million jobs/day, bursts of 10× for 10 minutes, job runtime from 100 ms to 15 minutes, at-least-once is acceptable.`,
  example: `<p>Job: <code>{id, type: "invoice.generate", payload, attempt, maxAttempts, runAt, idempotencyKey, traceId}</code>.</p>`,
  brute: `<p>Each team builds its own cron + @Async code: no durability, no retries, duplicate runs when scaled out, no central view of failures, and one team's flood can starve everyone.</p>`,
  q: 'Which signal best shows a job platform is falling behind?', opts: ['Age of the oldest waiting job', 'CPU of the API gateway', 'Number of teams', 'Total jobs ever enqueued'], why: 'Oldest message age directly measures how long work waits, regardless of volume.',
  hints: [`<p>Start from the contract: a job is a small durable message with an id, type, payload reference, attempt count, and idempotency key.</p>`, `<p>Queue per job type or priority (SQS/RabbitMQ), retry via delayed re-enqueue with exponential backoff + jitter, DLQ after maxAttempts, scheduler that only enqueues.</p>`, `<p>Isolation: per-team concurrency and rate limits, separate queues for slow jobs, visibility-timeout heartbeat for long jobs, dashboards and alerts for age and DLQ.</p>`],
  approach: `<p><b>Broker.</b> SQS (or RabbitMQ quorum queues) with one queue per priority/type group; Kafka is unnecessary because jobs are tasks, not a replayable stream. Large payloads go to object storage and the message carries a pointer. <b>Contract.</b> JSON with <code>jobId, type, version, payloadRef, attempt, maxAttempts, runAt, idempotencyKey, team, traceId</code>. <b>Enqueue API.</b> Services call a thin client library that validates the schema, applies the producer's rate limit, and writes via the outbox when called inside a transaction. <b>Workers.</b> Autoscaled per queue on queue depth and oldest-message age. They long-poll, run the handler with a per-type timeout, extend the visibility timeout with a heartbeat for long jobs, and delete only after success. Handlers must be idempotent; the library offers an inbox helper keyed by <code>idempotencyKey</code>. <b>Retries.</b> Errors are classified: retryable exceptions re-enqueue with delay = full-jitter exponential backoff (via message delay or visibility change) and <code>attempt+1</code>; non-retryable errors go straight to the DLQ; after <code>maxAttempts</code> go to the per-type DLQ with the error history. A redrive tool in the UI re-enqueues selected DLQ jobs after a fix. <b>Delayed and recurring.</b> Delayed jobs use a scheduled-jobs store (DB table or sorted set) with a poller that enqueues jobs when due; recurring jobs are defined in config and a single leader (lease lock, or Kubernetes CronJob / EventBridge) enqueues one job per tick with a deterministic id like <code>invoice.nightly:2026-10-15</code> so a duplicate trigger is rejected by the inbox. <b>Fairness.</b> Per-team token buckets on enqueue and max concurrency per team, plus separate queues for slow (&gt;1 min) jobs so they cannot block fast ones. <b>Observability.</b> Metrics per queue/type/team: enqueue rate, processing rate, success/failure, retries, DLQ size, runtime p50/p99, oldest-message age; traces linking enqueue to execution; alerts on age above SLO, DLQ growth, and "recurring job did not run". <b>Safety.</b> Per-type kill switch to pause consumption, poison-message protection (timeouts, memory limits), PII redaction in logs, secrets from the platform not from payloads.</p>`,
  complexity: `<p>Throughput scales linearly with workers (20M/day ≈ 230/s average, ~2,300/s at burst); SQS and typical DBs handle this comfortably.</p>`,
  follow: ['How would you support job priorities without starvation?', 'How would you migrate a team from cron on a VM to this platform safely?']
});

P({
  title: 'Cross-Service Cache Consistency After a Price Change', level: 'Hard', tags: ['cache', 'events', 'cdc', 'consistency'], companies: ['Walmart', 'Zalando', 'Instacart'],
  statement: `<p>The catalog service owns prices. The search, recommendation and cart services each keep their own Redis cache of product data. After a price change, the cart still shows the old price for several minutes and once charged a customer the old price. Design the propagation of changes so caches converge quickly, and ensure that checkout always charges the correct price.</p>`,
  constraints: `4 consumers of price data, price changes 50/second, acceptable staleness for browsing 10 seconds, none for charging.`,
  example: `<p>Price 10 → 12 at 12:00:00. Search page at 12:00:05 may still show 10 (${H.c('y', 'ok')}); checkout at 12:00:05 must charge 12 (${H.c('r', 'required')}).</p>`,
  brute: `<p>Each service polls the catalog every few minutes or relies on TTL: long staleness, extra load, and checkout may trust a cached price. Services calling each other to delete keys creates tight coupling and lost invalidations.</p>`,
  q: 'How should checkout get the price it charges?', opts: ['Read the authoritative price (or a versioned price quote) at order time', 'From any service cache', 'From the browser', 'From the last email sent'], why: 'Money-critical reads should use the source of truth or a signed/versioned quote, not an eventually consistent cache.',
  hints: [`<p>Separate "display price" (can be a little stale) from "charge price" (must be exact).</p>`, `<p>Catalog writes the price and an outbox event in one transaction; a topic fans it out; each consumer evicts or updates its own cache keyed with a version.</p>`, `<p>Include a version in events and cached values; apply only newer versions; checkout re-validates against the catalog and rejects with "price changed" if the cart price is stale.</p>`],
  approach: `<p><b>Display path (eventual, seconds).</b> Catalog service updates the price and inserts a <code>PriceChanged{sku, price, version}</code> row into its outbox in the same transaction. A relay (Debezium CDC or poller) publishes to the topic <code>catalog.price</code> keyed by sku. Search, recommendations and cart each run a consumer in their own consumer group which either deletes <code>product:{sku}</code> from their Redis or, better, writes the new value only if <code>event.version &gt; cached.version</code> (a small Lua script) so out-of-order or duplicated events cannot regress the cache. Each service keeps a TTL (5-10 minutes with jitter) as a safety net for lost events, and consumers are idempotent. Typical lag is under a second; the 10 s target is easily met and measurable through "event time vs applied time". <b>Charge path (strict).</b> Cart shows a price but checkout never trusts it. At order placement the order service calls the catalog (or a price service) for the authoritative price for each sku and compares with the cart's <code>priceVersion</code>. If it differs, respond "price changed, please confirm"; otherwise charge using the authoritative price and store it on the order line. The quote may also be a signed short-lived token issued by the catalog (price + version + expiry) that checkout verifies without a network call. <b>Resilience.</b> If the catalog is unreachable, checkout fails safe (do not charge) rather than use a cache. DLQ and alerts for failing invalidation consumers; consumer lag metric per service. <b>Why not direct calls?</b> The producer should not know who caches its data; the topic lets new consumers appear without catalog changes and allows replay to rebuild a cache.</p>`,
  complexity: `<p>One event per price change fans out to 4 consumers: 200 cache updates/s total, trivial for Kafka and Redis.</p>`,
  follow: ['What if a consumer misses events for an hour?', 'How would you test that no service regresses to an older price?']
});
function Q(q, options, answer, explain) { quiz.push({ q: q, options: options, answer: answer, explain: explain }); }
Q('In cache-aside, what is the safest order when a product is updated?', ['Update the database, commit, then delete the cache key', 'Delete the cache key, then update the database', 'Update the cache only', 'Update both at the same time without ordering'], 0, 'DB first then delete after commit avoids a reader re-caching the old row while the write is still in flight.');
Q('Which Redis type is the natural fit for a leaderboard?', ['Sorted set', 'List', 'Plain string', 'Set'], 0, 'A sorted set keeps members ordered by score and supports ZINCRBY, ZREVRANGE and ZREVRANK.');
Q('What is a cache stampede?', ['Many requests rebuild the same expired hot key at once and overload the database', 'Redis running out of disk', 'A key without a TTL', 'A slow network'], 0, 'When a hot key expires, all concurrent misses go to the database together. Fix with single-flight locks, jitter or refresh-ahead.');
Q('A fixed-window rate limiter allows "3 per 10 s". How many requests can pass in 6 seconds around a window boundary?', ['Up to 6', 'Never more than 3', 'Exactly 3', 'Up to 10'], 0, 'Three at the end of one window and three at the start of the next gives 6 in a few seconds (the boundary burst).');
Q('Why should a distributed lock be released with a compare-and-delete script?', ['So you never delete a lock that expired and was taken by someone else', 'Because DEL is slow', 'Because Redis cannot delete keys', 'To renew the TTL'], 0, 'If your lock expired and another worker acquired it, a plain DEL would remove their lock. Checking the token and deleting must be atomic.');
Q('What protects a resource from a stale lock holder that woke up after its lease expired?', ['A fencing token checked by the resource', 'A longer TTL only', 'Retrying the lock', 'Using GET before SET'], 0, 'The resource rejects writes with a token lower than the highest it has seen, so the late writer is refused.');
Q('Which delivery guarantee does "ack after processing" give?', ['At-least-once', 'At-most-once', 'Exactly-once', 'Ordered-once'], 0, 'A crash before the ack makes the broker redeliver: nothing is lost, but duplicates are possible.');
Q('In Kafka, which setting of the message determines the partition (and therefore ordering scope)?', ['The message key', 'The consumer name', 'The topic retention', 'The offset'], 0, 'The key is hashed to choose the partition; the same key always lands in the same partition, preserving order for that key.');
Q('SQS visibility timeout is 30 seconds but a job takes 90 seconds. What happens?', ['The message becomes visible again and another worker may process it too', 'The message is deleted', 'SQS extends the timeout automatically', 'The job is moved to the DLQ immediately'], 0, 'After 30 s the message reappears while the first worker is still running, creating duplicates. Extend the timeout or use a heartbeat.');
Q('Why add jitter to exponential backoff?', ['To spread retries and avoid synchronised retry storms', 'To make retries faster', 'To remove the cap', 'To guarantee success'], 0, 'Randomising the delay stops all failed clients from retrying at the same instant.');
Q('Which error should normally NOT be retried?', ['HTTP 400 validation error', 'HTTP 503', 'Connection timeout', 'HTTP 429 with Retry-After'], 0, 'A validation error will fail again with the same input; send it to the DLQ. The others are transient.');
Q('The best place to store the processed-message id for an idempotent payment consumer is:', ['In the same database transaction as the balance update', 'In the worker memory', 'In a Redis set after the DB commit', 'In the log file'], 0, 'The dedup record and the effect must commit atomically; otherwise a crash between them causes loss or duplication.');
Q('Your app runs on 5 pods with an @Scheduled nightly job. What do you get without extra coordination?', ['The job runs 5 times', 'The job runs once', 'The job never runs', 'Spring picks a leader automatically'], 0, 'Each pod has its own timer. Use ShedLock, a leader lock, or a Kubernetes CronJob.');
Q('Why must a Redis lock key always have a TTL?', ['A crashed holder would otherwise block everyone forever', 'TTL makes the lock faster', 'Redis requires it', 'It prevents duplicate messages'], 0, 'The TTL is the lease; it lets the lock free itself if the holder dies.');
Q('A key "rl:user7" is created by INCR and EXPIRE is a separate call. What is the risk?', ['A crash between them leaves a key that never expires', 'INCR fails on new keys', 'EXPIRE deletes the value', 'There is no risk'], 0, 'The two steps are not atomic; use a Lua script or window-specific keys.');
function I(q, level, a, followUps) { interview.push({ q: q, level: level, a: a, followUps: followUps }); }
I('Explain the cache-aside pattern and how you would invalidate on writes.', 'B', `<p>Cache-aside means the application owns the cache logic. On read: check the cache; on a miss read the database, store the result with a TTL, and return it. On write: update the database and, after the transaction commits, delete the cache key so the next read reloads fresh data. I delete rather than overwrite because a delete can never store a wrong value, while two concurrent writers updating the cache can leave the older value behind. The TTL is a safety net for missed deletes. I would also measure hit ratio, and make the app fall back to the database if the cache is down.</p>`, ['Why delete after commit rather than before?', 'When would write-through be better?']);
I('Which Redis data structure would you use for a leaderboard, and which commands?', 'B', `<p>A sorted set. <code>ZINCRBY lb 50 player</code> adds points atomically, <code>ZREVRANGE lb 0 9 WITHSCORES</code> returns the top 10, <code>ZREVRANK lb player</code> gives the player's rank (0-based, so add 1 for display) and <code>ZSCORE</code> the score. Lookups are O(log N) because Redis uses a skip list plus a hash table. I would use one key per period (daily, weekly) with an EXPIRE, handle ties with a fractional time component in the score if "first to reach" matters, and keep the database as source of truth so the board can be rebuilt after a Redis loss.</p>`, ['How do you show the players just above and below me?', 'How would you shard it for 300 million players?']);
I('What are cache penetration, stampede and avalanche, and how do you fight each?', 'I', `<p><b>Penetration</b>: requests for keys that do not exist always hit the database; use input validation, negative caching with a short TTL, a Bloom filter, and rate limits. <b>Stampede</b> (thundering herd): a hot key expires and many requests rebuild it at once; use a per-key rebuild lock or single-flight, stale-while-revalidate, probabilistic early refresh and TTL jitter. <b>Avalanche</b>: many keys expire together or the cache goes down, flooding the database; use jittered TTLs, replicas or a cluster, circuit breakers and database connection limits so a cold cache cannot crash the DB.</p>`, ['Which would you monitor first?', 'How do stale-while-revalidate and a lock differ?']);
I('How do you implement a rate limiter with Redis that works across many servers?', 'I', `<p>Keep the counters in Redis so all servers share them. The simplest is a fixed window: <code>INCR rl:client:window</code> plus <code>EXPIRE</code> on the first hit, done atomically in a Lua script. It allows up to 2× the limit at a window boundary, so for stricter control use a sliding window log (sorted set of timestamps with ZREMRANGEBYSCORE, ZCARD, ZADD in a script) or a token bucket (hash of tokens and last refill time updated in a Lua script). Return 429 with Retry-After, choose a stable client key (API key or user id), decide fail-open versus fail-closed when Redis is down, and use Redis TIME rather than app clocks.</p>`, ['Why must INCR and EXPIRE be atomic?', 'What does a token bucket allow that a fixed window does not?']);
I('Are Redis distributed locks safe? What can go wrong?', 'A', `<p>A single-instance lock with <code>SET key token NX PX ttl</code> and a compare-and-delete release is fine for efficiency locks (avoid duplicated work). It is not safe for correctness on its own: the lease can expire while the holder is paused (GC, slow call), letting a second holder in; replication is asynchronous so a failover can lose the lock; clocks can jump. Mitigations are renewing the lease, keeping critical sections short, fencing tokens checked by the protected resource, and, best, backing the operation with a database unique constraint, optimistic version check or an idempotency key. Redlock narrows the failover problem but is debated because it still depends on timing assumptions. For hard guarantees use a consensus system or the database.</p>`, ['What is a fencing token?', 'When would you use pg_advisory_lock instead?']);
I('Compare RabbitMQ, Kafka and SQS. When would you choose each?', 'I', `<p>RabbitMQ is a smart broker with exchanges and routing; messages are removed on ack; great for task queues and flexible routing. Kafka is a distributed append-only log with partitions and consumer groups; messages stay for a retention period and can be replayed; ordering is per partition; best for event streams, high throughput and many independent consumers. SQS is a fully managed queue: simple, scales automatically, visibility timeout and DLQ built in, standard queues are at-least-once and unordered, FIFO queues give ordering per group at lower throughput. For simple background jobs on AWS I choose SQS, for rich routing RabbitMQ, for an event backbone with replay Kafka.</p>`, ['What does the consumer offset do in Kafka?', 'How does a SQS FIFO queue deduplicate?']);
I('What delivery guarantees do message brokers give, and what does "exactly-once" really mean?', 'A', `<p>At-most-once (ack before processing; can lose), at-least-once (ack after processing; can duplicate), and exactly-once. True exactly-once delivery over a network with side effects is not achievable in general. Kafka offers exactly-once semantics within Kafka (idempotent producer plus transactions), but once the consumer writes to a database or calls an external API you are outside that boundary. In practice I use at-least-once delivery plus idempotent processing, which gives an exactly-once effect: a processed-ids table committed in the same transaction as the change, natural idempotency, or idempotency keys to downstream APIs.</p>`, ['Where do duplicates come from?', 'What is the inbox/outbox pattern?']);
I('How would you make a payment consumer idempotent?', 'I', `<p>Give every message a stable unique id created by the producer. In the consumer, in one database transaction: insert the id into a <code>processed_messages</code> table with a primary key; if the insert conflicts, the message was already handled so skip and ack; otherwise apply the business change (guarded, e.g. <code>WHERE balance &gt;= amount</code>), commit, then ack the broker. Concurrent consumers are serialised by the primary key; a crash before commit leaves nothing; a crash after commit but before ack just causes a harmless redelivery. For calls to external providers pass the id as the idempotency key. Clean up old rows after the maximum redelivery window.</p>`, ['Why not use a Redis set for dedup?', 'How would out-of-order messages affect this?']);
I('Describe a good retry policy with backoff and a dead-letter queue.', 'I', `<p>Classify errors: retry transient ones (timeouts, 5xx, 429) and never retry permanent ones (validation, 4xx). Retry with exponential backoff, a cap, and full jitter so clients do not retry in sync, schedule the delay (visibility timeout, delay queue, retry topic) instead of sleeping in a worker, and limit attempts and total time. After the maximum the message goes to a dead-letter queue with the error history. The DLQ is monitored and alerting; engineers fix the cause and redrive. All handlers must be idempotent, and there should be a circuit breaker so retries do not hammer a dependency that is clearly down.</p>`, ['What is a retry storm?', 'How do you avoid retry amplification across layers?']);
I('How do you prevent a scheduled job from running on every instance of a scaled-out service?', 'I', `<p>Options: move the schedule out of the app (Kubernetes CronJob, EventBridge Scheduler) so the platform triggers one run, which often just enqueues a message; use a lock per run (ShedLock with a DB table or Redis <code>SET NX PX</code>) so only one instance executes; use leader election with a renewed lease; or claim work through the database with <code>SELECT ... FOR UPDATE SKIP LOCKED</code>. Whatever I pick, I give locks an expiry, set an overlap policy, make the job idempotent with a run key such as the date, run in UTC, and alert if the job did not run.</p>`, ['What happens if the lock holder crashes mid-run?', 'What is lockAtLeastFor useful for?']);
I('Why not just use @Async or an in-memory queue for background work?', 'B', `<p>In-memory queues and <code>@Async</code> run on threads in the same process. If the process restarts or crashes the queued work disappears, there are no retries, no visibility, and they cannot be scaled independently of the web tier. Durable brokers or job libraries persist work, support retries, acks, DLQs, rate control and horizontal scaling. @Async is fine for best-effort tasks such as writing a debug log, but not for emails, invoices or payments.</p>`, ['How do you apply backpressure?', 'What is a bounded queue?']);
I('How would you cache a paginated search or list endpoint and keep it fresh?', 'A', `<p>You cannot enumerate every list key to delete it after a change, so I put a version into the key (<code>list:mugs:v12:page2</code>) and increment the version counter when anything in that scope changes; old keys become unreachable and expire by TTL. I use short jittered TTLs, single-flight rebuilds, and debounce version bumps during bulk imports. Writers publish change events (via an outbox) to one invalidation consumer so no writer can forget. For search I would also consider an index like Elasticsearch fed by the same events, and I would accept a few seconds of staleness for browsing while strict flows read the source of truth.</p>`, ['What is the cost of abandoned versions?', 'What if the version counter itself is lost?']);
I('What happens if Redis goes down in your cache-aside design? How do you design for it?', 'I', `<p>The cache is an optimisation, so the app must keep working from the database. I wrap Redis calls with short timeouts and a circuit breaker so a sick cache does not slow every request, fall back to the database, and limit database load with connection pools, rate limits and request coalescing so a cold cache cannot flatten it. Rate limiters usually fail open; security counters might fail closed or fall back to a local limiter. Run Redis with replicas and automatic failover (Sentinel or Cluster), warm hot keys after recovery, and alert on error rate and hit ratio.</p>`, ['How do you warm a cold cache safely?', 'Sentinel versus Cluster?']);
I('Explain the transactional outbox pattern and why it is needed with queues.', 'A', `<p>Updating a database and publishing a message are two systems, and without a distributed transaction a crash between them loses the event or announces something that rolled back. With the outbox pattern the service writes an event row into an <code>outbox</code> table in the same local transaction as the business change. A separate relay (a polling job using SKIP LOCKED or change-data-capture like Debezium) publishes the rows to the broker and marks them sent. The event is never lost, but it may be published more than once, so consumers use the inbox pattern (processed-ids) to be idempotent. Together they give an exactly-once effect without distributed transactions.</p>`, ['What are the drawbacks of a polling relay?', 'How do you keep the outbox table from growing forever?']);
I('Your queue depth keeps growing in production. How do you investigate and respond?', 'A', `<p>First look at the shape: is the oldest message age growing, or only depth? Check consumer count and health, processing time per message, error and retry rates, and whether a poison message is blocking a partition or being redelivered in a loop. Compare enqueue rate with processing rate. Remedies: scale out workers (up to the partition count in Kafka), fix a slow dependency, raise or lower prefetch, separate slow jobs into their own queue, apply rate limiting or shed low-priority work at the producer, move failing messages to a DLQ, and add alerts on message age. Afterwards, add capacity planning and autoscaling on queue age so the same burst does not become an incident.</p>`, ['Why is message age better than queue depth?', 'How does Kafka consumer lag relate?']);
registerModule({
  id: 'be09',
  title: 'Caching & Asynchronous Processing',
  intro: `<p>Fast backends do two things well: they <b>remember answers</b> (caching) and they <b>do slow work later</b> (queues and background jobs). This module teaches both from first principles to production habits: Redis data structures, cache-aside with TTL, invalidation and its classic failures, leaderboards and rate limiters, distributed locks and their caveats, RabbitMQ / Kafka / SQS from code, retries with backoff and dead-letter queues, idempotent consumers, and scheduled jobs that must not run twice.</p><p>Every topic starts with an everyday analogy, has a step-by-step visualiser, runnable models you can try in the browser, and a deep dive for senior interviews.</p>`,
  goals: [
    'Pick the right Redis structure (string, hash, list, set, sorted set) from an access pattern and write the commands',
    'Build a cache-aside endpoint with TTL, delete-on-write, hit/miss metrics, and defences against stampede and penetration',
    'Implement a sorted-set leaderboard and an atomic Redis rate limiter, and explain exactly where distributed locks break',
    'Move slow work (emails, payments) onto RabbitMQ / Kafka / SQS with correct ack timing, and know the delivery guarantees',
    'Design retries with exponential backoff, jitter and a monitored DLQ, and make consumers idempotent with a processed-ids table',
    'Run scheduled jobs once per tick across many instances using locks, leader election or a platform CronJob'
  ],
  prereqs: `Backend track modules 1-8 (REST APIs, databases from code, Data Access Patterns including transactions) and basic Java or JavaScript. Helpful: HLD "Caching" and "Message Queues" modules.`,
  hours: 14,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
