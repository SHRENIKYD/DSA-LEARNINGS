(function () { var topics = [], practice = [], quiz = [], interview = [];

// ---------- small builders ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// K: a code block for use inside HTML answers (escapes the angle brackets for us).
function K(code) { return '<pre><code>' + esc(String(code).replace(/^\n+|\s+$/g, '')) + '</code></pre>'; }
// Interview entry.
function Q(level, q, a, followUps) { interview.push({ q: q, level: level, a: a, followUps: followUps }); }
// Scenario problem builder (weak answer, strong answer).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Name the C# rule behind the bug, show the fix, and say how you would stop it coming back.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: o.code ? { approach: o.a, code: o.code, complexity: o.cx, followUps: o.f } : { approach: o.a, complexity: o.cx, followUps: o.f }
  };
}
// Visualizer helper: fill a comparison table one row at a time.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || rows[i][0], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}
// Visualizer helper: step through fixed code. steps = [{ line, narr, vars, hlv, extra: [parts] }]
function codeViz(title, code, steps, varLabel) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var hl = {}; if (s.line) hl[s.line] = s.cls || 'cur';
        var parts = [{ type: 'code', label: 'C# code', lang: 'csharp', code: code, hl: hl }];
        if (s.vars) parts.push({ type: 'vars', label: varLabel || 'Variables', vals: s.vars, hl: s.hlv || {} });
        (s.extra || []).forEach(function (p) { parts.push(p); });
        return { narr: s.narr, parts: parts };
      });
    }
  };
}

// ====================== TOPIC 1: TYPE SYSTEM ======================
var CS_TYPES = `using System;
using System.Text;

struct PointS { public int X; }   // value type
class PointC { public int X; }    // reference type

class Demo
{
    static void Main()
    {
        // 1. Value type: assignment copies the data.
        PointS a = new PointS { X = 1 };
        PointS b = a;
        b.X = 99;
        Console.WriteLine(a.X);                    // 1  (a was not touched)

        // 2. Reference type: assignment copies the reference (the address).
        PointC c = new PointC { X = 1 };
        PointC d = c;
        d.X = 99;
        Console.WriteLine(c.X);                    // 99 (c and d are the same object)

        // 3. double is binary, decimal is base 10.
        Console.WriteLine(0.1 + 0.2 == 0.3);       // False
        Console.WriteLine(0.1m + 0.2m == 0.3m);    // True

        // 4. Boxing copies the value into a new object on the heap.
        int n = 42;
        object boxed = n;
        n = 50;
        Console.WriteLine((int)boxed);             // 42 (the box kept its own copy)

        // 5. Strings never change. "Changing" one builds a new string.
        string s1 = "shop";
        string s2 = s1;
        s2 += "ping";
        Console.WriteLine(s1);                     // shop
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5; i++) sb.Append(i).Append(',');
        Console.WriteLine(sb.ToString());          // 0,1,2,3,4,

        // 6. A nullable value type can hold "no value".
        int? stock = null;
        Console.WriteLine(stock ?? -1);            // -1
    }
}`;

var CS_TYPES_MODERN = `// Modern C# (C# 9 and later). Shown for reading, not compiled by the local checker.
public record OrderDto(int Id, string Customer, decimal Total);      // reference type, value equality
public readonly record struct Money(decimal Amount, string Currency); // small immutable value type

var a = new OrderDto(1, "Asha", 500m);
var b = a with { Total = 550m };                 // copy with one change, a is untouched
Console.WriteLine(a == new OrderDto(1, "Asha", 500m));   // True: records compare by value

string? coupon = FindCoupon();                   // nullable reference type: "may be null"
int length = coupon?.Length ?? 0;                // null-conditional + null-coalescing

string Describe(object o) => o switch            // pattern matching
{
    null                 => "nothing",
    int n when n < 0     => "negative number",
    int                  => "number",
    string { Length: 0 } => "empty text",
    string s             => "text " + s,
    _                    => "something else"
};`;

topics.push({
  title: 'The Type System: Values, References, Strings and Null',
  analogy: `<p>Think of a <b>photocopy</b> and a <b>shared online document</b>. If I hand you a photocopy of my shopping list and you cross out "milk", my own list still says milk. That is a <b>value type</b>: you got your own copy. If I send you a link to a shared document and you delete "milk", it is gone for both of us. That is a <b>reference type</b>: we both hold a link to the same thing. Almost every question in this topic is that one idea in a new costume.</p>`,
  explain: `<p><b>The plain idea:</b> every C# variable has a type, and the type decides two things: what the variable can hold, and what happens when you copy it.</p>
    <ul>
      <li><b>Value types</b> (<code>int</code>, <code>bool</code>, <code>decimal</code>, <code>struct</code>, <code>enum</code>) hold the data itself. Assigning one copies the data.</li>
      <li><b>Reference types</b> (<code>class</code>, <code>string</code>, arrays, delegates, <code>record</code>) hold a <i>reference</i>, which is a link to an object on the managed heap (the memory area the garbage collector looks after). Assigning one copies the link, not the object.</li>
      <li><b>Boxing</b> is what happens when a value type is treated as <code>object</code>: the runtime makes a new heap object and copies the value in. It is legal but costs an allocation.</li>
      <li><b>Strings</b> are reference types that behave like values: they are <b>immutable</b> (they never change after creation) and <code>==</code> compares their text.</li>
      <li><b>Null</b> means "no object". Value types cannot be null unless you write <code>int?</code>. Since C# 8 the compiler can also warn you about reference types that may be null.</li>
    </ul>
    <table><thead><tr><th>You need</th><th>Reach for</th><th>Why</th></tr></thead><tbody>
      <tr><td>Money</td><td><code>decimal</code></td><td>Base 10, so 0.1 + 0.2 is exactly 0.3</td></tr>
      <tr><td>Counts and ids</td><td><code>int</code> or <code>long</code></td><td>Fast and exact</td></tr>
      <tr><td>Measurements</td><td><code>double</code></td><td>Fast, tiny rounding is fine</td></tr>
      <tr><td>Data that travels (DTO)</td><td><code>record</code></td><td>Immutable, compares by value</td></tr>
      <tr><td>Thing with identity and behaviour</td><td><code>class</code></td><td>One shared object</td></tr>
      <tr><td>Tiny immutable value</td><td><code>readonly struct</code></td><td>No heap allocation</td></tr>
    </tbody></table>`,
  clues: ['"What is the difference between a value type and a reference type?"', '"What will this print?" followed by a struct or class being assigned and changed', '"Where is this stored, stack or heap?"', '"What is boxing? Where does it happen without you noticing?"', '"Why is string immutable?" or "string vs StringBuilder"', '"Would you use double or decimal for a price?"', '"class vs struct vs record: when do you use each?"', '"What do == and Equals do here?" on two objects with the same data'],
  code: [{ lang: 'csharp', code: CS_TYPES, run: true }, { lang: 'csharp', code: CS_TYPES_MODERN, check: false }],
  codeTitle: ['Six type-system facts you can run', 'The same ideas in modern C#: records, nullable references, patterns'],
  viz: [
    codeViz('Copy the data or copy the link? Step through a struct and a class',
      'struct PointS { public int X; }\nclass  PointC { public int X; }\n\nvar a = new PointS { X = 1 };\nvar b = a;            // copies the data\nb.X = 99;\n\nvar c = new PointC { X = 1 };\nvar d = c;            // copies the reference\nd.X = 99;\n\nConsole.WriteLine(a.X + " " + c.X);\nobject o = a;         // boxing',
      [
        { line: 1, narr: 'Two types that look the same. <b>PointS</b> is a struct (value type). <b>PointC</b> is a class (reference type). Watch what assignment does to each.', vars: {} , extra: [{ type: 'map', label: 'Managed heap', entries: [] }] },
        { line: 4, narr: '<b>a</b> is a struct, so the number 1 lives <b>inside the variable itself</b>. Nothing goes on the heap.', vars: { 'a.X': 1 }, hlv: { 'a.X': 'ok' }, extra: [{ type: 'map', label: 'Managed heap', entries: [] }] },
        { line: 5, narr: '<b>b = a</b> copies the data. Now there are two separate structs that happen to hold the same number.', vars: { 'a.X': 1, 'b.X': 1 }, hlv: { 'b.X': 'ok' }, extra: [{ type: 'map', label: 'Managed heap', entries: [] }] },
        { line: 6, narr: 'Changing <b>b.X</b> changes only the copy. <b>a.X is still 1.</b> This is the photocopy.', vars: { 'a.X': 1, 'b.X': 99 }, hlv: { 'b.X': 'cur' }, extra: [{ type: 'map', label: 'Managed heap', entries: [] }] },
        { line: 8, narr: '<b>c</b> is a class. <code>new</code> creates the object on the heap, and c holds only a reference to it (shown as #1).', vars: { 'a.X': 1, 'b.X': 99, c: 'ref #1' }, hlv: { c: 'ok' }, extra: [{ type: 'map', label: 'Managed heap', entries: [['#1 PointC', 'X = 1']], hl: { '#1 PointC': 'ok' } }] },
        { line: 9, narr: '<b>d = c</b> copies the <b>reference</b>. Still one object on the heap, now with two variables pointing at it.', vars: { 'a.X': 1, 'b.X': 99, c: 'ref #1', d: 'ref #1' }, hlv: { d: 'ok' }, extra: [{ type: 'map', label: 'Managed heap', entries: [['#1 PointC', 'X = 1']] }] },
        { line: 10, narr: 'Changing <b>d.X</b> changes the one shared object, so <b>c.X is now 99 too</b>. This is the shared document.', vars: { 'a.X': 1, 'b.X': 99, c: 'ref #1', d: 'ref #1' }, hlv: { c: 'cur', d: 'cur' }, extra: [{ type: 'map', label: 'Managed heap', entries: [['#1 PointC', 'X = 99']], hl: { '#1 PointC': 'cur' } }] },
        { line: 12, narr: 'Output: <b>1 99</b>. The struct kept its value. The class object was changed through the second variable.', vars: { 'a.X': 1, 'b.X': 99, c: 'ref #1', d: 'ref #1' }, hlv: { 'a.X': 'sel' }, extra: [{ type: 'map', label: 'Managed heap', entries: [['#1 PointC', 'X = 99']], hl: { '#1 PointC': 'sel' } }] },
        { line: 13, narr: '<b>Boxing:</b> storing the struct in an <code>object</code> variable makes a <b>new heap object</b> and copies the value into it. Legal, but it costs an allocation each time.', cls: 'bad', vars: { 'a.X': 1, 'b.X': 99, c: 'ref #1', d: 'ref #1', o: 'ref #2' }, hlv: { o: 'bad' }, extra: [{ type: 'map', label: 'Managed heap', entries: [['#1 PointC', 'X = 99'], ['#2 boxed PointS', 'X = 1 (a copy)']], hl: { '#2 boxed PointS': 'bad' } }] }
      ], 'Local variables'),
    rowViz('class vs struct vs record vs record struct', 'Pick the right kind of type',
      ['Kind', 'Value or reference', 'Default equality', 'Good for'],
      [
        ['class', 'reference', 'same object?', 'services, entities with identity and behaviour'],
        ['struct', 'value', 'field by field', 'tiny values such as a point or a colour'],
        ['record (class)', 'reference', 'all properties equal?', 'DTOs, messages, value objects'],
        ['record struct', 'value', 'all fields equal?', 'small immutable values such as Money']
      ],
      ['Four ways to declare a type. Two questions separate them: is it copied by value or by reference, and how does it compare for equality?',
        '<b>class</b>: one shared object. Two variables are "equal" only if they point at the same object, unless you override Equals.',
        '<b>struct</b>: copied on every assignment. Keep it small and make it <code>readonly</code>.',
        '<b>record</b>: still a class on the heap, but the compiler writes value equality, a readable ToString and <code>with</code> for you.',
        '<b>record struct</b>: a value type with the same generated equality. Add <code>readonly</code> to make it immutable.'],
      'Interview line: <b>class for identity, record for data, struct for tiny values.</b>', [0, 2])
  ],
  examples: [
    { title: 'The cart total that is off by one cent', html: `<p>An online shop adds prices with <code>double</code>. Three items at 0.10 give <code>0.30000000000000004</code>, and after rounding and tax one order in a few thousand is a cent out.</p><p><b>Why:</b> <code>double</code> stores numbers in base 2, and 0.1 has no exact base 2 form, just as 1/3 has no exact decimal form. <b>Fix:</b> use <code>decimal</code> for every money field, from the database column to the DTO. <code>0.1m + 0.1m + 0.1m == 0.3m</code> is true.</p>` },
    { title: 'A struct inside a list that "will not change"', html: `<p>You keep <code>List&lt;PointS&gt;</code> and write <code>points[0].X = 5;</code>. The compiler refuses with an error, because the indexer returns a <b>copy</b> of the struct and changing a copy would be pointless.</p><p><b>Fix:</b> read it, change it, write it back (<code>var p = points[0]; p.X = 5; points[0] = p;</code>), or better, make the struct immutable and replace the whole value. This is why mutable structs are discouraged.</p>` },
    { title: 'Two objects with the same data that are "not equal"', html: `<p>Two <code>Customer</code> objects have the same id and name, yet <code>a == b</code> is false and a <code>HashSet&lt;Customer&gt;</code> keeps both.</p><p><b>Why:</b> a class compares by reference by default. <b>Fix:</b> make it a <code>record</code>, or override <code>Equals</code> and <code>GetHashCode</code> together. Equal objects must return the same hash code or hash-based collections cannot find them.</p>` }
  ],
  deepDive: `<p><b>"Value types live on the stack" is only half true.</b> A value type is stored <i>inline, wherever it is declared</i>. A local <code>int</code> usually sits on the stack (or in a CPU register). An <code>int</code> field of a class sits on the heap, inside that object. A boxed <code>int</code> is a heap object. Locals captured by a lambda or used in an <code>async</code> method are moved to a heap object too.</p>
    <p><b>Hidden boxing</b> shows up when a struct is passed as <code>object</code> or as an interface type, stored in a non-generic collection such as <code>ArrayList</code>, or used as a dictionary key without implementing <code>IEquatable&lt;T&gt;</code>. Generics remove most of it, because <code>List&lt;int&gt;</code> gets its own machine code that stores raw ints.</p>
    <p><b>Default struct equality</b> comes from <code>ValueType.Equals</code>. It can compare raw bytes when the layout allows, otherwise it uses reflection, which is slow. Implement <code>IEquatable&lt;T&gt;</code> or use a <code>record struct</code>.</p>
    <p><b>Strings:</b> literals are interned, so two identical literals are one object. <code>==</code> on strings is an ordinal, case-sensitive comparison. For ids and keys use <code>StringComparison.Ordinal</code> or <code>OrdinalIgnoreCase</code>. Culture-aware comparison is for text shown to people.</p>
    <p><b>Nullable reference types</b> are checked only at compile time. They do not exist at run time, so JSON from a client can still put null into a non-nullable property. Validate at the boundary.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant will write a correct record, an <code>Equals</code> override or a <code>StringBuilder</code> loop in seconds. You no longer win points for typing them from memory.</p>
    <p><b>Use AI as a partner:</b> ask it to hunt, not to write. For example: <code>List every place in this file where a value type is boxed, and say why.</code> Or: <code>Which of these properties can be null at run time even though the type says it cannot?</code></p>
    <p><b>Where AI goes wrong:</b> it often picks <code>double</code> for prices, compares strings with culture rules where ordinal is needed, suggests mutable structs, and adds the null-forgiving <code>!</code> operator to silence a warning that was telling the truth.</p>
    <p><b>What you must still own:</b> choosing class, struct or record for the job, knowing what a copy costs, and explaining out loud why the output is <code>1 99</code>. Interviewers ask "what does this print" because the reasoning cannot be delegated.</p>`,
  problems: [P({
    t: 'The null that the compiler promised could not happen', l: 'Medium', tags: ['nullable reference types', 'validation'],
    s: 'A booking API has nullable reference types switched on and compiles with zero warnings. In production it throws <code>NullReferenceException</code> on <code>request.GuestName.Trim()</code>. <code>GuestName</code> is declared as a non-nullable <code>string</code>. The interviewer asks: how is that possible, and what do you change?',
    ex: '<p>Request body sent by a mobile app: <code>{ "roomId": 12 }</code>. There is no <code>guestName</code> at all. The DTO property is <code>public string GuestName { get; set; }</code>.</p><p>Result: the JSON reader leaves the property as <span class="c-r">null</span>, and the first method call on it throws.</p>',
    weak: 'The compiler has a bug, so I would add a question mark to every property or put an exclamation mark after it to make the warning go away.',
    why: 'It blames the tool and hides the signal. Nullable annotations are a compile-time promise about <i>your</i> code. They never check data that arrives at run time.',
    q: ['What do nullable reference types change at run time?', ['Nothing. They only add compile-time warnings', 'They throw when null is assigned', 'They turn strings into structs', 'They make the JSON reader reject missing fields'], 0, 'The annotations are metadata for the compiler. The run-time type is the same <code>string</code>, which can hold null.'],
    h: ['Ask where the value came from. Did your code create it, or did it arrive from outside the process?', 'The compiler checks code paths it can see. It cannot see what a client sends in JSON, a database row, or a reflection-based mapper.', 'Recipe: validate at the boundary (required members or validation attributes), keep the type honest (use <code>string?</code> where null is really allowed), and guard with <code>ArgumentNullException.ThrowIfNull</code>.'],
    a: '<p><b>Strong answer:</b> "Nullable reference types are a compile-time feature. They help me find null bugs in code the compiler can follow, but they do not change the run-time type, so anything that fills an object from outside, such as JSON, a database or a mapper, can still leave null in a non-nullable property."</p><p>"I would fix it in three places. <b>1.</b> At the boundary: mark the property <code>required</code> so the JSON reader rejects a body without it, and add validation so the caller gets a 400 with a clear message instead of a 500. <b>2.</b> In the type: if the value is truly optional, declare it <code>string?</code> so every caller is forced to handle null. <b>3.</b> In the team: treat nullable warnings as errors in the build, and ban the <code>!</code> operator in review unless there is a comment that explains why it is safe."</p>',
    cx: '<p>Cost: one validation step per request, which is tiny. Benefit: a whole class of 500 errors becomes a clear 400 for the caller.</p>',
    f: ['What does the <code>required</code> modifier do, and which C# version added it?', 'What is the difference between <code>int?</code> and <code>string?</code> at run time?']
  })]
});

// ====================== TOPIC 2: METHODS AND PARAMETERS ======================
var CS_METHODS = `using System;
using System.Linq;

struct Point { public double X, Y; public Point(double x, double y) { X = x; Y = y; } }

static class TextExtensions
{
    // Extension method: a static method that can be called like an instance method.
    public static bool IsBlank(this string s) { return string.IsNullOrWhiteSpace(s); }
}

class Demo
{
    static void AddOne(int x)        { x++; }               // gets a copy
    static void AddOneRef(ref int x) { x++; }               // gets the caller's variable
    static bool TryHalf(int n, out int half)                // out: must be assigned before returning
    {
        half = n / 2;
        return n % 2 == 0;
    }
    static double Length(in Point p)                        // in: read-only reference, no copy
    {
        return Math.Sqrt(p.X * p.X + p.Y * p.Y);
    }
    static int Sum(params int[] numbers) { return numbers.Sum(); }   // any number of arguments
    static string Send(string to, string subject = "(none)", bool urgent = false)
    {
        return to + " | " + subject + " | " + urgent;
    }

    static void Main()
    {
        int score = 10;
        AddOne(score);
        Console.WriteLine(score);                      // 10
        AddOneRef(ref score);
        Console.WriteLine(score);                      // 11

        int half;
        bool even = TryHalf(score, out half);
        Console.WriteLine(even + " " + half);          // False 5

        Point p = new Point(3, 4);
        Console.WriteLine(Length(in p));               // 5
        Console.WriteLine(Sum(1, 2, 3));               // 6
        Console.WriteLine(Send("a@shop.test", urgent: true));   // named + optional

        // Parsing text from outside: TryParse never throws.
        int page;
        if (!int.TryParse("abc", out page) || page < 1) page = 1;
        Console.WriteLine(page);                       // 1

        Console.WriteLine("   ".IsBlank());            // True
    }
}`;

var CS_PROPS = `// Modern C# properties. Shown for reading, not compiled by the local checker.
public class Employee
{
    public int Id { get; init; }                      // set only while the object is being created
    public required string Name { get; init; }        // C# 11: the caller must set it
    public decimal Salary { get; private set; }       // only this class can change it
    public string DisplayName => $"{Name} (#{Id})";   // computed each time, nothing stored

    public string Email                               // C# 14: "field" is the hidden backing field
    {
        get;
        set => field = value.Trim().ToLowerInvariant();
    }

    public void Raise(decimal percent)
    {
        if (percent <= 0) throw new ArgumentOutOfRangeException(nameof(percent));
        Salary += Salary * percent / 100;
    }
}

var e = new Employee { Id = 7, Name = "Asha", Email = " Asha@Shop.Test " };
// e.Id = 8;          // compile error: init-only
// e.Salary = 1;      // compile error: private setter
e.Raise(10);`;

topics.push({
  title: 'Methods, Parameters and Properties',
  analogy: `<p>Imagine asking a colleague to update a figure in a report. You can <b>read the number out</b> to them (they write it on their own notepad, your report does not change). You can <b>hand them your actual report</b> and say "fix it in here". You can hand them a <b>blank form</b> and say "fill this in and give it back". Or you can let them <b>look at your report through glass</b>: they can read it but not write on it. Those four are C# parameter passing: by value, <code>ref</code>, <code>out</code> and <code>in</code>.</p>`,
  explain: `<p><b>The plain idea:</b> by default C# passes arguments <b>by value</b>. The method gets a copy of whatever the variable holds. For an <code>int</code> that is a copy of the number. For a class it is a copy of the <i>reference</i>, so the method can change the object but cannot make your variable point somewhere else.</p>
    <table><thead><tr><th>Keyword</th><th>What the method receives</th><th>Rule</th><th>Typical use</th></tr></thead><tbody>
      <tr><td>(none)</td><td>a copy</td><td>changes to the parameter stay inside</td><td>almost everything</td></tr>
      <tr><td><code>ref</code></td><td>the caller's variable</td><td>caller must set it first</td><td>swap, updating a big struct in place</td></tr>
      <tr><td><code>out</code></td><td>the caller's variable</td><td>method must set it before returning</td><td><code>TryParse</code>, <code>TryGetValue</code></td></tr>
      <tr><td><code>in</code></td><td>a read-only reference</td><td>method cannot change it</td><td>large read-only structs</td></tr>
      <tr><td><code>params</code></td><td>zero or more values as one collection</td><td>must be the last parameter</td><td><code>string.Format</code>, <code>Sum(1, 2, 3)</code></td></tr>
    </tbody></table>
    <p><b>Optional parameters</b> have a default value (<code>bool urgent = false</code>). <b>Named arguments</b> let the caller say which one they mean (<code>urgent: true</code>).</p>
    <p><b>Properties</b> look like fields from outside but are really a pair of methods (<code>get</code> and <code>set</code>). That lets a class check or block a change: <code>private set</code>, <code>init</code> (set only during creation) and <code>required</code> (the caller must set it).</p>
    <p><b>Extension methods</b> are static methods written with <code>this</code> on the first parameter, so you can call them as if they belonged to the type. All of LINQ is built this way.</p>`,
  clues: ['"What is the difference between ref and out?"', '"Is C# pass by value or pass by reference?"', '"If I pass a list to a method and the method adds an item, does the caller see it? What if the method assigns a new list?"', '"int.Parse vs int.TryParse vs Convert.ToInt32"', '"What is an extension method? Can it see private members?"', '"What is the difference between a field and a property?"', '"How do you write a thread-safe singleton?"', '"What does init do? What does required do?"'],
  code: [{ lang: 'csharp', code: CS_METHODS, run: true }, { lang: 'csharp', code: CS_PROPS, check: false }],
  codeTitle: ['ref, out, in, params, optional and named arguments, TryParse, extension method', 'Properties: init, required, private set, computed, and the C# 14 field keyword'],
  viz: codeViz('By value, ref and out: what the caller sees after each call',
    'static void AddOne(int x)        { x++; }\nstatic void AddOneRef(ref int x) { x++; }\nstatic bool TryHalf(int n, out int half)\n{ half = n / 2; return n % 2 == 0; }\n\nint score = 10;\nAddOne(score);\nAddOneRef(ref score);\nbool even = TryHalf(score, out int h);\nint total = Sum(1, 2, 3);   // params int[]',
    [
      { line: 6, narr: 'The caller owns one variable: <b>score = 10</b>.', vars: { score: 10 }, hlv: { score: 'ok' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main'] }] },
      { line: 7, narr: '<b>AddOne(score)</b> passes by value. The method gets its <b>own copy</b>, called x.', vars: { score: 10, 'x (copy)': 10 }, hlv: { 'x (copy)': 'cur' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'AddOne(x = 10)'], hl: { 1: 'cur' } }] },
      { line: 1, narr: 'Inside, <code>x++</code> changes the copy to 11. The caller\'s <b>score is still 10</b>.', vars: { score: 10, 'x (copy)': 11 }, hlv: { 'x (copy)': 'cur' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'AddOne(x = 11)'], hl: { 1: 'cur' } }] },
      { line: 8, narr: 'The copy is thrown away on return. Now <b>AddOneRef(ref score)</b>: this time x is another <b>name for the caller\'s variable</b>.', vars: { score: 10, 'x (alias of score)': 10 }, hlv: { 'x (alias of score)': 'win' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'AddOneRef(ref score)'], hl: { 1: 'cur' } }] },
      { line: 2, narr: '<code>x++</code> writes straight into the caller\'s variable. <b>score becomes 11.</b>', vars: { score: 11, 'x (alias of score)': 11 }, hlv: { score: 'ok', 'x (alias of score)': 'ok' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'AddOneRef(ref score)'], hl: { 1: 'cur' } }] },
      { line: 9, narr: '<b>TryHalf(score, out int h)</b>: <code>out</code> is like ref, but the variable starts <b>unassigned</b> and the method <b>must</b> fill it.', vars: { score: 11, h: '(unassigned)' }, hlv: { h: 'cur' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'TryHalf(n = 11, out h)'], hl: { 1: 'cur' } }] },
      { line: 4, narr: 'The method sets <b>half = 5</b> and returns <b>false</b> (11 is odd). One call gave back two answers: the bool and the out value.', vars: { score: 11, h: 5, even: false }, hlv: { h: 'ok', even: 'ok' }, extra: [{ type: 'stack', label: 'Call stack', items: ['Main', 'TryHalf(n = 11, out h)'], hl: { 1: 'cur' } }] },
      { line: 10, narr: '<b>params</b>: the compiler packs 1, 2, 3 into one array for you, so the caller does not write <code>new[] { 1, 2, 3 }</code>.', vars: { score: 11, h: 5, even: false, total: 6 }, hlv: { total: 'ok' }, extra: [{ type: 'array', label: 'numbers (built by the compiler)', values: [1, 2, 3] }] },
      { narr: 'Summary: <b>no keyword</b> = copy. <b>ref</b> = the caller\'s variable, set before the call. <b>out</b> = the caller\'s variable, set inside the method. <b>in</b> = read-only reference.', vars: { score: 11, h: 5, even: false, total: 6 }, hlv: { score: 'sel' } }
    ], 'Variables'),
  examples: [
    { title: 'A list passed to a method: what the caller sees', html: `<p>A method receives <code>List&lt;string&gt; items</code>.</p><ul><li><code>items.Add("tea");</code> The caller <b>sees</b> the new item. Both hold a reference to the same list.</li><li><code>items = new List&lt;string&gt;();</code> The caller sees <b>nothing</b>. Only the method's copy of the reference was pointed at a new list.</li><li>With <code>ref List&lt;string&gt; items</code>, the second line <b>would</b> replace the caller's list.</li></ul><p>So the honest answer to "is C# pass by reference?" is: no, it is pass by value, and for classes the value that gets copied is a reference.</p>` },
    { title: 'The page number that crashed the API', html: `<p>A product list endpoint does <code>int.Parse(Request.Query["page"])</code>. A crawler sends <code>?page=abc</code> and every such call becomes a 500 error with a <code>FormatException</code>.</p><p><b>Fix:</b> text from outside is expected to be wrong sometimes, so use the form that does not throw: <code>if (!int.TryParse(text, out var page) || page &lt; 1) page = 1;</code>. Keep <code>int.Parse</code> for values your own code produced, where bad text really is a bug.</p>` },
    { title: 'Singleton by hand vs singleton by the container', html: `<p>The classic safe version is <code>private static readonly Lazy&lt;AppConfig&gt; _instance = new Lazy&lt;AppConfig&gt;(() =&gt; new AppConfig());</code> with a private constructor. <code>Lazy&lt;T&gt;</code> makes sure the object is created once, even if many threads ask at the same moment.</p><p>In an ASP.NET Core app, prefer <code>services.AddSingleton&lt;IAppConfig, AppConfig&gt;()</code>. You still get one instance, but the class depends on an interface, so a test can pass in a fake.</p>` }
  ],
  deepDive: `<p><b>ref, out and in are the same thing underneath:</b> a managed pointer to the caller's storage. The compiler only applies different rules about who must assign and who may write. Because of that you cannot overload two methods that differ only by <code>ref</code> vs <code>out</code>.</p>
    <p><b><code>in</code> can cost you.</b> If the struct is not <code>readonly</code>, the compiler makes a hidden defensive copy before calling any of its methods, so the "no copy" benefit is lost. Use <code>in</code> with <code>readonly struct</code> types larger than a couple of machine words. C# 12 added <code>ref readonly</code> parameters for APIs that need a real reference.</p>
    <p><b>params</b> used to mean only arrays, which allocate on every call. Since C# 13 it also accepts spans and other collection types, so <code>params ReadOnlySpan&lt;int&gt;</code> can avoid the allocation.</p>
    <p><b>Optional parameter defaults are baked into the caller</b> at compile time, exactly like <code>const</code>. Change a default in a library and existing compiled callers keep the old value until they are rebuilt. For public libraries, overloads are safer.</p>
    <p><b>Extension methods</b> are resolved at compile time from the static type. If the type later gains a real instance method with the same name, the instance method wins silently. C# 14 adds <code>extension</code> blocks, which also allow extension properties and static extension members.</p>
    <p><b>Static constructors</b> run once, before the first use of the type, and the runtime guarantees only one thread runs them. If one throws, the type stays broken for the life of the process (<code>TypeInitializationException</code>).</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate DTOs, guard clauses and <code>TryParse</code> wrappers instantly, so nobody is impressed by boilerplate any more. The interview moves to "why this signature?".</p>
    <p><b>Use AI as a partner:</b> ask it to review an API surface: <code>Which of these public methods can throw on bad user input, and which should return a bool with an out value instead?</code> Or ask for a table of every public setter and whether anything validates it.</p>
    <p><b>Where AI goes wrong:</b> it sprinkles <code>ref</code> on class parameters "for performance" (it does nothing useful), writes double-checked locking by hand instead of <code>Lazy&lt;T&gt;</code>, uses <code>Convert.ToInt32</code> which quietly turns null into 0, and makes every property <code>{ get; set; }</code> so the object can be put into an invalid state.</p>
    <p><b>What you must still own:</b> the shape of the method. Who owns the data, who may change it, and what happens on bad input are design decisions, and a tech lead is expected to defend them.</p>`
});

