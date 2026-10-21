(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('Future<T>') → inline code with < > escaped; P(`...`) → escaped code block for prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function codePart(code, lines, cls, label) {
    var hl = {};
    [].concat(lines === undefined || lines === null ? [] : lines).forEach(function (n) { hl[n] = cls || 'cur'; });
    return { type: 'code', label: label || 'Code (highlighted = running now)', lang: 'java', code: code, hl: hl };
  }
  function copyObj(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function tokens(input, re, hint) {
    var t = String(input === undefined ? '' : input).trim().split(re || /[\s,]+/).filter(function (x) { return x.length; });
    if (!t.length) throw new Error(hint || 'Please type something');
    return t;
  }

  /* ======================================================================
     TOPIC 1 — ExecutorService & Thread Pools
     ====================================================================== */
  topics.push({
    title: 'ExecutorService & Thread Pools (ThreadPoolExecutor from the inside)',
    analogy: `<p>Think of a <b>restaurant kitchen</b>. Hiring a brand-new chef for every single order would be crazy: interviews, uniforms, training — slower than cooking the dish! Instead the kitchen keeps a <b>fixed team of chefs</b> (worker threads). Orders arrive on a <b>ticket rail</b> (the task queue). A free chef grabs the next ticket. If the rail is completely full on a Friday night, the manager may hire a few <b>temporary chefs</b> (threads above the core size). If even they are busy and the rail is full, the host must <b>turn customers away</b> (rejection policy) — or make the waiter cook the dish himself (CallerRunsPolicy). At closing time the manager either lets chefs finish the tickets on the rail (${C('shutdown()')}) or shouts "stop everything!" (${C('shutdownNow()')}).</p>`,
    explain: `<p><b>Plain idea:</b> creating a Java platform thread is expensive (an OS thread, ~1 MB of stack reserved, kernel bookkeeping). So instead of ${C('new Thread(task).start()')} for every job, we create a few threads <b>once</b> and feed them tasks. That reusable crew is a <b>thread pool</b>, and ${C('ExecutorService')} is the Java interface you talk to.</p>
<h4>1. The interface family</h4>
${H.table(['Interface', 'What it adds', 'Key methods'], [
  [C('Executor'), 'just "run this somehow"', C('execute(Runnable)')],
  [C('ExecutorService'), 'results, lifecycle, bulk ops', C('submit, invokeAll, invokeAny, shutdown, shutdownNow, awaitTermination, close()')],
  [C('ScheduledExecutorService'), 'delays and repeats', C('schedule, scheduleAtFixedRate, scheduleWithFixedDelay')]
])}
<h4>2. Ready-made pools from ${C('Executors')}</h4>
${H.table(['Factory', 'Threads', 'Queue', 'Use when', 'Trap'], [
  [C('newFixedThreadPool(n)'), 'exactly n', 'unbounded LinkedBlockingQueue', 'steady CPU work', H.c('r', 'queue can grow until OutOfMemoryError')],
  [C('newCachedThreadPool()'), '0 … unlimited', 'SynchronousQueue (no storage)', 'many short bursts', H.c('r', 'thread explosion under load')],
  [C('newSingleThreadExecutor()'), '1', 'unbounded', 'tasks must run in order', 'same OOM risk'],
  [C('newScheduledThreadPool(n)'), 'n', 'delay queue', 'timers, heartbeats', 'one slow task delays the next run'],
  [C('newWorkStealingPool()'), '#cores', 'per-thread deques (ForkJoinPool)', 'recursive / uneven tasks', 'daemon threads'],
  [C('newVirtualThreadPerTaskExecutor()'), '1 virtual thread per task', 'none needed', 'Java 21+, blocking I/O', 'not for CPU-heavy loops']
])}
<h4>3. The real engine: ${C('ThreadPoolExecutor')}'s 7 knobs</h4>
${P(`
new ThreadPoolExecutor(
    corePoolSize,      // threads kept alive even when idle
    maximumPoolSize,   // hard upper limit of threads
    keepAliveTime, unit,   // how long EXTRA (non-core) idle threads live
    workQueue,         // where waiting tasks sit (bounded or not!)
    threadFactory,     // names threads, daemon flag, uncaught handler
    rejectedHandler);  // what to do when full`)}
<h4>4. The submission algorithm (the #1 interview question)</h4>
<ol>
<li>Fewer than <b>core</b> threads alive? → <span class="c-g">start a new thread</span> with this task (even if others are idle).</li>
<li>Otherwise try to <b>put the task in the queue</b>. Room? → <span class="c-b">queued</span>.</li>
<li>Queue full? → if threads &lt; <b>max</b>, <span class="c-y">start an extra thread</span> for this task.</li>
<li>Already at max and queue full? → <span class="c-r">reject</span> (call the RejectedExecutionHandler).</li>
</ol>
<p>Surprise for most people: the pool grows past core <b>only after the queue is full</b>. With an unbounded queue, maximumPoolSize is never used.</p>
<h4>5. Rejection policies</h4>
${H.table(['Policy', 'Behaviour', 'Good for'], [
  [C('AbortPolicy') + ' (default)', 'throws RejectedExecutionException', 'fail fast, caller decides'],
  [C('CallerRunsPolicy'), 'the submitting thread runs the task itself', H.c('g', 'natural back-pressure') + ' (submitter slows down)'],
  [C('DiscardPolicy'), 'silently drops the new task', 'metrics samples you can lose'],
  [C('DiscardOldestPolicy'), 'drops the oldest queued task, retries', 'latest-value-wins feeds']
])}
<h4>6. Lifecycle — always shut pools down</h4>
<ul>
<li>${C('shutdown()')}: no new tasks; queued and running tasks <b>finish</b>.</li>
<li>${C('shutdownNow()')}: interrupts running tasks, <b>returns</b> the never-started ones as a list.</li>
<li>${C('awaitTermination(t, unit)')}: wait (with a timeout) until everything is done.</li>
<li>Java 19+: ${C('ExecutorService')} is ${C('AutoCloseable')} — ${C('try (var ex = ...) { }')} calls ${C('close()')}, which shuts down and waits.</li>
</ul>
<h4>7. execute vs submit</h4>
<p>${C('execute(Runnable)')} — an exception kills the worker thread and is printed by the uncaught-exception handler. ${C('submit(...)')} — the exception is <b>captured inside the Future</b>; if you never call ${C('get()')} it is silently lost. Classic production bug!</p>
<h4>8. How many threads?</h4>
<ul><li><b>CPU-bound</b> (hashing, image math): about <b>#cores</b> (maybe +1). More threads only add context switches.</li>
<li><b>I/O-bound</b> (HTTP, DB): <b>cores × (1 + wait time / compute time)</b>. Example: 8 cores, 90 ms waiting per 10 ms computing → 8 × (1 + 9) = <b>80</b> threads. Or, in Java 21, just use virtual threads.</li></ul>`,
    clues: ['"handle thousands of short tasks" / "don\'t create a thread per request" → thread pool', '"what happens when the pool is full?" → queue then max then RejectedExecutionHandler', '"the service ran out of memory under load" + newFixedThreadPool → unbounded queue', '"tasks fail silently" → exceptions swallowed by submit() Futures', '"back-pressure" / "slow down producers" → bounded queue + CallerRunsPolicy', '"run every 5 seconds" → ScheduledExecutorService', '"CPU-bound vs I/O-bound pool size" → cores vs cores × (1 + W/C)'],
    code: [`
import java.util.concurrent.atomic.AtomicInteger;

public class PoolDemo {
    public static void main(String[] args) throws InterruptedException {
        // A named thread factory: names show up in thread dumps (jstack) - priceless when debugging.
        AtomicInteger seq = new AtomicInteger();
        ThreadFactory named = r -> {
            Thread t = new Thread(r, "resize-worker-" + seq.incrementAndGet());
            t.setDaemon(false);
            return t;
        };

        ThreadPoolExecutor pool = new ThreadPoolExecutor(
                2,                                   // core threads
                4,                                   // max threads
                30, TimeUnit.SECONDS,                // extra threads die after 30s idle
                new ArrayBlockingQueue<>(10),        // BOUNDED queue: memory is safe
                named,
                new ThreadPoolExecutor.CallerRunsPolicy()); // back-pressure instead of dropping

        for (int i = 1; i <= 20; i++) {
            final int id = i;
            pool.execute(() -> {
                // Simulated work: a tiny bit of CPU
                long sum = 0;
                for (int k = 0; k < 100_000; k++) sum += k % (id + 1);
                System.out.println(Thread.currentThread().getName() + " finished task " + id + " (" + sum + ")");
            });
        }

        pool.shutdown();                                     // stop accepting, finish queued work
        if (!pool.awaitTermination(10, TimeUnit.SECONDS)) {  // wait politely
            List<Runnable> neverRan = pool.shutdownNow();    // then force
            System.out.println("Dropped " + neverRan.size() + " tasks");
        }
        System.out.println("completed by pool threads = " + pool.getCompletedTaskCount()); // tasks run by CallerRunsPolicy on main are not counted
    }
}`, `
// Java 19+: ExecutorService is AutoCloseable. close() = shutdown() + wait for all tasks.
static int squaresSum() throws Exception {
    try (ExecutorService ex = Executors.newFixedThreadPool(4)) {
        List<Future<Integer>> fs = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            final int n = i;
            fs.add(ex.submit(() -> n * n));          // Callable<Integer>
        }
        int total = 0;
        for (Future<Integer> f : fs) total += f.get(); // 1+4+9+16+25
        return total;                                   // 55
    }                                                   // close() runs here
}`],
    codeTitle: ['Production-style ThreadPoolExecutor (bounded queue, named threads, back-pressure, clean shutdown)', 'try-with-resources pool (Java 19+)'],
    viz: {
      title: 'Thread pool simulator: core → queue → max → reject',
      input: '2 4 2 9',
      inputLabel: 'corePoolSize maxPoolSize queueCapacity numberOfTasks (e.g. 2 4 2 9)',
      gen: function (input) {
        var m = String(input).match(/\d+/g);
        if (!m || m.length < 4) throw new Error('Format: core max queueCapacity tasks, e.g. 2 4 2 9');
        var core = +m[0], max = +m[1], cap = +m[2], n = +m[3];
        if (core < 1 || max < core || max > 6 || cap > 100 || n < 1 || n > 14) throw new Error('Need 1 ≤ core ≤ max ≤ 6, queue capacity ≤ 100, tasks 1..14');
        var H_ = Math.max(60, max * 12 + 8);
        var workers = [], queue = [], rejected = [], completed = 0, frames = [];
        function g(hl, ehl) {
          var nodes = [
            { id: 'S', label: 'Submitter (main)', x: 9, y: H_ / 2, shape: 'box', w: 16 },
            { id: 'Q', label: 'Queue ' + queue.length + '/' + cap, x: 42, y: H_ / 2 - 10, shape: 'box', w: 16 },
            { id: 'R', label: 'Rejected: ' + rejected.length, x: 42, y: H_ - 6, shape: 'box', w: 16 }
          ], edges = [['S', 'Q'], ['S', 'R']];
          workers.forEach(function (w, i) {
            nodes.push({ id: w.id, label: w.id + (w.core ? ' (core)' : ' (extra)') + ': ' + (w.task || 'idle'), x: 82, y: 6 + i * ((H_ - 12) / Math.max(1, max - 1)), shape: 'box', w: 26 });
            edges.push(['Q', w.id]);
          });
          return { type: 'graph', label: 'ThreadPoolExecutor', directed: true, height: H_, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
        }
        function snap(narr, hl, ehl, qhl) {
          frames.push({ narr: narr, parts: [
            g(hl, ehl),
            { type: 'queue', label: 'workQueue (capacity ' + cap + ')', items: queue.slice(), hl: qhl || {}, frontLabel: 'head (taken next)', backLabel: 'tail' },
            { type: 'vars', label: 'Pool stats', vals: { poolSize: workers.length, active: workers.filter(function (w) { return w.task; }).length, queued: queue.length, completed: completed, rejected: rejected.length }, hl: {} }
          ] });
        }
        snap('An empty pool: <b>core=' + core + '</b>, <b>max=' + max + '</b>, bounded queue of <b>' + cap + '</b>. No threads exist yet — ThreadPoolExecutor starts threads lazily. Every task below is long-running, so nobody finishes during the burst.', {}, {});
        for (var i = 1; i <= n; i++) {
          var t = 'T' + i;
          if (workers.length < core) {
            var w = { id: 'W' + (workers.length + 1), core: true, task: t };
            workers.push(w);
            snap('<b>' + t + '</b>: only ' + (workers.length - 1) + ' thread(s) &lt; core ' + core + ' → rule 1: <span class="c-g">start a new core thread</span> ' + w.id + ' and hand it ' + t + ' directly (the queue is skipped).', one(w.id, 'ok'), {});
          } else if (queue.length < cap) {
            queue.push(t);
            snap('<b>' + t + '</b>: core threads all exist → rule 2: <span class="c-b">offer to the queue</span>. Room left, so ' + t + ' waits in line. Note: no new thread is created even though max = ' + max + '!', one('Q', 'win'), one('S-Q', 'ok'), one(queue.length - 1, 'ok'));
          } else if (workers.length < max) {
            var w2 = { id: 'W' + (workers.length + 1), core: false, task: t };
            workers.push(w2);
            snap('<b>' + t + '</b>: queue is <b>full</b> (' + cap + '/' + cap + ') → rule 3: threads ' + (workers.length - 1) + ' &lt; max ' + max + ', so <span class="c-y">start an EXTRA thread</span> ' + w2.id + ' for ' + t + '. Fun fact: ' + t + ' jumps ahead of the tasks already queued!', one(w2.id, 'cur'), {});
          } else {
            rejected.push(t);
            snap('<b>' + t + '</b>: queue full AND ' + max + ' threads busy → rule 4: <span class="c-r">REJECTED</span>. AbortPolicy throws RejectedExecutionException; CallerRunsPolicy would make the submitter run ' + t + ' itself (slowing it down = back-pressure).', one('R', 'bad'), one('S-R', 'bad'));
          }
        }
        var guard = 0, rr = 0;
        while ((queue.length || workers.some(function (w) { return w.task; })) && guard++ < 40) {
          var busy = workers.filter(function (w) { return w.task; });
          var wk = busy[rr++ % busy.length];
          var doneTask = wk.task;
          completed++;
          if (queue.length) {
            wk.task = queue.shift();
            snap(wk.id + ' finished ' + doneTask + ' and immediately <b>takes the head of the queue</b> (' + wk.task + '). Workers loop forever: run task → take() next → run …', one(wk.id, 'ok'), one('Q-' + wk.id, 'ok'));
          } else {
            wk.task = null;
            snap(wk.id + ' finished ' + doneTask + '. Queue is empty, so it blocks in <code>queue.take()</code> (core) or <code>poll(keepAlive)</code> (extra).', one(wk.id, 'done'), {});
          }
        }
        var extras = workers.filter(function (w) { return !w.core; });
        if (extras.length) {
          workers = workers.filter(function (w) { return w.core; });
          snap('After <b>keepAliveTime</b> with nothing to do, the ' + extras.length + ' extra thread(s) (' + extras.map(function (w) { return w.id; }).join(', ') + ') time out in <code>poll()</code> and die. The pool shrinks back to core = ' + core + '.', {}, {});
        }
        snap('Done: ' + completed + ' completed, ' + rejected.length + ' rejected. Try <b>2 4 100 9</b> (huge queue): no extra thread is ever created — that is exactly what happens with newFixedThreadPool\'s unbounded queue.', {}, {});
        return frames;
      }
    },
    examples: [
      { title: 'Why newFixedThreadPool can crash a service', html: `<p>A service uses ${C('Executors.newFixedThreadPool(8)')} to send emails. The SMTP server slows down; tasks pile up in the <b>unbounded</b> LinkedBlockingQueue. Each queued task holds an email body (say 50 KB). 200,000 queued tasks × 50 KB = <b>10 GB</b> → ${H.c('r', 'OutOfMemoryError')}. Fix: build the ThreadPoolExecutor yourself with ${C('new ArrayBlockingQueue<>(1000)')} and a rejection policy that applies back-pressure or returns HTTP 503.</p>`, code: `
ThreadPoolExecutor safe = new ThreadPoolExecutor(8, 8, 0, TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<>(1000),
        new ThreadPoolExecutor.CallerRunsPolicy());
safe.shutdown();` },
      { title: 'submit() swallows exceptions, execute() does not', html: `<p>${C('pool.submit(() -> 1 / 0)')} → nothing is printed. The ArithmeticException sits inside the Future. Only ${C('future.get()')} rethrows it, wrapped in ${C('ExecutionException')} (use ${C('getCause()')}). With ${C('execute')} the exception escapes to the thread's UncaughtExceptionHandler (printed to stderr) and the pool replaces the dead worker.</p>`, code: `
ExecutorService ex = Executors.newSingleThreadExecutor();
Future<Integer> f = ex.submit(() -> 1 / 0);   // silent!
try {
    f.get();
} catch (ExecutionException e) {
    System.out.println("cause = " + e.getCause()); // java.lang.ArithmeticException: / by zero
} finally {
    ex.shutdown();
}` },
      { title: 'Fixed rate vs fixed delay', html: `<p>Task takes 3 s, period 5 s. ${C('scheduleAtFixedRate')}: starts at 0, 5, 10… (start-to-start). ${C('scheduleWithFixedDelay')}: starts at 0, 8, 16… (end-to-start = 3 + 5). If a fixed-rate run takes longer than the period, the next run starts late but runs never overlap. If a scheduled task throws, <b>all future runs silently stop</b> — wrap the body in try/catch.</p>`, code: `
ScheduledExecutorService ses = Executors.newScheduledThreadPool(1);
ScheduledFuture<?> beat = ses.scheduleAtFixedRate(() -> {
    try {
        System.out.println("heartbeat " + System.currentTimeMillis());
    } catch (RuntimeException e) {          // never let it escape: it would cancel the schedule
        e.printStackTrace();
    }
}, 0, 5, TimeUnit.SECONDS);
beat.cancel(false);
ses.shutdown();` },
      { title: 'Sizing a pool with numbers', html: `<p>Image thumbnails: pure CPU, 16 cores → ${H.c('g', '16 threads')}. Calling a payment API: each call is 200 ms waiting + 5 ms CPU, 16 cores → 16 × (1 + 200/5) = 16 × 41 = ${H.c('y', '656 threads')} — that many platform threads is heavy (656 MB of reserved stack), which is exactly why Java 21 virtual threads exist.</p>` }
    ],
    deepDive: `<p><b>Inside ThreadPoolExecutor.</b> A single ${C('AtomicInteger ctl')} packs two values: the top 3 bits hold the <b>run state</b> (RUNNING, SHUTDOWN, STOP, TIDYING, TERMINATED) and the low 29 bits hold the <b>worker count</b>. One CAS updates both atomically, so "is the pool running AND can I add a worker?" is decided without a lock. Each ${C('Worker')} is a Runnable that also extends AQS (a tiny non-reentrant lock used so ${C('shutdown()')} can tell idle workers from busy ones and interrupt only idle ones). The worker's ${C('runWorker')} loop calls ${C('getTask()')}: core threads use ${C('queue.take()')} (wait forever), extra threads use ${C('queue.poll(keepAlive)')} — returning null makes the thread exit. ${C('allowCoreThreadTimeOut(true)')} lets core threads die too; ${C('prestartAllCoreThreads()')} warms the pool up.</p>
<p><b>Queue choice is the real design decision.</b> ${C('SynchronousQueue')} has zero capacity — every offer needs a waiting taker, so the cached pool grows a thread for every concurrent task. ${C('LinkedBlockingQueue')} without a bound means max is ignored. ${C('ArrayBlockingQueue')} gives a hard memory bound. ${C('PriorityBlockingQueue')} reorders tasks (but they must be Comparable, and ${C('submit')} wraps them in FutureTask, which is not — use ${C('execute')}).</p>
<p><b>Thread-starvation deadlock:</b> a task running on a 2-thread pool submits a subtask to the <i>same</i> pool and calls ${C('get()')}. If both threads do that, both wait for subtasks stuck in the queue forever. Fix: separate pools, ${C('ForkJoinPool')} (which helps run subtasks while joining), or CompletableFuture composition with no blocking.</p>
<p><b>Production reality:</b> name your threads; export ${C('getActiveCount()')}, ${C('getQueue().size()')}, ${C('getCompletedTaskCount()')} to metrics (Micrometer has ExecutorServiceMetrics); clear ThreadLocals (pooled threads live forever, so a ThreadLocal holding a user id leaks to the next request); override ${C('beforeExecute/afterExecute')} for MDC logging context and timing; and remember ${C('ForkJoinPool.commonPool()')} is shared by parallel streams and default CompletableFuture async methods — one blocking task there can stall unrelated code.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily generate ${C('Executors.newFixedThreadPool(10)')} or ${C('newCachedThreadPool()')} in every snippet because that is what most training examples show. They rarely add a bound, a rejection policy, thread names or a shutdown. <b>Use AI as a partner:</b> ask "<i>list every way this executor can leak memory, lose exceptions or never terminate</i>" — models are good reviewers when told what to look for. Ask it to compute a pool size from your measured wait/compute ratio and to explain the formula back to you. <b>Where AI goes wrong:</b> it claims the pool grows to max before queueing (wrong order), forgets that ${C('submit')} hides exceptions, or mixes up ${C('shutdown')} and ${C('shutdownNow')}. <b>What you must still own:</b> choosing the queue bound and rejection behaviour from business rules (drop? slow down? return 503?), load-testing the pool, and reading thread dumps when it misbehaves at 3 a.m. In 2026 the default for blocking I/O work is often a virtual-thread executor — knowing <i>when not</i> to use a classic pool is part of senior judgement.</p>`,
    problems: [{
      title: 'Configure a Safe Executor for an Image-Resize Service',
      level: 'Medium', tags: ['ThreadPoolExecutor', 'back-pressure', 'design'], companies: ['Amazon', 'Uber', 'Flipkart'],
      statement: `<p>An upload service receives bursts of image-resize jobs (CPU-bound, ~50 ms each) on an 8-core machine. Requirements: (1) never run out of memory, (2) never silently drop a job, (3) when overloaded, <b>slow the producers down</b>, (4) threads must be identifiable in thread dumps, (5) the app must shut down cleanly. Write ${C('ExecutorService createResizePool()')} and a ${C('main')} that submits 100 jobs and shuts down.</p>`,
      constraints: `8 cores, CPU-bound tasks, bursts up to 10,000 jobs/second, memory budget allows ~500 queued jobs.`,
      example: `<p>Burst of 10,000 jobs → 8 threads busy, 500 queued, the next submit is executed <b>by the submitting thread itself</b> (${H.c('g', 'CallerRunsPolicy')}), so the HTTP thread is busy for 50 ms and naturally accepts fewer uploads. Nothing is lost, memory stays bounded.</p>`,
      brute: { why: `<p>${C('Executors.newFixedThreadPool(8)')} uses an <b>unbounded</b> queue — a long burst means unlimited memory (violates 1). ${C('newCachedThreadPool()')} creates a new thread per concurrent job — thousands of threads fighting for 8 cores (thrashing, possible OOM: unable to create native thread). Neither gives back-pressure.</p>`, code: `
static ExecutorService naivePool() {
    return Executors.newCachedThreadPool(); // unbounded threads: 10k jobs -> up to 10k threads
}` },
      mcq: { q: 'core=8, max=16, queue=ArrayBlockingQueue(500). 520 long jobs arrive instantly. How many threads run?', options: ['8', '16', '20', '520'], answer: 1, explain: '8 core threads take jobs 1-8, jobs 9-508 fill the queue, jobs 509-516 create 8 extra threads (total 16), jobs 517-520 are rejected.' },
      hints: [`<p>Hint 1: requirement 1 means the queue must have a <b>bound</b>. Requirement 3 is literally the description of one built-in rejection policy.</p>`, `<p>Hint 2: CPU-bound → threads ≈ cores. Build ${C('new ThreadPoolExecutor(8, 8, …, new ArrayBlockingQueue<>(500), factory, new CallerRunsPolicy())')}.</p>`, `<p>Hint 3: name threads via a ThreadFactory with an AtomicInteger counter. Shutdown recipe: ${C('shutdown()')} → ${C('awaitTermination')} with timeout → ${C('shutdownNow()')} as last resort.</p>`],
      tests: { sig: 'string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind) throws Exception {
    ThreadPoolExecutor pool = (ThreadPoolExecutor) ResizeService.createResizePool();
    int cores = Runtime.getRuntime().availableProcessors();
    String[] p = kind.split(":");
    try {
      switch (p[0]) {
        case "props":
          return new String[]{ "ThreadPoolExecutor", String.valueOf(pool.getCorePoolSize() == cores && pool.getMaximumPoolSize() == cores),
            String.valueOf(pool.getQueue().remainingCapacity()), pool.getRejectedExecutionHandler().getClass().getSimpleName() };
        case "names": {
          String[] name = new String[1];
          pool.submit(() -> name[0] = Thread.currentThread().getName()).get();
          return new String[]{ String.valueOf(name[0].startsWith("resize-")) };
        }
        case "noloss": {
          int n = Integer.parseInt(p[1]);
          AtomicInteger c = new AtomicInteger();
          for (int i = 0; i < n; i++) pool.execute(c::incrementAndGet);
          pool.shutdown();
          pool.awaitTermination(60, TimeUnit.SECONDS);
          return new String[]{ String.valueOf(c.get()), String.valueOf(pool.isTerminated()) };
        }
        default: {
          CountDownLatch gate = new CountDownLatch(1), started = new CountDownLatch(cores);
          AtomicInteger c = new AtomicInteger();
          for (int i = 0; i < cores; i++) pool.execute(() -> { started.countDown(); try { gate.await(); } catch (InterruptedException e) { } c.incrementAndGet(); });
          started.await();
          for (int i = 0; i < 500; i++) pool.execute(c::incrementAndGet);
          int queued = pool.getQueue().size();
          Thread caller = Thread.currentThread();
          boolean[] onCaller = new boolean[1];
          pool.execute(() -> { onCaller[0] = Thread.currentThread() == caller; c.incrementAndGet(); });
          boolean ranBeforeRelease = onCaller[0];
          gate.countDown();
          pool.shutdown();
          pool.awaitTermination(60, TimeUnit.SECONDS);
          return new String[]{ String.valueOf(ranBeforeRelease), String.valueOf(queued), String.valueOf(c.get() == cores + 501) };
        }
      }
    } finally { pool.shutdownNow(); }
  }
}` }, cases: [
          [['props'], ['ThreadPoolExecutor', 'true', '500', 'CallerRunsPolicy']],
          [['names'], ['true']],
          [['noloss:1'], ['1', 'true']],
          [['noloss:100'], ['100', 'true']],
          [['noloss:10000'], ['10000', 'true']],
          [['callerRuns'], ['true', '500', 'true']]
        ] },
      solution: {
        approach: `<p>Bounded queue (memory), CallerRunsPolicy (no drops + back-pressure), core = max = cores (CPU-bound, extra threads would not help), named threads, graceful shutdown. Because core = max, the keep-alive value does not matter.</p>`,
        code: `
import java.util.concurrent.atomic.AtomicInteger;

public class ResizeService {
    static ExecutorService createResizePool() {
        int cores = Runtime.getRuntime().availableProcessors();
        AtomicInteger n = new AtomicInteger();
        ThreadFactory tf = r -> new Thread(r, "resize-" + n.incrementAndGet());
        return new ThreadPoolExecutor(cores, cores, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(500),                 // bounded: memory safe
                tf,                                            // readable thread dumps
                new ThreadPoolExecutor.CallerRunsPolicy());    // overload -> caller works -> slows down
    }

    static void resize(int id) {
        long x = 0;
        for (int i = 0; i < 200_000; i++) x += (i ^ id) & 7;   // pretend CPU work
        if (id % 25 == 0) System.out.println(Thread.currentThread().getName() + " resized " + id + " " + x);
    }

    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = createResizePool();
        for (int i = 1; i <= 100; i++) {
            final int id = i;
            pool.execute(() -> resize(id));
        }
        pool.shutdown();
        if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();
        System.out.println("all done");
    }
}`,
        dry: { head: ['jobs submitted', 'threads', 'queue', 'what happens to the next job'], rows: [['1-8', '8 (core)', '0', 'new core thread each'], ['9-508', '8', '1 → 500', 'queued'], ['509', '8 (max = core)', '500 (full)', H.c('g', 'CallerRunsPolicy: main thread resizes it')], ['while main is busy', '8', 'draining', 'no new submissions (back-pressure)'], ['after shutdown()', '8 → 0', '0', 'workers exit when queue empties']] },
        complexity: `<p>Memory O(queue bound + threads) — constant. Throughput ≈ cores × (1 / 50 ms) = 160 jobs/s on 8 cores; the policy converts any excess into producer slowdown rather than memory growth.</p>`,
        followUps: ['What would you change if resizing called a remote API (I/O-bound)?', 'How would you expose queue depth to your monitoring?', 'Why is CallerRunsPolicy dangerous if the caller is an event-loop (Netty) thread?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Callable & Future
     ====================================================================== */
  topics.push({
    title: 'Callable & Future: Getting Results (and Errors) Back from Threads',
    analogy: `<p>You drop your shirt at a <b>dry cleaner</b>. You don't stand at the counter for two hours — they hand you a <b>receipt</b> and you go buy groceries. Later you come back with the receipt: if the shirt is ready you take it; if not, you can <b>wait at the counter</b> (${C('get()')}), wait <b>only 10 minutes</b> then leave (${C('get(10, MINUTES)')}), peek through the window (${C('isDone()')}), or <b>cancel the order</b> (${C('cancel()')}). If they burned your shirt, the receipt tells you what went wrong (${C('ExecutionException')}). The task you handed over is the ${C('Callable')}; the receipt is the ${C('Future')}.</p>`,
    explain: `<p><b>Plain idea:</b> ${C('Runnable.run()')} returns nothing and cannot throw checked exceptions. Real work usually <b>computes something</b> (a price, a file, a count) and <b>can fail</b>. ${C('Callable<V>')} fixes both: ${C('V call() throws Exception')}. When you submit it to an executor you immediately get a ${C('Future<V>')} — a handle to a result that may not exist yet.</p>
${H.table(['', C('Runnable'), C('Callable<V>')], [['Method', C('void run()'), C('V call() throws Exception')], ['Returns a value?', H.c('r', 'no'), H.c('g', 'yes')], ['Checked exceptions?', H.c('r', 'must catch inside'), H.c('g', 'allowed, delivered via Future')], ['Since', 'Java 1.0', 'Java 5'], ['Use with Thread directly?', 'yes', 'no (wrap in FutureTask)']])}
<h4>The Future API</h4>
${H.table(['Method', 'What it does', 'Blocks?'], [
  [C('V get()'), 'waits until done, returns result or throws', H.c('r', 'yes, forever')],
  [C('V get(long, TimeUnit)'), 'same, but gives up with TimeoutException', H.c('y', 'up to timeout')],
  [C('boolean isDone()'), 'finished normally, failed, OR cancelled', 'no'],
  [C('boolean cancel(boolean mayInterrupt)'), 'stop it: not started → never runs; running → interrupt if true', 'no'],
  [C('boolean isCancelled()'), 'was it cancelled before finishing?', 'no'],
  [C('state(), resultNow(), exceptionNow()'), 'Java 19+: inspect a finished future without try/catch', 'no']
])}
<h4>The three exceptions of ${C('get()')}</h4>
<ul>
<li>${C('ExecutionException')} — the task threw; the real error is ${C('e.getCause()')}.</li>
<li>${C('TimeoutException')} — only from the timed ${C('get')}; the task is <b>still running</b>! Cancel it if you no longer care.</li>
<li>${C('InterruptedException')} — <i>your</i> waiting thread was interrupted. Restore the flag: ${C('Thread.currentThread().interrupt()')}.</li>
<li>Plus unchecked ${C('CancellationException')} if the future was cancelled.</li>
</ul>
<h4>Bulk helpers</h4>
<ul>
<li>${C('invokeAll(tasks)')} — runs all, <b>waits for all</b>, returns futures in the <b>same order</b> as the input list.</li>
<li>${C('invokeAny(tasks)')} — returns the result of the <b>first one that succeeds</b> and cancels the rest (great for "ask 3 mirrors, use the fastest").</li>
<li>${C('ExecutorCompletionService')} — hands you futures in <b>completion order</b>, so you can process the fast results first.</li>
</ul>
<h4>Cancellation is cooperative</h4>
<p>${C('cancel(true)')} only <b>sets the interrupt flag</b> on the worker thread. Blocking calls like ${C('sleep')}, ${C('wait')}, ${C('BlockingQueue.take')} react by throwing InterruptedException; a pure CPU loop keeps spinning unless it checks ${C('Thread.currentThread().isInterrupted()')}.</p>
<h4>Why Future is not enough</h4>
<p>A plain Future has no callbacks: to use the result you must <b>block</b> on ${C('get()')}. You cannot say "when done, then do X", combine two futures, or complete it yourself. That gap is filled by ${C('CompletableFuture')} (topic 7).</p>`,
    clues: ['"return a result from a thread" / "task can throw checked exception" → Callable', '"wait at most 2 seconds for the answer" → get(timeout) + cancel', '"query 3 replicas, use the first answer" → invokeAny', '"process results as soon as each finishes" → ExecutorCompletionService', '"run N independent jobs and wait for all" → invokeAll', '"task failed but nothing was logged" → exception hidden in an un-read Future', '"stop a long computation" → cancel(true) + interrupt checks'],
    code: [`
public class FutureDemo {
    static int slowSquare(int x) throws InterruptedException {
        Thread.sleep(200);                 // pretend remote call
        return x * x;
    }

    public static void main(String[] args) throws InterruptedException {
        ExecutorService ex = Executors.newFixedThreadPool(2);
        try {
            Callable<Integer> job = () -> slowSquare(7);   // may throw: fine for Callable
            Future<Integer> f = ex.submit(job);           // returns IMMEDIATELY

            System.out.println("main keeps working while the square is computed");

            try {
                Integer r = f.get(1, TimeUnit.SECONDS);   // wait at most 1 s
                System.out.println("result = " + r);      // 49
            } catch (TimeoutException e) {
                f.cancel(true);                           // we stopped caring: interrupt it
                System.out.println("too slow, cancelled");
            } catch (ExecutionException e) {
                System.out.println("task failed: " + e.getCause());
            }
        } finally {
            ex.shutdown();
        }
    }
}`, `
// invokeAll keeps input order; ExecutorCompletionService gives completion order.
static void orderDemo() throws Exception {
    ExecutorService ex = Executors.newFixedThreadPool(3);
    try {
        List<Callable<String>> jobs = List.of(
                () -> { Thread.sleep(300); return "slow"; },
                () -> { Thread.sleep(100); return "fast"; },
                () -> { Thread.sleep(200); return "medium"; });

        for (Future<String> f : ex.invokeAll(jobs)) System.out.print(f.get() + " "); // slow fast medium
        System.out.println();

        CompletionService<String> cs = new ExecutorCompletionService<>(ex);
        jobs.forEach(cs::submit);
        for (int i = 0; i < jobs.size(); i++) System.out.print(cs.take().get() + " "); // fast medium slow
        System.out.println();
    } finally {
        ex.shutdown();
    }
}`],
    codeTitle: ['Callable + Future with a timeout and cancellation', 'invokeAll (input order) vs CompletionService (finish order)'],
    viz: {
      title: 'Future timeline: submit → do other work → get(timeout)',
      input: '300 100 500',
      inputLabel: 'taskMillis mainWorkMillis timeoutMillis (try 300 100 150 for a timeout)',
      gen: function (input) {
        var m = String(input).match(/\d+/g);
        if (!m || m.length < 3) throw new Error('Format: taskMillis mainWorkMillis timeoutMillis, e.g. 300 100 500');
        var task = +m[0], work = +m[1], to = +m[2];
        if (task < 1 || task > 5000 || work > 5000 || to > 5000) throw new Error('Keep each number between 1 and 5000');
        var code = 'ExecutorService ex = Executors.newFixedThreadPool(1);\nFuture<Integer> f = ex.submit(() -> slowSquare(7));\ndoOtherWork();                       // main is NOT blocked\ntry {\n    Integer r = f.get(TIMEOUT, MILLISECONDS);\n    System.out.println("result = " + r);\n} catch (TimeoutException e) {\n    f.cancel(true);                  // interrupt the worker\n}\nex.shutdown();';
        var frames = [];
        function fr(narr, line, cls, vals, hl, extra) {
          var parts = [codePart(code, line, cls), { type: 'vars', label: 'State at this moment', vals: vals, hl: hl || {} }];
          (extra || []).forEach(function (p) { parts.push(p); });
          frames.push({ narr: narr, parts: parts });
        }
        function timeline(t, mainState, workerState) {
          var cols = [], r1 = [], r2 = [], step = Math.max(50, Math.ceil(Math.max(task, work + to) / 10 / 50) * 50);
          for (var x = 0; x <= Math.max(task, work + to) + step; x += step) {
            cols.push(x + 'ms');
            r1.push(x > t ? '' : x < work ? 'work' : x <= Math.min(t, work + to) ? 'wait' : 'go');
            r2.push(x > t ? '' : x < task ? 'run' : 'done');
          }
          return { type: 'grid', label: 'Timeline (each column = ' + step + ' ms) — main: ' + mainState + ', worker: ' + workerState, rowHead: ['main', 'worker'], colHead: cols, rows: [r1, r2], hl: {} };
        }
        fr('t = 0: a pool with one worker thread is created.', 1, 'cur', { clock: '0 ms', future: '(none yet)', worker: 'idle' });
        fr('t = 0: <b>submit()</b> returns a Future <b>instantly</b>. The worker starts slowSquare(7), which needs ' + task + ' ms. The Future\'s state is <b>RUNNING</b> (internally NEW).', 2, 'ok', { clock: '0 ms', 'f.state()': 'RUNNING', 'f.isDone()': false, worker: 'computing 7*7' }, { 'f.state()': 'ok' }, [timeline(0, 'submitting', 'started')]);
        var done1 = task <= work;
        fr('Main thread does its own work for ' + work + ' ms in parallel — this overlap is the whole point of a Future. ' + (done1 ? 'The worker already finished meanwhile!' : 'Worker still busy.'), 3, 'cur', { clock: work + ' ms', 'f.state()': done1 ? 'SUCCESS' : 'RUNNING', 'f.isDone()': done1, worker: done1 ? 'idle (result stored in Future)' : 'computing' }, done1 ? { 'f.state()': 'ok' } : {}, [timeline(work, 'working', done1 ? 'done' : 'running')]);
        if (done1) {
          fr('<b>get()</b> does not block at all: the result is already stored inside the Future.', 5, 'ok', { clock: work + ' ms', r: 49, 'f.state()': 'SUCCESS' }, { r: 'ok' }, [timeline(work, 'got result', 'done')]);
          fr('Prints <b>result = 49</b>.', 6, 'ok', { output: 'result = 49' }, { output: 'ok' });
        } else if (task <= work + to) {
          fr('Main calls <b>get(' + to + ' ms)</b> and <b>blocks</b>: the thread is parked (TIMED_WAITING) until the result arrives or the timeout passes.', 5, 'cur', { clock: work + ' ms', main: 'TIMED_WAITING', 'f.isDone()': false, deadline: (work + to) + ' ms' }, { main: 'cur' }, [timeline(work, 'blocked in get', 'running')]);
          fr('t = ' + task + ' ms: the worker finishes, stores 49 in the Future and <b>wakes the waiting thread</b>. Total main wait was ' + (task - work) + ' ms — less than the ' + to + ' ms budget.', 5, 'ok', { clock: task + ' ms', r: 49, 'f.state()': 'SUCCESS', main: 'RUNNABLE' }, { r: 'ok' }, [timeline(task, 'woken', 'done')]);
          fr('Prints <b>result = 49</b>. Overlap saved ' + Math.min(work, task) + ' ms compared to doing things one after another.', 6, 'ok', { output: 'result = 49', elapsed: task + ' ms', sequentialWouldBe: (task + work) + ' ms' }, { output: 'ok' });
        } else {
          fr('Main calls <b>get(' + to + ' ms)</b> and blocks until t = ' + (work + to) + ' ms at most.', 5, 'cur', { clock: work + ' ms', main: 'TIMED_WAITING', deadline: (work + to) + ' ms' }, { main: 'cur' }, [timeline(work, 'blocked in get', 'running')]);
          fr('t = ' + (work + to) + ' ms: deadline reached, task still needs ' + (task - work - to) + ' ms. <span class="c-r">TimeoutException</span>! Important: the task is <b>still running</b> — the timeout only stopped <i>waiting</i>.', 7, 'bad', { clock: (work + to) + ' ms', 'f.isDone()': false, exception: 'TimeoutException' }, { exception: 'bad' }, [timeline(work + to, 'timed out', 'still running')]);
          fr('So we call <b>cancel(true)</b>: it sets the worker\'s <b>interrupt flag</b>. Thread.sleep inside slowSquare throws InterruptedException, so the worker stops early. A tight CPU loop that never checks the flag would ignore this!', 8, 'bad', { 'f.state()': 'CANCELLED', 'f.isCancelled()': true, 'f.isDone()': true, worker: 'interrupted → free' }, { 'f.state()': 'bad' });
        }
        fr('<b>shutdown()</b>: no new tasks; the idle worker exits; the JVM can terminate. Forgetting this keeps a non-daemon thread alive and the program never exits.', 10, 'cur', { pool: 'SHUTDOWN → TERMINATED' }, {});
        return frames;
      }
    },
    examples: [
      { title: 'Unwrapping ExecutionException', html: `<p>The worker throws ${C('IOException("disk full")')}. ${C('f.get()')} throws ${C('ExecutionException')} whose ${C('getCause()')} is the IOException. Log the <b>cause</b>, not the wrapper, or your alert will say "ExecutionException" with no detail.</p>`, code: `
ExecutorService ex = Executors.newSingleThreadExecutor();
Future<String> f = ex.submit(() -> { throw new IOException("disk full"); });
try {
    f.get();
} catch (ExecutionException e) {
    Throwable real = e.getCause();
    System.out.println(real.getClass().getSimpleName() + ": " + real.getMessage()); // IOException: disk full
} finally {
    ex.shutdown();
}` },
      { title: 'invokeAny: fastest mirror wins', html: `<p>Three mirrors answer in 300, 120 and 500 ms. ${C('invokeAny')} returns the 120 ms result and cancels the other two. If the 120 ms one <b>failed</b>, it would wait for the next successful one; only if <b>all</b> fail do you get ExecutionException.</p>`, code: `
ExecutorService ex = Executors.newFixedThreadPool(3);
try {
    String winner = ex.invokeAny(List.of(
            () -> { Thread.sleep(300); return "mirror-A"; },
            () -> { Thread.sleep(120); return "mirror-B"; },
            () -> { Thread.sleep(500); return "mirror-C"; }));
    System.out.println(winner); // mirror-B
} finally {
    ex.shutdown();
}` },
      { title: 'Java 19+ state() and resultNow()', html: `<p>After ${C('invokeAll')} every future is done, so you can read them without the checked-exception dance: switch on ${C('f.state()')} → ${C('SUCCESS')}, ${C('FAILED')}, ${C('CANCELLED')}, ${C('RUNNING')}. ${C('resultNow()')} throws IllegalStateException if the future did not succeed.</p>`, code: `
ExecutorService ex = Executors.newFixedThreadPool(2);
try {
    List<Callable<Integer>> jobs = List.of(() -> 10, () -> 10 / 0);
    for (Future<Integer> f : ex.invokeAll(jobs)) {
        switch (f.state()) {
            case SUCCESS -> System.out.println("ok " + f.resultNow());
            case FAILED -> System.out.println("failed " + f.exceptionNow());
            default -> System.out.println(f.state());
        }
    }
} finally {
    ex.shutdown();
}` },
      { title: 'FutureTask: a Future you can run on a plain Thread', html: `<p>${C('FutureTask')} implements both Runnable and Future, so ${C('new Thread(task).start()')} works and ${C('task.get()')} returns the value. Executors use FutureTask internally — ${C('submit()')} wraps your Callable in one, which is also why the exception gets stored instead of thrown.</p>`, code: `
FutureTask<String> task = new FutureTask<>(() -> "hello from " + Thread.currentThread().getName());
Thread t = new Thread(task, "helper");
t.start();
System.out.println(task.get()); // hello from helper` }
    ],
    deepDive: `<p><b>FutureTask internals.</b> A ${C('volatile int state')} moves through NEW → COMPLETING → NORMAL (or EXCEPTIONAL, CANCELLED, INTERRUPTING → INTERRUPTED). The result or exception is stored in a plain field ${C('outcome')}, published safely because the state write after it is volatile (a happens-before edge: everything the task did is visible to the thread whose ${C('get()')} returns). Waiting threads form a lock-free <b>Treiber stack</b> of WaitNodes and park with ${C('LockSupport.park')}; completion pops and unparks them all. Only <b>one</b> thread can run a FutureTask: ${C('run()')} CASes the runner field from null to itself.</p>
<p><b>Timeouts are your responsibility.</b> An untimed ${C('get()')} on a hung remote call blocks forever, and the blocked request thread is lost from the pool. Rule of thumb in services: every ${C('get')} has a timeout, and every timeout path calls ${C('cancel(true)')}. But remember cancellation only works if the task is interruptible: JDBC calls and old socket reads (${C('java.io')}) often ignore interrupts — set driver/socket timeouts as well.</p>
<p><b>Order matters when collecting.</b> Looping ${C('for (f : futures) f.get()')} waits for futures in <i>submission</i> order: if future #1 is slowest you sit idle while #2..#10 are done. CompletionService (backed by a LinkedBlockingQueue of completed futures) or ${C('CompletableFuture.allOf')} fixes this. ${C('invokeAll')} with a timeout cancels whatever is not done when time runs out — check ${C('isCancelled()')} before ${C('get()')}.</p>
<p><b>Memory visibility guarantee:</b> actions in a thread prior to submitting a task happen-before the task starts; actions of the task happen-before the result is retrieved via ${C('get()')}. So you do not need volatile on data you pass in or read back through the Future.</p>`,
    aiEra: `<p><b>What AI changes:</b> code generators often write ${C('future.get()')} with no timeout and a ${C('catch (Exception e) { e.printStackTrace(); }')} that also swallows InterruptedException without restoring the flag. They also love collecting futures in a loop in submission order. <b>Use AI as a partner:</b> paste your method and ask "<i>which calls can block forever and what happens to the interrupt flag?</i>" — or ask it to convert a Future-based fan-out into CompletableFuture or virtual threads and explain the difference. <b>Where AI goes wrong:</b> it claims ${C('cancel(true)')} kills the thread (it does not; it only interrupts), or that a TimeoutException stops the task. <b>What you must still own:</b> deciding the timeout budget per dependency (SLA thinking), knowing which libraries honour interrupts, and making sure failures are surfaced to logs and metrics instead of hiding inside a Future nobody reads.</p>`,
    problems: [{
      title: 'Parallel Array Sum with Callables',
      level: 'Easy', tags: ['Callable', 'Future', 'divide and conquer'], companies: ['Goldman Sachs', 'Infosys', 'Oracle'],
      statement: `<p>Write ${C('long parallelSum(int[] a, int parts)')} that splits the array into ${C('parts')} nearly equal chunks, sums each chunk on a thread pool using ${C('Callable<Long>')}, and returns the total. It must work for any length (including lengths not divisible by ${C('parts')}) and must shut the pool down.</p>`,
      constraints: `1 ≤ a.length ≤ 10<sup>8</sup>, 1 ≤ parts ≤ 64, values fit in int, total may overflow int → use long.`,
      example: `<p>${H.arr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { label: 'a', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'b', 4: 'b', 5: 'b', 6: 'y', 7: 'y', 8: 'y', 9: 'y' } })} parts = 3 → chunks ${H.c('g', '[0,3) = 6')}, ${H.c('b', '[3,6) = 15')}, ${H.c('y', '[6,10) = 34')} → total <b>55</b>.</p>`,
      brute: { why: `<p>A single loop is correct and simple, but uses one core. For 10<sup>8</sup> elements that is ~50-100 ms; with 8 cores we can get close to 8× faster. (For tiny arrays the brute force is actually <i>faster</i> — thread overhead dominates.)</p>`, code: `
static long sumSequential(int[] a) {
    long s = 0;
    for (int x : a) s += x;
    return s;
}` },
      mcq: { q: 'You submit 4 chunk tasks and then call get() on each future in a loop. What does the loop wait for in total?', options: ['The sum of all 4 task times', 'Roughly the slowest task', 'Only the first task', 'Nothing, get() never blocks'], answer: 1, explain: 'Tasks run in parallel. By the time the slowest finishes the others are done too, so total wait ≈ max(task times), not the sum.' },
      hints: [`<p>Hint 1: chunk boundaries: ${C('from = i * n / parts')}, ${C('to = (i + 1) * n / parts')} — computed with long to avoid overflow; this spreads the remainder evenly.</p>`, `<p>Hint 2: each chunk is a ${C('Callable<Long>')} lambda capturing effectively-final ${C('from')} and ${C('to')}. Collect ${C('List<Future<Long>>')}.</p>`, `<p>Hint 3: sum the ${C('get()')} results; wrap in try/finally with ${C('shutdown()')}. Recipe: create pool → submit parts tasks → total += f.get() for each → shutdown → return total.</p>`],
      tests: { sig: 'int[] int -> long', fn: 'parallelSum', cases: [
          [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3], 55],
          [[[7], 64], 7],
          [[[1, 2, 3], 1], 6],
          [[[1, 2, 3], 64], 6],
          [[[-5, 5, -10, 10, 1], 2], 1],
          [[[2147483647, 2147483647, 2147483647, 2147483647], 3], 8589934588],
          [[[-2147483648, -2147483648], 2], -4294967296],
          [[{ $rep: 1, n: 20000000 }, 64], 20000000],
          [[{ $range: [0, 10000000] }, 7], '49999995000000']
        ] },
      solution: {
        approach: `<p>Split into ranges with integer math so lengths differ by at most 1, submit one Callable per range, then join by calling ${C('get()')} on each Future. Each task only reads its own range, so no locking is needed; the results flow back through the Future (which gives the happens-before guarantee).</p>`,
        code: `
public class ParallelSum {
    static long parallelSum(int[] a, int parts) throws InterruptedException, ExecutionException {
        int n = a.length;
        parts = Math.max(1, Math.min(parts, n));            // no empty chunks
        ExecutorService pool = Executors.newFixedThreadPool(Math.min(parts, Runtime.getRuntime().availableProcessors()));
        try {
            List<Future<Long>> futures = new ArrayList<>();
            for (int i = 0; i < parts; i++) {
                final int from = (int) ((long) i * n / parts);
                final int to = (int) ((long) (i + 1) * n / parts);
                futures.add(pool.submit(() -> {
                    long s = 0;
                    for (int k = from; k < to; k++) s += a[k];
                    return s;                                // autoboxed to Long
                }));
            }
            long total = 0;
            for (Future<Long> f : futures) total += f.get(); // join
            return total;
        } finally {
            pool.shutdown();
        }
    }

    public static void main(String[] args) throws Exception {
        int[] a = new int[10];
        for (int i = 0; i < a.length; i++) a[i] = i + 1;
        System.out.println(parallelSum(a, 3));               // 55
    }
}`,
        dry: { head: ['chunk i', 'from = i*10/3', 'to = (i+1)*10/3', 'elements', 'future result'], rows: [['0', '0', '3', '1 2 3', '6'], ['1', '3', '6', '4 5 6', '15'], ['2', '6', '10', '7 8 9 10', '34'], ['join', '', '', '', H.c('g', '6 + 15 + 34 = 55')]] },
        complexity: `<p>Work O(N), wall time ≈ O(N / P + P) with P cores (P for task setup and joining). Extra space O(P) for futures. Speed-up is limited by memory bandwidth for such a simple loop, so expect 3-6×, not a perfect 8×.</p>`,
        followUps: ['Rewrite it with ForkJoinPool and RecursiveTask', 'Rewrite it with IntStream.parallel().asLongStream().sum() and discuss when that is the better choice', 'What changes if one chunk can throw an exception?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — ReentrantLock, Condition, ReadWriteLock, StampedLock
     ====================================================================== */
  function lockViz(input) {
    var ops = tokens(input, /[\s,]+/, 'Type operations like A.lock B.lock A.unlock B.tryLock');
    if (ops.length > 18) throw new Error('Use at most 18 operations');
    var owner = null, hold = 0, waitQ = [], frames = [], blocked = {}, fair = true;
    var code = 'lock.lock();          // wait in line if someone else owns it\ntry {\n    // critical section\n} finally {\n    lock.unlock();    // ALWAYS in finally\n}\nboolean ok = lock.tryLock(); // never waits';
    function fr(narr, line, cls, hlv) {
      frames.push({ narr: narr, parts: [
        { type: 'vars', label: 'ReentrantLock internals (AQS)', vals: { owner: owner || '—', holdCount: hold, state: hold, isLocked: hold > 0 }, hl: hlv || {} },
        { type: 'queue', label: 'Wait queue (parked threads, FIFO)', items: waitQ.slice(), frontLabel: 'next to get the lock', backLabel: 'last in' },
        codePart(code, line, cls)
      ] });
    }
    fr('A fresh <b>ReentrantLock</b>: nobody owns it, holdCount = 0, wait queue empty. (Internally this is AQS with an int <code>state</code> and a linked queue of waiting threads.)', null);
    ops.forEach(function (op) {
      var mm = /^([A-Za-z]\w{0,5})\.(lock|unlock|trylock)$/i.exec(op);
      if (!mm) throw new Error('Bad op "' + op + '" — use Thread.lock, Thread.unlock or Thread.tryLock (e.g. A.lock)');
      var t = mm[1], what = mm[2].toLowerCase();
      if (blocked[t]) { fr('<b>' + op + '</b>: thread ' + t + ' is <b>parked</b> waiting for the lock — a parked thread cannot run any code, so this step cannot happen yet.', null, 'bad', {}); return; }
      if (what === 'lock') {
        if (!owner) { owner = t; hold = 1; fr('<b>' + t + '.lock()</b>: lock is free → CAS state 0→1, owner = ' + t + '. Fast path, no queue involved.', 1, 'ok', { owner: 'ok', holdCount: 'ok' }); }
        else if (owner === t) { hold++; fr('<b>' + t + '.lock()</b> again: ' + t + ' already owns it → <b>re-entrant</b>, holdCount becomes ' + hold + '. A non-reentrant lock would deadlock with itself here! ' + t + ' must now unlock ' + hold + ' times.', 1, 'ok', { holdCount: 'cur' }); }
        else { waitQ.push(t); blocked[t] = true; fr('<b>' + t + '.lock()</b>: owned by ' + owner + ' → ' + t + ' joins the wait queue and is <b>parked</b> (LockSupport.park). It uses no CPU while waiting.', 1, 'cur', { owner: 'bad' }); }
      } else if (what === 'trylock') {
        if (!owner || owner === t) { owner = t; hold++; fr('<b>' + t + '.tryLock()</b>: available (or already ours) → returns <span class="c-g">true</span>, holdCount = ' + hold + '.', 7, 'ok', { owner: 'ok' }); }
        else fr('<b>' + t + '.tryLock()</b>: owned by ' + owner + ' → returns <span class="c-r">false</span> <b>immediately</b>. ' + t + ' is NOT queued and can do something else (retry later, back off, report busy). This is how tryLock breaks deadlocks.', 7, 'bad', { owner: 'bad' });
      } else {
        if (owner !== t) { fr('<b>' + t + '.unlock()</b>: but ' + t + ' does not own the lock (owner = ' + (owner || 'nobody') + ') → <span class="c-r">IllegalMonitorStateException</span>. Only the owner may unlock.', 5, 'bad', { owner: 'bad' }); return; }
        hold--;
        if (hold > 0) { fr('<b>' + t + '.unlock()</b>: holdCount ' + (hold + 1) + ' → ' + hold + '. Still owned by ' + t + ' (it locked more than once).', 5, 'cur', { holdCount: 'cur' }); return; }
        owner = null;
        if (waitQ.length) {
          var nx = waitQ.shift(); delete blocked[nx]; owner = nx; hold = 1;
          fr('<b>' + t + '.unlock()</b>: holdCount hits 0 → lock released and the head of the queue (<b>' + nx + '</b>) is <b>unparked</b> and acquires it. ' + (fair ? '(In non-fair mode a brand-new thread could "barge" in first — higher throughput, less fairness.)' : ''), 5, 'ok', { owner: 'ok' });
        } else fr('<b>' + t + '.unlock()</b>: holdCount 0 → lock is <b>free</b>. Nobody waiting.', 5, 'ok', { owner: 'ok' });
      }
    });
    fr('End. Final owner: ' + (owner || 'nobody') + ', holdCount ' + hold + ', waiting: [' + waitQ.join(', ') + ']. ' + (waitQ.length ? '<span class="c-r">Threads still parked — if the owner never unlocks (missing finally), they wait forever.</span>' : 'Everyone got through.'), null);
    return frames;
  }

  function rwViz(input) {
    var ops = tokens(input, /[\s,]+/, 'Type ops like R1+ R2+ W1+ R1- R2- W1-');
    if (ops.length > 18) throw new Error('Use at most 18 operations');
    var readers = [], writer = null, waitQ = [], frames = [];
    function fr(narr, hl) {
      frames.push({ narr: narr, parts: [
        { type: 'set', label: 'Readers holding the READ lock (shared)', items: readers.slice(), hl: hl || {} },
        { type: 'vars', label: 'WRITE lock (exclusive)', vals: { writer: writer || '—', readCount: readers.length }, hl: {} },
        { type: 'queue', label: 'Waiting (fair mode, FIFO)', items: waitQ.slice(), frontLabel: 'next', backLabel: 'last' }
      ] });
    }
    function canGrant(who) { return who.charAt(0) === 'R' ? !writer : (!writer && !readers.length); }
    function drain() {
      var moved = [];
      while (waitQ.length && canGrant(waitQ[0])) {
        var w = waitQ.shift(); moved.push(w);
        if (w.charAt(0) === 'R') readers.push(w); else writer = w;
        if (w.charAt(0) === 'W') break;
      }
      return moved;
    }
    fr('<b>ReentrantReadWriteLock</b>: many readers may hold the read lock <i>together</i>; a writer needs it <i>alone</i>. Ops: R1+ means reader R1 acquires, R1- releases. Names must start with R or W.');
    ops.forEach(function (op) {
      var mm = /^([RW]\w{0,3})([+-])$/i.exec(op);
      if (!mm) throw new Error('Bad op "' + op + '" — use names starting with R or W followed by + or -, e.g. R1+ W1-');
      var who = mm[1].toUpperCase(), plus = mm[2] === '+', h = {};
      if (plus) {
        if (waitQ.indexOf(who) >= 0 || readers.indexOf(who) >= 0 || writer === who) { fr(who + ' is already holding or waiting — skip.'); return; }
        if (canGrant(who) && !waitQ.length) {
          if (who.charAt(0) === 'R') readers.push(who); else writer = who;
          h[who] = 'ok';
          fr('<b>' + who + '+</b>: ' + (who.charAt(0) === 'R' ? 'no writer active → read lock granted. Readers do not block each other — that is the whole benefit.' : 'no readers, no writer → <b>exclusive</b> write lock granted.'), h);
        } else {
          waitQ.push(who);
          fr('<b>' + who + '+</b>: must wait (' + (writer ? 'writer ' + writer + ' is active' : waitQ.length > 1 ? 'others are queued ahead — fair mode stops readers from starving a waiting writer' : readers.length + ' reader(s) active') + ').');
        }
      } else {
        var i = readers.indexOf(who);
        if (i >= 0) readers.splice(i, 1); else if (writer === who) writer = null; else { fr('<b>' + who + '-</b>: not holding the lock → IllegalMonitorStateException.'); return; }
        var moved = drain();
        moved.forEach(function (x) { h[x] = 'ok'; });
        fr('<b>' + who + '-</b>: released. ' + (moved.length ? 'Woke up: <b>' + moved.join(', ') + '</b>.' : 'Nobody could be woken yet.'), h);
      }
    });
    fr('End. readers = [' + readers.join(', ') + '], writer = ' + (writer || 'none') + ', waiting = [' + waitQ.join(', ') + ']. Rule of thumb: worth it only when reads vastly outnumber writes and the read section is not tiny.');
    return frames;
  }

  topics.push({
    title: 'ReentrantLock, Condition, ReadWriteLock & StampedLock',
    analogy: `<p>A <b>ReentrantLock</b> is the key to a single <b>bathroom</b> in a café. Whoever holds the key is inside; others wait in a line. "Reentrant" means if you're already inside you can go through the inner door (call another locked method) without queuing for your own key. ${C('tryLock')} is peeking: "occupied? fine, I'll come back later" instead of standing in line forever. A <b>ReadWriteLock</b> is a <b>museum exhibit</b>: any number of visitors may look at the painting together (readers), but when the restorer comes to repaint it (writer), everyone must leave and nobody enters until he's done.</p>`,
    explain: `<p><b>Plain idea:</b> ${C('synchronized')} is a lock built into the language — simple, but you can't ask "is it free?", can't give up after a timeout, can't be interrupted while waiting, and you get only one wait-set. ${C('ReentrantLock')} is the same idea as a <b>library object</b> with all those extra buttons.</p>
<h4>The must-know pattern</h4>
${P(`
private final ReentrantLock lock = new ReentrantLock();

void update() {
    lock.lock();          // BEFORE try: if lock() itself fails we must not unlock
    try {
        // critical section
    } finally {
        lock.unlock();    // ALWAYS release, even on exception
    }
}`)}
<p>Forget the ${C('finally')} and one exception leaves the lock held forever — every other thread hangs. synchronized releases automatically; explicit locks don't.</p>
<h4>synchronized vs ReentrantLock</h4>
${H.table(['Feature', C('synchronized'), C('ReentrantLock')], [
  ['Re-entrant', 'yes', 'yes'],
  ['Auto release on exception', H.c('g', 'yes'), H.c('r', 'no — use finally')],
  ['Try without waiting', 'no', C('tryLock()')],
  ['Wait with timeout', 'no', C('tryLock(1, SECONDS)')],
  ['Interruptible wait', 'no', C('lockInterruptibly()')],
  ['Fairness option', 'no', C('new ReentrantLock(true)')],
  ['Multiple wait conditions', 'one (wait/notify)', 'many ' + C('newCondition()')],
  ['Lock spanning methods', 'no (block scoped)', 'yes (lock in one, unlock in another)'],
  ['Introspection', 'Thread.holdsLock', C('isLocked, getHoldCount, getQueueLength')]
])}
<p>Rule: use ${C('synchronized')} for simple cases (less code, can't forget to unlock, JVM-optimized; since Java 24 (JEP 491) it also works well with virtual threads — see topic 8). Reach for ReentrantLock when you need one of the extra features.</p>
<h4>Condition = a named waiting room</h4>
<p>${C('Condition c = lock.newCondition()')}; ${C('c.await()')} releases the lock and waits; ${C('c.signal()')} / ${C('signalAll()')} wakes waiters. A bounded buffer uses <b>two</b> conditions — ${C('notFull')} for producers, ${C('notEmpty')} for consumers — so a signal wakes only the right kind of thread. Always await in a <b>while loop</b> (spurious wakeups, and another thread may have grabbed the item first).</p>
<h4>ReadWriteLock</h4>
<p>${C('ReentrantReadWriteLock')} has a shared <b>read lock</b> and an exclusive <b>write lock</b>. Many threads can read at once; a writer waits for all readers to leave. You can <b>downgrade</b> (hold write → take read → release write) but you <b>cannot upgrade</b> read → write (two readers both trying to upgrade would deadlock, so the JDK just blocks forever).</p>
<h4>StampedLock (Java 8) — optimistic reads</h4>
<p>${C('long stamp = sl.tryOptimisticRead()')} takes <b>no lock at all</b>: read the fields, then ${C('sl.validate(stamp)')}. If no writer slipped in, you're done (super cheap); otherwise fall back to a real read lock. Not reentrant, no Conditions — an expert tool for very hot read paths.</p>`,
    clues: ['"try to acquire, give up if busy" / "avoid deadlock with timeouts" → tryLock(timeout)', '"thread must be cancellable while waiting for a lock" → lockInterruptibly', '"first come first served / no starvation" → fair ReentrantLock', '"producers wait when full, consumers wait when empty" → Lock + two Conditions', '"read-heavy cache, rare updates" → ReadWriteLock or StampedLock', '"lock in one method, release in another" → explicit Lock', '"why not just synchronized?" → list the extra capabilities'],
    code: [`
// A bounded buffer with ONE lock and TWO conditions (this is how ArrayBlockingQueue works).
class BoundedBuffer<T> {
    private final Object[] items;
    private int putIdx, takeIdx, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();   // producers wait here
    private final Condition notEmpty = lock.newCondition();  // consumers wait here

    BoundedBuffer(int capacity) { items = new Object[capacity]; }

    void put(T x) throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == items.length) notFull.await();   // while, not if!
            items[putIdx] = x;
            putIdx = (putIdx + 1) % items.length;
            count++;
            notEmpty.signal();                               // wake ONE consumer
        } finally {
            lock.unlock();
        }
    }

    @SuppressWarnings("unchecked")
    T take() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == 0) notEmpty.await();
            T x = (T) items[takeIdx];
            items[takeIdx] = null;                           // help GC
            takeIdx = (takeIdx + 1) % items.length;
            count--;
            notFull.signal();                                // wake ONE producer
            return x;
        } finally {
            lock.unlock();
        }
    }
}`, `
// Read-mostly cache with ReentrantReadWriteLock
class RwCache<K, V> {
    private final Map<K, V> map = new HashMap<>();
    private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
    private final Lock r = rw.readLock(), w = rw.writeLock();

    V get(K k) {
        r.lock();
        try { return map.get(k); } finally { r.unlock(); }     // many readers in parallel
    }

    void put(K k, V v) {
        w.lock();
        try { map.put(k, v); } finally { w.unlock(); }         // exclusive
    }
}`, `
// StampedLock optimistic read: no locking at all on the happy path
class Point {
    private double x, y;
    private final StampedLock sl = new StampedLock();

    void move(double dx, double dy) {
        long stamp = sl.writeLock();
        try { x += dx; y += dy; } finally { sl.unlockWrite(stamp); }
    }

    double distanceFromOrigin() {
        long stamp = sl.tryOptimisticRead();     // just reads a version number
        double cx = x, cy = y;                   // copy fields to locals
        if (!sl.validate(stamp)) {               // a writer slipped in? fall back
            stamp = sl.readLock();
            try { cx = x; cy = y; } finally { sl.unlockRead(stamp); }
        }
        return Math.sqrt(cx * cx + cy * cy);
    }
}`],
    codeTitle: ['Lock + two Conditions = bounded buffer', 'ReadWriteLock cache', 'StampedLock optimistic read'],
    viz: [{
      title: 'ReentrantLock: owner, hold count and the wait queue',
      input: 'A.lock B.lock A.lock C.tryLock A.unlock A.unlock B.unlock',
      inputLabel: 'Operations: Name.lock / Name.unlock / Name.tryLock',
      gen: lockViz
    }, {
      title: 'ReadWriteLock: shared readers, exclusive writer',
      input: 'R1+ R2+ W1+ R3+ R1- R2- W1- R3-',
      inputLabel: 'Ops: R1+ (reader acquires), W1- (writer releases)…',
      gen: rwViz
    }],
    examples: [
      { title: 'tryLock with timeout to avoid hanging', html: `<p>Instead of blocking forever, a request waits at most 50 ms for the lock and then returns "busy, try again" (HTTP 429/503). This turns a potential deadlock or pile-up into a visible, recoverable error.</p>`, code: `
ReentrantLock lock = new ReentrantLock();
if (lock.tryLock(50, TimeUnit.MILLISECONDS)) {
    try {
        System.out.println("got it, updating");
    } finally {
        lock.unlock();
    }
} else {
    System.out.println("busy - try again later");
}` },
      { title: 'Re-entrancy in action', html: `<p>${C('outer()')} locks then calls ${C('inner()')}, which locks the same lock again. Hold count goes 1 → 2 → 1 → 0. Without re-entrancy the thread would wait for itself forever.</p>`, code: `
class Reentry {
    private final ReentrantLock lock = new ReentrantLock();
    void outer() {
        lock.lock();
        try {
            inner();
        } finally {
            lock.unlock();
        }
    }
    void inner() {
        lock.lock();
        try {
            System.out.println("hold count = " + lock.getHoldCount()); // 2
        } finally {
            lock.unlock();
        }
    }
}` },
      { title: 'Fair vs non-fair numbers', html: `<p>Non-fair (default): when the lock is released, a thread that is <i>already running</i> may grab it before the parked head of the queue wakes up (waking a thread costs microseconds). Typical benchmarks show non-fair locks with several times more throughput under contention. Fair mode guarantees FIFO but every handoff pays a context switch. Use fair only when starvation is a real, observed problem.</p>`, code: `
ReentrantLock fast = new ReentrantLock();        // non-fair: barging allowed
ReentrantLock fair = new ReentrantLock(true);    // FIFO handoff
System.out.println(fast.isFair() + " " + fair.isFair()); // false true` },
      { title: 'Lock downgrading (write → read)', html: `<p>Update a value and keep reading it consistently: take the write lock, update, take the read lock <b>before</b> releasing the write lock, then release write. Other writers cannot sneak in between. The reverse (upgrade) blocks forever.</p>`, code: `
ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
int[] data = {0};
rw.writeLock().lock();
try {
    data[0] = 42;
    rw.readLock().lock();          // downgrade: allowed
} finally {
    rw.writeLock().unlock();       // still holding read
}
try {
    System.out.println("read " + data[0]);
} finally {
    rw.readLock().unlock();
}` }
    ],
    deepDive: `<p><b>AQS — the engine under almost everything.</b> ${C('AbstractQueuedSynchronizer')} holds one ${C('volatile int state')} and a CLH-style doubly-linked queue of waiting threads. Subclasses only define what "acquire" and "release" mean in terms of state: ReentrantLock uses state = hold count; Semaphore uses state = permits; CountDownLatch uses state = count; ReentrantReadWriteLock splits the int into <b>high 16 bits = read holds</b> and <b>low 16 bits = write holds</b> (so at most 65,535 of each). Acquire = try a CAS on state; if it fails, enqueue a node and ${C('LockSupport.park()')}; release = update state and unpark the successor.</p>
<p><b>Fairness detail:</b> the non-fair ${C('lock()')} first tries a CAS 0→1 without looking at the queue (barging). Fair mode calls ${C('hasQueuedPredecessors()')} first. Note ${C('tryLock()')} (no timeout) <b>always barges</b>, even on a fair lock; ${C('tryLock(0, SECONDS)')} respects fairness.</p>
<p><b>Memory semantics:</b> ${C('unlock()')} has the same effect as leaving a synchronized block (a volatile write of state), ${C('lock()')} the same as entering (a volatile read). So everything written before unlock is visible to the next thread that locks — the same happens-before guarantee as synchronized.</p>
<p><b>Performance reality:</b> since biased locking was removed (JDK 15-18) and with modern lightweight locking, uncontended synchronized and ReentrantLock cost about the same (tens of nanoseconds). Under contention both park threads. StampedLock optimistic reads can be dramatically faster for read-heavy small data because readers never write to shared memory (no cache-line ping-pong). ReadWriteLock often <b>loses</b> to a plain lock when the read section is tiny, because readers still CAS the shared state word. Measure with JMH before choosing.</p>
<p><b>Deadlock tools:</b> ${C('jstack')} / thread dumps show "Found one Java-level deadlock" for both monitors and ownable synchronizers (ReentrantLock), and ${C('ThreadMXBean.findDeadlockedThreads()')} lets you detect it programmatically.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools generate the lock/try/finally skeleton perfectly — the boilerplate is no longer the hard part. The hard part is <b>what</b> the lock protects (the invariant) and the <b>order</b> in which locks are taken. <b>Use AI as a partner:</b> ask it to "<i>draw the lock acquisition order graph for these classes and find a cycle</i>" or to write a jcstress/stress test that hammers your class from 8 threads. <b>Where AI goes wrong:</b> putting ${C('lock()')} inside the try (so a failed lock leads to an unlock of a lock you don't own), using ${C('if')} instead of ${C('while')} around ${C('await()')}, suggesting read→write lock upgrades (instant hang), or recommending fair locks "for safety" without mentioning the throughput cost. <b>What you must still own:</b> choosing the simplest primitive that works (often a ConcurrentHashMap or an immutable snapshot makes the lock unnecessary), and reading a thread dump to prove where threads are stuck.</p>`,
    problems: [{
      title: 'Deadlock-Free Bank Transfer',
      level: 'Medium', tags: ['ReentrantLock', 'tryLock', 'deadlock', 'lock ordering'], companies: ['JPMorgan', 'Goldman Sachs', 'Stripe', 'PayPal'],
      statement: `<p>Each ${C('Account')} has an id, a balance and its own ${C('ReentrantLock')}. Implement ${C('boolean transfer(Account from, Account to, long amount)')} that is thread-safe and can <b>never deadlock</b>, even when thread 1 transfers A→B while thread 2 transfers B→A. Return false on insufficient funds. Total money in the system must never change.</p>`,
      constraints: `Up to 10<sup>4</sup> accounts, many concurrent transfers, from ≠ to, amount &gt; 0.`,
      example: `<p>A = 100, B = 50. Thread 1: transfer(A, B, 30). Thread 2: transfer(B, A, 20) at the same moment. Final: ${H.c('g', 'A = 90, B = 60')} (total still 150), no hang.</p>`,
      brute: { why: `<p>Locking ${C('from')} then ${C('to')} looks right, but T1 holds A and waits for B while T2 holds B and waits for A → <b>circular wait = deadlock</b>. Using one global lock avoids deadlock but serialises every transfer in the bank (zero parallelism).</p>`, code: `
class NaiveBank {
    static class Account { final int id; long balance; final ReentrantLock lock = new ReentrantLock(); Account(int id, long b) { this.id = id; balance = b; } }

    static boolean transfer(Account from, Account to, long amount) {
        from.lock.lock();                 // T1 holds A ...
        try {
            to.lock.lock();               // ... waits for B, while T2 holds B and waits for A: DEADLOCK
            try {
                if (from.balance < amount) return false;
                from.balance -= amount;
                to.balance += amount;
                return true;
            } finally { to.lock.unlock(); }
        } finally { from.lock.unlock(); }
    }
}` },
      mcq: { q: 'Which of the four Coffman deadlock conditions does "always lock the smaller id first" break?', options: ['Mutual exclusion', 'Hold and wait', 'No preemption', 'Circular wait'], answer: 3, explain: 'With a global order, no thread can hold a higher lock while waiting for a lower one, so a cycle in the wait-for graph is impossible.' },
      hints: [`<p>Hint 1: deadlock needs a <b>cycle</b>. If every thread locks accounts in the <b>same global order</b>, a cycle cannot form.</p>`, `<p>Hint 2: order by a unique, immutable key: the account id. Lock ${C('min(id)')} first, then ${C('max(id)')}. (If ids could tie, use a tie-breaker lock.)</p>`, `<p>Hint 3: alternative: ${C('tryLock')} both with a timeout, and if the second fails, release the first, sleep a <b>random</b> back-off and retry (random to avoid livelock). Always unlock in finally, in reverse order.</p>`],
      tests: { sig: 'long[] string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(long[] init, String[] ops) throws Exception {
    SafeBank.Account[] acc = new SafeBank.Account[init.length];
    for (int i = 0; i < init.length; i++) acc[i] = new SafeBank.Account(i + 1, init[i]);
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "t": out.add(String.valueOf(SafeBank.transfer(acc[Integer.parseInt(p[1])], acc[Integer.parseInt(p[2])], Long.parseLong(p[3])))); break;
        case "bal": out.add(String.valueOf(acc[Integer.parseInt(p[1])].balance)); break;
        case "total": { long s = 0; for (SafeBank.Account a : acc) s += a.balance; out.add(String.valueOf(s)); break; }
        case "pair": {
          long x = Long.parseLong(p[1]), y = Long.parseLong(p[2]);
          Thread t1 = new Thread(() -> SafeBank.transfer(acc[0], acc[1], x)), t2 = new Thread(() -> SafeBank.transfer(acc[1], acc[0], y));
          t1.start(); t2.start(); t1.join(); t2.join();
          break;
        }
        case "par": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]);
          Thread[] ts = new Thread[T];
          for (int i = 0; i < T; i++) {
            final boolean fwd = i % 2 == 0;
            ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) { if (fwd) SafeBank.transfer(acc[0], acc[1], 1); else SafeBank.transfer(acc[1], acc[0], 1); } });
            ts[i].start();
          }
          for (Thread t : ts) t.join();
          break;
        }
        case "mix": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]), K = acc.length;
          Thread[] ts = new Thread[T];
          for (int t = 0; t < T; t++) {
            final int id = t;
            ts[t] = new Thread(() -> { for (int i = 0; i < N; i++) { int a = (i + id) % K, b = (i * 7 + id + 1) % K; if (a != b) SafeBank.transfer(acc[a], acc[b], 1); } });
            ts[t].start();
          }
          for (Thread t : ts) t.join();
          break;
        }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[[100, 50], ['pair:30:20', 'bal:0', 'bal:1', 'total']], ['90', '60', '150']],
          [[[100, 50], ['t:0:1:30', 'bal:0', 'bal:1', 't:0:1:71', 't:1:0:80', 'bal:0', 'bal:1']], ['true', '70', '80', 'false', 'true', '150', '0']],
          [[[10, 0], ['t:0:1:10', 'bal:0', 'bal:1', 't:0:1:1']], ['true', '0', '10', 'false']],
          [[[1000000000, 1000000000], ['par:2:10000', 'bal:0', 'bal:1']], ['1000000000', '1000000000']],
          [[[5, 5], ['par:8:50000', 'total']], ['10']],
          [[{ $rep: 1000, n: 100 }, ['mix:64:20000', 'total']], ['100000']],
          [[[0, 0], ['t:0:1:1', 'total']], ['false', '0']],
          [[[3], ['total']], ['3']]
        ] },
      solution: {
        approach: `<p><b>Lock ordering:</b> pick the account with the smaller id as ${C('first')}, lock it, then lock the other. Both T1 (A→B) and T2 (B→A) try to lock A first, so one simply waits for the other — no cycle. The balance check and both updates happen while holding both locks, so the total is invariant.</p>`,
        code: `
public class SafeBank {
    static final class Account {
        final int id;
        long balance;
        final ReentrantLock lock = new ReentrantLock();
        Account(int id, long balance) { this.id = id; this.balance = balance; }
    }

    static boolean transfer(Account from, Account to, long amount) {
        Account first = from.id < to.id ? from : to;     // global order by id
        Account second = first == from ? to : from;
        first.lock.lock();
        try {
            second.lock.lock();
            try {
                if (from.balance < amount) return false;
                from.balance -= amount;
                to.balance += amount;
                return true;
            } finally {
                second.lock.unlock();
            }
        } finally {
            first.lock.unlock();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        Account a = new Account(1, 100), b = new Account(2, 50);
        Thread t1 = new Thread(() -> { for (int i = 0; i < 1000; i++) transfer(a, b, 1); });
        Thread t2 = new Thread(() -> { for (int i = 0; i < 1000; i++) transfer(b, a, 1); });
        t1.start(); t2.start();
        t1.join(); t2.join();
        System.out.println("total = " + (a.balance + b.balance)); // always 150
    }
}`,
        alt: [{ lang: 'java', title: 'tryLock + random back-off variant', code: `
static boolean transferTry(SafeBank.Account from, SafeBank.Account to, long amount) throws InterruptedException {
    while (true) {
        if (from.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
            try {
                if (to.lock.tryLock(10, TimeUnit.MILLISECONDS)) {
                    try {
                        if (from.balance < amount) return false;
                        from.balance -= amount;
                        to.balance += amount;
                        return true;
                    } finally { to.lock.unlock(); }
                }
            } finally { from.lock.unlock(); }
        }
        Thread.sleep(ThreadLocalRandom.current().nextInt(1, 5)); // random back-off avoids livelock
    }
}

static final class SafeBank { static final class Account { final int id; long balance; final ReentrantLock lock = new ReentrantLock(); Account(int i, long b) { id = i; balance = b; } } }` }],
        dry: { head: ['time', 'T1: transfer(A→B)', 'T2: transfer(B→A)', 'A lock', 'B lock'], rows: [['1', 'first = A (id 1) → lock A ✔', 'first = A (id 1) → lock A … waits', 'T1', '—'], ['2', 'lock B ✔, A=70, B=80', 'parked on A', 'T1', 'T1'], ['3', 'unlock B, unlock A', 'wakes, gets A', 'T2', '—'], ['4', 'done', 'lock B ✔, B=60, A=90', 'T2', 'T2'], ['5', '', 'unlock both → total 150 ✔', '—', '—']] },
        complexity: `<p>O(1) per transfer plus lock wait time. Transfers between disjoint pairs run fully in parallel (unlike a global lock). The tryLock variant can retry, so worst-case latency is unbounded but deadlock-free; random back-off keeps livelock improbable.</p>`,
        followUps: ['How would you handle transfer(A, A, x)?', 'What if ids are not unique (use System.identityHashCode + tie lock)?', 'How do databases solve the same problem (lock ordering, deadlock detection + abort)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Semaphore, CountDownLatch, CyclicBarrier (+ Phaser)
     ====================================================================== */
  function latchViz(input) {
    var names = tokens(input, /[\s,]+/, 'Type worker names in the order they finish, e.g. DB Cache Kafka');
    if (names.length > 6) throw new Error('Use at most 6 workers');
    var count = names.length, done = [], frames = [];
    function g(hl, ehl) {
      var nodes = [{ id: 'L', label: 'CountDownLatch(' + names.length + ') count=' + count, x: 55, y: 30, shape: 'box', w: 26 }, { id: 'M', label: 'main: ' + (count ? 'await() … parked' : 'RUNNING'), x: 90, y: 30, shape: 'box', w: 18 }];
      var edges = [['L', 'M']];
      names.forEach(function (n, i) {
        nodes.push({ id: 'W' + i, label: n + (done.indexOf(n) >= 0 ? ' ✔' : ' …'), x: 12, y: 6 + i * (48 / Math.max(1, names.length - 1)), shape: 'box', w: 16 });
        edges.push(['W' + i, 'L', done.indexOf(n) >= 0 ? 'countDown' : '']);
      });
      return { type: 'graph', label: 'Workers → latch → waiting main thread', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} };
    }
    function fr(narr, hl, ehl, bhl) {
      var bars = names.map(function (n) { return done.indexOf(n) >= 0 ? 0 : 1; });
      frames.push({ narr: narr, parts: [g(hl, ehl), { type: 'vars', label: 'Latch', vals: { count: count, 'main state': count ? 'WAITING' : 'RUNNABLE', finished: done.join(', ') || '—' }, hl: bhl || {} }, { type: 'bars', label: 'still to finish (1 = pending)', values: bars, idxLabels: names.slice() }] });
    }
    fr('Main creates <code>new CountDownLatch(' + names.length + ')</code> — one count per service it must wait for — and starts ' + names.length + ' worker threads.', {}, {});
    fr('Main calls <b>latch.await()</b>. count = ' + count + ' &gt; 0, so main is <b>parked</b>. It will wake up only when the count reaches zero.', one('M', 'cur'), {});
    names.forEach(function (n, i) {
      done.push(n); count--;
      var h = one('W' + i, 'ok'); h.L = count ? 'cur' : 'ok';
      fr('<b>' + n + '</b> finishes and calls <b>countDown()</b>: count ' + (count + 1) + ' → <b>' + count + '</b>. ' + (count ? 'Not zero yet, main keeps sleeping. ' + n + ' does NOT wait — countDown never blocks.' : '<span class="c-g">Zero!</span> All threads blocked in await() are released at once.'), h, one('W' + i + '-L', 'ok'), { count: count ? 'cur' : 'ok' });
    });
    fr('Main is running again: "all ' + names.length + ' services are up, start serving traffic". Order of finishing did not matter.', one('M', 'ok'), one('L-M', 'ok'));
    fr('A latch is <b>one-shot</b>: further countDown() calls do nothing (count stays 0) and every later await() returns immediately. Need to repeat per round? Use <b>CyclicBarrier</b> (resets itself) or <b>Phaser</b>.', one('L', 'done'), {});
    return frames;
  }

  function semViz(input) {
    var parts = String(input).split('|');
    if (parts.length < 2) throw new Error('Format: permits | ops, e.g. 2 | A+ B+ C+ A- C- B-');
    var permits = parseInt(parts[0], 10);
    if (!(permits >= 1 && permits <= 5)) throw new Error('permits must be 1..5');
    var ops = tokens(parts[1], /[\s,]+/, 'Add ops like A+ B+ A-');
    if (ops.length > 18) throw new Error('At most 18 ops');
    var avail = permits, holders = [], waitQ = [], frames = [];
    function fr(narr, hl, vhl) {
      var slots = [];
      for (var i = 0; i < Math.max(permits, holders.length); i++) slots.push(holders[i] || "free");
      var shl = {};
      holders.forEach(function (h, i) { if (hl && hl[h]) shl[i] = hl[h]; });
      frames.push({ narr: narr, parts: [
        { type: 'array', label: 'Permits (think: parking spots)', values: slots, hl: shl },
        { type: 'vars', label: 'Semaphore', vals: { availablePermits: avail, holders: holders.length, waiting: waitQ.length }, hl: vhl || {} },
        { type: 'queue', label: 'Threads blocked in acquire()', items: waitQ.slice(), frontLabel: 'next', backLabel: 'last' }
      ] });
    }
    fr('<code>new Semaphore(' + permits + ')</code>: ' + permits + ' permits. At most ' + permits + ' threads may be inside the guarded section at the same time. Ops: A+ = A.acquire(), A- = A.release().');
    ops.forEach(function (op) {
      var mm = /^(\w{1,6})([+-])$/.exec(op);
      if (!mm) throw new Error('Bad op "' + op + '" — use Name+ or Name-');
      var t = mm[1];
      if (mm[2] === '+') {
        if (waitQ.indexOf(t) >= 0) { fr(t + ' is blocked in acquire() already — it cannot run another step.'); return; }
        if (avail > 0) { avail--; holders.push(t); fr('<b>' + t + '.acquire()</b>: a permit is free → take it. available ' + (avail + 1) + ' → ' + avail + '.', one(t, 'ok'), { availablePermits: 'cur' }); }
        else { waitQ.push(t); fr('<b>' + t + '.acquire()</b>: 0 permits left → ' + t + ' <b>blocks</b> until someone releases. (tryAcquire() would return false instead.)', {}, { availablePermits: 'bad' }); }
      } else {
        var i = holders.indexOf(t);
        if (i < 0) {
          avail++;
          fr('<b>' + t + '.release()</b> without holding a permit! Semaphores do <b>not</b> track owners, so this silently <span class="c-r">creates an extra permit</span> (now ' + avail + '). A classic bug — always release in finally, exactly once.', {}, { availablePermits: 'bad' });
        } else {
          holders.splice(i, 1); avail++;
          if (waitQ.length) {
            var nx = waitQ.shift(); holders.push(nx); avail--;
            fr('<b>' + t + '.release()</b>: permit returned and immediately handed to the first waiter <b>' + nx + '</b>, who wakes up.', one(nx, 'ok'), { availablePermits: 'ok' });
          } else fr('<b>' + t + '.release()</b>: permit returned. available = ' + avail + '.', {}, { availablePermits: 'ok' });
        }
      }
    });
    fr('End: available = ' + avail + ' of ' + permits + ', holders [' + holders.join(', ') + '], waiting [' + waitQ.join(', ') + '].');
    return frames;
  }

  topics.push({
    title: 'Synchronizers: Semaphore, CountDownLatch, CyclicBarrier & Phaser',
    analogy: `<p><b>Semaphore</b> = a <b>parking lot with 3 spots</b> and a counter at the gate: cars enter while spots are free, the 4th car waits until someone leaves. <b>CountDownLatch</b> = a <b>rocket launch checklist</b>: "fuel ✔, weather ✔, crew ✔" — when the last item is ticked the rocket launches, and the checklist is never reused. <b>CyclicBarrier</b> = friends meeting for a <b>group hike</b>: at each checkpoint everyone waits until the whole group arrives, then they all continue together — and the same rule applies at the next checkpoint.</p>`,
    explain: `<p><b>Plain idea:</b> these classes coordinate <i>when</i> threads may proceed. They all use a counter plus a waiting line (AQS for Semaphore and CountDownLatch; a lock + condition for CyclicBarrier).</p>
${H.table(['Tool', 'Counter means', 'Who waits?', 'Reusable?', 'Typical use'], [
  [C('Semaphore(n)'), 'permits left', 'threads calling acquire() when 0', H.c('g', 'yes'), 'limit concurrency: max 10 DB calls, rate limiting'],
  [C('CountDownLatch(n)'), 'events still to happen', 'threads calling await()', H.c('r', 'no (one-shot)'), 'wait for N services to start / N tasks to finish; start gate'],
  [C('CyclicBarrier(n, action)'), 'parties not yet arrived', 'the arriving parties themselves', H.c('g', 'yes (auto reset)'), 'iterative parallel algorithms, simulations by rounds'],
  [C('Phaser'), 'registered parties per phase', 'arriving parties (or not: arrive vs arriveAndAwaitAdvance)', H.c('g', 'yes, dynamic parties'), 'multi-phase work where parties join/leave'],
  [C('Exchanger<V>'), 'pairs', 'two threads swapping objects', 'yes', 'double buffering (fill one buffer, drain the other)']
])}
<h4>Semaphore</h4>
${P(`
Semaphore dbSlots = new Semaphore(10);   // at most 10 concurrent DB calls
dbSlots.acquire();                        // take a permit (blocks if none)
try {
    callDatabase();
} finally {
    dbSlots.release();                    // give it back - in finally!
}`)}
<p>Key facts: no ownership (any thread can release, even one that never acquired → permit leak or permit creation); ${C('acquire(k)')} takes several permits; ${C('tryAcquire(timeout)')} avoids waiting forever; ${C('new Semaphore(1)')} is a mutex that is <b>not</b> reentrant; fairness option like ReentrantLock.</p>
<h4>CountDownLatch</h4>
<p>${C('countDown()')} decrements and <b>never blocks</b>; ${C('await()')} blocks until the count is 0 (or ${C('await(timeout)')} returns false). Two classic patterns: <b>"wait for N workers to finish"</b> (latch(N), each worker counts down in finally) and <b>"start gate"</b> (latch(1): all workers await, main counts down once → everybody starts at the same instant, great for load tests).</p>
<h4>CyclicBarrier</h4>
<p>${C('barrier.await()')} blocks until <b>n parties</b> have called it; then an optional <b>barrier action</b> runs (on the last arriving thread) and all are released; the barrier resets for the next round. If one party is interrupted or times out, the barrier is <b>broken</b> and all others get ${C('BrokenBarrierException')} — nobody waits forever for a dead friend.</p>
<h4>Latch vs barrier — the interview one-liner</h4>
<p>A <b>latch</b> waits for <b>events</b> (the counting threads move on); a <b>barrier</b> waits for <b>threads</b> (the arriving threads themselves wait for each other) and can be reused.</p>`,
    clues: ['"at most N at the same time" / "limit concurrent connections" → Semaphore', '"wait until all N services have started" → CountDownLatch(N)', '"start all threads at exactly the same moment" → CountDownLatch(1) start gate', '"threads work in rounds / phases and sync after each" → CyclicBarrier', '"number of participants changes over time" → Phaser', '"two threads swap buffers" → Exchanger', '"print in order: first, second, third" → semaphores or latches as signals'],
    code: [`
public class LatchAndBarrier {
    public static void main(String[] args) throws Exception {
        // 1) CountDownLatch: main waits for 3 services
        CountDownLatch ready = new CountDownLatch(3);
        for (String svc : List.of("db", "cache", "kafka")) {
            new Thread(() -> {
                try {
                    System.out.println(svc + " started");
                } finally {
                    ready.countDown();             // in finally: a crash still counts down
                }
            }).start();
        }
        if (ready.await(5, TimeUnit.SECONDS)) System.out.println("all services up");
        else System.out.println("startup timed out");

        // 2) CyclicBarrier: 3 workers, 2 rounds, barrier action prints a summary each round
        CyclicBarrier barrier = new CyclicBarrier(3, () -> System.out.println("--- round complete ---"));
        List<Thread> ts = new ArrayList<>();
        for (int w = 1; w <= 3; w++) {
            final int id = w;
            Thread t = new Thread(() -> {
                try {
                    for (int round = 1; round <= 2; round++) {
                        System.out.println("worker " + id + " finished round " + round);
                        barrier.await(2, TimeUnit.SECONDS);   // wait for the other two
                    }
                } catch (InterruptedException | BrokenBarrierException | TimeoutException e) {
                    System.out.println("barrier broken: " + e);
                }
            });
            ts.add(t);
            t.start();
        }
        for (Thread t : ts) t.join();
    }
}`, `
// Semaphore as a bulkhead around a slow dependency
class InventoryClient {
    private final Semaphore slots = new Semaphore(5, true);   // max 5 in-flight calls, fair

    String stock(String sku) throws InterruptedException {
        if (!slots.tryAcquire(100, TimeUnit.MILLISECONDS)) {
            return "UNKNOWN (busy)";                         // fail fast instead of piling up
        }
        try {
            Thread.sleep(20);                                // the remote call
            return sku + ": 42 in stock";
        } finally {
            slots.release();
        }
    }
}`],
    codeTitle: ['CountDownLatch + CyclicBarrier', 'Semaphore bulkhead with tryAcquire timeout'],
    viz: [{
      title: 'CountDownLatch counting down to zero',
      input: 'DB Cache Kafka',
      inputLabel: 'Worker names in the order they finish (max 6)',
      gen: latchViz
    }, {
      title: 'Semaphore permits as parking spots',
      input: '2 | A+ B+ C+ D+ A- B- C- D-',
      inputLabel: 'permits | ops (A+ = acquire, A- = release)',
      gen: semViz
    }],
    examples: [
      { title: 'Start gate for a fair load test', html: `<p>Ten threads are created at different times. Each calls ${C('startGate.await()')}. Main calls ${C('startGate.countDown()')} once → all ten are released together, so the load test measures real contention, not thread start-up order. A second latch(10) ("finish line") lets main measure total time.</p>`, code: `
CountDownLatch startGate = new CountDownLatch(1);
CountDownLatch finishLine = new CountDownLatch(10);
for (int i = 0; i < 10; i++) {
    new Thread(() -> {
        try {
            startGate.await();
            Math.sqrt(12345.0);            // the work under test
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            finishLine.countDown();
        }
    }).start();
}
long t0 = System.nanoTime();
startGate.countDown();                     // GO!
finishLine.await();
System.out.println("took " + (System.nanoTime() - t0) / 1_000 + " us");` },
      { title: 'Print in order with semaphores (LeetCode 1114)', html: `<p>Three threads call ${C('first()')}, ${C('second()')}, ${C('third()')} in random order; output must be "firstsecondthird". Two semaphores with 0 permits act as signals: second waits on s2, which first releases; third waits on s3, which second releases.</p>`, code: `
class Foo {
    private final Semaphore s2 = new Semaphore(0), s3 = new Semaphore(0);
    void first(Runnable p) { p.run(); s2.release(); }
    void second(Runnable p) throws InterruptedException { s2.acquire(); p.run(); s3.release(); }
    void third(Runnable p) throws InterruptedException { s3.acquire(); p.run(); }
}` },
      { title: 'Phaser with parties that come and go', html: `<p>A Phaser is a reusable barrier where parties can ${C('register()')} and ${C('arriveAndDeregister()')} dynamically. Here 3 workers do 2 phases; ${C('getPhase()')} goes 0 → 1 → 2. ${C('onAdvance')} can be overridden to stop after a number of phases.</p>`, code: `
Phaser phaser = new Phaser(1);                 // main registers itself
for (int i = 0; i < 3; i++) {
    phaser.register();
    final int id = i;
    new Thread(() -> {
        for (int p = 0; p < 2; p++) {
            System.out.println("worker " + id + " phase " + phaser.getPhase());
            phaser.arriveAndAwaitAdvance();
        }
        phaser.arriveAndDeregister();
    }).start();
}
for (int p = 0; p < 2; p++) phaser.arriveAndAwaitAdvance();  // main follows along
phaser.arriveAndDeregister();
System.out.println("done, terminated = " + phaser.isTerminated());` },
      { title: 'Broken barrier', html: `<p>Party 3 is interrupted while waiting. CyclicBarrier marks itself <b>broken</b>: parties 1 and 2 immediately get ${C('BrokenBarrierException')} instead of waiting forever, and ${C('barrier.isBroken()')} is true until ${C('reset()')}. With CountDownLatch you get no such signal — waiters just keep waiting (so always use timed ${C('await')} in production).</p>` }
    ],
    deepDive: `<p><b>Implementation:</b> Semaphore and CountDownLatch are thin AQS subclasses using <b>shared</b> mode (many threads can be released by one event, propagating wake-ups down the queue). CountDownLatch's ${C('tryAcquireShared')} succeeds only when state == 0; ${C('countDown')} is a CAS loop on state that signals when it hits 0. CyclicBarrier is built from a ReentrantLock and a Condition plus a ${C('Generation')} object: each round creates a new Generation; breaking sets ${C('generation.broken = true')} and ${C('signalAll()')}. Phaser is a lock-free design with a 64-bit state (phase, parties, unarrived) and supports <b>tiering</b> (a tree of phasers) to reduce contention with thousands of parties.</p>
<p><b>Memory effects:</b> actions before ${C('countDown()')} happen-before actions after a successful ${C('await()')} return; actions before ${C('release()')} happen-before a successful ${C('acquire()')}; actions before ${C('barrier.await()')} happen-before the barrier action, which happens-before returns from await in other threads. So data written by workers is safely visible to the main thread after the latch opens — no volatile needed.</p>
<p><b>Production traps:</b> (1) countDown not in finally → an exception means the latch never reaches zero and main hangs. (2) Semaphore permits leaking on early returns, or being released twice and silently growing. (3) Latch sized wrong (e.g. N workers but some skip countDown). (4) CyclicBarrier party count larger than the pool size → deadlock, because the parties waiting at the barrier occupy all pool threads and the missing party never gets scheduled. (5) Semaphores limit concurrency inside <b>one JVM</b> only — for a cluster-wide limit you need Redis/token-bucket or a rate-limiting gateway.</p>
<p><b>Rate limiting vs concurrency limiting:</b> a Semaphore limits <i>how many at once</i>; it does not limit <i>how many per second</i>. A 10-permit semaphore around a 10 ms call allows ~1,000 calls/s. For "100 requests per second" use a token bucket (see practice) or Guava/Resilience4j RateLimiter.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will instantly produce LeetCode-style "print in order" or "FizzBuzz multithreaded" answers with semaphores — the pattern is memorised everywhere. Interviewers therefore shift to <b>why</b> questions: "what happens if a worker throws before countDown?", "why does your barrier deadlock on a 4-thread pool?". <b>Use AI as a partner:</b> ask it to enumerate failure modes of your synchronizer usage, or to rewrite a latch-based fan-out with structured concurrency or CompletableFuture.allOf and compare. <b>Where AI goes wrong:</b> uses ${C('Semaphore')} for per-second rate limits, forgets timeouts on ${C('await()')}, puts ${C('countDown()')} outside finally, or claims Semaphore tracks which thread holds a permit. <b>What you must still own:</b> choosing between "wait for events" (latch) and "wait for each other" (barrier), sizing pools so barrier parties can all run, and deciding whether a limit belongs in-process or in shared infrastructure.</p>`,
    problems: [{
      title: 'Race Harness: Start Together, Measure Until All Finish',
      level: 'Easy', tags: ['CountDownLatch', 'testing', 'coordination'], companies: ['Microsoft', 'Atlassian', 'Adobe'],
      statement: `<p>Write ${C('long runRace(int n, Runnable work)')} that starts ${C('n')} threads, makes them all begin ${C('work')} at the <b>same moment</b>, waits for <b>all</b> of them to finish, and returns the elapsed time in milliseconds (from the start signal to the last finisher). If a worker throws, the harness must still finish (no hang).</p>`,
      constraints: `1 ≤ n ≤ 1000. work may throw RuntimeException.`,
      example: `<p>n = 3, work = sleep 50 ms. Threads are created one after another (taking a few ms each), but they all wait at the gate. Main opens the gate → all 3 sleep in parallel → elapsed ≈ ${H.c('g', '50 ms')}, not 150.</p>`,
      brute: { why: `<p>Start threads in a loop and ${C('join()')} each. Problem 1: thread #1 starts working while thread #50 is still being created, so they don't really compete — the measurement is skewed. Problem 2: ${C('Thread.sleep')}-based "wait a bit for everyone" guesses are flaky.</p>`, code: `
static long naiveRace(int n, Runnable work) throws InterruptedException {
    long t0 = System.currentTimeMillis();
    List<Thread> ts = new ArrayList<>();
    for (int i = 0; i < n; i++) { Thread t = new Thread(work); ts.add(t); t.start(); } // staggered start
    for (Thread t : ts) t.join();
    return System.currentTimeMillis() - t0;
}` },
      mcq: { q: 'Which latch counts do you need for "start together" and "wait for all n"?', options: ['latch(n) and latch(1)', 'latch(1) for start, latch(n) for finish', 'one latch(n + 1)', 'CyclicBarrier only'], answer: 1, explain: 'Start gate: one event (main says GO) → count 1, n waiters. Finish line: n events (each worker done) → count n, one waiter (main).' },
      hints: [`<p>Hint 1: two different questions — "has GO been said?" (1 event) and "has everyone finished?" (n events). That's two latches.</p>`, `<p>Hint 2: workers: ${C('start.await()')} then ${C('work.run()')}; main: record time, ${C('start.countDown()')}, ${C('done.await()')}, record time.</p>`, `<p>Hint 3: put ${C('done.countDown()')} in a <b>finally</b> so a throwing worker still counts. Restore the interrupt flag if ${C('await')} is interrupted.</p>`],
      tests: { sig: 'string int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int n) throws Exception {
    AtomicInteger runs = new AtomicInteger();
    long ms;
    switch (kind) {
      case "count": ms = RaceHarness.runRace(n, runs::incrementAndGet); return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      case "gate": {
        CyclicBarrier together = new CyclicBarrier(n);
        ms = RaceHarness.runRace(n, () -> { try { together.await(); runs.incrementAndGet(); } catch (Exception e) { throw new RuntimeException(e); } });
        return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      }
      case "throw":
        ms = RaceHarness.runRace(n, () -> { int k = runs.incrementAndGet(); if (k % 2 == 1) throw new IllegalStateException("boom " + k); });
        return new String[]{ String.valueOf(runs.get()), "returned" };
      default:
        ms = RaceHarness.runRace(n, () -> { try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        return new String[]{ String.valueOf(ms >= 49), "returned" };
    }
  }
}` }, cases: [
          [['count', 1], ['1', 'true']],
          [['count', 3], ['3', 'true']],
          [['count', 1000], ['1000', 'true']],
          [['gate', 64], ['64', 'true']],
          [['gate', 1], ['1', 'true']],
          [['throw', 10], ['10', 'returned']],
          [['throw', 1], ['1', 'returned']],
          [['throw', 1000], ['1000', 'returned']],
          [['sleep', 3], ['true', 'returned']]
        ] },
      tests: { sig: 'string int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int n) throws Exception {
    AtomicInteger runs = new AtomicInteger();
    long ms;
    switch (kind) {
      case "count": ms = RaceHarness.runRace(n, runs::incrementAndGet); return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      case "gate": {
        CyclicBarrier together = new CyclicBarrier(n);
        ms = RaceHarness.runRace(n, () -> { try { together.await(); runs.incrementAndGet(); } catch (Exception e) { throw new RuntimeException(e); } });
        return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      }
      case "throw":
        ms = RaceHarness.runRace(n, () -> { int k = runs.incrementAndGet(); if (k % 2 == 1) throw new IllegalStateException("boom " + k); });
        return new String[]{ String.valueOf(runs.get()), "returned" };
      default:
        ms = RaceHarness.runRace(n, () -> { try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        return new String[]{ String.valueOf(ms >= 49), "returned" };
    }
  }
}` }, cases: [
          [['count', 1], ['1', 'true']],
          [['count', 3], ['3', 'true']],
          [['count', 1000], ['1000', 'true']],
          [['gate', 64], ['64', 'true']],
          [['gate', 1], ['1', 'true']],
          [['throw', 10], ['10', 'returned']],
          [['throw', 1], ['1', 'returned']],
          [['throw', 1000], ['1000', 'returned']],
          [['sleep', 3], ['true', 'returned']]
        ] },
      tests: { sig: 'string int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int n) throws Exception {
    AtomicInteger runs = new AtomicInteger();
    long ms;
    switch (kind) {
      case "count": ms = RaceHarness.runRace(n, runs::incrementAndGet); return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      case "gate": {
        CyclicBarrier together = new CyclicBarrier(n);
        ms = RaceHarness.runRace(n, () -> { try { together.await(); runs.incrementAndGet(); } catch (Exception e) { throw new RuntimeException(e); } });
        return new String[]{ String.valueOf(runs.get()), String.valueOf(ms >= 0) };
      }
      case "throw":
        ms = RaceHarness.runRace(n, () -> { int k = runs.incrementAndGet(); if (k % 2 == 1) throw new IllegalStateException("boom " + k); });
        return new String[]{ String.valueOf(runs.get()), "returned" };
      default:
        ms = RaceHarness.runRace(n, () -> { try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        return new String[]{ String.valueOf(ms >= 49), "returned" };
    }
  }
}` }, cases: [
          [['count', 1], ['1', 'true']],
          [['count', 3], ['3', 'true']],
          [['count', 1000], ['1000', 'true']],
          [['gate', 64], ['64', 'true']],
          [['gate', 1], ['1', 'true']],
          [['throw', 10], ['10', 'returned']],
          [['throw', 1], ['1', 'returned']],
          [['throw', 1000], ['1000', 'returned']],
          [['sleep', 3], ['true', 'returned']]
        ] },
      solution: {
        approach: `<p>Start gate latch(1) + finish line latch(n). Creating threads is outside the timed window because every worker parks on the gate. The finally block guarantees the finish latch reaches zero even on failures.</p>`,
        code: `
public class RaceHarness {
    static long runRace(int n, Runnable work) throws InterruptedException {
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(n);
        for (int i = 0; i < n; i++) {
            new Thread(() -> {
                try {
                    start.await();                 // everyone parks here
                    work.run();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (RuntimeException e) {
                    System.out.println("worker failed: " + e.getMessage());
                } finally {
                    done.countDown();              // ALWAYS count down
                }
            }).start();
        }
        long t0 = System.nanoTime();
        start.countDown();                         // GO
        done.await();                              // wait for the last one
        return (System.nanoTime() - t0) / 1_000_000;
    }

    public static void main(String[] args) throws InterruptedException {
        long ms = runRace(3, () -> {
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        System.out.println("elapsed ~" + ms + " ms");   // about 50
    }
}`,
        dry: { head: ['step', 'start.count', 'done.count', 'what happens'], rows: [['create T1..T3', '1', '3', 'each T parks in start.await()'], ['main: start.countDown()', '0', '3', H.c('g', 'all 3 released together')], ['T2 finishes (50 ms)', '0', '2', 'countDown in finally'], ['T1, T3 finish', '0', '0', 'main wakes from done.await()'], ['return', '0', '0', 'elapsed ≈ 50 ms']] },
        complexity: `<p>O(n) threads and O(1) synchronizer state. Elapsed time ≈ the slowest worker, plus wake-up latency (microseconds per thread).</p>`,
        followUps: ['Make it reusable for 5 rounds (CyclicBarrier)', 'Add a timeout so a hung worker cannot block the harness forever', 'Why is JMH still better for micro-benchmarks?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Atomics, CAS, LongAdder, ABA
     ====================================================================== */
  topics.push({
    title: 'Atomics & CAS: Lock-Free Counters, Retry Loops, ABA and LongAdder',
    analogy: `<p>Imagine a <b>shared whiteboard</b> showing "Tickets sold: 41". You want to add one. Instead of locking the room, you say: "<i>If the board still says 41, change it to 42</i>". If someone else changed it to 42 while you were thinking, your conditional edit <b>fails</b>, you read again (42), and retry with "if 42, make it 43". Nobody ever waits outside a locked door — you only redo a tiny bit of work when you lose a race. That conditional edit is <b>Compare-And-Swap (CAS)</b>, a single CPU instruction.</p>`,
    explain: `<p><b>Plain idea:</b> ${C('count++')} is really three steps — <b>read</b>, <b>add</b>, <b>write</b> — and two threads can interleave them and lose an update. ${C('volatile')} fixes visibility but not this. Locks fix it by making threads wait. <b>Atomic classes</b> fix it with CAS: a hardware instruction (${C('LOCK CMPXCHG')} on x86, LDXR/STXR or CAS on ARM) that does "compare the current value with what I expect; if equal, write the new value" as <b>one indivisible step</b>, returning success or failure.</p>
<h4>The CAS retry loop (how incrementAndGet works)</h4>
${P(`
int incrementAndGet(AtomicInteger a) {
    while (true) {
        int expected = a.get();           // 1. read current value
        int next = expected + 1;          // 2. compute privately
        if (a.compareAndSet(expected, next)) // 3. publish only if nobody changed it
            return next;
        // lost the race: someone changed the value, loop and retry
    }
}`)}
<h4>The atomic family</h4>
${H.table(['Class', 'For', 'Handy methods'], [
  [C('AtomicInteger / AtomicLong'), 'counters, ids, sequence numbers', C('incrementAndGet, addAndGet, compareAndSet, updateAndGet, accumulateAndGet')],
  [C('AtomicBoolean'), 'run-once flags', C('compareAndSet(false, true)')],
  [C('AtomicReference<V>'), 'swap a whole immutable object', C('compareAndSet(old, new), getAndUpdate')],
  [C('AtomicStampedReference<V>'), 'reference + int version', 'fixes the ABA problem'],
  [C('AtomicIntegerArray / AtomicLongArray'), 'per-slot atomic arrays', C('incrementAndGet(i)')],
  [C('LongAdder / LongAccumulator'), 'very hot counters (metrics)', C('increment(), sum()')],
  [C('VarHandle'), 'CAS on a plain field (Java 9+)', C('compareAndSet, getAcquire, setRelease')]
])}
<h4>updateAndGet: your function, CAS loop for free</h4>
<p>${C('max.accumulateAndGet(x, Math::max)')} keeps a running maximum without a lock. The function may be called <b>several times</b> when there is contention, so it must be <b>pure</b> (no side effects, no printing, no I/O).</p>
<h4>LongAdder: spread the contention</h4>
<p>With 64 threads hammering one AtomicLong, most CAS attempts fail and retry, and the cache line bounces between cores. ${C('LongAdder')} keeps a base value plus an array of <b>cells</b>; each thread mostly updates its own cell, and ${C('sum()')} adds them up. Writes scale almost linearly; the trade-off is that ${C('sum()')} is not an atomic snapshot and costs O(cells). Perfect for metrics, bad for "generate unique ids".</p>
<h4>The ABA problem</h4>
<p>Thread 1 reads <b>A</b>, gets paused. Thread 2 changes A → B → A. Thread 1's CAS(A, X) <b>succeeds</b> although the world changed underneath (e.g., in a lock-free stack the node A was popped and pushed back with a different next pointer). Fix: ${C('AtomicStampedReference')} — CAS on (reference, stamp), and every change bumps the stamp. In Java, garbage collection already prevents the most common ABA case (a freed node's memory being reused while still referenced), which is why it bites less often than in C++.</p>
<h4>When atomics are the wrong tool</h4>
<p>Atomics protect <b>one variable</b>. Two variables that must change together (balance and history, min and max) need a lock — or one AtomicReference to an immutable object holding both.</p>`,
    clues: ['"thread-safe counter / id generator without locks" → AtomicInteger / AtomicLong', '"count++ gives wrong totals with many threads" → lost update → atomic or lock', '"millions of increments per second from many threads (metrics)" → LongAdder', '"run this initialisation only once" → AtomicBoolean.compareAndSet(false, true)', '"lock-free stack/queue" → AtomicReference + CAS loop (watch ABA)', '"value changed and changed back" → ABA → AtomicStampedReference', '"update two fields atomically" → lock, or AtomicReference to an immutable record'],
    code: [`
public class CasDemo {
    // Hand-written CAS loop: atomically double the value unless it would exceed a cap.
    static int doubleCapped(AtomicInteger a, int cap) {
        while (true) {
            int cur = a.get();
            int next = Math.min(cur * 2, cap);
            if (a.compareAndSet(cur, next)) return next;   // success
            Thread.onSpinWait();                           // hint to the CPU while spinning
        }
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger hits = new AtomicInteger();
        LongAdder adds = new LongAdder();
        AtomicInteger max = new AtomicInteger(Integer.MIN_VALUE);
        int[] plain = {0};                                 // the broken version, for contrast

        Thread[] ts = new Thread[4];
        for (int t = 0; t < ts.length; t++) {
            final int id = t;
            ts[t] = new Thread(() -> {
                for (int i = 0; i < 100_000; i++) {
                    hits.incrementAndGet();                // atomic
                    adds.increment();                      // striped, scales better
                    plain[0]++;                            // RACE: lost updates
                    max.accumulateAndGet(id * 1000 + i % 1000, Math::max);
                }
            });
            ts[t].start();
        }
        for (Thread t : ts) t.join();
        System.out.println("atomic   = " + hits.get());    // 400000
        System.out.println("adder    = " + adds.sum());    // 400000
        System.out.println("plain    = " + plain[0]);      // usually LESS than 400000
        System.out.println("max      = " + max.get());     // 3999
        System.out.println("doubled  = " + doubleCapped(new AtomicInteger(300), 500)); // 500
    }
}`, `
// Treiber stack: the classic lock-free stack with AtomicReference
class LockFreeStack<T> {
    private record Node<T>(T value, Node<T> next) {}
    private final AtomicReference<Node<T>> top = new AtomicReference<>();

    void push(T v) {
        Node<T> oldTop, newTop;
        do {
            oldTop = top.get();
            newTop = new Node<>(v, oldTop);
        } while (!top.compareAndSet(oldTop, newTop));   // retry if top moved
    }

    T pop() {
        Node<T> oldTop;
        do {
            oldTop = top.get();
            if (oldTop == null) return null;
        } while (!top.compareAndSet(oldTop, oldTop.next()));
        return oldTop.value();
    }
}`],
    codeTitle: ['AtomicInteger vs LongAdder vs plain int, plus a custom CAS loop', 'Treiber lock-free stack'],
    viz: {
      title: 'CAS retry loop: N threads increment the same AtomicInteger',
      input: '3 10',
      inputLabel: 'threads (1-5) and starting value, e.g. 3 10',
      gen: function (input) {
        var m = String(input).match(/-?\d+/g);
        if (!m || m.length < 1) throw new Error('Format: threads startValue, e.g. 3 10');
        var n = +m[0], value = m.length > 1 ? +m[1] : 0;
        if (n < 1 || n > 5 || Math.abs(value) > 1e6) throw new Error('threads must be 1..5, start value small');
        var code = 'while (true) {\n    int expected = value.get();      // read\n    int next = expected + 1;         // compute\n    if (value.compareAndSet(expected, next))\n        return next;                 // won\n    // lost: someone changed it → retry\n}';
        var frames = [], live = [], exp = {}, attempts = 0, fails = 0, start = value;
        for (var i = 1; i <= n; i++) live.push('T' + i);
        function vals() {
          var v = { 'value (shared)': value, 'CAS attempts': attempts, 'failed CAS': fails };
          for (var i = 1; i <= n; i++) { var t = 'T' + i; v[t] = exp[t] === undefined ? 'done' : 'expects ' + exp[t] + ' → ' + (exp[t] + 1); }
          return v;
        }
        function fr(narr, line, cls, hl, bars) {
          var parts = [codePart(code, line, cls), { type: 'vars', label: 'Shared value + each thread\'s private locals', vals: vals(), hl: hl || {} }];
          if (bars) parts.push(bars);
          frames.push({ narr: narr, parts: parts });
        }
        fr('Shared <b>AtomicInteger value = ' + value + '</b>. ' + n + ' threads each call incrementAndGet() exactly once, all at the same time. Correct final answer: ' + (start + n) + '.', null);
        var round = 0;
        while (live.length && round < 6) {
          round++;
          live.forEach(function (t) { exp[t] = value; });
          var h = {}; live.forEach(function (t) { h[t] = 'cur'; });
          fr('Round ' + round + ': every still-running thread (' + live.join(', ') + ') <b>reads</b> value = ' + value + ' and privately computes ' + (value + 1) + '. Nothing is shared yet — the work is cheap and wasted work is fine.', [2, 3], 'cur', h);
          var winner = live[0];
          attempts++;
          value = exp[winner] + 1;
          var hw = {}; hw[winner] = 'ok'; hw['value (shared)'] = 'ok';
          delete exp[winner];
          fr('<b>' + winner + '</b> executes CAS(expected=' + (value - 1) + ', new=' + value + '): memory still holds ' + (value - 1) + ' → <span class="c-g">SUCCESS</span>. The CPU did compare+write as one indivisible instruction. value = ' + value + '.', [4, 5], 'ok', hw);
          var losers = live.slice(1);
          losers.forEach(function (t) {
            attempts++; fails++;
            var hb = {}; hb[t] = 'bad'; hb['failed CAS'] = 'bad';
            fr('<b>' + t + '</b> tries CAS(expected=' + exp[t] + ', new=' + (exp[t] + 1) + ') but memory now holds <b>' + value + '</b> ≠ ' + exp[t] + ' → <span class="c-r">FAILS</span>. No damage done — it just loops back and re-reads. (With count++ this update would have been silently LOST.)', 6, 'bad', hb);
          });
          live = losers;
        }
        fr('All done: value = <b>' + value + '</b> (correct: ' + (start + n) + '). Total CAS attempts = ' + attempts + ' = n(n+1)/2 for n=' + n + ' in this worst-case schedule; ' + fails + ' were retries. Under heavy contention retries grow — that is why <b>LongAdder</b> spreads updates over many cells.', null, null, { 'value (shared)': 'sel' }, { type: 'bars', label: 'CAS attempts per thread (worst case: thread k tries k times)', values: (function () { var a = []; for (var i = 1; i <= n; i++) a.push(i); return a; })(), idxLabels: (function () { var a = []; for (var i = 1; i <= n; i++) a.push('T' + i); return a; })() });
        return frames;
      }
    },
    examples: [
      { title: 'Lost update with count++ — the numbers', html: `<p>Two threads, count = 5. T1 reads 5. T2 reads 5. T1 writes 6. T2 writes 6. Two increments, final value <b>6</b> instead of 7. ${H.table(['step', 'T1', 'T2', 'memory'], [['1', 'read 5', '', '5'], ['2', '', 'read 5', '5'], ['3', 'write 6', '', '6'], ['4', '', H.c('r', 'write 6'), H.c('r', '6 (lost one)')]])} With ${C('compareAndSet(5, 6)')} in step 4 the CAS fails (memory is 6, not 5), T2 re-reads 6 and writes 7.</p>` },
      { title: 'Run-once initialisation with AtomicBoolean', html: `<p>Many threads may call ${C('start()')}, but the expensive setup must run exactly once. Only one thread wins ${C('compareAndSet(false, true)')}; the rest return immediately. (If others must <i>wait</i> until setup finishes, use a latch or a holder-class idiom instead.)</p>`, code: `
class Service {
    private final AtomicBoolean started = new AtomicBoolean(false);
    void start() {
        if (!started.compareAndSet(false, true)) return;  // someone else already did it
        System.out.println("starting once on " + Thread.currentThread().getName());
    }
}` },
      { title: 'Updating two values together with an immutable record', html: `<p>Need min and max to be consistent with each other? Put both in an immutable record and swap the <b>whole object</b> with ${C('AtomicReference.updateAndGet')}. The lambda may run several times under contention, so it only builds a new object — no side effects.</p>`, code: `
record Range(int min, int max) {}
AtomicReference<Range> range = new AtomicReference<>(new Range(Integer.MAX_VALUE, Integer.MIN_VALUE));
for (int x : new int[]{5, -2, 9, 3}) {
    range.updateAndGet(r -> new Range(Math.min(r.min(), x), Math.max(r.max(), x)));
}
System.out.println(range.get()); // Range[min=-2, max=9]` },
      { title: 'ABA fixed with a stamp', html: `<p>Each change bumps the stamp. Thread 1 remembers (A, stamp 0). Meanwhile A→B (stamp 1) → A (stamp 2). Thread 1's ${C('compareAndSet(A, X, 0, 1)')} now fails because the stamp is 2, even though the reference is A again.</p>`, code: `
AtomicStampedReference<String> ref = new AtomicStampedReference<>("A", 0);
int seen = ref.getStamp();                                  // thread 1 reads stamp 0
ref.compareAndSet("A", "B", ref.getStamp(), ref.getStamp() + 1); // thread 2: A -> B
ref.compareAndSet("B", "A", ref.getStamp(), ref.getStamp() + 1); // thread 2: B -> A
boolean ok = ref.compareAndSet("A", "X", seen, seen + 1);   // thread 1 (stale)
System.out.println(ok + " stamp=" + ref.getStamp());        // false stamp=2` }
    ],
    deepDive: `<p><b>Hardware:</b> on x86, ${C('compareAndSet')} becomes ${C('LOCK CMPXCHG')}: the core takes exclusive ownership of the cache line (MESI "Modified"), compares, writes, and acts as a full memory fence. Uncontended it costs ~5-20 ns; contended, the cache line ping-pongs between cores and each attempt can cost 100+ ns. ARMv8.1+ has a native CAS instruction (LSE atomics); older ARM uses load-linked/store-conditional loops. ${C('getAndAdd')} maps to ${C('LOCK XADD')} on x86 — it never fails, which is why ${C('incrementAndGet')} on modern JDKs is not literally a CAS loop on x86 (the intrinsic uses XADD), while ${C('updateAndGet')} must be.</p>
<p><b>Memory ordering:</b> Atomic ${C('get/set')} have volatile semantics; ${C('compareAndSet')} has volatile read+write semantics. Weaker modes exist via VarHandle/atomics: ${C('lazySet/setRelease')} (cheaper publishing, used inside queues), ${C('getAcquire')}, ${C('getPlain')}, ${C('weakCompareAndSetPlain')} (may fail spuriously, no ordering). Use these only with proof — they are how JDK authors squeeze nanoseconds.</p>
<p><b>Lock-free vs wait-free:</b> a CAS loop is <b>lock-free</b> — some thread always makes progress — but an individual unlucky thread can starve in theory. <b>Wait-free</b> means every thread finishes in a bounded number of steps (e.g., XADD-based getAndIncrement). Under extreme contention a lock can beat CAS because parked threads stop burning CPU and stop bouncing the cache line.</p>
<p><b>LongAdder internals</b> (Striped64): starts with just ${C('base')}; on the first CAS failure it creates a ${C('Cell[]')} (size grows in powers of two up to #CPUs), and each thread hashes to a cell via its probe value. Cells are annotated ${C('@Contended')} — padded to sit on separate cache lines and avoid <b>false sharing</b>. ConcurrentHashMap's ${C('size()')} uses the same counter-cell trick.</p>
<p><b>False sharing</b> also hurts your own code: two AtomicLongs allocated next to each other in an array can share a 64-byte cache line, so threads updating "different" counters still fight. Padding or LongAdder fixes it.</p>`,
    aiEra: `<p><b>What AI changes:</b> models know the CAS idioms well and will happily write ${C('AtomicInteger')} code — sometimes too happily, wrapping every field in its own atomic and thinking the class is now thread-safe (it is not: compound invariants across fields still break). <b>Use AI as a partner:</b> ask "<i>which invariants in this class span more than one atomic variable?</i>", or have it generate a jcstress test that tries all interleavings of your CAS loop. <b>Where AI goes wrong:</b> side effects (logging, I/O, list.add) inside ${C('updateAndGet')} lambdas that run multiple times; using LongAdder for ID generation; claiming CAS is always faster than locks; writing lock-free queues without considering ABA or memory reclamation. <b>What you must still own:</b> knowing when lock-free is worth the complexity (rarely, outside libraries and hot counters), and measuring with JMH at realistic thread counts.</p>`,
    problems: [{
      title: 'Lock-Free Running Maximum with a CAS Loop',
      level: 'Medium', tags: ['CAS', 'AtomicLong', 'lock-free'], companies: ['Google', 'Netflix', 'Datadog'],
      statement: `<p>A latency tracker receives values from many threads. Implement ${C('class MaxTracker')} with ${C('void record(long latencyMs)')} and ${C('long max()')} that keeps the maximum ever seen. Do it <b>without locks</b> using an explicit ${C('compareAndSet')} loop, and avoid useless CAS attempts when the new value is not larger.</p>`,
      constraints: `Up to 64 writer threads, 10<sup>7</sup> records/s; record() must never block.`,
      example: `<p>Threads record ${H.arr([120, 85, 340, 200, 340, 90])} concurrently → ${C('max()')} = ${H.c('g', '340')}. Most records (85, 90, 200 after 340) should not even attempt a CAS.</p>`,
      brute: { why: `<p>${C('synchronized void record(...)')} is correct, but with 64 threads every call takes the same monitor → threads park and wake constantly, and throughput collapses. Also, almost all calls do <b>nothing</b> (value not larger), yet they still pay for the lock.</p>`, code: `
class SyncMaxTracker {
    private long max = Long.MIN_VALUE;
    synchronized void record(long v) { if (v > max) max = v; }
    synchronized long max() { return max; }
}` },
      mcq: { q: 'Inside the CAS loop, you read cur = 300 and want to store 340, but the CAS fails. What is the right next step?', options: ['Give up: someone else stored something', 'Re-read; if the new current value ≥ 340, stop; else retry the CAS', 'Spin until the value is 300 again', 'Take a lock'], answer: 1, explain: 'A failure means the value changed. Re-read: if another thread already stored something ≥ 340, our update is unnecessary; otherwise retry with the fresh expected value.' },
      hints: [`<p>Hint 1: the fast path is a plain read — if ${C('v <= max.get()')} there is nothing to do. Most calls end here, with no write at all (no cache-line ownership needed).</p>`, `<p>Hint 2: otherwise loop: ${C('cur = get()')}; if ${C('v <= cur')} return; if ${C('compareAndSet(cur, v)')} return; else loop.</p>`, `<p>Hint 3: the one-liner equivalent is ${C('max.accumulateAndGet(v, Math::max)')} — but that always performs a CAS even when v is smaller, so the explicit loop is faster on hot paths.</p>`],
      tests: { sig: 'long[] -> long', fn: 'chk', harness: { java: `
class Check {
  static long chk(long[] vals) throws Exception {
    MaxTracker t = new MaxTracker();
    int T = Math.max(1, Math.min(8, vals.length));
    Thread[] ts = new Thread[T];
    for (int i = 0; i < T; i++) {
      final int id = i;
      ts[i] = new Thread(() -> { for (int k = id; k < vals.length; k += T) t.record(vals[k]); });
      ts[i].start();
    }
    for (Thread th : ts) th.join();
    return t.max();
  }
}` }, cases: [
          [[[120, 85, 340, 200, 340, 90]], 340],
          [[[]], '-9223372036854775808'],
          [[[5]], 5],
          [[[-5, -1, -9]], -1],
          [[['-9223372036854775808']], '-9223372036854775808'],
          [[['9223372036854775807', 0, -1]], '9223372036854775807'],
          [[[0, 0, 0]], 0],
          [[{ $range: [0, 1000000] }], 999999],
          [[{ $range: [1000000, 0, -1] }], 1000000]
        ] },
      solution: {
        approach: `<p>Check-then-CAS loop. Each failed CAS means somebody else made progress (lock-free). The early-exit check turns the common case into a single volatile read. Monotonic max cannot suffer ABA problems: the value only ever grows, so "same value" really means "nothing relevant changed".</p>`,
        code: `
public class MaxTracker {
    private final AtomicLong max = new AtomicLong(Long.MIN_VALUE);

    void record(long v) {
        long cur = max.get();
        while (v > cur) {                         // only try when we would raise it
            if (max.compareAndSet(cur, v)) return; // we won
            cur = max.get();                       // lost: re-read and re-check
        }
    }

    long max() { return max.get(); }

    public static void main(String[] args) throws InterruptedException {
        MaxTracker t = new MaxTracker();
        long[] samples = {120, 85, 340, 200, 340, 90};
        Thread[] ts = new Thread[samples.length];
        for (int i = 0; i < samples.length; i++) {
            final long s = samples[i];
            ts[i] = new Thread(() -> t.record(s));
            ts[i].start();
        }
        for (Thread th : ts) th.join();
        System.out.println(t.max());               // 340
    }
}`,
        dry: { head: ['thread', 'v', 'cur read', 'v &gt; cur?', 'CAS', 'max after'], rows: [['T1', '120', 'MIN', 'yes', 'MIN→120 ✔', '120'], ['T3', '340', '120', 'yes', '120→340 ✔', '340'], ['T4', '200', '120 (stale)', 'yes', H.c('r', '120→200 ✘ (is 340)'), '340'], ['T4 retry', '200', '340', H.c('g', 'no → return'), '—', '340'], ['T2', '85', '340', 'no → return', '—', '340']] },
        complexity: `<p>O(1) expected per record; under contention a thread retries at most until someone stores a value ≥ its own. Space O(1). Reads of max are a single volatile load.</p>`,
        followUps: ['Track min and max together atomically (AtomicReference to a record)', 'Track a per-minute max that resets (LongAccumulator + reset, or a ring of buckets)', 'Why can a LongAccumulator(Math::max) beat this under extreme contention?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — BlockingQueue & Producer-Consumer
     ====================================================================== */
  topics.push({
    title: 'BlockingQueue & the Producer-Consumer Pattern',
    analogy: `<p>A <b>sushi conveyor belt</b> with room for 5 plates. The chef (producer) puts plates on the belt; customers (consumers) take them off. If the belt is <b>full</b>, the chef simply waits before making more — no plates fall on the floor. If the belt is <b>empty</b>, customers wait — nobody grabs at thin air. The chef and the customers never talk to each other directly; the belt decouples them and absorbs short bursts. That belt is a <b>bounded BlockingQueue</b>.</p>`,
    explain: `<p><b>Plain idea:</b> a ${C('BlockingQueue')} is a thread-safe queue whose ${C('put')} <b>waits</b> when full and whose ${C('take')} <b>waits</b> when empty. All the locking, waiting and signalling you would write with ${C('wait/notify')} is done for you, correctly.</p>
<h4>Four ways to insert and remove</h4>
${H.table(['', 'Throws', 'Returns special value', 'Blocks', 'Times out'], [
  ['Insert', C('add(e)'), C('offer(e)') + ' → false', H.c('g', C('put(e)')), C('offer(e, t, unit)')],
  ['Remove', C('remove()'), C('poll()') + ' → null', H.c('g', C('take()')), C('poll(t, unit)')],
  ['Peek', C('element()'), C('peek()'), '—', '—']
])}
<p>Null elements are <b>forbidden</b> (null is the "nothing there" signal of ${C('poll')}).</p>
<h4>The implementations</h4>
${H.table(['Class', 'Bound', 'Inside', 'Pick it when'], [
  [C('ArrayBlockingQueue'), 'fixed, required', 'array + 1 lock + 2 conditions', 'predictable memory, simple back-pressure'],
  [C('LinkedBlockingQueue'), 'optional (default Integer.MAX_VALUE!)', 'linked nodes + separate put/take locks', 'higher throughput: producers and consumers rarely block each other'],
  [C('PriorityBlockingQueue'), 'unbounded', 'binary heap', 'urgent jobs first (put never blocks!)'],
  [C('DelayQueue'), 'unbounded', 'heap of Delayed', 'retry later, cache expiry, scheduled jobs'],
  [C('SynchronousQueue'), 'zero', 'direct hand-off', 'each put waits for a take (cached thread pool)'],
  [C('LinkedTransferQueue'), 'unbounded', 'lock-free dual queue', C('transfer()') + ': wait until a consumer received it'],
  [C('LinkedBlockingDeque'), 'optional', 'deque', 'work stealing, LIFO processing']
])}
<h4>The pattern</h4>
${P(`
BlockingQueue<Job> q = new ArrayBlockingQueue<>(100);
// producer thread(s)
q.put(job);              // waits if 100 jobs are already waiting
// consumer thread(s)
Job j = q.take();        // waits if nothing to do
process(j);`)}
<h4>How do consumers know when to stop?</h4>
<ol>
<li><b>Poison pill:</b> the producer puts a special sentinel object (e.g. ${C('Job.STOP')}) — <b>one per consumer</b>. A consumer that takes it exits its loop.</li>
<li><b>Interrupt:</b> ${C('executor.shutdownNow()')} interrupts consumers blocked in ${C('take()')}, which throws InterruptedException.</li>
<li><b>Timed poll + flag:</b> ${C('poll(1, SECONDS)')} in a loop that also checks a ${C('volatile boolean running')}.</li>
</ol>
<h4>Why bounded matters</h4>
<p>If producers are faster than consumers forever, an unbounded queue grows until OutOfMemoryError — and before that, latency explodes (a job waits behind a million others). A bound converts overload into <b>back-pressure</b>: producers slow down to the consumers' speed. Little's law tells you the sizing: items in queue ≈ arrival rate × wait time.</p>`,
    clues: ['"producer-consumer" / "decouple fast producer from slow consumer" → BlockingQueue', '"bounded buffer" / "producers must wait when full" → ArrayBlockingQueue put/take', '"how do consumers stop cleanly?" → poison pill (one per consumer) or interrupt', '"process urgent tasks first" → PriorityBlockingQueue', '"retry after 30 seconds" / "expire entries" → DelayQueue', '"hand-off with no buffering" → SynchronousQueue', '"implement it yourself without BlockingQueue" → lock + 2 conditions or wait/notifyAll'],
    code: [`
public class Pipeline {
    record Job(int id, String payload) {
        static final Job STOP = new Job(-1, "");          // poison pill
    }

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Job> q = new ArrayBlockingQueue<>(5);  // bounded = back-pressure
        int consumers = 2;

        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 10; i++) q.put(new Job(i, "img-" + i)); // blocks when full
                for (int c = 0; c < consumers; c++) q.put(Job.STOP);      // one pill EACH
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "producer");

        List<Thread> workers = new ArrayList<>();
        for (int c = 1; c <= consumers; c++) {
            Thread w = new Thread(() -> {
                try {
                    while (true) {
                        Job j = q.take();                     // blocks when empty
                        if (j == Job.STOP) break;             // identity check on the pill
                        System.out.println(Thread.currentThread().getName() + " processed " + j.payload());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }, "consumer-" + c);
            workers.add(w);
            w.start();
        }
        producer.start();
        producer.join();
        for (Thread w : workers) w.join();
        System.out.println("pipeline finished, queue size = " + q.size()); // 0
    }
}`],
    codeTitle: ['Producer-consumer with ArrayBlockingQueue and poison pills'],
    viz: {
      title: 'Bounded BlockingQueue: put blocks when full, take blocks when empty',
      input: '3 | P P P P P C C C C C C P',
      inputLabel: 'capacity | events (P = a producer calls put, C = a consumer calls take)',
      gen: function (input) {
        var parts = String(input).split('|');
        if (parts.length < 2) throw new Error('Format: capacity | P C P …, e.g. 3 | P P P P C C');
        var cap = parseInt(parts[0], 10);
        if (!(cap >= 1 && cap <= 6)) throw new Error('capacity must be 1..6');
        var ev = tokens(parts[1], /[\s,]+/, 'Add events P or C');
        if (ev.length > 20) throw new Error('At most 20 events');
        var q = [], item = 0, pN = 0, cN = 0, waitP = [], waitC = [], frames = [], consumed = [];
        function g(hl, ehl) {
          return { type: 'graph', label: 'Producers → queue → consumers', directed: true, height: 40, nodes: [
            { id: 'P', label: 'Producers' + (waitP.length ? ' (' + waitP.length + ' blocked)' : ''), x: 12, y: 20, shape: 'box', w: 20 },
            { id: 'Q', label: 'ArrayBlockingQueue ' + q.length + '/' + cap, x: 50, y: 20, shape: 'box', w: 28 },
            { id: 'C', label: 'Consumers' + (waitC.length ? ' (' + waitC.length + ' blocked)' : ''), x: 88, y: 20, shape: 'box', w: 20 }
          ], edges: [['P', 'Q', 'put'], ['Q', 'C', 'take']], hl: hl || {}, ehl: ehl || {} };
        }
        function fr(narr, hl, ehl, qhl) {
          frames.push({ narr: narr, parts: [g(hl, ehl), { type: 'queue', label: 'Buffer (capacity ' + cap + ')', items: q.slice(), hl: qhl || {}, frontLabel: 'head → take()', backLabel: 'tail ← put()' },
            { type: 'vars', label: 'Waiting rooms (Conditions)', vals: { 'notFull waiters (producers)': waitP.map(function (w) { return w.who + '(' + w.it + ')'; }).join(', ') || '—', 'notEmpty waiters (consumers)': waitC.join(', ') || '—', consumed: consumed.join(' ') || '—' }, hl: {} }] });
        }
        fr('Empty buffer with capacity ' + cap + '. Producers call <b>put</b>, consumers call <b>take</b>. Inside: one ReentrantLock plus two Conditions, <code>notFull</code> and <code>notEmpty</code>.');
        ev.forEach(function (e) {
          e = e.toUpperCase();
          if (e === 'P') {
            pN++; item++; var who = 'P' + pN, it = 'J' + item;
            if (waitC.length) {
              var c = waitC.shift(); consumed.push(it);
              fr('<b>' + who + '.put(' + it + ')</b>: a consumer (' + c + ') is waiting on <code>notEmpty</code>. The item goes in, <code>signal()</code> wakes ' + c + ', and ' + c + ' takes ' + it + ' right away.', one('C', 'ok'), { 'P-Q': 'ok', 'Q-C': 'ok' });
            } else if (q.length < cap) {
              q.push(it);
              fr('<b>' + who + '.put(' + it + ')</b>: room available → appended at the tail. size ' + q.length + '/' + cap + '.', one('Q', 'ok'), one('P-Q', 'ok'), one(q.length - 1, 'ok'));
            } else {
              waitP.push({ who: who, it: it });
              fr('<b>' + who + '.put(' + it + ')</b>: buffer <span class="c-r">FULL</span> → ' + who + ' <b>blocks</b> on <code>notFull.await()</code>, still holding ' + it + '. This is back-pressure: the producer is slowed to the consumers\' pace instead of using unlimited memory.', one('P', 'bad'), one('P-Q', 'bad'));
            }
          } else if (e === 'C') {
            cN++; var cw = 'C' + cN;
            if (q.length) {
              var got = q.shift(); consumed.push(got);
              var narr = '<b>' + cw + '.take()</b> → gets <b>' + got + '</b> from the head (FIFO).';
              if (waitP.length) {
                var p = waitP.shift(); q.push(p.it);
                narr += ' A slot freed up, so <code>notFull.signal()</code> wakes <b>' + p.who + '</b>, which finally inserts ' + p.it + '.';
                fr(narr, one('P', 'ok'), { 'Q-C': 'ok', 'P-Q': 'ok' }, one(q.length - 1, 'ok'));
              } else fr(narr, one('C', 'ok'), one('Q-C', 'ok'));
            } else {
              waitC.push(cw);
              fr('<b>' + cw + '.take()</b>: buffer <span class="c-y">EMPTY</span> → ' + cw + ' <b>blocks</b> on <code>notEmpty.await()</code>. It uses no CPU while parked (no busy-waiting).', one('C', 'cur'), one('Q-C', 'bad'));
            }
          } else throw new Error('Events must be P or C, got "' + e + '"');
        });
        fr('End: buffer [' + q.join(', ') + '], consumed in order: ' + (consumed.join(' ') || 'nothing') + '. ' + (waitP.length + waitC.length ? 'Some threads are still blocked — in a real program you stop them with poison pills or interrupts.' : 'Nobody is blocked.'));
        return frames;
      }
    },
    examples: [
      { title: 'Poison-pill count bug', html: `<p>3 consumers, producer puts <b>one</b> STOP. Consumer 1 takes it and exits; consumers 2 and 3 block in ${C('take()')} forever → ${C('join()')} hangs and the JVM never exits. Rule: <b>one pill per consumer</b>, or have a consumer that sees the pill <b>put it back</b> before exiting so the next consumer sees it too.</p>`, code: `
// "Pass the pill on" variant: works for any number of consumers
static void consume(BlockingQueue<String> q, String stop) throws InterruptedException {
    while (true) {
        String s = q.take();
        if (s == stop) { q.put(stop); return; }   // re-insert for the next consumer
        System.out.println("got " + s);
    }
}` },
      { title: 'Batching with drainTo', html: `<p>Writing to a database row by row is slow. A consumer can block for the first element, then grab up to 99 more without waiting using ${C('drainTo')} — one batch insert instead of 100 round-trips. Throughput up, latency per item slightly up.</p>`, code: `
static List<String> nextBatch(BlockingQueue<String> q, int max) throws InterruptedException {
    List<String> batch = new ArrayList<>(max);
    batch.add(q.take());              // wait for at least one
    q.drainTo(batch, max - 1);        // take whatever else is already there, no waiting
    return batch;
}` },
      { title: 'DelayQueue for retries', html: `<p>A failed webhook should be retried after 5 s, 10 s, 20 s… Put a ${C('Delayed')} element with the next-attempt time; ${C('take()')} returns it only when its delay has expired. One thread can manage thousands of pending retries with no sleeping loops.</p>`, code: `
class Retry implements Delayed {
    final String url; final long dueAtNanos;
    Retry(String url, long delayMs) { this.url = url; this.dueAtNanos = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(delayMs); }
    public long getDelay(TimeUnit unit) { return unit.convert(dueAtNanos - System.nanoTime(), TimeUnit.NANOSECONDS); }
    public int compareTo(Delayed o) { return Long.compare(getDelay(TimeUnit.NANOSECONDS), o.getDelay(TimeUnit.NANOSECONDS)); }
}` },
      { title: 'Little\'s law sizing', html: `<p>Jobs arrive at 200/s; consumers process 250/s in total. Normally the queue is near empty. During a 10-second burst of 400/s the backlog grows by (400 − 250) × 10 = <b>1,500</b> jobs. A capacity of 2,000 absorbs it; a capacity of 100 would push back on producers after 0.7 s. Choose deliberately: do you want buffering (smooth bursts) or fast push-back (protect latency)?</p>` }
    ],
    deepDive: `<p><b>ArrayBlockingQueue vs LinkedBlockingQueue internals.</b> ABQ uses <b>one</b> ReentrantLock for both ends plus ${C('notEmpty')}/${C('notFull')} conditions; a put and a take can never run at the same time, but there is no allocation per element (good for GC). LBQ uses <b>two locks</b> (${C('putLock')}, ${C('takeLock')}) and an ${C('AtomicInteger count')}, so a producer and a consumer can work simultaneously at opposite ends — usually higher throughput — at the cost of allocating a Node per element. Its default capacity is ${C('Integer.MAX_VALUE')}: always pass a bound.</p>
<p><b>Signalling subtleties.</b> A put on LBQ signals notEmpty only when the queue goes from 0 to 1 (and uses "cascading" signals to wake further takers), minimising lock handoffs. Your own implementations must use ${C('while')} loops around ${C('await')}, and with a single condition (wait/notify) you must use ${C('notifyAll')} — ${C('notify')} may wake a producer when a consumer was needed, and the system can stall.</p>
<p><b>Beyond one JVM.</b> A BlockingQueue lives in memory: a crash loses its contents. For durability, multiple machines or replay you move to Kafka, RabbitMQ, SQS — the same producer-consumer idea at system scale (partitions ≈ multiple queues, consumer groups ≈ consumer threads, broker retention ≈ bounded buffer). Low-latency trading systems go the other way: the <b>LMAX Disruptor</b> ring buffer pre-allocates entries, avoids locks, and uses sequence numbers with padding against false sharing to reach tens of millions of events per second.</p>
<p><b>Virtual threads + BlockingQueue</b> work well together: a virtual thread blocked in ${C('take()')} unmounts from its carrier, so you can have thousands of consumers cheaply. ${C('ExecutorService')} itself is producer-consumer: submit = put, worker = consumer loop.</p>`,
    aiEra: `<p><b>What AI changes:</b> "write a producer-consumer in Java" is a solved prompt — you will get correct BlockingQueue code in seconds. Interviews now probe the <b>edges</b>: shutdown, bounds, ordering, failures, and the hand-written wait/notify version. <b>Use AI as a partner:</b> ask it to generate a stress test with randomised producer/consumer speeds and an invariant check (every item consumed exactly once), or to translate the in-memory pipeline into a Kafka design and list what changes (durability, ordering per partition, at-least-once delivery). <b>Where AI goes wrong:</b> one poison pill for many consumers, ${C('new LinkedBlockingQueue<>()')} with no bound, swallowing InterruptedException, ${C('if')} instead of ${C('while')} in hand-written versions, ${C('notify')} instead of ${C('notifyAll')}. <b>What you must still own:</b> the capacity number, the overload policy, and the shutdown story.</p>`,
    problems: [{
      title: 'Log Pipeline: Producer, N Consumers, Clean Shutdown',
      level: 'Medium', tags: ['BlockingQueue', 'poison pill', 'ExecutorService'], companies: ['Amazon', 'LinkedIn', 'Splunk'],
      statement: `<p>A reader thread produces log lines; ${C('n')} worker threads parse them and count lines per level (INFO/WARN/ERROR) into a shared ${C('ConcurrentHashMap')}. Implement ${C('Map<String, Long> process(List<String> lines, int n)')} using a <b>bounded</b> BlockingQueue of capacity 100 and an ExecutorService for the workers. All workers must stop cleanly and the method must return the final counts.</p>`,
      constraints: `1 ≤ n ≤ 16, up to 10<sup>6</sup> lines; each line starts with its level, e.g. "ERROR db timeout".`,
      example: `<p>lines = ["INFO a", "ERROR b", "INFO c", "WARN d"], n = 2 → ${H.c('g', '{INFO=2, ERROR=1, WARN=1}')}. Which worker handles which line does not matter.</p>`,
      brute: { why: `<p>A single thread is simplest and fine for small inputs. A common broken "parallel" version shares a plain ${C('HashMap')} and does ${C('map.put(k, map.get(k) + 1)')} from many threads — a check-then-act race that loses counts (and can corrupt the HashMap).</p>`, code: `
static Map<String, Long> processSequential(List<String> lines) {
    Map<String, Long> counts = new HashMap<>();
    for (String line : lines) counts.merge(line.split(" ", 2)[0], 1L, Long::sum);
    return counts;
}` },
      mcq: { q: 'You have 4 consumer threads and use poison pills. How many pills should the producer put?', options: ['1', '4', '0 — call shutdown() instead', 'As many as there are lines'], answer: 1, explain: 'Each consumer exits after taking one pill, so 4 consumers need 4 pills (or each consumer must put the pill back before exiting).' },
      hints: [`<p>Hint 1: queue ${C('new ArrayBlockingQueue<String>(100)')}; the calling thread itself can be the producer.</p>`, `<p>Hint 2: workers loop ${C('take()')} until they see the pill (compare by identity with a unique ${C('new String("EOF")')}), and update counts with ${C('counts.merge(level, 1L, Long::sum)')} — atomic per key on ConcurrentHashMap.</p>`, `<p>Hint 3: after putting all lines, put n pills, then ${C('shutdown()')} + ${C('awaitTermination')}. Recipe: start n workers → put lines → put n pills → wait → return counts.</p>`],
      tests: { sig: 'list<string> int -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(List<String> lines, int n) throws Exception { return String.valueOf(new TreeMap<>(LogPipeline.process(lines, n))); }
}` }, cases: [
          [[['INFO a', 'ERROR b', 'INFO c', 'WARN d'], 2], '{ERROR=1, INFO=2, WARN=1}'],
          [[[], 3], '{}'],
          [[['WARN'], 1], '{WARN=1}'],
          [[['DEBUG x y z', 'DEBUG'], 16], '{DEBUG=2}'],
          [[['INFO a', 'INFO b', 'INFO c'], 16], '{INFO=3}'],
          [[{ $rep: 'INFO a', n: 1000000 }, 8], '{INFO=1000000}'],
          [[{ $concat: [{ $rep: 'INFO a', n: 300000 }, { $rep: 'WARN b', n: 200000 }, { $rep: 'ERROR c d', n: 100000 }] }, 4], '{ERROR=100000, INFO=300000, WARN=200000}']
        ] },
      solution: {
        approach: `<p>Classic producer-consumer: bounded queue for back-pressure, ConcurrentHashMap.merge for race-free counting, n poison pills for termination, executor shutdown + awaitTermination so the map is fully populated (and visible — termination gives happens-before) before returning.</p>`,
        code: `
public class LogPipeline {
    @SuppressWarnings("StringOperationCanBeSimplified")
    private static final String EOF = new String("EOF");   // unique identity, never equal by == to a real line

    static Map<String, Long> process(List<String> lines, int n) throws InterruptedException {
        BlockingQueue<String> q = new ArrayBlockingQueue<>(100);
        ConcurrentHashMap<String, Long> counts = new ConcurrentHashMap<>();
        ExecutorService workers = Executors.newFixedThreadPool(n);
        for (int i = 0; i < n; i++) {
            workers.execute(() -> {
                try {
                    while (true) {
                        String line = q.take();
                        if (line == EOF) return;                       // poison pill
                        String level = line.split(" ", 2)[0];
                        counts.merge(level, 1L, Long::sum);            // atomic per key
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        for (String line : lines) q.put(line);                         // blocks if workers lag
        for (int i = 0; i < n; i++) q.put(EOF);                        // one pill per worker
        workers.shutdown();
        if (!workers.awaitTermination(1, TimeUnit.MINUTES)) workers.shutdownNow();
        return counts;
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println(process(List.of("INFO a", "ERROR b", "INFO c", "WARN d"), 2));
    }
}`,
        dry: { head: ['step', 'queue', 'W1', 'W2', 'counts'], rows: [['put 4 lines', '[INFO a, ERROR b, INFO c, WARN d]', 'idle', 'idle', '{}'], ['W1 take, W2 take', '[INFO c, WARN d]', 'INFO a', 'ERROR b', '{INFO=1, ERROR=1}'], ['W1 take, W2 take', '[]', 'INFO c', 'WARN d', '{INFO=2, ERROR=1, WARN=1}'], ['put EOF, EOF', '[EOF, EOF]', 'takes EOF → exit', 'takes EOF → exit', 'final'], ['awaitTermination', '[]', 'done', 'done', H.c('g', '{INFO=2, ERROR=1, WARN=1}')]] },
        complexity: `<p>O(L) total work for L lines, spread over n workers; memory O(100 + distinct levels) thanks to the bound. Throughput is capped by the single producer and by queue lock contention — batch lines (drainTo) if that becomes the bottleneck.</p>`,
        followUps: ['What if one worker throws on a malformed line — does the pipeline still finish?', 'Preserve per-source ordering with multiple queues (partitioning by key)', 'How would this look with Kafka and a consumer group?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — CompletableFuture
     ====================================================================== */
  topics.push({
    title: 'CompletableFuture: Async Pipelines, Combining, Errors & Timeouts',
    analogy: `<p>Ordering in a <b>food court</b> with a buzzer. You order a burger at one stall and a smoothie at another — both are being made <b>at the same time</b>. You don't stand and stare: you tell each stall "<i>when it's ready, put it on my tray</i>" (a callback). When <b>both</b> are on the tray, you sit and eat (combine). If the smoothie machine breaks you take a bottle of water instead (fallback), and if the burger takes longer than 15 minutes you cancel it (timeout). A plain ${C('Future')} is a buzzer you must keep staring at; a ${C('CompletableFuture')} is a buzzer that can <b>trigger the next step for you</b>.</p>`,
    explain: `<p><b>Plain idea:</b> ${C('CompletableFuture<T>')} (Java 8) is a Future you can <b>chain</b>: "when this value is ready, transform it, then call another async service with it, combine it with a third result, and if anything fails, use a default". No thread sits blocked in ${C('get()')} between steps — each step runs when its inputs are ready.</p>
<h4>Starting</h4>
${H.table(['Method', 'Meaning'], [
  [C('supplyAsync(supplier, executor)'), 'run a value-producing task asynchronously'],
  [C('runAsync(runnable, executor)'), 'async task with no result'],
  [C('completedFuture(v)') + ' / ' + C('failedFuture(ex)'), 'already finished (tests, caches)'],
  [C('new CompletableFuture<>()') + ' + ' + C('complete(v)'), 'you complete it yourself (bridge from callbacks)']
])}
<p>Without an executor argument, async methods use ${C('ForkJoinPool.commonPool()')} — shared with parallel streams and sized to cores − 1. <b>Never run blocking I/O there</b>; pass your own executor.</p>
<h4>Chaining — the stream-like vocabulary</h4>
${H.table(['Method', 'Input → output', 'Like'], [
  [C('thenApply(fn)'), 'T → U (sync transform)', C('Stream.map')],
  [C('thenCompose(fn)'), 'T → CompletableFuture&lt;U&gt; (next async call)', C('Stream.flatMap')],
  [C('thenCombine(other, bifn)'), '(T, U) → V when <b>both</b> are done', 'zip'],
  [C('thenAccept(consumer)'), 'T → nothing', C('forEach')],
  [C('thenRun(runnable)'), 'ignore value, just run', ''],
  [C('allOf(cfs...)'), 'wait for all (returns Void)', 'join all'],
  [C('anyOf(cfs...)'), 'first to complete (Object)', 'race']
])}
<p><b>thenApply vs thenCompose</b> is the #1 question: if your function returns a CompletableFuture, ${C('thenApply')} gives you a nested ${C('CompletableFuture<CompletableFuture<U>>')}; ${C('thenCompose')} flattens it.</p>
<h4>Async variants and threads</h4>
<p>${C('thenApply(fn)')} runs fn on whichever thread completes the previous stage (or the caller if it is already done). ${C('thenApplyAsync(fn, executor)')} always hands fn to the executor. Use the Async form when fn is slow, so you don't steal the completing thread.</p>
<h4>Errors</h4>
${H.table(['Method', 'Called when', 'Can recover?'], [
  [C('exceptionally(ex -> fallback)'), 'only on failure', H.c('g', 'yes, returns a value')],
  [C('handle((v, ex) -> ...)'), 'always (one of v / ex is null)', H.c('g', 'yes')],
  [C('whenComplete((v, ex) -> ...)'), 'always', H.c('r', 'no — side effects only (logging), result passes through')],
  [C('exceptionallyCompose(fn)'), 'failure, fallback is async (Java 12+)', 'yes']
])}
<p>Failures <b>skip</b> downstream ${C('thenApply')} stages and arrive wrapped in ${C('CompletionException')} — unwrap with ${C('getCause()')}. ${C('join()')} throws unchecked CompletionException; ${C('get()')} throws checked ExecutionException.</p>
<h4>Timeouts (Java 9+)</h4>
<p>${C('orTimeout(2, SECONDS)')} fails the future with TimeoutException; ${C('completeOnTimeout(fallback, 2, SECONDS)')} completes it with a default. Note: neither stops the underlying work — it just stops waiting for it.</p>`,
    clues: ['"call 3 services in parallel and combine the results" → supplyAsync × 3 + thenCombine / allOf', '"the second call needs the first call\'s result" → thenCompose', '"non-blocking" / "don\'t tie up a thread while waiting" → CompletableFuture chain', '"use a default if the service is slow or down" → completeOnTimeout / exceptionally', '"first response wins" → anyOf', '"convert a callback API to a future" → new CompletableFuture + complete()', '"why is my parallel stream slow when async calls run?" → common pool shared/starved'],
    code: [`
public class CheckoutService {
    record User(int id, String name) {}
    record Quote(String user, double price) {}

    static final ExecutorService IO = Executors.newFixedThreadPool(8);

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }

    static CompletableFuture<User> fetchUser(int id) {
        return CompletableFuture.supplyAsync(() -> { sleep(100); return new User(id, "asha"); }, IO);
    }
    static CompletableFuture<Integer> fetchCartTotal(User u) {          // needs the user first
        return CompletableFuture.supplyAsync(() -> { sleep(80); return 1200; }, IO);
    }
    static CompletableFuture<Double> fetchDiscount() {                  // independent
        return CompletableFuture.supplyAsync(() -> { sleep(120); return 0.10; }, IO);
    }

    public static void main(String[] args) {
        long t0 = System.currentTimeMillis();
        CompletableFuture<User> user = fetchUser(7);
        CompletableFuture<Double> discount = fetchDiscount()               // runs in parallel with user
                .completeOnTimeout(0.0, 300, TimeUnit.MILLISECONDS);       // slow? no discount

        CompletableFuture<Quote> quote = user
                .thenCompose(u -> fetchCartTotal(u)                        // dependent async call
                        .thenApply(total -> new Quote(u.name(), total)))  // keep the user name
                .thenCombine(discount, (q, d) -> new Quote(q.user(), q.price() * (1 - d)))
                .orTimeout(1, TimeUnit.SECONDS)
                .exceptionally(ex -> new Quote("guest", -1));             // any failure -> fallback

        Quote q = quote.join();                                            // only blocking point
        System.out.println(q + " in ~" + (System.currentTimeMillis() - t0) + " ms"); // roughly max(100+80, 120) = 180 ms plus thread start-up, not 300
        IO.shutdown();
    }
}`, `
// allOf: fan out N calls, then collect all results (allOf itself returns Void)
static List<String> fetchAll(List<String> ids, ExecutorService ex) {
    List<CompletableFuture<String>> cfs = ids.stream()
            .map(id -> CompletableFuture.supplyAsync(() -> "item-" + id, ex)
                    .exceptionally(e -> "missing-" + id))      // one failure must not sink the batch
            .toList();
    return CompletableFuture.allOf(cfs.toArray(new CompletableFuture[0]))
            .thenApply(v -> cfs.stream().map(CompletableFuture::join).toList()) // join never blocks here
            .join();
}`],
    codeTitle: ['thenCompose + thenCombine + timeouts + fallback', 'Fan-out / fan-in with allOf'],
    viz: {
      title: 'CompletableFuture dependency graph over time',
      input: 'user=100 cart=80 discount=120 timeout=400 fail=none',
      inputLabel: 'user/cart/discount ms, timeout ms, fail=none|user|cart|discount',
      gen: function (input) {
        var s = String(input), get = function (k, d) { var m = new RegExp(k + '\\s*=\\s*(\\w+)').exec(s); return m ? m[1] : d; };
        var tu = +get('user', 100), tc = +get('cart', 80), td = +get('discount', 120), to = +get('timeout', 400), fail = get('fail', 'none');
        if ([tu, tc, td, to].some(function (x) { return !(x >= 1 && x <= 5000); })) throw new Error('Times must be 1..5000 ms, e.g. user=100 cart=80 discount=120 timeout=400');
        if (['none', 'user', 'cart', 'discount'].indexOf(fail) < 0) throw new Error('fail must be none, user, cart or discount');
        var st = { U: 'running', C: 'waiting for user', D: 'running', Q: 'waiting', R: 'waiting' }, frames = [];
        function g(hl, ehl) {
          return { type: 'graph', label: 'Stages (edges = "runs when this completes")', directed: true, height: 60, nodes: [
            { id: 'U', label: 'fetchUser: ' + st.U, x: 14, y: 12, shape: 'box', w: 24 },
            { id: 'C', label: 'thenCompose cart: ' + st.C, x: 45, y: 12, shape: 'box', w: 28 },
            { id: 'D', label: 'fetchDiscount: ' + st.D, x: 14, y: 48, shape: 'box', w: 24 },
            { id: 'Q', label: 'thenCombine: ' + st.Q, x: 76, y: 30, shape: 'box', w: 24 },
            { id: 'R', label: 'orTimeout+exceptionally: ' + st.R, x: 76, y: 54, shape: 'box', w: 30 }
          ], edges: [['U', 'C'], ['C', 'Q'], ['D', 'Q'], ['Q', 'R']], hl: hl || {}, ehl: ehl || {} };
        }
        function fr(t, narr, hl, ehl) { frames.push({ narr: (typeof t === 'string' ? '<b>' + t + '</b>' : '<b>t = ' + t + ' ms</b>') + ' — ' + narr, parts: [g(hl, ehl), { type: 'vars', label: 'Stage states', vals: copyObj(st), hl: {} }] }); }
        fr(0, 'supplyAsync starts <b>fetchUser</b> and <b>fetchDiscount</b> at the same time on the IO pool. The cart call cannot start yet: it needs the user (thenCompose). main is free — it has only built a graph of callbacks.', { U: 'cur', D: 'cur' });
        var events = [];
        var uEnd = tu, cEnd = tu + tc, dEnd = td;
        events.push({ t: uEnd, k: 'U' });
        if (fail !== 'user') events.push({ t: cEnd, k: 'C' });
        events.push({ t: dEnd, k: 'D' });
        events.sort(function (a, b) { return a.t - b.t; });
        var failed = false, done = false, cDone = false, dDone = false;
        for (var i = 0; i < events.length && !done; i++) {
          var e = events[i];
          if (e.t >= to) break;
          if (e.k === 'U') {
            if (fail === 'user') { st.U = 'FAILED'; st.C = 'skipped'; st.Q = 'skipped'; failed = true; fr(e.t, 'fetchUser <span class="c-r">throws</span>. Every dependent stage (thenCompose, thenCombine) is <b>skipped</b> — the exception travels down the chain wrapped in CompletionException, straight to exceptionally.', { U: 'bad', C: 'bad', Q: 'bad' }, { 'U-C': 'bad', 'C-Q': 'bad' }); }
            else { st.U = 'done (asha)'; st.C = 'running'; fr(e.t, 'User arrives → the thenCompose function runs and <b>launches fetchCartTotal(user)</b>, which returns another CompletableFuture. thenCompose flattens it (thenApply would give a future-of-a-future).', { U: 'ok', C: 'cur' }, { 'U-C': 'ok' }); }
          } else if (e.k === 'C') {
            if (fail === 'cart') { st.C = 'FAILED'; st.Q = 'skipped'; failed = true; fr(e.t, 'fetchCartTotal <span class="c-r">fails</span> → thenCombine is skipped even though discount may be fine.', { C: 'bad', Q: 'bad' }, { 'C-Q': 'bad' }); }
            else { st.C = 'done (1200)'; cDone = true; fr(e.t, 'Cart total ready (1200). thenCombine still needs the discount' + (dDone ? ' — which is already here!' : ' — it waits, no thread blocked.'), { C: 'ok' }, { 'C-Q': 'ok' }); }
          } else if (e.k === 'D') {
            if (fail === 'discount') { st.D = 'FAILED'; st.Q = 'skipped'; failed = true; fr(e.t, 'fetchDiscount <span class="c-r">fails</span> → thenCombine needs BOTH inputs, so it fails too. (Wrap the discount in its own exceptionally(ex -> 0.0) to make it optional.)', { D: 'bad', Q: 'bad' }, { 'D-Q': 'bad' }); }
            else { st.D = 'done (10%)'; dDone = true; fr(e.t, 'Discount ready (10%). ' + (cDone ? 'Cart is ready too.' : 'Waiting for the cart side.'), { D: 'ok' }, { 'D-Q': 'ok' }); }
          }
          if (failed) { st.R = 'fallback guest'; fr(e.t, '<b>exceptionally</b> catches the failure and returns the fallback Quote("guest", -1). join() returns normally — the caller never sees an exception.', { R: 'sel' }, { 'Q-R': 'ok' }); done = true; }
          else if (cDone && dDone) { st.Q = 'done 1080'; st.R = 'done 1080'; fr(Math.max(cEnd, dEnd), '<b>thenCombine</b> fires because both inputs are complete: 1200 × (1 − 0.10) = <b>1080</b>. Total latency = max(user+cart, discount) = max(' + cEnd + ', ' + dEnd + ') = ' + Math.max(cEnd, dEnd) + ' ms instead of ' + (tu + tc + td) + ' ms sequentially.', { Q: 'ok', R: 'sel' }, { 'Q-R': 'ok' }); done = true; }
        }
        if (!done) {
          st.R = 'TIMEOUT → fallback';
          fr(to, '<b>orTimeout(' + to + ' ms)</b> fires first: the result future completes exceptionally with TimeoutException, and exceptionally turns it into the fallback. <span class="c-y">The slow calls are not cancelled</span> — they keep running in the pool; their results are simply ignored.', { R: 'bad' }, {});
        }
        fr('Summary', 'Lesson: build the graph once, let completions drive it. Try <b>fail=discount</b>, or <b>timeout=150</b>, or make <b>discount=500</b> to see the critical path change.', {});
        return frames;
      }
    },
    examples: [
      { title: 'thenApply vs thenCompose types', html: `<p>${C('getUser()')} returns ${C('CompletableFuture<User>')}, ${C('getOrders(User)')} returns ${C('CompletableFuture<List<Order>>')}.</p>${H.table(['call', 'type you get'], [[C('getUser().thenApply(this::getOrders)'), H.c('r', C('CompletableFuture<CompletableFuture<List<Order>>>'))], [C('getUser().thenCompose(this::getOrders)'), H.c('g', C('CompletableFuture<List<Order>>'))]])}<p>Same as ${C('map')} vs ${C('flatMap')} on streams and Optional.</p>` },
      { title: 'handle vs exceptionally vs whenComplete', html: `<p>Given a stage that fails with "boom": ${C('exceptionally(e -> 0)')} → 0. ${C('handle((v, e) -> e == null ? v : -1)')} → -1 (and would also transform a success). ${C('whenComplete((v, e) -> log(e))')} → still failed; it only observes.</p>`, code: `
CompletableFuture<Integer> boom = CompletableFuture.supplyAsync(() -> { throw new IllegalStateException("boom"); });
System.out.println(boom.exceptionally(e -> 0).join());                     // 0
System.out.println(boom.handle((v, e) -> e == null ? v : -1).join());      // -1
System.out.println(boom.whenComplete((v, e) -> System.out.println("saw " + e.getCause().getMessage()))
        .isCompletedExceptionally());                                       // saw boom ... true` },
      { title: 'Bridging a callback API', html: `<p>Old libraries call you back with ${C('onSuccess/onError')}. Create a ${C('CompletableFuture')}, complete it from the callback, and return it — now callers can chain.</p>`, code: `
interface Callback { void onSuccess(String body); void onError(Exception e); }

class LegacyHttp {
    void get(String url, Callback cb) { cb.onSuccess("<html>" + url); }   // pretend async

    CompletableFuture<String> getAsync(String url) {
        CompletableFuture<String> cf = new CompletableFuture<>();
        get(url, new Callback() {
            public void onSuccess(String body) { cf.complete(body); }
            public void onError(Exception e) { cf.completeExceptionally(e); }
        });
        return cf;
    }
}` },
      { title: 'anyOf for hedged requests', html: `<p>Send the same read to two replicas; use whichever answers first. ${C('anyOf')} returns ${C('CompletableFuture<Object>')} — cast the result. Careful: if the fastest one <b>fails</b>, anyOf fails too (unlike ${C('invokeAny')}), so attach ${C('exceptionally')} fallbacks or filter failures yourself.</p>`, code: `
CompletableFuture<String> a = CompletableFuture.supplyAsync(() -> "replica-A");
CompletableFuture<String> b = CompletableFuture.supplyAsync(() -> "replica-B");
String first = (String) CompletableFuture.anyOf(a, b).join();
System.out.println(first);` }
    ],
    deepDive: `<p><b>Internals:</b> a CompletableFuture has a ${C('volatile Object result')} (null = incomplete; a value, a NIL marker for null, or an ${C('AltResult')} wrapping an exception) and a lock-free <b>Treiber stack of dependent Completions</b>. ${C('thenApply')} on an incomplete future pushes a ${C('UniApply')} node; ${C('complete()')} CASes the result and then pops and fires dependents (${C('postComplete')}), iteratively to avoid stack overflow on long chains. If the future is already complete when you call ${C('thenApply')}, the function runs <b>immediately on the calling thread</b> — a frequent surprise when someone expects it to be async.</p>
<p><b>Which thread runs my callback?</b> Non-async stages run on the thread that completes the previous stage (could be a pool thread, an HTTP client's selector thread, or your main thread). If that callback blocks, you block that thread — in Netty-style event loops this is disastrous. Rule: blocking or heavy callbacks → ${C('*Async(fn, executor)')}.</p>
<p><b>Common pool starvation:</b> ${C('commonPool')} has (cores − 1) threads. If you run blocking HTTP calls on it with ${C('supplyAsync(supplier)')}, a few slow calls occupy all threads, and unrelated parallel streams and CompletableFutures in the same JVM stall. Also, in containers with 1-2 CPUs the common pool can be just 1 thread (or, when parallelism is 1, it spawns a new thread per task). Always pass an executor for I/O.</p>
<p><b>Cancellation:</b> ${C('cf.cancel(true)')} completes the future with CancellationException but does <b>not</b> interrupt the running task (the CF has no reference to the thread). For real cancellation, keep the underlying Future or use structured concurrency / virtual threads.</p>
<p><b>Java 21+ perspective:</b> with virtual threads, plain blocking code (${C('var u = fetchUser(); var t = fetchCart(u);')}) is cheap again and far easier to debug (real stack traces). CompletableFuture remains great for fan-out/fan-in and composing libraries that already return futures; structured concurrency (${C('StructuredTaskScope')}, a preview API since Java 21 that is still being refined in Java 25) adds scoped cancellation and error propagation for the same use cases.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes long, plausible CompletableFuture chains quickly — and they are notoriously hard to review: wrong thread pools, swallowed exceptions, nested futures, a stray ${C('join()')} in the middle that serialises everything. <b>Use AI as a partner:</b> ask it to "<i>annotate each stage with the thread it runs on and what happens on failure</i>", or to rewrite the chain in virtual-thread style and compare readability. Ask for a test that injects failures and delays at each stage. <b>Where AI goes wrong:</b> ${C('supplyAsync')} without an executor for blocking I/O, ${C('thenApply')} where ${C('thenCompose')} is needed, believing ${C('orTimeout')} or ${C('cancel')} stops the work, and ${C('allOf(...).join()')} followed by ignoring individual failures. <b>What you must still own:</b> the latency budget (which calls are on the critical path), the fallback semantics (is a missing discount acceptable? a missing price is not), and the choice between async composition and simple blocking code on virtual threads.</p>`,
    problems: [{
      title: 'Best Price Aggregator with Per-Vendor Timeouts',
      level: 'Hard', tags: ['CompletableFuture', 'timeouts', 'fan-out'], companies: ['Booking.com', 'Expedia', 'Amazon', 'Skyscanner'],
      statement: `<p>Implement ${C('Optional<Double> bestPrice(List<Vendor> vendors, long timeoutMs, Executor ex)')}. Query all vendors <b>in parallel</b>. A vendor that fails or does not answer within ${C('timeoutMs')} is ignored. Return the lowest price among the successful answers, or empty if none answered. The total time must be ≈ timeoutMs at most, regardless of how many vendors there are.</p>`,
      constraints: `1 ≤ vendors ≤ 50; each vendor call takes 10 ms - 10 s and may throw.`,
      example: `<p>Vendors A: 120 ms → 499.0, B: throws, C: 3 s (too slow), D: 80 ms → 520.0, timeout 500 ms → ${H.c('g', 'Optional[499.0]')} after ~500 ms: B is ignored (failed), C is ignored (still running when the 500 ms window closes), and min(499, 520) = 499.</p>`,
      brute: { why: `<p>Calling vendors one by one: total time = sum of latencies (could be 50 × 10 s). Even a parallel version that calls ${C('get()')} without a timeout waits for the <b>slowest</b> vendor, and one exception aborts the whole result.</p>`, code: `
interface Vendor { double quote() throws Exception; }

static Optional<Double> bestPriceSequential(List<Vendor> vendors) {
    double best = Double.MAX_VALUE;
    boolean any = false;
    for (Vendor v : vendors) {
        try { best = Math.min(best, v.quote()); any = true; }  // waits for each in turn
        catch (Exception e) { /* skip failing vendor */ }
    }
    return any ? Optional.of(best) : Optional.empty();
}` },
      mcq: { q: 'You want each vendor\'s failure or slowness to be ignored individually. Where do you attach completeOnTimeout/exceptionally?', options: ['On the allOf(...) future', 'On each vendor\'s future before allOf', 'On the final thenApply', 'Nowhere — allOf ignores failures'], answer: 1, explain: 'allOf fails if any input fails, and a timeout on allOf would discard everyone. Making each vendor future "always succeed" (with an empty marker on failure/timeout) lets allOf complete and keeps all good answers.' },
      hints: [`<p>Hint 1: turn every vendor call into a future that <b>never fails</b>: success → ${C('Optional.of(price)')}, failure or timeout → ${C('Optional.empty()')}.</p>`, `<p>Hint 2: ${C('supplyAsync(() -> quote(v), ex).thenApply(Optional::of).exceptionally(e -> Optional.empty()).completeOnTimeout(Optional.empty(), timeoutMs, MILLISECONDS)')}. Checked exceptions inside the supplier must be wrapped (CompletionException).</p>`, `<p>Hint 3: ${C('allOf(...).join()')} then stream the futures, ${C('join()')} each (already complete), flatMap the Optionals, take ${C('min')}. Edge: empty list → Optional.empty().</p>`],
      tests: { sig: 'string[] int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] spec, int timeoutMs) {
    int threads = Math.max(1, spec.length);
    ExecutorService ex = Executors.newFixedThreadPool(threads);
    CountDownLatch never = new CountDownLatch(1);
    List<BestPrice.Vendor> vs = new ArrayList<>();
    for (String s : spec) {
      if (s.startsWith("ok:")) { double p = Double.parseDouble(s.substring(3)); vs.add(() -> p); }
      else if (s.equals("fail")) vs.add(() -> { throw new java.io.IOException("down"); });
      else vs.add(() -> { never.await(); return 1.0; });
    }
    long t0 = System.nanoTime();
    try {
      String r = String.valueOf(BestPrice.bestPrice(vs, timeoutMs, ex));
      long ms = (System.nanoTime() - t0) / 1_000_000;
      return new String[]{ r, String.valueOf(ms < 5000) };
    } finally { ex.shutdownNow(); }
  }
}` }, cases: [
          [[['ok:499.0', 'fail', 'block', 'ok:520.0'], 300], ['Optional[499.0]', 'true']],
          [[['fail', 'fail'], 5000], ['Optional.empty', 'true']],
          [[['block'], 200], ['Optional.empty', 'true']],
          [[['ok:7.5'], 5000], ['Optional[7.5]', 'true']],
          [[['ok:3.0', 'ok:3.0'], 5000], ['Optional[3.0]', 'true']],
          [[['ok:-1.5', 'ok:0.0', 'ok:2.0'], 5000], ['Optional[-1.5]', 'true']],
          [[[], 100], ['Optional.empty', 'true']],
          [[{ $concat: [{ $rep: 'block', n: 50 }, ['ok:7.0']] }, 300], ['Optional[7.0]', 'true']],
          [[{ $rep: 'block', n: 50 }, 300], ['Optional.empty', 'true']]
        ] },
      solution: {
        approach: `<p>Fan out one CompletableFuture per vendor on a dedicated executor. Normalise each into ${C('Optional<Double>')} with ${C('exceptionally')} (failures) and ${C('completeOnTimeout')} (slowness), so every future completes within timeoutMs. Fan in with ${C('allOf')}, then pick the minimum present value. Late answers are ignored; the underlying calls may continue in the background (bound the executor so they cannot pile up).</p>`,
        code: `
public class BestPrice {
    interface Vendor { double quote() throws Exception; }

    static Optional<Double> bestPrice(List<Vendor> vendors, long timeoutMs, Executor ex) {
        List<CompletableFuture<Optional<Double>>> cfs = new ArrayList<>();
        for (Vendor v : vendors) {
            CompletableFuture<Optional<Double>> cf = CompletableFuture
                    .supplyAsync(() -> {
                        try { return v.quote(); }
                        catch (Exception e) { throw new CompletionException(e); }  // wrap checked
                    }, ex)
                    .thenApply(Optional::of)
                    .exceptionally(e -> Optional.empty())                         // failed vendor
                    .completeOnTimeout(Optional.empty(), timeoutMs, TimeUnit.MILLISECONDS); // slow vendor
            cfs.add(cf);
        }
        CompletableFuture.allOf(cfs.toArray(new CompletableFuture[0])).join();   // <= ~timeoutMs
        return cfs.stream()
                .map(CompletableFuture::join)        // all complete: no blocking
                .flatMap(Optional::stream)
                .min(Double::compare);
    }

    static Vendor slow(long ms, double price) {
        return () -> { Thread.sleep(ms); return price; };
    }

    public static void main(String[] args) {
        ExecutorService ex = Executors.newFixedThreadPool(8);
        List<Vendor> vs = List.of(slow(120, 499.0), () -> { throw new IOException("down"); }, slow(3000, 450.0), slow(80, 520.0));
        System.out.println(bestPrice(vs, 500, ex));  // Optional[499.0]
        ex.shutdownNow();                            // interrupts the 3 s vendor
    }
}`,
        dry: { head: ['vendor', 'outcome', 'normalised value', 'completes at'], rows: [['A', '499.0 after 120 ms', 'Optional[499.0]', '120 ms'], ['B', 'IOException', 'Optional.empty (exceptionally)', '~0 ms'], ['C', 'needs 3000 ms', 'Optional.empty (completeOnTimeout)', '500 ms'], ['D', '520.0 after 80 ms', 'Optional[520.0]', '80 ms'], ['allOf → min', '', H.c('g', 'min(499, 520) = 499.0'), '500 ms']] },
        complexity: `<p>Wall time ≤ timeoutMs (+ scheduling noise) regardless of vendor count, as long as the executor has a thread per concurrent vendor call (or use virtual threads). Work O(V), memory O(V).</p>`,
        followUps: ['Return early as soon as K vendors answered', 'Cancel/interrupt slow vendor calls instead of letting them run', 'Rewrite with virtual threads and StructuredTaskScope-like semantics']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Virtual Threads (Java 21)
     ====================================================================== */
  function vtSim(carriers, n, pinned, record) {
    var phase = [], ioUntil = [], ready = [], parked = [], car = [], rows = [], frames = [], t = 0, done = 0;
    for (var i = 0; i < n; i++) { phase.push(0); ioUntil.push(-1); ready.push(i); }
    for (var c = 0; c < carriers; c++) { car.push(null); rows.push([]); }
    var name = function (i) { return 'V' + (i + 1); };
    while (done < n && t < 40) {
      var woke = [];
      for (var p = parked.length - 1; p >= 0; p--) if (ioUntil[parked[p]] === t) { woke.push(parked[p]); parked.splice(p, 1); }
      woke.reverse().forEach(function (v) { ready.push(v); });
      var events = [];
      for (c = 0; c < carriers; c++) {
        var cell = '·';
        if (car[c] && car[c].mode === 'pin') {
          cell = name(car[c].v) + ' pinned';
          car[c].left--;
          if (car[c].left === 0) { car[c].mode = 'cont'; phase[car[c].v] = 2; }
          events.push(name(car[c].v) + ' blocks on I/O <b>inside synchronized</b> → stays <span class="c-r">pinned</span> to carrier C' + (c + 1) + ' (carrier wasted)');
        } else {
          var v = -1;
          if (car[c] && car[c].mode === 'cont') { v = car[c].v; car[c] = null; }
          else if (ready.length) v = ready.shift();
          if (v >= 0) {
            cell = name(v) + (phase[v] === 0 ? ' cpu' : ' cpu2');
            if (phase[v] === 0) {
              phase[v] = 1;
              if (pinned.indexOf(v) >= 0) { car[c] = { v: v, mode: 'pin', left: 2 }; events.push(name(v) + ' runs on C' + (c + 1) + ', then starts a blocking call while holding a monitor'); }
              else { ioUntil[v] = t + 3; parked.push(v); events.push(name(v) + ' runs on C' + (c + 1) + ', then calls blocking I/O → <span class="c-g">unmounts</span> (its stack is saved to the heap) and C' + (c + 1) + ' is free'); }
            } else { phase[v] = 3; done++; events.push(name(v) + ' finishes its last bit of CPU on C' + (c + 1) + ' and ends'); }
          }
        }
        rows[c].push(cell);
      }
      if (record) {
        var gh = {};
        rows.forEach(function (r, ci) { var x = r[r.length - 1]; if (/pinned/.test(x)) gh[ci + ',' + t] = 'bad'; else if (x !== '·') gh[ci + ',' + t] = 'ok'; });
        var cols = []; for (var k = 0; k <= t; k++) cols.push('t' + k);
        frames.push({ narr: '<b>Tick ' + t + '</b>: ' + (woke.length ? 'I/O finished for ' + woke.map(name).join(', ') + ' → back in the run queue. ' : '') + (events.length ? events.join('; ') + '.' : 'All carriers idle — every virtual thread is waiting on I/O.'), parts: [
          { type: 'grid', label: 'Carrier (platform) threads over time', rowHead: rows.map(function (r, ci) { return 'C' + (ci + 1); }), colHead: cols, rows: rows.map(function (r) { return r.slice(); }), hl: gh },
          { type: 'queue', label: 'Scheduler run queue (ForkJoinPool)', items: ready.map(name), frontLabel: 'next to mount', backLabel: 'last' },
          { type: 'set', label: 'Parked: waiting for I/O, NOT using a carrier', items: parked.map(name) },
          { type: 'vars', label: 'Progress', vals: { tick: t, finished: done + '/' + n, pinned: pinned.map(name).join(', ') || 'none' }, hl: {} }
        ] });
      }
      t++;
    }
    return { ticks: t, frames: frames };
  }

  topics.push({
    title: 'Virtual Threads (Java 21): Millions of Cheap Threads for Blocking I/O',
    analogy: `<p>A restaurant with <b>4 waiters</b> (carrier threads) and <b>200 tables</b> (virtual threads). In the old model each table had its <b>own dedicated waiter</b> who stood next to it doing nothing while the guests read the menu — you could only serve as many tables as you had waiters. With virtual threads, a waiter takes an order, hands it to the kitchen, and while the food is cooking (blocking I/O) he <b>walks away to serve other tables</b>. When the food is ready, <i>any</i> free waiter brings it. Each table still has its own simple story ("order → wait → eat"), but 4 waiters can handle hundreds of tables. <b>Pinning</b> is a waiter who is handcuffed to a table while the kitchen cooks.</p>`,
    explain: `<p><b>Plain idea:</b> a classic Java thread (<b>platform thread</b>) is a thin wrapper around an OS thread: ~1 MB stack reserved, expensive to create, and a few thousand of them make the OS struggle. A <b>virtual thread</b> (Java 21, JEP 444) is a ${C('java.lang.Thread')} managed by the <b>JVM</b>: it costs a few hundred bytes to a few KB, you can create <b>millions</b>, and when it blocks on I/O it gives its OS thread back.</p>
<h4>How it works</h4>
<ul>
<li>The JVM runs virtual threads on a small pool of platform threads called <b>carriers</b> (a ForkJoinPool, by default one per CPU core).</li>
<li>Running a virtual thread = <b>mounting</b> it on a carrier. When it calls a blocking operation (socket read, ${C('sleep')}, ${C('BlockingQueue.take')}, ${C('lock.lock()')}…), the JDK <b>unmounts</b> it: its stack frames are copied to the heap and the carrier picks up another virtual thread.</li>
<li>When the I/O completes, the virtual thread is scheduled again, possibly on a <b>different</b> carrier.</li>
</ul>
<h4>Creating them</h4>
${P(`
Thread.startVirtualThread(() -> handle(req));                  // fire one
Thread vt = Thread.ofVirtual().name("worker-", 0).start(task); // builder with naming
try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {   // most common
    ex.submit(() -> handle(req));                               // one NEW virtual thread per task
}`)}
<h4>Platform vs virtual</h4>
${H.table(['', 'Platform thread', 'Virtual thread'], [
  ['Backed by', 'one OS thread for its whole life', 'borrowed carrier only while running'],
  ['Memory', '~1 MB stack reserved (configurable)', 'grows/shrinks on the heap (hundreds of bytes+)'],
  ['Creation', 'tens of microseconds, syscalls', '~1 microsecond, plain object'],
  ['How many', 'thousands', H.c('g', 'millions')],
  ['Pool them?', 'yes', H.c('r', 'never — create one per task')],
  ['Daemon / priority', 'configurable', 'always daemon, priority ignored'],
  ['Good for', 'CPU-bound work, long-lived workers', 'blocking I/O, thread-per-request servers']
])}
<h4>The rules of thumb</h4>
<ol>
<li><b>They make waiting cheap, not computing faster.</b> CPU-bound work gains nothing — still limited by cores.</li>
<li><b>Don't pool them.</b> Pools exist because threads were expensive; virtual threads are not. To limit concurrency to a fragile downstream (e.g. max 50 DB connections), use a <b>Semaphore</b>.</li>
<li><b>Pinning:</b> in Java 21-23, blocking <b>inside a synchronized block</b> (or in native code) keeps the virtual thread stuck to its carrier. Java 24 (JEP 491) fixed synchronized pinning; on 21 prefer ${C('ReentrantLock')} around blocking calls. Detect with the JFR event ${C('jdk.VirtualThreadPinned')}.</li>
<li><b>Careful with ThreadLocal caches.</b> A million virtual threads × a 1 MB ThreadLocal buffer = trouble. Prefer passing values or ${C('ScopedValue')}.</li>
<li><b>Simple blocking code is back.</b> Instead of callback/reactive chains, write ${C('var user = fetchUser(); var cart = fetchCart(user);')} — readable, debuggable, with real stack traces — and get reactive-level scalability for I/O.</li>
</ol>`,
    clues: ['"handle 100k concurrent connections / requests" with blocking calls → virtual threads', '"thread-per-request but threads are too expensive" → newVirtualThreadPerTaskExecutor', '"replace reactive/callback code with simple blocking code" → virtual threads', '"limit concurrent calls to a downstream" with virtual threads → Semaphore, not a pool', '"throughput did not improve after switching" → CPU-bound work or pinning', '"synchronized + blocking I/O on Java 21" → pinning → ReentrantLock / upgrade to 24+', '"Java 21 new concurrency features" → virtual threads, structured concurrency (preview), scoped values'],
    code: [`
public class VirtualDemo {
    static String fetch(int id) {
        try {
            Thread.sleep(100);                  // blocking "I/O": the virtual thread unmounts here
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return "resp-" + id;
    }

    public static void main(String[] args) throws Exception {
        long t0 = System.currentTimeMillis();
        List<Future<String>> results = new ArrayList<>();
        try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 10_000; i++) {
                final int id = i;
                results.add(ex.submit(() -> fetch(id)));   // 10,000 threads, each sleeps 100 ms
            }
        }                                                   // close() waits for all
        System.out.println(results.get(9_999).get());       // resp-9999
        System.out.println("elapsed ~" + (System.currentTimeMillis() - t0) + " ms"); // well under a second, not 1000 s

        Thread vt = Thread.ofVirtual().name("demo-vt").start(() ->
                System.out.println(Thread.currentThread() + " virtual? " + Thread.currentThread().isVirtual()));
        vt.join();
    }
}`, `
// Limiting downstream concurrency: Semaphore, not a pool
class InventoryGateway {
    private final Semaphore dbPermits = new Semaphore(50);   // DB pool has 50 connections

    String lookup(String sku) throws InterruptedException {
        dbPermits.acquire();                                 // virtual thread parks cheaply if 50 are busy
        try {
            Thread.sleep(20);                                // the JDBC call
            return sku + " -> 7 units";
        } finally {
            dbPermits.release();
        }
    }
}`, `
// Avoid pinning on Java 21-23: use ReentrantLock around blocking calls instead of synchronized
class TokenCache {
    private final ReentrantLock lock = new ReentrantLock();
    private String token;

    String token() throws InterruptedException {
        lock.lock();                 // a virtual thread waiting here unmounts (no pinning)
        try {
            if (token == null) {
                Thread.sleep(50);    // blocking refresh call - fine under ReentrantLock
                token = "tok-" + System.nanoTime();
            }
            return token;
        } finally {
            lock.unlock();
        }
    }
}`],
    codeTitle: ['10,000 blocking tasks on virtual threads', 'Semaphore to protect a downstream', 'ReentrantLock instead of synchronized (Java 21 pinning)'],
    viz: {
      title: 'Virtual threads hopping across carriers (with optional pinning)',
      input: '2 6 V1',
      inputLabel: 'carriers virtualThreads [pinned ones, e.g. V3 V4]  — each VT: 1 tick CPU, 2 ticks I/O, 1 tick CPU',
      gen: function (input) {
        var m = String(input).match(/\d+|V\d+/gi);
        if (!m || m.length < 2 || /^V/i.test(m[0]) || /^V/i.test(m[1])) throw new Error('Format: carriers virtualThreads [pinned…], e.g. 2 5 V3');
        var carriers = +m[0], n = +m[1];
        if (carriers < 1 || carriers > 4 || n < 1 || n > 8) throw new Error('carriers 1..4, virtual threads 1..8');
        var pinned = m.slice(2).map(function (x) { return parseInt(String(x).replace(/v/i, ''), 10) - 1; }).filter(function (x) { return x >= 0 && x < n; });
        var run = vtSim(carriers, n, pinned, true), frames = [];
        frames.push({ narr: n + ' virtual threads, ' + carriers + ' carrier (platform) thread(s). Each virtual thread does: 1 tick of CPU → a blocking I/O call lasting 2 ticks → 1 more tick of CPU. ' + (pinned.length ? 'Pinned (blocks while holding a monitor on Java 21): ' + pinned.map(function (i) { return 'V' + (i + 1); }).join(', ') + '.' : 'No pinning.'), parts: [
          { type: 'queue', label: 'Scheduler run queue', items: (function () { var a = []; for (var i = 1; i <= n; i++) a.push('V' + i); return a; })(), frontLabel: 'next', backLabel: 'last' },
          { type: 'vars', label: 'Setup', vals: { carriers: carriers, virtualThreads: n, cpuTicksPerVT: 2, ioTicksPerVT: 2 }, hl: {} }
        ] });
        run.frames.forEach(function (f) { frames.push(f); });
        var plain = vtSim(carriers, n, [], false).ticks, platform = Math.ceil(n / carriers) * 4;
        frames.push({ narr: 'Finished in <b>' + run.ticks + ' ticks</b>. ' + (pinned.length ? 'Without pinning it would take ' + plain + ' ticks — pinned threads hold a carrier while doing nothing. ' : '') + 'With ' + carriers + ' classic platform threads that block during I/O, it would take about ' + platform + ' ticks (each thread holds its OS thread for all 4 ticks). The win comes entirely from <b>not wasting carriers while waiting</b>.', parts: [
          { type: 'bars', label: 'Total ticks to finish', values: [run.ticks, plain, platform], idxLabels: [pinned.length ? 'virtual + pinning' : 'virtual (this run)', 'virtual, no pinning', 'platform threads'], hl: { 0: 'cur', 1: 'ok', 2: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'The math of thread-per-request', html: `<p>A service handles requests that spend 200 ms waiting on a database and 2 ms computing. Target: 10,000 requests/s. Little's law: concurrent requests = 10,000 × 0.202 s ≈ <b>2,020</b> in flight. With platform threads you need ~2,000 threads (≈ 2 GB of reserved stacks, heavy scheduling). With virtual threads: 2,020 cheap objects on, say, 8 carriers, and CPU usage is only 10,000 × 2 ms = 20 core-seconds per second... which means you actually need ~20 cores — virtual threads remove the <b>thread</b> limit, not the <b>CPU</b> limit.</p>` },
      { title: 'Spring Boot / Tomcat switch', html: `<p>Since Spring Boot 3.2, setting ${C('spring.threads.virtual.enabled=true')} makes Tomcat run each request on a virtual thread. Typical result for I/O-heavy services: much higher concurrency at the same memory. Gotchas seen in production: connection pools now become the bottleneck (thousands of virtual threads queue for 20 DB connections), and libraries using ${C('synchronized')} around I/O pin carriers on Java 21.</p>`, code: { lang: 'yaml', code: `spring:\n  threads:\n    virtual:\n      enabled: true\n  datasource:\n    hikari:\n      maximum-pool-size: 50   # now the real concurrency limit` } },
      { title: 'Virtual threads are always daemon', html: `<p>A program that starts only virtual threads and then returns from ${C('main')} <b>exits immediately</b>, killing them — virtual threads never keep the JVM alive. Always ${C('join()')} them or use the try-with-resources executor, which waits in ${C('close()')}.</p>`, code: `
Thread vt = Thread.startVirtualThread(() -> System.out.println("hello from " + Thread.currentThread()));
System.out.println("daemon? " + vt.isDaemon());   // true
vt.join();                                         // without this, the line above may never print` },
      { title: 'Structured concurrency (preview) — the idea', html: `<p>In Java 21+ preview, ${C('StructuredTaskScope')} treats a group of subtasks as one unit: fork two calls, join both, and if one fails the other is <b>cancelled automatically</b>; the scope cannot outlive its block, so no thread leaks. It needs ${C('--enable-preview')} and its API has changed between releases, so here is the shape in pseudo-Java:</p>${P(`
try (var scope = StructuredTaskScope.open()) {        // shape of the newer preview API
    var user  = scope.fork(() -> findUser(id));
    var order = scope.fork(() -> fetchOrder(id));
    scope.join();                                     // waits; failure cancels siblings
    return new Response(user.get(), order.get());
}`)}<p>Today, in stable Java, the same "all or nothing" behaviour is built with an executor plus ${C('invokeAll')} or CompletableFuture with explicit cancellation.</p>` }
    ],
    deepDive: `<p><b>Under the hood:</b> a virtual thread is a ${C('Continuation')} (a resumable stack) plus a scheduler. Blocking JDK APIs were rewritten to check ${C('Thread.currentThread().isVirtual()')} and, instead of blocking the OS thread, register interest (e.g. with an internal poller using epoll/kqueue for sockets) and ${C('yield')} the continuation. The frames are copied lazily to heap "stack chunk" objects, so a deep but idle virtual thread costs heap, collected by the GC like any object. Scheduler: a FIFO ${C('ForkJoinPool')} with parallelism = cores (${C('-Djdk.virtualThreadScheduler.parallelism')}), able to grow temporarily (up to ${C('maxPoolSize')}, default 256) to compensate when carriers are pinned or blocked in ${C('Object.wait')} / file I/O.</p>
<p><b>Pinning in detail:</b> a virtual thread cannot unmount when (a) it is inside a ${C('synchronized')} block/method on Java 21-23, because the monitor was owned by the carrier's OS thread identity, or (b) it is running native code / a foreign function. JEP 491 (Java 24) reworked monitors so virtual threads can unmount while holding or waiting for a monitor. File I/O on most OSes also cannot be made async, so the JDK temporarily compensates by adding a carrier. Diagnose with JFR (${C('jdk.VirtualThreadPinned')} events with stack traces) and thread dumps via ${C('jcmd <pid> Thread.dump_to_file -format=json')} (which include virtual threads; classic jstack does not list them all).</p>
<p><b>What does not change:</b> the Java Memory Model, synchronized semantics, locks, atomics, and every concurrency bug you learned about. A data race on a virtual thread is still a data race; deadlock is still deadlock. What changes is <b>capacity planning</b>: the limit moves from "threads" to real resources — DB connections, downstream rate limits, memory per in-flight request, CPU. Bound those explicitly (semaphores, pool sizes, bounded queues) or a million cheap threads will cheerfully stampede a database.</p>
<p><b>When to stay with platform threads / pools:</b> CPU-bound parallel work (use ForkJoinPool or a fixed pool sized to cores), tasks that need thread priorities, code relying heavily on large ThreadLocal caches, or libraries that block in native code. Reactive frameworks remain useful for streaming back-pressure semantics, but for request/response services virtual threads have largely replaced them as the default recommendation.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants trained on pre-2023 code still recommend tuning ${C('newFixedThreadPool(200)')} for I/O or reaching for reactive libraries, and newer ones sometimes over-correct: "just use virtual threads everywhere", including CPU-bound loops. <b>Use AI as a partner:</b> ask it to scan a codebase for ${C('synchronized')} blocks that contain I/O (pinning candidates on Java 21), for ThreadLocal caches, and for pooled executors that could become ${C('newVirtualThreadPerTaskExecutor()')}; then ask it to list every downstream resource that now needs an explicit limit. <b>Where AI goes wrong:</b> pooling virtual threads, claiming they make computation faster, mixing up preview APIs (StructuredTaskScope's API changed across releases — always check the JDK version), and assuming jstack shows all virtual threads. <b>What you must still own:</b> capacity planning, load testing with realistic downstream limits, reading JFR pinning events, and deciding which Java version's semantics you are running on.</p>`,
    problems: [{
      title: 'Fetch 10,000 Pages Concurrently, at Most 100 at a Time',
      level: 'Medium', tags: ['virtual threads', 'Semaphore', 'thread-per-task'], companies: ['Oracle', 'Netflix', 'Salesforce'],
      statement: `<p>Implement ${C('Map<Integer, String> fetchAll(int n, int maxConcurrent)')} that "downloads" pages ${C('0..n-1')} (simulate each with ${C('Thread.sleep(50)')} and the string ${C('"page-" + id')}). Use one <b>virtual thread per page</b>, but never more than ${C('maxConcurrent')} downloads in flight (the website rate-limits connections). Return all results.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 1 ≤ maxConcurrent ≤ 1000. Total time should be ≈ ⌈n / maxConcurrent⌉ × 50 ms.`,
      example: `<p>n = 10,000, maxConcurrent = 100 → 100 waves of 50 ms ≈ ${H.c('g', '5 seconds')}. A fixed pool of 8 platform threads would need 10,000 × 50 / 8 ≈ ${H.c('r', '62 seconds')}.</p>`,
      brute: { why: `<p>A fixed pool of 8 platform threads limits concurrency to 8: threads spend 99% of their time sleeping in I/O, so throughput is tiny. Raising the pool to 10,000 platform threads would hit OS limits and burn memory. (And a pool of virtual threads is an anti-pattern.)</p>`, code: `
static Map<Integer, String> fetchAllPool(int n) throws InterruptedException {
    Map<Integer, String> out = new ConcurrentHashMap<>();
    ExecutorService pool = Executors.newFixedThreadPool(8);     // only 8 in flight
    for (int i = 0; i < n; i++) {
        final int id = i;
        pool.execute(() -> {
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            out.put(id, "page-" + id);
        });
    }
    pool.shutdown();
    pool.awaitTermination(10, TimeUnit.MINUTES);
    return out;
}` },
      mcq: { q: 'With virtual threads, what is the right way to keep only 100 downloads in flight?', options: ['newFixedThreadPool(100) of virtual threads', 'A Semaphore(100) acquired around the download', 'Set the carrier pool size to 100', 'Thread.yield() after each download'], answer: 1, explain: 'Virtual threads should not be pooled. Create one per task and guard the scarce resource with a Semaphore; waiting virtual threads park cheaply.' },
      hints: [`<p>Hint 1: create the executor with ${C('Executors.newVirtualThreadPerTaskExecutor()')} in try-with-resources — ${C('close()')} waits for all tasks.</p>`, `<p>Hint 2: a ${C('Semaphore(maxConcurrent)')} shared by all tasks: ${C('acquire()')} before the sleep, ${C('release()')} in finally.</p>`, `<p>Hint 3: store results in a ${C('ConcurrentHashMap')}. Restore the interrupt flag on InterruptedException. Recipe: map + semaphore → for each id submit(acquire, fetch, put, release) → close → return map.</p>`],
      tests: { sig: 'int int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(int n, int max) {
    long t0 = System.nanoTime();
    Map<Integer, String> m = Crawler.fetchAll(n, max);
    long ms = (System.nanoTime() - t0) / 1_000_000;
    long waves = (n + max - 1) / max;
    boolean allThere = m.size() == n;
    for (int i = 0; allThere && i < n; i += Math.max(1, n / 1000)) allThere = ("page-" + i).equals(m.get(i));
    return new String[]{ String.valueOf(m.size()), String.valueOf(allThere), String.valueOf(n > 0 ? m.get(n - 1) : "none"), String.valueOf(ms >= waves * 50 - 5) };
  }
}` }, cases: [
          [[1, 1], ['1', 'true', 'page-0', 'true']],
          [[10, 3], ['10', 'true', 'page-9', 'true']],
          [[5, 1000], ['5', 'true', 'page-4', 'true']],
          [[100, 100], ['100', 'true', 'page-99', 'true']],
          [[101, 100], ['101', 'true', 'page-100', 'true']],
          [[2000, 100], ['2000', 'true', 'page-1999', 'true']],
          [[100000, 1000], ['100000', 'true', 'page-99999', 'true']]
        ] },
      solution: {
        approach: `<p>Thread-per-task with virtual threads gives n cheap threads; the Semaphore models the real limit (connections). Tasks beyond the limit park in ${C('acquire()')} without holding a carrier. The executor's ${C('close()')} provides both waiting and the happens-before edge so the map is complete and visible afterwards.</p>`,
        code: `
public class Crawler {
    static Map<Integer, String> fetchAll(int n, int maxConcurrent) {
        Map<Integer, String> out = new ConcurrentHashMap<>();
        Semaphore permits = new Semaphore(maxConcurrent);
        try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < n; i++) {
                final int id = i;
                ex.submit(() -> {
                    try {
                        permits.acquire();                  // parks cheaply if 100 are in flight
                        try {
                            Thread.sleep(50);               // the download (blocking I/O)
                            out.put(id, "page-" + id);
                        } finally {
                            permits.release();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return null;                            // Callable: lets us throw checked exceptions too
                });
            }
        }                                                   // waits for every virtual thread
        return out;
    }

    public static void main(String[] args) {
        long t0 = System.currentTimeMillis();
        Map<Integer, String> pages = fetchAll(2_000, 100);
        System.out.println(pages.size() + " pages, page 1999 = " + pages.get(1999));
        System.out.println("~" + (System.currentTimeMillis() - t0) + " ms (about 20 waves x 50 ms)");
    }
}`,
        dry: { head: ['time', 'virtual threads alive', 'holding a permit', 'parked in acquire()', 'pages done'], rows: [['0 ms', '2,000', '100', '1,900', '0'], ['50 ms', '1,900', '100', '1,800', '100'], ['100 ms', '1,800', '100', '1,700', '200'], ['…', '…', '100', '…', '…'], ['1,000 ms', '0', '0', '0', H.c('g', '2,000')]] },
        complexity: `<p>Time ≈ ⌈n / maxConcurrent⌉ × 50 ms. Memory O(n) small virtual-thread objects plus results. Carriers stay ≈ #cores the whole time; CPU usage is tiny because the work is waiting.</p>`,
        followUps: ['How would you add a per-request timeout?', 'What changes if the download used a synchronized HTTP client on Java 21?', 'Turn the fixed Semaphore into a requests-per-second limiter']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Run Tasks and Shut the Pool Down Properly',
    level: 'Easy', tags: ['ExecutorService', 'shutdown', 'awaitTermination'], companies: ['TCS', 'Infosys', 'Capgemini', 'Amazon'],
    statement: `<p>Write ${C('int runAll(List<Runnable> tasks, int threads, long timeoutSec)')} that runs every task on a fixed pool, waits up to ${C('timeoutSec')} for them to finish, force-stops whatever is left, and returns the number of tasks that <b>never started</b>. The program must always exit (no lingering threads).</p>`,
    constraints: `1 ≤ tasks ≤ 10<sup>4</sup>, 1 ≤ threads ≤ 64. Tasks respond to interrupts.`,
    example: `<p>5 quick tasks, 2 threads, timeout 5 s → all finish → returns ${H.c('g', '0')}. 100 tasks that each sleep 1 s, 2 threads, timeout 1 s → ~2-4 done, the rest are returned by ${C('shutdownNow()')} → returns ${H.c('y', '~96')}.</p>`,
    brute: { why: `<p>Submitting tasks and returning without ${C('shutdown()')} leaves non-daemon worker threads alive — the JVM never exits. Calling only ${C('shutdownNow()')} immediately interrupts tasks that would have completed fine.</p>`, code: `
static void runAllLeaky(List<Runnable> tasks) {
    ExecutorService pool = Executors.newFixedThreadPool(2);
    tasks.forEach(pool::execute);
    // no shutdown: worker threads wait for more work forever, the JVM never exits
}` },
    mcq: { q: 'What does shutdown() do to tasks already sitting in the queue?', options: ['Discards them', 'Lets them run to completion', 'Interrupts them', 'Returns them as a list'], answer: 1, explain: 'shutdown() only stops new submissions; queued and running tasks complete. shutdownNow() is the one that interrupts and returns the never-started list.' },
    hints: [`<p>Hint 1: the official two-phase pattern from the ExecutorService Javadoc: ${C('shutdown()')}, then ${C('awaitTermination')}, then ${C('shutdownNow()')}.</p>`, `<p>Hint 2: ${C('shutdownNow()')} returns ${C('List<Runnable>')} of tasks that were still queued — its size is your answer.</p>`, `<p>Hint 3: if the current thread is interrupted while awaiting, call ${C('shutdownNow()')} and restore the interrupt flag.</p>`],
    tests: { sig: 'string int int -> int[]', fn: 'chk', harness: { java: `
class Check {
  static int[] chk(String kind, int threads, int timeoutSec) {
    String[] p = kind.split(":");
    int n = Integer.parseInt(p[1]);
    AtomicInteger executed = new AtomicInteger();
    CountDownLatch never = new CountDownLatch(1);
    List<Runnable> tasks = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      if (p[0].equals("quick")) tasks.add(executed::incrementAndGet);
      else tasks.add(() -> { try { never.await(); executed.incrementAndGet(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
    }
    int notStarted = Shutdown.runAll(tasks, threads, timeoutSec);
    return new int[]{ notStarted, executed.get() };
  }
}` }, cases: [
        [['quick:5', 2, 5], [0, 5]],
        [['quick:1', 1, 1], [0, 1]],
        [['quick:10000', 64, 20], [0, 10000]],
        [['block:100', 2, 1], [98, 0]],
        [['block:3', 3, 1], [0, 0]],
        [['block:1', 1, 1], [0, 0]],
        [['block:10', 1, 1], [9, 0]],
        [['block:20', 64, 1], [0, 0]]
      ] },
    solution: {
      approach: `<p>Graceful first, forceful second. Count the never-started tasks from ${C('shutdownNow()')}'s return value.</p>`,
      code: `
public class Shutdown {
    static int runAll(List<Runnable> tasks, int threads, long timeoutSec) {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        tasks.forEach(pool::execute);
        pool.shutdown();                                         // phase 1: no new work
        int neverStarted = 0;
        try {
            if (!pool.awaitTermination(timeoutSec, TimeUnit.SECONDS)) {
                neverStarted = pool.shutdownNow().size();        // phase 2: interrupt + drain queue
                pool.awaitTermination(timeoutSec, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            neverStarted = pool.shutdownNow().size();
            Thread.currentThread().interrupt();
        }
        return neverStarted;
    }

    public static void main(String[] args) {
        List<Runnable> quick = new ArrayList<>();
        for (int i = 0; i < 5; i++) { final int id = i; quick.add(() -> System.out.println("task " + id)); }
        System.out.println("never started: " + runAll(quick, 2, 5));   // 0
    }
}`,
      complexity: `<p>O(T) to submit; waiting time bounded by 2 × timeoutSec.</p>`,
      followUps: ['Java 19+: rewrite with try-with-resources — what does close() do differently?', 'How would you log which tasks were dropped?']
    }
  });

  practice.push({
    title: 'Thread-Safe Hit Counter',
    level: 'Easy', tags: ['AtomicLong', 'LongAdder', 'race condition'], companies: ['Google', 'Dropbox', 'Microsoft'],
    statement: `<p>A web server calls ${C('hit()')} from many request threads and a dashboard calls ${C('total()')}. Implement a correct, fast ${C('HitCounter')}. Then explain why the version using a plain ${C('long')} with ${C('volatile')} is still wrong.</p>`,
    constraints: `Up to 200 threads, 10<sup>6</sup> hits/s; total() is called once per second.`,
    example: `<p>4 threads × 100,000 hits → ${C('total()')} must be exactly ${H.c('g', '400000')}. The volatile version typically prints something like ${H.c('r', '273914')}.</p>`,
    brute: { why: `<p>${C('volatile')} guarantees every thread sees the latest value, but ${C('count++')} is still read-modify-write: two threads read 41, both write 42, one hit is lost. Making the method ${C('synchronized')} is correct but makes all 200 threads queue for one monitor.</p>`, code: `
class VolatileCounter {
    private volatile long count;
    void hit() { count++; }          // NOT atomic: lost updates
    long total() { return count; }
}` },
    mcq: { q: 'Why is LongAdder a better fit than AtomicLong here?', options: ['It is exact while AtomicLong is approximate', 'Writes are very frequent and reads rare; LongAdder spreads writes across cells to avoid CAS contention', 'It uses less memory', 'It is the only one that works with virtual threads'], answer: 1, explain: 'Both are exact for increments. LongAdder trades a more expensive sum() for much cheaper concurrent increments — perfect for write-heavy metrics.' },
    hints: [`<p>Hint 1: the bug is atomicity, not visibility.</p>`, `<p>Hint 2: ${C('AtomicLong.incrementAndGet()')} works; under heavy contention ${C('LongAdder.increment()')} scales better.</p>`, `<p>Hint 3: ${C('sum()')} is not a point-in-time snapshot under concurrent updates — fine for dashboards, not for unique ids.</p>`],
    tests: { sig: 'int int -> long', fn: 'chk', harness: { java: `
class Check {
  static long chk(int threads, int hits) throws Exception {
    HitCounter c = new HitCounter();
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < hits; k++) c.hit(); }); ts[i].start(); }
    for (Thread t : ts) t.join();
    return c.total();
  }
}` }, cases: [
        [[4, 100000], 400000],
        [[1, 1], 1],
        [[0, 5], 0],
        [[8, 0], 0],
        [[200, 5000], 1000000],
        [[64, 100000], 6400000],
        [[2, 1], 2]
      ] },
    solution: {
      approach: `<p>LongAdder: per-thread-ish cells, summed on read. Exact once writers stop; "close enough" while running, which is what a dashboard wants.</p>`,
      code: `
public class HitCounter {
    private final LongAdder hits = new LongAdder();
    void hit() { hits.increment(); }
    long total() { return hits.sum(); }

    public static void main(String[] args) throws InterruptedException {
        HitCounter c = new HitCounter();
        Thread[] ts = new Thread[4];
        for (int i = 0; i < 4; i++) {
            ts[i] = new Thread(() -> { for (int k = 0; k < 100_000; k++) c.hit(); });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        System.out.println(c.total());   // 400000
    }
}`,
      complexity: `<p>hit(): O(1), mostly uncontended. total(): O(#cells) ≤ O(#CPUs).</p>`,
      followUps: ['Count hits in the last 5 minutes only (ring buffer of per-second LongAdders)', 'When would AtomicLong be the right choice?']
    }
  });

  practice.push({
    title: 'Parallel File Line Counts with invokeAll',
    level: 'Easy', tags: ['Callable', 'invokeAll', 'Future'], companies: ['Oracle', 'SAP', 'Walmart'],
    statement: `<p>Given a list of in-memory "files" (${C('List<String>')} contents), return a ${C('List<Integer>')} of line counts <b>in the same order</b>, computing them in parallel with ${C('invokeAll')}. A failing file should produce ${C('-1')} instead of failing everything.</p>`,
    constraints: `1 ≤ files ≤ 1000, each up to 10 MB.`,
    example: `<p>["a\\nb", "x", null] → ${H.c('g', '[2, 1, -1]')} (null content throws NullPointerException inside its task → -1).</p>`,
    brute: { why: `<p>Sequential counting is fine for small inputs but uses one core. Submitting tasks and then collecting results in a <i>completion</i> order would scramble the required ordering.</p>`, code: `
static List<Integer> countSequential(List<String> files) {
    List<Integer> out = new ArrayList<>();
    for (String f : files) out.add(f == null ? -1 : (int) f.lines().count());
    return out;
}` },
    mcq: { q: 'invokeAll returns futures in which order?', options: ['Completion order', 'Same order as the input collection', 'Random', 'Sorted by result'], answer: 1, explain: 'The returned list matches the iteration order of the given task collection, and every future is already done.' },
    hints: [`<p>Hint 1: map each file to a ${C('Callable<Integer>')}.</p>`, `<p>Hint 2: ${C('invokeAll')} blocks until all are done, so ${C('get()')} never waits afterwards.</p>`, `<p>Hint 3: catch ${C('ExecutionException')} per future and add -1.</p>`],
    tests: { sig: 'list<string> -> list<int>', fn: 'count', cases: [
        [[['a\nb', 'x', null]], [2, 1, -1]],
        [[['']], [0]],
        [[['\n']], [1]],
        [[['a\n']], [1]],
        [[['a\n\nb']], [3]],
        [[[null, '']], [-1, 0]],
        [[[null, null]], [-1, -1]],
        [[['a\r\nb\r\nc', 'z']], [3, 1]],
        [[{ $rep: 'x\ny', n: 1000 }], { $rep: 2, n: 1000 }],
        [[[{ $rep: 'a\n', n: 1000000 }, null, 'q']], [1000000, -1, 1]]
      ] },
    solution: {
      approach: `<p>Build tasks, invokeAll, unwrap each future individually so one failure is isolated.</p>`,
      code: `
public class LineCounts {
    static List<Integer> count(List<String> files) throws InterruptedException {
        ExecutorService ex = Executors.newFixedThreadPool(Math.min(8, Math.max(1, files.size())));
        try {
            List<Callable<Integer>> jobs = new ArrayList<>();
            for (String f : files) jobs.add(() -> (int) f.lines().count());   // NPE for null -> captured
            List<Integer> out = new ArrayList<>();
            for (Future<Integer> fu : ex.invokeAll(jobs)) {
                try { out.add(fu.get()); }
                catch (ExecutionException e) { out.add(-1); }
            }
            return out;
        } finally {
            ex.shutdown();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println(count(Arrays.asList("a" + System.lineSeparator() + "b", "x", null))); // [2, 1, -1]
    }
}`,
      complexity: `<p>Work O(total characters), wall time ≈ largest file / per-thread speed when files ≥ threads.</p>`,
      followUps: ['Process results as they finish with ExecutorCompletionService', 'Add an overall deadline using invokeAll(tasks, timeout, unit)']
    }
  });

  practice.push({
    title: 'Print in Order with CountDownLatch',
    level: 'Easy', tags: ['CountDownLatch', 'ordering', 'LeetCode 1114'], companies: ['Microsoft', 'Bloomberg', 'Apple'],
    statement: `<p>Three threads call ${C('first()')}, ${C('second()')} and ${C('third()')} on the same object in <b>any</b> order. Guarantee the output is always "firstsecondthird". Use ${C('CountDownLatch')} (the semaphore version is shown in the lesson).</p>`,
    constraints: `Each method is called exactly once, by different threads.`,
    example: `<p>Thread C calls third() first → it waits. Thread A calls first() → prints "first", opens latch 1. Thread B's second() passes latch 1, prints, opens latch 2 → C proceeds. Output ${H.c('g', 'firstsecondthird')}.</p>`,
    brute: { why: `<p>Busy-waiting on a ${C('volatile int stage')} (${C('while (stage != 2) {}')}) works but burns a whole CPU core per waiting thread. Using a non-volatile flag can loop forever because the change is never seen.</p>`, code: `
class SpinFoo {
    private volatile int stage = 1;
    void first(Runnable p) { p.run(); stage = 2; }
    void second(Runnable p) { while (stage != 2) Thread.onSpinWait(); p.run(); stage = 3; }  // burns CPU
    void third(Runnable p) { while (stage != 3) Thread.onSpinWait(); p.run(); }
}` },
    mcq: { q: 'Which statement about countDown() is true?', options: ['It blocks until count is 0', 'It never blocks and decrementing below 0 has no effect', 'It throws when called twice', 'It resets the latch'], answer: 1, explain: 'countDown never blocks; once at zero, further calls do nothing.' },
    hints: [`<p>Hint 1: two "events": first done, second done → two latches of count 1.</p>`, `<p>Hint 2: second() awaits latch1; third() awaits latch2.</p>`, `<p>Hint 3: the latch also guarantees memory visibility of what happened before countDown.</p>`],
    tests: { sig: 'string int -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String order, int rounds) throws Exception {
    for (int r = 0; r < rounds; r++) {
      PrintInOrder foo = new PrintInOrder();
      StringBuffer sb = new StringBuffer();
      Thread[] ts = new Thread[3];
      for (int i = 0; i < 3; i++) {
        char c = order.charAt(i);
        ts[i] = new Thread(() -> {
          try {
            if (c == 'A') foo.first(() -> sb.append("first"));
            else if (c == 'B') foo.second(() -> sb.append("second"));
            else foo.third(() -> sb.append("third"));
          } catch (InterruptedException e) { }
        });
      }
      for (Thread t : ts) t.start();
      for (Thread t : ts) t.join();
      if (!sb.toString().equals("firstsecondthird")) return "bad:" + sb;
    }
    return "ok";
  }
}` }, cases: [
        [['ABC', 1], 'ok'],
        [['ACB', 1], 'ok'],
        [['BAC', 1], 'ok'],
        [['BCA', 1], 'ok'],
        [['CAB', 1], 'ok'],
        [['CBA', 1], 'ok'],
        [['CBA', 3000], 'ok'],
        [['BCA', 3000], 'ok']
      ] },
    solution: {
      approach: `<p>Two one-shot gates. Parked threads use no CPU.</p>`,
      code: `
public class PrintInOrder {
    private final CountDownLatch firstDone = new CountDownLatch(1);
    private final CountDownLatch secondDone = new CountDownLatch(1);

    void first(Runnable p) { p.run(); firstDone.countDown(); }
    void second(Runnable p) throws InterruptedException { firstDone.await(); p.run(); secondDone.countDown(); }
    void third(Runnable p) throws InterruptedException { secondDone.await(); p.run(); }

    public static void main(String[] args) throws InterruptedException {
        PrintInOrder f = new PrintInOrder();
        Thread c = new Thread(() -> { try { f.third(() -> System.out.print("third")); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        Thread b = new Thread(() -> { try { f.second(() -> System.out.print("second")); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } });
        Thread a = new Thread(() -> f.first(() -> System.out.print("first")));
        c.start(); b.start(); a.start();
        a.join(); b.join(); c.join();
        System.out.println();
    }
}`,
      complexity: `<p>O(1) time and space; waiting threads are parked.</p>`,
      followUps: ['Make it reusable for many rounds (semaphores or a CyclicBarrier)', 'Generalise to N ordered stages']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Odd-Even Printer with Two Semaphores',
    level: 'Medium', tags: ['Semaphore', 'thread signalling', 'turn-taking'], companies: ['Amazon', 'Paytm', 'Zoho', 'Walmart'],
    statement: `<p>Two threads print numbers 1..N together: the "odd" thread prints only odd numbers, the "even" thread only even ones, and the output must be strictly ${C('1 2 3 4 … N')}. Implement it with semaphores and make sure the program terminates for both odd and even N.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>6</sup>.`,
    example: `<p>N = 5 → ${H.c('g', '1 2 3 4 5')}. Odd prints 1 → hands turn to even → even prints 2 → hands back … odd prints 5 and stops; even must also stop (it would otherwise wait forever for its turn at 6).</p>`,
    brute: { why: `<p>${C('synchronized')} + ${C('wait/notify')} with a shared counter works but is easy to get wrong: using ${C('if')} instead of ${C('while')}, or ${C('notify')} waking the wrong thread, or forgetting to notify on exit → a thread waits forever.</p>`, code: `
class WaitNotifyPrinter {
    private int n = 1; private final int max;
    WaitNotifyPrinter(int max) { this.max = max; }
    synchronized void print(boolean odd) throws InterruptedException {
        while (n <= max) {
            while (n <= max && (n % 2 == 1) != odd) wait();   // not my turn
            if (n <= max) { System.out.print(n + " "); n++; }
            notifyAll();
        }
    }
}` },
    mcq: { q: 'What initial permits do the two semaphores need?', options: ['odd = 1, even = 1', 'odd = 1, even = 0', 'odd = 0, even = 0', 'odd = N, even = N'], answer: 1, explain: 'Odd must go first, so it holds the only permit; even starts blocked and gets its permit when odd releases it.' },
    hints: [`<p>Hint 1: a semaphore with 0/1 permits is a "your turn" token passed between threads.</p>`, `<p>Hint 2: odd loop: ${C('oddTurn.acquire(); print(i); evenTurn.release();')} for i = 1, 3, 5 … and symmetric for even.</p>`, `<p>Hint 3: each thread loops over exactly its own numbers, so it ends on its own — no extra wake-up needed.</p>`],
    tests: { io: true, cases: [
        { stdin: '5\n', stdout: '1 2 3 4 5' },
        { stdin: '', stdout: '1 2 3 4 5 6 7 8 9 10' },
        { stdin: '1\n', stdout: '1' },
        { stdin: '2\n', stdout: '1 2' },
        { stdin: '7\n', stdout: '1 2 3 4 5 6 7' },
        { stdin: '12\n', stdout: '1 2 3 4 5 6 7 8 9 10 11 12' },
        { stdin: '1000\n', stdout: '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101 102 103 104 105 106 107 108 109 110 111 112 113 114 115 116 117 118 119 120 121 122 123 124 125 126 127 128 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 146 147 148 149 150 151 152 153 154 155 156 157 158 159 160 161 162 163 164 165 166 167 168 169 170 171 172 173 174 175 176 177 178 179 180 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201 202 203 204 205 206 207 208 209 210 211 212 213 214 215 216 217 218 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246 247 248 249 250 251 252 253 254 255 256 257 258 259 260 261 262 263 264 265 266 267 268 269 270 271 272 273 274 275 276 277 278 279 280 281 282 283 284 285 286 287 288 289 290 291 292 293 294 295 296 297 298 299 300 301 302 303 304 305 306 307 308 309 310 311 312 313 314 315 316 317 318 319 320 321 322 323 324 325 326 327 328 329 330 331 332 333 334 335 336 337 338 339 340 341 342 343 344 345 346 347 348 349 350 351 352 353 354 355 356 357 358 359 360 361 362 363 364 365 366 367 368 369 370 371 372 373 374 375 376 377 378 379 380 381 382 383 384 385 386 387 388 389 390 391 392 393 394 395 396 397 398 399 400 401 402 403 404 405 406 407 408 409 410 411 412 413 414 415 416 417 418 419 420 421 422 423 424 425 426 427 428 429 430 431 432 433 434 435 436 437 438 439 440 441 442 443 444 445 446 447 448 449 450 451 452 453 454 455 456 457 458 459 460 461 462 463 464 465 466 467 468 469 470 471 472 473 474 475 476 477 478 479 480 481 482 483 484 485 486 487 488 489 490 491 492 493 494 495 496 497 498 499 500 501 502 503 504 505 506 507 508 509 510 511 512 513 514 515 516 517 518 519 520 521 522 523 524 525 526 527 528 529 530 531 532 533 534 535 536 537 538 539 540 541 542 543 544 545 546 547 548 549 550 551 552 553 554 555 556 557 558 559 560 561 562 563 564 565 566 567 568 569 570 571 572 573 574 575 576 577 578 579 580 581 582 583 584 585 586 587 588 589 590 591 592 593 594 595 596 597 598 599 600 601 602 603 604 605 606 607 608 609 610 611 612 613 614 615 616 617 618 619 620 621 622 623 624 625 626 627 628 629 630 631 632 633 634 635 636 637 638 639 640 641 642 643 644 645 646 647 648 649 650 651 652 653 654 655 656 657 658 659 660 661 662 663 664 665 666 667 668 669 670 671 672 673 674 675 676 677 678 679 680 681 682 683 684 685 686 687 688 689 690 691 692 693 694 695 696 697 698 699 700 701 702 703 704 705 706 707 708 709 710 711 712 713 714 715 716 717 718 719 720 721 722 723 724 725 726 727 728 729 730 731 732 733 734 735 736 737 738 739 740 741 742 743 744 745 746 747 748 749 750 751 752 753 754 755 756 757 758 759 760 761 762 763 764 765 766 767 768 769 770 771 772 773 774 775 776 777 778 779 780 781 782 783 784 785 786 787 788 789 790 791 792 793 794 795 796 797 798 799 800 801 802 803 804 805 806 807 808 809 810 811 812 813 814 815 816 817 818 819 820 821 822 823 824 825 826 827 828 829 830 831 832 833 834 835 836 837 838 839 840 841 842 843 844 845 846 847 848 849 850 851 852 853 854 855 856 857 858 859 860 861 862 863 864 865 866 867 868 869 870 871 872 873 874 875 876 877 878 879 880 881 882 883 884 885 886 887 888 889 890 891 892 893 894 895 896 897 898 899 900 901 902 903 904 905 906 907 908 909 910 911 912 913 914 915 916 917 918 919 920 921 922 923 924 925 926 927 928 929 930 931 932 933 934 935 936 937 938 939 940 941 942 943 944 945 946 947 948 949 950 951 952 953 954 955 956 957 958 959 960 961 962 963 964 965 966 967 968 969 970 971 972 973 974 975 976 977 978 979 980 981 982 983 984 985 986 987 988 989 990 991 992 993 994 995 996 997 998 999 1000' }
      ] },
    solution: {
      approach: `<p>Token passing: exactly one permit circulates between the two semaphores, so the threads strictly alternate. Each thread iterates only over its own numbers, so both exit naturally.</p>`,
      code: `
public class OddEven {
    public static void main(String[] args) throws InterruptedException {
        Scanner in = new Scanner(System.in);
        int n = in.hasNextInt() ? in.nextInt() : 10;   // N from stdin (default 10)
        Semaphore oddTurn = new Semaphore(1), evenTurn = new Semaphore(0);
        StringBuffer out = new StringBuffer();                    // thread-safe appends
        Thread odd = new Thread(() -> {
            try {
                for (int i = 1; i <= n; i += 2) { oddTurn.acquire(); out.append(i).append(' '); evenTurn.release(); }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        Thread even = new Thread(() -> {
            try {
                for (int i = 2; i <= n; i += 2) { evenTurn.acquire(); out.append(i).append(' '); oddTurn.release(); }
            } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        odd.start(); even.start();
        odd.join(); even.join();
        System.out.println(out.toString().trim());                // 1 2 3 4 5 6 7 8 9 10
    }
}`,
      complexity: `<p>O(N) prints, 2 context switches per number (this is slow by design — turn-taking serialises everything).</p>`,
      followUps: ['Three threads printing 1,2,3,1,2,3…', 'LeetCode 1116 Print Zero Even Odd', 'Why is this a terrible way to parallelise real work?']
    }
  });

  practice.push({
    title: 'Bounded Blocking Queue from Scratch',
    level: 'Medium', tags: ['ReentrantLock', 'Condition', 'LeetCode 1188'], companies: ['LinkedIn', 'Uber', 'Rubrik', 'Nutanix'],
    statement: `<p>Implement ${C('BoundedBlockingQueue(int capacity)')} with ${C('void enqueue(int x)')} (blocks while full), ${C('int dequeue()')} (blocks while empty) and ${C('int size()')} — without using any class from java.util.concurrent except locks.</p>`,
    constraints: `1 ≤ capacity ≤ 30, many producer and consumer threads.`,
    example: `<p>capacity 2: enqueue(1), enqueue(2), enqueue(3) blocks → dequeue() returns 1 and wakes the producer → queue [2, 3].</p>`,
    brute: { why: `<p>A version with one ${C('synchronized')} method pair using ${C('wait()')} and ${C('notify()')} (not notifyAll) can deadlock: a consumer's notify may wake another consumer instead of a producer, and everyone ends up waiting.</p>`, code: `
class BrokenQueue {
    private final Deque<Integer> q = new ArrayDeque<>(); private final int cap;
    BrokenQueue(int cap) { this.cap = cap; }
    synchronized void enqueue(int x) throws InterruptedException { while (q.size() == cap) wait(); q.addLast(x); notify(); }   // may wake the wrong kind
    synchronized int dequeue() throws InterruptedException { while (q.isEmpty()) wait(); int v = q.removeFirst(); notify(); return v; }
}` },
    mcq: { q: 'Why two Condition objects instead of one?', options: ['Required by the JDK', 'So signal() wakes exactly the kind of thread that can make progress (producer vs consumer)', 'It doubles throughput by using two locks', 'Conditions cannot be shared'], answer: 1, explain: 'With separate notFull/notEmpty wait sets, a consumer signals notFull (producers only) and a producer signals notEmpty (consumers only), so single signal() is safe and cheap.' },
    hints: [`<p>Hint 1: one ReentrantLock, conditions ${C('notFull')} and ${C('notEmpty')}.</p>`, `<p>Hint 2: ${C('while (count == cap) notFull.await();')} — while, never if.</p>`, `<p>Hint 3: after enqueue signal notEmpty; after dequeue signal notFull; unlock in finally.</p>`],
    tests: { sig: 'int int int int -> long[]', fn: 'chk', harness: { java: `
class Check {
  static long[] chk(int cap, int producers, int consumers, int perP) throws Exception {
    BoundedBlockingQueue q = new BoundedBlockingQueue(cap);
    int total = producers * perP, perC = total / consumers;
    AtomicLong sum = new AtomicLong(); AtomicInteger count = new AtomicInteger(), orderBad = new AtomicInteger();
    Thread[] ts = new Thread[producers + consumers];
    for (int p = 0; p < producers; p++) {
      final int id = p;
      ts[p] = new Thread(() -> { try { for (int k = 0; k < perP; k++) q.enqueue(id * perP + k); } catch (InterruptedException e) { } });
    }
    for (int c = 0; c < consumers; c++) {
      ts[producers + c] = new Thread(() -> {
        int[] last = new int[producers];
        Arrays.fill(last, -1);
        try {
          for (int k = 0; k < perC; k++) {
            int v = q.dequeue();
            sum.addAndGet(v); count.incrementAndGet();
            int prod = v / perP, idx = v % perP;
            if (idx <= last[prod]) orderBad.incrementAndGet();
            last[prod] = idx;
          }
        } catch (InterruptedException e) { }
      });
    }
    for (Thread t : ts) t.start();
    for (Thread t : ts) t.join();
    return new long[]{ count.get(), sum.get(), orderBad.get(), q.size() };
  }
}` }, cases: [
        [[2, 1, 1, 3], [3, 3, 0, 0]],
        [[1, 1, 1, 1000], [1000, 499500, 0, 0]],
        [[30, 8, 8, 40], [320, 51040, 0, 0]],
        [[1, 8, 8, 40], [320, 51040, 0, 0]],
        [[5, 3, 1, 30], [90, 4005, 0, 0]],
        [[5, 1, 3, 30], [30, 435, 0, 0]],
        [[2, 4, 2, 5], [20, 190, 0, 0]],
        [[3, 8, 8, 500], [4000, 7998000, 0, 0]]
      ] },
    solution: {
      approach: `<p>Monitor pattern with explicit lock and two wait sets (the same design as ArrayBlockingQueue).</p>`,
      code: `
public class BoundedBlockingQueue {
    private final Deque<Integer> q = new ArrayDeque<>();
    private final int cap;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();

    BoundedBlockingQueue(int capacity) { this.cap = capacity; }

    void enqueue(int x) throws InterruptedException {
        lock.lock();
        try {
            while (q.size() == cap) notFull.await();
            q.addLast(x);
            notEmpty.signal();
        } finally { lock.unlock(); }
    }

    int dequeue() throws InterruptedException {
        lock.lock();
        try {
            while (q.isEmpty()) notEmpty.await();
            int v = q.removeFirst();
            notFull.signal();
            return v;
        } finally { lock.unlock(); }
    }

    int size() {
        lock.lock();
        try { return q.size(); } finally { lock.unlock(); }
    }

    public static void main(String[] args) throws InterruptedException {
        BoundedBlockingQueue bq = new BoundedBlockingQueue(2);
        Thread prod = new Thread(() -> {
            try { for (int i = 1; i <= 5; i++) bq.enqueue(i); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
        prod.start();
        for (int i = 0; i < 5; i++) System.out.print(bq.dequeue() + " ");   // 1 2 3 4 5
        prod.join();
        System.out.println("size=" + bq.size());
    }
}`,
      complexity: `<p>O(1) per operation plus waiting. One lock means producers and consumers serialise; LinkedBlockingQueue's two-lock design removes that.</p>`,
      followUps: ['Add offer(x, timeout) using awaitNanos', 'Implement the two-lock variant', 'Why must await be in a while loop even with two conditions?']
    }
  });

  practice.push({
    title: 'Compute-Once Memoizer (Cache Stampede Protection)',
    level: 'Medium', tags: ['ConcurrentHashMap', 'CompletableFuture', 'memoization'], companies: ['Netflix', 'Meta', 'Shopify'],
    statement: `<p>Wrap an expensive function ${C('Function<K, V> f')} in a thread-safe cache such that, when 100 threads ask for the <b>same missing key</b> at the same moment, ${C('f')} runs <b>exactly once</b> and all 100 get the same result. Different keys must compute in parallel. If the computation fails, the failure must not be cached forever.</p>`,
    constraints: `f takes 10 ms - 2 s; thousands of distinct keys; high read concurrency.`,
    example: `<p>100 threads call ${C('get("user:7")')} → one database call, 99 threads wait for the same future → ${H.c('g', '1 call')}, not 100 (a "thundering herd").</p>`,
    brute: { why: `<p>${C('if (!map.containsKey(k)) map.put(k, f.apply(k))')} is check-then-act: all 100 threads see "missing" and compute. Making ${C('get')} synchronized fixes duplicates but serialises <i>all</i> keys — a slow key blocks every other lookup.</p>`, code: `
class NaiveMemo<K, V> {
    private final Map<K, V> cache = new ConcurrentHashMap<>();
    private final Function<K, V> f;
    NaiveMemo(Function<K, V> f) { this.f = f; }
    V get(K k) {
        V v = cache.get(k);
        if (v == null) { v = f.apply(k); cache.put(k, v); }   // race: many threads compute the same key
        return v;
    }
}` },
    mcq: { q: 'Why store CompletableFuture&lt;V&gt; in the map rather than V?', options: ['Futures are smaller', 'So the first thread can publish a placeholder instantly and others wait on it while the slow computation runs outside any map lock', 'ConcurrentHashMap cannot store V', 'To make get() non-blocking for the first caller'], answer: 1, explain: 'computeIfAbsent of a cheap future is fast; the expensive work happens outside the map bin lock, and every other caller joins the same future.' },
    hints: [`<p>Hint 1: ${C('computeIfAbsent')} with the expensive function directly would block the map's bin (and other keys in it) for 2 s and forbids recursive updates — keep the lambda cheap.</p>`, `<p>Hint 2: ${C('ConcurrentHashMap<K, CompletableFuture<V>>')}: putIfAbsent a new future; the winner completes it.</p>`, `<p>Hint 3: on failure, ${C('remove(k, future)')} so a later call retries; then rethrow.</p>`],
    tests: { sig: 'string int int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String kind, int threads, int keys) throws Exception {
    AtomicInteger calls = new AtomicInteger(), attempts = new AtomicInteger();
    if (kind.equals("fail")) {
      Memoizer<String, Integer> m = new Memoizer<>(k -> { calls.incrementAndGet(); if (attempts.incrementAndGet() == 1) throw new IllegalStateException("boom"); return k.length(); });
      String first;
      try { m.get("hello"); first = "no exception"; } catch (RuntimeException e) { first = "threw"; }
      return new String[]{ first, String.valueOf(m.get("hello")), String.valueOf(calls.get()) };
    }
    Memoizer<String, Integer> m = new Memoizer<>(k -> { calls.incrementAndGet(); return k.length() * 1000 + Integer.parseInt(k.substring(2)); });
    CountDownLatch gate = new CountDownLatch(1);
    boolean[] same = new boolean[threads];
    Thread[] ts = new Thread[threads];
    for (int i = 0; i < threads; i++) {
      final int id = i;
      ts[i] = new Thread(() -> {
        try { gate.await(); } catch (InterruptedException e) { }
        String key = "k:" + (kind.equals("same") ? 7 : id % keys);
        int expected = key.length() * 1000 + Integer.parseInt(key.substring(2));
        same[id] = m.get(key) == expected;
      });
      ts[i].start();
    }
    gate.countDown();
    boolean all = true;
    for (int i = 0; i < threads; i++) { ts[i].join(); all &= same[i]; }
    return new String[]{ String.valueOf(calls.get()), String.valueOf(all) };
  }
}` }, cases: [
        [['same', 100, 1], ['1', 'true']],
        [['same', 1, 1], ['1', 'true']],
        [['same', 500, 1], ['1', 'true']],
        [['keys', 64, 10], ['10', 'true']],
        [['keys', 8, 100], ['8', 'true']],
        [['keys', 1000, 1000], ['1000', 'true']],
        [['keys', 1000, 1], ['1', 'true']],
        [['fail', 0, 0], ['threw', '5', '2']]
      ] },
    solution: {
      approach: `<p>The "Memoizer" from Java Concurrency in Practice, modernised: an atomic putIfAbsent decides a single winner per key; losers join the winner's future; failures are evicted.</p>`,
      code: `
public class Memoizer<K, V> {
    private final ConcurrentHashMap<K, CompletableFuture<V>> cache = new ConcurrentHashMap<>();
    private final Function<K, V> f;
    Memoizer(Function<K, V> f) { this.f = f; }

    V get(K k) {
        CompletableFuture<V> fut = cache.get(k);
        if (fut == null) {
            CompletableFuture<V> mine = new CompletableFuture<>();
            fut = cache.putIfAbsent(k, mine);              // atomic: exactly one winner
            if (fut == null) {                             // we won: compute outside any lock
                fut = mine;
                try {
                    mine.complete(f.apply(k));
                } catch (RuntimeException e) {
                    cache.remove(k, mine);                 // don't cache failures
                    mine.completeExceptionally(e);
                }
            }
        }
        return fut.join();                                 // losers wait for the winner
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger calls = new AtomicInteger();
        Memoizer<String, Integer> m = new Memoizer<>(k -> { calls.incrementAndGet(); return k.length(); });
        Thread[] ts = new Thread[50];
        for (int i = 0; i < ts.length; i++) { ts[i] = new Thread(() -> m.get("user:7")); ts[i].start(); }
        for (Thread t : ts) t.join();
        System.out.println("value=" + m.get("user:7") + " computed " + calls.get() + " time(s)"); // 6, 1
    }
}`,
      complexity: `<p>O(1) map operations; each key computed once while successful. Memory grows with keys — add expiry/size bounds (Caffeine does all of this in production).</p>`,
      followUps: ['Add time-based expiry', 'What does Caffeine\'s AsyncLoadingCache add?', 'How does this relate to request coalescing in CDNs?']
    }
  });

  practice.push({
    title: 'Object Pool (DB Connections) with Semaphore',
    level: 'Medium', tags: ['Semaphore', 'resource pool', 'timeouts'], companies: ['Oracle', 'Atlassian', 'Intuit'],
    statement: `<p>Implement ${C('class Pool<T>')} holding a fixed list of reusable objects. ${C('T borrow(long timeoutMs)')} returns a free object or throws ${C('TimeoutException')} if none frees up in time; ${C('void giveBack(T t)')} returns it. Never hand the same object to two borrowers.</p>`,
    constraints: `Pool size 1..200, thousands of borrowers.`,
    example: `<p>Pool of 2 connections. A and B borrow; C waits; A gives back → C gets A's connection. D waits 100 ms with nobody returning → ${H.c('r', 'TimeoutException')}.</p>`,
    brute: { why: `<p>A synchronized list with ${C('while (free.isEmpty()) wait();')} works but has no clean timeout handling and holds the monitor while scanning. Using a Semaphore alone (without a thread-safe container) limits the count but two borrowers might take the same object.</p>`, code: `
class SyncPool<T> {
    private final Deque<T> free;
    SyncPool(Collection<T> items) { free = new ArrayDeque<>(items); }
    synchronized T borrow() throws InterruptedException { while (free.isEmpty()) wait(); return free.pop(); }  // no timeout
    synchronized void giveBack(T t) { free.push(t); notifyAll(); }
}` },
    mcq: { q: 'If borrow() acquires a permit but then the container is unexpectedly empty, what went wrong?', options: ['Nothing, it can happen normally', 'A permit was released without returning an object (or released twice) — permits and objects got out of sync', 'Semaphores are approximate', 'The fairness flag is off'], answer: 1, explain: 'The invariant is permits == free objects. Since semaphores do not track owners, a double giveBack or a release on an error path breaks it.' },
    hints: [`<p>Hint 1: Semaphore(size) counts free objects; a ${C('ConcurrentLinkedQueue')} holds them.</p>`, `<p>Hint 2: ${C('tryAcquire(timeout)')} then ${C('poll()')}; giveBack = ${C('offer')} then ${C('release()')}.</p>`, `<p>Hint 3: guard giveBack against foreign or double returns with a ${C('Set')} of borrowed objects (identity-based).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] ops) throws Exception {
    Pool<String> pool = null;
    Map<String, String> held = new HashMap<>();
    Map<String, Thread> waiters = new HashMap<>();
    Map<String, String> got = new ConcurrentHashMap<>();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "new": { List<String> items = new ArrayList<>(); for (int i = 1; i <= Integer.parseInt(p[1]); i++) items.add("conn-" + i); pool = new Pool<>(items); break; }
        case "borrow": {
          try { String c = pool.borrow(Long.parseLong(p[2])); held.put(p[1], c); out.add(c); } catch (TimeoutException e) { out.add("TIMEOUT"); }
          break;
        }
        case "wait": {
          final Pool<String> pl = pool; final String name = p[1];
          Thread t = new Thread(() -> { try { got.put(name, pl.borrow(10000)); } catch (Exception e) { got.put(name, "ERR " + e); } });
          t.start();
          long end = System.nanoTime() + 20_000_000_000L;
          while (t.getState() != Thread.State.TIMED_WAITING && System.nanoTime() < end) Thread.onSpinWait();
          waiters.put(name, t);
          break;
        }
        case "give": pool.giveBack(held.remove(p[1])); break;
        case "join": waiters.get(p[1]).join(); out.add(got.get(p[1])); break;
        case "giveBad": try { pool.giveBack(p[1]); out.add("no exception"); } catch (IllegalStateException e) { out.add("ISE"); } break;
        case "stress": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]);
          final Pool<String> pl = pool;
          Set<String> inUse = ConcurrentHashMap.newKeySet();
          AtomicInteger bad = new AtomicInteger();
          Thread[] ts = new Thread[T];
          for (int i = 0; i < T; i++) {
            ts[i] = new Thread(() -> {
              try {
                for (int k = 0; k < N; k++) {
                  String c = pl.borrow(60000);
                  if (!inUse.add(c)) bad.incrementAndGet();
                  inUse.remove(c);
                  pl.giveBack(c);
                }
              } catch (Exception e) { bad.incrementAndGet(); }
            });
            ts[i].start();
          }
          for (Thread t : ts) t.join();
          out.add(bad.get() == 0 ? "ok" : "violations");
          break;
        }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['new:2', 'borrow:A:100', 'borrow:B:100', 'wait:C', 'give:A', 'join:C', 'borrow:D:100', 'giveBad:zzz']], ['conn-1', 'conn-2', 'conn-1', 'TIMEOUT', 'ISE']],
        [[['new:1', 'borrow:A:100', 'give:A', 'borrow:B:100']], ['conn-1', 'conn-1']],
        [[['new:1', 'borrow:A:0', 'borrow:B:0']], ['conn-1', 'TIMEOUT']],
        [[['new:1', 'borrow:A:50', 'give:A', 'giveBad:conn-1']], ['conn-1', 'ISE']],
        [[['new:3', 'borrow:A:10', 'borrow:B:10', 'borrow:C:10', 'borrow:D:10']], ['conn-1', 'conn-2', 'conn-3', 'TIMEOUT']],
        [[['new:5', 'stress:32:2000']], ['ok']],
        [[['new:200', 'stress:64:500']], ['ok']],
        [[['new:1', 'stress:16:3000']], ['ok']]
      ] },
    solution: {
      approach: `<p>Semaphore gates how many can be out; a lock-free queue stores the free objects; a concurrent set catches double returns. Order in giveBack matters: put the object back <b>before</b> releasing the permit, so whoever gets the permit finds an object.</p>`,
      code: `
public class Pool<T> {
    private final Semaphore available;
    private final Queue<T> free = new ConcurrentLinkedQueue<>();
    private final Set<T> borrowed = ConcurrentHashMap.newKeySet();

    Pool(Collection<T> items) {
        free.addAll(items);
        available = new Semaphore(items.size(), true);
    }

    T borrow(long timeoutMs) throws InterruptedException, TimeoutException {
        if (!available.tryAcquire(timeoutMs, TimeUnit.MILLISECONDS)) throw new TimeoutException("pool exhausted");
        T t = free.poll();                     // guaranteed non-null while the invariant holds
        borrowed.add(t);
        return t;
    }

    void giveBack(T t) {
        if (!borrowed.remove(t)) throw new IllegalStateException("not borrowed: " + t);
        free.offer(t);                         // object first ...
        available.release();                   // ... then the permit
    }

    public static void main(String[] args) throws Exception {
        Pool<String> p = new Pool<>(List.of("conn-1", "conn-2"));
        String a = p.borrow(100), b = p.borrow(100);
        try { p.borrow(100); } catch (TimeoutException e) { System.out.println("timeout as expected"); }
        p.giveBack(a);
        System.out.println("got " + p.borrow(100) + ", still holding " + b);
    }
}`,
      complexity: `<p>O(1) borrow/return; waiting bounded by the timeout. Fair semaphore prevents starvation of long-waiting borrowers.</p>`,
      followUps: ['Validate connections on borrow and replace broken ones', 'How does HikariCP make borrow faster (thread-local affinity, ConcurrentBag)?']
    }
  });

  practice.push({
    title: 'Parallel Word Frequency with CompletableFuture',
    level: 'Medium', tags: ['CompletableFuture', 'allOf', 'map-reduce'], companies: ['Google', 'Databricks', 'Twitter/X'],
    statement: `<p>Given a list of documents, compute the total word frequency map in parallel: count each document asynchronously into its <b>own</b> map (map step), then merge all maps when every count is done (reduce step). Use ${C('CompletableFuture.supplyAsync')} with your own executor and ${C('allOf')}.</p>`,
    constraints: `Up to 10<sup>4</sup> documents, 10<sup>5</sup> words each. Words are lowercase, separated by spaces.`,
    example: `<p>["a b a", "b c"] → doc maps {a=2, b=1} and {b=1, c=1} → merged ${H.c('g', '{a=2, b=2, c=1}')}.</p>`,
    brute: { why: `<p>Many threads updating one shared ${C('HashMap')} corrupts it; one shared ${C('ConcurrentHashMap')} with ${C('merge')} is correct but every word is a contended write. Per-document local maps need no synchronisation at all until the cheap merge.</p>`, code: `
static Map<String, Integer> countSequential(List<String> docs) {
    Map<String, Integer> m = new HashMap<>();
    for (String d : docs) for (String w : d.split(" ")) m.merge(w, 1, Integer::sum);
    return m;
}` },
    mcq: { q: 'Why does each task build its own HashMap instead of writing to one shared map?', options: ['HashMap is faster than any concurrent map, and confinement means zero contention until the merge', 'CompletableFuture forbids shared state', 'Shared maps are always wrong', 'To save memory'], answer: 0, explain: 'Thread confinement: data owned by one thread needs no locks. The merge happens once per document, which is cheap compared to per-word contention.' },
    hints: [`<p>Hint 1: map step: ${C('supplyAsync(() -> countDoc(doc), ex)')} returns ${C('CompletableFuture<Map<String,Integer>>')}.</p>`, `<p>Hint 2: ${C('allOf(...)')} then ${C('thenApply')} to merge with ${C('merge(k, v, Integer::sum)')}.</p>`, `<p>Hint 3: the result of a completed future is safely visible (happens-before), so the plain HashMaps can be read in the merge.</p>`],
    tests: { sig: 'list<string> -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(List<String> docs) {
    ExecutorService ex = Executors.newFixedThreadPool(4);
    try { return String.valueOf(WordFreq.count(docs, ex)); } finally { ex.shutdown(); }
  }
}` }, cases: [
        [[['a b a', 'b c']], '{a=2, b=2, c=1}'],
        [[[]], '{}'],
        [[['', '   ']], '{}'],
        [[['a  b']], '{a=1, b=1}'],
        [[['solo']], '{solo=1}'],
        [[['z a', 'a z', 'm']], '{a=2, m=1, z=2}'],
        [[{ $rep: 'x y', n: 10000 }], '{x=10000, y=10000}'],
        [[[{ $rep: 'w ', n: 100000 }]], '{w=100000}']
      ] },
    solution: {
      approach: `<p>Map-reduce with thread confinement: async per-document counting into private maps, then a single-threaded merge after allOf.</p>`,
      code: `
public class WordFreq {
    static Map<String, Integer> countDoc(String doc) {
        Map<String, Integer> m = new HashMap<>();
        for (String w : doc.split(" ")) if (!w.isEmpty()) m.merge(w, 1, Integer::sum);
        return m;
    }

    static Map<String, Integer> count(List<String> docs, ExecutorService ex) {
        List<CompletableFuture<Map<String, Integer>>> parts = docs.stream()
                .map(d -> CompletableFuture.supplyAsync(() -> countDoc(d), ex))
                .toList();
        return CompletableFuture.allOf(parts.toArray(new CompletableFuture[0]))
                .thenApply(v -> {
                    Map<String, Integer> total = new TreeMap<>();
                    for (CompletableFuture<Map<String, Integer>> p : parts)
                        p.join().forEach((k, c) -> total.merge(k, c, Integer::sum));
                    return total;
                })
                .join();
    }

    public static void main(String[] args) {
        ExecutorService ex = Executors.newFixedThreadPool(4);
        try {
            System.out.println(count(List.of("a b a", "b c"), ex));   // {a=2, b=2, c=1}
        } finally {
            ex.shutdown();
        }
    }
}`,
      complexity: `<p>O(total words) work split across threads + O(distinct words × docs) merge. Memory O(distinct words per doc) per task.</p>`,
      followUps: ['Merge pairwise in parallel (tree reduction) for huge numbers of documents', 'Compare with parallelStream().collect(groupingByConcurrent(...))']
    }
  });

  practice.push({
    title: 'Building H2O (Barrier + Semaphores)',
    level: 'Medium', tags: ['Semaphore', 'CyclicBarrier', 'LeetCode 1117'], companies: ['Microsoft', 'Uber', 'Bloomberg'],
    statement: `<p>Hydrogen and oxygen threads arrive randomly and call ${C('hydrogen(release)')} or ${C('oxygen(release)')}. Threads must be grouped into molecules: each group of 3 must contain exactly 2 H and 1 O, and all 3 must "bond" (print) before any thread of the next molecule. Implement the class.</p>`,
    constraints: `Total H = 2 × total O; up to 60 threads.`,
    example: `<p>Arrival "OOHHHH" → valid outputs like ${H.c('g', 'HHOHHO')}, ${H.c('g', 'HOHOHH')} … each consecutive triple has 2 H and 1 O. "HHHHOO" printed as "HHH…" is ${H.c('r', 'invalid')}.</p>`,
    brute: { why: `<p>Counting H and O with synchronized counters and wait/notifyAll is possible but subtle: you must also stop a <b>third</b> H from joining a molecule early and reset counts at exactly the right moment — classic bugs.</p>`, code: `
class H2OCounters {
    private int h, o;                                   // shared counters, easy to get wrong
    synchronized void hydrogen(Runnable r) throws InterruptedException { while (h == 2) wait(); h++; r.run(); if (h == 2 && o == 1) { h = 0; o = 0; } notifyAll(); }
    synchronized void oxygen(Runnable r) throws InterruptedException { while (o == 1) wait(); o++; r.run(); if (h == 2 && o == 1) { h = 0; o = 0; } notifyAll(); }
}` },
    mcq: { q: 'What does the CyclicBarrier(3) add on top of Semaphore(2) for H and Semaphore(1) for O?', options: ['Nothing', 'It makes the 3 admitted threads wait for each other, so a whole molecule forms before permits are released for the next one', 'It limits the total number of threads', 'It orders H before O'], answer: 1, explain: 'Semaphores admit at most 2 H and 1 O; the barrier ensures those 3 complete together and only then release their permits.' },
    hints: [`<p>Hint 1: ${C('Semaphore h = new Semaphore(2), o = new Semaphore(1)')} limit membership of the current molecule.</p>`, `<p>Hint 2: after acquiring, call ${C('barrier.await()')} on a ${C('CyclicBarrier(3)')}, then print, then release your permit.</p>`, `<p>Hint 3: the barrier resets itself automatically for the next molecule.</p>`],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String arrivals) throws Exception {
    for (int round = 0; round < 20; round++) {
      H2O w = new H2O();
      StringBuffer sb = new StringBuffer();
      Thread[] ts = new Thread[arrivals.length()];
      for (int i = 0; i < ts.length; i++) {
        boolean h = arrivals.charAt(i) == 'H';
        ts[i] = new Thread(() -> {
          try { if (h) w.hydrogen(() -> sb.append('H')); else w.oxygen(() -> sb.append('O')); } catch (InterruptedException | BrokenBarrierException e) { }
        });
      }
      for (Thread t : ts) t.start();
      for (Thread t : ts) t.join();
      String s = sb.toString();
      if (s.length() != arrivals.length()) return "bad length " + s;
      for (int i = 0; i < s.length(); i += 3) {
        String g = s.substring(i, i + 3);
        long hs = g.chars().filter(c -> c == 'H').count();
        if (hs != 2) return "invalid:" + s;
      }
    }
    return "valid";
  }
}` }, cases: [
        [['OOHHHH'], 'valid'],
        [['HHHHOO'], 'valid'],
        [['HOHOHH'], 'valid'],
        [['HHO'], 'valid'],
        [['OHH'], 'valid'],
        [['HOH'], 'valid'],
        [[{ $rep: 'HHO', n: 20 }], 'valid'],
        [[{ $concat: [{ $rep: 'O', n: 20 }, { $rep: 'H', n: 40 }] }], 'valid']
      ] },
    solution: {
      approach: `<p>Admission control (semaphores) + group rendezvous (cyclic barrier). Printing before or after await both satisfy the grouping requirement; releasing permits only after the barrier is the key.</p>`,
      code: `
public class H2O {
    private final Semaphore hSlots = new Semaphore(2), oSlots = new Semaphore(1);
    private final CyclicBarrier molecule = new CyclicBarrier(3);

    void hydrogen(Runnable releaseHydrogen) throws InterruptedException, BrokenBarrierException {
        hSlots.acquire();
        try {
            molecule.await();
            releaseHydrogen.run();
        } finally {
            hSlots.release();
        }
    }

    void oxygen(Runnable releaseOxygen) throws InterruptedException, BrokenBarrierException {
        oSlots.acquire();
        try {
            molecule.await();
            releaseOxygen.run();
        } finally {
            oSlots.release();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        H2O h2o = new H2O();
        StringBuffer out = new StringBuffer();
        List<Thread> ts = new ArrayList<>();
        for (char c : "OOHHHH".toCharArray()) {
            Thread t = new Thread(() -> {
                try {
                    if (c == 'H') h2o.hydrogen(() -> out.append('H')); else h2o.oxygen(() -> out.append('O'));
                } catch (InterruptedException | BrokenBarrierException e) { Thread.currentThread().interrupt(); }
            });
            ts.add(t);
            t.start();
        }
        for (Thread t : ts) t.join();
        System.out.println(out);   // e.g. HHOHOH - every triple has 2 H + 1 O
    }
}`,
      complexity: `<p>O(1) per thread; at most 3 threads in the bonding phase at once.</p>`,
      followUps: ['Generalise to molecules like CH4', 'What happens if the input has the wrong H:O ratio (barrier never completes) and how would you time out?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Build Your Own Thread Pool',
    level: 'Hard', tags: ['thread pool', 'BlockingQueue', 'design', 'shutdown'], companies: ['Amazon', 'Google', 'Rubrik', 'Confluent'],
    statement: `<p>Implement ${C('class SimplePool implements Executor')} with a fixed number of worker threads, a <b>bounded</b> task queue, ${C('execute(Runnable)')} that throws ${C('RejectedExecutionException')} when full or shut down, ${C('shutdown()')} (finish queued tasks, then workers exit), and ${C('awaitTermination(timeout)')}. A task that throws must <b>not</b> kill its worker.</p>`,
    constraints: `1 ≤ threads ≤ 64, queue capacity ≤ 10<sup>4</sup>; must not lose tasks accepted before shutdown; must not busy-wait.`,
    example: `<p>2 workers, capacity 3: submit 5 slow tasks → 2 running + 3 queued; the 6th → ${H.c('r', 'RejectedExecutionException')}. shutdown() → all 5 complete, workers exit, awaitTermination returns ${H.c('g', 'true')}.</p>`,
    brute: { why: `<p>${C('new Thread(task).start()')} per task: unbounded threads, no reuse, no back-pressure. A homemade pool whose workers loop on ${C('queue.take()')} forever never exits, and a task exception that escapes ${C('run()')} kills the worker silently, shrinking the pool.</p>`, code: `
class ThreadPerTask implements Executor {
    public void execute(Runnable r) { new Thread(r).start(); }   // unbounded, no lifecycle
}` },
    mcq: { q: 'How should workers learn that shutdown happened if they are blocked in queue.take() on an empty queue?', options: ['They poll a volatile flag every millisecond', 'Use poll(timeout) in a loop and exit when the flag is set and the queue is empty — or put one poison pill per worker', 'Call Thread.stop()', 'They never need to know'], answer: 1, explain: 'A blocked take() never sees a flag. Either wake periodically with poll(timeout) and re-check, or enqueue a sentinel per worker (after all real tasks, so nothing is lost).' },
    hints: [`<p>Hint 1: state = ${C('ArrayBlockingQueue<Runnable>')}, ${C('List<Thread> workers')}, ${C('volatile boolean shutdown')}, and a ${C('CountDownLatch(threads)')} counted down when each worker exits.</p>`, `<p>Hint 2: ${C('execute')}: if shutdown → reject; if ${C('!queue.offer(r)')} → reject. Worker loop: ${C('Runnable r = queue.poll(100, ms)')}; if r == null and shutdown → exit; else run inside try/catch(Throwable).</p>`, `<p>Hint 3: race to think about: a task offered just as shutdown flips — check the flag <i>after</i> offering too, or accept that tasks offered before the flag is seen will still run because workers drain the queue before exiting.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] ops) throws Exception {
    SimplePool pool = null;
    int threads = 0;
    CountDownLatch gate = new CountDownLatch(1);
    AtomicInteger done = new AtomicInteger(), started = new AtomicInteger();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "new": threads = Integer.parseInt(p[1]); pool = new SimplePool(threads, Integer.parseInt(p[2])); break;
        case "slow": case "fast": case "boom": {
          int n = p[0].equals("boom") ? 1 : Integer.parseInt(p[1]);
          int accepted = 0, rejected = 0;
          for (int i = 0; i < n; i++) {
            Runnable r;
            if (p[0].equals("slow")) r = () -> { started.incrementAndGet(); try { gate.await(); } catch (InterruptedException e) { } done.incrementAndGet(); };
            else if (p[0].equals("boom")) r = () -> { throw new IllegalStateException("boom"); };
            else r = done::incrementAndGet;
            try { pool.execute(r); accepted++; } catch (RejectedExecutionException e) { rejected++; }
            if (p[0].equals("slow") && accepted <= threads && accepted > 0) {
              long end = System.nanoTime() + 20_000_000_000L;
              while (started.get() < accepted && System.nanoTime() < end) Thread.onSpinWait();
            }
          }
          out.add("accepted=" + accepted + " rejected=" + rejected);
          break;
        }
        case "open": gate.countDown(); break;
        case "shutdown": pool.shutdown(); break;
        case "await": out.add(String.valueOf(pool.awaitTermination(p.length > 1 ? Long.parseLong(p[1]) : 20000, TimeUnit.MILLISECONDS))); break;
        case "done": out.add(String.valueOf(done.get())); break;
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['new:2:3', 'slow:6', 'shutdown', 'open', 'await', 'done']], ['accepted=5 rejected=1', 'true', '5']],
        [[['new:1:1', 'shutdown', 'fast:1', 'await']], ['accepted=0 rejected=1', 'true']],
        [[['new:1:5', 'boom', 'fast:3', 'shutdown', 'await', 'done']], ['accepted=1 rejected=0', 'accepted=3 rejected=0', 'true', '3']],
        [[['new:1:1', 'slow:1', 'shutdown', 'await:50', 'open', 'await']], ['accepted=1 rejected=0', 'false', 'true']],
        [[['new:2:100', 'fast:100', 'shutdown', 'await', 'done']], ['accepted=100 rejected=0', 'true', '100']],
        [[['new:8:10000', 'fast:10000', 'shutdown', 'await', 'done']], ['accepted=10000 rejected=0', 'true', '10000']],
        [[['new:4:4', 'shutdown', 'shutdown', 'await']], ['true']],
        [[['new:1:2', 'slow:5', 'open', 'shutdown', 'await', 'done']], ['accepted=3 rejected=2', 'true', '3']]
      ] },
    solution: {
      approach: `<p>Workers run a loop: poll with timeout → run with exception isolation → exit only when shut down <b>and</b> the queue is empty, so every accepted task completes. The termination latch makes ${C('awaitTermination')} trivial and gives happens-before from worker actions to the waiter.</p>`,
      code: `
public class SimplePool implements Executor {
    private final BlockingQueue<Runnable> queue;
    private final List<Thread> workers = new ArrayList<>();
    private final CountDownLatch terminated;
    private volatile boolean shutdown;

    SimplePool(int threads, int capacity) {
        queue = new ArrayBlockingQueue<>(capacity);
        terminated = new CountDownLatch(threads);
        for (int i = 0; i < threads; i++) {
            Thread t = new Thread(this::workLoop, "simple-pool-" + i);
            workers.add(t);
            t.start();
        }
    }

    private void workLoop() {
        try {
            while (true) {
                Runnable r = queue.poll(50, TimeUnit.MILLISECONDS);
                if (r == null) {
                    if (shutdown && queue.isEmpty()) return;       // drained: exit
                    continue;
                }
                try {
                    r.run();
                } catch (Throwable t) {                            // isolate task failures
                    System.err.println(Thread.currentThread().getName() + " task failed: " + t);
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();                    // shutdownNow-style exit
        } finally {
            terminated.countDown();
        }
    }

    @Override
    public void execute(Runnable r) {
        if (shutdown) throw new RejectedExecutionException("pool is shut down");
        if (!queue.offer(r)) throw new RejectedExecutionException("queue full");
    }

    void shutdown() { shutdown = true; }

    boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException {
        return terminated.await(timeout, unit);
    }

    public static void main(String[] args) throws InterruptedException {
        SimplePool pool = new SimplePool(2, 3);
        AtomicInteger done = new AtomicInteger();
        for (int i = 0; i < 6; i++) {
            final int id = i;
            try {
                pool.execute(() -> {
                    try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                    if (id == 1) throw new IllegalStateException("boom");   // worker must survive
                    done.incrementAndGet();
                });
            } catch (RejectedExecutionException e) {
                System.out.println("task " + id + " rejected: " + e.getMessage());
            }
        }
        pool.shutdown();
        System.out.println("terminated=" + pool.awaitTermination(5, TimeUnit.SECONDS) + " done=" + done.get());
    }
}`,
      complexity: `<p>O(1) per submit; idle workers wake every 50 ms (negligible). A production pool would avoid that polling by using poison pills or interrupts, add a ThreadFactory, metrics and shutdownNow.</p>`,
      followUps: ['Add shutdownNow() that interrupts workers and returns queued tasks', 'Add submit(Callable) returning a Future (wrap in FutureTask)', 'Add growth between core and max like ThreadPoolExecutor']
    }
  });

  practice.push({
    title: 'Lock-Free Token Bucket Rate Limiter',
    level: 'Hard', tags: ['CAS', 'AtomicReference', 'rate limiting', 'design'], companies: ['Stripe', 'Cloudflare', 'Uber', 'Razorpay'],
    statement: `<p>Implement ${C('boolean tryAcquire()')} for a token bucket with capacity ${C('B')} that refills at ${C('R')} tokens per second, safe for hundreds of threads and <b>without locks</b>. Tokens refill lazily based on elapsed time (no background thread). Use an injectable clock so it is testable.</p>`,
    constraints: `1 ≤ B ≤ 10<sup>6</sup>, 1 ≤ R ≤ 10<sup>6</sup>/s, nanosecond clock; tryAcquire must never block.`,
    example: `<p>B = 5, R = 1/s. At t = 0, six calls → ${H.c('g', 'true ×5')}, ${H.c('r', 'false')}. At t = 2.5 s → 2.5 tokens accumulated → 2 calls succeed, the 3rd fails.</p>`,
    brute: { why: `<p>A ${C('synchronized tryAcquire()')} is correct and actually fine at moderate load. At very high rates all threads queue on one monitor. Using two separate atomics (tokens and lastRefill) is <b>wrong</b>: a thread can refill using one thread's timestamp and another thread's token count — the pair must change together.</p>`, code: `
class SyncBucket {
    private final long capacity; private final double perNano;
    private double tokens; private long last;
    SyncBucket(long capacity, double perSecond) { this.capacity = capacity; this.perNano = perSecond / 1e9; tokens = capacity; last = System.nanoTime(); }
    synchronized boolean tryAcquire() {
        long now = System.nanoTime();
        tokens = Math.min(capacity, tokens + (now - last) * perNano);
        last = now;
        if (tokens < 1) return false;
        tokens -= 1;
        return true;
    }
}` },
    mcq: { q: 'Why keep tokens and lastRefill inside ONE immutable object behind an AtomicReference?', options: ['Records are faster than doubles', 'Both fields must be read and replaced together; one CAS on a reference swaps the pair atomically', 'AtomicDouble does not exist', 'To reduce garbage'], answer: 1, explain: 'Compound state needs a single atomic unit. CAS on a reference to an immutable snapshot is the lock-free way to update multiple fields consistently.' },
    hints: [`<p>Hint 1: ${C('record State(double tokens, long lastNanos)')}; ${C('AtomicReference<State>')}.</p>`, `<p>Hint 2: loop: read s; compute refilled = min(B, s.tokens + elapsed × rate); if refilled &lt; 1 → return false (no CAS needed… but you may CAS the refill to save work); else CAS(s, new State(refilled − 1, now)).</p>`, `<p>Hint 3: use a ${C('LongSupplier clock')}; guard against the clock going backwards (${C('max(0, elapsed)')}).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] ops) throws Exception {
    long[] clock = {0};
    TokenBucket b = null;
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":");
      switch (p[0]) {
        case "new": b = new TokenBucket(Double.parseDouble(p[1]), Double.parseDouble(p[2]), () -> clock[0]); break;
        case "t": clock[0] = Long.parseLong(p[1]); break;
        case "acq": {
          int n = Integer.parseInt(p[1]), ok = 0;
          StringBuilder sb = new StringBuilder();
          for (int i = 0; i < n; i++) { boolean r = b.tryAcquire(); if (r) ok++; sb.append(r ? 'T' : 'F'); }
          out.add(n <= 10 ? sb.toString() : "T=" + ok + " F=" + (n - ok));
          break;
        }
        case "par": {
          int T = Integer.parseInt(p[1]), N = Integer.parseInt(p[2]);
          AtomicInteger ok = new AtomicInteger();
          final TokenBucket tb = b;
          Thread[] ts = new Thread[T];
          for (int i = 0; i < T; i++) { ts[i] = new Thread(() -> { for (int k = 0; k < N; k++) if (tb.tryAcquire()) ok.incrementAndGet(); }); ts[i].start(); }
          for (Thread t : ts) t.join();
          out.add("successes=" + ok.get());
          break;
        }
      }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['new:5:1', 'acq:6', 't:2500000000', 'acq:3']], ['TTTTTF', 'TTF']],
        [[['new:2:100', 'acq:3', 't:0', 'acq:1']], ['TTF', 'F']],
        [[['new:3:1000', 'acq:3', 't:1000000000000', 'acq:5']], ['TTT', 'TTTFF']],
        [[['new:1:1', 'acq:1', 't:500000000', 'acq:1', 't:1000000000', 'acq:1']], ['T', 'F', 'T']],
        [[['new:1:1', 'acq:1', 't:-5', 'acq:1']], ['T', 'F']],
        [[['new:1000:1', 'par:64:100']], ['successes=1000']],
        [[['new:1000000:1000000', 'acq:1000001']], ['T=1000000 F=1']],
        [[['new:1000000:1000000', 'acq:1000000', 't:1000000', 'acq:1001']], ['T=1000000 F=0', 'T=1000 F=1']]
      ] },
    solution: {
      approach: `<p>Immutable snapshot + CAS loop. Each attempt computes the bucket state "as of now" from the snapshot and publishes the decremented state only if no other thread changed the snapshot meanwhile. Failure path returns false without writing, so rejected calls are read-only and cheap.</p>`,
      code: `
public class TokenBucket {
    private record State(double tokens, long lastNanos) {}

    private final double capacity, perNano;
    private final LongSupplier clock;
    private final AtomicReference<State> state;

    TokenBucket(double capacity, double perSecond, LongSupplier clock) {
        this.capacity = capacity;
        this.perNano = perSecond / 1_000_000_000.0;
        this.clock = clock;
        this.state = new AtomicReference<>(new State(capacity, clock.getAsLong()));
    }

    boolean tryAcquire() {
        while (true) {
            State s = state.get();
            long now = clock.getAsLong();
            long elapsed = Math.max(0, now - s.lastNanos());
            double tokens = Math.min(capacity, s.tokens() + elapsed * perNano);
            if (tokens < 1.0) return false;                          // read-only rejection
            if (state.compareAndSet(s, new State(tokens - 1.0, now))) return true;
            // another thread changed the bucket: recompute from the fresh snapshot
        }
    }

    public static void main(String[] args) {
        long[] fake = {0};                                           // controllable clock
        TokenBucket b = new TokenBucket(5, 1, () -> fake[0]);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) sb.append(b.tryAcquire()).append(' ');
        System.out.println(sb);                                      // true x5 false
        fake[0] = 2_500_000_000L;                                    // +2.5 s
        System.out.println(b.tryAcquire() + " " + b.tryAcquire() + " " + b.tryAcquire()); // true true false
    }
}`,
      complexity: `<p>O(1) expected per call; retries only under contention. Each success allocates one small record (cheap for the young GC). For extreme rates, shard buckets per thread/core and split the capacity.</p>`,
      followUps: ['Make it distributed across servers (Redis + Lua script, or a gateway)', 'Implement a sliding-window log limiter and compare memory', 'Add blocking acquire() that sleeps exactly until the next token']
    }
  });

  practice.push({
    title: 'Implement a Reusable CyclicBarrier',
    level: 'Hard', tags: ['ReentrantLock', 'Condition', 'generations', 'barrier'], companies: ['Google', 'Two Sigma', 'Citadel'],
    statement: `<p>Implement ${C('class MyBarrier')} with ${C('MyBarrier(int parties, Runnable action)')} and ${C('int await()')}: blocks until ${C('parties')} threads have called it, runs ${C('action')} once (in the last arriving thread), releases everyone, and <b>automatically resets</b> for the next round. Return the arrival index (parties − 1 for the first, 0 for the last), like the JDK.</p>`,
    constraints: `2 ≤ parties ≤ 1000, many rounds. Spurious wakeups must not release threads early. A slow thread from round k must never be confused with round k + 1.`,
    example: `<p>parties = 3, two rounds: T1, T2 wait; T3 arrives → action prints "round done" → all three return; immediately T1 arrives for round 2 and waits again (count was reset to 3).</p>`,
    brute: { why: `<p>A version that waits with ${C('while (count > 0) cond.await()')} and resets ${C('count = parties')} when the last arrives has a bug: the reset happens before the woken threads re-check the condition, so they see count = parties again and go back to sleep forever. You need a way to tell rounds apart.</p>`, code: `
class BuggyBarrier {
    private final int parties; private int count;
    private final ReentrantLock lock = new ReentrantLock(); private final Condition trip = lock.newCondition();
    BuggyBarrier(int parties) { this.parties = parties; this.count = parties; }
    void await() throws InterruptedException {
        lock.lock();
        try {
            if (--count == 0) { count = parties; trip.signalAll(); return; }   // reset too early ...
            while (count > 0) trip.await();                                    // ... waiters never see 0
        } finally { lock.unlock(); }
    }
}` },
    mcq: { q: 'What is the purpose of the "generation" object in CyclicBarrier?', options: ['To count parties', 'To let waiters recognise that their round has finished even after the count was reset', 'To store the barrier action', 'To make the barrier fair'], answer: 1, explain: 'A waiter remembers the generation it arrived in and leaves when the current generation differs — independent of the reset counter.' },
    hints: [`<p>Hint 1: keep a ${C('Generation')} object (or a long round number). Each waiter remembers the one it arrived in.</p>`, `<p>Hint 2: last arrival: run action, create a new generation, reset count, ${C('signalAll()')}.</p>`, `<p>Hint 3: waiters loop ${C('while (g == generation) trip.await();')} — the spurious-wakeup-safe condition is "still my round".</p>`],
    tests: { sig: 'int int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(int parties, int rounds) throws Exception {
    AtomicInteger actions = new AtomicInteger();
    Thread[] actionThread = new Thread[rounds];
    MyBarrier b = new MyBarrier(parties, () -> { int r = actions.getAndIncrement(); if (r < rounds) actionThread[r] = Thread.currentThread(); });
    int[][] idx = new int[rounds][parties];
    Thread[][] zero = new Thread[rounds][1];
    AtomicInteger early = new AtomicInteger();
    Thread[] ts = new Thread[parties];
    for (int t = 0; t < parties; t++) {
      final int id = t;
      ts[t] = new Thread(() -> {
        try {
          for (int r = 0; r < rounds; r++) {
            int i = b.await();
            idx[r][id] = i;
            if (i == 0) zero[r][0] = Thread.currentThread();
            if (actions.get() < r + 1) early.incrementAndGet();
          }
        } catch (InterruptedException e) { }
      });
      ts[t].start();
    }
    for (Thread t : ts) t.join();
    boolean idxOk = true, whoOk = true;
    for (int r = 0; r < rounds; r++) {
      boolean[] seen = new boolean[parties];
      for (int i : idx[r]) { if (i < 0 || i >= parties || seen[i]) idxOk = false; else seen[i] = true; }
      if (zero[r][0] != actionThread[r]) whoOk = false;
    }
    return new String[]{ String.valueOf(actions.get()), String.valueOf(idxOk), String.valueOf(whoOk), String.valueOf(early.get()) };
  }
}` }, cases: [
        [[3, 2], ['2', 'true', 'true', '0']],
        [[2, 1], ['1', 'true', 'true', '0']],
        [[3, 1], ['1', 'true', 'true', '0']],
        [[2, 1000], ['1000', 'true', 'true', '0']],
        [[10, 100], ['100', 'true', 'true', '0']],
        [[1000, 3], ['3', 'true', 'true', '0']],
        [[5, 500], ['500', 'true', 'true', '0']],
        [[2, 20000], ['20000', 'true', 'true', '0']]
      ] },
    solution: {
      approach: `<p>Generation counting under a single lock. The last arriving thread advances the generation; waiters compare their saved generation with the current one, so resets can never confuse them. (The JDK version also handles breaking on interrupt/timeout.)</p>`,
      code: `
public class MyBarrier {
    private final int parties;
    private final Runnable action;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition trip = lock.newCondition();
    private int waiting;              // how many still to arrive in this round
    private long generation;          // round number

    MyBarrier(int parties, Runnable action) {
        this.parties = parties;
        this.action = action;
        this.waiting = parties;
    }

    int await() throws InterruptedException {
        lock.lock();
        try {
            long myGen = generation;
            int index = --waiting;
            if (index == 0) {                         // last one in
                if (action != null) action.run();
                generation++;                         // new round
                waiting = parties;                    // reset
                trip.signalAll();
                return 0;
            }
            while (myGen == generation) trip.await(); // safe against spurious wakeups
            return index;
        } finally {
            lock.unlock();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger rounds = new AtomicInteger();
        MyBarrier b = new MyBarrier(3, () -> System.out.println("round " + rounds.incrementAndGet() + " done"));
        List<Thread> ts = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            Thread t = new Thread(() -> {
                try { for (int r = 0; r < 2; r++) b.await(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            });
            ts.add(t);
            t.start();
        }
        for (Thread t : ts) t.join();
        System.out.println("rounds = " + rounds.get());   // 2
    }
}`,
      complexity: `<p>O(1) per await plus an O(parties) signalAll per round.</p>`,
      followUps: ['Add a timeout and "broken" state like the JDK (BrokenBarrierException for all waiters)', 'Implement it with wait/notifyAll', 'How does Phaser avoid the single lock for thousands of parties?']
    }
  });

  practice.push({
    title: 'Multithreaded Web Crawler (Same-Host, No Duplicates)',
    level: 'Hard', tags: ['virtual threads', 'ConcurrentHashMap', 'Phaser', 'LeetCode 1242'], companies: ['Dropbox', 'Google', 'Bloomberg', 'Anthropic'],
    statement: `<p>Given a start URL and an ${C('HtmlParser')} whose ${C('getUrls(url)')} is a slow blocking call, return all URLs reachable from the start URL that share its hostname. Crawl concurrently (each fetch in its own thread), visit each URL <b>once</b>, and return only when the crawl is complete — you do not know the number of pages in advance.</p>`,
    constraints: `Up to 1000 URLs, getUrls takes ~15 ms each; result order does not matter.`,
    example: `<p>start "http://news.ex.com/a" links to /b, /c and "http://other.org/x"; /b links back to /a → ${H.c('g', '{/a, /b, /c on news.ex.com}')}; other.org is ignored; /a is not fetched twice.</p>`,
    brute: { why: `<p>Sequential BFS is correct but 1000 × 15 ms = 15 s. A naive concurrent version uses a plain HashSet (race: two threads both see "not visited" and crawl twice) and a ${C('Thread.sleep(1000)')} "probably done by now" instead of real completion tracking.</p>`, code: `
interface HtmlParser { List<String> getUrls(String url); }

static List<String> crawlSequential(String start, HtmlParser parser) {
    String host = start.split("/")[2];
    Set<String> seen = new HashSet<>(List.of(start));
    Deque<String> frontier = new ArrayDeque<>(List.of(start));
    while (!frontier.isEmpty()) {
        for (String next : parser.getUrls(frontier.poll())) {
            if (next.split("/")[2].equals(host) && seen.add(next)) frontier.add(next);
        }
    }
    return new ArrayList<>(seen);
}` },
    mcq: { q: 'Tasks spawn new tasks and you do not know the total in advance. Which tool tracks completion?', options: ['CountDownLatch with a guessed count', 'Phaser: register before submitting each child task, arriveAndDeregister when a task finishes; the main thread waits for the phase to advance', 'Thread.sleep until the set stops growing', 'CyclicBarrier(1000)'], answer: 1, explain: 'A Phaser supports a dynamic number of parties. Registering a child before the parent deregisters guarantees the count never hits zero early. (Alternatives: an AtomicInteger of pending tasks plus a latch, or ForkJoin/structured tasks.)' },
    hints: [`<p>Hint 1: visited = ${C('ConcurrentHashMap.newKeySet()')}; ${C('visited.add(url)')} is an atomic "claim" — only the thread that gets true crawls it.</p>`, `<p>Hint 2: completion = Phaser. Main registers itself; before submitting a child, ${C('phaser.register()')}; at the end of each task, ${C('arriveAndDeregister()')}. Main: ${C('arriveAndAwaitAdvance()')}.</p>`, `<p>Hint 3: blocking fetches → ${C('newVirtualThreadPerTaskExecutor()')}. Register children <b>before</b> the parent arrives, otherwise the party count can drop to zero too early.</p>`],
    tests: { sig: 'string[] string -> list<string>', fn: 'chk', harness: { java: `
class Check {
  static List<String> chk(String[] edges, String start) {
    Map<String, List<String>> web = new HashMap<>();
    if (edges.length == 1 && edges[0].startsWith("chain:")) {
      int n = Integer.parseInt(edges[0].substring(6));
      for (int i = 0; i < n; i++) web.put("http://h.com/p" + i, i + 1 < n ? List.of("http://h.com/p" + (i + 1), "http://other.org/x") : List.of());
    } else if (edges.length == 1 && edges[0].startsWith("star:")) {
      int n = Integer.parseInt(edges[0].substring(5));
      List<String> kids = new ArrayList<>();
      for (int i = 1; i < n; i++) { kids.add("http://h.com/p" + i); web.put("http://h.com/p" + i, List.of("http://h.com/p0", "http://h.com/p" + ((i % (n - 1)) + 1))); }
      web.put("http://h.com/p0", kids);
    } else {
      for (String e : edges) { String[] p = e.split(">", -1); web.put(p[0], p[1].isEmpty() ? List.of() : Arrays.asList(p[1].split(","))); }
    }
    Crawler2.HtmlParser parser = url -> web.getOrDefault(url, List.of());
    List<String> found = new ArrayList<>(Crawler2.crawl(start, parser));
    Collections.sort(found);
    if (edges.length == 1 && (edges[0].startsWith("chain:") || edges[0].startsWith("star:"))) return List.of(String.valueOf(found.size()), String.valueOf(new HashSet<>(found).size()));
    return found;
  }
}` }, cases: [
        [[['http://news.ex.com/a>http://news.ex.com/b,http://news.ex.com/c,http://other.org/x', 'http://news.ex.com/b>http://news.ex.com/a', 'http://news.ex.com/c>'], 'http://news.ex.com/a'], ['http://news.ex.com/a', 'http://news.ex.com/b', 'http://news.ex.com/c']],
        [[['http://a.com/x>'], 'http://a.com/x'], ['http://a.com/x']],
        [[['http://a.com/x>http://a.com/x'], 'http://a.com/x'], ['http://a.com/x']],
        [[['http://a.com/x>http://a.com/y', 'http://a.com/y>http://a.com/z', 'http://a.com/z>http://a.com/x'], 'http://a.com/x'], ['http://a.com/x', 'http://a.com/y', 'http://a.com/z']],
        [[['http://a.com/x>http://b.a.com/y,http://a.com.evil/z,http://other.org/q'], 'http://a.com/x'], ['http://a.com/x']],
        [[['http://a.com/x>http://a.com/y,http://a.com/y,http://a.com/y'], 'http://a.com/x'], ['http://a.com/x', 'http://a.com/y']],
        [[['chain:1000'], 'http://h.com/p0'], ['1000', '1000']],
        [[['star:1000'], 'http://h.com/p0'], ['1000', '1000']]
      ] },
    solution: {
      approach: `<p>Thread-per-URL on virtual threads, an atomic claim set for de-duplication, and a Phaser for dynamic completion tracking. The phase advances only when every registered task (including ones registered by other tasks) has arrived.</p>`,
      code: `
public class Crawler2 {
    interface HtmlParser { List<String> getUrls(String url); }

    static String host(String url) { return url.split("/")[2]; }

    static List<String> crawl(String start, HtmlParser parser) {
        String host = host(start);
        Set<String> visited = ConcurrentHashMap.newKeySet();
        Phaser phaser = new Phaser(1);                     // main thread is a party
        try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
            visited.add(start);
            submit(start, host, parser, visited, phaser, ex);
            phaser.arriveAndAwaitAdvance();                // wait for every (dynamic) task
        }
        return new ArrayList<>(visited);
    }

    static void submit(String url, String host, HtmlParser parser, Set<String> visited, Phaser phaser, ExecutorService ex) {
        phaser.register();                                 // register BEFORE starting the child
        ex.execute(() -> {
            try {
                for (String next : parser.getUrls(url)) {  // slow blocking call
                    if (host(next).equals(host) && visited.add(next)) {
                        submit(next, host, parser, visited, phaser, ex);
                    }
                }
            } finally {
                phaser.arriveAndDeregister();              // this task is done
            }
        });
    }

    public static void main(String[] args) {
        Map<String, List<String>> web = Map.of(
                "http://news.ex.com/a", List.of("http://news.ex.com/b", "http://news.ex.com/c", "http://other.org/x"),
                "http://news.ex.com/b", List.of("http://news.ex.com/a"),
                "http://news.ex.com/c", List.of());
        HtmlParser parser = url -> {
            try { Thread.sleep(15); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return web.getOrDefault(url, List.of());
        };
        List<String> found = crawl("http://news.ex.com/a", parser);
        Collections.sort(found);
        System.out.println(found);
    }
}`,
      complexity: `<p>Each URL fetched once: O(V + E) work. Wall time ≈ depth of the link graph × fetch latency (all pages at the same depth are fetched concurrently). Add a Semaphore to respect politeness limits per host.</p>`,
      followUps: ['Limit to 10 concurrent requests per host', 'Add a max depth and a global deadline', 'Distribute across machines (URL frontier in Kafka, de-dup in Redis/Bloom filter)']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: `A ThreadPoolExecutor has core = 2, max = 10 and an <b>unbounded</b> LinkedBlockingQueue. 1,000 long tasks are submitted at once. How many threads run them?`, options: ['2', '10', '1,000', 'It depends on the CPU count'], answer: 0, explain: `The pool only grows past core when the queue rejects an offer. An unbounded queue never rejects, so the pool stays at 2 threads and 998 tasks wait in the queue.` },
    { q: `What happens to an exception thrown inside a task passed to ${C('submit()')} if nobody calls ${C('get()')}?`, options: ['It is printed to stderr', 'It kills the JVM', 'It is stored in the Future and silently lost', 'The pool retries the task'], answer: 2, explain: `submit wraps the task in a FutureTask, which catches the exception and stores it as the outcome. Only get() rethrows it (wrapped in ExecutionException).` },
    { q: `${C('f.get(1, SECONDS)')} throws TimeoutException. What is the state of the task?`, options: ['Cancelled automatically', 'Possibly still running — you should cancel it if you no longer need it', 'Finished with an error', 'Restarted'], answer: 1, explain: `A timeout only ends your waiting. The task keeps running; call f.cancel(true) to interrupt it (which helps only if the task responds to interrupts).` },
    { q: `Which is TRUE about ReentrantLock compared with synchronized?`, options: ['It releases automatically when an exception is thrown', 'It supports tryLock, timed and interruptible acquisition, fairness and multiple Conditions', 'It is always much faster', 'It is not reentrant'], answer: 1, explain: `Those are exactly the extra capabilities. You must unlock in finally yourself; performance is similar when uncontended.` },
    { q: `Two threads hold the read lock of a ReentrantReadWriteLock. One of them calls ${C('writeLock().lock()')} without releasing its read lock. What happens?`, options: ['It upgrades immediately', 'It waits until the other reader leaves, then upgrades', 'It blocks forever — read-to-write upgrade is not supported', 'It throws IllegalMonitorStateException'], answer: 2, explain: `The write lock requires zero readers, including the caller itself. Since it never releases its own read lock, it waits forever. Downgrading (write → read) is the supported direction.` },
    { q: `What is the key difference between CountDownLatch and CyclicBarrier?`, options: ['Latch is reusable, barrier is not', 'A latch waits for N events and is one-shot; a barrier makes N threads wait for each other and resets for the next round', 'Barrier counts up, latch counts down — otherwise identical', 'Only the latch can time out'], answer: 1, explain: `countDown never blocks and the latch cannot be reset; barrier parties block until all arrive and the barrier then resets automatically.` },
    { q: `A ${C('Semaphore(3)')} is created. A thread that never acquired calls ${C('release()')}. What happens?`, options: ['IllegalMonitorStateException', 'Nothing', 'availablePermits becomes 4 — semaphores do not track owners', 'The call blocks'], answer: 2, explain: `Permits are just a counter. Releasing without acquiring increases it, which is a classic bug that silently raises the concurrency limit.` },
    { q: `Why is ${C('count++')} on a ${C('volatile int')} not thread-safe?`, options: ['volatile variables cannot be incremented', 'volatile guarantees visibility but the read-add-write sequence is still three separate steps that can interleave', 'volatile only works on long', 'It is thread-safe'], answer: 1, explain: `Two threads can read the same value and both write value + 1, losing an update. Use AtomicInteger, LongAdder or a lock.` },
    { q: `In a CAS retry loop, a thread's ${C('compareAndSet(expected, next)')} returns false. What does that mean?`, options: ['Memory is corrupted', 'Another thread changed the value since it was read; re-read and retry', 'The thread must take a lock now', 'The value was null'], answer: 1, explain: `A failed CAS is normal: it means some other thread made progress. The loop re-reads the fresh value and recomputes.` },
    { q: `Which counter scales best for 64 threads incrementing a metric millions of times per second, read once per second?`, options: ['synchronized long', 'AtomicLong', 'LongAdder', 'volatile long'], answer: 2, explain: `LongAdder stripes updates over cells (one per contending thread, padded against false sharing), so writes rarely collide; sum() adds the cells.` },
    { q: `${C('getUser()')} returns ${C('CompletableFuture<User>')} and ${C('getOrders(User)')} returns ${C('CompletableFuture<List<Order>>')}. Which call yields ${C('CompletableFuture<List<Order>>')}?`, options: [C('getUser().thenApply(this::getOrders)'), C('getUser().thenCompose(this::getOrders)'), C('getUser().thenCombine(this::getOrders)'), C('getUser().thenAccept(this::getOrders)')], answer: 1, explain: `thenCompose flattens a function that returns a future (like flatMap). thenApply would give a nested future.` },
    { q: `You call ${C('CompletableFuture.supplyAsync(() -> httpCall())')} with no executor in a busy service. What is the risk?`, options: ['None', 'Blocking I/O runs on ForkJoinPool.commonPool, which has about (cores − 1) threads shared JVM-wide — it can starve parallel streams and other async work', 'It runs on the caller thread', 'It creates a new platform thread per call, always'], answer: 1, explain: `The default async executor is the common pool. Pass a dedicated executor (or a virtual-thread executor) for blocking work.` },
    { q: `Which statement about Java 21 virtual threads is FALSE?`, options: ['They are cheap enough to create one per task', 'They make CPU-bound computations run faster', 'They unmount from their carrier when blocking on most I/O', 'They are always daemon threads'], answer: 1, explain: `Virtual threads make waiting cheap; CPU-bound work is still limited by the number of cores.` },
    { q: `On Java 21, a virtual thread performs a blocking socket read inside a ${C('synchronized')} block. What happens?`, options: ['It unmounts as usual', 'It is pinned: the carrier thread stays blocked too', 'It throws an exception', 'The JVM converts it to a platform thread permanently'], answer: 1, explain: `In Java 21-23 monitors pin the virtual thread to its carrier. Java 24 (JEP 491) removed this limitation; on 21 prefer ReentrantLock around blocking calls.` }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: `Walk me through what happens when you submit a task to a ThreadPoolExecutor.`, level: 'I', a: `<p>Four rules, in order: (1) if fewer than <b>corePoolSize</b> threads are running, start a new thread with this task as its first job (even if other threads are idle); (2) otherwise <b>offer</b> the task to the work queue; (3) if the queue is full and fewer than <b>maximumPoolSize</b> threads exist, start a non-core thread for it; (4) otherwise call the <b>RejectedExecutionHandler</b> (Abort by default, or CallerRuns, Discard, DiscardOldest). Workers loop taking tasks from the queue; non-core threads die after keepAliveTime idle. The consequence people miss: with an unbounded queue the pool never grows past core, and memory becomes the limit.</p>`, followUps: ['Why does newCachedThreadPool use a SynchronousQueue?', 'How would you size the pool for an I/O-bound service?', 'What does allowCoreThreadTimeOut do?'] },
    { q: `Why are Executors.newFixedThreadPool and newCachedThreadPool often banned in production code reviews?`, level: 'I', a: `<p><b>newFixedThreadPool</b> (and newSingleThreadExecutor) use an <b>unbounded LinkedBlockingQueue</b>: if producers outpace consumers, tasks pile up until OutOfMemoryError, and latency grows without bound long before that. <b>newCachedThreadPool</b> has an unbounded <b>maximum</b> pool size with a SynchronousQueue: a burst creates one platform thread per concurrent task — thousands of threads, each with stack memory, context-switch thrashing, or "unable to create native thread". Guidelines such as Alibaba's Java manual require constructing ThreadPoolExecutor explicitly so the queue bound, max threads, thread names and rejection policy are conscious decisions. With Java 21, blocking-I/O work often goes to a virtual-thread-per-task executor plus semaphores instead.</p>`, followUps: ['Which rejection policy gives back-pressure?', 'How do you monitor pool saturation?'] },
    { q: `Explain the difference between Runnable, Callable, Future and FutureTask.`, level: 'B', a: `<p><b>Runnable</b>: ${C('void run()')}, no result, no checked exceptions. <b>Callable&lt;V&gt;</b>: ${C('V call() throws Exception')} — returns a value and may throw. <b>Future&lt;V&gt;</b>: a handle to a pending result with ${C('get')}, timed ${C('get')}, ${C('isDone')}, ${C('cancel')}. <b>FutureTask</b>: a concrete class that is both a Runnable and a Future — it wraps a Callable, runs it once, stores the result or exception, and wakes waiting threads. ${C('ExecutorService.submit')} wraps your task in a FutureTask, which is why exceptions are captured instead of propagating to the worker thread.</p>`, followUps: ['What does cancel(true) actually do?', 'What are Future.state() and resultNow() (Java 19)?'] },
    { q: `When would you choose ReentrantLock over synchronized? Give concrete cases.`, level: 'I', a: `<p>When I need something synchronized can't do: (1) <b>tryLock / timed tryLock</b> to avoid deadlock or to fail fast under load (e.g. "busy, retry" instead of a stuck request); (2) <b>lockInterruptibly</b> so a cancelled task stops waiting; (3) <b>several Conditions</b> on one lock, like notFull/notEmpty in a bounded buffer; (4) <b>fairness</b> when starvation is observed; (5) lock and unlock in different methods/scopes; (6) on Java 21-23 with virtual threads, to avoid <b>pinning</b> around blocking I/O. Otherwise synchronized is simpler, can't leak a held lock, and performs similarly. Always ${C('lock()')} before ${C('try')} and ${C('unlock()')} in ${C('finally')}.</p>`, followUps: ['What is lock barging?', 'What does AQS do?', 'What changed in Java 24 for synchronized and virtual threads?'] },
    { q: `How does ReentrantReadWriteLock work, and when is it a bad idea?`, level: 'A', a: `<p>It keeps a shared read lock and an exclusive write lock on one AQS state word (upper 16 bits: read holds, lower 16 bits: write holds). Many readers can hold it simultaneously; a writer needs zero readers and no other writer. It supports reentrancy, downgrading (write → read) but <b>not upgrading</b> (read → write deadlocks). It's a bad idea when the read section is very short (readers still CAS the shared state, causing cache-line contention — a plain lock or ConcurrentHashMap may be faster), when writes are frequent, or when writers starve under a constant stream of readers in non-fair mode. For hot read paths of small data, StampedLock's optimistic reads or an immutable snapshot in a volatile/AtomicReference (copy-on-write) usually win.</p>`, followUps: ['Explain StampedLock validate()', 'How would you implement a read-mostly config with no locks at all?'] },
    { q: `Compare CountDownLatch, CyclicBarrier, Semaphore and Phaser with a real use case for each.`, level: 'I', a: `<p><b>CountDownLatch(N)</b>: one-shot; threads wait until N events happen. Use: service startup waits for DB, cache and Kafka consumers to be ready; or a start gate in a load test. <b>CyclicBarrier(N)</b>: N threads wait for each other, optional barrier action, auto-reset; breaks for all if one fails. Use: parallel simulation where each step needs all partitions finished. <b>Semaphore(N)</b>: N permits, no ownership. Use: cap concurrent calls to a fragile dependency (bulkhead) or bound an object pool. <b>Phaser</b>: reusable, dynamic number of parties, multiple phases, tiered for scale. Use: a crawler where tasks spawn tasks and you wait for all of them, or phases where workers join and leave.</p>`, followUps: ['What happens if a worker throws before countDown?', 'Why can a CyclicBarrier deadlock in a thread pool?'] },
    { q: `What is CAS, and how do atomic classes use it? What are its downsides?`, level: 'A', a: `<p>Compare-And-Swap is a CPU instruction that atomically checks that a memory location holds an expected value and, if so, writes a new one, reporting success. Atomic classes build lock-free operations from it: read the current value, compute the new one, CAS; on failure (another thread won) re-read and retry. Downsides: (1) under heavy contention many retries waste CPU and the cache line ping-pongs between cores — LongAdder or a lock can be better; (2) it protects only a <b>single</b> variable — multi-field invariants need a lock or an AtomicReference to an immutable object; (3) the <b>ABA</b> problem in pointer-based structures (fixed with AtomicStampedReference/versioning); (4) lock-free code is hard to reason about and test (use jcstress).</p>`, followUps: ['Why does incrementAndGet use LOCK XADD on x86?', 'Explain false sharing and @Contended'] },
    { q: `Explain the ABA problem with an example and how to prevent it.`, level: 'E', a: `<p>In a lock-free stack, thread T1 reads top = A (A.next = B) and prepares CAS(top, A → B). T1 is paused. T2 pops A, pops B, then pushes A back (now A.next = C). T1 resumes: top is A again, so CAS(A, B) <b>succeeds</b> and sets top to B — a node that was already removed. The stack is corrupted even though every CAS "looked right". Prevention: pair the reference with a version stamp (${C('AtomicStampedReference')}) incremented on every change, so the stale CAS fails; or avoid node reuse (in Java, GC helps: a node cannot be recycled while T1 still references it, but logical reuse like pushing the same object back can still cause ABA); or use hazard pointers/epochs in non-GC languages.</p>`, followUps: ['Does Java\'s GC fully eliminate ABA?', 'What is AtomicMarkableReference used for?'] },
    { q: `Design a producer-consumer pipeline in Java. How do you handle shutdown and overload?`, level: 'I', a: `<p>Use a <b>bounded</b> BlockingQueue (ArrayBlockingQueue for predictable memory, LinkedBlockingQueue with a bound for higher throughput thanks to two locks). Producers call ${C('put')} (blocks when full = back-pressure) or ${C('offer(timeout)')} to fail fast and return 503; consumers run in an ExecutorService looping on ${C('take')}. <b>Shutdown</b>: after the last item, put one poison pill per consumer (or have each consumer re-insert the pill), then shutdown + awaitTermination; or use interrupts via shutdownNow for abort. <b>Overload</b>: choose explicitly between buffering (larger queue, higher latency) and shedding (offer with timeout, drop/reject, metrics, alerts). Monitor queue depth and consumer lag. Batching consumers can use ${C('drainTo')}. Across machines, the same pattern becomes Kafka/SQS with consumer groups.</p>`, followUps: ['Why notifyAll instead of notify in a hand-written version?', 'How would you guarantee per-key ordering with many consumers?'] },
    { q: `What is the difference between thenApply, thenCompose, thenCombine, and which thread runs each callback?`, level: 'A', a: `<p>${C('thenApply(fn)')} transforms a result synchronously (map). ${C('thenCompose(fn)')} chains a function that itself returns a CompletableFuture and flattens it (flatMap) — use it for dependent async calls. ${C('thenCombine(other, fn)')} waits for two independent futures and merges both results (zip). Non-Async variants run the callback on the thread that completes the previous stage — or immediately on the <b>calling</b> thread if the stage is already complete. ${C('*Async(fn)')} variants submit the callback to the common pool, ${C('*Async(fn, executor)')} to your executor. So a heavy or blocking callback without Async can stall an I/O thread; and supplyAsync without an executor puts blocking work on the shared commonPool.</p>`, followUps: ['How do exceptions propagate through a chain?', 'Does cancel() interrupt the underlying task?'] },
    { q: `How do you handle errors and timeouts in CompletableFuture chains?`, level: 'A', a: `<p>An exception completes the stage exceptionally; downstream thenApply/thenCompose stages are <b>skipped</b>, and the error propagates wrapped in ${C('CompletionException')}. Recovery operators: ${C('exceptionally(ex -> fallback)')} (only on failure), ${C('handle((v, ex) -> ...)')} (always; can transform both), ${C('exceptionallyCompose')} for an async fallback; ${C('whenComplete')} only observes (logging) and passes the result through. Timeouts (Java 9+): ${C('orTimeout')} fails with TimeoutException, ${C('completeOnTimeout(default)')} supplies a value. Neither stops the underlying work. Place recovery per dependency when the failure of one should not sink the whole result (e.g. each vendor in a price aggregator), and unwrap ${C('getCause()')} when logging.</p>`, followUps: ['What does join() throw vs get()?', 'How would you add retries with backoff?'] },
    { q: `What are virtual threads, how are they implemented, and when should you NOT use them?`, level: 'A', a: `<p>Virtual threads (final in Java 21, JEP 444) are ${C('java.lang.Thread')} instances scheduled by the JVM onto a small ForkJoinPool of <b>carrier</b> platform threads. When a virtual thread blocks in a JDK I/O or locking API, its stack (a continuation) is saved to the heap and it <b>unmounts</b>, freeing the carrier; when ready it remounts, maybe on another carrier. They cost a few hundred bytes to KBs, so millions are feasible and thread-per-request is cheap again, with normal stack traces and debugging. Don't use them for: CPU-bound work (no speed-up), as a pooled resource (create per task; limit concurrency with semaphores), code that blocks inside synchronized on Java 21-23 or in native code (pinning), or code relying on heavy ThreadLocal caches. Remember the real limits move to DB connections, downstream rate limits and CPU.</p>`, followUps: ['What is pinning and how do you detect it?', 'How do ScopedValue and StructuredTaskScope relate to virtual threads?'] },
    { q: `Your service switched to virtual threads and latency got worse under load. How do you investigate?`, level: 'E', a: `<p>Hypotheses and tools: (1) <b>Downstream saturation</b> — with thousands of concurrent virtual threads, the DB connection pool (e.g. Hikari max 20) becomes the queue; check pool wait times and add explicit limits/back-pressure. (2) <b>Pinning</b> — enable JFR and look for ${C('jdk.VirtualThreadPinned')} events (synchronized + I/O in a driver or our code on Java 21-23); fix with ReentrantLock or upgrade to 24+. (3) <b>CPU-bound work</b> on carriers starving others — profile with async-profiler/JFR; move heavy compute to a bounded platform pool. (4) <b>ThreadLocal bloat</b> and GC pressure — heap histograms (${C('jmap -histo')}), GC logs. (5) Use ${C('jcmd <pid> Thread.dump_to_file -format=json')} to see virtual threads and where they wait. Then load-test with realistic dependency latency.</p>`, followUps: ['How would you cap concurrency per downstream?', 'When would you roll back to a platform thread pool?'] },
    { q: `What is thread-starvation deadlock in a pool and how do you avoid it?`, level: 'E', a: `<p>It happens when tasks running in a bounded pool block waiting for other tasks submitted to the <b>same</b> pool. Example: a pool of 4 threads, each running a parent task that submits a child and calls ${C('child.get()')}. All 4 threads are blocked on children that sit in the queue with no free thread to run them — nothing progresses, though no locks are involved. Same with a CyclicBarrier whose party count exceeds the pool size. Avoid it by: using separate pools for parent and child work; never blocking on futures from inside pool tasks (compose with thenCompose instead); using ForkJoinPool, whose join can run other tasks while waiting; sizing pools so parties fit; or using virtual threads, where blocking doesn't consume a scarce pool thread.</p>`, followUps: ['How does ForkJoinPool.join avoid blocking?', 'How would a thread dump reveal this?'] }
  );

  registerModule({
    id: 'java12',
    title: 'Concurrency II: java.util.concurrent',
    intro: `<p>In Concurrency I you met raw threads, ${C('synchronized')}, ${C('volatile')} and ${C('wait/notify')}. They work, but writing real systems with them is like building furniture with only a pocket knife. Java 5 added <b>java.util.concurrent</b> (Doug Lea's toolbox), and Java 8 and 21 sharpened it further. This module walks through every tool interviewers ask about — <b>thread pools</b>, <b>Callable/Future</b>, <b>ReentrantLock/ReadWriteLock</b>, <b>Semaphore/CountDownLatch/CyclicBarrier</b>, <b>atomics and CAS</b>, <b>BlockingQueue producer-consumer</b>, <b>CompletableFuture</b> pipelines and Java 21 <b>virtual threads</b>.</p>
<p>Each topic starts with an everyday analogy, then shows the real mechanism with an animated visualizer (watch a pool fill its queue, a CAS loop retry, a latch count down, virtual threads hop between carrier threads), then goes deep into internals and production traps. You finish with coding exercises and concurrency design problems of the kind asked at Amazon, Google, Uber and fintech firms, plus a bank of quiz and interview questions.</p>`,
    goals: [
      'Configure a ThreadPoolExecutor (core, max, queue, rejection policy) from requirements and explain exactly what happens when it is full',
      'Choose correctly between synchronized, ReentrantLock, ReadWriteLock, StampedLock, atomics and LongAdder — and justify it with contention and fairness trade-offs',
      'Coordinate threads with CountDownLatch, CyclicBarrier, Semaphore and BlockingQueue without hangs or lost signals',
      'Write lock-free code with CAS retry loops and explain ABA, spinning cost and when locks are better',
      'Build async pipelines with CompletableFuture (thenApply/thenCompose/thenCombine/allOf, error handling, timeouts) and avoid common-pool starvation',
      'Use Java 21 virtual threads for high-concurrency I/O and explain carrier threads, mounting, pinning and when not to use them'
    ],
    prereqs: `Java 11 (Concurrency I: threads, synchronized, volatile, happens-before, wait/notify, deadlock basics), Java 7 (Collections), Java 9 (Lambdas &amp; functional interfaces). Comfortable reading generic signatures like ${C('Future<T>')}.`,
    hours: 16,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
