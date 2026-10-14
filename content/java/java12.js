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
        System.out.println(q + " in ~" + (System.currentTimeMillis() - t0) + " ms"); // ~180 ms, not 300
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
        function fr(t, narr, hl, ehl) { frames.push({ narr: '<b>t = ' + t + ' ms</b> — ' + narr, parts: [g(hl, ehl), { type: 'vars', label: 'Stage states', vals: copyObj(st), hl: {} }] }); }
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
        fr(Math.max(to, cEnd, dEnd), 'Lesson: build the graph once, let completions drive it. Try <b>fail=discount</b>, or <b>timeout=150</b>, or make <b>discount=500</b> to see the critical path change.', {});
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
<p><b>Java 21+ perspective:</b> with virtual threads, plain blocking code (${C('var u = fetchUser(); var t = fetchCart(u);')}) is cheap again and far easier to debug (real stack traces). CompletableFuture remains great for fan-out/fan-in and composing libraries that already return futures; structured concurrency (${C('StructuredTaskScope')}, preview in 21-24, finalized in later releases) adds scoped cancellation and error propagation for the same use cases.</p>`,
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
