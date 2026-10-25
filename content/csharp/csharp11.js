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
     TOPIC 1 — Reflection and System.Type
     ====================================================================== */
  var T1_CODE = [
    'var p = new Product { Id = 7, Name = "pen" };',
    'Type t = p.GetType();                       // same object as typeof(Product)',
    'var flags = BindingFlags.Public | BindingFlags.Instance;',
    'foreach (PropertyInfo pi in t.GetProperties(flags)',
    '                             .OrderBy(x => x.MetadataToken))',
    '    Console.WriteLine($"{pi.Name} = {pi.GetValue(p)}");',
    'MethodInfo m = t.GetMethod("Label")!;',
    'Console.WriteLine(m.Invoke(p, new object[] { ">" }));'
  ].join('\n');
  topics.push({
    title: 'Reflection: Reading and Calling Types at Run Time',
    analogy: `<p>Every .NET assembly carries a <b>detailed parts catalogue</b> stapled to the machine: for every class it lists the name, the base class, each field, property, method and its parameters. Normal code never opens the catalogue — the compiler already wired every call. <b>Reflection</b> is opening the catalogue while the machine runs: "show me every public property of this object", "find the method called Label and press it". It is how a JSON serializer can print an object it has never seen, and how a test runner finds every method marked ${C('[Fact]')}. Reading a catalogue is slower than pressing a button you already know, so frameworks read it once and remember what they found.</p>`,
    explain: `<p>The compiler writes <b>metadata</b> tables into every assembly next to the IL: TypeDef, MethodDef, FieldDef, Property, CustomAttribute and so on. The runtime exposes them through the ${C('System.Reflection')} API, rooted at ${C('System.Type')}.</p>
<h4>1. Three ways to get a Type</h4>
${H.table(['Expression', 'When it is resolved', 'Example'], [
  [C('typeof(T)'), 'compile time (a metadata token, very cheap)', C('typeof(List<int>)')],
  [C('obj.GetType()'), 'run time — the <b>actual</b> type of the object', C('object o = "hi"; o.GetType() // String')],
  [C('Type.GetType("Ns.Name, Assembly")'), 'run time, from a string (returns null if not found)', C('Type.GetType("System.Int32")')]
])}
<p>There is exactly <b>one</b> ${C('Type')} object per loaded type, so ${C('a.GetType() == typeof(Product)')} is a reliable exact-type test (unlike ${C('is')}, which also accepts subclasses).</p>
<h4>2. Members and BindingFlags</h4>
${P(`
Type t = typeof(Product);
PropertyInfo[] props   = t.GetProperties();                       // public instance + static
FieldInfo[]    priv    = t.GetFields(BindingFlags.NonPublic | BindingFlags.Instance);
MethodInfo?    m       = t.GetMethod("Label", new[] { typeof(string) });
ConstructorInfo? ctor  = t.GetConstructor(Type.EmptyTypes);       // the parameterless one`)}
<p>${C('BindingFlags')} is a filter. The rule that surprises everyone: once you pass <b>any</b> flags you must say both <b>visibility</b> (${C('Public')} / ${C('NonPublic')}) <b>and</b> scope (${C('Instance')} / ${C('Static')}), otherwise you get an empty array. ${C('DeclaredOnly')} skips inherited members.</p>
<h4>3. Using what you found</h4>
${H.table(['Goal', 'API', 'Note'], [
  ['read / write a property', C('pi.GetValue(obj)') + ' / ' + C('pi.SetValue(obj, v)'), 'value types are boxed into object'],
  ['call a method', C('mi.Invoke(obj, args)'), 'pass null as obj for static methods'],
  ['create an object', C('Activator.CreateInstance(t)') + ' or ' + C('ctor.Invoke(args)'), 'needs an accessible constructor'],
  ['close a generic', C('typeof(List<>).MakeGenericType(typeof(int))'), 'open generic = ' + C('IsGenericTypeDefinition')]
])}
<h4>4. Exceptions are wrapped</h4>
<p>If the method you call with ${C('Invoke')} throws, reflection wraps it in ${C('TargetInvocationException')}; the real error is in ${C('InnerException')}. Wrong argument types give ${C('ArgumentException')}, wrong counts ${C('TargetParameterCountException')}. Since .NET 5 you can ask for the original exception directly with ${C('BindingFlags.DoNotWrapExceptions')}.</p>
<h4>5. Order is not guaranteed</h4>
<p>${C('GetProperties')} and ${C('GetMethods')} do not promise any order. In practice you get declaration order, but if order matters (serialization, CSV columns), sort explicitly — ${C('MetadataToken')} follows declaration order inside one type, or use an attribute with an explicit ${C('Order')}.</p>`,
    clues: ['"print / copy / compare any object without knowing its type at compile time"', '"find every class that implements X" or "every method marked [Y]" (plugins, test runners)', 'a type or member name arrives as a <b>string</b> (config file, command line)', 'a framework must work on types written after it was compiled'],
    code: [{ lang: 'csharp', run: true, title: 'Walk the properties of an object and call a method by name (runnable)', code: `
using System.Reflection;

var p = new Product { Id = 7, Name = "pen" };
Type t = p.GetType();
Console.WriteLine(t == typeof(Product));                  // True
Console.WriteLine(t.FullName);                            // Product
var flags = BindingFlags.Public | BindingFlags.Instance;
foreach (PropertyInfo pi in t.GetProperties(flags).OrderBy(x => x.MetadataToken))
    Console.WriteLine($"{pi.Name} ({pi.PropertyType.Name}) = {pi.GetValue(p)}");

MethodInfo label = t.GetMethod("Label")!;
Console.WriteLine(label.Invoke(p, new object[] { ">" }));  // > pen #7

// a private field is visible with NonPublic | Instance
FieldInfo secret = t.GetField("_secret", BindingFlags.NonPublic | BindingFlags.Instance)!;
Console.WriteLine(secret.GetValue(p));                    // 42

// failure inside the called method is wrapped
try { t.GetMethod("Fail")!.Invoke(p, null); }
catch (TargetInvocationException e) { Console.WriteLine(e.InnerException!.GetType().Name); } // InvalidOperationException

// generic types
Type open = typeof(List<>);
Type closed = open.MakeGenericType(typeof(int));
Console.WriteLine($"{open.IsGenericTypeDefinition} {closed.Name} {closed.GetGenericArguments()[0].Name}"); // True List\`1 Int32
var list = (System.Collections.IList)Activator.CreateInstance(closed)!;
list.Add(5);
Console.WriteLine(list.Count);                            // 1

class Product
{
    private int _secret = 42;
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Label(string prefix) => $"{prefix} {Name} #{Id}";
    public void Fail() => throw new InvalidOperationException("boom");
}` }],
    codeTitle: ['Reflection tour'],
    viz: {
      title: 'Reflection walks the metadata of an object',
      gen: function () {
        return codeFrames(T1_CODE, [
          { l: 1, v: { p: 'Product { Id = 7, Name = "pen" }' }, narr: 'A normal object. The compiler knows its type, but reflection code pretends it does not.' },
          { l: 2, v: { p: 'Product', t: 'Type(Product)' }, hv: { t: 'ok' }, narr: '<b>GetType()</b> returns the run-time type object. There is one Type object per type, so this is the same instance as <code>typeof(Product)</code>.', extra: [{ type: 'table', label: 'Metadata tables for Product', columns: ['table', 'rows'], rows: [['TypeDef', 'Product'], ['Field', '_secret (private)'], ['Property', 'Id, Name'], ['Method', 'get_Id, set_Id, get_Name, set_Name, Label, Fail, .ctor']] }] },
          { l: 3, v: { flags: 'Public | Instance' }, narr: 'Flags must name a <b>visibility</b> and a <b>scope</b>. <code>BindingFlags.Public</code> alone would return nothing.' },
          { l: [4, 5], v: { found: '[Id, Name]' }, hv: { found: 'ok' }, narr: 'GetProperties returns PropertyInfo objects. Order is not guaranteed, so we sort by MetadataToken (declaration order).' },
          { l: 6, v: { pi: 'Id', value: '7 (boxed int)' }, out: 'Id = 7', narr: '<code>GetValue</code> returns <code>object</code>: the int 7 is <b>boxed</b> — one reason reflection allocates.' },
          { l: 6, v: { pi: 'Name', value: '"pen"' }, out: 'Id = 7\nName = pen', narr: 'Second property. <code>_secret</code> is a private field, not a public property, so it never appears.' },
          { l: 7, v: { m: 'MethodInfo Label(string)' }, narr: 'Look the method up by name. If it were overloaded you would pass the parameter types to choose one.' },
          { l: 8, v: { args: 'object[] { ">" }' }, out: 'Id = 7\nName = pen\n> pen #7', narr: '<code>Invoke</code> packs arguments in an object[] and checks them at run time. Any exception thrown inside is wrapped in TargetInvocationException.' }
        ]);
      }
    },
    examples: [
      { title: 'Exact type vs "is a"', html: `<p>${C('object o = new FileStream(...)')}: ${C('o is Stream')} is true, ${C('o.GetType() == typeof(Stream)')} is false, ${C('typeof(Stream).IsAssignableFrom(o.GetType())')} is true. Use the last form when you only have ${C('Type')} objects (plugin discovery).</p>` },
      { title: 'Finding all implementations of an interface', html: `<p>Plugin hosts scan an assembly for concrete classes that implement an interface and have a parameterless constructor.</p>`, code: `
using System.Reflection;

static IEnumerable<Type> FindPlugins(Assembly asm, Type contract) =>
    asm.GetTypes().Where(t => t.IsClass && !t.IsAbstract
                           && contract.IsAssignableFrom(t)
                           && t.GetConstructor(Type.EmptyTypes) != null);` },
      { title: 'Getting the real exception', html: `<p>A log full of ${C('TargetInvocationException: Exception has been thrown by the target of an invocation')} hides the cause. Log ${C('e.InnerException')}, or rethrow it with its original stack trace using ${C('ExceptionDispatchInfo.Capture(e.InnerException!).Throw()')}.</p>`, code: `
using System.Reflection;
using System.Runtime.ExceptionServices;

static object? CallUnwrapped(MethodInfo m, object? target, object?[] args)
{
    try { return m.Invoke(target, args); }
    catch (TargetInvocationException e) when (e.InnerException != null)
    {
        ExceptionDispatchInfo.Capture(e.InnerException).Throw();
        throw; // unreachable, keeps the compiler happy
    }
}` }
    ],
    deepDive: `<p><b>Cost.</b> A reflection call does argument checking, boxing of value types and allocation of the ${C('object[]')}. .NET 7+ made ${C('MethodInfo.Invoke')} much faster by emitting an invoker after a few calls, but it is still several times slower than a direct call and allocates. The standard fix is to <b>reflect once, cache a delegate</b>: ${C('m.CreateDelegate<Func<Product, string, string>>()')} gives a strongly typed delegate that runs at near-direct speed. For property getters on unknown types, build and compile an expression tree once (topic 7).</p>
<p><b>Metadata tokens and handles.</b> Each member has a 32-bit token (table number + row). ${C('RuntimeTypeHandle')} / ${C('RuntimeMethodHandle')} are the runtime's internal pointers; ${C('typeof(T)')} compiles to ${C('ldtoken')} + ${C('Type.GetTypeFromHandle')}, which the JIT turns into a constant. That is why ${C('typeof(T) == typeof(int)')} inside a generic method is folded away for value-type instantiations — a trick used in high-performance generic code.</p>
<p><b>Trimming and Native AOT.</b> The IL trimmer removes members it cannot see being used. Reflection over names in strings breaks under trimming unless you annotate with ${C('[DynamicallyAccessedMembers]')}; Native AOT cannot generate new code at run time, so ${C('MakeGenericType')} over value types and ${C('Reflection.Emit')} may fail. This is the main reason the ecosystem moved to source generators (topic 8).</p>
<p><b>MetadataLoadContext</b> lets tools inspect assemblies without loading them for execution — useful for analyzers and build tasks.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write reflection boilerplate (property walkers, plugin scanners) instantly. <b>Use AI as a partner:</b> <code>Write a cached property getter for unknown types using expression trees and benchmark it against PropertyInfo.GetValue</code>. <b>Where AI goes wrong:</b> it passes ${C('BindingFlags.NonPublic')} without ${C('Instance')} (empty result), relies on member order, forgets ${C('TargetInvocationException')} wrapping, and calls reflection in a hot loop without caching. It also produces code that silently breaks under trimming/AOT. <b>What you must still own:</b> deciding whether reflection is needed at all, caching, and the trimming story for your deployment.</p>`,
    problems: [{
      title: 'Generic Object Dumper',
      level: 'Easy', tags: ['reflection', 'PropertyInfo', 'BindingFlags'], companies: ['Microsoft', 'Infosys'],
      statement: `<p>Write ${C('static string DumpObject(object o)')} that returns ${C('"Name=value"')} pairs for every <b>public instance property</b> of any object, in declaration order, joined by ${C('", "')}. Private fields and static properties must not appear; numbers use the invariant culture. Then ${C('Dump(int id, string name, double price)')} builds a ${C('Product')} and returns ${C('DumpObject(product)')}.</p>`,
      constraints: `Product has public properties Id (int), Name (string), Price (double), a private field and a static property. Name may be empty.`,
      example: `<p>${C('Dump(1, "pen", 2.5)')} → ${H.c('g', '"Id=1, Name=pen, Price=2.5"')}</p>`,
      brute: { why: `<p>Hard-coding ${C('$"Id={p.Id}, Name={p.Name}, Price={p.Price}"')} works for one class only; every new class needs a new method and every new property is forgotten. Reflection writes it once for all types.</p>`, code: `
class Product { public int Id { get; set; } public string Name { get; set; } = ""; public double Price { get; set; } }
static class Manual
{
    public static string Dump(Product p) => $"Id={p.Id}, Name={p.Name}, Price={p.Price}";
}` },
      mcq: { q: 'Which call returns the public instance properties only?', options: ['<code>GetProperties(BindingFlags.Public | BindingFlags.Instance)</code>', '<code>GetProperties(BindingFlags.Public)</code>', '<code>GetProperties(BindingFlags.Instance)</code>', '<code>GetFields()</code>'], answer: 0, explain: 'With explicit flags you must give both a visibility (Public/NonPublic) and a scope (Instance/Static); otherwise nothing matches.' },
      hints: [`<p>Hint 1: ${C('o.GetType()')} gives the run-time type; ${C('GetProperties(BindingFlags.Public | BindingFlags.Instance)')} filters out statics.</p>`, `<p>Hint 2: order is not guaranteed — ${C('OrderBy(p => p.MetadataToken)')} restores declaration order.</p>`, `<p>Hint 3: format values with ${C('Convert.ToString(value, CultureInfo.InvariantCulture)')} so 2.5 never becomes "2,5".</p>`],
      tests: { sig: 'int string double -> string', fn: 'dump', cases: [
        [[1, 'pen', 2.5], 'Id=1, Name=pen, Price=2.5'],
        [[0, '', 0], 'Id=0, Name=, Price=0'],
        [[-5, 'a b', 0.001], 'Id=-5, Name=a b, Price=0.001'],
        [[2147483647, 'max', 100], 'Id=2147483647, Name=max, Price=100'],
        [[42, 'Ünï', -1.25], 'Id=42, Name=Ünï, Price=-1.25'],
        [[7, 'x=1, y=2', 3.75], 'Id=7, Name=x=1, y=2, Price=3.75']
      ] },
      solution: {
        approach: `<p>Get the run-time type, ask for public instance properties, sort them by metadata token, read each value with ${C('GetValue')} and format it with the invariant culture.</p>`,
        code: `
using System.Globalization;
using System.Reflection;

public class Solution
{
    public static string Dump(int id, string name, double price) =>
        DumpObject(new Product { Id = id, Name = name, Price = price });

    public static string DumpObject(object o)
    {
        var props = o.GetType()
                     .GetProperties(BindingFlags.Public | BindingFlags.Instance)
                     .OrderBy(p => p.MetadataToken);
        return string.Join(", ", props.Select(p =>
            $"{p.Name}={Convert.ToString(p.GetValue(o), CultureInfo.InvariantCulture)}"));
    }
}

public class Product
{
    private readonly string _internalCode = "X-1";        // private: not dumped
    public static int Created { get; set; }               // static: not dumped
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public double Price { get; set; }
    public override string ToString() => _internalCode;
}`,
        dry: { head: ['step', 'value'], rows: [['GetType()', 'Product'], ['GetProperties(Public | Instance)', 'Id, Name, Price (Created is static, _internalCode is a field)'], ['sort by MetadataToken', 'Id, Name, Price'], ['format', '"Id=1", "Name=pen", "Price=2.5"'], ['join', '"Id=1, Name=pen, Price=2.5"']] },
        complexity: `<p>O(P) per object for P properties, plus the one-off metadata lookup. In a serializer you would cache the sorted PropertyInfo[] per Type.</p>`,
        followUps: ['Cache the property list per type in a <code>ConcurrentDictionary&lt;Type, PropertyInfo[]&gt;</code>.', 'Recurse into nested objects and stop on cycles.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Custom attributes
     ====================================================================== */
  var T2_CODE = [
    '[AttributeUsage(AttributeTargets.Property)]',
    'class MaxLenAttribute(int max) : Attribute { public int Max => max; }',
    'class User { [MaxLen(5)] public string Code { get; set; } = ""; }',
    '',
    'var u = new User { Code = "TOOLONG" };',
    'foreach (var pi in typeof(User).GetProperties())',
    '{',
    '    var a = pi.GetCustomAttribute<MaxLenAttribute>();',
    '    if (a != null && ((string)pi.GetValue(u)!).Length > a.Max)',
    '        Console.WriteLine($"{pi.Name}: longer than {a.Max}");',
    '}'
  ].join('\n');
  topics.push({
    title: 'Custom Attributes: Metadata Your Framework Reads',
    analogy: `<p>Airport staff tie coloured tags to suitcases: <b>FRAGILE</b>, <b>PRIORITY</b>, <b>HEAVY</b>. The tag does nothing by itself — the suitcase is the same suitcase. But the baggage handlers <b>read</b> the tags and change how they treat each bag. A C# <b>attribute</b> is such a tag on a class, property or method. ${C('[Required]')} does not validate anything; a validator that <b>reads</b> the tag with reflection does.</p>`,
    explain: `<p>An attribute is a class that derives from ${C('System.Attribute')}. Writing ${C('[MaxLen(5)]')} stores "construct a MaxLenAttribute with argument 5" in the assembly's <b>CustomAttribute</b> metadata table. Nothing runs at that point — the object is created only when someone asks for it with reflection.</p>
<h4>1. Declaring an attribute</h4>
${P(`
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, AllowMultiple = false, Inherited = true)]
public sealed class MaxLenAttribute : Attribute
{
    public MaxLenAttribute(int max) => Max = max;   // positional argument
    public int Max { get; }
    public string? Message { get; set; }             // named argument: [MaxLen(5, Message = "...")]
}`)}
${H.table(['Rule', 'Detail'], [
  ['Name suffix', 'The class is ' + C('MaxLenAttribute') + '; you may write ' + C('[MaxLen]') + ' or ' + C('[MaxLenAttribute]') + '.'],
  ['Arguments', 'Must be compile-time constants: numbers, strings, bool, enums, ' + C('typeof(X)') + ', or 1-D arrays of those. No ' + C('new DateTime(...)') + ', no lambdas.'],
  ['Positional vs named', 'Constructor parameters are positional; public settable properties/fields can be set by name.'],
  ['AttributeUsage', 'Targets (class, method, property, parameter, return…), AllowMultiple, Inherited.'],
  ['Generic attributes', 'C# 11 allows ' + C('class TypeAttr<T> : Attribute') + ' so you can write ' + C('[TypeAttr<int>]') + ' instead of ' + C('[TypeAttr(typeof(int))]') + '.']
])}
<h4>2. Reading attributes</h4>
${P(`
var a = prop.GetCustomAttribute<MaxLenAttribute>();       // null if absent (throws if several)
var all = prop.GetCustomAttributes<RuleAttribute>();       // includes derived attribute types
bool has = prop.IsDefined(typeof(ObsoleteAttribute));       // cheap check, no object created`)}
<p>Each ${C('GetCustomAttribute')} call <b>constructs new attribute objects</b> from the stored blob, so read them once and cache the result.</p>
<h4>3. Attributes the compiler itself understands</h4>
${H.table(['Attribute', 'Effect'], [
  [C('[Obsolete("use X", error: true)]'), 'warning or error at every call site'],
  [C('[Conditional("DEBUG")]'), 'calls are removed when the symbol is not defined'],
  [C('[CallerMemberName] / [CallerLineNumber]'), 'compiler fills optional parameters with the caller name/line'],
  [C('[Flags]'), 'changes ' + C('Enum.ToString()') + ' to print combinations'],
  [C('[NotNullWhen(true)]'), 'nullable-analysis hints for the compiler'],
  [C('[MethodImpl(MethodImplOptions.AggressiveInlining)]'), 'a hint for the JIT']
])}
<p>Some "attributes" are <b>pseudo-attributes</b> that become flags in metadata rather than CustomAttribute rows (${C('[Serializable]')}, ${C('[StructLayout]')}, ${C('[DllImport]')}).</p>`,
    clues: ['"mark properties as required / ignored / renamed" — declarative configuration', 'the behaviour belongs to a framework that must not know your classes', 'the same rule appears on many classes (validation, mapping, routing, permissions)'],
    code: [{ lang: 'csharp', run: true, title: 'An attribute-driven validator (runnable)', code: `
using System.Reflection;

var bad = new SignUp { Email = "", Age = 200, Code = "TOOLONG" };
foreach (string e in Validator.Validate(bad)) Console.WriteLine(e);
// Email: required
// Age: must be between 13 and 120
// Code: max length 5
Console.WriteLine(Validator.Validate(new SignUp { Email = "a@b.c", Age = 30, Code = "OK" }).Count); // 0

[AttributeUsage(AttributeTargets.Property)]
abstract class RuleAttribute : Attribute { public abstract string? Check(object? value); }

sealed class NotEmptyAttribute : RuleAttribute
{
    public override string? Check(object? v) => string.IsNullOrEmpty(v as string) ? "required" : null;
}
sealed class BetweenAttribute(int lo, int hi) : RuleAttribute
{
    public override string? Check(object? v) => v is int n && (n < lo || n > hi) ? $"must be between {lo} and {hi}" : null;
}
sealed class MaxLenAttribute(int max) : RuleAttribute
{
    public override string? Check(object? v) => v is string s && s.Length > max ? $"max length {max}" : null;
}

class SignUp
{
    [NotEmpty] public string Email { get; set; } = "";
    [Between(13, 120)] public int Age { get; set; }
    [MaxLen(5)] public string Code { get; set; } = "";
}

static class Validator
{
    public static List<string> Validate(object o)
    {
        var errors = new List<string>();
        foreach (var p in o.GetType().GetProperties().OrderBy(p => p.MetadataToken))
            foreach (var rule in p.GetCustomAttributes<RuleAttribute>())
                if (rule.Check(p.GetValue(o)) is string msg) errors.Add($"{p.Name}: {msg}");
        return errors;
    }
}` }],
    codeTitle: ['Validator'],
    viz: {
      title: 'An attribute is stored, then read by reflection',
      gen: function () {
        return codeFrames(T2_CODE, [
          { l: [1, 2], narr: 'Declaring the attribute class. <code>AttributeUsage</code> says it may only be placed on properties. A primary constructor (C# 12) captures <code>max</code>.' },
          { l: 3, narr: 'Applying it. The compiler checks the argument is a constant and stores a <b>blob</b> in the CustomAttribute table: (owner = User.Code, ctor = MaxLenAttribute(int), args = 5). No object exists yet.', extra: [{ type: 'table', label: 'CustomAttribute metadata row', columns: ['Parent', 'Constructor', 'Value blob'], rows: [['Property User.Code', 'MaxLenAttribute::.ctor(int32)', '01 00 05 00 00 00 00 00']] }] },
          { l: 5, v: { u: 'User { Code = "TOOLONG" }' }, narr: 'Create an object with an invalid value. Still nothing checks it — attributes are passive.' },
          { l: 6, v: { pi: 'Code' }, narr: 'The validator walks the properties using reflection.' },
          { l: 8, v: { pi: 'Code', a: 'new MaxLenAttribute(5)' }, hv: { a: 'ok' }, narr: 'Now the runtime decodes the blob and <b>runs the attribute constructor</b>, creating a fresh object. A second call would create another one — cache it.' },
          { l: 9, v: { value: '"TOOLONG"', length: 7, max: 5 }, hv: { length: 'bad' }, narr: 'The validator compares the value with the rule: 7 &gt; 5.' },
          { l: 10, out: 'Code: longer than 5', narr: 'The framework, not the attribute, produced the behaviour. That separation is why ASP.NET can validate classes it has never seen.' }
        ]);
      }
    },
    examples: [
      { title: 'AllowMultiple and Inherited', html: `<p>${C('[Role("admin")] [Role("ops")]')} needs ${C('AllowMultiple = true')}, otherwise error CS0579 "Duplicate attribute". ${C('Inherited = true')} (the default) means ${C('GetCustomAttributes(inherit: true)')} on a derived class also returns attributes declared on the base class or on an overridden virtual member.</p>` },
      { title: 'CallerMemberName for INotifyPropertyChanged', html: `<p>The compiler fills the argument, so a property setter never repeats its own name as a string.</p>`, code: `
using System.ComponentModel;
using System.Runtime.CompilerServices;

class ViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler? PropertyChanged;
    private string _title = "";
    public string Title { get => _title; set { _title = value; Raise(); } }   // Raise("Title")
    void Raise([CallerMemberName] string name = "") =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}` },
      { title: 'Generic attribute (C# 11)', html: `<p>Before C# 11 you wrote ${C('[Converter(typeof(MoneyConverter))]')} and checked at run time that the type was right. A generic attribute moves the check to compile time.</p>`, code: `
[AttributeUsage(AttributeTargets.Property)]
sealed class ConverterAttribute<T> : Attribute where T : new() { public T Create() => new T(); }

class MoneyConverter { }
class Order { [Converter<MoneyConverter>] public decimal Total { get; set; } }` }
    ],
    deepDive: `<p><b>Storage format.</b> A CustomAttribute row holds (parent token, constructor token, value blob). The blob starts with the prolog ${C('0x0001')}, then the fixed arguments in constructor order, then a count of named arguments each tagged FIELD (0x53) or PROPERTY (0x54). That is why arguments must be constants — they are serialized into bytes at compile time. ${C('CustomAttributeData.GetCustomAttributes(member)')} reads these rows <b>without</b> running constructors, which is safer for tools and works in ${C('MetadataLoadContext')}.</p>
<p><b>Performance.</b> ${C('GetCustomAttribute')} allocates new objects and an array per call; ASP.NET and System.Text.Json read attributes once when building their per-type metadata and cache it. ${C('IsDefined')} avoids creating objects. Sealing attribute classes speeds lookups because the runtime does not need to check for derived attribute types.</p>
<p><b>Source generators read attributes too.</b> ${C('[JsonSerializable(typeof(Order))]')}, ${C('[LoggerMessage]')}, ${C('[GeneratedRegex]')} and ${C('[LibraryImport]')} are read by the compiler during the build; the generated code then needs no reflection at run time, which makes it trimming- and AOT-friendly.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a rule attribute and its validator is a one-prompt task. <b>Use AI as a partner:</b> ask it to list edge cases (null strings, inherited properties, multiple rules on one property, indexers). <b>Where AI goes wrong:</b> it passes non-constant arguments (${C('[Range(0, int.Parse("5"))]')}), forgets ${C('AttributeUsage')}, calls ${C('GetCustomAttribute')} inside per-request loops, and mixes up ${C('System.ComponentModel.DataAnnotations')} attributes with its own invented names. <b>What you must still own:</b> where validation belongs, whether rules should be attributes or code (fluent rules are easier to test and compose), and caching.</p>`,
    problems: [{
      title: 'Attribute-Driven Validator',
      level: 'Medium', tags: ['attributes', 'reflection', 'validation'], companies: ['Microsoft', 'Accenture', 'Deloitte'],
      statement: `<p>Create attributes ${C('[NotEmpty]')}, ${C('[Between(lo, hi)]')} and ${C('[MaxLen(n)]')} deriving from an abstract ${C('RuleAttribute')} with ${C('string? Check(object? value)')}. Apply them to a ${C('Form')} class with properties ${C('Name')} (NotEmpty, MaxLen 10), ${C('Age')} (Between 18..99) and ${C('Code')} (MaxLen 3). ${C('Validate(name, age, code)')} returns all error messages as ${C('"Prop: message"')} in declaration order (rules in the order they are written). Messages: ${C('"required"')}, ${C('"out of range lo..hi"')}, ${C('"max n chars"')}.</p>`,
      constraints: `name and code may be null or empty; age is any int. A null code is valid (only length is checked).`,
      example: `<p>${C('Validate("", 5, "ABCD")')} → ${H.c('g', '["Name: required", "Age: out of range 18..99", "Code: max 3 chars"]')}</p>`,
      brute: { why: `<p>An ${C('if')} chain inside ${C('Form')} works, but every form repeats the same checks and the rules are invisible to anything else (UI hints, API docs). Attributes keep the rules declarative and reusable.</p>`, code: `
