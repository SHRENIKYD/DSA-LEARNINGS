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
     TOPIC 1 — Generic types and methods
     ====================================================================== */
  topics.push({
    title: 'Generic Types & Methods — Write Once, Type-Safe for Every T',
    analogy: `<p>A <b>shipping container</b> has one design, but the label on the door says what is inside: "<i>Container of Bananas</i>", "<i>Container of Cars</i>". The crane, the ship and the port do not care what is inside, yet customs knows exactly what each box holds and refuses to put cars into the banana container. A generic type like <code>List&lt;T&gt;</code> is that container: one piece of code, and the type argument (<code>List&lt;int&gt;</code>, <code>List&lt;string&gt;</code>) is the label the compiler checks.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>generic</b> type or method has a <b>type parameter</b> (by convention <code>T</code>, or <code>TKey</code>, <code>TValue</code>) that is filled in when you use it. Before generics (C# 1) we had <code>ArrayList</code>, which stores <code>object</code>:</p>
${H.table(['', 'ArrayList (C# 1)', 'List&lt;int&gt; (generic)'], [
  ['Adding an int', 'boxes it into a heap object', 'stored directly in an <code>int[]</code>'],
  ['Reading', 'needs a cast <code>(int)list[0]</code>', 'no cast'],
  ['Adding a string by mistake', 'compiles, crashes later with InvalidCastException', H.c('g', 'compile error')],
  ['Speed for 1M ints', 'slow (1M allocations)', 'fast (one array)']
])}
<p><b>What you can make generic:</b></p>
<ul>
<li>classes and structs: <code>class Box&lt;T&gt; { public T Value; }</code></li>
<li>interfaces: <code>IComparer&lt;T&gt;</code>, <code>IEnumerable&lt;T&gt;</code></li>
<li>methods, even inside non-generic classes: <code>static void Swap&lt;T&gt;(ref T a, ref T b)</code></li>
<li>delegates: <code>Func&lt;T, TResult&gt;</code> (module 6)</li>
</ul>
<p><b>Type inference.</b> For generic methods the compiler usually works out <code>T</code> from the arguments: <code>Swap(ref x, ref y)</code> instead of <code>Swap&lt;int&gt;(ref x, ref y)</code>. It does <b>not</b> infer from the return type alone, and constructors need the type spelled out (or target-typed <code>new()</code>: <code>List&lt;int&gt; xs = new();</code>).</p>
<p><b><code>default(T)</code></b> is the "zero" of any type: 0 for numbers, false for bool, null for references, all-zero for structs. Write it as just <code>default</code> when the type is clear.</p>
<p><b>Reified generics.</b> Unlike Java (type erasure), .NET keeps type arguments at run time: <code>typeof(List&lt;int&gt;) != typeof(List&lt;string&gt;)</code>, you can write <code>new T[n]</code>, <code>typeof(T)</code> and <code>x is T</code>, and each closed type has its <b>own static fields</b>.</p>`,
    clues: [
      '"the same code for ints, strings and custom types" → a generic type or method',
      '"avoid casts / InvalidCastException at runtime" → generics give compile-time checking',
      '"avoid boxing value types in a collection" → <code>List&lt;int&gt;</code>, not <code>ArrayList</code> or <code>List&lt;object&gt;</code>',
      '"Java type erasure vs C#" → .NET generics are reified: <code>typeof(T)</code>, <code>new T[]</code>, per-type statics',
      '"return a value of an unknown type when nothing is found" → <code>default(T)</code> or a <code>bool TryX(out T value)</code>',
      '"generic method cannot infer T" → pass an argument of type T or specify <code>&lt;T&gt;</code> explicitly'
    ],
    code: [{ lang: 'csharp', run: true, title: 'A generic class and a generic method (runnable)', code: `var ints = new Box<int>(42);
var words = new Box<string>("hello");
Console.WriteLine($"{ints} {words}");

int a = 1, b = 2;
Swap(ref a, ref b);                         // T inferred as int
Console.WriteLine($"a={a} b={b}");

Console.WriteLine(FirstOrFallback(new[] { 5, 6 }, -1));          // 5
Console.WriteLine(FirstOrFallback(Array.Empty<string>(), "none"));   // none
Console.WriteLine(default(int) + " " + (default(string) is null));  // 0 True

Console.WriteLine(typeof(Box<int>) == typeof(Box<string>));  // False: reified, distinct types
Box<int>.Created = 10; Box<string>.Created = 20;              // each closed type has its own statics
Console.WriteLine($"{Box<int>.Created} {Box<string>.Created}");

static void Swap<T>(ref T x, ref T y) => (x, y) = (y, x);

static T FirstOrFallback<T>(T[] items, T fallback) => items.Length > 0 ? items[0] : fallback;

sealed class Box<T>(T value)
{
    public static int Created;                  // one per Box<int>, one per Box<string>, ...
    public T Value { get; } = value;
    public override string ToString() => $"Box<{typeof(T).Name}>({Value})";
}` }],
    codeTitle: ['Generics basics'],
    viz: {
      title: 'ArrayList vs List<int>: what is actually stored',
      input: '7 3 9',
      inputLabel: 'A few integers to add',
      gen: function (input) {
        var a = ints(input, 'Enter up to 8 integers', 8);
        var frames = [];
        frames.push({ narr: 'We add ' + a.length + ' ints to an old <code>ArrayList</code> and to a generic <code>List&lt;int&gt;</code>.', parts: [{ type: 'array', label: 'values', values: a }] });
        for (var i = 0; i < a.length; i++) {
          var boxes = a.slice(0, i + 1).map(function (v, k) { return ['box#' + (k + 1), 'object { int ' + v + ' }']; });
          var hl = {}; hl['box#' + (i + 1)] = 'bad';
          var arr = a.slice(0, i + 1).map(function (v, k) { return '→box#' + (k + 1); });
          frames.push({ narr: 'Add ' + a[i] + ': ArrayList stores <code>object</code>, so the int is <b>boxed</b> — a new heap object (' + (i + 1) + ' allocation' + (i ? 's' : '') + ' so far). List&lt;int&gt; writes the raw 4-byte value into its array.', parts: [
            { type: 'array', label: 'ArrayList internal object[] (references)', values: arr, hl: one(i, 'cur') },
            { type: 'map', label: 'heap boxes', entries: boxes, hl: hl },
            { type: 'array', label: 'List&lt;int&gt; internal int[] (values inline)', values: a.slice(0, i + 1), hl: one(i, 'ok') }
          ] });
        }
        frames.push({ narr: 'Reading: <code>(int)arrayList[0]</code> needs a cast and an unbox; adding <code>"oops"</code> to the ArrayList compiles and fails only when someone casts it. <code>list[0]</code> is just an int, and <code>list.Add("oops")</code> does not compile.', parts: [{ type: 'vars', label: 'Cost summary', vals: { 'ArrayList allocations': a.length, 'List<int> allocations': '1 array (grows by doubling)', 'type safety': 'compile time only for List<T>' }, hl: { 'List<int> allocations': 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Generic interface plus a generic method', html: `<p>A generic interface describes a capability for any T. The method below works with any repository and any entity type, and the compiler checks every call.</p>`, code: { lang: 'csharp', run: true, code: `var repo = new MemoryRepo<string>();
repo.Add("alpha"); repo.Add("beta");
Console.WriteLine(CountWhere(repo, s => s.StartsWith('a')));   // 1

static int CountWhere<T>(IRepo<T> repo, Func<T, bool> test) => repo.All().Count(test);

interface IRepo<T> { void Add(T item); IEnumerable<T> All(); }
sealed class MemoryRepo<T> : IRepo<T>
{
    private readonly List<T> _items = [];
    public void Add(T item) => _items.Add(item);
    public IEnumerable<T> All() => _items;
}` } },
      { title: 'When inference fails', html: `<p>The compiler infers T only from arguments. With no argument of type T you must say it: <code>Parse&lt;int&gt;("5")</code>. (This example uses the generic-math interface <code>IParsable&lt;T&gt;</code>, which .NET 7+ numeric types implement.)</p>`, code: { lang: 'csharp', run: true, code: `Console.WriteLine(Parse<int>("5") + 1);          // 6
Console.WriteLine(Parse<double>("2.5") * 2);     // 5
// Parse("5");   // CS0411: the type arguments cannot be inferred from the usage

static T Parse<T>(string s) where T : IParsable<T> => T.Parse(s, System.Globalization.CultureInfo.InvariantCulture);` } },
      { title: 'Generic struct: a tiny Result type', html: `<p>Generic value types avoid allocations entirely. <code>Result&lt;T&gt;</code> carries either a value or an error message; <code>Result&lt;int&gt;</code> and <code>Result&lt;string&gt;</code> are different types with their own layouts.</p>`, code: { lang: 'csharp', run: true, code: `var ok = Result<int>.Ok(42);
var bad = Result<int>.Fail("not found");
Console.WriteLine(ok.IsOk ? ok.Value : -1);     // 42
Console.WriteLine(bad.IsOk ? "?" : bad.Error);  // not found

readonly struct Result<T>
{
    public bool IsOk { get; }
    public T Value { get; }
    public string Error { get; }
    private Result(bool ok, T value, string error) { IsOk = ok; Value = value; Error = error; }
    public static Result<T> Ok(T value) => new(true, value, "");
    public static Result<T> Fail(string error) => new(false, default!, error);
}` } }
    ],
    deepDive: `<p><b>🟣 How the runtime implements generics.</b> The C# compiler emits one generic definition in IL (<code>List\`1</code>). At run time the JIT creates code per instantiation, with an important split:</p>
<ul>
<li><b>Value-type arguments</b> (<code>List&lt;int&gt;</code>, <code>List&lt;Guid&gt;</code>) get <b>specialised machine code</b> — the int version works on raw 4-byte ints, no boxing, and comparisons can be inlined. This is why generic collections of structs are fast.</li>
<li><b>Reference-type arguments</b> share <b>one copy</b> of the code (using an internal placeholder type, <code>System.__Canon</code>), because every reference is a pointer of the same size. Type-specific information (for <code>typeof(T)</code>, casts, <code>new T[]</code>) is looked up through a generic dictionary at run time.</li>
</ul>
<p><b>Statics per closed type.</b> <code>Box&lt;int&gt;.Created</code> and <code>Box&lt;string&gt;.Created</code> are different fields. This is useful for caches keyed by type (<code>static class TypeCache&lt;T&gt; { public static readonly string Name = typeof(T).Name; }</code> — computed once per T, lock-free) and surprising when you expected one shared counter.</p>
<p><b>Generic variance</b> (<code>IEnumerable&lt;out T&gt;</code>, <code>IComparer&lt;in T&gt;</code>) lets an <code>IEnumerable&lt;string&gt;</code> be used as an <code>IEnumerable&lt;object&gt;</code>; it only applies to interfaces and delegates with reference-type arguments. <code>List&lt;string&gt;</code> is <b>not</b> a <code>List&lt;object&gt;</code> (it would let you add an int). Details in module 11.</p>
<p><b>Code bloat.</b> Every distinct value-type instantiation costs JIT time and memory. It rarely matters, but Native AOT and trimming must know instantiations ahead of time, which is one reason reflection-heavy generic code (<code>MakeGenericType</code>) is discouraged there.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write generic helpers fluently, sometimes too fluently — <code>Process&lt;TInput, TOutput, TContext, TOptions&gt;</code> where one concrete method would do. <b>Use AI as a partner:</b> ask "<i>which of these methods differ only by type? make them one generic method</i>" or "<i>will this generic code box?</i>". <b>Where AI goes wrong:</b> it applies Java habits (thinking <code>typeof(T)</code> or <code>new T[n]</code> are impossible), suggests <code>List&lt;object&gt;</code> to "keep it flexible", and forgets that static fields are per closed type. <b>What you still own:</b> choosing the right level of abstraction — generics should remove duplication you actually have, not hypothetical duplication.</p>`
  });

  topics[0].problems = [{
    title: 'A Generic Array-Backed Stack',
    level: 'Easy', tags: ['generic class', 'default(T)', 'Try pattern', 'growth'], companies: ['Microsoft', 'Amazon', 'Bloomberg'],
    statement: `<p>Write <code>public class ArrayStack&lt;T&gt;</code> backed by a <code>T[]</code> that starts with length 4 and <b>doubles</b> when full. It exposes <code>void Push(T item)</code>, <code>bool TryPop(out T item)</code>, <code>bool TryPeek(out T item)</code>, <code>int Count</code> and <code>int Capacity</code> (the array length). Clear popped slots with <code>default</code>. For the tests, add <code>public sealed class IntStack : ArrayStack&lt;int&gt;</code> with <code>Pop()</code> and <code>Peek()</code> returning −1 when empty, <code>Size()</code> and <code>Cap()</code>.</p>`,
    constraints: `Up to 10<sup>5</sup> operations.`,
    example: `<p>Push 1..5 → Size 5, Cap <b>8</b> (4 doubled once), Pop 5, Peek 4. A new stack has Cap 4 and Pop −1.</p>`,
    brute: { why: `<p>A non-generic stack of <code>object</code> works for every type but boxes ints, needs casts on the way out, and lets a string sneak into a stack of ints. Writing <code>IntStack</code>, <code>StringStack</code>… separately duplicates the logic.</p>`, code: `sealed class ObjectStack
{
    private readonly List<object> _items = new();
    public void Push(object o) => _items.Add(o);          // boxes value types
    public object Pop() { var o = _items[^1]; _items.RemoveAt(_items.Count - 1); return o; }
}` },
    mcq: { q: 'Why clear the slot with <code>_items[_count] = default!;</code> after popping?', options: ['To make Count correct', 'For reference types the array would otherwise keep the popped object alive, so the GC cannot collect it', 'It is required by the compiler', 'To make Push faster'], answer: 1, explain: 'A stale reference in the backing array is a memory leak for large objects. List&lt;T&gt; and Stack&lt;T&gt; clear slots for the same reason (only when T contains references).' },
    hints: [`<p>Hint 1: <code>private T[] _items = new T[4]; private int _count;</code></p>`, `<p>Hint 2: Grow with <code>Array.Resize(ref _items, _items.Length * 2)</code> when <code>_count == _items.Length</code>.</p>`, `<p>Hint 3: Try pattern: <code>if (_count == 0) { item = default!; return false; }</code></p>`],
    tests: { cls: 'IntStack', sigs: { IntStack: '', push: 'int -> void', pop: '-> int', peek: '-> int', size: '-> int', cap: '-> int' }, cases: [
      { ops: ['IntStack', 'push', 'push', 'push', 'push', 'push', 'size', 'cap', 'pop', 'peek'], args: [[], [1], [2], [3], [4], [5], [], [], [], []], out: [null, null, null, null, null, null, 5, 8, 5, 4] },
      { ops: ['IntStack', 'pop', 'peek', 'size', 'cap'], args: [[], [], [], [], []], out: [null, -1, -1, 0, 4] },
      { ops: ['IntStack', 'push', 'pop', 'pop', 'size'], args: [[], [7], [], [], []], out: [null, null, 7, -1, 0] },
      { ops: ['IntStack', 'push', 'push', 'push', 'push', 'cap', 'push', 'cap'], args: [[], [1], [1], [1], [1], [], [1], []], out: [null, null, null, null, null, 4, null, 8] },
      { ops: { $concat: [['IntStack'], { $rep: 'push', n: 1000 }, ['size', 'cap']] }, args: { $concat: [[[]], { $rep: [3], n: 1000 }, [[], []]] }, out: { $concat: [[null], { $rep: null, n: 1000 }, [1000, 1024]] } },
      { ops: ['IntStack', 'push', 'push', 'pop', 'pop'], args: [[], [-2147483648], [2147483647], [], []], out: [null, null, null, 2147483647, -2147483648] }
    ] },
    solution: {
      approach: `<p>One generic implementation; <code>IntStack</code> only adapts it to the test's −1 convention. Doubling keeps Push amortised O(1).</p>`,
      code: `public class ArrayStack<T>
{
    private T[] _items = new T[4];
    private int _count;

    public int Count => _count;
    public int Capacity => _items.Length;

    public void Push(T item)
    {
        if (_count == _items.Length) Array.Resize(ref _items, _items.Length * 2);   // amortised O(1)
        _items[_count++] = item;
    }

    public bool TryPop(out T item)
    {
        if (_count == 0) { item = default!; return false; }
        item = _items[--_count];
        _items[_count] = default!;          // drop the reference so the GC can reclaim it
        return true;
    }

    public bool TryPeek(out T item)
    {
        if (_count == 0) { item = default!; return false; }
        item = _items[_count - 1];
        return true;
    }
}

public sealed class IntStack : ArrayStack<int>
{
    public int Pop() => TryPop(out var x) ? x : -1;
    public int Peek() => TryPeek(out var x) ? x : -1;
    public int Size() => Count;
    public int Cap() => Capacity;
}`,
      dry: { head: ['op', 'array length', 'count', 'result'], rows: [
        ['Push ×4', '4', '4', '—'],
        ['Push 5', '4 → 8 (resize)', '5', '—'],
        ['Pop', '8', '4', '5'],
        ['Peek', '8', '4', '4']
      ] },
      complexity: `<p>Push amortised O(1) (O(n) on a resize), Pop/Peek O(1); memory O(capacity).</p>`,
      followUps: ['Implement IEnumerable&lt;T&gt; so foreach walks from top to bottom.', 'Should the stack ever shrink? What does Stack&lt;T&gt;.TrimExcess do?']
    }
  }];

  /* ======================================================================
     TOPIC 2 — Constraints
     ====================================================================== */
  topics.push({
    title: 'Generic Constraints — Telling the Compiler What T Can Do',
    analogy: `<p>A job advert for "<b>any person</b>" cannot promise the work will get done. "<b>Any person with a driving licence</b>" can safely be handed car keys. A constraint is the licence requirement: <code>where T : IComparable&lt;T&gt;</code> lets you call <code>CompareTo</code> on a T, because only types that hold that licence are accepted.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Inside a generic method the compiler knows nothing about <code>T</code> except that it is an <code>object</code>. You cannot write <code>a &lt; b</code>, <code>new T()</code> or <code>a.Name</code>. A <b><code>where</code> clause</b> narrows which types are allowed and, in return, unlocks members:</p>
${H.table(['Constraint', 'Allows T =', 'Unlocks'], [
  ['<code>where T : class</code>', 'reference types (nullable context: non-nullable)', 'compare with <code>null</code>, use <code>as</code>'],
  ['<code>where T : class?</code>', 'any reference type, nullable or not', '—'],
  ['<code>where T : struct</code>', 'non-nullable value types', 'use <code>T?</code> as <code>Nullable&lt;T&gt;</code>'],
  ['<code>where T : notnull</code>', 'non-nullable types (value or reference)', 'safe dictionary keys (warning otherwise)'],
  ['<code>where T : unmanaged</code>', 'structs with no references anywhere inside', 'pointers, <code>sizeof(T)</code>, <code>stackalloc T[n]</code>'],
  ['<code>where T : new()</code>', 'types with a public parameterless constructor', '<code>new T()</code> (must be listed last)'],
  ['<code>where T : SomeBase</code>', 'SomeBase or a subclass', 'SomeBase\'s members'],
  ['<code>where T : IComparable&lt;T&gt;</code>', 'types implementing the interface', '<code>a.CompareTo(b)</code>'],
  ['<code>where T : U</code>', 'T derives from another type parameter U', 'treat a T as a U'],
  ['<code>where T : INumber&lt;T&gt;</code> (.NET 7+)', 'numeric types', 'operators <code>+ - * /</code>, <code>T.Zero</code> (generic math)']
])}
<p>You can combine constraints: <code>where T : class, IEntity, new()</code>. Each type parameter gets its own clause: <code>where TKey : notnull where TValue : class</code>. Order matters: <code>class</code>/<code>struct</code>/<code>notnull</code>/<code>unmanaged</code> first, then a base class, then interfaces, then <code>new()</code>.</p>
<p><b>Rule of thumb:</b> ask for the <b>least</b> you need. <code>Max&lt;T&gt;</code> needs only comparison, so require <code>IComparable&lt;T&gt;</code> — not a base class, not <code>struct</code>.</p>`,
    clues: [
      '"operator &lt; cannot be applied to operands of type T" → constrain to <code>IComparable&lt;T&gt;</code> (or <code>INumber&lt;T&gt;</code>/<code>IComparisonOperators</code>)',
      '"cannot create an instance of the variable type T" → add <code>new()</code> or pass a factory <code>Func&lt;T&gt;</code>',
      '"sum any numeric type generically" → generic math <code>where T : INumber&lt;T&gt;</code>',
      '"dictionary key may be null warning" → <code>where TKey : notnull</code>',
      '"stackalloc / Span of a generic struct / pointer" → <code>unmanaged</code>',
      '"method works on any entity with an Id" → interface constraint <code>where T : IHasId</code>'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Constraints unlock members (runnable)', code: `using System.Numerics;

Console.WriteLine(MaxOf([3, 9, 2]));                 // 9    (int implements IComparable<int>)
Console.WriteLine(MaxOf(["pear", "apple", "zoo"]));  // zoo
Console.WriteLine(Sum([1.5, 2.25]));                 // 3.75 (generic math)
Console.WriteLine(Sum([1, 2, 3]));                   // 6
var made = CreateMany<Widget>(2);
Console.WriteLine(made.Count + " widgets, ids " + string.Join(",", made.Select(w => w.Id)));

static T MaxOf<T>(T[] items) where T : IComparable<T>
{
    if (items.Length == 0) throw new ArgumentException("empty", nameof(items));
    T best = items[0];
    foreach (var x in items)
        if (x.CompareTo(best) > 0) best = x;         // CompareTo is available thanks to the constraint
    return best;
}

static T Sum<T>(T[] items) where T : INumber<T>
{
    T total = T.Zero;                                // static abstract member of INumber<T>
    foreach (var x in items) total += x;             // operator + from the interface
    return total;
}

static List<T> CreateMany<T>(int n) where T : IHasId, new()
{
    var list = new List<T>();
    for (int i = 0; i < n; i++) list.Add(new T { Id = i + 1 });   // new() lets us construct T
    return list;
}

interface IHasId { int Id { get; set; } }
sealed class Widget : IHasId { public int Id { get; set; } }` }],
    codeTitle: ['Constraints'],
    viz: {
      title: 'What the compiler lets you write inside a generic method',
      input: 'IComparable',
      inputLabel: 'Constraint: none, IComparable, new, INumber',
      gen: function (input) {
        var c = words(input, 'Choose none, IComparable, new or INumber', 1)[0];
        var opts = ['none', 'IComparable', 'new', 'INumber'];
        if (opts.indexOf(c) < 0) throw new Error('Choose none, IComparable, new or INumber');
        var clause = { none: '', IComparable: ' where T : IComparable<T>', 'new': ' where T : new()', INumber: ' where T : INumber<T>' }[c];
        var code = 'static T Demo<T>(T a, T b)' + clause + '\n{\n  bool same = a.Equals(b);       // object member\n  int cmp = a.CompareTo(b);      // needs IComparable<T>\n  T fresh = new T();             // needs new()\n  T sum = a + b;                 // needs INumber<T>\n  return a;\n}';
        var allowed = { 3: true, 4: c === 'IComparable' || c === 'INumber', 5: c === 'new', 6: c === 'INumber' };
        var what = { 3: 'Equals comes from object — always allowed.', 4: 'CompareTo', 5: 'new T()', 6: 'a + b' };
        var frames = [{ narr: 'The signature says <code>' + (clause ? H.esc(clause.trim()) : 'no constraint') + '</code>. The compiler checks each line against what it knows about T.', parts: [cs(code, one(1, 'cur'))] }];
        [3, 4, 5, 6].forEach(function (ln) {
          var ok = allowed[ln];
          var why = ln === 3 ? what[3] : (ok ? what[ln] + ' is unlocked by the constraint.' : what[ln] + ' is an error: the compiler cannot prove every T supports it (' + (ln === 4 ? 'CS1061' : ln === 5 ? 'CS0304' : 'CS0019') + ').');
          frames.push({ narr: 'Line ' + ln + ': ' + why, parts: [cs(code, one(ln, ok ? 'ok' : 'bad')), { type: 'vars', label: 'Known about T', vals: { constraint: c, 'is object': 'yes', CompareTo: allowed[4] ? 'yes' : 'no', 'new T()': allowed[5] ? 'yes' : 'no', operators: allowed[6] ? 'yes' : 'no' } }] });
        });
        frames.push({ narr: 'Constraints are a contract both ways: callers may only pass types that satisfy them; the body may use exactly what they promise.', parts: [note('Ask for the smallest constraint that makes the body compile.')] });
        return frames;
      }
    },
    examples: [
      { title: 'Calling with a type that does not qualify', html: `<p>Constraints are checked at the call site. <code>object</code> does not implement <code>IComparable&lt;object&gt;</code>, so the call is rejected at compile time (CS0311) instead of failing at run time.</p>`, code: { lang: 'csharp', code: `static T MaxOf<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) >= 0 ? a : b;
static void Demo()
{
    Console.WriteLine(MaxOf(3, 7));            // fine
    Console.WriteLine(MaxOf("a", "b"));        // fine
    // MaxOf(new object(), new object());      // CS0311: object does not implement IComparable<object>
}` } },
      { title: 'A factory delegate instead of new()', html: `<p><code>new()</code> only works with a public parameterless constructor. Passing a <code>Func&lt;T&gt;</code> is more flexible (constructor arguments, private constructors, pooling) and is what DI containers effectively do.</p>`, code: { lang: 'csharp', run: true, code: `var pool = new Pool<StringBuilderLike>(() => new StringBuilderLike(capacity: 64));
Console.WriteLine(pool.Rent().Capacity);   // 64

sealed class Pool<T>(Func<T> factory) where T : class
{
    private readonly Stack<T> _free = new();
    public T Rent() => _free.Count > 0 ? _free.Pop() : factory();
    public void Return(T item) => _free.Push(item);
}
sealed class StringBuilderLike(int capacity) { public int Capacity { get; } = capacity; }` } },
      { title: 'unmanaged for low-level buffers', html: `<p><code>unmanaged</code> guarantees T contains no references, so its bytes can be reinterpreted or placed on the stack. <code>MemoryMarshal.AsBytes</code> uses the same idea.</p>`, code: { lang: 'csharp', run: true, code: `Console.WriteLine(SizeOfAll<int>(10));     // 40
Console.WriteLine(SizeOfAll<long>(10));    // 80
Console.WriteLine(ZeroCount<byte>(5));     // 5

static int SizeOfAll<T>(int n) where T : unmanaged => System.Runtime.CompilerServices.Unsafe.SizeOf<T>() * n;
static int ZeroCount<T>(int n) where T : unmanaged
{
    Span<T> buffer = stackalloc T[n];        // only allowed because T is unmanaged
    int zeros = 0;
    foreach (var x in buffer) if (x.Equals(default(T))) zeros++;
    return zeros;
}` } }
    ],
    deepDive: `<p><b>🟣 Constraints and performance.</b> For value types, a constrained call like <code>x.CompareTo(y)</code> where <code>T : IComparable&lt;T&gt;</code> compiles to the IL prefix <code>constrained.</code> + <code>callvirt</code>. In the specialised value-type code the JIT turns that into a <b>direct, inlinable call without boxing</b>. Compare with taking <code>IComparable</code> (non-generic) as a parameter: an int argument would be boxed on every call. This is why <code>where T : IEquatable&lt;T&gt;</code> and <code>EqualityComparer&lt;T&gt;.Default</code> are fast in BCL collections.</p>
<p><b>Generic math (.NET 7+, C# 11).</b> Interfaces like <code>INumber&lt;TSelf&gt;</code>, <code>IAdditionOperators&lt;TSelf, TOther, TResult&gt;</code> and <code>IParsable&lt;TSelf&gt;</code> use <b>static abstract</b> members, so a single <code>Sum&lt;T&gt;</code> works for int, double, decimal, BigInteger and your own types, compiled to specialised code with real <code>add</code> instructions. Before this, people wrote one overload per numeric type or used expression trees.</p>
<p><b>What constraints are not part of:</b> method overload resolution ignores constraints when choosing between candidates (until it has picked one), so two overloads differing only in constraints are a compile error (CS0111). Constraints are also not inherited by overriding methods — an override restates nothing and gets the base's constraints implicitly.</p>
<p><b>Nullable reference types.</b> <code>where T : class</code> in a nullable-enabled context means non-nullable reference types; passing <code>string?</code> gives a warning. <code>T?</code> on an unconstrained T means "maybe default" (a nullable annotation for references, but plain T for value types — <b>not</b> <code>Nullable&lt;T&gt;</code>), which surprises people; constrain to <code>struct</code> when you really want <code>Nullable&lt;T&gt;</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools are good at resolving "operator cannot be applied to T" errors, and often know generic math. <b>Use AI as a partner:</b> ask "<i>what is the minimal constraint for this body?</i>" or "<i>convert these five overloads into one INumber&lt;T&gt; method</i>". <b>Where AI goes wrong:</b> it over-constrains (<code>where T : struct, IComparable, IConvertible, IFormattable</code> just to compare), suggests <code>dynamic</code> to "make operators work" (slow and unsafe), and confuses <code>T?</code> on an unconstrained T with <code>Nullable&lt;T&gt;</code>. <b>What you still own:</b> API design — constraints are part of your public contract and loosening or tightening them later can break callers.</p>`
  });

  topics[1].problems = [{
    title: 'Generic Top-K with a Constraint',
    level: 'Medium', tags: ['generic method', 'constraints', 'PriorityQueue'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Implement the instance method <code>public T[] TopK&lt;T&gt;(T[] items, int k) where T : IComparable&lt;T&gt;</code> on <code>Solution</code> that returns the k largest items in <b>descending</b> order (all items if k exceeds the length). It must work for any comparable type; the tests use <code>int</code>.</p>`,
    constraints: `0 ≤ items.Length ≤ 10<sup>5</sup>; 0 ≤ k ≤ 10<sup>5</sup>. Aim for O(n log k).`,
    example: `<p>TopK([3, 1, 4, 1, 5, 9, 2, 6], 3) → [9, 6, 5].</p>`,
    brute: { why: `<p>Sort a copy descending and take k: O(n log n), fine for small inputs but wasteful when k is tiny and n is huge (or when items arrive as a stream).</p>`, code: `static T[] TopKSort<T>(T[] items, int k) where T : IComparable<T>
{
    var copy = (T[])items.Clone();
    Array.Sort(copy, (a, b) => b.CompareTo(a));   // O(n log n)
    return copy.Take(k).ToArray();
}` },
    mcq: { q: 'To keep the k largest so far, the heap should be…', options: ['a max-heap of all items', 'a min-heap of size k: its root is the smallest of the current top k and is evicted when a bigger item arrives', 'a sorted list', 'a stack'], answer: 1, explain: 'The min at the root is the one to beat. Each item costs O(log k).' },
    hints: [`<p>Hint 1: <code>var heap = new PriorityQueue&lt;T, T&gt;();</code> — PriorityQueue is a min-heap by priority using <code>Comparer&lt;T&gt;.Default</code>.</p>`, `<p>Hint 2: Enqueue each item; when <code>heap.Count &gt; k</code>, <code>Dequeue()</code> the smallest.</p>`, `<p>Hint 3: Dequeue everything (ascending) into an array filled from the back to get descending order. Handle k = 0.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'TopK', cases: [
      [[[3, 1, 4, 1, 5, 9, 2, 6], 3], [9, 6, 5]],
      [[[], 0], []],
      [[[5], 1], [5]],
      [[[2, 2, 2], 2], [2, 2]],
      [[[-1, -5, -3], 2], [-1, -3]],
      [[[1, 2, 3], 5], [3, 2, 1]],
      [[[7, 7, 1, 7], 0], []],
      [[{ $range: [0, 100000] }, 3], [99999, 99998, 99997]]
    ] },
    solution: {
      approach: `<p>A size-k min-heap keyed by the item itself; the constraint guarantees <code>Comparer&lt;T&gt;.Default</code> can order T. Draining the heap gives ascending order, which we write back to front.</p>`,
      code: `public class Solution
{
    public T[] TopK<T>(T[] items, int k) where T : IComparable<T>
    {
        if (k <= 0) return [];
        var heap = new PriorityQueue<T, T>();          // min-heap ordered by T itself
        foreach (var x in items)
        {
            heap.Enqueue(x, x);
            if (heap.Count > k) heap.Dequeue();         // drop the smallest
        }
        var result = new T[heap.Count];
        for (int i = result.Length - 1; i >= 0; i--) result[i] = heap.Dequeue();   // ascending -> fill from back
        return result;
    }
}`,
      dry: { head: ['x', 'heap after (k = 3)', 'evicted'], rows: [
        ['3, 1, 4', '{1, 3, 4}', '—'],
        ['1', '{1, 3, 4}', '1'],
        ['5', '{3, 4, 5}', '1'],
        ['9', '{4, 5, 9}', '3'],
        ['2', '{4, 5, 9}', '2'],
        ['6', '{5, 6, 9}', '4 → answer [9, 6, 5]']
      ] },
      complexity: `<p>O(n log k) time, O(k) extra space.</p>`,
      followUps: ['Add an overload taking an IComparer&lt;T&gt; so callers can pick "largest by length".', 'Use generic math to return the sum of the top k for any INumber&lt;T&gt;.']
    }
  }];

  /* ======================================================================
     TOPIC 3 — List<T> and arrays
     ====================================================================== */
  topics.push({
    title: 'List<T> — The Default Collection, Inside and Out',
    analogy: `<p>A <b>notebook with numbered lines</b>. Writing on the next empty line is instant; reading line 57 is instant. But inserting something at line 3 means rewriting every line below it one place down, and when the notebook is full you buy a notebook twice as thick and copy everything over. That is <code>List&lt;T&gt;</code>: an array that grows.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>List&lt;T&gt;</code> wraps a <code>T[]</code> plus a <code>Count</code>. <b>Capacity</b> is the array length; when Count reaches it, the list allocates a new array of <b>double</b> the size (starting at 4) and copies.</p>
${H.table(['Operation', 'Cost', 'Note'], [
  ['<code>list[i]</code>, <code>list[i] = x</code>', 'O(1)', 'bounds-checked'],
  ['<code>Add(x)</code>', 'amortised O(1)', 'O(n) on the push that triggers a resize'],
  ['<code>Insert(i, x)</code>, <code>RemoveAt(i)</code>', H.c('r', 'O(n − i)'), 'shifts the tail — <code>RemoveAt(0)</code> in a loop is O(n²)'],
  ['<code>RemoveAt(Count − 1)</code>', 'O(1)', 'remove from the end is cheap'],
  ['<code>Contains</code>, <code>IndexOf</code>, <code>Remove(x)</code>', 'O(n)', 'linear search using Equals'],
  ['<code>RemoveAll(pred)</code>', 'O(n)', 'one compacting pass — use instead of RemoveAt in a loop'],
  ['<code>Sort()</code>', 'O(n log n)', 'introsort, <b>not stable</b>'],
  ['<code>BinarySearch(x)</code>', 'O(log n)', 'list must be sorted; returns <code>~insertionPoint</code> (negative) if absent']
])}
<p><b>Useful modern syntax:</b> collection expressions <code>List&lt;int&gt; xs = [1, 2, 3];</code> and spreads <code>[..xs, 4]</code> (C# 12); index from end <code>xs[^1]</code>. Ranges such as <code>arr[1..3]</code> work on arrays, strings and spans but <b>not</b> on <code>List&lt;T&gt;</code> (it has no <code>Slice</code> method), so use <code>GetRange(1, 2)</code> or <code>CollectionsMarshal.AsSpan(list)[1..3]</code>.</p>
<p><b>Array vs List:</b> use <code>T[]</code> when the size is fixed (it is slightly faster and works with spans everywhere); use <code>List&lt;T&gt;</code> when it grows. <b>Never modify a list while iterating it with foreach</b> — the enumerator detects the version change and throws <code>InvalidOperationException</code>.</p>`,
    clues: [
      '"append and index" → <code>List&lt;T&gt;</code> (or an array if the size is known)',
      '"remove from the front repeatedly" → not List (O(n) each) — use <code>Queue&lt;T&gt;</code> or an index',
      '"remove all items matching" → <code>RemoveAll</code>, not RemoveAt in a loop',
      '"Collection was modified; enumeration operation may not execute" → you changed the list inside foreach',
      '"find in a sorted list / insertion point" → <code>BinarySearch</code> and the <code>~index</code> trick',
      '"stable sort required" → <code>OrderBy</code> (LINQ is stable), not <code>List.Sort</code>'
    ],
    code: [{ lang: 'csharp', run: true, title: 'List<T> growth, BinarySearch and safe removal (runnable)', code: `var list = new List<int>();
int lastCap = -1;
for (int i = 0; i < 20; i++)
{
    list.Add(i);
    if (list.Capacity != lastCap) { Console.Write(list.Capacity + " "); lastCap = list.Capacity; }
}
Console.WriteLine("<- capacities");                  // 4 8 16 32

List<int> sorted = [10, 20, 30, 40];
int idx = sorted.BinarySearch(25);                    // not found -> negative
Console.WriteLine($"{idx} -> insert at {~idx}");      // -3 -> insert at 2
sorted.Insert(~idx, 25);
Console.WriteLine(string.Join(",", sorted));          // 10,20,25,30,40

List<int> nums = [1, 2, 3, 4, 5, 6];
int removed = nums.RemoveAll(n => n % 2 == 0);        // one O(n) pass
Console.WriteLine($"removed {removed}: {string.Join(",", nums)}");

try
{
    foreach (var n in nums) if (n == 3) nums.Add(99); // modifying during foreach
}
catch (InvalidOperationException e) { Console.WriteLine("Error: " + e.Message); }` }],
    codeTitle: ['List<T> in practice'],
    viz: {
      title: 'Insert(i, x) shifts the tail; Add appends',
      input: '10 20 30 40 50',
      inputLabel: 'Initial list (up to 8 numbers)',
      gen: function (input) {
        var a = ints(input, 'Enter up to 8 integers', 8);
        var frames = [], cap = 4; while (cap < a.length) cap *= 2;
        var show = function (arr, c) { var v = arr.slice(); while (v.length < c) v.push('·'); return v; };
        frames.push({ narr: 'The list holds ' + a.length + ' items in an array of capacity ' + cap + '.', parts: [{ type: 'array', label: 'backing array (Count = ' + a.length + ', Capacity = ' + cap + ')', values: show(a, cap), showIdx: true }] });
        var b = a.slice(), x = 99;
        if (b.length === cap) {
          cap *= 2;
          frames.push({ narr: 'Count == Capacity, so Insert first <b>grows</b>: a new array of ' + cap + ' is allocated and all items are copied.', parts: [{ type: 'array', label: 'new backing array', values: show(b, cap), hl: one(b.length, 'win'), showIdx: true }] });
        }
        for (var i = b.length; i > 0; i--) {
          var v = b.slice(0, i).concat([b[i - 1]]).concat(b.slice(i));
          var h = {}; h[i] = 'cur';
          frames.push({ narr: 'Insert(0, ' + x + ') must open slot 0: move element ' + (i - 1) + ' one step right. (' + (b.length - i + 1) + ' of ' + b.length + ' moves)', parts: [{ type: 'array', label: 'shifting', values: show(v, cap), hl: h, showIdx: true }] });
        }
        var done = [x].concat(b);
        frames.push({ narr: 'Write ' + x + ' into slot 0. Total moves: <b>' + b.length + '</b> — O(n). Insert at the end would have needed zero moves.', parts: [{ type: 'array', label: 'after Insert(0, ' + x + ')', values: show(done, cap), hl: one(0, 'ok'), showIdx: true }] });
        frames.push({ narr: 'Repeating Insert(0, …) or RemoveAt(0) n times costs about n²/2 moves. If you need fast operations at the front, use <code>Queue&lt;T&gt;</code>, <code>LinkedList&lt;T&gt;</code>, or add to the end and reverse once.', parts: [note('Add / RemoveAt(Count-1): O(1). Insert(0) / RemoveAt(0): O(n).')] });
        return frames;
      }
    },
    examples: [
      { title: 'Pre-size when you know the count', html: `<p><code>new List&lt;T&gt;(capacity)</code> allocates once instead of log₂(n) times. LINQ's <code>ToList()</code> does this automatically when the source has a known count.</p>`, code: { lang: 'csharp', run: true, code: `var squares = new List<long>(capacity: 1_000_000);
for (long i = 0; i < 1_000_000; i++) squares.Add(i * i);
Console.WriteLine($"{squares.Count} items, capacity {squares.Capacity}");   // no resizes happened` } },
      { title: 'Sort is not stable; OrderBy is', html: `<p><code>List.Sort</code> uses introsort, which may reorder equal elements. If equal keys must keep their original order, use LINQ <code>OrderBy</code> (stable) or add a tie-breaker.</p>`, code: { lang: 'csharp', run: true, code: `var people = new List<(string Name, int Age)> { ("Asha", 30), ("Ben", 25), ("Cal", 30), ("Dev", 25) };
var stable = people.OrderBy(p => p.Age).Select(p => p.Name);
Console.WriteLine(string.Join(" ", stable));          // Ben Dev Asha Cal (original order kept within each age)
people.Sort((a, b) => a.Age != b.Age ? a.Age.CompareTo(b.Age) : string.CompareOrdinal(a.Name, b.Name));
Console.WriteLine(string.Join(" ", people.Select(p => p.Name)));   // explicit tie-breaker` } },
      { title: 'Iterating backwards to remove by index', html: `<p>If you must remove by index in a loop, go from the end so indices of unvisited items do not shift. (<code>RemoveAll</code> is still better: O(n) instead of O(n²).)</p>`, code: { lang: 'csharp', run: true, code: `List<string> files = ["a.tmp", "b.cs", "c.tmp", "d.cs"];
for (int i = files.Count - 1; i >= 0; i--)
    if (files[i].EndsWith(".tmp")) files.RemoveAt(i);
Console.WriteLine(string.Join(",", files));   // b.cs,d.cs` } }
    ],
    deepDive: `<p><b>🟣 Internals.</b> <code>List&lt;T&gt;</code> has three fields: <code>_items</code> (T[]), <code>_size</code> and <code>_version</code>. Every mutation increments <code>_version</code>; the struct enumerator captures it and throws if it changes — that is the "collection was modified" error. <code>foreach</code> over a <code>List&lt;T&gt;</code> uses the public struct <code>List&lt;T&gt;.Enumerator</code> (no allocation), but over an <code>IEnumerable&lt;T&gt;</code>-typed variable the enumerator is boxed — one allocation per loop.</p>
<p><b>Growth and the LOH.</b> Doubling means up to 50% slack. An array of more than 85,000 bytes goes to the Large Object Heap (module 8), so a growing <code>List&lt;double&gt;</code> past ~10,600 items allocates LOH arrays on every later resize. <code>EnsureCapacity(n)</code> (.NET 6+) and <code>TrimExcess()</code> let you manage this. The maximum array length is about 2³¹ elements (<code>Array.MaxLength</code>).</p>
<p><b>Spans over lists.</b> <code>CollectionsMarshal.AsSpan(list)</code> gives a <code>Span&lt;T&gt;</code> over the live backing array — no bounds-check-per-call overhead and no copy — but it becomes stale if the list grows. <code>CollectionsMarshal.SetCount</code> (.NET 8) lets you size a list without adding items one by one.</p>
<p><b>Read-only views.</b> Return <code>IReadOnlyList&lt;T&gt;</code> (or <code>list.AsReadOnly()</code>) from APIs so callers cannot mutate your internal list; cast-proof immutability needs <code>ImmutableArray&lt;T&gt;</code> or <code>FrozenSet</code>/<code>FrozenDictionary</code> (.NET 8) for read-mostly data.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code often uses <code>List&lt;T&gt;</code> for everything, including queues (<code>RemoveAt(0)</code>) and lookups (<code>list.Contains</code> inside a loop) — fine for 10 items, quadratic for 100,000. <b>Use AI as a partner:</b> ask it to "<i>find every O(n) operation inside a loop in this file</i>" and to suggest the right collection. <b>Where AI goes wrong:</b> it claims <code>List.Sort</code> is stable, modifies lists inside foreach, and forgets that <code>BinarySearch</code> requires sorted data with the same comparer. <b>What you still own:</b> knowing the cost table above well enough to spot the hidden quadratic during code review.</p>`
  });

  topics[2].problems = [{
    title: 'Sorted Insert with BinarySearch',
    level: 'Easy', tags: ['List<T>', 'BinarySearch', 'complement index'], companies: ['Microsoft', 'Apple', 'Oracle'],
    statement: `<p>Start with an empty <code>List&lt;int&gt;</code>. For each value in <code>values</code> (all distinct), insert it so the list stays sorted ascending, and record the index where it was inserted. Implement <code>public static int[] InsertPositions(int[] values)</code> using <code>List&lt;int&gt;.BinarySearch</code> and its complement-index return value.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>; values are distinct ints.`,
    example: `<p>[5, 1, 3]: insert 5 at 0 → [5]; 1 at 0 → [1, 5]; 3 at 1 → [1, 3, 5]. Output [0, 0, 1].</p>`,
    brute: { why: `<p>Append then call <code>Sort()</code> after each insert: O(n² log n). Or scan linearly for the position: O(n) per search. BinarySearch finds the position in O(log n) (the Insert shift is still O(n), but with a fast memmove).</p>`, code: `static int[] InsertSlow(int[] values)
{
    var list = new List<int>(); var pos = new int[values.Length];
    for (int k = 0; k < values.Length; k++)
    {
        int i = 0; while (i < list.Count && list[i] < values[k]) i++;   // linear scan
        list.Insert(i, values[k]); pos[k] = i;
    }
    return pos;
}` },
    mcq: { q: '<code>BinarySearch</code> returns −3 for a missing value. Where should it be inserted?', options: ['Index 3', 'Index 2, because the result is the bitwise complement of the insertion point (~(−3) = 2)', 'Index −3', 'At the end'], answer: 1, explain: 'A negative result r means "not found; the first larger element is at ~r". ~x equals −x − 1.' },
    hints: [`<p>Hint 1: <code>int i = list.BinarySearch(v);</code> will be negative because values are distinct and v is not yet in the list.</p>`, `<p>Hint 2: <code>int at = ~i; list.Insert(at, v);</code></p>`, `<p>Hint 3: Record <code>at</code> for each value. Extreme ints work because no arithmetic is done on the values.</p>`],
    tests: { sig: 'int[] -> int[]', fn: 'InsertPositions', cases: [
      [[[5, 1, 3]], [0, 0, 1]],
      [[[]], []],
      [[[1, 2, 3, 4]], [0, 1, 2, 3]],
      [[[4, 3, 2, 1]], [0, 0, 0, 0]],
      [[[10, -10, 0, 5, -5]], [0, 0, 1, 2, 1]],
      [[[2147483647, -2147483648, 0]], [0, 0, 1]],
      [[[7]], [0]]
    ] },
    solution: {
      approach: `<p>BinarySearch on the sorted list; the complement of the negative result is the insertion point.</p>`,
      code: `public class Solution
{
    public static int[] InsertPositions(int[] values)
    {
        var list = new List<int>(values.Length);
        var result = new int[values.Length];
        for (int k = 0; k < values.Length; k++)
        {
            int i = list.BinarySearch(values[k]);
            int at = i >= 0 ? i : ~i;          // values are distinct, so i is always negative here
            list.Insert(at, values[k]);
            result[k] = at;
        }
        return result;
    }
}`,
      dry: { head: ['v', 'list before', 'BinarySearch', '~', 'list after'], rows: [
        ['10', '[]', '−1', '0', '[10]'],
        ['−10', '[10]', '−1', '0', '[−10, 10]'],
        ['0', '[−10, 10]', '−2', '1', '[−10, 0, 10]'],
        ['5', '[−10, 0, 10]', '−3', '2', '[−10, 0, 5, 10]'],
        ['−5', '[−10, 0, 5, 10]', '−2', '1', '[−10, −5, 0, 5, 10]']
      ] },
      complexity: `<p>O(log n) search plus O(n) shift per insert → O(n²) worst case overall, but with very small constants. For large n use a SortedSet or an order-statistics tree.</p>`,
      followUps: ['With duplicates allowed, BinarySearch returns any matching index — how would you insert after all equal values?', 'Which collection gives O(log n) insert and O(log n) rank queries?']
    }
  }];

  /* ======================================================================
     TOPIC 4 — Dictionary and HashSet
     ====================================================================== */
  topics.push({
    title: 'Dictionary<TKey, TValue> & HashSet<T> — O(1) Lookups',
    analogy: `<p>A <b>coat check</b> at a theatre. You hand over your coat and get ticket 47; later you show 47 and the attendant walks straight to hook 47 — no searching through every coat. A <code>Dictionary</code> turns a key into a hook number (the <b>hash</b>) and goes straight there. A <code>HashSet</code> is the same coat check that only remembers <i>whether</i> a ticket was issued, not what coat it holds.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <code>Dictionary&lt;TKey, TValue&gt;</code> maps unique keys to values; <code>HashSet&lt;T&gt;</code> stores unique items. Both find things in <b>O(1) on average</b> by calling <code>GetHashCode()</code> to pick a bucket and <code>Equals()</code> to confirm.</p>
${H.table(['Task', 'Use', 'Why'], [
  ['Read a value that may be missing', '<code>if (d.TryGetValue(k, out var v))</code>', 'one lookup; <code>d[k]</code> throws <code>KeyNotFoundException</code> when missing'],
  ['Insert or overwrite', '<code>d[k] = v;</code>', '<code>Add</code> throws on duplicates'],
  ['Insert only if absent', '<code>d.TryAdd(k, v)</code>', 'returns false instead of throwing'],
  ['Count occurrences', '<code>d[k] = d.GetValueOrDefault(k) + 1;</code>', 'or <code>CollectionsMarshal.GetValueRefOrAddDefault</code> for one lookup'],
  ['"Seen before?"', '<code>if (!set.Add(x))</code>', 'Add returns false if x was already present'],
  ['Case-insensitive keys', '<code>new Dictionary&lt;string, int&gt;(StringComparer.OrdinalIgnoreCase)</code>', 'the comparer supplies both hash and equality'],
  ['Set algebra', '<code>UnionWith, IntersectWith, ExceptWith, SetEquals, IsSubsetOf</code>', 'in-place, O(n)']
])}
<p><b>Order:</b> neither type promises any order. In practice a Dictionary that only ever had additions enumerates in insertion order, but removals break that — <b>never rely on it</b>. Need order? Use <code>SortedDictionary</code> (by key) or keep a separate list (insertion order). .NET 9 adds <code>OrderedDictionary&lt;TKey, TValue&gt;</code>, but on .NET 8 you build it yourself.</p>
<p><b>Keys must not change.</b> If a key's hash changes while it is in the dictionary, the entry is lost in the wrong bucket. Use immutable keys: strings, numbers, records with init-only properties, tuples.</p>`,
    clues: [
      '"count frequencies" / "group by" / "index by id" → <code>Dictionary</code>',
      '"have I seen this before?" / "remove duplicates" → <code>HashSet&lt;T&gt;.Add</code> returning bool',
      '"two-sum style: find the complement" → dictionary of value → index',
      '"case-insensitive" → pass <code>StringComparer.OrdinalIgnoreCase</code> to the constructor',
      '"KeyNotFoundException" → use <code>TryGetValue</code>',
      '"N ≤ 10<sup>5</sup> lookups inside a loop" → never <code>List.Contains</code>; use a set'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Counting, grouping and set operations (runnable)', code: `using System.Runtime.InteropServices;

string text = "the cat and the hat and the bat";
var counts = new Dictionary<string, int>();
foreach (var w in text.Split(' '))
    counts[w] = counts.GetValueOrDefault(w) + 1;                // read-modify-write: two lookups
Console.WriteLine(string.Join(", ", counts.Select(kv => $"{kv.Key}={kv.Value}")));

var fast = new Dictionary<string, int>();
foreach (var w in text.Split(' '))
    CollectionsMarshal.GetValueRefOrAddDefault(fast, w, out _)++;   // one lookup, increments in place
Console.WriteLine(fast["the"]);                                  // 3

if (!counts.TryGetValue("dog", out int dogs)) Console.WriteLine("no dog");

var ci = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) { ["Apple"] = 1 };
Console.WriteLine(ci.ContainsKey("APPLE"));                      // True

var a = new HashSet<int> { 1, 2, 3, 4 };
var b = new HashSet<int> { 3, 4, 5 };
Console.WriteLine(a.Add(2));                                     // False: already present
a.IntersectWith(b);
Console.WriteLine(string.Join(",", a));                          // 3,4` }],
    codeTitle: ['Dictionary and HashSet'],
    viz: {
      title: 'How Dictionary finds a key: hash → bucket → entries chain',
      input: 'cat dog cow bat cat',
      inputLabel: 'Keys to add (words)',
      gen: function (input) {
        var keys = words(input, 'Enter up to 8 words', 8);
        var B = 5, buckets = [], entries = [], frames = [];
        for (var i = 0; i < B; i++) buckets.push(-1);
        function h(s) { var x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 1000003; return x; }
        function snap() { return buckets.map(function (b, i) { var chain = [], e = b; while (e >= 0) { chain.push(entries[e].k + '=' + entries[e].v); e = entries[e].next; } return ['bucket ' + i, chain.length ? chain.join(' → ') : '(empty)']; }); }
        frames.push({ narr: 'A tiny dictionary with ' + B + ' buckets. Each bucket points to a chain of entries (stored in one entries array).', parts: [{ type: 'map', label: 'buckets', entries: snap() }] });
        keys.forEach(function (k) {
          var hc = h(k), bi = hc % B, e = buckets[bi], found = -1;
          while (e >= 0) { if (entries[e].k === k) { found = e; break; } e = entries[e].next; }
          var hl = {}; hl['bucket ' + bi] = found >= 0 ? 'sel' : 'ok';
          if (found >= 0) {
            entries[found].v++;
            frames.push({ narr: '"' + k + '": hash ' + hc + ' % ' + B + ' = bucket ' + bi + '. Walk the chain calling <b>Equals</b>: found! Increment its count (no new entry).', parts: [{ type: 'vars', label: 'lookup', vals: { key: k, hash: hc, bucket: bi, result: 'existing' }, hl: { result: 'sel' } }, { type: 'map', label: 'buckets', entries: snap(), hl: hl }] });
          } else {
            entries.push({ k: k, v: 1, next: buckets[bi] }); buckets[bi] = entries.length - 1;
            var col = entries[entries.length - 1].next >= 0;
            frames.push({ narr: '"' + k + '": hash ' + hc + ' % ' + B + ' = bucket ' + bi + '. ' + (col ? H.c('y', 'Collision') + ' — another key already lives here; Equals says it is different, so the new entry is chained in front.' : 'Empty bucket: store a new entry.'), parts: [{ type: 'vars', label: 'lookup', vals: { key: k, hash: hc, bucket: bi, result: col ? 'new (collision)' : 'new' }, hl: { result: col ? 'cur' : 'ok' } }, { type: 'map', label: 'buckets', entries: snap(), hl: hl }] });
          }
        });
        frames.push({ narr: 'Average chain length stays about 1 because the real Dictionary resizes (to a prime bucket count about twice as big) when entries reach the bucket count. That is why lookups are O(1) on average — and why a bad GetHashCode (everything in one bucket) makes them O(n).', parts: [{ type: 'map', label: 'final buckets', entries: snap() }] });
        return frames;
      }
    },
    examples: [
      { title: 'Two Sum with a dictionary', html: `<p>Store each value's index; for each new value, look up the complement. One pass, O(n).</p>`, code: { lang: 'csharp', run: true, code: `int[] nums = [2, 7, 11, 15]; int target = 9;
var seen = new Dictionary<int, int>();
for (int i = 0; i < nums.Length; i++)
{
    if (seen.TryGetValue(target - nums[i], out int j)) { Console.WriteLine($"[{j}, {i}]"); break; }
    seen[nums[i]] = i;
}` } },
      { title: 'Grouping into lists', html: `<p>A dictionary of lists groups items. <code>LINQ GroupBy</code> (module 6) does the same declaratively; the manual version avoids building intermediate groupings when you need to stream.</p>`, code: { lang: 'csharp', run: true, code: `string[] words = ["eat", "tea", "tan", "ate", "nat", "bat"];
var groups = new Dictionary<string, List<string>>();
foreach (var w in words)
{
    var key = new string(w.Order().ToArray());          // sorted letters = anagram signature
    if (!groups.TryGetValue(key, out var list)) groups[key] = list = [];
    list.Add(w);
}
foreach (var g in groups.Values) Console.WriteLine(string.Join(" ", g));` } },
      { title: 'Tuples and records as composite keys', html: `<p>Value tuples and records have value equality and good hashes built in, so they make clean composite keys — no string concatenation like <code>x + "," + y</code>.</p>`, code: { lang: 'csharp', run: true, code: `var grid = new Dictionary<(int Row, int Col), char> { [(0, 0)] = 'S', [(2, 3)] = 'E' };
Console.WriteLine(grid[(2, 3)]);                          // E
var visits = new HashSet<Cell> { new(1, 1), new(1, 1) };
Console.WriteLine(visits.Count);                          // 1

record struct Cell(int Row, int Col);` } }
    ],
    deepDive: `<p><b>🟣 Inside Dictionary&lt;TKey, TValue&gt;.</b> Two arrays: <code>int[] _buckets</code> and <code>Entry[] _entries</code>, where an Entry holds <code>hashCode</code>, <code>next</code> (index of the next entry in the chain), the key and the value. Buckets store 1-based indexes into entries. Removed entries go on a free list and are reused, which is why insertion order is lost after removals. The bucket count is a prime; .NET Core uses a fast modulo via multiplication ("FastMod") on 64-bit. When the entries array is full, the dictionary resizes to the next prime ≥ 2 × count and rehashes.</p>
<p><b>Hash flooding.</b> For <code>string</code> keys, .NET Core uses randomised hashing (Marvin) per process, so attackers cannot precompute colliding keys. For default comparers on strings, the dictionary actually starts with a faster non-randomised hash and switches to randomised hashing if a chain gets too long (more than 100 collisions).</p>
<p><b>Comparers.</b> A custom <code>IEqualityComparer&lt;T&gt;</code> must keep <code>Equals</code> and <code>GetHashCode</code> consistent (for OrdinalIgnoreCase the hash is computed on the upper-cased chars). For value-type keys, the default comparer is devirtualised by the JIT, so <code>Dictionary&lt;int, T&gt;</code> lookups inline the int comparison.</p>
<p><b>Read-mostly data.</b> .NET 8's <code>FrozenDictionary</code>/<code>FrozenSet</code> (System.Collections.Frozen) spend more time at creation to analyse the keys and pick an optimal layout (e.g. hashing only part of a string), making lookups noticeably faster for configuration-like data that never changes. <b>Thread safety:</b> concurrent reads are safe; any concurrent write is not — use <code>ConcurrentDictionary</code> (module 10).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes counting/grouping loops instantly, but often with <code>ContainsKey</code> followed by an indexer (two lookups) or <code>d[k]</code> without a check. <b>Use AI as a partner:</b> ask it to "<i>reduce this to one lookup per item</i>" (TryGetValue, GetValueRefOrAddDefault) or "<i>is any code here relying on Dictionary order?</i>". <b>Where AI goes wrong:</b> it assumes enumeration order is insertion order, uses <code>ToLower()</code> on keys instead of a comparer (allocations and culture bugs, e.g. Turkish İ), and mutates objects used as keys. <b>What you still own:</b> choosing keys with stable equality and recognising when a hash structure is the wrong tool (ordering, ranges, nearest-neighbour queries).</p>`
  });

  topics[3].problems = [{
    title: 'First Repeated Word, Case-Insensitive',
    level: 'Easy', tags: ['HashSet', 'StringComparer', 'TryGetValue'], companies: ['Amazon', 'Microsoft', 'Grammarly'],
    statement: `<p>Implement <code>public static string FirstRepeated(string[] words)</code>: scanning left to right, find the first word that has already appeared earlier <b>ignoring case</b> (ordinal), and return the spelling of its <b>earlier</b> occurrence. Return <code>""</code> if no word repeats. Use a <code>HashSet&lt;string&gt;</code> with <code>StringComparer.OrdinalIgnoreCase</code> and its <code>TryGetValue</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; words are ASCII letters.`,
    example: `<p>["The", "cat", "saw", "the", "dog"] → <b>"The"</b> — "the" at index 3 repeats "The" from index 0.</p>`,
    brute: { why: `<p>For each word compare it with every earlier word using <code>string.Equals(a, b, StringComparison.OrdinalIgnoreCase)</code>: O(n²). Lower-casing everything into a <code>HashSet</code> works but allocates a new string per word and loses the original spelling.</p>`, code: `static string FirstRepeatedSlow(string[] words)
{
    for (int i = 0; i < words.Length; i++)
        for (int j = 0; j < i; j++)
            if (string.Equals(words[i], words[j], StringComparison.OrdinalIgnoreCase)) return words[j];
    return "";
}` },
    mcq: { q: 'How do you get back the stored spelling "The" when looking up "the" in a case-insensitive HashSet?', options: ['set.Contains("the") returns it', '<code>set.TryGetValue("the", out var actual)</code> returns the element already in the set', 'You cannot', 'Enumerate the set'], answer: 1, explain: 'HashSet&lt;T&gt;.TryGetValue (since .NET Core 2.0) returns the equal element that is stored, which matters when equality is looser than identity.' },
    hints: [`<p>Hint 1: <code>var seen = new HashSet&lt;string&gt;(StringComparer.OrdinalIgnoreCase);</code></p>`, `<p>Hint 2: For each word: <code>if (seen.TryGetValue(w, out var first)) return first; seen.Add(w);</code></p>`, `<p>Hint 3: Ordinal comparison avoids culture surprises; empty input returns "".</p>`],
    tests: { sig: 'string[] -> string', fn: 'FirstRepeated', cases: [
      [[["The", "cat", "saw", "the", "dog"]], "The"],
      [[[]], ""],
      [[["a"]], ""],
      [[["x", "y", "X", "y"]], "x"],
      [[["Apple", "APPLE", "apple"]], "Apple"],
      [[["one", "two", "three"]], ""],
      [[["ab", "AB", "cd", "CD"]], "ab"],
      [[{ $concat: [{ $rep: "w", n: 1 }, ["q", "W"]] }], "w"]
    ] },
    solution: {
      approach: `<p>One pass with a case-insensitive set. <code>TryGetValue</code> hands back the earlier spelling.</p>`,
      code: `public class Solution
{
    public static string FirstRepeated(string[] words)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var w in words)
        {
            if (seen.TryGetValue(w, out var first)) return first;   // the spelling stored earlier
            seen.Add(w);
        }
        return "";
    }
}`,
      dry: { head: ['word', 'in set (ignore case)?', 'set'], rows: [
        ['The', 'no', '{The}'],
        ['cat', 'no', '{The, cat}'],
        ['saw', 'no', '{The, cat, saw}'],
        ['the', H.c('g', 'yes → stored "The"'), 'return "The"']
      ] },
      complexity: `<p>O(total characters) time on average, O(n) space.</p>`,
      followUps: ['Return the index pair instead.', 'Why can ToLower() be wrong for Turkish text, and how does OrdinalIgnoreCase behave?']
    }
  }];

  /* ======================================================================
     TOPIC 5 — Sorted collections
     ====================================================================== */
  topics.push({
    title: 'SortedDictionary, SortedSet & SortedList — Order on Demand',
    analogy: `<p>A <b>library card catalogue</b> keeps cards in alphabetical order. Finding "Dickens" is quick (you jump around by letter), and you can also pull out <b>everything between "Da" and "Df"</b> or ask for the first and last card — things a coat check cannot do. Sorted collections trade O(1) hashing for O(log n) operations that keep everything in order.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> When you need keys in order, range queries, or the minimum/maximum while items come and go, use a sorted collection:</p>
${H.table(['Type', 'Structure', 'Insert / remove / find', 'Special powers'], [
  ['<code>SortedSet&lt;T&gt;</code>', 'red-black tree', 'O(log n)', '<code>Min</code>, <code>Max</code>, <code>GetViewBetween(lo, hi)</code>, <code>Reverse()</code>'],
  ['<code>SortedDictionary&lt;K, V&gt;</code>', 'red-black tree of pairs', 'O(log n)', 'enumerates by key; fast inserts anywhere'],
  ['<code>SortedList&lt;K, V&gt;</code>', 'two sorted arrays', 'find O(log n), insert/remove O(n)', 'index access <code>Keys[i]</code>, <code>IndexOfKey</code>, compact memory'],
  ['<code>PriorityQueue&lt;E, P&gt;</code> (topic 6)', 'binary heap', 'O(log n)', 'only the minimum is accessible']
])}
<p><b>Ordering</b> comes from <code>Comparer&lt;T&gt;.Default</code> (the type's <code>IComparable&lt;T&gt;</code>) or a comparer you pass to the constructor. The comparer also defines <b>equality</b>: two items comparing as 0 are "the same" and a SortedSet keeps only one — a classic bug when sorting people by age only.</p>
<p><b>No floor/ceiling methods?</b> Java's TreeMap has <code>floorKey</code>/<code>ceilingKey</code>. In .NET, use <code>set.GetViewBetween(lo, hi)</code> and read its <code>Min</code>/<code>Max</code>: the ceiling of x is <code>set.GetViewBetween(x, set.Max).Min</code> (guard for empty). Views are live and cost O(log n) to create.</p>`,
    clues: [
      '"in sorted order" + "items added and removed over time" → SortedSet / SortedDictionary',
      '"smallest/largest element that is ≥ x / ≤ x" (ceiling/floor) → <code>GetViewBetween</code>',
      '"any value within t of x in the last k items" → sliding SortedSet window',
      '"leaderboard", "order book", "calendar bookings" → sorted structures',
      '"only ever need the minimum" → PriorityQueue is simpler and faster',
      '"duplicates disappear from my SortedSet" → the comparer returned 0; add a tie-breaker'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Ranges, min/max and ordered iteration (runnable)', code: `var scores = new SortedSet<int> { 50, 10, 40, 30, 20 };
Console.WriteLine($"min {scores.Min}, max {scores.Max}");            // 10, 50
Console.WriteLine(string.Join(",", scores.GetViewBetween(15, 45)));   // 20,30,40
Console.WriteLine(Ceiling(scores, 33));                               // 40
Console.WriteLine(Floor(scores, 33));                                 // 30

var prices = new SortedDictionary<string, decimal> { ["pear"] = 3m, ["apple"] = 2m, ["fig"] = 5m };
foreach (var (fruit, price) in prices) Console.Write($"{fruit}:{price} ");   // alphabetical
Console.WriteLine();

var list = new SortedList<int, string> { [3] = "c", [1] = "a", [2] = "b" };
Console.WriteLine($"{list.Keys[0]} {list.Values[2]} {list.IndexOfKey(2)}");  // 1 c 1

// The comparer defines equality: people with the same age collapse into one!
var byAge = new SortedSet<(string Name, int Age)>(Comparer<(string Name, int Age)>.Create((a, b) => a.Age.CompareTo(b.Age)))
    { ("Asha", 30), ("Ben", 30) };
Console.WriteLine(byAge.Count);                                       // 1

static int? Ceiling(SortedSet<int> s, int x) => s.Count == 0 || x > s.Max ? null : s.GetViewBetween(x, s.Max).Min;
static int? Floor(SortedSet<int> s, int x) => s.Count == 0 || x < s.Min ? null : s.GetViewBetween(s.Min, x).Max;` }],
    codeTitle: ['Sorted collections'],
    viz: {
      title: 'SortedSet as a balanced tree: insert keeps order',
      input: '50 30 70 20 40 60 80',
      inputLabel: 'Values to insert (up to 12)',
      gen: function (input) {
        var a = ints(input, 'Enter up to 12 integers', 12);
        var frames = [], sorted = [];
        function build(s) {
          var arr = [];
          (function fill(lo, hi, idx) { if (lo > hi || idx > 30) return; var mid = (lo + hi) >> 1; arr[idx] = s[mid]; fill(lo, mid - 1, 2 * idx + 1); fill(mid + 1, hi, 2 * idx + 2); })(0, s.length - 1, 0);
          for (var i = 0; i < arr.length; i++) if (arr[i] === undefined) arr[i] = null;
          return arr;
        }
        a.forEach(function (v) {
          var dup = sorted.indexOf(v) >= 0;
          if (!dup) { sorted.push(v); sorted.sort(function (x, y) { return x - y; }); }
          var t = build(sorted), hl = {};
          t.forEach(function (x, i) { if (x === v) hl[i] = dup ? 'bad' : 'ok'; });
          frames.push({ narr: dup ? v + ' is already present (Compare returned 0): <b>Add returns false</b>, nothing changes.' : 'Add ' + v + ': walk down comparing (O(log n)), insert, and rebalance so the height stays about log₂n. In-order traversal is always sorted.', parts: [{ type: 'tree', label: 'balanced shape (conceptual red-black tree)', arr: t.slice(0, 31), hl: hl }, { type: 'array', label: 'in-order = enumeration order', values: sorted.slice() }] });
        });
        var lo = sorted[Math.floor(sorted.length / 4)], hi = sorted[Math.floor(3 * sorted.length / 4)];
        var view = sorted.filter(function (x) { return x >= lo && x <= hi; }), h2 = {};
        sorted.forEach(function (x, i) { if (x >= lo && x <= hi) h2[i] = 'win'; });
        frames.push({ narr: '<code>GetViewBetween(' + lo + ', ' + hi + ')</code> returns a live view of the range: ' + view.join(', ') + '. Its Min is the "ceiling" of ' + lo + ', its Max the "floor" of ' + hi + '.', parts: [{ type: 'array', label: 'range view', values: sorted.slice(), hl: h2 }, { type: 'vars', label: 'set', vals: { Min: sorted[0], Max: sorted[sorted.length - 1], Count: sorted.length } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Calendar booking with SortedSet neighbours', html: `<p>To accept a booking [start, end) only if it does not overlap, find the booking just before and just after the new start. With a SortedSet of (start, end) tuples ordered by start, <code>GetViewBetween</code> gives both neighbours in O(log n).</p>`, code: { lang: 'csharp', run: true, code: `var cal = new SortedSet<(int Start, int End)>();
Console.WriteLine(Book(cal, 10, 20));   // True
Console.WriteLine(Book(cal, 15, 25));   // False (overlaps 10-20)
Console.WriteLine(Book(cal, 20, 30));   // True  (touching is fine)

static bool Book(SortedSet<(int Start, int End)> cal, int s, int e)
{
    var after = cal.GetViewBetween((s, int.MinValue), (int.MaxValue, int.MaxValue));
    if (after.Count > 0 && after.Min.Start < e) return false;          // next booking starts too early
    var before = cal.GetViewBetween((int.MinValue, int.MinValue), (s, int.MinValue));
    if (before.Count > 0 && before.Max.End > s) return false;          // previous booking ends too late
    return cal.Add((s, e));
}` } },
      { title: 'SortedList when you need positions', html: `<p><code>SortedList</code> stores keys and values in parallel sorted arrays: lookups are binary searches and you can ask for the k-th key directly. Inserts in the middle shift arrays, so it suits small or mostly-sorted inputs.</p>`, code: { lang: 'csharp', run: true, code: `var ranks = new SortedList<int, string>();
foreach (var (score, name) in new[] { (88, "Ben"), (95, "Asha"), (70, "Cal") }) ranks.Add(score, name);
Console.WriteLine($"lowest {ranks.Values[0]}, median {ranks.Values[ranks.Count / 2]}, top {ranks.Values[^1]}");` } },
      { title: 'Descending order with a reversed comparer', html: `<p>Pass <code>Comparer&lt;T&gt;.Create((a, b) =&gt; b.CompareTo(a))</code>, or enumerate with <code>Reverse()</code> (SortedSet's own method, O(1) to start and lazy).</p>`, code: { lang: 'csharp', run: true, code: `var desc = new SortedSet<int>(Comparer<int>.Create((a, b) => b.CompareTo(a))) { 3, 1, 2 };
Console.WriteLine(string.Join(",", desc));                         // 3,2,1
var asc = new SortedSet<int> { 3, 1, 2 };
Console.WriteLine(string.Join(",", asc.Reverse()));                // 3,2,1` } }
    ],
    deepDive: `<p><b>🟣 Internals.</b> <code>SortedSet&lt;T&gt;</code> is a red-black tree (each node has a colour bit; rules keep the longest path at most twice the shortest, so height ≤ 2·log₂(n+1)). <code>SortedDictionary&lt;K, V&gt;</code> is implemented on top of a <code>TreeSet&lt;KeyValuePair&lt;K, V&gt;&gt;</code> comparing keys only. Each node is a separate heap object (about 40–48 bytes plus the item), so sorted trees use several times the memory of a hash table and have worse cache locality — expect each operation to be maybe 5–10× slower than a Dictionary lookup in practice.</p>
<p><b>Views.</b> <code>GetViewBetween</code> returns a <code>TreeSubSet</code> that shares nodes with the parent and filters by range. Its <code>Count</code> is computed by walking the range, which is O(k) on first access (it caches by version), so avoid calling Count on large views in a loop; use <code>Min</code>/<code>Max</code> or <code>Any()</code> style checks instead.</p>
<p><b>SortedList trade-off.</b> Two arrays mean excellent memory density and fast enumeration, but O(n) inserts. Building from already-sorted data is O(n) per insert at the end — actually O(1) amortised if appended in order. Use it for small maps or build-once-read-many data; use SortedDictionary for heavy random inserts.</p>
<p><b>Missing pieces.</b> No order-statistic tree (rank / k-th in O(log n)) and no multiset in the BCL. Workarounds: a SortedSet of <code>(value, uniqueId)</code> tuples for duplicates, a <code>SortedDictionary&lt;T, int&gt;</code> of counts, or a Fenwick tree when values are bounded integers.</p>`,
    aiEra: `<p><b>What AI changes:</b> models fluent in Java tend to translate TreeMap code and invent <code>FloorKey</code>/<code>CeilingKey</code> methods that .NET does not have. <b>Use AI as a partner:</b> ask it to translate a TreeMap algorithm using <code>GetViewBetween</code> correctly, or to generate edge-case tests for empty views. <b>Where AI goes wrong:</b> comparers that return 0 for distinct items (silently dropping data), calling <code>GetViewBetween</code> with lower &gt; upper (throws <code>ArgumentException</code>), and using SortedDictionary where only a minimum is needed. <b>What you still own:</b> recognising when order is a real requirement versus a convenience, and paying O(log n) only then.</p>`
  });

  topics[4].problems = [{
    title: 'Nearby Almost-Duplicate (Sliding SortedSet)',
    level: 'Hard', tags: ['SortedSet', 'GetViewBetween', 'sliding window', 'overflow'], companies: ['Google', 'Airbnb', 'Palantir'],
    statement: `<p>Implement <code>public static bool NearbyAlmostDuplicate(int[] nums, int k, int t)</code>: return true if there are indices i ≠ j with |i − j| ≤ k and |nums[i] − nums[j]| ≤ t. Use a <code>SortedSet&lt;long&gt;</code> holding the last k values and <code>GetViewBetween</code> to look for a value in [x − t, x + t].</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; values are any int; 0 ≤ k ≤ 10<sup>5</sup>; 0 ≤ t ≤ 2<sup>31</sup> − 1.`,
    example: `<p>([1, 2, 3, 1], k = 3, t = 0) → <b>true</b> (the two 1s are 3 apart). ([1, 5, 9, 1, 5, 9], 2, 3) → <b>false</b>.</p>`,
    brute: { why: `<p>Compare each element with the next k elements: O(n·k), up to 10<sup>10</sup>. Also, computing <code>nums[i] - nums[j]</code> in <code>int</code> overflows for extreme values.</p>`, code: `static bool Brute(int[] nums, int k, int t)
{
    for (int i = 0; i < nums.Length; i++)
        for (int j = i + 1; j < nums.Length && j - i <= k; j++)
            if (Math.Abs((long)nums[i] - nums[j]) <= t) return true;
    return false;
}` },
    mcq: { q: 'Why store values as long?', options: ['SortedSet requires long', 'x − t and x + t can overflow int (e.g. int.MinValue − t)', 'For speed', 'Because t is unsigned'], answer: 1, explain: 'With x = −2³¹ and t = 2³¹ − 1, x − t needs 33 bits. Using long keeps the range arithmetic exact.' },
    hints: [`<p>Hint 1: The window holds at most k previous values. Before adding nums[i], query the window.</p>`, `<p>Hint 2: <code>var view = window.GetViewBetween(x - t, x + t); if (view.Count &gt; 0) return true;</code> (both bounds as long).</p>`, `<p>Hint 3: After adding, if <code>i ≥ k</code> remove <code>nums[i - k]</code>. Duplicates inside the window already returned true, so the set never needs to hold two equal values.</p>`],
    tests: { sig: 'int[] int int -> bool', fn: 'NearbyAlmostDuplicate', cases: [
      [[[1, 2, 3, 1], 3, 0], true],
      [[[1, 0, 1, 1], 1, 2], true],
      [[[1, 5, 9, 1, 5, 9], 2, 3], false],
      [[[], 1, 1], false],
      [[[5], 1, 0], false],
      [[[-2147483648, 2147483647], 1, 2147483647], false],
      [[[1, 3, 6, 2], 1, 2], true],
      [[[4, 1, 6, 3], 3, 1], true],
      [[[4, 1, 6, 3], 3, 0], false],
      [[[1, 2], 0, 5], false],
      [[{ $range: [0, 200000, 2] }, 100000, 1], false]
    ] },
    solution: {
      approach: `<p>Maintain a sorted window of the last k values. For each new x, a range view [x − t, x + t] tells us in O(log k) whether any window value is close enough.</p>`,
      code: `public class Solution
{
    public static bool NearbyAlmostDuplicate(int[] nums, int k, int t)
    {
        if (k <= 0) return false;
        var window = new SortedSet<long>();
        for (int i = 0; i < nums.Length; i++)
        {
            long x = nums[i];
            if (window.GetViewBetween(x - t, x + t).Count > 0) return true;   // some value within t
            window.Add(x);
            if (i >= k) window.Remove(nums[i - k]);                            // keep at most k values
        }
        return false;
    }
}`,
      dry: { head: ['i', 'x', 'window before', 'view [x−t, x+t]', 'action'], rows: [
        ['0', '1', '{}', '[1,1] empty', 'add 1'],
        ['1', '2', '{1}', '[2,2] empty', 'add 2'],
        ['2', '3', '{1,2}', '[3,3] empty', 'add 3'],
        ['3', '1', '{1,2,3}', '[1,1] → {1}', H.c('g', 'return true')]
      ] },
      complexity: `<p>O(n log k) time, O(k) space. (Count on a view walks the range, but we return as soon as it is non-zero, and an empty range costs O(log k).)</p>`,
      followUps: ['Solve it in O(n) with buckets of width t + 1.', 'Return the pair of indices as well.']
    }
  }];

  /* ======================================================================
     TOPIC 6 — Queue, Stack, LinkedList, PriorityQueue
     ====================================================================== */
  topics.push({
    title: 'Queue, Stack, LinkedList & PriorityQueue',
    analogy: `<p>Four ways to line people up. A <b>bus queue</b>: first come, first served (Queue). A <b>stack of plates</b>: you take the one put down last (Stack). A <b>conga line</b>: anyone can join or leave anywhere if you are already holding their shoulder (LinkedList). A <b>hospital emergency room</b>: the most urgent patient goes next, whenever they arrived (PriorityQueue).</p>`,
    explain: `<p><b>🟢 The plain idea.</b></p>
${H.table(['Type', 'Order', 'Key operations (all O(1) unless noted)', 'Backed by'], [
  ['<code>Queue&lt;T&gt;</code>', 'FIFO', '<code>Enqueue</code>, <code>Dequeue</code>, <code>Peek</code>, <code>TryDequeue</code>', 'circular array'],
  ['<code>Stack&lt;T&gt;</code>', 'LIFO', '<code>Push</code>, <code>Pop</code>, <code>Peek</code>, <code>TryPop</code>', 'array'],
  ['<code>LinkedList&lt;T&gt;</code>', 'any', '<code>AddFirst/AddLast/AddBefore/AddAfter</code>, <code>Remove(node)</code>; <code>Find</code> is O(n)', 'doubly linked nodes'],
  ['<code>PriorityQueue&lt;TElement, TPriority&gt;</code> (.NET 6+)', 'smallest priority first', '<code>Enqueue(e, p)</code> O(log n), <code>Dequeue</code> O(log n), <code>Peek</code> O(1), <code>EnqueueDequeue</code>', '4-ary min-heap array']
])}
<p><b>Things that trip people up:</b></p>
<ul>
<li><code>Dequeue</code>/<code>Pop</code>/<code>Peek</code> on an empty collection throw <code>InvalidOperationException</code> — use the <code>Try…</code> versions.</li>
<li>Enumerating a <code>Stack&lt;T&gt;</code> goes from <b>top to bottom</b> (most recent first).</li>
<li><code>PriorityQueue</code> is a <b>min-heap</b>. For a max-heap pass a reversed comparer: <code>new PriorityQueue&lt;string, int&gt;(Comparer&lt;int&gt;.Create((a, b) =&gt; b.CompareTo(a)))</code>.</li>
<li><code>PriorityQueue</code> is <b>not stable</b>: equal priorities come out in no guaranteed order. Add a sequence number as a tie-breaker: priority <code>(p, seq++)</code>.</li>
<li>It has no "decrease key" and no <code>Remove(element)</code> on .NET 8 (.NET 9 adds Remove). For Dijkstra, enqueue duplicates and skip stale entries.</li>
<li><code>LinkedList&lt;T&gt;</code> is only O(1) when you <b>already hold the node</b> (<code>LinkedListNode&lt;T&gt;</code>). Keep node references in a dictionary — the LRU cache pattern.</li>
</ul>`,
    clues: [
      '"BFS", "process in arrival order", "sliding window of recent events" → <code>Queue&lt;T&gt;</code>',
      '"matching brackets", "undo", "DFS without recursion", "monotonic stack" → <code>Stack&lt;T&gt;</code>',
      '"k-th largest", "merge k sorted", "Dijkstra", "schedule by priority" → <code>PriorityQueue</code>',
      '"O(1) move-to-front / remove from the middle given a handle" → <code>LinkedList&lt;T&gt;</code> + dictionary of nodes (LRU)',
      '"deque / both ends" → <code>LinkedList&lt;T&gt;</code> (no built-in Deque type in .NET 8)',
      '"same priority must keep insertion order" → tie-breaker sequence number'
    ],
    code: [{ lang: 'csharp', run: true, title: 'All four in one place (runnable)', code: `var q = new Queue<string>(["a", "b"]);
q.Enqueue("c");
Console.WriteLine($"{q.Dequeue()} then {q.Peek()}");          // a then b

var st = new Stack<int>([1, 2, 3]);                           // pushes 1, 2, 3
Console.WriteLine(string.Join(",", st));                      // 3,2,1 (top first)
Console.WriteLine(st.TryPop(out var top) ? top : -1);         // 3

var line = new LinkedList<string>(["x", "z"]);
var xNode = line.First!;
line.AddAfter(xNode, "y");                                    // O(1) because we hold the node
line.AddFirst("w");
Console.WriteLine(string.Join(",", line));                    // w,x,y,z

var er = new PriorityQueue<string, int>();
er.Enqueue("sprained ankle", 3);
er.Enqueue("heart attack", 1);
er.Enqueue("broken arm", 2);
while (er.TryDequeue(out var patient, out var urgency)) Console.WriteLine($"{urgency}: {patient}");

var maxHeap = new PriorityQueue<int, int>(Comparer<int>.Create((a, b) => b.CompareTo(a)));
foreach (var x in new[] { 5, 9, 1 }) maxHeap.Enqueue(x, x);
Console.WriteLine(maxHeap.Peek());                            // 9` }],
    codeTitle: ['Queues, stacks, lists, heaps'],
    viz: {
      title: 'PriorityQueue as a heap: enqueue sifts up, dequeue sifts down',
      input: '5 3 8 1 9 2',
      inputLabel: 'Priorities to enqueue (up to 10)',
      gen: function (input) {
        var a = ints(input, 'Enter up to 10 integers', 10);
        var heap = [], frames = [];
        function tree() { var t = heap.slice(0, 15); return t; }
        a.forEach(function (v) {
          heap.push(v); var i = heap.length - 1, moves = 0;
          while (i > 0) { var p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; var tmp = heap[p]; heap[p] = heap[i]; heap[i] = tmp; i = p; moves++; }
          frames.push({ narr: 'Enqueue ' + v + ': put it at the end, then <b>sift up</b> while it is smaller than its parent (' + moves + ' swap' + (moves === 1 ? '' : 's') + '). The minimum is always at the root.', parts: [{ type: 'tree', label: 'min-heap (shown binary; .NET uses 4 children per node)', arr: tree(), hl: one(i, 'ok') }, { type: 'array', label: 'backing array', values: heap.slice(), hl: one(i, 'ok') }] });
        });
        var out = [];
        for (var r = 0; r < 3 && heap.length; r++) {
          var min = heap[0], last = heap.pop();
          if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, rr = l + 1, s = i; if (l < heap.length && heap[l] < heap[s]) s = l; if (rr < heap.length && heap[rr] < heap[s]) s = rr; if (s === i) break; var tmp = heap[s]; heap[s] = heap[i]; heap[i] = tmp; i = s; } }
          out.push(min);
          frames.push({ narr: 'Dequeue → <b>' + min + '</b>. Move the last element to the root and <b>sift down</b>, swapping with the smaller child. O(log n).', parts: [{ type: 'tree', label: 'heap after dequeue', arr: tree(), hl: one(0, 'cur') }, { type: 'queue', label: 'dequeued so far (ascending)', items: out.slice() }] });
        }
        frames.push({ narr: 'Note: the array is <b>not</b> sorted — only "parent ≤ children" holds. That is why Peek is O(1) but enumerating a PriorityQueue gives no useful order.', parts: [{ type: 'array', label: 'backing array', values: heap.slice() }] });
        return frames;
      }
    },
    examples: [
      { title: 'BFS with Queue<T>', html: `<p>Shortest path in an unweighted grid: a queue processes cells in order of distance.</p>`, code: { lang: 'csharp', run: true, code: `string[] grid = ["S.#", "..#", "#.E"];
var dist = new Dictionary<(int, int), int> { [(0, 0)] = 0 };
var q = new Queue<(int R, int C)>([(0, 0)]);
while (q.TryDequeue(out var cell))
{
    if (grid[cell.R][cell.C] == 'E') { Console.WriteLine($"steps: {dist[cell]}"); break; }
    foreach (var (dr, dc) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
    {
        var n = (R: cell.R + dr, C: cell.C + dc);
        if (n.R < 0 || n.C < 0 || n.R >= 3 || n.C >= 3 || grid[n.R][n.C] == '#' || dist.ContainsKey(n)) continue;
        dist[n] = dist[cell] + 1;
        q.Enqueue(n);
    }
}` } },
      { title: 'Stable priority with a sequence number', html: `<p>Equal priorities in a heap come out in arbitrary order. A tuple priority <code>(priority, sequence)</code> compares lexicographically, so ties break by arrival.</p>`, code: { lang: 'csharp', run: true, code: `var pq = new PriorityQueue<string, (int Priority, long Seq)>();
long seq = 0;
foreach (var (job, p) in new[] { ("email", 2), ("backup", 1), ("report", 2), ("deploy", 1) })
    pq.Enqueue(job, (p, seq++));
while (pq.TryDequeue(out var job, out _)) Console.Write(job + " ");   // backup deploy email report` } },
      { title: 'A deque with LinkedList<T>', html: `<p>.NET 8 has no Deque type. <code>LinkedList&lt;T&gt;</code> gives O(1) at both ends (with one node allocation per item). For hot paths, a circular array (like Queue's internals) is faster.</p>`, code: { lang: 'csharp', run: true, code: `var dq = new LinkedList<int>();
dq.AddLast(1); dq.AddLast(2); dq.AddFirst(0);
dq.RemoveLast();
Console.WriteLine($"{dq.First!.Value} {dq.Last!.Value} count={dq.Count}");   // 0 1 count=2` } }
    ],
    deepDive: `<p><b>🟣 Internals.</b> <code>Queue&lt;T&gt;</code> is a circular buffer with <code>_head</code> and <code>_tail</code> indexes that wrap around; it grows by doubling and copies the two segments in order. <code>Stack&lt;T&gt;</code> is simply an array plus a size. Both clear references on removal so the GC can collect them.</p>
<p><b>PriorityQueue&lt;TElement, TPriority&gt;</b> stores <code>(TElement, TPriority)</code> tuples in an array arranged as a <b>quaternary (4-ary) heap</b>: each node has up to four children, which makes the tree shallower (log₄n levels) and is more cache-friendly for sift-down. The comparer is used for priorities only; elements are never compared, so the element type needs no ordering. <code>EnqueueDequeue</code> and <code>DequeueEnqueue</code> combine operations with a single sift. The constructor taking a collection heapifies in O(n).</p>
<p><b>LinkedList&lt;T&gt;</b> is a circular doubly linked list (the head's Previous is the tail internally). Every node is a separate object with Next, Prev, List and Value fields — about 48 bytes of overhead per item on x64 plus poor cache locality, so iterating it is several times slower than a List. Its niche is O(1) splicing when you hold node references.</p>
<p><b>Concurrency.</b> None of these are thread-safe for writes. Use <code>ConcurrentQueue</code>, <code>ConcurrentStack</code>, <code>BlockingCollection</code> or <code>System.Threading.Channels</code> (module 10) for producer/consumer scenarios.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI translates Java/Python heap code to C# well, but older training data predates <code>PriorityQueue</code> (2021), so you still see hand-rolled heaps or <code>SortedSet</code> hacks. <b>Use AI as a partner:</b> ask "<i>rewrite this with PriorityQueue and a stable tie-breaker</i>" or "<i>does this BFS ever enqueue a node twice?</i>". <b>Where AI goes wrong:</b> it assumes PriorityQueue is a max-heap (like C++), assumes ties are FIFO, calls <code>Remove</code> or a decrease-key that do not exist on .NET 8, and uses <code>List.RemoveAt(0)</code> as a queue. <b>What you still own:</b> matching the access pattern (FIFO, LIFO, min, both ends, middle) to the structure — that choice decides the complexity of the whole algorithm.</p>`
  });

  topics[5].problems = [{
    title: 'Process Tasks by Priority, FIFO on Ties',
    level: 'Medium', tags: ['PriorityQueue', 'tie-breaker', 'tuples'], companies: ['Amazon', 'Uber', 'Microsoft'],
    statement: `<p>Each task is <code>"name priority"</code>. Lower priority numbers run first; tasks with equal priority must run in the order they were given. Implement <code>public static string[] ProcessOrder(string[] tasks)</code> using <code>PriorityQueue</code> — remember it is not stable on its own.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; priorities are ints.`,
    example: `<p>["a 2", "b 1", "c 2", "d 1"] → ["b", "d", "a", "c"].</p>`,
    brute: { why: `<p>Repeatedly scan the remaining list for the smallest priority (first one wins ties) and remove it: O(n²). A stable sort (<code>OrderBy</code>) also works offline, but a heap supports tasks arriving over time.</p>`, code: `static string[] SlowOrder(string[] tasks)
{
    var left = tasks.Select(t => t.Split(' ')).ToList(); var result = new List<string>();
    while (left.Count > 0)
    {
        int best = 0;
        for (int i = 1; i < left.Count; i++) if (int.Parse(left[i][1]) < int.Parse(left[best][1])) best = i;
        result.Add(left[best][0]); left.RemoveAt(best);
    }
    return result.ToArray();
}` },
    mcq: { q: 'What priority type makes the heap order stable?', options: ['int priority alone', '(int priority, int sequence) — tuples compare item by item', 'string', 'double priority + 0.5'], answer: 1, explain: 'ValueTuple implements IComparable lexicographically, so equal priorities are ordered by the unique, increasing sequence number.' },
    hints: [`<p>Hint 1: <code>var pq = new PriorityQueue&lt;string, (int, int)&gt;();</code></p>`, `<p>Hint 2: Enqueue <code>(name, (priority, index))</code>.</p>`, `<p>Hint 3: Drain with <code>while (pq.TryDequeue(out var name, out _))</code>.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'ProcessOrder', cases: [
      [[["a 2", "b 1", "c 2", "d 1"]], ["b", "d", "a", "c"]],
      [[[]], []],
      [[["x 5"]], ["x"]],
      [[["a 1", "b 1", "c 1", "d 1", "e 1"]], ["a", "b", "c", "d", "e"]],
      [[["p 3", "q 2", "r 1"]], ["r", "q", "p"]],
      [[["m -1", "n 0", "o -1"]], ["m", "o", "n"]],
      [[["z 2147483647", "y -2147483648", "x 0"]], ["y", "x", "z"]]
    ] },
    solution: {
      approach: `<p>A min-heap keyed by the tuple (priority, input index). Tuples compare the first field, then the second, which turns an unstable heap into a stable ordering.</p>`,
      code: `public class Solution
{
    public static string[] ProcessOrder(string[] tasks)
    {
        var pq = new PriorityQueue<string, (int Priority, int Seq)>(tasks.Length);
        for (int i = 0; i < tasks.Length; i++)
        {
            var p = tasks[i].Split(' ');
            pq.Enqueue(p[0], (int.Parse(p[1]), i));      // i breaks ties in arrival order
        }
        var result = new List<string>(tasks.Length);
        while (pq.TryDequeue(out var name, out _)) result.Add(name);
        return result.ToArray();
    }
}`,
      dry: { head: ['enqueue', 'priority key', 'heap min'], rows: [
        ['a 2', '(2, 0)', 'a'],
        ['b 1', '(1, 1)', 'b'],
        ['c 2', '(2, 2)', 'b'],
        ['d 1', '(1, 3)', 'b → dequeue order b, d, a, c']
      ] },
      complexity: `<p>O(n log n) time, O(n) space.</p>`,
      followUps: ['Tasks arrive over time with timestamps — simulate a single worker.', 'Implement "aging": raise priority of tasks that waited too long. Why is that awkward without decrease-key?']
    }
  }];

  /* ======================================================================
     TOPIC 7 — IEnumerable, IComparer and choosing a collection
     ====================================================================== */
  topics.push({
    title: 'IEnumerable<T>, IComparer<T> & Choosing the Right Collection',
    analogy: `<p>A <b>tour guide</b> does not need to know whether the museum is one hall or ten floors — she only needs "<i>show me the next exhibit</i>". That is <code>IEnumerable&lt;T&gt;</code>: anything that can hand out items one at a time. And a <b>judge at a contest</b> who decides which of two entries ranks higher is an <code>IComparer&lt;T&gt;</code>: the sorting machinery calls the judge, and swapping judges changes the ranking without touching the machinery.</p>`,
    explain: `<p><b>🟢 The collection interfaces</b>, from weakest to strongest:</p>
${H.table(['Interface', 'Gives you', 'Implemented by'], [
  ['<code>IEnumerable&lt;T&gt;</code>', '<code>foreach</code>, LINQ', 'everything (and iterator methods with <code>yield return</code>)'],
  ['<code>IReadOnlyCollection&lt;T&gt;</code>', '+ <code>Count</code>', 'all BCL collections'],
  ['<code>IReadOnlyList&lt;T&gt;</code>', '+ read-only indexer', 'arrays, <code>List&lt;T&gt;</code>, <code>ImmutableArray&lt;T&gt;</code>'],
  ['<code>ICollection&lt;T&gt;</code>', '+ Add, Remove, Contains, Clear', 'List, HashSet, LinkedList…'],
  ['<code>IList&lt;T&gt;</code>', '+ indexer set, Insert, RemoveAt', 'List, arrays (Add throws for arrays)'],
  ['<code>IDictionary&lt;K, V&gt;</code> / <code>IReadOnlyDictionary&lt;K, V&gt;</code>', 'key lookups', 'Dictionary, SortedDictionary…'],
  ['<code>ISet&lt;T&gt;</code> / <code>IReadOnlySet&lt;T&gt;</code>', 'set algebra', 'HashSet, SortedSet']
])}
<p><b>API rule:</b> <i>accept</i> the weakest interface you need (often <code>IEnumerable&lt;T&gt;</code> or <code>IReadOnlyList&lt;T&gt;</code>), <i>return</i> a specific or read-only type that tells callers what they can rely on.</p>
<p><b>Ordering:</b> <code>IComparable&lt;T&gt;</code> is a type's <b>natural</b> order (<code>int</code>, <code>string</code>, your <code>Version</code> class). <code>IComparer&lt;T&gt;</code> is an <b>external</b> ordering you pass to <code>Sort</code>, <code>SortedSet</code>, <code>PriorityQueue</code>, <code>OrderBy</code>. <code>CompareTo</code>/<code>Compare</code> return negative / zero / positive. Build comparers with <code>Comparer&lt;T&gt;.Create(lambda)</code>; never compute <code>a - b</code> (overflow) — use <code>a.CompareTo(b)</code>.</p>
<p><b>Choosing a collection</b> — ask what operation must be fast:</p>
${H.table(['Need', 'Pick'], [
  ['index access, append', '<code>T[]</code> / <code>List&lt;T&gt;</code>'],
  ['lookup by key / membership', '<code>Dictionary</code> / <code>HashSet</code>'],
  ['sorted order, ranges, floor/ceiling', '<code>SortedDictionary</code> / <code>SortedSet</code>'],
  ['FIFO / LIFO', '<code>Queue</code> / <code>Stack</code>'],
  ['repeated min/max extraction', '<code>PriorityQueue</code>'],
  ['O(1) insert/remove given a node', '<code>LinkedList</code> + dictionary'],
  ['never changes after creation', '<code>FrozenDictionary</code> / <code>FrozenSet</code> / <code>ImmutableArray</code>'],
  ['shared between threads', '<code>Concurrent*</code> collections, <code>Channel&lt;T&gt;</code>']
])}`,
    clues: [
      '"sort by a different key without changing the class" → <code>IComparer&lt;T&gt;</code> / <code>Comparer&lt;T&gt;.Create</code>',
      '"natural ordering of my type" → implement <code>IComparable&lt;T&gt;</code>',
      '"which collection would you use for…" → match the hot operation to the table',
      '"method parameter type: List or IEnumerable?" → accept the weakest interface you need',
      '"comparator returns a - b" → overflow bug; use CompareTo',
      '"expose a collection without letting callers modify it" → <code>IReadOnlyList&lt;T&gt;</code> / <code>AsReadOnly</code> / immutable'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Comparers, natural order and a custom IEnumerable (runnable)', code: `List<string> words = ["pear", "fig", "apple", "kiwi"];
words.Sort(new LengthThenOrdinal());
Console.WriteLine(string.Join(" ", words));                 // fig kiwi pear apple

var byLastChar = Comparer<string>.Create((a, b) => a[^1].CompareTo(b[^1]));
Console.WriteLine(string.Join(" ", words.Order(byLastChar)));   // apple fig kiwi pear (stable LINQ sort)

var versions = new List<Version2> { new(1, 10), new(1, 2), new(0, 9) };
versions.Sort();                                            // uses IComparable<Version2>
Console.WriteLine(string.Join(" ", versions));              // 0.9 1.2 1.10

foreach (var n in new Countdown(3)) Console.Write(n + " "); // 3 2 1
Console.WriteLine();
Console.WriteLine(new Countdown(4).Sum());                  // LINQ works on any IEnumerable<T>: 10

sealed class LengthThenOrdinal : IComparer<string>
{
    public int Compare(string? a, string? b)
    {
        int byLen = (a?.Length ?? 0).CompareTo(b?.Length ?? 0);
        return byLen != 0 ? byLen : string.CompareOrdinal(a, b);
    }
}

sealed record Version2(int Major, int Minor) : IComparable<Version2>
{
    public int CompareTo(Version2? other) =>
        other is null ? 1 : Major != other.Major ? Major.CompareTo(other.Major) : Minor.CompareTo(other.Minor);
    public override string ToString() => $"{Major}.{Minor}";
}

sealed class Countdown(int from) : IEnumerable<int>
{
    public IEnumerator<int> GetEnumerator()
    {
        for (int i = from; i >= 1; i--) yield return i;     // compiler builds the enumerator (module 6)
    }
    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() => GetEnumerator();
}` }],
    codeTitle: ['Interfaces and comparers'],
    viz: {
      title: 'Sorting with a comparer: every decision is a Compare call',
      input: 'pear fig apple kiwi',
      inputLabel: 'Words to sort by length, then ordinal (up to 7)',
      gen: function (input) {
        var a = words(input, 'Enter up to 7 words', 7);
        var frames = [], calls = 0;
        function cmp(x, y) { calls++; return x.length !== y.length ? x.length - y.length : (x < y ? -1 : x > y ? 1 : 0); }
        frames.push({ narr: 'Insertion sort for clarity (List.Sort uses introsort, but the comparer is used the same way). The comparer is the only place that knows the rule "length, then ordinal".', parts: [{ type: 'array', label: 'start', values: a.slice() }] });
        for (var i = 1; i < a.length; i++) {
          var j = i;
          while (j > 0) {
            var r = cmp(a[j - 1], a[j]), h = {}; h[j - 1] = 'cur'; h[j] = 'cur';
            frames.push({ narr: 'Compare("' + a[j - 1] + '", "' + a[j] + '") = <b>' + (r > 0 ? 'positive' : r < 0 ? 'negative' : 'zero') + '</b> → ' + (r > 0 ? 'swap.' : 'already in order, stop.'), parts: [{ type: 'array', label: 'array', values: a.slice(), hl: h }, { type: 'vars', label: 'comparer', vals: { left: a[j - 1] + ' (len ' + a[j - 1].length + ')', right: a[j] + ' (len ' + a[j].length + ')', calls: calls } }] });
            if (r <= 0) break;
            var t = a[j - 1]; a[j - 1] = a[j]; a[j] = t; j--;
          }
        }
        var hl = {}; a.forEach(function (_, k) { hl[k] = 'ok'; });
        frames.push({ narr: 'Sorted with ' + calls + ' Compare calls. Swap in a different IComparer and the same algorithm produces a different order.', parts: [{ type: 'array', label: 'sorted', values: a.slice(), hl: hl }] });
        return frames;
      }
    },
    examples: [
      { title: 'Accept IEnumerable, return IReadOnlyList', html: `<p>The method works with arrays, lists, sets or LINQ queries, and its result promises indexing and Count without allowing mutation through the interface.</p>`, code: { lang: 'csharp', run: true, code: `Console.WriteLine(string.Join(",", Evens(new HashSet<int> { 1, 2, 3, 4 })));
Console.WriteLine(Evens(Enumerable.Range(1, 10)).Count);

static IReadOnlyList<int> Evens(IEnumerable<int> source) => source.Where(x => x % 2 == 0).ToList();` } },
      { title: 'The subtraction comparator bug', html: `<p><code>(a, b) =&gt; a - b</code> overflows for large magnitudes and gives the wrong sign. With <code>int.MinValue</code> and 1 it says MinValue is larger.</p>`, code: { lang: 'csharp', run: true, code: `int[] xs = [1, int.MinValue, 0];
var wrong = (int[])xs.Clone();
Array.Sort(wrong, (a, b) => a - b);            // overflow: MinValue - 1 wraps to MaxValue
Console.WriteLine(string.Join(",", wrong));
Array.Sort(xs, (a, b) => a.CompareTo(b));      // correct
Console.WriteLine(string.Join(",", xs));` } },
      { title: 'Comparer composition', html: `<p>Build multi-key orderings from small comparers, or use LINQ <code>OrderBy(...).ThenBy(...)</code>, which is stable and reads well.</p>`, code: { lang: 'csharp', run: true, code: `var people = new[] { ("Asha", 30), ("Ben", 25), ("Al", 30) };
var sorted = people.OrderByDescending(p => p.Item2).ThenBy(p => p.Item1, StringComparer.Ordinal);
Console.WriteLine(string.Join(" ", sorted.Select(p => p.Item1)));   // Al Asha Ben` } }
    ],
    deepDive: `<p><b>🟣 foreach is pattern-based.</b> The compiler does not require <code>IEnumerable</code>: any type with an accessible <code>GetEnumerator()</code> returning something with <code>MoveNext()</code> and <code>Current</code> works. BCL collections return <b>struct enumerators</b> so <code>foreach (var x in list)</code> allocates nothing. The same loop over a variable typed <code>IEnumerable&lt;T&gt;</code> calls the interface method, which boxes the struct enumerator (one small allocation) and makes each MoveNext an interface call. In hot loops, iterate the concrete type.</p>
<p><b>Comparer contract.</b> A comparer must be a consistent total order: antisymmetric (sign(Compare(a, b)) = −sign(Compare(b, a))), transitive, and Compare(a, a) = 0. Introsort with a broken comparer may throw <code>InvalidOperationException</code> ("IComparer.Compare() method returns inconsistent results") or produce garbage. Random comparers for "shuffling" are a classic violation — use <code>Random.Shared.Shuffle</code> (.NET 8).</p>
<p><b>Default comparers.</b> <code>Comparer&lt;T&gt;.Default</code> uses <code>IComparable&lt;T&gt;</code> if implemented, else non-generic <code>IComparable</code>. For strings, the default is <b>culture-sensitive</b> (<code>string.Compare</code> with the current culture), which differs from ordinal: e.g. lower-case may sort before upper-case and some cultures treat character pairs specially. For identifiers and protocols, pass <code>StringComparer.Ordinal</code>.</p>
<p><b>Choosing by measurement.</b> Big-O picks the family; constants pick the winner. For under ~16 items, a linear scan over an array often beats a dictionary. Use BenchmarkDotNet (module 12) when it matters.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked "which collection should I use", AI gives a reasonable table — but it cannot see your access pattern unless you describe it. <b>Use AI as a partner:</b> describe the operations and their frequencies ("<i>10⁶ inserts, 10⁷ lookups, need sorted output once</i>") and ask for a recommendation with complexity; then verify with a benchmark. <b>Where AI goes wrong:</b> subtraction comparators, culture-sensitive string sorting where ordinal was needed, returning <code>List&lt;T&gt;</code> from public APIs that should return read-only views, and implementing <code>IComparable</code> inconsistently with Equals. <b>What you still own:</b> the access pattern and the contract your API exposes.</p>`
  });

  topics[6].problems = [{
    title: 'Sort Words with a Custom IComparer',
    level: 'Easy', tags: ['IComparer', 'sorting', 'ordinal'], companies: ['Microsoft', 'Adobe', 'Bloomberg'],
    statement: `<p>Implement a class <code>LengthThenOrdinal : IComparer&lt;string&gt;</code> that orders strings by length, then by ordinal (char code) comparison. Then implement <code>public static string[] SortByLength(string[] words)</code> that returns a sorted copy using <code>Array.Sort</code> with your comparer.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; ASCII strings.`,
    example: `<p>["pear", "fig", "apple", "kiwi"] → ["fig", "kiwi", "pear", "apple"]. ["aa", "B", "a", "AA"] → ["B", "a", "AA", "aa"] (ordinal: 'B' = 66 &lt; 'a' = 97).</p>`,
    brute: { why: `<p>Sorting with the default comparer gives culture-sensitive alphabetical order, not length order. Doing a selection sort by hand is O(n²). The comparer plugs the rule into the library's O(n log n) sort.</p>`, code: `static string[] DefaultSort(string[] words)
{
    var copy = (string[])words.Clone();
    Array.Sort(copy);                     // culture-aware alphabetical, ignores length
    return copy;
}` },
    mcq: { q: 'Why use string.CompareOrdinal rather than string.Compare for the tie-break?', options: ['Ordinal is culture-independent and compares char codes, giving the same result on every machine', 'It is the only one that compiles', 'Compare does not handle upper case', 'There is no difference'], answer: 0, explain: 'string.Compare uses the current culture, where "a" may sort before "B"; ordinal sorts by UTF-16 code units and is deterministic.' },
    hints: [`<p>Hint 1: <code>int byLen = a.Length.CompareTo(b.Length);</code></p>`, `<p>Hint 2: <code>return byLen != 0 ? byLen : string.CompareOrdinal(a, b);</code></p>`, `<p>Hint 3: Clone the array before sorting so the input is not modified. Handle nulls defensively in Compare (the interface allows them).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'SortByLength', cases: [
      [[["pear", "fig", "apple", "kiwi"]], ["fig", "kiwi", "pear", "apple"]],
      [[[]], []],
      [[["b", "a", "c"]], ["a", "b", "c"]],
      [[["aa", "B", "a", "AA"]], ["B", "a", "AA", "aa"]],
      [[["same", "same"]], ["same", "same"]],
      [[["zzz", "yy", "x", ""]], ["", "x", "yy", "zzz"]],
      [[["Zebra", "apple", "Apple", "zebra"]], ["Apple", "Zebra", "apple", "zebra"]]
    ] },
    solution: {
      approach: `<p>A two-key comparer: length first, ordinal second. Array.Sort uses it for every decision.</p>`,
      code: `public sealed class LengthThenOrdinal : IComparer<string>
{
    public int Compare(string? a, string? b)
    {
        if (ReferenceEquals(a, b)) return 0;
        if (a is null) return -1;
        if (b is null) return 1;
        int byLen = a.Length.CompareTo(b.Length);
        return byLen != 0 ? byLen : string.CompareOrdinal(a, b);
    }
}

public class Solution
{
    public static string[] SortByLength(string[] words)
    {
        var copy = (string[])words.Clone();
        Array.Sort(copy, new LengthThenOrdinal());
        return copy;
    }
}`,
      dry: { head: ['pair', 'length compare', 'ordinal', 'order'], rows: [
        ['fig vs pear', '3 &lt; 4', '—', 'fig first'],
        ['kiwi vs pear', '4 = 4', '\'k\' &lt; \'p\'', 'kiwi first'],
        ['pear vs apple', '4 &lt; 5', '—', 'pear first']
      ] },
      complexity: `<p>O(n log n · L) where L is the compared prefix length; O(n) for the copy.</p>`,
      followUps: ['Make the comparer a singleton (static readonly Instance) — why is that safe?', 'Sort descending by length but ascending alphabetically using one comparer.']
    }
  }];

  /* ============================ PRACTICE ============================ */
  practice.push({
    title: 'Contains Duplicate',
    level: 'Easy', tags: ['HashSet'], companies: ['Amazon', 'Apple', 'Adobe'],
    statement: `<p>Return <code>true</code> if any value appears at least twice in <code>nums</code>. Implement <code>public static bool ContainsDuplicate(int[] nums)</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; values are any int.`,
    example: `<p>[1, 2, 3, 1] → <b>true</b>; [1, 2, 3, 4] → <b>false</b>.</p>`,
    brute: { why: `<p>Compare all pairs: n(n−1)/2 ≈ 5·10<sup>9</sup> comparisons for n = 10<sup>5</sup>. The waste is re-scanning instead of remembering what was seen.</p>`, code: `static bool Brute(int[] a)
{
    for (int i = 0; i < a.Length; i++)
        for (int j = i + 1; j < a.Length; j++)
            if (a[i] == a[j]) return true;
    return false;
}` },
    mcq: { q: 'Which call answers "was x already there?" in one hash operation?', options: ['set.Contains(x) then set.Add(x)', 'the bool returned by set.Add(x)', 'list.IndexOf(x)', 'set.Count before and after'], answer: 1, explain: 'HashSet&lt;T&gt;.Add returns false when the item was already present.' },
    hints: [`<p>Hint 1: You only need membership — no counts, no order.</p>`, `<p>Hint 2: <code>if (!seen.Add(x)) return true;</code> — Add tells you whether x was new.</p>`, `<p>Hint 3: Pre-size with <code>new HashSet&lt;int&gt;(nums.Length)</code> to avoid rehashing.</p>`],
    tests: { sig: 'int[] -> bool', fn: 'ContainsDuplicate', cases: [
      [[[1, 2, 3, 1]], true], [[[1, 2, 3, 4]], false], [[[]], false], [[[0, 0]], true],
      [[[-1000000000, 1000000000]], false], [[{ $range: [0, 100000] }], false],
      [[{ $concat: [{ $range: [0, 99999] }, [0]] }], true]
    ] },
    solution: {
      approach: `<p>Insert into a HashSet; the first failed Add proves a duplicate.</p>`,
      code: `public class Solution
{
    public static bool ContainsDuplicate(int[] nums)
    {
        var seen = new HashSet<int>(nums.Length);
        foreach (int x in nums)
            if (!seen.Add(x)) return true;
        return false;
    }
}`,
      complexity: `<p>O(n) average time, O(n) space.</p>`,
      followUps: ['Within distance k (sliding HashSet of size k).', 'O(1) extra space: sort and compare neighbours.']
    }
  });

  practice.push({
    title: 'Valid Parentheses with Stack<char>',
    level: 'Easy', tags: ['Stack', 'Dictionary'], companies: ['Amazon', 'Meta', 'Bloomberg'],
    statement: `<p>Given a string of <code>()[]{}</code>, return true if every bracket is closed by the same type in the correct order. Implement <code>public static bool IsValid(string s)</code>.</p>`,
    constraints: `0 ≤ |s| ≤ 10<sup>5</sup>.`,
    example: `<p>"([]{})" → <b>true</b>; "([)]" → <b>false</b>; "" → <b>true</b>.</p>`,
    brute: { why: `<p>Repeatedly delete "()", "[]" and "{}" until nothing changes: each pass is O(n) and there can be n/2 passes → O(n²), plus a new string per replace.</p>`, code: `static bool Brute(string s)
{
    string prev;
    do { prev = s; s = s.Replace("()", "").Replace("[]", "").Replace("{}", ""); } while (s != prev);
    return s.Length == 0;
}` },
    mcq: { q: 'Which structure matches "the most recently opened bracket must close first"?', options: ['Queue', 'Stack', 'HashSet', 'SortedSet'], answer: 1, explain: 'Last opened, first closed is LIFO.' },
    hints: [`<p>Hint 1: Push opening brackets; on a closer, the top must be its partner.</p>`, `<p>Hint 2: <code>Dictionary&lt;char, char&gt; pairs = new() { [')'] = '(', [']'] = '[', ['}'] = '{' };</code></p>`, `<p>Hint 3: Fail on a closer with an empty stack; at the end the stack must be empty.</p>`],
    tests: { sig: 'string -> bool', fn: 'IsValid', cases: [
      [["()"], true], [["()[]{}"], true], [["(]"], false], [[""], true], [["(("], false],
      [["([)]"], false], [["{[]}"], true], [[")"], false],
      [[{ $concat: [{ $rep: "(", n: 50000 }, { $rep: ")", n: 50000 }] }], true]
    ] },
    solution: {
      approach: `<p>Stack of opening brackets; a dictionary maps each closer to its opener.</p>`,
      code: `public class Solution
{
    private static readonly Dictionary<char, char> Pairs = new() { [')'] = '(', [']'] = '[', ['}'] = '{' };

    public static bool IsValid(string s)
    {
        var stack = new Stack<char>();
        foreach (char c in s)
        {
            if (Pairs.TryGetValue(c, out char open))
            {
                if (!stack.TryPop(out char top) || top != open) return false;
            }
            else stack.Push(c);
        }
        return stack.Count == 0;
    }
}`,
      complexity: `<p>O(n) time, O(n) space in the worst case.</p>`,
      followUps: ['Return the index of the first error.', 'Minimum insertions to make it valid.']
    }
  });

  practice.push({
    title: 'First Unique Character',
    level: 'Easy', tags: ['Dictionary', 'array as map'], companies: ['Amazon', 'Bloomberg', 'Goldman Sachs'],
    statement: `<p>Return the index of the first character in <code>s</code> (lowercase a–z) that appears exactly once, or −1. Implement <code>public static int FirstUniqChar(string s)</code>, and think about why an <code>int[26]</code> beats a <code>Dictionary&lt;char, int&gt;</code> here.</p>`,
    constraints: `1 ≤ |s| ≤ 10<sup>5</sup>.`,
    example: `<p>"leetcode" → 0; "loveleetcode" → 2; "aabb" → −1.</p>`,
    brute: { why: `<p>Count each character's occurrences over the whole string for every index: O(n²).</p>`, code: `static int Brute(string s)
{
    for (int i = 0; i < s.Length; i++)
        if (s.Count(c => c == s[i]) == 1) return i;
    return -1;
}` },
    mcq: { q: 'Keys are exactly the 26 lowercase letters. The fastest counter is…', options: ['Dictionary&lt;char, int&gt;', 'SortedDictionary&lt;char, int&gt;', 'int[26] indexed by c − \'a\'', 'HashSet&lt;char&gt;'], answer: 2, explain: 'A dense, tiny key range is a perfect direct-address table: no hashing, no allocation.' },
    hints: [`<p>Hint 1: Two passes: count, then find the first count of 1.</p>`, `<p>Hint 2: <code>Span&lt;int&gt; cnt = stackalloc int[26];</code> is allocation-free.</p>`, `<p>Hint 3: For arbitrary Unicode, switch to a Dictionary.</p>`],
    tests: { sig: 'string -> int', fn: 'FirstUniqChar', cases: [
      [["leetcode"], 0], [["loveleetcode"], 2], [["aabb"], -1], [["z"], 0], [["abcabcd"], 6],
      [[{ $concat: [{ $rep: "a", n: 99999 }, "b"] }], 99999], [["xyzzyx"], -1]
    ] },
    solution: {
      approach: `<p>Direct-address counting in a stack-allocated span of 26 ints.</p>`,
      code: `public class Solution
{
    public static int FirstUniqChar(string s)
    {
        Span<int> cnt = stackalloc int[26];
        foreach (char c in s) cnt[c - 'a']++;
        for (int i = 0; i < s.Length; i++)
            if (cnt[s[i] - 'a'] == 1) return i;
        return -1;
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space.</p>`,
      followUps: ['First unique character in a stream (Queue + counts).', 'Return all unique characters in order.']
    }
  });

  practice.push({
    title: 'Intersection of Two Arrays',
    level: 'Easy', tags: ['HashSet', 'IntersectWith', 'sorting'], companies: ['Amazon', 'Meta', 'LinkedIn'],
    statement: `<p>Return the distinct values present in both arrays, sorted ascending. Implement <code>public static int[] Intersection(int[] a, int[] b)</code> using HashSet set operations.</p>`,
    constraints: `0 ≤ lengths ≤ 10<sup>5</sup>.`,
    example: `<p>([4, 9, 5], [9, 4, 9, 8, 4]) → [4, 9].</p>`,
    brute: { why: `<p>For every element of a, scan b (O(n·m)) and then deduplicate the result with another scan.</p>`, code: `static int[] Brute(int[] a, int[] b) => a.Where(x => b.Contains(x)).Distinct().OrderBy(x => x).ToArray();` },
    mcq: { q: 'Which HashSet method keeps only elements also in another collection, in place?', options: ['UnionWith', 'IntersectWith', 'ExceptWith', 'SymmetricExceptWith'], answer: 1, explain: 'IntersectWith removes everything not in the other collection.' },
    hints: [`<p>Hint 1: <code>var set = new HashSet&lt;int&gt;(a);</code></p>`, `<p>Hint 2: <code>set.IntersectWith(b);</code> keeps only values that also occur in b.</p>`, `<p>Hint 3: Sets have no order: copy to an array and sort.</p>`],
    tests: { sig: 'int[] int[] -> int[]', fn: 'Intersection', cases: [
      [[[1, 2, 2, 1], [2, 2]], [2]], [[[4, 9, 5], [9, 4, 9, 8, 4]], [4, 9]], [[[], [1]], []],
      [[[1, 2, 3], [4, 5]], []], [[[-1, 0, 1], [1, 0, -1, -1]], [-1, 0, 1]], [[[2147483647], [2147483647]], [2147483647]]
    ] },
    solution: {
      approach: `<p>Build a set from a, intersect with b, sort the survivors.</p>`,
      code: `public class Solution
{
    public static int[] Intersection(int[] a, int[] b)
    {
        var set = new HashSet<int>(a);
        set.IntersectWith(b);
        var result = set.ToArray();
        Array.Sort(result);
        return result;
    }
}`,
      complexity: `<p>O(n + m + k log k) time where k is the result size; O(n) space.</p>`,
      followUps: ['Keep duplicates (multiset intersection) with a Dictionary of counts.', 'Both inputs already sorted: two pointers with O(1) extra space.']
    }
  });

  practice.push({
    title: 'Group Anagrams',
    level: 'Medium', tags: ['Dictionary', 'List', 'string keys'], companies: ['Amazon', 'Uber', 'Goldman Sachs'],
    statement: `<p>Group words that are anagrams of each other. Implement <code>public static IList&lt;IList&lt;string&gt;&gt; GroupAnagrams(string[] words)</code> using a <code>Dictionary&lt;string, List&lt;string&gt;&gt;</code> keyed by a canonical signature. Groups and words within groups may be in any order; duplicates are kept.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>; words are lowercase, length ≤ 100.`,
    example: `<p>["eat", "tea", "tan", "ate", "nat", "bat"] → [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]].</p>`,
    brute: { why: `<p>Compare every word with every group representative by sorting both: O(n² · L log L).</p>`, code: `static bool IsAnagram(string a, string b) => a.Length == b.Length && a.Order().SequenceEqual(b.Order());` },
    mcq: { q: 'What makes a good dictionary key for an anagram group?', options: ['The first word seen', 'The sorted letters (or a 26-count signature) — identical for all anagrams', 'word.GetHashCode()', 'The word length'], answer: 1, explain: 'A canonical form that is equal exactly for anagrams turns grouping into a hash lookup.' },
    hints: [`<p>Hint 1: Signature = letters sorted: <code>var a = w.ToCharArray(); Array.Sort(a); new string(a)</code>.</p>`, `<p>Hint 2: <code>if (!groups.TryGetValue(key, out var list)) groups[key] = list = [];</code></p>`, `<p>Hint 3: Return <code>groups.Values.Cast&lt;IList&lt;string&gt;&gt;().ToList()</code> or build the list in a loop.</p>`],
    tests: { sig: 'string[] -> list<list<string>>', fn: 'GroupAnagrams', cmp: 'sets', cases: [
      [[["eat", "tea", "tan", "ate", "nat", "bat"]], [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]],
      [[[""]], [[""]]], [[["a"]], [["a"]]], [[[]], []],
      [[["abc", "bca", "cab", "xyz"]], [["abc", "bca", "cab"], ["xyz"]]],
      [[["ab", "ba", "ab"]], [["ab", "ba", "ab"]]],
      [[["a", "b", "c"]], [["a"], ["b"], ["c"]]]
    ] },
    solution: {
      approach: `<p>Canonical key (sorted letters) → list of words. One pass.</p>`,
      code: `public class Solution
{
    public static IList<IList<string>> GroupAnagrams(string[] words)
    {
        var groups = new Dictionary<string, List<string>>();
        foreach (var w in words)
        {
            var letters = w.ToCharArray();
            Array.Sort(letters);
            var key = new string(letters);
            if (!groups.TryGetValue(key, out var list)) groups[key] = list = [];
            list.Add(w);
        }
        var result = new List<IList<string>>(groups.Count);
        foreach (var g in groups.Values) result.Add(g);
        return result;
    }
}`,
      complexity: `<p>O(n · L log L) time, O(n · L) space.</p>`,
      followUps: ['Use a 26-count signature to make it O(n · L).', 'Use LINQ GroupBy — when is the manual version better?']
    }
  });

  practice.push({
    title: 'Top K Frequent Elements',
    level: 'Medium', tags: ['Dictionary', 'PriorityQueue'], companies: ['Amazon', 'Meta', 'Yelp'],
    statement: `<p>Return the k most frequent values (any order). The answer is unique. Implement <code>public static int[] TopKFrequent(int[] nums, int k)</code> with a counting dictionary and a size-k min-heap keyed by frequency.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; 1 ≤ k ≤ number of distinct values.`,
    example: `<p>([1, 1, 1, 2, 2, 3], 2) → [1, 2].</p>`,
    brute: { why: `<p>Count, then sort all distinct values by count: O(d log d). Fine, but the heap version is O(d log k) and works on streams.</p>`, code: `static int[] Brute(int[] nums, int k) =>
    nums.GroupBy(x => x).OrderByDescending(g => g.Count()).Take(k).Select(g => g.Key).ToArray();` },
    mcq: { q: 'In the size-k heap, the priority should be…', options: ['the value', 'the frequency, as a min-heap, so the least frequent of the current top k is evicted first', 'the index', 'negative value'], answer: 1, explain: 'The root is the weakest candidate; anything more frequent replaces it.' },
    hints: [`<p>Hint 1: Count with <code>CollectionsMarshal.GetValueRefOrAddDefault</code> or GetValueOrDefault.</p>`, `<p>Hint 2: <code>pq.Enqueue(value, count); if (pq.Count &gt; k) pq.Dequeue();</code></p>`, `<p>Hint 3: Bucket sort by frequency gives O(n).</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'TopKFrequent', cmp: 'set', cases: [
      [[[1, 1, 1, 2, 2, 3], 2], [1, 2]], [[[1], 1], [1]], [[[4, 4, -1, -1, -1, 7], 1], [-1]],
      [[[5, 5, 6, 6, 6, 7, 7, 7, 7], 3], [7, 6, 5]], [[[0, 0, 0], 1], [0]], [[[1, 2, 2, 3, 3, 3], 2], [3, 2]]
    ] },
    solution: {
      approach: `<p>Frequency map, then a min-heap of (value, frequency) capped at k.</p>`,
      code: `using System.Runtime.InteropServices;

public class Solution
{
    public static int[] TopKFrequent(int[] nums, int k)
    {
        var count = new Dictionary<int, int>();
        foreach (int x in nums) CollectionsMarshal.GetValueRefOrAddDefault(count, x, out _)++;
        var pq = new PriorityQueue<int, int>();
        foreach (var (value, freq) in count)
        {
            pq.Enqueue(value, freq);
            if (pq.Count > k) pq.Dequeue();        // drop the least frequent
        }
        var result = new int[pq.Count];
        for (int i = 0; i < result.Length; i++) result[i] = pq.Dequeue();
        return result;
    }
}`,
      complexity: `<p>O(n + d log k) time, O(d) space for d distinct values.</p>`,
      followUps: ['Top k frequent words with alphabetical tie-break.', 'Streaming version with approximate counts (Count-Min Sketch).']
    }
  });

  practice.push({
    title: 'Sliding Window Maximum (Deque)',
    level: 'Medium', tags: ['LinkedList as deque', 'monotonic queue'], companies: ['Amazon', 'Google', 'Citadel'],
    statement: `<p>Return the maximum of every window of size k. Implement <code>public static int[] MaxSlidingWindow(int[] nums, int k)</code> with a <code>LinkedList&lt;int&gt;</code> used as a deque of indices whose values are decreasing.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>.`,
    example: `<p>([1, 3, −1, −3, 5, 3, 6, 7], 3) → [3, 3, 5, 5, 6, 7].</p>`,
    brute: { why: `<p>Scan each window: O(n·k) = 10<sup>10</sup> in the worst case.</p>`, code: `static int[] Brute(int[] a, int k)
{
    var r = new int[a.Length - k + 1];
    for (int i = 0; i < r.Length; i++) r[i] = a.Skip(i).Take(k).Max();
    return r;
}` },
    mcq: { q: 'Why can an index be dropped from the back of the deque when a larger value arrives?', options: ['It is outside the window', 'It can never be the maximum again: the newer, larger value outlives it in every future window', 'To save memory only', 'Because the deque must be sorted by index'], answer: 1, explain: 'A smaller, older element is dominated forever.' },
    hints: [`<p>Hint 1: Front of the deque = index of the current maximum.</p>`, `<p>Hint 2: Before adding i, pop from the back while <code>nums[back] &lt;= nums[i]</code>; pop the front if it left the window (<code>front &lt;= i - k</code>).</p>`, `<p>Hint 3: Each index enters and leaves once → O(n).</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'MaxSlidingWindow', cases: [
      [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [3, 3, 5, 5, 6, 7]], [[[1], 1], [1]], [[[9, 8, 7, 6], 2], [9, 8, 7]],
      [[[1, 2, 3, 4], 4], [4]], [[[4, 4, 4], 2], [4, 4]], [[[-5, -1, -3], 1], [-5, -1, -3]],
      [[[2147483647, -2147483648], 2], [2147483647]], [[{ $range: [0, 100000] }, 100000], [99999]]
    ] },
    solution: {
      approach: `<p>Monotonic deque of indices (values decreasing from front to back) built on LinkedList&lt;int&gt;.</p>`,
      code: `public class Solution
{
    public static int[] MaxSlidingWindow(int[] nums, int k)
    {
        var dq = new LinkedList<int>();                 // indices; values decreasing front -> back
        var result = new int[nums.Length - k + 1];
        for (int i = 0; i < nums.Length; i++)
        {
            while (dq.Count > 0 && nums[dq.Last!.Value] <= nums[i]) dq.RemoveLast();   // dominated
            dq.AddLast(i);
            if (dq.First!.Value <= i - k) dq.RemoveFirst();                           // left the window
            if (i >= k - 1) result[i - k + 1] = nums[dq.First.Value];
        }
        return result;
    }
}`,
      complexity: `<p>O(n) time (each index added and removed at most once), O(k) space.</p>`,
      followUps: ['Replace LinkedList with a circular int[] buffer for fewer allocations.', 'Sliding window minimum and the "shortest subarray with sum ≥ K" problem.']
    }
  });

  practice.push({
    title: 'LRU Cache (Dictionary + LinkedList)',
    level: 'Medium', tags: ['Dictionary', 'LinkedList', 'design'], companies: ['Amazon', 'Microsoft', 'Netflix'],
    statement: `<p>Design <code>LRUCache</code> with a capacity: <code>int Get(int key)</code> returns the value or −1 and marks the key as most recently used; <code>void Put(int key, int value)</code> inserts or updates and, if the cache exceeds capacity, evicts the least recently used key. Both must be O(1).</p>`,
    constraints: `1 ≤ capacity ≤ 3000; up to 2·10<sup>5</sup> calls.`,
    example: `<p>LRUCache(2): Put(1,1), Put(2,2), Get(1) → 1, Put(3,3) evicts 2, Get(2) → −1.</p>`,
    brute: { why: `<p>A <code>List&lt;(int key, int value)&gt;</code> ordered by recency: finding a key and moving it to the front are O(n) each.</p>`, code: `sealed class SlowLru(int capacity)
{
    private readonly List<(int Key, int Value)> _items = new();
    public int Get(int key)
    {
        int i = _items.FindIndex(p => p.Key == key);        // O(n)
        if (i < 0) return -1;
        var item = _items[i]; _items.RemoveAt(i); _items.Add(item);
        return item.Value;
    }
}` },
    mcq: { q: 'Why store LinkedListNode references in the dictionary instead of values?', options: ['To save memory', 'So the node can be moved or removed in O(1) — LinkedList.Remove(value) would be O(n)', 'Because Dictionary cannot hold ints', 'For thread safety'], answer: 1, explain: 'Remove(node), AddFirst(node) and AddLast(node) are O(1); finding a node by value is O(n).' },
    hints: [`<p>Hint 1: <code>Dictionary&lt;int, LinkedListNode&lt;(int Key, int Value)&gt;&gt;</code> plus a <code>LinkedList&lt;(int Key, int Value)&gt;</code> ordered most-recent first.</p>`, `<p>Hint 2: On Get/Put of an existing key: <code>list.Remove(node); list.AddFirst(node);</code></p>`, `<p>Hint 3: On overflow evict <code>list.Last</code> and remove its key from the dictionary.</p>`],
    tests: { cls: 'LRUCache', sigs: { LRUCache: 'int', put: 'int int -> void', get: 'int -> int' }, cases: [
      { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]], out: [null, null, null, 1, null, -1, null, -1, 3, 4] },
      { ops: ['LRUCache', 'put', 'get', 'put', 'get', 'get'], args: [[1], [2, 1], [2], [3, 2], [2], [3]], out: [null, null, 1, null, -1, 2] },
      { ops: ['LRUCache', 'get', 'put', 'put', 'get'], args: [[2], [1], [1, 5], [1, 6], [1]], out: [null, -1, null, null, 6] },
      { ops: ['LRUCache', 'put', 'put', 'put', 'put', 'get', 'get'], args: [[2], [2, 1], [1, 1], [2, 3], [4, 1], [1], [2]], out: [null, null, null, null, null, -1, 3] },
      { ops: ['LRUCache', 'put', 'put', 'put', 'get', 'put', 'get', 'get', 'get', 'get'], args: [[3], [1, 1], [2, 2], [3, 3], [1], [4, 4], [2], [3], [4], [1]], out: [null, null, null, null, 1, null, -1, 3, 4, 1] },
      { ops: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'get', 'put', 'get'], args: [[2], [1, 1], [2, 2], [1], [3, 3], [2], [3], [1, 10], [1]], out: [null, null, null, 1, null, -1, 3, null, 10] }
    ] },
    solution: {
      approach: `<p>The dictionary finds a node in O(1); the linked list keeps recency order and moves nodes in O(1).</p>`,
      code: `public sealed class LRUCache
{
    private readonly int _capacity;
    private readonly Dictionary<int, LinkedListNode<(int Key, int Value)>> _map = new();
    private readonly LinkedList<(int Key, int Value)> _order = new();   // most recent first

    public LRUCache(int capacity) => _capacity = capacity;

    public int Get(int key)
    {
        if (!_map.TryGetValue(key, out var node)) return -1;
        _order.Remove(node);            // O(1): we hold the node
        _order.AddFirst(node);
        return node.Value.Value;
    }

    public void Put(int key, int value)
    {
        if (_map.TryGetValue(key, out var node))
        {
            node.Value = (key, value);
            _order.Remove(node);
            _order.AddFirst(node);
            return;
        }
        _map[key] = _order.AddFirst((key, value));
        if (_map.Count > _capacity)
        {
            var lru = _order.Last!;
            _order.RemoveLast();
            _map.Remove(lru.Value.Key);
        }
    }
}`,
      complexity: `<p>O(1) average per operation; O(capacity) memory.</p>`,
      followUps: ['Make it thread-safe — lock or ConcurrentDictionary? Why is ConcurrentDictionary alone not enough?', 'LFU cache: evict the least frequently used.']
    }
  });

  practice.push({
    title: 'Recent Counter with Queue<int>',
    level: 'Medium', tags: ['Queue', 'sliding window', 'design'], companies: ['Google', 'Amazon', 'Datadog'],
    statement: `<p>Design <code>RecentCounter</code>: <code>int Ping(int t)</code> records a request at time t (milliseconds, strictly increasing between calls) and returns how many requests happened in the inclusive window [t − 3000, t].</p>`,
    constraints: `1 ≤ t ≤ 10<sup>9</sup>; up to 10<sup>4</sup> calls.`,
    example: `<p>Ping(1) → 1, Ping(100) → 2, Ping(3001) → 3, Ping(3002) → 3 (time 1 has fallen out).</p>`,
    brute: { why: `<p>Keep every timestamp in a list and count those in range on each call: O(n) per call and unbounded memory.</p>`, code: `sealed class SlowCounter
{
    private readonly List<int> _all = new();
    public int Ping(int t) { _all.Add(t); return _all.Count(x => x >= t - 3000); }
}` },
    mcq: { q: 'Why does a Queue fit?', options: ['Old timestamps leave from the front in the same order they arrived', 'It sorts timestamps', 'It allows random access', 'It is thread-safe'], answer: 0, explain: 'Times arrive increasing, so the oldest is always at the front: FIFO eviction.' },
    hints: [`<p>Hint 1: Enqueue every t; the queue holds exactly the requests inside the window.</p>`, `<p>Hint 2: <code>while (q.Peek() &lt; t - 3000) q.Dequeue();</code></p>`, `<p>Hint 3: Return <code>q.Count</code>. Each timestamp is enqueued and dequeued once.</p>`],
    tests: { cls: 'RecentCounter', sigs: { RecentCounter: '', ping: 'int -> int' }, cases: [
      { ops: ['RecentCounter', 'ping', 'ping', 'ping', 'ping'], args: [[], [1], [100], [3001], [3002]], out: [null, 1, 2, 3, 3] },
      { ops: ['RecentCounter', 'ping'], args: [[], [5]], out: [null, 1] },
      { ops: ['RecentCounter', 'ping', 'ping', 'ping', 'ping'], args: [[], [1], [3001], [3002], [6002]], out: [null, 1, 2, 2, 2] },
      { ops: ['RecentCounter', 'ping', 'ping', 'ping', 'ping', 'ping'], args: [[], [1000], [2000], [3000], [4000], [5000]], out: [null, 1, 2, 3, 4, 4] },
      { ops: ['RecentCounter', 'ping', 'ping'], args: [[], [1], [10000]], out: [null, 1, 1] },
      { ops: ['RecentCounter', 'ping', 'ping', 'ping', 'ping'], args: [[], [3000], [3001], [6001], [6002]], out: [null, 1, 2, 2, 2] },
      { ops: ['RecentCounter', 'ping', 'ping'], args: [[], [999999999], [1000000000]], out: [null, 1, 2] }
    ] },
    solution: {
      approach: `<p>A FIFO queue of timestamps inside the window; evict from the front before answering.</p>`,
      code: `public sealed class RecentCounter
{
    private readonly Queue<int> _q = new();

    public int Ping(int t)
    {
        _q.Enqueue(t);
        while (_q.Peek() < t - 3000) _q.Dequeue();    // older than the window
        return _q.Count;
    }
}`,
      complexity: `<p>Amortised O(1) per call; O(w) memory for w requests in the window.</p>`,
      followUps: ['Rate limiter: reject when more than N requests in the window.', 'Millions of requests per second: switch to per-second buckets in a circular array.']
    }
  });

  practice.push({
    title: 'Time-Based Key-Value Store',
    level: 'Medium', tags: ['Dictionary', 'List', 'binary search'], companies: ['Netflix', 'Lyft', 'Google'],
    statement: `<p>Design <code>TimeMap</code>: <code>void Set(string key, string value, int timestamp)</code> stores a value (timestamps passed to Set are strictly increasing), and <code>string Get(string key, int timestamp)</code> returns the value set for key with the largest timestamp ≤ the given one, or "" if none. Keys are case-sensitive.</p>`,
    constraints: `Up to 2·10<sup>5</sup> calls; 1 ≤ timestamp ≤ 10<sup>9</sup>.`,
    example: `<p>Set("foo", "bar", 1); Get("foo", 3) → "bar"; Set("foo", "bar2", 4); Get("foo", 4) → "bar2".</p>`,
    brute: { why: `<p>Scan all of a key's versions on each Get: O(v). With timestamps already sorted, binary search gives O(log v).</p>`, code: `static string ScanGet(List<(int T, string V)> versions, int t)
{
    string best = "";
    foreach (var (ts, v) in versions) if (ts <= t) best = v;
    return best;
}` },
    mcq: { q: 'Versions for a key are appended with increasing timestamps. To find the last one ≤ t you use…', options: ['A HashSet', 'Binary search on the list (upper bound − 1)', 'Sort on every Get', 'A Stack'], answer: 1, explain: 'Appending in increasing order keeps the list sorted for free.' },
    hints: [`<p>Hint 1: <code>Dictionary&lt;string, List&lt;(int T, string V)&gt;&gt;</code>.</p>`, `<p>Hint 2: Binary search for the first timestamp &gt; t; the answer is the element before it.</p>`, `<p>Hint 3: Missing key or all timestamps &gt; t → "".</p>`],
    tests: { cls: 'TimeMap', sigs: { TimeMap: '', set: 'string string int -> void', get: 'string int -> string' }, cases: [
      { ops: ['TimeMap', 'set', 'get', 'get', 'set', 'get', 'get'], args: [[], ['foo', 'bar', 1], ['foo', 1], ['foo', 3], ['foo', 'bar2', 4], ['foo', 4], ['foo', 5]], out: [null, null, 'bar', 'bar', null, 'bar2', 'bar2'] },
      { ops: ['TimeMap', 'get'], args: [[], ['x', 1]], out: [null, ''] },
      { ops: ['TimeMap', 'set', 'get', 'get'], args: [[], ['a', 'v1', 5], ['a', 4], ['a', 5]], out: [null, null, '', 'v1'] },
      { ops: ['TimeMap', 'set', 'set', 'get', 'get', 'get'], args: [[], ['a', 'x', 1], ['b', 'y', 2], ['a', 2], ['b', 1], ['b', 2]], out: [null, null, null, 'x', '', 'y'] },
      { ops: ['TimeMap', 'set', 'set', 'set', 'get', 'get', 'get'], args: [[], ['k', 'v1', 10], ['k', 'v2', 20], ['k', 'v3', 30], ['k', 25], ['k', 9], ['k', 1000000000]], out: [null, null, null, null, 'v2', '', 'v3'] },
      { ops: ['TimeMap', 'set', 'get', 'get'], args: [[], ['k', 'a', 1], ['K', 1], ['k', 1]], out: [null, null, '', 'a'] }
    ] },
    solution: {
      approach: `<p>Per key, an append-only list sorted by timestamp; Get does an upper-bound binary search.</p>`,
      code: `public sealed class TimeMap
{
    private readonly Dictionary<string, List<(int T, string V)>> _data = new();

    public void Set(string key, string value, int timestamp)
    {
        if (!_data.TryGetValue(key, out var list)) _data[key] = list = [];
        list.Add((timestamp, value));                 // timestamps increase, so the list stays sorted
    }

    public string Get(string key, int timestamp)
    {
        if (!_data.TryGetValue(key, out var list)) return "";
        int lo = 0, hi = list.Count;                   // first index with T > timestamp
        while (lo < hi)
        {
            int mid = lo + (hi - lo) / 2;
            if (list[mid].T <= timestamp) lo = mid + 1; else hi = mid;
        }
        return lo == 0 ? "" : list[lo - 1].V;
    }
}`,
      complexity: `<p>Set O(1) amortised, Get O(log v); memory O(total sets).</p>`,
      followUps: ['Timestamps may arrive out of order — which structure now? (SortedList per key)', 'Expire versions older than a TTL.']
    }
  });

  practice.push({
    title: 'Merge K Sorted Arrays',
    level: 'Hard', tags: ['PriorityQueue', 'k-way merge'], companies: ['Google', 'Amazon', 'Databricks'],
    statement: `<p>Merge k sorted int arrays into one sorted array. Implement <code>public static int[] MergeK(int[][] arrays)</code> with a <code>PriorityQueue</code> holding one cursor per array.</p>`,
    constraints: `0 ≤ k ≤ 10<sup>4</sup>; total length N ≤ 10<sup>5</sup>; each array sorted ascending.`,
    example: `<p>[[1, 4, 5], [1, 3, 4], [2, 6]] → [1, 1, 2, 3, 4, 4, 5, 6].</p>`,
    brute: { why: `<p>Concatenate and sort: O(N log N). Merging pairwise one after another is O(N·k). The heap merge is O(N log k) and also works for streams that do not fit in memory.</p>`, code: `static int[] Brute(int[][] arrays) => arrays.SelectMany(a => a).Order().ToArray();` },
    mcq: { q: 'What goes into the heap?', options: ['All N values', 'One entry per array: (array index, position), prioritised by the current value', 'Only the first array', 'The array lengths'], answer: 1, explain: 'The heap holds the current head of each array, so it never exceeds k entries.' },
    hints: [`<p>Hint 1: <code>PriorityQueue&lt;(int Arr, int Pos), int&gt;</code>.</p>`, `<p>Hint 2: Seed with each non-empty array's position 0.</p>`, `<p>Hint 3: Dequeue, output, and enqueue the next position of the same array if any.</p>`],
    tests: { sig: 'int[][] -> int[]', fn: 'MergeK', cases: [
      [[[[1, 4, 5], [1, 3, 4], [2, 6]]], [1, 1, 2, 3, 4, 4, 5, 6]], [[[]], []], [[[[]]], []], [[[[], [1]]], [1]],
      [[[[-3, -1], [-2], [0, 0]]], [-3, -2, -1, 0, 0]], [[[[5], [4], [3], [2], [1]]], [1, 2, 3, 4, 5]],
      [[[[2147483647], [-2147483648]]], [-2147483648, 2147483647]]
    ] },
    solution: {
      approach: `<p>A min-heap of cursors, one per array, prioritised by the value under the cursor.</p>`,
      code: `public class Solution
{
    public static int[] MergeK(int[][] arrays)
    {
        int total = 0;
        var pq = new PriorityQueue<(int Arr, int Pos), int>();
        for (int i = 0; i < arrays.Length; i++)
        {
            total += arrays[i].Length;
            if (arrays[i].Length > 0) pq.Enqueue((i, 0), arrays[i][0]);
        }
        var result = new int[total];
        int w = 0;
        while (pq.TryDequeue(out var cur, out int value))
        {
            result[w++] = value;
            int next = cur.Pos + 1;
            if (next < arrays[cur.Arr].Length) pq.Enqueue((cur.Arr, next), arrays[cur.Arr][next]);
        }
        return result;
    }
}`,
      complexity: `<p>O(N log k) time, O(k) heap space plus the output.</p>`,
      followUps: ['Merge k sorted linked lists.', 'External sort: merge sorted chunk files with the same idea.']
    }
  });

  practice.push({
    title: 'Sliding Window Median (Two SortedSets)',
    level: 'Hard', tags: ['SortedSet', 'tuples', 'two halves'], companies: ['Google', 'Two Sigma', 'Amazon'],
    statement: `<p>Return the median of every window of size k (for even k, the mean of the two middle values, as a double). Implement <code>public static double[] MedianSlidingWindow(int[] nums, int k)</code>. .NET has no multiset, so store <code>(value, index)</code> tuples in two <code>SortedSet</code>s: a lower half and an upper half.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>; values are any int.`,
    example: `<p>([1, 3, −1, −3, 5, 3, 6, 7], 3) → [1, −1, −1, 3, 5, 6].</p>`,
    brute: { why: `<p>Sort every window: O(n · k log k). Even keeping a sorted list and inserting/removing costs O(k) per step.</p>`, code: `static double[] Brute(int[] a, int k)
{
    var r = new double[a.Length - k + 1];
    for (int i = 0; i < r.Length; i++)
    {
        var w = a.Skip(i).Take(k).Order().ToArray();
        r[i] = k % 2 == 1 ? w[k / 2] : ((double)w[k / 2 - 1] + w[k / 2]) / 2;
    }
    return r;
}` },
    mcq: { q: 'Why store (value, index) instead of value?', options: ['For speed', 'SortedSet drops items that compare equal; the index makes duplicate values distinct and lets us remove the exact element leaving the window', 'Indexes are needed for the median formula', 'Tuples sort descending'], answer: 1, explain: 'A set cannot hold two 3s; (3, 1) and (3, 5) are different.' },
    hints: [`<p>Hint 1: Keep <code>low.Count == high.Count</code> or <code>low.Count == high.Count + 1</code>, with every element of low ≤ every element of high.</p>`, `<p>Hint 2: Insert into low if it is ≤ low.Max, else high; remove from whichever contains it; then rebalance by moving Max/Min across.</p>`, `<p>Hint 3: Average with doubles: <code>((double)a + b) / 2</code> — int addition overflows.</p>`],
    tests: { sig: 'int[] int -> double[]', fn: 'MedianSlidingWindow', cmp: 'float', cases: [
      [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [1.0, -1.0, -1.0, 3.0, 5.0, 6.0]],
      [[[1, 2, 3, 4, 2, 3, 1, 4, 2], 3], [2.0, 3.0, 3.0, 3.0, 2.0, 3.0, 2.0]],
      [[[1, 4, 2, 3], 4], [2.5]], [[[5], 1], [5.0]],
      [[[2147483647, 2147483647], 2], [2147483647.0]], [[[1, 2], 1], [1.0, 2.0]],
      [[[-2147483648, -2147483648, 2147483647], 2], [-2147483648.0, -0.5]]
    ] },
    solution: {
      approach: `<p>Two balanced halves in SortedSets of (value, index). The median comes from low.Max (and high.Min for even k). Each step is one insert, one removal and O(1) rebalancing moves, each O(log k).</p>`,
      code: `public class Solution
{
    public static double[] MedianSlidingWindow(int[] nums, int k)
    {
        var low = new SortedSet<(int V, int I)>();    // lower half, low.Max is the middle
        var high = new SortedSet<(int V, int I)>();   // upper half
        var result = new double[nums.Length - k + 1];

        void Balance()
        {
            while (low.Count > high.Count + 1) { var m = low.Max; low.Remove(m); high.Add(m); }
            while (high.Count > low.Count) { var m = high.Min; high.Remove(m); low.Add(m); }
        }

        for (int i = 0; i < nums.Length; i++)
        {
            var item = (nums[i], i);
            if (low.Count == 0 || item.CompareTo(low.Max) <= 0) low.Add(item); else high.Add(item);
            if (i >= k)
            {
                var old = (nums[i - k], i - k);
                if (!low.Remove(old)) high.Remove(old);
            }
            Balance();
            if (i >= k - 1)
                result[i - k + 1] = k % 2 == 1 ? low.Max.V : ((double)low.Max.V + high.Min.V) / 2.0;
        }
        return result;
    }
}`,
      complexity: `<p>O(n log k) time, O(k) space.</p>`,
      followUps: ['Use two PriorityQueues with lazy deletion instead.', 'Median of a stream without a window (two heaps).']
    }
  });

  practice.push({
    title: 'Dijkstra with PriorityQueue',
    level: 'Hard', tags: ['PriorityQueue', 'graphs', 'lazy deletion'], companies: ['Google', 'Uber', 'Microsoft'],
    statement: `<p>Directed graph with n nodes and non-negative weighted edges <code>[u, v, w]</code>. Implement <code>public static long[] ShortestPaths(int n, int[][] edges, int src)</code> returning the shortest distance from src to every node, or −1 if unreachable. <code>PriorityQueue</code> has no decrease-key on .NET 8, so push duplicates and skip stale entries.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>; 0 ≤ edges ≤ 5·10<sup>4</sup>; 0 ≤ w ≤ 10<sup>9</sup> (distances need <code>long</code>).`,
    example: `<p>n = 4, edges [[0,1,1],[0,2,4],[1,2,2],[2,3,1]], src 0 → [0, 1, 3, 4] (0→1→2 beats the direct 0→2).</p>`,
    brute: { why: `<p>Bellman-Ford relaxes every edge n − 1 times: O(n·m) = 5·10<sup>8</sup>. Dijkstra with a heap is O((n + m) log m).</p>`, code: `static long[] BellmanFord(int n, int[][] edges, int src)
{
    var d = Enumerable.Repeat(long.MaxValue, n).ToArray(); d[src] = 0;
    for (int r = 0; r < n - 1; r++)
        foreach (var e in edges)
            if (d[e[0]] != long.MaxValue && d[e[0]] + e[2] < d[e[1]]) d[e[1]] = d[e[0]] + e[2];
    return d.Select(x => x == long.MaxValue ? -1 : x).ToArray();
}` },
    mcq: { q: 'You dequeue (node 3, distance 9) but dist[3] is already 7. What do you do?', options: ['Update dist[3] to 9', 'Skip it — it is a stale entry from before a shorter path was found', 'Throw', 'Re-enqueue it'], answer: 1, explain: 'Lazy deletion: outdated heap entries are ignored when popped.' },
    hints: [`<p>Hint 1: Adjacency lists: <code>var adj = new List&lt;(int To, int W)&gt;[n];</code></p>`, `<p>Hint 2: <code>PriorityQueue&lt;int, long&gt;</code>; when dequeued distance &gt; dist[u], continue.</p>`, `<p>Hint 3: Use long.MaxValue as infinity and map it to −1 at the end.</p>`],
    tests: { sig: 'int int[][] int -> long[]', fn: 'ShortestPaths', cases: [
      [[4, [[0, 1, 1], [0, 2, 4], [1, 2, 2], [2, 3, 1]], 0], [0, 1, 3, 4]],
      [[1, [], 0], [0]],
      [[3, [[0, 1, 5]], 0], [0, 5, -1]],
      [[3, [[1, 0, 1]], 0], [0, -1, -1]],
      [[3, [[0, 1, 1000000000], [1, 2, 1000000000]], 0], [0, 1000000000, 2000000000]],
      [[5, [[0, 1, 2], [0, 2, 2], [1, 3, 1], [2, 3, 3], [3, 4, 0]], 0], [0, 2, 2, 3, 3]],
      [[3, [[0, 1, 1], [0, 1, 0], [1, 2, 1]], 0], [0, 0, 1]],
      [[3, [[0, 1, 1], [1, 2, 1], [2, 0, 1]], 1], [2, 0, 1]]
    ] },
    solution: {
      approach: `<p>Classic Dijkstra: pop the closest unsettled node, relax its edges, push improved distances. Stale entries are skipped.</p>`,
      code: `public class Solution
{
    public static long[] ShortestPaths(int n, int[][] edges, int src)
    {
        var adj = new List<(int To, int W)>[n];
        for (int i = 0; i < n; i++) adj[i] = [];
        foreach (var e in edges) adj[e[0]].Add((e[1], e[2]));

        var dist = new long[n];
        Array.Fill(dist, long.MaxValue);
        dist[src] = 0;
        var pq = new PriorityQueue<int, long>();
        pq.Enqueue(src, 0);
        while (pq.TryDequeue(out int u, out long d))
        {
            if (d > dist[u]) continue;                       // stale entry
            foreach (var (v, w) in adj[u])
            {
                long nd = d + w;
                if (nd < dist[v]) { dist[v] = nd; pq.Enqueue(v, nd); }
            }
        }
        for (int i = 0; i < n; i++) if (dist[i] == long.MaxValue) dist[i] = -1;
        return dist;
    }
}`,
      complexity: `<p>O((n + m) log m) time, O(n + m) space.</p>`,
      followUps: ['Return the path itself (parent array).', 'Why does Dijkstra fail with negative edges?']
    }
  });

  practice.push({
    title: 'Smallest Topological Order',
    level: 'Hard', tags: ['PriorityQueue', 'Kahn', 'in-degree'], companies: ['Google', 'Meta', 'Atlassian'],
    statement: `<p>n tasks 0..n−1 and dependencies <code>[u, v]</code> meaning u must come before v. Return the <b>lexicographically smallest</b> valid order, or an empty array if there is a cycle. Implement <code>public static int[] SmallestOrder(int n, int[][] deps)</code> with Kahn's algorithm and a <code>PriorityQueue</code> instead of a plain queue.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; 0 ≤ deps ≤ 2·10<sup>5</sup>.`,
    example: `<p>n = 5, deps [[3,1],[4,1],[1,0]] → [2, 3, 4, 1, 0]: 2, 3 and 4 have no prerequisites, so the smallest (2) goes first.</p>`,
    brute: { why: `<p>Try permutations, or repeatedly scan all nodes for the smallest with in-degree 0: O(n²). The heap makes each choice O(log n).</p>`, code: `static int SmallestReady(int[] indeg, bool[] done)
{
    for (int i = 0; i < indeg.Length; i++) if (!done[i] && indeg[i] == 0) return i;   // O(n) per pick
    return -1;
}` },
    mcq: { q: 'Kahn with a Queue gives a valid order. Why a PriorityQueue here?', options: ['Faster', 'Among all currently available tasks we must always pick the smallest number to get the lexicographically smallest order', 'To detect cycles', 'Queues cannot hold ints'], answer: 1, explain: 'A greedy choice of the smallest available node is optimal for lexicographic order.' },
    hints: [`<p>Hint 1: Build adjacency lists and in-degrees.</p>`, `<p>Hint 2: Push all in-degree-0 nodes into a min-heap; pop, append, decrement neighbours, push those reaching 0.</p>`, `<p>Hint 3: If fewer than n nodes were output, there is a cycle → return [].</p>`],
    tests: { sig: 'int int[][] -> int[]', fn: 'SmallestOrder', cases: [
      [[4, [[0, 1], [0, 2], [1, 3], [2, 3]]], [0, 1, 2, 3]],
      [[3, []], [0, 1, 2]],
      [[2, [[0, 1], [1, 0]]], []],
      [[3, [[2, 0], [2, 1]]], [2, 0, 1]],
      [[1, []], [0]],
      [[5, [[3, 1], [4, 1], [1, 0]]], [2, 3, 4, 1, 0]],
      [[3, [[0, 1], [1, 2], [2, 1]]], []],
      [[4, [[3, 0], [3, 0]]], [1, 2, 3, 0]]
    ] },
    solution: {
      approach: `<p>Kahn's algorithm where the frontier is a min-heap of ready nodes. Duplicate edges simply add to the in-degree twice and are decremented twice.</p>`,
      code: `public class Solution
{
    public static int[] SmallestOrder(int n, int[][] deps)
    {
        var adj = new List<int>[n];
        var indeg = new int[n];
        for (int i = 0; i < n; i++) adj[i] = [];
        foreach (var d in deps) { adj[d[0]].Add(d[1]); indeg[d[1]]++; }

        var ready = new PriorityQueue<int, int>();
        for (int i = 0; i < n; i++) if (indeg[i] == 0) ready.Enqueue(i, i);
        var order = new List<int>(n);
        while (ready.TryDequeue(out int u, out _))
        {
            order.Add(u);
            foreach (int v in adj[u])
                if (--indeg[v] == 0) ready.Enqueue(v, v);
        }
        return order.Count == n ? order.ToArray() : [];
    }
}`,
      complexity: `<p>O((n + m) log n) time, O(n + m) space.</p>`,
      followUps: ['Return any one cycle when the order does not exist.', 'Parallel scheduling: minimum number of rounds if independent tasks run together.']
    }
  });

  /* ============================ QUIZ ============================ */
  quiz.push(
    { q: 'Why is <code>List&lt;int&gt;</code> faster than <code>ArrayList</code> for a million ints?', options: ['It uses a linked list', 'It stores ints inline in an int[]; ArrayList boxes every int into a separate heap object', 'ArrayList is not resizable', 'They are equally fast'], answer: 1, explain: 'Generic collections of value types avoid boxing, casting and a million small allocations.' },
    { q: 'Which is true about .NET generics compared with Java\'s?', options: ['Both erase type arguments at run time', '.NET keeps them (reified): typeof(T), new T[n] and per-closed-type statics work', '.NET generics only work with reference types', 'Java generics are reified'], answer: 1, explain: 'CLR generics are reified; List&lt;int&gt; and List&lt;string&gt; are distinct runtime types.' },
    { q: 'Inside <code>static T Max&lt;T&gt;(T a, T b)</code> you want <code>a.CompareTo(b)</code>. Which constraint is minimal?', options: ['where T : struct', 'where T : class', 'where T : IComparable&lt;T&gt;', 'where T : new()'], answer: 2, explain: 'Ask for exactly the capability you use.' },
    { q: 'What does <code>default(T)</code> return when T is <code>string</code>? And when T is <code>int</code>?', options: ['"" and 0', 'null and 0', 'null and null', 'It does not compile'], answer: 1, explain: 'default is null for reference types and the zero value for value types.' },
    { q: 'You call <code>list.RemoveAt(0)</code> n times on a List of n items. Total cost?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(1)'], answer: 2, explain: 'Each RemoveAt(0) shifts the remaining items. Use Queue&lt;T&gt; for FIFO.' },
    { q: '<code>sortedList.BinarySearch(x)</code> returns −4. What does that mean?', options: ['x is at index −4', 'x is absent; it would be inserted at index 3 (~(−4))', 'An error occurred', 'x appears 4 times'], answer: 1, explain: 'A negative result is the bitwise complement of the insertion point.' },
    { q: 'Which is the safest way to read a value that may be missing from a Dictionary?', options: ['d[key] inside try/catch', 'd.ContainsKey(key) then d[key]', 'd.TryGetValue(key, out var v)', 'd.Values.First()'], answer: 2, explain: 'One lookup, no exception.' },
    { q: 'A <code>Dictionary&lt;string, int&gt;</code> must treat "Apple" and "APPLE" as the same key. Best approach?', options: ['Call ToLower() on every key', 'Construct it with StringComparer.OrdinalIgnoreCase', 'Override string.GetHashCode', 'Use SortedDictionary'], answer: 1, explain: 'The comparer provides consistent case-insensitive hashing and equality without allocations or culture issues.' },
    { q: 'A <code>SortedSet&lt;Person&gt;</code> with a comparer on Age only loses people. Why?', options: ['SortedSet has a size limit', 'Items that compare as 0 are treated as duplicates and not added', 'Age must be a long', 'SortedSet requires IEquatable'], answer: 1, explain: 'In sorted collections the comparer defines equality. Add a tie-breaker.' },
    { q: 'What does .NET\'s <code>PriorityQueue&lt;TElement, TPriority&gt;</code> dequeue first?', options: ['The largest priority', 'The smallest priority (min-heap)', 'The oldest element', 'A random element'], answer: 1, explain: 'It is a min-heap; pass a reversed comparer for max-heap behaviour. Ties are not FIFO.' },
    { q: '<code>LinkedList&lt;T&gt;.Remove(value)</code> costs…', options: ['O(1)', 'O(log n)', 'O(n), because it must search for the node; Remove(node) is O(1)', 'O(n²)'], answer: 2, explain: 'Keep node references (e.g. in a dictionary) to get O(1) removal.' },
    { q: 'Enumerating a <code>Stack&lt;int&gt;</code> after Push(1), Push(2), Push(3) yields…', options: ['1, 2, 3', '3, 2, 1', 'Only 3', 'Undefined order'], answer: 1, explain: 'Stack enumeration goes from top to bottom.' },
    { q: 'Why is <code>(a, b) =&gt; a - b</code> a bad int comparer?', options: ['It is too slow', 'Subtraction can overflow and return the wrong sign for large magnitudes', 'Comparers must return bool', 'It is not stable'], answer: 1, explain: 'int.MinValue − 1 wraps to int.MaxValue. Use a.CompareTo(b).' },
    { q: 'A method only loops over its input once. Which parameter type is best?', options: ['List&lt;T&gt;', 'T[]', 'IEnumerable&lt;T&gt;', 'ArrayList'], answer: 2, explain: 'Accept the weakest interface you need so callers can pass arrays, lists, sets or queries.' }
  );

  /* ============================ INTERVIEW ============================ */
  interview.push(
    { q: 'What problems do generics solve? Compare with ArrayList and with object parameters.', level: 'B', a: `<p>Generics give <b>compile-time type safety</b> (a <code>List&lt;int&gt;</code> rejects strings), <b>no casts</b> on the way out, and <b>no boxing</b> for value types, because the runtime creates specialised code for each value-type argument. <code>ArrayList</code> and <code>object</code> parameters store everything as <code>object</code>: ints are boxed into separate heap objects, every read needs a cast, and type errors surface only at run time as <code>InvalidCastException</code>. Generics also document intent: <code>Dictionary&lt;CustomerId, Order&gt;</code> says what it holds.</p>`, followUps: ['How does the JIT share code between List&lt;string&gt; and List&lt;Uri&gt;?', 'When would you still accept object?'] },
    { q: 'Explain the generic constraints available in C# 12.', level: 'I', a: `<p><code>class</code> / <code>class?</code> (reference types), <code>struct</code> (non-nullable value types), <code>notnull</code>, <code>unmanaged</code> (value types with no references — enables pointers and stackalloc), <code>new()</code> (public parameterless constructor), a base class, interfaces (including generic ones like <code>IComparable&lt;T&gt;</code> and static-abstract ones like <code>INumber&lt;T&gt;</code>), another type parameter (<code>where T : U</code>), and <code>default</code> (used in overrides to resolve <code>T?</code> ambiguity). They restrict which type arguments are legal and unlock members inside the body. Ask for the minimum you need; constraints are part of the public contract.</p>`, followUps: ['Why does new() have to come last?', 'What does T? mean for an unconstrained T?'] },
    { q: 'How does Dictionary&lt;TKey, TValue&gt; work internally, and what makes lookups O(1)?', level: 'I', a: `<p>It keeps an <code>int[] buckets</code> and an <code>Entry[] entries</code> (hash code, next index, key, value). A lookup computes <code>GetHashCode()</code>, maps it to a bucket (modulo a prime size), then walks that bucket's chain through <code>next</code> indexes comparing hash codes and calling <code>Equals</code>. The table resizes to roughly double (next prime) when full, keeping chains short, so lookups are O(1) on average. A poor hash (many collisions) degrades to O(n). Removed entries go on a free list, which is why enumeration order is not guaranteed after removals.</p>`, followUps: ['What happens if a key is mutated after insertion?', 'How does .NET defend against hash-flooding attacks on string keys?'] },
    { q: 'When would you choose SortedDictionary, SortedList or Dictionary?', level: 'I', a: `<p><b>Dictionary</b>: fastest O(1) lookups, no order. <b>SortedDictionary</b>: red-black tree, O(log n) insert/remove/lookup, enumerates by key — good for frequent inserts in arbitrary order with sorted traversal. <b>SortedList</b>: two sorted arrays, O(log n) lookup but O(n) insert/remove; very compact and supports index access (<code>Keys[i]</code>) — good for small or build-once data. If you only need order at the end, a Dictionary followed by one sort is often fastest.</p>`, followUps: ['How do you implement floor/ceiling on SortedSet?', 'What is the memory overhead per entry in a tree node?'] },
    { q: 'Implement an LRU cache in C#. What are the pitfalls?', level: 'I', a: `<p>A <code>Dictionary&lt;TKey, LinkedListNode&lt;(TKey, TValue)&gt;&gt;</code> for O(1) lookup plus a <code>LinkedList</code> for recency. Get: find node, move it to the front. Put: update and move, or insert at the front and evict <code>Last</code> if over capacity (remove its key from the dictionary too). Pitfalls: calling <code>LinkedList.Remove(value)</code> (O(n)) instead of <code>Remove(node)</code>; forgetting to delete the evicted key; thread safety — a single lock around both structures is simplest, because two concurrent collections cannot be updated atomically together. For production, <code>Microsoft.Extensions.Caching.Memory</code> exists.</p>`, followUps: ['How would you add per-entry expiry?', 'How do you make it scale under contention?'] },
    { q: 'What are the quirks of PriorityQueue&lt;TElement, TPriority&gt;?', level: 'I', a: `<p>Added in .NET 6. It is a <b>min-heap</b> (4-ary) ordered by priority only; elements need no ordering. It is <b>not stable</b> — equal priorities dequeue in arbitrary order — so use a tuple priority with a sequence number when order matters. There is no decrease-key and (on .NET 8) no Remove, so algorithms like Dijkstra push duplicates and skip stale entries. Enumeration order is the internal heap order (not sorted). It is not thread-safe. Max-heap behaviour needs a reversed comparer.</p>`, followUps: ['How would you implement "update priority" efficiently?', 'Why a 4-ary heap rather than binary?'] },
    { q: 'Why does modifying a List inside foreach throw, and how do you remove items safely?', level: 'B', a: `<p>Every mutation increments the list's internal <code>_version</code>; the enumerator remembers the version it started with and throws <code>InvalidOperationException</code> on <code>MoveNext</code> if it changed, because indexes may have shifted. Safe options: <code>list.RemoveAll(predicate)</code> (one O(n) pass), iterate backwards with a for loop and <code>RemoveAt</code>, or build a new filtered list (<code>Where(...).ToList()</code>). For dictionaries, .NET Core 3.0+ allows <code>Remove</code> during enumeration, but not additions.</p>`, followUps: ['Is RemoveAll stable?', 'What about concurrent modification from another thread?'] },
    { q: 'IComparable&lt;T&gt; vs IComparer&lt;T&gt; vs IEqualityComparer&lt;T&gt; — when do you use each?', level: 'B', a: `<p><code>IComparable&lt;T&gt;</code> is implemented by a type to define its <b>natural order</b> (<code>CompareTo</code>). <code>IComparer&lt;T&gt;</code> is a separate object defining an <b>external order</b>, passed to <code>Sort</code>, <code>SortedSet</code>, <code>PriorityQueue</code> or <code>OrderBy</code> — use it for alternative orderings or for types you do not own. <code>IEqualityComparer&lt;T&gt;</code> supplies <b>Equals + GetHashCode</b> for hash collections (e.g. <code>StringComparer.OrdinalIgnoreCase</code>). Keep CompareTo consistent with Equals where possible.</p>`, followUps: ['How do you build a comparer from a lambda?', 'What goes wrong when CompareTo and Equals disagree?'] },
    { q: 'How do generics behave at run time for value types versus reference types?', level: 'A', a: `<p>The JIT generates <b>separate native code for each value-type instantiation</b> (List&lt;int&gt;, List&lt;double&gt;, List&lt;MyStruct&gt;), so operations work on raw values and constrained calls are devirtualised and inlined — no boxing. All <b>reference-type instantiations share one body</b> compiled against <code>System.__Canon</code>; exact type information needed for casts, <code>typeof(T)</code> or <code>new T[]</code> comes from a runtime generic dictionary. Static fields are per closed type. Consequences: struct generics are fast but cost JIT time and code size per type; shared code may be slightly slower for type checks. Native AOT must see all instantiations at compile time.</p>`, followUps: ['What is a generic dictionary lookup?', 'Why does generic virtual method dispatch cost more?'] },
    { q: 'What is generic math and when would you use it?', level: 'A', a: `<p>.NET 7 / C# 11 added <b>static abstract interface members</b>, and the BCL defines numeric interfaces such as <code>INumber&lt;TSelf&gt;</code>, <code>IAdditionOperators</code>, <code>IMinMaxValue</code> and <code>IParsable</code>. A method like <code>T Sum&lt;T&gt;(ReadOnlySpan&lt;T&gt; xs) where T : INumber&lt;T&gt;</code> works for int, long, double, decimal, BigInteger and custom numeric types, compiled into specialised code with real arithmetic instructions — no boxing, no dynamic, no overload explosion. Use it in numeric libraries, statistics helpers and parsers; avoid it where one concrete type suffices.</p>`, followUps: ['What are checked operators in generic math?', 'How do static abstract members dispatch?'] },
    { q: 'Explain foreach over List&lt;T&gt; versus over IEnumerable&lt;T&gt; in terms of allocations.', level: 'A', a: `<p><code>foreach</code> is pattern-based: on a <code>List&lt;T&gt;</code>-typed expression the compiler calls <code>List&lt;T&gt;.GetEnumerator()</code>, which returns a <b>struct</b> enumerator, so the loop allocates nothing and MoveNext/Current can be inlined. On an <code>IEnumerable&lt;T&gt;</code>-typed expression it calls the interface method, which returns <code>IEnumerator&lt;T&gt;</code> — the struct is <b>boxed</b> (one allocation) and each MoveNext/Current is an interface call. In hot paths iterate the concrete type or a span (<code>CollectionsMarshal.AsSpan</code>); with Dynamic PGO the JIT can sometimes devirtualise, but not avoid the box in general.</p>`, followUps: ['Why do LINQ operators allocate?', 'How do yield-return iterators allocate?'] },
    { q: 'You need a set of one million strings that never changes after startup and is queried constantly. What do you use?', level: 'E', a: `<p><code>FrozenSet&lt;string&gt;</code> (.NET 8, <code>System.Collections.Frozen</code>) built once with <code>ToFrozenSet(StringComparer.Ordinal)</code>. Creation is slower because it analyses the keys and picks a specialised strategy (e.g. hashing a distinguishing substring, length buckets), but lookups are faster than <code>HashSet</code> and it is safe for concurrent reads. Alternatives: <code>HashSet</code> with an explicit comparer (good), <code>ImmutableHashSet</code> (slower lookups, built for structural sharing when you create modified copies), or a sorted array with binary search for minimal memory. Choose ordinal comparison unless culture semantics are required, and benchmark with realistic keys.</p>`, followUps: ['When would ImmutableHashSet be the better choice?', 'How would you load it without blocking startup?'] },
    { q: 'A service builds a Dictionary&lt;CustomerKey, Order&gt; and lookups become slow over time. How do you investigate?', level: 'E', a: `<p>Suspect the key type first. Check that <code>CustomerKey</code> overrides GetHashCode/Equals consistently (or is a record), that its hash uses well-distributed immutable fields (not, say, only a tenant id shared by thousands of keys), and that keys are never mutated after insertion. Measure: a profiler showing time in <code>FindValue</code> and many Equals calls indicates long chains; a quick histogram of <code>key.GetHashCode()</code> values shows clustering. Also check for struct keys using the default ValueType.Equals (reflection-based, slow). Fixes: better hash via <code>HashCode.Combine</code> over the right fields, record struct keys, a custom IEqualityComparer, or FrozenDictionary for read-mostly data.</p>`, followUps: ['How would you write a benchmark that reproduces it?', 'What changes if many threads read and write?'] },
    { q: 'Design an order book (bids/asks) for a matching engine using .NET collections.', level: 'E', a: `<p>Each side maps price → FIFO queue of orders: <code>SortedDictionary&lt;long, Queue&lt;Order&gt;&gt;</code> with prices in integer ticks; asks ascending, bids with a descending comparer, so the best price is the first key. Cancellation needs O(1) lookup by order id: keep <code>Dictionary&lt;long, LinkedListNode&lt;Order&gt;&gt;</code> and use <code>LinkedList&lt;Order&gt;</code> per level instead of Queue so a cancelled order can be removed from the middle. Matching pops from the best level until quantity is filled, removing empty levels. For very high throughput, replace the tree with arrays indexed by tick offset around the mid price, pool order objects, and run single-threaded per instrument to avoid locks.</p>`, followUps: ['Why integer ticks instead of decimal or double?', 'How do you get the best bid in O(1)?'] }
  );

  registerModule({
    id: 'csharp05',
    title: 'Generics & Collections',
    intro: `<p>Almost every C# program is built from generic collections. This module explains <b>how generics work</b> (reified types, constraints, generic math), then takes each workhorse collection apart: <code>List&lt;T&gt;</code>, <code>Dictionary</code> and <code>HashSet</code>, the sorted trees, <code>Queue</code>, <code>Stack</code>, <code>LinkedList</code> and <code>PriorityQueue</code>, and the <code>IEnumerable</code>/<code>IComparer</code> interfaces that tie them together. You will learn the real cost of every operation, the .NET-specific traps (no floor/ceiling, unstable heaps, comparers that define equality), and how to pick the right structure from the wording of a problem. Practice problems are classic interview questions solved with idiomatic .NET 8 collections.</p>`,
    goals: [
      'Write generic classes and methods with the minimal constraints, including generic math',
      'State the complexity of every common List, Dictionary, HashSet, SortedSet, Queue, Stack, LinkedList and PriorityQueue operation',
      'Use TryGetValue, comparers, GetViewBetween and tuple priorities correctly',
      'Implement LRU caches, sliding windows, k-way merges and Dijkstra with BCL collections',
      'Write IComparer and IComparable implementations without overflow or consistency bugs',
      'Choose a collection from the access pattern described in a question'
    ],
    prereqs: `C# 4 (OOP: inheritance, interfaces, Equals/GetHashCode). Basic Big-O notation helps.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
