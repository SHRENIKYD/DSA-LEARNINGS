(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C# code is written with String.raw so "\n" stays a C# escape

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function splitOps(input, def) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some steps separated by ";" — e.g. ' + def);
    var ops = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ops.length > 24) throw new Error('Use at most 24 steps');
    return ops;
  }
  /* A two-column memory picture: stack boxes on the left, heap boxes on the right. */
  function memGraph(label, stackBoxes, heapBoxes, edges, hl, tags) {
    var nodes = [], rows = Math.max(stackBoxes.length, heapBoxes.length, 4);
    var height = Math.max(50, rows * 11 + 14);
    nodes.push({ id: '__S', label: 'STACK (method frame)', x: 20, y: 4, shape: 'box', w: 30 });
    nodes.push({ id: '__H', label: 'MANAGED HEAP', x: 76, y: 4, shape: 'box', w: 30 });
    stackBoxes.forEach(function (b, i) { nodes.push({ id: b.id, label: b.label, x: 20, y: 16 + i * 11, shape: 'box', w: 34 }); });
    heapBoxes.forEach(function (b, i) { nodes.push({ id: b.id, label: b.label, x: 76, y: 16 + i * 11, shape: 'box', w: 34 }); });
    return { type: 'graph', label: label, directed: true, height: height, nodes: nodes, edges: edges || [], hl: hl || {}, tags: tags || {} };
  }
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Stack vs heap, value vs reference types in memory
     ====================================================================== */
  function memSim(input) {
    var DEF = 'int a = 5; Point p = a; var b = a; var q = p; Person x; var y = x; y.Age = 40; q.X = 9';
    var ops = splitOps(input, DEF);
    var frames = [], vars = [], objs = [], seq = 0;
    function find(n) { for (var i = 0; i < vars.length; i++) if (vars[i].name === n) return vars[i]; return null; }
    function draw(narr, hlId) {
      var sb = vars.map(function (v) { return { id: 'v_' + v.name, label: v.kind === 'ref' ? v.name + ' : ref →' : v.name + ' = ' + v.val }; });
      var hb = objs.map(function (o) { return { id: o.id, label: 'Person#' + o.n + ' { Age = ' + o.age + ' }' }; });
      var edges = vars.filter(function (v) { return v.kind === 'ref'; }).map(function (v) { return ['v_' + v.name, v.obj]; });
      var hl = {}; if (hlId) hl[hlId] = 'cur';
      frames.push({ narr: narr, parts: [memGraph('Where each variable lives', sb, hb, edges, hl), note('Value types (int, struct Point) hold their data <b>inline</b> in the variable. Reference types (class Person) hold a <b>reference</b>; the object lives on the heap.')] });
    }
    draw('An empty method frame. Type steps like <code>int a = 5</code>, <code>Point p = a</code>, <code>Person x</code>, <code>var y = x</code>, <code>y.Age = 40</code>, <code>q.X = 9</code>.');
    ops.forEach(function (op) {
      var m;
      if ((m = op.match(/^int\s+(\w+)\s*=\s*(-?\d+)$/))) { vars.push({ name: m[1], kind: 'val', val: m[2] }); draw('<code>' + H.esc(op) + '</code>: 4 bytes in the frame hold the value itself.', 'v_' + m[1]); }
      else if ((m = op.match(/^Point\s+(\w+)\s*=\s*(\w+)$/))) { var src = find(m[2]); var x = src && src.kind === 'val' ? src.val.replace(/[^\d-].*$/, '') : '0'; vars.push({ name: m[1], kind: 'val', val: '{ X = ' + x + ' }' }); draw('<code>Point ' + m[1] + '</code> is a <b>struct</b>: its fields live directly in the frame — no heap object.', 'v_' + m[1]); }
      else if ((m = op.match(/^Person\s+(\w+)$/))) { seq++; var o = { id: 'o' + seq, n: seq, age: 0 }; objs.push(o); vars.push({ name: m[1], kind: 'ref', obj: o.id }); draw('<code>new Person()</code> allocates on the heap; <code>' + m[1] + '</code> holds an 8-byte reference to it.', o.id); }
      else if ((m = op.match(/^var\s+(\w+)\s*=\s*(\w+)$/))) {
        var s = find(m[2]); if (!s) throw new Error('Unknown variable "' + m[2] + '"');
        if (s.kind === 'ref') { vars.push({ name: m[1], kind: 'ref', obj: s.obj }); draw('Copying a reference copies only the <b>arrow</b>: ' + m[1] + ' and ' + m[2] + ' now point to the <b>same</b> object.', s.obj); }
        else { vars.push({ name: m[1], kind: 'val', val: s.val }); draw('Copying a value type copies <b>all its bytes</b>: ' + m[1] + ' is an independent copy.', 'v_' + m[1]); }
      }
      else if ((m = op.match(/^(\w+)\.Age\s*=\s*(-?\d+)$/))) { var r = find(m[1]); if (!r || r.kind !== 'ref') throw new Error(m[1] + ' must be a Person variable'); objs.forEach(function (o) { if (o.id === r.obj) o.age = m[2]; }); draw('Writing through ' + m[1] + ' changes the heap object — every variable pointing to it sees Age = ' + m[2] + '.', r.obj); }
      else if ((m = op.match(/^(\w+)\.X\s*=\s*(-?\d+)$/))) { var v = find(m[1]); if (!v || v.kind !== 'val' || v.val.indexOf('X') < 0) throw new Error(m[1] + ' must be a Point variable'); v.val = '{ X = ' + m[2] + ' }'; draw('Only <b>' + m[1] + '</b> changes: the struct copy it was made from is untouched.', 'v_' + m[1]); }
      else throw new Error('Did not understand "' + op + '"');
    });
    draw('When the method returns, the whole frame is popped instantly (no GC work). Heap objects stay until the GC finds them unreachable.');
    return frames;
  }
  topics.push({
    title: 'Stack vs Heap: Value and Reference Types in Memory',
    analogy: `<p>Your desk drawer (the <b>stack</b>) is small, private and tidied automatically when you leave for the day — whatever you put there for this task disappears with it. The shared warehouse (the <b>heap</b>) is huge; you store big or long-lived things there and keep only a <b>claim ticket</b> (a reference) in your drawer. A janitor (the GC) periodically throws away warehouse items nobody holds a ticket for. A <b>value type</b> is a thing small enough to keep in the drawer itself; a <b>reference type</b> always lives in the warehouse, and you only ever handle its ticket.</p>`,
    explain: `<p>.NET has two kinds of types, and the difference is <b>semantics</b> first and memory layout second.</p>
${H.table(['', 'Value types', 'Reference types'], [
      ['Examples', C('int, double, bool, char, DateTime, decimal, enums, struct, record struct, Span<T>'), C('class, record (class), string, arrays, delegates, object')],
      ['Variable holds', 'the data itself', 'a reference (pointer) to an object'],
      ['Assignment copies', 'all the bytes', 'only the reference'],
      ['Can be null', 'no (use T?)', 'yes'],
      ['Lives', 'wherever its container lives', 'always on the managed heap']
    ])}
<h4>"Value types live on the stack" is only half true</h4>
<p>A value type lives <b>wherever its container is</b>. A local ${C('int')} lives in the method's stack frame (or a CPU register). But an ${C('int')} field of a class lives <b>inside that object on the heap</b>, and the elements of an ${C('int[]')} live inside the array object on the heap. Locals captured by a lambda or used across an ${C('await')} are hoisted into a heap object too.</p>
${P(`
struct Point { public int X, Y; }       // 8 bytes, inline
class Person { public int Age; }        // object header + method table pointer + fields, on the heap

Point p1 = new Point { X = 1 };
Point p2 = p1;          // copy: p2.X = 1, independent
p2.X = 5;               // p1.X is still 1

Person a = new Person { Age = 30 };
Person b = a;           // same object
b.Age = 40;             // a.Age is 40 too`)}
<h4>Object layout on 64-bit .NET</h4>
<p>Every heap object starts with an 8-byte <b>object header</b> (sync block index, hash code / lock bits) and an 8-byte <b>method table pointer</b> (its type). An empty class instance is therefore 24 bytes minimum. An array adds a length field. A ${C('struct')} has none of this overhead when stored inline.</p>
<h4>Choosing struct vs class</h4>
<ul><li>Struct: small (≤ 16 bytes is a common guideline), logically a single value (a coordinate, money amount, key), immutable (${C('readonly struct')}), short-lived or stored in large arrays.</li>
<li>Class: identity matters, large, mutable shared state, polymorphism needed.</li>
<li>Big structs are copied on every assignment and parameter pass — use ${C('in')} / ${C('ref readonly')} parameters or make it a class.</li></ul>`,
    clues: ['"Why did my change not stick?" → you modified a copy of a struct', 'Millions of small items in an array → struct avoids per-object headers and GC work', 'Shared mutable state, identity, inheritance → class', 'Large struct passed often → in parameter or make it a class'],
    code: [{ lang: 'csharp', run: true, title: 'Copy semantics side by side (runnable)', code: R`
var sp1 = new PointS { X = 1 };
var sp2 = sp1;
sp2.X = 5;
Console.WriteLine($"struct: p1.X={sp1.X}, p2.X={sp2.X}");

var cp1 = new PointC { X = 1 };
var cp2 = cp1;
cp2.X = 5;
Console.WriteLine($"class:  p1.X={cp1.X}, p2.X={cp2.X}");

var list = new List<PointS> { new() { X = 1 } };
var copy = list[0];      // indexer returns a COPY
copy.X = 100;
Console.WriteLine($"list[0].X={list[0].X}");   // still 1
list[0] = copy;          // write the copy back
Console.WriteLine($"after write-back {list[0].X}");

struct PointS { public int X; }
class PointC { public int X; }` }],
    codeTitle: ['struct vs class assignment'],
    viz: { title: 'Draw the stack and the heap', input: 'int a = 5; Point p = a; var b = a; var q = p; Person x; var y = x; y.Age = 40; q.X = 9', inputLabel: 'steps separated by ";"', gen: memSim },
    examples: [
      { title: 'Value type fields live inside the heap object', html: `<p>The ${C('Position')} struct below is stored inside each ${C('Ship')} object on the heap, not on any stack. "Value type = stack" is a simplification.</p>`, code: R`
var ship = new Ship();
ship.Pos.X = 3;          // modifies the struct stored inside the heap object
Console.WriteLine(ship.Pos.X);

struct Position { public int X, Y; }
class Ship { public Position Pos; }` },
      { title: 'Arrays of structs are contiguous', html: `<p>${C('new Point[1000]')} is one heap object holding 1000 points back to back (8 KB). ${C('new PointClass[1000]')} is one array of 1000 references plus up to 1000 separate objects — more memory, more GC work, worse cache locality.</p>`, code: R`
long before = GC.GetAllocatedBytesForCurrentThread();
var structs = new P[1000];
long mid = GC.GetAllocatedBytesForCurrentThread();
var classes = new Q[1000];
for (int i = 0; i < classes.Length; i++) classes[i] = new Q();
long after = GC.GetAllocatedBytesForCurrentThread();
Console.WriteLine($"structs ~{mid - before} bytes, classes ~{after - mid} bytes");

struct P { public int X, Y; }
class Q { public int X, Y; }` },
      { title: 'readonly struct and in parameters', html: `<p>A ${C('readonly struct')} promises not to change, so passing it with ${C('in')} avoids a copy safely and the compiler never makes defensive copies.</p>`, code: R`
var m = new Money(12.5m, "EUR");
Console.WriteLine(Describe(in m));
static string Describe(in Money x) => $"{x.Amount} {x.Currency}";

readonly struct Money(decimal amount, string currency)
{
    public decimal Amount { get; } = amount;
    public string Currency { get; } = currency;
}` }
    ],
    deepDive: `<p><b>Escape analysis.</b> .NET 9 started stack-allocating some objects that provably do not escape a method; .NET 8 does not, so in .NET 8 every ${C('new')} of a class is a heap allocation.</p>
<p><b>The stack itself.</b> Each thread has its own stack (1 MB by default for the main thread on Windows, 8 MB on Linux; thread-pool threads typically 1.5 MB). Frames hold locals, arguments, return addresses and spilled registers. Allocation is a pointer bump, deallocation is free at return — which is why stack data cannot outlive its method, and why ${C('ref')} locals and ${C('Span')} have escape rules (topic 6).</p>
<p><b>Heap allocation is also cheap.</b> Gen0 allocation is a pointer bump inside a thread-local allocation context (~a few ns). The real cost is later: GC work proportional to <i>survivors</i>, and cache misses from pointer chasing.</p>
<p><b>Struct pitfalls.</b> Mutable structs in collections (${C('list[0].X = 1')} is a compile error, CS1612), in readonly fields (defensive copies) and in ${C('foreach')} (iteration variable is read-only). Default constructors: ${C('default(S)')} always zeroes, even if you declare a parameterless constructor (C# 10+).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants often recite "value types go on the stack" — a half-truth that leads to wrong performance reasoning. <b>Use AI as a partner:</b> <code>For each type in this file, should it be a struct or a class? Justify with size, mutability and usage</code>. <b>Where AI goes wrong:</b> suggesting large mutable structs "for speed", missing that a struct is boxed when cast to an interface, forgetting that lambdas capture locals onto the heap. <b>What you must still own:</b> measuring (allocation profiler, BenchmarkDotNet) before changing type kinds, and understanding copy semantics bugs.</p>`,
    problems: [{
      title: 'Predict the Copies', level: 'Easy', tags: ['value types', 'reference types'],
      statement: `<p>Given an int v, create a struct ${C('S { X = v }')} and assign it to a second variable, increment the second's X; do the same with a class ${C('K')}; and with an ${C('int[] { v }')} array whose second variable increments element 0. Return ${C('[s1.X, k1.X, arr1[0]]')} — the values seen through the <b>first</b> variables.</p>`,
      constraints: `−10<sup>9</sup> ≤ v ≤ 10<sup>9</sup>`,
      example: `<p>v = 5 → ${C('[5, 6, 6]')}: the struct was copied, the class object and the array were shared.</p>`,
      brute: { why: `<p>There is nothing to optimise — the exercise is to predict, then confirm by running the code. Many candidates answer [6, 6, 6] or [5, 6, 5].</p>`, code: R`
static int[] Guess(int v) => new[] { v + 1, v + 1, v + 1 }; // the common wrong mental model` },
      mcq: { q: 'Which statement explains arr1[0] == v + 1?', options: ['Arrays are reference types even when their elements are value types', 'int is a reference type inside arrays', 'Arrays are copied lazily', 'The compiler optimises the copy away'], answer: 0, explain: 'An int[] variable holds a reference to one array object; both variables refer to it.' },
      hints: [`<p>Declare ${C('struct S { public int X; }')} and ${C('class K { public int X; }')} inside the Solution class (nested types).</p>`, `<p>${C('var s2 = s1; s2.X++;')} — then read ${C('s1.X')} and see whether it moved.</p>`, `<p>${C('var a2 = a1; a2[0]++;')} modifies the shared array.</p>`],
      solution: {
        approach: `<p>Assignment of a struct copies its fields; assignment of a class or array copies the reference.</p>`,
        code: R`
public class Solution
{
    private struct S { public int X; }
    private sealed class K { public int X; }

    public int[] CopySemantics(int v)
    {
        var s1 = new S { X = v };
        var s2 = s1;
        s2.X++;

        var k1 = new K { X = v };
        var k2 = k1;
        k2.X++;

        int[] a1 = { v };
        var a2 = a1;
        a2[0]++;

        return new[] { s1.X, k1.X, a1[0] };
    }
}`,
        dry: { head: ['step', 's1.X', 'k1.X', 'a1[0]'], rows: [['create (v = 5)', '5', '5', '5'], ['second var ++', '5 (copy changed)', '6 (shared)', '6 (shared)']] },
        complexity: `<p>O(1) time and space.</p>`,
        followUps: ['What if S were a record struct? A record class?', 'What does passing S with ref change?']
      },
      tests: { sig: 'int -> int[]', fn: 'copySemantics', cases: [
        [[5], [5, 6, 6]], [[0], [0, 1, 1]], [[-1], [-1, 0, 0]], [[1000000000], [1000000000, 1000000001, 1000000001]], [[-1000000000], [-1000000000, -999999999, -999999999]], [[42], [42, 43, 43]]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Boxing and unboxing
     ====================================================================== */
  function boxSim(input) {
    var n = parseInt(String(input === undefined ? '4' : input).trim(), 10);
    if (isNaN(n) || n < 1 || n > 8) throw new Error('Type how many numbers to add (1 to 8)');
    var code = ['var list = new ArrayList();      // stores object', 'for (int i = 0; i < n; i++)', '    list.Add(i);                  // box: int -> object', 'int sum = 0;', 'foreach (object o in list)', '    sum += (int)o;                // unbox: object -> int'].join('\n');
    var frames = [], boxes = [];
    frames.push({ narr: 'A non-generic <code>ArrayList</code> stores <code>object</code>. Every int added must be <b>boxed</b>.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 1: 'cur' } }, { type: 'array', label: 'heap boxes allocated', values: ['(none)'] }] });
    for (var i = 0; i < n; i++) {
      boxes.push('box(' + i + ')');
      var hl = {}; hl[i] = 'cur';
      frames.push({ narr: '<code>list.Add(' + i + ')</code>: allocate a 24-byte heap object (header + method table + 4-byte int + padding), copy the value in, store the reference.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'cur' } }, { type: 'array', label: 'heap boxes allocated', values: boxes.slice(), hl: hl }, { type: 'vars', vals: { allocations: boxes.length, bytes: boxes.length * 24 } }] });
    }
    frames.push({ narr: '<b>Unboxing</b> <code>(int)o</code> checks the box really holds an int (else InvalidCastException) and copies the value out. Cheap, but the boxes are now garbage for the GC.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 6: 'cur' } }, { type: 'array', label: 'garbage after the loop', values: boxes.slice(), hl: (function () { var h = {}; for (var k = 0; k < boxes.length; k++) h[k] = 'bad'; return h; })() }] });
    frames.push({ narr: 'With <code>List&lt;int&gt;</code> the ints are stored inline in an int[] — <b>zero</b> boxes. That is the main reason generics replaced ArrayList.', parts: [{ type: 'code', lang: 'csharp', code: 'var list = new List<int>();\nfor (int i = 0; i < n; i++) list.Add(i);   // no boxing', hl: { 2: 'ok' } }, { type: 'vars', vals: { allocations: '0 per item', bytes: '4 per item (inside the backing array)' }, hl: { allocations: 'ok' } }] });
    return frames;
  }
  topics.push({
    title: 'Boxing & Unboxing: The Hidden Allocations',
    analogy: `<p>You want to post a single coin through a system that only accepts <b>parcels</b>. So you put the coin in a box, label it "contains an int", and send it — that is <b>boxing</b>. The receiver opens the box, checks the label and takes the coin out — <b>unboxing</b>. Each box costs cardboard (a heap allocation) and ends up in the recycling (GC). Doing it once is fine; doing it a million times in a loop is a mountain of cardboard.</p>`,
    explain: `<p><b>Boxing</b> converts a value type to ${C('object')} or to an interface it implements: the runtime allocates a heap object, copies the value into it, and returns a reference. <b>Unboxing</b> is the explicit cast back: it checks the type exactly and copies the value out.</p>
${P(`
int n = 42;
object o = n;          // box: new heap object containing 42
int m = (int)o;        // unbox: type check + copy
long l = (long)o;      // InvalidCastException! a boxed int unboxes only to int (or int?)
long ok = (int)o;      // unbox to int, then widen to long`)}
<h4>Where boxing hides</h4>
${H.table(['Code', 'Why it boxes', 'Fix'], [
      [C('ArrayList, Hashtable'), 'store object', C('List<T>, Dictionary<K,V>')],
      [C('IComparable c = 5;'), 'struct converted to an interface', 'generic method with ' + C('where T : IComparable<T>')],
      [C('string.Format("{0}", i)') + ' (older APIs)', 'params object[]', 'interpolated strings ($"...") use handlers that avoid boxing'],
      [C('object.Equals(a, b)') + ' with structs', 'parameters are object', C('a.Equals(b)') + ' via ' + C('IEquatable<T>')],
      [C('enumValue.HasFlag(x)') + ' (old runtimes)', 'Enum parameter', '.NET Core JIT now optimises it'],
      ['struct without ' + C('Equals/GetHashCode') + ' override as dictionary key', 'ValueType.Equals uses reflection and may box', 'implement ' + C('IEquatable<T>') + ' or use a record struct'],
      ['a lambda capturing a struct', 'the closure class holds it on the heap', 'static lambdas, pass state explicitly']
    ])}
<h4>Why boxed values surprise you</h4>
${P(`
object a = 5, b = 5;
Console.WriteLine(a == b);         // False: two different boxes, reference comparison
Console.WriteLine(a.Equals(b));    // True: Int32.Equals compares values`)}
<p>Modifying a boxed struct through an interface changes the <b>box</b>, not the original variable — another classic bug.</p>
<h4>Generics remove boxing</h4>
<p>For value type arguments the JIT generates <b>specialised native code</b> per type (${C('List<int>')} and ${C('List<double>')} get separate code), so ${C('T')} values are handled directly. Constrained calls (${C('T : IComparable<T>')}) call the struct's method without boxing.</p>`,
    clues: ['A struct passed where object or an interface is expected → boxing', 'Non-generic collections (ArrayList, Hashtable) in old code → boxing per element', '== on two object variables holding numbers → reference comparison of boxes', 'Profiler shows many System.Int32 objects → find the box'],
    code: [{ lang: 'csharp', run: true, title: 'Measure boxing allocations (runnable)', code: R`
using System.Collections;

const int N = 100_000;

long before = GC.GetAllocatedBytesForCurrentThread();
var boxed = new ArrayList(N);
for (int i = 0; i < N; i++) boxed.Add(i);
long mid = GC.GetAllocatedBytesForCurrentThread();
var generic = new List<int>(N);
for (int i = 0; i < N; i++) generic.Add(i);
long after = GC.GetAllocatedBytesForCurrentThread();

Console.WriteLine($"ArrayList: {(mid - before) / 1024} KB, List<int>: {(after - mid) / 1024} KB");

object a = 7, b = 7;
Console.WriteLine($"a == b: {a == b}, a.Equals(b): {a.Equals(b)}");

IIncrement viaInterface = new Counter();   // boxed once
viaInterface.Increment();
var c = new Counter();
IIncrement box = c;                        // box holds a COPY of c
box.Increment();
Console.WriteLine($"c.Value = {c.Value}, box value = {((Counter)box).Value}");

interface IIncrement { void Increment(); }
struct Counter : IIncrement
{
    public int Value;
    public void Increment() => Value++;
}` }],
    codeTitle: ['ArrayList vs List<int>, boxed equality, mutating a box'],
    viz: { title: 'Boxing in a loop', input: '4', inputLabel: 'how many ints to add to an ArrayList (1-8)', gen: boxSim },
    examples: [
      { title: 'Unboxing must use the exact type', html: `<p>A boxed ${C('int')} can only be unboxed to ${C('int')} (or ${C('int?')}). Converting to ${C('long')} needs two steps. ${C('Convert.ToInt64(o)')} also works because it inspects the boxed type.</p>`, code: R`
object o = 42;
try { long bad = (long)o; } catch (InvalidCastException) { Console.WriteLine("cannot unbox int as long"); }
long good = (int)o;
Console.WriteLine(good + Convert.ToInt64(o));` },
      { title: 'Generic constraint avoids boxing', html: `<p>${C('Max<T>(T a, T b) where T : IComparable<T>')} calls ${C('CompareTo')} directly on the struct; the non-generic ${C('IComparable')} version boxes both arguments.</p>`, code: R`
Console.WriteLine(Max(3, 9));
Console.WriteLine(MaxBoxing(3, 9));

static T Max<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) >= 0 ? a : b;
static object MaxBoxing(IComparable a, IComparable b) => a.CompareTo(b) >= 0 ? a : b;` },
      { title: 'Struct keys need IEquatable', html: `<p>Without ${C('IEquatable<T>')}, a dictionary falls back to ${C('ValueType.Equals(object)')} (boxing, sometimes reflection). A ${C('record struct')} generates efficient equality for you.</p>`, code: R`
var d = new Dictionary<Key, string> { [new Key(1, 2)] = "a" };
Console.WriteLine(d[new Key(1, 2)]);

readonly record struct Key(int A, int B);` }
    ],
    deepDive: `<p><b>Box layout.</b> A boxed int is a normal object: header (8) + method table pointer (8) + value (4) + padding = 24 bytes on 64-bit. The method table is the same as the unboxed type's, which is how unboxing checks the type in one comparison.</p>
<p><b>Nullable boxing.</b> Boxing ${C('int?')} gives null or a boxed ${C('int')}; unboxing a boxed int to ${C('int?')} is allowed.</p>
<p><b>Interpolated string handlers (C# 10).</b> ${C('$"{x}"')} compiles to ${C('DefaultInterpolatedStringHandler.AppendFormatted<T>(x)')}, a generic method — no boxing for value types, and with ${C('ISpanFormattable')} not even a temporary string.</p>
<p><b>Finding boxing.</b> Look for ${C('box')} instructions in IL (ILSpy / SharpLab), use the "Heap Allocations Viewer" analyzers, or the allocation tab of a profiler (dotMemory, PerfView, Visual Studio). ${C('GC.GetAllocatedBytesForCurrentThread()')} is a quick test probe.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes modern generic code by default, so obvious ArrayList boxing is rare; subtle boxing (struct to interface, ${C('object')} parameters in logging APIs) remains. <b>Use AI as a partner:</b> <code>Find every boxing conversion in this hot loop and explain each</code>. <b>Where AI goes wrong:</b> claiming string interpolation always boxes (not since C# 10), recommending struct keys without IEquatable, comparing boxed values with ==. <b>What you must still own:</b> knowing which paths are hot enough for boxing to matter, and confirming with a profiler.</p>`
  });

  /* ======================================================================
     TOPIC 3 — The generational GC and the LOH
     ====================================================================== */
  function gcSim(input) {
    var DEF = 'alloc a; alloc b; alloc c; drop a; gc0; alloc d; drop b; gc0; gc1; alloc big LOH; drop c; gc2';
    var ops = splitOps(input, DEF);
    var objs = [], frames = [], freed = [];
    function genList(g) { return objs.filter(function (o) { return o.gen === g; }).map(function (o) { return o.name + (o.live ? '' : ' ✗'); }); }
    function draw(narr, hlName) {
      var mk = function (g, label) { var items = genList(g); var hl = {}; items.forEach(function (it, i) { if (it.indexOf('✗') >= 0) hl[i] = 'bad'; else if (it === hlName) hl[i] = 'cur'; }); return { type: 'array', label: label, values: items.length ? items : ['(empty)'], hl: hl }; };
      frames.push({ narr: narr, parts: [mk(0, 'Gen 0 (new objects, collected often)'), mk(1, 'Gen 1 (buffer)'), mk(2, 'Gen 2 (long-lived)'), mk(3, 'LOH (≥ 85,000 bytes, collected with gen 2)'), { type: 'vars', vals: { 'freed so far': freed.join(', ') || '—' } }] });
    }
    draw('The managed heap is split into generations. ✗ marks an object no longer reachable from any root (locals, statics, GC handles).');
    ops.forEach(function (op) {
      var m;
      if ((m = op.match(/^alloc\s+(\w+)(\s+LOH)?$/i))) {
        if (objs.some(function (o) { return o.name === m[1]; })) throw new Error('"' + m[1] + '" already exists');
        objs.push({ name: m[1], gen: m[2] ? 3 : 0, live: true });
        draw(m[2] ? '<b>' + m[1] + '</b> is large (≥ 85,000 bytes) → allocated directly on the <b>Large Object Heap</b>, logically part of gen 2.' : '<b>new</b> ' + m[1] + ': a pointer bump in gen 0.', m[1]);
      } else if ((m = op.match(/^drop\s+(\w+)$/i))) {
        var o = objs.filter(function (x) { return x.name === m[1]; })[0];
        if (!o) throw new Error('No object "' + m[1] + '"');
        o.live = false; draw('The last reference to <b>' + m[1] + '</b> goes away. Nothing happens yet — memory is only reclaimed by a collection of its generation.');
      } else if ((m = op.match(/^gc([012])$/i))) {
        var g = +m[1], dead = [], promoted = [];
        objs = objs.filter(function (x) {
          var inScope = x.gen <= g || (g === 2 && x.gen === 3);
          if (!inScope) return true;
          if (!x.live) { dead.push(x.name); freed.push(x.name); return false; }
          if (x.gen < 2) { x.gen++; promoted.push(x.name); }
          return true;
        });
        draw('<b>Gen ' + g + ' collection</b> (collects gens 0..' + g + (g === 2 ? ' and the LOH' : '') + '): mark reachable objects, free the rest' + (dead.length ? ' (' + dead.join(', ') + ')' : '') + ', compact, and <b>promote</b> survivors' + (promoted.length ? ' (' + promoted.join(', ') + ')' : '') + ' one generation up.');
      } else throw new Error('Steps: alloc x, alloc x LOH, drop x, gc0, gc1, gc2 (got "' + op + '")');
    });
    return frames;
  }
  topics.push({
    title: 'The Generational GC, Gen 0/1/2 & the Large Object Heap',
    analogy: `<p>Think of an <b>email inbox</b>. Most messages are junk you delete within minutes; a few you keep for a week; a handful (contracts, tax forms) for years. A smart assistant checks the <b>newest</b> pile every hour (cheap — it is small and mostly junk), the "this week" folder every day, and the archive only once a month. That is the <b>generational hypothesis</b>: most objects die young, so the GC collects young objects often and old ones rarely.</p>`,
    explain: `<p>The .NET GC is a <b>tracing, generational, compacting</b> collector. It finds live objects by following references from <b>roots</b> (locals and registers of running methods, static fields, GC handles, the finalization queue) and frees everything else.</p>
<h4>Generations</h4>
${H.table(['Generation', 'Holds', 'Collected'], [
      ['Gen 0', 'newly allocated small objects', 'very often (when its budget, a few MB, fills)'],
      ['Gen 1', 'survivors of one gen0 GC; a buffer between young and old', 'with gen0 when needed'],
      ['Gen 2', 'long-lived objects (caches, singletons, statics)', 'rarely; a "full" GC'],
      ['LOH', 'objects ≥ 85,000 bytes (big arrays, huge strings)', 'only with gen 2; not compacted by default'],
      ['POH (.NET 5+)', 'pinned objects allocated with GC.AllocateArray(pinned: true)', 'with gen 2']
    ])}
<p>A gen N collection collects gens 0..N. Survivors are <b>promoted</b> to the next generation and compacted (moved together), which keeps allocation a simple pointer bump. To find gen0 objects referenced only from old objects without scanning gen2, the runtime uses a <b>card table</b> updated by a write barrier on every reference store.</p>
<h4>Costs</h4>
<ul><li>Gen0/1 collections are proportional to the number of <b>surviving</b> objects — garbage is free.</li>
<li>Gen2 collections touch the whole heap; <b>background GC</b> does most of the marking concurrently with your threads, but there are still short pauses.</li>
<li>The worst pattern is <b>mid-life crisis</b>: objects that live just long enough to be promoted to gen2 and then die (per-request caches held too long), causing expensive full GCs.</li>
<li>The LOH is not compacted by default, so allocating and freeing large arrays of varying sizes fragments it. Pool big buffers (topic 7).</li></ul>
<h4>Workstation vs server GC</h4>
<p><b>Workstation</b> (default for console/desktop) uses one heap and favours low latency. <b>Server GC</b> (default in ASP.NET Core) uses a heap and a GC thread per core, higher throughput, more memory. ${C('<ServerGarbageCollector>')} and ${C('<ConcurrentGarbageCollection>')} in the project file switch them. ${C('GCSettings.LatencyMode')} can request ${C('SustainedLowLatency')} during critical periods.</p>
<h4>Do not call GC.Collect()</h4>
<p>Forcing collections promotes live objects early and usually hurts. Legitimate uses are rare (benchmarks, after unloading a huge one-off data set).</p>`,
    clues: ['High "% time in GC" or many gen2 collections → find objects surviving too long', 'Large arrays (≥ 85 KB) allocated per request → LOH churn, use ArrayPool', 'Memory keeps growing → a root (static list, event subscription, cache) holds objects', 'Throughput server app → server GC; interactive app → workstation + concurrent'],
    code: [{ lang: 'csharp', run: true, title: 'Watching generations (runnable)', code: R`
var young = new object();
Console.WriteLine($"new object: gen {GC.GetGeneration(young)}");
GC.Collect(0);
Console.WriteLine($"after one gen0 GC: gen {GC.GetGeneration(young)}");
GC.Collect(1);
Console.WriteLine($"after a gen1 GC: gen {GC.GetGeneration(young)}");

var big = new byte[100_000];
Console.WriteLine($"100,000-byte array starts in gen {GC.GetGeneration(big)} (LOH)");

var small = new byte[80_000];
Console.WriteLine($"80,000-byte array starts in gen {GC.GetGeneration(small)}");

Console.WriteLine($"collections so far: gen0={GC.CollectionCount(0)} gen1={GC.CollectionCount(1)} gen2={GC.CollectionCount(2)}");
GC.KeepAlive(young);` }],
    codeTitle: ['GC.GetGeneration and promotion'],
    viz: { title: 'Simulate allocations, drops and collections', input: 'alloc a; alloc b; alloc c; drop a; gc0; alloc d; drop b; gc0; gc1; alloc big LOH; drop c; gc2', inputLabel: 'steps: alloc x | alloc x LOH | drop x | gc0 | gc1 | gc2', gen: gcSim },
    examples: [
      { title: 'An event subscription is a root', html: `<p>A long-lived publisher's event holds a reference to every subscriber's handler target. Forgetting ${C('-=')} keeps subscribers alive forever — the most common managed "memory leak".</p>`, code: R`
var publisher = new Publisher();
for (int i = 0; i < 3; i++)
{
    var sub = new Subscriber();
    publisher.Changed += sub.OnChanged;   // publisher now references sub
}
Console.WriteLine($"subscribers kept alive: {publisher.Count}");

class Publisher
{
    public event Action? Changed;
    public int Count => Changed?.GetInvocationList().Length ?? 0;
}
class Subscriber { public void OnChanged() { } }` },
      { title: 'WeakReference does not keep objects alive', html: `<p>A ${C('WeakReference<T>')} lets you observe an object without rooting it — useful for caches that should give memory back under pressure.</p>`, code: R`
var weak = MakeWeak();
GC.Collect();
GC.WaitForPendingFinalizers();
Console.WriteLine(weak.TryGetTarget(out _) ? "still alive" : "collected");

static WeakReference<byte[]> MakeWeak() => new(new byte[1000]);` },
      { title: 'GC.GetGCMemoryInfo for diagnostics', html: `<p>Runtime counters tell you heap size, fragmentation and pause times without a profiler. In production use ${C('dotnet-counters monitor')} for the same data live.</p>`, code: R`
var junk = new List<byte[]>();
for (int i = 0; i < 100; i++) junk.Add(new byte[10_000]);
GC.Collect();
var info = GC.GetGCMemoryInfo();
Console.WriteLine($"heap {info.HeapSizeBytes / 1024} KB, pause {info.PauseTimePercentage}% , gen2 count {GC.CollectionCount(2)}");
GC.KeepAlive(junk);` }
    ],
    deepDive: `<p><b>Mark, plan, relocate, compact.</b> A blocking GC suspends managed threads at safe points, marks from roots, plans which regions to compact or sweep, updates references to moved objects, and resumes threads. Pinned objects (${C('fixed')}, ${C('GCHandle.Alloc(..., Pinned)')}) cannot move and fragment the heap — keep pins short or use the POH.</p>
<p><b>Regions (.NET 7+).</b> The heap is managed in regions (4 MB small, 32 MB large by default) instead of fixed segments, letting generations grow and shrink flexibly and returning memory to the OS more easily.</p>
<p><b>Allocation budget.</b> Gen0 size is tuned dynamically (roughly related to L3 cache size). ${C('GCHeapAffinitizeMask')}, ${C('GCHeapCount')} and ${C('GCConserveMemory')} tune server GC in containers. In containers the GC respects cgroup memory limits (heap hard limit defaults to 75% of the container limit).</p>
<p><b>LOH compaction.</b> ${C('GCSettings.LargeObjectHeapCompactionMode = GCLargeObjectHeapCompactionMode.CompactOnce')} compacts the LOH at the next full GC. The 85,000-byte threshold can be raised with ${C('GCLOHThreshold')}.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is good at reading a dotnet-counters or PerfView summary and suggesting where allocations come from. <b>Use AI as a partner:</b> paste a GC trace summary and ask <code>Which objects are surviving to gen2 and why?</code> <b>Where AI goes wrong:</b> recommending ${C('GC.Collect()')} calls, finalizers "to help the GC", or setting objects to null at the end of methods (pointless — the JIT already knows the last use). <b>What you must still own:</b> measuring GC behaviour under realistic load and fixing the root cause (object lifetimes), not the symptom.</p>`
  });

  /* ======================================================================
     TOPIC 4 — Finalizers vs Dispose, SafeHandle
     ====================================================================== */
  function finSim(input) {
    var mode = String(input === undefined ? 'forget' : input).trim().toLowerCase();
    if (['dispose', 'forget'].indexOf(mode) < 0) throw new Error('Type "dispose" or "forget"');
    var frames = [];
    function f(narr, fq, freach, heap, hl) { frames.push({ narr: narr, parts: [{ type: 'array', label: 'Heap objects', values: heap.length ? heap : ['(none)'], hl: hl || {} }, { type: 'queue', label: 'Finalization queue (registered finalizable objects)', items: fq }, { type: 'queue', label: 'F-reachable queue (waiting for the finalizer thread)', items: freach }] }); }
    f('<code>var h = new NativeBuffer()</code>. Because the class has a finalizer, the object is <b>registered</b> in the finalization queue at allocation (slightly slower allocation).', ['h'], [], ['h (owns native memory)']);
    if (mode === 'dispose') {
      f('<code>h.Dispose()</code> frees the native memory now and calls <b>GC.SuppressFinalize(this)</b>, which removes it from the finalization queue.', [], [], ['h (released)'], { 0: 'ok' });
      f('h becomes unreachable. At the next gen0 GC it is simply freed like any other object — one collection, no finalizer run.', [], [], [], {});
      f('Deterministic: the native memory was released at a known point, and the GC did no extra work.', [], [], [], {});
    } else {
      f('The caller forgets to dispose. h becomes unreachable but still holds native memory.', ['h'], [], ['h (unreachable, native memory held)'], { 0: 'bad' });
      f('A GC finds h dead but registered for finalization: instead of freeing it, it moves h to the <b>f-reachable</b> queue, which <i>resurrects</i> it (and everything it references) — h survives and is <b>promoted</b>.', [], ['h'], ['h (promoted to gen 1)'], { 0: 'bad' });
      f('The single <b>finalizer thread</b> runs <code>~NativeBuffer()</code> at some unknown later time and frees the native memory.', [], [], ['h (finalized)'], { 0: 'cur' });
      f('Only at a <b>later</b> collection of gen 1 is the managed object finally freed. Forgetting Dispose cost two GCs, a promotion and an unpredictable delay.', [], [], [], {});
    }
    return frames;
  }
  topics.push({
    title: 'Finalizers vs Dispose: the Dispose Pattern & SafeHandle',
    analogy: `<p>Dispose is <b>returning your rental car</b> at the counter: you choose when, the company gets it back immediately. A finalizer is the rental company's <b>recovery team</b> who eventually tow away cars abandoned in car parks: it works, but it is slow, unpredictable, and expensive for everyone. You want the recovery team to exist as a safety net — and you never want to rely on it.</p>`,
    explain: `<p>A <b>finalizer</b> (${C('~MyType() { }')}, compiled to an override of ${C('Object.Finalize')}) runs on the GC's finalizer thread at some point after the object becomes unreachable. It exists only to release <b>unmanaged</b> resources (OS handles, native memory) when the owner forgot to call Dispose.</p>
<h4>Why finalizers are costly</h4>
<ul><li>Finalizable objects are registered at allocation and survive at least one extra GC (promoted, with everything they reference).</li>
<li>One finalizer thread runs them in no guaranteed order and at no guaranteed time; a slow or blocking finalizer delays all others.</li>
<li>Inside a finalizer, other managed objects you reference may already be finalized — touch only unmanaged state.</li>
<li>Finalizers are not guaranteed to run at process exit in .NET Core.</li></ul>
<h4>The classic dispose pattern</h4>
${P(`
public class NativeBuffer : IDisposable
{
    private IntPtr _mem = Marshal.AllocHGlobal(1024);
    private bool _disposed;

    public void Dispose()
    {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);      // finalizer no longer needed
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        if (disposing) { /* dispose managed fields here */ }
        Marshal.FreeHGlobal(_mem);      // unmanaged: always
        _mem = IntPtr.Zero;
        _disposed = true;
    }

    ~NativeBuffer() => Dispose(disposing: false);
}`)}
<h4>Better: SafeHandle</h4>
<p>Wrap the raw handle in a ${C('SafeHandle')} subclass (${C('SafeFileHandle')}, ${C('SafeMemoryMappedViewHandle')}, or your own overriding ${C('ReleaseHandle')}). SafeHandle has a critical finalizer, protects against handle-recycling races during P/Invoke, and lets your own class have a simple Dispose with no finalizer at all.</p>
${P(`
sealed class NativeMemoryHandle : SafeHandle
{
    public NativeMemoryHandle(int size) : base(IntPtr.Zero, ownsHandle: true) => SetHandle(Marshal.AllocHGlobal(size));
    public override bool IsInvalid => handle == IntPtr.Zero;
    protected override bool ReleaseHandle() { Marshal.FreeHGlobal(handle); return true; }
}`)}
<h4>Rules of thumb</h4>
<ul><li>No unmanaged state? No finalizer. Ever.</li>
<li>Sealed class with only managed disposables? A plain idempotent ${C('Dispose()')}.</li>
<li>Unsealed base class meant for inheritance? The ${C('Dispose(bool)')} pattern so subclasses can extend cleanup.</li>
<li>Raw handle? SafeHandle.</li></ul>`,
    clues: ['Class directly owns an IntPtr / OS handle → SafeHandle (or finalizer + dispose pattern)', 'Class only owns other IDisposables → plain Dispose, no finalizer', 'Unsealed base class with resources → protected virtual Dispose(bool)', 'Objects surviving one extra GC for no reason → an unnecessary finalizer'],
    code: [{ lang: 'csharp', run: true, title: 'Dispose suppresses finalization; forgetting it defers cleanup (runnable)', code: R`
using System.Runtime.InteropServices;

using (var a = new NativeBuffer("A")) { a.Write(1); }

Forget();
GC.Collect();
GC.WaitForPendingFinalizers();
Console.WriteLine("done");

static void Forget() { var b = new NativeBuffer("B"); b.Write(2); }

class NativeBuffer : IDisposable
{
    private readonly string _name;
    private IntPtr _mem = Marshal.AllocHGlobal(64);
    private bool _disposed;

    public NativeBuffer(string name) => _name = name;
    public void Write(byte v) { ObjectDisposedException.ThrowIf(_disposed, this); Marshal.WriteByte(_mem, v); }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (_disposed) return;
        Marshal.FreeHGlobal(_mem);
        _mem = IntPtr.Zero;
        _disposed = true;
        Console.WriteLine($"{_name} released by {(disposing ? "Dispose" : "finalizer")}");
    }

    ~NativeBuffer() => Dispose(false);
}` }],
    codeTitle: ['The dispose pattern in action'],
    viz: { title: 'What happens with and without Dispose', input: 'forget', inputLabel: '"dispose" or "forget"', gen: finSim },
    examples: [
      { title: 'A SafeHandle-based owner needs no finalizer', html: `<p>The wrapper class holds a SafeHandle and simply disposes it. The SafeHandle's own critical finalizer is the safety net.</p>`, code: R`
using System.Runtime.InteropServices;

using var buf = new Buffer(16);
Console.WriteLine(buf.IsOpen);

sealed class MemHandle : SafeHandle
{
    public MemHandle(int size) : base(IntPtr.Zero, true) => SetHandle(Marshal.AllocHGlobal(size));
    public override bool IsInvalid => handle == IntPtr.Zero;
    protected override bool ReleaseHandle() { Marshal.FreeHGlobal(handle); return true; }
}

sealed class Buffer(int size) : IDisposable
{
    private readonly MemHandle _h = new(size);
    public bool IsOpen => !_h.IsClosed;
    public void Dispose() => _h.Dispose();
}` },
      { title: 'Subclass extending Dispose(bool)', html: `<p>A derived class overrides ${C('Dispose(bool)')}, releases its own resources, then calls the base implementation. It never adds a second finalizer.</p>`, code: R`
using (var d = new Derived()) { }

class BaseRes : IDisposable
{
    public void Dispose() { Dispose(true); GC.SuppressFinalize(this); }
    protected virtual void Dispose(bool disposing) => Console.WriteLine("base cleanup");
}
class Derived : BaseRes
{
    private readonly MemoryStream _ms = new();
    protected override void Dispose(bool disposing)
    {
        if (disposing) _ms.Dispose();
        Console.WriteLine("derived cleanup");
        base.Dispose(disposing);
    }
}` },
      { title: 'Finalizers can resurrect objects', html: `<p>A finalizer that stores ${C('this')} somewhere makes the object reachable again. It is legal and almost always a bug — the object is already "finalized" and will not be finalized again unless ${C('GC.ReRegisterForFinalize')} is called.</p>`, code: R`
MakeZombie();
GC.Collect(); GC.WaitForPendingFinalizers();
Console.WriteLine(Zombie.Saved is not null ? "resurrected" : "gone");

static void MakeZombie() { _ = new Zombie(); }
class Zombie
{
    public static Zombie? Saved;
    ~Zombie() => Saved = this;
}` }
    ],
    deepDive: `<p><b>Order and threads.</b> Finalizers run on a dedicated high-priority thread. There is no ordering between objects, so a finalizer must not assume that the objects it references are still usable; SafeHandle and ${C('CriticalFinalizerObject')} get a weak ordering guarantee (critical finalizers run after normal ones).</p>
<p><b>Exceptions in finalizers</b> crash the process. Keep them minimal and non-throwing.</p>
<p><b>Process exit.</b> .NET Core does not run finalizers on exit, so do not rely on them to flush files — use Dispose or ${C('AppDomain.ProcessExit')} / ${C('IHostApplicationLifetime')} hooks.</p>
<p><b>Analyzers.</b> CA1063 (implement IDisposable correctly), CA1816 (call SuppressFinalize), CA2000 (dispose objects before losing scope) and CA2213 (disposable fields should be disposed) catch most mistakes.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking for "a class that implements IDisposable" often produces the full finalizer pattern by default, even for a class owning only a ${C('HttpClient')}. <b>Use AI as a partner:</b> <code>Does this class own unmanaged resources directly? If not, simplify its dispose implementation</code>. <b>Where AI goes wrong:</b> adding finalizers to managed-only classes, touching managed fields inside the finalizer path, forgetting SuppressFinalize, or calling virtual methods from constructors in the pattern. <b>What you must still own:</b> knowing who owns each resource and choosing SafeHandle for native interop.</p>`
  });

  /* ======================================================================
     TOPIC 5 — Span<T> and ReadOnlySpan<T>
     ====================================================================== */
  function spanSim(input) {
    var p = String(input === undefined ? 'hello world, span' : input);
    if (p.length < 3 || p.length > 24) throw new Error('Type a sentence of 3 to 24 characters');
    var chars = p.split('');
    var frames = [], words = 0, i = 0;
    frames.push({ narr: '<code>ReadOnlySpan&lt;char&gt; s = text.AsSpan();</code> — a span is just <b>(reference to the first element, length)</b>. No copy of the string.', parts: [{ type: 'array', label: 'the string\'s characters (owned by the string object)', values: chars }, { type: 'vars', vals: { 'span.start': 0, 'span.Length': chars.length } }] });
    var rest = 0;
    while (rest < chars.length) {
      while (rest < chars.length && chars[rest] === ' ') rest++;
      if (rest >= chars.length) break;
      var end = rest; while (end < chars.length && chars[end] !== ' ') end++;
      words++;
      var hl = {}; for (var k = rest; k < end; k++) hl[k] = 'ok';
      var ptr = {}; ptr[rest] = 'start'; if (end - 1 !== rest) ptr[end - 1] = 'end';
      frames.push({ narr: 'Word ' + words + ' = <code>s.Slice(' + rest + ', ' + (end - rest) + ')</code> → "' + H.esc(p.slice(rest, end)) + '". Slicing is O(1): it only adjusts the start and length, no new string is allocated.', parts: [{ type: 'array', label: 'text', values: chars, hl: hl, ptr: ptr }, { type: 'vars', vals: { 'slice.start': rest, 'slice.Length': end - rest, 'words so far': words, 'allocations': 0 }, hl: { allocations: 'ok' } }] });
      rest = end;
    }
    frames.push({ narr: 'Compare: <code>text.Split(\' \')</code> would allocate an array plus ' + words + ' new strings. The span version allocated nothing.', parts: [{ type: 'vars', vals: { words: words, 'Split allocations': (words + 1) + ' objects', 'span allocations': 0 }, hl: { 'span allocations': 'ok' } }] });
    return frames;
  }
  topics.push({
    title: 'Span<T> & ReadOnlySpan<T>: Views Without Copies',
    analogy: `<p>A span is a <b>window frame</b> you hold up against a wall of bricks. Moving or shrinking the frame (slicing) costs nothing — the bricks do not move. Whatever you see through the window you can read, and with a ${C('Span<T>')} (not ReadOnly) you can even repaint the bricks you see, which changes the real wall. The wall can be an array, a string, a chunk of stack memory or native memory — the window works the same on all of them.</p>`,
    explain: `<p>${C('Span<T>')} is a <b>ref struct</b> holding a managed reference to the first element and a length. It represents a contiguous region of memory: part of an array, a string (as ${C('ReadOnlySpan<char>')}), stack memory from ${C('stackalloc')}, or native memory. Slicing creates a new span over the same memory in O(1) with no allocation.</p>
${P(`
int[] data = { 1, 2, 3, 4, 5, 6 };
Span<int> middle = data.AsSpan(1, 4);   // view over 2, 3, 4, 5
middle[0] = 20;                         // writes into data[1]
middle.Reverse();                       // data is now 1, 5, 4, 3, 20, 6
int sum = 0;
foreach (int x in middle) sum += x;     // fast, bounds-check-friendly loop

ReadOnlySpan<char> line = "key=value".AsSpan();
int eq = line.IndexOf('=');
ReadOnlySpan<char> key = line[..eq];        // "key" — no substring allocation
int n = int.Parse("x=42".AsSpan(2));        // parse straight from a span`)}
<h4>What spans give you</h4>
<ul><li><b>One API for all contiguous memory</b>: write a method taking ${C('ReadOnlySpan<byte>')} and call it with an array, a slice of an array, a stackalloc buffer or native memory.</li>
<li><b>No allocations for substrings</b>: parsing with ${C('IndexOf')}, ${C('Slice')}, ${C('Trim')}, ${C('SequenceEqual')}, ${C('int.Parse(ReadOnlySpan<char>)')}, ${C('MemoryExtensions.Split')} (.NET 8 range-based split).</li>
<li><b>Vectorized helpers</b>: ${C('IndexOf')}, ${C('SequenceEqual')}, ${C('Fill')}, ${C('CopyTo')}, ${C('Reverse')}, ${C('Sort')}, ${C('BinarySearch')} use SIMD under the hood.</li></ul>
<h4>The ref struct rules (why spans are safe)</h4>
<p>Because a span can point into the stack, the compiler forbids anything that could let it outlive that memory: a ${C('Span<T>')} cannot be a field of a class, cannot be boxed or used as a generic argument (C# 13 relaxes this with ${C('allows ref struct')}, not available in C# 12), cannot be captured by a lambda, and cannot be used across an ${C('await')} or ${C('yield')}. When you need to store a "span" in a field or across awaits, use ${C('Memory<T>')} (next topic).</p>
<h4>Strings and spans</h4>
<p>Strings are immutable, so ${C('AsSpan()')} on a string gives ${C('ReadOnlySpan<char>')}. Build new strings without intermediate garbage with ${C('string.Create(length, state, (span, state) => ...)')} or a ${C('stackalloc')} buffer plus ${C('new string(span)')}.</p>`,
    clues: ['Parsing text with lots of Substring/Split → ReadOnlySpan&lt;char&gt; slicing', 'An API should accept arrays, slices and stack buffers alike → take Span&lt;T&gt;/ReadOnlySpan&lt;T&gt;', 'Need to keep the view in a field or across await → Memory&lt;T&gt;, not Span&lt;T&gt;', 'Hot loop over part of an array → a span slice removes index arithmetic and enables bounds-check elimination'],
    code: [{ lang: 'csharp', run: true, title: 'Parsing key=value pairs without allocating substrings (runnable)', code: R`
string config = "width=1280;height=720;fps=60";
long before = GC.GetAllocatedBytesForCurrentThread();
int width = 0, height = 0, fps = 0;
ReadOnlySpan<char> rest = config;
while (!rest.IsEmpty)
{
    int semi = rest.IndexOf(';');
    ReadOnlySpan<char> pair = semi < 0 ? rest : rest[..semi];
    rest = semi < 0 ? ReadOnlySpan<char>.Empty : rest[(semi + 1)..];

    int eq = pair.IndexOf('=');
    ReadOnlySpan<char> key = pair[..eq];
    int value = int.Parse(pair[(eq + 1)..]);
    if (key.SequenceEqual("width")) width = value;
    else if (key.SequenceEqual("height")) height = value;
    else if (key.SequenceEqual("fps")) fps = value;
}
long after = GC.GetAllocatedBytesForCurrentThread();
Console.WriteLine($"{width}x{height}@{fps}, allocated {after - before} bytes while parsing");

int[] data = { 1, 2, 3, 4, 5, 6 };
Span<int> mid = data.AsSpan(1, 4);
mid.Reverse();
Console.WriteLine(string.Join(",", data));` }],
    codeTitle: ['Zero-allocation parsing'],
    viz: { title: 'Slicing words out of a string', input: 'hello world, span', inputLabel: 'a short sentence', gen: spanSim },
    examples: [
      { title: 'One method, many memory sources', html: `<p>${C('Sum(ReadOnlySpan<int>)')} works with a whole array, a slice, and a stackalloc buffer — the caller chooses where memory lives.</p>`, code: R`
int[] arr = { 1, 2, 3, 4 };
Span<int> stack = stackalloc int[] { 10, 20 };
Console.WriteLine(Sum(arr));
Console.WriteLine(Sum(arr.AsSpan(2)));
Console.WriteLine(Sum(stack));

static int Sum(ReadOnlySpan<int> s) { int t = 0; foreach (var x in s) t += x; return t; }` },
      { title: 'Writing through a span changes the source', html: `<p>A ${C('Span<T>')} is a view, not a copy. ${C('Fill')}, indexer writes and ${C('CopyTo')} modify the underlying array.</p>`, code: R`
var buffer = new byte[8];
Span<byte> view = buffer.AsSpan(2, 3);
view.Fill(0xFF);
Console.WriteLine(BitConverter.ToString(buffer));` },
      { title: 'MemoryExtensions.Split (.NET 8)', html: `<p>.NET 8 can split a span into ${C('Range')} values written to a stack buffer — no string array and no substrings.</p>`, code: R`
ReadOnlySpan<char> csv = "10,20,30,40";
Span<Range> parts = stackalloc Range[8];
int count = csv.Split(parts, ',');
int total = 0;
for (int i = 0; i < count; i++) total += int.Parse(csv[parts[i]]);
Console.WriteLine($"{count} values, total {total}");` }
    ],
    deepDive: `<p><b>Representation.</b> Since .NET 7, ${C('Span<T>')} is ${C('ref struct Span<T> { ref T _reference; int _length; }')} using C# 11 ref fields — two machine words. The GC understands the interior reference and keeps the underlying object alive (and updates it when compacting).</p>
<p><b>Bounds checks.</b> Indexing a span is bounds-checked like an array, but the JIT eliminates checks in ${C('for (int i = 0; i < span.Length; i++)')} loops and for ${C('foreach')}. ${C('MemoryMarshal.GetReference')} and ${C('Unsafe.Add')} remove them entirely at the cost of safety.</p>
<p><b>Reinterpreting memory.</b> ${C('MemoryMarshal.Cast<byte, int>(bytes)')} views bytes as ints without copying; ${C('MemoryMarshal.AsBytes')} goes the other way. ${C('BinaryPrimitives.ReadInt32LittleEndian(span)')} reads with explicit endianness.</p>
<p><b>Collections.</b> ${C('CollectionsMarshal.AsSpan(list)')} exposes a ${C('List<T>')}'s backing array as a span — do not add/remove while holding it.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can mechanically convert Substring/Split parsers into span code, which used to take expertise. <b>Use AI as a partner:</b> <code>Rewrite this parser with ReadOnlySpan&lt;char&gt; and show me the allocation difference with a benchmark</code>. <b>Where AI goes wrong:</b> storing spans in class fields or using them in async methods (compile errors), calling ${C('.ToString()')} or ${C('.ToArray()')} on every slice (allocations are back), forgetting ${C('ReadOnlySpan')} for string data. <b>What you must still own:</b> deciding where zero-allocation code is worth its extra complexity — hot paths only.</p>`,
    problems: [{
      title: 'Count Words Without Split', level: 'Easy', tags: ['ReadOnlySpan', 'parsing'],
      statement: `<p>Count the words in a string, where words are maximal runs of non-space characters separated by one or more spaces (only the ' ' character counts as a separator). Do it with ${C('ReadOnlySpan<char>')} and no allocations.</p>`,
      constraints: `0 ≤ s.Length ≤ 10<sup>6</sup>`,
      example: `<p>${C('"  hello   big world "')} → 3.</p>`,
      brute: { why: `<p>${C('s.Split(\' \', StringSplitOptions.RemoveEmptyEntries).Length')} is correct but allocates an array and one string per word — megabytes of garbage for a big input.</p>`, code: R`
static int CountSplit(string s) => s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;` },
      mcq: { q: 'What does `span.Slice(3)` allocate?', options: ['Nothing — it returns a new view over the same memory', 'A new array', 'A new string', 'A boxed span'], answer: 0, explain: 'A slice only adjusts the start reference and the length.' },
      hints: [`<p>Loop: skip spaces with ${C('IndexOfAnyExcept(\' \')')}, then find the end with ${C('IndexOf(\' \')')}.</p>`, `<p>After each word, slice the span: ${C('s = s[end..]')}.</p>`, `<p>Or a single pass counting positions where a non-space follows a space or the start.</p>`],
      solution: {
        approach: `<p>Repeatedly skip separators and then the word, re-slicing the span. Each slice is O(1) and the vectorized IndexOf helpers make it fast.</p>`,
        code: R`
public class Solution
{
    public int CountWords(string text)
    {
        ReadOnlySpan<char> s = text;
        int words = 0;
        while (true)
        {
            int start = s.IndexOfAnyExcept(' ');
            if (start < 0) return words;
            s = s[start..];
            words++;
            int end = s.IndexOf(' ');
            if (end < 0) return words;
            s = s[end..];
        }
    }
}`,
        dry: { head: ['span now', 'start', 'end', 'words'], rows: [['"  hi  yo"', '2', '2 (in "hi  yo")', '1'], ['"  yo"', '2', '-1', '2 → return']] },
        complexity: `<p>O(n) time, O(1) extra space, zero allocations.</p>`,
        followUps: ['Treat tabs and newlines as separators too (IndexOfAny)', 'Return the longest word as a (start, length) pair']
      },
      tests: { sig: 'string -> int', fn: 'countWords', cases: [
        [['  hello   big world '], 3], [[''], 0], [['     '], 0], [['one'], 1], [['a b c d'], 4], [[' x'], 1], [['x '], 1], [['tab\tis not a space'], 4]
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 6 — stackalloc, Memory<T> and ref struct rules
     ====================================================================== */
  function stackSim(input) {
    var n = parseInt(String(input === undefined ? '255' : input).trim(), 10);
    if (isNaN(n) || n < 0 || n > 100000) throw new Error('Type a number between 0 and 100000');
    var code = ['static string ToBinary(int n)', '{', '    Span<char> buf = stackalloc char[32];  // 64 bytes in this frame', '    int pos = buf.Length;', '    do { buf[--pos] = (char)(\'0\' + (n & 1)); n >>= 1; } while (n != 0);', '    return new string(buf[pos..]);         // the only allocation', '}'].join('\n');
    var buf = []; for (var i = 0; i < 32; i++) buf.push('·');
    var frames = [], pos = 32, x = n;
    frames.push({ narr: '<code>stackalloc char[32]</code> reserves 64 bytes in the current stack frame — no GC object. It is freed automatically when the method returns.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'cur' } }, { type: 'array', label: 'buf (stack memory)', values: buf.slice(24), start: 24 }] });
    var steps = 0;
    do {
      pos--; buf[pos] = String(x & 1); x = x >> 1; steps++;
      var hl = {}; hl[pos - 24 >= 0 ? pos : 24] = 'cur';
      if (steps <= 8) frames.push({ narr: 'Write digit ' + buf[pos] + ' at position ' + pos + ' (filling from the right).', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 5: 'cur' } }, { type: 'array', label: 'buf[24..32] (stack memory)', values: buf.slice(24), start: 24, hl: (function () { var h = {}; if (pos >= 24) h[pos - 24] = 'cur'; return h; })() }, { type: 'vars', vals: { n: x, pos: pos } }] });
    } while (x !== 0);
    frames.push({ narr: '<code>new string(buf[' + pos + '..])</code> copies the used part into one string: "' + buf.slice(pos).join('') + '". That string is the only heap allocation.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 6: 'ok' } }, { type: 'vars', vals: { result: buf.slice(pos).join(''), 'heap allocations': 1 }, hl: { result: 'ok' } }] });
    frames.push({ narr: 'The method returns: its frame, including the 64-byte buffer, disappears instantly. Returning the span itself would be a compile error (CS8352) because it would point at dead stack memory.', parts: [{ type: 'stack', label: 'Call stack', items: ['Main'], hl: { 0: 'cur' } }] });
    return frames;
  }
  topics.push({
    title: 'stackalloc, Memory<T> & the ref struct Rules',
    analogy: `<p>${C('stackalloc')} is a <b>scratch pad</b> torn from the notebook on your desk: free, instant, and automatically thrown away when you leave the desk — so you must never hand it to someone who will read it tomorrow. ${C('Memory<T>')} is a <b>library card</b> for a book in the shared library: you can keep it in your bag (a field), carry it across days (awaits), and open the book (get a Span) whenever you sit down to read.</p>`,
    explain: `<h4>1. stackalloc</h4>
${P(`
Span<byte> small = stackalloc byte[256];        // stack memory, no GC
Span<char> digits = stackalloc char[20];
int len = 0; long v = 12345;
do { digits[len++] = (char)('0' + v % 10); v /= 10; } while (v > 0);`)}
<ul><li>Assigned to a ${C('Span<T>')} it needs no ${C('unsafe')} code; ${C('T')} must be an unmanaged type (no references).</li>
<li>Memory is not zeroed by the language guarantee? It is zero-initialised by default; ${C('[SkipLocalsInit]')} removes that for speed.</li>
<li>Keep it small (a common limit is ≤ 1 KB) and never in a loop that can grow — stack overflow kills the process. Pattern: ${C('Span<byte> buf = n <= 256 ? stackalloc byte[256] : new byte[n];')} or rent from ArrayPool.</li></ul>
<h4>2. ref struct rules</h4>
<p>${C('Span<T>')}, ${C('ReadOnlySpan<T>')} and your own ${C('ref struct')} types must stay on the stack. The compiler enforces "ref safety": they cannot be class fields, boxed, captured in lambdas or local functions that escape, used in async methods across awaits or in iterators, or returned when they point to local stack memory (CS8352). This is what makes stackalloc spans safe without a GC.</p>
<h4>3. Memory&lt;T&gt; and ReadOnlyMemory&lt;T&gt;</h4>
${P(`
class LineReader
{
    private ReadOnlyMemory<char> _remaining;           // allowed as a field
    public LineReader(string text) => _remaining = text.AsMemory();

    public async Task<int> CountAsync()
    {
        int n = 0;
        while (!_remaining.IsEmpty)
        {
            await Task.Yield();                         // allowed across await
            ReadOnlySpan<char> s = _remaining.Span;     // get a span only for synchronous work
            int nl = s.IndexOf('\n');
            _remaining = nl < 0 ? ReadOnlyMemory<char>.Empty : _remaining[(nl + 1)..];
            n++;
        }
        return n;
    }
}`)}
<p>${C('Memory<T>')} is a regular struct (object + index + length), so it can live on the heap, in fields and across awaits. Call ${C('.Span')} at the point where you do synchronous work. Async I/O APIs (${C('Stream.ReadAsync(Memory<byte>)')}, sockets, pipelines) take ${C('Memory<T>')}.</p>
<h4>4. Which one?</h4>
${H.table(['Need', 'Use'], [
      ['synchronous method parameter', C('Span<T> / ReadOnlySpan<T>')],
      ['field, async method, lambda capture, collection element', C('Memory<T> / ReadOnlyMemory<T>')],
      ['small temporary buffer of known max size', C('stackalloc') + ' into a Span'],
      ['large or variable temporary buffer', C('ArrayPool<T>.Shared.Rent') + ' (topic 7)'],
      ['ownership of pooled memory with a lifetime', C('IMemoryOwner<T>') + ' from ' + C('MemoryPool<T>')]
    ])}`,
    clues: ['Small fixed-size scratch buffer in a hot method → stackalloc into Span', 'Buffer must survive await or be stored in a field → Memory&lt;T&gt;', 'Compiler error CS8345/CS8352/CS4012 around a span → you tried to escape a ref struct', 'Variable or large size → pool instead of stackalloc'],
    code: [{ lang: 'csharp', run: true, title: 'stackalloc formatting and Memory across await (runnable)', code: R`
Console.WriteLine(ToBinary(10));
Console.WriteLine(ToBinary(255));
Console.WriteLine(await CountLinesAsync("a\nbb\nccc".AsMemory()));

static string ToBinary(int n)
{
    Span<char> buf = stackalloc char[32];
    int pos = buf.Length;
    uint u = (uint)n;
    do { buf[--pos] = (char)('0' + (u & 1)); u >>= 1; } while (u != 0);
    return new string(buf[pos..]);
}

static async Task<int> CountLinesAsync(ReadOnlyMemory<char> text)
{
    int lines = 0;
    while (!text.IsEmpty)
    {
        await Task.Yield();
        int nl = text.Span.IndexOf('\n');
        text = nl < 0 ? ReadOnlyMemory<char>.Empty : text[(nl + 1)..];
        lines++;
    }
    return lines;
}` }],
    codeTitle: ['Stack buffers and Memory<T>'],
    viz: { title: 'A stackalloc buffer inside one call', input: '255', inputLabel: 'a non-negative number to convert to binary', gen: stackSim },
    examples: [
      { title: 'Hybrid buffer: stack when small, heap when big', html: `<p>A common idiom: use the stack up to a threshold and fall back to a heap (or pooled) array for large inputs, so a huge input cannot overflow the stack.</p>`, code: R`
Console.WriteLine(Reverse("stack"));
Console.WriteLine(Reverse(new string('x', 1000)).Length);

static string Reverse(string s)
{
    Span<char> buf = s.Length <= 256 ? stackalloc char[256] : new char[s.Length];
    buf = buf[..s.Length];
    s.AsSpan().CopyTo(buf);
    buf.Reverse();
    return new string(buf);
}` },
      { title: 'string.Create writes directly into the new string', html: `<p>${C('string.Create')} allocates the final string once and gives you its characters as a span to fill — no intermediate buffers. The state argument avoids a closure allocation.</p>`, code: R`
string padded = string.Create(8, 42, (span, value) =>
{
    span.Fill('0');
    value.TryFormat(span[^2..], out _);
});
Console.WriteLine(padded);` },
      { title: 'Your own ref struct', html: `<p>A ${C('ref struct')} may hold spans as fields. It is perfect for allocation-free tokenizers, but obeys the same escape rules as Span.</p>`, code: R`
var t = new Tokenizer("a,bb,ccc");
while (t.Next(out var tok)) Console.Write(tok.Length + " ");

ref struct Tokenizer(ReadOnlySpan<char> text)
{
    private ReadOnlySpan<char> _rest = text;
    public bool Next(out ReadOnlySpan<char> token)
    {
        if (_rest.IsEmpty) { token = default; return false; }
        int i = _rest.IndexOf(',');
        token = i < 0 ? _rest : _rest[..i];
        _rest = i < 0 ? default : _rest[(i + 1)..];
        return true;
    }
}` }
    ],
    deepDive: `<p><b>scoped and ref safety.</b> C# 11 added ${C('scoped')} to declare that a span parameter does not escape the method, letting callers pass stackalloc memory into methods that also return spans. The compiler tracks a "safe-to-escape" scope for every ref and ref struct value.</p>
<p><b>SkipLocalsInit.</b> By default the JIT zeroes stackalloc memory and locals. ${C('[module: SkipLocalsInit]')} (requires AllowUnsafeBlocks) skips it — measurable for large buffers, but you must write before reading.</p>
<p><b>Memory&lt;T&gt; internals.</b> It stores an ${C('object')} (array, string or ${C('MemoryManager<T>')}), an index and a length; ${C('.Span')} does a type check each time, so cache the span inside a synchronous section of code. ${C('MemoryManager<T>')} lets native or pinned memory appear as Memory.</p>
<p><b>Stack size.</b> Thread-pool threads have smaller stacks than you may think; deep recursion combined with stackalloc in each frame is how stack overflows sneak into production.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI will happily insert stackalloc everywhere it sees a temporary array. <b>Use AI as a partner:</b> <code>Is the size of this stackalloc bounded? What happens with a 10 MB input?</code> <b>Where AI goes wrong:</b> unbounded ${C('stackalloc byte[n]')} from user input, stackalloc inside loops, using Span in async methods, converting Memory to Span too early and storing it. <b>What you must still own:</b> the safety argument — a provable upper bound on stack usage — and the decision of when the heap is simply fine.</p>`,
    problems: [{
      title: 'Base Conversion with a Stack Buffer', level: 'Medium', tags: ['stackalloc', 'Span', 'formatting'],
      statement: `<p>Convert a 64-bit integer n to base b (2 ≤ b ≤ 36) using digits ${C('0-9')} then lowercase ${C('a-z')}, with a leading ${C('-')} for negative numbers. Build the digits in a ${C('stackalloc')} buffer and allocate only the final string.</p>`,
      constraints: `−(2<sup>63</sup>−1) ≤ n ≤ 2<sup>63</sup>−1, 2 ≤ b ≤ 36`,
      example: `<p>n = 255, b = 16 → ${C('"ff"')}; n = −10, b = 2 → ${C('"-1010"')}; n = 0 → ${C('"0"')}.</p>`,
      brute: { why: `<p>Prepending each digit to a string (${C('s = digit + s')}) allocates a new string per digit — O(d²) characters copied. ${C('Convert.ToString(n, b)')} only supports bases 2, 8, 10 and 16.</p>`, code: R`
static string ToBaseConcat(long n, int b)
{
    const string D = "0123456789abcdefghijklmnopqrstuvwxyz";
    if (n == 0) return "0";
    bool neg = n < 0; ulong u = neg ? (ulong)(-n) : (ulong)n;
    string s = "";
    while (u > 0) { s = D[(int)(u % (ulong)b)] + s; u /= (ulong)b; }
    return neg ? "-" + s : s;
}` },
      mcq: { q: 'Why is a 65-character stack buffer always enough?', options: ['Base 2 needs at most 63 digits for |n| < 2^63, plus one sign character', 'Strings are limited to 65 characters', 'stackalloc grows automatically', 'Base 36 needs 65 digits'], answer: 0, explain: 'The worst case is base 2: up to 63 digits for 2^63−1, plus the minus sign.' },
      hints: [`<p>${C('Span<char> buf = stackalloc char[65]; int pos = buf.Length;')} and fill from the right.</p>`, `<p>Work with the absolute value as ${C('ulong')} so that the arithmetic stays simple.</p>`, `<p>Use a ${C('do { } while')} loop so 0 produces "0"; finish with ${C('new string(buf[pos..])')}.</p>`],
      solution: {
        approach: `<p>Repeated division by b produces digits least-significant first, so write them right-to-left into a fixed stack buffer, add the sign, and create one string from the used slice.</p>`,
        code: R`
public class Solution
{
    private const string Digits = "0123456789abcdefghijklmnopqrstuvwxyz";

    public string ToBase(long n, int b)
    {
        Span<char> buf = stackalloc char[65];
        int pos = buf.Length;
        bool negative = n < 0;
        ulong u = negative ? (ulong)(-n) : (ulong)n;
        do
        {
            buf[--pos] = Digits[(int)(u % (ulong)b)];
            u /= (ulong)b;
        } while (u != 0);
        if (negative) buf[--pos] = '-';
        return new string(buf[pos..]);
    }
}`,
        dry: { head: ['u', 'u % 16', 'digit', 'pos'], rows: [['255', '15', 'f', '64'], ['15', '15', 'f', '63'], ['0', '—', 'stop', 'result "ff"']] },
        complexity: `<p>O(log<sub>b</sub> |n|) time, O(1) stack space, one allocation for the result.</p>`,
        followUps: ['Support long.MinValue (hint: negate after converting to ulong)', 'Write into a caller-provided Span and return the length (TryFormat style)']
      },
      tests: { sig: 'long int -> string', fn: 'toBase', cases: [
        [[255, 16], 'ff'], [[-10, 2], '-1010'], [[0, 7], '0'], [[35, 36], 'z'], [[36, 36], '10'], [['9223372036854775807', 2], '111111111111111111111111111111111111111111111111111111111111111'], [[-1, 10], '-1'], [[123456789, 10], '123456789']
      ] }
    }]
  });

  /* ======================================================================
     TOPIC 7 — ArrayPool and avoiding allocations
     ====================================================================== */
  function poolSim(input) {
    var DEF = 'rent 100; rent 3000; return 1; rent 200; return 2; return 3; rent 120';
    var ops = splitOps(input, DEF);
    var frames = [], free = { 128: [], 256: [], 4096: [] }, rented = {}, nextId = 1, created = 0;
    function bucket(n) { if (n <= 128) return 128; if (n <= 256) return 256; if (n <= 4096) return 4096; throw new Error('Keep sizes ≤ 4096 in this demo'); }
    function draw(narr) {
      frames.push({ narr: narr, parts: [
        { type: 'map', label: 'Pool buckets (size → idle arrays)', entries: [['128', free[128].join(', ') || '—'], ['256', free[256].join(', ') || '—'], ['4096', free[4096].join(', ') || '—']] },
        { type: 'map', label: 'Rented right now (#id → length)', entries: Object.keys(rented).map(function (k) { return ['#' + k, rented[k]]; }) },
        { type: 'vars', vals: { 'arrays ever allocated': created } }
      ] });
    }
    draw('<code>ArrayPool&lt;T&gt;.Shared</code> keeps idle arrays in buckets of power-of-two sizes. Rent gives you an array <b>at least</b> as large as asked.');
    ops.forEach(function (op) {
      var m;
      if ((m = op.match(/^rent\s+(\d+)$/))) {
        var b = bucket(+m[1]);
        if (free[b].length) { var id = free[b].pop(); rented[id] = b; draw('Rent(' + m[1] + ') → reuse idle array <b>#' + id + '</b> of length ' + b + '. No allocation.'); }
        else { var nid = nextId++; created++; rented[nid] = b; draw('Rent(' + m[1] + ') → bucket ' + b + ' is empty, so the pool allocates a new array <b>#' + nid + '</b> of length ' + b + ' (note: longer than requested).'); }
      } else if ((m = op.match(/^return\s+(\d+)$/))) {
        var r = m[1];
        if (!rented[r]) throw new Error('Array #' + r + ' is not rented');
        free[rented[r]].push(+r); delete rented[r];
        draw('Return(#' + r + '): the array goes back to its bucket for the next renter. Its contents are <b>not cleared</b> unless you pass clearArray: true — never keep using it after returning.');
      } else throw new Error('Steps: rent N or return id (got "' + op + '")');
    });
    return frames;
  }
  topics.push({
    title: 'ArrayPool & Allocation-Free Techniques',
    analogy: `<p>A busy café could give every customer a disposable cup — simple, but the bins overflow and someone must empty them constantly (GC). Instead it keeps a <b>rack of washable cups</b>: take one, use it, put it back. That is ${C('ArrayPool')}. The rules are the same as in the café: you might get a slightly bigger cup than you asked for, you must give it back, and once you have returned it you may not keep drinking from it.</p>`,
    explain: `<p>Allocations are cheap individually but every allocated byte brings the next GC closer, and large arrays (≥ 85 KB) go straight to the LOH. In hot paths — request parsing, serialization, game loops — reuse memory.</p>
<h4>1. ArrayPool&lt;T&gt;</h4>
${P(`
using System.Buffers;

byte[] buffer = ArrayPool<byte>.Shared.Rent(minimumLength: 4096);
try
{
    int read = stream.Read(buffer, 0, 4096);   // use only the part you asked for
    Process(buffer.AsSpan(0, read));
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);      // clearArray: true for secrets
}`)}
<ul><li>${C('Rent')} may return a <b>larger</b> array; always track the length you actually use.</li>
<li>The array may contain old data; do not assume zeros.</li>
<li>Return exactly once, and never touch it afterwards (another thread may own it now).</li>
<li>${C('ArrayPool<T>.Create(maxLength, maxPerBucket)')} builds a private pool with its own limits.</li></ul>
<h4>2. Other allocation-free tools</h4>
${H.table(['Instead of', 'Use'], [
      [C('s.Substring(i, n)') + ' for parsing', C('s.AsSpan(i, n)')],
      [C('string + string') + ' in loops', C('StringBuilder') + ' (reuse with Clear), ' + C('string.Create') + ', interpolated handlers'],
      [C('new List<T>()') + ' per call', 'reuse a field list with ' + C('Clear()') + ', or set an initial capacity'],
      [C('params object[]') + ' APIs', 'generic overloads, ' + C('params ReadOnlySpan<T>') + ' (C# 13)'],
      ['LINQ in a hot loop', 'a plain loop (LINQ allocates enumerators and delegates)'],
      ['lambdas capturing locals', C('static') + ' lambdas with an explicit state parameter'],
      [C('Task<T>') + ' for usually-synchronous results', C('ValueTask<T>') + ' (module 9)'],
      ['a small class per item', 'a ' + C('struct') + ' / ' + C('record struct')]
    ])}
<h4>3. Measure first</h4>
<p>Use ${C('[MemoryDiagnoser]')} in BenchmarkDotNet to see bytes allocated per operation, ${C('dotnet-counters')} for allocation rate in production, and a profiler's allocation view to find the top allocating call sites. Optimise only what the data shows; pooling adds complexity and the risk of use-after-return bugs.</p>`,
    clues: ['Temporary buffers allocated per call in a hot path → ArrayPool.Rent/Return in try/finally', 'Buffer ≥ 85 KB allocated repeatedly → LOH churn: pool it', 'High allocation rate in a profiler with many short-lived strings → spans, StringBuilder, string.Create', 'Rented buffer used after Return → data corruption across requests'],
    code: [{ lang: 'csharp', run: true, title: 'Pooling vs allocating (runnable)', code: R`
using System.Buffers;

const int Rounds = 1000;
long before = GC.GetAllocatedBytesForCurrentThread();
for (int i = 0; i < Rounds; i++)
{
    var tmp = new byte[100_000];        // LOH allocation every time
    tmp[0] = (byte)i;
}
long mid = GC.GetAllocatedBytesForCurrentThread();
for (int i = 0; i < Rounds; i++)
{
    byte[] tmp = ArrayPool<byte>.Shared.Rent(100_000);
    try { tmp[0] = (byte)i; }
    finally { ArrayPool<byte>.Shared.Return(tmp); }
}
long after = GC.GetAllocatedBytesForCurrentThread();
Console.WriteLine($"new byte[]: {(mid - before) / 1_000_000} MB, pooled: {(after - mid) / 1_000_000} MB");

var rented = ArrayPool<int>.Shared.Rent(10);
Console.WriteLine($"asked for 10, got {rented.Length}");
ArrayPool<int>.Shared.Return(rented);` }],
    codeTitle: ['ArrayPool in a loop'],
    viz: { title: 'Renting and returning arrays', input: 'rent 100; rent 3000; return 1; rent 200; return 2; return 3; rent 120', inputLabel: 'steps: rent N | return id', gen: poolSim },
    examples: [
      { title: 'Reuse a StringBuilder', html: `<p>Keeping one ${C('StringBuilder')} and calling ${C('Clear()')} keeps its internal buffer, so building many strings allocates only the final strings.</p>`, code: R`
var sb = new StringBuilder(64);
var lines = new List<string>();
for (int i = 0; i < 3; i++)
{
    sb.Clear();
    sb.Append("row ").Append(i).Append(": ").Append(i * i);
    lines.Add(sb.ToString());
}
Console.WriteLine(string.Join(" | ", lines));` },
      { title: 'static lambda with explicit state', html: `<p>A ${C('static')} lambda cannot capture locals, which guarantees no closure object is allocated. Pass state through the API's state parameter instead.</p>`, code: R`
int factor = 3;
string s = string.Create(5, factor, static (span, f) =>
{
    for (int i = 0; i < span.Length; i++) span[i] = (char)('0' + (i * f) % 10);
});
Console.WriteLine(s);` },
      { title: 'Pre-sizing collections', html: `<p>A ${C('List<T>')} grows by doubling and copying; passing the final capacity avoids the intermediate arrays (log₂ n of them, the large ones possibly on the LOH).</p>`, code: R`
long b0 = GC.GetAllocatedBytesForCurrentThread();
var grown = new List<int>();
for (int i = 0; i < 100_000; i++) grown.Add(i);
long b1 = GC.GetAllocatedBytesForCurrentThread();
var sized = new List<int>(100_000);
for (int i = 0; i < 100_000; i++) sized.Add(i);
long b2 = GC.GetAllocatedBytesForCurrentThread();
Console.WriteLine($"growing: {(b1 - b0) / 1024} KB, pre-sized: {(b2 - b1) / 1024} KB");` }
    ],
    deepDive: `<p><b>How the shared pool works.</b> ${C('ArrayPool<T>.Shared')} (TlsOverPerCoreLockedStacksArrayPool) keeps a small per-thread cache plus per-core locked stacks for each power-of-two bucket up to 2<sup>30</sup> elements (1 GB arrays in .NET 8), and trims itself on memory pressure via Gen2 GC callbacks. Arrays larger than the biggest bucket are allocated and dropped normally.</p>
<p><b>MemoryPool and IMemoryOwner.</b> ${C('MemoryPool<T>.Shared.Rent()')} returns an ${C('IMemoryOwner<T>')} whose Dispose returns the memory — ownership expressed with using. System.IO.Pipelines builds on this for high-performance networking (Kestrel).</p>
<p><b>Object pooling.</b> ${C('Microsoft.Extensions.ObjectPool')} pools arbitrary objects (StringBuilders in ASP.NET Core). Pool only objects that are expensive to create or large; pooling small objects can be slower than the GC's gen0 path.</p>
<p><b>Frozen and immutable data.</b> For data built once and read often, ${C('FrozenDictionary')} (.NET 8) trades build time for faster lookups and fewer objects.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes pooling code correctly on the happy path but rarely reasons about lifetimes. <b>Use AI as a partner:</b> <code>Check every ArrayPool.Rent in this file: is the returned length respected, is Return in a finally, can the array be used after Return?</code> <b>Where AI goes wrong:</b> treating ${C('Rent(n).Length')} as n, returning arrays twice, storing rented arrays in long-lived objects, pooling tiny objects where the GC is faster. <b>What you must still own:</b> proving the optimisation with a benchmark and accepting the added complexity only where it pays.</p>`
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Sum a Range Through a Span', level: 'Easy', tags: ['Span', 'slicing'], companies: ['Microsoft', 'Amazon'],
    statement: `<p>Return the sum of ${C('a[l..r]')} inclusive as a ${C('long')}, by slicing the array with ${C('AsSpan(l, r - l + 1)')} and summing the span.</p>`,
    constraints: `1 ≤ a.Length ≤ 10<sup>5</sup>, 0 ≤ l ≤ r &lt; a.Length, |a[i]| ≤ 10<sup>9</sup>`,
    example: `<p>a = [1, 2, 3, 4, 5], l = 1, r = 3 → 9.</p>`,
    brute: { why: `<p>${C('a.Skip(l).Take(r - l + 1).Sum(x => (long)x)')} gives the same result but allocates iterator objects and a delegate and runs far slower. ${C('a[l..(r + 1)].Sum()')} on an array allocates a copy of the range.</p>`, code: R`
static long SumLinq(int[] a, int l, int r) => a.Skip(l).Take(r - l + 1).Sum(x => (long)x);` },
    mcq: { q: 'What does `a[1..4]` do when `a` is an int[]?', options: ['Allocates a new array with 3 elements', 'Returns a span', 'Returns a view without copying', 'Does not compile'], answer: 0, explain: 'A range on an array calls RuntimeHelpers.GetSubArray, which copies. Use a.AsSpan(1..4) for a view.' },
    hints: [`<p>${C('ReadOnlySpan<int> s = a.AsSpan(l, r - l + 1);')}</p>`, `<p>Accumulate in a ${C('long')}: up to 10<sup>5</sup> values of 10<sup>9</sup> overflow an int.</p>`, `<p>${C('foreach (int x in s) sum += x;')} has no bounds-check overhead.</p>`],
    solution: {
      approach: `<p>Slice, then loop. The slice costs nothing; the loop is as fast as a raw array loop.</p>`,
      code: R`
public class Solution
{
    public long SumRange(int[] a, int l, int r)
    {
        ReadOnlySpan<int> s = a.AsSpan(l, r - l + 1);
        long sum = 0;
        foreach (int x in s) sum += x;
        return sum;
    }
}`,
      complexity: `<p>O(r − l + 1) time, O(1) space.</p>`,
      followUps: ['Answer many queries: precompute prefix sums', 'Vectorize with System.Numerics.Vector&lt;T&gt;']
    },
    tests: { sig: 'int[] int int -> long', fn: 'sumRange', cases: [
      [[[1, 2, 3, 4, 5], 1, 3], 9], [[[7], 0, 0], 7], [[[-1, -2, -3], 0, 2], -6], [[[1000000000, 1000000000, 1000000000], 0, 2], 3000000000], [[[5, 0, 5], 1, 1], 0], [[[1, 2, 3, 4, 5], 0, 4], 15]
    ] }
  });

  practice.push({
    title: 'Reverse a Subrange In Place', level: 'Easy', tags: ['Span', 'in place'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Reverse the elements ${C('a[l..r]')} inclusive in place, using a span over that range. The rest of the array stays unchanged.</p>`,
    constraints: `1 ≤ a.Length ≤ 10<sup>5</sup>, 0 ≤ l ≤ r &lt; a.Length`,
    example: `<p>a = [1, 2, 3, 4, 5], l = 1, r = 3 → a becomes [1, 4, 3, 2, 5].</p>`,
    brute: { why: `<p>Copying the range into a new array, reversing it and copying back works but allocates. A two-pointer swap or ${C('Span<T>.Reverse()')} works in place.</p>`, code: R`
static void ReverseCopy(int[] a, int l, int r)
{
    var part = a[l..(r + 1)];
    Array.Reverse(part);
    part.CopyTo(a, l);
}` },
    mcq: { q: 'Why does reversing a Span&lt;int&gt; created from an array change the array?', options: ['The span is a view over the array memory', 'Span copies back on dispose', 'Arrays are immutable', 'It does not change the array'], answer: 0, explain: 'Span&lt;T&gt; refers to the same memory; writes through it are writes to the array.' },
    hints: [`<p>${C('Span<int> s = a.AsSpan(l, r - l + 1);')}</p>`, `<p>${C('s.Reverse();')} is a vectorized in-place reverse.</p>`, `<p>Or write the two-pointer swap yourself: ${C('(s[i], s[j]) = (s[j], s[i])')}.</p>`],
    solution: {
      approach: `<p>Create a span over exactly the range and reverse it in place.</p>`,
      code: R`
public class Solution
{
    public void ReverseRange(int[] a, int l, int r)
    {
        Span<int> s = a.AsSpan(l, r - l + 1);
        for (int i = 0, j = s.Length - 1; i < j; i++, j--)
            (s[i], s[j]) = (s[j], s[i]);
    }
}`,
      complexity: `<p>O(r − l) time, O(1) space.</p>`,
      followUps: ['Rotate an array by k using three reversals', 'Reverse words in a char span']
    },
    tests: { sig: 'int[] int int -> void', fn: 'reverseRange', mutate: 0, cases: [
      [[[1, 2, 3, 4, 5], 1, 3], [1, 4, 3, 2, 5]], [[[1], 0, 0], [1]], [[[1, 2], 0, 1], [2, 1]], [[[1, 2, 3, 4, 5], 0, 4], [5, 4, 3, 2, 1]], [[[9, 8, 7], 2, 2], [9, 8, 7]], [[[1, 2, 3, 4], 0, 2], [3, 2, 1, 4]]
    ] }
  });

  practice.push({
    title: 'Boxed Equality Audit', level: 'Easy', tags: ['boxing', 'equality'], companies: ['Microsoft', 'Unity'],
    statement: `<p>Given two int arrays of equal length, box each element into ${C('object')} and return ${C('[e, r]')}: e = how many positions have ${C('boxedA.Equals(boxedB)')} true, r = how many have ${C('ReferenceEquals(boxedA, boxedB)')} (or ${C('==')} on the object variables) true.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>a = [1, 2, 3], b = [1, 5, 3] → ${C('[2, 0]')}: two equal values, but every boxing creates a separate object.</p>`,
    brute: { why: `<p>Comparing the ints directly gives e, but the exercise is to observe that two boxes are never the same object: r is always 0. The CLR does not cache boxed integers.</p>`, code: R`
static int[] Direct(int[] a, int[] b)
{
    int e = 0;
    for (int i = 0; i < a.Length; i++) if (a[i] == b[i]) e++;
    return new[] { e, 0 };
}` },
    mcq: { q: 'object x = 5; object y = x; — is x == y true?', options: ['Yes: both refer to the same box', 'No: each variable boxes again', 'It throws', 'Only in Debug'], answer: 0, explain: 'Assignment copies the reference to the existing box; only converting a value type to object boxes.' },
    hints: [`<p>${C('object x = a[i], y = b[i];')} — two boxing conversions.</p>`, `<p>${C('x.Equals(y)')} dispatches to ${C('Int32.Equals(object)')}, which compares values.</p>`, `<p>${C('ReferenceEquals(x, y)')} compares identities of the two box objects.</p>`],
    solution: {
      approach: `<p>Box both elements at each index and apply both comparisons. Value equality counts matches; reference equality never matches because each boxing allocates a fresh object.</p>`,
      code: R`
public class Solution
{
    public int[] BoxedEquality(int[] a, int[] b)
    {
        int equalValues = 0, sameObject = 0;
        for (int i = 0; i < a.Length; i++)
        {
            object x = a[i], y = b[i];
            if (x.Equals(y)) equalValues++;
            if (ReferenceEquals(x, y)) sameObject++;
        }
        return new[] { equalValues, sameObject };
    }
}`,
      complexity: `<p>O(n) time; 2n boxing allocations (that is the point).</p>`,
      followUps: ['Rewrite with EqualityComparer&lt;int&gt;.Default to avoid boxing', 'What does string interning do differently for strings?']
    },
    tests: { sig: 'int[] int[] -> int[]', fn: 'boxedEquality', cases: [
      [[[1, 2, 3], [1, 5, 3]], [2, 0]], [[[], []], [0, 0]], [[[0], [0]], [1, 0]], [[[1, 2], [3, 4]], [0, 0]], [[[-7, 7, 100], [-7, 7, 100]], [3, 0]], [[[5, 5, 5, 5], [5, 4, 5, 4]], [2, 0]]
    ] }
  });

  practice.push({
    title: 'Sum a CSV Line Without Split', level: 'Medium', tags: ['ReadOnlySpan', 'parsing'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>A line contains comma-separated integers, each possibly surrounded by spaces; an empty (or all-space) field counts as 0. Return the sum as a ${C('long')}. Parse with ${C('ReadOnlySpan<char>')}: find commas with ${C('IndexOf')}, trim with ${C('Trim()')} and parse with ${C('long.Parse(span)')}.</p>`,
    constraints: `0 ≤ line.Length ≤ 10<sup>6</sup>; every field is empty or a valid integer; the sum fits in a long`,
    example: `<p>${C('" 1, 2 ,,30"')} → 33.</p>`,
    brute: { why: `<p>${C('line.Split(\',\').Sum(f => string.IsNullOrWhiteSpace(f) ? 0 : long.Parse(f))')} allocates an array and a string per field plus trimmed copies.</p>`, code: R`
static long SumSplit(string line) =>
    line.Split(',').Sum(f => string.IsNullOrWhiteSpace(f) ? 0L : long.Parse(f));` },
    mcq: { q: 'An empty line "" contains how many fields under these rules?', options: ['One empty field, so the sum is 0', 'Zero fields, sum is undefined', 'It throws', 'Two fields'], answer: 0, explain: 'Like Split, an input without commas is one field; here it is empty and counts as 0.' },
    hints: [`<p>Loop: ${C('int c = rest.IndexOf(\',\')')}; the field is ${C('rest[..c]')} or the whole rest.</p>`, `<p>${C('var f = field.Trim(); if (!f.IsEmpty) sum += long.Parse(f);')}</p>`, `<p>Stop after processing the last field (no comma found).</p>`],
    solution: {
      approach: `<p>Walk the line field by field with span slicing; trimming and parsing work directly on the span.</p>`,
      code: R`
public class Solution
{
    public long SumCsv(string line)
    {
        ReadOnlySpan<char> rest = line;
        long sum = 0;
        while (true)
        {
            int comma = rest.IndexOf(',');
            ReadOnlySpan<char> field = (comma < 0 ? rest : rest[..comma]).Trim();
            if (!field.IsEmpty) sum += long.Parse(field);
            if (comma < 0) return sum;
            rest = rest[(comma + 1)..];
        }
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space, no allocations.</p>`,
      followUps: ['Support quoted fields containing commas', 'Use MemoryExtensions.Split with a Span&lt;Range&gt;']
    },
    tests: { sig: 'string -> long', fn: 'sumCsv', cases: [
      [[' 1, 2 ,,30'], 33], [[''], 0], [['42'], 42], [['-5,5'], 0], [[',,,'], 0], [['9000000000,1'], 9000000001], [['  7  ,  -8  '], -1]
    ] }
  });

  practice.push({
    title: 'Shift Every Point (the Mutable Struct Trap)', level: 'Medium', tags: ['structs', 'copies', 'CollectionsMarshal'], companies: ['Unity', 'Microsoft'],
    statement: `<p>Create a ${C('List<PointS>')} of n struct points and a ${C('List<PointC>')} of n class points, all with X = 0. For each value in ${C('dxs')}, add it to the X of <b>every</b> point in both lists. Return ${C('[sum of struct X, sum of class X]')}. The naive ${C('var p = list[i]; p.X += dx;')} does not work for the structs — make both sums correct.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>4</sup>, 0 ≤ dxs.Length ≤ 100, |dx| ≤ 1000`,
    example: `<p>n = 3, dxs = [1, 2] → ${C('[9, 9]')}.</p>`,
    brute: { why: `<p>The buggy version reads a copy from the indexer, changes the copy and throws it away, returning ${C('[0, 9]')}. ${C('list[i].X += dx')} does not even compile for structs (CS1612). Either write the copy back or mutate in place through a span.</p>`, code: R`
static long[] Buggy(int n, int[] dxs)
{
    var structs = Enumerable.Range(0, n).Select(_ => new PS()).ToList();
    foreach (var dx in dxs)
        for (int i = 0; i < n; i++) { var p = structs[i]; p.X += dx; } // copy lost
    return new long[] { structs.Sum(p => (long)p.X), 0 };
}
struct PS { public int X; }` },
    mcq: { q: 'Why is `list[i].X = 5` a compile error for a List of structs but fine for an array of structs?', options: ['The List indexer returns a copy (a value), while an array element is a variable', 'Lists are read-only', 'Arrays box their elements', 'Structs cannot have public fields'], answer: 0, explain: 'Modifying a temporary copy would be lost, so the compiler rejects it (CS1612); array element access yields the storage location itself.' },
    hints: [`<p>Write back: ${C('var p = list[i]; p.X += dx; list[i] = p;')}</p>`, `<p>Or ${C('Span<PointS> s = CollectionsMarshal.AsSpan(list); s[i].X += dx;')} mutates in place.</p>`, `<p>Sum the X values with a ${C('long')} accumulator to avoid overflow.</p>`],
    solution: {
      approach: `<p>Class points are shared references, so mutating through the indexer works. For structs, mutate the storage itself through ${C('CollectionsMarshal.AsSpan')} (or write the modified copy back).</p>`,
      code: R`
using System.Runtime.InteropServices;

public class Solution
{
    private struct PointS { public int X; }
    private sealed class PointC { public int X; }

    public long[] ShiftAll(int n, int[] dxs)
    {
        var structs = new List<PointS>(n);
        var classes = new List<PointC>(n);
        for (int i = 0; i < n; i++) { structs.Add(new PointS()); classes.Add(new PointC()); }

        foreach (int dx in dxs)
        {
            Span<PointS> span = CollectionsMarshal.AsSpan(structs);
            for (int i = 0; i < span.Length; i++) span[i].X += dx;
            foreach (var c in classes) c.X += dx;
        }

        long sumS = 0, sumC = 0;
        foreach (var p in structs) sumS += p.X;
        foreach (var c in classes) sumC += c.X;
        return new[] { sumS, sumC };
    }
}`,
      complexity: `<p>O(n · |dxs|) time, O(n) space.</p>`,
      followUps: ['Make PointS a readonly struct — how do updates look then?', 'Measure memory: n structs vs n class objects']
    },
    tests: { sig: 'int int[] -> long[]', fn: 'shiftAll', cases: [
      [[3, [1, 2]], [9, 9]], [[0, [5]], [0, 0]], [[5, []], [0, 0]], [[1, [-4]], [-4, -4]], [[10000, [1000, 1000]], [20000000, 20000000]], [[2, [3, -3, 7]], [14, 14]]
    ] }
  });

  practice.push({
    title: 'Fixed-Capacity Ring Buffer', level: 'Medium', tags: ['arrays', 'no allocation', 'design'], companies: ['Microsoft', 'Jane Street'],
    statement: `<p>Implement ${C('RingBuffer(int capacity)')} storing ints in a fixed array allocated once: ${C('Push(x)')} returns false (and stores nothing) when full; ${C('Pop()')} removes and returns the oldest element, or −1 when empty; ${C('Count()')} returns the number of stored elements. No allocations after construction.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>5</sup>; up to 10<sup>5</sup> operations`,
    example: `<p>capacity 2: Push(1) true, Push(2) true, Push(3) false, Pop() 1, Push(3) true, Pop() 2, Pop() 3, Pop() −1.</p>`,
    brute: { why: `<p>A ${C('List<int>')} with ${C('RemoveAt(0)')} is O(n) per pop. ${C('Queue<int>')} is already a ring buffer but grows (reallocates) instead of rejecting when full — not what a bounded buffer for audio or telemetry wants.</p>`, code: R`
class ListBuffer(int capacity)
{
    private readonly List<int> _items = new();
    public bool Push(int x) { if (_items.Count == capacity) return false; _items.Add(x); return true; }
    public int Pop() { if (_items.Count == 0) return -1; int v = _items[0]; _items.RemoveAt(0); return v; }
    public int Count() => _items.Count;
}` },
    mcq: { q: 'With head index h and count c in an array of size n, where does the next Push write?', options: ['(h + c) % n', 'h + 1', '(h - c) % n', 'c'], answer: 0, explain: 'Elements occupy h, h+1, ..., h+c−1 modulo n, so the next free slot is (h + c) mod n.' },
    hints: [`<p>Fields: ${C('int[] _data; int _head; int _count;')}</p>`, `<p>Push writes at ${C('(_head + _count) % _data.Length')}.</p>`, `<p>Pop reads at ${C('_head')} then advances ${C('_head = (_head + 1) % _data.Length')}.</p>`],
    solution: {
      approach: `<p>Head index plus count over a fixed array; indices wrap with modulo. Every operation is O(1) and allocation-free.</p>`,
      code: R`
public class RingBuffer
{
    private readonly int[] _data;
    private int _head, _count;

    public RingBuffer(int capacity) => _data = new int[capacity];

    public bool Push(int x)
    {
        if (_count == _data.Length) return false;
        _data[(_head + _count) % _data.Length] = x;
        _count++;
        return true;
    }

    public int Pop()
    {
        if (_count == 0) return -1;
        int v = _data[_head];
        _head = (_head + 1) % _data.Length;
        _count--;
        return v;
    }

    public int Count() => _count;
}`,
      complexity: `<p>O(1) per operation, O(capacity) memory allocated once.</p>`,
      followUps: ['Overwrite the oldest when full (a sliding log)', 'Make it thread-safe for one producer and one consumer']
    },
    tests: { cls: 'RingBuffer', sigs: { RingBuffer: 'int', push: 'int -> bool', pop: '-> int', count: '-> int' }, cases: [
      { ops: ['RingBuffer', 'push', 'push', 'push', 'pop', 'push', 'pop', 'pop', 'pop'], args: [[2], [1], [2], [3], [], [3], [], [], []], out: [null, true, true, false, 1, true, 2, 3, -1] },
      { ops: ['RingBuffer', 'pop', 'count'], args: [[1], [], []], out: [null, -1, 0] },
      { ops: ['RingBuffer', 'push', 'count', 'pop', 'count', 'push', 'push'], args: [[1], [9], [], [], [], [8], [7]], out: [null, true, 1, 9, 0, true, false] },
      { ops: ['RingBuffer', 'push', 'push', 'push', 'pop', 'pop', 'push', 'push', 'count', 'pop', 'pop', 'pop'], args: [[3], [1], [2], [3], [], [], [4], [5], [], [], [], []], out: [null, true, true, true, 1, 2, true, true, 3, 3, 4, 5] },
      { ops: ['RingBuffer', 'push', 'pop', 'push', 'pop', 'push', 'pop'], args: [[1], [-5], [], [0], [], [7], []], out: [null, true, -5, true, 0, true, 7] },
      { ops: { $concat: [['RingBuffer'], { $rep: 'push', n: 1000 }, ['count']] }, args: { $concat: [[[1000]], { $rep: [1], n: 1000 }, [[]]] }, out: { $concat: [[null], { $rep: true, n: 1000 }, [1000]] } }
    ] }
  });

  practice.push({
    title: 'Hex Encode with string.Create', level: 'Medium', tags: ['string.Create', 'Span', 'formatting'], companies: ['Microsoft', 'Cloudflare'],
    statement: `<p>Given byte values (0–255) as an int array, return their uppercase hexadecimal encoding, two characters per byte, using ${C('string.Create')} to write directly into the result string (no StringBuilder, no per-byte strings).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>, 0 ≤ bytes[i] ≤ 255`,
    example: `<p>[0, 15, 255, 16] → ${C('"000FFF10"')}.</p>`,
    brute: { why: `<p>${C('string.Concat(bytes.Select(b => b.ToString("X2")))')} creates a temporary string per byte. ${C('Convert.ToHexString(byte[])')} is the built-in answer but requires converting the input to a byte array first; the exercise is to write the span version.</p>`, code: R`
static string HexConcat(int[] bytes) => string.Concat(bytes.Select(b => b.ToString("X2")));` },
    mcq: { q: 'What is the state parameter of string.Create for?', options: ['Passing data to a static lambda without allocating a closure', 'Setting the string encoding', 'Choosing the culture', 'Pinning the string'], answer: 0, explain: 'The lambda receives the state as an argument, so it can be static and capture nothing.' },
    hints: [`<p>${C('string.Create(bytes.Length * 2, bytes, static (span, src) => { ... })')}</p>`, `<p>For each byte b: ${C('span[2*i] = Hex[b >> 4]; span[2*i+1] = Hex[b & 15];')}</p>`, `<p>${C('const string Hex = "0123456789ABCDEF";')}</p>`],
    solution: {
      approach: `<p>Allocate the final string once with the exact length and fill its characters through the span with a nibble lookup.</p>`,
      code: R`
public class Solution
{
    private const string Hex = "0123456789ABCDEF";

    public string ToHex(int[] bytes) =>
        string.Create(bytes.Length * 2, bytes, static (span, src) =>
        {
            for (int i = 0; i < src.Length; i++)
            {
                int b = src[i];
                span[2 * i] = Hex[b >> 4];
                span[2 * i + 1] = Hex[b & 0xF];
            }
        });
}`,
      complexity: `<p>O(n) time, one allocation (the result).</p>`,
      followUps: ['Decode hex back into a Span&lt;byte&gt;', 'Compare with Convert.ToHexString in a benchmark']
    },
    tests: { sig: 'int[] -> string', fn: 'toHex', cases: [
      [[[0, 15, 255, 16]], '000FFF10'], [[[]], ''], [[[1]], '01'], [[[171, 205]], 'ABCD'], [[[255, 255]], 'FFFF'], [[[10, 11, 12]], '0A0B0C']
    ] }
  });

  practice.push({
    title: 'Simple Object Pool', level: 'Medium', tags: ['pooling', 'design'], companies: ['Microsoft', 'Unity', 'EA'],
    statement: `<p>Implement ${C('ObjectPool(int maxIdle)')} handing out buffer ids. ${C('Rent()')} returns the most recently returned idle id if any, otherwise creates a new id (0, 1, 2, … in creation order). ${C('GiveBack(id)')} puts the id back in the idle set, unless ${C('maxIdle')} ids are already idle — then it is discarded. ${C('Created()')} returns how many ids were ever created; ${C('Idle()')} how many are idle.</p>`,
    constraints: `0 ≤ maxIdle ≤ 10<sup>4</sup>; ids given back were rented and not yet given back`,
    example: `<p>maxIdle 1: Rent→0, Rent→1, GiveBack(0), GiveBack(1) (discarded: one already idle), Rent→0, Created()→2.</p>`,
    brute: { why: `<p>Allocating a new buffer for every request is simplest; a pool trades a little bookkeeping for far fewer allocations. Unbounded pools leak memory after a burst, which is why maxIdle exists.</p>`, code: R`
class NoPool
{
    private int _created;
    public int Rent() => _created++;
    public void GiveBack(int id) { }
    public int Created() => _created;
    public int Idle() => 0;
}` },
    mcq: { q: 'Why return the most recently returned item first (LIFO)?', options: ['It is likely still in CPU cache', 'It is required by the GC', 'FIFO is impossible', 'To avoid boxing'], answer: 0, explain: 'LIFO reuse touches memory that was used moments ago — better cache locality. ArrayPool uses stacks for the same reason.' },
    hints: [`<p>Keep a ${C('Stack<int>')} of idle ids and a counter of created ids.</p>`, `<p>${C('Rent')}: ${C('_idle.TryPop(out var id) ? id : _created++')}.</p>`, `<p>${C('GiveBack')}: push only if ${C('_idle.Count < maxIdle')}.</p>`],
    solution: {
      approach: `<p>A bounded LIFO stack of idle items plus a creation counter.</p>`,
      code: R`
public class ObjectPool
{
    private readonly Stack<int> _idle = new();
    private readonly int _maxIdle;
    private int _created;

    public ObjectPool(int maxIdle) => _maxIdle = maxIdle;

    public int Rent() => _idle.TryPop(out int id) ? id : _created++;

    public void GiveBack(int id)
    {
        if (_idle.Count < _maxIdle) _idle.Push(id);
    }

    public int Created() => _created;
    public int Idle() => _idle.Count;
}`,
      complexity: `<p>O(1) per operation; at most maxIdle idle items retained.</p>`,
      followUps: ['Make it thread-safe with ConcurrentBag or a lock', 'Reset object state on return (pooled policy)']
    },
    tests: { cls: 'ObjectPool', sigs: { ObjectPool: 'int', rent: '-> int', giveBack: 'int -> void', created: '-> int', idle: '-> int' }, cases: [
      { ops: ['ObjectPool', 'rent', 'rent', 'giveBack', 'giveBack', 'rent', 'created'], args: [[1], [], [], [0], [1], [], []], out: [null, 0, 1, null, null, 0, 2] },
      { ops: ['ObjectPool', 'rent', 'giveBack', 'idle', 'rent', 'idle'], args: [[0], [], [0], [], [], []], out: [null, 0, null, 0, 1, 0] },
      { ops: ['ObjectPool', 'rent', 'rent', 'rent', 'giveBack', 'giveBack', 'rent', 'rent', 'rent', 'created'], args: [[5], [], [], [], [2], [0], [], [], [], []], out: [null, 0, 1, 2, null, null, 0, 2, 3, 4] },
      { ops: ['ObjectPool', 'created', 'idle'], args: [[3], [], []], out: [null, 0, 0] },
      { ops: ['ObjectPool', 'rent', 'giveBack', 'rent', 'giveBack', 'rent', 'created', 'idle'], args: [[2], [], [0], [], [0], [], [], []], out: [null, 0, null, 0, null, 0, 1, 0] },
      { ops: ['ObjectPool', 'rent', 'rent', 'rent', 'giveBack', 'giveBack', 'giveBack', 'idle'], args: [[2], [], [], [], [0], [1], [2], []], out: [null, 0, 1, 2, null, null, null, 2] }
    ] }
  });

  practice.push({
    title: 'Merge Two Sorted Arrays into a Span', level: 'Medium', tags: ['Span', 'two pointers'], companies: ['Google', 'Microsoft'],
    statement: `<p>Merge two sorted arrays into a new sorted array. Write the merge as a method ${C('MergeInto(ReadOnlySpan<int> a, ReadOnlySpan<int> b, Span<int> dest)')} and call it with a result array allocated once.</p>`,
    constraints: `0 ≤ a.Length, b.Length ≤ 10<sup>5</sup>; both sorted ascending`,
    example: `<p>[1, 4, 7] and [2, 3, 9] → [1, 2, 3, 4, 7, 9].</p>`,
    brute: { why: `<p>${C('a.Concat(b).OrderBy(x => x).ToArray()')} is O((n+m) log(n+m)) and allocates several temporary buffers; the two-pointer merge is linear and writes once.</p>`, code: R`
static int[] MergeSortAll(int[] a, int[] b) => a.Concat(b).OrderBy(x => x).ToArray();` },
    mcq: { q: 'Why take ReadOnlySpan&lt;int&gt; parameters instead of int[]?', options: ['Callers can pass arrays, slices or stack buffers without copying', 'Spans are sorted automatically', 'Arrays cannot be read', 'It makes the method async'], answer: 0, explain: 'Span-based signatures generalize over all contiguous memory and make intent (read-only input) explicit.' },
    hints: [`<p>Three indices i, j, k; take the smaller head each step.</p>`, `<p>When one input is exhausted, ${C('CopyTo')} the rest of the other into ${C('dest[k..]')}.</p>`, `<p>Take from a when ${C('a[i] <= b[j]')} to keep the merge stable.</p>`],
    solution: {
      approach: `<p>The classic merge step of merge sort, expressed over spans, with bulk copies for the tails.</p>`,
      code: R`
public class Solution
{
    public int[] Merge(int[] a, int[] b)
    {
        var result = new int[a.Length + b.Length];
        MergeInto(a, b, result);
        return result;
    }

    private static void MergeInto(ReadOnlySpan<int> a, ReadOnlySpan<int> b, Span<int> dest)
    {
        int i = 0, j = 0, k = 0;
        while (i < a.Length && j < b.Length)
            dest[k++] = a[i] <= b[j] ? a[i++] : b[j++];
        a[i..].CopyTo(dest[k..]);
        k += a.Length - i;
        b[j..].CopyTo(dest[k..]);
    }
}`,
      complexity: `<p>O(n + m) time, one allocation for the result.</p>`,
      followUps: ['Merge in place when a has spare capacity at the end (LeetCode 88)', 'Merge k sorted spans with a PriorityQueue']
    },
    tests: { sig: 'int[] int[] -> int[]', fn: 'merge', cases: [
      [[[1, 4, 7], [2, 3, 9]], [1, 2, 3, 4, 7, 9]], [[[], []], []], [[[1], []], [1]], [[[], [5, 6]], [5, 6]], [[[1, 1, 1], [1, 1]], [1, 1, 1, 1, 1]], [[[-5, 0, 5], [-10, 10]], [-10, -5, 0, 5, 10]]
    ] }
  });

  practice.push({
    title: 'Generational GC Simulator', level: 'Hard', tags: ['GC', 'generations', 'simulation', 'design'], companies: ['Microsoft', 'Google'],
    statement: `<p>Simulate a generational collector. ${C('Alloc(id)')} creates a reachable object in gen 0. ${C('Drop(id)')} makes it unreachable. ${C('Collect(g)')} collects generations 0..g: every unreachable object in those generations is freed, every reachable one is promoted one generation (max 2); objects in older generations are not examined. It returns the number freed. ${C('GenOf(id)')} returns the object's generation, or −1 if it was freed or never allocated.</p>`,
    constraints: `ids are distinct non-negative ints; up to 10<sup>4</sup> operations; Drop is only called on live objects`,
    example: `<p>Alloc 1, Alloc 2, Drop 1, Collect(0) → 1 freed; GenOf(2) → 1; Drop 2, Collect(0) → 0 (2 is in gen 1); Collect(1) → 1.</p>`,
    brute: { why: `<p>A non-generational collector would examine every object on every collection (always "Collect(2)"), which is correct but does work proportional to the whole heap. The generational version examines only young objects most of the time.</p>`, code: R`
class FullGc
{
    private readonly Dictionary<int, bool> _live = new();
    public void Alloc(int id) => _live[id] = true;
    public void Drop(int id) => _live[id] = false;
    public int Collect(int g) { var dead = _live.Where(p => !p.Value).Select(p => p.Key).ToList(); dead.ForEach(d => _live.Remove(d)); return dead.Count; }
}` },
    mcq: { q: 'An object dropped while in gen 2 is freed by…', options: ['Only a Collect(2)', 'The next Collect(0)', 'Any collection', 'Never'], answer: 0, explain: 'Gen 0 and gen 1 collections do not examine gen 2, so old garbage waits for a full collection.' },
    hints: [`<p>Store per object: generation and reachable flag (${C('Dictionary<int, (int Gen, bool Live)>')}).</p>`, `<p>In Collect, iterate over a snapshot of the keys; free or promote those with ${C('Gen <= g')}.</p>`, `<p>Promotion of a survivor: ${C('Math.Min(gen + 1, 2)')} — gen 2 is the oldest.</p>`],
    solution: {
      approach: `<p>Keep each object's generation and liveness. A collection only scans objects in the collected generations, freeing the dead and promoting the survivors — exactly the policy of the real GC, minus the marking.</p>`,
      code: R`
public class GcSim
{
    private readonly Dictionary<int, (int Gen, bool Live)> _objs = new();

    public void Alloc(int id) => _objs[id] = (0, true);

    public void Drop(int id)
    {
        if (_objs.TryGetValue(id, out var o)) _objs[id] = (o.Gen, false);
    }

    public int Collect(int g)
    {
        int freed = 0;
        foreach (int id in _objs.Keys.ToList())
        {
            var (gen, live) = _objs[id];
            if (gen > g) continue;
            if (!live) { _objs.Remove(id); freed++; }
            else _objs[id] = (Math.Min(gen + 1, 2), true);
        }
        return freed;
    }

    public int GenOf(int id) => _objs.TryGetValue(id, out var o) ? o.Gen : -1;
}`,
      complexity: `<p>Collect is O(number of objects) in this simple version; real GCs keep per-generation regions so they touch only the collected generations.</p>`,
      followUps: ['Keep a separate set per generation so Collect(0) is O(gen0 size)', 'Add references between objects and mark from roots']
    },
    tests: { cls: 'GcSim', sigs: { GcSim: '', alloc: 'int -> void', drop: 'int -> void', collect: 'int -> int', genOf: 'int -> int' }, cases: [
      { ops: ['GcSim', 'alloc', 'alloc', 'drop', 'collect', 'genOf', 'drop', 'collect', 'collect', 'genOf'], args: [[], [1], [2], [1], [0], [2], [2], [0], [1], [2]], out: [null, null, null, null, 1, 1, null, 0, 1, -1] },
      { ops: ['GcSim', 'genOf', 'collect'], args: [[], [5], [2]], out: [null, -1, 0] },
      { ops: ['GcSim', 'alloc', 'collect', 'collect', 'collect', 'genOf', 'collect', 'genOf'], args: [[], [7], [0], [1], [0], [7], [2], [7]], out: [null, null, 0, 0, 0, 2, 0, 2] },
      { ops: ['GcSim', 'alloc', 'alloc', 'alloc', 'drop', 'drop', 'collect', 'genOf', 'genOf'], args: [[], [1], [2], [3], [1], [3], [2], [1], [2]], out: [null, null, null, null, null, null, 2, -1, 1] },
      { ops: ['GcSim', 'alloc', 'collect', 'collect', 'drop', 'collect', 'collect', 'collect'], args: [[], [4], [1], [1], [4], [0], [1], [2]], out: [null, null, 0, 0, null, 0, 0, 1] },
      { ops: ['GcSim', 'alloc', 'alloc', 'collect', 'alloc', 'drop', 'drop', 'collect', 'genOf', 'collect'], args: [[], [1], [2], [0], [3], [1], [3], [0], [2], [1]], out: [null, null, null, 0, null, null, null, 1, 1, 1] }
    ] }
  });

  practice.push({
    title: 'Run-Length Encode with a Pooled Buffer', level: 'Hard', tags: ['ArrayPool', 'Span', 'encoding'], companies: ['Microsoft', 'Dropbox'],
    statement: `<p>Encode a string by replacing each maximal run of the same character with the character followed by the run length: ${C('"aaabcc"')} → ${C('"a3b1c2"')}. Write the output into a ${C('char')} buffer rented from ${C('ArrayPool<char>.Shared')}, sized for the worst case, and return it to the pool in a ${C('finally')} block.</p>`,
    constraints: `0 ≤ s.Length ≤ 10<sup>6</sup>`,
    example: `<p>${C('"aaabcc"')} → ${C('"a3b1c2"')}; ${C('"zzzzzzzzzzzz"')} → ${C('"z12"')}.</p>`,
    brute: { why: `<p>${C('result += c + count.ToString()')} builds a new string per run — O(n²) copying. A StringBuilder is fine; the pooled buffer additionally avoids the builder's chunk allocations for large repeated calls.</p>`, code: R`
static string RleConcat(string s)
{
    string r = "";
    for (int i = 0; i < s.Length;)
    {
        int j = i;
        while (j < s.Length && s[j] == s[i]) j++;
        r += s[i] + (j - i).ToString();
        i = j;
    }
    return r;
}` },
    mcq: { q: 'What is a safe worst-case output length for input length n?', options: ['2n', 'n', 'n / 2', 'n + 10'], answer: 0, explain: 'A run of length L produces 1 + digits(L) characters, which is at most 2L; summing over runs gives at most 2n (reached when every run has length 1).' },
    hints: [`<p>${C('char[] buf = ArrayPool<char>.Shared.Rent(Math.Max(1, 2 * s.Length));')}</p>`, `<p>Write the run length with ${C('runLength.TryFormat(buf.AsSpan(pos), out int written)')}.</p>`, `<p>Return ${C('new string(buf, 0, pos)')} and give the buffer back in finally.</p>`],
    solution: {
      approach: `<p>Scan runs; for each, write the character and format the count directly into the rented span. Only the final string is allocated.</p>`,
      code: R`
using System.Buffers;

public class Solution
{
    public string Rle(string s)
    {
        char[] buf = ArrayPool<char>.Shared.Rent(Math.Max(1, 2 * s.Length));
        try
        {
            int pos = 0;
            for (int i = 0; i < s.Length;)
            {
                int j = i;
                while (j < s.Length && s[j] == s[i]) j++;
                buf[pos++] = s[i];
                (j - i).TryFormat(buf.AsSpan(pos), out int written);
                pos += written;
                i = j;
            }
            return new string(buf, 0, pos);
        }
        finally
        {
            ArrayPool<char>.Shared.Return(buf);
        }
    }
}`,
      complexity: `<p>O(n) time; O(n) pooled scratch space, one allocation for the result.</p>`,
      followUps: ['Write the decoder', 'Skip the count when it is 1 — how does the worst case change?']
    },
    tests: { sig: 'string -> string', fn: 'rle', cases: [
      [['aaabcc'], 'a3b1c2'], [[''], ''], [['a'], 'a1'], [['zzzzzzzzzzzz'], 'z12'], [['abab'], 'a1b1a1b1'], [['  !!'], ' 2!2'], [[{ $rep: 'x', n: 100000 }], 'x100000']
    ] }
  });

  practice.push({
    title: 'Add Big Decimal Strings with string.Create', level: 'Hard', tags: ['string.Create', 'Span', 'big numbers'], companies: ['Google', 'Microsoft', 'Stripe'],
    statement: `<p>Given two non-negative integers as decimal strings (no leading zeros except the number 0 itself), return their sum as a string. Compute the exact result length first, then produce the string with a single ${C('string.Create')} call that writes digits from the right.</p>`,
    constraints: `1 ≤ a.Length, b.Length ≤ 10<sup>5</sup>`,
    example: `<p>"999" + "1" → "1000"; "123" + "4567" → "4690".</p>`,
    brute: { why: `<p>${C('BigInteger.Parse(a) + BigInteger.Parse(b)')} is correct and fast, but allocates two BigIntegers and their arrays; building the result by string concatenation per digit is quadratic. The single-allocation version shows how to compute a size first and fill once.</p>`, code: R`
static string AddBig(string a, string b) =>
    (System.Numerics.BigInteger.Parse(a) + System.Numerics.BigInteger.Parse(b)).ToString();` },
    mcq: { q: 'How do you know the result length before writing?', options: ['max(len) + 1 if the most significant addition carries, else max(len) — determined by a first pass', 'Always max(len) + 1', 'Always max(len)', 'You cannot know it'], answer: 0, explain: 'A first right-to-left pass computes the final carry; the length is max + final carry.' },
    hints: [`<p>First pass: simulate the addition just to get the final carry.</p>`, `<p>${C('string.Create(len, (a, b), static (span, st) => { ... })')} — fill from ${C('span.Length - 1')} down.</p>`, `<p>If the final carry is 1, the extra leading slot gets it: ${C('span[0] = \'1\'')}.</p>`],
    solution: {
      approach: `<p>Two passes: one to find the final carry (and therefore the length), one inside string.Create to write each digit directly into the result.</p>`,
      code: R`
public class Solution
{
    public string AddStrings(string a, string b)
    {
        int max = Math.Max(a.Length, b.Length);
        int carry = 0;
        for (int k = 0; k < max; k++)
        {
            int da = k < a.Length ? a[a.Length - 1 - k] - '0' : 0;
            int db = k < b.Length ? b[b.Length - 1 - k] - '0' : 0;
            carry = (da + db + carry) / 10;
        }
        return string.Create(max + carry, (a, b), static (span, st) =>
        {
            var (x, y) = st;
            int c = 0;
            for (int k = 0; k < Math.Max(x.Length, y.Length); k++)
            {
                int dx = k < x.Length ? x[x.Length - 1 - k] - '0' : 0;
                int dy = k < y.Length ? y[y.Length - 1 - k] - '0' : 0;
                int s = dx + dy + c;
                span[span.Length - 1 - k] = (char)('0' + s % 10);
                c = s / 10;
            }
            if (c == 1) span[0] = '1';
        });
    }
}`,
      complexity: `<p>O(n) time, one allocation of exactly the result size.</p>`,
      followUps: ['Multiply two big strings (schoolbook) with one result buffer', 'Process 9 digits at a time with long arithmetic']
    },
    tests: { sig: 'string string -> string', fn: 'addStrings', cases: [
      [['999', '1'], '1000'], [['123', '4567'], '4690'], [['0', '0'], '0'], [['5', '5'], '10'], [['1', '99999'], '100000'], [['12345678901234567890', '98765432109876543210'], '111111111011111111100'], [[{ $rep: '9', n: 1000 }, '1'], { $concat: ['1', { $rep: '0', n: 1000 }] }]
    ] }
  });

  practice.push({
    title: 'Sliding Window Maximum with a Pooled Deque', level: 'Hard', tags: ['ArrayPool', 'monotonic deque'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Return the maximum of every window of size k. Implement the monotonic deque as indices stored in an int array rented from ${C('ArrayPool<int>.Shared')} (head/tail pointers, no ${C('LinkedList')} nodes), and return the buffer to the pool when done.</p>`,
    constraints: `1 ≤ k ≤ n ≤ 10<sup>5</sup>, |a[i]| ≤ 10<sup>9</sup>`,
    example: `<p>a = [1, 3, −1, −3, 5, 3, 6, 7], k = 3 → [3, 3, 5, 5, 6, 7].</p>`,
    brute: { why: `<p>Scanning each window is O(n·k) — 10<sup>10</sup> steps in the worst case. A deque-of-indices solution is O(n); using ${C('LinkedList<int>')} for it allocates a node per push, the pooled array allocates nothing per element.</p>`, code: R`
static int[] MaxWindowBrute(int[] a, int k)
{
    var r = new int[a.Length - k + 1];
    for (int i = 0; i + k <= a.Length; i++)
    {
        int m = int.MinValue;
        for (int j = i; j < i + k; j++) m = Math.Max(m, a[j]);
        r[i] = m;
    }
    return r;
}` },
    mcq: { q: 'Why can the deque live in an array of size n with head and tail only moving forward?', options: ['Each index is pushed once and popped at most once, so tail never exceeds n', 'Because k ≤ n', 'Arrays grow automatically', 'The pool resizes it'], answer: 0, explain: 'Indices enter at the tail in increasing order exactly once; both pointers only advance, bounded by n.' },
    hints: [`<p>${C('int[] dq = ArrayPool<int>.Shared.Rent(n); int head = 0, tail = 0;')}</p>`, `<p>For each i: pop from the tail while ${C('a[dq[tail - 1]] <= a[i]')}; push i; pop the head if ${C('dq[head] <= i - k')}.</p>`, `<p>From i ≥ k − 1, the answer is ${C('a[dq[head]]')}.</p>`],
    solution: {
      approach: `<p>The deque holds indices with decreasing values; the head is the window maximum. Both ends are pointers into one rented array.</p>`,
      code: R`
using System.Buffers;

public class Solution
{
    public int[] MaxWindow(int[] a, int k)
    {
        var result = new int[a.Length - k + 1];
        int[] dq = ArrayPool<int>.Shared.Rent(a.Length);
        try
        {
            int head = 0, tail = 0;
            for (int i = 0; i < a.Length; i++)
            {
                while (tail > head && a[dq[tail - 1]] <= a[i]) tail--;
                dq[tail++] = i;
                if (dq[head] <= i - k) head++;
                if (i >= k - 1) result[i - k + 1] = a[dq[head]];
            }
            return result;
        }
        finally
        {
            ArrayPool<int>.Shared.Return(dq);
        }
    }
}`,
      complexity: `<p>O(n) time; O(n) pooled scratch memory, one allocation for the result.</p>`,
      followUps: ['Window minimum at the same time', 'Stream version: values arrive one by one']
    },
    tests: { sig: 'int[] int -> int[]', fn: 'maxWindow', cases: [
      [[[1, 3, -1, -3, 5, 3, 6, 7], 3], [3, 3, 5, 5, 6, 7]], [[[1], 1], [1]], [[[4, 2], 2], [4]], [[[1, 2, 3, 4], 1], [1, 2, 3, 4]], [[[9, 8, 7, 6], 2], [9, 8, 7]], [[[-1000000000, 1000000000, -5], 2], [1000000000, 1000000000]], [[{ $range: [0, 100000] }, 100000], [99999]]
    ] }
  });

  practice.push({
    title: 'Sum Values for a Key', level: 'Medium', tags: ['ReadOnlySpan', 'parsing'], companies: ['Microsoft', 'Datadog'],
    statement: `<p>A record looks like ${C('"a=1;b=22;a=3"')}: pairs ${C('key=value')} separated by semicolons (values are integers, keys contain no ${C('=')} or ${C(';')}). Return the sum of the values whose key equals ${C('key')} exactly, scanning with spans — no Split, no Substring.</p>`,
    constraints: `0 ≤ s.Length ≤ 10<sup>6</sup>; every non-empty segment is a valid pair; sums fit in a long`,
    example: `<p>${C('"a=1;b=22;a=3"')}, key "a" → 4.</p>`,
    brute: { why: `<p>${C('s.Split(\';\').Select(p => p.Split(\'=\'))')} allocates arrays and strings for every pair, though only matching keys matter.</p>`, code: R`
static long SumSplit(string s, string key) =>
    s.Split(';', StringSplitOptions.RemoveEmptyEntries)
     .Select(p => p.Split('='))
     .Where(kv => kv[0] == key)
     .Sum(kv => long.Parse(kv[1]));` },
    mcq: { q: 'How do you compare a ReadOnlySpan&lt;char&gt; with a string without allocating?', options: ['span.SequenceEqual(key) or span.Equals(key, StringComparison.Ordinal)', 'span.ToString() == key', 'span == key', 'You cannot'], answer: 0, explain: 'Both compare characters in place; ToString would allocate a new string.' },
    hints: [`<p>Loop over segments split at ${C(';')} with ${C('IndexOf')}; skip empty segments.</p>`, `<p>Within a segment, ${C('int eq = seg.IndexOf(\'=\')')}.</p>`, `<p>${C('if (seg[..eq].SequenceEqual(key)) sum += long.Parse(seg[(eq + 1)..]);')}</p>`],
    solution: {
      approach: `<p>Two levels of span slicing: segments by ';', then key/value by '='. Only matching values are parsed.</p>`,
      code: R`
public class Solution
{
    public long SumForKey(string s, string key)
    {
        ReadOnlySpan<char> rest = s;
        long sum = 0;
        while (!rest.IsEmpty)
        {
            int semi = rest.IndexOf(';');
            ReadOnlySpan<char> seg = semi < 0 ? rest : rest[..semi];
            rest = semi < 0 ? ReadOnlySpan<char>.Empty : rest[(semi + 1)..];
            if (seg.IsEmpty) continue;
            int eq = seg.IndexOf('=');
            if (seg[..eq].SequenceEqual(key)) sum += long.Parse(seg[(eq + 1)..]);
        }
        return sum;
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space, no allocations.</p>`,
      followUps: ['Make the key comparison case-insensitive', 'Return all values for the key as a list']
    },
    tests: { sig: 'string string -> long', fn: 'sumForKey', cases: [
      [['a=1;b=22;a=3', 'a'], 4], [['', 'a'], 0], [['a=1', 'b'], 0], [['ab=5;a=2', 'a'], 2], [['x=-4;;x=10;', 'x'], 6], [['k=9000000000;k=1', 'k'], 9000000001], [['b=22', 'b'], 22]
    ] }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Where is an int field of a class instance stored?', options: ['Inside the object on the managed heap', 'Always on the stack', 'In a separate heap box', 'In a CPU register'], answer: 0, explain: 'A value type lives wherever its container lives; a field is part of its containing object.' },
    { q: 'What does `object o = 42;` do?', options: ['Allocates a box on the heap containing a copy of 42', 'Stores 42 in the reference', 'Nothing — int already is an object', 'Creates a Nullable&lt;int&gt;'.replace('<', '&lt;').replace('>', '&gt;')], answer: 0, explain: 'Converting a value type to object or an interface boxes it: a heap allocation plus a copy.' },
    { q: '`object a = 1, b = 1;` — what are `a == b` and `a.Equals(b)`?', options: ['False, True', 'True, True', 'False, False', 'True, False'], answer: 0, explain: '== on object compares references (two separate boxes); Equals is overridden by Int32 to compare values.' },
    { q: 'Objects of at least how many bytes go to the Large Object Heap by default?', options: ['85,000', '8,500', '1 MB', '64 KB'], answer: 0, explain: 'The LOH threshold is 85,000 bytes (configurable with GCLOHThreshold).' },
    { q: 'A gen 1 collection collects…', options: ['Generations 0 and 1', 'Only generation 1', 'Generations 1 and 2', 'Everything'], answer: 0, explain: 'Collecting generation N always includes all younger generations.' },
    { q: 'Why is a finalizer expensive even if it does nothing?', options: ['The object is registered for finalization and survives at least one extra GC', 'It runs on every allocation', 'It blocks the main thread', 'It disables the GC'], answer: 0, explain: 'Finalizable objects are tracked from allocation and promoted when found dead so the finalizer can run.' },
    { q: 'What does GC.SuppressFinalize(this) do in Dispose?', options: ['Removes the object from the finalization queue because cleanup already happened', 'Disposes all fields', 'Forces a GC', 'Prevents the object from being collected'], answer: 0, explain: 'After explicit cleanup the finalizer is unnecessary; suppressing it lets the GC free the object in one pass.' },
    { q: 'Which of these is NOT allowed for a Span&lt;T&gt; local?', options: ['Using it after an await in an async method', 'Slicing it', 'Passing it to a synchronous method', 'Iterating it with foreach'], answer: 0, explain: 'Span is a ref struct and cannot be preserved across await (it might live on the stack).' },
    { q: 'What is the difference between Span&lt;T&gt; and Memory&lt;T&gt;?', options: ['Memory&lt;T&gt; can be stored on the heap (fields, async); Span&lt;T&gt; is stack-only but faster to access'.replace(/</g, '&lt;').replace(/>/g, '&gt;'), 'Memory&lt;T&gt; copies the data'.replace(/</g, '&lt;').replace(/>/g, '&gt;'), 'Span&lt;T&gt; is read-only'.replace(/</g, '&lt;').replace(/>/g, '&gt;'), 'They are identical'], answer: 0, explain: 'Memory is a regular struct usable anywhere; call .Span to get a span for synchronous work.' },
    { q: '`int[] a = {1,2,3,4}; var s = a[1..3];` — what is s?', options: ['A new int[] {2, 3}', 'A Span&lt;int&gt; over a'.replace('<', '&lt;').replace('>', '&gt;'), 'A view that writes through to a', 'A compile error'], answer: 0, explain: 'Range indexing an array copies (GetSubArray). a.AsSpan(1..3) would be a view.' },
    { q: 'Which is true about ArrayPool&lt;T&gt;.Shared.Rent(100)?', options: ['It may return an array longer than 100 that contains old data', 'It returns exactly 100 zeroed elements', 'It allocates on the stack', 'The array must not be returned'], answer: 0, explain: 'Rent returns at least the requested length, rounded up to a bucket size, and does not clear by default.' },
    { q: 'Why should stackalloc sizes be bounded?', options: ['The stack is small (about 1 MB) and overflowing it kills the process', 'stackalloc is slower than new', 'The GC must scan it', 'It only supports 256 bytes'], answer: 0, explain: 'StackOverflowException cannot be caught; use a size threshold and fall back to the heap or a pool.' },
    { q: 'A struct used as a Dictionary key without overriding Equals/GetHashCode…', options: ['Works but uses slow ValueType.Equals, which can box and use reflection', 'Does not compile', 'Uses reference equality', 'Is always fast'], answer: 0, explain: 'Implement IEquatable&lt;T&gt; or use a record struct for efficient value equality.'.replace('<', '&lt;').replace('>', '&gt;') },
    { q: 'Which change avoids a closure allocation in `list.Select(x => x * factor)` where factor is a local?', options: ['Pass factor through an API state parameter and use a static lambda', 'Mark the lambda async', 'Use var', 'Use a struct list'], answer: 0, explain: 'Capturing a local creates a closure object; static lambdas cannot capture, so state must be passed explicitly.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'Do value types always live on the stack?', level: 'B', a: `<p>No. A value type lives wherever its container lives. Locals and parameters of value types usually live in the stack frame or in registers. But a value-type <b>field</b> lives inside its containing object on the heap; elements of a value-type array live inside the array object on the heap; a boxed value lives in a heap box; and locals captured by lambdas or alive across ${C('await')}/${C('yield')} are hoisted into compiler-generated heap objects. The real difference is semantics: value types are copied on assignment, reference types share an object.</p>`, followUps: ['When would a local reference-type variable not need a heap allocation (.NET 9)?'] },
    { q: 'What is boxing, what does it cost, and where does it hide?', level: 'I', a: `<p>Boxing converts a value type to ${C('object')} or an interface: the runtime allocates a heap object (header + method table + value, 24 bytes for an int on 64-bit) and copies the value in; unboxing checks the exact type and copies it out. The cost is the allocation and later GC work. It hides in non-generic collections, passing structs to ${C('object')} parameters (old ${C('string.Format')}, logging APIs), casting structs to interfaces, calling non-overridden ${C('Equals/GetHashCode')} on structs, and closures capturing structs. Generics with constraints, ${C('IEquatable<T>')} and interpolated string handlers avoid it.</p>`, followUps: ['How would you find boxing in a hot path?'] },
    { q: 'Explain the generational GC.', level: 'I', a: `<p>The heap is divided into gen 0 (new objects), gen 1 (survived one collection) and gen 2 (long-lived), plus the LOH for objects ≥ 85,000 bytes and the POH for pinned arrays. Most objects die young, so gen 0 is collected often and cheaply; a gen N collection includes all younger generations; survivors are promoted and compacted so allocation stays a pointer bump. A card table, maintained by a write barrier, records old-to-young references so young collections do not scan the old heap. Gen 2 collections are expensive and run mostly in the background (concurrent GC).</p>`, followUps: ['What is the mid-life crisis problem?', 'Workstation vs server GC?'] },
    { q: 'What is the Large Object Heap and why does it matter?', level: 'I', a: `<p>Objects of 85,000 bytes or more (typically big arrays and strings) are allocated on the LOH, which is logically part of gen 2: it is only collected during full collections, and by default it is swept, not compacted, because moving large blocks is expensive. Frequently allocating and releasing large buffers therefore triggers gen 2 GCs and fragments memory. Solutions: pool large buffers with ${C('ArrayPool')}, reuse them, stream data in smaller chunks, or compact once with ${C('GCSettings.LargeObjectHeapCompactionMode')}.</p>`, followUps: ['How can a List&lt;T&gt; end up on the LOH?'.replace('<', '&lt;').replace('>', '&gt;')] },
    { q: 'Finalizer vs Dispose: when do you need each?', level: 'I', a: `<p>${C('Dispose')} is deterministic cleanup called by the owner (usually through ${C('using')}); every class owning disposables or unmanaged resources implements it. A finalizer is a non-deterministic safety net run by the GC's finalizer thread when the owner forgot to dispose; it is only needed for classes that <b>directly</b> own unmanaged resources, and nowadays those should wrap them in ${C('SafeHandle')} so that even they need no finalizer. Finalizers make allocation slower, keep objects alive an extra GC, run in no particular order and may not run at process exit.</p>`, followUps: ['Walk me through Dispose(bool disposing).'] },
    { q: 'Why does the dispose pattern pass a disposing flag?', level: 'A', a: `<p>${C('Dispose(bool disposing)')} is called with true from ${C('Dispose()')} and false from the finalizer. When true, it is safe to dispose other managed objects (fields) because they are still alive. When false, we are on the finalizer thread and the referenced managed objects may already have been finalized or collected, so only unmanaged state may be touched. Making it ${C('protected virtual')} lets subclasses add cleanup and call ${C('base.Dispose(disposing)')}; ${C('GC.SuppressFinalize(this)')} in ${C('Dispose()')} removes the finalizer cost after explicit cleanup.</p>`, followUps: ['Why is SafeHandle preferred?'] },
    { q: 'What is Span&lt;T&gt; and why was it added?'.replace('<', '&lt;').replace('>', '&gt;'), level: 'I', a: `<p>${C('Span<T>')} is a ref struct representing a contiguous region of memory as (reference, length). It unifies arrays, strings (${C('ReadOnlySpan<char>')}), stack memory from stackalloc and native memory behind one safe, bounds-checked API. Slicing is O(1) without copying, so parsers and serializers can work on sub-ranges with zero allocations, and many BCL methods (Parse, TryFormat, IndexOf, Encoding, Stream.Read) have span overloads. It is stack-only by design, which is what makes it safe to point at stack memory without a GC.</p>`, followUps: ['What are the ref struct restrictions?'] },
    { q: 'When do you use Memory&lt;T&gt; instead of Span&lt;T&gt;?'.replace(/</g, '&lt;').replace(/>/g, '&gt;'), level: 'I', a: `<p>Whenever the buffer reference must outlive a synchronous stack frame: stored in a class field, used in an ${C('async')} method across ${C('await')}, captured by a lambda, put in a collection or passed through a generic API. ${C('Memory<T>')} is a regular struct (object + start + length) that can live anywhere; you call ${C('.Span')} in the synchronous part where you actually read or write. Async I/O APIs take ${C('Memory<byte>')} for this reason. ${C('IMemoryOwner<T>')} adds ownership: disposing it returns pooled memory.</p>`, followUps: ['What does MemoryManager&lt;T&gt; enable?'.replace('<', '&lt;').replace('>', '&gt;')] },
    { q: 'What are the rules for stackalloc and when is it safe?', level: 'A', a: `<p>${C('stackalloc T[n]')} reserves memory in the current frame; assigned to a ${C('Span<T>')} it is safe code, ${C('T')} must be unmanaged, and the memory is released when the method returns. Ref safety prevents the span from escaping (returning it is CS8352). It is safe when the size has a small, proven upper bound (a common rule is ≤ 1 KB) and it is not inside a loop; otherwise a large or attacker-controlled size overflows the stack and crashes the process. The idiom is ${C('n <= Threshold ? stackalloc T[Threshold] : ArrayPool / new T[n]')}.</p>`, followUps: ['What does SkipLocalsInit change?'] },
    { q: 'How does ArrayPool work and what are its pitfalls?', level: 'A', a: `<p>${C('ArrayPool<T>.Shared')} keeps idle arrays in power-of-two size buckets with per-thread and per-core caches. ${C('Rent(n)')} returns an array of at least n elements (often larger, with stale contents), ${C('Return')} puts it back (optionally clearing it). Pitfalls: using ${C('array.Length')} instead of the requested length, forgetting to return (just a lost optimisation) or returning twice (two renters share one array — data corruption), using the array after returning it, keeping rented arrays in long-lived objects, and leaking sensitive data without ${C('clearArray: true')}. Always Return in a finally.</p>`, followUps: ['When is pooling slower than allocating?'] },
    { q: 'How would you investigate high memory usage in a .NET service?', level: 'A', a: `<p>Start with ${C('dotnet-counters')} to see heap size per generation, GC counts, allocation rate and % time in GC. If the heap keeps growing, take two heap dumps (${C('dotnet-gcdump')} or ${C('dotnet-dump')}) some time apart and compare which types grow, then follow the GC roots (static collections, event subscriptions, caches without eviction, timers) to the culprit. If the allocation rate is high, use a profiler's allocation view or ${C('dotnet-trace')} with the GC events to find hot allocation sites, and fix them with spans, pooling, struct types or caching. Verify with a benchmark and load test.</p>`, followUps: ['What is a GC root?'] },
    { q: 'What are the costs of an empty class instance vs a struct with two ints on 64-bit .NET?', level: 'E', a: `<p>An empty class instance takes 24 bytes on the heap: an 8-byte object header, an 8-byte method table pointer and 8 bytes minimum payload/padding, plus GC tracking. A struct with two ints is exactly 8 bytes stored inline wherever it is placed, with no header. In an array, 1000 structs are one 8 KB block; 1000 objects are an 8 KB array of references plus 1000 × 24-byte objects scattered in the heap. That difference in memory and locality is why high-performance code uses structs for small values.</p>`, followUps: ['When does a struct become slower than a class?'] },
    { q: 'Why can a List&lt;struct&gt; element not be modified with list[i].X = 1?'.replace('<', '&lt;').replace('>', '&gt;'), level: 'I', a: `<p>The ${C('List<T>')} indexer is a method returning ${C('T')} by value, so ${C('list[i]')} is a temporary copy. Assigning to a field of that copy would be lost immediately, and the compiler reports CS1612 to stop the bug. Arrays are different: ${C('array[i]')} denotes the storage location itself. Fixes: read, modify and write back (${C('var p = list[i]; p.X = 1; list[i] = p;')}), use ${C('CollectionsMarshal.AsSpan(list)[i].X = 1')}, or better, make the struct immutable and replace whole values.</p>`, followUps: ['How do ref returns help here?'] },
    { q: 'Should you call GC.Collect() or set variables to null to help the GC?', level: 'B', a: `<p>Almost never. The GC self-tunes; forcing a collection promotes live objects to older generations prematurely and causes pauses, making things worse. Setting locals to null at the end of a method is pointless because the JIT already tracks the last use of each local (in optimised builds an object can be collected while the method is still running). Setting <i>fields</i> or static references to null can matter when a long-lived object holds something large it no longer needs. Legitimate GC.Collect uses are benchmarks, tests that check for leaks, and rare one-off phases after releasing a huge data set.</p>`, followUps: ['What does GC.KeepAlive do?'] }
  );

  registerModule({
    id: 'csharp08',
    title: 'Memory, GC, Boxing & Span<T>',
    intro: `<p>This module opens the hood on memory in .NET. You will see where value and reference types really live, why boxing allocates and how to spot it, how the generational garbage collector and the Large Object Heap work, and why finalizers are a safety net while ${C('Dispose')} and ${C('SafeHandle')} are the real tools. Then you will learn the modern high-performance toolkit: ${C('Span<T>')} and ${C('ReadOnlySpan<T>')} for zero-copy slicing, ${C('stackalloc')} and ${C('Memory<T>')} with the ref struct rules that keep them safe, and ${C('ArrayPool<T>')} plus other techniques for avoiding allocations.</p>
<p>Visualizers let you draw the stack and heap, watch boxes pile up, simulate GC generations, follow an object through the finalization queues, slice strings with spans and rent arrays from a pool. Practice problems are checked by tests.</p>`,
    goals: [
      'Explain where value types and reference types live, and predict the effect of copies',
      'Find and remove boxing allocations',
      'Describe gen 0/1/2, promotion, the LOH and the costs of each collection',
      'Implement IDisposable correctly and know when a finalizer or SafeHandle is needed',
      'Parse and transform data with Span&lt;T&gt;/ReadOnlySpan&lt;T&gt; without allocating',
      'Use stackalloc, Memory&lt;T&gt; and ArrayPool&lt;T&gt; safely within the ref struct rules'
    ],
    prereqs: `C# 3 (classes, structs and records) and C# 7 (exceptions, using and IDisposable).`,
    hours: 12,
    langNotes: {
      csharp: `<p>The main thread has a 1 MB stack (about 10k frames) and ${C('StackOverflowException')} cannot be caught, so bound every ${C('stackalloc')}. ${C('Span<T>')} is a ref struct: no fields in classes, no async, no lambdas. Range indexing an array (${C('a[1..3]')}) copies; ${C('a.AsSpan(1..3)')} does not. ${C('ArrayPool.Rent')} can return a longer array with stale data. ${C('GC.GetAllocatedBytesForCurrentThread()')} is a quick way to measure allocations in tests.</p>`
    },
    topics: topics.map(function (t) { t.examples.forEach(function (ex) { if (typeof ex.code === 'string') ex.code = { lang: 'csharp', code: ex.code, run: true }; }); return t; }),
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