static class FormChecks
{
    public static List<string> Validate(string? name, int age, string? code)
    {
        var e = new List<string>();
        if (string.IsNullOrEmpty(name)) e.Add("Name: required");
        if (name != null && name.Length > 10) e.Add("Name: max 10 chars");
        if (age < 18 || age > 99) e.Add("Age: out of range 18..99");
        if (code != null && code.Length > 3) e.Add("Code: max 3 chars");
        return e;
    }
}` },
      mcq: { q: 'When is the constructor of <code>BetweenAttribute</code> executed?', options: ['When reflection asks for the attribute (GetCustomAttribute/GetCustomAttributes)', 'When the Form class is loaded', 'When a Form object is constructed', 'At compile time only'], answer: 0, explain: 'The compiler only stores the constructor and arguments as a blob. The runtime runs the constructor each time the attribute is requested.' },
      hints: [`<p>Hint 1: make ${C('RuleAttribute')} abstract with ${C('[AttributeUsage(AttributeTargets.Property, AllowMultiple = true)]')}; ${C('GetCustomAttributes<RuleAttribute>()')} returns every derived rule.</p>`, `<p>Hint 2: sort properties by ${C('MetadataToken')}; attributes on one property come back in source order in practice, but to be safe you can sort them by an ${C('Order')} value.</p>`, `<p>Hint 3: use pattern matching in ${C('Check')}: ${C('v is int n && (n < lo || n > hi)')}, ${C('v is string s && s.Length > max')}.</p>`],
      tests: { sig: 'string int string -> string[]', fn: 'validate', cases: [
        [['', 5, 'ABCD'], ['Name: required', 'Age: out of range 18..99', 'Code: max 3 chars']],
        [['Asha', 30, 'IN'], []],
        [[null, 18, null], ['Name: required']],
        [['Bartholomew', 99, 'XYZ'], ['Name: max 10 chars']],
        [['Li', 100, ''], ['Age: out of range 18..99']],
        [['Ravi', -2147483648, 'ABC'], ['Age: out of range 18..99']],
        [['ExactlyTen', 17, 'ABCDE'], ['Age: out of range 18..99', 'Code: max 3 chars']]
      ] },
      solution: {
        approach: `<p>All rules share one abstract attribute base. The validator walks properties in declaration order, asks each for its rule attributes, and collects every non-null message. Adding a new rule means adding one attribute class — the validator never changes (open/closed principle).</p>`,
        code: `
using System.Reflection;

public class Solution
{
    public static string[] Validate(string? name, int age, string? code)
    {
        var form = new Form { Name = name, Age = age, Code = code };
        var errors = new List<string>();
        foreach (var p in typeof(Form).GetProperties().OrderBy(p => p.MetadataToken))
            foreach (var rule in p.GetCustomAttributes<RuleAttribute>().OrderBy(r => r.Order))
                if (rule.Check(p.GetValue(form)) is string msg)
                    errors.Add($"{p.Name}: {msg}");
        return errors.ToArray();
    }
}

[AttributeUsage(AttributeTargets.Property, AllowMultiple = true)]
public abstract class RuleAttribute : Attribute
{
    public int Order { get; set; }
    public abstract string? Check(object? value);
}

public sealed class NotEmptyAttribute : RuleAttribute
{
    public override string? Check(object? v) => string.IsNullOrEmpty(v as string) ? "required" : null;
}

public sealed class BetweenAttribute(int lo, int hi) : RuleAttribute
{
    public override string? Check(object? v) =>
        v is int n && (n < lo || n > hi) ? $"out of range {lo}..{hi}" : null;
}

public sealed class MaxLenAttribute(int max) : RuleAttribute
{
    public override string? Check(object? v) =>
        v is string s && s.Length > max ? $"max {max} chars" : null;
}

public class Form
{
    [NotEmpty(Order = 0), MaxLen(10, Order = 1)] public string? Name { get; set; }
    [Between(18, 99)] public int Age { get; set; }
    [MaxLen(3)] public string? Code { get; set; }
}`,
        dry: { head: ['property', 'rule', 'value', 'message'], rows: [['Name', 'NotEmpty', '""', 'required'], ['Name', 'MaxLen(10)', '""', '—'], ['Age', 'Between(18, 99)', '5', 'out of range 18..99'], ['Code', 'MaxLen(3)', '"ABCD"', 'max 3 chars']] },
        complexity: `<p>O(P·R) for P properties and R rules. Cache the (PropertyInfo, rules[]) list per type to avoid re-creating attribute objects on every call.</p>`,
        followUps: ['Allow a custom <code>Message</code> named argument on every rule.', 'Return errors as a dictionary keyed by property, like ASP.NET ModelState.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Generic variance
     ====================================================================== */
  var T3_CODE = [
    'IEnumerable<string> names = new List<string> { "a", "bb" };',
    'IEnumerable<object> objs = names;          // OK: out T (covariant)',
    'Action<object> log = o => Console.WriteLine(o);',
    'Action<string> logS = log;                 // OK: in T (contravariant)',
    '// List<object> bad = new List<string>(); // CS0029: List<T> is invariant',
    'object[] arr = new string[2];              // arrays: covariant (unsafe)',
    'arr[0] = "ok";',
    'arr[1] = 42;                               // ArrayTypeMismatchException'
  ].join('\n');
  topics.push({
    title: 'Generic Variance: in, out and the Array Trap',
    analogy: `<p>A fruit stall gives you a <b>basket you may only take from</b>. If it is a basket of mangoes, it is also fine as "a basket of fruit" — whatever you take out is a fruit. That is <b>covariance</b> (${C('out')}). Now think of a <b>juicer you may only put into</b>. A juicer that accepts any fruit is also fine as "a mango juicer" — every mango you put in is a fruit. That is <b>contravariance</b> (${C('in')}). But a basket you can both take from <b>and</b> put into cannot be either: if you treat a mango basket as a fruit basket, someone may put a banana in it. That basket is <b>invariant</b> — like ${C('List<T>')}.</p>`,
    explain: `<p>Variance answers: if ${C('Derived')} converts to ${C('Base')}, does ${C('G<Derived>')} convert to ${C('G<Base>')}?</p>
${H.table(['Kind', 'Keyword', 'Direction', 'Allowed positions of T', 'Examples'], [
  ['Covariant', C('out T'), C('G<Derived> → G<Base>'), 'outputs only (return types, get-only)', C('IEnumerable<out T>') + ', ' + C('IReadOnlyList<out T>') + ', ' + C('Func<out TResult>')],
  ['Contravariant', C('in T'), C('G<Base> → G<Derived>'), 'inputs only (parameters)', C('IComparer<in T>') + ', ' + C('IEqualityComparer<in T>') + ', ' + C('Action<in T>')],
  ['Invariant', '(none)', 'no conversion', 'anywhere', C('List<T>') + ', ' + C('IList<T>') + ', ' + C('Dictionary<K,V>')]
])}
<h4>1. Rules</h4>
<ul>
<li>Variance can be declared only on <b>interfaces and delegates</b>, never on classes or structs.</li>
<li>It works only for <b>reference</b> type arguments: ${C('IEnumerable<int>')} does <b>not</b> convert to ${C('IEnumerable<object>')}, because an int must be boxed and the conversion would have to change the representation.</li>
<li>The compiler checks <b>safety</b>: an ${C('out T')} cannot appear as a method parameter (error CS1961 "Invalid variance").</li>
<li>${C('Func<in T, out TResult>')} mixes both: a ${C('Func<object, string>')} is usable as ${C('Func<string, object>')}.</li>
</ul>
<h4>2. Why List&lt;T&gt; cannot be covariant</h4>
${P(`
List<string> s = new();
List<object> o = s;     // imagine this compiled...
o.Add(42);              // ...now a List<string> contains an int`)}
<p>${C('IReadOnlyList<out T>')} is covariant because it has no ${C('Add')}. That is a design reason to accept ${C('IReadOnlyList<Animal>')} or ${C('IEnumerable<Animal>')} in your APIs: callers with a ${C('List<Dog>')} can pass it directly.</p>
<h4>3. Arrays: covariance with a run-time check</h4>
<p>For Java compatibility, the CLR made reference arrays covariant: ${C('object[] a = new string[2]')} compiles. Writes are then checked at run time and a wrong element throws ${C('ArrayTypeMismatchException')}. Every store into an array of a non-sealed reference type pays for that check — one reason ${C('List<T>')} and ${C('Span<T>')} are preferred.</p>`,
    clues: ['a method takes ' + C('List<Animal>') + ' and callers have ' + C('List<Dog>') + ' → accept ' + C('IEnumerable<Animal>') + ' / ' + C('IReadOnlyList<Animal>'), 'a comparer or handler for a base type should work for derived types → ' + C('in'), 'error CS1961 "Invalid variance" when declaring your own interface', C('ArrayTypeMismatchException') + ' at run time'],
    code: [{ lang: 'csharp', run: true, title: 'Covariance, contravariance and the array trap (runnable)', code: `
List<Dog> dogs = new() { new Dog("Rex"), new Dog("Bo") };

PrintAll(dogs);                           // IEnumerable<out T>: List<Dog> -> IEnumerable<Animal>

IComparer<Animal> byName = Comparer<Animal>.Create((a, b) => string.CompareOrdinal(a.Name, b.Name));
dogs.Sort(byName);                        // IComparer<in T>: IComparer<Animal> used as IComparer<Dog>
Console.WriteLine(string.Join(",", dogs.Select(d => d.Name)));   // Bo,Rex

Func<Animal, string> describe = a => a.Name.ToUpper();
Func<Dog, object> asDogToObject = describe;  // in on the parameter, out on the result
Console.WriteLine(asDogToObject(dogs[0]));   // BO

IProducer<Dog> dp = new DogShelter();
IProducer<Animal> ap = dp;                // our own covariant interface
Console.WriteLine(ap.Produce().Name);     // Puppy

Animal[] animals = new Dog[1];            // array covariance compiles...
try { animals[0] = new Cat("Tom"); }      // ...but the store is checked at run time
catch (ArrayTypeMismatchException) { Console.WriteLine("ArrayTypeMismatchException"); }

static void PrintAll(IEnumerable<Animal> xs) { foreach (var a in xs) Console.Write(a.Name + " "); Console.WriteLine(); }

record Animal(string Name);
record Dog(string Name) : Animal(Name);
record Cat(string Name) : Animal(Name);

interface IProducer<out T> { T Produce(); }   // T only in output positions
class DogShelter : IProducer<Dog> { public Dog Produce() => new Dog("Puppy"); }` }],
    codeTitle: ['Variance in action'],
    viz: {
      title: 'Which conversions compile, and which fail at run time',
      gen: function () {
        var g = function (hl, ehl) {
          return { type: 'graph', directed: true, height: 46, nodes: [
            { id: 'IA', label: 'IEnumerable<object>', x: 18, y: 8, shape: 'box' }, { id: 'IS', label: 'IEnumerable<string>', x: 18, y: 38, shape: 'box' },
            { id: 'AS', label: 'Action<string>', x: 52, y: 8, shape: 'box' }, { id: 'AO', label: 'Action<object>', x: 52, y: 38, shape: 'box' },
            { id: 'LO', label: 'List<object>', x: 84, y: 8, shape: 'box' }, { id: 'LS', label: 'List<string>', x: 84, y: 38, shape: 'box' }],
            edges: [['IS', 'IA', 'out'], ['AO', 'AS', 'in'], ['LS', 'LO', '✗']], hl: hl || {}, ehl: ehl || {} };
        };
        return codeFrames(T3_CODE, [
          { l: 1, extra: [g({ IS: 'cur' })], narr: 'A List&lt;string&gt; viewed as IEnumerable&lt;string&gt; — an ordinary interface conversion.' },
          { l: 2, extra: [g({ IS: 'ok', IA: 'ok' }, { 'IS-IA': 'ok' })], narr: '<b>Covariance.</b> IEnumerable is declared <code>out T</code>: you can only take strings out, and every string is an object. Same reference, no copy.' },
          { l: [3, 4], extra: [g({ AO: 'ok', AS: 'ok' }, { 'AO-AS': 'ok' })], narr: '<b>Contravariance.</b> An action that accepts any object can safely be used where an action for strings is needed — the arrow goes the other way.' },
          { l: 5, cls: 'bad', extra: [g({ LS: 'bad', LO: 'bad' }, { 'LS-LO': 'bad' })], narr: 'List&lt;T&gt; is a class and has both Add(T) and T this[int]: <b>invariant</b>. The compiler refuses (CS0029), protecting you from adding an int to a list of strings.' },
          { l: 6, v: { arr: 'string[2] seen as object[]' }, narr: 'Arrays are the exception: reference arrays are covariant for historical (Java) reasons. This compiles.' },
          { l: 7, v: { 'arr[0]': '"ok"' }, hv: { 'arr[0]': 'ok' }, narr: 'Every store into the array is checked at run time against the real element type (string). "ok" passes.' },
          { l: 8, cls: 'bad', v: { 'arr[1]': '42 → ArrayTypeMismatchException' }, hv: { 'arr[1]': 'bad' }, narr: 'Storing a boxed int fails at <b>run time</b>. Generic variance would have stopped this at compile time.' }
        ]);
      }
    },
    examples: [
      { title: 'Declaring your own variant interface', html: `<p>${C('interface IRepository<out T> { T Get(int id); void Add(T item); }')} fails with CS1961: T appears as an input of ${C('Add')}. Split the interface: ${C('IReader<out T>')} (Get) and ${C('IWriter<in T>')} (Add); a class can implement both.</p>` },
      { title: 'Variance does not work for value types', html: `<p>${C('IEnumerable<int> xs = new List<int>(); IEnumerable<object> o = xs;')} is error CS0266. Variance is a "same bits, different static type" conversion; an int is not an object reference until it is boxed. Use ${C('xs.Cast<object>()')}, which boxes each element.</p>` },
      { title: 'Delegate variance vs method group conversion', html: `<p>Method group conversion is even more flexible than delegate variance: ${C('Func<Dog, object> f = Describe;')} works for ${C('string Describe(Animal a)')} directly. But converting an existing ${C('Func<Animal, string>')} <b>variable</b> uses variance, which requires reference types.</p>`, code: `
