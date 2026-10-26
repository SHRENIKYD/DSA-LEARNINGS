(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- small helpers shared by the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'Why', html: html }; }
  function cs(code, hl, label) { return { type: 'code', label: label || 'C# (highlighted line = running now)', lang: 'csharp', code: code, hl: hl || {} }; }
  // steps: [line, narration, vars?, stack?, output?]
  function walk(code, steps) {
    return steps.map(function (s) {
      var parts = [cs(code, one(s[0], 'cur'))];
      if (s[2]) parts.push({ type: 'vars', label: 'State', vals: s[2] });
      if (s[3]) parts.push({ type: 'stack', label: 'Call stack (top = running)', items: s[3].slice(), hl: one(s[3].length - 1, 'cur') });
      if (s[4] !== undefined) parts.push(note(s[4] || '<i>(nothing printed yet)</i>', 'Console output so far'));
      return { narr: s[1], parts: parts };
    });
  }
  function words(input, hint, max) {
    var a = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!a.length || a.length > (max || 8)) throw new Error(hint);
    return a;
  }

  function ints(input, hint, max) {
    var a = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; }).map(Number);
    if (!a.length || a.length > (max || 12) || a.some(function (x) { return isNaN(x) || Math.abs(x) > 999; })) throw new Error(hint);
    return a;
  }

  /* ======================================================================
     TOPIC 1 — Delegates
     ====================================================================== */
  topics.push({
    title: 'Delegates — Methods You Can Pass Around',
    analogy: `<p>When you leave for a holiday you give a friend a <b>note with instructions</b>: "<i>water the plants</i>". The friend does not need to know <i>how</i> you like it done — they just follow the note when the time comes. A <b>delegate</b> is that note for code: a type-safe object that points at a method, which someone else can call later. A <b>multicast</b> delegate is a note with several instructions on it, carried out in order.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A delegate type describes a method <b>signature</b>; a delegate instance holds a reference to a matching method (and the object it belongs to, for instance methods).</p>
${H.table(['Step', 'Code'], [
  ['Declare a delegate type', '<code>delegate int BinaryOp(int a, int b);</code>'],
  ['Create an instance from a method group', '<code>BinaryOp op = Add;</code> (or <code>new BinaryOp(Add)</code>)'],
  ['Create one from a lambda', '<code>BinaryOp op = (a, b) =&gt; a * b;</code>'],
  ['Invoke it', '<code>op(3, 4)</code> or <code>op.Invoke(3, 4)</code>'],
  ['Invoke only if not null', '<code>op?.Invoke(3, 4)</code>']
])}
<p><b>Multicast.</b> Delegates can be combined with <code>+</code>/<code>+=</code> and removed with <code>-</code>/<code>-=</code>. Calling a multicast delegate calls every method in its <b>invocation list</b>, in order:</p>
<ul>
<li>the <b>return value</b> is the one from the <b>last</b> method (the others are discarded) — so multicast is meant for <code>void</code> notifications;</li>
<li>if one method throws, the remaining ones are <b>not called</b>;</li>
<li><code>-=</code> removes the <b>last</b> occurrence of a matching method; removing something not in the list does nothing; removing the last item gives <code>null</code>.</li>
</ul>
<p><b>Delegates are immutable.</b> <code>a += b</code> builds a <b>new</b> delegate object and assigns it to <code>a</code>; anyone holding the old one still sees the old list. That is what makes the "copy then invoke" pattern thread-safe.</p>
<p>In everyday C# you rarely declare delegate types: you use the built-in generic ones, <code>Func&lt;…&gt;</code> and <code>Action&lt;…&gt;</code> (next topic). Custom delegate types are still used for events, for <code>ref</code>/<code>out</code> parameters, and when a name documents the role (<code>Comparison&lt;T&gt;</code>, <code>ThreadStart</code>).</p>`,
    clues: [
      '"pass a method as a parameter" / "callback" → delegate (usually Func/Action)',
      '"call several handlers in order" → multicast delegate / event',
      '"what does a multicast delegate return?" → the last handler\'s result',
      '"NullReferenceException when invoking a callback" → nobody subscribed; use <code>?.Invoke</code>',
      '"strategy chosen at run time without an interface" → delegate field',
      '"C function pointer equivalent" → delegate (or <code>delegate*</code> function pointers in unsafe code)'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Delegate types, method groups and multicast (runnable)', code: `BinaryOp op = Add;                        // method group conversion
Console.WriteLine(op(3, 4));              // 7
op = (a, b) => a * b;                     // a lambda with the same signature
Console.WriteLine(op.Invoke(3, 4));       // 12

Notify? notify = null;
notify?.Invoke("nobody listening");       // safe: no call, no exception

notify += Console.WriteLine;              // static method group
notify += msg => Console.WriteLine(msg.ToUpperInvariant());
notify += Log.Write;
notify("hello");                          // three handlers run, in order
Console.WriteLine(notify.GetInvocationList().Length);   // 3

notify -= Log.Write;                      // remove one
notify("bye");

BinaryOp both = Add;
both += Multiply;
Console.WriteLine(both(2, 5));            // 10: only the LAST result is returned

static int Add(int a, int b) => a + b;
static int Multiply(int a, int b) => a * b;

delegate int BinaryOp(int a, int b);
delegate void Notify(string message);

static class Log { public static void Write(string m) => Console.WriteLine("[log] " + m); }` }],
    codeTitle: ['Delegates'],
    viz: {
      title: 'The invocation list of a multicast delegate',
      input: '+A +B +A -A +C',
      inputLabel: 'Operations: +X adds handler X, -X removes it (handlers A–E)',
      gen: function (input) {
        var ops = words(input, 'Enter operations like "+A +B -A"', 10);
        var list = [], frames = [];
        frames.push({ narr: 'Start: <code>Action? d = null;</code> — an empty delegate is just <b>null</b>.', parts: [{ type: 'array', label: 'invocation list', values: ['null'] }] });
        ops.forEach(function (op) {
          if (!/^[+-][A-E]$/.test(op)) throw new Error('Use +A..+E or -A..-E');
          var h = op[1];
          if (op[0] === '+') {
            list = list.concat([h]);
            frames.push({ narr: '<code>d += ' + h + ';</code> creates a <b>new</b> delegate whose list is the old list plus ' + h + ' at the end. The old delegate object is unchanged (immutable).', parts: [{ type: 'array', label: 'invocation list', values: list.slice(), hl: one(list.length - 1, 'ok') }] });
          } else {
            var idx = list.lastIndexOf(h);
            if (idx < 0) { frames.push({ narr: '<code>d -= ' + h + ';</code> — ' + h + ' is not in the list, so nothing changes (no exception).', parts: [{ type: 'array', label: 'invocation list', values: list.length ? list.slice() : ['null'] }] }); return; }
            var before = list.slice(); list = list.slice(0, idx).concat(list.slice(idx + 1));
            frames.push({ narr: '<code>d -= ' + h + ';</code> removes the <b>last</b> occurrence (index ' + idx + ').' + (list.length ? '' : ' The list is now empty, so d becomes <b>null</b> again.'), parts: [{ type: 'array', label: 'before', values: before, hl: one(idx, 'bad') }, { type: 'array', label: 'after', values: list.length ? list.slice() : ['null'] }] });
          }
        });
        frames.push({ narr: list.length ? '<code>d()</code> calls ' + list.join(' → ') + ' in order. If one throws, the rest are skipped; if they return values, only the last is kept.' : 'd is null: calling <code>d()</code> would throw NullReferenceException; <code>d?.Invoke()</code> does nothing.', parts: [{ type: 'queue', label: 'call order', items: list.length ? list.slice() : ['(nothing)'] }] });
        return frames;
      }
    },
    examples: [
      { title: 'A delegate as a callback parameter', html: `<p><code>Comparison&lt;T&gt;</code> is a BCL delegate type. Passing a method or lambda lets <code>Array.Sort</code> call back into your code for every comparison.</p>`, code: { lang: 'csharp', run: true, code: `string[] names = ["Charlotte", "Al", "Bea"];
Array.Sort(names, ByLength);
Console.WriteLine(string.Join(" ", names));   // Al Bea Charlotte

static int ByLength(string a, string b) => a.Length.CompareTo(b.Length);` } },
      { title: 'Exceptions stop the chain', html: `<p>If you need every subscriber to run even when one fails, iterate <code>GetInvocationList()</code> yourself and catch per handler.</p>`, code: { lang: 'csharp', run: true, code: `Action chain = () => Console.WriteLine("first");
chain += () => throw new InvalidOperationException("boom");
chain += () => Console.WriteLine("third");

foreach (Action handler in chain.GetInvocationList())
{
    try { handler(); }
    catch (Exception e) { Console.WriteLine("handler failed: " + e.Message); }
}` } },
      { title: 'Instance method delegates capture the target', html: `<p>A delegate to an instance method stores both the method and the object (<code>Target</code>). As long as the delegate is reachable, so is the object — the root of many event-related memory leaks.</p>`, code: { lang: 'csharp', run: true, code: `var counter = new Counter();
Action tick = counter.Increment;
tick(); tick();
Console.WriteLine(counter.Value);                         // 2
Console.WriteLine(tick.Target == counter);                // True
Console.WriteLine(tick.Method.Name);                      // Increment

sealed class Counter { public int Value; public void Increment() => Value++; }` } }
    ],
    deepDive: `<p><b>🟣 What a delegate is at run time.</b> Every delegate type compiles to a sealed class deriving from <code>System.MulticastDelegate</code>, with a constructor and an <code>Invoke</code> method whose body the runtime supplies. An instance stores <code>_target</code> (the object, or null for static methods), <code>_methodPtr</code> (a code pointer) and, for multicast delegates, <code>_invocationList</code> (an array of delegates). Invoking a single-cast delegate is an indirect call — roughly the cost of a virtual call. Delegates to static methods historically went through a small "shuffle thunk" and were slightly slower than instance delegates; it is negligible on modern runtimes.</p>
<p><b>Allocation.</b> Creating a delegate allocates an object. The compiler caches delegates for <b>static lambdas and lambdas that capture nothing</b> in a static field, so they allocate only once; since C# 11 method-group conversions to static methods are cached as well. Lambdas that capture state allocate a closure plus a delegate per creation (topic 3).</p>
<p><b>Equality.</b> Two delegates are equal if they have the same targets and methods in the same order — this is how <code>-=</code> finds the handler to remove. A lambda written twice produces two different methods, so <code>d -= x =&gt; Console.WriteLine(x)</code> removes nothing. Store the delegate in a variable if you need to unsubscribe it.</p>
<p><b>Function pointers.</b> C# 9 added <code>delegate*&lt;int, int&gt;</code> unmanaged/managed function pointers for interop and hot paths: no allocation, no multicast, unsafe context required.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce callback-heavy code fluently; they almost always choose <code>Func</code>/<code>Action</code> rather than custom delegate types, which is usually right. <b>Use AI as a partner:</b> ask "<i>which delegates here capture <code>this</code> and might keep objects alive?</i>" or "<i>what happens if one subscriber throws?</i>". <b>Where AI goes wrong:</b> unsubscribing with a fresh lambda (no effect), relying on the return value of a multicast delegate, and invoking without a null check. <b>What you still own:</b> understanding the invocation-list semantics well enough to reason about ordering, exceptions and lifetimes in callback-driven code.</p>`
  });

  topics[0].problems = [{
    title: 'Multicast Broadcast with += and -=',
    level: 'Easy', tags: ['delegates', 'multicast', 'invocation list'], companies: ['Microsoft', 'Unity', 'Siemens'],
    statement: `<p>Handlers are named <code>upper</code>, <code>lower</code>, <code>reverse</code> and <code>count</code>; each takes the message and appends one line to an output list (the message upper-cased, lower-cased, reversed, or its length). Implement <code>public static string[] Broadcast(string[] ops, string message)</code>: start with a null <code>Action&lt;string&gt;?</code>, apply each op (<code>+name</code> adds that handler, <code>-name</code> removes it), then invoke the delegate once with the message and return the lines. Use the <b>same delegate instance</b> per handler name so removal works.</p>`,
    constraints: `0 ≤ ops.Length ≤ 100; message is ASCII.`,
    example: `<p>(["+upper", "+lower", "+upper", "-upper"], "Ab") → ["AB", "ab"] — <code>-=</code> removed the <b>last</b> "upper".</p>`,
    brute: { why: `<p>A <code>List&lt;string&gt;</code> of names plus a switch at invocation time re-implements what multicast delegates already do, and makes it easy to get the removal rule wrong (removing the first occurrence instead of the last).</p>`, code: `static List<string> Simulate(List<string> names, string msg) =>
    names.Select(n => n == "upper" ? msg.ToUpperInvariant() : msg).ToList();` },
    mcq: { q: 'Why must each handler name map to one stored delegate instance?', options: ['For speed', 'Removal compares delegates by target and method; a new lambda each time is a different method and would never match', 'Delegates cannot be created twice', 'Because Action is sealed'], answer: 1, explain: 'Store the handlers in a dictionary once and reuse them for both += and -=.' },
    hints: [`<p>Hint 1: <code>var lines = new List&lt;string&gt;();</code> and a <code>Dictionary&lt;string, Action&lt;string&gt;&gt;</code> of lambdas that append to it.</p>`, `<p>Hint 2: <code>if (op[0] == '+') d += handlers[name]; else d -= handlers[name];</code></p>`, `<p>Hint 3: <code>d?.Invoke(message);</code> handles the empty case.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'Broadcast', cases: [
      [[["+upper", "+lower"], "Hi"], ["HI", "hi"]],
      [[[], "x"], []],
      [[["+upper", "+upper", "-upper"], "a"], ["A"]],
      [[["+count", "+reverse"], "abc"], ["3", "cba"]],
      [[["-upper"], "a"], []],
      [[["+upper", "+lower", "+upper", "-upper"], "Ab"], ["AB", "ab"]],
      [[["+lower", "+upper", "+lower", "-lower"], "Ab"], ["ab", "AB"]],
      [[["+count", "-count", "+count"], ""], ["0"]]
    ] },
    solution: {
      approach: `<p>Build the four handlers once, combine and remove them with the delegate operators, and let the runtime call the invocation list in order.</p>`,
      code: `public class Solution
{
    public static string[] Broadcast(string[] ops, string message)
    {
        var lines = new List<string>();
        var handlers = new Dictionary<string, Action<string>>
        {
            ["upper"] = m => lines.Add(m.ToUpperInvariant()),
            ["lower"] = m => lines.Add(m.ToLowerInvariant()),
            ["reverse"] = m => { var a = m.ToCharArray(); Array.Reverse(a); lines.Add(new string(a)); },
            ["count"] = m => lines.Add(m.Length.ToString())
        };
        Action<string>? broadcast = null;
        foreach (var op in ops)
        {
            var h = handlers[op[1..]];
            if (op[0] == '+') broadcast += h;      // appends to a NEW invocation list
            else broadcast -= h;                    // removes the last matching entry
        }
        broadcast?.Invoke(message);
        return lines.ToArray();
    }
}`,
      dry: { head: ['op', 'invocation list'], rows: [
        ['+upper', '[upper]'],
        ['+lower', '[upper, lower]'],
        ['+upper', '[upper, lower, upper]'],
        ['-upper', '[upper, lower] (last upper removed)'],
        ['Invoke("Ab")', 'AB, ab']
      ] },
      complexity: `<p>Each += / −= copies the invocation list: O(h) for h handlers, so O(ops · h) overall; invocation is O(h).</p>`,
      followUps: ['Make one handler throw — what do the others do, and how would you isolate failures?', 'Rewrite with an event so outsiders can only add/remove, not invoke.']
    }
  }];

  /* ======================================================================
     TOPIC 2 — Func, Action, Predicate and lambdas
     ====================================================================== */
  topics.push({
    title: 'Func, Action, Predicate & Lambda Expressions',
    analogy: `<p>Standard <b>shipping box sizes</b> mean nobody designs a custom box for every parcel. <code>Func</code> and <code>Action</code> are the standard box sizes for delegates: "takes two ints, returns a bool" is just <code>Func&lt;int, int, bool&gt;</code>. A <b>lambda</b> is the parcel you pack on the spot — a small, nameless method written right where it is needed.</p>`,
    explain: `<p><b>🟢 The built-in delegate types:</b></p>
${H.table(['Type', 'Signature', 'Example'], [
  ['<code>Action</code>, <code>Action&lt;T1…T16&gt;</code>', 'takes 0–16 args, returns <b>void</b>', '<code>Action&lt;string&gt; log = Console.WriteLine;</code>'],
  ['<code>Func&lt;TResult&gt;</code>, <code>Func&lt;T1…T16, TResult&gt;</code>', 'takes 0–16 args, <b>last type argument is the return type</b>', '<code>Func&lt;int, int, int&gt; add = (a, b) =&gt; a + b;</code>'],
  ['<code>Predicate&lt;T&gt;</code>', 'T → bool', '<code>list.RemoveAll(predicate)</code>, <code>Array.Find</code>'],
  ['<code>Comparison&lt;T&gt;</code>', '(T, T) → int', '<code>list.Sort(comparison)</code>']
])}
<p><b>Lambda syntax:</b></p>
${H.table(['Form', 'Example'], [
  ['expression body', '<code>x =&gt; x * x</code>'],
  ['several parameters', '<code>(a, b) =&gt; a + b</code>'],
  ['no parameters', '<code>() =&gt; DateTime.UtcNow</code>'],
  ['statement body', '<code>x =&gt; { var y = x * 2; return y + 1; }</code>'],
  ['explicit types', '<code>(int a, int b) =&gt; a + b</code>'],
  ['discards', '<code>(_, _) =&gt; 0</code>'],
  ['static (cannot capture)', '<code>static x =&gt; x + 1</code>'],
  ['default parameters (C# 12)', '<code>var inc = (int x, int by = 1) =&gt; x + by;</code>'],
  ['explicit return type (C# 10)', '<code>var parse = int (string s) =&gt; int.Parse(s);</code>']
])}
<p><b>Natural type (C# 10).</b> <code>var f = (int x) =&gt; x * 2;</code> now compiles: the lambda's natural type is <code>Func&lt;int, int&gt;</code>. Without parameter types the compiler cannot infer it (<code>var f = x =&gt; x;</code> is an error).</p>
<p><b>Higher-order functions</b> take or return functions: <code>Compose(f, g)</code> returns <code>x =&gt; g(f(x))</code>. This is the foundation of LINQ.</p>`,
    clues: [
      '"pass a condition" → <code>Func&lt;T, bool&gt;</code> or <code>Predicate&lt;T&gt;</code>',
      '"pass an action to run later / for each item" → <code>Action&lt;T&gt;</code>',
      '"compose functions / build a pipeline" → higher-order functions returning <code>Func</code>',
      '"Func&lt;int, string&gt; — which is the return type?" → the last type argument',
      '"lambda allocates in a hot loop" → make it <code>static</code> or avoid captures',
      '"cannot infer delegate type for var" → add parameter types or a target type'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Built-in delegate types and lambdas (runnable)', code: `Func<int, int> square = x => x * x;
Func<int, int, int> add = (a, b) => a + b;
Action<string> shout = s => Console.WriteLine(s.ToUpperInvariant() + "!");
Predicate<int> isEven = n => n % 2 == 0;

Console.WriteLine(square(5));                    // 25
Console.WriteLine(add(2, 3));                    // 5
shout("hello");                                  // HELLO!
Console.WriteLine(isEven(10));                   // True

var inc = (int x, int by = 1) => x + by;         // C# 12 default parameter, natural type
Console.WriteLine(inc(5) + " " + inc(5, 10));    // 6 15

Func<int, int> squareThenInc = Compose(square, x => x + 1);
Console.WriteLine(squareThenInc(3));             // 10

var evens = new List<int> { 1, 2, 3, 4, 5, 6 }.FindAll(isEven);
Console.WriteLine(string.Join(",", evens));      // 2,4,6

static Func<T, TResult> Compose<T, TMid, TResult>(Func<T, TMid> first, Func<TMid, TResult> then)
    => x => then(first(x));                      // a function that returns a function` }],
    codeTitle: ['Func, Action, Predicate'],
    viz: {
      title: 'Composing functions: data flows through a chain of lambdas',
      input: '3',
      inputLabel: 'Starting value',
      gen: function (input) {
        var x = Number(String(input).trim());
        if (!isFinite(x) || Math.abs(x) > 10000 || x !== Math.floor(x)) throw new Error('Enter an integer between -10000 and 10000');
        var steps = [['x => x * x', function (v) { return v * v; }], ['x => x + 1', function (v) { return v + 1; }], ['x => x * 2', function (v) { return v * 2; }], ['x => -x', function (v) { return -v; }]];
        var code = 'Func<int, int> f = x => x * x;\nf = Compose(f, x => x + 1);\nf = Compose(f, x => x * 2);\nf = Compose(f, x => -x);\nConsole.WriteLine(f(' + x + '));\n\nstatic Func<int, int> Compose(Func<int, int> a, Func<int, int> b) => v => b(a(v));';
        var frames = [{ narr: 'Building <code>f</code> runs <b>none</b> of the lambdas. Each Compose just wraps the previous function in a new one — like stacking pipes before turning on the water.', parts: [cs(code, { 1: 'cur', 2: 'cur', 3: 'cur', 4: 'cur' }), { type: 'queue', label: 'pipeline (outer wraps inner)', items: steps.map(function (s) { return s[0]; }) }] }];
        var v = x;
        frames.push({ narr: 'Calling <code>f(' + x + ')</code>: the outermost wrapper calls its inner function first, all the way down, so the steps run in the order they were added.', parts: [cs(code, one(5, 'cur')), { type: 'vars', label: 'value', vals: { v: v } }] });
        steps.forEach(function (s, i) {
          var nv = s[1](v);
          frames.push({ narr: 'Step ' + (i + 1) + ': <code>' + s[0] + '</code> turns ' + v + ' into <b>' + nv + '</b>.', parts: [{ type: 'queue', label: 'pipeline', items: steps.map(function (t) { return t[0]; }), hl: one(i, 'cur') }, { type: 'vars', label: 'value', vals: { before: v, after: nv }, hl: { after: 'ok' } }] });
          v = nv;
        });
        frames.push({ narr: 'Printed: <b>' + v + '</b>. LINQ works the same way: <code>Where</code>/<code>Select</code> build a chain of wrappers, and nothing runs until you enumerate.', parts: [cs(code, one(5, 'ok')), note(String(v), 'Console output')] });
        return frames;
      }
    },
    examples: [
      { title: 'Choosing Func vs Action vs Predicate', html: `<p>Predicate&lt;T&gt; and Func&lt;T, bool&gt; have the same shape but are <b>different types</b> and not implicitly convertible — pick what the API you call expects (List methods use Predicate, LINQ uses Func).</p>`, code: { lang: 'csharp', run: true, code: `Func<int, bool> isBig = n => n > 100;
Predicate<int> isBigP = n => n > 100;
int[] data = [5, 500, 50, 5000];
Console.WriteLine(data.Count(isBig));                        // LINQ wants Func
Console.WriteLine(Array.FindAll(data, isBigP).Length);       // Array.FindAll wants Predicate
Predicate<int> converted = new Predicate<int>(isBig);        // explicit wrap if you must convert
Console.WriteLine(converted(1000));` } },
      { title: 'static lambdas prevent accidental captures', html: `<p>Marking a lambda <code>static</code> makes capturing a local or <code>this</code> a compile error, guaranteeing no closure allocation.</p>`, code: { lang: 'csharp', run: true, code: `int factor = 3;
Func<int, int> triple = static x => x * 3;             // fine
// Func<int, int> bad = static x => x * factor;        // CS8820: a static lambda cannot capture 'factor'
Func<int, int> captures = x => x * factor;             // allocates a closure holding 'factor'
Console.WriteLine(triple(5) + captures(5));` } },
      { title: 'Returning functions: a tiny validator builder', html: `<p>Higher-order functions let you build behaviour from parts. Each rule is a <code>Func&lt;string, string?&gt;</code> returning an error or null.</p>`, code: { lang: 'csharp', run: true, code: `var rules = new List<Func<string, string?>>
{
    MinLength(8),
    s => s.Any(char.IsDigit) ? null : "needs a digit"
};
foreach (var pw in new[] { "abc", "abcdefgh", "abcdefg1" })
{
    var errors = rules.Select(r => r(pw)).Where(e => e is not null);
    Console.WriteLine($"{pw}: {(errors.Any() ? string.Join(", ", errors) : "ok")}");
}

static Func<string, string?> MinLength(int n) => s => s.Length >= n ? null : $"min length {n}";` } }
    ],
    deepDive: `<p><b>🟣 How lambdas compile.</b> A lambda that captures nothing becomes a method on a compiler-generated, singleton class (<code>&lt;&gt;c</code>), and the delegate is cached in a static field — one allocation for the program's lifetime. A lambda that captures locals becomes an instance method on a generated <b>closure class</b> (<code>&lt;&gt;c__DisplayClass</code>) holding the captured variables as fields (topic 3). A lambda capturing only <code>this</code> becomes an instance method on your class.</p>
<p><b>Lambdas can also become expression trees.</b> If the target type is <code>Expression&lt;Func&lt;T, bool&gt;&gt;</code>, the compiler builds a data structure describing the code instead of IL. That is how Entity Framework translates <code>Where(c =&gt; c.Age &gt; 30)</code> into SQL (module 11). Statement-bodied lambdas cannot be converted to expression trees.</p>
<p><b>Generic delegate variance.</b> <code>Func&lt;in T, out TResult&gt;</code> is contravariant in its inputs and covariant in its output: a <code>Func&lt;object, string&gt;</code> can be assigned to a <code>Func&lt;string, object&gt;</code>. <code>Action&lt;in T&gt;</code> likewise. Variance only works for reference types.</p>
<p><b>Overload resolution with lambdas.</b> <code>Task.Run(() =&gt; Work())</code> picks <code>Func&lt;Task&gt;</code> or <code>Action</code> depending on whether <code>Work</code> returns a Task — a subtle source of fire-and-forget bugs, which module 9 covers. Method groups (<code>list.ForEach(Console.WriteLine)</code>) avoid a wrapper lambda and since C# 11 are cached when static.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes LINQ-and-lambda code fluently, sometimes too cleverly (five nested lambdas in one expression). <b>Use AI as a partner:</b> ask it to "<i>name these lambdas as local functions for readability</i>" or "<i>which of these lambdas allocate per call?</i>". <b>Where AI goes wrong:</b> confusing Predicate&lt;T&gt; with Func&lt;T, bool&gt; (they do not convert implicitly), writing <code>var f = x =&gt; x</code> without types, and capturing loop variables or <code>this</code> in long-lived callbacks. <b>What you still own:</b> readability — a lambda over three lines usually deserves a name.</p>`
  });

  topics[1].problems = [{
    title: 'Compose a Function Pipeline',
    level: 'Easy', tags: ['Func', 'higher-order functions', 'composition'], companies: ['Microsoft', 'Jane Street', 'Stripe'],
    statement: `<p>Each op is <code>add K</code>, <code>mul K</code>, <code>neg</code> or <code>square</code>. Turn every op into a <code>Func&lt;int, int&gt;</code>, compose them into <b>one</b> function with a generic <code>Compose</code> helper (applying ops in the given order), then apply it to x. Implement <code>public static int Apply(string[] ops, int x)</code>. Arithmetic is C#'s default unchecked <code>int</code>.</p>`,
    constraints: `0 ≤ ops.Length ≤ 50; K is an int.`,
    example: `<p>(["add 3", "mul 2"], 1) → (1 + 3) × 2 = <b>8</b>. (["square", "add 1"], −3) → <b>10</b>.</p>`,
    brute: { why: `<p>Interpreting the ops in a loop works, but it re-parses the op strings on every call. Compiling them once into a single delegate lets you parse once and apply the pipeline to millions of values.</p>`, code: `static int Interpret(string[] ops, int x)
{
    foreach (var op in ops)
    {
        var p = op.Split(' ');
        x = p[0] switch { "add" => x + int.Parse(p[1]), "mul" => x * int.Parse(p[1]), "neg" => -x, _ => x * x };
    }
    return x;
}` },
    mcq: { q: 'Compose(f, g) should return…', options: ['x =&gt; f(g(x))', 'x =&gt; g(f(x)) so f runs first', 'f + g', 'g'], answer: 1, explain: 'To apply ops in order, the earlier function must run first and feed the later one.' },
    hints: [`<p>Hint 1: Start from the identity: <code>Func&lt;int, int&gt; f = x =&gt; x;</code></p>`, `<p>Hint 2: Parse K <b>outside</b> the lambda (<code>int k = int.Parse(p[1]);</code>) so each lambda captures its own k.</p>`, `<p>Hint 3: <code>f = Compose(f, next);</code> with <code>Compose = (a, b) =&gt; v =&gt; b(a(v))</code>.</p>`],
    tests: { sig: 'string[] int -> int', fn: 'Apply', cases: [
      [[["add 3", "mul 2"], 1], 8],
      [[[], 5], 5],
      [[["neg"], 7], -7],
      [[["square", "add 1"], -3], 10],
      [[["mul 0", "add 9"], 123], 9],
      [[["add 2147483647", "add 1"], 0], -2147483648],
      [[["square", "square"], 3], 81],
      [[["add -5", "neg", "mul 3"], 2], 9]
    ] },
    solution: {
      approach: `<p>Parse once into small lambdas, fold them into one delegate with a generic Compose, then call it.</p>`,
      code: `public class Solution
{
    static Func<T, TResult> Compose<T, TMid, TResult>(Func<T, TMid> first, Func<TMid, TResult> then)
        => v => then(first(v));

    public static int Apply(string[] ops, int x)
    {
        Func<int, int> pipeline = v => v;                       // identity
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            Func<int, int> step;
            if (p[0] == "add") { int k = int.Parse(p[1]); step = v => v + k; }
            else if (p[0] == "mul") { int k = int.Parse(p[1]); step = v => v * k; }
            else if (p[0] == "neg") step = static v => -v;
            else step = static v => v * v;
            pipeline = Compose(pipeline, step);
        }
        return pipeline(x);
    }
}`,
      dry: { head: ['op', 'pipeline so far', 'value for x = 1'], rows: [
        ['—', 'v =&gt; v', '1'],
        ['add 3', 'v =&gt; (v) + 3', '4'],
        ['mul 2', 'v =&gt; ((v) + 3) * 2', '8']
      ] },
      complexity: `<p>O(n) to build; each call is O(n) delegate invocations (call depth n, fine for n ≤ 50).</p>`,
      followUps: ['Use Aggregate to build the pipeline in one expression.', 'Build an Expression&lt;Func&lt;int, int&gt;&gt; instead and Compile() it — why would that run faster for long pipelines?']
    }
  }];

  /* ======================================================================
     TOPIC 3 — Closures
     ====================================================================== */
  topics.push({
    title: 'Closures — Lambdas That Remember Variables',
    analogy: `<p>A child leaves for a sleepover with a <b>backpack</b>. Inside are things from home — not copies, the actual toothbrush. If a parent later swaps the toothbrush at home... well, in code, they can: a closure carries a reference to the <b>same variable</b>, not a snapshot of its value. The lambda is the child; the backpack is the hidden object holding the captured variables.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A lambda can use local variables and parameters from the method around it. Those variables are <b>captured</b>: they live as long as the lambda does, even after the method returns, and the lambda sees <b>the variable itself</b>, not a copy of its value at creation time.</p>
${H.table(['Code', 'Prints', 'Why'], [
  ['<code>int n = 1; Func&lt;int&gt; f = () =&gt; n; n = 5; f()</code>', '5', 'f reads the variable when it runs'],
  ['<code>var c = MakeCounter(); c(); c(); c()</code>', '1 2 3', 'the counter variable outlives MakeCounter'],
  ['<code>for (int i = 0; i &lt; 3; i++) fs.Add(() =&gt; i);</code> then call each', H.c('r', '3 3 3'), 'one <code>i</code> shared by all lambdas'],
  ['<code>foreach (var x in new[] {0, 1, 2}) fs.Add(() =&gt; x);</code>', '0 1 2', 'since C# 5 each iteration has a fresh <code>x</code>']
])}
<p><b>The for-loop trap</b> is the classic closure bug. Fix it by copying into a variable declared <b>inside</b> the loop body: <code>int copy = i; fs.Add(() =&gt; copy);</code>.</p>
<p><b>Closures are how you keep private state without a class:</b> a counter factory, a memoizing wrapper, a rate limiter — each returned lambda has its own captured variables. Two lambdas created in the same scope share the same captured variables.</p>
<p><b>Cost:</b> capturing means the compiler moves the variables into a heap-allocated <b>closure object</b>. In hot paths, avoid captures (use <code>static</code> lambdas, pass state as parameters, or overloads that take a state argument such as <code>ConcurrentDictionary.GetOrAdd(key, factory, arg)</code>).</p>`,
    clues: [
      '"all callbacks print the same (last) value" → for-loop variable captured by reference',
      '"keep state between calls without a class" → closure (counter/memoize factory)',
      '"lambda keeps an object alive / memory leak" → captured variable or <code>this</code>',
      '"hidden allocation in a hot loop" → capturing lambda creates a closure object',
      '"what does this print?" with a lambda and a later assignment → closures see the latest value',
      '"modified closure" analyzer warning → capturing a variable that changes later'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Capturing by reference, factories and the loop trap (runnable)', code: `int n = 1;
Func<int> read = () => n;
n = 5;
Console.WriteLine(read());                  // 5: the lambda sees the variable, not a snapshot

var counterA = MakeCounter();
var counterB = MakeCounter();
Console.WriteLine($"{counterA()} {counterA()} {counterA()} | {counterB()}");   // 1 2 3 | 1

var broken = new List<Func<int>>();
for (int i = 0; i < 3; i++) broken.Add(() => i);      // all share ONE i
Console.WriteLine(string.Join(",", broken.Select(f => f())));   // 3,3,3

var fixedList = new List<Func<int>>();
for (int i = 0; i < 3; i++) { int copy = i; fixedList.Add(() => copy); }   // fresh variable per iteration
Console.WriteLine(string.Join(",", fixedList.Select(f => f())));  // 0,1,2

var viaForeach = new List<Func<int>>();
foreach (var x in new[] { 0, 1, 2 }) viaForeach.Add(() => x);    // foreach gives a fresh x (C# 5+)
Console.WriteLine(string.Join(",", viaForeach.Select(f => f())));  // 0,1,2

static Func<int> MakeCounter()
{
    int count = 0;                    // lives on in the closure after MakeCounter returns
    return () => ++count;
}` }],
    codeTitle: ['Closures'],
    viz: {
      title: 'Inside the closure object the compiler generates',
      input: 'for',
      inputLabel: 'Loop kind: for (shared variable) or copy (fresh variable)',
      gen: function (input) {
        var k = words(input, 'Type for or copy', 1)[0];
        if (k !== 'for' && k !== 'copy') throw new Error('Type for or copy');
        var frames = [];
        if (k === 'for') {
          var code = 'var fs = new List<Func<int>>();\nfor (int i = 0; i < 3; i++)\n    fs.Add(() => i);\nforeach (var f in fs) Console.Write(f());';
          frames.push({ narr: 'Because a lambda captures <code>i</code>, the compiler hoists <code>i</code> into <b>one</b> closure object created before the loop.', parts: [cs(code, one(2, 'cur')), { type: 'map', label: 'heap: DisplayClass #1', entries: [['i', 0]] }] });
          for (var i = 0; i < 3; i++) frames.push({ narr: 'Iteration ' + i + ': a delegate is added that points at the <b>same</b> closure #1 (i is ' + i + ' right now).', parts: [cs(code, one(3, 'cur')), { type: 'map', label: 'heap: DisplayClass #1', entries: [['i', i]], hl: { i: 'cur' } }, { type: 'array', label: 'fs (delegate → closure)', values: Array.apply(null, Array(i + 1)).map(function () { return '→#1'; }) }] });
          frames.push({ narr: 'The loop ends by incrementing i to <b>3</b> and failing the test. All three delegates read closure #1.i…', parts: [{ type: 'map', label: 'heap: DisplayClass #1', entries: [['i', 3]], hl: { i: 'bad' } }] });
          frames.push({ narr: 'Output: <b>333</b>. Fix: copy into a variable declared inside the loop body.', parts: [cs(code, one(4, 'bad')), note('333', 'Console output')] });
        } else {
          var code2 = 'var fs = new List<Func<int>>();\nfor (int i = 0; i < 3; i++)\n{\n    int copy = i;\n    fs.Add(() => copy);\n}\nforeach (var f in fs) Console.Write(f());';
          var entries = [];
          for (var j = 0; j < 3; j++) {
            entries.push(['#' + (j + 1) + '.copy', j]);
            frames.push({ narr: 'Iteration ' + j + ': <code>copy</code> is declared inside the body, so each iteration gets a <b>new closure object</b> #' + (j + 1) + ' holding its own copy = ' + j + '.', parts: [cs(code2, one(4, 'cur')), { type: 'map', label: 'heap closures', entries: entries.slice(), hl: one('#' + (j + 1) + '.copy', 'ok') }] });
          }
          frames.push({ narr: 'Each delegate points at a different closure. Output: <b>012</b>. (foreach does this automatically since C# 5.)', parts: [cs(code2, one(7, 'ok')), note('012', 'Console output')] });
          frames.push({ narr: 'Price of correctness: three closure objects instead of one. Usually irrelevant; in hot loops prefer non-capturing code.', parts: [{ type: 'vars', label: 'allocations', vals: { closures: 3, delegates: 3 } }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Memoize with a captured dictionary', html: `<p>The cache lives in the closure: callers only see a <code>Func</code>, and each memoized function has its own private cache.</p>`, code: { lang: 'csharp', run: true, code: `int calls = 0;
Func<int, long> slowSquare = x => { calls++; return (long)x * x; };
var fast = Memoize(slowSquare);
Console.WriteLine(fast(9) + fast(9) + fast(9));   // 243
Console.WriteLine($"underlying calls: {calls}");   // 1

static Func<TIn, TOut> Memoize<TIn, TOut>(Func<TIn, TOut> f) where TIn : notnull
{
    var cache = new Dictionary<TIn, TOut>();       // captured: private to this memoized function
    return x => cache.TryGetValue(x, out var v) ? v : cache[x] = f(x);
}` } },
      { title: 'Two lambdas sharing one captured variable', html: `<p>Lambdas created in the same scope share the captured variables — a poor man's object with two methods.</p>`, code: { lang: 'csharp', run: true, code: `var (deposit, balance) = MakeAccount();
deposit(50); deposit(25);
Console.WriteLine(balance());   // 75

static (Action<int> Deposit, Func<int> Balance) MakeAccount()
{
    int total = 0;
    return (amount => total += amount, () => total);
}` } },
      { title: 'Avoiding a capture with a state argument', html: `<p>Many .NET APIs take a state parameter so the callback can be <code>static</code> and allocation-free.</p>`, code: { lang: 'csharp', run: true, code: `using System.Collections.Concurrent;

var cache = new ConcurrentDictionary<string, int>();
int multiplier = 10;
// Captures 'multiplier' -> allocates a closure on every call:
int a = cache.GetOrAdd("x", key => key.Length * multiplier);
// Passes it as state -> static lambda, no closure:
int b = cache.GetOrAdd("yy", static (key, m) => key.Length * m, multiplier);
Console.WriteLine($"{a} {b}");   // 10 20` } }
    ],
    deepDive: `<p><b>🟣 The compiler's transformation.</b> For a method with captured locals, the compiler creates a class like <code>&lt;&gt;c__DisplayClass0_0</code> with one public field per captured variable. At the start of the variable's <b>scope</b> it allocates an instance, and every use of the variable — inside and outside the lambda — becomes a field access on that instance. The lambda body becomes an instance method of the display class, and the delegate targets that instance. Variables from different scopes (e.g. a method-level variable and a loop-body variable) go into different display classes, chained by references.</p>
<p><b>Why foreach changed in C# 5.</b> Before C# 5 the foreach iteration variable was declared outside the loop, exactly like the for-loop counter, and capturing it produced the "last value" bug everywhere. The language team made a rare breaking change: the variable is now logically declared inside each iteration. The for loop was left alone because its variable is genuinely shared by the condition and increment.</p>
<p><b>Lifetime and leaks.</b> A closure keeps every captured variable alive — and if any captured variable is <code>this</code> (or the lambda uses an instance member), the whole object is kept alive by the delegate. Store such a delegate in a static event or a long-lived cache and you have a leak. Large objects captured "by accident" in the same scope as a small one share the same display class and are kept alive too.</p>
<p><b>Local functions vs lambdas.</b> A local function that captures variables but is never converted to a delegate is compiled with a <b>struct</b> closure passed by ref — no heap allocation. Converting it to a delegate (passing it as a <code>Func</code>) brings the heap closure back. Prefer local functions for helpers called directly.</p>`,
    aiEra: `<p><b>What AI changes:</b> closure bugs are subtle and AI-generated code reproduces them as readily as humans do — especially async lambdas in for loops and captured <code>this</code> in event handlers. <b>Use AI as a partner:</b> ask "<i>list every captured variable in this method and how long it lives</i>", or ask for an allocation-free version of a hot-path lambda. <b>Where AI goes wrong:</b> claiming lambdas capture values (they capture variables), "fixing" the for-loop bug by switching to foreach over <code>Enumerable.Range</code> without explaining why it works, and missing that a local function converted to a delegate allocates. <b>What you still own:</b> being able to predict output-prediction puzzles exactly — a staple of C# interviews.</p>`
  });

  topics[2].problems = [{
    title: 'Counter Factory with Closures',
    level: 'Medium', tags: ['closures', 'captured variables', 'tuples of delegates'], companies: ['Microsoft', 'Bloomberg', 'JetBrains'],
    statement: `<p>Write a factory <code>static (Func&lt;int&gt; Inc, Func&lt;int, int&gt; Add, Func&lt;int&gt; Get) MakeCounter()</code> whose three lambdas share one captured <code>int</code> (no classes for the counter). Then implement <code>public static int[] Counters(string[] ops)</code>: <code>new</code> creates counter number <i>i</i> (0, 1, 2, … in order); <code>inc i</code>, <code>add i k</code> and <code>get i</code> call the corresponding lambda of counter i. Return the values returned by every inc/add/get, in order. Arithmetic is unchecked.</p>`,
    constraints: `0 ≤ ops.Length ≤ 10<sup>4</sup>; indexes are valid.`,
    example: `<p>["new", "new", "inc 1", "get 0", "get 1"] → [1, 0, 1] — each counter has its own captured variable.</p>`,
    brute: { why: `<p>A <code>List&lt;int&gt;</code> of counts indexed by counter number works, but it is the "class with fields" approach in disguise. The exercise is to see that closures can carry private, shared state just like an object.</p>`, code: `static int[] WithList(string[] ops)
{
    var counts = new List<int>(); var outp = new List<int>();
    foreach (var op in ops) { var p = op.Split(' '); if (p[0] == "new") counts.Add(0); else if (p[0] == "inc") outp.Add(++counts[int.Parse(p[1])]); }
    return outp.ToArray();
}` },
    mcq: { q: 'Inc and Get are created in the same call to MakeCounter. Do they see the same count?', options: ['No, each lambda copies the value', 'Yes, both capture the same variable, so they share one closure object', 'Only if count is static', 'Only in Release builds'], answer: 1, explain: 'Lambdas created in the same scope share the captured variables.' },
    hints: [`<p>Hint 1: <code>int count = 0; return (() =&gt; ++count, k =&gt; count += k, () =&gt; count);</code></p>`, `<p>Hint 2: Keep a <code>List&lt;(Func&lt;int&gt; Inc, Func&lt;int, int&gt; Add, Func&lt;int&gt; Get)&gt;</code>.</p>`, `<p>Hint 3: Each call to MakeCounter creates a fresh closure, so counters never interfere.</p>`],
    tests: { sig: 'string[] -> int[]', fn: 'Counters', cases: [
      [[["new", "inc 0", "inc 0", "get 0"]], [1, 2, 2]],
      [[[]], []],
      [[["new", "new", "inc 1", "get 0", "get 1"]], [1, 0, 1]],
      [[["new", "add 0 5", "add 0 -2", "get 0"]], [5, 3, 3]],
      [[["new", "new", "new", "inc 2", "inc 2", "inc 0", "get 1"]], [1, 2, 1, 0]],
      [[["new", "add 0 2147483647", "inc 0"]], [2147483647, -2147483648]],
      [[["new", "new", "add 0 10", "add 1 20", "inc 0", "get 1"]], [10, 20, 11, 20]]
    ] },
    solution: {
      approach: `<p>Each MakeCounter call allocates one closure holding <code>count</code>; the three returned lambdas are methods on that closure.</p>`,
      code: `public class Solution
{
    static (Func<int> Inc, Func<int, int> Add, Func<int> Get) MakeCounter()
    {
        int count = 0;                                   // captured by all three lambdas
        return (() => ++count, k => count += k, () => count);
    }

    public static int[] Counters(string[] ops)
    {
        var counters = new List<(Func<int> Inc, Func<int, int> Add, Func<int> Get)>();
        var output = new List<int>();
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            if (p[0] == "new") { counters.Add(MakeCounter()); continue; }
            var c = counters[int.Parse(p[1])];
            output.Add(p[0] switch
            {
                "inc" => c.Inc(),
                "add" => c.Add(int.Parse(p[2])),
                _ => c.Get()
            });
        }
        return output.ToArray();
    }
}`,
      dry: { head: ['op', 'closure #0.count', 'closure #1.count', 'output'], rows: [
        ['new', '0', '—', ''],
        ['new', '0', '0', ''],
        ['inc 1', '0', '1', '1'],
        ['get 0', '0', '1', '0'],
        ['get 1', '0', '1', '1']
      ] },
      complexity: `<p>O(1) per operation; one closure plus three delegates per counter.</p>`,
      followUps: ['Add a Reset lambda. Does it need anything new?', 'Make the counter thread-safe with Interlocked — can you use Interlocked.Increment on a captured local? (yes: it is a field of the closure)']
    }
  }];

  /* ======================================================================
     TOPIC 4 — Events
     ====================================================================== */
  topics.push({
    title: 'Events — Publish/Subscribe Done Safely',
    analogy: `<p>A <b>newspaper subscription</b>: readers sign up or cancel at the front desk, and only the printing press can actually deliver an issue. Readers cannot cancel each other's subscriptions or print fake issues. An <code>event</code> is a delegate with that front desk in front of it: outsiders may only <code>+=</code> and <code>-=</code>; only the owning class can raise it.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> An event is a delegate field wrapped so that code outside the class can only <b>subscribe</b> (<code>+=</code>) and <b>unsubscribe</b> (<code>-=</code>). Without the <code>event</code> keyword, a public delegate field could be overwritten (<code>button.Click = null</code> wipes all subscribers) or invoked by anyone.</p>
${H.table(['Piece', 'Convention'], [
  ['Declaration', '<code>public event EventHandler&lt;PriceChangedEventArgs&gt;? PriceChanged;</code>'],
  ['Event data', 'a class deriving from <code>EventArgs</code> (or any type with modern <code>EventHandler&lt;T&gt;</code>); immutable properties'],
  ['Handler signature', '<code>void Handler(object? sender, PriceChangedEventArgs e)</code>'],
  ['Raising', '<code>protected virtual void OnPriceChanged(PriceChangedEventArgs e) =&gt; PriceChanged?.Invoke(this, e);</code>'],
  ['Naming', 'event: past or present tense verb (<code>Closed</code>, <code>Closing</code>); raiser: <code>On</code> + event name']
])}
<p><b>Why <code>?.Invoke</code>?</b> The event is null when nobody subscribed. <code>PriceChanged?.Invoke(...)</code> reads the field <b>once</b> into a temporary, so even if another thread unsubscribes the last handler in between, you never invoke null.</p>
<p><b>Memory leaks:</b> the publisher holds references to subscribers (the delegate's <code>Target</code>). A short-lived window subscribing to a long-lived service's event stays in memory until it unsubscribes. Always unsubscribe (e.g. in <code>Dispose</code>) when the subscriber dies before the publisher.</p>`,
    clues: [
      '"notify many listeners when something happens" → event (observer pattern)',
      '"outsiders must not raise or clear the callbacks" → <code>event</code> rather than a public delegate',
      '"memory leak with event handlers" → subscriber not unsubscribed; publisher outlives subscriber',
      '"EventHandler / EventArgs / sender, e" → standard .NET event pattern',
      '"raise only when the value actually changes" → compare before raising (INotifyPropertyChanged style)',
      '"thread-safe event raising" → <code>?.Invoke</code> on a local copy'
    ],
    code: [{ lang: 'csharp', run: true, title: 'The standard event pattern (runnable)', code: `var stock = new Stock("ACME", 100m);
var log = new List<string>();
EventHandler<PriceChangedEventArgs> logger = (sender, e) => log.Add($"{((Stock)sender!).Symbol}: {e.OldPrice} -> {e.NewPrice}");

stock.PriceChanged += logger;
stock.PriceChanged += (_, e) => { if (e.NewPrice < e.OldPrice) log.Add("price dropped!"); };
stock.Price = 105m;
stock.Price = 105m;        // no change -> no event
stock.Price = 90m;
stock.PriceChanged -= logger;
stock.Price = 80m;         // only the second handler is left
// stock.PriceChanged = null;    // CS0070: outside the class you may only use += and -=
Console.WriteLine(string.Join(Environment.NewLine, log));

sealed class PriceChangedEventArgs(decimal oldPrice, decimal newPrice) : EventArgs
{
    public decimal OldPrice { get; } = oldPrice;
    public decimal NewPrice { get; } = newPrice;
}

class Stock(string symbol, decimal price)
{
    public string Symbol { get; } = symbol;
    public event EventHandler<PriceChangedEventArgs>? PriceChanged;

    public decimal Price
    {
        get => price;
        set
        {
            if (value == price) return;                  // raise only on real changes
            var old = price;
            price = value;
            OnPriceChanged(new PriceChangedEventArgs(old, value));
        }
    }

    protected virtual void OnPriceChanged(PriceChangedEventArgs e) => PriceChanged?.Invoke(this, e);
}` }],
    codeTitle: ['Stock price event'],
    viz: {
      title: 'Subscribe, raise, unsubscribe',
      input: '105 105 90',
      inputLabel: 'New prices to set (start price 100)',
      gen: function (input) {
        var ps = ints(input, 'Enter up to 8 prices (integers)', 8);
        var subs = ['logger', 'dropAlert'], price = 100, frames = [];
        frames.push({ narr: 'Two handlers subscribed with <code>+=</code>. The event field holds a multicast delegate; outsiders cannot read or invoke it.', parts: [{ type: 'array', label: 'PriceChanged invocation list', values: subs.slice() }, { type: 'vars', label: 'Stock', vals: { Symbol: 'ACME', Price: price } }] });
        var log = [];
        ps.forEach(function (p, i) {
          if (i === ps.length - 1 && ps.length > 2) { subs = ['dropAlert']; frames.push({ narr: '<code>stock.PriceChanged -= logger;</code> — the logger leaves.', parts: [{ type: 'array', label: 'PriceChanged invocation list', values: subs.slice() }] }); }
          if (p === price) { frames.push({ narr: 'Set Price = ' + p + ': same as before, the setter returns early — <b>no event</b>.', parts: [{ type: 'vars', label: 'Stock', vals: { Price: price }, hl: { Price: 'done' } }] }); return; }
          var old = price; price = p;
          var fired = [];
          subs.forEach(function (s) { if (s === 'logger') { fired.push('ACME: ' + old + ' -> ' + p); } else if (p < old) { fired.push('price dropped!'); } });
          log = log.concat(fired);
          frames.push({ narr: 'Set Price = ' + p + ': the setter calls <code>OnPriceChanged</code>, which does <code>PriceChanged?.Invoke(this, e)</code>. Each handler runs in subscription order.', parts: [{ type: 'array', label: 'handlers called', values: subs.slice(), hl: (function () { var h = {}; subs.forEach(function (_, k) { h[k] = 'cur'; }); return h; })() }, { type: 'vars', label: 'EventArgs', vals: { OldPrice: old, NewPrice: p } }, note(log.length ? log.join('<br>') : '(nothing yet)', 'log')] });
        });
        frames.push({ narr: 'Remember: the Stock holds references to every subscriber\'s delegate (and its Target object). Unsubscribe when a subscriber is disposed, or it cannot be garbage collected while the Stock lives.', parts: [note('publisher → delegate → subscriber object')] });
        return frames;
      }
    },
    examples: [
      { title: 'Why the event keyword matters', html: `<p>With a public delegate <b>field</b>, any caller can replace all subscribers with <code>=</code> or raise the "event" themselves. The <code>event</code> keyword restricts outside code to <code>+=</code>/<code>-=</code>.</p>`, code: { lang: 'csharp', run: true, code: `var unsafeBtn = new UnsafeButton();
unsafeBtn.Click += () => Console.WriteLine("A");
unsafeBtn.Click = () => Console.WriteLine("hijacked");   // compiles: everyone else is gone
unsafeBtn.Click();                                        // and outsiders can raise it

var safeBtn = new SafeButton();
safeBtn.Click += () => Console.WriteLine("B");
// safeBtn.Click = null;    // CS0070
// safeBtn.Click();         // CS0070
safeBtn.SimulatePress();

sealed class UnsafeButton { public Action? Click; }
sealed class SafeButton { public event Action? Click; public void SimulatePress() => Click?.Invoke(); }` } },
      { title: 'Unsubscribing in Dispose to avoid leaks', html: `<p>A view model subscribes to a long-lived service. When the view model is disposed, it removes its handler, so the service no longer references it.</p>`, code: { lang: 'csharp', run: true, code: `var service = new Clock();
using (var vm = new ViewModel(service))
{
    service.Tick();          // vm reacts
}
service.Tick();              // vm is unsubscribed: nothing printed
Console.WriteLine($"subscribers left: {service.SubscriberCount}");

sealed class Clock
{
    public event EventHandler? Ticked;
    public int SubscriberCount => Ticked?.GetInvocationList().Length ?? 0;
    public void Tick() => Ticked?.Invoke(this, EventArgs.Empty);
}
sealed class ViewModel : IDisposable
{
    private readonly Clock _clock;
    public ViewModel(Clock clock) { _clock = clock; _clock.Ticked += OnTick; }
    private void OnTick(object? sender, EventArgs e) => Console.WriteLine("vm saw a tick");
    public void Dispose() => _clock.Ticked -= OnTick;     // same method group -> removable
}` } },
      { title: 'Custom add/remove accessors', html: `<p>Like properties, events can have explicit accessors — for logging, validation, or storing handlers somewhere else (WinForms stores them in an <code>EventHandlerList</code> to save memory when most events have no subscribers).</p>`, code: { lang: 'csharp', run: true, code: `var src = new Source();
EventHandler h = (_, _) => Console.WriteLine("handled");
src.Changed += h;
src.Raise();
src.Changed -= h;

sealed class Source
{
    private EventHandler? _changed;
    public event EventHandler Changed
    {
        add { Console.WriteLine("subscribe"); _changed += value; }
        remove { Console.WriteLine("unsubscribe"); _changed -= value; }
    }
    public void Raise() => _changed?.Invoke(this, EventArgs.Empty);
}` } }
    ],
    deepDive: `<p><b>🟣 What a field-like event compiles to.</b> <code>public event EventHandler? Changed;</code> generates a private delegate field plus <code>add_Changed</code> and <code>remove_Changed</code> methods. Since C# 4 these accessors are <b>lock-free and thread-safe</b>: they loop with <code>Interlocked.CompareExchange</code> until they swap in the combined delegate. Inside the class, the name refers to the field (so you can invoke it); outside, only the accessors are visible.</p>
<p><b>Threading caveats.</b> Thread-safe subscription does not make handlers thread-safe: a handler may still run after it was unsubscribed on another thread (the raiser had already copied the old delegate). Handlers run synchronously on the raising thread, and one slow or throwing handler blocks or aborts the rest. For heavy or cross-thread fan-out, consider <code>System.Threading.Channels</code> or a message bus.</p>
<p><b>Async handlers.</b> <code>async void</code> event handlers are the one accepted use of async void, but exceptions from them crash the process unless caught inside, and the raiser cannot await them. Frameworks that need awaitable events define <code>Func&lt;T, Task&gt;</code>-based events instead.</p>
<p><b>Weak events.</b> WPF's <code>WeakEventManager</code> and community libraries hold subscribers through weak references so forgotten unsubscriptions do not leak. Reactive Extensions (<code>IObservable&lt;T&gt;</code>) models events as composable streams with explicit subscription objects (<code>IDisposable</code>), which makes unsubscription natural.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI scaffolds INotifyPropertyChanged, event args classes and handlers quickly, and source generators (CommunityToolkit.Mvvm) remove most of that boilerplate anyway. <b>Use AI as a partner:</b> ask "<i>which subscriptions here are never removed?</i>" or "<i>convert this public Action field to a proper event</i>". <b>Where AI goes wrong:</b> unsubscribing with a new lambda (no effect), raising events without a null check, using async void handlers without try/catch, and raising events while holding a lock (deadlock risk when a handler calls back in). <b>What you still own:</b> object lifetimes — who subscribes to whom, and who must unsubscribe when.</p>`
  });

  topics[3].problems = [{
    title: 'Stock Ticker with Events',
    level: 'Medium', tags: ['events', 'EventHandler<T>', 'EventArgs', 'subscribe/unsubscribe'], companies: ['Bloomberg', 'Morgan Stanley', 'Microsoft'],
    statement: `<p>Class <code>Stock</code> ("ACME", initial price 100) raises <code>event EventHandler&lt;PriceChangedEventArgs&gt;? PriceChanged</code> only when the price really changes. Two handlers exist, each stored once so it can be removed: <b>log</b> appends <code>ACME OLD->NEW</code>; <b>alert</b> appends <code>ALERT ACME OLD->NEW</code> when OLD &gt; 0 and |NEW − OLD| × 10 ≥ OLD (a move of at least 10%). Implement <code>public static string[] Ticker(string[] ops)</code> where ops are <code>sub log</code>, <code>sub alert</code>, <code>unsub log</code>, <code>unsub alert</code> and <code>set P</code>; return the appended lines in order. Subscribing twice means the handler runs twice.</p>`,
    constraints: `0 ≤ ops.Length ≤ 10<sup>4</sup>; 0 ≤ P ≤ 10<sup>9</sup> (use long).`,
    example: `<p>["sub log", "set 105", "set 105", "set 120"] → ["ACME 100->105", "ACME 105->120"] — setting the same price raises nothing.</p>`,
    brute: { why: `<p>Keeping a list of handler names and switching over it when the price changes re-implements multicast delegates and lets any code clear the list. An event gives safe subscription semantics for free.</p>`, code: `static void Notify(List<string> subs, long oldP, long newP, List<string> outp)
{
    foreach (var s in subs) outp.Add(s == "log" ? $"ACME {oldP}->{newP}" : "ALERT");
}` },
    mcq: { q: 'Where should the "only when the price changes" check go?', options: ['In every handler', 'In the Price setter before raising the event', 'In Ticker', 'In EventArgs'], answer: 1, explain: 'The publisher decides when something happened; subscribers should not have to filter non-events.' },
    hints: [`<p>Hint 1: <code>public void SetPrice(long p) { if (p == Price) return; var old = Price; Price = p; PriceChanged?.Invoke(this, new(old, p)); }</code></p>`, `<p>Hint 2: Store handlers in variables: <code>EventHandler&lt;PriceChangedEventArgs&gt; log = (s, e) =&gt; …;</code> so <code>-=</code> finds them.</p>`, `<p>Hint 3: Use long arithmetic for the 10% test: <code>Math.Abs(e.New - e.Old) * 10 &gt;= e.Old</code>.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'Ticker', cases: [
      [[["sub log", "set 105", "set 105", "set 120"]], ["ACME 100->105", "ACME 105->120"]],
      [[[]], []],
      [[["set 50"]], []],
      [[["sub log", "sub alert", "set 111"]], ["ACME 100->111", "ALERT ACME 100->111"]],
      [[["sub alert", "set 109", "set 120"]], ["ALERT ACME 109->120"]],
      [[["sub log", "unsub log", "set 1"]], []],
      [[["sub log", "sub log", "set 90", "unsub log", "set 80"]], ["ACME 100->90", "ACME 100->90", "ACME 90->80"]],
      [[["sub alert", "sub log", "set 0", "set 50"]], ["ALERT ACME 100->0", "ACME 100->0", "ACME 0->50"]],
      [[["sub log", "set 1000000000"]], ["ACME 100->1000000000"]]
    ] },
    solution: {
      approach: `<p>Standard .NET event pattern: immutable EventArgs, a nullable event, raising via a protected virtual On… method, and subscribers stored as delegates so they can be removed.</p>`,
      code: `public sealed class PriceChangedEventArgs(long oldPrice, long newPrice) : EventArgs
{
    public long OldPrice { get; } = oldPrice;
    public long NewPrice { get; } = newPrice;
}

public class Stock(string symbol, long price)
{
    public string Symbol { get; } = symbol;
    public long Price { get; private set; } = price;
    public event EventHandler<PriceChangedEventArgs>? PriceChanged;

    public void SetPrice(long p)
    {
        if (p == Price) return;                       // no change, no event
        var old = Price;
        Price = p;
        OnPriceChanged(new PriceChangedEventArgs(old, p));
    }
    protected virtual void OnPriceChanged(PriceChangedEventArgs e) => PriceChanged?.Invoke(this, e);
}

public class Solution
{
    public static string[] Ticker(string[] ops)
    {
        var lines = new List<string>();
        var stock = new Stock("ACME", 100);
        EventHandler<PriceChangedEventArgs> log = (s, e) => lines.Add($"{((Stock)s!).Symbol} {e.OldPrice}->{e.NewPrice}");
        EventHandler<PriceChangedEventArgs> alert = (s, e) =>
        {
            if (e.OldPrice > 0 && Math.Abs(e.NewPrice - e.OldPrice) * 10 >= e.OldPrice)
                lines.Add($"ALERT {((Stock)s!).Symbol} {e.OldPrice}->{e.NewPrice}");
        };
        foreach (var op in ops)
        {
            var p = op.Split(' ');
            switch (p[0])
            {
                case "sub": stock.PriceChanged += p[1] == "log" ? log : alert; break;
                case "unsub": stock.PriceChanged -= p[1] == "log" ? log : alert; break;
                default: stock.SetPrice(long.Parse(p[1])); break;
            }
        }
        return lines.ToArray();
    }
}`,
      dry: { head: ['op', 'subscribers', 'event?', 'lines added'], rows: [
        ['sub alert', '[alert]', '—', ''],
        ['sub log', '[alert, log]', '—', ''],
        ['set 0', '[alert, log]', '100 → 0', 'ALERT ACME 100->0, ACME 100->0'],
        ['set 50', '[alert, log]', '0 → 50 (old = 0: no alert)', 'ACME 0->50']
      ] },
      complexity: `<p>O(h) per price change for h subscriptions; O(1) per subscribe (plus copying the invocation list).</p>`,
      followUps: ['Make the alert threshold configurable per subscriber.', 'Raise the event asynchronously without blocking SetPrice — what changes about ordering and exceptions?']
    }
  }];

  /* ======================================================================
     TOPIC 5 — LINQ: query and method syntax
     ====================================================================== */
  topics.push({
    title: 'LINQ — Query Syntax, Method Syntax & the Core Operators',
    analogy: `<p>A <b>factory conveyor belt</b>: items roll past a station that throws out bad ones (<code>Where</code>), a station that paints them (<code>Select</code>), a station that lines them up by size (<code>OrderBy</code>) and a worker at the end who boxes the first ten (<code>Take</code>). You describe the stations; the belt moves items through them one by one. LINQ is that belt for any collection.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> LINQ (Language-Integrated Query) is a set of extension methods on <code>IEnumerable&lt;T&gt;</code> (in <code>System.Linq</code>) that take lambdas. You can write them as <b>method calls</b> or with <b>query syntax</b>, which the compiler translates into the same calls:</p>
${H.table(['Query syntax', 'Method syntax'], [
  ['<code>from p in people</code><br><code>where p.Age &gt;= 18</code><br><code>orderby p.Name</code><br><code>select p.Name</code>', '<code>people.Where(p =&gt; p.Age &gt;= 18)</code><br><code>.OrderBy(p =&gt; p.Name)</code><br><code>.Select(p =&gt; p.Name)</code>']
])}
<p><b>The operators you will use 90% of the time:</b></p>
${H.table(['Category', 'Operators'], [
  ['Filter', '<code>Where</code>, <code>OfType&lt;T&gt;</code>, <code>Distinct</code>, <code>DistinctBy</code>'],
  ['Project', '<code>Select</code> (with index overload), <code>SelectMany</code> (flatten)'],
  ['Sort', '<code>OrderBy</code>, <code>OrderByDescending</code>, <code>ThenBy</code>, <code>Order()</code> (.NET 7) — all <b>stable</b>'],
  ['Partition', '<code>Take</code>, <code>Skip</code>, <code>TakeWhile</code>, <code>SkipWhile</code>, <code>TakeLast</code>, <code>Chunk</code>'],
  ['Element', '<code>First</code>, <code>FirstOrDefault</code>, <code>Single</code>, <code>Last</code>, <code>ElementAt</code>'],
  ['Quantify', '<code>Any</code>, <code>All</code>, <code>Contains</code>'],
  ['Aggregate', '<code>Count</code>, <code>Sum</code>, <code>Min</code>, <code>Max</code>, <code>MinBy</code>, <code>MaxBy</code>, <code>Average</code>, <code>Aggregate</code>'],
  ['Set', '<code>Union</code>, <code>Intersect</code>, <code>Except</code> (+ <code>…By</code> versions)'],
  ['Convert', '<code>ToList</code>, <code>ToArray</code>, <code>ToDictionary</code>, <code>ToHashSet</code>, <code>ToLookup</code>']
])}
<p><b>Gotchas:</b> <code>First()</code> throws on an empty sequence (use <code>FirstOrDefault</code>); <code>Single()</code> throws if there is not exactly one; <code>Sum()</code> over <code>int</code> is <b>checked</b> and throws <code>OverflowException</code> on overflow; <code>Average()</code> throws on empty; <code>Count()</code> on a non-collection enumerates everything — use <code>Any()</code> to test for emptiness.</p>`,
    clues: [
      '"filter / transform / sort a collection" → <code>Where</code> / <code>Select</code> / <code>OrderBy</code>',
      '"flatten a list of lists" → <code>SelectMany</code>',
      '"is there any…" → <code>Any</code>, not <code>Count() &gt; 0</code>',
      '"top N by score" → <code>OrderByDescending(...).Take(N)</code> (or a heap for huge N)',
      '"element with the max score" → <code>MaxBy</code> (.NET 6+)',
      '"InvalidOperationException: Sequence contains no elements" → First/Single/Average on empty'
    ],
    code: [{ lang: 'csharp', run: true, title: 'The same query in both syntaxes, plus the core operators (runnable)', code: `var people = new[]
{
    new Person("Asha", 34, "Eng"), new Person("Ben", 17, "Ops"), new Person("Cal", 25, "Eng"),
    new Person("Dev", 41, "Ops"), new Person("Eve", 19, "HR")
};

var adultsQ = from p in people where p.Age >= 18 orderby p.Name select p.Name;
var adultsM = people.Where(p => p.Age >= 18).OrderBy(p => p.Name).Select(p => p.Name);
Console.WriteLine(string.Join(",", adultsQ) + " | " + string.Join(",", adultsM));

Console.WriteLine(people.Any(p => p.Age < 18));                    // True
Console.WriteLine(people.All(p => p.Name.Length == 3));            // False (Asha)
Console.WriteLine(people.MaxBy(p => p.Age)!.Name);                 // Dev
Console.WriteLine(people.Average(p => p.Age));                     // 27.2
Console.WriteLine(people.FirstOrDefault(p => p.Dept == "Sales")?.Name ?? "none");

int[][] nested = [[1, 2], [3], [4, 5, 6]];
Console.WriteLine(string.Join(",", nested.SelectMany(x => x)));    // 1,2,3,4,5,6

var topTwo = people.OrderByDescending(p => p.Age).ThenBy(p => p.Name).Take(2).Select((p, i) => $"{i + 1}.{p.Name}");
Console.WriteLine(string.Join(" ", topTwo));                       // 1.Dev 2.Asha

record Person(string Name, int Age, string Dept);` }],
    codeTitle: ['LINQ basics'],
    viz: {
      title: 'Items flowing through Where → Select → Take (one at a time)',
      input: '5 12 7 20 3 18 9',
      inputLabel: 'Numbers; query: Where(x > 6).Select(x * 10).Take(3)',
      gen: function (input) {
        var a = ints(input, 'Enter up to 10 integers', 10), out = [], frames = [];
        var code = 'var q = nums.Where(x => x > 6)\n           .Select(x => x * 10)\n           .Take(3);\nforeach (var v in q) Console.Write(v + " ");';
        frames.push({ narr: 'Building <code>q</code> runs nothing. The <code>foreach</code> asks Take for an item, Take asks Select, Select asks Where, Where pulls from the array — items are <b>pulled one at a time</b> through the chain.', parts: [cs(code, one(4, 'cur')), { type: 'array', label: 'nums', values: a }] });
        for (var i = 0; i < a.length && out.length < 3; i++) {
          var pass = a[i] > 6, h = {}; h[i] = pass ? 'ok' : 'bad';
          if (pass) out.push(a[i] * 10);
          frames.push({ narr: 'Where pulls <b>' + a[i] + '</b>: ' + (pass ? 'passes x &gt; 6 → Select makes ' + (a[i] * 10) + ' → Take yields it (' + out.length + ' of 3).' : 'fails x &gt; 6, Where immediately pulls the next one.'), parts: [{ type: 'array', label: 'nums', values: a, hl: h, ptr: one(i, 'pull') }, { type: 'queue', label: 'yielded to foreach', items: out.slice() }] });
        }
        var rest = a.length - i;
        frames.push({ narr: 'Take reached 3 and stopped asking. ' + (rest > 0 ? '<b>' + rest + ' element(s) were never even looked at</b> — that is lazy, streaming evaluation.' : 'The source ran out.'), parts: [{ type: 'array', label: 'nums', values: a, hl: (function () { var h = {}; for (var k = i; k < a.length; k++) h[k] = 'done'; return h; })() }, note(out.join(' '), 'Console output')] });
        return frames;
      }
    },
    examples: [
      { title: 'Query syntax shines with let and multiple from clauses', html: `<p><code>let</code> names an intermediate value; two <code>from</code> clauses become <code>SelectMany</code>. Method syntax can express everything, but some queries read better this way.</p>`, code: { lang: 'csharp', run: true, code: `string[] sentences = ["the quick fox", "a lazy dog"];
var longWords = from s in sentences
                from w in s.Split(' ')
                let len = w.Length
                where len > 3
                orderby len descending, w
                select $"{w}({len})";
Console.WriteLine(string.Join(" ", longWords));   // quick(5) lazy(4)` } },
      { title: 'Aggregate: a general fold', html: `<p><code>Aggregate(seed, (acc, x) =&gt; …)</code> threads an accumulator through the sequence — Sum, Max and string building are special cases.</p>`, code: { lang: 'csharp', run: true, code: `int[] digits = [4, 0, 2];
long number = digits.Aggregate(0L, (acc, d) => acc * 10 + d);
Console.WriteLine(number);                                         // 402
var csv = new[] { "a", "b", "c" }.Aggregate((acc, s) => acc + "," + s);
Console.WriteLine(csv);                                            // a,b,c` } },
      { title: 'Sum is checked: overflow throws', html: `<p>Unlike a manual loop (unchecked by default), <code>Enumerable.Sum</code> over int uses checked arithmetic. Sum over <code>long</code> or cast first when values are large.</p>`, code: { lang: 'csharp', run: true, code: `int[] big = [int.MaxValue, 1];
try { Console.WriteLine(big.Sum()); }
catch (OverflowException) { Console.WriteLine("Sum overflowed"); }
Console.WriteLine(big.Sum(x => (long)x));                          // 2147483648` } }
    ],
    deepDive: `<p><b>🟣 How LINQ to Objects works.</b> Each operator is an extension method returning a small iterator object that wraps its source. <code>source.Where(f).Select(g)</code> builds <code>SelectEnumerableIterator(WhereEnumerableIterator(source, f), g)</code>; enumerating the outer one pulls from the inner. .NET fuses common pairs (Where+Select becomes one <code>WhereSelectArrayIterator</code> for arrays) and special-cases sources: <code>Count()</code> on an <code>ICollection&lt;T&gt;</code> returns <code>.Count</code> without enumerating, <code>ToList()</code> pre-sizes when the count is known, <code>First()</code> on a list indexes directly. .NET 8 also vectorises <code>Sum</code>, <code>Min</code>, <code>Max</code> and <code>Average</code> over arrays and spans of primitives.</p>
<p><b>Cost model.</b> Each operator adds an allocation (iterator object), and each lambda an indirect call per element. For typical business code this is noise; in a tight loop over millions of items a hand-written <code>for</code> loop can be several times faster and allocation-free. Measure before rewriting.</p>
<p><b>Query syntax translation rules.</b> <code>where</code> → Where, <code>select</code> → Select, <code>orderby a, b descending</code> → OrderBy(a).ThenByDescending(b), <code>group x by k</code> → GroupBy, <code>join … on … equals …</code> → Join, <code>let</code> → a Select into an anonymous type. The translation is purely syntactic: any type with suitably named methods works, which is how LINQ to SQL/EF (on <code>IQueryable&lt;T&gt;</code>, with expression trees) and Rx (on <code>IObservable&lt;T&gt;</code>) plug in.</p>
<p><b>IEnumerable vs IQueryable.</b> LINQ on <code>IQueryable&lt;T&gt;</code> (EF Core) does not run your lambdas; it inspects expression trees and generates SQL. Calling <code>AsEnumerable()</code> or <code>ToList()</code> too early pulls the whole table into memory and filters in C#.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes LINQ well and can translate between loops, query syntax and method syntax instantly. <b>Use AI as a partner:</b> ask it to "<i>rewrite this nested loop as LINQ and tell me what it allocates</i>", or the reverse for a hot path. <b>Where AI goes wrong:</b> <code>Count() &gt; 0</code> instead of <code>Any()</code>, <code>First()</code> where empty is possible, sorting the whole sequence to take the max (use <code>MaxBy</code>), forgetting that <code>Sum</code> throws on overflow, and calling <code>ToList()</code> on an EF query before filtering. <b>What you still own:</b> knowing what runs where (memory vs database) and when — the next topic.</p>`
  });

  topics[4].problems = [{
    title: 'Top Earners with LINQ',
    level: 'Easy', tags: ['LINQ', 'OrderByDescending', 'ThenBy', 'Take'], companies: ['Amazon', 'Workday', 'Microsoft'],
    statement: `<p>Rows are <code>"name,dept,salary"</code>. Return the top k employees as <code>"name:salary"</code>, ordered by salary descending, then name ascending (ordinal). Implement <code>public static string[] TopEarners(string[] rows, int k)</code> as one LINQ method chain.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>5</sup>; 0 ≤ k; salaries are ints; names are unique.`,
    example: `<p>(["a,x,10", "b,y,30", "c,x,20"], 2) → ["b:30", "c:20"].</p>`,
    brute: { why: `<p>Selection by repeated max-scan is O(n·k); sorting by hand with a custom comparer works but is more code than the declarative chain.</p>`, code: `static string[] Loop(string[] rows, int k)
{
    var list = rows.Select(r => r.Split(',')).ToList(); var result = new List<string>();
    while (result.Count < k && list.Count > 0)
    {
        var best = list.OrderByDescending(p => int.Parse(p[2])).First();   // re-sorts every time
        result.Add($"{best[0]}:{best[2]}"); list.Remove(best);
    }
    return result.ToArray();
}` },
    mcq: { q: 'Why ThenBy rather than a second OrderBy?', options: ['They are the same', 'A second OrderBy re-sorts everything by name, discarding the salary order; ThenBy only breaks ties', 'ThenBy is faster but equivalent', 'OrderBy cannot take strings'], answer: 1, explain: 'OrderBy starts a new primary sort. ThenBy adds a secondary key.' },
    hints: [`<p>Hint 1: Parse first: <code>.Select(r =&gt; r.Split(',')).Select(p =&gt; (Name: p[0], Salary: int.Parse(p[2])))</code></p>`, `<p>Hint 2: <code>.OrderByDescending(e =&gt; e.Salary).ThenBy(e =&gt; e.Name, StringComparer.Ordinal).Take(k)</code></p>`, `<p>Hint 3: Format and <code>ToArray()</code>. Take(0) and Take(k &gt; n) are both fine.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'TopEarners', cases: [
      [[["a,x,10", "b,y,30", "c,x,20"], 2], ["b:30", "c:20"]],
      [[[], 3], []],
      [[["z,x,5", "y,x,5", "x,x,5"], 2], ["x:5", "y:5"]],
      [[["a,x,1"], 0], []],
      [[["a,x,100", "b,x,200"], 5], ["b:200", "a:100"]],
      [[["m,x,2147483647", "n,y,-1"], 2], ["m:2147483647", "n:-1"]],
      [[["Bo,x,7", "al,x,7"], 2], ["Bo:7", "al:7"]]
    ] },
    solution: {
      approach: `<p>Parse into tuples, sort by salary descending with an ordinal name tie-break, take k, format.</p>`,
      code: `public class Solution
{
    public static string[] TopEarners(string[] rows, int k) =>
        rows.Select(r => r.Split(','))
            .Select(p => (Name: p[0], Salary: int.Parse(p[2])))
            .OrderByDescending(e => e.Salary)
            .ThenBy(e => e.Name, StringComparer.Ordinal)
            .Take(k)
            .Select(e => $"{e.Name}:{e.Salary}")
            .ToArray();
}`,
      dry: { head: ['stage', 'items'], rows: [
        ['parse', '(a,10) (b,30) (c,20)'],
        ['OrderByDescending salary', '(b,30) (c,20) (a,10)'],
        ['Take(2)', '(b,30) (c,20)'],
        ['format', '"b:30", "c:20"']
      ] },
      complexity: `<p>O(n log n) for the sort (LINQ's OrderBy + Take uses a partial sort when possible); O(n) space.</p>`,
      followUps: ['Top earner per department (GroupBy + MaxBy).', 'For k much smaller than n, how would a heap help?']
    }
  }];

  /* ======================================================================
     TOPIC 6 — Deferred execution and yield return iterators
     ====================================================================== */
  topics.push({
    title: 'Deferred Execution & yield return Iterators',
    analogy: `<p>A <b>recipe card</b> is not a cake. Writing the recipe takes no flour; the baking happens each time someone follows it — and if you follow it twice, you bake twice (and use twice the eggs). A LINQ query is a recipe: building it does nothing, enumerating it does the work, and enumerating it twice does the work twice. A <code>yield return</code> method is how you write your own recipe cards.</p>`,
    explain: `<p><b>🟢 Deferred execution.</b> Most LINQ operators (<code>Where</code>, <code>Select</code>, <code>Take</code>, <code>OrderBy</code>…) return a <b>query object</b>; nothing runs until something enumerates it (<code>foreach</code>, <code>ToList</code>, <code>Count</code>, <code>First</code>, <code>Sum</code>…).</p>
${H.table(['Consequence', 'Example'], [
  ['The query sees the source <b>at enumeration time</b>', 'add to the list after building the query → the new item appears'],
  ['Enumerating twice runs the work twice', '<code>q.Count()</code> then <code>foreach (var x in q)</code> → every lambda runs twice'],
  ['Exceptions happen late', 'a bad lambda throws when you enumerate, not where the query was written'],
  ['Infinite sequences are fine', '<code>Naturals().Where(IsPrime).Take(10)</code>'],
  ['Materialise to freeze a result', '<code>.ToList()</code> / <code>.ToArray()</code> runs once and stores the items']
])}
<p><b>Streaming vs buffering.</b> <code>Where</code>/<code>Select</code>/<code>Take</code> stream: one item in, one item out. <code>OrderBy</code>, <code>GroupBy</code>, <code>Reverse</code>, <code>Distinct</code> (partly) must <b>buffer</b> the whole source before yielding the first item — still deferred, but memory-hungry and they cannot work on infinite sequences.</p>
<p><b>Iterators with <code>yield return</code>.</b> A method returning <code>IEnumerable&lt;T&gt;</code> (or <code>IEnumerator&lt;T&gt;</code>) that contains <code>yield return x;</code> is turned by the compiler into a state machine. Each <code>MoveNext()</code> runs the method body until the next <code>yield return</code>, hands back the value, and <b>pauses</b> there. <code>yield break;</code> ends the sequence. The body does not even start until the first <code>MoveNext()</code> — so argument validation inside an iterator is deferred too.</p>`,
    clues: [
      '"my query ran twice / the database was hit twice" → multiple enumeration of a deferred query',
      '"the result changed after I modified the list" → deferred execution saw the new data',
      '"exception thrown far from where the query was written" → lazy evaluation',
      '"generate an infinite or very large sequence lazily" → <code>yield return</code>',
      '"stream a huge file line by line" → iterator / <code>File.ReadLines</code> (not ReadAllLines)',
      '"CA1851: possible multiple enumerations" analyzer → materialise once'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Deferred execution, double enumeration and an iterator (runnable)', code: `var numbers = new List<int> { 1, 2, 3 };
int evaluations = 0;
var query = numbers.Where(n => { evaluations++; return n > 1; });   // nothing runs yet
Console.WriteLine($"after building: {evaluations}");                 // 0

numbers.Add(4);                                                      // the query will see this
Console.WriteLine(string.Join(",", query));                          // 2,3,4
Console.WriteLine($"after one enumeration: {evaluations}");          // 4
Console.WriteLine(query.Count());                                    // enumerates AGAIN
Console.WriteLine($"after Count(): {evaluations}");                  // 8

var frozen = query.ToList();                                         // run once, store results
Console.WriteLine(string.Join(",", Naturals().Where(n => n % 7 == 0).Take(3)));   // 7,14,21 from an infinite source

foreach (var step in Countdown(3)) Console.Write(step + " ");        // tracing shows the pauses
Console.WriteLine();

static IEnumerable<int> Naturals()
{
    for (int i = 1; ; i++) yield return i;                           // infinite, but lazy
}

static IEnumerable<string> Countdown(int from)
{
    Console.Write("[start] ");
    for (int i = from; i > 0; i--)
    {
        yield return i.ToString();                                   // pause here until the next MoveNext
    }
    yield return "liftoff";
    Console.Write("[end]");
}` }],
    codeTitle: ['Deferred execution and iterators'],
    viz: {
      title: 'yield return as a paused state machine',
      input: '3',
      inputLabel: 'Countdown start (1–6)',
      gen: function (input) {
        var n = Number(String(input).trim());
        if (!(n >= 1 && n <= 6 && n === Math.floor(n))) throw new Error('Enter an integer from 1 to 6');
        var code = 'static IEnumerable<int> Countdown(int from)\n{\n    for (int i = from; i > 0; i--)\n        yield return i;\n    Console.WriteLine("done");\n}\nforeach (var x in Countdown(' + n + ')) Console.Write(x);';
        var frames = [{ narr: 'Calling <code>Countdown(' + n + ')</code> only creates a state-machine object (state = before start). <b>No line of the body has run.</b>', parts: [cs(code, one(7, 'cur')), { type: 'vars', label: 'state machine', vals: { state: 'not started', i: '—', Current: '—' } }] }];
        var out = '';
        for (var i = n; i > 0; i--) {
          frames.push({ narr: 'foreach calls <b>MoveNext()</b>. The body runs ' + (i === n ? 'from the top' : 'from just after the last yield') + ' until it reaches <code>yield return ' + i + '</code>, then <b>pauses</b> and returns true.', parts: [cs(code, one(4, 'cur')), { type: 'vars', label: 'state machine', vals: { state: 'paused at yield', i: i, Current: i }, hl: { Current: 'ok' } }] });
          out += i;
          frames.push({ narr: 'foreach reads <code>Current</code> (' + i + ') and runs its own body: prints ' + i + '.', parts: [cs(code, one(7, 'cur')), note(out, 'Console output')] });
        }
        frames.push({ narr: 'Next MoveNext(): the loop condition fails, the body continues to the end and prints "done". MoveNext returns <b>false</b> and the foreach ends (and disposes the iterator).', parts: [cs(code, one(5, 'ok')), { type: 'vars', label: 'state machine', vals: { state: 'finished', i: 0, Current: '—' } }, note(out + '<br>done', 'Console output')] });
        return frames;
      }
    },
    examples: [
      { title: 'Eager validation with a local iterator function', html: `<p>Because iterator bodies are deferred, a null check inside them fires only on the first MoveNext. The idiom: a normal method validates, then returns a local iterator function.</p>`, code: { lang: 'csharp', run: true, code: `try { var q = EveryNth<int>(null!, 2); Console.WriteLine("no exception yet?"); }
catch (ArgumentNullException) { Console.WriteLine("thrown immediately, as it should be"); }
Console.WriteLine(string.Join(",", EveryNth(new[] { 1, 2, 3, 4, 5 }, 2)));   // 1,3,5

static IEnumerable<T> EveryNth<T>(IEnumerable<T> source, int n)
{
    ArgumentNullException.ThrowIfNull(source);       // runs eagerly
    return Iterate();
    IEnumerable<T> Iterate()
    {
        int i = 0;
        foreach (var x in source) if (i++ % n == 0) yield return x;
    }
}` } },
      { title: 'Streaming a large input', html: `<p><code>File.ReadLines</code> is an iterator: combined with LINQ, a multi-gigabyte log is processed one line at a time in constant memory. <code>File.ReadAllLines</code> would load it all first. (Here a generated sequence stands in for the file.)</p>`, code: { lang: 'csharp', run: true, code: `static IEnumerable<string> FakeLog()
{
    for (int i = 0; i < 1_000_000; i++) yield return i % 1000 == 0 ? $"ERROR {i}" : $"INFO {i}";
}
var firstErrors = FakeLog().Where(l => l.StartsWith("ERROR")).Take(3).ToList();
Console.WriteLine(string.Join(" | ", firstErrors));   // only ~2001 lines were generated` } },
      { title: 'finally blocks in iterators run on early exit', html: `<p>If a consumer stops early (<code>break</code>, <code>Take</code>, <code>First</code>), foreach disposes the enumerator, which runs pending <code>finally</code> blocks in the iterator — so resources are released.</p>`, code: { lang: 'csharp', run: true, code: `foreach (var x in Guarded()) { Console.WriteLine(x); if (x == 2) break; }

static IEnumerable<int> Guarded()
{
    try
    {
        for (int i = 1; i <= 5; i++) yield return i;
    }
    finally { Console.WriteLine("cleanup ran"); }
}` } }
    ],
    deepDive: `<p><b>🟣 The iterator state machine.</b> For an iterator method the compiler generates a private class implementing <code>IEnumerable&lt;T&gt;</code>, <code>IEnumerator&lt;T&gt;</code> and <code>IDisposable</code>. Locals become fields; an integer <code>&lt;&gt;1__state</code> records where to resume; <code>MoveNext()</code> is a big switch on that state that jumps to the code after the last <code>yield return</code>. <code>try/finally</code> blocks are tracked so <code>Dispose()</code> can run the right finally blocks. As an optimisation, the first <code>GetEnumerator()</code> call on the same thread returns the object itself instead of allocating a second one.</p>
<p><b>Restrictions.</b> No <code>yield</code> inside a <code>catch</code> block or a <code>finally</code>, no <code>yield return</code> inside a <code>try</code> that has a <code>catch</code>, no <code>ref</code>/<code>out</code> parameters, no <code>unsafe</code> code, and before C# 13 no <code>ref struct</code> locals (e.g. <code>Span&lt;T&gt;</code>) across a yield.</p>
<p><b>Multiple enumeration costs</b> can be dramatic: a query over an EF <code>IQueryable</code> enumerated twice runs two SQL queries; a query whose source is an iterator reading a network stream may not even be re-enumerable. Accept <code>IEnumerable&lt;T&gt;</code> but materialise once if you need two passes, or accept <code>IReadOnlyCollection&lt;T&gt;</code> to state that you need a count.</p>
<p><b>Async iterators</b> (<code>IAsyncEnumerable&lt;T&gt;</code> with <code>yield return</code> inside an <code>async</code> method, consumed by <code>await foreach</code>) apply the same idea to asynchronous streams — module 9.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code frequently enumerates queries several times (<code>if (items.Any()) foreach (var i in items) … items.Count()</code>) or calls <code>ToList()</code> everywhere "to be safe". <b>Use AI as a partner:</b> turn on analyzer CA1851 and ask the AI to fix each warning with the minimal materialisation. Ask it to explain when a given query actually executes. <b>Where AI goes wrong:</b> validation inside iterator bodies, assuming <code>OrderBy</code> streams, and returning a lazy query over a <code>DbContext</code> or file that is disposed before enumeration. <b>What you still own:</b> knowing exactly when and how many times each piece of work runs.</p>`
  });

  topics[5].problems = [{
    title: 'Lazy Fibonacci Filter',
    level: 'Medium', tags: ['yield return', 'infinite sequence', 'deferred execution'], companies: ['Microsoft', 'Google', 'Two Sigma'],
    statement: `<p>Write an <b>infinite</b> iterator <code>static IEnumerable&lt;long&gt; Fibonacci()</code> yielding 0, 1, 1, 2, 3, 5, … with <code>yield return</code>. Then implement <code>public static long[] FibWhere(int take, int mod)</code> returning the first <code>take</code> Fibonacci numbers divisible by <code>mod</code>, using <code>Where</code> and <code>Take</code> on the infinite sequence.</p>`,
    constraints: `0 ≤ take ≤ 10; 1 ≤ mod ≤ 10; every requested value fits in long.`,
    example: `<p>FibWhere(3, 2) → [0, 2, 8]. FibWhere(5, 3) → [0, 3, 21, 144, 987].</p>`,
    brute: { why: `<p>Precompute "enough" Fibonacci numbers into a list (how many is enough?) and filter. Guessing the length wastes work or fails; the lazy version computes exactly as many as needed.</p>`, code: `static long[] Precompute(int take, int mod)
{
    var fib = new List<long> { 0, 1 };
    while (fib.Count < 90) fib.Add(fib[^1] + fib[^2]);       // a guess
    return fib.Where(f => f % mod == 0).Take(take).ToArray();
}` },
    mcq: { q: 'Why does <code>Fibonacci().Where(...).Take(3).ToArray()</code> terminate even though Fibonacci() never ends?', options: ['The runtime detects infinite loops', 'Take stops calling MoveNext after 3 items, so the iterator is never resumed again', 'Where buffers everything', 'long overflows and throws'], answer: 1, explain: 'Pull-based, lazy evaluation: the generator only runs when asked for the next item.' },
    hints: [`<p>Hint 1: <code>long a = 0, b = 1; while (true) { yield return a; (a, b) = (b, a + b); }</code></p>`, `<p>Hint 2: <code>Fibonacci().Where(f =&gt; f % mod == 0).Take(take).ToArray()</code></p>`, `<p>Hint 3: Never call ToList() or Count() on the infinite sequence itself.</p>`],
    tests: { sig: 'int int -> long[]', fn: 'FibWhere', cases: [
      [[5, 1], [0, 1, 1, 2, 3]],
      [[0, 3], []],
      [[3, 2], [0, 2, 8]],
      [[4, 5], [0, 5, 55, 610]],
      [[1, 7], [0]],
      [[5, 3], [0, 3, 21, 144, 987]],
      [[3, 10], [0, 610, 832040]]
    ] },
    solution: {
      approach: `<p>An infinite iterator plus lazy Where/Take. Only as many Fibonacci numbers are computed as needed to find <code>take</code> matches.</p>`,
      code: `public class Solution
{
    static IEnumerable<long> Fibonacci()
    {
        long a = 0, b = 1;
        while (true)
        {
            yield return a;              // pause; resume here on the next MoveNext
            (a, b) = (b, a + b);
        }
    }

    public static long[] FibWhere(int take, int mod) =>
        Fibonacci().Where(f => f % mod == 0).Take(take).ToArray();
}`,
      dry: { head: ['MoveNext #', 'yielded', 'f % 2 == 0?', 'taken'], rows: [
        ['1', '0', 'yes', '[0]'],
        ['2–3', '1, 1', 'no', '[0]'],
        ['4', '2', 'yes', '[0, 2]'],
        ['5–6', '3, 5', 'no', '[0, 2]'],
        ['7', '8', 'yes', '[0, 2, 8] → Take stops']
      ] },
      complexity: `<p>O(m) where m is the index of the last match; O(1) state in the iterator plus the output.</p>`,
      followUps: ['Use checked arithmetic so the sequence throws instead of overflowing silently past F(92).', 'Write the same with IAsyncEnumerable and a delay between items.']
    }
  }];

  /* ======================================================================
     TOPIC 7 — Grouping and joining
     ====================================================================== */
  topics.push({
    title: 'Grouping & Joining — GroupBy, ToLookup, Join, GroupJoin, Zip',
    analogy: `<p>After a school trip you sort the photos into <b>piles by student</b> (grouping), then match each pile with the <b>class register</b> to find which student is in which class (joining). A student with no photos still appears in the register — that is a <b>left join</b>. LINQ does both sorts of matching on in-memory data.</p>`,
    explain: `<p><b>🟢 Grouping.</b> <code>GroupBy(keySelector)</code> returns a sequence of <code>IGrouping&lt;TKey, TElement&gt;</code> — each group has a <code>Key</code> and is itself an <code>IEnumerable</code> of its elements. Groups appear in the order their keys are first seen, and elements keep their source order.</p>
${H.table(['Operator', 'What it does', 'Notes'], [
  ['<code>GroupBy(k)</code>', 'deferred grouping', 'buffers the source on first enumeration'],
  ['<code>GroupBy(k, elementSelector, resultSelector)</code>', 'group and project in one go', '<code>GroupBy(e =&gt; e.Dept, (d, es) =&gt; new { d, Total = es.Sum(x =&gt; x.Pay) })</code>'],
  ['<code>ToLookup(k)</code>', '<b>immediate</b> grouping into an <code>ILookup</code>', 'indexable: <code>lookup["Eng"]</code>, missing key → empty sequence'],
  ['<code>CountBy(k)</code>, <code>AggregateBy</code>', 'counts per key', '.NET 9 only — on .NET 8 use GroupBy + Count']
])}
<p><b>Joining.</b></p>
${H.table(['Operator', 'SQL equivalent', 'Result'], [
  ['<code>Join(inner, outerKey, innerKey, result)</code>', 'INNER JOIN', 'one result per matching pair; unmatched rows vanish'],
  ['<code>GroupJoin(inner, outerKey, innerKey, (o, matches) =&gt; …)</code>', 'LEFT JOIN, grouped', 'each outer item with the (possibly empty) set of matches'],
  ['<code>GroupJoin</code> + <code>SelectMany(…DefaultIfEmpty())</code>', 'LEFT OUTER JOIN, flat', 'unmatched outers paired with default'],
  ['<code>Zip(a, b)</code>', 'by position', 'stops at the shorter sequence']
])}
<p>Join builds a hash lookup of the <b>inner</b> sequence, then streams the outer: O(n + m) rather than the O(n·m) of nested loops. Keys use default equality (or a comparer you pass).</p>`,
    clues: [
      '"per department / per customer / per day" → <code>GroupBy</code>',
      '"look up all items for a key many times" → <code>ToLookup</code>',
      '"match orders to customers" → <code>Join</code> (inner) or <code>GroupJoin</code> (keep customers with no orders)',
      '"customers with zero orders must still appear" → left join (GroupJoin)',
      '"pair element i of A with element i of B" → <code>Zip</code>',
      '"nested loops over two lists comparing ids" → a join or a dictionary, O(n + m)'
    ],
    code: [{ lang: 'csharp', run: true, title: 'GroupBy, ToLookup, Join, GroupJoin and Zip (runnable)', code: `var depts = new[] { new Dept(1, "Eng"), new Dept(2, "Ops"), new Dept(3, "HR") };
var emps = new[] { new Emp("Asha", 1, 120), new Emp("Ben", 2, 80), new Emp("Cal", 1, 100), new Emp("Dee", 9, 50) };

foreach (var g in emps.GroupBy(e => e.DeptId))
    Console.WriteLine($"dept {g.Key}: {string.Join(",", g.Select(e => e.Name))} total {g.Sum(e => e.Pay)}");

var lookup = emps.ToLookup(e => e.DeptId);
Console.WriteLine($"lookup[1] has {lookup[1].Count()}, lookup[42] has {lookup[42].Count()}");   // 2, 0

var inner = emps.Join(depts, e => e.DeptId, d => d.Id, (e, d) => $"{e.Name}@{d.Name}");
Console.WriteLine(string.Join(" ", inner));          // Dee has no matching dept -> dropped

var left = depts.GroupJoin(emps, d => d.Id, e => e.DeptId, (d, es) => $"{d.Name}:{es.Count()}");
Console.WriteLine(string.Join(" ", left));           // Eng:2 Ops:1 HR:0

var query = from d in depts
            join e in emps on d.Id equals e.DeptId into staff
            from s in staff.DefaultIfEmpty()
            select $"{d.Name}-{s?.Name ?? "nobody"}";
Console.WriteLine(string.Join(" ", query));          // flat left outer join

string[] days = ["Mon", "Tue", "Wed"];
int[] temps = [21, 23];
Console.WriteLine(string.Join(" ", days.Zip(temps, (d, t) => $"{d}={t}")));   // Mon=21 Tue=23

record Dept(int Id, string Name);
record Emp(string Name, int DeptId, int Pay);` }],
    codeTitle: ['Grouping and joining'],
    viz: {
      title: 'How Join works: hash the inner side, stream the outer',
      gen: function () {
        var depts = [[1, 'Eng'], [2, 'Ops'], [3, 'HR']];
        var emps = [['Asha', 1], ['Ben', 2], ['Cal', 1], ['Dee', 9]];
        var frames = [];
        frames.push({ narr: '<code>emps.Join(depts, e =&gt; e.DeptId, d =&gt; d.Id, …)</code>. Step 1: build a hash lookup of the <b>inner</b> sequence (depts) keyed by Id — one pass, O(m).', parts: [{ type: 'table', label: 'depts (inner)', columns: ['Id', 'Name'], rows: depts }, { type: 'map', label: 'lookup by Id', entries: depts.map(function (d) { return [String(d[0]), d[1]]; }) }] });
        var out = [];
        emps.forEach(function (e, i) {
          var m = depts.filter(function (d) { return d[0] === e[1]; });
          var hl = {}; hl[String(e[1])] = m.length ? 'ok' : 'bad';
          if (m.length) out.push([e[0], m[0][1]]);
          frames.push({ narr: 'Stream outer item <b>' + e[0] + '</b> (DeptId ' + e[1] + '): O(1) lookup → ' + (m.length ? 'match <b>' + m[0][1] + '</b>, yield a result.' : H.c('r', 'no match') + ' — an inner join drops it.'), parts: [{ type: 'table', label: 'emps (outer)', columns: ['Name', 'DeptId'], rows: emps, hl: one(i, m.length ? 'sel' : 'cur') }, { type: 'map', label: 'lookup by Id', entries: depts.map(function (d) { return [String(d[0]), d[1]]; }), hl: hl }, { type: 'table', label: 'results so far', columns: ['Emp', 'Dept'], rows: out.slice() }] });
        });
        frames.push({ narr: 'Total work O(n + m) instead of comparing every pair (O(n·m)). A GroupJoin from depts would instead list HR with an empty group — the left-join shape.', parts: [{ type: 'table', label: 'GroupJoin(depts → emps)', columns: ['Dept', 'Staff'], rows: [['Eng', 'Asha, Cal'], ['Ops', 'Ben'], ['HR', '(none)']], hl: { 2: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Group and aggregate in one step', html: `<p>The result-selector overload of GroupBy avoids an extra Select and reads like SQL's GROUP BY with aggregates.</p>`, code: { lang: 'csharp', run: true, code: `var sales = new[] { ("north", 10), ("south", 5), ("north", 7), ("east", 1) };
var report = sales.GroupBy(s => s.Item1, s => s.Item2, (region, amounts) => new { region, total = amounts.Sum(), count = amounts.Count() })
                  .OrderByDescending(r => r.total);
foreach (var r in report) Console.WriteLine($"{r.region}: {r.total} in {r.count}");` } },
      { title: 'Composite keys with anonymous types or tuples', html: `<p>Group by several properties with a tuple key; tuples and anonymous types have value equality, so equal pairs land in the same group.</p>`, code: { lang: 'csharp', run: true, code: `var visits = new[] { ("asha", "2026-01-01"), ("asha", "2026-01-01"), ("asha", "2026-01-02"), ("ben", "2026-01-01") };
foreach (var g in visits.GroupBy(v => (User: v.Item1, Day: v.Item2)))
    Console.WriteLine($"{g.Key.User} {g.Key.Day}: {g.Count()}");` } },
      { title: 'ToLookup for repeated lookups', html: `<p>GroupBy is deferred and re-groups on every enumeration. ToLookup groups once and gives O(1) access by key — and a missing key returns an empty sequence instead of throwing.</p>`, code: { lang: 'csharp', run: true, code: `string[] words = ["apple", "avocado", "banana", "blueberry", "cherry"];
var byLetter = words.ToLookup(w => w[0]);
foreach (var c in "abz") Console.WriteLine($"{c}: {string.Join(",", byLetter[c])}");` } }
    ],
    deepDive: `<p><b>🟣 Implementation notes.</b> <code>GroupBy</code> and <code>ToLookup</code> share an internal <code>Lookup&lt;TKey, TElement&gt;</code>: a hash table of <code>Grouping</code> objects, each holding an array of elements, linked in first-seen order (which is why group order is deterministic). <code>Join</code> builds a Lookup of the inner sequence <b>when enumeration starts</b>, then streams the outer; so put the smaller sequence on the inner side when memory matters. <code>GroupJoin</code> does the same and yields every outer element with its lookup group (an empty one if missing).</p>
<p><b>Null keys.</b> GroupBy and ToLookup allow a null key (grouped together); <code>ToDictionary</code> throws on null keys and on duplicate keys — a common runtime surprise when converting grouped data. <code>Join</code> never matches null keys, mirroring SQL.</p>
<p><b>Complexity traps.</b> Calling <code>g.Count()</code>, <code>g.Sum()</code> and <code>g.Max()</code> on a group enumerates its array each time — fine. But calling <code>source.Where(x =&gt; x.Key == k)</code> inside a loop over keys is O(n·k); group once instead. Nested <code>from</code> clauses with a <code>where a.Id == b.Id</code> filter are O(n·m) — rewrite as <code>join</code>.</p>
<p><b>In EF Core</b> the same operators translate to SQL GROUP BY and JOINs, but GroupBy must end in an aggregate to be translatable; returning raw groups forces client-side evaluation (and EF Core throws rather than silently doing that).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is good at writing GroupJoin/SelectMany/DefaultIfEmpty left joins that humans find fiddly. <b>Use AI as a partner:</b> describe the SQL you would write and ask for the LINQ equivalent, then ask "<i>what is the complexity of this query and which side is hashed?</i>". <b>Where AI goes wrong:</b> nested loops with Where inside for joins, ToDictionary on non-unique keys, and GroupBy shapes that EF cannot translate. <b>What you still own:</b> the data model — knowing which keys are unique, which can be missing, and how big each side is.</p>`
  });

  topics[6].problems = [{
    title: 'Department Summary with GroupJoin',
    level: 'Medium', tags: ['GroupJoin', 'left join', 'aggregation'], companies: ['Microsoft', 'SAP', 'Oracle'],
    statement: `<p>employees: <code>"name,deptId,salary"</code>; depts: <code>"deptId,deptName"</code>. For every department (including empty ones) produce <code>"deptName count total"</code> where total is the sum of salaries as a <code>long</code>; employees with an unknown department are ignored. Sort by deptName (ordinal). Implement <code>public static string[] DeptSummary(string[] employees, string[] depts)</code> with <code>GroupJoin</code>.</p>`,
    constraints: `0 ≤ sizes ≤ 10<sup>5</sup>; dept ids unique; salaries up to 2·10<sup>9</sup>.`,
    example: `<p>emps ["a,1,10", "b,1,20", "c,2,5"], depts ["1,Eng", "2,Ops", "3,HR"] → ["Eng 2 30", "HR 0 0", "Ops 1 5"].</p>`,
    brute: { why: `<p>For each department, scan all employees: O(D·E). An inner Join would also lose HR (no employees). GroupJoin hashes employees once and keeps every department.</p>`, code: `static string Line(string deptId, string name, string[] emps)
{
    var mine = emps.Select(e => e.Split(',')).Where(p => p[1] == deptId).ToList();   // O(E) per dept
    return $"{name} {mine.Count} {mine.Sum(p => long.Parse(p[2]))}";
}` },
    mcq: { q: 'Which operator keeps departments with no employees?', options: ['Join', 'GroupJoin (left-join shape)', 'Zip', 'Intersect'], answer: 1, explain: 'GroupJoin yields every outer element with its possibly empty group of matches.' },
    hints: [`<p>Hint 1: Parse both arrays into tuples first.</p>`, `<p>Hint 2: <code>ds.GroupJoin(es, d =&gt; d.Id, e =&gt; e.DeptId, (d, staff) =&gt; …)</code></p>`, `<p>Hint 3: <code>staff.Sum(e =&gt; (long)e.Salary)</code> avoids int overflow (Sum over int is checked and would throw).</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'DeptSummary', cases: [
      [[["a,1,10", "b,1,20", "c,2,5"], ["1,Eng", "2,Ops", "3,HR"]], ["Eng 2 30", "HR 0 0", "Ops 1 5"]],
      [[[], []], []],
      [[[], ["1,Z"]], ["Z 0 0"]],
      [[["a,9,10"], ["1,A"]], ["A 0 0"]],
      [[["a,1,2000000000", "b,1,2000000000"], ["1,Big"]], ["Big 2 4000000000"]],
      [[["x,2,1", "y,1,1", "z,2,1"], ["2,b", "1,a"]], ["a 1 1", "b 2 2"]],
      [[["p,1,0"], ["1,b", "2,B"]], ["B 0 0", "b 1 0"]]
    ] },
    solution: {
      approach: `<p>GroupJoin departments (outer) with employees (inner, hashed by deptId), aggregate each group, sort by name.</p>`,
      code: `public class Solution
{
    public static string[] DeptSummary(string[] employees, string[] depts)
    {
        var es = employees.Select(r => r.Split(',')).Select(p => (DeptId: int.Parse(p[1]), Salary: long.Parse(p[2])));
        var ds = depts.Select(r => r.Split(',')).Select(p => (Id: int.Parse(p[0]), Name: p[1]));
        return ds.GroupJoin(es, d => d.Id, e => e.DeptId,
                    (d, staff) => (d.Name, Count: staff.Count(), Total: staff.Sum(e => e.Salary)))
                 .OrderBy(x => x.Name, StringComparer.Ordinal)
                 .Select(x => $"{x.Name} {x.Count} {x.Total}")
                 .ToArray();
    }
}`,
      dry: { head: ['dept', 'matched employees', 'count', 'total'], rows: [
        ['1 Eng', 'a(10), b(20)', '2', '30'],
        ['2 Ops', 'c(5)', '1', '5'],
        ['3 HR', '(none)', '0', '0'],
        ['sort by name', 'Eng, HR, Ops', '', '']
      ] },
      complexity: `<p>O(E + D log D) time; O(E) for the lookup.</p>`,
      followUps: ['Also list the ignored employees (anti-join).', 'Write the same with query syntax using join … into.']
    }
  }];

  /* ============================ PRACTICE ============================ */
  practice.push({
    title: 'Squares of the Even Numbers',
    level: 'Easy', tags: ['LINQ', 'Where', 'Select'], companies: ['Microsoft', 'Infosys', 'Accenture'],
    statement: `<p>Return the squares of the even numbers in <code>nums</code>, in their original order. Implement <code>public static int[] SquaresOfEvens(int[] nums)</code> with <code>Where</code> and <code>Select</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; |nums[i]| ≤ 46340 (so squares fit in int).`,
    example: `<p>[1, 2, 3, 4] → [4, 16].</p>`,
    brute: { why: `<p>A loop with a List and an if works equally well; the LINQ version states the intent (filter, then map) in one line. Both are O(n).</p>`, code: `static int[] Loop(int[] nums)
{
    var r = new List<int>();
    foreach (var x in nums) if (x % 2 == 0) r.Add(x * x);
    return r.ToArray();
}` },
    mcq: { q: 'Does the order Where→Select vs Select→Where matter here?', options: ['No difference at all', 'Filtering first avoids squaring numbers you will throw away (and a square of an odd number is odd, so the result is the same)', 'Select must come first', 'Where must come last'], answer: 1, explain: 'Filter early to do less work; here the results coincide because squaring preserves parity.' },
    hints: [`<p>Hint 1: <code>x % 2 == 0</code> also works for negative numbers in C# (−4 % 2 == 0).</p>`, `<p>Hint 2: <code>nums.Where(x =&gt; x % 2 == 0).Select(x =&gt; x * x)</code></p>`, `<p>Hint 3: Finish with <code>.ToArray()</code> — the query itself is lazy.</p>`],
    tests: { sig: 'int[] -> int[]', fn: 'SquaresOfEvens', cases: [
      [[[1, 2, 3, 4]], [4, 16]], [[[]], []], [[[1, 3]], []], [[[-2, 0, 2]], [4, 0, 4]], [[[46340]], [2147395600]], [[[6]], [36]], [[[-46340, 7]], [2147395600]]
    ] },
    solution: {
      approach: `<p>Filter, then project, then materialise.</p>`,
      code: `public class Solution
{
    public static int[] SquaresOfEvens(int[] nums) =>
        nums.Where(x => x % 2 == 0).Select(x => x * x).ToArray();
}`,
      complexity: `<p>O(n) time; O(k) for the k results.</p>`,
      followUps: ['Return them sorted descending without a second pass over the source.', 'Make it allocation-free with a Span and a for loop.']
    }
  });

  practice.push({
    title: 'Dot Product with Zip',
    level: 'Easy', tags: ['LINQ', 'Zip', 'Sum', 'long'], companies: ['Nvidia', 'Microsoft', 'Qualcomm'],
    statement: `<p>Return the dot product of <code>a</code> and <code>b</code> (Σ a[i]·b[i]) over the length of the shorter array, as a <code>long</code>. Implement <code>public static long Dot(int[] a, int[] b)</code> with <code>Zip</code> and <code>Sum</code>.</p>`,
    constraints: `0 ≤ lengths ≤ 10<sup>5</sup>; values are any int.`,
    example: `<p>([1, 2, 3], [4, 5, 6]) → 4 + 10 + 18 = <b>32</b>. ([1, 2, 3], [1]) → <b>1</b> (Zip stops at the shorter).</p>`,
    brute: { why: `<p>An index loop needs <code>Math.Min</code> on the lengths and a long accumulator; easy to get the overflow wrong by multiplying two ints first.</p>`, code: `static long Loop(int[] a, int[] b)
{
    long s = 0;
    for (int i = 0; i < Math.Min(a.Length, b.Length); i++) s += (long)a[i] * b[i];
    return s;
}` },
    mcq: { q: '<code>a.Zip(b, (x, y) =&gt; x * y).Sum()</code> with large values…', options: ['Is always correct', 'Overflows: x * y is int arithmetic (wraps), and Sum over int throws on overflow', 'Returns double', 'Truncates to the longer array'], answer: 1, explain: 'Widen before multiplying: (long)x * y, and sum longs.' },
    hints: [`<p>Hint 1: <code>a.Zip(b, (x, y) =&gt; (long)x * y)</code></p>`, `<p>Hint 2: <code>.Sum()</code> over long is checked too, but the constraints keep it within range.</p>`, `<p>Hint 3: Empty inputs give 0, because Sum of an empty sequence is zero.</p>`],
    tests: { sig: 'int[] int[] -> long', fn: 'Dot', cases: [
      [[[1, 2, 3], [4, 5, 6]], 32], [[[], []], 0], [[[1, 2, 3], [1]], 1], [[[-1, 2], [3, -4]], -11],
      [[[2147483647, 2147483647], [2, 2]], 8589934588], [[[0], [5]], 0], [[[-2147483648], [-2147483648]], "4611686018427387904"]
    ] },
    solution: {
      approach: `<p>Zip pairs the arrays by position (stopping at the shorter), widening each product to long before summing.</p>`,
      code: `public class Solution
{
    public static long Dot(int[] a, int[] b) => a.Zip(b, (x, y) => (long)x * y).Sum();
}`,
      complexity: `<p>O(min(n, m)) time, O(1) extra space.</p>`,
      followUps: ['Vectorise it with System.Numerics.Vector&lt;T&gt; or TensorPrimitives.Dot (.NET 8).', 'Throw if the lengths differ instead of truncating.']
    }
  });

  practice.push({
    title: 'Your Own Where with Predicate and yield',
    level: 'Easy', tags: ['Predicate', 'yield return', 'iterators'], companies: ['Microsoft', 'JetBrains', 'Unity'],
    statement: `<p>Write a generic iterator <code>static IEnumerable&lt;T&gt; Filter&lt;T&gt;(IEnumerable&lt;T&gt; source, Predicate&lt;T&gt; keep)</code> using <code>yield return</code> (no LINQ inside). Then implement <code>public static int[] KeepIf(int[] nums, string rule)</code> for rules <code>even</code>, <code>odd</code>, <code>positive</code>, <code>negative</code>, by mapping each rule name to a <code>Predicate&lt;int&gt;</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>.`,
    example: `<p>([−3, −2, 0, 5, 8], "odd") → [−3, 5]; "positive" → [5, 8] (0 is neither positive nor negative).</p>`,
    brute: { why: `<p>Four copies of the same loop, one per rule. A predicate parameter separates "how to filter" from "what to keep".</p>`, code: `static List<int> Evens(int[] a) { var r = new List<int>(); foreach (var x in a) if (x % 2 == 0) r.Add(x); return r; }` },
    mcq: { q: 'Why is <code>x % 2 == 1</code> a wrong oddness test in C#?', options: ['It is fine', 'For negative odd numbers % returns −1, so −3 % 2 == −1; use x % 2 != 0', '% does not work on ints', 'It overflows'], answer: 1, explain: 'C# % keeps the sign of the dividend.' },
    hints: [`<p>Hint 1: <code>foreach (var x in source) if (keep(x)) yield return x;</code></p>`, `<p>Hint 2: <code>Predicate&lt;int&gt; p = rule switch { "even" =&gt; x =&gt; x % 2 == 0, … };</code></p>`, `<p>Hint 3: Use <code>x % 2 != 0</code> for odd, so negative odd numbers are kept too.</p>`],
    tests: { sig: 'int[] string -> int[]', fn: 'KeepIf', cases: [
      [[[-3, -2, 0, 5, 8], "odd"], [-3, 5]], [[[-3, -2, 0, 5, 8], "even"], [-2, 0, 8]], [[[-3, -2, 0, 5, 8], "positive"], [5, 8]],
      [[[-3, -2, 0, 5, 8], "negative"], [-3, -2]], [[[], "even"], []], [[[-2147483648, 2147483647], "odd"], [2147483647]], [[[0, 0], "positive"], []]
    ] },
    solution: {
      approach: `<p>A tiny lazy iterator plus a switch expression that maps rule names to predicates.</p>`,
      code: `public class Solution
{
    static IEnumerable<T> Filter<T>(IEnumerable<T> source, Predicate<T> keep)
    {
        foreach (var x in source)
            if (keep(x)) yield return x;
    }

    public static int[] KeepIf(int[] nums, string rule)
    {
        Predicate<int> keep = rule switch
        {
            "even" => x => x % 2 == 0,
            "odd" => x => x % 2 != 0,
            "positive" => x => x > 0,
            _ => x => x < 0
        };
        return Filter(nums, keep).ToArray();
    }
}`,
      complexity: `<p>O(n) time; lazy until ToArray.</p>`,
      followUps: ['Turn Filter into an extension method (<code>this IEnumerable&lt;T&gt;</code>).', 'Combine rules: "even&amp;positive" — how do you compose predicates?']
    }
  });

  practice.push({
    title: 'Word Counts with GroupBy',
    level: 'Easy', tags: ['GroupBy', 'OrderBy', 'ThenBy'], companies: ['Amazon', 'Grammarly', 'Microsoft'],
    statement: `<p>Split <code>text</code> on spaces (ignoring empty entries), lower-case each word (invariant), and return <code>"word:count"</code> for each distinct word, ordered by count descending then word ascending (ordinal). Implement <code>public static string[] WordCounts(string text)</code>.</p>`,
    constraints: `0 ≤ |text| ≤ 10<sup>5</sup>; ASCII letters and spaces.`,
    example: `<p>"the cat the dog" → ["the:2", "cat:1", "dog:1"].</p>`,
    brute: { why: `<p>For each distinct word, count it with another pass: O(n·d). GroupBy builds the groups in one pass.</p>`, code: `static int CountOf(string[] words, string w) => words.Count(x => x == w);   // called once per distinct word` },
    mcq: { q: 'What is the key of each IGrouping here?', options: ['The count', 'The lower-cased word', 'The index', 'The first letter'], answer: 1, explain: 'Group by the normalised word; Count() of the group is its frequency.' },
    hints: [`<p>Hint 1: <code>text.Split(' ', StringSplitOptions.RemoveEmptyEntries)</code></p>`, `<p>Hint 2: <code>.GroupBy(w =&gt; w.ToLowerInvariant())</code></p>`, `<p>Hint 3: <code>.OrderByDescending(g =&gt; g.Count()).ThenBy(g =&gt; g.Key, StringComparer.Ordinal)</code></p>`],
    tests: { sig: 'string -> string[]', fn: 'WordCounts', cases: [
      [["the cat the dog"], ["the:2", "cat:1", "dog:1"]], [[""], []], [["A a A"], ["a:3"]], [["b a"], ["a:1", "b:1"]],
      [["  x   y x "], ["x:2", "y:1"]], [["Hello hello WORLD"], ["hello:2", "world:1"]]
    ] },
    solution: {
      approach: `<p>Normalise, group, order by two keys, format.</p>`,
      code: `public class Solution
{
    public static string[] WordCounts(string text) =>
        text.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .GroupBy(w => w.ToLowerInvariant())
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => $"{g.Key}:{g.Count()}")
            .ToArray();
}`,
      complexity: `<p>O(n + d log d) for n words and d distinct words.</p>`,
      followUps: ['Use CollectionsMarshal.GetValueRefOrAddDefault for a faster dictionary count.', 'Top 3 words only — what changes for a 10 GB file?']
    }
  });

  practice.push({
    title: 'Customer Totals with Join',
    level: 'Medium', tags: ['Join', 'GroupBy', 'Sum'], companies: ['Amazon', 'Shopify', 'Stripe'],
    statement: `<p>customers: <code>"id,name"</code>; orders: <code>"orderId,customerId,amount"</code>. Inner-join orders to customers, total the amounts per customer (as long), and return <code>"name total"</code> ordered by total descending, then name ascending (ordinal). Customers without orders and orders with unknown customers do not appear. Implement <code>public static string[] CustomerTotals(string[] customers, string[] orders)</code>.</p>`,
    constraints: `0 ≤ sizes ≤ 10<sup>5</sup>; customer ids unique; names unique.`,
    example: `<p>customers ["1,Ann", "2,Bob", "3,Cy"], orders ["10,1,50", "11,2,70", "12,1,30"] → ["Ann 80", "Bob 70"].</p>`,
    brute: { why: `<p>Nested loops over customers × orders: O(C·O). Join hashes one side and streams the other.</p>`, code: `static long TotalFor(int customerId, string[] orders) =>
    orders.Select(o => o.Split(',')).Where(p => int.Parse(p[1]) == customerId).Sum(p => long.Parse(p[2]));` },
    mcq: { q: 'Which LINQ operator corresponds to SQL INNER JOIN?', options: ['GroupJoin', 'Join', 'Zip', 'Concat'], answer: 1, explain: 'Join yields one result per matching pair and drops unmatched rows.' },
    hints: [`<p>Hint 1: Parse both arrays into named tuples such as (Id, Name) and (CustomerId, Amount).</p>`, `<p>Hint 2: <code>os.Join(cs, o =&gt; o.CustomerId, c =&gt; c.Id, (o, c) =&gt; (c.Name, o.Amount))</code></p>`, `<p>Hint 3: Then <code>GroupBy(x =&gt; x.Name)</code> and <code>Sum</code>.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'CustomerTotals', cases: [
      [[["1,Ann", "2,Bob", "3,Cy"], ["10,1,50", "11,2,70", "12,1,30"]], ["Ann 80", "Bob 70"]],
      [[[], []], []],
      [[["1,Ann"], []], []],
      [[[], ["1,1,5"]], []],
      [[["1,Ann", "2,Bob"], ["1,1,10", "2,2,10", "3,9,99"]], ["Ann 10", "Bob 10"]],
      [[["1,Big"], ["1,1,2000000000", "2,1,2000000000"]], ["Big 4000000000"]],
      [[["5,Zed", "6,Amy"], ["1,5,1", "2,6,2", "3,5,3"]], ["Zed 4", "Amy 2"]]
    ] },
    solution: {
      approach: `<p>Join on customer id, group by name, sum as long, sort by total then name.</p>`,
      code: `public class Solution
{
    public static string[] CustomerTotals(string[] customers, string[] orders)
    {
        var cs = customers.Select(r => r.Split(',')).Select(p => (Id: int.Parse(p[0]), Name: p[1]));
        var os = orders.Select(r => r.Split(',')).Select(p => (CustomerId: int.Parse(p[1]), Amount: long.Parse(p[2])));
        return os.Join(cs, o => o.CustomerId, c => c.Id, (o, c) => (c.Name, o.Amount))
                 .GroupBy(x => x.Name, x => x.Amount)
                 .Select(g => (Name: g.Key, Total: g.Sum()))
                 .OrderByDescending(x => x.Total)
                 .ThenBy(x => x.Name, StringComparer.Ordinal)
                 .Select(x => $"{x.Name} {x.Total}")
                 .ToArray();
    }
}`,
      complexity: `<p>O(C + O + K log K) for K customers with orders.</p>`,
      followUps: ['Include customers with zero orders (GroupJoin).', 'The same query against EF Core — which parts run in SQL?']
    }
  });

  practice.push({
    title: 'Running Sum Iterator',
    level: 'Medium', tags: ['yield return', 'iterators', 'extension methods'], companies: ['Bloomberg', 'Microsoft', 'Citadel'],
    statement: `<p>Write a lazy, reusable iterator <code>static IEnumerable&lt;TAcc&gt; Scan&lt;T, TAcc&gt;(IEnumerable&lt;T&gt; source, TAcc seed, Func&lt;TAcc, T, TAcc&gt; step)</code> that yields every intermediate accumulator (not the seed). Use it to implement <code>public static long[] RunningSum(int[] nums)</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; values are any int (prefix sums need long).`,
    example: `<p>[1, 2, 3, 4] → [1, 3, 6, 10].</p>`,
    brute: { why: `<p>Recomputing each prefix with <code>Take(i + 1).Sum()</code> is O(n²). Aggregate only returns the final value, not the intermediate ones — hence a custom Scan.</p>`, code: `static long[] Quadratic(int[] nums) =>
    Enumerable.Range(0, nums.Length).Select(i => nums.Take(i + 1).Sum(x => (long)x)).ToArray();` },
    mcq: { q: 'What does Aggregate lack that Scan provides?', options: ['A seed', 'The intermediate results — Aggregate returns only the final accumulator', 'Laziness is the same', 'Generic types'], answer: 1, explain: 'Scan (a.k.a. prefix fold) yields each step; LINQ has no built-in Scan.' },
    hints: [`<p>Hint 1: <code>var acc = seed; foreach (var x in source) { acc = step(acc, x); yield return acc; }</code></p>`, `<p>Hint 2: <code>Scan(nums, 0L, (acc, x) =&gt; acc + x).ToArray()</code></p>`, `<p>Hint 3: The seed's type (0L) decides the accumulator type — use long.</p>`],
    tests: { sig: 'int[] -> long[]', fn: 'RunningSum', cases: [
      [[[1, 2, 3, 4]], [1, 3, 6, 10]], [[[]], []], [[[5]], [5]], [[[-1, 1, -1, 1]], [-1, 0, -1, 0]],
      [[[2147483647, 2147483647, 2]], [2147483647, 4294967294, 4294967296]], [[[0, 0, 0]], [0, 0, 0]],
      [[{ $rep: 1, n: 100000 }], { $range: [1, 100001] }]
    ] },
    solution: {
      approach: `<p>A generic prefix-fold iterator: one pass, lazy, reusable for running max, running product and more.</p>`,
      code: `public class Solution
{
    static IEnumerable<TAcc> Scan<T, TAcc>(IEnumerable<T> source, TAcc seed, Func<TAcc, T, TAcc> step)
    {
        var acc = seed;
        foreach (var x in source)
        {
            acc = step(acc, x);
            yield return acc;
        }
    }

    public static long[] RunningSum(int[] nums) => Scan(nums, 0L, (acc, x) => acc + x).ToArray();
}`,
      complexity: `<p>O(n) time, O(1) iterator state.</p>`,
      followUps: ['Running maximum with the same Scan.', 'Make Scan an extension method and validate arguments eagerly.']
    }
  });

  practice.push({
    title: 'Chunk Sums',
    level: 'Medium', tags: ['Chunk', 'LINQ', 'batching'], companies: ['Microsoft', 'Databricks', 'Snowflake'],
    statement: `<p>Split <code>nums</code> into consecutive batches of <code>size</code> (the last may be shorter) and return each batch's sum as a long. Implement <code>public static long[] ChunkSums(int[] nums, int size)</code> using <code>Chunk</code> (.NET 6+).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; 1 ≤ size ≤ 10<sup>5</sup>.`,
    example: `<p>([1, 2, 3, 4, 5], 2) → [3, 7, 5].</p>`,
    brute: { why: `<p>Index arithmetic with Skip/Take per batch: <code>Skip(i * size)</code> rescans from the start on non-list sources, O(n²/size).</p>`, code: `static long[] SkipTake(int[] nums, int size) =>
    Enumerable.Range(0, (nums.Length + size - 1) / size)
              .Select(i => nums.Skip(i * size).Take(size).Sum(x => (long)x)).ToArray();` },
    mcq: { q: 'What does Chunk(3) yield for 7 items?', options: ['Two arrays of 3 and one is dropped', 'Arrays of 3, 3 and 1', 'Seven arrays of 1', 'It throws'], answer: 1, explain: 'The final chunk holds the remainder.' },
    hints: [`<p>Hint 1: <code>nums.Chunk(size)</code> yields <code>int[]</code> batches.</p>`, `<p>Hint 2: <code>.Select(c =&gt; c.Sum(x =&gt; (long)x))</code></p>`, `<p>Hint 3: Empty input gives no chunks, so the result is an empty array.</p>`],
    tests: { sig: 'int[] int -> long[]', fn: 'ChunkSums', cases: [
      [[[1, 2, 3, 4, 5], 2], [3, 7, 5]], [[[], 3], []], [[[7], 1], [7]], [[[1, 2, 3], 5], [6]],
      [[[2147483647, 2147483647, 1], 2], [4294967294, 1]], [[[-1, -2, -3, -4], 4], [-10]], [[{ $rep: 2, n: 100000 }, 1000], { $rep: 2000, n: 100 }]
    ] },
    solution: {
      approach: `<p>Chunk handles the batching and the short last batch; Sum over long avoids overflow.</p>`,
      code: `public class Solution
{
    public static long[] ChunkSums(int[] nums, int size) =>
        nums.Chunk(size).Select(c => c.Sum(x => (long)x)).ToArray();
}`,
      complexity: `<p>O(n) time; each chunk allocates an array of up to size items.</p>`,
      followUps: ['Batch database inserts of 1000 rows with Chunk.', 'Write your own Chunk with yield and a reusable buffer — what is the risk of reusing it?']
    }
  });

  practice.push({
    title: 'RPN Calculator with a Delegate Table',
    level: 'Medium', tags: ['Func', 'Dictionary of delegates', 'Stack'], companies: ['Amazon', 'LinkedIn', 'Microsoft'],
    statement: `<p>Evaluate a Reverse Polish Notation expression with operators <code>+ - * /</code> (division truncates toward zero). Implement <code>public static long EvalRpn(string[] tokens)</code> using a <code>Dictionary&lt;string, Func&lt;long, long, long&gt;&gt;</code> for the operators and a <code>Stack&lt;long&gt;</code> for operands.</p>`,
    constraints: `1 ≤ tokens ≤ 10<sup>4</sup>; the expression is valid; no division by zero; operands are ints; results fit in long.`,
    example: `<p>["2", "1", "+", "3", "*"] → (2 + 1) × 3 = <b>9</b>. ["−7", "2", "/"] → <b>−3</b>.</p>`,
    brute: { why: `<p>A switch statement on the operator works fine; the delegate table makes adding an operator (%, ^, max) a one-line data change and keeps the evaluation loop free of operator details.</p>`, code: `static long ApplySwitch(string op, long a, long b) => op switch { "+" => a + b, "-" => a - b, "*" => a * b, _ => a / b };` },
    mcq: { q: 'For "a b -", which popped value is the left operand?', options: ['The first popped', 'The second popped (a was pushed earlier, so it is below b)', 'Either', 'Neither'], answer: 1, explain: 'Pop b first, then a, then compute a − b.' },
    hints: [`<p>Hint 1: <code>var ops = new Dictionary&lt;string, Func&lt;long, long, long&gt;&gt; { ["+"] = (a, b) =&gt; a + b, … };</code></p>`, `<p>Hint 2: <code>if (ops.TryGetValue(t, out var f)) { var b = st.Pop(); var a = st.Pop(); st.Push(f(a, b)); } else st.Push(long.Parse(t));</code></p>`, `<p>Hint 3: C# integer division already truncates toward zero.</p>`],
    tests: { sig: 'string[] -> long', fn: 'EvalRpn', cases: [
      [[["2", "1", "+", "3", "*"]], 9], [[["4", "13", "5", "/", "+"]], 6],
      [[["10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"]], 22],
      [[["5"]], 5], [[["-7", "2", "/"]], -3], [[["2147483647", "2", "*"]], 4294967294], [[["1", "2", "-"]], -1]
    ] },
    solution: {
      approach: `<p>Operators are data: a dictionary from symbol to Func. The loop pushes numbers and applies functions.</p>`,
      code: `public class Solution
{
    private static readonly Dictionary<string, Func<long, long, long>> Ops = new()
    {
        ["+"] = static (a, b) => a + b,
        ["-"] = static (a, b) => a - b,
        ["*"] = static (a, b) => a * b,
        ["/"] = static (a, b) => a / b      // truncates toward zero
    };

    public static long EvalRpn(string[] tokens)
    {
        var stack = new Stack<long>();
        foreach (var t in tokens)
        {
            if (Ops.TryGetValue(t, out var op))
            {
                long b = stack.Pop(), a = stack.Pop();
                stack.Push(op(a, b));
            }
            else stack.Push(long.Parse(t));
        }
        return stack.Pop();
    }
}`,
      complexity: `<p>O(n) time, O(n) stack.</p>`,
      followUps: ['Add unary negation and exponentiation to the table.', 'Compile the expression once into a Func&lt;long&gt; and evaluate it many times.']
    }
  });

  practice.push({
    title: 'Thermostat Events',
    level: 'Medium', tags: ['events', 'state', 'EventHandler'], companies: ['Honeywell', 'Siemens', 'Bosch'],
    statement: `<p>A <code>Sensor</code> starts in the Normal state and exposes three events: <code>TooHot</code>, <code>TooCold</code> and <code>BackToNormal</code> (each an <code>EventHandler&lt;int&gt;</code> carrying the reading). For each reading: above <code>high</code> → Hot, below <code>low</code> → Cold, otherwise Normal; an event is raised <b>only when the state changes</b>. Subscribers log <code>hot R</code>, <code>cold R</code> or <code>normal R</code>. Implement <code>public static string[] Thermostat(int[] readings, int low, int high)</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; low ≤ high; bounds are inclusive for Normal.`,
    example: `<p>([20, 31, 32, 25, 10, 9, 20], 15, 30) → ["hot 31", "normal 25", "cold 10", "normal 20"] — 32 and 9 are repeats of the current state.</p>`,
    brute: { why: `<p>Logging every reading's classification floods subscribers with duplicates. The publisher should track state and emit only transitions.</p>`, code: `static string Classify(int r, int low, int high) => r > high ? "hot" : r < low ? "cold" : "normal";   // no memory of the previous state` },
    mcq: { q: 'Who should remember the previous state?', options: ['Each subscriber', 'The sensor (publisher), so it raises events only on transitions', 'Thermostat()', 'Nobody'], answer: 1, explain: 'Edge-triggered events keep subscribers simple.' },
    hints: [`<p>Hint 1: <code>enum Zone { Normal, Hot, Cold }</code> and a private field holding the current zone.</p>`, `<p>Hint 2: Compute the new zone; if it differs, raise the matching event via <code>?.Invoke(this, reading)</code>.</p>`, `<p>Hint 3: Subscribe three lambdas that append to the output list.</p>`],
    tests: { sig: 'int[] int int -> string[]', fn: 'Thermostat', cases: [
      [[[20, 31, 32, 25, 10, 9, 20], 15, 30], ["hot 31", "normal 25", "cold 10", "normal 20"]],
      [[[], 0, 10], []], [[[5], 0, 10], []], [[[11, 11, -1, -1], 0, 10], ["hot 11", "cold -1"]],
      [[[10, 0], 0, 10], []], [[[-5, 50, -5], 0, 10], ["cold -5", "hot 50", "cold -5"]],
      [[[2147483647, -2147483648], 0, 0], ["hot 2147483647", "cold -2147483648"]]
    ] },
    solution: {
      approach: `<p>The sensor holds its zone and raises one of three events only on a zone change.</p>`,
      code: `public enum Zone { Normal, Hot, Cold }

public sealed class Sensor(int low, int high)
{
    private Zone _zone = Zone.Normal;
    public event EventHandler<int>? TooHot;
    public event EventHandler<int>? TooCold;
    public event EventHandler<int>? BackToNormal;

    public void Report(int reading)
    {
        var zone = reading > high ? Zone.Hot : reading < low ? Zone.Cold : Zone.Normal;
        if (zone == _zone) return;                       // no transition, no event
        _zone = zone;
        var handler = zone switch { Zone.Hot => TooHot, Zone.Cold => TooCold, _ => BackToNormal };
        handler?.Invoke(this, reading);
    }
}

public class Solution
{
    public static string[] Thermostat(int[] readings, int low, int high)
    {
        var log = new List<string>();
        var sensor = new Sensor(low, high);
        sensor.TooHot += (_, r) => log.Add($"hot {r}");
        sensor.TooCold += (_, r) => log.Add($"cold {r}");
        sensor.BackToNormal += (_, r) => log.Add($"normal {r}");
        foreach (var r in readings) sensor.Report(r);
        return log.ToArray();
    }
}`,
      complexity: `<p>O(n) time; O(1) state.</p>`,
      followUps: ['Add hysteresis: switch back to Normal only 2 degrees inside the band.', 'Replace the three events with one event carrying a ZoneChanged record. Pros and cons?']
    }
  });

  practice.push({
    title: 'Memoized Fibonacci with a Closure',
    level: 'Medium', tags: ['closures', 'Func', 'memoization', 'recursion'], companies: ['Google', 'Microsoft', 'Adobe'],
    statement: `<p>Write <code>static Func&lt;TIn, TOut&gt; Memoize&lt;TIn, TOut&gt;(Func&lt;TIn, TOut&gt; f) where TIn : notnull</code> that caches results in a dictionary captured by the returned lambda. Build a <b>recursive</b> memoized Fibonacci from it (the recursive calls must go through the memoized function), and implement <code>public static long[] FibMemo(int[] queries)</code> answering each query with the same memoized function.</p>`,
    constraints: `0 ≤ queries ≤ 10<sup>4</sup>; 0 ≤ n ≤ 90.`,
    example: `<p>[0, 1, 2, 10] → [0, 1, 1, 55]. Plain recursion for n = 90 would make ~10<sup>18</sup> calls; memoized it makes 91.</p>`,
    brute: { why: `<p>Naive recursion <code>F(n) = F(n−1) + F(n−2)</code> recomputes the same subproblems exponentially many times.</p>`, code: `static long Naive(int n) => n < 2 ? n : Naive(n - 1) + Naive(n - 2);   // O(1.6^n)` },
    mcq: { q: 'Why must the recursive calls use the memoized delegate, not the raw lambda?', options: ['They must not', 'Otherwise only the top-level call is cached and the recursion is still exponential', 'For thread safety', 'Because lambdas cannot recurse'], answer: 1, explain: 'The lambda captures the variable holding the memoized function, so inner calls hit the cache.' },
    hints: [`<p>Hint 1: <code>var cache = new Dictionary&lt;TIn, TOut&gt;(); return x =&gt; cache.TryGetValue(x, out var v) ? v : cache[x] = f(x);</code></p>`, `<p>Hint 2: Declare first, assign after: <code>Func&lt;int, long&gt; fib = null!; fib = Memoize&lt;int, long&gt;(n =&gt; n &lt; 2 ? n : fib(n - 1) + fib(n - 2));</code></p>`, `<p>Hint 3: Recursion depth is at most 91 — safe for the 1 MB stack.</p>`],
    tests: { sig: 'int[] -> long[]', fn: 'FibMemo', cases: [
      [[[0, 1, 2, 10]], [0, 1, 1, 55]], [[[]], []], [[[90]], ["2880067194370816120"]], [[[50, 50]], [12586269025, 12586269025]],
      [[[5, 3]], [5, 2]], [[[20]], [6765]], [[[1, 0]], [1, 0]]
    ] },
    solution: {
      approach: `<p>A generic memoizer captures a private dictionary. The Fibonacci lambda captures the variable <code>fib</code>, which by the time it runs holds the memoized wrapper — so every recursive call is cached.</p>`,
      code: `public class Solution
{
    static Func<TIn, TOut> Memoize<TIn, TOut>(Func<TIn, TOut> f) where TIn : notnull
    {
        var cache = new Dictionary<TIn, TOut>();             // captured, private to this wrapper
        return x =>
        {
            if (cache.TryGetValue(x, out var v)) return v;
            v = f(x);
            cache[x] = v;
            return v;
        };
    }

    public static long[] FibMemo(int[] queries)
    {
        Func<int, long> fib = null!;
        fib = Memoize<int, long>(n => n < 2 ? n : fib(n - 1) + fib(n - 2));   // recursion through the cache
        return queries.Select(q => fib(q)).ToArray();
    }
}`,
      complexity: `<p>O(max n) total work across all queries plus O(1) per cached query; O(max n) memory.</p>`,
      followUps: ['Make Memoize thread-safe with ConcurrentDictionary.GetOrAdd — what subtle issue remains with recursive factories?', 'Add an LRU bound to the cache.']
    }
  });

  practice.push({
    title: 'Top N per Department',
    level: 'Hard', tags: ['GroupBy', 'SelectMany', 'ordering'], companies: ['Amazon', 'Meta', 'Workday'],
    statement: `<p>Rows are <code>"name,dept,salary"</code>. For each department (departments sorted ordinal), output its top n employees by salary descending, ties by name ascending (ordinal), as <code>"dept:name:salary"</code>. Implement <code>public static string[] TopPerDept(string[] rows, int n)</code> as a single LINQ pipeline.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>5</sup>; 0 ≤ n; names unique.`,
    example: `<p>(["a,x,10", "b,x,30", "c,y,20", "d,x,20"], 2) → ["x:b:30", "x:d:20", "y:c:20"].</p>`,
    brute: { why: `<p>For each distinct department, filter the whole list and sort: O(D · R log R). GroupBy partitions once.</p>`, code: `static IEnumerable<string[]> ForDept(string[][] rows, string dept, int n) =>
    rows.Where(r => r[1] == dept).OrderByDescending(r => int.Parse(r[2])).Take(n);   // repeated full scans` },
    mcq: { q: 'Which operator flattens "a sequence of per-department lists" into one result sequence?', options: ['Select', 'SelectMany', 'Concat', 'Zip'], answer: 1, explain: 'SelectMany maps each group to a sequence and concatenates them.' },
    hints: [`<p>Hint 1: <code>GroupBy(e =&gt; e.Dept).OrderBy(g =&gt; g.Key, StringComparer.Ordinal)</code></p>`, `<p>Hint 2: <code>.SelectMany(g =&gt; g.OrderByDescending(e =&gt; e.Salary).ThenBy(e =&gt; e.Name, StringComparer.Ordinal).Take(n))</code></p>`, `<p>Hint 3: Format with the department from each element.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'TopPerDept', cases: [
      [[["a,x,10", "b,x,30", "c,y,20", "d,x,20"], 2], ["x:b:30", "x:d:20", "y:c:20"]],
      [[[], 1], []],
      [[["a,x,5", "b,x,5"], 1], ["x:a:5"]],
      [[["a,z,1", "b,y,2"], 5], ["y:b:2", "z:a:1"]],
      [[["a,x,1"], 0], []],
      [[["p,D,3", "q,d,4"], 1], ["D:p:3", "d:q:4"]],
      [[["m,x,-1", "n,x,2147483647", "o,x,0"], 2], ["x:n:2147483647", "x:o:0"]]
    ] },
    solution: {
      approach: `<p>Parse, group by department, order groups, and within each group order and take n; SelectMany flattens.</p>`,
      code: `public class Solution
{
    public static string[] TopPerDept(string[] rows, int n) =>
        rows.Select(r => r.Split(','))
            .Select(p => (Name: p[0], Dept: p[1], Salary: int.Parse(p[2])))
            .GroupBy(e => e.Dept)
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .SelectMany(g => g.OrderByDescending(e => e.Salary)
                              .ThenBy(e => e.Name, StringComparer.Ordinal)
                              .Take(n))
            .Select(e => $"{e.Dept}:{e.Name}:{e.Salary}")
            .ToArray();
}`,
      complexity: `<p>O(R log R) overall (sorting within groups); O(R) memory for the grouping.</p>`,
      followUps: ['Use a size-n heap per group for huge groups and small n.', 'Write it as SQL with ROW_NUMBER() OVER (PARTITION BY dept …) and compare.']
    }
  });

  practice.push({
    title: 'Flatten a Nested List Lazily',
    level: 'Hard', tags: ['iterators', 'yield return', 'explicit stack', 'parsing'], companies: ['Google', 'LinkedIn', 'Airbnb'],
    statement: `<p>The input is a nested list such as <code>"[1,[2,[3,4]],5]"</code> (integers, commas, brackets, no spaces). Parse it into a tree and write a <b>lazy</b> iterator <code>IEnumerable&lt;int&gt; Walk(List&lt;object&gt; root)</code> that yields the integers left to right using <code>yield return</code> and an <b>explicit stack</b> of enumerators (no recursion — nesting can be 5000 deep). Implement <code>public static int[] Flatten(string nested)</code>.</p>`,
    constraints: `1 ≤ |nested| ≤ 2·10<sup>4</sup>; nesting depth ≤ 10<sup>4</sup>; values fit in int.`,
    example: `<p>"[1,[2,[3,4]],5]" → [1, 2, 3, 4, 5]. "[[],[[]]]" → [].</p>`,
    brute: { why: `<p>A recursive iterator (<code>foreach (var x in Walk(child)) yield return x;</code>) is elegant but costs O(depth) per element (each value bubbles up through every nested iterator) and a 5000-deep nest risks a stack overflow when parsing recursively. An explicit stack keeps it O(total size).</p>`, code: `static IEnumerable<int> WalkRecursive(List<object> node)
{
    foreach (var item in node)
        if (item is int v) yield return v;
        else foreach (var x in WalkRecursive((List<object>)item)) yield return x;   // O(depth) per value
}` },
    mcq: { q: 'Why is a nested recursive iterator O(depth) per yielded value?', options: ['It is not', 'Each value is passed up through every level\'s MoveNext/Current, one iterator object per level', 'Because of boxing', 'Because List is slow'], answer: 1, explain: 'A chain of d nested iterators means d MoveNext calls per element.' },
    hints: [`<p>Hint 1: Parse iteratively: '[' pushes a new List onto a stack (and adds it to its parent), ']' pops, digits and '-' accumulate a number.</p>`, `<p>Hint 2: Walk: <code>var stack = new Stack&lt;IEnumerator&lt;object&gt;&gt;(); stack.Push(root.GetEnumerator());</code> then loop: if the top has a next item, yield an int or push the child's enumerator; otherwise pop.</p>`, `<p>Hint 3: Box ints as object in the tree; pattern-match with <code>is int v</code>.</p>`],
    tests: { sig: 'string -> int[]', fn: 'Flatten', cases: [
      [["[1,[2,[3,4]],5]"], [1, 2, 3, 4, 5]], [["[]"], []], [["[[],[[]]]"], []], [["[-1,[-22],333]"], [-1, -22, 333]],
      [["[[1],[2],[3]]"], [1, 2, 3]], [[{ $concat: [{ $rep: "[", n: 5000 }, "1", { $rep: "]", n: 5000 }] }], [1]],
      [["[2147483647,[-2147483648]]"], [2147483647, -2147483648]]
    ] },
    solution: {
      approach: `<p>An iterative parser builds nested <code>List&lt;object&gt;</code>s. The iterator keeps a stack of enumerators — one per open list — so each element is touched O(1) times and depth never touches the call stack.</p>`,
      code: `public class Solution
{
    static List<object> Parse(string s)
    {
        var stack = new Stack<List<object>>();
        List<object>? root = null;
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            if (c == '[')
            {
                var list = new List<object>();
                if (stack.Count > 0) stack.Peek().Add(list); else root = list;
                stack.Push(list);
            }
            else if (c == ']') stack.Pop();
            else if (c == '-' || char.IsDigit(c))
            {
                int j = i + 1;
                while (j < s.Length && char.IsDigit(s[j])) j++;
                stack.Peek().Add(int.Parse(s.AsSpan(i, j - i)));
                i = j - 1;
            }
        }
        return root!;
    }

    static IEnumerable<int> Walk(List<object> root)
    {
        var stack = new Stack<IEnumerator<object>>();
        stack.Push(root.GetEnumerator());
        while (stack.Count > 0)
        {
            var top = stack.Peek();
            if (!top.MoveNext()) { stack.Pop(); continue; }
            if (top.Current is int v) yield return v;                    // lazy: pause here
            else stack.Push(((List<object>)top.Current).GetEnumerator()); // descend without recursion
        }
    }

    public static int[] Flatten(string nested) => Walk(Parse(nested)).ToArray();
}`,
      complexity: `<p>O(|nested|) time and O(depth) explicit stack; the iterator is lazy, so taking only the first k values costs O(k + depth).</p>`,
      followUps: ['Implement it as a class with HasNext/Next (the classic interview interface).', 'Make the parser itself lazy so values stream while the string is read.']
    }
  });

  practice.push({
    title: 'Event Bus with Topics',
    level: 'Hard', tags: ['delegates', 'multicast', 'Dictionary', 'design'], companies: ['Microsoft', 'Uber', 'Confluent'],
    statement: `<p>Design <code>EventBus</code>: <code>int Subscribe(string topic)</code> registers a new subscriber (ids 1, 2, 3, … in call order) whose handler records the last message it received; <code>bool Unsubscribe(int id)</code> removes it (false if unknown or already removed); <code>int Publish(string topic, string msg)</code> delivers to every current subscriber of the topic and returns how many received it; <code>string Last(int id)</code> returns that subscriber's last message, or "" if none. Store one multicast <code>Action&lt;string&gt;</code> per topic and use <code>+=</code>/<code>-=</code> with the subscriber's own delegate.</p>`,
    constraints: `Up to 10<sup>5</sup> calls.`,
    example: `<p>Subscribe("news") → 1, Subscribe("news") → 2, Publish("news", "hi") → 2, Unsubscribe(1) → true, Publish("news", "bye") → 1, Last(1) → "hi", Last(2) → "bye".</p>`,
    brute: { why: `<p>A list of (id, topic) pairs scanned on every publish is O(subscribers). The multicast delegate per topic does exactly the topic's handlers; the cost is copying the invocation list on subscribe/unsubscribe.</p>`, code: `sealed class ListBus
{
    private readonly List<(int Id, string Topic)> _subs = new();
    public int Publish(string topic) => _subs.Count(s => s.Topic == topic);   // scans everyone
}` },
    mcq: { q: 'How does Publish know how many subscribers received the message?', options: ['Count Last values', '<code>handler?.GetInvocationList().Length ?? 0</code> before invoking (or count inside the handlers)', 'It cannot', 'Dictionary.Count'], answer: 1, explain: 'The invocation list holds one entry per subscription on that topic.' },
    hints: [`<p>Hint 1: <code>Dictionary&lt;string, Action&lt;string&gt;?&gt; _topics</code>; <code>Dictionary&lt;int, (string Topic, Action&lt;string&gt; Handler)&gt; _subs</code>; <code>Dictionary&lt;int, string&gt; _last</code>.</p>`, `<p>Hint 2: In Subscribe, create the handler as a lambda capturing the new id: <code>Action&lt;string&gt; h = m =&gt; _last[id] = m;</code> and do <code>_topics[topic] = _topics.GetValueOrDefault(topic) + h;</code></p>`, `<p>Hint 3: Unsubscribe: <code>_topics[topic] -= h</code> using the stored delegate, then remove the id.</p>`],
    tests: { cls: 'EventBus', sigs: { EventBus: '', subscribe: 'string -> int', unsubscribe: 'int -> bool', publish: 'string string -> int', last: 'int -> string' }, cases: [
      { ops: ['EventBus', 'subscribe', 'subscribe', 'subscribe', 'publish', 'last', 'last', 'unsubscribe', 'publish', 'last', 'last'], args: [[], ['news'], ['news'], ['sport'], ['news', 'hi'], [1], [3], [1], ['news', 'bye'], [1], [2]], out: [null, 1, 2, 3, 2, 'hi', '', true, 1, 'hi', 'bye'] },
      { ops: ['EventBus', 'publish', 'unsubscribe'], args: [[], ['x', 'm'], [5]], out: [null, 0, false] },
      { ops: ['EventBus', 'subscribe', 'unsubscribe', 'unsubscribe', 'publish', 'last'], args: [[], ['a'], [1], [1], ['a', 'z'], [1]], out: [null, 1, true, false, 0, ''] },
      { ops: ['EventBus', 'subscribe', 'subscribe', 'publish', 'publish', 'publish', 'last', 'last'], args: [[], ['a'], ['b'], ['a', '1'], ['b', '2'], ['c', '3'], [1], [2]], out: [null, 1, 2, 1, 1, 0, '1', '2'] },
      { ops: ['EventBus', 'subscribe', 'publish', 'publish', 'last'], args: [[], ['t'], ['t', 'x'], ['t', 'y'], [1]], out: [null, 1, 1, 1, 'y'] },
      { ops: ['EventBus', 'subscribe', 'subscribe', 'unsubscribe', 'publish', 'last', 'last'], args: [[], ['t'], ['t'], [2], ['t', 'q'], [2], [9]], out: [null, 1, 2, true, 1, '', ''] }
    ] },
    solution: {
      approach: `<p>One multicast delegate per topic. Each subscription gets its own delegate (a lambda capturing its id), stored so it can be removed exactly with <code>-=</code>.</p>`,
      code: `public sealed class EventBus
{
    private readonly Dictionary<string, Action<string>?> _topics = new();
    private readonly Dictionary<int, (string Topic, Action<string> Handler)> _subs = new();
    private readonly Dictionary<int, string> _last = new();
    private int _nextId = 1;

    public int Subscribe(string topic)
    {
        int id = _nextId++;
        Action<string> handler = msg => _last[id] = msg;         // captures this subscriber's id
        _topics[topic] = _topics.GetValueOrDefault(topic) + handler;
        _subs[id] = (topic, handler);
        return id;
    }

    public bool Unsubscribe(int id)
    {
        if (!_subs.Remove(id, out var sub)) return false;
        _topics[sub.Topic] -= sub.Handler;                        // same instance -> removed
        return true;
    }

    public int Publish(string topic, string msg)
    {
        var handlers = _topics.GetValueOrDefault(topic);
        if (handlers is null) return 0;
        handlers(msg);
        return handlers.GetInvocationList().Length;
    }

    public string Last(int id) => _last.GetValueOrDefault(id, "");
}`,
      complexity: `<p>Subscribe/Unsubscribe O(h) to copy a topic's invocation list; Publish O(h); Last O(1).</p>`,
      followUps: ['Isolate failing handlers so one exception does not stop delivery.', 'Support wildcard topics like "news.*".']
    }
  });

  practice.push({
    title: 'Longest Daily Streak per User',
    level: 'Hard', tags: ['GroupBy', 'Distinct', 'Order', 'Aggregate'], companies: ['Duolingo', 'Meta', 'Spotify'],
    statement: `<p>Each row is <code>"user day"</code> where day is an int (duplicates possible, any order). For each user compute the longest run of consecutive days. Return <code>"user:streak"</code> sorted by streak descending, then user ascending (ordinal). Implement <code>public static string[] LongestStreaks(string[] rows)</code>.</p>`,
    constraints: `0 ≤ rows ≤ 10<sup>5</sup>; days are any int.`,
    example: `<p>["a 1", "a 2", "a 3", "b 5", "b 7"] → ["a:3", "b:1"]. ["u 5", "u 3", "u 4", "u 1"] → days {1, 3, 4, 5} → ["u:3"].</p>`,
    brute: { why: `<p>For each user and each day, walk forward while day+1 exists using List.Contains: O(d²) per user. Sort-and-scan per group is O(d log d).</p>`, code: `static int StreakSlow(List<int> days)
{
    int best = 0;
    foreach (var d in days) { int len = 1; while (days.Contains(d + len)) len++; best = Math.Max(best, len); }
    return best;
}` },
    mcq: { q: 'After grouping by user, what makes the streak computation simple?', options: ['Sorting the distinct days, then one pass counting consecutive neighbours', 'Summing the days', 'Counting the group', 'Taking Max − Min'], answer: 0, explain: 'Distinct + Order gives a sorted list where a run is a stretch with step 1.' },
    hints: [`<p>Hint 1: <code>GroupBy(r =&gt; r.User, r =&gt; r.Day)</code>.</p>`, `<p>Hint 2: For each group: <code>g.Distinct().Order()</code>, then scan with a current-run counter (compare as long: <code>(long)d == (long)prev + 1</code> to dodge overflow at int.MaxValue).</p>`, `<p>Hint 3: Order the results with OrderByDescending + ThenBy(ordinal).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'LongestStreaks', cases: [
      [[["a 1", "a 2", "a 3", "b 5", "b 7"]], ["a:3", "b:1"]], [[[]], []], [[["x 10", "x 10", "x 11"]], ["x:2"]],
      [[["u 5", "u 3", "u 4", "u 1"]], ["u:3"]], [[["b 1", "a 1"]], ["a:1", "b:1"]],
      [[["p -2", "p -1", "p 0", "p 2", "q 100", "q 101"]], ["p:3", "q:2"]], [[["m 2147483647", "m 2147483646"]], ["m:2"]]
    ] },
    solution: {
      approach: `<p>Group days by user, sort each user's distinct days, and fold over them to find the longest step-1 run. A local function keeps the scan readable.</p>`,
      code: `public class Solution
{
    public static string[] LongestStreaks(string[] rows)
    {
        static int Longest(IEnumerable<int> days)
        {
            int best = 0, run = 0;
            long prev = long.MinValue;
            foreach (int d in days.Distinct().Order())
            {
                run = d == prev + 1 ? run + 1 : 1;       // long arithmetic: no overflow at int.MaxValue
                best = Math.Max(best, run);
                prev = d;
            }
            return best;
        }

        return rows.Select(r => r.Split(' '))
                   .GroupBy(p => p[0], p => int.Parse(p[1]))
                   .Select(g => (User: g.Key, Streak: Longest(g)))
                   .OrderByDescending(x => x.Streak)
                   .ThenBy(x => x.User, StringComparer.Ordinal)
                   .Select(x => $"{x.User}:{x.Streak}")
                   .ToArray();
    }
}`,
      complexity: `<p>O(R log R) time overall; O(R) memory.</p>`,
      followUps: ['Return the streak start and end days too.', 'Current streak ending today instead of the longest ever.']
    }
  });

  /* ============================ QUIZ ============================ */
  quiz.push(
    { q: 'A multicast <code>Func&lt;int&gt;</code> has three handlers returning 1, 2 and 3. Invoking it returns…', options: ['6', '1', '3 — only the last handler\'s result is returned', 'an array [1, 2, 3]'], answer: 2, explain: 'All handlers run; earlier return values are discarded.' },
    { q: 'In <code>Func&lt;string, int, bool&gt;</code>, the return type is…', options: ['string', 'int', 'bool', 'void'], answer: 2, explain: 'The last type argument of Func is the result type.' },
    { q: '<code>for (int i = 0; i &lt; 3; i++) list.Add(() =&gt; i);</code> — calling each lambda prints…', options: ['0 1 2', '3 3 3', '2 2 2', 'It does not compile'], answer: 1, explain: 'All lambdas capture the single loop variable, which is 3 after the loop.' },
    { q: 'The same loop written as <code>foreach (var i in new[] {0, 1, 2})</code> prints…', options: ['0 1 2', '2 2 2', '3 3 3', 'random order'], answer: 0, explain: 'Since C# 5 each foreach iteration has its own variable.' },
    { q: 'What does the <code>event</code> keyword prevent outside the declaring class?', options: ['Subscribing', 'Assigning with = and invoking the delegate', 'Unsubscribing', 'Using lambdas as handlers'], answer: 1, explain: 'Outsiders may only use += and -=.' },
    { q: '<code>d -= x =&gt; Console.WriteLine(x);</code> after subscribing with an identical-looking lambda…', options: ['Removes it', 'Removes nothing: the two lambdas are different methods/delegates', 'Throws', 'Removes all handlers'], answer: 1, explain: 'Store the delegate in a variable to unsubscribe it.' },
    { q: 'When does <code>var q = list.Where(x =&gt; x &gt; 2);</code> run the lambda?', options: ['Immediately', 'When q is enumerated (foreach, ToList, Count…)', 'When the list changes', 'Never'], answer: 1, explain: 'Where is deferred: it only runs when the result is enumerated.' },
    { q: 'You call <code>q.Count()</code> and then <code>foreach (var x in q)</code> on a deferred query. How many times does the filter run per element?', options: ['Once', 'Twice', 'Zero', 'It depends on the GC'], answer: 1, explain: 'Each enumeration re-runs the pipeline. Materialise with ToList if you need several passes.' },
    { q: 'Which operator must buffer the whole source before yielding anything?', options: ['Where', 'Select', 'OrderBy', 'Take'], answer: 2, explain: 'Sorting needs every element; it is deferred but not streaming.' },
    { q: 'An iterator method validates its argument with <code>ArgumentNullException.ThrowIfNull</code> at the top of the body. When is the exception thrown?', options: ['When the method is called', 'On the first MoveNext (first enumeration)', 'Never', 'At compile time'], answer: 1, explain: 'Iterator bodies run lazily. Validate in a wrapper method and return a local iterator.' },
    { q: 'Which join keeps outer elements that have no match?', options: ['Join', 'GroupJoin', 'Zip', 'Intersect'], answer: 1, explain: 'GroupJoin yields every outer element with a possibly empty group.' },
    { q: '<code>new[] { int.MaxValue, 1 }.Sum()</code>…', options: ['returns −2147483648', 'throws OverflowException', 'returns 2147483648', 'returns a long'], answer: 1, explain: 'Enumerable.Sum over int is checked.' },
    { q: 'Which is the cheapest way to ask whether a sequence has any element matching a condition?', options: ['Count(cond) &gt; 0', 'Any(cond)', 'Where(cond).ToList().Count &gt; 0', 'First(cond) != null'], answer: 1, explain: 'Any stops at the first match.' },
    { q: 'What do <code>GroupBy</code> and <code>ToLookup</code> differ in?', options: ['Nothing', 'GroupBy is deferred and re-runs on each enumeration; ToLookup executes immediately and supports indexing by key', 'ToLookup is deferred', 'GroupBy cannot take a comparer'], answer: 1, explain: 'Use ToLookup when you will look up groups repeatedly.' }
  );

  /* ============================ INTERVIEW ============================ */
  interview.push(
    { q: 'What is a delegate in C#, and how is it different from an interface with one method?', level: 'B', a: `<p>A delegate is a type-safe reference to a method (plus its target object for instance methods). It is a class deriving from <code>MulticastDelegate</code> with an <code>Invoke</code> method matching the declared signature. Compared with a single-method interface: delegates can be created from any compatible method or lambda without declaring a class, can be <b>multicast</b> (combined with +=), and capture state through closures. Interfaces are better when the behaviour has several related members, needs a name in the domain, or is resolved through dependency injection.</p>`, followUps: ['What happens when a multicast delegate returns values?', 'How are delegates compared for removal?'] },
    { q: 'Explain Func, Action and Predicate. When would you still declare a custom delegate type?', level: 'B', a: `<p><code>Action&lt;…&gt;</code> is for methods returning void, <code>Func&lt;…, TResult&gt;</code> for methods returning a value (last type argument), <code>Predicate&lt;T&gt;</code> is T → bool (used by List/Array methods). They cover almost all needs. Declare a custom delegate when you need <code>ref</code>/<code>out</code>/<code>in</code> parameters or <code>params</code>, when a name documents intent in a public API (<code>Comparison&lt;T&gt;</code>, <code>ElapsedEventHandler</code>), or for events following an established pattern.</p>`, followUps: ['Are Predicate&lt;int&gt; and Func&lt;int, bool&gt; interchangeable?', 'What is the natural type of a lambda?'] },
    { q: 'What is a closure, and what is the classic for-loop bug?', level: 'I', a: `<p>A closure is a lambda (or local function) together with the variables it captures from the enclosing scope. Variables are captured <b>by reference</b>: the compiler moves them into a heap-allocated display class, and the lambda reads the current value when it runs. In <code>for (int i = 0; i &lt; 3; i++) actions.Add(() =&gt; Console.Write(i));</code> all lambdas share one <code>i</code>, so they print 333. Fix by copying into a variable declared inside the loop body. <code>foreach</code> creates a fresh variable per iteration since C# 5, so it does not have the bug.</p>`, followUps: ['What does the compiler generate for a closure?', 'How can closures cause memory leaks?'] },
    { q: 'How do events differ from public delegate fields?', level: 'I', a: `<p>An event exposes only add/remove accessors to outside code: subscribers can <code>+=</code> and <code>-=</code>, but cannot overwrite the list (<code>= null</code>) or invoke it — only the declaring class can raise it. A field-like event compiles to a private delegate field plus thread-safe add/remove methods (using Interlocked.CompareExchange). The standard pattern uses <code>EventHandler&lt;TEventArgs&gt;</code>, a <code>protected virtual OnX</code> raiser and <code>X?.Invoke(this, e)</code>.</p>`, followUps: ['Why is ?.Invoke thread-safe for raising?', 'How would you implement custom add/remove accessors?'] },
    { q: 'How can event handlers cause memory leaks, and how do you prevent them?', level: 'I', a: `<p>The publisher's delegate holds a reference to each handler's target object. If a long-lived publisher (a static service, an application-wide event) has a subscription from a short-lived object (a view, a request-scoped service) that never unsubscribes, the subscriber stays reachable and cannot be collected — along with everything it references. Prevention: unsubscribe in <code>Dispose</code>, use weak event patterns (WPF WeakEventManager), prefer subscriptions that return an <code>IDisposable</code> token (Rx), or avoid static events. Diagnose with a memory profiler looking for handler-held instances.</p>`, followUps: ['Does a lambda handler that does not use this still leak?', 'How does Rx make unsubscription explicit?'] },
    { q: 'Explain deferred execution in LINQ and its pitfalls.', level: 'I', a: `<p>Most LINQ operators return an object describing the query; the work happens when the result is enumerated. Pitfalls: (1) <b>multiple enumeration</b> repeats the work (and repeats database queries for IQueryable); (2) the query sees the <b>source as it is at enumeration time</b>, not when it was built; (3) exceptions are thrown during enumeration, far from the code that built the query; (4) a query over a disposed resource (DbContext, file) fails when finally enumerated. Materialise with <code>ToList</code>/<code>ToArray</code> when you need a snapshot or several passes; operators like <code>Count</code>, <code>First</code>, <code>Sum</code> execute immediately.</p>`, followUps: ['Which operators stream and which buffer?', 'What does analyzer CA1851 detect?'] },
    { q: 'How does yield return work under the hood?', level: 'A', a: `<p>The compiler rewrites an iterator method into a private class implementing <code>IEnumerable&lt;T&gt;</code>/<code>IEnumerator&lt;T&gt;</code>. Locals and parameters become fields, an integer state field records where execution paused, and <code>MoveNext()</code> is a switch that resumes after the last <code>yield return</code>, runs to the next one, sets <code>Current</code> and returns true. <code>yield break</code> or reaching the end returns false. <code>Dispose()</code> runs pending finally blocks, which is why a <code>break</code> out of foreach still cleans up. Nothing in the body runs until the first MoveNext.</p>`, followUps: ['What restrictions apply to yield inside try/catch?', 'Why are nested recursive iterators O(depth) per element?'] },
    { q: 'Query syntax vs method syntax — are they different?', level: 'B', a: `<p>They compile to the same method calls; query syntax is syntactic sugar translated by the compiler (<code>where</code> → Where, <code>orderby</code> → OrderBy/ThenBy, <code>join … into</code> → GroupJoin, <code>let</code> → Select into an anonymous type, multiple <code>from</code> → SelectMany). Method syntax exposes every operator (Take, Distinct, Chunk, MaxBy…) while query syntax covers a subset but reads better for joins, lets and multiple froms. Teams usually standardise on method syntax and use query syntax for complex joins.</p>`, followUps: ['How does query syntax work with non-LINQ types?', 'Translate a join … into … from … DefaultIfEmpty() query to method syntax.'] },
    { q: 'What does LINQ cost at run time, and when would you avoid it?', level: 'A', a: `<p>Each operator allocates an iterator object; each lambda adds a delegate invocation per element; capturing lambdas allocate closures; foreach over interfaces boxes enumerators. The BCL mitigates this (fused Where/Select, collection fast paths, vectorised Sum/Min/Max in .NET 8). For ordinary code the cost is negligible relative to I/O. In hot paths — tight loops over millions of elements, per-frame game code, low-latency services — prefer for/foreach over arrays or spans, avoid capturing lambdas, and measure with BenchmarkDotNet. Never sacrifice clarity without a profile showing LINQ is the bottleneck.</p>`, followUps: ['What is the cost difference between Count() on a List and on an IEnumerable?', 'How would you remove allocations from a Where/Select over an array?'] },
    { q: 'Explain Join vs GroupJoin and how to write a left outer join in LINQ.', level: 'I', a: `<p><code>Join</code> is an inner join: it builds a hash lookup of the inner sequence and yields one result per matching pair; unmatched rows are dropped. <code>GroupJoin</code> yields every outer element with the group of matching inner elements (possibly empty) — the left-join shape. A flat left outer join is <code>outer.GroupJoin(inner, o =&gt; o.Key, i =&gt; i.Key, (o, g) =&gt; (o, g)).SelectMany(x =&gt; x.g.DefaultIfEmpty(), (x, i) =&gt; (x.o, i))</code>, or in query syntax <code>join … into g from i in g.DefaultIfEmpty()</code>. (.NET 10 adds LeftJoin, but not .NET 8.)</p>`, followUps: ['Which side is hashed, and why does it matter?', 'How do null keys behave in Join?'] },
    { q: 'What is the difference between IEnumerable&lt;T&gt; and IQueryable&lt;T&gt; LINQ?', level: 'A', a: `<p><code>IEnumerable&lt;T&gt;</code> LINQ (LINQ to Objects) takes delegates and runs them in memory. <code>IQueryable&lt;T&gt;</code> LINQ takes <code>Expression&lt;Func&lt;…&gt;&gt;</code> trees: the provider (EF Core) inspects the tree and translates it, e.g. to SQL, so the lambda never runs as C#. Consequences: only translatable expressions work; calling a C# method inside a query may throw or force client evaluation; <code>AsEnumerable()</code>/<code>ToList()</code> switches to in-memory, so filtering after it pulls all rows. Keep filters, projections and paging on the IQueryable side.</p>`, followUps: ['How does a lambda become an expression tree?', 'What does AsNoTracking change?'] },
    { q: 'Design a type-safe in-process event aggregator (pub/sub) for an application.', level: 'E', a: `<p>Map message type → handlers: <code>Dictionary&lt;Type, List&lt;Delegate&gt;&gt;</code> behind a lock, with <code>IDisposable Subscribe&lt;T&gt;(Action&lt;T&gt; handler)</code> returning a token whose Dispose removes the handler (no reliance on remembering delegate instances) and <code>Publish&lt;T&gt;(T message)</code> copying the handler list under the lock and invoking outside it (no deadlocks if handlers publish). Decide on failure policy (isolate exceptions per handler and log), threading (synchronous vs dispatch to a <code>Channel&lt;T&gt;</code> consumer or the UI thread), and lifetime (weak references for UI subscribers). Consider existing libraries (MediatR notifications, Rx Subjects) before building one.</p>`, followUps: ['How do you support handlers for base types or interfaces of a message?', 'How would you test it?'] },
    { q: 'A report endpoint got slower after a refactor that "only made the code more LINQ-y". How do you investigate?', level: 'E', a: `<p>Look for the usual regressions: (1) <b>multiple enumeration</b> of a deferred query — especially over EF IQueryable (several SQL round-trips) or expensive iterators; (2) an early <code>ToList()</code>/<code>AsEnumerable()</code> moving filtering from SQL into memory; (3) O(n·m) patterns — <code>Where</code> inside a loop or a <code>Contains</code> on a List where a join, dictionary or ToLookup was needed; (4) <code>OrderBy</code> repeated inside loops; (5) per-element capturing lambdas allocating in a hot path. Tools: EF logging to count queries, a profiler (dotnet-trace, Visual Studio) for CPU and allocations, analyzers CA1851/CA1827, and a BenchmarkDotNet comparison of before/after.</p>`, followUps: ['How would you write a regression test for query counts?', 'When is it right to drop LINQ for a loop?'] },
    { q: 'Output prediction: what does this print? <code>var list = new List&lt;int&gt; {1, 2, 3}; var q = list.Select(x =&gt; x * 10); list.Add(4); Console.WriteLine(q.Sum());</code>', level: 'I', a: `<p>It prints <b>100</b>. <code>Select</code> is deferred, so building <code>q</code> does not compute anything. When <code>Sum()</code> enumerates it, the list already contains 4, so the sum is 10 + 20 + 30 + 40 = 100. If the code had been <code>list.Select(x =&gt; x * 10).ToList()</code> before the Add, it would print 60. Note also that adding to the list <i>during</i> enumeration would throw InvalidOperationException, but adding between building and enumerating is fine.</p>`, followUps: ['What if list were an array and you replaced an element instead?', 'What if q were enumerated inside a foreach that adds to list?'] }
  );

  registerModule({
    id: 'csharp06',
    title: 'Delegates, Lambdas, Events & LINQ',
    intro: `<p>This module covers C#'s functional toolkit. You will learn what a <b>delegate</b> really is (and why multicast delegates return only the last result), use <code>Func</code>/<code>Action</code>/<code>Predicate</code> and lambdas fluently, understand <b>closures</b> well enough to predict any output puzzle, build safe <b>events</b> without memory leaks, and master <b>LINQ</b>: the core operators, query versus method syntax, deferred execution, grouping and joining, and writing your own lazy sequences with <code>yield return</code>. Visualizers show invocation lists, closure objects, items flowing through a query and iterators pausing at each yield.</p>`,
    goals: [
      'Create, combine and remove delegates and predict multicast behaviour',
      'Write lambdas with Func/Action/Predicate, compose higher-order functions and avoid unwanted captures',
      'Explain closures and fix the for-loop capture bug',
      'Implement the .NET event pattern and prevent handler memory leaks',
      'Write LINQ queries in both syntaxes, including GroupBy, ToLookup, Join and GroupJoin',
      'Predict when a query runs, avoid multiple enumeration, and write lazy iterators with yield return'
    ],
    prereqs: `C# 5 (Generics &amp; Collections): generic methods, List, Dictionary, IEnumerable&lt;T&gt; and IComparer&lt;T&gt;.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
