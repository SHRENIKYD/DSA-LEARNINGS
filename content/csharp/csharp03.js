(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------- shared visualizer helpers (csharp03) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function cp(code, line, cls, label) { var hl = {}; if (line) hl[line] = cls || 'cur'; return { type: 'code', label: label || 'C# (current line highlighted)', lang: 'csharp', code: code, hl: hl }; }
  function vp(obj, hl, label) { var vals = {}; Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); }); return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl || {} }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function heap(entries, hl) { return { type: 'map', label: 'Managed heap (objects)', entries: entries, hl: hl || {} }; }

  /* ======================================================================
     TOPIC 1 — Classes vs structs
     ====================================================================== */
  topics.push({
    title: 'Classes vs Structs: Reference Semantics vs Value Semantics',
    analogy: R`<p>A <b>class</b> object is a <b>house</b>; a variable holds its <b>address on a slip of paper</b>. Copy the slip and you have two slips pointing to the same house — paint the door through one, and the other sees red paint too. A <b>struct</b> is a <b>printed photo</b>: copying it gives you a second photo. Draw a moustache on your copy and the original stays untouched. Houses are big and shared; photos are small and handed around freely.</p>`,
    explain: R`<h4>🟢 The one rule that explains everything</h4>
<p>Assignment, passing an argument and returning a value all <b>copy the variable</b>. For a class the variable holds a <b>reference</b>, so the copy points at the same object. For a struct the variable holds the <b>data itself</b>, so the copy is an independent value.</p>
${H.table(['', '<code>class</code> (reference type)', '<code>struct</code> (value type)'], [
  ['Variable holds', 'a reference to an object on the managed heap', 'the fields themselves (inline)'],
  ['<code>b = a</code>', 'both refer to one object', 'two independent copies'],
  ['Default value', '<code>null</code>', 'all fields zero (<code>default(T)</code>)'],
  ['Can be null?', 'yes (nullable reference types warn about it)', 'only as <code>T?</code> (<code>Nullable&lt;T&gt;</code>)'],
  ['Inheritance', 'yes (single base class)', 'no (implicitly sealed; may implement interfaces)'],
  ['<code>==</code> by default', 'reference identity (unless overloaded)', 'not defined unless you define it (records/structs: see equality topic)'],
  ['Good for', 'entities with identity and behaviour: Customer, Order, Service', 'small, immutable values: Point, Money, DateTime, Guid, (int, int)']
])}
<h4>Built-in examples</h4>
<p>Structs: <code>int</code>, <code>double</code>, <code>bool</code>, <code>char</code>, <code>decimal</code>, <code>DateTime</code>, <code>TimeSpan</code>, <code>Guid</code>, <code>ValueTuple</code>, <code>KeyValuePair&lt;K,V&gt;</code>, <code>Span&lt;T&gt;</code>. Classes: <code>string</code>, arrays, <code>List&lt;T&gt;</code>, <code>Dictionary&lt;K,V&gt;</code>, <code>Exception</code>, <code>StringBuilder</code>.</p>
<h4>When to choose a struct</h4>
<p>Microsoft's guideline: consider a struct when the type is <b>small</b> (about 16 bytes or less), logically represents <b>a single value</b>, is <b>immutable</b>, and will not be boxed often. Otherwise use a class. A big or mutable struct causes expensive copies and confusing bugs, as the visualizer shows.</p>`,
    clues: [
      '"I changed the copy and the original changed too" → class (shared reference)',
      '"I changed it but nothing happened" → struct copy, e.g. modifying <code>list[0].X</code> on a <code>List&lt;Point&gt;</code> (CS1612)',
      '"small immutable value like coordinates or money" → struct or record struct',
      '"needs inheritance / identity / shared mutable state" → class',
      '"default(T) is all zeros" → structs always have a valid zero value'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Copy semantics side by side (runnable)', code: R`using System;

class PointClass { public int X; public int Y; }
struct PointStruct { public int X; public int Y; }

class Program
{
    static void Main()
    {
        var c1 = new PointClass { X = 1, Y = 2 };
        var c2 = c1;            // copies the reference
        c2.X = 99;
        Console.WriteLine($"class:  c1.X = {c1.X}");   // 99 — same object

        var s1 = new PointStruct { X = 1, Y = 2 };
        var s2 = s1;            // copies the data
        s2.X = 99;
        Console.WriteLine($"struct: s1.X = {s1.X}");   // 1 — independent copy

        PointClass? none = null;                        // classes can be null
        PointStruct zero = default;                     // structs default to zeros
        Console.WriteLine($"{none is null} {zero.X},{zero.Y}");
    }
}` }],
    codeTitle: ['Class vs struct copies'],
    viz: {
      title: 'Copying a class reference vs copying a struct',
      input: '7',
      inputLabel: 'New value written through the copy',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,6}$/.test(t)) throw new Error('Enter an integer up to 6 digits');
        var v = Number(t);
        var code = 'var a = new PointClass { X = 1 };\nvar b = a;\nb.X = ' + v + ';\nvar s = new PointStruct { X = 1 };\nvar u = s;\nu.X = ' + v + ';';
        return [
          fr('<code>new PointClass</code> allocates an object on the heap (#1). The variable <code>a</code> stores only a reference to it.', [cp(code, 1), vp({ a: '→ #1' }, { a: 'ok' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = 1']], { '#1 PointClass': 'ok' })]),
          fr('<code>b = a</code> copies the <b>reference</b>. Still one object: two arrows to #1.', [cp(code, 2), vp({ a: '→ #1', b: '→ #1' }, { b: 'ok' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = 1']], { '#1 PointClass': 'cur' })]),
          fr('<code>b.X = ' + v + '</code> follows b\'s arrow and changes object #1 — so <code>a.X</code> is ' + v + ' too.', [cp(code, 3, 'bad'), vp({ a: '→ #1 (X = ' + v + ')', b: '→ #1 (X = ' + v + ')' }, { a: 'bad' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = ' + v]], { '#1 PointClass': 'bad' })]),
          fr('A struct lives <b>inside</b> its variable: <code>s</code> holds the field X = 1 directly. No heap object.', [cp(code, 4), vp({ a: '→ #1', b: '→ #1', 's.X': 1 }, { 's.X': 'ok' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = ' + v]])]),
          fr('<code>u = s</code> copies all fields: u is a separate value.', [cp(code, 5), vp({ a: '→ #1', b: '→ #1', 's.X': 1, 'u.X': 1 }, { 'u.X': 'ok' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = ' + v]])]),
          fr('<code>u.X = ' + v + '</code> changes only u. <code>s.X</code> stays 1. That is value semantics.', [cp(code, 6, 'ok'), vp({ a: '→ #1', b: '→ #1', 's.X': 1, 'u.X': v }, { 's.X': 'sel', 'u.X': 'ok' }, 'Stack (locals)'), heap([['#1 PointClass', 'X = ' + v]])]),
          fr('Takeaway: with classes, "copy" means "share"; with structs, "copy" means "duplicate". (Locals are shown on the stack; a struct that is a field of a class lives inside that object on the heap.)', [tx('class → shared object, struct → independent copy')])
        ];
      }
    },
    examples: [
      { title: 'The List-of-structs trap', html: R`<p>Indexing a <code>List&lt;T&gt;</code> returns a <b>copy</b> of a struct element, so <code>list[0].X = 5</code> would modify a temporary — the compiler refuses (CS1612). Arrays index the element in place, so it works there.</p>`, code: R`struct P { public int X; }

static void Demo()
{
    var arr = new P[1];
    arr[0].X = 5;                 // fine: array element is a variable
    var list = new List<P> { new P() };
    var tmp = list[0];            // copy out
    tmp.X = 5;
    list[0] = tmp;                // copy back in
    Console.WriteLine($"{arr[0].X} {list[0].X}");   // 5 5
}` },
      { title: 'Passing to a method', html: R`<p>A method receiving a struct gets its own copy; one receiving a class gets the same object.</p>`, code: R`class Box { public int V; }
struct Cell { public int V; }

static void Bump(Box b, Cell c) { b.V++; c.V++; }

static void Demo()
{
    var box = new Box(); var cell = new Cell();
    Bump(box, cell);
    Console.WriteLine($"{box.V} {cell.V}");   // 1 0
}` },
      { title: 'Default values', html: R`<p>A struct always has a usable all-zero value — even if you declare a constructor, <code>default(T)</code> and array elements skip it. A class field defaults to <code>null</code>.</p>`, code: R`struct Temperature { public double Celsius; }
class Sensor { public Temperature Last; public string? Name; }

static void Demo()
{
    var s = new Sensor();
    Console.WriteLine($"{s.Last.Celsius} {s.Name is null}");   // 0 True
    var many = new Temperature[3];                              // three zero values, no constructor calls
    Console.WriteLine(many[2].Celsius);
}` }
    ],
    deepDive: R`<h4>🟣 Memory and performance reality</h4>
<ul>
<li><b>"Structs live on the stack" is a simplification.</b> A struct lives wherever its container lives: a local (stack or register), a field inside a class (on the heap, inline in that object), an array element (inline in the array). A class instance always lives on the heap (escape analysis for small objects is arriving in newer runtimes, but do not rely on it).</li>
<li><b>Object overhead.</b> Every class instance carries a 16-byte header on 64-bit (object header + method table pointer), and needs GC tracking. An array of 1,000,000 <code>Point</code> structs is one 8 MB block; an array of 1,000,000 <code>Point</code> classes is 8 MB of references plus a million 24-byte objects scattered on the heap — slower to iterate and harder on the GC.</li>
<li><b>Copy cost.</b> Struct copies are memberwise memcopies. Copying a 64-byte struct on every call or <code>foreach</code> step adds up; pass large structs with <code>in</code> or keep them small.</li>
<li><b>Boxing.</b> Converting a struct to <code>object</code> or to an interface allocates a heap copy (module 8). <code>List&lt;int&gt;</code> avoids it thanks to generics; old <code>ArrayList</code> did not.</li>
<li><b>Parameterless struct constructors</b> are allowed since C# 10, but <code>default(T)</code>, <code>new T[n]</code> and uninitialised fields still bypass them, so a struct must make sense when zeroed.</li>
<li><b>Equality.</b> The inherited <code>ValueType.Equals</code> compares fields, using reflection when the struct has reference fields or padding — slow. Implement <code>IEquatable&lt;T&gt;</code> or use a <code>record struct</code>.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI defaults to classes for everything, which is usually fine, but it sometimes proposes structs "for performance" without checking size or mutability. <b>Use AI as a partner:</b> ask it to estimate the size of a type and the number of copies per operation, then benchmark. <b>Where AI goes wrong:</b> mutable structs stored in lists or dictionaries (silent lost updates), large structs passed by value in hot loops, and claiming structs are always on the stack. <b>What you must still own:</b> choosing semantics first (identity vs value) and performance second.</p>`
  });

  /* ======================================================================
     TOPIC 2 — Constructors
     ====================================================================== */
  topics.push({
    title: 'Constructors: Chaining, Primary Constructors, Object Initializers & required',
    analogy: R`<p>Ordering a <b>custom bike</b>. The <b>constructor</b> is the factory's assembly line: it guarantees every bike leaves with two wheels and brakes (invariants). Constructor <b>chaining</b> is one assembly line reusing another ("build the standard bike, then add a basket"). An <b>object initializer</b> is the shop adding accessories after the bike rolls off the line. <code>required</code> is the order form with fields marked "must fill in" — the shop will not accept the order without them.</p>`,
    explain: R`<h4>🟢 Instance constructors</h4>
<pre>public class Account
{
    public string Owner { get; }
    public decimal Balance { get; private set; }

    public Account(string owner, decimal opening)          // main constructor
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(owner);
        if (opening &lt; 0) throw new ArgumentOutOfRangeException(nameof(opening));
        Owner = owner;
        Balance = opening;
    }

    public Account(string owner) : this(owner, 0m) { }     // chaining: reuse the checks
}</pre>
<ul>
<li>If you write no constructor, the compiler provides a public parameterless one. Once you write any constructor, it does not.</li>
<li><code>: this(...)</code> calls another constructor of the same class first; <code>: base(...)</code> calls the base class constructor (module 4).</li>
<li>Field initialisers (<code>private int _count = 10;</code>) run before the constructor body.</li>
</ul>
<h4>Primary constructors (C# 12)</h4>
<pre>public class Greeter(string greeting)                     // parameters in the class header
{
    public string Greet(string name) =&gt; $"{greeting}, {name}!";   // usable anywhere in the body
}</pre>
<p>For classes and structs, primary constructor parameters are <b>captured</b> like parameters available to all members — they are <i>not</i> properties. Other constructors must chain to the primary one with <code>this(...)</code>. Common in dependency injection: <code>public class OrderService(IRepository repo, ILogger&lt;OrderService&gt; log)</code>. For records, primary constructor parameters <i>do</i> become public properties.</p>
<h4>Object initializers and required members</h4>
<pre>var p = new Person { Name = "Ada", Age = 36 };   // calls the parameterless ctor, then sets properties
public class Person
{
    public required string Name { get; init; }      // C# 11: must be set by the creator
    public int Age { get; init; }
}</pre>
<p>Forgetting <code>Name</code> in the initializer is a compile error (CS9035). A constructor marked <code>[SetsRequiredMembers]</code> tells the compiler it sets them itself.</p>
<h4>Static constructors</h4>
<p><code>static Config() { … }</code> runs once per type, automatically, before first use. It takes no parameters and no access modifier. An exception there makes the type unusable (<code>TypeInitializationException</code>) for the life of the process.</p>`,
    clues: [
      '"validate arguments once and reuse the logic" → constructor chaining with <code>this(...)</code>',
      '"inject dependencies into a service" → primary constructor (C# 12)',
      '"caller must set Name, but I want initializer syntax" → <code>required</code> + <code>init</code>',
      '"run setup once for the type" → static constructor or static field initialiser',
      '"no parameterless constructor" error → you declared another constructor'
    ],
    code: [R`public class Temperature
{
    public double Celsius { get; }

    public Temperature(double celsius)
    {
        if (celsius < -273.15) throw new ArgumentOutOfRangeException(nameof(celsius), "below absolute zero");
        Celsius = celsius;
    }

    public Temperature() : this(20.0) { }              // room temperature by default

    public static Temperature FromFahrenheit(double f) => new((f - 32) * 5 / 9);   // factory method
}

public class Notifier(string sender, int maxRetries = 3)  // primary constructor
{
    private int _sent;                                    // regular field
    public string Send(string to)
    {
        _sent++;
        return $"{sender} -> {to} (attempt limit {maxRetries}, sent {_sent})";
    }
}

public class User
{
    public required string Email { get; init; }
    public string DisplayName { get; init; } = "anonymous";
}`],
    codeTitle: ['Chaining, factory, primary constructor, required/init'],
    viz: {
      title: 'Order of construction',
      gen: function () {
        var code = 'class Order\n{\n    private readonly List<string> _items = new();   // field initialiser\n    public string Id { get; }\n    public string Status { get; init; } = "new";\n    public Order(string id) : this() { Id = id; }\n    public Order() { _items.Add("created"); }\n}\nvar o = new Order("A1") { Status = "paid" };';
        function s(line, vals, hl, narr) { return fr(narr, [cp(code, line), vp(vals, hl, 'Fields of the new object')]); }
        return [
          s(9, { '(object)': 'memory zeroed' }, {}, '<code>new Order("A1")</code>: first the runtime allocates the object and <b>zeroes</b> all fields (null, 0, false).'),
          s(3, { _items: '→ empty List', Id: 'null', Status: 'null' }, { _items: 'ok' }, 'Field initialisers run first, in declaration order: <code>_items</code> gets a new list…'),
          s(5, { _items: '→ empty List', Id: 'null', Status: '"new"' }, { Status: 'ok' }, '…and the auto-property initialiser sets <code>Status = "new"</code>.'),
          s(6, { _items: '→ empty List', Id: 'null', Status: '"new"' }, {}, 'The chosen constructor <code>Order(string)</code> starts, but <code>: this()</code> means the parameterless constructor body runs <b>before</b> its own body.'),
          s(7, { _items: '→ ["created"]', Id: 'null', Status: '"new"' }, { _items: 'ok' }, 'Body of <code>Order()</code>: adds "created".'),
          s(6, { _items: '→ ["created"]', Id: '"A1"', Status: '"new"' }, { Id: 'ok' }, 'Back in <code>Order(string)</code>: <code>Id = "A1"</code>. A get-only property can be assigned only in a constructor.'),
          s(9, { _items: '→ ["created"]', Id: '"A1"', Status: '"paid"' }, { Status: 'ok' }, 'Finally the object initializer runs: <code>Status = "paid"</code> through the <code>init</code> accessor. After this statement, Status can never change.'),
          fr('Order recap: zero memory → field initialisers → chained constructor body → own constructor body → object initializer. (With inheritance, base class constructors run before the derived body; module 4.)', [tx('<b>alloc</b> → <b>field init</b> → <b>this(...)</b> → <b>ctor body</b> → <b>{ init }</b>')])
        ];
      }
    },
    examples: [
      { title: 'Factory methods instead of overloaded constructors', html: R`<p>Two constructors taking a <code>double</code> cannot exist (Celsius vs Fahrenheit). Named static factories make the meaning explicit.</p>`, code: R`public readonly struct Angle
{
    public double Radians { get; }
    private Angle(double radians) => Radians = radians;
    public static Angle FromRadians(double r) => new(r);
    public static Angle FromDegrees(double d) => new(d * Math.PI / 180);
}` },
      { title: 'Primary constructor parameters are not properties', html: R`<p>In a class, a primary constructor parameter is captured into a hidden field only if a member uses it. To expose it, declare a property explicitly.</p>`, code: R`public class Product(string name, decimal price)
{
    public string Name { get; } = name;             // explicit property initialised from the parameter
    public decimal PriceWithTax(decimal rate) => price * (1 + rate);   // parameter captured
}` },
      { title: 'required members with an initializer', html: R`<p>Object initializers read nicely; <code>required</code> keeps them safe by refusing to compile when a mandatory member is missing.</p>`, code: R`public class SmtpSettings
{
    public required string Host { get; init; }
    public int Port { get; init; } = 587;
}

static class Demo
{
    public static void Run()
    {
        var s = new SmtpSettings { Host = "smtp.example.com" };   // omitting Host: CS9035
        Console.WriteLine($"{s.Host}:{s.Port}");
    }
}` }
    ],
    deepDive: R`<h4>🟣 Details worth knowing</h4>
<ul>
<li><b>Do not call virtual methods in constructors</b>: the derived override runs before the derived constructor body has initialised its fields (module 4).</li>
<li><b>Primary constructor capture</b>: the compiler stores used parameters in unspeakable fields. They are mutable (you can assign the parameter), and capturing a parameter <i>and</i> also initialising a property from it creates two copies of state — analyzers warn (CS9124). Use the parameter only for initialisation, or only for capture.</li>
<li><b>Struct constructors</b>: since C# 11 a struct constructor need not assign every field (unassigned ones are zeroed automatically). <code>new S()</code> calls a declared parameterless constructor; <code>default(S)</code> never does.</li>
<li><b>Static constructor timing</b>: with an explicit static constructor the type is initialised exactly before first access to a static member or first instance; without one (only static field initialisers) the type may be marked <code>beforefieldinit</code> and initialised earlier, which lets the JIT avoid checks. Static constructors run once and are thread-safe.</li>
<li><b>Object initializers are not atomic</b>: they compile to a constructor call followed by property assignments on a temporary, which is then assigned to the variable — so a half-initialised object is never visible through your variable, but setters run in order and can throw.</li>
<li><b>Exceptions in constructors</b>: throwing is the right way to refuse invalid state; the partially built object becomes garbage. For IDisposable fields created before the throw, clean up in the constructor (module 7).</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI generates DTOs and services quickly, often with primary constructors. <b>Use AI as a partner:</b> ask "which invariants does this constructor enforce, and which ways can someone create an invalid object?". <b>Where AI goes wrong:</b> it exposes public setters on everything (no invariants), mixes primary-constructor capture with duplicate properties, forgets <code>required</code> on mandatory DTO fields, and puts heavy I/O in constructors or static constructors. <b>What you must still own:</b> the invariants of your types and the policy for creating them (constructors vs factories vs builders).</p>`
  });

  /* ======================================================================
     TOPIC 3 — Properties and init accessors
     ====================================================================== */
  topics.push({
    title: 'Properties: get/set, Validation, Computed Values & init Accessors',
    analogy: R`<p>A property is a <b>shop counter</b> in front of the storeroom. Customers never walk into the storeroom (the private field); they ask at the counter. The clerk can <b>check</b> requests ("you cannot buy a negative number of apples"), <b>compute</b> answers on the spot ("the total is price × quantity") or only allow changes during opening day (<code>init</code>). From outside it looks like a simple shelf — <code>order.Total</code> — but behind it is a little method.</p>`,
    explain: R`<h4>🟢 From field to property</h4>
<pre>public class Product
{
    private decimal _price;                          // backing field
    public decimal Price
    {
        get =&gt; _price;
        set =&gt; _price = value &gt;= 0 ? value
                 : throw new ArgumentOutOfRangeException(nameof(value), "price cannot be negative");
    }
    public string Name { get; set; } = "";            // auto-property: compiler makes the field
    public int Stock { get; private set; }            // public read, private write
    public bool InStock =&gt; Stock &gt; 0;                 // computed, read-only
    public string Sku { get; init; } = "";           // settable only during construction/initializer
}</pre>
${H.table(['Form', 'Readable', 'Writable', 'Use for'], [
  ['<code>{ get; set; }</code>', 'everyone', 'everyone', 'simple mutable data (DTOs, view models)'],
  ['<code>{ get; private set; }</code>', 'everyone', 'only the class', 'state changed by methods (Balance)'],
  ['<code>{ get; }</code>', 'everyone', 'constructor only', 'immutable state set at construction'],
  ['<code>{ get; init; }</code>', 'everyone', 'constructor or object initializer / with', 'immutable objects with initializer syntax'],
  ['<code>=&gt; expr</code>', 'everyone', 'never (computed each time)', 'derived values (FullName, Total)'],
  ['<code>required … { get; init; }</code>', 'everyone', 'must be set at creation', 'mandatory fields of DTOs/options']
])}
<h4>Why not public fields?</h4>
<ul>
<li>A property can add validation, lazy loading, change notification or logging later <b>without breaking callers</b> (changing a field to a property is a binary-breaking change).</li>
<li>Properties can have different access levels for get and set, appear in interfaces, and are what serializers and data binding look for.</li>
<li>The JIT inlines trivial getters and setters, so auto-properties cost nothing over fields.</li>
</ul>
<h4>Naming</h4>
<p>Properties and methods are <code>PascalCase</code>; private fields are <code>_camelCase</code>; parameters and locals <code>camelCase</code>. A property should be cheap and side-effect free: if it does real work (I/O, heavy computation), make it a method (<code>GetReport()</code>).</p>`,
    clues: [
      '"validate on assignment" → property with a backing field and a check in <code>set</code>',
      '"read-only from outside, changed by methods" → <code>{ get; private set; }</code>',
      '"immutable but with object initializer syntax" → <code>init</code> accessor',
      '"derived value like FullName or Total" → expression-bodied computed property',
      '"expensive to compute each time" → cache it or make it a method'
    ],
    code: [R`public class Rectangle
{
    private double _width, _height;

    public double Width
    {
        get => _width;
        set => _width = value > 0 ? value : throw new ArgumentOutOfRangeException(nameof(value), "width must be positive");
    }

    public double Height
    {
        get => _height;
        set => _height = value > 0 ? value : throw new ArgumentOutOfRangeException(nameof(value), "height must be positive");
    }

    public double Area => Width * Height;                    // computed on every read
    public bool IsSquare => Math.Abs(Width - Height) < 1e-9;
    public string Label { get; init; } = "rect";             // fixed after creation

    public Rectangle(double width, double height) { Width = width; Height = height; }   // reuse the checks
}`],
    codeTitle: ['Validated, computed and init-only properties'],
    viz: {
      title: 'What a property call really does',
      input: '-5',
      inputLabel: 'Value to assign to Width',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,6}(\.\d+)?$/.test(t)) throw new Error('Enter a number such as -5 or 3.5');
        var v = Number(t);
        var code = 'public double Width\n{\n    get => _width;\n    set => _width = value > 0\n        ? value\n        : throw new ArgumentOutOfRangeException(nameof(value));\n}\n// caller:\nr.Width = ' + t + ';\nConsole.WriteLine(r.Area);';
        var frames = [
          fr('The caller writes what looks like a field assignment: <code>r.Width = ' + esc(t) + '</code>.', [cp(code, 9), vp({ _width: 4, _height: 3 }, {}, 'Object r (private fields)')]),
          fr('The compiler turned it into a method call: <code>r.set_Width(' + esc(t) + ')</code>. Inside the setter, the incoming value is called <code>value</code>.', [cp(code, 4), vp({ value: v, _width: 4 }, { value: 'cur' }, 'Inside set_Width')])
        ];
        if (v > 0) {
          frames.push(fr('<code>value &gt; 0</code> is true, so the backing field is updated.', [cp(code, 5, 'ok'), vp({ _width: v, _height: 3 }, { _width: 'ok' }, 'Object r (private fields)')]));
          frames.push(fr('<code>r.Area</code> is <code>get_Area()</code>: computed now as Width × Height = ' + (v * 3) + '. Nothing is stored.', [cp(code, 10, 'ok'), vp({ Area: v * 3 }, { Area: 'sel' })]));
        } else {
          frames.push(fr('<code>value &gt; 0</code> is false → the throw expression runs. <b>ArgumentOutOfRangeException</b> leaves the setter before the field is touched.', [cp(code, 6, 'bad'), vp({ _width: 4, _height: 3 }, { _width: 'sel' }, 'Object r (unchanged)')]));
          frames.push(fr('The invariant "width is positive" survives. With a public field, the bad value would have gone straight in and corrupted every later Area.', [cp(code, 10, 'bad'), tx('Exception propagates to the caller; Console.WriteLine never runs.')]));
        }
        frames.push(fr('After JIT inlining, a trivial getter costs the same as reading a field — the encapsulation is free.', [tx('get_Width() → inlined → <code>mov rax, [rcx+8]</code>')]));
        return frames;
      }
    },
    examples: [
      { title: 'Private setter with a method that enforces rules', html: R`<p>Outsiders can read <code>Balance</code> but only <code>Deposit</code> may change it, so every change passes the check.</p>`, code: R`public class Wallet
{
    public decimal Balance { get; private set; }
    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Balance += amount;
    }
}` },
      { title: 'init: set once, then frozen', html: R`<p>An <code>init</code> accessor can be used in an object initializer (and in <code>with</code> expressions for records), but any later assignment is a compile error (CS8852).</p>`, code: R`public class Ticket
{
    public string Seat { get; init; } = "";
}

static class Demo
{
    public static void Run()
    {
        var t = new Ticket { Seat = "12A" };
        // t.Seat = "1A";   // CS8852: init-only property
        Console.WriteLine(t.Seat);
    }
}` },
      { title: 'Lazy computed property', html: R`<p>When a derived value is expensive and the inputs never change, compute it once on first access and cache it. <code>??=</code> assigns only when the field is null.</p>`, code: R`public class Document(string text)
{
    private int? _wordCount;
    public int WordCount => _wordCount ??= text.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
}` }
    ],
    deepDive: R`<h4>🟣 Under the hood</h4>
<ul>
<li>A property compiles to <code>get_Name</code>/<code>set_Name</code> methods plus metadata linking them; an auto-property also gets a private field named <code>&lt;Name&gt;k__BackingField</code>. An <code>init</code> accessor is a setter whose return type carries the <code>modreq(IsExternalInit)</code> marker, which the compiler checks at call sites.</li>
<li><b>init is a compile-time guarantee</b>, not a runtime one: reflection or serializers can still set the value. It also does not make the referenced object immutable (an init-only <code>List&lt;T&gt;</code> can still be modified).</li>
<li><b>Properties are not variables</b>: you cannot pass <code>obj.Prop</code> by <code>ref</code>, and for a struct-typed property, <code>obj.Pos.X = 1</code> is an error because the getter returns a copy (CS1612).</li>
<li><b>Indexers</b> are properties with parameters: <code>public T this[int i] { get … set … }</code> — how <code>List&lt;T&gt;</code> and <code>Dictionary</code> provide <code>[]</code>.</li>
<li><b>Change notification</b>: UI frameworks (WPF, MAUI) use setters that raise <code>INotifyPropertyChanged.PropertyChanged</code>; source generators (CommunityToolkit.Mvvm) write this boilerplate for you.</li>
<li><b>C# 13/14 note</b>: newer compilers add the <code>field</code> keyword for semi-auto properties (<code>set =&gt; field = value.Trim();</code>); in C# 12 you declare the backing field yourself.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI generates property boilerplate instantly. <b>Use AI as a partner:</b> "make this class immutable with init/required" or "add validation to every setter and write tests for the boundaries". <b>Where AI goes wrong:</b> public setters on everything (anaemic objects with no invariants), properties that hit the database or network, computed properties that allocate on every read, and mutable collections exposed through get-only properties. <b>What you must still own:</b> deciding what may change, who may change it, and which rules must always hold.</p>`
  });

  /* ======================================================================
     TOPIC 4 — Static members
     ====================================================================== */
  topics.push({
    title: 'Static Members: Shared State, Static Classes & Utility Methods',
    analogy: R`<p>A school. Each <b>student</b> (instance) has their own name and grades. The <b>school notice board</b> (a static field) is shared by everyone — one board, whatever the number of students, and it exists even on a day when no student is present. The <b>school rules booklet</b> (a static class like <code>Math</code>) is just a set of procedures; nobody "creates" a booklet object, you simply consult it.</p>`,
    explain: R`<h4>🟢 Instance vs static</h4>
${H.table(['', 'Instance member', 'Static member'], [
  ['Belongs to', 'one object', 'the type itself'],
  ['Access', '<code>order.Total</code>', '<code>Order.Count</code>, <code>Math.Max(a, b)</code>'],
  ['Copies', 'one per object', 'exactly one per type (per generic instantiation)'],
  ['Can use <code>this</code>?', 'yes', 'no — a static method cannot touch instance members without an object'],
  ['Typical', 'state and behaviour of an entity', 'counters, caches, factories, pure helper functions, constants']
])}
<pre>public class Ticket
{
    private static int s_nextId = 1;            // shared by all tickets
    public int Id { get; }
    public Ticket() { Id = s_nextId++; }        // each new ticket takes the next number
    public static int Issued =&gt; s_nextId - 1;   // static property
}</pre>
<h4>Static classes</h4>
<p><code>public static class StringTools { … }</code> cannot be instantiated or inherited and may contain only static members. Use them for stateless helpers (<code>Math</code>, <code>File</code>, <code>Convert</code>) and for <b>extension methods</b> (module 11). <code>using static StringTools;</code> imports the members.</p>
<h4>Dangers of static mutable state</h4>
<ul>
<li><b>Hidden coupling</b>: any code anywhere can change it; tests interfere with each other.</li>
<li><b>Thread safety</b>: <code>s_nextId++</code> is a read-modify-write; two threads can produce duplicate ids. Use <code>Interlocked.Increment(ref s_nextId)</code> (module 10).</li>
<li><b>Lifetime</b>: static fields live as long as the app; caches held statically never get collected unless you evict.</li>
</ul>
<p>Modern .NET prefers <b>dependency injection</b> with singleton-lifetime services over static mutable state. Static is perfect for <b>pure functions</b> and <b>constants</b>.</p>`,
    clues: [
      '"count how many objects were created" → static counter (thread-safe with Interlocked)',
      '"helper with no state" → static method in a static class',
      '"cannot access non-static member from static context" (CS0120) → you need an instance',
      '"one shared instance for the whole app" → DI singleton (or a <code>Lazy&lt;T&gt;</code> singleton)',
      '"flaky tests that pass alone" → shared static state'
    ],
    code: [R`public static class Geometry                      // static class: no instances
{
    public const double Tau = 2 * Math.PI;           // const is implicitly static
    public static double CircleArea(double r) => Math.PI * r * r;
    public static double Distance((double X, double Y) a, (double X, double Y) b)
        => Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));
}

public sealed class IdGenerator
{
    private static int s_counter;                    // shared, starts at 0
    public static int Next() => Interlocked.Increment(ref s_counter);   // thread-safe ++
}

public sealed class AppClock
{
    // Lazy, thread-safe singleton (prefer DI in real apps).
    private static readonly Lazy<AppClock> s_instance = new(() => new AppClock());
    public static AppClock Instance => s_instance.Value;
    private AppClock() { }
    public DateTime UtcNow => DateTime.UtcNow;
}`],
    codeTitle: ['Static class, static counter, lazy singleton'],
    viz: {
      title: 'One static field, many instances',
      input: '3',
      inputLabel: 'How many Ticket objects to create (1..6)',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^\d$/.test(t) || Number(t) < 1 || Number(t) > 6) throw new Error('Enter a number from 1 to 6');
        var n = Number(t);
        var code = 'class Ticket\n{\n    static int s_nextId = 1;\n    public int Id { get; }\n    public Ticket() { Id = s_nextId++; }\n}\nfor (int i = 0; i < ' + n + '; i++) list.Add(new Ticket());';
        var frames = [fr('Before any Ticket exists, the type\'s static storage already holds <code>s_nextId = 1</code>. There is exactly one copy.', [cp(code, 3), vp({ 'Ticket.s_nextId': 1 }, { 'Ticket.s_nextId': 'sel' }, 'Static storage (one per type)'), heap([['(no tickets yet)', '—']])])];
        var objs = [];
        for (var i = 1; i <= n; i++) {
          objs.push(['#' + i + ' Ticket', 'Id = ' + i]);
          var hl = {}; hl['#' + i + ' Ticket'] = 'ok';
          frames.push(fr('<code>new Ticket()</code> #' + i + ': the constructor reads the shared counter (' + i + '), stores it in this object\'s <code>Id</code>, then increments the counter to ' + (i + 1) + '.', [cp(code, 5), vp({ 'Ticket.s_nextId': i + 1 }, { 'Ticket.s_nextId': 'cur' }, 'Static storage (one per type)'), heap(objs.map(function (o) { return o.slice(); }), hl)]));
        }
        frames.push(fr(n + ' objects, each with its own <code>Id</code>, but still a single <code>s_nextId</code>. If two threads ran the constructor at the same time, both could read the same value — use <code>Interlocked.Increment</code>.', [vp({ 'Ticket.s_nextId': n + 1 }, { 'Ticket.s_nextId': 'sel' }, 'Static storage'), heap(objs)]));
        return frames;
      }
    },
    examples: [
      { title: 'CS0120: static code needs an instance', html: R`<p>A static method has no <code>this</code>. To use instance data, pass or create an object.</p>`, code: R`public class Counter
{
    private int _value;
    public void Increment() => _value++;
    public int Value => _value;

    public static Counter StartAt(int n)
    {
        var c = new Counter();          // _value++ alone here would be CS0120
        for (int i = 0; i < n; i++) c.Increment();
        return c;
    }
}` },
      { title: 'Static per generic instantiation', html: R`<p>Each closed generic type gets its own statics: <code>Cache&lt;int&gt;.Hits</code> and <code>Cache&lt;string&gt;.Hits</code> are different variables — handy for per-type caches.</p>`, code: R`public static class TypeName<T>
{
    public static readonly string Value = typeof(T).Name;   // computed once per T
}

static class Demo
{
    public static void Run() => Console.WriteLine($"{TypeName<int>.Value} {TypeName<string>.Value}");   // Int32 String
}` },
      { title: 'Pure static helpers are easy to test', html: R`<p>A static method that depends only on its inputs needs no setup and no mocks — the ideal shape for calculation code.</p>`, code: R`public static class Pricing
{
    public static decimal WithDiscount(decimal price, int percent) =>
        percent is < 0 or > 100 ? throw new ArgumentOutOfRangeException(nameof(percent))
                                : Math.Round(price * (100 - percent) / 100, 2);
}` }
    ],
    deepDive: R`<h4>🟣 Under the hood</h4>
<ul>
<li>Static fields live in per-type storage allocated when the type is loaded (on the GC heap for reference-containing statics in modern .NET); they are GC roots, so anything reachable from a static is never collected.</li>
<li><b>Type initialisation</b> runs static field initialisers and the static constructor once, under a lock; a deadlock is possible if two types' static constructors wait on each other across threads.</li>
<li><code>[ThreadStatic]</code> gives each thread its own copy of a static field; <code>ThreadLocal&lt;T&gt;</code> and <code>AsyncLocal&lt;T&gt;</code> are the safer modern equivalents (the latter flows with async calls).</li>
<li><b>Static readonly vs const</b>: after tier-1 JIT, static readonly primitives are embedded as constants, and branches on them (feature flags) are eliminated.</li>
<li><b>Static abstract interface members</b> (C# 11, module 11) let generics call static methods like <code>T.Parse</code> or <code>T.Zero</code> — the basis of generic math.</li>
<li><b>Testing</b>: static dependencies like <code>DateTime.Now</code> make code hard to test; .NET 8 adds <code>TimeProvider</code> so time can be injected and faked.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI loves static helper classes and singletons because they are quick to write. <b>Use AI as a partner:</b> "which static state in this code would break under concurrency or parallel tests?". <b>Where AI goes wrong:</b> non-thread-safe static counters and caches, static <code>HttpClient</code> misuse in the other direction (creating one per call), and static service locators that hide dependencies. <b>What you must still own:</b> deciding what is truly global, and making shared state safe.</p>`
  });

  /* ======================================================================
     TOPIC 5 — Records and with-expressions
     ====================================================================== */
  topics.push({
    title: 'Records: Positional Syntax, Value Equality, with-Expressions & record struct',
    analogy: R`<p>A record is a <b>filled-in form</b>, like a parcel label: sender, recipient, weight. Two labels with exactly the same entries are <b>the same label</b>, even if printed on different paper (value equality). You never scribble on a label; to send the parcel elsewhere you <b>photocopy it and change one line</b> — that is a <code>with</code> expression. The original stays as it was.</p>`,
    explain: R`<h4>🟢 One line, lots of code</h4>
<pre>public record Person(string Name, int Age);</pre>
<p>This positional record gives you, for free:</p>
${H.table(['Generated member', 'What it does'], [
  ['<code>Name</code>, <code>Age</code> properties', '<code>{ get; init; }</code> — immutable after creation'],
  ['Primary constructor', '<code>new Person("Ada", 36)</code>'],
  ['<code>Equals</code>, <code>GetHashCode</code>, <code>==</code>, <code>!=</code>', 'compare <b>all fields by value</b> (and the runtime type)'],
  ['<code>ToString()</code>', '<code>Person { Name = Ada, Age = 36 }</code>'],
  ['<code>Deconstruct</code>', '<code>var (name, age) = person;</code>'],
  ['Copy constructor + <code>with</code>', '<code>var older = person with { Age = 37 };</code>'],
  ['<code>IEquatable&lt;Person&gt;</code>', 'typed, fast equality']
])}
<h4>Flavours</h4>
${H.table(['Declaration', 'Kind', 'Positional properties'], [
  ['<code>record Person(...)</code> / <code>record class</code>', 'reference type', '<code>init</code> (immutable)'],
  ['<code>record struct Point(int X, int Y)</code>', 'value type', '<code>set</code> (mutable!)'],
  ['<code>readonly record struct Point(int X, int Y)</code>', 'value type', '<code>init</code> (immutable) — usually what you want']
])}
<p>You can add members, validation and extra properties in a body:</p>
<pre>public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other) =&gt; other.Currency == Currency
        ? this with { Amount = Amount + other.Amount }
        : throw new InvalidOperationException("currency mismatch");
}</pre>
<h4>When to use records</h4>
<p>Data that is defined by its values: DTOs, API messages, events, configuration snapshots, keys in dictionaries, results of computations. Prefer a class for <b>entities</b> with identity and changing state (an <code>Order</code> whose status changes but is still the same order).</p>`,
    clues: [
      '"immutable data carrier / DTO / event" → <code>record</code>',
      '"copy with one field changed" → <code>with</code> expression',
      '"two objects with the same values should be equal" → record (value equality)',
      '"use a composite key in a Dictionary or HashSet" → record or readonly record struct',
      '"print an object\'s fields for debugging" → record ToString'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Records in action (runnable)', code: R`using System;
using System.Collections.Generic;

public record Person(string Name, int Age);
public readonly record struct GridPos(int Row, int Col);

class Program
{
    static void Main()
    {
        var a = new Person("Ada", 36);
        var b = new Person("Ada", 36);
        Console.WriteLine(a == b);                    // True: value equality
        Console.WriteLine(ReferenceEquals(a, b));     // False: two objects
        Console.WriteLine(a);                         // Person { Name = Ada, Age = 36 }

        var older = a with { Age = 37 };              // non-destructive mutation
        Console.WriteLine($"{a.Age} {older.Age}");    // 36 37

        var (name, age) = older;                      // deconstruction
        Console.WriteLine($"{name} is {age}");

        var visited = new HashSet<GridPos> { new(0, 0), new(1, 2) };
        Console.WriteLine(visited.Contains(new GridPos(1, 2)));   // True: hashes by value
    }
}` }],
    codeTitle: ['Value equality, with, deconstruction, record struct keys'],
    viz: {
      title: 'with creates a modified copy',
      input: '37',
      inputLabel: 'New Age for the copy',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^\d{1,3}$/.test(t)) throw new Error('Enter an age from 0 to 999');
        var age = Number(t);
        var code = 'record Person(string Name, int Age);\nvar a = new Person("Ada", 36);\nvar b = a with { Age = ' + age + ' };\nvar c = new Person("Ada", ' + age + ');\nConsole.WriteLine(b == c);';
        return [
          fr('<code>a</code> refers to a Person object #1 with Name = "Ada", Age = 36. Its properties are init-only.', [cp(code, 2), vp({ a: '→ #1' }, {}, 'Locals'), heap([['#1 Person', 'Name="Ada", Age=36']], { '#1 Person': 'ok' })]),
          fr('<code>a with { Age = ' + age + ' }</code> calls the hidden <b>copy constructor</b> (<code>&lt;Clone&gt;$</code>): a new object #2 with every field copied from #1…', [cp(code, 3), vp({ a: '→ #1', b: '→ #2' }, { b: 'cur' }, 'Locals'), heap([['#1 Person', 'Name="Ada", Age=36'], ['#2 Person', 'Name="Ada", Age=36 (copied)']], { '#2 Person': 'cur' })]),
          fr('…then runs the initializer <code>Age = ' + age + '</code> on the copy through the init accessor. #1 is untouched.', [cp(code, 3, 'ok'), vp({ a: '→ #1', b: '→ #2' }, { b: 'ok' }, 'Locals'), heap([['#1 Person', 'Name="Ada", Age=36'], ['#2 Person', 'Name="Ada", Age=' + age]], { '#2 Person': 'ok', '#1 Person': 'sel' })]),
          fr('<code>c</code> is built independently: object #3 with the same values as #2.', [cp(code, 4), vp({ a: '→ #1', b: '→ #2', c: '→ #3' }, { c: 'ok' }, 'Locals'), heap([['#1 Person', 'Name="Ada", Age=36'], ['#2 Person', 'Name="Ada", Age=' + age], ['#3 Person', 'Name="Ada", Age=' + age]])]),
          fr('<code>b == c</code>: the generated operator compares <code>EqualityContract</code> (same runtime type), then Name, then Age — all equal → <b>True</b>, although #2 and #3 are different objects.' + (age === 36 ? ' (Here a == b would be True too.)' : ''), [cp(code, 5, 'ok'), { type: 'table', label: 'Generated Equals', columns: ['check', 'b', 'c', 'equal?'], rows: [['EqualityContract', 'Person', 'Person', 'yes'], ['Name', '"Ada"', '"Ada"', 'yes'], ['Age', String(age), String(age), 'yes']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }]),
          fr('Caution: <code>with</code> is a <b>shallow</b> copy. If a record holds a <code>List&lt;T&gt;</code>, both copies share the same list object.', [tx('with = memberwise copy + init setters; nested reference objects are shared')])
        ];
      }
    },
    examples: [
      { title: 'Validation inside a positional record', html: R`<p>Declare the property explicitly to validate it; the positional parameter still initialises it.</p>`, code: R`public record Email(string Value)
{
    public string Value { get; init; } = Value.Contains('@')
        ? Value.Trim().ToLowerInvariant()
        : throw new ArgumentException("not an email", nameof(Value));
}` },
      { title: 'Shallow copy trap', html: R`<p>Records compare collections by <b>reference</b>, and <code>with</code> copies the reference. Two orders with equal-looking lists are not equal unless they share the same list.</p>`, code: R`public record Order(string Id, List<string> Items);

static class Demo
{
    public static void Run()
    {
        var o1 = new Order("A", new List<string> { "pen" });
        var o2 = o1 with { Id = "B" };
        o2.Items.Add("ink");                        // also visible through o1!
        Console.WriteLine(o1.Items.Count);          // 2
        Console.WriteLine(new Order("A", ["x"]) == new Order("A", ["x"]));   // False: different lists
    }
}` },
      { title: 'readonly record struct as a dictionary key', html: R`<p>A small immutable value type with value equality and a good hash code — perfect for grid coordinates or composite keys without heap allocation per key.</p>`, code: R`public readonly record struct Cell(int Row, int Col);

static class Demo
{
    public static void Run()
    {
        var cost = new Dictionary<Cell, int> { [new Cell(0, 0)] = 1 };
        cost[new Cell(0, 1)] = 5;
        Console.WriteLine(cost[new Cell(0, 1)]);    // 5
    }
}` }
    ],
    deepDive: R`<h4>🟣 What the compiler generates</h4>
<ul>
<li><b>EqualityContract</b>: a protected virtual property returning <code>typeof(Person)</code>. <code>Equals</code> checks it so that a <code>Person</code> and a derived <code>Employee</code> with the same Name and Age are <i>not</i> equal.</li>
<li><b>Equals(Person? other)</b> compares each field with <code>EqualityComparer&lt;T&gt;.Default</code>; <code>GetHashCode</code> combines the fields' hashes. Fields of reference types such as arrays and lists use <b>reference</b> equality.</li>
<li><b>Clone</b>: an unspeakable virtual <code>&lt;Clone&gt;$()</code> method calls the protected copy constructor <code>Person(Person original)</code>; you may declare your own copy constructor to deep-copy specific fields.</li>
<li><b>ToString</b> calls a virtual <code>PrintMembers(StringBuilder)</code>; override it to hide sensitive fields (passwords) from logs.</li>
<li><b>Inheritance</b>: records can inherit only from records. <code>sealed</code> records let the JIT devirtualise equality.</li>
<li><b>record struct</b> equality is generated too (no reflection), which makes record structs much faster dictionary keys than plain structs with the default <code>ValueType.Equals</code>. Plain <code>record struct</code> positional properties are mutable — prefer <code>readonly record struct</code>.</li>
<li><b>Serialization</b>: System.Text.Json supports records and constructor parameters directly; EF Core prefers classes for entities (change tracking needs identity), but records work well for owned value objects.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI turns classes into records eagerly — great for DTOs, harmful for entities. <b>Use AI as a partner:</b> "which of these types are values and which are entities?" and "generate tests proving equality and with semantics". <b>Where AI goes wrong:</b> records holding mutable lists that are expected to compare by contents, <code>record struct</code> without <code>readonly</code>, logging records that print secrets through ToString, and using records as EF entities. <b>What you must still own:</b> the value-vs-identity decision and deep vs shallow immutability.</p>`
  });

  /* ======================================================================
     TOPIC 6 — Equality
     ====================================================================== */
  topics.push({
    title: 'Equality: ==, Equals, GetHashCode, IEquatable and ReferenceEquals',
    analogy: R`<p>Are two <b>banknotes</b> "the same"? A shopkeeper says yes if they have the same value (value equality). A detective tracking a stolen note says no unless it is <b>the very same piece of paper</b> with the same serial number (reference equality). C# lets each type decide which question <code>Equals</code> answers. And a <b>hash code</b> is like sorting notes into drawers by their value: equal notes must always land in the same drawer, or nobody will ever find them again.</p>`,
    explain: R`<h4>🟢 The four tools</h4>
${H.table(['Tool', 'Default for classes', 'Default for structs', 'Records'], [
  ['<code>ReferenceEquals(a, b)</code>', 'same object?', 'always false (boxes copies)', 'same object?'],
  ['<code>a.Equals(b)</code>', 'reference equality', 'field-by-field (reflection, slow)', 'value equality'],
  ['<code>a == b</code>', 'reference equality (unless overloaded)', 'compile error unless defined', 'value equality'],
  ['<code>GetHashCode()</code>', 'identity-based', 'based on fields', 'based on all fields']
])}
<p>Exceptions you already know: <code>string</code> overloads <code>==</code> and <code>Equals</code> to compare contents; numeric types compare values.</p>
<h4>The contract</h4>
<ol>
<li><b>Reflexive, symmetric, transitive</b>: a.Equals(a); a.Equals(b) ⇔ b.Equals(a); and chains hold.</li>
<li><b>Equal objects must have equal hash codes.</b> (Unequal objects may collide.) Break this and <code>Dictionary</code>/<code>HashSet</code> silently fail to find keys.</li>
<li><code>Equals(null)</code> returns false and never throws.</li>
<li>Hash codes of keys must not change while the object is in a hash-based collection — so equality should use <b>immutable</b> fields.</li>
</ol>
<h4>Implementing value equality on a class (when not using a record)</h4>
<pre>public sealed class Point : IEquatable&lt;Point&gt;
{
    public int X { get; }  public int Y { get; }
    public Point(int x, int y) { X = x; Y = y; }
    public bool Equals(Point? other) =&gt; other is not null &amp;&amp; X == other.X &amp;&amp; Y == other.Y;
    public override bool Equals(object? obj) =&gt; Equals(obj as Point);
    public override int GetHashCode() =&gt; HashCode.Combine(X, Y);
    public static bool operator ==(Point? a, Point? b) =&gt; a is null ? b is null : a.Equals(b);
    public static bool operator !=(Point? a, Point? b) =&gt; !(a == b);
}</pre>
<p>Override all of them together: <code>Equals(T)</code>, <code>Equals(object)</code>, <code>GetHashCode</code>, and <code>==</code>/<code>!=</code> if you want operator syntax. A record writes exactly this for you. Use <code>x is null</code> (never <code>x == null</code> inside your own <code>==</code>, which would recurse).</p>`,
    clues: [
      '"HashSet does not find an object I just added" → Equals/GetHashCode inconsistent, or a key mutated after insertion',
      '"override Equals" → also override GetHashCode (warning CS0659)',
      '"compare two objects by their values" → record, or implement IEquatable&lt;T&gt;',
      '"same instance?" → <code>ReferenceEquals</code> or <code>is</code> patterns',
      '"custom key comparison for a Dictionary" → <code>IEqualityComparer&lt;T&gt;</code>'
    ],
    code: [R`public sealed class Isbn : IEquatable<Isbn>
{
    public string Digits { get; }

    public Isbn(string text)
    {
        Digits = new string(text.Where(char.IsAsciiDigit).ToArray());   // normalise: "978-0-13" == "978013"
        if (Digits.Length != 13) throw new ArgumentException("ISBN-13 needs 13 digits", nameof(text));
    }

    public bool Equals(Isbn? other) => other is not null && Digits == other.Digits;
    public override bool Equals(object? obj) => obj is Isbn other && Equals(other);
    public override int GetHashCode() => Digits.GetHashCode();
    public static bool operator ==(Isbn? a, Isbn? b) => a is null ? b is null : a.Equals(b);
    public static bool operator !=(Isbn? a, Isbn? b) => !(a == b);
    public override string ToString() => Digits;
}

// A comparer lets a collection use a different notion of equality without changing the type.
public sealed class CaseInsensitiveName : IEqualityComparer<string>
{
    public bool Equals(string? a, string? b) => string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
    public int GetHashCode(string s) => StringComparer.OrdinalIgnoreCase.GetHashCode(s);
}`],
    codeTitle: ['Full value equality on a class + a custom comparer'],
    viz: {
      title: 'Why GetHashCode must agree with Equals',
      input: 'broken',
      inputLabel: 'Type "broken" (Equals only) or "fixed" (Equals + GetHashCode)',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (mode !== 'broken' && mode !== 'fixed') throw new Error('Type broken or fixed');
        var buckets = 4;
        function bucketsView(entries, hl) { var rows = []; for (var i = 0; i < buckets; i++) rows.push(['bucket ' + i, entries[i] || '(empty)']); return { type: 'table', label: 'HashSet&lt;Point&gt; internals (4 buckets)', columns: ['bucket', 'items'], rows: rows, hl: hl || {} }; }
        var h1 = mode === 'fixed' ? 3 : 1, h2 = mode === 'fixed' ? 3 : 2;
        var code = 'var set = new HashSet<Point>();\nset.Add(new Point(1, 2));          // object #1\nbool found = set.Contains(new Point(1, 2));   // object #2';
        var frames = [
          fr(mode === 'broken' ? 'Point overrides <code>Equals</code> (compares X and Y) but <b>not</b> <code>GetHashCode</code>, so each object gets an identity-based hash.' : 'Point overrides both: <code>GetHashCode() =&gt; HashCode.Combine(X, Y)</code>, so equal points produce equal hashes.', [cp(code, 1), bucketsView({})]),
          fr('<code>Add(#1)</code>: hash(#1) → bucket ' + h1 + '. The set stores it there.', [cp(code, 2, 'ok'), bucketsView((function () { var e = {}; e[h1] = 'Point(1,2) #1'; return e; })(), (function () { var h = {}; h[h1] = 'ok'; return h; })())]),
          fr('<code>Contains(#2)</code>: #2 is a different object with the same values. The set first computes hash(#2) → bucket <b>' + h2 + '</b>.' + (h1 !== h2 ? ' A different bucket, because the identity hash differs per object.' : ' The same bucket.'), [cp(code, 3), bucketsView((function () { var e = {}; e[h1] = 'Point(1,2) #1'; return e; })(), (function () { var h = {}; h[h2] = 'cur'; return h; })())])
        ];
        if (h1 !== h2) frames.push(fr('Bucket ' + h2 + ' is empty, so the set answers <b>false</b> without ever calling Equals. Equals says "equal", the hash says "look elsewhere" — the contract is broken.', [cp(code, 3, 'bad'), vp({ found: false }, { found: 'bad' })]));
        else frames.push(fr('In bucket 3 the set calls <code>Equals(#1, #2)</code> → X and Y match → <b>true</b>.', [cp(code, 3, 'ok'), vp({ found: true }, { found: 'ok' })]));
        frames.push(fr('Rule: <b>a.Equals(b) ⇒ a.GetHashCode() == b.GetHashCode()</b>. Records and <code>HashCode.Combine</code> make this easy. Also never mutate a field used in the hash while the object is inside a set or dictionary key.', [tx(mode === 'broken' ? 'Fix: override GetHashCode with HashCode.Combine(X, Y) — or make Point a record.' : 'Consistent Equals and GetHashCode: lookups work.')]));
        return frames;
      }
    },
    examples: [
      { title: '== on classes, strings and records', html: R`<p>The same operator answers different questions depending on the type.</p>`, code: R`public class PClass { public int X; }
public record PRecord(int X);

static class Demo
{
    public static void Run()
    {
        Console.WriteLine(new PClass { X = 1 } == new PClass { X = 1 });    // False: references
        Console.WriteLine(new PRecord(1) == new PRecord(1));                // True: values
        string s1 = "hi", s2 = string.Concat("h", "i");
        Console.WriteLine(s1 == s2);                                       // True: contents
        Console.WriteLine((object)s1 == (object)s2);                       // False: reference compare on object
    }
}` },
      { title: 'Mutable key: the lost entry', html: R`<p>Changing a field that feeds the hash after inserting the object strands it in the wrong bucket.</p>`, code: R`public class Key
{
    public int Id;
    public override bool Equals(object? o) => o is Key k && k.Id == Id;
    public override int GetHashCode() => Id;
}

static class Demo
{
    public static void Run()
    {
        var k = new Key { Id = 1 };
        var set = new HashSet<Key> { k };
        k.Id = 2;                                         // hash changed while inside the set
        Console.WriteLine(set.Contains(k));               // False (almost always)
        Console.WriteLine(set.Count);                     // 1: the entry is stuck
    }
}` },
      { title: 'IEqualityComparer for a different notion of equality', html: R`<p>Keep the type unchanged and give the collection its own comparer, e.g. case-insensitive keys.</p>`, code: R`var users = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
{
    ["Alice"] = 1
};
Console.WriteLine(users.ContainsKey("ALICE"));   // True` }
    ],
    deepDive: R`<h4>🟣 Corners and performance</h4>
<ul>
<li><b>Operators are static, Equals is virtual.</b> <code>==</code> is chosen at compile time from the <i>static</i> types: comparing two <code>object</code> variables holding strings uses reference equality even though both are strings. <code>Equals</code> dispatches at run time.</li>
<li><b>Struct default equality</b>: <code>ValueType.Equals</code> uses a fast bitwise compare only when the struct has no reference fields and no padding; otherwise it uses reflection and boxes. Always implement <code>IEquatable&lt;T&gt;</code> on structs used as keys (or use <code>record struct</code>).</li>
<li><b>EqualityComparer&lt;T&gt;.Default</b> picks <code>IEquatable&lt;T&gt;.Equals</code> when available, avoiding boxing — this is what <code>Dictionary</code>, <code>List.Contains</code> and LINQ <code>Distinct</code> use.</li>
<li><b>HashCode.Combine</b> uses a randomised seed per process (like string hashes), so hash codes are not stable across runs — never persist them.</li>
<li><b>Floating point</b>: <code>double.NaN == double.NaN</code> is false, but <code>double.NaN.Equals(double.NaN)</code> is true (so NaN can be a dictionary key). <code>0.0 == -0.0</code> is true.</li>
<li><b>Inheritance and equality</b> is hard: a derived class adding a field breaks symmetry if the base compares only base fields. Seal classes with value equality, or compare runtime types (records do, with EqualityContract).</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI can generate complete equality members in one go, and IDEs offer "Generate Equals and GetHashCode". <b>Use AI as a partner:</b> ask for property-based tests of the contract (reflexive, symmetric, hash consistency). <b>Where AI goes wrong:</b> overriding Equals without GetHashCode, hashing mutable fields, using <code>==</code> inside an <code>operator ==</code> (infinite recursion), and comparing different-type objects as equal. <b>What you must still own:</b> deciding what "equal" means in your domain, and preferring records so the code is generated correctly.</p>`
  });

  /* ======================================================================
     TOPIC 7 — readonly structs
     ====================================================================== */
  topics.push({
    title: 'readonly struct, readonly Members & Defensive Copies',
    analogy: R`<p>A <b>laminated card</b>: everyone can read it, nobody can write on it, and because of that you can hand it to anyone without making a photocopy first. A non-laminated card is risky: before giving it to a stranger who promised only to <i>read</i> it, a careful clerk makes a photocopy, just in case — that is a <b>defensive copy</b>, and it costs time. Marking a struct <code>readonly</code> laminates it: the compiler knows nothing can change it and skips the photocopies.</p>`,
    explain: R`<h4>🟢 Mutable structs are a trap</h4>
<pre>struct Counter { public int Value; public void Increment() =&gt; Value++; }
var list = new List&lt;Counter&gt; { new Counter() };
// list[0].Increment();   // increments a COPY returned by the indexer, then throws it away (CS1612 only for field writes)
var dict = new Dictionary&lt;string, Counter&gt;();
foreach (var c in new[] { new Counter() }) c.Increment();   // foreach variable is a copy too</pre>
<p>Because structs copy so easily, mutating methods often operate on a temporary copy and the change silently disappears. The fix: make structs <b>immutable</b>.</p>
<h4>readonly struct</h4>
<pre>public readonly struct Money
{
    public decimal Amount { get; }      // all fields/auto-properties must be readonly / get-only / init
    public string Currency { get; }
    public Money(decimal amount, string currency) { Amount = amount; Currency = currency; }
    public Money Add(decimal x) =&gt; new(Amount + x, Currency);   // returns a new value
}</pre>
<p>The compiler enforces that no member modifies state (CS8340 for a non-readonly field). In return, it can pass the struct by reference (<code>in</code>) and call members on <code>readonly</code> fields without copying.</p>
<h4>readonly members</h4>
<p>On a non-readonly struct you can mark individual methods <code>readonly</code> (C# 8): <code>public readonly double Length() =&gt; Math.Sqrt(X * X + Y * Y);</code>. The compiler checks they do not mutate and avoids copies when calling them.</p>
<h4>When does a defensive copy happen?</h4>
${H.table(['Situation', 'Non-readonly struct', 'readonly struct'], [
  ['Calling a method on an <code>in</code> parameter', 'hidden copy first', 'no copy'],
  ['Calling a method on a <code>readonly</code> field', 'hidden copy first', 'no copy'],
  ['Calling a method on a <code>ref readonly</code> return', 'hidden copy first', 'no copy'],
  ['Reading a field', 'no copy', 'no copy']
])}`,
    clues: [
      '"my struct change disappeared" → it was made on a copy (indexer, foreach, property, readonly field)',
      '"small immutable value type" → <code>readonly struct</code> or <code>readonly record struct</code>',
      '"pass a large struct by in without copies" → it must be readonly',
      '"CS1612: cannot modify the return value" → the indexer/property returned a copy',
      '"mutable struct in a List or Dictionary" → redesign as immutable'
    ],
    code: [R`public readonly struct Vector2
{
    public double X { get; }
    public double Y { get; }
    public Vector2(double x, double y) { X = x; Y = y; }

    public double Length => Math.Sqrt(X * X + Y * Y);
    public Vector2 Scale(double k) => new(X * k, Y * k);            // returns a new value
    public static Vector2 operator +(Vector2 a, Vector2 b) => new(a.X + b.X, a.Y + b.Y);
    public override string ToString() => $"({X}, {Y})";
}

public struct Accumulator                      // not readonly: has mutating members
{
    private long _sum;
    private int _count;
    public void Add(int x) { _sum += x; _count++; }
    public readonly double Average => _count == 0 ? 0 : (double)_sum / _count;   // readonly member
}

public static class Physics
{
    public static double Dot(in Vector2 a, in Vector2 b) => a.X * b.X + a.Y * b.Y;   // no copies: Vector2 is readonly
}`],
    codeTitle: ['readonly struct, readonly member, in parameters'],
    viz: {
      title: 'The vanishing increment (mutable struct in a List)',
      gen: function () {
        var code = 'struct Counter { public int Value; public void Increment() => Value++; }\nvar list = new List<Counter> { new Counter() };\nlist[0].Increment();\nConsole.WriteLine(list[0].Value);\nvar arr = new Counter[1];\narr[0].Increment();\nConsole.WriteLine(arr[0].Value);';
        return [
          fr('A <b>mutable</b> struct with an <code>Increment</code> method. The list stores one Counter with Value = 0 inside its internal array.', [cp(code, 2), vp({ 'list._items[0].Value': 0 }, {}, 'Inside the List')]),
          fr('<code>list[0]</code> calls the indexer <code>get_Item(0)</code>, which <b>returns a copy</b> of the element into a hidden temporary.', [cp(code, 3, 'cur'), vp({ 'list._items[0].Value': 0, 'temp.Value': 0 }, { 'temp.Value': 'cur' }, 'Inside the List / hidden temp')]),
          fr('<code>Increment()</code> runs on the <b>temporary</b>: temp.Value becomes 1. The element in the list is untouched. No error, no warning (methods are allowed on temporaries).', [cp(code, 3, 'bad'), vp({ 'list._items[0].Value': 0, 'temp.Value': 1 }, { 'temp.Value': 'bad' })]),
          fr('Prints <b>0</b>. The increment vanished with the temporary.', [cp(code, 4, 'bad'), vp({ output: 0 }, { output: 'bad' })]),
          fr('Arrays are different: <code>arr[0]</code> is the element itself (a variable), so the method runs on the real element.', [cp(code, 6, 'ok'), vp({ 'arr[0].Value': 1 }, { 'arr[0].Value': 'ok' })]),
          fr('Prints <b>1</b>. Lesson: make structs immutable (<code>readonly struct</code>) so "modify" always means "create a new value and store it back": <code>list[0] = list[0].Incremented();</code>', [cp(code, 7, 'ok'), tx('readonly struct → the bug cannot be written, because Increment would not compile.')])
        ];
      }
    },
    examples: [
      { title: 'Storing the new value back', html: R`<p>With an immutable struct, every "change" returns a new value, and you store it where it belongs. Nothing can vanish.</p>`, code: R`public readonly record struct Score(int Points)
{
    public Score Add(int p) => new(Points + p);
}

static class Demo
{
    public static void Run()
    {
        var scores = new List<Score> { new(10) };
        scores[0] = scores[0].Add(5);       // explicit store-back
        Console.WriteLine(scores[0].Points); // 15
    }
}` },
      { title: 'readonly field + mutable struct = silent copy', html: R`<p>Calling a mutating method on a <code>readonly</code> field of a mutable struct operates on a copy, so the field never changes.</p>`, code: R`public struct Tally { public int N; public void Bump() => N++; }

public class Holder
{
    private readonly Tally _t;
    public int BumpTwice() { _t.Bump(); _t.Bump(); return _t.N; }   // returns 0: each call bumps a copy
}` },
      { title: 'Built-in readonly structs', html: R`<p><code>DateTime</code>, <code>TimeSpan</code>, <code>Guid</code>, <code>decimal</code> and <code>ValueTuple</code>-based records are immutable values. That is why <code>date.AddDays(1)</code> returns a new date instead of changing <code>date</code>.</p>`, code: R`var d = new DateTime(2026, 10, 25);
d.AddDays(1);                        // result discarded: d unchanged
var next = d.AddDays(1);
Console.WriteLine($"{d:yyyy-MM-dd} {next:yyyy-MM-dd}");   // 2026-10-25 2026-10-26` }
    ],
    deepDive: R`<h4>🟣 Deeper</h4>
<ul>
<li><b>How the compiler decides</b>: for a readonly variable (an <code>in</code> parameter, a <code>readonly</code> field accessed outside a constructor, a <code>ref readonly</code> local), calling a non-readonly member requires a copy so the original cannot change. Marking the struct or the member <code>readonly</code> lets the compiler pass <code>this</code> by reference instead.</li>
<li><b>Measuring it</b>: a 64-byte non-readonly struct passed with <code>in</code> and used through a method can be <i>slower</i> than passing by value because of the hidden copy. Analyzers (IDE0251 "make member readonly") help.</li>
<li><b>ref struct</b> (e.g. <code>Span&lt;T&gt;</code>) is a different concept: a struct that may live only on the stack. <code>readonly ref struct</code> combines both (<code>ReadOnlySpan&lt;T&gt;</code>). Covered in module 8.</li>
<li><b>Fields of readonly structs</b> may still hold references to mutable objects; readonly is shallow, as everywhere in C#.</li>
<li><b>with on structs</b> (C# 10): any struct, not just records, supports <code>var b = a with { X = 3 };</code>, which copies and sets — convenient for immutable structs with init properties.</li>
<li><b>Thread safety</b>: immutable structs are naturally thread-safe; but a struct larger than the CPU word can be <i>torn</i> if one thread writes a field holding it while another reads (e.g. a 16-byte decimal field) — immutability of the type does not make the variable's assignment atomic.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI frequently generates mutable structs with setters because they look like classes. <b>Use AI as a partner:</b> "convert this struct to a readonly struct and update the callers to store new values back". <b>Where AI goes wrong:</b> mutable structs inside collections, <code>in</code> parameters on non-readonly structs, and assuming <code>readonly</code> fields make referenced objects immutable. <b>What you must still own:</b> the habit of designing value types as immutable from the start.</p>`
  });

  /* ---------- guided problems ---------- */
  topics[0].problems = [{
    title: 'An Immutable Point Struct: Translate Returns a New Value',
    level: 'Easy', tags: ['struct', 'value semantics', 'immutability'], companies: ['Unity', 'Microsoft'],
    statement: R`<p>Write <code>public readonly struct Point2</code> with a constructor <code>Point2(int x, int y)</code>, get-only properties <code>X</code> and <code>Y</code>, and a method <code>Point2 Translate(int dx, int dy)</code> that returns a <b>new</b> point. The test harness keeps the starting point, applies a list of moves by storing each result back (<code>cur = cur.Translate(…)</code>) and returns <code>[start.X, start.Y, cur.X, cur.Y]</code>.</p>`,
    constraints: R`Up to 1000 moves; coordinates stay within ±10<sup>6</sup>.`,
    example: R`<p>Start (0, 0), moves [1, 2] and [3, 4] → <span class="c-g">[0, 0, 4, 6]</span>: the starting point is unchanged because every move created a new value.</p>`,
    brute: { why: R`<p>A mutable struct with a <code>void Move(int dx, int dy)</code> that changes its own fields looks simpler, but every copy (method argument, list element, foreach variable, property getter) silently receives the move instead of the original — and the starting point is lost when you do mutate it in place.</p>`, code: R`public struct MutablePoint
{
    public int X, Y;
    public MutablePoint(int x, int y) { X = x; Y = y; }
    public void Move(int dx, int dy) { X += dx; Y += dy; }   // changes whichever copy it is called on
}` },
    mcq: { q: 'Why make <code>Translate</code> return a value instead of changing the fields?', options: ['Structs cannot have void methods', 'A readonly struct cannot mutate itself, and returning a value makes every change explicit', 'Returning is faster', 'To allow inheritance'], answer: 1, explain: 'Immutable value types cannot suffer lost updates on copies; the caller decides where to store the new value.' },
    hints: [
      R`<p>Hint 1: mark the struct <code>readonly</code>; properties are <code>{ get; }</code>.</p>`,
      R`<p>Hint 2: <code>public Point2 Translate(int dx, int dy) =&gt; new(X + dx, Y + dy);</code></p>`,
      R`<p>Hint 3: an empty move list leaves the current point equal to the start.</p>`
    ],
    tests: { sig: 'int int int[][] -> int[]', fn: 'run', harness: { csharp: 'public static class Check { public static int[] Run(int x, int y, int[][] moves) { var start = new Point2(x, y); var cur = start; foreach (var m in moves) cur = cur.Translate(m[0], m[1]); return [start.X, start.Y, cur.X, cur.Y]; } }' }, cases: [
      [[0, 0, [[1, 2], [3, 4]]], [0, 0, 4, 6]], [[5, -5, []], [5, -5, 5, -5]], [[1, 1, [[-1, -1]]], [1, 1, 0, 0]], [[10, 20, [[0, 0], [0, 0]]], [10, 20, 10, 20]],
      [[-3, 7, [[3, -7], [1, 1]]], [-3, 7, 1, 1]], [[100, 100, [[-50, 25], [-50, 25], [0, -150]]], [100, 100, 0, 0]], [[0, 0, { $rep: [1, -1], n: 1000 }], [0, 0, 1000, -1000]]
    ] },
    solution: {
      approach: R`<p>A small <code>readonly struct</code>: two get-only properties set by the constructor and a method that builds a new value. Copies can never diverge from what you expect, because nothing can change in place.</p>`,
      code: R`public readonly struct Point2
{
    public int X { get; }
    public int Y { get; }

    public Point2(int x, int y) { X = x; Y = y; }

    public Point2 Translate(int dx, int dy) => new(X + dx, Y + dy);   // new value; this is untouched

    public override string ToString() => $"({X}, {Y})";
}`,
      dry: { head: ['step', 'cur before', 'move', 'cur after', 'start'], rows: [['1', '(0, 0)', '(1, 2)', '(1, 2)', '(0, 0)'], ['2', '(1, 2)', '(3, 4)', '(4, 6)', '(0, 0)']] },
      complexity: R`<p>O(1) per move; the struct is 8 bytes and lives inline in its variable.</p>`,
      followUps: ['Make it a readonly record struct and compare the generated members', 'Add operator + for two points']
    }
  }];

  topics[1].problems = [{
    title: 'TimeOfDay: Validating and Chaining Constructors',
    level: 'Medium', tags: ['constructors', 'chaining', 'validation', 'factory'], companies: ['Microsoft', 'SAP', 'Oracle'],
    statement: R`<p>Write <code>public class TimeOfDay</code> with a constructor <code>TimeOfDay(int hours, int minutes = 0, int seconds = 0)</code> that throws <code>ArgumentOutOfRangeException</code> unless 0 ≤ hours ≤ 23 and 0 ≤ minutes, seconds ≤ 59; a get-only property <code>TotalSeconds</code>; a static factory <code>FromSeconds(int totalSeconds)</code> that wraps any value into one day (−1 → 23:59:59); and <code>ToString()</code> returning <code>HH:mm:ss</code>. The harness creates times in four ways and prints them, or <code>invalid</code> when the constructor throws.</p>`,
    constraints: R`Any int arguments.`,
    example: R`<p><code>new TimeOfDay(13, 5, 9)</code> → <span class="c-g">13:05:09</span>; <code>new TimeOfDay(7, minutes: 30)</code> → <span class="c-g">07:30:00</span>; <code>FromSeconds(-1)</code> → <span class="c-g">23:59:59</span>; <code>new TimeOfDay(24)</code> → <span class="c-r">invalid</span>.</p>`,
    brute: { why: R`<p>Public settable fields let anyone build 25:99:99. Copy-pasting the range checks into several constructors invites one copy to drift out of date. One validating constructor plus a factory that funnels into it keeps a single source of truth.</p>`, code: R`public class LooseTime
{
    public int Hours, Minutes, Seconds;            // no validation at all
    public override string ToString() => $"{Hours:D2}:{Minutes:D2}:{Seconds:D2}";
}` },
    mcq: { q: 'Why is the seconds-based creation a static factory instead of a constructor <code>TimeOfDay(int totalSeconds)</code>?', options: ['Constructors cannot take one int', 'It would compete with <code>TimeOfDay(int hours, …)</code>: <code>new TimeOfDay(7)</code> would mean seconds, not hours', 'Factories are faster', 'Static methods can be virtual'], answer: 1, explain: 'Overload resolution prefers a candidate that needs no default arguments, so a one-int constructor would silently capture new TimeOfDay(7). A named factory removes the ambiguity for readers and the compiler.' },
    hints: [
      R`<p>Hint 1: validate each argument with <code>ArgumentOutOfRangeException.ThrowIfLessThan</code> / <code>ThrowIfGreaterThan</code> (.NET 8) or explicit checks.</p>`,
      R`<p>Hint 2: store a single field <code>TotalSeconds = hours * 3600 + minutes * 60 + seconds</code>.</p>`,
      R`<p>Hint 3: the factory normalises with <code>((s % 86400) + 86400) % 86400</code> and calls the constructor with the split parts.</p>`
    ],
    tests: { sig: 'int int int int -> string', fn: 'make', harness: { csharp: 'public static class Check { public static string Make(int mode, int a, int b, int c) { try { return (mode switch { 0 => new TimeOfDay(a, b, c), 1 => new TimeOfDay(a), 2 => new TimeOfDay(a, minutes: b), _ => TimeOfDay.FromSeconds(a) }).ToString(); } catch (ArgumentOutOfRangeException) { return "invalid"; } } }' }, cases: [
      [[0, 13, 5, 9], '13:05:09'], [[1, 7, 0, 0], '07:00:00'], [[2, 7, 30, 0], '07:30:00'], [[0, 24, 0, 0], 'invalid'], [[0, 10, 60, 0], 'invalid'],
      [[3, 3661, 0, 0], '01:01:01'], [[3, -1, 0, 0], '23:59:59'], [[3, 86400, 0, 0], '00:00:00'], [[0, 23, 59, 59], '23:59:59'], [[0, -1, 0, 0], 'invalid'], [[3, -2147483648, 0, 0], '20:45:52']
    ] },
    solution: {
      approach: R`<p>One validating constructor holds all the rules. Optional parameters cover the common shapes, and the factory normalises a raw second count and delegates to the constructor, so every instance passes the same checks.</p>`,
      code: R`public class TimeOfDay
{
    public int TotalSeconds { get; }

    public TimeOfDay(int hours, int minutes = 0, int seconds = 0)
    {
        if (hours is < 0 or > 23) throw new ArgumentOutOfRangeException(nameof(hours));
        if (minutes is < 0 or > 59) throw new ArgumentOutOfRangeException(nameof(minutes));
        if (seconds is < 0 or > 59) throw new ArgumentOutOfRangeException(nameof(seconds));
        TotalSeconds = hours * 3600 + minutes * 60 + seconds;
    }

    public static TimeOfDay FromSeconds(int totalSeconds)
    {
        int s = ((totalSeconds % 86400) + 86400) % 86400;      // wrap into one day, safe for int.MinValue
        return new TimeOfDay(s / 3600, s % 3600 / 60, s % 60);
    }

    public override string ToString() => $"{TotalSeconds / 3600:D2}:{TotalSeconds % 3600 / 60:D2}:{TotalSeconds % 60:D2}";
}`,
      dry: { head: ['call', 'checks', 'TotalSeconds', 'ToString'], rows: [['new(13, 5, 9)', 'all pass', '47109', '13:05:09'], ['FromSeconds(-1)', 's = 86399', '86399', '23:59:59'], ['new(24)', '<span class="c-r">hours &gt; 23</span>', '—', 'invalid']] },
      complexity: R`<p>O(1) for every operation.</p>`,
      followUps: ['Add <code>AddMinutes(int)</code> returning a new TimeOfDay', 'Convert it to a readonly record struct']
    }
  }];

  topics[4].problems = [{
    title: 'Deduplicate Events with a Record Key',
    level: 'Easy', tags: ['records', 'value equality', 'HashSet'], companies: ['Amazon', 'Datadog', 'Splunk'],
    statement: R`<p>Declare <code>public record Event(string User, string Action, int Minute);</code>. The harness builds one <code>Event</code> per index from three parallel arrays, adds them to a <code>HashSet&lt;Event&gt;</code> and returns the number of distinct events. Your job is the record declaration — the value equality it generates does the rest.</p>`,
    constraints: R`Up to 10<sup>5</sup> events; comparisons are case-sensitive.`,
    example: R`<p>users ["a","a","a"], actions ["x","y","x"], minutes [1,1,2] → <span class="c-g">3</span>. Two events with the same three values count once.</p>`,
    brute: { why: R`<p>With a plain class, two <code>new Event("a", "x", 1)</code> objects are different keys (reference equality), so nothing is deduplicated. Building a string key like <code>$"{user}|{action}|{minute}"</code> works but breaks if a value contains the separator.</p>`, code: R`public class EventClass        // reference equality: every instance is distinct
{
    public string User = "", Action = "";
    public int Minute;
}` },
    mcq: { q: 'Which members does <code>record Event(...)</code> generate that make the HashSet work?', options: ['Only a constructor', '<code>Equals</code> and <code>GetHashCode</code> based on all three values', 'A finalizer', '<code>IComparable</code>'], answer: 1, explain: 'HashSet uses GetHashCode to find a bucket and Equals to confirm a match; records generate both from every field.' },
    hints: [
      R`<p>Hint 1: a positional record is one line.</p>`,
      R`<p>Hint 2: generated equality compares User, Action and Minute with their default comparers (ordinal for strings).</p>`,
      R`<p>Hint 3: compare with a class and see the count stay at the number of inputs.</p>`
    ],
    tests: { sig: 'string[] string[] int[] -> int', fn: 'dedupe', harness: { csharp: 'public static class Check { public static int Dedupe(string[] users, string[] actions, int[] minutes) { var set = new HashSet<Event>(); for (int i = 0; i < users.Length; i++) set.Add(new Event(users[i], actions[i], minutes[i])); return set.Count; } }' }, cases: [
      [[['a', 'a'], ['login', 'login'], [1, 1]], 1], [[['a', 'b'], ['x', 'x'], [1, 1]], 2], [[[], [], []], 0], [[['a', 'a', 'a'], ['x', 'y', 'x'], [1, 1, 2]], 3],
      [[['A', 'a'], ['x', 'x'], [5, 5]], 2], [[['u', 'u', 'u', 'u'], ['p', 'p', 'p', 'p'], [3, 3, 3, 3]], 1], [[{ $rep: 'bot', n: 5000 }, { $rep: 'ping', n: 5000 }, { $range: [0, 5000] }], 5000]
    ] },
    solution: {
      approach: R`<p>A positional record supplies value-based <code>Equals</code>/<code>GetHashCode</code>, so equal events collapse in any hash-based collection.</p>`,
      code: R`public record Event(string User, string Action, int Minute);`,
      dry: { head: ['i', 'event', 'already in set?', 'count'], rows: [['0', '(a, x, 1)', 'no', '1'], ['1', '(a, y, 1)', 'no', '2'], ['2', '(a, x, 2)', 'no', '3']] },
      complexity: R`<p>O(n) expected time for n insertions; O(n) memory.</p>`,
      followUps: ['Make it a readonly record struct and compare allocations', 'Deduplicate case-insensitively on User with a custom IEqualityComparer']
    }
  }];

  topics[5].problems = [{
    title: 'Point with Full Value Equality (Class)',
    level: 'Medium', tags: ['equality', 'IEquatable', 'GetHashCode', 'operators'], companies: ['Microsoft', 'Google', 'JetBrains'],
    statement: R`<p>Write <code>public sealed class Point : IEquatable&lt;Point&gt;</code> with a constructor <code>Point(int x, int y)</code>, get-only <code>X</code>/<code>Y</code>, and consistent <code>Equals(Point?)</code>, <code>Equals(object?)</code>, <code>GetHashCode()</code>, <code>==</code> and <code>!=</code> — without using a record. The harness returns <code>[number of distinct points in a HashSet, 1 if the first and last points are == else 0]</code> (0 when fewer than two points).</p>`,
    constraints: R`Up to 10<sup>5</sup> points; |x|, |y| ≤ 10<sup>9</sup>.`,
    example: R`<p>[[1,2],[1,2],[2,1]] → <span class="c-g">[2, 0]</span>; [[5,5],[5,5],[5,5]] → <span class="c-g">[1, 1]</span>.</p>`,
    brute: { why: R`<p>Overriding only <code>Equals</code> leaves the identity-based <code>GetHashCode</code>: equal points land in different buckets and the HashSet keeps duplicates. Writing <code>a == b</code> inside your own <code>operator ==</code> recurses forever.</p>`, code: R`public sealed class HalfPoint
{
    public int X { get; } public int Y { get; }
    public HalfPoint(int x, int y) { X = x; Y = y; }
    public override bool Equals(object? o) => o is HalfPoint p && p.X == X && p.Y == Y;   // no GetHashCode: CS0659
}` },
    mcq: { q: 'Inside <code>operator ==(Point? a, Point? b)</code>, how do you test a for null safely?', options: ['<code>a == null</code>', '<code>a is null</code>', '<code>a.Equals(null)</code>', '<code>Equals(a, null)</code> always'], answer: 1, explain: 'a == null would call the operator being defined (infinite recursion). The is null pattern never calls user operators.' },
    hints: [
      R`<p>Hint 1: <code>Equals(Point? other) =&gt; other is not null &amp;&amp; X == other.X &amp;&amp; Y == other.Y;</code></p>`,
      R`<p>Hint 2: <code>GetHashCode() =&gt; HashCode.Combine(X, Y);</code> and <code>Equals(object?) =&gt; Equals(obj as Point);</code></p>`,
      R`<p>Hint 3: <code>==</code>: <code>a is null ? b is null : a.Equals(b)</code>; <code>!=</code> negates it. Seal the class so subclasses cannot break symmetry.</p>`
    ],
    tests: { sig: 'int[][] -> int[]', fn: 'probe', harness: { csharp: 'public static class Check { public static int[] Probe(int[][] pts) { var set = new HashSet<Point>(); foreach (var p in pts) set.Add(new Point(p[0], p[1])); int same = pts.Length >= 2 && new Point(pts[0][0], pts[0][1]) == new Point(pts[^1][0], pts[^1][1]) ? 1 : 0; return [set.Count, same]; } }' }, cases: [
      [[[[1, 2], [1, 2], [2, 1]]], [2, 0]], [[[[0, 0]]], [1, 0]], [[[]], [0, 0]], [[[[5, 5], [5, 5], [5, 5]]], [1, 1]],
      [[[[-1, 3], [3, -1], [-1, 3]]], [2, 1]], [[[[1, 0], [0, 1], [1, 1], [0, 0]]], [4, 0]], [[{ $rep: [7, 7], n: 1000 }], [1, 1]], [[[[1000000000, -1000000000], [1000000000, -1000000000]]], [1, 1]]
    ] },
    solution: {
      approach: R`<p>Implement the full set together: typed <code>Equals</code> does the comparison, the object overload delegates to it, <code>GetHashCode</code> combines the same fields, and the operators handle nulls with <code>is null</code>. Sealing keeps equality symmetric.</p>`,
      code: R`public sealed class Point : IEquatable<Point>
{
    public int X { get; }
    public int Y { get; }

    public Point(int x, int y) { X = x; Y = y; }

    public bool Equals(Point? other) => other is not null && X == other.X && Y == other.Y;
    public override bool Equals(object? obj) => Equals(obj as Point);
    public override int GetHashCode() => HashCode.Combine(X, Y);

    public static bool operator ==(Point? a, Point? b) => a is null ? b is null : a.Equals(b);
    public static bool operator !=(Point? a, Point? b) => !(a == b);

    public override string ToString() => $"({X}, {Y})";
}`,
      dry: { head: ['point', 'hash bucket (same for equal points)', 'Equals with existing?', 'set size'], rows: [['(1,2)', 'h(1,2)', '—', '1'], ['(1,2)', 'h(1,2)', '<span class="c-g">yes</span> → not added', '1'], ['(2,1)', 'h(2,1)', 'no', '2']] },
      complexity: R`<p>O(1) per comparison and hash; O(n) expected for n insertions.</p>`,
      followUps: ['Replace the class with <code>public record Point(int X, int Y);</code> and compare the generated code on sharplab.io', 'Implement IComparable&lt;Point&gt; for sorting by X then Y']
    }
  }];

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Rectangle with Validated Properties',
    level: 'Easy', tags: ['properties', 'validation', 'computed properties'], companies: ['Infosys', 'Microsoft'],
    statement: R`<p>Write <code>public class Rectangle</code> with a constructor <code>Rectangle(double width, double height)</code>, properties <code>Width</code> and <code>Height</code> whose setters throw <code>ArgumentOutOfRangeException</code> unless the value is positive, and computed properties <code>Area</code>, <code>Perimeter</code> and <code>IsSquare</code>. The harness prints <code>"{Area:F2} {Perimeter:F2} {IsSquare}"</code> (invariant culture) or <code>invalid</code> if construction throws.</p>`,
    constraints: R`Any doubles; 0 and negatives are invalid.`,
    example: R`<p><code>(3, 4)</code> → <span class="c-g">12.00 14.00 False</span>; <code>(0, 5)</code> → <span class="c-r">invalid</span>.</p>`,
    brute: { why: R`<p>Public fields accept any value, so a rectangle with width −1 exists and every computation on it is garbage. Validating only in the constructor still lets later assignments break the rule.</p>`, code: R`public class LooseRectangle
{
    public double Width, Height;                 // -1 is accepted
    public double Area() => Width * Height;
}` },
    mcq: { q: 'Where should the positive check live so it can never be bypassed?', options: ['Only in the constructor', 'In the property setters, with the constructor assigning through them', 'In Area', 'In ToString'], answer: 1, explain: 'If the constructor assigns through the validating setters, every path that changes Width or Height runs the same check.' },
    hints: [
      R`<p>Hint 1: backing fields <code>_width</code>, <code>_height</code> with a check in each <code>set</code>.</p>`,
      R`<p>Hint 2: the constructor assigns <code>Width = width; Height = height;</code> to reuse the checks.</p>`,
      R`<p>Hint 3: <code>public double Area =&gt; Width * Height;</code> — computed, never stored.</p>`
    ],
    tests: { sig: 'double double -> string', fn: 'rectCheck', harness: { csharp: 'public static class Check { public static string RectCheck(double w, double h) { try { var r = new Rectangle(w, h); return string.Create(System.Globalization.CultureInfo.InvariantCulture, $"{r.Area:F2} {r.Perimeter:F2} {r.IsSquare}"); } catch (ArgumentOutOfRangeException) { return "invalid"; } } }' }, cases: [
      [[3, 4], '12.00 14.00 False'], [[2.5, 2.5], '6.25 10.00 True'], [[0, 5], 'invalid'], [[-1, 2], 'invalid'], [[1000000, 1000000], '1000000000000.00 4000000.00 True'], [[0.1, 0.2], '0.02 0.60 False'], [[7, -0.5], 'invalid']
    ] },
    solution: {
      approach: R`<p>Validated setters guard the invariant; the constructor routes through them; derived values are expression-bodied properties.</p>`,
      code: R`public class Rectangle
{
    private double _width, _height;

    public Rectangle(double width, double height) { Width = width; Height = height; }

    public double Width
    {
        get => _width;
        set => _width = value > 0 ? value : throw new ArgumentOutOfRangeException(nameof(value), "width must be positive");
    }

    public double Height
    {
        get => _height;
        set => _height = value > 0 ? value : throw new ArgumentOutOfRangeException(nameof(value), "height must be positive");
    }

    public double Area => Width * Height;
    public double Perimeter => 2 * (Width + Height);
    public bool IsSquare => Width == Height;
}`,
      complexity: R`<p>O(1) for every member.</p>`,
      followUps: ['Make the type immutable with get-only properties and a WithWidth method', 'Compare IsSquare with a tolerance for computed sizes']
    }
  });

  practice.push({
    title: 'Book Record: Generated ToString, Equality and with',
    level: 'Easy', tags: ['records', 'with expression', 'ToString'], companies: ['Amazon', 'Thoughtworks'],
    statement: R`<p>Declare <code>public record Book(string Title, string Author, int Year);</code>. The harness returns four strings: the book's <code>ToString()</code>, the <code>ToString()</code> of <code>book with { Year = newYear }</code>, whether the book equals a fresh <code>new Book(...)</code> with the same values, and whether it equals the modified copy.</p>`,
    constraints: R`Short strings; any int years.`,
    example: R`<p><code>("Dune", "Herbert", 1965)</code>, newYear 1990 → <span class="c-g">["Book { Title = Dune, Author = Herbert, Year = 1965 }", "Book { Title = Dune, Author = Herbert, Year = 1990 }", "True", "False"]</span>.</p>`,
    brute: { why: R`<p>A hand-written class needs a constructor, three properties, Equals, GetHashCode, ==, !=, ToString and a copy method — about 40 lines that must stay in sync whenever a field is added. The record generates all of it from one line.</p>`, code: R`public class BookClass
{
    public string Title { get; }
    public string Author { get; }
    public int Year { get; }
    public BookClass(string title, string author, int year) { Title = title; Author = author; Year = year; }
    public BookClass WithYear(int year) => new(Title, Author, year);
    public override string ToString() => $"BookClass {{ Title = {Title}, Author = {Author}, Year = {Year} }}";
    // Equals, GetHashCode, == and != are still missing: reference equality by default.
}` },
    mcq: { q: 'What does <code>book with { Year = 1990 }</code> do to <code>book</code>?', options: ['Changes its Year', 'Nothing: it creates a new record with the other values copied', 'Throws because Year is init-only', 'Returns the same reference'], answer: 1, explain: 'with clones the record (copy constructor) and applies the init assignments to the clone.' },
    hints: [
      R`<p>Hint 1: one positional record line is the whole answer.</p>`,
      R`<p>Hint 2: generated ToString uses the pattern <code>TypeName { Prop = value, … }</code>.</p>`,
      R`<p>Hint 3: generated equality compares all three properties; the copy differs only when the year changes.</p>`
    ],
    tests: { sig: 'string string int int -> string[]', fn: 'describe', harness: { csharp: 'public static class Check { public static string[] Describe(string t, string a, int y, int newYear) { var b = new Book(t, a, y); var c = b with { Year = newYear }; return [b.ToString(), c.ToString(), (b == new Book(t, a, y)).ToString(), (b == c).ToString()]; } }' }, cases: [
      [['Dune', 'Herbert', 1965, 1990], ['Book { Title = Dune, Author = Herbert, Year = 1965 }', 'Book { Title = Dune, Author = Herbert, Year = 1990 }', 'True', 'False']],
      [['A', 'B', 1, 1], ['Book { Title = A, Author = B, Year = 1 }', 'Book { Title = A, Author = B, Year = 1 }', 'True', 'True']],
      [['', '', 0, -1], ['Book { Title = , Author = , Year = 0 }', 'Book { Title = , Author = , Year = -1 }', 'True', 'False']],
      [['C# in Depth', 'Skeet', 2019, 2019], ['Book { Title = C# in Depth, Author = Skeet, Year = 2019 }', 'Book { Title = C# in Depth, Author = Skeet, Year = 2019 }', 'True', 'True']],
      [['x y', 'z', 2000, 2001], ['Book { Title = x y, Author = z, Year = 2000 }', 'Book { Title = x y, Author = z, Year = 2001 }', 'True', 'False']],
      [['Q', 'R', -5, 5], ['Book { Title = Q, Author = R, Year = -5 }', 'Book { Title = Q, Author = R, Year = 5 }', 'True', 'False']]
    ] },
    solution: {
      approach: R`<p>The positional record generates properties, constructor, value equality, ToString and the clone used by <code>with</code>.</p>`,
      code: R`public record Book(string Title, string Author, int Year);`,
      complexity: R`<p>O(1) per operation (proportional to the number of fields).</p>`,
      followUps: ['Override PrintMembers to hide the author', 'Add a computed property that is excluded from equality — is it possible?']
    }
  });

  practice.push({
    title: 'Temperature with Static Factory Methods',
    level: 'Easy', tags: ['static members', 'factory methods', 'private constructor'], companies: ['Bosch', 'Siemens', 'Honeywell'],
    statement: R`<p>Write <code>public sealed class Temperature</code> that stores the value in kelvin behind a <b>private</b> constructor (throwing <code>ArgumentOutOfRangeException</code> below 0 K), with static factories <code>FromCelsius</code>, <code>FromFahrenheit</code>, <code>FromKelvin</code> and read-only properties <code>Celsius</code>, <code>Fahrenheit</code>, <code>Kelvin</code>. The harness converts a value with the given unit ("C", "F" or "K") and returns <code>[Celsius, Fahrenheit, Kelvin]</code>, or an empty array when the temperature is impossible.</p>`,
    constraints: R`|value| ≤ 10<sup>6</sup>. Use K = C + 273.15 and F = C × 9/5 + 32.`,
    example: R`<p><code>(-40, "F")</code> → <span class="c-g">[-40, -40, 233.15]</span>; <code>(-1, "K")</code> → <span class="c-r">[]</span>.</p>`,
    brute: { why: R`<p>Three public constructors cannot be overloaded on the same <code>double</code> parameter, and a single public constructor taking "a double" hides which unit is meant — the source of many unit bugs. Named factories make the unit explicit at every call.</p>`, code: R`public class AmbiguousTemperature
{
    public double Value;                               // celsius? fahrenheit? nobody knows
    public AmbiguousTemperature(double value) { Value = value; }
}` },
    mcq: { q: 'Why is the constructor private?', options: ['Private constructors are faster', 'So every instance is created through a factory that states the unit', 'C# requires it for static methods', 'To allow inheritance'], answer: 1, explain: 'Callers must write Temperature.FromFahrenheit(98.6): the unit is part of the name, and the single private constructor holds the validation.' },
    hints: [
      R`<p>Hint 1: store one field, <code>Kelvin</code>, and compute the others in getters.</p>`,
      R`<p>Hint 2: <code>public static Temperature FromCelsius(double c) =&gt; new(c + 273.15);</code></p>`,
      R`<p>Hint 3: Fahrenheit to Celsius: (f − 32) × 5 / 9.</p>`
    ],
    tests: { sig: 'double string -> double[]', fn: 'convert', cmp: 'float', harness: { csharp: 'public static class Check { public static double[] Convert(double v, string unit) { try { var t = unit switch { "C" => Temperature.FromCelsius(v), "F" => Temperature.FromFahrenheit(v), _ => Temperature.FromKelvin(v) }; return [t.Celsius, t.Fahrenheit, t.Kelvin]; } catch (ArgumentOutOfRangeException) { return []; } } }' }, cases: [
      [[0, 'C'], [0, 32, 273.15]], [[100, 'C'], [100, 212, 373.15]], [[32, 'F'], [0, 32, 273.15]], [[-40, 'F'], [-40, -40, 233.15]], [[0, 'K'], [-273.15, -459.67, 0]], [[-1, 'K'], []], [[-300, 'C'], []], [[98.6, 'F'], [37, 98.6, 310.15]]
    ] },
    solution: {
      approach: R`<p>A private constructor validates kelvin; factories translate each unit into kelvin; properties translate back. One representation, three views.</p>`,
      code: R`public sealed class Temperature
{
    public double Kelvin { get; }

    private Temperature(double kelvin)
    {
        if (kelvin < 0) throw new ArgumentOutOfRangeException(nameof(kelvin), "below absolute zero");
        Kelvin = kelvin;
    }

    public static Temperature FromKelvin(double k) => new(k);
    public static Temperature FromCelsius(double c) => new(c + 273.15);
    public static Temperature FromFahrenheit(double f) => new((f - 32) * 5 / 9 + 273.15);

    public double Celsius => Kelvin - 273.15;
    public double Fahrenheit => Celsius * 9 / 5 + 32;
}`,
      complexity: R`<p>O(1) for every factory and property.</p>`,
      followUps: ['Make it a readonly struct and add comparison operators', 'Add a ToString(string unit) with one decimal']
    }
  });

  practice.push({
    title: 'Ticket Numbers from a Static Counter',
    level: 'Easy', tags: ['static fields', 'static properties', 'constructors'], companies: ['Zomato', 'BookMyShow'],
    statement: R`<p>Write <code>public class Ticket</code>: every new ticket gets the next <code>Id</code> (1, 2, 3, …) from a static counter; a static property <code>Issued</code> reports how many tickets exist; a static method <code>ResetCounter()</code> starts numbering again. The harness resets, creates <code>n</code> tickets and returns their ids followed by <code>Ticket.Issued</code>.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>4</sup>; single-threaded.`,
    example: R`<p><code>n = 3</code> → <span class="c-g">[1, 2, 3, 3]</span>. The cases run one after another in the same process, so the reset matters.</p>`,
    brute: { why: R`<p>An instance counter field would be a separate copy inside every ticket, so every ticket would get id 1. The counter must belong to the type.</p>`, code: R`public class WrongTicket
{
    private int _next = 1;                 // one per object: every ticket gets 1
    public int Id { get; }
    public WrongTicket() { Id = _next++; }
}` },
    mcq: { q: 'Where does a static field live?', options: ['Inside each object', 'Once per type, shared by all instances', 'On the call stack', 'Only in static classes'], answer: 1, explain: 'There is exactly one copy of a static field per (closed) type, created before first use.' },
    hints: [
      R`<p>Hint 1: <code>private static int s_next = 1;</code> belongs to the type.</p>`,
      R`<p>Hint 2: constructor: <code>Id = s_next++;</code>; <code>Issued =&gt; s_next - 1</code>.</p>`,
      R`<p>Hint 3: <code>ResetCounter()</code> sets <code>s_next = 1</code>. For multi-threaded code you would use <code>Interlocked.Increment</code>.</p>`
    ],
    tests: { sig: 'int -> int[]', fn: 'issue', harness: { csharp: 'public static class Check { public static int[] Issue(int n) { Ticket.ResetCounter(); var res = new int[n + 1]; for (int i = 0; i < n; i++) res[i] = new Ticket().Id; res[n] = Ticket.Issued; return res; } }' }, cases: [
      [[0], [0]], [[1], [1, 1]], [[3], [1, 2, 3, 3]], [[5], [1, 2, 3, 4, 5, 5]], [[2], [1, 2, 2]], [[1000], { $concat: [{ $range: [1, 1001] }, [1000]] }]
    ] },
    solution: {
      approach: R`<p>A static field shared by all instances hands out numbers in the constructor; static members expose and reset it.</p>`,
      code: R`public class Ticket
{
    private static int s_next = 1;

    public int Id { get; }

    public Ticket() { Id = s_next++; }

    public static int Issued => s_next - 1;

    public static void ResetCounter() => s_next = 1;
}`,
      complexity: R`<p>O(1) per ticket and per static call.</p>`,
      followUps: ['Make the counter thread-safe with Interlocked.Increment', 'Replace the static counter with an injected IdGenerator service']
    }
  });

  practice.push({
    title: 'Case-Insensitive User Names with IEqualityComparer',
    level: 'Easy', tags: ['equality', 'IEqualityComparer', 'HashSet'], companies: ['GitHub', 'Atlassian'],
    statement: R`<p>Write <code>public sealed class UserNameComparer : IEqualityComparer&lt;string&gt;</code> that treats names as equal when they match after trimming surrounding spaces, ignoring case (ordinal). The harness counts distinct names with <code>new HashSet&lt;string&gt;(names, new UserNameComparer())</code>.</p>`,
    constraints: R`Up to 10<sup>5</sup> ASCII names.`,
    example: R`<p><code>["Alice", "alice", "ALICE "]</code> → <span class="c-g">1</span>; <code>["bob", "Bob", "rob"]</code> → <span class="c-g">2</span>.</p>`,
    brute: { why: R`<p>Normalising with <code>name.Trim().ToLower()</code> before inserting works but allocates a new string per name and loses the original spelling. A comparer keeps the data intact and puts the rule in one place.</p>`, code: R`public static class Normalize
{
    public static int CountDistinct(string[] names) => names.Select(n => n.Trim().ToLower()).Distinct().Count();   // allocates, culture-sensitive ToLower
}` },
    mcq: { q: 'What must <code>GetHashCode</code> do for this comparer?', options: ['Return s.GetHashCode()', 'Hash the trimmed string case-insensitively, so equal names get equal hashes', 'Return 0 always', 'Hash the length'], answer: 1, explain: '"Alice" and "alice " are equal, so they must hash the same; plain GetHashCode is case-sensitive. Returning 0 is correct but turns the set into a list (O(n) lookups).' },
    hints: [
      R`<p>Hint 1: <code>Equals</code>: <code>string.Equals(a?.Trim(), b?.Trim(), StringComparison.OrdinalIgnoreCase)</code>.</p>`,
      R`<p>Hint 2: <code>GetHashCode</code>: <code>StringComparer.OrdinalIgnoreCase.GetHashCode(s.Trim())</code>.</p>`,
      R`<p>Hint 3: use <code>AsSpan().Trim()</code> and <code>string.GetHashCode(span, StringComparison.OrdinalIgnoreCase)</code> to avoid allocating.</p>`
    ],
    tests: { sig: 'string[] -> int', fn: 'countDistinct', harness: { csharp: 'public static class Check { public static int CountDistinct(string[] names) => new HashSet<string>(names, new UserNameComparer()).Count; }' }, cases: [
      [[['Alice', 'alice', 'ALICE ']], 1], [[['bob', 'Bob', 'rob']], 2], [[[]], 0], [[['  x', 'x  ', 'X']], 1], [[['a', 'b', 'c']], 3], [[['Ann', 'Anne']], 2]
    ] },
    solution: {
      approach: R`<p>Compare trimmed spans ordinal-ignore-case and hash them the same way, allocation-free.</p>`,
      code: R`public sealed class UserNameComparer : IEqualityComparer<string>
{
    public bool Equals(string? a, string? b)
    {
        if (a is null || b is null) return a is null && b is null;
        return a.AsSpan().Trim().Equals(b.AsSpan().Trim(), StringComparison.OrdinalIgnoreCase);
    }

    public int GetHashCode(string s) => string.GetHashCode(s.AsSpan().Trim(), StringComparison.OrdinalIgnoreCase);
}`,
      complexity: R`<p>O(L) per comparison or hash for names of length L; O(n) expected for the whole set.</p>`,
      followUps: ['Also ignore accents (é = e) — which comparison would you use?', 'Use the comparer for a Dictionary of user profiles']
    }
  });

  practice.push({
    title: 'Bank Account with Encapsulated State',
    level: 'Medium', tags: ['classes', 'encapsulation', 'private set', 'long'], companies: ['JPMorgan', 'Goldman Sachs', 'Stripe'],
    statement: R`<p>Implement <code>public class BankAccount</code>: constructor <code>BankAccount(string owner, long openingCents)</code>; <code>bool Deposit(long cents)</code> (false unless cents &gt; 0); <code>bool Withdraw(long cents)</code> (false unless 0 &lt; cents ≤ balance); <code>long GetBalance()</code>; <code>int TransactionCount()</code> counting successful deposits and withdrawals. Keep the balance private so it changes only through these methods.</p>`,
    constraints: R`Up to 10<sup>4</sup> operations; amounts fit in a long.`,
    example: R`<p>Open with 100, deposit 50, withdraw 30 → balance <span class="c-g">120</span>, 2 transactions. Withdrawing 11 from 10 returns <span class="c-r">false</span> and changes nothing.</p>`,
    brute: { why: R`<p>A public <code>Balance</code> field lets any code set it to −1,000,000; the "rules" exist only as a hope. Encapsulation makes the class the single gatekeeper of its invariant (balance ≥ 0).</p>`, code: R`public class OpenAccount
{
    public long Balance;          // anyone can write anything
    public void Withdraw(long c) { Balance -= c; }   // overdrafts allowed
}` },
    mcq: { q: 'Why return <code>bool</code> from Withdraw instead of throwing on insufficient funds?', options: ['Exceptions are not allowed in C#', 'Insufficient funds is an expected outcome; a Try-style bool keeps the normal path cheap and explicit', 'bool is faster to compile', 'It must match an interface'], answer: 1, explain: 'Exceptions are for exceptional failures; a declined withdrawal is a normal business result. (Throwing would also be valid design if callers must never ignore it.)' },
    hints: [
      R`<p>Hint 1: <code>public long Balance { get; private set; }</code> or a private field with a getter method.</p>`,
      R`<p>Hint 2: validate first, then change state, then count the transaction.</p>`,
      R`<p>Hint 3: use <code>long</code> cents, never <code>double</code> dollars.</p>`
    ],
    tests: { cls: 'BankAccount', sigs: { BankAccount: 'string long', deposit: 'long -> bool', withdraw: 'long -> bool', getBalance: '-> long', transactionCount: '-> int' }, cases: [
      { ops: ['BankAccount', 'deposit', 'withdraw', 'getBalance', 'transactionCount'], args: [['Ann', 100], [50], [30], [], []], out: [null, true, true, 120, 2] },
      { ops: ['BankAccount', 'withdraw', 'getBalance', 'transactionCount'], args: [['Bob', 10], [11], [], []], out: [null, false, 10, 0] },
      { ops: ['BankAccount', 'deposit', 'deposit', 'getBalance'], args: [['Cy', 0], [0], [-5], []], out: [null, false, false, 0] },
      { ops: ['BankAccount', 'withdraw', 'getBalance', 'withdraw'], args: [['Di', 50], [50], [], [1]], out: [null, true, 0, false] },
      { ops: ['BankAccount', 'deposit', 'deposit', 'getBalance'], args: [['Ed', 0], [5000000000], [5000000000], []], out: [null, true, true, 10000000000] },
      { ops: { $concat: [['BankAccount'], { $rep: 'deposit', n: 1000 }, ['getBalance', 'transactionCount']] }, args: { $concat: [[['Fi', 0]], { $rep: [1], n: 1000 }, [[], []]] }, out: { $concat: [[null], { $rep: true, n: 1000 }, [1000, 1000]] } }
    ] },
    solution: {
      approach: R`<p>Private state with a read-only view; each mutating method validates its argument, applies the change and records it. The invariant "balance never negative" holds after every call.</p>`,
      code: R`public class BankAccount
{
    public string Owner { get; }
    public long Balance { get; private set; }
    private int _transactions;

    public BankAccount(string owner, long openingCents)
    {
        if (openingCents < 0) throw new ArgumentOutOfRangeException(nameof(openingCents));
        Owner = owner;
        Balance = openingCents;
    }

    public bool Deposit(long cents)
    {
        if (cents <= 0) return false;
        Balance += cents;
        _transactions++;
        return true;
    }

    public bool Withdraw(long cents)
    {
        if (cents <= 0 || cents > Balance) return false;
        Balance -= cents;
        _transactions++;
        return true;
    }

    public long GetBalance() => Balance;
    public int TransactionCount() => _transactions;
}`,
      complexity: R`<p>O(1) time per operation, O(1) memory.</p>`,
      followUps: ['Keep a read-only transaction history (IReadOnlyList of records)', 'Add Transfer(BankAccount to, long cents) that is all-or-nothing']
    }
  });

  practice.push({
    title: 'Fraction as an Immutable Value Type',
    level: 'Medium', tags: ['readonly struct', 'operators', 'equality', 'gcd'], companies: ['Wolfram', 'MathWorks', 'Google'],
    statement: R`<p>Write <code>public readonly struct Fraction : IEquatable&lt;Fraction&gt;</code> with a constructor <code>Fraction(long numerator, long denominator)</code> that throws <code>DivideByZeroException</code> for a zero denominator and stores the fraction <b>normalised</b> (lowest terms, denominator positive); operators <code>+ - * /</code> (dividing by a zero fraction throws <code>DivideByZeroException</code>), <code>==</code>/<code>!=</code>, and <code>ToString()</code> giving <code>"n/d"</code>, or just <code>"n"</code> when d = 1. The harness applies one operator or prints <code>error</code>.</p>`,
    constraints: R`Inputs are ints; intermediate products fit in a long.`,
    example: R`<p>1/2 + 1/3 → <span class="c-g">5/6</span>; 2/4 == 1/2 → <span class="c-g">True</span> (normalisation makes equal values identical); 1/3 ÷ 0/5 → <span class="c-r">error</span>.</p>`,
    brute: { why: R`<p>Using <code>double</code> loses exactness (1/3 + 1/3 + 1/3 may not be 1). A mutable class with public numerator and denominator lets 2/4 and 1/2 compare unequal and allows a zero denominator to be set later.</p>`, code: R`public class LooseFraction
{
    public long N, D;                                 // D can become 0 at any time
    public double Value => (double)N / D;             // inexact
}` },
    mcq: { q: 'Why normalise in the constructor?', options: ['To save memory', 'So equal values have identical fields, making field-wise Equals and GetHashCode correct', 'Because operators require it', 'It is optional'], answer: 1, explain: 'With 2/4 stored as 1/2, comparing fields is the same as comparing values, and equal fractions hash alike.' },
    hints: [
      R`<p>Hint 1: gcd with Euclid's algorithm on absolute values; divide both parts by it.</p>`,
      R`<p>Hint 2: if the denominator is negative, negate both parts.</p>`,
      R`<p>Hint 3: a/b + c/d = (ad + cb)/bd; division multiplies by the reciprocal — the constructor will throw for a zero numerator in the divisor.</p>`
    ],
    tests: { sig: 'int int int int string -> string', fn: 'calc', harness: { csharp: 'public static class Check { public static string Calc(int a, int b, int c, int d, string op) { try { var x = new Fraction(a, b); var y = new Fraction(c, d); return op switch { "+" => (x + y).ToString(), "-" => (x - y).ToString(), "*" => (x * y).ToString(), "/" => (x / y).ToString(), _ => (x == y).ToString() }; } catch (DivideByZeroException) { return "error"; } } }' }, cases: [
      [[1, 2, 1, 3, '+'], '5/6'], [[1, 2, 1, 2, '-'], '0'], [[2, 4, 1, 2, '=='], 'True'], [[-1, 2, 1, -2, '=='], 'True'], [[3, 4, 4, 3, '*'], '1'], [[1, 3, 0, 5, '/'], 'error'],
      [[1, 0, 1, 2, '+'], 'error'], [[-6, 8, 3, -4, '+'], '-3/2'], [[5, 1, 2, 1, '/'], '5/2'], [[1000000, 3, 2000000, 3, '*'], '2000000000000/9'], [[1, 2, 2, 3, '=='], 'False']
    ] },
    solution: {
      approach: R`<p>An immutable struct that normalises on construction; operators build new fractions through the same constructor, so every value is always in lowest terms with a positive denominator.</p>`,
      code: R`public readonly struct Fraction : IEquatable<Fraction>
{
    public long Numerator { get; }
    public long Denominator { get; }

    public Fraction(long numerator, long denominator)
    {
        if (denominator == 0) throw new DivideByZeroException("denominator is zero");
        if (denominator < 0) { numerator = -numerator; denominator = -denominator; }
        long g = Gcd(Math.Abs(numerator), denominator);
        Numerator = numerator / g;
        Denominator = denominator / g;
    }

    private static long Gcd(long a, long b) { while (b != 0) (a, b) = (b, a % b); return a == 0 ? 1 : a; }

    public static Fraction operator +(Fraction x, Fraction y) => new(x.Numerator * y.Denominator + y.Numerator * x.Denominator, x.Denominator * y.Denominator);
    public static Fraction operator -(Fraction x, Fraction y) => new(x.Numerator * y.Denominator - y.Numerator * x.Denominator, x.Denominator * y.Denominator);
    public static Fraction operator *(Fraction x, Fraction y) => new(x.Numerator * y.Numerator, x.Denominator * y.Denominator);
    public static Fraction operator /(Fraction x, Fraction y) => new(x.Numerator * y.Denominator, x.Denominator * y.Numerator);

    public bool Equals(Fraction other) => Numerator == other.Numerator && Denominator == other.Denominator;
    public override bool Equals(object? obj) => obj is Fraction f && Equals(f);
    public override int GetHashCode() => HashCode.Combine(Numerator, Denominator);
    public static bool operator ==(Fraction a, Fraction b) => a.Equals(b);
    public static bool operator !=(Fraction a, Fraction b) => !a.Equals(b);

    public override string ToString() => Denominator == 1 ? Numerator.ToString() : $"{Numerator}/{Denominator}";
}`,
      complexity: R`<p>O(log min(n, d)) per operation for the gcd.</p>`,
      followUps: ['What does default(Fraction) look like, and how would you handle its zero denominator?', 'Implement IComparable&lt;Fraction&gt; without floating point']
    }
  });

  practice.push({
    title: 'Money Record: Same-Currency Addition and Fair Allocation',
    level: 'Medium', tags: ['records', 'decimal', 'with expression', 'invariants'], companies: ['Stripe', 'Adyen', 'PayPal'],
    statement: R`<p>Write <code>public record Money(decimal Amount, string Currency)</code> with <code>Money Add(Money other)</code> (throws <code>InvalidOperationException</code> when currencies differ; use a <code>with</code> expression), <code>Money[] Allocate(int parts)</code> (split into whole cents so shares differ by at most one cent, earlier shares getting the extra cents) and a <code>ToString()</code> override printing <code>"12.34 USD"</code> (two decimals, invariant culture). The harness adds two amounts and allocates the sum, or returns <code>["mismatch"]</code>.</p>`,
    constraints: R`Amounts have at most 2 decimals, 0 ≤ amount ≤ 10<sup>9</sup>; 1 ≤ parts ≤ 100.`,
    example: R`<p>10.00 USD + 0.01 USD = 10.01 USD, split 3 ways → <span class="c-g">["3.34 USD", "3.34 USD", "3.33 USD"]</span>: 1001 cents = 3 × 333 + 2.</p>`,
    brute: { why: R`<p>Adding raw decimals ignores currency (5 EUR + 5 USD = "10"), and <code>Math.Round(total / parts, 2)</code> for every share loses or invents cents. Overriding ToString also replaces the generated record format, which is what we want for display.</p>`, code: R`public static class Naive
{
    public static decimal[] Split(decimal total, int parts) =>
        Enumerable.Repeat(Math.Round(total / parts, 2), parts).ToArray();   // 10.01 / 3 -> 3.34 x 3 = 10.02
}` },
    mcq: { q: 'Inside the record, what does <code>this with { Amount = Amount + other.Amount }</code> return?', options: ['this, modified', 'A new Money with the same Currency and the new Amount', 'A Money with Currency null', 'It does not compile inside the record'], answer: 1, explain: 'with clones the record and sets only the listed properties. Currency is copied unchanged.' },
    hints: [
      R`<p>Hint 1: <code>Add</code>: compare currencies with <code>string.Equals(…, StringComparison.Ordinal)</code>, then <code>this with { Amount = … }</code>.</p>`,
      R`<p>Hint 2: <code>Allocate</code>: <code>long cents = (long)(Amount * 100)</code>; base = cents / parts; the first cents % parts shares get one more.</p>`,
      R`<p>Hint 3: <code>public override string ToString() =&gt; Amount.ToString("F2", CultureInfo.InvariantCulture) + " " + Currency;</code></p>`
    ],
    tests: { sig: 'double string double string int -> string[]', fn: 'run', harness: { csharp: 'public static class Check { public static string[] Run(double a, string ca, double b, string cb, int parts) { try { var sum = new Money((decimal)a, ca).Add(new Money((decimal)b, cb)); return sum.Allocate(parts).Select(m => m.ToString()).ToArray(); } catch (InvalidOperationException) { return ["mismatch"]; } } }' }, cases: [
      [[10, 'USD', 0.01, 'USD', 3], ['3.34 USD', '3.34 USD', '3.33 USD']], [[5, 'EUR', 5, 'USD', 2], ['mismatch']], [[0, 'GBP', 0, 'GBP', 2], ['0.00 GBP', '0.00 GBP']],
      [[100, 'USD', 0, 'USD', 1], ['100.00 USD']], [[0.05, 'USD', 0, 'USD', 2], ['0.03 USD', '0.02 USD']], [[1, 'JPY', 2, 'JPY', 4], ['0.75 JPY', '0.75 JPY', '0.75 JPY', '0.75 JPY']], [[999999999.99, 'USD', 0.01, 'USD', 3], ['333333333.34 USD', '333333333.33 USD', '333333333.33 USD']]
    ] },
    solution: {
      approach: R`<p>The record carries the data and value equality; methods enforce the currency rule and allocate in integer cents so the parts always sum back to the total.</p>`,
      code: R`using System.Globalization;

public record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (!string.Equals(Currency, other.Currency, StringComparison.Ordinal))
            throw new InvalidOperationException($"cannot add {other.Currency} to {Currency}");
        return this with { Amount = Amount + other.Amount };
    }

    public Money[] Allocate(int parts)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(parts, 1);
        long cents = (long)(Amount * 100m);
        long share = cents / parts, extra = cents % parts;
        var result = new Money[parts];
        for (int i = 0; i < parts; i++)
            result[i] = this with { Amount = (share + (i < extra ? 1 : 0)) / 100m };
        return result;
    }

    public override string ToString() => Amount.ToString("F2", CultureInfo.InvariantCulture) + " " + Currency;
}`,
      complexity: R`<p>O(parts) for Allocate, O(1) for Add.</p>`,
      followUps: ['Allocate by ratios (e.g. 70/20/10)', 'Make Currency an enum or a validated value object']
    }
  });

  practice.push({
    title: 'Fibonacci via an Immutable Matrix Struct',
    level: 'Medium', tags: ['readonly struct', 'operator overloading', 'primary constructor', 'fast exponentiation'], companies: ['Google', 'Jane Street', 'Codeforces'],
    statement: R`<p>Write <code>public readonly struct Mat2</code> representing the 2 × 2 matrix [[A, B], [C, D]] with entries modulo 1,000,000,007: a constructor <code>Mat2(long a, long b, long c, long d)</code>, get-only properties <code>A B C D</code>, a static <code>Identity</code>, <code>operator *</code> and <code>static Mat2 Pow(Mat2 m, long n)</code> using fast exponentiation. The harness computes F(n) mod 10<sup>9</sup>+7 as <code>Mat2.Pow(new Mat2(1, 1, 1, 0), n).B</code>.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>18</sup>.`,
    example: R`<p>n = 10 → <span class="c-g">55</span>; n = 50 → <span class="c-g">586268941</span> (12586269025 mod 10<sup>9</sup>+7).</p>`,
    brute: { why: R`<p>A loop of n additions is O(n): fine for n = 10<sup>6</sup>, hopeless for 10<sup>18</sup>. Using a class for the matrix allocates a heap object per multiplication; a small readonly struct lives in registers.</p>`, code: R`public static class SlowFib
{
    public static long Fib(long n)
    {
        long a = 0, b = 1;
        for (long i = 0; i < n; i++) (a, b) = (b, (a + b) % 1_000_000_007);   // O(n)
        return a;
    }
}` },
    mcq: { q: 'Why is <code>a * b % Mod</code> safe in a <code>long</code> here?', options: ['long never overflows', 'Entries are below 10<sup>9</sup>+7, so each product is below about 10<sup>18</sup> < 9.2·10<sup>18</sup>', 'The % runs first', 'checked prevents it'], answer: 1, explain: 'Each entry is reduced, so a product is at most (10^9+6)^2 ≈ 10^18. A sum of two such products could overflow, so reduce each product before adding.' },
    hints: [
      R`<p>Hint 1: [[1,1],[1,0]]<sup>n</sup> = [[F(n+1), F(n)], [F(n), F(n−1)]].</p>`,
      R`<p>Hint 2: square-and-multiply: while n &gt; 0, if n is odd multiply the result by m; square m; halve n.</p>`,
      R`<p>Hint 3: in the operator, reduce each product before adding: <code>(x.A * y.A % M + x.B * y.C % M) % M</code>.</p>`
    ],
    tests: { sig: 'long -> long', fn: 'fib', harness: { csharp: 'public static class Check { public static long Fib(long n) => Mat2.Pow(new Mat2(1, 1, 1, 0), n).B; }' }, cases: [
      [[0], 0], [[1], 1], [[2], 1], [[10], 55], [[50], 586268941], [[90], 210345902], [[1000], 517691607], [['1000000000000000000'], 209783453], [['4611686018427387904'], 548814072]
    ] },
    solution: {
      approach: R`<p>An immutable 32-byte struct with an overloaded <code>*</code>; <code>Pow</code> does O(log n) multiplications. Every operation returns a new value, so there is no aliasing to worry about.</p>`,
      code: R`public readonly struct Mat2
{
    private const long M = 1_000_000_007;
    public long A { get; }
    public long B { get; }
    public long C { get; }
    public long D { get; }

    public Mat2(long a, long b, long c, long d) { A = a % M; B = b % M; C = c % M; D = d % M; }

    public static Mat2 Identity => new(1, 0, 0, 1);

    public static Mat2 operator *(Mat2 x, Mat2 y) => new(
        (x.A * y.A % M + x.B * y.C % M) % M,
        (x.A * y.B % M + x.B * y.D % M) % M,
        (x.C * y.A % M + x.D * y.C % M) % M,
        (x.C * y.B % M + x.D * y.D % M) % M);

    public static Mat2 Pow(Mat2 m, long n)
    {
        var result = Identity;
        while (n > 0)
        {
            if ((n & 1) == 1) result *= m;     // compound assignment uses operator *
            m *= m;
            n >>= 1;
        }
        return result;
    }
}`,
      complexity: R`<p>O(log n) multiplications of constant cost; O(1) memory, no heap allocations.</p>`,
      followUps: ['Generalise to an N × N matrix type — struct or class?', 'Use the same Pow for linear recurrences like tribonacci']
    }
  });

  practice.push({
    title: 'Semantic Versions: record struct with IComparable',
    level: 'Medium', tags: ['record struct', 'IComparable', 'parsing', 'sorting'], companies: ['GitHub', 'npm', 'JetBrains'],
    statement: R`<p>Write <code>public readonly record struct SemVer(int Major, int Minor, int Patch) : IComparable&lt;SemVer&gt;</code> with <code>static SemVer Parse(string s)</code> accepting 1 to 3 dot-separated numbers (missing parts are 0: "1.2" is 1.2.0), <code>CompareTo</code> ordering by Major, then Minor, then Patch numerically, and <code>ToString()</code> as <code>"1.2.0"</code>. The harness parses, sorts with <code>List.Sort()</code> and returns the strings.</p>`,
    constraints: R`Up to 10<sup>4</sup> versions; each part 0 ≤ x ≤ 10<sup>6</sup>.`,
    example: R`<p>["1.2.3", "1.10.0", "1.2"] → <span class="c-g">["1.2.0", "1.2.3", "1.10.0"]</span>. Sorting the strings would wrongly put "1.10.0" before "1.2".</p>`,
    brute: { why: R`<p>Sorting the raw strings is lexicographic: "1.10.0" &lt; "1.2" because '1' &lt; '2'. Splitting and comparing inside a lambda every time works but re-parses on each comparison (O(n log n) parses).</p>`, code: R`public static class StringSort
{
    public static string[] Sort(string[] vs) => vs.Order(StringComparer.Ordinal).ToArray();   // "1.10.0" < "1.2"
}` },
    mcq: { q: 'Why can <code>List&lt;SemVer&gt;.Sort()</code> be called without passing a comparer?', options: ['Records are always sortable', 'SemVer implements IComparable&lt;SemVer&gt;, which Comparer&lt;T&gt;.Default uses', 'Sort uses ToString', 'It cannot'], answer: 1, explain: 'Records generate equality, not ordering. Implementing IComparable&lt;T&gt; provides the default order.' },
    hints: [
      R`<p>Hint 1: <code>s.Split('.')</code>, then <code>int.Parse</code> each part; pad with zeros.</p>`,
      R`<p>Hint 2: CompareTo: compare Major; if equal compare Minor; then Patch (<code>int.CompareTo</code> avoids subtraction overflow).</p>`,
      R`<p>Hint 3: override ToString to print the three parts with dots — the generated record ToString prints <code>SemVer { Major = … }</code>.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'sort', harness: { csharp: 'public static class Check { public static string[] Sort(string[] vs) { var list = vs.Select(SemVer.Parse).ToList(); list.Sort(); return list.Select(v => v.ToString()).ToArray(); } }' }, cases: [
      [[['1.2.3', '1.10.0', '1.2']], ['1.2.0', '1.2.3', '1.10.0']], [[['0.0.1']], ['0.0.1']], [[[]], []], [[['2', '1.9.9', '1.10']], ['1.9.9', '1.10.0', '2.0.0']],
      [[['1.0', '1.0.0', '0.9']], ['0.9.0', '1.0.0', '1.0.0']], [[['10.0.0', '9.99.99', '10.0.1']], ['9.99.99', '10.0.0', '10.0.1']], [[['1000000.0.0', '999999.1000000.1000000']], ['999999.1000000.1000000', '1000000.0.0']]
    ] },
    solution: {
      approach: R`<p>A readonly record struct gives cheap, immutable, value-equal versions; IComparable defines the natural order; Parse normalises missing parts once.</p>`,
      code: R`public readonly record struct SemVer(int Major, int Minor, int Patch) : IComparable<SemVer>
{
    public static SemVer Parse(string s)
    {
        var parts = s.Split('.');
        if (parts.Length is < 1 or > 3) throw new FormatException($"bad version '{s}'");
        int Part(int i) => i < parts.Length ? int.Parse(parts[i]) : 0;
        return new SemVer(Part(0), Part(1), Part(2));
    }

    public int CompareTo(SemVer other)
    {
        int c = Major.CompareTo(other.Major);
        if (c != 0) return c;
        c = Minor.CompareTo(other.Minor);
        return c != 0 ? c : Patch.CompareTo(other.Patch);
    }

    public override string ToString() => $"{Major}.{Minor}.{Patch}";
}`,
      complexity: R`<p>O(n log n) comparisons of O(1) each after O(total length) parsing.</p>`,
      followUps: ['Add the &lt; and &gt; operators', 'Support pre-release tags like 1.0.0-beta.2 with SemVer precedence rules']
    }
  });

  practice.push({
    title: 'Inventory of Immutable Item Records',
    level: 'Medium', tags: ['records', 'with expression', 'Dictionary', 'encapsulation'], companies: ['Amazon', 'Walmart', 'Flipkart'],
    statement: R`<p>Implement <code>public class Inventory</code> that stores <code>record Item(string Sku, int Quantity)</code> values in a private dictionary and updates them with <code>with</code> expressions: <code>void Add(string sku, int qty)</code> (ignored when qty ≤ 0), <code>bool Remove(string sku, int qty)</code> (false and no change when the item is missing or has fewer than qty; an item reaching 0 is deleted), <code>int Count(string sku)</code> (0 when missing) and <code>int DistinctItems()</code>.</p>`,
    constraints: R`Up to 10<sup>4</sup> operations; quantities fit in an int.`,
    example: R`<p>Add pen 5, add pen 3 → Count("pen") = 8; Remove pen 2 → true, Count = 6. Remove("x", 1) on an empty inventory → false.</p>`,
    brute: { why: R`<p>Exposing <code>public Dictionary&lt;string, int&gt; Items</code> lets callers set negative quantities or forget to delete empty entries. A mutable <code>Item</code> class shared with callers could be changed behind the inventory's back.</p>`, code: R`public class OpenInventory
{
    public Dictionary<string, int> Items = new();      // any caller can write Items["pen"] = -3
}` },
    mcq: { q: 'Why store immutable records and replace them on update?', options: ['Records are faster than ints', 'A record handed out to a caller can never change later, so the inventory is the only place state changes', 'Dictionaries require records', 'with expressions avoid allocation'], answer: 1, explain: 'Immutability plus encapsulation: callers may read Item values, but only Inventory decides what is stored. (with does allocate a new record.)' },
    hints: [
      R`<p>Hint 1: <code>private readonly Dictionary&lt;string, Item&gt; _items = new();</code></p>`,
      R`<p>Hint 2: Add: <code>_items[sku] = _items.TryGetValue(sku, out var it) ? it with { Quantity = it.Quantity + qty } : new Item(sku, qty);</code></p>`,
      R`<p>Hint 3: Remove: check presence and quantity first; delete the key when the new quantity is 0.</p>`
    ],
    tests: { cls: 'Inventory', sigs: { Inventory: '', add: 'string int -> void', remove: 'string int -> bool', count: 'string -> int', distinctItems: '-> int' }, cases: [
      { ops: ['Inventory', 'add', 'add', 'count', 'remove', 'count', 'distinctItems'], args: [[], ['pen', 5], ['pen', 3], ['pen'], ['pen', 2], ['pen'], []], out: [null, null, null, 8, true, 6, 1] },
      { ops: ['Inventory', 'remove', 'count', 'distinctItems'], args: [[], ['x', 1], ['x'], []], out: [null, false, 0, 0] },
      { ops: ['Inventory', 'add', 'remove', 'distinctItems', 'count'], args: [[], ['a', 2], ['a', 2], [], ['a']], out: [null, null, true, 0, 0] },
      { ops: ['Inventory', 'add', 'remove', 'count'], args: [[], ['b', 1], ['b', 2], ['b']], out: [null, null, false, 1] },
      { ops: ['Inventory', 'add', 'add', 'add', 'distinctItems', 'count'], args: [[], ['a', 1], ['b', 2], ['c', 3], [], ['c']], out: [null, null, null, null, 3, 3] },
      { ops: ['Inventory', 'add', 'add', 'distinctItems', 'count'], args: [[], ['d', 0], ['e', -4], [], ['e']], out: [null, null, null, 0, 0] }
    ] },
    solution: {
      approach: R`<p>The dictionary is private; every update builds a new <code>Item</code> with <code>with</code> and stores it, and validation happens before any change.</p>`,
      code: R`public record Item(string Sku, int Quantity);

public class Inventory
{
    private readonly Dictionary<string, Item> _items = new();

    public void Add(string sku, int qty)
    {
        if (qty <= 0) return;
        _items[sku] = _items.TryGetValue(sku, out var it)
            ? it with { Quantity = it.Quantity + qty }
            : new Item(sku, qty);
    }

    public bool Remove(string sku, int qty)
    {
        if (qty <= 0 || !_items.TryGetValue(sku, out var it) || it.Quantity < qty) return false;
        if (it.Quantity == qty) _items.Remove(sku);
        else _items[sku] = it with { Quantity = it.Quantity - qty };
        return true;
    }

    public int Count(string sku) => _items.TryGetValue(sku, out var it) ? it.Quantity : 0;

    public int DistinctItems() => _items.Count;
}`,
      complexity: R`<p>O(1) expected per operation.</p>`,
      followUps: ['Expose a read-only snapshot as IReadOnlyCollection&lt;Item&gt;', 'Raise an event when an item runs out']
    }
  });

  practice.push({
    title: 'Merge Intervals with a record struct',
    level: 'Medium', tags: ['record struct', 'sorting', 'validation'], companies: ['Google', 'Meta', 'Microsoft', 'Bloomberg'],
    statement: R`<p>Write <code>public readonly record struct Interval(int Start, int End)</code> (throw <code>ArgumentException</code> when Start &gt; End) and <code>public static class IntervalTools</code> with <code>List&lt;Interval&gt; Merge(IEnumerable&lt;Interval&gt; items)</code> returning the union as non-overlapping intervals sorted by start. Touching intervals ([1,4] and [4,5]) merge. The harness converts to and from <code>int[][]</code>.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>4</sup>; −10<sup>9</sup> ≤ Start ≤ End ≤ 10<sup>9</sup>.`,
    example: R`<p>[[1,3],[2,6],[8,10],[15,18]] → <span class="c-g">[[1,6],[8,10],[15,18]]</span>.</p>`,
    brute: { why: R`<p>Comparing every pair repeatedly until nothing changes is O(n²) per pass and up to O(n³) overall. Sorting first lets one linear sweep merge everything.</p>`, code: R`public static class SlowMerge
{
    public static List<(int S, int E)> Merge(List<(int S, int E)> xs)
    {
        bool changed = true;
        while (changed)
        {
            changed = false;
            for (int i = 0; i < xs.Count && !changed; i++)
                for (int j = i + 1; j < xs.Count && !changed; j++)
                    if (xs[i].S <= xs[j].E && xs[j].S <= xs[i].E)
                    {
                        xs[i] = (Math.Min(xs[i].S, xs[j].S), Math.Max(xs[i].E, xs[j].E));
                        xs.RemoveAt(j); changed = true;
                    }
        }
        return xs.OrderBy(x => x.S).ToList();
    }
}` },
    mcq: { q: 'Why validate Start ≤ End in the record struct\'s constructor?', options: ['Records require it', 'So every Interval value in the program is valid, and Merge never has to check', 'It speeds up sorting', 'It is needed for equality'], answer: 1, explain: 'Pushing invariants into the type means algorithms can trust their inputs. Note default(Interval) is (0, 0), which is also valid.' },
    hints: [
      R`<p>Hint 1: declare the explicit properties to validate: <code>public int End { get; } = End &gt;= Start ? End : throw …</code>, or check in an explicit constructor body.</p>`,
      R`<p>Hint 2: sort by Start (<code>items.OrderBy(i =&gt; i.Start)</code> or <code>List.Sort</code> with a comparison).</p>`,
      R`<p>Hint 3: sweep: if the next start ≤ current end, extend with <code>cur with { End = Math.Max(cur.End, next.End) }</code>; otherwise emit and start anew.</p>`
    ],
    tests: { sig: 'int[][] -> int[][]', fn: 'mergeCheck', harness: { csharp: 'public static class Check { public static int[][] MergeCheck(int[][] xs) => IntervalTools.Merge(xs.Select(x => new Interval(x[0], x[1]))).Select(i => new[] { i.Start, i.End }).ToArray(); }' }, cases: [
      [[[[1, 3], [2, 6], [8, 10], [15, 18]]], [[1, 6], [8, 10], [15, 18]]], [[[[1, 4], [4, 5]]], [[1, 5]]], [[[]], []], [[[[5, 7]]], [[5, 7]]],
      [[[[1, 4], [0, 4]]], [[0, 4]]], [[[[1, 4], [2, 3]]], [[1, 4]]], [[[[6, 8], [1, 9], [2, 4], [4, 7]]], [[1, 9]]], [[[[-5, -1], [-3, 2], [3, 3]]], [[-5, 2], [3, 3]]]
    ] },
    solution: {
      approach: R`<p>The value type guarantees each interval is well formed. Merge sorts a copy by start and sweeps once, extending the current interval with a <code>with</code> expression.</p>`,
      code: R`public readonly record struct Interval
{
    public int Start { get; }
    public int End { get; init; }

    public Interval(int start, int end)
    {
        if (start > end) throw new ArgumentException($"start {start} > end {end}");
        Start = start;
        End = end;
    }
}

public static class IntervalTools
{
    public static List<Interval> Merge(IEnumerable<Interval> items)
    {
        var sorted = items.ToList();
        sorted.Sort((a, b) => a.Start.CompareTo(b.Start));
        var result = new List<Interval>();
        foreach (var next in sorted)
        {
            if (result.Count > 0 && next.Start <= result[^1].End)
                result[^1] = result[^1] with { End = Math.Max(result[^1].End, next.End) };   // store the new value back
            else
                result.Add(next);
        }
        return result;
    }
}`,
      complexity: R`<p>O(n log n) for the sort plus O(n) for the sweep; O(n) memory.</p>`,
      followUps: ['Insert one interval into an already merged list in O(n)', 'Why does result[^1].End = x not compile here?']
    }
  });

  practice.push({
    title: 'Polynomial Value Type with Operators and Formatting',
    level: 'Hard', tags: ['readonly struct', 'operators', 'equality', 'immutability', 'formatting'], companies: ['Wolfram', 'MathWorks', 'Microsoft'],
    statement: R`<p>Write <code>public readonly struct Polynomial : IEquatable&lt;Polynomial&gt;</code> built from a coefficient array (index = power), stored as a <b>private trimmed copy</b> (no trailing zeros; <code>default(Polynomial)</code> means 0). Provide <code>operator +</code>, <code>operator *</code>, <code>==</code>/<code>!=</code>, <code>long Evaluate(long x)</code> and <code>ToString()</code>: terms from the highest power down, coefficient 1/−1 shown only as the sign (except for the constant), <code>x</code> for power 1, <code>x^k</code> above, joined by <code>" + "</code> or <code>" - "</code>, a leading <code>"-"</code> for a negative first term, and <code>"0"</code> for the zero polynomial. The harness applies <code>+</code>, <code>*</code>, <code>==</code> or <code>eval</code> (B's first coefficient is the x value).</p>`,
    constraints: R`Up to 50 coefficients each in −1000..1000; results fit in a long.`,
    example: R`<p>[−1, 2, 3] + [1] → <span class="c-g">3x^2 + 2x</span>; [1, 1] × [1, −1] → <span class="c-g">-x^2 + 1</span>; [1, 2, 0] == [1, 2] → <span class="c-g">True</span>.</p>`,
    brute: { why: R`<p>Storing the caller's array directly lets the caller mutate the polynomial later (the struct is "readonly" but the array is shared). Without trimming, [1, 2, 0] and [1, 2] compare unequal and hash differently. String concatenation with special cases scattered everywhere produces "+ -2x" and "1x^1".</p>`, code: R`public readonly struct LeakyPoly
{
    public readonly long[] Coeffs;                   // caller keeps a reference and can change it
    public LeakyPoly(long[] c) { Coeffs = c; }
    public override string ToString() => string.Join(" + ", Coeffs.Select((c, i) => $"{c}x^{i}"));   // "-1x^0 + 2x^1"
}` },
    mcq: { q: 'Why copy the incoming array in the constructor?', options: ['Arrays cannot be stored in structs', 'A readonly field only protects the reference; without a copy the caller can still change the elements', 'To sort the coefficients', 'Copying is required for operators'], answer: 1, explain: 'readonly is shallow. A defensive copy (plus never exposing the array) makes the value truly immutable.' },
    hints: [
      R`<p>Hint 1: constructor: find the last non-zero index, copy up to it (<code>c[..(last + 1)]</code>), store <code>Array.Empty&lt;long&gt;()</code> for zero. A private property can map a null field (from <code>default</code>) to the empty array.</p>`,
      R`<p>Hint 2: multiplication: <code>r[i + j] += a[i] * b[j]</code>; equality: <code>a.AsSpan().SequenceEqual(b)</code>; hash: combine every coefficient with <code>HashCode.Add</code>.</p>`,
      R`<p>Hint 3: formatting: iterate powers downwards, skip zeros, choose the separator from the sign, print |c| unless it is 1 and the power is above 0. Evaluate with Horner: <code>acc = acc * x + c</code>.</p>`
    ],
    tests: { sig: 'int[] int[] string -> string', fn: 'op', harness: { csharp: 'public static class Check { public static string Op(int[] a, int[] b, string op) { var p = new Polynomial(a.Select(x => (long)x).ToArray()); var q = new Polynomial(b.Select(x => (long)x).ToArray()); return op switch { "+" => (p + q).ToString(), "*" => (p * q).ToString(), "==" => (p == q).ToString(), _ => p.Evaluate(b[0]).ToString() }; } }' }, cases: [
      [[[-1, 2, 3], [1], '+'], '3x^2 + 2x'], [[[1, 1], [1, -1], '*'], '-x^2 + 1'], [[[1, 2, 0], [1, 2], '=='], 'True'], [[[], [0, 0], '=='], 'True'],
      [[[5], [0], '*'], '0'], [[[-1, 2, 3], [2], 'eval'], '15'], [[[0, -1], [3], 'eval'], '-3'], [[[0, 0, 0, 1], [0, 0, 1], '+'], 'x^3 + x^2'],
      [[[2, -3], [2, 3], '*'], '-9x^2 + 4'], [[[0, 1], [0, -1], '+'], '0'], [[[-7], [], '+'], '-7'], [[[1, 2], [1, 3], '=='], 'False'], [[[0, 2, -1], [0], '+'], '-x^2 + 2x']
    ] },
    solution: {
      approach: R`<p>Normalise once in the constructor (trim and copy), so equality is a plain sequence comparison and hashing is consistent. Operators build new polynomials through the same constructor. Formatting walks the powers downwards with small, explicit rules.</p>`,
      code: R`using System.Text;

public readonly struct Polynomial : IEquatable<Polynomial>
{
    private readonly long[]? _c;                                  // null for default(Polynomial)
    private long[] C => _c ?? Array.Empty<long>();

    public Polynomial(long[] coefficients)
    {
        int last = coefficients.Length - 1;
        while (last >= 0 && coefficients[last] == 0) last--;
        _c = last < 0 ? Array.Empty<long>() : coefficients[..(last + 1)];   // defensive copy, trimmed
    }

    public int Degree => C.Length - 1;                            // -1 for the zero polynomial

    public static Polynomial operator +(Polynomial a, Polynomial b)
    {
        var r = new long[Math.Max(a.C.Length, b.C.Length)];
        for (int i = 0; i < a.C.Length; i++) r[i] += a.C[i];
        for (int i = 0; i < b.C.Length; i++) r[i] += b.C[i];
        return new Polynomial(r);
    }

    public static Polynomial operator *(Polynomial a, Polynomial b)
    {
        if (a.C.Length == 0 || b.C.Length == 0) return default;
        var r = new long[a.C.Length + b.C.Length - 1];
        for (int i = 0; i < a.C.Length; i++)
            for (int j = 0; j < b.C.Length; j++)
                r[i + j] += a.C[i] * b.C[j];
        return new Polynomial(r);
    }

    public long Evaluate(long x)
    {
        long acc = 0;
        for (int i = C.Length - 1; i >= 0; i--) acc = acc * x + C[i];   // Horner
        return acc;
    }

    public bool Equals(Polynomial other) => C.AsSpan().SequenceEqual(other.C);
    public override bool Equals(object? obj) => obj is Polynomial p && Equals(p);
    public override int GetHashCode()
    {
        var h = new HashCode();
        foreach (long c in C) h.Add(c);
        return h.ToHashCode();
    }
    public static bool operator ==(Polynomial a, Polynomial b) => a.Equals(b);
    public static bool operator !=(Polynomial a, Polynomial b) => !a.Equals(b);

    public override string ToString()
    {
        if (C.Length == 0) return "0";
        var sb = new StringBuilder();
        for (int p = C.Length - 1; p >= 0; p--)
        {
            long c = C[p];
            if (c == 0) continue;
            if (sb.Length == 0) { if (c < 0) sb.Append('-'); }
            else sb.Append(c < 0 ? " - " : " + ");
            long abs = Math.Abs(c);
            if (abs != 1 || p == 0) sb.Append(abs);
            if (p >= 1) sb.Append('x');
            if (p >= 2) sb.Append('^').Append(p);
        }
        return sb.ToString();
    }
}`,
      complexity: R`<p>Addition O(n + m), multiplication O(n·m), evaluation O(n), equality and hashing O(n).</p>`,
      followUps: ['Add a derivative method and operator -', 'Make it generic over INumber&lt;T&gt; (generic math, module 11)']
    }
  });

  practice.push({
    title: 'Persistent Immutable Stack with Structural Sharing',
    level: 'Hard', tags: ['immutability', 'records', 'generics', 'IEnumerable'], companies: ['Microsoft', 'Jane Street', 'Datadog'],
    statement: R`<p>Write <code>public sealed class ImmutableStack&lt;T&gt; : IEnumerable&lt;T&gt;</code> where every operation returns a <b>new</b> stack and old versions keep working: a static <code>Empty</code>, <code>Push(T)</code>, <code>Pop()</code> (throws <code>InvalidOperationException</code> when empty), <code>Peek()</code>, <code>Count</code> and <code>IsEmpty</code>. Push and Pop must be O(1) by sharing nodes (<code>private sealed record Node(T Value, Node? Next)</code>). The harness keeps every version: for each op a value ≥ 0 pushes onto the latest version, −1 pops (an empty stack stays as it is); it returns the sum of every version from the oldest to the newest, followed by the final Count.</p>`,
    constraints: R`Up to 2000 operations.`,
    example: R`<p>ops [5, −1, 7] → versions [], [5], [], [7] → <span class="c-g">[0, 5, 0, 7, 1]</span>. Version 1 still sums to 5 after the pop, because the pop created a new stack instead of changing it.</p>`,
    brute: { why: R`<p>Copying a <code>List&lt;T&gt;</code> for every new version is O(n) per operation and O(n²) memory overall. Sharing the unchanged tail makes each version cost one node.</p>`, code: R`public sealed class CopyingStack<T>
{
    private readonly List<T> _items;
    private CopyingStack(List<T> items) => _items = items;
    public static CopyingStack<T> Empty { get; } = new(new List<T>());
    public CopyingStack<T> Push(T x) => new(new List<T>(_items) { x });     // O(n) copy per push
}` },
    mcq: { q: 'After <code>var s1 = Empty.Push(1); var s2 = s1.Push(2); var s3 = s1.Push(3);</code>, how many nodes exist?', options: ['5', '3: s2 and s3 both point to s1\'s node', '6', '2'], answer: 1, explain: 'Each Push creates one node whose Next is the old top. s2 and s3 share the node holding 1 — structural sharing.' },
    hints: [
      R`<p>Hint 1: the stack is just a pointer to the top node plus a count; Empty has a null top.</p>`,
      R`<p>Hint 2: <code>Push(x) =&gt; new(new Node(x, _top), _count + 1)</code>; <code>Pop() =&gt; new(_top.Next, _count - 1)</code> after an empty check.</p>`,
      R`<p>Hint 3: implement <code>GetEnumerator</code> with <code>yield return</code> walking the nodes, plus the non-generic <code>IEnumerable.GetEnumerator</code>.</p>`
    ],
    tests: { sig: 'int[] -> long[]', fn: 'versions', harness: { csharp: 'public static class Check { public static long[] Versions(int[] ops) { var vs = new List<ImmutableStack<int>> { ImmutableStack<int>.Empty }; foreach (int op in ops) { var cur = vs[^1]; vs.Add(op >= 0 ? cur.Push(op) : (cur.IsEmpty ? cur : cur.Pop())); } var res = vs.Select(v => v.Sum(x => (long)x)).ToList(); res.Add(vs[^1].Count); return res.ToArray(); } }' }, cases: [
      [[[1, 2, 3]], [0, 1, 3, 6, 3]], [[[5, -1, 7]], [0, 5, 0, 7, 1]], [[[]], [0, 0]], [[[-1]], [0, 0, 0]],
      [[[4, 4, -1, -1, -1, 9]], [0, 4, 8, 4, 0, 0, 9, 1]], [[[10, -1, 20, -1, 30]], [0, 10, 0, 20, 0, 30, 1]], [[{ $rep: 1, n: 2000 }], { $concat: [{ $range: [0, 2001] }, [2000]] }]
    ] },
    solution: {
      approach: R`<p>A linked list of immutable nodes: each version is a (top, count) pair; Push and Pop create one small object and reuse the rest. Old versions are never modified, so all of them stay valid forever.</p>`,
      code: R`using System.Collections;

public sealed class ImmutableStack<T> : IEnumerable<T>
{
    private sealed record Node(T Value, Node? Next);

    private readonly Node? _top;
    public int Count { get; }

    private ImmutableStack(Node? top, int count) { _top = top; Count = count; }

    public static ImmutableStack<T> Empty { get; } = new(null, 0);

    public bool IsEmpty => _top is null;

    public ImmutableStack<T> Push(T value) => new(new Node(value, _top), Count + 1);

    public ImmutableStack<T> Pop() =>
        _top is null ? throw new InvalidOperationException("stack is empty") : new(_top.Next, Count - 1);

    public T Peek() => _top is null ? throw new InvalidOperationException("stack is empty") : _top.Value;

    public IEnumerator<T> GetEnumerator()
    {
        for (var n = _top; n is not null; n = n.Next) yield return n.Value;
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}`,
      complexity: R`<p>Push, Pop, Peek, Count: O(1) time and O(1) extra memory per version; enumeration O(n).</p>`,
      followUps: ['Build an immutable queue from two immutable stacks (amortised O(1))', 'Compare with System.Collections.Immutable.ImmutableStack&lt;T&gt;']
    }
  });

  practice.push({
    title: 'DateRange Value Object with DateOnly',
    level: 'Hard', tags: ['record struct', 'validation', 'DateOnly', 'nullable'], companies: ['Booking.com', 'Airbnb', 'Expedia'],
    statement: R`<p>Write <code>public readonly record struct DateRange</code> with a constructor <code>DateRange(DateOnly start, DateOnly end)</code> (inclusive; throw <code>ArgumentException</code> if end is before start), <code>int Days</code> (number of days, inclusive), <code>bool Overlaps(DateRange other)</code>, <code>DateRange? Intersect(DateRange other)</code> (null when disjoint) and <code>ToString()</code> as <code>"2026-01-05..2026-01-10"</code>. The harness parses four <code>yyyy-MM-dd</code> strings and prints <code>"{A.Days} {B.Days} {Overlaps} {intersection or none}"</code>, or <code>invalid</code>.</p>`,
    constraints: R`Dates between 0001-01-01 and 9999-12-31.`,
    example: R`<p>A = 2026-01-01..2026-01-10, B = 2026-01-05..2026-01-20 → <span class="c-g">10 16 True 2026-01-05..2026-01-10</span>. A leap-year range 2024-02-28..2024-03-01 has <span class="c-g">3</span> days.</p>`,
    brute: { why: R`<p>Passing pairs of <code>DateTime</code> around loses the "start ≤ end" rule, mixes in time-of-day and time-zone bugs (23 vs 24 hour days at DST changes), and every caller re-implements overlap logic slightly differently (off-by-one on inclusive ends).</p>`, code: R`public static class LooseDates
{
    public static bool Overlaps(DateTime s1, DateTime e1, DateTime s2, DateTime e2) => s1 < e2 && s2 < e1;   // exclusive by accident
    public static int Days(DateTime s, DateTime e) => (e - s).Days;                                           // off by one, DST issues
}` },
    mcq: { q: 'Two inclusive ranges [a1, a2] and [b1, b2] overlap exactly when…', options: ['a1 &lt; b2 and b1 &lt; a2', 'a1 ≤ b2 and b1 ≤ a2', 'a1 == b1', 'a2 ≥ b2'], answer: 1, explain: 'With inclusive ends, sharing a single day counts as overlapping, so the comparisons are ≤.' },
    hints: [
      R`<p>Hint 1: <code>DateOnly</code> (.NET 6+) has no time or time zone; <code>DayNumber</code> gives an integer day index, so Days = end.DayNumber − start.DayNumber + 1.</p>`,
      R`<p>Hint 2: intersection = [max(starts), min(ends)] when it is non-empty; return <code>null</code> otherwise (<code>DateRange?</code>).</p>`,
      R`<p>Hint 3: format with <code>ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)</code>.</p>`
    ],
    tests: { sig: 'string string string string -> string', fn: 'run', harness: { csharp: 'public static class Check { static DateOnly P(string s) => DateOnly.ParseExact(s, "yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture); public static string Run(string a1, string a2, string b1, string b2) { try { var a = new DateRange(P(a1), P(a2)); var b = new DateRange(P(b1), P(b2)); var i = a.Intersect(b); return $"{a.Days} {b.Days} {a.Overlaps(b)} {(i is null ? "none" : i.Value.ToString())}"; } catch (ArgumentException) { return "invalid"; } } }' }, cases: [
      [['2026-01-01', '2026-01-10', '2026-01-05', '2026-01-20'], '10 16 True 2026-01-05..2026-01-10'],
      [['2026-01-01', '2026-01-01', '2026-01-01', '2026-01-01'], '1 1 True 2026-01-01..2026-01-01'],
      [['2026-01-01', '2026-01-05', '2026-01-06', '2026-01-09'], '5 4 False none'],
      [['2024-02-28', '2024-03-01', '2024-02-29', '2024-02-29'], '3 1 True 2024-02-29..2024-02-29'],
      [['2026-03-10', '2026-03-01', '2026-03-01', '2026-03-02'], 'invalid'],
      [['2025-12-31', '2026-01-01', '2026-01-01', '2026-12-31'], '2 365 True 2026-01-01..2026-01-01'],
      [['2023-01-01', '2023-12-31', '2024-01-01', '2024-12-31'], '365 366 False none'],
      [['2026-05-01', '2026-05-31', '2026-04-01', '2026-06-30'], '31 91 True 2026-05-01..2026-05-31']
    ] },
    solution: {
      approach: R`<p>A validated, immutable value object: the constructor enforces start ≤ end, <code>DateOnly.DayNumber</code> turns day arithmetic into integer arithmetic, and Intersect returns a nullable value type for "no overlap".</p>`,
      code: R`using System.Globalization;

public readonly record struct DateRange
{
    public DateOnly Start { get; }
    public DateOnly End { get; }

    public DateRange(DateOnly start, DateOnly end)
    {
        if (end < start) throw new ArgumentException($"end {end} is before start {start}");
        Start = start;
        End = end;
    }

    public int Days => End.DayNumber - Start.DayNumber + 1;

    public bool Overlaps(DateRange other) => Start <= other.End && other.Start <= End;

    public DateRange? Intersect(DateRange other)
    {
        var s = Start > other.Start ? Start : other.Start;
        var e = End < other.End ? End : other.End;
        return s <= e ? new DateRange(s, e) : null;
    }

    public override string ToString() =>
        Start.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) + ".." + End.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}`,
      complexity: R`<p>O(1) for every member.</p>`,
      followUps: ['Add Contains(DateOnly) and an enumerator over the days', 'Merge a list of bookings into free and busy ranges']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`<code>var a = new P { X = 1 }; var b = a; b.X = 2;</code> — what is <code>a.X</code> if P is a class, and if P is a struct?`, options: ['2 and 2', '2 and 1', '1 and 2', '1 and 1'], answer: 1, explain: R`For a class, b copies the reference (same object). For a struct, b copies the data (independent value).` },
    { q: R`What is the default value of a field of type <code>DateTime</code> (a struct)?`, options: ['null', 'DateTime.Now', '0001-01-01 00:00:00 (all bits zero)', 'It must be assigned or the code does not compile'], answer: 2, explain: R`Struct fields default to their zero value; DateTime's zero is DateTime.MinValue.` },
    { q: R`Why does <code>list[0].X = 5;</code> fail to compile when <code>list</code> is a <code>List&lt;Point&gt;</code> of structs?`, options: ['Structs are read-only', 'The indexer returns a copy; assigning to a field of a temporary is meaningless (CS1612)', 'Lists cannot hold structs', 'X is private'], answer: 1, explain: R`List&lt;T&gt;'s indexer is a method returning a copy. Arrays index the element itself, so arr[0].X = 5 works.` },
    { q: R`In <code>public class Svc(ILogger log) { … }</code> (C# 12), what is <code>log</code>?`, options: ['A public property', 'A primary constructor parameter, captured for use in members', 'A static field', 'A compile error for classes'], answer: 1, explain: R`For classes and structs, primary constructor parameters are not properties; they are in scope in the whole body and captured when used. Records do generate properties.` },
    { q: R`Which statement about <code>public required string Name { get; init; }</code> is true?`, options: ['Name can be changed at any time', 'Creating the object without setting Name in the initializer is a compile error', 'required is checked at run time', 'init makes the string deeply immutable'], answer: 1, explain: R`required members must be set by the creator (or a [SetsRequiredMembers] constructor); init prevents later assignment.` },
    { q: R`What order do these run in for <code>new Order("A1") { Status = "paid" }</code>?`, options: ['initializer → constructor → field initialisers', 'field initialisers → constructor body → object initializer', 'constructor body → field initialisers → initializer', 'object initializer → field initialisers → constructor'], answer: 1, explain: R`Field initialisers run first, then the constructor (and any chained this(...)), then the object initializer assignments.` },
    { q: R`What does <code>public int Total =&gt; _price * _qty;</code> declare?`, options: ['A field initialised once', 'A read-only property computed on every read', 'A method that must be called with ()', 'A constant'], answer: 1, explain: R`An expression-bodied property: a getter evaluated each time it is accessed.` },
    { q: R`A static field <code>s_count</code> is incremented in the constructor. After creating 3 objects, how many copies of <code>s_count</code> exist?`, options: ['3', '1', '0', '4'], answer: 1, explain: R`Static fields belong to the type: there is exactly one, shared by all instances.` },
    { q: R`<code>record Person(string Name, int Age);</code> — what does <code>new Person("A", 1) == new Person("A", 1)</code> return?`, options: ['False: different objects', 'True: records compare values', 'Compile error: == not defined', 'It depends on GetHashCode'], answer: 1, explain: R`Records generate value-based Equals, GetHashCode and ==.` },
    { q: R`<code>record Order(string Id, List&lt;string&gt; Items);</code> — after <code>var b = a with { Id = "B" }; b.Items.Add("x");</code>, does <code>a.Items</code> contain "x"?`, options: ['No: with makes a deep copy', 'Yes: with is a shallow copy, both share the same list', 'Compile error', 'Only if Items is init-only'], answer: 1, explain: R`with copies field values; for a reference-type field that is the reference.` },
    { q: R`Which positional record kind has <b>mutable</b> generated properties?`, options: ['record class', 'record struct', 'readonly record struct', 'sealed record'], answer: 1, explain: R`A plain record struct generates get/set properties; readonly record struct and record class generate init-only ones.` },
    { q: R`You override <code>Equals</code> but not <code>GetHashCode</code>. What breaks?`, options: ['Nothing', 'Hash-based collections may fail to find equal objects (and the compiler warns, CS0659)', 'The == operator', 'ToString'], answer: 1, explain: R`Equal objects must have equal hash codes; otherwise HashSet and Dictionary look in the wrong bucket.` },
    { q: R`Why should <code>operator ==</code> use <code>a is null</code> rather than <code>a == null</code>?`, options: ['Style only', '<code>a == null</code> calls the operator being defined, recursing forever', 'is null is slower but safer', 'null cannot be compared'], answer: 1, explain: R`The is null pattern never invokes user-defined operators.` },
    { q: R`Calling a method on an <code>in</code> parameter of a <b>non-readonly</b> struct…`, options: ['modifies the caller\'s value', 'makes the compiler copy the struct first (defensive copy)', 'does not compile', 'boxes the struct'], answer: 1, explain: R`The compiler cannot prove the method does not mutate, so it copies to protect the read-only reference. readonly structs/members avoid this.` },
    { q: R`What does <code>d.AddDays(1);</code> do to a <code>DateTime d</code>?`, options: ['Moves d forward one day', 'Nothing: it returns a new DateTime that is discarded', 'Throws', 'Changes d only in Release builds'], answer: 1, explain: R`DateTime is an immutable struct; methods return new values. Write d = d.AddDays(1).` }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: R`What is the difference between a class and a struct in C#? When would you choose a struct?`, level: 'B', a: R`<p>A <b>class</b> is a reference type: variables hold references to heap objects, assignment shares the object, the default is null, and classes support inheritance. A <b>struct</b> is a value type: variables hold the data inline, assignment copies it, the default is all-zero, and structs cannot inherit (but can implement interfaces). Choose a struct for small (≈16 bytes or less), immutable values that represent one logical value — coordinates, money, ranges, keys — especially when you create many of them (arrays of structs are compact and GC-friendly). Choose a class for entities with identity, larger objects, polymorphism, or shared mutable state.</p>`, followUps: ['What happens when a struct is cast to an interface?', 'Is a struct always on the stack?'] },
    { q: R`Explain why mutable structs are considered dangerous. Give a concrete bug.`, level: 'I', a: R`<p>Structs are copied implicitly in many places: list indexers and property getters return copies, <code>foreach</code> iteration variables are copies, method arguments are copies, and reading a <code>readonly</code> field or an <code>in</code> parameter may create a defensive copy. A mutating method called on any of these changes the copy, and the update silently disappears. Example: <code>List&lt;Counter&gt;</code> where <code>Counter</code> has <code>Increment()</code>; <code>list[0].Increment()</code> compiles but does nothing to the list element. Another: a <code>private readonly Tally _t</code> field whose <code>_t.Bump()</code> never changes it. Fix: make structs immutable (<code>readonly struct</code>) and store new values back explicitly.</p>`, followUps: ['Why does arr[0].Increment() work for arrays?', 'What is a defensive copy?'] },
    { q: R`What are primary constructors in C# 12, and how do they differ between classes and records?`, level: 'I', a: R`<p>A primary constructor puts parameters in the type header: <code>class OrderService(IRepo repo, ILogger log)</code>. For <b>classes and structs</b> the parameters are in scope throughout the body; if a member uses one, the compiler captures it in a hidden field. They are not properties, are mutable, and every other constructor must chain to the primary one with <code>this(...)</code>. Typical use: dependency injection without boilerplate. For <b>records</b>, positional parameters additionally generate public init-only properties, Deconstruct and participate in equality. Pitfall: initialising a property from a parameter and also capturing the parameter creates two separate copies of state (warning CS9124).</p>`, followUps: ['How do you validate primary constructor parameters?', 'Why might a team ban capture of primary constructor parameters?'] },
    { q: R`When should you use a property instead of a public field?`, level: 'B', a: R`<p>Practically always for public API. Properties let you add validation, lazy computation, change notification, logging or a different storage later without breaking callers (changing a field to a property is a binary-breaking change and changes semantics for ref/out). They support different access levels (<code>get; private set;</code>), <code>init</code>-only and <code>required</code> semantics, can appear in interfaces, and are what serializers, data binding and ORMs expect. Trivial properties are inlined by the JIT, so there is no performance cost. Public fields are acceptable for internal, performance-critical structs or <code>const</code>/<code>static readonly</code> values.</p>`, followUps: ['When should a property be a method instead?', 'What does init compile to?'] },
    { q: R`What is the difference between <code>init</code>, <code>private set</code> and a get-only property?`, level: 'I', a: R`<p>A <b>get-only</b> auto-property (<code>{ get; }</code>) can be assigned only in a constructor or initialiser of the declaring type. A <b>private set</b> can be assigned anywhere inside the class at any time, so the object is mutable internally (e.g. Balance changed by Deposit). An <b>init</b> accessor can be assigned by anyone, but only during object creation: in a constructor, an object initializer (<code>new P { X = 1 }</code>) or a <code>with</code> expression; afterwards it is read-only. Combine <code>init</code> with <code>required</code> to force callers to set it. None of these makes the referenced object deeply immutable.</p>`, followUps: ['Can reflection set an init-only property?', 'How does with use init accessors?'] },
    { q: R`What does a record generate, and when should you not use a record?`, level: 'I', a: R`<p>A positional record generates init-only properties, a primary constructor, value-based <code>Equals(T)</code>/<code>Equals(object)</code>/<code>GetHashCode</code>, <code>==</code>/<code>!=</code>, <code>IEquatable&lt;T&gt;</code>, a readable <code>ToString</code> (via <code>PrintMembers</code>), <code>Deconstruct</code>, a protected copy constructor and the clone method used by <code>with</code>, plus an <code>EqualityContract</code> so derived records are not equal to base ones. Avoid records for <b>entities with identity</b> whose state changes (ORM entities, aggregates), types that must be mutable, types containing collections you expect to compare by contents (records compare references), and types whose ToString would leak secrets unless you override PrintMembers.</p>`, followUps: ['How do record equality and inheritance interact?', 'How would you make a record compare a list field by contents?'] },
    { q: R`Explain the Equals/GetHashCode contract and what goes wrong when it is broken.`, level: 'I', a: R`<p>Equals must be reflexive, symmetric, transitive, consistent and return false for null; and <b>if two objects are equal their hash codes must be equal</b>. Hash-based collections first use the hash to choose a bucket and only then call Equals within that bucket. If equal objects produce different hashes, <code>Contains</code> and <code>TryGetValue</code> look in the wrong bucket and miss them; duplicates appear in sets. Also, the hash must not change while the object is used as a key: mutating a key field after insertion strands the entry. Implement both from the same immutable fields (<code>HashCode.Combine</code>), implement <code>IEquatable&lt;T&gt;</code>, seal the class or compare runtime types, and prefer records which generate all of it.</p>`, followUps: ['Why are .NET string hash codes randomised?', 'What is EqualityComparer&lt;T&gt;.Default?'] },
    { q: R`How do <code>==</code>, <code>Equals</code> and <code>ReferenceEquals</code> differ?`, level: 'B', a: R`<p><code>ReferenceEquals(a, b)</code> always tests identity (same object) and cannot be overridden. <code>Equals</code> is a virtual method: reference equality for classes by default, field-wise for structs, value-based for records and strings, and overridable — it dispatches on the run-time type. <code>==</code> is a static operator chosen at compile time from the static types: reference equality for classes unless overloaded; overloaded by string, records and many value types. The classic surprise: <code>object a = "hi", b = new string("hi");</code> → <code>a == b</code> is false (object's reference ==), but <code>a.Equals(b)</code> is true.</p>`, followUps: ['When would you overload == on a class?', 'What does is null compile to?'] },
    { q: R`What is a <code>readonly struct</code> and why does it matter for performance?`, level: 'A', a: R`<p>A <code>readonly struct</code> guarantees that no member mutates the instance: all fields are readonly and auto-properties are get-only or init. The compiler can then treat <code>this</code> as a read-only reference, so it never needs <b>defensive copies</b> when calling members on readonly locations — <code>in</code> parameters, <code>readonly</code> fields, <code>ref readonly</code> returns. For a non-readonly struct, each such call copies the whole struct first, which makes <code>in</code> pointless for large structs. It also communicates immutability to readers and enables safe sharing across threads. Individual members can be marked <code>readonly</code> on otherwise mutable structs.</p>`, followUps: ['How would you detect defensive copies?', 'What is a readonly ref struct?'] },
    { q: R`Static classes, static members and singletons: when are they appropriate?`, level: 'I', a: R`<p>Static classes suit stateless helpers and pure functions (<code>Math</code>, formatting, parsing), constants, and extension-method containers; they are simple and fast. Static <b>mutable</b> state is risky: it is global, hard to test (tests share it), lives for the whole process (memory leaks via caches), and needs synchronisation under concurrency. A singleton service is usually better expressed as a DI registration with singleton lifetime (<code>services.AddSingleton&lt;IClock, SystemClock&gt;()</code>), which keeps it replaceable in tests. If a static singleton is unavoidable, use <code>Lazy&lt;T&gt;</code> or a static readonly field for thread-safe initialisation.</p>`, followUps: ['How is a static field initialised thread-safely?', 'What does beforefieldinit mean?'] },
    { q: R`How would you design an immutable Money type in C#?`, level: 'A', a: R`<p>A <code>readonly record struct Money(decimal Amount, string Currency)</code> (or a sealed record class if you need inheritance or nullability): <code>decimal</code> for exact base-10 arithmetic; currency validated in the constructor (ISO code, or a <code>Currency</code> value object/enum); operations that return new instances (<code>Add</code>, <code>Subtract</code>, <code>Multiply(decimal)</code>) and throw on currency mismatch; allocation in minor units so splits sum exactly; explicit rounding policy (<code>MidpointRounding.ToEven</code> for banking or <code>AwayFromZero</code> per business rules); culture-aware display separate from invariant serialization; value equality (generated) and possibly <code>IComparable</code> for same-currency comparisons. Avoid implicit conversions from decimal that would let currency be forgotten.</p>`, followUps: ['How do you represent currencies with 0 or 3 decimal places?', 'Where should exchange rates live?'] },
    { q: R`What happens, step by step, when you write <code>var p2 = p1 with { Age = 40 };</code>?`, level: 'A', a: R`<p>The compiler emits a call to the record's hidden virtual <code>&lt;Clone&gt;$()</code> method, which invokes the protected copy constructor <code>Person(Person original)</code>; it copies every field (shallow) into a new object. Because it is virtual, a derived record's clone keeps the derived type even through a base-typed variable. Then the compiler emits assignments for each member in the braces using their <code>init</code> (or set) accessors on the new object. Finally the reference is stored in <code>p2</code>. <code>p1</code> is untouched. For record structs and (since C# 10) any struct, <code>with</code> simply copies the value and assigns the members.</p>`, followUps: ['How can you make with perform a deep copy?', 'Can you use with on anonymous types?'] },
    { q: R`Object initializers vs constructors: which should establish invariants?`, level: 'I', a: R`<p>Constructors (and factory methods) should establish <b>invariants</b>: anything that must always be true for the object to be valid, because they run as one unit and can refuse to create the object by throwing. Object initializers are just property assignments after construction; they are convenient for optional values and DTOs, but cannot enforce cross-property rules (e.g. Start ≤ End) unless each setter validates against the current state, which is order-dependent. Use <code>required</code> + <code>init</code> for mandatory simple data where no cross-field rule exists; use constructors or factories where rules exist; and keep setters private if later changes must go through validating methods.</p>`, followUps: ['What does [SetsRequiredMembers] do?', 'How do you validate a record with an initializer?'] },
    { q: R`Design question: you model an order system with Customer, Order, OrderLine, Address and Money. Which are classes, which records, which structs — and why?`, level: 'E', a: R`<p><b>Customer</b> and <b>Order</b> are entities: they have identity (an Id) and their state changes over time (status, lines), so they are classes with encapsulated state, equality by Id if needed, and methods that enforce rules (<code>order.AddLine</code>, <code>order.Pay()</code>). <b>OrderLine</b> is usually part of the Order aggregate: a class owned by Order, or an immutable record if lines are replaced rather than edited. <b>Address</b> is a value object with several strings: a sealed <code>record</code> (value equality, with-expressions for corrections), too large to be a good struct. <b>Money</b> is a small value object: a <code>readonly record struct</code> or record. I would avoid public setters on entities, keep collections exposed as <code>IReadOnlyList</code>, and map them with an ORM using private fields or owned types.</p>`, followUps: ['How would EF Core map Money and Address?', 'Where would you put validation that spans several entities?'] }
  );

  registerModule({
    id: 'csharp03',
    title: 'Classes, Structs & Records',
    intro: R`<p>Now we build our own types. The first and most important idea is the difference between <b>classes</b> (reference types: variables share an object) and <b>structs</b> (value types: variables hold independent copies). From there you will learn how objects are born — <b>constructors</b>, chaining, C# 12 <b>primary constructors</b>, object initializers and <code>required</code> members — and how they expose data safely through <b>properties</b> with validation, computed values and <code>init</code> accessors. We look at <b>static members</b> for shared state and helpers, and at <b>records</b>: one-line immutable data types with value equality and <code>with</code>-expressions.</p>
<p>Finally we go under the hood of <b>equality</b> (<code>==</code>, <code>Equals</code>, <code>GetHashCode</code>, <code>IEquatable&lt;T&gt;</code>) and <b>readonly structs</b> with their defensive copies. Visualizers show references vs copies, the order of construction, what a property call really does, a shared static field, the <code>with</code> clone, hash buckets with and without a correct GetHashCode, and the classic vanishing-increment bug. These are the building blocks of every low-level design interview and every real C# codebase.</p>`,
    goals: [
      'Predict the behaviour of assignments, parameters and collections for classes vs structs, and choose the right one',
      'Write constructors that enforce invariants, use chaining, factories, primary constructors, object initializers and required members',
      'Design properties with validation, computed values, private setters and init accessors',
      'Use static members and static classes appropriately and recognise the risks of static mutable state',
      'Model immutable data with records and record structs, using value equality, with-expressions and deconstruction',
      'Implement correct value equality (Equals, GetHashCode, ==, IEquatable&lt;T&gt;, IEqualityComparer&lt;T&gt;)',
      'Write immutable readonly structs and explain defensive copies'
    ],
    prereqs: R`<p>Module <b>C# 2 (Control Flow, Methods, Arrays &amp; Strings)</b>: methods, ref/out/in parameters, arrays and strings. Familiarity with objects in any language helps; inheritance and interfaces come in the next module.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
