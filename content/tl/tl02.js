(function () { var topics = [], practice = [], quiz = [], interview = [];

// Scenario problem builder (interview scenario: weak answer vs strong answer).
function P(o) {
  var sol = { approach: o.a, complexity: o.cx, followUps: o.f };
  if (o.code) sol.code = o.code;
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Start with one plain sentence, then give the steps in order, then name one trade-off.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: sol
  };
}
function CS(code, title) { var s = { lang: 'csharp', code: code, check: false }; if (title) s.title = title; return s; }

// Visualizer helper: reveal a table row by row.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || String(rows[i][0]), parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}

// ================= TOPIC 1: async/await and the Task model =================
topics.push({
  title: 'async/await and the Task Model',
  analogy: `<p>Picture a small restaurant with <b>2 waiters</b> and 20 tables. A waiter who stands at the kitchen door until each dish is cooked can look after 2 tables. A waiter who hands the order in, takes a <b>ticket</b>, and goes to serve other tables can look after all 20. The waiter is a <b>thread</b>, the ticket is a <b>Task</b>, and "come back when the ticket is called" is <b>await</b>. The kitchen cooks at the same speed in both cases. What changes is how many tables the same 2 waiters can serve.</p>`,
  explain: `<p><b>The plain idea:</b> a web server has a limited number of threads. Most of a request's life is spent <i>waiting</i>: for the database, for another service, for a file. Async code gives the thread back during that wait.</p>
    <ul>
      <li><code>Task</code> = a promise that a result or an error will arrive later. It is <b>not</b> a thread.</li>
      <li><code>async</code> = "this method may pause". The compiler turns it into a <b>state machine</b>, a small object that remembers where the method stopped.</li>
      <li><code>await</code> = "if the task is not finished, save my place, return to my caller, and continue here later".</li>
      <li><code>CancellationToken</code> = a "stop, nobody is waiting any more" signal that you pass down every call.</li>
    </ul>
    ${H.table(['Kind of work', 'Example', 'Right tool'], [
      ['I/O-bound (waiting)', 'SQL query, HTTP call, file read', '<span class="c-g">async / await</span>'],
      ['CPU-bound (computing)', 'Image resize, big loop, hashing', '<span class="c-b">Parallel, Task.Run (desktop), background worker</span>'],
      ['Many I/O calls', '5,000 ids to fetch', '<span class="c-p">Parallel.ForEachAsync with a limit</span>']
    ])}
    <p>Interviewers test three things here: can you explain it simply, do you know what happens at an <code>await</code>, and can you name the mistakes (<code>.Result</code>, <code>async void</code>, fire-and-forget, no cancellation).</p>`,
  clues: [
    '"What happens when the code reaches an <code>await</code>?" → state machine, continuation, thread returned to the pool',
    '"Does async make my code faster?" → no, it makes it scale; one request takes the same time',
    '"Why did <code>.Result</code> hang?" → blocking on async; deadlock with a synchronization context, starvation without one',
    '"Task vs Thread" or "Task vs ValueTask" → a promise vs a worker; struct vs class',
    '"The user closed the browser, what happens to the query?" → CancellationToken, <code>RequestAborted</code>',
    '"Call 3 services and combine the results" → start all, then <code>Task.WhenAll</code>'
  ],
  code: [CS(`public sealed class OrderReader
{
    private readonly HttpClient _http;
    public OrderReader(HttpClient http) => _http = http;

    // Async all the way: return Task, take a token, pass the token down.
    public async Task<OrderSummary> GetSummaryAsync(int id, CancellationToken ct)
    {
        // Start both calls first. Nothing is awaited yet, so they overlap.
        Task<Order> orderTask = _http.GetFromJsonAsync<Order>("orders/" + id, ct)!;
        Task<Customer> customerTask = _http.GetFromJsonAsync<Customer>("orders/" + id + "/customer", ct)!;

        // One await for both. Total time = the slower call, not the sum.
        await Task.WhenAll(orderTask, customerTask);

        // Both tasks are complete, so these awaits do not wait.
        Order order = await orderTask;
        Customer customer = await customerTask;
        return new OrderSummary(order.Id, customer.Name, order.Total);
    }
}

public record Order(int Id, decimal Total);
public record Customer(string Name);
public record OrderSummary(int Id, string CustomerName, decimal Total);`, 'Async all the way, with two overlapping calls')],
  viz: {
    title: 'What one thread does at an await',
    gen: function () {
      var code = 'public async Task<Order> GetAsync(int id)\n{\n    Log("start");\n    var o = await db.FindAsync(id);\n    Log("got it");\n    return o;\n}';
      function f(narr, line, cls, vals, hlv, pool, waiting) {
        var hl = {}; hl[line] = cls;
        return { narr: narr, parts: [
          { type: 'code', label: 'The async method', lang: 'csharp', code: code, hl: hl },
          { type: 'vars', label: 'State', vals: vals, hl: hlv || {} },
          { type: 'queue', label: 'Free threads in the pool', items: pool, frontLabel: 'next', backLabel: 'last' },
          { type: 'set', label: 'Operations waiting on the database (no thread needed)', items: waiting }
        ] };
      }
      return [
        f('A request arrives. The pool gives it <b>thread 7</b>. Threads 8 and 9 are free.', 1, 'cur', { 'thread 7': 'running GetAsync', 'returned Task': 'not created yet' }, {}, ['T8', 'T9'], []),
        f('Line 3 runs <b>synchronously</b>, like any normal method. Nothing async has happened yet.', 3, 'cur', { 'thread 7': 'running GetAsync', 'returned Task': 'not created yet' }, {}, ['T8', 'T9'], []),
        f('Line 4 calls <code>FindAsync</code>. The query is sent to the database and a task comes back that is <b>not finished</b>.', 4, 'cur', { 'thread 7': 'running GetAsync', 'FindAsync task': 'incomplete' }, { 'FindAsync task': 'cur' }, ['T8', 'T9'], ['query #1']),
        f('<code>await</code> sees the task is incomplete. The state machine <b>saves its place</b> (state = 1, locals kept on the heap) and returns an incomplete <code>Task&lt;Order&gt;</code> to the caller.', 4, 'win', { 'thread 7': 'returning to caller', 'saved state': '1 (after line 4)', 'returned Task': 'incomplete' }, { 'saved state': 'sel' }, ['T8', 'T9'], ['query #1']),
        f('<b>Thread 7 is free again</b> and goes back to the pool. It can serve another request. No thread is waiting for the database.', 4, 'done', { 'thread 7': 'back in the pool', 'saved state': '1 (after line 4)', 'returned Task': 'incomplete' }, { 'thread 7': 'ok' }, ['T8', 'T9', 'T7'], ['query #1']),
        f('40 ms later the database answers. The operating system signals completion and the pool picks a free thread, here <b>thread 8</b>, to run the continuation.', 4, 'ok', { 'thread 8': 'resuming GetAsync', 'saved state': '1 → continue', 'FindAsync task': 'complete' }, { 'thread 8': 'cur' }, ['T9', 'T7'], []),
        f('The method continues at line 5 as if it had never stopped. Note that it is a <b>different thread</b> from the one that started it.', 5, 'cur', { 'thread 8': 'running GetAsync', 'o': 'Order #42' }, {}, ['T9', 'T7'], []),
        f('<code>return o</code> completes the <code>Task&lt;Order&gt;</code>. Whoever awaited it now continues the same way. Thread 8 returns to the pool.', 6, 'ok', { 'returned Task': 'complete, result = Order #42', 'thread 8': 'back in the pool' }, { 'returned Task': 'ok' }, ['T9', 'T7', 'T8'], [])
      ];
    }
  },
  examples: [
    { title: 'Sequential vs overlapping calls', html: `<p>Two independent calls of 200 ms each.</p>
      ${H.table(['Code', 'Total time'], [
        ['<code>var a = await A(); var b = await B();</code>', '<span class="c-r">about 400 ms</span>'],
        ['<code>var ta = A(); var tb = B(); await Task.WhenAll(ta, tb);</code>', '<span class="c-g">about 200 ms</span>']
      ])}
      <p>A task starts when the method is <b>called</b>, not when it is awaited. Calling both first lets them overlap. Only do this when the calls do not depend on each other, and never with two queries on the same EF Core <code>DbContext</code>, which is not thread-safe.</p>` },
    { title: 'Why .Result hangs in a desktop app', html: `<p>A button click handler calls <code>LoadAsync().Result</code>.</p>
      <ol><li>The UI thread blocks on <code>.Result</code>, waiting for the task.</li>
      <li>Inside <code>LoadAsync</code>, the <code>await</code> wants to continue <b>on the UI thread</b> (the captured context).</li>
      <li>The UI thread is blocked in step 1. Each side waits for the other: a deadlock.</li></ol>
      <p>Fix: make the handler <code>async void</code> (the one allowed case) and <code>await LoadAsync()</code>. In ASP.NET Core there is no such context, so you get no deadlock, but you still block a thread and risk starvation.</p>` },
    { title: 'Cancellation that actually stops the work', html: `<p>A search endpoint takes 8 seconds. The user types a new letter after 1 second and the browser cancels the old request.</p>
      <p>ASP.NET Core passes a token to the action. If you hand it to EF Core, the query is cancelled on the database server too.</p>`,
      code: CS(`app.MapGet("/search", async (string q, ShopDb db, CancellationToken ct) =>
{
    // ct is cancelled when the client disconnects.
    var hits = await db.Products
        .Where(p => p.Name.Contains(q))
        .Take(20)
        .ToListAsync(ct);      // the SQL command is cancelled as well
    return Results.Ok(hits);
});`) }
  ],
  deepDive: `<p><b>What the compiler builds.</b> An async method becomes a struct that implements <code>IAsyncStateMachine</code> with a <code>MoveNext</code> method and an integer state. At the first incomplete await the struct is boxed to the heap, so a method that completes synchronously allocates almost nothing. That is the reason <code>ValueTask&lt;T&gt;</code> exists: it avoids the <code>Task</code> allocation on that synchronous path.</p>
    <p><b>Where the continuation runs.</b> The awaiter captures <code>SynchronizationContext.Current</code> (or a non-default <code>TaskScheduler</code>). UI frameworks have one; ASP.NET Core does not. <code>ConfigureAwait(false)</code> tells the awaiter not to capture it, which is why library code uses it.</p>
    <p><b>ExecutionContext</b> does flow across awaits. That is how <code>AsyncLocal&lt;T&gt;</code>, the current culture and the tracing <code>Activity</code> follow a request across threads.</p>
    <p><b>Exceptions.</b> A throw inside an async <code>Task</code> method is captured into the task. With <code>async void</code> there is no task, so the exception is raised on the context or the thread pool and can end the process.</p>
    <p><b>I/O completion.</b> For sockets and files, .NET uses the operating system's completion mechanism (IOCP on Windows, epoll or io_uring style polling on Linux). There is truly no thread parked on the wait.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant writes async code quickly and usually gets the syntax right, so interviews lean more on <i>why</i> than on <i>how</i>.</p>
    <p><b>Use AI as a partner:</b> ask it to review, not only to write. For example: <code>List every place in this file that blocks on a Task or drops a CancellationToken. Do not rewrite the code.</code></p>
    <p><b>Where AI goes wrong:</b> it wraps I/O in <code>Task.Run</code>, adds <code>.Result</code> to "fix" a compiler error in a synchronous method, forgets to pass the token down, and runs two EF Core queries on one context in parallel.</p>
    <p><b>What you must still own:</b> knowing whether the work is waiting or computing, choosing a limit for parallel calls, and reading a dump when production is slow with low CPU.</p>`,
  problems: [P({
    t: 'The endpoint that freezes under load', l: 'Medium', tags: ['async', 'thread pool', 'diagnosis'],
    s: 'An order API answers in 80 ms in testing. In production, at about 300 requests per second, response times jump to 20 seconds and then time out, while CPU stays near 15%. A restart helps for 10 minutes. The interviewer asks: what is your first theory, how do you confirm it, and what is the fix?',
    ex: `<p>Part of the code under suspicion:</p><pre><code>public Order Get(int id)
{
    var customer = _customers.GetAsync(id).Result;   // HTTP call
    return _repo.Load(id, customer);
}</code></pre><p>The useful answer names a <span class="c-g">theory</span>, a <span class="c-b">measurement</span> and a <span class="c-p">fix</span>, in that order.</p>`,
    weak: 'The server is too small. I would scale out to more instances and raise the timeout.',
    why: 'CPU is at 15%, so the machine is not short of power. More instances only delays the same failure, and a longer timeout keeps even more threads stuck. The answer never looks at the evidence (slow, but idle) and never names a cause.',
    q: ['Slow responses, low CPU, fixed for a while by a restart. Which cause fits best?', ['A CPU-heavy algorithm', 'Thread-pool starvation from blocking calls', 'A missing database index', 'Too little disk space'], 1, 'Threads blocked on .Result do no work, so CPU is low, but none are free for new requests. A restart clears the queue for a short time.'],
    h: ['Low CPU plus long waits means threads are <b>waiting</b>, not working. What makes a thread wait inside async code?', 'Name the tool that shows thread count and thread-pool queue length live, and the tool that shows what each thread is doing.', 'Recipe: theory (starvation) → confirm with counters and a dump → fix by making the chain async → stop it coming back with an analyzer rule.'],
    a: `<p><b>Theory:</b> thread-pool starvation. <code>.Result</code> blocks a pool thread for the whole HTTP call. At 300 requests per second, threads are used up faster than the pool adds new ones (about 1 or 2 per second), so requests queue.</p>
      <p><b>Confirm:</b></p><ol><li><code>dotnet-counters monitor</code> on the process: thread count climbing, thread-pool queue length above 0, CPU low.</li><li><code>dotnet-dump collect</code>, then <code>clrstack -all</code>: hundreds of threads in the same frame, <code>Task.Wait</code> under <code>Get</code>.</li></ol>
      <p><b>Fix:</b> make the path async from the controller down: <code>public async Task&lt;Order&gt; GetAsync(int id, CancellationToken ct)</code> with <code>await _customers.GetAsync(id, ct)</code>, and an async repository call.</p>
      <p><b>Keep it fixed:</b> add an analyzer rule that turns <code>.Result</code> and <code>.Wait()</code> into build errors, add a timeout on the HTTP client, and put the thread-pool queue length on the dashboard.</p>
      <p><b>What I would not do:</b> raise <code>SetMinThreads</code> and walk away. It can be a stop-gap for tonight, and I would say so, but it hides the cause.</p>`,
    cx: '<p>Shows a tech lead habit: evidence first, then cause, then fix, then prevention.</p>',
    f: ['The blocking call is inside a third-party library you cannot change. What now?', 'How would you load-test the fix before release?']
  })]
});

// ================= TOPIC 2: threads, locks, concurrent collections =================
topics.push({
  title: 'Threads, Locks and Concurrent Collections',
  analogy: `<p>Two cashiers share <b>one paper notebook</b> for the day's total. Each reads the number, adds a sale in their head, and writes the new number. If both read "100" at the same moment, one writes 110 and the other writes 120. One sale is lost. Fixes from real life map straight to code: <b>one pen</b> that you must hold to write (a lock), a <b>ticket machine</b> that lets 3 people in at a time (a semaphore), a <b>till that adds by itself</b> in one step (Interlocked), or giving each cashier their <b>own notebook</b> and adding them up at the end (no shared state).</p>`,
  explain: `<p><b>The plain idea:</b> a bug appears when 2 threads touch the <b>same data</b>, at least one of them <b>writes</b>, and nothing controls the order. That is a <b>race condition</b>. <code>count++</code> looks like one step but is three: read, add, write.</p>
    ${H.table(['Tool', 'Plain meaning', 'Use when'], [
      ['<code>lock</code>', 'One at a time', 'Short synchronous section. No <code>await</code> inside'],
      ['<code>Interlocked</code>', 'One atomic step on one value', 'Counters, flags, swapping a reference'],
      ['<code>SemaphoreSlim</code>', 'At most N at a time, and it can be awaited', 'Async code; limiting calls to a service'],
      ['<code>ConcurrentDictionary</code>', 'A map that is safe to share', 'Caches and lookups used by many threads'],
      ['<code>Channel&lt;T&gt;</code>', 'A safe queue between producers and consumers', 'Background work inside one process'],
      ['Immutable data', 'Nothing can change, so nothing can race', '<span class="c-g">Always the first choice</span>']
    ])}
    <p>The order of preference in an interview answer: <b>do not share</b> → <b>share only immutable data</b> → <b>use a concurrent type</b> → <b>lock</b>. A singleton service in ASP.NET Core is used by all requests at once, so every field in it must be safe.</p>`,
  clues: [
    '"Is this class thread-safe?" → look for shared fields that are written; singletons and statics first',
    '"The counter is sometimes lower than expected" → lost update, <code>count++</code> is not atomic',
    '"Limit to 5 calls at a time" → <code>SemaphoreSlim</code> or <code>Parallel.ForEachAsync</code>',
    '"Can I await inside a lock?" → no; use <code>SemaphoreSlim.WaitAsync</code>',
    '"Producer is faster than consumer" → bounded <code>Channel&lt;T&gt;</code>, back-pressure',
    '"Two threads are stuck forever" → deadlock, lock ordering',
    '"lock(this)?" → no, lock a private object'
  ],
  code: [{ lang: 'csharp', title: 'Lost updates, and two fixes (compiles and runs)', code: `using System;
using System.Threading;
using System.Threading.Tasks;

public class CounterDemo
{
    private static int _unsafe;
    private static int _atomic;
    private static int _locked;
    private static readonly object Gate = new object();

    public static void Main()
    {
        // 4 workers, 100,000 increments each. The correct total is 400,000.
        Parallel.For(0, 4, worker =>
        {
            for (int i = 0; i < 100000; i++)
            {
                _unsafe++;                              // read, add, write: updates get lost
                Interlocked.Increment(ref _atomic);     // one atomic step, no lock
                lock (Gate) { _locked++; }              // one thread at a time
            }
        });

        Console.WriteLine("unsafe : " + _unsafe);       // usually less than 400000
        Console.WriteLine("atomic : " + _atomic);       // always 400000
        Console.WriteLine("locked : " + _locked);       // always 400000
    }
}` },
  CS(`public sealed class RateLimitedClient
{
    private readonly HttpClient _http;
    private readonly SemaphoreSlim _gate = new(5);      // at most 5 calls in flight

    public RateLimitedClient(HttpClient http) => _http = http;

    public async Task<string> GetAsync(string url, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);                       // waits without blocking a thread
        try
        {
            return await _http.GetStringAsync(url, ct);
        }
        finally
        {
            _gate.Release();                             // always release, even on error
        }
    }
}`, 'An async-friendly limiter with SemaphoreSlim')],
  viz: {
    title: 'A lost update: two threads run count++',
    gen: function () {
      var code = '// count++ is really three steps\nint temp = count;   // 1. read\ntemp = temp + 1;    // 2. add\ncount = temp;       // 3. write';
      function f(narr, rows, hlRow, count, cls, line) {
        var h = {}; if (hlRow >= 0) h[hlRow] = cls || 'cur';
        var ch = {}; if (line) ch[line] = cls || 'cur';
        return { narr: narr, parts: [
          { type: 'code', label: 'What the CPU does for count++', lang: 'csharp', code: code, hl: ch },
          { type: 'table', label: 'Timeline', columns: ['Step', 'Thread A', 'Thread B', 'count in memory'], rows: rows, hl: h },
          { type: 'vars', label: 'Shared field', vals: { count: count }, hl: { count: cls === 'bad' ? 'bad' : (cls === 'ok' ? 'ok' : 'cur') } }
        ] };
      }
      var r1 = [['1', 'reads count = 0', '', '0']];
      var r2 = r1.concat([['2', '', 'reads count = 0', '0']]);
      var r3 = r2.concat([['3', 'adds: temp = 1', '', '0']]);
      var r4 = r3.concat([['4', '', 'adds: temp = 1', '0']]);
      var r5 = r4.concat([['5', 'writes count = 1', '', '1']]);
      var r6 = r5.concat([['6', '', 'writes count = 1', '1']]);
      var s1 = [['1', 'takes the lock', 'wants the lock: waits', '0']];
      var s2 = s1.concat([['2', 'read 0, add, write 1', 'waiting', '1']]);
      var s3 = s2.concat([['3', 'releases the lock', 'takes the lock', '1']]);
      var s4 = s3.concat([['4', '', 'read 1, add, write 2', '2']]);
      return [
        f('Two threads both run <code>count++</code>. The field starts at <b>0</b>. We expect <b>2</b> at the end.', [], -1, 0, 'cur', 1),
        f('Thread A reads the field into its own temporary: <b>0</b>.', r1, 0, 0, 'cur', 2),
        f('Before A writes anything, thread B also reads the field. It also sees <b>0</b>. This is the moment the bug is born.', r2, 1, 0, 'cur', 2),
        f('Both threads add 1 to their private copy. Each now holds <b>1</b>.', r4, 3, 0, 'cur', 3),
        f('Thread A writes 1.', r5, 4, 1, 'cur', 4),
        f('Thread B writes its copy, also 1. It <b>overwrites</b> A\'s work. Final value 1, not 2. One update is <span class="c-r">lost</span>.', r6, 5, 1, 'bad', 4),
        f('Now the same code inside <code>lock (gate) { count++; }</code>. Thread A takes the lock. Thread B must wait.', s1, 0, 0, 'cur', 1),
        f('A does all three steps with nobody in between, then releases the lock.', s3, 2, 1, 'cur', 4),
        f('B now reads the <b>new</b> value 1 and writes 2. The result is <span class="c-g">correct</span>. <code>Interlocked.Increment</code> gives the same result with no lock at all.', s4, 3, 2, 'ok', 4)
      ];
    }
  },
  examples: [
    { title: 'Check-then-act on a ConcurrentDictionary is still a race', html: `<p>Each single call on a concurrent collection is safe. Two calls in a row are not one step.</p>
      ${H.table(['Code', 'Safe?'], [
        ['<code>if (!map.ContainsKey(k)) map[k] = Load(k);</code>', '<span class="c-r">No. Two threads can both pass the check and both load</span>'],
        ['<code>map.GetOrAdd(k, Load)</code>', '<span class="c-y">The map stays correct, but Load may run twice</span>'],
        ['<code>map.GetOrAdd(k, x =&gt; new Lazy&lt;T&gt;(() =&gt; Load(x))).Value</code>', '<span class="c-g">Yes. Load runs once per key</span>']
      ])}` },
    { title: 'A singleton with a hidden shared field', html: `<p>A service registered as a singleton keeps "the current user" in a field.</p>
      <pre><code>public class PriceService            // registered with AddSingleton
{
    private string _currentUser = "";  // shared by every request!
    public void SetUser(string u) =&gt; _currentUser = u;
}</code></pre>
      <p>Request 1 sets "asha", request 2 sets "ben", and request 1 then prices the basket as ben. Fix: pass the user as a method parameter, or make the service scoped. Rule: a singleton holds only read-only or thread-safe state.</p>` },
    { title: 'A background queue with a bounded channel', html: `<p>An API accepts "send this email" requests and must answer in 20 ms. A bounded channel holds up to 500 jobs; a hosted service reads them one by one.</p>
      <p>If the queue is full, <code>TryWrite</code> returns false and the API can answer 429 or 503. That is back-pressure: the system says "slow down" and does not run out of memory.</p>`,
      code: CS(`public sealed class EmailQueue
{
    private readonly Channel<EmailJob> _channel =
        Channel.CreateBounded<EmailJob>(new BoundedChannelOptions(500)
        {
            FullMode = BoundedChannelFullMode.Wait
        });

    // Called by the API. Returns false when the queue is full.
    public bool TryEnqueue(EmailJob job) => _channel.Writer.TryWrite(job);

    // Called by the background worker.
    public IAsyncEnumerable<EmailJob> ReadAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}

public record EmailJob(string To, string Subject);`) }
  ],
  deepDive: `<p><b>What <code>lock</code> is.</b> <code>lock (obj)</code> compiles to <code>Monitor.Enter</code> / <code>Monitor.Exit</code> in a try/finally. It is re-entrant: the same thread can take it again. From .NET 9 you can declare the gate as <code>System.Threading.Lock</code>, and the compiler then calls <code>EnterScope()</code>, which is cheaper and cannot be confused with other uses of the object.</p>
    <p><b>Why no await inside a lock.</b> A monitor is owned by a thread. After an await the method may continue on a different thread, which would try to release a lock it does not own. The compiler refuses. <code>SemaphoreSlim</code> has no owner thread, so it works, but it is not re-entrant: taking it twice in the same call chain deadlocks.</p>
    <p><b>Visibility.</b> Without a lock, <code>volatile</code> or <code>Interlocked</code>, one thread may keep using an old value of a field held in a register. <code>volatile</code> fixes reading, not read-modify-write.</p>
    <p><b>Lock-free does not mean free.</b> <code>Interlocked.CompareExchange</code> loops retry under contention. Under heavy writes a plain lock can be faster. Measure.</p>
    <p><b>False sharing.</b> Two counters that sit on the same 64-byte cache line slow each other down even though they are logically separate. It matters only in very hot code.</p>
    <p><b>Other tools:</b> <code>ReaderWriterLockSlim</code> for many readers and few writers, <code>ImmutableDictionary</code> or <code>FrozenDictionary</code> (.NET 8+) for data that is built once and then read.</p>`,
  aiEra: `<p><b>What AI changes:</b> generated code compiles and passes a single-threaded unit test, so race conditions slip through more easily than before. The reviewer is the safety net.</p>
    <p><b>Use AI as a partner:</b> <code>This class is registered as a singleton. List every field that is written after construction and say whether each write is thread-safe.</code> This kind of targeted question works well.</p>
    <p><b>Where AI goes wrong:</b> it uses <code>Dictionary</code> in a singleton, writes check-then-act on a concurrent collection, puts <code>await</code> near a <code>lock</code> and then "fixes" it with <code>.Result</code>, and forgets <code>Release()</code> in a <code>finally</code>.</p>
    <p><b>What you must still own:</b> knowing the lifetime of each service, deciding what is shared, and writing a stress test that runs the code from many threads.</p>`,
  problems: [P({
    t: 'The cache that loads the same product 200 times', l: 'Medium', tags: ['concurrency', 'cache', 'stampede'],
    s: 'A product page reads from an in-memory cache with a 5-minute expiry. Every 5 minutes the database CPU spikes for a few seconds. Logs show the same product being loaded about 200 times in the same second. Explain what is happening and how you would fix it.',
    ex: `<pre><code>if (!_cache.TryGetValue(id, out Product p))
{
    p = await _db.LoadProductAsync(id);            // 300 ms
    _cache.Set(id, p, TimeSpan.FromMinutes(5));
}</code></pre><p>At <span class="c-r">12:05:00</span> the entry expires. Every request in the next 300 ms misses and loads.</p>`,
    weak: 'I would increase the cache time to one hour so it expires less often.',
    why: 'The spike still happens, only once an hour, and the data is now up to an hour old. The answer treats the symptom and does not name the cause: many callers load the same key at the same time.',
    q: ['What is this problem usually called?', ['A memory leak', 'A cache stampede', 'A deadlock', 'Thread-pool starvation'], 1, 'A stampede (also called the thundering herd, or dog-piling) is many callers recomputing the same expired entry at once.'],
    h: ['The check and the set are two separate steps. How many requests can be between them during a 300 ms load?', 'You need "one loader per key, everyone else waits for that result". Which .NET types give you a one-time, thread-safe value?', 'Recipe: one loader per key (Lazy of Task, a per-key SemaphoreSlim, or HybridCache) → remove failed entries → add a little random time to the expiry so keys do not all expire together.'],
    a: `<p><b>Cause:</b> a cache stampede. The code is check-then-act with a 300 ms gap, so every request that arrives in that gap sees a miss and runs the same query.</p>
      <p><b>Fix, in order of preference:</b></p>
      <ol><li>Use <code>HybridCache</code> (.NET 9 and later). <code>GetOrCreateAsync</code> runs the factory once per key for callers that arrive together.</li>
      <li>Or keep <code>IMemoryCache</code> and guard the load with a per-key <code>SemaphoreSlim</code>: wait, check the cache again, load only if it is still missing.</li>
      <li>Or store <code>Lazy&lt;Task&lt;Product&gt;&gt;</code> in a <code>ConcurrentDictionary</code>, and remove the entry if the task fails.</li></ol>
      <p><b>Also:</b> add a random 0 to 30 seconds to each expiry so popular keys do not expire in the same second, and for the hottest keys refresh in the background before they expire.</p>
      <p><b>Check:</b> a load test with 500 concurrent requests for one cold key should show exactly 1 database query.</p>`,
    cx: '<p>The key idea is one loader per key; the rest is choosing the smallest tool that gives it.</p>',
    f: ['How does this change with 6 servers behind a load balancer?', 'What happens to the waiting callers if the single loader throws?']
  })]
});

// ================= TOPIC 3: memory, GC, IDisposable, Span =================
topics.push({
  title: 'Memory, the Garbage Collector, IDisposable and Span',
  analogy: `<p>Think of an office. Your <b>desk</b> (the stack) holds what you are working on right now; when the task is done you clear it at once. The <b>storeroom</b> (the heap) holds boxes that anyone may need later. A <b>cleaner</b> (the garbage collector) walks through and removes boxes that no desk and no notice board points to any more. New boxes sit near the door and are checked often; old boxes sit at the back and are checked rarely. But the cleaner only removes boxes. If you <b>borrowed the meeting room key</b> (a file handle, a connection), you must hand it back yourself. That is <code>Dispose</code>.</p>`,
  explain: `<p><b>The plain idea:</b> .NET frees memory for you, but only memory, and only for objects that nothing references.</p>
    <ul>
      <li><b>Stack</b>: locals of running methods. Freed when the method returns. Very fast.</li>
      <li><b>Heap</b>: objects created with <code>new</code>. Freed by the garbage collector (GC).</li>
      <li><b>Generations</b>: Gen 0 (new), Gen 1 (survived once), Gen 2 (long-lived). Objects of 85,000 bytes or more go to the Large Object Heap (LOH).</li>
      <li><b>IDisposable</b>: the way to release things the GC does not manage. <code>using</code> calls it for you.</li>
      <li><b>Span&lt;T&gt;</b>: a view over existing memory, so you can slice without copying.</li>
    </ul>
    ${H.table(['Symptom', 'Likely cause', 'First tool'], [
      ['Memory rises for days, drops on restart', 'Objects still referenced: static list, event, unbounded cache', '<code>dotnet-gcdump</code>, then <code>gcroot</code>'],
      ['"Too many connections" or socket errors', 'Something disposable is not disposed', 'Code review for missing <code>using</code>'],
      ['Short pauses under load, high "% time in GC"', 'Too many allocations in a hot path', '<code>dotnet-counters</code>, <code>dotnet-trace</code>'],
      ['Out of memory with plenty of free memory', 'LOH fragmentation from large arrays', '<code>ArrayPool&lt;T&gt;</code>']
    ])}`,
  clues: [
    '"Memory keeps growing until we restart" → managed leak; who still holds the reference?',
    '"What is the difference between Dispose and a finalizer?" → deterministic vs a late safety net',
    '"Explain Gen 0, Gen 1, Gen 2" → generational GC, most objects die young',
    '"How would you parse this without allocating?" → <code>Span&lt;T&gt;</code>, <code>ReadOnlySpan&lt;char&gt;</code>',
    '"Why can I not use Span in an async method?" → <code>ref struct</code>, stack only; use <code>Memory&lt;T&gt;</code>',
    '"Should we call GC.Collect?" → almost never',
    '"Large arrays" or "85,000 bytes" → Large Object Heap, <code>ArrayPool&lt;T&gt;</code>'
  ],
  code: [CS(`public sealed class ReportWriter : IAsyncDisposable
{
    private readonly FileStream _file;

    public ReportWriter(string path) =>
        _file = new FileStream(path, FileMode.Create, FileAccess.Write,
                               FileShare.None, bufferSize: 4096, useAsync: true);

    public async Task WriteAsync(ReadOnlyMemory<byte> data, CancellationToken ct)
    {
        // Borrow a buffer; do not allocate a new 64 KB array per call.
        byte[] buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);
        try
        {
            data.Span.CopyTo(buffer);                       // Span: a view, no extra copy objects
            await _file.WriteAsync(buffer.AsMemory(0, data.Length), ct);
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);          // always give it back
        }
    }

    // This class owns the stream, so it must release it.
    public ValueTask DisposeAsync() => _file.DisposeAsync();
}

// Caller: await using guarantees DisposeAsync, even if WriteAsync throws.
// await using var writer = new ReportWriter("report.bin");`, 'Owning a resource, and pooling a buffer')],
  viz: {
    title: 'Generational garbage collection, step by step',
    gen: function () {
      function f(narr, g0, g1, g2, h0, h1, h2, roots) {
        return { narr: narr, parts: [
          { type: 'set', label: 'Roots (statics, locals in running methods)', items: roots },
          { type: 'set', label: 'Gen 0 (new objects)', items: g0, hl: h0 || {} },
          { type: 'set', label: 'Gen 1 (survived one collection)', items: g1, hl: h1 || {} },
          { type: 'set', label: 'Gen 2 (long-lived)', items: g2, hl: h2 || {} }
        ] };
      }
      return [
        f('The app starts. A static cache object <b>Cache</b> was created early and already lives in Gen 2.', [], [], ['Cache'], {}, {}, {}, ['static Cache']),
        f('A request creates 4 objects: a DTO, a string, a list and an order. All new objects go to <b>Gen 0</b>.', ['dto', 'text', 'list', 'order'], [], ['Cache'], { dto: 'ok', text: 'ok', list: 'ok', order: 'ok' }, {}, {}, ['static Cache', 'local: order']),
        f('Gen 0 is full, so a <b>Gen 0 collection</b> runs. The GC starts from the roots and marks what it can reach. Only <b>order</b> is still referenced by a local variable.', ['dto', 'text', 'list', 'order'], [], ['Cache'], { dto: 'bad', text: 'bad', list: 'bad', order: 'cur' }, {}, {}, ['static Cache', 'local: order']),
        f('The 3 unreachable objects are freed in one cheap pass. <b>order</b> survives and is promoted to <b>Gen 1</b>.', [], ['order'], ['Cache'], {}, { order: 'ok' }, {}, ['static Cache', 'local: order']),
        f('The code now does <code>Cache.Add(order)</code>. A static object points at <b>order</b>, so it will stay reachable after the request ends.', ['tmp1', 'tmp2'], ['order'], ['Cache'], { tmp1: 'ok', tmp2: 'ok' }, { order: 'cur' }, { Cache: 'cur' }, ['static Cache → order']),
        f('The next collection frees the temporaries. <b>order</b> survives again and is promoted to <b>Gen 2</b>, where collections are rare and expensive.', [], [], ['Cache', 'order'], {}, {}, { order: 'sel' }, ['static Cache → order']),
        f('If nothing ever removes entries from the cache, every request leaves one more object in Gen 2. Memory climbs for days. This is what a <span class="c-r">managed memory leak</span> looks like.', [], [], ['Cache', 'order', 'order2', 'order3', 'order4'], {}, {}, { order2: 'bad', order3: 'bad', order4: 'bad' }, ['static Cache → every order']),
        f('The fix is not <code>GC.Collect()</code>. It is to <b>remove the reference</b>: give the cache a size limit and an expiry. Then old orders become unreachable and the next Gen 2 collection frees them.', [], [], ['Cache', 'order4'], {}, {}, { Cache: 'ok', order4: 'ok' }, ['static Cache → order4'])
      ];
    }
  },
  examples: [
    { title: 'An event that keeps a screen alive', html: `<p>A view model subscribes to a long-lived service and is never unsubscribed.</p>
      <pre><code>public class BasketViewModel
{
    public BasketViewModel(PriceFeed feed)      // feed is a singleton
    {
        feed.PriceChanged += OnPriceChanged;    // feed now references this object
    }
    private void OnPriceChanged(object? s, EventArgs e) { }
}</code></pre>
      <p>The feed's delegate list holds a reference to every view model ever created. Fix: implement <code>IDisposable</code> and do <code>feed.PriceChanged -= OnPriceChanged;</code> in <code>Dispose</code>.</p>` },
    { title: 'HttpClient: neither one per request nor one forever', html: `
      ${H.table(['Approach', 'Problem'], [
        ['<code>using var c = new HttpClient();</code> per request', '<span class="c-r">Each one opens new connections; closed sockets stay reserved for a while, so ports run out under load</span>'],
        ['One static <code>HttpClient</code> forever', '<span class="c-y">Connections are reused, but DNS changes are never noticed</span>'],
        ['<code>IHttpClientFactory</code> (<code>AddHttpClient</code>)', '<span class="c-g">Pools and recycles the handlers, and is where retry and timeout policies plug in</span>']
      ])}
      <p>This is a classic "you disposed it and that was the bug" question.</p>` },
    { title: 'Parsing a line with and without allocations', html: `<p>Input: <code>"2026-03-14,INFO,Order 42 created"</code>, 5 million lines.</p>
      ${H.table(['Approach', 'Objects created per line'], [
        ['<code>line.Split(\',\')</code> then <code>int.Parse(parts[0].Substring(0, 4))</code>', '<span class="c-r">1 array + 3 strings + 1 substring</span>'],
        ['<code>ReadOnlySpan&lt;char&gt;</code> with <code>IndexOf</code> and slices', '<span class="c-g">0</span>']
      ])}
      <p>Fewer objects means fewer Gen 0 collections. Say this only after saying you would measure first.</p>`,
      code: CS(`static int ReadYear(ReadOnlySpan<char> line)
{
    // "2026-03-14,INFO,..." -> 2026, with no new string
    ReadOnlySpan<char> year = line.Slice(0, 4);
    return int.Parse(year);
}`) }
  ],
  deepDive: `<p><b>How a collection works.</b> Mark (walk from the roots), then sweep or compact (slide survivors together so allocation stays a simple pointer bump). Gen 0 and Gen 1 are called ephemeral and are compacted. A Gen 2 collection is a full collection and includes the LOH.</p>
    <p><b>Background GC.</b> Gen 2 collections mostly run on a background thread while the app keeps going, with only short pauses. Server GC uses one heap and one GC thread per core. Since .NET 9, Server GC adapts its heap count to the load (DATAS), which lowers memory use for small containers.</p>
    <p><b>LOH and POH.</b> The Large Object Heap is not compacted by default because copying large blocks is slow, so it can fragment. The Pinned Object Heap (.NET 5+) holds buffers that must not move.</p>
    <p><b>Finalizers.</b> An object with a finalizer is put on the finalization queue when it dies, survives that collection, and is freed only after the finalizer thread has run it. So it lives at least one generation longer. <code>GC.SuppressFinalize(this)</code> in <code>Dispose</code> skips that cost.</p>
    <p><b>Structs and the stack.</b> "Value types live on the stack" is only true for locals. A struct that is a field of a class, an array element, boxed, or captured by a lambda or async method lives on the heap.</p>
    <p><b>Containers.</b> The GC reads the container memory limit. If a service is killed for memory, check the limit and <code>GCHeapHardLimit</code> settings before blaming a leak.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can read a <code>dumpheap -stat</code> listing or a <code>gcroot</code> chain and explain it in plain words, which turns a dump from expert-only into something the whole team can use.</p>
    <p><b>Use AI as a partner:</b> paste the top 20 rows of two heap snapshots and ask <code>Which types grew, and what usually holds on to them?</code> Then confirm with <code>gcroot</code> yourself.</p>
    <p><b>Where AI goes wrong:</b> it suggests <code>GC.Collect()</code> as a fix, wraps an injected <code>HttpClient</code> in <code>using</code>, writes full dispose patterns with finalizers for classes that hold nothing native, and sprinkles <code>Span&lt;T&gt;</code> into code that runs once a day.</p>
    <p><b>What you must still own:</b> the measurement, the decision about what is worth optimizing, and the ownership rule: whoever creates a disposable object disposes it.</p>`,
  problems: [P({
    t: 'Memory grows until the service restarts', l: 'Hard', tags: ['memory leak', 'GC', 'diagnosis'],
    s: 'A .NET API running in a container starts at 300 MB and reaches the 2 GB limit after about 3 days, when the platform restarts it. Traffic is steady. The interviewer says: "What are the first five things you check, and how do you find the exact cause?"',
    ex: `<p>What the counters show:</p>${H.table(['Time', 'Gen 2 size after a full GC', 'Gen 2 collections'], [['Day 1', '180 MB', '40'], ['Day 2', '820 MB', '95'], ['Day 3', '<span class="c-r">1,650 MB</span>', '160']])}<p>Gen 2 keeps growing <b>after</b> full collections, so the objects are still referenced.</p>`,
    weak: 'The garbage collector is not running often enough. I would call GC.Collect() on a timer, or give the container more memory.',
    why: 'The table shows 160 full collections already ran and memory still grew, so the GC is working. The objects are reachable, and no amount of collecting frees a reachable object. More memory only moves the restart from day 3 to day 6.',
    q: ['Gen 2 size keeps rising even after full collections. What does that prove?', ['The GC is broken', 'The objects are still reachable from a root', 'The stack is too small', 'There are too many threads'], 1, 'The GC frees only unreachable objects. Growth after a full collection means something still references them.'],
    h: ['A leak in .NET means "still referenced", not "lost". Which long-lived things can hold references: statics, singletons, events, caches, timers?', 'You need two snapshots to see what <b>grows</b>. Which tool takes a small heap snapshot, and which command shows who references an object?', 'Recipe: five quick checks from code and counters → two gcdumps a few hours apart → diff by type → gcroot on one instance → fix → load test with the same counters.'],
    a: `<p><b>First five checks</b> (10 minutes, no tools beyond logs and code search):</p>
      <ol><li>Is it managed or native? If the GC heap is flat while process memory rises, it is native.</li>
      <li>Static or singleton collections and dictionaries that only ever get <code>Add</code>.</li>
      <li>Caches without a size limit or expiry.</li>
      <li>Event subscriptions and timers that are never removed or disposed.</li>
      <li>What changed in the release where the slope began.</li></ol>
      <p><b>Find the exact cause:</b></p>
      <ol><li><code>dotnet-gcdump collect</code> now and again 3 hours later.</li>
      <li>Compare the two: sort by growth in count. Say <code>OrderAuditEntry</code> went from 40,000 to 310,000.</li>
      <li>Take a full dump and run <code>gcroot</code> on one instance. The chain reads: static <code>AuditBuffer._entries</code> → <code>List&lt;OrderAuditEntry&gt;</code>.</li>
      <li>Fix: flush and clear the buffer, or replace it with a bounded channel.</li>
      <li>Prove it: a 2-hour load test where Gen 2 size after collection stays flat.</li></ol>
      <p><b>Prevent:</b> an alert on the memory slope, and a rule that every cache has a size limit.</p>`,
    cx: '<p>Strong because it separates fast checks from proof, and ends with prevention.</p>',
    f: ['The dump shows millions of <code>string</code> objects. How do you narrow that down?', 'How do you take a dump from a container that has no tools installed?']
  })]
});

// ================= TOPIC 4: modern C# by version =================
topics.push({
  title: 'Modern C# by Version',
  analogy: `<p>A language is like a <b>phone that gets a yearly update</b>. The phone still makes calls the old way, but each update adds a shortcut: first a better keyboard, then face unlock, then a smarter camera. You do not need to recite every release note. You need to know which shortcuts you use daily, roughly when they arrived, and which update your phone (your project's .NET version) is on.</p>`,
  explain: `<p><b>The plain idea:</b> a new C# version ships every November with a new .NET version. Interviewers ask about this to check two things: do you keep up, and can you explain <i>why</i> a feature helps, not just its name.</p>
    ${H.table(['C#', '.NET', 'Headline features'], [
      ['8', '.NET Core 3.0', 'Nullable reference types, async streams, ranges, switch expressions'],
      ['9', '.NET 5', 'Records, <code>init</code>, top-level statements'],
      ['10', '.NET 6 (LTS)', 'Global usings, file-scoped namespaces, record structs'],
      ['11', '.NET 7', '<code>required</code>, raw string literals, list patterns'],
      ['12', '.NET 8 (LTS)', 'Primary constructors, collection expressions'],
      ['13', '.NET 9', '<code>params</code> collections, <code>Lock</code> type, partial properties'],
      ['14', '<span class="c-g">.NET 10 (LTS, current)</span>', 'Extension members, <code>field</code>, null-conditional assignment']
    ])}
    <p><b>LTS</b> means long-term support: 3 years of fixes. <b>STS</b> means standard-term support: 2 years. Even-numbered releases are LTS. .NET 10 came out in November 2025. .NET 8 and .NET 9 both reached the end of support in November 2026.</p>
    <p>A good answer groups features by the <b>problem they solve</b>: fewer null bugs (nullable reference types, <code>required</code>), immutable data (records, <code>init</code>), less noise (file-scoped namespaces, primary constructors, collection expressions), and speed (spans, <code>Lock</code>).</p>`,
  clues: [
    '"What is new in the latest C#?" → name 3 features of C# 14 and one you would actually use',
    '"Which .NET version are you on, and why?" → LTS vs STS, support end dates',
    '"What is a record?" → value equality, <code>with</code>, immutable by default',
    '"What do nullable reference types do?" → compile-time warnings, no run-time change',
    '"Primary constructor" → parameters on the class line, captured where used',
    '"Have you used pattern matching?" → switch expressions, property and list patterns'
  ],
  code: [CS(`// C# 10: file-scoped namespace
namespace Shop.Orders;

// C# 9: record = value equality + immutable properties + "with"
public record Money(decimal Amount, string Currency);

// C# 12: primary constructor on a class; C# 11: required members
public class OrderService(IOrderStore store)
{
    public required string Region { get; init; }

    // C# 14: "field" is the compiler-made backing field
    public string Note
    {
        get;
        set => field = value.Trim();
    }

    public async Task<string> DescribeAsync(int id)
    {
        Order? order = await store.FindAsync(id);          // C# 8: nullable reference types

        // C# 8 switch expression with C# 9 relational patterns
        return order switch
        {
            null => "not found",
            { Lines.Count: 0 } => "empty order",
            { Total.Amount: > 1000 } => "large order",
            _ => "normal order"
        };
    }
}

public static class Demo
{
    public static void Run()
    {
        int[] ids = [1, 2, 3, 4, 5];                       // C# 12 collection expression
        int last = ids[^1];                                // C# 8 index from the end
        int[] middle = ids[1..4];                          // C# 8 range: 2, 3, 4
        bool startsAndEnds = ids is [1, .., 5];            // C# 11 list pattern

        string json = """
            { "name": "Asha", "city": "Pune" }
            """;                                           // C# 11 raw string literal

        var price = new Money(10m, "EUR");
        var dearer = price with { Amount = 12m };          // copy with one change
    }
}`, 'One file, features from C# 8 to C# 14')],
  viz: rowViz('Modern C# timeline: one row per release', 'C# versions',
    ['C#', 'Year', '.NET', 'Remember it for', 'Problem it solves'],
    [
      ['6', '2015', 'Framework 4.6', 'String interpolation, ?. , nameof', 'Noise and null checks'],
      ['7', '2017', 'Framework 4.7', 'Tuples, patterns with is, out var, local functions', 'Returning several values, casting'],
      ['8', '2019', 'Core 3.0', 'Nullable reference types, async streams, ranges, switch expressions', 'Null reference errors, streaming'],
      ['9', '2020', '.NET 5', 'Records, init, top-level statements', 'Immutable data with little code'],
      ['10', '2021', '.NET 6 LTS', 'Global usings, file-scoped namespaces, record structs', 'Boilerplate'],
      ['11', '2022', '.NET 7', 'required, raw strings, list patterns, generic math', 'Half-built objects, escaped text'],
      ['12', '2023', '.NET 8 LTS', 'Primary constructors, collection expressions', 'Constructor and collection noise'],
      ['13', '2024', '.NET 9', 'params collections, Lock type, partial properties', 'Allocations, safer locking'],
      ['14', '2025', '.NET 10 LTS', 'Extension members, field keyword, null-conditional assignment', 'Extending types, property boilerplate']
    ],
    [
      'We build the timeline one release at a time. Do not memorize every feature. Learn <b>one or two per row</b> and the problem each solves.',
      '<b>C# 6</b>: small comforts. <code>$"Hello {name}"</code> and <code>customer?.Name</code> removed a lot of typing.',
      '<b>C# 7</b>: tuples such as <code>(int min, int max)</code> and the first pattern matching: <code>if (x is int n)</code>.',
      '<b>C# 8</b>: the big one for safety. With nullable reference types on, <code>string</code> means "never null" and <code>string?</code> means "may be null".',
      '<b>C# 9</b>: records. One line gives a type with value equality and <code>with</code> copies. <code>init</code> makes a property settable only at creation.',
      '<b>C# 10</b>: less ceremony. <code>namespace Shop;</code> saves one level of indentation in every file.',
      '<b>C# 11</b>: <code>required</code> makes the compiler insist that a property is set, and raw strings hold JSON without escaping.',
      '<b>C# 12</b>: <code>class OrderService(IOrderStore store)</code> and <code>int[] a = [1, 2, 3]</code>.',
      '<b>C# 13</b>: a real <code>System.Threading.Lock</code> type, and <code>params</code> that accepts spans and lists.',
      '<b>C# 14</b>: extension <i>properties</i> through <code>extension</code> blocks, and <code>field</code> inside a property accessor.'
    ],
    'The rows to know cold in 2026 are highlighted: <b>C# 8</b> (nullable), <b>C# 9</b> (records), <b>C# 12</b> (primary constructors) and <b>C# 14</b> on <b>.NET 10</b>, the current LTS.',
    [2, 3, 6, 8]),
  examples: [
    { title: 'Class vs record for a DTO', html: `<p>The same data type written both ways.</p>
      ${H.table(['', 'Class (C# 6 style)', 'Record (C# 9+)'], [
        ['Lines of code', 'about 25 with Equals, GetHashCode, ToString', '<span class="c-g">1</span>'],
        ['<code>a == b</code> with the same values', '<span class="c-r">false (compares references)</span>', '<span class="c-g">true (compares values)</span>'],
        ['Change one value', 'Mutate, or copy by hand', '<code>a with { Total = 5 }</code>']
      ])}
      <p>Use a record for data that is passed around: DTOs, messages, value objects. Keep a class for things with identity and behaviour, such as an EF Core entity.</p>` },
    { title: 'Nullable reference types catch a bug at build time', html: `<pre><code>#nullable enable
Customer? c = repo.Find(id);     // may be null
Console.WriteLine(c.Name);       // warning CS8602: possible null dereference
Console.WriteLine(c?.Name ?? "unknown");   // fine</code></pre>
      <p>Nothing changes at run time. The compiler tracks whether each reference can be null and warns. A good team setting: nullable enabled in every project, and these warnings treated as errors for new code.</p>` },
    { title: 'Language version is not the same as runtime version', html: `<p>A common trap question: "Can I use C# 12 on .NET Framework 4.8?"</p>
      <ul><li>Features that are pure compiler work (pattern matching, file-scoped namespaces) can be made to compile by setting <code>LangVersion</code>.</li>
      <li>Features that need runtime or library support (default interface methods, static abstract members, <code>Span</code> speed-ups) do not work there.</li>
      <li>Only the default language version for each target framework is supported by Microsoft: C# 7.3 for .NET Framework, C# 14 for .NET 10.</li></ul>
      <p>The safe interview line: "I keep the default language version for the target framework."</p>` }
  ],
  deepDive: `<p><b>Primary constructors are not records.</b> On a class, the parameters are captured as hidden fields only if a member uses them. They are mutable and are not public properties. If you need a read-only field, assign it: <code>private readonly IOrderStore _store = store;</code>.</p>
    <p><b>Records in detail.</b> A <code>record class</code> is a reference type with generated <code>Equals</code>, <code>GetHashCode</code>, <code>ToString</code>, deconstruction and a copy constructor used by <code>with</code>. The copy is shallow. A <code>record struct</code> is mutable unless you write <code>readonly record struct</code>.</p>
    <p><b>Collection expressions</b> let the compiler choose the cheapest way to build the target type. <code>ReadOnlySpan&lt;int&gt; s = [1, 2, 3];</code> can be stored with no heap allocation.</p>
    <p><b>Support dates matter to a lead.</b> An out-of-support runtime gets no security fixes. Upgrades between recent versions are usually a target framework change, a package update and a test run, so the real cost is test coverage and deployment, not code. A common policy is to move from LTS to LTS within about 6 months of release.</p>
    <p><b>Adopting nullable in an old code base:</b> turn it on project by project, or file by file with <code>#nullable enable</code>, starting with the lowest layers, and fix warnings without scattering the <code>!</code> operator everywhere.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants were trained mostly on older code, so they often write C# 7 style: manual null checks, classes with hand-written equality, <code>new List&lt;int&gt; { 1, 2 }</code>. They may also not know the newest features at all.</p>
    <p><b>Use AI as a partner:</b> state the version in the prompt. <code>Target .NET 10 and C# 14. Nullable is enabled. Use records for DTOs and file-scoped namespaces.</code> Put the same rules in the repository's assistant instructions file so every teammate gets consistent output.</p>
    <p><b>Where AI goes wrong:</b> it invents syntax for features it has only seen in previews, mixes preview syntax with the final one, and silences nullable warnings with <code>!</code>.</p>
    <p><b>What you must still own:</b> checking the official "What's new" page before quoting a feature in an interview, and deciding which features your team adopts as standard.</p>`
});

// ================= TOPIC 5: SOLID and clean code =================
topics.push({
  title: 'SOLID and Clean Code in C#',
  analogy: `<p>Think of the <b>wall socket</b> in your home. The lamp does not care whether power comes from coal, wind or a battery. It only knows the shape of the socket. You can change the power station without touching the lamp, and you can test the lamp with a small battery pack. The socket is an <b>interface</b>. SOLID is a set of 5 habits that give your code sockets in the right places: small parts with one job each, plugged together through simple, stable shapes.</p>`,
  explain: `<p><b>The plain idea:</b> software changes all the time. SOLID keeps a change <b>small and local</b>: one new requirement should mean editing one class, or better, adding one.</p>
    ${H.table(['Letter', 'Say it simply', 'Smell that it is broken'], [
      ['<b>S</b>ingle Responsibility', 'One class, one reason to change', 'A 900-line "Manager" class'],
      ['<b>O</b>pen/Closed', 'Add new behaviour without editing old code', 'The same <code>switch</code> edited for every feature'],
      ['<b>L</b>iskov Substitution', 'A child class must not surprise users of the parent', 'An override that throws "not supported"'],
      ['<b>I</b>nterface Segregation', 'Many small interfaces beat one large one', 'Implementations with empty methods'],
      ['<b>D</b>ependency Inversion', 'Depend on a contract, not a concrete class', '<code>new SqlConnection()</code> inside business logic']
    ])}
    <p>Its smaller cousins: <b>DRY</b> (one place for each rule), <b>KISS</b> (simplest thing that works), <b>YAGNI</b> (do not build it until it is needed), the <b>Law of Demeter</b> (do not reach through objects), <b>tell, don't ask</b>, and <b>composition over inheritance</b>.</p>
    <p>At lead level the interviewer wants <b>judgement</b>: when an interface earns its place, and when it is ceremony.</p>`,
  clues: [
    '"Explain SOLID with examples" → one sentence and one tiny example per letter',
    '"How would you add a new payment type without touching existing code?" → Open/Closed, strategy pattern',
    '"How do you unit test this class?" → Dependency Inversion, inject the dependency',
    '"Square and rectangle" or "the penguin cannot fly" → Liskov',
    '"This interface has 30 methods" → Interface Segregation',
    '"Is SOLID always good?" → trade-offs, over-engineering, YAGNI',
    '"What is the difference between DI and DIP?" → technique vs principle'
  ],
  code: [CS(`// D: the high-level service depends on small contracts.
public interface IOrderStore { Task SaveAsync(Order order, CancellationToken ct); }
public interface INotifier   { Task SendAsync(string to, string text, CancellationToken ct); }

// O: a new discount is a new class. PriceCalculator never changes.
public interface IDiscount { decimal Apply(decimal amount); }
public sealed class SeasonalDiscount : IDiscount { public decimal Apply(decimal a) => a * 0.90m; }
public sealed class LoyaltyDiscount  : IDiscount { public decimal Apply(decimal a) => a * 0.95m; }

public sealed class PriceCalculator(IEnumerable<IDiscount> discounts)
{
    public decimal FinalPrice(decimal amount) =>
        discounts.Aggregate(amount, (current, d) => d.Apply(current));
}

// S: validation, storage and notification are three separate jobs.
public sealed class OrderValidator
{
    public bool IsValid(Order o) => o.Lines.Count > 0 && o.Total > 0;
}

public sealed class CheckoutService(OrderValidator validator, IOrderStore store, INotifier notifier)
{
    public async Task PlaceAsync(Order order, CancellationToken ct)
    {
        if (!validator.IsValid(order)) throw new ArgumentException("Invalid order");
        await store.SaveAsync(order, ct);
        await notifier.SendAsync(order.Email, "Thanks for your order", ct);
    }
}

// Registration: the only place that knows the concrete classes.
// builder.Services.AddScoped<IOrderStore, SqlOrderStore>();
// builder.Services.AddScoped<INotifier, EmailNotifier>();
// builder.Services.AddSingleton<IDiscount, SeasonalDiscount>();`, 'S, O and D in one small checkout')],
  viz: {
    title: 'Refactoring towards dependency inversion',
    gen: function () {
      function g(narr, nodes, edges, hl, ehl, tags) {
        return { narr: narr, parts: [{ type: 'graph', directed: true, height: 60, label: 'Who depends on whom (arrow = "knows about")', nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }] };
      }
      var svc = { id: 'S', label: 'CheckoutService', x: 18, y: 30, shape: 'box' };
      var sql = { id: 'Q', label: 'SqlOrderStore', x: 82, y: 14, shape: 'box' };
      var smtp = { id: 'M', label: 'SmtpNotifier', x: 82, y: 46, shape: 'box' };
      var ist = { id: 'IS', label: 'IOrderStore', x: 50, y: 14, shape: 'box' };
      var ino = { id: 'IN', label: 'INotifier', x: 50, y: 46, shape: 'box' };
      var fake = { id: 'F', label: 'FakeOrderStore (test)', x: 82, y: 30, shape: 'box' };
      var blob = { id: 'B', label: 'CosmosOrderStore', x: 82, y: 2, shape: 'box' };
      return [
        g('Start: <code>CheckoutService</code> does <code>new SqlOrderStore()</code> and <code>new SmtpNotifier()</code> inside its methods. It <b>knows the concrete classes</b>.', [svc, sql, smtp], [['S', 'Q', 'new'], ['S', 'M', 'new']], { S: 'cur' }, { 'S-Q': 'bad', 'S-M': 'bad' }),
        g('Problem 1: a unit test of the checkout rules needs a real database and a real mail server. Slow and fragile.', [svc, sql, smtp], [['S', 'Q', 'new'], ['S', 'M', 'new']], { Q: 'bad', M: 'bad' }, { 'S-Q': 'bad', 'S-M': 'bad' }, { Q: 'needs SQL Server', M: 'needs SMTP' }),
        g('Step 1: write down what the service actually <b>needs</b> as two small interfaces. These are the "sockets".', [svc, ist, ino, sql, smtp], [['S', 'Q', 'new'], ['S', 'M', 'new']], { IS: 'ok', IN: 'ok' }, {}),
        g('Step 2: the service takes the interfaces through its <b>constructor</b>. It no longer says <code>new</code>.', [svc, ist, ino, sql, smtp], [['S', 'IS', 'uses'], ['S', 'IN', 'uses']], { S: 'ok' }, { 'S-IS': 'ok', 'S-IN': 'ok' }),
        g('Step 3: the concrete classes <b>implement</b> the interfaces. Look at the arrows: the detail now points <b>towards</b> the abstraction. That is the "inversion".', [svc, ist, ino, sql, smtp], [['S', 'IS', 'uses'], ['S', 'IN', 'uses'], ['Q', 'IS', 'implements'], ['M', 'IN', 'implements']], {}, { 'Q-IS': 'sel', 'M-IN': 'sel' }),
        g('Pay-off 1: a test plugs in a fake store that keeps orders in a list. The checkout rules are tested in milliseconds.', [svc, ist, ino, sql, smtp, fake], [['S', 'IS', 'uses'], ['S', 'IN', 'uses'], ['Q', 'IS', 'implements'], ['M', 'IN', 'implements'], ['F', 'IS', 'implements']], { F: 'ok' }, { 'F-IS': 'ok' }),
        g('Pay-off 2: moving to another database is a <b>new class</b> and one line of registration. <code>CheckoutService</code> is not edited. Open/Closed comes for free.', [svc, ist, ino, sql, smtp, fake, blob], [['S', 'IS', 'uses'], ['S', 'IN', 'uses'], ['Q', 'IS', 'implements'], ['M', 'IN', 'implements'], ['F', 'IS', 'implements'], ['B', 'IS', 'implements']], { B: 'ok', S: 'done' }, { 'B-IS': 'ok' }),
        g('The judgement call: these two interfaces sit on a <b>real boundary</b> (database, email). An interface for a pure helper with one implementation and no test fake would only add files.', [svc, ist, ino, sql, smtp], [['S', 'IS', 'uses'], ['S', 'IN', 'uses'], ['Q', 'IS', 'implements'], ['M', 'IN', 'implements']], { IS: 'sel', IN: 'sel' }, {})
      ];
    }
  },
  examples: [
    { title: 'Liskov: the square that breaks the rectangle', html: `<pre><code>class Rectangle { public virtual int Width { get; set; } public virtual int Height { get; set; } }
class Square : Rectangle
{
    public override int Width  { set { base.Width = base.Height = value; } }
    public override int Height { set { base.Width = base.Height = value; } }
}

void Resize(Rectangle r) { r.Width = 5; r.Height = 4; }   // expects area 20</code></pre>
      ${H.table(['Object passed in', 'Area after Resize', 'Caller expectation met?'], [['Rectangle', '20', '<span class="c-g">yes</span>'], ['Square', '<span class="c-r">16</span>', '<span class="c-r">no</span>']])}
      <p>A square "is a" rectangle in maths, but not in behaviour. Fix: make both immutable shapes that implement <code>IShape</code> with an <code>Area</code>, with no inheritance between them.</p>` },
    { title: 'Open/Closed: replacing a growing switch', html: `<p>Before: every new shipping method edits the same method.</p>
      <pre><code>decimal Cost(string method, decimal weight) =&gt; method switch
{
    "standard" =&gt; 4m,
    "express"  =&gt; 9m + weight,
    "drone"    =&gt; 15m,                 // added last month
    _ =&gt; throw new ArgumentException(method)
};</code></pre>
      <p>After: an <code>IShippingMethod</code> with <code>Name</code> and <code>Cost(weight)</code>, one class per method, all registered in DI and looked up by name. A new method is a new class and a new test.</p>
      <p>Judgement: with 3 cases that rarely change, the <code>switch</code> is clearer. Refactor when the list keeps growing or the logic per case gets large.</p>` },
    { title: 'DRY gone wrong', html: `<p>Two validation methods look the same today:</p>
      ${H.table(['Method', 'Rule today', 'Rule next year'], [['ValidateCustomerName', '2 to 50 letters', '2 to 50 letters'], ['ValidateProductName', '2 to 50 letters', '<span class="c-y">1 to 120 characters, digits allowed</span>']])}
      <p>If you merged them into one <code>ValidateName</code>, next year you add a flag parameter, then another. They looked alike but were <b>different knowledge</b>. DRY means one place for one business rule, not one place for similar-looking lines.</p>` }
  ],
  deepDive: `<p><b>"One reason to change" means one stakeholder.</b> A class that formats an invoice for finance and also calculates tax for legal has two groups who can ask for changes. That is the practical test for Single Responsibility, more useful than counting methods.</p>
    <p><b>Liskov is about contracts.</b> A subtype may not demand more from the caller (stronger preconditions), promise less (weaker postconditions), or break the parent's invariants. <code>ReadOnlyCollection&lt;T&gt;</code> implementing <code>IList&lt;T&gt;</code> and throwing on <code>Add</code> is a real example in .NET; <code>IReadOnlyList&lt;T&gt;</code> exists to repair it.</p>
    <p><b>Dependency inversion at architecture scale.</b> In clean (or onion) architecture the domain project defines <code>IOrderStore</code> and the infrastructure project implements it. Project references point inward, so the domain compiles without EF Core.</p>
    <p><b>Costs.</b> Each interface is one more hop when reading code, and interface calls are slightly harder for the JIT to inline. Too many layers make a small change touch many files, which is the very thing SOLID was meant to prevent.</p>
    <p><b>Time is a dependency.</b> Inject <code>TimeProvider</code> (.NET 8+) in place of <code>DateTime.UtcNow</code>, so tests can control the clock.</p>
    <p><b>Composition over inheritance.</b> Inheritance fixes the relationship at compile time and exposes the parent's internals. Holding a collaborator through an interface can be swapped, tested and combined.</p>`,
  aiEra: `<p><b>What AI changes:</b> code is now cheap to produce, so the limit is how fast humans can <b>read and review</b> it. Small classes with one job and clear contracts are easier for a person to review and easier for an assistant to change safely, because less context is needed.</p>
    <p><b>Use AI as a partner:</b> <code>List the responsibilities of this class as bullet points. Do not refactor yet.</code> If the list has 5 unrelated items, you have your Single Responsibility discussion ready.</p>
    <p><b>Where AI goes wrong:</b> it over-applies patterns. Ask for a simple feature and you may get an interface, a factory, an abstract base class and a strategy for one behaviour. It also creates "god" services when asked to "just add" things to an existing class, one small prompt at a time.</p>
    <p><b>What you must still own:</b> where the boundaries are, which abstractions the team can afford, and saying "this is too much" in review.</p>`
});

// ================= TOPIC 6: reflection, serialization, architect-level C# =================
topics.push({
  title: 'Reflection, Serialization and Architect-Level C#',
  analogy: `<p>Imagine a <b>warehouse</b>. Every box has a <b>sticker</b>: "fragile", "keep cold". The stickers do nothing by themselves; a worker must walk round and <b>read</b> them. Stickers are <b>attributes</b>, and walking round reading them while the warehouse is open is <b>reflection</b>. It works, but it is slow. A smarter warehouse prints a <b>packing list</b> from the stickers the night before, so in the morning nobody walks anywhere. That is a <b>source generator</b>: the same information, prepared at build time. And at the front desk, every problem is written on <b>one standard form</b> for the customer. That form is <b>Problem Details</b>.</p>`,
  explain: `<p><b>The plain idea:</b> this group of questions is about how frameworks do their "magic", and about the design choices a lead makes around it.</p>
    <ul>
      <li><b>Attribute</b>: extra information attached to code, such as <code>[Required]</code> or <code>[HttpGet]</code>.</li>
      <li><b>Reflection</b>: reading types, members and attributes at run time. Flexible, slower, and unfriendly to trimming and Native AOT.</li>
      <li><b>Serialization</b>: turning an object into JSON and back. <code>System.Text.Json</code> is the built-in library.</li>
      <li><b>Source generator</b>: compiler plug-in that writes code during the build. <b>Analyzer</b>: compiler plug-in that reports problems during the build.</li>
      <li><b>Result pattern</b>: return success or failure as a value for outcomes you expect.</li>
      <li><b>Problem Details</b>: the standard JSON shape for HTTP errors (RFC 9457).</li>
      <li><b>DDD tactical patterns</b>: value objects and aggregates that protect their own rules.</li>
    </ul>
    ${H.table(['Do it at run time', 'Do it at build time'], [
      ['Reflection over properties', '<span class="c-g">Source-generated JSON context</span>'],
      ['<code>logger.LogInformation("Order {Id}", id)</code>', '<span class="c-g"><code>[LoggerMessage]</code> partial method</span>'],
      ['<code>new Regex(pattern)</code>', '<span class="c-g"><code>[GeneratedRegex]</code></span>'],
      ['Review comment: "do not use .Result"', '<span class="c-g">Analyzer rule set to error</span>']
    ])}`,
  clues: [
    '"How does [Authorize] or [Required] actually work?" → attribute + something that reads it by reflection',
    '"Why is reflection slow?" or "what is Native AOT?" → run-time lookup vs build-time code',
    '"System.Text.Json vs Newtonsoft" → built in and fast vs flexible; source generation',
    '"Exceptions or return codes?" → exceptions for the unexpected, Result for expected outcomes',
    '"How do you return errors from an API consistently?" → Problem Details, one global handler',
    '"How do you design a library other teams use?" → small surface, versioning, <code>[Obsolete]</code>',
    '"What do you look for in a code review?" → an ordered checklist, tools for the rest'
  ],
  code: [CS(`// Expected failure as a value, not an exception.
public readonly record struct Result<T>(bool IsSuccess, T? Value, string? Error, int Status)
{
    public static Result<T> Ok(T value) => new(true, value, null, 200);
    public static Result<T> Fail(string error, int status) => new(false, default, error, status);
}

public sealed class OrderService(IOrderStore store)
{
    public async Task<Result<OrderDto>> SubmitAsync(int id, CancellationToken ct)
    {
        Order? order = await store.FindAsync(id, ct);
        if (order is null) return Result<OrderDto>.Fail("Order not found", 404);
        if (order.Lines.Count == 0) return Result<OrderDto>.Fail("An empty order cannot be submitted", 409);

        order.Submit();                                    // the aggregate guards its own rules
        await store.SaveAsync(order, ct);
        return Result<OrderDto>.Ok(new OrderDto(order.Id, order.Total));
    }
}

// The endpoint maps the result to HTTP in one obvious place.
app.MapPost("/orders/{id}/submit", async (int id, OrderService svc, CancellationToken ct) =>
{
    var result = await svc.SubmitAsync(id, ct);
    return result.IsSuccess
        ? Results.Ok(result.Value)
        : Results.Problem(detail: result.Error, statusCode: result.Status);   // Problem Details JSON
});

// Anything unexpected becomes a 500 Problem Details, with no stack trace sent to the client.
builder.Services.AddProblemDetails();
app.UseExceptionHandler();`, 'Result pattern mapped to Problem Details')],
  viz: {
    title: 'One request, two kinds of failure',
    gen: function () {
      var N = [
        { id: 'C', label: 'Client', x: 8, y: 30, shape: 'box' },
        { id: 'E', label: 'Endpoint', x: 32, y: 30, shape: 'box' },
        { id: 'S', label: 'OrderService', x: 58, y: 30, shape: 'box' },
        { id: 'D', label: 'Database', x: 88, y: 30, shape: 'box' },
        { id: 'H', label: 'Global exception handler', x: 32, y: 6, shape: 'box', w: 30 }
      ];
      function g(narr, edges, hl, ehl, tags, text) {
        var parts = [{ type: 'graph', directed: true, height: 60, label: 'POST /orders/42/submit', nodes: N, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }];
        if (text) parts.push({ type: 'text', label: 'Response body', html: text });
        return { narr: narr, parts: parts };
      }
      return [
        g('The client asks to submit order 42. The endpoint calls the service.', [['C', 'E', 'POST'], ['E', 'S', 'SubmitAsync']], { E: 'cur' }, { 'C-E': 'ok', 'E-S': 'ok' }),
        g('The service loads the order. It exists, but it has <b>no lines</b>. This is an <b>expected</b> business outcome, not a bug.', [['C', 'E', 'POST'], ['E', 'S', 'SubmitAsync'], ['S', 'D', 'FindAsync']], { S: 'cur' }, { 'S-D': 'ok' }, { S: 'order.Lines.Count == 0' }),
        g('So the service <b>returns</b> <code>Result.Fail("An empty order cannot be submitted", 409)</code>. No exception is thrown, no stack is unwound.', [['S', 'E', 'Result.Fail(409)']], { S: 'sel' }, { 'S-E': 'sel' }),
        g('The endpoint turns the failed result into a standard <b>Problem Details</b> response.', [['S', 'E', 'Result.Fail(409)'], ['E', 'C', '409']], { E: 'cur' }, { 'E-C': 'sel' }, {}, '<code>{ "type": "https://tools.ietf.org/html/rfc9110#section-15.5.10", "title": "Conflict", "status": 409, "detail": "An empty order cannot be submitted" }</code>'),
        g('Second request. This time the database is unreachable. That is <b>unexpected</b>, so the driver throws an exception.', [['C', 'E', 'POST'], ['E', 'S', 'SubmitAsync'], ['S', 'D', 'FindAsync']], { D: 'bad' }, { 'S-D': 'bad' }, { D: 'timeout' }),
        g('Nobody in the service or endpoint catches it, on purpose. It travels up to the <b>one global handler</b>, which logs it with a trace id.', [['S', 'D', 'FindAsync'], ['S', 'H', 'exception']], { H: 'cur', D: 'bad' }, { 'S-H': 'bad' }, { H: 'logs full details' }),
        g('The handler answers with a 500 in the <b>same Problem Details shape</b>. The client gets a trace id, never a stack trace.', [['H', 'C', '500']], { H: 'cur' }, { 'H-C': 'bad' }, {}, '<code>{ "title": "An error occurred while processing your request.", "status": 500, "traceId": "00-4bf9...-01" }</code>'),
        g('Summary: <span class="c-p">expected outcome → Result → 4xx</span>, <span class="c-r">unexpected failure → exception → one handler → 500</span>. The client parses one error format for both.', [['C', 'E', 'POST'], ['E', 'S', ''], ['S', 'D', ''], ['S', 'H', 'exception'], ['H', 'C', '500'], ['E', 'C', '4xx']], { E: 'sel', H: 'bad' }, { 'E-C': 'sel', 'H-C': 'bad' })
      ];
    }
  },
  examples: [
    { title: 'A custom attribute read by reflection, then cached', html: `<p>Goal: mask properties marked <code>[Mask]</code> when writing an object to the log.</p>
      ${H.table(['Version', 'Cost per log call'], [
        ['Call <code>GetProperties()</code> and <code>GetCustomAttribute</code> every time', '<span class="c-r">Reflection on every call</span>'],
        ['Look up once per type and keep the list in a static <code>ConcurrentDictionary&lt;Type, PropertyInfo[]&gt;</code>', '<span class="c-y">One dictionary read, then <code>GetValue</code></span>'],
        ['A source generator that writes a <code>ToLogString()</code> method', '<span class="c-g">Plain property reads, works with Native AOT</span>']
      ])}
      <p>The interview point: reflection is fine at start-up or when cached. It is a problem inside a loop.</p>` },
    { title: 'System.Text.Json: the three surprises', html: `
      ${H.table(['Surprise', 'Why', 'Fix'], [
        ['Properties come back null or 0', 'JSON says <code>"total"</code>, C# says <code>Total</code>, and plain defaults are case-sensitive', 'Use <code>JsonSerializerDefaults.Web</code> or <code>PropertyNameCaseInsensitive</code>'],
        ['Enums appear as numbers', 'Default enum format is the number', 'Add <code>JsonStringEnumConverter</code>'],
        ['A derived type loses its extra properties', 'The serializer uses the declared base type', '<code>[JsonDerivedType(typeof(CardPayment), "card")]</code> on the base']
      ])}
      <p>ASP.NET Core already applies the web defaults for request and response bodies. The surprises usually appear when you call <code>JsonSerializer</code> yourself.</p>` },
    { title: 'A value object that makes a bad state impossible', html: `<p>Without it, every method that takes an email <code>string</code> must validate again, and some forget.</p>`,
      code: CS(`public readonly record struct EmailAddress
{
    public string Value { get; }

    public EmailAddress(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.Contains('@'))
            throw new ArgumentException("Not a valid email address", nameof(value));
        Value = value.Trim().ToLowerInvariant();     // one canonical form
    }

    public override string ToString() => Value;
}

// From here on, a method that takes EmailAddress cannot receive garbage.
// One caveat for a struct: default(EmailAddress) skips the constructor,
// so its Value is null. Use a record class if that must be impossible.`) }
  ],
  deepDive: `<p><b>Reflection costs.</b> A reflective call does a lookup, checks access and boxes arguments. Recent .NET versions made <code>MethodInfo.Invoke</code> much faster, but a direct or delegate call is still far cheaper. Cached compiled delegates (<code>CreateDelegate</code>, expression trees) are the classic middle ground, and they do not work under Native AOT because they generate code at run time.</p>
    <p><b>Incremental generators.</b> Modern generators implement <code>IIncrementalGenerator</code>. They describe a pipeline over the syntax tree and the compiler caches each step, so typing in the editor does not re-run everything. Generated files can be inspected under Dependencies → Analyzers, or written to disk with <code>EmitCompilerGeneratedFiles</code>.</p>
    <p><b>Serialization security.</b> The dangerous feature is letting the payload name the .NET type to create (Newtonsoft's <code>TypeNameHandling</code>, the old <code>BinaryFormatter</code>, which has been removed from .NET). System.Text.Json only allows the derived types you list.</p>
    <p><b>Result pattern trade-offs.</b> Results make control flow explicit but every caller must check them, and it is easy to ignore one. Many teams use results in the application layer and exceptions inside the domain model for broken invariants. Do not wrap every exception into a result; you lose the stack trace.</p>
    <p><b>Aggregates and EF Core.</b> EF Core can map private fields and backing collections, and value objects through complex types or owned types, so a rich model does not need public setters.</p>
    <p><b>Public API compatibility.</b> Source, binary and behavioural compatibility are three different things. Package validation and an API baseline file catch the first two in the build.</p>`,
  aiEra: `<p><b>What AI changes:</b> a lead now reviews much more code that no human typed. The checklist stays the same, but the review must also ask "does the author understand this?" and "is there a test that would fail if it were wrong?".</p>
    <p><b>Use AI as a partner:</b> give it your checklist. <code>Review this diff for: blocking on tasks, missing CancellationToken, undisposed IDisposable, EF entities returned from endpoints. Quote the line for each finding.</code> Use the output as a first pass, never as the approval.</p>
    <p><b>Where AI goes wrong:</b> it suggests Newtonsoft features that System.Text.Json does not have, catches <code>Exception</code> and returns a fake success, adds reflection-based mapping to an AOT project, and sends exception messages to the client.</p>
    <p><b>What you must still own:</b> the public contract of your API and libraries, the error format, and the rules encoded as analyzers. Those are decisions about people and time, not syntax.</p>`
});

// ================= PRACTICE: 3 Easy, 5 Medium, 4 Hard =================
practice.push(P({
  t: 'Explain async/await in one minute', l: 'Easy', tags: ['async', 'communication'],
  s: 'The interviewer says: "Pretend I have only ever written synchronous code. Explain async and await to me, and tell me why a web API should use them." You have about one minute.',
  ex: `<p>A good answer has three parts:</p>${H.table(['Part', 'Example'], [['<span class="c-g">Analogy</span>', 'A waiter who does not stand at the kitchen door'], ['<span class="c-b">What the keywords do</span>', 'await pauses the method and frees the thread'], ['<span class="c-p">Why it matters</span>', 'More requests on the same number of threads']])}`,
  weak: 'Async makes the code run in the background on another thread so it is faster.',
  why: 'Two errors in one sentence. Awaiting I/O does not use another thread, and a single request is not faster. The interviewer now doubts everything that follows.',
  q: ['What does async/await improve in a web API?', ['The speed of each database query', 'How many requests the same threads can serve', 'The amount of memory per object', 'The compile time'], 1, 'The query takes just as long. The thread is free during the wait, so the server handles more requests at once.'],
  h: ['Start with a picture from daily life where someone waits without standing still.', 'Say what happens to the thread at an await, in one sentence, without the words "state machine".', 'Recipe: analogy → await frees the thread and continues later → benefit is scale, not speed → one caution: it does not help CPU-heavy work.'],
  a: `<p><b>Model answer:</b> "Think of a waiter. A synchronous waiter takes an order to the kitchen and stands there until the food is ready, so he serves one table at a time. An asynchronous waiter hands the order in and serves other tables until the kitchen calls.</p>
    <p>In code, the thread is the waiter. When I write <code>await db.SaveChangesAsync()</code>, the method pauses at that line and the thread goes back to the pool. When the database answers, a thread picks the method up from the same line.</p>
    <p>A web API spends most of its time waiting on databases and other services. With async, a few dozen threads can serve thousands of waiting requests. It does not make one request faster, and it does not help work that is pure calculation; for that I would use parallelism or a background worker."</p>
    <p><b>Why it works:</b> a picture first, one correct technical sentence, the real benefit, and one limit, which shows judgement.</p>`,
  cx: '<p>About 110 words. Beginner-friendly but technically exact.</p>',
  f: ['Now explain what the compiler generates.', 'What goes wrong if one method in the chain is not async?']
}));

practice.push(P({
  t: 'The file that stays locked', l: 'Easy', tags: ['IDisposable', 'using'],
  s: 'An import job reads a CSV file and then tries to move it to an "archive" folder. The move fails now and then with "The process cannot access the file because it is being used by another process". Nothing else touches the file. What is wrong, and how do you fix it?',
  ex: `<pre><code>var reader = new StreamReader(path);
var text = reader.ReadToEnd();
File.Move(path, archivePath);     // sometimes throws IOException</code></pre><p>The "other process" is <span class="c-r">this process</span>.</p>`,
  weak: 'I would add a retry loop with a 2-second sleep around File.Move.',
  why: 'The retry sometimes works only because the garbage collector happened to finalize the reader in the meantime. The cause, an open file handle, is still there, and the job is now slow and still unreliable.',
  q: ['Why does the failure happen only sometimes?', ['The disk is slow', 'The handle is released whenever the GC finalizes the reader, which is unpredictable', 'CSV files are locked by Windows', 'File.Move is asynchronous'], 1, 'Without Dispose, the handle is freed by the finalizer at some unknown later time. If that happens before the move, it works.'],
  h: ['Who opened the file, and who closed it?', 'Which keyword guarantees cleanup at the end of a block, even when an exception is thrown?', 'Recipe: put the reader in a using block that ends before the move, or use File.ReadAllText, which opens and closes for you.'],
  a: `<p><b>Cause:</b> the <code>StreamReader</code> holds an open file handle and is never disposed. The handle is released only when the garbage collector finalizes the object, at an unpredictable time. That is why the error comes and goes.</p>
    <p><b>Fix:</b> dispose the reader before moving the file.</p>
    <pre><code>string text;
using (var reader = new StreamReader(path))
{
    text = reader.ReadToEnd();
}                                  // handle released here
File.Move(path, archivePath);</code></pre>
    <p>For a small file, <code>File.ReadAllText(path)</code> does the same in one line. For a large file, read it as a stream with <code>await using</code> and async reads.</p>
    <p><b>As a lead:</b> turn on analyzer rule CA2000 (dispose objects before losing scope) so the build flags this pattern.</p>`,
  cx: '<p>Names the owner of the resource and makes the cleanup deterministic.</p>',
  f: ['Why did the scope of the using block matter here?', 'Would <code>using var</code> at the top of the method have fixed it?']
}));

practice.push(P({
  t: 'Which SOLID principle is broken?', l: 'Easy', tags: ['SOLID', 'code review'],
  s: 'You are shown a class in a payroll app and asked: "Which SOLID principles does this break, and what is the smallest useful change?"',
  ex: `<pre><code>public class PayrollManager
{
    public void RunPayroll(Employee e)
    {
        decimal pay = e.Type == "Contractor" ? e.Hours * e.Rate
                    : e.Type == "Intern"     ? 1000m
                    : e.Salary / 12;
        var conn = new SqlConnection("Server=prod;...");
        // ... insert a row ...
        new SmtpClient("mail").Send("hr@example.com", e.Email, "Payslip", pay.ToString());
    }
}</code></pre>`,
  weak: 'It breaks all five SOLID principles, so I would rewrite it with a factory, a strategy, a repository, a unit of work and a mediator.',
  why: 'It lists patterns without tying any of them to a problem in this code, and proposes a rewrite five times the size. A lead is expected to pick the changes that pay for themselves.',
  q: ['Which principle does <code>new SqlConnection(...)</code> inside the business method break most directly?', ['Liskov Substitution', 'Interface Segregation', 'Dependency Inversion', 'Open/Closed'], 2, 'The high-level payroll logic depends on a concrete database class, so it cannot be tested or changed independently.'],
  h: ['Count the reasons this class could change: pay rules, database, email. How many is that?', 'What has to be edited when a fourth employee type is added?', 'Recipe: name 3 principles with the line that breaks each → propose 2 small steps (inject store and notifier; move pay rules behind an interface) → say what you would leave alone.'],
  a: `<p><b>What is broken, with evidence:</b></p>
    <ul><li><b>Single Responsibility</b>: one method calculates pay, writes to SQL and sends email. Three reasons to change.</li>
    <li><b>Open/Closed</b>: a new employee type means editing the pay expression, which is the riskiest line.</li>
    <li><b>Dependency Inversion</b>: <code>new SqlConnection</code> and <code>new SmtpClient</code> inside the logic. No unit test without a database and a mail server.</li></ul>
    <p><b>Smallest useful change, in 2 steps:</b></p>
    <ol><li>Inject <code>IPayrollStore</code> and <code>IPayslipSender</code> through the constructor. Now the calculation can be tested with fakes.</li>
    <li>Move the pay rules to an <code>IPayRule</code> per employee type, chosen by type. A new type is a new class with its own tests.</li></ol>
    <p><b>What I would not add yet:</b> no mediator, no unit of work. Also, the connection string in code is a security problem and goes to configuration.</p>`,
  cx: '<p>Evidence per principle, then a small plan, then restraint.</p>',
  f: ['Write the unit test that this refactoring makes possible.', 'Is the string comparison on <code>e.Type</code> a problem by itself?']
}));

practice.push(P({
  t: 'Fire-and-forget email that sometimes never arrives', l: 'Medium', tags: ['async', 'background work'],
  s: 'To keep the checkout fast, a developer wrote <code>_ = _email.SendConfirmationAsync(order);</code> and returned the response at once. About 1 in 200 customers never gets the email, and there is nothing in the logs. Explain why, and design a safer approach.',
  ex: `<pre><code>[HttpPost]
public async Task&lt;IActionResult&gt; Checkout(Order order)
{
    await _orders.SaveAsync(order);
    _ = _email.SendConfirmationAsync(order);   // not awaited
    return Ok();
}</code></pre>`,
  weak: 'I would wrap the call in Task.Run with a try/catch so it runs on another thread and logs the error.',
  why: 'Logging helps a little, but the work is still tied to nothing. The request scope, and scoped services such as a DbContext, are disposed when the response is sent, and a deployment or restart kills the task without a trace.',
  q: ['Why is there nothing in the logs?', ['Email errors are never logged in .NET', 'The exception is stored in a Task that nobody awaits or observes', 'The logger is asynchronous', 'The SMTP server hides errors'], 1, 'An exception in an un-awaited task stays inside the task object. Nobody looks at it, so nothing is logged.'],
  h: ['What owns the task after the action returns? What happens to scoped services when the request ends?', 'The work must survive the request, and for a confirmation email it should survive a restart too. What kind of component gives that?', 'Recipe: explain the 3 failure modes → in-process option (channel + hosted service with its own scope and retry) → durable option (queue or outbox) → pick one and say why.'],
  a: `<p><b>Why emails vanish:</b></p>
    <ol><li><b>Unobserved exception</b>: an SMTP error goes into a task that nobody awaits, so there is no log.</li>
    <li><b>Disposed scope</b>: when the response is sent, scoped services are disposed. The task may then use a disposed object and throw.</li>
    <li><b>Shutdown</b>: a deployment or scale-in stops the process and the running task dies.</li></ol>
    <p><b>Safer designs:</b></p>
    <ul><li><b>In-process queue</b>: write an email job to a bounded <code>Channel</code>; a <code>BackgroundService</code> reads it, creates its own DI scope, retries and logs. Good and simple, but jobs are lost on a crash.</li>
    <li><b>Durable queue</b>: put a message on a queue such as Azure Service Bus; a worker sends the email and retries. Survives restarts.</li>
    <li><b>Outbox</b>: save an "email to send" row in the same database transaction as the order; a worker sends and marks it. The order and the intent to email cannot disagree.</li></ul>
    <p><b>My choice</b> for a confirmation that customers rely on: the outbox or a durable queue. The request stays fast and no email is lost silently.</p>`,
  cx: '<p>Trade-off: more moving parts in exchange for reliability and visibility.</p>',
  f: ['How do you avoid sending the same email twice?', 'What is the dead-letter queue for?']
}));

practice.push(P({
  t: 'Import 50,000 records through a rate-limited API', l: 'Medium', tags: ['parallelism', 'rate limiting'],
  s: 'A nightly job must send 50,000 customer records to a partner API. The API allows 20 concurrent calls and returns 429 when you go over. One call takes about 300 ms. The current job awaits the calls one at a time and takes over 4 hours. How do you make it faster and still safe?',
  ex: `${H.table(['Approach', 'Calls in flight', 'Rough duration'], [['One at a time', '1', '<span class="c-r">50,000 × 0.3 s ≈ 4.2 hours</span>'], ['Task.WhenAll on everything', '50,000', '<span class="c-r">fails: 429 and socket errors</span>'], ['Bounded parallelism of 16', '16', '<span class="c-g">≈ 16 minutes</span>']])}`,
  weak: 'I would create all 50,000 tasks and await Task.WhenAll. Async means they do not use threads, so it is fine.',
  why: 'True that no threads are blocked, but 50,000 calls start at once. The partner answers 429, connections run out, and with retries the load gets worse. It ignores the stated limit of 20.',
  q: ['Which tool gives "at most 16 async calls at a time" most directly?', ['<code>Parallel.For</code> with an async lambda', '<code>Parallel.ForEachAsync</code> with <code>MaxDegreeOfParallelism = 16</code>', '<code>Task.Run</code> in a loop', '<code>Thread.Sleep</code> between calls'], 1, 'Parallel.ForEachAsync is made for async bodies and takes a limit. Parallel.For with an async lambda does not wait for the work.'],
  h: ['The calls are I/O, so threads are not the limit. What is?', 'Stay a little under the partner limit. What should happen when a 429 still comes back?', 'Recipe: bounded parallelism (16) → retry 429 and 5xx with backoff, honour Retry-After → make each call safe to repeat → record progress so the job can resume → log a summary.'],
  a: `<p><b>Design:</b></p>
    <ol><li><b>Bounded parallelism</b>: <code>Parallel.ForEachAsync</code> with <code>MaxDegreeOfParallelism = 16</code>, a little under the limit of 20 to leave room for retries.</li>
    <li><b>Resilience</b>: a typed <code>HttpClient</code> with the standard resilience handler. Retry 429 and 5xx with exponential backoff and jitter, and honour the <code>Retry-After</code> header.</li>
    <li><b>Safe to repeat</b>: send the record id as an idempotency key, or use an upsert endpoint, so a retry does not create a duplicate.</li>
    <li><b>Resumable</b>: mark each record as sent. If the job stops at record 31,000 it continues from there.</li>
    <li><b>Failures</b>: collect records that still fail after retries into a list or table and report them. One bad record must not stop the run.</li>
    <li><b>Cancellation</b>: pass the token so a shutdown stops cleanly.</li></ol>
    <p><b>Result:</b> about 50,000 × 0.3 s ÷ 16 ≈ 16 minutes.</p>
    <p><b>Ask the partner</b> whether a batch endpoint exists. 500 records per call would beat any tuning on our side.</p>`,
  code: CS(`var options = new ParallelOptions { MaxDegreeOfParallelism = 16, CancellationToken = ct };
var failed = new ConcurrentBag<int>();

await Parallel.ForEachAsync(customers, options, async (customer, token) =>
{
    try
    {
        await partner.UpsertAsync(customer, token);   // retries live in the HttpClient pipeline
        await progress.MarkSentAsync(customer.Id, token);
    }
    catch (HttpRequestException)
    {
        failed.Add(customer.Id);                      // report later, keep going
    }
});`),
  cx: '<p>Throughput is set by the partner limit, not by our CPU. From 4.2 hours to about 16 minutes.</p>',
  f: ['The limit is 100 calls per minute, not 20 concurrent. What changes?', 'How would you test this without calling the real partner?']
}));

practice.push(P({
  t: 'Choosing between exceptions and results', l: 'Medium', tags: ['error handling', 'API design'],
  s: 'A booking service has a method <code>ReserveSeat</code>. It can fail because the seat is already taken (common at busy times), because the show does not exist, or because the database is down. A teammate throws a custom exception for all three; another wants a Result type for all three. As the lead, what do you decide, and how does each case reach the HTTP client?',
  ex: `${H.table(['Failure', 'How often', 'Whose "fault"'], [['Seat already taken', '<span class="c-y">Thousands per hour at peak</span>', 'Nobody: normal business'], ['Show not found', 'Rare', 'The caller sent a bad id'], ['Database down', 'Very rare', 'Infrastructure']])}`,
  weak: 'Exceptions are slow, so we should never throw. Everything returns a Result, including database errors, which we catch and convert.',
  why: 'Catching every infrastructure exception and wrapping it loses the stack trace, forces every caller to handle failures it cannot fix, and hides real incidents as ordinary return values.',
  q: ['"Seat already taken" during a ticket rush is best modelled as...', ['An exception, because it is an error', 'A result value, because it is an expected outcome', 'A null return', 'A log message only'], 1, 'It is a normal, frequent business outcome that the caller must handle, so it belongs in the return type.'],
  h: ['Sort the three failures into "expected by the business" and "unexpected".', 'Who can do something useful about each failure: the calling code, the end user, or the on-call engineer?', 'Recipe: expected → Result with an error code; unexpected → exception to a global handler; map both to Problem Details with 409, 404, 500; agree the rule once and write it down.'],
  a: `<p><b>Decision rule for the team:</b> expected business outcomes are results; unexpected failures are exceptions.</p>
    ${H.table(['Case', 'In code', 'HTTP'], [['Seat taken', '<code>Result.Fail(SeatTaken)</code>', '409 Conflict'], ['Show not found', '<code>Result.Fail(NotFound)</code>', '404 Not Found'], ['Database down', 'Exception, not caught in the service', '500, or 503 with Retry-After']])}
    <ul><li>The service returns <code>Result&lt;Reservation&gt;</code> with an error <b>code</b> (an enum), not only a text, so the endpoint can pick the status without parsing strings.</li>
    <li>One small mapping function turns a failed result into Problem Details. One global exception handler turns anything unexpected into a 500 Problem Details with a trace id.</li>
    <li>Inside the domain model, a broken invariant (a negative seat number) still throws. That is a bug, not an outcome.</li></ul>
    <p><b>How I settle the disagreement:</b> both teammates are partly right. I write the rule and the table above in the team guide, with this method as the example, and we apply it to new code first.</p>`,
  cx: '<p>The rule is about who can act on the failure, not about speed alone.</p>',
  f: ['Two users reserve the same seat in the same millisecond. Where is that detected?', 'Should validation errors be 400 or 422?']
}));

practice.push(P({
  t: 'The upgrade conversation: .NET 8 to .NET 10', l: 'Medium', tags: ['modern C#', 'planning', 'leadership'],
  s: 'It is late 2026. Your team runs 12 services on .NET 8. The product manager asks: "Everything works. Why should we spend a sprint on an upgrade?" Give your answer and a plan.',
  ex: `${H.table(['Release', 'Type', 'Status in late 2026'], [['.NET 8', 'LTS', '<span class="c-r">End of support: November 2026</span>'], ['.NET 9', 'STS', '<span class="c-r">End of support: November 2026</span>'], ['.NET 10', 'LTS', '<span class="c-g">Supported until November 2028</span>']])}`,
  weak: 'We should upgrade because .NET 10 is newer and has cool features like extension members that the developers want to use.',
  why: 'A product manager does not pay a sprint for developer enjoyment. The answer misses the real business reason, security support, and gives no plan, cost or risk.',
  q: ['What is the strongest business reason for this upgrade?', ['New syntax', 'The old runtime no longer receives security fixes', 'Smaller source files', 'It is required by Visual Studio'], 1, 'After end of support there are no security patches, which is a risk and often an audit finding.'],
  h: ['Translate "end of support" into something a product manager cares about.', 'What makes an upgrade cheap or expensive: the code changes, or the testing and deployment?', 'Recipe: reason (security, compliance) → size (small per service, mostly testing) → plan (pilot one service, then waves) → risk control (tests, canary, rollback) → side benefits last.'],
  a: `<p><b>Answer to the product manager:</b> ".NET 8 stopped getting security fixes in November 2026. If a vulnerability is found next month, there will be no patch for what we run. That is a real risk and it will show up in a security audit. .NET 10 is supported until November 2028."</p>
    <p><b>Plan:</b></p>
    <ol><li><b>Pilot</b>: upgrade the smallest service first. Change the target framework, update packages, read the breaking-changes list, run the tests. Measure the effort.</li>
    <li><b>Waves</b>: 3 or 4 services per wave, least critical first, each behind a canary or slot deployment with a fast rollback.</li>
    <li><b>Pipeline</b>: update build images and base container images once, shared by all services.</li>
    <li><b>Do not mix</b>: no feature rewrites in the same pull request. Adopting C# 14 features comes later, where it helps.</li>
    <li><b>Estimate</b>: based on the pilot, usually 1 or 2 days per service, most of it testing.</li></ol>
    <p><b>Side benefits:</b> runtime speed improvements for free, and a policy for next time: move to each LTS within 6 months of release.</p>`,
  cx: '<p>Leads with risk, sizes the work with a pilot, and separates upgrade from refactoring.</p>',
  f: ['One service depends on a library that does not support .NET 10 yet. What do you do?', 'How do you keep 12 services on the same version in future?']
}));

practice.push(P({
  t: 'Reflection-based mapper slows the API', l: 'Medium', tags: ['reflection', 'performance'],
  s: 'A home-made object mapper copies properties from entities to DTOs using reflection. A profile of the product list endpoint (500 items per page) shows 35% of CPU time inside <code>PropertyInfo.GetValue</code> and <code>SetValue</code>. What are your options, from smallest to largest change?',
  ex: `<pre><code>foreach (var p in typeof(TSource).GetProperties())      // runs for every object
{
    var target = typeof(TDest).GetProperty(p.Name);
    target?.SetValue(dest, p.GetValue(source));
}</code></pre><p>500 items × 12 properties × 2 reflective calls = <span class="c-r">12,000 reflective calls per request</span>, plus 1,000 property lookups.</p>`,
  weak: 'Reflection is slow, so we should rewrite the whole service without any mapping library and add more servers in the meantime.',
  why: 'It jumps to the largest change without trying the cheap ones, and scaling out pays every month for a problem that a cache or a generated mapper removes.',
  q: ['Which change removes reflection from the request path completely?', ['Caching the PropertyInfo objects', 'A source-generated or hand-written mapping method', 'Using <code>dynamic</code>', 'Calling <code>GC.Collect()</code> after each request'], 1, 'Caching removes the lookups but GetValue/SetValue remain. Generated or hand-written code is plain property assignment.'],
  h: ['Two separate costs are in that loop: finding the properties, and reading or writing through them. Which is easy to remove?', 'What can turn "copy property A to property A" into ordinary compiled code?', 'Recipe: cache lookups per type pair → compiled delegates → source-generated mapper or hand-written projection → and check whether the query could select the DTO directly.'],
  a: `<p><b>Options, smallest first:</b></p>
    <ol><li><b>Cache the lookups</b>: build the list of property pairs once per (source, destination) type and keep it in a static <code>ConcurrentDictionary</code>. Removes <code>GetProperties</code> from every call. An hour of work.</li>
    <li><b>Compiled delegates</b>: build a <code>Func&lt;TSource, TDest&gt;</code> once with expression trees and cache it. Calls become nearly as fast as hand-written code. Does not work with Native AOT.</li>
    <li><b>Source-generated mapper</b>: a generator writes the mapping method at build time. No reflection, compile-time errors when a property is missing, AOT-friendly.</li>
    <li><b>Hand-written mapping</b> for the hot DTOs: boring, fastest, and easy to read.</li>
    <li><b>Skip the mapping</b>: project in the query, <code>.Select(p =&gt; new ProductDto(p.Id, p.Name, p.Price))</code>, so the database returns only the needed columns and no entity is created.</li></ol>
    <p><b>My pick:</b> option 5 for this list endpoint, because it also cuts the SQL and the allocations, and option 3 as the team standard. Then I re-run the same profile and load test to prove the 35% is gone.</p>`,
  cx: '<p>Each step trades more effort for less run-time cost; measuring after each one tells you when to stop.</p>',
  f: ['Why do compiled expression trees fail under Native AOT?', 'How would a missing property be detected in each option?']
}));

practice.push(P({
  t: 'Intermittent "object disposed" and wrong data in a singleton', l: 'Hard', tags: ['DI lifetimes', 'thread safety'],
  s: 'After a refactoring, a service shows two rare errors under load: <code>ObjectDisposedException: Cannot access a disposed context instance</code>, and <code>InvalidOperationException: A second operation was started on this context instance before a previous operation completed</code>. Occasionally a customer also sees another customer\'s basket total. Nothing fails on a developer machine. Find the cause.',
  ex: `<pre><code>builder.Services.AddDbContext&lt;ShopDb&gt;();                 // scoped
builder.Services.AddSingleton&lt;BasketService&gt;();          // changed from AddScoped "for speed"

public class BasketService(ShopDb db)
{
    private decimal _lastTotal;                          // "cache"
    public async Task&lt;decimal&gt; TotalAsync(int userId)
    {
        _lastTotal = await db.Baskets.Where(b =&gt; b.UserId == userId).SumAsync(b =&gt; b.Price);
        return _lastTotal;
    }
}</code></pre>`,
  weak: 'EF Core has a bug under load. I would add a lock around every database call in BasketService so only one runs at a time.',
  why: 'A global lock turns the service into a single-lane road and still leaves a DbContext that belongs to a finished request. It treats two symptoms and misses the single cause: the lifetime change.',
  q: ['What is a "captive dependency"?', ['A NuGet package that cannot be updated', 'A shorter-lived service held by a longer-lived one', 'A circular reference between two services', 'A service with no interface'], 1, 'The singleton captures the scoped DbContext from the first request and keeps using it for the lifetime of the app.'],
  h: ['One line in the registration changed. What does singleton mean for the objects passed to its constructor?', 'A DbContext is not thread-safe and belongs to one request. A field in a singleton is shared by all requests. Match each of the three symptoms to one of these facts.', 'Recipe: name the captive dependency → explain each symptom → fix lifetimes (scoped service, or IDbContextFactory) → remove the shared field → turn on scope validation so it fails at start-up next time.'],
  a: `<p><b>Cause:</b> a <b>captive dependency</b>. <code>BasketService</code> became a singleton but still takes a scoped <code>ShopDb</code>. The container gives it the context of whatever scope created it first, and the singleton keeps that one context forever.</p>
    <p><b>Each symptom explained:</b></p>
    <ul><li><b>Disposed context</b>: the scope that owned the context ended and disposed it.</li>
    <li><b>Second operation started</b>: two requests use the same context at the same time. <code>DbContext</code> is not thread-safe.</li>
    <li><b>Wrong basket total</b>: <code>_lastTotal</code> is one field shared by all requests. Request A writes it, request B overwrites it before A returns it.</li></ul>
    <p><b>Fix:</b></p>
    <ol><li>Register <code>BasketService</code> as scoped again. If it truly must be a singleton, inject <code>IDbContextFactory&lt;ShopDb&gt;</code> and create a context per call.</li>
    <li>Delete the <code>_lastTotal</code> field; return the local value.</li>
    <li>Make sure scope validation is on in every environment (<code>ValidateScopes</code> and <code>ValidateOnBuild</code>), so this mistake throws at start-up. It is on by default only in Development.</li></ol>
    <p><b>Why it was invisible locally:</b> one user, one request at a time.</p>`,
  cx: '<p>One root cause explains all three symptoms, which is the sign of a correct diagnosis.</p>',
  f: ['How would you write a test that catches this?', 'When is a singleton that needs database access a legitimate design?']
}));

practice.push(P({
  t: 'Design a background processing pipeline', l: 'Hard', tags: ['channels', 'design', 'back-pressure'],
  s: 'An API receives image uploads (up to 50 per second at peak). Each image must be virus-scanned (I/O, 200 ms), resized into 3 sizes (CPU, 400 ms on one core) and saved to storage (I/O, 100 ms). The upload request should return within 100 ms. The service runs on 4 cores. Design the processing inside one service, and say when you would move to a separate queue and worker.',
  ex: `${H.table(['Stage', 'Kind', 'Time', 'Sensible concurrency on 4 cores'], [['Scan', 'I/O', '200 ms', '<span class="c-g">16 or more</span>'], ['Resize', '<span class="c-r">CPU</span>', '400 ms', '<span class="c-y">3 (leave a core for requests)</span>'], ['Save', 'I/O', '100 ms', '<span class="c-g">16 or more</span>']])}<p>Resize capacity: 3 cores ÷ 0.4 s ≈ <b>7.5 images per second</b>. Peak arrival is 50 per second.</p>`,
  weak: 'In the upload action I would call Task.Run for each image to scan, resize and save it, and return 202 immediately.',
  why: 'Unbounded Task.Run at 50 per second floods the thread pool with CPU work, starves normal requests, has no limit on memory, and loses every in-flight image on restart. The numbers in the example show the resize stage cannot keep up.',
  q: ['The resize stage handles about 7.5 images per second and 50 arrive. What must the design include?', ['A larger thread pool', 'Back-pressure: a bounded queue and a way to say "busy"', 'More awaits', 'A static list of pending images'], 1, 'When input exceeds capacity, something must give. A bounded queue makes that explicit instead of running out of memory.'],
  h: ['Treat the three stages differently: two are waiting, one is computing.', 'Do the arithmetic for the CPU stage. What happens to a queue when arrivals exceed capacity for long?', 'Recipe: accept and store the raw file → bounded channel between stages → per-stage concurrency (I/O high, CPU = cores minus 1) → what to do when full → status endpoint → when to move to a durable queue and scaled workers.'],
  a: `<p><b>Flow:</b> the upload action saves the raw file to storage, writes a job id to a queue, and returns <code>202 Accepted</code> with a status URL. Processing happens in hosted background services.</p>
    <p><b>Pipeline inside the service:</b></p>
    <ul><li>Three stages joined by <b>bounded channels</b> (for example 200 items each).</li>
    <li><b>Scan</b> and <b>save</b> are I/O: 16 concurrent async workers each.</li>
    <li><b>Resize</b> is CPU: 3 workers on 4 cores, so request threads keep one core.</li>
    <li><b>Back-pressure</b>: when a channel is full, the stage before it waits. When the first one is full, the API answers 429 or 503 with <code>Retry-After</code>.</li>
    <li>Each job records its state (queued, scanning, resizing, done, failed) for the status endpoint. Failures retry twice, then are marked failed.</li>
    <li>On shutdown, stop accepting, drain within the grace period, and leave unfinished jobs marked for restart.</li></ul>
    <p><b>The honest capacity statement:</b> resize handles about 7.5 images per second. A burst is absorbed by the queue; a sustained 50 per second is not. So for real peak load I move the work out: a durable queue (Azure Service Bus or Storage Queues) and separate worker instances that scale on queue length, about 7 workers of this size for 50 per second. That also means a crash loses nothing.</p>
    <p><b>When in-process is enough:</b> low volume, short bursts, and jobs that can be re-run from the stored raw file.</p>`,
  cx: '<p>Capacity = cores ÷ CPU time per item. The design follows from that one number.</p>',
  f: ['How do you make the resize step safe to run twice?', 'Which metric would you scale the workers on?']
}));

practice.push(P({
  t: 'High latency spikes from garbage collection', l: 'Hard', tags: ['GC', 'allocations', 'performance'],
  s: 'A pricing API has a median response time of 12 ms but the 99th percentile is 450 ms. <code>dotnet-counters</code> shows 28% time in GC, an allocation rate of 1.8 GB per second, and Gen 2 collections several times a minute. Memory is stable, so it is not a leak. How do you find the cause and bring the 99th percentile down?',
  ex: `${H.table(['Counter', 'Value', 'Healthy range (rule of thumb)'], [['% time in GC', '<span class="c-r">28%</span>', 'under 5%'], ['Allocation rate', '<span class="c-r">1.8 GB/s</span>', 'depends, but this is very high'], ['Gen 2 collections', '<span class="c-r">4 per minute</span>', 'a few per hour'], ['GC heap size', 'stable at 900 MB', 'stable']])}`,
  weak: 'I would switch the GC settings to a different mode and set GCSettings.LatencyMode to low latency so it collects less.',
  why: 'Tuning the collector while the code allocates 1.8 GB per second treats the symptom. The settings change when the pause happens, not how much garbage there is. It may be a later step, never the first.',
  q: ['Memory is stable but time in GC is 28%. What kind of problem is this?', ['A memory leak', 'Too many short-lived allocations (allocation pressure)', 'Thread-pool starvation', 'A deadlock'], 1, 'Stable heap size means objects are freed. The cost is the sheer volume created and collected.'],
  h: ['Not a leak. So the question is not "who keeps objects" but "who creates them". Which tool samples allocations by call stack?', 'Frequent Gen 2 collections with a stable heap often point to large objects (85,000 bytes or more) being created per request. What allocates big arrays or strings?', 'Recipe: allocation profile → top 3 call stacks → fix each (pool buffers, stream in place of buffering, stop materializing, reuse options objects) → re-measure counters and p99 → GC settings only if still needed.'],
  a: `<p><b>Diagnosis:</b> allocation pressure, not a leak. Gen 2 collections several times a minute with a stable heap suggest large objects created per request, because the Large Object Heap is collected with Gen 2.</p>
    <p><b>Find it:</b> <code>dotnet-trace collect --profile gc-verbose</code> (or the allocation view in Visual Studio or PerfView) for 60 seconds under load. Sort by bytes allocated per call stack.</p>
    <p><b>Typical findings and fixes:</b></p>
    ${H.table(['Finding', 'Fix'], [['Whole response built as one large string, then written', 'Serialize straight to the response stream'], ['<code>new byte[1_000_000]</code> per request', '<code>ArrayPool&lt;byte&gt;.Shared</code>'], ['<code>ToList()</code> on 50,000 price rows to pick 20', 'Filter and page in the query'], ['<code>new JsonSerializerOptions()</code> per call', 'One static options instance'], ['String concatenation and <code>Substring</code> in a parsing loop', '<code>Span&lt;char&gt;</code> or <code>StringBuilder</code>']])}
    <p><b>Verify:</b> the same load test. Targets: time in GC under 5%, Gen 2 collections back to a few per hour, 99th percentile under 50 ms.</p>
    <p><b>Only then, settings:</b> confirm Server GC is on and the container has a sensible memory limit. Do not call <code>GC.Collect()</code>.</p>
    <p><b>Keep it:</b> add allocation rate and time in GC to the dashboard, and a benchmark for the hot path in CI.</p>`,
  cx: '<p>Pause time follows allocation volume; reduce the garbage and the collector needs no tuning.</p>',
  f: ['Why do large objects make Gen 2 collections more frequent?', 'When would a struct in place of a class help here, and when would it hurt?']
}));

practice.push(P({
  t: 'Setting C# standards for a new team', l: 'Hard', tags: ['leadership', 'code review', 'analyzers'],
  s: 'You join as tech lead of 8 developers with mixed experience. Pull requests are large, reviews take 4 days and argue about style, and last month 2 production incidents came from <code>.Result</code> calls and an undisposed connection. Management asks for a plan to raise code quality within one quarter without slowing delivery.',
  ex: `${H.table(['Problem today', 'Evidence'], [['Reviews are slow', '<span class="c-r">4 days average</span>'], ['Reviews argue about style', 'Most comments are about naming and braces'], ['Real bugs get through', '2 incidents: blocking on async, missing dispose']])}`,
  weak: 'I would write a 40-page coding standard, require two senior approvals on every pull request, and reject anything that does not follow SOLID.',
  why: 'Nobody reads 40 pages, two mandatory senior approvals make the 4-day wait worse, and "follows SOLID" is an opinion that fuels the same arguments. Nothing in it would have caught the two incidents automatically.',
  q: ['What is the best way to stop <code>.Result</code> reaching production again?', ['A reminder in the team chat', 'An analyzer rule that fails the build', 'A longer review checklist', 'Only seniors may write async code'], 1, 'A rule enforced by the build is applied to every change, by everyone, with no review time spent.'],
  h: ['Split the review comments into two piles: what a tool could check, and what needs a human.', 'The two incidents each map to a known analyzer rule. What does that suggest as the first step?', 'Recipe: automate (formatter, analyzers as errors for the incident classes) → shrink pull requests → short human checklist ordered by risk → teach with examples → measure 3 numbers and review them monthly.'],
  a: `<p><b>Principle:</b> machines check rules, people check design and risk.</p>
    <p><b>Month 1: automate what caused pain.</b></p>
    <ul><li>One <code>.editorconfig</code> and <code>dotnet format</code> in the build. Style arguments end.</li>
    <li>Turn on the .NET analyzers and nullable reference types. Set a small set to <b>error</b>: blocking on tasks, <code>async void</code>, undisposed objects (CA2000), missing cancellation token forwarding (CA2016). Start with new and changed code so old code does not block anyone.</li>
    <li>Both incidents are now build failures.</li></ul>
    <p><b>Month 2: make review fast.</b></p>
    <ul><li>Target pull requests under about 400 changed lines; split with feature flags.</li>
    <li>A one-page checklist in risk order: correctness, async, resources, concurrency, security, design, performance, tests.</li>
    <li>Label comments "must fix", "suggestion", "question". One approval, first response within one working day.</li></ul>
    <p><b>Month 3: grow people.</b></p>
    <ul><li>A 30-minute session every two weeks on one topic from real pull requests (async mistakes, DI lifetimes).</li>
    <li>Pair juniors with seniors on reviews. Rotate reviewers.</li>
    <li>Any comment made 3 times becomes a rule or a line in the guide.</li></ul>
    <p><b>Measure:</b> review turnaround (4 days → 1), pull request size, and incidents caused by code defects. Report monthly to the team and to management.</p>`,
  cx: '<p>Delivery speeds up because review time moves from style to substance.</p>',
  f: ['A senior developer objects to warnings-as-errors. How do you handle it?', 'How do these rules apply to code written by an AI assistant?']
}));

// ================= QUIZ =================
quiz.push(
  { q: 'What happens to the thread when an async method reaches <code>await</code> on a task that is not finished?', options: ['It sleeps until the task finishes', 'It returns to the caller and is free for other work', 'It is destroyed', 'It spins in a loop checking the task'], answer: 1, explain: 'The method saves its state and returns an incomplete Task. The thread goes back to the pool; the rest of the method runs later as a continuation.' },
  { q: 'Which statement about <code>async void</code> is correct?', options: ['It is the normal return type for async methods', 'It should be used only for event handlers', 'It is faster than <code>async Task</code>', 'It lets the caller await the method'], answer: 1, explain: 'An async void method cannot be awaited and its exceptions cannot be caught by the caller. Event handlers are the only place it is needed.' },
  { q: 'Two independent HTTP calls take 300 ms each. Which code finishes in about 300 ms?', options: ['<code>await A(); await B();</code>', '<code>var a = A(); var b = B(); await Task.WhenAll(a, b);</code>', '<code>A().Wait(); B().Wait();</code>', '<code>await Task.Run(() =&gt; A()); await Task.Run(() =&gt; B());</code>'], answer: 1, explain: 'Both tasks are started before either is awaited, so they overlap. Awaiting one before starting the next makes them sequential.' },
  { q: 'Why can you not use <code>await</code> inside a <code>lock</code> block?', options: ['Because locks are slower than tasks', 'Because the code after the await may run on a different thread, and a lock belongs to a thread', 'Because <code>lock</code> only works on value types', 'Because <code>await</code> needs a static method'], answer: 1, explain: 'A monitor lock must be released by the thread that took it. After an await, a different thread may continue. Use SemaphoreSlim.WaitAsync.' },
  { q: 'Which tool is the right choice for a simple shared counter that many threads increment?', options: ['<code>Interlocked.Increment</code>', '<code>Thread.Sleep</code>', '<code>volatile</code> on the field', '<code>GC.KeepAlive</code>'], answer: 0, explain: 'Interlocked does the read, add and write as one atomic step. volatile only guarantees a fresh read, it does not make ++ atomic.' },
  { q: 'New objects are allocated in which part of the managed heap (ignoring very large ones)?', options: ['Gen 2', 'Gen 1', 'Gen 0', 'The stack'], answer: 2, explain: 'Small new objects start in Gen 0, which is collected often and cheaply. Survivors move to Gen 1 and then Gen 2.' },
  { q: 'From what size does an object go to the Large Object Heap?', options: ['1,000 bytes', '8,500 bytes', '85,000 bytes', '1 MB'], answer: 2, explain: 'Objects of 85,000 bytes or more are placed on the Large Object Heap, which is collected together with Gen 2.' },
  { q: 'Why can a <code>Span&lt;T&gt;</code> not be stored in a field of a class?', options: ['It is too large', 'It is a ref struct and must live only on the stack', 'It is sealed', 'It is obsolete'], answer: 1, explain: 'A ref struct cannot be placed on the heap, so it cannot be a class field, be boxed, or survive across an await. Memory&lt;T&gt; is the storable alternative.' },
  { q: 'Which C# version introduced records and <code>init</code> properties?', options: ['C# 7', 'C# 8', 'C# 9', 'C# 12'], answer: 2, explain: 'Records and init-only setters arrived with C# 9 and .NET 5. Record structs came in C# 10.' },
  { q: 'A class has an override that throws <code>NotSupportedException</code> because "this subtype cannot do that". Which SOLID principle is at risk?', options: ['Single Responsibility', 'Liskov Substitution', 'Dependency Inversion', 'Open/Closed'], answer: 1, explain: 'Code written against the base type will break when given this subtype, so the subtype is not a safe substitute.' },
  { q: 'What does a source generator do?', options: ['It runs reflection faster at run time', 'It adds C# source files to the compilation during the build', 'It rewrites your existing source files', 'It generates documentation only'], answer: 1, explain: 'A generator can only add code. It moves work from run time to build time, which also makes the app friendlier to trimming and Native AOT.' },
  { q: 'In the usual Result-pattern guideline, which failure should still be an exception?', options: ['The seat is already taken', 'The email field is empty', 'The requested order does not exist', 'The database connection is lost'], answer: 3, explain: 'A lost connection is unexpected and the caller cannot handle it sensibly. The other three are ordinary business outcomes.' }
);

// ================= INTERVIEW: cleanup (source section 6, last question) =================
interview.push({
  q: 'What is the difference between managed and unmanaged resources?', level: 'B',
  a: `<p>A managed resource is memory that the .NET garbage collector tracks and frees for you; an unmanaged resource is anything the garbage collector does not know how to release, so your code must release it.</p>
<table><thead><tr><th></th><th>Managed</th><th>Unmanaged</th></tr></thead><tbody>
<tr><td>Examples</td><td>Objects, strings, arrays, lists</td><td>File handles, sockets, database connections, native memory, window handles</td></tr>
<tr><td>Who frees it</td><td>The garbage collector (GC), some time later</td><td>You, by calling <code>Dispose</code> (usually through <code>using</code>)</td></tr>
<tr><td>What goes wrong</td><td>Memory stays high if something still points at the object</td><td>The app runs out of connections, ports or file locks long before it runs out of memory</td></tr>
</tbody></table>
<p>Most classes you write hold unmanaged resources only <b>indirectly</b>: they own a <code>SqlConnection</code> or a <code>FileStream</code>, which in turn wraps the real operating system handle. The rule is simple: if a type implements <code>IDisposable</code>, the code that created it must dispose it.</p>
<blockquote><b>Say it in the interview:</b> The GC only looks after memory. Handles, sockets and connections are released by Dispose, so anything that implements IDisposable goes inside a using.</blockquote>`,
  followUps: ['Is a database connection a managed or an unmanaged resource?', 'What happens if you never dispose a <code>FileStream</code>?', 'Does the GC ever call <code>Dispose</code> for you?']
});

interview.push({
  q: 'Explain <code>using</code>, <code>IDisposable</code> and the dispose pattern.', level: 'I',
  a: `<p><code>IDisposable</code> is a one-method contract (<code>Dispose</code>) that says "call me when you are finished so I can release what I hold", and <code>using</code> is the keyword that guarantees the call, even when an exception is thrown.</p>
<pre><code>await using var conn = new SqlConnection(cs);  // IAsyncDisposable
await conn.OpenAsync(ct);                      // disposed at the end of the scope

public sealed class FolderWatcher : IDisposable
{
    private readonly FileSystemWatcher _watcher = new();
    private bool _disposed;

    public void Dispose()
    {
        if (_disposed) return;      // safe to call twice
        _watcher.Dispose();         // release what this class owns
        _disposed = true;
    }
}</code></pre>
<ul>
<li><code>using</code> compiles to <code>try / finally</code> with <code>Dispose()</code> in the <code>finally</code>.</li>
<li>Use <code>await using</code> for types that implement <code>IAsyncDisposable</code>, so cleanup that does I/O does not block a thread.</li>
<li>A sealed class with only managed fields needs just the simple form above. The full pattern (<code>protected virtual Dispose(bool)</code> plus <code>GC.SuppressFinalize(this)</code>) is for unsealed base classes or types with a finalizer.</li>
<li>Write a finalizer (<code>~Type</code>) only if you directly own a native handle, and prefer <code>SafeHandle</code> instead. Finalizable objects live at least one extra collection, so they cost more.</li>
</ul>
<blockquote><b>Say it in the interview:</b> using is a try/finally that calls Dispose. I implement IDisposable when my class owns something disposable, I make Dispose safe to call twice, and I almost never write a finalizer.</blockquote>`,
  followUps: ['Who disposes a service that the dependency injection container created?', 'What is the difference between <code>Dispose</code> and <code>DisposeAsync</code>?', 'Why should <code>HttpClient</code> usually not be wrapped in a <code>using</code> per request?']
});

// ================= INTERVIEW: async and concurrency (source section 7) =================
interview.push({
  q: 'Explain async/await to someone who has only written synchronous code.', level: 'B',
  a: `<p>Async code lets a thread stop waiting and go do other work while a slow operation, such as a database call, is in progress.</p>
<p>Think of a waiter. A synchronous waiter takes your order, walks to the kitchen and stands there until the food is ready. Nobody else gets served. An asynchronous waiter hands the order to the kitchen and goes to serve other tables. When the food is ready, a waiter (maybe a different one) brings it to you.</p>
<pre><code>// Synchronous: the thread is stuck for the whole database call
var order = db.Orders.Find(id);

// Asynchronous: the thread is free while the database works
var order = await db.Orders.FindAsync(id);</code></pre>
<ul>
<li><code>async</code> on a method allows <code>await</code> inside it.</li>
<li><code>await</code> means "pause this method here, give the thread back, and continue from this line when the result arrives".</li>
<li>The method returns a <code>Task</code>, which is a promise that a result (or an error) will come later.</li>
</ul>
<p>In a web API this matters because threads are limited. With async, 50 threads can look after thousands of requests that are mostly waiting on the network.</p>
<blockquote><b>Say it in the interview:</b> Async does not make one request faster. It lets the same threads serve many more requests, because no thread sits idle while we wait for the database or another service.</blockquote>`,
  followUps: ['Does <code>await</code> create a new thread?', 'What does an async method return if it has no result?', 'Give an example from a real project where async helped.']
});

interview.push({
  q: 'What is the difference between concurrency, parallelism and asynchrony? And between I/O-bound and CPU-bound work?', level: 'B',
  a: `<p>Concurrency means dealing with several things in the same period, parallelism means doing several things at the same instant on different CPU cores, and asynchrony means not blocking a thread while you wait.</p>
<table><thead><tr><th>Word</th><th>Plain meaning</th><th>C# tool</th></tr></thead><tbody>
<tr><td>Concurrency</td><td>One cook switching between 3 pans</td><td>Tasks, async/await, threads</td></tr>
<tr><td>Parallelism</td><td>3 cooks, 3 pans, same moment</td><td><code>Parallel.For</code>, PLINQ, <code>Task.Run</code></td></tr>
<tr><td>Asynchrony</td><td>Put the pan in the oven and walk away until the timer rings</td><td><code>async</code> / <code>await</code></td></tr>
</tbody></table>
<p>The kind of work decides the tool:</p>
<ul>
<li><b>I/O-bound</b> work waits on something outside the CPU: a database, a file, an HTTP call. Use <code>async</code>/<code>await</code>. No thread is needed during the wait.</li>
<li><b>CPU-bound</b> work keeps a core busy: resizing an image, hashing, a large calculation. Async does not help. Use more cores (<code>Parallel</code>, <code>Task.Run</code> in a desktop app) or a better algorithm.</li>
</ul>
<blockquote><b>Say it in the interview:</b> First I ask whether the work is waiting or computing. Waiting gets async/await, computing gets parallelism, and mixing them up is the most common mistake.</blockquote>`,
  followUps: ['Can code be concurrent on a single core?', 'Which one is calling 3 web services at the same time with <code>Task.WhenAll</code>?', 'Why is <code>Task.Run</code> around a database call pointless?']
});

interview.push({
  q: 'How does async/await work under the hood?', level: 'I',
  a: `<p>The compiler rewrites every <code>async</code> method into a small state machine, a hidden type that remembers which <code>await</code> the method reached and the values of its local variables.</p>
<ol>
<li>The method runs normally, on the caller's thread, until the first <code>await</code>.</li>
<li>If the awaited task is already finished, it just carries on. No switch happens.</li>
<li>If it is not finished, the state machine registers a <b>continuation</b> (the rest of the method) on that task and returns an incomplete <code>Task</code> to the caller. The thread is now free.</li>
<li>For real I/O there is no thread waiting at all. The operating system signals completion, and a thread-pool thread runs the continuation.</li>
<li>In a UI app the continuation is posted back to the UI thread through the captured <code>SynchronizationContext</code>. ASP.NET Core has no such context, so it resumes on any pool thread.</li>
</ol>
<pre><code>public async Task&lt;OrderDto?&gt; GetAsync(int id, CancellationToken ct)
{
    var o = await _db.Orders.AsNoTracking()
                     .FirstOrDefaultAsync(x =&gt; x.Id == id, ct);
    return o is null ? null : new OrderDto(o.Id, o.Total);
}</code></pre>
<p>Exceptions are stored in the returned task and thrown again at the <code>await</code>.</p>
<blockquote><b>Say it in the interview:</b> An async method is a compiler-generated state machine. At an incomplete await it saves its place, returns a Task and frees the thread; the continuation runs later on a pool thread or the captured context.</blockquote>`,
  followUps: ['What does <code>ConfigureAwait(false)</code> change, and do you need it in ASP.NET Core?', 'Is the code before the first <code>await</code> run synchronously?', 'Where do the local variables live while the method is paused?']
});

interview.push({
  q: 'Compare <code>Thread</code>, the thread pool, <code>Task</code> and <code>ValueTask</code>.', level: 'I',
  a: `<p>A thread is a worker, the thread pool is a shared team of workers, and a <code>Task</code> is a ticket that tells you when a piece of work is finished.</p>
<table><thead><tr><th>Type</th><th>What it is</th><th>When to use</th></tr></thead><tbody>
<tr><td><code>Thread</code></td><td>A real operating system thread, about 1 MB of stack by default, slow to create</td><td>Rarely: a long-lived dedicated loop</td></tr>
<tr><td><code>ThreadPool</code></td><td>Reusable worker threads that pick up queued work; grows and shrinks by itself</td><td>You use it indirectly through tasks</td></tr>
<tr><td><code>Task</code> / <code>Task&lt;T&gt;</code></td><td>An object that represents an operation and its result or error. It may use a pool thread (<code>Task.Run</code>) or no thread at all (I/O)</td><td>The default for all async code</td></tr>
<tr><td><code>ValueTask&lt;T&gt;</code></td><td>A struct version that avoids a heap allocation when the result is often ready at once, for example a cache hit</td><td>Measured hot paths only</td></tr>
</tbody></table>
<p>Rules for <code>ValueTask</code>: await it exactly once, do not store it, do not call <code>.Result</code> before it completes. If you need any of those, call <code>.AsTask()</code>.</p>
<blockquote><b>Say it in the interview:</b> A Task is a promise, not a thread. I return Task by default and switch to ValueTask only when a profiler shows the allocation matters and the method usually completes synchronously.</blockquote>`,
  followUps: ['Does every <code>Task</code> run on a thread?', 'What happens if you await a <code>ValueTask</code> twice?', 'When would you still create a <code>Thread</code> by hand?']
});

interview.push({
  q: 'What are the most common async mistakes, and how do you fix them?', level: 'I',
  a: `<p>The five mistakes I look for are blocking on a task, <code>async void</code>, forgetting to await, awaiting one by one when the calls are independent, and ignoring cancellation.</p>
<table><thead><tr><th>Mistake</th><th>What goes wrong</th><th>Fix</th></tr></thead><tbody>
<tr><td><code>.Result</code>, <code>.Wait()</code>, <code>GetAwaiter().GetResult()</code></td><td>Blocks a thread; starves the pool under load; deadlocks in UI apps and old ASP.NET</td><td><code>await</code> all the way up</td></tr>
<tr><td><code>async void</code></td><td>The caller cannot await it or catch its exception; an error can crash the process</td><td>Return <code>Task</code>. Only event handlers may be <code>async void</code></td></tr>
<tr><td><code>_ = SaveAsync();</code></td><td>Fire-and-forget: errors vanish, work may be cut off at shutdown</td><td><code>await</code> it, or hand it to a background queue</td></tr>
<tr><td>Sequential awaits</td><td>Two 200 ms calls take 400 ms</td><td>Start both, then <code>await Task.WhenAll(a, b)</code></td></tr>
<tr><td>No <code>CancellationToken</code></td><td>Work continues after the user has gone</td><td>Accept a token and pass it down</td></tr>
</tbody></table>
<p><code>ConfigureAwait(false)</code> belongs in reusable library code, so it does not depend on a caller's context. In ASP.NET Core application code it is rarely needed because there is no synchronization context.</p>
<blockquote><b>Say it in the interview:</b> In review I search for .Result, .Wait, async void and un-awaited calls first. Each one either blocks a thread or hides an exception.</blockquote>`,
  followUps: ['Why does <code>.Result</code> deadlock in a WPF app but not in ASP.NET Core?', 'Is it safe to run 2 EF Core queries on one <code>DbContext</code> with <code>Task.WhenAll</code>?', 'How would you run work after the response is sent, safely?']
});

interview.push({
  q: 'How do you handle cancellation, timeouts and retries in async code?', level: 'I',
  a: `<p>Cancellation is cooperative: you pass a <code>CancellationToken</code> down every async call, and each call checks it and stops early by throwing <code>OperationCanceledException</code>.</p>
<pre><code>// Stop when the caller goes away OR after 30 seconds
using var cts = CancellationTokenSource
    .CreateLinkedTokenSource(HttpContext.RequestAborted);
cts.CancelAfter(TimeSpan.FromSeconds(30));

try { await client.GetAsync(url, cts.Token); }
catch (OperationCanceledException) { /* timed out or cancelled */ }</code></pre>
<ul>
<li><b>Timeout</b>: every outbound call needs one. A linked token source with <code>CancelAfter</code> gives "caller cancelled or too slow".</li>
<li><b>Retry</b>: only for transient failures (HTTP 408, 429, 5xx, network errors), with a small limit such as 3 attempts.</li>
<li><b>Backoff with jitter</b>: wait 200 ms, 400 ms, 800 ms plus a random part, so many clients do not retry at the same moment.</li>
<li><b>Idempotency</b>: only retry operations that are safe to repeat, or send an idempotency key.</li>
<li>Do not hand-roll this in production. Use <code>Microsoft.Extensions.Http.Resilience</code> (built on Polly), which adds retry, timeout and circuit breaker to <code>HttpClient</code>.</li>
</ul>
<p>For work that takes minutes, return a job id at once and let the client poll or receive a notification, so no request is held open.</p>
<blockquote><b>Say it in the interview:</b> Every async method takes a CancellationToken and passes it on, every external call has a timeout, and I retry only transient errors with exponential backoff and jitter.</blockquote>`,
  followUps: ['Why must a <code>CancellationTokenSource</code> be disposed?', 'What is a circuit breaker and how is it different from a retry?', 'Should you retry a POST that creates an order?']
});

interview.push({
  q: 'What is the difference between <code>Task.WhenAll</code> and <code>Task.WhenAny</code>, and how do exceptions behave?', level: 'I',
  a: `<p><code>Task.WhenAll</code> finishes when every task has finished, and <code>Task.WhenAny</code> finishes as soon as the first one does.</p>
<pre><code>var users  = GetUsersAsync(ct);    // both start now
var orders = GetOrdersAsync(ct);
await Task.WhenAll(users, orders); // total time = the slower one
var u = await users;               // already complete, no wait

// Timeout pattern with WhenAny
var work = CallSlowServiceAsync(ct);
var done = await Task.WhenAny(work, Task.Delay(2000, ct));
if (done != work) throw new TimeoutException();</code></pre>
<ul>
<li>If several tasks fail, the task returned by <code>WhenAll</code> holds all the errors in an <code>AggregateException</code>, but <code>await</code> throws only the <b>first</b> one. Read <code>task.Exception.InnerExceptions</code> to see them all.</li>
<li><code>WhenAll</code> does not stop the other tasks when one fails. Cancel them yourself with a shared token.</li>
<li><code>WhenAny</code> returns the winning task. The losers keep running, so cancel them or at least observe their errors.</li>
<li>Since .NET 9, <code>Task.WhenEach</code> lets you loop over tasks in the order they complete.</li>
</ul>
<blockquote><b>Say it in the interview:</b> WhenAll is for independent calls I need all of; WhenAny is for races and timeouts. With WhenAll, await shows only the first exception, so I check the task's Exception when I need every failure.</blockquote>`,
  followUps: ['What happens to the losing task after <code>WhenAny</code>?', 'How do you limit <code>WhenAll</code> to 10 calls at a time?', 'What does <code>.Wait()</code> throw compared with <code>await</code>?']
});

interview.push({
  q: 'How do you make code thread-safe? Compare <code>lock</code>, <code>SemaphoreSlim</code>, <code>Interlocked</code> and the concurrent collections.', level: 'A',
  a: `<p>Code is thread-safe when several threads can use it at the same time and the data stays correct; you get there by not sharing data, by making it immutable, or by guarding it with the right tool.</p>
<table><thead><tr><th>Tool</th><th>Use it for</th><th>Note</th></tr></thead><tbody>
<tr><td><code>lock</code></td><td>A short, synchronous critical section</td><td>Lock a private object. You cannot <code>await</code> inside it</td></tr>
<tr><td><code>System.Threading.Lock</code></td><td>The same, on .NET 9 and later</td><td>A dedicated lock type; <code>lock</code> uses it more efficiently</td></tr>
<tr><td><code>Interlocked</code></td><td>One number or reference: counters, flags</td><td>Atomic and lock-free</td></tr>
<tr><td><code>SemaphoreSlim</code></td><td>Async code, or "at most N at once"</td><td><code>await WaitAsync()</code>, then <code>Release()</code> in <code>finally</code></td></tr>
<tr><td><code>ConcurrentDictionary</code>, <code>ConcurrentQueue</code></td><td>Shared collections</td><td>Each call is safe; two calls in a row are not one atomic step</td></tr>
</tbody></table>
<pre><code>private int _hits;
public void Hit() =&gt; Interlocked.Increment(ref _hits);

private readonly SemaphoreSlim _gate = new(5);   // 5 at a time
public async Task CallAsync()
{
    await _gate.WaitAsync();
    try { await DoWorkAsync(); } finally { _gate.Release(); }
}</code></pre>
<p>The words to know: a <b>race condition</b> (result depends on timing), a <b>deadlock</b> (two threads wait for each other), <b>starvation</b> (a thread never gets its turn).</p>
<blockquote><b>Say it in the interview:</b> My first choice is no shared mutable state. If I need it, I use Interlocked for a single value, lock for short synchronous sections, SemaphoreSlim when there is an await, and concurrent collections for shared maps.</blockquote>`,
  followUps: ['Why is <code>count++</code> not thread-safe?', 'Why can you not <code>await</code> inside a <code>lock</code>?', 'Is the value factory of <code>ConcurrentDictionary.GetOrAdd</code> run only once?']
});

interview.push({
  q: 'What is a deadlock, and how do you prevent one?', level: 'A',
  a: `<p>A deadlock is when two or more threads each hold something the other needs, so all of them wait forever.</p>
<p>Classic case: thread 1 locks A then wants B, while thread 2 locks B then wants A.</p>
<pre><code>// Thread 1                 // Thread 2
lock (a) { lock (b) { } }   lock (b) { lock (a) { } }</code></pre>
<p>The async version: on a UI thread or in old ASP.NET, <code>GetAsync().Result</code> blocks the only thread that the continuation needs in order to finish. Nothing can move.</p>
<p>How to prevent it:</p>
<ul>
<li><b>One fixed lock order</b> everywhere (always A before B).</li>
<li><b>Hold locks for a short time</b> and never call unknown code, such as an event or a callback, while holding one.</li>
<li><b>Use a timeout</b>: <code>Monitor.TryEnter</code> or <code>SemaphoreSlim.WaitAsync(timeout)</code>, so a stuck wait turns into an error you can log.</li>
<li><b>Never block on async code</b>; await it.</li>
<li><b>Prefer designs with no locks</b>: immutable data, a single writer, or a <code>Channel</code>.</li>
</ul>
<p>To diagnose one in production, take a dump and run <code>dotnet-dump analyze</code> with <code>clrstack -all</code> and <code>syncblk</code> to see which thread holds which lock.</p>
<blockquote><b>Say it in the interview:</b> A deadlock needs a cycle of waits. I break the cycle with a single lock order, short critical sections, timeouts, and by never calling .Result on a task.</blockquote>`,
  followUps: ['What is the difference between a deadlock and a livelock?', 'Can a database deadlock happen even if the C# code has no locks?', 'How would you find a deadlock in a running service?']
});

interview.push({
  q: 'What are <code>Channel&lt;T&gt;</code> and <code>IAsyncEnumerable&lt;T&gt;</code>, and when do you use each?', level: 'A',
  a: `<p>A <code>Channel&lt;T&gt;</code> is an in-memory, thread-safe queue made for async code, and <code>IAsyncEnumerable&lt;T&gt;</code> is a stream of items that you read one at a time with <code>await foreach</code>.</p>
<pre><code>var channel = Channel.CreateBounded&lt;string&gt;(100); // waits when full

var producer = Task.Run(async () =&gt;
{
    for (int i = 0; i &lt; 1000; i++)
        await channel.Writer.WriteAsync("job-" + i);
    channel.Writer.Complete();                   // no more items
});

var consumer = Task.Run(async () =&gt;
{
    await foreach (var job in channel.Reader.ReadAllAsync())
        Console.WriteLine(job);
});
await Task.WhenAll(producer, consumer);</code></pre>
<ul>
<li>A <b>bounded</b> channel gives <b>back-pressure</b>: when it is full the producer waits, so a fast producer cannot fill the memory.</li>
<li>Typical use: a background worker in a web app that handles queued jobs, with one or many consumers.</li>
<li><code>IAsyncEnumerable&lt;T&gt;</code> fits when the caller should get items as they become ready: rows from a large query, lines of a file, or pieces of a generated answer streamed to a chat screen.</li>
<li>In the producer method, mark the token parameter with <code>[EnumeratorCancellation]</code> so the caller can cancel the stream.</li>
</ul>
<p>A channel lives only inside one process. If a job must survive a restart, use a durable queue such as Azure Service Bus.</p>
<blockquote><b>Say it in the interview:</b> Channels are my producer/consumer tool inside one process, with a bounded capacity for back-pressure. IAsyncEnumerable is how I stream results to a caller without loading everything first.</blockquote>`,
  followUps: ['What happens when a bounded channel is full?', 'Why not use <code>BlockingCollection&lt;T&gt;</code> in async code?', 'How does ASP.NET Core return an <code>IAsyncEnumerable&lt;T&gt;</code> to the client?']
});

interview.push({
  q: 'When do you use <code>Parallel.ForEachAsync</code>, PLINQ or <code>Task.WhenAll</code>?', level: 'A',
  a: `<p>All three run many pieces of work at the same time; the choice depends on whether the work is waiting or computing, and on how much of it the other side can take.</p>
<table><thead><tr><th>Tool</th><th>Best for</th><th>Limit on how many at once</th></tr></thead><tbody>
<tr><td><code>Task.WhenAll</code></td><td>A small, known number of async calls</td><td>None. Everything starts at once</td></tr>
<tr><td><code>Parallel.ForEachAsync</code> (.NET 6+)</td><td>Many async calls: 5,000 ids to fetch</td><td><code>MaxDegreeOfParallelism</code>; default is the core count</td></tr>
<tr><td><code>Parallel.For</code> / <code>ForEach</code></td><td>CPU-bound loops</td><td>Roughly the core count</td></tr>
<tr><td>PLINQ (<code>AsParallel()</code>)</td><td>CPU-bound queries over data in memory</td><td><code>WithDegreeOfParallelism</code></td></tr>
</tbody></table>
<pre><code>await Parallel.ForEachAsync(ids,
    new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = ct },
    async (id, token) =&gt; await ProcessAsync(id, token));</code></pre>
<ul>
<li><code>Task.WhenAll</code> over 5,000 HTTP calls opens 5,000 calls at once. The other system throttles you or falls over. Put a limit on it.</li>
<li>Do not use <code>Parallel.For</code> with an async lambda. It becomes <code>async void</code> and the loop "finishes" before the work does.</li>
<li>In a web API, parallel CPU work takes threads away from other requests. Move heavy work to a background worker.</li>
</ul>
<blockquote><b>Say it in the interview:</b> For a handful of calls I use Task.WhenAll. For thousands I use Parallel.ForEachAsync with a bounded degree of parallelism, sized to what the database or the downstream API can handle.</blockquote>`,
  followUps: ['How do you choose the degree of parallelism?', 'Does PLINQ keep the order of results?', 'What is wrong with <code>Parallel.ForEach(items, async x =&gt; ...)</code>?']
});

interview.push({
  q: 'Design a thread-safe in-memory cache with expiration. What are the trade-offs between <code>lock</code>, <code>ConcurrentDictionary</code> and <code>IMemoryCache</code>?', level: 'E',
  a: `<p>For production I start from <code>IMemoryCache</code>, because it already gives expiration, a size limit and eviction, and I add protection against many callers loading the same key at once.</p>
<table><thead><tr><th>Option</th><th>Good</th><th>Bad</th></tr></thead><tbody>
<tr><td><code>Dictionary</code> + <code>lock</code></td><td>Simple and obviously correct</td><td>One lock for all keys; no expiry; cannot await inside</td></tr>
<tr><td><code>ConcurrentDictionary</code></td><td>Fast reads, per-bucket locking</td><td>No expiry or size limit, so it can grow forever; <code>GetOrAdd</code> may run the factory more than once</td></tr>
<tr><td><code>IMemoryCache</code></td><td>Absolute and sliding expiry, size limit, eviction callbacks</td><td>Per process only; no built-in protection against a stampede</td></tr>
</tbody></table>
<pre><code>// One load per key, even with 100 callers at the same moment
private readonly ConcurrentDictionary&lt;int, Lazy&lt;Task&lt;Product&gt;&gt;&gt; _map = new();

public Task&lt;Product&gt; GetAsync(int id) =&gt;
    _map.GetOrAdd(id, k =&gt; new Lazy&lt;Task&lt;Product&gt;&gt;(() =&gt; LoadAsync(k))).Value;</code></pre>
<ul>
<li><b>Stampede</b>: when a hot key expires, every request reloads it. The <code>Lazy&lt;Task&gt;</code> trick or a per-key <code>SemaphoreSlim</code> lets one caller load and the rest wait. <code>HybridCache</code> (.NET 9 and later) has this built in and adds a second, distributed level.</li>
<li>Remove a failed task from the map, or the error stays cached.</li>
<li>Give every entry an expiry and the cache a size limit. A cache with no limit is a memory leak.</li>
</ul>
<blockquote><b>Say it in the interview:</b> I would not write my own cache. I use IMemoryCache or HybridCache for expiry and size limits, and make sure only one caller loads a missing key, so an expired hot key cannot flood the database.</blockquote>`,
  followUps: ['What is the difference between absolute and sliding expiration?', 'How do you invalidate the cache on all servers after an update?', 'Why is caching a <code>Task</code> risky when the load fails?']
});

interview.push({
  q: 'What is thread-pool starvation, and how do you find and fix it?', level: 'E',
  a: `<p>Thread-pool starvation is when all pool threads are stuck waiting, so new work sits in a queue even though the CPU is almost idle.</p>
<p><b>The cause</b> is nearly always blocking calls in async code: <code>.Result</code>, <code>.Wait()</code>, <code>Thread.Sleep</code>, or synchronous I/O such as a blocking database driver. Each blocked request holds a thread. The pool adds new threads slowly, about 1 or 2 per second, so a burst of traffic outruns it.</p>
<p><b>The signs</b>: response time jumps from milliseconds to seconds, CPU is low, requests time out, and a restart "fixes" it for a while.</p>
<p><b>How to confirm</b>:</p>
<ol>
<li><code>dotnet-counters monitor</code>: the thread count keeps rising and the thread-pool queue length stays above 0.</li>
<li>Take a dump (<code>dotnet-dump</code>) or a trace (<code>dotnet-trace</code>) and look at the stacks. Many threads sit in the same blocking call, often <code>Task.Wait</code> or a lock.</li>
</ol>
<p><b>The fix</b>:</p>
<ul>
<li>Make the call chain async from the controller to the driver.</li>
<li>Replace <code>lock</code> around I/O with <code>SemaphoreSlim.WaitAsync</code>.</li>
<li>Raising <code>ThreadPool.SetMinThreads</code> is a short-term patch that buys time. It hides the problem and costs memory.</li>
<li>Add an analyzer rule that fails the build on <code>.Result</code> and <code>.Wait()</code>.</li>
</ul>
<blockquote><b>Say it in the interview:</b> Slow responses with low CPU make me suspect starvation. I confirm it with dotnet-counters and a dump, find the blocking call that many threads share, and make that path async.</blockquote>`,
  followUps: ['Why does the pool not just create 1,000 threads at once?', 'How is starvation different from a deadlock?', 'What would you put on a dashboard to catch this early?']
});

// ================= INTERVIEW: memory and performance (source section 8) =================
interview.push({
  q: 'What is the difference between the stack and the heap, and how does the garbage collector work?', level: 'B',
  a: `<p>The stack is a small, fast area that holds the local variables of the methods that are running right now, and the heap is the large area where objects live until the garbage collector (GC) removes the ones nobody uses.</p>
<ul>
<li><b>Stack</b>: one per thread. Each method call adds a frame and the frame disappears when the method returns. Local value types (<code>int</code>, small structs) and references sit here.</li>
<li><b>Managed heap</b>: every <code>new</code> of a class goes here. The GC frees it.</li>
</ul>
<p>The GC is <b>generational</b>, because most objects die young:</p>
<table><thead><tr><th>Area</th><th>Holds</th><th>Collected</th></tr></thead><tbody>
<tr><td>Gen 0</td><td>Brand new objects</td><td>Very often, very cheaply</td></tr>
<tr><td>Gen 1</td><td>Survivors of one collection (a buffer zone)</td><td>Sometimes</td></tr>
<tr><td>Gen 2</td><td>Long-lived objects: caches, singletons</td><td>Rarely; this is the expensive one</td></tr>
<tr><td>Large Object Heap</td><td>Objects of 85,000 bytes or more</td><td>Together with Gen 2; not compacted by default, so it can fragment</td></tr>
</tbody></table>
<p>A collection starts from the <b>roots</b> (statics, locals on the stacks, CPU registers), marks everything it can reach, and frees the rest. Survivors move up one generation. Server GC, the usual mode for ASP.NET Core on a multi-core machine, uses one heap per core for more throughput.</p>
<blockquote><b>Say it in the interview:</b> Locals live on the stack and vanish when the method returns; objects live on the heap and the generational GC frees whatever is no longer reachable. Gen 0 is cheap, Gen 2 and the large object heap are what I watch.</blockquote>`,
  followUps: ['Is a value type always stored on the stack?', 'Why reuse large buffers with <code>ArrayPool&lt;T&gt;</code>?', 'What is the difference between workstation and server GC?']
});

interview.push({
  q: 'What is a GC root, and what keeps an object alive?', level: 'I',
  a: `<p>A GC root is a starting point that the garbage collector trusts to be in use, and an object stays alive as long as some chain of references leads from a root to it.</p>
<p>The main roots are:</p>
<ul>
<li><b>Static fields</b>. They live as long as the application.</li>
<li><b>Local variables and parameters</b> of methods that are currently running, on every thread's stack.</li>
<li><b>GC handles</b>, for example pinned objects passed to native code.</li>
<li><b>The finalizer queue</b>: objects that are waiting for their finalizer to run.</li>
</ul>
<p>So "the GC did not free it" always means "something still points at it". The usual hidden pointers are:</p>
<table><thead><tr><th>Hidden reference</th><th>Why it holds on</th></tr></thead><tbody>
<tr><td>An event subscription</td><td>The publisher's delegate list points at the subscriber</td></tr>
<tr><td>A static list or dictionary</td><td>Items are added and never removed</td></tr>
<tr><td>A lambda that captured a variable</td><td>The closure object keeps the variable, and what it points at, alive</td></tr>
<tr><td>A timer that is still running</td><td>The timer queue points at the callback and its target</td></tr>
</tbody></table>
<p>A <code>WeakReference&lt;T&gt;</code> points at an object without keeping it alive, which is useful for caches that may drop items under memory pressure.</p>
<blockquote><b>Say it in the interview:</b> The GC frees what is unreachable from the roots: statics, live locals, handles and the finalizer queue. A memory leak in .NET is an object that is still reachable but no longer needed.</blockquote>`,
  followUps: ['How does an event keep a subscriber alive?', 'What tool shows you the path from a root to an object?', 'When would you use a weak reference?']
});

interview.push({
  q: 'Give me your performance checklist for a .NET service.', level: 'I',
  a: `<p>The first item is to measure before changing anything, because the slow part is rarely where people guess.</p>
<ol>
<li><b>Measure</b>: request timings and dependency calls in Application Insights or OpenTelemetry, <code>dotnet-counters</code> for live numbers, <code>dotnet-trace</code> for CPU, and BenchmarkDotNet for a single method.</li>
<li><b>Fix the I/O first</b>. It is usually 90% of the time: an N+1 query, a missing index, a call made inside a loop, too many columns selected.</li>
<li><b>Use async I/O</b> end to end and reuse connections: <code>IHttpClientFactory</code>, database connection pooling.</li>
<li><b>Cache</b> data that is expensive and changes slowly, with a clear rule for when it expires.</li>
<li><b>EF Core</b>: <code>AsNoTracking()</code> for read-only queries, project to a DTO, page the results.</li>
<li><b>Smaller payloads</b>: return only what the screen needs, turn on response compression.</li>
<li><b>Allocations in hot paths</b>, only after the above: <code>StringBuilder</code>, <code>Span&lt;T&gt;</code>, <code>ArrayPool&lt;T&gt;</code>, no LINQ or boxing in a tight loop.</li>
<li><b>Verify</b> with a load test and the same numbers, and keep the dashboard.</li>
</ol>
<blockquote><b>Say it in the interview:</b> I measure first, then fix in order of size: database and network calls, then caching and payload size, and only then allocations in the code the profiler points at.</blockquote>`,
  followUps: ['How would you find an N+1 query?', 'What does BenchmarkDotNet give you that a <code>Stopwatch</code> does not?', 'Which number would you alert on: average or 95th percentile?']
});

interview.push({
  q: 'What are <code>Span&lt;T&gt;</code>, <code>Memory&lt;T&gt;</code> and <code>ref struct</code>, and how do they help you avoid allocations?', level: 'A',
  a: `<p><code>Span&lt;T&gt;</code> is a window onto a piece of memory that already exists, such as part of an array or a string, so you can read or slice it without copying anything.</p>
<pre><code>ReadOnlySpan&lt;char&gt; line = "id=42;name=Asha";
int semi = line.IndexOf(';');
ReadOnlySpan&lt;char&gt; first = line[..semi];   // "id=42", no new string
int eq = first.IndexOf('=');
int id = int.Parse(first[(eq + 1)..]);     // 42, still no allocation

Span&lt;int&gt; small = stackalloc int[16];      // memory on the stack</code></pre>
<ul>
<li><code>Substring</code> creates a new string each time. Slicing a span creates nothing, so a parser that handles millions of lines produces far less garbage.</li>
<li><code>Span&lt;T&gt;</code> is a <code>ref struct</code>: it may live only on the stack. It cannot be a field of a class, cannot be boxed, cannot be captured by a lambda, and cannot be kept across an <code>await</code>.</li>
<li><code>Memory&lt;T&gt;</code> is the heap-friendly version. Store it in a field or pass it through async code, then call <code>.Span</code> when you do the work.</li>
</ul>
<p>C# 13 allows a span as a local in an async method as long as it is not used across an <code>await</code>, and C# 14 adds implicit conversions from arrays to spans, so span overloads are picked more often.</p>
<blockquote><b>Say it in the interview:</b> Span is a no-copy view over existing memory and lives only on the stack; Memory is the version I can store or use across awaits. I reach for them in parsing and serialization hot paths, after a profiler shows allocations are the problem.</blockquote>`,
  followUps: ['Why can a <code>Span&lt;T&gt;</code> not be a field of a class?', 'When is <code>stackalloc</code> dangerous?', 'What is the difference between <code>Span&lt;T&gt;</code> and <code>ReadOnlySpan&lt;T&gt;</code>?']
});

interview.push({
  q: 'How do you find and fix a memory leak in a .NET service?', level: 'A',
  a: `<p>A managed memory leak is not lost memory; it is objects that are no longer needed but are still referenced, so the garbage collector must keep them.</p>
<p><b>Usual causes</b>:</p>
<ul>
<li>A static list, dictionary or home-made cache with no size limit.</li>
<li>An event that was subscribed to and never unsubscribed.</li>
<li>Timers and <code>CancellationTokenSource</code> objects that are never disposed.</li>
<li>A long-lived (singleton) service that holds on to per-request objects.</li>
<li>Closures that capture large objects.</li>
</ul>
<p><b>The method</b>:</p>
<ol>
<li><b>Observe</b>: memory graph over days, plus <code>dotnet-counters</code>. A leak shows as the Gen 2 heap size rising after every full collection.</li>
<li><b>Capture</b> two snapshots some time apart with <code>dotnet-gcdump collect</code> (small) or <code>dotnet-dump collect</code> (full).</li>
<li><b>Compare</b>: which type grew in count? In <code>dotnet-dump analyze</code>, <code>dumpheap -stat</code> lists types by size.</li>
<li><b>Find the holder</b>: <code>gcroot</code> on one instance prints the chain of references back to a root. That chain names the bug.</li>
<li><b>Fix and prove it</b> with a load test and the same counters.</li>
</ol>
<p>If the managed heap is flat but process memory rises, the leak is native: undisposed handles or a native library.</p>
<blockquote><b>Say it in the interview:</b> I confirm the trend with counters, take two dumps, find the type that keeps growing, and use gcroot to see who still references it. Nine times out of ten it is a static collection, an event or an unbounded cache.</blockquote>`,
  followUps: ['Your API memory grows until restart. What are the first 5 things you check?', 'How do you tell a leak from a cache that is simply warming up?', 'Why is creating a new <code>HttpClient</code> per request a problem?']
});

// ================= INTERVIEW: modern C# by version (source section 9) =================
interview.push({
  q: 'Which modern C# features do you use every day, and why?', level: 'B',
  a: `<p>The features I use daily are the ones that remove noise and prevent bugs: nullable reference types, records, pattern matching, <code>init</code> and <code>required</code> properties, and collection expressions.</p>
<table><thead><tr><th>Feature</th><th>What it gives you</th></tr></thead><tbody>
<tr><td>Nullable reference types (<code>string?</code>)</td><td>The compiler warns before a null reference error can happen</td></tr>
<tr><td>Records</td><td>A data type with value equality and <code>with</code> copies in one line</td></tr>
<tr><td>Pattern matching and switch expressions</td><td>Short, readable branching on type and shape</td></tr>
<tr><td><code>init</code> and <code>required</code></td><td>Objects that must be fully set at creation and cannot change later</td></tr>
<tr><td>File-scoped namespaces, global usings</td><td>Less indentation and fewer repeated lines</td></tr>
<tr><td>Collection expressions (<code>[1, 2, 3]</code>)</td><td>One syntax for arrays, lists and spans</td></tr>
<tr><td>Raw string literals</td><td>JSON or SQL in code without escaping quotes</td></tr>
</tbody></table>
<pre><code>public record OrderDto(int Id, decimal Total);

string Label(OrderDto o) =&gt; o switch
{
    { Total: &gt; 1000 } =&gt; "large",
    { Total: &gt; 0 }    =&gt; "normal",
    _                 =&gt; "empty"
};</code></pre>
<blockquote><b>Say it in the interview:</b> I pick features that make wrong code harder to write: nullable reference types on for every project, records for DTOs, and pattern matching in place of long if/else chains.</blockquote>`,
  followUps: ['What does turning on nullable reference types actually change at run time?', 'When would you not use a record?', 'What does the <code>with</code> expression do?']
});

interview.push({
  q: 'Walk me through the main C# features by version.', level: 'I',
  a: `<p>Each C# version ships with a .NET release, so the quick way to remember it is one or two headline features per version.</p>
<table><thead><tr><th>C#</th><th>Shipped with</th><th>Remember it for</th></tr></thead><tbody>
<tr><td>6</td><td>.NET Framework 4.6</td><td>String interpolation, <code>?.</code>, <code>nameof</code>, expression-bodied members</td></tr>
<tr><td>7</td><td>.NET Framework 4.7</td><td>Tuples, <code>is</code> patterns, <code>out var</code>, local functions</td></tr>
<tr><td>8</td><td>.NET Core 3.0</td><td>Nullable reference types, async streams, ranges (<code>a[1..3]</code>, <code>a[^1]</code>), switch expressions, default interface methods</td></tr>
<tr><td>9</td><td>.NET 5</td><td>Records, <code>init</code>, top-level statements, <code>new()</code></td></tr>
<tr><td>10</td><td>.NET 6</td><td>Global usings, file-scoped namespaces, record structs</td></tr>
<tr><td>11</td><td>.NET 7</td><td><code>required</code> members, raw string literals, list patterns, generic math</td></tr>
<tr><td>12</td><td>.NET 8</td><td>Primary constructors on classes, collection expressions</td></tr>
<tr><td>13</td><td>.NET 9</td><td><code>params</code> collections, the <code>System.Threading.Lock</code> type, partial properties</td></tr>
<tr><td>14</td><td>.NET 10</td><td>Extension members, the <code>field</code> keyword, null-conditional assignment</td></tr>
</tbody></table>
<p>.NET 10 (November 2025) is the current long-term-support release. .NET 8 and .NET 9 both reached the end of support in November 2026, so a team still on them should be planning the move.</p>
<blockquote><b>Say it in the interview:</b> I link features to releases: 8 brought nullable reference types, 9 records, 10 file-scoped namespaces, 11 required members, 12 primary constructors and collection expressions, 14 extension members and the field keyword.</blockquote>`,
  followUps: ['Can you use a newer C# version on an older .NET runtime?', 'Which version added records, and which added record structs?', 'What is the difference between an LTS and an STS release?']
});

interview.push({
  q: 'What is new in C# 14 and .NET 10?', level: 'I',
  a: `<p>C# 14 shipped with .NET 10 in November 2025, and its headline features are extension members and the <code>field</code> keyword.</p>
<pre><code>// 1. field: an auto-property with logic, no hand-written backing field
public string Name
{
    get;
    set =&gt; field = value.Trim();
}

// 2. Null-conditional assignment: assign only if customer is not null
customer?.LastSeen = DateTime.UtcNow;

// 3. Extension members: extension properties, not just methods
public static class EnumerableExtensions
{
    extension&lt;T&gt;(IEnumerable&lt;T&gt; source)
    {
        public bool IsEmpty =&gt; !source.Any();
    }
}</code></pre>
<ul>
<li><b>Extension members</b>: an <code>extension</code> block can add properties, static members and operators to a type you do not own.</li>
<li><b><code>field</code></b>: refers to the compiler-made backing field inside a property accessor.</li>
<li><b>Null-conditional assignment</b>: <code>a?.B = c</code> and <code>a?[i] = c</code>.</li>
<li><b>Implicit span conversions</b>: arrays convert to <code>Span&lt;T&gt;</code> and <code>ReadOnlySpan&lt;T&gt;</code> more naturally.</li>
<li>Smaller ones: <code>nameof(List&lt;&gt;)</code>, modifiers on simple lambda parameters, partial constructors and events, user-defined compound assignment operators.</li>
</ul>
<p>.NET 10 itself is a long-term-support release, supported for 3 years, with runtime and JIT speed-ups and updates across ASP.NET Core and EF Core.</p>
<blockquote><b>Say it in the interview:</b> C# 14 with .NET 10 added extension members, the field keyword for properties and null-conditional assignment. .NET 10 is the current LTS, so it is the version I would choose for a new service.</blockquote>`,
  followUps: ['How is an extension property different from an extension method?', 'What problem does the <code>field</code> keyword solve?', 'How do you plan an upgrade from .NET 8 to .NET 10 for 20 services?']
});

// ================= INTERVIEW: SOLID and clean code (source section 10) =================
interview.push({
  q: 'Explain the SOLID principles, with a short C# example for each.', level: 'B',
  a: `<p>SOLID is 5 design guidelines that keep code easy to change: each class does one job, and classes depend on small contracts in place of concrete details.</p>
<table><thead><tr><th>Letter</th><th>Plain meaning</th><th>Example</th></tr></thead><tbody>
<tr><td><b>S</b> Single Responsibility</td><td>One reason to change</td><td>Split <code>OrderManager</code> (validate, save, email) into a validator, a repository and a notifier</td></tr>
<tr><td><b>O</b> Open/Closed</td><td>Add behaviour by adding code, not by editing tested code</td><td>A new discount is a new class that implements <code>IDiscount</code></td></tr>
<tr><td><b>L</b> Liskov Substitution</td><td>A subclass must work wherever its base works</td><td><code>Square : Rectangle</code> breaks code that sets width and height separately</td></tr>
<tr><td><b>I</b> Interface Segregation</td><td>Small, focused interfaces</td><td><code>IReadRepository&lt;T&gt;</code> and <code>IWriteRepository&lt;T&gt;</code>, not one of 20 methods</td></tr>
<tr><td><b>D</b> Dependency Inversion</td><td>Depend on an abstraction, not on a concrete class</td><td><code>ReportService</code> receives <code>IReportStore</code>; it never writes <code>new SqlStore()</code></td></tr>
</tbody></table>
<pre><code>public interface IDiscount { decimal Apply(decimal amount); }
public class Seasonal : IDiscount { public decimal Apply(decimal a) =&gt; a * 0.90m; }
public class Loyalty  : IDiscount { public decimal Apply(decimal a) =&gt; a * 0.95m; }
// The price calculator loops over IDiscount and never changes.</code></pre>
<blockquote><b>Say it in the interview:</b> I treat SOLID as design pressure, not as law. I add an interface when there is a real boundary: an external system, more than one implementation, or something I need to fake in a test.</blockquote>`,
  followUps: ['Which SOLID principle do you see broken most often?', 'Why is the square and rectangle example a Liskov violation?', 'Can you over-apply SOLID? Give an example.']
});

interview.push({
  q: 'What is dependency injection, and how is it related to the dependency inversion principle?', level: 'B',
  a: `<p>Dependency injection (DI) means a class is handed the things it needs from outside, usually through its constructor, so it does not create them itself.</p>
<pre><code>// Without DI: hard-wired, cannot be tested without a real SMTP server
public class OrderService
{
    private readonly SmtpEmailSender _email = new SmtpEmailSender();
}

// With DI: depends on a contract, receives the implementation
public class OrderService(IEmailSender email)
{
    public Task ConfirmAsync(Order o) =&gt; email.SendAsync(o.Email, "Thanks");
}

// Program.cs: one place decides which implementation is used
builder.Services.AddScoped&lt;IEmailSender, SmtpEmailSender&gt;();</code></pre>
<table><thead><tr><th>Term</th><th>What it is</th></tr></thead><tbody>
<tr><td>Dependency Inversion Principle</td><td>The design rule: high-level code depends on an abstraction</td></tr>
<tr><td>Dependency injection</td><td>The technique: pass the dependency in</td></tr>
<tr><td>DI container</td><td>The tool that builds objects and controls how long they live</td></tr>
</tbody></table>
<p>Lifetimes in ASP.NET Core: <b>transient</b> (new every time), <b>scoped</b> (one per request), <b>singleton</b> (one for the application). A singleton must be thread-safe and must not hold a scoped service such as a <code>DbContext</code>.</p>
<blockquote><b>Say it in the interview:</b> Dependency inversion is the principle, injection is how I apply it, and the container is only a helper. The benefit is that I can swap an implementation or fake it in a test without touching the class.</blockquote>`,
  followUps: ['What goes wrong when a singleton depends on a scoped service?', 'Constructor injection or property injection, and why?', 'Can you do dependency injection without a container?']
});

interview.push({
  q: 'What do DRY, KISS, YAGNI, the Law of Demeter and "tell, don\'t ask" mean?', level: 'I',
  a: `<p>They are short rules of thumb that all push the same way: keep the code small, obvious and loosely connected.</p>
<table><thead><tr><th>Principle</th><th>Plain meaning</th><th>Watch out for</th></tr></thead><tbody>
<tr><td>DRY (don't repeat yourself)</td><td>Each business rule lives in one place</td><td>Merging two pieces of code that only look alike. They will change for different reasons</td></tr>
<tr><td>KISS (keep it simple)</td><td>Pick the simplest design that works</td><td>Clever generic code nobody can debug</td></tr>
<tr><td>YAGNI (you aren't gonna need it)</td><td>Do not build for a need that does not exist yet</td><td>Plug-in systems with one plug-in</td></tr>
<tr><td>Law of Demeter</td><td>Talk to your direct collaborators only</td><td><code>order.Customer.Address.City.Name</code></td></tr>
<tr><td>Tell, don't ask</td><td>Ask an object to do the work; do not pull out its data and do it yourself</td><td>Services full of <code>if (order.Status == ...)</code></td></tr>
<tr><td>Composition over inheritance</td><td>Build behaviour from small parts you hold, not from deep base classes</td><td>Three-level class trees</td></tr>
</tbody></table>
<pre><code>// Ask (logic leaks out)        // Tell (logic stays with the data)
if (order.Items.Count &gt; 0 &amp;&amp;    order.Submit();
    order.Status == Draft)
    order.Status = Submitted;</code></pre>
<blockquote><b>Say it in the interview:</b> DRY is about one source of truth for a rule, not about removing every similar line. When DRY and KISS disagree, I keep a little duplication until the third copy shows what the real abstraction is.</blockquote>`,
  followUps: ['Give an example where removing duplication made code worse.', 'How does the Law of Demeter help testing?', 'What is the "rule of three"?']
});

interview.push({
  q: 'How do you spot SOLID violations in a code review, and when does following SOLID go too far?', level: 'A',
  a: `<p>I look for a handful of code smells that each point at one principle, and I check the opposite problem too: abstractions that nobody needs.</p>
<table><thead><tr><th>Smell in the pull request</th><th>Principle</th></tr></thead><tbody>
<tr><td>A class named Manager or Helper with 800 lines and 9 constructor parameters</td><td>Single Responsibility</td></tr>
<tr><td>The same <code>switch (type)</code> edited in every feature</td><td>Open/Closed</td></tr>
<tr><td>An override that throws <code>NotSupportedException</code>, or callers that check <code>if (x is Special)</code></td><td>Liskov</td></tr>
<tr><td>A class that implements an interface and leaves half the methods empty</td><td>Interface Segregation</td></tr>
<tr><td><code>new SqlConnection</code>, <code>DateTime.Now</code> or <code>File.ReadAllText</code> inside business logic</td><td>Dependency Inversion</td></tr>
</tbody></table>
<p><b>When it goes too far</b>:</p>
<ul>
<li>An interface for every class, each with exactly one implementation and no test that fakes it.</li>
<li>Five layers that only pass the call along, so a small change touches 8 files.</li>
<li>A strategy pattern for something that has had one behaviour for 3 years.</li>
</ul>
<p>My test is simple: does this abstraction remove a real cost we have today, such as a hard-to-test dependency or a file that everyone edits? If not, the plain version is better and we can refactor when the second case arrives.</p>
<blockquote><b>Say it in the interview:</b> I use the smells to start a conversation, not to block a merge. The goal is code that is cheap to change, and too many abstractions make change expensive just as surely as too few.</blockquote>`,
  followUps: ['How do you give this feedback to a senior developer who disagrees?', 'When is a <code>switch</code> statement perfectly fine?', 'How do you test code that calls <code>DateTime.UtcNow</code>?']
});

// ================= INTERVIEW: reflection, attributes, serialization (source section 11) =================
interview.push({
  q: 'What are reflection and attributes?', level: 'B',
  a: `<p>An attribute is a label you stick on code (a class, a method, a property), and reflection is the way a program reads those labels and inspects its own types while it is running.</p>
<pre><code>[AttributeUsage(AttributeTargets.Property)]
public sealed class MaskAttribute : Attribute { }

public class Customer
{
    public string Name { get; set; } = "";
    [Mask] public string CardNumber { get; set; } = "";
}

foreach (var p in typeof(Customer).GetProperties())
    if (p.GetCustomAttribute&lt;MaskAttribute&gt;() is not null)
        Console.WriteLine(p.Name + " must be masked in logs");</code></pre>
<ul>
<li>You already use attributes daily: <code>[HttpGet]</code>, <code>[Required]</code>, <code>[Authorize]</code>, <code>[Fact]</code>, <code>[Obsolete]</code>. An attribute does nothing on its own. Some other code must read it.</li>
<li>Reflection powers dependency injection containers, serializers, object mappers, test runners and model validation.</li>
<li><b>The cost</b>: it is much slower than a direct call, mistakes show up at run time and not at compile time, and it does not work well with trimming and Native AOT, because the tools cannot see which members are used.</li>
<li><b>Making it cheaper</b>: look things up once and cache the result, build a compiled delegate, or replace it with a source generator.</li>
</ul>
<blockquote><b>Say it in the interview:</b> Attributes are metadata, reflection reads metadata at run time. It is powerful for frameworks, but I keep it out of hot paths, cache what I look up, and prefer source generators where one exists.</blockquote>`,
  followUps: ['Name 3 attributes you used this month and what reads each one.', 'How would you make repeated reflection calls faster?', 'Can reflection read a private field? Should it?']
});

interview.push({
  q: 'What should a developer know about <code>System.Text.Json</code>?', level: 'I',
  a: `<p><code>System.Text.Json</code> is the JSON library built into .NET; it turns objects into JSON text and back, and it is the default in ASP.NET Core.</p>
<pre><code>var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
{
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    Converters = { new JsonStringEnumConverter() }   // enums as text
};
string json = JsonSerializer.Serialize(new OrderDto(1, 250m), options);
OrderDto? dto = JsonSerializer.Deserialize&lt;OrderDto&gt;(json, options);

// Source generation: no reflection, works with trimming and Native AOT
[JsonSerializable(typeof(OrderDto))]
internal partial class AppJsonContext : JsonSerializerContext { }</code></pre>
<ul>
<li>Plain defaults are strict: property names are case-sensitive and written as they are in C#. The <b>Web</b> defaults, which ASP.NET Core uses, give camelCase names and case-insensitive reading.</li>
<li>Create the options object once and reuse it. A new one per call throws away its cache and is slow.</li>
<li>For JSON with no fixed shape, use <code>JsonDocument</code> (read-only) or <code>JsonNode</code> (editable).</li>
<li>Compared with Newtonsoft.Json: faster and built in, but with fewer options.</li>
<li><b>Security</b>: never let the incoming JSON decide which .NET type to create. Use <code>[JsonDerivedType]</code> with a fixed list of allowed types.</li>
</ul>
<blockquote><b>Say it in the interview:</b> I use System.Text.Json with one shared options object, the web defaults, and the source generator when start-up time or AOT matters. I never deserialize polymorphic types chosen by the caller.</blockquote>`,
  followUps: ['Why is reusing <code>JsonSerializerOptions</code> important?', 'How do you serialize a base class with 3 derived types?', 'What breaks when you move a project from Newtonsoft.Json to System.Text.Json?']
});

interview.push({
  q: 'What are source generators and analyzers?', level: 'A',
  a: `<p>Both are plug-ins for the C# compiler (Roslyn) that run while you build: an analyzer inspects your code and reports warnings or errors, and a source generator writes extra C# files that are compiled into your project.</p>
<table><thead><tr><th></th><th>Analyzer</th><th>Source generator</th></tr></thead><tbody>
<tr><td>Output</td><td>Diagnostics, sometimes a code fix</td><td>New source code</td></tr>
<tr><td>Can change your code?</td><td>No (a code fix only suggests)</td><td>No. It can only add files</td></tr>
<tr><td>Examples</td><td>Nullable warnings, "do not use <code>async void</code>", security rules</td><td>System.Text.Json contexts, <code>[LoggerMessage]</code>, <code>[GeneratedRegex]</code>, configuration binding</td></tr>
</tbody></table>
<pre><code>public static partial class Log
{
    [LoggerMessage(EventId = 1, Level = LogLevel.Information,
                   Message = "Order {OrderId} loaded")]
    public static partial void OrderLoaded(this ILogger logger, int orderId);
    // The generator writes the body: no boxing, no string parsing per call.
}</code></pre>
<ul>
<li><b>Why generators matter</b>: work that reflection did at run time moves to build time. Start-up is faster, the code works with trimming and Native AOT, and errors appear in the build.</li>
<li>The usual shape is a <code>partial</code> class or method that you declare and the generator completes.</li>
<li>As a lead I use analyzers as automatic review: turn on the .NET analyzers, set the important rules to error in <code>.editorconfig</code>, and the build enforces them for everyone.</li>
</ul>
<blockquote><b>Say it in the interview:</b> Analyzers find problems at build time, generators write code at build time. Together they replace run-time reflection and manual review rules with something the compiler checks on every build.</blockquote>`,
  followUps: ['How can you see the code a generator produced?', 'What is an incremental generator?', 'Which team rules would you enforce with an analyzer?']
});

interview.push({
  q: 'What are trimming and Native AOT, and why does reflection cause trouble for them?', level: 'E',
  a: `<p>Native AOT (ahead-of-time) compiles a .NET app to machine code at publish time, so it starts in milliseconds and needs no JIT compiler at run time; trimming is the step that removes code the app never uses, so the file is small.</p>
<table><thead><tr><th></th><th>Normal (JIT)</th><th>Native AOT</th></tr></thead><tbody>
<tr><td>Start-up</td><td>Slower: code is compiled as it runs</td><td>Very fast</td></tr>
<tr><td>Memory and size</td><td>Larger</td><td>Smaller, one native file</td></tr>
<tr><td>Peak speed</td><td>Often higher: the JIT optimizes with run-time data</td><td>Good, but fixed at build time</td></tr>
<tr><td>Dynamic features</td><td>All of them</td><td>No run-time code generation, limited reflection</td></tr>
</tbody></table>
<p><b>Why reflection hurts</b>: the trimmer decides what to keep by reading the code. <code>Type.GetType("Shop.Order")</code> or "find every property by name" is invisible to it, so it may remove a member that the app needs later. The result is a failure at run time, not at build time.</p>
<p><b>How to be compatible</b>:</p>
<ul>
<li>Use source generators: the JSON context, the configuration binder, <code>[LoggerMessage]</code>, <code>[GeneratedRegex]</code>.</li>
<li>Use minimal APIs with <code>CreateSlimBuilder</code>. Controllers (MVC) are not AOT-compatible, and EF Core support is still limited.</li>
<li>Treat every trim and AOT warning from <code>dotnet publish</code> as an error.</li>
</ul>
<p>It fits small services, command-line tools and serverless functions where a cold start costs money.</p>
<blockquote><b>Say it in the interview:</b> Native AOT trades run-time flexibility for start-up speed and size. It only works if the code is statically analyzable, which is why source generators have replaced reflection in the newer .NET libraries.</blockquote>`,
  followUps: ['When would you choose Native AOT for a service?', 'What is ReadyToRun and how is it different?', 'How do you find out whether a NuGet package is trim-safe?']
});

// ================= INTERVIEW: architect-level C# (source section 12) =================
interview.push({
  q: 'How do you design a good public API in C#, for example for a shared library?', level: 'A',
  a: `<p>A good API is easy to use correctly and hard to use wrongly, and it can grow without breaking the people who already depend on it.</p>
<ul>
<li><b>Make wrong states impossible</b>: immutable types, <code>required</code> members, constructors that validate. An <code>EmailAddress</code> type beats a <code>string</code> that might be anything.</li>
<li><b>Be general in what you accept, specific in what you return</b>: take <code>IEnumerable&lt;T&gt;</code>, return <code>IReadOnlyList&lt;T&gt;</code>.</li>
<li><b>Async methods</b> end in <code>Async</code> and take a <code>CancellationToken</code> as the last parameter.</li>
<li><b>No boolean flags</b>: <code>Export(true, false)</code> tells the reader nothing. Use an enum or an options object.</li>
<li><b>Be clear about failure</b>: exceptions for bugs and broken contracts, a <code>Try</code> method or a result object for failures that are expected.</li>
<li><b>Keep the surface small</b>: everything is <code>internal</code> until someone needs it. You can open up later; you cannot take back.</li>
<li><b>Plan for versions</b>: adding a member to an interface breaks every implementer. Prefer adding overloads or new interfaces, and mark old members <code>[Obsolete]</code> before removing them.</li>
</ul>
<pre><code>// Hard to read at the call site      // Clear at the call site
report.Export(true, false);           report.Export(new ExportOptions
                                      { Format = ExportFormat.Pdf });</code></pre>
<blockquote><b>Say it in the interview:</b> I design the call site first: what would I want to type as the caller? Then I keep the surface small, make invalid states unrepresentable, and treat every public member as a promise I must keep.</blockquote>`,
  followUps: ['Why return <code>IReadOnlyList&lt;T&gt;</code> and not <code>List&lt;T&gt;</code>?', 'Is adding an optional parameter a breaking change?', 'How do you document and test a public API?']
});

interview.push({
  q: 'What is the Result pattern, and how does it relate to exceptions and Problem Details?', level: 'A',
  a: `<p>The Result pattern means a method returns an object that says "success with a value" or "failure with a reason", so expected failures are ordinary return values and not exceptions.</p>
<pre><code>public readonly record struct Result&lt;T&gt;(bool IsSuccess, T? Value, string? Error)
{
    public static Result&lt;T&gt; Ok(T value)      =&gt; new(true, value, null);
    public static Result&lt;T&gt; Fail(string err) =&gt; new(false, default, err);
}

public async Task&lt;Result&lt;OrderDto&gt;&gt; CreateAsync(CreateOrder cmd)
{
    if (cmd.Items.Count == 0)
        return Result&lt;OrderDto&gt;.Fail("An order needs at least one item");
    var order = await _repo.AddAsync(cmd);
    return Result&lt;OrderDto&gt;.Ok(new OrderDto(order.Id, order.Total));
}</code></pre>
<table><thead><tr><th>Situation</th><th>Use</th></tr></thead><tbody>
<tr><td>Expected outcome: validation failed, not found, out of stock</td><td>A result</td></tr>
<tr><td>Unexpected: database down, null where it cannot be, a bug</td><td>An exception</td></tr>
</tbody></table>
<ul>
<li><b>Why</b>: the method signature tells the truth, the caller must look at the outcome, and you avoid the cost of throwing on a common path.</li>
<li><b>At the HTTP edge</b>, both kinds are turned into <b>Problem Details</b> (RFC 9457): one standard JSON error body with <code>type</code>, <code>title</code>, <code>status</code> and <code>detail</code>. A failed result maps to 400, 404 or 409; an unhandled exception is caught by one global handler and becomes a 500 with no stack trace.</li>
</ul>
<blockquote><b>Say it in the interview:</b> Exceptions are for the unexpected, results are for business outcomes I expect. Either way the client sees one consistent Problem Details body, produced in one place.</blockquote>`,
  followUps: ['What is the downside of using results everywhere?', 'Where do you convert a failed result to an HTTP status code?', 'Why should an API never return a stack trace?']
});

interview.push({
  q: 'How do you review C# code as a tech lead? What is on your checklist?', level: 'A',
  a: `<p>I review in a fixed order, from "is it correct" to "is it tidy", so the important problems are found first and the automatic checks handle the style.</p>
<table><thead><tr><th>Area</th><th>What I look for</th></tr></thead><tbody>
<tr><td>1. Correctness</td><td>Null handling, off-by-one, time zones (store UTC), culture-sensitive string comparison</td></tr>
<tr><td>2. Async</td><td>No <code>.Result</code> or <code>.Wait()</code>, no <code>async void</code>, no fire-and-forget, token passed down</td></tr>
<tr><td>3. Resources</td><td><code>using</code> / <code>await using</code>, <code>IHttpClientFactory</code>, nothing disposable left open</td></tr>
<tr><td>4. Concurrency</td><td>Shared state protected; singleton services thread-safe</td></tr>
<tr><td>5. Security</td><td>Input validated, queries parameterised, no secrets in code, no personal data or tokens in logs</td></tr>
<tr><td>6. Design</td><td>One job per class, abstractions that earn their place, database entities not returned from the API</td></tr>
<tr><td>7. Performance</td><td>N+1 queries, tracking on read-only queries, allocations in hot paths</td></tr>
<tr><td>8. Tests</td><td>Clear names, arrange-act-assert, edge cases and failure paths</td></tr>
</tbody></table>
<p>How I run it as a lead:</p>
<ul>
<li>Formatting and simple rules belong to analyzers and the build, not to people.</li>
<li>I mark comments as "must fix", "suggestion" or "question", and explain the reason.</li>
<li>Small pull requests, reviewed within a working day.</li>
<li>A repeated comment becomes an analyzer rule or a line in the team guide.</li>
</ul>
<blockquote><b>Say it in the interview:</b> I check correctness, async, resources, concurrency and security before style. Anything a tool can check, a tool checks, so human review time goes to design and risk.</blockquote>`,
  followUps: ['How do you review a 2,000-line pull request?', 'How do you review code written with an AI assistant?', 'What do you do when two seniors disagree in a review?']
});

interview.push({
  q: 'How do you make a breaking change to a shared C# library that many teams use?', level: 'A',
  a: `<p>You do it in steps so that nobody is forced to change on your schedule: add the new way, warn about the old way, and remove the old way only in a new major version.</p>
<p><b>What counts as breaking</b>:</p>
<ul>
<li><b>Source break</b>: code no longer compiles. Example: a renamed method.</li>
<li><b>Binary break</b>: an already compiled DLL fails at run time. Example: adding an optional parameter. Old callers look for the old signature and get <code>MissingMethodException</code>.</li>
<li><b>Behaviour break</b>: it compiles and runs but does something different. This is the hardest kind to notice.</li>
</ul>
<p><b>The steps</b>:</p>
<ol>
<li>Add the new member next to the old one. Add an overload; do not change a signature.</li>
<li>Mark the old one: <code>[Obsolete("Use SendAsync. This will be removed in 4.0.")]</code>. Callers get a warning with the fix.</li>
<li>Follow semantic versioning: new features in a minor version, removal only in a major version.</li>
<li>Publish a short migration note, and help: search the other repositories and open pull requests.</li>
<li>Check package downloads or telemetry before deleting.</li>
</ol>
<p>Tooling helps: package validation (<code>EnablePackageValidation</code>) compares the new build with the last released package and fails the build on an accidental break.</p>
<blockquote><b>Say it in the interview:</b> I expand, then migrate, then contract. Add the new API, mark the old one Obsolete with a clear message, give teams a full release to move, and remove it only in a major version.</blockquote>`,
  followUps: ['Why is adding an optional parameter a binary breaking change?', 'How do default interface methods help here?', 'How long do you keep an obsolete member?']
});

interview.push({
  q: 'Which domain-driven design (DDD) tactical patterns do you use in C#?', level: 'E',
  a: `<p>DDD tactical patterns are a way to put business rules inside the objects that own the data, so a rule cannot be skipped by whoever calls the code.</p>
<table><thead><tr><th>Pattern</th><th>Plain meaning</th><th>C# shape</th></tr></thead><tbody>
<tr><td>Value object</td><td>Defined by its values, no identity, immutable</td><td><code>readonly record struct Money</code></td></tr>
<tr><td>Entity</td><td>Has an identity that stays the same while its data changes</td><td>A class with an <code>Id</code></td></tr>
<tr><td>Aggregate root</td><td>The one door into a group of objects; it protects the rules (invariants)</td><td>A class with private setters and methods</td></tr>
<tr><td>Domain event</td><td>A record that something happened</td><td><code>record OrderSubmitted(Guid OrderId)</code></td></tr>
<tr><td>Repository</td><td>Loads and saves a whole aggregate</td><td><code>IOrderRepository</code></td></tr>
</tbody></table>
<pre><code>public class Order
{
    private readonly List&lt;OrderLine&gt; _lines = new();
    public IReadOnlyList&lt;OrderLine&gt; Lines =&gt; _lines;
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;

    public void AddLine(OrderLine line)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Only a draft order can change.");
        _lines.Add(line);
    }

    public void Submit()
    {
        if (_lines.Count == 0)
            throw new InvalidOperationException("An empty order cannot be submitted.");
        Status = OrderStatus.Submitted;
    }
}</code></pre>
<p>Rules of thumb: change one aggregate per transaction and refer to other aggregates by id.</p>
<blockquote><b>Say it in the interview:</b> Value objects remove primitive types with hidden rules, and an aggregate root is the only way to change its data, so it can always enforce its invariants. I use this where the business rules are complex and skip it for simple CRUD.</blockquote>`,
  followUps: ['How do you decide where one aggregate ends and the next begins?', 'How do you map a value object with EF Core?', 'What is an anaemic domain model?']
});

// ================= INTERVIEW: rapid fire (source section 13) =================
interview.push({
  q: 'Rapid fire: async and threading', level: 'B',
  a: `<p>Answer each of these in under 45 seconds: one sentence for the fact, one for the reason.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td>Should you use <code>Task.Run</code> in ASP.NET Core?</td><td>Usually no. The request is already on a pool thread, so it only moves the work to another pool thread and adds overhead. Use it in desktop apps to keep the screen responsive.</td></tr>
<tr><td>Is it OK to <code>lock (this)</code> or <code>lock (typeof(X))</code>?</td><td>No. Outside code can lock the same object and cause a deadlock. Lock a private readonly object, or a <code>System.Threading.Lock</code> on .NET 9 and later.</td></tr>
<tr><td>What is <code>Lazy&lt;T&gt;</code>?</td><td>A wrapper that creates its value on first use. By default it is thread-safe, so the factory runs once.</td></tr>
<tr><td>What does <code>yield return</code> do?</td><td>It builds a lazy iterator. The compiler writes a state machine that produces one item each time the caller asks for the next.</td></tr>
<tr><td>Why are immutable objects useful?</td><td>They cannot change, so they are safe to share between threads with no locks, safe to cache, and easy to test.</td></tr>
<tr><td>What does <code>volatile</code> do?</td><td>It makes every read of a field fetch the latest value. It does not make <code>count++</code> atomic; use <code>Interlocked</code> for that.</td></tr>
</tbody></table>
<blockquote><b>Say it in the interview:</b> Task.Run is for CPU work off a UI thread, not for web requests. I lock on a private object, use Lazy for one-time setup, and prefer immutable data so there is nothing to lock.</blockquote>`,
  followUps: ['Why is locking on a string dangerous?', 'What are the thread-safety modes of <code>Lazy&lt;T&gt;</code>?', 'How is <code>yield</code> similar to <code>await</code> inside the compiler?']
});

interview.push({
  q: 'Rapid fire: memory and cleanup', level: 'B',
  a: `<p>Short answers on how objects are created, copied and released.</p>
<table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
<tr><td><code>IDisposable</code> or a finalizer?</td><td><code>Dispose</code> is cleanup at a moment you choose. A finalizer is a safety net the GC runs later, at an unknown time, and it makes the object live longer.</td></tr>
<tr><td>Should you call <code>GC.Collect()</code>?</td><td>Almost never. The GC tunes itself, and a forced collection pauses the app and pushes short-lived objects into older generations.</td></tr>
<tr><td>Does <code>finally</code> always run?</td><td>Yes, unless the process dies first: <code>Environment.FailFast</code>, a stack overflow, a killed process or a power cut.</td></tr>
<tr><td>Shallow copy or deep copy?</td><td>A shallow copy duplicates the outer object and shares the inner ones. A deep copy duplicates the whole graph. <code>MemberwiseClone</code> and a record's <code>with</code> are shallow.</td></tr>
<tr><td>What is boxing?</td><td>Wrapping a value type in an object on the heap, for example an <code>int</code> assigned to <code>object</code>. It allocates, so avoid it in loops.</td></tr>
<tr><td>What is a partial method?</td><td>A method declared in one part of a partial class and implemented in another. Source generators use it to fill in the body.</td></tr>
</tbody></table>
<blockquote><b>Say it in the interview:</b> Dispose is deterministic, finalizers are a late safety net, and I leave GC.Collect alone. A shallow copy shares the inner objects, which is the detail people forget.</blockquote>`,
  followUps: ['When is calling <code>GC.Collect()</code> acceptable?', 'How do you make a deep copy of an object graph?', 'Can a struct implement an interface, and what happens when you use it through that interface?']
});

registerModule({
  id: 'tl02',
  title: 'C# Async, Memory, Modern C# & SOLID Questions',
  intro: `<p>This module is the second half of the C# interview: the questions that separate a developer who can write C# from one who can <b>lead</b> a team writing it. You will find 38 interview questions with model answers on async/await and the Task model, threads and locks, memory and the garbage collector, <code>IDisposable</code>, <code>Span</code>, modern C# up to C# 14 on .NET 10, SOLID, reflection and serialization, and architect-level design.</p>
    <p><b>How to use it:</b> read a question, say your answer out loud, and only then open the model answer. Every answer starts with one plain sentence and ends with a line you can say in the interview. The six lessons explain the ideas behind the questions with pictures you can step through, and the 12 practice scenarios are the "what would you do?" questions that tech lead interviews are built on.</p>`,
  goals: [
    'Explain async/await in plain words and at the state-machine level, and name the five common async mistakes',
    'Choose between <code>lock</code>, <code>Interlocked</code>, <code>SemaphoreSlim</code>, concurrent collections and channels for a given problem',
    'Describe the stack, the heap and the generational garbage collector, and walk through finding a memory leak with real tools',
    'Match modern C# features to their versions and say which problem each one solves, up to C# 14 on .NET 10',
    'Explain SOLID with small C# examples and judge when an abstraction is worth its cost',
    'Answer architect-level questions on public API design, the Result pattern, Problem Details, DDD building blocks and code review'
  ],
  prereqs: `<p>Module 1 of this track (C# Language &amp; OOP Questions). You should be comfortable with classes, interfaces, generics, LINQ and lambdas. No earlier experience with threads or memory profiling is needed; each lesson starts from the plain idea.</p>`,
  hours: 12,
  langExplain: `<p>The code in this module is C#, because these are C# interview questions. The ideas (async I/O, locks, garbage collection, SOLID) carry over to Java, TypeScript and Python with different keywords.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
