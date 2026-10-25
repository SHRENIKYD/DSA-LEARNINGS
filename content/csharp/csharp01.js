(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------- shared visualizer helpers (csharp01) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function cp(code, line, cls, label) { var hl = {}; if (line) hl[line] = cls || 'cur'; return { type: 'code', label: label || 'C# (current line highlighted)', lang: 'csharp', code: code, hl: hl }; }
  function vp(obj, hl, label) { var vals = {}; Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); }); return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl || {} }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  /* steps: [{ l: line, v: {vars}, h: {hl}, n: 'narration', out: 'console text' }] */
  function stepViz(code, steps) {
    return steps.map(function (s) {
      var parts = [cp(code, s.l, s.c)];
      if (s.v) parts.push(vp(s.v, s.h));
      if (s.out !== undefined) parts.push(tx('<pre>' + esc(s.out || ' ') + '</pre>', 'Console output'));
      return fr(s.n, parts);
    });
  }
  function toBin(v, width) { var mod = Math.pow(2, width); var u = ((v % mod) + mod) % mod; var s = u.toString(2); while (s.length < width) s = '0' + s; return s; }
  function wrap(v, width, signed) { var mod = Math.pow(2, width); var u = ((v % mod) + mod) % mod; return signed && u >= mod / 2 ? u - mod : u; }

  /* ======================================================================
     TOPIC 1 — The .NET SDK, the dotnet CLI, IL and the JIT
     ====================================================================== */
  topics.push({
    title: '.NET SDK & the dotnet CLI: C# → IL → JIT → Machine Code',
    analogy: R`<p>Imagine a <b>travel guidebook</b> written once in a neutral "universal" language. A <b>translator</b> (the C# compiler, called <b>Roslyn</b>) turns your English notes into that universal language and binds them into a book (a <code>.dll</code> file full of <b>IL</b>, Intermediate Language). The book can be carried to any country. When a traveller actually opens it, a <b>local interpreter</b> (the <b>JIT</b> compiler inside the .NET runtime) reads one chapter at a time and speaks it in the local tongue (x64 or Arm64 machine code). Chapters that are read again and again get a polished, faster translation the second time round: that is <b>tiered compilation</b>.</p>`,
    explain: R`<h4>🟢 The big idea</h4>
<p>C# is <b>compiled twice</b>. First, on your machine, the C# compiler turns source text into <b>IL</b> (Intermediate Language, also called CIL or MSIL) and metadata, packed into an <b>assembly</b> (<code>.dll</code>). Second, when the program runs, the <b>CLR</b> (Common Language Runtime, the engine of .NET) compiles each method's IL to real machine code <b>the first time that method is called</b>. This second step is the <b>JIT</b> (Just-In-Time) compiler, called RyuJIT.</p>
${H.table(['Piece', 'What it is', 'Java equivalent'], [
  ['C# compiler (Roslyn, <code>csc</code>)', 'turns <code>.cs</code> files into IL + metadata', '<code>javac</code>'],
  ['IL / assembly (<code>.dll</code>)', 'portable, CPU-neutral instructions plus type information', '<code>.class</code> bytecode / <code>.jar</code>'],
  ['CLR', 'loads assemblies, verifies them, runs the JIT and the garbage collector', 'the JVM'],
  ['JIT (RyuJIT)', 'IL → native code per method, on first call; tiered', 'HotSpot C1/C2'],
  ['BCL', 'Base Class Library: <code>System</code>, collections, I/O, LINQ…', 'the JDK class library'],
  ['.NET SDK', 'compiler + <code>dotnet</code> CLI + MSBuild + NuGet + templates', 'the JDK + Maven/Gradle']
])}
<h4>The dotnet CLI — the only tool you need</h4>
${H.table(['Command', 'What it does'], [
  ['<code>dotnet --info</code> / <code>dotnet --list-sdks</code>', 'show installed SDKs and runtimes'],
  ['<code>dotnet new console -n Hello</code>', 'create a project folder with <code>Hello.csproj</code> and <code>Program.cs</code>'],
  ['<code>dotnet build</code>', 'restore NuGet packages, compile to <code>bin/Debug/net8.0/Hello.dll</code>'],
  ['<code>dotnet run</code>', 'build if needed, then run'],
  ['<code>dotnet run -c Release</code>', 'optimised build (always benchmark in Release!)'],
  ['<code>dotnet add package Newtonsoft.Json</code>', 'add a NuGet dependency to the <code>.csproj</code>'],
  ['<code>dotnet test</code>', 'run unit tests (xUnit, NUnit, MSTest)'],
  ['<code>dotnet publish -c Release -r linux-x64</code>', 'produce a deployable folder for one platform']
])}
<h4>The project file</h4>
<p>A <code>.csproj</code> is a small MSBuild XML file. The important lines are <code>&lt;TargetFramework&gt;net8.0&lt;/TargetFramework&gt;</code> (which runtime), <code>&lt;Nullable&gt;enable&lt;/Nullable&gt;</code> (nullable reference warnings) and <code>&lt;ImplicitUsings&gt;enable&lt;/ImplicitUsings&gt;</code> (common <code>using</code> lines added for you). .NET 8 is a <b>Long-Term Support</b> release (November 2023, supported until November 2026) and ships with <b>C# 12</b>; this course uses C# 12 features throughout. Newer releases (.NET 10 with C# 14) keep all of it working.</p>`,
    clues: [
      '"What happens when you run <code>dotnet run</code>?" → restore → compile to IL → host starts the CLR → JIT on first call',
      '"Difference between .NET Framework, .NET Core and .NET 8?" → Windows-only legacy vs cross-platform unified .NET',
      '"Why is the first request slow?" → JIT warm-up, tiered compilation, ReadyToRun / Native AOT as fixes',
      '"What is an assembly?" → the unit of deployment and versioning: IL + metadata + manifest',
      '"Is C# interpreted?" → no: IL is always JIT- or AOT-compiled to native code before it runs'
    ],
    code: [R`// Program.cs created by: dotnet new console -n Hello
// The whole file is "top-level statements": the compiler wraps it in a hidden Main.
Console.WriteLine("Hello, .NET!");
Console.WriteLine($"Runtime: {Environment.Version}");          // e.g. 8.0.x
Console.WriteLine($"64-bit process: {Environment.Is64BitProcess}");
Console.WriteLine($"OS: {System.Runtime.InteropServices.RuntimeInformation.OSDescription}");`,
      { lang: 'csharp', run: true, title: 'A complete classic program you can run', code: R`using System;

class Program
{
    static void Main()
    {
        // The same program written with an explicit Main method.
        Console.WriteLine("Hello, .NET!");
        Console.WriteLine($"Runtime version: {Environment.Version.Major}");
        Console.WriteLine($"Processor count: {Environment.ProcessorCount > 0}");
    }
}` }],
    codeTitle: ['Program.cs (top-level statements)', 'Explicit Main (runnable)'],
    viz: {
      title: 'From Program.cs to machine code',
      gen: function () {
        var nodes = [
          { id: 'cs', label: 'Program.cs', x: 6, y: 30, shape: 'box' },
          { id: 'roslyn', label: 'Roslyn (csc)', x: 24, y: 30, shape: 'box' },
          { id: 'dll', label: 'Hello.dll (IL)', x: 42, y: 30, shape: 'box' },
          { id: 'clr', label: 'CLR host', x: 60, y: 30, shape: 'box' },
          { id: 't0', label: 'JIT tier 0', x: 78, y: 12, shape: 'box' },
          { id: 't1', label: 'JIT tier 1', x: 78, y: 48, shape: 'box' },
          { id: 'cpu', label: 'CPU', x: 95, y: 30, shape: 'box' }
        ];
        var edges = [['cs', 'roslyn'], ['roslyn', 'dll'], ['dll', 'clr'], ['clr', 't0'], ['t0', 'cpu'], ['t0', 't1', 'hot'], ['t1', 'cpu']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Build and run pipeline', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        return [
          fr('You type <code>dotnet run</code>. First MSBuild restores packages and asks the C# compiler to compile <b>Program.cs</b>.', [g({ cs: 'cur' })]),
          fr('<b>Roslyn</b> parses, type-checks and emits <b>IL</b> plus metadata (type names, method signatures). Compile errors like CS0103 come from here.', [g({ roslyn: 'cur' }, { 'cs-roslyn': 'ok' })]),
          fr('The output is an <b>assembly</b>, <code>Hello.dll</code>. It contains no x64 or Arm64 code yet — only CPU-neutral IL such as <code>ldstr "Hello"</code> and <code>call Console.WriteLine</code>.', [g({ dll: 'cur' }, { 'roslyn-dll': 'ok' }, { dll: 'IL' }), tx('<pre>IL_0000: ldstr "Hello, .NET!"\nIL_0005: call void [System.Console]System.Console::WriteLine(string)\nIL_000a: ret</pre>', 'IL for the first line (ildasm view)')]),
          fr('The <b>host</b> (<code>dotnet Hello.dll</code>) starts the CLR, which loads the assembly, the BCL and finds the entry point <code>Main</code>.', [g({ clr: 'cur' }, { 'dll-clr': 'ok' })]),
          fr('First call of <code>Main</code>: the JIT compiles its IL quickly with few optimisations (<b>tier 0</b>). Starting fast matters more than peak speed here.', [g({ t0: 'cur' }, { 'clr-t0': 'ok' }, { t0: 'quick code' })]),
          fr('The CPU runs the native code. Each method is JIT-compiled once, on its first call, then reused.', [g({ cpu: 'cur' }, { 't0-cpu': 'ok' })]),
          fr('A method called often (30+ times) or a hot loop is <b>recompiled</b> in the background at <b>tier 1</b> with full optimisations (inlining, loop tricks, Dynamic PGO). Calls switch to the faster code.', [g({ t1: 'cur' }, { 't0-t1': 'ok' }, { t1: 'optimised' })]),
          fr('Result: startup is fast and steady-state is fast. To skip JIT at startup you can publish with <b>ReadyToRun</b> (pre-compiled code plus IL) or <b>Native AOT</b> (no JIT at all).', [g({ cpu: 'ok', t1: 'ok' }, { 't1-cpu': 'ok' })])
        ];
      }
    },
    examples: [
      { title: 'Create, build and run from scratch', html: R`<p>Four commands take you from nothing to a running app:</p><pre>dotnet new console -n Hello
cd Hello
dotnet build      # bin/Debug/net8.0/Hello.dll
dotnet run        # Hello, World!</pre><p><code>dotnet run</code> builds when needed, so in daily work you only type the last line. <code>dotnet bin/Debug/net8.0/Hello.dll</code> runs the already-built assembly directly.</p>` },
      { title: 'Debug vs Release', html: R`<p><code>dotnet build</code> defaults to <b>Debug</b>: the compiler emits IL that keeps every local for the debugger and the JIT does not optimise as much. <code>dotnet run -c Release</code> enables optimisations. A loop that takes 900 ms in Debug can take 150 ms in Release. Never measure performance in Debug.</p>` },
      { title: 'Reading the IL yourself', html: R`<p>Paste code into <b>sharplab.io</b> and choose "IL" to see what Roslyn produced, or "JIT Asm" to see the machine code. You will see that <code>x + 1</code> becomes <code>ldloc.0; ldc.i4.1; add</code> — a tiny stack machine, just like Java bytecode.</p>`, code: R`int x = 41;
int y = x + 1;      // IL: ldloc.0  ldc.i4.1  add  stloc.1
Console.WriteLine(y);` }
    ],
    deepDive: R`<h4>🟣 Under the hood</h4>
<ul>
<li><b>Assembly anatomy.</b> A <code>.dll</code> is a PE file with CLI headers, <b>metadata tables</b> (TypeDef, MethodDef, MemberRef…), the IL bodies and a manifest (name, version, references). Reflection reads those metadata tables.</li>
<li><b>Tiered compilation</b> is on by default since .NET Core 3.0. Tier 0 is a quick JIT; methods with loops use <b>OSR</b> (On-Stack Replacement) to jump into optimised code mid-loop. <b>Dynamic PGO</b> (default since .NET 8) instruments tier-0 code, then uses the observed types and branches to devirtualise and inline at tier 1.</li>
<li><b>ReadyToRun (R2R)</b> stores pre-compiled native code next to the IL; the JIT can still re-optimise hot methods. The BCL itself ships as R2R, which is why "Hello world" starts in tens of milliseconds.</li>
<li><b>Native AOT</b> (<code>&lt;PublishAot&gt;true&lt;/PublishAot&gt;</code>) compiles everything ahead of time into one native executable: tiny startup, small memory, but no runtime code generation, so <code>Reflection.Emit</code> and some dynamic reflection patterns are unsupported.</li>
<li><b>Framework-dependent vs self-contained.</b> A framework-dependent app needs the .NET runtime installed; a self-contained publish (<code>--self-contained</code>) bundles the runtime (around 70 MB, less with trimming).</li>
<li><b>One runtime, many languages.</b> F# and VB.NET compile to the same IL, which is why they can call each other's libraries. The Common Type System (CTS) defines the shared types: C# <code>int</code> is just an alias for <code>System.Int32</code>.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> assistants generate <code>.csproj</code> files, CLI commands and Dockerfiles instantly, and they can explain an unfamiliar build error. <b>Use AI as a partner:</b> ask "explain this MSBuild error and which file it comes from" or "show me the IL for this method and explain each instruction". <b>Where AI goes wrong:</b> it mixes up .NET Framework (<code>packages.config</code>, <code>App.config</code>, Windows-only APIs) with modern .NET, suggests outdated target frameworks such as <code>netcoreapp3.1</code>, or claims C# is interpreted. It also recommends Native AOT for apps that rely on reflection-heavy libraries. <b>What you must still own:</b> knowing which runtime you target, reading the build output, and understanding why the first call is slower than the hundredth.</p>`
  });

  /* ======================================================================
     TOPIC 2 — Top-level statements & program structure
     ====================================================================== */
  topics.push({
    title: 'Program Structure: Top-Level Statements, Main, Namespaces & usings',
    analogy: R`<p>A <b>theatre play</b> needs a stage door where the show begins. In old C# you had to build the whole theatre first — a namespace, a class, a <code>static void Main</code> — before anyone could say a line. <b>Top-level statements</b> are like a street performer: you just start talking, and the city quietly builds the stage around you. The stage still exists (the compiler generates a class and a <code>Main</code>), you just do not have to carry the bricks.</p>`,
    explain: R`<h4>🟢 Two ways to start a program</h4>
${H.table(['Style', 'What you write', 'When to use'], [
  ['Top-level statements (C# 9+)', 'statements directly in <code>Program.cs</code>', 'small tools, scripts, contest solutions, ASP.NET Core <code>Program.cs</code>'],
  ['Explicit <code>Main</code>', '<code>class Program { static void Main(string[] args) { … } }</code>', 'when you want a named class, several entry points, or older codebases']
])}
<p>Rules for top-level statements: only <b>one file</b> in a project may have them; they must come <b>before</b> any type declarations in that file; <code>args</code> (the command-line arguments) is available as a magic variable; <code>return 3;</code> sets the exit code; <code>await</code> may be used directly.</p>
<h4>Main signatures the runtime accepts</h4>
<pre>static void Main()                 static int Main()
static void Main(string[] args)    static int Main(string[] args)
static async Task Main()           static async Task&lt;int&gt; Main(string[] args)</pre>
<p>The <code>int</code> return is the <b>exit code</b>: 0 means success, anything else signals failure to the shell or CI.</p>
<h4>Namespaces and usings</h4>
<ul>
<li>A <b>namespace</b> groups types: <code>System.Collections.Generic.List&lt;T&gt;</code>. <b>File-scoped</b> namespaces (C# 10) save one level of indentation: <code>namespace Shop.Billing;</code></li>
<li><code>using System.Text;</code> lets you write <code>StringBuilder</code> instead of <code>System.Text.StringBuilder</code>.</li>
<li><code>global using</code> applies to every file. <b>Implicit usings</b> (on by default in new projects) add <code>System</code>, <code>System.IO</code>, <code>System.Linq</code>, <code>System.Collections.Generic</code>, <code>System.Net.Http</code>, <code>System.Threading</code> and <code>System.Threading.Tasks</code>.</li>
<li><code>using static System.Math;</code> imports static members: <code>Sqrt(2)</code> instead of <code>Math.Sqrt(2)</code>. <code>using Point = (int X, int Y);</code> (C# 12) aliases any type, even a tuple.</li>
</ul>`,
    clues: [
      '"Where is Main?" in a modern project → generated by the compiler from top-level statements',
      '"Return a non-zero exit code on failure" → <code>return 1;</code> or <code>Environment.Exit(1)</code>',
      '"CS0246: the type or namespace could not be found" → missing <code>using</code> or package reference',
      '"Only one compilation unit can have top-level statements" → CS8802',
      '"<code>args</code> without declaring it" → the implicit parameter of the generated Main'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Program.cs with top-level statements (runnable)', code: R`// Program.cs — top-level statements with args, exit code and a local function.
using static System.Math;

// With no arguments we fall back to a demo triangle instead of failing.
double a = args.Length > 0 ? double.Parse(args[0]) : 3;
double b = args.Length > 1 ? double.Parse(args[1]) : 4;
if (a < 0 || b < 0)
{
    Console.Error.WriteLine("sides must be non-negative");
    return 1;                                   // exit code 1 = failure
}
Console.WriteLine($"hypotenuse = {Hyp(a, b):F3}");
return 0;                                       // exit code 0 = success

// Local function: declared after the statements, usable before.
static double Hyp(double x, double y) => Sqrt(x * x + y * y);` },
      { lang: 'csharp', run: true, title: 'What the compiler generates (roughly)', code: R`using System;

// Top-level statements become a static method in a compiler-named class.
// Your code cannot name this class; "Program" is used here for illustration.
static class Program
{
    static int Main(string[] args)
    {
        Console.WriteLine($"args.Length = {args.Length}");
        return 0;
    }
}` }],
    codeTitle: ['Program.cs with top-level statements', 'The equivalent explicit Main (runnable)'],
    viz: {
      title: 'How top-level statements are lowered',
      gen: function () {
        var top = 'using static System.Math;\nif (args.Length == 0) return 1;\nvar r = Hyp(3, 4);\nConsole.WriteLine(r);\nreturn 0;\nstatic double Hyp(double x, double y)\n    => Sqrt(x * x + y * y);';
        var low = 'internal class Program\n{\n  private static int <Main>$(string[] args)\n  {\n    if (args.Length == 0) return 1;\n    var r = <<Main>$>g__Hyp|0_0(3, 4);\n    Console.WriteLine(r);\n    return 0;\n  }\n  static double <<Main>$>g__Hyp|0_0(double x, double y)\n    => Math.Sqrt(x * x + y * y);\n}';
        function L(h) { return { type: 'code', label: 'What Roslyn generates', lang: 'csharp', code: low, hl: h }; }
        function T(h) { return { type: 'code', label: 'What you wrote', lang: 'csharp', code: top, hl: h }; }
        return [
          fr('You write plain statements. No class, no <code>Main</code>.', [T({}), L({})]),
          fr('The compiler creates a class (named <code>Program</code>) and a method with an unspeakable name <code>&lt;Main&gt;$</code>. Because your code uses <code>return 1</code>, the return type is <code>int</code>.', [T({ 2: 'cur', 5: 'cur' }), L({ 1: 'ok', 3: 'ok' })]),
          fr('<code>args</code> is the method parameter, so <code>args.Length</code> just works.', [T({ 2: 'cur' }), L({ 3: 'ok', 5: 'ok' })]),
          fr('Your local function <code>Hyp</code> becomes a static method with a mangled name; the call is rewritten to it.', [T({ 3: 'cur', 6: 'cur', 7: 'cur' }), L({ 6: 'ok', 10: 'ok', 11: 'ok' })]),
          fr('<code>using static System.Math</code> made <code>Sqrt</code> resolve to <code>Math.Sqrt</code>. usings are compile-time only: they cost nothing at run time.', [T({ 1: 'cur', 7: 'cur' }), L({ 11: 'ok' })]),
          fr('Rule check: had you used <code>await</code>, the method would become <code>async Task&lt;int&gt;</code>. Without <code>return</code> values it would be <code>void</code>.', [T({}), L({ 3: 'sel' })])
        ];
      }
    },
    examples: [
      { title: 'Exit codes in a CI script', html: R`<p>A validator tool that returns <code>1</code> when a file is invalid lets a shell or CI step fail automatically: <code>dotnet run -- data.csv || echo "invalid"</code>. Everything after <code>--</code> goes to <code>args</code>.</p>` },
      { title: 'File-scoped namespace and a class below top-level code', html: R`<p>Types may follow the top-level statements in the same file, but not precede them. In other files you would normally use a file-scoped namespace:</p>`, code: R`namespace Shop.Billing;

public static class Tax
{
    public const decimal Rate = 0.18m;
    public static decimal Apply(decimal amount) => amount * (1 + Rate);
}` },
      { title: 'Alias any type (C# 12)', html: R`<p>C# 12 lets a <code>using</code> alias name tuples and arrays, which keeps contest code short and readable.</p>`, code: R`using Point = (int X, int Y);

class Geometry
{
    public static int Manhattan(Point a, Point b) => Math.Abs(a.X - b.X) + Math.Abs(a.Y - b.Y);
}` }
    ],
    deepDive: R`<h4>🟣 Details that bite</h4>
<ul>
<li><b>Name of the generated class.</b> Since C# 10 it is <code>Program</code> and is <code>internal</code>; tests for ASP.NET Core often add <code>public partial class Program { }</code> to make it visible to <code>WebApplicationFactory&lt;Program&gt;</code>.</li>
<li><b>Variables in top-level code are locals</b> of the generated method, not fields. A local function declared there captures them like any closure; mark it <code>static</code> to forbid capture.</li>
<li><b>Several Main methods</b> → error CS0017; choose one with <code>&lt;StartupObject&gt;</code> in the project file.</li>
<li><b>Unhandled exceptions</b> print a stack trace to stderr and exit with a non-zero code (on Linux the process aborts; <code>$?</code> is typically 134). Use <code>Environment.ExitCode</code> or <code>return</code> for controlled failure.</li>
<li><b>Global usings</b> live in any file (often <code>GlobalUsings.cs</code>) or in the project file as <code>&lt;Using Include="System.Text" /&gt;</code>. The SDK writes implicit ones into <code>obj/…GlobalUsings.g.cs</code>.</li>
<li><b>Namespaces are not assemblies.</b> One assembly can contain many namespaces, and one namespace can span many assemblies (<code>System.Collections.Generic</code> does).</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> generated snippets often arrive as top-level code or as a full class; you must know both shapes to paste them into the right place. <b>Use AI as a partner:</b> "convert this explicit Main into top-level statements" or "why does CS8802 appear in my test project?". <b>Where AI goes wrong:</b> it puts top-level statements in two files, declares a class above the statements (CS8803), forgets that <code>args</code> is implicit, or adds <code>using</code> lines that implicit usings already include (harmless, but noisy). <b>What you must still own:</b> the entry-point rules, exit codes for automation, and how namespaces map to folders in your team's conventions.</p>`
  });

  /* ======================================================================
     TOPIC 3 — Built-in value types and their sizes
     ====================================================================== */
  topics.push({
    title: 'Built-in Types & Sizes: int, long, double, decimal, char, bool',
    analogy: R`<p>Types are <b>containers in a kitchen</b>. A <code>byte</code> is an egg cup (0–255), an <code>int</code> is a mug (about ±2.1 billion), a <code>long</code> is a bucket (about ±9.2 quintillion). <code>double</code> is a measuring jug with markings that get further apart the more you pour in — great for physics, slightly fuzzy for exact money. <code>decimal</code> is the pharmacist's scale: slower, but exact to the last cent. Pour a bucket into a mug and it overflows — C# usually spills silently unless you ask it to shout.</p>`,
    explain: R`<h4>🟢 Every size is fixed — on every platform</h4>
<p>Unlike C++, C# sizes do not depend on the operating system. An <code>int</code> is always 32 bits, a <code>long</code> always 64. Each keyword is an alias for a .NET struct.</p>
${H.table(['Keyword', '.NET type', 'Bytes', 'Range / precision', 'Literal'], [
  ['<code>sbyte</code> / <code>byte</code>', 'SByte / Byte', '1', '−128..127 / 0..255', '<code>(byte)200</code>'],
  ['<code>short</code> / <code>ushort</code>', 'Int16 / UInt16', '2', '−32,768..32,767 / 0..65,535', '<code>(short)5</code>'],
  ['<code>int</code> / <code>uint</code>', 'Int32 / UInt32', '4', '±2,147,483,647 (2<sup>31</sup>−1) / 0..4.29·10<sup>9</sup>', '<code>42</code>, <code>42u</code>'],
  ['<code>long</code> / <code>ulong</code>', 'Int64 / UInt64', '8', '±9.22·10<sup>18</sup> / 0..1.8·10<sup>19</sup>', '<code>42L</code>, <code>42UL</code>'],
  ['<code>nint</code> / <code>nuint</code>', 'IntPtr / UIntPtr', '4 or 8', 'pointer-sized integer', '<code>(nint)5</code>'],
  ['<code>float</code>', 'Single', '4', '~6–9 significant digits', '<code>1.5f</code>'],
  ['<code>double</code>', 'Double', '8', '~15–17 significant digits', '<code>1.5</code>, <code>1e9</code>'],
  ['<code>decimal</code>', 'Decimal', '16', '28–29 significant <b>decimal</b> digits, exact for money', '<code>19.99m</code>'],
  ['<code>char</code>', 'Char', '2', 'one UTF-16 code unit, U+0000..U+FFFF', "<code>'A'</code>"],
  ['<code>bool</code>', 'Boolean', '1', '<code>true</code> / <code>false</code> (no conversion from int!)', '<code>true</code>']
])}
<h4>Choosing from the constraints</h4>
<ul>
<li>Values up to about 2·10<sup>9</sup> → <code>int</code>. Sums of 10<sup>5</sup> values of 10<sup>9</sup>, products of two ints, factorials → <code>long</code>.</li>
<li>Money, prices, invoices → <code>decimal</code> (0.1m + 0.2m == 0.3m is <b>true</b>; with <code>double</code> it is false).</li>
<li>Science, geometry, ML → <code>double</code>. <code>float</code> only to halve memory in big arrays or for GPU/graphics APIs.</li>
<li>Bigger than <code>ulong</code> → <code>System.Numerics.BigInteger</code>; 128-bit → <code>Int128</code> / <code>UInt128</code> (.NET 7+).</li>
</ul>
<h4>Conversions</h4>
<p><b>Implicit</b> (no cast) only when no information can be lost: <code>int → long → double</code>, <code>char → int</code>. <b>Explicit</b> casts are required to narrow: <code>(int)3.99</code> is <code>3</code> (truncation toward zero), <code>(byte)x</code> with <code>x = 300</code> at run time is <code>44</code> (keeps the low 8 bits; with the constant written directly, <code>(byte)300</code> is compile error CS0221 unless wrapped in <code>unchecked(...)</code>). <code>Convert.ToInt32(3.5)</code> rounds instead (to even: 4), and <code>int.Parse("42")</code> converts text.</p>`,
    clues: [
      '"N ≤ 10<sup>5</sup>, A[i] ≤ 10<sup>9</sup>, print the sum" → the sum needs <code>long</code>',
      '"money", "currency", "invoice total" → <code>decimal</code>, never <code>double</code>',
      '"Why does 0.1 + 0.2 != 0.3?" → binary floating point; use a tolerance or decimal',
      '"answer modulo 10<sup>9</sup>+7" → multiply in <code>long</code> before taking %',
      '"What is sizeof(char) in C#?" → 2 (UTF-16), unlike C/C++'
    ],
    code: [R`Console.WriteLine($"int    {sizeof(int)} bytes  {int.MinValue} .. {int.MaxValue}");
Console.WriteLine($"long   {sizeof(long)} bytes  {long.MinValue} .. {long.MaxValue}");
Console.WriteLine($"char   {sizeof(char)} bytes  (UTF-16 code unit)");
Console.WriteLine($"decimal {sizeof(decimal)} bytes");

double d = 0.1 + 0.2;
decimal m = 0.1m + 0.2m;
Console.WriteLine(d == 0.3);      // False: 0.30000000000000004
Console.WriteLine(m == 0.3m);     // True: decimal stores base-10 digits

int big = 2_000_000_000;          // digit separators for readability
long sum = (long)big + big;       // widen BEFORE adding
Console.WriteLine(sum);           // 4000000000
Console.WriteLine((int)3.99);     // 3  (truncate)
Console.WriteLine(unchecked((byte)300));   // 44 (300 - 256); a bare constant (byte)300 is error CS0221`],
    codeTitle: ['Sizes, ranges, floating point vs decimal'],
    viz: {
      title: 'Which type can hold this number?',
      input: '3000000000',
      inputLabel: 'An integer (up to 15 digits)',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,15}$/.test(t)) throw new Error('Enter an integer with at most 15 digits, e.g. 3000000000');
        var v = Number(t);
        var types = [['sbyte', -128, 127, 1, '-128', '127'], ['byte', 0, 255, 1, '0', '255'], ['short', -32768, 32767, 2, '-32768', '32767'], ['ushort', 0, 65535, 2, '0', '65535'], ['int', -2147483648, 2147483647, 4, '-2147483648', '2147483647'], ['uint', 0, 4294967295, 4, '0', '4294967295'], ['long', -Infinity, Infinity, 8, '-9223372036854775808', '9223372036854775807'], ['ulong', 0, Infinity, 8, '0', '18446744073709551615']];
        var frames = [], rows = [], best = null;
        frames.push(fr('We will try the value <b>' + t + '</b> against every integer type, smallest first. A type "fits" when min ≤ value ≤ max.', [tx('Value: <b>' + t + '</b>', 'Input')]));
        types.forEach(function (ty, i) {
          var ok = v >= ty[1] && v <= ty[2];
          if (ok && !best) best = ty[0];
          rows.push([ty[0], ty[3] + ' B', ty[4] + ' .. ' + ty[5], ok ? 'yes' : 'no']);
          var hl = {}; hl[i] = ok ? 'ok' : 'bad';
          var wrapped = '';
          if (!ok && ty[3] <= 4) {
            var w = wrap(v, ty[3] * 8, ty[1] < 0);
            wrapped = ' An unchecked cast <code>(' + ty[0] + ')</code> would keep only the low ' + (ty[3] * 8) + ' bits and give <b>' + w + '</b>; a <code>checked</code> cast throws <code>OverflowException</code>.';
          }
          frames.push(fr('<code>' + ty[0] + '</code>: range ' + ty[4] + ' .. ' + ty[5] + ' → ' + (ok ? '<span class="c-g">fits</span>.' : '<span class="c-r">does not fit</span>.') + wrapped, [{ type: 'table', label: 'Types tried so far', columns: ['type', 'size', 'range', 'fits?'], rows: rows.slice(), hl: hl }]));
        });
        frames.push(fr('Bit picture of the low 32 bits (two\'s complement). For <code>int</code> the top bit is the sign bit.', [{ type: 'bits', label: 'low 32 bits', value: wrap(v, 32, false), width: 32 }]));
        frames.push(fr('Smallest type that fits: <b>' + best + '</b>. In practice: use <code>int</code> by default, <code>long</code> as soon as values may pass about 2.1·10<sup>9</sup>, and <code>BigInteger</code> beyond <code>ulong</code>.', [{ type: 'table', label: 'Result', columns: ['type', 'size', 'range', 'fits?'], rows: rows }]));
        return frames;
      }
    },
    examples: [
      { title: 'Sum that overflows int', html: R`<p>Adding 100,000 values of 10<sup>9</sup> gives 10<sup>14</sup>, far above <code>int.MaxValue</code>. With <code>int sum</code> the result silently wraps to garbage; with <code>long sum</code> it is exact.</p>`, code: R`int[] a = Enumerable.Repeat(1_000_000_000, 100_000).ToArray();
int bad = 0; long good = 0;
foreach (int x in a) { bad += x; good += x; }
Console.WriteLine($"{bad} vs {good}");   // wrong negative/garbage vs 100000000000000` },
      { title: 'Money with decimal', html: R`<p>Three items at 0.10 each: <code>double</code> gives 0.30000000000000004, <code>decimal</code> gives 0.30. Banks, shops and tax code use <code>decimal</code>.</p>`, code: R`decimal price = 0.10m;
decimal total = price * 3;
Console.WriteLine(total);                 // 0.30
Console.WriteLine(0.1 * 3);               // 0.30000000000000004` },
      { title: 'char is a number too', html: R`<p><code>char</code> converts implicitly to <code>int</code>, which makes letter arithmetic easy: <code>'c' - 'a'</code> is 2. Going back needs a cast: <code>(char)('a' + 2)</code>.</p>`, code: R`char c = 'c';
int index = c - 'a';             // 2
char next = (char)(c + 1);       // 'd'
Console.WriteLine($"{index} {next} {(int)'A'}");   // 2 d 65` }
    ],
    deepDive: R`<h4>🟣 Precision, representation, performance</h4>
<ul>
<li><b>double</b> is IEEE 754 binary64: 1 sign bit, 11 exponent bits, 52 fraction bits. Integers up to 2<sup>53</sup> are exact; beyond that, gaps appear (2<sup>53</sup>+1 cannot be stored). Since .NET Core 3.0, <code>ToString()</code> prints the <b>shortest round-trippable</b> text, so you now see <code>0.30000000000000004</code>.</li>
<li><b>decimal</b> is a 96-bit integer plus a scale 0..28 (value = n / 10<sup>scale</sup>). It keeps trailing zeros (<code>1.50m</code> prints "1.50"), never produces NaN or Infinity, and throws <code>DivideByZeroException</code> / <code>OverflowException</code>. It is roughly 10–20× slower than double because it is done in software.</li>
<li><b>Floating-point division by zero does not throw</b>: <code>1.0 / 0</code> is <code>∞</code>, <code>0.0 / 0</code> is <code>NaN</code>, and <code>NaN == NaN</code> is false (use <code>double.IsNaN</code>). Integer division by zero throws <code>DivideByZeroException</code>.</li>
<li><b>Arithmetic promotion</b>: <code>byte + byte</code> is an <code>int</code>, so <code>byte c = a + b;</code> does not compile without a cast. All integer arithmetic happens in at least 32 bits.</li>
<li><b>Mixing signed and unsigned</b>: <code>int + uint</code> becomes <code>long</code>; <code>long + ulong</code> is a compile error (no common type). That is safer than C++'s silent conversion.</li>
<li><b>Generic math</b> (.NET 7+): <code>INumber&lt;T&gt;</code> lets you write <code>T Sum&lt;T&gt;(T[] a) where T : INumber&lt;T&gt;</code> once for all numeric types.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI writes the arithmetic quickly, but it often picks <code>int</code> by habit. <b>Use AI as a partner:</b> paste the constraints and ask "which variables need long, and why?", or ask it for values that overflow your solution. <b>Where AI goes wrong:</b> it uses <code>double</code> for money, compares doubles with <code>==</code>, writes <code>long x = a * b</code> with two ints (the multiplication overflows before widening), and assumes <code>char</code> is one byte. <b>What you must still own:</b> estimating maximum values from the constraints and choosing the type before writing the loop.</p>`
  });

  /* ======================================================================
     TOPIC 4 — var, const and readonly
     ====================================================================== */
  topics.push({
    title: 'var, const & readonly: Type Inference and Immutability',
    analogy: R`<p>A <b>label maker</b> at a storage room. <code>var</code> means "look at what I put in the box and print the label for me" — the label is still printed and glued on forever; you just did not type it. <code>const</code> is a <b>sign carved in stone</b> above the door: decided when the building was designed (compile time) and copied onto every map. <code>readonly</code> is a <b>sealed envelope</b>: you may write the contents once while setting up the room (in the constructor), but after that nobody can change it.</p>`,
    explain: R`<h4>🟢 var: the compiler infers the type</h4>
<p><code>var count = 10;</code> declares an <code>int</code>. The type is fixed at compile time — <code>count = "ten";</code> is a compile error. <code>var</code> is <b>not</b> JavaScript's <code>var</code> and not <code>dynamic</code>. It needs an initialiser (<code>var x;</code> does not compile) and works only for locals.</p>
${H.table(['Line', 'Inferred type'], [
  ['<code>var a = 5;</code>', '<code>int</code>'],
  ['<code>var b = 5L;</code>', '<code>long</code>'],
  ['<code>var c = 5.0;</code>', '<code>double</code>'],
  ['<code>var d = 5m;</code>', '<code>decimal</code>'],
  ['<code>var e = new List&lt;string&gt;();</code>', '<code>List&lt;string&gt;</code>'],
  ['<code>var f = (Name: "Asha", Age: 30);</code>', '<code>(string Name, int Age)</code>'],
  ['<code>var g = Console.ReadLine();</code>', '<code>string?</code> (may be null at end of input)']
])}
<p>Target-typed <code>new</code> (C# 9) is the mirror image: write the type on the left and let <code>new()</code> infer it — <code>List&lt;int&gt; xs = new();</code>. C# 12 <b>collection expressions</b> go further: <code>int[] a = [1, 2, 3];</code> and <code>List&lt;int&gt; b = [..a, 4];</code>.</p>
<h4>const vs readonly</h4>
${H.table(['', '<code>const</code>', '<code>readonly</code> field', '<code>static readonly</code>'], [
  ['Value known', 'at compile time', 'at run time (constructor)', 'at run time (static constructor)'],
  ['Allowed types', 'numbers, <code>bool</code>, <code>char</code>, <code>string</code>, enums, <code>null</code>', 'any', 'any'],
  ['Where', 'fields and locals', 'fields only', 'fields only'],
  ['Per object?', 'no (implicitly static)', 'yes, one per instance', 'no, one per type'],
  ['Example', '<code>const int MaxN = 100_000;</code>', '<code>readonly Guid _id = Guid.NewGuid();</code>', '<code>static readonly DateTime Start = DateTime.UtcNow;</code>']
])}
<p><b>Careful:</b> <code>readonly</code> protects the <b>variable</b>, not the object. <code>readonly List&lt;int&gt; xs</code> cannot be pointed to a new list, but <code>xs.Add(1)</code> still works. For true immutability use immutable types (records, <code>ImmutableArray&lt;T&gt;</code>, <code>IReadOnlyList&lt;T&gt;</code> views).</p>`,
    clues: [
      '"Should I use var?" → yes when the type is obvious from the right-hand side; no when it hides the type',
      '"Difference between const and readonly" → compile-time constant copied into callers vs run-time set-once field',
      '"Changing a public const in a library did not affect the app" → const values are baked into the caller\'s IL',
      '"readonly list but items still change" → readonly is shallow',
      '"var vs dynamic" → static inference vs run-time binding'
    ],
    code: [R`public class Config
{
    public const int MaxUsers = 1000;                       // compile-time, copied into callers
    public static readonly DateTime StartedAt = DateTime.UtcNow;  // set once when the type initialises
    private readonly string _name;                          // set once per object

    public Config(string name) { _name = name; }            // the only place it may be assigned

    public string Describe()
    {
        var limit = MaxUsers * 2;                           // var -> int
        var tags = new List<string> { "a", "b" };           // var -> List<string>
        tags.Add("c");                                      // fine: the list itself is mutable
        return $"{_name}: limit {limit}, tags {string.Join(",", tags)}";
    }
}`],
    codeTitle: ['const, static readonly, readonly and var together'],
    viz: {
      title: 'What the compiler infers and enforces',
      gen: function () {
        var code = 'const int Max = 100;\nvar n = 5;\nvar total = n * 2.5;\nvar name = "Ada";\nreadonly int[] data = [1, 2];  // field\ndata[0] = 9;\ndata = [3];\nn = "five";';
        return stepViz(code, [
          { l: 1, v: { Max: '100 (const int)' }, n: '<code>const</code>: the value 100 is known at compile time. Every use of <code>Max</code> is replaced by the literal 100 in the IL.' },
          { l: 2, v: { Max: '100 (const int)', n: '5 (int)' }, h: { n: 'ok' }, n: '<code>var n = 5</code>: the literal 5 is an <code>int</code>, so <code>n</code> is an <code>int</code> forever.' },
          { l: 3, v: { Max: '100 (const int)', n: '5 (int)', total: '12.5 (double)' }, h: { total: 'ok' }, n: '<code>int * double</code> is a <code>double</code>, so <code>total</code> is inferred as <code>double</code>.' },
          { l: 4, v: { Max: '100 (const int)', n: '5 (int)', total: '12.5 (double)', name: '"Ada" (string)' }, h: { name: 'ok' }, n: 'A string literal gives <code>string</code>.' },
          { l: 5, v: { data: '→ [1, 2] (int[])' }, h: { data: 'ok' }, n: 'A <code>readonly</code> field holding an array (collection expression). The <b>reference</b> is sealed once construction ends.' },
          { l: 6, c: 'ok', v: { data: '→ [9, 2]' }, h: { data: 'cur' }, n: 'Changing an element is allowed: <code>readonly</code> is shallow. The array object itself is mutable.' },
          { l: 7, c: 'bad', v: { data: '→ [9, 2]' }, h: { data: 'bad' }, n: '<span class="c-r">CS0191</span>: a readonly field cannot be assigned outside a constructor. The compiler stops you.' },
          { l: 8, c: 'bad', v: { n: '5 (int)' }, h: { n: 'bad' }, n: '<span class="c-r">CS0029</span>: cannot convert string to int. <code>var</code> did not make <code>n</code> dynamic; its type was fixed at line 2.' }
        ]);
      }
    },
    examples: [
      { title: 'The const versioning trap', html: R`<p>Library v1 has <code>public const int Timeout = 30;</code>. Your app compiles against it, so the IL contains the literal <code>30</code>. Library v2 changes it to 60 and you swap only the DLL: your app still uses 30 until it is recompiled. Expose values that may change as <code>static readonly</code> (or a property) instead.</p>` },
      { title: 'var where it helps and where it hurts', html: R`<p><code>var map = new Dictionary&lt;string, List&lt;int&gt;&gt;();</code> — the type is right there; <code>var</code> removes noise. <code>var result = Process(data);</code> — the reader cannot tell what <code>result</code> is; spell the type or rename the method.</p>`, code: R`var byLength = new Dictionary<int, List<string>>();     // obvious: good
foreach (var word in new[] { "hi", "yo", "hey" })
{
    if (!byLength.TryGetValue(word.Length, out var list))   // out var: inferred List<string>
        byLength[word.Length] = list = new List<string>();
    list.Add(word);
}
Console.WriteLine(byLength[2].Count);   // 2` },
      { title: 'const locals and constant folding', html: R`<p><code>const</code> also works inside a method. Expressions made only of constants are computed by the compiler: <code>const long Mod = 1_000_000_007; const long Sq = Mod * Mod;</code> is folded at compile time — and an overflowing constant expression is a compile error (CS0220) rather than a silent wrap.</p>`, code: R`const int Rows = 3, Cols = 4;
const int Cells = Rows * Cols;      // folded to 12 at compile time
int[] grid = new int[Cells];
Console.WriteLine(grid.Length);      // 12` }
    ],
    deepDive: R`<h4>🟣 Deeper</h4>
<ul>
<li><b>static readonly vs const performance.</b> After tier-1 JIT, a <code>static readonly</code> primitive is treated as a constant (the class is already initialised), so the "const is faster" argument mostly disappears in modern .NET.</li>
<li><b>readonly struct and in parameters.</b> <code>readonly</code> also applies to structs (<code>readonly struct Point</code>) and struct members, letting the compiler avoid defensive copies. Covered in the structs module.</li>
<li><b>Local immutability.</b> C# has no <code>final</code>/<code>let</code> for ordinary locals; <code>const</code> only works for compile-time values. <code>ref readonly</code> locals and <code>readonly</code> struct fields cover the advanced cases.</li>
<li><b>Inference corners.</b> <code>var x = null;</code> fails (no type). <code>var f = (int a) =&gt; a + 1;</code> works since C# 10 (natural type <code>Func&lt;int,int&gt;</code>). <code>var</code> in <code>foreach</code> over a non-generic <code>IEnumerable</code> gives <code>object</code>.</li>
<li><b>Style.</b> The .NET runtime's own style guide uses <code>var</code> only when the type is apparent; many teams enforce this with <code>.editorconfig</code> rules (<code>csharp_style_var_when_type_is_apparent</code>).</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> generated code uses <code>var</code> everywhere, which is fine for obvious types but can hide <code>double</code> vs <code>decimal</code> or <code>IEnumerable</code> vs <code>List</code> mistakes. <b>Use AI as a partner:</b> ask "list every var in this method with its inferred type" when reviewing. <b>Where AI goes wrong:</b> it marks a public library value as <code>const</code> that will change later, or claims <code>readonly</code> makes a collection immutable. <b>What you must still own:</b> deciding which values are true constants, which are set-once, and which data must be deeply immutable.</p>`
  });

  /* ======================================================================
     TOPIC 5 — Strings, interpolation and formatting
     ====================================================================== */
  topics.push({
    title: 'String Interpolation & Formatting: $"", Format Specifiers, Culture',
    analogy: R`<p>A <b>mail-merge letter</b>: "Dear {name}, your balance is {amount}". Interpolation fills the holes. The <b>format specifier</b> is the instruction next to each hole — "amount as money with 2 decimals", "date as year-month-day". And <b>culture</b> is the country the letter is printed in: in the US the number reads 1,234.50, in Germany 1.234,50. Same value, different printing — and a program that reads the German text back as US text gets a very wrong number.</p>`,
    explain: R`<h4>🟢 Interpolated strings</h4>
<p>Put <code>$</code> before the quote and expressions in braces: <code>$"{name} is {age} years old"</code>. Inside the braces you may add <b>alignment</b> and a <b>format</b>: <code>{value,8:F2}</code> means right-align in 8 characters, 2 decimals. A negative alignment left-aligns: <code>{name,-10}</code>.</p>
${H.table(['Specifier', 'Example', 'Output (invariant culture)'], [
  ['<code>F2</code> fixed-point', '<code>$"{3.14159:F2}"</code>', '3.14'],
  ['<code>N0</code> / <code>N2</code> with group separators', '<code>$"{1234567.891:N2}"</code>', '1,234,567.89'],
  ['<code>D5</code> zero-padded integer', '<code>$"{42:D5}"</code>', '00042'],
  ['<code>X</code> / <code>x8</code> hexadecimal', '<code>$"{255:X}"</code>, <code>$"{255:x8}"</code>', 'FF, 000000ff'],
  ['<code>E3</code> scientific', '<code>$"{12345.678:E3}"</code>', '1.235E+004'],
  ['<code>P1</code> percent', '<code>$"{0.256:P1}"</code>', '25.6 %'],
  ['custom', '<code>$"{7:00}"</code>, <code>$"{1234.5:#,0.00}"</code>', '07, 1,234.50'],
  ['dates', '<code>$"{d:yyyy-MM-dd}"</code>', '2026-10-25']
])}
<h4>Other string literal forms</h4>
<ul>
<li><b>Verbatim</b> <code>@"C:\temp\new"</code>: backslashes are literal; <code>""</code> is one quote.</li>
<li><b>Raw string literals</b> (C# 11) <code>"""…"""</code>: any characters, including quotes and newlines, no escaping. With <code>$$"""…"""</code> you interpolate with <code>{{x}}</code> so single braces stay literal (handy for JSON).</li>
<li><b>Escapes</b> in normal strings: <code>\n</code>, <code>\t</code>, <code>\\</code>, <code>\"</code>, <code>\u00e9</code>.</li>
</ul>
<h4>Culture: the silent bug</h4>
<p>Interpolation and <code>ToString()</code> use the <b>current culture</b> of the thread. On a machine set to German, <code>$"{1.5}"</code> prints <code>1,5</code> and <code>double.Parse("1.5")</code> returns 15 or throws. For files, logs, protocols and contest output always use the <b>invariant culture</b>:</p>
<pre>string s = string.Create(CultureInfo.InvariantCulture, $"{x:F2}");
string t = x.ToString("F2", CultureInfo.InvariantCulture);
double y = double.Parse(text, CultureInfo.InvariantCulture);</pre>
<p>Or set it once at startup: <code>CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;</code> (plus <code>CultureInfo.CurrentCulture</code> for the current thread).</p>`,
    clues: [
      '"print with exactly 2 decimal places" → <code>{x:F2}</code> or <code>x.ToString("F2", CultureInfo.InvariantCulture)</code>',
      '"works on my machine, wrong number in production (Europe)" → culture-dependent parsing/formatting',
      '"align columns in a report" → alignment component <code>{name,-12}{price,10:F2}</code>',
      '"embed JSON in a string" → raw string literal <code>"""…"""</code> / <code>$$"""…"""</code>',
      '"leading zeros" → <code>D</code> specifier or custom <code>"000"</code>'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Formatting playground (runnable)', code: R`using System;
using System.Globalization;

class Program
{
    static void Main()
    {
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;   // predictable output
        string item = "Coffee"; decimal price = 3.5m; int qty = 12;
        Console.WriteLine($"{item,-10}|{qty,5}|{price * qty,10:F2}|");   // Coffee    |   12|     42.00|
        Console.WriteLine($"{255:X} {255:x4} {42:D6} {0.256:P1}");      // FF 00ff 000042 25.6 %
        Console.WriteLine($"{1234567.891:N2} {12345.678:E3}");          // 1,234,567.89 1.235E+004
        string json = $$"""{"item": "{{item}}", "qty": {{qty}}}""";     // raw + interpolation
        Console.WriteLine(json);
        var de = new CultureInfo("de-DE");
        Console.WriteLine(1234.5.ToString("N2", de));                  // 1.234,50 when ICU data is present
    }
}` }],
    codeTitle: ['Alignment, specifiers, raw strings, cultures'],
    viz: {
      title: 'Format a number with different specifiers',
      input: '1234.5678',
      inputLabel: 'A number',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,12}(\.\d{1,8})?$/.test(t)) throw new Error('Enter a number like 1234.5678 (up to 12 digits before the point)');
        var x = Number(t);
        function group(s) { var neg = s[0] === '-'; if (neg) s = s.slice(1); var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return (neg ? '-' : '') + p.join('.'); }
        function fixedAway(v, d) { var f = Math.pow(10, d); var r = Math.sign(v) * Math.round(Math.abs(v) * f + 1e-9) / f; return r.toFixed(d); }
        var rows = [], frames = [];
        var specs = [
          ['{x}', String(x), 'default: shortest text that round-trips'],
          ['{x:F2}', fixedAway(x, 2), 'fixed-point, 2 decimals (rounds half away from zero)'],
          ['{x:F0}', fixedAway(x, 0), 'no decimals'],
          ['{x:N2}', group(fixedAway(x, 2)), 'group separators every 3 digits'],
          ['{x,12:F1}', ('            ' + fixedAway(x, 1)).slice(-Math.max(12, fixedAway(x, 1).length)).replace(/ /g, '·'), 'right-aligned in 12 chars (· = space)'],
          ['{x,-12:F1}|', (fixedAway(x, 1) + '            ').slice(0, Math.max(12, fixedAway(x, 1).length)).replace(/ /g, '·') + '|', 'left-aligned in 12 chars'],
          ['{(long)x:D8}', (function () { var n = Math.trunc(x); var s = String(Math.abs(n)); while (s.length < 8) s = '0' + s; return (n < 0 ? '-' : '') + s; })(), 'cast truncates, then zero-pads to 8 digits'],
          ['{(long)x:X}', (function () { var n = Math.trunc(x); return n >= 0 ? n.toString(16).toUpperCase() : '(two\'s complement of ' + n + ')'; })(), 'hexadecimal of the integer part']
        ];
        frames.push(fr('The value <b>' + esc(t) + '</b> is stored as a <code>double</code>. Formatting never changes the value, only the text produced.', [vp({ x: t + ' (double)' })]));
        specs.forEach(function (sp, i) {
          rows.push(['<code>' + esc(sp[0]) + '</code>', '<code>' + esc(sp[1]) + '</code>', sp[2]]);
          var hl = {}; hl[i] = 'cur';
          frames.push(fr('<code>$"' + esc(sp[0]) + '"</code> → <b>' + esc(sp[1]) + '</b>: ' + sp[2] + '.', [{ type: 'table', label: 'Invariant culture results', columns: ['hole', 'text', 'meaning'], rows: rows.slice(), hl: hl }]));
        });
        var de = group(fixedAway(x, 2)).replace(/,/g, '#').replace('.', ',').replace(/#/g, '.');
        frames.push(fr('Same <code>{x:N2}</code> under the German culture (de-DE): <b>' + de + '</b>. Separators swap. That is why files and protocols must use <code>CultureInfo.InvariantCulture</code>.', [{ type: 'table', label: 'Culture comparison', columns: ['culture', '{x:N2}'], rows: [['Invariant / en-US', group(fixedAway(x, 2))], ['de-DE', de]], hl: { 1: 'bad' } }]));
        return frames;
      }
    },
    examples: [
      { title: 'A receipt with aligned columns', html: R`<p>Left-align names and right-align numbers so the decimal points line up:</p>`, code: R`var lines = new (string Name, decimal Price)[] { ("Tea", 2.5m), ("Sandwich", 6.25m) };
foreach (var (name, price) in lines)
    Console.WriteLine($"{name,-10}{price,8:F2}");
// Tea           2.50
// Sandwich      6.25` },
      { title: 'Parsing user numbers safely', html: R`<p><code>double.Parse("3.5")</code> works in en-US but fails or misreads in cultures that use a comma. Pass the culture explicitly, and use <code>TryParse</code> for user input so bad text does not throw.</p>`, code: R`using System.Globalization;

string text = "3.5";
if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out double v))
    Console.WriteLine(v * 2);    // 7
else
    Console.WriteLine("not a number");` },
      { title: 'Raw string literal for JSON and regex', html: R`<p>No more doubled backslashes or escaped quotes. The closing <code>"""</code> sets the indentation that is removed from every line.</p>`, code: R`string pattern = """\d{3}-\d{4}""";             // regex without escaping
string body = """
    {
      "name": "Ada",
      "tags": ["math", "code"]
    }
    """;
Console.WriteLine(pattern.Length + body.Length);` }
    ],
    deepDive: R`<h4>🟣 How interpolation is compiled</h4>
<ul>
<li>Since C# 10, <code>$"..."</code> assigned to <code>string</code> is lowered to <code>DefaultInterpolatedStringHandler</code>: a <code>ref struct</code> that appends each part into a pooled buffer with no boxing of value types and no intermediate strings. Older C# used <code>string.Format</code> with <code>object[]</code> (boxing every int).</li>
<li><b>Custom handlers</b> let APIs avoid work entirely: <code>Debug.Assert(cond, $"...")</code> and logging libraries skip building the string when it is not needed.</li>
<li>If all holes are constant strings, <code>const string s = $"{A}-{B}";</code> is allowed (C# 10).</li>
<li><b>Rounding in formatting.</b> Since .NET Core 3.0, numeric formatting is IEEE-correct: <code>F2</code> works on the exact binary value. 2.675 is really 2.67499999…, so <code>2.675.ToString("F2")</code> is "2.67" — not a bug. <code>Math.Round</code> uses banker's rounding (to even) by default; pass <code>MidpointRounding.AwayFromZero</code> for school rounding.</li>
<li><b>Invariant globalization mode</b> (<code>&lt;InvariantGlobalization&gt;true&lt;/InvariantGlobalization&gt;</code>, common in containers) removes ICU culture data: every culture behaves like invariant. Good for size; surprising if you expected localized output.</li>
<li><b>Composite format</b> (<code>string.Format("{0,-10}{1:F2}", a, b)</code>) is still used for resource strings and logging templates, where the format text comes from data rather than code.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI is excellent at producing format strings ("show 1234.5 as 1,234.50 €"). <b>Use AI as a partner:</b> ask for the exact specifier and then test it with two cultures. <b>Where AI goes wrong:</b> it forgets culture entirely (code that passes on a US laptop and fails on a European server), confuses <code>F</code> with <code>N</code>, writes <code>{x:0.00}</code> when it meant alignment, or builds logs with interpolation instead of message templates (<code>logger.LogInformation("User {Id}", id)</code>), losing structured logging. <b>What you must still own:</b> a rule that machine-readable text is always invariant, and knowing how rounding behaves for your money values.</p>`
  });

  /* ======================================================================
     TOPIC 6 — Console input and fast I/O
     ====================================================================== */
  topics.push({
    title: 'Console Input & Fast I/O: ReadLine, Split, Parse, Buffered Streams',
    analogy: R`<p>Reading input is like <b>unloading a delivery truck</b>. <code>Console.ReadLine()</code> hands you one box (a line) at a time — fine for a few boxes. For 200,000 boxes you want a <b>forklift</b>: a buffered <code>StreamReader</code> that grabs a whole pallet (64 KB) at once, and a parser that splits the pallet without unpacking every item into its own bag (no extra strings). Writing works the same: <code>Console.WriteLine</code> per line is a courier per letter; a buffered writer is one truck at the end of the day.</p>`,
    explain: R`<h4>🟢 The simple way</h4>
<pre>string? line = Console.ReadLine();          // null at end of input!
int n = int.Parse(line!);                   // "5" -> 5
int[] a = Console.ReadLine()!.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                             .Select(int.Parse).ToArray();</pre>
<ul>
<li><code>Console.ReadLine()</code> returns <code>string?</code>: <b>null</b> when input is exhausted. Loop with <code>while ((line = Console.ReadLine()) != null)</code>.</li>
<li><code>Split</code> with <code>StringSplitOptions.RemoveEmptyEntries</code> survives double spaces; <code>Split((char[]?)null, …)</code> splits on any whitespace, including tabs.</li>
<li><code>int.Parse</code> throws <code>FormatException</code> on bad text; <code>int.TryParse(s, out int v)</code> returns <code>false</code> instead.</li>
<li><code>Console.Read()</code> returns one character as an <code>int</code> (−1 at end); <code>Console.ReadKey()</code> is for interactive keyboards only.</li>
</ul>
<h4>🔵 The fast way (contests, big files)</h4>
${H.table(['Problem', 'Cause', 'Fix'], [
  ['Slow writes', '<code>Console.Out</code> autoflushes: every <code>WriteLine</code> is a system call', 'one <code>StreamWriter</code> on <code>Console.OpenStandardOutput()</code> with <code>AutoFlush = false</code>, flush at the end'],
  ['Slow reads', 'many small reads and one string per token', '<code>StreamReader</code> with a big buffer, or a byte-level token reader'],
  ['Garbage', '<code>Split</code> allocates an array plus a string per number', 'parse spans: <code>int.Parse(line.AsSpan(start, len))</code> or read bytes directly'],
  ['Many lines out', 'string concatenation in a loop', '<code>StringBuilder</code>, or write straight to the buffered writer']
])}
<p>A good default for 10<sup>5</sup>–10<sup>6</sup> numbers: read all of stdin once and walk through it, and write through one buffered writer. Remember to <b>flush</b> (or dispose the writer with <code>using</code>) or the output is lost.</p>`,
    clues: [
      '"N up to 2·10<sup>5</sup> lines of input" → buffered reader; avoid per-line <code>Console.WriteLine</code>',
      '"read until end of file" → loop until <code>ReadLine()</code> returns null',
      '"numbers may be separated by several spaces or newlines" → token reader, not line-based <code>Split(\' \')</code>',
      '"Time limit exceeded but the algorithm is O(N)" → I/O is the bottleneck',
      '"output is empty" with a custom writer → forgot <code>Flush()</code>'
    ],
    code: [R`using System.Text;

// A small, fast token reader: reads stdin in 64 KB chunks and parses integers from bytes.
public sealed class FastReader
{
    private readonly Stream _s = Console.OpenStandardInput();
    private readonly byte[] _buf = new byte[1 << 16];
    private int _len, _pos;

    private int Peek()
    {
        if (_pos == _len) { _len = _s.Read(_buf, 0, _buf.Length); _pos = 0; if (_len <= 0) return -1; }
        return _buf[_pos];
    }

    public long NextLong()
    {
        int c;
        while ((c = Peek()) != -1 && c <= ' ') _pos++;          // skip spaces and newlines
        bool neg = false;
        if (c == '-') { neg = true; _pos++; }
        long v = 0;
        while ((c = Peek()) >= '0' && c <= '9') { v = v * 10 + (c - '0'); _pos++; }
        return neg ? -v : v;
    }

    public int NextInt() => (int)NextLong();
}`, { lang: 'csharp', run: true, title: 'Buffered output pattern (runnable)', code: R`using System;
using System.IO;

class Program
{
    static void Main()
    {
        using var output = new StreamWriter(Console.OpenStandardOutput()) { AutoFlush = false };
        for (int i = 1; i <= 5; i++)
            output.WriteLine(i * i);       // goes to a buffer, not a system call
        // Dispose at the end of Main flushes everything.
    }
}` }],
    codeTitle: ['FastReader: byte-level integer parsing', 'Buffered writer'],
    viz: {
      title: 'Token reader walking through the input buffer',
      input: '3\n10  -4\n7',
      inputLabel: 'Raw stdin (use \\n for new lines)',
      gen: function (input) {
        var s = String(input).replace(/\\n/g, '\n');
        if (s.length > 40) throw new Error('Keep the input under 40 characters');
        if (!/^[\d\s-]*$/.test(s)) throw new Error('Only digits, spaces, minus signs and \\n');
        var chars = s.split('').map(function (c) { return c === '\n' ? '⏎' : c === ' ' ? '␣' : c; });
        var frames = [], pos = 0, tokens = [];
        frames.push(fr('The reader loads the bytes into its buffer in one system call. Then it walks with an index <code>_pos</code>, no strings created.', [{ type: 'array', label: 'buffer', values: chars, ptr: { 0: '_pos' } }, { type: 'queue', label: 'numbers parsed', items: [] }]));
        while (pos < s.length) {
          var skipStart = pos;
          while (pos < s.length && /\s/.test(s[pos])) pos++;
          if (pos > skipStart) {
            var hs = {}; for (var k = skipStart; k < pos; k++) hs[k] = 'done';
            var pp = {}; pp[Math.min(pos, s.length - 1)] = '_pos';
            frames.push(fr('Skip whitespace (bytes ≤ \' \'): spaces and newlines are all the same to a token reader.', [{ type: 'array', label: 'buffer', values: chars, hl: hs, ptr: pp }, { type: 'queue', label: 'numbers parsed', items: tokens.slice() }]));
          }
          if (pos >= s.length) break;
          var start = pos, neg = false, v = 0, steps = [];
          if (s[pos] === '-') { neg = true; pos++; }
          while (pos < s.length && /\d/.test(s[pos])) { v = v * 10 + (s.charCodeAt(pos) - 48); steps.push(v); pos++; }
          if (pos === start || (neg && pos === start + 1)) { pos++; continue; }
          var hl = {}; for (var j = start; j < pos; j++) hl[j] = 'cur';
          var val = neg ? -v : v; tokens.push(val);
          var p2 = {}; p2[start] = 'start';
          frames.push(fr('Digits: v = v·10 + digit → ' + steps.join(' → ') + (neg ? ', then negate' : '') + '. Token <b>' + val + '</b> parsed without allocating a string.', [{ type: 'array', label: 'buffer', values: chars, hl: hl, ptr: p2 }, { type: 'queue', label: 'numbers parsed', items: tokens.slice(), hl: (function () { var h = {}; h[tokens.length - 1] = 'ok'; return h; })() }, vp({ v: val, _pos: pos })]));
        }
        frames.push(fr('End of buffer: <code>Read</code> returns 0 so <code>Peek</code> gives −1. Parsed ' + tokens.length + ' numbers: the first one is typically N, the count of the rest.', [{ type: 'queue', label: 'numbers parsed', items: tokens.slice() }]));
        return frames;
      }
    },
    examples: [
      { title: 'Read until end of input', html: R`<p>Sum every number on every line, however many lines there are:</p>`, code: R`long total = 0;
string? line;
while ((line = Console.ReadLine()) != null)
    foreach (var tok in line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
        total += long.Parse(tok);
Console.WriteLine(total);` },
      { title: 'The classic N then N numbers', html: R`<p>Input <code>5</code> on the first line and five numbers on the second. Reading all of stdin and splitting on whitespace makes the line layout irrelevant.</p>`, code: R`string[] t = Console.In.ReadToEnd().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
int n = int.Parse(t[0]);
long best = long.MinValue;
for (int i = 1; i <= n; i++) best = Math.Max(best, long.Parse(t[i]));
Console.WriteLine(best);` },
      { title: 'Why Console.WriteLine in a loop is slow', html: R`<p>Printing 10<sup>6</sup> lines with <code>Console.WriteLine</code> can take several seconds because <code>Console.Out</code> flushes every call. Through one <code>StreamWriter</code> with <code>AutoFlush = false</code> it takes a fraction of a second. Same output, one buffer.</p>` }
    ],
    deepDive: R`<h4>🟣 Under the hood</h4>
<ul>
<li><code>Console.In</code> is a synchronized <code>TextReader</code> and <code>Console.Out</code> a synchronized, autoflushing <code>TextWriter</code>: thread-safe but slow per call. <code>Console.OpenStandardInput/Output</code> give the raw <code>Stream</code>.</li>
<li><b>Encoding.</b> <code>StreamReader</code> decodes UTF-8 into UTF-16 chars; a byte-level reader skips that work entirely, which is why it is the fastest choice for ASCII digits.</li>
<li><b>Span parsing.</b> <code>int.Parse(ReadOnlySpan&lt;char&gt;)</code> and <code>MemoryExtensions.Split</code> (.NET 8: <code>span.Split(ranges, ' ')</code>) parse without allocating substrings. <code>Utf8Parser.TryParse</code> parses directly from bytes.</li>
<li><b>Redirected input</b> (<code>dotnet run &lt; in.txt</code>) is a file or pipe; <code>Console.KeyAvailable</code> and <code>ReadKey</code> throw there. Check <code>Console.IsInputRedirected</code> for interactive tools.</li>
<li><b>Trailing newline &amp; CRLF.</b> Windows files end lines with <code>\r\n</code>; <code>ReadLine</code> strips both, but <code>Split('\n')</code> leaves <code>\r</code> at the end of tokens, which makes <code>int.Parse</code> fail. Prefer whitespace splitting.</li>
<li><b>stderr</b> (<code>Console.Error</code>) is unbuffered and separate: debug prints there never pollute judged output.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI can write a fast reader template in seconds. <b>Use AI as a partner:</b> ask it to benchmark three reading strategies on a generated 10<sup>6</sup>-number file and explain the difference. <b>Where AI goes wrong:</b> it parses with <code>Split(' ')</code> and breaks on double spaces or tabs, forgets the null check at end of input, forgets <code>Flush()</code> on a custom writer, or handles <code>-</code> signs incorrectly in hand-rolled parsers. <b>What you must still own:</b> recognising when I/O dominates the run time and choosing a reading strategy that matches the input format.</p>`
  });

  /* ======================================================================
     TOPIC 7 — Checked arithmetic and overflow
     ====================================================================== */
  topics.push({
    title: 'Overflow & checked Arithmetic: Wraparound, OverflowException, Math Traps',
    analogy: R`<p>A <b>car odometer</b> with 6 digits shows 999,999 and then rolls over to 000,000. Nothing warns you; the car just looks brand new. C# integer arithmetic is an odometer by default: <code>int.MaxValue + 1</code> becomes <code>int.MinValue</code>. A <code>checked</code> block is an odometer with an <b>alarm</b>: the moment it would roll over, it stops the car (throws <code>OverflowException</code>) so you notice.</p>`,
    explain: R`<h4>🟢 Default: unchecked, silent wraparound</h4>
<p>Integer arithmetic in C# is <b>unchecked</b> by default: the result keeps only the low 32 (or 64) bits. This is well-defined (no undefined behaviour as in C++), but it is almost never what you want.</p>
<pre>int x = int.MaxValue;   // 2147483647
x++;                    // -2147483648, no error</pre>
<h4>checked: overflow becomes an exception</h4>
<pre>checked { int y = int.MaxValue; y++; }       // OverflowException
int z = checked(a * b);                       // expression form
int w = unchecked(a * b);                     // force wrapping (hash codes)</pre>
<p>Enable checking for a whole project with <code>&lt;CheckForOverflowUnderflow&gt;true&lt;/CheckForOverflowUnderflow&gt;</code> (many teams turn it on for Debug builds).</p>
<p>All operands below are run-time values held in variables (with constants the compiler reports the problem itself):</p>
${H.table(['Operation', 'unchecked (default)', 'checked'], [
  ['<code>x + 1</code> with x = int.MaxValue', 'wraps to −2147483648', '<code>OverflowException</code>'],
  ['<code>(int)v</code> with long v = 3_000_000_000', '−1294967296 (low 32 bits)', '<code>OverflowException</code>'],
  ['<code>(byte)x</code> with x = 300', '44', '<code>OverflowException</code>'],
  ['<code>(int)d</code> with double d = 1e10', 'unspecified value', '<code>OverflowException</code>'],
  ['<code>x / y</code> with int y = 0', '<code>DivideByZeroException</code>', 'same'],
  ['<code>x / y</code> with x = int.MinValue, y = −1', '<code>OverflowException</code> on .NET', 'same'],
  ['<code>Math.Abs(int.MinValue)</code>', '<code>OverflowException</code>', 'same'],
  ['<code>1.0 / 0</code> (double)', '<code>∞</code>, never throws', 'same'],
  ['<code>decimal.MaxValue + 1</code>', '<code>OverflowException</code> (decimal always checks)', 'same']
])}
<p>Constant expressions are always checked by the compiler: <code>int k = int.MaxValue + 1;</code> is error CS0220, so the trap only appears with run-time values.</p>
<h4>Safe patterns</h4>
<ul>
<li><b>Widen first</b>: <code>long p = (long)a * b;</code> not <code>long p = a * b;</code> (the latter multiplies in <code>int</code> and then widens the garbage).</li>
<li><b>Check before</b>: <code>if (a &gt; int.MaxValue - b) …</code> for <code>a, b ≥ 0</code>.</li>
<li><b>Midpoint</b>: <code>lo + (hi - lo) / 2</code> instead of <code>(lo + hi) / 2</code>.</li>
<li><b>Modular arithmetic</b>: keep values below the modulus and multiply in <code>long</code>: <code>(a * b) % Mod</code> with <code>long a, b &lt; 10<sup>9</sup>+7</code>.</li>
<li>Exact big values: <code>Math.BigMul</code>, <code>Int128</code>, <code>BigInteger</code>.</li>
</ul>`,
    clues: [
      '"result may exceed 32-bit range" → long, or checked to detect it',
      '"return 0 if the reversed integer overflows" → check against <code>int.MaxValue / 10</code> before multiplying',
      '"binary search mid" → <code>lo + (hi - lo) / 2</code>',
      '"hash code combining" → deliberately <code>unchecked</code> (or <code>HashCode.Combine</code>)',
      '"absolute value of the minimum int" → <code>Math.Abs</code> throws; widen to long'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Wraparound vs checked (runnable)', code: R`using System;

class Program
{
    static void Main()
    {
        int max = int.MaxValue;
        int wrapped = unchecked(max + 1);
        Console.WriteLine($"unchecked: {wrapped}");                 // -2147483648

        try
        {
            int boom = checked(max + 1);
            Console.WriteLine(boom);
        }
        catch (OverflowException e)
        {
            Console.WriteLine($"checked: {e.GetType().Name}");       // OverflowException
        }

        int a = 100_000, b = 100_000;
        long wrong = a * b;          // multiplied as int first: 1410065408
        long right = (long)a * b;    // 10000000000
        Console.WriteLine($"{wrong} vs {right}");

        int big = 300;
        Console.WriteLine((byte)big);                               // 44 (low 8 bits)
        Console.WriteLine(1.0 / 0);                                 // ∞
    }
}` }],
    codeTitle: ['Overflow behaviours side by side'],
    viz: {
      title: '32-bit addition: wrap or throw?',
      input: '2147483647 1',
      inputLabel: 'Two ints a b (each within the int range)',
      gen: function (input) {
        var p = String(input).trim().split(/[\s,]+/);
        if (p.length !== 2 || !p.every(function (x) { return /^-?\d{1,10}$/.test(x); })) throw new Error('Enter two integers, e.g. 2147483647 1');
        var a = Number(p[0]), b = Number(p[1]);
        if (a < -2147483648 || a > 2147483647 || b < -2147483648 || b > 2147483647) throw new Error('Both numbers must fit in int');
        var exact = a + b, w = wrap(exact, 32, true), over = exact !== w;
        var code = 'int a = ' + a + ', b = ' + b + ';\nint u = unchecked(a + b);\nint c = checked(a + b);';
        return [
          fr('Two ints. Each fits in 32 bits.', [cp(code, 1), { type: 'bits', label: 'a', value: wrap(a, 32, false), width: 32 }, { type: 'bits', label: 'b', value: wrap(b, 32, false), width: 32 }]),
          fr('The CPU adds the 32-bit patterns. The mathematically exact sum is <b>' + exact + '</b>' + (over ? ', which needs a 33rd bit.' : ', which fits.'), [cp(code, 2), vp({ 'exact sum': exact, 'int.MaxValue': 2147483647, 'int.MinValue': -2147483648 }, over ? { 'exact sum': 'bad' } : { 'exact sum': 'ok' })]),
          fr('<code>unchecked</code>: keep the low 32 bits only → <b>' + w + '</b>.' + (over ? ' The sign bit flipped: a positive overflow became negative (or the reverse).' : ''), [cp(code, 2, over ? 'bad' : 'ok'), { type: 'bits', label: 'u = low 32 bits', value: wrap(exact, 32, false), width: 32, hl: over ? { 31: 'bad' } : {} }, vp({ u: w }, { u: over ? 'bad' : 'ok' })]),
          fr(over ? '<code>checked</code>: the CPU overflow flag is set, so the JIT-emitted check throws <b>OverflowException</b>. The bad value never reaches <code>c</code>.' : '<code>checked</code>: no overflow, so <code>c</code> gets the same value ' + w + '. Checking costs one extra branch.', [cp(code, 3, over ? 'bad' : 'ok'), vp({ c: over ? 'OverflowException' : w }, { c: over ? 'bad' : 'ok' })]),
          fr('Fix when the sum can exceed the range: compute in <code>long</code>: <code>long s = (long)a + b;</code> = ' + exact + '.', [vp({ 's (long)': exact }, { 's (long)': 'ok' })])
        ];
      }
    },
    examples: [
      { title: 'Average of two large ints', html: R`<p><code>(a + b) / 2</code> overflows when both are near <code>int.MaxValue</code>. <code>a + (b - a) / 2</code> stays in range when <code>a ≤ b</code>, or simply compute in <code>long</code>.</p>`, code: R`int a = 2_000_000_000, b = 2_100_000_000;
Console.WriteLine((a + b) / 2);            // negative garbage
Console.WriteLine(a + (b - a) / 2);        // 2050000000
Console.WriteLine(((long)a + b) / 2);      // 2050000000` },
      { title: 'Detecting overflow in a running product', html: R`<p>Wrap the risky multiplication in <code>checked</code> and catch the exception to report it.</p>`, code: R`static string Product(long[] xs)
{
    long p = 1;
    try { foreach (var x in xs) p = checked(p * x); }
    catch (OverflowException) { return "OVERFLOW"; }
    return p.ToString();
}` },
      { title: 'Intentional wrapping for hashes', html: R`<p>Hash functions multiply and add on purpose past the range. Mark them <code>unchecked</code> so they keep working in projects that enable overflow checking globally.</p>`, code: R`static int Fnv1a(string s)
{
    unchecked
    {
        uint h = 2166136261;
        foreach (char ch in s) { h ^= ch; h *= 16777619; }
        return (int)h;
    }
}` }
    ],
    deepDive: R`<h4>🟣 Costs and corners</h4>
<ul>
<li><b>Cost.</b> <code>checked</code> adds a <code>jo</code> (jump-if-overflow) after the instruction; in tight loops it can block vectorisation, so libraries often check once at the boundaries instead of per operation.</li>
<li><b>Scope.</b> <code>checked</code> affects only code <i>lexically</i> inside the block; methods you call keep their own setting.</li>
<li><b>Increment of byte/short</b>: <code>b++</code> on a <code>byte</code> 255 wraps to 0 (unchecked) — compound operators include an implicit cast back.</li>
<li><b>double → int in unchecked context</b>: values out of range or NaN give an unspecified result (it differs between CPUs and .NET versions; .NET 9 standardised saturation on x86/x64). Never rely on it — clamp first or use <code>checked</code>.</li>
<li><b>Overflow-safe helpers</b>: <code>Math.Clamp</code>, <code>int.CreateChecked(x)</code> / <code>CreateSaturating</code> / <code>CreateTruncating</code> (generic math), <code>Math.BigMul(a, b, out low)</code> for 128-bit products of 64-bit values.</li>
<li><b>User-defined checked operators</b> (C# 11): a type can provide both <code>operator +</code> and <code>operator checked +</code>, so <code>checked</code> works for your own numeric types too.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI writes arithmetic fast but rarely adds overflow guards unless asked. <b>Use AI as a partner:</b> ask "find every expression in this method that can overflow for the given constraints" — it is good at listing candidates. <b>Where AI goes wrong:</b> <code>long x = a * b</code> with int operands, <code>Math.Abs(int.MinValue)</code>, <code>(lo + hi) / 2</code>, and claiming integer overflow throws by default (it does not). <b>What you must still own:</b> estimating ranges from constraints, deciding where checks belong, and writing a test with the boundary values (<code>int.MaxValue</code>, <code>int.MinValue</code>, 0, −1).</p>`
  });

  /* ---------- guided problems ---------- */
  topics[2].problems = [{
    title: 'Sum of N Large Numbers',
    level: 'Easy', tags: ['types', 'long', 'overflow'], companies: ['Microsoft', 'Infosys', 'TCS'],
    statement: R`<p>The first input line holds <code>N</code>. The next tokens are <code>N</code> integers (on one or more lines). Print their exact sum.</p>`,
    constraints: R`0 ≤ N ≤ 2·10<sup>5</sup>, |A[i]| ≤ 10<sup>9</sup>. Numbers are separated by any whitespace.`,
    example: R`<p>Input <code>3</code> / <code>1000000000 1000000000 1000000000</code> → <span class="c-g">3000000000</span>. An <code>int</code> accumulator would print <span class="c-r">-1294967296</span>, because 3·10<sup>9</sup> is larger than <code>int.MaxValue</code> (2,147,483,647).</p>`,
    brute: { why: R`<p>The algorithm is already O(N); the "naive" bug is the <b>type</b>. Summing into an <code>int</code> wraps silently once the total passes 2,147,483,647. A second naive mistake is reading line by line with <code>Split(' ')</code>, which breaks when numbers span several lines or are separated by two spaces.</p>`, code: R`int n = int.Parse(Console.ReadLine()!);
int sum = 0;                                   // too small for 2e5 * 1e9
foreach (var t in Console.ReadLine()!.Split(' '))
    sum += int.Parse(t);
Console.WriteLine(sum);` },
    mcq: { q: 'What is the largest possible |sum| under the constraints?', options: ['About 2·10<sup>9</sup>: int is enough', 'About 2·10<sup>14</sup>: long is needed', 'About 10<sup>20</sup>: BigInteger is needed', 'It depends on N only'], answer: 1, explain: '2·10<sup>5</sup> numbers × 10<sup>9</sup> = 2·10<sup>14</sup>. long holds up to about 9.2·10<sup>18</sup>, so long is enough and BigInteger is unnecessary.' },
    hints: [
      R`<p>Hint 1: estimate the worst case before you write code: count × largest value = 2·10<sup>14</sup>.</p>`,
      R`<p>Hint 2: <code>long</code> holds about ±9.2·10<sup>18</sup>, and an <code>int</code> added to a <code>long</code> is widened automatically.</p>`,
      R`<p>Hint 3: read all of stdin and split on any whitespace, so line breaks do not matter. N may be 0: then print 0.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '3\n1 2 3\n', stdout: '6' },
      { stdin: '1\n-5\n', stdout: '-5' },
      { stdin: '2\n1000000000 1000000000\n', stdout: '2000000000' },
      { stdin: '3\n1000000000 1000000000\n1000000000\n', stdout: '3000000000' },
      { stdin: '4\n-1000000000  -1000000000 -1000000000 -1000000000\n', stdout: '-4000000000' },
      { stdin: '0\n', stdout: '0' },
      { stdin: '5\n7 -7 3 -3 0\n', stdout: '0' },
      { stdin: { $concat: ['200000\n', { $rep: '1000000000 ', n: 200000 }] }, stdout: '200000000000000' }
    ] },
    solution: {
      approach: R`<p>Read every token at once, accumulate into a <code>long</code>. The token split makes the input layout irrelevant, and <code>long</code> covers the 2·10<sup>14</sup> worst case with lots of room.</p>`,
      code: R`string[] tok = Console.In.ReadToEnd().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
int n = int.Parse(tok[0]);
long sum = 0;                                  // 64-bit accumulator
for (int i = 1; i <= n; i++)
    sum += int.Parse(tok[i]);                  // int widened to long before the add
Console.WriteLine(sum);`,
      dry: { head: ['token', 'value', 'sum (long)', 'sum if it were int'], rows: [['1', '1000000000', '1000000000', '1000000000'], ['2', '1000000000', '2000000000', '2000000000'], ['3', '1000000000', '3000000000', '<span class="c-r">-1294967296</span>']] },
      complexity: R`<p>O(N) time; O(N) memory for the token array (a streaming reader would make it O(1)).</p>`,
      followUps: ['Print the sum modulo 10<sup>9</sup>+7 when values go up to 10<sup>18</sup>', 'Rewrite it with the byte-level FastReader from topic 6']
    }
  }];

  topics[5].problems = [{
    title: 'Line Sums Until End of Input',
    level: 'Easy', tags: ['console', 'ReadLine', 'EOF', 'parsing'], companies: ['Amazon', 'Wipro', 'Capgemini'],
    statement: R`<p>Read lines until the end of input. Each line contains zero or more integers separated by spaces or tabs (possibly several). For every line print the sum of its integers; an empty line prints <code>0</code>.</p>`,
    constraints: R`Up to 10<sup>4</sup> lines, up to 100 numbers per line, |value| ≤ 10<sup>9</sup>. The last line may or may not end with a newline.`,
    example: R`<p>Input <code>1 2 3⏎4⏎</code> → output <span class="c-g">6</span> and <span class="c-g">4</span> on two lines. After the second line <code>ReadLine()</code> returns <b>null</b>, which ends the loop.</p>`,
    brute: { why: R`<p>Reading a fixed number of lines (or assuming one line) misses data. <code>Split(' ')</code> without removing empty entries turns double spaces into empty strings and <code>int.Parse("")</code> throws <code>FormatException</code>; tabs are not split at all. An <code>int</code> sum overflows with three values of 10<sup>9</sup>.</p>`, code: R`string line = Console.ReadLine()!;
int s = 0;
foreach (var t in line.Split(' '))   // "10  5" gives an empty token -> FormatException
    s += int.Parse(t);
Console.WriteLine(s);` },
    mcq: { q: 'What does <code>Console.ReadLine()</code> return when there is no more input?', options: ['An empty string', '<code>null</code>', 'It throws <code>EndOfStreamException</code>', 'It blocks forever'], answer: 1, explain: 'At end of input ReadLine returns null (its type is string?). An empty line in the middle returns "" — so null and "" mean different things.' },
    hints: [
      R`<p>Hint 1: loop with <code>while ((line = Console.ReadLine()) != null)</code>.</p>`,
      R`<p>Hint 2: <code>line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)</code> splits on any whitespace and drops empty pieces.</p>`,
      R`<p>Hint 3: sum into a <code>long</code>; an empty line gives zero tokens, so the sum stays 0 automatically.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '1 2 3\n4\n', stdout: '6\n4' },
      { stdin: '10   -3\t5\n', stdout: '12' },
      { stdin: '5', stdout: '5' },
      { stdin: '1 1\n\n2 2\n', stdout: '2\n0\n4' },
      { stdin: '1000000000 1000000000 1000000000\n', stdout: '3000000000' },
      { stdin: '-1 -2\n-3\n', stdout: '-3\n-3' },
      { stdin: '', stdout: '' },
      { stdin: '  7  \n0 0 0\n', stdout: '7\n0' }
    ] },
    solution: {
      approach: R`<p>Read line by line until <code>null</code>; split each line on whitespace with empty entries removed; parse with <code>long.Parse</code> and print through a buffered writer.</p>`,
      code: R`using var output = new StreamWriter(Console.OpenStandardOutput());
string? line;
while ((line = Console.ReadLine()) != null)          // null = end of input
{
    long sum = 0;
    foreach (var tok in line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
        sum += long.Parse(tok);
    output.WriteLine(sum);                           // buffered; flushed when disposed
}`,
      dry: { head: ['ReadLine() returns', 'tokens', 'printed'], rows: [['"1 1"', '["1","1"]', '2'], ['""', '[]', '0'], ['"2 2"', '["2","2"]', '4'], ['null', '—', 'loop ends']] },
      complexity: R`<p>O(total characters) time; O(longest line) extra memory.</p>`,
      followUps: ['Also print the line number of the largest sum', 'Skip lines that contain a non-numeric token and count them']
    }
  }];

  topics[6].problems = [{
    title: 'Reverse an Integer Without Overflow',
    level: 'Medium', tags: ['overflow', 'math', 'int range'], companies: ['Microsoft', 'Bloomberg', 'Adobe', 'Apple'],
    statement: R`<p>Write <code>public int ReverseInt(int x)</code> in a class <code>Solution</code> that returns the digits of <code>x</code> reversed, keeping the sign. If the reversed value does not fit in a 32-bit <code>int</code>, return <code>0</code>. Pretend you cannot use <code>long</code>.</p>`,
    constraints: R`−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>123 → 321</code>, <code>-120 → -21</code>, <code>1534236469 → 0</code> because 9646324351 &gt; 2147483647.</p>`,
    brute: { why: R`<p>Reversing through a string and <code>int.Parse</code> works but throws <code>OverflowException</code> on large values and allocates. Doing the arithmetic in <code>int</code> without a guard silently wraps to a wrong number.</p>`, code: R`public class Brute
{
    public int ReverseInt(int x)
    {
        int r = 0;
        while (x != 0) { r = r * 10 + x % 10; x /= 10; }   // wraps silently on overflow
        return r;
    }
}` },
    mcq: { q: 'Before computing <code>r * 10 + d</code> with <code>r &gt; 0</code>, which test guarantees no overflow?', options: ['<code>r &lt; int.MaxValue</code>', '<code>r &gt; int.MaxValue / 10 || (r == int.MaxValue / 10 &amp;&amp; d &gt; 7)</code> means overflow', '<code>r * 10 &lt; int.MaxValue</code>', 'Wrap the expression in <code>unchecked</code>'], answer: 1, explain: 'int.MaxValue is 2147483647: 214748364 × 10 + 7. Any larger r, or r equal with a digit above 7, overflows. Option C itself overflows before comparing.' },
    hints: [
      R`<p>Hint 1: in C#, <code>x % 10</code> keeps the sign of <code>x</code> (−123 % 10 is −3), so the same loop handles negatives.</p>`,
      R`<p>Hint 2: check <i>before</i> multiplying: compare <code>r</code> with <code>int.MaxValue / 10</code> (214748364) and <code>int.MinValue / 10</code> (−214748364).</p>`,
      R`<p>Hint 3: alternatively use <code>checked(r * 10 + d)</code> and catch <code>OverflowException</code> — simple, but exceptions are slow on hot paths.</p>`
    ],
    tests: { sig: 'int -> int', fn: 'reverseInt', cases: [
      [[123], 321], [[-123], -321], [[120], 21], [[0], 0], [[1534236469], 0], [[2147483647], 0],
      [[-2147483648], 0], [[1463847412], 2147483641], [[-1463847412], -2147483641], [[1000000003], 0], [[7], 7]
    ] },
    solution: {
      approach: R`<p>Pop the last digit with <code>% 10</code>, push it onto the result with <code>* 10 +</code>. Before each push, compare against <code>int.MaxValue / 10</code> and <code>int.MinValue / 10</code> so the multiplication can never wrap.</p>`,
      code: R`public class Solution
{
    public int ReverseInt(int x)
    {
        const int Hi = int.MaxValue / 10, Lo = int.MinValue / 10;   // 214748364, -214748364
        int r = 0;
        while (x != 0)
        {
            int d = x % 10;                       // sign follows x
            x /= 10;
            if (r > Hi || (r == Hi && d > 7)) return 0;
            if (r < Lo || (r == Lo && d < -8)) return 0;
            r = r * 10 + d;
        }
        return r;
    }
}`,
      dry: { head: ['x', 'd', 'r before', 'guard', 'r after'], rows: [['1534236469', '9', '0', 'ok', '9'], ['…', '…', '…', '…', '964632435'], ['1', '1', '964632435', '<span class="c-r">964632435 &gt; 214748364</span>', 'return 0']] },
      complexity: R`<p>O(number of digits) = O(10) time, O(1) memory.</p>`,
      followUps: ['Solve it again with <code>checked</code> and compare the speed', 'Reverse a <code>long</code> with the same technique']
    }
  }];

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Hello, Name (with a Safe Default)',
    level: 'Easy', tags: ['console', 'strings', 'nullable'], companies: ['Infosys', 'Cognizant', 'Accenture'],
    statement: R`<p>Read one line containing a name and print <code>Hello, &lt;name&gt;!</code>. Trim spaces around the name. If there is no input at all, or the line is empty or only whitespace, print <code>Hello, World!</code>. Ignore any further lines.</p>`,
    constraints: R`At most one line is used; it has at most 100 characters.`,
    example: R`<p><code>"  Grace Hopper  "</code> → <span class="c-g">Hello, Grace Hopper!</span>. Empty input → <span class="c-g">Hello, World!</span> (here <code>ReadLine()</code> returned <b>null</b>).</p>`,
    brute: { why: R`<p><code>Console.ReadLine()!.Trim()</code> crashes with <code>NullReferenceException</code> on empty input, because the <code>!</code> only silences the compiler warning — it does not make the value non-null.</p>`, code: R`string name = Console.ReadLine()!.Trim();      // NullReferenceException when input is empty
Console.WriteLine("Hello, " + name + "!");` },
    mcq: { q: 'Which call treats null, "" and "   " the same way?', options: ['<code>string.IsNullOrEmpty(s)</code>', '<code>string.IsNullOrWhiteSpace(s)</code>', '<code>s == null</code>', '<code>s.Length == 0</code>'], answer: 1, explain: 'IsNullOrWhiteSpace returns true for null, empty and whitespace-only strings. IsNullOrEmpty misses "   ", and s.Length throws on null.' },
    hints: [
      R`<p>Hint 1: <code>ReadLine()</code> has type <code>string?</code> — the compiler is warning you it may be null.</p>`,
      R`<p>Hint 2: <code>string.IsNullOrWhiteSpace</code> covers all three "nothing" cases.</p>`,
      R`<p>Hint 3: use string interpolation for the output: <code>$"Hello, {name}!"</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: 'Ada\n', stdout: 'Hello, Ada!' },
      { stdin: '', stdout: 'Hello, World!' },
      { stdin: '   \n', stdout: 'Hello, World!' },
      { stdin: '  Grace Hopper  \n', stdout: 'Hello, Grace Hopper!' },
      { stdin: 'Bob\nAlice\n', stdout: 'Hello, Bob!' },
      { stdin: "O'Neil", stdout: "Hello, O'Neil!" }
    ] },
    solution: {
      approach: R`<p>Read the line as <code>string?</code>, fall back to <code>"World"</code> when it is null or blank, otherwise trim it. A conditional expression keeps it to one line.</p>`,
      code: R`string? line = Console.ReadLine();
string name = string.IsNullOrWhiteSpace(line) ? "World" : line.Trim();   // flow analysis: line is non-null here
Console.WriteLine($"Hello, {name}!");`,
      complexity: R`<p>O(L) for a line of length L.</p>`,
      followUps: ['Greet every line until end of input', 'Capitalise the first letter of each word']
    }
  });

  practice.push({
    title: 'Celsius to Fahrenheit: Integer Division and Culture',
    level: 'Easy', tags: ['integer division', 'double', 'formatting', 'culture'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: R`<p>Read an integer temperature <code>C</code> and print <code>F = C × 9 / 5 + 32</code> with exactly one digit after the decimal point, using a dot as the decimal separator on every machine.</p>`,
    constraints: R`−10<sup>6</sup> ≤ C ≤ 10<sup>6</sup>.`,
    example: R`<p><code>37</code> → <span class="c-g">98.6</span>. Integer arithmetic prints <span class="c-r">98</span> (333 / 5 = 66); <code>9 / 5 * c + 32</code> prints <span class="c-r">69</span> because <code>9 / 5</code> is 1. On a German machine <code>$"{f:F1}"</code> without a culture prints <span class="c-r">98,6</span>.</p>`,
    brute: { why: R`<p>All operands are <code>int</code>, so <code>/</code> is integer division and drops the fraction. Writing <code>9 / 5</code> first is worse: it becomes 1 before C is used.</p>`, code: R`int c = int.Parse(Console.ReadLine()!);
int f = 9 / 5 * c + 32;          // 9/5 == 1
Console.WriteLine(f);` },
    mcq: { q: 'Which expression gives 98.6 for C = 37?', options: ['<code>c * 9 / 5 + 32</code>', '<code>9 / 5 * c + 32</code>', '<code>c * 9.0 / 5 + 32</code>', '<code>(double)(c * 9 / 5) + 32</code>'], answer: 2, explain: 'One double operand (9.0) makes the multiplication and division floating-point. Casting after the integer division is too late.' },
    hints: [
      R`<p>Hint 1: the type of <code>a / b</code> depends only on the types of <code>a</code> and <code>b</code>.</p>`,
      R`<p>Hint 2: promote early: <code>c * 9.0 / 5 + 32</code>.</p>`,
      R`<p>Hint 3: format with <code>f.ToString("F1", CultureInfo.InvariantCulture)</code>. Check −40 → −40.0.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '37\n', stdout: '98.6' }, { stdin: '0\n', stdout: '32.0' }, { stdin: '-40\n', stdout: '-40.0' },
      { stdin: '100\n', stdout: '212.0' }, { stdin: '-273\n', stdout: '-459.4' }, { stdin: '1\n', stdout: '33.8' },
      { stdin: '-1\n', stdout: '30.2' }, { stdin: '1000000\n', stdout: '1800032.0' }, { stdin: '-1000000\n', stdout: '-1799968.0' }, { stdin: '36\n', stdout: '96.8' }
    ] },
    solution: {
      approach: R`<p>Convert to <code>double</code> before dividing, then format with one decimal under the invariant culture.</p>`,
      code: R`using System.Globalization;

long c = long.Parse(Console.ReadLine()!);
double f = c * 9.0 / 5.0 + 32.0;
Console.WriteLine(f.ToString("F1", CultureInfo.InvariantCulture));   // 37 -> 98.6`,
      complexity: R`<p>O(1): one multiplication, one division and one addition.</p>`,
      followUps: ['Use decimal instead of double: does the output change?', 'Print a conversion table from −40 to 100 in steps of 10']
    }
  });

  practice.push({
    title: 'Seconds to H:MM:SS',
    level: 'Easy', tags: ['integer division', 'modulo', 'format specifiers'], companies: ['Google', 'Uber'],
    statement: R`<p>Read a non-negative number of seconds and print it as <code>HH:MM:SS</code>. Minutes and seconds always have two digits; hours have at least two digits and may have more.</p>`,
    constraints: R`0 ≤ s ≤ 10<sup>12</sup> (does not fit in an int).`,
    example: R`<p><code>3661</code> → <span class="c-g">01:01:01</span>; <code>360000</code> → <span class="c-g">100:00:00</span>.</p>`,
    brute: { why: R`<p>Using <code>TimeSpan.FromSeconds(s).ToString()</code> prints days as <code>1.04:00:00</code> once hours pass 23, and <code>int.Parse</code> fails for 10<sup>12</sup>. Concatenating numbers without padding prints <code>1:1:1</code>.</p>`, code: R`long s = long.Parse(Console.ReadLine()!);
Console.WriteLine(TimeSpan.FromSeconds(s));    // 1.03:46:40 style once hours > 23` },
    mcq: { q: 'Which interpolation prints 7 as <code>07</code>?', options: ['<code>{x:F2}</code>', '<code>{x:D2}</code>', '<code>{x,2}</code>', '<code>{x:N2}</code>'], answer: 1, explain: 'D2 pads an integer with leading zeros to 2 digits. {x,2} pads with spaces, F2 and N2 add decimals.' },
    hints: [
      R`<p>Hint 1: hours = s / 3600, minutes = s % 3600 / 60, seconds = s % 60.</p>`,
      R`<p>Hint 2: the input can reach 10<sup>12</sup>, so it needs <code>long</code>, not int.</p>`,
      R`<p>Hint 3: <code>$"{h:D2}:{m:D2}:{sec:D2}"</code> — D2 is a minimum width, so 100 hours stays 100.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '0\n', stdout: '00:00:00' }, { stdin: '59\n', stdout: '00:00:59' }, { stdin: '3600\n', stdout: '01:00:00' },
      { stdin: '3661\n', stdout: '01:01:01' }, { stdin: '86399\n', stdout: '23:59:59' }, { stdin: '360000\n', stdout: '100:00:00' },
      { stdin: '45296\n', stdout: '12:34:56' }, { stdin: '1000000000000\n', stdout: '277777777:46:40' }
    ] },
    solution: {
      approach: R`<p>Integer division and remainder split the seconds; the <code>D2</code> specifier pads each part.</p>`,
      code: R`long s = long.Parse(Console.ReadLine()!);
long h = s / 3600, m = s % 3600 / 60, sec = s % 60;
Console.WriteLine($"{h:D2}:{m:D2}:{sec:D2}");`,
      complexity: R`<p>O(1): three divisions and a format call.</p>`,
      followUps: ['Parse "HH:MM:SS" back to seconds', 'Add a days part when hours ≥ 24']
    }
  });

  practice.push({
    title: 'Digit Sum of Any long',
    level: 'Easy', tags: ['long', 'modulo', 'Math.Abs trap'], companies: ['Amazon', 'Zoho'],
    statement: R`<p>Write <code>public int DigitSum(long n)</code> in class <code>Solution</code> that returns the sum of the decimal digits of <code>n</code>, ignoring the sign. It must work for every <code>long</code>, including <code>long.MinValue</code>.</p>`,
    constraints: R`<code>long.MinValue</code> ≤ n ≤ <code>long.MaxValue</code>.`,
    example: R`<p><code>-987</code> → 9 + 8 + 7 = <span class="c-g">24</span>. <code>long.MinValue</code> (−9223372036854775808) → <span class="c-g">89</span>, but <code>Math.Abs(long.MinValue)</code> throws <span class="c-r">OverflowException</span>.</p>`,
    brute: { why: R`<p>Calling <code>Math.Abs(n)</code> first looks natural but throws for <code>long.MinValue</code>, whose positive value does not exist in <code>long</code>. Converting to a string and skipping <code>'-'</code> works but allocates.</p>`, code: R`public class Brute
{
    public int DigitSum(long n)
    {
        n = Math.Abs(n);                 // OverflowException for long.MinValue
        int s = 0;
        while (n > 0) { s += (int)(n % 10); n /= 10; }
        return s;
    }
}` },
    mcq: { q: 'What is <code>-987 % 10</code> in C#?', options: ['7', '-7', '3', 'It throws'], answer: 1, explain: 'The remainder takes the sign of the dividend: -987 = -98 × 10 + (-7).' },
    hints: [
      R`<p>Hint 1: never negate <code>long.MinValue</code>: −(−2<sup>63</sup>) does not fit.</p>`,
      R`<p>Hint 2: work with the negative remainder directly: <code>Math.Abs((int)(n % 10))</code> is a small digit, always safe.</p>`,
      R`<p>Hint 3: loop <code>while (n != 0)</code>, not <code>n &gt; 0</code>.</p>`
    ],
    tests: { sig: 'long -> int', fn: 'digitSum', cases: [
      [[0], 0], [[12345], 15], [[-987], 24], [['9223372036854775807'], 88], [['-9223372036854775808'], 89], [[1000000000], 1], [[7], 7], [[-1], 1]
    ] },
    solution: {
      approach: R`<p>Peel digits with <code>% 10</code> and <code>/ 10</code> while <code>n != 0</code>; take the absolute value of each single digit, never of the whole number.</p>`,
      code: R`public class Solution
{
    public int DigitSum(long n)
    {
        int s = 0;
        while (n != 0)
        {
            s += Math.Abs((int)(n % 10));   // digit is in -9..9: Abs is always safe here
            n /= 10;                        // truncates toward zero for negatives too
        }
        return s;
    }
}`,
      complexity: R`<p>O(19) at most: one step per digit.</p>`,
      followUps: ['Return the digital root (repeat until one digit)', 'Do the same for a BigInteger']
    }
  });

  practice.push({
    title: 'Integer Type Range Lookup',
    level: 'Easy', tags: ['types', 'MinValue', 'switch expression'], companies: ['Microsoft', 'SAP'],
    statement: R`<p>Each input line contains a C# keyword. For the integer keywords <code>sbyte byte short ushort int uint long ulong char</code> print <code>min max</code> of that type (for <code>char</code>, as numbers). For anything else print <code>unknown</code>.</p>`,
    constraints: R`Up to 100 lines, each a single word.`,
    example: R`<p><code>int</code> → <span class="c-g">-2147483648 2147483647</span>; <code>char</code> → <span class="c-g">0 65535</span>; <code>Int32</code> → <span class="c-g">unknown</span> (only keywords count).</p>`,
    brute: { why: R`<p>Typing the numbers by hand invites typos (2147483648 instead of 2147483647). The framework already knows them: <code>int.MinValue</code>, <code>ulong.MaxValue</code>, and so on.</p>`, code: R`string t = Console.ReadLine()!;
if (t == "int") Console.WriteLine("-2147483648 2147483648");   // typo: off by one
else Console.WriteLine("unknown");` },
    mcq: { q: 'What is <code>(int)char.MaxValue</code>?', options: ['127', '255', '65535', '1114111'], answer: 2, explain: 'char is a 16-bit UTF-16 code unit: 0..65535. Code points above U+FFFF need two chars (a surrogate pair).' },
    hints: [
      R`<p>Hint 1: every numeric struct has <code>MinValue</code> and <code>MaxValue</code> constants.</p>`,
      R`<p>Hint 2: a <code>switch</code> expression maps a string to the output line neatly.</p>`,
      R`<p>Hint 3: cast <code>char</code> limits to <code>int</code> before printing, or they print as characters.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: 'int\n', stdout: '-2147483648 2147483647' },
      { stdin: 'byte\nsbyte\n', stdout: '0 255\n-128 127' },
      { stdin: 'short\nushort\n', stdout: '-32768 32767\n0 65535' },
      { stdin: 'long\nulong\nuint\n', stdout: '-9223372036854775808 9223372036854775807\n0 18446744073709551615\n0 4294967295' },
      { stdin: 'char\n', stdout: '0 65535' },
      { stdin: 'float\nInt32\ndecimal\n', stdout: 'unknown\nunknown\nunknown' }
    ] },
    solution: {
      approach: R`<p>Loop over lines; a switch expression returns the formatted line using the framework constants.</p>`,
      code: R`string? line;
while ((line = Console.ReadLine()) != null)
{
    string result = line.Trim() switch
    {
        "sbyte" => $"{sbyte.MinValue} {sbyte.MaxValue}",
        "byte" => $"{byte.MinValue} {byte.MaxValue}",
        "short" => $"{short.MinValue} {short.MaxValue}",
        "ushort" => $"{ushort.MinValue} {ushort.MaxValue}",
        "int" => $"{int.MinValue} {int.MaxValue}",
        "uint" => $"{uint.MinValue} {uint.MaxValue}",
        "long" => $"{long.MinValue} {long.MaxValue}",
        "ulong" => $"{ulong.MinValue} {ulong.MaxValue}",
        "char" => $"{(int)char.MinValue} {(int)char.MaxValue}",
        _ => "unknown"
    };
    Console.WriteLine(result);
}`,
      complexity: R`<p>O(1) per line: a switch over constant strings.</p>`,
      followUps: ['Add <code>nint</code>, <code>Int128</code> and <code>Half</code>', 'Also print sizeof for each type']
    }
  });

  practice.push({
    title: 'Checked Addition Report',
    level: 'Medium', tags: ['checked', 'OverflowException', 'int'], companies: ['Microsoft', 'Intel', 'Bloomberg'],
    statement: R`<p>Each input line holds two 32-bit integers <code>a b</code>. Print <code>a + b</code> if it fits in an <code>int</code>, otherwise print <code>OVERFLOW</code>. Solve it with <code>int</code> arithmetic (no <code>long</code>).</p>`,
    constraints: R`Up to 10<sup>4</sup> lines; −2<sup>31</sup> ≤ a, b ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>2147483647 1</code> → <span class="c-r">OVERFLOW</span>; <code>-2147483648 2147483647</code> → <span class="c-g">-1</span>.</p>`,
    brute: { why: R`<p>Plain <code>a + b</code> is unchecked and wraps: 2147483647 + 1 prints −2147483648 with no warning.</p>`, code: R`string? line;
while ((line = Console.ReadLine()) != null)
{
    var p = line.Split(' ');
    Console.WriteLine(int.Parse(p[0]) + int.Parse(p[1]));    // wraps silently
}` },
    mcq: { q: 'Without exceptions, when does <code>a + b</code> overflow for <code>b &gt; 0</code>?', options: ['<code>a + b &gt; int.MaxValue</code>', '<code>a &gt; int.MaxValue - b</code>', '<code>a &gt; b</code>', 'Never'], answer: 1, explain: 'int.MaxValue - b cannot overflow when b > 0, so the comparison is safe. Option A computes the overflowing sum first.' },
    hints: [
      R`<p>Hint 1: <code>checked(a + b)</code> throws <code>OverflowException</code> instead of wrapping.</p>`,
      R`<p>Hint 2: catch the OverflowException and print OVERFLOW instead.</p>`,
      R`<p>Hint 3: exception-free version: overflow iff (b &gt; 0 and a &gt; int.MaxValue − b) or (b &lt; 0 and a &lt; int.MinValue − b).</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '1 2\n', stdout: '3' },
      { stdin: '2147483647 1\n', stdout: 'OVERFLOW' },
      { stdin: '-2147483648 -1\n', stdout: 'OVERFLOW' },
      { stdin: '2147483647 -1\n-2147483648 2147483647\n', stdout: '2147483646\n-1' },
      { stdin: '0 0\n', stdout: '0' },
      { stdin: '1073741824 1073741824\n1073741823 1073741824\n', stdout: 'OVERFLOW\n2147483647' },
      { stdin: '-1073741824 -1073741824\n-1073741825 -1073741824\n', stdout: '-2147483648\nOVERFLOW' }
    ] },
    solution: {
      approach: R`<p>Parse both numbers, add inside <code>checked</code>, and turn the exception into the word OVERFLOW. A second method shows the exception-free guard, which is what you would use on a hot path.</p>`,
      code: R`string? line;
while ((line = Console.ReadLine()) != null)
{
    var p = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    if (p.Length < 2) continue;
    int a = int.Parse(p[0]), b = int.Parse(p[1]);
    try
    {
        Console.WriteLine(checked(a + b));
    }
    catch (OverflowException)
    {
        Console.WriteLine("OVERFLOW");
    }
}

// Exception-free alternative with the same result.
static bool AddOverflows(int a, int b) =>
    (b > 0 && a > int.MaxValue - b) || (b < 0 && a < int.MinValue - b);`,
      complexity: R`<p>O(1) per line. Exceptions cost microseconds each; the guard is a couple of comparisons.</p>`,
      followUps: ['Do the same for multiplication', 'Turn on CheckForOverflowUnderflow in the project and observe the difference']
    }
  });

  practice.push({
    title: 'Division Semantics: Truncation vs Floor',
    level: 'Medium', tags: ['integer division', 'modulo', 'exceptions'], companies: ['Google', 'Jane Street', 'Microsoft'],
    statement: R`<p>Each line holds two ints <code>a b</code>. Print four numbers: C#'s <code>a / b</code> and <code>a % b</code>, then the <b>floor</b> quotient and the <b>floor</b> modulo (the result of mathematics / Python's <code>//</code> and <code>%</code>). If <code>b</code> is 0 print <code>DIV0</code>; if the result does not fit in an int print <code>OVERFLOW</code>.</p>`,
    constraints: R`Up to 10<sup>4</sup> lines of 32-bit integers.`,
    example: R`<p><code>-7 2</code> → <span class="c-g">-3 -1 -4 1</span>: C# truncates toward zero (−3.5 → −3) and the remainder keeps the dividend's sign; floor rounds down (−4) and the floor modulo has the divisor's sign.</p>`,
    brute: { why: R`<p>Assuming <code>%</code> is always non-negative gives wrong buckets for negative numbers (−7 % 2 is −1, not 1). Not guarding <code>b == 0</code> crashes with <code>DivideByZeroException</code>, and <code>int.MinValue / -1</code> throws <code>OverflowException</code> on .NET.</p>`, code: R`string[] p = Console.ReadLine()!.Split(' ');
int a = int.Parse(p[0]), b = int.Parse(p[1]);
Console.WriteLine($"{a / b} {a % b} {a / b} {a % b}");   // floor versions wrong for negatives; crashes on 0` },
    mcq: { q: 'Floor modulo from C#\'s remainder: given <code>r = a % b</code>, which is correct?', options: ['<code>Math.Abs(r)</code>', '<code>r != 0 &amp;&amp; (r &lt; 0) != (b &lt; 0) ? r + b : r</code>', '<code>r + b</code>', '<code>(r + b) % b</code> always'], answer: 1, explain: 'When the remainder is non-zero and its sign differs from the divisor, add b once. (r + b) % b also works for most values but can overflow for large b.' },
    hints: [
      R`<p>Hint 1: q = a / b truncates toward zero; floor differs only when the remainder is non-zero and the signs of a and b differ.</p>`,
      R`<p>Hint 2: in that case floorQ = q − 1 and floorMod = r + b.</p>`,
      R`<p>Hint 3: check <code>b == 0</code> first; the only overflow is <code>int.MinValue / -1</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '7 2\n', stdout: '3 1 3 1' },
      { stdin: '-7 2\n', stdout: '-3 -1 -4 1' },
      { stdin: '7 -2\n', stdout: '-3 1 -4 -1' },
      { stdin: '-7 -2\n', stdout: '3 -1 3 -1' },
      { stdin: '0 5\n5 0\n', stdout: '0 0 0 0\nDIV0' },
      { stdin: '-2147483648 -1\n', stdout: 'OVERFLOW' },
      { stdin: '-2147483648 2\n', stdout: '-1073741824 0 -1073741824 0' },
      { stdin: '6 3\n-6 3\n', stdout: '2 0 2 0\n-2 0 -2 0' }
    ] },
    solution: {
      approach: R`<p>Guard division by zero and the single overflow case, compute the truncating pair with <code>/</code> and <code>%</code>, and adjust once to get the floor pair.</p>`,
      code: R`string? line;
while ((line = Console.ReadLine()) != null)
{
    var p = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    if (p.Length < 2) continue;
    int a = int.Parse(p[0]), b = int.Parse(p[1]);
    if (b == 0) { Console.WriteLine("DIV0"); continue; }
    if (a == int.MinValue && b == -1) { Console.WriteLine("OVERFLOW"); continue; }
    int q = a / b, r = a % b;                     // truncation toward zero
    int fq = q, fr = r;
    if (r != 0 && (r < 0) != (b < 0)) { fq = q - 1; fr = r + b; }
    Console.WriteLine($"{q} {r} {fq} {fr}");
}`,
      complexity: R`<p>O(1) per line: one division, one remainder, one adjustment.</p>`,
      followUps: ['Implement ceiling division for positive numbers without floating point', 'Compare with <code>Math.DivRem</code> and <code>int.DivRem</code>']
    }
  });

  practice.push({
    title: 'Token Classifier with TryParse',
    level: 'Medium', tags: ['parsing', 'TryParse', 'NumberStyles', 'culture'], companies: ['Amazon', 'Thoughtworks'],
    statement: R`<p>Read all whitespace-separated tokens from stdin and count three kinds: <b>integers</b> (an optional sign followed by digits, fitting in a <code>long</code>), <b>numbers</b> (not an integer, but parseable as a <code>double</code> with an optional sign, a decimal point and an exponent, invariant culture) and <b>words</b> (everything else). Print <code>ints=X numbers=Y words=Z</code>.</p>`,
    constraints: R`Up to 10<sup>5</sup> tokens, each at most 30 characters. Tokens never spell NaN or Infinity.`,
    example: R`<p><code>12 3.5 abc -7 1e3 x1 +4 .5</code> → <span class="c-g">ints=3 numbers=3 words=2</span>: integers 12, −7, +4; numbers 3.5, 1e3, .5; words abc, x1.</p>`,
    brute: { why: R`<p>Calling <code>long.Parse</code> inside <code>try/catch</code> for every token works but throws thousands of exceptions — each one costs microseconds and a stack trace. Using the current culture misreads <code>3.5</code> on machines that use a comma.</p>`, code: R`int ints = 0, words = 0;
foreach (var t in Console.In.ReadToEnd().Split())
{
    try { long.Parse(t); ints++; }        // exception per non-integer token
    catch (FormatException) { words++; }
}
Console.WriteLine($"ints={ints} words={words}");` },
    mcq: { q: 'Why pass <code>CultureInfo.InvariantCulture</code> to <code>double.TryParse</code>?', options: ['It is faster', 'So "3.5" means three and a half on every machine', 'It allows hexadecimal', 'It rejects exponents'], answer: 1, explain: 'With a culture whose decimal separator is a comma, "3.5" either fails or is read with the dot as a group separator. Invariant makes parsing predictable.' },
    hints: [
      R`<p>Hint 1: <code>TryParse</code> returns <code>bool</code> and never throws for bad text.</p>`,
      R`<p>Hint 2: integers: <code>long.TryParse(t, NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out _)</code>.</p>`,
      R`<p>Hint 3: numbers: <code>NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent</code>. Test the integer case first.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '12 3.5 abc -7 1e3 x1 +4 .5\n', stdout: 'ints=3 numbers=3 words=2' },
      { stdin: '', stdout: 'ints=0 numbers=0 words=0' },
      { stdin: '1,5 2.5e-3 hello\n', stdout: 'ints=0 numbers=1 words=2' },
      { stdin: '99999999999999999999 9223372036854775807\n', stdout: 'ints=1 numbers=1 words=0' },
      { stdin: '-0 +0 0\n', stdout: 'ints=3 numbers=0 words=0' },
      { stdin: '--5 5- 1.2.3 e5\n', stdout: 'ints=0 numbers=0 words=4' },
      { stdin: 'a\n\n  b\t3\n', stdout: 'ints=1 numbers=0 words=2' }
    ] },
    solution: {
      approach: R`<p>Split all input on whitespace and classify with two <code>TryParse</code> calls using explicit <code>NumberStyles</code> and the invariant culture. No exceptions are thrown.</p>`,
      code: R`using System.Globalization;

var inv = CultureInfo.InvariantCulture;
const NumberStyles IntStyle = NumberStyles.AllowLeadingSign;
const NumberStyles NumStyle = NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent;
int ints = 0, nums = 0, words = 0;
foreach (var t in Console.In.ReadToEnd().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries))
{
    if (long.TryParse(t, IntStyle, inv, out _)) ints++;
    else if (double.TryParse(t, NumStyle, inv, out _)) nums++;
    else words++;
}
Console.WriteLine($"ints={ints} numbers={nums} words={words}");`,
      complexity: R`<p>O(total characters).</p>`,
      followUps: ['Also report the sum of all integers as a BigInteger', 'Accept thousands separators like 1,234']
    }
  });

  practice.push({
    title: 'Narrowing Casts: What Survives?',
    level: 'Medium', tags: ['casts', 'two\'s complement', 'unchecked'], companies: ['Qualcomm', 'NVIDIA', 'Microsoft'],
    statement: R`<p>Each line holds a <code>long</code>. Print four values: the unchecked casts <code>(int)x</code>, <code>(short)x</code>, <code>(byte)x</code> and <code>(sbyte)x</code>.</p>`,
    constraints: R`Up to 1000 lines; any 64-bit value.`,
    example: R`<p><code>300</code> → <span class="c-g">300 300 44 44</span> (300 − 256 = 44). <code>65535</code> → <span class="c-g">65535 -1 255 -1</span>: in 16 bits all ones means −1.</p>`,
    brute: { why: R`<p>Computing the wrap with arithmetic by hand (<code>x % 256</code>) gets negatives wrong: −1 % 256 is −1 in C#, but <code>(byte)-1</code> is 255. The cast itself already does the right thing: keep the low bits.</p>`, code: R`long x = long.Parse(Console.ReadLine()!);
Console.WriteLine($"{x % 4294967296} {x % 65536} {x % 256} {x % 128}");   // wrong for negatives and signed types` },
    mcq: { q: 'What is <code>(sbyte)x</code> for <code>int x = 200</code> (unchecked)?', options: ['200', '-56', '72', 'OverflowException'], answer: 1, explain: '200 = 1100_1000 in binary. As a signed byte the top bit means −128: −128 + 72 = −56.' },
    hints: [
      R`<p>Hint 1: a narrowing cast keeps the low N bits and reinterprets them.</p>`,
      R`<p>Hint 2: the default context is unchecked, so the casts never throw; wrap them in <code>unchecked(...)</code> to make that explicit.</p>`,
      R`<p>Hint 3: test with −1, 128, 65535 and <code>long.MaxValue</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '300\n', stdout: '300 300 44 44' },
      { stdin: '-1\n', stdout: '-1 -1 255 -1' },
      { stdin: '128\n', stdout: '128 128 128 -128' },
      { stdin: '65535\n', stdout: '65535 -1 255 -1' },
      { stdin: '3000000000\n', stdout: '-1294967296 24064 0 0' },
      { stdin: '0\n40000\n', stdout: '0 0 0 0\n40000 -25536 64 64' },
      { stdin: '9223372036854775807\n-9223372036854775808\n', stdout: '-1 -1 255 -1\n0 0 0 0' }
    ] },
    solution: {
      approach: R`<p>Let the casts do the work inside <code>unchecked</code>, so the program behaves the same even if the project enables overflow checking.</p>`,
      code: R`string? line;
while ((line = Console.ReadLine()) != null)
{
    if (string.IsNullOrWhiteSpace(line)) continue;
    long x = long.Parse(line.Trim());
    unchecked
    {
        Console.WriteLine($"{(int)x} {(short)x} {(byte)x} {(sbyte)x}");
    }
}`,
      complexity: R`<p>O(1) per line: four casts that only drop high bits.</p>`,
      followUps: ['Print each result in hexadecimal too', 'Which of these casts would throw inside checked?']
    }
  });

  practice.push({
    title: 'Receipt Formatter with decimal',
    level: 'Medium', tags: ['decimal', 'formatting', 'alignment', 'culture'], companies: ['Shopify', 'Flipkart', 'Stripe'],
    statement: R`<p>The first line holds <code>N</code>; each of the next N lines holds <code>name qty price</code> (price with up to 2 decimals). Print one line per item: name left-aligned in 10 characters, a space, quantity right-aligned in 4, a space, line total right-aligned in 10 with 2 decimals. Finish with <code>TOTAL</code> left-aligned in 15 characters, a space, and the grand total right-aligned in 10. (The spaces keep columns apart even when a value is wider than its column.) Use a dot as decimal separator.</p>`,
    constraints: R`1 ≤ N ≤ 1000, 1 ≤ qty ≤ 10<sup>4</sup>, 0 ≤ price ≤ 10<sup>6</sup>. (The checker compares lines with spaces collapsed.)`,
    example: R`<p><code>Tea 3 2.50</code> → <code>Tea           3       7.50</code>. Three items at 0.10 must total exactly <span class="c-g">0.30</span> — with <code>double</code> you risk 0.30000000000000004 in other computations.</p>`,
    brute: { why: R`<p><code>double</code> for money accumulates binary rounding errors, and <code>double.Parse</code> under the current culture fails on European machines. Concatenating with spaces does not align columns.</p>`, code: R`int n = int.Parse(Console.ReadLine()!);
double total = 0;
for (int i = 0; i < n; i++)
{
    var p = Console.ReadLine()!.Split(' ');
    double line = int.Parse(p[1]) * double.Parse(p[2]);   // culture-dependent, binary floating point
    total += line;
    Console.WriteLine(p[0] + " " + p[1] + " " + line);
}
Console.WriteLine("TOTAL " + total);` },
    mcq: { q: 'Which hole prints a decimal right-aligned in 10 characters with 2 decimals?', options: ['<code>{x:10F2}</code>', '<code>{x,10:F2}</code>', '<code>{x,-10:F2}</code>', '<code>{x:F2,10}</code>'], answer: 1, explain: 'The syntax is {value,alignment:format}. Positive alignment right-aligns; negative left-aligns.' },
    hints: [
      R`<p>Hint 1: parse prices with <code>decimal.Parse(s, CultureInfo.InvariantCulture)</code>.</p>`,
      R`<p>Hint 2: <code>$"{name,-10}{qty,4}{total,10:F2}"</code> — format under the invariant culture with <code>string.Create(CultureInfo.InvariantCulture, $"...")</code>.</p>`,
      R`<p>Hint 3: <code>decimal</code> multiplication of an int and a 2-decimal price is exact.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '2\nTea 3 2.50\nSandwich 1 6.25\n', stdout: 'Tea 3 7.50\nSandwich 1 6.25\nTOTAL 13.75' },
      { stdin: '3\nA 1 0.10\nB 1 0.10\nC 1 0.10\n', stdout: 'A 1 0.10\nB 1 0.10\nC 1 0.10\nTOTAL 0.30' },
      { stdin: '1\nFree 5 0\n', stdout: 'Free 5 0.00\nTOTAL 0.00' },
      { stdin: '1\nGold 10000 1000000\n', stdout: 'Gold 10000 10000000000.00\nTOTAL 10000000000.00' },
      { stdin: '2\nPen 3 1.99\nInk 7 0.01\n', stdout: 'Pen 3 5.97\nInk 7 0.07\nTOTAL 6.04' },
      { stdin: '1\nX 1 19.9\n', stdout: 'X 1 19.90\nTOTAL 19.90' }
    ] },
    solution: {
      approach: R`<p>Use <code>decimal</code> for prices and totals, parse and format under the invariant culture, and rely on alignment components for the columns.</p>`,
      code: R`using System.Globalization;

var inv = CultureInfo.InvariantCulture;
int n = int.Parse(Console.ReadLine()!);
decimal grand = 0m;
for (int i = 0; i < n; i++)
{
    var p = Console.ReadLine()!.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    string name = p[0];
    int qty = int.Parse(p[1], inv);
    decimal price = decimal.Parse(p[2], inv);
    decimal line = qty * price;                       // exact in base 10
    grand += line;
    Console.WriteLine(string.Create(inv, $"{name,-10} {qty,4} {line,10:F2}"));
}
Console.WriteLine(string.Create(inv, $"{"TOTAL",-15} {grand,10:F2}"));`,
      complexity: R`<p>O(N) time, O(1) extra memory besides the current line.</p>`,
      followUps: ['Add 18% tax rounded half away from zero to the cent', 'Truncate names longer than 10 characters with an ellipsis']
    }
  });

  practice.push({
    title: 'Sum of Squares Modulo 1e9+7 (Fast I/O)',
    level: 'Medium', tags: ['fast io', 'long', 'modular arithmetic'], companies: ['Codeforces', 'Google', 'Amazon'],
    statement: R`<p>Read <code>N</code> and then N integers. Print (Σ a<sub>i</sub><sup>2</sup>) mod (10<sup>9</sup> + 7). The input can be large, so read it efficiently.</p>`,
    constraints: R`0 ≤ N ≤ 2·10<sup>5</sup>, |a<sub>i</sub>| ≤ 10<sup>9</sup>.`,
    example: R`<p><code>3</code> / <code>-3 4 -5</code> → 9 + 16 + 25 = <span class="c-g">50</span>. For a<sub>i</sub> = 10<sup>9</sup>, a<sub>i</sub><sup>2</sup> = 10<sup>18</sup>, which fits in a <code>long</code> (max ≈ 9.2·10<sup>18</sup>) but not in an int; 10<sup>18</sup> mod (10<sup>9</sup>+7) = 49.</p>`,
    brute: { why: R`<p><code>int</code> squares overflow at 46,341. Summing all squares into one <code>long</code> without reducing overflows after about nine values of 10<sup>18</sup>. Reading with <code>Console.ReadLine</code> plus LINQ works but allocates a string per number.</p>`, code: R`var t = Console.In.ReadToEnd().Split();
int n = int.Parse(t[0]);
long s = 0;
for (int i = 1; i <= n; i++) { int v = int.Parse(t[i]); s += v * v; }   // v*v overflows int
Console.WriteLine(s % 1_000_000_007);` },
    mcq: { q: 'Which line computes one term safely?', options: ['<code>long sq = v * v;</code> with <code>int v</code>', '<code>long sq = (long)v * v % Mod;</code>', '<code>int sq = checked(v * v);</code>', '<code>double sq = Math.Pow(v, 2) % Mod;</code>'], answer: 1, explain: 'Widen before multiplying, then reduce. Option A multiplies in int; C throws for big v; D loses precision above 2^53.' },
    hints: [
      R`<p>Hint 1: square in <code>long</code> and reduce modulo after every term, so the sum stays below 2·Mod.</p>`,
      R`<p>Hint 2: squares are never negative, so no negative-modulo issues arise.</p>`,
      R`<p>Hint 3: use a byte-level reader (topic 6) to parse 2·10<sup>5</sup> numbers quickly.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '3\n1 2 3\n', stdout: '14' },
      { stdin: '3\n-3 4 -5\n', stdout: '50' },
      { stdin: '1\n-1000000000\n', stdout: '49' },
      { stdin: '2\n1000000000 1000000000\n', stdout: '98' },
      { stdin: '0\n', stdout: '0' },
      { stdin: '1\n31623\n', stdout: '14122' },
      { stdin: { $concat: ['200000\n', { $rep: '-1000000000\n', n: 200000 }] }, stdout: '9800000' }
    ] },
    solution: {
      approach: R`<p>A small buffered reader parses integers from raw bytes; every square is computed in <code>long</code> and reduced at once.</p>`,
      code: R`static class Program
{
    const long Mod = 1_000_000_007;

    static void Main()
    {
        var input = new BufferedStream(Console.OpenStandardInput(), 1 << 16);
        int n = (int)ReadLong(input);
        long sum = 0;
        for (int i = 0; i < n; i++)
        {
            long v = ReadLong(input);
            sum = (sum + v * v % Mod) % Mod;      // v*v <= 1e18 fits in long
        }
        Console.WriteLine(sum);
    }

    static long ReadLong(Stream s)
    {
        int c = s.ReadByte();
        while (c != -1 && c != '-' && (c < '0' || c > '9')) c = s.ReadByte();
        bool neg = c == '-';
        if (neg) c = s.ReadByte();
        long v = 0;
        while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = s.ReadByte(); }
        return neg ? -v : v;
    }
}`,
      complexity: R`<p>O(N) time, O(1) extra memory (the 64 KB buffer).</p>`,
      followUps: ['Compute Σ a<sub>i</sub><sup>3</sup> modulo 10<sup>9</sup>+7 (cubes can be negative)', 'Measure ReadLine+Split vs the byte reader on 10<sup>6</sup> numbers']
    }
  });

  practice.push({
    title: 'String to Integer (atoi) with Clamping',
    level: 'Hard', tags: ['parsing', 'overflow', 'edge cases'], companies: ['Microsoft', 'Amazon', 'Meta', 'Apple'],
    statement: R`<p>Write <code>public int MyAtoi(string s)</code> in class <code>Solution</code>: skip leading spaces, read an optional <code>+</code> or <code>-</code>, then read digits until a non-digit or the end. Return the value clamped to the <code>int</code> range; return 0 if no digits were read. Do not use <code>int.Parse</code> or <code>long</code>.</p>`,
    constraints: R`0 ≤ s.Length ≤ 200; s contains letters, digits, spaces, <code>+ - .</code>.`,
    example: R`<p><code>"   -42"</code> → <span class="c-g">-42</span>; <code>"4193 with words"</code> → <span class="c-g">4193</span>; <code>"-91283472332"</code> → <span class="c-g">-2147483648</span> (clamped); <code>"+-12"</code> → <span class="c-g">0</span>.</p>`,
    brute: { why: R`<p>Extracting the digit run and calling <code>int.Parse</code> throws <code>OverflowException</code> on long runs; parsing into a <code>long</code> fails for 30-digit inputs too. Clamp during the scan instead.</p>`, code: R`public class Brute
{
    public int MyAtoi(string s)
    {
        string t = s.TrimStart();
        int i = 0;
        if (i < t.Length && (t[i] == '+' || t[i] == '-')) i++;
        while (i < t.Length && char.IsDigit(t[i])) i++;
        return i == 0 ? 0 : int.Parse(t[..i]);    // throws on "+", "-" and on overflow
    }
}` },
    mcq: { q: 'You have r = 214748364 and the next digit is 8, sign positive. What should happen?', options: ['r becomes 2147483648', 'Return int.MaxValue', 'Return 0', 'Throw OverflowException'], answer: 1, explain: '214748364 × 10 + 8 exceeds 2147483647, so the result clamps to int.MaxValue (for a negative sign, digit 8 gives exactly int.MinValue).' },
    hints: [
      R`<p>Hint 1: process in three phases: spaces, sign, digits.</p>`,
      R`<p>Hint 2: accumulate as a negative number (−r) so <code>int.MinValue</code> is reachable without overflow, or compare with <code>int.MaxValue / 10</code> before each step.</p>`,
      R`<p>Hint 3: <code>char.IsDigit</code> accepts non-ASCII digits like '٣'; use <code>c &gt;= '0' &amp;&amp; c &lt;= '9'</code>.</p>`
    ],
    tests: { sig: 'string -> int', fn: 'myAtoi', cases: [
      [['42'], 42], [['   -42'], -42], [['4193 with words'], 4193], [['words and 987'], 0],
      [['-91283472332'], -2147483648], [['91283472332'], 2147483647], [[''], 0], [['+-12'], 0],
      [['  +0 123'], 0], [['2147483648'], 2147483647], [['-2147483648'], -2147483648], [['00000-42a1234'], 0], [['   +'], 0], [['3.14159'], 3]
    ] },
    solution: {
      approach: R`<p>Scan once. Accumulate the value as a <b>negative</b> number (the negative range is one larger), checking before each multiply-add whether it would pass <code>int.MinValue</code>. At the end negate for a positive sign, clamping <code>int.MinValue</code> to <code>int.MaxValue</code>.</p>`,
      code: R`public class Solution
{
    public int MyAtoi(string s)
    {
        int i = 0, n = s.Length;
        while (i < n && s[i] == ' ') i++;
        bool neg = false;
        if (i < n && (s[i] == '+' || s[i] == '-')) { neg = s[i] == '-'; i++; }
        const int Limit = int.MinValue / 10;            // -214748364
        int acc = 0;                                    // always <= 0
        while (i < n && s[i] >= '0' && s[i] <= '9')
        {
            int d = s[i] - '0';
            if (acc < Limit || (acc == Limit && d > 8))  // acc*10 - d would pass int.MinValue
                return neg ? int.MinValue : int.MaxValue;
            acc = acc * 10 - d;
            i++;
        }
        if (neg) return acc;
        return acc == int.MinValue ? int.MaxValue : -acc;
    }
}`,
      complexity: R`<p>O(n) time, O(1) memory.</p>`,
      followUps: ['Return a bool and an out value like int.TryParse instead of clamping', 'Accept a ReadOnlySpan&lt;char&gt; to avoid substrings']
    }
  });

  practice.push({
    title: 'Streaming Statistics: Sum, Min, Max, Mean',
    level: 'Hard', tags: ['fast io', 'long', 'formatting', 'culture'], companies: ['Bloomberg', 'Two Sigma', 'Microsoft'],
    statement: R`<p>Read <code>N ≥ 1</code> and N integers. Print on one line: the exact sum, the minimum, the maximum and the mean with exactly 3 decimals (dot separator). The program must handle 2·10<sup>5</sup> values quickly and use O(1) extra memory.</p>`,
    constraints: R`1 ≤ N ≤ 2·10<sup>5</sup>, |a<sub>i</sub>| ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>3</code> / <code>1 2 4</code> → <span class="c-g">7 1 4 2.333</span>. Two values of 2147483647 → sum <span class="c-g">4294967294</span>, which needs a <code>long</code>.</p>`,
    brute: { why: R`<p>Storing all values in a <code>List&lt;int&gt;</code> and calling LINQ <code>Sum()</code> throws <code>OverflowException</code> (LINQ's int Sum is checked!) and allocates. <code>Average()</code> works but the list costs memory, and printing with the current culture may give "2,333".</p>`, code: R`var xs = Console.In.ReadToEnd().Split().Where(t => t != "").Skip(1).Select(int.Parse).ToList();
Console.WriteLine($"{xs.Sum()} {xs.Min()} {xs.Max()} {xs.Average():F3}");   // Sum() throws on int overflow` },
    mcq: { q: 'What does LINQ <code>new[] { int.MaxValue, 1 }.Sum()</code> do?', options: ['Returns −2147483648', 'Returns 2147483648L', 'Throws OverflowException', 'Does not compile'], answer: 2, explain: 'Enumerable.Sum for int uses checked arithmetic and throws. Use .Sum(x => (long)x) or a long accumulator.' },
    hints: [
      R`<p>Hint 1: a single pass keeps running sum (long), min and max — no list needed.</p>`,
      R`<p>Hint 2: mean = (double)sum / N; format with <code>ToString("F3", CultureInfo.InvariantCulture)</code>.</p>`,
      R`<p>Hint 3: start min at <code>long.MaxValue</code> and max at <code>long.MinValue</code>, or initialise with the first value.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '3\n1 2 4\n', stdout: '7 1 4 2.333' },
      { stdin: '1\n-5\n', stdout: '-5 -5 -5 -5.000' },
      { stdin: '2\n2147483647 2147483647\n', stdout: '4294967294 2147483647 2147483647 2147483647.000' },
      { stdin: '4\n1 2 3 4\n', stdout: '10 1 4 2.500' },
      { stdin: '3\n-1 -1 -2\n', stdout: '-4 -2 -1 -1.333' },
      { stdin: '2\n-2147483647 2147483647\n', stdout: '0 -2147483647 2147483647 0.000' },
      { stdin: { $concat: ['200000\n', { $rep: '1000000000 ', n: 200000 }] }, stdout: '200000000000000 1000000000 1000000000 1000000000.000' }
    ] },
    solution: {
      approach: R`<p>One pass over a byte-level reader: a <code>long</code> sum plus running min and max. Compute the mean as a double at the end and format with the invariant culture.</p>`,
      code: R`using System.Globalization;

static class Program
{
    static readonly Stream In = new BufferedStream(Console.OpenStandardInput(), 1 << 16);

    static void Main()
    {
        int n = (int)Next();
        long sum = 0, min = long.MaxValue, max = long.MinValue;
        for (int i = 0; i < n; i++)
        {
            long v = Next();
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
        }
        double mean = (double)sum / n;
        Console.WriteLine($"{sum} {min} {max} {mean.ToString("F3", CultureInfo.InvariantCulture)}");
    }

    static long Next()
    {
        int c = In.ReadByte();
        while (c != -1 && c != '-' && (c < '0' || c > '9')) c = In.ReadByte();
        bool neg = c == '-';
        if (neg) c = In.ReadByte();
        long v = 0;
        while (c >= '0' && c <= '9') { v = v * 10 + (c - '0'); c = In.ReadByte(); }
        return neg ? -v : v;
    }
}`,
      complexity: R`<p>O(N) time, O(1) extra memory.</p>`,
      followUps: ['Add the population standard deviation using Welford\'s algorithm', 'Print the median: why does that need O(N) memory?']
    }
  });

  practice.push({
    title: 'Exact Product or OVERFLOW',
    level: 'Hard', tags: ['checked', 'ulong', 'overflow', 'edge cases'], companies: ['Jane Street', 'Citadel', 'Microsoft'],
    statement: R`<p>Read <code>N</code> and then N <code>long</code> values. Print their exact product if it fits in a <code>long</code>, otherwise print <code>OVERFLOW</code>. The decision depends on the true mathematical product: <code>9223372036854775807 2 0</code> has product 0, and <code>4611686018427387904 2 -1</code> has product −2<sup>63</sup>, which fits. The empty product (N = 0) is 1.</p>`,
    constraints: R`0 ≤ N ≤ 10<sup>5</sup>; values are any 64-bit integers.`,
    example: R`<p><code>3037000499 3037000499</code> → <span class="c-g">9223372030926249001</span>; <code>3037000500 3037000500</code> → <span class="c-r">OVERFLOW</span> (9223372037000250000 &gt; 2<sup>63</sup>−1).</p>`,
    brute: { why: R`<p>Multiplying left to right inside <code>checked</code> reports OVERFLOW for <code>MaxValue 2 0</code> (the intermediate overflows although the product is 0) and for <code>2^62 2 -1</code> (the intermediate +2<sup>63</sup> does not fit, but the final −2<sup>63</sup> does). Unchecked multiplication just prints garbage.</p>`, code: R`var t = Console.In.ReadToEnd().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
long p = 1;
try { for (int i = 1; i < t.Length; i++) p = checked(p * long.Parse(t[i])); Console.WriteLine(p); }
catch (OverflowException) { Console.WriteLine("OVERFLOW"); }   // wrong when a later 0 or sign fixes it` },
    mcq: { q: 'Why does the magnitude need <code>ulong</code>?', options: ['ulong is faster', '|long.MinValue| = 2<sup>63</sup> does not fit in long but fits in ulong', 'To allow fractions', 'checked does not work on long'], answer: 1, explain: 'The negative range is one larger than the positive range. 2^63 fits in ulong (max 2^64 − 1), so the sign and magnitude can be tracked separately.' },
    hints: [
      R`<p>Hint 1: any zero makes the product 0 — check that first.</p>`,
      R`<p>Hint 2: track the sign (count negatives) and the magnitude as <code>ulong</code> with <code>checked</code>; once the magnitude passes 2<sup>63</sup> it can never come back down because every factor has |x| ≥ 1.</p>`,
      R`<p>Hint 3: |x| as ulong: for <code>long.MinValue</code> use <code>(ulong)long.MaxValue + 1</code>. At the end a negative product fits if magnitude ≤ 2<sup>63</sup>, a positive one if ≤ 2<sup>63</sup> − 1.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '3\n2 3 4\n', stdout: '24' },
      { stdin: '2\n4294967296 4294967296\n', stdout: 'OVERFLOW' },
      { stdin: '2\n3037000499 3037000499\n', stdout: '9223372030926249001' },
      { stdin: '2\n3037000500 3037000500\n', stdout: 'OVERFLOW' },
      { stdin: '3\n9223372036854775807 2 0\n', stdout: '0' },
      { stdin: '3\n4611686018427387904 2 -1\n', stdout: '-9223372036854775808' },
      { stdin: '2\n4611686018427387904 2\n', stdout: 'OVERFLOW' },
      { stdin: '2\n-9223372036854775808 1\n', stdout: '-9223372036854775808' },
      { stdin: '2\n-9223372036854775808 -1\n', stdout: 'OVERFLOW' },
      { stdin: '1\n-7\n', stdout: '-7' },
      { stdin: '0\n', stdout: '1' }
    ] },
    solution: {
      approach: R`<p>Handle zero first. Otherwise multiply magnitudes as <code>ulong</code> inside <code>checked</code>, stopping as soon as the magnitude exceeds 2<sup>63</sup> (it can only grow). Count negative factors for the sign, and finally check the asymmetric long range.</p>`,
      code: R`string[] t = Console.In.ReadToEnd().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
int n = int.Parse(t[0]);
var xs = new long[n];
for (int i = 0; i < n; i++) xs[i] = long.Parse(t[i + 1]);

Console.WriteLine(Product(xs));

static string Product(long[] xs)
{
    if (Array.IndexOf(xs, 0L) >= 0) return "0";
    const ulong Limit = (ulong)long.MaxValue + 1;           // 2^63
    ulong mag = 1;
    bool negative = false;
    foreach (long x in xs)
    {
        if (x < 0) negative = !negative;
        ulong ax = x == long.MinValue ? Limit : (ulong)Math.Abs(x);
        try { mag = checked(mag * ax); }
        catch (OverflowException) { return "OVERFLOW"; }
        if (mag > Limit) return "OVERFLOW";                   // can never shrink again
    }
    if (negative) return mag == Limit ? long.MinValue.ToString() : (-(long)mag).ToString();
    return mag == Limit ? "OVERFLOW" : ((long)mag).ToString();
}`,
      complexity: R`<p>O(N) time; O(N) memory for the parsed values (a streaming version needs O(1)).</p>`,
      followUps: ['Solve it with Int128 and compare clarity', 'Return the product modulo 2<sup>64</sup> instead (unchecked ulong)']
    }
  });

  practice.push({
    title: 'Fair Money Split with decimal',
    level: 'Hard', tags: ['decimal', 'rounding', 'invariant culture'], companies: ['Splitwise', 'PayPal', 'Stripe'],
    statement: R`<p>Read an amount (up to 2 decimals) and a number of people <code>N</code>. Split the amount into cents so that shares differ by at most one cent and add up exactly to the amount; earlier people get the extra cents. Print the N shares on one line with exactly two decimals.</p>`,
    constraints: R`0 ≤ amount ≤ 10<sup>12</sup>, 1 ≤ N ≤ 1000. Input like <code>100.00 3</code>, always with a dot.`,
    example: R`<p><code>100.00 3</code> → <span class="c-g">33.34 33.33 33.33</span>. Dividing and rounding each share gives 33.33 × 3 = 99.99: <span class="c-r">a cent disappears</span>.</p>`,
    brute: { why: R`<p><code>Math.Round(amount / n, 2)</code> for everyone loses or invents cents, and with <code>double</code> the shares may not even sum exactly. The fix is integer cents plus distribution of the remainder.</p>`, code: R`var p = Console.ReadLine()!.Split(' ');
double amount = double.Parse(p[0]); int n = int.Parse(p[1]);
double share = Math.Round(amount / n, 2);
Console.WriteLine(string.Join(" ", Enumerable.Repeat(share.ToString("F2"), n)));   // shares do not add up` },
    mcq: { q: 'Total 0.05 split between 2 people should be…', options: ['0.025 and 0.025', '0.03 and 0.02', '0.02 and 0.02', '0.03 and 0.03'], answer: 1, explain: '5 cents / 2 = 2 remainder 1: the first person gets 3 cents, the second 2. The shares add up to exactly 0.05.' },
    hints: [
      R`<p>Hint 1: convert to whole cents: <code>long cents = (long)(amount * 100m)</code> — exact with <code>decimal</code>.</p>`,
      R`<p>Hint 2: base = cents / N, extra = cents % N; the first <code>extra</code> people get base + 1.</p>`,
      R`<p>Hint 3: convert back with <code>share / 100m</code> and format <code>F2</code> under the invariant culture.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '100.00 3\n', stdout: '33.34 33.33 33.33' },
      { stdin: '0.05 2\n', stdout: '0.03 0.02' },
      { stdin: '10 4\n', stdout: '2.50 2.50 2.50 2.50' },
      { stdin: '0.01 3\n', stdout: '0.01 0.00 0.00' },
      { stdin: '1000000000.00 7\n', stdout: '142857142.86 142857142.86 142857142.86 142857142.86 142857142.86 142857142.85 142857142.85' },
      { stdin: '7.5 1\n', stdout: '7.50' },
      { stdin: '0 2\n', stdout: '0.00 0.00' },
      { stdin: '1000000000000 3\n', stdout: '333333333333.34 333333333333.33 333333333333.33' }
    ] },
    solution: {
      approach: R`<p>Work in integer cents. <code>decimal</code> makes the conversion exact; integer division and remainder distribute the cents fairly; formatting uses the invariant culture.</p>`,
      code: R`using System.Globalization;

var inv = CultureInfo.InvariantCulture;
var p = Console.ReadLine()!.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
decimal amount = decimal.Parse(p[0], inv);
int n = int.Parse(p[1], inv);
long cents = (long)(amount * 100m);           // exact: decimal is base 10
long baseShare = cents / n, extra = cents % n;
var shares = new string[n];
for (int i = 0; i < n; i++)
{
    long c = baseShare + (i < extra ? 1 : 0);
    shares[i] = (c / 100m).ToString("F2", inv);
}
Console.WriteLine(string.Join(" ", shares));`,
      complexity: R`<p>O(N) time and O(N) memory for the formatted shares.</p>`,
      followUps: ['Split by weights (e.g. 2:1:1) with the largest-remainder method', 'Support currencies with 0 or 3 minor digits']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`What does the C# compiler (Roslyn) produce from <code>Program.cs</code>?`, options: ['Native x64 machine code', 'IL (Intermediate Language) plus metadata in an assembly', 'JavaScript', 'Java bytecode'], answer: 1, explain: R`Roslyn emits CPU-neutral IL and metadata into a .dll. The JIT in the CLR turns IL into machine code at run time (or ReadyToRun / Native AOT do it ahead of time).` },
    { q: R`When is a method's IL compiled to machine code by default?`, options: ['When the project is built', 'When the assembly is loaded', 'On the method\'s first call', 'Never; IL is interpreted'], answer: 2, explain: R`The JIT compiles each method on first call (tier 0), and recompiles hot methods with full optimisations (tier 1).` },
    { q: R`Which statement about top-level statements is <b>false</b>?`, options: ['Only one file per project may contain them', '<code>args</code> is available without declaring it', 'They may appear after class declarations in the same file', '<code>return 2;</code> sets the exit code'], answer: 2, explain: R`Top-level statements must come before any type declarations in the file (CS8803).` },
    { q: R`What is <code>sizeof(char)</code> in C#?`, options: ['1', '2', '4', 'Platform dependent'], answer: 1, explain: R`char is a UTF-16 code unit: 2 bytes on every platform.` },
    { q: R`What does <code>Console.WriteLine(0.1 + 0.2 == 0.3);</code> print, and what about <code>0.1m + 0.2m == 0.3m</code>?`, options: ['True / True', 'False / True', 'False / False', 'True / False'], answer: 1, explain: R`Binary doubles cannot represent 0.1 exactly, so the sum is 0.30000000000000004. decimal stores base-10 digits, so the decimal comparison is exact.` },
    { q: R`Given <code>int a = 100_000, b = 100_000;</code>, what is <code>long c = a * b;</code>?`, options: ['10000000000', '1410065408', 'OverflowException', 'Compile error'], answer: 1, explain: R`The multiplication happens in int (unchecked, wraps to 1410065408) and only then is widened. Write (long)a * b.` },
    { q: R`Which line does <b>not</b> compile?`, options: ['<code>var x = 5;</code>', '<code>var y;</code>', '<code>var z = new List&lt;int&gt;();</code>', '<code>var w = (A: 1, B: "x");</code>'], answer: 1, explain: R`var needs an initialiser so the compiler can infer the type (CS0818).` },
    { q: R`Library v1 declares <code>public const int Limit = 10;</code>. v2 changes it to 20 and you replace only the DLL. What does your already-compiled app use?`, options: ['20', '10', 'It crashes with MissingFieldException', 'It depends on the JIT'], answer: 1, explain: R`const values are copied into the caller's IL at compile time. Use static readonly for values that may change between versions.` },
    { q: R`What does <code>$"{42,6:D4}|"</code> produce?`, options: ['<code>004200|</code>', '<code>··0042|</code> (two spaces, then 0042)', '<code>0042··|</code>', '<code>42.0000|</code>'], answer: 1, explain: R`D4 pads to 4 digits (0042), then the alignment 6 right-aligns in 6 characters, adding two spaces in front.` },
    { q: R`On a machine with the German culture, what does <code>double.Parse("1.5")</code> return?`, options: ['1.5', '15', 'It always throws', '0.15'], answer: 1, explain: R`In de-DE the dot is the group separator, so "1.5" is read as 15. Pass CultureInfo.InvariantCulture for machine-readable text.` },
    { q: R`<code>Console.ReadLine()</code> at end of input returns…`, options: ['""', 'null', '"\n"', 'It throws EndOfStreamException'], answer: 1, explain: R`It returns null (type string?). An empty line returns "".` },
    { q: R`Which expression throws even in an unchecked context?`, options: ['<code>int.MaxValue + x</code> where x = 1', '<code>(byte)v</code> where <code>long v = 300</code>', '<code>Math.Abs(int.MinValue)</code>', '<code>1.0 / 0</code>'], answer: 2, explain: R`Math.Abs(int.MinValue) throws OverflowException because +2147483648 is not representable. The others wrap or give Infinity.` },
    { q: R`Why is printing 10<sup>6</sup> lines with <code>Console.WriteLine</code> slow?`, options: ['String interpolation is slow', 'Console.Out flushes on every call, causing a system call per line', 'The JIT cannot optimise loops', 'Console uses UTF-32'], answer: 1, explain: R`Console.Out autoflushes. Wrap the output stream in a StreamWriter with AutoFlush = false and flush once.` },
    { q: R`What does <code>int k = int.MaxValue + 1;</code> (both operands constants) do?`, options: ['k = int.MinValue', 'OverflowException at run time', 'Compile error CS0220', 'k = 0'], answer: 2, explain: R`Constant expressions are evaluated by the compiler in a checked context; an overflow is a compile-time error unless wrapped in unchecked(...).` }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: R`Walk me through what happens between <code>dotnet run</code> and the first line of output.`, level: 'B', a: R`<p>The CLI restores NuGet packages, then MSBuild invokes Roslyn, which parses and type-checks the code and emits an assembly (<code>.dll</code>) containing IL and metadata. The <code>dotnet</code> host starts the CLR for the target framework, loads the assembly and its dependencies (the BCL is ReadyToRun-precompiled), and finds the entry point. When <code>Main</code> is first called, the JIT compiles its IL to native code at tier 0; methods called often are later recompiled at tier 1 with optimisations and Dynamic PGO. <code>Console.WriteLine</code> is itself JIT- or R2R-compiled code that writes to stdout.</p>`, followUps: ['What do ReadyToRun and Native AOT change?', 'Why is the first request of a web API slower than later ones?'] },
    { q: R`What is the difference between .NET Framework, .NET Core and .NET 8?`, level: 'B', a: R`<p><b>.NET Framework</b> (up to 4.8.1) is the original Windows-only runtime, now in maintenance mode. <b>.NET Core</b> (1.0–3.1) was the cross-platform, open-source rewrite. From version 5 the line is simply <b>.NET</b>: one runtime for Windows, Linux and macOS, released every November; even versions (6, 8, 10) are LTS with three years of support, odd ones are STS. .NET 8 ships with C# 12. New projects should target modern .NET; Framework remains for legacy apps (WCF server, Web Forms).</p>`, followUps: ['What is .NET Standard and is it still needed?', 'How would you migrate a .NET Framework library?'] },
    { q: R`Explain value types vs reference types at the level of this module's built-in types.`, level: 'B', a: R`<p>The numeric types, <code>char</code>, <code>bool</code> and <code>decimal</code> are <b>structs</b> (value types): a variable holds the value itself, assignment copies it, and it cannot be null unless written <code>int?</code>. <code>string</code> and arrays are <b>reference types</b>: the variable holds a reference to an object on the managed heap; assignment copies the reference. <code>string</code> behaves value-like because it is immutable and <code>==</code> compares contents. Details of stack, heap and boxing come in later modules.</p>`, followUps: ['Where does a local int live if it is captured by a lambda?', 'Why is string a reference type?'] },
    { q: R`When would you use <code>decimal</code> instead of <code>double</code>, and what does it cost?`, level: 'B', a: R`<p>Use <code>decimal</code> whenever values are decimal by nature and must be exact: money, prices, tax, invoices, accounting. It stores a 96-bit integer and a power-of-ten scale, so 0.1 is exact and sums do not drift. Costs: 16 bytes instead of 8, roughly 10–20× slower arithmetic (software implemented), a smaller range (about ±7.9·10<sup>28</sup>), no NaN/Infinity, and exceptions on overflow or division by zero. Use <code>double</code> for measurements, science, geometry and ML, where relative precision matters and speed counts.</p>`, followUps: ['How does decimal rounding work (MidpointRounding)?', 'Should a database column for money be float or decimal?'] },
    { q: R`Is integer overflow an error in C#? How do you control it?`, level: 'I', a: R`<p>By default integer arithmetic is <b>unchecked</b>: results wrap modulo 2<sup>32</sup> or 2<sup>64</sup> silently (well-defined, unlike C++ signed overflow). <code>checked(expr)</code> or a <code>checked { }</code> block makes overflow throw <code>OverflowException</code>; <code>unchecked</code> forces wrapping (useful for hashes). The project setting <code>CheckForOverflowUnderflow</code> flips the default. Constant expressions are always checked at compile time. Some operations throw regardless: <code>Math.Abs(int.MinValue)</code>, <code>int.MinValue / -1</code>, integer division by zero, and all <code>decimal</code> overflow. LINQ <code>Sum</code> over ints is checked too.</p>`, followUps: ['What does checked cost at run time?', 'Does checked apply inside methods you call?'] },
    { q: R`<code>const</code> vs <code>readonly</code> vs <code>static readonly</code> — when do you pick each?`, level: 'I', a: R`<p><code>const</code>: a compile-time constant of a primitive, string or enum type; implicitly static; its value is copied into every caller, so only use it for values that truly never change (π, days in a week, a protocol magic number). <code>readonly</code> field: assigned at declaration or in a constructor, one value per instance (an ID, an injected dependency). <code>static readonly</code>: one value per type computed at run time (a <code>Regex</code>, a <code>TimeSpan</code>, configuration), and safe to change between library versions. Remember readonly is shallow: the referenced object can still mutate.</p>`, followUps: ['How do you make a collection field truly immutable?', 'Can a readonly field be changed via reflection?'] },
    { q: R`Is <code>var</code> dynamic typing? When is using it bad style?`, level: 'B', a: R`<p>No. <code>var</code> asks the compiler to infer the static type from the initialiser; the variable is strongly typed and the IL is identical to writing the type. <code>dynamic</code> is the one that defers member binding to run time. <code>var</code> is good when the type is obvious (<code>var list = new List&lt;Order&gt;()</code>) or unspeakable (anonymous types, long LINQ types). It is bad when it hides important information, e.g. <code>var total = Compute();</code> where it matters whether the result is <code>decimal</code> or <code>double</code>, or <code>IEnumerable</code> (deferred) vs <code>List</code> (materialised).</p>`, followUps: ['What is target-typed new?', 'What type does var infer for a lambda?'] },
    { q: R`Why can code that parses numbers work on your laptop and fail in production?`, level: 'I', a: R`<p>Culture. <code>double.Parse</code>, <code>ToString</code> and string interpolation use <code>CultureInfo.CurrentCulture</code> by default. On a server configured for, say, de-DE or fr-FR, the decimal separator is a comma, so "1.5" becomes 15 or fails, and output files contain commas. Fix: use <code>CultureInfo.InvariantCulture</code> for every machine-readable format (files, JSON, logs, protocols), keep the current culture only for text shown to people, and add a unit test that runs under a non-English culture. Containers with invariant globalization mode behave invariant by default, which hides the bug until deployment elsewhere.</p>`, followUps: ['What is InvariantGlobalization mode?', 'How do you compare strings culture-insensitively?'] },
    { q: R`How do you read 10<sup>6</sup> integers fast in C#?`, level: 'I', a: R`<p>Avoid per-line <code>Console.ReadLine()</code> + <code>Split</code> + <code>int.Parse</code>, which allocates a string per token. Open the raw stream with <code>Console.OpenStandardInput()</code>, read big chunks (64 KB) into a byte buffer and parse digits manually (<code>v = v * 10 + (b - '0')</code>), handling a minus sign and skipping bytes ≤ space. For output, wrap <code>Console.OpenStandardOutput()</code> in a <code>StreamWriter</code> with <code>AutoFlush = false</code> (or build in a <code>StringBuilder</code>) and flush once. Span-based APIs (<code>int.Parse(ReadOnlySpan&lt;char&gt;)</code>, <code>Utf8Parser</code>) are a middle ground.</p>`, followUps: ['How would you handle negative numbers and CRLF line endings?', 'What happens if you forget to flush?'] },
    { q: R`What are the valid signatures of <code>Main</code>, and what do top-level statements compile to?`, level: 'B', a: R`<p><code>Main</code> must be static and return <code>void</code>, <code>int</code>, <code>Task</code> or <code>Task&lt;int&gt;</code>, with either no parameters or <code>string[] args</code>. Top-level statements are lowered to a static method in a generated <code>Program</code> class; its signature depends on usage: <code>args</code> becomes the parameter, <code>return</code> with a value makes it return <code>int</code>, and <code>await</code> makes it <code>async Task</code>/<code>Task&lt;int&gt;</code>. Local variables in the file are locals of that method, and functions declared there are local functions.</p>`, followUps: ['How do you test an ASP.NET Core app whose Program uses top-level statements?', 'What if two classes define Main?'] },
    { q: R`Explain how <code>$"..."</code> interpolation is compiled in modern C# and why it matters for performance.`, level: 'A', a: R`<p>Since C# 10 an interpolated string assigned to <code>string</code> is lowered to a <code>DefaultInterpolatedStringHandler</code> (a ref struct): the compiler emits <code>AppendLiteral</code> and <code>AppendFormatted&lt;T&gt;</code> calls that write into a pooled buffer, so value types are not boxed and no intermediate strings or <code>object[]</code> arrays are created. APIs can define their own handlers with an <code>[InterpolatedStringHandler]</code> attribute, which lets them skip formatting entirely when not needed (e.g. a disabled log level or a passing <code>Debug.Assert</code>). Before C# 10 the same code became <code>string.Format</code> with boxing.</p>`, followUps: ['Why should logging still use message templates instead of interpolation?', 'What does string.Create(IFormatProvider, ...) do?'] },
    { q: R`What does <code>(int)3.7</code>, <code>(int)-3.7</code>, <code>Convert.ToInt32(2.5)</code> and <code>Math.Round(2.5)</code> give, and why?`, level: 'I', a: R`<p><code>(int)3.7</code> = 3 and <code>(int)-3.7</code> = −3: casts truncate toward zero. <code>Convert.ToInt32(2.5)</code> = 2 and <code>Math.Round(2.5)</code> = 2: both use banker's rounding (round half to even) to avoid systematic bias in large sums; <code>Math.Round(3.5)</code> is 4. For school rounding pass <code>MidpointRounding.AwayFromZero</code>. Also beware: many decimal-looking doubles are not exact midpoints (2.675 is stored as 2.67499…), so rounding them may surprise; use <code>decimal</code> when exact midpoints matter.</p>`, followUps: ['What is Math.Floor(-3.7)?', 'What do the new MidpointRounding.ToZero / ToNegativeInfinity modes do?'] },
    { q: R`Write an overflow-safe check for <code>a * b</code> with ints, without <code>long</code> or exceptions.`, level: 'A', a: R`<p>If either is 0 there is no overflow. Otherwise compare against the limits by division, taking signs into account: for <code>a &gt; 0, b &gt; 0</code>: overflow iff <code>a &gt; int.MaxValue / b</code>; for <code>a &lt; 0, b &lt; 0</code>: iff <code>a &lt; int.MaxValue / b</code>; for mixed signs (say <code>a &gt; 0, b &lt; 0</code>): iff <code>b &lt; int.MinValue / a</code>. In practice I would write <code>(long)a * b</code> and compare to the int range, or use <code>checked</code>, or <code>Math.BigMul</code> for 64-bit operands — the manual version matters when no wider type exists (e.g. for <code>long</code>/<code>ulong</code>), where <code>Int128</code> or <code>Math.BigMul(a, b, out low)</code> help.</p>`, followUps: ['How does the CPU detect overflow?', 'What do int.CreateSaturating and CreateChecked do?'] },
    { q: R`Design question: you ship a CLI tool to thousands of machines. What startup and deployment choices does .NET give you?`, level: 'E', a: R`<p>Options: <b>framework-dependent</b> (small, needs the shared runtime installed, gets runtime security patches automatically); <b>self-contained</b> (bundles the runtime, larger, no prerequisites; add <code>PublishTrimmed</code> to cut size and <code>PublishSingleFile</code> for one file); <b>ReadyToRun</b> (pre-compiled code reduces JIT at startup, bigger binaries); <b>Native AOT</b> (single native executable, fastest startup and lowest memory, but no runtime code generation, limited reflection — needs trimming-safe libraries and source-generated JSON). For a CLI where startup dominates, Native AOT is often best; for a long-running service, JIT with tiered PGO usually wins on peak throughput. Also decide the RID per platform and sign the binaries.</p>`, followUps: ['Which libraries break under trimming and why?', 'How does Dynamic PGO compare to AOT for long-running services?'] }
  );

  registerModule({
    id: 'csharp01',
    title: '.NET, Syntax, Types & Console I/O',
    intro: R`<p>Welcome to C#! Before writing algorithms we need to know how a C# program is <b>born and run</b>: the <b>.NET SDK</b> and the <code>dotnet</code> CLI build your code into <b>IL</b>, and the runtime's <b>JIT</b> turns that IL into machine code the first time each method runs. Then we meet the everyday building blocks: <b>top-level statements</b> and <code>Main</code>, the <b>built-in value types</b> and their fixed sizes, <code>var</code>, <code>const</code> and <code>readonly</code>, <b>string interpolation</b> with format specifiers and culture, reading input with <code>Console</code> (including <b>fast I/O</b> for big inputs), and <b>checked arithmetic</b> for catching overflow.</p>
<p>Every topic starts with an everyday analogy and then shows what the compiler and runtime really do, with step-by-step visualizers for the build pipeline, type ranges, format specifiers, the input buffer and 32-bit overflow. These are the questions interviewers use to tell people who use C# from people who understand it: "is C# interpreted?", "why did 100000 × 100000 print a strange number?", "why does parsing fail on the European server?". All code is modern C# 12 on .NET 8.</p>`,
    goals: [
      'Explain the path from <code>.cs</code> source to IL to JIT-compiled machine code, and use the <code>dotnet</code> CLI to create, build, run and publish',
      'Write programs with top-level statements or an explicit <code>Main</code>, use <code>args</code> and exit codes, and organise code with namespaces and <code>using</code> directives',
      'Choose the right numeric type from constraints (<code>int</code>, <code>long</code>, <code>double</code>, <code>decimal</code>) and predict implicit and explicit conversions',
      'Use <code>var</code>, <code>const</code>, <code>readonly</code> and <code>static readonly</code> correctly and explain the const versioning trap',
      'Format output exactly with interpolation, alignment and format specifiers, and make parsing and formatting culture-safe',
      'Read input robustly until end of file and fast for 10<sup>5</sup>–10<sup>6</sup> numbers, with buffered output',
      'Detect and prevent integer overflow with <code>checked</code>, widening and safe formulas'
    ],
    prereqs: R`<p>No prior C# needed. Helpful: basic programming in any language (variables, loops, functions) and comfort with a terminal. Install the .NET 8 SDK (or newer) and an editor such as VS Code with the C# Dev Kit, Visual Studio or Rider. If you know Java or C++, you will find many parallels: compare with <b>Java 1</b> (JVM and bytecode) and <b>C++ 1</b> (native compilation).</p>`,
    hours: 10,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
