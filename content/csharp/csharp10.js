(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C# code is written with String.raw so "\n" stays a C# escape

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function splitOps(input, def) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some steps separated by ";" or spaces — e.g. ' + def);
    var ops = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ops.length > 30) throw new Error('Use at most 30 steps');
    return ops;
  }

  /* ======================================================================
     TOPIC 1 — Threads and the thread pool
     ====================================================================== */
  function poolSim(input) {
    var p = String(input === undefined ? '7 3' : input).trim().split(/[\s,]+/).map(Number);
    var items = p[0], workers = p.length > 1 ? p[1] : 2;
    if (isNaN(items) || items < 1 || items > 12 || isNaN(workers) || workers < 1 || workers > 4) throw new Error('Type "items workers": 1-12 work items, 1-4 pool threads');
    var queue = [], frames = [], busy = [], done = [], t = 0;
    for (var i = 0; i < items; i++) queue.push('job' + i);
    for (var w = 0; w < workers; w++) busy.push(null);
    function draw(narr) {
      var vals = {}; busy.forEach(function (b, k) { vals['pool thread ' + k] = b || 'idle'; });
      var hl = {}; busy.forEach(function (b, k) { hl['pool thread ' + k] = b ? 'cur' : ''; });
      frames.push({ narr: narr, parts: [{ type: 'queue', label: 'Global work queue (ThreadPool.QueueUserWorkItem / Task.Run)', items: queue.slice() }, { type: 'vars', label: 'Worker threads', vals: vals, hl: hl }, { type: 'array', label: 'Completed', values: done.length ? done.slice() : ['(none)'] }] });
    }
    draw(items + ' work items are queued. Creating a thread per item would cost ~1 MB of stack each and OS scheduling overhead; the <b>pool</b> reuses ' + workers + ' threads.');
    while (queue.length || busy.some(function (b) { return b; })) {
      t++;
      busy = busy.map(function (b) { if (b) { done.push(b); } return null; });
      busy = busy.map(function () { return queue.length ? queue.shift() : null; });
      draw('Tick ' + t + ': each free pool thread takes the next item from the queue. Threads are <b>reused</b>, never created per item.');
      if (t > 20) break;
    }
    draw('All done with only ' + workers + ' threads. If an item <b>blocks</b> (Sleep, .Result), its thread is wasted, the queue backs up and the pool slowly injects more threads — thread-pool starvation.');
    return frames;
  }
  topics.push({
    title: 'Threads & the Thread Pool',
    analogy: `<p>A delivery company could hire a new courier for every parcel and fire them after one trip — expensive hiring paperwork every time (creating a thread). Instead it keeps a <b>pool of couriers</b> waiting at the depot; each takes the next parcel from the queue, delivers it, and comes back for another. If a courier sits in a café waiting for a customer to call back (a blocking call), parcels pile up and the depot has to hire more couriers, slowly.</p>`,
    explain: `<p>A <b>thread</b> is an OS-scheduled path of execution with its own stack. Creating one is relatively expensive (stack memory, kernel object, scheduling), so .NET offers the <b>thread pool</b>: a set of reusable worker threads that run short work items. ${C('Task.Run')}, async continuations, timers, ${C('Parallel')} and PLINQ all use it.</p>
${P(`
var t = new Thread(() => Console.WriteLine($"dedicated thread {Environment.CurrentManagedThreadId}"))
{
    IsBackground = true,        // does not keep the process alive
    Name = "worker"
};
t.Start();
t.Join();                       // wait for it to finish

ThreadPool.QueueUserWorkItem(_ => Console.WriteLine("pool work item"));
await Task.Run(() => Console.WriteLine("pool via Task.Run"));`)}
<h4>Dedicated thread or pool?</h4>
${H.table(['Use', 'When'], [
      [C('Task.Run') + ' / pool', 'short CPU work, the default for almost everything'],
      [C('new Thread') + ' or ' + C('TaskCreationOptions.LongRunning'), 'long-lived loops that block (a message pump, a legacy blocking reader), work needing a specific apartment state, priority or stack size'],
      ['async I/O', 'waiting for network, disk, timers — no thread at all while waiting']
    ])}
<h4>Thread basics you should know</h4>
<ul><li>Foreground threads keep the process alive; background threads (all pool threads) do not.</li>
<li>${C('Join()')} waits for a thread to finish; ${C('Thread.Sleep')} blocks it (in async code use ${C('await Task.Delay')}).</li>
<li>Exceptions escaping a thread's delegate (pool or dedicated) crash the process — catch inside.</li>
<li>${C('Thread.Abort')} is not supported in .NET Core; stop threads cooperatively with a ${C('CancellationToken')}.</li>
<li>${C('[ThreadStatic]')} and ${C('ThreadLocal<T>')} give per-thread storage; ${C('AsyncLocal<T>')} flows with async calls instead.</li></ul>
<h4>How the pool grows</h4>
<p>The pool starts with as many worker threads as CPU cores (${C('ThreadPool.GetMinThreads')}). When work items keep the threads busy, a hill-climbing algorithm adds threads gradually to maximise throughput; blocked threads look like busy ones, which is why blocking calls in pool work lead to <b>starvation</b>. Each worker has a local queue and steals work from others when idle.</p>`,
    clues: ['Short CPU-bound job → Task.Run (thread pool)', 'Long-running blocking loop → dedicated Thread or LongRunning', 'Waiting on I/O → async/await, not a thread', 'Latency spikes with low CPU under load → blocked pool threads (starvation)'],
    code: [{ lang: 'csharp', run: true, title: 'Dedicated threads vs pool work (runnable)', code: R`
var results = new int[4];
var threads = new Thread[4];
for (int i = 0; i < threads.Length; i++)
{
    int id = i;                                   // capture a copy, not the loop variable
    threads[i] = new Thread(() => results[id] = id * id) { IsBackground = true };
    threads[i].Start();
}
foreach (var t in threads) t.Join();
Console.WriteLine("dedicated threads: " + string.Join(",", results));

ThreadPool.GetMinThreads(out int minWorkers, out _);
Console.WriteLine($"pool min worker threads >= 1: {minWorkers >= 1}");

var ids = new System.Collections.Concurrent.ConcurrentBag<int>();
await Task.WhenAll(Enumerable.Range(0, 100).Select(_ => Task.Run(() => ids.Add(Environment.CurrentManagedThreadId))));
Console.WriteLine($"100 work items ran on {ids.Distinct().Count()} pool threads (reused)");` }],
    codeTitle: ['new Thread, Join and the pool'],
    viz: { title: 'A small pool serving a queue of work', input: '7 3', inputLabel: '"items workers"', gen: poolSim },
    examples: [
      { title: 'Background vs foreground', html: `<p>A foreground thread keeps the process running after Main returns; mark helper threads as background unless they must finish. Here we join, so it completes either way.</p>`, code: R`
var fg = new Thread(() => { Thread.Sleep(20); Console.WriteLine("foreground finished"); });
fg.Start();
Console.WriteLine($"IsBackground = {fg.IsBackground}");
fg.Join();` },
      { title: 'Catch exceptions inside thread code', html: `<p>An unhandled exception on any thread terminates the process. Wrap the body, or use tasks, which capture exceptions for the awaiting code.</p>`, code: R`
Exception? error = null;
var t = new Thread(() =>
{
    try { throw new InvalidOperationException("worker failed"); }
    catch (Exception e) { error = e; }
});
t.Start(); t.Join();
Console.WriteLine("captured: " + error?.Message);` },
      { title: 'ThreadLocal for per-thread state', html: `<p>${C('ThreadLocal<T>')} gives each thread its own instance — useful for non-thread-safe helpers like a Random (though ${C('Random.Shared')} is thread-safe since .NET 6).</p>`, code: R`
using var local = new ThreadLocal<int>(() => Environment.CurrentManagedThreadId);
var t = new Thread(() => Console.WriteLine($"worker sees its own id: {local.Value == Environment.CurrentManagedThreadId}"));
t.Start(); t.Join();
Console.WriteLine($"main sees its own id: {local.Value == Environment.CurrentManagedThreadId}");` }
    ],
    deepDive: `<p><b>Thread cost.</b> On Windows a thread reserves 1 MB of stack (commits on demand), on Linux typically 8 MB of virtual address space for the main thread and 1.5 MB for pool threads; context switches cost microseconds and pollute caches. Thousands of threads waste memory and time in the scheduler.</p>
<p><b>Pool internals (.NET 6+).</b> The pool is implemented in managed code (PortableThreadPool) with a global queue, per-worker local queues (LIFO for locality, FIFO stealing), hill climbing to tune the thread count, and a starvation detector that injects a thread roughly every 500 ms when no progress is made. ${C('ThreadPool.SetMinThreads')} raises the burst capacity.</p>
<p><b>IO completion.</b> On Windows, I/O completions arrive on IOCP threads; on Linux, an epoll thread dispatches completions to the worker pool. Either way, no thread waits per pending I/O.</p>
<p><b>Thread affinity.</b> UI frameworks require touching controls from the UI thread (use the SynchronizationContext or Dispatcher). COM STA components need ${C('SetApartmentState(ApartmentState.STA)')} on a dedicated thread.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI defaults to tasks, which is right; but legacy code generation sometimes produces ${C('new Thread')} per request or ${C('Thread.Sleep')} polling loops. <b>Use AI as a partner:</b> <code>Find every blocking call that runs on a thread-pool thread in this service</code>. <b>Where AI goes wrong:</b> capturing loop variables in thread lambdas (classic for-loop closure bug), forgetting Join, unhandled exceptions on threads, using Thread.Abort. <b>What you must still own:</b> deciding which work deserves a dedicated thread and making sure pool threads never block.</p>`,
    problems: [{
      title: 'Chunk Sums on the Thread Pool', level: 'Easy', tags: ['ThreadPool', 'CountdownEvent'], companies: ['Microsoft', 'Intel'],
      statement: `<p>Split ${C('values')} into ${C('k')} contiguous chunks of size ${C('ceil(n / k)')} (chunk t covers indices ${C('[t·size, min(n, (t+1)·size))')}; trailing chunks may be empty). Queue one work item per chunk with ${C('ThreadPool.QueueUserWorkItem')}; each item sums its chunk into its own slot of a ${C('long[]')}. Wait until every item has finished, then return the per-chunk sums.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, 1 ≤ k ≤ 16, |values[i]| ≤ 10<sup>9</sup>`,
      example: `<p>values = [1, 2, 3, 4, 5], k = 2 → size 3 → [6, 9].</p>`,
      brute: { why: `<p>Starting ${C('new Thread')} per chunk works but pays a full thread creation (stack reservation, OS scheduling) for a tiny job. Pool work items reuse warm threads. The catch: QueueUserWorkItem returns no handle, so you need your own completion signal.</p>`, code: R`
static long[] PerThread(int[] a, int k)
{
    int size = (a.Length + k - 1) / k;
    var sums = new long[k];
    var ts = Enumerable.Range(0, k).Select(t => new Thread(() =>
    {
        for (int i = t * size; i < Math.Min(a.Length, (t + 1) * size); i++) sums[t] += a[i];
    })).ToList();
    ts.ForEach(x => x.Start()); ts.ForEach(x => x.Join());
    return sums;
}` },
      mcq: { q: 'You queue work with ThreadPool.QueueUserWorkItem and must read the results afterwards. What is the right way to know the items are done?', options: ['Signal a CountdownEvent (or similar) from each item in a finally block and Wait on it', 'Call Thread.Join on the pool threads', 'Thread.Sleep long enough for the work to finish', 'Check ThreadPool.ThreadCount until it drops to zero'], answer: 0, explain: 'Pool items have no handle to join, and pool threads never exit when the item ends. An explicit signal (CountdownEvent, or tasks via Task.Run + WhenAll) both waits correctly and publishes the writes to the waiting thread.' },
      hints: [`<p>${C('int size = (n + k - 1) / k;')} — integer ceiling division.</p>`, `<p>${C('using var done = new CountdownEvent(k);')} and call ${C('done.Signal()')} in a ${C('finally')} inside each item.</p>`, `<p>Capture a fresh local (${C('int t = c;')}) inside the loop so each item sees its own chunk index. Each item writes only ${C('sums[t]')}, so no lock is needed.</p>`],
      solution: {
        approach: `<p>Each work item owns one slot of the result array, so there is no shared mutable state. CountdownEvent counts down to zero when the last item finishes; Wait both blocks until then and makes the items' writes visible to the caller.</p>`,
        code: R`
public class Solution
{
    public long[] ChunkSums(int[] values, int k)
    {
        int n = values.Length;
        int size = (n + k - 1) / k;
        var sums = new long[k];
        using var done = new CountdownEvent(k);
        for (int c = 0; c < k; c++)
        {
            int t = c;
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    int end = Math.Min(n, (t + 1) * size);
                    for (int i = t * size; i < end; i++) sums[t] += values[i];
                }
                finally { done.Signal(); }
            });
        }
        done.Wait();
        return sums;
    }
}`,
        dry: { head: ['chunk t', 'indices', 'sum', 'countdown after'], rows: [['0', '0..2 → 1+2+3', '6', '1'], ['1', '3..4 → 4+5', '9', '0 → Wait returns']] },
        complexity: `<p>O(n) total work, O(k) extra memory; k pool items instead of k new threads.</p>`,
        followUps: ['Rewrite with Task.Run per chunk and Task.WhenAll', 'What happens if an item throws before Signal and there is no finally?']
      },
      tests: { sig: 'int[] int -> long[]', fn: 'chunkSums', cases: [
        [[[1, 2, 3, 4, 5], 2], [6, 9]], [[[], 3], [0, 0, 0]], [[[7], 4], [7, 0, 0, 0]], [[[-5, 5, 10], 3], [-5, 5, 10]], [[[1000000000, 1000000000, 1000000000], 2], [2000000000, 1000000000]], [[[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 3], [4, 4, 2]]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Race conditions, lock and Monitor
     ====================================================================== */
  function raceSim(input) {
    var s = String(input === undefined ? 'A B A B A B' : input).trim().toUpperCase().split(/[\s,;]+/).filter(Boolean);
    var useLock = s[0] === 'LOCK';
    if (useLock) s = s.slice(1);
    if (!s.length || s.some(function (x) { return x !== 'A' && x !== 'B'; })) throw new Error('Type a schedule of A and B steps, e.g. "A B A B A B" (prefix with "lock" to protect the increment)');
    if (s.length > 12) throw new Error('Use at most 12 steps');
    var code = ['// each thread runs counter++ once:', 'int tmp = counter;   // 1. read', 'tmp = tmp + 1;       // 2. add', 'counter = tmp;       // 3. write'].join('\n');
    var counter = 0, st = { A: { pc: 0, tmp: null }, B: { pc: 0, tmp: null } }, owner = null, frames = [];
    function vals() { return { counter: counter, 'A.tmp': st.A.tmp === null ? '—' : st.A.tmp, 'B.tmp': st.B.tmp === null ? '—' : st.B.tmp, 'lock owner': useLock ? (owner || 'free') : 'no lock' }; }
    frames.push({ narr: 'Two threads A and B each execute <code>counter++</code>, which is really <b>three</b> steps. You choose the interleaving.' + (useLock ? ' The increment is inside <code>lock (gate)</code>.' : ''), parts: [{ type: 'code', lang: 'csharp', code: code, hl: {} }, { type: 'vars', vals: vals() }] });
    s.forEach(function (who) {
      var me = st[who];
      if (me.pc >= 3) { frames.push({ narr: 'Thread ' + who + ' already finished its increment.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: {} }, { type: 'vars', vals: vals() }] }); return; }
      if (useLock && owner && owner !== who) { frames.push({ narr: 'Thread ' + who + ' tries to enter the lock but <b>' + owner + '</b> holds it → ' + who + ' <b>blocks</b>. The scheduler must run ' + owner + '.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: {} }, { type: 'vars', vals: vals(), hl: { 'lock owner': 'bad' } }] }); return; }
      if (useLock && !owner) owner = who;
      var line = me.pc + 2, narr;
      if (me.pc === 0) { me.tmp = counter; narr = who + ' reads counter = ' + counter + '.'; }
      else if (me.pc === 1) { me.tmp = me.tmp + 1; narr = who + ' computes tmp = ' + me.tmp + ' (only in its own register).'; }
      else { counter = me.tmp; narr = who + ' writes counter = ' + me.tmp + '.'; if (useLock) owner = null; }
      me.pc++;
      var hlv = {}; hlv['counter'] = me.pc === 3 ? 'cur' : '';
      frames.push({ narr: narr, parts: [{ type: 'code', lang: 'csharp', code: code, hl: (function () { var h = {}; h[line] = 'cur'; return h; })() }, { type: 'vars', vals: vals(), hl: hlv }] });
    });
    var finished = st.A.pc === 3 && st.B.pc === 3;
    frames.push({ narr: finished ? (counter === 2 ? 'Final counter = <b>2</b>: correct for this schedule.' : 'Final counter = <b>' + counter + '</b>: a <span class="c-r">lost update</span>! Both threads read the same old value. This is a <b>race condition</b>; try "lock A B A B A B".') : 'Not every thread finished — add more A/B steps (each thread needs 3).', parts: [{ type: 'vars', vals: vals(), hl: { counter: finished ? (counter === 2 ? 'ok' : 'bad') : '' } }] });
    return frames;
  }
  topics.push({
    title: 'Race Conditions, lock & Monitor',
    analogy: `<p>Two people update the same shared shopping list on a whiteboard. Both read "milk: 1", both decide to add one, both write "milk: 2" — one purchase is <b>lost</b>. A ${C('lock')} is the single marker pen: only the person holding the pen may read-and-write the list; everyone else waits in line until the pen is put down.</p>`,
    explain: `<p>A <b>race condition</b> happens when the result depends on the timing of threads accessing shared mutable state. ${C('counter++')} is a read, an add and a write; two threads can interleave them and lose updates. Check-then-act (${C('if (!dict.ContainsKey(k)) dict.Add(k, v)')}) is another classic race.</p>
<h4>lock</h4>
${P(`
private readonly object _gate = new();
private int _balance;

public void Deposit(int amount)
{
    lock (_gate)                    // Monitor.Enter(_gate) ... finally Monitor.Exit(_gate)
    {
        _balance += amount;         // only one thread at a time in here
    }
}`)}
<ul><li>${C('lock')} gives <b>mutual exclusion</b> and <b>visibility</b>: writes made inside are visible to the next thread that takes the same lock.</li>
<li>Lock on a private, readonly object you own. Never ${C('lock (this)')}, a ${C('Type')} or a string (others can lock them too).</li>
<li>Locks are <b>reentrant</b>: the owning thread can enter again.</li>
<li>Keep critical sections short; never ${C('await')} inside ${C('lock')} (compile error) — use ${C('SemaphoreSlim')} for async code.</li>
<li>Every access to the shared state, reads included, must use the same lock.</li>
<li>.NET 9 adds a dedicated ${C('System.Threading.Lock')} type; in .NET 8 you lock on an object.</li></ul>
<h4>Monitor.Wait / Pulse: condition waiting</h4>
${P(`
lock (_gate)
{
    while (_queue.Count == 0)       // always a loop: spurious wakeups and competing consumers
        Monitor.Wait(_gate);        // releases the lock and sleeps until pulsed
    item = _queue.Dequeue();
}
// producer
lock (_gate) { _queue.Enqueue(x); Monitor.PulseAll(_gate); }`)}
<h4>Deadlock</h4>
<p>Thread 1 holds lock A and waits for B; thread 2 holds B and waits for A. Prevent it with a <b>global lock order</b> (always take locks in the same order, e.g. by account id), by holding one lock at a time, or with ${C('Monitor.TryEnter(gate, timeout)')}.</p>`,
    clues: ['Shared mutable state written by several threads → protect every access with the same lock', 'Read-modify-write (x++, x += y) on shared fields → lock or Interlocked', 'Two or more locks taken together → fixed global lock order', 'Need to wait for a condition inside a lock → Monitor.Wait in a while loop + PulseAll'],
    code: [{ lang: 'csharp', run: true, title: 'A lost-update race and its fix (runnable)', code: R`
int unsafeCounter = 0, safeCounter = 0;
object gate = new();

var threads = Enumerable.Range(0, 4).Select(_ => new Thread(() =>
{
    for (int i = 0; i < 100_000; i++)
    {
        unsafeCounter++;                 // racy read-modify-write
        lock (gate) safeCounter++;       // protected
    }
})).ToList();
threads.ForEach(t => t.Start());
threads.ForEach(t => t.Join());

Console.WriteLine($"expected 400000, locked = {safeCounter}, unsafe <= 400000: {unsafeCounter <= 400_000}");` }],
    codeTitle: ['counter++ with and without lock'],
    viz: { title: 'Interleave two counter++ operations', input: 'A B A B A B', inputLabel: 'schedule of A/B steps (prefix "lock" to protect)', gen: raceSim },
    examples: [
      { title: 'Check-then-act race', html: `<p>${C('ContainsKey')} followed by ${C('Add')} is two operations; another thread can add in between. Make the pair atomic with a lock (or use ConcurrentDictionary.TryAdd).</p>`, code: R`
var dict = new Dictionary<int, int>();
object gate = new();
Parallel.For(0, 1000, i =>
{
    int key = i % 10;
    lock (gate)
    {
        if (!dict.ContainsKey(key)) dict.Add(key, 0);
        dict[key]++;
    }
});
Console.WriteLine($"keys {dict.Count}, total {dict.Values.Sum()}");` },
      { title: 'Monitor.Wait/PulseAll handoff', html: `<p>A consumer waits inside the lock until the producer puts an item and pulses. Wait releases the lock while sleeping and reacquires it before returning.</p>`, code: R`
var queue = new Queue<int>();
object gate = new();
var consumer = new Thread(() =>
{
    int sum = 0;
    for (int n = 0; n < 3; n++)
    {
        lock (gate)
        {
            while (queue.Count == 0) Monitor.Wait(gate);
            sum += queue.Dequeue();
        }
    }
    Console.WriteLine($"consumer got sum {sum}");
});
consumer.Start();
foreach (var x in new[] { 1, 2, 3 }) lock (gate) { queue.Enqueue(x); Monitor.PulseAll(gate); }
consumer.Join();` },
      { title: 'Avoiding deadlock with lock ordering', html: `<p>Transfers lock both accounts; taking the locks in id order means two opposite transfers can never wait on each other in a cycle.</p>`, code: R`
var a = new Acct(1, 100); var b = new Acct(2, 100);
var t1 = new Thread(() => { for (int i = 0; i < 10_000; i++) Transfer(a, b, 1); });
var t2 = new Thread(() => { for (int i = 0; i < 10_000; i++) Transfer(b, a, 1); });
t1.Start(); t2.Start(); t1.Join(); t2.Join();
Console.WriteLine($"{a.Balance} {b.Balance}");

static void Transfer(Acct from, Acct to, int amt)
{
    var (first, second) = from.Id < to.Id ? (from, to) : (to, from);
    lock (first.Gate) lock (second.Gate) { from.Balance -= amt; to.Balance += amt; }
}
class Acct(int id, int balance) { public int Id = id; public int Balance = balance; public readonly object Gate = new(); }` }
    ],
    deepDive: `<p><b>How lock works.</b> ${C('lock (x)')} compiles to ${C('Monitor.Enter(x, ref lockTaken)')} in a try and ${C('Monitor.Exit(x)')} in finally. A thin lock stores the owner thread id in the object header; under contention it inflates to a sync block with a kernel event. Enter spins briefly before blocking, so short uncontended locks cost ~20 ns.</p>
<p><b>Memory semantics.</b> Monitor.Enter is an acquire and Exit a release fence, so everything written before Exit is visible after the next Enter on the same object. That is why reads also need the lock.</p>
<p><b>Lock convoys and contention.</b> A hot lock serialises all threads; profile with ${C('dotnet-counters')} "Monitor Lock Contention Count". Reduce contention by shrinking critical sections, striping locks (one per bucket), using immutable snapshots or lock-free structures.</p>
<p><b>Async code.</b> Monitor is thread-affine: Exit must happen on the thread that entered, which is why ${C('await')} inside ${C('lock')} is forbidden. ${C('SemaphoreSlim(1, 1)')} with WaitAsync is the async mutex.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes locks readily, but often too narrowly (protecting writes, not reads) or around too much code (I/O under a lock). <b>Use AI as a partner:</b> <code>List all shared mutable fields in this class and which lock protects each access</code>. <b>Where AI goes wrong:</b> ${C('lock (this)')}, locking on strings, nested locks in inconsistent order, holding locks while calling external code or doing I/O, mixing lock and Interlocked on the same field. <b>What you must still own:</b> the invariants each lock protects and a deadlock-free lock order.</p>`,
    problems: [{
      title: 'Fix the Lost Updates', level: 'Easy', tags: ['lock', 'race condition'],
      statement: `<p>Start ${C('threads')} dedicated threads; each increments a shared counter ${C('perThread')} times. Protect the increment with ${C('lock')} so that no update is lost, join all threads and return the counter.</p>`,
      constraints: `1 ≤ threads ≤ 16, 0 ≤ perThread ≤ 10<sup>5</sup>`,
      example: `<p>threads = 4, perThread = 1000 → 4000.</p>`,
      brute: { why: `<p>Without the lock, ${C('counter++')} from several threads loses updates and the result is usually below threads × perThread — and different on every run. Running the threads one after another is correct but gives up all concurrency.</p>`, code: R`
static long Racy(int threads, int perThread)
{
    long counter = 0;
    var ts = Enumerable.Range(0, threads).Select(_ => new Thread(() => { for (int i = 0; i < perThread; i++) counter++; })).ToList();
    ts.ForEach(t => t.Start()); ts.ForEach(t => t.Join());
    return counter;
}` },
      mcq: { q: 'Which statement about `lock (gate) { counter++; }` is true?', options: ['It makes the read-modify-write atomic with respect to other code locking the same gate', 'It makes counter volatile everywhere', 'It prevents other threads from reading counter without the lock', 'It is a no-op on multi-core CPUs'], answer: 0, explain: 'Mutual exclusion only applies among code that takes the same lock; unsynchronised reads elsewhere are still racy.' },
      hints: [`<p>Use a private ${C('object gate = new();')} as the lock object.</p>`, `<p>Create the threads, start them all, then ${C('Join')} each one before reading the result.</p>`, `<p>Use ${C('long')} for the counter: 16 × 10<sup>5</sup> fits in int, but long is a safe habit.</p>`],
      solution: {
        approach: `<p>Each increment runs inside the same lock, so increments are serialised; Join guarantees all threads are done (and their writes visible) before we read.</p>`,
        code: R`
public class Solution
{
    public long CountWithLock(int threads, int perThread)
    {
        long counter = 0;
        object gate = new();
        var workers = new Thread[threads];
        for (int t = 0; t < threads; t++)
        {
            workers[t] = new Thread(() =>
            {
                for (int i = 0; i < perThread; i++)
                {
                    lock (gate) counter++;
                }
            });
            workers[t].Start();
        }
        foreach (var w in workers) w.Join();
        return counter;
    }
}`,
        dry: { head: ['time', 'thread A', 'thread B', 'counter'], rows: [['1', 'enter lock, read 0', 'blocked', '0'], ['2', 'write 1, exit', 'enter lock, read 1', '1'], ['3', 'blocked', 'write 2, exit', '2']] },
        complexity: `<p>O(threads × perThread) total work, serialised on the lock.</p>`,
        followUps: ['Replace the lock with Interlocked.Increment and compare speed', 'Give each thread a local count and add once at the end']
      },
      tests: { sig: 'int int -> long', fn: 'countWithLock', cases: [
        [[4, 1000], 4000], [[1, 0], 0], [[1, 5], 5], [[16, 100000], 1600000], [[2, 50000], 100000], [[8, 1], 8]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Interlocked, volatile and the memory model
     ====================================================================== */
  function casSim(input) {
    var ops = splitOps(input, 'A read; B read; A cas 5; B cas 7; B read; B cas 7');
    var shared = 3, local = { A: null, B: null }, frames = [];
    var code = ['int seen, next;', 'do {', '    seen = Volatile.Read(ref max);', '    if (candidate <= seen) return;', '} while (Interlocked.CompareExchange(ref max, candidate, seen) != seen);'].join('\n');
    frames.push({ narr: 'Lock-free "update maximum" with <b>CompareExchange</b> (CAS). Shared <code>max</code> starts at 3. Steps: "A read", "A cas 5" (A wants to store 5).', parts: [{ type: 'code', lang: 'csharp', code: code, hl: {} }, { type: 'vars', vals: { max: shared, 'A.seen': '—', 'B.seen': '—' } }] });
    ops.forEach(function (op) {
      var m = op.match(/^([AB])\s+(read|cas\s+(-?\d+))$/i);
      if (!m) throw new Error('Steps look like "A read" or "B cas 7" (got "' + op + '")');
      var who = m[1].toUpperCase();
      if (/^read/i.test(m[2])) {
        local[who] = shared;
        frames.push({ narr: who + ' reads max = ' + shared + ' into its local <code>seen</code>.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'cur' } }, { type: 'vars', vals: { max: shared, 'A.seen': local.A === null ? '—' : local.A, 'B.seen': local.B === null ? '—' : local.B } }] });
      } else {
        var cand = +m[3];
        if (local[who] === null) throw new Error(who + ' must read before cas');
        if (cand <= local[who]) { frames.push({ narr: who + '\'s candidate ' + cand + ' ≤ seen ' + local[who] + ' → nothing to do, return.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 4: 'ok' } }, { type: 'vars', vals: { max: shared } }] }); return; }
        if (shared === local[who]) {
          shared = cand;
          frames.push({ narr: '<b>CAS succeeds</b>: max still equals ' + who + '\'s seen value (' + local[who] + '), so it is atomically replaced by ' + cand + '.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 5: 'ok' } }, { type: 'vars', vals: { max: shared, 'A.seen': local.A === null ? '—' : local.A, 'B.seen': local.B === null ? '—' : local.B }, hl: { max: 'ok' } }] });
        } else {
          frames.push({ narr: '<b>CAS fails</b>: max is now ' + shared + ', not ' + local[who] + ' (another thread changed it). Nothing is written; ' + who + ' loops and must read again.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 5: 'bad' } }, { type: 'vars', vals: { max: shared, 'A.seen': local.A === null ? '—' : local.A, 'B.seen': local.B === null ? '—' : local.B }, hl: { max: 'bad' } }] });
        }
        local[who] = null;
      }
    });
    frames.push({ narr: 'No thread ever blocks; a failed CAS just retries with fresh data. The final value is the maximum of everything successfully proposed.', parts: [{ type: 'vars', vals: { max: shared }, hl: { max: 'ok' } }] });
    return frames;
  }
  topics.push({
    title: 'Interlocked, volatile & the .NET Memory Model',
    analogy: `<p>A ticket dispenser at a deli counter hands out numbers with one indivisible pull of the tab — two customers can never get the same number. That is ${C('Interlocked.Increment')}. ${C('CompareExchange')} is a smarter machine: "change the sign from 41 to 42 <b>only if</b> it still says 41"; if someone changed it meanwhile, you look again and retry. ${C('volatile')} is the rule that you must always look at the actual sign, not the copy you memorised a minute ago.</p>`,
    explain: `<h4>Interlocked: atomic operations without locks</h4>
${P(`
Interlocked.Increment(ref _count);                    // atomic ++, returns new value
Interlocked.Add(ref _total, bytes);
long old = Interlocked.Exchange(ref _value, 0);       // set and get previous
int prev = Interlocked.CompareExchange(ref _state, newValue, expected);  // CAS: write only if still expected
long snapshot = Interlocked.Read(ref _total);         // atomic 64-bit read on 32-bit platforms`)}
<p>Each maps to a single CPU instruction (lock xadd, cmpxchg) and is a full memory fence. They are perfect for counters, flags and lock-free updates of <b>one</b> variable. Multi-variable invariants still need a lock.</p>
<h4>The CAS loop pattern</h4>
${P(`
static void UpdateMax(ref int max, int candidate)
{
    int seen;
    do
    {
        seen = Volatile.Read(ref max);
        if (candidate <= seen) return;
    } while (Interlocked.CompareExchange(ref max, candidate, seen) != seen);
}`)}
<h4>Visibility and reordering</h4>
<p>Compilers, the JIT and CPUs reorder and cache memory operations as long as a <i>single</i> thread cannot tell. Another thread can. Without synchronisation, a loop like ${C('while (!_stop) { }')} may never see ${C('_stop = true')} because the JIT hoisted the read out of the loop.</p>
<ul><li>${C('volatile')} fields / ${C('Volatile.Read')} / ${C('Volatile.Write')} give acquire/release semantics: a volatile read is never cached or moved earlier than later reads; a volatile write is never moved after earlier writes.</li>
<li>volatile does <b>not</b> make ${C('x++')} atomic.</li>
<li>lock, Interlocked, Task start/await, Thread.Start/Join and the concurrent collections all imply the necessary fences.</li></ul>
<h4>The .NET memory model in one paragraph</h4>
<p>.NET guarantees: reads and writes of references and of primitive types up to the pointer size are atomic (not ${C('long')}/${C('double')} on 32-bit, not structs); stores are not reordered with other stores on x64/ARM64 in practice under .NET's model (writes have release semantics since .NET Core's documented model), but loads can be reordered with earlier stores, and nothing is guaranteed without a fence for cross-thread ordering of reads. Use the high-level primitives and you rarely need to reason at this level.</p>`,
    clues: ['Shared counter or statistic → Interlocked.Increment / Add', 'Update a single value only if it has not changed (max, state machine, lock-free stack) → CompareExchange loop', 'Stop flag read in a loop by another thread → volatile / Volatile.Read (or a CancellationToken)', 'Invariant across several fields → a lock, not Interlocked'],
    code: [{ lang: 'csharp', run: true, title: 'Interlocked counters and a CAS maximum (runnable)', code: R`
long total = 0;
int max = int.MinValue;
Parallel.For(0, 100_000, i =>
{
    Interlocked.Add(ref total, i);
    UpdateMax(ref max, (i * 7919) % 100_003);
});
Console.WriteLine($"total {total}, max {max}");

var stopper = new Worker();
var t = new Thread(stopper.Run);
t.Start();
Thread.Sleep(20);
stopper.Stop();
t.Join();
Console.WriteLine($"worker stopped after {stopper.Iterations > 0} iterations");

static void UpdateMax(ref int target, int candidate)
{
    int seen;
    do
    {
        seen = Volatile.Read(ref target);
        if (candidate <= seen) return;
    } while (Interlocked.CompareExchange(ref target, candidate, seen) != seen);
}

class Worker
{
    private volatile bool _stop;
    public long Iterations;
    public void Run() { while (!_stop) Iterations++; }
    public void Stop() => _stop = true;
}` }],
    codeTitle: ['Atomic operations and a volatile stop flag'],
    viz: { title: 'Two threads racing with CompareExchange', input: 'A read; B read; A cas 5; B cas 7; B read; B cas 7', inputLabel: 'steps: "A read" or "B cas N"', gen: casSim },
    examples: [
      { title: 'Lazy initialisation with CompareExchange', html: `<p>Several threads may create a candidate, but only the first CAS publishes it; the others use the winner. ${C('LazyInitializer.EnsureInitialized')} packages this pattern.</p>`, code: R`
object? instance = null;
Parallel.For(0, 8, _ =>
{
    var candidate = new object();
    Interlocked.CompareExchange(ref instance, candidate, null);
});
Console.WriteLine(instance is not null);
List<int>? list = null;
LazyInitializer.EnsureInitialized(ref list).Add(1);
Console.WriteLine(list.Count);` },
      { title: 'volatile does not make ++ atomic', html: `<p>Even with a volatile field, ${C('_n++')} is read-modify-write and loses updates; use Interlocked for that.</p>`, code: R`
var c = new Counter();
Parallel.For(0, 100_000, _ => { c.VolatileInc(); c.AtomicInc(); });
Console.WriteLine($"atomic {c.Atomic}, volatile <= 100000: {c.Volatile <= 100_000}");
class Counter
{
    private volatile int _v; private int _a;
    public int Volatile => _v; public int Atomic => _a;
    public void VolatileInc() => _v++;
    public void AtomicInc() => Interlocked.Increment(ref _a);
}` },
      { title: 'Interlocked.Exchange to swap a snapshot', html: `<p>Publishing a new immutable object with one atomic reference write lets readers use a consistent snapshot without locks.</p>`, code: R`
var config = new Config(1);
var reader = Task.Run(() => { for (int i = 0; i < 1000; i++) _ = Volatile.Read(ref config).Version; });
for (int v = 2; v <= 5; v++) Interlocked.Exchange(ref config, new Config(v));
await reader;
Console.WriteLine(config.Version);
record Config(int Version);` }
    ],
    deepDive: `<p><b>Hardware.</b> x64 has a strong model (TSO: only store-load reordering); ARM64 is weak, so missing fences show up on Apple Silicon and ARM servers that "worked on x64". .NET's documented memory model (dotnet/runtime docs/design/specs/Memory-model.md) defines the guarantees across platforms.</p>
<p><b>ABA problem.</b> CAS checks only the value: if it changes A → B → A between your read and CAS, the CAS succeeds although the state changed. In .NET the GC makes ABA rarer for references (a node cannot be reused while referenced), but it matters for indices and pooled objects; add version counters when needed.</p>
<p><b>False sharing.</b> Two counters updated by different threads on the same 64-byte cache line ping-pong between cores. Pad hot fields (${C('[StructLayout(LayoutKind.Explicit, Size = 128)]')}) or use per-thread counters merged later.</p>
<p><b>SpinWait and SpinLock.</b> ${C('SpinWait')} implements smart back-off for CAS loops; ${C('SpinLock')} (a struct, never copy it) can beat Monitor for tiny critical sections but burns CPU under contention.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI sometimes "fixes" races by adding ${C('volatile')}, which only fixes visibility. <b>Use AI as a partner:</b> <code>Is this field accessed with a read-modify-write from multiple threads? Is volatile sufficient?</code> <b>Where AI goes wrong:</b> volatile counters, CAS loops without re-reading, Interlocked on one field of a multi-field invariant, double-checked locking without volatile. <b>What you must still own:</b> the reasoning that each shared variable is either immutable, confined to one thread, or properly synchronised.</p>`,
    problems: [{
      title: 'Lock-Free Maximum', level: 'Medium', tags: ['Interlocked.CompareExchange', 'lock-free'],
      statement: `<p>Split ${C('values')} among ${C('threads')} dedicated threads (thread t handles indices t, t + threads, t + 2·threads, …). Each thread proposes each of its values to a shared maximum using a ${C('CompareExchange')} loop (no locks). Return the final maximum, or ${C('int.MinValue')} for an empty array.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, 1 ≤ threads ≤ 8, values are any ints`,
      example: `<p>values [3, 9, −2, 7], threads 2 → 9.</p>`,
      brute: { why: `<p>${C('values.Max()')} on one thread is simpler and faster for plain arrays — the exercise is the CAS pattern used by lock-free statistics, best-so-far trackers in parallel searches, and state machines.</p>`, code: R`
static int MaxLinq(int[] values) => values.Length == 0 ? int.MinValue : values.Max();` },
      mcq: { q: 'What does `Interlocked.CompareExchange(ref max, cand, seen)` return when another thread changed max after we read it?', options: ['The current (changed) value of max, which differs from seen, so we retry', 'seen', 'cand', 'It throws'], answer: 0, explain: 'It always returns the value that was in the location; equality with the comparand means our write happened.' },
      hints: [`<p>Start with ${C('int max = int.MinValue;')} shared by all threads.</p>`, `<p>Loop: read the current value, stop if the candidate is not larger, otherwise CAS; retry if CAS returned something other than what you read.</p>`, `<p>Join all threads before returning; Join also guarantees visibility of the final value.</p>`],
      solution: {
        approach: `<p>Each proposal reads the current maximum and tries to replace it atomically; a failed CAS means someone else raised it, so re-read and decide again.</p>`,
        code: R`
public class Solution
{
    public int ConcurrentMax(int[] values, int threads)
    {
        int max = int.MinValue;
        var workers = new Thread[threads];
        for (int t = 0; t < threads; t++)
        {
            int start = t;
            workers[t] = new Thread(() =>
            {
                for (int i = start; i < values.Length; i += threads)
                {
                    int candidate = values[i], seen;
                    do
                    {
                        seen = Volatile.Read(ref max);
                        if (candidate <= seen) break;
                    } while (Interlocked.CompareExchange(ref max, candidate, seen) != seen);
                }
            });
            workers[t].Start();
        }
        foreach (var w in workers) w.Join();
        return max;
    }
}`,
        dry: { head: ['step', 'thread', 'seen', 'CAS result'], rows: [['1', 'T0 proposes 3', 'MinValue', 'success → 3'], ['2', 'T1 proposes 9', '3', 'success → 9'], ['3', 'T0 proposes -2', '9', 'not larger → skip'], ['4', 'T1 proposes 7', '9', 'not larger → skip']] },
        complexity: `<p>O(n) proposals; CAS retries only under contention.</p>`,
        followUps: ['Track the index of the maximum too (hint: pack value and index in a long)', 'Compare with a lock and with per-thread maxima merged at the end']
      },
      tests: { sig: 'int[] int -> int', fn: 'concurrentMax', cases: [
        [[[3, 9, -2, 7], 2], 9], [[[], 3], -2147483648], [[[-5], 1], -5], [[[-5, -9, -1], 8], -1], [[{ $range: [0, 100000] }, 8], 99999], [[[2147483647, 0, -2147483648], 3], 2147483647]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 4 — SemaphoreSlim and ReaderWriterLockSlim
     ====================================================================== */
  function rwSim(input) {
    var ops = splitOps(input, 'R1 enter; R2 enter; W1 enter; R3 enter; R1 exit; R2 exit; W1 exit; R3 enter');
    var readers = [], writer = null, waitingW = [], waitingR = [], frames = [];
    function draw(narr, hl) { frames.push({ narr: narr, parts: [{ type: 'vars', label: 'ReaderWriterLockSlim', vals: { 'active readers': readers.join(', ') || '—', 'active writer': writer || '—', 'waiting writers': waitingW.join(', ') || '—', 'waiting readers': waitingR.join(', ') || '—' }, hl: hl || {} }] }); }
    function grant() {
      if (!writer && !readers.length && waitingW.length) { writer = waitingW.shift(); draw('<b>' + writer + '</b> was waiting; now that no reader is active it gets <b>exclusive</b> access.', { 'active writer': 'ok' }); return; }
      if (!writer && !waitingW.length && waitingR.length) { while (waitingR.length) readers.push(waitingR.shift()); draw('No writer pending: waiting readers enter together.', { 'active readers': 'ok' }); }
    }
    draw('Many threads may <b>read</b> at once; a <b>writer</b> needs the lock alone. Steps: "R1 enter", "W1 enter", "R1 exit".');
    ops.forEach(function (op) {
      var m = op.match(/^([RW]\d+)\s+(enter|exit)$/i);
      if (!m) throw new Error('Steps look like "R1 enter" or "W2 exit" (got "' + op + '")');
      var who = m[1].toUpperCase(), isW = who[0] === 'W';
      if (m[2].toLowerCase() === 'enter') {
        if (readers.indexOf(who) >= 0 || writer === who) { draw(who + ' already holds the lock (recursion is disallowed by default — LockRecursionException).', {}); return; }
        if (isW) {
          if (!writer && !readers.length) { writer = who; draw(who + ' enters <b>write</b> mode: nobody else is inside.', { 'active writer': 'ok' }); }
          else { waitingW.push(who); draw(who + ' must wait: ' + (writer ? 'a writer' : 'readers') + ' are active. New readers will now queue behind it (writer preference avoids writer starvation).', { 'waiting writers': 'bad' }); }
        } else {
          if (!writer && !waitingW.length) { readers.push(who); draw(who + ' enters <b>read</b> mode alongside other readers.', { 'active readers': 'ok' }); }
          else { waitingR.push(who); draw(who + ' waits: a writer is active or pending.', { 'waiting readers': 'bad' }); }
        }
      } else {
        if (isW && writer === who) { writer = null; draw(who + ' exits write mode.'); grant(); }
        else if (!isW && readers.indexOf(who) >= 0) { readers.splice(readers.indexOf(who), 1); draw(who + ' exits read mode.'); grant(); }
        else draw(who + ' is not holding the lock (would throw SynchronizationLockException).', {});
      }
    });
    return frames;
  }
  topics.push({
    title: 'SemaphoreSlim & ReaderWriterLockSlim',
    analogy: `<p>A <b>semaphore</b> is a car park with N spaces and a counter at the gate: cars enter while spaces are free and wait at the barrier otherwise; leaving frees a space. A <b>reader/writer lock</b> is a museum room: any number of visitors can look at the paintings at the same time, but when the restorer arrives to repaint one, everyone must leave and nobody enters until the restorer is done.</p>`,
    explain: `<h4>SemaphoreSlim: limit concurrency (and the async mutex)</h4>
${P(`
private readonly SemaphoreSlim _gate = new(initialCount: 3, maxCount: 3);

public async Task<string> FetchAsync(string url, CancellationToken ct)
{
    await _gate.WaitAsync(ct);          // at most 3 callers inside
    try { return await _http.GetStringAsync(url, ct); }
    finally { _gate.Release(); }
}

private readonly SemaphoreSlim _mutex = new(1, 1);   // async-compatible lock
await _mutex.WaitAsync();
try { await SaveAsync(); } finally { _mutex.Release(); }`)}
<ul><li>${C('WaitAsync')} does not block a thread; ${C('Wait')} does. Both accept timeouts and tokens.</li>
<li>Not thread-affine and not reentrant: any thread may Release, and the same caller entering twice uses two slots (deadlock with count 1).</li>
<li>Always Release in finally, exactly once per successful wait.</li>
<li>${C('Semaphore')} (without Slim) is a kernel object usable across processes; prefer Slim in-process.</li></ul>
<h4>ReaderWriterLockSlim: many readers, one writer</h4>
${P(`
private readonly ReaderWriterLockSlim _rw = new();
private readonly Dictionary<string, int> _data = new();

public bool TryGet(string key, out int value)
{
    _rw.EnterReadLock();
    try { return _data.TryGetValue(key, out value); }
    finally { _rw.ExitReadLock(); }
}

public void Set(string key, int value)
{
    _rw.EnterWriteLock();
    try { _data[key] = value; }
    finally { _rw.ExitWriteLock(); }
}`)}
<ul><li>Worth it only when reads vastly outnumber writes <b>and</b> critical sections are not tiny — its overhead is higher than Monitor's.</li>
<li>Upgradeable read mode (${C('EnterUpgradeableReadLock')}) lets one thread read and later upgrade to write without releasing.</li>
<li>Thread-affine (no await inside). Disposable.</li>
<li>Often a better alternative: immutable snapshots swapped atomically, ${C('ConcurrentDictionary')}, or ${C('FrozenDictionary')} for read-only data.</li></ul>
<h4>Other primitives</h4>
${H.table(['Type', 'Purpose'], [
      [C('ManualResetEventSlim'), 'a gate: Set opens it for everyone until Reset'],
      [C('AutoResetEvent'), 'a turnstile: each Set releases one waiter'],
      [C('CountdownEvent'), 'wait until N signals have arrived'],
      [C('Barrier'), 'N threads wait for each other at the end of each phase'],
      [C('Mutex'), 'kernel mutex, can be named and shared across processes']
    ])}`,
    clues: ['At most N operations at once (connections, API calls) → SemaphoreSlim(N) with WaitAsync', 'Mutual exclusion around await → SemaphoreSlim(1, 1), not lock', 'Read-heavy shared data with occasional writes → ReaderWriterLockSlim (or immutable snapshots)', 'Threads must wait for each other per phase → Barrier'],
    code: [{ lang: 'csharp', run: true, title: 'Semaphore limit and reader/writer cache (runnable)', code: R`
var gate = new SemaphoreSlim(2);
object peakGate = new();
int inside = 0, peak = 0;
await Task.WhenAll(Enumerable.Range(0, 10).Select(async i =>
{
    await gate.WaitAsync();
    try
    {
        int now = Interlocked.Increment(ref inside);
        lock (peakGate) peak = Math.Max(peak, now);
        await Task.Delay(10);
        Interlocked.Decrement(ref inside);
    }
    finally { gate.Release(); }
}));
Console.WriteLine($"peak concurrency {peak} (limit 2)");

var cache = new RwCache();
Parallel.For(0, 1000, i =>
{
    if (i % 100 == 0) cache.Set(i / 100, i);
    else cache.Get(i % 10);
});
Console.WriteLine($"entries: {cache.Count}");

sealed class RwCache : IDisposable
{
    private readonly ReaderWriterLockSlim _rw = new();
    private readonly Dictionary<int, int> _d = new();
    public int Get(int k) { _rw.EnterReadLock(); try { return _d.TryGetValue(k, out var v) ? v : -1; } finally { _rw.ExitReadLock(); } }
    public void Set(int k, int v) { _rw.EnterWriteLock(); try { _d[k] = v; } finally { _rw.ExitWriteLock(); } }
    public int Count { get { _rw.EnterReadLock(); try { return _d.Count; } finally { _rw.ExitReadLock(); } } }
    public void Dispose() => _rw.Dispose();
}` }],
    codeTitle: ['SemaphoreSlim and ReaderWriterLockSlim'],
    viz: { title: 'Readers share, writers are exclusive', input: 'R1 enter; R2 enter; W1 enter; R3 enter; R1 exit; R2 exit; W1 exit; R3 enter', inputLabel: 'steps: "R1 enter", "W1 exit", ...', gen: rwSim },
    examples: [
      { title: 'Async mutex with SemaphoreSlim(1, 1)', html: `<p>${C('lock')} cannot contain ${C('await')}; a one-slot semaphore serialises async sections across threads.</p>`, code: R`
var mutex = new SemaphoreSlim(1, 1);
int shared = 0;
await Task.WhenAll(Enumerable.Range(0, 50).Select(async _ =>
{
    await mutex.WaitAsync();
    try { int v = shared; await Task.Yield(); shared = v + 1; }
    finally { mutex.Release(); }
}));
Console.WriteLine(shared);` },
      { title: 'CountdownEvent waits for N signals', html: `<p>The main thread waits until three workers have each signalled once — a simple fork/join without tasks.</p>`, code: R`
using var done = new CountdownEvent(3);
for (int i = 0; i < 3; i++) ThreadPool.QueueUserWorkItem(_ => done.Signal());
done.Wait();
Console.WriteLine("all three signalled");` },
      { title: 'ManualResetEventSlim as a start gate', html: `<p>Threads wait at the gate until Set opens it for all of them at once — useful to start workers simultaneously in tests.</p>`, code: R`
using var start = new ManualResetEventSlim(false);
int ready = 0;
var ts = Enumerable.Range(0, 3).Select(_ => new Thread(() => { start.Wait(); Interlocked.Increment(ref ready); })).ToList();
ts.ForEach(t => t.Start());
start.Set();
ts.ForEach(t => t.Join());
Console.WriteLine($"{ready} threads passed the gate");` }
    ],
    deepDive: `<p><b>SemaphoreSlim internals.</b> It spins briefly, then waits on a lazily created kernel event for synchronous waiters; async waiters are kept in a linked list of task nodes completed by Release (FIFO for async waiters, no fairness guarantee overall).</p>
<p><b>Fairness and starvation.</b> Monitor and SemaphoreSlim are not fair: a releasing thread can re-acquire immediately. ReaderWriterLockSlim prefers writers once one is waiting, so a stream of readers cannot starve writers forever.</p>
<p><b>Why RW locks often lose.</b> Each read acquisition still writes to shared lock state (an interlocked operation on a shared cache line), so with very short reads the lock itself becomes the bottleneck. Copy-on-write snapshots (${C('ImmutableDictionary')}, or a new Dictionary swapped with Interlocked.Exchange) make reads entirely lock-free.</p>
<p><b>Async coordination.</b> For async code use SemaphoreSlim, Channels, TaskCompletionSource-based events, or libraries like Nito.AsyncEx (AsyncLock, AsyncReaderWriterLock).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI correctly reaches for SemaphoreSlim in async code. <b>Use AI as a partner:</b> <code>Check every WaitAsync has exactly one Release in a finally, and that the semaphore is never re-entered by the same flow</code>. <b>Where AI goes wrong:</b> Release outside finally, releasing more than acquired (SemaphoreFullException), recursive acquisition deadlocks with count 1, recommending ReaderWriterLockSlim for tiny critical sections or across awaits. <b>What you must still own:</b> choosing the simplest primitive that matches the access pattern, and measuring before picking a "faster" one.</p>`,
    problems: [{
      title: 'Who Gets a Permit?', level: 'Medium', tags: ['SemaphoreSlim', 'simulation'], companies: ['Microsoft', 'Stripe'],
      statement: `<p>Model a ${C('SemaphoreSlim(permits)')} guarding a resource. Events arrive in order: a positive ${C('id')} means request ${C('id')} asks for a permit; ${C('-id')} means request ${C('id')} (currently holding a permit) releases it. A request that cannot get a permit waits in a FIFO queue; on a release, the oldest waiter is admitted. Return the ids in the order they were admitted. Use a real SemaphoreSlim: ${C('Wait(0)')} for the non-blocking attempt and ${C('Release()')} when nobody is waiting.</p>`,
      constraints: `1 ≤ permits ≤ 100, 0 ≤ events ≤ 10<sup>4</sup>; ids are distinct positive ints and only holders release`,
      example: `<p>permits = 2, events = [1, 2, 3, -1, -2] → 1 and 2 enter, 3 waits, 1 releases → 3 enters → [1, 2, 3].</p>`,
      brute: { why: `<p>Running real threads that call ${C('Wait()')} would make the admission order depend on the scheduler (SemaphoreSlim does not promise FIFO for synchronous waiters), so tests could not be deterministic. Simulating the arrivals and handing a freed permit directly to the oldest waiter makes the rule explicit and repeatable.</p>`, code: R`
static List<int> CountOnly(int permits, int[] events)
{
    int free = permits; var waiting = new Queue<int>(); var order = new List<int>();
    foreach (int e in events)
        if (e > 0) { if (free > 0 && waiting.Count == 0) { free--; order.Add(e); } else waiting.Enqueue(e); }
        else if (waiting.Count > 0) order.Add(waiting.Dequeue());
        else free++;
    return order;
}` },
      mcq: { q: 'A SemaphoreSlim(3) protects calls to a rate-limited API from 50 concurrent async requests. What does it guarantee?', options: ['At most 3 requests are inside the guarded section at any moment', 'Requests are always admitted in arrival order', 'Each request runs on its own thread', 'The 4th WaitAsync throws because no permit is left'], answer: 0, explain: 'A semaphore limits concurrency to its count. Extra callers wait (asynchronously with WaitAsync); it does not throw, and fairness is not guaranteed — if order matters you must model it yourself, as here.' },
      hints: [`<p>On a request: if nobody is waiting and ${C('sem.Wait(0)')} returns true, admit it; otherwise enqueue it.</p>`, `<p>On a release: if the queue is non-empty, pass the permit straight to the head (do not Release — the permit changes hands).</p>`, `<p>Only call ${C('sem.Release()')} when no one is waiting, so ${C('CurrentCount')} never exceeds the initial permits.</p>`],
      solution: {
        approach: `<p>The semaphore holds the free-permit count; a FIFO queue holds waiters. Checking the queue before Wait(0) stops a newcomer from jumping ahead of someone already waiting, and handing a released permit directly to the head of the queue keeps the order fair.</p>`,
        code: R`
public class Solution
{
    public int[] AdmissionOrder(int permits, int[] events)
    {
        using var sem = new SemaphoreSlim(permits, permits);
        var waiting = new Queue<int>();
        var order = new List<int>();
        foreach (int e in events)
        {
            if (e > 0)
            {
                if (waiting.Count == 0 && sem.Wait(0)) order.Add(e);
                else waiting.Enqueue(e);
            }
            else
            {
                if (waiting.Count > 0) order.Add(waiting.Dequeue());
                else sem.Release();
            }
        }
        return order.ToArray();
    }
}`,
        dry: { head: ['event', 'free permits', 'waiting', 'admitted'], rows: [['1', '1', '[]', '[1]'], ['2', '0', '[]', '[1, 2]'], ['3', '0', '[3]', '[1, 2]'], ['-1', '0', '[]', '[1, 2, 3]'], ['-2', '1', '[]', '[1, 2, 3]']] },
        complexity: `<p>O(events) time, O(events) memory for the queue.</p>`,
        followUps: ['Add a timeout: a waiter that is still queued after T events gives up', 'How would WaitAsync with a CancellationToken change the model?']
      },
      tests: { sig: 'int int[] -> int[]', fn: 'admissionOrder', cases: [
        [[2, [1, 2, 3, -1, -2]], [1, 2, 3]], [[1, [1, 2, 3, -1, -2, -3]], [1, 2, 3]], [[1, [1, 2, 3, -1]], [1, 2]], [[3, []], []], [[2, [5, 6, 7, 8, -6, -5]], [5, 6, 7, 8]], [[1, [4, -4, 9, 10, -9]], [4, 9, 10]], [[2, [1, 2, 3, 4, -2]], [1, 2, 3]]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Concurrent collections
     ====================================================================== */
  function getOrAddSim(input) {
    var mode = String(input === undefined ? 'factory' : input).trim().toLowerCase();
    if (['factory', 'lazy'].indexOf(mode) < 0) throw new Error('Type "factory" or "lazy"');
    var frames = [];
    function f(narr, A, B, dict, loads, hl) { frames.push({ narr: narr, parts: [{ type: 'vars', label: 'Threads', vals: { 'thread A': A, 'thread B': B } }, { type: 'map', label: 'ConcurrentDictionary', entries: dict, hl: hl || {} }, { type: 'vars', vals: { 'expensive loads started': loads }, hl: { 'expensive loads started': loads > 1 ? 'bad' : 'ok' } }] }); }
    if (mode === 'factory') {
      f('Both threads call <code>dict.GetOrAdd("k", k => Load(k))</code> at the same moment. The key is missing for both.', 'GetOrAdd("k")', 'GetOrAdd("k")', [], 0);
      f('The factory runs <b>outside</b> the internal lock (to avoid running user code under a lock), so <b>both</b> threads call Load("k").', 'running Load("k")', 'running Load("k")', [], 2);
      f('A finishes first and inserts its value atomically.', 'inserted value A', 'still loading', [['k', 'value A']], 2, { k: 'ok' });
      f('B finishes, tries to insert, sees the key exists, <b>discards</b> its value and returns A\'s. Correct result — but the expensive load ran twice (and any side effects happened twice).', 'returns value A', 'returns value A (own result discarded)', [['k', 'value A']], 2);
    } else {
      f('Store <code>Lazy&lt;T&gt;</code> values: <code>dict.GetOrAdd("k", k => new Lazy&lt;T&gt;(() => Load(k))).Value</code>.', 'GetOrAdd("k")', 'GetOrAdd("k")', [], 0);
      f('Both factories run, but they only create cheap <b>Lazy</b> wrappers — no loading yet.', 'new Lazy A', 'new Lazy B', [], 0);
      f('Only one Lazy is stored; both threads get <b>the same</b> Lazy instance back.', 'got Lazy A', 'got Lazy A (Lazy B discarded)', [['k', 'Lazy A']], 0, { k: 'ok' });
      f('Both call <code>.Value</code>: Lazy\'s ExecutionAndPublication mode runs Load exactly once; the other thread waits for it.', 'runs Load once', 'waits, then gets the same value', [['k', 'Lazy A (value)']], 1);
    }
    return frames;
  }
  topics.push({
    title: 'Concurrent Collections',
    analogy: `<p>An ordinary ${C('Dictionary')} is a paper notebook: fine for one writer, a mess if two people scribble in it at once. Concurrent collections are a <b>bank's ledger system</b> built for many tellers at the same time: each teller's operation is atomic, and the system is organised (striped locks, lock-free queues) so tellers rarely wait for each other.</p>`,
    explain: `<p>The standard collections are <b>not thread-safe</b> for concurrent writes (a Dictionary can even corrupt itself and loop forever). ${C('System.Collections.Concurrent')} provides thread-safe alternatives whose methods are atomic.</p>
${H.table(['Type', 'Use for', 'Key methods'], [
      [C('ConcurrentDictionary<K,V>'), 'shared maps, caches, counters per key', C('TryAdd, TryGetValue, TryRemove, GetOrAdd, AddOrUpdate, TryUpdate')],
      [C('ConcurrentQueue<T>'), 'FIFO hand-off, lock-free', C('Enqueue, TryDequeue, TryPeek')],
      [C('ConcurrentStack<T>'), 'LIFO, lock-free', C('Push, TryPop, PushRange')],
      [C('ConcurrentBag<T>'), 'unordered, per-thread lists — good when the same threads add and remove', C('Add, TryTake')],
      [C('BlockingCollection<T>'), 'bounded producer/consumer with blocking Take (synchronous)', C('Add, Take, CompleteAdding, GetConsumingEnumerable')]
    ])}
<h4>Think in atomic operations</h4>
${P(`
var counts = new ConcurrentDictionary<string, int>();

// WRONG: check-then-act across two calls
if (!counts.ContainsKey(w)) counts[w] = 0;
counts[w]++;                                  // read + write, not atomic

// RIGHT: one atomic operation
counts.AddOrUpdate(w, 1, (_, old) => old + 1);`)}
<ul><li>${C('GetOrAdd')} and ${C('AddOrUpdate')} may call your factory/update delegate <b>more than once</b> under contention (only one result is stored). Keep delegates pure and cheap; use ${C('Lazy<T>')} values for expensive creation.</li>
<li>Enumerating a ConcurrentDictionary is safe while others modify it, but the result is not a snapshot; ${C('Count')} and ${C('ToArray()')} take all internal locks (expensive).</li>
<li>${C('ConcurrentQueue')} and ${C('ConcurrentStack')} never block: TryDequeue simply returns false when empty. For waiting consumers use ${C('BlockingCollection')} (sync) or Channels (async, next topic).</li>
<li>Immutable collections (${C('ImmutableList')}, ${C('ImmutableDictionary')}) are the other thread-safe family: every change returns a new collection, readers never lock.</li></ul>`,
    clues: ['Shared map updated by many threads → ConcurrentDictionary with AddOrUpdate/GetOrAdd', 'Expensive value creation must happen once per key → ConcurrentDictionary of Lazy&lt;T&gt;', 'Queue between threads without waiting → ConcurrentQueue; with waiting → BlockingCollection or Channel', 'Rarely changing data read everywhere → immutable / frozen collections'],
    code: [{ lang: 'csharp', run: true, title: 'Word counts and a shared work queue (runnable)', code: R`
using System.Collections.Concurrent;

string[] docs = { "a b a", "b c", "a c c", "d" };
var counts = new ConcurrentDictionary<string, int>();
Parallel.ForEach(docs, doc =>
{
    foreach (var w in doc.Split(' '))
        counts.AddOrUpdate(w, 1, (_, old) => old + 1);
});
Console.WriteLine(string.Join(" ", counts.OrderBy(p => p.Key).Select(p => $"{p.Key}:{p.Value}")));

var work = new ConcurrentQueue<int>(Enumerable.Range(1, 1000));
long sum = 0;
var workers = Enumerable.Range(0, 4).Select(_ => Task.Run(() =>
{
    while (work.TryDequeue(out int item)) Interlocked.Add(ref sum, item);
})).ToArray();
await Task.WhenAll(workers);
Console.WriteLine($"sum {sum}");` }],
    codeTitle: ['ConcurrentDictionary and ConcurrentQueue'],
    viz: { title: 'GetOrAdd under contention', input: 'factory', inputLabel: '"factory" (plain factory) or "lazy" (Lazy<T> values)', gen: getOrAddSim },
    examples: [
      { title: 'TryUpdate as compare-and-swap per key', html: `<p>${C('TryUpdate(key, newValue, comparisonValue)')} changes the value only if it still equals the comparison value — a per-key CAS.</p>`, code: R`
using System.Collections.Concurrent;
var d = new ConcurrentDictionary<string, int> { ["stock"] = 5 };
bool reserved = false;
while (!reserved)
{
    int current = d["stock"];
    if (current == 0) break;
    reserved = d.TryUpdate("stock", current - 1, current);
}
Console.WriteLine($"reserved {reserved}, left {d["stock"]}");` },
      { title: 'BlockingCollection producer/consumer', html: `<p>A bounded BlockingCollection blocks producers when full and consumers when empty; ${C('CompleteAdding')} ends the consumer's loop.</p>`, code: R`
using System.Collections.Concurrent;
using var bc = new BlockingCollection<int>(boundedCapacity: 2);
var consumer = Task.Run(() => { int s = 0; foreach (var x in bc.GetConsumingEnumerable()) s += x; return s; });
for (int i = 1; i <= 10; i++) bc.Add(i);
bc.CompleteAdding();
Console.WriteLine(await consumer);` },
      { title: 'Immutable snapshot for readers', html: `<p>Writers build a new immutable dictionary and publish it atomically; readers just read the current reference.</p>`, code: R`
using System.Collections.Immutable;
var current = ImmutableDictionary<string, int>.Empty;
ImmutableInterlocked.AddOrUpdate(ref current, "x", 1, (_, v) => v + 1);
ImmutableInterlocked.AddOrUpdate(ref current, "x", 1, (_, v) => v + 1);
Console.WriteLine(current["x"]);` }
    ],
    deepDive: `<p><b>ConcurrentDictionary internals.</b> Buckets are guarded by an array of locks (lock striping, by default proportional to the processor count); reads (TryGetValue) are lock-free thanks to volatile reads of immutable node objects. Writes take the bucket's stripe lock. Resizing takes all locks.</p>
<p><b>ConcurrentQueue.</b> A linked list of fixed-size ring segments with lock-free enqueue/dequeue via Interlocked on head/tail indices. Very fast for many producers and consumers.</p>
<p><b>ConcurrentBag.</b> Each thread has its own local list; TryTake prefers the local list and steals from others otherwise. It is efficient only when the same threads both add and take (work-stealing scenarios); as a general queue it is slower than ConcurrentQueue.</p>
<p><b>Correctness beyond single operations.</b> Atomic methods do not compose: "TryGetValue then TryRemove" is two operations. For multi-step invariants use a lock or design the operation as one atomic call (AddOrUpdate, TryUpdate, TryRemove(KeyValuePair)).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI switches Dictionary to ConcurrentDictionary when it sees threads, which is a start. <b>Use AI as a partner:</b> <code>Which operations here are compound (check-then-act) even though the collection is concurrent?</code> <b>Where AI goes wrong:</b> ContainsKey + indexer sequences, GetOrAdd factories with side effects, relying on Count in hot paths, using ConcurrentBag as a FIFO queue, enumerating expecting a snapshot. <b>What you must still own:</b> identifying the atomic unit of each operation.</p>`,
    problems: [{
      title: 'Count Distinct Ids in Parallel', level: 'Easy', tags: ['ConcurrentDictionary', 'TryAdd'], companies: ['Amazon', 'Microsoft'],
      statement: `<p>Process ${C('ids')} with ${C('Parallel.ForEach')} and return how many distinct ids there are. Record seen ids in a ${C('ConcurrentDictionary<int, byte>')} and count with ${C('Interlocked.Increment')} only when ${C('TryAdd')} succeeds — never use ContainsKey followed by Add.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
      example: `<p>ids = [1, 2, 2, 3, 3, 3] → 3.</p>`,
      brute: { why: `<p>A shared ${C('HashSet')} corrupts under concurrent Add. A ConcurrentDictionary with "if (!ContainsKey) { Add; count++ }" is still a check-then-act race: two threads can both see the key missing and both count it. TryAdd is one atomic step whose result tells exactly one thread it won.</p>`, code: R`
using System.Collections.Concurrent;

static int Racy(int[] ids)
{
    var seen = new ConcurrentDictionary<int, byte>(); int count = 0;
    Parallel.ForEach(ids, id => { if (!seen.ContainsKey(id)) { seen[id] = 0; Interlocked.Increment(ref count); } });
    return count; // may over-count
}` },
      mcq: { q: 'Two threads call dict.TryAdd(42, 0) on the same ConcurrentDictionary at the same time, and 42 is not present. What happens?', options: ['Exactly one call returns true; the other returns false', 'Both return true and the second overwrites the first', 'The second throws ArgumentException', 'Both return false because of the conflict'], answer: 0, explain: 'TryAdd is atomic per key: one insertion wins and reports true, the other sees the key already present and reports false — which is what makes it safe to count wins.' },
      hints: [`<p>${C('if (seen.TryAdd(id, 0)) Interlocked.Increment(ref count);')}</p>`, `<p>${C('seen.Count')} after the loop would also work; counting TryAdd wins shows why the return value matters.</p>`, `<p>Pass the array straight to ${C('Parallel.ForEach')}; the lambda body touches only the dictionary and the counter, both safe to share.</p>`],
      solution: {
        approach: `<p>For each id, TryAdd atomically inserts it if absent. Only the single thread whose TryAdd returns true increments the counter, so each distinct id is counted exactly once regardless of scheduling.</p>`,
        code: R`
using System.Collections.Concurrent;

public class Solution
{
    public int DistinctCount(int[] ids)
    {
        var seen = new ConcurrentDictionary<int, byte>();
        int count = 0;
        Parallel.ForEach(ids, id =>
        {
            if (seen.TryAdd(id, 0)) Interlocked.Increment(ref count);
        });
        return count;
    }
}`,
        dry: { head: ['thread A', 'thread B', 'count'], rows: [['TryAdd(2) → true', 'TryAdd(2) → false', '1'], ['TryAdd(3) → false', 'TryAdd(3) → true', '2']] },
        complexity: `<p>O(n) expected work; O(distinct) memory.</p>`,
        followUps: ['Also return the first index at which each id appeared (hint: AddOrUpdate with Math.Min)', 'Compare speed with a sequential HashSet for small n']
      },
      tests: { sig: 'int[] -> int', fn: 'distinctCount', cases: [
        [[[1, 2, 2, 3, 3, 3]], 3], [[[]], 0], [[[5]], 1], [[[7, 7, 7, 7]], 1], [[[-1, 1, -1, 0]], 3], [[[10, 20, 30, 40, 50, 10, 20, 30]], 5]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Channels
     ====================================================================== */
  function channelSim(input) {
    var ops = splitOps(input, 'write 1; write 2; write 3; read; write 4; read; read; complete; read; read');
    var cap = 2, buf = [], waitingW = [], frames = [], completed = false, got = [];
    function draw(narr, hl) { frames.push({ narr: narr, parts: [{ type: 'queue', label: 'Bounded channel buffer (capacity ' + cap + ')', items: buf.slice(), hl: hl || {} }, { type: 'vars', vals: { 'producer waiting with': waitingW.join(', ') || '—', completed: completed, 'consumer received': got.join(', ') || '—' } }] }); }
    draw('<code>Channel.CreateBounded&lt;int&gt;(2)</code>: a thread-safe async queue. When full, <b>WriteAsync waits</b> (backpressure) instead of growing memory.');
    ops.forEach(function (op) {
      var m;
      if ((m = op.match(/^write\s+(-?\d+)$/i))) {
        if (completed) { draw('WriteAsync after Complete() throws ChannelClosedException.', {}); return; }
        if (buf.length < cap) { buf.push(m[1]); draw('WriteAsync(' + m[1] + ') completes immediately — space in the buffer.', (function () { var h = {}; h[buf.length - 1] = 'ok'; return h; })()); }
        else { waitingW.push(m[1]); draw('Buffer full → WriteAsync(' + m[1] + ') returns an incomplete ValueTask. The producer is <b>suspended</b> (no thread blocked) until a reader makes room.', {}); }
      } else if (/^read$/i.test(op)) {
        if (buf.length) {
          got.push(buf.shift());
          var note2 = '';
          if (waitingW.length) { buf.push(waitingW.shift()); note2 = ' A waiting writer is released and its item enters the buffer.'; }
          draw('ReadAsync takes ' + got[got.length - 1] + ' (FIFO).' + note2, {});
        } else if (completed) draw('Buffer empty and the channel is completed → ReadAllAsync ends (WaitToReadAsync returns false).', {});
        else draw('Buffer empty → ReadAsync waits asynchronously for the next write.', {});
      } else if (/^complete$/i.test(op)) {
        completed = true; draw('<code>writer.Complete()</code>: no more items will come. Readers drain what is left, then their loop ends.', {});
      } else throw new Error('Steps: write N, read, complete (got "' + op + '")');
    });
    return frames;
  }
  topics.push({
    title: 'Channels: Async Producer/Consumer Pipelines',
    analogy: `<p>A sushi conveyor belt between the chef and the customers. The chef places plates (writes), customers take them (reads), and the belt has room for only so many plates: when it is full, the chef <b>pauses</b> instead of piling plates on the floor (backpressure). When the restaurant closes, the chef shouts "last plate!" (Complete) and customers finish what is on the belt and leave.</p>`,
    explain: `<p>${C('System.Threading.Channels')} provides fast, async-first producer/consumer queues: a ${C('ChannelWriter<T>')} for producers and a ${C('ChannelReader<T>')} for consumers.</p>
${P(`
var channel = Channel.CreateBounded<Order>(new BoundedChannelOptions(capacity: 100)
{
    FullMode = BoundedChannelFullMode.Wait,   // or DropOldest / DropNewest / DropWrite
    SingleReader = false,
    SingleWriter = true
});

// producer
async Task ProduceAsync(ChannelWriter<Order> writer, CancellationToken ct)
{
    await foreach (var order in ReadOrdersAsync(ct))
        await writer.WriteAsync(order, ct);   // waits when the channel is full
    writer.Complete();                       // signal: no more items
}

// consumers (start several for parallelism)
async Task ConsumeAsync(ChannelReader<Order> reader, CancellationToken ct)
{
    await foreach (var order in reader.ReadAllAsync(ct))   // ends after Complete + drained
        await ProcessAsync(order, ct);
}`)}
<h4>Why channels</h4>
<ul><li><b>Async</b>: waiting readers and writers do not block threads (unlike BlockingCollection).</li>
<li><b>Backpressure</b>: bounded channels slow producers down when consumers fall behind — memory stays bounded.</li>
<li><b>Completion</b>: ${C('Complete(exception?)')} propagates the end of the stream (and errors) to readers; ${C('reader.Completion')} is a task that completes when everything is drained.</li>
<li><b>Fast</b>: optimised implementations for single reader/writer, ValueTask-based APIs with pooled awaiters.</li></ul>
<h4>Unbounded vs bounded</h4>
<p>${C('Channel.CreateUnbounded<T>()')} never blocks writers (${C('TryWrite')} always succeeds) — simple, but a slow consumer means unbounded memory growth. Prefer bounded channels for anything fed by external input.</p>
<h4>Pipelines</h4>
<p>Chain stages with a channel between each: read → parse → enrich → write, each stage with its own degree of parallelism. Hosted background services in ASP.NET Core typically read from a channel that request handlers write to ("queue work for later").</p>`,
    clues: ['Producer and consumer run at different speeds → bounded Channel for backpressure', 'Background work queued from request handlers → Channel + BackgroundService', 'Multi-stage processing with different parallelism per stage → pipeline of channels', 'Need async waiting (no blocked threads) → Channel instead of BlockingCollection'],
    code: [{ lang: 'csharp', run: true, title: 'Bounded channel with one producer and three consumers (runnable)', code: R`
using System.Threading.Channels;

var channel = Channel.CreateBounded<int>(new BoundedChannelOptions(5) { SingleWriter = true });
long total = 0;
int handled = 0;

var consumers = Enumerable.Range(0, 3).Select(_ => Task.Run(async () =>
{
    await foreach (int x in channel.Reader.ReadAllAsync())
    {
        Interlocked.Add(ref total, x);
        Interlocked.Increment(ref handled);
    }
})).ToArray();

for (int i = 1; i <= 100; i++) await channel.Writer.WriteAsync(i);
channel.Writer.Complete();
await Task.WhenAll(consumers);
Console.WriteLine($"handled {handled}, total {total}");` }],
    codeTitle: ['Fan-out with a bounded channel'],
    viz: { title: 'A bounded channel with backpressure', input: 'write 1; write 2; write 3; read; write 4; read; read; complete; read; read', inputLabel: 'steps: write N | read | complete', gen: channelSim },
    examples: [
      { title: 'Propagating an error through Complete', html: `<p>${C('writer.Complete(exception)')} makes readers' loops throw that exception after draining — errors travel down the pipeline.</p>`, code: R`
using System.Threading.Channels;
var ch = Channel.CreateUnbounded<int>();
await ch.Writer.WriteAsync(1);
ch.Writer.Complete(new InvalidOperationException("source failed"));
try { await foreach (var x in ch.Reader.ReadAllAsync()) Console.WriteLine($"got {x}"); }
catch (InvalidOperationException e) { Console.WriteLine("reader saw: " + e.Message); }` },
      { title: 'DropOldest for latest-value telemetry', html: `<p>When only recent data matters (sensor readings, UI updates), a bounded channel can drop old items instead of making producers wait.</p>`, code: R`
using System.Threading.Channels;
var ch = Channel.CreateBounded<int>(new BoundedChannelOptions(3) { FullMode = BoundedChannelFullMode.DropOldest });
for (int i = 1; i <= 10; i++) ch.Writer.TryWrite(i);
ch.Writer.Complete();
var kept = new List<int>();
await foreach (var x in ch.Reader.ReadAllAsync()) kept.Add(x);
Console.WriteLine(string.Join(",", kept));` },
      { title: 'Two-stage pipeline', html: `<p>Stage 1 squares numbers into a second channel; stage 2 sums them. Each stage completes its output when its input is done.</p>`, code: R`
using System.Threading.Channels;
var numbers = Channel.CreateBounded<int>(4);
var squares = Channel.CreateBounded<int>(4);
var stage1 = Task.Run(async () =>
{
    await foreach (var n in numbers.Reader.ReadAllAsync()) await squares.Writer.WriteAsync(n * n);
    squares.Writer.Complete();
});
var stage2 = Task.Run(async () => { int s = 0; await foreach (var q in squares.Reader.ReadAllAsync()) s += q; return s; });
for (int i = 1; i <= 5; i++) await numbers.Writer.WriteAsync(i);
numbers.Writer.Complete();
await stage1;
Console.WriteLine(await stage2);` }
    ],
    deepDive: `<p><b>Implementation.</b> Bounded channels use a lock-protected Deque plus queues of waiting readers/writers represented by pooled ${C('IValueTaskSource')} objects (AsyncOperation), so steady-state reads and writes allocate nothing. ${C('SingleReader')}/${C('SingleWriter')} enable cheaper specialised paths (e.g. SingleConsumerUnboundedChannel is lock-free).</p>
<p><b>TryRead/TryWrite fast paths.</b> Consumers can drain synchronously: ${C('while (await reader.WaitToReadAsync()) while (reader.TryRead(out var x)) ...')} — this batches work and avoids per-item async overhead.</p>
<p><b>Ordering.</b> One reader sees FIFO order; with several readers, items are processed concurrently and may <i>finish</i> out of order. Partition by key into per-key channels when order matters per entity.</p>
<p><b>Alternatives.</b> TPL Dataflow (BufferBlock, TransformBlock, ActionBlock with bounded capacity and parallelism) offers richer linking; System.IO.Pipelines is specialised for byte streams; Rx for push-based event streams.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI scaffolds a BackgroundService + Channel worker in seconds. <b>Use AI as a partner:</b> <code>What happens to memory if consumers are 10x slower than producers? What happens on shutdown?</code> <b>Where AI goes wrong:</b> unbounded channels fed by user traffic, forgetting writer.Complete (consumers hang forever), swallowing exceptions inside consumers so a crashed consumer silently stops, not awaiting consumer tasks at shutdown. <b>What you must still own:</b> capacity, full-mode policy, error propagation and graceful shutdown.</p>`,
    problems: [{
      title: 'Sum Through a Bounded Channel', level: 'Medium', tags: ['Channel', 'producer/consumer'],
      statement: `<p>A producer writes 1..n into a bounded channel of the given ${C('capacity')}, then completes the writer. ${C('consumers')} concurrent consumers read with ${C('ReadAllAsync')} and add each item into a shared total with ${C('Interlocked')}, also counting items. Return ${C('[count, total]')}.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, 1 ≤ capacity ≤ 1000, 1 ≤ consumers ≤ 8`,
      example: `<p>n = 100, capacity 5, consumers 3 → [100, 5050].</p>`,
      brute: { why: `<p>Summing in a loop is trivial; the exercise is the producer/consumer protocol: bounded buffer, completion, several consumers, and a deterministic result despite nondeterministic interleaving (addition is commutative, so the order items are consumed in does not matter).</p>`, code: R`
static long[] Direct(int n) => new long[] { n, (long)n * (n + 1) / 2 };` },
      mcq: { q: 'What ends `await foreach (var x in reader.ReadAllAsync())`?', options: ['The writer calling Complete() and the buffer being drained', 'The buffer becoming empty once', 'A timeout', 'Disposing the channel'], answer: 0, explain: 'ReadAllAsync waits for more items while the channel is open; it finishes only after completion and when no items remain.' },
      hints: [`<p>${C('var ch = Channel.CreateBounded<int>(capacity);')}</p>`, `<p>Start the consumer tasks <b>before</b> producing, otherwise the producer blocks forever once the buffer is full.</p>`, `<p>After the producer loop: ${C('ch.Writer.Complete(); await Task.WhenAll(consumers);')}</p>`],
      solution: {
        approach: `<p>Start consumers, produce with WriteAsync (which waits when full), complete, and await consumers. Interlocked makes the shared aggregation race-free.</p>`,
        code: R`
using System.Threading.Channels;

public class Solution
{
    public long[] ChannelSum(int n, int capacity, int consumers) => RunAsync(n, capacity, consumers).GetAwaiter().GetResult();

    private static async Task<long[]> RunAsync(int n, int capacity, int consumers)
    {
        var ch = Channel.CreateBounded<int>(capacity);
        long total = 0, count = 0;

        Task[] readers = Enumerable.Range(0, consumers).Select(_ => Task.Run(async () =>
        {
            await foreach (int x in ch.Reader.ReadAllAsync())
            {
                Interlocked.Add(ref total, x);
                Interlocked.Increment(ref count);
            }
        })).ToArray();

        for (int i = 1; i <= n; i++) await ch.Writer.WriteAsync(i);
        ch.Writer.Complete();
        await Task.WhenAll(readers);
        return new[] { count, total };
    }
}`,
        dry: { head: ['event', 'buffer (cap 2)', 'count', 'total'], rows: [['write 1, write 2', '[1, 2]', '0', '0'], ['write 3 waits; C1 reads 1', '[2, 3]', '1', '1'], ['…; Complete; drain', '[]', 'n', 'n(n+1)/2']] },
        complexity: `<p>O(n) items through the channel; memory O(capacity).</p>`,
        followUps: ['Make consumers compute squares and keep results ordered by input index', 'Add cancellation and stop all stages cleanly']
      },
      tests: { sig: 'int int int -> long[]', fn: 'channelSum', cases: [
        [[100, 5, 3], [100, 5050]], [[0, 1, 1], [0, 0]], [[1, 1, 8], [1, 1]], [[100000, 16, 4], [100000, 5000050000]], [[10, 1, 1], [10, 55]], [[1000, 1000, 2], [1000, 500500]]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Parallel and PLINQ
     ====================================================================== */
  function parSim(input) {
    var a = String(input === undefined ? '5 3 8 1 9 2 7 4' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!a.length || a.some(isNaN) || a.length > 16) throw new Error('Type up to 16 numbers');
    var workers = Math.min(4, a.length), size = Math.ceil(a.length / workers), frames = [], locals = [];
    frames.push({ narr: '<code>Parallel.For</code> with <b>thread-local state</b>: the range is split into chunks; each worker sums its chunk into a private local, then merges once.', parts: [{ type: 'array', label: 'input', values: a }] });
    for (var w = 0; w < workers; w++) {
      var lo = w * size, hi = Math.min(a.length, lo + size), s = 0, hl = {};
      for (var i = lo; i < hi; i++) { s += a[i]; hl[i] = 'cur'; }
      locals.push(s);
      frames.push({ narr: 'Worker ' + w + ' handles indices ' + lo + '..' + (hi - 1) + ' → local sum ' + s + '. No shared writes, no contention while working.', parts: [{ type: 'array', label: 'input', values: a, hl: hl }, { type: 'bars', label: 'local sums per worker', values: locals.slice() }] });
    }
    var total = locals.reduce(function (x, y) { return x + y; }, 0);
    frames.push({ narr: 'localFinally: each worker adds its local sum to the total with <b>one</b> Interlocked.Add (or under a lock) → total = ' + total + '. ' + workers + ' synchronised operations instead of ' + a.length + '.', parts: [{ type: 'bars', label: 'local sums', values: locals }, { type: 'vars', vals: { total: total }, hl: { total: 'ok' } }] });
    return frames;
  }
  topics.push({
    title: 'Parallel, PLINQ & Data Parallelism',
    analogy: `<p>Counting the votes of a whole city with one clerk takes all night. Split the ballots into piles, give each pile to a different clerk, let each count <b>privately</b>, and only at the end add the few subtotals together. If instead every clerk walked to one shared tally board after each ballot, they would spend the night queuing at the board — that is what shared state in a parallel loop does.</p>`,
    explain: `<p><b>Data parallelism</b> runs the same operation on many items at once across cores. ${C('System.Threading.Tasks.Parallel')} and PLINQ partition the work and use the thread pool.</p>
${P(`
Parallel.For(0, n, i => results[i] = Compute(i));                 // independent iterations

Parallel.ForEach(files, new ParallelOptions { MaxDegreeOfParallelism = 4 }, file => Process(file));

long total = 0;
Parallel.For(0, data.Length,
    () => 0L,                                         // localInit: per-worker state
    (i, state, local) => local + data[i],             // body: no shared writes
    local => Interlocked.Add(ref total, local));      // localFinally: merge once per worker

int primes = Enumerable.Range(2, 1_000_000).AsParallel().Count(IsPrime);   // PLINQ
var ordered = items.AsParallel().AsOrdered().Select(Transform).ToList();   // keep input order`)}
<h4>Rules for a good parallel loop</h4>
<ul><li>Iterations must be <b>independent</b>; shared writes need synchronisation, which kills speed-up. Use thread-local state and merge at the end.</li>
<li>Work per item must outweigh scheduling overhead; for tiny bodies use range partitioning (${C('Partitioner.Create(0, n)')}) so each task handles a block.</li>
<li>Parallel is for <b>CPU-bound</b> work. For I/O use async (${C('Parallel.ForEachAsync')} or WhenAll with throttling).</li>
<li>Exceptions from iterations are collected into an ${C('AggregateException')}; ${C('state.Stop()')} / ${C('Break()')} end loops early; ${C('ParallelOptions.CancellationToken')} cancels.</li>
<li>Amdahl's law: if 10% of the work is sequential, the maximum speed-up is 10× no matter how many cores.</li></ul>
<h4>PLINQ specifics</h4>
<ul><li>${C('AsParallel()')} turns a LINQ query parallel; ${C('AsOrdered()')} preserves order at some cost; ${C('WithDegreeOfParallelism(n)')}; ${C('ForAll')} consumes results in parallel without merging.</li>
<li>Side effects in PLINQ lambdas run concurrently — keep them pure.</li>
<li>PLINQ may decide to run sequentially if it estimates parallelism will not help.</li></ul>
<p>${C('Parallel.Invoke(a, b, c)')} runs a few independent actions concurrently — the building block for parallel divide-and-conquer (parallel merge sort).</p>`,
    clues: ['Large CPU-bound loop with independent iterations → Parallel.For / ForEach', 'Aggregation (sum, histogram) in parallel → thread-local state with localInit/localFinally', 'Existing LINQ query over lots of CPU work → AsParallel (AsOrdered if order matters)', 'Divide and conquer (sort, tree) → Parallel.Invoke with a sequential threshold'],
    code: [{ lang: 'csharp', run: true, title: 'Parallel sum, PLINQ primes, Parallel.Invoke (runnable)', code: R`
int[] data = Enumerable.Range(1, 1_000_000).ToArray();

long total = 0;
Parallel.For(0, data.Length, () => 0L,
    (i, _, local) => local + data[i],
    local => Interlocked.Add(ref total, local));
Console.WriteLine($"parallel sum {total}");

int primes = Enumerable.Range(2, 200_000).AsParallel().Count(IsPrime);
Console.WriteLine($"primes below 200002: {primes}");

int left = 0, right = 0;
Parallel.Invoke(() => left = data.Take(500_000).Count(x => x % 2 == 0),
                () => right = data.Skip(500_000).Count(x => x % 2 == 0));
Console.WriteLine($"evens {left + right}");

var squares = data.Take(10).AsParallel().AsOrdered().Select(x => x * x).ToArray();
Console.WriteLine(string.Join(",", squares));

static bool IsPrime(int n)
{
    if (n < 2) return false;
    for (int d = 2; (long)d * d <= n; d++) if (n % d == 0) return false;
    return true;
}` }],
    codeTitle: ['Data parallelism toolkit'],
    viz: { title: 'Thread-local partial sums', input: '5 3 8 1 9 2 7 4', inputLabel: 'numbers to sum in parallel', gen: parSim },
    examples: [
      { title: 'Shared writes destroy the speed-up', html: `<p>Locking on every iteration serialises the loop and adds overhead; thread-local accumulation then a single merge scales.</p>`, code: R`
int[] d = Enumerable.Range(0, 2_000_000).ToArray();
object gate = new(); long a = 0, b = 0;
var sw = System.Diagnostics.Stopwatch.StartNew();
Parallel.For(0, d.Length, i => { lock (gate) a += d[i]; });
long locked = sw.ElapsedMilliseconds; sw.Restart();
Parallel.For(0, d.Length, () => 0L, (i, _, l) => l + d[i], l => Interlocked.Add(ref b, l));
Console.WriteLine($"same result: {a == b}; thread-local faster: {sw.ElapsedMilliseconds <= locked}");` },
      { title: 'Range partitioning for tiny bodies', html: `<p>${C('Partitioner.Create(0, n)')} hands out index ranges, so the delegate is invoked once per block instead of once per element.</p>`, code: R`
using System.Collections.Concurrent;
var arr = new double[1_000_000];
Parallel.ForEach(Partitioner.Create(0, arr.Length), range =>
{
    for (int i = range.Item1; i < range.Item2; i++) arr[i] = Math.Sqrt(i);
});
Console.WriteLine(arr[999_999].ToString("F2"));` },
      { title: 'Stopping early and handling exceptions', html: `<p>${C('state.Stop()')} asks the loop to stop scheduling new iterations; exceptions from iterations surface as an AggregateException.</p>`, code: R`
var result = Parallel.For(0, 1000, (i, state) => { if (i == 500) state.Stop(); });
Console.WriteLine($"completed all: {result.IsCompleted}");
try { Parallel.For(0, 10, i => { if (i == 3) throw new InvalidOperationException("bad item"); }); }
catch (AggregateException ae) { Console.WriteLine(ae.InnerExceptions[0].Message); }` }
    ],
    deepDive: `<p><b>Partitioning.</b> Parallel.For uses dynamic range partitioning with growing chunk sizes; ForEach over an IEnumerable uses chunk partitioning with a lock around the enumerator (pass an array/IList or a Partitioner for better performance). PLINQ chooses range, chunk, striped or hash partitioning depending on the operators.</p>
<p><b>Thread injection.</b> Parallel loops may use many pool threads, and long-blocking iterations make the pool inject more; set MaxDegreeOfParallelism when iterations block or when the machine is shared (servers).</p>
<p><b>Server workloads.</b> In ASP.NET Core, a request already runs concurrently with others; parallelising inside a request steals cores from other requests. Data parallelism shines in batch jobs, desktop apps, and offline processing.</p>
<p><b>SIMD.</b> Before going multi-core, consider single-core vectorization (${C('System.Numerics.Vector<T>')}, ${C('Vector256')}): span helpers like Sum/IndexOf already use it, and combined with Parallel you get both.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI adds AsParallel() and Parallel.ForEach eagerly. <b>Use AI as a partner:</b> <code>Is this loop CPU-bound and are its iterations independent? Estimate the work per item vs overhead</code>. <b>Where AI goes wrong:</b> Parallel.ForEach over async lambdas (they become async void!), shared List.Add inside parallel loops, parallelising I/O-bound work, AsParallel on tiny collections, assuming PLINQ keeps order. <b>What you must still own:</b> measuring speed-up with realistic data and core counts.</p>`,
    problems: [{
      title: 'Ordered Squares with PLINQ', level: 'Easy', tags: ['PLINQ', 'AsOrdered'], companies: ['Microsoft', 'Nvidia'],
      statement: `<p>Using PLINQ, keep the even numbers of ${C('values')} and return their squares as ${C('long')} values <b>in the original order</b>.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>, |values[i]| ≤ 2·10<sup>5</sup>`,
      example: `<p>values = [1, 2, 3, 4] → [4, 16].</p>`,
      brute: { why: `<p>${C('values.AsParallel().Where(...).Select(...)')} without AsOrdered may return the results in any order, so it can fail tests intermittently. Squaring an int before widening (${C('x * x')}) also overflows for |x| > 46340.</p>`, code: R`
static long[] Unordered(int[] a) =>
    a.AsParallel().Where(x => x % 2 == 0).Select(x => (long)x * x).ToArray(); // order not guaranteed` },
      mcq: { q: 'Why might values.AsParallel().Select(f).ToArray() return items in a different order from values?', options: ['PLINQ partitions the input across threads and, unless AsOrdered is used, merges results in whatever order they finish', 'Select always sorts its output', 'ToArray reverses parallel queries', 'PLINQ randomises input to balance load'], answer: 0, explain: 'Each partition runs independently; without AsOrdered the merge has no reason to restore source order. AsOrdered keeps it, at some buffering cost.' },
      hints: [`<p>${C('values.AsParallel().AsOrdered()')} — AsOrdered right after AsParallel.</p>`, `<p>Cast before multiplying: ${C('(long)x * x')}. Negative evens satisfy ${C('x % 2 == 0')} too.</p>`, `<p>Finish with ${C('ToArray()')}; with AsOrdered the array follows source order.</p>`],
      solution: {
        approach: `<p>AsOrdered tells PLINQ to keep track of source positions so the merged output matches input order; the filter and projection are pure functions, so running them in parallel is safe.</p>`,
        code: R`
public class Solution
{
    public long[] SquaresOfEvens(int[] values) =>
        values.AsParallel()
              .AsOrdered()
              .Where(x => x % 2 == 0)
              .Select(x => (long)x * x)
              .ToArray();
}`,
        dry: { head: ['index', 'value', 'even?', 'output'], rows: [['0', '1', 'no', '—'], ['1', '2', 'yes', '4'], ['2', '3', 'no', '—'], ['3', '4', 'yes', '16']] },
        complexity: `<p>O(n) work spread over cores; ordering adds buffering in the merge.</p>`,
        followUps: ['When is the sequential version faster?', 'Return the indices of the even values instead, still in order']
      },
      tests: { sig: 'int[] -> long[]', fn: 'squaresOfEvens', cases: [
        [[[1, 2, 3, 4]], [4, 16]], [[[]], []], [[[1, 3, 5]], []], [[[6, -2, 0]], [36, 4, 0]], [[[100000, 7]], [10000000000]], [[[8, 1, 8, 2]], [64, 64, 4]]
      ] }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Atomic Counter Across Threads', level: 'Easy', tags: ['Interlocked', 'threads'], companies: ['Microsoft', 'Intel'],
    statement: `<p>Start ${C('threads')} dedicated threads; each calls ${C('Interlocked.Increment')} on a shared ${C('long')} ${C('perThread')} times. Join them and return the counter.</p>`,
    constraints: `1 ≤ threads ≤ 16, 0 ≤ perThread ≤ 10<sup>6</sup>`,
    example: `<p>threads = 3, perThread = 10 → 30.</p>`,
    brute: { why: `<p>A lock around ${C('counter++')} is also correct but slower: Interlocked is a single atomic CPU instruction, no lock acquisition, no possibility of blocking.</p>`, code: R`
static long WithLock(int threads, int perThread)
{
    long c = 0; object g = new();
    var ts = Enumerable.Range(0, threads).Select(_ => new Thread(() => { for (int i = 0; i < perThread; i++) lock (g) c++; })).ToList();
    ts.ForEach(t => t.Start()); ts.ForEach(t => t.Join());
    return c;
}` },
    mcq: { q: 'Why is `Interlocked.Increment(ref x)` correct where `x++` is not?', options: ['It performs the read, add and write as one indivisible hardware operation', 'It locks the whole object', 'It makes x volatile', 'It runs on one core'], answer: 0, explain: 'lock xadd (x64) / ldadd (ARM64) increments atomically, so no update can be lost.' },
    hints: [`<p>${C('long counter = 0;')} captured by the thread lambdas, updated with ${C('Interlocked.Increment(ref counter)')}.</p>`, `<p>Create all the threads first, start them, then join every one.</p>`, `<p>Join makes all increments visible to the joining thread.</p>`],
    solution: {
      approach: `<p>Atomic increments; Join for completion and visibility.</p>`,
      code: R`
public class Solution
{
    public long CountParallel(int threads, int perThread)
    {
        long counter = 0;
        var workers = Enumerable.Range(0, threads)
            .Select(_ => new Thread(() => { for (int i = 0; i < perThread; i++) Interlocked.Increment(ref counter); }))
            .ToList();
        workers.ForEach(t => t.Start());
        workers.ForEach(t => t.Join());
        return counter;
    }
}`,
      complexity: `<p>O(threads × perThread) atomic operations; contention on one cache line limits scaling.</p>`,
      followUps: ['Use per-thread counters and sum at the end — how much faster?', 'What is false sharing?']
    },
    tests: { sig: 'int int -> long', fn: 'countParallel', cases: [
      [[3, 10], 30], [[1, 0], 0], [[16, 1], 16], [[4, 1000000], 4000000], [[2, 7], 14], [[8, 12345], 98760]
    ] }
  });

  practice.push({
    title: 'Parallel Sum with Thread-Local State', level: 'Easy', tags: ['Parallel.For', 'thread-local'], companies: ['Microsoft', 'Nvidia'],
    statement: `<p>Return the sum of an int array as a ${C('long')} using the ${C('Parallel.For')} overload with ${C('localInit')}, ${C('body')} and ${C('localFinally')}: each worker accumulates privately and merges once with ${C('Interlocked.Add')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>, |a[i]| ≤ 10<sup>9</sup>`,
    example: `<p>[1, 2, 3, 4] → 1 + 2 + 3 + 4 = 10.</p>`,
    brute: { why: `<p>${C('Parallel.For(0, n, i => Interlocked.Add(ref total, a[i]))')} is correct but performs n contended atomic operations — often slower than a sequential loop. Thread-local accumulation does one atomic operation per worker.</p>`, code: R`
static long Contended(int[] a)
{
    long total = 0;
    Parallel.For(0, a.Length, i => Interlocked.Add(ref total, a[i]));
    return total;
}` },
    mcq: { q: 'How often does localFinally run?', options: ['Once per worker task that participated', 'Once per iteration', 'Once in total', 'Never if there are no exceptions'], answer: 0, explain: 'Each worker gets localInit once, runs many iterations, then localFinally once with its accumulated state.' },
    hints: [`<p>${C('Parallel.For(0, a.Length, () => 0L, (i, state, local) => local + a[i], local => Interlocked.Add(ref total, local));')}</p>`, `<p>The body receives the current local value and returns the new one.</p>`, `<p>An empty array must return 0 (no iterations, no merges).</p>`],
    solution: {
      approach: `<p>Per-worker accumulation, one merge per worker.</p>`,
      code: R`
public class Solution
{
    public long ParallelSum(int[] a)
    {
        long total = 0;
        Parallel.For(0, a.Length,
            () => 0L,
            (i, _, local) => local + a[i],
            local => Interlocked.Add(ref total, local));
        return total;
    }
}`,
      complexity: `<p>O(n / cores) time ideally; O(workers) atomic operations.</p>`,
      followUps: ['Use Partitioner.Create for range chunks', 'Compute min, max and sum in one parallel pass']
    },
    tests: { sig: 'int[] -> long', fn: 'parallelSum', cases: [
      [[[1, 2, 3, 4]], 10], [[[]], 0], [[[-5]], -5], [[{ $rep: 1000000000, n: 1000 }], 1000000000000], [[{ $range: [1, 1000001] }], 500000500000], [[[-1, 1, -1, 1]], 0]
    ] }
  });

  practice.push({
    title: 'Count Primes with PLINQ', level: 'Easy', tags: ['PLINQ', 'AsParallel'], companies: ['Microsoft', 'Qualcomm'],
    statement: `<p>Count the primes ≤ n by testing each number with trial division, parallelised with ${C('AsParallel()')}.</p>`,
    constraints: `0 ≤ n ≤ 2·10<sup>5</sup>`,
    example: `<p>n = 10 → 4 (2, 3, 5, 7).</p>`,
    brute: { why: `<p>The sequential LINQ query gives the same count on one core. A sieve of Eratosthenes is asymptotically better (O(n log log n)); the exercise is turning an embarrassingly parallel query into a parallel one with one call.</p>`, code: R`
static int CountSeq(int n) => Enumerable.Range(2, Math.Max(0, n - 1)).Count(IsPrimeSeq);
static bool IsPrimeSeq(int x) { for (int d = 2; d * d <= x; d++) if (x % d == 0) return false; return true; }` },
    mcq: { q: 'Does Count() after AsParallel() depend on the order items are processed?', options: ['No — counting is order-independent, so no AsOrdered is needed', 'Yes, it needs AsOrdered', 'It returns a random count', 'It must be sequential'], answer: 0, explain: 'Aggregations like Count/Sum are commutative; only order-sensitive results need AsOrdered.' },
    hints: [`<p>${C('Enumerable.Range(2, n - 1)')} gives 2..n (guard n < 2).</p>`, `<p>Then ${C('.AsParallel().Count(IsPrime)')} runs the predicate on all cores.</p>`, `<p>In IsPrime use ${C('(long)d * d <= x')} to avoid overflow habits.</p>`],
    solution: {
      approach: `<p>A pure predicate over independent numbers is ideal for PLINQ.</p>`,
      code: R`
public class Solution
{
    public int CountPrimes(int n) =>
        n < 2 ? 0 : Enumerable.Range(2, n - 1).AsParallel().Count(IsPrime);

    private static bool IsPrime(int x)
    {
        for (int d = 2; (long)d * d <= x; d++)
            if (x % d == 0) return false;
        return true;
    }
}`,
      complexity: `<p>O(n√n / cores) time, O(1) extra space.</p>`,
      followUps: ['Parallelise a segmented sieve instead', 'Return the primes in order (AsOrdered)']
    },
    tests: { sig: 'int -> int', fn: 'countPrimes', cases: [
      [[10], 4], [[0], 0], [[1], 0], [[2], 1], [[100], 25], [[200000], 17984]
    ] }
  });

  practice.push({
    title: 'Word Frequencies in Parallel', level: 'Medium', tags: ['ConcurrentDictionary', 'Parallel.ForEach'], companies: ['Google', 'Microsoft'],
    statement: `<p>Count word occurrences across documents processed in parallel (${C('Parallel.ForEach')}). Words are separated by single spaces; empty strings are ignored. Use ${C('ConcurrentDictionary.AddOrUpdate')}. Return ${C('"word:count"')} entries sorted by word (ordinal).</p>`,
    constraints: `0 ≤ docs ≤ 10<sup>4</sup>, total words ≤ 10<sup>6</sup>`,
    example: `<p>["a b a", "b c"] → ["a:2", "b:2", "c:1"].</p>`,
    brute: { why: `<p>A normal Dictionary updated from several threads can corrupt its internal state; locking it for every word serialises the work. AddOrUpdate is atomic per key with striped locks.</p>`, code: R`
static string[] Sequential(string[] docs) =>
    docs.SelectMany(d => d.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        .GroupBy(w => w).OrderBy(g => g.Key, StringComparer.Ordinal)
        .Select(g => $"{g.Key}:{g.Count()}").ToArray();` },
    mcq: { q: 'Why is `if (!d.ContainsKey(w)) d[w] = 0; d[w]++;` wrong even with ConcurrentDictionary?', options: ['It is three separate operations; other threads can interleave between them', 'ConcurrentDictionary has no indexer', 'ContainsKey is not thread-safe', 'It throws'], answer: 0, explain: 'Each call is atomic, but the sequence is not — updates get lost. Use AddOrUpdate.' },
    hints: [`<p>${C('counts.AddOrUpdate(w, 1, (_, old) => old + 1);')}</p>`, `<p>Split with ${C('StringSplitOptions.RemoveEmptyEntries')}.</p>`, `<p>Sort with ${C('StringComparer.Ordinal')} for a culture-independent order.</p>`],
    solution: {
      approach: `<p>Parallel over documents; atomic per-word updates; sort at the end on one thread.</p>`,
      code: R`
using System.Collections.Concurrent;

public class Solution
{
    public string[] WordFreq(string[] docs)
    {
        var counts = new ConcurrentDictionary<string, int>(StringComparer.Ordinal);
        Parallel.ForEach(docs, doc =>
        {
            foreach (var w in doc.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                counts.AddOrUpdate(w, 1, (_, old) => old + 1);
        });
        return counts.OrderBy(p => p.Key, StringComparer.Ordinal)
                     .Select(p => $"{p.Key}:{p.Value}")
                     .ToArray();
    }
}`,
      complexity: `<p>O(W) updates + O(U log U) sort for U unique words.</p>`,
      followUps: ['Use per-thread dictionaries merged at the end (localInit/localFinally)', 'Return the top k words']
    },
    tests: { sig: 'string[] -> string[]', fn: 'wordFreq', cases: [
      [[['a b a', 'b c']], ['a:2', 'b:2', 'c:1']], [[[]], []], [[['']], []], [[['x x x']], ['x:3']], [[['B a', 'b A']], ['A:1', 'B:1', 'a:1', 'b:1']], [[{ $rep: 'hi there', n: 1000 }], ['hi:1000', 'there:1000']]
    ] }
  });

  practice.push({
    title: 'Concurrent Transfers with Lock Ordering', level: 'Medium', tags: ['lock', 'deadlock avoidance'], companies: ['Goldman Sachs', 'Revolut', 'Microsoft'],
    statement: `<p>Apply all transfers ${C('[from, to, amount]')} concurrently with ${C('Parallel.ForEach')}. Each transfer locks <b>both</b> accounts, always in increasing account index order (to avoid deadlock), then moves the amount (balances may go negative). Transfers with ${C('from == to')} do nothing. Return the final balances.</p>`,
    constraints: `1 ≤ accounts ≤ 1000, 0 ≤ transfers ≤ 10<sup>5</sup>, valid indices`,
    example: `<p>balances [100, 100], transfers [[0,1,30],[1,0,10]] → [80, 120].</p>`,
    brute: { why: `<p>One global lock is correct but serialises every transfer. Locking from-then-to deadlocks when two opposite transfers run at once (each holds one lock and waits for the other). Ordered per-account locks are correct and concurrent. Because no balance check depends on order, the final state is deterministic.</p>`, code: R`
static int[] GlobalLock(int[] balances, int[][] transfers)
{
    var b = (int[])balances.Clone(); object g = new();
    Parallel.ForEach(transfers, t => { lock (g) { b[t[0]] -= t[2]; b[t[1]] += t[2]; } });
    return b;
}` },
    mcq: { q: 'Why does locking accounts in index order prevent deadlock?', options: ['A cycle of waits would need someone to hold a higher lock while waiting for a lower one, which the ordering forbids', 'Locks are faster in order', 'The OS detects it', 'It does not prevent deadlock'], answer: 0, explain: 'With a global order every thread acquires locks ascending, so no circular wait can form.' },
    hints: [`<p>One lock object per account: ${C('var locks = Enumerable.Range(0, n).Select(_ => new object()).ToArray();')}</p>`, `<p>${C('int first = Math.Min(from, to), second = Math.Max(from, to);')}</p>`, `<p>${C('lock (locks[first]) lock (locks[second]) { ... }')}</p>`],
    solution: {
      approach: `<p>Fine-grained locks per account with a global acquisition order; transfers on disjoint accounts run fully in parallel.</p>`,
      code: R`
public class Solution
{
    public int[] Transfer(int[] balances, int[][] transfers)
    {
        var b = (int[])balances.Clone();
        var locks = Enumerable.Range(0, b.Length).Select(_ => new object()).ToArray();
        Parallel.ForEach(transfers, t =>
        {
            int from = t[0], to = t[1], amount = t[2];
            if (from == to) return;
            int first = Math.Min(from, to), second = Math.Max(from, to);
            lock (locks[first])
            lock (locks[second])
            {
                b[from] -= amount;
                b[to] += amount;
            }
        });
        return b;
    }
}`,
      complexity: `<p>O(T) transfers; contention only between transfers sharing an account.</p>`,
      followUps: ['Reject transfers that would overdraw — why is the result no longer deterministic?', 'Use Monitor.TryEnter with a timeout and retry']
    },
    tests: { sig: 'int[] int[][] -> int[]', fn: 'transfer', cases: [
      [[[100, 100], [[0, 1, 30], [1, 0, 10]]], [80, 120]], [[[5], []], [5]], [[[5, 5], [[0, 0, 3]]], [5, 5]], [[[0, 0, 0], [[0, 1, 1], [1, 2, 1], [2, 0, 1]]], [0, 0, 0]], [[[10, 0], { $rep: [0, 1, 1], n: 10000 }], [-9990, 10000]], [[[1, 2, 3], [[2, 0, 3], [1, 0, 2]]], [6, 0, 0]]
    ] }
  });

  practice.push({
    title: 'Alternate foo and bar', level: 'Medium', tags: ['SemaphoreSlim', 'thread coordination'], companies: ['Microsoft', 'Amazon', 'Meta'],
    statement: `<p>Two threads share an object: thread A calls ${C('Foo()')} n times, each appending ${C('"foo"')}; thread B calls ${C('Bar()')} n times, appending ${C('"bar"')}. Coordinate them with two semaphores so the output is always ${C('"foobar"')} repeated n times, regardless of which thread starts first. Return the output.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>`,
    example: `<p>n = 2 → ${C('"foobarfoobar"')}.</p>`,
    brute: { why: `<p>Busy-waiting on a shared turn flag (${C('while (turn != 0) { }')}) burns CPU and needs volatile; ${C('Thread.Sleep')} polling is slow. Semaphores block the waiting thread and wake it exactly when its turn comes.</p>`, code: R`
static string SpinTurns(int n)
{
    var sb = new StringBuilder(); int turn = 0;
    var a = new Thread(() => { for (int i = 0; i < n; i++) { while (Volatile.Read(ref turn) != 0) Thread.SpinWait(10); sb.Append("foo"); Volatile.Write(ref turn, 1); } });
    var b = new Thread(() => { for (int i = 0; i < n; i++) { while (Volatile.Read(ref turn) != 1) Thread.SpinWait(10); sb.Append("bar"); Volatile.Write(ref turn, 0); } });
    a.Start(); b.Start(); a.Join(); b.Join();
    return sb.ToString();
}` },
    mcq: { q: 'Initial counts: fooTurn = 1, barTurn = 0. Why?', options: ['foo must go first; bar waits until foo releases barTurn', 'Semaphores must start at 1', 'To allow both to run concurrently', 'It does not matter'], answer: 0, explain: 'The semaphore counts encode whose turn it is; each thread waits on its own and releases the other\'s.' },
    hints: [`<p>${C('var fooTurn = new SemaphoreSlim(1); var barTurn = new SemaphoreSlim(0);')}</p>`, `<p>Foo: ${C('fooTurn.Wait(); sb.Append("foo"); barTurn.Release();')} — Bar mirrors it.</p>`, `<p>Start B before A in your test to prove the order does not depend on start order.</p>`],
    solution: {
      approach: `<p>A two-semaphore "baton": exactly one of them has a permit at any time, and each thread passes it to the other after appending.</p>`,
      code: R`
public class Solution
{
    public string FooBar(int n)
    {
        var sb = new StringBuilder();
        using var fooTurn = new SemaphoreSlim(1);
        using var barTurn = new SemaphoreSlim(0);

        var bar = new Thread(() =>
        {
            for (int i = 0; i < n; i++) { barTurn.Wait(); sb.Append("bar"); fooTurn.Release(); }
        });
        var foo = new Thread(() =>
        {
            for (int i = 0; i < n; i++) { fooTurn.Wait(); sb.Append("foo"); barTurn.Release(); }
        });
        bar.Start();
        foo.Start();
        foo.Join();
        bar.Join();
        return sb.ToString();
    }
}`,
      complexity: `<p>O(n) handoffs; each thread blocks while it is not its turn.</p>`,
      followUps: ['Generalise to k threads printing in a cycle', 'Implement it with Monitor.Wait/PulseAll instead']
    },
    tests: { sig: 'int -> string', fn: 'fooBar', cases: [
      [[2], 'foobarfoobar'], [[0], ''], [[1], 'foobar'], [[3], 'foobarfoobarfoobar'], [[1000], { $rep: 'foobar', n: 1000 }], [[5], 'foobarfoobarfoobarfoobarfoobar']
    ] }
  });

  practice.push({
    title: 'Print Zero, Even, Odd', level: 'Hard', tags: ['SemaphoreSlim', 'coordination', 'three threads'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Three threads share an object: thread Z prints ${C('0')} before every number, thread E prints the even numbers and thread O prints the odd numbers. Together they must output ${C('"0102030405..."')} up to n: ${C('0, 1, 0, 2, …, 0, n')} concatenated. Coordinate with semaphores and return the output.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>`,
    example: `<p>n = 5 → ${C('"0102030405"')}.</p>`,
    brute: { why: `<p>One thread could just print the sequence; the challenge is coordinating three threads without busy-waiting. A single lock with a shared counter and PulseAll works but wakes all threads each time; three semaphores wake exactly the next one.</p>`, code: R`
static string OneThread(int n)
{
    var sb = new StringBuilder();
    for (int i = 1; i <= n; i++) sb.Append('0').Append(i);
    return sb.ToString();
}` },
    mcq: { q: 'After Z prints 0 before number i, which semaphore should it release?', options: ['odd if i is odd, even if i is even', 'Both', 'Its own', 'None'], answer: 0, explain: 'Z decides who goes next based on the parity of the upcoming number; that thread then releases Z again.' },
    hints: [`<p>${C('zero = new(1), odd = new(0), even = new(0)')}.</p>`, `<p>Z: for i in 1..n: ${C('zero.Wait(); append 0; (i % 2 == 1 ? odd : even).Release();')}</p>`, `<p>O: for each odd i: ${C('odd.Wait(); append i; zero.Release();')} — E similar for evens.</p>`],
    solution: {
      approach: `<p>Three semaphores; Z is the conductor deciding which number thread runs next, each number thread hands control back to Z.</p>`,
      code: R`
public class Solution
{
    public string ZeroEvenOdd(int n)
    {
        var sb = new StringBuilder();
        using var zero = new SemaphoreSlim(1);
        using var odd = new SemaphoreSlim(0);
        using var even = new SemaphoreSlim(0);

        var z = new Thread(() =>
        {
            for (int i = 1; i <= n; i++)
            {
                zero.Wait();
                sb.Append('0');
                (i % 2 == 1 ? odd : even).Release();
            }
        });
        var o = new Thread(() =>
        {
            for (int i = 1; i <= n; i += 2) { odd.Wait(); sb.Append(i); zero.Release(); }
        });
        var e = new Thread(() =>
        {
            for (int i = 2; i <= n; i += 2) { even.Wait(); sb.Append(i); zero.Release(); }
        });
        e.Start(); o.Start(); z.Start();
        z.Join(); o.Join(); e.Join();
        return sb.ToString();
    }
}`,
      complexity: `<p>O(n) handoffs (2n semaphore operations).</p>`,
      followUps: ['Rewrite with a single Monitor and a turn variable', 'Make it async with SemaphoreSlim.WaitAsync']
    },
    tests: { sig: 'int -> string', fn: 'zeroEvenOdd', cases: [
      [[5], '0102030405'], [[0], ''], [[1], '01'], [[2], '0102'], [[10], '010203040506070809010'], [[12], '010203040506070809010011012']
    ] }
  });

  practice.push({
    title: 'Reader/Writer Cache', level: 'Medium', tags: ['ReaderWriterLockSlim', 'design'], companies: ['Microsoft', 'Salesforce'],
    statement: `<p>Implement ${C('RwCache')} backed by a Dictionary and a ${C('ReaderWriterLockSlim')}: ${C('Put(key, value)')} (write lock), ${C('Get(key)')} returning the value or −1 (read lock), ${C('Remove(key)')} returning whether it existed (write lock), and ${C('Count()')} (read lock). Every lock is released in a finally block.</p>`,
    constraints: `up to 10<sup>5</sup> operations; keys and values are ints`,
    example: `<p>Put(1, 10), Get(1) → 10, Get(2) → −1, Remove(1) → true, Count() → 0.</p>`,
    brute: { why: `<p>A single ${C('lock')} is simpler and, for very short operations, often faster. The reader/writer lock pays off when reads dominate and take noticeable time, because readers no longer wait for each other.</p>`, code: R`
class LockedCache
{
    private readonly Dictionary<int, int> _d = new(); private readonly object _g = new();
    public void Put(int k, int v) { lock (_g) _d[k] = v; }
    public int Get(int k) { lock (_g) return _d.TryGetValue(k, out var v) ? v : -1; }
}` },
    mcq: { q: 'Can a thread holding the read lock call EnterWriteLock (default settings)?', options: ['No — it throws LockRecursionException; use an upgradeable read lock instead', 'Yes, it upgrades automatically', 'Yes, but only once', 'It deadlocks silently'], answer: 0, explain: 'With LockRecursionPolicy.NoRecursion, acquiring the write lock while holding the read lock is rejected.' },
    hints: [`<p>Pattern: ${C('_rw.EnterReadLock(); try { ... } finally { _rw.ExitReadLock(); }')}</p>`, `<p>Remove needs the write lock because it modifies the dictionary.</p>`, `<p>Implement IDisposable to dispose the ReaderWriterLockSlim.</p>`],
    solution: {
      approach: `<p>Reads share the read lock, mutations take the write lock; try/finally guarantees release.</p>`,
      code: R`
public class RwCache : IDisposable
{
    private readonly ReaderWriterLockSlim _rw = new();
    private readonly Dictionary<int, int> _data = new();

    public void Put(int key, int value)
    {
        _rw.EnterWriteLock();
        try { _data[key] = value; }
        finally { _rw.ExitWriteLock(); }
    }

    public int Get(int key)
    {
        _rw.EnterReadLock();
        try { return _data.TryGetValue(key, out int v) ? v : -1; }
        finally { _rw.ExitReadLock(); }
    }

    public bool Remove(int key)
    {
        _rw.EnterWriteLock();
        try { return _data.Remove(key); }
        finally { _rw.ExitWriteLock(); }
    }

    public int Count()
    {
        _rw.EnterReadLock();
        try { return _data.Count; }
        finally { _rw.ExitReadLock(); }
    }

    public void Dispose() => _rw.Dispose();
}`,
      complexity: `<p>O(1) average per operation plus lock overhead.</p>`,
      followUps: ['Add GetOrAdd using an upgradeable read lock', 'Benchmark against lock and ConcurrentDictionary']
    },
    tests: { cls: 'RwCache', sigs: { RwCache: '', put: 'int int -> void', get: 'int -> int', remove: 'int -> bool', count: '-> int' }, cases: [
      { ops: ['RwCache', 'put', 'get', 'get', 'remove', 'count'], args: [[], [1, 10], [1], [2], [1], []], out: [null, null, 10, -1, true, 0] },
      { ops: ['RwCache', 'count', 'remove'], args: [[], [], [5]], out: [null, 0, false] },
      { ops: ['RwCache', 'put', 'put', 'get', 'count'], args: [[], [1, 1], [1, 2], [1], []], out: [null, null, null, 2, 1] },
      { ops: ['RwCache', 'put', 'put', 'put', 'remove', 'get', 'count'], args: [[], [1, 5], [2, 6], [3, 7], [2], [2], []], out: [null, null, null, null, true, -1, 2] },
      { ops: ['RwCache', 'put', 'get', 'put', 'get'], args: [[], [-1, -100], [-1], [0, 0], [0]], out: [null, null, -100, null, 0] },
      { ops: ['RwCache', 'put', 'remove', 'remove', 'count'], args: [[], [9, 9], [9], [9], []], out: [null, null, true, false, 0] }
    ] }
  });

  practice.push({
    title: 'Parallel Merge Sort', level: 'Hard', tags: ['Parallel.Invoke', 'divide and conquer'], companies: ['Google', 'Microsoft', 'Nvidia'],
    statement: `<p>Sort an int array with merge sort, sorting the two halves in parallel with ${C('Parallel.Invoke')} while the subarray is larger than a threshold (use ${C('Array.Sort')} on the span below it, e.g. 2048 elements), and merging through one shared temporary buffer. Return the sorted array.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>`,
    example: `<p>[5, 2, 9, 1] → [1, 2, 5, 9].</p>`,
    brute: { why: `<p>${C('Array.Sort')} (introsort) is very fast on one core. Spawning tasks down to single elements makes the scheduling overhead dominate; the threshold keeps tasks coarse. Allocating a new buffer per merge would add GC pressure — one buffer reused by disjoint ranges is safe.</p>`, code: R`
static int[] SortSequential(int[] a) { var c = (int[])a.Clone(); Array.Sort(c); return c; }` },
    mcq: { q: 'Why can both halves share one temporary buffer safely?', options: ['Each recursive call only touches its own disjoint index range of the buffer', 'The buffer is locked', 'Parallel.Invoke runs them sequentially', 'Arrays are thread-safe'], answer: 0, explain: 'Disjoint ranges mean no two threads write the same element, so no synchronisation is needed.' },
    hints: [`<p>${C('Sort(a, tmp, lo, hi)')}: if ${C('hi - lo <= Threshold')} → ${C('Array.Sort(a, lo, hi - lo)')}.</p>`, `<p>Otherwise ${C('Parallel.Invoke(() => Sort(a, tmp, lo, mid), () => Sort(a, tmp, mid, hi))')}, then merge into tmp[lo..hi] and copy back.</p>`, `<p>Recursion depth is only log₂(n / threshold), so no stack concerns.</p>`],
    solution: {
      approach: `<p>Fork the two halves while they are large, join, merge. Parallel.Invoke waits for both before returning, which also publishes their writes to the merging thread.</p>`,
      code: R`
public class Solution
{
    private const int Threshold = 2048;

    public int[] ParallelSort(int[] input)
    {
        var a = (int[])input.Clone();
        var tmp = new int[a.Length];
        Sort(a, tmp, 0, a.Length);
        return a;
    }

    private static void Sort(int[] a, int[] tmp, int lo, int hi)
    {
        if (hi - lo <= Threshold)
        {
            Array.Sort(a, lo, hi - lo);
            return;
        }
        int mid = lo + (hi - lo) / 2;
        Parallel.Invoke(() => Sort(a, tmp, lo, mid), () => Sort(a, tmp, mid, hi));
        Merge(a, tmp, lo, mid, hi);
    }

    private static void Merge(int[] a, int[] tmp, int lo, int mid, int hi)
    {
        int i = lo, j = mid, k = lo;
        while (i < mid && j < hi) tmp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
        while (i < mid) tmp[k++] = a[i++];
        while (j < hi) tmp[k++] = a[j++];
        Array.Copy(tmp, lo, a, lo, hi - lo);
    }
}`,
      complexity: `<p>O(n log n) work, roughly O(n log n / cores + n) time; O(n) extra memory.</p>`,
      followUps: ['Parallelise the merge step too', 'Compare speed-up for n = 10⁵ vs 10⁷']
    },
    tests: { sig: 'int[] -> int[]', fn: 'parallelSort', cases: [
      [[[5, 2, 9, 1]], [1, 2, 5, 9]], [[[]], []], [[[1]], [1]], [[[3, 3, -1, 3]], [-1, 3, 3, 3]], [[{ $range: [100000, 0, -1] }], { $range: [1, 100001] }], [[{ $concat: [{ $rep: 7, n: 5000 }, { $range: [5000, 0, -1] }] }], { $concat: [{ $range: [1, 7] }, { $rep: 7, n: 5001 }, { $range: [8, 5001] }] }]
    ] }
  });

  practice.push({
    title: 'Phases with a Barrier', level: 'Hard', tags: ['Barrier', 'phased computation'], companies: ['Microsoft', 'Ansys'],
    statement: `<p>${C('workers')} threads run ${C('phases')} phases in lock-step using a ${C('Barrier')}. In phase p (from 0), worker w adds ${C('(p + 1) * (w + 1)')} to a shared phase accumulator with ${C('Interlocked.Add')}, then calls ${C('SignalAndWait')}. The barrier's post-phase action records the accumulator into ${C('result[p]')} and resets it to 0. Return the results.</p>`,
    constraints: `1 ≤ workers ≤ 8, 0 ≤ phases ≤ 1000`,
    example: `<p>workers 3, phases 2 → [6, 12] (phase 0: 1 + 2 + 3; phase 1: 2 + 4 + 6).</p>`,
    brute: { why: `<p>Starting new threads for every phase and joining them all works but costs thread creation per phase. A Barrier keeps the same threads and synchronises them at phase boundaries, and its post-phase action runs exactly once per phase while all participants are waiting — the perfect place to publish and reset.</p>`, code: R`
static long[] Formula(int workers, int phases) =>
    Enumerable.Range(0, phases).Select(p => (long)(p + 1) * workers * (workers + 1) / 2).ToArray();` },
    mcq: { q: 'When does the Barrier\'s post-phase action run?', options: ['Once per phase, after all participants have signalled and before any is released', 'After each SignalAndWait call', 'Only at the end', 'Concurrently with the next phase'], answer: 0, explain: 'The last thread to arrive runs the action, then all participants are released into the next phase.' },
    hints: [`<p>${C('using var barrier = new Barrier(workers, b => { result[b.CurrentPhaseNumber] = acc; acc = 0; });')}</p>`, `<p>Each worker: for p in 0..phases−1: ${C('Interlocked.Add(ref acc, (p + 1) * (w + 1)); barrier.SignalAndWait();')}</p>`, `<p>Inside the post-phase action no worker is running, so plain reads and writes of acc are safe there.</p>`],
    solution: {
      approach: `<p>Threads accumulate atomically within a phase; the barrier guarantees nobody starts phase p + 1 until the post-phase action of phase p has stored and reset the total.</p>`,
      code: R`
public class Solution
{
    public long[] PhaseSums(int workers, int phases)
    {
        var result = new long[phases];
        long acc = 0;
        using var barrier = new Barrier(workers, b =>
        {
            result[b.CurrentPhaseNumber] = acc;
            acc = 0;
        });
        var threads = Enumerable.Range(0, workers).Select(w => new Thread(() =>
        {
            for (int p = 0; p < phases; p++)
            {
                Interlocked.Add(ref acc, (long)(p + 1) * (w + 1));
                barrier.SignalAndWait();
            }
        })).ToList();
        threads.ForEach(t => t.Start());
        threads.ForEach(t => t.Join());
        return result;
    }
}`,
      complexity: `<p>O(workers × phases) work; each phase ends with one barrier synchronisation.</p>`,
      followUps: ['Use the barrier for a parallel Jacobi iteration on a grid', 'Remove a participant mid-run with RemoveParticipant']
    },
    tests: { sig: 'int int -> long[]', fn: 'phaseSums', cases: [
      [[3, 2], [6, 12]], [[1, 0], []], [[1, 3], [1, 2, 3]], [[8, 1], [36]], [[4, 4], [10, 20, 30, 40]], [[2, 1000], { $range: [3, 3003, 3] }]
    ] }
  });

  practice.push({
    title: 'Dining Philosophers Without Deadlock', level: 'Hard', tags: ['deadlock', 'resource ordering', 'lock'], companies: ['Microsoft', 'Bloomberg', 'Oracle'],
    statement: `<p>n philosophers sit around a table with one fork between neighbours (fork i is on the left of philosopher i, fork (i + 1) mod n on the right). Each philosopher, on its own thread, eats ${C('meals')} times; to eat it must hold both adjacent forks (locks). Avoid deadlock by always locking the <b>lower-numbered</b> fork first. Count meals per philosopher with each philosopher's own counter and return the counts.</p>`,
    constraints: `2 ≤ n ≤ 16, 0 ≤ meals ≤ 10<sup>4</sup>`,
    example: `<p>n = 5, meals = 3 → [3, 3, 3, 3, 3].</p>`,
    brute: { why: `<p>"Take left fork, then right fork" deadlocks when all philosophers take their left fork at the same moment: everyone waits for a right fork forever. Ordering the forks globally breaks the cycle (the last philosopher reaches for fork 0 first). A single global "table lock" also avoids deadlock but lets only one philosopher eat at a time.</p>`, code: R`
static int[] OneAtATime(int n, int meals)
{
    var counts = new int[n]; object table = new();
    var ts = Enumerable.Range(0, n).Select(i => new Thread(() => { for (int m = 0; m < meals; m++) lock (table) counts[i]++; })).ToList();
    ts.ForEach(t => t.Start()); ts.ForEach(t => t.Join());
    return counts;
}` },
    mcq: { q: 'Which of the four Coffman conditions does lock ordering break?', options: ['Circular wait', 'Mutual exclusion', 'Hold and wait', 'No preemption'], answer: 0, explain: 'With a total order on resources, a cycle of threads each waiting for the next one\'s lock cannot form.' },
    hints: [`<p>${C('var forks = Enumerable.Range(0, n).Select(_ => new object()).ToArray();')}</p>`, `<p>For philosopher i: ${C('int a = i, b = (i + 1) % n; int first = Math.Min(a, b), second = Math.Max(a, b);')}</p>`, `<p>${C('lock (forks[first]) lock (forks[second]) counts[i]++;')} — each counter is written by one thread only.</p>`],
    solution: {
      approach: `<p>Resource ordering: every philosopher acquires its two forks in increasing index order, so no circular wait is possible and every thread eventually eats all its meals.</p>`,
      code: R`
public class Solution
{
    public int[] Dine(int n, int meals)
    {
        var forks = Enumerable.Range(0, n).Select(_ => new object()).ToArray();
        var counts = new int[n];
        var threads = Enumerable.Range(0, n).Select(i => new Thread(() =>
        {
            int left = i, right = (i + 1) % n;
            int first = Math.Min(left, right), second = Math.Max(left, right);
            for (int m = 0; m < meals; m++)
            {
                lock (forks[first])
                lock (forks[second])
                {
                    counts[i]++;
                }
            }
        })).ToList();
        threads.ForEach(t => t.Start());
        threads.ForEach(t => t.Join());
        return counts;
    }
}`,
      complexity: `<p>O(n × meals) lock acquisitions; neighbours contend, non-neighbours eat in parallel.</p>`,
      followUps: ['Use a SemaphoreSlim(n − 1) "waiter" instead of ordering', 'Measure fairness: does any philosopher starve temporarily?']
    },
    tests: { sig: 'int int -> int[]', fn: 'dine', cases: [
      [[5, 3], [3, 3, 3, 3, 3]], [[2, 0], [0, 0]], [[2, 100], [100, 100]], [[16, 1000], { $rep: 1000, n: 16 }], [[3, 1], [1, 1, 1]], [[7, 10000], { $rep: 10000, n: 7 }]
    ] }
  });

  practice.push({
    title: 'Parallel Histogram', level: 'Medium', tags: ['Parallel.For', 'thread-local arrays'], companies: ['Microsoft', 'Databricks'],
    statement: `<p>Count how many values fall into each of ${C('buckets')} buckets (bucket = value mod buckets; values are non-negative). Use ${C('Parallel.For')} with a thread-local ${C('int[]')} histogram per worker (localInit), and merge each local histogram into the result under a lock in localFinally.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>, 1 ≤ buckets ≤ 1000, 0 ≤ values[i] ≤ 10<sup>9</sup>`,
    example: `<p>values [1, 2, 3, 4, 5], buckets 2 → [2, 3].</p>`,
    brute: { why: `<p>${C('Interlocked.Increment(ref hist[b])')} per value is correct but contends heavily on popular buckets and suffers false sharing; local arrays avoid all sharing until a single merge per worker.</p>`, code: R`
static int[] Shared(int[] values, int buckets)
{
    var h = new int[buckets];
    Parallel.For(0, values.Length, i => Interlocked.Increment(ref h[values[i] % buckets]));
    return h;
}` },
    mcq: { q: 'Why is a lock acceptable in localFinally?', options: ['It runs only once per worker, so contention is negligible', 'Locks are free', 'localFinally runs sequentially by design', 'It is not acceptable'], answer: 0, explain: 'The cost of a few lock acquisitions is tiny compared with n per-item synchronisations.' },
    hints: [`<p>Give each worker its own array: ${C('localInit: () => new int[buckets]')}</p>`, `<p>Body: ${C('local[values[i] % buckets]++; return local;')}</p>`, `<p>localFinally: ${C('lock (gate) for (int b = 0; b < buckets; b++) result[b] += local[b];')}</p>`],
    solution: {
      approach: `<p>Private histograms per worker and a lock-protected merge — the standard parallel aggregation pattern.</p>`,
      code: R`
public class Solution
{
    public int[] Histogram(int[] values, int buckets)
    {
        var result = new int[buckets];
        object gate = new();
        Parallel.For(0, values.Length,
            () => new int[buckets],
            (i, _, local) => { local[values[i] % buckets]++; return local; },
            local =>
            {
                lock (gate)
                    for (int b = 0; b < buckets; b++) result[b] += local[b];
            });
        return result;
    }
}`,
      complexity: `<p>O(n / cores + workers × buckets) time; O(workers × buckets) memory.</p>`,
      followUps: ['Use PLINQ Aggregate with seed/merge functions', 'Handle negative values correctly']
    },
    tests: { sig: 'int[] int -> int[]', fn: 'histogram', cases: [
      [[[1, 2, 3, 4, 5], 2], [2, 3]], [[[], 3], [0, 0, 0]], [[[7], 1], [1]], [[[0, 10, 20], 10], [3, 0, 0, 0, 0, 0, 0, 0, 0, 0]], [[{ $range: [0, 1000000] }, 4], [250000, 250000, 250000, 250000]], [[[1000000000, 999999999], 7], [0, 0, 0, 0, 0, 1, 1]]
    ] }
  });

  practice.push({
    title: 'Producer/Consumer with BlockingCollection', level: 'Medium', tags: ['BlockingCollection', 'producer/consumer'], companies: ['Microsoft', 'SAP'],
    statement: `<p>One producer thread adds 1..n to a ${C('BlockingCollection<int>')} with bounded capacity 8 and then calls ${C('CompleteAdding')}. ${C('consumers')} consumer threads loop over ${C('GetConsumingEnumerable()')}, squaring each item and adding it to a shared total with Interlocked, and counting items. Return ${C('[count, sum of squares]')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>, 1 ≤ consumers ≤ 8`,
    example: `<p>n = 3, consumers 2 → [3, 14].</p>`,
    brute: { why: `<p>A ConcurrentQueue with consumers that spin on TryDequeue wastes CPU and cannot tell "empty for now" from "finished". BlockingCollection blocks consumers while empty, blocks the producer while full, and ends consumers after CompleteAdding.</p>`, code: R`
static long[] Direct(int n) => new long[] { n, Enumerable.Range(1, n).Sum(x => (long)x * x) };` },
    mcq: { q: 'What happens to GetConsumingEnumerable() loops after CompleteAdding() once the collection is empty?', options: ['They finish normally', 'They block forever', 'They throw', 'They restart'], answer: 0, explain: 'CompleteAdding marks the end; consumers drain the remaining items and then the enumeration completes.' },
    hints: [`<p>${C('using var bc = new BlockingCollection<int>(boundedCapacity: 8);')}</p>`, `<p>Start the consumer threads first, then produce, then ${C('bc.CompleteAdding()')}.</p>`, `<p>Use ${C('long')} for the sum: 10<sup>5</sup> squares add up to about 3.3·10<sup>14</sup>.</p>`],
    solution: {
      approach: `<p>The classic synchronous producer/consumer: bounded buffer, completion signal, several consumers, atomic aggregation.</p>`,
      code: R`
using System.Collections.Concurrent;

public class Solution
{
    public long[] Pipeline(int n, int consumers)
    {
        using var bc = new BlockingCollection<int>(boundedCapacity: 8);
        long sum = 0, count = 0;
        var workers = Enumerable.Range(0, consumers).Select(_ => new Thread(() =>
        {
            foreach (int x in bc.GetConsumingEnumerable())
            {
                Interlocked.Add(ref sum, (long)x * x);
                Interlocked.Increment(ref count);
            }
        })).ToList();
        workers.ForEach(t => t.Start());

        var producer = new Thread(() =>
        {
            for (int i = 1; i <= n; i++) bc.Add(i);
            bc.CompleteAdding();
        });
        producer.Start();
        producer.Join();
        workers.ForEach(t => t.Join());
        return new[] { count, sum };
    }
}`,
      complexity: `<p>O(n) items; memory bounded by the capacity.</p>`,
      followUps: ['Rewrite with Channel&lt;T&gt; and tasks', 'Propagate a producer exception to the consumers']
    },
    tests: { sig: 'int int -> long[]', fn: 'pipeline', cases: [
      [[3, 2], [3, 14]], [[0, 1], [0, 0]], [[1, 8], [1, 1]], [[100000, 4], [100000, 333338333350000]], [[10, 1], [10, 385]], [[1000, 3], [1000, 333833500]]
    ] }
  });

  practice.push({
    title: 'Print in Order', level: 'Medium', tags: ['ManualResetEventSlim', 'happens-before'], companies: ['Microsoft', 'Amazon', 'Apple'],
    statement: `<p>Three threads call ${C('First()')}, ${C('Second()')} and ${C('Third()')} on a shared object, appending ${C('"first"')}, ${C('"second"')}, ${C('"third"')}. The threads are <b>started</b> in the order given by ${C('startOrder')} (a permutation of 1, 2, 3), but the output must always be ${C('"firstsecondthird"')}. Use two ${C('ManualResetEventSlim')} gates and return the output.</p>`,
    constraints: `startOrder is a permutation of [1, 2, 3]`,
    example: `<p>startOrder [3, 1, 2] → ${C('"firstsecondthird"')}.</p>`,
    brute: { why: `<p>Starting the threads in a fixed order does not guarantee they <i>run</i> in that order; the OS scheduler decides. Sleeping "long enough" is flaky. Gates make each method wait until its predecessor has finished — a happens-before relationship.</p>`, code: R`
static string Unsynchronised(int[] startOrder)
{
    var sb = new StringBuilder();
    var ts = startOrder.Select(k => new Thread(() => sb.Append(k == 1 ? "first" : k == 2 ? "second" : "third"))).ToList();
    ts.ForEach(t => t.Start()); ts.ForEach(t => t.Join());
    return sb.ToString(); // order not guaranteed
}` },
    mcq: { q: 'Besides ordering, what does Set()/Wait() on the event guarantee?', options: ['Writes before Set are visible to the thread after Wait returns', 'Nothing about memory', 'That threads run on the same core', 'That Second runs on the main thread'], answer: 0, explain: 'Synchronisation primitives include memory barriers, establishing happens-before from Set to the returning Wait.' },
    hints: [`<p>${C('firstDone')} and ${C('secondDone')} gates, both initially closed.</p>`, `<p>Second: ${C('firstDone.Wait(); append; secondDone.Set();')} — Third waits on secondDone.</p>`, `<p>Create the three threads, start them in startOrder, join all.</p>`],
    solution: {
      approach: `<p>Two one-shot gates chain the methods: First opens gate 1, Second waits for gate 1 and opens gate 2, Third waits for gate 2.</p>`,
      code: R`
public class Solution
{
    public string PrintInOrder(int[] startOrder)
    {
        var sb = new StringBuilder();
        using var firstDone = new ManualResetEventSlim(false);
        using var secondDone = new ManualResetEventSlim(false);

        void First() { sb.Append("first"); firstDone.Set(); }
        void Second() { firstDone.Wait(); sb.Append("second"); secondDone.Set(); }
        void Third() { secondDone.Wait(); sb.Append("third"); }

        var threads = startOrder.Select(k =>
        {
            ThreadStart body = k switch { 1 => First, 2 => Second, _ => Third };
            return new Thread(body);
        }).ToList();
        threads.ForEach(t => t.Start());
        threads.ForEach(t => t.Join());
        return sb.ToString();
    }
}`,
      complexity: `<p>O(1) work; at most two blocking waits.</p>`,
      followUps: ['Use TaskCompletionSource gates for an async version', 'Generalise to k ordered steps']
    },
    tests: { sig: 'int[] -> string', fn: 'printInOrder', cases: [
      [[[1, 2, 3]], 'firstsecondthird'], [[[3, 1, 2]], 'firstsecondthird'], [[[3, 2, 1]], 'firstsecondthird'], [[[2, 3, 1]], 'firstsecondthird'], [[[1, 3, 2]], 'firstsecondthird'], [[[2, 1, 3]], 'firstsecondthird']
    ] }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Why is `counter++` on a shared field not thread-safe?', options: ['It is a separate read, add and write that other threads can interleave', 'ints are not atomic', 'The JIT removes it', 'It throws on contention'], answer: 0, explain: 'Two threads can read the same old value and both write old + 1, losing an update.' },
    { q: 'Which object should you lock on?', options: ['A private readonly object owned by the class', 'this', 'typeof(MyClass)', 'A string literal'], answer: 0, explain: 'Public or shared objects (this, types, interned strings) can be locked by unrelated code, causing contention or deadlocks.' },
    { q: 'Why can you not `await` inside a `lock` block?', options: ['Monitor is thread-affine and the continuation may resume on another thread', 'await is too slow', 'lock is obsolete', 'You can'], answer: 0, explain: 'The compiler rejects it (CS1996); use SemaphoreSlim.WaitAsync as an async mutex.' },
    { q: 'What does `volatile` guarantee?', options: ['Reads see the latest write and are not reordered/cached across the volatile access; it does not make x++ atomic', 'Atomic increments', 'Mutual exclusion', 'Thread affinity'], answer: 0, explain: 'volatile provides visibility and ordering (acquire/release), not atomicity of compound operations.' },
    { q: 'Interlocked.CompareExchange(ref x, 5, 3) succeeds when…', options: ['x currently equals 3; it then becomes 5', 'x equals 5', 'x is greater than 3', 'Always'], answer: 0, explain: 'CAS writes the new value only if the location still holds the comparand, and returns the original value.' },
    { q: 'Thread 1 locks A then B; thread 2 locks B then A. What can happen?', options: ['Deadlock', 'Livelock only', 'Nothing — locks are reentrant', 'A compile error'], answer: 0, explain: 'Each can hold one lock while waiting for the other. A consistent global lock order prevents it.' },
    { q: 'What is the main purpose of SemaphoreSlim(3)?', options: ['Allow at most 3 concurrent holders', 'Run 3 threads', 'Retry 3 times', 'Lock 3 objects'], answer: 0, explain: 'A semaphore counts available slots; WaitAsync takes one and Release returns it.' },
    { q: 'ReaderWriterLockSlim is most beneficial when…', options: ['Reads greatly outnumber writes and read sections are not trivially short', 'Writes dominate', 'Sections contain await', 'There is only one thread'], answer: 0, explain: 'It lets readers proceed in parallel; its overhead makes it a loss for tiny sections or write-heavy workloads.' },
    { q: 'Under contention, ConcurrentDictionary.GetOrAdd(key, factory) may…', options: ['Invoke the factory more than once, keeping only one result', 'Store several values for the key', 'Deadlock', 'Throw'], answer: 0, explain: 'The factory runs outside internal locks; wrap expensive creation in Lazy&lt;T&gt; if it must run once.'.replace(/</g, '&lt;').replace(/>/g, '&gt;') },
    { q: 'What does a bounded Channel do when full (default FullMode = Wait)?', options: ['WriteAsync waits asynchronously until there is room', 'It grows', 'It drops the item silently', 'It throws immediately'], answer: 0, explain: 'This backpressure keeps memory bounded when consumers are slower than producers.' },
    { q: 'How does a consumer loop `await foreach (var x in reader.ReadAllAsync())` end?', options: ['When the writer completes and all buffered items are read', 'When the buffer is empty', 'After a timeout', 'Never'], answer: 0, explain: 'Completion plus draining ends the async enumeration.' },
    { q: 'Why use the Parallel.For overload with localInit/localFinally for a sum?', options: ['Each worker accumulates privately and merges once, avoiding per-item synchronisation', 'It is required for long', 'It preserves order', 'It runs sequentially'], answer: 0, explain: 'Thread-local state removes contention from the hot loop.' },
    { q: 'What is wrong with `Parallel.ForEach(urls, async url => await DownloadAsync(url))`?', options: ['The async lambda becomes async void; ForEach does not wait for the downloads', 'Nothing', 'It deadlocks always', 'It runs sequentially'], answer: 0, explain: 'Parallel.ForEach takes Action&lt;T&gt;; use Parallel.ForEachAsync or WhenAll with throttling.'.replace(/</g, '&lt;').replace(/>/g, '&gt;') },
    { q: 'Which statement about PLINQ is true?', options: ['Results are unordered unless you call AsOrdered()', 'It always preserves order', 'It is for I/O-bound work', 'It never runs sequentially'], answer: 0, explain: 'PLINQ trades order for speed by default; AsOrdered restores input order at some cost.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'What is a race condition? Give two common forms.', level: 'B', a: `<p>A race condition is a bug where the outcome depends on the relative timing of threads accessing shared mutable state. Read-modify-write races: ${C('counter++')} or ${C('balance += x')} from two threads can lose updates because the read, compute and write interleave. Check-then-act races: ${C('if (!dict.ContainsKey(k)) dict.Add(k, v)')} or lazy initialisation, where the condition changes between the check and the action. Fixes: make the compound operation atomic (lock, Interlocked, a single atomic API like ${C('AddOrUpdate')}), or avoid sharing (confinement, immutability, message passing).</p>`, followUps: ['How would you test for a race condition?'] },
    { q: 'How does lock work in C#, and what are its rules?', level: 'I', a: `<p>${C('lock (obj) { }')} compiles to ${C('Monitor.Enter(obj, ref taken)')} and ${C('Monitor.Exit(obj)')} in a finally block. It provides mutual exclusion among threads locking the same object and memory visibility (acquire on enter, release on exit). Monitor is reentrant and thread-affine. Rules: lock on a private readonly object; protect every access (reads too) of the shared state with the same lock; keep the critical section short; never call unknown code or do I/O while holding it; never await inside (CS1996); take multiple locks in a consistent order.</p>`, followUps: ['What is a lock convoy?', 'What changes with System.Threading.Lock in .NET 9?'] },
    { q: 'What are the conditions for deadlock and how do you prevent it?', level: 'I', a: `<p>The four Coffman conditions: mutual exclusion, hold and wait, no preemption, and circular wait. Breaking any one prevents deadlock. In practice: impose a global lock order (by id or address) so circular waits cannot form; hold at most one lock at a time or acquire all at once; use timeouts (${C('Monitor.TryEnter')}, ${C('WaitAsync(timeout)')}) and back off; avoid calling out to unknown code while holding locks. In async code the classic deadlock is sync-over-async with a single-threaded SynchronizationContext. Detect deadlocks with a dump: threads blocked in Monitor.Enter on each other's locks.</p>`, followUps: ['What is livelock?'] },
    { q: 'When is Interlocked enough, and when do you need a lock?', level: 'I', a: `<p>Interlocked operations are atomic on a <b>single</b> memory location: counters (${C('Increment')}, ${C('Add')}), flags (${C('Exchange')}), publishing a reference, and lock-free updates via CompareExchange loops. They are cheap and never block. As soon as an invariant spans multiple variables (balance and history, head and count, two accounts), individual atomic operations do not make the combination atomic, and you need a lock (or an immutable object swapped with one CAS). Mixing Interlocked and lock on the same field is a code smell.</p>`, followUps: ['Implement a lock-free stack push.'] },
    { q: 'Explain volatile and the .NET memory model.', level: 'A', a: `<p>Compilers, the JIT and CPUs may reorder and cache memory operations as long as a single thread cannot observe the difference. Without synchronisation, another thread can see stale or out-of-order values: a stop-flag loop may never exit because the read was hoisted. ${C('volatile')} (or ${C('Volatile.Read/Write')}) gives acquire/release semantics: a volatile read cannot move after subsequent memory accesses and is not cached; a volatile write cannot move before prior ones. It does not make compound operations atomic. Locks, Interlocked, Thread.Start/Join, task continuations and concurrent collections all include fences. x64 is strongly ordered; ARM64 is weak, so missing fences show up there.</p>`, followUps: ['Why was double-checked locking broken without volatile?'] },
    { q: 'Compare SemaphoreSlim, Monitor and ReaderWriterLockSlim.', level: 'I', a: `<p><b>Monitor/lock</b>: mutual exclusion, reentrant, thread-affine, cheapest for short critical sections; no async support. <b>SemaphoreSlim</b>: counts N slots, not thread-affine, not reentrant, supports ${C('WaitAsync')} — the tool for throttling and for mutual exclusion across awaits (count 1). <b>ReaderWriterLockSlim</b>: many concurrent readers or one writer, upgradeable reads, thread-affine, higher overhead — useful only for read-heavy access with meaningful work inside. Often better: ConcurrentDictionary or immutable snapshots.</p>`, followUps: ['Why is SemaphoreSlim not reentrant a problem with recursion?'] },
    { q: 'How do concurrent collections stay thread-safe, and what are their pitfalls?', level: 'I', a: `<p>${C('ConcurrentDictionary')} uses striped locks for writes and lock-free reads; ${C('ConcurrentQueue')}/${C('ConcurrentStack')} are lock-free using Interlocked on segment indices; ${C('ConcurrentBag')} keeps per-thread lists with work stealing; ${C('BlockingCollection')} wraps them with blocking and bounding. Pitfalls: each method is atomic but sequences are not (ContainsKey then indexer), GetOrAdd/AddOrUpdate delegates may run multiple times (keep them pure, use Lazy for expensive creation), Count/ToArray take all locks, enumeration is not a snapshot, ConcurrentBag is not a queue.</p>`, followUps: ['When would you use ImmutableDictionary instead?'] },
    { q: 'What are Channels and why prefer them over BlockingCollection?', level: 'A', a: `<p>${C('System.Threading.Channels')} provide async producer/consumer queues with separate ${C('ChannelWriter<T>')} and ${C('ChannelReader<T>')}. Waiting readers/writers do not block threads (ValueTask-based, pooled awaiters), bounded channels apply backpressure with configurable full modes (Wait, DropOldest, DropNewest, DropWrite), ${C('Complete(exception)')} propagates end-of-stream and errors, and ${C('ReadAllAsync')} integrates with await foreach. BlockingCollection blocks threads while waiting, which wastes pool threads in async servers. Channels are the standard way to feed background services and build pipelines.</p>`, followUps: ['How do you shut down a channel pipeline gracefully?'] },
    { q: 'When does Parallel.For help and when does it hurt?', level: 'I', a: `<p>It helps for CPU-bound work with many independent iterations, each doing enough work to outweigh scheduling, on a machine with idle cores. It hurts when iterations share state (locks serialise them, false sharing ruins caches), when bodies are tiny (overhead dominates — use range partitioning), for I/O-bound work (threads block; use async), and in servers where requests already use all cores. Use thread-local state for aggregation, set MaxDegreeOfParallelism when appropriate, and measure: Amdahl's law limits the speed-up by the sequential fraction.</p>`, followUps: ['How does Partitioner.Create change performance?'] },
    { q: 'Thread vs ThreadPool vs Task: which do you use and why?', level: 'B', a: `<p>Use <b>Tasks</b> (and async/await) by default: they compose, propagate exceptions and cancellation, and run on the thread pool. The <b>thread pool</b> reuses a small set of background threads for short work items and adapts the count to load. Create a dedicated <b>Thread</b> (or a LongRunning task) only for long-lived blocking work — a message loop, a legacy blocking reader, work that needs a specific apartment state, priority or stack size — because blocking pool threads starves everything else.</p>`, followUps: ['What happens when you block pool threads under load?'] },
    { q: 'How would you implement "print FooBar alternately" and what does it teach?', level: 'I', a: `<p>Two threads, two semaphores: ${C('fooTurn = new SemaphoreSlim(1)')}, ${C('barTurn = new SemaphoreSlim(0)')}. Foo waits on fooTurn, prints, releases barTurn; Bar waits on barTurn, prints, releases fooTurn. Exactly one permit exists at any time, so the threads strictly alternate regardless of start order or scheduling. It teaches that thread start order guarantees nothing, that coordination must be explicit, and that semaphores (or Monitor.Wait/Pulse with a turn variable) express "whose turn it is" without busy-waiting.</p>`, followUps: ['Solve it with Monitor.Wait/PulseAll.'] },
    { q: 'What is false sharing and how do you avoid it?', level: 'A', a: `<p>CPUs keep coherence at cache-line granularity (64 bytes on most x64/ARM64). If two threads update different variables that sit on the same line — adjacent array elements or neighbouring fields — each write invalidates the line in the other core's cache, so they ping-pong the line and run far slower than expected, even though there is no logical sharing. Avoid it by giving each thread its own local accumulator and merging at the end, padding hot per-thread data to separate cache lines (e.g. ${C('[StructLayout(LayoutKind.Explicit, Size = 128)]')}), or spacing array slots apart.</p>`, followUps: ['How would you detect it?'] },
    { q: 'How do you make a class thread-safe? Describe strategies other than locking.', level: 'A', a: `<p>Options from simplest: <b>immutability</b> (readonly fields, records, immutable collections — no synchronisation needed); <b>confinement</b> (state touched by only one thread, e.g. an actor or a single consumer of a channel); <b>message passing</b> instead of shared memory; <b>thread-safe building blocks</b> (concurrent collections, Lazy, Interlocked); <b>copy-on-write</b> snapshots published with Interlocked.Exchange; and finally <b>locks</b> guarding explicit invariants. Document the thread-safety guarantees of each type, and test with stress tests and tools.</p>`, followUps: ['What does "thread-safe" mean for an iterator?'] },
    { q: 'Predict: two threads each run `for (i = 0; i < 1000; i++) count++;` on a shared int. What values can count have?', level: 'E', a: `<p>Anything from <b>2</b> to <b>2000</b> in theory (and usually something below 2000 in practice). The upper bound needs no interleaving. The surprising minimum is 2: thread A reads 0, thread B runs 999 iterations (count = 999), A writes 1, B reads 1, A runs its remaining 999 iterations (count = 1000), B writes 2. Each increment is read-modify-write, so arbitrary interleavings can overwrite progress. Interlocked.Increment or a lock makes the result always 2000.</p>`, followUps: ['How would volatile change the answer?'] }
  );

  registerModule({
    id: 'csharp10',
    title: 'Concurrency & Threading',
    intro: `<p>Async/await covers waiting; this module covers <b>doing several things at once</b> with shared memory. You will start threads and understand the thread pool, see race conditions happen step by step and fix them with ${C('lock')} and ${C('Monitor')}, use ${C('Interlocked')} and ${C('volatile')} with a working understanding of the .NET memory model, limit concurrency with ${C('SemaphoreSlim')} and share read-mostly data with ${C('ReaderWriterLockSlim')}, use concurrent collections correctly, build producer/consumer pipelines with ${C('System.Threading.Channels')}, and speed up CPU-bound work with ${C('Parallel')} and PLINQ.</p>
<p>Visualizers let you play the scheduler: interleave two increments, race CompareExchange calls, queue readers and writers, fill a bounded channel and partition a parallel sum. Practice includes the classic coordination problems (FooBar, ZeroEvenOdd, Print in Order, Dining Philosophers), all with deterministic tests.</p>`,
    goals: [
      'Choose between dedicated threads, the thread pool and tasks, and avoid starving the pool',
      'Recognise race conditions and fix them with lock, Interlocked or atomic collection operations',
      'Explain visibility, reordering and what volatile does and does not guarantee',
      'Use SemaphoreSlim, ReaderWriterLockSlim, Barrier and events for coordination; prevent deadlocks with lock ordering',
      'Build producer/consumer pipelines with Channels and BlockingCollection',
      'Parallelise CPU-bound work with Parallel and PLINQ using thread-local state'
    ],
    prereqs: `C# 8 (memory, GC and Span&lt;T&gt;) and C# 9 (async/await and tasks).`,
    hours: 14,
    langNotes: {
      csharp: `<p>${C('int')} and reference reads/writes are atomic, ${C('long')}/${C('double')} only on 64-bit, structs never. ${C('lock')} cannot contain ${C('await')}; use ${C('SemaphoreSlim.WaitAsync')}. Unhandled exceptions on any thread crash the process. ${C('Dictionary')}/${C('List')} are not safe for concurrent writes. .NET 8 has no ${C('System.Threading.Lock')} type (added in .NET 9): lock on a private object. Parallel.ForEach with an async lambda creates async void delegates — use ${C('Parallel.ForEachAsync')}.</p>`
    },
    topics: topics.map(function (t) { t.examples.forEach(function (ex) { if (typeof ex.code === 'string') ex.code = { lang: 'csharp', code: ex.code, run: true }; }); return t; }),
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