// ====================== TOPIC 3: OOP ======================
var CS_OOP = `using System;
using System.Collections.Generic;

// Abstraction: callers know WHAT a notifier does, not HOW.
interface INotifier { string Send(string to, string message); }

// Polymorphism: two classes answer the same call in their own way.
sealed class EmailNotifier : INotifier
{
    public string Send(string to, string message) { return "Email to " + to + ": " + message; }
}
sealed class SmsNotifier : INotifier
{
    public string Send(string to, string message) { return "SMS to " + to + ": " + message; }
}

// Encapsulation: the balance can only change through methods that check the rules.
class Account
{
    private decimal _balance;
    public decimal Balance { get { return _balance; } }
    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException("amount");
        _balance += amount;
    }
}

// Inheritance + template method: the base class fixes the steps, children fill one in.
abstract class Report
{
    public string Title { get; private set; }
    protected Report(string title) { Title = title; }
    public string Render() { return Title + ": " + Body(); }
    protected abstract string Body();
}
class SalesReport : Report
{
    public SalesReport() : base("Sales") { }
    protected override string Body() { return "42 orders"; }
}

class Animal
{
    public virtual string Speak() { return "..."; }
    public string Name() { return "Animal"; }
}
class Dog : Animal
{
    public override string Speak() { return "Woof"; }     // replaces the base version
    public new string Name() { return "Dog"; }            // only hides the base version
}

class Demo
{
    static void Main()
    {
        var notifiers = new List<INotifier> { new EmailNotifier(), new SmsNotifier() };
        foreach (INotifier n in notifiers) Console.WriteLine(n.Send("asha", "Order shipped"));

        var acc = new Account();
        acc.Deposit(100m);
        Console.WriteLine(acc.Balance);              // 100

        Report r = new SalesReport();
        Console.WriteLine(r.Render());               // Sales: 42 orders

        Animal a = new Dog();
        Console.WriteLine(a.Speak());                // Woof   (the object's real type decides)
        Console.WriteLine(a.Name());                 // Animal (the variable's type decides)
        Console.WriteLine(((Dog)a).Name());          // Dog
    }
}`;

var CS_COMPOSE = `using System;
using System.Collections.Generic;

// Composition: an order HAS pricing rules. Rules can be added, removed or reordered without a new subclass.
interface IPricingRule { decimal Apply(decimal price); }

class MemberDiscount : IPricingRule { public decimal Apply(decimal price) { return price * 0.90m; } }
class SalesTax : IPricingRule { public decimal Apply(decimal price) { return price * 1.20m; } }

class Order
{
    private readonly List<IPricingRule> _rules;
    public Order(List<IPricingRule> rules) { _rules = rules; }

    public decimal Total(decimal basePrice)
    {
        decimal price = basePrice;
        foreach (IPricingRule rule in _rules) price = rule.Apply(price);   // each rule takes its turn
        return price;
    }
}

class Demo
{
    static void Main()
    {
        var order = new Order(new List<IPricingRule> { new MemberDiscount(), new SalesTax() });
        Console.WriteLine(order.Total(100m));     // 108.0000
    }
}`;

topics.push({
  title: 'Object-Oriented Programming: Classes, Interfaces and Polymorphism',
  analogy: `<p>Think of a <b>wall socket</b>. The socket is a contract: two or three holes of a fixed shape and a fixed voltage. A kettle, a phone charger and a lamp all plug in and each does its own thing. The house wiring does not know or care which one is attached. That is OOP in one picture: the socket is an <b>interface</b> (abstraction), each appliance hides its insides (<b>encapsulation</b>), a "travel kettle" is a kind of kettle (<b>inheritance</b>), and "switch on" gives a different result for each appliance (<b>polymorphism</b>).</p>`,
  explain: `<p><b>The plain idea:</b> object-oriented programming groups data with the code that is allowed to change it, and lets different objects answer the same request in their own way.</p>
    <table><thead><tr><th>Pillar</th><th>One line</th><th>In C#</th></tr></thead><tbody>
      <tr><td><b>Encapsulation</b></td><td>Hide the state, expose safe actions</td><td><code>private</code> fields, methods that check rules</td></tr>
      <tr><td><b>Abstraction</b></td><td>Show what it does, hide how</td><td><code>interface</code>, <code>abstract class</code></td></tr>
      <tr><td><b>Inheritance</b></td><td>A new type builds on an existing one ("is a")</td><td><code>class Dog : Animal</code></td></tr>
      <tr><td><b>Polymorphism</b></td><td>Same call, different behaviour</td><td><code>virtual</code> / <code>override</code>, interface implementations</td></tr>
    </tbody></table>
    <p><b>Interface vs abstract class:</b> an interface is a promise ("anything that can send a notification"). A class can make many such promises. An abstract class is a half-built class: it can hold fields and finished methods, and leaves some methods for children to write. A class can have only one base class.</p>
    <p><b>The five keywords:</b> <code>virtual</code> = children may replace this. <code>override</code> = I am replacing it. <code>abstract</code> = children must write it. <code>sealed</code> = nobody may inherit or override further. <code>new</code> = I am hiding the base member, not replacing it.</p>
    <p><b>Composition</b> means an object <i>has</i> helpers instead of <i>being</i> a subtype: an order has pricing rules. It is usually the safer way to reuse code.</p>`,
  clues: ['"Explain the four pillars of OOP with a real example"', '"Abstract class or interface: when do you use which?"', '"What does this print?" with a base-class variable holding a derived object', '"Difference between override and new" or "overloading vs overriding"', '"Can an interface have a constructor? Can an abstract class?"', '"How do you stop a class being inherited?"', '"Inheritance vs composition" or "what is the fragile base class problem?"', '"Why do you code against interfaces?" (they want testability and dependency injection)', '"What are covariance and contravariance?" (senior and lead level)'],
  code: [{ lang: 'csharp', code: CS_OOP, run: true }, { lang: 'csharp', code: CS_COMPOSE, run: true }],
  codeTitle: ['All four pillars in one small program', 'Composition: pricing rules plugged into an order'],
  viz: [
    codeViz('override vs new: who decides which method runs?',
      'class Animal {\n  public virtual string Speak() => "...";\n  public string Name() => "Animal";\n}\nclass Dog : Animal {\n  public override string Speak() => "Woof";\n  public new string Name() => "Dog";\n}\n\nAnimal a = new Dog();\na.Speak();\na.Name();\nDog d = (Dog)a;\nd.Name();',
      [
        { line: 2, narr: '<b>Speak</b> is <code>virtual</code>: the base class allows children to replace it. <b>Name</b> is a plain method: no replacing allowed.', vars: {}, extra: [{ type: 'table', label: 'Method table of Dog (what the runtime looks up)', columns: ['Slot', 'Points to'], rows: [] }] },
        { line: 6, narr: 'Dog <b>overrides</b> Speak. In Dog\'s method table, the Speak slot now points to <b>Dog.Speak</b>.', vars: {}, extra: [{ type: 'table', label: 'Method table of Dog (what the runtime looks up)', columns: ['Slot', 'Points to'], rows: [['Speak (virtual)', 'Dog.Speak']], hl: { 0: 'ok' } }] },
        { line: 7, narr: 'Dog also declares <code>new Name()</code>. That does <b>not</b> replace Animal.Name. It adds a second, unrelated method that happens to have the same name.', vars: {}, extra: [{ type: 'table', label: 'Method table of Dog (what the runtime looks up)', columns: ['Slot', 'Points to'], rows: [['Speak (virtual)', 'Dog.Speak'], ['Animal.Name (not virtual)', 'Animal.Name'], ['Dog.Name (new)', 'Dog.Name']], hl: { 2: 'bad' } }] },
        { line: 10, narr: 'One object, two types to keep apart. The <b>variable</b> is typed Animal (known at compile time). The <b>object</b> is a Dog (known at run time).', vars: { 'variable type (compile time)': 'Animal', 'object type (run time)': 'Dog' }, hlv: { 'object type (run time)': 'ok' } },
        { line: 11, narr: '<b>a.Speak()</b> is a virtual call. The runtime looks at the <b>object</b>, finds a Dog, and runs Dog.Speak. Output: <b>Woof</b>.', vars: { 'variable type (compile time)': 'Animal', 'object type (run time)': 'Dog', output: 'Woof' }, hlv: { 'object type (run time)': 'cur', output: 'ok' } },
        { line: 12, narr: '<b>a.Name()</b> is not virtual. The <b>compiler</b> picks the method from the <b>variable</b> type, Animal. Output: <b>Animal</b>, even though the object is a Dog.', cls: 'bad', vars: { 'variable type (compile time)': 'Animal', 'object type (run time)': 'Dog', output: 'Animal' }, hlv: { 'variable type (compile time)': 'cur', output: 'bad' } },
        { line: 13, narr: 'Cast the same object to a <b>Dog</b> variable. Nothing about the object changes, only the type the compiler sees.', vars: { 'variable type (compile time)': 'Dog', 'object type (run time)': 'Dog' }, hlv: { 'variable type (compile time)': 'ok' } },
        { line: 14, narr: 'Now <b>d.Name()</b> gives <b>Dog</b>. Same object, different answer. That surprise is why <code>new</code> hiding is rare in good code.', vars: { 'variable type (compile time)': 'Dog', 'object type (run time)': 'Dog', output: 'Dog' }, hlv: { output: 'ok' } },
        { narr: 'Rule to say out loud: <b>override is decided at run time by the object. new is decided at compile time by the variable.</b>', vars: { 'a.Speak()': 'Woof', 'a.Name()': 'Animal', 'd.Name()': 'Dog' }, hlv: { 'a.Speak()': 'sel', 'a.Name()': 'sel' } }
      ], 'What decides the call'),
    rowViz('Abstract class vs interface, row by row', 'Abstract class vs interface',
      ['Question', 'Abstract class', 'Interface'],
      [
        ['Can it hold instance fields (state)?', 'Yes', 'No'],
        ['Can it have a constructor?', 'Yes, run by child constructors', 'No'],
        ['How many can a class take?', 'One base class only', 'As many as it likes'],
        ['Can members have bodies?', 'Yes, any mix of finished and abstract', 'Yes since C# 8 (default interface methods), used sparingly'],
        ['Can a struct use it?', 'No', 'Yes'],
        ['Best for', 'A family that shares state and steps', 'A capability or a seam for testing']
      ],
      ['Both describe what a type must do. Six questions tell them apart.',
        '<b>State:</b> only the abstract class can keep per-object fields.',
        '<b>Constructors:</b> an abstract class cannot be created directly, but its constructor still runs when a child is created.',
        '<b>How many:</b> one base class, many interfaces. This is the practical reason interfaces are everywhere.',
        '<b>Bodies:</b> interfaces can now carry default code, mainly so a library can add a member without breaking existing implementers.',
        '<b>Structs</b> cannot inherit from a class, but they can implement interfaces.',
        '<b>Use:</b> share real code and state with an abstract class. Describe a role with an interface.'],
      'Interview line: <b>interface for "can do", abstract class for "is a kind of, and shares code".</b>', [2, 5])
  ],
  examples: [
    { title: 'Encapsulation is more than private fields', html: `<p>A bank <code>Account</code> has <code>public decimal Balance { get; set; }</code>. The field behind it is private, yet any code can write <code>account.Balance = -500;</code>. That is not encapsulated.</p><p><b>Fix:</b> make the setter private and expose actions that check the rules: <code>Deposit(amount)</code> rejects zero or negative amounts, <code>Withdraw(amount)</code> rejects overdrafts. Now the object can never be put into an invalid state from outside. That sentence is the real definition interviewers want.</p>` },
    { title: 'Abstract class for a report family', html: `<p>Sales, stock and refund reports all print a title, then a body, then a footer with the date. Only the body differs.</p><p>Put <code>Render()</code> in an abstract <code>Report</code> base class. It calls <code>protected abstract string Body()</code>, which each child writes. This is the <b>template method</b> pattern: the base class owns the order of the steps and children fill in one step. An interface could not hold the shared <code>Render</code> logic and the <code>Title</code> state as naturally.</p>` },
    { title: 'When inheritance bites: the bird that cannot fly', html: `<p>A base class <code>Bird</code> has <code>Fly()</code>. Then <code>Penguin : Bird</code> arrives and has to throw <code>NotSupportedException</code> from <code>Fly()</code>. Every caller that loops over birds and calls <code>Fly()</code> can now crash.</p><p><b>Fix with composition and small interfaces:</b> <code>IFlyer</code>, <code>ISwimmer</code>. A duck implements both, a penguin implements only <code>ISwimmer</code>. No type is forced to promise something it cannot do. This is also the Liskov substitution principle in plain clothes.</p>` }
  ],
  deepDive: `<p><b>How virtual calls work:</b> every object has a hidden pointer to its type's method table. A virtual call reads the slot from that table at run time, so the object's real type decides. A non-virtual call is bound by the compiler from the variable's type. Marking a class <code>sealed</code> tells the JIT compiler no override can exist, so it can call the method directly or inline it.</p>
    <p><b>Construction order:</b> derived field initialisers, then base field initialisers, then the base constructor body, then the derived constructor body. If a base constructor calls a virtual method, the override runs <b>before</b> the derived constructor has set anything up. Avoid virtual calls in constructors.</p>
    <p><b>Default interface methods</b> are reachable only through the interface type, not through a variable of the class type, unless the class declares the member itself. They are not a way to get multiple inheritance of state. Since C# 11 interfaces can also declare <code>static abstract</code> members, which is what makes generic maths (<code>INumber&lt;T&gt;</code>) possible.</p>
    <p><b>Fragile base class:</b> a base class and its children share hidden assumptions. A harmless-looking change in the base, such as one method starting to call another virtual method, can break children the author has never seen. Keep hierarchies shallow, seal by default, and document what is safe to override.</p>
    <p><b>Variance:</b> <code>IEnumerable&lt;out T&gt;</code> is covariant, so a sequence of strings can be used as a sequence of objects. <code>Action&lt;in T&gt;</code> is contravariant, so a handler of objects can be used as a handler of strings. It works only for reference types, and <code>List&lt;T&gt;</code> is invariant because it both reads and writes T.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant will produce a class hierarchy, an interface and its mock in one prompt. The scarce skill is now judging whether the hierarchy should exist at all.</p>
    <p><b>Use AI as a partner:</b> give it a real class and ask <code>Which public members let a caller put this object into an invalid state?</code> or <code>Rewrite this three-level inheritance chain using composition and show what gets simpler and what gets worse.</code> Ask it for the counter-argument to your design.</p>
    <p><b>Where AI goes wrong:</b> it over-builds. Expect an interface for every class, base classes named <code>BaseService</code> that exist only to share two lines, <code>new</code> used where <code>override</code> was meant, and public setters everywhere. It also still recites "interfaces cannot contain code", which stopped being true with C# 8.</p>
    <p><b>What you must still own:</b> the model of the business. Deciding that a refund is not a kind of order, or that pricing is a set of rules and not a subclass tree, takes knowledge of the domain. As a lead you are also the one who says no to an abstraction that nobody needs yet.</p>`,
  problems: [P({
    t: 'One interface, one abstract class, or both?', l: 'Medium', tags: ['interface', 'abstract class', 'design'],
    s: 'A booking system must send confirmations by email, SMS and push notification. All three must retry up to 3 times and write a log line, but each talks to a different provider. A junior developer asks you: "Should <code>Notifier</code> be an interface or an abstract class?" Give your answer and your reasons.',
    ex: '<p>Callers should be able to write <code>notifier.Send(to, text)</code> without knowing the channel. Tests for the booking service must run without sending real messages.</p><p>Shared by all channels: retry loop, logging. Different per channel: the actual provider call.</p>',
    weak: 'Always use an interface, because interfaces are best practice and abstract classes are old-fashioned.',
    why: 'It is a slogan, not a decision. It ignores the shared retry and logging code, which would then be copied into three classes.',
    q: ['Which part of this design is the natural home for the shared retry loop?', ['The <code>INotifier</code> interface', 'An abstract base class that implements <code>INotifier</code>', 'Each concrete notifier, copied three times', 'A static global variable'], 1, 'The interface is the contract callers and tests depend on. The abstract base holds the shared steps and leaves one abstract method for the provider call.'],
    h: ['Split the question in two. What do <b>callers</b> need to know? What do the three <b>implementations</b> have in common?', 'Callers need a contract they can fake in a test. Implementations share behaviour and maybe state (retry count, logger).', 'Recipe: <code>INotifier</code> for callers. <code>NotifierBase : INotifier</code> with a finished <code>Send</code> that loops, logs and calls <code>protected abstract SendOnce</code>. Or skip the base class and wrap any notifier in a <code>RetryingNotifier</code> decorator.'],
    a: '<p><b>Strong answer:</b> "Both, because they answer different questions. Callers and tests should depend on a small interface, <code>INotifier</code> with one <code>Send</code> method. That keeps the booking service unaware of the channel and lets a test pass in a fake."</p><p>"The three implementations share real behaviour, the retry loop and the logging, so I would put that in an abstract base class that implements the interface. Its <code>Send</code> method is finished: it loops up to 3 times, logs, and calls a <code>protected abstract SendOnce</code> that each channel writes. That is the template method pattern."</p><p>"I would also mention the alternative: keep the three notifiers plain and add a <code>RetryingNotifier</code> that wraps any <code>INotifier</code>. That is composition. It wins if retry rules start to differ per channel, or if we later want retry without logging. With only three channels and identical rules, the base class is simpler, and I would seal the concrete classes."</p>',
    cx: '<p>Adding a fourth channel costs one small class and one registration line. No caller changes, and no retry code is copied.</p>',
    f: ['Where would a default interface method fit here, and why might you avoid it?', 'How would you register these so the right notifier is picked per customer preference?'],
    code: { lang: 'csharp', code: `using System;

interface INotifier { bool Send(string to, string text); }

abstract class NotifierBase : INotifier
{
    public bool Send(string to, string text)          // finished: the shared steps live here
    {
        for (int attempt = 1; attempt <= 3; attempt++)
        {
            if (SendOnce(to, text)) { Console.WriteLine(GetType().Name + " ok on attempt " + attempt); return true; }
        }
        Console.WriteLine(GetType().Name + " gave up");
        return false;
    }
    protected abstract bool SendOnce(string to, string text);   // each channel writes only this
}

sealed class EmailNotifier : NotifierBase
{
    protected override bool SendOnce(string to, string text) { return true; }
}

sealed class SmsNotifier : NotifierBase
{
    private int _calls;
    protected override bool SendOnce(string to, string text) { return ++_calls >= 2; }   // fails once, then works
}

class Demo
{
    static void Main()
    {
        INotifier[] all = { new EmailNotifier(), new SmsNotifier() };
        foreach (INotifier n in all) n.Send("guest", "Booking confirmed");
    }
}`, run: true }
  })]
});

// ====================== TOPIC 4: GENERICS, COLLECTIONS, LINQ ======================
var CS_LINQ = `using System;
using System.Collections.Generic;
using System.Linq;

static class MyLinq
{
    // A hand-written Where. "yield return" makes it lazy: nothing runs until someone asks for items.
    public static IEnumerable<T> Filter<T>(this IEnumerable<T> source, Func<T, bool> keep)
    {
        if (source == null) throw new ArgumentNullException("source");
        if (keep == null) throw new ArgumentNullException("keep");
        return Iterate(source, keep);
    }
    private static IEnumerable<T> Iterate<T>(IEnumerable<T> source, Func<T, bool> keep)
    {
        foreach (T item in source)
            if (keep(item)) yield return item;
    }

    // Generic method with a constraint: T must know how to compare itself.
    public static T Largest<T>(IEnumerable<T> items) where T : IComparable<T>
    {
        bool first = true;
        T best = default(T);
        foreach (T item in items)
        {
            if (first || item.CompareTo(best) > 0) { best = item; first = false; }
        }
        if (first) throw new InvalidOperationException("The sequence is empty.");
        return best;
    }
}

class Demo
{
    static void Main()
    {
        var prices = new List<int> { 30, 80, 50 };

        // Deferred execution: this line only describes the query.
        IEnumerable<int> expensive = prices.Where(p => p > 40);
        prices.Add(120);                                         // added AFTER the query was written
        Console.WriteLine(string.Join(",", expensive));          // 80,50,120  (runs now)

        // Dictionary: count letters. HashSet: remember what we have seen.
        var counts = new Dictionary<char, int>();
        foreach (char c in "banana")
        {
            int n;
            counts.TryGetValue(c, out n);
            counts[c] = n + 1;
        }
        Console.WriteLine(counts['a']);                          // 3
        var seen = new HashSet<int>();
        Console.WriteLine(seen.Add(5) + " " + seen.Add(5));      // True False

        // GroupBy and SelectMany
        var orders = new[]
        {
            new { Customer = "asha", Items = new[] { "tea", "cup" } },
            new { Customer = "ben",  Items = new[] { "tea" } },
            new { Customer = "asha", Items = new[] { "milk" } }
        };
        foreach (var g in orders.GroupBy(o => o.Customer))
            Console.WriteLine(g.Key + ": " + g.Count() + " orders");
        Console.WriteLine(string.Join(",", orders.SelectMany(o => o.Items).Distinct()));   // tea,cup,milk

        Console.WriteLine(string.Join(",", prices.Filter(p => p % 20 == 0)));   // 80,120
        Console.WriteLine(MyLinq.Largest(new[] { "pear", "apple", "zebra" }));   // zebra
    }
}`;

