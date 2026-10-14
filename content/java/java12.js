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
        if (core < 1 || max < core || max > 6 || cap > 6 || n < 1 || n > 14) throw new Error('Need 1 ≤ core ≤ max ≤ 6, queue capacity ≤ 6, tasks 1..14');
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
        var guard = 0;
        while ((queue.length || workers.some(function (w) { return w.task; })) && guard++ < 40) {
          var busy = workers.filter(function (w) { return w.task; });
          var wk = busy[0];
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
