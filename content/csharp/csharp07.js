(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C# code is written with String.raw so "\n" stays a C# escape

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function out(lines) {
    return { type: 'text', label: 'Console output', html: lines && lines.length ? '<code>' + lines.map(function (s) { return H.esc(String(s)); }).join('<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  /* step = { l: line | [lines], cls, v: {vars}, hv, stack: [], out: [], extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.stack) parts.push({ type: 'stack', label: 'Call stack (top = running method)', items: s.stack.slice(), hl: s.stack.length ? (function () { var h = {}; h[s.stack.length - 1] = s.scls || 'cur'; return h; })() : {} });
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — try / catch / finally and how exceptions travel
     ====================================================================== */
  var FLOW_CODE = [
    'static void Run(int mode, List<string> log) {',
    '    try {',
    '        log.Add("try");',
    '        if (mode == 1) throw new InvalidOperationException("boom");',
    '        if (mode == 2) { log.Add("return"); return; }',
    '        if (mode == 3) throw new ArgumentException("bad");',
    '        log.Add("end try");',
    '    }',
    '    catch (InvalidOperationException e) {',
    '        log.Add("catch: " + e.Message);',
    '    }',
    '    finally {',
    '        log.Add("finally");',
    '    }',
    '    log.Add("after");',
    '}'
  ].join('\n');
  function flowSim(input) {
    var mode = parseInt(String(input === undefined ? '1' : input).trim(), 10);
    if (isNaN(mode) || mode < 0 || mode > 3) throw new Error('Type a mode 0, 1, 2 or 3');
    var log = [], st = ['Main', 'Run(' + mode + ')'], s = [];
    s.push({ l: 1, stack: st, v: { mode: mode }, out: [], narr: 'Main calls <b>Run(' + mode + ')</b>. A new frame is pushed on the call stack.' });
    log.push('try');
    s.push({ l: [2, 3], stack: st, v: { mode: mode }, out: log.slice(), narr: 'Enter the <b>try</b> block and log "try". The CLR remembers which handlers protect this region.' });
    if (mode === 1) {
      s.push({ l: 4, cls: 'bad', stack: st, scls: 'bad', v: { mode: mode, thrown: 'InvalidOperationException' }, out: log.slice(), narr: '<b>throw</b>: the rest of the try block is skipped. The runtime searches the handlers of this frame for a matching catch.' });
      log.push('catch: boom');
      s.push({ l: [9, 10], stack: st, v: { mode: mode, matched: 'catch (InvalidOperationException)' }, out: log.slice(), narr: 'The type matches, so this catch runs. The exception is now <b>handled</b>.' });
    } else if (mode === 2) {
      log.push('return');
      s.push({ l: 5, stack: st, v: { mode: mode }, out: log.slice(), narr: '<b>return</b> inside try. Before the method actually leaves, every enclosing finally must run.' });
    } else if (mode === 3) {
      s.push({ l: 6, cls: 'bad', stack: st, scls: 'bad', v: { mode: mode, thrown: 'ArgumentException' }, out: log.slice(), narr: 'ArgumentException is thrown. The only catch here is for InvalidOperationException, so <b>no handler in this frame matches</b>.' });
    } else {
      log.push('end try');
      s.push({ l: 7, stack: st, v: { mode: mode }, out: log.slice(), narr: 'No exception: the try block finishes normally and the catch is skipped.' });
    }
    log.push('finally');
    s.push({ l: [12, 13], cls: 'ok', stack: st, v: { mode: mode }, out: log.slice(), narr: '<b>finally always runs</b>: after a normal end, after a handled exception, during a return and while an unhandled exception is unwinding.' });
    if (mode === 2) {
      st = ['Main'];
      s.push({ l: 16, stack: st, v: { mode: mode }, out: log.slice(), narr: 'Now the pending return completes and the frame is popped. "after" is never logged.' });
    } else if (mode === 3) {
      st = ['Main'];
      log.push('Main: caught ArgumentException');
      s.push({ l: 16, cls: 'bad', stack: st, scls: 'bad', v: { mode: mode }, out: log.slice(), narr: 'The frame is <b>unwound</b> (popped) and the search continues in Main, whose catch (Exception) handles it. "after" is skipped.' });
    } else {
      log.push('after');
      s.push({ l: 15, stack: st, v: { mode: mode }, out: log.slice(), narr: 'Execution continues after the whole try statement.' });
      st = ['Main'];
      s.push({ l: 16, stack: st, v: { mode: mode }, out: log.slice(), narr: 'Run returns normally; its frame is popped.' });
    }
    return codeFrames(FLOW_CODE, s);
  }
  topics.push({
    title: 'try / catch / finally: How Exceptions Travel',
    analogy: `<p>Think of a <b>relay of managers</b>. A worker hits a problem he cannot fix and raises his hand (<b>throw</b>). His own manager looks at the problem: if it is something she knows how to handle (a matching <b>catch</b>) she deals with it; otherwise she passes it to <i>her</i> manager, and so on up the building. Whatever happens, every office the problem passes through still locks its door on the way out (<b>finally</b>). If it reaches the CEO and nobody can handle it, the whole company closes for the day (the process crashes).</p>`,
    explain: `<p>An <b>exception</b> is an object derived from ${C('System.Exception')} that represents a failure. ${C('throw')} stops normal execution and starts a search, frame by frame up the call stack, for a ${C('catch')} clause whose type matches.</p>
<h4>1. The shape</h4>
${P(`
try {
    int n = int.Parse(text);          // may throw FormatException
    Console.WriteLine(100 / n);       // may throw DivideByZeroException
}
catch (FormatException e)       { Console.WriteLine("not a number: " + e.Message); }
catch (DivideByZeroException)   { Console.WriteLine("zero"); }
finally                         { Console.WriteLine("always"); }`)}
<ul>
<li>Catch clauses are tested <b>top to bottom</b>; the first whose type matches (the exception <i>is</i> that type or derives from it) wins. Put specific types before general ones — the compiler rejects a clause that can never be reached (error CS0160).</li>
<li>${C('finally')} runs on every path out of the try: normal end, ${C('return')}, ${C('break')}, a handled exception and an unhandled one. You cannot ${C('return')} from inside a finally.</li>
<li>If no frame catches the exception, the process terminates (the unhandled exception handler prints the stack trace).</li>
</ul>
<h4>2. The hierarchy you meet most</h4>
${H.table(['Type', 'Typical cause'], [
      [C('ArgumentException') + ' / ' + C('ArgumentNullException') + ' / ' + C('ArgumentOutOfRangeException'), 'caller passed a bad argument'],
      [C('InvalidOperationException'), 'object is in the wrong state for this call (e.g. modifying a list while enumerating it)'],
      [C('NullReferenceException'), 'dereferenced null — a bug, never catch it on purpose'],
      [C('IndexOutOfRangeException') + ', ' + C('KeyNotFoundException'), 'bad index / missing dictionary key'],
      [C('FormatException') + ', ' + C('OverflowException'), 'parse failures, checked arithmetic overflow'],
      [C('IOException') + ', ' + C('HttpRequestException'), 'environment failures you can sometimes recover from']
    ])}
<h4>3. C# has no checked exceptions</h4>
<p>Unlike Java, C# never forces you to declare or catch anything. That keeps signatures clean but puts the burden on documentation (${C('/// <exception cref="...">')}) and on you to decide <b>where</b> to handle errors — usually at a boundary (request handler, UI event, top of a worker loop), not in every method.</p>
<h4>4. Cost</h4>
<p>Entering a try block is almost free. <b>Throwing</b> is expensive (capturing a stack trace, a two-pass search, unwinding) — microseconds, not nanoseconds. So exceptions are for exceptional cases; for expected failures use the ${C('TryXxx')} pattern: ${C('int.TryParse(s, out var n)')}, ${C('dict.TryGetValue(k, out var v)')}.</p>`,
    clues: ['Something that "should not normally happen" (file missing, network down, bad argument) → throw', 'Expected, frequent failure (user typing a number) → TryParse, not try/catch', 'Cleanup that must happen on every path → finally or using', 'Ordering catch clauses: specific types first, base types last'],
    code: [{ lang: 'csharp', run: true, title: 'Every path through try/catch/finally (runnable)', code: R`
var log = new List<string>();
for (int mode = 0; mode <= 3; mode++)
{
    log.Clear();
    try { Run(mode, log); }
    catch (Exception e) { log.Add("Main caught " + e.GetType().Name); }
    Console.WriteLine($"mode {mode}: {string.Join(" > ", log)}");
}

static void Run(int mode, List<string> log)
{
    try
    {
        log.Add("try");
        if (mode == 1) throw new InvalidOperationException("boom");
        if (mode == 2) { log.Add("return"); return; }
        if (mode == 3) throw new ArgumentException("bad");
        log.Add("end try");
    }
    catch (InvalidOperationException e)
    {
        log.Add("catch: " + e.Message);
    }
    finally
    {
        log.Add("finally");
    }
    log.Add("after");
}` }],
    codeTitle: ['All four paths'],
    viz: { title: 'Follow one exception through the stack', input: '1', inputLabel: 'mode: 0 normal, 1 caught, 2 return in try, 3 not caught here', gen: flowSim },
    examples: [
      { title: 'TryParse instead of catching FormatException', html: `<p>Reading numbers typed by a user fails often, so it is not exceptional. ${C('int.TryParse')} returns false instead of throwing, and costs nothing extra on failure.</p>`, code: R`
string[] inputs = { "42", "x", "-7" };
foreach (var s in inputs)
    Console.WriteLine(int.TryParse(s, out int n) ? $"ok {n}" : $"skip '{s}'");` },
      { title: 'Order of catch clauses matters', html: `<p>${C('ArgumentNullException')} derives from ${C('ArgumentException')}. If the base type were first, the specific clause would be unreachable and the compiler reports CS0160. Specific first, general last.</p>`, code: R`
try { ArgumentNullException.ThrowIfNull((object?)null, "name"); }
catch (ArgumentNullException e) { Console.WriteLine("null: " + e.ParamName); }
catch (ArgumentException e)     { Console.WriteLine("arg: " + e.Message); }` },
      { title: 'finally runs even when you return', html: `<p>The value of the return expression is computed first, then finally runs, then the method returns that value. Changing the variable inside finally does <b>not</b> change what is returned for a value type.</p>`, code: R`
Console.WriteLine(F()); // prints 1

static int F()
{
    int x = 1;
    try { return x; }
    finally { x = 99; }
}` }
    ],
    deepDive: `<p><b>Two-pass exception handling.</b> The CLR uses a structured-exception model: on throw, the <i>first pass</i> walks up the stack looking for a handler (running exception <b>filters</b> as it goes, before any unwinding). Only when a handler is found does the <i>second pass</i> unwind, running finally blocks from the innermost frame outward, and then the catch runs. This is why a filter sees the original stack intact.</p>
<p><b>Stack traces.</b> ${C('e.StackTrace')} is built from the frames between the throw point and the catch. ${C('throw;')} preserves it, ${C('throw e;')} resets it to the rethrow line. ${C('ExceptionDispatchInfo.Capture(e).Throw()')} rethrows preserving the original trace even on another thread (async/await uses this).</p>
<p><b>Exceptions you cannot catch.</b> ${C('StackOverflowException')} kills the process; since .NET Core, corrupted-state exceptions like access violations are not delivered to managed catch blocks; ${C('OutOfMemoryException')} can be caught but little can be done safely. ${C('finally')} also does not run if the process is killed or ${C('Environment.FailFast')} is called.</p>
<p><b>First-chance vs unhandled.</b> ${C('AppDomain.CurrentDomain.FirstChanceException')} fires for every throw (useful for diagnostics); ${C('UnhandledException')} fires just before the crash. In ASP.NET Core and hosted services, middleware and the host catch exceptions at the boundary for you.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily wrap every method body in ${C('try { ... } catch (Exception ex) { Console.WriteLine(ex); }')}. That swallows bugs and leaves the program running in a corrupt state. <b>Use AI as a partner:</b> ask it <code>List every exception this method can throw and which caller should handle each</code> — a useful audit. <b>Where AI goes wrong:</b> catching ${C('Exception')} too early, catching ${C('NullReferenceException')} instead of fixing the null, using exceptions for control flow in hot loops, logging and rethrowing at every layer (the same error logged ten times). <b>What you must still own:</b> deciding the error boundary of your application and which failures are recoverable.</p>`,
    problems: [{
      title: 'Trace the Path Through try/catch/finally', level: 'Easy', tags: ['exceptions', 'finally', 'filters'],
      statement: `<p>Implement ${C('TraceFlow(int mode)')} that calls a method ${C('Run(mode, log)')} inside its own try/catch and returns the log. ${C('Run')} has a try block that logs ${C('"try"')}, then by mode: 1 throws ${C('InvalidOperationException("boom")')}; 2 logs ${C('"return"')} and returns; 3 throws ${C('ArgumentException')}; 4 throws ${C('InvalidOperationException("again")')} which the catch logs and then <b>rethrows</b> with ${C('throw;')}; 5 throws ${C('InvalidOperationException("skip")')}. Otherwise it logs ${C('"end try"')}. Its catch is ${C('catch (InvalidOperationException e) when (e.Message != "skip")')} and logs ${C('"catch"')}; its finally logs ${C('"finally"')}; after the try statement it logs ${C('"after"')}. ${C('TraceFlow')} logs ${C('"outer"')} when an exception escapes ${C('Run')}.</p>`,
      constraints: `0 ≤ mode ≤ 5`,
      example: `<p>mode = 1 → ${C('["try", "catch", "finally", "after"]')}; mode = 3 → ${C('["try", "finally", "outer"]')}.</p>`,
      brute: { why: `<p>Without exceptions you would thread an error code through every return value and remember to "clean up" on each early return — easy to forget one path. try/finally guarantees the cleanup on every path.</p>`, code: R`
static List<string> TraceWithCodes(int mode)
{
    var log = new List<string> { "try" };
    int error = mode is 1 or 3 or 4 or 5 ? mode : 0;
    if (mode == 2) { log.Add("return"); log.Add("finally"); return log; }
    if (error == 0) log.Add("end try");
    if (error == 1) log.Add("catch");
    log.Add("finally");
    if (error == 0 || error == 1) log.Add("after"); else log.Add("outer");
    return log;
}` },
      mcq: { q: 'In mode 5 the exception filter returns false. What happens?', options: ['The catch is skipped, finally runs, the exception reaches TraceFlow', 'The catch runs anyway', 'finally is skipped', 'The program crashes immediately'], answer: 0, explain: 'A false filter means "this clause does not match"; the search continues outward, and finally runs during unwinding.' },
      hints: [`<p>Write ${C('Run')} exactly as described with a ${C('List<string>')} log, and wrap the call in ${C('try { } catch (Exception) { log.Add("outer"); }')}.</p>`, `<p>Inside the catch, ${C('if (mode == 4) throw;')} rethrows the same exception object; the finally still runs before it leaves ${C('Run')}.</p>`, `<p>For mode 2 put ${C('log.Add("return"); return;')} inside the try: finally runs, but the code after the try statement does not.</p>`],
      solution: {
        approach: `<p>Model the method literally. The log records the actual order in which the CLR runs the blocks: try body, then a matching catch (filters decide matching), then finally, then either the code after the statement or the outer handler.</p>`,
        code: R`
public class Solution
{
    public string[] TraceFlow(int mode)
    {
        var log = new List<string>();
        try { Run(mode, log); }
        catch (Exception) { log.Add("outer"); }
        return log.ToArray();
    }

    static void Run(int mode, List<string> log)
    {
        try
        {
            log.Add("try");
            switch (mode)
            {
                case 1: throw new InvalidOperationException("boom");
                case 2: log.Add("return"); return;
                case 3: throw new ArgumentException("bad");
                case 4: throw new InvalidOperationException("again");
                case 5: throw new InvalidOperationException("skip");
            }
            log.Add("end try");
        }
        catch (InvalidOperationException e) when (e.Message != "skip")
        {
            log.Add("catch");
            if (mode == 4) throw;
        }
        finally
        {
            log.Add("finally");
        }
        log.Add("after");
    }
}`,
        dry: { head: ['mode', 'try body', 'catch?', 'finally', 'then'], rows: [['0', 'try, end try', 'no', 'yes', 'after'], ['1', 'try, throw', 'yes', 'yes', 'after'], ['2', 'try, return', 'no', 'yes', '(returns)'], ['4', 'try, throw', 'yes, rethrows', 'yes', 'outer'], ['5', 'try, throw', 'filter false', 'yes', 'outer']] },
        complexity: `<p>O(1) time and space; the point is the control flow.</p>`,
        followUps: ['What would change if the catch used <code>throw e;</code>?', 'Add a return inside finally — why does the compiler refuse?']
      },
      tests: { sig: 'int -> string[]', fn: 'traceFlow', cases: [
        [[0], ['try', 'end try', 'finally', 'after']],
        [[1], ['try', 'catch', 'finally', 'after']],
        [[2], ['try', 'return', 'finally']],
        [[3], ['try', 'finally', 'outer']],
        [[4], ['try', 'catch', 'finally', 'outer']],
        [[5], ['try', 'finally', 'outer']]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Custom exceptions, filters and rethrowing
     ====================================================================== */
  var FILTER_CODE = [
    'try { await CallAsync(); }',
    'catch (HttpError e) when (e.Status == 404) { return NotFound(); }',
    'catch (HttpError e) when (e.Status >= 500 && retries < 3) { retries++; goto again; }',
    'catch (HttpError e) when (Log(e)) { }',
    'catch (HttpError) { throw; }'
  ].join('\n');
  function filterSim(input) {
    var codes = String(input === undefined ? '404 503 400' : input).trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (!codes.length || codes.some(function (c) { return isNaN(c) || c < 100 || c > 599; })) throw new Error('Type HTTP status codes between 100 and 599, e.g. 404 503 400');
    if (codes.length > 6) throw new Error('Use at most 6 codes');
    var s = [], retries = 0, logged = [];
    codes.forEach(function (c) {
      s.push({ l: 1, v: { status: c, retries: retries }, out: logged.slice(), narr: 'CallAsync throws <b>HttpError(' + c + ')</b>. First pass: test the filters top to bottom, <i>without unwinding yet</i>.' });
      if (c === 404) { s.push({ l: 2, cls: 'ok', v: { status: c, retries: retries, 'filter 1': 'true' }, out: logged.slice(), narr: 'Filter <code>Status == 404</code> is true → this handler runs.' }); return; }
      s.push({ l: 2, cls: 'bad', v: { status: c, retries: retries, 'filter 1': 'false' }, out: logged.slice(), narr: 'Status is not 404: filter false, clause skipped.' });
      if (c >= 500 && retries < 3) { retries++; s.push({ l: 3, cls: 'ok', v: { status: c, retries: retries, 'filter 2': 'true' }, out: logged.slice(), narr: 'Server error and retries left → handled; we retry.' }); return; }
      s.push({ l: 3, cls: 'bad', v: { status: c, retries: retries, 'filter 2': 'false' }, out: logged.slice(), narr: 'Filter 2 is false (not a 5xx, or out of retries).' });
      logged.push('log: HttpError ' + c);
      s.push({ l: 4, cls: 'bad', v: { status: c, retries: retries, 'filter 3': 'false (side effect: logged)' }, out: logged.slice(), narr: 'The <b>logging filter</b> trick: Log(e) writes the error and returns false, so the stack is still intact when it logs.' });
      s.push({ l: 5, cls: 'ok', v: { status: c, retries: retries }, out: logged.slice(), narr: 'The last clause matches and rethrows with <code>throw;</code> — the original stack trace is preserved.' });
    });
    return codeFrames(FILTER_CODE, s, 'Handler chain with exception filters');
  }
  topics.push({
    title: 'Custom Exceptions, Exception Filters & Rethrowing',
    analogy: `<p>A hospital triage desk does not just shout "patient!". It labels each case — <i>broken arm</i>, <i>allergic reaction</i> — so the right specialist picks it up. A <b>custom exception type</b> is that label. An <b>exception filter</b> is the triage nurse who glances at the chart <i>before</i> sending the patient anywhere: "only cardiology cases with a pulse over 150 go to this room". And <b>rethrowing</b> with ${C('throw;')} is passing the original chart along, not rewriting it in your own handwriting.</p>`,
    explain: `<p><b>When to create your own exception type:</b> when callers need to react to <i>this</i> failure differently from others, or when it carries data they need (an HTTP status, a field name, a retry-after delay). Otherwise reuse the built-in ones: ${C('ArgumentException')}, ${C('InvalidOperationException')}, ${C('NotSupportedException')}.</p>
<h4>1. A good custom exception</h4>
${P(`
public sealed class InsufficientFundsException : Exception
{
    public decimal Balance { get; }
    public decimal Requested { get; }

    public InsufficientFundsException(decimal balance, decimal requested)
        : base($"Balance {balance} is less than {requested}")
    {
        Balance = balance;
        Requested = requested;
    }

    public InsufficientFundsException(string message, Exception inner)
        : base(message, inner) { }
}`)}
<ul><li>Name ends in <b>Exception</b>, derives from ${C('Exception')} (not ${C('ApplicationException')}, which is obsolete advice).</li>
<li>Pass a human-readable message to ${C('base(...)')}; expose the data as read-only properties.</li>
<li>Offer a constructor taking an ${C('inner')} exception so you can <b>wrap</b> a low-level failure without losing it (${C('e.InnerException')}).</li></ul>
<h4>2. Exception filters: catch ... when (condition)</h4>
${P(`
catch (HttpRequestException e) when (e.StatusCode == HttpStatusCode.NotFound) { ... }
catch (Exception e) when (Log(e)) { }          // Log returns false: log without catching`)}
<p>The filter runs <b>before</b> the stack unwinds. If it is false the clause does not match and the search continues — the exception is not caught and rethrown, so the original stack and any debugger break-on-unhandled behaviour stay intact. Filters are better than ${C('catch { if (...) ... else throw; }')}.</p>
<h4>3. Rethrowing: three forms</h4>
${H.table(['Form', 'Effect'], [
      [C('throw;'), 'rethrows the same object, <b>keeps</b> the original stack trace — use this'],
      [C('throw e;'), 'rethrows the same object but <b>resets</b> the stack trace to this line — loses where it really failed (analyzer CA2200)'],
      [C('throw new DataException("load failed", e);'), 'wraps: a new, more meaningful exception with the original as InnerException']
    ])}
<h4>4. Guard clauses in .NET 8</h4>
<p>Throw helpers make argument validation one line: ${C('ArgumentNullException.ThrowIfNull(x)')}, ${C('ArgumentException.ThrowIfNullOrEmpty(name)')}, ${C('ArgumentOutOfRangeException.ThrowIfNegative(count)')}. They fill in the parameter name automatically via ${C('[CallerArgumentExpression]')}.</p>`,
    clues: ['Caller must react differently to this failure → custom exception type with useful properties', 'Handle only some instances of one type (status code, error number) → catch ... when', 'Need to log but not handle → a filter that logs and returns false', 'Rethrow inside a catch → throw; never throw e;'],
    code: [{ lang: 'csharp', run: true, title: 'Custom exception + filters + wrapping (runnable)', code: R`
foreach (var amount in new decimal[] { 30m, 500m, -1m })
{
    try
    {
        var account = new Account(100m);
        account.Withdraw(amount);
        Console.WriteLine($"withdrew {amount}, left {account.Balance}");
    }
    catch (InsufficientFundsException e) when (e.Requested > 2 * e.Balance)
    {
        Console.WriteLine($"way too much: {e.Message}");
    }
    catch (InsufficientFundsException e)
    {
        Console.WriteLine($"short by {e.Requested - e.Balance}");
    }
    catch (ArgumentOutOfRangeException e)
    {
        Console.WriteLine($"bad argument {e.ParamName}");
    }
}

public sealed class InsufficientFundsException(decimal balance, decimal requested)
    : Exception($"Balance {balance} is less than {requested}")
{
    public decimal Balance { get; } = balance;
    public decimal Requested { get; } = requested;
}

public class Account(decimal balance)
{
    public decimal Balance { get; private set; } = balance;

    public void Withdraw(decimal amount)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
        if (amount > Balance) throw new InsufficientFundsException(Balance, amount);
        Balance -= amount;
    }
}` }],
    codeTitle: ['A custom exception in use'],
    viz: { title: 'Which handler wins? (filters run before unwinding)', input: '404 503 400', inputLabel: 'HTTP status codes thrown, one per call', gen: filterSim },
    examples: [
      { title: 'throw; versus throw e;', html: `<p>Both rethrow the same object, but ${C('throw e;')} overwrites the stack trace, so the log points at your catch block instead of the real failure. The first line printed below mentions Inner; the second does not.</p>`, code: R`
static void Inner() => throw new InvalidOperationException("deep");
static string Keep()  { try { Inner(); } catch { throw; } return ""; }
static string Reset() { try { Inner(); } catch (Exception e) { throw e; } return ""; }

try { Keep(); }  catch (Exception e) { Console.WriteLine(e.StackTrace!.Contains("Inner")); }
try { Reset(); } catch (Exception e) { Console.WriteLine(e.StackTrace!.Contains("Inner")); }` },
      { title: 'Wrapping a low-level error', html: `<p>A repository should not leak ${C('IOException')} to its callers; it wraps it in a domain exception and keeps the cause in ${C('InnerException')} for the logs.</p>`, code: R`
try
{
    try { throw new IOException("disk unplugged"); }
    catch (IOException e) { throw new InvalidOperationException("Could not load settings", e); }
}
catch (InvalidOperationException e)
{
    Console.WriteLine($"{e.Message} <- {e.InnerException?.Message}");
}` },
      { title: 'Logging filter', html: `<p>${C('when (Log(e))')} where Log returns false runs your logging code while the throwing frame is still on the stack, and the exception continues to the real handler unchanged.</p>`, code: R`
static bool Log(Exception e) { Console.WriteLine("log: " + e.Message); return false; }
try
{
    try { throw new TimeoutException("slow"); }
    catch (Exception e) when (Log(e)) { Console.WriteLine("never runs"); }
}
catch (TimeoutException) { Console.WriteLine("handled upstream"); }` }
    ],
    deepDive: `<p><b>AggregateException.</b> ${C('Task.Wait()')}, ${C('.Result')} and ${C('Parallel.For')} wrap failures in ${C('AggregateException')}; ${C('await')} unwraps and throws the first inner exception. Use ${C('ae.Flatten().InnerExceptions')} or ${C('ae.Handle(...)')} to process each.</p>
<p><b>Serialization constructors.</b> Older guidance said every exception needs a ${C('(SerializationInfo, StreamingContext)')} constructor. BinaryFormatter is obsolete in .NET 8 and that constructor is marked obsolete (SYSLIB0051), so new exception types skip it.</p>
<p><b>Exception data.</b> ${C('e.Data')} is an ${C('IDictionary')} for attaching context (an order id) without a new type; ${C('e.HResult')} carries a COM-style code; ${C('e.TargetSite')} names the throwing method.</p>
<p><b>Result types vs exceptions.</b> For failures that are part of the domain (validation, "user not found"), many teams return a ${C('Result<T>')} or a discriminated record instead of throwing — explicit in the signature and cheap. Exceptions stay for bugs and environment failures. Module 13 builds a Result type.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a custom exception class with all the constructors is a one-line prompt now. <b>Use AI as a partner:</b> <code>Review my catch blocks: which ones swallow errors, which use throw ex, which catch too broadly?</code> <b>Where AI goes wrong:</b> it still emits the obsolete serialization constructor, derives from ApplicationException, writes ${C('throw ex;')} and adds a custom exception for every method even when ${C('InvalidOperationException')} would do. <b>What you must still own:</b> designing which failures are part of the API contract and what data a caller needs to recover.</p>`,
    problems: [{
      title: 'Overdraft Desk: Filters and Wrapping', level: 'Medium', tags: ['custom exceptions', 'exception filters', 'rethrow'], companies: ['Microsoft', 'JPMorgan'],
      statement: `<p>Implement ${C('Process(int balance, int[] amounts)')} that withdraws each amount in order and returns a log. Define ${C('InsufficientFundsException : Exception')} with a ${C('Shortfall')} property and ${C('BankException : Exception')} that wraps a cause. The account method ${C('Withdraw(amount)')} throws ${C('ArgumentOutOfRangeException')} when ${C('amount <= 0')} and ${C('InsufficientFundsException')} when ${C('amount > balance')} (shortfall = amount − balance); otherwise it subtracts and the desk logs ${C('"ok A"')}. The desk handles each withdrawal:</p>
<ul><li>${C('catch (InsufficientFundsException e) when (e.Shortfall <= 10)')}: allow the overdraft (balance −= amount), log ${C('"overdraft A"')}.</li>
<li>${C('catch (InsufficientFundsException e)')}: log ${C('"declined S"')} with the shortfall, balance unchanged.</li>
<li>${C('catch (ArgumentOutOfRangeException e)')}: throw ${C('new BankException("bad amount", e)')} — the batch stops. The outer caller catches ${C('BankException')} and logs ${C('"error: "')} plus the inner exception's type name.</li></ul>
<p>Finally log ${C('"balance B"')} with the final balance (also after an error).</p>`,
      constraints: `0 ≤ balance ≤ 10<sup>6</sup>, 0 ≤ amounts.Length ≤ 100, −10<sup>6</sup> ≤ amounts[i] ≤ 10<sup>6</sup>`,
      example: `<p>balance = 100, amounts = ${C('[30, 75, 50]')} → ${C('["ok 30", "overdraft 75", "declined 55", "balance -5"]')}.</p>`,
      brute: { why: `<p>Returning error codes from Withdraw works, but every caller must remember to check them, and the "why" (the shortfall) needs an extra out parameter. A typed exception carries the data and cannot be silently ignored.</p>`, code: R`
static List<string> ProcessWithCodes(int balance, int[] amounts)
{
    var log = new List<string>();
    foreach (var a in amounts)
    {
        if (a <= 0) { log.Add("error: ArgumentOutOfRangeException"); break; }
        int shortfall = a - balance;
        if (shortfall <= 0) { balance -= a; log.Add($"ok {a}"); }
        else if (shortfall <= 10) { balance -= a; log.Add($"overdraft {a}"); }
        else log.Add($"declined {shortfall}");
    }
    log.Add($"balance {balance}");
    return log;
}` },
      mcq: { q: 'Both handlers catch InsufficientFundsException. Why must the clause with `when (e.Shortfall <= 10)` come first?', options: ['Clauses are tested top to bottom; an unfiltered clause first would catch every shortfall and the filtered one would never run', 'Filters only work on the last catch clause', 'The compiler sorts catch clauses by filter automatically', 'It does not matter; the most specific filter always wins'], answer: 0, explain: 'The runtime picks the first clause whose type matches and whose filter is true. With the plain clause first, the filtered one is unreachable (the compiler reports CS0160 for that order).' },
      hints: [`<p>Give ${C('InsufficientFundsException')} a constructor ${C('(int shortfall)')} that calls ${C('base($"short by {shortfall}")')} and stores ${C('Shortfall')}.</p>`, `<p>Put the try/catch inside the loop so one declined withdrawal does not stop the batch; the wrap-and-throw escapes the loop on purpose.</p>`, `<p>Wrap the whole loop in ${C('try { ... } catch (BankException e) { log.Add("error: " + e.InnerException!.GetType().Name); } finally { log.Add($"balance {balance}"); }')}.</p>`],
      solution: {
        approach: `<p>The custom exception carries the data the handler needs (Shortfall), so the decision lives in an exception filter rather than in an if inside a catch. Unexpected bad input is translated into the domain's ${C('BankException')}, keeping the original as ${C('InnerException')} for diagnosis.</p>`,
        code: R`
public class InsufficientFundsException : Exception
{
    public int Shortfall { get; }
    public InsufficientFundsException(int shortfall) : base($"short by {shortfall}") => Shortfall = shortfall;
}

public class BankException : Exception
{
    public BankException(string message, Exception inner) : base(message, inner) { }
}

public class Solution
{
    int balance;

    void Withdraw(int amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        if (amount > balance) throw new InsufficientFundsException(amount - balance);
        balance -= amount;
    }

    public string[] Process(int start, int[] amounts)
    {
        balance = start;
        var log = new List<string>();
        try
        {
            foreach (var a in amounts)
            {
                try
                {
                    Withdraw(a);
                    log.Add($"ok {a}");
                }
                catch (InsufficientFundsException e) when (e.Shortfall <= 10)
                {
                    balance -= a;
                    log.Add($"overdraft {a}");
                }
                catch (InsufficientFundsException e)
                {
                    log.Add($"declined {e.Shortfall}");
                }
                catch (ArgumentOutOfRangeException e)
                {
                    throw new BankException("bad amount", e);
                }
            }
        }
        catch (BankException e)
        {
            log.Add("error: " + e.InnerException!.GetType().Name);
        }
        finally
        {
            log.Add($"balance {balance}");
        }
        return log.ToArray();
    }
}`,
        dry: { head: ['amount', 'balance before', 'thrown', 'handler', 'log'], rows: [['30', '100', '—', '—', 'ok 30'], ['75', '70', 'InsufficientFunds(5)', 'filter true', 'overdraft 75'], ['50', '-5', 'InsufficientFunds(55)', 'plain clause', 'declined 55'], ['(end)', '-5', '—', 'finally', 'balance -5']] },
        complexity: `<p>O(n) time, O(n) space for the log. Exceptions are costly, but here they model rare business failures, not the normal path.</p>`,
        followUps: ['Attach the account id via <code>e.Data</code> instead of a new property', 'Why would <code>throw e;</code> in the ArgumentOutOfRange handler be worse than wrapping?']
      },
      tests: { sig: 'int int[] -> string[]', fn: 'process', cases: [
        [[100, [30, 75, 50]], ['ok 30', 'overdraft 75', 'declined 55', 'balance -5']],
        [[50, []], ['balance 50']],
        [[10, [10, 10]], ['ok 10', 'overdraft 10', 'balance -10']],
        [[20, [31, 30]], ['declined 11', 'overdraft 30', 'balance -10']],
        [[100, [40, 0, 20]], ['ok 40', 'error: ArgumentOutOfRangeException', 'balance 60']],
        [[5, [-3]], ['error: ArgumentOutOfRangeException', 'balance 5']],
        [[0, [11, 5, 1]], ['declined 11', 'overdraft 5', 'overdraft 1', 'balance -6']]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 3 — using and IDisposable
     ====================================================================== */
  function disposeSim(input) {
    var parts = String(input === undefined ? '3 2' : input).trim().split(/[\s,]+/).map(Number);
    var n = parts[0], fail = parts.length > 1 ? parts[1] : -1;
    if (isNaN(n) || n < 1 || n > 5 || isNaN(fail) || fail < -1 || fail >= n) throw new Error('Type "n failAt": 1 ≤ n ≤ 5 resources and failAt between -1 (no failure) and n-1');
    var frames = [], open = [], log = [];
    function fr(narr, hl) { frames.push({ narr: narr, parts: [{ type: 'stack', label: 'Open resources (top = most recent)', items: open.slice(), hl: hl || {} }, out(log)] }); }
    fr('Start: nothing is open. Each <code>using var</code> registers a Dispose call for the end of the scope.');
    for (var i = 0; i < n; i++) {
      if (i === fail) {
        log.push('fail opening R' + i);
        var h = {}; if (open.length) h[open.length - 1] = 'bad';
        fr('Opening <b>R' + i + '</b> throws. It was never assigned, so there is nothing to dispose for it. Unwinding starts.', h);
        while (open.length) { var r = open.pop(); log.push('Dispose ' + r); fr('Unwinding: the compiler-generated finally calls <b>' + r + '.Dispose()</b> — newest first.'); }
        log.push('caller catches the exception');
        fr('All resources are released <i>before</i> the caller\'s catch runs.');
        return frames;
      }
      open.push('R' + i); log.push('open R' + i);
      var hh = {}; hh[open.length - 1] = 'ok';
      fr('<code>using var r' + i + ' = Open(' + i + ');</code> — R' + i + ' is open.', hh);
    }
    log.push('work');
    fr('All resources open; the body does its work.');
    while (open.length) { var x = open.pop(); log.push('Dispose ' + x); fr('End of scope: <b>' + x + '.Dispose()</b>. Reverse order of declaration (LIFO), like a stack.'); }
    return frames;
  }
  topics.push({
    title: 'using & IDisposable: Deterministic Cleanup',
    analogy: `<p>The garbage collector is the <b>cleaning crew that comes at night</b>: eventually it clears away every paper cup. But some things cannot wait for the night shift — the meeting room you booked, the door you unlocked, the tap you opened. ${C('IDisposable')} is the rule "whoever opens it, closes it, <i>right now</i>", and ${C('using')} is the sticky note on the door that guarantees you close it on your way out, even if you leave in a hurry because the fire alarm (an exception) went off.</p>`,
    explain: `<p>The GC reclaims <b>memory</b>, but objects often hold <b>other resources</b>: file handles, sockets, database connections, locks, native memory. Those must be released deterministically. The convention is the ${C('IDisposable')} interface with a single method ${C('void Dispose()')}.</p>
<h4>1. using statement and using declaration</h4>
${P(`
using (var reader = new StreamReader(path))      // classic statement: scope = the block
{
    Console.WriteLine(reader.ReadLine());
}

using var writer = new StreamWriter(outPath);    // C# 8 declaration: disposed at the end of the enclosing scope
writer.WriteLine("hi");`)}
<p>The compiler turns ${C('using')} into try/finally:</p>
${P(`
var reader = new StreamReader(path);
try { Console.WriteLine(reader.ReadLine()); }
finally { reader?.Dispose(); }`)}
<p>Several using declarations in one scope are disposed in <b>reverse order</b> of declaration — the last opened is closed first, which is right when later resources depend on earlier ones (a writer on top of a stream).</p>
<h4>2. Implementing IDisposable (no unmanaged state)</h4>
${P(`
public sealed class Session : IDisposable
{
    private readonly FileStream _log;
    private bool _disposed;
    public Session(string path) => _log = File.OpenWrite(path);

    public void Write(byte[] data)
    {
        ObjectDisposedException.ThrowIf(_disposed, this);
        _log.Write(data);
    }

    public void Dispose()
    {
        if (_disposed) return;          // Dispose must be safe to call twice
        _log.Dispose();
        _disposed = true;
    }
}`)}
<ul><li>Dispose must be <b>idempotent</b> (callable many times) and should not throw.</li>
<li>After disposal, other members throw ${C('ObjectDisposedException')}.</li>
<li>If you own a disposable field, you are disposable too. If you were <i>given</i> it, you usually do not dispose it.</li>
<li>The full "dispose pattern" with a finalizer is only for types that directly own unmanaged handles — module 8 covers it and ${C('SafeHandle')}.</li></ul>
<h4>3. IAsyncDisposable</h4>
<p>Resources whose cleanup does I/O (flushing a network stream) implement ${C('ValueTask DisposeAsync()')}; use ${C('await using var conn = ...;')}.</p>
<h4>4. Pattern-based using</h4>
<p>A ${C('ref struct')} cannot implement interfaces, so C# lets ${C('using')} work with any ref struct that has an accessible ${C('Dispose()')} method — that is how ${C('Span')}-based helpers return pooled buffers.</p>`,
    clues: ['The type implements IDisposable → wrap it in using (or own it in a disposable field)', 'Several resources opened in sequence → several using declarations; disposed in reverse', 'Cleanup needs await → IAsyncDisposable + await using', 'A field holds a disposable you created → your class implements IDisposable'],
    code: [{ lang: 'csharp', run: true, title: 'Dispose order and exceptions (runnable)', code: R`
try
{
    using var a = new Res("A");
    using var b = new Res("B");
    Console.WriteLine("working");
    throw new InvalidOperationException("crash");
}
catch (InvalidOperationException e)
{
    Console.WriteLine("caught " + e.Message);
}

sealed class Res : IDisposable
{
    private readonly string _name;
    private bool _disposed;
    public Res(string name) { _name = name; Console.WriteLine("open " + name); }
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        Console.WriteLine("close " + _name);
    }
}` }],
    codeTitle: ['using declarations unwind LIFO'],
    viz: { title: 'Resources open and close like a stack', input: '3 2', inputLabel: '"n failAt" — n resources, failAt = index whose opening throws (-1 = none)', gen: disposeSim },
    examples: [
      { title: 'Lowered form of using', html: `<p>This is what the compiler writes for a using statement. The null check means ${C('using (null)')} is legal and simply does nothing.</p>`, code: R`
var sr = new StringReader("line1");
try { Console.WriteLine(sr.ReadLine()); }
finally { if (sr != null) ((IDisposable)sr).Dispose(); }` },
      { title: 'await using with IAsyncDisposable', html: `<p>DisposeAsync is awaited at the end of the scope, after the body finishes, so asynchronous cleanup such as flushing a network stream does not block a thread.</p>`, code: R`
await using (var conn = new FakeConnection()) { Console.WriteLine("query"); }

sealed class FakeConnection : IAsyncDisposable
{
    public async ValueTask DisposeAsync() { await Task.Yield(); Console.WriteLine("closed async"); }
}` },
      { title: 'Do not dispose what you do not own', html: `<p>A method that receives a ${C('Stream')} as a parameter should not dispose it — the caller may keep using it. Classes like ${C('StreamReader')} expose ${C('leaveOpen: true')} for exactly this reason.</p>`, code: R`
var ms = new MemoryStream();
using (var w = new StreamWriter(ms, leaveOpen: true)) w.Write("abc");
Console.WriteLine(ms.Length); // stream still usable: 3` }
    ],
    deepDive: `<p><b>Exceptions from Dispose.</b> If the body throws and then Dispose also throws, the second exception replaces the first and the original is lost. That is why Dispose should never throw. ${C('Stream.Dispose')} catches flush errors in some paths for this reason.</p>
<p><b>Struct disposables.</b> ${C('using')} on a struct calls Dispose without boxing (the compiler emits a constrained call). ${C('List<T>.Enumerator')} is a disposable struct; ${C('foreach')} disposes enumerators automatically.</p>
<p><b>Ownership transfer.</b> When a factory creates a disposable and hands it back, ownership moves to the caller. If the factory fails half-way it must dispose what it created: ${C('var s = Open(); try { Configure(s); return s; } catch { s.Dispose(); throw; }')}.</p>
<p><b>Dependency injection.</b> In ASP.NET Core the container disposes scoped and transient services it created at the end of the scope; you do not dispose injected services yourself.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code usually remembers ${C('using')} for files but often forgets it for ${C('HttpResponseMessage')}, ${C('CancellationTokenSource')}, timers and ${C('SemaphoreSlim')}. <b>Use AI as a partner:</b> <code>List every IDisposable created in this file and who disposes it</code>. <b>Where AI goes wrong:</b> creating a new ${C('HttpClient')} in a using block per request (socket exhaustion — use IHttpClientFactory or a shared instance), adding finalizers to classes with no unmanaged state, disposing injected services. <b>What you must still own:</b> the ownership model: who creates, who disposes, and when.</p>`,
    problems: [{
      title: 'Transaction Scope That Rolls Back', level: 'Medium', tags: ['IDisposable', 'using', 'exceptions'], companies: ['Microsoft', 'Oracle'],
      statement: `<p>Write a ${C('Tx')} class implementing ${C('IDisposable')}: its constructor logs ${C('"begin"')}, ${C('Write(x)')} logs ${C('"write x"')} (throws ${C('InvalidOperationException')} if already committed), ${C('Commit()')} logs ${C('"commit"')}, and ${C('Dispose()')} logs ${C('"rollback"')} if it was not committed, then ${C('"close"')}. A second Dispose call must do nothing.</p>
<p>Implement ${C('RunBatch(string[] ops)')}: inside ${C('using var tx = new Tx(log);')} run each op — ${C('"commit"')} commits, ${C('"fail"')} throws ${C('InvalidOperationException')}, ${C('"dispose"')} calls ${C('tx.Dispose()')} early, anything else is written. After the scope log ${C('"done"')}. If an exception escapes the scope, catch it outside and log ${C('"error"')} instead of ${C('"done"')}. Return the log.</p>`,
      constraints: `0 ≤ ops.Length ≤ 100`,
      example: `<p>${C('["a", "fail", "b"]')} → ${C('["begin", "write a", "rollback", "close", "error"]')}.</p>`,
      brute: { why: `<p>Calling Rollback in every catch and every early return works until someone adds a new exit path. ${C('using')} turns cleanup into a guarantee: the compiler emits a finally that calls Dispose on every path.</p>`, code: R`
static List<string> RunBatchManual(string[] ops)
{
    var log = new List<string> { "begin" };
    bool committed = false;
    foreach (var op in ops)
    {
        if (op == "fail") { log.Add("rollback"); log.Add("close"); log.Add("error"); return log; }
        if (op == "commit") { committed = true; log.Add("commit"); }
        else log.Add("write " + op);
    }
    if (!committed) log.Add("rollback");
    log.Add("close");
    log.Add("done");
    return log;
}` },
      mcq: { q: 'An op throws inside the using scope and the caller catches it. In what order do things happen?', options: ['tx.Dispose() runs first (rollback, close), then the caller\'s catch', 'The caller\'s catch runs, then Dispose', 'Dispose is skipped because the scope did not finish normally', 'Dispose runs only when the garbage collector finalizes tx'], answer: 0, explain: 'using lowers to try/finally; the finally runs while the exception unwinds, before control reaches the outer catch.' },
      hints: [`<p>Keep two flags in Tx: ${C('committed')} and ${C('disposed')}. Dispose returns immediately when ${C('disposed')} is already true.</p>`, `<p>${C('using var')} disposes at the end of the enclosing block, so put it in its own block or method so ${C('"done"')} is logged after ${C('"close"')}.</p>`, `<p>Wrap the call in ${C('try { Body(ops, log); log.Add("done"); } catch (InvalidOperationException) { log.Add("error"); }')}.</p>`],
      solution: {
        approach: `<p>The transaction's Dispose encodes the safe default: anything not explicitly committed is rolled back. ${C('using')} guarantees Dispose on normal exit, early exit and exceptions, and the idempotence flag makes an early manual Dispose harmless.</p>`,
        code: R`
public class Tx : IDisposable
{
    readonly List<string> log;
    bool committed, disposed;

    public Tx(List<string> log) { this.log = log; log.Add("begin"); }

    public void Write(string x)
    {
        if (committed) throw new InvalidOperationException("already committed");
        log.Add("write " + x);
    }

    public void Commit() { committed = true; log.Add("commit"); }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        if (!committed) log.Add("rollback");
        log.Add("close");
    }
}

public class Solution
{
    public string[] RunBatch(string[] ops)
    {
        var log = new List<string>();
        try
        {
            Body(ops, log);
            log.Add("done");
        }
        catch (InvalidOperationException)
        {
            log.Add("error");
        }
        return log.ToArray();
    }

    static void Body(string[] ops, List<string> log)
    {
        using var tx = new Tx(log);
        foreach (var op in ops)
        {
            switch (op)
            {
                case "commit": tx.Commit(); break;
                case "fail": throw new InvalidOperationException("fail");
                case "dispose": tx.Dispose(); break;
                default: tx.Write(op); break;
            }
        }
    }
}`,
        dry: { head: ['op', 'action', 'log grows by'], rows: [['(start)', 'new Tx', 'begin'], ['a', 'Write', 'write a'], ['fail', 'throw', '—'], ['(unwind)', 'Dispose: not committed', 'rollback, close'], ['(outer)', 'catch', 'error']] },
        complexity: `<p>O(n) time and space for the log.</p>`,
        followUps: ['Make it <code>IAsyncDisposable</code> with an async rollback', 'What should happen if Dispose itself throws during unwinding?']
      },
      tests: { sig: 'string[] -> string[]', fn: 'runBatch', cases: [
        [[['a', 'fail', 'b']], ['begin', 'write a', 'rollback', 'close', 'error']],
        [[['a', 'b', 'commit']], ['begin', 'write a', 'write b', 'commit', 'close', 'done']],
        [[[]], ['begin', 'rollback', 'close', 'done']],
        [[['x']], ['begin', 'write x', 'rollback', 'close', 'done']],
        [[['commit', 'fail']], ['begin', 'commit', 'close', 'error']],
        [[['commit', 'y']], ['begin', 'commit', 'close', 'error']],
        [[['a', 'dispose', 'commit']], ['begin', 'write a', 'rollback', 'close', 'commit', 'done']]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Nullable value types
     ====================================================================== */
  function nullableSim(input) {
    var p = String(input === undefined ? '5 null' : input).trim().split(/[\s,]+/);
    if (p.length !== 2) throw new Error('Type two values: a number or null, e.g. "5 null"');
    function parse(x) { if (x === 'null') return null; var n = parseInt(x, 10); if (isNaN(n)) throw new Error('Values must be integers or null'); return n; }
    var a = parse(p[0]), b = parse(p[1]);
    function show(v) { return v === null ? 'null' : String(v); }
    function st(v) { return v === null ? '{ HasValue=false, value=0 }' : '{ HasValue=true, value=' + v + ' }'; }
    var frames = [];
    function f(narr, vals, hl) { frames.push({ narr: narr, parts: [{ type: 'vars', label: 'Nullable&lt;int&gt; is a struct: bool + int', vals: vals, hl: hl || {} }, { type: 'text', label: 'Rule', html: 'Lifted operators: if <b>either</b> operand is null, arithmetic gives null; comparisons &lt; &gt; give <b>false</b>; == compares HasValue first.' }] }); }
    f('<code>int? a = ' + show(a) + '; int? b = ' + show(b) + ';</code> — no heap allocation, each is a struct with a flag.', { a: st(a), b: st(b) });
    var sum = (a === null || b === null) ? null : a + b;
    f('<code>a + b</code> uses the <b>lifted</b> + operator → ' + show(sum) + '.', { a: show(a), b: show(b), 'a + b': show(sum) }, { 'a + b': sum === null ? 'bad' : 'ok' });
    var lt = (a === null || b === null) ? false : a < b;
    f('<code>a &lt; b</code> → ' + lt + (a === null || b === null ? ' (a null operand makes every relational comparison false — even a &gt;= b is false)' : '') + '.', { 'a < b': String(lt), 'a >= b': String(a === null || b === null ? false : a >= b) });
    var eq = (a === null && b === null) ? true : (a === null || b === null) ? false : a === b;
    f('<code>a == b</code> → ' + eq + ' (two nulls are equal).', { 'a == b': String(eq) });
    f('<code>a ?? 0</code> → ' + (a === null ? 0 : a) + ' and <code>a.GetValueOrDefault()</code> → ' + (a === null ? 0 : a) + '. <code>a.Value</code> ' + (a === null ? '<span class="c-r">throws InvalidOperationException</span>' : '→ ' + a) + '.', { 'a ?? 0': String(a === null ? 0 : a), 'a.Value': a === null ? 'throws' : String(a) }, { 'a.Value': a === null ? 'bad' : 'ok' });
    return frames;
  }
  topics.push({
    title: 'Nullable Value Types: int?, HasValue and Lifted Operators',
    analogy: `<p>A paper form has a box "Age: ___". An empty box is not the same as "0" — maybe the person did not answer. A plain ${C('int')} cannot express "not answered"; it always has a number. ${C('int?')} adds a tiny <b>tick box</b> next to the number: "this value was filled in". That tick box is ${C('HasValue')}.</p>`,
    explain: `<p>Value types (${C('int')}, ${C('double')}, ${C('DateTime')}, your structs) can never be null. ${C('T?')} for a value type is shorthand for the struct ${C('Nullable<T>')}, which stores a ${C('bool hasValue')} and a ${C('T value')}. It lives inline (stack or inside the containing object) — no allocation.</p>
${P(`
int? age = null;
Console.WriteLine(age.HasValue);              // False
Console.WriteLine(age.GetValueOrDefault());   // 0
Console.WriteLine(age ?? -1);                 // -1
age = 30;
if (age is int a) Console.WriteLine(a + 1);   // 31, pattern unwraps
int x = age.Value;                            // ok now; throws InvalidOperationException when null
int y = (int)age;                             // same as .Value`)}
<h4>Lifted operators</h4>
${H.table(['Expression', 'If an operand is null'], [
      [C('a + b, a * b, -a'), 'result is null'],
      [C('a < b, a >= b'), 'false (so a < b and a >= b can both be false!)'],
      [C('a == b, a != b'), 'null == null is true; null == 5 is false'],
      [C('bool? & |'), 'three-valued logic: null & false is false, null | true is true']
    ])}
<h4>When to use int?</h4>
<ul><li>Optional data from a database column (NULL), JSON or a form.</li>
<li>"Not computed yet" in a cache or DP table, instead of a magic −1.</li>
<li>Return values like ${C('int? IndexOf(...)')} — though ${C('TryXxx(out)')} is the established .NET style.</li></ul>
<h4>Boxing</h4>
<p>Boxing a ${C('Nullable<T>')} is special: a null value boxes to a <b>null reference</b>, and a non-null value boxes to a boxed ${C('T')} (not a boxed Nullable). So ${C('(object)(int?)5 is int')} is true.</p>`,
    clues: ['A number that may be "missing" (DB NULL, optional field) → int?', 'Avoid magic sentinels like -1 or int.MinValue → use T?', 'Comparing nullable numbers → remember null makes < and > false', 'Reading the value → ?? default, GetValueOrDefault, or pattern is int x'],
    code: [{ lang: 'csharp', run: true, title: 'int? in practice (runnable)', code: R`
int?[] scores = { 90, null, 75, null, 100 };

int answered = scores.Count(s => s.HasValue);
double avg = scores.Where(s => s is not null).Average(s => s!.Value);
int? total = null;
foreach (var s in scores) total = (total ?? 0) + (s ?? 0);

Console.WriteLine($"answered {answered}, average {avg:F1}, total {total}");

int? a = null, b = 3;
Console.WriteLine(a + b == null);       // True: lifted +
Console.WriteLine(a < b);               // False
Console.WriteLine(a >= b);              // False too
Console.WriteLine((object?)a == null);  // True: null Nullable boxes to null` }],
    codeTitle: ['Counting, averaging and lifted operators'],
    viz: { title: 'Nullable<int> step by step', input: '5 null', inputLabel: 'two values "a b" (integers or null)', gen: nullableSim },
    examples: [
      { title: 'Memo table with int?', html: `<p>Using ${C('int?[]')} for memoization avoids choosing a sentinel that might also be a real answer.</p>`, code: R`
var memo = new long?[91];
Console.WriteLine(Fib(90));
long Fib(int n) => n < 2 ? n : memo[n] ??= Fib(n - 1) + Fib(n - 2);` },
      { title: 'Pattern matching unwraps nullable', html: `<p>${C('is int v')} succeeds only when HasValue is true and gives you the underlying ${C('int')}.</p>`, code: R`
int? maybe = DateTime.Now.Year > 2000 ? 7 : null;
if (maybe is int v) Console.WriteLine(v * 2);
Console.WriteLine(maybe is > 5);` },
      { title: 'Three-valued bool?', html: `<p>${C('bool?')} follows SQL-like logic for ${C('&')} and ${C('|')}. ${C('&&')} and ${C('||')} are not defined for ${C('bool?')}.</p>`, code: R`
bool? unknown = null;
Console.WriteLine((unknown & false) == false);  // True
Console.WriteLine((unknown | true) == true);    // True
Console.WriteLine((unknown & true) == null);    // True` }
    ],
    deepDive: `<p><b>Layout.</b> ${C('Nullable<T>')} is ${C('struct { bool hasValue; T value; }')}, so ${C('int?')} is 8 bytes (4 + 1 + padding) and ${C('long?')} is 16. An array of a million ${C('long?')} costs twice an array of ${C('long')}.</p>
<p><b>Constraint.</b> ${C('Nullable<T>')} has ${C('where T : struct')}, so ${C('int??')} is impossible. Generic code that wants "T or nothing" for both value and reference types needs ${C('T?')} with care (see next topic) or overloads.</p>
<p><b>Equality and GetHashCode.</b> ${C('Nullable<T>.Equals(object)')} treats null as equal to null; ${C('GetHashCode')} of a null value is 0. ${C('Nullable.Compare')} orders null before all values — unlike the lifted ${C('<')}.</p>
<p><b>Performance.</b> The JIT handles Nullable well (no boxing on HasValue/Value), but boxing through ${C('object')} or non-generic interfaces still allocates. LINQ ${C('Sum')} over ${C('int?')} skips nulls.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated DTOs often mark every number as ${C('int?')} "to be safe", pushing null checks everywhere. <b>Use AI as a partner:</b> ask <code>Which of these fields can really be missing according to the schema?</code> <b>Where AI goes wrong:</b> using ${C('.Value')} without a check, assuming ${C('a < b || a >= b')} is always true, choosing ${C('-1')} sentinels in DP tables where −1 is a valid answer. <b>What you must still own:</b> the domain decision of what "missing" means and where it must be resolved to a real value.</p>`,
    problems: [{
      title: 'Summarize Readings With Gaps', level: 'Easy', tags: ['nullable value types', 'lifted operators', '??'], companies: ['Siemens', 'Microsoft'],
      statement: `<p>A sensor logs one reading per hour as ${C('int?')}; ${C('null')} means the sensor was offline. Implement ${C('Summarize(int?[] readings)')} returning ${C('"count sum max"')}: how many readings are present, their sum, and the largest one — or the word ${C('none')} for max when no reading is present. Track the maximum as an ${C('int?')} instead of choosing a sentinel such as ${C('int.MinValue')}. (The tests pass readings as strings, ${C('"null"')} for a gap; a small harness turns them into ${C('int?[]')}.)</p>`,
      constraints: `0 ≤ readings.Length ≤ 10<sup>5</sup>, −10<sup>4</sup> ≤ reading ≤ 10<sup>4</sup>`,
      example: `<p>${C('[90, null, 75, null, 100]')} → ${C('"3 265 100"')}; ${C('[null, null]')} → ${C('"0 0 none"')}.</p>`,
      brute: { why: `<p>Starting max at ${C('int.MinValue')} works for the number but then "no reading" and "a reading of int.MinValue" look the same, and you need a separate flag to print none. ${C('int? max = null')} carries that flag for free.</p>`, code: R`
static string SummarizeSentinel(int?[] readings)
{
    int count = 0, sum = 0, max = int.MinValue;
    foreach (var r in readings)
    {
        if (!r.HasValue) continue;
        count++; sum += r.Value;
        if (r.Value > max) max = r.Value;
    }
    return $"{count} {sum} {(count == 0 ? "none" : max.ToString())}";
}` },
      mcq: { q: 'A beginner writes `int? max = null; foreach (var r in readings) if (r > max) max = r;`. What does max hold afterwards?', options: ['null — every comparison with a null operand is false, so it is never assigned', 'The largest reading', 'The first non-null reading', 'It throws InvalidOperationException'], answer: 0, explain: 'The lifted > returns false when either side is null. Since max starts null, r > max is always false. Test `max is null || v > max` instead.' },
      hints: [`<p>${C('if (r is int v)')} both checks HasValue and unwraps the value.</p>`, `<p>Update with ${C('if (max is null || v > max) max = v;')} — the null check handles the first reading.</p>`, `<p>Format the result with ${C('max?.ToString() ?? "none"')}.</p>`],
      solution: {
        approach: `<p>Skip gaps with a pattern that unwraps the value, and let the ${C('int?')} maximum represent "nothing seen yet". The lifted comparison ${C('v > max')} is only reached when max has a value, and ${C('?.')}/${C('??')} turn the empty case into ${C('none')}.</p>`,
        code: R`
public class Solution
{
    public string Summarize(int?[] readings)
    {
        int count = 0, sum = 0;
        int? max = null;
        foreach (var r in readings)
        {
            if (r is int v)
            {
                count++;
                sum += v;
                if (max is null || v > max) max = v;
            }
        }
        return $"{count} {sum} {max?.ToString() ?? "none"}";
    }
}`,
        dry: { head: ['reading', 'count', 'sum', 'max'], rows: [['90', '1', '90', '90'], ['null', '1', '90', '90'], ['75', '2', '165', '90'], ['null', '2', '165', '90'], ['100', '3', '265', '100']] },
        complexity: `<p>O(n) time, O(1) extra space.</p>`,
        followUps: ['Return the average as <code>double?</code> (null when nothing present)', 'What does <code>readings.Max()</code> return for an all-null <code>int?[]</code>?']
      },
      tests: { sig: 'string[] -> string', fn: 'summarizeTokens', harness: { csharp: 'public static class Check { public static string SummarizeTokens(string[] t) => new Solution().Summarize(t.Select(x => x == "null" ? (int?)null : int.Parse(x)).ToArray()); }' }, cases: [
        [[['90', 'null', '75', 'null', '100']], '3 265 100'],
        [[[]], '0 0 none'],
        [[['null', 'null']], '0 0 none'],
        [[['-5']], '1 -5 -5'],
        [[['-3', 'null', '-7']], '2 -10 -3'],
        [[['0', 'null', '4', '4']], '3 8 4'],
        [[['null', '0']], '1 0 0']
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Nullable reference types and the null operators
     ====================================================================== */
  function nullOpsSim(input) {
    var s = String(input === undefined ? 'address' : input).trim().toLowerCase();
    var opts = ['none', 'user', 'address', 'city'];
    if (opts.indexOf(s) < 0) throw new Error('Type which link is null: none, user, address or city');
    var code = 'string city = user?.Address?.City ?? "unknown";';
    var frames = [], chain = ['user', 'user.Address', 'user.Address.City'];
    var nullAt = { none: -1, user: 0, address: 1, city: 2 }[s];
    frames.push({ narr: 'Evaluate <code>user?.Address?.City ?? "unknown"</code> with <b>' + (nullAt < 0 ? 'nothing' : chain[nullAt]) + '</b> null.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 1: 'cur' } }, { type: 'list', label: 'Member chain', values: chain }] });
    for (var i = 0; i < 3; i++) {
      var ptr = {}; ptr[i] = 'here';
      var hl = {}; hl[i] = i === nullAt ? 'bad' : 'ok';
      if (i === nullAt) {
        frames.push({ narr: '<b>' + chain[i] + '</b> is null. <code>?.</code> <b>short-circuits</b>: the rest of the chain is skipped and the whole expression is null — no NullReferenceException.', parts: [{ type: 'array', label: 'Member chain', values: chain, ptr: ptr, hl: hl }, { type: 'vars', vals: { 'chain result': 'null' }, hl: { 'chain result': 'bad' } }] });
        break;
      }
      frames.push({ narr: '<b>' + chain[i] + '</b> is not null, continue to the next member.', parts: [{ type: 'array', label: 'Member chain', values: chain, ptr: ptr, hl: hl }] });
    }
    var res = nullAt < 0 ? '"Pune"' : '"unknown"';
    frames.push({ narr: nullAt < 0 ? 'The chain produced "Pune"; <code>??</code> keeps the left side.' : '<code>??</code> sees null on the left and evaluates the right side: "unknown".', parts: [{ type: 'vars', vals: { city: res }, hl: { city: 'ok' } }, { type: 'code', lang: 'csharp', code: code, hl: { 1: 'ok' } }] });
    return frames;
  }
  topics.push({
    title: 'Nullable Reference Types & the Null Operators',
    analogy: `<p>Before nullable reference types, every reference in C# was a parcel that <i>might</i> be empty, and you only found out when you opened it in front of a customer (NullReferenceException). With ${C('#nullable enable')} every parcel gets a <b>label</b>: ${C('string')} means "guaranteed to contain something", ${C('string?')} means "may be empty — check before opening". The compiler is the warehouse inspector who reads the labels and warns you when you open an unchecked ${C('string?')} parcel.</p>`,
    explain: `<p>Since C# 8 with ${C('<Nullable>enable</Nullable>')} (the default in new .NET 8 projects), the compiler tracks null-state for reference types. ${C('string')} is non-nullable; ${C('string?')} may be null. It is <b>static analysis only</b>: the runtime type is the same, and violations produce <b>warnings</b> (CS8600–CS8625), not errors — unless you turn on ${C('TreatWarningsAsErrors')}.</p>
${P(`
string name = null;            // warning CS8600: null into non-nullable
string? nick = null;           // fine
int len = nick.Length;         // warning CS8602: possible null dereference
if (nick is not null) len = nick.Length;   // flow analysis: no warning here`)}
<h4>The null operators</h4>
${H.table(['Operator', 'Meaning', 'Example'], [
      [C('?.') + ' / ' + C('?[]'), 'member/index access that yields null instead of throwing; short-circuits the rest of the chain', C('order?.Customer?.Name')],
      [C('??'), 'left if not null, else right (right evaluated only if needed)', C('name ?? "anon"')],
      [C('??='), 'assign only if currently null', C('cache ??= Load()')],
      [C('!'), '"null-forgiving": tell the compiler you know it is not null (no runtime check!)', C('FindUser(id)!.Name')],
      [C('is null / is not null'), 'null test that cannot be fooled by an overloaded ==', C('if (x is null) return;')]
    ])}
<h4>Flow analysis helpers</h4>
<p>Attributes from ${C('System.Diagnostics.CodeAnalysis')} teach the compiler about your methods: ${C('[NotNullWhen(true)]')} on a TryGet out parameter, ${C('[MaybeNull]')}, ${C('[NotNull]')}, ${C('[MemberNotNull(nameof(_x))]')} on an init helper. ${C('string.IsNullOrEmpty')} is already annotated, so after ${C('if (!string.IsNullOrEmpty(s))')} the compiler knows ${C('s')} is not null.</p>
<h4>Guarding public APIs</h4>
<p>Annotations do not stop a caller with nullable disabled (or using ${C('!')}) from passing null. Public methods still validate: ${C('ArgumentNullException.ThrowIfNull(arg);')}.</p>
<h4>Required members</h4>
<p>${C('required')} properties (C# 11) force object initializers to set them, which removes most "non-nullable property is uninitialized" warnings (CS8618) on DTOs: ${C('public required string Name { get; init; }')}.</p>`,
    clues: ['A reference that can legitimately be absent → T? and handle null at the boundary', 'Optional chain of members → ?. then ?? default', 'Lazy initialisation of a field → ??=', 'Warning you know is false → fix the flow or annotate; use ! only as a last resort'],
    code: [{ lang: 'csharp', run: true, title: 'The operators together (runnable)', code: R`
var people = new List<Person?>
{
    new("Asha", new Address("Pune")),
    new("Ben", null),
    null
};

foreach (var p in people)
{
    string city = p?.Home?.City ?? "unknown";
    int nameLength = p?.Name.Length ?? 0;
    Console.WriteLine($"{p?.Name ?? "(nobody)"}: {city}, {nameLength}");
}

Dictionary<string, List<int>>? index = null;
index ??= new();
(index.TryGetValue("x", out var list) ? list : index["x"] = new()).Add(1);
Console.WriteLine(index["x"].Count);

record Address(string City);
record Person(string Name, Address? Home);` }],
    codeTitle: ['?. ?? ??= with nullable annotations'],
    viz: { title: 'Short-circuiting a ?. chain', input: 'address', inputLabel: 'which link is null: none, user, address, city', gen: nullOpsSim },
    examples: [
      { title: 'TryGet with [NotNullWhen]', html: `<p>The attribute tells callers that when the method returns true the out value is not null, so no warning after the check.</p>`, code: R`
using System.Diagnostics.CodeAnalysis;

var repo = new Repo();
if (repo.TryFind(1, out var name)) Console.WriteLine(name.Length);

class Repo
{
    public bool TryFind(int id, [NotNullWhen(true)] out string? name)
    {
        name = id == 1 ? "Asha" : null;
        return name is not null;
    }
}` },
      { title: '?? with throw expressions', html: `<p>A throw expression on the right of ${C('??')} turns "null means bug" into an immediate, well-named exception.</p>`, code: R`
string? configured = Environment.GetEnvironmentVariable("NO_SUCH_VAR_123");
try
{
    string path = configured ?? throw new InvalidOperationException("PATH setting missing");
    Console.WriteLine(path);
}
catch (InvalidOperationException e) { Console.WriteLine(e.Message); }` },
      { title: '! hides, it does not fix', html: `<p>The null-forgiving operator silences the warning but the runtime still throws when the value is null. Treat each ${C('!')} as a claim you must be able to prove.</p>`, code: R`
string? maybe = args.Length > 100 ? "x" : null;
try { Console.WriteLine(maybe!.Length); }
catch (NullReferenceException) { Console.WriteLine("! did not protect us"); }` }
    ],
    deepDive: `<p><b>How it is encoded.</b> The compiler emits ${C('[Nullable]')} and ${C('[NullableContext]')} attributes in metadata, so annotations flow across assemblies. Generic type parameters have three states: ${C('T')} (unknown), ${C('T?')} (maybe null), and with ${C('where T : notnull')} guaranteed non-null.</p>
<p><b>T? in generics.</b> For an unconstrained ${C('T')}, ${C('T?')} means "default(T) allowed": for reference types it is null, but for ${C('int')} it is just ${C('int')} (0), <b>not</b> ${C('Nullable<int>')}. That surprises people writing ${C('T? Find<T>(...)')}.</p>
<p><b>Arrays and fields.</b> The compiler cannot track array elements or fields modified by other methods precisely; a ${C('new string[10]')} is full of nulls but typed ${C('string[]')}. Constructors must initialise non-nullable fields (CS8618) — ${C('required')} or ${C('= default!')} (an explicit lie) are the escape hatches.</p>
<p><b>Migration.</b> Large codebases enable it file by file with ${C('#nullable enable')}, fixing warnings outward from leaf types. ${C('#nullable disable warnings')} keeps annotations but silences warnings during migration.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at mechanically adding ${C('?')} and ${C('!')} until warnings disappear — which is exactly the wrong fix. <b>Use AI as a partner:</b> <code>For each nullable warning, tell me whether the value can really be null at runtime and where it should be validated.</code> <b>Where AI goes wrong:</b> sprinkling ${C('!')}, using ${C('== null')} on types with overloaded operators, assuming annotations validate input at runtime, confusing ${C('T?')} for unconstrained generics with ${C('Nullable<T>')}. <b>What you must still own:</b> a null policy for your codebase: where nulls may enter and where they are converted to real values or errors.</p>`,
    problems: [{
      title: 'First Usable Name', level: 'Easy', tags: ['nullable reference types', 'null operators'],
      statement: `<p>Given an array of names where entries may be ${C('null')}, empty or whitespace, return the first entry that has visible characters, trimmed. If there is none return ${C('"anonymous"')}. Use nullable annotations: the parameter is ${C('string?[]')}.</p>`,
      constraints: `0 ≤ names.Length ≤ 10<sup>5</sup>`,
      example: `<p>${C('[null, "  ", " Ann "]')} → ${C('"Ann"')}; ${C('[]')} → ${C('"anonymous"')}.</p>`,
      brute: { why: `<p>Checking ${C('s != null && s.Trim().Length > 0')} works but allocates a trimmed copy for every entry. ${C('string.IsNullOrWhiteSpace')} scans without allocating and is annotated for flow analysis.</p>`, code: R`
static string FirstNameBrute(string?[] names)
{
    foreach (var s in names)
        if (s != null && s.Trim().Length > 0) return s.Trim();
    return "anonymous";
}` },
      mcq: { q: 'After `if (!string.IsNullOrWhiteSpace(s))`, why can you call `s.Trim()` without a warning?', options: ['IsNullOrWhiteSpace is annotated with [NotNullWhen(false)]', 'The compiler inlines the method', 'string? is not really nullable', 'Trim accepts null'], answer: 0, explain: 'The BCL annotates the parameter so the compiler knows s is non-null when the method returns false.' },
      hints: [`<p>Loop with ${C('foreach')}; skip entries for which ${C('string.IsNullOrWhiteSpace')} is true.</p>`, `<p>Return ${C('s.Trim()')} for the first good one; if the loop ends, return the default.</p>`, `<p>Alternatively: ${C('names.FirstOrDefault(s => !string.IsNullOrWhiteSpace(s))?.Trim() ?? "anonymous"')}.</p>`],
      solution: {
        approach: `<p>One pass. ${C('IsNullOrWhiteSpace')} handles null, empty and whitespace in one call; ${C('?.')} and ${C('??')} turn the "nothing found" case into the default without branches.</p>`,
        code: R`
public class Solution
{
    public string FirstName(string?[] names) =>
        names.FirstOrDefault(s => !string.IsNullOrWhiteSpace(s))?.Trim() ?? "anonymous";
}`,
        dry: { head: ['entry', 'IsNullOrWhiteSpace', 'action'], rows: [['null', 'true', 'skip'], ['"  "', 'true', 'skip'], ['" Ann "', 'false', 'return "Ann"']] },
        complexity: `<p>O(total length) time, O(1) extra space besides the result.</p>`,
        followUps: ['Return all usable names, distinct, in order', 'What does FirstOrDefault return for an empty array of string?']
      },
      tests: { sig: 'string[] -> string', fn: 'firstName', cases: [
        [[[null, '  ', ' Ann ']], 'Ann'],
        [[[]], 'anonymous'],
        [[[null]], 'anonymous'],
        [[['  Bob ']], 'Bob'],
        [[['', 'x', 'y']], 'x'],
        [[[' ', null, '\t']], 'anonymous']
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 6 — switch expressions, type and property patterns
     ====================================================================== */
  var SHAPES = { circle: 'new Circle(2)', square: 'new Square(0)', rect: 'new Rect(3, 4)', tri: 'new Triangle(3, 4, 5)', str: '"hello"', nul: 'null' };
  var SW_CODE = [
    'static string Describe(object? o) => o switch',
    '{',
    '    null                      => "nothing",',
    '    Circle { Radius: 0 }      => "a dot",',
    '    Circle c                  => $"circle area {Math.PI * c.Radius * c.Radius:F1}",',
    '    Square { Side: 0 }        => "a dot",',
    '    Rect(var w, var h) when w == h => "square-ish rect",',
    '    Rect(var w, var h)        => $"rect {w * h}",',
    '    string { Length: > 3 } s  => $"long text {s}",',
    '    _                         => "something else"',
    '};'
  ].join('\n');
  function switchSim(input) {
    var k = String(input === undefined ? 'rect' : input).trim().toLowerCase();
    if (!SHAPES[k]) throw new Error('Type one of: ' + Object.keys(SHAPES).join(', '));
    var arms = [
      { line: 3, test: function () { return k === 'nul'; }, why: 'null pattern', res: '"nothing"' },
      { line: 4, test: function () { return false; }, why: 'type Circle AND property Radius == 0', res: '"a dot"' },
      { line: 5, test: function () { return k === 'circle'; }, why: 'type pattern Circle with designation c', res: '"circle area 12.6"' },
      { line: 6, test: function () { return k === 'square'; }, why: 'type Square AND Side == 0', res: '"a dot"' },
      { line: 7, test: function () { return false; }, why: 'positional pattern (Deconstruct) + when guard w == h', res: '"square-ish rect"' },
      { line: 8, test: function () { return k === 'rect'; }, why: 'positional pattern Rect(var w, var h)', res: '"rect 12"' },
      { line: 9, test: function () { return k === 'str'; }, why: 'type string AND Length > 3', res: '"long text hello"' },
      { line: 10, test: function () { return true; }, why: 'discard _ matches anything', res: '"something else"' }
    ];
    var s = [{ l: 1, v: { o: SHAPES[k] }, narr: 'Evaluate <code>Describe(' + H.esc(SHAPES[k]) + ')</code>. Arms are tried <b>top to bottom</b>.' }];
    for (var i = 0; i < arms.length; i++) {
      var a = arms[i], ok = a.test();
      s.push({ l: a.line, cls: ok ? 'ok' : 'bad', v: { o: SHAPES[k], arm: a.why, matches: String(ok) }, hv: { matches: ok ? 'ok' : 'bad' }, narr: ok ? 'Match: ' + a.why + ' → result <b>' + H.esc(a.res) + '</b>.' : 'No match (' + a.why + '), try the next arm.' });
      if (ok) break;
    }
    s.push({ l: 11, v: { result: s[s.length - 1].narr.replace(/.*result <b>|<\/b>.*/g, '') }, narr: 'The switch expression yields the value of the first matching arm. If no arm matched, a <b>SwitchExpressionException</b> would be thrown — the discard arm prevents that.' });
    return codeFrames(SW_CODE, s);
  }
  topics.push({
    title: 'switch Expressions, Type & Property Patterns',
    analogy: `<p>A post-office sorter looks at each parcel and asks a series of questions in order: "Is it empty? Is it an envelope? Is it a box heavier than 20 kg? Is it addressed abroad?" — the first rule that fits decides the chute. A ${C('switch')} expression is that sorting machine: each <b>arm</b> is a rule written as a <b>pattern</b> describing the shape of the data, and the first matching arm wins.</p>`,
    explain: `<p>Pattern matching lets you test a value's <b>type</b>, <b>properties</b>, <b>positional parts</b> and <b>ranges</b> declaratively, and extract parts into variables at the same time.</p>
<h4>1. switch expression (C# 8)</h4>
${P(`
string Grade(int score) => score switch
{
    >= 90 => "A",
    >= 75 => "B",
    >= 50 => "C",
    _     => "F"
};`)}
<p>It is an <b>expression</b> (produces a value), arms are separated by commas, ${C('_')} is the discard (default). If no arm matches at run time, ${C('SwitchExpressionException')} is thrown; the compiler warns (CS8509) when it can see the arms are not exhaustive, and errors (CS8510) for an arm that can never be reached because an earlier one subsumes it.</p>
<h4>2. Pattern kinds in this topic</h4>
${H.table(['Pattern', 'Example', 'Matches when'], [
      ['constant', C('null, 0, "yes"'), 'equal to the constant'],
      ['type / declaration', C('Circle c'), 'o is a Circle (not null); binds c'],
      ['property', C('Order { Total: > 100, Customer.Vip: true }'), 'type matches and every listed property matches (extended property pattern with dots, C# 10)'],
      ['positional', C('Point(0, var y)'), 'type has Deconstruct (records do) and the parts match'],
      ['tuple', C('(i % 3, i % 5) switch { (0, 0) => ... }'), 'each element matches'],
      ['var', C('var x'), 'always; just binds'],
      ['discard', C('_'), 'always']
    ])}
<h4>3. is with patterns</h4>
${P(`
if (shape is Circle { Radius: > 10 } big) Console.WriteLine(big.Radius);
if (obj is not string) return;`)}
<h4>4. Guards</h4>
<p>${C('when')} adds an arbitrary boolean condition to an arm: ${C('Rect(var w, var h) when w == h => ...')}. Use it when a pattern cannot express the condition (comparing two parts with each other).</p>
<h4>5. Why prefer it to if/else chains and virtual methods?</h4>
<p>For closed sets of data shapes (an expression tree, a message type, an event) a switch over records keeps all the cases of one <i>operation</i> in one place and the compiler checks the order. Virtual methods keep all operations of one <i>type</i> together. Choose by which axis changes more often (the "expression problem").</p>`,
    clues: ['Map one value to another by cases → switch expression', 'Branch on runtime type and use its members → type pattern with a designation', 'Condition on nested properties → property pattern with dots', 'Two values decide together → switch on a tuple'],
    code: [{ lang: 'csharp', run: true, title: 'Shapes with type, property and positional patterns (runnable)', code: R`
object?[] items = { new Circle(2), new Circle(0), new Rect(3, 3), new Rect(3, 4), "hello", "hi", null, 42 };
foreach (var item in items) Console.WriteLine(Describe(item));

static string Describe(object? o) => o switch
{
    null => "nothing",
    Circle { Radius: 0 } => "a dot",
    Circle c => $"circle area {Math.PI * c.Radius * c.Radius:F1}",
    Rect(var w, var h) when w == h => $"square {w}x{h}",
    Rect(var w, var h) => $"rect {w * h}",
    string { Length: > 3 } s => $"long text {s}",
    string s => $"short text {s}",
    int n => $"number {n}",
    _ => "something else"
};

record Circle(double Radius);
record Rect(double W, double H);` }],
    codeTitle: ['One switch, many pattern kinds'],
    viz: { title: 'Which arm matches?', input: 'rect', inputLabel: 'value: circle, square, rect, tri, str, nul', gen: switchSim },
    examples: [
      { title: 'Tuple pattern FizzBuzz', html: `<p>Switching on a tuple keeps the four cases flat and readable.</p>`, code: R`
for (int i = 1; i <= 15; i++)
    Console.Write((i % 3, i % 5) switch
    {
        (0, 0) => "FizzBuzz ",
        (0, _) => "Fizz ",
        (_, 0) => "Buzz ",
        _ => $"{i} "
    });` },
      { title: 'Extended property pattern', html: `<p>Dots reach into nested properties (C# 10). Null at any step simply fails the match.</p>`, code: R`
var o = new Order(250m, new Customer("Asha", Vip: true));
string label = o switch
{
    { Customer.Vip: true, Total: > 200m } => "priority",
    { Total: > 200m } => "large",
    _ => "normal"
};
Console.WriteLine(label);

record Customer(string Name, bool Vip);
record Order(decimal Total, Customer? Customer);` },
      { title: 'Deconstruct makes any class positional', html: `<p>Records get ${C('Deconstruct')} automatically; for your own class write one.</p>`, code: R`
var p = new Pt(0, 5);
Console.WriteLine(p switch { (0, 0) => "origin", (0, var y) => $"on y axis at {y}", _ => "elsewhere" });

class Pt(int x, int y)
{
    public void Deconstruct(out int a, out int b) { a = x; b = y; }
}` }
    ],
    deepDive: `<p><b>Compilation.</b> The compiler builds a <b>decision DAG</b> from all arms: each type test and property read is done at most once, then shared between arms. Integer constant arms become a jump table, strings a hash-based switch. So a long switch expression is usually faster than an equivalent if/else chain.</p>
<p><b>Exhaustiveness.</b> For enums the compiler cannot prove exhaustiveness (any int can be cast to an enum), so a discard arm is still needed. For ${C('bool')} and for sealed hierarchies... C# has no sealed hierarchies yet, so a discard (often throwing ${C('UnreachableException')}, .NET 7+) closes open type switches.</p>
<p><b>Property patterns read properties.</b> Each property read calls the getter. Getters with side effects or heavy work make pattern matching surprising; the compiler may also evaluate them in a different order than written.</p>
<p><b>Null.</b> A type pattern never matches null; ${C('{ }')} (empty property pattern) means "not null"; ${C('is not null')} reads better.</p>`,
    aiEra: `<p><b>What AI changes:</b> converting a 40-line if/else-instanceof chain into a switch expression is a great AI refactor. <b>Use AI as a partner:</b> <code>Rewrite this method with a switch expression and tell me if any arm is unreachable or missing</code>. <b>Where AI goes wrong:</b> ordering a general arm before a specific one (compile error CS8510, or a silently dead ${C('when')} arm), forgetting the discard so ${C('SwitchExpressionException')} appears in production, using patterns on mutable objects that change between checks. <b>What you must still own:</b> choosing between a switch over data and virtual dispatch for your design.</p>`,
    problems: [{
      title: 'FizzBuzz with Tuple Patterns', level: 'Easy', tags: ['switch expression', 'tuple pattern'],
      statement: `<p>Return the FizzBuzz sequence for 1..n as a string array: multiples of both 3 and 5 → ${C('"FizzBuzz"')}, of 3 → ${C('"Fizz"')}, of 5 → ${C('"Buzz"')}, otherwise the number. Implement the decision with a <b>switch expression on the tuple</b> ${C('(i % 3, i % 5)')}.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
      example: `<p>n = 5 → ${C('["1", "2", "Fizz", "4", "Buzz"]')}.</p>`,
      brute: { why: `<p>An if/else chain works but the order of checks is easy to get wrong (testing 3 before 15 prints "Fizz" for 15). The tuple arms make the four cases explicit.</p>`, code: R`
static string[] FizzIf(int n)
{
    var r = new string[n];
    for (int i = 1; i <= n; i++)
    {
        if (i % 15 == 0) r[i - 1] = "FizzBuzz";
        else if (i % 3 == 0) r[i - 1] = "Fizz";
        else if (i % 5 == 0) r[i - 1] = "Buzz";
        else r[i - 1] = i.ToString();
    }
    return r;
}` },
      mcq: { q: 'Why must (0, 0) be the first arm?', options: ['(0, _) would also match 15 and hide it', 'Tuples are compared right to left', 'The compiler sorts arms', 'It does not matter'], answer: 0, explain: 'Arms are tried in order; (0, _) subsumes (0, 0), and the compiler would even flag the later (0, 0) arm as unreachable.' },
      hints: [`<p>Allocate ${C('new string[n]')} and loop i from 1 to n.</p>`, `<p>${C('(i % 3, i % 5) switch { (0, 0) => ..., (0, _) => ..., (_, 0) => ..., _ => i.ToString() }')}.</p>`, `<p>n = 0 must return an empty array, not null — the loop simply does not run.</p>`],
      solution: {
        approach: `<p>Each position is decided by the pair of remainders; the switch expression maps the pair to the text in one expression.</p>`,
        code: R`
public class Solution
{
    public string[] Fizz(int n)
    {
        var result = new string[n];
        for (int i = 1; i <= n; i++)
        {
            result[i - 1] = (i % 3, i % 5) switch
            {
                (0, 0) => "FizzBuzz",
                (0, _) => "Fizz",
                (_, 0) => "Buzz",
                _ => i.ToString()
            };
        }
        return result;
    }
}`,
        dry: { head: ['i', '(i%3, i%5)', 'arm', 'value'], rows: [['3', '(0, 3)', '(0, _)', 'Fizz'], ['5', '(2, 0)', '(_, 0)', 'Buzz'], ['15', '(0, 0)', '(0, 0)', 'FizzBuzz'], ['7', '(1, 2)', '_', '7']] },
        complexity: `<p>O(n) time and output space.</p>`,
        followUps: ['Add "Bazz" for multiples of 7 — how does the tuple grow?', 'Return a lazy IEnumerable&lt;string&gt; with yield return']
      },
      tests: { sig: 'int -> string[]', fn: 'fizz', cases: [
        [[1], ['1']],
        [[0], []],
        [[3], ['1', '2', 'Fizz']],
        [[5], ['1', '2', 'Fizz', '4', 'Buzz']],
        [[6], ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz']],
        [[15], ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 7 — relational, logical and list patterns
     ====================================================================== */
  var LIST_CODE = [
    'static string Shape(int[] a) => a switch',
    '{',
    '    []                       => "empty",',
    '    [var x]                  => $"one: {x}",',
    '    [0, ..]                  => "starts with zero",',
    '    [var x, var y]           => $"pair: {x + y}",',
    '    [var f, .., var l] when f == l => $"bookends: {f}",',
    '    [_, _, .. var rest]      => $"long, tail {rest.Length}",',
    '};'
  ].join('\n');
  function listSim(input) {
    var a = String(input === undefined ? '5 1 2 5' : input).trim();
    a = a ? a.split(/[\s,]+/).map(Number) : [];
    if (a.some(isNaN)) throw new Error('Type integers separated by spaces (empty = empty array)');
    if (a.length > 10) throw new Error('Use at most 10 numbers');
    var arms = [
      { l: 3, ok: a.length === 0, d: 'length 0', r: 'empty' },
      { l: 4, ok: a.length === 1, d: 'length exactly 1', r: 'one: ' + a[0] },
      { l: 5, ok: a.length >= 1 && a[0] === 0, d: 'first element 0, any rest (slice ..)', r: 'starts with zero' },
      { l: 6, ok: a.length === 2, d: 'length exactly 2', r: 'pair: ' + (a[0] + a[1]) },
      { l: 7, ok: a.length >= 2 && a[0] === a[a.length - 1], d: 'length ≥ 2 and when first == last', r: 'bookends: ' + a[0] },
      { l: 8, ok: a.length >= 2, d: 'length ≥ 2, slice captured as rest', r: 'long, tail ' + (a.length - 2) }
    ];
    var s = [{ l: 1, v: { a: '[' + a.join(', ') + ']', Length: a.length }, extra: [{ type: 'array', label: 'a', values: a.length ? a : ['(empty)'] }], narr: 'A list pattern checks <b>Length</b> (or Count) first, then each element pattern by index, and <code>..</code> matches any slice.' }];
    for (var i = 0; i < arms.length; i++) {
      var h = {};
      if (a.length) { h[0] = arms[i].ok ? 'ok' : 'bad'; h[a.length - 1] = arms[i].ok ? 'ok' : 'bad'; }
      s.push({ l: arms[i].l, cls: arms[i].ok ? 'ok' : 'bad', v: { test: arms[i].d, matches: String(arms[i].ok) }, hv: { matches: arms[i].ok ? 'ok' : 'bad' }, extra: [{ type: 'array', label: 'a', values: a.length ? a : ['(empty)'], hl: h }], narr: arms[i].ok ? 'Match → <b>' + H.esc(arms[i].r) + '</b>' : 'No match: needs ' + arms[i].d + '.' });
      if (arms[i].ok) return codeFrames(LIST_CODE, s);
    }
    return codeFrames(LIST_CODE, s);
  }
  topics.push({
    title: 'Relational, Logical & List Patterns',
    analogy: `<p>A nightclub bouncer checks: "age ${C('>= 18')} <b>and</b> ${C('not')} on the banned list", and at a group entrance: "the first person must be the member, the last must be the guardian, anyone in between is fine". Relational and logical patterns are the first rule; <b>list patterns</b> are the second — they describe the shape of a sequence: how long it is, what is at the front and the back, and a ${C('..')} for "anything in the middle".</p>`,
    explain: `<h4>1. Relational patterns (C# 9)</h4>
${P(`
string Bmi(double v) => v switch
{
    < 18.5 => "under",
    < 25   => "normal",
    < 30   => "over",
    _      => "obese"
};`)}
<p>${C('<')}, ${C('<=')}, ${C('>')}, ${C('>=')} against a <b>constant</b>. Arms are ordered, so each arm implicitly includes "and not any earlier arm".</p>
<h4>2. Logical patterns: and, or, not</h4>
${P(`
bool IsLetter(char c) => c is (>= 'a' and <= 'z') or (>= 'A' and <= 'Z');
bool IsWeekend(DayOfWeek d) => d is DayOfWeek.Saturday or DayOfWeek.Sunday;
if (input is not null and not "") { ... }`)}
<p>Precedence: ${C('not')} binds tightest, then ${C('and')}, then ${C('or')}; parentheses group. These are <i>pattern</i> combinators, not the boolean ${C('&&')}/${C('||')}, and they never evaluate the subject twice.</p>
<h4>3. List patterns (C# 11)</h4>
${P(`
int[] a = { 1, 2, 3, 4 };
if (a is [1, .., 4]) ...                 // starts with 1, ends with 4
if (a is [var first, .. var middle, var last]) ...   // middle is int[] {2, 3}
string s = "/api/users";
if (s.Split('/') is ["", "api", var resource, ..]) ...`)}
<ul><li>Work on arrays, ${C('List<T>')}, ${C('Span<T>')}, strings — any type with ${C('Length')}/${C('Count')} and an indexer; capturing a slice (${C('.. var rest')}) additionally needs a range indexer (arrays, strings and spans have it; ${C('List<T>')} does not, so ${C('..')} without capture is fine there).</li>
<li>${C('..')} may appear at most once per list pattern.</li>
<li>Each element is itself a pattern: ${C('[> 0, not 0, string]')}.</li></ul>
<h4>4. Combining everything</h4>
${P(`
static string Classify(int[] scores) => scores switch
{
    [] => "no data",
    [var only] => $"single {only}",
    [.., < 0] => "last score negative",
    _ when scores.All(s => s is >= 0 and <= 100) => "valid",
    _ => "out of range"
};`)}`,
    clues: ['Ranges of a number decide the result → relational patterns in a switch', '"x is A or B" / "not null and not empty" → logical patterns', 'Logic depends on the first/last elements or the length → list pattern', 'Parsing tokens like ["move", var dir, var steps] → list pattern over the split array'],
    code: [{ lang: 'csharp', run: true, title: 'Commands parsed with list patterns (runnable)', code: R`
string[] lines = { "move north 3", "turn left", "say hello world", "stop", "", "move up x" };
foreach (var line in lines)
    Console.WriteLine(Run(line.Split(' ', StringSplitOptions.RemoveEmptyEntries)));

static string Run(string[] cmd) => cmd switch
{
    [] => "empty command",
    ["move", var dir, var n] when dir is "north" or "south" or "east" or "west"
        && int.TryParse(n, out int steps) && steps is > 0 and <= 10 => $"moving {dir} {steps}",
    ["move", ..] => "bad move",
    ["turn", "left" or "right"] => $"turning {cmd[1]}",
    ["say", .. var words] => "saying: " + string.Join(' ', words),
    [var only] => $"single word: {only}",
    _ => "unknown"
};` }],
    codeTitle: ['List + logical + relational patterns'],
    viz: { title: 'Match an array against list patterns', input: '5 1 2 5', inputLabel: 'array (space separated; empty = [])', gen: listSim },
    examples: [
      { title: 'Character classes with and/or', html: `<p>Logical patterns replace chains of ${C('c >= \'a\' && c <= \'z\' || ...')}.</p>`, code: R`
foreach (char c in "aZ5_ ")
    Console.WriteLine($"'{c}' -> " + (c switch
    {
        >= 'a' and <= 'z' or >= 'A' and <= 'Z' => "letter",
        >= '0' and <= '9' => "digit",
        ' ' or '\t' => "space",
        _ => "other"
    }));` },
      { title: 'Recursive sum with list patterns', html: `<p>Slices on arrays allocate a new array (they call ${C('RuntimeHelpers.GetSubArray')}); on ${C('ReadOnlySpan')} they are free. Use spans for recursive list-pattern code.</p>`, code: R`
Console.WriteLine(Sum(new[] { 1, 2, 3, 4 }));
static int Sum(ReadOnlySpan<int> s) => s switch
{
    [] => 0,
    [var head, .. var tail] => head + Sum(tail)
};` },
      { title: 'not null and not empty', html: `<p>One pattern, no double evaluation of the subject, and the compiler knows the value is not null inside the true branch.</p>`, code: R`
string?[] values = { null, "", "ok" };
foreach (var v in values) Console.WriteLine(v is not null and not "" ? $"use {v}" : "skip");` }
    ],
    deepDive: `<p><b>How list patterns compile.</b> ${C('a is [1, .., 4]')} becomes ${C('a != null && a.Length >= 2 && a[0] == 1 && a[^1] == 4')}. The compiler uses ${C('Length')}/${C('Count')} as a "countable" and the ${C('Index')} indexer (or int indexer with subtraction). Slices call the ${C('Range')} indexer or ${C('Slice(int, int)')}.</p>
<p><b>Subsumption across arms.</b> The decision DAG knows that once ${C('Length == 0')} failed, ${C('[]')} cannot match later — and reports an error if a later arm is fully covered by earlier ones.</p>
<p><b>Constants only.</b> Relational patterns need compile-time constants: ${C('x is > limit')} with a variable ${C('limit')} does not compile; use a ${C('when')} guard. Same for list element constants.</p>
<p><b>Performance.</b> Patterns over spans with slices are allocation-free; over arrays, a captured slice allocates. Over ${C('List<T>')} a captured slice is not supported at all. Match on ${C('CollectionsMarshal.AsSpan(list)')} if needed.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI translates nested if-statements into combined patterns well, and is decent at command parsers with list patterns. <b>Use AI as a partner:</b> <code>Generate test inputs that hit every arm of this switch, including empty and single-element arrays</code>. <b>Where AI goes wrong:</b> mixing ${C('&&')} inside patterns (not allowed: use ${C('and')}), slicing a ${C('List<T>')} with ${C('.. var rest')}, putting variables in relational patterns, forgetting operator precedence of ${C('not')}/${C('and')}/${C('or')} (${C('not A or B')} is ${C('(not A) or B')}). <b>What you must still own:</b> readability — a 6-level nested pattern is clever but often an if statement is clearer.</p>`,
    problems: [{
      title: 'Classify a Version Number', level: 'Medium', tags: ['list patterns', 'relational patterns', 'logical patterns'], companies: ['Microsoft', 'GitHub'],
      statement: `<p>A version is given as an ${C('int[]')} of exactly three parts ${C('[major, minor, patch]')}. Return its kind using one switch expression with list, relational and logical patterns (no ${C('when')} guards, no indexing), checking in this order:</p>
<ul><li>any part negative in the first three positions → ${C('"invalid"')}</li>
<li>major is 0 → ${C('"prerelease"')}</li>
<li>major between 1 and 99, minor 0, patch 0 → ${C('"major"')}</li>
<li>major between 1 and 99, minor &gt; 0, patch 0 → ${C('"minor"')}</li>
<li>major between 1 and 99, patch &gt; 0 → ${C('"patch"')}</li>
<li>anything else (wrong length, major ≥ 100) → ${C('"invalid"')}</li></ul>`,
      constraints: `0 ≤ v.Length ≤ 5, −1000 ≤ v[i] ≤ 1000`,
      example: `<p>${C('[2, 0, 0]')} → ${C('"major"')}; ${C('[0, 9, 1]')} → ${C('"prerelease"')}; ${C('[1, 2]')} → ${C('"invalid"')}.</p>`,
      brute: { why: `<p>The if-chain needs a length check before every index access and repeats ${C('v[0] >= 1 && v[0] <= 99')} in three places. The list pattern checks length and elements in one shape and the compiler shares the common tests.</p>`, code: R`
static string ClassifyIf(int[] v)
{
    if (v.Length >= 1 && v[0] < 0 || v.Length >= 2 && v[1] < 0 || v.Length >= 3 && v[2] < 0) return "invalid";
    if (v.Length != 3) return "invalid";
    if (v[0] == 0) return "prerelease";
    if (v[0] < 1 || v[0] > 99) return "invalid";
    if (v[2] > 0) return "patch";
    return v[1] > 0 ? "minor" : "major";
}` },
      mcq: { q: 'Which pattern matches a three-element array whose first element is between 1 and 99?', options: ['[>= 1 and <= 99, _, _]', '[>= 1 && <= 99, _, _]', '[1..99, _, _]', '[> 0, ..] when v.Length == 3'], answer: 0, explain: 'Patterns combine with the keywords and / or / not; && is not allowed inside a pattern, 1..99 is a range expression, and [> 0, ..] matches any length.' },
      hints: [`<p>The negative check is three alternatives: ${C('[< 0, ..] or [_, < 0, ..] or [_, _, < 0, ..]')}.</p>`, `<p>Name the shared major range once in each arm: ${C('[>= 1 and <= 99, 0, 0]')}, ${C('[>= 1 and <= 99, > 0, 0]')}, ${C('[>= 1 and <= 99, _, > 0]')}.</p>`, `<p>${C('[0, _, _]')} only matches length 3; finish with ${C('_ => "invalid"')}.</p>`],
      solution: {
        approach: `<p>Arms are tried top to bottom, so the negative-part arm comes first and the discard arm last. Each arm describes the whole shape — length and every element — so no index can go out of range.</p>`,
        code: R`
public class Solution
{
    public string Classify(int[] v) => v switch
    {
        [< 0, ..] or [_, < 0, ..] or [_, _, < 0, ..] => "invalid",
        [0, _, _] => "prerelease",
        [>= 1 and <= 99, 0, 0] => "major",
        [>= 1 and <= 99, > 0, 0] => "minor",
        [>= 1 and <= 99, _, > 0] => "patch",
        _ => "invalid"
    };
}`,
        dry: { head: ['v', 'first matching arm', 'result'], rows: [['[2, 0, 0]', '[>= 1 and <= 99, 0, 0]', 'major'], ['[3, 4, 0]', '[>= 1 and <= 99, > 0, 0]', 'minor'], ['[0, -1, 2]', '[_, < 0, ..]', 'invalid'], ['[100, 0, 0]', '_', 'invalid']] },
        complexity: `<p>O(1) time and space: at most a handful of element comparisons.</p>`,
        followUps: ['Accept an optional fourth build number with <code>[.., var build]</code>', 'Rewrite it over <code>ReadOnlySpan&lt;int&gt;</code>']
      },
      tests: { sig: 'int[] -> string', fn: 'classify', cases: [
        [[[2, 0, 0]], 'major'],
        [[[3, 4, 0]], 'minor'],
        [[[1, 0, 7]], 'patch'],
        [[[0, 9, 1]], 'prerelease'],
        [[[1, 2]], 'invalid'],
        [[[0, -1, 2]], 'invalid'],
        [[[100, 0, 0]], 'invalid'],
        [[[]], 'invalid'],
        [[[99, 5, 5]], 'patch'],
        [[[1, 2, 3, 4]], 'invalid']
      ] }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Sum the Valid Tokens', level: 'Easy', tags: ['TryParse', 'exceptions vs Try pattern'], companies: ['Microsoft', 'Infosys'],
    statement: `<p>You receive tokens from a log file. Return the sum of all tokens that parse as a 64-bit integer (standard integer format: optional surrounding whitespace and a leading sign). Ignore tokens that do not parse. Use the <b>Try pattern</b>, not exceptions.</p>`,
    constraints: `0 ≤ tokens.Length ≤ 10<sup>5</sup>; the sum of valid tokens fits in a long`,
    example: `<p>${C('["1", "2", "x", "3"]')} → 6; ${C('["12a", "007", " 4"]')} → 11.</p>`,
    brute: { why: `<p>Calling ${C('long.Parse')} inside try/catch gives the same answer, but every invalid token throws — thousands of throws cost milliseconds each batch and flood debuggers with first-chance exceptions.</p>`, code: R`
static long SumWithExceptions(string[] tokens)
{
    long sum = 0;
    foreach (var t in tokens)
    {
        try { sum += long.Parse(t); }
        catch (FormatException) { }
        catch (OverflowException) { }
    }
    return sum;
}` },
    mcq: { q: 'What does long.TryParse("1.5", out var v) return?', options: ['false, v = 0', 'true, v = 1', 'true, v = 2', 'It throws FormatException'], answer: 0, explain: 'The default integer style does not allow a decimal point; TryParse never throws for bad input and sets v to 0.' },
    hints: [`<p>${C('long.TryParse(t, out long v)')} returns a bool.</p>`, `<p>Add ${C('v')} to a long running sum only when TryParse returns true.</p>`, `<p>Leading/trailing spaces and a sign are allowed by the default ${C('NumberStyles.Integer')}.</p>`],
    solution: {
      approach: `<p>One pass with ${C('TryParse')}: no exceptions, no allocations besides the iteration.</p>`,
      code: R`
public class Solution
{
    public long SumValid(string[] tokens)
    {
        long sum = 0;
        foreach (var t in tokens)
            if (long.TryParse(t, out long v)) sum += v;
        return sum;
    }
}`,
      complexity: `<p>O(total characters) time, O(1) space.</p>`,
      followUps: ['Count how many tokens were rejected', 'Parse with CultureInfo.InvariantCulture and NumberStyles.AllowThousands']
    },
    tests: { sig: 'string[] -> long', fn: 'sumValid', cases: [
      [[['1', '2', 'x', '3']], 6],
      [[[]], 0],
      [[['abc']], 0],
      [[['-5', '5']], 0],
      [[['9223372036854775807']], '9223372036854775807'],
      [[['12a', '007', ' 4']], 11],
      [[['+3', '1.5']], 3]
    ] }
  });

  practice.push({
    title: 'Total Length, Nulls Count as Zero', level: 'Easy', tags: ['null operators'], companies: ['Accenture', 'Microsoft'],
    statement: `<p>Given an array of strings where some entries are ${C('null')}, return the total number of characters. A null entry contributes 0. Write it with ${C('?.')} and ${C('??')}.</p>`,
    constraints: `0 ≤ words.Length ≤ 10<sup>5</sup>`,
    example: `<p>${C('["ab", null, "cde"]')} → 5.</p>`,
    brute: { why: `<p>An explicit ${C('if (w != null)')} works too; the point is that forgetting the check throws ${C('NullReferenceException')} on the first null.</p>`, code: R`
static int TotalLengthIf(string?[] words)
{
    int total = 0;
    foreach (var w in words) { if (w != null) total += w.Length; }
    return total;
}` },
    mcq: { q: 'What is the type of `w?.Length` when w is string?', options: ['int?', 'int', 'string?', 'object'], answer: 0, explain: 'The ?. operator lifts a value-type member to Nullable&lt;T&gt;, because the result may be null.' },
    hints: [`<p>${C('w?.Length')} has type ${C('int?')}: it is null when w is null.</p>`, `<p>${C('w?.Length ?? 0')} turns it back into an int.</p>`, `<p>${C('words.Sum(w => w?.Length ?? 0)')} is a one-liner.</p>`],
    solution: {
      approach: `<p>Lift with ${C('?.')}, default with ${C('??')}, sum.</p>`,
      code: R`
public class Solution
{
    public int TotalLength(string?[] words) => words.Sum(w => w?.Length ?? 0);
}`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Return the longest non-null word or null', 'Ignore whitespace-only strings too']
    },
    tests: { sig: 'string[] -> int', fn: 'totalLength', cases: [
      [[['ab', null, 'cde']], 5],
      [[[]], 0],
      [[[null]], 0],
      [[['', 'x']], 1],
      [[[null, null, 'hello']], 5],
      [[['a', 'bb', 'ccc']], 6]
    ] }
  });

  practice.push({
    title: 'Classify the Temperature', level: 'Easy', tags: ['relational patterns', 'switch expression'], companies: ['TCS', 'Siemens'],
    statement: `<p>Return a label for a temperature in °C: below 0 → ${C('"freezing"')}; 0 up to but not including 15 → ${C('"cold"')}; 15 to below 25 → ${C('"mild"')}; 25 to below 35 → ${C('"warm"')}; 35 and above → ${C('"hot"')}. Use relational patterns.</p>`,
    constraints: `t is any int`,
    example: `<p>14 → cold, 15 → mild, 35 → hot.</p>`,
    brute: { why: `<p>An if/else chain with both bounds in every condition (${C('t >= 0 && t < 15')}) is longer and easy to leave a gap or overlap in. Ordered relational arms only need the upper bound.</p>`, code: R`
static string ClassifyIf(int t)
{
    if (t < 0) return "freezing";
    if (t >= 0 && t < 15) return "cold";
    if (t >= 15 && t < 25) return "mild";
    if (t >= 25 && t < 35) return "warm";
    return "hot";
}` },
    mcq: { q: 'In `t switch { < 0 => "freezing", < 15 => "cold", ... }`, why does the second arm not need `>= 0`?', options: ['Arms are tried in order, so reaching it implies t >= 0', 'Relational patterns are always non-negative', 'The compiler adds it', 'It is a bug'], answer: 0, explain: 'Only values that failed every earlier arm reach a later arm.' },
    hints: [`<p>Write the arms from smallest to largest upper bound.</p>`, `<p>The arms are ${C('< 0, < 15, < 25, < 35, _')} in that order.</p>`, `<p>Check the boundaries 0, 15, 25, 35 exactly.</p>`],
    solution: {
      approach: `<p>A switch expression with ordered relational arms.</p>`,
      code: R`
public class Solution
{
    public string Classify(int t) => t switch
    {
        < 0 => "freezing",
        < 15 => "cold",
        < 25 => "mild",
        < 35 => "warm",
        _ => "hot"
    };
}`,
      complexity: `<p>O(1) time and space per call.</p>`,
      followUps: ['Accept a double? and return "unknown" for null', 'Load the thresholds from config — why can relational patterns not use them?']
    },
    tests: { sig: 'int -> string', fn: 'classify', cases: [
      [[-10], 'freezing'], [[0], 'cold'], [[14], 'cold'], [[15], 'mild'], [[24], 'mild'], [[25], 'warm'], [[34], 'warm'], [[35], 'hot'], [[-2147483648], 'freezing'], [[2147483647], 'hot']
    ] }
  });

  practice.push({
    title: 'Checked Product', level: 'Medium', tags: ['checked', 'OverflowException'], companies: ['Goldman Sachs', 'Microsoft'],
    statement: `<p>Return the product of a list of non-negative 64-bit integers (the empty product is 1). If the product overflows a ${C('long')} at any step, return −1. Use a ${C('checked')} context and catch ${C('OverflowException')}.</p>`,
    constraints: `0 ≤ nums.Length ≤ 10<sup>5</sup>, 0 ≤ nums[i] ≤ 2<sup>63</sup>−1`,
    example: `<p>${C('[2, 3, 4]')} → 24; ${C('[3037000500, 3037000500]')} → −1 (the square exceeds 2<sup>63</sup>−1).</p>`,
    brute: { why: `<p>Pre-checking ${C('a > long.MaxValue / b')} before every multiplication also works, but is easy to get wrong with zeros and is noisier than letting the CPU's overflow flag do the work in a checked block.</p>`, code: R`
static long ProductManual(long[] nums)
{
    long p = 1;
    foreach (var x in nums)
    {
        if (x != 0 && p > long.MaxValue / x) return -1;
        p *= x;
    }
    return p;
}` },
    mcq: { q: 'What does unchecked long multiplication do on overflow in C#?', options: ['Wraps around silently (two\'s complement)', 'Throws OverflowException', 'Saturates at long.MaxValue', 'Returns 0'], answer: 0, explain: 'C# is unchecked by default (unless the CheckForOverflowUnderflow option is on); checked { } or checked(expr) makes it throw.' },
    hints: [`<p>Wrap the multiplication loop in a ${C('checked { }')} block.</p>`, `<p>Catch ${C('OverflowException')} around the block and return −1.</p>`, `<p>Note a zero earlier keeps the product 0 forever, so later big values cannot overflow.</p>`],
    solution: {
      approach: `<p>Multiply in a checked block; the first overflowing step throws and we report −1.</p>`,
      code: R`
public class Solution
{
    public long Product(long[] nums)
    {
        try
        {
            long p = 1;
            checked
            {
                foreach (var x in nums) p *= x;
            }
            return p;
        }
        catch (OverflowException)
        {
            return -1;
        }
    }
}`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Use Math.BigMul / Int128 to detect overflow without exceptions', 'Return the product modulo 1e9+7 instead']
    },
    tests: { sig: 'long[] -> long', fn: 'product', cases: [
      [[[2, 3, 4]], 24],
      [[[]], 1],
      [[[0, '9223372036854775807', 2]], 0],
      [[['9223372036854775807', 2]], -1],
      [[[3037000500, 3037000500]], -1],
      [[[3037000499, 3037000499]], '9223372030926249001'],
      [[[1000000, 1000000, 1000000]], '1000000000000000000']
    ] }
  });

  practice.push({
    title: 'Dispose Order Log', level: 'Medium', tags: ['IDisposable', 'using'], companies: ['Microsoft', 'JetBrains'],
    statement: `<p>Simulate opening resources R0..R(n−1) one after another, each held by a ${C('using var')} in its own nested scope. Opening resource ${C('failAt')} throws instead (log ${C('"fail Ri"')}); every successfully opened resource logs ${C('"open Ri"')}. If all open, log ${C('"work"')}. Every opened resource logs ${C('"close Ri"')} when disposed. If an exception escapes, the caller logs ${C('"caught"')}. Return the log. ${C('failAt = -1')} means nothing fails.</p>`,
    constraints: `0 ≤ n ≤ 1000, −1 ≤ failAt < n`,
    example: `<p>n = 3, failAt = 2 → ${C('["open R0", "open R1", "fail R2", "close R1", "close R0", "caught"]')}.</p>`,
    brute: { why: `<p>Manually calling Close in every branch needs a cleanup list and careful reverse iteration on each error path; using does this through compiler-generated finally blocks, in the right order, on every path.</p>`, code: R`
static List<string> Manual(int n, int failAt)
{
    var log = new List<string>();
    var opened = new List<int>();
    bool failed = false;
    for (int i = 0; i < n; i++)
    {
        if (i == failAt) { log.Add($"fail R{i}"); failed = true; break; }
        log.Add($"open R{i}"); opened.Add(i);
    }
    if (!failed) log.Add("work");
    for (int k = opened.Count - 1; k >= 0; k--) log.Add($"close R{opened[k]}");
    if (failed) log.Add("caught");
    return log;
}` },
    mcq: { q: 'If opening R2 throws, is R2 disposed?', options: ['No — the variable was never assigned, so there is nothing to dispose', 'Yes, always', 'Only if it implements IAsyncDisposable', 'Only in Release builds'], answer: 0, explain: 'The using\'s try begins after the initializer succeeds; a failed constructor leaves nothing to dispose.' },
    hints: [`<p>A recursive helper ${C('Open(i)')}: if i == n log "work"; if i == failAt log fail and throw; otherwise ${C('using var r = new Res(i, log); Open(i + 1);')}.</p>`, `<p>The ${C('Res')} constructor logs "open", Dispose logs "close".</p>`, `<p>Wrap the first call in try/catch that logs "caught".</p>`],
    solution: {
      approach: `<p>Nested scopes created by recursion; each frame's using disposes on the way back, whether returning normally or unwinding from the exception.</p>`,
      code: R`
public class Solution
{
    private sealed class Res : IDisposable
    {
        private readonly int _id;
        private readonly List<string> _log;
        public Res(int id, List<string> log) { _id = id; _log = log; log.Add($"open R{id}"); }
        public void Dispose() => _log.Add($"close R{_id}");
    }

    public string[] DisposeLog(int n, int failAt)
    {
        var log = new List<string>();
        try { Open(0, n, failAt, log); }
        catch (InvalidOperationException) { log.Add("caught"); }
        return log.ToArray();
    }

    private static void Open(int i, int n, int failAt, List<string> log)
    {
        if (i == n) { log.Add("work"); return; }
        if (i == failAt) { log.Add($"fail R{i}"); throw new InvalidOperationException($"R{i}"); }
        using var r = new Res(i, log);
        Open(i + 1, n, failAt, log);
    }
}`,
      complexity: `<p>O(n) time; O(n) stack depth (fine for n ≤ 1000).</p>`,
      followUps: ['Make Dispose itself throw for one resource: which exception does the caller see?', 'Rewrite iteratively with a Stack&lt;IDisposable&gt;']
    },
    tests: { sig: 'int int -> string[]', fn: 'disposeLog', cases: [
      [[2, -1], ['open R0', 'open R1', 'work', 'close R1', 'close R0']],
      [[3, 2], ['open R0', 'open R1', 'fail R2', 'close R1', 'close R0', 'caught']],
      [[1, 0], ['fail R0', 'caught']],
      [[0, -1], ['work']],
      [[3, 0], ['fail R0', 'caught']],
      [[3, 1], ['open R0', 'fail R1', 'close R0', 'caught']],
      [[3, -1], ['open R0', 'open R1', 'open R2', 'work', 'close R2', 'close R1', 'close R0']]
    ] }
  });

  practice.push({
    title: 'Retry Only Transient Errors', level: 'Medium', tags: ['exception filters', 'custom exceptions', 'retry'], companies: ['Amazon', 'Microsoft'],
    statement: `<p>A call returns a status code; attempt k uses ${C('codes[k]')} (200 if k is past the end). A non-200 code throws ${C('ServiceException')} with property ${C('Code')}. Codes 503 and 429 are <b>transient</b>: retry while fewer than ${C('maxRetries')} retries were used. Return ${C('"ok after K retries"')} on success, ${C('"gave up: C"')} when a transient code arrives with no retries left, or ${C('"fatal: C"')} for any other code. Use <b>exception filters</b>.</p>`,
    constraints: `0 ≤ codes.Length ≤ 100, 0 ≤ maxRetries ≤ 100`,
    example: `<p>${C('[503, 503, 503]')}, maxRetries = 2 → ${C('"gave up: 503"')}; ${C('[429, 404]')}, 3 → ${C('"fatal: 404"')}.</p>`,
    brute: { why: `<p>One ${C('catch (ServiceException e)')} with an if/else inside that rethrows the non-matching cases loses the original stack on ${C('throw e')} and mixes three policies in one block. Filters keep each policy in its own clause.</p>`, code: R`
static string RetryIfElse(int[] codes, int maxRetries)
{
    int retries = 0;
    while (true)
    {
        int code = retries < codes.Length ? codes[retries] : 200;
        if (code == 200) return $"ok after {retries} retries";
        bool transient = code == 503 || code == 429;
        if (!transient) return $"fatal: {code}";
        if (retries >= maxRetries) return $"gave up: {code}";
        retries++;
    }
}` },
    mcq: { q: 'Where does the filter `when (retries < maxRetries)` run?', options: ['In the first pass, before the stack is unwound', 'After finally blocks run', 'Only in Debug builds', 'On a background thread'], answer: 0, explain: 'Filters run during the handler search, before unwinding, which is why they do not disturb the stack.' },
    hints: [`<p>Define ${C('sealed class ServiceException(int code) : Exception($"status {code}") { public int Code { get; } = code; }')}.</p>`, `<p>Three catch clauses in order: transient with retries left → retries++; transient → gave up; any ServiceException → fatal.</p>`, `<p>${C('e.Code is 503 or 429')} reads nicely inside the filter.</p>`],
    solution: {
      approach: `<p>Loop forever; each iteration makes one call. The filters choose the policy without unwinding first, and the loop counter is the number of retries used.</p>`,
      code: R`
public sealed class ServiceException(int code) : Exception($"status {code}")
{
    public int Code { get; } = code;
}

public class Solution
{
    private static void Call(int code)
    {
        if (code != 200) throw new ServiceException(code);
    }

    public string CallWithRetry(int[] codes, int maxRetries)
    {
        int retries = 0;
        while (true)
        {
            try
            {
                Call(retries < codes.Length ? codes[retries] : 200);
                return $"ok after {retries} retries";
            }
            catch (ServiceException e) when (e.Code is 503 or 429 && retries < maxRetries)
            {
                retries++;
            }
            catch (ServiceException e) when (e.Code is 503 or 429)
            {
                return $"gave up: {e.Code}";
            }
            catch (ServiceException e)
            {
                return $"fatal: {e.Code}";
            }
        }
    }
}`,
      complexity: `<p>O(maxRetries) attempts.</p>`,
      followUps: ['Add exponential backoff delays', 'Use Polly or Microsoft.Extensions.Resilience — what do they add?']
    },
    tests: { sig: 'int[] int -> string', fn: 'callWithRetry', cases: [
      [[[200], 2], 'ok after 0 retries'],
      [[[503, 200], 2], 'ok after 1 retries'],
      [[[503, 503, 503], 2], 'gave up: 503'],
      [[[429, 404], 3], 'fatal: 404'],
      [[[], 0], 'ok after 0 retries'],
      [[[503], 0], 'gave up: 503'],
      [[[500], 5], 'fatal: 500'],
      [[[429, 503], 2], 'ok after 2 retries']
    ] }
  });

  practice.push({
    title: 'Validate an Order', level: 'Medium', tags: ['argument exceptions', 'catch order', 'custom exceptions'], companies: ['Flipkart', 'Microsoft'],
    statement: `<p>Validate an order in this order of rules and report the first failure: quantity ≤ 0 → throw ${C('ArgumentOutOfRangeException')} (param ${C('qty')}); code null → ${C('ArgumentNullException')} (param ${C('code')}); code length ≠ 6 → custom ${C('InvalidCodeException')}; ${C('qty * price')} overflows ${C('int')} → ${C('OverflowException')} (use checked). Return ${C('"range: qty"')}, ${C('"missing: code"')}, ${C('"bad code: X"')}, ${C('"overflow"')} or ${C('"total: N"')} by catching the exceptions in the right order.</p>`,
    constraints: `qty, price are ints, price ≥ 0; code may be null`,
    example: `<p>(2, 50, "ABC123") → ${C('"total: 100"')}; (1, 5, "AB") → ${C('"bad code: AB"')}; (46341, 46341, "ZZZZZZ") → ${C('"overflow"')}.</p>`,
    brute: { why: `<p>Returning error strings directly from each check is simpler for this exercise, but real validators throw so that the caller decides how to report. The catch order is the lesson: both argument exceptions derive from ${C('ArgumentException')}.</p>`, code: R`
static string ValidateDirect(int qty, int price, string? code)
{
    if (qty <= 0) return "range: qty";
    if (code is null) return "missing: code";
    if (code.Length != 6) return "bad code: " + code;
    long total = (long)qty * price;
    return total > int.MaxValue ? "overflow" : "total: " + total;
}` },
    mcq: { q: 'Why must `catch (ArgumentNullException)` come before `catch (ArgumentException)`?', options: ['It derives from ArgumentException, so the base clause would catch it first (and the compiler rejects the unreachable clause)', 'Alphabetical order', 'Null exceptions are faster', 'It does not matter'], answer: 0, explain: 'Catch clauses are tested in order; a base type first makes the derived clause unreachable (CS0160).' },
    hints: [`<p>Write a private ${C('Total(qty, price, code)')} that throws, and a public method that catches.</p>`, `<p>${C('ArgumentOutOfRangeException.ThrowIfNegativeOrZero(qty)')} sets ParamName to "qty" automatically.</p>`, `<p>${C('checked(qty * price)')} throws OverflowException.</p>`],
    solution: {
      approach: `<p>Separate the validating code (throws) from the reporting code (catches). Specific exception types are caught before their bases.</p>`,
      code: R`
public sealed class InvalidCodeException(string code) : Exception($"Invalid code '{code}'")
{
    public string Code { get; } = code;
}

public class Solution
{
    private static int Total(int qty, int price, string? code)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(qty);
        ArgumentNullException.ThrowIfNull(code);
        if (code.Length != 6) throw new InvalidCodeException(code);
        return checked(qty * price);
    }

    public string Validate(int qty, int price, string? code)
    {
        try
        {
            return $"total: {Total(qty, price, code)}";
        }
        catch (ArgumentOutOfRangeException e) { return $"range: {e.ParamName}"; }
        catch (ArgumentNullException e) { return $"missing: {e.ParamName}"; }
        catch (InvalidCodeException e) { return $"bad code: {e.Code}"; }
        catch (OverflowException) { return "overflow"; }
    }
}`,
      complexity: `<p>O(1) time and space per call.</p>`,
      followUps: ['Collect all validation errors instead of the first', 'Replace exceptions with a Result type']
    },
    tests: { sig: 'int int string -> string', fn: 'validate', cases: [
      [[2, 50, 'ABC123'], 'total: 100'],
      [[0, 5, 'ABC123'], 'range: qty'],
      [[1, 5, null], 'missing: code'],
      [[1, 5, 'AB'], 'bad code: AB'],
      [[100000, 100000, 'ABC123'], 'overflow'],
      [[-1, 5, null], 'range: qty'],
      [[46341, 46341, 'ZZZZZZ'], 'overflow'],
      [[46340, 46340, 'ZZZZZZ'], 'total: 2147395600']
    ] }
  });

  practice.push({
    title: 'Describe an Array with List Patterns', level: 'Medium', tags: ['list patterns', 'switch expression'], companies: ['Microsoft', 'Uber'],
    statement: `<p>Return a description, testing in this order: empty → ${C('"empty"')}; one element x → ${C('"one: x"')}; first element 0 → ${C('"starts with zero"')}; exactly two elements x, y → ${C('"pair: x+y=S"')}; first equals last → ${C('"bookends: f"')}; otherwise ${C('"long: N"')} where N is the length.</p>`,
    constraints: `0 ≤ a.Length ≤ 10<sup>5</sup>`,
    example: `<p>${C('[3, 4]')} → ${C('"pair: 3+4=7"')}; ${C('[5, 1, 5]')} → ${C('"bookends: 5"')}.</p>`,
    brute: { why: `<p>Index-based if statements (${C('a.Length == 2 ? ...')}) work but every arm repeats length checks; list patterns put the length and element tests in one declarative shape.</p>`, code: R`
static string DescribeIf(int[] a)
{
    if (a.Length == 0) return "empty";
    if (a.Length == 1) return $"one: {a[0]}";
    if (a[0] == 0) return "starts with zero";
    if (a.Length == 2) return $"pair: {a[0]}+{a[1]}={a[0] + a[1]}";
    if (a[0] == a[^1]) return $"bookends: {a[0]}";
    return $"long: {a.Length}";
}` },
    mcq: { q: 'What does `[0, ..]` match?', options: ['Any array of length ≥ 1 whose first element is 0', 'Only [0]', 'Arrays of length ≥ 2 starting with 0', 'Arrays containing 0 anywhere'], answer: 0, explain: 'The slice .. matches zero or more elements, so [0] matches too — here it is excluded only because [var x] comes first.' },
    hints: [`<p>${C('a switch { [] => ..., [var x] => ..., [0, ..] => ..., [var x, var y] => ..., [var f, .., var l] when f == l => ..., _ => ... }')}.</p>`, `<p>Order matters: [2, 2] is a pair, not bookends.</p>`, `<p>Interpolate carefully: ${C('$"pair: {x}+{y}={x + y}"')}.</p>`],
    solution: {
      approach: `<p>A switch expression with list patterns in the order of the rules.</p>`,
      code: R`
public class Solution
{
    public string Describe(int[] a) => a switch
    {
        [] => "empty",
        [var x] => $"one: {x}",
        [0, ..] => "starts with zero",
        [var x, var y] => $"pair: {x}+{y}={x + y}",
        [var f, .., var l] when f == l => $"bookends: {f}",
        _ => $"long: {a.Length}"
    };
}`,
      complexity: `<p>O(1) — only the length and two elements are read.</p>`,
      followUps: ['Add an arm for strictly increasing arrays (needs a when guard)', 'Do the same on ReadOnlySpan&lt;int&gt;']
    },
    tests: { sig: 'int[] -> string', fn: 'describe', cases: [
      [[[]], 'empty'], [[[7]], 'one: 7'], [[[0, 5]], 'starts with zero'], [[[3, 4]], 'pair: 3+4=7'], [[[5, 1, 5]], 'bookends: 5'], [[[1, 2, 3, 4]], 'long: 4'], [[[0]], 'one: 0'], [[[2, 2]], 'pair: 2+2=4'], [[[-1, 0]], 'pair: -1+0=-1']
    ] }
  });

  practice.push({
    title: 'Shape Area via Type Patterns', level: 'Medium', tags: ['records', 'type patterns', 'property patterns'], companies: ['Autodesk', 'Microsoft'],
    statement: `<p>Build a shape record from ${C('kind')} and two numbers — ${C('"circle"')} (radius a), ${C('"rect"')} (a × b), ${C('"tri"')} (base a, height b), ${C('"square"')} (side a) — or ${C('null')} for an unknown kind. Compute the area with a switch expression over the records. A shape with a zero dimension (property pattern) has area 0; null returns −1.</p>`,
    constraints: `0 ≤ a, b ≤ 10<sup>4</sup>`,
    example: `<p>("circle", 1, 0) → 3.141592653589793; ("tri", 4, 5) → 10; ("hex", 1, 1) → −1.</p>`,
    brute: { why: `<p>Switching on the string directly computes the same numbers, but then every new operation (perimeter, scaling) re-parses strings. Turning input into typed records once and matching on types is the reusable design.</p>`, code: R`
static double AreaByString(string kind, double a, double b) => kind switch
{
    "circle" => Math.PI * a * a,
    "rect" => a * b,
    "tri" => 0.5 * a * b,
    "square" => a * a,
    _ => -1
};` },
    mcq: { q: 'Which arm matches `new Circle(0)` in `{ Circle { R: 0 } => 0, Circle c => Math.PI * c.R * c.R }`?', options: ['The first (property pattern)', 'The second', 'Both run', 'Neither'], answer: 0, explain: 'Arms are tried in order and the first matching arm wins.' },
    hints: [`<p>${C('abstract record Shape; record Circle(double R) : Shape; ...')}</p>`, `<p>A factory ${C('Shape? Make(kind, a, b) => kind switch { "circle" => new Circle(a), ... _ => null }')}.</p>`, `<p>${C('Rect { W: 0 } or Rect { H: 0 } => 0')} before the general Rect arm.</p>`],
    solution: {
      approach: `<p>Parse once into a small record hierarchy, then one switch expression over the shapes with property patterns for the degenerate cases.</p>`,
      code: R`
public abstract record Shape;
public sealed record Circle(double R) : Shape;
public sealed record Rect(double W, double H) : Shape;
public sealed record Tri(double B, double H) : Shape;
public sealed record Square(double S) : Shape;

public class Solution
{
    private static Shape? Make(string kind, double a, double b) => kind switch
    {
        "circle" => new Circle(a),
        "rect" => new Rect(a, b),
        "tri" => new Tri(a, b),
        "square" => new Square(a),
        _ => null
    };

    public double Area(string kind, double a, double b) => Make(kind, a, b) switch
    {
        null => -1,
        Circle { R: 0 } or Square { S: 0 } or Rect { W: 0 } or Rect { H: 0 } or Tri { B: 0 } or Tri { H: 0 } => 0,
        Circle c => Math.PI * c.R * c.R,
        Rect r => r.W * r.H,
        Tri t => 0.5 * t.B * t.H,
        Square s => s.S * s.S,
        _ => throw new InvalidOperationException("unknown shape")
    };
}`,
      complexity: `<p>O(1) time and space per call.</p>`,
      followUps: ['Add Perimeter as a second switch — compare with a virtual method design', 'Make Shape a closed hierarchy with a private constructor']
    },
    tests: { sig: 'string double double -> double', fn: 'area', cmp: 'float', cases: [
      [['circle', 1, 0], 3.141592653589793],
      [['rect', 2, 3], 6],
      [['tri', 4, 5], 10],
      [['square', 3, 0], 9],
      [['hex', 1, 1], -1],
      [['circle', 0, 0], 0],
      [['rect', 2.5, 4], 10],
      [['rect', 7, 0], 0]
    ] }
  });

  practice.push({
    title: 'Evaluate a Prefix Expression', level: 'Hard', tags: ['records', 'recursive patterns', 'parsing'], companies: ['Google', 'Microsoft'],
    statement: `<p>Tokens describe an expression in prefix (Polish) notation: binary ${C('"+"')}, ${C('"-"')}, ${C('"*"')}, unary ${C('"neg"')}, and integer literals. Parse the tokens into an immutable tree of records (${C('Num')}, ${C('Bin')}, ${C('Neg')}) and evaluate it with a switch expression. The input is always valid; use 64-bit arithmetic.</p>`,
    constraints: `1 ≤ tokens.Length ≤ 1000; every intermediate value fits in a long`,
    example: `<p>${C('["*", "+", "1", "2", "neg", "3"]')} → (1 + 2) × (−3) = −9.</p>`,
    brute: { why: `<p>A stack-based evaluator that scans right to left works without a tree, but then any second operation (printing, simplifying) needs a new scanner. Building the tree once separates parsing from interpretation — the classic interpreter pattern.</p>`, code: R`
static long EvalStack(string[] tokens)
{
    var st = new Stack<long>();
    for (int i = tokens.Length - 1; i >= 0; i--)
    {
        switch (tokens[i])
        {
            case "+": st.Push(st.Pop() + st.Pop()); break;
            case "*": st.Push(st.Pop() * st.Pop()); break;
            case "-": { long l = st.Pop(), r = st.Pop(); st.Push(l - r); break; }
            case "neg": st.Push(-st.Pop()); break;
            default: st.Push(long.Parse(tokens[i])); break;
        }
    }
    return st.Pop();
}` },
    mcq: { q: 'In the recursive parser, why pass the position by ref (or use a field)?', options: ['Each call consumes tokens and the caller must continue after them', 'To avoid boxing', 'ref makes recursion faster', 'Records require it'], answer: 0, explain: 'Parsing a subtree advances through the token list; the next sibling starts where the subtree ended.' },
    hints: [`<p>${C('abstract record Expr; record Num(long V) : Expr; record Bin(string Op, Expr L, Expr R) : Expr; record Neg(Expr E) : Expr;')}</p>`, `<p>${C('Parse(ref int i)')}: read tokens[i++]; for an operator parse the left child then the right child.</p>`, `<p>${C('Eval(e) => e switch { Num(var v) => v, Neg(var x) => -Eval(x), Bin("+", var l, var r) => Eval(l) + Eval(r), ... }')}.</p>`],
    solution: {
      approach: `<p>Recursive descent over prefix tokens builds the tree; positional patterns on the records evaluate it.</p>`,
      code: R`
public abstract record Expr;
public sealed record Num(long V) : Expr;
public sealed record Neg(Expr E) : Expr;
public sealed record Bin(string Op, Expr L, Expr R) : Expr;

public class Solution
{
    public long Eval(string[] tokens)
    {
        int i = 0;
        return Evaluate(Parse(tokens, ref i));
    }

    private static Expr Parse(string[] t, ref int i)
    {
        string tok = t[i++];
        switch (tok)
        {
            case "+" or "-" or "*":
                var left = Parse(t, ref i);
                var right = Parse(t, ref i);
                return new Bin(tok, left, right);
            case "neg":
                return new Neg(Parse(t, ref i));
            default:
                return new Num(long.Parse(tok));
        }
    }

    private static long Evaluate(Expr e) => e switch
    {
        Num(var v) => v,
        Neg(var x) => -Evaluate(x),
        Bin("+", var l, var r) => Evaluate(l) + Evaluate(r),
        Bin("-", var l, var r) => Evaluate(l) - Evaluate(r),
        Bin("*", var l, var r) => Evaluate(l) * Evaluate(r),
        _ => throw new InvalidOperationException($"unknown node {e}")
    };
}`,
      complexity: `<p>O(n) time; O(depth) recursion, at most 1000.</p>`,
      followUps: ['Add division that reports division by zero with a custom exception', 'Report malformed input with the token position']
    },
    tests: { sig: 'string[] -> long', fn: 'eval', cases: [
      [[['+', '1', '2']], 3],
      [[['*', '+', '1', '2', 'neg', '3']], -9],
      [[['5']], 5],
      [[['-', '10', 'neg', '4']], 14],
      [[['*', '100000', '100000']], 10000000000],
      [[['neg', 'neg', '7']], 7],
      [[['-', '*', '2', '3', '+', '4', '5']], -3]
    ] }
  });

  practice.push({
    title: 'Simplify an Expression Tree', level: 'Hard', tags: ['records', 'property patterns', 'recursion'], companies: ['Microsoft', 'JetBrains'],
    statement: `<p>Prefix tokens contain ${C('"+"')}, ${C('"*"')}, non-negative integers and variable names (letters). Simplify bottom-up: fold two constants into one; ${C('x + 0')} and ${C('0 + x')} → x; ${C('x * 1')} and ${C('1 * x')} → x; ${C('x * 0')} and ${C('0 * x')} → 0. Print the result fully parenthesised: a binary node prints as ${C('"(L op R)"')} with spaces around the operator.</p>`,
    constraints: `1 ≤ tokens.Length ≤ 1000; constants and folded results fit in a long`,
    example: `<p>${C('["+", "x", "*", "2", "3"]')} → ${C('"(x + 6)"')}; ${C('["*", "1", "+", "y", "0"]')} → ${C('"y"')}.</p>`,
    brute: { why: `<p>Rewriting the token list with string replacements repeatedly until nothing changes is fragile and quadratic. A tree with pattern-based rewrite rules applied after simplifying children handles every case in one pass.</p>`, code: R`
static string NoSimplify(string[] t)
{
    int i = 0;
    return Print(t, ref i);
    static string Print(string[] t, ref int i)
    {
        string tok = t[i++];
        if (tok is "+" or "*") { var l = Print(t, ref i); var r = Print(t, ref i); return $"({l} {tok} {r})"; }
        return tok;
    }
}` },
    mcq: { q: 'Why simplify children before matching the parent?', options: ['A child like (y + 0) only becomes y after simplification, enabling the parent rule', 'It is faster to read tokens that way', 'Records are immutable', 'Patterns cannot see children'], answer: 0, explain: 'Bottom-up rewriting means each rule sees already-simplified operands, e.g. 1 * (y + 0) → 1 * y → y.' },
    hints: [`<p>Records: ${C('Num(long V)')}, ${C('Var(string Name)')}, ${C('Bin(string Op, Expr L, Expr R)')}.</p>`, `<p>${C('Simplify(Bin b)')}: simplify L and R first, then ${C('(op, l, r) switch { ("+", Num(var a), Num(var c)) => new Num(a + c), ("+", var x, Num(0)) => x, ... }')}.</p>`, `<p>${C('ToString')} via another switch: Num → value, Var → name, Bin → "(L op R)".</p>`],
    solution: {
      approach: `<p>Parse into records, simplify recursively with a tuple switch over (operator, simplified left, simplified right), then print.</p>`,
      code: R`
public abstract record Node;
public sealed record Num(long V) : Node;
public sealed record Var(string Name) : Node;
public sealed record Bin(string Op, Node L, Node R) : Node;

public class Solution
{
    public string Simplify(string[] tokens)
    {
        int i = 0;
        return Show(Simp(Parse(tokens, ref i)));
    }

    private static Node Parse(string[] t, ref int i)
    {
        string tok = t[i++];
        if (tok is "+" or "*")
        {
            var l = Parse(t, ref i);
            var r = Parse(t, ref i);
            return new Bin(tok, l, r);
        }
        return long.TryParse(tok, out long v) ? new Num(v) : new Var(tok);
    }

    private static Node Simp(Node n)
    {
        if (n is not Bin(var op, var l0, var r0)) return n;
        Node l = Simp(l0), r = Simp(r0);
        return (op, l, r) switch
        {
            ("+", Num(var a), Num(var b)) => new Num(a + b),
            ("*", Num(var a), Num(var b)) => new Num(a * b),
            ("+", var x, Num(0)) => x,
            ("+", Num(0), var x) => x,
            ("*", _, Num(0)) or ("*", Num(0), _) => new Num(0),
            ("*", var x, Num(1)) => x,
            ("*", Num(1), var x) => x,
            _ => new Bin(op, l, r)
        };
    }

    private static string Show(Node n) => n switch
    {
        Num(var v) => v.ToString(),
        Var(var name) => name,
        Bin(var op, var l, var r) => $"({Show(l)} {op} {Show(r)})",
        _ => throw new InvalidOperationException()
    };
}`,
      complexity: `<p>O(n) time, O(depth) recursion.</p>`,
      followUps: ['Add x + x → (2 * x)', 'Make rules data-driven: a list of (pattern, rewrite) delegates']
    },
    tests: { sig: 'string[] -> string', fn: 'simplify', cases: [
      [[['+', 'x', '0']], 'x'],
      [[['*', '1', '+', 'y', '0']], 'y'],
      [[['*', 'x', '0']], '0'],
      [[['+', '2', '3']], '5'],
      [[['+', 'x', '*', '2', '3']], '(x + 6)'],
      [[['*', '+', 'a', 'b', '+', 'c', '0']], '((a + b) * c)'],
      [[['a']], 'a'],
      [[['+', '*', '0', 'x', '*', 'y', '1']], 'y']
    ] }
  });

  practice.push({
    title: 'Resolve Layered Settings', level: 'Easy', tags: ['??', 'nullable reference types'], companies: ['Microsoft', 'Atlassian'],
    statement: `<p>Three arrays of equal length hold optional values for each setting: ${C('user')}, ${C('team')} and ${C('global')} (null = not set). The effective value is the first non-null in that order, or ${C('"default"')}. An empty string counts as set.</p>`,
    constraints: `0 ≤ length ≤ 10<sup>5</sup>`,
    example: `<p>user ${C('["a", null]')}, team ${C('[null, "b"]')}, global ${C('["x", "y"]')} → ${C('["a", "b"]')}.</p>`,
    brute: { why: `<p>Nested if statements per index are verbose; ${C('??')} chains are right-associative and evaluate only as far as needed.</p>`, code: R`
static string[] ResolveIf(string?[] u, string?[] t, string?[] g)
{
    var r = new string[u.Length];
    for (int i = 0; i < u.Length; i++)
    {
        if (u[i] != null) r[i] = u[i]!;
        else if (t[i] != null) r[i] = t[i]!;
        else if (g[i] != null) r[i] = g[i]!;
        else r[i] = "default";
    }
    return r;
}` },
    mcq: { q: 'Is `a ?? b ?? c` parsed as `(a ?? b) ?? c` or `a ?? (b ?? c)`?', options: ['a ?? (b ?? c) — right-associative', '(a ?? b) ?? c', 'It does not compile', 'Depends on types'], answer: 0, explain: 'The null-coalescing operator is right-associative; either way the first non-null wins and later operands are not evaluated.' },
    hints: [`<p>Loop over the indices of the arrays; they all have the same length.</p>`, `<p>${C('user[i] ?? team[i] ?? global[i] ?? "default"')}.</p>`, `<p>Do not use ${C('string.IsNullOrEmpty')} — empty is a real value here.</p>`],
    solution: {
      approach: `<p>One ${C('??')} chain per index.</p>`,
      code: R`
public class Solution
{
    public string[] Resolve(string?[] user, string?[] team, string?[] global)
    {
        var result = new string[user.Length];
        for (int i = 0; i < result.Length; i++)
            result[i] = user[i] ?? team[i] ?? global[i] ?? "default";
        return result;
    }
}`,
      complexity: `<p>O(n) time, O(n) for the result.</p>`,
      followUps: ['Report which layer each value came from', 'Use Zip to write it with LINQ']
    },
    tests: { sig: 'string[] string[] string[] -> string[]', fn: 'resolve', cases: [
      [[['a', null], [null, 'b'], ['x', 'y']], ['a', 'b']],
      [[[null], [null], [null]], ['default']],
      [[[], [], []], []],
      [[[null, null, null], ['t', null, null], [null, null, 'g']], ['t', 'default', 'g']],
      [[[''], ['t'], ['g']], ['']],
      [[['u'], ['t'], ['g']], ['u']]
    ] }
  });

  practice.push({
    title: 'Atomic Transfer Batches', level: 'Hard', tags: ['custom exceptions', 'rollback', 'exception safety'], companies: ['Goldman Sachs', 'JPMorgan', 'Stripe'],
    statement: `<p>Accounts start with ${C('balances')}. Each transfer is ${C('[batch, from, to, amount]')}, sorted by batch id. Apply each batch's transfers in order; a transfer fails with an exception if an account index is invalid (${C('AccountNotFoundException')}), the amount is ≤ 0 (${C('ArgumentOutOfRangeException')}), or the source balance is less than the amount (${C('InsufficientFundsException')}). A failure <b>rolls back the whole batch</b>; processing continues with the next batch. Return the final balances.</p>`,
    constraints: `1 ≤ balances.Length ≤ 10<sup>4</sup>; 0 ≤ transfers ≤ 10<sup>5</sup>; values fit in int`,
    example: `<p>balances ${C('[100, 50]')}, transfers ${C('[[1,0,1,30],[1,1,0,200]]')} → ${C('[100, 50]')} (the second transfer fails, so the first is undone).</p>`,
    brute: { why: `<p>Validating every transfer of a batch up front is not enough: a transfer can become invalid only because of an earlier one in the same batch. Applying with a snapshot and restoring it in the catch gives the strong exception guarantee simply.</p>`, code: R`
static int[] NoRollback(int[] balances, int[][] transfers)
{
    var b = (int[])balances.Clone();
    foreach (var t in transfers)
    {
        int from = t[1], to = t[2], amt = t[3];
        if (from < 0 || from >= b.Length || to < 0 || to >= b.Length || amt <= 0 || b[from] < amt) continue;
        b[from] -= amt; b[to] += amt;
    }
    return b;
}` },
    mcq: { q: 'Which exception-safety guarantee does "roll back the whole batch on failure" provide?', options: ['Strong guarantee: all or nothing', 'Basic guarantee only', 'No-throw guarantee', 'None'], answer: 0, explain: 'The state is either fully updated or left exactly as before the batch — the strong guarantee.' },
    hints: [`<p>Group consecutive transfers with the same batch id.</p>`, `<p>Before a batch, ${C('var snapshot = (int[])b.Clone();')}; in ${C('catch (Exception e) when (e is TransferException or ArgumentOutOfRangeException)')} copy it back.</p>`, `<p>A small base class ${C('TransferException')} lets one filter cover both custom types.</p>`],
    solution: {
      approach: `<p>For each batch, snapshot, apply transfers that throw on failure, and restore the snapshot in the catch. The exception hierarchy keeps the handler precise: only the expected failures roll back; bugs still propagate.</p>`,
      code: R`
public abstract class TransferException(string message) : Exception(message);
public sealed class AccountNotFoundException(int account) : TransferException($"no account {account}");
public sealed class InsufficientFundsException(int account, int needed) : TransferException($"account {account} lacks {needed}");

public class Solution
{
    private static void Transfer(int[] b, int from, int to, int amount)
    {
        if ((uint)from >= (uint)b.Length) throw new AccountNotFoundException(from);
        if ((uint)to >= (uint)b.Length) throw new AccountNotFoundException(to);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(amount);
        if (b[from] < amount) throw new InsufficientFundsException(from, amount);
        b[from] -= amount;
        b[to] += amount;
    }

    public int[] ApplyBatches(int[] balances, int[][] transfers)
    {
        var b = (int[])balances.Clone();
        int i = 0;
        while (i < transfers.Length)
        {
            int batch = transfers[i][0], j = i;
            while (j < transfers.Length && transfers[j][0] == batch) j++;
            var snapshot = (int[])b.Clone();
            try
            {
                for (int k = i; k < j; k++) Transfer(b, transfers[k][1], transfers[k][2], transfers[k][3]);
            }
            catch (Exception e) when (e is TransferException or ArgumentOutOfRangeException)
            {
                snapshot.CopyTo(b, 0);
            }
            i = j;
        }
        return b;
    }
}`,
      complexity: `<p>O(T + B·N) where B is the number of batches (one snapshot each); an undo log of touched accounts reduces it to O(T).</p>`,
      followUps: ['Replace the snapshot with an undo log', 'Return which batches failed and why']
    },
    tests: { sig: 'int[] int[][] -> int[]', fn: 'applyBatches', cases: [
      [[[100, 50], [[1, 0, 1, 30]]], [70, 80]],
      [[[100, 50], [[1, 0, 1, 30], [1, 1, 0, 200]]], [100, 50]],
      [[[10, 0, 0], [[1, 0, 1, 10], [2, 1, 2, 5], [2, 2, 0, 1]]], [1, 5, 4]],
      [[[5], []], [5]],
      [[[5, 5], [[1, 0, 3, 1], [2, 0, 1, 5]]], [0, 10]],
      [[[5, 5], [[1, 0, 1, 0]]], [5, 5]],
      [[[1, 2, 3], [[1, 0, 1, 1], [1, 1, 2, 3], [2, 2, 0, 6], [3, 0, 1, 1]]], [5, 1, 0]]
    ] }
  });

  practice.push({
    title: 'Strict List Parser with Error Positions', level: 'Hard', tags: ['custom exceptions', 'parsing', 'error reporting'], companies: ['Microsoft', 'Google'],
    statement: `<p>Parse a string of the exact form ${C('[n1,n2,...]')}: a ${C('[')}, zero or more integers separated by single commas, a ${C(']')}, and nothing after it. An integer is an optional ${C('-')} followed by one or more digits; no spaces anywhere. On success return ${C('"sum=S count=C"')}. On failure throw a custom ${C('ParseException')} carrying the 0-based position of the first unexpected character (or the string length if the input ended early) and return ${C('"error at P"')}.</p>`,
    constraints: `0 ≤ s.Length ≤ 10<sup>5</sup>; each integer has at most 9 digits`,
    example: `<p>${C('"[1,2,3]"')} → ${C('"sum=6 count=3"')}; ${C('"[1,,2]"')} → ${C('"error at 3"')}; ${C('"[1,2"')} → ${C('"error at 4"')}.</p>`,
    brute: { why: `<p>${C('s.Trim(\'[\', \']\').Split(\',\')')} + ${C('int.Parse')} accepts malformed input (${C('"[[1]]"')}, spaces) and cannot say <i>where</i> the error is. A tiny recursive-descent parser with a positioned exception gives precise diagnostics.</p>`, code: R`
static string Loose(string s)
{
    try
    {
        var inner = s.Trim('[', ']');
        var parts = inner.Length == 0 ? Array.Empty<string>() : inner.Split(',');
        long sum = parts.Sum(p => (long)int.Parse(p));
        return $"sum={sum} count={parts.Length}";
    }
    catch (FormatException) { return "error"; }
}` },
    mcq: { q: 'Why carry the position in a custom exception instead of returning -1 from each helper?', options: ['The error can be raised deep inside helpers and caught once at the top, with the data attached', 'Exceptions are faster than returns', 'Positions cannot be returned', 'C# requires it'], answer: 0, explain: 'A typed exception with a Position property propagates through any depth of helpers without every method checking error codes.' },
    hints: [`<p>Keep an index ${C('_i')}; helpers ${C('Expect(char c)')}, ${C('ParseInt()')}, ${C('Peek')} that throw ${C('ParseException(_i)')}.</p>`, `<p>After ${C('[')}: if the next char is ${C(']')}, the list is empty; otherwise loop: number, then ${C(',')} (continue) or ${C(']')} (stop).</p>`, `<p>After the closing bracket, if ${C('_i != s.Length')} throw at ${C('_i')}.</p>`],
    solution: {
      approach: `<p>Recursive-descent style with one cursor. Every helper throws ${C('ParseException')} with the cursor position; the public method converts it to the message.</p>`,
      code: R`
public sealed class ParseException(int position) : Exception($"unexpected input at {position}")
{
    public int Position { get; } = position;
}

public class Solution
{
    private string _s = "";
    private int _i;

    public string ParseList(string s)
    {
        _s = s; _i = 0;
        try
        {
            long sum = 0; int count = 0;
            Expect('[');
            if (Peek() != ']')
            {
                while (true)
                {
                    sum += ParseInt(); count++;
                    if (Peek() == ',') { _i++; continue; }
                    break;
                }
            }
            Expect(']');
            if (_i != _s.Length) throw new ParseException(_i);
            return $"sum={sum} count={count}";
        }
        catch (ParseException e)
        {
            return $"error at {e.Position}";
        }
    }

    private char Peek() => _i < _s.Length ? _s[_i] : '\0';

    private void Expect(char c)
    {
        if (Peek() != c) throw new ParseException(_i);
        _i++;
    }

    private long ParseInt()
    {
        bool neg = false;
        if (Peek() == '-') { neg = true; _i++; }
        if (!char.IsAsciiDigit(Peek())) throw new ParseException(_i);
        long v = 0;
        while (char.IsAsciiDigit(Peek())) v = v * 10 + (_s[_i++] - '0');
        return neg ? -v : v;
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space.</p>`,
      followUps: ['Allow optional spaces around tokens', 'Collect all errors (error recovery) instead of stopping at the first']
    },
    tests: { sig: 'string -> string', fn: 'parseList', cases: [
      [['[1,2,3]'], 'sum=6 count=3'],
      [['[]'], 'sum=0 count=0'],
      [['[1,,2]'], 'error at 3'],
      [['1,2]'], 'error at 0'],
      [['[1,2'], 'error at 4'],
      [['[-5,10]'], 'sum=5 count=2'],
      [['[1]x'], 'error at 3'],
      [['[-]'], 'error at 2'],
      [[''], 'error at 0'],
      [['[ 1]'], 'error at 1']
    ] }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which block runs when a try block executes `return 5;` without any exception?', options: ['finally', 'catch', 'Neither', 'Both catch and finally'], answer: 0, explain: 'finally runs on every exit path from the try, including return; catch runs only for a matching exception.' },
    { q: 'What is the difference between `throw;` and `throw e;` inside a catch?', options: ['throw; keeps the original stack trace; throw e; resets it', 'throw e; is faster', 'throw; creates a new exception', 'No difference'], answer: 0, explain: 'Both rethrow the same object, but throw e; restarts the stack trace at the rethrow point.' },
    { q: 'When does an exception filter (`catch ... when (cond)`) run?', options: ['During the first pass, before the stack is unwound', 'After all finally blocks', 'After the catch body', 'Only if no other catch matches'], answer: 0, explain: 'Filters are evaluated during the handler search, so the throwing frames are still on the stack.' },
    { q: 'In what order are `using var a = ...; using var b = ...;` disposed?', options: ['b then a', 'a then b', 'In parallel', 'Unspecified'], answer: 0, explain: 'Using declarations are disposed in reverse order of declaration (LIFO).' },
    { q: 'What does `int? x = null; Console.WriteLine(x < 5 || x >= 5);` print?', options: ['False', 'True', 'It throws', 'It does not compile'], answer: 0, explain: 'Lifted relational operators return false when an operand is null, so both comparisons are false.' },
    { q: 'What happens at runtime when you assign null to a non-nullable `string` with nullable reference types enabled?', options: ['Nothing — it is only a compiler warning', 'NullReferenceException immediately', 'ArgumentNullException', 'The assignment is ignored'], answer: 0, explain: 'Nullable reference types are compile-time analysis; the runtime type is still string, which accepts null.' },
    { q: 'What does `customer?.Address?.City ?? "n/a"` evaluate to when customer is null?', options: ['"n/a"', 'null', 'It throws NullReferenceException', 'An empty string'], answer: 0, explain: '?. short-circuits the whole chain to null, and ?? supplies the default.' },
    { q: 'Which statement about the null-forgiving operator `x!` is true?', options: ['It suppresses the warning and performs no runtime check', 'It throws if x is null', 'It converts null to default', 'It makes x nullable'], answer: 0, explain: 'The ! operator only affects static analysis.' },
    { q: 'What happens if no arm of a switch expression matches at runtime?', options: ['SwitchExpressionException is thrown', 'default(T) is returned', 'The first arm is used', 'It cannot happen; the compiler forbids it'], answer: 0, explain: 'The compiler warns about non-exhaustive switches; at runtime an unmatched value throws SwitchExpressionException.' },
    { q: 'Which value matches `[_, .., 0]`?', options: ['new[] { 5, 0 }', 'new[] { 0 }', 'new int[0]', 'new[] { 0, 5 }'], answer: 0, explain: 'The pattern needs at least two elements with the last equal to 0; [0] has only one element.' },
    { q: 'Which pattern means "not null and not the empty string"?', options: ['not null and not ""', 'not (null or "") or ""', '!= null && != ""', 'is { } or ""'], answer: 0, explain: 'Logical patterns combine with not/and/or; && is not valid inside a pattern.' },
    { q: 'Boxing an `int?` that is null gives…', options: ['a null reference', 'a boxed Nullable&lt;int&gt; with HasValue = false', 'a boxed 0', 'an exception'], answer: 0, explain: 'The runtime boxes a null Nullable&lt;T&gt; to null and a non-null one to a boxed T.' },
    { q: 'Why should Dispose be safe to call more than once?', options: ['Callers and using blocks may dispose the same object twice; the second call must be harmless', 'The GC calls it twice', 'It is required by the compiler', 'To free memory faster'], answer: 0, explain: 'The IDisposable contract says multiple calls must not throw; a _disposed flag is the usual implementation.' },
    { q: 'Which is the best way to handle frequent invalid user input like "abc" for a number?', options: ['int.TryParse', 'int.Parse in try/catch', 'Convert.ToInt32 in try/catch', 'A finalizer'], answer: 0, explain: 'TryParse reports failure through the return value without the cost of throwing.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'Explain how the CLR finds a handler for a thrown exception.', level: 'I', a: `<p>On ${C('throw')} the runtime performs a <b>two-pass</b> search. Pass one walks up the call stack frame by frame, checking each protected region's catch clauses in order; a clause matches if the exception's type is the declared type or derived from it <i>and</i> its filter (if any) returns true. Filters run in this pass, with the stack intact. Once a handler is found, pass two unwinds: frames are popped from the innermost outwards, running their finally (and fault) blocks, and then the catch body runs. If no handler is found the unhandled-exception path terminates the process.</p>`, followUps: ['Why does a filter see the original stack?', 'What is a first-chance exception?'] },
    { q: 'When would you write a custom exception type, and what should it contain?', level: 'B', a: `<p>When callers need to distinguish this failure from others to react differently, or when the failure carries data a handler needs (a status code, the invalid field, a retry-after time). Derive from ${C('Exception')} (or a domain base exception), end the name with "Exception", pass a clear message to the base constructor, expose data as read-only properties, and offer a constructor taking an inner exception for wrapping. If an existing type such as ${C('ArgumentException')} or ${C('InvalidOperationException')} already says it, reuse that instead.</p>`, followUps: ['Do you still need the serialization constructor in .NET 8?', 'Should custom exceptions be sealed?'] },
    { q: 'What is the difference between throw, throw ex and throw new X(..., ex)?', level: 'B', a: `<p>${C('throw;')} rethrows the current exception and preserves its stack trace — the right choice when you log or partially handle and then let it continue. ${C('throw ex;')} rethrows the same object but resets the stack trace to the current line, destroying the information about where it really failed (analyzer CA2200 flags it). ${C('throw new DomainException("msg", ex);')} wraps the exception in a higher-level one, adding meaning while preserving the original as ${C('InnerException')}.</p>`, followUps: ['How does ExceptionDispatchInfo help across threads?'] },
    { q: 'How are exception filters better than catching and rethrowing?', level: 'I', a: `<p>A filter (${C('catch (E e) when (cond)')}) decides <i>before</i> unwinding whether the clause applies. If false, the exception is never caught, so the stack is not unwound, finally blocks of inner frames have not run yet, the original stack trace and debugger "break on unhandled" behaviour are preserved, and there is no cost of a rethrow. Catch-and-rethrow unwinds first, then throws again. Filters also enable the logging trick: ${C('when (Log(e))')} returning false logs every exception with full context without handling it.</p>`, followUps: ['What happens if the filter itself throws?'] },
    { q: 'What does using compile to, and what is the order of disposal for multiple resources?', level: 'B', a: `<p>${C('using (var r = expr) body')} becomes ${C('var r = expr; try { body } finally { if (r != null) ((IDisposable)r).Dispose(); }')}. A using declaration (${C('using var r = ...;')}) is the same with the scope ending at the enclosing block. Multiple resources are disposed in reverse order of acquisition (LIFO), which matches dependencies: a writer created on top of a stream is disposed before the stream. If the initializer throws, there is nothing to dispose because the try has not started.</p>`, followUps: ['How does await using differ?', 'What if Dispose throws while another exception is in flight?'] },
    { q: 'Explain the dispose pattern and when a finalizer is needed.', level: 'I', a: `<p>Most classes only own managed disposables; they implement ${C('IDisposable')} with a simple idempotent ${C('Dispose()')} that disposes their fields — no finalizer. Only a class that <b>directly</b> owns an unmanaged resource (a raw OS handle or native memory) needs a finalizer as a safety net, and today you should wrap such handles in a ${C('SafeHandle')} subclass instead, which has the finalizer for you. The classic pattern is ${C('Dispose()')} calling ${C('Dispose(true)')} and ${C('GC.SuppressFinalize(this)')}, the finalizer calling ${C('Dispose(false)')}, and ${C('protected virtual void Dispose(bool disposing)')} releasing managed state only when disposing is true. Module 8 goes deeper.</p>`, followUps: ['Why must the finalizer not touch other managed objects?'] },
    { q: 'What are nullable reference types and what do they guarantee?', level: 'I', a: `<p>With nullable context enabled, ${C('string')} means "should never be null" and ${C('string?')} means "may be null". The compiler performs flow analysis and warns when a maybe-null value is dereferenced or assigned to a non-nullable location. It guarantees nothing at runtime: annotations are metadata, warnings can be ignored or suppressed with ${C('!')}, code compiled without the feature can still pass null, and arrays or fields set via reflection escape analysis. Public APIs should still validate arguments with ${C('ArgumentNullException.ThrowIfNull')}.</p>`, followUps: ['How do [NotNullWhen] and [MemberNotNull] help?', 'How would you migrate a large codebase?'] },
    { q: 'What does T? mean for an unconstrained generic T?', level: 'A', a: `<p>Since C# 9 an unconstrained ${C('T?')} means "T or its default value is allowed here". For reference type arguments it means a nullable reference (may be null). For value type arguments it does <b>not</b> become ${C('Nullable<T>')}; ${C('T?')} with ${C('T = int')} is just ${C('int')}, so a "not found" result is 0, indistinguishable from a real 0. If you need a real "no value" for both kinds, constrain (${C('where T : struct')} gives ${C('Nullable<T>')}, ${C('where T : class')} gives a nullable reference) or use a Try pattern / Option type.</p>`, followUps: ['What does the notnull constraint do?'] },
    { q: 'Compare int?, sentinel values and Try methods for representing "no value".', level: 'I', a: `<p>Sentinels (−1, int.MinValue) are cheap but risky: the sentinel may be a valid value and callers forget to check. ${C('int?')} makes absence explicit in the type, costs a few bytes inline (no allocation), and composes with ${C('??')} and patterns. ${C('bool TryGet(..., out T value)')} is the established .NET convention for lookups and parsing: no allocation, clear success flag, and works for reference and value types alike. Choose int? for data that may be missing (database columns, optional fields) and Try methods for operations that may fail.</p>`, followUps: ['How do lifted comparison operators surprise people?'] },
    { q: 'What is the difference between a switch statement and a switch expression?', level: 'B', a: `<p>A switch <b>statement</b> executes case sections (statements, requires break/return, supports goto case). A switch <b>expression</b> (C# 8) produces a value: ${C('x switch { pattern => value, ... }')}, arms separated by commas, no fall-through, every arm must produce a compatible type. Both support all patterns and when guards. A switch expression without a matching arm throws ${C('SwitchExpressionException')}; the compiler warns when it can tell the arms are not exhaustive and errors on arms subsumed by earlier ones.</p>`, followUps: ['How does the compiler optimise many arms?'] },
    { q: 'Walk through the pattern kinds available in C# 12.', level: 'I', a: `<p>Constant (${C('0, null, "x"')}), type/declaration (${C('Circle c')}), var (${C('var x')}), discard (${C('_')}), property (${C('{ Total: > 100 }')}, with extended dotted paths), positional (${C('Point(0, var y)')} via Deconstruct, including tuples), relational (${C('< 0, >= 10')}), logical (${C('and, or, not')} and parentheses), and list patterns (${C('[1, .., var last]')} with an optional slice). Patterns nest freely and can be used in ${C('is')} expressions, switch statements and switch expressions, combined with ${C('when')} guards for conditions patterns cannot express.</p>`, followUps: ['Which require compile-time constants?'] },
    { q: 'When would you choose a switch over records instead of virtual methods?', level: 'A', a: `<p>This is the expression problem. Virtual methods make it easy to add new <b>types</b> (a new shape just overrides Area) but adding a new <b>operation</b> touches every class. A switch over a closed set of records makes adding operations easy (one new function with all cases) but adding a type means updating every switch. For ASTs, messages, events and results — data whose set of shapes is stable while operations grow — pattern matching fits. For plug-in style extensibility (new payment providers) use polymorphism. C# lacks closed hierarchies, so use a discard arm that throws to catch missing cases.</p>`, followUps: ['How would you simulate a discriminated union in C# 12?'] },
    { q: 'Why is catching Exception at every layer an anti-pattern? Where should you catch it?', level: 'I', a: `<p>Catching broadly in inner layers hides bugs (NullReference, InvalidCast), leaves objects in half-updated states, and duplicates logging. Code should catch only what it can meaningfully handle — retry a transient error, translate an exception into a domain error, or clean up. A broad ${C('catch (Exception)')} belongs at <b>boundaries</b>: the top of a request pipeline (ASP.NET Core middleware), a UI event handler, the loop of a background worker — where you log once, return an error response and keep the process healthy.</p>`, followUps: ['What about OutOfMemoryException and StackOverflowException?'] },
    { q: 'How expensive are exceptions in .NET, and how do you design around that?', level: 'A', a: `<p>Entering a try is nearly free (table-based handling, no setup code on the happy path). Throwing costs microseconds: allocating the exception, capturing the stack trace, the two-pass search through EH tables, and unwinding. .NET 9 made it faster, but it is still orders of magnitude slower than a return. So: never use exceptions for expected control flow in hot paths; provide ${C('TryXxx')} methods for operations that commonly fail; validate input up front; and consider a Result type for domain failures. Reserve exceptions for genuinely exceptional conditions and bugs.</p>`, followUps: ['How would you measure it with BenchmarkDotNet?'] },
    { q: 'Predict the output: `int F() { int x = 1; try { return x; } finally { x = 2; } }`. What if x were a List and finally added an element?', level: 'E', a: `<p>${C('F()')} returns <b>1</b>. The return expression is evaluated and stored before finally runs; changing the local afterwards does not change the stored value. With a ${C('List<int>')}, the stored value is the <i>reference</i>, so mutations made in finally (${C('list.Add(2)')}) are visible to the caller, while reassigning the variable (${C('list = new()')}) is not. The same rule explains closures and value vs reference semantics generally.</p>`, followUps: ['Why can you not return from a finally block?'] }
  );

  registerModule({
    id: 'csharp07',
    title: 'Exceptions, Nullability & Pattern Matching',
    intro: `<p>This module is about writing C# that fails <b>clearly</b> and handles absence <b>explicitly</b>. You will learn exactly how an exception travels up the stack, when to create your own exception types, how exception filters work before unwinding, and why ${C('throw;')} beats ${C('throw e;')}. You will use ${C('using')} and ${C('IDisposable')} to release resources deterministically, master ${C('int?')} and nullable reference types with the ${C('?.')}, ${C('??')}, ${C('??=')} and ${C('!')} operators, and finish with modern pattern matching: switch expressions, type, property, positional, relational, logical and list patterns.</p>
<p>Each topic has a visualizer — follow an exception through the call stack, watch filters decide, see resources close in LIFO order, short-circuit a ${C('?.')} chain and test arrays against list patterns — plus runnable C# 12 code, interview questions and practice problems checked by tests.</p>`,
    goals: [
      'Trace any try/catch/finally program, including returns, rethrows and filters, and predict its output',
      'Design custom exception types with useful data and choose between throw;, throw e; and wrapping',
      'Release resources deterministically with using / await using and implement IDisposable correctly',
      'Use int?, nullable reference types and the null operators to make absence explicit',
      'Write switch expressions with type, property, positional, relational, logical and list patterns',
      'Decide between exceptions, Try methods and patterns for each kind of failure'
    ],
    prereqs: `C# 4 (OOP: inheritance, interfaces, records from C# 3) and C# 6 (delegates, lambdas and LINQ, used in a few examples).`,
    hours: 11,
    langNotes: {
      csharp: `<p>C# has no checked exceptions: nothing forces callers to catch. Unhandled exceptions terminate the process; ${C('StackOverflowException')} cannot be caught at all. Nullable reference types are warnings, not runtime checks — validate public arguments with ${C('ArgumentNullException.ThrowIfNull')}. Arithmetic is unchecked by default (wraps silently); use ${C('checked')} to get ${C('OverflowException')}. Switch expressions throw ${C('SwitchExpressionException')} when no arm matches.</p>`
    },
    topics: topics.map(function (t) { t.examples.forEach(function (ex) { if (typeof ex.code === 'string') ex.code = { lang: 'csharp', code: ex.code, run: true }; }); return t; }),
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
