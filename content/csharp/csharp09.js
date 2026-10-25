(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C# code is written with String.raw so "\n" stays a C# escape

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function out(lines) {
    return { type: 'text', label: 'Console output', html: lines && lines.length ? '<code>' + lines.map(function (s) { return H.esc(String(s)); }).join('<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function nums(input, def, max) {
    var a = String(input === undefined ? def : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!a.length || a.some(function (x) { return isNaN(x) || x < 0 || x > 5000; })) throw new Error('Type durations in ms between 0 and 5000, e.g. ' + def);
    if (a.length > (max || 6)) throw new Error('Use at most ' + (max || 6) + ' values');
    return a;
  }
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.thr) parts.push({ type: 'vars', label: 'Threads', vals: s.thr, hl: s.hthr || {} });
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'State', vals: s.v, hl: s.hv || {} });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Task and Task<T>
     ====================================================================== */
  function taskStateSim(input) {
    var kind = String(input === undefined ? 'success' : input).trim().toLowerCase();
    if (['success', 'fault', 'cancel'].indexOf(kind) < 0) throw new Error('Type success, fault or cancel');
    var states = ['WaitingForActivation', 'Running', 'RanToCompletion', 'Faulted', 'Canceled'];
    var frames = [];
    function f(narr, cur, vals, hl) {
      var h = {}; states.forEach(function (s, i) { if (s === cur) h[i] = hl || 'cur'; });
      frames.push({ narr: narr, parts: [{ type: 'array', label: 'TaskStatus', values: states, hl: h }, { type: 'vars', label: 'Task&lt;int&gt; t', vals: vals }] });
    }
    f('<code>Task&lt;int&gt; t = Task.Run(() => Compute());</code> — the work item is queued to the <b>thread pool</b>; the caller gets the Task object immediately.', 'WaitingForActivation', { IsCompleted: false, Result: '(not available yet)' });
    f('A pool thread picks the work item up and runs the delegate.', 'Running', { IsCompleted: false, thread: 'pool thread #7' });
    if (kind === 'success') {
      f('The delegate returns 42. The task stores the result and becomes <b>RanToCompletion</b>. Continuations (awaiters) are scheduled.', 'RanToCompletion', { IsCompleted: true, IsCompletedSuccessfully: true, Result: 42 }, 'ok');
      f('<code>await t</code> now yields 42 without blocking. A completed task can be awaited any number of times.', 'RanToCompletion', { 'await t': 42 }, 'ok');
    } else if (kind === 'fault') {
      f('The delegate throws InvalidOperationException. The task captures it and becomes <b>Faulted</b>; t.Exception is an AggregateException wrapping it.', 'Faulted', { IsCompleted: true, IsFaulted: true, Exception: 'AggregateException(InvalidOperationException)' }, 'bad');
      f('<code>await t</code> rethrows the <b>original</b> InvalidOperationException (with its stack trace). <code>t.Result</code> or <code>t.Wait()</code> would throw the AggregateException instead.', 'Faulted', { 'await t': 'throws InvalidOperationException' }, 'bad');
    } else {
      f('The delegate observes its CancellationToken and throws OperationCanceledException for that token → the task becomes <b>Canceled</b>.', 'Canceled', { IsCompleted: true, IsCanceled: true }, 'bad');
      f('<code>await t</code> throws TaskCanceledException (an OperationCanceledException).', 'Canceled', { 'await t': 'throws TaskCanceledException' }, 'bad');
    }
    return frames;
  }
  topics.push({
    title: 'Task & Task<T>: Promises of Future Results',
    analogy: `<p>At a busy burger counter you order, pay, and get a <b>receipt with a number</b>. You do not stand at the grill — you can sit, chat, or order a drink. When your number lights up, the food is ready (or the cashier tells you they ran out). A ${C('Task<T>')} is that receipt: an object representing work that will finish later with a result of type T, an error, or a cancellation. ${C('await')} is "go do something else and call me when my number lights up".</p>`,
    explain: `<p>A ${C('Task')} represents an asynchronous operation; ${C('Task<T>')} one that produces a value. A task is <b>not a thread</b>: it may run on a thread-pool thread (CPU work via ${C('Task.Run')}), or use no thread at all while it waits (I/O like a network call, a timer from ${C('Task.Delay')}, or a ${C('TaskCompletionSource')} completed by an event).</p>
${P(`
Task<int> cpu = Task.Run(() => ExpensiveSum());          // runs on the thread pool
Task<string> io = httpClient.GetStringAsync(url);        // no thread blocked while waiting
Task delay = Task.Delay(500);                            // a timer, no thread
Task<int> done = Task.FromResult(42);                    // already completed
int result = await cpu;                                  // asynchronously wait for the value`)}
<h4>States</h4>
${H.table(['TaskStatus', 'Meaning'], [
      [C('Created / WaitingForActivation / WaitingToRun'), 'not started yet or waiting for a dependency'],
      [C('Running'), 'executing a delegate (only delegate tasks; promise tasks skip it)'],
      [C('RanToCompletion'), 'finished successfully; ' + C('Result') + ' is available'],
      [C('Faulted'), 'an exception escaped; ' + C('Exception') + ' holds an AggregateException'],
      [C('Canceled'), 'cancelled via an OperationCanceledException for its token']
    ])}
<h4>Getting the result</h4>
<ul><li>${C('await t')} — the right way: does not block, unwraps the first exception.</li>
<li>${C('t.Result')}, ${C('t.Wait()')}, ${C('t.GetAwaiter().GetResult()')} — <b>block</b> the calling thread; Result/Wait wrap errors in AggregateException. Avoid them in async code (topic 5).</li></ul>
<h4>Creating tasks</h4>
<ul><li>${C('Task.Run(func)')}: offload CPU-bound work to the pool. Do not wrap I/O methods in Task.Run — they are already asynchronous.</li>
<li>${C('async')} methods: the compiler builds the task for you.</li>
<li>${C('Task.FromResult')}, ${C('Task.CompletedTask')}, ${C('Task.FromException')}, ${C('Task.FromCanceled')}: already-completed tasks.</li>
<li>${C('TaskCompletionSource<T>')}: a task you complete manually (bridge callbacks/events to tasks). Create it with ${C('TaskCreationOptions.RunContinuationsAsynchronously')} so that completing it does not run arbitrary continuations inline on your thread.</li>
<li>Avoid ${C('new Task(...)')} + ${C('Start()')} and ${C('Task.Factory.StartNew')} unless you need their special options.</li></ul>`,
    clues: ['An operation that completes later (I/O, timer, event) → return Task / Task&lt;T&gt;', 'CPU-heavy work that must not block a UI or request thread → Task.Run', 'Callback- or event-based API → wrap with TaskCompletionSource', 'Need the value → await, not .Result'],
    code: [{ lang: 'csharp', run: true, title: 'Creating, awaiting and inspecting tasks (runnable)', code: R`
Task<long> cpu = Task.Run(() =>
{
    long s = 0;
    for (int i = 1; i <= 1_000_000; i++) s += i;
    return s;
});
Task timer = Task.Delay(50);
Task<int> ready = Task.FromResult(42);

Console.WriteLine($"ready.IsCompleted = {ready.IsCompleted}");
Console.WriteLine($"sum = {await cpu}");
await timer;
Console.WriteLine($"timer done, ready = {await ready}");

Func<int> boom = () => throw new InvalidOperationException("boom");
Task<int> failing = Task.Run(boom);
try { await failing; }
catch (InvalidOperationException e) { Console.WriteLine($"await rethrew {e.Message}; status {failing.Status}"); }

var tcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
_ = Task.Run(async () => { await Task.Delay(10); tcs.SetResult("event fired"); });
Console.WriteLine(await tcs.Task);` }],
    codeTitle: ['Task.Run, Task.Delay, FromResult, TaskCompletionSource'],
    viz: { title: 'The life of a Task', input: 'success', inputLabel: 'outcome: success, fault or cancel', gen: taskStateSim },
    examples: [
      { title: 'A task is not a thread', html: `<p>Ten thousand ${C('Task.Delay')} calls run concurrently on a handful of threads because waiting on a timer needs no thread at all.</p>`, code: R`
var sw = System.Diagnostics.Stopwatch.StartNew();
var tasks = Enumerable.Range(0, 10_000).Select(_ => Task.Delay(100));
await Task.WhenAll(tasks);
Console.WriteLine($"10,000 delays finished in about {sw.ElapsedMilliseconds / 100 * 100} ms, threads used: {ThreadPool.ThreadCount < 1000}");` },
      { title: 'Result vs await exception shapes', html: `<p>${C('.Result')} wraps the failure in an ${C('AggregateException')}; ${C('await')} throws the original type, which is what your catch blocks expect.</p>`, code: R`
Func<int> bad = () => throw new FormatException("bad");
var t = Task.Run(bad);
try { _ = t.Result; } catch (AggregateException ae) { Console.WriteLine("Result: " + ae.InnerException!.GetType().Name); }
try { await t; } catch (FormatException fe) { Console.WriteLine("await: " + fe.GetType().Name); }` },
      { title: 'Wrapping a callback API with TaskCompletionSource', html: `<p>Legacy APIs that report completion through callbacks or events can be exposed as tasks; the caller then simply awaits.</p>`, code: R`
Console.WriteLine(await DownloadAsync("data.txt"));

static Task<string> DownloadAsync(string name)
{
    var tcs = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
    LegacyDownload(name, ok => { if (ok) tcs.SetResult(name + " downloaded"); else tcs.SetException(new IOException(name)); });
    return tcs.Task;
}
static void LegacyDownload(string name, Action<bool> callback) => ThreadPool.QueueUserWorkItem(_ => callback(true));` }
    ],
    deepDive: `<p><b>Delegate tasks vs promise tasks.</b> ${C('Task.Run')} creates a delegate task that executes code. Most tasks in modern code are <b>promise tasks</b> — created by async methods, TaskCompletionSource or I/O — that represent an event and never "run" themselves. Stephen Cleary's rule: "there is no thread" for I/O.</p>
<p><b>The thread pool.</b> Task.Run queues to the pool's global queue; tasks queued from a pool thread go to its local queue (LIFO) and idle workers steal from others. The pool injects threads slowly (hill-climbing) when work items block, which is why blocking pool threads causes "thread-pool starvation" latency spikes.</p>
<p><b>Unobserved exceptions.</b> A faulted task nobody awaits raises ${C('TaskScheduler.UnobservedTaskException')} when finalized; since .NET 4.5 it no longer crashes the process. Fire-and-forget code must catch its own exceptions.</p>
<p><b>Task.Run vs StartNew.</b> ${C('Task.Factory.StartNew(asyncLambda)')} returns ${C('Task<Task>')} (needs ${C('Unwrap')}) and uses the current scheduler; Task.Run handles async lambdas and always uses the default scheduler. Use StartNew only for ${C('TaskCreationOptions.LongRunning')} dedicated-thread work.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes async code fluently; the subtle bugs are in task creation. <b>Use AI as a partner:</b> <code>Which of these Task.Run calls wrap I/O that is already async?</code> <b>Where AI goes wrong:</b> ${C('Task.Run(async () => await httpClient...)')} (pointless thread hop), ${C('.Result')} in library code, fire-and-forget tasks whose exceptions vanish, TaskCompletionSource without RunContinuationsAsynchronously. <b>What you must still own:</b> knowing for each operation whether it is CPU-bound or I/O-bound and where it runs.</p>`
  });

  /* ======================================================================
     TOPIC 2 — async/await and the state machine
     ====================================================================== */
  var SM_CODE = [
    'static async Task<int> GetLengthAsync(string url)',
    '{',
    '    Console.WriteLine("1: start");',
    '    string body = await DownloadAsync(url);   // state 0',
    '    Console.WriteLine("3: resumed");',
    '    return body.Length;',
    '}',
    '',
    'var task = GetLengthAsync("x");',
    'Console.WriteLine("2: caller continues");',
    'int n = await task;'
  ].join('\n');
  function smSim(input) {
    var done = String(input === undefined ? 'pending' : input).trim().toLowerCase();
    if (['pending', 'completed'].indexOf(done) < 0) throw new Error('Type "pending" (download not finished) or "completed" (already cached)');
    var o = [], s = [];
    s.push({ l: 9, thr: { 'main thread': 'calls GetLengthAsync' }, v: { state: '-1 (not started)' }, out: o.slice(), narr: 'Calling an async method runs its body <b>synchronously</b> on the caller\'s thread until the first await of an incomplete task.' });
    o.push('1: start');
    s.push({ l: 3, thr: { 'main thread': 'inside GetLengthAsync' }, v: { state: -1 }, out: o.slice(), narr: 'Prints "1: start" — still on the caller\'s thread, no task switch yet.' });
    if (done === 'pending') {
      s.push({ l: 4, cls: 'bad', thr: { 'main thread': 'inside GetLengthAsync' }, v: { state: 0, 'awaiter.IsCompleted': false }, out: o.slice(), narr: 'DownloadAsync returns an <b>incomplete</b> task. The state machine stores state = 0 and its locals, registers itself as the continuation, and <b>returns</b> an incomplete Task&lt;int&gt; to the caller.' });
      o.push('2: caller continues');
      s.push({ l: 10, thr: { 'main thread': 'back in caller', 'network': 'download in progress (no thread)' }, v: { state: 0, task: 'incomplete' }, out: o.slice(), narr: 'The caller continues immediately. No thread is waiting for the download.' });
      s.push({ l: 11, thr: { 'main thread': 'awaiting task (free to do other work)' }, v: { state: 0 }, out: o.slice(), narr: 'The caller awaits the outer task — the same mechanism, one level up.' });
      o.push('3: resumed');
      s.push({ l: 5, thr: { 'pool thread #4': 'runs MoveNext()' }, v: { state: 0, body: '"<html>…"' }, out: o.slice(), narr: 'The download completes. The continuation calls <b>MoveNext()</b> on the state machine (on a pool thread here, because a console app has no SynchronizationContext). It jumps to state 0\'s resume point, gets the result and prints "3: resumed".' });
    } else {
      s.push({ l: 4, cls: 'ok', thr: { 'main thread': 'inside GetLengthAsync' }, v: { state: -1, 'awaiter.IsCompleted': true }, out: o.slice(), narr: 'The task returned by DownloadAsync is <b>already completed</b> (e.g. cached). await does not suspend: it takes the result and continues synchronously — the fast path.' });
      o.push('3: resumed');
      s.push({ l: 5, thr: { 'main thread': 'inside GetLengthAsync' }, v: { state: -1 }, out: o.slice(), narr: 'Prints "3: resumed" <b>before</b> the caller\'s line 2 — the whole method ran synchronously.' });
      o.push('2: caller continues');
      s.push({ l: 10, thr: { 'main thread': 'back in caller' }, v: { task: 'already RanToCompletion' }, out: o.slice(), narr: 'The returned task is already complete, so the caller\'s await will not suspend either.' });
    }
    s.push({ l: 6, cls: 'ok', v: { result: 'body.Length', 'task.Status': 'RanToCompletion' }, out: o.slice(), narr: '<code>return body.Length</code> sets the result on the builder (AsyncTaskMethodBuilder), completing the task and running the caller\'s continuation.' });
    return codeFrames(SM_CODE, s);
  }
  topics.push({
    title: 'async/await & the Compiler State Machine',
    analogy: `<p>Reading a novel while waiting for a train: when the train arrives you put a <b>bookmark</b> in, get on, and later continue exactly where you stopped. ${C('await')} is the bookmark. The compiler turns your method into an object (a <b>state machine</b>) that remembers which page (state number) and which notes (local variables) you had, so it can stop at each await and resume later — possibly on a different thread, like reading the rest of the book on the train instead of the platform.</p>`,
    explain: `<p>${C('async')} lets a method use ${C('await')}; ${C('await')} on an incomplete task <b>suspends</b> the method without blocking a thread and returns control to the caller. When the awaited task completes, the rest of the method runs as a continuation.</p>
${P(`
async Task<int> GetLengthAsync(string url)
{
    Console.WriteLine("start");                 // runs synchronously on the caller's thread
    string body = await http.GetStringAsync(url);   // may suspend here
    Console.WriteLine("resumed");               // continuation: maybe another thread
    return body.Length;                         // completes the returned Task<int>
}`)}
<h4>What the compiler generates (simplified)</h4>
${P(`
struct GetLengthAsync_StateMachine : IAsyncStateMachine
{
    public int state;                            // -1 running, 0 = waiting at first await, -2 done
    public AsyncTaskMethodBuilder<int> builder;
    public string url; private string body;      // locals become fields
    private TaskAwaiter<string> awaiter;

    public void MoveNext()
    {
        if (state == 0) goto Resume0;
        Console.WriteLine("start");
        awaiter = http.GetStringAsync(url).GetAwaiter();
        if (!awaiter.IsCompleted)
        {
            state = 0;
            builder.AwaitUnsafeOnCompleted(ref awaiter, ref this);   // box to heap, register continuation
            return;                                                  // give the thread back
        }
    Resume0:
        body = awaiter.GetResult();             // rethrows exceptions
        Console.WriteLine("resumed");
        builder.SetResult(body.Length);
    }
}`)}
<h4>Key facts</h4>
<ul><li>An async method runs <b>synchronously until the first await of an incomplete task</b>. If every awaited task is already complete, no suspension happens at all.</li>
<li>Exceptions inside an async method are stored in the returned task and rethrown at the await — even exceptions thrown before the first await (argument validation therefore surprises people; use a non-async wrapper to throw eagerly).</li>
<li>The state machine starts as a struct and is boxed to the heap only on the first real suspension.</li>
<li>Return types: ${C('Task')}, ${C('Task<T>')}, ${C('ValueTask')}, ${C('ValueTask<T>')}, ${C('IAsyncEnumerable<T>')}, or ${C('void')} — only for event handlers, because exceptions in ${C('async void')} crash the process and callers cannot await it.</li>
<li>Async all the way: once a method awaits, its callers should be async too. Mixing in blocking calls causes deadlocks and starvation (topic 5).</li></ul>`,
    clues: ['A method calls I/O and must not block its thread → async Task and await', 'Code after await runs later, possibly on another thread → do not rely on thread identity', 'Exception "disappears" → async void or an un-awaited task', 'Eager argument validation in an async API → split into a sync wrapper and an async local function'],
    code: [{ lang: 'csharp', run: true, title: 'Synchronous fast path vs real suspension (runnable)', code: R`
Console.WriteLine("-- completed task --");
var t1 = Work(Task.FromResult("cached"));
Console.WriteLine("caller continues");
await t1;

Console.WriteLine("-- incomplete task --");
var tcs = new TaskCompletionSource<string>();
var t2 = Work(tcs.Task);
Console.WriteLine("caller continues");
tcs.SetResult("downloaded");      // the continuation runs inline here
Console.WriteLine("after SetResult");
await t2;

static async Task Work(Task<string> source)
{
    Console.WriteLine("  start");
    string s = await source;
    Console.WriteLine($"  resumed with {s}");
}` }],
    codeTitle: ['Where an async method actually yields'],
    viz: { title: 'Step through the state machine', input: 'pending', inputLabel: '"pending" (task not finished) or "completed" (already done)', gen: smSim },
    examples: [
      { title: 'async void swallows nothing — it crashes', html: `<p>An exception escaping an ${C('async void')} method is raised on the SynchronizationContext (or the thread pool), where nobody can catch it. Return ${C('Task')} instead so callers can await and catch.</p>`, code: R`
try { await SafeAsync(); }
catch (InvalidOperationException e) { Console.WriteLine("caught: " + e.Message); }

static async Task SafeAsync()
{
    await Task.Yield();
    throw new InvalidOperationException("from async Task");
}` },
      { title: 'Eager validation with a local function', html: `<p>Validation before the first await would otherwise only surface when the task is awaited. Splitting the method throws immediately at the call.</p>`, code: R`
try { var t = ReadAsync(null!); }
catch (ArgumentNullException) { Console.WriteLine("thrown at call time"); }

static Task<int> ReadAsync(string path)
{
    ArgumentNullException.ThrowIfNull(path);
    return Core();
    async Task<int> Core() { await Task.Yield(); return path.Length; }
}` },
      { title: 'Sequential vs concurrent awaits', html: `<p>Awaiting each call before starting the next serialises them. Start all tasks first, then await, to overlap the waiting.</p>`, code: R`
var sw = System.Diagnostics.Stopwatch.StartNew();
await Task.Delay(100); await Task.Delay(100);
long sequential = sw.ElapsedMilliseconds;
sw.Restart();
Task a = Task.Delay(100), b = Task.Delay(100);
await a; await b;
Console.WriteLine($"sequential ~{sequential / 100 * 100} ms, concurrent ~{sw.ElapsedMilliseconds / 100 * 100} ms");` }
    ],
    deepDive: `<p><b>Awaitable pattern.</b> ${C('await x')} works on anything with a ${C('GetAwaiter()')} method returning a type with ${C('IsCompleted')}, ${C('OnCompleted')}/${C('UnsafeOnCompleted')} and ${C('GetResult()')} — tasks, ValueTasks, ${C('Task.Yield()')}, ${C('ConfiguredTaskAwaitable')}, even your own types.</p>
<p><b>ExecutionContext flows.</b> ${C('AsyncLocal<T>')} values, culture and security context flow across awaits via ExecutionContext; SynchronizationContext is a separate thing (topic 5).</p>
<p><b>Allocations.</b> A method that completes synchronously allocates only the returned Task (and for cached results — ${C('Task.CompletedTask')}, small ${C('Task<bool>')} and ${C('Task<int>')} values — not even that). On suspension the boxed state machine and the task are one allocation (the builder combines them). ValueTask removes the task allocation for synchronous completions (topic 6).</p>
<p><b>Debugging.</b> Async stack traces show the logical call chain since .NET Core 2.1; Visual Studio's Parallel Stacks/Tasks windows show awaiting state machines.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code is "async all the way" by default, which is good. <b>Use AI as a partner:</b> <code>Explain the order of the console lines in this program, step by step</code> — a great way to verify your mental model. <b>Where AI goes wrong:</b> ${C('async void')} outside event handlers, sequential awaits where concurrency was intended, assuming code after await runs on the same thread, ${C('async')} methods with no await (warning CS1998). <b>What you must still own:</b> reasoning about what runs when, and where exceptions surface.</p>`,
    problems: [{
      title: 'Trace the Await Order', level: 'Medium', tags: ['async/await', 'TaskCompletionSource', 'ordering'],
      statement: `<p>Implement ${C('TraceAwait(int mode)')}. It creates a ${C('TaskCompletionSource')} ${C('tcs')} (default options), starts ${C('A(log)')} and logs: async ${C('A')} logs ${C('"A1"')}, awaits ${C('B(log)')}, logs ${C('"A2"')}. Async ${C('B')} logs ${C('"B1"')}, then by mode: 0 awaits ${C('Task.CompletedTask')}; 1 awaits ${C('tcs.Task')}; 2 throws ${C('InvalidOperationException("x")')}; 3 awaits ${C('tcs.Task')}; then logs ${C('"B2"')}. After starting A, the caller logs ${C('"after call"')}, then completes the tcs (mode 3: ${C('SetCanceled()')}, otherwise ${C('SetResult(0)')}), logs ${C('"after set"')}, and awaits A's task, logging ${C('"done"')}, ${C('"caught: x"')} for an InvalidOperationException or ${C('"canceled"')} for an OperationCanceledException.</p>`,
      constraints: `0 ≤ mode ≤ 3`,
      example: `<p>mode 1 → ${C('["A1", "B1", "after call", "B2", "A2", "after set", "done"]')}.</p>`,
      brute: { why: `<p>Guessing without understanding the state machine usually puts "after call" right after "A1". The trace shows that an async method runs synchronously until the first incomplete await, and that completing a default TaskCompletionSource runs awaiting continuations inline.</p>`, code: R`
static string[] Guess(int mode) => new[] { "A1", "after call", "B1", "B2", "A2", "after set", "done" };` },
      mcq: { q: 'In mode 1, why are "B2" and "A2" logged before "after set"?', options: ['SetResult on a default TaskCompletionSource runs the awaiting continuations synchronously inside the SetResult call', 'Because B runs on another thread first', 'Logs are sorted', 'Because await blocks the caller'], answer: 0, explain: 'Without RunContinuationsAsynchronously, completing the TCS invokes B\'s continuation inline, which completes B and runs A\'s continuation inline too.' },
      hints: [`<p>Make the solution's entry synchronous: ${C('return Run(mode).GetAwaiter().GetResult();')} with an ${C('async Task<string[]> Run')}.</p>`, `<p>In mode 0 and 2 the await in A sees an already completed task, so A finishes before the caller logs "after call".</p>`, `<p>An exception thrown in async B faults B's task; A's ${C('await B')} rethrows it, so A is faulted too, and the caller's await throws.</p>`],
      solution: {
        approach: `<p>Write the methods exactly as described. The log captures the real interleaving: synchronous execution up to the first incomplete await, inline continuations on SetResult/SetCanceled, and exceptions stored in tasks until awaited.</p>`,
        code: R`
public class Solution
{
    public string[] TraceAwait(int mode) => Run(mode).GetAwaiter().GetResult();

    private static async Task<string[]> Run(int mode)
    {
        var log = new List<string>();
        var tcs = new TaskCompletionSource<int>();
        Task a = A(mode, tcs, log);
        log.Add("after call");
        if (mode == 3) tcs.SetCanceled(); else tcs.SetResult(0);
        log.Add("after set");
        try { await a; log.Add("done"); }
        catch (InvalidOperationException e) { log.Add("caught: " + e.Message); }
        catch (OperationCanceledException) { log.Add("canceled"); }
        return log.ToArray();
    }

    private static async Task A(int mode, TaskCompletionSource<int> tcs, List<string> log)
    {
        log.Add("A1");
        await B(mode, tcs, log);
        log.Add("A2");
    }

    private static async Task B(int mode, TaskCompletionSource<int> tcs, List<string> log)
    {
        log.Add("B1");
        if (mode == 0) await Task.CompletedTask;
        else if (mode == 2) throw new InvalidOperationException("x");
        else await tcs.Task;
        log.Add("B2");
    }
}`,
        dry: { head: ['mode', 'first incomplete await', 'logged before "after call"', 'tail'], rows: [['0', 'none', 'A1 B1 B2 A2', 'after set, done'], ['1', 'B awaits tcs', 'A1 B1', 'B2 A2 inline in SetResult, after set, done'], ['2', 'none (B faults)', 'A1 B1', 'after set, caught: x'], ['3', 'B awaits tcs', 'A1 B1', 'SetCanceled → after set, canceled']] },
        complexity: `<p>O(1). The point is the control flow.</p>`,
        followUps: ['What changes with TaskCreationOptions.RunContinuationsAsynchronously?', 'Replace await tcs.Task with await Task.Yield() — why is the order no longer deterministic?']
      },
      tests: { sig: 'int -> string[]', fn: 'traceAwait', cases: [
        [[0], ['A1', 'B1', 'B2', 'A2', 'after call', 'after set', 'done']],
        [[1], ['A1', 'B1', 'after call', 'B2', 'A2', 'after set', 'done']],
        [[2], ['A1', 'B1', 'after call', 'after set', 'caught: x']],
        [[3], ['A1', 'B1', 'after call', 'after set', 'canceled']]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Task.WhenAll and Task.WhenAny
     ====================================================================== */
  function whenSim(input) {
    var d = nums(input, '300 100 200', 6);
    var frames = [], maxD = Math.max.apply(null, d), minD = Math.min.apply(null, d);
    var order = d.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    frames.push({ narr: 'Start ' + d.length + ' tasks <b>at once</b> (no await between them). Bars show each task\'s duration.', parts: [{ type: 'bars', label: 'durations (ms)', values: d }, { type: 'vars', vals: { 'sequential awaits would take': d.reduce(function (a, b) { return a + b; }, 0) + ' ms', 'WhenAll takes': maxD + ' ms', 'WhenAny takes': minD + ' ms' } }] });
    var finished = [];
    order.forEach(function (o, k) {
      finished.push('T' + o[1]);
      var hl = {}; order.slice(0, k + 1).forEach(function (q) { hl[q[1]] = 'ok'; });
      var narr = 't = ' + o[0] + ' ms: <b>T' + o[1] + '</b> completes.';
      if (k === 0) narr += ' <code>await Task.WhenAny(...)</code> resumes now and returns <b>the task</b> T' + o[1] + ' (await it again to get its result or exception). The other tasks keep running!';
      if (k === order.length - 1) narr += ' All done: <code>await Task.WhenAll(...)</code> resumes and returns the results <b>in input order</b>, not completion order.';
      frames.push({ narr: narr, parts: [{ type: 'array', label: 'tasks (green = finished)', values: d.map(function (x, i) { return 'T' + i + ' (' + x + ')'; }), hl: hl }, { type: 'queue', label: 'completion order', items: finished.slice() }] });
    });
    frames.push({ narr: 'Results array from WhenAll: index i holds Ti\'s result, regardless of which finished first.', parts: [{ type: 'array', label: 'await Task.WhenAll(tasks)', values: d.map(function (x, i) { return 'result of T' + i; }) }, note('If any task faults, WhenAll still waits for all, then its task is Faulted with <b>all</b> exceptions; await rethrows only the first.')] });
    return frames;
  }
  topics.push({
    title: 'Task.WhenAll & Task.WhenAny: Composing Tasks',
    analogy: `<p>You order starters, mains and drinks from three different counters at a food court. ${C('WhenAll')} is "we sit down to eat when <b>everything</b> has arrived" — the wait equals the slowest counter, not the sum of all three. ${C('WhenAny')} is "the first tray that arrives, we start eating" — and the other counters keep cooking; you still have to collect (or cancel) those orders.</p>`,
    explain: `<h4>Task.WhenAll: concurrency and fan-in</h4>
${P(`
Task<User> userTask = GetUserAsync(id);         // start all first
Task<Order[]> ordersTask = GetOrdersAsync(id);
await Task.WhenAll(userTask, ordersTask);       // wait for both
var user = userTask.Result;                     // safe: already completed (or use await again)

int[] lengths = await Task.WhenAll(urls.Select(GetLengthAsync));  // results in INPUT order`)}
<ul><li>Completes when all tasks complete. Time ≈ the slowest task, not the sum.</li>
<li>${C('Task<T>[]')} input gives ${C('T[]')} results in input order.</li>
<li>If tasks fault, WhenAll waits for all of them, and its task is Faulted with <b>every</b> exception in ${C('Exception.InnerExceptions')}; ${C('await')} rethrows only the first. Inspect ${C('whenAllTask.Exception')} to see all.</li>
<li>Thousands of concurrent requests can overwhelm a server — throttle with ${C('SemaphoreSlim')} or ${C('Parallel.ForEachAsync')} with ${C('MaxDegreeOfParallelism')}.</li></ul>
<h4>Task.WhenAny: first finisher, timeouts, interleaving</h4>
${P(`
Task<string> work = FetchAsync();
Task timeout = Task.Delay(TimeSpan.FromSeconds(2));
Task first = await Task.WhenAny(work, timeout);
if (first == timeout) throw new TimeoutException();
string value = await work;          // await the winner to get its result / exception

// .NET 6+: the built-in version
string v2 = await FetchAsync().WaitAsync(TimeSpan.FromSeconds(2));`)}
<ul><li>Returns ${C('Task<Task>')}: the completed task itself, never faults (even if the winner faulted). Await the returned task to observe its result.</li>
<li>Losers keep running. Cancel them with a ${C('CancellationTokenSource')} if their work is no longer needed, and observe their exceptions.</li>
<li>Processing in completion order: loop "WhenAny over remaining, remove the winner" (O(n²) for n tasks; fine for small n). .NET 9 adds ${C('Task.WhenEach')}.</li></ul>
<h4>Other combinators</h4>
<p>${C('Parallel.ForEachAsync(items, options, async (item, ct) => ...)')} (.NET 6) processes items with bounded concurrency. ${C('task.WaitAsync(timeout, token)')} adds a timeout/cancellation to any task without cancelling the underlying operation.</p>`,
    clues: ['Several independent async calls → start them all, then await Task.WhenAll', 'Need results in the original order → WhenAll returns them in input order', 'Timeout or "first response wins" → WhenAny (or WaitAsync)', 'Hundreds of calls at once → throttle with SemaphoreSlim or Parallel.ForEachAsync'],
    code: [{ lang: 'csharp', run: true, title: 'WhenAll order, WhenAny winner, all exceptions (runnable)', code: R`
int[] delays = { 60, 10, 30 };
int[] results = await Task.WhenAll(delays.Select(async (d, i) => { await Task.Delay(d); return i * 100 + d; }));
Console.WriteLine("WhenAll (input order): " + string.Join(", ", results));

var tasks = delays.Select(async d => { await Task.Delay(d); return d; }).ToList();
Task<int> winner = await Task.WhenAny(tasks);
Console.WriteLine($"WhenAny winner: {await winner} ms task");
await Task.WhenAll(tasks);   // observe the losers too

Task all = Task.WhenAll(Fail("a"), Fail("b"), Task.Delay(5));
try { await all; }
catch (Exception first)
{
    Console.WriteLine($"await rethrew only: {first.Message}");
    Console.WriteLine("all errors: " + string.Join(", ", all.Exception!.InnerExceptions.Select(e => e.Message)));
}

static async Task Fail(string name) { await Task.Yield(); throw new InvalidOperationException(name); }` }],
    codeTitle: ['Combinators in practice'],
    viz: { title: 'Timeline of concurrent tasks', input: '300 100 200', inputLabel: 'task durations in ms', gen: whenSim },
    examples: [
      { title: 'Timeout with WaitAsync', html: `<p>${C('WaitAsync')} stops <i>waiting</i> after the timeout and throws ${C('TimeoutException')}; the underlying operation keeps running unless you also cancel it with a token.</p>`, code: R`
var cts = new CancellationTokenSource();
Task slow = Task.Delay(5000, cts.Token);
try { await slow.WaitAsync(TimeSpan.FromMilliseconds(50)); }
catch (TimeoutException) { Console.WriteLine("timed out"); cts.Cancel(); }` },
      { title: 'Bounded concurrency with Parallel.ForEachAsync', html: `<p>Process many items with at most N in flight — friendlier to databases and remote APIs than an unbounded WhenAll.</p>`, code: R`
int inFlight = 0, peak = 0;
await Parallel.ForEachAsync(Enumerable.Range(0, 20), new ParallelOptions { MaxDegreeOfParallelism = 4 }, async (i, ct) =>
{
    int now = Interlocked.Increment(ref inFlight);
    int p; while ((p = Volatile.Read(ref peak)) < now && Interlocked.CompareExchange(ref peak, now, p) != p) { }
    await Task.Delay(10, ct);
    Interlocked.Decrement(ref inFlight);
});
Console.WriteLine($"peak concurrency <= 4: {peak <= 4}");` },
      { title: 'Process in completion order', html: `<p>The classic WhenAny loop handles each result as soon as it is ready instead of waiting for the slowest one.</p>`, code: R`
var pending = new List<Task<int>> { Delayed(30), Delayed(10), Delayed(20) };
while (pending.Count > 0)
{
    Task<int> t = await Task.WhenAny(pending);
    pending.Remove(t);
    Console.Write(await t + " ");
}
static async Task<int> Delayed(int ms) { await Task.Delay(ms * 3); return ms; }` }
    ],
    deepDive: `<p><b>WhenAll internals.</b> It registers one continuation per task and counts completions with Interlocked; the result array is allocated once. With an empty input it returns an already-completed task.</p>
<p><b>Exceptions and cancellation.</b> If any task faulted, WhenAll's task is Faulted; otherwise if any was canceled it is Canceled. Exceptions from all tasks are preserved. A common helper awaits WhenAll and on failure throws ${C('all.Exception')} (the AggregateException) to keep every error.</p>
<p><b>WhenAny pitfalls.</b> Each WhenAny call registers continuations on all tasks; a loop over n tasks is O(n²) registrations. For large n use channels or WhenEach (.NET 9). Unobserved faults in losers are lost unless awaited.</p>
<p><b>Throttling patterns.</b> SemaphoreSlim + WhenAll, Parallel.ForEachAsync, TPL Dataflow ${C('ActionBlock')} with ${C('MaxDegreeOfParallelism')}, or Channels with N consumers (module 10).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI readily parallelises with WhenAll — sometimes too readily. <b>Use AI as a partner:</b> <code>Which of these awaits are independent and could run concurrently? Which must stay sequential?</code> <b>Where AI goes wrong:</b> WhenAll over 10,000 HTTP calls with no throttling, ignoring all-but-first exceptions, timeouts with WhenAny that leave the slow task running forever, reading ${C('.Result')} before WhenAll completed. <b>What you must still own:</b> concurrency limits of downstream systems and the failure policy (fail fast, collect all, partial results).</p>`,
    problems: [{
      title: 'Results in Input Order', level: 'Easy', tags: ['Task.WhenAll', 'ordering'],
      statement: `<p>For each i start a task that waits ${C('delays[i]')} milliseconds with ${C('Task.Delay')} and then returns ${C('delays[i] * 2 + i')}. Run them concurrently and return the results in <b>input order</b>, whatever order they finish in.</p>`,
      constraints: `0 ≤ n ≤ 20, 0 ≤ delays[i] ≤ 50`,
      example: `<p>delays [30, 0, 10] → [60, 1, 22] even though the second task finishes first.</p>`,
      brute: { why: `<p>Awaiting each task in a loop before starting the next gives the right values but takes the <b>sum</b> of the delays; starting all and awaiting WhenAll takes only the maximum.</p>`, code: R`
static async Task<int[]> Sequential(int[] delays)
{
    var r = new int[delays.Length];
    for (int i = 0; i < delays.Length; i++) { await Task.Delay(delays[i]); r[i] = delays[i] * 2 + i; }
    return r;
}` },
      mcq: { q: 'What order does `await Task.WhenAll(tasks)` return results in?', options: ['The order of the tasks passed in', 'Completion order', 'Random', 'Sorted by value'], answer: 0, explain: 'Element i of the result array is the result of tasks[i].' },
      hints: [`<p>Create the tasks with ${C('delays.Select(async (d, i) => { await Task.Delay(d); return d * 2 + i; })')}.</p>`, `<p>${C('ToArray()')} the tasks so they all start before you await.</p>`, `<p>Expose a synchronous method that calls ${C('.GetAwaiter().GetResult()')} for the tests.</p>`],
      solution: {
        approach: `<p>Start every task, then await WhenAll once. WhenAll preserves input order.</p>`,
        code: R`
public class Solution
{
    public int[] InOrder(int[] delays) => InOrderAsync(delays).GetAwaiter().GetResult();

    private static async Task<int[]> InOrderAsync(int[] delays)
    {
        Task<int>[] tasks = delays.Select(async (d, i) =>
        {
            await Task.Delay(d);
            return d * 2 + i;
        }).ToArray();
        return await Task.WhenAll(tasks);
    }
}`,
        dry: { head: ['task', 'delay', 'finishes', 'result slot'], rows: [['T0', '30', '3rd', '[0] = 60'], ['T1', '0', '1st', '[1] = 1'], ['T2', '10', '2nd', '[2] = 22']] },
        complexity: `<p>Wall time ≈ max(delays); O(n) memory.</p>`,
        followUps: ['Return results in completion order instead', 'Limit to 3 delays running at once']
      },
      tests: { sig: 'int[] -> int[]', fn: 'inOrder', cases: [
        [[[30, 0, 10]], [60, 1, 22]], [[[]], []], [[[5]], [10]], [[[0, 0, 0]], [0, 1, 2]], [[[50, 40, 30, 20, 10]], [100, 81, 62, 43, 24]], [[[1, 50, 1]], [2, 101, 4]]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Cancellation tokens and timeouts
     ====================================================================== */
  function cancelSim(input) {
    var p = String(input === undefined ? '6 3' : input).trim().split(/[\s,]+/).map(Number);
    var n = p[0], c = p.length > 1 ? p[1] : -1;
    if (isNaN(n) || n < 1 || n > 10 || isNaN(c) || c < -1 || c >= n) throw new Error('Type "n cancelAt": 1 ≤ n ≤ 10 items, cancelAt between -1 (never) and n-1');
    var code = ['for (int i = 0; i < n; i++)', '{', '    token.ThrowIfCancellationRequested();', '    await ProcessAsync(i, token);', '    processed++;', '    if (i == cancelAt) cts.Cancel();   // e.g. user clicked Cancel', '}'].join('\n');
    var s = [], requested = false, processed = 0;
    for (var i = 0; i < n; i++) {
      if (requested) {
        s.push({ l: 3, cls: 'bad', v: { i: i, IsCancellationRequested: true, processed: processed }, narr: 'Iteration ' + i + ': the token is cancelled, so <b>ThrowIfCancellationRequested</b> throws OperationCanceledException. The loop stops at a safe point — no half-processed item.' });
        s.push({ l: 7, cls: 'bad', v: { 'task status': 'Canceled', processed: processed }, narr: 'The exception escapes the async method, so its task ends <b>Canceled</b> (because the exception carries the same token). The caller\'s await throws OperationCanceledException.' });
        return codeFrames(code, s);
      }
      s.push({ l: 3, cls: 'ok', v: { i: i, IsCancellationRequested: false, processed: processed }, narr: 'Iteration ' + i + ': check the token — not cancelled, continue.' });
      processed++;
      s.push({ l: [4, 5], v: { i: i, processed: processed }, narr: 'Process item ' + i + ' (the token is passed down so the I/O itself can be aborted early too).' });
      if (i === c) { requested = true; s.push({ l: 6, cls: 'bad', v: { i: i, IsCancellationRequested: true, processed: processed }, narr: '<code>cts.Cancel()</code>: the token flips to cancelled and registered callbacks run. Nothing is interrupted forcibly — code must <b>observe</b> the token.' }); }
    }
    s.push({ l: 7, cls: 'ok', v: { processed: processed, 'task status': 'RanToCompletion' }, narr: requested ? 'Cancellation was requested after the last item, but the loop had no more checks — the method completes normally. Cancellation is cooperative.' : 'All items processed; the task completes normally.' });
    return codeFrames(code, s);
  }
  topics.push({
    title: 'Cancellation Tokens & Timeouts',
    analogy: `<p>A tour guide hands every group member a <b>walkie-talkie</b> tuned to one channel. When the guide announces "we are heading back", nobody is dragged away mid-sentence; each person finishes what they are doing and walks back at the next sensible moment. The guide's transmitter is the ${C('CancellationTokenSource')}, every walkie-talkie is a ${C('CancellationToken')}, and listening to it is <b>cooperative</b>: work stops only where the code checks.</p>`,
    explain: `<p>.NET cancellation is <b>cooperative</b>: the caller requests it, the callee decides where it is safe to stop.</p>
${P(`
using var cts = new CancellationTokenSource();
cts.CancelAfter(TimeSpan.FromSeconds(5));          // timeout
try
{
    await DownloadAllAsync(urls, cts.Token);
}
catch (OperationCanceledException) when (cts.IsCancellationRequested)
{
    Console.WriteLine("cancelled or timed out");
}

async Task DownloadAllAsync(IEnumerable<string> urls, CancellationToken ct)
{
    foreach (var url in urls)
    {
        ct.ThrowIfCancellationRequested();         // check between items
        await http.GetStringAsync(url, ct);         // pass the token down
    }
}`)}
<h4>The pieces</h4>
${H.table(['Type / member', 'Role'], [
      [C('CancellationTokenSource'), 'owns the signal: ' + C('Cancel()') + ', ' + C('CancelAfter(t)') + ', ' + C('Token') + '; disposable'],
      [C('CancellationToken'), 'read-only view passed to callees: ' + C('IsCancellationRequested') + ', ' + C('ThrowIfCancellationRequested()') + ', ' + C('Register(callback)')],
      [C('CancellationToken.None'), 'a token that never cancels (default value)'],
      [C('CreateLinkedTokenSource(a, b)'), 'cancels when any source cancels — combine a caller token with your own timeout'],
      [C('OperationCanceledException'), 'the conventional way to report cancellation; ' + C('TaskCanceledException') + ' derives from it']
    ])}
<h4>Conventions</h4>
<ul><li>Accept a ${C('CancellationToken cancellationToken = default')} as the <b>last</b> parameter of async APIs, and pass it to everything you call.</li>
<li>Check at natural boundaries (between items, before expensive steps); do not check after you have made irreversible changes.</li>
<li>When cancelled, throw ${C('OperationCanceledException')} (via ThrowIfCancellationRequested) so the task ends ${C('Canceled')}, not Faulted — unless returning partial results is part of your contract.</li>
<li>Catch it at the top level; distinguish "caller cancelled" from "my timeout fired" by checking which token is cancelled.</li>
<li>Dispose CancellationTokenSources you create (especially with CancelAfter, which uses a timer). ASP.NET Core supplies ${C('HttpContext.RequestAborted')} automatically as an action parameter.</li></ul>`,
    clues: ['Long-running async operation or loop → accept and observe a CancellationToken', 'Timeout → CancelAfter or WaitAsync, plus passing the token down', 'Caller token + own timeout → CreateLinkedTokenSource', 'Distinguish timeout vs user cancel → check which source IsCancellationRequested'],
    code: [{ lang: 'csharp', run: true, title: 'Cancel a loop, link a timeout (runnable)', code: R`
using var cts = new CancellationTokenSource();
var work = CountAsync(1000, cts.Token);
await Task.Delay(30);
cts.Cancel();
try { await work; }
catch (OperationCanceledException) { Console.WriteLine($"cancelled, task status: {work.Status}"); }

using var caller = new CancellationTokenSource();
using var timeout = new CancellationTokenSource(TimeSpan.FromMilliseconds(40));
using var linked = CancellationTokenSource.CreateLinkedTokenSource(caller.Token, timeout.Token);
try { await Task.Delay(5000, linked.Token); }
catch (OperationCanceledException) when (timeout.IsCancellationRequested)
{
    Console.WriteLine("our timeout fired (caller did not cancel)");
}

static async Task<int> CountAsync(int n, CancellationToken ct)
{
    int done = 0;
    for (int i = 0; i < n; i++)
    {
        ct.ThrowIfCancellationRequested();
        await Task.Delay(5, ct);
        done++;
    }
    return done;
}` }],
    codeTitle: ['Cooperative cancellation and linked tokens'],
    viz: { title: 'Cooperative cancellation in a loop', input: '6 3', inputLabel: '"n cancelAt" — items and the index after which Cancel() is called (-1 = never)', gen: cancelSim },
    examples: [
      { title: 'Register a callback to abort a non-token API', html: `<p>When an operation cannot take a token, ${C('token.Register')} runs a callback on cancellation — here it completes a TaskCompletionSource as canceled.</p>`, code: R`
using var cts = new CancellationTokenSource(20);
var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
using (cts.Token.Register(() => tcs.TrySetCanceled(cts.Token)))
{
    try { await tcs.Task; } catch (TaskCanceledException) { Console.WriteLine("aborted via Register"); }
}` },
      { title: 'Returning partial results instead of throwing', html: `<p>Some APIs (search, best-effort aggregation) prefer to stop early and return what they have. Make it explicit in the contract, and check ${C('IsCancellationRequested')} instead of throwing.</p>`, code: R`
using var cts = new CancellationTokenSource();
var found = new List<int>();
for (int i = 0; i < 1_000_000 && !cts.IsCancellationRequested; i++)
{
    if (i % 100_000 == 0) found.Add(i);
    if (found.Count == 3) cts.Cancel();
}
Console.WriteLine("partial: " + string.Join(",", found));` },
      { title: 'TaskCanceledException is an OperationCanceledException', html: `<p>Catch ${C('OperationCanceledException')}: it covers ${C('TaskCanceledException')} from Task.Delay and HttpClient as well as ThrowIfCancellationRequested.</p>`, code: R`
try { await Task.Delay(1000, new CancellationToken(canceled: true)); }
catch (OperationCanceledException e) { Console.WriteLine(e.GetType().Name + " caught as OperationCanceledException"); }` }
    ],
    deepDive: `<p><b>Token internals.</b> A CancellationToken is a struct wrapping a reference to its source. ${C('Register')} adds callbacks to a lock-free list; ${C('Cancel()')} runs them synchronously on the cancelling thread (exceptions aggregated) — keep callbacks short. ${C('Register')} returns a ${C('CancellationTokenRegistration')} you should dispose to avoid leaks with long-lived tokens.</p>
<p><b>HttpClient timeouts.</b> ${C('HttpClient.Timeout')} produces a TaskCanceledException whose InnerException is a TimeoutException (.NET 5+), letting you tell timeouts from caller cancellations.</p>
<p><b>Canceled vs Faulted.</b> An async method's task becomes Canceled when an OperationCanceledException escapes (in .NET Core regardless of whether its token matches a parameter); Task.Run's task becomes Canceled only if the exception's token equals the token passed to Task.Run.</p>
<p><b>Reusing sources.</b> A cancelled source cannot be reset; .NET 6 added ${C('TryReset()')} for sources that were not cancelled, useful for pooling.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated async methods often accept a CancellationToken and then forget to pass it to inner calls. <b>Use AI as a partner:</b> <code>Find every async call in this file that does not receive the method's CancellationToken</code>. <b>Where AI goes wrong:</b> catching OperationCanceledException and logging it as an error, creating CancellationTokenSources without disposing them, checking the token after side effects, using ${C('Thread.Abort')}-style thinking. <b>What you must still own:</b> choosing safe cancellation points and the semantics (throw vs partial result).</p>`,
    problems: [{
      title: 'Stop at the Next Safe Point', level: 'Medium', tags: ['CancellationToken', 'cooperative cancellation'],
      statement: `<p>Process items 0..n−1 asynchronously. Each iteration first calls ${C('token.ThrowIfCancellationRequested()')}, then awaits ${C('Task.Yield()')} (the "work"), increments ${C('processed')}, and if ${C('i == cancelAt')} calls ${C('cts.Cancel()')}. Return ${C('"processed P, canceled"')} if the loop was stopped by cancellation, or ${C('"processed P, completed"')} if it finished.</p>`,
      constraints: `0 ≤ n ≤ 1000, −1 ≤ cancelAt &lt; n`,
      example: `<p>n = 6, cancelAt = 3 → ${C('"processed 4, canceled"')}; n = 3, cancelAt = 2 → ${C('"processed 3, completed"')} (cancellation came after the last check).</p>`,
      brute: { why: `<p>Checking a shared ${C('bool')} flag works single-threaded, but a CancellationToken is the standard, thread-safe, composable signal that every .NET async API understands (and you can pass it to Task.Delay, HttpClient, streams).</p>`, code: R`
static string WithFlag(int n, int cancelAt)
{
    bool stop = false; int processed = 0;
    for (int i = 0; i < n; i++)
    {
        if (stop) return $"processed {processed}, canceled";
        processed++;
        if (i == cancelAt) stop = true;
    }
    return $"processed {processed}, completed";
}` },
      mcq: { q: 'Cancel() is called after the last item. What happens?', options: ['Nothing — no further check runs, so the method completes normally', 'The method throws immediately', 'The last item is rolled back', 'The task becomes Faulted'], answer: 0, explain: 'Cancellation is cooperative: only code that observes the token reacts to it.' },
      hints: [`<p>Create ${C('using var cts = new CancellationTokenSource();')} and keep ${C('cts.Token')}.</p>`, `<p>Wrap the loop in ${C('try { ... } catch (OperationCanceledException)')}.</p>`, `<p>The count is P = cancelAt + 1 when cancellation stops the loop early.</p>`],
      solution: {
        approach: `<p>Check at the top of each iteration — a safe point where no item is half-processed — and report whether the loop finished or was stopped.</p>`,
        code: R`
public class Solution
{
    public string CountUntilCanceled(int n, int cancelAt) => RunAsync(n, cancelAt).GetAwaiter().GetResult();

    private static async Task<string> RunAsync(int n, int cancelAt)
    {
        using var cts = new CancellationTokenSource();
        CancellationToken token = cts.Token;
        int processed = 0;
        try
        {
            for (int i = 0; i < n; i++)
            {
                token.ThrowIfCancellationRequested();
                await Task.Yield();
                processed++;
                if (i == cancelAt) cts.Cancel();
            }
            return $"processed {processed}, completed";
        }
        catch (OperationCanceledException)
        {
            return $"processed {processed}, canceled";
        }
    }
}`,
        dry: { head: ['i', 'check', 'processed', 'cancel?'], rows: [['0', 'ok', '1', 'no'], ['3', 'ok', '4', 'yes → Cancel()'], ['4', 'throws', '4', 'return "processed 4, canceled"']] },
        complexity: `<p>O(n) iterations, O(1) extra space.</p>`,
        followUps: ['Pass the token to Task.Delay instead of Task.Yield — what changes?', 'Add a timeout with CancelAfter and tell the two causes apart']
      },
      tests: { sig: 'int int -> string', fn: 'countUntilCanceled', cases: [
        [[6, 3], 'processed 4, canceled'], [[3, 2], 'processed 3, completed'], [[5, -1], 'processed 5, completed'], [[0, -1], 'processed 0, completed'], [[5, 0], 'processed 1, canceled'], [[1000, 998], 'processed 999, canceled']
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 5 — SynchronizationContext, ConfigureAwait and deadlocks
     ====================================================================== */
  function deadlockSim(input) {
    var mode = String(input === undefined ? 'result' : input).trim().toLowerCase();
    if (['result', 'configureawait', 'await'].indexOf(mode) < 0) throw new Error('Type result, configureawait or await');
    var code = ['// UI button handler (has a SynchronizationContext)', 'void OnClick() {', '    string s = LoadAsync().Result;          // blocks the UI thread', '}', 'async Task<string> LoadAsync() {', '    var data = await http.GetStringAsync(url)' + (mode === 'configureawait' ? '.ConfigureAwait(false);' : ';'), '    return data.ToUpper();               // continuation', '}'].join('\n');
    if (mode === 'await') code = code.replace('void OnClick() {', 'async void OnClick() {').replace('string s = LoadAsync().Result;          // blocks the UI thread', 'string s = await LoadAsync();           // UI thread stays free');
    var s = [];
    s.push({ l: mode === 'await' ? 3 : 3, thr: { 'UI thread': 'runs OnClick' }, v: { 'UI message queue': '[]' }, narr: 'The click handler calls LoadAsync on the <b>UI thread</b>, whose SynchronizationContext posts continuations back to that same thread.' });
    s.push({ l: 6, thr: { 'UI thread': 'inside LoadAsync', network: 'request in flight' }, v: { captured: mode === 'configureawait' ? 'nothing (ConfigureAwait(false))' : 'UI SynchronizationContext' }, narr: 'await on an incomplete task ' + (mode === 'configureawait' ? '<b>does not capture</b> the context because of ConfigureAwait(false).' : '<b>captures</b> the current SynchronizationContext so the rest of the method resumes on the UI thread.') + ' LoadAsync returns an incomplete task.' });
    if (mode === 'result') {
      s.push({ l: 3, cls: 'bad', thr: { 'UI thread': 'BLOCKED in .Result' }, hthr: { 'UI thread': 'bad' }, v: { 'UI message queue': '[]' }, narr: '<code>.Result</code> <b>blocks</b> the UI thread until the task completes.' });
      s.push({ l: 7, cls: 'bad', thr: { 'UI thread': 'BLOCKED in .Result', network: 'done' }, hthr: { 'UI thread': 'bad' }, v: { 'UI message queue': '[continuation of LoadAsync]' }, narr: 'The download completes. The continuation is <b>posted to the UI thread</b>... which is blocked waiting for that very continuation.' });
      s.push({ l: [3, 7], cls: 'bad', thr: { 'UI thread': 'waits for task', task: 'waits for UI thread' }, hthr: { 'UI thread': 'bad', task: 'bad' }, v: { result: 'DEADLOCK — the app freezes' }, hv: { result: 'bad' }, narr: '<b>Deadlock.</b> Each side waits for the other forever. The same happens in classic ASP.NET (not ASP.NET Core, which has no SynchronizationContext).' });
    } else if (mode === 'configureawait') {
      s.push({ l: 3, cls: 'bad', thr: { 'UI thread': 'BLOCKED in .Result' }, hthr: { 'UI thread': 'bad' }, v: {}, narr: '<code>.Result</code> still blocks the UI thread (bad UX: frozen window)...' });
      s.push({ l: 7, cls: 'ok', thr: { 'UI thread': 'BLOCKED in .Result', 'pool thread': 'runs continuation' }, v: {}, narr: '...but the continuation runs on a <b>thread-pool thread</b>, so the task completes.' });
      s.push({ l: 3, cls: 'ok', thr: { 'UI thread': 'unblocked' }, v: { result: 'no deadlock, but the UI froze while waiting' }, narr: 'ConfigureAwait(false) in library code avoids the deadlock — the real fix is still to <b>not block</b>.' });
    } else {
      s.push({ l: 3, cls: 'ok', thr: { 'UI thread': 'free: processes other messages' }, hthr: { 'UI thread': 'ok' }, v: {}, narr: 'With <code>await</code> the handler also suspends, returning the UI thread to its message loop. The window stays responsive.' });
      s.push({ l: 7, cls: 'ok', thr: { 'UI thread': 'runs continuation' }, v: { 'UI message queue': '[continuation] → processed' }, narr: 'The continuation is posted to the UI thread, which is free to run it. Then OnClick resumes on the UI thread and can update controls safely.' });
      s.push({ l: 3, cls: 'ok', thr: { 'UI thread': 'free' }, v: { result: 's assigned on the UI thread' }, narr: '<b>Async all the way</b>: no blocking, no deadlock.' });
    }
    return codeFrames(code, s);
  }
  topics.push({
    title: 'SynchronizationContext, ConfigureAwait & Sync-over-Async Deadlocks',
    analogy: `<p>A small restaurant has <b>one waiter</b> (the UI thread) and a rule: only the waiter may serve customers. The waiter places an order with the kitchen and then <b>stands at the kitchen door staring</b> until it is ready (${C('.Result')}). The kitchen finishes and rings the bell: "waiter, come serve this". But the waiter is busy standing at the door waiting for... that plate. Nobody moves — a <b>deadlock</b>. The fix: the waiter takes other orders while the kitchen cooks (${C('await')}), or the kitchen is allowed to hand plates to anyone (${C('ConfigureAwait(false)')}).</p>`,
    explain: `<p>When ${C('await')} suspends, it captures the current ${C('SynchronizationContext')} (or, if none, the current ${C('TaskScheduler')}) and later resumes the method <b>through</b> it.</p>
${H.table(['Environment', 'Context', 'Continuations run on'], [
      ['WinForms, WPF, MAUI, Blazor WASM', 'single-threaded UI context', 'the UI thread (so you can touch controls after await)'],
      ['classic ASP.NET (.NET Framework)', 'AspNetSynchronizationContext', 'one request at a time'],
      ['ASP.NET Core, console apps, worker services, tests (xUnit has one but no deadlock issue)', 'none', 'any thread-pool thread']
    ])}
<h4>The classic deadlock (sync over async)</h4>
${P(`
// WPF button click
void Button_Click(object s, RoutedEventArgs e)
{
    var text = LoadAsync().Result;     // blocks the UI thread
}
async Task<string> LoadAsync()
{
    var data = await http.GetStringAsync(url);   // continuation wants the UI thread
    return data;                                 // never runs → deadlock
}`)}
<p>Fixes in order of preference: (1) <b>async all the way</b> — make the handler ${C('async void')} (event handlers are the one valid use) and ${C('await')}; (2) in <b>library</b> code use ${C('ConfigureAwait(false)')} on awaits that do not need the context; (3) as a last resort run the async code on the pool and block: ${C('Task.Run(() => LoadAsync()).GetAwaiter().GetResult()')}.</p>
<h4>ConfigureAwait(false)</h4>
<ul><li>Tells await not to capture the context: the continuation runs on whatever thread completed the task (usually the pool).</li>
<li>Use it in general-purpose libraries (NuGet packages) on every await — they cannot know whether the caller has a context.</li>
<li>Do not use it in UI code that touches controls after the await, or where you need the request context.</li>
<li>In ASP.NET Core application code it makes no difference (no context), so many teams omit it there.</li>
<li>.NET 8 adds ${C('ConfigureAwaitOptions')} (${C('ContinueOnCapturedContext')}, ${C('SuppressThrowing')}, ${C('ForceYielding')}) for ${C('Task')}.</li></ul>
<h4>Sync-over-async in servers: thread-pool starvation</h4>
<p>Even without a context, blocking on tasks (${C('.Result')}, ${C('.Wait()')}) in ASP.NET Core ties up pool threads while they wait for other pool work; under load the pool cannot grow fast enough and latency explodes. Async-over-sync (wrapping blocking calls in Task.Run inside a server) wastes threads the same way.</p>`,
    clues: ['App freezes on .Result / .Wait() in a UI or classic ASP.NET app → sync-over-async deadlock', 'General-purpose library code → ConfigureAwait(false) on every await', 'UI code that updates controls after await → keep the default (capture context)', 'Server latency spikes under load with blocking calls → thread-pool starvation'],
    code: [{ lang: 'csharp', run: true, title: 'Simulating a single-threaded context: deadlock-free await vs ConfigureAwait (runnable)', code: R`
var ctx = new SingleThreadContext();
ctx.Run(async () =>
{
    int ui = Environment.CurrentManagedThreadId;
    await Task.Delay(10);
    Console.WriteLine($"default await resumed on the context thread: {Environment.CurrentManagedThreadId == ui}");
    await Task.Delay(10).ConfigureAwait(false);
    Console.WriteLine($"after ConfigureAwait(false) on the context thread: {Environment.CurrentManagedThreadId == ui}");
});

sealed class SingleThreadContext : SynchronizationContext
{
    private readonly System.Collections.Concurrent.BlockingCollection<(SendOrPostCallback, object?)> _queue = new();
    public override void Post(SendOrPostCallback d, object? state) => _queue.Add((d, state));

    public void Run(Func<Task> main)
    {
        var previous = Current;
        SetSynchronizationContext(this);
        try
        {
            Task t = main();
            t.ContinueWith(_ => _queue.CompleteAdding(), TaskScheduler.Default);
            foreach (var (d, s) in _queue.GetConsumingEnumerable()) d(s);
            t.GetAwaiter().GetResult();
        }
        finally { SetSynchronizationContext(previous); }
    }
}` }],
    codeTitle: ['A UI-like context in a console app'],
    viz: { title: 'Why .Result deadlocks on a UI thread', input: 'result', inputLabel: 'result (block), configureawait (block + ConfigureAwait(false)), await (async all the way)', gen: deadlockSim },
    examples: [
      { title: 'Library code with ConfigureAwait(false)', html: `<p>A reusable library method should not care which context its caller has, so it opts out on every await.</p>`, code: R`
Console.WriteLine(await CountLinesAsync(new StringReader("a\nb\nc")));

static async Task<int> CountLinesAsync(TextReader reader)
{
    int n = 0;
    while (await reader.ReadLineAsync().ConfigureAwait(false) is not null) n++;
    return n;
}` },
      { title: 'ConfigureAwaitOptions.SuppressThrowing (.NET 8)', html: `<p>Waits for a task to finish without throwing if it faulted or was cancelled — handy when shutting down background work you have already cancelled.</p>`, code: R`
var cts = new CancellationTokenSource();
Task background = Task.Delay(Timeout.Infinite, cts.Token);
cts.Cancel();
await background.ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing);
Console.WriteLine($"background finished as {background.Status}, no exception thrown");` },
      { title: 'Last-resort blocking from a sync entry point', html: `<p>When a synchronous interface must call async code (and you cannot change the interface), hop to the thread pool first so no context is captured, then block. It costs a thread; it is a migration tool, not a design.</p>`, code: R`
string value = Task.Run(() => FetchAsync()).GetAwaiter().GetResult();
Console.WriteLine(value);
static async Task<string> FetchAsync() { await Task.Delay(10); return "fetched"; }` }
    ],
    deepDive: `<p><b>What await captures exactly.</b> The awaiter checks ${C('SynchronizationContext.Current')}; if it is non-null and not the base type, the continuation is posted to it. Otherwise, if ${C('TaskScheduler.Current')} is not the default scheduler, it is queued there. Otherwise it runs on the completing thread or the pool. ConfigureAwait(false) skips both.</p>
<p><b>Inline continuations.</b> Without a context, a continuation may run synchronously on the thread that completed the task (e.g. inside ${C('TaskCompletionSource.SetResult')}), which can cause reentrancy surprises and stack dives — hence ${C('RunContinuationsAsynchronously')}.</p>
<p><b>Async-over-sync.</b> Exposing ${C('Task.Run(() => SyncWork())')} as a "FooAsync" method in a library misleads callers: it is not scalable I/O, just a thread hop. Let the caller decide to offload CPU work.</p>
<p><b>Diagnosing starvation.</b> Symptoms: high latency with low CPU, rising ${C('ThreadPool.ThreadCount')} and ${C('ThreadPool.PendingWorkItemCount')} in dotnet-counters. dotnet-stack/dumps show many threads blocked in ${C('Task.Wait')} or ${C('.Result')}.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often "fixes" a compile error in a synchronous method by appending ${C('.Result')} to an async call — a deadlock or starvation bug in waiting. <b>Use AI as a partner:</b> <code>List every place this code blocks on a task (.Result, .Wait(), GetResult()) and propose an async-all-the-way refactor</code>. <b>Where AI goes wrong:</b> adding ConfigureAwait(false) in UI code that then touches controls (cross-thread exceptions), or claiming ConfigureAwait(false) is needed everywhere in ASP.NET Core. <b>What you must still own:</b> knowing which environment your code runs in and keeping blocking calls out of async paths.</p>`
  });

  /* ======================================================================
     TOPIC 6 — ValueTask
     ====================================================================== */
  function vtSim(input) {
    var keys = String(input === undefined ? '1 2 1 1 3 2' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!keys.length || keys.some(isNaN) || keys.length > 10) throw new Error('Type up to 10 integer keys, e.g. 1 2 1 1 3 2');
    var cache = {}, frames = [], taskAllocs = 0, vtAllocs = 0;
    frames.push({ narr: 'A cache in front of a slow async load. Compare returning <b>Task&lt;int&gt;</b> vs <b>ValueTask&lt;int&gt;</b> from GetAsync(key).', parts: [{ type: 'map', label: 'cache', entries: [] }, { type: 'vars', vals: { 'Task allocations': 0, 'ValueTask allocations': 0 } }] });
    keys.forEach(function (k) {
      var hit = cache[k] !== undefined;
      if (hit) { taskAllocs += (k >= -1 && k <= 8) ? 0 : 1; }
      else { cache[k] = k * k; taskAllocs++; vtAllocs++; }
      var hl = {}; hl[String(k)] = hit ? 'ok' : 'cur';
      frames.push({ narr: 'GetAsync(' + k + '): ' + (hit ? '<b>cache hit</b> — the result is available synchronously. <code>new ValueTask&lt;int&gt;(value)</code> wraps it in a struct: no allocation. A Task&lt;int&gt; would need Task.FromResult (allocates, except for a few cached small values).' : '<b>miss</b> — real async I/O; both versions allocate a task for the pending operation.'), parts: [{ type: 'map', label: 'cache', entries: Object.keys(cache).map(function (x) { return [x, cache[x]]; }), hl: hl }, { type: 'vars', vals: { 'Task allocations': taskAllocs, 'ValueTask allocations': vtAllocs }, hl: { 'ValueTask allocations': 'ok' } }] });
    });
    frames.push({ narr: 'The more hits, the bigger the saving. But a ValueTask must be awaited <b>once</b>, and never awaited concurrently or after completion via .Result — call <code>.AsTask()</code> if you need Task semantics.', parts: [note('Rules: await it once; do not store it; do not await it twice; do not read .Result unless IsCompletedSuccessfully.')] });
    return frames;
  }
  topics.push({
    title: 'ValueTask & ValueTask<T>: Avoiding Allocations on the Fast Path',
    analogy: `<p>A library usually gives you a <b>reservation slip</b> (a Task) when you ask for a book, because the book might be in storage. But 90% of the time the book is right on the shelf. A ${C('ValueTask')} is a librarian who just hands you the book when it is there, and only writes a slip when it really must be fetched. Slips are cheap but not free; at scale, skipping them matters. The catch: a slip can be photocopied and checked many times; the "maybe a book, maybe a slip" thing must be used <b>exactly once</b>.</p>`,
    explain: `<p>${C('ValueTask<T>')} is a <b>struct</b> that holds either a result (synchronous completion), a ${C('Task<T>')}, or an ${C('IValueTaskSource<T>')} (a poolable, reusable async operation). It exists to remove the Task allocation when a method usually completes synchronously.</p>
${P(`
private readonly Dictionary<int, string> _cache = new();

public ValueTask<string> GetAsync(int id)
{
    if (_cache.TryGetValue(id, out var hit))
        return new ValueTask<string>(hit);          // no allocation
    return new ValueTask<string>(LoadAndCacheAsync(id));   // real async path
}

private async Task<string> LoadAndCacheAsync(int id)
{
    string value = await db.LoadAsync(id);
    _cache[id] = value;
    return value;
}`)}
<h4>Rules for consumers (important!)</h4>
<ul><li>Await a ValueTask <b>once</b>. Do not await it twice, concurrently, or after storing it in a field.</li>
<li>Do not call ${C('.Result')} / ${C('GetAwaiter().GetResult()')} unless ${C('IsCompletedSuccessfully')} — it may be backed by a pooled source that has already been reused.</li>
<li>Need Task behaviour (WhenAll, caching, multiple awaits)? Call ${C('.AsTask()')} once.</li></ul>
<h4>When to return ValueTask</h4>
<ul><li>Hot methods that usually complete synchronously: cached lookups, buffered stream reads (${C('Stream.ReadAsync(Memory<byte>)')} returns ${C('ValueTask<int>')}), channel reads when data is available.</li>
<li>Interfaces where implementations may be synchronous (${C('IAsyncDisposable.DisposeAsync')}, ${C('IAsyncEnumerator.MoveNextAsync')}).</li>
<li>Default to ${C('Task')} otherwise: it is simpler, safer and already cached for ${C('Task.CompletedTask')}, ${C('Task<bool>')} and small ints.</li></ul>
<h4>async ValueTask methods</h4>
<p>An ${C('async ValueTask<T>')} method that completes synchronously allocates nothing; if it suspends, it allocates like an async Task method (a pooling builder can be opted into with ${C('[AsyncMethodBuilder(typeof(PoolingAsyncValueTaskMethodBuilder<>))]')}).</p>`,
    clues: ['Hot async method that is usually synchronous (cache hit, buffered data) → ValueTask&lt;T&gt;', 'Interface method some implementations complete synchronously → ValueTask', 'Need to await twice, store or combine with WhenAll → .AsTask() or just use Task', 'Not measured as hot → keep Task'],
    code: [{ lang: 'csharp', run: true, title: 'Cache with ValueTask, measured (runnable)', code: R`
var cache = new SquareCache();
await cache.GetAsync(7);                      // miss: real async work
long before = GC.GetAllocatedBytesForCurrentThread();
int sum = 0;
for (int i = 0; i < 10_000; i++) sum += await cache.GetAsync(7);   // hits
long after = GC.GetAllocatedBytesForCurrentThread();
Console.WriteLine($"sum {sum}, bytes allocated for 10,000 hits: {after - before}, loads: {cache.Loads}");

ValueTask<int> once = cache.GetAsync(7);
Task<int> asTask = once.AsTask();             // convert once if you need Task semantics
Console.WriteLine(await Task.WhenAll(asTask, cache.GetAsync(8).AsTask()) is [49, 64]);

sealed class SquareCache
{
    private readonly Dictionary<int, int> _values = new();
    public int Loads { get; private set; }

    public ValueTask<int> GetAsync(int key) =>
        _values.TryGetValue(key, out int v) ? new ValueTask<int>(v) : new ValueTask<int>(LoadAsync(key));

    private async Task<int> LoadAsync(int key)
    {
        await Task.Yield();
        Loads++;
        return _values[key] = key * key;
    }
}` }],
    codeTitle: ['ValueTask on a cache'],
    viz: { title: 'Allocations: Task vs ValueTask on cache hits', input: '1 2 1 1 3 2', inputLabel: 'sequence of keys requested', gen: vtSim },
    examples: [
      { title: 'Awaiting a ValueTask twice is a bug', html: `<p>With a Task-backed or result-backed ValueTask it may appear to work, but with a pooled ${C('IValueTaskSource')} the second await can observe a different operation. Convert with ${C('AsTask()')} if you need two awaits.</p>`, code: R`
ValueTask<int> vt = GetAsync();
Task<int> t = vt.AsTask();       // the single consumption of vt
Console.WriteLine(await t + await t);
static async ValueTask<int> GetAsync() { await Task.Yield(); return 21; }` },
      { title: 'Reading a stream into Memory returns ValueTask', html: `<p>Buffered streams often satisfy reads synchronously from their buffer, which is why the Memory overload of ReadAsync returns ${C('ValueTask<int>')}.</p>`, code: R`
using var ms = new MemoryStream(new byte[] { 1, 2, 3, 4 });
var buffer = new byte[3];
int read = await ms.ReadAsync(buffer.AsMemory());
Console.WriteLine($"read {read} bytes synchronously from MemoryStream");` },
      { title: 'IAsyncDisposable uses ValueTask', html: `<p>Most DisposeAsync implementations have nothing asynchronous to do in the common case, so the interface returns ${C('ValueTask')} to avoid allocating.</p>`, code: R`
await using (var r = new Res()) { Console.WriteLine("using"); }
sealed class Res : IAsyncDisposable
{
    private bool _dirty;
    public ValueTask DisposeAsync() => _dirty ? new ValueTask(FlushAsync()) : ValueTask.CompletedTask;
    private static async Task FlushAsync() => await Task.Delay(1);
}` }
    ],
    deepDive: `<p><b>IValueTaskSource.</b> Types like ${C('Socket')}, ${C('Channel<T>')} readers and ${C('ManualResetValueTaskSourceCore<T>')}-based classes implement ${C('IValueTaskSource<T>')}, reusing one object for many sequential operations; the ValueTask carries a 16-bit token to detect misuse. This achieves zero allocations even on the asynchronous path — and is exactly why double-awaiting is forbidden.</p>
<p><b>Size.</b> ValueTask&lt;T&gt; is an object reference + T + token + flag; for large T it is bigger to copy than a Task reference. For ${C('ValueTask')} (non-generic) the synchronous case uses a null object.</p>
<p><b>Analyzer.</b> CA2012 "Use ValueTasks correctly" flags double consumption and storing ValueTasks.</p>
<p><b>Measure.</b> For most application code the Task allocation (~70–100 bytes) is irrelevant; ValueTask pays off in libraries and inner loops doing millions of operations per second.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI sometimes converts every Task to ValueTask "for performance". <b>Use AI as a partner:</b> <code>Which of these methods usually complete synchronously? Show me the evidence</code>. <b>Where AI goes wrong:</b> storing ValueTasks in fields or lists, passing them to WhenAll without AsTask, awaiting twice, calling .Result on incomplete ValueTasks. <b>What you must still own:</b> the benchmark that justifies it and the consumer rules that keep it correct.</p>`
  });

  /* ======================================================================
     TOPIC 7 — IAsyncEnumerable and async streams
     ====================================================================== */
  function streamSim(input) {
    var n = parseInt(String(input === undefined ? '5' : input).trim(), 10);
    if (isNaN(n) || n < 1 || n > 8) throw new Error('Type how many items to produce (1-8)');
    var code = ['static async IAsyncEnumerable<int> ProduceAsync(int n,', '    [EnumeratorCancellation] CancellationToken ct = default)', '{', '    for (int i = 1; i <= n; i++)', '    {', '        await Task.Delay(100, ct);      // e.g. next page from an API', '        yield return i;', '    }', '}', '', 'await foreach (var x in ProduceAsync(n))', '    Console.WriteLine(x);'].join('\n');
    var s = [], printed = [];
    s.push({ l: 11, v: { 'producer state': 'not started' }, out: [], narr: 'Calling an async iterator does nothing yet (deferred, like LINQ). <code>await foreach</code> calls <b>GetAsyncEnumerator</b> and then <b>MoveNextAsync()</b>.' });
    for (var i = 1; i <= n; i++) {
      s.push({ l: 6, v: { i: i, 'consumer': 'awaiting MoveNextAsync' }, out: printed.slice(), narr: 'Producer awaits the next item (no thread blocked). The consumer is suspended in <code>await foreach</code>.' });
      printed.push(String(i));
      s.push({ l: [7, 12], cls: 'ok', v: { i: i, Current: i }, out: printed.slice(), narr: '<code>yield return ' + i + '</code> completes MoveNextAsync with true; the consumer processes ' + i + ' immediately — before the producer has made item ' + (i + 1) + '. Items <b>stream</b> one at a time.' });
    }
    s.push({ l: 9, v: { 'MoveNextAsync()': false }, out: printed.slice(), narr: 'The loop ends; MoveNextAsync returns false and <b>DisposeAsync</b> runs any finally blocks in the iterator.' });
    return codeFrames(code, s);
  }
  topics.push({
    title: 'IAsyncEnumerable<T> & Async Streams',
    analogy: `<p>A ${C('Task<List<T>>')} is ordering a whole box set of DVDs by mail: nothing to watch until the entire box arrives. An ${C('IAsyncEnumerable<T>')} is <b>streaming</b> the series: episode 1 starts as soon as it is ready, and episode 2 downloads while you watch. If you stop after episode 3 (break or cancel), the rest is never fetched.</p>`,
    explain: `<p>An <b>async iterator</b> combines ${C('async')} and ${C('yield return')}: it can await between items, and the consumer receives each item as soon as it is produced.</p>
${P(`
async IAsyncEnumerable<Order> GetOrdersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    string? next = "/orders?page=1";
    while (next is not null)
    {
        var page = await http.GetFromJsonAsync<Page>(next, ct);   // one page at a time
        foreach (var order in page!.Items) yield return order;
        next = page.Next;
    }
}

await foreach (var order in GetOrdersAsync().WithCancellation(token))
{
    if (order.Total > 1000) break;    // stops fetching further pages
}`)}
<h4>How it works</h4>
<ul><li>${C('IAsyncEnumerable<T>.GetAsyncEnumerator(ct)')} returns an ${C('IAsyncEnumerator<T>')} with ${C('ValueTask<bool> MoveNextAsync()')}, ${C('Current')} and ${C('DisposeAsync()')}.</li>
<li>${C('await foreach')} loops MoveNextAsync and disposes the enumerator at the end (or on break/exception), running the iterator's finally blocks.</li>
<li>Execution is <b>deferred and pull-based</b>: the producer runs only when the consumer asks for the next item, so there is natural backpressure.</li>
<li>${C('[EnumeratorCancellation]')} makes the token passed via ${C('WithCancellation')} flow into the iterator's parameter.</li></ul>
<h4>LINQ for async streams</h4>
<p>.NET 8's BCL has no LINQ operators for IAsyncEnumerable; they come from the ${C('System.Linq.Async')} NuGet package (built into .NET 10). Writing your own Where/Select/Take as async iterators is a few lines each (see the practice problems).</p>
<h4>Where you meet them</h4>
<p>EF Core ${C('AsAsyncEnumerable()')}, gRPC server streaming, ${C('ChannelReader<T>.ReadAllAsync()')}, ASP.NET Core actions returning ${C('IAsyncEnumerable<T>')} (streamed JSON), ${C('JsonSerializer.DeserializeAsyncEnumerable')}, paginated APIs and log tailing.</p>`,
    clues: ['Results arrive over time or page by page → IAsyncEnumerable&lt;T&gt; instead of Task&lt;List&lt;T&gt;&gt;', 'Consumer may stop early → async stream avoids fetching the rest', 'Huge result set that does not fit in memory → stream it', 'Need cancellation into the iterator → [EnumeratorCancellation] + WithCancellation'],
    code: [{ lang: 'csharp', run: true, title: 'Producer, custom operators and early exit (runnable)', code: R`
await foreach (var x in Take(Where(Numbers(100), n => n % 3 == 0), 4))
    Console.Write(x + " ");
Console.WriteLine();

using var cts = new CancellationTokenSource();
try
{
    await foreach (var x in Numbers(1000).WithCancellation(cts.Token))
        if (x == 5) cts.Cancel();
}
catch (OperationCanceledException) { Console.WriteLine("stream cancelled at 5"); }

static async IAsyncEnumerable<int> Numbers(int n,
    [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
{
    try
    {
        for (int i = 1; i <= n; i++)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Yield();
            yield return i;
        }
    }
    finally { Console.WriteLine("(producer cleaned up)"); }
}

static async IAsyncEnumerable<int> Where(IAsyncEnumerable<int> src, Func<int, bool> pred)
{
    await foreach (var x in src) if (pred(x)) yield return x;
}

static async IAsyncEnumerable<int> Take(IAsyncEnumerable<int> src, int count)
{
    if (count <= 0) yield break;
    await foreach (var x in src)
    {
        yield return x;
        if (--count == 0) yield break;
    }
}` }],
    codeTitle: ['Async iterators end to end'],
    viz: { title: 'Items stream one at a time', input: '5', inputLabel: 'how many items to produce (1-8)', gen: streamSim },
    examples: [
      { title: 'Paging through an API lazily', html: `<p>The consumer stops after it has enough items, so later pages are never requested.</p>`, code: R`
int pagesFetched = 0;
await foreach (var item in Pages())
    if (item >= 25) break;
Console.WriteLine($"pages fetched: {pagesFetched}");

async IAsyncEnumerable<int> Pages()
{
    for (int page = 0; page < 100; page++)
    {
        await Task.Yield();
        pagesFetched++;
        for (int i = 0; i < 10; i++) yield return page * 10 + i;
    }
}` },
      { title: 'Manual enumeration with MoveNextAsync', html: `<p>${C('await foreach')} is sugar over the enumerator; manual use is needed for merging two streams step by step.</p>`, code: R`
await using var e = Gen().GetAsyncEnumerator();
while (await e.MoveNextAsync()) Console.Write(e.Current + " ");
static async IAsyncEnumerable<char> Gen() { foreach (var c in "abc") { await Task.Yield(); yield return c; } }` },
      { title: 'Buffer an async stream into a list', html: `<p>Sometimes you do need all items; write a small ToListAsync (System.Linq.Async provides one).</p>`, code: R`
var all = await ToListAsync(Squares(5));
Console.WriteLine(string.Join(",", all));
static async Task<List<T>> ToListAsync<T>(IAsyncEnumerable<T> src) { var l = new List<T>(); await foreach (var x in src) l.Add(x); return l; }
static async IAsyncEnumerable<int> Squares(int n) { for (int i = 1; i <= n; i++) { await Task.Yield(); yield return i * i; } }` }
    ],
    deepDive: `<p><b>Generated code.</b> The compiler builds one class that is the enumerable, the enumerator and an ${C('IValueTaskSource<bool>')} at once, using ${C('ManualResetValueTaskSourceCore')} so that each MoveNextAsync is allocation-free after the first. That is why an async enumerator must not be advanced concurrently.</p>
<p><b>ConfigureAwait.</b> ${C('await foreach (var x in src.ConfigureAwait(false))')} applies to MoveNextAsync/DisposeAsync awaits; inside the iterator, awaits need their own ConfigureAwait.</p>
<p><b>Push vs pull.</b> IAsyncEnumerable is pull-based; Rx's ${C('IObservable<T>')} is push-based. Channels sit between: a producer pushes into a bounded buffer and consumers pull with ReadAllAsync (module 10).</p>
<p><b>ASP.NET Core.</b> Returning IAsyncEnumerable from an action streams the JSON array as items are produced (System.Text.Json writes and flushes progressively), reducing memory and time-to-first-byte.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tends to return ${C('Task<List<T>>')} by habit. <b>Use AI as a partner:</b> <code>Should this repository method stream results? What happens to memory for 10 million rows?</code> <b>Where AI goes wrong:</b> calling ToListAsync immediately (losing the streaming benefit), forgetting [EnumeratorCancellation] so tokens are ignored, using System.Linq.Async operators without the package, enumerating the same stream twice expecting cached results. <b>What you must still own:</b> choosing between buffering and streaming, and the cancellation/backpressure story.</p>`
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Sum of Squares on the Thread Pool', level: 'Easy', tags: ['Task.Run', 'WhenAll'], companies: ['Microsoft', 'Infosys'],
    statement: `<p>For each number start a ${C('Task.Run')} that computes its square as a ${C('long')}; await them all with ${C('Task.WhenAll')} and return the sum.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>, |a[i]| ≤ 10<sup>6</sup>`,
    example: `<p>[1, 2, 3] → 1 + 4 + 9 = 14.</p>`,
    brute: { why: `<p>A plain loop is faster for such tiny work — the exercise is the mechanics of starting tasks and combining their results. Real use: each item is expensive CPU work.</p>`, code: R`
static long SumSquaresLoop(int[] a) { long s = 0; foreach (var x in a) s += (long)x * x; return s; }` },
    mcq: { q: 'What type does `await Task.WhenAll(tasks)` return when tasks is Task&lt;long&gt;[]?'.replace('<', '&lt;').replace('>', '&gt;'), options: ['long[]', 'Task&lt;long&gt;'.replace('<', '&lt;').replace('>', '&gt;'), 'void', 'long'], answer: 0, explain: 'WhenAll over Task&lt;T&gt; returns Task<T[]>; awaiting it yields T[].'.replace(/</g, '&lt;').replace(/>/g, '&gt;') },
    hints: [`<p>${C('var tasks = a.Select(x => Task.Run(() => (long)x * x)).ToArray();')}</p>`, `<p>${C('long[] squares = await Task.WhenAll(tasks);')} then ${C('squares.Sum()')}.</p>`, `<p>Cast to long <b>before</b> multiplying: 10<sup>6</sup> × 10<sup>6</sup> overflows int.</p>`],
    solution: {
      approach: `<p>Fan out with Task.Run, fan in with WhenAll, then sum.</p>`,
      code: R`
public class Solution
{
    public long SumSquares(int[] a) => SumSquaresAsync(a).GetAwaiter().GetResult();

    private static async Task<long> SumSquaresAsync(int[] a)
    {
        Task<long>[] tasks = a.Select(x => Task.Run(() => (long)x * x)).ToArray();
        long[] squares = await Task.WhenAll(tasks);
        return squares.Sum();
    }
}`,
      complexity: `<p>O(n) work spread over pool threads; O(n) tasks allocated.</p>`,
      followUps: ['Chunk the input so each task handles 1000 items', 'Compare with Parallel.For and PLINQ']
    },
    tests: { sig: 'int[] -> long', fn: 'sumSquares', cases: [
      [[[1, 2, 3]], 14], [[[]], 0], [[[-4]], 16], [[[1000000, 1000000]], 2000000000000], [[[0, 0, 0]], 0], [[{ $range: [1, 101] }], 338350]
    ] }
  });

  practice.push({
    title: 'Async Stream Pipeline', level: 'Easy', tags: ['IAsyncEnumerable', 'async iterators'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Write an async iterator producing 1..n (await ${C('Task.Yield()')} before each item), and your own async operators ${C('Where')}, ${C('Select')} and ${C('Take')}. Return the sum of the first k squares of even numbers from the stream. (System.Linq.Async is not available.)</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>, 0 ≤ k ≤ n`,
    example: `<p>n = 10, k = 3 → evens 2, 4, 6 → 4 + 16 + 36 = 56.</p>`,
    brute: { why: `<p>Materialising everything first (${C('Enumerable.Range(1, n).Where(...).Select(...).Take(k).Sum()')}) is fine for in-memory data; with an async source you would have to buffer the whole stream before filtering, losing streaming and early exit.</p>`, code: R`
static long SumSync(int n, int k) =>
    Enumerable.Range(1, n).Where(x => x % 2 == 0).Select(x => (long)x * x).Take(k).Sum();` },
    mcq: { q: 'With Take(3) at the end, how many numbers does the producer generate for n = 1000?', options: ['6 — it stops after the third even number', '1000', '3', '500'], answer: 0, explain: 'Async streams are pull-based; once Take yields 3 items and breaks, the producer is disposed after producing 1..6.' },
    hints: [`<p>${C('static async IAsyncEnumerable<int> Range(int n) { for (int i = 1; i <= n; i++) { await Task.Yield(); yield return i; } }')}</p>`, `<p>Operators: ${C('await foreach (var x in src) if (pred(x)) yield return x;')} and similar.</p>`, `<p>Take must stop with ${C('yield break')} after k items, and handle k = 0 without reading at all.</p>`],
    solution: {
      approach: `<p>Compose small async iterators. Each pulls from the previous one only when asked, so the pipeline stops producing as soon as Take is satisfied.</p>`,
      code: R`
public class Solution
{
    public long SumEvenSquares(int n, int k) => RunAsync(n, k).GetAwaiter().GetResult();

    private static async Task<long> RunAsync(int n, int k)
    {
        long sum = 0;
        await foreach (long x in Take(Select(Where(Range(n), v => v % 2 == 0), v => (long)v * v), k))
            sum += x;
        return sum;
    }

    private static async IAsyncEnumerable<int> Range(int n)
    {
        for (int i = 1; i <= n; i++) { await Task.Yield(); yield return i; }
    }

    private static async IAsyncEnumerable<T> Where<T>(IAsyncEnumerable<T> src, Func<T, bool> pred)
    {
        await foreach (var x in src) if (pred(x)) yield return x;
    }

    private static async IAsyncEnumerable<R> Select<T, R>(IAsyncEnumerable<T> src, Func<T, R> map)
    {
        await foreach (var x in src) yield return map(x);
    }

    private static async IAsyncEnumerable<T> Take<T>(IAsyncEnumerable<T> src, int count)
    {
        if (count <= 0) yield break;
        await foreach (var x in src)
        {
            yield return x;
            if (--count == 0) yield break;
        }
    }
}`,
      complexity: `<p>O(min(n, 2k)) items produced; O(1) memory.</p>`,
      followUps: ['Add cancellation with [EnumeratorCancellation]', 'Write SelectAwait that takes an async projection']
    },
    tests: { sig: 'int int -> long', fn: 'sumEvenSquares', cases: [
      [[10, 3], 56], [[0, 0], 0], [[10, 0], 0], [[1, 1], 0], [[4, 5], 20], [[100000, 1], 4], [[20, 10], 1540]
    ] }
  });

  practice.push({
    title: 'Report Progress Deterministically', level: 'Easy', tags: ['IProgress', 'async'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Process n items asynchronously (await ${C('Task.Yield()')} per item) and after each item report the integer percentage ${C('(i + 1) * 100 / n')} through an ${C('IProgress<int>')} — but only when it changed since the last report. Return the reported values. Use your own synchronous ${C('IProgress<int>')} implementation, because ${C('Progress<T>')} posts reports to the captured context or the thread pool (order not guaranteed in a console app).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>n = 4 → [25, 50, 75, 100]. For n = 200 the raw percentages are 0, 1, 1, 2, 2, …, 100; with duplicates skipped the reports are 0, 1, 2, …, 100 — 101 values.</p>`,
    brute: { why: `<p>Reporting on every item floods the UI with redundant updates (n = 10<sup>6</sup> → a million reports of 100 distinct values). Comparing with the last reported value keeps it to at most 101 reports.</p>`, code: R`
static List<int> Every(int n) { var r = new List<int>(); for (int i = 0; i < n; i++) r.Add((i + 1) * 100 / n); return r; }` },
    mcq: { q: 'Why can Progress&lt;T&gt; deliver reports out of order in a console app?'.replace('<', '&lt;').replace('>', '&gt;'), options: ['Without a SynchronizationContext it posts each report to the thread pool, where they may run concurrently', 'It sorts reports', 'Console apps do not support IProgress', 'It drops reports'], answer: 0, explain: 'Progress&lt;T&gt; captures SynchronizationContext.Current at construction; with none, the handler is queued to the pool per report.'.replace('<', '&lt;').replace('>', '&gt;') },
    hints: [`<p>${C('sealed class ListProgress : IProgress<int> { public List<int> Values = new(); public void Report(int v) => Values.Add(v); }')}</p>`, `<p>Track ${C('int last = -1;')} and report only when the new percentage differs.</p>`, `<p>Integer division: for n = 200, the first item gives 1 * 100 / 200 = 0.</p>`],
    solution: {
      approach: `<p>An async loop that reports through the IProgress abstraction, de-duplicating percentages; a synchronous reporter makes the order deterministic for testing.</p>`,
      code: R`
public class Solution
{
    private sealed class ListProgress : IProgress<int>
    {
        public List<int> Values { get; } = new();
        public void Report(int value) => Values.Add(value);
    }

    public int[] ReportProgress(int n)
    {
        var progress = new ListProgress();
        ProcessAsync(n, progress).GetAwaiter().GetResult();
        return progress.Values.ToArray();
    }

    private static async Task ProcessAsync(int n, IProgress<int> progress)
    {
        int last = -1;
        for (int i = 0; i < n; i++)
        {
            await Task.Yield();
            int pct = (i + 1) * 100 / n;
            if (pct != last) { progress.Report(pct); last = pct; }
        }
    }
}`,
      complexity: `<p>O(n) time; at most 101 reports.</p>`,
      followUps: ['Throttle reports to at most one per 100 ms', 'Report a record with item count and ETA']
    },
    tests: { sig: 'int -> int[]', fn: 'reportProgress', cases: [
      [[4], [25, 50, 75, 100]], [[0], []], [[1], [100]], [[3], [33, 66, 100]], [[200], { $range: [0, 101] }], [[2], [50, 100]]
    ] }
  });

  practice.push({
    title: 'Process Tasks in Completion Order', level: 'Medium', tags: ['Task.WhenAny', 'TaskCompletionSource'], companies: ['Microsoft', 'Netflix'],
    statement: `<p>Create n ${C('TaskCompletionSource<int>')} tasks. A consumer loops ${C('await Task.WhenAny(remaining)')}, removes the winner and records its index, signalling a ${C('SemaphoreSlim')} after each record. The driver completes the sources one at a time in the order given by ${C('order')} (a permutation of 0..n−1), waiting on the semaphore after each completion so that the consumer has observed it. Return the indices in the order the consumer observed them.</p>`,
    constraints: `0 ≤ n ≤ 200`,
    example: `<p>order [2, 0, 1] → [2, 0, 1].</p>`,
    brute: { why: `<p>Awaiting the tasks in array order (${C('foreach (var t in tasks) await t')}) handles results in index order, so a slow first task delays everything. The WhenAny loop handles each as it completes. The semaphore makes the test deterministic: without it, two completions could happen before the consumer looks, and WhenAny would then return the earliest <i>in list order</i>.</p>`, code: R`
static async Task<List<int>> InIndexOrder(Task<int>[] tasks)
{
    var seen = new List<int>();
    foreach (var t in tasks) seen.Add(await t);
    return seen;
}` },
    mcq: { q: 'If several tasks are already complete, which does Task.WhenAny return?', options: ['The first completed task in the order of the argument list', 'The most recently completed', 'A random one', 'It throws'], answer: 0, explain: 'WhenAny checks the tasks in order and returns the first one it finds completed.' },
    hints: [`<p>Each source's task returns its own index: ${C('sources[i].SetResult(i)')}.</p>`, `<p>Consumer: ${C('var t = await Task.WhenAny(remaining); remaining.Remove(t); seen.Add(await t); signal.Release();')}</p>`, `<p>Driver: for each index in order, ${C('SetResult')} then ${C('await signal.WaitAsync()')}; finally await the consumer task.</p>`],
    solution: {
      approach: `<p>The WhenAny loop observes completions one by one; the semaphore hand-shake serialises driver and consumer so the observed order equals the completion order.</p>`,
      code: R`
public class Solution
{
    public int[] CompletionOrder(int[] order) => RunAsync(order).GetAwaiter().GetResult();

    private static async Task<int[]> RunAsync(int[] order)
    {
        int n = order.Length;
        var sources = Enumerable.Range(0, n)
            .Select(_ => new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously))
            .ToArray();
        var signal = new SemaphoreSlim(0);
        var seen = new List<int>();

        async Task Consume()
        {
            var remaining = sources.Select(s => s.Task).ToList();
            while (remaining.Count > 0)
            {
                Task<int> winner = await Task.WhenAny(remaining);
                remaining.Remove(winner);
                seen.Add(await winner);
                signal.Release();
            }
        }

        Task consumer = Consume();
        foreach (int i in order)
        {
            sources[i].SetResult(i);
            await signal.WaitAsync();
        }
        await consumer;
        return seen.ToArray();
    }
}`,
      complexity: `<p>O(n²) continuation registrations for the WhenAny loop (fine for small n; use channels for large n).</p>`,
      followUps: ['Implement an Interleaved() helper returning tasks in completion order', 'Use Task.WhenEach on .NET 9']
    },
    tests: { sig: 'int[] -> int[]', fn: 'completionOrder', cases: [
      [[[2, 0, 1]], [2, 0, 1]], [[[]], []], [[[0]], [0]], [[[0, 1, 2, 3]], [0, 1, 2, 3]], [[[3, 2, 1, 0]], [3, 2, 1, 0]], [[[1, 3, 0, 2]], [1, 3, 0, 2]]
    ] }
  });

  practice.push({
    title: 'Timeout with Task.WhenAny', level: 'Medium', tags: ['Task.WhenAny', 'timeouts', 'cancellation'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>Run a "work" task that waits ${C('workMs')} milliseconds (or never completes when ${C('workMs = -1')}) and then returns 42, racing a timeout of ${C('timeoutMs')}. Return ${C('"done: 42"')} if the work wins and ${C('"timeout"')} otherwise. Cancel the loser with a shared ${C('CancellationTokenSource')} so nothing keeps running.</p>`,
    constraints: `−1 ≤ workMs ≤ 5000, 0 ≤ timeoutMs ≤ 5000; test inputs keep the two durations far apart`,
    example: `<p>(0, 1000) → ${C('"done: 42"')}; (−1, 10) → ${C('"timeout"')}.</p>`,
    brute: { why: `<p>${C('work.Wait(timeoutMs)')} works but blocks a thread for the whole duration. WhenAny waits asynchronously, and cancelling the loser frees its timer immediately.</p>`, code: R`
static string Blocking(Task<int> work, int timeoutMs) => work.Wait(timeoutMs) ? $"done: {work.Result}" : "timeout";` },
    mcq: { q: 'What does `await Task.WhenAny(work, delay)` return?', options: ['The task that completed first (a Task, not its result)', 'The result of work', 'A bool', 'It throws if work faulted'], answer: 0, explain: 'WhenAny returns Task&lt;Task&gt;; compare the returned task with your tasks and await the winner for its value.'.replace('<', '&lt;').replace('>', '&gt;').replace('<', '&lt;').replace('>', '&gt;') },
    hints: [`<p>${C('Task<int> work = WorkAsync(workMs, cts.Token); Task timer = Task.Delay(timeoutMs, cts.Token);')}</p>`, `<p>${C('Task first = await Task.WhenAny(work, timer); cts.Cancel();')}</p>`, `<p>${C('workMs = -1')}: ${C('Task.Delay(Timeout.Infinite, token)')} never completes unless cancelled.</p>`],
    solution: {
      approach: `<p>Race the two tasks, cancel whichever lost, and await the winner if it was the work. Observing the loser (it ends Canceled) avoids unobserved exceptions.</p>`,
      code: R`
public class Solution
{
    public string WithTimeout(int workMs, int timeoutMs) => RunAsync(workMs, timeoutMs).GetAwaiter().GetResult();

    private static async Task<int> WorkAsync(int ms, CancellationToken ct)
    {
        await Task.Delay(ms < 0 ? Timeout.Infinite : ms, ct);
        return 42;
    }

    private static async Task<string> RunAsync(int workMs, int timeoutMs)
    {
        using var cts = new CancellationTokenSource();
        Task<int> work = WorkAsync(workMs, cts.Token);
        Task timer = Task.Delay(timeoutMs, cts.Token);
        Task first = await Task.WhenAny(work, timer);
        cts.Cancel();
        if (first == work) return $"done: {await work}";
        try { await work; } catch (OperationCanceledException) { }
        return "timeout";
    }
}`,
      complexity: `<p>Wall time ≈ min(workMs, timeoutMs); no thread blocked.</p>`,
      followUps: ['Rewrite with work.WaitAsync(TimeSpan) — what still needs cancelling?', 'Retry once after a timeout']
    },
    tests: { sig: 'int int -> string', fn: 'withTimeout', cases: [
      [[0, 1000], 'done: 42'], [[-1, 10], 'timeout'], [[5, 2000], 'done: 42'], [[-1, 0], 'timeout'], [[3000, 20], 'timeout'], [[10, 5000], 'done: 42']
    ] }
  });

  practice.push({
    title: 'Retry with Exponential Backoff', level: 'Medium', tags: ['async', 'retry', 'backoff'], companies: ['Amazon', 'Stripe', 'Microsoft'],
    statement: `<p>An async operation fails (throws ${C('HttpRequestException')}) the first ${C('failures')} times and then succeeds. Retry up to ${C('maxAttempts')} attempts in total, waiting ${C('baseDelay * 2^k')} ms before retry k+1 (k = 0, 1, …). Inject the delay function so tests do not actually wait: record each requested delay. Return ${C('"ok after A attempts, waits [d1,d2,...]"')} or ${C('"failed after A attempts, waits [...]"')}.</p>`,
    constraints: `0 ≤ failures ≤ 20, 1 ≤ maxAttempts ≤ 20, 1 ≤ baseDelay ≤ 1000`,
    example: `<p>failures 2, maxAttempts 5, baseDelay 100 → ${C('"ok after 3 attempts, waits [100,200]"')}.</p>`,
    brute: { why: `<p>Retrying immediately in a tight loop hammers a struggling service and can turn a blip into an outage. Exponential backoff (usually with jitter) spreads retries out; injecting the delay keeps the logic testable without sleeping.</p>`, code: R`
static async Task<int> RetryNoDelay(Func<Task> op, int max)
{
    for (int a = 1; ; a++)
    {
        try { await op(); return a; }
        catch (HttpRequestException) when (a < max) { }
    }
}` },
    mcq: { q: 'Why inject the delay function instead of calling Task.Delay directly?', options: ['Tests can record the delays without waiting real time', 'Task.Delay is inaccurate', 'It avoids allocations', 'Delays must be synchronous'], answer: 0, explain: 'A Func&lt;int, Task&gt; (or TimeProvider in .NET 8) makes time controllable in tests.'.replace('<', '&lt;').replace('>', '&gt;') },
    hints: [`<p>Signature idea: ${C('RetryAsync(Func<Task> op, int maxAttempts, int baseDelay, Func<int, Task> delay)')}.</p>`, `<p>Catch with a filter: ${C('catch (HttpRequestException) when (attempt < maxAttempts)')}, then ${C('await delay(baseDelay << (attempt - 1))')}.</p>`, `<p>The operation counts calls: throw while ${C('calls <= failures')}.</p>`],
    solution: {
      approach: `<p>A loop with an exception filter that only retries while attempts remain; the delay is a parameter, recorded by the test double.</p>`,
      code: R`
public class Solution
{
    public string Retry(int failures, int maxAttempts, int baseDelay) => RunAsync(failures, maxAttempts, baseDelay).GetAwaiter().GetResult();

    private static async Task<string> RunAsync(int failures, int maxAttempts, int baseDelay)
    {
        int calls = 0;
        var waits = new List<int>();
        Func<Task> op = async () =>
        {
            await Task.Yield();
            calls++;
            if (calls <= failures) throw new HttpRequestException("unavailable");
        };
        Func<int, Task> delay = ms => { waits.Add(ms); return Task.CompletedTask; };

        bool ok = await RetryAsync(op, maxAttempts, baseDelay, delay);
        return $"{(ok ? "ok" : "failed")} after {calls} attempts, waits [{string.Join(",", waits)}]";
    }

    private static async Task<bool> RetryAsync(Func<Task> op, int maxAttempts, int baseDelay, Func<int, Task> delay)
    {
        for (int attempt = 1; ; attempt++)
        {
            try
            {
                await op();
                return true;
            }
            catch (HttpRequestException) when (attempt < maxAttempts)
            {
                await delay(baseDelay << (attempt - 1));
            }
            catch (HttpRequestException)
            {
                return false;
            }
        }
    }
}`,
      complexity: `<p>O(maxAttempts) attempts; total wait base·(2<sup>k</sup> − 1).</p>`,
      followUps: ['Add full jitter: Random.Shared.Next(0, delay)', 'Cap the delay at a maximum and honour Retry-After headers']
    },
    tests: { sig: 'int int int -> string', fn: 'retry', cases: [
      [[2, 5, 100], 'ok after 3 attempts, waits [100,200]'], [[0, 3, 50], 'ok after 1 attempts, waits []'], [[5, 3, 10], 'failed after 3 attempts, waits [10,20]'], [[1, 1, 100], 'failed after 1 attempts, waits []'], [[3, 4, 1], 'ok after 4 attempts, waits [1,2,4]'], [[4, 4, 7], 'failed after 4 attempts, waits [7,14,28]']
    ] }
  });

  practice.push({
    title: 'Throttle Jobs with SemaphoreSlim', level: 'Medium', tags: ['SemaphoreSlim', 'throttling', 'WhenAll'], companies: ['Microsoft', 'Shopify'],
    statement: `<p>Run ${C('jobs')} async jobs (each awaits ${C('Task.Delay(5)')}) concurrently, but with at most ${C('maxConcurrency')} running at any moment, enforced by ${C('SemaphoreSlim.WaitAsync')}/${C('Release')}. Track the peak number of jobs running at once with ${C('Interlocked')}. Return ${C('[completed, peak <= maxConcurrency ? 1 : 0]')}.</p>`,
    constraints: `0 ≤ jobs ≤ 200, 1 ≤ maxConcurrency ≤ 50`,
    example: `<p>jobs 20, maxConcurrency 3 → [20, 1].</p>`,
    brute: { why: `<p>An unthrottled ${C('Task.WhenAll')} starts all jobs at once — with real HTTP calls that means 200 simultaneous connections to one server. Processing in fixed batches of k wastes time waiting for the slowest job of each batch; the semaphore keeps exactly k in flight.</p>`, code: R`
static async Task<int> Unthrottled(int jobs)
{
    await Task.WhenAll(Enumerable.Range(0, jobs).Select(_ => Task.Delay(5)));
    return jobs;
}` },
    mcq: { q: 'Why must Release() be in a finally block?', options: ['If the job throws, the slot would otherwise be lost forever and the throttle would shrink', 'Release is slow', 'The compiler requires it', 'To avoid boxing'], answer: 0, explain: 'A missed Release permanently reduces the available slots; eventually everything waits forever.' },
    hints: [`<p>${C('var gate = new SemaphoreSlim(maxConcurrency);')}</p>`, `<p>In each job: ${C('await gate.WaitAsync(); try { ... } finally { gate.Release(); }')}</p>`, `<p>Peak tracking: increment a counter on entry, update the max with a CompareExchange loop, decrement on exit.</p>`],
    solution: {
      approach: `<p>Start all jobs; each waits for a semaphore slot before doing work. Interlocked counters record concurrency without locks.</p>`,
      code: R`
public class Solution
{
    public int[] RunThrottled(int jobs, int maxConcurrency) => RunAsync(jobs, maxConcurrency).GetAwaiter().GetResult();

    private static async Task<int[]> RunAsync(int jobs, int maxConcurrency)
    {
        using var gate = new SemaphoreSlim(maxConcurrency);
        int running = 0, peak = 0, completed = 0;

        async Task Job()
        {
            await gate.WaitAsync();
            try
            {
                int now = Interlocked.Increment(ref running);
                int seen;
                while ((seen = Volatile.Read(ref peak)) < now && Interlocked.CompareExchange(ref peak, now, seen) != seen) { }
                await Task.Delay(5);
                Interlocked.Decrement(ref running);
                Interlocked.Increment(ref completed);
            }
            finally
            {
                gate.Release();
            }
        }

        await Task.WhenAll(Enumerable.Range(0, jobs).Select(_ => Job()));
        return new[] { completed, peak <= maxConcurrency ? 1 : 0 };
    }
}`,
      complexity: `<p>Wall time ≈ ceil(jobs / k) × job time.</p>`,
      followUps: ['Use Parallel.ForEachAsync with MaxDegreeOfParallelism instead', 'Add a per-job timeout']
    },
    tests: { sig: 'int int -> int[]', fn: 'runThrottled', cases: [
      [[20, 3], [20, 1]], [[0, 1], [0, 1]], [[1, 1], [1, 1]], [[50, 1], [50, 1]], [[10, 50], [10, 1]], [[200, 8], [200, 1]]
    ] }
  });

  practice.push({
    title: 'Async Cache with ValueTask', level: 'Medium', tags: ['ValueTask', 'caching', 'design'], companies: ['Microsoft', 'Stack Overflow'],
    statement: `<p>Implement ${C('AsyncCache')} with ${C('ValueTask<int> GetAsync(int key)')}: on a hit return the cached value synchronously (no Task allocation); on a miss "load" it asynchronously (await ${C('Task.Yield()')}, value = key × key + 1), cache it and count the load. Expose synchronous test methods ${C('Get(key)')} (awaits GetAsync once), ${C('Loads()')} and ${C('Hits()')}.</p>`,
    constraints: `|key| ≤ 10<sup>4</sup>; up to 10<sup>4</sup> operations`,
    example: `<p>Get(3) → 10 (load), Get(3) → 10 (hit), Loads() → 1, Hits() → 1.</p>`,
    brute: { why: `<p>Returning ${C('Task<int>')} works; every hit then allocates a Task via Task.FromResult (small ints like −1..8 are cached by the runtime, others are not). For a cache serving millions of hits per second, ValueTask removes that garbage.</p>`, code: R`
class TaskCache
{
    private readonly Dictionary<int, int> _d = new();
    public Task<int> GetAsync(int key) => _d.TryGetValue(key, out var v) ? Task.FromResult(v) : Load(key);
    private async Task<int> Load(int key) { await Task.Yield(); return _d[key] = key * key + 1; }
}` },
    mcq: { q: 'Which consumer code is valid for a ValueTask&lt;int&gt; vt?'.replace('<', '&lt;').replace('>', '&gt;'), options: ['int x = await vt;', 'await vt; await vt;', 'Task.WhenAll(vt, vt)', 'store vt in a field and await it later twice'], answer: 0, explain: 'A ValueTask must be consumed exactly once; use AsTask() for anything else.' },
    hints: [`<p>${C('_values.TryGetValue(key, out var v) ? new ValueTask<int>(v) : new ValueTask<int>(LoadAsync(key))')}</p>`, `<p>Count hits in the synchronous branch and loads inside LoadAsync.</p>`, `<p>Test wrapper: ${C('public int Get(int key) => GetAsync(key).AsTask().GetAwaiter().GetResult();')}</p>`],
    solution: {
      approach: `<p>Synchronous fast path wrapped in a ValueTask; asynchronous slow path wrapped from a Task.</p>`,
      code: R`
public class AsyncCache
{
    private readonly Dictionary<int, int> _values = new();
    private int _loads, _hits;

    public ValueTask<int> GetAsync(int key)
    {
        if (_values.TryGetValue(key, out int v))
        {
            _hits++;
            return new ValueTask<int>(v);
        }
        return new ValueTask<int>(LoadAsync(key));
    }

    private async Task<int> LoadAsync(int key)
    {
        await Task.Yield();
        _loads++;
        return _values[key] = key * key + 1;
    }

    public int Get(int key) => GetAsync(key).AsTask().GetAwaiter().GetResult();
    public int Loads() => _loads;
    public int Hits() => _hits;
}`,
      complexity: `<p>O(1) average per operation; hits allocate nothing.</p>`,
      followUps: ['Make it safe for concurrent callers without loading a key twice', 'Add expiry with TimeProvider']
    },
    tests: { cls: 'AsyncCache', sigs: { AsyncCache: '', get: 'int -> int', loads: '-> int', hits: '-> int' }, cases: [
      { ops: ['AsyncCache', 'get', 'get', 'loads', 'hits'], args: [[], [3], [3], [], []], out: [null, 10, 10, 1, 1] },
      { ops: ['AsyncCache', 'loads', 'hits'], args: [[], [], []], out: [null, 0, 0] },
      { ops: ['AsyncCache', 'get', 'get', 'get', 'loads'], args: [[], [1], [2], [-1], []], out: [null, 2, 5, 2, 3] },
      { ops: ['AsyncCache', 'get', 'get', 'get', 'get', 'hits', 'loads'], args: [[], [0], [0], [0], [0], [], []], out: [null, 1, 1, 1, 1, 3, 1] },
      { ops: ['AsyncCache', 'get', 'get', 'get', 'hits'], args: [[], [10000], [-10000], [10000], []], out: [null, 100000001, 100000001, 100000001, 1] },
      { ops: ['AsyncCache', 'get', 'get', 'get', 'get', 'loads', 'hits'], args: [[], [5], [6], [5], [6], [], []], out: [null, 26, 37, 26, 37, 2, 2] }
    ] }
  });

  practice.push({
    title: 'Merge Two Sorted Async Streams', level: 'Medium', tags: ['IAsyncEnumerable', 'MoveNextAsync', 'merge'], companies: ['Google', 'Microsoft'],
    statement: `<p>Two sorted arrays are exposed as async streams (each item preceded by ${C('await Task.Yield()')}). Write ${C('MergeAsync(IAsyncEnumerable<int> a, IAsyncEnumerable<int> b)')} as an async iterator that yields all items in sorted order by advancing two enumerators manually with ${C('MoveNextAsync')}. Return the merged sequence.</p>`,
    constraints: `0 ≤ lengths ≤ 10<sup>4</sup>; both sorted ascending`,
    example: `<p>[1, 4, 9] and [2, 3, 10] → [1, 2, 3, 4, 9, 10].</p>`,
    brute: { why: `<p>Buffering both streams into lists and sorting works but loses streaming: nothing is produced until both sources are finished, and memory is O(n + m). The manual merge yields as soon as each next item is known.</p>`, code: R`
static async Task<List<int>> MergeBuffered(IAsyncEnumerable<int> a, IAsyncEnumerable<int> b)
{
    var all = new List<int>();
    await foreach (var x in a) all.Add(x);
    await foreach (var y in b) all.Add(y);
    all.Sort();
    return all;
}` },
    mcq: { q: 'Why use `await using var e = src.GetAsyncEnumerator();`?', options: ['So the enumerator\'s DisposeAsync runs (iterator finally blocks) even if we stop early', 'It makes MoveNextAsync faster', 'It is required for sorting', 'To cache items'], answer: 0, explain: 'Manual enumeration must dispose the enumerator, which is what await foreach does automatically.' },
    hints: [`<p>${C('await using var ea = a.GetAsyncEnumerator(); bool hasA = await ea.MoveNextAsync();')} — same for b.</p>`, `<p>While both have items, yield the smaller ${C('Current')} and advance that enumerator.</p>`, `<p>Then drain whichever enumerator still has items left.</p>`],
    solution: {
      approach: `<p>The merge step of merge sort over two async enumerators; each yield happens as soon as both heads are known.</p>`,
      code: R`
public class Solution
{
    public int[] MergeSorted(int[] a, int[] b) => RunAsync(a, b).GetAwaiter().GetResult();

    private static async Task<int[]> RunAsync(int[] a, int[] b)
    {
        var result = new List<int>();
        await foreach (int x in MergeAsync(Stream(a), Stream(b))) result.Add(x);
        return result.ToArray();
    }

    private static async IAsyncEnumerable<int> Stream(int[] items)
    {
        foreach (int x in items) { await Task.Yield(); yield return x; }
    }

    private static async IAsyncEnumerable<int> MergeAsync(IAsyncEnumerable<int> a, IAsyncEnumerable<int> b)
    {
        await using var ea = a.GetAsyncEnumerator();
        await using var eb = b.GetAsyncEnumerator();
        bool hasA = await ea.MoveNextAsync(), hasB = await eb.MoveNextAsync();
        while (hasA && hasB)
        {
            if (ea.Current <= eb.Current) { yield return ea.Current; hasA = await ea.MoveNextAsync(); }
            else { yield return eb.Current; hasB = await eb.MoveNextAsync(); }
        }
        while (hasA) { yield return ea.Current; hasA = await ea.MoveNextAsync(); }
        while (hasB) { yield return eb.Current; hasB = await eb.MoveNextAsync(); }
    }
}`,
      complexity: `<p>O(n + m) time, O(1) extra memory in the merge.</p>`,
      followUps: ['Merge k streams with a PriorityQueue of enumerators', 'Prefetch the next item of each source concurrently']
    },
    tests: { sig: 'int[] int[] -> int[]', fn: 'mergeSorted', cases: [
      [[[1, 4, 9], [2, 3, 10]], [1, 2, 3, 4, 9, 10]], [[[], []], []], [[[1, 2], []], [1, 2]], [[[], [3]], [3]], [[[5, 5], [5]], [5, 5, 5]], [[[-3, 0, 7], [-5, 8]], [-5, -3, 0, 7, 8]]
    ] }
  });

  practice.push({
    title: 'Collect Every Failure from WhenAll', level: 'Hard', tags: ['Task.WhenAll', 'AggregateException', 'error handling'], companies: ['Microsoft', 'Amazon'],
    statement: `<p>Start one async job per code (each first awaits ${C('Task.Yield()')}): code 0 succeeds, any other code throws ${C('InvalidOperationException($"job {i} failed with {code}")')}. Await all with ${C('Task.WhenAll')}. If everything succeeded return ${C('["all ok: N"]')}; otherwise return <b>every</b> failure message (not just the first one that ${C('await')} rethrows), ordered by job index.</p>`,
    constraints: `0 ≤ n ≤ 1000`,
    example: `<p>[0, 500, 0, 404] → ${C('["job 1 failed with 500", "job 3 failed with 404"]')}.</p>`,
    brute: { why: `<p>${C('try { await Task.WhenAll(tasks); } catch (Exception e) { ... }')} only sees the <b>first</b> exception. Awaiting each task individually in a loop works but needs care to still wait for all of them. The WhenAll task's ${C('Exception.InnerExceptions')} has them all.</p>`, code: R`
static async Task<List<string>> OnlyFirst(Task[] tasks)
{
    try { await Task.WhenAll(tasks); return new List<string>(); }
    catch (Exception e) { return new List<string> { e.Message }; }
}` },
    mcq: { q: 'After `await Task.WhenAll(t1, t2)` throws, where are both exceptions?', options: ['In the WhenAll task\'s Exception.InnerExceptions (also in t1.Exception and t2.Exception)', 'Only the first is kept', 'In the second catch block', 'They are lost'], answer: 0, explain: 'await unwraps only the first exception for convenience; the aggregate task keeps all of them.' },
    hints: [`<p>Keep a reference: ${C('Task all = Task.WhenAll(tasks);')} then ${C('try { await all; } catch { }')}.</p>`, `<p>Alternatively inspect each task: ${C('tasks.Select((t, i) => (t, i)).Where(p => p.t.IsFaulted)')}.</p>`, `<p>Each faulted task's ${C('Exception!.InnerException!.Message')} is the original message.</p>`],
    solution: {
      approach: `<p>Await the combined task inside try/catch so the code waits for every job, then read the failures from the individual tasks in index order.</p>`,
      code: R`
public class Solution
{
    public string[] RunAll(int[] codes) => RunAsync(codes).GetAwaiter().GetResult();

    private static async Task Job(int i, int code)
    {
        await Task.Yield();
        if (code != 0) throw new InvalidOperationException($"job {i} failed with {code}");
    }

    private static async Task<string[]> RunAsync(int[] codes)
    {
        Task[] tasks = codes.Select((c, i) => Job(i, c)).ToArray();
        Task all = Task.WhenAll(tasks);
        try
        {
            await all;
            return new[] { $"all ok: {codes.Length}" };
        }
        catch
        {
            return tasks.Where(t => t.IsFaulted)
                        .Select(t => t.Exception!.InnerException!.Message)
                        .ToArray();
        }
    }
}`,
      complexity: `<p>O(n) tasks; all jobs run to completion before reporting.</p>`,
      followUps: ['Return partial successes together with failures', 'Fail fast: cancel the remaining jobs at the first failure']
    },
    tests: { sig: 'int[] -> string[]', fn: 'runAll', cases: [
      [[[0, 500, 0, 404]], ['job 1 failed with 500', 'job 3 failed with 404']], [[[]], ['all ok: 0']], [[[0, 0]], ['all ok: 2']], [[[7]], ['job 0 failed with 7']], [[[1, 2, 3]], ['job 0 failed with 1', 'job 1 failed with 2', 'job 2 failed with 3']], [[[0, 0, 0, 0, -1]], ['job 4 failed with -1']]
    ] }
  });

  practice.push({
    title: 'An Async Queue Built on TaskCompletionSource', level: 'Hard', tags: ['TaskCompletionSource', 'producer/consumer', 'design'], companies: ['Microsoft', 'Jane Street'],
    statement: `<p>Implement an ${C('AsyncQueue')}: ${C('Enqueue(int)')} and ${C('Task<int> DequeueAsync()')}. If an item is available, DequeueAsync completes immediately; otherwise it returns a pending task that the next Enqueue completes. Waiters are served in FIFO order. The program reads commands, one per line: ${C('E x')} enqueues x, ${C('D')} starts a dequeue (not awaited yet). At the end print, for the k-th D (from 1), ${C('D#k: value')} or ${C('D#k: pending')}, then ${C('left: N')} with the number of items still queued.</p>`,
    constraints: `up to 10<sup>4</sup> commands; −10<sup>9</sup> ≤ x ≤ 10<sup>9</sup>`,
    example: `<p>Commands ${C('D, D, E 5, E 6, E 7')} → ${C('D#1: 5')}, ${C('D#2: 6')}, ${C('left: 1')}.</p>`,
    brute: { why: `<p>Polling (${C('while (!queue.TryDequeue(out x)) await Task.Delay(10);')}) wastes CPU and adds latency. Blocking with ${C('BlockingCollection.Take')} ties up a thread per waiter. A TaskCompletionSource per waiter costs nothing while waiting. (In production use ${C('Channel<T>')}, which does exactly this.)</p>`, code: R`
class PollingQueue
{
    private readonly Queue<int> _q = new();
    public void Enqueue(int x) { lock (_q) _q.Enqueue(x); }
    public async Task<int> DequeueAsync()
    {
        while (true)
        {
            lock (_q) if (_q.Count > 0) return _q.Dequeue();
            await Task.Delay(10);
        }
    }
}` },
    mcq: { q: 'Why create the TaskCompletionSource with RunContinuationsAsynchronously?', options: ['So Enqueue does not run the waiter\'s continuation inline while holding our lock', 'To make the task complete faster', 'It is required for generic TCS', 'To avoid allocations'], answer: 0, explain: 'Inline continuations would execute arbitrary consumer code inside Enqueue (and inside our lock), risking deadlocks and reentrancy.' },
    hints: [`<p>State: ${C('Queue<int> _items')} and ${C('Queue<TaskCompletionSource<int>> _waiters')}, guarded by a lock.</p>`, `<p>Enqueue: if a waiter exists, dequeue it and ${C('TrySetResult(x)')} (outside the lock is even better); else store the item.</p>`, `<p>DequeueAsync: if an item exists return ${C('Task.FromResult(item)')}; else add a new TCS to the waiters and return its Task.</p>`],
    solution: {
      approach: `<p>Two queues: items waiting for consumers and consumers waiting for items. At most one of them is non-empty at any time. Completing a waiter's TCS hands it the item without any thread blocking.</p>`,
      code: { lang: 'csharp', run: true, code: R`
var queue = new AsyncQueue();
var dequeues = new List<Task<int>>();
string? line;
while ((line = Console.ReadLine()) != null)
{
    line = line.Trim();
    if (line.Length == 0) continue;
    if (line == "D") dequeues.Add(queue.DequeueAsync());
    else queue.Enqueue(int.Parse(line[2..]));
}
for (int k = 0; k < dequeues.Count; k++)
    Console.WriteLine($"D#{k + 1}: {(dequeues[k].IsCompletedSuccessfully ? dequeues[k].Result.ToString() : "pending")}");
Console.WriteLine($"left: {queue.Count}");

public sealed class AsyncQueue
{
    private readonly Queue<int> _items = new();
    private readonly Queue<TaskCompletionSource<int>> _waiters = new();
    private readonly object _gate = new();

    public int Count { get { lock (_gate) return _items.Count; } }

    public void Enqueue(int item)
    {
        TaskCompletionSource<int>? waiter = null;
        lock (_gate)
        {
            if (_waiters.Count > 0) waiter = _waiters.Dequeue();
            else _items.Enqueue(item);
        }
        waiter?.TrySetResult(item);
    }

    public Task<int> DequeueAsync()
    {
        lock (_gate)
        {
            if (_items.Count > 0) return Task.FromResult(_items.Dequeue());
            var tcs = new TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously);
            _waiters.Enqueue(tcs);
            return tcs.Task;
        }
    }
}` },
      complexity: `<p>O(1) per operation; pending dequeues cost one TCS each and no threads.</p>`,
      followUps: ['Support cancellation of a pending DequeueAsync', 'Add a bounded capacity with an async Enqueue (then you have built a Channel)']
    },
    tests: { io: true, cases: [
      { stdin: 'D\nD\nE 5\nE 6\nE 7\n', stdout: 'D#1: 5\nD#2: 6\nleft: 1' },
      { stdin: 'E 1\nE 2\nD\n', stdout: 'D#1: 1\nleft: 1' },
      { stdin: 'D\n', stdout: 'D#1: pending\nleft: 0' },
      { stdin: '', stdout: 'left: 0' },
      { stdin: 'E -4\nD\nD\nD\nE 9\n', stdout: 'D#1: -4\nD#2: 9\nD#3: pending\nleft: 0' },
      { stdin: 'D\nE 3\nD\nE 4\nE 5\nD\nD\n', stdout: 'D#1: 3\nD#2: 4\nD#3: 5\nD#4: pending\nleft: 0' }
    ] }
  });

  practice.push({
    title: 'Dependency Levels with Async Tasks', level: 'Hard', tags: ['async', 'DAG', 'memoized tasks'], companies: ['Google', 'Microsoft', 'Uber'],
    statement: `<p>There are n build steps 0..n−1 and edges ${C('[u, v]')} meaning u must finish before v. A step's level is 1 if it has no prerequisites, otherwise 1 + the maximum level of its prerequisites. Compute every level by creating <b>one task per step</b> that awaits its prerequisites' tasks with ${C('Task.WhenAll')} (each task is created once and shared). The graph is acyclic.</p>`,
    constraints: `1 ≤ n ≤ 2000, 0 ≤ edges ≤ 10<sup>4</sup>`,
    example: `<p>n = 4, edges [[0,1],[0,2],[1,3],[2,3]] → [1, 2, 2, 3].</p>`,
    brute: { why: `<p>Recomputing each prerequisite recursively without sharing is exponential on diamond-shaped graphs. A topological sort (Kahn) is the classic synchronous answer; the task version mirrors how a build system runs steps concurrently as soon as their inputs are ready.</p>`, code: R`
static int LevelNaive(int v, List<int>[] prereq) =>
    prereq[v].Count == 0 ? 1 : 1 + prereq[v].Max(u => LevelNaive(u, prereq));` },
    mcq: { q: 'Why store the Task (not the int) per step in the memo table?', options: ['Concurrent dependents can await the same in-progress computation instead of starting it again', 'Tasks are smaller than ints', 'ints cannot be stored in dictionaries', 'To avoid recursion'], answer: 0, explain: 'Memoizing the task deduplicates work even before it has finished — the async equivalent of memoizing a value.' },
    hints: [`<p>Build ${C('List<int>[] prereq')} from the edges.</p>`, `<p>${C('Task<int> Level(int v) => memo[v] ??= Compute(v);')} with ${C('async Task<int> Compute(int v) { await Task.Yield(); var levels = await Task.WhenAll(prereq[v].Select(Level)); return 1 + (levels.Length == 0 ? 0 : levels.Max()); }')}</p>`, `<p>Create tasks from a single thread (or under a lock) so each step gets exactly one task; the Task.Yield keeps the recursion shallow.</p>`],
    solution: {
      approach: `<p>Lazily create one memoized task per node; each awaits its prerequisites. Task.Yield at the start makes every Compute return to the caller immediately, so creating tasks for a long chain does not recurse deeply on the stack.</p>`,
      code: R`
public class Solution
{
    public int[] Levels(int n, int[][] edges) => LevelsAsync(n, edges).GetAwaiter().GetResult();

    private static async Task<int[]> LevelsAsync(int n, int[][] edges)
    {
        var prereq = new List<int>[n];
        for (int i = 0; i < n; i++) prereq[i] = new List<int>();
        foreach (var e in edges) prereq[e[1]].Add(e[0]);

        var memo = new Task<int>?[n];
        var gate = new object();

        Task<int> Level(int v)
        {
            lock (gate) return memo[v] ??= Compute(v);
        }

        async Task<int> Compute(int v)
        {
            await Task.Yield();
            int[] levels = await Task.WhenAll(prereq[v].Select(Level));
            return 1 + (levels.Length == 0 ? 0 : levels.Max());
        }

        return await Task.WhenAll(Enumerable.Range(0, n).Select(Level));
    }
}`,
      complexity: `<p>O(n + e) tasks and continuations; independent branches can run concurrently.</p>`,
      followUps: ['Run real async work per step and measure total time vs the critical path', 'Detect cycles instead of assuming a DAG']
    },
    tests: { sig: 'int int[][] -> int[]', fn: 'levels', cases: [
      [[4, [[0, 1], [0, 2], [1, 3], [2, 3]]], [1, 2, 2, 3]], [[1, []], [1]], [[3, []], [1, 1, 1]], [[3, [[0, 1], [1, 2]]], [1, 2, 3]], [[5, [[0, 4], [1, 4], [2, 4], [3, 4]]], [1, 1, 1, 1, 2]], [[4, [[3, 2], [2, 1], [1, 0], [3, 0]]], [4, 3, 2, 1]]
    ] }
  });

  practice.push({
    title: 'Deduplicate Concurrent Loads', level: 'Hard', tags: ['ConcurrentDictionary', 'Lazy', 'async caching'], companies: ['Microsoft', 'Netflix', 'Meta'],
    statement: `<p>Many concurrent requests ask for keys (duplicates included). Loading a key is expensive: an async method that awaits ${C('Task.Delay(1)')}, increments a load counter with ${C('Interlocked')} and returns ${C('key * 2')}. Start all requests at once (${C('Task.WhenAll')}) and make sure each distinct key is loaded <b>exactly once</b>, even while a load is in flight. Return ${C('[loads, sum of all returned values]')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>, 0 ≤ key ≤ 10<sup>6</sup>`,
    example: `<p>[1, 2, 1, 1, 3] → [3, 16] (values 2 + 4 + 2 + 2 + 6).</p>`,
    brute: { why: `<p>${C('ConcurrentDictionary.GetOrAdd(key, k => LoadAsync(k))')} may invoke the factory more than once under contention (only one result is stored, but every invocation started a load). Caching the value only after it loads lets concurrent misses all start loads (a cache stampede).</p>`, code: R`
static async Task<int> Stampede(int[] keys)
{
    int loads = 0;
    var cache = new System.Collections.Concurrent.ConcurrentDictionary<int, int>();
    await Task.WhenAll(keys.Select(async k =>
    {
        if (cache.TryGetValue(k, out _)) return;
        await Task.Delay(1); Interlocked.Increment(ref loads);
        cache[k] = k * 2;
    }));
    return loads;
}` },
    mcq: { q: 'Why wrap the task in Lazy<Task&lt;int&gt;> inside the ConcurrentDictionary?'.replace(/</g, '&lt;').replace(/>/g, '&gt;'), options: ['GetOrAdd may run the factory twice, but only one Lazy wins and only its Value starts the load', 'Lazy makes the load faster', 'ConcurrentDictionary cannot hold tasks', 'To avoid async'], answer: 0, explain: 'Creating a Lazy is cheap and side-effect free; the stored Lazy guarantees a single execution of the load.' },
    hints: [`<p>${C('var cache = new ConcurrentDictionary<int, Lazy<Task<int>>>();')}</p>`, `<p>${C('cache.GetOrAdd(key, k => new Lazy<Task<int>>(() => LoadAsync(k))).Value')}</p>`, `<p>Lazy's default mode (ExecutionAndPublication) guarantees the factory runs once.</p>`],
    solution: {
      approach: `<p>Cache the in-flight <b>task</b>, wrapped in a Lazy so that only one load starts per key even if GetOrAdd races. All requests for the key await the same task.</p>`,
      code: R`
using System.Collections.Concurrent;

public class Solution
{
    public long[] LoadAll(int[] keys) => RunAsync(keys).GetAwaiter().GetResult();

    private static async Task<long[]> RunAsync(int[] keys)
    {
        int loads = 0;
        var cache = new ConcurrentDictionary<int, Lazy<Task<int>>>();

        async Task<int> LoadAsync(int key)
        {
            await Task.Delay(1);
            Interlocked.Increment(ref loads);
            return key * 2;
        }

        Task<int> Get(int key) =>
            cache.GetOrAdd(key, k => new Lazy<Task<int>>(() => LoadAsync(k))).Value;

        int[] values = await Task.WhenAll(keys.Select(k => Task.Run(() => Get(k))));
        return new long[] { loads, values.Sum(v => (long)v) };
    }
}`,
      complexity: `<p>O(n) requests, O(distinct keys) loads.</p>`,
      followUps: ['Evict failed loads so the next request retries', 'Add expiry and background refresh']
    },
    tests: { sig: 'int[] -> long[]', fn: 'loadAll', cases: [
      [[[1, 2, 1, 1, 3]], [3, 16]], [[[]], [0, 0]], [[[7]], [1, 14]], [[[5, 5, 5, 5]], [1, 40]], [[[1000000, 0]], [2, 2000000]], [[{ $rep: 9, n: 1000 }], [1, 18000]]
    ] }
  });

  practice.push({
    title: 'Initialize Once for Many Concurrent Callers', level: 'Medium', tags: ['Lazy', 'async initialization'], companies: ['Microsoft', 'Atlassian'],
    statement: `<p>An expensive async initialization (await ${C('Task.Delay(1)')}, increment an init counter, return 42) must run once even when ${C('callers')} tasks request the value at the same time. Use ${C('Lazy<Task<int>>')} (an "async lazy"). Start all callers with ${C('Task.Run')}, await them, and return ${C('[initializations, sum of values]')}.</p>`,
    constraints: `0 ≤ callers ≤ 10<sup>4</sup>`,
    example: `<p>callers = 5 → [1, 210].</p>`,
    brute: { why: `<p>A null check (${C('if (_value == null) _value = await InitAsync();')}) lets every concurrent caller see null before the first initialization finishes, so initialization runs many times. A lock cannot be held across await. ${C('Lazy<Task<T>>')} stores the task immediately, so all callers share it.</p>`, code: R`
static async Task<int> Racy(int callers)
{
    int inits = 0; int? value = null;
    await Task.WhenAll(Enumerable.Range(0, callers).Select(_ => Task.Run(async () =>
    {
        if (value is null) { await Task.Delay(1); Interlocked.Increment(ref inits); value = 42; }
    })));
    return inits;
}` },
    mcq: { q: 'Why can you not use `lock` around `await InitAsync()`?', options: ['await inside a lock is a compile error, because the continuation may run on another thread that does not own the lock', 'lock is too slow', 'lock only works with Task.Run', 'It works fine'], answer: 0, explain: 'CS1996: cannot await in the body of a lock statement. Use SemaphoreSlim.WaitAsync or a Lazy<Task&lt;T&gt;>.'.replace('<', '&lt;').replace('>', '&gt;') },
    hints: [`<p>${C('var lazy = new Lazy<Task<int>>(() => InitAsync());')}</p>`, `<p>Each caller does ${C('await lazy.Value')} — all of them share one task.</p>`, `<p>Count initializations with ${C('Interlocked.Increment')}.</p>`],
    solution: {
      approach: `<p>The Lazy guarantees one invocation of the factory; the factory returns a task immediately, and every caller awaits that same task.</p>`,
      code: R`
public class Solution
{
    public int[] InitOnce(int callers) => RunAsync(callers).GetAwaiter().GetResult();

    private static async Task<int[]> RunAsync(int callers)
    {
        int inits = 0;
        async Task<int> InitAsync()
        {
            await Task.Delay(1);
            Interlocked.Increment(ref inits);
            return 42;
        }

        var lazy = new Lazy<Task<int>>(() => InitAsync());
        int[] values = await Task.WhenAll(Enumerable.Range(0, callers).Select(_ => Task.Run(() => lazy.Value)));
        return new[] { inits, values.Sum() };
    }
}`,
      complexity: `<p>One initialization; O(callers) awaits of a shared task.</p>`,
      followUps: ['Retry initialization if it failed (do not cache a faulted task forever)', 'Compare with SemaphoreSlim double-checked initialization']
    },
    tests: { sig: 'int -> int[]', fn: 'initOnce', cases: [
      [[5], [1, 210]], [[0], [0, 0]], [[1], [1, 42]], [[100], [1, 4200]], [[10000], [1, 420000]], [[2], [1, 84]]
    ] }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Until when does an async method run synchronously on the caller\'s thread?', options: ['Until the first await of a task that is not yet complete', 'Until the first await of any kind', 'It never runs synchronously', 'Until it returns'], answer: 0, explain: 'Awaiting an already-completed task continues synchronously; only an incomplete task causes a suspension.' },
    { q: 'What happens to an exception thrown inside an `async Task` method?', options: ['It is stored in the returned task and rethrown when the task is awaited', 'It crashes the process immediately', 'It is ignored', 'It is thrown at the call site before the task is returned, always'], answer: 0, explain: 'Even exceptions before the first await are captured in the task.' },
    { q: 'Why is `async void` dangerous outside event handlers?', options: ['Callers cannot await it and its exceptions crash the process', 'It is slower', 'It cannot use await', 'It always runs on the UI thread'], answer: 0, explain: 'Exceptions are raised on the SynchronizationContext or thread pool, where nothing can catch them.' },
    { q: '`await Task.WhenAll(t0, t1)` where t1 finishes first — what is the order of the results array?', options: ['[result of t0, result of t1]', '[t1, t0]', 'Random', 'Sorted'], answer: 0, explain: 'WhenAll preserves the order of the input tasks.' },
    { q: 'Two of three tasks passed to WhenAll throw. What does `await` throw?', options: ['The first exception; all are in the WhenAll task\'s Exception.InnerExceptions', 'An AggregateException with both', 'Nothing', 'The last exception'], answer: 0, explain: 'await unwraps only the first; inspect the combined task to see all.' },
    { q: 'After `await Task.WhenAny(work, Task.Delay(1000))` returns the delay task, what happens to work?', options: ['It keeps running unless you cancel it', 'It is aborted', 'It is awaited automatically', 'It throws TimeoutException'], answer: 0, explain: 'WhenAny only stops waiting; cancel the loser through a CancellationToken if its work is no longer needed.' },
    { q: 'What makes .NET cancellation "cooperative"?', options: ['Code must observe the token (check it or pass it on); nothing is interrupted forcibly', 'Threads are aborted politely', 'The GC cancels tasks', 'Tasks cancel each other'], answer: 0, explain: 'Cancel() only sets a flag and runs callbacks; the operation decides where to stop.' },
    { q: 'Why does `LoadAsync().Result` deadlock in a WPF click handler?', options: ['The UI thread blocks, while LoadAsync\'s continuation needs that same UI thread', 'Result is not allowed in WPF', 'Tasks cannot run on the UI thread', 'Because of the GC'], answer: 0, explain: 'The captured SynchronizationContext posts the continuation to the blocked UI thread.' },
    { q: 'Where is ConfigureAwait(false) most important?', options: ['In general-purpose library code', 'In WPF code that updates controls after await', 'In Main', 'Nowhere since .NET 5'], answer: 0, explain: 'Libraries cannot know if callers have a context; opting out avoids deadlocks and context hops. UI code that touches controls needs the context.' },
    { q: 'Which use of a ValueTask&lt;int&gt; vt is correct?', options: ['int x = await vt;', 'await vt twice', 'Store vt in a field and await later from two places', 'Call vt.Result before it completes'], answer: 0, explain: 'A ValueTask must be consumed exactly once; use AsTask() otherwise.' },
    { q: 'When does returning ValueTask&lt;T&gt; instead of Task&lt;T&gt; pay off?', options: ['When the method usually completes synchronously and is called very often', 'Always', 'When the method always awaits I/O', 'When the result is large'], answer: 0, explain: 'The benefit is avoiding the Task allocation on the synchronous path.' },
    { q: 'What does `[EnumeratorCancellation]` do on an async iterator parameter?', options: ['Makes the token passed via WithCancellation flow into that parameter', 'Cancels the iterator automatically after a timeout', 'Disables cancellation', 'Makes the iterator synchronous'], answer: 0, explain: 'GetAsyncEnumerator(token) and WithCancellation(token) supply the token to the attributed parameter.' },
    { q: 'An async iterator yields 1..1000 and the consumer breaks after 3 items. How many items are produced?', options: ['3 (production is pull-based; then DisposeAsync runs finally blocks)', '1000', '0', '4'], answer: 0, explain: 'Each MoveNextAsync drives the producer to the next yield; after the break the enumerator is disposed.' },
    { q: 'Which statement about Task.Run is true?', options: ['It queues CPU-bound work to the thread pool; wrapping already-async I/O in it adds a pointless thread hop', 'It creates a new dedicated thread every time', 'It is required for every async method', 'It blocks until the work finishes'], answer: 0, explain: 'Use Task.Run to offload CPU work from a UI or request thread, not to "make I/O async".' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between a Task and a Thread?', level: 'B', a: `<p>A ${C('Thread')} is an OS-level execution unit with its own stack (about 1 MB) and scheduling cost. A ${C('Task')} is an object representing an operation that will complete in the future, with a result, exception or cancellation. A task may run code on a thread-pool thread (${C('Task.Run')}), or use no thread at all while it waits (an HTTP request, a timer, a ${C('TaskCompletionSource')} completed by an event). Thousands of concurrent tasks can therefore be served by a handful of threads, which is what makes async I/O scale.</p>`, followUps: ['When would you still create a dedicated Thread?'] },
    { q: 'Explain what the compiler generates for an async method.', level: 'A', a: `<p>The method body becomes a state machine struct implementing ${C('IAsyncStateMachine')}: locals become fields, each await becomes a numbered state, and ${C('MoveNext()')} contains the code with jumps to resume points. The original method creates the struct, initialises an ${C('AsyncTaskMethodBuilder')} and calls Start, which runs MoveNext synchronously. At an await, if the awaiter is complete it continues; otherwise it records the state, boxes the state machine to the heap (once), registers MoveNext as the continuation via ${C('AwaitUnsafeOnCompleted')} and returns. The builder produces the returned Task and completes it with SetResult or SetException.</p>`, followUps: ['What does ExecutionContext flow mean here?', 'Why are async methods with no awaits warned about?'] },
    { q: 'Why does sync-over-async deadlock, and how do you fix it?', level: 'I', a: `<p>In an environment with a single-threaded SynchronizationContext (UI apps, classic ASP.NET), ${C('task.Result')} or ${C('Wait()')} blocks the context's thread. The awaited operation's continuation captured that context and is posted back to the same thread, which is blocked waiting for it — a circular wait. Fixes: go async all the way (await instead of blocking; async event handlers), use ${C('ConfigureAwait(false)')} in library code so continuations do not need the context, and as a last resort run the async code on the pool with ${C('Task.Run(...).GetAwaiter().GetResult()')}. In ASP.NET Core there is no context, but blocking still causes thread-pool starvation.</p>`, followUps: ['What is thread-pool starvation?'] },
    { q: 'When should you use ConfigureAwait(false)?', level: 'I', a: `<p>In general-purpose library code, on every await that does not need to resume on the caller's context: it avoids deadlocks when callers block, and avoids unnecessary hops back to a UI thread. Do not use it in application code that must resume on the context, such as UI code updating controls after an await. In ASP.NET Core and console apps there is no SynchronizationContext, so it has no effect there (many teams omit it in app code). .NET 8 adds ${C('ConfigureAwaitOptions')} for finer control, e.g. SuppressThrowing.</p>`, followUps: ['Does ConfigureAwait(false) guarantee a thread switch?'] },
    { q: 'How do Task.WhenAll and Task.WhenAny handle exceptions?', level: 'I', a: `<p>WhenAll waits for all tasks, even after one faults. Its task is Faulted if any input faulted (else Canceled if any was canceled) and its ${C('Exception')} contains every inner exception; ${C('await')} rethrows only the first, so keep a reference to the combined task to inspect all. WhenAny never faults: it returns the first completed task, which may itself be faulted — you must await the returned task to observe its exception. The losing tasks keep running and their exceptions must still be observed or the work cancelled.</p>`, followUps: ['How would you implement fail-fast WhenAll?'] },
    { q: 'How does cancellation work in .NET async code?', level: 'B', a: `<p>A ${C('CancellationTokenSource')} creates a ${C('CancellationToken')} that is passed down through async calls. Calling ${C('Cancel()')} or ${C('CancelAfter()')} sets the token and runs registered callbacks. Code observes it cooperatively: ${C('ThrowIfCancellationRequested()')} at safe points, passing the token to I/O APIs that abort early, or ${C('Register')} for callback-based operations. By convention cancellation surfaces as ${C('OperationCanceledException')}, making the task Canceled. Linked sources combine tokens (caller token + own timeout); sources should be disposed.</p>`, followUps: ['How do you distinguish a timeout from caller cancellation?'] },
    { q: 'What is ValueTask and what are its rules?', level: 'A', a: `<p>${C('ValueTask<T>')} is a struct that wraps either a result, a ${C('Task<T>')} or an ${C('IValueTaskSource<T>')}. It avoids allocating a Task when a method usually completes synchronously (cache hits, buffered reads) and, with IValueTaskSource, allows pooled, reusable async operations with zero allocations. Rules: consume it exactly once — never await twice or concurrently, do not store it, do not block on ${C('Result')} unless ${C('IsCompletedSuccessfully')}; call ${C('AsTask()')} if you need Task semantics. Default to Task unless profiling shows the allocation matters.</p>`, followUps: ['Why does double-await break with pooled sources?'] },
    { q: 'What is an async stream and when would you use IAsyncEnumerable&lt;T&gt;?'.replace('<', '&lt;').replace('>', '&gt;'), level: 'I', a: `<p>An async stream is a sequence whose items arrive asynchronously. An async iterator (${C('async IAsyncEnumerable<T>')} with ${C('yield return')}) can await between items; consumers use ${C('await foreach')}. It is pull-based and deferred: the producer runs only as the consumer asks for items, so breaking early stops production, and memory stays constant. Use it for paged APIs, database cursors (EF Core AsAsyncEnumerable), gRPC streaming, channel readers and streaming JSON responses — anywhere ${C('Task<List<T>>')} would buffer too much or delay the first item.</p>`, followUps: ['How does cancellation reach the iterator?'] },
    { q: 'How would you limit the number of concurrent async operations?', level: 'I', a: `<p>Options: a ${C('SemaphoreSlim(maxConcurrency)')} with ${C('await WaitAsync()')} before each operation and ${C('Release()')} in finally, then WhenAll over all tasks; ${C('Parallel.ForEachAsync')} with ${C('MaxDegreeOfParallelism')} (.NET 6+); a ${C('Channel<T>')} with N consumer tasks; or TPL Dataflow blocks with a degree of parallelism. Avoid processing in fixed batches (each batch waits for its slowest item) and avoid unbounded WhenAll over thousands of remote calls, which can exhaust sockets or overload the downstream service.</p>`, followUps: ['How would you add per-operation timeouts?'] },
    { q: 'What is TaskCompletionSource and why pass RunContinuationsAsynchronously?', level: 'A', a: `<p>${C('TaskCompletionSource<T>')} creates a promise task that you complete manually with SetResult/SetException/SetCanceled (or the Try variants). It bridges callback- or event-based APIs and custom coordination primitives (async queues, latches) to tasks. By default, completing it runs awaiting continuations synchronously on the completing thread, which can execute arbitrary consumer code inside your method — while you hold a lock, or deep in a stack — causing deadlocks, reentrancy bugs and stack dives. ${C('TaskCreationOptions.RunContinuationsAsynchronously')} queues continuations to the pool instead.</p>`, followUps: ['Build an async manual-reset event with it.'] },
    { q: 'What is thread-pool starvation and how do you diagnose it?', level: 'A', a: `<p>It happens when pool threads are blocked (sync-over-async, ${C('Thread.Sleep')}, blocking I/O, long locks) so queued work items — including the continuations that would unblock them — cannot run. The pool injects new threads only gradually (roughly one or two per second beyond the minimum), so latency explodes under load while CPU stays low. Diagnose with ${C('dotnet-counters')} (ThreadPool thread count rising, queue length growing) and dumps/stacks showing many threads in ${C('Task.Wait')}, ${C('.Result')} or ${C('Monitor.Enter')}. Fix by removing blocking calls; raising ${C('ThreadPool.SetMinThreads')} is only a band-aid.</p>`, followUps: ['Why does Task.Run(async ...) in ASP.NET Core rarely help?'] },
    { q: 'Predict the output: `var t = F(); Console.WriteLine("B"); await t;` with `async Task F() { Console.WriteLine("A"); await Task.Delay(1); Console.WriteLine("C"); }`.', level: 'I', a: `<p>It prints <b>A</b>, then <b>B</b>, then <b>C</b>. Calling F runs it synchronously until the first await of an incomplete task: "A" is printed, ${C('Task.Delay(1)')} is incomplete, so F returns an incomplete task. The caller prints "B" and awaits. About a millisecond later the timer fires and F resumes, printing "C". If F awaited ${C('Task.CompletedTask')} instead, the output would be A, C, B, because nothing suspends.</p>`, followUps: ['What if F awaited Task.Yield()?'] },
    { q: 'How do you write an async method that validates arguments eagerly?', level: 'I', a: `<p>Exceptions thrown inside an ${C('async')} method — even before the first await — are captured in the returned task and only surface when the caller awaits it, possibly much later. To throw at the call site, split the method: a non-async public method validates arguments and then calls a private async implementation (often a local function) and returns its task. The same pattern applies to iterators. Example: ${C('public Task<int> ReadAsync(string path) { ArgumentNullException.ThrowIfNull(path); return Core(path); }')}.</p>`, followUps: ['Does the same apply to async iterators?'] },
    { q: 'Compare Task.Run, Task.Factory.StartNew and Parallel.ForEachAsync.', level: 'E', a: `<p>${C('Task.Run')} queues a delegate to the default scheduler's thread pool and understands async lambdas (it unwraps ${C('Task<Task>')}); it is the default choice for offloading CPU work. ${C('Task.Factory.StartNew')} offers options (LongRunning for a dedicated thread, custom schedulers, AttachedToParent) but uses ${C('TaskScheduler.Current')} by default and returns ${C('Task<Task>')} for async lambdas — easy to misuse. ${C('Parallel.ForEachAsync')} processes a collection with async bodies and a bounded degree of parallelism and cancellation support; it is the high-level choice for "do this async operation for each item, at most N at a time".</p>`, followUps: ['When is LongRunning appropriate?'] }
  );

  registerModule({
    id: 'csharp09',
    title: 'Async/Await & Tasks',
    intro: `<p>Asynchronous programming is how .NET servers handle thousands of requests and how UI apps stay responsive. This module builds an exact mental model of ${C('Task')} and ${C('Task<T>')}, then opens the compiler's async state machine so you can predict the order in which code runs. You will compose tasks with ${C('Task.WhenAll')} and ${C('Task.WhenAny')}, cancel work cooperatively with tokens and timeouts, understand ${C('SynchronizationContext')}, ${C('ConfigureAwait')} and why ${C('.Result')} deadlocks, avoid allocations with ${C('ValueTask')}, and stream data with ${C('IAsyncEnumerable<T>')}.</p>
<p>Visualizers follow a task through its states, step through the state machine, draw task timelines, play out cancellation and the classic UI deadlock. All practice tests are deterministic: they use TaskCompletionSource hand-offs, injected delays or order-independent results, never timing luck.</p>`,
    goals: [
      'Explain what a Task is (and is not), its states, and how to create and observe one',
      'Predict the execution order of async code by reasoning about the state machine',
      'Compose tasks with WhenAll/WhenAny, handle all exceptions and implement timeouts',
      'Propagate CancellationTokens and stop work at safe points',
      'Avoid sync-over-async deadlocks and thread-pool starvation; use ConfigureAwait correctly',
      'Use ValueTask and IAsyncEnumerable&lt;T&gt; where they pay off, respecting their rules'
    ],
    prereqs: `C# 6 (delegates, lambdas, LINQ, iterators) and C# 7 (exceptions and using).`,
    hours: 13,
    langNotes: {
      csharp: `<p>Console apps and ASP.NET Core have no SynchronizationContext: continuations run on thread-pool threads. Never block on tasks (${C('.Result')}, ${C('.Wait()')}) in async code. ${C('async void')} is only for event handlers. LINQ operators for ${C('IAsyncEnumerable<T>')} are not in the .NET 8 BCL (they live in the System.Linq.Async package). ${C('await')} inside a ${C('lock')} block does not compile; use ${C('SemaphoreSlim.WaitAsync')}.</p>`
    },
    topics: topics.map(function (t) { t.examples.forEach(function (ex) { if (typeof ex.code === 'string') ex.code = { lang: 'csharp', code: ex.code, run: true }; }); return t; }),
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
