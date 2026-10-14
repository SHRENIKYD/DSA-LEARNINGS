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
        System.out.println("completed = " + pool.getCompletedTaskCount());
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
<p>Rule: use ${C('synchronized')} for simple cases (less code, can't forget to unlock, JVM-optimized; since Java 21/24 it also works well with virtual threads — see topic 8). Reach for ReentrantLock when you need one of the extra features.</p>
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