static string Describe(object o) => o.ToString() ?? "";
Func<string, object> f1 = Describe;     // method group: parameter and return relaxed
Func<object, string> f0 = Describe;
Func<string, object> f2 = f0;           // delegate variance on an existing delegate
Console.WriteLine($"{f1("x")}{f2("y")}");` }
    ],
    deepDive: `<p><b>How the CLR does it.</b> Variance annotations are stored as flags on the generic parameter in metadata (the CLR supported them since .NET 2.0; C# exposed them in C# 4). A variant conversion is a pure reference conversion — the object is the same; ${C('castclass')} and ${C('isinst')} check variance compatibility using the type's interface map. Casting to a variant interface is therefore a bit slower than to an invariant one, because the runtime may need to search compatible instantiations.</p>
<p><b>Array covariance cost.</b> The JIT emits a call to a store helper (${C('stelem.ref')} → a type check) for writes into arrays whose element type is a non-sealed reference type. For ${C('sealed')} element types or value types the check is skipped. Performance-sensitive code sometimes wraps references in a struct to avoid it.</p>
<p><b>Ambiguity.</b> A class implementing both ${C('IEnumerable<Dog>')} and ${C('IEnumerable<Cat>')} converted to ${C('IEnumerable<Animal>')} is ambiguous; the runtime picks one deterministically but the result is surprising — avoid such designs. In Java, the equivalent is use-site variance (${C('? extends T')}, ${C('? super T')}); C# chose declaration-site variance, so the interface author decides once.</p>`,
    aiEra: `<p><b>What AI changes:</b> it suggests the right interface (${C('IEnumerable')} vs ${C('IList')}) when you describe intent. <b>Use AI as a partner:</b> paste a CS1961 error and ask which members break variance. <b>Where AI goes wrong:</b> it claims ${C('List<T>')} is covariant, suggests variance on classes, or expects ${C('IEnumerable<int>')} to convert to ${C('IEnumerable<object>')}. <b>What you must still own:</b> API design — accepting the most general read-only interface and returning the most specific useful type.</p>`,
    problems: [{
      title: 'Covariant Shape Producers',
      level: 'Easy', tags: ['variance', 'generics', 'interfaces'], companies: ['Microsoft', 'Unity'],
      statement: `<p>Declare ${C('interface IProducer<out T> { T Next(); }')} and records ${C('Shape')} (abstract ${C('double Area')}), ${C('Circle(double R)')} and ${C('Square(double S)')}. Write producers that hand out circles and squares from arrays. ${C('TotalArea(double[] radii, double[] sides)')} must put an ${C('IProducer<Circle>')} and an ${C('IProducer<Square>')} into one ${C('List<IProducer<Shape>>')} (covariance) and return the total area of everything produced.</p>`,
      constraints: `0 ≤ lengths ≤ 1000, 0 ≤ values ≤ 10<sup>3</sup>. Circle area = π·r², square area = s².`,
      example: `<p>${C('TotalArea([1], [2])')} → π + 4 ≈ ${H.c('g', '7.141592653589793')}</p>`,
      brute: { why: `<p>Without ${C('out')}, ${C('IProducer<Circle>')} does not convert to ${C('IProducer<Shape>')}, so people write two loops or cast every element. Covariance lets one loop handle every producer.</p>`, code: `
static class NoVariance
{
    public static double Total(double[] radii, double[] sides)
    {
        double t = 0;
        foreach (var r in radii) t += Math.PI * r * r;
        foreach (var s in sides) t += s * s;
        return t;
    }
}` },
      mcq: { q: 'Which member would make <code>IProducer&lt;out T&gt;</code> fail to compile?', options: ['<code>void Push(T item);</code>', '<code>T Next();</code>', '<code>int Count { get; }</code>', '<code>IEnumerable&lt;T&gt; All();</code>'], answer: 0, explain: 'An out (covariant) parameter may not appear in an input position. IEnumerable&lt;T&gt; as a return type is fine because IEnumerable is itself covariant.' },
      hints: [`<p>Hint 1: ${C('abstract record Shape { public abstract double Area { get; } }')}; derived records override it.</p>`, `<p>Hint 2: a producer can wrap an array and an index, with ${C('bool HasNext')} and ${C('T Next()')}.</p>`, `<p>Hint 3: ${C('var list = new List<IProducer<Shape>> { circles, squares };')} compiles only because of ${C('out T')}.</p>`],
      tests: { sig: 'double[] double[] -> double', fn: 'totalArea', cmp: 'float', cases: [
        [[[1], [2]], 7.141592653589793],
        [[[], []], 0],
        [[[0], [0]], 0],
        [[[], [1, 2, 3]], 14],
        [[[2, 3], []], 40.840704496667314],
        [[[1000], [1000]], 4141592.653589793],
        [[[0.5, 0.5], [0.5]], 1.8207963267948966]
      ] },
      solution: {
        approach: `<p>Declare the interface covariant, so every ${C('IProducer<Circle>')} and ${C('IProducer<Square>')} is an ${C('IProducer<Shape>')}. One loop then drains every producer and sums ${C('Area')} through the virtual property.</p>`,
        code: `
public class Solution
{
    public static double TotalArea(double[] radii, double[] sides)
    {
        IProducer<Circle> circles = new ArrayProducer<Circle>(radii.Select(r => new Circle(r)).ToArray());
        IProducer<Square> squares = new ArrayProducer<Square>(sides.Select(s => new Square(s)).ToArray());
        var all = new List<IProducer<Shape>> { circles, squares };   // covariance
        double total = 0;
        foreach (var p in all)
            while (p.HasNext) total += p.Next().Area;
        return total;
    }
}

public interface IProducer<out T>
{
    bool HasNext { get; }
    T Next();
}

public sealed class ArrayProducer<T>(T[] items) : IProducer<T>
{
    private int _i;
    public bool HasNext => _i < items.Length;
    public T Next() => items[_i++];
}

public abstract record Shape { public abstract double Area { get; } }
public record Circle(double R) : Shape { public override double Area => Math.PI * R * R; }
public record Square(double S) : Shape { public override double Area => S * S; }`,
        dry: { head: ['producer', 'static type in list', 'items', 'running total'], rows: [['circles', 'IProducer&lt;Shape&gt;', 'Circle(1)', '3.14159'], ['squares', 'IProducer&lt;Shape&gt;', 'Square(2)', '7.14159']] },
        complexity: `<p>O(n + m) time; the conversion itself is free — it is the same reference.</p>`,
        followUps: ['Add a contravariant <code>IConsumer&lt;in T&gt;</code> that accepts shapes and use an <code>IConsumer&lt;Shape&gt;</code> as <code>IConsumer&lt;Circle&gt;</code>.', 'Why would <code>ArrayProducer&lt;int&gt;</code> not convert to <code>IProducer&lt;object&gt;</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Static abstract interface members and generic math
     ====================================================================== */
  var T4_CODE = [
    'static T Sum<T>(ReadOnlySpan<T> xs) where T : INumber<T>',
    '{',
    '    T total = T.Zero;                 // static abstract property',
    '    foreach (T x in xs) total += x;   // static abstract operator +',
    '    return total;',
    '}',
    'Console.WriteLine(Sum<int>(new[] { 1, 2, 3 }));        // 6',
    'Console.WriteLine(Sum<double>(new[] { 0.5, 0.25 }));   // 0.75',
    'Console.WriteLine(Sum<decimal>(new[] { 1.1m, 2.2m })); // 3.3'
  ].join('\n');
  topics.push({
    title: 'Static Abstract Interface Members and Generic Math (C# 11)',
    analogy: `<p>A recipe says "add the <b>neutral starting amount</b>, then <b>combine</b> each ingredient". For flour the neutral amount is 0 grams and combine means add; for a spice blend it is an empty jar and combine means mix. The recipe is the same — it only needs every ingredient <b>type</b> to answer two questions: "what is your starting value?" and "how do two of you combine?". Those are questions about the <b>type</b>, not about one bag of flour. Static abstract interface members let an interface ask types such questions, so one generic recipe works for int, double, decimal and your own Money type.</p>`,
    explain: `<p>Before C# 11, interfaces could only describe <b>instance</b> members. Operators (${C('+')}), constants (${C('Zero')}) and factory methods (${C('Parse')}) are <b>static</b>, so ${C('T Sum<T>(T[] xs) { T t = 0; t += x; }')} was impossible — people wrote one overload per numeric type.</p>
<h4>1. The feature</h4>
${P(`
public interface IMonoid<TSelf> where TSelf : IMonoid<TSelf>
{
    static abstract TSelf Empty { get; }
    static abstract TSelf operator +(TSelf a, TSelf b);
}

public readonly record struct Money(decimal Amount) : IMonoid<Money>
{
    public static Money Empty => new(0m);
    public static Money operator +(Money a, Money b) => new(a.Amount + b.Amount);
}

static T Fold<T>(IEnumerable<T> xs) where T : IMonoid<T>
{
    T acc = T.Empty;                 // called on the TYPE parameter
    foreach (var x in xs) acc += x;
    return acc;
}`)}
<ul>
<li>${C('static abstract')} members must be implemented by every implementing type; ${C('static virtual')} members (C# 11) have a default implementation that types may override.</li>
<li>The ${C('TSelf')} pattern (${C('where TSelf : IMonoid<TSelf>')}) lets the interface talk about "my own type" — the curiously recurring template pattern.</li>
<li>You call them through a <b>type parameter</b> (${C('T.Empty')}), not through the interface (${C('IMonoid<Money>.Empty')} is an error) and not through an instance.</li>
<li>Such interfaces cannot be used as ordinary variable types in most cases (error CS8920), because there is no object to dispatch on.</li>
</ul>
<h4>2. Generic math in .NET 7+</h4>
${H.table(['Interface', 'Gives you', 'Implemented by'], [
  [C('INumber<T>'), 'everything below plus comparison, ' + C('Zero') + ', ' + C('One') + ', ' + C('CreateChecked') + '…', 'int, long, double, decimal, Half, BigInteger…'],
  [C('IAdditionOperators<T,T,T>'), C('+'), 'all numbers, also ' + C('DateTime') + ' + TimeSpan style types'],
  [C('IBinaryInteger<T>'), 'bit operations, ' + C('PopCount') + ', ' + C('LeadingZeroCount'), 'integer types only'],
  [C('IFloatingPoint<T>'), C('Floor') + ', ' + C('Round') + ', ' + C('Sqrt') + ' (via IRootFunctions)', 'double, float, decimal, Half'],
  [C('IParsable<T>') + ' / ' + C('ISpanParsable<T>'), C('T.Parse(string, provider)') + ', ' + C('T.TryParse'), 'numbers, Guid, DateTime, your types']
])}
<h4>3. Converting between numeric types</h4>
<p>${C('T.CreateChecked(value)')} throws ${C('OverflowException')} if the value does not fit, ${C('CreateSaturating')} clamps to Min/Max, ${C('CreateTruncating')} wraps. ${C('int.CreateChecked(3.9)')} is 3 (truncation toward zero), ${C('byte.CreateSaturating(300)')} is 255.</p>
<h4>4. Checked operators (C# 11)</h4>
<p>A type can define both ${C('operator +')} and ${C('operator checked +')}; inside a ${C('checked(...)')} context the checked one is used. With generic math, ${C('checked(total + x)')} on ${C('T = int')} throws on overflow exactly like non-generic code.</p>`,
    clues: ['the same algorithm is copy-pasted for int, long, double, decimal', 'a generic method needs ' + C('+') + ', ' + C('0') + ', ' + C('Parse') + ' or another <b>static</b> member of T', '"create a T from a string / from an int" without reflection', 'a factory method on the type itself: ' + C('T.Create(...)')],
    code: [{ lang: 'csharp', run: true, title: 'Generic math and a custom static abstract contract (runnable)', code: `
using System.Numerics;

Console.WriteLine(Sum(new[] { 1, 2, 3 }));                  // 6
Console.WriteLine(Sum(new[] { 0.5, 0.25 }));                 // 0.75
Console.WriteLine(Sum(new[] { 1.1m, 2.2m }));                // 3.3
Console.WriteLine(Average<int, double>(new[] { 1, 2 }));     // 1.5
Console.WriteLine(int.CreateChecked(3.9));                   // 3
Console.WriteLine(byte.CreateSaturating(300));               // 255
try { checked { Sum(new[] { int.MaxValue, 1 }, check: true); } }
catch (OverflowException) { Console.WriteLine("overflow"); }  // overflow

Console.WriteLine(Fold(new[] { new Money(2.5m), new Money(4m) }));   // Money { Amount = 6.5 }
Console.WriteLine(Fold(new[] { new Text("ab"), new Text("cd") }));   // Text { Value = abcd }
Console.WriteLine(ParseAll<int>("1,2,3").Sum());                     // 6

static T Sum<T>(T[] xs, bool check = false) where T : INumber<T>
{
    T total = T.Zero;
    foreach (T x in xs) total = check ? checked(total + x) : total + x;
    return total;
}
static TResult Average<T, TResult>(T[] xs) where T : INumber<T> where TResult : INumber<TResult>
    => TResult.CreateChecked(Sum(xs)) / TResult.CreateChecked(xs.Length);
static T Fold<T>(IEnumerable<T> xs) where T : IMonoid<T>
{
    T acc = T.Empty;
    foreach (var x in xs) acc += x;
    return acc;
}
static List<T> ParseAll<T>(string csv) where T : IParsable<T>
    => csv.Split(',').Select(s => T.Parse(s, null)).ToList();

interface IMonoid<TSelf> where TSelf : IMonoid<TSelf>
{
    static abstract TSelf Empty { get; }
    static abstract TSelf operator +(TSelf a, TSelf b);
}
readonly record struct Money(decimal Amount) : IMonoid<Money>
{
    public static Money Empty => new(0m);
    public static Money operator +(Money a, Money b) => new(a.Amount + b.Amount);
}
readonly record struct Text(string Value) : IMonoid<Text>
{
    public static Text Empty => new("");
    public static Text operator +(Text a, Text b) => new(a.Value + b.Value);
}` }],
    codeTitle: ['Generic math'],
    viz: {
      title: 'One generic Sum, three instantiations',
      gen: function () {
        var inst = function (hl) { return { type: 'table', label: 'What the JIT produces per T', columns: ['T', 'T.Zero', 'operator +', 'native code'], rows: [['int', '0', 'add eax, …', 'own copy (value type)'], ['double', '0.0', 'addsd xmm0, …', 'own copy (value type)'], ['decimal', '0m', 'decimal.op_Addition', 'own copy (value type)']], hl: hl }; };
        return codeFrames(T4_CODE, [
          { l: 1, narr: 'The constraint <code>INumber&lt;T&gt;</code> promises that T has static members like Zero and operator +. Without it, <code>T.Zero</code> would not compile.' },
          { l: 3, v: { T: 'int', total: 0 }, narr: 'Instantiation with int. <code>T.Zero</code> is a <b>static abstract</b> property resolved on the type: int.Zero = 0.', extra: [inst({ 0: 'cur' })] },
          { l: 4, v: { T: 'int', x: 3, total: 6 }, hv: { total: 'ok' }, narr: '<code>total += x</code> calls int\'s operator + — for a value type the JIT compiles a specialised copy where it is a single machine <code>add</code>.', extra: [inst({ 0: 'ok' })] },
          { l: 7, out: '6', narr: 'Returned 6. No boxing, no interface dispatch at run time.' },
          { l: 8, v: { T: 'double', total: 0.75 }, out: '6\n0.75', narr: 'The same source, T = double: a different specialised copy using floating-point addition.', extra: [inst({ 1: 'ok' })] },
          { l: 9, v: { T: 'decimal', total: '3.3m' }, out: '6\n0.75\n3.3', narr: 'T = decimal: calls decimal\'s operator, exact base-10 arithmetic (1.1 + 2.2 = 3.3, not 3.3000000000000003).', extra: [inst({ 2: 'ok' })] }
        ]);
      }
    },
    examples: [
      { title: 'Why not just use dynamic?', html: `<p>${C('dynamic t = 0; t += x;')} works for any numeric type but binds at run time (slow, boxes, fails at run time for wrong types). Generic math is checked at compile time and compiles to the same machine code as a hand-written int loop.</p>` },
      { title: 'A static virtual default', html: `<p>A ${C('static virtual')} member gives a default that implementers may override.</p>`, code: `
interface IHasName<TSelf> where TSelf : IHasName<TSelf>
{
    static virtual string Name => typeof(TSelf).Name;   // default
}
struct Meter : IHasName<Meter> { }
struct Foot : IHasName<Foot> { public static string Name => "ft"; }
static class Show { public static string N<T>() where T : IHasName<T> => T.Name; }` },
      { title: 'Saturating vs checked conversion', html: `<p>Converting a sensor reading (double) to ${C('byte')}: ${C('byte.CreateChecked(300.0)')} throws ${C('OverflowException')}, ${C('byte.CreateSaturating(300.0)')} returns 255, ${C('byte.CreateTruncating(300)')} returns 44 (300 mod 256). Choose deliberately; the old ${C('(byte)300')} cast silently truncates in an unchecked context.</p>` }
    ],
    deepDive: `<p><b>How it runs fast.</b> Static abstract members are resolved through <b>constrained calls</b> (${C('constrained. !!T call IAdditionOperators::op_Addition')}). For value-type instantiations the JIT generates a separate copy of the generic method per type, so the call is resolved at JIT time and usually inlined into a single instruction. For reference-type instantiations code is shared and the runtime looks up the implementation through a generic dictionary — still no reflection.</p>
<p><b>Self-referential constraints</b> (${C('where TSelf : INumber<TSelf>')}) are not enforced to be "exactly self" — a type could lie and implement ${C('IMonoid<OtherType>')}. The BCL relies on convention. Analyzers warn about suspicious implementations.</p>
<p><b>Limits.</b> You cannot call a static abstract member on an interface type directly, and before C# 12/.NET 8 you could not use such interfaces as type arguments freely. Generic math also makes overload resolution and error messages noisy; keep public APIs simple (expose ${C('Sum(int[])')} and implement it with a private generic helper if needed). LINQ's ${C('Sum')}, ${C('Average')}, ${C('Min')}/${C('Max')} on spans use this machinery plus vectorization in .NET 8.</p>`,
    aiEra: `<p><b>What AI changes:</b> it converts duplicated numeric overloads into one generic method quickly. <b>Use AI as a partner:</b> <code>Rewrite these five overloads with INumber&lt;T&gt; and show which conversions need CreateChecked</code>. <b>Where AI goes wrong:</b> it writes ${C('T total = 0')} (CS0029 — use ${C('T.Zero')}), mixes up ${C('CreateChecked')} and ${C('CreateTruncating')}, forgets that ${C('int')} division truncates inside a generic average, or targets .NET 6 where generic math was preview. <b>What you must still own:</b> the overflow policy (checked, saturating, wider accumulator) and whether genericity is worth the API complexity.</p>`,
    problems: [{
      title: 'Generic Sum and Max with INumber&lt;T&gt;',
      level: 'Easy', tags: ['generic math', 'static abstract', 'INumber'], companies: ['Microsoft', 'JPMorgan'],
      statement: `<p>Write one generic method ${C('static string Summary<T>(T[] xs) where T : INumber<T>')} returning ${C('"sum=S max=M"')} (sum computed in T starting from ${C('T.Zero')}, max via ${C('T.Max')}). For an empty array return ${C('"empty"')}. Expose it through ${C('SummaryInts(int[])')} and ${C('SummaryLongs(long[])')}; tests call ${C('SummaryLongs')}.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>5</sup>; the long sum fits in a long.`,
      example: `<p>${C('SummaryLongs([3, -1, 7])')} → ${H.c('g', '"sum=9 max=7"')}</p>`,
      brute: { why: `<p>Writing ${C('SumInt')}, ${C('SumLong')}, ${C('SumDouble')}, ${C('SumDecimal')} duplicates the same loop four times; a bug fixed in one is forgotten in the others.</p>`, code: `
static class Overloads
{
    public static long Sum(long[] xs) { long s = 0; foreach (var x in xs) s += x; return s; }
    public static int Sum(int[] xs) { int s = 0; foreach (var x in xs) s += x; return s; }
    public static double Sum(double[] xs) { double s = 0; foreach (var x in xs) s += x; return s; }
}` },
      mcq: { q: 'Inside <code>Summary&lt;T&gt;</code>, how do you start the accumulator?', options: ['<code>T total = T.Zero;</code>', '<code>T total = 0;</code>', '<code>T total = default(int);</code>', '<code>T total = (T)0;</code>'], answer: 0, explain: 'There is no implicit conversion from the literal 0 to an arbitrary T. INumberBase&lt;T&gt;.Zero is a static abstract property resolved on T.' },
      hints: [`<p>Hint 1: ${C('using System.Numerics;')} brings ${C('INumber<T>')}.</p>`, `<p>Hint 2: start ${C('max')} at ${C('xs[0]')}, then ${C('max = T.Max(max, x)')}.</p>`, `<p>Hint 3: ${C('$"sum={sum} max={max}"')} uses ${C('T.ToString()')}; for long the output is plain digits.</p>`],
      tests: { sig: 'long[] -> string', fn: 'summaryLongs', cases: [
        [[[3, -1, 7]], 'sum=9 max=7'],
        [[[]], 'empty'],
        [[[5]], 'sum=5 max=5'],
        [[[-4, -9, -2]], 'sum=-15 max=-2'],
        [[[0, 0, 0]], 'sum=0 max=0'],
        [[['4611686018427387903', '4611686018427387904']], 'sum=9223372036854775807 max=4611686018427387904'],
        [[{ $rep: 7, n: 100000 }], 'sum=700000 max=7']
      ] },
      solution: {
        approach: `<p>One generic method constrained to ${C('INumber<T>')} gives access to ${C('T.Zero')}, ${C('operator +')} and ${C('T.Max')}. The thin non-generic wrappers keep the public API simple; the JIT specialises the generic method for long and int separately.</p>`,
        code: `
using System.Numerics;

public class Solution
{
    public static string SummaryLongs(long[] xs) => Summary(xs);
    public static string SummaryInts(int[] xs) => Summary(xs);

    static string Summary<T>(T[] xs) where T : INumber<T>
    {
        if (xs.Length == 0) return "empty";
        T sum = T.Zero, max = xs[0];
        foreach (T x in xs)
        {
            sum += x;
            max = T.Max(max, x);
        }
        return $"sum={sum} max={max}";
    }
}`,
        dry: { head: ['x', 'sum', 'max'], rows: [['3', '3', '3'], ['-1', '2', '3'], ['7', '9', '7']] },
        complexity: `<p>O(n) time, O(1) extra space; the specialised code is as fast as a hand-written long loop.</p>`,
        followUps: ['Add an overflow-safe version using <code>checked(sum + x)</code>.', 'Return the average as double using <code>double.CreateChecked</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Extension methods
     ====================================================================== */
  var T5_CODE = [
    'static class StringExt',
    '{',
    '    public static int WordCount(this string? s) =>',
    '        s is null ? 0 : s.Split(\' \', StringSplitOptions.RemoveEmptyEntries).Length;',
    '}',
    '',
    'string text = "to be or not";',
    'int n = text.WordCount();            // compiled as StringExt.WordCount(text)',
    'string? none = null;',
    'int z = none.WordCount();            // no NullReferenceException: it is a static call'
  ].join('\n');
  topics.push({
    title: 'Extension Methods: Adding Methods You Do Not Own',
    analogy: `<p>You cannot rebuild your phone, but you can clip a <b>lens attachment</b> on it. To anyone using it, the phone now "has" a wide-angle mode — yet inside the phone nothing changed, and the attachment can only use the phone's public camera. An <b>extension method</b> is that clip-on: a static method in a static class that the compiler lets you call <b>as if</b> it were an instance method — ${C('text.WordCount()')} — while it can only touch the public surface of the type.</p>`,
    explain: `<p>An extension method is a <b>static</b> method in a <b>non-generic, non-nested static class</b> whose first parameter is marked ${C('this')}. When the namespace is imported (${C('using')}), the compiler rewrites ${C('x.M(args)')} to ${C('StaticClass.M(x, args)')}. It is pure syntax — no new member is added to the type and no virtual dispatch happens.</p>
<h4>1. Rules that matter</h4>
<ul>
<li><b>Instance methods win.</b> The compiler first looks for an applicable instance method; only if none exists does it consider extensions. If the type later gains a method with the same signature, your extension silently stops being called.</li>
<li><b>Static type decides.</b> Extensions bind on the <b>compile-time</b> type of the receiver. ${C('object o = "hi"; o.WordCount()')} does not compile (no extension on object), and overriding is impossible.</li>
<li><b>Null receivers are allowed.</b> ${C('((string?)null).WordCount()')} just passes null as the first argument — write extensions to handle it (or throw ${C('ArgumentNullException')} deliberately).</li>
<li><b>Scope by namespace.</b> Extensions are visible only where their namespace is imported; ambiguous extensions (two imported classes) are a compile error.</li>
<li><b>Generic and interface extensions</b> are where they shine: LINQ is a set of extension methods on ${C('IEnumerable<T>')}; one method then works for every collection.</li>
<li>${C('this ref')} / ${C('this in')} extensions on structs avoid copying (${C('this ref Point p')} can mutate the caller's struct).</li>
</ul>
<h4>2. Good uses</h4>
${H.table(['Use', 'Example'], [
  ['Fluent APIs over interfaces', C('services.AddLogging().AddHttpClient()') + ' — ASP.NET registration'],
  ['Behaviour for every implementation', C('IEnumerable<T>.Chunk(n)') + ', ' + C('Median()')],
  ['Helpers on sealed or BCL types', C('string.Truncate(n)') + ', ' + C('DateOnly.IsWeekend()')],
  ['Methods on enums / interfaces with no body', C('Color.ToHex()')]
])}
<p><b>Bad uses:</b> hiding expensive work behind innocent names, extending ${C('object')} (pollutes IntelliSense everywhere), or adding behaviour that really belongs in the type you own.</p>`,
    clues: ['"I wish ' + C('string') + ' / ' + C('IEnumerable<T>') + ' had a method for this" and you cannot edit the type', 'the same helper applies to every implementation of an interface', 'a fluent, chainable configuration API', 'a utility class full of ' + C('Helper.DoX(obj)') + ' calls'],
    code: [{ lang: 'csharp', run: true, title: 'Extension methods on strings, interfaces and structs (runnable)', code: `
Console.WriteLine("to be or not".WordCount());           // 4
string? none = null;
Console.WriteLine(none.WordCount());                     // 0 (null receiver is fine)

int[] nums = { 5, 1, 4, 2 };
Console.WriteLine(nums.Median());                        // 3
Console.WriteLine(new List<int> { 9 }.Median());         // 9  (any IEnumerable<int>)

Console.WriteLine("Hello, world".Truncate(5));           // Hello…

var c = new Counter();
c.Bump();                                                // this ref: changes the caller's struct
c.Bump();
Console.WriteLine(c.Value);                              // 2

var w = new Widget();
Console.WriteLine(w.Describe());                         // instance method wins: "instance"

struct Counter { public int Value; }
class Widget { public string Describe() => "instance"; }

static class Extensions
{
    public static int WordCount(this string? s) =>
        s is null ? 0 : s.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

    public static double Median(this IEnumerable<int> source)
    {
        var a = source.Order().ToArray();
        if (a.Length == 0) throw new InvalidOperationException("empty sequence");
        int m = a.Length / 2;
        return a.Length % 2 == 1 ? a[m] : (a[m - 1] + (double)a[m]) / 2;
    }

    public static string Truncate(this string s, int max) => s.Length <= max ? s : s[..max] + "…";

    public static void Bump(this ref Counter c) => c.Value++;

    public static string Describe(this Widget w) => "extension";   // never chosen
}` }],
    codeTitle: ['Extension methods'],
    viz: {
      title: 'What the compiler does with text.WordCount()',
      gen: function () {
        return codeFrames(T5_CODE, [
          { l: [1, 3], narr: 'A static method in a static class; the <code>this</code> modifier on the first parameter marks it as an extension.' },
          { l: 7, v: { text: '"to be or not"' }, narr: 'An ordinary string.' },
          { l: 8, narr: 'Lookup order: 1) instance methods of string named WordCount — none; 2) extension methods in imported namespaces — StringExt.WordCount(this string?) applies.', extra: [{ type: 'table', label: 'Overload resolution', columns: ['candidate', 'applicable?'], rows: [['string.WordCount() (instance)', 'does not exist'], ['StringExt.WordCount(this string?)', 'yes → chosen']], hl: { 1: 'ok' } }] },
          { l: 8, v: { text: '"to be or not"', n: 4 }, hv: { n: 'ok' }, narr: 'The call is compiled to <code>call StringExt.WordCount(string)</code> — a plain static call, no virtual dispatch.', extra: [{ type: 'code', label: 'Equivalent IL', lang: 'csharp', code: 'ldloc text\ncall int32 StringExt::WordCount(string)\nstloc n' }] },
          { l: 9, v: { none: 'null' }, narr: 'A null string.' },
          { l: 10, v: { none: 'null', z: 0 }, hv: { z: 'ok' }, narr: 'Calling an instance method on null would throw NullReferenceException. An extension method just receives null as an argument — the method decides what to do.' }
        ]);
      }
    },
    examples: [
      { title: 'An instance method appears later', html: `<p>You wrote ${C('static bool Contains(this Range r, int x)')}. A library update adds ${C('Range.Contains(int)')}. Your code still compiles, but every call now goes to the new instance method, which may behave differently (inclusive vs exclusive end). Prefer distinctive names for extensions on types you do not own.</p>` },
      { title: 'Fluent builder with extensions', html: `<p>ASP.NET Core's ${C('IServiceCollection')} has few members; almost every ${C('AddXxx')} is an extension defined by the library that needs it. Each returns the same collection so calls chain.</p>`, code: `
interface IPipeline { List<string> Steps { get; } }
class Pipeline : IPipeline { public List<string> Steps { get; } = new(); }

static class PipelineExtensions
{
    public static IPipeline UseLogging(this IPipeline p) { p.Steps.Add("log"); return p; }
    public static IPipeline UseAuth(this IPipeline p, string scheme) { p.Steps.Add("auth:" + scheme); return p; }
}

static class Demo
{
    public static string Run() => string.Join(">", new Pipeline().UseLogging().UseAuth("jwt").Steps);
}` },
      { title: 'Extension on an enum', html: `<p>Enums cannot declare methods, so extensions are the idiomatic way to attach behaviour.</p>`, code: `
enum Level { Low, Mid, High }
static class LevelExt
{
    public static string Badge(this Level l) => l switch { Level.Low => "🟢", Level.Mid => "🟡", _ => "🔴" };
}` }
    ],
    deepDive: `<p><b>Metadata.</b> The compiler marks the method, class and assembly with ${C('[Extension]')} (${C('System.Runtime.CompilerServices.ExtensionAttribute')}) so other compilers and tools can find them. At the IL level nothing distinguishes the call from any static call.</p>
<p><b>Resolution details.</b> Extension lookup starts from the innermost enclosing namespace of the call site and moves outward, then through ${C('using')} directives; the first scope with applicable candidates wins (closer namespaces shadow farther ones). Within one scope normal overload resolution picks the best, so a more specific ${C('this List<T>')} beats ${C('this IEnumerable<T>')}. That is how ${C('Enumerable.Count()')} can be bypassed by a more specific extension.</p>
<p><b>Generic constraints and inference.</b> ${C('public static T MaxBy<T, K>(this IEnumerable<T> xs, Func<T, K> key) where K : IComparable<K>')} infers T from the receiver. The receiver's type participates in type inference like any argument, which is why lambdas inside LINQ calls know their parameter type.</p>
<p><b>Future: extension members.</b> C# 14 (with .NET 10) introduces ${C('extension')} blocks with extension properties and static extension members. In C# 12 / .NET 8 only extension <b>methods</b> exist.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love "utility extension" libraries. <b>Use AI as a partner:</b> ask it to review an extension class for name clashes with BCL members in newer .NET versions (e.g. ${C('Chunk')}, ${C('MaxBy')}, ${C('Order')} were added in .NET 6/7). <b>Where AI goes wrong:</b> it extends ${C('object')}, forgets null receivers, or writes an extension expecting virtual dispatch on the run-time type. <b>What you must still own:</b> namespace hygiene (put extensions in a namespace callers opt into) and deciding whether the behaviour belongs on the type.</p>`,
    problems: [{
      title: 'Median Extension on IEnumerable&lt;int&gt;',
      level: 'Easy', tags: ['extension methods', 'LINQ', 'IEnumerable'], companies: ['Microsoft', 'Amazon'],
      statement: `<p>Write ${C('public static double Median(this IEnumerable<int> source)')} in a static class. For an odd count return the middle value of the sorted sequence; for an even count return the mean of the two middle values (computed without int overflow). ${C('Solution.MedianOf(int[] a)')} must call it with extension syntax: ${C('a.Median()')}.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, values are any int.`,
      example: `<p>${C('[5, 1, 4, 2].Median()')} → sorted 1 2 4 5 → ${H.c('g', '3')}</p>`,
      brute: { why: `<p>A static helper ${C('MathUtil.Median(list)')} works but reads inside-out in a LINQ chain: ${C('MathUtil.Median(xs.Where(...).Select(...))')}. As an extension it chains: ${C('xs.Where(...).Select(...).Median()')}.</p>`, code: `
static class MathUtil
{
    public static double Median(List<int> xs)
    {
        var a = new List<int>(xs);
        a.Sort();
        int m = a.Count / 2;
        return a.Count % 2 == 1 ? a[m] : (a[m - 1] + a[m]) / 2.0;   // a[m-1] + a[m] can overflow int
    }
}` },
      mcq: { q: 'Why compute <code>(a[m-1] + (double)a[m]) / 2</code> instead of <code>(a[m-1] + a[m]) / 2.0</code>?', options: ['The int addition can overflow before the division', 'Doubles are faster', 'To round towards zero', 'It is required for extension methods'], answer: 0, explain: 'int.MaxValue + int.MaxValue wraps to -2 in an unchecked context. Converting one operand first makes the addition happen in double.' },
      hints: [`<p>Hint 1: the class must be ${C('static')}, top-level and non-generic; the first parameter is ${C('this IEnumerable<int> source')}.</p>`, `<p>Hint 2: ${C('source.Order().ToArray()')} (or ${C('OrderBy(x => x)')}) gives a sorted copy without touching the caller's array.</p>`, `<p>Hint 3: promote to double (or long) before adding the two middle values.</p>`],
      tests: { sig: 'int[] -> double', fn: 'medianOf', cmp: 'float', cases: [
        [[[5, 1, 4, 2]], 3],
        [[[7]], 7],
        [[[3, 1, 2]], 2],
        [[[2147483647, 2147483647]], 2147483647],
        [[[-2147483648, -2147483648, 0]], -2147483648],
        [[[1, 2]], 1.5],
        [[[-3, -1, -2, -4]], -2.5],
        [[{ $range: [0, 100000] }], 49999.5]
      ] },
      solution: {
        approach: `<p>Sort a copy, pick the middle (or the average of the two middles in double precision). Because the method extends ${C('IEnumerable<int>')}, it works on arrays, lists, sets and LINQ query results alike.</p>`,
        code: `
public class Solution
{
    public static double MedianOf(int[] a) => a.Median();
}

public static class StatsExtensions
{
    public static double Median(this IEnumerable<int> source)
    {
        ArgumentNullException.ThrowIfNull(source);
        int[] s = source.Order().ToArray();
        if (s.Length == 0) throw new InvalidOperationException("Sequence contains no elements");
        int m = s.Length / 2;
        return s.Length % 2 == 1 ? s[m] : (s[m - 1] + (double)s[m]) / 2;
    }
}`,
        dry: { head: ['input', 'sorted', 'm', 'result'], rows: [['[5,1,4,2]', '[1,2,4,5]', '2', '(2 + 4) / 2 = 3'], ['[3,1,2]', '[1,2,3]', '1', '2'], ['[MAX, MAX]', '[MAX, MAX]', '1', '2147483647 (no overflow)']] },
        complexity: `<p>O(n log n) time for the sort, O(n) extra space. Quickselect would give O(n) average.</p>`,
        followUps: ['Make it generic over <code>INumber&lt;T&gt;</code>.', 'Implement an O(n) average-time version with quickselect.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Operator overloading and conversions
     ====================================================================== */
  var T6_CODE = [
    'readonly struct Fraction(long num, long den)',
    '{',
    '    public static Fraction operator +(Fraction a, Fraction b) =>',
    '        Make(a.Num * b.Den + b.Num * a.Den, a.Den * b.Den);',
    '    public static implicit operator Fraction(long n) => new(n, 1);',
    '    public static explicit operator double(Fraction f) => (double)f.Num / f.Den;',
    '}',
    'Fraction h = Fraction.Make(1, 2);',
    'Fraction r = h + 1;            // 1 → Fraction(1, 1) implicitly',
    'double d = (double)r;          // explicit: may lose precision'
  ].join('\n');
  topics.push({
    title: 'Operator Overloading, Conversions and Equality Operators',
    analogy: `<p>The <b>+</b> key on a calculator means "add numbers"; on a music app's playlist screen the same <b>+</b> means "append a song". Nobody is confused, because each screen defines what <b>+</b> means for its own kind of thing, and it stays <b>intuitive</b>. Operator overloading lets your type define ${C('+')}, ${C('==')} or a conversion — good when it matches what everyone already expects (money, vectors, fractions), terrible when it surprises (${C('+')} that sends an email).</p>`,
    explain: `<p>An overloaded operator is a ${C('public static')} method named ${C('operator X')} declared in the type it operates on (at least one parameter must be that type).</p>
<h4>1. What can be overloaded</h4>
${H.table(['Category', 'Operators', 'Rules'], [
  ['Unary', C('+ - ! ~ ++ -- true false'), C('true') + '/' + C('false') + ' must be paired'],
  ['Binary', C('+ - * / % & | ^ << >> >>>'), C('>>>') + ' since C# 11; compound ' + C('+=') + ' is derived automatically'],
  ['Comparison', C('== !=  < >  <= >='), 'must be overloaded <b>in pairs</b>'],
  ['Conversion', C('implicit operator T') + ' / ' + C('explicit operator T'), 'implicit = never fails, never loses data'],
  ['Checked (C# 11)', C('operator checked +') + ' …', 'used inside ' + C('checked(...)') + '; needs the unchecked version too'],
  ['Cannot overload', C('&& || = . ?: ?? new is as typeof'), C('&&') + ' uses ' + C('&') + ' plus ' + C('true') + '/' + C('false')]
])}
<h4>2. The equality contract</h4>
<p>If you overload ${C('==')}, you must also overload ${C('!=')}, and you should override ${C('Equals(object)')} and ${C('GetHashCode()')} (and implement ${C('IEquatable<T>')}) so that ${C('==')}, ${C('Equals')}, ${C('Dictionary')} and ${C('HashSet')} all agree. Records and record structs generate all of this for you. For reference types, beware: inside the operator, compare with ${C('ReferenceEquals')} or ${C('is null')} — writing ${C('if (a == null)')} recursively calls your own operator.</p>
<h4>3. Operators are static, so they are not virtual</h4>
<p>Overloaded operators are chosen at compile time from the <b>static</b> types of the operands. ${C('object a = "x", b = new string(\'x\', 1); a == b')} uses reference equality (object's ==) and is ${C('False')}, even though ${C('string')} overloads ==. This is the most common operator bug in C#.</p>
<h4>4. Conversions</h4>
<ul>
<li>${C('implicit')}: only when the conversion cannot throw and loses no information (${C('long → Fraction')}).</li>
<li>${C('explicit')}: when it may fail or lose precision (${C('Fraction → double')}, ${C('Fraction → int')}).</li>
<li>Implicit conversions combine with operators: ${C('h + 1')} works because 1 converts to Fraction. Too many implicit conversions make overload resolution ambiguous.</li>
</ul>`,
    clues: ['a value type from the domain where maths symbols are natural: money, vectors, matrices, complex numbers, durations', '"two instances with the same values should be equal" → equality operators + Equals/GetHashCode', 'wrapping a primitive (strongly typed ids, units) with safe conversions', 'CS0216 "operator == requires a matching operator !="'],
    code: [{ lang: 'csharp', run: true, title: 'A Fraction type with arithmetic, comparison and conversions (runnable)', code: `
var half = new Fraction(1, 2);
var third = new Fraction(1, 3);
Console.WriteLine(half + third);              // 5/6
Console.WriteLine(half - third);              // 1/6
Console.WriteLine(half * third);              // 1/6
Console.WriteLine(half / third);              // 3/2
Console.WriteLine(half + 1);                  // 3/2   (implicit long -> Fraction)
Console.WriteLine((double)third);             // 0.3333333333333333 (explicit)
Console.WriteLine(new Fraction(2, 4) == half); // True  (normalized)
Console.WriteLine(half > third);              // True
var set = new HashSet<Fraction> { new(1, 2), new(3, 6) };
Console.WriteLine(set.Count);                 // 1   (Equals/GetHashCode agree with ==)

object a = "hi", b = new string(new[] { 'h', 'i' });
Console.WriteLine(a == b);                    // False: object's ==, chosen at compile time
Console.WriteLine(a.Equals(b));               // True: virtual Equals

readonly record struct Fraction : IComparable<Fraction>
{
    public long Num { get; }
    public long Den { get; }
    public Fraction(long num, long den)
    {
        if (den == 0) throw new DivideByZeroException("denominator is zero");
        if (den < 0) { num = -num; den = -den; }
        long g = Gcd(Math.Abs(num), den);
        (Num, Den) = (num / g, den / g);
    }
    static long Gcd(long a, long b) { while (b != 0) (a, b) = (b, a % b); return a == 0 ? 1 : a; }

    public static Fraction operator +(Fraction a, Fraction b) => new(a.Num * b.Den + b.Num * a.Den, a.Den * b.Den);
    public static Fraction operator -(Fraction a, Fraction b) => new(a.Num * b.Den - b.Num * a.Den, a.Den * b.Den);
    public static Fraction operator *(Fraction a, Fraction b) => new(a.Num * b.Num, a.Den * b.Den);
    public static Fraction operator /(Fraction a, Fraction b) => new(a.Num * b.Den, a.Den * b.Num);
    public static Fraction operator -(Fraction a) => new(-a.Num, a.Den);
    public static bool operator <(Fraction a, Fraction b) => a.CompareTo(b) < 0;
    public static bool operator >(Fraction a, Fraction b) => a.CompareTo(b) > 0;
    public static implicit operator Fraction(long n) => new(n, 1);
    public static explicit operator double(Fraction f) => (double)f.Num / f.Den;
    public int CompareTo(Fraction o) => (Num * o.Den).CompareTo(o.Num * Den);
    public override string ToString() => Den == 1 ? Num.ToString() : $"{Num}/{Den}";
}` }],
    codeTitle: ['Fraction'],
    viz: {
      title: 'How h + 1 is resolved and evaluated',
      gen: function () {
        return codeFrames(T6_CODE, [
          { l: 1, narr: 'A small value type. The operators are static methods inside it.' },
          { l: 8, v: { h: '1/2' }, narr: 'Make normalizes by the gcd, so 2/4 and 1/2 are the same value.' },
          { l: 9, narr: 'Overload resolution for <code>Fraction + int</code>: no operator +(Fraction, int) exists. Candidate operator +(Fraction, Fraction) is applicable if 1 converts to Fraction.', extra: [{ type: 'table', label: 'Candidates', columns: ['operator', 'conversion needed', 'ok?'], rows: [['+(Fraction, Fraction)', 'int → long → Fraction (implicit user-defined)', 'yes'], ['+(int, int)', 'Fraction → int: no implicit conversion', 'no']], hl: { 0: 'ok' } }] },
          { l: 5, v: { 'implicit(1)': '1/1' }, hv: { 'implicit(1)': 'ok' }, narr: 'The implicit conversion runs first: Fraction(1, 1).' },
          { l: [3, 4], v: { a: '1/2', b: '1/1', num: '1·1 + 1·2 = 3', den: '2·1 = 2' }, narr: 'Then the operator body: cross-multiply and normalize.' },
          { l: 9, v: { r: '3/2' }, hv: { r: 'ok' }, narr: 'Result 3/2. To the caller it reads like ordinary arithmetic.' },
          { l: [6, 10], v: { d: 1.5 }, narr: 'Converting to double may lose precision (1/3 → 0.333…), so it is <b>explicit</b>: the caller must write the cast.' }
        ]);
      }
    },
    examples: [
      { title: 'The null check that recurses forever', html: `<p>Inside ${C('public static bool operator ==(Node? a, Node? b) { if (a == null) ... }')} the expression ${C('a == null')} calls the same operator again → ${C('StackOverflowException')}. Use ${C('a is null')} or ${C('ReferenceEquals(a, null)')}: ${C('is null')} never calls user-defined operators.</p>` },
      { title: 'Strongly typed id with explicit conversion', html: `<p>Wrapping primitive ids prevents passing an ${C('OrderId')} where a ${C('CustomerId')} is expected; the explicit conversion keeps raw ints from leaking in by accident.</p>`, code: `
readonly record struct OrderId(int Value)
{
    public static explicit operator OrderId(int v) => v > 0 ? new(v) : throw new ArgumentOutOfRangeException(nameof(v));
    public static implicit operator int(OrderId id) => id.Value;   // safe direction
}` },
      { title: 'Checked operator (C# 11)', html: `<p>A type can give different behaviour in ${C('checked')} contexts: wrap silently normally, throw ${C('OverflowException')} inside ${C('checked(...)')}.</p>`, code: `
readonly record struct Count(int Value)
{
    public static Count operator +(Count a, Count b) => new(unchecked(a.Value + b.Value));
    public static Count operator checked +(Count a, Count b) => new(checked(a.Value + b.Value));
}` }
    ],
    deepDive: `<p><b>What the compiler emits.</b> ${C('operator +')} becomes a static method named ${C('op_Addition')} with the ${C('specialname')} flag; ${C('implicit')} becomes ${C('op_Implicit')}, ${C('==')} becomes ${C('op_Equality')}, checked operators ${C('op_CheckedAddition')}. Languages without operator syntax (or reflection code) can call these names. Generic math interfaces (${C('IAdditionOperators<TSelf, TOther, TResult>')}) are just static abstract declarations of these methods.</p>
<p><b>Lifted operators.</b> For a struct with ${C('operator +')}, the compiler automatically provides the lifted ${C('Fraction? + Fraction?')} that returns null if either operand is null. Lifted ${C('==')} returns ${C('bool')}, true when both are null.</p>
<p><b>Records and ==.</b> Records synthesize ${C('==')}/${C('!=')} that call ${C('Equals')}, which compares the compiler-generated ${C('EqualityContract')} (the run-time type) and every field with ${C('EqualityComparer<T>.Default')}. A ${C('readonly record struct')} with a custom constructor that normalizes values (like Fraction) gets correct value equality for free.</p>
<p><b>Performance.</b> Operators on small ${C('readonly struct')}s inline completely; large structs passed by value copy — use ${C('in')} parameters for big structs (${C('operator +(in Matrix4 a, in Matrix4 b)')}).</p>`,
    aiEra: `<p><b>What AI changes:</b> it generates full operator sets and conversions instantly. <b>Use AI as a partner:</b> ask it to verify that ${C('==')}, ${C('Equals')}, ${C('GetHashCode')} and ${C('CompareTo')} are consistent, and to generate property-based tests (commutativity, a + (-a) = 0). <b>Where AI goes wrong:</b> implicit conversions that lose data, ${C('==')} on reference types with the recursive null check, forgetting ${C('GetHashCode')}, and overflow in cross-multiplication. <b>What you must still own:</b> whether operators make the domain clearer, and the overflow/precision policy.</p>`,
    problems: [{
      title: 'Fraction Calculator with Operators',
      level: 'Medium', tags: ['operator overloading', 'struct', 'gcd'], companies: ['Goldman Sachs', 'Microsoft'],
      statement: `<p>Implement ${C('readonly struct Fraction')} with normalization (positive denominator, lowest terms), operators ${C('+ - * /')}, ${C('==')}/${C('!=')}, an implicit conversion from ${C('long')} and ${C('ToString()')} returning ${C('"n/d"')} or just ${C('"n"')} when d = 1. ${C('Calc(a, b, c, d, op)')} computes ${C('(a/b) op (c/d)')} for op in ${C('+ - * / ==')}; for ${C('==')} return ${C('"True"')}/${C('"False"')}; division by a zero fraction or a zero denominator returns ${C('"error"')}.</p>`,
      constraints: `|a|, |c| ≤ 10<sup>6</sup>, |b|, |d| ≤ 10<sup>6</sup>. Use long arithmetic.`,
      example: `<p>${C('Calc(1, 2, 1, 3, "+")')} → ${H.c('g', '"5/6"')}; ${C('Calc(2, 4, -1, -2, "==")')} → ${H.c('g', '"True"')}</p>`,
      brute: { why: `<p>Using ${C('double')} gives ${C('1/3 + 1/3 + 1/3 = 1')} only by luck and ${C('0.1 + 0.2 != 0.3')}; exact rational arithmetic needs integer numerator/denominator pairs, and operators make the client code readable.</p>`, code: `
static class DoubleCalc
{
    public static double Add(int a, int b, int c, int d) => (double)a / b + (double)c / d;   // inexact, no normal form
}` },
      mcq: { q: 'You overload <code>==</code> on Fraction. What else is required or strongly expected?', options: ['<code>!=</code> (required), plus Equals and GetHashCode overrides', 'Only <code>!=</code>', 'Only GetHashCode', 'Nothing'], answer: 0, explain: 'The compiler requires == and != in pairs (CS0216) and warns (CS0660/CS0661) if Equals/GetHashCode are not overridden; collections use Equals/GetHashCode, not ==.' },
      hints: [`<p>Hint 1: normalize in the constructor: flip signs if the denominator is negative, then divide both by the gcd.</p>`, `<p>Hint 2: ${C('a/b + c/d = (a·d + c·b) / (b·d)')}; division multiplies by the reciprocal and fails when the divisor's numerator is 0.</p>`, `<p>Hint 3: after normalization, equality is just ${C('Num == o.Num && Den == o.Den')}; a ${C('readonly record struct')} generates it.</p>`],
      tests: { sig: 'int int int int string -> string', fn: 'calc', cases: [
        [[1, 2, 1, 3, '+'], '5/6'],
        [[1, 2, 1, 3, '-'], '1/6'],
        [[2, 3, 3, 4, '*'], '1/2'],
        [[1, 2, 1, 4, '/'], '2'],
        [[2, 4, -1, -2, '=='], 'True'],
        [[1, 2, 2, 3, '=='], 'False'],
        [[1, 2, 0, 5, '/'], 'error'],
        [[1, 0, 1, 2, '+'], 'error'],
        [[-3, 6, 1, 2, '+'], '0'],
        [[1000000, 1, 1000000, 1, '*'], '1000000000000'],
        [[1, -3, 1, 3, '-'], '-2/3']
      ] },
      solution: {
        approach: `<p>A ${C('readonly record struct')} with a normalizing constructor gives value equality automatically. Arithmetic operators cross-multiply in long; the constructor throws on a zero denominator, which ${C('Calc')} turns into ${C('"error"')}.</p>`,
        code: `
public class Solution
{
    public static string Calc(int a, int b, int c, int d, string op)
    {
        try
        {
            var x = new Fraction(a, b);
            var y = new Fraction(c, d);
            return op switch
            {
                "+" => (x + y).ToString(),
                "-" => (x - y).ToString(),
                "*" => (x * y).ToString(),
                "/" => (x / y).ToString(),
                "==" => (x == y).ToString(),
                _ => "error"
            };
        }
        catch (DivideByZeroException) { return "error"; }
    }
}

public readonly record struct Fraction
{
    public long Num { get; }
    public long Den { get; }

    public Fraction(long num, long den)
    {
        if (den == 0) throw new DivideByZeroException();
        if (den < 0) { num = -num; den = -den; }
        long g = Gcd(Math.Abs(num), den);
        Num = num / g;
        Den = den / g;
    }

    static long Gcd(long a, long b) { while (b != 0) (a, b) = (b, a % b); return a == 0 ? 1 : a; }

    public static Fraction operator +(Fraction x, Fraction y) => new(x.Num * y.Den + y.Num * x.Den, x.Den * y.Den);
    public static Fraction operator -(Fraction x, Fraction y) => new(x.Num * y.Den - y.Num * x.Den, x.Den * y.Den);
    public static Fraction operator *(Fraction x, Fraction y) => new(x.Num * y.Num, x.Den * y.Den);
    public static Fraction operator /(Fraction x, Fraction y) => new(x.Num * y.Den, x.Den * y.Num);
    public static implicit operator Fraction(long n) => new(n, 1);

    public override string ToString() => Den == 1 ? Num.ToString() : $"{Num}/{Den}";
}`,
        dry: { head: ['input', 'x', 'y', 'raw result', 'normalized'], rows: [['1/2 + 1/3', '1/2', '1/3', '(3 + 2)/6', '5/6'], ['2/4 == -1/-2', '1/2', '1/2', 'Num, Den equal', 'True'], ['1/2 / 0/5', '1/2', '0/1', 'den = 2·0 = 0', 'error'], ['-3/6 + 1/2', '-1/2', '1/2', '0/4', '0']] },
        complexity: `<p>O(log min(n, d)) per operation for the gcd; everything else is O(1).</p>`,
        followUps: ['Add <code>&lt;</code>/<code>&gt;</code> and <code>IComparable&lt;Fraction&gt;</code>.', 'Use <code>Int128</code> or <code>BigInteger</code> to avoid overflow in cross-multiplication.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Expression trees
     ====================================================================== */
  var T7_CODE = [
    'Func<int, bool> f = x => x > 5;                  // compiled IL: a delegate',
    'Expression<Func<int, bool>> e = x => x > 5;      // data: a tree of nodes',
    'var body = (BinaryExpression)e.Body;             // NodeType = GreaterThan',
    'Console.WriteLine(body.Left);                    // x',
    'Console.WriteLine(body.Right);                   // 5',
    'Func<int, bool> g = e.Compile();                 // tree -> IL at run time',
    'Console.WriteLine(g(7));                         // True'
  ].join('\n');
  topics.push({
    title: 'Expression Trees: Code as Data',
    analogy: `<p>A cook can follow a recipe (run it), or a nutritionist can <b>read</b> the same recipe and compute calories, or a translator can rewrite it in another language. A normal lambda is a recipe already being cooked — compiled to machine instructions you cannot inspect. An <b>expression tree</b> is the recipe written down as a diagram: "compare <i>x</i> with 5 using greater-than". Entity Framework is the translator — it reads the diagram and writes SQL ${C('WHERE Age > 5')} instead of running your code.</p>`,
    explain: `<p>When a lambda is assigned to ${C('Expression<TDelegate>')} instead of a delegate type, the compiler does not emit IL for the body. It emits code that <b>builds an object graph</b> describing it, using classes from ${C('System.Linq.Expressions')}.</p>
<h4>1. The node types</h4>
${H.table(['Node', 'Represents', 'Factory'], [
  [C('ParameterExpression'), 'a lambda parameter (' + C('x') + ')', C('Expression.Parameter(typeof(int), "x")')],
  [C('ConstantExpression'), 'a value (' + C('5') + ')', C('Expression.Constant(5)')],
  [C('BinaryExpression'), C('x > 5') + ', ' + C('a + b') + ', ' + C('a && b'), C('Expression.GreaterThan(l, r)') + ', ' + C('MakeBinary')],
  [C('MemberExpression'), C('p.Age'), C('Expression.Property(p, "Age")')],
  [C('MethodCallExpression'), C('s.StartsWith("a")'), C('Expression.Call(obj, methodInfo, args)')],
  [C('ConditionalExpression'), C('c ? a : b'), C('Expression.Condition')],
  [C('LambdaExpression'), 'the whole ' + C('x => ...'), C('Expression.Lambda<Func<int,bool>>(body, x)')]
])}
<h4>2. Three things you can do with a tree</h4>
<ol>
<li><b>Inspect</b> it — read member names (${C('x => x.Name')} gives you the string "Name" in a refactoring-safe way; used by validation and mapping libraries).</li>
<li><b>Translate</b> it — ${C('IQueryable<T>')} providers (EF Core, MongoDB driver) walk the tree and generate SQL or a query document. That is why only some methods work in a database query: the provider must know how to translate each node.</li>
<li><b>Compile</b> it — ${C('e.Compile()')} generates IL at run time and returns a delegate that runs at full speed. Building trees by hand and compiling them is the classic way to make fast property getters, mappers and rule engines.</li>
</ol>
<h4>3. Limitations</h4>
<p>Expression lambdas must be <b>single expressions</b>: no statement bodies (${C('{ }')}), no assignments, no ${C('await')}, no ${C('?.')} or ${C('throw')} expressions, no tuple literals, no pattern matching in some forms (CS8072, CS0832 and friends). The ${C('System.Linq.Expressions')} API itself can build blocks, loops and assignments (${C('Expression.Block')}, ${C('Expression.Loop')}), it is only the C# lambda syntax that is limited.</p>
<h4>4. Rewriting trees</h4>
<p>Trees are <b>immutable</b>. To change one, subclass ${C('ExpressionVisitor')} and override ${C('VisitBinary')}, ${C('VisitMember')} and so on; return a new node and the visitor rebuilds the parents. Used to combine predicates (${C('a && b')} from two lambdas), substitute parameters, or simplify.</p>`,
    clues: ['a lambda must be <b>translated</b> to another language (SQL, a REST filter, a search query)', 'you need the <b>name</b> of a property from a lambda (' + C('RuleFor(x => x.Email)') + ')', 'hot reflection code (' + C('GetValue') + ', ' + C('Invoke') + ') needs to run at delegate speed', 'rules or formulas arrive at run time (config, user input) and must run fast'],
    code: [{ lang: 'csharp', run: true, title: 'Inspect, build, compile and rewrite expression trees (runnable)', code: `
using System.Linq.Expressions;

// 1. the compiler builds a tree from a lambda
Expression<Func<int, bool>> isBig = x => x > 5;
var gt = (BinaryExpression)isBig.Body;
Console.WriteLine($"{gt.NodeType} {gt.Left} {gt.Right}");       // GreaterThan x 5
Console.WriteLine(isBig.Compile()(7));                         // True

// 2. build (x * 2) + 3 by hand
ParameterExpression x = Expression.Parameter(typeof(int), "x");
Expression body = Expression.Add(Expression.Multiply(x, Expression.Constant(2)), Expression.Constant(3));
var lambda = Expression.Lambda<Func<int, int>>(body, x);
Console.WriteLine(lambda);                                     // x => ((x * 2) + 3)
Console.WriteLine(lambda.Compile()(10));                       // 23

// 3. get a property name from a lambda (refactoring-safe)
Console.WriteLine(NameOf<Person>(p => p.Age));                 // Age

// 4. fast compiled getter instead of PropertyInfo.GetValue
var getName = Getter<Person, string>("Name");
Console.WriteLine(getName(new Person("Asha", 30)));            // Asha

// 5. rewrite: combine two predicates with AndAlso
Expression<Func<Person, bool>> adult = p => p.Age >= 18;
Expression<Func<Person, bool>> aName = p => p.Name.StartsWith("A");
var both = And(adult, aName);
Console.WriteLine(both.Compile()(new Person("Asha", 30)));     // True
Console.WriteLine(both.Compile()(new Person("Bob", 40)));      // False

static string NameOf<T>(Expression<Func<T, object>> e) => e.Body switch
{
    MemberExpression m => m.Member.Name,
    UnaryExpression { Operand: MemberExpression m } => m.Member.Name,   // boxing Convert(p.Age)
    _ => throw new ArgumentException("not a member access")
};

static Func<T, R> Getter<T, R>(string prop)
{
    var p = Expression.Parameter(typeof(T), "p");
    return Expression.Lambda<Func<T, R>>(Expression.Property(p, prop), p).Compile();
}

static Expression<Func<T, bool>> And<T>(Expression<Func<T, bool>> a, Expression<Func<T, bool>> b)
{
    var p = a.Parameters[0];
    var bBody = new Replace(b.Parameters[0], p).Visit(b.Body);    // make b use a's parameter
    return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(a.Body, bBody), p);
}

record Person(string Name, int Age);

class Replace(ParameterExpression from, ParameterExpression to) : ExpressionVisitor
{
    protected override Expression VisitParameter(ParameterExpression node) => node == from ? to : node;
}` }],
    codeTitle: ['Expression trees'],
    viz: {
      title: 'A lambda as a delegate vs as a tree',
      gen: function () {
        var tree = function (hl) { return { type: 'graph', directed: true, height: 46, nodes: [{ id: 'L', label: 'Lambda x =>', x: 50, y: 6, shape: 'box' }, { id: 'B', label: 'GreaterThan', x: 50, y: 22, shape: 'box' }, { id: 'P', label: 'Parameter x', x: 28, y: 40, shape: 'box' }, { id: 'K', label: 'Constant 5', x: 72, y: 40, shape: 'box' }], edges: [['L', 'B', 'Body'], ['B', 'P', 'Left'], ['B', 'K', 'Right']], hl: hl || {} }; };
        return codeFrames(T7_CODE, [
          { l: 1, narr: 'Assigned to a delegate type, the lambda is compiled to IL in a hidden method. You can call it, but you cannot look inside it.' },
          { l: 2, extra: [tree({ L: 'cur' })], narr: 'Assigned to <code>Expression&lt;Func&lt;int,bool&gt;&gt;</code>, the compiler instead emits code that <b>builds objects</b>: Parameter, Constant, GreaterThan, Lambda.' },
          { l: 3, extra: [tree({ B: 'cur' })], narr: 'The body is a BinaryExpression with NodeType GreaterThan. A LINQ provider would map this to SQL <code>&gt;</code>.' },
          { l: 4, extra: [tree({ P: 'ok' })], out: 'x', narr: 'Left child: the parameter x.' },
          { l: 5, extra: [tree({ K: 'ok' })], out: 'x\n5', narr: 'Right child: the constant 5. Captured local variables would appear as a field access on a closure object, which providers evaluate as SQL parameters.' },
          { l: 6, extra: [tree({ L: 'ok', B: 'ok', P: 'ok', K: 'ok' })], narr: '<code>Compile()</code> walks the tree and emits IL at run time (with a DynamicMethod). Expensive — do it once and cache the delegate.' },
          { l: 7, out: 'x\n5\nTrue', narr: 'The compiled delegate runs as fast as a normal lambda.' }
        ]);
      }
    },
    examples: [
      { title: 'Why EF Core says "could not be translated"', html: `<p>${C('db.Users.Where(u => MyHelper.IsVip(u))')} gives a tree containing a ${C('MethodCallExpression')} to your own method. The SQL generator has no rule for it, so EF Core throws "The LINQ expression ... could not be translated". Either rewrite the condition with translatable members, or call ${C('AsEnumerable()')} first to switch to in-memory evaluation (and pull all rows).</p>` },
      { title: 'Func vs Expression in IQueryable', html: `<p>${C('IQueryable<T>.Where')} takes ${C('Expression<Func<T,bool>>')}; ${C('IEnumerable<T>.Where')} takes ${C('Func<T,bool>')}. If you store a filter in a ${C('Func<User,bool>')} variable and pass it to a query, overload resolution picks ${C('Enumerable.Where')} — the database returns <b>every</b> row and filtering happens in memory.</p>`, code: `
using System.Linq.Expressions;

static class Filters
{
    public static readonly Expression<Func<string, bool>> Short = s => s.Length < 4;   // stays translatable
    public static int CountShort(IQueryable<string> q) => q.Count(Short);              // Queryable.Count
}` },
      { title: 'A tiny rule engine', html: `<p>Rules like "Age &gt;= 18" from a config file become compiled predicates.</p>`, code: `
using System.Linq.Expressions;

static class Rules
{
    public static Func<T, bool> Build<T>(string prop, string op, int value)
    {
        var p = Expression.Parameter(typeof(T), "p");
        Expression left = Expression.Property(p, prop), right = Expression.Constant(value);
        Expression cmp = op switch
        {
            ">=" => Expression.GreaterThanOrEqual(left, right),
            "<" => Expression.LessThan(left, right),
            "==" => Expression.Equal(left, right),
            _ => throw new NotSupportedException(op)
        };
        return Expression.Lambda<Func<T, bool>>(cmp, p).Compile();
    }
}` }
    ],
    deepDive: `<p><b>Closures in trees.</b> ${C('int min = 18; Expression<Func<P,bool>> e = p => p.Age >= min;')} produces ${C('MemberExpression(Constant(closureObject), field min)')}, not a constant 18. EF Core recognises this pattern and turns it into a SQL parameter, which keeps query plans reusable. If you build trees manually with ${C('Expression.Constant(18)')}, every distinct value produces a different SQL text and pollutes the plan cache.</p>
<p><b>Compile cost and interpretation.</b> ${C('Compile()')} uses ${C('DynamicMethod')} and the JIT — on the order of tens to hundreds of microseconds. ${C('Compile(preferInterpretation: true)')} uses an interpreter that starts faster but runs slower; on platforms without JIT (iOS, Native AOT) the interpreter is the only option. Always cache compiled delegates (keyed by type and member).</p>
<p><b>Expression trees vs source generators vs Reflection.Emit.</b> Emit gives total control (IL by hand) but is error-prone; expression trees are a typed, verifiable way to generate code at run time; source generators produce C# at compile time and work under AOT. Modern libraries (System.Text.Json, Dapper AOT, Mapperly) prefer source generators, falling back to expression trees or reflection when generation is impossible.</p>`,
    aiEra: `<p><b>What AI changes:</b> writing ${C('ExpressionVisitor')} subclasses and hand-built trees is tedious and AI is good at it. <b>Use AI as a partner:</b> <code>Show me the expression tree (node types) produced by p =&gt; p.Orders.Any(o =&gt; o.Total &gt; 100)</code>. <b>Where AI goes wrong:</b> it combines predicates without replacing parameters (the second lambda's parameter is "not bound"), calls ${C('Compile()')} per request, or uses methods EF cannot translate. <b>What you must still own:</b> knowing which side (database or memory) runs each part of a query, and caching.</p>`,
    problems: [{
      title: 'Compile a Postfix Formula into an Expression Tree',
      level: 'Medium', tags: ['expression trees', 'stack', 'compile'], companies: ['Microsoft', 'Bloomberg', 'SAP'],
      statement: `<p>Given a postfix (RPN) formula over one variable ${C('x')}, integer constants and the operators ${C('+ - *')}, build an ${C('Expression<Func<int, int>>')} with ${C('System.Linq.Expressions')}, compile it, and return ${C('"<body> = <value>"')} where ${C('<body>')} is ${C('lambda.Body.ToString()')} and ${C('<value>')} is the compiled delegate applied to the given x. Return ${C('"invalid"')} for a malformed formula.</p>`,
      constraints: `Up to 100 tokens separated by single spaces. Constants are non-negative ints. Results fit in int.`,
      example: `<p>${C('Eval("x 2 * 3 +", 10)')} → ${H.c('g', '"((x * 2) + 3) = 23"')}</p>`,
      brute: { why: `<p>Re-parsing and interpreting the string for every x costs O(tokens) string work per evaluation. Building a tree once and compiling it gives a delegate that evaluates in a few nanoseconds — the approach used by rule engines and spreadsheet engines.</p>`, code: `
static class Interpreter
{
    public static int Run(string rpn, int x)
    {
        var st = new Stack<int>();
        foreach (var t in rpn.Split(' '))
        {
            if (t == "x") st.Push(x);
            else if (int.TryParse(t, out int k)) st.Push(k);
            else { int b = st.Pop(), a = st.Pop(); st.Push(t == "+" ? a + b : t == "-" ? a - b : a * b); }
        }
        return st.Pop();
    }
}` },
      mcq: { q: 'What does <code>Expression.Lambda&lt;Func&lt;int,int&gt;&gt;(body, x).Compile()</code> produce?', options: ['A delegate whose IL was generated at run time from the tree', 'An interpreter that re-reads the string each call', 'A SQL query', 'A new assembly on disk'], answer: 0, explain: 'Compile emits IL into a DynamicMethod and returns a delegate; nothing is written to disk.' },
      hints: [`<p>Hint 1: use a ${C('Stack<Expression>')}. ${C('x')} pushes the ${C('ParameterExpression')}, a number pushes ${C('Expression.Constant(k)')}.</p>`, `<p>Hint 2: an operator pops right then left and pushes ${C('Expression.Add/Subtract/Multiply(left, right)')}.</p>`, `<p>Hint 3: the formula is valid only if every operator finds two operands and exactly one expression remains.</p>`],
      tests: { sig: 'string int -> string', fn: 'eval', cases: [
        [['x 2 * 3 +', 10], '((x * 2) + 3) = 23'],
        [['x', 5], 'x = 5'],
        [['7', 0], '7 = 7'],
        [['x x *', -4], '(x * x) = 16'],
        [['1 x -', 3], '(1 - x) = -2'],
        [['x 1 + x 1 - *', 6], '((x + 1) * (x - 1)) = 35'],
        [['x +', 1], 'invalid'],
        [['x 2', 1], 'invalid'],
        [['', 1], 'invalid']
      ] },
      solution: {
        approach: `<p>Classic stack-based postfix parsing, but the stack holds <b>expression nodes</b> instead of numbers. The final node becomes the lambda body; ${C('Compile()')} turns it into a delegate. ${C('BinaryExpression.ToString()')} prints the tree fully parenthesized.</p>`,
        code: `
using System.Linq.Expressions;

public class Solution
{
    public static string Eval(string rpn, int xValue)
    {
        ParameterExpression x = Expression.Parameter(typeof(int), "x");
        var st = new Stack<Expression>();
        foreach (string t in rpn.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            if (t == "x") st.Push(x);
            else if (int.TryParse(t, out int k)) st.Push(Expression.Constant(k));
            else if (t is "+" or "-" or "*")
            {
                if (st.Count < 2) return "invalid";
                Expression r = st.Pop(), l = st.Pop();
                st.Push(t switch
                {
                    "+" => Expression.Add(l, r),
                    "-" => Expression.Subtract(l, r),
                    _ => Expression.Multiply(l, r)
                });
            }
            else return "invalid";
        }
        if (st.Count != 1) return "invalid";
        var lambda = Expression.Lambda<Func<int, int>>(st.Pop(), x);
        Func<int, int> f = lambda.Compile();
        return $"{lambda.Body} = {f(xValue)}";
    }
}`,
        dry: { head: ['token', 'stack (top right)'], rows: [['x', '[x]'], ['2', '[x, 2]'], ['*', '[(x * 2)]'], ['3', '[(x * 2), 3]'], ['+', '[((x * 2) + 3)]'], ['compile, x = 10', '23']] },
        complexity: `<p>O(T) to build the tree; compilation is a one-off cost; each later evaluation is O(1) machine-code work.</p>`,
        followUps: ['Add division and return "invalid" for a constant zero divisor.', 'Cache compiled delegates by formula string in a ConcurrentDictionary.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Advanced constraints, generic caching and source generators
     ====================================================================== */
  var T8_CODE = [
    'static class TypeCache<T>',
    '{',
    '    public static readonly string[] Props =',
    '        typeof(T).GetProperties().Select(p => p.Name).ToArray();',
    '}',
    'var a = TypeCache<Order>.Props;   // static ctor runs: reflection once',
    'var b = TypeCache<Order>.Props;   // same array, no reflection',
    'var c = TypeCache<User>.Props;    // a different closed type = its own cache'
  ].join('\n');
  topics.push({
    title: 'Advanced Constraints, Generic Caches and Source Generators',
    analogy: `<p>A job advert can list requirements: "must have a driving licence", "must be able to lift 20 kg", "must speak Hindi". The more precise the requirements, the more the employer can rely on without checking each candidate again. <b>Generic constraints</b> are those requirements for type arguments — ${C('struct')}, ${C('class')}, ${C('new()')}, ${C('Enum')}, ${C('unmanaged')}, ${C('INumber<T>')}. And a <b>source generator</b> is an assistant who reads your project <b>before</b> it is built and writes the repetitive code for you, so nothing has to be discovered by reflection at run time.</p>`,
    explain: `<h4>1. The full list of constraints</h4>
${H.table(['Constraint', 'Means', 'Enables'], [
  [C('where T : class') + ' / ' + C('class?'), 'reference type (nullable allowed with ?)', C('null') + ' comparisons, ' + C('as')],
  [C('where T : struct'), 'non-nullable value type', C('T?') + ' is ' + C('Nullable<T>')],
  [C('where T : notnull'), 'non-nullable reference or value type', 'dictionary keys without null warnings'],
  [C('where T : unmanaged'), 'struct with no references, recursively', C('sizeof(T)') + ', ' + C('stackalloc T[n]') + ', ' + C('MemoryMarshal.Cast')],
  [C('where T : new()'), 'public parameterless constructor', C('new T()') + ' (must be last)'],
  [C('where T : Base') + ' / ' + C('IFoo'), 'derives from / implements', 'call Base or IFoo members without casts'],
  [C('where T : Enum') + ' / ' + C('Delegate'), 'any enum / delegate type (C# 7.3)', C('HasFlag') + ', ' + C('Enum.GetValues<T>()')],
  [C('where T : U'), 'naked type constraint', 'relate two type parameters'],
  [C('where T : default'), 'only in overrides/explicit impls', 'resolves ' + C('T?') + ' ambiguity']
])}
<p>Constraints are <b>not part of the method signature</b> for overload resolution — two methods differing only in constraints are a duplicate definition (CS0111).</p>
<h4>2. The static generic cache</h4>
<p>Every <b>closed</b> generic type (${C('TypeCache<Order>')}, ${C('TypeCache<User>')}) has its own static fields and its own static constructor, which the runtime runs exactly once, thread-safely. That makes ${C('static class Cache<T> { public static readonly X Value = Compute(typeof(T)); }')} the fastest possible per-type cache: no dictionary lookup, no locking after initialization. ${C('EqualityComparer<T>.Default')} and ${C('Array.Empty<T>()')} are built this way.</p>
<h4>3. Source generators</h4>
<p>A source generator is a Roslyn component (an ${C('IIncrementalGenerator')}) that runs <b>inside the compiler</b>. It can read your syntax and semantic model — classes, attributes, method signatures — and <b>add new C# files</b> to the compilation (it cannot modify yours). Typically you write a ${C('partial')} declaration with an attribute and the generator fills in the other half.</p>
${H.table(['Built-in generator', 'You write', 'Replaces at run time'], [
  [C('[GeneratedRegex("...")]'), C('static partial Regex Digits();'), 'regex parsing + Reflection.Emit compilation'],
  [C('[JsonSerializable(typeof(Order))]'), C('partial class AppJson : JsonSerializerContext'), 'reflection over properties in System.Text.Json'],
  [C('[LoggerMessage(...)]'), C('static partial void LogStart(ILogger l, int id);'), 'boxing params + template parsing per log call'],
  [C('[LibraryImport("lib")]'), C('static partial int Foo(...);'), 'run-time marshalling stub generation (DllImport)']
])}
<p>Benefits: no start-up reflection cost, errors at compile time, code you can read and debug, and compatibility with <b>trimming and Native AOT</b>.</p>`,
    clues: ['"I need ' + C('new T()') + ' / ' + C('sizeof(T)') + ' / enum operations inside a generic" → the matching constraint', 'per-type metadata computed once (serializers, mappers, validators) → static generic cache', 'reflection on the hot path, or the app must run with Native AOT/trimming → source generator', 'boilerplate that follows mechanically from declarations (ToString, mappers, INotifyPropertyChanged)'],
    code: [{ lang: 'csharp', run: true, title: 'Constraints, a static generic cache and a generated regex (runnable)', code: `
using System.Text.RegularExpressions;

Console.WriteLine(Flags.Describe(Perm.Read | Perm.Write));      // Read, Write (2 flags)
Console.WriteLine(Flags.Describe((Perm)0));                     // None (0 flags)
Console.WriteLine(Bytes.SizeOf<long>() + " " + Bytes.SizeOf<Point>()); // 8 8
Console.WriteLine(Factory.Make<List<int>>().Count);             // 0  (new() constraint)

Console.WriteLine(string.Join(",", Cache<Point>.Props));        // X,Y   (computed once)
Console.WriteLine(ReferenceEquals(Cache<Point>.Props, Cache<Point>.Props)); // True
Console.WriteLine(Cache<Point>.Hits + " " + Cache<Order>.Hits); // 1 1   (one static ctor per closed type)

Console.WriteLine(Gen.Digits().Matches("a1b22c333").Count);     // 3   (source-generated regex)

[Flags] enum Perm { None = 0, Read = 1, Write = 2, Exec = 4 }
record struct Point(int X, int Y);
record Order(int Id);

static class Flags
{
    public static string Describe<T>(T value) where T : struct, Enum
    {
        int n = Enum.GetValues<T>().Count(f => Convert.ToInt64(f) != 0 && value.HasFlag(f));
        return $"{value} ({n} flags)";
    }
}
static class Bytes { public static int SizeOf<T>() where T : unmanaged => System.Runtime.CompilerServices.Unsafe.SizeOf<T>(); }
static class Factory { public static T Make<T>() where T : new() => new T(); }

static class Cache<T>
{
    public static int Hits;
    public static readonly string[] Props = Load();
    static string[] Load() { Hits++; return typeof(T).GetProperties().Select(p => p.Name).ToArray(); }
}

static partial class Gen
{
    [GeneratedRegex(@"\\d+")]
    public static partial Regex Digits();
}` }],
    codeTitle: ['Constraints and caches'],
    viz: {
      title: 'One static cache per closed generic type',
      gen: function () {
        var mem = function (rows, hl) { return { type: 'table', label: 'Static storage per closed type', columns: ['closed type', 'static ctor ran?', 'Props'], rows: rows, hl: hl || {} }; };
        return codeFrames(T8_CODE, [
          { l: [1, 4], extra: [mem([['TypeCache<Order>', 'no', '—'], ['TypeCache<User>', 'no', '—']])], narr: 'A generic static class. Its static fields do not exist once per <i>class</i> but once per <b>closed</b> type argument.' },
          { l: 6, extra: [mem([['TypeCache<Order>', 'running…', 'reflection: GetProperties()'], ['TypeCache<User>', 'no', '—']], { 0: 'cur' })], narr: 'First touch of TypeCache&lt;Order&gt;: the runtime runs its static initializer exactly once (thread-safe, guarded by a type-init lock).' },
          { l: 6, v: { a: '["Id", "Total"]' }, extra: [mem([['TypeCache<Order>', 'yes', '["Id","Total"]'], ['TypeCache<User>', 'no', '—']], { 0: 'ok' })], narr: 'The array is stored in Order\'s static slot.' },
          { l: 7, v: { a: '["Id", "Total"]', b: 'same reference' }, hv: { b: 'ok' }, extra: [mem([['TypeCache<Order>', 'yes', '["Id","Total"]'], ['TypeCache<User>', 'no', '—']], { 0: 'ok' })], narr: 'Second access: a direct static field load. No dictionary, no lock, no reflection — the JIT may even treat it as a constant.' },
          { l: 8, v: { c: '["Name", "Email"]' }, extra: [mem([['TypeCache<Order>', 'yes', '["Id","Total"]'], ['TypeCache<User>', 'yes', '["Name","Email"]']], { 1: 'ok' })], narr: 'A different type argument is a different closed type with its own static storage and its own one-time initializer.' }
        ]);
      }
    },
    examples: [
      { title: 'Constraints do not overload', html: `<p>${C('void M<T>(T x) where T : struct')} and ${C('void M<T>(T x) where T : class')} in the same class: CS0111 (member already defined). Overloads need different parameter lists, e.g. ${C('M<T>(T x) where T : struct')} vs ${C('M<T>(T? x) where T : struct')}.</p>` },
      { title: 'unmanaged lets you reinterpret bytes', html: `<p>${C('unmanaged')} guarantees there are no GC references inside, so a span of structs can be viewed as bytes safely.</p>`, code: `
using System.Runtime.InteropServices;

static class Raw
{
    public static byte[] ToBytes<T>(T[] items) where T : unmanaged
        => MemoryMarshal.AsBytes(items.AsSpan()).ToArray();
}` },
      { title: 'What a source generator looks like (overview)', html: `<p>A generator lives in a separate netstandard2.0 project referenced as an analyzer. This sketch generates a ${C('Describe()')} method for every partial class marked ${C('[AutoDescribe]')}. It is shown for structure only — it needs the Microsoft.CodeAnalysis packages to build.</p>`, code: { lang: 'csharp', check: false, code: `
[Generator]
public sealed class DescribeGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext ctx)
    {
        var classes = ctx.SyntaxProvider.ForAttributeWithMetadataName(
            "AutoDescribeAttribute",
            predicate: (node, _) => node is ClassDeclarationSyntax,
            transform: (c, _) => (INamedTypeSymbol)c.TargetSymbol);

        ctx.RegisterSourceOutput(classes, (spc, type) =>
        {
            var props = type.GetMembers().OfType<IPropertySymbol>().Select(p => $"{p.Name}={{{p.Name}}}");
            spc.AddSource($"{type.Name}.Describe.g.cs",
                $"partial class {type.Name} {{ public string Describe() => $\\"{string.Join(", ", props)}\\"; }}");
        });
    }
}` } }
    ],
    deepDive: `<p><b>Generic code sharing.</b> For reference-type arguments the JIT shares one native body (${C('List<string>')} and ${C('List<object>')} use the same machine code, with a hidden generic-dictionary argument for type-specific lookups). For each value-type argument it generates a specialised body. That is why ${C('typeof(T) == typeof(int)')} branches disappear in value-type instantiations and why static generic caches are cheap: for shared code the static base is found through the dictionary, still without hashing.</p>
<p><b>Incremental generators.</b> Old ${C('ISourceGenerator')}s re-ran on every keystroke in the IDE. ${C('IIncrementalGenerator')} builds a pipeline of cached, equatable steps (${C('ForAttributeWithMetadataName')} is heavily optimised), so the IDE stays responsive. A key rule: the values flowing through the pipeline must have value equality (records of strings, not symbols), otherwise caching never hits.</p>
<p><b>Interceptors</b> (experimental in .NET 8) let generated code replace specific call sites — used by ASP.NET Core minimal APIs and configuration binding for AOT. <b>Trimming annotations</b> (${C('[DynamicallyAccessedMembers(PublicProperties)]')} on a ${C('Type')} parameter or ${C('T')}) tell the trimmer which members reflection needs, an alternative when generators are not possible.</p>`,
    aiEra: `<p><b>What AI changes:</b> generators used to be a niche skill; now an assistant can scaffold one. <b>Use AI as a partner:</b> <code>Convert this reflection-based mapper to an incremental source generator and list what must be equatable in the pipeline</code>. <b>Where AI goes wrong:</b> it writes the obsolete ${C('ISourceGenerator')}, passes Roslyn symbols through the pipeline (breaking caching), targets net8.0 instead of netstandard2.0 for the generator project, or tries to modify existing code (generators can only add). <b>What you must still own:</b> choosing reflection vs expression trees vs generators, and measuring start-up and steady-state cost.</p>`,
    problems: [{
      title: 'Generic Flags Inspector with an Enum Constraint',
      level: 'Easy', tags: ['generic constraints', 'Enum', 'Flags'], companies: ['Microsoft', 'Siemens'],
      statement: `<p>Write ${C('static string[] SetFlags<T>(T value) where T : struct, Enum')} that returns the names of all <b>non-zero</b> single-bit members of ${C('T')} contained in ${C('value')}, in ascending numeric order, without reflection on fields. Given ${C('[Flags] enum Perm { None = 0, Read = 1, Write = 2, Exec = 4, Delete = 8 }')}, ${C('Inspect(int bits)')} returns ${C('SetFlags((Perm)bits)')} followed by one last entry: ${C('((Perm)bits).ToString()')}.</p>`,
      constraints: `0 ≤ bits ≤ 31. Bit 16 (value 16) has no name.`,
      example: `<p>${C('Inspect(3)')} → ${H.c('g', '["Read", "Write", "Read, Write"]')}; ${C('Inspect(16)')} → ${H.c('g', '["16"]')}</p>`,
      brute: { why: `<p>A hand-written ${C('if ((p & Perm.Read) != 0) list.Add("Read")')} chain must be edited for every new member and copied for every enum. The ${C('Enum')} constraint makes one generic method work for all flag enums.</p>`, code: `
[System.Flags] enum Perm0 { None = 0, Read = 1, Write = 2 }
static class Manual
{
    public static List<string> Names(Perm0 p)
    {
        var l = new List<string>();
        if ((p & Perm0.Read) != 0) l.Add("Read");
        if ((p & Perm0.Write) != 0) l.Add("Write");
        return l;
    }
}` },
      mcq: { q: 'Without <code>where T : struct, Enum</code>, which line would not compile?', options: ['<code>Enum.GetValues&lt;T&gt;()</code>', '<code>value.ToString()</code>', '<code>value.Equals(other)</code>', '<code>typeof(T).Name</code>'], answer: 0, explain: 'Enum.GetValues&lt;TEnum&gt;() itself is declared with where TEnum : struct, Enum, so the caller must provide the same constraint. ToString/Equals/typeof work on any T.' },
      hints: [`<p>Hint 1: ${C('Enum.GetValues<T>()')} returns the members in ascending order of their unsigned value.</p>`, `<p>Hint 2: skip members whose value is 0 (${C('None')}) — ${C('value.HasFlag(None)')} is always true.</p>`, `<p>Hint 3: ${C('Convert.ToUInt64(member)')} gives the numeric value; a single bit means ${C('(v & (v - 1)) == 0')}.</p>`],
      tests: { sig: 'int -> string[]', fn: 'inspect', cases: [
        [[3], ['Read', 'Write', 'Read, Write']],
        [[0], ['None']],
        [[16], ['16']],
        [[15], ['Read', 'Write', 'Exec', 'Delete', 'Read, Write, Exec, Delete']],
        [[4], ['Exec', 'Exec']],
        [[9], ['Read', 'Delete', 'Read, Delete']],
        [[31], ['Read', 'Write', 'Exec', 'Delete', '31']]
      ] },
      solution: {
        approach: `<p>The ${C('struct, Enum')} constraint allows ${C('Enum.GetValues<T>()')} and ${C('HasFlag')} on T. Filter out zero and multi-bit members, keep those contained in the value. ${C('Enum.ToString()')} on a ${C('[Flags]')} enum prints a comma list when the bits are fully covered by named members, otherwise the number.</p>`,
        code: `
public class Solution
{
    public static string[] Inspect(int bits)
    {
        var p = (Perm)bits;
        return SetFlags(p).Append(p.ToString()).ToArray();
    }

    public static string[] SetFlags<T>(T value) where T : struct, Enum
    {
        var names = new List<string>();
        foreach (T member in Enum.GetValues<T>())
        {
            ulong v = Convert.ToUInt64(member);
            if (v != 0 && (v & (v - 1)) == 0 && value.HasFlag(member))
                names.Add(member.ToString());
        }
        return names.ToArray();
    }
}

[Flags]
public enum Perm { None = 0, Read = 1, Write = 2, Exec = 4, Delete = 8 }`,
        dry: { head: ['member', 'value', 'single bit?', 'in 9?', 'added'], rows: [['None', '0', '—', '—', 'skip'], ['Read', '1', 'yes', 'yes', 'Read'], ['Write', '2', 'yes', 'no', '—'], ['Exec', '4', 'yes', 'no', '—'], ['Delete', '8', 'yes', 'yes', 'Delete']] },
        complexity: `<p>O(m) for m enum members. ${C('HasFlag')} on a generic T is optimised by the JIT for value-type instantiations (no boxing since .NET Core 2.1).</p>`,
        followUps: ['Cache <code>Enum.GetValues&lt;T&gt;()</code> in a static generic class.', 'Handle enums whose underlying type is long or byte.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Type Names and GetType',
    level: 'Easy', tags: ['output prediction', 'reflection', 'Type'], companies: ['TCS', 'Infosys', 'Microsoft'],
    statement: `<p>Without running it, write down the 9 lines this program prints.</p>${P(`
Console.WriteLine(typeof(List<int>).Name);
Console.WriteLine(typeof(int).FullName);
Console.WriteLine(typeof(int[]).Name);
Console.WriteLine(typeof(Dictionary<,>).IsGenericTypeDefinition);
Console.WriteLine(new List<string>().GetType().GetGenericArguments()[0].Name);
Console.WriteLine(typeof(string).IsValueType);
Console.WriteLine(typeof(int?).Name);
object o = 5;
Console.WriteLine(o.GetType() == typeof(int));
int? n = 5;
Console.WriteLine(n.GetType().Name);`)}`,
    constraints: `.NET 8. bool prints as True/False.`,
    example: `<p>Line 1 is ${H.c('g', 'List`1')}: the CLR name of a generic type ends with a backtick and its number of type parameters.</p>`,
    brute: { why: `<p>Guessing from C# syntax gives "List&lt;int&gt;", "int", "int[]", "Nullable&lt;int&gt;"… but reflection reports <b>CLR</b> names (Int32, List\`1), and calling ${C('GetType()')} on a nullable boxes it first, which loses the Nullable wrapper.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "List<int>", "int", "int[]", "True", "string", "False", "int?", "True", "Nullable<int>" };
}` },
    mcq: { q: 'Why does <code>((int?)5).GetType()</code> report <code>Int32</code>?', options: ['GetType is non-virtual on object, so the nullable is boxed first — and boxing a Nullable&lt;int&gt; with a value produces a boxed int', 'Nullable&lt;T&gt; overrides GetType', 'The JIT removes the nullable', 'It is a compiler bug'], answer: 0, explain: 'Boxing Nullable&lt;T> boxes the underlying value (or gives null if HasValue is false). There is no such thing as a boxed Nullable&lt;int>.' },
    hints: [`<p>Hint 1: reflection uses CLR type names: ${C('Int32')}, ${C('String')}, and generic names with a backtick arity suffix like ${C('List`1')}.</p>`, `<p>Hint 2: ${C('Dictionary<,>')} is an <b>open</b> generic type — a generic type definition.</p>`, `<p>Hint 3: calling an ${C('object')} method on a struct boxes it; a boxed ${C('int?')} is a boxed ${C('int')}.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'List`1\nSystem.Int32\nInt32[]\nTrue\nString\nFalse\nNullable`1\nTrue\nInt32' }] },
    solution: {
      approach: `<p>Apply three facts: CLR names (not C# keywords) with backtick arity for generics; ${C('typeof(X<,>)')} is a definition; ${C('GetType()')} on a nullable value boxes it to the underlying type.</p>`,
      code: `
Console.WriteLine(typeof(List<int>).Name);                                     // List\`1
Console.WriteLine(typeof(int).FullName);                                       // System.Int32
Console.WriteLine(typeof(int[]).Name);                                         // Int32[]
Console.WriteLine(typeof(Dictionary<,>).IsGenericTypeDefinition);              // True
Console.WriteLine(new List<string>().GetType().GetGenericArguments()[0].Name); // String
Console.WriteLine(typeof(string).IsValueType);                                 // False
Console.WriteLine(typeof(int?).Name);                                          // Nullable\`1
object o = 5;
Console.WriteLine(o.GetType() == typeof(int));                                 // True
int? n = 5;
Console.WriteLine(n.GetType().Name);                                           // Int32`,
      dry: { head: ['expression', 'output', 'rule'], rows: [['typeof(List&lt;int&gt;).Name', 'List`1', 'CLR name + arity'], ['typeof(int?).Name', 'Nullable`1', 'typeof keeps the nullable type'], ['n.GetType().Name', 'Int32', 'boxing unwraps the nullable']] },
      complexity: `<p>O(1). The skill is knowing CLR naming and boxing rules.</p>`,
      followUps: ['What does <code>typeof(List&lt;int&gt;).FullName</code> print? (System.Collections.Generic.List`1[[System.Int32, ...]])', 'What does <code>((int?)null).GetType()</code> do? (NullReferenceException)']
    }
  });

  practice.push({
    title: 'IsPalindrome Extension Method',
    level: 'Easy', tags: ['extension methods', 'strings', 'two pointers'], companies: ['Amazon', 'Microsoft', 'Meta'],
    statement: `<p>Write ${C('public static bool IsPalindrome(this string? s)')} that ignores every character that is not a letter or digit and compares case-insensitively. A ${C('null')} receiver returns ${C('false')}; an empty string (or one with no letters/digits) is a palindrome. ${C('Solution.Check(string? s)')} must call it with extension syntax.</p>`,
    constraints: `0 ≤ length ≤ 2·10<sup>5</sup>. ASCII input.`,
    example: `<p>${C('"A man, a plan, a canal: Panama".IsPalindrome()')} → ${H.c('g', 'true')}</p>`,
    brute: { why: `<p>Building a cleaned, lower-cased copy and comparing it with its reverse allocates two extra strings of length n. Two pointers on the original string use O(1) extra memory.</p>`, code: `
static class Brute
{
    public static bool IsPal(string s)
    {
        string clean = new string(s.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());
        return clean == new string(clean.Reverse().ToArray());
    }
}` },
    mcq: { q: 'What happens with <code>string? s = null; s.IsPalindrome();</code>?', options: ['The extension receives null as its first argument and can handle it', 'NullReferenceException before the call', 'Compile error', 'It returns true automatically'], answer: 0, explain: 'An extension method call is a static call; no dereference happens until the method body touches s.' },
    hints: [`<p>Hint 1: the class must be ${C('public static')} and top-level; the first parameter is ${C('this string? s')}.</p>`, `<p>Hint 2: move ${C('i')} forward and ${C('j')} backward, skipping characters where ${C('char.IsLetterOrDigit')} is false.</p>`, `<p>Hint 3: compare ${C('char.ToLowerInvariant(s[i])')} with ${C('char.ToLowerInvariant(s[j])')}.</p>`],
    tests: { sig: 'string -> bool', fn: 'check', cases: [
      [['A man, a plan, a canal: Panama'], true],
      [['race a car'], false],
      [[''], true],
      [[null], false],
      [['.,!'], true],
      [['0P'], false],
      [['Ab1bA'], true],
      [[{ $concat: [{ $rep: 'ab', n: 50000 }, { $rep: 'ba', n: 50000 }] }], true]
    ] },
    solution: {
      approach: `<p>Two pointers that skip non-alphanumerics, comparing lower-cased characters. As an extension, the method reads naturally in client code and handles a null receiver explicitly.</p>`,
      code: `
public class Solution
{
    public static bool Check(string? s) => s.IsPalindrome();
}

public static class StringExtensions
{
    public static bool IsPalindrome(this string? s)
    {
        if (s is null) return false;
        int i = 0, j = s.Length - 1;
        while (i < j)
        {
            if (!char.IsLetterOrDigit(s[i])) { i++; continue; }
            if (!char.IsLetterOrDigit(s[j])) { j--; continue; }
            if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;
            i++; j--;
        }
        return true;
    }
}`,
      dry: { head: ['i', 'j', 's[i]', 's[j]', 'action'], rows: [['0', '4', 'A', 'A', 'equal'], ['1', '3', 'b', 'b', 'equal'], ['2', '2', '1', '1', 'stop → true']] },
      complexity: `<p>O(n) time, O(1) extra space.</p>`,
      followUps: ['Support full Unicode with <code>Rune</code> enumeration.', 'Return the longest palindromic prefix instead.']
    }
  });

  practice.push({
    title: 'Vector Struct with Operators',
    level: 'Easy', tags: ['operator overloading', 'record struct'], companies: ['Unity', 'EA', 'Microsoft'],
    statement: `<p>Create ${C('readonly record struct Vec(int X, int Y)')} with operators ${C('a + b')}, ${C('a - b')}, ${C('a * k')} (scalar on the right), ${C('k * a')} (scalar on the left), unary ${C('-a')}, and a method ${C('Dot')}. ${C('ToString()')} returns ${C('"(X, Y)"')}. ${C('Ops(x1, y1, x2, y2)')} returns ${C('[a + b, a - b, a * 2, 3 * b, -a, dot, a == b]')} as strings (dot as a number, equality as ${C('True')}/${C('False')}).</p>`,
    constraints: `|coordinates| ≤ 10<sup>4</sup>.`,
    example: `<p>${C('Ops(1, 2, 3, 4)')} → ${H.c('g', '["(4, 6)", "(-2, -2)", "(2, 4)", "(9, 12)", "(-1, -2)", "11", "False"]')}</p>`,
    brute: { why: `<p>Static helpers ${C('Vec.Add(a, Vec.Scale(b, 3))')} read inside-out. Operators let the code look like the maths: ${C('a + 3 * b')}.</p>`, code: `
record struct V0(int X, int Y);
static class VecMath
{
    public static V0 Add(V0 a, V0 b) => new(a.X + b.X, a.Y + b.Y);
    public static V0 Scale(V0 a, int k) => new(a.X * k, a.Y * k);
}` },
    mcq: { q: 'You define only <code>operator *(Vec a, int k)</code>. Does <code>2 * v</code> compile?', options: ['No — operators are not automatically commutative; define operator *(int, Vec) too', 'Yes, the compiler swaps operands', 'Yes, via implicit conversion', 'Only for record structs'], answer: 0, explain: 'Overload resolution matches parameter order exactly. Each operand order needs its own operator.' },
    hints: [`<p>Hint 1: a ${C('record struct')} already generates ${C('==')}, ${C('!=')}, ${C('Equals')} and ${C('GetHashCode')}.</p>`, `<p>Hint 2: declare both ${C('operator *(Vec a, int k)')} and ${C('operator *(int k, Vec a)')}.</p>`, `<p>Hint 3: override ${C('ToString')} to ${C('$"({X}, {Y})"')} — the generated one prints ${C('Vec { X = 1, Y = 2 }')}.</p>`],
    tests: { sig: 'int int int int -> string[]', fn: 'ops', cases: [
      [[1, 2, 3, 4], ['(4, 6)', '(-2, -2)', '(2, 4)', '(9, 12)', '(-1, -2)', '11', 'False']],
      [[0, 0, 0, 0], ['(0, 0)', '(0, 0)', '(0, 0)', '(0, 0)', '(0, 0)', '0', 'True']],
      [[5, -5, 5, -5], ['(10, -10)', '(0, 0)', '(10, -10)', '(15, -15)', '(-5, 5)', '50', 'True']],
      [[-1, 0, 0, 1], ['(-1, 1)', '(-1, -1)', '(-2, 0)', '(0, 3)', '(1, 0)', '0', 'False']],
      [[10000, 10000, -10000, 10000], ['(0, 20000)', '(20000, 0)', '(20000, 20000)', '(-30000, 30000)', '(-10000, -10000)', '0', 'False']],
      [[7, 3, 2, 9], ['(9, 12)', '(5, -6)', '(14, 6)', '(6, 27)', '(-7, -3)', '41', 'False']]
    ] },
    solution: {
      approach: `<p>The record struct provides value equality; we add the arithmetic operators (two orders for scalar multiplication) and a readable ${C('ToString')}.</p>`,
      code: `
public class Solution
{
    public static string[] Ops(int x1, int y1, int x2, int y2)
    {
        var a = new Vec(x1, y1);
        var b = new Vec(x2, y2);
        return new[] { (a + b).ToString(), (a - b).ToString(), (a * 2).ToString(), (3 * b).ToString(),
                       (-a).ToString(), a.Dot(b).ToString(), (a == b).ToString() };
    }
}

public readonly record struct Vec(int X, int Y)
{
    public static Vec operator +(Vec a, Vec b) => new(a.X + b.X, a.Y + b.Y);
    public static Vec operator -(Vec a, Vec b) => new(a.X - b.X, a.Y - b.Y);
    public static Vec operator -(Vec a) => new(-a.X, -a.Y);
    public static Vec operator *(Vec a, int k) => new(a.X * k, a.Y * k);
    public static Vec operator *(int k, Vec a) => a * k;
    public int Dot(Vec o) => X * o.X + Y * o.Y;
    public override string ToString() => $"({X}, {Y})";
}`,
      dry: { head: ['expression', 'result'], rows: [['(1,2) + (3,4)', '(4, 6)'], ['3 * (3,4)', '(9, 12)'], ['(1,2)·(3,4)', '3 + 8 = 11']] },
      complexity: `<p>O(1) per operation; small readonly structs are passed in registers and the operators inline.</p>`,
      followUps: ['Implement <code>IAdditionOperators&lt;Vec, Vec, Vec&gt;</code> so Vec works with generic Sum.', 'Add a <code>double Length</code> property.']
    }
  });

  practice.push({
    title: 'Attribute-Driven CSV Mapper',
    level: 'Medium', tags: ['attributes', 'reflection', 'CSV'], companies: ['Microsoft', 'Thoughtworks', 'Accenture'],
    statement: `<p>Write a generic ${C('CsvWriter.Header<T>()')} and ${C('CsvWriter.Row<T>(T item)')} driven by attributes: ${C('[Column(name, Order = n, Format = "...")]')} renames, orders and formats a property; ${C('[Ignore]')} skips it; properties without an attribute use their name in lower case and come <b>after</b> all ordered ones (in declaration order). Values containing a comma, a double quote or a newline are wrapped in quotes with inner quotes doubled. Numbers use the invariant culture. For the given ${C('Employee')} class, ${C('ToCsv(id, name, salary, dept)')} returns ${C('[header, row]')}.</p>`,
    constraints: `Employee: Id ([Column("id", Order = 1)]), Name ([Column("full_name", Order = 2)]), Password ([Ignore]), Salary ([Column("salary", Order = 3, Format = "F2")]), Dept (no attribute).`,
    example: `<p>${C('ToCsv(2, "Rao, K", 1234.5, "Ops")')} → ${H.c('g', '["id,full_name,salary,dept", "2,\\"Rao, K\\",1234.50,Ops"]')}</p>`,
    brute: { why: `<p>A hand-written ${C('$"{e.Id},{e.Name},{e.Salary}"')} for every class forgets quoting, breaks when a column is added, and leaks fields like Password the moment someone copies it. Attributes put the mapping next to the data, and one writer serves all classes.</p>`, code: `
class Emp0 { public int Id; public string Name = ""; public double Salary; }
static class ManualCsv
{
    public static string Row(Emp0 e) => $"{e.Id},{e.Name},{e.Salary}";   // no quoting, culture-dependent
}` },
    mcq: { q: 'Why sort by the attribute <code>Order</code> instead of relying on <code>GetProperties()</code> order?', options: ['GetProperties does not guarantee any order', 'Attributes are faster', 'GetProperties returns alphabetical order', 'Order is required by the CSV standard'], answer: 0, explain: 'The documentation explicitly says the order is not guaranteed; explicit ordering makes the output stable across runtimes.' },
    hints: [`<p>Hint 1: ${C('[AttributeUsage(AttributeTargets.Property)] sealed class ColumnAttribute(string name) : Attribute')} with settable ${C('Order')} and ${C('Format')} properties (named arguments).</p>`, `<p>Hint 2: sort key: ${C('(attr?.Order ?? int.MaxValue, prop.MetadataToken)')}.</p>`, `<p>Hint 3: format with ${C('IFormattable.ToString(format, CultureInfo.InvariantCulture)')} when a format is given, then apply the quoting rule.</p>`],
    tests: { sig: 'int string double string -> string[]', fn: 'toCsv', cases: [
      [[1, 'Asha', 50000, 'Eng'], ['id,full_name,salary,dept', '1,Asha,50000.00,Eng']],
      [[2, 'Rao, K', 1234.5, 'Ops'], ['id,full_name,salary,dept', '2,"Rao, K",1234.50,Ops']],
      [[3, 'Say "hi"', 0, ''], ['id,full_name,salary,dept', '3,"Say ""hi""",0.00,']],
      [[4, 'Li', -12.3, 'QA'], ['id,full_name,salary,dept', '4,Li,-12.30,QA']],
      [[-1, '', 99.999, 'R&D'], ['id,full_name,salary,dept', '-1,,100.00,R&D']],
      [[6, 'Line1\nLine2', 1, 'A,B'], ['id,full_name,salary,dept', '6,"Line1\nLine2",1.00,"A,B"']]
    ] },
    solution: {
      approach: `<p>Compute the column list once per type: read ${C('ColumnAttribute')}/${C('IgnoreAttribute')}, drop ignored properties, sort by (Order, MetadataToken). Store it in a static generic cache (${C('Columns<T>.List')}) so reflection runs once per type. Writing a row formats each value and applies RFC 4180 quoting.</p>`,
      code: `
using System.Globalization;
using System.Reflection;

public class Solution
{
    public static string[] ToCsv(int id, string name, double salary, string dept)
    {
        var e = new Employee { Id = id, Name = name, Salary = salary, Dept = dept, Password = "secret" };
        return new[] { CsvWriter.Header<Employee>(), CsvWriter.Row(e) };
    }
}

[AttributeUsage(AttributeTargets.Property)]
public sealed class ColumnAttribute(string name) : Attribute
{
    public string Name => name;
    public int Order { get; set; } = int.MaxValue;
    public string? Format { get; set; }
}

[AttributeUsage(AttributeTargets.Property)]
public sealed class IgnoreAttribute : Attribute { }

public static class CsvWriter
{
    private sealed record Col(PropertyInfo Prop, string Name, string? Format);

    private static class Columns<T>
    {
        public static readonly Col[] List = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => !p.IsDefined(typeof(IgnoreAttribute)))
            .Select(p => (p, a: p.GetCustomAttribute<ColumnAttribute>()))
            .OrderBy(x => x.a?.Order ?? int.MaxValue).ThenBy(x => x.p.MetadataToken)
            .Select(x => new Col(x.p, x.a?.Name ?? x.p.Name.ToLowerInvariant(), x.a?.Format))
            .ToArray();
    }

    public static string Header<T>() => string.Join(",", Columns<T>.List.Select(c => Quote(c.Name)));

    public static string Row<T>(T item) => string.Join(",", Columns<T>.List.Select(c =>
    {
        object? v = c.Prop.GetValue(item);
        string s = v is IFormattable f ? f.ToString(c.Format, CultureInfo.InvariantCulture) : v?.ToString() ?? "";
        return Quote(s);
    }));

    private static string Quote(string s) =>
        s.IndexOfAny(new[] { ',', '"', '\\n', '\\r' }) >= 0 ? "\\"" + s.Replace("\\"", "\\"\\"") + "\\"" : s;
}

public class Employee
{
    [Column("id", Order = 1)] public int Id { get; set; }
    [Column("full_name", Order = 2)] public string Name { get; set; } = "";
    [Ignore] public string Password { get; set; } = "";
    [Column("salary", Order = 3, Format = "F2")] public double Salary { get; set; }
    public string Dept { get; set; } = "";
}`,
      dry: { head: ['property', 'attribute', 'column', 'sort key'], rows: [['Id', 'Column(id, 1)', 'id', '(1, t1)'], ['Name', 'Column(full_name, 2)', 'full_name', '(2, t2)'], ['Password', 'Ignore', '—', 'dropped'], ['Salary', 'Column(salary, 3, F2)', 'salary', '(3, t4)'], ['Dept', 'none', 'dept', '(MAX, t5)']] },
      complexity: `<p>Per type: one reflection pass, O(P log P). Per row: O(P + total value length). The static generic cache makes repeated rows reflection-free except for <code>GetValue</code>.</p>`,
      followUps: ['Replace <code>GetValue</code> with compiled expression-tree getters.', 'Write the matching CSV reader that sets properties from a header.']
    }
  });

  practice.push({
    title: 'Overflow-Safe Generic Average',
    level: 'Medium', tags: ['generic math', 'IBinaryInteger', 'Int128'], companies: ['JPMorgan', 'Morgan Stanley', 'Microsoft'],
    statement: `<p>Write ${C('static double Average<T>(ReadOnlySpan<T> xs) where T : IBinaryInteger<T>')} that never overflows: accumulate in ${C('Int128')} using ${C('Int128.CreateChecked')}, then divide as double. ${C('AverageOf(long[] a)')} calls it. Explain why accumulating in ${C('T')} would be wrong for ${C('[long.MaxValue, long.MaxValue]')}.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; values are any long.`,
    example: `<p>${C('AverageOf([9223372036854775807, 9223372036854775807])')} → ${H.c('g', '9.223372036854776E18')} (summing in long would wrap to −2 and give −1).</p>`,
    brute: { why: `<p>${C('a.Average()')} on ${C('long[]')} accumulates in long inside a ${C('checked')} block and throws ${C('OverflowException')} for large inputs; summing in double loses precision for values above 2<sup>53</sup>. A wider integer accumulator is exact.</p>`, code: `
static class Naive
{
    public static double Avg(long[] a)
    {
        long s = 0;
        foreach (var x in a) s += x;   // wraps silently
        return (double)s / a.Length;
    }
}` },
    mcq: { q: 'What does <code>Int128.CreateChecked(x)</code> do for a long x?', options: ['Converts it exactly — every long fits in Int128', 'Throws if x is negative', 'Truncates to 64 bits', 'Rounds to the nearest double'], answer: 0, explain: 'Int128 has a wider range than long, so the checked conversion always succeeds; it would throw only for values outside Int128 (e.g. a huge BigInteger).' },
    hints: [`<p>Hint 1: ${C('IBinaryInteger<T>')} covers byte, int, long, Int128, BigInteger…; ${C('using System.Numerics;')}.</p>`, `<p>Hint 2: ${C('Int128 sum = 0; foreach (T x in xs) sum += Int128.CreateChecked(x);')}</p>`, `<p>Hint 3: ${C('(double)sum / xs.Length')} — Int128 has an explicit conversion to double.</p>`],
    tests: { sig: 'long[] -> double', fn: 'averageOf', cmp: 'float', cases: [
      [[[1, 2, 3, 4]], 2.5],
      [[['9223372036854775807', '9223372036854775807']], 9223372036854775807],
      [[['-9223372036854775808', '-9223372036854775808', '-9223372036854775808']], -9223372036854775808],
      [[['9223372036854775807', '-9223372036854775808']], -0.5],
      [[[5]], 5],
      [[[-1, -2]], -1.5],
      [[{ $rep: '9223372036854775807', n: 100000 }], 9223372036854775807]
    ] },
    solution: {
      approach: `<p>Use a wider accumulator: every T converts exactly into Int128 (for 64-bit and smaller integers), and 10<sup>5</sup> · 2<sup>63</sup> ≈ 9.2·10<sup>23</sup> fits easily in Int128's ±1.7·10<sup>38</sup>. Only the final division uses floating point.</p>`,
      code: `
using System.Numerics;

public class Solution
{
    public static double AverageOf(long[] a) => Average<long>(a);

    public static double Average<T>(ReadOnlySpan<T> xs) where T : IBinaryInteger<T>
    {
        if (xs.IsEmpty) throw new InvalidOperationException("empty");
        Int128 sum = Int128.Zero;
        foreach (T x in xs) sum += Int128.CreateChecked(x);
        return (double)sum / xs.Length;
    }
}`,
      dry: { head: ['x', 'sum (Int128)'], rows: [['9223372036854775807', '9223372036854775807'], ['9223372036854775807', '18446744073709551614'], ['÷ 2', '9.223372036854776E18']] },
      complexity: `<p>O(n) time, O(1) space. Int128 addition is two 64-bit adds with carry.</p>`,
      followUps: ['Make the accumulator type a second type parameter <code>TAcc</code>.', 'Return an exact rational average (sum and count) instead of a double.']
    }
  });

  practice.push({
    title: 'Call a Method by Name with Reflection',
    level: 'Medium', tags: ['reflection', 'MethodInfo', 'TargetInvocationException'], companies: ['Microsoft', 'Oracle', 'SAP'],
    statement: `<p>${C('Call(name, a, b)')} must find a <b>public instance</b> method declared on ${C('Calculator')} with signature ${C('(int, int)')} by its exact name, invoke it and return the result as a string. If no such method exists (wrong case, private, static or wrong parameters) return ${C('"unknown method"')}; if the method throws, return ${C('"error: "')} + the <b>inner</b> exception's type name.</p>`,
    constraints: `Calculator: public Add, Sub, Mul, Div (int, int → int, unchecked), private Secret(int, int), public static Max(int, int).`,
    example: `<p>${C('Call("Div", 1, 0)')} → ${H.c('g', '"error: DivideByZeroException"')}; ${C('Call("Max", 3, 9)')} → ${H.c('g', '"unknown method"')}</p>`,
    brute: { why: `<p>A ${C('switch (name)')} over every method works until someone adds a method and forgets the switch. Reflection discovers methods automatically — which is how command dispatchers, RPC frameworks and test runners work. The naive reflection version, though, catches ${C('TargetInvocationException')} and reports the wrong error.</p>`, code: `
static class SwitchCalc
{
    public static string Call(string name, int a, int b) => name switch
    {
        "Add" => (a + b).ToString(),
        "Sub" => (a - b).ToString(),
        _ => "unknown method"
    };
}` },
    mcq: { q: 'Div throws DivideByZeroException when invoked through <code>MethodInfo.Invoke</code>. What does the caller catch?', options: ['TargetInvocationException whose InnerException is the DivideByZeroException', 'DivideByZeroException directly', 'InvalidOperationException', 'Nothing; Invoke swallows it'], answer: 0, explain: 'Invoke wraps exceptions thrown by the target, unless you pass BindingFlags.DoNotWrapExceptions (.NET 5+).' },
    hints: [`<p>Hint 1: ${C('typeof(Calculator).GetMethod(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly, new[] { typeof(int), typeof(int) })')} returns null when nothing matches.</p>`, `<p>Hint 2: names are case-sensitive by default; ${C('BindingFlags.IgnoreCase')} would change that.</p>`, `<p>Hint 3: ${C('catch (TargetInvocationException e) { return "error: " + e.InnerException!.GetType().Name; }')}</p>`],
    tests: { sig: 'string int int -> string', fn: 'call', cases: [
      [['Add', 2, 3], '5'],
      [['Div', 7, 2], '3'],
      [['Div', 1, 0], 'error: DivideByZeroException'],
      [['Secret', 1, 1], 'unknown method'],
      [['add', 1, 1], 'unknown method'],
      [['Mul', -4, 5], '-20'],
      [['Sub', -2147483648, 1], '2147483647'],
      [['Max', 3, 9], 'unknown method'],
      [['ToString', 1, 2], 'unknown method']
    ] },
    solution: {
      approach: `<p>Look the method up with explicit flags and parameter types so only public, instance, declared-here ${C('(int, int)')} methods qualify. Invoke on a new Calculator and unwrap ${C('TargetInvocationException')}.</p>`,
      code: `
using System.Reflection;

public class Solution
{
    public static string Call(string name, int a, int b)
    {
        MethodInfo? m = typeof(Calculator).GetMethod(name,
            BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly,
            new[] { typeof(int), typeof(int) });
        if (m is null) return "unknown method";
        try
        {
            return Convert.ToString(m.Invoke(new Calculator(), new object[] { a, b }))!;
        }
        catch (TargetInvocationException e) when (e.InnerException is not null)
        {
            return "error: " + e.InnerException.GetType().Name;
        }
    }
}

public class Calculator
{
    public int Add(int a, int b) => unchecked(a + b);
    public int Sub(int a, int b) => unchecked(a - b);
    public int Mul(int a, int b) => unchecked(a * b);
    public int Div(int a, int b) => a / b;
    private int Secret(int a, int b) => 42;
    public static int Max(int a, int b) => Math.Max(a, b);
}`,
      dry: { head: ['name', 'GetMethod result', 'outcome'], rows: [['Add', 'Add(int,int)', '5'], ['Secret', 'null (private)', 'unknown method'], ['Max', 'null (static)', 'unknown method'], ['Div, b = 0', 'Div(int,int)', 'TargetInvocationException → DivideByZeroException']] },
      complexity: `<p>O(M) lookup over the type's methods per call; cache MethodInfo (or a delegate) per name for repeated calls.</p>`,
      followUps: ['Cache a <code>Func&lt;Calculator, int, int, int&gt;</code> per name with <code>CreateDelegate</code>.', 'Use <code>BindingFlags.DoNotWrapExceptions</code> instead of unwrapping.']
    }
  });

  practice.push({
    title: 'Contravariant Comparer: Sort Strings by Length',
    level: 'Medium', tags: ['variance', 'IComparer', 'LINQ'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>You already have ${C('class LengthComparer : IComparer<object>')} comparing ${C('ToString()!.Length')}. Without writing a new comparer, use it as an ${C('IComparer<string>')} (contravariance) to return the words sorted by length; ties are broken by ordinal string order. Do not modify the input array.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>; words may be empty.`,
    example: `<p>${C('["b", "a", "dd", "cc"]')} → ${H.c('g', '["a", "b", "cc", "dd"]')}</p>`,
    brute: { why: `<p>Copy-pasting the comparer as ${C('IComparer<string>')} duplicates logic; wrapping it with ${C('Comparer<string>.Create((x, y) => cmp.Compare(x, y))')} adds a delegate call per comparison. ${C('IComparer<in T>')} makes the existing object directly usable.</p>`, code: `
static class Copy
{
    public static string[] Sort(string[] w) => w.OrderBy(s => s.Length).ThenBy(s => s, StringComparer.Ordinal).ToArray();
}` },
    mcq: { q: 'Why can an <code>IComparer&lt;object&gt;</code> be assigned to <code>IComparer&lt;string&gt;</code>?', options: ['IComparer&lt;in T&gt; is contravariant: something that compares any objects can compare strings', 'IComparer is covariant', 'string derives from IComparer', 'Implicit user-defined conversion'], answer: 0, explain: 'T only appears as input in Compare(T, T), so the interface is declared in T and the conversion is a safe reference conversion.' },
    hints: [`<p>Hint 1: ${C('IComparer<string> byLen = new LengthComparer();')} compiles thanks to ${C('in T')}.</p>`, `<p>Hint 2: ${C('OrderBy(w => w, byLen)')} is a <b>stable</b> sort; add ${C('.ThenBy(w => w, StringComparer.Ordinal)')}.</p>`, `<p>Hint 3: ordinal order compares UTF-16 code units: ${C('"Z"')} (90) comes before ${C('"a"')} (97).</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'sortByLength', cases: [
      [[['ccc', 'a', 'bb']], ['a', 'bb', 'ccc']],
      [[['b', 'a', 'dd', 'cc']], ['a', 'b', 'cc', 'dd']],
      [[[]], []],
      [[['same']], ['same']],
      [[['a', 'Z']], ['Z', 'a']],
      [[['', 'x', '']], ['', '', 'x']],
      [[['apple', 'fig', 'kiwi', 'date', 'pear']], ['fig', 'date', 'kiwi', 'pear', 'apple']]
    ] },
    solution: {
      approach: `<p>Assign the existing comparer to ${C('IComparer<string>')} — a free reference conversion — and use it in a stable LINQ sort with an ordinal tie-breaker.</p>`,
      code: `
public class Solution
{
    public static string[] SortByLength(string[] words)
    {
        IComparer<string> byLen = new LengthComparer();   // contravariance: IComparer<object> -> IComparer<string>
        return words.OrderBy(w => w, byLen).ThenBy(w => w, StringComparer.Ordinal).ToArray();
    }
}

public sealed class LengthComparer : IComparer<object>
{
    public int Compare(object? x, object? y) =>
        (x?.ToString()?.Length ?? -1).CompareTo(y?.ToString()?.Length ?? -1);
}`,
      dry: { head: ['word', 'length', 'position'], rows: [['a', '1', '1'], ['b', '1', '2 (ordinal tie-break)'], ['cc', '2', '3'], ['dd', '2', '4']] },
      complexity: `<p>O(n log n) comparisons; the variance conversion costs nothing at run time.</p>`,
      followUps: ['Write a contravariant <code>IValidator&lt;in T&gt;</code> and use a validator for Animal on Dog.', 'Why is <code>IComparer&lt;int&gt;</code> not convertible from <code>IComparer&lt;object&gt;</code>?']
    }
  });

  practice.push({
    title: 'Dynamic Filter from an Expression Tree',
    level: 'Medium', tags: ['expression trees', 'MakeBinary', 'LINQ'], companies: ['Microsoft', 'Salesforce', 'Infosys'],
    statement: `<p>An API receives filters as text: an operator among ${C('> >= < <= == !=')} and an integer k. Build an ${C('Expression<Func<int, bool>>')} with ${C('Expression.MakeBinary')}, compile it once, and return the elements of ${C('ages')} that satisfy it, in their original order. An unknown operator returns an empty array.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>.`,
    example: `<p>${C('Filter([15, 42, 30, 18], ">=", 18)')} → ${H.c('g', '[42, 30, 18]')}</p>`,
    brute: { why: `<p>A switch inside the loop re-dispatches on the operator string for every element. Building one compiled predicate removes the per-element dispatch — and the same tree could be handed to an ${C('IQueryable')} provider to run in a database.</p>`, code: `
static class SwitchFilter
{
    public static int[] Filter(int[] a, string op, int k) =>
        a.Where(x => op == ">" ? x > k : op == ">=" ? x >= k : op == "<" ? x < k : op == "<=" ? x <= k : op == "==" ? x == k : op == "!=" && x != k).ToArray();
}` },
    mcq: { q: 'What does <code>Expression.MakeBinary(ExpressionType.GreaterThan, x, Expression.Constant(5))</code> create?', options: ['A BinaryExpression node representing x &gt; 5', 'A compiled delegate', 'A bool value', 'An SQL string'], answer: 0, explain: 'MakeBinary is the generic factory behind Expression.GreaterThan, Add, Equal… It only builds a node; Compile turns the lambda into code.' },
    hints: [`<p>Hint 1: map strings to ${C('ExpressionType')}: ${C('">" => ExpressionType.GreaterThan')}, ${C('"!=" => ExpressionType.NotEqual')}…</p>`, `<p>Hint 2: ${C('var x = Expression.Parameter(typeof(int), "x");')} then ${C('Expression.Lambda<Func<int, bool>>(body, x)')}.</p>`, `<p>Hint 3: compile once, outside the loop: ${C('var pred = lambda.Compile(); ages.Where(pred)')}.</p>`],
    tests: { sig: 'int[] string int -> int[]', fn: 'filter', cases: [
      [[[15, 42, 30, 18], '>=', 18], [42, 30, 18]],
      [[[15, 42, 30, 18], '>', 18], [42, 30]],
      [[[1, 2, 3], '<', 1], []],
      [[[5, 5, 6], '==', 5], [5, 5]],
      [[[5, 5, 6], '!=', 5], [6]],
      [[[-3, 0, 3], '<=', 0], [-3, 0]],
      [[[1, 2], '=>', 1], []],
      [[[], '>', 0], []]
    ] },
    solution: {
      approach: `<p>Translate the operator to an ${C('ExpressionType')}, build ${C('x op k')} as a tree, compile once, filter with the delegate.</p>`,
      code: `
using System.Linq.Expressions;

public class Solution
{
    public static int[] Filter(int[] ages, string op, int k)
    {
        ExpressionType? type = op switch
        {
            ">" => ExpressionType.GreaterThan,
            ">=" => ExpressionType.GreaterThanOrEqual,
            "<" => ExpressionType.LessThan,
            "<=" => ExpressionType.LessThanOrEqual,
            "==" => ExpressionType.Equal,
            "!=" => ExpressionType.NotEqual,
            _ => null
        };
        if (type is null) return Array.Empty<int>();
        var x = Expression.Parameter(typeof(int), "x");
        var body = Expression.MakeBinary(type.Value, x, Expression.Constant(k));
        Func<int, bool> pred = Expression.Lambda<Func<int, bool>>(body, x).Compile();
        return ages.Where(pred).ToArray();
    }
}`,
      dry: { head: ['step', 'value'], rows: [['op ">="', 'GreaterThanOrEqual'], ['tree', 'x => (x >= 18)'], ['filter [15, 42, 30, 18]', '[42, 30, 18]']] },
      complexity: `<p>O(n) evaluation plus a one-off compile. Cache compiled predicates by (op, k) if filters repeat.</p>`,
      followUps: ['Support filtering objects by a property name: <code>Expression.Property(p, "Age")</code>.', 'Combine several filters with <code>Expression.AndAlso</code>.']
    }
  });

  practice.push({
    title: 'Generic Parsing with IParsable&lt;T&gt;',
    level: 'Medium', tags: ['static abstract', 'IParsable', 'generic math'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Implement ${C('readonly record struct Point(int X, int Y) : IParsable<Point>')} where the text form is ${C('"x;y"')}. Write one generic helper ${C('static bool TryParseAll<T>(string csv, out List<T> items) where T : IParsable<T>')} that splits on commas and uses ${C('T.TryParse')}. ${C('SumPoints(string csv)')} returns the component-wise sum as ${C('"(sx, sy)"')}, ${C('"(0, 0)"')} for an empty string, or ${C('"invalid"')} if any item fails to parse. The same helper must also work for ${C('int')} (e.g. ${C('TryParseAll<int>("1,2", out var xs)')}).</p>`,
    constraints: `Up to 10<sup>4</sup> items; coordinates fit in int and so do the sums. Surrounding spaces around numbers are allowed.`,
    example: `<p>${C('SumPoints("1;2,3;4")')} → ${H.c('g', '"(4, 6)"')}; ${C('SumPoints("1;2,x;4")')} → ${H.c('g', '"invalid"')}</p>`,
    brute: { why: `<p>Without static abstract members, a generic parser needs a ${C('Func<string, T>')} passed in by every caller, or reflection to find a static ${C('Parse')} method by name. ${C('IParsable<T>')} lets the generic code call ${C('T.TryParse')} directly, checked at compile time.</p>`, code: `
static class ReflectParse
{
    public static T Parse<T>(string s) =>
        (T)typeof(T).GetMethod("Parse", new[] { typeof(string) })!.Invoke(null, new object[] { s })!;
}` },
    mcq: { q: 'Inside <code>TryParseAll&lt;T&gt;</code>, how is <code>T.TryParse(s, null, out T v)</code> resolved?', options: ['At JIT/compile time through the IParsable&lt;T&gt; static abstract member implemented by T', 'By reflection at run time', 'Through a virtual call on a T instance', 'It does not compile'], answer: 0, explain: 'Static abstract members are called on the type parameter; the call is a constrained call bound per instantiation, no reflection or instance needed.' },
    hints: [`<p>Hint 1: ${C('IParsable<T>')} requires ${C('static T Parse(string s, IFormatProvider? p)')} and ${C('static bool TryParse(string? s, IFormatProvider? p, out T result)')}.</p>`, `<p>Hint 2: in ${C('Point.TryParse')}, split on ';', require exactly two parts and ${C('int.TryParse')} both.</p>`, `<p>Hint 3: ${C('"".Split(\',\')')} returns one empty string — handle the empty input before splitting.</p>`],
    tests: { sig: 'string -> string', fn: 'sumPoints', cases: [
      [['1;2,3;4'], '(4, 6)'],
      [['1;2,x;4'], 'invalid'],
      [[''], '(0, 0)'],
      [['-5;5'], '(-5, 5)'],
      [[' 7 ; 8 ,1;1'], '(8, 9)'],
      [['1;2;3'], 'invalid'],
      [['1;2,'], 'invalid'],
      [['1000000;-1000000,1000000;-1000000'], '(2000000, -2000000)']
    ] },
    solution: {
      approach: `<p>Point implements the two static members of ${C('IParsable<Point>')}. The generic helper relies only on that contract, so it works for Point, int, Guid, DateTime and any future parsable type.</p>`,
      code: `
using System.Diagnostics.CodeAnalysis;

public class Solution
{
    public static string SumPoints(string csv)
    {
        if (csv.Length == 0) return "(0, 0)";
        if (!TryParseAll<Point>(csv, out var pts)) return "invalid";
        int sx = 0, sy = 0;
        foreach (var p in pts) { sx += p.X; sy += p.Y; }
        return $"({sx}, {sy})";
    }

    public static bool TryParseAll<T>(string csv, out List<T> items) where T : IParsable<T>
    {
        items = new List<T>();
        foreach (string part in csv.Split(','))
        {
            if (!T.TryParse(part, null, out T? v)) return false;
            items.Add(v);
        }
        return true;
    }
}

public readonly record struct Point(int X, int Y) : IParsable<Point>
{
    public static Point Parse(string s, IFormatProvider? provider) =>
        TryParse(s, provider, out var p) ? p : throw new FormatException($"bad point '{s}'");

    public static bool TryParse([NotNullWhen(true)] string? s, IFormatProvider? provider, out Point result)
    {
        result = default;
        if (s is null) return false;
        string[] xy = s.Split(';');
        if (xy.Length != 2 || !int.TryParse(xy[0], out int x) || !int.TryParse(xy[1], out int y)) return false;
        result = new Point(x, y);
        return true;
    }
}`,
      dry: { head: ['part', 'T.TryParse', 'running sum'], rows: [['"1;2"', 'Point(1, 2)', '(1, 2)'], ['"3;4"', 'Point(3, 4)', '(4, 6)']] },
      complexity: `<p>O(total length). No reflection, no boxing: the call to <code>T.TryParse</code> is bound per instantiation.</p>`,
      followUps: ['Implement <code>ISpanParsable&lt;Point&gt;</code> to parse without allocating substrings.', 'Use the helper with <code>int</code> and <code>DateOnly</code> in the same program.']
    }
  });

  practice.push({
    title: 'Plugin Pipeline Discovered by Reflection',
    level: 'Medium', tags: ['reflection', 'attributes', 'plugins'], companies: ['Microsoft', 'JetBrains', 'Atlassian'],
    statement: `<p>Every class implementing ${C('ITransform')} (${C('string Apply(string s)')}) and marked ${C('[Step(order)]')} is a pipeline step; a step with ${C('Enabled = false')} is skipped. ${C('Run(input)')} discovers the steps in the current assembly with reflection, creates them with their parameterless constructor, sorts them by order and applies them in sequence. The given steps: Trim (1), CollapseWhitespace (2: any run of whitespace becomes one space), Upper (3), Exclaim (4, disabled). A class implementing ITransform without the attribute is ignored.</p>`,
    constraints: `Input length ≤ 10<sup>4</sup>.`,
    example: `<p>${C('Run("  hello   world ")')} → ${H.c('g', '"HELLO WORLD"')}</p>`,
    brute: { why: `<p>A hard-coded ${C('new Trim().Apply(new Upper().Apply(...))')} chain must be edited for every new step. Discovery lets a team drop in a new class (even from another assembly) without touching the host.</p>`, code: `
static class Fixed
{
    public static string Run(string s) => System.Text.RegularExpressions.Regex.Replace(s.Trim(), @"\\s+", " ").ToUpperInvariant();
}` },
    mcq: { q: 'Which check finds concrete classes that implement ITransform?', options: ['<code>!t.IsAbstract &amp;&amp; t.IsClass &amp;&amp; typeof(ITransform).IsAssignableFrom(t)</code>', '<code>t is ITransform</code>', '<code>t.BaseType == typeof(ITransform)</code>', '<code>t.Name.EndsWith("Transform")</code>'], answer: 0, explain: 't is a Type object, so "t is ITransform" is always false. Interfaces are not base types; IsAssignableFrom answers "can an instance of t be stored in an ITransform variable".' },
    hints: [`<p>Hint 1: ${C('typeof(Solution).Assembly.GetTypes()')} lists every type compiled with your code.</p>`, `<p>Hint 2: read the attribute with ${C('t.GetCustomAttribute<StepAttribute>()')}; skip null and ${C('Enabled == false')}.</p>`, `<p>Hint 3: ${C('(ITransform)Activator.CreateInstance(t)!')}, then ${C('Aggregate(input, (s, step) => step.Apply(s))')}.</p>`],
    tests: { sig: 'string -> string', fn: 'run', cases: [
      [['  hello   world '], 'HELLO WORLD'],
      [[''], ''],
      [['a'], 'A'],
      [['   '], ''],
      [['Mixed Case  Text'], 'MIXED CASE TEXT'],
      [['tab\tsep\n\nline'], 'TAB SEP LINE']
    ] },
    solution: {
      approach: `<p>Discover once and cache: scan the assembly for concrete ITransform classes with an enabled StepAttribute, sort by order, instantiate. Running the pipeline is then a fold over the step list.</p>`,
      code: `
using System.Reflection;
using System.Text.RegularExpressions;

public class Solution
{
    private static readonly ITransform[] Steps = typeof(Solution).Assembly.GetTypes()
        .Where(t => t.IsClass && !t.IsAbstract && typeof(ITransform).IsAssignableFrom(t))
        .Select(t => (t, a: t.GetCustomAttribute<StepAttribute>()))
        .Where(x => x.a is { Enabled: true })
        .OrderBy(x => x.a!.Order)
        .Select(x => (ITransform)Activator.CreateInstance(x.t)!)
        .ToArray();

    public static string Run(string input) => Steps.Aggregate(input, (s, step) => step.Apply(s));
}

public interface ITransform { string Apply(string s); }

[AttributeUsage(AttributeTargets.Class)]
public sealed class StepAttribute(int order) : Attribute
{
    public int Order => order;
    public bool Enabled { get; set; } = true;
}

[Step(3)] public class Upper : ITransform { public string Apply(string s) => s.ToUpperInvariant(); }
[Step(1)] public class Trim : ITransform { public string Apply(string s) => s.Trim(); }
[Step(4, Enabled = false)] public class Exclaim : ITransform { public string Apply(string s) => s + "!"; }
[Step(2)] public class CollapseWhitespace : ITransform { public string Apply(string s) => Regex.Replace(s, @"\\s+", " "); }
public class Unmarked : ITransform { public string Apply(string s) => "should never run"; }`,
      dry: { head: ['step', 'order', 'value'], rows: [['input', '—', '"  hello   world "'], ['Trim', '1', '"hello   world"'], ['CollapseWhitespace', '2', '"hello world"'], ['Upper', '3', '"HELLO WORLD"'], ['Exclaim', '4', 'skipped (disabled)']] },
      complexity: `<p>Discovery O(T) types once; each run O(steps · length).</p>`,
      followUps: ['Load plugins from other assemblies with <code>AssemblyLoadContext</code>.', 'Let steps take constructor dependencies resolved by a DI container.']
    }
  });

  practice.push({
    title: 'Checked Generic Sum',
    level: 'Medium', tags: ['generic math', 'checked', 'overflow'], companies: ['Goldman Sachs', 'Microsoft'],
    statement: `<p>Write ${C('static T SumChecked<T>(T[] xs) where T : INumber<T>')} that throws ${C('OverflowException')} as soon as a partial sum overflows (use ${C('checked(total + x)')}). ${C('CheckedSum(int[] a)')} returns the sum as a string, or ${C('"overflow"')}. Note that the order of elements matters: overflow is detected on partial sums.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>.`,
    example: `<p>${C('[2147483647, 1, -1]')} → ${H.c('g', '"overflow"')} (the partial sum 2147483647 + 1 overflows), but ${C('[2147483647, -1, 1]')} → ${H.c('g', '"2147483647"')}.</p>`,
    brute: { why: `<p>${C('a.Sum()')} on ints already throws on overflow (LINQ's Sum is checked), but your generic helper with plain ${C('+')} wraps silently: ${C('int.MaxValue + 1 == int.MinValue')}. Generic math respects ${C('checked')}: it calls the type's checked operator.</p>`, code: `
using System.Numerics;
static class Wrapping
{
    public static T Sum<T>(T[] xs) where T : INumber<T> { T t = T.Zero; foreach (var x in xs) t += x; return t; }  // wraps
}` },
    mcq: { q: 'For <code>T = int</code>, what does <code>checked(total + x)</code> call inside a generic method?', options: ['int\'s checked addition operator (op_CheckedAddition), which throws on overflow', 'The unchecked operator — checked is ignored in generics', 'A reflection-based adder', 'It does not compile'], answer: 0, explain: 'C# 11 added checked user-defined operators; IAdditionOperators declares both, and a checked context selects op_CheckedAddition.' },
    hints: [`<p>Hint 1: ${C('T total = T.Zero; foreach (T x in xs) total = checked(total + x);')}</p>`, `<p>Hint 2: wrap the call in ${C('try { ... } catch (OverflowException) { return "overflow"; }')}.</p>`, `<p>Hint 3: the empty array sums to ${C('T.Zero')}, i.e. ${C('"0"')}.</p>`],
    tests: { sig: 'int[] -> string', fn: 'checkedSum', cases: [
      [[[1, 2, 3]], '6'],
      [[[2147483647, 1]], 'overflow'],
      [[[-2147483648, -1]], 'overflow'],
      [[[2147483647, 1, -1]], 'overflow'],
      [[[2147483647, -1, 1]], '2147483647'],
      [[[]], '0'],
      [[{ $rep: 30000, n: 70000 }], '2100000000'],
      [[{ $rep: 30000, n: 80000 }], 'overflow']
    ] },
    solution: {
      approach: `<p>Use the generic number interface and a checked context; the JIT specialises the method for int and emits an overflow-checking add.</p>`,
      code: `
using System.Numerics;

public class Solution
{
    public static string CheckedSum(int[] a)
    {
        try { return SumChecked(a).ToString(); }
        catch (OverflowException) { return "overflow"; }
    }

    public static T SumChecked<T>(T[] xs) where T : INumber<T>
    {
        T total = T.Zero;
        foreach (T x in xs) total = checked(total + x);
        return total;
    }
}`,
      dry: { head: ['x', 'partial sum', 'status'], rows: [['2147483647', '2147483647', 'ok'], ['1', '2147483648 > int.MaxValue', 'OverflowException → "overflow"']] },
      complexity: `<p>O(n); a checked add is one extra conditional jump on the overflow flag.</p>`,
      followUps: ['Return the sum in a wider type instead of failing.', 'Write a saturating sum with <code>T.CreateSaturating</code>.']
    }
  });

  practice.push({
    title: 'Predict the Output: Extension Method Resolution',
    level: 'Easy', tags: ['output prediction', 'extension methods', 'virtual dispatch'], companies: ['Microsoft', 'Infosys', 'Wipro'],
    statement: `<p>Write down the 6 lines this program prints.</p>${P(`
var w = new Widget();
Console.WriteLine(w.Name());
object o = w;
Console.WriteLine(o.Kind());
Console.WriteLine(w.Kind());
string? s = null;
Console.WriteLine(s.SafeLen());
Base b = new Derived();
Console.WriteLine(b.Tag());
Console.WriteLine(b.Virt());

class Widget { public string Name() => "instance"; }
class Base { public virtual string Virt() => "base"; }
class Derived : Base { public override string Virt() => "derived"; }
static class Ext
{
    public static string Name(this Widget w) => "extension";
    public static string Kind(this object o) => "object-ext";
    public static string Kind(this Widget w) => "widget-ext";
    public static int SafeLen(this string? s) => s?.Length ?? 0;
    public static string Tag(this Base b) => "base-ext";
    public static string Tag(this Derived d) => "derived-ext";
}`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 1 is ${H.c('g', 'instance')}: an applicable instance method always wins over an extension method.</p>`,
    brute: { why: `<p>Thinking of extensions as "added members" leads to ${C('extension')}, ${C('widget-ext')} and ${C('derived-ext')}. But extensions are chosen at compile time by the <b>static</b> type and only if no instance method applies; they never dispatch virtually.</p>`, code: `
static class WrongMentalModel
{
    public static string[] Lines() => new[] { "extension", "widget-ext", "widget-ext", "0", "derived-ext", "derived" };
}` },
    mcq: { q: 'Why does <code>b.Tag()</code> print base-ext although b refers to a Derived?', options: ['Extension methods bind to the compile-time type (Base); there is no virtual dispatch', 'Derived-ext is ambiguous', 'Tag(this Derived) is hidden by Tag(this Base)', 'Extensions run in declaration order'], answer: 0, explain: 'Overload resolution uses the static type of b. Only virtual instance methods (like Virt) look at the run-time type.' },
    hints: [`<p>Hint 1: lookup order is instance methods first, extensions second.</p>`, `<p>Hint 2: for extensions, the receiver's <b>static</b> type picks the best overload: ${C('object')} vs ${C('Widget')}.</p>`, `<p>Hint 3: a null receiver is just a null argument for an extension method.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'instance\nobject-ext\nwidget-ext\n0\nbase-ext\nderived' }] },
    solution: {
      approach: `<p>Resolve each call as the compiler does: instance methods first; otherwise extension overloads chosen by the static type of the receiver; virtual instance methods dispatch on the run-time type.</p>`,
      code: { lang: 'csharp', run: true, code: `
var w = new Widget();
Console.WriteLine(w.Name());      // instance     (instance method wins)
object o = w;
Console.WriteLine(o.Kind());      // object-ext   (static type object)
Console.WriteLine(w.Kind());      // widget-ext   (more specific extension)
string? s = null;
Console.WriteLine(s.SafeLen());   // 0            (null receiver is an argument)
Base b = new Derived();
Console.WriteLine(b.Tag());       // base-ext     (static type Base)
Console.WriteLine(b.Virt());      // derived      (virtual dispatch)

class Widget { public string Name() => "instance"; }
class Base { public virtual string Virt() => "base"; }
class Derived : Base { public override string Virt() => "derived"; }
static class Ext
{
    public static string Name(this Widget w) => "extension";
    public static string Kind(this object o) => "object-ext";
    public static string Kind(this Widget w) => "widget-ext";
    public static int SafeLen(this string? s) => s?.Length ?? 0;
    public static string Tag(this Base b) => "base-ext";
    public static string Tag(this Derived d) => "derived-ext";
}` },
      dry: { head: ['call', 'static type', 'chosen', 'output'], rows: [['w.Name()', 'Widget', 'instance Widget.Name', 'instance'], ['o.Kind()', 'object', 'Ext.Kind(object)', 'object-ext'], ['b.Tag()', 'Base', 'Ext.Tag(Base)', 'base-ext'], ['b.Virt()', 'Base', 'virtual → Derived.Virt', 'derived']] },
      complexity: `<p>O(1). The point is the binding rules.</p>`,
      followUps: ['How would you make Tag dispatch on the run-time type? (a virtual method, or a switch on the type inside one extension)', 'What if Widget.Name took an int parameter?']
    }
  });

  practice.push({
    title: 'Mini Dependency-Injection Container',
    level: 'Hard', tags: ['reflection', 'constructors', 'DI', 'cycle detection'], companies: ['Microsoft', 'Uber', 'Booking.com'],
    statement: `<p>Build a container with ${C('Register<TService, TImpl>(bool singleton)')} and ${C('Resolve(Type t)')}. Resolution: a registered service maps to its implementation; an unregistered <b>concrete</b> class resolves to itself (transient); otherwise it is missing. The constructor with the most parameters is used and every parameter is resolved recursively. Singletons are created once per container. ${C('Describe(string typeName)')} uses a fresh container (ILogger → Logger as singleton) and returns a description of the object graph built while resolving: ${C('Name(child, child)')}, a class without dependencies is just its name, and Logger instances print as ${C('Logger#k')} where k counts Logger creations. Errors: ${C('"unknown: X"')} (no type with that name), ${C('"missing: X"')} (an interface/abstract dependency that is not registered), ${C('"cycle: A -> B -> A"')}.</p>`,
    constraints: `Types: Logger : ILogger, Clock, Repo(ILogger), Service(Repo, ILogger), Controller(Service, Clock), A(B), B(A), NeedsMail(IMailer) with IMailer not registered.`,
    example: `<p>${C('Describe("Service")')} → ${H.c('g', '"Service(Repo(Logger#1), Logger#1)"')} — the same singleton logger is injected twice.</p>`,
    brute: { why: `<p>Wiring by hand (${C('new Controller(new Service(new Repo(logger), logger), new Clock())')}) is fine for three classes and painful for three hundred; every constructor change ripples through every composition site. A container computes the graph from constructor signatures — but it must also detect cycles, or it recurses until ${C('StackOverflowException')}, which cannot be caught.</p>`, code: `
interface ILog0 { }
class Log0 : ILog0 { }
class Repo0 { public Repo0(ILog0 l) { } }
static class HandWired
{
    public static Repo0 Build() => new Repo0(new Log0());
}` },
    mcq: { q: 'Resolving A needs B and B needs A. What happens without cycle detection?', options: ['Infinite recursion ending in an uncatchable StackOverflowException', 'The container returns null', 'A is created with a null B', 'The CLR detects it and throws InvalidOperationException'], answer: 0, explain: 'Each Resolve call recurses into the other; .NET terminates the process on stack overflow. Real containers (Microsoft.Extensions.DependencyInjection) track the resolution path and throw a descriptive error.' },
    hints: [`<p>Hint 1: keep the current resolution path in a ${C('List<Type>')}; if the type is already on it, report the cycle from its first occurrence.</p>`, `<p>Hint 2: ${C('t.GetConstructors().OrderByDescending(c => c.GetParameters().Length).First()')}, then resolve each ${C('ParameterInfo.ParameterType')}.</p>`, `<p>Hint 3: return both the object and its description from the recursive call, and cache (object, description) for singletons.</p>`],
    tests: { sig: 'string -> string', fn: 'describe', cases: [
      [['Logger'], 'Logger#1'],
      [['ILogger'], 'Logger#1'],
      [['Repo'], 'Repo(Logger#1)'],
      [['Service'], 'Service(Repo(Logger#1), Logger#1)'],
      [['Controller'], 'Controller(Service(Repo(Logger#1), Logger#1), Clock)'],
      [['A'], 'cycle: A -> B -> A'],
      [['B'], 'cycle: B -> A -> B'],
      [['NeedsMail'], 'missing: IMailer'],
      [['Nope'], 'unknown: Nope']
    ] },
    solution: {
      approach: `<p>Recursive resolution over constructor parameters with three pieces of state: the registrations, a singleton cache, and the current path for cycle detection. Errors are signalled with a private exception carrying the message, so the recursion can unwind cleanly.</p>`,
      code: `
public class Solution
{
    public static string Describe(string typeName)
    {
        Type? t = typeof(Solution).Assembly.GetTypes().FirstOrDefault(x => x.Name == typeName);
        if (t is null) return "unknown: " + typeName;
        var c = new Container();
        c.Register<ILogger, Logger>(singleton: true);
        try { return c.Resolve(t).Desc; }
        catch (ResolveException e) { return e.Message; }
    }
}

public sealed class ResolveException(string msg) : Exception(msg);

public sealed class Container
{
    private readonly Dictionary<Type, (Type Impl, bool Singleton)> _map = new();
    private readonly Dictionary<Type, (object Obj, string Desc)> _singletons = new();
    private readonly List<Type> _path = new();
    private int _loggers;

    public void Register<TService, TImpl>(bool singleton) where TImpl : TService
    {
        _map[typeof(TService)] = (typeof(TImpl), singleton);
        if (singleton) _map[typeof(TImpl)] = (typeof(TImpl), true);
    }

    public (object Obj, string Desc) Resolve(Type t)
    {
        var (impl, singleton) = _map.TryGetValue(t, out var reg) ? reg
            : t.IsClass && !t.IsAbstract ? (t, false)
            : throw new ResolveException("missing: " + t.Name);
        if (singleton && _singletons.TryGetValue(impl, out var cached)) return cached;
        int at = _path.IndexOf(impl);
        if (at >= 0)
            throw new ResolveException("cycle: " + string.Join(" -> ", _path.Skip(at).Append(impl).Select(x => x.Name)));
        _path.Add(impl);
        try
        {
            var ctor = impl.GetConstructors().OrderByDescending(c => c.GetParameters().Length).First();
            var parts = ctor.GetParameters().Select(p => Resolve(p.ParameterType)).ToArray();
            object obj = ctor.Invoke(parts.Select(p => p.Obj).ToArray());
            string desc = impl == typeof(Logger) ? $"Logger#{++_loggers}"
                : parts.Length == 0 ? impl.Name
                : $"{impl.Name}({string.Join(", ", parts.Select(p => p.Desc))})";
            if (singleton) _singletons[impl] = (obj, desc);
            return (obj, desc);
        }
        finally { _path.RemoveAt(_path.Count - 1); }
    }
}

public interface ILogger { }
public interface IMailer { }
public class Logger : ILogger { }
public class Clock { }
public class Repo(ILogger log) { public ILogger Log => log; }
public class Service(Repo repo, ILogger log) { public Repo Repo => repo; public ILogger Log => log; }
public class Controller(Service svc, Clock clock) { public Service Svc => svc; public Clock Clock => clock; }
public class A(B b) { public B B => b; }
public class B(A a) { public A A => a; }
public class NeedsMail(IMailer m) { public IMailer M => m; }`,
      dry: { head: ['call', 'path', 'result'], rows: [['Resolve(Service)', '[Service]', 'needs Repo, ILogger'], ['Resolve(Repo)', '[Service, Repo]', 'needs ILogger'], ['Resolve(ILogger)', '[Service, Repo, Logger]', 'new Logger → Logger#1 (cached)'], ['Resolve(ILogger)', '[Service]', 'cache hit → Logger#1'], ['done', '[]', 'Service(Repo(Logger#1), Logger#1)']] },
      complexity: `<p>O(V + E) constructor resolutions for the dependency graph (singletons once); reflection cost per type can be cached by compiling a factory delegate.</p>`,
      followUps: ['Add scoped lifetimes (one instance per scope) and IDisposable tracking.', 'Compile a <code>Func&lt;Container, object&gt;</code> factory per type with expression trees.']
    }
  });

  practice.push({
    title: 'Expression Simplifier with ExpressionVisitor',
    level: 'Hard', tags: ['expression trees', 'ExpressionVisitor', 'constant folding'], companies: ['Microsoft', 'Bloomberg', 'Databricks'],
    statement: `<p>Parse a postfix formula over ${C('x')}, non-negative int constants and ${C('+ - *')} into an expression tree (as in the guided problem). Then write ${C('class Simplifier : ExpressionVisitor')} that rewrites bottom-up: fold a binary node whose two children are constants; ${C('e + 0')}, ${C('0 + e')}, ${C('e - 0')}, ${C('e * 1')}, ${C('1 * e')} → ${C('e')}; ${C('e * 0')}, ${C('0 * e')} → ${C('0')}. No other algebra (no reassociation). Return the simplified body's ${C('ToString()')}, or ${C('"invalid"')}.</p>`,
    constraints: `Up to 200 tokens. Intermediate constant results fit in int.`,
    example: `<p>${C('"2 3 + x *"')} → ${H.c('g', '"(5 * x)"')}; ${C('"x 5 0 * +"')} → ${H.c('g', '"x"')}</p>`,
    brute: { why: `<p>Simplifying the string with regexes (${C('replace("+ 0", "")')}) breaks on nesting and on numbers like 10. Expression trees are immutable, so you cannot change nodes in place; ${C('ExpressionVisitor')} rebuilds only the parts that change, bottom-up.</p>`, code: `
static class RegexSimplify
{
    public static string Run(string rpn) => rpn.Replace(" 0 +", "").Replace(" 1 *", "");   // wrong for "x 10 +"
}` },
    mcq: { q: 'Why must the visitor simplify children before the parent (call base.VisitBinary or Visit(node.Left) first)?', options: ['A parent rule like e + 0 only fires once the child (5 * 0) has already become the constant 0', 'Visitors cannot read parents', 'ToString requires it', 'To avoid allocating'], answer: 0, explain: 'Bottom-up rewriting exposes new constants to the rules of the parent. x + (5 * 0) needs 5 * 0 → 0 first, then x + 0 → x.' },
    hints: [`<p>Hint 1: override ${C('VisitBinary')}: ${C('var l = Visit(node.Left); var r = Visit(node.Right);')}.</p>`, `<p>Hint 2: helper ${C('static bool Is(Expression e, int v) => e is ConstantExpression { Value: int k } && k == v;')}.</p>`, `<p>Hint 3: when both sides are constants, compute with ${C('Expression.Lambda<Func<int>>(node.Update(l, null, r)).Compile()()')} or a direct switch on ${C('NodeType')}; otherwise ${C('node.Update(l, node.Conversion, r)')}.</p>`],
    tests: { sig: 'string -> string', fn: 'simplify', cases: [
      [['x 0 +'], 'x'],
      [['x 1 *'], 'x'],
      [['2 3 + x *'], '(5 * x)'],
      [['x 0 *'], '0'],
      [['x 2 3 * +'], '(x + 6)'],
      [['0 x 1 * +'], 'x'],
      [['x 1 - 1 +'], '((x - 1) + 1)'],
      [['4 2 -'], '2'],
      [['x 5 0 * +'], 'x'],
      [['0 x -'], '(0 - x)'],
      [['x +'], 'invalid']
    ] },
    solution: {
      approach: `<p>Build the tree with a stack, then run a visitor that first simplifies both children and then applies the local rules to the rebuilt node. Constant folding uses a switch on ${C('NodeType')}.</p>`,
      code: `
using System.Linq.Expressions;

public class Solution
{
    public static string Simplify(string rpn)
    {
        var x = Expression.Parameter(typeof(int), "x");
        var st = new Stack<Expression>();
        foreach (string t in rpn.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            if (t == "x") st.Push(x);
            else if (int.TryParse(t, out int k)) st.Push(Expression.Constant(k));
            else if (t is "+" or "-" or "*" && st.Count >= 2)
            {
                Expression r = st.Pop(), l = st.Pop();
                st.Push(Expression.MakeBinary(t == "+" ? ExpressionType.Add : t == "-" ? ExpressionType.Subtract : ExpressionType.Multiply, l, r));
            }
            else return "invalid";
        }
        if (st.Count != 1) return "invalid";
        return new Simplifier().Visit(st.Pop()).ToString();
    }
}

public sealed class Simplifier : ExpressionVisitor
{
    static bool Is(Expression e, int v) => e is ConstantExpression { Value: int k } && k == v;

    protected override Expression VisitBinary(BinaryExpression node)
    {
        Expression l = Visit(node.Left), r = Visit(node.Right);
        if (l is ConstantExpression { Value: int a } && r is ConstantExpression { Value: int b })
            return Expression.Constant(node.NodeType switch
            {
                ExpressionType.Add => a + b,
                ExpressionType.Subtract => a - b,
                _ => a * b
            });
        switch (node.NodeType)
        {
            case ExpressionType.Add when Is(r, 0): return l;
            case ExpressionType.Add when Is(l, 0): return r;
            case ExpressionType.Subtract when Is(r, 0): return l;
            case ExpressionType.Multiply when Is(l, 0) || Is(r, 0): return Expression.Constant(0);
            case ExpressionType.Multiply when Is(r, 1): return l;
            case ExpressionType.Multiply when Is(l, 1): return r;
        }
        return node.Update(l, node.Conversion, r);
    }
}`,
      dry: { head: ['node (bottom-up)', 'children after visit', 'rule', 'result'], rows: [['5 * 0', '5, 0', 'fold', '0'], ['x + (5 * 0)', 'x, 0', 'e + 0', 'x'], ['2 + 3', '2, 3', 'fold', '5'], ['(2 + 3) * x', '5, x', 'none', '(5 * x)']] },
      complexity: `<p>O(N) nodes visited once; only changed paths are reallocated.</p>`,
      followUps: ['Add <code>e - e → 0</code> when both sides are the same parameter.', 'Use the simplifier on <code>Expression&lt;Func&lt;Order, bool&gt;&gt;</code> predicates before handing them to EF Core.']
    }
  });

  practice.push({
    title: 'Fluent Validator Using Member Expressions',
    level: 'Hard', tags: ['expression trees', 'generics', 'fluent API'], companies: ['Microsoft', 'Stripe', 'Thoughtworks'],
    statement: `<p>Build a mini FluentValidation: ${C('Validator<T>.RuleFor(x => x.Prop)')} returns a builder with ${C('NotEmpty()')}, ${C('MaxLength(n)')}, ${C('InRange(lo, hi)')} and ${C('Must(pred, message)')}. The property <b>name</b> comes from the lambda's ${C('MemberExpression')}; the getter is compiled <b>once</b>. ${C('CheckUser(name, age, email)')} validates a User with rules: Name NotEmpty, MaxLength(10); Age InRange(18, 65); Email Must(e => e != null && e.Contains(\'@\'), "must contain @"). Return messages in rule order: ${C('"Name: must not be empty"')}, ${C('"Name: length must be <= 10"')}, ${C('"Age: must be between 18 and 65"')}, ${C('"Email: must contain @"')}.</p>`,
    constraints: `Strings may be null. MaxLength ignores null values.`,
    example: `<p>${C('CheckUser("", 70, "x")')} → ${H.c('g', '["Name: must not be empty", "Age: must be between 18 and 65", "Email: must contain @"]')}</p>`,
    brute: { why: `<p>Passing names as strings (${C('RuleFor("Name", u => u.Name)')}) duplicates information and breaks silently when the property is renamed. Reading the name from ${C('Expression<Func<T, TProp>>')} keeps it refactoring-safe; compiling the same expression gives a fast getter.</p>`, code: `
class User0 { public string? Name { get; set; } }
static class StringRules
{
    public static string? Check(User0 u) => string.IsNullOrEmpty(u.Name) ? "Name: must not be empty" : null;   // "Name" typed by hand
}` },
    mcq: { q: 'For <code>RuleFor(u =&gt; u.Age)</code> with <code>Expression&lt;Func&lt;User, int&gt;&gt;</code>, what is <code>expr.Body</code>?', options: ['A MemberExpression whose Member.Name is "Age"', 'A ConstantExpression', 'A UnaryExpression Convert', 'A MethodCallExpression to get_Age'], answer: 0, explain: 'With TProp = int no boxing conversion is needed, so the body is the member access itself. With Func&lt;User, object> it would be wrapped in Convert (UnaryExpression).' },
    hints: [`<p>Hint 1: ${C('RuleFor<TProp>(Expression<Func<T, TProp>> e)')}: name = ${C('((MemberExpression)e.Body).Member.Name')}; getter = ${C('e.Compile()')}.</p>`, `<p>Hint 2: store rules as ${C('List<Func<T, string?>>')} closures; each builder method adds one and returns the builder (fluent).</p>`, `<p>Hint 3: ${C('InRange')} needs ${C('where TProp : IComparable<TProp>')} — put it in a generic extension or a constrained builder method.</p>`],
    tests: { sig: 'string int string -> string[]', fn: 'checkUser', cases: [
      [['', 70, 'x'], ['Name: must not be empty', 'Age: must be between 18 and 65', 'Email: must contain @']],
      [['Asha', 30, 'a@b.in'], []],
      [[null, 18, null], ['Name: must not be empty', 'Email: must contain @']],
      [['Christopher', 65, 'c@d'], ['Name: length must be <= 10']],
      [['Li', 17, '@'], ['Age: must be between 18 and 65']],
      [['ExactlyTen', -2147483648, 'no-at'], ['Age: must be between 18 and 65', 'Email: must contain @']]
    ] },
    solution: {
      approach: `<p>The builder captures the property name and a compiled getter from the member expression. Each rule method appends a closure ${C('T → message?')} to the validator. Validation runs the closures in order and collects non-null messages.</p>`,
      code: `
using System.Linq.Expressions;

public class Solution
{
    private static readonly Validator<User> Rules = Build();

    static Validator<User> Build()
    {
        var v = new Validator<User>();
        v.RuleFor(u => u.Name).NotEmpty().MaxLength(10);
        v.RuleFor(u => u.Age).InRange(18, 65);
        v.RuleFor(u => u.Email).Must(e => e != null && e.Contains('@'), "must contain @");
        return v;
    }

    public static string[] CheckUser(string? name, int age, string? email) =>
        Rules.Validate(new User { Name = name, Age = age, Email = email }).ToArray();
}

public class User
{
    public string? Name { get; set; }
    public int Age { get; set; }
    public string? Email { get; set; }
}

public sealed class Validator<T>
{
    private readonly List<Func<T, string?>> _rules = new();

    public RuleBuilder<T, TProp> RuleFor<TProp>(Expression<Func<T, TProp>> member)
    {
        if (member.Body is not MemberExpression m) throw new ArgumentException("expected a property access");
        return new RuleBuilder<T, TProp>(this, m.Member.Name, member.Compile());
    }

    internal void Add(Func<T, string?> rule) => _rules.Add(rule);

    public List<string> Validate(T item) =>
        _rules.Select(r => r(item)).Where(msg => msg != null).Select(msg => msg!).ToList();
}

public sealed class RuleBuilder<T, TProp>(Validator<T> owner, string name, Func<T, TProp> get)
{
    public RuleBuilder<T, TProp> Must(Func<TProp, bool> pred, string message)
    {
        owner.Add(item => pred(get(item)) ? null : $"{name}: {message}");
        return this;
    }

    public RuleBuilder<T, TProp> NotEmpty() =>
        Must(v => v is not null && !(v is string s && s.Length == 0), "must not be empty");

    public RuleBuilder<T, TProp> MaxLength(int max) =>
        Must(v => v is not string s || s.Length <= max, $"length must be <= {max}");
}

public static class RuleBuilderExtensions
{
    public static RuleBuilder<T, TProp> InRange<T, TProp>(this RuleBuilder<T, TProp> b, TProp lo, TProp hi)
        where TProp : IComparable<TProp> =>
        b.Must(v => v.CompareTo(lo) >= 0 && v.CompareTo(hi) <= 0, $"must be between {lo} and {hi}");
}`,
      dry: { head: ['rule', 'name from expression', 'value', 'message'], rows: [['NotEmpty', 'Name', '""', 'Name: must not be empty'], ['MaxLength(10)', 'Name', '""', '—'], ['InRange(18, 65)', 'Age', '70', 'Age: must be between 18 and 65'], ['Must(@)', 'Email', '"x"', 'Email: must contain @']] },
      complexity: `<p>Building: one expression compile per RuleFor (done once, static). Validation: O(rules) delegate calls, no reflection.</p>`,
      followUps: ['Support nested members (<code>u =&gt; u.Address.City</code>) by walking the MemberExpression chain.', 'Add <code>When(predicate)</code> to make a rule conditional.']
    }
  });

  /* ======================================================================
     QUIZ (authored with the correct option first; rotated below)
     ====================================================================== */
  quiz.push(
    { q: `<code>typeof(Product).GetProperties(BindingFlags.NonPublic)</code> returns…`, options: ['An empty array — you must also pass Instance or Static', 'All private properties', 'All properties', 'It throws ArgumentException'], answer: 0, explain: 'Once flags are given, both a visibility (Public/NonPublic) and a scope (Instance/Static) are required for anything to match.' },
    { q: `A method called with <code>MethodInfo.Invoke</code> throws <code>FormatException</code>. The caller sees…`, options: ['TargetInvocationException with the FormatException as InnerException', 'FormatException', 'InvalidCastException', 'Nothing — Invoke returns null'], answer: 0, explain: 'Reflection wraps exceptions from the target. Unwrap InnerException or use BindingFlags.DoNotWrapExceptions.' },
    { q: `What does <code>typeof(Dictionary&lt;string, int&gt;).Name</code> return?`, options: ['Dictionary`2', 'Dictionary&lt;string, int&gt;', 'Dictionary', 'System.Collections.Generic.Dictionary'], answer: 0, explain: 'CLR names of generic types end with a backtick and the number of type parameters; Name excludes the namespace and the arguments.' },
    { q: `When does the constructor of a custom attribute run?`, options: ['Each time the attribute is retrieved via reflection', 'Once, when the assembly loads', 'When an instance of the decorated class is created', 'At compile time'], answer: 0, explain: 'The compiler stores the constructor and arguments as a blob; GetCustomAttribute(s) decodes it and constructs new objects on every call.' },
    { q: `Which attribute argument is NOT allowed?`, options: ['<code>[Timeout(TimeSpan.FromSeconds(5))]</code>', '<code>[Tag("x")]</code>', '<code>[Handler(typeof(MyHandler))]</code>', '<code>[Flags(new[] { 1, 2 })]</code>'], answer: 0, explain: 'Attribute arguments must be compile-time constants, typeof expressions, enums, or 1-D arrays of those. A method call is not a constant.' },
    { q: `<code>IEnumerable&lt;string&gt; s = new List&lt;string&gt;(); IEnumerable&lt;object&gt; o = s;</code> compiles because…`, options: ['IEnumerable&lt;out T&gt; is covariant and string is a reference type', 'List&lt;T&gt; is covariant', 'string has an implicit conversion to object', 'The compiler inserts Cast&lt;object&gt;()'], answer: 0, explain: 'T only appears in output positions of IEnumerable, so it is declared out T. Variance applies only to reference type arguments.' },
    { q: `<code>IEnumerable&lt;int&gt; xs = new[] { 1 }; IEnumerable&lt;object&gt; o = xs;</code>`, options: ['Compile error: variance does not apply to value types', 'Compiles; the ints are boxed lazily', 'Compiles; o is null', 'Runtime InvalidCastException'], answer: 0, explain: 'A variant conversion must keep the same representation; an int would have to be boxed. Use xs.Cast&lt;object>().' },
    { q: `<code>object[] a = new string[1]; a[0] = 1;</code>`, options: ['Compiles, throws ArrayTypeMismatchException at run time', 'Compile error', 'Stores a boxed 1', 'Throws InvalidCastException'], answer: 0, explain: 'Reference arrays are covariant, so the assignment compiles; every store is checked against the real element type at run time.' },
    { q: `Inside <code>static T Sum&lt;T&gt;(T[] xs) where T : INumber&lt;T&gt;</code>, which line starts the accumulator correctly?`, options: ['<code>T s = T.Zero;</code>', '<code>T s = 0;</code>', '<code>T s = new T();</code>', '<code>T s = (T)(object)0;</code>'], answer: 0, explain: 'Zero is a static abstract member of INumberBase&lt;T>. The literal 0 does not convert to an arbitrary T; the boxing cast would fail for long or double.' },
    { q: `A class has <code>public string Describe()</code> and an extension <code>Describe(this Widget w)</code> exists. <code>w.Describe()</code> calls…`, options: ['The instance method', 'The extension method', 'It is ambiguous (compile error)', 'Whichever was declared last'], answer: 0, explain: 'Extension methods are considered only when no applicable instance method exists.' },
    { q: `<code>object a = "hi"; object b = new string(new[] {'h','i'}); Console.WriteLine(a == b);</code>`, options: ['False', 'True', 'Compile error', 'Depends on string interning'], answer: 0, explain: 'Operators are chosen from static types: object == object is reference equality. The two strings are different objects (new string is never interned).' },
    { q: `You overload <code>operator ==</code> on a class. Which is required by the compiler?`, options: ['operator != as well', 'IEquatable&lt;T&gt;', 'operator &lt; and &gt;', 'A parameterless constructor'], answer: 0, explain: 'Comparison operators must be declared in pairs (CS0216). Overriding Equals/GetHashCode is strongly recommended (warnings CS0660/CS0661).' },
    { q: `Which lambda can NOT be converted to <code>Expression&lt;Func&lt;int, int&gt;&gt;</code>?`, options: ['<code>x =&gt; { return x + 1; }</code>', '<code>x =&gt; x + 1</code>', '<code>x =&gt; x &gt; 0 ? x : -x</code>', '<code>x =&gt; Math.Abs(x)</code>'], answer: 0, explain: 'Expression lambdas must be single expressions; statement bodies give CS0834 "A lambda expression with a statement body cannot be converted to an expression tree".' },
    { q: `Storing a filter in <code>Func&lt;User, bool&gt; f</code> and calling <code>db.Users.Where(f)</code> on EF Core…`, options: ['Binds to Enumerable.Where: all rows are loaded and filtered in memory', 'Translates f into SQL', 'Throws at compile time', 'Throws "could not be translated"'], answer: 0, explain: 'Queryable.Where needs Expression&lt;Func&lt;...>>. A Func only matches the IEnumerable overload, so the query becomes SELECT * and filtering happens on the client.' },
    { q: `Why is <code>static class Cache&lt;T&gt; { public static readonly X V = Build(typeof(T)); }</code> a fast per-type cache?`, options: ['Each closed generic type has its own static fields, initialized once by the runtime, with no lookup afterwards', 'Static fields are stored in registers', 'The JIT shares one value for all T', 'It uses a ConcurrentDictionary internally'], answer: 0, explain: 'Cache&lt;Order>.V and Cache&lt;User>.V are separate slots; the type initializer runs once per closed type, thread-safely.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What is reflection in .NET, and what is it used for?', a: `<p>Reflection is the API (${C('System.Reflection')}, rooted at ${C('System.Type')}) for reading the <b>metadata</b> the compiler stores in every assembly and acting on it at run time: listing properties and methods, reading attributes, creating instances (${C('Activator.CreateInstance')}), getting/setting values and invoking methods by name. Typical users are serializers (System.Text.Json, Newtonsoft), ORMs (EF Core), DI containers, test runners (finding ${C('[Fact]')} methods), model binding and plugin hosts — any framework that must work with types written after it was compiled.</p><p>Costs: it is slower than direct calls (argument checks, boxing, ${C('object[]')} allocation), it loses compile-time safety (names in strings), and it can break under trimming and Native AOT. So frameworks reflect once and cache delegates, or use source generators.</p>`, followUps: ['typeof vs GetType()?', 'How would you call a private method, and should you?'] },
    { level: 'B', q: 'typeof(T), obj.GetType() and Type.GetType(string) — what is the difference?', a: `<p>${C('typeof(T)')} is resolved at compile time from a type name (it compiles to ${C('ldtoken')} and is effectively a constant). ${C('obj.GetType()')} returns the <b>run-time</b> type of an object — for ${C('Animal a = new Dog()')} it is Dog — and boxes value types first (so a nullable with a value reports the underlying type). ${C('Type.GetType("Ns.Name, Assembly")')} looks a type up from a string and returns null if it is not found (it searches the calling assembly and mscorlib/System.Private.CoreLib unless the name is assembly-qualified). Because there is one Type object per type, ${C('a.GetType() == typeof(Dog)')} is an exact-type check, unlike ${C('is')} which accepts subclasses.</p>`, followUps: ['What does typeof(List<>) return?', 'Why does ((int?)5).GetType() say Int32?'] },
    { level: 'I', q: 'How do you write and consume a custom attribute?', a: `<p>Derive from ${C('Attribute')} (by convention name it ${C('XxxAttribute')}), and restrict where it can go with ${C('[AttributeUsage(AttributeTargets.Property, AllowMultiple = false, Inherited = true)]')}. Constructor parameters are positional arguments; public settable properties become named arguments. Arguments must be constants, ${C('typeof')}, enums or 1-D arrays. The compiler serialises them into the CustomAttribute metadata table — nothing runs at that point.</p><p>To consume it, reflect: ${C('prop.GetCustomAttribute<MaxLenAttribute>()')}, ${C('GetCustomAttributes<RuleAttribute>()')} (includes derived attribute types) or ${C('IsDefined')} (no allocation). Every retrieval constructs new attribute objects, so cache the results per type. Since C# 11 attributes can be generic (${C('[Converter<MoneyConverter>]')}). For AOT-friendly frameworks, a source generator can read the same attributes at compile time.</p>`, followUps: ['What are pseudo-attributes?', 'How does Inherited interact with overridden members?'] },
    { level: 'I', q: 'Explain covariance and contravariance in C# generics with examples.', a: `<p>Variance says whether ${C('G<Derived>')} converts to ${C('G<Base>')}. <b>Covariance</b> (${C('out T')}) allows it when T is only produced: ${C('IEnumerable<string>')} → ${C('IEnumerable<object>')}, ${C('Func<string>')} → ${C('Func<object>')}. <b>Contravariance</b> (${C('in T')}) allows the reverse when T is only consumed: ${C('IComparer<object>')} → ${C('IComparer<string>')}, ${C('Action<object>')} → ${C('Action<string>')}. Types with T in both positions (${C('List<T>')}, ${C('IList<T>')}) are invariant, otherwise you could add a Cat to a list of Dogs.</p><p>Rules: only interfaces and delegates can declare variance; only reference type arguments participate (no ${C('IEnumerable<int>')} → ${C('IEnumerable<object>')}); the compiler enforces positions (CS1961). Arrays are the odd one out: covariant but checked at run time (${C('ArrayTypeMismatchException')}). API advice: accept ${C('IEnumerable<T>')}/${C('IReadOnlyList<T>')} so callers can pass more specific collections.</p>`, followUps: ['Why is IReadOnlyList covariant but IList not?', 'How does Java do this differently?'] },
    { level: 'A', q: 'What are static abstract interface members and what problem do they solve?', a: `<p>C# 11 lets interfaces declare ${C('static abstract')} (and ${C('static virtual')}) members — static methods, properties and <b>operators</b> — that implementing types must provide. Generic code then calls them on a type parameter: ${C('T.Zero')}, ${C('a + b')}, ${C('T.Parse(s, null)')}. Before, operators and factories were unreachable from generics, so libraries duplicated code per numeric type or used ${C('dynamic')}/reflection.</p><p>.NET 7 built <b>generic math</b> on it: ${C('INumber<T>')}, ${C('IAdditionOperators<TSelf,TOther,TResult>')}, ${C('IBinaryInteger<T>')}, ${C('IParsable<T>')}, with conversions ${C('CreateChecked/Saturating/Truncating')} and checked operators. Calls compile to constrained calls; for value types the JIT specialises the method so ${C('T.Zero + x')} becomes a plain machine add. Typical pattern: ${C('interface IMonoid<TSelf> where TSelf : IMonoid<TSelf> { static abstract TSelf Empty { get; } static abstract TSelf operator +(TSelf a, TSelf b); }')}. Caveats: such interfaces cannot generally be used as variable types (CS8920), and the self-type constraint is a convention, not enforced.</p>`, followUps: ['CreateChecked vs CreateTruncating?', 'How does checked(a + b) work in a generic method?'] },
    { level: 'B', q: 'What are extension methods and what are their pitfalls?', a: `<p>Static methods in a non-generic, non-nested static class with ${C('this')} on the first parameter. When the namespace is imported, ${C('x.M()')} compiles to ${C('Cls.M(x)')}. LINQ, ASP.NET's ${C('services.AddXxx()')} and fluent APIs are built on them.</p><p>Pitfalls: (1) instance methods always win — if the type later gains a matching method, your extension silently stops being called; (2) binding uses the <b>static</b> type, so there is no polymorphism; (3) null receivers are allowed, so the method must handle null; (4) ambiguity when two imported namespaces define the same extension; (5) extending ${C('object')} or common types pollutes IntelliSense. Use distinctive names and put them in an opt-in namespace.</p>`, followUps: ['How does the compiler pick between this IEnumerable&lt;T&gt; and this List&lt;T&gt; overloads?', 'What are this ref extensions for?'] },
    { level: 'I', q: 'What rules should you follow when overloading operators in C#?', a: `<p>Operators are ${C('public static')} and declared in the type; comparison operators come in pairs (${C('==')}/${C('!=')}, ${C('<')}/${C('>')}, ${C('<=')}/${C('>=')}). If you define ${C('==')}, override ${C('Equals')} and ${C('GetHashCode')} and implement ${C('IEquatable<T>')} so collections agree with the operator — records do this automatically. In reference-type operators, test null with ${C('is null')} to avoid infinite recursion. Implicit conversions must never throw or lose information; use ${C('explicit')} otherwise. Keep semantics unsurprising (Money + Money, not Logger + string).</p><p>Remember operators are resolved statically: through ${C('object')} or an interface, your ${C('==')} is not used. C# 11 added checked operators (${C('operator checked +')}) and ${C('>>>')}; generic math interfaces expose operators to generic code.</p>`, followUps: ['How are operators named in IL?', 'What are lifted operators?'] },
    { level: 'A', q: 'What is an expression tree and how does EF Core use it?', a: `<p>When a lambda is assigned to ${C('Expression<TDelegate>')}, the compiler emits code that builds an immutable tree of ${C('System.Linq.Expressions')} nodes (Parameter, Constant, Binary, MemberAccess, MethodCall, Lambda…) instead of IL. ${C('IQueryable<T>')} operators take expressions, so ${C('db.Users.Where(u => u.Age > min)')} composes a tree; when you enumerate, the provider walks it and generates SQL (${C('WHERE Age > @min')}; the captured ${C('min')} becomes a parameter because it appears as a field of a closure object). Methods the provider does not know cannot be translated and cause "could not be translated" errors.</p><p>Trees can also be inspected (getting property names from ${C('x => x.Email')}), rewritten with ${C('ExpressionVisitor')} (combining predicates, parameter replacement), or compiled with ${C('Compile()')} into a delegate — the classic way to generate fast getters and mappers at run time. Limits: expression lambdas cannot have statement bodies, assignments, ${C('await')}, or ${C('?.')}.</p>`, followUps: ['How do you combine two Expression&lt;Func&lt;T,bool>> with AND?', 'What does Compile(preferInterpretation: true) do?'] },
    { level: 'A', q: 'Reflection is too slow in a hot path. What are your options?', a: `<p>Measure first (BenchmarkDotNet, allocation counts). Then, roughly in order: (1) <b>cache</b> metadata — PropertyInfo[], attributes — per type, ideally in a static generic class ${C('Cache<T>')}; (2) convert ${C('MethodInfo')} to a strongly typed delegate with ${C('CreateDelegate<Func<T, R>>()')}; (3) for unknown types, build and ${C('Compile()')} expression trees once (property getters/setters, constructors, mappers) — delegate speed afterwards; (4) ${C('UnsafeAccessor')} (.NET 8) for zero-overhead access to private members known at compile time; (5) move the work to <b>compile time</b> with a source generator (System.Text.Json's ${C('JsonSerializerContext')}, Mapperly, ${C('[LoggerMessage]')}), which also fixes trimming and Native AOT issues. Reflection.Emit is the last resort.</p>`, followUps: ['Why does reflection allocate?', 'What breaks under Native AOT?'] },
    { level: 'I', q: 'What is the difference between class, struct, notnull, unmanaged and new() constraints?', a: `<p>${C('class')}: T is a reference type (${C('class?')} allows nullable reference types). ${C('struct')}: non-nullable value type, so ${C('T?')} means ${C('Nullable<T>')}. ${C('notnull')}: any non-nullable type (good for dictionary keys). ${C('unmanaged')}: a value type containing no references at any depth — allows ${C('sizeof(T)')}, ${C('stackalloc T[n]')}, pointer and ${C('MemoryMarshal')} reinterpretation. ${C('new()')}: a public parameterless constructor, enabling ${C('new T()')} (which is compiled via ${C('Activator.CreateInstance<T>')}, slower than a factory delegate). Also base-class/interface constraints, ${C('Enum')} and ${C('Delegate')} constraints (C# 7.3), naked ${C('where T : U')}, and ${C('default')} in overrides. Constraints are not part of the signature for overloading.</p>`, followUps: ['Why is new T() slower than a Func&lt;T>?', 'Can you constrain T to "has a static Parse method"?'] },
    { level: 'A', q: 'What is a source generator and when would you choose one over reflection?', a: `<p>A Roslyn component (${C('IIncrementalGenerator')}, in a netstandard2.0 project referenced as an analyzer) that runs during compilation, reads the syntax trees and semantic model, and <b>adds</b> C# source files — it cannot modify existing code, so the pattern is a ${C('partial')} declaration plus an attribute. Examples: ${C('[GeneratedRegex]')}, ${C('[JsonSerializable]')}, ${C('[LoggerMessage]')}, ${C('[LibraryImport]')}, ASP.NET Core's AOT request delegate generator.</p><p>Choose it when the information is known at compile time and you care about start-up time, steady-state speed, trimming/Native AOT compatibility, or compile-time errors. Reflection remains simpler for truly dynamic cases (plugins loaded at run time, types unknown at build). Costs: harder to write and debug, must be incremental (equatable pipeline values) to keep the IDE fast.</p>`, followUps: ['Why must pipeline values be equatable?', 'What are interceptors?'] },
    { level: 'E', q: 'Design a minimal dependency-injection container. What are the hard parts?', a: `<p>Core: a registry mapping service types to implementations and lifetimes (transient, scoped, singleton); resolution picks a constructor (most parameters it can satisfy, or a marked one), resolves parameters recursively and invokes it. Hard parts: (1) <b>cycle detection</b> — keep the resolution path and fail with "A → B → A" instead of a stack overflow; (2) <b>lifetimes</b> — singletons cached per root, scoped per scope, and catching captive dependencies (a singleton holding a scoped service); (3) <b>disposal</b> — the container owns IDisposable instances it created and disposes them in reverse order when the scope ends; (4) <b>thread safety</b> of singleton creation; (5) <b>performance</b> — compile a factory delegate per registration (expression trees) instead of reflecting per resolve, and validate the graph at start-up (${C('ValidateOnBuild')}); (6) open generics (${C('IRepo<>')} → ${C('Repo<>')}) and ${C('IEnumerable<T>')} for multiple registrations.</p>`, followUps: ['What is a captive dependency?', 'How does Microsoft.Extensions.DependencyInjection choose a constructor?'] },
    { level: 'E', q: 'Your library uses reflection heavily and a customer wants to publish with Native AOT. What do you do?', a: `<p>Run the AOT/trim analyzers (${C('<IsAotCompatible>true</IsAotCompatible>')}) to get warnings (IL2026, IL3050…) at every problematic call. Then: replace string-based reflection with generics or source generators where types are known at build time; annotate APIs that receive types with ${C('[DynamicallyAccessedMembers]')} so the trimmer keeps the needed members; mark truly dynamic APIs with ${C('[RequiresUnreferencedCode]')}/${C('[RequiresDynamicCode]')} so callers get warnings; remove ${C('Reflection.Emit')}, ${C('MakeGenericType')} over value types and ${C('Expression.Compile')} on hot paths (under AOT it falls back to the interpreter); provide a generator-based path (like ${C('JsonSerializerContext')}). Test the published AOT binary, not just the JIT build.</p>`, followUps: ['What does the trimmer do with an unused property?', 'Why is MakeGenericType problematic under AOT?'] },
    { level: 'I', q: 'Why does List&lt;T> not implement a covariant interface, and how do you design APIs around that?', a: `<p>${C('List<T>')} exposes T in both input (${C('Add(T)')}, indexer set) and output (indexer get, enumeration) positions, so treating ${C('List<Dog>')} as ${C('List<Animal>')} would allow adding a Cat. Variance also cannot be declared on classes at all. ${C('List<T>')} does implement covariant ${C('IEnumerable<T>')} and ${C('IReadOnlyList<T>')}/${C('IReadOnlyCollection<T>')}, so the API rule is: accept the most general read-only interface you need (${C('IEnumerable<Animal>')} for one pass, ${C('IReadOnlyList<Animal>')} for indexing/count) and return concrete or read-only types. If a method must add items, make it generic: ${C('void AddAll<T>(ICollection<T> target) where T : Animal')}.</p>`, followUps: ['Why is IReadOnlyList&lt;T> covariant but ICollection&lt;T> not?', 'What is the cost of a variant interface cast?'] },
    { level: 'E', q: 'What does GetCustomAttribute cost, and how do frameworks like ASP.NET avoid paying it per request?', a: `<p>Each call locates the CustomAttribute rows for the member, filters by type (including derived attribute types unless sealed), decodes the blob, runs the attribute constructor and named setters through reflection, and allocates the attribute objects and an array. That is microseconds and garbage per call. Frameworks build a <b>metadata model</b> once per type/action at start-up or first use — ASP.NET's ${C('ApiDescription')}/${C('ActionDescriptor')}, System.Text.Json's ${C('JsonTypeInfo')}, MVC's ModelMetadata — and cache it, often with compiled delegates for property access. Increasingly the model itself is produced by source generators at build time. Your own code should do the same: a ${C('ConcurrentDictionary<Type, Metadata>')} or a static generic cache, ${C('IsDefined')} for presence checks, and sealed attribute classes.</p>`, followUps: ['How would you invalidate such a cache with collectible AssemblyLoadContexts?', 'What is CustomAttributeData?'] }
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
    id: 'csharp11',
    title: 'Reflection, Attributes & Advanced Generics',
    lang: 'csharp',
    intro: `<p>Frameworks such as ASP.NET Core, Entity Framework, xUnit and System.Text.Json look like magic: you put an attribute on a property, add a constructor parameter, write a lambda, and the framework "just knows" what to do. This module opens the box. You learn <b>reflection</b> (reading and calling types at run time), <b>custom attributes</b> (metadata the framework reads), <b>generic variance</b> (why ${C('IEnumerable<string>')} is an ${C('IEnumerable<object>')} but ${C('List<string>')} is not a ${C('List<object>')}), <b>static abstract interface members</b> and <b>generic math</b> (C# 11), <b>extension methods</b>, <b>operator overloading</b>, <b>expression trees</b> (code as data — how LINQ to SQL translates your lambda) and finally <b>advanced constraints and source generators</b>, the compile-time replacement for much run-time reflection.</p>
<p>Every topic has a step-through visualizer and a guided problem; the practice set builds real framework pieces — a validator, a mini dependency-injection container, a CSV mapper, an expression simplifier — all tested on .NET 8 with C# 12.</p>`,
    goals: [
      'Inspect and use types at run time with <code>Type</code>, <code>BindingFlags</code>, <code>PropertyInfo</code>/<code>MethodInfo</code> and <code>Activator</code>, and unwrap <code>TargetInvocationException</code>',
      'Declare custom attributes with <code>AttributeUsage</code> and build an attribute-driven validator or mapper',
      'Explain generic variance (<code>in</code>/<code>out</code>), why arrays are unsafely covariant, and which interfaces and delegates are variant',
      'Write generic math with static abstract interface members (<code>INumber&lt;T&gt;</code>, <code>IParsable&lt;T&gt;</code>) and your own static abstract contracts',
      'Design extension methods and operator overloads that follow the .NET rules (resolution order, <code>==</code> with <code>Equals</code>/<code>GetHashCode</code>, implicit vs explicit conversions)',
      'Build, compile and rewrite expression trees, and explain how IQueryable providers use them',
      'Choose between reflection, cached delegates, expression trees and source generators for performance and trimming/AOT'
    ],
    prereqs: `C# 5 (Generics &amp; Collections) and C# 6 (Delegates, Lambdas, Events &amp; LINQ). Comfort with interfaces (C# 4) helps. A .NET 8 SDK to run the examples.`,
    hours: 18,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
