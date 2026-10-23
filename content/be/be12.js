(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for visualizers ---------- */
  function cp(o) { return JSON.parse(JSON.stringify(o)); }
  function nums(s, min, max, what) {
    var a = String(s).trim().split(/[\s,]+/).filter(function (x) { return x !== ''; }).map(Number);
    if (a.length < min || a.some(function (x) { return isNaN(x); })) throw new Error('Enter ' + what + ' as numbers separated by spaces');
    if (a.length > max) throw new Error('Use at most ' + max + ' numbers');
    return a;
  }
  function pctile(sorted, p) { // nearest-rank percentile on an ascending array
    var idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
  }

  /* ================= TOPIC 1: profiling ================= */
  topics.push({
    title: 'Profiling: CPU, Heap and Flame Graphs',
    analogy: `<p>Imagine a restaurant kitchen that is "slow". You could guess ("the chef is lazy!") or you could stand in the doorway and take a photo every second for ten minutes. After 600 photos you stack them up: 360 photos show someone peeling garlic by hand. <b>That is a CPU profile.</b> You do not need to be clever - you just look at where the time actually goes. A <b>flame graph</b> is those 600 photos drawn as one picture: the wider a block, the more photos it appears in.</p>`,
    explain: `<p>🟢 <b>The golden rule: measure, do not guess.</b> Most developers guess the slow part wrong. A profiler is a tool that watches your running program and tells you where time (CPU) or memory (heap) goes.</p>
      <p><b>Sampling profiler.</b> About 100 times per second it pauses the program for a moment and writes down the <i>call stack</i> (who called who, right now). After 30 seconds you have 3,000 stacks. Frames that show up in many stacks are where time is spent. Overhead is tiny (1-3%), so you can even do it in production.</p>
      <p><b>Flame graph.</b> Merge identical stacks, then draw: <b>width = share of samples</b>, <b>height = call depth</b> (callers at the bottom, callees on top). You hunt for a <b>wide plateau at the top</b> - a function that is wide and has nothing above it burns CPU itself. That is the hot frame.</p>
      ${H.table(['Frame (top of stack)', 'Samples', 'Share', 'Verdict'], [['regex.matches()', '600', '60%', '<span class="c-r">HOT - fix this first</span>'], ['db.query()', '150', '15%', 'mostly waiting, not CPU'], ['json.parse()', '100', '10%', 'ok'], ['everything else', '150', '15%', 'ok']])}
      <p>🔵 <b>Kinds of profiling.</b></p>
      <ul><li><b>CPU profile</b> - who is running on a core? (async-profiler, JFR, perf, py-spy, Node <code>--cpu-prof</code>).</li>
      <li><b>Wall-clock profile</b> - who is <i>waiting</i> too (locks, sleeps, network)? A request that takes 2 s but only 20 ms of CPU needs this one.</li>
      <li><b>Allocation profile</b> - who creates the most objects? Lots of garbage = lots of GC work.</li>
      <li><b>Heap profile / heap dump</b> - what is alive right now and who holds it? Needed for memory leaks.</li></ul>
      <p><b>Amdahl's law in one line:</b> if a part is 5% of total time, making it infinitely fast improves the whole thing by only 5%. Always attack the widest block first.</p>`,
    clues: ['"The service is slow but CPU is only 20%" → wall-clock profile / waiting on I/O or locks, not CPU', '"CPU at 100% on every core" → CPU flame graph, look for a wide plateau', '"Heap grows until OutOfMemoryError" → heap dump, find the GC root holding the objects', '"Latency spikes every few minutes" → GC logs / allocation profile, look for long pauses', '"How would you find the bottleneck?" → measure first (profile), change one thing, measure again', '"It got slower after the release" → differential flame graph between two versions']
    ,
    code: [
      { lang: 'bash', title: 'JFR and async-profiler cheat sheet (commands, run on your own machine)', check: false, code: `# 1) Java Flight Recorder: built into the JDK, safe for production
jcmd <pid> JFR.start name=perf duration=60s filename=/tmp/perf.jfr settings=profile
jfr print --events jdk.ExecutionSample /tmp/perf.jfr | head -50
# open /tmp/perf.jfr in JDK Mission Control for a flame graph

# 2) async-profiler: 30 seconds of CPU samples straight to an HTML flame graph
./asprof -d 30 -e cpu -f /tmp/cpu.html <pid>
./asprof -d 30 -e wall -f /tmp/wall.html <pid>    # wall-clock: shows waiting too
./asprof -d 30 -e alloc -f /tmp/alloc.html <pid>  # who allocates most

# 3) Quick looks
jstack <pid> | head -60          # thread dump: what is every thread doing NOW?
jcmd <pid> GC.heap_info          # heap sizes
jcmd <pid> GC.heap_dump /tmp/heap.hprof   # full heap dump for leaks (pauses the app!)` },
      `import java.util.*;

/** A toy sampling profiler: every 10 ms look at the main thread's stack and count the top frame. */
class MiniSampler {
    static volatile boolean busy = true;

    // Deliberately wasteful: builds a string with += in a loop (O(n^2) copying).
    static String slowJoin(int n) {
        String s = "";
        for (int i = 0; i < n; i++) s += i;
        return s;
    }

    // Better: StringBuilder appends in amortised O(1).
    static String fastJoin(int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(i);
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        Thread worker = new Thread(() -> {
            while (busy) {
                slowJoin(4000);
                fastJoin(4000);
            }
        }, "worker");
        worker.start();

        Map<String, Integer> counts = new HashMap<>();
        int total = 0;
        for (int i = 0; i < 100; i++) {          // 100 samples, 10 ms apart
            Thread.sleep(10);
            StackTraceElement[] st = worker.getStackTrace();
            if (st.length > 0) {
                String top = st[0].getMethodName();
                counts.merge(top, 1, Integer::sum);
                total++;
            }
        }
        busy = false;
        worker.join();

        // Print the "flat profile": hottest frames first.
        List<Map.Entry<String, Integer>> rows = new ArrayList<>(counts.entrySet());
        rows.sort((a, b) -> b.getValue() - a.getValue());
        for (Map.Entry<String, Integer> e : rows) {
            System.out.printf("%-12s %3d samples (%d%%)%n", e.getKey(), e.getValue(), 100 * e.getValue() / total);
        }
    }
}` ],
    codeTitle: ['Commands: JFR, async-profiler, jstack, heap dump', 'Java: a tiny sampling profiler (what real profilers do, 100 lines smaller)'],
    viz: [{
      title: 'Build a flame graph from stack samples',
      input: 'handle>parse:10 handle>validate:5 handle>db>query:15 handle>render>regex:60 handle>render>template:10',
      inputLabel: 'Stacks as frame>frame>frame:samples (space separated)',
      gen: function (input) {
        var toks = String(input).trim().split(/\s+/).filter(Boolean);
        if (!toks.length || toks.length > 12) throw new Error('Give 1-12 stacks like handle>db>query:15');
        var stacks = toks.map(function (t) {
          var m = /^([^:]+):(\d+)$/.exec(t);
          if (!m) throw new Error('Each stack looks like a>b>c:30');
          return { path: m[1].split('>'), n: Number(m[2]) };
        });
        var nodes = {}, order = [], total = 0;
        stacks.forEach(function (s) {
          total += s.n;
          for (var d = 0; d < s.path.length; d++) {
            var key = s.path.slice(0, d + 1).join('>');
            if (!nodes[key]) { nodes[key] = { key: key, name: s.path[d], depth: d, total: 0, self: 0 }; order.push(key); }
            nodes[key].total += s.n;
            if (d === s.path.length - 1) nodes[key].self += s.n;
          }
        });
        var hot = order[0];
        order.forEach(function (k) { if (nodes[k].self > nodes[hot].self) hot = k; });
        var maxD = 0; order.forEach(function (k) { if (nodes[k].depth > maxD) maxD = nodes[k].depth; });
        var frames = [];
        frames.push({ narr: 'The profiler took <b>' + total + '</b> samples. Each row is one distinct call stack and how many times it was seen.', parts: [
          { type: 'table', label: 'Raw samples', columns: ['stack (caller → callee)', 'samples'], rows: stacks.map(function (s) { return [s.path.join(' → '), s.n]; }) }] });
        for (var d = 0; d <= maxD; d++) {
          var parts = [];
          for (var dd = 0; dd <= d; dd++) {
            var lv = order.filter(function (k) { return nodes[k].depth === dd; });
            var hl = {};
            lv.forEach(function (k, i) { if (k === hot) hl[i] = 'bad'; else hl[i] = dd === d ? 'cur' : 'done'; });
            parts.push({ type: 'bars', label: 'depth ' + dd + (dd === 0 ? ' (entry point)' : ''), values: lv.map(function (k) { return nodes[k].total; }),
              idxLabels: lv.map(function (k) { return nodes[k].name; }), texts: lv.map(function (k) { return Math.round(100 * nodes[k].total / total) + '%'; }), hl: hl });
          }
          frames.push({ narr: 'Level <b>' + d + '</b>: bar width = how many samples include that frame. ' + (d === 0 ? 'The entry point is in 100% of samples.' : 'Siblings split their parent\'s time.'), parts: parts });
        }
        var rows = order.map(function (k) { var n = nodes[k]; return [new Array(n.depth + 1).join('› ') + n.name, n.total, n.self, Math.round(100 * n.self / total) + '%']; });
        var hi = order.indexOf(hot);
        frames.push({ narr: 'Self time = samples where the frame was on <b>top</b> of the stack (really burning CPU). <span class="c-r">' + nodes[hot].name + '</span> has the most: ' + Math.round(100 * nodes[hot].self / total) + '% of all time. Fix this first (Amdahl).', parts: [
          { type: 'table', label: 'Merged call tree', columns: ['frame', 'total', 'self', 'self %'], rows: rows, hl: (function () { var h = {}; h[hi] = 'bad'; return h; })() }] });
        frames.push({ narr: 'Optimising anything else gives at most ' + (100 - Math.round(100 * nodes[hot].self / total)) + '% total gain. After fixing the hot frame, <b>profile again</b> - a new hot frame appears.', parts: [
          { type: 'vars', vals: { hotFrame: nodes[hot].name, selfShare: Math.round(100 * nodes[hot].self / total) + '%', nextStep: 'fix, re-measure' }, hl: { hotFrame: 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Heap after each GC: a memory leak looks like a staircase',
      input: '12',
      inputLabel: 'Leaked MB per GC cycle (heap max is 200 MB)',
      gen: function (input) {
        var leak = Number(String(input).trim());
        if (isNaN(leak) || leak < 0 || leak > 60) throw new Error('Enter a number from 0 to 60');
        var vals = [], frames = [], live = 40;
        for (var i = 1; i <= 12; i++) {
          live += leak;
          var over = live >= 200;
          if (over) live = 200;
          vals.push(live);
          var hl = {}; vals.forEach(function (v, j) { hl[j] = v >= 160 ? 'bad' : (v >= 100 ? 'cur' : 'ok'); });
          frames.push({ narr: 'GC #' + i + ': after cleaning, <b>' + live + ' MB</b> are still alive (live set). ' + (over ? '<span class="c-r">Heap full → OutOfMemoryError.</span>' : leak === 0 ? 'Flat line = healthy.' : 'The floor keeps rising: something still points at objects that should be dead.'),
            parts: [{ type: 'bars', label: 'live heap after GC (MB)', values: vals.slice(), hl: hl, texts: vals.map(function (v) { return v + ''; }) },
              { type: 'vars', vals: { leakPerCycle: leak + ' MB', max: '200 MB', status: over ? 'OOM' : 'running' }, hl: { status: over ? 'bad' : 'ok' } }] });
          if (over) break;
        }
        if (frames.length < 4) frames.push({ narr: 'A healthy service keeps the post-GC floor flat. Take a heap dump and ask "what holds these objects?" if it climbs.', parts: [{ type: 'bars', label: 'live heap after GC (MB)', values: vals.slice() }] }), frames.push({ narr: 'Look at the <b>after-GC</b> number, not the peak. Peaks include garbage that is about to be cleaned.', parts: [{ type: 'bars', label: 'live heap after GC (MB)', values: vals.slice() }] }), frames.push({ narr: 'Dominator tree in the heap dump shows who retains the most bytes.', parts: [{ type: 'bars', label: 'live heap after GC (MB)', values: vals.slice() }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Reading a plateau', html: `<p>Stack bottom-to-top: <code>main → handle → render → regex.matches</code>. The <code>regex.matches</code> box is 60% wide and has nothing on top of it. That means it runs <i>by itself</i> for 60% of samples: the regex engine is backtracking. Fix: precompile the <code>Pattern</code>, simplify the regex, or stop using regex for a simple <code>startsWith</code>.</p>${H.table(['depth', 'frame', 'width'], [['0', 'main', '100%'], ['1', 'handle', '100%'], ['2', 'render', '70%'], ['3', '<span class="c-r">regex.matches</span>', '<span class="c-r">60%</span>']])}` },
      { title: 'Wide tower vs wide plateau', html: `<p>A <b>tall, narrow tower</b> (50 frames deep, 3% wide) is just a deep call chain - usually harmless framework plumbing (Spring proxies, filters). A <b>wide, flat top</b> is the real cost. Do not be scared by height; be scared by width at the top.</p>` },
      { title: 'CPU low, latency high: why a CPU profile lies', html: `<p>Endpoint takes 1.8 s, CPU 15%. A CPU flame graph looks boring. A <b>wall-clock</b> profile shows 85% of samples sitting in <code>Socket.read</code> inside <code>InventoryClient.get</code> - we are waiting on another service. The fix is a timeout, caching or a parallel call, not faster code.</p>`, code: { lang: 'bash', check: false, code: `./asprof -d 30 -e wall -t -f /tmp/wall.html <pid>   # -t = one flame per thread` } },
      { title: 'A classic heap leak', html: `<p>A static <code>Map&lt;String, Session&gt; CACHE</code> that only ever <code>put</code>s. Post-GC heap climbs 12 MB per cycle. Heap dump → dominator tree → <code>HashMap$Node[]</code> retains 1.4 GB. Fix: bounded cache with eviction (Caffeine <code>maximumSize</code>, expireAfterWrite).</p>`, code: `import java.util.*;
class LeakyCache {
    // BUG: grows forever - every key ever seen stays reachable from this static field
    static final Map<String, byte[]> CACHE = new HashMap<>();

    // Fix idea: an LRU map capped at 1000 entries using LinkedHashMap's removeEldestEntry
    static final Map<String, byte[]> LRU = new LinkedHashMap<>(16, 0.75f, true) {
        @Override protected boolean removeEldestEntry(Map.Entry<String, byte[]> e) { return size() > 1000; }
    };

    public static void main(String[] args) {
        for (int i = 0; i < 5000; i++) { LRU.put("k" + i, new byte[10]); }
        System.out.println("LRU size stays at " + LRU.size());
    }
}` }
    ],
    deepDive: `<p>🟣 <b>Why sampling beats instrumenting.</b> Instrumenting every method call distorts what you measure (the probe costs more than a tiny method). Sampling pays a fixed cost per sample, independent of call count. The catch is <b>safepoint bias</b>: older JVM profilers could only sample at safepoints (loop back-edges, method returns), so tight loops looked cold. <b>async-profiler</b> uses <code>AsyncGetCallTrace</code> plus OS timers (perf_events) to sample at any instruction, and can also show kernel and native frames. JFR is also non-safepoint-biased for execution samples.</p>
      <p><b>Inlining hides frames.</b> The JIT inlines small methods, so a frame may vanish; async-profiler can re-expand inlined frames. Also, JIT warm-up means a profile from the first 30 s of a process shows interpreter and compiler noise - profile a warm service.</p>
      <p><b>Allocation and GC.</b> High allocation rate → frequent young GCs → more pauses and CPU in GC threads. An allocation flame graph shows <i>who</i> creates garbage. Typical wins: avoid boxing in hot loops, reuse <code>Pattern</code>/<code>DateTimeFormatter</code>, avoid creating streams for tiny lists, pre-size collections. Know your GC: G1 is the default (balanced), ZGC/Shenandoah target sub-millisecond pauses on big heaps; Parallel favours throughput.</p>
      <p><b>Memory leaks.</b> In a GC language a leak means an <i>unwanted reference</i> keeps objects alive: static collections, listeners never removed, <code>ThreadLocal</code> in pooled threads, unbounded caches, classloader leaks. The tool is the heap dump's <i>dominator tree</i> and the "path to GC roots". Compare two dumps (before/after) to see what grew. <code>GC.heap_dump</code> pauses the app - use it on one instance taken out of the load balancer.</p>
      <p><b>Production practice.</b> <b>Continuous profiling</b> (Pyroscope, Parca, Datadog, Google Cloud Profiler) keeps always-on low-rate samples so that when the 3 a.m. incident happens, the flame graph already exists. <b>Differential flame graphs</b> subtract version A from version B so regressions glow red. Frame the work with <b>USE</b> (Utilisation, Saturation, Errors per resource) and <b>RED</b> (Rate, Errors, Duration per service) before opening a profiler: first find <i>which resource</i> is saturated, then find <i>which code</i> uses it.</p>
      <p><b>Benchmark honesty.</b> Micro-benchmarks need JMH (warm-up, dead-code elimination traps). A 2x win on a function that is 1% of the flame graph is a 0.5% win for the user.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM is surprisingly good at <i>reading</i> profiles. Export a flame graph as "folded stacks" (<code>a;b;c 120</code> per line) or the top 40 frames as text and ask for a plain summary and likely causes. It can also explain unfamiliar library frames (<code>sun.nio.ch.EPoll.wait</code> is idle, not a problem).</p>
      <p><b>Use AI as a partner:</b> <code>Here are the top frames from a 30 s CPU profile. Which are real work and which are idle waiting? Suggest 3 experiments, do not rewrite my code.</code></p>
      <p><b>Where AI goes wrong:</b> it guesses without data ("use caching!"), proposes micro-optimisations on cold code, and cannot see your production traffic. AI-generated code also tends to allocate generously (streams, regex compiled in a loop, N+1 calls), so reviews should check for those. For AI inference services, the bottleneck often moves to GPU memory and batching, but the same discipline applies: profile first.</p>
      <p><b>What you must still own:</b> choosing the right kind of profile (CPU vs wall vs alloc), deciding whether the finding matters to users, and proving the fix with a before/after measurement.</p>`,
    problems: [{
      title: 'Read the Flame Graph',
      level: 'Easy', tags: ['profiling', 'flame graph'], companies: ['Amazon', 'Netflix'],
      statement: `<p>A checkout endpoint has p95 = 900 ms. A 30 s CPU profile gives these merged stacks (samples): <code>checkout>validate:40</code>, <code>checkout>price>discountRules>regexMatch:520</code>, <code>checkout>price>tax:60</code>, <code>checkout>save>jdbc:80</code>, <code>checkout>serialize:100</code>. Which frame do you fix first, and what is the best-case total gain?</p>`,
      constraints: `Total samples = 800. Assume CPU time is representative of latency.`,
      example: `${H.table(['frame', 'self samples', 'share'], [['regexMatch', '520', '<span class="c-r">65%</span>'], ['serialize', '100', '12.5%'], ['jdbc', '80', '10%'], ['tax', '60', '7.5%'], ['validate', '40', '5%']])}<p>Fix <b>regexMatch</b>: removing it entirely saves at most 65% of CPU time.</p>`,
      brute: { why: `<p>Guessing: "databases are always slow, add an index and a cache". But <code>jdbc</code> is only 10% of samples, and a CPU profile does not even show time spent waiting for the DB. Effort goes into a frame worth at most 10%.</p>` },
      mcq: { q: 'Which action gives the biggest possible win?', options: ['Optimise regexMatch (65% self time)', 'Add a DB index (jdbc 10%)', 'Rewrite serialize in a faster library (12.5%)', 'Scale to more servers without looking'], answer: 0, explain: 'Amdahl: the widest top-of-stack frame bounds the gain. Fix it, then re-profile.' },
      hints: [`<p>Compute each frame's self samples divided by 800.</p>`, `<p>Amdahl's law: if you remove a part that is f of the time, new time = (1 - f) of old.</p>`, `<p>Plan: find top self frame → understand why (catastrophic regex backtracking? compiled per call?) → fix → re-run the same profile and compare.</p>`],
      solution: {
        approach: `<p>Sum the stacks (800 samples). The top-of-stack frame <code>regexMatch</code> has 520/800 = 65%, far above any other. Fix it first: precompile the <code>Pattern</code> once as a static final, avoid nested quantifiers that cause catastrophic backtracking, or replace the regex with a simple string test. If it becomes 10x faster the new total is 0.35 + 0.065 = 41.5% of the old time (about 2.4x faster overall). Then take a new profile; the next target will likely be <code>serialize</code> at 12.5% of the old total. Also confirm with a wall-clock profile whether DB waiting hides outside the CPU view.</p>`,
        complexity: `<p>Not an algorithm - the cost is one 30 s profile run plus the fix; the gain is bounded by Amdahl's law.</p>`,
        followUps: ['How would the answer change with a wall-clock profile?', 'How do you prove the fix helped in production?']
      }
    }]
  });

  /* ================= TOPIC 2: thread pools & Little's law ================= */
  topics.push({
    title: 'Thread Pools and Concurrency Sizing (Little\'s Law)',
    analogy: `<p>A bank has <b>tellers</b> (threads), a <b>waiting line</b> (queue) and a <b>door guard</b> who turns people away when the lobby is full (rejection). If each customer takes 5 minutes and 2 customers arrive per minute, you need <b>10 customers in service</b> at once, so about 10 tellers. That calculation - <i>arrival rate × time in system = people in system</i> - is <b>Little's law</b>. Hire too few tellers and the line grows forever. Hire 1,000 and they trip over each other (context switching, memory).</p>`,
    explain: `<p>🟢 <b>A thread pool</b> keeps a fixed set of worker threads alive and hands them tasks, instead of creating a thread per request (expensive: ~1 MB stack each, slow to start).</p>
      <p><b>Little's law:</b> <code>L = λ × W</code></p>
      <ul><li><b>λ</b> (lambda) = arrival rate, requests per second.</li><li><b>W</b> = average time one request spends in the system, seconds.</li><li><b>L</b> = average number of requests in the system at once = the concurrency you must support.</li></ul>
      ${H.table(['λ (req/s)', 'W (s)', 'L = λ×W', 'meaning'], [['100', '0.05', '5', '5 threads busy on average'], ['100', '0.5', '50', 'DB got slow, now 50 in flight'], ['1000', '0.2', '200', 'need ~200 concurrent slots']])}
      <p>🔵 <b>Sizing by workload type.</b></p>
      <ul><li><b>CPU-bound</b> work (hashing, JSON crunching): threads ≈ number of cores (+1). More threads only add switching cost.</li>
      <li><b>I/O-bound</b> work (waits for DB/HTTP): threads ≈ <code>cores × (1 + wait / compute)</code>. If a request computes 10 ms and waits 90 ms, <code>wait/compute = 9</code>, so on 8 cores: 8 × 10 = 80 threads.</li></ul>
      <p><b>Java's ThreadPoolExecutor rules</b> (memorise them - interviewers love them):</p>
      <ol><li>Fewer than <code>corePoolSize</code> threads running → start a new thread (even if others are idle).</li><li>Else try to put the task in the <b>queue</b>.</li><li>Queue full → start a thread up to <code>maximumPoolSize</code>.</li><li>Still full → run the <b>rejection policy</b>.</li></ol>
      <p>Rejection policies: <code>AbortPolicy</code> (throws, default), <code>CallerRunsPolicy</code> (the caller runs it itself, which slows the producer down - natural backpressure), <code>DiscardPolicy</code>, <code>DiscardOldestPolicy</code>.</p>
      <p><b>Never use an unbounded queue by accident.</b> <code>Executors.newFixedThreadPool(n)</code> uses a <code>LinkedBlockingQueue</code> with no limit: under overload memory grows until the JVM dies, and latency becomes minutes. Build <code>ThreadPoolExecutor</code> yourself with a bounded <code>ArrayBlockingQueue</code>.</p>`,
    clues: ['"How many threads should the pool have?" → CPU vs I/O bound, Little\'s law, then measure', '"Requests pile up and latency climbs but nothing fails" → unbounded queue hiding overload', '"Average 200 ms, 500 req/s" → L = 100 concurrent requests', '"Pool exhausted / timeout waiting for connection" → concurrency larger than a downstream limit', '"Why not just 1000 threads?" → context switches, memory, downstream DB limit', '"CPU 100% with 200 threads on 4 cores" → CPU-bound, too many threads']
    ,
    code: [
      `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** A bounded pool: 2 core threads, up to 4 threads, queue of 3, CallerRunsPolicy as backpressure. */
class BoundedPoolDemo {
    public static void main(String[] args) throws Exception {
        AtomicInteger ranByCaller = new AtomicInteger();
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            2,                                   // corePoolSize: always kept alive
            4,                                   // maximumPoolSize: extra threads only when the queue is FULL
            30, TimeUnit.SECONDS,                // extra threads die after 30 s idle
            new ArrayBlockingQueue<>(3),         // bounded queue: the whole point
            new ThreadPoolExecutor.CallerRunsPolicy());  // overload -> the submitting thread does the work itself

        for (int i = 1; i <= 12; i++) {
            final int id = i;
            pool.execute(() -> {
                String who = Thread.currentThread().getName();
                if (who.equals("main")) ranByCaller.incrementAndGet();   // proof of backpressure
                try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
            System.out.println("submitted " + id + "  pool=" + pool.getPoolSize() + " queue=" + pool.getQueue().size());
        }
        pool.shutdown();
        pool.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("completed=" + pool.getCompletedTaskCount() + " ranByCaller=" + ranByCaller.get());
    }
}`,
      { lang: 'js', run: true, title: 'Little\'s law and pool-size helper (runnable)', code: `// L = lambda * W  and the CPU/IO formulas
function littles(lambdaPerSec, avgSeconds) { return lambdaPerSec * avgSeconds; }

function poolSize(cores, computeMs, waitMs, targetUtil) {
  // classic formula: threads = cores * targetUtil * (1 + wait/compute)
  return Math.ceil(cores * targetUtil * (1 + waitMs / computeMs));
}

console.log('Concurrency at 500 req/s, 200 ms each:', littles(500, 0.2));
console.log('Concurrency if DB slows to 1 s:        ', littles(500, 1.0));
console.log('CPU-bound  (8 cores, 10ms cpu, 0 wait): ', poolSize(8, 10, 0, 1));
console.log('IO-bound   (8 cores, 10ms cpu, 90 wait):', poolSize(8, 10, 90, 1));
console.log('IO-bound at 80% target CPU:             ', poolSize(8, 10, 90, 0.8));

// Check against a downstream limit: DB pool has 20 connections, each query 25 ms
const dbMax = 20 / 0.025;   // max sustainable queries per second = connections / seconds each
console.log('DB can sustain at most', dbMax, 'queries/s -> that is your real ceiling');` },
      { lang: 'python', run: true, title: 'Same sizing helper in Python (runnable)', code: `import math

def littles(lam, w):
    return lam * w

def pool_size(cores, compute_ms, wait_ms, util=1.0):
    return math.ceil(cores * util * (1 + wait_ms / compute_ms))

for lam, w in [(100, 0.05), (100, 0.5), (1000, 0.2)]:
    print(f"lambda={lam}/s W={w}s -> L={littles(lam, w)}")
print("threads for 8 cores, 10ms cpu / 90ms wait:", pool_size(8, 10, 90))
# Throughput ceiling of a fixed pool = threads / service_time
print("max req/s of 50 threads at 100 ms each:", 50 / 0.1)` }
    ],
    codeTitle: ['Java: ThreadPoolExecutor with bounded queue and CallerRunsPolicy', 'JS: Little\'s law and pool sizing', 'Python: the same helper'],
    viz: [{
      title: 'ThreadPoolExecutor: core, queue, max, reject',
      input: '2 4 3 12',
      inputLabel: 'core, max, queueCapacity, tasks (each task takes 4 ticks, 2 tasks arrive per tick)',
      gen: function (input) {
        var a = nums(input, 4, 4, 'core max queue tasks');
        var core = a[0], max = a[1], qcap = a[2], total = a[3];
        if (core < 1 || max < core || max > 6 || qcap < 0 || qcap > 8 || total < 1 || total > 24) throw new Error('core>=1, max>=core (<=6), queue 0-8, tasks 1-24');
        var threads = [], queue = [], rejected = 0, nextId = 1, frames = [], DUR = 4;
        for (var tick = 1; tick <= 40; tick++) {
          var events = [];
          threads.forEach(function (t) { if (t.left > 0) { t.left--; if (t.left === 0) { events.push('T' + t.name + ' finished task ' + t.task); t.task = null; } } });
          threads.forEach(function (t) { if (t.left === 0 && queue.length) { t.task = queue.shift(); t.left = DUR; events.push('T' + t.name + ' took ' + t.task + ' from queue'); } });
          for (var k = 0; k < 2 && nextId <= total; k++) {
            var id = nextId++;
            if (threads.length < core) { threads.push({ name: threads.length + 1, task: id, left: DUR }); events.push('task ' + id + ' → new core thread'); }
            else if (queue.length < qcap) { queue.push(id); events.push('task ' + id + ' → queue'); }
            else if (threads.length < max) { threads.push({ name: threads.length + 1, task: id, left: DUR }); events.push('task ' + id + ' → EXTRA thread (queue full)'); }
            else { rejected++; events.push('task ' + id + ' → <span class="c-r">REJECTED</span>'); }
          }
          var rows = [], hl = {};
          for (var r = 0; r < max; r++) {
            var t = threads[r];
            rows.push([t ? (t.task ? 'task ' + t.task : 'idle') : '-', t ? t.left : '-']);
            if (t && t.task) hl[r + ',0'] = r < core ? 'cur' : 'win';
          }
          var qhl = {}; queue.forEach(function (_, i) { qhl[i] = 'cur'; });
          frames.push({ narr: 'Tick ' + tick + ': ' + (events.join('; ') || 'nothing new') + '. Rejected so far: <b>' + rejected + '</b>.', parts: [
            { type: 'grid', label: 'Worker threads (amber = core, blue = extra beyond core)', rowHead: threads.length ? rows.map(function (_, i) { return (i < core ? 'core ' : 'extra ') + (i + 1); }) : rows.map(function (_, i) { return 'slot ' + (i + 1); }), colHead: ['running', 'ticks left'], rows: rows, hl: hl },
            { type: 'queue', label: 'Bounded queue (capacity ' + qcap + ')', items: queue.slice(), hl: qhl, frontLabel: 'next out', backLabel: 'newest' },
            { type: 'vars', vals: { threads: threads.length, queued: queue.length, rejected: rejected }, hl: rejected ? { rejected: 'bad' } : {} }] });
          var busy = threads.some(function (t) { return t.left > 0; });
          if (nextId > total && !queue.length && !busy) break;
        }
        return frames.slice(0, 40);
      }
    }, {
      title: 'Little\'s law: how many are in flight?',
      input: '100 50 200 500',
      inputLabel: 'Request rate (req/s) at each moment',
      gen: function (input) {
        var rates = nums(input, 1, 8, 'req/s values');
        var frames = [], pool = 20, w = 0.1;
        frames.push({ narr: 'Setup: every request takes <b>W = 100 ms</b>. A pool of <b>20 threads</b> can finish 20 / 0.1 = <b>200 req/s</b> at most.', parts: [{ type: 'vars', vals: { W: '0.1 s', threads: pool, maxThroughput: '200 req/s' } }] });
        rates.forEach(function (r) {
          var L = r * w, over = L > pool;
          frames.push({ narr: 'λ = <b>' + r + '</b> req/s → L = λ × W = <b>' + L.toFixed(1) + '</b> in flight. ' + (over ? '<span class="c-r">More than 20 → the extra ' + (L - pool).toFixed(1) + ' wait in the queue every second.</span>' : 'Fits in the pool.'), parts: [
            { type: 'bars', label: 'needed concurrency vs threads (20)', values: [L, pool], idxLabels: ['needed L', 'threads'], hl: { 0: over ? 'bad' : 'ok', 1: 'win' } }] });
        });
        frames.push({ narr: 'Rule: if <b>L exceeds your slots</b>, a queue grows without limit. Either add capacity, shorten W, or shed load.', parts: [{ type: 'text', html: '<b>L = λ × W</b> works for any stable system: threads, connections, even people in a shop.' }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Size a pool for an API call', html: `<p>Service has 4 cores. Each request: 20 ms CPU, then waits 180 ms for a downstream HTTP call. <code>threads = 4 × (1 + 180/20) = 40</code>. Throughput ceiling = 40 / 0.2 s = <b>200 req/s</b>. At 300 req/s, L = 60 > 40: queue builds. Also CPU: 300 × 20 ms = 6 core-seconds per second, but there are only 4 cores, so CPU is the true limit. Options: cache the downstream call, make the CPU part cheaper, or add a second instance.</p>${H.table(['step', 'value'], [['cores', '4'], ['compute / wait', '20 ms / 180 ms'], ['threads', '40'], ['ceiling', '200 req/s'], ['CPU needed at 300 req/s', '6 cores > 4 → CPU is the true limit']])}` },
      { title: 'Why newFixedThreadPool is dangerous', html: `<p>10 threads, unbounded queue, DB slows from 20 ms to 2 s. Arrivals 100/s, completions 5/s, so the queue grows 95 tasks per second. After 10 minutes: 57,000 queued tasks, each holding a request body → GC thrash → OOM. Callers waited minutes for answers nobody wants any more. A bounded queue + rejection fails fast instead.</p>` },
      { title: 'CallerRunsPolicy as natural backpressure', html: `<p>When pool and queue are full, the <i>submitting thread</i> runs the task. That thread cannot accept new work while busy, so intake slows to the rate the pool can handle - no extra code. Warning: if the submitter is a Tomcat/Netty event-loop thread, you just blocked it. Use it for batch producers, not on the event loop.</p>`, code: `import java.util.concurrent.*;
class RejectionDemo {
    public static void main(String[] args) {
        ThreadPoolExecutor p = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(1), new ThreadPoolExecutor.AbortPolicy());
        Runnable slow = () -> { try { Thread.sleep(200); } catch (InterruptedException e) { } };
        int rejected = 0;
        for (int i = 0; i < 5; i++) {
            try { p.execute(slow); } catch (RejectedExecutionException e) { rejected++; }
        }
        System.out.println("rejected=" + rejected);   // 3: one running, one queued, three refused
        p.shutdownNow();
    }
}` }
    ],
    deepDive: `<p>🟣 <b>Why more threads is not faster.</b> Beyond the core count, runnable threads compete for CPU; the OS context-switches (a few microseconds each plus cold CPU caches). Memory: 1 MB default stack per platform thread reserved, thousands of threads → GBs of virtual memory. GC must scan every stack at safepoints. So there is a throughput peak, then decline - the <b>Universal Scalability Law</b> (Gunther) models this: contention (σ) and coherency (κ) costs make throughput curve over.</p>
      <p><b>Little's law is general.</b> It holds for any stable system, regardless of distribution. Use it three ways: (1) find needed concurrency, (2) find the max throughput of a fixed resource (<code>λ_max = slots / W</code>), (3) sanity-check monitoring (if in-flight gauge ≠ rate × latency, a metric is wrong). Note W includes <b>queue time</b>; under overload W grows, so L grows, which grows W further - a feedback loop that ends in collapse.</p>
      <p><b>Utilisation vs latency.</b> In a simple queue, wait time scales like <code>ρ / (1 − ρ)</code>. At 50% utilisation wait ≈ 1× service time; at 90% ≈ 9×; at 99% ≈ 99×. This is why you plan for 60-70% peak utilisation, not 100%.</p>
      <p><b>Separate pools (bulkheads).</b> One pool for everything means a slow dependency eats all threads and the whole service freezes. Give each downstream its own small pool or semaphore so one failure is contained. Resilience4j's <code>Bulkhead</code> does this. Tomcat defaults: 200 worker threads, <code>acceptCount</code> 100 backlog; Spring's <code>@Async</code> default executor is unbounded-ish in older versions - configure it.</p>
      <p><b>ThreadLocal and context.</b> Pools reuse threads, so <code>ThreadLocal</code> data (MDC log ids, security context) can leak between requests unless cleared. <code>ForkJoinPool.commonPool()</code> is shared by parallel streams - blocking calls inside it starve everything else. Always name threads (<code>ThreadFactory</code>) so thread dumps are readable. Monitor: active threads, queue depth, rejected count, task wait time.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-assisted code happily writes <code>Executors.newFixedThreadPool(100)</code> or <code>CompletableFuture.supplyAsync(...)</code> on the common pool with no timeout. Reviewers must catch unbounded queues, missing timeouts and blocking in shared pools.</p>
      <p><b>AI workloads are I/O-bound with a twist:</b> calls to an LLM API take 2-30 seconds. By Little's law, 50 req/s × 10 s = 500 requests in flight - far more than any sensible platform thread pool. This is exactly where virtual threads or async clients shine, plus a <b>concurrency cap per model provider</b> (a semaphore) so you do not hit rate limits.</p>
      <p><b>Use AI as a partner:</b> <code>Given 8 cores, 15 ms CPU and 120 ms DB wait per request, explain the pool-size formula and list what could invalidate it.</code> Then verify with a load test.</p>
      <p><b>Where AI goes wrong:</b> it quotes "threads = cores × 2" as a law. It is a rough start; the right number comes from measuring wait/compute and downstream limits.</p>`,
    problems: [{
      title: 'Size a Thread Pool with Little\'s Law',
      level: 'Medium', tags: ['little\'s law', 'thread pool', 'capacity'], companies: ['Google', 'Uber'],
      statement: `<p>Your service must handle <b>400 req/s</b>. Each request spends 15 ms on CPU and 135 ms waiting for a database. The box has 8 cores. (a) How many requests are in flight on average? (b) How many threads does the I/O formula suggest? (c) The database allows only 50 connections - what is the max throughput, and what should you do?</p>`,
      constraints: `Target CPU utilisation 100% for the formula. Average numbers are fine.`,
      example: `<p>(a) W = 0.15 s, L = 400 × 0.15 = <b>60</b>. (b) 8 × (1 + 135/15) = 8 × 10 = <b>80</b> threads. (c) 50 / 0.135 ≈ <b>370 req/s</b> if the connection is held only during the 135 ms wait → below 400, so the DB pool is the bottleneck.</p>`,
      brute: { why: `<p>"Set the pool to 400 so every request has its own thread." That wastes memory, and 400 threads would fire up to 400 concurrent queries at a DB that accepts 50, causing connection-wait timeouts and a pile-up.</p>` },
      mcq: { q: 'The pool is 80 threads but the DB pool is 50. What actually limits throughput?', options: ['The smaller one: the DB pool (50 slots)', 'The thread pool (80)', 'The sum (130)', 'Neither - queues are infinite'], answer: 0, explain: 'A request needs both a thread and a DB connection; the scarcest resource sets the ceiling.' },
      hints: [`<p>Little's law: L = λ × W where W = 0.15 s total.</p>`, `<p>Threads = cores × (1 + wait/compute); here wait/compute = 135/15.</p>`, `<p>Max throughput of a pool = slots / time-each-slot-is-held. Compare with 400 and decide: raise DB capacity (read replica, pgbouncer), cut query time, cache, or add instances and shed excess.</p>`],
      solution: {
        approach: `<p>(a) L = λ × W = 400 × 0.15 = 60 requests in flight. (b) With wait/compute = 9, threads = 8 × 10 = 80, comfortably above 60 so the pool is not the limit. CPU check: 400 × 15 ms = 6 core-seconds per second, i.e. 75% of 8 cores - fine. (c) DB connections: each query holds a connection ~135 ms, so max = 50 / 0.135 ≈ 370 req/s < 400. We are 8% short, so under peak load requests queue for connections. Fixes in order of preference: cut query time (index, avoid N+1) - at 100 ms the ceiling is 500/s; cache hot reads; raise the DB pool only if the database CPU has headroom; or add instances only if each instance has its own DB budget. Also put a bounded queue and a timeout on connection acquisition so overload fails fast instead of piling up.</p>`,
        complexity: `<p>Arithmetic only. Verify with a load test at 400 req/s, watching DB pool wait time.</p>`,
        followUps: ['How does the answer change if p99 is 600 ms instead of the 150 ms average?', 'What if two instances share the same 50-connection database limit?']
      }
    }]
  });

  /* ================= TOPIC 3: async, non-blocking, virtual threads ================= */
  // Simulates N requests: 1 tick CPU, io ticks waiting, 1 tick CPU. holdThread=true -> waiting occupies the worker.
  function simulate(nReq, io, workers, holdThread) {
    var reqs = [], t, i;
    for (i = 0; i < nReq; i++) reqs.push({ id: i, stage: 0, ioLeft: 0, sTick: -1 });
    var lanes = []; for (i = 0; i < workers; i++) lanes.push({ cur: null, line: '' });
    for (t = 0; t < 60; t++) {
      var ran = {};
      lanes.forEach(function (ln) {
        var r = null;
        if (holdThread) {
          if (ln.cur === null) {
            for (var k = 0; k < reqs.length; k++) if (reqs[k].stage === 0 && !reqs[k].taken) { reqs[k].taken = true; ln.cur = k; break; }
          }
          if (ln.cur === null) { ln.line += '.'; return; }
          r = reqs[ln.cur];
          if (r.stage === 1) { ln.line += '~'; return; }
        } else {
          for (var q = 0; q < reqs.length; q++) if ((reqs[q].stage === 0 || reqs[q].stage === 2) && !ran[q]) { r = reqs[q]; break; }
          if (!r) { ln.line += '.'; return; }
          ran[r.id] = true;
        }
        ln.line += String.fromCharCode(65 + r.id);
        if (r.stage === 0) { r.stage = 1; r.ioLeft = io; r.sTick = t; }
        else if (r.stage === 2) { r.stage = 3; if (holdThread) ln.cur = null; }
      });
      reqs.forEach(function (r) { if (r.stage === 1 && r.sTick < t) { r.ioLeft--; if (r.ioLeft === 0) r.stage = 2; } });
      if (reqs.every(function (r) { return r.stage === 3; })) { t++; break; }
    }
    return { lanes: lanes.map(function (l) { return l.line; }), reqs: reqs, ticks: t };
  }

  topics.push({
    title: 'Async, Non-blocking I/O and Virtual Threads',
    analogy: `<p><b>Blocking</b> is a waiter who takes your order, then <i>stands at the kitchen window doing nothing</i> until the food is ready. Hire one waiter per table and it works, but waiters are expensive. <b>Non-blocking</b> is a waiter who takes your order, hangs the ticket, and serves other tables until a bell rings. One waiter, many tables. <b>Virtual threads</b> are a magic trick: the code still reads like "stand and wait", but the restaurant secretly lets the waiter go serve other tables while you "wait".</p>`,
    explain: `<p>🟢 Most backend time is <b>waiting</b> (database, HTTP call, disk), not computing. The question is: what does the thread do while waiting?</p>
      ${H.table(['Model', 'While waiting', 'Cost per waiting request', 'Code style'], [['Blocking, thread per request', 'thread sleeps, holds ~1 MB stack', 'one OS thread', 'simple, top-to-bottom'], ['Non-blocking / reactive (Netty, WebFlux, Node)', 'thread goes to serve others', 'a few hundred bytes (a callback/state)', 'callbacks, Mono/Flux, async/await'], ['Virtual threads (Java 21)', 'JVM parks it, carrier thread is freed', 'a few KB, heap-allocated', 'simple, top-to-bottom'], ['Async/await (JS, Python asyncio)', 'event loop runs other tasks', 'small coroutine object', 'looks sequential']])}
      <p>🔵 <b>How non-blocking I/O works.</b> The OS gives one thread the power to watch thousands of sockets at once (<code>epoll</code> on Linux). The loop says: "wake me when any socket has data", handles the ready ones for microseconds, and goes back to sleep. Rule of the loop: <b>never block it</b> - one slow <code>Thread.sleep</code>, JDBC call or heavy loop freezes every other request on that thread.</p>
      <p><b>Fan-out in parallel.</b> A page needs user, orders and recommendations. Calling them one after another costs 50 + 80 + 120 = 250 ms. Calling them <i>at the same time</i> costs max(50, 80, 120) = <b>120 ms</b>. In Java: <code>CompletableFuture.supplyAsync</code> + <code>allOf</code>; in Node: <code>Promise.all</code>.</p>
      <p><b>Virtual threads (Project Loom, final in Java 21).</b> <code>Executors.newVirtualThreadPerTaskExecutor()</code> gives you one cheap thread per task. When code blocks on I/O, the virtual thread is unmounted from its carrier (an ordinary platform thread) and the carrier runs another one. You can have a million. <b>Do not pool virtual threads</b> - they are cheap, create one per task; limit concurrency with a <code>Semaphore</code> instead.</p>
      <p><b>When it does NOT help:</b> CPU-bound work (still limited by cores), or a downstream with fixed capacity (DB with 50 connections). Cheap concurrency just lets you reach the real limit faster.</p>`,
    clues: ['"10,000 concurrent connections" / "C10K" → non-blocking I/O or virtual threads, not thread per request', '"Threads are mostly idle waiting on I/O" → async or virtual threads', '"Call 3 services and merge" → parallel fan-out (CompletableFuture.allOf / Promise.all) with timeouts', '"Event loop is blocked / lag spikes" → blocking call or CPU work on the loop thread', '"Java 21" + "simple code, high concurrency" → virtual threads', '"Why is WebFlux not faster?" → work is CPU-bound or downstream is blocking (JDBC)']
    ,
    code: [
      `import java.util.concurrent.*;

/** Fan-out three calls in parallel with a timeout and a fallback for the optional one. */
class FanOutDemo {
    static String fetch(String name, int ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        return name;
    }

    public static void main(String[] args) throws Exception {
        ExecutorService io = Executors.newFixedThreadPool(8);
        long t0 = System.nanoTime();

        CompletableFuture<String> user   = CompletableFuture.supplyAsync(() -> fetch("user", 50), io);
        CompletableFuture<String> orders = CompletableFuture.supplyAsync(() -> fetch("orders", 80), io);
        // Optional, slow dependency: give up after 100 ms and use a fallback instead of failing the page.
        CompletableFuture<String> recs = CompletableFuture.supplyAsync(() -> fetch("recs", 400), io)
            .completeOnTimeout("popular-items", 100, TimeUnit.MILLISECONDS);

        CompletableFuture.allOf(user, orders, recs).join();
        String page = user.join() + "+" + orders.join() + "+" + recs.join();
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.println(page + " in ~" + ms + " ms (sequential would be 530 ms)");
        io.shutdown();
    }
}`,
      `import java.util.concurrent.*;
import java.util.*;

/** Platform threads vs virtual threads: 5,000 tasks that each "wait" 100 ms. */
class VirtualThreadDemo {
    static long run(ExecutorService ex, int tasks) throws Exception {
        long t0 = System.nanoTime();
        List<Future<Integer>> fs = new ArrayList<>();
        for (int i = 0; i < tasks; i++) {
            final int id = i;
            fs.add(ex.submit(() -> { Thread.sleep(100); return id; }));   // blocking-style code
        }
        for (Future<Integer> f : fs) f.get();
        ex.shutdown();
        return (System.nanoTime() - t0) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        // 200 platform threads: 5000 tasks / 200 = 25 waves x 100 ms = about 2500 ms
        System.out.println("platform(200): " + run(Executors.newFixedThreadPool(200), 5000) + " ms");
        // Virtual threads: one per task, all waiting at once = about 100-300 ms
        System.out.println("virtual:       " + run(Executors.newVirtualThreadPerTaskExecutor(), 5000) + " ms");
    }
}`,
      { lang: 'java', check: false, title: 'Reactive style (Spring WebFlux / Reactor): same fan-out, non-blocking', code: `@GetMapping("/page/{id}")
Mono<Page> page(@PathVariable String id) {
    Mono<User>   user   = userClient.get(id);                 // WebClient: returns immediately
    Mono<Orders> orders = orderClient.get(id);
    Mono<Recs>   recs   = recClient.get(id)
        .timeout(Duration.ofMillis(100))                      // slow optional call
        .onErrorReturn(Recs.popular());                       // degrade instead of failing
    return Mono.zip(user, orders, recs)                       // subscribe to all three at once
               .map(t -> new Page(t.getT1(), t.getT2(), t.getT3()));
    // RULE: nothing in this chain may block (no JDBC, no Thread.sleep, no .block()).
}` },
      { lang: 'js', run: true, title: 'Node: sequential vs parallel awaits (runnable)', code: `const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

async function sequential() {
  const t0 = Date.now();
  const a = await wait(50, 'user');
  const b = await wait(80, 'orders');
  const c = await wait(120, 'recs');
  return [a, b, c, Date.now() - t0];
}
async function parallel() {
  const t0 = Date.now();
  const [a, b, c] = await Promise.all([wait(50, 'user'), wait(80, 'orders'), wait(120, 'recs')]);
  return [a, b, c, Date.now() - t0];
}
(async () => {
  const s = await sequential();
  const p = await parallel();
  console.log('sequential ~' + s[3] + ' ms (50+80+120)');
  console.log('parallel   ~' + p[3] + ' ms (max of the three)');
})();` }
    ],
    codeTitle: ['Java: CompletableFuture fan-out with timeout + fallback', 'Java 21: platform vs virtual threads', 'WebFlux/Reactor version (framework code)', 'Node: sequential vs parallel'],
    viz: [{
      title: 'Blocking vs non-blocking timeline',
      input: '4 3',
      inputLabel: 'requests, io ticks (each request: 1 tick CPU, io ticks waiting, 1 tick CPU)',
      gen: function (input) {
        var a = nums(input, 2, 2, 'requests and io-ticks');
        var n = a[0], io = a[1];
        if (n < 2 || n > 6 || io < 1 || io > 8) throw new Error('requests 2-6, io ticks 1-8');
        var blk = simulate(n, io, 2, true), nb = simulate(n, io, 1, false), vt = simulate(n, io, 2, false);
        function cols(maxT) { var c = ['model']; for (var i = 0; i < maxT; i++) c.push('t' + i); return c; }
        var maxT = Math.max(blk.ticks, nb.ticks, vt.ticks);
        function row(name, line) { var r = [name]; for (var i = 0; i < maxT; i++) r.push(line.charAt(i) || '.'); return r; }
        var legend = 'Letters = which request is running CPU code. ~ = thread is parked WAITING (wasted). . = idle.';
        var frames = [];
        frames.push({ narr: legend + ' Every request: CPU 1 tick, then wait ' + io + ' ticks, then CPU 1 tick.', parts: [{ type: 'text', html: '<b>' + n + ' requests</b> arrive at the same time. We compare three servers.' }] });
        frames.push({ narr: '<b>Platform threads (pool of 2).</b> A thread keeps its request while waiting (~). Requests C, D must queue for a free thread.', parts: [
          { type: 'table', label: 'Blocking, 2 threads', columns: cols(maxT), rows: [row('thread 1', blk.lanes[0]), row('thread 2', blk.lanes[1])], hl: { 0: 'bad', 1: 'bad' } },
          { type: 'vars', vals: { finishedAtTick: blk.ticks }, hl: { finishedAtTick: 'bad' } }] });
        frames.push({ narr: '<b>Event loop (1 thread, non-blocking).</b> The loop only does CPU slices; waiting happens in the OS, not on a thread.', parts: [
          { type: 'table', label: 'Non-blocking, 1 thread', columns: cols(maxT), rows: [row('event loop', nb.lanes[0])], hl: { 0: 'ok' } },
          { type: 'vars', vals: { finishedAtTick: nb.ticks }, hl: { finishedAtTick: 'ok' } }] });
        frames.push({ narr: '<b>Virtual threads (2 carriers).</b> Code is written like blocking code, but waiting frees the carrier, so it behaves like the event loop with more cores.', parts: [
          { type: 'table', label: 'Virtual threads on 2 carriers', columns: cols(maxT), rows: [row('carrier 1', vt.lanes[0]), row('carrier 2', vt.lanes[1])], hl: { 0: 'ok', 1: 'ok' } },
          { type: 'vars', vals: { finishedAtTick: vt.ticks }, hl: { finishedAtTick: 'ok' } }] });
        frames.push({ narr: 'Side by side. Same work, same hardware cores - the difference is only <b>what a waiting request costs</b>.', parts: [
          { type: 'table', label: 'Comparison', columns: ['model', 'all done at tick', 'wasted waiting ticks'], rows: [['Blocking 2 threads', blk.ticks, (blk.lanes.join('').match(/~/g) || []).length], ['Event loop 1 thread', nb.ticks, 0], ['Virtual threads 2 carriers', vt.ticks, 0]], hl: { 0: 'bad', 2: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'C10K on a laptop', html: `<p>10,000 idle WebSocket connections. Thread per connection: 10,000 × 1 MB stacks = 10 GB of virtual memory, scheduler overload. Event loop or virtual threads: a few hundred MB. This is why Nginx, Netty and Node scale to huge connection counts.</p>` },
      { title: 'Accidentally blocking the event loop', html: `<p>In Node: <code>JSON.parse</code> of a 50 MB string or a <code>for</code> loop doing 2 s of math freezes <b>every</b> request for 2 s - the health check fails and Kubernetes restarts the pod. Fix: move CPU work to a worker thread / separate service, stream the parse.</p>`, code: { lang: 'js', run: true, code: `// Event-loop lag demo: a 200 ms busy loop delays a 10 ms timer
const start = Date.now();
setTimeout(() => console.log('timer fired after ' + (Date.now() - start) + ' ms (wanted 10)'), 10);
while (Date.now() - start < 200) { /* pretend CPU work blocks the loop */ }
console.log('busy loop done');` } },
      { title: 'Virtual thread pinning', html: `<p>On Java 21, a virtual thread inside a <code>synchronized</code> block that blocks on I/O is <b>pinned</b>: it holds its carrier thread, so you lose the benefit. Prefer <code>ReentrantLock</code> around blocking calls (Java 24 largely removes synchronized pinning). Watch with <code>-Djdk.tracePinnedThreads=full</code> or the JFR event <code>jdk.VirtualThreadPinned</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>epoll, selectors, io_uring.</b> Linux <code>epoll</code> lets one thread wait on N file descriptors with O(ready) cost. Netty wraps it with event loops (usually 2 × cores of them), one channel pinned to one loop so handlers need no locks. <code>io_uring</code> goes further with shared submission/completion rings to cut syscalls. Node's libuv does the same plus a small <b>thread pool (default 4)</b> for things without async OS APIs (file system, DNS lookup, crypto, zlib) - a classic hidden bottleneck.</p>
      <p><b>Virtual thread internals.</b> A virtual thread's stack lives in heap memory as stack chunks. Mounting copies frames lazily onto a carrier; blocking calls in the JDK (sockets, sleep, locks from <code>java.util.concurrent</code>) were rewritten to park the virtual thread and release the carrier. The scheduler is a <code>ForkJoinPool</code> with parallelism = cores. Things that pin or block carriers: <code>synchronized</code> + I/O (pre-24), native frames (JNI), file I/O on some platforms. <b>ThreadLocals</b> work but millions of them cost memory; prefer scoped values (final in Java 25) or pass context explicitly. Never pool them; limit concurrency with <code>Semaphore</code> to protect downstream.</p>
      <p><b>Reactive trade-offs.</b> Reactive gives backpressure operators and very low memory per connection but costs readability, stack traces, debugging, and a viral "everything must be non-blocking" rule (JDBC is blocking; use R2DBC or offload to a bounded elastic scheduler). With virtual threads, many teams get 80% of the scalability with plain imperative code, so new Java 21+ services often start there. Streaming, server-push and backpressure-heavy pipelines still suit reactive.</p>
      <p><b>Timeouts everywhere.</b> Async makes it easy to start a call and forget it. Every outbound call needs a timeout, ideally a <i>deadline</i> propagated through the whole request (e.g. gRPC deadlines) so downstream work stops when the client has given up. Use <code>orTimeout</code>, <code>completeOnTimeout</code>, <code>Mono.timeout</code>, <code>AbortController</code>. Also decide cancellation: when the caller leaves, cancel the futures.</p>
      <p><b>Measure, do not assume.</b> Async wins for I/O wait-heavy workloads at high concurrency. For a service doing 1,000 req/s with 20 ms of CPU each on 4 cores, nothing helps: you are CPU-bound.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM calls are the new slow dependency - seconds long, streamed token by token. Streaming responses (Server-Sent Events) need non-blocking or virtual-thread servers; a platform thread per open stream burns capacity. Many AI gateways are built on event loops for exactly this reason.</p>
      <p><b>Use AI as a partner:</b> ask it to convert a blocking controller to <code>CompletableFuture</code> or virtual threads and then <i>ask it to list every place the new code could block or pin</i>. Ask for a test with injected latency.</p>
      <p><b>Where AI goes wrong:</b> it mixes models (calls <code>.block()</code> inside a WebFlux handler, uses JDBC in a reactive chain), forgets timeouts, and writes <code>Promise.all</code> where one failure should not kill the others (<code>allSettled</code>). It may also claim virtual threads speed up CPU work (they do not).</p>
      <p><b>What you must still own:</b> choosing the concurrency model from the workload, adding timeouts and cancellation, and proving the improvement with a load test.</p>`,
    problems: [{
      title: 'Parallelise a Page Load Safely',
      level: 'Medium', tags: ['async', 'completablefuture', 'timeouts'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>A product page calls <b>inventory</b> (40 ms), <b>pricing</b> (60 ms), <b>reviews</b> (150 ms, optional) and <b>recommendations</b> (300 ms, optional, sometimes 3 s). Currently they run one after another. Design the call flow: target total latency, timeouts, and what happens on failure.</p>`,
      constraints: `Page budget: 200 ms p95. Inventory and pricing are required; the rest are nice-to-have.`,
      example: `<p>Sequential: 40+60+150+300 = <b>550 ms</b> (and about 3.25 s on a bad day). Parallel with timeouts: required = max(40, 60) = 60 ms; optional ones capped at 120 ms → page ≈ <b>120 ms</b>.</p>`,
      brute: { why: `<p>Sequential calls add up latency (550 ms), and one stuck optional call (3 s) breaks the whole page. Also no timeout means threads pile up.</p>` },
      mcq: { q: 'Recommendations hang for 3 s. Best behaviour?', options: ['Time out at ~120 ms and show popular items', 'Wait up to 3 s', 'Fail the whole page', 'Retry 5 times immediately'], answer: 0, explain: 'Optional data should degrade gracefully; required data may fail the request. Retrying a hanging service adds load.' },
      hints: [`<p>Independent calls can run at the same time; total = the slowest one.</p>`, `<p>Separate required from optional. Required failures fail the page; optional get a fallback.</p>`, `<p>Recipe: start all four futures; join required with a ~100 ms timeout; optional futures use completeOnTimeout(fallback, 120ms); put each dependency on its own bounded pool/semaphore so a slow one cannot starve others; record which parts were degraded in a response header.</p>`],
      solution: {
        approach: `<p>Start all four calls immediately as independent futures (or virtual threads). Inventory and pricing are required: await both, with a 100 ms timeout each; if either fails, return an error (or cached value if the business allows). Reviews and recommendations are optional: attach <code>completeOnTimeout(fallback, 120, ms)</code> so the page waits at most 120 ms for them, then renders with a popular-items fallback and an empty reviews block. Total latency becomes about max(60, 120) = 120 ms, inside the 200 ms budget. Give each dependency its own small bounded pool or semaphore (bulkhead) and a circuit breaker, so recommendations being slow for minutes does not exhaust threads. Cancel futures still running when the page is sent. Emit metrics per dependency (latency, timeouts, fallbacks) so you can see degradation, and avoid retries on a slow optional call.</p>`,
        code: `import java.util.concurrent.*;
class PageLoader {
    static String call(String n, int ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } return n; }
    public static void main(String[] a) {
        try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
            var inv = CompletableFuture.supplyAsync(() -> call("inv", 40), ex).orTimeout(100, TimeUnit.MILLISECONDS);
            var price = CompletableFuture.supplyAsync(() -> call("price", 60), ex).orTimeout(100, TimeUnit.MILLISECONDS);
            var recs = CompletableFuture.supplyAsync(() -> call("recs", 3000), ex).completeOnTimeout("popular", 120, TimeUnit.MILLISECONDS);
            System.out.println(inv.join() + " " + price.join() + " " + recs.join());
        }
    }
}`,
        complexity: `<p>Latency = max over required and capped optional calls (~120 ms) instead of the sum (550 ms). Threads: one per call, bounded by per-dependency pools.</p>`,
        followUps: ['How do you stop a hanging call from holding a thread?', 'What changes if recommendations became required?']
      }
    }]
  });

  /* ================= TOPIC 4: backpressure ================= */
  topics.push({
    title: 'Backpressure and Bounded Queues',
    analogy: `<p>Picture a kitchen pass (the shelf where finished dishes wait). If waiters keep dumping orders faster than cooks can cook, tickets pile up until the wall is covered and nobody knows what is urgent. <b>Backpressure</b> is the cook shouting "STOP, I'm full!" back to the waiters, so they slow down, or tell customers "sorry, kitchen closed for new tables". A <b>bounded queue</b> is a ticket rail with exactly 10 slots - when it is full, something has to give, and it is better to decide <i>what</i> gives than to let the rail grow to the ceiling.</p>`,
    explain: `<p>🟢 When a producer is faster than a consumer, something has to absorb the difference. There are only four honest options:</p>
      ${H.table(['Option', 'What happens', 'Good for'], [['Buffer (queue)', 'wait in line - only up to a limit', 'short bursts'], ['Slow the producer (backpressure)', 'tell upstream "wait / slower"', 'internal pipelines, streams'], ['Drop / reject (load shedding)', 'refuse new or old work', 'user-facing overload, 429/503'], ['Scale out the consumer', 'add workers', 'sustained growth']])}
      <p>An <b>unbounded queue</b> is a fifth, dangerous option: <i>hide the problem until memory runs out</i>. Latency grows without bound, memory grows, and the crash comes late and takes everything with it.</p>
      <p>🔵 <b>Where backpressure shows up.</b></p>
      <ul><li><b>Bounded blocking queue</b> (<code>ArrayBlockingQueue</code>): <code>put()</code> blocks the producer when full; <code>offer()</code> returns false at once so you can reject.</li>
      <li><b>TCP</b> itself: the receiver's window shrinks and the sender slows. Kafka consumers <code>poll()</code> only as fast as they process.</li>
      <li><b>Reactive Streams</b> (Reactor, RxJava, Flow API): the subscriber calls <code>request(n)</code> - "give me n more". Producers must not send more than requested.</li>
      <li><b>Node streams</b>: <code>writable.write()</code> returns false when its buffer is full; wait for <code>'drain'</code>. <code>pipe()</code> / <code>pipeline()</code> do this for you.</li>
      <li><b>HTTP</b>: respond <code>429 Too Many Requests</code> or <code>503</code> with <code>Retry-After</code>, so clients back off.</li></ul>
      <p><b>Little's law again:</b> queue length × per-item time = how long the last item waits. A 1,000-item queue with 10 ms service time means the newest request waits 10 s - probably already abandoned by the user. So size queues by <b>maximum acceptable wait</b>, not by "big enough".</p>`,
    clues: ['"Producer faster than consumer" → backpressure / bounded buffer', '"Out of memory after traffic spike" → unbounded queue', '"Latency grows but no errors" → queue is absorbing overload silently', '"Kafka consumer lag keeps growing" → consumer slower than producers: scale consumers or throttle', '"Return 429 / 503 with Retry-After" → rejection with client back-off', '"Reactive streams", "request(n)", "onBackpressureDrop" → demand-driven flow control']
    ,
    code: [
      `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** A bounded work queue that REJECTS when full instead of growing - the heart of load shedding. */
class BoundedIntake {
    private final ArrayBlockingQueue<Runnable> queue;
    private final Thread[] workers;
    private final AtomicInteger accepted = new AtomicInteger();
    private final AtomicInteger rejected = new AtomicInteger();
    private volatile boolean running = true;

    BoundedIntake(int capacity, int workerCount) {
        queue = new ArrayBlockingQueue<>(capacity);
        workers = new Thread[workerCount];
        for (int i = 0; i < workerCount; i++) {
            workers[i] = new Thread(() -> {
                while (running || !queue.isEmpty()) {
                    try {
                        Runnable job = queue.poll(50, TimeUnit.MILLISECONDS);   // wait a little, then re-check running
                        if (job != null) job.run();
                    } catch (InterruptedException e) { return; }
                }
            }, "worker-" + i);
            workers[i].start();
        }
    }

    /** Returns false immediately when the queue is full (caller should answer 429/503). */
    boolean submit(Runnable job) {
        if (queue.offer(job)) { accepted.incrementAndGet(); return true; }
        rejected.incrementAndGet();
        return false;
    }

    void stop() throws InterruptedException {
        running = false;
        for (Thread w : workers) w.join();
    }

    public static void main(String[] args) throws Exception {
        BoundedIntake in = new BoundedIntake(5, 2);        // 5 waiting slots, 2 workers
        for (int i = 0; i < 30; i++) {                       // burst of 30 requests
            in.submit(() -> { try { Thread.sleep(20); } catch (InterruptedException e) { } });
        }
        in.stop();
        System.out.println("accepted=" + in.accepted + " rejected=" + in.rejected + " (queue never exceeded 5)");
    }
}`,
      { lang: 'java', check: false, title: 'Reactor: demand-driven flow and overflow strategies (framework code)', code: `Flux.range(1, 1_000_000)
    .onBackpressureBuffer(1000, dropped -> metrics.count("dropped"),   // bounded buffer, count overflow
                          BufferOverflowStrategy.DROP_OLDEST)
    .publishOn(Schedulers.boundedElastic(), 32)                        // prefetch only 32 at a time
    .flatMap(this::callSlowService, 8)                                 // at most 8 calls in flight
    .subscribe();

// Or let the slow consumer pull: request(n) tells the source how many it may send.
Flux.range(1, 100).subscribe(new BaseSubscriber<Integer>() {
    @Override protected void hookOnSubscribe(Subscription s) { request(10); }
    @Override protected void hookOnNext(Integer v) { process(v); if (v % 10 == 0) request(10); }
});` },
      { lang: 'js', run: true, title: 'Node-style producer/consumer with a high-water mark (runnable)', code: `// A tiny model of writable.write() returning false when the buffer is full.
class Sink {
  constructor(highWaterMark) { this.hwm = highWaterMark; this.buf = []; this.processed = 0; }
  write(x) { this.buf.push(x); return this.buf.length < this.hwm; }   // false = "stop, I'm full"
  drainOne() { if (this.buf.length) { this.buf.shift(); this.processed++; } }
}
const sink = new Sink(5);
let produced = 0, pauses = 0, maxBuf = 0;
for (let tick = 0; tick < 40; tick++) {
  // producer wants to send 3 items per tick, but obeys backpressure
  let sent = 0;
  while (sent < 3 && produced < 60) {
    const ok = sink.write(produced++); sent++;
    maxBuf = Math.max(maxBuf, sink.buf.length);
    if (!ok) { pauses++; break; }          // honour false: stop until the consumer drains
  }
  sink.drainOne(); sink.drainOne();        // consumer handles 2 per tick
}
console.log('produced', produced, 'processed', sink.processed, 'pauses', pauses, 'max buffer', maxBuf);` }
    ],
    codeTitle: ['Java: bounded queue with rejection', 'Reactor operators (framework)', 'JS: high-water mark and pause'],
    viz: [{
      title: 'Producer faster than consumer: bounded queue vs unbounded queue',
      input: '5 3 2 12',
      inputLabel: 'queue limit (0 = unbounded), arrivals per tick, served per tick, ticks',
      gen: function (input) {
        var a = nums(input, 4, 4, 'limit arrivals served ticks');
        var lim = a[0], arr = a[1], srv = a[2], ticks = a[3];
        if (lim < 0 || lim > 12 || arr < 1 || arr > 8 || srv < 1 || srv > 8 || ticks < 3 || ticks > 20) throw new Error('limit 0-12, arrivals 1-8, served 1-8, ticks 3-20');
        var q = [], id = 1, rejected = 0, frames = [], waitHist = [];
        for (var t = 1; t <= ticks; t++) {
          var served = 0;
          while (served < srv && q.length) { q.shift(); served++; }
          var rej = 0;
          for (var i = 0; i < arr; i++) {
            if (lim === 0 || q.length < lim) q.push(id++); else { rej++; rejected++; id++; }
          }
          var waitTicks = Math.ceil(q.length / srv);
          waitHist.push(q.length);
          var hl = {}; q.forEach(function (_, k) { hl[k] = (lim > 0 && k >= lim - 1) ? 'bad' : 'cur'; });
          frames.push({ narr: 'Tick ' + t + ': ' + arr + ' arrive, ' + served + ' served. Queue length <b>' + q.length + '</b> → newest waits ~<b>' + waitTicks + '</b> ticks. ' + (rej ? '<span class="c-r">' + rej + ' rejected (429).</span>' : (lim === 0 && arr > srv ? 'Nothing rejected... and nothing stops the growth.' : 'All accepted.')), parts: [
            { type: 'queue', label: lim ? 'Bounded queue (limit ' + lim + ')' : 'Unbounded queue', items: q.slice(0, 20), hl: hl, frontLabel: 'next served', backLabel: 'newest' },
            { type: 'bars', label: 'queue length over time', values: waitHist.slice(), hl: (function () { var h = {}; waitHist.forEach(function (v, k) { h[k] = lim && v >= lim ? 'bad' : (!lim && v > 10 ? 'bad' : 'win'); }); return h; })() },
            { type: 'vars', vals: { queued: q.length, rejected: rejected, newestWaitTicks: waitTicks }, hl: rejected ? { rejected: 'bad' } : (waitTicks > 5 ? { newestWaitTicks: 'bad' } : {}) }] });
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Queue size from a latency budget', html: `<p>Each job takes 10 ms, 4 workers → 400 jobs/s. Users give up after 500 ms. Max useful queue = 400 × 0.5 = <b>200</b> jobs; a bigger queue only holds requests that will already be abandoned. Better: even 50 (125 ms wait) keeps latency crisp.</p>${H.table(['workers', 'service', 'throughput', 'wait budget', 'queue cap'], [['4', '10 ms', '400/s', '500 ms', '≤ 200'], ['4', '10 ms', '400/s', '100 ms', '≤ 40']])}` },
      { title: 'Which end to drop? (LIFO vs FIFO under overload)', html: `<p>FIFO queues serve the oldest first - when overloaded, <i>every</i> request is old and everyone times out. <b>Drop oldest / serve newest (LIFO)</b> keeps some users happy: the freshest requests still have a patient user attached. Facebook-style "adaptive LIFO" switches to LIFO only when the queue is long.</p>` },
      { title: 'Client side: Retry-After and jittered back-off', html: `<p>Server answers <code>503 Retry-After: 2</code>. A good client waits ~2 s plus random jitter and uses exponential back-off (1, 2, 4, 8 s, capped). A naive client that retries instantly turns a small overload into a retry storm.</p>`, code: { lang: 'js', run: true, code: `function backoff(attempt, base = 100, cap = 5000) {
  const exp = Math.min(cap, base * 2 ** attempt);
  return Math.round(Math.random() * exp);          // "full jitter": random between 0 and exp
}
for (let a = 0; a < 6; a++) console.log('attempt', a, 'cap', Math.min(5000, 100 * 2 ** a), 'ms');` } }
    ],
    deepDive: `<p>🟣 <b>Queues turn throughput problems into latency problems - then into availability problems.</b> A system that is overloaded with an unbounded queue shows: rising latency → timeouts at the caller → callers <i>retry</i> → arrival rate rises → queue grows → <b>metastable failure</b>: even after the original spike ends, work-already-doomed (abandoned requests) keeps the system busy and it never recovers. Fixes: bounded queues, <b>deadlines</b> (drop a job whose client has given up before running it), retry budgets (retries ≤ 10% of traffic), and circuit breakers.</p>
      <p><b>Propagating backpressure end to end.</b> It only works if every hop respects it. A bounded queue in service B is useless if A's thread pool simply retries forever. Typical chain: HTTP 429 → client back-off → gateway rate limit → bounded executor → bounded DB pool → statement timeout. Each limit should be <i>smaller</i> toward the dependency (client 200, gateway 150, service 100, DB 50) so the cheapest layer rejects first.</p>
      <p><b>Reactive Streams contract.</b> Subscriber signals demand via <code>request(n)</code>; Publisher must never emit more than demand. Operators: <code>onBackpressureBuffer</code> (bounded!), <code>onBackpressureDrop</code>, <code>onBackpressureLatest</code>, <code>limitRate(n)</code>, <code>flatMap(fn, concurrency)</code>. Hot sources (mouse events, market ticks) cannot be paused, so you must pick drop/latest/buffer deliberately.</p>
      <p><b>Message brokers.</b> Kafka is pull-based: consumers fetch at their own pace, the log absorbs the burst (disk is the bounded buffer, with retention). Watch <b>consumer lag</b>. RabbitMQ uses <code>prefetch</code> (QoS) to limit unacked messages per consumer, and publisher confirms / flow control to push back on publishers. SQS has visibility timeout and no push - the queue is effectively unbounded, so alarm on age of oldest message.</p>
      <p><b>Priorities.</b> Under pressure, protect critical traffic: separate queues per priority, reserve capacity for health checks and payments, shed analytics and batch first. A single shared queue lets low-value work block high-value work (head-of-line blocking).</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM and embedding pipelines are textbook backpressure cases: ingestion is fast, model calls are slow and rate-limited (tokens per minute). Use a bounded queue plus a worker pool sized to the provider's rate limit; spill overflow to a durable queue (SQS/Kafka) instead of memory.</p>
      <p><b>Streaming tokens to browsers:</b> if a client reads slowly, the server's per-connection buffer grows. Respect backpressure on the stream (or drop the slow client) so one phone on bad Wi-Fi cannot consume gigabytes.</p>
      <p><b>Use AI as a partner:</b> ask it to review your pipeline for "every unbounded buffer and every retry without a budget". It is good at enumerating them; you decide the limits from measured capacity.</p>
      <p><b>Where AI goes wrong:</b> generated code defaults to <code>new LinkedBlockingQueue&lt;&gt;()</code>, <code>Executors.newCachedThreadPool()</code> (unbounded threads) and unlimited retries with fixed sleeps. Treat each as a bug until a limit is shown.</p>`,
    problems: [{
      title: 'Add a Bounded Queue with Rejection',
      level: 'Medium', tags: ['backpressure', 'bounded queue', 'load shedding'], companies: ['Stripe', 'Atlassian'],
      statement: `<p>An order-import endpoint puts each request on <code>Executors.newFixedThreadPool(8)</code> (unbounded queue). During a sale, traffic is 3x normal; memory climbs and users wait minutes. Redesign the intake so the service stays healthy. State the queue size, rejection behaviour, response codes and what clients should do.</p>`,
      constraints: `8 workers, each job ~50 ms. Users abandon after 1 s. Jobs are not idempotent unless you add an idempotency key.`,
      example: `<p>Capacity = 8 / 0.05 = 160 jobs/s. Max useful queue = 160 × 0.5 s (leave half the budget for processing) = <b>80</b>. Beyond that: reject with <code>429</code> + <code>Retry-After</code>.</p>`,
      brute: { why: `<p>Leave the unbounded queue and "add more memory" or "more servers". If normal traffic already uses the 160 jobs/s capacity, 3x traffic grows the queue by about 320 jobs/s forever; wait time reaches minutes, every response is useless, memory ends in OutOfMemoryError and restarts lose all queued work.</p>` },
      mcq: { q: 'Queue is full. What should the API return?', options: ['429 or 503 with Retry-After, immediately', '200 OK and drop the job silently', 'Block the HTTP thread until space is free', 'Grow the queue by 2x'], answer: 0, explain: 'Fail fast and loudly so clients can back off; silent drops lose data and blocking ties up request threads.' },
      hints: [`<p>Capacity in jobs/second = workers / seconds per job.</p>`, `<p>Queue length ≈ capacity × the wait you can afford.</p>`, `<p>Recipe: ThreadPoolExecutor(8, 8, ..., ArrayBlockingQueue(80), AbortPolicy) → catch RejectedExecutionException → 429 + Retry-After + jitter hint; add idempotency keys; metrics for queue depth and rejects; autoscale on depth.</p>`],
      solution: {
        approach: `<p>Replace the fixed pool with a hand-built <code>ThreadPoolExecutor(8, 8, 0, ms, new ArrayBlockingQueue&lt;&gt;(80), new AbortPolicy())</code>. Capacity is 160 jobs/s; an 80-slot queue means a job waits at most ~0.5 s, leaving the rest of the 1 s budget for work. When <code>execute</code> throws <code>RejectedExecutionException</code>, return <b>429 Too Many Requests</b> (or 503) with <code>Retry-After</code> and a small random jitter so clients do not return in sync. Because retries can duplicate non-idempotent jobs, require an <code>Idempotency-Key</code> header and store processed keys. For work that must not be lost (orders), persist to a durable queue (Kafka/SQS) at intake and acknowledge with 202 Accepted instead of dropping. Add metrics - queue depth, wait time, reject count - and alert when rejects &gt; 0 for minutes; use depth to trigger autoscaling. Drop jobs whose client deadline has already passed before running them.</p>`,
        code: `import java.util.concurrent.*;
class Intake {
    static final ThreadPoolExecutor POOL = new ThreadPoolExecutor(8, 8, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(80), new ThreadPoolExecutor.AbortPolicy());

    /** returns HTTP status */
    static int handle(Runnable job) {
        try { POOL.execute(job); return 202; }
        catch (RejectedExecutionException e) { return 429; }   // plus Retry-After header in a real controller
    }
    public static void main(String[] a) {
        int ok = 0, no = 0;
        for (int i = 0; i < 200; i++) { if (handle(() -> { try { Thread.sleep(50); } catch (InterruptedException e) { } }) == 202) ok++; else no++; }
        System.out.println("accepted=" + ok + " rejected=" + no);
        POOL.shutdownNow();
    }
}`,
        complexity: `<p>O(1) per submit. Memory is bounded: at most 80 queued + 8 running jobs.</p>`,
        followUps: ['Which jobs would you drop first under extreme overload?', 'How would you test this behaviour?']
      }
    }]
  });

  /* ================= TOPIC 5: load testing & percentiles ================= */
  topics.push({
    title: 'Load Testing and Latency Percentiles (p50, p95, p99)',
    analogy: `<p>A school says "average commute is 20 minutes". Sounds fine - but 1 student in 100 spends 2 hours on a broken bus. The <b>average</b> hides that unhappy student; the <b>p99</b> shows them. A <b>load test</b> is a fire drill: you send a crowd through the building on purpose, with a stopwatch, <i>before</i> the real fire.</p>`,
    explain: `<p>🟢 <b>Percentiles.</b> Sort all request times from fastest to slowest. <b>p50</b> (median) = the time that 50% of requests beat. <b>p95</b> = 95% were faster; the slowest 5% are slower. <b>p99</b> = only 1 in 100 is slower.</p>
      ${H.table(['Sorted latencies (ms)', '10', '12', '12', '13', '14', '15', '16', '20', '45', '900'], [['rank', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']])}
      <p>Here p50 ≈ 14 ms (fine), but the worst 10% includes a 900 ms outlier. <b>Averages</b> (mean = 105 ms) describe nobody. Always report p50, p95, p99 (and max).</p>
      <p><b>Why tails matter.</b> One page view often makes 20-50 backend calls. If each call has a 1% chance of being slow, a page with 50 calls hits at least one slow call 1 − 0.99<sup>50</sup> ≈ <b>40%</b> of the time. The tail becomes the typical experience.</p>
      <p>🔵 <b>Types of load test.</b></p>
      <ul><li><b>Smoke</b>: 1-5 users, does the script even work?</li><li><b>Load</b>: expected peak traffic for 10-30 min - do we meet the SLO?</li><li><b>Stress</b>: keep ramping until it breaks - where is the limit and how does it fail?</li><li><b>Spike</b>: sudden 10x burst - does it recover?</li><li><b>Soak</b>: normal load for hours - memory leaks, connection leaks, slow disks.</li></ul>
      <p><b>Tools.</b> <b>k6</b> (JavaScript scripts, great for CI, runs as one binary), <b>Gatling</b> (code-as-tests in Java/Scala/Kotlin, strong reports), <b>Apache JMeter</b> (GUI + XML plans, huge plugin ecosystem, heavier), plus <b>wrk/hey/vegeta</b> for quick one-liners, <b>Locust</b> (Python).</p>
      <p><b>A good test is realistic:</b> real mix of endpoints, realistic data (not the same user id every time - everything hits the cache), think time, production-like database size, ramp-up, and the load generator on a <i>separate</i> machine so it is not the bottleneck itself.</p>`,
    clues: ['"p99 latency", "tail latency", "SLO of 200 ms at p95" → percentiles, not averages', '"Find the breaking point" → stress test with ramping arrival rate', '"Memory grows over hours" → soak test', '"Black Friday traffic" → spike test + autoscaling check', '"Throughput stops growing as users increase" → saturation (knee of the curve)', '"The test showed great numbers but production is slow" → unrealistic data, cache-warm, coordinated omission']
    ,
    code: [
      `import java.util.*;

/** Percentile calculator: nearest-rank method on a sorted copy. */
class Percentiles {
    // Nearest-rank: rank = ceil(p/100 * n), 1-based. p must be in (0, 100].
    static long percentile(long[] sortedAsc, double p) {
        if (sortedAsc.length == 0) throw new IllegalArgumentException("no samples");
        int rank = (int) Math.ceil(p / 100.0 * sortedAsc.length);
        return sortedAsc[Math.max(1, rank) - 1];
    }

    public static void main(String[] args) {
        long[] ms = {12, 15, 11, 14, 900, 13, 16, 12, 45, 10, 20, 13, 14, 15, 13, 12, 11, 18, 14, 1200};
        long[] sorted = ms.clone();
        Arrays.sort(sorted);                                  // O(n log n); fine for offline analysis

        double mean = Arrays.stream(ms).average().orElse(0);
        System.out.printf("n=%d mean=%.1f ms (misleading!)%n", ms.length, mean);
        System.out.println("p50=" + percentile(sorted, 50) + " ms");
        System.out.println("p95=" + percentile(sorted, 95) + " ms");
        System.out.println("p99=" + percentile(sorted, 99) + " ms");
        System.out.println("max=" + sorted[sorted.length - 1] + " ms");
    }
}`,
      { lang: 'js', run: true, title: 'Percentile calculator + histogram (runnable)', code: `function percentile(sorted, p) {
  const rank = Math.ceil((p / 100) * sorted.length);          // nearest-rank, 1-based
  return sorted[Math.max(1, rank) - 1];
}
const lat = [12, 15, 11, 14, 900, 13, 16, 12, 45, 10, 20, 13, 14, 15, 13, 12, 11, 18, 14, 1200];
const sorted = [...lat].sort((a, b) => a - b);
const mean = lat.reduce((a, b) => a + b, 0) / lat.length;
console.log('mean', mean.toFixed(1), 'p50', percentile(sorted, 50), 'p95', percentile(sorted, 95), 'p99', percentile(sorted, 99), 'max', sorted[sorted.length - 1]);

// Fixed-width histogram (what Prometheus/HdrHistogram do with buckets)
const buckets = [10, 25, 50, 100, 500, 1000, Infinity];
const counts = new Array(buckets.length).fill(0);
for (const v of lat) counts[buckets.findIndex((b) => v <= b)]++;
buckets.forEach((b, i) => console.log('<= ' + String(b).padEnd(8) + '#'.repeat(counts[i]) + ' ' + counts[i]));` },
      { lang: 'python', run: true, title: 'Percentiles in Python, and the "50 calls per page" effect (runnable)', code: `import math

def percentile(sorted_vals, p):
    rank = math.ceil(p / 100 * len(sorted_vals))
    return sorted_vals[max(1, rank) - 1]

lat = sorted([12, 15, 11, 14, 900, 13, 16, 12, 45, 10, 20, 13, 14, 15, 13, 12, 11, 18, 14, 1200])
for p in (50, 90, 95, 99):
    print(f"p{p} = {percentile(lat, p)} ms")

# If each backend call is slow 1% of the time, how often is a page with N calls slow?
for n in (1, 10, 50, 100):
    print(f"{n:>3} calls -> {100 * (1 - 0.99 ** n):.0f}% of pages see a slow call")` },
      { lang: 'js', check: false, title: 'k6 script: ramping load with SLO thresholds (run with: k6 run script.js)', code: `import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-arrival-rate',   // fixed REQUEST RATE, not fixed users: avoids coordinated omission
      startRate: 20, timeUnit: '1s',
      preAllocatedVUs: 200, maxVUs: 1000,
      stages: [
        { target: 100, duration: '2m' },   // warm up
        { target: 400, duration: '5m' },   // expected peak
        { target: 800, duration: '3m' },   // stress
        { target: 0,   duration: '1m' },
      ],
    },
  },
  thresholds: {                            // the test FAILS (CI goes red) if the SLO is broken
    http_req_duration: ['p(95)<300', 'p(99)<800'],
    http_req_failed:   ['rate<0.01'],
  },
};

export default function () {
  const id = Math.floor(Math.random() * 100000);       // realistic spread of keys
  const res = http.get(__ENV.BASE_URL + '/products/' + id);   // base url from env, never hardcoded secrets
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(Math.random());                                 // think time
}` },
      { lang: 'bash', check: false, title: 'JMeter non-GUI run and Gatling (Java DSL) sketch', code: `# JMeter: design the plan in the GUI, RUN it headless (the GUI distorts results)
jmeter -n -t checkout.jmx -l results.jtl -e -o report/ -Jthreads=200 -Jrampup=120

# Gatling (Java DSL) - open-model injection = arrival rate, like k6's arrival-rate:
#   ScenarioBuilder s = scenario("browse").exec(http("product").get("/products/1"));
#   setUp(s.injectOpen(rampUsersPerSec(10).to(300).during(Duration.ofMinutes(5))))
#       .protocols(http.baseUrl(System.getenv("BASE_URL")))
#       .assertions(global().responseTime().percentile(95).lt(300));` }
    ],
    codeTitle: ['Java: percentile calculator with main()', 'JS: percentiles and histogram', 'Python: percentiles and tail amplification', 'k6 script with thresholds', 'JMeter / Gatling'],
    viz: [{
      title: 'Latency histogram with p50 / p95 / p99 markers',
      input: '12 15 11 14 900 13 16 12 45 10 20 13 14 15 13 12 11 18 14 1200 22 17 16 13 400',
      inputLabel: 'Latencies in ms (space separated, up to 60)',
      gen: function (input) {
        var v = nums(input, 5, 60, 'latencies in ms');
        var sorted = v.slice().sort(function (a, b) { return a - b; });
        var edges = [10, 20, 30, 50, 100, 250, 500, 1000, 100000];
        var names = ['≤10', '≤20', '≤30', '≤50', '≤100', '≤250', '≤500', '≤1000', '>1000'];
        var counts = edges.map(function () { return 0; });
        v.forEach(function (x) { for (var i = 0; i < edges.length; i++) if (x <= edges[i]) { counts[i]++; break; } });
        function bucketOf(x) { for (var i = 0; i < edges.length; i++) if (x <= edges[i]) return i; return edges.length - 1; }
        var p50 = pctile(sorted, 50), p95 = pctile(sorted, 95), p99 = pctile(sorted, 99);
        var mean = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
        var frames = [];
        frames.push({ narr: 'We have <b>' + v.length + '</b> request times. First <b>sort</b> them. Percentile = pick the value at rank ceil(p% × n).', parts: [{ type: 'array', label: 'sorted latencies (ms)', values: sorted.slice(0, 40), hl: (function () { var h = {}; h[Math.ceil(0.5 * sorted.length) - 1] = 'ok'; h[Math.ceil(0.95 * sorted.length) - 1] = 'cur'; h[Math.ceil(0.99 * sorted.length) - 1] = 'bad'; return h; })() }] });
        frames.push({ narr: 'Drop each time into a bucket. Most requests are fast and form a tall bar on the left; a few slow ones form the <b>long tail</b> on the right.', parts: [{ type: 'bars', label: 'requests per latency bucket (ms)', values: counts.slice(), idxLabels: names }] });
        function marked(upto) {
          var hl = {};
          if (upto >= 1) hl[bucketOf(p50)] = 'ok';
          if (upto >= 2) hl[bucketOf(p95)] = 'cur';
          if (upto >= 3) hl[bucketOf(p99)] = 'bad';
          return { type: 'bars', label: 'histogram with markers', values: counts.slice(), idxLabels: names, hl: hl };
        }
        frames.push({ narr: '<b>p50 = ' + p50 + ' ms</b> (green): half of users are at least this fast. This is the "typical" experience.', parts: [marked(1), { type: 'vars', vals: { p50: p50 + ' ms' }, hl: { p50: 'ok' } }] });
        frames.push({ narr: '<b>p95 = ' + p95 + ' ms</b> (amber): 1 user in 20 waits longer. Many SLOs are written at p95.', parts: [marked(2), { type: 'vars', vals: { p50: p50 + ' ms', p95: p95 + ' ms' }, hl: { p95: 'cur' } }] });
        frames.push({ narr: '<b>p99 = ' + p99 + ' ms</b> (red): 1 in 100 waits this long or more. Tail = timeouts, GC pauses, cold caches, lock waits.', parts: [marked(3), { type: 'vars', vals: { p50: p50 + ' ms', p95: p95 + ' ms', p99: p99 + ' ms' }, hl: { p99: 'bad' } }] });
        frames.push({ narr: 'The <b>mean is ' + mean.toFixed(0) + ' ms</b> - a number almost nobody experienced. It is dragged up by outliers yet hides them. Report percentiles.', parts: [marked(3), { type: 'table', label: 'Summary', columns: ['metric', 'ms'], rows: [['mean (misleading)', mean.toFixed(0)], ['p50', p50], ['p95', p95], ['p99', p99], ['max', sorted[sorted.length - 1]]], hl: { 0: 'done', 3: 'bad' } }] });
        return frames;
      }
    }, {
      title: 'Throughput vs latency as load rises (find the knee)',
      input: '50 100 200 300 400 500',
      inputLabel: 'Offered load levels (req/s). Capacity is 350 req/s.',
      gen: function (input) {
        var loads = nums(input, 2, 10, 'offered load values');
        var cap = 350, frames = [], tp = [], p95 = [];
        loads.forEach(function (l) {
          var served = Math.min(l, cap), rho = Math.min(0.99, l / cap);
          var lat = Math.round(40 + 40 * rho / (1 - rho)); // service 40ms, queueing grows like rho/(1-rho)
          if (l > cap) lat = 3000;
          tp.push(served); p95.push(Math.min(lat, 3000));
          var hl = {}; p95.forEach(function (x, i) { hl[i] = x > 300 ? 'bad' : 'ok'; });
          frames.push({ narr: 'Offered <b>' + l + '</b> req/s → served <b>' + served + '</b>, p95 ≈ <b>' + Math.min(lat, 3000) + ' ms</b>. ' + (l > cap ? '<span class="c-r">Past capacity: throughput flat, latency explodes, errors/timeouts start.</span>' : rho > 0.8 ? 'Utilisation above 80%: latency starts curving up (the knee).' : 'Comfortable.'), parts: [
            { type: 'bars', label: 'throughput served (req/s)', values: tp.slice(), idxLabels: loads.slice(0, tp.length).map(String) },
            { type: 'bars', label: 'p95 latency (ms)', values: p95.slice(), hl: hl, idxLabels: loads.slice(0, p95.length).map(String) }] });
        });
        frames.push({ narr: 'Plan to run at about 60-70% of the knee so a spike or one dead instance does not push you over.', parts: [{ type: 'text', html: '<b>Capacity planning rule:</b> peak load ≤ ~65% of the load at the knee.' }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Compute p95 and p99 by hand', html: `<p>20 samples sorted, n = 20. p95 rank = ceil(0.95 × 20) = <b>19</b> → the 19th smallest. p99 rank = ceil(0.99 × 20) = <b>20</b> → the max. With only 20 samples p99 equals the max, so p99 needs <b>at least ~1,000 samples</b> to mean anything.</p>${H.table(['n', 'p95 rank', 'p99 rank'], [['20', '19', '20'], ['100', '95', '99'], ['1000', '950', '990']])}` },
      { title: 'Averages of percentiles are wrong', html: `<p>Server A p99 = 100 ms, server B p99 = 900 ms. The fleet p99 is <i>not</i> 500 ms. Percentiles cannot be averaged. Merge histograms (HdrHistogram, Prometheus <code>histogram_quantile</code> over summed buckets) and then compute the percentile.</p>` },
      { title: 'Coordinated omission', html: `<p>A closed-loop tester with 10 users waits for each response before sending the next. When the server stalls for 5 s, the tester also stops sending, so it records <i>one</i> slow request instead of the hundreds that real clients would have sent and suffered. Your p99 looks great and is a lie. Use an <b>open model</b> (fixed arrival rate: k6 <code>constant-arrival-rate</code>, Gatling <code>injectOpen</code>, wrk2) and correct for the intended send time.</p>` }
    ],
    deepDive: `<p>🟣 <b>Computing percentiles at scale.</b> Sorting all samples does not work for billions of requests. Options: <b>HdrHistogram</b> (log-linear buckets with fixed relative error, mergeable), <b>t-digest / DDSketch</b> (mergeable sketches with accuracy guarantees at the tails), or <b>Prometheus histograms</b> (pick bucket boundaries around your SLO, e.g. 50, 100, 200, 300, 500, 1000 ms; accuracy is limited to bucket width). Never store only a precomputed p99 per minute and average it over hours.</p>
      <p><b>Open vs closed workload models.</b> Closed: N virtual users, each loops request → wait → think. Throughput self-limits, hiding overload. Open: requests arrive at rate λ regardless of replies - this matches real internet traffic and exposes queue growth. Use closed only when the real system really has a fixed user count (a call centre).</p>
      <p><b>What to watch during a test:</b> not just the client side. Server CPU per core, GC time and pause p99, thread pool active/queue, DB connection pool wait, DB CPU / slow queries / lock waits, network, and error rate by type. The bottleneck is the first resource to saturate: <b>USE</b> method (Utilisation, Saturation, Errors). Correlate time-aligned graphs.</p>
      <p><b>Realism pitfalls:</b> warm-up (JIT, caches, connection pools) - discard the first minutes; test data distribution (Zipf-like hot keys vs uniform); DNS or TLS handshake per request (reuse connections like real clients); load generator CPU limits (watch generator CPU &lt; 70%); tiny dev database (query plans differ); client rate limits and WAF blocking the generator; testing against production safely (shadow traffic, tagged synthetic accounts, kill switch).</p>
      <p><b>SLOs and error budgets.</b> Define "99% of checkout requests complete under 300 ms over 30 days". The 1% is your error budget: if the load test shows you burn it in a day, you do not ship. Put a short k6 smoke + threshold test in CI to catch regressions per commit, and a full stress test before big events. Always write down: test goal, environment, data, load profile, pass/fail thresholds, result.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can write a first k6/Gatling script from an OpenAPI spec or HAR file in seconds, and summarise a long result report. It can also generate varied, realistic test data (names, addresses, query phrases).</p>
      <p><b>Load testing LLM-backed endpoints is different:</b> latency is seconds and varies with output length, so measure <b>time to first token</b> and <b>tokens/second</b>, not only total time; costs per test run are real money (use a mock model server or a cheap model for capacity tests); provider rate limits (RPM/TPM) are your real ceiling; and caching (semantic or prompt) changes results dramatically - test with realistic prompt diversity.</p>
      <p><b>Use AI as a partner:</b> paste the k6 summary and ask "which metric first shows saturation, and what would you look at next?" Treat the answer as a hypothesis list.</p>
      <p><b>Where AI goes wrong:</b> generated scripts use closed loops with no think time (coordinated omission), hit one URL with one id (all cache hits), hardcode tokens in scripts (use environment variables and a secrets store), and forget thresholds, so the test "passes" while the SLO is broken.</p>`,
    problems: [{
      title: 'Compute p50, p95 and p99 and Judge the SLO',
      level: 'Easy', tags: ['percentiles', 'slo', 'load testing'], companies: ['Datadog', 'Shopify'],
      statement: `<p>A load test of 20 requests produced these latencies (ms): <code>10, 12, 11, 13, 12, 14, 15, 13, 12, 16, 11, 13, 14, 15, 12, 18, 20, 45, 900, 1200</code>. Compute the mean, p50, p95, p99 using the nearest-rank method. The SLO is "p95 &lt; 300 ms". Does the service pass? What would you do next?</p>`,
      constraints: `Nearest-rank: rank = ceil(p/100 × n), 1-based, on the sorted list.`,
      example: `${H.arr([10, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 18, 20, 45, 900, 1200], { label: 'sorted (n=20)', hl: { 9: 'g', 18: 'y', 19: 'r' } })}<p>p50 rank 10 → <b>13</b>. p95 rank 19 → <b>900</b>. p99 rank 20 → <b>1200</b>. Mean ≈ <b>119</b>. SLO fails.</p>`,
      brute: { why: `<p>Report the mean (119 ms) and declare "well under 300 ms, pass". The mean hides that 10% of requests (2 of 20) took 900 ms or more.</p>` },
      mcq: { q: 'Which statement is correct?', options: ['p95 = 900 ms, so the SLO fails', 'Mean 119 ms is under 300, so the SLO passes', 'p95 is the average of the slowest 5%', 'p99 can be computed reliably from 20 samples'], answer: 0, explain: 'Rank 19 of 20 is 900 ms. Also, 20 samples is far too few to trust p99.' },
      hints: [`<p>Sort first; then use the rank formula rank = ceil(p/100 × n).</p>`, `<p>ceil(0.95 × 20) = 19, ceil(0.99 × 20) = 20.</p>`, `<p>The test is also too small: gather thousands of samples, check the two slow ones (GC pause? cold connection? timeout?) with a trace or profile.</p>`],
      solution: {
        approach: `<p>Sorted list: 10, 11, 11, 12, 12, 12, 12, 13, 13, 13, 14, 14, 15, 15, 16, 18, 20, 45, 900, 1200. Mean = 2,376 / 20 ≈ 119 ms. p50: rank ceil(10) = 10 → 13 ms. p95: rank ceil(19) = 19 → 900 ms. p99: rank 20 → 1200 ms. The SLO (p95 &lt; 300 ms) is <b>violated</b>: 10% of requests are in the tail even though the typical request is 13 ms, which is a classic fast-typical, slow-tail pattern. Next steps: run a longer test to get thousands of samples (p99 from 20 samples is just the max); check whether the slow requests cluster in time (GC pause, deployment, cold start) or by endpoint/key (slow query, lock); look at traces for the 900+ ms requests; check coordinated omission in the tool; then fix and re-test with the same profile and thresholds in CI.</p>`,
        code: { lang: 'python', run: true, code: `import math
lat = sorted([10,12,11,13,12,14,15,13,12,16,11,13,14,15,12,18,20,45,900,1200])
p = lambda q: lat[max(1, math.ceil(q/100*len(lat))) - 1]
print("mean", sum(lat)/len(lat), "p50", p(50), "p95", p(95), "p99", p(99))` },
        complexity: `<p>Sorting O(n log n); percentile lookup O(1). At scale use histograms/sketches.</p>`,
        followUps: ['How many samples do you need for a trustworthy p99.9?', 'Why can you not average p99 across servers?']
      }
    }]
  });

  /* ================= TOPIC 6: connection limits & horizontal scaling ================= */
  topics.push({
    title: 'Connection Limits and Horizontal Scaling',
    analogy: `<p>A restaurant has 50 chairs (<b>connections</b>) and one kitchen with 20 stoves (<b>database connections</b>). Hiring more waiters (app servers) does not help if the kitchen has only 20 stoves - and if each of 10 new waiters grabs 20 stoves "just in case", the kitchen is overbooked at 200. <b>Horizontal scaling</b> is opening a second identical restaurant branch with a door person (<b>load balancer</b>) sending guests to whichever branch has space. It works only if branches do not keep guests' coats in a private cloakroom (<b>no local state</b>).</p>`,
    explain: `<p>🟢 <b>Vertical scaling</b> = a bigger machine (more CPU/RAM). Simple, but has a ceiling and is a single point of failure. <b>Horizontal scaling</b> = more machines behind a load balancer. Almost unlimited, gives redundancy, but your app must be <b>stateless</b>: sessions in Redis/JWT, uploads in object storage, no in-memory-only data, any instance can serve any request.</p>
      <p>🔵 <b>Every layer has a connection limit.</b> Trace one request:</p>
      ${H.table(['Layer', 'Typical limit', 'What happens when exceeded'], [['Load balancer', 'connections per second, total conns', 'new connects refused / queued'], ['Web server (Tomcat)', 'maxThreads 200, acceptCount 100, maxConnections 8192', 'requests wait, then connection refused'], ['HTTP client pool', 'maxConnPerRoute (e.g. 20)', 'threads wait for a free connection'], ['DB pool (HikariCP)', 'maximumPoolSize 10-20 per instance', 'getConnection() times out (30 s default)'], ['Database server', 'max_connections 100-500 (Postgres)', '"too many clients" errors'], ['OS', 'open file descriptors (ulimit -n)', '"Too many open files"']])}
      <p><b>The multiplication trap:</b> 30 app instances × pool of 20 = <b>600</b> DB connections. Postgres allocates a process (~10 MB) per connection and slows down well before 600. Fix: smaller per-instance pools, a connection pooler (<b>PgBouncer</b>, RDS Proxy) in transaction mode, or fewer bigger instances.</p>
      <p><b>Sizing a DB pool:</b> counter-intuitively small. A common rule (HikariCP wiki): <code>connections ≈ (core_count × 2) + effective_spindle_count</code> for the <i>database</i> server - often 10-20 total is plenty. Little's law: 500 req/s × 5 ms per query = 2.5 connections busy on average.</p>
      <p><b>Autoscaling.</b> Add instances when load rises, remove when it falls. Signals: CPU %, requests per instance, queue depth, p95 latency. Kubernetes HPA formula: <code>desired = ceil(current × currentMetric / targetMetric)</code>. Keep a minimum (for availability), a maximum (for cost and for the DB's sake), scale <i>up fast</i>, scale <i>down slowly</i> (cooldown) to avoid flapping.</p>
      <p><b>Load balancing algorithms:</b> round-robin, least connections, least outstanding requests, consistent hashing (cache affinity). Health checks remove dead instances; a <b>readiness probe</b> must fail while the app is warming up or overloaded.</p>`,
    clues: ['"Add more servers" → need stateless services + load balancer + shared state store', '"Too many connections" / "connection pool exhausted" → pool limits × instance count, PgBouncer', '"Scale down the DB pool?" → Little\'s law: connections = qps × query time, small is fine', '"Traffic doubles at 9 am daily" → scheduled scaling + metric-based HPA', '"Scaling works but DB falls over" → the shared bottleneck moves down the stack', '"Sticky sessions" → red flag for horizontal scaling; externalise state']
    ,
    code: [
      { lang: 'yaml', check: false, title: 'Kubernetes HPA: scale on CPU, fast up, slow down', code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: orders-api }
  minReplicas: 3            # never below 3: survives a node loss
  maxReplicas: 20           # cap: protects the database and the bill
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 65 } }
  behavior:
    scaleUp:   { stabilizationWindowSeconds: 0,   policies: [{ type: Percent, value: 100, periodSeconds: 30 }] }
    scaleDown: { stabilizationWindowSeconds: 300, policies: [{ type: Percent, value: 20,  periodSeconds: 60 }] }` },
      { lang: 'bash', check: false, title: 'Connection pool settings (Spring Boot application.properties) - values from env, no secrets in files', code: `# Small pool per instance: instances x pool must stay under the DB limit
spring.datasource.hikari.maximum-pool-size=15
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=2000     # ms: fail fast if no connection (default 30000)
spring.datasource.hikari.max-lifetime=1500000        # recycle before the DB/LB kills idle conns
spring.datasource.url=\${DB_URL}
spring.datasource.username=\${DB_USER}
spring.datasource.password=\${DB_PASSWORD}
server.tomcat.threads.max=200
server.tomcat.accept-count=100
server.tomcat.max-connections=8192` },
      { lang: 'python', run: true, title: 'Autoscaler + connection budget calculator (runnable)', code: `import math

def desired_replicas(current, metric, target, lo, hi):
    # Kubernetes HPA formula
    return max(lo, min(hi, math.ceil(current * metric / target)))

def db_budget(instances, pool, db_max, reserved=10):
    total = instances * pool
    return total, db_max - reserved, total <= db_max - reserved

# CPU is 90% on 4 pods, target 65%
print("desired pods:", desired_replicas(4, 90, 65, 3, 20))
# 30 pods x pool 20 against Postgres max_connections=200 (10 reserved for admin/replication)
print("connections, allowed, ok?:", db_budget(30, 20, 200))
print("with pool 5:", db_budget(30, 5, 200))
# Little's law for the DB pool: qps * query seconds
print("busy connections at 800 qps x 6 ms:", 800 * 0.006)` }
    ],
    codeTitle: ['Kubernetes HPA', 'Pool and Tomcat settings', 'Python: autoscaler and connection budget'],
    viz: [{
      title: 'Autoscaling: replicas follow load (with cooldown)',
      input: '100 150 400 900 1200 700 300 150 100',
      inputLabel: 'Load (req/s) per minute. Each replica handles 100 req/s, target 70%, min 2, max 12',
      gen: function (input) {
        var load = nums(input, 3, 14, 'load values');
        var per = 100, target = 0.7, lo = 2, hi = 12, rep = lo, calmSteps = 0, frames = [];
        var L = [], R = [], C = [];
        load.forEach(function (l, i) {
          var desired = Math.max(lo, Math.min(hi, Math.ceil(l / (per * target))));
          var action;
          if (desired > rep) { rep = desired; calmSteps = 0; action = 'scale UP to ' + rep + ' (immediately)'; }
          else if (desired < rep) { calmSteps++; if (calmSteps >= 2) { rep = Math.max(desired, rep - 2); calmSteps = 0; action = 'scale down by up to 2 (after cooldown)'; } else action = 'wanted ' + desired + ' but waiting out the cooldown'; }
          else { calmSteps = 0; action = 'steady'; }
          L.push(l); R.push(rep * per); C.push(rep);
          var hl = {}; L.forEach(function (x, j) { hl[j] = x > R[j] ? 'bad' : 'ok'; });
          var over = l > rep * per;
          frames.push({ narr: 'Minute ' + (i + 1) + ': load <b>' + l + '</b> req/s, ' + (over ? '<span class="c-r">capacity only ' + rep * per + ' → overloaded</span>' : 'capacity ' + rep * per + ' ok') + '. Autoscaler: ' + action + '. Replicas = <b>' + rep + '</b>.', parts: [
            { type: 'bars', label: 'load (red = more than capacity)', values: L.slice(), hl: hl },
            { type: 'bars', label: 'capacity = replicas × 100', values: R.slice(), texts: C.map(function (c) { return c + ' pods'; }) },
            { type: 'vars', vals: { replicas: rep, desired: desired, maxCap: hi * per }, hl: over ? { replicas: 'bad' } : { replicas: 'ok' } }] });
        });
        return frames;
      }
    }, {
      title: 'Connection budget: instances x pool vs database limit',
      input: '10 10 100',
      inputLabel: 'app instances, pool size per instance, database max_connections',
      gen: function (input) {
        var a = nums(input, 3, 3, 'instances pool dbMax');
        var inst = a[0], pool = a[1], dbMax = a[2];
        if (inst < 1 || inst > 40 || pool < 1 || pool > 50 || dbMax < 10 || dbMax > 1000) throw new Error('instances 1-40, pool 1-50, db 10-1000');
        var frames = [], nodes = [{ id: 'LB', label: 'Load Balancer', x: 12, y: 25, shape: 'box' }, { id: 'A', label: 'App x' + inst, x: 45, y: 25, shape: 'box' }, { id: 'P', label: 'Pooler?', x: 70, y: 25, shape: 'box' }, { id: 'DB', label: 'DB max ' + dbMax, x: 90, y: 25, shape: 'box' }];
        var total = inst * pool, ok = total <= dbMax - 10;
        frames.push({ narr: 'Traffic enters through the load balancer and spreads over <b>' + inst + '</b> app instances.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['LB', 'A'], ['A', 'DB']], ehl: { 'LB-A': 'ok' } }] });
        frames.push({ narr: 'Each instance keeps a pool of <b>' + pool + '</b> DB connections open. Total = ' + inst + ' × ' + pool + ' = <b>' + total + '</b>.', parts: [{ type: 'bars', label: 'connections', values: [total, dbMax - 10, dbMax], idxLabels: ['wanted', 'usable (10 reserved)', 'DB max'], hl: { 0: ok ? 'ok' : 'bad' } }] });
        frames.push({ narr: ok ? '<span class="c-g">Fits.</span> But adding instances multiplies this number - autoscaling to 3x gives ' + total * 3 + (total * 3 > dbMax - 10 ? ' (too many!)' : ' (ok)') + '.' : '<span class="c-r">Too many connections:</span> the DB refuses ' + (total - (dbMax - 10)) + ' of them ("too many clients"). Requests fail or wait.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['LB', 'A'], ['A', 'DB']], hl: { DB: ok ? 'ok' : 'bad' }, ehl: { 'A-DB': ok ? 'ok' : 'bad' } }] });
        var safePool = Math.max(1, Math.floor((dbMax - 10) / Math.min(40, inst * 3)));
        frames.push({ narr: 'Fix options: shrink the pool (<b>' + safePool + '</b> per instance still allows 3x autoscale), or put <b>PgBouncer/RDS Proxy</b> between app and DB so thousands of app connections share ~20 real ones.', parts: [{ type: 'graph', directed: true, height: 50, nodes: nodes, edges: [['LB', 'A'], ['A', 'P'], ['P', 'DB']], ehl: { 'A-P': 'ok', 'P-DB': 'ok' }, tags: { P: 'multiplexes' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Autoscaling cannot fix a shared bottleneck', html: `<p>Orders API scales 4 → 20 pods in two minutes. DB CPU hits 100% because every pod runs the same heavy query; latency gets <i>worse</i>. Horizontal scaling only helps if the extra instances do independent work. Fix the query/cache, add read replicas, then scale.</p>` },
      { title: 'Stateless checklist', html: `<ul><li>Sessions: JWT or Redis, not <code>HttpSession</code> in memory.</li><li>Files: S3/object storage, not local disk.</li><li>Schedules: one scheduler via leader election or a lock (ShedLock), not every pod running the cron.</li><li>Caches: shared (Redis) or tolerated-per-instance (small local cache with TTL).</li><li>Config: environment variables, same image everywhere.</li></ul>` },
      { title: 'Graceful scale-down and deploys', html: `<p>When a pod is removed: stop accepting new requests (readiness fails), finish in-flight ones, then exit. In Spring Boot: <code>server.shutdown=graceful</code> and <code>spring.lifecycle.timeout-per-shutdown-phase=30s</code>; in Kubernetes: <code>terminationGracePeriodSeconds</code> longer than that, plus a short <code>preStop</code> sleep so the load balancer stops routing before the app stops.</p>`, code: { lang: 'bash', check: false, code: `server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s` } }
    ],
    deepDive: `<p>🟣 <b>Amdahl and the Universal Scalability Law.</b> Perfect linear scaling needs zero shared work. Any serial part (a single DB primary, a global lock, one Kafka partition for ordered events) caps speed-up at 1/serial-fraction: 5% serial → max 20x no matter how many nodes. USL adds a <i>coherency</i> penalty (nodes talking to each other), so throughput can <b>drop</b> when you add nodes. Design to partition work: shard by tenant/user id, keep requests independent.</p>
      <p><b>Autoscaling realities.</b> Pods take 30-90 s to start (image pull, JVM warm-up, cache fill), so reactive scaling is always late - keep headroom, use scheduled/predictive scaling for known peaks (KEDA cron, AWS predictive scaling), keep warm pools, and consider GraalVM native or CRaC to cut startup. CPU is a poor signal for I/O-bound apps (CPU stays low while threads are all waiting): scale on <b>requests per pod, in-flight requests, queue lag</b> (KEDA with Kafka lag) or latency. Add <code>PodDisruptionBudget</code>, topology spread across zones, and set requests/limits so the scheduler packs correctly. JVM in containers: heap sizing with <code>-XX:MaxRAMPercentage=70</code>, and watch CPU throttling (cgroup limits) which silently adds latency.</p>
      <p><b>Load balancer detail.</b> L4 (TCP) vs L7 (HTTP) balancing; HTTP/2 multiplexes many requests on one connection, so connection-based balancing becomes uneven - use per-request balancing (gRPC clients need L7 or client-side LB). Keep-alive reuse, idle timeouts (LB 60 s vs app 30 s mismatch causes random 502s), slow-start for new instances, outlier ejection, connection draining.</p>
      <p><b>Pool theory.</b> More DB connections than the DB has cores just creates internal contention (the famous "pool size of 10 beats 10,000" result). The pool should be as small as sustains throughput, with a bounded wait (<code>connection-timeout</code> 1-2 s) so overload turns into fast errors rather than stacked threads. Beware long transactions holding connections while calling remote services - a classic path to pool exhaustion; do the remote call outside the transaction.</p>
      <p><b>Scaling the data tier</b> is the hard part: read replicas (replication lag, read-your-writes), caching, partitioning/sharding, CQRS, async writes via queues. Scale the stateless tier first because it is cheap, but know the next ceiling before launch day.</p>`,
    aiEra: `<p><b>What AI changes:</b> inference is a new scaling dimension: GPUs are scarce, model servers batch requests, and cold starts load gigabytes of weights (minutes!). Autoscaling LLM replicas uses queue depth or tokens/sec, not CPU, and capacity is often reserved ahead. Your regular API tier mostly just forwards, so protect it with concurrency caps and timeouts for slow model calls.</p>
      <p><b>Use AI as a partner:</b> have it draft HPA/KEDA manifests, then ask it to explain each number and what happens during a 10x spike. It is also handy for turning an incident timeline into a capacity plan.</p>
      <p><b>Where AI goes wrong:</b> it suggests "just autoscale" for DB-bound problems, sets <code>maxReplicas: 100</code> without checking connection budgets, scales on CPU for I/O-bound services, or recommends sticky sessions. Check every autoscaler change against the slowest shared dependency.</p>`,
    problems: [{
      title: 'Find the Bottleneck in a Request Path',
      level: 'Hard', tags: ['bottleneck', 'connection pool', 'scaling'], companies: ['Amazon', 'Uber', 'Booking.com'],
      statement: `<p>During a sale an API with 10 pods (each: Tomcat 200 threads, Hikari pool 20) is slow. Observations: pod CPU 25%, DB CPU 40%, Postgres <code>max_connections=150</code> and "remaining connection slots are reserved" / "too many clients" errors, Hikari "connection not available" timeouts after 30 s, p95 latency 12 s, request rate 800/s, avg query time 8 ms. Where is the bottleneck and what do you change?</p>`,
      constraints: `Cannot raise max_connections beyond 200 safely. Traffic may double next week.`,
      example: `${H.table(['Check', 'Value', 'Meaning'], [['pods x pool', '10 × 20 = 200', '<span class="c-r">> 150 DB limit</span>'], ['busy connections (Little)', '800 × 0.008 = 6.4', 'only ~7 needed!'], ['CPU', '25% / 40%', 'nobody is compute-bound']])}<p>The limit is a <b>connection-slot starvation</b>, not capacity: pools are too big, and connections are likely held too long (slow remote calls inside transactions).</p>`,
      brute: { why: `<p>"Scale to 30 pods and double max_connections" - 30 pods × 20 = 600 connections requested from a DB that cannot serve them. It makes the failure worse and costs more.</p>` },
      mcq: { q: 'CPU is low everywhere, yet p95 is 12 s with pool-timeout errors. Most likely?', options: ['Waiting on a scarce connection (pool/DB slots), likely held too long', 'JIT is not warmed up', 'Network bandwidth', 'Disk full'], answer: 0, explain: 'Low CPU with long waits means threads are blocked on a limited resource; the errors name the connection pool.' },
      hints: [`<p>Little's law for the DB: connections busy = qps × query time.</p>`, `<p>Total requested connections = pods × pool. Compare with max_connections.</p>`, `<p>Why would connections be held far longer than 8 ms? Look for remote calls, big result sets, or idle-in-transaction. Plan: shrink pools, add PgBouncer, shorten transactions, lower the pool timeout, then re-test.</p>`],
      solution: {
        approach: `<p>Diagnosis: demand for connections is tiny (800 qps × 8 ms ≈ 6.4 busy), but we request 10 × 20 = 200 against a limit of 150, so some pods cannot even open their pool ("too many clients"), and requests wait 30 s for the pool. Since average work needs only about 7 connections, connections must be held much longer than the query time - probably transactions that call other services or run business logic while holding the connection ("idle in transaction"), which <code>pg_stat_activity</code> would show. Fix steps: (1) check <code>pg_stat_activity</code> for state and duration; (2) move remote calls and heavy logic outside transactions, keep transactions short; (3) shrink Hikari to ~8-10 per pod (80-100 total) and set <code>connection-timeout</code> to 1-2 s with a bounded request queue so overload fails fast; (4) put PgBouncer (transaction pooling) in front so autoscaling does not multiply connections; (5) set a statement timeout and idle_in_transaction_session_timeout; (6) add dashboards for pool wait time and active/idle counts; (7) re-run a load test at 2x traffic. Scaling pods will not help until the connection budget is fixed.</p>`,
        complexity: `<p>Analysis by Little's law; fix cost is configuration plus a short code change.</p>`,
        followUps: ['How would you detect this before the sale?', 'What changes if the app uses HTTP/2 and a service mesh?']
      }
    }]
  });

  /* ================= TOPIC 7: graceful degradation & load shedding ================= */
  topics.push({
    title: 'Graceful Degradation and Load Shedding',
    analogy: `<p>When a theatre is overfull, the manager does not let the roof collapse. First the free popcorn stops, then standing room is closed, then the doors say "sold out". Guests with tickets still see the show. <b>Graceful degradation</b> is switching off the nice-to-haves so the essentials survive. <b>Load shedding</b> is the door person turning away excess guests <i>early and cheaply</i>, so the ones inside are served well - instead of letting everyone in and giving everyone a terrible night.</p>`,
    explain: `<p>🟢 No system has infinite capacity. When demand exceeds capacity you choose: <b>fail a little on purpose</b> or <b>fail everywhere by accident</b>. Good systems pick the first.</p>
      <p><b>The degradation ladder</b> (cheapest sacrifice first):</p>
      ${H.table(['Level', 'Behaviour', 'Example (shop)'], [['0 Normal', 'everything on', 'personalised recommendations, live stock, reviews'], ['1 Cached', 'serve slightly stale data', 'recommendations from cache (1 hour old)'], ['2 Simplified', 'cheaper fallback', 'show "popular items" list, hide reviews'], ['3 Essential only', 'core path only', 'search + cart + checkout; no extras'], ['4 Shed', 'reject some requests', '503 + Retry-After for low-priority traffic'], ['5 Static', 'maintenance page', 'last resort: "we are busy, try again"']])}
      <p>🔵 <b>Load shedding techniques.</b></p>
      <ul><li><b>Concurrency limit</b>: allow at most N in-flight requests (a semaphore). The N+1st gets 503 at once. Cheap and powerful.</li>
      <li><b>Rate limiting (token bucket)</b>: tokens refill at a steady rate; each request takes one; no token → reject. Allows short bursts, enforces average rate. Often per client/API key.</li>
      <li><b>Priority-based shedding</b>: shed batch/analytics/anonymous first, keep paid users, checkout and health checks.</li>
      <li><b>Adaptive limits</b>: raise the limit while latency is healthy, cut it when latency rises (AIMD, Netflix concurrency-limits, "gradient" algorithm).</li>
      <li><b>Deadlines</b>: drop requests that already waited longer than the client will.</li></ul>
      <p><b>Circuit breaker</b> (Resilience4j): after too many failures to a dependency, stop calling it for a while and return a fallback immediately - so a dead dependency cannot hold every thread hostage.</p>
      <p><b>Reject early, reject cheap.</b> Shedding at the edge (CDN, gateway, first line of the handler) costs microseconds. Shedding after you parsed the body, authenticated and queried a DB wastes the very capacity you are trying to save.</p>`,
    clues: ['"System collapses under 2x traffic" → load shedding / concurrency limits', '"Keep checkout working when recommendations are down" → graceful degradation with fallbacks', '"Rate limit per user / API key" → token bucket or sliding window', '"Return 429 vs 503" → 429 = this client is too fast, 503 = server overloaded for everyone', '"Retry storm" → jitter, retry budgets, circuit breaker', '"Cascading failure" → timeouts, bulkheads, breakers, shed at the edge']
    ,
    code: [
      { lang: 'js', run: true, title: 'Token-bucket load shedder simulation with priorities (runnable)', code: `// Capacity: 10 requests/second sustained, burst up to 20. Priorities: 0 = critical, 1 = normal, 2 = batch.
class TokenBucket {
  constructor(ratePerSec, burst) { this.rate = ratePerSec; this.burst = burst; this.tokens = burst; this.last = 0; }
  refill(nowMs) {
    const add = ((nowMs - this.last) / 1000) * this.rate;
    this.tokens = Math.min(this.burst, this.tokens + add);
    this.last = nowMs;
  }
  tryTake(nowMs, cost) {
    this.refill(nowMs);
    if (this.tokens >= cost) { this.tokens -= cost; return true; }
    return false;
  }
}
// Lower-priority traffic must leave a reserve: batch only when >50% tokens remain, normal when >20%.
function admit(bucket, nowMs, priority) {
  bucket.refill(nowMs);
  const reserve = priority === 2 ? 0.5 : priority === 1 ? 0.2 : 0;
  if (bucket.tokens / bucket.burst <= reserve) return false;
  return bucket.tryTake(nowMs, 1);
}
const bucket = new TokenBucket(10, 20);
const stats = [0, 1, 2].map(() => ({ ok: 0, shed: 0 }));
let seed = 42; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
// 5 seconds of traffic: 40 req/s (4x capacity). Mix: 10% critical, 40% normal, 50% batch.
for (let ms = 0; ms < 5000; ms += 25) {
  for (let k = 0; k < 1; k++) {                       // one request every 25 ms = 40 req/s
    const r = rnd(), p = r < 0.1 ? 0 : r < 0.5 ? 1 : 2;
    if (admit(bucket, ms, p)) stats[p].ok++; else stats[p].shed++;
  }
}
['critical', 'normal', 'batch'].forEach((n, i) => console.log(n.padEnd(9), 'served', stats[i].ok, 'shed', stats[i].shed));` },
      `import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** Concurrency-limit shedder + degradation ladder chosen from current load. */
class Shedder {
    private final Semaphore slots;
    private final int limit;
    final AtomicInteger shed = new AtomicInteger();

    Shedder(int limit) { this.limit = limit; this.slots = new Semaphore(limit); }

    /** Load 0.0 .. 1.0+ of the limit decides which features stay on. */
    String levelFor(double load) {
        if (load < 0.6) return "L0 full: personalised recs + reviews";
        if (load < 0.8) return "L1 cached recs";
        if (load < 0.95) return "L2 popular items only";
        return "L3 essential only (search, cart, checkout)";
    }

    /** @return HTTP-like status: 200 served, 503 shed */
    int handle(Callable<String> work) throws Exception {
        if (!slots.tryAcquire()) { shed.incrementAndGet(); return 503; }   // reject instantly: no queueing
        try {
            double load = (double) (limit - slots.availablePermits()) / limit;
            work.call();
            return load > 1.0 ? 503 : 200;
        } finally { slots.release(); }
    }

    public static void main(String[] args) throws Exception {
        Shedder s = new Shedder(3);
        ExecutorService clients = Executors.newFixedThreadPool(10);
        AtomicInteger ok = new AtomicInteger();
        for (int i = 0; i < 20; i++) {
            clients.submit(() -> {
                try { if (s.handle(() -> { Thread.sleep(30); return "done"; }) == 200) ok.incrementAndGet(); }
                catch (Exception e) { }
            });
        }
        clients.shutdown();
        clients.awaitTermination(5, TimeUnit.SECONDS);
        System.out.println("served=" + ok + " shed=" + s.shed + " (limit 3 in flight)");
        for (double l : new double[]{0.3, 0.7, 0.9, 1.1}) System.out.println(l + " -> " + s.levelFor(l));
    }
}`,
      { lang: 'java', check: false, title: 'Resilience4j: circuit breaker + bulkhead + fallback (framework code)', code: `CircuitBreaker cb = CircuitBreaker.of("recs", CircuitBreakerConfig.custom()
        .failureRateThreshold(50)                       // open when half the calls fail
        .slowCallDurationThreshold(Duration.ofMillis(200))
        .slowCallRateThreshold(50)                      // ...or half the calls are slow
        .waitDurationInOpenState(Duration.ofSeconds(10))
        .build());
Bulkhead bh = Bulkhead.of("recs", BulkheadConfig.custom().maxConcurrentCalls(10).maxWaitDuration(Duration.ZERO).build());

Supplier<List<Item>> guarded = Decorators.ofSupplier(() -> recsClient.fetch(userId))
        .withBulkhead(bh).withCircuitBreaker(cb)
        .withFallback(List.of(BulkheadFullException.class, CallNotPermittedException.class, TimeoutException.class),
                      e -> popularItemsCache.top(10))   // degrade, do not fail the page
        .decorate();` },
      { lang: 'python', run: true, title: 'Degradation ladder picker (runnable)', code: `LADDER = [
    (0.60, "L0 full: personalised recommendations + reviews"),
    (0.80, "L1 cached recommendations (1h stale)"),
    (0.95, "L2 popular items only, reviews hidden"),
    (1.10, "L3 essential only: search, cart, checkout"),
    (float("inf"), "L4 shed: 503 + Retry-After for low priority"),
]
def level(load):
    for limit, name in LADDER:
        if load < limit:
            return name
for load in (0.3, 0.7, 0.9, 1.0, 1.4):
    print(f"load {load:.0%} -> {level(load)}")` }
    ],
    codeTitle: ['JS: token-bucket shedder with priorities', 'Java: concurrency-limit shedder and ladder', 'Resilience4j composition', 'Python: ladder picker'],
    viz: [{
      title: 'Degradation ladder as load rises',
      input: '40 70 90 100 130 80 50',
      inputLabel: 'Load as % of capacity, step by step',
      gen: function (input) {
        var loads = nums(input, 2, 12, 'load percentages');
        var feats = ['personalised recs', 'live stock', 'reviews', 'search', 'cart', 'checkout'];
        // which features stay ON at each level
        var level = [feats.slice(), ['cached recs', 'live stock', 'reviews', 'search', 'cart', 'checkout'], ['popular items', 'live stock', 'search', 'cart', 'checkout'], ['search', 'cart', 'checkout'], ['checkout']];
        var names = ['L0 full', 'L1 cached', 'L2 simplified', 'L3 essential', 'L4 shed + essential'];
        function lv(p) { return p < 60 ? 0 : p < 80 ? 1 : p < 95 ? 2 : p < 120 ? 3 : 4; }
        var frames = [];
        loads.forEach(function (p) {
          var l = lv(p), items = level[l].slice(), hl = {};
          items.forEach(function (_, i) { hl[i] = l === 0 ? 'ok' : (l >= 3 ? 'bad' : 'cur'); });
          if (l === 0) hl[0] = 'ok';
          frames.push({ narr: 'Load <b>' + p + '%</b> → <b>' + names[l] + '</b>. ' + (l === 0 ? 'Everything works.' : l < 3 ? 'Drop the expensive extras, keep the page useful.' : l === 3 ? '<span class="c-r">Only the money path is on.</span>' : '<span class="c-r">Even essentials are protected by shedding: low-priority requests get 503 + Retry-After.</span>'), parts: [
            { type: 'queue', label: 'Features still ON (bottom → top = cheapest to most important)', items: items, hl: hl, frontLabel: 'first to go', backLabel: 'last to go' },
            { type: 'bars', label: 'load vs capacity (100 = full)', values: [p, 100], idxLabels: ['load %', 'capacity'], hl: { 0: p > 100 ? 'bad' : p > 80 ? 'cur' : 'ok' } },
            { type: 'vars', vals: { level: names[l], shedLowPriority: l === 4 ? 'yes' : 'no' }, hl: l >= 3 ? { level: 'bad' } : {} }] });
        });
        return frames;
      }
    }, {
      title: 'Token bucket: burst allowed, then steady rate',
      input: '5 1 8',
      inputLabel: 'burst size, refill tokens per tick, requests arriving per tick',
      gen: function (input) {
        var a = nums(input, 3, 3, 'burst refill arrivals');
        var burst = a[0], refill = a[1], arr = a[2];
        if (burst < 1 || burst > 12 || refill < 0 || refill > 6 || arr < 1 || arr > 12) throw new Error('burst 1-12, refill 0-6, arrivals 1-12');
        var tokens = burst, frames = [], hist = [];
        for (var t = 1; t <= 10; t++) {
          tokens = Math.min(burst, tokens + (t === 1 ? 0 : refill));
          var take = Math.min(tokens, arr), shed = arr - take;
          tokens -= take; hist.push(tokens);
          frames.push({ narr: 'Tick ' + t + ': ' + arr + ' requests arrive. Bucket gives <b>' + take + '</b> tokens → ' + take + ' served' + (shed ? ', <span class="c-r">' + shed + ' shed (429)</span>' : '') + '. Tokens left: ' + tokens + '.', parts: [
            { type: 'bars', label: 'tokens left after each tick (max ' + burst + ')', values: hist.slice(), hl: (function () { var h = {}; hist.forEach(function (v, i) { h[i] = v === 0 ? 'bad' : 'ok'; }); return h; })() },
            { type: 'vars', vals: { served: take, shed: shed, tokens: tokens }, hl: shed ? { shed: 'bad' } : {} }] });
        }
        return frames;
      }
    }],
    examples: [
      { title: '429 or 503?', html: `<p><b>429 Too Many Requests</b>: <i>you</i> are sending too fast (per-client rate limit). <b>503 Service Unavailable</b>: <i>we</i> are overloaded or down for everyone. Both should carry <code>Retry-After</code>. Clients must treat both as "slow down", never as "retry now".</p>` },
      { title: 'Which requests to shed first', html: `${H.table(['Priority', 'Traffic', 'Action under overload'], [['P0', 'health checks, payments, login', 'never shed (reserve capacity)'], ['P1', 'browse, search, cart', 'shed last'], ['P2', 'recommendations, analytics pings', 'degrade, then shed'], ['P3', 'batch jobs, exports, crawlers', 'shed first']])}` },
      { title: 'Feature flags as a degradation switch', html: `<p>Prepare switches in advance: <code>recs.enabled</code>, <code>reviews.enabled</code>, <code>search.fuzzy</code>. During an incident, an on-call engineer (or an automatic controller reading latency) flips the cheap path in seconds without a deploy. Test the degraded modes regularly (game days) - an untested fallback usually fails when needed.</p>` }
    ],
    deepDive: `<p>🟣 <b>Why overload collapses systems (goodput vs throughput).</b> Without shedding, work done after the client gave up is wasted. As load rises past capacity, <b>goodput</b> (useful work) can fall toward zero while CPU shows 100%. Shedding keeps goodput at capacity. Queueing theory: at utilisation ρ the wait scales like ρ/(1−ρ); the last few percent of utilisation cost enormous latency.</p>
      <p><b>Adaptive concurrency.</b> Static limits go stale as dependencies change. AIMD (like TCP): additive increase while latency is within target, multiplicative decrease on timeouts or latency rise. Netflix's <code>concurrency-limits</code> (Vegas/Gradient) estimates the no-load latency (minRTT) and shrinks the limit when measured latency exceeds it. Envoy has an adaptive concurrency filter. AWS and Google describe similar "CoDel"-style queue management: keep queue <i>delay</i> (not length) under a target such as 5 ms and drop when it stays above.</p>
      <p><b>Token bucket vs leaky bucket vs windows.</b> Token bucket: allows bursts up to bucket size, average rate = refill rate. Leaky bucket: smooths output to a constant rate (queue). Fixed window counters are cheap but allow 2x bursts at window boundaries; sliding window log is exact but memory heavy; sliding window counter approximates well. Distributed rate limiting: Redis with a Lua script (atomic) or approximations with per-node quotas; budget the Redis round trip (~0.5 ms) and decide fail-open vs fail-closed if Redis is down.</p>
      <p><b>Cascading failure prevention.</b> Timeouts shorter than the caller's timeout (a timeout budget decreasing down the chain), bulkheads per dependency, circuit breakers with half-open probing, retries with exponential back-off + jitter and a <b>retry budget</b> (e.g. retries ≤ 10% of requests), hedged requests only for idempotent calls and with caution, and <b>load shedding at the edge</b> before work enters the system. Also watch for <b>thundering herd</b> after recovery: ramp traffic back gradually, use request coalescing on cache misses, and jitter cache TTLs.</p>
      <p><b>Operating it.</b> Alert on shed rate, degradation level and queue delay, not only error rate - intentional shedding is a signal, not a bug. Document runbooks: who can raise limits, how to trip the kill-switch. And communicate to users honestly: a clear "busy, retry shortly" beats a spinner.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM features are the first things to degrade: they are the most expensive and the most optional. Typical ladder: full generative answer → smaller/cheaper model → cached or retrieved answer → plain search results → "assistant unavailable". Token budgets and per-user quotas are load shedding by another name, and they protect your cloud bill as well as latency.</p>
      <p><b>AI-driven traffic:</b> crawlers and agents can hammer APIs far faster than humans. Identify them (API keys, user-agent plus behaviour), give them a lower priority class and their own rate limit, and expose clear 429 + <code>Retry-After</code> so well-behaved agents back off.</p>
      <p><b>Use AI as a partner:</b> ask it to enumerate "what could we turn off, in order, with the user-visible impact" for a feature list, and to draft a game-day plan. Validate the order with product owners.</p>
      <p><b>Where AI goes wrong:</b> generated rate limiters are per-process only (useless with 20 pods), use a fixed window, or fail closed when Redis is unreachable, taking the site down. Fallbacks written by AI are often never tested. You own the priority decisions - those are business choices, not code.</p>`,
    problems: [{
      title: 'Degrade Recommendations Under Load',
      level: 'Hard', tags: ['graceful degradation', 'load shedding', 'circuit breaker'], companies: ['Netflix', 'Amazon', 'Spotify'],
      statement: `<p>A home page calls a personalised-recommendations service (p95 150 ms normally, up to 5 s when overloaded). During peak, recs slow down and take the whole home page with them (threads pile up). Design degradation so the page keeps loading in under 300 ms, covering: timeouts, fallbacks, circuit breaker, bulkhead, shedding, and monitoring.</p>`,
      constraints: `Recs are nice-to-have. Page budget 300 ms p95. A cached "popular items" list exists (refreshed every 5 minutes).`,
      example: `${H.table(['Load', 'Behaviour', 'Page latency'], [['normal', 'live recs (150 ms)', '~200 ms'], ['recs slow', 'timeout 120 ms → popular list', '~150 ms'], ['recs failing', 'breaker open → popular list instantly', '~30 ms'], ['whole site overloaded', 'shed P3, then return static page', 'fast 503 for some']])}`,
      brute: { why: `<p>Call recs synchronously with the default 30 s timeout on the shared request thread pool. When recs get slow, every request thread ends up waiting, the pool is exhausted, and even checkout and the health check time out: one optional feature takes down the site.</p>` },
      mcq: { q: 'Recs service is down. What should the home page do?', options: ['Show the cached popular list immediately (breaker open)', 'Retry recs 5 times then fail the page', 'Return 500 for the page', 'Wait 30 s'], answer: 0, explain: 'Optional feature + circuit breaker + fallback = page works, user barely notices.' },
      hints: [`<p>Decide what is required (page shell, auth) and what is optional (recs). Optional never fails the page.</p>`, `<p>Layers: tight timeout → bulkhead (max N concurrent recs calls) → circuit breaker → fallback.</p>`, `<p>Add overload control for the whole service: concurrency limit with priorities, deadline checks, and metrics on fallback rate. Test with fault injection.</p>`],
      solution: {
        approach: `<p>Treat recommendations as optional. Call them with a tight timeout of about 120 ms (derived from the page budget: 300 ms minus the other work, not from the service's own p95), inside a <b>bulkhead</b> (for example 20 concurrent calls, zero queue wait) so a slow recs service can use at most 20 threads. Wrap with a <b>circuit breaker</b> that opens when more than 50% of calls fail or are slow over a sliding window, stays open 10 s, then half-opens to probe with a few calls. Any rejection, timeout or open breaker returns the fallback: the cached popular-items list (refreshed every 5 minutes) or the user's last cached recommendations. For the site as a whole add a concurrency limit and priority shedding at the edge: critical paths (login, checkout, health) keep reserved capacity; batch and crawler traffic gets 429/503 with Retry-After first. Expose a manual feature flag to disable recs completely. Monitor fallback rate, breaker state, bulkhead rejections, p95 per dependency and shed rate, and alert on sustained fallback use (degradation is working, but someone must fix recs). Test via chaos or fault-injection in staging and game days, and ramp traffic back gradually after recovery to avoid a thundering herd on recs.</p>`,
        code: { lang: 'java', check: false, code: `// Pseudocode with Resilience4j-style decorators (see topic code for the full composition)
List<Item> recs = Decorators.ofSupplier(() -> recsClient.fetch(userId))   // timeout 120 ms configured on the client
        .withBulkhead(bulkhead20)
        .withCircuitBreaker(recsBreaker)
        .withFallback(Throwable.class, e -> popularCache.top(10))
        .get();` },
        complexity: `<p>O(1) extra work per request; bounded threads (bulkhead) and bounded latency (timeout + fallback).</p>`,
        followUps: ['How do you avoid a retry storm when recs recovers?', 'How would you decide the shed order with the business?']
      }
    }]
  });

  /* ================= PRACTICE ================= */
  function P(o) {
    return {
      title: o.t, level: o.l, tags: o.tags, companies: o.co, statement: o.s, constraints: o.c, example: o.e,
      brute: { why: o.b }, mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] }, hints: o.h,
      solution: { approach: o.a, code: o.code, complexity: o.x, followUps: o.f }
    };
  }
  practice.push(P({ t: 'Concurrency from Little\'s Law', l: 'Easy', tags: ['little\'s law'], co: ['Google'],
    s: `<p>An API receives <b>250 req/s</b> and the average request takes <b>80 ms</b>. How many requests are in flight on average? If a dependency slows the average to 400 ms, what happens to the in-flight count?</p>`,
    c: `Stable system, averages only.`,
    e: `<p>L = 250 × 0.08 = <b>20</b>. After slowdown L = 250 × 0.4 = <b>100</b>: five times more concurrency needed.</p>`,
    b: `<p>Guess "about 250 threads, one per request per second". Wrong by an order of magnitude and ignores latency; the law connects rate, time and concurrency.</p>`,
    q: ['If latency rises 5x at the same arrival rate, in-flight requests…', ['rise 5x', 'stay the same', 'fall 5x', 'depend only on CPU'], 0, 'L = λ × W, so W × 5 means L × 5.'],
    h: [`<p>Little's law links the three numbers: in-flight L = arrival rate λ × average time W.</p>`, `<p>Convert the milliseconds to seconds before multiplying, so 80 ms becomes 0.08 s.</p>`, `<p>Slow dependencies silently multiply the slots you need - which is how pools get exhausted.</p>`],
    a: `<p>Little's law says the average number in the system equals arrival rate times average time in system. With 250 req/s and 0.08 s, L = 20, so a pool of at least 20 slots (plus headroom, say 30) covers normal times. When the average time grows to 0.4 s, L = 100: if the pool still has 30 slots, 70 requests are always waiting, the queue grows without bound at the same arrival rate, and latency grows further (feedback loop). This is why a slow downstream looks like a thread-pool problem, and why timeouts and bulkheads matter.</p>`,
    x: `<p>Constant-time arithmetic.</p>`, f: ['How does variance in latency change the sizing?'] }));
  practice.push(P({ t: 'Percentile Calculator', l: 'Easy', tags: ['percentiles', 'java'], co: ['Datadog'],
    s: `<p>Write a method that returns the p-th percentile (nearest-rank) of an array of latencies. Test it for p50, p95 and p99 on 100 values 1..100.</p>`,
    c: `1 ≤ n ≤ 10<sup>6</sup>, 0 &lt; p ≤ 100.`,
    e: `<p>Values 1..100: p50 = <b>50</b>, p95 = <b>95</b>, p99 = <b>99</b> (rank = ceil(p/100 × n)).</p>`,
    b: `<p>Take the average, or use index <code>(int)(p * n)</code> which is off by one and can run out of bounds for p=100.</p>`,
    q: ['Nearest-rank p95 for n = 200 is which sorted position (1-based)?', ['190', '195', '200', '19'], 0, 'ceil(0.95 × 200) = 190.'],
    h: [`<p>Sort a copy of the latencies from smallest to largest so the rank positions mean something.</p>`, `<p>Nearest-rank formula: rank = ceil(p/100 × n), then the answer is sorted[rank − 1] (ranks start at 1).</p>`, `<p>Clamp rank to [1, n]. Use a copy so the caller's array is not reordered.</p>`],
    a: `<p>Copy and sort the array (O(n log n)), compute rank = ceil(p / 100 × n) with doubles, clamp to at least 1 and at most n, and return the element at rank − 1. For streaming data at scale use a histogram or sketch instead of sorting everything, which also allows merging results from many servers.</p>`,
    code: `import java.util.*;
class Pct {
    static long percentile(long[] a, double p) {
        long[] s = a.clone();
        Arrays.sort(s);
        int rank = (int) Math.ceil(p / 100.0 * s.length);
        rank = Math.max(1, Math.min(s.length, rank));
        return s[rank - 1];
    }
    public static void main(String[] args) {
        long[] v = new long[100];
        for (int i = 0; i < 100; i++) v[i] = i + 1;
        System.out.println(percentile(v, 50) + " " + percentile(v, 95) + " " + percentile(v, 99));
    }
}`,
    x: `<p>O(n log n) time, O(n) space for the copy.</p>`, f: ['How would you compute this over a rolling 5-minute window?'] }));
  practice.push(P({ t: 'Spot the Hot Frame', l: 'Easy', tags: ['flame graph'], co: ['Netflix'],
    s: `<p>A flame graph shows <code>main</code> 100% wide, <code>process</code> 100%, then children <code>parseJson</code> 8%, <code>encrypt</code> 12%, <code>String.format</code> 55% (nothing above it), <code>writeDb</code> 25%. Which frame first and why? What does a narrow-but-tall tower mean?</p>`,
    c: `CPU profile, representative load.`,
    e: `<p>Fix <b>String.format</b> (55% self time). A tall narrow tower is just deep call nesting - not a problem unless it is wide.</p>`,
    b: `<p>Start with the database because "databases are slow" - without looking, you optimise a 25% frame and miss the 55% one.</p>`,
    q: ['In a flame graph, the width of a box shows…', ['share of samples (time)', 'call depth', 'memory used', 'time order of calls'], 0, 'x-axis is not time order; it is aggregated sample share.'],
    h: [`<p>Look for the widest box that has nothing stacked on top of it; that is where time is actually spent.</p>`, `<p>A frame's own (self) time is its width minus the combined widths of the boxes above it.</p>`, `<p>After the fix, re-profile; the next hot frame appears.</p>`],
    a: `<p>String.format has no children and covers 55% of samples, so it is the largest self-time frame. Common fixes are caching a precomputed template, using string concatenation or StringBuilder in the hot path, or removing the formatting from per-request logging. Removing it entirely would make the service about 2.2x faster at best (Amdahl). The deep narrow tower is framework nesting. After the change, take a fresh profile to confirm the improvement and find the next target.</p>`,
    x: `<p>Not an algorithm; gain bounded by 55%.</p>`, f: ['How do you tell CPU time from waiting time?'] }));
  practice.push(P({ t: 'Pick the Rejection Policy', l: 'Easy', tags: ['thread pool'], co: ['Oracle'],
    s: `<p>For each case choose AbortPolicy, CallerRunsPolicy, DiscardPolicy or DiscardOldestPolicy: (a) a batch loader reading a file and submitting rows, (b) a web request handler submitting a payment job, (c) live sensor readings where only the newest matters.</p>`,
    c: `Think about who the submitter is and what loss is acceptable.`,
    e: `<p>(a) CallerRuns - the reader slows to the pool's speed. (b) Abort + 503/429 - fail visibly. (c) DiscardOldest.</p>`,
    b: `<p>Use the default for everything or an unbounded queue so nothing is ever rejected - memory grows and latency explodes.</p>`,
    q: ['Which policy slows the producer automatically?', ['CallerRunsPolicy', 'DiscardPolicy', 'AbortPolicy', 'None'], 0, 'The submitting thread executes the task, so it cannot submit more meanwhile.'],
    h: [`<p>Ask which thread calls execute() in each case, and what happens if that thread is slowed down.</p>`, `<p>For each case ask whether losing a task silently is acceptable, or whether the caller must be told.</p>`, `<p>One trap: CallerRunsPolicy must never run on an event-loop thread, because it would block every other request.</p>`],
    a: `<p>(a) The batch loader is a single internal producer that may safely be slowed down, so CallerRunsPolicy gives free backpressure and loses nothing. (b) For a user-facing payment request, the caller must learn the system is full, so AbortPolicy, translated to HTTP 503 or 429 with Retry-After, is correct; silently discarding a payment is unacceptable and running it on the request thread could exceed latency budgets. (c) Sensor data: stale readings are worthless, so DiscardOldestPolicy keeps the freshest values. In every case the queue itself stays bounded.</p>`,
    x: `<p>Design decision, O(1) per submit.</p>`, f: ['Why is CallerRuns dangerous in Netty?'] }));

  practice.push(P({ t: 'Size a Pool for a Mixed Workload', l: 'Medium', tags: ['thread pool', 'sizing'], co: ['Uber'],
    s: `<p>16-core server. Request: 5 ms CPU, 45 ms waiting on HTTP calls. Target CPU 75%. Compute pool size and the maximum throughput. What if the HTTP dependency only allows 100 concurrent calls?</p>`,
    c: `threads = cores × util × (1 + wait/compute)`,
    e: `<p>16 × 0.75 × (1 + 9) = <b>120</b> threads. Throughput = 120 / 0.05 s = 2,400 req/s. CPU check: 2,400 × 5 ms = 12 cores = 75%. Dependency cap: 100 / 0.045 ≈ <b>2,222</b> req/s is the real ceiling.</p>`,
    b: `<p>Use "cores + 1 = 17" (CPU-bound formula) for I/O work: only 17/0.05 = 340 req/s, using only about 11% of the CPU (5 ms x 340 req/s = 1.7 of 16 cores).</p>`,
    q: ['The HTTP client allows 100 concurrent calls but the pool has 120 threads. The ceiling is set by…', ['the 100-call limit', 'the 120 threads', 'CPU only', 'the sum'], 0, 'The scarcest resource limits throughput.'],
    h: [`<p>Wait time is 45 ms and compute time is 5 ms, so the wait/compute ratio is 9.</p>`, `<p>Compute one throughput ceiling from the CPUs and a second from the 100-call HTTP limit.</p>`, `<p>The real maximum throughput is the lower of the two ceilings, and threads beyond that add nothing.</p>`],
    a: `<p>The I/O formula gives 16 × 0.75 × 10 = 120 threads. Each request occupies a thread for 50 ms, so 120 threads sustain 2,400 req/s, and 2,400 × 5 ms = 12 core-seconds per second, which is 75% of 16 cores as intended. The downstream HTTP limit matters only during the 45 ms wait: 100 / 0.045 ≈ 2,222 req/s, which is lower, so the effective ceiling is about 2,200 req/s and the extra threads past ~111 are useless. Put a Semaphore of 100 around the call so excess requests fail fast or queue briefly rather than pile up inside the client. Validate with a load test, since averages hide variance.</p>`,
    x: `<p>Arithmetic; verify empirically.</p>`, f: ['How do you pick a different pool for each dependency?'] }));
  practice.push(P({ t: 'Parallel Fan-out with Timeouts', l: 'Medium', tags: ['completablefuture'], co: ['Amazon'],
    s: `<p>Write Java that calls three services in parallel (60, 90, 400 ms). The third is optional: after 150 ms use a fallback. Report total time. Use CompletableFuture.</p>`,
    c: `Java 21; plain code with simulated sleeps.`,
    e: `<p>Total ≈ <b>150 ms</b> (max of 60, 90, and the capped 150) instead of 550 ms.</p>`,
    b: `<p>Call sequentially with blocking <code>get()</code>: 550 ms, and one hang freezes the page.</p>`,
    q: ['Which method gives a fallback value after a timeout?', ['completeOnTimeout', 'orTimeout', 'allOf', 'join'], 0, 'orTimeout fails with TimeoutException; completeOnTimeout completes with a default.'],
    h: [`<p>Start each call with supplyAsync on an executor you create, not the shared common pool.</p>`, `<p>For the optional call, completeOnTimeout(fallback, 150, MILLISECONDS) supplies a value if it is late.</p>`, `<p>Combine the three futures with allOf(...).join(), then read each result from its own future.</p>`],
    a: `<p>Create a bounded executor, start the three calls with supplyAsync, attach completeOnTimeout to the optional one, combine with allOf and join. Latency equals the slowest required call or the timeout cap of the optional one. Because the stuck optional call still occupies a thread after the fallback, bound the executor and consider cancelling the future or using an HTTP-level timeout so the thread is released. Record a metric whenever the fallback is used.</p>`,
    code: `import java.util.concurrent.*;
class Fan {
    static String call(String n, int ms) { try { Thread.sleep(ms); } catch (InterruptedException e) { } return n; }
    public static void main(String[] a) {
        ExecutorService ex = Executors.newFixedThreadPool(4);
        long t0 = System.currentTimeMillis();
        var x = CompletableFuture.supplyAsync(() -> call("A", 60), ex);
        var y = CompletableFuture.supplyAsync(() -> call("B", 90), ex);
        var z = CompletableFuture.supplyAsync(() -> call("C", 400), ex).completeOnTimeout("fallback", 150, TimeUnit.MILLISECONDS);
        CompletableFuture.allOf(x, y, z).join();
        System.out.println(x.join() + y.join() + z.join() + " in " + (System.currentTimeMillis() - t0) + " ms");
        ex.shutdownNow();
    }
}`,
    x: `<p>Latency max(60, 90, 150); threads: 3.</p>`, f: ['How would you cancel the slow task?'] }));
  practice.push(P({ t: 'Token Bucket Rate Limiter', l: 'Medium', tags: ['rate limiting'], co: ['Stripe'],
    s: `<p>Implement a token bucket in JavaScript: capacity 5, refill 2 tokens/second. Simulate requests at t = 0, 0, 0, 0, 0, 0, 500, 1000, 1500 ms and print allowed/denied.</p>`,
    c: `Time is passed in, not read from the clock, to make it testable.`,
    e: `<p>First 5 allowed, 6th denied; at 500 ms +1 token → allowed; at 1000 ms +1 → allowed; 1500 ms +1 → allowed.</p>`,
    b: `<p>Count requests per fixed 1-second window: allows 2x bursts at window edges and cannot represent steady refill.</p>`,
    q: ['Token bucket vs fixed window: main benefit?', ['Allows controlled bursts, smooth average rate', 'Uses less memory than anything', 'Never rejects', 'Needs no clock'], 0, 'Bucket size bounds burst; refill rate bounds average.'],
    h: [`<p>Keep just two values per client: the current token count and the time of the last refill.</p>`, `<p>On each call: tokens = min(cap, tokens + elapsed × rate).</p>`, `<p>After refilling, if tokens ≥ 1 subtract one and allow the request; otherwise deny it.</p>`],
    a: `<p>Keep two numbers: tokens (float) and the last refill time. On every request add elapsed seconds times the rate, cap at capacity, then check if at least one token is available and subtract it. No timers needed, so it is O(1) time and memory per client. In a distributed setting do the same arithmetic atomically in Redis with a Lua script keyed by client id. Return remaining tokens and Retry-After in the response headers.</p>`,
    code: { lang: 'js', run: true, code: `class Bucket {
  constructor(cap, rate) { this.cap = cap; this.rate = rate; this.tokens = cap; this.t = 0; }
  allow(nowMs) {
    this.tokens = Math.min(this.cap, this.tokens + ((nowMs - this.t) / 1000) * this.rate);
    this.t = nowMs;
    if (this.tokens >= 1) { this.tokens -= 1; return true; }
    return false;
  }
}
const b = new Bucket(5, 2);
[0, 0, 0, 0, 0, 0, 500, 1000, 1500].forEach((t) => console.log(t, b.allow(t) ? 'allowed' : 'DENIED'));` },
    x: `<p>O(1) time and space per client.</p>`, f: ['How do you do this across 20 servers?'] }));
  practice.push(P({ t: 'Plan a Load Test', l: 'Medium', tags: ['load testing', 'k6'], co: ['Shopify'],
    s: `<p>You must prove a checkout API can survive Black Friday: 5x normal peak (normal peak 200 req/s), p95 &lt; 400 ms, errors &lt; 0.5%. Write the test plan: types of tests, load profile, data, what to watch, pass/fail rules.</p>`,
    c: `Staging environment is 50% the size of production.`,
    e: `<p>Open-model ramp 50 → 200 → 1000 req/s, thresholds in k6, soak at 200 for 1 h, spike 200 → 1000 in 30 s.</p>`,
    b: `<p>Run 100 virtual users in a loop against one product id on a laptop. Results are cache hits, closed-loop and limited by the laptop.</p>`,
    q: ['Why use an arrival-rate (open) model?', ['It does not slow down when the server does, exposing queues', 'It is easier to write', 'It uses less CPU', 'It avoids thresholds'], 0, 'Closed loops hide overload (coordinated omission).'],
    h: [`<p>Plan the test types in order: smoke, load, stress, spike, then soak, each with its own goal.</p>`, `<p>Realistic data distribution, warm-up, separate load generator.</p>`, `<p>Thresholds on p95/p99 and error rate; watch CPU, GC, pool waits, DB.</p>`],
    a: `<p>Plan: (1) smoke test with 2 users to validate the script and auth (tokens from a secret store or env vars, never in the script). (2) Load test at expected 200 req/s for 20 minutes and compare to the baseline. (3) Stress ramp using an arrival-rate executor from 200 to 1,000+ req/s to find the knee and see how failure looks. (4) Spike from 200 to 1,000 in 30 s to test autoscaling and recovery. (5) Soak at 200 req/s for several hours for leaks. Because staging is half of production size, extrapolate carefully, never linearly, and confirm with a limited production test using synthetic accounts if allowed. Use realistic data (many users, products, Zipf-like hot keys), think time, warm-up, and generator on separate hosts. Thresholds: p95 &lt; 400 ms, p99 &lt; 1 s, errors &lt; 0.5%, with abortOnFail. Observe server CPU, GC pauses, thread and connection pool wait, DB CPU/locks/slow queries, queue depth, and autoscaler behaviour. Report with graphs, bottleneck found, fix, and retest.</p>`,
    x: `<p>Process task; cost is environment time.</p>`, f: ['How would you test third-party payment calls?'] }));
  practice.push(P({ t: 'Compare Platform and Virtual Threads', l: 'Medium', tags: ['virtual threads'], co: ['Oracle', 'Netflix'],
    s: `<p>10,000 tasks each block 200 ms on I/O. Compare a 100-thread fixed pool and Java 21 virtual threads: estimated total time, memory, and when virtual threads do NOT help.</p>`,
    c: `Use math, then confirm with a short program.`,
    e: `<p>Fixed pool: 10,000 / 100 = 100 waves × 200 ms = <b>20 s</b>. Virtual: all wait together ≈ <b>0.3 s</b>.</p>`,
    b: `<p>Raise the platform pool to 10,000 threads: ~10 GB of stack reservation and heavy scheduling cost.</p>`,
    q: ['Virtual threads will NOT speed up…', ['CPU-bound computation', 'blocking HTTP calls', 'sleep()', 'JDBC waits (with care)'], 0, 'CPU work is limited by cores, not by waiting.'],
    h: [`<p>With a fixed pool the tasks run in waves: number of waves = tasks / threads, each lasting 200 ms.</p>`, `<p>A virtual thread releases its carrier thread while blocked, so all 10,000 waits can overlap.</p>`, `<p>Caveats: pinning with synchronized, downstream limits, ThreadLocals.</p>`],
    a: `<p>With 100 platform threads the 10,000 tasks run in 100 waves of 200 ms, about 20 s. Virtual threads, one per task, wait concurrently, so the whole batch finishes in roughly 200 ms plus scheduling overhead (~0.3 s), using maybe tens of MB of heap instead of gigabytes. They do not help with CPU-bound work, do not raise the capacity of a database or API that only accepts N concurrent calls (use a Semaphore to cap), and can be pinned by synchronized blocks that do blocking I/O on Java 21. Do not pool them. Keep timeouts and measure with JFR for pinning events.</p>`,
    code: `import java.util.concurrent.*;
class Cmp {
    static long time(ExecutorService ex, int n) throws Exception {
        long t0 = System.nanoTime();
        var fs = new java.util.ArrayList<Future<?>>();
        for (int i = 0; i < n; i++) fs.add(ex.submit(() -> { Thread.sleep(200); return null; }));
        for (var f : fs) f.get();
        ex.shutdown();
        return (System.nanoTime() - t0) / 1_000_000;
    }
    public static void main(String[] a) throws Exception {
        System.out.println("100 threads : " + time(Executors.newFixedThreadPool(100), 2000) + " ms");
        System.out.println("virtual     : " + time(Executors.newVirtualThreadPerTaskExecutor(), 2000) + " ms");
    }
}`,
    x: `<p>Platform: n/threads × latency. Virtual: about one latency.</p>`, f: ['What is thread pinning?'] }));

  practice.push(P({ t: 'Design an Autoscaling Policy', l: 'Hard', tags: ['autoscaling', 'kubernetes'], co: ['Google', 'Uber'],
    s: `<p>An I/O-bound service has CPU of only 25% when it is at its latency limit. Traffic doubles every weekday at 9:00 within 2 minutes. Pods need 60 s to become ready. Design the autoscaling policy and say what could still go wrong.</p>`,
    c: `Postgres allows 200 connections; each pod has a pool of 10.`,
    e: `<p>Max pods ≈ (200 − 20 reserved) / 10 = <b>18</b>. Scale on in-flight requests per pod or p95, plus a scheduled pre-scale at 8:50.</p>`,
    b: `<p>HPA on CPU at 70%: CPU never rises, no scale-out happens while latency explodes.</p>`,
    q: ['Best scaling signal for an I/O-bound service?', ['Concurrent requests per pod or queue depth', 'CPU only', 'Disk usage', 'Memory only'], 0, 'CPU stays low while threads are all blocked.'],
    h: [`<p>CPU is the wrong signal here, because the service is I/O-bound and sits at only 25% CPU at its limit.</p>`, `<p>Startup lag means reactive scaling is late: pre-scale.</p>`, `<p>Cap the maximum replicas by what the database connection budget can support, not just by cost.</p>`],
    a: `<p>Use an autoscaler (HPA with custom metrics or KEDA) on in-flight requests per pod (target ~60-70% of the measured per-pod limit) or on p95 latency / queue lag, not CPU. Because pods need 60 s and traffic doubles in 2 minutes, add scheduled scaling at 8:50 to the expected peak count (KEDA cron), keep minReplicas high enough to absorb a 2x jump, and use a fast scale-up policy (100% per 30 s) with slow scale-down (5 min stabilisation). Set maxReplicas from the connection budget: 18 pods × 10 = 180 connections under 200, or add PgBouncer to raise the cap. Protect the app during the ramp with a concurrency limit and load shedding so late scaling degrades gracefully. Add readiness probes with warm-up, PodDisruptionBudgets, multi-zone spread. What can still go wrong: the DB becomes the bottleneck, image pulls are slow, a node pool is full (cluster autoscaler delay), metric lag, and flapping from short windows. Test with a spike load test.</p>`,
    x: `<p>Design exercise; verify with a spike test.</p>`, f: ['How would you scale the database tier?'] }));
  practice.push(P({ t: 'Metastable Retry Storm', l: 'Hard', tags: ['backpressure', 'retries', 'incident'], co: ['Amazon'],
    s: `<p>A service at 80% capacity gets a 10-second DB blip. Afterwards traffic returns to normal, but latency stays at 20 s and error rates stay high for an hour until someone restarts everything. Explain why and how to design so it self-heals.</p>`,
    c: `Clients retry 3 times with no delay; server queue is unbounded; timeouts are 30 s.`,
    e: `<p>Three immediate retries can quadruple the offered load (80% → up to 320%), the unbounded queue holds abandoned requests, and work on dead requests keeps the server saturated.</p>`,
    b: `<p>"It's a DB issue, restart the pods" - restarts clear the queue but the same design collapses next time.</p>`,
    q: ['What prevents retries from amplifying overload?', ['Retry budget, backoff with jitter, circuit breaker', 'More retries', 'Longer queues', 'Bigger timeouts'], 0, 'They cap extra load and give the server room to recover.'],
    h: [`<p>Compute the offered load including retries: every failed call comes back as extra requests.</p>`, `<p>What happens to requests whose client already gave up?</p>`, `<p>The fixes combine bounded queues, request deadlines, load shedding and jittered, limited retries.</p>`],
    a: `<p>During the blip requests time out; each client retries 3 times immediately, so offered load becomes up to 4x. The server was at 80% before, so it is now far over capacity. The unbounded queue fills with requests whose clients have already timed out (30 s), but the server still processes them, so goodput is near zero while CPU is 100%. Even when the DB recovers, the backlog and the retries keep the load above capacity: a metastable failure that persists after the trigger is gone. Design fixes: client retry budgets (retries limited to ~10% of traffic), exponential backoff with full jitter, circuit breakers, and respecting Retry-After; server-side bounded queues, deadline propagation so expired requests are dropped unprocessed, adaptive concurrency limits that shed excess early with 503, LIFO or newest-first under overload, shorter timeouts, and capacity headroom (not running at 80%). Operationally add dashboards for queue delay and a runbook to shed or disable non-critical traffic, and test with fault injection.</p>`,
    x: `<p>Systems reasoning; no code complexity.</p>`, f: ['How do deadlines propagate across services?'] }));
  practice.push(P({ t: 'Benchmark a Lock vs Atomic Counter', l: 'Hard', tags: ['profiling', 'concurrency'], co: ['Jane Street'],
    s: `<p>Write a Java program that increments a shared counter 4,000,000 times from 4 threads using (a) synchronized, (b) AtomicLong, (c) LongAdder, and prints elapsed times. Explain which is fastest under contention and why a flame graph would show lock frames.</p>`,
    c: `Plain Java. Not a rigorous benchmark - mention JMH.`,
    e: `<p>Typical order fastest→slowest: LongAdder, AtomicLong, synchronized.</p>`,
    b: `<p>Time a single run once with System.currentTimeMillis and trust it: JIT warm-up and noise dominate.</p>`,
    q: ['Why is LongAdder faster under contention?', ['It spreads updates across several cells', 'It uses a bigger lock', 'It skips memory', 'It is single-threaded'], 0, 'Contended updates go to different cells and are summed on read.'],
    h: [`<p>Join all four threads before stopping the clock, or you only time how fast they were started.</p>`, `<p>Run a few warm-up repetitions first so JIT compilation does not distort the measured times.</p>`, `<p>Contention creates cache-line ping-pong or lock waits; profiles show time in monitor enter or CAS retry loops.</p>`],
    a: `<p>Each variant starts 4 threads that increment 1,000,000 times, join them, and measure with System.nanoTime after a warm-up round. synchronized forces threads to queue on a monitor (and may inflate to an OS-level mutex), AtomicLong uses a CAS retry loop where all threads fight over one cache line, and LongAdder keeps per-thread cells that are summed on read, so it scales best for write-heavy counters. In a profile of the synchronized version a wall-clock flame graph shows wide frames in Object.wait / monitor enter; in AtomicLong CPU time sits in the increment loop with cache misses. For real conclusions use JMH, vary thread counts, and check correctness (final sums must equal 4,000,000).</p>`,
    code: `import java.util.concurrent.atomic.*;
class CounterBench {
    static long syncCount = 0;
    static final Object LOCK = new Object();
    static final int N = 1_000_000, T = 4;

    static long run(Runnable body) throws Exception {
        Thread[] ts = new Thread[T];
        long t0 = System.nanoTime();
        for (int i = 0; i < T; i++) { ts[i] = new Thread(body); ts[i].start(); }
        for (Thread t : ts) t.join();
        return (System.nanoTime() - t0) / 1_000_000;
    }
    public static void main(String[] args) throws Exception {
        AtomicLong atomic = new AtomicLong();
        LongAdder adder = new LongAdder();
        for (int round = 0; round < 2; round++) {   // round 0 = warm-up
            long a = run(() -> { for (int i = 0; i < N; i++) synchronized (LOCK) { syncCount++; } });
            long b = run(() -> { for (int i = 0; i < N; i++) atomic.incrementAndGet(); });
            long c = run(() -> { for (int i = 0; i < N; i++) adder.increment(); });
            System.out.println("round " + round + ": synchronized=" + a + "ms atomic=" + b + "ms adder=" + c + "ms");
        }
        System.out.println(syncCount + " " + atomic.get() + " " + adder.sum());
    }
}`,
    x: `<p>O(N·T) increments; the point is contention cost, not complexity.</p>`, f: ['What does JMH protect you from?'] }));
  practice.push(P({ t: 'Capacity Plan for 10x Traffic', l: 'Hard', tags: ['capacity planning', 'bottleneck'], co: ['Airbnb', 'Booking.com'],
    s: `<p>Today: 300 req/s peak, 20 pods, p95 180 ms, DB CPU 30%, Redis CPU 10%. Marketing predicts 10x traffic in six weeks. Produce a plan: measure, find the first and second bottlenecks, decide on scaling, and define the release gate.</p>`,
    c: `Budget is limited; cannot simply multiply everything by 10.`,
    e: `<p>Target 3,000 req/s at 65% utilisation of the knee. Pods may need ~100+, the DB will be the first wall.</p>`,
    b: `<p>"Multiply pods by 10". It ignores shared bottlenecks (DB connections/CPU, Redis, third-party limits) and cost.</p>`,
    q: ['The first step of capacity planning is…', ['Measure current limits with a stress test', 'Buy 10x hardware', 'Rewrite in another language', 'Add caching everywhere'], 0, 'You need the baseline knee and bottleneck before extrapolating.'],
    h: [`<p>Stress test to find the knee and what saturates first.</p>`, `<p>Check every shared dependency and its connection budget.</p>`, `<p>Add degradation and a release gate based on a 3,000 req/s load test with thresholds.</p>`],
    a: `<p>Step 1: baseline. Run a stress test on a production-like environment to find the knee (say 600 req/s on 20 pods) and which resource saturates first; collect flame graphs for the hottest code. Step 2: model needs. 10x of 300 is 3,000 req/s; at 65% utilisation of capacity that implies capacity of about 4,600 req/s, or roughly 150 pods at the measured per-pod rate, unless efficiency work reduces it. Step 3: shared bottlenecks. DB: connections and CPU (30% today scales to 300% - impossible), so plan read replicas, caching of hot reads, query and index fixes, PgBouncer, maybe sharding; Redis: cluster mode; third parties: rate-limit increases or queueing. Step 4: cheaper wins first: profile and remove hot spots, cache, batch, async the non-critical paths, CDN for static data. Step 5: elasticity: autoscaling on in-flight requests, scheduled pre-scale for campaign start, headroom for one zone loss. Step 6: protection: concurrency limits, priority shedding, feature flags for degradation. Step 7: gate: a load test at 1.3x the forecast (3,900 req/s) with thresholds p95 &lt; 300 ms, errors &lt; 0.5%, a soak of several hours, a spike test, and a game day. Track cost per request. Re-measure every sprint as code changes.</p>`,
    x: `<p>Planning exercise; cost is load-test and environment time.</p>`, f: ['What if the forecast is wrong by 2x?'] }));
  practice.push(P({ t: 'Fix Event-Loop Blocking', l: 'Hard', tags: ['async', 'node'], co: ['PayPal'],
    s: `<p>A Node API occasionally freezes for 800 ms, health checks fail and pods restart. A profile shows a synchronous function doing a CPU-heavy hash plus JSON.parse of a 20 MB body. Explain how to prove it and fix it without rewriting the service.</p>`,
    c: `Single Node process per pod; traffic is mixed.`,
    e: `<p>Event-loop lag metric spikes to 800 ms; during the lag all other requests wait.</p>`,
    b: `<p>Add more pods and a longer health-check timeout. The freezes continue and the health check now hides real user pain.</p>`,
    q: ['Best fix for CPU-heavy work in a Node request?', ['Move it to worker threads or a separate service', 'Wrap it in async function', 'Use setTimeout 0', 'Increase memory'], 0, 'async does not move work off the event-loop thread; workers do.'],
    h: [`<p>Measure event-loop delay (perf_hooks monitorEventLoopDelay).</p>`, `<p>A CPU profile will show the synchronous hash and parse function as one wide frame at the top.</p>`, `<p>Use worker_threads pool, stream parsing, limit body size.</p>`],
    a: `<p>Prove it by exporting an event-loop delay histogram (perf_hooks.monitorEventLoopDelay) and correlating p99 spikes with the request that carries the big body; a CPU profile (node --cpu-prof or clinic flame) shows the hash and JSON.parse as one wide frame. Fixes: limit the maximum body size and reject early with 413; stream-parse large JSON instead of JSON.parse; move hashing to a worker_threads pool (e.g. piscina) with a bounded queue so overload is rejected rather than queued; use async hashing APIs that run in the libuv pool where they exist (and size UV_THREADPOOL_SIZE); or hand heavy jobs to a queue and a separate worker service and return 202. Keep health checks cheap and separate from real work. Add alerts on event-loop lag p99 above 100 ms and load-test the fix with a mix that includes big bodies.</p>`,
    code: { lang: 'js', run: true, code: `// Measure event-loop lag: a timer that should fire every 10 ms reports how late it was.
let last = Date.now(), worst = 0, n = 0;
const t = setInterval(() => {
  const now = Date.now(); worst = Math.max(worst, now - last - 10); last = now;
  if (++n === 15) { clearInterval(t); console.log('worst event-loop lag ms:', worst); }
}, 10);
setTimeout(() => { const s = Date.now(); while (Date.now() - s < 120) {} }, 40);   // simulated CPU-heavy handler` },
    x: `<p>Latency of other requests no longer depends on the heavy job.</p>`, f: ['How many worker threads do you create?'] }));
  practice.push(P({ t: 'Cascading Failure Walkthrough', l: 'Hard', tags: ['load shedding', 'resilience'], co: ['Netflix', 'Slack'],
    s: `<p>Service A calls B with a 30 s timeout and 3 retries; B calls C (slow). C slows from 50 ms to 5 s. Describe the cascade minute by minute and the controls at each layer that stop it.</p>`,
    c: `Each service has 200 threads.`,
    e: `<p>C slow → B's threads block → B saturated → A's calls time out and retry → A's threads blocked → the whole site is down.</p>`,
    b: `<p>Increase thread counts and timeouts so requests can finish eventually. The queue and thread demand grow and the failure spreads faster.</p>`,
    q: ['Which control best isolates C\'s slowness from the rest of B?', ['Bulkhead + timeout + circuit breaker for C', 'More threads', 'Longer timeout', 'Retries'], 0, 'Limit the damage C can do and fail fast with a fallback.'],
    h: [`<p>Use Little's law: when C gets slow, the in-flight count L in B and A multiplies.</p>`, `<p>Timeouts must get shorter at each hop down the chain, so a deep call cannot outlast the caller waiting on it.</p>`, `<p>Add a circuit breaker, bulkheads, a retry budget and load shedding at each layer.</p>`],
    a: `<p>T+0: C goes from 50 ms to 5 s. By Little's law, B needs 100x more concurrent slots for calls into C; at its normal rate B's 200 threads are all blocked within seconds. T+1 min: B cannot answer anything, even endpoints that do not use C. A's calls to B hit the 30 s timeout, A retries 3 times so the load on B quadruples, and A's 200 threads are also blocked. The whole site and the health checks fail, the load balancer ejects pods, the remaining ones get even more traffic. Controls: (1) per-call timeouts that shrink down the chain (A 2 s, B 1 s, C-call 500 ms); (2) bulkhead limiting concurrent calls to C so B keeps threads for other work; (3) circuit breaker around C returning a fallback or error fast; (4) retry budget with jitter, retries only on idempotent safe errors; (5) load shedding / concurrency limits at B and A returning 503 quickly; (6) health checks separate from dependency health; (7) caching and degraded responses; (8) alerts on dependency latency and a runbook to disable the C-backed feature via flag; (9) chaos tests that inject C latency.</p>`,
    x: `<p>Systems reasoning; no code complexity, only latency and concurrency arithmetic.</p>`, f: ['How do you pick timeouts for each hop?'] }));

  /* ================= QUIZ ================= */
  function Q(q, o, a, e) { quiz.push({ q: q, options: o, answer: a, explain: e }); }
  Q(`In Little's law L = λ × W, what does W represent?`, ['Average time a request spends in the system', 'Number of workers', 'Wait queue size', 'Weight of the request'], 0, 'W is the average time in system (queue + service).');
  Q(`Which pool size formula suits an I/O-bound workload on N cores?`, ['N × (1 + wait/compute)', 'N + 1', 'N / 2', 'Always 200'], 0, 'Threads spend most of their time waiting, so you need more threads than cores.');
  Q(`ThreadPoolExecutor has core=2, max=4, queue=3. The 6th task arrives while 2 are running and 3 are queued. What happens?`, ['A third (extra) thread is created', 'It is rejected', 'It is queued', 'The caller blocks'], 0, 'The queue is full, so the pool grows toward max before rejecting.');
  Q(`A flame graph box is very wide with nothing above it. It means…`, ['That function burns lots of CPU itself', 'It was called first', 'It uses lots of memory', 'It is a framework bug'], 0, 'Width = share of samples; no children = self time.');
  Q(`Why is the mean a poor latency metric?`, ['Outliers distort it and it hides the tail', 'It is expensive to compute', 'It is always lower than p50', 'It cannot be stored'], 0, 'The mean describes almost nobody; percentiles show the tail.');
  Q(`Which is an unbounded-queue hazard?`, ['Executors.newFixedThreadPool uses an unbounded LinkedBlockingQueue', 'ArrayBlockingQueue(100)', 'SynchronousQueue', 'Semaphore(10)'], 0, 'Overload turns into memory growth and huge latency.');
  Q(`What is coordinated omission?`, ['A closed-loop tester slows down when the server stalls and under-reports latency', 'Two servers share a cache', 'A bug in GC', 'A TCP flag'], 0, 'Use open models with a fixed arrival rate.');
  Q(`Virtual threads in Java 21 are best for…`, ['Many tasks that mostly wait on blocking I/O', 'CPU-heavy number crunching', 'Replacing all locks', 'Reducing database load'], 0, 'They make waiting cheap; they do not add CPU.');
  Q(`30 pods × Hikari pool 20 against Postgres max_connections=200 leads to…`, ['600 requested connections → too many clients', 'Perfect fit', 'Faster queries', 'Nothing'], 0, 'Pools multiply with instances; use smaller pools or PgBouncer.');
  Q(`Best autoscaling signal for an I/O-bound service whose CPU stays at 20%?`, ['In-flight requests per pod or queue depth', 'CPU utilisation', 'Disk free space', 'Pod age'], 0, 'CPU does not rise while threads wait.');
  Q(`429 versus 503 – which statement is right?`, ['429 says this client is too fast; 503 says the server is overloaded or unavailable', 'They are identical', '429 means success', '503 means bad JSON'], 0, 'Both should include Retry-After for back-off.');
  Q(`In a token bucket, what bounds the burst size?`, ['The bucket capacity', 'The refill rate', 'The number of clients', 'The clock'], 0, 'Capacity is the max tokens saved; refill rate sets the long-run average.');
  Q(`Which should be shed first when overloaded?`, ['Batch/analytics traffic', 'Checkout', 'Health checks', 'Login'], 0, 'Protect revenue and availability paths; shed low-priority work first.');
  Q(`Why can p99 values from several servers not be averaged?`, ['Percentiles are not additive; merge histograms instead', 'They are always equal', 'p99 is the max', 'Servers differ in language'], 0, 'Averaging percentiles gives a meaningless number.');

  /* ================= INTERVIEW ================= */
  function I(q, a, level, f) { interview.push({ q: q, a: a, level: level, followUps: f }); }
  I(`How do you find why a service is slow?`, `<p>Start from symptoms and measure instead of guessing. First use RED/USE metrics to see which resource saturates (CPU, memory/GC, threads, connections, disk, network). Then take the right profile: a CPU flame graph if cores are busy, a wall-clock profile if latency is high with low CPU, an allocation profile when GC is heavy, thread dumps for lock waits and traces to see which downstream call is slow. Fix the widest hot frame, change one thing at a time, and re-measure under the same load, because Amdahl's law bounds the gain from small parts.</p>`, 'B', ['What would you do if the profile shows nothing obvious?', 'How do you profile in production safely?']);
  I(`Explain Little's law and give a use in backend work.`, `<p>L = λ × W: the average number of items in a stable system equals the arrival rate times the average time each spends there. For backends: at 500 req/s and 200 ms per request you need about 100 concurrent slots. It is used to size thread pools, connection pools and queues, to check the maximum throughput of a fixed resource (slots / time per request), and to explain why a slow dependency exhausts pools: latency up, concurrency up by the same factor.</p>`, 'B', ['Does it need a particular distribution?', 'How does queueing time fit in?']);
  I(`How many threads should a pool have?`, `<p>It depends on the workload. For CPU-bound work about the number of cores (plus one). For I/O-bound work use cores × target utilisation × (1 + wait/compute), then cap by downstream limits (DB connections, HTTP concurrency) and by Little's law for the load you expect. Use a bounded queue and a rejection policy so overload is visible. Then validate with a load test: the formula is a starting point and measured numbers win. Use separate pools for different dependencies so one slow service cannot take all threads.</p>`, 'I', ['Why not just use 1000 threads?', 'What are bulkheads?']);
  I(`Walk through how ThreadPoolExecutor decides what to do with a new task.`, `<p>If fewer than corePoolSize threads exist, it starts a new thread even if others are idle. Otherwise it tries to offer the task to the queue. If the queue is full and fewer than maximumPoolSize threads exist, it starts an extra thread. If the pool is at max and the queue is full, the RejectedExecutionHandler runs: Abort (throw), CallerRuns (run in caller, giving backpressure), Discard, or DiscardOldest. A surprising consequence: with an unbounded queue the pool never grows past core, because the queue never fills.</p>`, 'I', ['Why does an unbounded queue make maximumPoolSize meaningless?', 'When would you use SynchronousQueue?']);
  I(`Compare blocking, reactive and virtual-thread models.`, `<p>Blocking thread-per-request is simplest but each waiting request holds an OS thread (about 1 MB stack, scheduler cost), limiting concurrency to a few thousand. Reactive/non-blocking uses few event-loop threads and callbacks or operators, giving very high concurrency and built-in backpressure, but harder code, debugging and a no-blocking-anywhere rule. Virtual threads (Java 21) keep the simple blocking style but are cheap user-mode threads, so a blocked one frees its carrier; ideal for I/O-heavy services. None of them add CPU capacity or raise downstream limits, so you still need timeouts, concurrency caps and bulkheads. Beware pinning from synchronized blocks around I/O on Java 21.</p>`, 'I', ['What is pinning?', 'When would you still choose reactive?']);
  I(`What is backpressure and how do you implement it?`, `<p>Backpressure is the mechanism by which a slow consumer tells a fast producer to slow down, instead of buffering without limit. Implementations: bounded blocking queues (put blocks, offer rejects), TCP windows, Kafka consumer pull model and lag monitoring, RabbitMQ prefetch, Reactive Streams request(n), Node stream write() returning false and the drain event, and HTTP 429/503 with Retry-After for external clients. Key design rule: every buffer has a limit, and every limit has a defined behaviour on overflow (block, drop, reject, spill to durable storage).</p>`, 'I', ['Where do you drop: oldest or newest?', 'How does a Kafka system apply backpressure?']);
  I(`Why do we use p95 or p99 rather than the average latency?`, `<p>Averages hide the tail and describe almost nobody; one slow request out of a hundred can disappear in the mean. Users feel the tail, especially because a page makes many calls and the chance of hitting at least one slow call is 1 - (1 - p)^N (about 40% for 50 calls at 1% each). Percentiles also cannot be averaged across servers, so you store histograms and merge. State SLOs as percentiles (for example p95 under 300 ms over 30 days) with an error budget.</p>`, 'I', ['How many samples do you need for p99.9?', 'How does Prometheus compute quantiles?']);
  I(`What is coordinated omission and how do you avoid it?`, `<p>It is a load-testing flaw: a closed-loop client sends the next request only after the previous response, so when the server stalls the client also stops sending and records just one slow sample, hiding all the requests that would have been delayed. Latency percentiles look much better than reality. Avoid it with an open workload model at a fixed arrival rate (k6 constant-arrival-rate, Gatling open injection, wrk2) or correct measurements using the intended send time (HdrHistogram's corrected recording).</p>`, 'A', ['When is a closed model appropriate?', 'How do you detect it in an existing report?']);
  I(`Your DB connection pool is exhausted under load. What do you check?`, `<p>First, whether connections are held too long: look at pg_stat_activity for idle-in-transaction and long queries, and check for remote calls or heavy logic inside transactions. Use Little's law (qps × query time) to see how many connections are really needed. Check pools × instances against max_connections, and whether autoscaling multiplied them. Fixes: shorten transactions, add indexes or cache to cut query time, shrink per-instance pools, add PgBouncer or RDS Proxy, set a short connection-timeout so overload fails fast, add statement and idle-in-transaction timeouts, and monitor pool wait time and active/idle counts.</p>`, 'A', ['Why can a bigger pool make things slower?', 'How do you make a transaction shorter?']);
  I(`Design load shedding for an API.`, `<p>Reject early and cheaply at the edge, before expensive work. Layers: gateway rate limits per client (token bucket), a concurrency limit per service (semaphore, ideally adaptive like AIMD or gradient) that returns 503 immediately when exceeded, priority classes so critical traffic (login, checkout, health) is reserved capacity and batch traffic is shed first, deadline checks that drop requests whose clients gave up, and bounded queues. Return 429 or 503 with Retry-After. Complement with graceful degradation (cached or simplified responses), circuit breakers and bulkheads. Monitor shed rate, queue delay and goodput, and test with spike load and fault injection.</p>`, 'A', ['429 vs 503?', 'How do you rate limit across many nodes?']);
  I(`How do you scale a service horizontally? What blocks you?`, `<p>Run identical stateless instances behind a load balancer and scale on a good signal (in-flight requests, queue depth, latency, or CPU if CPU-bound). Blockers: local state (sessions, files, in-memory caches that must be consistent, cron jobs), shared bottlenecks (single DB primary, Redis, third-party rate limits), connection multiplication (instances × pool), slow startup, sticky sessions, and serial sections by Amdahl's law. Solutions: externalise state, use read replicas/caching/sharding, PgBouncer, leader election for schedulers, graceful shutdown and readiness probes, and capacity headroom for the lag of autoscaling.</p>`, 'I', ['How do you scale the database?', 'What is a readiness probe for?']);
  I(`What is a circuit breaker and how does it differ from a retry or a timeout?`, `<p>A timeout bounds how long one call may take. A retry repeats a failed call, which helps with transient errors but multiplies load if the dependency is overloaded. A circuit breaker watches failure and slow-call rates; when they cross a threshold it opens and rejects calls immediately (or returns a fallback) for a cool-down period, then half-opens to probe with a few calls. This protects the caller's threads and gives the dependency room to recover. Use all three together with retry budgets and jitter, and a bulkhead to cap concurrency.</p>`, 'I', ['What does half-open mean?', 'What goes wrong with retries inside retries?']);
  I(`A service is slow but CPU is only 20%. What now?`, `<p>The service is waiting, not computing. Take a wall-clock profile or thread dumps to see where threads block: outbound HTTP, DB connection acquisition, locks, synchronized blocks, GC pauses, or a saturated pool/queue. Check pool metrics (active threads, queue depth, connection wait), downstream latencies in traces, and GC logs. Remedies depend on the cause: timeouts and parallel calls for slow dependencies, fewer or shorter transactions for DB waits, finer-grained or lock-free structures for lock contention, async or virtual threads for many concurrent waits, and bulkheads to stop one dependency starving others.</p>`, 'A', ['How does a wall-clock profile differ from CPU?', 'What would a thread dump show for pool exhaustion?']);
  I(`How do you decide the right load for a capacity plan?`, `<p>Measure the knee of the throughput-latency curve with a stress test, find which resource saturates first, and plan to run at about 60-70% of that knee at forecast peak so you survive spikes and instance loss. Multiply the forecast by a safety factor, include shared limits (DB connections and CPU, caches, third parties), account for N+1 zone redundancy, and verify with a load test at 1.2-1.5x forecast before the event. Revisit after each release because code changes move the knee, and track cost per request.</p>`, 'A', ['What if staging is smaller than prod?', 'How do you handle sudden viral traffic?']);

  registerModule({
    id: 'be12',
    title: 'Performance & Scalability Engineering',
    intro: `<p>This module is about the day your service gets popular and falls over. You learn to <b>measure</b> instead of guess (flame graphs, heap profiles), to <b>size</b> thread pools with Little's law, to stop threads from being wasted while waiting (async I/O, virtual threads), to keep overload from becoming a disaster (bounded queues, backpressure, load shedding, graceful degradation), and to <b>prove</b> it with load tests that report p50/p95/p99 honestly. It builds on Caching &amp; Async Processing and Microservices Patterns, and leads into DevOps autoscaling and Observability.</p>`,
    goals: ['Read a flame graph and a heap trend and name the real bottleneck', 'Size thread and connection pools with Little\'s law and the CPU/IO formulas', 'Choose between platform threads, async/reactive and virtual threads for a workload', 'Add bounded queues, backpressure and rejection so overload fails fast', 'Design and interpret a load test with p50/p95/p99, avoiding coordinated omission', 'Plan horizontal scaling and connection budgets across layers', 'Build a degradation ladder and priority-based load shedding'],
    prereqs: `Backend modules on Data Access Patterns (connection pooling), Caching &amp; Asynchronous Processing, and Microservices Patterns; basic Java concurrency (threads, ExecutorService).`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