topics.push({
  title: 'Generics, Collections and LINQ',
  analogy: `<p>A <b>generic</b> type is like a <b>labelled storage box</b>: the same box design works for shoes, books or toys, but once you write "books" on it, only books go in, and you never have to check what you pull out. A <b>collection</b> is choosing the right furniture: a shelf (list), a card index (dictionary), a guest list where each name appears once (hash set), a queue at a counter. <b>LINQ</b> is a <b>sandwich order form</b>: writing the order does not make the sandwich. The kitchen starts only when someone actually asks for the food.</p>`,
  explain: `<p><b>Generics</b> let you write a class or method once with a placeholder type, written <code>T</code>. <code>List&lt;int&gt;</code> and <code>List&lt;string&gt;</code> come from the same code, and the compiler stops you putting the wrong thing in. A <b>constraint</b> (<code>where T : IComparable&lt;T&gt;</code>) says what T must be able to do.</p>
    <p><b>Collections:</b> pick by the question you ask most often.</p>
    <table><thead><tr><th>You ask</th><th>Use</th><th>Typical cost</th></tr></thead><tbody>
      <tr><td>"Give me item number 5" or "add to the end"</td><td><code>List&lt;T&gt;</code></td><td>O(1), search is O(n)</td></tr>
      <tr><td>"Find the value for this key"</td><td><code>Dictionary&lt;K,V&gt;</code></td><td>O(1) on average</td></tr>
      <tr><td>"Have I seen this before?"</td><td><code>HashSet&lt;T&gt;</code></td><td>O(1) on average</td></tr>
      <tr><td>"Keys in sorted order"</td><td><code>SortedDictionary&lt;K,V&gt;</code></td><td>O(log n)</td></tr>
      <tr><td>"First in, first out" / "last in, first out"</td><td><code>Queue&lt;T&gt;</code> / <code>Stack&lt;T&gt;</code></td><td>O(1)</td></tr>
      <tr><td>"Many threads at once"</td><td><code>ConcurrentDictionary&lt;K,V&gt;</code></td><td>O(1) on average</td></tr>
    </tbody></table>
    <p>O(1) means the time does not grow with the number of items. O(n) means it grows in step with it.</p>
    <p><b>LINQ</b> (Language Integrated Query) is a set of methods such as <code>Where</code>, <code>Select</code>, <code>GroupBy</code> and <code>OrderBy</code> that work on any sequence. Most of them use <b>deferred execution</b>: the query runs when you loop over it or call <code>ToList()</code>, <code>Count()</code> or <code>First()</code>, and it runs <b>again</b> each time you do.</p>
    <p><b>IEnumerable vs IQueryable:</b> <code>IEnumerable&lt;T&gt;</code> runs in your program's memory. <code>IQueryable&lt;T&gt;</code> carries a description of the query that a provider such as EF Core turns into SQL, so the database does the filtering.</p>`,
  clues: ['"What are generics and why use them?" or "What is a constraint?"', '"Which collection would you use to ...?"', '"IEnumerable vs IQueryable" (they want: where does the filter run?)', '"What is deferred execution?" or "When does this query actually run?"', '"First vs FirstOrDefault vs Single"', '"How does a Dictionary work inside?"', '"What does yield return do?"', '"This endpoint is slow and the SQL has no WHERE clause" (someone called AsEnumerable or ToList too early)', '"Why did this query hit the database twice?" (multiple enumeration)'],
  code: [{ lang: 'csharp', code: CS_LINQ, run: true }],
  codeTitle: ['Deferred execution, Dictionary, HashSet, GroupBy, SelectMany, a hand-written LINQ operator and a constrained generic method'],
  viz: {
    title: 'A LINQ pipeline pulls one item at a time (deferred execution)',
    input: '30 80 50 120',
    inputLabel: 'Prices (2 to 8 whole numbers)',
    gen: function (input) {
      var a = String(input).trim().split(/[\s,]+/).map(Number);
      if (a.length < 2 || a.length > 8 || a.some(function (x) { return isNaN(x) || Math.floor(x) !== x; })) throw new Error('Enter 2 to 8 whole numbers separated by spaces, for example: 30 80 50 120');
      var nodes = [
        { id: 'S', label: 'prices (List)', x: 12, y: 30, shape: 'box', w: 20 },
        { id: 'W', label: 'Where(p > 40)', x: 38, y: 30, shape: 'box', w: 20 },
        { id: 'M', label: 'Select(p * 2)', x: 64, y: 30, shape: 'box', w: 20 },
        { id: 'T', label: 'ToList()', x: 89, y: 30, shape: 'box', w: 14 }
      ];
      var edges = [['S', 'W'], ['W', 'M'], ['M', 'T']];
      var code = 'var query = prices.Where(p => p > 40)\n                  .Select(p => p * 2);\nvar result = query.ToList();';
      var g = function (hl, ehl, tags) { return { type: 'graph', label: 'Pipeline', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; };
      var frames = [];
      frames.push({ narr: 'Lines 1 and 2 only <b>describe</b> the query. No price has been looked at yet. This is deferred execution: the order form is filled in, the kitchen is idle.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 1: 'cur', 2: 'cur' } }, g({}, {}, { W: 'not run yet', M: 'not run yet' }), { type: 'array', label: 'prices', values: a.slice() }, { type: 'array', label: 'result', values: [] }] });
      frames.push({ narr: '<b>ToList()</b> starts the work. It asks Select for an item, Select asks Where, and Where asks the list. Items are <b>pulled</b> from right to left, one at a time.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'cur' } }, g({ T: 'cur' }, { 'M-T': 'win', 'W-M': 'win', 'S-W': 'win' }), { type: 'array', label: 'prices', values: a.slice() }, { type: 'array', label: 'result', values: [] }] });
      var out = [];
      for (var i = 0; i < a.length; i++) {
        var keep = a[i] > 40, ptr = {}, hl = {};
        ptr[i] = 'next'; hl[i] = keep ? 'ok' : 'bad';
        if (keep) out.push(a[i] * 2);
        var rh = {}; if (keep) rh[out.length - 1] = 'ok';
        frames.push({
          narr: keep
            ? 'Item <b>' + a[i] + '</b>: passes <code>p &gt; 40</code>, flows on to Select which turns it into <b>' + (a[i] * 2) + '</b>, and lands in the result. Only now does the next item get pulled.'
            : 'Item <b>' + a[i] + '</b>: fails <code>p &gt; 40</code>. Where drops it, so <b>Select never sees it</b>. Each item travels the whole pipeline before the next one starts.',
          parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'cur' } },
            g(keep ? { S: 'done', W: 'ok', M: 'ok', T: 'ok' } : { S: 'done', W: 'bad' }, keep ? { 'S-W': 'ok', 'W-M': 'ok', 'M-T': 'ok' } : { 'S-W': 'bad' }, keep ? { M: a[i] + ' -> ' + (a[i] * 2) } : { W: a[i] + ' dropped' }),
            { type: 'array', label: 'prices', values: a.slice(), ptr: ptr, hl: hl },
            { type: 'array', label: 'result', values: out.slice(), hl: rh }]
        });
      }
      frames.push({ narr: 'The list is exhausted. <b>result</b> is a real list in memory: a snapshot. Changing <code>prices</code> now does not change it.', parts: [{ type: 'code', lang: 'csharp', code: code, hl: { 3: 'ok' } }, g({ T: 'sel' }), { type: 'array', label: 'result (snapshot)', values: out.slice() }] });
      frames.push({ narr: 'But <code>query</code> itself is still only a description. Loop over <code>query</code> again and <b>the whole pipeline runs again</b>. With a database behind it, that is a second SQL query. Call <code>ToList()</code> once and reuse the list.', parts: [g({ W: 'cur', M: 'cur' }, {}, { W: 'runs again', M: 'runs again' }), { type: 'text', html: '<b>Runs the query:</b> foreach, ToList, ToArray, Count, First, Any, Sum. <b>Only builds the query:</b> Where, Select, OrderBy, GroupBy, Skip, Take.' }] });
      return frames;
    }
  },
  examples: [
    { title: 'The filter that ran in the wrong place', html: `<p>A payroll screen shows employees earning over 50,000. The code is <code>db.Employees.AsEnumerable().Where(e =&gt; e.Salary &gt; 50000).ToList()</code>. It works in testing with 200 rows and times out in production with 2 million.</p><p><b>Why:</b> <code>AsEnumerable()</code> switches from <code>IQueryable</code> to <code>IEnumerable</code>. Everything after it runs in memory, so the SQL is <code>SELECT * FROM Employees</code> with no WHERE. <b>Fix:</b> remove it, so the filter stays on the <code>IQueryable</code> and becomes part of the SQL.</p>` },
    { title: 'First, FirstOrDefault, Single: say what you expect', html: `<ul><li><code>First()</code>: "there is at least one". Throws if empty.</li><li><code>FirstOrDefault()</code>: "there may be none". Returns null (or 0) if empty, so check it.</li><li><code>Single()</code>: "there is exactly one". Throws if empty <b>or</b> if there are two. Good for a lookup by unique key, because a duplicate is a data bug you want to hear about.</li><li><code>Any()</code>: "is there at least one?". Stops at the first match, so it beats <code>Count() &gt; 0</code> on a lazy sequence.</li></ul>` },
    { title: 'Counting words with a Dictionary', html: `<p>To count how often each word appears, a list would need a search for every word: O(n) each, O(n<sup>2</sup>) in total. A <code>Dictionary&lt;string, int&gt;</code> finds the counter for a word in O(1) on average, so the whole job is O(n).</p><p>Handy forms: <code>counts[word] = counts.GetValueOrDefault(word) + 1;</code> or, since .NET 9, <code>words.CountBy(w =&gt; w)</code>.</p>` }
  ],
  deepDive: `<p><b>Generics are real at run time in .NET</b> (the word is "reified"). The runtime knows a <code>List&lt;int&gt;</code> from a <code>List&lt;string&gt;</code>. Each value-type instantiation gets its own machine code that stores raw values, so there is no boxing. Reference-type instantiations share one copy of the code. Java, by contrast, erases the type argument after compiling.</p>
    <p><b>Inside Dictionary:</b> the key's <code>GetHashCode()</code> picks a bucket, then <code>Equals</code> confirms the match among the few entries chained in that bucket. When it fills up, it allocates a bigger array and re-places every entry, which is why passing an initial capacity helps for large known sizes. A bad hash function sends everything to one bucket and lookups fall to O(n). A key whose hash changes after insertion is lost.</p>
    <p><b>yield return</b> makes the compiler rewrite your method into a small class that remembers where it stopped. One catch: argument checks inside an iterator do not run until the first item is requested, so validate in a wrapper method and put the <code>yield</code> part in a private helper.</p>
    <p><b>IQueryable limits:</b> the provider must translate your lambda to SQL. Call your own C# method inside it and EF Core throws at run time. Shape and filter first, then materialise.</p>
    <p><b>Newer pieces:</b> <code>FrozenDictionary</code> and <code>FrozenSet</code> (.NET 8) for read-heavy lookup tables built once, <code>CountBy</code>, <code>AggregateBy</code> and <code>Index</code> (.NET 9), <code>LeftJoin</code> and <code>RightJoin</code> (.NET 10).</p>`,
  aiEra: `<p><b>What AI changes:</b> LINQ is where assistants shine. Describe the shape you want and you get a working <code>GroupBy</code> with a projection in seconds. Syntax recall is no longer the test.</p>
    <p><b>Use AI as a partner:</b> ask about cost and place, not syntax: <code>For this EF Core query, show the SQL it will produce and tell me which parts run in memory.</code> Or: <code>This method enumerates its IEnumerable parameter how many times?</code></p>
    <p><b>Where AI goes wrong:</b> it calls <code>ToList()</code> too early or far too often, mixes in a helper method that EF Core cannot translate, writes <code>Count() &gt; 0</code> where <code>Any()</code> is meant, nests a <code>Where</code> inside a loop to make an accidental O(n<sup>2</sup>), and reaches for <code>List.Contains</code> where a <code>HashSet</code> is needed.</p>
    <p><b>What you must still own:</b> knowing where the work happens (database or memory), how many times it happens, and how it grows with data. Read the generated SQL yourself. A lead is expected to spot "this loads the whole table" in a code review without running it.</p>`,
  problems: [P({
    t: 'The report that queried the database twice', l: 'Medium', tags: ['LINQ', 'deferred execution', 'EF Core'],
    s: 'A sales report method builds <code>var lateOrders = db.Orders.Where(o =&gt; o.DueDate &lt; today);</code>. It then logs <code>lateOrders.Count()</code> and afterwards loops over <code>lateOrders</code> to build the rows. The database log shows two queries, and once in a while the count in the log does not match the number of rows. Explain both effects and fix them.',
    ex: '<p>Log line: "Found <b>41</b> late orders". Rows in the report: <span class="c-r">42</span>. Database trace: one <code>SELECT COUNT(*)</code> and, a moment later, one <code>SELECT ... FROM Orders WHERE DueDate &lt; @today</code>.</p>',
    weak: 'The database is slow and there is probably a caching bug. I would add a retry.',
    why: 'It guesses at infrastructure and misses the cause, which is visible in the code: the query variable is a recipe, and it is run twice.',
    q: ['What does <code>lateOrders</code> hold right after the <code>Where</code> line runs?', ['A list of late orders in memory', 'A description of a query that has not run yet', 'The first late order only', 'An open database cursor'], 1, '<code>Where</code> on an <code>IQueryable</code> only builds the query. It is sent to the database each time something enumerates it.'],
    h: ['Which calls on a LINQ query actually make it run? Count them in this method.', 'Two runs mean two round trips, and the data can change between them. That explains both the extra query and the mismatch.', 'Recipe: materialise once with <code>ToListAsync()</code>, then use <code>list.Count</code> (a property, no query) and loop over the same list.'],
    a: '<p><b>Strong answer:</b> "LINQ queries are deferred. The <code>Where</code> line does not fetch anything, it builds a query. Each thing that enumerates it runs it again. Here <code>Count()</code> runs it once as a COUNT, and the loop runs it a second time as a SELECT. That is the double query."</p><p>"The mismatch is the same bug seen from the other side: an order became late, or was inserted, between the two round trips, so the two answers describe two different moments."</p><p>"The fix is to take one snapshot: <code>var lateOrders = await db.Orders.Where(...).ToListAsync();</code>, then log <code>lateOrders.Count</code> and loop over that list. One query, one consistent answer. If the list could be huge I would page it or stream it instead of loading everything. In review I look for any <code>IEnumerable</code> or <code>IQueryable</code> variable that is used more than once, and many analyzers flag it as possible multiple enumeration."</p>',
    cx: '<p>Before: 2 database round trips and an inconsistent result. After: 1 round trip, with memory proportional to the number of late orders.</p>',
    f: ['When is it wrong to call ToList, and what would you do instead?', 'What is the difference between <code>Count()</code> the method and <code>Count</code> the property?']
  })]
});

// ====================== TOPIC 5: DELEGATES, EVENTS, LAMBDAS, EXCEPTIONS ======================
var CS_DELEGATES = `using System;
using System.Collections.Generic;

class OrderPlacedEventArgs : EventArgs
{
    public int OrderId { get; private set; }
    public OrderPlacedEventArgs(int orderId) { OrderId = orderId; }
}

class OrderService
{
    // An event: outsiders may only subscribe (+=) and unsubscribe (-=).
    public event EventHandler<OrderPlacedEventArgs> OrderPlaced;

    public void Place(int id)
    {
        EventHandler<OrderPlacedEventArgs> handler = OrderPlaced;   // copy, then null-check
        if (handler != null) handler(this, new OrderPlacedEventArgs(id));
    }
}

class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string message, Exception inner) : base(message, inner) { }
}

class Demo
{
    delegate int BinaryOp(int a, int b);            // a custom delegate type

    static void Main()
    {
        BinaryOp add = (a, b) => a + b;
        Func<int, int, int> multiply = (a, b) => a * b;      // Func: returns a value
        Action<string> log = Console.WriteLine;              // Action: returns nothing
        Predicate<int> isEven = n => n % 2 == 0;             // Predicate: returns bool
        log(add(2, 3) + " " + multiply(2, 3) + " " + isEven(4));   // 5 6 True

        Action greet = () => Console.Write("Hello ");
        greet += () => Console.WriteLine("World");           // multicast: both run, in order
        greet();

        var service = new OrderService();
        EventHandler<OrderPlacedEventArgs> onPlaced = (s, e) => Console.WriteLine("Order " + e.OrderId + " placed");
        service.OrderPlaced += onPlaced;
        service.Place(7);
        service.OrderPlaced -= onPlaced;                     // unsubscribe, or the publisher keeps us alive
        service.Place(8);                                    // prints nothing

        // Closures: a lambda captures the VARIABLE, not its value at that moment.
        var actions = new List<Action>();
        for (int i = 0; i < 3; i++) actions.Add(() => Console.Write(i));
        foreach (Action a in actions) a();                   // 333
        Console.WriteLine();
        actions.Clear();
        for (int i = 0; i < 3; i++) { int copy = i; actions.Add(() => Console.Write(copy)); }
        foreach (Action a in actions) a();                   // 012
        Console.WriteLine();

        // Exceptions: specific catch first, keep the inner exception, finally always runs.
        try
        {
            try { throw new KeyNotFoundException("no row with id 7"); }
            catch (KeyNotFoundException ex) { throw new NotFoundException("Order 7 was not found.", ex); }
            finally { Console.WriteLine("inner finally"); }
        }
        catch (NotFoundException ex) when (ex.InnerException != null)    // exception filter
        {
            Console.WriteLine(ex.Message + " Cause: " + ex.InnerException.Message);
        }
    }
}`;

topics.push({
  title: 'Delegates, Events, Lambdas and Exceptions',
  analogy: `<p>A <b>delegate</b> is a <b>phone number written on a card</b>: you can pass the card around, and whoever holds it can call that number later without knowing who answers. An <b>event</b> is a <b>mailing list</b>: anyone can sign up or leave, but only the owner can send to it. A <b>lambda</b> is a number you scribble on the spot instead of looking one up. An <b>exception</b> is a <b>fire alarm</b>: normal work stops at once, and people leave floor by floor until someone who is trained to deal with it takes charge. On every floor on the way out, somebody still switches off the machines (that is <code>finally</code>).</p>`,
  explain: `<p><b>Delegate:</b> a type that holds a reference to a method with a given shape (parameters and return type). It lets you pass behaviour as an argument. You rarely declare your own, because three built-in families cover almost everything:</p>
    <table><thead><tr><th>Type</th><th>Shape</th><th>Example</th></tr></thead><tbody>
      <tr><td><code>Func&lt;int, string&gt;</code></td><td>takes inputs, <b>returns a value</b> (the last type)</td><td><code>n =&gt; n.ToString()</code></td></tr>
      <tr><td><code>Action&lt;string&gt;</code></td><td>takes inputs, <b>returns nothing</b></td><td><code>s =&gt; Console.WriteLine(s)</code></td></tr>
      <tr><td><code>Predicate&lt;int&gt;</code></td><td>takes one input, <b>returns bool</b></td><td><code>n =&gt; n &gt; 0</code></td></tr>
    </tbody></table>
    <p><b>Lambda:</b> a short way to write a method in place: <code>(a, b) =&gt; a + b</code>. A lambda that uses a local variable from outside itself is a <b>closure</b>. It captures the <i>variable</i>, not a snapshot of its value.</p>
    <p><b>Event:</b> a delegate with a lock on it. Code outside the class can only subscribe (<code>+=</code>) and unsubscribe (<code>-=</code>). Only the class itself can raise it. This is publish and subscribe built into the language.</p>
    <p><b>Exception:</b> an object that reports a failure. <code>throw</code> stops the current method and walks back up the call stack until a matching <code>catch</code> is found. <code>finally</code> blocks on the way run no matter what. Three rules cover most interviews: catch only what you can handle, use <code>throw;</code> (not <code>throw ex;</code>) to rethrow, and do not use exceptions for things you expect to happen, such as bad user input.</p>`,
  clues: ['"What is a delegate?" or "Func vs Action vs Predicate"', '"What is the difference between a delegate and an event?"', '"What does this loop print?" with lambdas added to a list inside a for loop', '"What is a closure?"', '"throw vs throw ex"', '"Does finally always run?"', '"How do you handle exceptions globally in your API?"', '"When would you create a custom exception?"', '"What is an expression tree?" or "How does EF Core turn a lambda into SQL?"', '"Memory keeps growing and we use a lot of events" (missing unsubscribe)'],
  code: [{ lang: 'csharp', code: CS_DELEGATES, run: true }],
  codeTitle: ['Delegates, multicast, an event, the closure trap, and exception wrapping with a filter'],
  viz: [
    codeViz('An exception travels up the call stack',
      'void Controller() {\n  try { Service(); }\n  catch (NotFoundException ex) { Log(ex); }\n  finally { StopTimer(); }\n}\nvoid Service() {\n  try { Repo(); }\n  finally { CloseConnection(); }\n}\nvoid Repo() {\n  throw new NotFoundException("Order 7");\n}',
      [
        { line: 2, narr: 'A request arrives. <b>Controller</b> calls Service inside a <code>try</code>.', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller'], hl: { 0: 'cur' } }] },
        { line: 7, narr: '<b>Service</b> calls Repo inside its own <code>try</code>. Service has a <code>finally</code> but <b>no catch</b>.', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller', 'Service'], hl: { 1: 'cur' } }] },
        { line: 11, narr: '<b>Repo</b> cannot find order 7 and <b>throws</b>. Normal execution stops here. The stack trace is recorded now, at the throw.', cls: 'bad', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller', 'Service', 'Repo'], hl: { 2: 'bad' } }] },
        { line: 10, narr: 'The runtime looks for a matching <code>catch</code>. <b>Repo has none</b>, so Repo is abandoned and removed from the stack.', cls: 'bad', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller', 'Service', 'Repo'], hl: { 2: 'done' } }] },
        { line: 7, narr: 'Back in <b>Service</b>: it has a try, but <b>no catch</b> for this type. The exception keeps travelling.', cls: 'bad', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller', 'Service'], hl: { 1: 'bad' } }] },
        { line: 8, narr: 'Before Service is abandoned, its <b>finally runs</b>: the connection is closed. This is why cleanup belongs in <code>finally</code> (or a <code>using</code>).', cls: 'ok', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller', 'Service'], hl: { 1: 'ok' } }, { type: 'text', html: 'Cleanup done: <b>CloseConnection()</b>' }] },
        { line: 3, narr: '<b>Controller</b> has <code>catch (NotFoundException)</code>. The type matches, so the exception is <b>handled here</b> and logged with its full stack trace.', cls: 'ok', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller'], hl: { 0: 'ok' } }] },
        { line: 4, narr: 'Controller\'s <b>finally</b> runs too. It runs on success and on failure.', cls: 'ok', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller'], hl: { 0: 'ok' } }, { type: 'text', html: 'Cleanup done: <b>CloseConnection()</b>, <b>StopTimer()</b>' }] },
        { line: 5, narr: 'Execution continues normally after the try block. If <b>no</b> method had a matching catch, the exception would reach the global handler, or end the process.', extra: [{ type: 'stack', label: 'Call stack (top = running now)', items: ['Controller'], hl: { 0: 'sel' } }] }
      ]),
    codeViz('The closure trap: why the loop prints 333',
      'var actions = new List<Action>();\nfor (int i = 0; i < 3; i++)\n    actions.Add(() => Console.Write(i));\n\nforeach (var a in actions) a();',
      [
        { line: 1, narr: 'We will store three small functions and run them later.', vars: {}, extra: [{ type: 'array', label: 'actions', values: [] }] },
        { line: 2, narr: 'A <code>for</code> loop has <b>one</b> variable i for the whole loop. It starts at 0.', vars: { i: 0 }, hlv: { i: 'ok' }, extra: [{ type: 'array', label: 'actions', values: [] }] },
        { line: 3, narr: 'The lambda mentions i, so it <b>captures the variable i itself</b>, not the number 0. Think of it as holding a link to i.', vars: { i: 0 }, hlv: { i: 'cur' }, extra: [{ type: 'array', label: 'actions', values: ['print(i)'], hl: { 0: 'ok' } }] },
        { line: 3, narr: 'Second pass: i is 1. Another lambda, linked to the <b>same</b> i.', vars: { i: 1 }, hlv: { i: 'cur' }, extra: [{ type: 'array', label: 'actions', values: ['print(i)', 'print(i)'], hl: { 1: 'ok' } }] },
        { line: 3, narr: 'Third pass: i is 2. Three lambdas, one shared variable.', vars: { i: 2 }, hlv: { i: 'cur' }, extra: [{ type: 'array', label: 'actions', values: ['print(i)', 'print(i)', 'print(i)'], hl: { 2: 'ok' } }] },
        { line: 2, narr: 'The loop ends when <b>i becomes 3</b>. No lambda has run yet.', vars: { i: 3 }, hlv: { i: 'bad' }, extra: [{ type: 'array', label: 'actions', values: ['print(i)', 'print(i)', 'print(i)'] }] },
        { line: 5, narr: 'Now they run. Each one reads the shared i, which is 3. Output: <b>333</b>, not 012.', cls: 'bad', vars: { i: 3, output: '333' }, hlv: { output: 'bad' }, extra: [{ type: 'array', label: 'actions', values: ['print(i)', 'print(i)', 'print(i)'], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }] },
        { line: 3, narr: '<b>Fix:</b> copy inside the loop body: <code>int copy = i;</code> and capture <code>copy</code>. Each pass gets a fresh variable, so the output is <b>012</b>. A <code>foreach</code> loop already gives a fresh variable per item.', cls: 'ok', vars: { 'copy (pass 1)': 0, 'copy (pass 2)': 1, 'copy (pass 3)': 2, output: '012' }, hlv: { output: 'ok' } }
      ])
  ],
  examples: [
    { title: 'Passing behaviour: one retry helper for every call', html: `<p>Three services each copy the same "try 3 times, wait, try again" loop. Write it once and pass the work in as a delegate: <code>T Retry&lt;T&gt;(Func&lt;T&gt; work, int attempts)</code>. Callers write <code>Retry(() =&gt; client.GetPrice(id), 3)</code>.</p><p>The helper knows <b>how</b> to retry. The lambda says <b>what</b> to retry. This is the main everyday use of delegates, and it is exactly how LINQ's <code>Where(x =&gt; ...)</code> works.</p>` },
    { title: 'The event that kept a screen alive forever', html: `<p>A long-lived <code>PriceFeed</code> object raises <code>PriceChanged</code>. Every time a user opens a details screen, the screen subscribes with <code>feed.PriceChanged += OnPriceChanged;</code> and never unsubscribes. After a day the process holds thousands of dead screens.</p><p><b>Why:</b> the event's delegate holds a reference to each subscriber, so the garbage collector must keep them. <b>Fix:</b> unsubscribe with <code>-=</code> when the subscriber is finished (often in <code>Dispose</code>).</p>` },
    { title: 'throw; vs throw ex; in a log file', html: `<p>With <code>catch (Exception ex) { log(ex); throw ex; }</code> the stack trace in the next log starts at the <b>catch block</b>. The line that really failed, three calls deeper, is gone.</p><p>With <code>throw;</code> the original trace is kept. If you need to add context, wrap it and pass the original along as the inner exception: <code>throw new OrderException("Could not save order 7", ex);</code>.</p>` }
  ],
  deepDive: `<p><b>What the compiler builds for a closure:</b> a hidden class with a field for each captured variable. The local variable moves into that object on the heap and the lambda becomes a method on it. That is why captured variables outlive the method, and why a lambda in a hot loop allocates. A <code>static</code> lambda (C# 9) is not allowed to capture, so it cannot allocate a closure by accident.</p>
    <p><b>Multicast delegates</b> hold a list of targets. They are called in order. If one throws, the rest are skipped, and for a delegate that returns a value you only get the last result. Use <code>GetInvocationList()</code> when each subscriber must be isolated.</p>
    <p><b>Expression trees:</b> assign the same lambda to <code>Expression&lt;Func&lt;T, bool&gt;&gt;</code> and the compiler builds a <i>data structure describing the code</i> instead of runnable code. EF Core reads that tree to write SQL. This is the real difference between <code>IEnumerable.Where</code> (takes a <code>Func</code>) and <code>IQueryable.Where</code> (takes an <code>Expression</code>).</p>
    <p><b>Exception filters</b> (<code>catch (X ex) when (condition)</code>) are checked before the stack is unwound, so if the filter says no, the exception continues with its original state untouched.</p>
    <p><b>Cost:</b> a <code>try</code> block is almost free when nothing is thrown. Throwing is expensive (.NET 9 made it several times faster, but it is still far slower than returning a value), so use <code>TryParse</code> or <code>TryGetValue</code> for expected failures.</p>
    <p><b>In ASP.NET Core</b> handle the rest in one place: <code>AddProblemDetails()</code> with an <code>IExceptionHandler</code> (.NET 8 and later) turns unhandled exceptions into consistent Problem Details responses (RFC 9457) with no stack trace sent to the client.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write event wiring, custom exception classes and try/catch scaffolding without effort. They also read stack traces well: paste one and you get a decent first theory.</p>
    <p><b>Use AI as a partner:</b> <code>Here is a stack trace and the method it points at. List three possible causes and what I should log to tell them apart.</code> Or: <code>Find every event subscription in this class that has no matching unsubscribe.</code></p>
    <p><b>Where AI goes wrong:</b> it wraps everything in <code>catch (Exception)</code> and logs-and-continues, which hides failures. It still writes <code>throw ex;</code>. It adds serialization constructors to custom exceptions, which are obsolete since .NET 8. It catches <code>OperationCanceledException</code> and reports a cancelled request as an error. And it happily captures a loop variable.</p>
    <p><b>What you must still own:</b> the failure policy. Which errors does the caller see as 400, 404, 409 or 500? What is retried? What gets logged, and what must never be logged? Those are product and operations decisions, and a tech lead sets them once for the whole codebase.</p>`,
  problems: [P({
    t: 'Six buttons, one number', l: 'Easy', tags: ['closure', 'lambda', 'loops'],
    s: 'A desktop tool creates six "Open table N" buttons in a <code>for</code> loop and gives each a click handler: <code>button.Click += (s, e) =&gt; OpenTable(i);</code>. Every button opens table 6, which does not even exist. Explain why and fix it.',
    ex: '<p>Loop: <code>for (int i = 0; i &lt; 6; i++) { ... }</code>. Expected: button 0 opens table 0, button 5 opens table 5. Actual: <span class="c-r">every button calls OpenTable(6)</span>.</p>',
    weak: 'It is a timing issue in the UI framework, so I would add a small delay before attaching the handler.',
    why: 'There is no timing problem. All six lambdas share one variable, and a delay would change nothing.',
    q: ['What does a C# lambda capture when it uses an outer local variable?', ['The value the variable had when the lambda was created', 'The variable itself, so it sees later changes', 'A copy made when the lambda first runs', 'Nothing, it re-reads the source code'], 1, 'Closures capture variables, not values. The lambda reads the variable when it runs.'],
    h: ['How many variables named i exist during the whole loop? When do the handlers actually run?', 'By the time anyone clicks, the loop has finished and i has its final value.', 'Recipe: declare a new variable inside the loop body (<code>int table = i;</code>) and use that in the lambda. Each pass then captures its own variable.'],
    a: '<p><b>Strong answer:</b> "A lambda captures the variable, not the value. A <code>for</code> loop declares one <code>i</code> for the whole loop, so all six handlers share it. They run later, on click, when the loop has ended and <code>i</code> is 6. So every handler reads 6."</p><p>"The fix is one line: inside the loop body write <code>int table = i;</code> and use <code>table</code> in the lambda. A variable declared inside the body is new on every pass, so each handler gets its own. A <code>foreach</code> loop does not have this problem, because since C# 5 its loop variable is fresh for each item."</p><p>"Under the hood the compiler lifts the captured variable into a hidden class, which is also why captured variables live on the heap."</p>',
    cx: '<p>The fix costs one small heap object per pass (6 in total) instead of one shared object. Nothing else changes.</p>',
    f: ['Why did C# 5 change foreach but not for?', 'What is a static lambda and how does it prevent this class of bug?']
  })]
});

// ====================== PRACTICE (3 Easy, 5 Medium, 4 Hard) ======================
practice.push(P({
  t: 'The invoice that is one cent out', l: 'Easy', tags: ['decimal', 'double', 'money'],
  s: 'Finance reports that about one invoice in a thousand differs from the bank statement by 0.01. The line totals are stored and added as <code>double</code>. What is happening and what do you change?',
  ex: '<p><code>double total = 0.1 + 0.2;</code> gives <span class="c-r">0.30000000000000004</span>. <code>decimal total = 0.1m + 0.2m;</code> gives <span class="c-g">0.3</span>.</p><p>After many additions and a rounding step, the tiny error sometimes tips a value across a half-cent boundary.</p>',
  weak: 'Floating point is just inaccurate, so I would round every value to 2 places after each calculation.',
  why: 'Rounding hides the error some of the time and moves it at other times. It does not remove the cause, which is the choice of type.',
  q: ['Why can <code>double</code> not hold 0.1 exactly?', ['It stores numbers in base 2, and 0.1 has no exact base 2 form', 'It only has 4 bytes', 'It rounds to 2 places', 'It is a reference type'], 0, 'Like 1/3 in decimal, 0.1 repeats forever in binary, so the stored value is a close neighbour.'],
  h: ['Print <code>0.1 + 0.2</code> as a double. What do you see?', 'C# has a numeric type that stores base 10 digits. Which one, and what suffix do its literals use?', 'Recipe: decimal for every money value end to end (database column, entity, DTO, calculations), one agreed rounding rule applied once at the end, and a test with the known failing invoice.'],
  a: '<p><b>Strong answer:</b> "This is binary floating point. <code>double</code> stores values in base 2, so amounts like 0.10 are stored as the nearest possible neighbour. The errors are tiny but they add up, and when we round to cents, now and then one lands on the wrong side."</p><p>"The fix is to use <code>decimal</code> for money everywhere: the database column, the entity, the DTO and every calculation. <code>decimal</code> is base 10 with 28 to 29 significant digits, so 0.1m + 0.2m is exactly 0.3m. I would also agree one rounding rule with finance, for example round half away from zero on the invoice total, apply it in one place, and add a regression test using a real invoice that failed. Before releasing I would run a script that recalculates past invoices so we know how many were affected."</p>',
  cx: '<p><code>decimal</code> is 16 bytes and slower than <code>double</code>, but for invoice sums the difference is not measurable. Correctness wins.</p>',
  f: ['Which rounding does Math.Round use by default?', 'When is double still the right choice?']
}));
practice.push(P({
  t: 'The discount that never applied', l: 'Easy', tags: ['struct', 'value types', 'copy'],
  s: 'A cart line is declared as <code>struct CartLine { public decimal Price; }</code>. A method <code>void ApplyDiscount(CartLine line) { line.Price *= 0.9m; }</code> is called for each line, yet the totals do not change. Why, and what are the options?',
  ex: '<p>Before the call: <code>line.Price = 100</code>. Inside the method: <code>90</code>. After the call, back in the caller: <span class="c-r">100</span>.</p>',
  weak: 'The method must have a bug in the maths. I would debug the multiplication.',
  why: 'The maths is right. The method is working on its own copy, so the caller never sees the result.',
  q: ['What does a method receive when you pass a struct without any keyword?', ['A reference to the caller\'s struct', 'A copy of the whole struct', 'A boxed object', 'A read-only view'], 1, 'Structs are value types, and arguments are passed by value, so the whole struct is copied.'],
  h: ['Is <code>CartLine</code> a value type or a reference type? What does that mean for arguments?', 'Three ways to let the caller see a change: return the new value, pass by <code>ref</code>, or use a class.', 'Recipe: prefer an immutable type and return a new value (<code>line = line.WithDiscount(0.9m)</code>). Use a class if the line has identity and is shared.'],
  a: '<p><b>Strong answer:</b> "<code>CartLine</code> is a struct, so it is a value type, and passing it to a method copies it. The method reduces the price of its own copy, which is thrown away on return."</p><p>"There are three fixes. Pass it with <code>ref</code>, which works but spreads mutation around. Make it a class, so the method and the caller share one object. Or, my preference for a small data shape, make it immutable and return a new value: <code>line = line.WithDiscount(0.9m)</code>, or a <code>record</code> with a <code>with</code> expression. I would also ask why it is a struct at all. A cart line has several fields and is passed around a lot, so a class or a record is the more natural choice. Structs are for tiny values such as a point or a money amount."</p>',
  cx: '<p>Returning a new small value is as cheap as the copy that already happens. No extra allocation for a struct.</p>',
  f: ['Why does <code>list[0].Price = 5</code> not even compile for a list of structs?', 'What does readonly struct add?']
}));
practice.push(P({
  t: 'A crawler takes down the product list', l: 'Easy', tags: ['TryParse', 'input validation'],
  s: 'Your product list endpoint reads <code>int.Parse(query["page"])</code>. Monitoring shows a burst of 500 errors with <code>FormatException</code>: a crawler is calling <code>?page=abc</code> and <code>?page=</code>. How do you fix the code, and what should the caller get back?',
  ex: '<p><code>?page=2</code> works. <code>?page=abc</code> gives <span class="c-r">500 FormatException</span>. A missing page gives <span class="c-r">500 ArgumentNullException</span>.</p>',
  weak: 'Wrap the Parse call in try and catch and return page 1 inside the catch.',
  why: 'It works, but it uses an exception for something that is expected. That is slow under a flood of bad requests and hides the intent.',
  q: ['Which call returns false instead of throwing on bad text?', ['<code>int.Parse</code>', '<code>Convert.ToInt32</code>', '<code>int.TryParse</code>', '<code>(int)text</code>'], 2, '<code>TryParse</code> reports failure through its bool return value and gives the number through an out parameter.'],
  h: ['Is bad text in a query string a bug in your code, or something you should expect?', 'Compare what Parse, Convert.ToInt32 and TryParse each do with null and with "abc".', 'Recipe: <code>if (!int.TryParse(text, out var page) || page &lt; 1) page = 1;</code> or return a 400 with a clear message. Also cap the page size.'],
  a: '<p><b>Strong answer:</b> "Input from outside is expected to be wrong sometimes, so it should not be handled with exceptions. I would switch to <code>int.TryParse</code>, which returns false for null, empty or non-numeric text and never throws: <code>if (!int.TryParse(text, out var page) || page &lt; 1) page = 1;</code>."</p><p>"Then I would decide the contract with the team. For a public list endpoint, falling back to page 1 is friendly. For a stricter API, return 400 with a message that names the parameter. Either way it must not be a 500, because a 500 says our server is broken and it pages someone at night. In ASP.NET Core I would normally bind the parameter as an <code>int</code> with validation attributes, so the framework returns the 400 for me. I would also check range: a negative page or a page size of a million is the same class of bug."</p>',
  cx: '<p><code>TryParse</code> on bad input is a simple scan of the text. Throwing and catching costs far more per request.</p>',
  f: ['What does Convert.ToInt32(null) return, and why is that dangerous?', 'How does model binding report this error?']
}));
practice.push(P({
  t: 'The export that slows down the longer it runs', l: 'Medium', tags: ['string', 'StringBuilder', 'performance'],
  s: 'A nightly job builds a CSV of 200,000 order lines with <code>csv += line + "\\n";</code> in a loop. It takes 40 minutes and memory use looks like a saw blade. The same job with 2,000 lines takes under a second. Explain the curve and fix it.',
  ex: '<p>2,000 lines: under 1 second. 200,000 lines (100 times more): <span class="c-r">far more than 100 times slower</span>. The profiler shows most time in string concatenation and garbage collection.</p>',
  weak: 'Strings are slow in .NET, so we need a bigger server for the job.',
  why: 'More hardware does not change the shape of the curve. The work grows with the square of the number of lines.',
  q: ['What happens on each <code>csv += line</code>?', ['The existing string grows in place', 'A new string is allocated and everything so far is copied into it', 'The line is added to a hidden list', 'Nothing until the loop ends'], 1, 'Strings are immutable, so each concatenation builds a brand-new string containing all the previous text.'],
  h: ['Can a string be changed after it is created? So what must <code>+=</code> do?', 'If each step copies everything written so far, what is the total copying for n lines?', 'Recipe: <code>StringBuilder</code> for building in memory. Better for a file: write each line straight to a <code>StreamWriter</code> so the whole CSV is never in memory.'],
  a: '<p><b>Strong answer:</b> "Strings are immutable. Each <code>+=</code> allocates a new string and copies all the text built so far, then the old one becomes garbage. Line 1 copies a little, line 200,000 copies almost the whole file. Total copying grows with n squared, which is why 100 times the data costs roughly 10,000 times the copying, and why the garbage collector is so busy."</p><p>"The first fix is <code>StringBuilder</code>: it keeps a growable buffer, so appending is cheap and the total work is linear. The better fix for an export is not to hold the file in memory at all: open a <code>StreamWriter</code> and write each line as it is produced. Memory then stays flat whatever the size. I would also read the orders as a stream instead of loading 200,000 objects first, and I would escape commas and quotes properly or use a CSV library."</p>',
  cx: '<p>Before: O(n<sup>2</sup>) copying and O(n) live memory with heavy garbage. After, streaming: O(n) time and O(1) memory.</p>',
  f: ['When is plain + on strings perfectly fine?', 'What does string.Join do that a loop with += does not?']
}));
practice.push(P({
  t: 'The key that is in the dictionary but cannot be found', l: 'Medium', tags: ['Equals', 'GetHashCode', 'Dictionary'],
  s: 'A cache is a <code>Dictionary&lt;ProductKey, Price&gt;</code>, where <code>ProductKey</code> is a class with <code>Sku</code> and <code>Region</code>. Lookups with a freshly created key that has the same Sku and Region always miss. A second bug: some entries that were added can no longer be found even with the original key object. Explain both.',
  ex: '<p><code>cache[new ProductKey("TEA", "EU")] = price;</code> then <code>cache.ContainsKey(new ProductKey("TEA", "EU"))</code> returns <span class="c-r">false</span>.</p><p>Elsewhere: <code>key.Region = "UK";</code> is run after the key was added.</p>',
  weak: 'Dictionary is unreliable for objects, so I would use a list and loop through it.',
  why: 'It trades a correctness bug for an O(n) search and still does not say what "the same key" means.',
  q: ['Two objects are equal according to <code>Equals</code>. What must be true of their hash codes?', ['They must be different', 'They must be the same', 'Nothing, the two are unrelated', 'They must be zero'], 1, 'Equal objects must return equal hash codes. Otherwise the dictionary looks in the wrong bucket.'],
  h: ['How does a class compare for equality if you write nothing?', 'A dictionary uses the hash code to pick a bucket first. What happens if the hash of a stored key changes later?', 'Recipe: make the key an immutable value: a <code>record</code> or <code>readonly record struct</code> with init-only properties. Equality and hashing are then generated from Sku and Region.'],
  a: '<p><b>Strong answer:</b> "Two separate rules are being broken. First, a class uses reference equality by default, so two key objects with the same Sku and Region are different keys. To get value equality I must override <code>Equals</code> and <code>GetHashCode</code> together, with the rule that equal objects return the same hash."</p><p>"Second, the key is mutable. The dictionary files an entry under the hash it had when it was added. If <code>Region</code> changes later, the hash changes, lookups go to a different bucket, and the entry is stranded. It is still in memory but nobody can reach it."</p><p>"The fix for both is one line: <code>public readonly record struct ProductKey(string Sku, string Region);</code>. The compiler generates equality and hashing from the two values and the type is immutable, so the hash can never drift. If case should not matter for Sku, I normalise it in a factory method."</p>',
  cx: '<p>Lookups return to O(1) on average. A record struct key also avoids a heap allocation per lookup.</p>',
  f: ['What happens if GetHashCode returns the same constant for every key?', 'Why implement IEquatable&lt;T&gt; on a struct key?']
}));
practice.push(P({
  t: 'The override that is not called', l: 'Medium', tags: ['virtual', 'override', 'new'],
  s: 'A payroll app has <code>Employee.CalculateBonus()</code> and <code>Manager : Employee</code> with its own <code>CalculateBonus()</code>. Managers are getting the normal employee bonus. The build has a warning that nobody read: "Manager.CalculateBonus() hides inherited member". What is wrong, and how do you stop it happening again?',
  ex: '<p><code>List&lt;Employee&gt; staff</code> contains a <code>Manager</code>. <code>staff[0].CalculateBonus()</code> returns the <span class="c-r">employee</span> bonus. <code>((Manager)staff[0]).CalculateBonus()</code> returns the manager bonus.</p>',
  weak: 'The list must contain the wrong objects, so I would check how the list is filled.',
  why: 'The objects are right. The call is bound to the base method at compile time because the method was never made virtual.',
  q: ['With method hiding (<code>new</code>), which type decides the method that runs?', ['The run-time type of the object', 'The compile-time type of the variable', 'The type listed first in the file', 'It is random'], 1, 'Hidden methods are not virtual, so the compiler picks the method from the variable\'s declared type.'],
  h: ['Is the base method marked <code>virtual</code>? Is the derived one marked <code>override</code>?', 'Without those two words, the derived method only hides the base one. Which type then decides the call?', 'Recipe: <code>virtual</code> (or <code>abstract</code>) on the base, <code>override</code> on the derived class, and turn that warning (CS0108) into a build error.'],
  a: '<p><b>Strong answer:</b> "The base method is not <code>virtual</code> and the derived one is not <code>override</code>, so the manager version hides the employee version instead of replacing it. Hiding is resolved at compile time from the variable type. The payroll loop holds every person as <code>Employee</code>, so it always calls the employee method. The compiler told us with warning CS0108."</p><p>"The fix is to mark <code>Employee.CalculateBonus</code> as <code>virtual</code>, or <code>abstract</code> if every kind of employee must define it, and mark the manager version <code>override</code>. Then the object type decides at run time. To prevent a repeat I would treat that warning as an error in the build, and add a test that puts a manager into a <code>List&lt;Employee&gt;</code> and checks the bonus. Longer term, if bonus rules keep multiplying, I would move them out into an <code>IBonusRule</code> strategy instead of growing the class tree."</p>',
  cx: '<p>A virtual call costs one extra table lookup, a few nanoseconds. It is irrelevant next to a wrong salary.</p>',
  f: ['When is hiding with new ever the right tool?', 'What does sealed override do?']
}));
practice.push(P({
  t: 'The search screen that loads the whole table', l: 'Medium', tags: ['IQueryable', 'IEnumerable', 'EF Core'],
  s: 'A customer search endpoint takes 9 seconds. The repository method is <code>IEnumerable&lt;Customer&gt; GetAll() =&gt; db.Customers;</code> and the service does <code>repo.GetAll().Where(c =&gt; c.City == city).Take(20).ToList()</code>. The table has 3 million rows. Explain what the database is asked to do and how you fix it.',
  ex: '<p>SQL seen in the log: <code>SELECT * FROM Customers</code>. <span class="c-r">No WHERE, no TOP.</span> The filter and the Take(20) happen in the web server\'s memory.</p>',
  weak: 'Add an index on City and more memory to the web server.',
  why: 'An index cannot help a query that has no WHERE clause. The filter never reaches the database.',
  q: ['Why does returning <code>IEnumerable&lt;Customer&gt;</code> from the repository change where the filter runs?', ['LINQ operators after that point are the in-memory versions that take delegates', 'IEnumerable is slower by design', 'It disables indexes', 'It does not change anything'], 0, 'The variable\'s static type decides which <code>Where</code> is called. On <code>IEnumerable</code> it is LINQ to Objects, which pulls every row.'],
  h: ['Look at the return type of the repository method. Which <code>Where</code> does the compiler pick after that?', '<code>IQueryable.Where</code> takes an expression that can become SQL. <code>IEnumerable.Where</code> takes a delegate that runs in memory.', 'Recipe: push the filter, order and Take into the query before it is run. Give the repository a purpose-built method, and project to only the columns you need.'],
  a: '<p><b>Strong answer:</b> "The repository returns <code>IEnumerable</code>, so from that point the compiler uses LINQ to Objects. The <code>Where</code> and <code>Take</code> run in memory, which means EF Core has to fetch all 3 million rows first. That matches the SQL in the log: no WHERE and no TOP."</p><p>"The fix is to compose the filter while the query is still an <code>IQueryable</code>, so it becomes part of the SQL. I would add a specific repository method such as <code>SearchByCityAsync(city, take, ct)</code> that does <code>db.Customers.Where(c =&gt; c.City == city).OrderBy(c =&gt; c.Name).Take(take)</code>, projects to a small DTO, uses <code>AsNoTracking()</code> because it is read-only, and ends with <code>ToListAsync</code>. Then an index on City actually helps. I would not expose <code>IQueryable</code> from the repository either, because that leaks query building into every caller. In review I check the generated SQL for any list screen."</p>',
  cx: '<p>Before: 3 million rows over the network for every search. After: an index seek and 20 small rows.</p>',
  f: ['What happens if the Where calls a C# helper method that EF Core cannot translate?', 'Why add OrderBy before Take?']
}));
practice.push(P({
  t: 'Quiet failures and useless stack traces', l: 'Medium', tags: ['exceptions', 'throw', 'logging'],
  s: 'You join a team whose booking service has this pattern in about 60 places: <code>try { ... } catch (Exception ex) { _log.Error(ex.Message); throw ex; }</code>, and in a few places an empty <code>catch { }</code>. Support says errors are hard to trace and some bookings silently do nothing. What is wrong with each form, and what standard do you set?',
  ex: '<p>Log line: <code>Object reference not set to an instance of an object</code>. <span class="c-r">No stack trace, no booking id.</span> The trace that reaches the top-level handler points at the catch block, not at the line that failed.</p>',
  weak: 'Add more try and catch blocks so nothing can crash, and log every message.',
  why: 'That is the current disease, not the cure. More catching means more hidden failures and more noise.',
  q: ['What is lost when you write <code>throw ex;</code> instead of <code>throw;</code>?', ['The exception message', 'The original stack trace', 'The inner exception', 'Nothing'], 1, '<code>throw ex;</code> restarts the stack trace at the catch block. <code>throw;</code> keeps the original.'],
  h: ['Three separate problems: what is logged, how it is rethrown, and the empty catch. Take them one at a time.', 'Ask of each catch: can this code actually do something useful about the failure?', 'Recipe: remove catches that only log and rethrow, log once at one global handler with the full exception object, use <code>throw;</code>, and replace empty catches with a specific exception type plus a reason.'],
  a: '<p><b>Strong answer:</b> "Three problems. Logging only <code>ex.Message</code> drops the type, the stack trace and inner exceptions. <code>throw ex;</code> resets the stack trace to the catch block, so even the top-level log points at the wrong line. And the empty catch swallows failures, which is why bookings silently do nothing."</p><p>"The standard I would set: <b>catch only where you can handle, add context, or translate</b>. Everything else bubbles up to one global handler that logs the whole exception object once, with the booking id and a correlation id as structured fields, and returns a consistent Problem Details response without a stack trace. Where we do rethrow, it is <code>throw;</code>. Where we add context, we wrap and pass the original as the inner exception. An empty catch is only allowed for a named exception type with a comment that says why ignoring it is safe."</p><p>"I would roll it out with an analyzer rule for <code>throw ex</code> and empty catch blocks, fix the booking path first, and remove the rest module by module."</p>',
  cx: '<p>Fewer catch blocks, one log entry per failure instead of several partial ones, and a trace that points at the real line.</p>',
  f: ['How do you rethrow an exception captured on another thread without losing its trace?', 'Should a cancelled request be logged as an error?']
}));
practice.push(P({
  t: 'Memory that only goes up', l: 'Hard', tags: ['events', 'memory leak', 'lifetime'],
  s: 'A long-running order-processing service grows by about 200 MB a day until it is restarted. A memory dump shows hundreds of thousands of <code>OrderViewModel</code> objects that should be short-lived, all reachable from a single static <code>PriceFeed</code> object. Explain how a garbage-collected language leaks like this and how you fix and prevent it.',
  ex: '<p>In the constructor: <code>PriceFeed.Instance.PriceChanged += OnPriceChanged;</code>. There is no matching <code>-=</code> anywhere.</p><p>Dump: <code>PriceFeed</code> (static) → event delegate list → <span class="c-r">312,000 OrderViewModel</span>.</p>',
  weak: 'The garbage collector is not keeping up, so I would call GC.Collect() every few minutes.',
  why: 'The collector is working correctly. These objects are still reachable, so no amount of collecting can free them.',
  q: ['Why can the garbage collector not free the view models?', ['They are too large', 'The publisher\'s event holds a delegate that references each subscriber', 'Events are stored outside the managed heap', 'They are structs'], 1, 'A subscription is a reference from the publisher to the subscriber. A long-lived publisher keeps every subscriber alive.'],
  h: ['The collector frees what is unreachable. Find the chain of references that still reaches these objects.', 'What does <code>+=</code> on an event store, and inside which object?', 'Recipe: unsubscribe when the subscriber is finished (in <code>Dispose</code>), or avoid the static event with a scoped mediator or a weak event pattern. Verify with a second dump after a load test.'],
  a: '<p><b>Strong answer:</b> "In .NET a leak means objects that are still reachable but no longer needed. An event subscription stores a delegate inside the publisher, and that delegate holds a reference to the subscriber. Here the publisher is static, so it lives for the life of the process, and every view model that ever subscribed is kept alive through it. The dump shows exactly that chain."</p><p>"The fix is to end the subscription when the subscriber is done. I would make <code>OrderViewModel</code> implement <code>IDisposable</code>, unsubscribe with <code>-=</code> in <code>Dispose</code>, and make sure the owner disposes it, ideally through a <code>using</code> or the dependency injection scope. If we cannot guarantee disposal, I would remove the static event and use a weak event pattern or a message bus where the subscription is a disposable token."</p><p>"To prove it, I would run a load test and compare two memory dumps: the count of view models should return to near zero. To prevent it, I add a review rule: every <code>+=</code> on a longer-lived object needs a visible <code>-=</code>, and we watch the heap size metric with an alert on steady growth."</p>',
  cx: '<p>Memory returns to a flat line under steady load. The cost is one unsubscribe call per object.</p>',
  f: ['Does a lambda subscriber make unsubscribing harder? Why?', 'Which tools would you use to capture and read the dump?']
}));
practice.push(P({
  t: 'Five levels of payment classes', l: 'Hard', tags: ['inheritance', 'composition', 'refactoring'],
  s: 'An online shop has <code>Payment → CardPayment → CreditCardPayment → RewardsCreditCardPayment → CorporateRewardsCreditCardPayment</code>. Adding "pay in instalments" would need new subclasses under three branches. A change to fraud checks in <code>CardPayment</code> last month broke gift cards. You are asked for a plan. What is your diagnosis and how do you move away from it safely?',
  ex: '<p>Behaviours that vary on their own: <b>how money is captured</b> (card, wallet, gift card), <b>fees</b>, <b>rewards</b>, <b>fraud checks</b>, <b>instalments</b>.</p><p>With inheritance, each new combination is a new class: <span class="c-r">3 × 2 × 2 × 2 = 24 possible subclasses</span>.</p>',
  weak: 'Add another base class in the middle for the shared instalment logic and carry on.',
  why: 'It makes the tree deeper, which is the problem. Each extra level adds hidden coupling between a base class and every child below it.',
  q: ['What is the "fragile base class" problem?', ['Base classes use more memory', 'A change in a base class breaks derived classes in ways the author cannot see', 'Base classes cannot be tested', 'Derived classes run more slowly'], 1, 'Children depend on details of the base class, so a harmless-looking change above can break behaviour below.'],
  h: ['List the things that vary. Do they vary together or independently?', 'If they vary independently, a single inheritance tree can only follow one of them. The rest become combinations.', 'Recipe: one <code>Payment</code> class that <b>has</b> a capture method, a fee policy, a rewards policy and a list of fraud rules, each behind a small interface. Migrate one branch at a time behind tests that pin current behaviour.'],
  a: '<p><b>Strong answer:</b> "The tree is modelling several independent choices with one inheritance chain: capture method, fees, rewards, fraud rules, and now instalments. Inheritance can follow only one axis, so every other axis turns into a combination and a new subclass. And because children rely on base class internals, a fraud change in <code>CardPayment</code> broke gift cards. That is the fragile base class problem."</p><p>"I would move to composition. One <code>Payment</code> that has an <code>ICaptureMethod</code>, an <code>IFeePolicy</code>, an <code>IRewardsPolicy</code> and a list of <code>IFraudRule</code>. Instalments become one more policy, not three subclasses. A factory or the dependency injection container assembles the right set for each payment type."</p><p>"I would not rewrite it in one go. First, characterisation tests that record what each existing class does today. Second, extract one axis, fraud rules, because that is where the incident was, and have the old classes delegate to it. Third, repeat per axis until the subclasses are empty shells, then delete them. Each step ships on its own, and I would report progress as the number of payment classes left."</p>',
  cx: '<p>Classes grow as a sum (3 + 2 + 2 + 2 small policies) instead of a product (24 combinations). Each policy is testable alone.</p>',
  f: ['When is inheritance still the right choice?', 'How do you keep the composed object from becoming a bag of nullable parts?']
}));
practice.push(P({
  t: 'Ten million allocations per second in a pricing loop', l: 'Hard', tags: ['boxing', 'generics', 'performance'],
  s: 'A pricing engine recalculates 2 million quotes per run. A profile shows garbage collection taking 35% of the time, and the top allocated type is <code>System.Int32</code>, followed by a small struct called <code>QuoteKey</code>. The code uses an <code>ArrayList</code> of ids, a <code>Dictionary&lt;QuoteKey, decimal&gt;</code> where <code>QuoteKey</code> is a plain struct, and a logging call <code>Log(string format, params object[] args)</code> inside the loop. Find the hidden allocations and remove them.',
  ex: '<p>An <code>int</code> should never appear as a heap object. Seeing <span class="c-r">System.Int32</span> at the top of an allocation profile means values are being <b>boxed</b>.</p>',
  weak: 'Switch the garbage collector to server mode and give the process more memory.',
  why: 'It tunes the cleaner instead of stopping the mess. The allocations are avoidable, and removing them removes the collections.',
  q: ['Which of these boxes an int?', ['<code>List&lt;int&gt;.Add(5)</code>', '<code>ArrayList.Add(5)</code>', '<code>int x = 5;</code>', '<code>Span&lt;int&gt;</code> indexing'], 1, '<code>ArrayList</code> stores <code>object</code>, so every int is wrapped in a new heap object.'],
  h: ['Boxing happens whenever a value type is handed to something that expects <code>object</code> or an interface. Find three such places.', 'A struct key without <code>IEquatable&lt;T&gt;</code> falls back to <code>Equals(object)</code>. What does that argument type force?', 'Recipe: <code>List&lt;int&gt;</code>, a <code>readonly record struct</code> key (or implement <code>IEquatable&lt;QuoteKey&gt;</code> and <code>GetHashCode</code>), and guard or remove the logging call in the hot loop. Then measure again.'],
  a: '<p><b>Strong answer:</b> "Seeing <code>Int32</code> as a heap type means boxing. I see three sources. One: <code>ArrayList</code> stores <code>object</code>, so every id is boxed on add and unboxed on read. Replace it with <code>List&lt;int&gt;</code>. Two: <code>QuoteKey</code> is a struct with no <code>IEquatable&lt;QuoteKey&gt;</code>, so the dictionary compares keys through <code>Equals(object)</code>, which boxes the key on each comparison, and the default struct equality may use reflection. Make it a <code>readonly record struct</code> or implement <code>IEquatable</code> and <code>GetHashCode</code> by hand. Three: <code>params object[]</code> allocates an array and boxes every number on each call, even when that log level is off. Check <code>IsEnabled</code> first, or use the source-generated logging methods, or move the log out of the loop."</p><p>"Then I measure again with the same profile and a benchmark, because the goal is the 35% in garbage collection, not the code style. I would expect allocations per quote to drop to near zero and the run time to fall by roughly that third. I would keep the benchmark in the repository so a later change cannot quietly bring boxing back."</p>',
  cx: '<p>Per quote: from several heap objects to none. Garbage collection time should fall from about a third of the run to a small fraction.</p>',
  f: ['Why does a generic List&lt;int&gt; not box?', 'Does calling an interface method on a struct always box?']
}));
practice.push(P({
  t: 'The limit that changed in the library but not in the apps', l: 'Hard', tags: ['const', 'readonly', 'versioning'],
  s: 'A shared library used by 12 services has <code>public const int MaxItemsPerOrder = 50;</code>. The business raises the limit to 100. The library is updated and deployed as a new DLL to all services, without rebuilding them. Four services still reject orders above 50. Explain why, and say what you change in the code and in the release process.',
  ex: '<p>Library v2 on disk: <code>MaxItemsPerOrder = 100</code>. Service A (rebuilt): accepts 80 items. Service B (old build, new DLL dropped in): <span class="c-r">rejects 80 items</span>.</p>',
  weak: 'Those services must be caching the old DLL, so restart them.',
  why: 'A restart loads the new library correctly. The old number is not in the library any more. It is inside the service\'s own compiled code.',
  q: ['Where does the value of a <code>public const</code> live after a consumer is compiled?', ['Only in the library that declares it', 'Copied into every assembly that uses it', 'In the config file', 'In the registry'], 1, 'The compiler substitutes the literal value at each use, so consumers carry their own copy.'],
  h: ['When is a <code>const</code> value read: at compile time or at run time?', 'So what does a compiled consumer contain: a reference to the field, or the number 50?', 'Recipe: <code>static readonly</code> or a property for anything that can change between releases. Better still for a business limit: configuration. And always rebuild consumers against a new library version.'],
  a: '<p><b>Strong answer:</b> "A <code>const</code> is a compile-time constant. The compiler copies the literal 50 into every assembly that uses it. Swapping in a new library DLL changes nothing for a service that was not rebuilt, because that service is no longer reading the field. It has its own 50 baked in. The same trap exists for default values of optional parameters."</p><p>"In the code I would change it to <code>public static readonly int</code> or a static property, which is read from the library at run time. But the real issue is that a business limit is not a constant at all. It belongs in configuration, with a sensible default, so it can change without a release and can differ per market."</p><p>"In the process: a shared library should be shipped as a versioned package, and consumers pick up a new version by rebuilding and running their tests, never by copying a DLL. I would reserve <code>public const</code> for things that are true forever, such as the number of minutes in an hour, and add that rule to our review checklist."</p>',
  cx: '<p>Reading a static readonly field costs the same as a constant after JIT compilation in almost all cases. Reading from configuration costs one lookup at start-up.</p>',
  f: ['Why is the same true for optional parameter defaults?', 'Is an internal or private const safe from this? Why?']
}));

// ====================== QUIZ (12) ======================
quiz.push({ q: 'What does this print?<pre><code>struct P { public int X; }\nvar a = new P { X = 1 };\nvar b = a;\nb.X = 5;\nConsole.WriteLine(a.X);</code></pre>', options: ['1', '5', '0', 'It does not compile'], answer: 0, explain: 'A struct is a value type. <code>b = a</code> copies the data, so changing b leaves a alone.' });
quiz.push({ q: 'Which type should hold a price in an invoicing system?', options: ['<code>float</code>', '<code>double</code>', '<code>decimal</code>', '<code>long</code> holding the price in whole currency units'], answer: 2, explain: '<code>decimal</code> is base 10, so amounts such as 0.10 are stored exactly. <code>float</code> and <code>double</code> are binary and drift.' });
quiz.push({ q: 'Which line causes boxing?', options: ['<code>List&lt;int&gt; list = new List&lt;int&gt;(); list.Add(1);</code>', '<code>object o = 42;</code>', '<code>int? n = 42;</code>', '<code>long big = 42;</code>'], answer: 1, explain: 'Assigning a value type to <code>object</code> wraps it in a new heap object. A generic list of int stores raw ints, and <code>int?</code> is still a struct.' });
quiz.push({ q: 'A method is declared <code>void Fill(out int count)</code>. Which statement is true?', options: ['The caller must assign count before the call', 'The method must assign count before it returns', 'count is passed as a read-only copy', 'out can only be used with reference types'], answer: 1, explain: '<code>out</code> means "the method produces this value". The caller need not initialise it, and the method must set it on every path.' });
quiz.push({ q: 'A library exposes <code>public const int Limit = 50;</code> and later changes it to 100. A consumer app is not rebuilt but gets the new DLL. What limit does the app use?', options: ['100', '50', '0', 'It throws at start-up'], answer: 1, explain: 'A const is copied into the consumer at compile time, so the old value stays until the app is rebuilt. <code>static readonly</code> avoids this.' });
quiz.push({ q: 'What does this print?<pre><code>class A { public virtual string Hi() =&gt; "A"; public string Id() =&gt; "A"; }\nclass B : A { public override string Hi() =&gt; "B"; public new string Id() =&gt; "B"; }\nA x = new B();\nConsole.WriteLine(x.Hi() + x.Id());</code></pre>', options: ['AA', 'BB', 'BA', 'AB'], answer: 2, explain: '<code>Hi</code> is overridden, so the object type (B) decides. <code>Id</code> is only hidden, so the variable type (A) decides.' });
quiz.push({ q: 'Which statement about interfaces and abstract classes in modern C# is correct?', options: ['An interface can declare instance fields', 'A class can inherit from two abstract classes', 'An interface method can have a default body since C# 8', 'An abstract class cannot have a constructor'], answer: 2, explain: 'Default interface methods arrived in C# 8. Interfaces still cannot hold instance state, a class has one base class, and abstract classes can have constructors.' });
quiz.push({ q: 'What does this print?<pre><code>var nums = new List&lt;int&gt; { 1, 2, 3 };\nvar big = nums.Where(n =&gt; n &gt; 1);\nnums.Add(4);\nConsole.WriteLine(big.Count());</code></pre>', options: ['2', '3', '4', 'It throws because the list changed'], answer: 1, explain: 'The query runs when <code>Count()</code> is called, by which time the list holds 1, 2, 3, 4. Three of them are greater than 1.' });
quiz.push({ q: 'An EF Core query is written as <code>db.Orders.AsEnumerable().Where(o =&gt; o.Total &gt; 100).ToList()</code>. Where does the filter run?', options: ['In the database, as a WHERE clause', 'In the application, after every row has been loaded', 'In both places', 'Nowhere, the query never runs'], answer: 1, explain: '<code>AsEnumerable()</code> switches to in-memory LINQ, so everything after it runs in the application on all rows.' });
quiz.push({ q: 'What does this print?<pre><code>var list = new List&lt;Action&gt;();\nfor (int i = 0; i &lt; 3; i++) list.Add(() =&gt; Console.Write(i));\nforeach (var a in list) a();</code></pre>', options: ['012', '333', '222', '000'], answer: 1, explain: 'All three lambdas capture the same variable i. They run after the loop, when i is 3.' });
quiz.push({ q: 'Inside a catch block you want to pass the same exception up to the caller and keep its original stack trace. What do you write?', options: ['<code>throw ex;</code>', '<code>throw;</code>', '<code>throw new Exception(ex.Message);</code>', '<code>return ex;</code>'], answer: 1, explain: 'A bare <code>throw;</code> rethrows the current exception with its trace intact. The other forms reset or discard it.' });
quiz.push({ q: 'How does an <code>event</code> differ from a public delegate field?', options: ['An event can have only one subscriber', 'Code outside the class can only add or remove handlers, not raise it or replace the list', 'An event runs its handlers on a background thread', 'An event cannot use lambdas'], answer: 1, explain: 'The <code>event</code> keyword restricts outside code to <code>+=</code> and <code>-=</code>. Only the declaring class can raise it or clear it.' });

// ====================== INTERVIEW ======================
// ---------- Section 1: type system and language basics ----------
Q('B', 'What are the built-in data types in C# and their sizes?',
  `<p>C# has a small set of built-in types for whole numbers, numbers with a decimal point, true or false, single characters, text, and "anything".</p>
  <table><thead><tr><th>Type</th><th>Size</th><th>Note</th></tr></thead><tbody>
  <tr><td><code>bool</code></td><td>1 byte</td><td>true or false</td></tr>
  <tr><td><code>byte</code> / <code>sbyte</code></td><td>1 byte</td><td>0 to 255 / -128 to 127</td></tr>
  <tr><td><code>short</code> / <code>ushort</code></td><td>2 bytes</td><td></td></tr>
  <tr><td><code>int</code> / <code>uint</code></td><td>4 bytes</td><td>the default for whole numbers</td></tr>
  <tr><td><code>long</code> / <code>ulong</code></td><td>8 bytes</td><td>suffix <code>L</code></td></tr>
  <tr><td><code>float</code></td><td>4 bytes</td><td>about 7 digits, suffix <code>f</code></td></tr>
  <tr><td><code>double</code></td><td>8 bytes</td><td>about 15 digits, the default for 1.5</td></tr>
  <tr><td><code>decimal</code></td><td>16 bytes</td><td>28 to 29 digits, base 10, suffix <code>m</code></td></tr>
  <tr><td><code>char</code></td><td>2 bytes</td><td>one UTF-16 code unit</td></tr>
  <tr><td><code>string</code>, <code>object</code></td><td>reference</td><td>immutable text / root of all types</td></tr>
  </tbody></table>
  <p>The keywords are short names for .NET types: <code>int</code> is <code>System.Int32</code>. One trap to know: <code>0.1 + 0.2 == 0.3</code> is <b>false</b> for <code>double</code> and <b>true</b> for <code>decimal</code>.</p>
  <blockquote><b>Say it in the interview:</b> I use int and long for counts and ids, double for measurements where tiny rounding is fine, and decimal for money because it is base 10 and has no binary rounding error.</blockquote>`,
  ['Why is 0.1 + 0.2 not equal to 0.3 with double?', 'What is the difference between int and System.Int32?', 'What happens when an int overflows?']);

Q('B', 'What is the difference between value types and reference types?',
  `<p>A value type variable holds the data itself, and a reference type variable holds a link to an object that lives somewhere else.</p>
  <table><thead><tr><th></th><th>Value type</th><th>Reference type</th></tr></thead><tbody>
  <tr><td>Examples</td><td><code>int</code>, <code>bool</code>, <code>decimal</code>, <code>struct</code>, <code>enum</code></td><td><code>class</code>, <code>string</code>, arrays, delegates, <code>record</code></td></tr>
  <tr><td>Assignment</td><td>copies the data</td><td>copies the reference</td></tr>
  <tr><td>Default</td><td>all zeros, never null</td><td>null</td></tr>
  <tr><td>Stored</td><td>inline, where it is declared</td><td>object on the managed heap</td></tr>
  </tbody></table>` +
  K(`var a = new PointStruct { X = 1 }; var b = a; b.X = 99;
Console.WriteLine(a.X);   // 1  (b was a copy)

var c = new PointClass { X = 1 };  var d = c; d.X = 99;
Console.WriteLine(c.X);   // 99 (c and d are one object)`) +
  `<p><b>Common trap:</b> "value types live on the stack" is only a simplification. A value type that is a field of a class lives on the heap inside that object, and a boxed value lives on the heap too. The accurate statement is that value types are stored inline, wherever they are declared.</p>
  <blockquote><b>Say it in the interview:</b> Assigning a value type copies the data, assigning a reference type copies the reference, so two variables can end up changing the same object. Value types are stored inline wherever they are declared, not always on the stack.</blockquote>`,
  ['Is a string a value type or a reference type? Why does it feel like a value?', 'Where does an int field of a class live?', 'What happens when you pass a class instance to a method and the method changes a property?']);

Q('B', 'What are boxing and unboxing, and why do they matter?',
  `<p>Boxing is wrapping a value type in an object on the heap so it can be treated as <code>object</code>, and unboxing is copying the value back out.</p>` +
  K(`int n = 42;
object boxed = n;        // boxing: new heap object, value copied in
int back = (int)boxed;   // unboxing: type check, value copied out
long bad = (long)boxed;  // InvalidCastException: must unbox to the exact type

var old = new System.Collections.ArrayList();
old.Add(1);              // hidden boxing: ArrayList stores object`) +
  `<p><b>Why it matters:</b> each box is a heap allocation, so in a loop it creates garbage and makes the garbage collector work harder. The box is also a copy, so changing the original afterwards does not change the box.</p>
  <p><b>Where it hides:</b> non-generic collections, <code>params object[]</code> arguments, and casting a struct to an interface.</p>
  <p><b>How to avoid it:</b> use generics (<code>List&lt;int&gt;</code>, not <code>ArrayList</code>), implement <code>IEquatable&lt;T&gt;</code> on structs used as keys, and use generic constraints instead of casting a struct to an interface. String interpolation such as <code>$"{n}"</code> no longer boxes on modern compilers (C# 10 and later).</p>
  <blockquote><b>Say it in the interview:</b> Boxing copies a value type into a new heap object, so it costs an allocation and garbage collection pressure. I avoid it by using generic collections and generic constraints.</blockquote>`,
  ['Does calling ToString() on an int box it?', 'Why does unboxing to a different numeric type throw?', 'How would you find boxing in a hot path?']);

Q('B', 'Explain var, dynamic and object.',
  `<p><code>var</code> lets the compiler work out the type for you, <code>object</code> can hold anything but you must cast to use it, and <code>dynamic</code> switches type checking off until the program runs.</p>
  <ul>
  <li><b><code>var</code></b>: the type is fixed at compile time. It is still strongly typed. <code>var x = 10;</code> is exactly <code>int x = 10;</code>.</li>
  <li><b><code>object</code></b>: the base type of everything. To use the real type you need a cast or pattern matching, and value types are boxed.</li>
  <li><b><code>dynamic</code></b>: member lookup happens at run time. No IntelliSense, no compile-time errors. Mistakes show up as <code>RuntimeBinderException</code>.</li>
  </ul>` +
  K(`var x = 10;             // int, decided by the compiler
object o = 10;
int y = (int)o + 1;     // cast needed
dynamic d = 10;
int z = d + 1;          // resolved while running
d.NoSuchMethod();       // compiles, then throws at run time`) +
  `<p>In application code prefer strongly typed DTOs, so that a contract change becomes a compile error and not a production failure. <code>dynamic</code> is reasonable only at the edges: COM interop, scripting, or JSON whose shape is truly unknown. It is also slower, because the binding work happens at run time.</p>
  <blockquote><b>Say it in the interview:</b> var is compile-time type inference and is fully type safe. object needs a cast. dynamic postpones all checks to run time, so I keep it for interop edges only.</blockquote>`,
  ['Can you use var for a field or a method parameter?', 'When is var a bad idea for readability?', 'What is the difference between dynamic and reflection?']);

Q('B', 'Why are strings immutable, and when do you use StringBuilder?',
  `<p>A string can never be changed after it is created, so every "change" really builds a new string. Use <code>StringBuilder</code> when you build text in many steps, such as in a loop.</p>
  <p><b>Why immutable is good:</b> a string is safe to share between threads, safe as a dictionary key (its hash cannot change), and identical literals can share one object (interning).</p>
  <p><b>The cost:</b> <code>s += x</code> in a loop copies everything built so far on each pass. For n pieces that is roughly n<sup>2</sup> copying.</p>` +
  K(`string s = "";
for (int i = 0; i < 10000; i++) s += i;         // bad: 10,000 new strings

var sb = new StringBuilder();
for (int i = 0; i < 10000; i++) sb.Append(i);   // good: one growing buffer
string result = sb.ToString();

string csv = string.Join(",", names);           // best when you already have a collection`) +
  `<p>A few fixed pieces in one expression (<code>a + b + c</code>, or an interpolated string) are fine without a builder. Also worth knowing: <code>==</code> on strings compares the text, and for keys and identifiers you should compare with <code>StringComparison.Ordinal</code> or <code>OrdinalIgnoreCase</code>.</p>
  <blockquote><b>Say it in the interview:</b> Strings are immutable, which makes them thread safe and safe as dictionary keys. For repeated appends in a loop I use StringBuilder, because plain concatenation copies the whole string every time.</blockquote>`,
  ['What is string interning?', 'Is string a reference type? Then why does == compare contents?', 'How does StringBuilder grow internally?']);

Q('I', 'What is the difference between const, readonly and static readonly?',
  `<p><code>const</code> is a value fixed when the code is compiled, while <code>readonly</code> is a field that is set once when the program runs and cannot be changed after that.</p>
  <table><thead><tr><th></th><th>const</th><th>readonly</th><th>static readonly</th></tr></thead><tbody>
  <tr><td>Set</td><td>at compile time, simple literals only</td><td>at the declaration or in a constructor</td><td>at the declaration or in the static constructor</td></tr>
  <tr><td>One per</td><td>type</td><td>object</td><td>type</td></tr>
  <tr><td>Copied into callers?</td><td>yes</td><td>no</td><td>no</td></tr>
  </tbody></table>` +
  K(`public class Limits
{
    public const int MaxRetries = 3;                          // baked into callers
    public readonly DateTime CreatedAt = DateTime.UtcNow;     // one per object
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(30);
}`) +
  `<p><b>Lead-level point:</b> the compiler copies a <code>const</code> value into every assembly that uses it. If a library changes a public const, apps that were not rebuilt keep the old number. For values that might change between releases use <code>static readonly</code> or a property. Also note that <code>readonly</code> protects the reference, not the object: a <code>readonly List&lt;int&gt;</code> can still have items added.</p>
  <blockquote><b>Say it in the interview:</b> const is a compile-time literal that gets baked into callers, so I only use it for things that never change. For everything else I use readonly or static readonly, which are assigned once at run time.</blockquote>`,
  ['Can a const be a DateTime or a custom object?', 'What does readonly mean on a struct?', 'Why can a readonly list still be modified?']);

Q('I', 'Explain nullable value types and nullable reference types.',
  `<p>Both let you say "this may have no value", but one is a real run-time type and the other is only a compile-time check.</p>
  <ul>
  <li><b>Nullable value type</b>: <code>int?</code> is short for <code>Nullable&lt;int&gt;</code>, a small struct with <code>HasValue</code> and <code>Value</code>. It exists at run time.</li>
  <li><b>Nullable reference type</b> (C# 8 and later): <code>string?</code> tells the compiler "this may be null", and plain <code>string</code> says "this should not be". The compiler warns you when you might use a null. Nothing changes at run time.</li>
  </ul>` +
  K(`int? maybe = null;
int value = maybe ?? -1;         // null-coalescing: use -1 if null
maybe ??= 5;                     // assign only if currently null
string? name = FindName();
int length = name?.Length ?? 0;  // null-conditional: skip if null
ArgumentNullException.ThrowIfNull(name);   // guard clause (.NET 6+)`) +
  `<p><b>Important limit:</b> the annotations do not validate outside input. JSON from an HTTP request, a database row or a mapper can still put null into a non-nullable property. Validate at the boundary, and avoid the <code>!</code> operator, which only silences the warning.</p>
  <blockquote><b>Say it in the interview:</b> int? is a real struct, Nullable of int. Nullable reference types are compile-time annotations that help me find null bugs, but they do not check data at run time, so I still validate input at the boundary.</blockquote>`,
  ['What does the ! operator do, and when is it acceptable?', 'What does GetValueOrDefault return for a null int?', 'How would you switch on nullable reference types in an old code base?']);

Q('I', 'What is the difference between struct, class, record and record struct?',
  `<p>A class is a shared object with identity, a struct is a small value that gets copied, and a record is either of those with value-based equality written for you.</p>
  <table><thead><tr><th></th><th>class</th><th>struct</th><th>record</th><th>record struct</th></tr></thead><tbody>
  <tr><td>Kind</td><td>reference</td><td>value</td><td>reference</td><td>value</td></tr>
  <tr><td>Equality</td><td>same object</td><td>field by field (slow by default)</td><td>by value</td><td>by value</td></tr>
  <tr><td><code>with</code></td><td>no</td><td>yes (C# 10)</td><td>yes</td><td>yes</td></tr>
  <tr><td>Use for</td><td>services, entities</td><td>tiny values</td><td>DTOs, messages</td><td>small immutable values</td></tr>
  </tbody></table>` +
  K(`public record OrderDto(int Id, string Customer, decimal Total);
var a = new OrderDto(1, "Asha", 500m);
var b = a with { Total = 550m };                           // copy with one change
Console.WriteLine(a == new OrderDto(1, "Asha", 500m));     // True

public readonly record struct Money(decimal Amount, string Currency);`) +
  `<p>Details that impress: a positional <code>record</code> has init-only properties, but a positional <code>record struct</code> is mutable unless you add <code>readonly</code>. <code>with</code> makes a shallow copy. Records came in C# 9 and record structs in C# 10.</p>
  <blockquote><b>Say it in the interview:</b> I use a class for things with identity and behaviour, a record for data that travels such as DTOs and messages, and a readonly record struct for tiny values such as money, where I want value equality and no heap allocation.</blockquote>`,
  ['Why keep structs small?', 'Is a record immutable by default?', 'Would you use a record for an EF Core entity?']);

Q('I', 'Explain enums, flags, tuples and pattern matching.',
  `<p>These are four small tools for modelling data clearly: named numbers, combinable options, quick groups of values, and a readable way to test the shape of data.</p>
  <ul>
  <li><b>Enum</b>: a set of named constants over an integer.</li>
  <li><b><code>[Flags]</code> enum</b>: each value is a power of 2, so values combine with <code>|</code>.</li>
  <li><b>Tuple</b>: a light group of values, handy for returning two things from a private method.</li>
  <li><b>Pattern matching</b>: test type, value and properties in one expression.</li>
  </ul>` +
  K(`[Flags] enum Permission { None = 0, Read = 1, Write = 2, Delete = 4 }
var p = Permission.Read | Permission.Write;
bool canWrite = p.HasFlag(Permission.Write);     // true

(int min, int max) Range(int[] a) => (a.Min(), a.Max());
var (lo, hi) = Range(new[] { 3, 1, 9 });         // deconstruction

string Describe(object o) => o switch
{
    null                 => "nothing",
    int n when n < 0     => "negative number",
    string { Length: 0 } => "empty text",
    _                    => "something else"
};`) +
  `<p><b>Tip:</b> any integer can be cast to an enum, so validate values from outside with <code>Enum.IsDefined</code> (for flags, check against a mask of all allowed bits instead). Use a record, not a tuple, in public APIs so the names are part of the contract.</p>
  <blockquote><b>Say it in the interview:</b> I use enums for fixed sets, flags for combinable options, tuples for small private return values, and switch expressions with patterns to replace long if-else chains. I always validate enum values that come from outside.</blockquote>`,
  ['Why must flag values be powers of two?', 'What is the difference between ValueTuple and System.Tuple?', 'What happens if a switch expression has no matching arm?']);

Q('I', 'What are checked and unchecked, and what happens when an integer overflows?',
  `<p>By default, when integer maths goes past the largest value, C# silently wraps around to a negative number. <code>checked</code> makes it throw instead.</p>` +
  K(`int big = int.MaxValue;          // 2,147,483,647
int wrapped = big + 1;           // -2,147,483,648 (silent wrap, default)

int safe = checked(big + 1);     // throws OverflowException
checked { total += amount; }     // a whole block can be checked

long ok = (long)big + 1;         // widen first: 2,147,483,648`) +
  `<ul>
  <li><b>Implicit conversions</b> are allowed when nothing can be lost: <code>int</code> to <code>long</code>, <code>int</code> to <code>double</code>.</li>
  <li><b>Explicit casts</b> are needed when data can be lost: <code>(int)someLong</code> may wrap, <code>(int)3.9</code> gives 3 (it cuts, it does not round).</li>
  <li><b><code>decimal</code></b> always throws on overflow. <code>double</code> never throws: it becomes infinity.</li>
  <li>Constant expressions are checked at compile time, so <code>int x = int.MaxValue + 1;</code> does not compile.</li>
  </ul>
  <p>In real code this matters for totals, ids and sizes: use <code>long</code> for counters that can grow, and turn on checked arithmetic (a project setting) in financial code.</p>
  <blockquote><b>Say it in the interview:</b> Integer overflow wraps silently by default. Where a wrong number would be dangerous I use checked, or a wider type such as long, so the problem becomes an exception instead of bad data.</blockquote>`,
  ['Why is unchecked the default?', 'What does Math.Round(2.5) return and why?', 'How does a cast differ from Convert.ToInt32 for 3.9?']);

Q('I', 'How should you compare strings in C#? Ordinal, culture and ignoring case.',
  `<p>Compare the raw characters (ordinal) for anything a program reads, such as ids, keys and file names, and use culture rules only for text that people read and sort.</p>
  <table><thead><tr><th>Comparison</th><th>What it does</th><th>Use for</th></tr></thead><tbody>
  <tr><td><code>Ordinal</code></td><td>compares character codes, fast</td><td>keys, ids, protocol text</td></tr>
  <tr><td><code>OrdinalIgnoreCase</code></td><td>same, ignoring upper and lower case</td><td>header names, email lookups, file extensions</td></tr>
  <tr><td><code>CurrentCulture</code></td><td>follows the user's language rules</td><td>sorting a list shown to a user</td></tr>
  <tr><td><code>InvariantCulture</code></td><td>fixed language-neutral rules</td><td>rarely needed</td></tr>
  </tbody></table>` +
  K(`bool same = string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
bool starts = path.StartsWith("/api", StringComparison.Ordinal);
var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);`) +
  `<p><b>Classic bugs:</b> <code>a.ToLower() == b.ToLower()</code> allocates two strings and breaks in Turkish, where the upper-case form of "i" is a dotted "İ". <code>==</code> on strings is ordinal and case sensitive. <code>CompareTo</code> and the single-argument <code>StartsWith(string)</code> use the current culture, so pass a <code>StringComparison</code> explicitly.</p>
  <blockquote><b>Say it in the interview:</b> For identifiers and keys I always pass StringComparison.Ordinal or OrdinalIgnoreCase. I keep culture-aware comparison for text displayed to users, and I never compare by calling ToLower on both sides.</blockquote>`,
  ['What is the "Turkish i" problem?', 'How do you make a Dictionary ignore case in its keys?', 'Is string == ordinal or culture-aware?']);

Q('A', 'Explain ==, Equals(), ReferenceEquals and GetHashCode.',
  `<p>They all answer "are these the same?", but in different ways: same object, or same content.</p>
  <ul>
  <li><b><code>ReferenceEquals(a, b)</code></b>: are these the very same object? Cannot be changed.</li>
  <li><b><code>Equals</code></b>: a virtual method. Classes compare by reference by default. <code>string</code>, structs and records compare by value.</li>
  <li><b><code>==</code></b>: an operator, chosen at <b>compile time</b> from the variable types. For <code>string</code> and records it compares content. For other classes it is reference equality unless overloaded.</li>
  <li><b><code>GetHashCode</code></b>: a number used by <code>Dictionary</code> and <code>HashSet</code> to pick a bucket.</li>
  </ul>
  <p><b>The contract:</b> if <code>a.Equals(b)</code> is true, both must return the same hash code. So override them together, and never base the hash on a field that can change while the object is a key.</p>` +
  K(`public sealed class OrderId : IEquatable<OrderId>
{
    public int Value { get; }
    public OrderId(int value) => Value = value;
    public bool Equals(OrderId? other) => other is not null && Value == other.Value;
    public override bool Equals(object? obj) => Equals(obj as OrderId);
    public override int GetHashCode() => Value.GetHashCode();
}`) +
  `<p>For several fields use <code>HashCode.Combine(a, b)</code>. In most cases a <code>record</code> gives you all of this for free. Trap: <code>object x = "a", y = new string('a', 1); x == y</code> is false, because <code>==</code> on <code>object</code> variables is reference equality.</p>
  <blockquote><b>Say it in the interview:</b> ReferenceEquals checks identity, Equals is the virtual value comparison, and == is an operator resolved at compile time. Equal objects must have equal hash codes, so I override Equals and GetHashCode together, or use a record.</blockquote>`,
  ['What breaks if you override Equals but not GetHashCode?', 'Why implement IEquatable&lt;T&gt;?', 'Can two different objects have the same hash code?']);

// ---------- Section 2: methods, parameters and everyday features ----------
Q('B', 'Explain ref, out, in, params, optional and named arguments.',
  `<p>By default a method receives a copy of each argument. These keywords change that, or make calls more convenient.</p>
  <table><thead><tr><th>Keyword</th><th>Meaning</th></tr></thead><tbody>
  <tr><td><code>ref</code></td><td>the method works on the caller's variable. The caller must set it first</td></tr>
  <tr><td><code>out</code></td><td>like ref, but the method must set it. Used to return an extra value</td></tr>
  <tr><td><code>in</code></td><td>passed by reference but read-only. Avoids copying a large struct</td></tr>
  <tr><td><code>params</code></td><td>the caller may pass any number of values</td></tr>
  <tr><td>optional</td><td>a parameter with a default value can be left out</td></tr>
  <tr><td>named</td><td>the caller writes the parameter name, in any order</td></tr>
  </tbody></table>` +
  K(`void Increment(ref int x) => x++;
bool TryParseId(string s, out int id) => int.TryParse(s, out id);
double Length(in Vector3 v) => Math.Sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z);
int Sum(params int[] numbers) => numbers.Sum();           // Sum(1, 2, 3)
void Send(string to, string subject = "(none)", bool urgent = false) { }

Send("a@shop.test", urgent: true);                        // named + optional
if (int.TryParse(text, out var n)) { }                    // declare inline
_ = TryParseId(text, out _);                              // discard what you do not need`) +
  `<p>Since C# 13, <code>params</code> also works with spans and other collection types, which can avoid the array allocation.</p>
  <blockquote><b>Say it in the interview:</b> ref passes the caller's variable and needs it initialised, out must be assigned by the method and is used in the Try pattern, and in is a read-only reference for large structs. I use named arguments to make calls with booleans readable.</blockquote>`,
  ['Is C# pass by value or pass by reference by default?', 'Can two overloads differ only by ref and out?', 'What is the risk of changing an optional parameter default in a library?']);

Q('B', 'What is the difference between Convert.ToInt32, int.Parse and int.TryParse?',
  `<p>All three turn text into a number. They differ in what happens when the text is missing or wrong.</p>
  <table><thead><tr><th></th><th>null input</th><th>bad text ("abc")</th><th>Use when</th></tr></thead><tbody>
  <tr><td><code>int.Parse</code></td><td>throws <code>ArgumentNullException</code></td><td>throws <code>FormatException</code></td><td>bad text would be a bug in your own code</td></tr>
  <tr><td><code>Convert.ToInt32</code></td><td>returns 0</td><td>throws <code>FormatException</code></td><td>rarely: it hides nulls</td></tr>
  <tr><td><code>int.TryParse</code></td><td>returns false</td><td>returns false</td><td>user input or any outside data</td></tr>
  </tbody></table>` +
  K(`if (!int.TryParse(request.Page, out var page) || page < 1) page = 1;`) +
  `<p>All three throw or fail on a number that is too big for an <code>int</code> (<code>OverflowException</code> for the first two). Two extra points: <code>Convert.ToInt32(3.5)</code> on a <b>double</b> rounds to the nearest even number (4), while a cast <code>(int)3.5</code> cuts to 3. And parsing depends on culture: "1.234" means different things in different countries, so for machine data pass <code>CultureInfo.InvariantCulture</code>.</p>
  <blockquote><b>Say it in the interview:</b> For anything that comes from a user or another system I use TryParse, because bad input is expected and should not be an exception. Parse is for values where a failure means a bug, and I avoid Convert.ToInt32 on strings because it turns null into zero.</blockquote>`,
  ['Why is turning null into 0 dangerous?', 'How do you parse a number that uses a comma as the decimal separator?', 'What does TryParse set the out value to on failure?']);

Q('I', 'Explain properties: auto, init, required and computed.',
  `<p>A property looks like a field from outside but is really a get method and a set method, which lets the class control how its data is read and changed.</p>` +
  K(`public class Employee
{
    public int Id { get; init; }                    // set only during creation
    public required string Name { get; init; }      // C# 11: caller must set it
    public decimal Salary { get; private set; }     // only this class can change it
    public string DisplayName => $"{Name} (#{Id})"; // computed, nothing stored

    public void Raise(decimal percent)
    {
        if (percent <= 0) throw new ArgumentOutOfRangeException(nameof(percent));
        Salary += Salary * percent / 100;
    }
}`) +
  `<ul>
  <li><b>Auto property</b>: the compiler creates the hidden backing field.</li>
  <li><b><code>init</code></b> (C# 9): can be set in a constructor or object initialiser, then never again.</li>
  <li><b><code>required</code></b> (C# 11): the compiler rejects <code>new Employee { }</code> without it.</li>
  <li><b>Computed</b>: calculated on every read, so keep it cheap.</li>
  <li><b><code>field</code></b> (C# 14): lets you add logic to one accessor without declaring the backing field yourself.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> Encapsulation is not just making fields private. The point is that the class controls how its state changes, so an object can never be put into an invalid state through its public surface. I use init and required for data that is fixed at creation, and private setters with methods for data that changes under rules.</blockquote>`,
  ['Why use a property instead of a public field?', 'Does init make an object deeply immutable?', 'How does required interact with constructors?']);

Q('I', 'What are extension methods, local functions and expression-bodied members?',
  `<p>They are three ways to write smaller, clearer methods: add a method to a type you do not own, put a helper inside the method that uses it, and write a one-line member with an arrow.</p>` +
  K(`public static class StringExtensions
{
    // Extension method: static method, "this" on the first parameter
    public static bool IsBlank(this string? s) => string.IsNullOrWhiteSpace(s);
}
bool empty = "   ".IsBlank();     // called like an instance method

int Factorial(int n)
{
    if (n < 0) throw new ArgumentOutOfRangeException(nameof(n));
    return Fact(n);
    static int Fact(int x) => x <= 1 ? 1 : x * Fact(x - 1);   // static local function
}

public override string ToString() => $"{Name} ({Id})";         // expression-bodied member`) +
  `<p><b>Extension methods</b> are plain static methods that the compiler finds at compile time. They cannot see private members, they do not change the type, and a real instance method with the same name always wins. All of LINQ is extension methods on <code>IEnumerable&lt;T&gt;</code>. C# 14 adds <code>extension</code> blocks, which also allow extension properties.</p>
  <p><b>Local functions</b> are visible only inside their method. Marking one <code>static</code> stops it capturing local variables by accident.</p>
  <blockquote><b>Say it in the interview:</b> An extension method is a static method with this on its first parameter. It is compile-time syntax, not inheritance, and it cannot reach private state. I use them for small helpers on types I do not own and keep them out of the global namespace.</blockquote>`,
  ['Can you call an extension method on a null reference?', 'Local function or lambda: how do you choose?', 'What happens if two namespaces define the same extension method?']);

Q('A', 'Explain static members, static constructors and how to write a singleton.',
  `<p>A static member belongs to the type itself, not to any one object, so there is exactly one copy shared by the whole program.</p>
  <ul>
  <li><b>Static field or method</b>: used without creating an object, for example <code>Math.Max</code>.</li>
  <li><b>Static constructor</b>: runs once, automatically, before the type is first used. The runtime makes it thread safe. If it throws, the type is unusable for the rest of the process (<code>TypeInitializationException</code>).</li>
  <li><b>Singleton</b>: a class that allows only one instance.</li>
  </ul>` +
  K(`public sealed class AppConfig
{
    private static readonly Lazy<AppConfig> _instance = new(() => new AppConfig());
    public static AppConfig Instance => _instance.Value;   // created on first use, thread safe
    private AppConfig() { }                                // nobody else can create one
}`) +
  `<p><b>In real applications</b> prefer the dependency injection container: <code>services.AddSingleton&lt;IAppConfig, AppConfig&gt;()</code>. You still get one instance, but consumers depend on an interface, so tests can swap in a fake, and the container controls the lifetime.</p>
  <p><b>Risks of static state:</b> it is shared by every request and thread, so it must be thread safe. It hides dependencies, it makes tests affect each other, and it lives until the process ends.</p>
  <blockquote><b>Say it in the interview:</b> If I must write a singleton by hand I use Lazy of T with a private constructor, which is lazy and thread safe. In ASP.NET Core I register the class as a singleton in dependency injection instead, because that keeps it testable, and I make sure any shared state in it is thread safe.</blockquote>`,
  ['Why is double-checked locking easy to get wrong?', 'What happens when a singleton depends on a scoped service?', 'Static class or singleton: when would you choose each?']);

// ---------- Section 3: object-oriented programming ----------
Q('B', 'Explain the four pillars of OOP with one running example.',
  `<p>Object-oriented programming rests on four ideas: hide the data, show a simple contract, build new types on existing ones, and let one call behave differently per type.</p>
  <table><thead><tr><th>Pillar</th><th>Meaning</th><th>Where it shows up</th></tr></thead><tbody>
  <tr><td>Encapsulation</td><td>hide state, expose controlled actions</td><td>private fields, methods that validate</td></tr>
  <tr><td>Abstraction</td><td>show what, hide how</td><td>interfaces, abstract classes</td></tr>
  <tr><td>Inheritance</td><td>extend a base type ("is a")</td><td><code>class Manager : Employee</code></td></tr>
  <tr><td>Polymorphism</td><td>same call, different behaviour</td><td><code>virtual</code> / <code>override</code>, interfaces</td></tr>
  </tbody></table>` +
  K(`public interface INotifier { Task SendAsync(string to, string message); }   // abstraction

public sealed class EmailNotifier : INotifier { /* sends an email */ }      // polymorphism:
public sealed class SmsNotifier   : INotifier { /* sends a text  */ }       // two behaviours

public class OrderService                               // depends on the contract only
{
    private readonly INotifier _notifier;               // encapsulated
    public OrderService(INotifier notifier) => _notifier = notifier;
    public Task CompleteAsync(string customer) => _notifier.SendAsync(customer, "Order shipped");
}`) +
  `<p>In an online shop, <code>OrderService</code> does not know or care whether the customer gets an email or a text. Adding push notifications later means one new class and one registration line, with no change to the service.</p>
  <blockquote><b>Say it in the interview:</b> Encapsulation protects state, abstraction hides detail behind a contract, inheritance models is-a, and polymorphism lets one call do the right thing for each type. In my code that mostly means services depending on interfaces, so new behaviour is a new class and not an edit to old ones.</blockquote>`,
  ['What is the difference between abstraction and encapsulation?', 'Give an example where inheritance was the wrong tool.', 'How does polymorphism help with the open/closed principle?']);

Q('B', 'What are the access modifiers in C#?',
  `<p>Access modifiers decide who is allowed to see a type or member.</p>
  <table><thead><tr><th>Modifier</th><th>Visible to</th></tr></thead><tbody>
  <tr><td><code>public</code></td><td>everyone</td></tr>
  <tr><td><code>private</code></td><td>the containing type only (the default for members)</td></tr>
  <tr><td><code>protected</code></td><td>the type and types derived from it</td></tr>
  <tr><td><code>internal</code></td><td>the same assembly, meaning the same project output (the default for top-level types)</td></tr>
  <tr><td><code>protected internal</code></td><td>the same assembly <b>or</b> derived types</td></tr>
  <tr><td><code>private protected</code></td><td>derived types <b>in</b> the same assembly</td></tr>
  <tr><td><code>file</code> (C# 11)</td><td>a type visible only inside its source file</td></tr>
  </tbody></table>
  <p><b>Rule of thumb:</b> start with the most restrictive level and widen only when you need to. Everything public is a promise you must keep for callers.</p>
  <p><b>Common mix-up:</b> access modifiers make encapsulation possible, but they are not the same thing. A class with private fields and public setters for all of them is still badly encapsulated if any caller can put it into an invalid state.</p>
  <p>For tests, <code>InternalsVisibleTo</code> lets a test project see internal types without making them public.</p>
  <blockquote><b>Say it in the interview:</b> Members are private by default and top-level types are internal by default. I keep things as private as possible, expose internal within the assembly, and treat public as a contract that is expensive to change.</blockquote>`,
  ['What is the difference between protected internal and private protected?', 'What is the default access of an interface member?', 'How do you unit test an internal class?']);

Q('B', 'What is the difference between method overloading and method overriding?',
  `<p>Overloading is several methods with the same name but different parameters in one class. Overriding is a child class replacing a method it inherited.</p>
  <table><thead><tr><th></th><th>Overloading</th><th>Overriding</th></tr></thead><tbody>
  <tr><td>Where</td><td>same class (or its children)</td><td>base class and derived class</td></tr>
  <tr><td>Signature</td><td>must differ in parameters</td><td>must be identical</td></tr>
  <tr><td>Decided</td><td>at compile time, from argument types</td><td>at run time, from the object's real type</td></tr>
  <tr><td>Keywords</td><td>none</td><td><code>virtual</code> / <code>abstract</code> + <code>override</code></td></tr>
  </tbody></table>` +
  K(`class Printer
{
    public void Print(int n)    => Console.WriteLine("number " + n);   // overloads
    public void Print(string s) => Console.WriteLine("text " + s);
    public virtual void Flush() => Console.WriteLine("basic flush");
}
class LaserPrinter : Printer
{
    public override void Flush() => Console.WriteLine("laser flush");  // override
}`) +
  `<p>You cannot overload by return type alone. A subtle trap: overload choice uses the <b>compile-time</b> type of the argument, so with <code>object o = "hi"; Print(o);</code> the compiler looks for <code>Print(object)</code>, not <code>Print(string)</code>.</p>
  <blockquote><b>Say it in the interview:</b> Overloading is the same name with different parameter lists, resolved by the compiler. Overriding is a derived class replacing a virtual or abstract method, resolved at run time by the actual object.</blockquote>`,
  ['Can you overload methods that differ only in return type?', 'Can a static method be overridden?', 'Which overload is chosen when you pass null?']);

Q('I', 'Explain constructors: chaining, static constructors and primary constructors.',
  `<p>A constructor is the code that runs when an object is created, and its job is to leave the object in a valid state.</p>` +
  K(`public class Employee
{
    public string Name { get; }
    public string Email { get; }

    public Employee(string name) : this(name, name.ToLower() + "@example.com") { }  // chaining
    public Employee(string name, string email) { Name = name; Email = email; }

    static Employee() { /* runs once, before the type is first used */ }
}
public class Manager : Employee
{
    public Manager(string name) : base(name) { }        // call the base constructor
}

// C# 12 primary constructor: parameters are in scope for the whole class
public class EmployeeService(IEmployeeRepository repo, ILogger<EmployeeService> log)
{
    public Task<Employee?> GetAsync(int id) { log.LogInformation("Loading {Id}", id); return repo.GetByIdAsync(id); }
}`) +
  `<p><b>Order when creating a derived object:</b> derived field initialisers, base field initialisers, base constructor body, derived constructor body.</p>
  <p><b>Danger:</b> do not call a virtual method from a constructor. The override runs before the derived class has finished setting itself up.</p>
  <p><b>Primary constructor note:</b> on a class (unlike a record) the parameters are not properties and are <b>not</b> readonly, so they can be reassigned by mistake.</p>
  <blockquote><b>Say it in the interview:</b> I chain constructors with this and base so the validation lives in one place. Static constructors run once per type. I use primary constructors for dependency injection in services, knowing the parameters are mutable captures, not readonly fields.</blockquote>`,
  ['What happens if you declare no constructor at all?', 'Why is calling a virtual method in a constructor risky?', 'How is a primary constructor on a record different from one on a class?']);

Q('I', 'Abstract class vs interface: what is the difference, and what are default interface methods?',
  `<p>An interface is a contract that says what a type can do. An abstract class is a partly built class that shares code and state with its children.</p>
  <table><thead><tr><th></th><th>Abstract class</th><th>Interface</th></tr></thead><tbody>
  <tr><td>Instance fields</td><td>yes</td><td>no</td></tr>
  <tr><td>Constructors</td><td>yes</td><td>no</td></tr>
  <tr><td>How many</td><td>one base class</td><td>a type can implement many</td></tr>
  <tr><td>Members</td><td>any access level, finished or abstract</td><td>public by default. Bodies allowed since C# 8</td></tr>
  <tr><td>Best for</td><td>a family sharing implementation</td><td>a capability, a seam for testing</td></tr>
  </tbody></table>` +
  K(`public abstract class ReportBase
{
    public string Title { get; }
    protected ReportBase(string title) => Title = title;
    public string Render() => Title + "\\n" + Body();     // template method
    protected abstract string Body();
}
public interface IAuditable
{
    DateTime CreatedAt { get; }
    string Describe() => $"Created at {CreatedAt:u}";    // default interface method
}`) +
  `<p><b>Default interface methods</b> let a library add a member without breaking existing implementers. They are only callable through the interface type, and they cannot hold instance state.</p>
  <blockquote><b>Say it in the interview:</b> I use interfaces at architectural boundaries such as repositories and external clients, so they can be mocked and swapped. I use an abstract base class when several types truly share state and a template of behaviour. I do not build a hierarchy just to reuse a few lines. Composition is usually better.</blockquote>`,
  ['Can an abstract class implement an interface?', 'Why can a default interface method not be called through the class type?', 'What are static abstract interface members used for?']);

Q('I', 'Explain virtual, override, new, abstract and sealed.',
  `<p>These five keywords control whether a child class can replace a method, and how.</p>
  <ul>
  <li><b><code>virtual</code></b>: has a body, children <i>may</i> replace it.</li>
  <li><b><code>abstract</code></b>: has no body, children <i>must</i> write it. Only allowed in an abstract class.</li>
  <li><b><code>override</code></b>: replaces the inherited method. The object's real type decides which runs.</li>
  <li><b><code>new</code></b>: hides the inherited method. The variable's declared type decides which runs.</li>
  <li><b><code>sealed</code></b>: on a class, nobody can inherit from it. On an override, nobody can override it further.</li>
  </ul>` +
  K(`public class Animal
{
    public virtual string Speak() => "...";
    public string Name() => "Animal";
}
public class Dog : Animal
{
    public override string Speak() => "Woof";   // replaces
    public new string Name() => "Dog";          // hides
}
Animal a = new Dog();
Console.WriteLine(a.Speak());   // Woof   (run-time type)
Console.WriteLine(a.Name());    // Animal (compile-time type)`) +
  `<p>Sealing has two benefits: it protects the rules of the class from being broken by a subclass, and it lets the JIT compiler call methods directly instead of through the virtual table, a small speed gain. Many teams seal classes by default.</p>
  <blockquote><b>Say it in the interview:</b> override gives real polymorphism, decided at run time by the object. new only hides the base member and is decided by the variable type, which surprises people, so I avoid it. I seal classes that were not designed for inheritance.</blockquote>`,
  ['What warning do you get if you leave out both override and new?', 'Can you override a non-virtual method?', 'Why might sealing a class improve performance?']);

Q('I', 'What types of polymorphism does C# support?',
  `<p>Polymorphism means "many forms": one name that works with different types. C# offers three kinds.</p>
  <table><thead><tr><th>Kind</th><th>Decided</th><th>How</th></tr></thead><tbody>
  <tr><td><b>Compile-time</b> (static)</td><td>by the compiler</td><td>method overloading, operator overloading</td></tr>
  <tr><td><b>Run-time</b> (dynamic)</td><td>while running, from the object's type</td><td><code>virtual</code> / <code>override</code>, <code>abstract</code>, interface implementation</td></tr>
  <tr><td><b>Parametric</b></td><td>by the compiler, per type argument</td><td>generics such as <code>List&lt;T&gt;</code>, with constraints</td></tr>
  </tbody></table>` +
  K(`// Compile-time: the argument types pick the method
Math.Max(1, 2);  Math.Max(1.5, 2.5);

// Run-time: each shape runs its own Area()
foreach (Shape s in shapes) total += s.Area();

// Parametric: one method, any comparable type
static T Max<T>(T a, T b) where T : IComparable<T> => a.CompareTo(b) >= 0 ? a : b;`) +
  `<p>The practical value of run-time polymorphism is that it removes <code>if</code> and <code>switch</code> chains on type. Instead of "if card, do this, else if wallet, do that", each payment type implements <code>Pay()</code>, and adding a new one does not touch existing code.</p>
  <p>Generic code is often faster than interface-based code for structs, because there is no boxing and the JIT can inline the call.</p>
  <blockquote><b>Say it in the interview:</b> Compile-time polymorphism is overloading, run-time polymorphism is virtual methods and interfaces, and parametric polymorphism is generics. I use run-time polymorphism to replace switch statements on type, so new cases are new classes.</blockquote>`,
  ['Is operator overloading compile-time or run-time?', 'How does pattern matching compare with virtual methods for handling different types?', 'What is double dispatch?']);

Q('I', 'Why does C# not allow multiple inheritance of classes, and what is the diamond problem?',
  `<p>C# lets a class inherit from only one base class, because inheriting from two can make it unclear which version of a method or field you get. That confusion is called the diamond problem.</p>
  <p><b>The diamond:</b> <code>Printer</code> and <code>Scanner</code> both inherit from <code>Device</code> and both override <code>Start()</code>. If <code>Copier</code> could inherit from both, which <code>Start()</code> would <code>copier.Start()</code> run? And would the copier hold one copy of the <code>Device</code> fields or two?</p>
  <p><b>What C# does instead:</b></p>
  <ul>
  <li>One base class, <b>many interfaces</b>. Interfaces hold no instance state, so there is nothing to duplicate.</li>
  <li><b>Composition</b>: a <code>Copier</code> has a printer and has a scanner, and forwards calls to them.</li>
  <li>If two interfaces define the same member, <b>explicit interface implementation</b> lets you answer each one separately.</li>
  </ul>` +
  K(`interface IPrinter { void Start(); }
interface IScanner { void Start(); }

class Copier : IPrinter, IScanner
{
    private readonly PrintUnit _print = new();   // composition
    private readonly ScanUnit _scan = new();
    void IPrinter.Start() => _print.Start();
    void IScanner.Start() => _scan.Start();
}`) +
  `<p>Default interface methods bring back a small version of the diamond. If two interfaces both supply a default for the same inherited member, the compiler reports an ambiguity and the class must implement it itself.</p>
  <blockquote><b>Say it in the interview:</b> C# allows one base class to avoid the diamond problem, where two parents supply conflicting behaviour or duplicate state. I get the same flexibility with multiple interfaces and composition.</blockquote>`,
  ['How does C++ deal with the diamond problem?', 'Can a struct inherit from another struct?', 'What happens when two interfaces provide a default for the same method?']);

Q('I', 'What is explicit interface implementation, and when do you use it?',
  `<p>Explicit interface implementation means writing a member so that it can only be called through the interface, not through the class itself.</p>` +
  K(`interface IA { void Run(); }
interface IB { void Run(); }

class C : IA, IB
{
    void IA.Run() => Console.WriteLine("A");    // no access modifier allowed
    void IB.Run() => Console.WriteLine("B");
}

var c = new C();
// c.Run();          // compile error: not visible on the class
((IA)c).Run();       // A
((IB)c).Run();       // B`) +
  `<p><b>Two reasons to use it:</b></p>
  <ul>
  <li><b>Name clashes.</b> Two interfaces have a member with the same name but different meanings, so each needs its own body.</li>
  <li><b>Keeping the class surface clean.</b> A member the interface demands but ordinary callers should not see. For example, a collection class can hide a non-generic <code>IEnumerable.GetEnumerator()</code> and show only the generic one.</li>
  </ul>
  <p><b>Things to know:</b> explicit members are always reachable through the interface, so this is not a security feature. Derived classes cannot override them directly. And calling one on a <b>struct</b> through the interface boxes the struct.</p>
  <blockquote><b>Say it in the interview:</b> Explicit implementation ties a member to one interface, so it is only reachable through that interface type. I use it to resolve name clashes between two interfaces and to hide members that exist only to satisfy a contract.</blockquote>`,
  ['Can an explicitly implemented member be public?', 'How would a derived class change the behaviour of an explicit member?', 'Where does the .NET base library use this?']);

Q('I', 'Rapid fire: OOP design questions you may get',
  `<p>These are quick checks of whether you know the rules of classes. Each answer should take one breath.</p>
  <table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
  <tr><td>How do you stop a class being inherited?</td><td>Mark it <code>sealed</code>.</td></tr>
  <tr><td>How do you stop a class being instantiated?</td><td><code>abstract</code> (children only), <code>static</code> class (never), or a private constructor (only the class itself, as in a singleton or a factory method).</td></tr>
  <tr><td>Can an interface have a constructor?</td><td>No. It has no instance state to set up. An abstract class can.</td></tr>
  <tr><td>Can an abstract class have a constructor?</td><td>Yes. It runs when a derived object is created, usually marked <code>protected</code>.</td></tr>
  <tr><td>Can you override a private or static method?</td><td>No. Only <code>virtual</code>, <code>abstract</code> or already overridden instance methods. (Interfaces can have <code>static abstract</code> members since C# 11, which types implement, not override.)</td></tr>
  <tr><td>What is a partial class?</td><td>One class split across several files and joined by the compiler. Used so generated code (designers, source generators) and hand-written code stay apart.</td></tr>
  <tr><td>What is object slicing?</td><td>A C++ problem where copying a derived object into a base variable cuts off the extra fields. It does not happen with C# classes, because a base variable holds a reference to the whole object.</td></tr>
  </tbody></table>
  <blockquote><b>Say it in the interview:</b> sealed stops inheritance, abstract or a private constructor stops creation, interfaces have no constructors but abstract classes do, and only virtual instance methods can be overridden.</blockquote>`,
  ['Can a sealed class implement an interface?', 'Can a static class have a constructor?', 'Why would you give a class only private constructors?']);

Q('A', 'When should you choose inheritance, and when composition?',
  `<p>Use inheritance when one thing truly <i>is a</i> kind of another and always will be. Use composition, where an object <i>has</i> helpers, when you only want to reuse or vary behaviour.</p>
  <ul>
  <li><b>Inheritance fits</b> a real, stable "is a" relationship, where the base class was designed to be extended and the child can stand in for the parent everywhere.</li>
  <li><b>Composition fits</b> when behaviours vary independently, when you want to swap behaviour at run time, or when you would otherwise inherit just to borrow a few methods.</li>
  </ul>` +
  K(`// Composition: pricing rules are injected, not inherited
public interface IPricingRule { decimal Apply(decimal price); }

public class Order
{
    private readonly IEnumerable<IPricingRule> _rules;
    public Order(IEnumerable<IPricingRule> rules) => _rules = rules;
    public decimal Total(decimal basePrice)
        => _rules.Aggregate(basePrice, (price, rule) => rule.Apply(price));
}`) +
  `<p><b>Why deep hierarchies hurt:</b> the <b>fragile base class</b> problem. Children depend on hidden details of the parent, so a change in the base breaks derived classes in ways that are hard to see. Combinations also explode: discount types times customer types times regions becomes dozens of subclasses, where composition needs only a handful of small rule classes.</p>
  <p><b>Quick test:</b> can the child replace the parent in every caller without surprises? If not (a penguin that cannot <code>Fly()</code>), it is not real inheritance.</p>
  <blockquote><b>Say it in the interview:</b> I default to composition and keep inheritance for genuine is-a relationships with a base class that was designed for extension. Composition lets behaviours vary independently and be tested alone, and it avoids the fragile base class problem.</blockquote>`,
  ['Tell me about a hierarchy you replaced with composition.', 'How does the Liskov substitution principle guide this choice?', 'What is the downside of composition?']);

Q('A', 'How do interfaces make code testable? Show a mocking example.',
  `<p>If a class depends on an interface instead of a concrete class, a test can hand it a fake version, so the test needs no database, network or clock.</p>` +
  K(`public interface IEmployeeRepository
{
    Task<Employee?> GetByIdAsync(int id, CancellationToken ct);
}

public class EmployeeService(IEmployeeRepository repo)
{
    public async Task<string> GetDisplayNameAsync(int id, CancellationToken ct)
        => (await repo.GetByIdAsync(id, ct))?.DisplayName ?? "Unknown";
}

// xUnit + Moq
[Fact]
public async Task Returns_unknown_when_employee_is_missing()
{
    var repo = new Mock<IEmployeeRepository>();
    repo.Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
        .ReturnsAsync((Employee?)null);
    var sut = new EmployeeService(repo.Object);

    Assert.Equal("Unknown", await sut.GetDisplayNameAsync(5, default));
}`) +
  `<p><b>What makes this work:</b> the service receives its dependency through the constructor (dependency injection) and knows only the contract. Production wires in the real repository and the test wires in a mock. The test is fast, repeatable and checks one decision.</p>
  <p><b>Lead-level judgement:</b> mock at boundaries you do not control (database, HTTP, time, message bus). Do not add an interface for every class and do not mock simple value objects. Tests that mock everything only prove that the mocks were configured. For data access, an integration test against a real database in a container often finds more bugs.</p>
  <blockquote><b>Say it in the interview:</b> I depend on interfaces at the boundaries and inject them through the constructor, so a unit test can replace the database or an external service with a mock. I mock only what is slow or outside my control, and cover the real integration with a smaller set of integration tests.</blockquote>`,
  ['What is the difference between a mock, a stub and a fake?', 'How would you test code that uses DateTime.UtcNow?', 'When is adding an interface over-engineering?']);

Q('E', 'Explain covariance and contravariance in generics.',
  `<p>Variance is the rule that says when a generic type of a child can be used where a generic type of the parent is expected, or the other way round.</p>
  <ul>
  <li><b>Covariance (<code>out</code>)</b>: the type only <b>produces</b> T. A sequence of strings can be used as a sequence of objects. Example: <code>IEnumerable&lt;out T&gt;</code>.</li>
  <li><b>Contravariance (<code>in</code>)</b>: the type only <b>consumes</b> T. Something that can handle any object can be used to handle strings. Examples: <code>Action&lt;in T&gt;</code>, <code>IComparer&lt;in T&gt;</code>.</li>
  <li><b>Invariance</b>: the type both reads and writes T, so no substitution is safe. Example: <code>List&lt;T&gt;</code>.</li>
  </ul>` +
  K(`IEnumerable<string> strings = new List<string> { "a" };
IEnumerable<object> objects = strings;              // OK: covariance

Action<object> printAny = o => Console.WriteLine(o);
Action<string> printText = printAny;                // OK: contravariance

// List<object> list = new List<string>();          // error: List<T> is invariant
// If it were allowed, list.Add(42) would put an int into a list of strings.`) +
  `<p><b>Rule:</b> <code>out</code> = T appears only in return positions. <code>in</code> = T appears only in parameter positions. The compiler enforces this when you declare your own interface or delegate.</p>
  <p><b>Limits:</b> variance works only on interfaces and delegates, and only for reference types, so <code>IEnumerable&lt;int&gt;</code> cannot become <code>IEnumerable&lt;object&gt;</code>. Arrays are covariant too (<code>object[] a = new string[1];</code>), but that is unsafe and throws <code>ArrayTypeMismatchException</code> on a bad write.</p>
  <blockquote><b>Say it in the interview:</b> Covariance, marked out, is for producers of T, so IEnumerable of string works as IEnumerable of object. Contravariance, marked in, is for consumers of T. List of T is invariant because it both reads and writes.</blockquote>`,
  ['Why does variance not work for value types?', 'Is Func&lt;T, TResult&gt; covariant, contravariant or both?', 'Where have you declared your own variant interface?']);

// ---------- Section 4: generics, collections and LINQ ----------
Q('B', 'What is the difference between an array, List&lt;T&gt; and ArrayList?',
  `<p>An array has a fixed size, a <code>List&lt;T&gt;</code> grows as you add items, and <code>ArrayList</code> is the old pre-generics list that you should no longer use.</p>
  <table><thead><tr><th></th><th>Array <code>T[]</code></th><th><code>List&lt;T&gt;</code></th><th><code>ArrayList</code></th></tr></thead><tbody>
  <tr><td>Size</td><td>fixed when created</td><td>grows automatically</td><td>grows automatically</td></tr>
  <tr><td>Type safe</td><td>yes</td><td>yes</td><td>no, stores <code>object</code></td></tr>
  <tr><td>Boxing of ints</td><td>no</td><td>no</td><td>yes, every item</td></tr>
  <tr><td>Use today</td><td>fixed-size data, buffers</td><td>the default choice</td><td>legacy code only</td></tr>
  </tbody></table>` +
  K(`int[] scores = new int[3];           // exactly 3 slots, all 0
scores[0] = 90;

var names = new List<string>();      // starts empty
names.Add("Asha");                   // grows as needed
string first = names[0];             // no cast

var old = new ArrayList();
old.Add(1); old.Add("two");          // anything goes in
int n = (int)old[0];                 // cast needed, can fail at run time`) +
  `<p><b>How List grows:</b> it wraps an array. When the array is full it allocates one twice as big and copies the items. That makes <code>Add</code> O(1) on average. If you know the size, pass it: <code>new List&lt;int&gt;(10000)</code> avoids the repeated copying.</p>
  <p>Both arrays and lists give O(1) access by index, and O(n) for a search or for inserting in the middle.</p>
  <blockquote><b>Say it in the interview:</b> An array is fixed size, List of T is a growable array and my default, and ArrayList is the non-generic version that stores object, so it boxes value types and loses type safety. I do not use ArrayList in new code.</blockquote>`,
  ['What is the difference between Length, Count and Count()?', 'Why is inserting at the start of a List slow?', 'When would you still choose an array?']);

Q('I', 'What are generics and constraints?',
  `<p>Generics let you write a class or method once with a placeholder type, so the same code works for many types and the compiler still checks every use.</p>` +
  K(`public class ApiResult<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public static ApiResult<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResult<T> Fail(string error) => new() { Success = false, Error = error };
}

// Constraint: T must be comparable with itself
public static T Max<T>(IEnumerable<T> items) where T : IComparable<T>
    => items.Aggregate((a, b) => a.CompareTo(b) >= 0 ? a : b);`) +
  `<p><b>Constraints</b> tell the compiler what T can do:</p>
  <table><thead><tr><th>Constraint</th><th>T must be</th></tr></thead><tbody>
  <tr><td><code>where T : class</code> / <code>struct</code></td><td>a reference type / a non-nullable value type</td></tr>
  <tr><td><code>where T : new()</code></td><td>creatable with <code>new T()</code></td></tr>
  <tr><td><code>where T : BaseType, IThing</code></td><td>derived from a class, implementing an interface</td></tr>
  <tr><td><code>where T : notnull</code> / <code>unmanaged</code></td><td>non-nullable / a plain value with no references</td></tr>
  </tbody></table>
  <p><b>Benefits:</b> type safety (no casts), no boxing for value types, and reuse. In .NET, generics are real at run time ("reified"): the runtime knows <code>List&lt;int&gt;</code> from <code>List&lt;string&gt;</code>, unlike Java, which erases the type. Each value type gets its own specialised machine code.</p>
  <blockquote><b>Say it in the interview:</b> Generics give me type-safe reusable code with no casting and no boxing. Constraints state what the type parameter must support, so the compiler lets me call those members. In .NET generics are reified, so the type argument exists at run time.</blockquote>`,
  ['What does default(T) return?', 'Why can you not write new T() without a constraint?', 'What is the difference between a generic method and a generic class?']);

Q('I', 'How do you choose the right collection?',
  `<p>Choose by the operation you do most: look up by position, look up by key, check membership, keep order, or share between threads.</p>
  <table><thead><tr><th>Collection</th><th>Lookup</th><th>Insert</th><th>Use when</th></tr></thead><tbody>
  <tr><td><code>List&lt;T&gt;</code></td><td>O(1) by index, O(n) search</td><td>O(1) at the end</td><td>the default list</td></tr>
  <tr><td><code>Dictionary&lt;K,V&gt;</code></td><td>O(1) average</td><td>O(1) average</td><td>find by key</td></tr>
  <tr><td><code>HashSet&lt;T&gt;</code></td><td>O(1) average</td><td>O(1) average</td><td>uniqueness, "seen before?"</td></tr>
  <tr><td><code>SortedDictionary&lt;K,V&gt;</code></td><td>O(log n)</td><td>O(log n)</td><td>keys kept in order</td></tr>
  <tr><td><code>Queue&lt;T&gt;</code> / <code>Stack&lt;T&gt;</code></td><td>ends only</td><td>O(1)</td><td>first-in-first-out / last-in-first-out</td></tr>
  <tr><td><code>LinkedList&lt;T&gt;</code></td><td>O(n)</td><td>O(1) at a known node</td><td>many inserts in the middle</td></tr>
  <tr><td><code>ConcurrentDictionary&lt;K,V&gt;</code></td><td>O(1) average</td><td>O(1) average</td><td>many threads read and write</td></tr>
  </tbody></table>` +
  K(`var counts = new Dictionary<char, int>();
foreach (var c in "programming") counts[c] = counts.GetValueOrDefault(c) + 1;

var seen = new HashSet<int>();
bool firstTime = seen.Add(5);    // true. A second Add(5) returns false`) +
  `<p><b>Notes:</b> <code>Dictionary</code> does not promise any order. Use <code>ImmutableList</code> and friends for snapshots that never change, <code>FrozenDictionary</code> (.NET 8) for a lookup table built once and read many times, and <code>PriorityQueue</code> (.NET 6) when you always need the smallest item next.</p>
  <blockquote><b>Say it in the interview:</b> I pick the collection from the access pattern: List for ordered data by index, Dictionary for key lookup, HashSet for membership, a sorted collection when order by key matters, and the concurrent collections only when several threads really share the data.</blockquote>`,
  ['Why is List.Contains slow compared with HashSet.Contains?', 'When would a sorted list beat a dictionary?', 'Is Dictionary thread safe for reading?']);

Q('I', 'What is the difference between IEnumerable, IQueryable, ICollection and IList?',
  `<p>They are interfaces that each promise a little more: just looping, counting and adding, access by index, or a query that a database can run.</p>
  <table><thead><tr><th>Interface</th><th>Adds</th></tr></thead><tbody>
  <tr><td><code>IEnumerable&lt;T&gt;</code></td><td>forward-only looping. LINQ on it runs in memory</td></tr>
  <tr><td><code>ICollection&lt;T&gt;</code></td><td><code>Count</code>, <code>Add</code>, <code>Remove</code>, <code>Contains</code></td></tr>
  <tr><td><code>IList&lt;T&gt;</code></td><td>access by index, <code>Insert</code></td></tr>
  <tr><td><code>IReadOnlyList&lt;T&gt;</code></td><td>index and count, no changes. Good for return types</td></tr>
  <tr><td><code>IQueryable&lt;T&gt;</code></td><td>holds an expression tree that a provider (EF Core) turns into SQL</td></tr>
  </tbody></table>` +
  K(`// Becomes SQL: WHERE Salary > 50000 ORDER BY Salary DESC, top 10 rows
var top = await db.Employees.Where(e => e.Salary > 50000)
                            .OrderByDescending(e => e.Salary)
                            .Take(10).ToListAsync();

// Anti-pattern: loads the whole table, then filters in memory
var bad = db.Employees.AsEnumerable().Where(e => e.Salary > 50000).ToList();`) +
  `<p><b>API design tip:</b> accept the weakest type you need (<code>IEnumerable&lt;T&gt;</code> as a parameter if you only loop) and return something specific and honest (<code>IReadOnlyList&lt;T&gt;</code> when the data is already loaded). Returning <code>IQueryable</code> from a repository leaks query building, and database errors, into every caller.</p>
  <blockquote><b>Say it in the interview:</b> IEnumerable runs LINQ in memory, one item at a time. IQueryable carries an expression tree that EF Core translates to SQL, so the filtering happens in the database. The classic bug is switching to IEnumerable too early and loading the whole table.</blockquote>`,
  ['What does AsEnumerable do and when is it useful?', 'Why is returning IQueryable from a repository debatable?', 'What is the difference between IEnumerable and IEnumerator?']);

Q('I', 'Explain LINQ: deferred execution, GroupBy, Join and SelectMany.',
  `<p>LINQ is a set of methods for filtering, shaping and combining sequences. Most of them do nothing until you actually read the results, which is called deferred execution.</p>` +
  K(`var q = employees.Where(e => e.Salary > 50000);        // nothing has run yet
employees.Add(new Employee { Salary = 90000 });        // will be included
var list = q.ToList();                                 // runs now

var byDept = employees.GroupBy(e => e.Department)      // one group per department
    .Select(g => new { Dept = g.Key, Count = g.Count(), Avg = g.Average(e => e.Salary) });

var joined = employees.Join(departments,               // match on a key, like SQL INNER JOIN
    e => e.DeptId, d => d.Id,
    (e, d) => new { Employee = e.Name, Department = d.Name });

var allSkills = employees.SelectMany(e => e.Skills).Distinct();   // flatten lists of lists`) +
  `<ul>
  <li><b>Runs the query:</b> <code>foreach</code>, <code>ToList</code>, <code>ToArray</code>, <code>Count</code>, <code>First</code>, <code>Any</code>, <code>Sum</code>.</li>
  <li><b>Only builds it:</b> <code>Where</code>, <code>Select</code>, <code>OrderBy</code>, <code>GroupBy</code>, <code>Take</code>.</li>
  </ul>
  <p><b>Pitfalls:</b> looping over a deferred query twice runs it twice (and hits the database twice with EF Core), so call <code>ToList()</code> once when you need a snapshot. <code>First()</code> throws on an empty sequence, <code>FirstOrDefault()</code> returns the default, and <code>Single()</code> throws if there is more than one match. .NET 10 adds <code>LeftJoin</code> and <code>RightJoin</code>.</p>
  <blockquote><b>Say it in the interview:</b> LINQ queries are deferred: they describe the work and run when enumerated, every time they are enumerated. I materialise once with ToList when I need a stable result, and I choose First, Single or their OrDefault forms to state what I expect from the data.</blockquote>`,
  ['What is the difference between Select and SelectMany?', 'Which LINQ operators are not deferred?', 'How do you write a left join in LINQ?']);

Q('I', 'Any() vs Count(), and other common LINQ performance traps',
  `<p>To ask "is there at least one?", use <code>Any()</code>, because it stops at the first item, while <code>Count()</code> may walk the whole sequence just to compare the answer with zero.</p>
  <table><thead><tr><th>Trap</th><th>Why it hurts</th><th>Better</th></tr></thead><tbody>
  <tr><td><code>items.Count() &gt; 0</code></td><td>may enumerate everything. In SQL it is a full COUNT</td><td><code>items.Any()</code></td></tr>
  <tr><td><code>list.Count()</code> on a <code>List&lt;T&gt;</code></td><td>works, but hides intent</td><td>the <code>Count</code> property</td></tr>
  <tr><td><code>.Where(x =&gt; ..).First()</code></td><td>two steps</td><td><code>.First(x =&gt; ..)</code></td></tr>
  <tr><td><code>ids.Contains(x)</code> inside a loop, where <code>ids</code> is a list</td><td>O(n) each time, O(n<sup>2</sup>) in total</td><td>build a <code>HashSet</code> first</td></tr>
  <tr><td><code>ToList()</code> after every step</td><td>extra copies of the data</td><td>one <code>ToList()</code> at the end</td></tr>
  <tr><td>running a query inside a loop</td><td>one database call per item (N+1)</td><td>one query with a join or <code>Contains</code></td></tr>
  <tr><td><code>OrderBy(..).First()</code></td><td>sorts everything to find one item</td><td><code>MinBy</code> / <code>MaxBy</code> (.NET 6)</td></tr>
  </tbody></table>` +
  K(`if (orders.Any(o => o.IsLate)) { }                 // stops at the first late order
var cheapest = products.MinBy(p => p.Price);       // one pass, no sort
var wanted = new HashSet<int>(wantedIds);
var hits = orders.Where(o => wanted.Contains(o.Id)).ToList();`) +
  `<p>LINQ is fast enough for almost all business code. In a measured hot path, a plain loop avoids the delegate calls and the iterator objects.</p>
  <blockquote><b>Say it in the interview:</b> I use Any instead of Count greater than zero, materialise once, and turn repeated list searches into a HashSet lookup. With EF Core I watch for queries inside loops, because that is the N plus 1 problem.</blockquote>`,
  ['Is Count() always O(n)?', 'What is the N+1 query problem?', 'When would you replace LINQ with a for loop?']);

Q('A', 'How would you write your own simple LINQ operator?',
  `<p>A LINQ operator is just an extension method on <code>IEnumerable&lt;T&gt;</code> that uses <code>yield return</code> to hand back items one at a time.</p>` +
  K(`public static class MyLinq
{
    public static IEnumerable<T> Where<T>(this IEnumerable<T> source, Func<T, bool> predicate)
    {
        ArgumentNullException.ThrowIfNull(source);       // checked straight away
        ArgumentNullException.ThrowIfNull(predicate);
        return Iterator(source, predicate);

        static IEnumerable<T> Iterator(IEnumerable<T> source, Func<T, bool> predicate)
        {
            foreach (var item in source)
                if (predicate(item)) yield return item;  // lazy: one item per request
        }
    }
}`) +
  `<p><b>How it works:</b> <code>yield return</code> makes the compiler turn the method into a hidden class that implements <code>IEnumerator&lt;T&gt;</code> and remembers where it paused (a state machine). Nothing runs when the method is called. The body runs bit by bit as the caller asks for the next item. That is exactly why LINQ is deferred.</p>
  <p><b>The detail that shows experience:</b> code inside an iterator method does not run until the first <code>MoveNext()</code>. If the null checks were in the same method as the <code>yield</code>, a null argument would only blow up later, far from the call. Splitting into a wrapper plus an inner iterator makes the check immediate.</p>
  <p>Because it is lazy, it works on endless sequences and uses O(1) extra memory. <code>yield break</code> ends the sequence early.</p>
  <blockquote><b>Say it in the interview:</b> I would write an extension method on IEnumerable of T that loops over the source and yields matching items. yield return makes the compiler generate a state machine, which is why execution is deferred, and I validate arguments in a wrapper so errors surface at the call.</blockquote>`,
  ['What does the compiler generate for yield return?', 'How would you write Take or Select?', 'What is IAsyncEnumerable and when would you use it?']);

Q('A', 'How does Dictionary&lt;TKey, TValue&gt; work internally?',
  `<p>A dictionary turns each key into a number (its hash code), uses that number to jump straight to a slot, and then checks that the key there really matches.</p>
  <ol>
  <li><b>Hash:</b> call <code>key.GetHashCode()</code>.</li>
  <li><b>Bucket:</b> take the remainder after dividing by the number of buckets. That is the slot.</li>
  <li><b>Compare:</b> walk the short chain of entries in that bucket and use <code>Equals</code> to find the exact key.</li>
  <li><b>Resize:</b> when it is full, allocate a larger array (about double, rounded up to a prime number) and place every entry again.</li>
  </ol>
  <table><thead><tr><th>Operation</th><th>Average</th><th>Worst case</th></tr></thead><tbody>
  <tr><td>Lookup, add, remove</td><td>O(1)</td><td>O(n) if many keys share a bucket</td></tr>
  <tr><td>Add that triggers a resize</td><td>O(n) once</td><td>O(1) averaged over many adds</td></tr>
  </tbody></table>
  <p><b>What follows from this:</b></p>
  <ul>
  <li>Two different keys can share a hash (a collision). That is normal, which is why <code>Equals</code> is still needed.</li>
  <li>A key type must give equal hash codes for equal keys, and the hash must not change while the key is stored. A mutable key can get "lost".</li>
  <li>Order is not guaranteed. Do not rely on insertion order.</li>
  <li>If you know the size, pass a capacity to avoid resizes.</li>
  <li>It is not thread safe for writes. Use <code>ConcurrentDictionary</code> or a lock.</li>
  <li>String hashes are randomised per process, so never store a hash code in a database.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> A Dictionary hashes the key to pick a bucket, then uses Equals to find the exact entry in that bucket, so lookups are O(1) on average. It depends on a good GetHashCode and on keys that do not change after insertion.</blockquote>`,
  ['What happens if every key returns the same hash code?', 'Why are string hash codes different on each run?', 'How does ConcurrentDictionary differ?']);

// ---------- Section 5: delegates, events, lambdas, expression trees ----------
Q('B', 'What are delegates, Func, Action and Predicate?',
  `<p>A delegate is a type-safe reference to a method, which lets you store a method in a variable and pass it to other code to call later.</p>
  <table><thead><tr><th>Type</th><th>Returns</th><th>Example</th></tr></thead><tbody>
  <tr><td><code>Func&lt;T1, ..., TResult&gt;</code></td><td>a value (the last type listed)</td><td><code>Func&lt;int, int, int&gt; add</code></td></tr>
  <tr><td><code>Action&lt;T1, ...&gt;</code></td><td>nothing (void)</td><td><code>Action&lt;string&gt; log</code></td></tr>
  <tr><td><code>Predicate&lt;T&gt;</code></td><td><code>bool</code></td><td><code>Predicate&lt;int&gt; isEven</code></td></tr>
  </tbody></table>` +
  K(`delegate int BinaryOp(int a, int b);            // your own delegate type
BinaryOp add = (a, b) => a + b;
Func<int, int, int> multiply = (a, b) => a * b;
Action<string> log = Console.WriteLine;         // a method group, no lambda needed

// Multicast: one delegate, several targets, called in order
Action greet = () => Console.Write("Hello ");
greet += () => Console.WriteLine("World");
greet();                                        // Hello World`) +
  `<p><b>Why they matter:</b> delegates are how you pass behaviour as data. LINQ (<code>Where(x =&gt; x &gt; 5)</code>), event handlers, callbacks, retry helpers and middleware are all built on them.</p>
  <p><b>Details:</b> "type safe" means the compiler checks the parameters and the return type. With a multicast delegate that returns a value, you only get the result of the last target, and if one target throws, the rest are skipped. In practice you almost always use <code>Func</code> and <code>Action</code> instead of declaring your own delegate type.</p>
  <blockquote><b>Say it in the interview:</b> A delegate is a type-safe method reference. Func returns a value, Action returns nothing, and Predicate returns a bool. I use them to pass behaviour into a method, which is what LINQ and event handlers are built on.</blockquote>`,
  ['What is a multicast delegate?', 'What is the difference between a delegate and an interface with one method?', 'What does Invoke do, and what is ?.Invoke for?']);

Q('I', 'Explain events and the publish/subscribe pattern in C#.',
  `<p>An event lets one object announce "something happened" and lets any number of other objects sign up to be told, without the announcer knowing who they are.</p>` +
  K(`public sealed class OrderPlacedEventArgs(int orderId) : EventArgs
{
    public int OrderId { get; } = orderId;
}

public class OrderService
{
    public event EventHandler<OrderPlacedEventArgs>? OrderPlaced;        // publisher

    public void Place(int id)
        => OrderPlaced?.Invoke(this, new OrderPlacedEventArgs(id));      // raise, if anyone listens
}

var service = new OrderService();
service.OrderPlaced += (sender, e) => Console.WriteLine($"Order {e.OrderId} placed");  // subscriber
service.Place(7);`) +
  `<p><b>Event vs delegate:</b> an event is a delegate with restricted access. Code outside the class can only use <code>+=</code> and <code>-=</code>. It cannot raise the event or wipe out other subscribers with <code>=</code>.</p>
  <p><b>Memory-leak warning:</b> the publisher holds a reference to every subscriber. If the publisher lives a long time (a static or singleton object) and subscribers never unsubscribe, they can never be garbage collected. Always pair <code>+=</code> with <code>-=</code>, usually in <code>Dispose</code>.</p>
  <p><b>Other points:</b> handlers run one after another on the thread that raised the event, so a slow handler blocks the publisher and an exception in one stops the rest. Events are for in-process notification. Between services, use a message broker.</p>
  <blockquote><b>Say it in the interview:</b> An event is a delegate that outsiders can only subscribe to or unsubscribe from, which gives publish and subscribe inside one process. The main risk is a long-lived publisher keeping subscribers alive, so I always unsubscribe.</blockquote>`,
  ['Why is ?.Invoke safer than checking for null and then calling?', 'How would you unsubscribe a lambda handler?', 'What is a weak event pattern?']);

Q('I', 'What are closures and captured variables?',
  `<p>A closure is a lambda that uses a variable from the method around it. It keeps hold of the <b>variable itself</b>, not a copy of its value at that moment.</p>` +
  K(`var actions = new List<Action>();
for (int i = 0; i < 3; i++)
    actions.Add(() => Console.Write(i));        // every lambda shares ONE i
foreach (var a in actions) a();                 // 333

actions.Clear();
foreach (var n in new[] { 0, 1, 2 })
    actions.Add(() => Console.Write(n));        // foreach: a new n for each item
foreach (var a in actions) a();                 // 012`) +
  `<p><b>Why 333:</b> the <code>for</code> loop has a single <code>i</code>. The lambdas run after the loop has finished, when <code>i</code> is 3. <b>Fix:</b> copy it inside the loop body: <code>int copy = i;</code> and capture <code>copy</code>.</p>
  <p><b>Why foreach is safe:</b> since C# 5, the <code>foreach</code> variable is a fresh variable on every pass.</p>
  <p><b>What the compiler does:</b> it moves captured variables into a hidden class on the heap, and the lambda becomes a method on that class. Consequences:</p>
  <ul>
  <li>The variable lives as long as the lambda lives, which can keep large objects alive.</li>
  <li>Creating a capturing lambda allocates. In a hot path, use a <code>static</code> lambda (C# 9), which the compiler forbids from capturing.</li>
  <li>If two threads run lambdas that share a captured variable, you have shared mutable state.</li>
  </ul>
  <blockquote><b>Say it in the interview:</b> A closure captures the variable, not its value, so lambdas created in a for loop all see the final value of the counter. I copy the counter into a local inside the loop, and I know foreach gives a fresh variable per iteration since C# 5.</blockquote>`,
  ['What does the compiler generate for a captured variable?', 'What is a static lambda?', 'How can a closure cause a memory leak?']);

Q('I', 'What is the difference between a lambda, an anonymous method and a local function?',
  `<p>All three are ways to write a small piece of code inside another method. A lambda is the short modern form, an anonymous method is the older form, and a local function is a real named method that only its parent can see.</p>
  <table><thead><tr><th></th><th>Lambda</th><th>Anonymous method</th><th>Local function</th></tr></thead><tbody>
  <tr><td>Syntax</td><td><code>x =&gt; x * 2</code></td><td><code>delegate (int x) { return x * 2; }</code></td><td><code>int Twice(int x) =&gt; x * 2;</code></td></tr>
  <tr><td>Has a name</td><td>no</td><td>no</td><td>yes</td></tr>
  <tr><td>Recursion</td><td>awkward</td><td>awkward</td><td>natural</td></tr>
  <tr><td>Can be an expression tree</td><td>yes</td><td>no</td><td>no</td></tr>
  <tr><td>Allocation</td><td>needs a delegate object</td><td>needs a delegate object</td><td>none if called directly</td></tr>
  <tr><td><code>yield</code> / generics</td><td>no</td><td>no</td><td>yes</td></tr>
  </tbody></table>` +
  K(`Func<int, int> twice = x => x * 2;                         // lambda
Func<int, int> old = delegate (int x) { return x * 2; };   // anonymous method (C# 2)

int Sum(int[] data)
{
    return Go(0);
    int Go(int i) => i == data.Length ? 0 : data[i] + Go(i + 1);   // local function, recursive
}

var parse = static (string s) => int.Parse(s);             // static lambda: cannot capture`) +
  `<p><b>How to choose:</b> use a lambda when you pass behaviour to something else (LINQ, events). Use a local function for a helper that only this method calls, especially if it is recursive, an iterator, or performance matters. Nobody writes anonymous methods in new code.</p>
  <blockquote><b>Say it in the interview:</b> A lambda is an unnamed function usually converted to a delegate or an expression tree. A local function is a named method scoped to its parent, with no delegate allocation when called directly. I use lambdas to pass behaviour and local functions for private helpers.</blockquote>`,
  ['Can a lambda have a statement body?', 'What is a method group conversion?', 'Since C# 10 a lambda can have a "natural type". What does that mean?']);

Q('E', 'What are expression trees, and what is Expression&lt;Func&lt;T, bool&gt;&gt;?',
  `<p>An expression tree is a lambda stored as <b>data that describes the code</b>, instead of as code that can run. Other code can then read it and translate it, for example into SQL.</p>` +
  K(`Func<Employee, bool> asCode = e => e.Salary > 50000 && e.IsActive;
// compiled to IL. You can only call it.

Expression<Func<Employee, bool>> asData = e => e.Salary > 50000 && e.IsActive;
// a tree: AndAlso( GreaterThan(e.Salary, 50000), e.IsActive )
Console.WriteLine(asData.Body);           // inspectable
Func<Employee, bool> compiled = asData.Compile();   // turn it back into runnable code`) +
  `<p><b>Why it matters:</b> this is the whole trick behind EF Core. <code>IQueryable&lt;T&gt;.Where</code> takes an <code>Expression</code>, so EF Core can walk the tree and write <code>WHERE Salary &gt; 50000 AND IsActive = 1</code>. <code>IEnumerable&lt;T&gt;.Where</code> takes a <code>Func</code>, which can only be run in memory.</p>
  <table><thead><tr><th></th><th><code>Func&lt;T, bool&gt;</code></th><th><code>Expression&lt;Func&lt;T, bool&gt;&gt;</code></th></tr></thead><tbody>
  <tr><td>What it is</td><td>compiled code</td><td>a tree of nodes</td></tr>
  <tr><td>Can be translated</td><td>no</td><td>yes (SQL, OData, rules)</td></tr>
  <tr><td>Cost to call</td><td>cheap</td><td><code>Compile()</code> is expensive, so cache it</td></tr>
  </tbody></table>
  <p><b>Limits:</b> only expression lambdas can be converted, not statement bodies, and many newer language features are not allowed inside them. A provider throws at run time if the tree contains something it cannot translate, such as a call to your own C# method. Other uses: building dynamic filters and sorts, mapping libraries, and mocking frameworks reading <code>Setup(x =&gt; x.Method())</code>.</p>
  <blockquote><b>Say it in the interview:</b> Assigning a lambda to Expression of Func makes the compiler build a data structure describing the code instead of compiling it. EF Core walks that tree to generate SQL, which is why IQueryable filters run in the database and IEnumerable filters run in memory.</blockquote>`,
  ['Why does passing a Func to an EF Core Where load the whole table?', 'How would you build a dynamic filter from user input safely?', 'Why should you cache the result of Compile()?']);

// ---------- Section 6: exception handling ----------
Q('B', 'How do try, catch and finally work, and what does the exception hierarchy look like?',
  `<p>An exception is an object that reports a failure. <code>try</code> marks the code to watch, <code>catch</code> handles a failure of a given type, and <code>finally</code> runs cleanup whether there was a failure or not.</p>` +
  K(`try
{
    var text = File.ReadAllText(path);
    return int.Parse(text);
}
catch (FileNotFoundException ex)          // most specific first
{
    Console.WriteLine("No file: " + ex.FileName);
    return 0;
}
catch (FormatException)                   // no variable needed if unused
{
    return 0;
}
finally
{
    Console.WriteLine("done");            // runs on success, on catch, and on return
}`) +
  `<p><b>How it flows:</b> when something throws, the current method stops. The runtime walks back up the call stack looking for the first <code>catch</code> whose type matches, running <code>finally</code> blocks on the way. If nothing catches it, the process ends (or the web framework's global handler takes it).</p>
  <p><b>Hierarchy:</b> everything derives from <code>System.Exception</code>. Common ones: <code>ArgumentException</code> (and <code>ArgumentNullException</code>, <code>ArgumentOutOfRangeException</code>), <code>InvalidOperationException</code>, <code>NullReferenceException</code>, <code>KeyNotFoundException</code>, <code>IOException</code>, <code>OperationCanceledException</code>. Catch blocks are tested top to bottom, so put derived types before base types. <code>ApplicationException</code> exists but is no longer recommended as a base.</p>
  <blockquote><b>Say it in the interview:</b> try wraps the risky code, catch handles specific exception types from most specific to least, and finally always runs for cleanup. An unhandled exception travels up the call stack until something catches it.</blockquote>`,
  ['Does finally run if there is a return inside try?', 'What happens if code in finally throws?', 'Why should you not catch NullReferenceException?']);

Q('B', 'What is the difference between throw and throw ex?',
  `<p>Both pass an exception on from a <code>catch</code> block, but <code>throw;</code> keeps the original stack trace and <code>throw ex;</code> wipes it and starts again from the catch block.</p>` +
  K(`try { SaveOrder(order); }
catch (Exception ex)
{
    log.LogError(ex, "Saving order {Id} failed", order.Id);
    throw;          // good: the trace still points at the line inside SaveOrder
    // throw ex;    // bad: the trace now starts here, the real location is lost
}`) +
  `<p>The <b>stack trace</b> is the list of method calls that led to the failure. It is the most useful thing in an error log, so losing it makes production bugs much harder to find.</p>
  <table><thead><tr><th>You want to</th><th>Write</th></tr></thead><tbody>
  <tr><td>pass the same exception up</td><td><code>throw;</code></td></tr>
  <tr><td>add business context</td><td><code>throw new OrderSaveException("Order 7 failed", ex);</code> (keep the original as the inner exception)</td></tr>
  <tr><td>rethrow later or on another thread</td><td><code>ExceptionDispatchInfo.Capture(ex).Throw();</code></td></tr>
  </tbody></table>
  <p>Also ask whether the catch is needed at all. A block that only logs and rethrows at every layer produces the same error five times in the log. Usually one global handler should do the logging. Code analysis rule CA2200 flags <code>throw ex;</code>.</p>
  <blockquote><b>Say it in the interview:</b> throw with no argument rethrows and preserves the original stack trace. throw ex resets the trace to the catch block, which hides where the error really happened. If I need to add context I wrap it and pass the original as the inner exception.</blockquote>`,
  ['What is an inner exception for?', 'How do you preserve a stack trace when rethrowing outside the catch block?', 'Why is "log and rethrow" at every layer a problem?']);

Q('I', 'When and how do you create a custom exception?',
  `<p>Create your own exception type only when callers need to react to that failure differently from other failures. Otherwise use a built-in one.</p>
  <p><b>Good reasons:</b> the API layer must turn it into a specific HTTP status (not found is 404, conflict is 409), or a caller must retry on it, or it must carry extra data such as an order id. <b>Bad reason:</b> "to have our own exceptions".</p>` +
  K(`public sealed class OrderNotFoundException : Exception
{
    public int OrderId { get; }

    public OrderNotFoundException(int orderId)
        : base($"Order {orderId} was not found.") => OrderId = orderId;

    public OrderNotFoundException(int orderId, Exception inner)
        : base($"Order {orderId} was not found.", inner) => OrderId = orderId;
}`) +
  `<p><b>Conventions:</b></p>
  <ul>
  <li>Name ends in <code>Exception</code>, and it derives from <code>Exception</code> (not <code>ApplicationException</code>).</li>
  <li>Offer a constructor that takes an <b>inner exception</b>, so the original cause is never lost.</li>
  <li>Carry data as properties, not only inside the message text.</li>
  <li>Keep the hierarchy shallow: a few types that map to how callers respond.</li>
  <li>Do not put secrets or personal data in the message. It ends up in logs.</li>
  </ul>
  <p><b>Out-of-date advice to correct:</b> older guidance said to add <code>[Serializable]</code> and a special serialization constructor. That pattern is obsolete since .NET 8, and <code>BinaryFormatter</code> was removed in .NET 9, so new code should not add it.</p>
  <blockquote><b>Say it in the interview:</b> I add a custom exception only when a caller needs to handle that case differently, for example mapping it to a 404 or a 409. I give it the standard constructors including the inner exception, expose the useful data as properties, and keep the set small.</blockquote>`,
  ['Why not derive from ApplicationException?', 'Would you use an exception or a result object for "email already taken"?', 'How do custom exceptions map to HTTP status codes?']);

Q('A', 'What are your exception handling best practices?',
  `<p>Catch an exception only where you can do something useful about it. Let everything else travel up to one global handler.</p>` +
  K(`try
{
    await repo.SaveAsync(order, ct);
}
catch (DbUpdateConcurrencyException ex)                    // specific type first
{
    log.LogWarning(ex, "Concurrency conflict for order {Id}", order.Id);
    throw new ConflictException("The order was changed by someone else.", ex);   // add context, keep inner
}
catch (OperationCanceledException) when (ct.IsCancellationRequested)   // exception filter
{
    throw;                                                 // cancellation is not an error
}
finally
{
    metrics.Stop();                                        // always runs
}`) +
  `<p><b>Rules to state:</b></p>
  <ol>
  <li><b>Catch only what you can handle, enrich or translate.</b> No empty catch blocks, and no blanket <code>catch (Exception)</code> in the middle of the code.</li>
  <li><b><code>throw;</code></b> keeps the stack trace. <code>throw ex;</code> resets it.</li>
  <li><b>Do not use exceptions for expected outcomes.</b> Throwing is slow. Use <code>TryParse</code>, <code>TryGetValue</code> or a result object for things like bad input.</li>
  <li><b>Fail fast on bad arguments</b> with guard clauses such as <code>ArgumentNullException.ThrowIfNull</code>.</li>
  <li><b>Custom exceptions</b> only when callers must react differently.</li>
  <li><b>Clean up</b> with <code>using</code> or <code>finally</code>.</li>
  <li><b>In APIs,</b> convert exceptions to consistent HTTP responses in one place and never send stack traces to clients.</li>
  <li><b>Log once,</b> with the full exception object and structured fields.</li>
  </ol>
  <blockquote><b>Say it in the interview:</b> I catch specific exceptions only where I can handle or add context, rethrow with throw to keep the stack trace, avoid exceptions for normal control flow, and convert whatever is left into a consistent error response in one global handler.</blockquote>`,
  ['What is an exception filter and why is it better than catch-and-rethrow?', 'How should a cancelled request be handled?', 'What is wrong with catch (Exception) { }?']);

Q('A', 'How do you handle exceptions globally in an ASP.NET Core API?',
  `<p>Put one handler at the edge of the application that catches anything nobody else handled, logs it once, and returns a clean, consistent error to the caller.</p>
  <p>The standard error format is <b>Problem Details</b> (RFC 9457, which replaced RFC 7807): a small JSON object with <code>type</code>, <code>title</code>, <code>status</code>, <code>detail</code> and optional extra fields.</p>` +
  K(`// Program.cs (.NET 8 and later)
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
var app = builder.Build();
app.UseExceptionHandler();

public sealed class DomainExceptionHandler(ILogger<DomainExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var status = ex switch
        {
            OrderNotFoundException => StatusCodes.Status404NotFound,
            ConflictException      => StatusCodes.Status409Conflict,
            _                      => StatusCodes.Status500InternalServerError
        };
        log.LogError(ex, "Request failed with {Status}", status);
        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails { Status = status, Title = "Request failed" }, ct);
        return true;      // handled
    }
}`) +
  `<p><b>What a lead adds:</b> map known exceptions to 4xx codes and everything unknown to 500 with a generic message. Never return the stack trace or the exception message of an unknown error, because it can leak internals. Include a trace id so support can find the log entry. Validation errors should be returned as 400 by model validation, not thrown. A cancelled request (client went away) should not be logged as an error.</p>
  <blockquote><b>Say it in the interview:</b> I register Problem Details and one IExceptionHandler, so every unhandled exception is logged once and mapped to a consistent response: known domain exceptions become 404 or 409, anything else becomes a generic 500 with a trace id and no internal details.</blockquote>`,
  ['Why not put try/catch in every controller action?', 'What is the difference between exception middleware and an exception filter?', 'How do you return validation errors in the same format?']);

// ---------- Section 13: rapid fire (the items that belong to these themes) ----------
Q('B', 'Rapid fire: types, strings and copies',
  `<p>Quick questions on the type system. Aim to answer each in under 45 seconds, in one or two sentences.</p>
  <table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
  <tr><td><code>string</code> vs <code>StringBuilder</code>?</td><td>A string never changes, so each edit makes a new one. <code>StringBuilder</code> is a growable buffer for many edits.</td></tr>
  <tr><td><code>readonly</code> vs <code>const</code>?</td><td><code>const</code> is a compile-time literal copied into callers. <code>readonly</code> is set once at run time, in the declaration or a constructor.</td></tr>
  <tr><td>What is boxing?</td><td>Copying a value type into a new object on the heap so it can be used as <code>object</code> or as an interface.</td></tr>
  <tr><td><code>is</code> vs <code>as</code>?</td><td><code>is</code> tests the type and can declare a variable (<code>if (o is string s)</code>). <code>as</code> converts or gives null, and works only for reference and nullable types.</td></tr>
  <tr><td>Shallow vs deep copy?</td><td>Shallow copies the top object and shares the objects it points to (<code>MemberwiseClone</code>, a record <code>with</code>). Deep copies the whole graph.</td></tr>
  <tr><td>Benefits of an immutable object?</td><td>Safe to share between threads, state you can trust, safe as a dictionary key, easy to cache and test.</td></tr>
  </tbody></table>
  <p>If asked for more on any of them, give one concrete example: a loop with <code>+=</code>, an <code>ArrayList</code> of ints, or a copied order whose line items are still shared.</p>
  <blockquote><b>Say it in the interview:</b> Strings are immutable, const is compile-time and readonly is run-time, boxing puts a value type on the heap, is tests and as converts or returns null, and a shallow copy shares the nested objects.</blockquote>`,
  ['How would you make a deep copy of an object graph?', 'What is the difference between a cast and as?', 'How do you make a class immutable?']);

Q('I', 'Rapid fire: methods, structs and classes',
  `<p>Quick questions on members and class kinds. One or two sentences each.</p>
  <table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
  <tr><td><code>ref</code> vs <code>out</code>?</td><td>Both pass the caller's variable. With <code>ref</code> the caller must set it first. With <code>out</code> the method must set it before returning.</td></tr>
  <tr><td>Can a struct implement an interface?</td><td>Yes. But using the struct through an interface variable boxes it. A generic constraint (<code>where T : IThing</code>) avoids the box.</td></tr>
  <tr><td>What is a static class?</td><td>A class with only static members that can never be created or inherited. In the compiled code it is both abstract and sealed. Used for helpers and extension methods.</td></tr>
  <tr><td>What is a partial method?</td><td>A method declared in one part of a partial class and optionally implemented in another. If a plain <code>partial void</code> method has no body, calls to it are removed. Used as hooks for generated code.</td></tr>
  <tr><td>What is <code>Lazy&lt;T&gt;</code>?</td><td>A wrapper that creates its value on first use, only once, and is thread safe by default. Good for expensive objects that may never be needed.</td></tr>
  </tbody></table>
  <p>A useful extra on partial methods: since C# 9 they may have a return type and access modifiers, but then a body is required. Source generators rely on this.</p>
  <blockquote><b>Say it in the interview:</b> ref needs the variable initialised and out must be assigned inside, a struct can implement an interface but is boxed when used through it, a static class cannot be instantiated, and Lazy of T gives thread-safe creation on first use.</blockquote>`,
  ['Why can a static class not implement an interface?', 'What thread-safety modes does Lazy&lt;T&gt; offer?', 'Can a struct inherit from a class?']);

Q('I', 'Rapid fire: generics, iterators, delegates and finally',
  `<p>Quick questions on collections, generics and control flow. One or two sentences each.</p>
  <table><thead><tr><th>Question</th><th>Short answer</th></tr></thead><tbody>
  <tr><td><code>IEnumerable</code> vs <code>List</code>?</td><td><code>IEnumerable&lt;T&gt;</code> is a contract that only promises you can loop, possibly lazily. <code>List&lt;T&gt;</code> is a concrete in-memory collection with index access, <code>Count</code> and <code>Add</code>.</td></tr>
  <tr><td>What does <code>where T : class</code> mean?</td><td>The type argument must be a reference type, so T can be null and cannot be an <code>int</code> or a struct.</td></tr>
  <tr><td>What does <code>yield</code> do?</td><td>It returns items one at a time. The compiler builds a state machine, so the method runs lazily, only as far as the caller reads.</td></tr>
  <tr><td>What is a delegate?</td><td>A type-safe reference to a method, so behaviour can be stored in a variable and passed around.</td></tr>
  <tr><td>Does <code>finally</code> always run?</td><td>Yes in normal flow, including after <code>return</code> and after a caught exception. Not if the process is killed, on <code>Environment.FailFast</code>, or on a stack overflow.</td></tr>
  </tbody></table>
  <p>For the <code>finally</code> question, a strong candidate also mentions <code>using</code>: it is a <code>try</code>/<code>finally</code> written by the compiler that calls <code>Dispose</code>.</p>
  <blockquote><b>Say it in the interview:</b> IEnumerable is the looping contract and List is a concrete collection, where T class restricts T to reference types, yield builds a lazy iterator, a delegate is a type-safe method reference, and finally runs unless the process itself dies.</blockquote>`,
  ['Why return IEnumerable from a method instead of List?', 'What is the difference between yield return and yield break?', 'Does finally run when the exception is never caught anywhere?']);

registerModule({
  id: 'tl01',
  title: 'C# Language & OOP Questions',
  intro: `<p>This is the first stop in the tech lead interview handbook: the C# language and object-oriented programming questions that open almost every .NET interview. Each question has a model answer that starts with one plain sentence, then goes deeper, and ends with a line you can say out loud.</p>
    <p><b>How to use it:</b> read a question, cover the answer, and say your own answer aloud. Then open the model answer and compare. The five lessons below explain the ideas behind the questions with pictures and code you can run: the type system, methods and parameters, OOP, generics with collections and LINQ, and delegates with events and exceptions.</p>
    <p>Everything is current for 2026: .NET 10 is the long-term support release and ships with C# 14. Where older advice has changed, the answer says so.</p>`,
  goals: [
    'Explain value types, reference types, boxing, strings and null in plain words, and predict what a short snippet prints',
    'Choose between <code>class</code>, <code>struct</code>, <code>record</code>, an interface and an abstract class, and defend the choice',
    'Describe <code>ref</code>, <code>out</code>, <code>in</code>, <code>params</code>, properties and extension methods with one example each',
    'Say where a LINQ query runs (memory or database) and when it runs (deferred execution)',
    'Explain delegates, events and closures, including the loop-variable trap and the event memory leak',
    'State a clear exception-handling policy: what to catch, how to rethrow, and how an API reports errors'
  ],
  prereqs: `<p>You should be able to read basic C#: variables, <code>if</code>, loops, methods and a simple class. If not, start with the first modules of the C# course. No ASP.NET Core or database knowledge is needed here. Where an answer mentions EF Core or dependency injection, it explains the term in one line.</p>`,
  hours: 12,
  langExplain: `<p>All code in this module is C#, because these are C# interview questions. The ideas (value vs reference, interfaces, generics, closures, exceptions) exist in Java, TypeScript and Python too, under slightly different names.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
