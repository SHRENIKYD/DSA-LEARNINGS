(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('List<T>') → inline code with < > escaped; P(`...`) → escaped code block inside prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function esc(s) { return H.esc(s); }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  /* step = { l: line | [lines], cls, v: {vars}, hv, vl, out, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Immutability patterns
     ====================================================================== */
  topics.push({
    title: 'Immutability Patterns: Records, init, Immutable and Frozen Collections',
    analogy: `<p>A printed train timetable never changes after it is printed. Anyone can read it, any number of people can share one copy, and nobody needs to ask "has someone edited this while I was reading?". When the schedule changes, the railway prints a <b>new edition</b> — and most pages are reused from the old one. Immutable objects are printed timetables: safe to share across threads and caches, easy to reason about, and "changing" one means creating a new version that shares most of its structure with the old.</p>`,
    explain: `<p>An immutable object cannot be observed to change after construction. That gives thread safety without locks, safe use as dictionary keys, no defensive copying, and easy undo/history (keep old versions).</p>
<h4>1. Language tools</h4>
${H.table(['Tool', 'What it gives', 'Watch out'], [
  [C('readonly') + ' fields', 'assigned only in the constructor', 'shallow: the referenced object can still mutate'],
  [C('init') + ' accessors', 'object initializers at construction, read-only afterwards', C('required') + ' (C# 11) forces callers to set them'],
  [C('record') + ' / ' + C('record struct'), 'value equality, ' + C('ToString') + ', ' + C('with') + ' expressions', C('record struct') + ' is mutable unless declared ' + C('readonly record struct')],
  [C('with') + ' expression', 'a shallow copy with some properties changed (non-destructive mutation)', 'copies references, not the objects they point to'],
  [C('readonly struct'), 'all fields readonly, no defensive copies', 'methods cannot mutate ' + C('this')]
])}
<h4>2. Collections</h4>
${H.table(['Type', 'Shape', 'Best for'], [
  [C('IReadOnlyList<T>') + ' / ' + C('ReadOnlyCollection<T>'), 'a read-only <b>view</b> of a mutable list', 'API surfaces — but the owner can still change it'],
  [C('ImmutableArray<T>'), 'a struct wrapping an array; every change copies', 'small, read-mostly data; fastest reads'],
  [C('ImmutableList<T>') + ', ' + C('ImmutableDictionary<K,V>'), 'balanced trees; changes are O(log n) and share structure', 'frequently updated snapshots, undo history, lock-free publishing'],
  [C('ImmutableStack<T>') + ', ' + C('ImmutableQueue<T>'), 'persistent linked structures', 'functional algorithms'],
  [C('FrozenDictionary<K,V>') + ', ' + C('FrozenSet<T>') + ' (.NET 8)', 'built once, read-optimised, never changes', 'static lookup tables'],
  [C('ImmutableArray.CreateBuilder<T>()'), 'mutable builder → one immutable result', 'building without O(n²) copying']
])}
<h4>3. Patterns</h4>
<ul>
<li><b>Validate once, in the constructor</b> (or a factory returning a Result): an immutable object that exists is valid forever.</li>
<li><b>Copy mutable inputs</b>: ${C('Items = items.ToImmutableArray()')} instead of storing the caller's list.</li>
<li><b>Publish snapshots</b>: readers use the current immutable snapshot; a writer builds a new one and swaps the reference (${C('Interlocked.CompareExchange')} or ${C('ImmutableInterlocked.Update')}).</li>
<li><b>Persistent structures</b>: a new version shares unchanged parts with the old one, so keeping history is cheap.</li>
</ul>`,
    clues: ['data shared across threads or cached — immutability removes the need for locks', 'value objects (Money, DateRange, Email) and dictionary keys', 'undo/redo, history, time travel, snapshots of configuration', 'a "read-only" property that returns a mutable List the caller can change'],
    code: [{ lang: 'csharp', run: true, title: 'Records, with, immutable and frozen collections (runnable)', code: `
using System.Collections.Frozen;
using System.Collections.Immutable;

var m = new Money(10.50m, "INR");
var more = m with { Amount = 25m };                 // non-destructive mutation
Console.WriteLine($"{m} | {more} | {m == new Money(10.50m, "INR")}");   // value equality: True

try { _ = new Money(-1, "INR"); } catch (ArgumentException e) { Console.WriteLine(e.Message); }

var order = new Order("A-1", new List<string> { "pen" }.ToImmutableArray());
var order2 = order with { Lines = order.Lines.Add("book") };     // new array, old one untouched
Console.WriteLine($"{order.Lines.Length} {order2.Lines.Length}");  // 1 2

var v1 = ImmutableList.Create(1, 2, 3);
var v2 = v1.Add(4);                                // shares structure with v1
Console.WriteLine($"{v1.Count} {v2.Count}");       // 3 4

var builder = ImmutableArray.CreateBuilder<int>();
for (int i = 0; i < 5; i++) builder.Add(i * i);
ImmutableArray<int> squares = builder.ToImmutable();
Console.WriteLine(string.Join(",", squares));      // 0,1,4,9,16

FrozenDictionary<string, int> codes = new Dictionary<string, int> { ["IN"] = 91, ["US"] = 1 }.ToFrozenDictionary();
Console.WriteLine(codes["IN"]);                    // 91

public readonly record struct Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; }
    public Money(decimal amount, string currency)
    {
        if (amount < 0) throw new ArgumentException("amount must be non-negative");
        if (currency.Length != 3) throw new ArgumentException("currency must be a 3-letter code");
        (Amount, Currency) = (amount, currency);
    }
}

public sealed record Order(string Id, ImmutableArray<string> Lines);` }],
    codeTitle: ['Immutability toolbox'],
    viz: {
      title: 'A persistent stack shares structure between versions',
      gen: function () {
        var g = function (nodes, edges, hl) { return { type: 'graph', directed: true, height: 46, nodes: nodes, edges: edges, hl: hl || {} }; };
        var N = { e: { id: 'E', label: 'Empty', x: 88, y: 23, shape: 'box' }, n1: { id: 'N1', label: '1', x: 66, y: 23 }, n2: { id: 'N2', label: '2', x: 44, y: 10 }, n3: { id: 'N3', label: '3', x: 44, y: 36 }, v1: { id: 'V1', label: 'v1', x: 66, y: 4, shape: 'box' }, v2: { id: 'V2', label: 'v2', x: 22, y: 10, shape: 'box' }, v3: { id: 'V3', label: 'v3', x: 22, y: 36, shape: 'box' } };
        return [
          { narr: '<code>var v0 = PStack&lt;int&gt;.Empty;</code> — one shared empty instance.', parts: [g([N.e], [], { E: 'cur' })] },
          { narr: '<code>var v1 = v0.Push(1);</code> creates one node whose tail points at Empty. v0 is unchanged.', parts: [g([N.e, N.n1, N.v1], [['V1', 'N1'], ['N1', 'E']], { N1: 'ok' })] },
          { narr: '<code>var v2 = v1.Push(2);</code> — one new node; its tail <b>is</b> v1. Nothing is copied.', parts: [g([N.e, N.n1, N.n2, N.v1, N.v2], [['V1', 'N1'], ['N1', 'E'], ['V2', 'N2'], ['N2', 'N1']], { N2: 'ok' })] },
          { narr: '<code>var v3 = v1.Push(3);</code> — branching from an <b>older</b> version is just as cheap. v2 and v3 share node 1 and Empty.', parts: [g([N.e, N.n1, N.n2, N.n3, N.v1, N.v2, N.v3], [['V1', 'N1'], ['N1', 'E'], ['V2', 'N2'], ['N2', 'N1'], ['V3', 'N3'], ['N3', 'N1']], { N3: 'ok', N1: 'cur' })] },
          { narr: '<code>v2.Pop()</code> simply returns its tail — v1 — in O(1). All four versions remain valid and can be read by any thread without locks.', parts: [g([N.e, N.n1, N.n2, N.n3, N.v1, N.v2, N.v3], [['V1', 'N1'], ['N1', 'E'], ['V2', 'N2'], ['N2', 'N1'], ['V3', 'N3'], ['N3', 'N1']], { V1: 'ok' }), { type: 'vars', vals: { versions: 4, 'nodes allocated': 3 }, hl: { 'nodes allocated': 'ok' } }] }
        ];
      }
    },
    examples: [
      { title: 'A "read-only" property that is not', html: `<p>${C('public IReadOnlyList<string> Tags => _tags;')} returns the private ${C('List<string>')}; a caller can cast it back to ${C('List<string>')} and add items, and the owner's later changes are visible to everyone holding the "read-only" reference. Return ${C('_tags.ToImmutableArray()')} or store an ${C('ImmutableArray<string>')} in the first place.</p>` },
      { title: 'Records are shallowly immutable', html: `<p>${C('record Team(string Name, List<string> Members)')}: ${C('t with { Name = "B" }')} shares the <b>same</b> list, so adding a member to one team adds it to both, and two teams with equal member lists are not equal (List equality is by reference). Use ${C('ImmutableArray<string>')} and, if value equality over contents matters, override ${C('Equals')} (see topic 5).</p>` },
      { title: 'Lock-free snapshot publishing', html: `<p>Readers read a field; writers compute a new immutable version and swap it atomically, retrying if another writer won.</p>`, code: `
using System.Collections.Immutable;

sealed class Registry
{
    private ImmutableDictionary<string, int> _map = ImmutableDictionary<string, int>.Empty;
    public int? Find(string k) => _map.TryGetValue(k, out int v) ? v : null;           // lock-free read
    public void Set(string k, int v) => ImmutableInterlocked.AddOrUpdate(ref _map, k, v, (_, _) => v);
}` }
    ],
    deepDive: `<p><b>Costs.</b> ${C('ImmutableList<T>')} is an AVL tree: indexing is O(log n) with poor cache locality, so it is several times slower to read than ${C('List<T>')}. ${C('ImmutableArray<T>')} reads as fast as an array but every Add copies the whole array — use builders for construction. ${C('FrozenDictionary')} spends extra time at construction analysing keys (e.g. choosing comparers that only hash a few characters) to make reads faster than ${C('Dictionary')}.</p>
<p><b>init and required.</b> ${C('init')} setters can be called only during object initialization (constructor, object initializer, ${C('with')}); the compiler enforces it via a ${C('modreq(IsExternalInit)')} on the setter. ${C('required')} members must be set in every object initializer unless a constructor is marked ${C('[SetsRequiredMembers]')}. Both are compile-time rules — reflection and serializers can still write.</p>
<p><b>Immutability and the GC.</b> Creating new versions allocates; persistent structures keep allocation proportional to the change (O(log n) nodes), not the size. Old versions die young if nobody holds them, which the generational GC handles cheaply. For hot numeric code, mutable structs in arrays are still the fastest — immutability is a design default, not a law.</p>`,
    aiEra: `<p><b>What AI changes:</b> converting classes to records and adding ${C('with')}-based APIs is mechanical and fast. <b>Use AI as a partner:</b> <code>Find every place this "immutable" type leaks mutable state</code>. <b>Where AI goes wrong:</b> it calls records "deeply immutable", returns ${C('IReadOnlyList')} views of mutable lists, uses ${C('ImmutableList')} where ${C('ImmutableArray')} or ${C('FrozenSet')} fits better, or rebuilds ImmutableArrays in loops (O(n²)). <b>What you must still own:</b> the ownership model — who may change what, and when a snapshot is published.</p>`,
    problems: [{
      title: 'Persistent Immutable Stack with Shared Versions',
      level: 'Medium', tags: ['immutability', 'persistent data structures', 'linked list'], companies: ['Microsoft', 'Jane Street', 'Atlassian'],
      statement: `<p>Implement ${C('sealed class PStack<T>')} with ${C('Empty')}, ${C('Push(T)')} → new stack, ${C('Pop()')} → new stack (its tail), ${C('Peek()')}, ${C('IsEmpty')}; nodes are immutable and versions share structure. Process operations: ${C('"push x"')} pushes onto the <b>current</b> version, ${C('"pop"')} pops it (on an empty stack record ${C('"error"')} and keep the version), ${C('"back k"')} makes version k (0 = the initial empty stack, then one version per successful push/pop) current again. Return the contents (top first, comma-separated, ${C('"empty"')}) after each operation, and finally ${C('"nodes=N"')}: the number of nodes allocated.</p>`,
      constraints: `Up to 10<sup>4</sup> operations; k always refers to an existing version.`,
      example: `<p>${C('["push 1", "push 2", "back 1", "push 3"]')} → ${H.c('g', '["1", "2,1", "1", "3,1", "nodes=3"]')}</p>`,
      brute: { why: `<p>Keeping history by copying the whole ${C('Stack<T>')} for every version costs O(n) time and memory per operation — O(n²) overall. A persistent stack creates exactly one node per push and zero per pop, and every old version stays valid.</p>`, code: `
static class CopyHistory
{
    public static List<Stack<int>> Run(int[] pushes)
    {
        var versions = new List<Stack<int>> { new() };
        foreach (int x in pushes)
        {
            var copy = new Stack<int>(versions[^1].Reverse());   // O(n) copy per version
            copy.Push(x);
            versions.Add(copy);
        }
        return versions;
    }
}` },
      mcq: { q: 'Why can two versions of a persistent stack safely share nodes?', options: ['Nodes never change after creation, so no version can affect another', 'The GC copies them on write', 'A lock protects each node', 'Each version keeps a hidden deep copy'], answer: 0, explain: 'Structural sharing is only safe because of immutability: a node\'s value and tail are fixed for its lifetime.' },
      hints: [`<p>Hint 1: a node holds ${C('Head')} and ${C('Tail')} (readonly); ${C('Empty')} is a single static instance with no head.</p>`, `<p>Hint 2: keep ${C('List<PStack<int>> versions')}; every successful push/pop appends the new current version.</p>`, `<p>Hint 3: count allocations with a counter incremented in the private node constructor (reset it at the start of each run).</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'replay', cases: [
        [[['push 1', 'push 2', 'back 1', 'push 3']], ['1', '2,1', '1', '3,1', 'nodes=3']],
        [[[]], ['nodes=0']],
        [[['pop']], ['error', 'nodes=0']],
        [[['push 5', 'pop', 'pop']], ['5', 'empty', 'error', 'nodes=1']],
        [[['push 1', 'push 2', 'push 3', 'back 0', 'back 3']], ['1', '2,1', '3,2,1', 'empty', '3,2,1', 'nodes=3']],
        [[['push 1', 'push 2', 'pop', 'back 2', 'push 9']], ['1', '2,1', '1', '2,1', '9,2,1', 'nodes=3']],
        [[['push -1', 'push 0', 'back 1', 'pop', 'back 2']], ['-1', '0,-1', '-1', 'empty', '0,-1', 'nodes=2']]
      ] },
      solution: {
        approach: `<p>An immutable singly linked list is a persistent stack: Push allocates one node pointing at the old version, Pop returns the tail. Versions are just references, so "back k" is O(1).</p>`,
        code: `
public class Solution
{
    public static string[] Replay(string[] ops)
    {
        PStack<int>.Allocated = 0;
        var versions = new List<PStack<int>> { PStack<int>.Empty };
        var cur = PStack<int>.Empty;
        var output = new List<string>();
        foreach (string op in ops)
        {
            string[] p = op.Split(' ');
            if (p[0] == "push") { cur = cur.Push(int.Parse(p[1])); versions.Add(cur); }
            else if (p[0] == "pop")
            {
                if (cur.IsEmpty) { output.Add("error"); continue; }
                cur = cur.Pop(); versions.Add(cur);
            }
            else cur = versions[int.Parse(p[1])];
            output.Add(cur.IsEmpty ? "empty" : string.Join(",", cur.Items()));
        }
        output.Add($"nodes={PStack<int>.Allocated}");
        return output.ToArray();
    }
}

public sealed class PStack<T>
{
    public static int Allocated;
    public static readonly PStack<T> Empty = new();
    private readonly T _head = default!;
    private readonly PStack<T>? _tail;

    private PStack() { }
    private PStack(T head, PStack<T> tail) { _head = head; _tail = tail; Allocated++; }

    public bool IsEmpty => _tail is null;
    public PStack<T> Push(T value) => new(value, this);
    public PStack<T> Pop() => _tail ?? throw new InvalidOperationException("empty stack");
    public T Peek() => IsEmpty ? throw new InvalidOperationException("empty stack") : _head;

    public IEnumerable<T> Items()
    {
        for (var s = this; !s.IsEmpty; s = s._tail!) yield return s._head;
    }
}`,
        dry: { head: ['op', 'current', 'versions', 'nodes'], rows: [['push 1', '1', '[∅, 1]', '1'], ['push 2', '2,1', '[∅, 1, 2→1]', '2'], ['back 1', '1', 'unchanged', '2'], ['push 3', '3,1 (shares node 1)', '[∅, 1, 2→1, 3→1]', '3']] },
        complexity: `<p>O(1) per push, pop and back (plus O(size) to print a version); one node per push in total.</p>`,
        followUps: ['Build a persistent queue from two persistent stacks.', 'Compare with <code>ImmutableStack&lt;T&gt;</code>, which implements the same idea.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Result types
     ====================================================================== */
  var T2_CODE = [
    'Result<int> r = Parse("49")          // Ok(49)',
    '    .Bind(Positive)                  // Ok(49)',
    '    .Bind(SquareRoot)                // Ok(7)',
    '    .Map(x => x * 10);               // Ok(70)',
    '',
    'Result<int> e = Parse("-4")          // Ok(-4)',
    '    .Bind(Positive)                  // Err("must be positive")',
    '    .Bind(SquareRoot)                // skipped',
    '    .Map(x => x * 10);               // skipped'
  ].join('\n');
  topics.push({
    title: 'Result Types: Expected Failures Without Exceptions',
    analogy: `<p>A courier either hands you the parcel or a <b>slip</b> explaining why not ("address not found"). Both outcomes are normal and both are written on paper you can read. Nobody sets off the <b>fire alarm</b> because an address was wrong. Exceptions are the fire alarm: right for disasters (disk failure, bugs), wrong for "the user typed letters into the age field". A <b>Result</b> type is the delivery slip — the failure is a value, visible in the method signature, and the next step can decide what to do with it.</p>`,
    explain: `<p>A Result type represents "either a value or an error". Unlike exceptions, failure is part of the <b>signature</b> (the compiler reminds callers to handle it), costs nothing to create, and composes with pipelines.</p>
<h4>1. A minimal Result</h4>
${P(`
public readonly record struct Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsOk => Error is null;
    private Result(T? value, string? error) => (Value, Error) = (value, error);
    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(string error) => new(default, error);

    public Result<U> Map<U>(Func<T, U> f) => IsOk ? Result<U>.Ok(f(Value!)) : Result<U>.Fail(Error!);
    public Result<U> Bind<U>(Func<T, Result<U>> f) => IsOk ? f(Value!) : Result<U>.Fail(Error!);
    public R Match<R>(Func<T, R> ok, Func<string, R> fail) => IsOk ? ok(Value!) : fail(Error!);
}`)}
${H.table(['Operation', 'Meaning', 'Railway picture'], [
  [C('Map(f)'), 'transform the value if Ok; errors pass through', 'stay on the green track'],
  [C('Bind(f)'), 'run a step that may itself fail', 'may switch to the red track'],
  [C('Match(ok, fail)'), 'leave the Result world: handle both cases', 'end of the line'],
  ['Combine / Apply', 'run independent validations and collect <b>all</b> errors', 'several tracks merged']
])}
<h4>2. When to use what</h4>
${H.table(['Situation', 'Use'], [
  ['Expected, frequent, recoverable failure (validation, parsing, "not found", business rule)', 'Result / Try-pattern (' + C('bool TryX(out T)') + ')'],
  ['Programming error (null argument, invalid state)', 'exception (' + C('ArgumentNullException') + ', ' + C('InvalidOperationException') + ')'],
  ['Infrastructure failure you cannot handle locally (network down, disk full)', 'exception, caught at a boundary'],
  ['Hot path where failures are common', 'Result or Try-pattern — exceptions cost microseconds each']
])}
<p>The BCL's own idiom is the <b>Try-pattern</b> (${C('int.TryParse')}, ${C('Dictionary.TryGetValue')}) with ${C('[NotNullWhen(true)]')} annotations. Libraries such as ${C('ErrorOr')}, ${C('OneOf')}, ${C('FluentResults')} and ${C('LanguageExt')} provide richer Results; C# has no built-in discriminated unions yet, so pattern matching over a sealed hierarchy (${C('abstract record Result; sealed record Ok(...) : Result; sealed record Err(...) : Result')}) is a common alternative.</p>`,
    clues: ['validation and parsing where bad input is normal', 'a try/catch used for control flow around expected cases', 'a method returns null or -1 to mean "failed" and callers forget to check', 'a chain of steps where any step may fail with a message'],
    code: [{ lang: 'csharp', run: true, title: 'A small Result type and a railway pipeline (runnable)', code: `
foreach (string input in new[] { "49", "-4", "abc", "50" })
    Console.WriteLine($"{input,4} -> {Pipeline(input)}");
//   49 -> ok: 70
//   -4 -> error: must be positive
//  abc -> error: not a number
//   50 -> error: not a perfect square

var all = Validate("", -5);                         // collects every error, not just the first
Console.WriteLine(all.Match(u => u, e => "errors: " + e));   // errors: name required; age must be >= 0

static string Pipeline(string s) =>
    Parse(s).Bind(Positive).Bind(SquareRoot).Map(x => x * 10)
            .Match(v => $"ok: {v}", e => $"error: {e}");

static Result<int> Parse(string s) => int.TryParse(s, out int v) ? Result<int>.Ok(v) : Result<int>.Fail("not a number");
static Result<int> Positive(int v) => v > 0 ? Result<int>.Ok(v) : Result<int>.Fail("must be positive");
static Result<int> SquareRoot(int v)
{
    int r = (int)Math.Round(Math.Sqrt(v));
    return r * r == v ? Result<int>.Ok(r) : Result<int>.Fail("not a perfect square");
}
static Result<string> Validate(string name, int age)
{
    var errors = new List<string>();
    if (name.Length == 0) errors.Add("name required");
    if (age < 0) errors.Add("age must be >= 0");
    return errors.Count == 0 ? Result<string>.Ok($"{name} ({age})") : Result<string>.Fail(string.Join("; ", errors));
}

public readonly record struct Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsOk => Error is null;
    private Result(T? value, string? error) => (Value, Error) = (value, error);
    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(string error) => new(default, error);
    public Result<U> Map<U>(Func<T, U> f) => IsOk ? Result<U>.Ok(f(Value!)) : Result<U>.Fail(Error!);
    public Result<U> Bind<U>(Func<T, Result<U>> f) => IsOk ? f(Value!) : Result<U>.Fail(Error!);
    public R Match<R>(Func<T, R> ok, Func<string, R> fail) => IsOk ? ok(Value!) : fail(Error!);
}` }],
    codeTitle: ['Railway-oriented pipeline'],
    viz: {
      title: 'Two inputs on the railway',
      gen: function () {
        var track = function (hl, ehl) { return { type: 'graph', directed: true, height: 40, nodes: [{ id: 'P', label: 'Parse', x: 10, y: 12, shape: 'box' }, { id: 'S', label: 'Positive', x: 35, y: 12, shape: 'box' }, { id: 'Q', label: 'SquareRoot', x: 62, y: 12, shape: 'box' }, { id: 'M', label: 'Map ×10', x: 88, y: 12, shape: 'box' }, { id: 'E', label: 'Error track', x: 50, y: 34, shape: 'box' }], edges: [['P', 'S', 'ok'], ['S', 'Q', 'ok'], ['Q', 'M', 'ok'], ['P', 'E', 'fail'], ['S', 'E', 'fail'], ['Q', 'E', 'fail']], hl: hl || {}, ehl: ehl || {} }; };
        return codeFrames(T2_CODE, [
          { l: 1, v: { r: 'Ok(49)' }, extra: [track({ P: 'ok' })], narr: '"49" parses: the value continues on the green track.' },
          { l: 2, v: { r: 'Ok(49)' }, extra: [track({ P: 'ok', S: 'ok' }, { 'P-S': 'ok' })], narr: '<b>Bind</b> runs a step that can fail. 49 &gt; 0, still Ok.' },
          { l: 3, v: { r: 'Ok(7)' }, extra: [track({ P: 'ok', S: 'ok', Q: 'ok' }, { 'P-S': 'ok', 'S-Q': 'ok' })], narr: '√49 = 7 exactly: Ok(7).' },
          { l: 4, v: { r: 'Ok(70)' }, hv: { r: 'ok' }, extra: [track({ P: 'ok', S: 'ok', Q: 'ok', M: 'ok' }, { 'P-S': 'ok', 'S-Q': 'ok', 'Q-M': 'ok' })], narr: '<b>Map</b> transforms the value with a function that cannot fail: Ok(70).' },
          { l: 6, v: { e: 'Ok(-4)' }, extra: [track({ P: 'ok' })], narr: 'Second input: "-4" parses fine.' },
          { l: 7, v: { e: 'Err("must be positive")' }, hv: { e: 'bad' }, extra: [track({ P: 'ok', S: 'bad', E: 'bad' }, { 'S-E': 'bad' })], narr: 'Positive fails: the Result switches to the <b>error track</b>.' },
          { l: [8, 9], v: { e: 'Err("must be positive")' }, hv: { e: 'bad' }, extra: [track({ E: 'bad' })], narr: 'Bind and Map see an error and pass it through untouched — no if-statements in the pipeline, no exceptions thrown.' }
        ]);
      }
    },
    examples: [
      { title: 'Try-pattern with nullable annotations', html: `<p>The BCL-style alternative to a Result type. ${C('[NotNullWhen(true)]')} tells the compiler that ${C('user')} is non-null when the method returns true, so callers get no warnings inside the if.</p>`, code: `
using System.Diagnostics.CodeAnalysis;

sealed class Users
{
    private readonly Dictionary<int, string> _byId = new() { [1] = "asha" };
    public bool TryFind(int id, [NotNullWhen(true)] out string? user) => _byId.TryGetValue(id, out user);
}` },
      { title: 'A sealed hierarchy as a Result', html: `<p>Without built-in unions, a sealed record hierarchy plus a switch expression gives exhaustive handling (the compiler warns if a case is missing once you add more subtypes and remove the discard).</p>`, code: `
abstract record PayResult;
sealed record Paid(string TxId) : PayResult;
sealed record Declined(string Reason) : PayResult;
sealed record NeedsOtp(string Phone) : PayResult;

static class Ui
{
    public static string Show(PayResult r) => r switch
    {
        Paid p => $"Paid {p.TxId}",
        Declined d => $"Declined: {d.Reason}",
        NeedsOtp o => $"OTP sent to {o.Phone}",
        _ => throw new InvalidOperationException()
    };
}` },
      { title: 'Do not hide bugs in Results', html: `<p>Turning every exception into ${C('Result.Fail(ex.Message)')} with a catch-all hides programming errors (NullReferenceException becomes a "validation message") and loses stack traces. Results are for <b>expected</b> domain failures; let unexpected exceptions propagate to a boundary that logs them.</p>` }
    ],
    deepDive: `<p><b>Performance.</b> Throwing an exception captures a stack trace and walks frames — typically several microseconds, far more under deep stacks or with debuggers attached. A ${C('readonly struct')} Result costs a few bytes on the stack. In a validation-heavy API (thousands of invalid requests per second) the difference is measurable CPU.</p>
<p><b>Composition with async.</b> ${C('Task<Result<T>>')} pipelines need async versions of Bind/Map (${C('BindAsync')}) to stay readable; libraries provide them. Keep the error type rich (an error code plus message, or a closed set of error records) so callers can switch on it — strings are fine for display but poor for logic. ASP.NET Core maps Results to responses at the edge (${C('Results.Problem')}, ${C('TypedResults.BadRequest')}).</p>
<p><b>Monads in disguise.</b> Map and Bind make Result a functor/monad; with a ${C('Select')}/${C('SelectMany')} pair you can even use LINQ query syntax (${C('from a in ParseA() from b in ParseB(a) select a + b')}). Use that power sparingly in teams not used to it — explicit Bind chains are easier to read.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a Result type and refactoring try/catch flows into pipelines is easy for assistants. <b>Use AI as a partner:</b> <code>Classify every exception thrown in this service as expected (Result) or unexpected (exception) and explain why</code>. <b>Where AI goes wrong:</b> it converts all exceptions into Results (hiding bugs), loses error details, or introduces a heavy functional library for a small codebase. <b>What you must still own:</b> the error taxonomy of your domain and where the boundary between Results and exceptions sits.</p>`,
    problems: [{
      title: 'Railway Pipeline with Bind and Map',
      level: 'Easy', tags: ['Result type', 'functional', 'validation'], companies: ['Microsoft', 'Stripe', 'Thoughtworks'],
      statement: `<p>Implement ${C('readonly record struct Result<T>')} with ${C('Ok')}, ${C('Fail')}, ${C('Map')}, ${C('Bind')} and ${C('Match')}. Then ${C('Pipeline(s)')} parses an int (error ${C('"not a number"')}), requires it to be positive (${C('"must be positive"')}), takes the exact integer square root (${C('"not a perfect square"')}), multiplies by 10, and returns ${C('"ok: N"')} or ${C('"error: MESSAGE"')}. No exceptions may be used for control flow.</p>`,
      constraints: `Input is any string (possibly empty); valid numbers fit in int.`,
      example: `<p>${C('"49"')} → ${H.c('g', '"ok: 70"')}; ${C('"-4"')} → ${H.c('g', '"error: must be positive"')}</p>`,
      brute: { why: `<p>The exception-based version (${C('int.Parse')} inside try/catch, ${C('throw new ArgumentException("must be positive")')}) works, but every invalid input costs a thrown exception, the possible failures are invisible in the signatures, and the control flow jumps around. Results make each step's failure explicit and cheap.</p>`, code: `
static class Throwing
{
    public static string Run(string s)
    {
        try
        {
            int v = int.Parse(s);
            if (v <= 0) throw new ArgumentException("must be positive");
            int r = (int)Math.Sqrt(v);
            if (r * r != v) throw new ArgumentException("not a perfect square");
            return $"ok: {r * 10}";
        }
        catch (FormatException) { return "error: not a number"; }
        catch (ArgumentException e) { return "error: " + e.Message; }
    }
}` },
      mcq: { q: 'What is the difference between <code>Map</code> and <code>Bind</code>?', options: ['Map applies a function that cannot fail (T → U); Bind applies one that returns a Result (T → Result&lt;U&gt;) and may fail', 'Map runs only on errors', 'Bind is asynchronous', 'They are the same'], answer: 0, explain: 'Using Map with a Result-returning function would give Result&lt;Result&lt;U&gt;&gt;; Bind flattens it and lets the step switch to the error track.' },
      hints: [`<p>Hint 1: ${C('Result<U> Bind<U>(Func<T, Result<U>> f) => IsOk ? f(Value!) : Result<U>.Fail(Error!);')}</p>`, `<p>Hint 2: ${C('int.TryParse')} keeps parsing exception-free.</p>`, `<p>Hint 3: integer square root: ${C('int r = (int)Math.Round(Math.Sqrt(v)); r * r == v')} — use long for r·r if v is near int.MaxValue.</p>`],
      tests: { sig: 'string -> string', fn: 'pipeline', cases: [
        [['49'], 'ok: 70'],
        [['-4'], 'error: must be positive'],
        [['abc'], 'error: not a number'],
        [['50'], 'error: not a perfect square'],
        [[''], 'error: not a number'],
        [['0'], 'error: must be positive'],
        [['1'], 'ok: 10'],
        [['2147395600'], 'ok: 463400'],
        [['2147483647'], 'error: not a perfect square']
      ] },
      solution: {
        approach: `<p>Each step returns a Result; Bind chains steps that may fail, Map applies the final pure transformation, Match converts to the output string. Errors short-circuit automatically.</p>`,
        code: `
public class Solution
{
    public static string Pipeline(string s) =>
        Parse(s).Bind(Positive).Bind(SquareRoot).Map(x => x * 10)
                .Match(v => $"ok: {v}", e => $"error: {e}");

    static Result<int> Parse(string s) =>
        int.TryParse(s, out int v) ? Result<int>.Ok(v) : Result<int>.Fail("not a number");

    static Result<int> Positive(int v) =>
        v > 0 ? Result<int>.Ok(v) : Result<int>.Fail("must be positive");

    static Result<int> SquareRoot(int v)
    {
        long r = (long)Math.Round(Math.Sqrt(v));
        return r * r == v ? Result<int>.Ok((int)r) : Result<int>.Fail("not a perfect square");
    }
}

public readonly record struct Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    public bool IsOk => Error is null;
    private Result(T? value, string? error) => (Value, Error) = (value, error);
    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(string error) => new(default, error);
    public Result<U> Map<U>(Func<T, U> f) => IsOk ? Result<U>.Ok(f(Value!)) : Result<U>.Fail(Error!);
    public Result<U> Bind<U>(Func<T, Result<U>> f) => IsOk ? f(Value!) : Result<U>.Fail(Error!);
    public R Match<R>(Func<T, R> ok, Func<string, R> fail) => IsOk ? ok(Value!) : fail(Error!);
}`,
        dry: { head: ['input', 'Parse', 'Positive', 'SquareRoot', 'output'], rows: [['"49"', 'Ok(49)', 'Ok(49)', 'Ok(7)', 'ok: 70'], ['"-4"', 'Ok(-4)', 'Err', 'skipped', 'error: must be positive'], ['"50"', 'Ok(50)', 'Ok(50)', 'Err', 'error: not a perfect square']] },
        complexity: `<p>O(length of input) for parsing; each step O(1); no allocations besides the output string.</p>`,
        followUps: ['Collect all validation errors instead of stopping at the first (applicative validation).', 'Add <code>BindAsync</code> for steps that return <code>Task&lt;Result&lt;T&gt;&gt;</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Dispose patterns
     ====================================================================== */
  var T3_CODE = [
    'using var a = new Res("A", log);        // try { ... } finally { a.Dispose(); }',
    'using var b = new Res("B", log);        //   nested try/finally for b',
    'log.Add("body");',
    'if (fail) throw new Exception("body");',
    '// end of scope: b.Dispose(), then a.Dispose() — reverse order'
  ].join('\n');
  topics.push({
    title: 'Dispose Patterns: IDisposable, IAsyncDisposable, SafeHandle and Ownership',
    analogy: `<p>Borrowing a meeting room: you book it, use it, and <b>hand the key back</b> — even if the meeting ends badly. If you forget, the room stays locked until the building manager's nightly sweep (the finalizer) notices — maybe hours later, maybe after the building ran out of rooms. ${C('using')} is the habit of always returning the key on the way out of the door, and the dispose pattern is the set of rules for who returns which key, in what order, and what happens if you return it twice.</p>`,
    explain: `<p>The GC reclaims <b>memory</b>, not other resources: file handles, sockets, database connections, locks, native memory, timers and event subscriptions must be released deterministically. ${C('IDisposable.Dispose()')} is the contract for that.</p>
<h4>1. using statements and declarations</h4>
${P(`
using (var conn = new SqlConnection(cs)) { ... }     // disposed at the closing brace
using var file = File.OpenRead(path);               // C# 8: disposed at the end of the enclosing scope
await using var stream = new AsyncResource();       // IAsyncDisposable: await DisposeAsync()`)}
<p>${C('using')} compiles to ${C('try { ... } finally { x?.Dispose(); }')}. Several using declarations in one scope are disposed in <b>reverse</b> order of declaration. If the constructor throws, the variable is never assigned and nothing is disposed for it (earlier resources still are).</p>
<h4>2. Rules of a correct Dispose</h4>
<ul>
<li><b>Idempotent</b>: calling Dispose twice must be harmless.</li>
<li>After disposal, other members should throw ${C('ObjectDisposedException')} (${C('ObjectDisposedException.ThrowIf(_disposed, this)')} in .NET 7+).</li>
<li><b>Do not throw</b> from Dispose if you can avoid it: an exception from Dispose inside a ${C('finally')} <b>replaces</b> the exception that was already propagating, hiding the real error.</li>
<li><b>Ownership</b>: whoever creates a disposable owns it, unless ownership is explicitly transferred (e.g. ${C('new StreamReader(stream, leaveOpen: true)')} controls this). Never dispose objects you were merely given (e.g. injected by DI — the container disposes them).</li>
</ul>
<h4>3. The full dispose pattern (only for types that directly own unmanaged resources)</h4>
${P(`
public class NativeBuffer : IDisposable
{
    private IntPtr _ptr = Marshal.AllocHGlobal(1024);
    private bool _disposed;

    public void Dispose() { Dispose(true); GC.SuppressFinalize(this); }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing) { /* dispose managed members (other IDisposables) */ }
        Marshal.FreeHGlobal(_ptr);              // free unmanaged state in both paths
        _ptr = IntPtr.Zero;
        _disposed = true;
    }

    ~NativeBuffer() => Dispose(false);         // safety net only; never touch managed objects here
}`)}
<p>Modern code almost never writes a finalizer: wrap the handle in a ${C('SafeHandle')} subclass (which has a reliable critical finalizer) and implement a simple ${C('sealed')} Dispose that disposes the SafeHandle. The ${C('Dispose(bool)')} pattern remains for unsealed base classes so derived classes can extend cleanup.</p>
<h4>4. IAsyncDisposable</h4>
<p>For resources whose cleanup does I/O (flushing a network stream, committing a transaction), implement ${C('ValueTask DisposeAsync()')} and use ${C('await using')}. Classes that implement both should make ${C('DisposeAsync')} do the async cleanup and then the synchronous part, without blocking on async work inside ${C('Dispose()')}.</p>`,
    clues: ['a type holds a file, socket, connection, native memory, timer, or subscribes to events → IDisposable', '"too many open files", connection pool exhausted, memory growing with handles → missing disposal', 'an exception from cleanup hides the original error', 'a library type that takes a Stream: who disposes it? (leaveOpen)'],
    code: [{ lang: 'csharp', run: true, title: 'Dispose order, idempotency and ObjectDisposedException (runnable)', code: `
var log = new List<string>();
try
{
    using var a = new Tracked("A", log);
    using var b = new Tracked("B", log);
    log.Add("body");
    throw new InvalidOperationException("body failed");
}
catch (Exception e) { log.Add("caught: " + e.Message); }
Console.WriteLine(string.Join(" | ", log));
// open A | open B | body | dispose B | dispose A | caught: body failed

var t = new Tracked("C", log);
t.Dispose();
t.Dispose();                                      // idempotent: no second "dispose C"
try { t.Use(); } catch (ObjectDisposedException) { Console.WriteLine("ObjectDisposedException"); }

await using (var r = new AsyncRes()) { Console.WriteLine("using async resource"); }
// using async resource / flushed asynchronously

sealed class Tracked : IDisposable
{
    private readonly string _name;
    private readonly List<string> _log;
    private bool _disposed;
    public Tracked(string name, List<string> log) { _name = name; _log = log; log.Add("open " + name); }
    public void Use() { ObjectDisposedException.ThrowIf(_disposed, this); _log.Add("use " + _name); }
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _log.Add("dispose " + _name);
    }
}

sealed class AsyncRes : IAsyncDisposable
{
    public async ValueTask DisposeAsync() { await Task.Yield(); Console.WriteLine("flushed asynchronously"); }
}` }],
    codeTitle: ['Dispose behaviour'],
    viz: {
      title: 'What using declarations do when the body throws',
      gen: function () {
        return codeFrames(T3_CODE, [
          { l: 1, v: { log: '[open A]' }, narr: '<code>using var a</code> = a try/finally from here to the end of the scope.' },
          { l: 2, v: { log: '[open A, open B]' }, narr: 'A second using declaration opens a nested try/finally. If B\'s constructor had thrown, only A would be disposed.' },
          { l: 3, v: { log: '[open A, open B, body]' }, narr: 'The body runs.' },
          { l: 4, cls: 'bad', v: { log: '[…, body]', exception: 'Exception("body")' }, hv: { exception: 'bad' }, narr: 'The body throws. Before the exception leaves the scope, the finally blocks run — innermost first.' },
          { l: 5, v: { log: '[…, body, dispose B]' }, narr: 'b.Dispose() runs first (reverse declaration order: B was opened last).' },
          { l: 5, v: { log: '[…, dispose B, dispose A]' }, hv: { log: 'ok' }, narr: 'Then a.Dispose(). The original exception continues to the caller — unless a Dispose threw, in which case <b>that</b> exception would replace it.' }
        ]);
      }
    },
    examples: [
      { title: 'Event subscriptions leak', html: `<p>${C('publisher.Changed += OnChanged;')} makes the long-lived publisher hold a reference to the subscriber. If the subscriber never unsubscribes (typically in Dispose), it can never be collected — a classic leak in UI and long-running services. Implement IDisposable to unsubscribe, or use weak event patterns.</p>` },
      { title: 'leaveOpen and ownership', html: `<p>${C('StreamReader')} disposes the stream it wraps by default. If the caller still needs the stream, pass ${C('leaveOpen: true')}.</p>`, code: `
static string ReadHeader(Stream s)
{
    using var reader = new StreamReader(s, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 1024, leaveOpen: true);
    return reader.ReadLine() ?? "";
}   // s is still open for the caller` },
      { title: 'A SafeHandle instead of a finalizer', html: `<p>${C('SafeHandle')} subclasses own the native handle and release it reliably even during abnormal shutdown. Your class then needs only a plain Dispose.</p>`, code: `
using Microsoft.Win32.SafeHandles;
using System.Runtime.InteropServices;

sealed class NativeMemoryHandle : SafeHandleZeroOrMinusOneIsInvalid
{
    public NativeMemoryHandle(int bytes) : base(ownsHandle: true) => SetHandle(Marshal.AllocHGlobal(bytes));
    protected override bool ReleaseHandle() { Marshal.FreeHGlobal(handle); return true; }
}

sealed class Buffer : IDisposable
{
    private readonly NativeMemoryHandle _h = new(256);
    public void Dispose() => _h.Dispose();
}` }
    ],
    deepDive: `<p><b>Finalizers are expensive.</b> An object with a finalizer is registered on allocation, survives its first collection (it moves to the f-reachable queue), runs on the single finalizer thread at an unpredictable time, and is only collected in a later GC — promoting it and everything it references. ${C('GC.SuppressFinalize(this)')} in Dispose removes that cost when the user disposed properly. Finalizer order is not defined, so a finalizer must not use other managed objects.</p>
<p><b>Dispose and async.</b> Never block on async cleanup in ${C('Dispose()')} (${C('.GetAwaiter().GetResult()')} can deadlock under a synchronization context and wastes a thread). Provide ${C('DisposeAsync')} and let callers use ${C('await using')}. DI containers call ${C('DisposeAsync')} when a scope is disposed asynchronously; disposing a scope synchronously that contains only-async-disposable services throws.</p>
<p><b>Analyzers.</b> CA2000 (dispose objects before losing scope), CA1816 (call GC.SuppressFinalize correctly), CA2213 (disposable fields should be disposed) and IDE0063 (use simple using statement) catch most mistakes. Combine with the rule "the creator owns it" and most disposal bugs disappear.</p>`,
    aiEra: `<p><b>What AI changes:</b> it writes the full dispose pattern from memory. <b>Use AI as a partner:</b> ask it to map ownership of every disposable in a class graph. <b>Where AI goes wrong:</b> it adds finalizers to classes with only managed resources, disposes objects it does not own (DI-injected services, shared HttpClient), blocks in Dispose on async work, or throws from Dispose. <b>What you must still own:</b> the ownership model and which resources need async cleanup.</p>`,
    problems: [{
      title: 'Trace Dispose Order Under Failures',
      level: 'Medium', tags: ['IDisposable', 'using', 'exceptions'], companies: ['Microsoft', 'Oracle', 'SAP'],
      statement: `<p>Two resources A and B are created with ${C('using')} declarations, then a body runs. Flags: ${C('failOpenB')} (B's constructor throws ${C('"open B"')}), ${C('failBody')} (the body throws ${C('"body"')}), ${C('failDisposeB')} (B's Dispose throws ${C('"dispose B"')}). Log entries: ${C('"open A"')}, ${C('"open B"')} (or ${C('"open B fails"')}), ${C('"body"')} (or ${C('"body fails"')}), ${C('"dispose B"')} (or ${C('"dispose B fails"')}), ${C('"dispose A"')}, and finally ${C('"caught: MESSAGE"')} if an exception reaches the caller. Return the log.</p>`,
      constraints: `All 8 flag combinations are possible.`,
      example: `<p>${C('(false, true, true)')} → ${H.c('g', '["open A", "open B", "body fails", "dispose B fails", "dispose A", "caught: dispose B"]')} — the Dispose exception <b>replaces</b> the body exception.</p>`,
      brute: { why: `<p>Writing nested try/finally by hand for every resource is verbose and easy to get wrong (wrong order, forgetting the case where a constructor throws). ${C('using')} generates exactly the right structure — the point here is to know precisely what it does.</p>`, code: `
static class Manual
{
    public static void Run(Func<IDisposable> makeA, Func<IDisposable> makeB, Action body)
    {
        var a = makeA();
        try
        {
            var b = makeB();
            try { body(); }
            finally { b.Dispose(); }
        }
        finally { a.Dispose(); }
    }
}` },
      mcq: { q: 'The body throws X, then a Dispose in the finally throws Y. What reaches the caller?', options: ['Y — X is lost', 'X — Y is suppressed', 'An AggregateException with both', 'Both, one after the other'], answer: 0, explain: 'An exception thrown from a finally block replaces the one in flight. That is why Dispose should not throw (and why logs sometimes show only the cleanup failure).' },
      hints: [`<p>Hint 1: build a ${C('Res')} class whose constructor and Dispose log and optionally throw.</p>`, `<p>Hint 2: wrap the scope with the using declarations in a local function, and call it inside ${C('try { ... } catch (Exception e) { log.Add("caught: " + e.Message); }')}.</p>`, `<p>Hint 3: disposal order is reverse declaration order; a resource whose constructor threw was never assigned and is not disposed.</p>`],
      tests: { sig: 'bool bool bool -> string[]', fn: 'traceDispose', cases: [
        [[false, false, false], ['open A', 'open B', 'body', 'dispose B', 'dispose A']],
        [[false, true, false], ['open A', 'open B', 'body fails', 'dispose B', 'dispose A', 'caught: body']],
        [[false, false, true], ['open A', 'open B', 'body', 'dispose B fails', 'dispose A', 'caught: dispose B']],
        [[false, true, true], ['open A', 'open B', 'body fails', 'dispose B fails', 'dispose A', 'caught: dispose B']],
        [[true, false, false], ['open A', 'open B fails', 'dispose A', 'caught: open B']],
        [[true, true, true], ['open A', 'open B fails', 'dispose A', 'caught: open B']],
        [[true, false, true], ['open A', 'open B fails', 'dispose A', 'caught: open B']]
      ] },
      solution: {
        approach: `<p>Model each resource with a class that logs in its constructor and Dispose and can be told to throw. Two using declarations produce nested try/finally blocks; the outer catch shows which exception survived.</p>`,
        code: `
public class Solution
{
    public static string[] TraceDispose(bool failOpenB, bool failBody, bool failDisposeB)
    {
        var log = new List<string>();
        try { Scope(); }
        catch (Exception e) { log.Add("caught: " + e.Message); }
        return log.ToArray();

        void Scope()
        {
            using var a = new Res("A", log, failOpen: false, failDispose: false);
            using var b = new Res("B", log, failOpenB, failDisposeB);
            if (failBody) { log.Add("body fails"); throw new InvalidOperationException("body"); }
            log.Add("body");
        }
    }
}

public sealed class Res : IDisposable
{
    private readonly string _name;
    private readonly List<string> _log;
    private readonly bool _failDispose;

    public Res(string name, List<string> log, bool failOpen, bool failDispose)
    {
        _name = name; _log = log; _failDispose = failDispose;
        if (failOpen) { log.Add($"open {name} fails"); throw new InvalidOperationException($"open {name}"); }
        log.Add($"open {name}");
    }

    public void Dispose()
    {
        if (_failDispose) { _log.Add($"dispose {_name} fails"); throw new InvalidOperationException($"dispose {_name}"); }
        _log.Add($"dispose {_name}");
    }
}`,
        dry: { head: ['flags (openB, body, disposeB)', 'in flight after body', 'after B.Dispose', 'caller sees'], rows: [['F, T, F', 'body', 'body', 'body'], ['F, T, T', 'body', 'dispose B (replaces)', 'dispose B'], ['T, *, *', 'open B (body never runs)', '—', 'open B']] },
        complexity: `<p>O(1) time and O(1) extra space.</p>`,
        followUps: ['How would you keep both exceptions? (catch in Dispose and log, or aggregate manually)', 'Rewrite with <code>IAsyncDisposable</code> and <code>await using</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Async best practices
     ====================================================================== */
  var T4_CODE = [
    'var gate = new SemaphoreSlim(limit);',
    'var tasks = items.Select(async item =>',
    '{',
    '    await gate.WaitAsync(ct);          // at most "limit" inside',
    '    try { return await Work(item, ct); }',
    '    finally { gate.Release(); }',
    '}).ToArray();                          // start all, ordered by input',
    'int[] results = await Task.WhenAll(tasks);   // results in input order'
  ].join('\n');
  topics.push({
    title: 'Async Best Practices: Cancellation, Concurrency Limits and the Classic Mistakes',
    analogy: `<p>A restaurant with 4 cooks takes 100 orders. Good service: start every order, but let only 4 be cooked at once, hand dishes out in the order of the tickets, stop cooking a table's food if they leave (<b>cancellation</b>), and never let a waiter stand frozen at the kitchen door waiting for one dish (<b>blocking on async</b>). Bad service: one waiter shouting orders into the void with nobody listening for problems (<b>async void</b>), or starting 100 orders on 4 burners at once.</p>`,
    explain: `<h4>1. Rules that prevent most async bugs</h4>
${H.table(['Rule', 'Why'], [
  ['Async all the way; never ' + C('.Result') + ' / ' + C('.Wait()') + ' / ' + C('GetAwaiter().GetResult()') + ' on incomplete tasks', 'blocking a thread-pool thread causes starvation; under a single-threaded synchronization context (WinForms/WPF, old ASP.NET) it deadlocks'],
  ['No ' + C('async void') + ' except event handlers', 'exceptions crash the process (raised on the sync context), callers cannot await or observe completion'],
  ['Accept a ' + C('CancellationToken') + ' and pass it down', 'lets callers stop work (request aborted, timeout, shutdown); check with ' + C('ThrowIfCancellationRequested') + ' in CPU loops'],
  [C('ConfigureAwait(false)') + ' in library code', 'avoids capturing the caller\'s context; irrelevant in ASP.NET Core (no context) but matters for UI callers'],
  ['Bound concurrency', C('SemaphoreSlim') + ', ' + C('Parallel.ForEachAsync') + ' or Channels — do not fire 10,000 HTTP calls at once'],
  ['Await every task (or deliberately observe it)', 'fire-and-forget hides exceptions; use a background queue/hosted service instead'],
  [C('ValueTask') + ' only when profiling shows the sync path is hot', 'a ValueTask may be awaited only once and must not be awaited concurrently'],
  ['Prefer ' + C('Task.WhenAll') + ' over sequential awaits for independent work', 'latency becomes the max instead of the sum']
])}
<h4>2. Exceptions with WhenAll</h4>
<p>${C('await Task.WhenAll(t1, t2)')} rethrows <b>one</b> exception (the first stored); all of them are in ${C('whenAllTask.Exception.InnerExceptions')}. Keep a reference to the WhenAll task if you need every failure. Do not rely on which exception is "first".</p>
<h4>3. Cancellation semantics</h4>
<ul>
<li>Cancellation is cooperative: the token only sets a flag; code must observe it.</li>
<li>Canceled operations throw ${C('OperationCanceledException')} (or ${C('TaskCanceledException')}, a subclass); the task ends in the <b>Canceled</b> state, not Faulted.</li>
<li>Combine tokens with ${C('CancellationTokenSource.CreateLinkedTokenSource(a, b)')}; add timeouts with ${C('cts.CancelAfter(TimeSpan)')}; dispose CTSs you create.</li>
</ul>`,
    clues: ['an app hangs when called from a UI thread or old ASP.NET → sync-over-async deadlock', 'exceptions vanish or the process crashes from a background task → async void / fire-and-forget', 'thousands of outgoing calls at once, sockets exhausted, the remote service rate-limits → bound concurrency', 'a request is cancelled by the client but the server keeps working → pass the CancellationToken'],
    code: [{ lang: 'csharp', run: true, title: 'Bounded concurrency, cancellation and WhenAll exceptions (runnable)', code: `
int[] items = Enumerable.Range(1, 10).ToArray();
int current = 0, peak = 0;
var gate = new SemaphoreSlim(3);
var tasks = items.Select(async x =>
{
    await gate.WaitAsync();
    try
    {
        int now = Interlocked.Increment(ref current);
        InterlockedMax(ref peak, now);
        await Task.Delay(5);
        return x * x;
    }
    finally { Interlocked.Decrement(ref current); gate.Release(); }
}).ToArray();
int[] squares = await Task.WhenAll(tasks);
Console.WriteLine($"{string.Join(",", squares)} peak<=3: {peak <= 3}");    // 1,4,...,100 peak<=3: True

using var cts = new CancellationTokenSource();
cts.Cancel();
try { await Task.Delay(1000, cts.Token); }
catch (OperationCanceledException) { Console.WriteLine("canceled"); }      // canceled

var all = Task.WhenAll(FailAfter("A", 20), FailAfter("B", 1));
try { await all; } catch (Exception e) { Console.WriteLine($"await threw one: {e.Message.Length == 1}"); }
Console.WriteLine($"all errors: {string.Join(",", all.Exception!.InnerExceptions.Select(x => x.Message).Order())}");   // A,B

static async Task FailAfter(string msg, int ms) { await Task.Delay(ms); throw new InvalidOperationException(msg); }
static void InterlockedMax(ref int target, int value)
{
    int seen;
    while ((seen = Volatile.Read(ref target)) < value && Interlocked.CompareExchange(ref target, value, seen) != seen) { }
}` }],
    codeTitle: ['Async patterns'],
    viz: {
      title: 'Bounded concurrency with a SemaphoreSlim (limit 2, 5 items)',
      gen: function () {
        var lane = function (rows, hl) { return { type: 'table', label: 'Tasks', columns: ['item', 'state'], rows: rows, hl: hl || {} }; };
        return codeFrames(T4_CODE, [
          { l: 1, v: { 'gate count': 2 }, narr: 'A semaphore with 2 permits.' },
          { l: [2, 7], v: { 'gate count': 0 }, extra: [lane([['1', 'running'], ['2', 'running'], ['3', 'waiting (WaitAsync)'], ['4', 'waiting'], ['5', 'waiting']], { 0: 'cur', 1: 'cur' })], narr: 'All 5 tasks start immediately, but only 2 pass <code>WaitAsync</code>. The others are suspended asynchronously — no threads are blocked.' },
          { l: 6, v: { 'gate count': 0 }, extra: [lane([['1', 'done → 10'], ['2', 'running'], ['3', 'running'], ['4', 'waiting'], ['5', 'waiting']], { 0: 'ok', 2: 'cur' })], narr: 'Item 1 finishes; <code>Release</code> in <code>finally</code> (even on exceptions) lets item 3 in.' },
          { l: 6, v: { 'gate count': 0 }, extra: [lane([['1', 'done → 10'], ['2', 'done → 20'], ['3', 'running'], ['4', 'running'], ['5', 'waiting']], { 1: 'ok', 3: 'cur' })], narr: 'Completion order may differ from input order — that is fine.' },
          { l: 8, v: { results: '[10, 20, 30, 40, 50]' }, hv: { results: 'ok' }, extra: [lane([['1', 'done'], ['2', 'done'], ['3', 'done'], ['4', 'done'], ['5', 'done']], { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' })], narr: '<code>Task.WhenAll</code> returns results in the order of the <b>tasks array</b>, not completion order. Peak concurrency never exceeded 2.' }
        ]);
      }
    },
    examples: [
      { title: 'The classic deadlock', html: `<p>In a WPF click handler: ${C('var data = LoadAsync().Result;')}. ${C('LoadAsync')} awaits I/O and wants to continue on the UI thread — which is blocked waiting for ${C('.Result')}. Neither can proceed. Fix: make the handler ${C('async void')} (event handlers are the exception) and ${C('await LoadAsync()')}; in the library, ${C('ConfigureAwait(false)')} also avoids the context capture.</p>` },
      { title: 'Parallel.ForEachAsync', html: `<p>.NET 6+ has a built-in bounded async loop: ${C('Parallel.ForEachAsync')} with ${C('MaxDegreeOfParallelism')} and a cancellation token.</p>`, code: `
static async Task<int> CountOk(IEnumerable<int> ids, CancellationToken ct)
{
    int ok = 0;
    await Parallel.ForEachAsync(ids, new ParallelOptions { MaxDegreeOfParallelism = 4, CancellationToken = ct },
        async (id, token) => { await Task.Delay(1, token); if (id % 2 == 0) Interlocked.Increment(ref ok); });
    return ok;
}` },
      { title: 'Timeout plus caller cancellation', html: `<p>Link the caller's token with a timeout so either can stop the work, and dispose the source.</p>`, code: `
static async Task<string> FetchWithTimeout(Func<CancellationToken, Task<string>> fetch, TimeSpan timeout, CancellationToken callerToken)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(callerToken);
    cts.CancelAfter(timeout);
    return await fetch(cts.Token);
}` }
    ],
    deepDive: `<p><b>What await really does.</b> The compiler builds a state machine; at an ${C('await')} on an incomplete task it registers a continuation and returns. If a ${C('SynchronizationContext')} (UI) or non-default ${C('TaskScheduler')} is current, the continuation is posted back to it; otherwise it runs on the thread pool. ${C('ConfigureAwait(false)')} skips the capture. In .NET 8, ${C('ConfigureAwait(ConfigureAwaitOptions.SuppressThrowing)')} and ${C('ForceYielding')} exist for advanced cases.</p>
<p><b>Thread-pool starvation.</b> Blocking calls on pool threads (sync-over-async, ${C('Thread.Sleep')}, synchronous I/O) force the pool to inject new threads slowly (the hill-climbing algorithm adds roughly one or two per second beyond the minimum), so latency explodes under load. ${C('dotnet-counters')} shows "ThreadPool Queue Length" growing — the signature of starvation.</p>
<p><b>ValueTask rules.</b> A ${C('ValueTask<T>')} may wrap a result, a ${C('Task<T>')} or an ${C('IValueTaskSource<T>')} that is <b>reused</b> after completion. Awaiting it twice, awaiting concurrently, or calling ${C('.Result')} before completion is undefined behaviour. If you need to do any of that, call ${C('.AsTask()')} once.</p>`,
    aiEra: `<p><b>What AI changes:</b> it converts sync code to async quickly and adds CancellationToken parameters everywhere. <b>Use AI as a partner:</b> <code>Audit this code for sync-over-async, async void, unobserved tasks and missing cancellation</code>. <b>Where AI goes wrong:</b> ${C('Task.Run')} wrappers around async I/O ("async over sync"), ${C('.Result')} in constructors, ${C('ConfigureAwait(false)')} cargo cult in app code, unbounded ${C('Task.WhenAll')} over thousands of calls, and swallowing ${C('OperationCanceledException')} as an error. <b>What you must still own:</b> concurrency limits, cancellation policy and where background work lives (hosted services, queues).</p>`,
    problems: [{
      title: 'Bounded Concurrency with Ordered Results',
      level: 'Medium', tags: ['async', 'SemaphoreSlim', 'Task.WhenAll'], companies: ['Microsoft', 'Uber', 'Swiggy'],
      statement: `<p>Process every item with ${C('async Task<int> Work(int x)')} (it awaits ${C('Task.Yield()')} and returns ${C('x * 2')}), running at most ${C('limit')} items at the same time. Return the results <b>in input order</b> joined by commas, followed by ${C('" peakOk=True"')} if the observed peak concurrency never exceeded the limit. The public method is synchronous for testing: ${C('Process(int[] items, int limit)')} may block on the final task (a console app has no synchronization context) — inside, everything is async.</p>`,
      constraints: `0 ≤ n ≤ 2000, 1 ≤ limit ≤ 64.`,
      example: `<p>${C('Process([1, 2, 3], 2)')} → ${H.c('g', '"2,4,6 peakOk=True"')}</p>`,
      brute: { why: `<p>Awaiting items one by one (${C('foreach ... await Work(x)')}) is correct and ordered but has no concurrency: total latency is the sum. ${C('Task.WhenAll(items.Select(Work))')} without a limit starts everything at once — with real I/O that means thousands of simultaneous connections.</p>`, code: `
static class Sequential
{
    public static async Task<List<int>> Run(int[] items, Func<int, Task<int>> work)
    {
        var r = new List<int>();
        foreach (int x in items) r.Add(await work(x));   // no concurrency
        return r;
    }
}` },
      mcq: { q: 'In what order does <code>await Task.WhenAll(tasks)</code> return results?', options: ['In the order of the tasks passed in, regardless of completion order', 'In completion order', 'Sorted by value', 'Undefined'], answer: 0, explain: 'WhenAll&lt;T&gt; returns T[] where result i belongs to task i. That is why starting tasks in input order gives ordered results for free.' },
      hints: [`<p>Hint 1: ${C('var gate = new SemaphoreSlim(limit);')} then ${C('await gate.WaitAsync(); try { ... } finally { gate.Release(); }')} inside each task.</p>`, `<p>Hint 2: track concurrency with ${C('Interlocked.Increment/Decrement')} on a counter and record the maximum with a CompareExchange loop.</p>`, `<p>Hint 3: ${C('ProcessAsync(...).GetAwaiter().GetResult()')} at the very top is acceptable only because there is no synchronization context; never do it in library code.</p>`],
      tests: { sig: 'int[] int -> string', fn: 'process', cases: [
        [[[1, 2, 3], 2], '2,4,6 peakOk=True'],
        [[[], 3], ' peakOk=True'],
        [[[5], 1], '10 peakOk=True'],
        [[[-1, 0, 1], 1], '-2,0,2 peakOk=True'],
        [[[9, 8, 7, 6, 5, 4, 3, 2, 1], 4], '18,16,14,12,10,8,6,4,2 peakOk=True'],
        [[{ $range: [0, 2000] }, 8], 'checked by function']
      ], check: '(args, out) => out === args[0].map(x => x * 2).join(",") + " peakOk=True"' },
      solution: {
        approach: `<p>Start one task per item in input order; each task acquires the semaphore before working and releases it in ${C('finally')}. ${C('Task.WhenAll')} preserves order. Peak concurrency is measured with interlocked operations.</p>`,
        code: `
public class Solution
{
    public static string Process(int[] items, int limit) => ProcessAsync(items, limit).GetAwaiter().GetResult();

    static async Task<string> ProcessAsync(int[] items, int limit)
    {
        using var gate = new SemaphoreSlim(limit);
        int current = 0, peak = 0;
        var tasks = items.Select(async x =>
        {
            await gate.WaitAsync();
            try
            {
                int now = Interlocked.Increment(ref current);
                int seen;
                while ((seen = Volatile.Read(ref peak)) < now && Interlocked.CompareExchange(ref peak, now, seen) != seen) { }
                return await Work(x);
            }
            finally
            {
                Interlocked.Decrement(ref current);
                gate.Release();
            }
        }).ToArray();
        int[] results = await Task.WhenAll(tasks);
        return $"{string.Join(",", results)} peakOk={peak <= limit}";
    }

    static async Task<int> Work(int x)
    {
        await Task.Yield();
        return x * 2;
    }
}`,
        dry: { head: ['event', 'current', 'peak'], rows: [['item 1 enters', '1', '1'], ['item 2 enters', '2', '2'], ['item 3 waits (limit 2)', '2', '2'], ['item 1 leaves, item 3 enters', '2', '2'], ['all done', '0', '2 ≤ 2 → True']] },
        complexity: `<p>O(n) tasks; wall time ≈ n / limit × work latency; memory O(n) for tasks and results.</p>`,
        followUps: ['Add a CancellationToken that stops waiting items when canceled.', 'Rewrite with <code>Parallel.ForEachAsync</code> or a <code>Channel&lt;T&gt;</code> with N consumers.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Equality and hashing pitfalls
     ====================================================================== */
  var T5_CODE = [
    'var set = new HashSet<Key>();',
    'var k = new Key { Id = 1 };',
    'set.Add(k);                       // stored in bucket hash(1)',
    'k.Id = 2;                         // mutate a key that is IN the set',
    'Console.WriteLine(set.Contains(k));            // False: looks in bucket hash(2)',
    'Console.WriteLine(set.Contains(new Key { Id = 1 })); // False: bucket ok, Equals fails',
    'Console.WriteLine(set.Count);                  // 1: the entry is still there, unreachable'
  ].join('\n');
  topics.push({
    title: 'Equality and Hashing Pitfalls',
    analogy: `<p>A cloakroom files coats by the <b>first letter of the owner's surname</b>: Sharma's coat goes on hook S. If Sharma changes her surname to Verma while the coat hangs there, the attendant looks on hook V and says "no such coat" — although it is still on hook S, unreachable. A hash set is that cloakroom: the hash code decides the hook, ${C('Equals')} confirms the coat. Change anything that feeds the hash while the object is inside, or let ${C('Equals')} and the hash disagree, and items get lost.</p>`,
    explain: `<h4>1. The contract</h4>
<ul>
<li>${C('a.Equals(b)')} ⇒ ${C('a.GetHashCode() == b.GetHashCode()')} (the reverse need not hold).</li>
<li>Equals must be reflexive, symmetric, transitive, consistent, and ${C('x.Equals(null)')} is false.</li>
<li>The hash code of an object must not change while it is used as a key.</li>
<li>${C('==')}, ${C('Equals(object)')}, ${C('IEquatable<T>.Equals')} and ${C('GetHashCode')} should all agree.</li>
</ul>
<h4>2. The pitfalls</h4>
${H.table(['Pitfall', 'Symptom', 'Fix'], [
  ['Mutable fields in GetHashCode', 'items "disappear" from HashSet/Dictionary after mutation', 'hash only immutable state; make keys immutable (records with init)'],
  ['Equals overridden, GetHashCode not', 'equal objects land in different buckets: duplicates in sets', 'always override both (warning CS0659)'],
  ['Records with collection members', C('List<T>') + '/arrays compare by <b>reference</b>, so equal-looking records differ', 'override ' + C('Equals(T?)') + '/' + C('GetHashCode') + ' with ' + C('SequenceEqual') + ', or use a value-equal collection type'],
  ['Inheritance', 'class ' + C('Point.Equals(ColorPoint)') + ' true but reverse false (asymmetric)', 'compare ' + C('GetType()') + '; records do this with ' + C('EqualityContract')],
  ['Floating point', C('double.NaN == double.NaN') + ' is false but ' + C('NaN.Equals(NaN)') + ' is true; ' + C('0.0 == -0.0') + ' is true', 'be explicit about NaN and tolerance; never use doubles with tolerance as dictionary keys'],
  ['Strings and culture', C('"ı".ToUpper()') + ' in Turkish culture, ' + C('StartsWith') + ' culture-sensitive by default', 'use ' + C('StringComparer.Ordinal / OrdinalIgnoreCase') + ' for identifiers'],
  ['Default struct equality', 'reflection-based, boxing, possibly bad hashes', 'implement ' + C('IEquatable<T>') + ' or use ' + C('record struct')],
  ['Reference vs value ==', C('object a = 1, b = 1; a == b') + ' is false', 'know which operator the static types select']
])}
<h4>3. Writing it correctly</h4>
${P(`
public sealed class Sku : IEquatable<Sku>
{
    public string Code { get; }               // immutable
    public Sku(string code) => Code = code.ToUpperInvariant();
    public bool Equals(Sku? o) => o is not null && Code == o.Code;
    public override bool Equals(object? o) => Equals(o as Sku);
    public override int GetHashCode() => Code.GetHashCode();     // same fields as Equals
    public static bool operator ==(Sku? a, Sku? b) => a is null ? b is null : a.Equals(b);
    public static bool operator !=(Sku? a, Sku? b) => !(a == b);
}`)}
<p>Or simply ${C('public sealed record Sku(string Code);')} — and add custom ${C('Equals')} only when a member's own equality is wrong (collections) or normalisation is needed.</p>`,
    clues: ['"the item is in the set but Contains returns false"', 'duplicates in a HashSet of objects that look equal', 'records containing List/array properties compared with ==', 'case-insensitive keys, Turkish-i bugs, or keys built from user-visible text'],
    code: [{ lang: 'csharp', run: true, title: 'Equality traps, demonstrated (runnable)', code: `
var set = new HashSet<MutableKey>();
var k = new MutableKey { Id = 1 };
set.Add(k);
k.Id = 2;
Console.WriteLine($"{set.Contains(k)} {set.Contains(new MutableKey { Id = 1 })} {set.Count}");   // False False 1

var t1 = new Team("A", new List<string> { "x" });
var t2 = new Team("A", new List<string> { "x" });
Console.WriteLine(t1 == t2);                                   // False: List compared by reference

var p1 = new Poly("sq", new[] { 1, 2 });
var p2 = new Poly("sq", new[] { 1, 2 });
Console.WriteLine($"{p1 == p2} {p1.GetHashCode() == p2.GetHashCode()}");   // True True (custom Equals)

Console.WriteLine($"{double.NaN == double.NaN} {double.NaN.Equals(double.NaN)} {0.0 == -0.0}");  // False True True

var ci = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) { ["Key"] = 1 };
Console.WriteLine(ci.ContainsKey("KEY"));                      // True

class MutableKey
{
    public int Id { get; set; }
    public override bool Equals(object? o) => o is MutableKey m && m.Id == Id;
    public override int GetHashCode() => Id;
}
record Team(string Name, List<string> Members);
record Poly(string Name, int[] Points)
{
    public virtual bool Equals(Poly? other) => other is not null && Name == other.Name && Points.AsSpan().SequenceEqual(other.Points);
    public override int GetHashCode()
    {
        var h = new HashCode();
        h.Add(Name);
        foreach (int p in Points) h.Add(p);
        return h.ToHashCode();
    }
}` }],
    codeTitle: ['Equality pitfalls'],
    viz: {
      title: 'How a mutated key gets lost in a HashSet',
      gen: function () {
        var buckets = function (vals, hl) { return { type: 'array', label: 'HashSet buckets (index = hash mod 4)', values: vals, hl: hl || {} }; };
        return codeFrames(T5_CODE, [
          { l: 1, extra: [buckets(['', '', '', ''])], narr: 'An empty set with 4 buckets (simplified).' },
          { l: [2, 3], extra: [buckets(['', 'k(Id=1)', '', ''], { 1: 'ok' })], narr: 'k is added. Its hash is 1, so it is stored in bucket 1.' },
          { l: 4, extra: [buckets(['', 'k(Id=2)', '', ''], { 1: 'bad' })], narr: 'Now k.Id changes to 2. The object still sits in bucket 1 — the set has no idea its hash changed.' },
          { l: 5, extra: [buckets(['', 'k(Id=2)', '?', ''], { 2: 'cur' })], narr: '<code>Contains(k)</code> computes hash 2 and looks in bucket 2: empty → <b>False</b>, although k is in the set.' },
          { l: 6, extra: [buckets(['', 'k(Id=2)', '', ''], { 1: 'cur' })], narr: 'A fresh key with Id = 1 hashes to bucket 1 and finds k, but <code>Equals</code> compares Id 1 with 2 → <b>False</b>.' },
          { l: 7, extra: [buckets(['', 'k(Id=2)', '', ''], { 1: 'bad' })], narr: 'Count is still 1: the entry exists but is unreachable by any lookup. In a dictionary used as a cache, that is a memory leak plus a logic bug.' }
        ]);
      }
    },
    examples: [
      { title: 'Asymmetric equality with inheritance', html: `<p>${C('class Point { Equals: o is Point p && X == p.X && Y == p.Y }')} and ${C('class ColorPoint : Point')} adding Color: ${C('point.Equals(colorPoint)')} is true (it only checks X and Y), ${C('colorPoint.Equals(point)')} is false. A HashSet containing both behaves differently depending on insertion order. Records avoid this: the generated Equals first compares ${C('EqualityContract')} (the run-time type).</p>` },
      { title: 'NaN as a dictionary key', html: `<p>${C('dict[double.NaN] = 1; dict.ContainsKey(double.NaN)')} is true (Dictionary uses ${C('Equals')}, for which NaN equals NaN), but ${C('x == double.NaN')} is always false. Use ${C('double.IsNaN(x)')} for checks, and avoid floating-point keys altogether when values come from computation.</p>` },
      { title: 'Value equality over a collection member', html: `<p>Records let you replace the generated equality by declaring ${C('virtual bool Equals(T? other)')} and ${C('GetHashCode')}. The generated ${C('==')} then uses your Equals.</p>`, code: `
record Tags(string Owner, string[] Items)
{
    public virtual bool Equals(Tags? other) =>
        other is not null && Owner == other.Owner && Items.AsSpan().SequenceEqual(other.Items);
    public override int GetHashCode() => HashCode.Combine(Owner, Items.Length);
}` }
    ],
    deepDive: `<p><b>How records implement equality.</b> A record class gets ${C('protected virtual Type EqualityContract => typeof(R)')}, ${C('virtual bool Equals(R? other)')} that checks reference equality, null, ${C('EqualityContract == other.EqualityContract')} and then each field with ${C('EqualityComparer<TField>.Default')}, plus a matching ${C('GetHashCode')} and ${C('==')}/${C('!=')}. Derived records override ${C('EqualityContract')}, which makes equality symmetric across the hierarchy. If you declare ${C('Equals(R? other)')} yourself it must be ${C('virtual')} (or the record sealed) and you should also write ${C('GetHashCode')}.</p>
<p><b>Hash quality.</b> ${C('HashCode.Combine')} uses a randomized seed per process (like string hashing) and mixes well; never persist hash codes or use them across processes. Weak hashes (XOR of fields, ${C('x + y')} for points where (1,2) and (2,1) collide) turn O(1) lookups into O(n) chains. ${C('string.GetHashCode')} is randomized per process to prevent hash-flooding attacks.</p>
<p><b>Comparers as a design tool.</b> Instead of baking one notion of equality into a type, pass an ${C('IEqualityComparer<T>')} to the collection (${C('new HashSet<string>(StringComparer.OrdinalIgnoreCase)')}, ${C('ReferenceEqualityComparer.Instance')}). This keeps types simple and makes the policy explicit at the use site.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating Equals/GetHashCode is trivial, and assistants often suggest records. <b>Use AI as a partner:</b> <code>Check these types for equality contract violations: mutable hashed state, inheritance, collections, floating point, culture</code>. <b>Where AI goes wrong:</b> it overrides Equals without GetHashCode, hashes mutable properties, assumes records compare lists by content, and uses culture-sensitive ${C('ToLower()')} for keys. <b>What you must still own:</b> the identity semantics of your domain — what does "the same customer" mean?</p>`,
    problems: [{
      title: 'Value Equality for a Record with an Array',
      level: 'Medium', tags: ['records', 'equality', 'GetHashCode'], companies: ['Microsoft', 'Bloomberg', 'Atlassian'],
      statement: `<p>Shapes arrive as strings ${C('"name:p1,p2,..."')} (points may be empty: ${C('"dot:"')}). Parse each into ${C('record Shape(string Name, int[] Points)')} and return how many <b>distinct</b> shapes there are when equality means same name (ordinal) and same points in the same order. The default record equality compares the array by reference, so you must override ${C('Equals(Shape?)')} and ${C('GetHashCode')} consistently.</p>`,
      constraints: `Up to 10<sup>4</sup> shapes, up to 100 points each.`,
      example: `<p>${C('["sq:1,2", "sq:1,2", "sq:2,1"]')} → ${H.c('g', '2')}</p>`,
      brute: { why: `<p>Comparing every pair with a hand-written loop is O(n²·m). With correct Equals/GetHashCode the shapes go into a ${C('HashSet<Shape>')}: O(n·m). Using the generated record equality would count every shape as distinct (arrays compare by reference).</p>`, code: `
record Naive(string Name, int[] Points);
static class Broken
{
    public static int Count(string[] s) => s.Select(x => new Naive(x.Split(':')[0], Array.Empty<int>())).Distinct().Count();   // wrong data, and arrays by reference
}` },
      mcq: { q: 'You override <code>Equals(Shape? other)</code> in the record using SequenceEqual but keep the generated GetHashCode. What breaks?', options: ['Equal shapes get different hash codes (array reference hash), so the HashSet keeps duplicates', 'Nothing', 'Compile error', 'Equals is never called'], answer: 0, explain: 'The generated GetHashCode hashes the array reference. Equal objects must have equal hash codes, so GetHashCode has to use the array contents too (the compiler warns when Equals is user-defined).' },
      hints: [`<p>Hint 1: ${C('public virtual bool Equals(Shape? o) => o is not null && Name == o.Name && Points.AsSpan().SequenceEqual(o.Points);')}</p>`, `<p>Hint 2: ${C('var h = new HashCode(); h.Add(Name); foreach (var p in Points) h.Add(p); return h.ToHashCode();')}</p>`, `<p>Hint 3: parse with ${C('Split(\':\')')}, then split the points on commas with ${C('StringSplitOptions.RemoveEmptyEntries')}.</p>`],
      tests: { sig: 'string[] -> int', fn: 'distinctShapes', cases: [
        [[['sq:1,2', 'sq:1,2', 'sq:2,1']], 2],
        [[[]], 0],
        [[['dot:', 'dot:']], 1],
        [[['a:1', 'A:1']], 2],
        [[['t:1,2,3', 't:1,2', 't:1,2,3,4', 't:1,2,3']], 3],
        [[['x:-1,0', 'x:-1,0', 'y:-1,0']], 2],
        [[{ $rep: 'big:1,2,3,4,5,6,7,8,9,10', n: 10000 }], 1]
      ] },
      solution: {
        approach: `<p>Override the record's equality so it compares the array contents, and make GetHashCode use exactly the same data. Then a HashSet does the deduplication in linear time.</p>`,
        code: `
public class Solution
{
    public static int DistinctShapes(string[] items)
    {
        var set = new HashSet<Shape>();
        foreach (string s in items)
        {
            string[] parts = s.Split(':');
            int[] pts = parts[1].Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray();
            set.Add(new Shape(parts[0], pts));
        }
        return set.Count;
    }
}

public sealed record Shape(string Name, int[] Points)
{
    public bool Equals(Shape? other) =>
        other is not null && Name == other.Name && Points.AsSpan().SequenceEqual(other.Points);

    public override int GetHashCode()
    {
        var h = new HashCode();
        h.Add(Name);
        foreach (int p in Points) h.Add(p);
        return h.ToHashCode();
    }
}`,
        dry: { head: ['input', 'hash uses', 'already in set?', 'count'], rows: [['sq:1,2', 'sq, 1, 2', 'no', '1'], ['sq:1,2', 'sq, 1, 2', 'yes (Equals true)', '1'], ['sq:2,1', 'sq, 2, 1', 'no (order differs)', '2']] },
        complexity: `<p>O(total points) to parse, hash and compare; O(n) memory.</p>`,
        followUps: ['Make the points order-insensitive (sort a copy before hashing and comparing).', 'Replace <code>int[]</code> with an immutable, value-equal wrapper type and remove the overrides.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Output prediction I: evaluation order, overloads, numbers, init order
     ====================================================================== */
  var T6_CODE = [
    'int i = 0;',
    'int r = i++ + ++i;',
    '//      ^^^   ^^^',
    '//  value 0,  i becomes 1;  then ++i: i becomes 2, value 2',
    'Console.WriteLine($"{r} {i}");   // 2 2'
  ].join('\n');
  topics.push({
    title: 'Question Bank I: Evaluation Order, Overload Resolution, Numbers and Initialization',
    analogy: `<p>Trick questions are like magic tricks: they look impossible until you know the <b>one rule</b> the magician relies on. "Why did it print 2,0,0?" stops being mysterious once you know that C# evaluates operands strictly <b>left to right</b>. This topic collects the rules behind the most common C# output puzzles so you can solve a new one by asking "which rule is this testing?" instead of guessing.</p>`,
    explain: `<h4>Rule 1 — operands are evaluated left to right</h4>
<p>C# guarantees left-to-right evaluation of operands and arguments, and side effects happen in that order. Precedence only decides grouping, not timing. ${C('i++ + ++i')} with i = 0: the left operand yields 0 (i becomes 1), the right operand makes i 2 and yields 2 → 2. In ${C('arr[k] = k = 2')} the array and index (k = 0) are evaluated <b>before</b> the right-hand side, so ${C('arr[0]')} becomes 2.</p>
<h4>Rule 2 — overload resolution prefers the best conversion</h4>
${H.table(['Call', 'Candidates', 'Chosen', 'Why'], [
  [C('M(1)'), C('M(long)') + ', ' + C('M(object)'), 'long', 'implicit numeric conversion beats boxing'],
  [C('M((short)1)'), 'same', 'long', 'short → long widening is still better than boxing'],
  [C('M("s")'), 'same', 'object', 'only applicable one'],
  [C('M(null)'), C('M(string)') + ', ' + C('M(object)'), 'string', 'more specific reference type'],
  [C('M(1, 2)'), C('M(params int[])') + ', ' + C('M(int, int)'), 'M(int, int)', 'normal form beats expanded params form']
])}
<h4>Rule 3 — integer arithmetic</h4>
<ul>
<li>Integer division truncates toward zero: ${C('-7 / 2 == -3')}; the remainder has the sign of the dividend: ${C('-7 % 3 == -1')}.</li>
<li>Overflow wraps silently in the default unchecked context (${C('int.MaxValue + 1 == int.MinValue')}), but <b>constant</b> expressions that overflow are compile errors.</li>
<li>Casting a double to int truncates toward zero (${C('(int)-3.99 == -3')}); ${C('Math.Round(2.5) == 2')} (banker's rounding to even), ${C('Math.Round(3.5) == 4')}.</li>
<li>Narrowing casts keep the low bits: ${C('(byte)300 == 44')}.</li>
<li>${C('0.1 + 0.2 == 0.3')} is False; it prints ${C('0.30000000000000004')} since .NET Core 3.0 (shortest round-trippable formatting).</li>
</ul>
<h4>Rule 4 — static field initializers run in textual order</h4>
<p>${C('static string Order = A + "|" + B; static string A = "a"; static string B = "b";')} — when Order is initialised, A and B still hold ${C('null')}, so Order is ${C('"|"')} (string concatenation treats null as empty). Instance field initializers also run in textual order, <b>before</b> the base constructor body.</p>
<h4>Rule 5 — string formatting and null</h4>
<p>${C('$"{1,4}|{"ab",-4}|{3.14159:F2}|{255:X}"')} → ${C('"   1|ab  |3.14|FF"')} (alignment, format strings). ${C('null')} interpolates as an empty string; ${C('s?.Length ?? -1')} is -1 for null s.</p>`,
    clues: ['an expression with several side effects (++, assignments) on the same variable', 'overloaded methods called with literals, null, short/long, params', 'negative division, modulo, casts, rounding, overflow', 'static fields that refer to each other'],
    code: [{ lang: 'csharp', run: true, title: 'The rules in action (runnable; outputs verified on .NET 8)', code: `
int i = 0;
int r = i++ + ++i;
Console.WriteLine($"{r} {i}");                       // 2 2
int[] arr = { 0, 0, 0 }; int k = 0;
arr[k] = k = 2;
Console.WriteLine($"{string.Join(",", arr)} {k}");    // 2,0,0 2
Console.WriteLine($"{O.M(1)} {O.M((short)1)} {O.M("s")} {O.N(null)}");   // long long object string
int a = 7, m = int.MaxValue, big = 300;
Console.WriteLine($"{-a / 2} {-a % 3} {m + 1} {(byte)big}");             // -3 -1 -2147483648 44
Console.WriteLine($"{(int)-3.99} {Math.Round(2.5)} {Math.Round(3.5)}");  // -3 2 4
Console.WriteLine(0.1 + 0.2);                                            // 0.30000000000000004
Console.WriteLine(Inits.Order);                                          // |
Console.WriteLine($"{1,4}|{"ab",-4}|{3.14159:F2}|{255:X}");             //    1|ab  |3.14|FF

static class O
{
    public static string M(long x) => "long";
    public static string M(object x) => "object";
    public static string N(string? s) => "string";
    public static string N(object? o) => "object";
}
static class Inits
{
    public static string Order = A + "|" + B;   // runs first: A and B are still null
    static string A = "a";
    static string B = "b";
}` }],
    codeTitle: ['Question bank rules'],
    viz: {
      title: 'Evaluating i++ + ++i step by step',
      gen: function () {
        return codeFrames(T6_CODE, [
          { l: 1, v: { i: 0 }, narr: 'Start with i = 0.' },
          { l: 2, v: { i: 1, left: 0 }, hv: { left: 'cur' }, narr: 'Left operand first: <code>i++</code> yields the <b>old</b> value 0 and increments i to 1.' },
          { l: 2, v: { i: 2, left: 0, right: 2 }, hv: { right: 'cur' }, narr: 'Then the right operand: <code>++i</code> increments i to 2 and yields the <b>new</b> value 2.' },
          { l: 2, v: { i: 2, r: 2 }, hv: { r: 'ok' }, narr: 'Finally the addition: 0 + 2 = 2. C# guarantees this order (unlike C/C++, where modifying i twice here is undefined behaviour).' },
          { l: 5, v: { i: 2, r: 2 }, out: '2 2', narr: 'Output "2 2". Same rule explains <code>arr[k] = k = 2</code>: the target arr[0] is fixed before k changes.' }
        ]);
      }
    },
    examples: [
      { title: 'Constant overflow is a compile error', html: `<p>${C('int x = int.MaxValue + 1;')} does not compile (CS0220: the operation overflows at compile time in checked mode). ${C('int m = int.MaxValue; int x = m + 1;')} compiles and wraps to ${C('int.MinValue')}. Interviewers like asking which of the two compiles.</p>` },
      { title: 'Compound assignment hides a cast', html: `<p>${C('byte b = 250; b += 10;')} compiles and gives 4, because ${C('b += 10')} means ${C('b = (byte)(b + 10)')}. ${C('b = b + 10;')} does not compile: ${C('b + 10')} is an int.</p>`, code: `
byte b = 250;
b += 10;                 // (byte)(260) = 4
Console.WriteLine(b);    // 4` },
      { title: 'Char arithmetic', html: `<p>${C('Console.WriteLine(\'a\' + 1)')} prints 98 (char promoted to int); ${C('Console.WriteLine((char)(\'a\' + 1))')} prints b; ${C('Console.WriteLine("" + \'a\' + 1)')} prints a1 (string concatenation left to right).</p>` }
    ],
    deepDive: `<p><b>Why C# fixed evaluation order.</b> C and C++ leave the order of operand evaluation unspecified (and some cases undefined), which makes ${C('i++ + ++i')} a bug. C# (and Java) specify left-to-right evaluation, so such code is legal and deterministic — but still unreadable. In code review, any expression that modifies a variable and reads it again should be split into statements.</p>
<p><b>Better conversion rules.</b> Overload resolution compares candidates parameter by parameter using "better conversion from expression" and "better conversion target" rules: identity beats implicit numeric; numeric conversions beat boxing; a conversion to a more specific type (one implicitly convertible to the other) is better; between signed and unsigned of different sizes specific tie-breakers apply. Generic methods lose ties against non-generic ones, and the normal form of a params method beats the expanded form. C# 13 adds ${C('params')} collections and ${C('OverloadResolutionPriority')}, so puzzles change across versions — always state the version.</p>
<p><b>Static initialization subtleties.</b> Without a static constructor, the class is marked ${C('beforefieldinit')} and the runtime may run initializers earlier (at first access to any static field, or even eagerly). With an explicit static constructor the timing is precise (first access to any member). Cycles between two classes' static initializers can observe default values — another classic puzzle.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants answer standard output puzzles well — and fail on version-specific details. <b>Use AI as a partner:</b> generate variations of a puzzle and predict them yourself before running. <b>Where AI goes wrong:</b> it applies C/C++ rules (undefined behaviour) to C#, confuses ${C('Math.Round')} with "round half up", forgets textual order of static initializers, and mixes up overload rules between C# versions. <b>What you must still own:</b> the habit of reducing any puzzle to the rule it tests — and running it to confirm.</p>`,
    problems: [{
      title: 'Predict the Output: Order, Overloads and Integers',
      level: 'Easy', tags: ['output prediction', 'evaluation order', 'overload resolution'], companies: ['TCS', 'Infosys', 'Microsoft', 'Accenture'],
      statement: `<p>Write down the 8 lines this program prints.</p>${P(`
int i = 0;
int r = i++ + ++i;
Console.WriteLine($"{r} {i}");
int[] arr = { 0, 0, 0 }; int k = 0;
arr[k] = k = 2;
Console.WriteLine($"{string.Join(",", arr)} {k}");
Console.WriteLine(O.M(1));
Console.WriteLine(O.M((short)1));
Console.WriteLine(O.M("s"));
Console.WriteLine(Inits.Order);
int big = 300;
Console.WriteLine((byte)big);
Console.WriteLine(-7 / 2 + " " + -7 % 3);

static class O
{
    public static string M(long x) => "long";
    public static string M(object x) => "object";
}
static class Inits
{
    public static string Order = A + "|" + B;
    static string A = "a";
    static string B = "b";
}`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 2 is ${H.c('g', '2,0,0 2')}: the assignment target ${C('arr[k]')} is evaluated (with k = 0) before ${C('k = 2')} runs.</p>`,
    brute: { why: `<p>Guessing "maths order" gives ${C('1 1')}, ${C('0,0,2 2')}, ${C('object')} for M(1) (thinking int "is an object"), and ${C('a|b')} for Order. Each line tests one precise rule: left-to-right evaluation, better conversion (widening beats boxing), textual static initialisation order, low-bit truncation, truncating division.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "1 1", "0,0,2 2", "object", "object", "object", "a|b", "44", "-4 2" };
}` },
    mcq: { q: 'Why does <code>O.M(1)</code> choose <code>M(long)</code> over <code>M(object)</code>?', options: ['An implicit numeric conversion (int → long) is better than a boxing conversion (int → object)', 'long is declared first', 'object overloads are never chosen for literals', 'The literal 1 is a long'], answer: 0, explain: 'Both are applicable; the better-conversion rules rank numeric widening above boxing.' },
    hints: [`<p>Hint 1: C# evaluates operands left to right, including the target of an assignment.</p>`, `<p>Hint 2: for overloads, rank the conversions: identity &gt; implicit numeric &gt; boxing.</p>`, `<p>Hint 3: static field initializers run top to bottom; at that moment later fields are still null.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '2 2\n2,0,0 2\nlong\nlong\nobject\n|\n44\n-3 -1' }] },
    solution: {
      approach: `<p>Apply one rule per line: left-to-right evaluation (lines 1–2), better conversion (3–5), textual static initialisation (6), narrowing keeps low bits (7), truncating division and dividend-signed remainder (8).</p>`,
      code: { lang: 'csharp', run: true, code: `
int i = 0;
int r = i++ + ++i;                                  // 0 + 2
Console.WriteLine($"{r} {i}");                       // 2 2
int[] arr = { 0, 0, 0 }; int k = 0;
arr[k] = k = 2;                                     // target arr[0] fixed first
Console.WriteLine($"{string.Join(",", arr)} {k}");    // 2,0,0 2
Console.WriteLine(O.M(1));                          // long   (widening beats boxing)
Console.WriteLine(O.M((short)1));                   // long
Console.WriteLine(O.M("s"));                        // object
Console.WriteLine(Inits.Order);                     // |      (A and B still null)
int big = 300;
Console.WriteLine((byte)big);                       // 44     (300 - 256)
Console.WriteLine(-7 / 2 + " " + -7 % 3);           // -3 -1

static class O
{
    public static string M(long x) => "long";
    public static string M(object x) => "object";
}
static class Inits
{
    public static string Order = A + "|" + B;
    static string A = "a";
    static string B = "b";
}` },
      dry: { head: ['line', 'rule', 'output'], rows: [['i++ + ++i', 'left to right', '2 2'], ['arr[k] = k = 2', 'target evaluated first', '2,0,0 2'], ['M(1)', 'widening beats boxing', 'long'], ['Inits.Order', 'textual init order', '|'], ['(byte)300', 'low 8 bits', '44'], ['-7 / 2, -7 % 3', 'truncate toward zero', '-3 -1']] },
      complexity: `<p>O(1). The skill is mapping each line to its rule.</p>`,
      followUps: ['What prints for <code>O.M(1u)</code>? (long: uint → long is implicit)', 'What if Inits had a static constructor setting A and B? (Initializers still run first, then the constructor body.)']
    }
  }]
  });

  /* ======================================================================
     TOPIC 7 — Output prediction II: exceptions, finally, filters, LINQ, iterators, closures
     ====================================================================== */
  var T7_CODE = [
    'try',
    '{',
    '    try { throw new InvalidOperationException("x"); }',
    '    finally { Console.WriteLine("inner finally"); }',
    '}',
    'catch (Exception e) when (Log("filter"))',
    '{',
    '    Console.WriteLine("caught " + e.Message);',
    '}'
  ].join('\n');
  topics.push({
    title: 'Question Bank II: Exceptions, finally, Filters, Deferred LINQ, Iterators and Closures',
    analogy: `<p>A theatre with a fire drill: when the alarm sounds, a marshal first walks the building <b>asking</b> each floor "will you handle this?" (exception filters run during the first pass), and only after someone says yes do the floors below <b>clean up and leave</b> (finally blocks run during the second pass). Many C# puzzles hinge on exactly this kind of hidden timing: when does code actually run — now, later when enumerated, or after the method has returned?</p>`,
    explain: `<h4>Rule 6 — finally runs after the return value is computed</h4>
<p>${C('try { return 1; } finally { Console.WriteLine("finally"); }')}: the value 1 is stored, finally prints, then the method returns 1. You cannot ${C('return')} from a finally block in C# (CS0157). If the try returns a variable and finally modifies that variable, the already-computed value is returned (for value types).</p>
<h4>Rule 7 — exception filters run before inner finally blocks</h4>
<p>.NET uses two-pass exception handling: the first pass searches for a handler and <b>evaluates filters</b> (${C('when (...)')}); the second pass unwinds the stack, running finally blocks, then enters the chosen catch. So a filter that logs runs <b>before</b> the inner finally — useful for logging with the full stack intact (${C('catch (Exception e) when (Log(e))')} returning false never catches).</p>
<h4>Rule 8 — LINQ is deferred</h4>
<ul>
<li>${C('Where')}, ${C('Select')}, ${C('OrderBy')} build a query; nothing runs until enumeration (${C('foreach')}, ${C('ToList')}, ${C('Count')}, ${C('First')}).</li>
<li>Each enumeration runs the whole pipeline again — side effects repeat, data changes in the source are visible.</li>
<li>${C('First()')} stops early: it processes elements only until one is found.</li>
</ul>
<h4>Rule 9 — iterator methods run lazily</h4>
<p>A method with ${C('yield return')} runs <b>no code</b> when called (not even argument validation!) — it returns an enumerator; the body runs on the first ${C('MoveNext')}. That is why argument checks belong in a non-iterator wrapper method.</p>
<h4>Rule 10 — closures capture variables, not values</h4>
<p>Lambdas capture the variable itself. A ${C('for')} loop variable is one variable shared by all iterations (all lambdas see its final value), while ${C('foreach')} declares a fresh variable per iteration (since C# 5). Changing a captured local after creating the lambda changes what the lambda sees.</p>
<h4>Rule 11 — struct copies</h4>
<p>Structs are copied on assignment, when passed by value, when returned from properties/indexers, and defensively when accessed through ${C('readonly')} fields or ${C('in')} parameters (unless the struct is ${C('readonly')}). Mutating a copy does not change the original.</p>`,
    clues: ['try/finally with return, nested try with catch filters', 'a LINQ query defined before the source changes, or with side effects in Select', 'a yield-based method with argument checks or Console output', 'lambdas created in a loop and invoked later'],
    code: [{ lang: 'csharp', run: true, title: 'Timing rules in action (runnable; outputs verified on .NET 8)', code: `
Console.WriteLine(F());
// finally
// 1
try
{
    try { throw new InvalidOperationException("x"); }
    finally { Console.WriteLine("inner finally"); }
}
catch (Exception e) when (Log("filter")) { Console.WriteLine("caught " + e.Message); }
// filter / inner finally / caught x

var list = new List<int> { 1, 2, 3 };
var q = list.Where(x => x > 1);
list.Add(4);
Console.WriteLine(q.Count());                     // 3  (query runs now, sees 4)

int calls = 0;
var s = list.Select(x => { calls++; return x * 2; });
Console.WriteLine(calls);                         // 0
_ = s.ToArray(); Console.WriteLine(calls);        // 4
_ = s.First(); Console.WriteLine(calls);          // 5  (First stops after one element)

var g = Gen();
Console.WriteLine("before");
foreach (var v in g) Console.WriteLine(v);        // before / start / 1

var fs = new List<Func<int>>();
for (int i = 0; i < 3; i++) fs.Add(() => i);
Console.WriteLine(string.Join(",", fs.Select(f => f())));   // 3,3,3
fs.Clear();
foreach (int x in new[] { 0, 1, 2 }) fs.Add(() => x);
Console.WriteLine(string.Join(",", fs.Select(f => f())));   // 0,1,2

static int F() { try { return 1; } finally { Console.WriteLine("finally"); } }
static bool Log(string s) { Console.WriteLine(s); return true; }
static IEnumerable<int> Gen() { Console.WriteLine("start"); yield return 1; }` }],
    codeTitle: ['Timing rules'],
    viz: {
      title: 'Two-pass exception handling: the filter runs before the inner finally',
      gen: function () {
        var stack = function (items, hl) { return { type: 'stack', label: 'Handler search (pass 1) / unwinding (pass 2)', items: items, hl: hl || {} }; };
        return codeFrames(T7_CODE, [
          { l: 3, cls: 'bad', extra: [stack(['outer try (catch when Log)', 'inner try (finally)'], { 1: 'cur' })], narr: 'The inner try throws InvalidOperationException("x").' },
          { l: 6, extra: [stack(['outer try (catch when Log)', 'inner try (finally)'], { 0: 'cur' })], out: 'filter', narr: '<b>Pass 1:</b> the runtime walks up looking for a handler. The inner block has only a finally (no handler). The outer catch has a filter, so the filter <b>runs now</b> — the inner finally has not run yet, and the stack is still intact.' },
          { l: 4, extra: [stack(['outer try (catch when Log)', 'inner try (finally)'], { 1: 'ok' })], out: 'filter\ninner finally', narr: 'The filter returned true. <b>Pass 2:</b> unwinding starts — finally blocks between the throw and the handler run, innermost first.' },
          { l: 8, extra: [stack(['outer catch body'], { 0: 'ok' })], out: 'filter\ninner finally\ncaught x', narr: 'Finally, the catch body runs. If the filter had returned false, the search would have continued outward without unwinding anything.' }
        ]);
      }
    },
    examples: [
      { title: 'Argument validation in an iterator', html: `<p>${C('static IEnumerable<int> Take(int[] a, int n) { if (n < 0) throw new ArgumentOutOfRangeException(); for (...) yield return a[i]; }')} — calling ${C('Take(a, -1)')} does not throw; the exception appears later when someone enumerates. Split it: a public non-iterator method validates and returns a private iterator (or a local iterator function).</p>`, code: `
static IEnumerable<int> TakeChecked(int[] a, int n)
{
    ArgumentOutOfRangeException.ThrowIfNegative(n);   // runs immediately
    return Iterator();
    IEnumerable<int> Iterator() { for (int i = 0; i < Math.Min(n, a.Length); i++) yield return a[i]; }
}` },
      { title: 'Multiple enumeration', html: `<p>${C('var users = db.Users.Where(...);')} followed by ${C('if (users.Any()) foreach (var u in users)')} runs the query twice (two database round trips, possibly different results). Materialise once with ${C('ToList()')} when you need several passes. Analyzer CA1851 warns about possible multiple enumeration.</p>` },
      { title: 'finally does not change a returned value', html: `<p>The return value is copied before finally runs, so assigning the variable inside finally changes nothing for the caller.</p>`, code: `
static int G()
{
    int x = 1;
    try { return x; }          // value 1 captured
    finally { x = 99; }        // too late
}                              // G() == 1` }
    ],
    deepDive: `<p><b>Exception filters and stack traces.</b> Because filters run during the first pass, the stack is not yet unwound — a crash dump taken in a filter shows the throwing frame, and ${C('catch (Exception e) when (LogAndReturnFalse(e))')} is the idiomatic way to log every exception passing through a layer without catching it. Rethrowing with ${C('throw;')} preserves the stack trace; ${C('throw e;')} resets it; ${C('ExceptionDispatchInfo.Capture(e).Throw()')} preserves it across threads.</p>
<p><b>async and exceptions.</b> An ${C('async Task')} method never throws synchronously — even argument validation exceptions are stored in the returned task and surface at ${C('await')}. ${C('async void')} exceptions are raised on the synchronization context (or crash the process). An unobserved faulted task no longer crashes the process (since .NET 4.5) but raises ${C('TaskScheduler.UnobservedTaskException')} when collected.</p>
<p><b>Iterators and finally.</b> A ${C('finally')} inside an iterator runs when the enumerator is disposed — ${C('foreach')} disposes it even if you ${C('break')} early; manual ${C('GetEnumerator()')} use without ${C('Dispose')} skips it. LINQ operators dispose source enumerators properly.</p>`,
    aiEra: `<p><b>What AI changes:</b> it explains these puzzles fluently. <b>Use AI as a partner:</b> ask for "the rule behind this output" and then write your own variant that breaks the AI's explanation. <b>Where AI goes wrong:</b> it says finally runs before the filter, claims LINQ queries cache results, forgets that iterator bodies are lazy, and mixes up C# 4 and C# 5 foreach capture semantics. <b>What you must still own:</b> running the code and connecting each output to a rule you can state in one sentence.</p>`,
    problems: [{
      title: 'Predict the Output: finally, Filters, LINQ and Iterators',
      level: 'Easy', tags: ['output prediction', 'exceptions', 'LINQ'], companies: ['Microsoft', 'Infosys', 'Wipro', 'EPAM'],
      statement: `<p>Write down the 9 lines this program prints.</p>${P(`
Console.WriteLine(F());
try
{
    try { throw new InvalidOperationException("x"); }
    finally { Console.WriteLine("inner finally"); }
}
catch (Exception e) when (Log("filter")) { Console.WriteLine("caught " + e.Message); }
var list = new List<int> { 1, 2, 3 };
var q = list.Where(x => x > 1);
list.Add(4);
Console.WriteLine(q.Count());
var g = Gen();
Console.WriteLine("before");
foreach (var v in g) Console.WriteLine(v);

static int F() { try { return 1; } finally { Console.WriteLine("finally"); } }
static bool Log(string s) { Console.WriteLine(s); return true; }
static IEnumerable<int> Gen() { Console.WriteLine("start"); yield return 1; }`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Lines 3–5 are ${H.c('g', 'filter · inner finally · caught x')}: filters run in the first pass, before unwinding.</p>`,
    brute: { why: `<p>Reading the code top to bottom suggests ${C('1, finally')}, ${C('inner finally, filter, caught x')}, ${C('2')} and ${C('start, before, 1')}. Each is wrong for a specific timing rule: return values are captured before finally prints; filters run before inner finally blocks; LINQ queries run when counted; iterator bodies start at the first MoveNext.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "1", "finally", "inner finally", "filter", "caught x", "2", "start", "before", "1" };
}` },
    mcq: { q: 'Why does "start" print after "before"?', options: ['An iterator method does not run its body until the first MoveNext (here, the foreach)', 'Console output is buffered', 'yield return delays only the first line', 'Gen() runs on another thread'], answer: 0, explain: 'Calling Gen() only creates the state machine object; foreach calls MoveNext, which executes the body up to the first yield return.' },
    hints: [`<p>Hint 1: a method's return value is computed before its finally block runs, but printing happens in the order the code executes.</p>`, `<p>Hint 2: exception handling has two passes — search (filters) and unwind (finally, then catch).</p>`, `<p>Hint 3: LINQ and iterators are lazy: nothing happens until enumeration.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'finally\n1\nfilter\ninner finally\ncaught x\n3\nbefore\nstart\n1' }] },
    solution: {
      approach: `<p>Apply the timing rules: finally before the caller prints the returned value; filter before inner finally before catch body; deferred query sees the added element; lazy iterator body runs during foreach.</p>`,
      code: { lang: 'csharp', run: true, code: `
Console.WriteLine(F());                       // finally, then 1
try
{
    try { throw new InvalidOperationException("x"); }
    finally { Console.WriteLine("inner finally"); }
}
catch (Exception e) when (Log("filter")) { Console.WriteLine("caught " + e.Message); }
// filter (pass 1), inner finally (pass 2), caught x
var list = new List<int> { 1, 2, 3 };
var q = list.Where(x => x > 1);
list.Add(4);
Console.WriteLine(q.Count());                 // 3: 2, 3, 4
var g = Gen();
Console.WriteLine("before");
foreach (var v in g) Console.WriteLine(v);    // start, 1

static int F() { try { return 1; } finally { Console.WriteLine("finally"); } }
static bool Log(string s) { Console.WriteLine(s); return true; }
static IEnumerable<int> Gen() { Console.WriteLine("start"); yield return 1; }` },
      dry: { head: ['code', 'rule', 'lines'], rows: [['F()', 'finally runs before the caller prints', 'finally, 1'], ['nested try + filter', 'two-pass handling', 'filter, inner finally, caught x'], ['q.Count()', 'deferred execution', '3'], ['Gen()', 'lazy iterator', 'before, start, 1']] },
      complexity: `<p>O(1). The skill is knowing when each piece of code runs.</p>`,
      followUps: ['What prints if Log returns false? (filter, inner finally, then the exception is unhandled)', 'What if the query were <code>list.Where(x =&gt; x &gt; 1).ToList()</code> before Add? (2)']
    }
  }]
  });

  /* ======================================================================
     TOPIC 8 — Expert API design idioms
     ====================================================================== */
  topics.push({
    title: 'Expert API Idioms: Designing Types That Feel Like the BCL',
    analogy: `<p>Every power socket in a country has the same shape, so any appliance just plugs in. Types that follow the .NET conventions are like standard sockets: ${C('TryParse')} works the way every developer expects, ${C('==')} agrees with ${C('Equals')}, sorting works because ${C('IComparable<T>')} is there, null warnings are accurate, and nothing surprises the caller. Expert C# is less about clever tricks and more about making your types plug into the ecosystem without adapters.</p>`,
    explain: `<h4>1. The idioms checklist for a value type</h4>
${H.table(['Idiom', 'How', 'Why'], [
  ['Immutable, validated on construction', C('readonly record struct') + ' / private ctor + factory', 'every instance is valid, safe to share'],
  ['Parse / TryParse', C('IParsable<T>') + ', ' + C('ISpanParsable<T>') + ', ' + C('[NotNullWhen(true)]'), 'standard parsing; generic code can parse T'],
  ['Formatting', C('ToString()') + ', ' + C('IFormattable') + ', ' + C('ISpanFormattable'), 'works in interpolated strings without allocations'],
  ['Equality', C('IEquatable<T>') + ' + operators', 'collections, ==, pattern matching agree'],
  ['Ordering', C('IComparable<T>') + ' + ' + C('< > <= >=') + ' (' + C('IComparisonOperators') + ')', 'Sort, OrderBy, SortedSet, Min/Max work'],
  ['Guard clauses', C('ArgumentNullException.ThrowIfNull(x)') + ', ' + C('ArgumentOutOfRangeException.ThrowIfNegative(n)'), 'consistent exceptions, small inlinable methods'],
  ['Nullability', 'nullable reference types enabled, annotations on public APIs', 'the compiler documents null contracts'],
  ['Sealed by default', C('sealed class') + ' unless designed for inheritance', 'no fragile base class problem; devirtualization']
])}
<h4>2. API surface rules</h4>
<ul>
<li><b>Accept general, return specific</b>: parameters as ${C('IEnumerable<T>')}/${C('ReadOnlySpan<T>')}, return ${C('IReadOnlyList<T>')} or concrete types.</li>
<li><b>Async APIs</b> end in ${C('Async')}, return ${C('Task')}/${C('ValueTask')}, take a ${C('CancellationToken')} as the last parameter (defaulted).</li>
<li><b>Options objects</b> instead of long parameter lists (${C('new HttpClientHandler { ... }')}, ${C('IOptions<T>')}).</li>
<li><b>Exceptions</b>: throw for programmer errors; offer ${C('Try')} methods for expected failures; never return null for collections (return empty).</li>
<li><b>Versioning</b>: adding members to interfaces breaks implementers (use default interface methods carefully); adding optional parameters breaks binary compatibility — add overloads instead.</li>
</ul>`,
    clues: ['a domain value (version, money, coordinates, id) used in sorting, dictionaries, parsing and logging', '"how should my library expose this?" questions in interviews', 'callers write the same null checks or try/catch around your API', 'reviewing a public API before release (binary compatibility)'],
    code: [{ lang: 'csharp', run: true, title: 'A SemVer-like value type that plugs into the BCL (runnable)', code: `
string[] raw = { "1.10.0", "1.2", "2", "1.2.10", "bad", "1.2.3" };
var parsed = raw.Select(s => SemVer.TryParse(s, null, out var v) ? v : (SemVer?)null).Where(v => v is not null).Select(v => v!.Value).ToList();
parsed.Sort();                                              // IComparable<SemVer>
Console.WriteLine(string.Join(" < ", parsed));              // 1.2.0 < 1.2.3 < 1.2.10 < 1.10.0 < 2.0.0
Console.WriteLine(SemVer.Parse("1.2", null) == new SemVer(1, 2, 0));   // True
Console.WriteLine(parsed.Max());                            // 2.0.0
Console.WriteLine($"{new SemVer(3, 1, 4),10}|");            // right-aligned via IFormattable:      3.1.4|
var set = new HashSet<SemVer> { SemVer.Parse("1.0", null), SemVer.Parse("1.0.0", null) };
Console.WriteLine(set.Count);                               // 1

public readonly record struct SemVer(int Major, int Minor, int Patch) : IComparable<SemVer>, IParsable<SemVer>, IFormattable
{
    public int CompareTo(SemVer o) =>
        Major != o.Major ? Major.CompareTo(o.Major) : Minor != o.Minor ? Minor.CompareTo(o.Minor) : Patch.CompareTo(o.Patch);
    public static bool operator <(SemVer a, SemVer b) => a.CompareTo(b) < 0;
    public static bool operator >(SemVer a, SemVer b) => a.CompareTo(b) > 0;

    public static SemVer Parse(string s, IFormatProvider? provider) =>
        TryParse(s, provider, out var v) ? v : throw new FormatException($"invalid version '{s}'");

    public static bool TryParse(string? s, IFormatProvider? provider, out SemVer result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(s)) return false;
        string[] p = s.Split('.');
        if (p.Length > 3) return false;
        var n = new int[3];
        for (int i = 0; i < p.Length; i++)
            if (!int.TryParse(p[i], System.Globalization.NumberStyles.None, null, out n[i])) return false;
        result = new SemVer(n[0], n[1], n[2]);
        return true;
    }

    public override string ToString() => $"{Major}.{Minor}.{Patch}";
    public string ToString(string? format, IFormatProvider? provider) => ToString();
}` }],
    codeTitle: ['BCL-style value type'],
    viz: {
      title: 'What each interface unlocks for a SemVer type',
      gen: function () {
        var rows = [['IEquatable (record struct)', 'HashSet, Dictionary keys, ==', 'Contains(1.0) finds 1.0.0'], ['IComparable<T>', 'Sort, OrderBy, Min/Max, SortedSet', '1.2.10 < 1.10.0'], ['IParsable<T>', 'Parse/TryParse, generic parsing, config binding', 'ParseAll<SemVer>("1.2,2.0")'], ['IFormattable', 'interpolation with alignment/format', '$"{v,10}"'], ['operators', '< > == in client code', 'if (v < min)']];
        var frames = [];
        for (var i = 0; i < rows.length; i++) {
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Adding <b>' + rows[i][0].replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</b> makes the type work with: ' + rows[i][1].replace(/</g, '&lt;').replace(/>/g, '&gt;') + '.', parts: [{ type: 'table', label: 'Interface → what plugs in → example', columns: ['interface', 'unlocks', 'example'], rows: rows.slice(0, i + 1), hl: hl }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Guard clause helpers (.NET 6–8)', html: `<p>Throw helpers keep methods small (inlinable) and messages consistent; ${C('[CallerArgumentExpression]')} fills in the parameter name automatically.</p>`, code: `
static string Repeat(string text, int times)
{
    ArgumentNullException.ThrowIfNull(text);
    ArgumentOutOfRangeException.ThrowIfNegative(times);
    return string.Concat(Enumerable.Repeat(text, times));
}` },
      { title: 'Return empty, not null', html: `<p>${C('public IReadOnlyList<Order> GetOrders() => _orders ?? Array.Empty<Order>();')} — callers can always ${C('foreach')} without null checks, and the nullable annotations stay honest (${C('IReadOnlyList<Order>')}, not ${C('IReadOnlyList<Order>?')}).</p>` },
      { title: 'Optional parameters and binary compatibility', html: `<p>Default values are baked into the <b>caller's</b> IL. Changing ${C('Send(string msg, int retries = 3)')} to ${C('retries = 5')} does nothing for already-compiled callers, and adding a new optional parameter changes the method signature, breaking callers compiled against the old version (MissingMethodException). Library authors add overloads instead.</p>` }
    ],
    deepDive: `<p><b>Framework Design Guidelines.</b> The conventions in this topic come from the .NET Framework Design Guidelines (Cwalina, Barton, Abrams) and the analyzers that enforce them (CA1000–CA2xxx). Notable ones: CA1716 (avoid keywords as names), CA1815 (override Equals on value types), CA1036 (override comparison operators with IComparable), CA1067 (override Equals when implementing IEquatable), CA1852 (seal internal types), CA2208 (instantiate argument exceptions correctly).</p>
<p><b>Generic math and parsing interfaces</b> (${C('IParsable<T>')}, ${C('ISpanParsable<T>')}, ${C('IUtf8SpanFormattable')}, ${C('IComparisonOperators<T,T,bool>')}) let your type participate in generic algorithms written by others — config binders, serializers, minimal API parameter binding (route values bind to any ${C('IParsable<T>')} in .NET 7+).</p>
<p><b>Breaking changes.</b> Binary-breaking: removing/renaming public members, changing parameter types or optional parameters, changing a struct to a class, adding abstract members to a public abstract class or members to an interface without a default. Source-breaking but binary-compatible: adding overloads that create ambiguity, adding a method that hides an extension. Tools: the ${C('PackageValidation')} MSBuild feature and ApiCompat compare your public surface across versions.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating all these interfaces is boilerplate the assistant writes in seconds. <b>Use AI as a partner:</b> <code>Review this public API against the .NET design guidelines and list binary-breaking risks</code>. <b>Where AI goes wrong:</b> it mixes ordinal and culture parsing, forgets ${C('NumberStyles')} (accepting "+1" or " 1" unexpectedly), makes ${C('CompareTo')} inconsistent with ${C('Equals')}, or adds optional parameters to published methods. <b>What you must still own:</b> the semantics (is "1.0" equal to "1.0.0"?) and compatibility promises to your callers.</p>`,
    problems: [{
      title: 'Sort Versions with a BCL-Style Value Type',
      level: 'Medium', tags: ['IComparable', 'IParsable', 'record struct'], companies: ['Microsoft', 'GitHub', 'JetBrains'],
      statement: `<p>Implement ${C('readonly record struct SemVer(int Major, int Minor, int Patch)')} with ${C('IComparable<SemVer>')} (numeric, component by component), ${C('IParsable<SemVer>')} (1 to 3 dot-separated non-negative integers with digits only; missing parts are 0; leading zeros allowed) and ${C('ToString()')} ${C('"M.m.p"')}. ${C('SortVersions(string[] raw)')} returns the distinct valid versions sorted ascending (as normalised strings), followed by ${C('"invalid=K"')} with the number of invalid inputs.</p>`,
      constraints: `Up to 10<sup>4</sup> inputs; numbers fit in int.`,
      example: `<p>${C('["1.10.0", "1.2", "2", "1.2.10", "bad", "1.2.0"]')} → ${H.c('g', '["1.2.0", "1.2.10", "1.10.0", "2.0.0", "invalid=1"]')}</p>`,
      brute: { why: `<p>Sorting the strings themselves gives ${C('"1.10.0" < "1.2"')} (character order), and comparing ${C('double.Parse("1.10")')} treats 1.10 as 1.1. Versions are tuples of integers; a value type with proper comparison and parsing makes every sort, set and dictionary just work.</p>`, code: `
static class StringSort
{
    public static string[] Sort(string[] v) => v.OrderBy(s => s, StringComparer.Ordinal).ToArray();   // "1.10.0" before "1.2"
}` },
      mcq: { q: 'Why should <code>CompareTo</code> return 0 exactly when <code>Equals</code> returns true?', options: ['Sorted collections use CompareTo while hash collections use Equals; disagreement makes them treat the same values differently', 'The compiler requires it', 'It makes sorting stable', 'It is only a style rule with no effect'], answer: 0, explain: 'A SortedSet would consider 1.0 and 1.0.0 duplicates while a HashSet would not (or vice versa) — subtle bugs. Normalising in the constructor keeps both consistent.' },
      hints: [`<p>Hint 1: ${C('int.TryParse(part, NumberStyles.None, null, out n)')} rejects signs, spaces and empty parts.</p>`, `<p>Hint 2: ${C('CompareTo')}: compare Major, then Minor, then Patch — or ${C('(Major, Minor, Patch).CompareTo((o.Major, o.Minor, o.Patch))')}.</p>`, `<p>Hint 3: ${C('new SortedSet<SemVer>(valid)')} deduplicates and sorts using CompareTo in one step.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'sortVersions', cases: [
        [[['1.10.0', '1.2', '2', '1.2.10', 'bad', '1.2.0']], ['1.2.0', '1.2.10', '1.10.0', '2.0.0', 'invalid=1']],
        [[[]], ['invalid=0']],
        [[['01.002.0003']], ['1.2.3', 'invalid=0']],
        [[['1.2.3.4', '-1', '1..2', '', ' 1', '+1']], ['invalid=6']],
        [[['0', '0.0', '0.0.0']], ['0.0.0', 'invalid=0']],
        [[['2147483647.0.1', '2147483647']], ['2147483647.0.0', '2147483647.0.1', 'invalid=0']],
        [[['3.0', '2.9.9', '2.10', '10']], ['2.9.9', '2.10.0', '3.0.0', '10.0.0', 'invalid=0']]
      ] },
      solution: {
        approach: `<p>A record struct gives value equality and hashing; ${C('CompareTo')} orders component-wise; strict ${C('TryParse')} with ${C('NumberStyles.None')} rejects anything but digits. A ${C('SortedSet')} sorts and deduplicates in one pass using CompareTo, which agrees with Equals because values are normalised (missing parts are 0).</p>`,
        code: `
using System.Globalization;

public class Solution
{
    public static string[] SortVersions(string[] raw)
    {
        var set = new SortedSet<SemVer>();
        int invalid = 0;
        foreach (string s in raw)
            if (SemVer.TryParse(s, null, out var v)) set.Add(v); else invalid++;
        return set.Select(v => v.ToString()).Append($"invalid={invalid}").ToArray();
    }
}

public readonly record struct SemVer(int Major, int Minor, int Patch) : IComparable<SemVer>, IParsable<SemVer>
{
    public int CompareTo(SemVer o) => (Major, Minor, Patch).CompareTo((o.Major, o.Minor, o.Patch));

    public static SemVer Parse(string s, IFormatProvider? provider) =>
        TryParse(s, provider, out var v) ? v : throw new FormatException($"invalid version '{s}'");

    public static bool TryParse(string? s, IFormatProvider? provider, out SemVer result)
    {
        result = default;
        if (s is null) return false;
        string[] parts = s.Split('.');
        if (parts.Length > 3) return false;
        var n = new int[3];
        for (int i = 0; i < parts.Length; i++)
            if (!int.TryParse(parts[i], NumberStyles.None, CultureInfo.InvariantCulture, out n[i])) return false;
        result = new SemVer(n[0], n[1], n[2]);
        return true;
    }

    public override string ToString() => $"{Major}.{Minor}.{Patch}";
}`,
        dry: { head: ['input', 'TryParse', 'normalised'], rows: [['"1.10.0"', 'ok', '1.10.0'], ['"1.2"', 'ok', '1.2.0'], ['"bad"', 'fail', 'invalid'], ['"1.2.0"', 'ok', '1.2.0 (duplicate, SortedSet ignores)']] },
        complexity: `<p>O(n log n) for the sorted set; parsing is linear in the input length.</p>`,
        followUps: ['Add pre-release tags (1.0.0-beta &lt; 1.0.0) following the SemVer 2.0 rules.', 'Implement <code>ISpanParsable&lt;SemVer&gt;</code> to parse without Split allocations.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Closures Capture Variables',
    level: 'Easy', tags: ['output prediction', 'closures', 'lambdas'], companies: ['Microsoft', 'Infosys', 'Amazon'],
    statement: `<p>Write down the 4 lines this program prints.</p>${P(`
var actions = new List<Func<int>>();
for (int i = 0; i < 3; i++) actions.Add(() => i);
Console.WriteLine(string.Join(",", actions.Select(a => a())));
actions.Clear();
foreach (var x in new[] { 0, 1, 2 }) actions.Add(() => x);
Console.WriteLine(string.Join(",", actions.Select(a => a())));
int y = 10;
Func<int> f = () => y;
y = 20;
Console.WriteLine(f());
var counter = MakeCounter();
counter();
Console.WriteLine(counter());

static Func<int> MakeCounter() { int c = 0; return () => ++c; }`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 1 is ${H.c('g', '3,3,3')}: the for-loop variable ${C('i')} is a single variable shared by all three lambdas, and it is 3 when they run.</p>`,
    brute: { why: `<p>Thinking "a lambda remembers the value at creation time" predicts ${C('0,1,2')}, ${C('0,1,2')}, ${C('10')}, ${C('1')}. Lambdas capture <b>variables</b> (hoisted into a closure object), not values. ${C('foreach')} creates a new variable per iteration (since C# 5); ${C('for')} does not.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "0,1,2", "0,1,2", "10", "1" };
}` },
    mcq: { q: 'How do you make the for-loop version print 0,1,2?', options: ['Copy the loop variable into a local declared inside the loop body and capture that', 'Mark the lambda static', 'Use ToList() before invoking', 'Declare i as readonly'], answer: 0, explain: 'int copy = i; actions.Add(() => copy); — each iteration declares a fresh variable, so each closure captures its own. A static lambda cannot capture at all.' },
    hints: [`<p>Hint 1: the compiler moves captured locals into a hidden class; all lambdas in the same scope share that instance.</p>`, `<p>Hint 2: ${C('foreach')} iteration variables are scoped <b>inside</b> the loop body since C# 5.</p>`, `<p>Hint 3: the counter's ${C('c')} lives as long as the lambda — state persists between calls.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '3,3,3\n0,1,2\n20\n2' }] },
    solution: {
      approach: `<p>Track the captured variables, not values: one shared ${C('i')} (final value 3), three separate ${C('x')} variables, a ${C('y')} read at call time (20), and a counter whose captured ${C('c')} persists (1, then 2).</p>`,
      code: { lang: 'csharp', run: true, code: `
var actions = new List<Func<int>>();
for (int i = 0; i < 3; i++) actions.Add(() => i);            // one shared i
Console.WriteLine(string.Join(",", actions.Select(a => a()))); // 3,3,3
actions.Clear();
foreach (var x in new[] { 0, 1, 2 }) actions.Add(() => x);    // fresh x per iteration
Console.WriteLine(string.Join(",", actions.Select(a => a()))); // 0,1,2
int y = 10;
Func<int> f = () => y;
y = 20;
Console.WriteLine(f());                                        // 20 (read at call time)
var counter = MakeCounter();
counter();
Console.WriteLine(counter());                                  // 2 (state persists)

static Func<int> MakeCounter() { int c = 0; return () => ++c; }` },
      dry: { head: ['lambda', 'captured variable', 'value when invoked'], rows: [['() => i (×3)', 'one shared i', '3'], ['() => x (×3)', 'x per iteration', '0, 1, 2'], ['() => y', 'y', '20'], ['counter', 'c inside MakeCounter', '1 then 2']] },
      complexity: `<p>O(1). Each capturing scope allocates one closure object.</p>`,
      followUps: ['What did C# 4 print for the foreach version? (2,2,2 — the variable was outside the loop)', 'How many closure objects does the for loop allocate? (one)']
    }
  });

  practice.push({
    title: 'Predict the Output: Chars, Strings and Concatenation',
    level: 'Easy', tags: ['output prediction', 'strings', 'char'], companies: ['TCS', 'Cognizant', 'Microsoft'],
    statement: `<p>Write down the 8 lines this program prints.</p>${P(`
Console.WriteLine('a' + 1);
Console.WriteLine((char)('a' + 1));
Console.WriteLine("" + 'a' + 1);
Console.WriteLine(1 + 2 + "3" + 4 + 5);
Console.WriteLine(string.Compare("a", "B", StringComparison.Ordinal) < 0);
Console.WriteLine("Straße".Length);
Console.WriteLine("abc".IndexOf(""));
Console.WriteLine(string.Concat("a", null, "b"));`)}`,
    constraints: `.NET 8. 'a' = 97, 'B' = 66.`,
    example: `<p>Line 4 is ${H.c('g', '3345')}: ${C('1 + 2')} is int addition (3), then every ${C('+')} after the string ${C('"3"')} concatenates.</p>`,
    brute: { why: `<p>Treating char like a one-letter string predicts ${C('a1')}, ${C('b')}, ${C('a1')}, ${C('12345')}, ${C('True')}, ${C('7')}, ${C('-1')}, and an exception. In fact char arithmetic promotes to int, ${C('+')} is left-associative, ordinal comparison uses code units ('a' 97 &gt; 'B' 66), ß is one char, the empty string is found at index 0, and ${C('Concat')} treats null as empty.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "a1", "b", "a1", "12345", "True", "7", "-1", "error" };
}` },
    mcq: { q: 'Why is <code>string.Compare("a", "B", StringComparison.Ordinal) &lt; 0</code> False?', options: ['Ordinal comparison compares UTF-16 code units: 97 (a) is greater than 66 (B)', 'Ordinal ignores case', 'Uppercase always sorts after lowercase', 'Compare returns a bool'], answer: 0, explain: 'Culture-aware comparison would put "a" before "B" (alphabetical, case as a tie-breaker); ordinal compares numbers.' },
    hints: [`<p>Hint 1: ${C('char + int')} is int; casting back gives a char.</p>`, `<p>Hint 2: ${C('+')} groups from the left; it becomes concatenation as soon as one operand is a string.</p>`, `<p>Hint 3: ${C('"ß"')} is a single UTF-16 code unit; ${C('IndexOf("")')} is defined as 0.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '98\nb\na1\n3345\nFalse\n6\n0\nab' }] },
    solution: {
      approach: `<p>Apply numeric promotion for chars, left-to-right concatenation, ordinal code-unit comparison, UTF-16 length, and the documented edge cases of IndexOf and Concat.</p>`,
      code: `
Console.WriteLine('a' + 1);                       // 98
Console.WriteLine((char)('a' + 1));               // b
Console.WriteLine("" + 'a' + 1);                  // a1
Console.WriteLine(1 + 2 + "3" + 4 + 5);           // 3345
Console.WriteLine(string.Compare("a", "B", StringComparison.Ordinal) < 0);  // False
Console.WriteLine("Straße".Length);               // 6
Console.WriteLine("abc".IndexOf(""));             // 0
Console.WriteLine(string.Concat("a", null, "b")); // ab`,
      dry: { head: ['expression', 'rule', 'output'], rows: [["'a' + 1", 'char → int', '98'], ['1 + 2 + "3" + 4 + 5', 'left to right', '3345'], ['Compare ordinal', '97 vs 66', 'False'], ['"Straße".Length', 'ß is one code unit', '6']] },
      complexity: `<p>O(1). The skill is the type and associativity rules.</p>`,
      followUps: ['What does <code>"Straße".ToUpperInvariant()</code> return? (STRAßE — .NET case mapping maps char to char and never changes the length)', 'What does <code>"abc".IndexOf("", 3)</code> return? (3)']
    }
  });

  practice.push({
    title: 'Predict the Output: finally, Rethrow and Async Exceptions',
    level: 'Easy', tags: ['output prediction', 'exceptions', 'async'], companies: ['Microsoft', 'EPAM', 'Wipro'],
    statement: `<p>Write down the 5 lines this program prints.</p>${P(`
Console.WriteLine(G());
try { Thrower(); } catch (Exception e) { Console.WriteLine(e.GetType().Name); }
try { throw new FormatException("f"); }
catch (ArgumentException) { Console.WriteLine("arg"); }
catch (FormatException e) when (e.Message == "g") { Console.WriteLine("g"); }
catch (Exception e) { Console.WriteLine("other " + e.Message); }
var t = FailAsync();
Console.WriteLine("created");
try { await t; } catch (InvalidOperationException) { Console.WriteLine("awaited"); }

static int G() { int x = 1; try { return x; } finally { x = 99; } }
static void Thrower() { try { throw new InvalidOperationException(); } finally { throw new ArgumentException(); } }
static async Task FailAsync() { await Task.CompletedTask; throw new InvalidOperationException(); }`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 2 is ${H.c('g', 'ArgumentException')}: an exception thrown in ${C('finally')} replaces the one in flight.</p>`,
    brute: { why: `<p>Natural guesses: ${C('99')}, ${C('InvalidOperationException')}, ${C('g')} or ${C('arg')}, and an exception at the ${C('FailAsync()')} call. The rules: the return value is copied before finally; a finally exception replaces the original; a false filter skips its catch; an async method stores exceptions in its task until awaited.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "99", "InvalidOperationException", "g", "awaited" };
}` },
    mcq: { q: 'Why does <code>FailAsync()</code> not throw at the call site?', options: ['Async methods capture exceptions in the returned Task; they surface when the task is awaited', 'The exception is swallowed', 'Task.CompletedTask suppresses exceptions', 'It throws on a background thread'], answer: 0, explain: 'The compiler-generated state machine catches exceptions and stores them in the task (Faulted). await rethrows the first one.' },
    hints: [`<p>Hint 1: ${C('return x')} copies x's current value before finally runs.</p>`, `<p>Hint 2: the exception that leaves a method is the last one thrown while unwinding.</p>`, `<p>Hint 3: catch clauses are tried in order; a filter that is false means "not this one".</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '1\nArgumentException\nother f\ncreated\nawaited' }] },
    solution: {
      approach: `<p>Return value captured before finally (1); finally's exception replaces the original (ArgumentException); the FormatException filter is false so the general catch runs (other f); the async exception waits in the task until awaited.</p>`,
      code: { lang: 'csharp', run: true, code: `
Console.WriteLine(G());                                    // 1
try { Thrower(); } catch (Exception e) { Console.WriteLine(e.GetType().Name); }   // ArgumentException
try { throw new FormatException("f"); }
catch (ArgumentException) { Console.WriteLine("arg"); }
catch (FormatException e) when (e.Message == "g") { Console.WriteLine("g"); }
catch (Exception e) { Console.WriteLine("other " + e.Message); }               // other f
var t = FailAsync();
Console.WriteLine("created");                              // created
try { await t; } catch (InvalidOperationException) { Console.WriteLine("awaited"); }   // awaited

static int G() { int x = 1; try { return x; } finally { x = 99; } }
static void Thrower() { try { throw new InvalidOperationException(); } finally { throw new ArgumentException(); } }
static async Task FailAsync() { await Task.CompletedTask; throw new InvalidOperationException(); }` },
      dry: { head: ['code', 'rule', 'output'], rows: [['G()', 'return value copied first', '1'], ['Thrower()', 'finally exception wins', 'ArgumentException'], ['filter false', 'next catch', 'other f'], ['FailAsync()', 'exception stored in task', 'created, awaited']] },
      complexity: `<p>O(1). These rules decide what your logs show in production.</p>`,
      followUps: ['What if <code>FailAsync</code> were not async but returned <code>Task.FromException(...)</code>? (Same observable behaviour.)', 'How do you preserve the original exception when cleanup also fails?']
    }
  });

  practice.push({
    title: 'Immutable DateRange with Intersection',
    level: 'Medium', tags: ['immutability', 'records', 'DateOnly'], companies: ['Booking.com', 'Expedia', 'MakeMyTrip'],
    statement: `<p>Create ${C('readonly record struct DateRange')} with inclusive ${C('Start')} and ${C('End')} (${C('DateOnly')}), a factory ${C('TryCreate(start, end, out range)')} that rejects ${C('End < Start')}, and ${C('DateRange? Intersect(DateRange other)')}. ${C('Overlap(a, b)')} receives two ranges as ${C('"yyyy-MM-dd..yyyy-MM-dd"')} and returns the intersection in the same format, ${C('"none"')} if they do not overlap, or ${C('"invalid"')} if either input is malformed or reversed.</p>`,
      constraints: `Dates are between 0001-01-01 and 9999-12-31.`,
    example: `<p>${C('Overlap("2024-01-01..2024-01-10", "2024-01-05..2024-02-01")')} → ${H.c('g', '"2024-01-05..2024-01-10"')}</p>`,
    brute: { why: `<p>Passing two loose ${C('DateTime')} values around invites bugs: swapped arguments, time-of-day parts, time zones, and every caller re-validating. A small immutable value type that cannot exist in an invalid state centralises the rules once.</p>`, code: `
static class Loose
{
    public static bool Overlaps(DateTime s1, DateTime e1, DateTime s2, DateTime e2) => s1 <= e2 && s2 <= e1;   // no validation, time parts leak in
}` },
    mcq: { q: 'Why use a factory (TryCreate) instead of a public constructor that throws?', options: ['Invalid input is an expected case here, and the Try-pattern avoids exceptions for it while keeping every created instance valid', 'Constructors cannot validate', 'Records cannot have constructors', 'Factories are faster'], answer: 0, explain: 'Both keep the invariant; TryCreate fits user input where failures are normal. Note that a record struct still has default(DateRange) — document or guard it.' },
    hints: [`<p>Hint 1: ${C('DateOnly.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)')}.</p>`, `<p>Hint 2: two inclusive ranges overlap iff ${C('a.Start <= b.End && b.Start <= a.End')}; the intersection is (max of starts, min of ends).</p>`, `<p>Hint 3: split the input on ${C('".."')} and require exactly two parts.</p>`],
    tests: { sig: 'string string -> string', fn: 'overlap', cases: [
      [['2024-01-01..2024-01-10', '2024-01-05..2024-02-01'], '2024-01-05..2024-01-10'],
      [['2024-01-01..2024-01-10', '2024-01-11..2024-01-12'], 'none'],
      [['2024-01-01..2024-01-10', '2024-01-10..2024-01-20'], '2024-01-10..2024-01-10'],
      [['2024-02-10..2024-02-01', '2024-01-01..2024-12-31'], 'invalid'],
      [['2024-13-01..2024-12-01', '2024-01-01..2024-01-02'], 'invalid'],
      [['2024-01-01', '2024-01-01..2024-01-02'], 'invalid'],
      [['0001-01-01..9999-12-31', '2024-02-29..2024-02-29'], '2024-02-29..2024-02-29'],
      [['2023-02-29..2023-03-01', '2023-01-01..2023-12-31'], 'invalid']
    ] },
    solution: {
      approach: `<p>Parse strictly, create ranges only through the validating factory, and compute the intersection as (max start, min end) if non-empty. The type is immutable, so a created range stays valid.</p>`,
      code: `
using System.Globalization;

public class Solution
{
    public static string Overlap(string a, string b)
    {
        if (!TryParse(a, out var r1) || !TryParse(b, out var r2)) return "invalid";
        return r1.Intersect(r2) is DateRange x ? x.ToString() : "none";
    }

    static bool TryParse(string s, out DateRange range)
    {
        range = default;
        string[] p = s.Split("..");
        return p.Length == 2
            && DateOnly.TryParseExact(p[0], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
            && DateOnly.TryParseExact(p[1], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
            && DateRange.TryCreate(start, end, out range);
    }
}

public readonly record struct DateRange
{
    public DateOnly Start { get; }
    public DateOnly End { get; }
    private DateRange(DateOnly start, DateOnly end) => (Start, End) = (start, end);

    public static bool TryCreate(DateOnly start, DateOnly end, out DateRange range)
    {
        range = end < start ? default : new DateRange(start, end);
        return end >= start;
    }

    public DateRange? Intersect(DateRange o)
    {
        var s = Start > o.Start ? Start : o.Start;
        var e = End < o.End ? End : o.End;
        return s <= e ? new DateRange(s, e) : null;
    }

    public override string ToString() =>
        $"{Start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}..{End.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}";
}`,
      dry: { head: ['range A', 'range B', 'max start', 'min end', 'result'], rows: [['01-01..01-10', '01-05..02-01', '01-05', '01-10', '01-05..01-10'], ['01-01..01-10', '01-11..01-12', '01-11', '01-10', 'none'], ['02-10..02-01', '—', '—', '—', 'invalid (reversed)']] },
      complexity: `<p>O(1) per call apart from parsing the two strings.</p>`,
      followUps: ['Add <code>Contains(DateOnly)</code> and <code>Days</code> (inclusive count).', 'Merge a list of ranges into non-overlapping ranges.']
    }
  });

  practice.push({
    title: 'Collect All Validation Errors with a Result',
    level: 'Medium', tags: ['Result type', 'validation', 'applicative'], companies: ['Stripe', 'Razorpay', 'Microsoft'],
    statement: `<p>${C('Register(name, ageText, email)')} validates three independent fields and returns either ${C('"ok: NAME (AGE)"')} or ${C('"errors: "')} followed by <b>all</b> messages joined with ${C('"; "')}, in field order: ${C('"name required"')} (null/blank), ${C('"age must be a number 0-150"')} (not an int, or out of range), ${C('"email must contain @"')}. Model each check as a function returning ${C('Result<T>')} and combine them so that no error is lost (unlike Bind, which stops at the first).</p>`,
    constraints: `Inputs may be null or empty; the name is trimmed in the output.`,
    example: `<p>${C('Register("", "abc", "x")')} → ${H.c('g', '"errors: name required; age must be a number 0-150; email must contain @"')}</p>`,
    brute: { why: `<p>A Bind chain reports only the first failure; the user fixes the name, submits, then learns the age is wrong, then the email. Independent validations should be combined so every error is reported at once — "applicative" validation.</p>`, code: `
static class FirstErrorOnly
{
    public static string Register(string name, string age, string email) =>
        string.IsNullOrWhiteSpace(name) ? "errors: name required"
        : !int.TryParse(age, out _) ? "errors: age must be a number 0-150"
        : "ok";
}` },
    mcq: { q: 'Why can <code>Bind</code> not collect all errors?', options: ['Each Bind step needs the previous value; after a failure there is no value to continue with, so later steps never run', 'Bind is asynchronous', 'Bind only works with strings', 'Bind discards successful values'], answer: 0, explain: 'Sequential (monadic) composition fits dependent steps. Independent checks can all run and their errors can be combined.' },
    hints: [`<p>Hint 1: write ${C('Result<string> Name(string?)')}, ${C('Result<int> Age(string?)')}, ${C('Result<string> Email(string?)')}.</p>`, `<p>Hint 2: run all three, then gather ${C('Error')} from those that failed.</p>`, `<p>Hint 3: only if none failed, build the success value from the three ${C('Value')}s.</p>`],
    tests: { sig: 'string string string -> string', fn: 'register', cases: [
      [['', 'abc', 'x'], 'errors: name required; age must be a number 0-150; email must contain @'],
      [['Asha', '30', 'asha@example.com'], 'ok: Asha (30)'],
      [['  Ravi ', '0', 'r@x'], 'ok: Ravi (0)'],
      [[null, '151', 'a@b'], 'errors: name required; age must be a number 0-150'],
      [['Li', '-1', null], 'errors: age must be a number 0-150; email must contain @'],
      [['Mo', '150', 'mo'], 'errors: email must contain @'],
      [['   ', '', ''], 'errors: name required; age must be a number 0-150; email must contain @']
    ] },
    solution: {
      approach: `<p>Validate each field into a Result independently, then combine: if any failed, join all errors in field order; otherwise construct the success message.</p>`,
      code: `
public class Solution
{
    public static string Register(string? name, string? ageText, string? email)
    {
        var n = Name(name);
        var a = Age(ageText);
        var e = Email(email);
        var errors = new[] { n.Error, a.Error, e.Error }.Where(x => x is not null).ToList();
        return errors.Count > 0 ? "errors: " + string.Join("; ", errors) : $"ok: {n.Value} ({a.Value})";
    }

    static Result<string> Name(string? s) =>
        string.IsNullOrWhiteSpace(s) ? Result<string>.Fail("name required") : Result<string>.Ok(s.Trim());

    static Result<int> Age(string? s) =>
        int.TryParse(s, out int v) && v is >= 0 and <= 150 ? Result<int>.Ok(v) : Result<int>.Fail("age must be a number 0-150");

    static Result<string> Email(string? s) =>
        s is not null && s.Contains('@') ? Result<string>.Ok(s) : Result<string>.Fail("email must contain @");
}

public readonly record struct Result<T>
{
    public T? Value { get; }
    public string? Error { get; }
    private Result(T? value, string? error) => (Value, Error) = (value, error);
    public static Result<T> Ok(T value) => new(value, null);
    public static Result<T> Fail(string error) => new(default, error);
}`,
      dry: { head: ['field', 'input', 'Result'], rows: [['name', '""', 'Fail(name required)'], ['age', '"abc"', 'Fail(age must be a number 0-150)'], ['email', '"x"', 'Fail(email must contain @)'], ['combine', '3 errors', 'errors: …; …; …']] },
      complexity: `<p>O(total input length).</p>`,
      followUps: ['Return errors keyed by field name for an API response (ProblemDetails).', 'Write a generic <code>Combine</code> for three Results and a selector.']
    }
  });

  practice.push({
    title: 'Dispose Pattern Across a Class Hierarchy',
    level: 'Medium', tags: ['IDisposable', 'Dispose(bool)', 'inheritance'], companies: ['Microsoft', 'Siemens', 'SAP'],
    statement: `<p>Implement ${C('class ResourceBase : IDisposable')} with the standard ${C('protected virtual void Dispose(bool disposing)')} pattern (idempotent, logs ${C('"base disposed"')}) and ${C('sealed class Connection : ResourceBase')} that owns a child resource: its override logs ${C('"child disposed"')} and then calls ${C('base.Dispose(disposing)')}. ${C('Use()')} logs ${C('"use"')} or throws ${C('ObjectDisposedException')} after disposal. ${C('Lifecycle(string[] ops)')} runs ${C('"use"')} / ${C('"dispose"')} operations on one Connection and returns the log, recording ${C('"ObjectDisposedException"')} when Use fails.</p>`,
    constraints: `Up to 100 operations.`,
    example: `<p>${C('["use", "dispose", "dispose", "use"]')} → ${H.c('g', '["use", "child disposed", "base disposed", "ObjectDisposedException"]')}</p>`,
    brute: { why: `<p>Overriding a non-virtual ${C('Dispose()')} with ${C('new')} in the derived class means code holding a ${C('ResourceBase')} or ${C('IDisposable')} reference never runs the derived cleanup. The ${C('Dispose(bool)')} pattern gives one public entry point and a virtual hook each level extends.</p>`, code: `
class BaseRes : IDisposable { public void Dispose() => Console.WriteLine("base"); }
class DerivedRes : BaseRes { public new void Dispose() => Console.WriteLine("derived"); }   // skipped through IDisposable` },
    mcq: { q: 'In <code>Dispose(bool disposing)</code>, what does <code>disposing == false</code> mean?', options: ['It was called from a finalizer: managed objects may already be finalized, so release only unmanaged state', 'Dispose was called twice', 'The object is still in use', 'An exception occurred'], answer: 0, explain: 'The finalizer path must not touch other managed objects (their finalizers may have run). Only the explicit Dispose() path passes true.' },
    hints: [`<p>Hint 1: ${C('public void Dispose() { Dispose(true); GC.SuppressFinalize(this); }')} in the base.</p>`, `<p>Hint 2: keep a ${C('protected bool IsDisposed')} flag set by the base; the derived override checks it first so repeated calls do nothing.</p>`, `<p>Hint 3: ${C('ObjectDisposedException.ThrowIf(IsDisposed, this)')} in Use.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'lifecycle', cases: [
      [[['use', 'dispose', 'dispose', 'use']], ['use', 'child disposed', 'base disposed', 'ObjectDisposedException']],
      [[[]], []],
      [[['use', 'use']], ['use', 'use']],
      [[['dispose']], ['child disposed', 'base disposed']],
      [[['dispose', 'use', 'use']], ['child disposed', 'base disposed', 'ObjectDisposedException', 'ObjectDisposedException']],
      [[['use', 'dispose', 'use', 'dispose', 'dispose']], ['use', 'child disposed', 'base disposed', 'ObjectDisposedException']]
    ] },
    solution: {
      approach: `<p>One non-virtual public Dispose, one virtual ${C('Dispose(bool)')} per level: the derived class releases what it owns, then delegates to the base, which marks the object disposed. The flag makes the whole chain idempotent.</p>`,
      code: `
public class Solution
{
    public static string[] Lifecycle(string[] ops)
    {
        var log = new List<string>();
        var c = new Connection(log);
        foreach (string op in ops)
        {
            if (op == "dispose") c.Dispose();
            else
            {
                try { c.Use(); }
                catch (ObjectDisposedException) { log.Add("ObjectDisposedException"); }
            }
        }
        return log.ToArray();
    }
}

public class ResourceBase : IDisposable
{
    protected readonly List<string> Log;
    protected bool IsDisposed { get; private set; }
    public ResourceBase(List<string> log) => Log = log;

    public void Use()
    {
        ObjectDisposedException.ThrowIf(IsDisposed, this);
        Log.Add("use");
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (IsDisposed) return;
        IsDisposed = true;
        Log.Add("base disposed");
    }
}

public sealed class Connection : ResourceBase
{
    private readonly ChildResource _child;
    public Connection(List<string> log) : base(log) => _child = new ChildResource(log);

    protected override void Dispose(bool disposing)
    {
        if (IsDisposed) return;
        if (disposing) _child.Dispose();
        base.Dispose(disposing);
    }
}

public sealed class ChildResource(List<string> log) : IDisposable
{
    public void Dispose() => log.Add("child disposed");
}`,
      dry: { head: ['op', 'IsDisposed before', 'log added'], rows: [['use', 'false', 'use'], ['dispose', 'false', 'child disposed, base disposed'], ['dispose', 'true', '(nothing)'], ['use', 'true', 'ObjectDisposedException']] },
      complexity: `<p>O(number of operations).</p>`,
      followUps: ['Add <code>DisposeAsync</code> following the async dispose pattern (DisposeAsyncCore).', 'Why is a finalizer unnecessary here? (no unmanaged resources owned directly)']
    }
  });

  practice.push({
    title: 'Aggregate Exceptions from Task.WhenAll',
    level: 'Medium', tags: ['async', 'Task.WhenAll', 'exceptions'], companies: ['Microsoft', 'Flipkart', 'Zomato'],
    statement: `<p>Run all jobs concurrently. A job ${C('j ≥ 0')} awaits ${C('Task.Yield()')} and returns ${C('j * 10')}; a job ${C('j < 0')} throws ${C('InvalidOperationException("job j")')}. Return ${C('"results: r1,r2,..."')} in input order if all succeed; otherwise ${C('"errors: "')} plus <b>all</b> error messages sorted ordinally and joined with commas. Remember that ${C('await Task.WhenAll(...)')} rethrows only one exception.</p>`,
    constraints: `0 ≤ n ≤ 1000.`,
    example: `<p>${C('[1, -2, 3, -4]')} → ${H.c('g', '"errors: job -2,job -4"')}</p>`,
    brute: { why: `<p>${C('try { await Task.WhenAll(tasks); } catch (Exception e) { report(e.Message); }')} reports a single failure and silently drops the rest — and which one you get depends on timing. Keep the WhenAll task and read ${C('Exception.InnerExceptions')}.</p>`, code: `
static class OnlyOne
{
    public static async Task<string> Run(Task<int>[] tasks)
    {
        try { return string.Join(",", await Task.WhenAll(tasks)); }
        catch (Exception e) { return "errors: " + e.Message; }   // loses the others
    }
}` },
    mcq: { q: 'Where are all the exceptions of a failed <code>Task.WhenAll</code>?', options: ['In the WhenAll task\'s Exception (an AggregateException) .InnerExceptions', 'Only in the first exception\'s InnerException', 'They are discarded', 'In TaskScheduler.UnobservedTaskException'], answer: 0, explain: 'await unwraps and rethrows one; the task object still holds the AggregateException with every failure.' },
    hints: [`<p>Hint 1: ${C('var all = Task.WhenAll(tasks); try { await all; } catch { }')}, then inspect ${C('all.IsFaulted')}.</p>`, `<p>Hint 2: ${C('all.Exception!.InnerExceptions.Select(e => e.Message).Order(StringComparer.Ordinal)')}.</p>`, `<p>Hint 3: on success, ${C('all.Result')} (safe after completion) is in input order.</p>`],
    tests: { sig: 'int[] -> string', fn: 'runAll', cases: [
      [[[1, -2, 3, -4]], 'errors: job -2,job -4'],
      [[[1, 2, 3]], 'results: 10,20,30'],
      [[[]], 'results: '],
      [[[-1]], 'errors: job -1'],
      [[[0, -10, -9]], 'errors: job -10,job -9'],
      [[{ $range: [0, 1000] }], 'checked by function']
    ], check: '(args, out, exp) => typeof exp === "string" && exp !== "checked by function" ? out === exp : out === "results: " + args[0].map(x => x * 10).join(",")' },
    solution: {
      approach: `<p>Start every job, keep the WhenAll task, await it inside a try, then branch on its state: Result for success, InnerExceptions for every failure.</p>`,
      code: `
public class Solution
{
    public static string RunAll(int[] jobs) => RunAllAsync(jobs).GetAwaiter().GetResult();

    static async Task<string> RunAllAsync(int[] jobs)
    {
        Task<int[]> all = Task.WhenAll(jobs.Select(Job));
        try { await all; } catch { /* inspected below */ }
        if (all.IsFaulted)
            return "errors: " + string.Join(",", all.Exception!.InnerExceptions.Select(e => e.Message).Order(StringComparer.Ordinal));
        return "results: " + string.Join(",", all.Result);
    }

    static async Task<int> Job(int j)
    {
        await Task.Yield();
        if (j < 0) throw new InvalidOperationException($"job {j}");
        return j * 10;
    }
}`,
      dry: { head: ['job', 'outcome'], rows: [['1', '10'], ['-2', 'InvalidOperationException("job -2")'], ['3', '30'], ['-4', 'InvalidOperationException("job -4")'], ['WhenAll', 'Faulted, 2 inner exceptions → sorted']] },
      complexity: `<p>O(n) tasks; total time ≈ the slowest job.</p>`,
      followUps: ['Cancel the remaining jobs as soon as one fails (linked CancellationTokenSource).', 'Return partial results together with the errors.']
    }
  });

  practice.push({
    title: 'Case-Insensitive Word Counts with Ordinal Comparers',
    level: 'Medium', tags: ['StringComparer', 'Dictionary', 'culture'], companies: ['Google', 'Microsoft', 'Elastic'],
    statement: `<p>Count words (split on single spaces, ignoring empty entries) case-insensitively using a ${C('Dictionary')} with ${C('StringComparer.OrdinalIgnoreCase')}. Return ${C('"word=count"')} entries in order of first appearance, keeping the casing of the first occurrence. Do not lower-case the strings yourself (that allocates and is culture-sensitive — think of the Turkish dotted/dotless i).</p>`,
    constraints: `Up to 10<sup>5</sup> words.`,
    example: `<p>${C('"The cat the CAT dog"')} → ${H.c('g', '["The=2", "cat=2", "dog=1"]')}</p>`,
    brute: { why: `<p>${C('word.ToLower()')} as the key allocates a new string per word and uses the current culture: under tr-TR, ${C('"TITLE".ToLower()')} becomes "tıtle" with a dotless ı, so "TITLE" and "title" no longer match. An ordinal-ignore-case comparer compares without allocating and without culture surprises.</p>`, code: `
static class Lowering
{
    public static Dictionary<string, int> Count(string s)
    {
        var d = new Dictionary<string, int>();
        foreach (var w in s.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            string k = w.ToLower();                 // allocates, culture-sensitive
            d[k] = d.TryGetValue(k, out int c) ? c + 1 : 1;
        }
        return d;
    }
}` },
    mcq: { q: 'Which comparer is appropriate for case-insensitive identifiers such as HTTP header names or file extensions?', options: ['StringComparer.OrdinalIgnoreCase', 'StringComparer.CurrentCultureIgnoreCase', 'StringComparer.InvariantCulture', 'The default comparer after ToLower()'], answer: 0, explain: 'Identifiers are not natural-language text; ordinal comparisons are faster and do not change with the user\'s culture.' },
    hints: [`<p>Hint 1: ${C('new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)')} — the first key inserted keeps its casing.</p>`, `<p>Hint 2: keep a ${C('List<string>')} of keys in first-seen order (Dictionary enumeration order is not guaranteed once you remove items).</p>`, `<p>Hint 3: ${C('CollectionsMarshal.GetValueRefOrAddDefault(dict, w, out bool exists)')} increments with a single lookup.</p>`],
    tests: { sig: 'string -> string[]', fn: 'wordCounts', cases: [
      [['The cat the CAT dog'], ['The=2', 'cat=2', 'dog=1']],
      [[''], []],
      [['  a  A   a '], ['a=3']],
      [['TITLE title Title'], ['TITLE=3']],
      [['x y z'], ['x=1', 'y=1', 'z=1']],
      [['Straße STRASSE'], ['Straße=1', 'STRASSE=1']],
      [[{ $rep: 'Go go ', n: 50000 }], ['Go=100000']]
    ] },
    solution: {
      approach: `<p>A dictionary with an ordinal-ignore-case comparer treats "The", "the" and "THE" as one key without creating lower-case copies. A separate list preserves first-seen order and casing.</p>`,
      code: `
using System.Runtime.InteropServices;

public class Solution
{
    public static string[] WordCounts(string text)
    {
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var order = new List<string>();
        foreach (string w in text.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            ref int c = ref CollectionsMarshal.GetValueRefOrAddDefault(counts, w, out bool exists);
            if (!exists) order.Add(w);
            c++;
        }
        return order.Select(w => $"{w}={counts[w]}").ToArray();
    }
}`,
      dry: { head: ['word', 'key exists?', 'stored key', 'count'], rows: [['The', 'no', 'The', '1'], ['cat', 'no', 'cat', '1'], ['the', 'yes (OrdinalIgnoreCase)', 'The', '2'], ['CAT', 'yes', 'cat', '2'], ['dog', 'no', 'dog', '1']] },
      complexity: `<p>O(total length); one dictionary lookup per word.</p>`,
      followUps: ['Why does "Straße" not match "STRASSE" ordinally, and when should a culture-aware comparer be used?', 'Count without allocating substrings using <code>Dictionary.GetAlternateLookup</code> (.NET 9) or spans.']
    }
  });

  practice.push({
    title: 'Cooperative Cancellation and When It Is Observed',
    level: 'Medium', tags: ['CancellationToken', 'OperationCanceledException', 'async'], companies: ['Microsoft', 'Uber', 'PhonePe'],
    statement: `<p>${C('SumUntil(values, cancelAt)')} sums the values with a loop that calls ${C('token.ThrowIfCancellationRequested()')} at the <b>start</b> of every iteration; right after adding the element at index ${C('cancelAt')}, it calls ${C('cts.Cancel()')} (use −1 for "never"). Return ${C('"sum=S"')} if the loop completes, otherwise ${C('"canceled after K items, partial=S, ownToken=B"')} where B says whether the exception's ${C('CancellationToken')} is the one you created. Note the case where cancellation is requested after the last element: it is never observed.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; sums fit in long.`,
    example: `<p>${C('([1, 2, 3, 4], 1)')} → ${H.c('g', '"canceled after 2 items, partial=3, ownToken=True"')}</p>`,
    brute: { why: `<p>Checking a shared ${C('bool stop')} flag works in one method but does not compose: libraries cannot see your flag, linked timeouts are hand-written, and other threads may never see the update without proper memory barriers. ${C('CancellationToken')} is the standard, thread-safe, composable signal, and ${C('OperationCanceledException')} carries the token so callers can tell <b>whose</b> cancellation it was.</p>`, code: `
static class Flag
{
    public static bool Stop;
    public static long Sum(int[] v) { long s = 0; foreach (int x in v) { if (Stop) break; s += x; } return s; }   // ad-hoc, not composable
}` },
    mcq: { q: 'Why check <code>e.CancellationToken == cts.Token</code> when catching OperationCanceledException?', options: ['To distinguish your own cancellation from one caused by another token (e.g. a timeout or the caller\'s token)', 'Because the exception may be null', 'To reset the token', 'It is required to avoid a crash'], answer: 0, explain: 'In real code several tokens can be linked; handling "my timeout" differently from "the user cancelled" requires knowing which token fired.' },
    hints: [`<p>Hint 1: ${C('using var cts = new CancellationTokenSource(); var token = cts.Token;')}</p>`, `<p>Hint 2: count processed items as you add them; the throw happens at the next iteration's check.</p>`, `<p>Hint 3: ${C('catch (OperationCanceledException e) { ... e.CancellationToken == cts.Token ... }')}</p>`],
    tests: { sig: 'int[] int -> string', fn: 'sumUntil', cases: [
      [[[1, 2, 3, 4], 1], 'canceled after 2 items, partial=3, ownToken=True'],
      [[[1, 2, 3], -1], 'sum=6'],
      [[[1, 2, 3], 2], 'sum=6'],
      [[[], 0], 'sum=0'],
      [[[5], 0], 'sum=5'],
      [[[10, 20, 30], 0], 'canceled after 1 items, partial=10, ownToken=True'],
      [[{ $rep: 2147483647, n: 100000 }, 99998], 'canceled after 99999 items, partial=214746217216353, ownToken=True']
    ] },
    solution: {
      approach: `<p>The loop observes the token only at its checkpoints, so cancellation requested after the last element has no effect — cancellation is cooperative. The caught exception exposes the token, letting the caller confirm it was its own.</p>`,
      code: `
public class Solution
{
    public static string SumUntil(int[] values, int cancelAt)
    {
        using var cts = new CancellationTokenSource();
        long sum = 0;
        int processed = 0;
        try
        {
            for (int i = 0; i < values.Length; i++)
            {
                cts.Token.ThrowIfCancellationRequested();
                sum += values[i];
                processed++;
                if (i == cancelAt) cts.Cancel();
            }
            return $"sum={sum}";
        }
        catch (OperationCanceledException e)
        {
            return $"canceled after {processed} items, partial={sum}, ownToken={e.CancellationToken == cts.Token}";
        }
    }
}`,
      dry: { head: ['i', 'check', 'sum', 'action'], rows: [['0', 'ok', '1', '—'], ['1', 'ok', '3', 'Cancel()'], ['2', 'throws', '3', 'canceled after 2 items']] },
      complexity: `<p>O(n); the check is a cheap volatile read.</p>`,
      followUps: ['Link a timeout: <code>CreateLinkedTokenSource(callerToken)</code> + <code>CancelAfter</code>.', 'Make it async and pass the token to <code>Task.Delay</code>.']
    }
  });

  practice.push({
    title: 'Undo with Immutable List Versions',
    level: 'Medium', tags: ['ImmutableList', 'undo', 'immutability'], companies: ['Figma', 'Microsoft', 'Notion'],
    statement: `<p>Maintain an ${C('ImmutableList<string>')} document. Operations: ${C('"add x"')} appends x, ${C('"remove x"')} removes the first x (if x is absent nothing changes and no history entry is created), ${C('"undo"')} restores the previous version (no-op if there is no history). Keep history as a stack of previous immutable versions. Return ${C('[contents, "versions=N"]')} where contents are comma-joined (or ${C('"(empty)"')}) and N is the number of undo steps still available.</p>`,
    constraints: `Up to 10<sup>4</sup> operations.`,
    example: `<p>${C('["add a", "add b", "remove a", "undo"]')} → ${H.c('g', '["a,b", "versions=2"]')}</p>`,
    brute: { why: `<p>With a mutable ${C('List<string>')}, undo means storing a full copy before every change (O(n) per operation) or writing an inverse for every operation (error-prone). Immutable versions make "keep the old one" free: each change returns a new list sharing structure with the old.</p>`, code: `
static class CopyUndo
{
    public static List<string> Apply(List<List<string>> history, List<string> doc, string x)
    {
        history.Add(new List<string>(doc));   // full O(n) copy per change
        doc.Add(x);
        return doc;
    }
}` },
    mcq: { q: 'What does <code>ImmutableList&lt;T&gt;.Remove(x)</code> return when x is not in the list?', options: ['The same instance (no change)', 'A new identical list', 'null', 'It throws KeyNotFoundException'], answer: 0, explain: 'Immutable collections return the original instance when an operation changes nothing, so ReferenceEquals tells you whether a new version was produced.' },
    hints: [`<p>Hint 1: ${C('var doc = ImmutableList<string>.Empty; var history = new Stack<ImmutableList<string>>();')}</p>`, `<p>Hint 2: for add/remove: ${C('var next = ...; if (!ReferenceEquals(next, doc)) { history.Push(doc); doc = next; }')}</p>`, `<p>Hint 3: undo: ${C('if (history.Count > 0) doc = history.Pop();')}</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'edit', cases: [
      [[['add a', 'add b', 'remove a', 'undo']], ['a,b', 'versions=2']],
      [[[]], ['(empty)', 'versions=0']],
      [[['undo', 'undo']], ['(empty)', 'versions=0']],
      [[['add x', 'remove y']], ['x', 'versions=1']],
      [[['add a', 'add a', 'remove a']], ['a', 'versions=3']],
      [[['add a', 'add b', 'undo', 'undo', 'undo', 'add c']], ['c', 'versions=1']],
      [[{ $rep: 'add z', n: 5000 }], ['checked by function']]
    ], check: '(args, out, exp) => { if (exp[0] !== "checked by function") return out.length === exp.length && out.every((v, i) => v === exp[i]); return out.length === 2 && out[0] === Array(5000).fill("z").join(",") && out[1] === "versions=5000"; }' },
    solution: {
      approach: `<p>Every change produces a new immutable version; the previous one is pushed on a stack. Undo pops. Because versions share structure, each change costs O(log n) memory instead of a full copy.</p>`,
      code: `
using System.Collections.Immutable;

public class Solution
{
    public static string[] Edit(string[] ops)
    {
        var doc = ImmutableList<string>.Empty;
        var history = new Stack<ImmutableList<string>>();
        foreach (string op in ops)
        {
            if (op == "undo") { if (history.Count > 0) doc = history.Pop(); continue; }
            string[] p = op.Split(' ', 2);
            var next = p[0] == "add" ? doc.Add(p[1]) : doc.Remove(p[1]);
            if (!ReferenceEquals(next, doc)) { history.Push(doc); doc = next; }
        }
        return new[] { doc.IsEmpty ? "(empty)" : string.Join(",", doc), $"versions={history.Count}" };
    }
}`,
      dry: { head: ['op', 'doc', 'history size'], rows: [['add a', 'a', '1'], ['add b', 'a,b', '2'], ['remove a', 'b', '3'], ['undo', 'a,b', '2']] },
      complexity: `<p>O(log n) time and extra memory per add/remove (balanced tree), O(1) per undo.</p>`,
      followUps: ['Add redo with a second stack.', 'Compare memory use with <code>ImmutableArray</code> for small documents.']
    }
  });

  practice.push({
    title: 'Fail-Fast Bounded Processing with Cancellation',
    level: 'Hard', tags: ['async', 'SemaphoreSlim', 'cancellation', 'WhenAll'], companies: ['Microsoft', 'Amazon', 'Stripe'],
    statement: `<p>Process items with at most ${C('limit')} running at once. ${C('Work(x, ct)')} awaits ${C('Task.Yield()')}, throws ${C('InvalidOperationException("item x")')} if x &lt; 0, otherwise awaits ${C('Task.Delay(1, ct)')} and returns ${C('x * 3')}. On the <b>first failure</b>, cancel a shared ${C('CancellationTokenSource')} so items still waiting for the semaphore (${C('WaitAsync(ct)')}) or delaying stop immediately. Return ${C('"ok: r1,r2,... peakOk=True"')} (input order) on success, or ${C('"failed: item X"')} — the real failure, not one of the resulting cancellations. The method must never hang and must observe every task.</p>`,
    constraints: `0 ≤ n ≤ 500, 1 ≤ limit ≤ 16, at most one negative item.`,
    example: `<p>${C('([1, 2, -5, 4, 5, 6], 2)')} → ${H.c('g', '"failed: item -5"')}</p>`,
    brute: { why: `<p>Without cancellation, a failure early in a batch of 10,000 calls still waits for (and pays for) all the others. Without filtering, the caller may see one of the many ${C('OperationCanceledException')}s instead of the root cause. Fail-fast needs both: cancel on first error, then report the non-cancellation exception.</p>`, code: `
static class NoCancel
{
    public static async Task<int[]> Run(int[] items, Func<int, Task<int>> work) => await Task.WhenAll(items.Select(work));   // waits for everything
}` },
    mcq: { q: 'After the failure, which exceptions do the other tasks typically end with?', options: ['OperationCanceledException (TaskCanceledException) — they are Canceled, not Faulted', 'The same InvalidOperationException', 'ObjectDisposedException', 'None — they keep running'], answer: 0, explain: 'WaitAsync(ct) and Delay(ct) throw OperationCanceledException when the token is cancelled. The WhenAll task contains the real failure plus is marked faulted because at least one task faulted.' },
    hints: [`<p>Hint 1: in each task: ${C('try { await gate.WaitAsync(ct); ... } catch (Exception e) when (e is not OperationCanceledException) { cts.Cancel(); throw; }')}</p>`, `<p>Hint 2: release the semaphore only if it was acquired (track a ${C('bool acquired')}).</p>`, `<p>Hint 3: after ${C('try { await all; } catch { }')}, pick ${C('all.Exception!.InnerExceptions.First(e => e is not OperationCanceledException)')}.</p>`],
    tests: { sig: 'int[] int -> string', fn: 'processFailFast', cases: [
      [[[1, 2, -5, 4, 5, 6], 2], 'failed: item -5'],
      [[[1, 2, 3], 2], 'ok: 3,6,9 peakOk=True'],
      [[[], 4], 'ok:  peakOk=True'],
      [[[-1], 1], 'failed: item -1'],
      [[[7, 8, 9, 10, -2], 3], 'failed: item -2'],
      [[{ $range: [0, 200] }, 16], 'checked by function'],
      [[{ $concat: [[-7], { $range: [0, 300] }] }, 4], 'failed: item -7']
    ], check: '(args, out, exp) => exp !== "checked by function" ? out === exp : out === "ok: " + args[0].map(x => x * 3).join(",") + " peakOk=True"' },
    solution: {
      approach: `<p>Combine a semaphore for the limit with a shared CTS for fail-fast. The first real failure cancels the token; waiting and delaying tasks end as Canceled. The WhenAll task is inspected afterwards to report the root cause, and every task is awaited through WhenAll so nothing is left unobserved.</p>`,
      code: `
public class Solution
{
    public static string ProcessFailFast(int[] items, int limit) => RunAsync(items, limit).GetAwaiter().GetResult();

    static async Task<string> RunAsync(int[] items, int limit)
    {
        using var cts = new CancellationTokenSource();
        using var gate = new SemaphoreSlim(limit);
        var ct = cts.Token;
        int current = 0, peak = 0;

        async Task<int> One(int x)
        {
            bool acquired = false;
            try
            {
                await gate.WaitAsync(ct);
                acquired = true;
                int now = Interlocked.Increment(ref current);
                int seen;
                while ((seen = Volatile.Read(ref peak)) < now && Interlocked.CompareExchange(ref peak, now, seen) != seen) { }
                try { return await Work(x, ct); }
                finally { Interlocked.Decrement(ref current); }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                cts.Cancel();
                throw;
            }
            finally
            {
                if (acquired) gate.Release();
            }
        }

        Task<int[]> all = Task.WhenAll(items.Select(One));
        try { await all; } catch { /* inspected below */ }
        if (all.IsCompletedSuccessfully)
            return $"ok: {string.Join(",", all.Result)} peakOk={peak <= limit}";
        var root = all.Exception?.InnerExceptions.FirstOrDefault(e => e is not OperationCanceledException);
        return root is null ? "canceled" : $"failed: {root.Message}";
    }

    static async Task<int> Work(int x, CancellationToken ct)
    {
        await Task.Yield();
        if (x < 0) throw new InvalidOperationException($"item {x}");
        await Task.Delay(1, ct);
        return x * 3;
    }
}`,
      dry: { head: ['event', 'effect'], rows: [['items 1, 2 acquire the gate', 'running (limit 2)'], ['item -5 acquires, throws', 'cts.Cancel()'], ['items waiting in WaitAsync(ct)', 'throw OperationCanceledException'], ['WhenAll completes', 'Faulted: InvalidOperationException + cancellations'], ['report', 'failed: item -5']] },
      complexity: `<p>O(n) tasks; after a failure the remaining work stops almost immediately.</p>`,
      followUps: ['Return the results that did complete before the failure.', 'Implement the same with <code>Channel&lt;int&gt;</code> and N worker tasks.']
    }
  });

  practice.push({
    title: 'Predict the Output: Deferred LINQ and Iterator Cleanup',
    level: 'Easy', tags: ['output prediction', 'LINQ', 'iterators'], companies: ['Microsoft', 'Capgemini', 'Accenture'],
    statement: `<p>Write down the 6 lines this program prints.</p>${P(`
int calls = 0;
var list = new List<int> { 1, 2, 3, 4 };
var s = list.Select(x => { calls++; return x * 2; });
Console.WriteLine(calls);
_ = s.ToArray();
Console.WriteLine(calls);
_ = s.First();
Console.WriteLine(calls);
var evens = list.Where(x => x % 2 == 0);
list.Remove(2);
Console.WriteLine(string.Join(",", evens));
foreach (var n in Nums()) { Console.WriteLine(n); break; }

static IEnumerable<int> Nums()
{
    try { yield return 1; yield return 2; }
    finally { Console.WriteLine("cleanup"); }
}`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 3 is ${H.c('g', '5')}: ${C('First()')} runs the selector for just one element.</p>`,
    brute: { why: `<p>Assuming LINQ runs immediately and caches results predicts ${C('4, 4, 4, 2,4, 1')} and no "cleanup". Each enumeration re-runs the pipeline (lazily, element by element), queries see later changes to the source, and breaking out of foreach disposes the iterator, which runs its finally.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "4", "4", "4", "2,4", "1" };
}` },
    mcq: { q: 'Why does "cleanup" print although the loop breaks after the first element?', options: ['foreach disposes the enumerator on exit, and disposing an iterator runs its pending finally blocks', 'The iterator always runs to completion', 'break is ignored inside iterators', 'The GC runs the finally immediately'], answer: 0, explain: 'foreach compiles to try/finally { enumerator.Dispose(); }; the iterator\'s Dispose executes the finally block of the suspended try.' },
    hints: [`<p>Hint 1: defining a query runs nothing; ${C('ToArray')} runs the selector once per element.</p>`, `<p>Hint 2: ${C('First()')} stops after the first element.</p>`, `<p>Hint 3: the Where query is evaluated when ${C('string.Join')} enumerates it — after the Remove.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '0\n4\n5\n4\n1\ncleanup' }] },
    solution: {
      approach: `<p>Count selector calls per enumeration (0, then 4, then 1 more), evaluate the Where after the removal (only 4 remains even), and remember that foreach disposes the iterator, running its finally.</p>`,
      code: { lang: 'csharp', run: true, code: `
int calls = 0;
var list = new List<int> { 1, 2, 3, 4 };
var s = list.Select(x => { calls++; return x * 2; });
Console.WriteLine(calls);                     // 0 (nothing ran)
_ = s.ToArray();
Console.WriteLine(calls);                     // 4
_ = s.First();
Console.WriteLine(calls);                     // 5 (one more element)
var evens = list.Where(x => x % 2 == 0);
list.Remove(2);
Console.WriteLine(string.Join(",", evens));   // 4 (query runs after Remove)
foreach (var n in Nums()) { Console.WriteLine(n); break; }   // 1, then cleanup on Dispose

static IEnumerable<int> Nums()
{
    try { yield return 1; yield return 2; }
    finally { Console.WriteLine("cleanup"); }
}` },
      dry: { head: ['statement', 'selector calls so far', 'output'], rows: [['define s', '0', '0'], ['ToArray', '4', '4'], ['First', '5', '5'], ['Join(evens) after Remove(2)', '—', '4'], ['foreach + break', '—', '1, cleanup']] },
      complexity: `<p>O(1). The skill is knowing when LINQ and iterators execute.</p>`,
      followUps: ['How would you avoid re-running an expensive query twice? (materialise once)', 'What prints if you iterate Nums() manually with GetEnumerator() and never call Dispose? (no cleanup)']
    }
  });

  practice.push({
    title: 'Hash-Consing Expression Trees with Records',
    level: 'Hard', tags: ['records', 'equality', 'interning', 'expression trees'], companies: ['Microsoft', 'Jane Street', 'Databricks'],
    statement: `<p>Parse a postfix expression over lowercase variables, non-negative integers, ${C('+')} and ${C('*')} into nodes ${C('Num(int)')}, ${C('Var(string)')}, ${C('Bin(char Op, Expr L, Expr R)')} (records). <b>Hash-cons</b> them: every node is looked up in an interning dictionary so that structurally identical subtrees become the <b>same object</b>. Return ${C('[totalNodes, uniqueNodes]')}. Because children are already canonical, ${C('Bin')} equality and hashing can use <b>reference</b> identity of children — making every lookup O(1) instead of O(subtree) and avoiding deep recursion on 10<sup>4</sup>-level chains.</p>`,
    constraints: `Up to 4·10<sup>4</sup> tokens; the expression is valid. Operators are not commutative here (a+b ≠ b+a).`,
    example: `<p>${C('"a b + a b + *"')}: nodes a, b, +, a, b, +, * → total 7; unique: a, b, (a+b), (a+b)*(a+b) → ${H.c('g', '[7, 4]')}</p>`,
    brute: { why: `<p>Default record equality for ${C('Bin')} compares children with their own Equals — recursively walking both subtrees, and the generated GetHashCode also recurses. Each dictionary lookup then costs O(subtree size): O(n²) total, and a 20,000-deep left chain overflows the stack. With canonical children, shallow reference comparison is enough.</p>`, code: `
abstract record E0;
sealed record N0(int V) : E0;
sealed record B0(char Op, E0 L, E0 R) : E0;   // generated Equals/GetHashCode recurse through the whole subtree` },
    mcq: { q: 'Why is comparing children with ReferenceEquals correct here?', options: ['Children were interned first, so equal subtrees are guaranteed to be the same object', 'Records always compare by reference', 'ReferenceEquals compares contents for records', 'Because Op is a char'], answer: 0, explain: 'Hash-consing maintains the invariant "structurally equal ⇒ same instance" bottom-up; shallow identity checks then imply deep equality.' },
    hints: [`<p>Hint 1: keep ${C('Dictionary<Expr, Expr> pool')}; ${C('Intern(e) => pool.TryGetValue(e, out var c) ? c : pool[e] = e')}.</p>`, `<p>Hint 2: in ${C('sealed record Bin')}, declare ${C('public bool Equals(Bin? o) => o is not null && Op == o.Op && ReferenceEquals(L, o.L) && ReferenceEquals(R, o.R);')}</p>`, `<p>Hint 3: hash with ${C('HashCode.Combine(Op, RuntimeHelpers.GetHashCode(L), RuntimeHelpers.GetHashCode(R))')} — the identity hash, not the recursive one.</p>`],
    tests: { sig: 'string -> int[]', fn: 'hashCons', cases: [
      [['a b + a b + *'], [7, 4]],
      [['a'], [1, 1]],
      [['1 1 +'], [3, 2]],
      [['a b + b a + *'], [7, 5]],
      [['x x * x x * +'], [7, 3]],
      [['2 3 + 2 3 + +'], [7, 4]],
      [[{ $concat: ['a', { $rep: ' a +', n: 20000 }] }], [40001, 20001]],
      [[{ $concat: ['a', { $rep: ' 1 *', n: 20000 }] }], [40001, 20002]]
    ] },
    solution: {
      approach: `<p>Build bottom-up with a stack; intern every new node immediately. Leaves use the normal record equality (shallow). Bin uses identity of its (canonical) children, so equality and hashing are O(1) and non-recursive. Unique nodes = pool size.</p>`,
      code: `
using System.Runtime.CompilerServices;

public class Solution
{
    public static int[] HashCons(string rpn)
    {
        var pool = new Dictionary<Expr, Expr>();
        Expr Intern(Expr e) => pool.TryGetValue(e, out var c) ? c : pool[e] = e;
        var st = new Stack<Expr>();
        int total = 0;
        foreach (string t in rpn.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            Expr node;
            if (t is "+" or "*") { Expr r = st.Pop(), l = st.Pop(); node = new Bin(t[0], l, r); }
            else if (int.TryParse(t, out int v)) node = new Num(v);
            else node = new Var(t);
            total++;
            st.Push(Intern(node));
        }
        return new[] { total, pool.Count };
    }
}

public abstract record Expr;
public sealed record Num(int V) : Expr;
public sealed record Var(string Name) : Expr;
public sealed record Bin(char Op, Expr L, Expr R) : Expr
{
    public bool Equals(Bin? o) => o is not null && Op == o.Op && ReferenceEquals(L, o.L) && ReferenceEquals(R, o.R);
    public override int GetHashCode() => HashCode.Combine(Op, RuntimeHelpers.GetHashCode(L), RuntimeHelpers.GetHashCode(R));
}`,
      dry: { head: ['token', 'new node', 'interned as', 'pool size'], rows: [['a', 'Var a', 'a#1', '1'], ['b', 'Var b', 'b#2', '2'], ['+', 'Bin(+, a#1, b#2)', '#3', '3'], ['a', 'Var a', 'a#1 (hit)', '3'], ['b', 'Var b', 'b#2 (hit)', '3'], ['+', 'Bin(+, a#1, b#2)', '#3 (hit)', '3'], ['*', 'Bin(*, #3, #3)', '#4', '4']] },
      complexity: `<p>O(n) expected time and memory: one O(1) dictionary lookup per token, no recursion.</p>`,
      followUps: ['Treat + and * as commutative by ordering children (e.g. by identity hash) before interning.', 'Use the pool for common-subexpression elimination when generating code.']
    }
  });

  practice.push({
    title: 'Symmetric Equality: Class Hierarchy vs Records',
    level: 'Medium', tags: ['equality', 'inheritance', 'records'], companies: ['Microsoft', 'Oracle', 'Thoughtworks'],
    statement: `<p>Two hierarchies: classes ${C('PointC(X, Y)')} with ${C('Equals(object o) => o is PointC p && X == p.X && Y == p.Y')} and ${C('ColorPointC : PointC')} adding ${C('Color')} with ${C('Equals => o is ColorPointC c && base.Equals(c) && Color == c.Color')}; and records ${C('PointR(X, Y)')} and ${C('ColorPointR(X, Y, Color) : PointR')}. Each input describes an object: ${C('"P x y"')} or ${C('"C x y color"')}. ${C('Compare(a, b)')} builds both versions and returns ${C('"classes: A/B, records: C/D"')} where A = a.Equals(b), B = b.Equals(a) for the classes, and C, D the same for the records.</p>`,
    constraints: `Coordinates are ints; colors are words.`,
    example: `<p>${C('Compare("P 1 2", "C 1 2 red")')} → ${H.c('g', '"classes: True/False, records: False/False"')}</p>`,
    brute: { why: `<p>The hand-written class equality looks reasonable but is <b>asymmetric</b> across the hierarchy: a point "equals" a colored point, but not the other way round. HashSets and dictionaries then behave differently depending on insertion order. Records compare their ${C('EqualityContract')} (run-time type) first, which keeps equality symmetric.</p>`, code: `
class P0 { public int X; public override bool Equals(object? o) => o is P0 p && p.X == X; public override int GetHashCode() => X; }
class C0 : P0 { public string Color = ""; public override bool Equals(object? o) => o is C0 c && c.X == X && c.Color == Color; public override int GetHashCode() => X; }` },
    mcq: { q: 'How do records make equality symmetric across inheritance?', options: ['The generated Equals compares EqualityContract (the run-time type) before comparing fields', 'Records cannot be inherited', 'Records compare by reference', 'They compare only the base-class fields'], answer: 0, explain: 'PointR(1, 2).Equals(ColorPointR(1, 2, "red")) checks typeof(PointR) == typeof(ColorPointR) first, which fails both ways.' },
    hints: [`<p>Hint 1: parse with ${C('Split(\' \')')}; ${C('p[0] == "P"')} decides the type.</p>`, `<p>Hint 2: write factories ${C('MakeClass(string)')} returning ${C('PointC')} and ${C('MakeRecord(string)')} returning ${C('PointR')}.</p>`, `<p>Hint 3: call ${C('Equals(object)')} through base-typed variables so the virtual call dispatches on the run-time type.</p>`],
    tests: { sig: 'string string -> string', fn: 'compare', cases: [
      [['P 1 2', 'C 1 2 red'], 'classes: True/False, records: False/False'],
      [['C 1 2 red', 'P 1 2'], 'classes: False/True, records: False/False'],
      [['P 1 2', 'P 1 2'], 'classes: True/True, records: True/True'],
      [['C 1 2 red', 'C 1 2 red'], 'classes: True/True, records: True/True'],
      [['C 1 2 red', 'C 1 2 blue'], 'classes: False/False, records: False/False'],
      [['P 1 2', 'P 1 3'], 'classes: False/False, records: False/False'],
      [['P -5 0', 'C -5 0 x'], 'classes: True/False, records: False/False']
    ] },
    solution: {
      approach: `<p>Build both representations and call Equals in both directions through base-typed references. The class version shows the classic asymmetry; the record version is symmetric thanks to EqualityContract.</p>`,
      code: `
public class Solution
{
    public static string Compare(string a, string b)
    {
        PointC ca = MakeClass(a), cb = MakeClass(b);
        PointR ra = MakeRecord(a), rb = MakeRecord(b);
        return $"classes: {ca.Equals(cb)}/{cb.Equals(ca)}, records: {ra.Equals(rb)}/{rb.Equals(ra)}";
    }

    static PointC MakeClass(string s)
    {
        string[] p = s.Split(' ');
        int x = int.Parse(p[1]), y = int.Parse(p[2]);
        return p[0] == "P" ? new PointC(x, y) : new ColorPointC(x, y, p[3]);
    }

    static PointR MakeRecord(string s)
    {
        string[] p = s.Split(' ');
        int x = int.Parse(p[1]), y = int.Parse(p[2]);
        return p[0] == "P" ? new PointR(x, y) : new ColorPointR(x, y, p[3]);
    }
}

public class PointC(int x, int y)
{
    public int X { get; } = x;
    public int Y { get; } = y;
    public override bool Equals(object? o) => o is PointC p && X == p.X && Y == p.Y;
    public override int GetHashCode() => HashCode.Combine(X, Y);
}

public class ColorPointC(int x, int y, string color) : PointC(x, y)
{
    public string Color { get; } = color;
    public override bool Equals(object? o) => o is ColorPointC c && base.Equals(c) && Color == c.Color;
    public override int GetHashCode() => HashCode.Combine(X, Y, Color);
}

public record PointR(int X, int Y);
public record ColorPointR(int X, int Y, string Color) : PointR(X, Y);`,
      dry: { head: ['a', 'b', 'class a.Equals(b)', 'class b.Equals(a)', 'records'], rows: [['P 1 2', 'C 1 2 red', 'True (b is a PointC)', 'False (a is not a ColorPointC)', 'False/False (EqualityContract differs)'], ['P 1 2', 'P 1 2', 'True', 'True', 'True/True']] },
      complexity: `<p>O(1) per comparison.</p>`,
      followUps: ['Fix the class version by comparing <code>GetType()</code> in PointC.Equals.', 'What does <code>new PointR(1, 2) == new ColorPointR(1, 2, "red")</code> return?']
    }
  });

  practice.push({
    title: 'Async Cache That Runs Each Factory Once',
    level: 'Hard', tags: ['async', 'ConcurrentDictionary', 'Lazy', 'caching'], companies: ['Microsoft', 'Netflix', 'Cloudflare'],
    statement: `<p>Implement ${C('AsyncCache')} with ${C('Task<int> GetAsync(string key)')} backed by ${C('ConcurrentDictionary<string, Lazy<Task<int>>>')}, so that concurrent callers for the same key share <b>one</b> factory execution. The factory increments a per-key call counter, awaits ${C('Task.Delay(5)')}, and returns ${C('key.Length * 10')} — except that keys starting with ${C('"!"')} throw on their <b>first</b> factory call. A faulted entry must be evicted so a later call retries. ${C('Simulate(keys)')} starts every request concurrently with ${C('Task.Run')}, waits for all (ignoring failures), then calls ${C('GetAsync')} once more for every distinct key, and returns sorted (ordinal) ${C('"key=calls:value"')}.</p>`,
    constraints: `Up to 200 requests.`,
    example: `<p>${C('["a", "bb", "a", "a", "!x", "!x"]')} → ${H.c('g', '["!x=2:20", "a=1:10", "bb=1:20"]')}</p>`,
    brute: { why: `<p>${C('dict.GetOrAdd(key, k => Factory(k))')} with a ${C('ConcurrentDictionary<string, Task<int>>')} may invoke the factory several times when callers race (GetOrAdd does not lock around the delegate) — a "cache stampede" that hammers the backing service exactly when it is cold. Wrapping the task in ${C('Lazy<T>')} makes only the winning Lazy's factory run. Caching a faulted task forever is the second classic bug.</p>`, code: `
static class Stampede
{
    static readonly System.Collections.Concurrent.ConcurrentDictionary<string, Task<int>> Cache = new();
    public static Task<int> Get(string k, Func<string, Task<int>> factory) => Cache.GetOrAdd(k, factory);   // factory may run more than once
}` },
    mcq: { q: 'Why does <code>GetOrAdd(key, k =&gt; new Lazy&lt;Task&lt;int&gt;&gt;(() =&gt; Factory(k)))</code> run the factory only once?', options: ['Several Lazy objects may be created in a race, but only the one stored in the dictionary is ever evaluated (.Value), and Lazy runs its factory once', 'GetOrAdd locks around the delegate', 'Task caches itself', 'ConcurrentDictionary deduplicates delegates'], answer: 0, explain: 'Creating a Lazy is cheap and side-effect free; losers are discarded unevaluated. Lazy\'s default ExecutionAndPublication mode guarantees a single execution.' },
    hints: [`<p>Hint 1: ${C('var lazy = _map.GetOrAdd(key, k => new Lazy<Task<int>>(() => _factory(k)));')}</p>`, `<p>Hint 2: on failure: ${C('_map.TryRemove(new KeyValuePair<string, Lazy<Task<int>>>(key, lazy));')} removes only that exact entry (not a newer successful one).</p>`, `<p>Hint 3: count factory calls in a ${C('ConcurrentDictionary<string, int>')} with ${C('AddOrUpdate')}.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'simulate', cases: [
      [[['a', 'bb', 'a', 'a', '!x', '!x']], ['!x=2:20', 'a=1:10', 'bb=1:20']],
      [[[]], []],
      [[['k']], ['k=1:10']],
      [[['!e']], ['!e=2:20']],
      [[['abc', 'abc', 'abc', 'abc', 'abc', 'abc', 'abc', 'abc']], ['abc=1:30']],
      [[{ $concat: [{ $rep: 'hot', n: 100 }, { $rep: '!cold', n: 50 }] }], ['!cold=2:50', 'hot=1:30']]
    ] },
    solution: {
      approach: `<p>Store ${C('Lazy<Task<int>>')} values: racing callers may create extra Lazy wrappers, but only the stored one is evaluated, so the factory runs once per key. If the shared task faults, evict exactly that entry so the next call retries; successful tasks stay cached.</p>`,
      code: `
using System.Collections.Concurrent;

public class Solution
{
    public static string[] Simulate(string[] keys) => SimulateAsync(keys).GetAwaiter().GetResult();

    static async Task<string[]> SimulateAsync(string[] keys)
    {
        var calls = new ConcurrentDictionary<string, int>();
        var cache = new AsyncCache(async k =>
        {
            int n = calls.AddOrUpdate(k, 1, (_, c) => c + 1);
            await Task.Delay(5);
            if (k.StartsWith('!') && n == 1) throw new InvalidOperationException("first call fails");
            return k.Length * 10;
        });
        var requests = keys.Select(k => Task.Run(() => cache.GetAsync(k))).ToArray();
        try { await Task.WhenAll(requests); } catch { /* failures are expected for "!" keys */ }
        var lines = new List<string>();
        foreach (string k in keys.Distinct().Order(StringComparer.Ordinal))
        {
            int value = await cache.GetAsync(k);
            lines.Add($"{k}={calls[k]}:{value}");
        }
        return lines.ToArray();
    }
}

public sealed class AsyncCache(Func<string, Task<int>> factory)
{
    private readonly ConcurrentDictionary<string, Lazy<Task<int>>> _map = new();

    public async Task<int> GetAsync(string key)
    {
        var lazy = _map.GetOrAdd(key, k => new Lazy<Task<int>>(() => factory(k)));
        try
        {
            return await lazy.Value;
        }
        catch
        {
            _map.TryRemove(new KeyValuePair<string, Lazy<Task<int>>>(key, lazy));   // evict only this faulted entry
            throw;
        }
    }
}`,
      dry: { head: ['phase', 'key', 'factory calls', 'cache entry'], rows: [['concurrent', 'a (×3)', '1', 'Lazy → Task(10)'], ['concurrent', '!x (×2)', '1 (throws)', 'evicted'], ['retry', '!x', '2', 'Lazy → Task(20)'], ['retry', 'a', '1 (cache hit)', 'unchanged']] },
      complexity: `<p>O(1) average per request; one factory execution per key per successful load.</p>`,
      followUps: ['Add expiration (store the creation time and refresh in the background).', 'Compare with <code>IMemoryCache.GetOrCreateAsync</code> — does it prevent stampedes? (No, not by itself.)']
    }
  });

  /* ======================================================================
     QUIZ — output prediction and idioms (authored with the correct option first; rotated below)
     ====================================================================== */
  quiz.push(
    { q: `<code>int i = 0; int r = i++ + ++i;</code> — what are r and i?`, options: ['r = 2, i = 2', 'r = 1, i = 2', 'r = 2, i = 1', 'Undefined behaviour'], answer: 0, explain: 'C# evaluates left to right: i++ yields 0 (i becomes 1), ++i makes i 2 and yields 2; 0 + 2 = 2.' },
    { q: `What does <code>Console.WriteLine(1 + 2 + "3" + 4 + 5);</code> print?`, options: ['3345', '12345', '15', '339'], answer: 0, explain: '+ is left-associative: 1 + 2 = 3 (int), then "3" makes every following + a concatenation: "33" → "334" → "3345".' },
    { q: `<code>static int G() { int x = 1; try { return x; } finally { x = 99; } }</code> returns…`, options: ['1', '99', 'Compile error', 'It throws'], answer: 0, explain: 'The return value is copied before the finally block runs; changing x afterwards does not affect it.' },
    { q: `An exception thrown in a <code>finally</code> block while another exception is propagating…`, options: ['Replaces the original exception', 'Is wrapped in an AggregateException with the original', 'Is ignored', 'Crashes the process'], answer: 0, explain: 'Only one exception propagates; the original is lost. This is why Dispose methods should not throw.' },
    { q: `In <code>try { try { throw ...; } finally { A(); } } catch (Exception) when (B()) { C(); }</code>, the order is…`, options: ['B, A, C', 'A, B, C', 'A, C, B', 'B, C, A'], answer: 0, explain: 'Two-pass handling: filters run while searching for a handler (before unwinding), then finally blocks run during unwinding, then the catch body.' },
    { q: `<code>for (int i = 0; i &lt; 3; i++) fs.Add(() =&gt; i);</code> — invoking all lambdas afterwards gives…`, options: ['3, 3, 3', '0, 1, 2', '2, 2, 2', '0, 0, 0'], answer: 0, explain: 'All lambdas capture the same loop variable, which is 3 when the loop ends. foreach creates a fresh variable per iteration instead.' },
    { q: `<code>var q = list.Where(x =&gt; x &gt; 1); list.Add(5); q.Count()</code> on <code>[1, 2]</code> returns…`, options: ['2', '1', '3', 'InvalidOperationException'], answer: 0, explain: 'The query runs when Count enumerates it, after Add: 2 and 5 match. (Modifying during enumeration would throw, but here enumeration starts after the change.)' },
    { q: `What does <code>Math.Round(2.5)</code> return?`, options: ['2', '3', '2.5', '3.0 only in checked mode'], answer: 0, explain: 'The default MidpointRounding is ToEven (banker\'s rounding). Use MidpointRounding.AwayFromZero for 3.' },
    { q: `<code>static string A = B + "!"; static string B = "b";</code> in the same class — what is A?`, options: ['"!"', '"b!"', 'null', 'Compile error'], answer: 0, explain: 'Static initializers run in textual order; when A is computed, B is still null, and null concatenates as an empty string.' },
    { q: `Which is the best way to run independent async calls concurrently and get all results?`, options: ['Start them all, then <code>await Task.WhenAll(tasks)</code>', '<code>await</code> each one in a loop', '<code>Task.WaitAll</code> on a UI thread', 'Call <code>.Result</code> on each'], answer: 0, explain: 'WhenAll awaits concurrently without blocking threads; sequential awaits add latencies; Wait/Result block and can deadlock.' },
    { q: `Why is <code>async void</code> dangerous outside event handlers?`, options: ['Callers cannot await it and its exceptions are raised on the synchronization context, often crashing the process', 'It runs synchronously', 'It cannot use await', 'It leaks memory by design'], answer: 0, explain: 'There is no Task to observe completion or failure. Use async Task.' },
    { q: `A record <code>record Team(string Name, List&lt;string&gt; Members)</code>: two teams with equal names and lists containing the same strings are…`, options: ['Not equal — List&lt;T&gt; compares by reference', 'Equal — records compare deeply', 'Equal only if sorted', 'A compile error'], answer: 0, explain: 'Record equality uses EqualityComparer&lt;T&gt;.Default per member; List&lt;T&gt; does not override Equals.' },
    { q: `A key object is mutated after being added to a <code>HashSet</code> and its hash changes. <code>set.Contains(key)</code> now usually returns…`, options: ['False — the lookup goes to a different bucket', 'True', 'It throws', 'It depends on Count'], answer: 0, explain: 'The entry stays in the bucket of the old hash. Keys must be immutable with respect to Equals/GetHashCode.' },
    { q: `What is the main reason to return a <code>Result&lt;T&gt;</code> instead of throwing for invalid user input?`, options: ['The failure is expected: it becomes visible in the signature and costs far less than an exception', 'Exceptions cannot carry messages', 'Results are required by ASP.NET Core', 'Exceptions are not thread-safe'], answer: 0, explain: 'Exceptions are for exceptional or programmer errors; frequent expected failures are cheaper and clearer as values.' },
    { q: `In the dispose pattern, what should <code>Dispose(bool disposing)</code> do when <code>disposing</code> is false?`, options: ['Release only unmanaged resources (it is called from the finalizer)', 'Dispose managed fields as well', 'Throw ObjectDisposedException', 'Call GC.SuppressFinalize'], answer: 0, explain: 'From a finalizer, other managed objects may already be finalized; touching them is unsafe.' }
  );

  /* ======================================================================
     INTERVIEW QUESTION BANK (covers the whole C# track)
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What is the difference between a class, a struct, a record and a record struct?', a: `<p>A <b>class</b> is a reference type: variables hold references, assignment copies the reference, equality defaults to identity, instances live on the heap. A <b>struct</b> is a value type: assignment copies the whole value, it lives inline (on the stack or inside its container), default equality compares fields (slowly unless you implement ${C('IEquatable<T>')}), and it should be small and ideally immutable. A <b>record</b> (record class) is a class with compiler-generated value equality, ${C('ToString')}, deconstruction and ${C('with')} support — ideal for immutable data. A <b>record struct</b> (C# 10) gives the same generated members to a struct; it is mutable unless declared ${C('readonly record struct')}. Choose classes for identity and behaviour, records for data, structs for small values where allocation matters.</p>`, followUps: ['When does a struct hurt performance?', 'Are records deeply immutable?'] },
    { level: 'B', q: 'Explain value types vs reference types in terms of memory and copying.', a: `<p>Value types (int, double, structs, enums) store their data directly; a local value-type variable lives in the method's frame (or a register), and a value-type field lives inside its containing object. Copying copies all the bytes. Reference types store a reference (pointer) to a heap object with a header and method-table pointer; copying copies the reference, so two variables can alias one object. Boxing converts a value type to an object by copying it into a new heap object. Consequences: struct mutations through copies do not affect the original; passing large structs by value copies them (use ${C('in')}); reference types add GC work and indirection. "Value types live on the stack" is a simplification — a struct field of a class lives on the heap.</p>`, followUps: ['What is boxing and when does it happen implicitly?', 'What does the in modifier do?'] },
    { level: 'I', q: 'How do you design an immutable type in C#, and what are the pitfalls?', a: `<p>Use ${C('readonly')} fields or get-only/${C('init')} properties, validate in the constructor (or a factory), and expose no mutating methods — return new instances instead (${C('with')} expressions for records). Pitfalls: <b>shallow immutability</b> (a readonly field referencing a mutable List — copy inputs into ${C('ImmutableArray')}/${C('ImmutableList')}); returning internal collections as ${C('IReadOnlyList')} views that the owner still mutates; ${C('with')} bypassing constructor validation unless validation lives in property init accessors; ${C('default(T)')} for structs producing an unvalidated value; serializers and reflection writing init-only properties. Benefits: thread safety without locks, safe dictionary keys, easy snapshots and undo.</p>`, followUps: ['ImmutableArray vs ImmutableList?', 'How do you publish an updated snapshot to many threads?'] },
    { level: 'I', q: 'When would you use a Result type instead of exceptions?', a: `<p>For <b>expected</b> failures that callers should handle: validation, parsing, "not found", business rule violations, especially on hot paths or user input where failures are frequent. Results make the failure explicit in the signature, compose with Map/Bind (and applicative combination to collect all errors), and avoid the cost of throwing (stack-trace capture, unwinding — microseconds each). Use <b>exceptions</b> for programmer errors (null arguments, invalid state), infrastructure failures you cannot handle locally, and constructors/operators where a Result would be awkward. Never convert all exceptions into Results with a catch-all — that hides bugs. The BCL's Try-pattern (${C('TryParse')}, ${C('TryGetValue')}) is the lightweight built-in version.</p>`, followUps: ['How do you combine independent validations?', 'How would you map Results to HTTP responses?'] },
    { level: 'I', q: 'Walk through the full dispose pattern. When do you need a finalizer?', a: `<p>Public non-virtual ${C('Dispose()')} calls ${C('Dispose(true)')} and ${C('GC.SuppressFinalize(this)')}. ${C('protected virtual void Dispose(bool disposing)')} returns if already disposed; if ${C('disposing')} is true it disposes managed IDisposable fields; in both cases it releases unmanaged state; it sets the disposed flag. Derived classes override ${C('Dispose(bool)')} and call ${C('base.Dispose(disposing)')} last. A finalizer ${C('~T() => Dispose(false)')} is needed only if the class <b>directly</b> owns an unmanaged resource (a raw handle or native memory) — and modern code avoids even that by wrapping the handle in a ${C('SafeHandle')}. Finalizers make objects survive an extra GC and run on one thread at unpredictable times. Members should throw ${C('ObjectDisposedException')} after disposal; Dispose must be idempotent and should not throw. For async cleanup, implement ${C('IAsyncDisposable')} and use ${C('await using')}.</p>`, followUps: ['What is SafeHandle?', 'Who disposes services resolved from DI?'] },
    { level: 'A', q: 'What are the most common async/await mistakes you look for in code review?', a: `<p>(1) <b>Sync over async</b>: ${C('.Result')}, ${C('.Wait()')}, ${C('GetAwaiter().GetResult()')} — thread-pool starvation and deadlocks under a synchronization context. (2) <b>async void</b> outside event handlers. (3) <b>Fire-and-forget</b> without observing exceptions; use a background queue or hosted service. (4) <b>Missing cancellation</b> — no ${C('CancellationToken')} parameter or not passing it down. (5) <b>Unbounded concurrency</b> — ${C('Task.WhenAll')} over thousands of HTTP calls; bound with SemaphoreSlim/Parallel.ForEachAsync/Channels. (6) <b>Sequential awaits</b> of independent work. (7) ${C('Task.Run')} wrapping async I/O in ASP.NET ("async over sync" is pointless there). (8) <b>ValueTask misuse</b> — awaiting twice. (9) Swallowing ${C('OperationCanceledException')} as an error or logging it at error level. (10) Forgetting that ${C('await Task.WhenAll')} rethrows only one exception.</p>`, followUps: ['When is ConfigureAwait(false) still useful?', 'How do you detect thread-pool starvation?'] },
    { level: 'A', q: 'How do you get equality and hashing right, and what goes wrong?', a: `<p>Rules: equal objects must have equal hash codes; Equals must be reflexive, symmetric, transitive and consistent; hash only state that never changes while the object is a key; keep ${C('==')}, ${C('Equals')}, ${C('IEquatable<T>')} and ${C('GetHashCode')} in agreement. Common failures: overriding Equals without GetHashCode; hashing mutable properties (items lost in HashSet); asymmetric equality in class hierarchies (fix by comparing ${C('GetType()')} — records do it with ${C('EqualityContract')}); records with List/array members comparing by reference; structs without ${C('IEquatable<T>')} (boxing, poor hashes); culture-sensitive string keys (use ${C('StringComparer.Ordinal(IgnoreCase)')}); floating-point keys and NaN. Use ${C('HashCode.Combine')} for good mixing, records for data types, and pass ${C('IEqualityComparer<T>')} to collections when a different notion of equality is needed.</p>`, followUps: ['Why is string.GetHashCode randomized per process?', 'How would you give a record with an array member value equality?'] },
    { level: 'B', q: 'What does deferred execution mean in LINQ, and what bugs does it cause?', a: `<p>Most LINQ operators (Where, Select, OrderBy, GroupBy…) build a query object; nothing executes until the query is enumerated (foreach, ToList, Count, First…). Each enumeration executes the whole pipeline again. Bugs: <b>multiple enumeration</b> (running an expensive query or database call twice, or getting different results); <b>captured variables</b> changing between definition and execution; side effects in Select running zero or many times; exceptions appearing far from where the query was written; modifying the source collection during enumeration (InvalidOperationException). Materialise once with ToList/ToArray when you need a stable snapshot or several passes. Note that some operators are partially eager (OrderBy buffers everything once enumeration starts).</p>`, followUps: ['How do iterator methods relate to deferred execution?', 'What does CA1851 warn about?'] },
    { level: 'I', q: 'Explain closures in C#. What does the compiler generate?', a: `<p>A lambda or local function that uses variables from the enclosing scope captures the <b>variables</b>, not their values. The compiler hoists captured locals into fields of a generated "display class"; the method and the lambda both access the same instance, so changes are visible both ways and the captured variables live as long as any delegate referencing them. A for-loop variable is a single variable for the whole loop (lambdas see its final value); a foreach variable is fresh per iteration (since C# 5). Costs: one allocation for the closure object plus one per delegate; capturing in hot paths creates garbage — use ${C('static')} lambdas and state-passing overloads. Non-capturing lambdas are cached in static fields and allocate once.</p>`, followUps: ['How do you fix the for-loop capture bug?', 'What does the static modifier on a lambda do?'] },
    { level: 'A', q: 'How does the GC work in .NET, and how do you write GC-friendly code?', a: `<p>The heap is generational: gen0 for new objects (collected often and cheaply), gen1 as a buffer, gen2 for long-lived objects, plus the Large Object Heap (≥ 85,000 bytes, collected with gen2) and the Pinned Object Heap. A collection marks objects reachable from roots (stack slots, statics, handles), compacts survivors (except LOH by default), and promotes them. Cost is proportional to <b>surviving</b> objects, so short-lived garbage is cheap and medium-lived objects that survive into gen2 are expensive. Workstation vs Server GC, background GC for gen2, and DATAS (.NET 8) for dynamic heap counts are configuration choices. GC-friendly code: reduce allocation rate in hot paths (spans, pooling, avoiding boxing/closures/LINQ), avoid large temporary arrays (ArrayPool), do not keep caches of objects that die soon after promotion, avoid finalizers, and fix leaks (static collections, event handlers).</p>`, followUps: ['What is the mid-life crisis?', 'When would you use Server GC?'] },
    { level: 'E', q: 'Design a thread-safe cache for an expensive async lookup. What must you consider?', a: `<p>Correctness first: concurrent callers for the same key should share one load (avoid a <b>stampede</b>) — ${C('ConcurrentDictionary<K, Lazy<Task<V>>>')} or ${C('AsyncLazy')}; faulted loads must be evicted (remove only that exact entry) so failures are not cached forever; cancellation of one caller must not cancel the shared load for others (do not pass a single caller's token into the shared factory; use a timeout owned by the cache). Then lifetime: size bounds (LRU/LFU), expiration (absolute/sliding), refresh-ahead to avoid latency spikes, memory pressure handling. Then observability (hit ratio, load latency) and consistency (invalidation on writes, multi-instance coherence — a distributed cache like Redis plus a local L1). In .NET, ${C('IMemoryCache')} gives eviction but not stampede protection by itself; .NET 9's ${C('HybridCache')} adds it.</p>`, followUps: ['How would you implement sliding expiration?', 'What breaks if two app instances cache the same data?'] },
    { level: 'E', q: 'You are reviewing a pull request that introduces unsafe code and ArrayPool for performance. What do you check?', a: `<p>Justification: a benchmark (BenchmarkDotNet with MemoryDiagnoser) and a production profile showing the code is hot; the gain must be material. Correctness of pooling: every ${C('Rent')} has a ${C('Return')} in a ${C('finally')}, never twice, no use after return, rented arrays may be larger than requested (use the requested length, not ${C('array.Length')}), clear arrays containing sensitive data or references (${C('clearArray: true')}). Unsafe code: bounds are proven, pinned memory is unpinned quickly (or use ${C('fixed')}/Pinned Object Heap), no GC holes (no storing interior pointers), alignment and endianness assumptions documented; prefer ${C('Span<T>')}, ${C('MemoryMarshal')} and vectorized BCL APIs which give most of the speed safely. Tests covering edge sizes, and a fallback path for platforms without the needed hardware intrinsics.</p>`, followUps: ['Why can ArrayPool return a bigger array?', 'When is stackalloc safe?'] },
    { level: 'I', q: 'What are nullable reference types and how do you adopt them in an existing code base?', a: `<p>With ${C('<Nullable>enable</Nullable>')}, reference types are non-nullable by default and ${C('string?')} marks nullable ones. The compiler performs flow analysis and warns on possible null dereferences and on assigning null to non-nullable variables; annotations like ${C('[NotNullWhen(true)]')}, ${C('[MaybeNull]')}, ${C('[MemberNotNull]')} describe contracts the type system cannot express. It is a compile-time feature only — no runtime checks, and ${C('!')} (null-forgiving) silences warnings. Adoption: enable per project or per file (${C('#nullable enable')}), start with leaf libraries, annotate public APIs first, fix warnings rather than suppressing them, treat nullable warnings as errors once clean, and validate external input (JSON, reflection, DI) at the boundaries because the compiler cannot see it.</p>`, followUps: ['What does the null-forgiving operator really do?', 'How do required members interact with nullability?'] },
    { level: 'A', q: 'Explain pattern matching features in modern C# with an example of where they improve design.', a: `<p>C# supports type patterns (${C('o is string s')}), property patterns (${C('order is { Status: Paid, Total: > 100 }')}), relational and logical patterns (${C('x is >= 0 and < 10')}), positional patterns with deconstruction (${C('point is (0, var y)')}), list patterns (C# 11: ${C('arr is [1, .., var last]')}) and switch expressions with exhaustiveness warnings. They shine for closed domains: model outcomes as a sealed record hierarchy (${C('Paid')}, ${C('Declined')}, ${C('NeedsOtp')}) and handle them with one switch expression — adding a case produces warnings where handling is missing. They also replace chains of ${C('if/else')} with type checks and casts. Pitfalls: order matters (first match wins; the compiler reports subsumed cases), ${C('null')} handling (${C('is not null')}, ${C('{ }')}), and over-clever nested patterns that hurt readability.</p>`, followUps: ['How does exhaustiveness checking work without sealed hierarchies in C#?', 'What is a list pattern slice?'] },
    { level: 'E', q: 'How would you explain the trade-offs of C# features to a junior developer who wants to use them everywhere (records, LINQ, async, generics, reflection)?', a: `<p>Each feature has a sweet spot and a cost. <b>Records</b> are perfect for immutable data, but they are shallowly immutable, compare collections by reference and are poor for entities with identity. <b>LINQ</b> makes intent clear for queries but allocates and is deferred — fine almost everywhere except proven hot paths. <b>async</b> is for I/O-bound work; it does not make CPU work faster and has overhead per call — never block on it. <b>Generics</b> give type safety and performance (no boxing) but over-generic APIs are hard to read. <b>Reflection</b> lets frameworks work on unknown types but is slow and breaks trimming/AOT — prefer source generators. The guiding rules: write the clearest code first, measure before optimising, prefer the simplest feature that expresses the design, and understand what the compiler generates for the features you use — that is what this track has been about.</p>`, followUps: ['Which C# feature do you think is most misused, and why?', 'How do you decide when code is "hot enough" to optimise?'] }
  );

  /* Spread correct answers across positions (authored with the correct option first). */
  function rotate(m, k) {
    var n = m.options.length; k = k % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var mcqIdx = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); }); });
  practice.forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); });

  registerModule({
    id: 'csharp13',
    title: 'Expert Idioms + Question Bank',
    lang: 'csharp',
    intro: `<p>This is the finishing school of the C# track. The first half covers the <b>idioms</b> that separate senior C# code from code that merely compiles: <b>immutability</b> (records, init, immutable and frozen collections, persistent data structures), <b>Result types</b> instead of exceptions for expected failures, the <b>dispose patterns</b> (IDisposable, IAsyncDisposable, SafeHandle, ownership), <b>async best practices</b> (no async void, cancellation, ConfigureAwait, bounded concurrency, ValueTask rules), <b>equality and hashing pitfalls</b>, and the conventions of a well-designed .NET API.</p>
<p>The second half is a <b>question bank</b>: two topics of output-prediction puzzles organised by the hidden rule behind each trick (evaluation order, overload resolution, closures, integer arithmetic, static initialisation order, exception filters and finally, deferred LINQ, iterators, struct copies), predict-the-output practice problems verified on .NET 8, a quiz and a large interview bank covering the whole track.</p>`,
    goals: [
      'Design immutable types and collections (records, init, with, ImmutableArray, FrozenDictionary, persistent structures) and explain their trade-offs',
      'Model expected failures with a Result type, compose it with Map/Bind, and decide when exceptions are still the right tool',
      'Implement IDisposable and IAsyncDisposable correctly, including the full dispose pattern, SafeHandle and ownership rules',
      'Apply async best practices: cancellation, bounded concurrency, exception aggregation, ConfigureAwait, ValueTask and no async void',
      'Avoid equality and hashing pitfalls: mutable keys, records with collections, inheritance, culture-sensitive comparisons',
      'Predict the output of tricky C# snippets by applying the rule behind them, and answer senior-level C# interview questions'
    ],
    prereqs: `C# 10 (Concurrency &amp; Threading) and C# 12 (CLR Internals &amp; Performance), and through them the whole C# track — especially C# 3 (Classes, Structs &amp; Records), C# 7 (Exceptions, Nullability &amp; Pattern Matching) and C# 9 (Async/Await &amp; Tasks). A .NET 8 SDK for running the puzzles.`,
    hours: 20,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
