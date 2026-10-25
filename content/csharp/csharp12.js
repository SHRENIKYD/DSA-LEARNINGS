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
     TOPIC 1 — IL and lowering
     ====================================================================== */
  var T1_IL = [
    '// static int F(int x) => x * 2 + 3;',
    'ldarg.0        // push x',
    'ldc.i4.2       // push 2',
    'mul            // pop 2 values, push x*2',
    'ldc.i4.3       // push 3',
    'add            // pop 2 values, push x*2+3',
    'ret            // return the top of the stack'
  ].join('\n');
  topics.push({
    title: 'IL: What the C# Compiler Really Emits',
    analogy: `<p>An author writes a novel in English (C#). The publisher prints it in a simple, universal <b>shorthand</b> (IL) that any local translator can read. In each country (each CPU and OS) a translator (the JIT) turns the shorthand into the local language (x64 or Arm64 machine code) — and only translates the chapters someone actually opens. The shorthand is deliberately simple: "put this on the pile, put that on the pile, add the top two". Reading it tells you what your elegant C# <b>really</b> does: hidden allocations, hidden copies, hidden classes.</p>`,
    explain: `<p>${C('csc')} (Roslyn) compiles C# to <b>Common Intermediate Language</b> (IL, also MSIL/CIL) plus metadata. IL is a <b>stack machine</b>: instructions push and pop values on an evaluation stack; locals and arguments live in numbered slots.</p>
<h4>1. The instructions you meet most</h4>
${H.table(['IL', 'Meaning'], [
  [C('ldarg.0') + ' / ' + C('ldloc.1') + ' / ' + C('ldc.i4 42') + ' / ' + C('ldstr "hi"'), 'push an argument, a local, a constant, a string literal'],
  [C('stloc.0') + ' / ' + C('starg') + ' / ' + C('stfld'), 'pop into a local / argument / field'],
  [C('add sub mul div rem'), 'pop two, push result (' + C('add.ovf') + ' in checked code)'],
  [C('call') + ' / ' + C('callvirt'), 'call a method; ' + C('callvirt') + ' also null-checks and dispatches virtually'],
  [C('newobj') + ' / ' + C('newarr'), 'allocate an object / array on the heap'],
  [C('box') + ' / ' + C('unbox.any'), 'copy a value type into a new heap object / back'],
  [C('br') + ' / ' + C('brtrue') + ' / ' + C('blt'), 'jumps — loops and ifs become labels and branches'],
  [C('ret'), 'return (the top of the stack, if any)']
])}
<p>Look at IL with <b>ILSpy</b>, <b>dotPeek</b>, ${C('ildasm')}, or online at <b>sharplab.io</b> (which also shows the JIT's assembly).</p>
<h4>2. Lowering: high-level features become plain IL</h4>
${H.table(['You write', 'The compiler generates'], [
  [C('foreach (var x in list)'), C('List<T>.Enumerator e = list.GetEnumerator(); try { while (e.MoveNext()) ... } finally { e.Dispose(); }') + ' — a struct enumerator, no allocation; over an array: a plain indexed for loop'],
  [C('using var f = Open();'), C('try { ... } finally { f?.Dispose(); }')],
  [C('lock (o) { }'), C('Monitor.Enter(o, ref taken); try { } finally { if (taken) Monitor.Exit(o); }') + ' (C# 13 with ' + C('Lock') + ' differs)'],
  ['a lambda capturing a local', 'a hidden <b>closure class</b> (' + C('<>c__DisplayClass0_0') + '): the local becomes a field, ' + C('newobj') + ' allocates it'],
  ['a non-capturing lambda', 'a cached delegate in a static field of ' + C('<>c') + ' — allocated once'],
  [C('async') + ' method / ' + C('yield return'), 'a state machine struct/class with ' + C('MoveNext()')],
  [C('$"{a} {b}"'), C('DefaultInterpolatedStringHandler') + ' (C# 10+): appends to a pooled buffer, no boxing of a and b'],
  [C('record'), 'Equals, GetHashCode, ToString, PrintMembers, EqualityContract, Clone ' + C('<Clone>$')]
])}
<h4>3. Why it matters for performance</h4>
<p>IL makes hidden costs visible: a ${C('box')} where you passed an int as ${C('object')}, a ${C('newobj')} for a closure inside a hot loop, a ${C('callvirt')} through an interface, a defensive copy (${C('ldfld')} + ${C('stloc')}) of a big struct. Debug builds emit extra ${C('nop')}s and keep locals alive; <b>always look at Release IL</b>.</p>`,
    clues: ['"does this line allocate?" — look for newobj, newarr, box in the IL', 'a lambda inside a loop — is there a closure class?', 'surprising behaviour of foreach/using/lock/async — read the lowered code', 'interviewers asking "what does the compiler generate for..."'],
    code: [{ lang: 'csharp', run: true, title: 'Seeing lowering effects from C# itself (runnable)', code: `
using System.Reflection;

// 1. A capturing lambda creates a hidden closure class; a static lambda does not.
int threshold = 10;
Func<int, bool> capturing = x => x > threshold;
Func<int, bool> nonCapturing = static x => x > 10;
Console.WriteLine(capturing.Target!.GetType().Name.Contains("DisplayClass"));    // True: closure object
Console.WriteLine(nonCapturing.Target!.GetType().Name);                           // <>c  (cached singleton)

// 2. The same non-capturing lambda returns the same cached delegate every time.
Console.WriteLine(ReferenceEquals(Make(), Make()));                                // True

// 3. The IL of a method is available through reflection as bytes.
byte[] il = typeof(Demo).GetMethod("F")!.GetMethodBody()!.GetILAsByteArray()!;
Console.WriteLine(string.Join(" ", il.Select(b => b.ToString("X2"))));            // 02 18 5A 19 58 2A

// 4. A record's compiler-generated members are real methods.
Console.WriteLine(typeof(P).GetMethod("<Clone>$") != null);                         // True

static Func<int, int> Make() => x => x + 1;

static class Demo { public static int F(int x) => x * 2 + 3; }
record P(int X);` }],
    codeTitle: ['Lowering, visible from C#'],
    viz: {
      title: 'Executing x * 2 + 3 on the IL evaluation stack (x = 5)',
      gen: function () {
        var st = function (items, narr, line, v) { return { narr: narr, parts: [{ type: 'code', label: 'IL (Release)', lang: 'csharp', code: T1_IL, hl: line ? (function () { var h = {}; h[line] = 'cur'; return h; })() : {} }, { type: 'stack', label: 'Evaluation stack (top at the end)', items: items }, { type: 'vars', label: 'Arguments', vals: v || { 'arg0 (x)': 5 } }] }; };
        return [
          st([], 'The method starts with an empty evaluation stack. Arguments are in numbered slots; arg0 = x = 5.', 0),
          st([5], '<b>ldarg.0</b> copies argument 0 onto the stack. Bytes: 02.', 2),
          st([5, 2], '<b>ldc.i4.2</b> — a one-byte short form for pushing the int 2 (0x18).', 3),
          st([10], '<b>mul</b> pops two values and pushes their product (0x5A). No overflow check — that would be mul.ovf in a checked context.', 4),
          st([10, 3], '<b>ldc.i4.3</b> pushes 3 (0x19).', 5),
          st([13], '<b>add</b> pops 10 and 3, pushes 13 (0x58).', 6),
          st([], '<b>ret</b> returns the top of the stack: 13 (0x2A). The JIT turns these six bytes into roughly <code>lea eax, [rcx+rcx+3]</code> — a single instruction.', 7, { 'arg0 (x)': 5, 'return': 13 })
        ];
      }
    },
    examples: [
      { title: 'A closure in a loop', html: `<p>${C('for (int i = 0; i < n; i++) tasks.Add(Task.Run(() => Work(i)));')} — the C# compiler hoists ${C('i')} into a closure object allocated <b>once</b> outside the loop, so every lambda sees the same variable (the final value). ${C('foreach')} variables are fresh per iteration since C# 5, so ${C('foreach (var x in xs) Task.Run(() => Work(x))')} allocates a closure per iteration but captures the right value.</p>` },
      { title: 'String interpolation is lowered to a handler', html: `<p>Since C# 10, ${C('$"{id}: {name}"')} becomes calls on ${C('DefaultInterpolatedStringHandler')}: ${C('AppendFormatted<int>(id)')} with no boxing, a pooled char buffer, and one final string. Before C# 10 it was ${C('string.Format("{0}: {1}", (object)id, name)')} — boxing id and parsing the format string at run time.</p>`, code: `
static string Label(int id, string name) => $"{id}: {name}";   // no boxing of id in C# 10+` },
      { title: 'foreach over an interface allocates', html: `<p>${C('foreach (var x in (IEnumerable<int>)list)')} calls ${C('IEnumerable<int>.GetEnumerator()')}, which returns the struct enumerator <b>boxed</b> as ${C('IEnumerator<int>')} — one allocation and interface calls per element. Over the concrete ${C('List<int>')} it is a struct with direct calls. Same source, different IL.</p>`, code: `
static int SumConcrete(List<int> xs) { int s = 0; foreach (var x in xs) s += x; return s; }          // struct enumerator
static int SumInterface(IEnumerable<int> xs) { int s = 0; foreach (var x in xs) s += x; return s; }  // boxed enumerator` }
    ],
    deepDive: `<p><b>IL is verifiable and typed.</b> Although the stack holds untyped-looking values, the verifier tracks a type for each slot (int32, int64, native int, F, object reference, managed pointer). ${C('ldc.i4.s')} pushes a sign-extended 8-bit constant; short forms (${C('ldarg.0')}–${C('ldarg.3')}, ${C('ldloc.0')}–${C('ldloc.3')}) keep IL compact. A method header records ${C('maxstack')} and local signatures; exception regions (try/catch/finally/filter) are stored in a separate table, not as instructions.</p>
<p><b>callvirt on non-virtual methods.</b> C# emits ${C('callvirt')} even for non-virtual instance methods to get the free null check; the JIT turns it into a direct call plus a null check (often folded into the first memory access). ${C('constrained.')} prefixes let generic code call interface methods on value types without boxing.</p>
<p><b>Roslyn optimisations are modest.</b> The C# compiler folds constants, removes dead branches on constant conditions and picks short forms, but leaves almost all optimisation to the JIT: inlining, register allocation, loop optimisations, devirtualization. That split is why IL from Release builds still "looks naive", and why you must look at the JIT's assembly (sharplab, ${C('DOTNET_JitDisasm')}) to judge performance.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can paste IL or assembly and ask for an explanation line by line. <b>Use AI as a partner:</b> <code>Explain where this method allocates, based on its IL</code>. <b>Where AI goes wrong:</b> it reads Debug IL (with nops and extra locals) as if it were Release, assumes Roslyn performs inlining, or invents opcodes. <b>What you must still own:</b> checking with real tools (sharplab, ILSpy, ${C('DOTNET_JitDisasm')}) and connecting IL patterns (box, newobj, callvirt) to measured costs.</p>`,
    problems: [{
      title: 'Evaluate a Tiny IL Method',
      level: 'Easy', tags: ['IL', 'stack machine', 'simulation'], companies: ['Microsoft', 'JetBrains'],
      statement: `<p>Simulate a subset of IL on an evaluation stack of ${C('int')}s. Instructions: ${C('ldarg.0')}, ${C('ldc.i4 N')}, ${C('add')}, ${C('sub')}, ${C('mul')}, ${C('div')}, ${C('neg')}, ${C('dup')}, ${C('pop')}, ${C('ret')}. Arithmetic is unchecked (wraps), ${C('sub')} and ${C('div')} compute second-from-top op top. Return the value returned by ${C('ret')} as a string, or ${C('"invalid"')} on stack underflow, division by zero, an unknown instruction, a ${C('ret')} with an empty stack, or no ${C('ret')}.</p>`,
      constraints: `Up to 1000 instructions; N fits in int.`,
      example: `<p>${C('["ldarg.0", "ldc.i4 2", "mul", "ldc.i4 3", "add", "ret"]')} with arg0 = 5 → ${H.c('g', '"13"')}</p>`,
      brute: { why: `<p>Translating each instruction into C# source and compiling it would work but is absurdly heavy. The point of IL is that a simple loop with a stack can execute it — exactly what an interpreter (or the first step of a JIT, which builds an IR from the stack operations) does.</p>`, code: `
static class Strings
{
    public static string Describe(string[] il) => string.Join(" ; ", il);   // no evaluation at all
}` },
      mcq: { q: 'For <code>ldc.i4 7; ldc.i4 2; sub</code>, what is pushed?', options: ['5 (second-from-top minus top)', '-5', '9', '2'], answer: 0, explain: 'Binary IL operators pop value2 (top) then value1 and push value1 op value2: 7 - 2.' },
      hints: [`<p>Hint 1: use a ${C('Stack<int>')}; check ${C('Count')} before every pop.</p>`, `<p>Hint 2: for binary ops pop ${C('b')} (top) first, then ${C('a')}, and push ${C('a op b')}; wrap with ${C('unchecked')}.</p>`, `<p>Hint 3: ${C('int.MinValue / -1')} throws ${C('OverflowException')} in .NET even in unchecked code — treat it as invalid as well (the CLR's ${C('div')} raises ArithmeticException there).</p>`],
      tests: { sig: 'string[] int -> string', fn: 'runIL', cases: [
        [[['ldarg.0', 'ldc.i4 2', 'mul', 'ldc.i4 3', 'add', 'ret'], 5], '13'],
        [[['ldc.i4 7', 'ldc.i4 2', 'sub', 'ret'], 0], '5'],
        [[['ldarg.0', 'dup', 'mul', 'ret'], -4], '16'],
        [[['ldarg.0', 'neg', 'ret'], -2147483648], '-2147483648'],
        [[['ldc.i4 2147483647', 'ldc.i4 1', 'add', 'ret'], 0], '-2147483648'],
        [[['ldc.i4 1', 'ldc.i4 0', 'div', 'ret'], 0], 'invalid'],
        [[['add', 'ret'], 0], 'invalid'],
        [[['ldc.i4 1', 'pop', 'ret'], 0], 'invalid'],
        [[['ldc.i4 9'], 0], 'invalid'],
        [[['ldc.i4 -7', 'ldc.i4 2', 'div', 'ret', 'ldc.i4 1'], 0], '-3'],
        [[['ldarg.0', 'nop', 'ret'], 1], 'invalid']
      ] },
      solution: {
        approach: `<p>A direct interpreter: one switch per instruction over a ${C('Stack<int>')}, returning at the first ${C('ret')}. Errors are detected before they corrupt the state. This mirrors how the JIT "imports" IL: it walks the instructions, simulating the stack to build expression trees of its internal IR.</p>`,
        code: `
public class Solution
{
    public static string RunIL(string[] il, int arg0)
    {
        var st = new Stack<int>();
        foreach (string ins in il)
        {
            string[] p = ins.Split(' ');
            switch (p[0])
            {
                case "ldarg.0": st.Push(arg0); break;
                case "ldc.i4" when p.Length == 2 && int.TryParse(p[1], out int n): st.Push(n); break;
                case "dup": if (st.Count < 1) return "invalid"; st.Push(st.Peek()); break;
                case "pop": if (st.Count < 1) return "invalid"; st.Pop(); break;
                case "neg": if (st.Count < 1) return "invalid"; st.Push(unchecked(-st.Pop())); break;
                case "add" or "sub" or "mul" or "div":
                    if (st.Count < 2) return "invalid";
                    int b = st.Pop(), a = st.Pop();
                    if (p[0] == "div" && (b == 0 || (a == int.MinValue && b == -1))) return "invalid";
                    st.Push(p[0] switch { "add" => unchecked(a + b), "sub" => unchecked(a - b), "mul" => unchecked(a * b), _ => a / b });
                    break;
                case "ret": return st.Count >= 1 ? st.Pop().ToString() : "invalid";
                default: return "invalid";
            }
        }
        return "invalid";
    }
}`,
        dry: { head: ['instruction', 'stack after'], rows: [['ldarg.0', '[5]'], ['ldc.i4 2', '[5, 2]'], ['mul', '[10]'], ['ldc.i4 3', '[10, 3]'], ['add', '[13]'], ['ret', 'returns 13']] },
        complexity: `<p>O(I) for I instructions, O(I) stack space in the worst case.</p>`,
        followUps: ['Add locals (<code>stloc.0</code>/<code>ldloc.0</code>) and branches (<code>br</code>, <code>brtrue</code>) — see the practice set.', 'Compute the maximum stack depth (what the compiler writes as .maxstack).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — JIT tiers, PGO, ReadyToRun, Native AOT
     ====================================================================== */
  topics.push({
    title: 'The JIT: Tiered Compilation, Dynamic PGO, ReadyToRun and Native AOT',
    analogy: `<p>A new restaurant opens. On day one the chef cooks every dish <b>quickly and plainly</b> so nobody waits (Tier0). He keeps a tally of what people order. The dishes ordered thirty times get a <b>proper recipe</b> worked out in the back kitchen — tuned to what customers actually ask for, "most people want it without onions" (Tier1 with profile-guided optimisation) — and from then on those dishes come out perfect. A chain restaurant instead ships <b>pre-cooked meals</b> to start fast (ReadyToRun), still re-cooking the popular ones fresh. A food truck cooks everything in advance and has no kitchen on board at all (Native AOT): instant service, but no improvising.</p>`,
    explain: `<p>The JIT (RyuJIT) compiles IL to machine code the first time a method is called. Since .NET Core 3.0 it does so in <b>tiers</b>, trading start-up time against steady-state speed.</p>
<h4>1. The tiers</h4>
${H.table(['Tier', 'When', 'Quality', 'Notes'], [
  ['Tier0', 'first call', 'minimal optimisation, compiled fast', 'no inlining; instrumented to count calls (and, with PGO, to record types and branches)'],
  ['OSR (on-stack replacement)', 'a Tier0 method with a hot loop', 'optimised', 'switches a running method to optimised code in the middle of the loop (.NET 7+)'],
  ['Tier1', 'after ~30 calls (plus a short delay after start-up)', 'fully optimised', 'recompiled in the background; callers are patched to the new code'],
  ['Full opt immediately', C('[MethodImpl(MethodImplOptions.AggressiveOptimization)]') + ' or tiering disabled', 'optimised, but no PGO data', 'skips tiering completely']
])}
<h4>2. Dynamic PGO (on by default in .NET 8)</h4>
<p>Tier0 code is instrumented: it records which concrete types reach a virtual or interface call and which branches are taken. Tier1 uses that profile for <b>guarded devirtualization</b> — ${C('if (obj.GetType() == typeof(List<int>)) { inlined List code } else { interface call }')} — hot/cold block layout and better inlining. This is a big reason .NET 8 is faster than .NET 6 on unchanged code.</p>
<h4>3. ReadyToRun (R2R)</h4>
<p>${C('dotnet publish -p:PublishReadyToRun=true')} precompiles IL to native code inside the assembly. The app starts faster (less JIT work), but R2R code is version-resilient and less optimised (no cross-assembly inlining assumptions), so hot R2R methods are still re-jitted at Tier1. The BCL itself ships as R2R.</p>
<h4>4. Native AOT</h4>
<p>${C('-p:PublishAot=true')} compiles the whole app ahead of time into one native executable with no JIT at run time: fastest start-up, small memory, no IL needed on disk. Trade-offs: no dynamic code generation (${C('Reflection.Emit')}, run-time ${C('MakeGenericType')} over value types), trimming warnings must be fixed, no tiered/PGO improvements, and some libraries are not compatible yet.</p>
${H.table(['Mode', 'Start-up', 'Peak throughput', 'Dynamic code', 'Typical use'], [
  ['JIT + tiering + PGO (default)', 'ok', 'best', 'yes', 'servers, long-running services'],
  ['ReadyToRun + tiering', 'better', 'best (after re-jit)', 'yes', 'desktop apps, large services, containers'],
  ['Native AOT', 'best', 'good (no PGO)', 'no', 'CLI tools, serverless, small microservices']
])}`,
    clues: ['slow <b>start-up</b> or first request ("cold start") → JIT cost: R2R, AOT, fewer generic instantiations', 'a benchmark that is slow for the first iterations and then fast → tiering; warm up properly', '"the code got faster after an upgrade with no changes" → dynamic PGO', 'serverless or CLI tool where milliseconds of start-up matter → Native AOT'],
    code: [{ lang: 'csharp', run: true, title: 'Observing the JIT from inside the process (runnable)', code: `
using System.Diagnostics;
using System.Runtime;
using System.Runtime.CompilerServices;

Console.WriteLine($"Server GC: {GCSettings.IsServerGC}, 64-bit: {Environment.Is64BitProcess}");
Console.WriteLine($"Dynamic code supported: {RuntimeFeature.IsDynamicCodeSupported}");   // False under Native AOT

long before = System.Runtime.JitInfo.GetCompiledMethodCount();
for (int i = 0; i < 3; i++) Work(i);
long after = System.Runtime.JitInfo.GetCompiledMethodCount();
Console.WriteLine(after > before ? "JIT compiled new methods" : "nothing new compiled");

var sw = Stopwatch.StartNew();
Work(1);                                   // already compiled: no JIT cost
Console.WriteLine(sw.Elapsed.TotalMilliseconds < 1000 ? "fast second call" : "slow");

[MethodImpl(MethodImplOptions.AggressiveOptimization)]   // skips Tier0: optimised immediately, no PGO data
static int Work(int x) { int s = 0; for (int i = 0; i < 1000; i++) s += i ^ x; return s; }` }],
    codeTitle: ['JIT counters'],
    viz: {
      title: 'Tiered compilation of a hot method',
      gen: function () {
        var bars = function (vals, hl) { return { type: 'bars', label: 'Time per call (relative)', values: vals, hl: hl || {} }; };
        var tbl = function (rows, hl) { return { type: 'table', label: 'Method state', columns: ['method', 'code version', 'calls'], rows: rows, hl: hl || {} }; };
        return [
          { narr: 'Process start. <code>Parse()</code> has never run: its entry point is a <b>prestub</b> that will invoke the JIT on the first call.', parts: [tbl([['Parse()', 'prestub', 0]]), note('Start-up', 'Methods are compiled lazily, one by one, on first call.')] },
          { narr: 'First call: JIT compiles a <b>Tier0</b> version quickly — no inlining, values kept in memory, plus a call counter and PGO probes.', parts: [tbl([['Parse()', 'Tier0 (instrumented)', 1]], { 0: 'cur' }), bars([9], { 0: 'bad' })] },
          { narr: 'Calls 2..29 run the Tier0 code. Each increments the counter; probes record that the <code>IEnumerable</code> argument was a <code>List&lt;int&gt;</code> 97% of the time.', parts: [tbl([['Parse()', 'Tier0 (instrumented)', 29]], { 0: 'cur' }), bars([9, 9, 9, 9], {})] },
          { narr: 'Call 30 crosses the threshold. The method is queued; a <b>background thread</b> compiles Tier1 using the profile. Callers keep using Tier0 meanwhile — no pause.', parts: [tbl([['Parse()', 'Tier0 → Tier1 queued', 30]], { 0: 'cur' }), note('Background JIT', 'Tier1 = full optimisation: inlining, register allocation, loop opts, guarded devirtualization for List&lt;int&gt;.')] },
          { narr: 'Tier1 installed: the call site is patched, later calls jump straight to the optimised code — several times faster.', parts: [tbl([['Parse()', 'Tier1 (PGO)', 31]], { 0: 'ok' }), bars([9, 9, 9, 9, 2, 2, 2], { 4: 'ok', 5: 'ok', 6: 'ok' })] },
          { narr: 'With <b>ReadyToRun</b>, the first call would have used precompiled code (no Tier0 JIT), and hot methods would still be re-jitted at Tier1. With <b>Native AOT</b>, everything is precompiled and never changes.', parts: [{ type: 'table', label: 'Same method, three deployment modes', columns: ['mode', 'first call', 'after 30 calls'], rows: [['JIT (default)', 'Tier0 JIT', 'Tier1 + PGO'], ['ReadyToRun', 'precompiled R2R', 'Tier1 + PGO'], ['Native AOT', 'precompiled', 'unchanged']] }] }
        ];
      }
    },
    examples: [
      { title: 'The first benchmark iteration is slow', html: `<p>A ${C('Stopwatch')} around the first call measures JIT time plus Tier0 code. BenchmarkDotNet runs pilot and warm-up iterations until results stabilise and reports only steady-state workload iterations — one of many reasons not to hand-roll benchmarks.</p>` },
      { title: 'AggressiveOptimization can be slower', html: `<p>Marking a hot method ${C('[MethodImpl(MethodImplOptions.AggressiveOptimization)]')} skips Tier0 — and therefore skips PGO instrumentation. The method gets optimised code immediately but no guarded devirtualization based on real types. Use it only for methods that run once with a hot loop (and OSR now covers most of those).</p>` },
      { title: 'Configuring tiering', html: `<p>Settings live in the project file or ${C('runtimeconfig.json')} / environment variables.</p>`, code: { lang: 'csharp', check: false, code: `
// .csproj properties (shown as comments for reference):
// <TieredCompilation>false</TieredCompilation>          // everything fully optimised, slower start-up, no PGO
// <TieredPGO>false</TieredPGO>                          // keep tiering, disable dynamic PGO
// <TieredCompilationQuickJitForLoops>true</...>         // default; OSR handles hot loops
// <PublishReadyToRun>true</PublishReadyToRun>           // precompile for start-up
// <PublishAot>true</PublishAot>                         // Native AOT
// Environment: DOTNET_TieredPGO=0, DOTNET_ReadyToRun=0, DOTNET_JitDisasm="Program:Work"` } }
    ],
    deepDive: `<p><b>Call counting details.</b> Tier0 methods start counting only after a short start-up delay (the runtime waits ~100 ms of no new Tier0 activity, so start-up is not slowed by background compilation). After 30 calls the method goes into a queue processed by a background thread. Methods with loops are compiled at Tier0 with OSR patchpoints; when a loop iterates many times, the runtime compiles an OSR version and transfers the live frame into it mid-execution.</p>
<p><b>Guarded devirtualization (GDV).</b> With a class profile showing one dominant type, Tier1 emits a type check and an inlined fast path. Megamorphic sites (many types) stay as normal virtual calls. Delegate calls can be devirtualized the same way. Sealing classes and using concrete types still helps because it allows <b>unguarded</b> devirtualization even without PGO (and under AOT).</p>
<p><b>Static readonly fields become constants at Tier1.</b> Because a class's static constructor has already run when Tier1 compiles a method, ${C('static readonly bool Enabled')} is read as a constant and dead branches disappear. Tier0 and R2R code cannot do this. This is why feature flags in static readonly fields are essentially free in steady state.</p>`,
    aiEra: `<p><b>What AI changes:</b> it can explain JIT disassembly and tiering logs. <b>Use AI as a partner:</b> paste ${C('DOTNET_JitDisasm')} output for Tier0 and Tier1 and ask what changed. <b>Where AI goes wrong:</b> advice from the .NET Framework era ("NGen your app", "the JIT never inlines virtual methods"), recommending ${C('AggressiveOptimization')} everywhere, or ignoring PGO. <b>What you must still own:</b> choosing a deployment mode from measured start-up and throughput numbers for your workload.</p>`,
    problems: [{
      title: 'Simulate Tiered Compilation',
      level: 'Medium', tags: ['JIT', 'tiering', 'simulation', 'hash map'], companies: ['Microsoft', 'Amazon'],
      statement: `<p>Simulate a simplified tiering policy. Every method name in ${C('calls')} is one call. A method listed in ${C('aggressive')} is compiled ${C('FullOpt')} on its first call and never changes. Otherwise it starts as ${C('R2R')} if listed in ${C('r2r')}, else ${C('Tier0')}; when its call count reaches 30 it becomes ${C('Tier1')}. Return ${C('"name=TIER(count)"')} for every called method, sorted by name (ordinal).</p>`,
      constraints: `Up to 10<sup>5</sup> calls, names are non-empty ASCII.`,
      example: `<p>30 calls to ${C('Parse')}, 2 to ${C('Main')} (R2R), 5 to ${C('Hot')} (aggressive) → ${H.c('g', '["Hot=FullOpt(5)", "Main=R2R(2)", "Parse=Tier1(30)"]')}</p>`,
      brute: { why: `<p>Re-scanning the whole call list for each distinct method to count it costs O(n·m). One dictionary pass is O(n), and a sorted output needs one sort of the distinct names.</p>`, code: `
static class Slow
{
    public static int Count(string[] calls, string m) => calls.Count(c => c == m);   // called once per method: O(n·m)
}` },
      mcq: { q: 'Why does a method marked AggressiveOptimization not benefit from dynamic PGO?', options: ['It skips Tier0, where the instrumentation that collects the profile lives', 'PGO is disabled in Release builds', 'It is always interpreted', 'PGO only applies to static methods'], answer: 0, explain: 'The profile (types at call sites, branch counts) is gathered by instrumented Tier0 code. Skipping that tier means Tier1-quality code without profile data.' },
      hints: [`<p>Hint 1: ${C('Dictionary<string, int>')} for counts, ${C('HashSet<string>')} for the two lists.</p>`, `<p>Hint 2: the tier is a function of (aggressive?, r2r?, count): FullOpt, else count ≥ 30 → Tier1, else R2R/Tier0.</p>`, `<p>Hint 3: sort with ${C('StringComparer.Ordinal')} so uppercase letters come before lowercase.</p>`],
      tests: { sig: 'string[] string[] string[] -> string[]', fn: 'tiers', cases: [
        [[{ $concat: [{ $rep: 'Parse', n: 30 }, ['Main', 'Main'], { $rep: 'Hot', n: 5 }] }, ['Main'], ['Hot']], ['Hot=FullOpt(5)', 'Main=R2R(2)', 'Parse=Tier1(30)']],
        [[[], [], []], []],
        [[{ $rep: 'A', n: 29 }, [], []], ['A=Tier0(29)']],
        [[{ $rep: 'A', n: 31 }, ['A'], []], ['A=Tier1(31)']],
        [[['b', 'B', 'a'], [], []], ['B=Tier0(1)', 'a=Tier0(1)', 'b=Tier0(1)']],
        [[{ $rep: 'X', n: 100 }, ['X'], ['X']], ['X=FullOpt(100)']],
        [[{ $rep: 'Big', n: 100000 }, [], ['Unused']], ['Big=Tier1(100000)']]
      ] },
      solution: {
        approach: `<p>Count calls in a dictionary, then map each method to its tier using the policy, and sort by ordinal name. The policy mirrors the real defaults: a 30-call threshold, R2R code replaced by Tier1 when hot, and AggressiveOptimization bypassing tiers.</p>`,
        code: `
public class Solution
{
    public static string[] Tiers(string[] calls, string[] r2r, string[] aggressive)
    {
        var counts = new Dictionary<string, int>();
        foreach (string m in calls)
            counts[m] = counts.TryGetValue(m, out int c) ? c + 1 : 1;
        var pre = new HashSet<string>(r2r);
        var fullOpt = new HashSet<string>(aggressive);
        return counts.OrderBy(kv => kv.Key, StringComparer.Ordinal)
                     .Select(kv => $"{kv.Key}={Tier(kv.Key, kv.Value)}({kv.Value})")
                     .ToArray();

        string Tier(string m, int n) =>
            fullOpt.Contains(m) ? "FullOpt" : n >= 30 ? "Tier1" : pre.Contains(m) ? "R2R" : "Tier0";
    }
}`,
        dry: { head: ['method', 'count', 'aggressive?', 'r2r?', 'tier'], rows: [['Hot', '5', 'yes', 'no', 'FullOpt'], ['Main', '2', 'no', 'yes', 'R2R'], ['Parse', '30', 'no', 'no', 'Tier1']] },
        complexity: `<p>O(n + m log m) for n calls and m distinct methods.</p>`,
        followUps: ['Model the 100 ms start-up delay: calls before time T do not count.', 'Add OSR: a Tier0 method with a loop of more than 50,000 iterations switches to "OSR".']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Object header, method table, object sizes
     ====================================================================== */
  topics.push({
    title: 'Objects in Memory: Header, Method Table and Size',
    analogy: `<p>Every parcel in a warehouse has the same two stickers before its contents: a <b>small status sticker</b> (who is handling it right now, has it been weighed — the object header) and a <b>barcode</b> pointing to the product catalogue entry (the method table: what kind of thing this is, its methods, its size). The contents follow. Even an empty box carries both stickers and has a minimum box size. Knowing this, you can estimate how much shelf space a million small parcels take — and why packing data into fewer, bigger parcels (arrays of structs) saves a lot.</p>`,
    explain: `<p>On 64-bit .NET every heap object starts with two pointer-sized words:</p>
${H.table(['Offset', 'Word', 'Contents'], [
  ['-8', '<b>Object header</b> (sync block index)', 'lock ownership (thin lock), cached hash code, or an index into the sync block table; GC bits'],
  ['0', '<b>MethodTable pointer</b>', 'the type: base size, GC layout (where references are), vtable slots, interface map'],
  ['8…', 'fields', 'laid out by the runtime (auto layout for classes)']
])}
<p>An object <b>reference</b> points at the MethodTable word, so the header sits at a negative offset. ${C('obj.GetType()')} is essentially "read the MethodTable pointer".</p>
<h4>1. Size rules (64-bit, .NET 8)</h4>
${H.table(['Object', 'Size', 'Example'], [
  ['class instance', 'max(24, 16 + fields rounded up to 8)', C('class P { int x; }') + ' → 24; three ints → 32'],
  ['boxed int', '24', C('(object)5') + ' → 24 bytes for a 4-byte value'],
  ['string of length n', '16 + 4 (length) + 2·(n + 1), rounded up to 8', C('"hello"') + ' → 32; ' + C('""') + ' is a shared singleton'],
  ['T[] of length n', '16 + 8 (length + padding) + n·sizeof(T), rounded up to 8', C('new int[3]') + ' → 40; ' + C('new int[0]') + ' → 24'],
  ['reference field', '8 bytes', 'plus the referenced object itself']
])}
<p>Why minimum 24? The GC needs room to thread a free-list entry through dead space, so even an empty class takes 24 bytes. For classes the runtime <b>reorders fields</b> (auto layout): references first, then by decreasing size, so padding happens only at the end.</p>
<h4>2. What the header is used for</h4>
<ul>
<li><b>lock</b>: a thin lock stores the owning thread id in the header; under contention it is inflated to a sync block.</li>
<li><b>Default GetHashCode</b>: ${C('RuntimeHelpers.GetHashCode(obj)')} is stored in the header after the first call (or in the sync block if the header is busy with a lock).</li>
<li><b>GC</b>: mark bits during collection.</li>
</ul>
<h4>3. Consequences</h4>
<p>A ${C('List<Point>')} of a million <b>class</b> points (two ints each) costs 24 MB of objects + 8 MB of references; as a <b>struct</b> it is 8 MB in one array. Small objects are cheap to allocate but each carries 16 bytes of overhead and adds GC work. ${C('Dictionary<int,int>')} stores entries in arrays of structs — no per-entry object — which is why it is much leaner than ${C('Dictionary<object,object>')} with boxed keys.</p>`,
    clues: ['memory usage is many times larger than "the data size" → per-object overhead (16 bytes + padding + references)', 'millions of tiny objects (nodes, boxed values, small DTOs) → consider structs/arrays', '"why does lock(obj) need a reference type?" → the header holds the lock', 'computing array/string sizes for the LOH threshold (85,000 bytes)'],
    code: [{ lang: 'csharp', run: true, title: 'Measuring object sizes with the allocation counter (runnable)', code: `
long Measure(Func<object> make)
{
    make(); make();                                        // warm up (JIT, statics)
    long before = GC.GetAllocatedBytesForCurrentThread();
    object o = make();
    long after = GC.GetAllocatedBytesForCurrentThread();
    GC.KeepAlive(o);
    return after - before;
}

Console.WriteLine($"empty class    {Measure(() => new Empty())}");        // 24
Console.WriteLine($"one int        {Measure(() => new OneInt())}");       // 24
Console.WriteLine($"three ints     {Measure(() => new ThreeInts())}");    // 32
Console.WriteLine($"byte,long,byte {Measure(() => new Mixed())}");        // 32 (fields reordered: 10 bytes)
Console.WriteLine($"boxed int      {Measure(() => (object)42)}");         // 24
Console.WriteLine($"string(5)      {Measure(() => new string('a', 5))}"); // 32
Console.WriteLine($"int[3]         {Measure(() => new int[3])}");         // 40
Console.WriteLine($"object[2]      {Measure(() => new object[2])}");      // 40

class Empty { }
class OneInt { public int A; }
class ThreeInts { public int A, B, C; }
class Mixed { public byte A; public long B; public byte C; }` }],
    codeTitle: ['Object sizes'],
    viz: {
      title: 'Memory layout of a small object',
      gen: function () {
        var mem = function (cells, hl, label) { return { type: 'array', label: label || 'Heap bytes (8-byte words)', values: cells, hl: hl || {} }; };
        return [
          { narr: '<code>class Order { int Id; long Total; byte Flags; }</code> — declared order int, long, byte.', parts: [{ type: 'code', label: 'C#', lang: 'csharp', code: 'class Order { int Id; long Total; byte Flags; }\nvar o = new Order();', hl: { 2: 'cur' } }] },
          { narr: 'Word 1 (offset −8): the <b>object header</b>. Empty now; it will hold a thin lock or a hash code if needed.', parts: [mem(['header', 'MT*', '?', '?'], { 0: 'cur' })] },
          { narr: 'Word 2 (offset 0): the <b>MethodTable pointer</b>. The reference <code>o</code> points here. It identifies the type Order.', parts: [mem(['header', 'MT*', '?', '?'], { 1: 'cur' }), note('Reference', '<code>o</code> → address of MT*')] },
          { narr: 'Fields are reordered by size: the long first, then the int, then the byte. Total 8 + 4 + 1 = 13 bytes of fields.', parts: [mem(['header', 'MT*', 'Total (8)', 'Id (4) | Flags (1) | pad (3)'], { 2: 'ok', 3: 'ok' })] },
          { narr: 'Size = 16 overhead + 13 rounded up to 16 = <b>32 bytes</b>. Declared order (int, long, byte) would have needed padding after Id; auto layout avoids it.', parts: [mem(['header', 'MT*', 'Total (8)', 'Id | Flags | pad'], {}), { type: 'vars', label: 'Size', vals: { overhead: 16, fields: 13, rounded: 16, total: 32 }, hl: { total: 'ok' } }] },
          { narr: '<code>lock (o)</code> writes the owning thread id into the header (thin lock). Under contention the runtime inflates it to a sync block entry.', parts: [mem(['thread 7 owns', 'MT*', 'Total', 'Id | Flags'], { 0: 'cur' })] }
        ];
      }
    },
    examples: [
      { title: 'Boxing a million ints', html: `<p>${C('var list = new ArrayList(); for (...) list.Add(i);')} creates a million 24-byte boxes (24 MB) plus 8 MB of references; ${C('List<int>')} stores 4 MB of ints in one array. Generic collections exist largely to avoid this.</p>` },
      { title: 'Linked list vs array', html: `<p>A ${C('LinkedList<int>')} node holds a value, three references (list, next, prev) and the header: 16 + 4 + 24 → 48 bytes per int, scattered in memory. A ${C('List<int>')} uses 4 bytes per element, contiguous — better for the cache and the GC.</p>` },
      { title: 'The LOH threshold', html: `<p>Objects of 85,000 bytes or more go to the Large Object Heap. A ${C('double[]')} reaches it at 10,622 elements: 24 + 8·10,622 = 85,000. Repeatedly allocating such arrays causes gen2 collections; pool them with ${C('ArrayPool<double>.Shared')}.</p>`, code: `
static int FirstLohLength(int elementSize) => (85_000 - 24 + elementSize - 1) / elementSize;  // double: 10622` }
    ],
    deepDive: `<p><b>MethodTable and EEClass.</b> The MethodTable holds what is needed on hot paths: base instance size, component size (for arrays/strings), flags (has finalizer, contains GC pointers), parent MT, vtable slots, and the interface map. Cold data (field descriptors, metadata tokens) lives in a separate EEClass. Virtual calls load the MT from the object, then the slot from the MT: two dependent loads plus an indirect call — which is why devirtualization matters.</p>
<p><b>Header contents.</b> The header word is shared between thin lock info (thread id + recursion count), the hash code, and a sync block index, distinguished by flag bits. If an object already has its hash code stored and is then locked, the runtime moves both into a sync block. Locking on an object you hash a lot, or on strings and types (shared across the process), is a classic mistake.</p>
<p><b>Struct size vs object size.</b> ${C('Unsafe.SizeOf<T>()')} returns the size of a value inline (e.g. 8 for ${C('(int, int)')}); boxing adds the 16-byte overhead and rounds to the minimum 24. ${C('Marshal.SizeOf')} returns the <b>unmanaged/interop</b> size, which can differ (bool is 4 bytes when marshalled) — never use it to measure managed memory.</p>`,
    aiEra: `<p><b>What AI changes:</b> it can estimate memory for a data model in seconds. <b>Use AI as a partner:</b> <code>Estimate the heap size of 1 million instances of this class on 64-bit .NET 8 and suggest a denser layout</code> — then verify with ${C('GC.GetAllocatedBytesForCurrentThread')} or a memory profiler. <b>Where AI goes wrong:</b> it forgets the header and MT pointer, uses ${C('Marshal.SizeOf')}, assumes 32-bit sizes, or claims fields stay in declared order for classes. <b>What you must still own:</b> measuring, and deciding when density is worth the loss of reference semantics.</p>`,
    problems: [{
      title: 'Compute the Size of a Class Instance',
      level: 'Easy', tags: ['CLR', 'object layout', 'memory'], companies: ['Microsoft', 'Unity', 'Jane Street'],
      statement: `<p>Given the field types of a class, return the heap size of one instance on 64-bit .NET: 16 bytes of overhead (header + MethodTable pointer) plus the fields, where the runtime reorders fields by decreasing size so that the only padding is at the end, the total is rounded up to a multiple of 8, and the minimum object size is 24. Sizes: ${C('bool')}/${C('byte')} 1, ${C('char')}/${C('short')} 2, ${C('int')}/${C('float')} 4, ${C('long')}/${C('double')}/any reference (${C('string')}, ${C('object')}) 8, ${C('decimal')} 16.</p>`,
      constraints: `0 ≤ number of fields ≤ 1000.`,
      example: `<p>${C('["byte", "long", "byte"]')} → 16 + roundup8(10) = ${H.c('g', '32')}; ${C('["int"]')} → ${H.c('g', '24')}</p>`,
      brute: { why: `<p>Laying fields out in declared order with natural alignment (byte at 0, long at 8, byte at 16 → 17 bytes → 24) over-estimates: the CLR's auto layout for classes packs larger fields first. Knowing the real rule tells you when reordering your own declarations matters (structs with sequential layout) and when it does not (classes).</p>`, code: `
static class DeclaredOrder
{
    public static int Size(int[] fieldSizes)
    {
        int off = 0;
        foreach (int s in fieldSizes) off = (off + s - 1) / s * s + s;   // align each field in declared order
        return Math.Max(24, 16 + (off + 7) / 8 * 8);
    }
}` },
      mcq: { q: 'Why is <code>new object()</code> 24 bytes and not 16?', options: ['The GC requires a minimum object size so free space can hold a free-list entry', 'There is a hidden vtable field', 'Objects are aligned to 32 bytes', 'The type name is stored in the object'], answer: 0, explain: 'Header (8) + MethodTable pointer (8) = 16, but the allocator rounds every object up to at least 24 bytes so a freed object can be turned into a free-list item.' },
      hints: [`<p>Hint 1: map each type name to its size with a switch expression.</p>`, `<p>Hint 2: because fields are sorted by size descending, every field is naturally aligned — just add the sizes.</p>`, `<p>Hint 3: ${C('Math.Max(24, 16 + (sum + 7) / 8 * 8)')}.</p>`],
      tests: { sig: 'string[] -> int', fn: 'instanceSize', cases: [
        [[['byte', 'long', 'byte']], 32],
        [[['int']], 24],
        [[[]], 24],
        [[['int', 'int', 'int']], 32],
        [[['decimal']], 32],
        [[['object', 'byte']], 32],
        [[['string', 'string', 'int', 'bool']], 40],
        [[['char', 'short', 'bool', 'byte']], 24],
        [[{ $rep: 'long', n: 1000 }], 8016]
      ] },
      solution: {
        approach: `<p>Sum the field sizes (auto layout sorts by size, so no internal padding), add the 16-byte overhead, round up to 8 and apply the 24-byte minimum.</p>`,
        code: `
public class Solution
{
    public static int InstanceSize(string[] fields)
    {
        int sum = 0;
        foreach (string f in fields)
            sum += f switch
            {
                "bool" or "byte" => 1,
                "char" or "short" => 2,
                "int" or "float" => 4,
                "decimal" => 16,
                _ => 8               // long, double and every reference type
            };
        return Math.Max(24, 16 + (sum + 7) / 8 * 8);
    }
}`,
        dry: { head: ['fields', 'sum', '16 + roundup8', 'min 24'], rows: [['byte, long, byte', '10', '16 + 16 = 32', '32'], ['int', '4', '16 + 8 = 24', '24'], ['(none)', '0', '16', '24']] },
        complexity: `<p>O(F) time for F fields, O(1) extra space.</p>`,
        followUps: ['Extend it to arrays: 24 + n·elementSize rounded up to 8.', 'Compute the size of a string of length n: 22 + 2n rounded up to 8.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Struct layout, padding, explicit layout, false sharing
     ====================================================================== */
  topics.push({
    title: 'Struct Layout: Padding, Packing, Explicit Offsets and False Sharing',
    analogy: `<p>Packing a suitcase with rules: shoes must start at a shoe-sized slot, books at a book-sized slot. Put a pair of socks, then a book, then socks again, and you leave gaps so the book can sit on its boundary. Pack the books first and the socks fill the corners: same items, smaller suitcase. Structs with <b>sequential layout</b> follow your packing order exactly, gaps included — so <b>you</b> decide how big they are.</p>`,
    explain: `<p>C# structs default to ${C('[StructLayout(LayoutKind.Sequential)]')}: fields stay in <b>declaration order</b>, each aligned to its natural alignment (its own size for primitives, up to 8), and the struct's total size is rounded up to a multiple of its largest alignment so arrays of it stay aligned. (Classes default to Auto layout and are reordered by the runtime.)</p>
${H.table(['Declaration', 'Layout', 'Size'], [
  [C('struct A { byte x; int y; byte z; }'), 'x@0, pad 3, y@4, z@8, pad 3', '12'],
  [C('struct B { int y; byte x; byte z; }'), 'y@0, x@4, z@5, pad 2', '8'],
  [C('struct C { byte a; long b; byte c; int d; }'), 'a@0, b@8, c@16, d@20', '24'],
  [C('struct E { }'), 'empty structs still occupy 1 byte', '1']
])}
<p><b>Rule of thumb:</b> declare fields from largest to smallest. In an array of a million structs, 12 vs 8 bytes is 4 MB.</p>
<h4>1. Controlling layout</h4>
${H.table(['Attribute', 'Effect', 'Use'], [
  [C('[StructLayout(LayoutKind.Sequential, Pack = 1)]'), 'no padding (alignment ≤ Pack)', 'binary file formats, wire protocols (unaligned access may be slower)'],
  [C('[StructLayout(LayoutKind.Explicit)] + [FieldOffset(n)]'), 'you choose every offset; fields may overlap', 'C-style unions, reinterpreting bits'],
  [C('[StructLayout(LayoutKind.Sequential, Size = 64)]'), 'minimum total size', 'padding to a cache line'],
  [C('[StructLayout(LayoutKind.Auto)]'), 'runtime may reorder', 'pure managed structs (not blittable for interop)'],
  [C('[InlineArray(8)]') + ' (C# 12)', 'a struct containing N elements inline', 'fixed-size buffers without unsafe code']
])}
<p>A struct that contains a reference field is laid out as Auto by the runtime even if declared Sequential (references must be at GC-known positions), and is not blittable.</p>
<h4>2. False sharing</h4>
<p>CPUs move memory in <b>64-byte cache lines</b>. If two threads update two different counters that happen to sit in the same line, every write invalidates the other core's copy: the line ping-pongs between cores and a "parallel" loop can run slower than a sequential one. Fix: give each thread's hot data its own cache line (padding to 64 or 128 bytes), or accumulate in a local variable and combine at the end.</p>`,
    clues: ['an array of millions of structs → field order changes memory and cache use', 'reading a binary header or interop with C → Sequential/Pack/Explicit', 'reinterpreting a float as its bits, or a "union" → Explicit layout (or BitConverter / MemoryMarshal)', 'a parallel loop that scales badly while updating per-thread counters → false sharing'],
    code: [{ lang: 'csharp', run: true, title: 'Padding, explicit unions, inline arrays and cache-line padding (runnable)', code: `
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

Console.WriteLine($"A {Unsafe.SizeOf<A>()}  B {Unsafe.SizeOf<B>()}  Packed {Unsafe.SizeOf<Packed>()}");  // A 12  B 8  Packed 6
Console.WriteLine($"Padded {Unsafe.SizeOf<PaddedCounter>()}");                                          // Padded 64

var u = new FloatBits { F = 1.0f };
Console.WriteLine($"1.0f bits = 0x{u.I:X8}");                                                          // 0x3F800000

var buf = new Eight();
for (int i = 0; i < 8; i++) buf[i] = i * i;
int sum = 0;
foreach (int x in buf) sum += x;            // inline arrays convert to Span<int>
Console.WriteLine($"InlineArray sum {sum}, size {Unsafe.SizeOf<Eight>()}");                           // 140, 32

struct A { public byte X; public int Y; public byte Z; }
struct B { public int Y; public byte X; public byte Z; }
[StructLayout(LayoutKind.Sequential, Pack = 1)] struct Packed { public byte X; public int Y; public byte Z; }

[StructLayout(LayoutKind.Explicit)]
struct FloatBits
{
    [FieldOffset(0)] public float F;
    [FieldOffset(0)] public uint I;        // same 4 bytes, viewed as an integer
}

[StructLayout(LayoutKind.Sequential, Size = 64)]
struct PaddedCounter { public long Value; }   // one counter per cache line

[InlineArray(8)]
struct Eight { private int _e0; }` }],
    codeTitle: ['Layout control'],
    viz: {
      title: 'Same fields, two orders: struct A vs struct B',
      gen: function () {
        var row = function (cells, hl) { return { type: 'array', label: 'bytes 0..11', values: cells, hl: hl || {} }; };
        return [
          { narr: '<code>struct A { byte X; int Y; byte Z; }</code> — sequential layout keeps this order.', parts: [row(['', '', '', '', '', '', '', '', '', '', '', ''])] },
          { narr: 'X is a byte: alignment 1, placed at offset 0.', parts: [row(['X', '', '', '', '', '', '', '', '', '', '', ''], { 0: 'cur' })] },
          { narr: 'Y is an int: it must start at a multiple of 4. Offsets 1–3 become <b>padding</b>; Y occupies 4–7.', parts: [row(['X', 'pad', 'pad', 'pad', 'Y', 'Y', 'Y', 'Y', '', '', '', ''], { 1: 'bad', 2: 'bad', 3: 'bad', 4: 'cur', 5: 'cur', 6: 'cur', 7: 'cur' })] },
          { narr: 'Z at offset 8. Total 9 bytes, but the size must be a multiple of the largest alignment (4) → <b>12</b>, so A[1].Y is aligned too.', parts: [row(['X', 'pad', 'pad', 'pad', 'Y', 'Y', 'Y', 'Y', 'Z', 'pad', 'pad', 'pad'], { 8: 'cur', 9: 'bad', 10: 'bad', 11: 'bad' }), { type: 'vars', vals: { 'sizeof(A)': 12, wasted: 6 }, hl: { wasted: 'bad' } }] },
          { narr: '<code>struct B { int Y; byte X; byte Z; }</code>: Y at 0–3, X at 4, Z at 5, 2 bytes of tail padding → <b>8</b>.', parts: [{ type: 'array', label: 'bytes 0..7', values: ['Y', 'Y', 'Y', 'Y', 'X', 'Z', 'pad', 'pad'], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 6: 'bad', 7: 'bad' } }, { type: 'vars', vals: { 'sizeof(B)': 8, wasted: 2 }, hl: { 'sizeof(B)': 'ok' } }] },
          { narr: 'For 10 million elements: A[] = 120 MB, B[] = 80 MB. Same data, 33% less memory and fewer cache misses — just by ordering fields large to small.', parts: [{ type: 'bars', label: 'MB for 10M elements', values: [120, 80], hl: { 0: 'bad', 1: 'ok' } }] }
        ];
      }
    },
    examples: [
      { title: 'Reading a binary header with Pack = 1', html: `<p>A file format defines a 7-byte header: a 1-byte version, a 4-byte length, a 2-byte flags field. With default packing the struct would be 12 bytes and not match the file. ${C('Pack = 1')} plus ${C('MemoryMarshal.Read<Header>(span)')} maps it exactly (mind the endianness).</p>`, code: `
using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential, Pack = 1)]
struct Header { public byte Version; public int Length; public short Flags; }

static class Hdr
{
    public static Header Read(ReadOnlySpan<byte> data) => MemoryMarshal.Read<Header>(data);   // 7 bytes, no copy loop
}` },
      { title: 'False sharing in a parallel count', html: `<p>${C('long[] counts = new long[Environment.ProcessorCount]; Parallel.For(..., i => counts[thread]++)')}: neighbouring longs share a cache line, so cores fight over it. Padding each slot to 64 bytes (or using a local accumulator per task with ${C('Parallel.For')}'s localInit/localFinally overload) can make it several times faster on many-core machines.</p>` },
      { title: 'Readonly structs and defensive copies', html: `<p>Calling a method on a struct stored in a ${C('readonly')} field or passed as ${C('in')} makes the compiler copy it first (a <b>defensive copy</b>) unless the struct or the method is ${C('readonly')}. For large structs that copy is real work; mark structs ${C('readonly struct')} when possible.</p>`, code: `
readonly struct Big
{
    public readonly long A, B, C, D;
    public Big(long a) { A = a; B = a; C = a; D = a; }
    public long Sum() => A + B + C + D;      // readonly struct: no defensive copy on in/readonly access
}` }
    ],
    deepDive: `<p><b>Alignment rules in detail.</b> In sequential layout each field is placed at the next offset that is a multiple of min(field alignment, Pack); a nested struct's alignment is its largest field alignment. The struct's size is rounded to a multiple of its alignment. ${C('decimal')} has 8-byte alignment on 64-bit although it is 16 bytes. ${C('bool')} is 1 byte managed but 4 bytes when marshalled (Win32 BOOL) — another reason ${C('Marshal.SizeOf')} differs from ${C('Unsafe.SizeOf')}.</p>
<p><b>Blittable types</b> have identical managed and unmanaged layouts (no references, no bool/char marshalling surprises). They can be pinned and passed to native code without copying, and reinterpreted with ${C('MemoryMarshal.Cast<TFrom, TTo>')}. Generic code can require this with the ${C('unmanaged')} constraint.</p>
<p><b>Cache lines and prefetching.</b> Modern x64 cores use 64-byte lines, but adjacent-line prefetchers effectively pair lines, which is why the BCL pads hot fields to 128 bytes in some concurrent types (for example the head and tail indices of ${C('ConcurrentQueue')} segments). Measure on the target hardware: the effect of false sharing grows with core count and is invisible on a laptop with two cores.</p>`,
    aiEra: `<p><b>What AI changes:</b> it reorders struct fields and computes sizes instantly. <b>Use AI as a partner:</b> ask for the layout table (offsets, padding) of your structs, then verify with ${C('Unsafe.SizeOf<T>()')}. <b>Where AI goes wrong:</b> it applies class auto-layout rules to structs, forgets tail padding, recommends ${C('Pack = 1')} everywhere (unaligned access is slower and can tear atomic writes), or uses ${C('Marshal.SizeOf')} for managed sizes. <b>What you must still own:</b> deciding when layout matters (hot arrays, interop) and measuring false sharing on real hardware.</p>`,
    problems: [{
      title: 'Sequential Struct Size with Padding',
      level: 'Medium', tags: ['struct layout', 'alignment', 'padding'], companies: ['Microsoft', 'Unity', 'NVIDIA'],
      statement: `<p>Given the field types of a struct with default sequential layout, return its size in bytes: each field is placed at the next offset that is a multiple of its alignment, and the total is rounded up to a multiple of the largest alignment. An empty struct has size 1. Types and (size, alignment): ${C('bool')}/${C('byte')} (1, 1), ${C('char')}/${C('short')} (2, 2), ${C('int')}/${C('float')} (4, 4), ${C('long')}/${C('double')} (8, 8). Also return the best size achievable by reordering, as ${C('"declared best"')}.</p>`,
      constraints: `0 ≤ number of fields ≤ 1000.`,
      example: `<p>${C('["byte", "int", "byte"]')} → ${H.c('g', '"12 8"')}</p>`,
      brute: { why: `<p>Trying every permutation to find the best order is O(n!·n). Sorting by alignment descending is provably optimal for power-of-two alignments: every field then starts at an offset that is already a multiple of its alignment, so only tail padding remains.</p>`, code: `
static class Perms
{
    // Exponential: enumerates every order of the fields.
    public static IEnumerable<int[]> All(int[] a) =>
        a.Length <= 1 ? new[] { a } : a.SelectMany((x, i) => All(a.Where((_, j) => j != i).ToArray()).Select(r => r.Prepend(x).ToArray()));
}` },
      mcq: { q: 'Why is <code>struct { byte X; int Y; byte Z; }</code> 12 bytes rather than 9?', options: ['Y needs 4-byte alignment (3 bytes of padding after X) and the size is rounded to a multiple of 4 for arrays', 'Every field takes 4 bytes', 'The struct header adds 3 bytes', 'Bytes are stored as ints'], answer: 0, explain: 'X@0, padding 1–3, Y@4–7, Z@8, then 3 bytes of tail padding so that consecutive elements in an array keep Y aligned.' },
      hints: [`<p>Hint 1: ${C('offset = (offset + align - 1) / align * align')} before placing each field.</p>`, `<p>Hint 2: track the maximum alignment; round the final offset up to it.</p>`, `<p>Hint 3: for the best size, sort sizes descending and reuse the same function.</p>`],
      tests: { sig: 'string[] -> string', fn: 'structSizes', cases: [
        [[['byte', 'int', 'byte']], '12 8'],
        [[['int', 'byte', 'byte']], '8 8'],
        [[['byte', 'long', 'byte', 'int']], '24 16'],
        [[[]], '1 1'],
        [[['short', 'byte']], '4 4'],
        [[['double', 'int', 'short', 'byte', 'bool']], '16 16'],
        [[['bool', 'double', 'bool', 'double', 'bool']], '40 24'],
        [[['char']], '2 2']
      ] },
      solution: {
        approach: `<p>Simulate the layout algorithm: align, place, track the maximum alignment, round the end. The optimal order is by decreasing alignment.</p>`,
        code: `
public class Solution
{
    public static string StructSizes(string[] fields)
    {
        int[] sizes = fields.Select(f => f switch
        {
            "bool" or "byte" => 1,
            "char" or "short" => 2,
            "int" or "float" => 4,
            _ => 8
        }).ToArray();
        return $"{Layout(sizes)} {Layout(sizes.OrderByDescending(s => s).ToArray())}";
    }

    static int Layout(int[] sizes)
    {
        if (sizes.Length == 0) return 1;
        int offset = 0, maxAlign = 1;
        foreach (int s in sizes)
        {
            offset = (offset + s - 1) / s * s;   // primitive alignment = size
            offset += s;
            maxAlign = Math.Max(maxAlign, s);
        }
        return (offset + maxAlign - 1) / maxAlign * maxAlign;
    }
}`,
        dry: { head: ['field', 'aligned offset', 'end'], rows: [['byte', '0', '1'], ['long', '8', '16'], ['byte', '16', '17'], ['int', '20', '24'], ['round to 8', '—', '24']] },
        complexity: `<p>O(n log n) for the sort, O(n) for each layout pass.</p>`,
        followUps: ['Add <code>Pack = k</code>: alignment becomes min(size, k).', 'Support nested structs whose alignment is their largest field.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Inlining, devirtualization, bounds checks
     ====================================================================== */
  var T5_CODE = [
    'static int Sum(int[] a)',
    '{',
    '    int s = 0;',
    '    for (int i = 0; i < a.Length; i++)   // JIT proves 0 <= i < a.Length',
    '        s += a[i];                        // -> no bounds check here',
    '    return s;',
    '}',
    'static int Sum2(int[] a, int n)',
    '{',
    '    int s = 0;',
    '    for (int i = 0; i < n; i++)           // n unrelated to a.Length',
    '        s += a[i];                        // -> bounds check every iteration',
    '    return s;',
    '}'
  ].join('\n');
  topics.push({
    title: 'What the JIT Optimises: Inlining, Devirtualization and Bounds Checks',
    analogy: `<p>A manager who forwards every tiny question to a colleague ("ask Priya what 2 + 2 is") wastes time on the forwarding, not the question. A good manager just answers small questions herself — <b>inlining</b>. If she knows exactly which team handles a request, she skips the switchboard — <b>devirtualization</b>. And if she has already checked that a visitor's badge is valid for the whole building, she stops checking it at every door — <b>bounds-check elimination</b>. The JIT does all three, but only when it can <b>prove</b> they are safe. Your code shape decides what it can prove.</p>`,
    explain: `<h4>1. Inlining</h4>
<p>The JIT copies the body of a small callee into the caller, removing call overhead and — more importantly — exposing the code to further optimisations (constant folding, range checks, register allocation across the old call boundary). Heuristics: small IL size (roughly ≤ 16 bytes always considered, larger only if profitable), no exception handling regions in the callee (relaxed in recent versions), not recursive, not virtual unless devirtualized. Properties and tiny helpers are almost always inlined.</p>
${H.table(['Attribute', 'Effect'], [
  [C('[MethodImpl(MethodImplOptions.AggressiveInlining)]'), 'raise the size budget; the JIT may still refuse (e.g. huge or recursive)'],
  [C('[MethodImpl(MethodImplOptions.NoInlining)]'), 'never inline (used to keep a cold throw helper out of a hot method)']
])}
<p><b>Throw helpers:</b> a ${C('throw new ArgumentException(...)')} inside a small method makes it bigger and less likely to inline. The BCL moves throws into separate ${C('ThrowHelper')} methods (or uses ${C('ArgumentNullException.ThrowIfNull')}), keeping the hot path tiny.</p>
<h4>2. Devirtualization</h4>
<p>A virtual or interface call can become a direct call (and then be inlined) when the JIT knows the exact type: the class or method is ${C('sealed')}, the object was just created with ${C('new')}, the static type is a struct (generic instantiation over value types), or <b>dynamic PGO</b> observed one dominant type and emits a guarded fast path. Sealing classes that are not designed for inheritance is a free performance win (.NET 8 analyzers suggest it: CA1852).</p>
<h4>3. Bounds-check elimination (BCE)</h4>
<p>Every ${C('a[i]')} on an array or span checks ${C('(uint)i < (uint)a.Length')}. The JIT removes the check when it can prove the index is in range: the canonical ${C('for (int i = 0; i < a.Length; i++)')} loop, ${C('foreach')} over arrays and spans, or after an explicit earlier check (${C('if ((uint)i < (uint)a.Length)')}). Looping to an unrelated ${C('n')} keeps the check. Copying a field array to a local first also helps, because the JIT cannot assume a field does not change during the loop.</p>
<h4>4. Other optimisations worth knowing</h4>
<ul>
<li>Constant folding and ${C('static readonly')} fields treated as constants at Tier1.</li>
<li>Loop-invariant code hoisting, loop cloning (a fast copy of the loop without checks when a runtime test passes).</li>
<li>Struct promotion: small struct locals are split into registers.</li>
<li>Escape analysis is limited in .NET 8 — objects are still heap allocated even when they never escape (.NET 9/10 add object stack allocation in some cases).</li>
<li>Vectorization is <b>not</b> automatic for your loops; the BCL uses ${C('Vector128/256')} explicitly, so ${C('span.IndexOf')}, ${C('Sum')}, ${C('SequenceEqual')} beat hand-written loops.</li>
</ul>`,
    clues: ['a tight loop over arrays/spans → is the bounds check eliminated? loop to <code>a.Length</code>', 'a small hot method that does not get faster with AggressiveInlining → a throw or try/catch inside it', 'interface calls in a hot path → sealed types, generics over structs, or rely on PGO', 'hand-written search/compare loops → use the vectorized BCL methods (<code>IndexOf</code>, <code>SequenceEqual</code>)'],
    code: [{ lang: 'csharp', run: true, title: 'Code shapes that help the JIT (runnable)', code: `
using System.Runtime.CompilerServices;

int[] data = Enumerable.Range(1, 1000).ToArray();
Console.WriteLine(SumBce(data));                       // 500500
Console.WriteLine(SumSpan(data));                      // 500500
Console.WriteLine(data.AsSpan().IndexOf(777));         // 776   (vectorized BCL search)
Console.WriteLine(Clamp(150, 0, 100));                 // 100
Shape s = new Square(3);
Console.WriteLine(s.Area());                           // 9    (sealed: devirtualizable)
try { Checked(-1); } catch (ArgumentOutOfRangeException) { Console.WriteLine("thrown from helper"); }

static int SumBce(int[] a)
{
    int s = 0;
    for (int i = 0; i < a.Length; i++) s += a[i];      // bounds check eliminated
    return s;
}

static int SumSpan(ReadOnlySpan<int> a)
{
    int s = 0;
    foreach (int x in a) s += x;                       // no bounds checks, no enumerator object
    return s;
}

[MethodImpl(MethodImplOptions.AggressiveInlining)]
static int Clamp(int v, int lo, int hi) => v < lo ? lo : v > hi ? hi : v;

static int Checked(int i)
{
    if (i < 0) ThrowNegative();                        // cold path moved out: Checked stays tiny
    return i * 2;
}

[MethodImpl(MethodImplOptions.NoInlining)]
static void ThrowNegative() => throw new ArgumentOutOfRangeException("i");

abstract class Shape { public abstract int Area(); }
sealed class Square(int side) : Shape { public override int Area() => side * side; }` }],
    codeTitle: ['JIT-friendly code'],
    viz: {
      title: 'Where bounds checks stay and where they disappear',
      gen: function () {
        return codeFrames(T5_CODE, [
          { l: [1, 3], narr: 'A loop from 0 to <code>a.Length</code>.' },
          { l: 4, v: { i: '0 … a.Length-1' }, narr: 'The JIT sees <code>i</code> starts at 0, increases by 1, and the loop condition is <code>i &lt; a.Length</code> on the same array (a local/parameter that cannot change).' },
          { l: 5, cls: 'ok', v: { 'bounds check': 'removed' }, hv: { 'bounds check': 'ok' }, narr: 'So <code>a[i]</code> is provably in range: the comparison and the jump to <code>RNGCHKFAIL</code> are removed. The loop body is a load and an add.', extra: [{ type: 'code', label: 'x64 (sketch)', lang: 'csharp', code: 'loop:\n  add eax, [rdx+rcx*4+16]\n  inc ecx\n  cmp ecx, r8d\n  jl loop' }] },
          { l: [8, 11], v: { i: '0 … n-1' }, narr: 'Second method: the loop runs to <code>n</code>, which has no proven relation to <code>a.Length</code>.' },
          { l: 12, cls: 'bad', v: { 'bounds check': 'kept' }, hv: { 'bounds check': 'bad' }, narr: 'Every iteration must check <code>(uint)i &lt; (uint)a.Length</code>. Cheap per iteration (well predicted), but it also blocks other optimisations such as loop unrolling.', extra: [{ type: 'code', label: 'x64 (sketch)', lang: 'csharp', code: 'loop:\n  cmp ecx, [rdx+8]      ; a.Length\n  jae RNGCHKFAIL\n  add eax, [rdx+rcx*4+16]\n  inc ecx\n  cmp ecx, r8d\n  jl loop' }] },
          { l: 11, narr: 'Fix: slice first — <code>var span = a.AsSpan(0, n);</code> checks once, then <code>foreach</code> over the span has no checks; or loop to <code>Math.Min(n, a.Length)</code> and index a span of that length.' }
        ]);
      }
    },
    examples: [
      { title: 'Field arrays inside loops', html: `<p>${C('for (int i = 0; i < _items.Length; i++) Total += _items[i];')} reads the field ${C('_items')} each iteration and the JIT must assume another thread or a call could replace it, so the bounds check stays and the length is reloaded. ${C('var items = _items;')} as a local first lets the JIT eliminate both.</p>` },
      { title: 'The (uint) trick', html: `<p>${C('if ((uint)index >= (uint)array.Length) throw ...')} checks both ${C('index < 0')} and ${C('index >= Length')} with one comparison (a negative int becomes a huge uint), and afterwards the JIT knows ${C('array[index]')} is safe.</p>`, code: `
static int GetOrDefault(int[] a, int i) => (uint)i < (uint)a.Length ? a[i] : -1;` },
      { title: 'Generic over structs devirtualizes', html: `<p>${C('static int Total<T>(T calc) where T : struct, ICalc')} is compiled separately for each struct T, so ${C('calc.Compute()')} is a direct (inlinable) call. Passing an ${C('ICalc')} interface instead means boxing and an interface call. This is how high-performance libraries pass comparers and hashers.</p>`, code: `
interface ICalc { int Compute(int x); }
readonly struct Doubler : ICalc { public int Compute(int x) => x * 2; }
static class Runner
{
    public static int Total<T>(int[] xs, T calc) where T : struct, ICalc
    {
        int s = 0;
        foreach (int x in xs) s += calc.Compute(x);   // direct call, inlined per struct T
        return s;
    }
}` }
    ],
    deepDive: `<p><b>Inliner economics.</b> The JIT estimates the callee's native size and the benefit (constant arguments, call site in a loop, profile weight) against a budget; with PGO it prefers hot call sites. Methods with ${C('stackalloc')}, very large structs, or explicit tail calls may not inline. You can see decisions with ${C('DOTNET_JitStdOutFile')} plus ${C('DOTNET_JitDisasmSummary')}/${C('JitDisasm')} in Release builds of .NET 8, or the "Inlining" diagnostics in BenchmarkDotNet's ${C('[DisassemblyDiagnoser]')}.</p>
<p><b>Loop cloning.</b> When the JIT cannot prove bounds statically, it may clone the loop: a runtime test (${C('n <= a.Length')}) selects a fast version without checks, else the slow original. This is why some loops are fast "most of the time".</p>
<p><b>Spans and refs.</b> ${C('Span<T>')} indexing is bounds-checked like arrays, and ${C('foreach')} over spans has none. ${C('MemoryMarshal.GetReference')} + ${C('Unsafe.Add')} removes checks entirely but gives up safety — reserve for measured hot spots, and prefer vectorized BCL APIs which already do this carefully.</p>`,
    aiEra: `<p><b>What AI changes:</b> it can annotate a loop with likely JIT behaviour and propose micro-optimisations. <b>Use AI as a partner:</b> ask it to rewrite a loop to be bounds-check friendly, then confirm with ${C('[DisassemblyDiagnoser]')}. <b>Where AI goes wrong:</b> sprinkling ${C('AggressiveInlining')} everywhere (bloats code, can slow down), recommending ${C('unsafe')} pointers for trivial gains, or claiming the JIT auto-vectorizes loops. <b>What you must still own:</b> measuring before and after, and keeping code readable unless the profile proves a hot spot.</p>`,
    problems: [{
      title: 'Branch-Free Lower Bound',
      level: 'Medium', tags: ['binary search', 'branchless', 'JIT'], companies: ['Jane Street', 'Citadel', 'Microsoft'],
      statement: `<p>Return the number of elements of a sorted array that are strictly less than ${C('x')} (the lower-bound index). Implement it as a <b>branch-free</b> binary search: keep a base index and a remaining length, and in each step move the base forward by half the length using a conditional expression that the JIT can compile to a ${C('cmov')} — no early exit, a fixed number of iterations for a given length.</p>`,
      constraints: `0 ≤ n ≤ 10<sup>6</sup>, array sorted ascending (duplicates allowed), values are any int.`,
      example: `<p>${C('[1, 3, 3, 5, 8], x = 3')} → ${H.c('g', '1')}; ${C('x = 4')} → ${H.c('g', '3')}</p>`,
      brute: { why: `<p>A linear scan is O(n). A classic binary search with ${C('if (a[mid] < x) lo = mid + 1; else hi = mid;')} is O(log n) but has a data-dependent, unpredictable branch: on random queries the CPU mispredicts about half the time (~15 cycles each). The branch-free form does the same comparisons with a conditional move.</p>`, code: `
static class Linear
{
    public static int Count(int[] a, int x) { int c = 0; foreach (int v in a) if (v < x) c++; return c; }
}` },
      mcq: { q: 'Why can a branch-free binary search be faster than the classic one on random queries?', options: ['It avoids unpredictable branches; mispredictions cost more than the extra iteration', 'It does fewer comparisons', 'It skips bounds checks automatically', 'It uses SIMD'], answer: 0, explain: 'Both do about log2(n) comparisons. The classic version branches on data the predictor cannot guess; a conditional move has no misprediction penalty.' },
      hints: [`<p>Hint 1: ${C('int b = 0, len = a.Length; while (len > 1) { int half = len / 2; ... len -= half; }')}</p>`, `<p>Hint 2: inside: ${C('b = a[b + half - 1] < x ? b + half : b;')} — a select, not an if/else with different work.</p>`, `<p>Hint 3: after the loop, one more step: if ${C('len == 1 && a[b] < x')} then ${C('b + 1')}; handle the empty array first.</p>`],
      tests: { sig: 'int[] int -> int', fn: 'lowerBound', cases: [
        [[[1, 3, 3, 5, 8], 3], 1],
        [[[1, 3, 3, 5, 8], 4], 3],
        [[[], 5], 0],
        [[[7], 7], 0],
        [[[7], 8], 1],
        [[[1, 3, 3, 5, 8], 100], 5],
        [[[1, 3, 3, 5, 8], -100], 0],
        [[[-2147483648, 0, 2147483647], 2147483647], 2],
        [[{ $range: [0, 1000000] }, 765432], 765432],
        [[{ $rep: 4, n: 1000 }, 4], 0]
      ] },
      solution: {
        approach: `<p>Maintain an interval [b, b + len) known to contain the answer. Each step halves len and conditionally advances b — the condition only chooses a value, it does not choose different code, so the JIT can emit ${C('cmov')}. The loop runs ⌈log2 n⌉ times regardless of data.</p>`,
        code: `
public class Solution
{
    public static int LowerBound(int[] a, int x)
    {
        if (a.Length == 0) return 0;
        int b = 0, len = a.Length;
        while (len > 1)
        {
            int half = len / 2;
            b = a[b + half - 1] < x ? b + half : b;   // select, no data-dependent branch
            len -= half;
        }
        return a[b] < x ? b + 1 : b;
    }
}`,
        dry: { head: ['b', 'len', 'half', 'a[b+half-1]', 'new b'], rows: [['0', '5', '2', 'a[1] = 3 < 4', '2'], ['2', '3', '1', 'a[2] = 3 < 4', '3'], ['3', '2', '1', 'a[3] = 5 ≥ 4', '3'], ['3', '1', '—', 'a[3] = 5 ≥ 4', 'answer 3']] },
        complexity: `<p>O(log n) time, O(1) space, with no unpredictable branches.</p>`,
        followUps: ['Prefetch both possible next probes for very large arrays.', 'Compare with <code>Array.BinarySearch</code> and the Eytzinger layout.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Measuring: BenchmarkDotNet
     ====================================================================== */
  topics.push({
    title: 'Measuring Correctly: BenchmarkDotNet and Benchmark Hygiene',
    analogy: `<p>Timing a sprinter once, on a cold morning, right after he got out of the car, with a hand stopwatch, tells you very little. A proper race measures him <b>warmed up</b>, <b>many times</b>, with an electronic timer, and reports the spread, not just the best run — and checks that he actually ran the full distance instead of cutting across the field. Micro-benchmarks need exactly this discipline, and <b>BenchmarkDotNet</b> is the electronic timing system of .NET.</p>`,
    explain: `<p>A naive ${C('Stopwatch')} loop is wrong in many ways at once: it includes JIT and Tier0 time, it runs in Debug or under a debugger, the result is unused so the JIT may delete the work (dead-code elimination), constants get folded, GC pauses land randomly, CPU frequency changes, and one run says nothing about variance.</p>
<h4>1. A BenchmarkDotNet benchmark</h4>
${P(`
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

[MemoryDiagnoser]                       // adds Gen0/Gen1/Gen2 collections and Allocated bytes/op
public class ConcatBench
{
    [Params(10, 1000)] public int N;   // run every benchmark for each value
    private string[] _parts = default!;

    [GlobalSetup] public void Setup() => _parts = Enumerable.Range(0, N).Select(i => i.ToString()).ToArray();

    [Benchmark(Baseline = true)]
    public string PlusConcat() { string s = ""; foreach (var p in _parts) s += p; return s; }

    [Benchmark]
    public string Builder() { var sb = new StringBuilder(); foreach (var p in _parts) sb.Append(p); return sb.ToString(); }
}

// Program.cs:  BenchmarkRunner.Run<ConcatBench>();    run with: dotnet run -c Release`)}
<h4>2. What it does for you</h4>
<ul>
<li>Builds a separate Release process per benchmark (no debugger, consistent settings), runs <b>pilot</b> iterations to choose an invocation count, then <b>warm-up</b> until stable, then measured <b>workload</b> iterations.</li>
<li>Subtracts the overhead of an empty method call, consumes return values (so returning the result defeats dead-code elimination), and computes statistics; upper outliers are removed by default.</li>
<li>Diagnosers: ${C('[MemoryDiagnoser]')} (allocations), ${C('[DisassemblyDiagnoser]')} (JIT assembly), ${C('[ThreadingDiagnoser]')}, hardware counters, ETW/EventPipe profilers.</li>
</ul>
<h4>3. Reading the summary</h4>
${H.table(['Column', 'Meaning', 'Watch out'], [
  ['Mean', 'average time per operation', 'compare with Error; tiny differences are noise'],
  ['Error', 'half of the 99.9% confidence interval', 'if the intervals of two results overlap, do not claim a difference'],
  ['StdDev', 'spread of the measurements', 'large StdDev → noisy machine or bimodal behaviour (look at the histogram)'],
  ['Median', 'robust middle value', 'Mean ≫ Median → occasional slow runs (GC, outliers)'],
  ['Ratio', 'relative to the Baseline benchmark', 'easiest way to communicate results'],
  ['Allocated', 'managed bytes allocated per operation', 'often explains time differences; 0 B is a strong goal in hot paths']
])}
<h4>4. Rules of hygiene</h4>
<p>Benchmark <b>realistic inputs</b> (sizes, distributions), return or consume results, keep setup out of the measured method, never benchmark in Debug or with a debugger, close noisy apps, compare on the same machine, and remember that a micro-benchmark only matters if a <b>profile</b> shows the code is hot in production.</p>`,
    clues: ['someone posts "X is 3× faster" from a Stopwatch loop → re-measure with BenchmarkDotNet', 'two results within each other\'s Error → no evidence of a difference', 'Mean much larger than Median → GC pauses or outliers; check Allocated', 'a result of 0.0 ns or "faster than an empty method" → the work was optimised away'],
    code: [{ lang: 'csharp', run: true, title: 'Why hand-rolled timing lies (runnable, no packages needed)', code: `
using System.Diagnostics;

int[] data = Enumerable.Range(0, 100_000).ToArray();

// 1. First call includes JIT/Tier0 time; later calls are much faster.
var t1 = Stopwatch.GetTimestamp(); SumLoop(data); var first = Stopwatch.GetElapsedTime(t1);
for (int i = 0; i < 50; i++) SumLoop(data);                       // warm up (lets tiering kick in)
var t2 = Stopwatch.GetTimestamp(); SumLoop(data); var warm = Stopwatch.GetElapsedTime(t2);
Console.WriteLine(first > TimeSpan.Zero && warm > TimeSpan.Zero ? "measured first and warm calls" : "timer too coarse");

// 2. Allocations are measurable without a profiler.
long before = GC.GetAllocatedBytesForCurrentThread();
string s = Concat(200);
long allocated = GC.GetAllocatedBytesForCurrentThread() - before;
Console.WriteLine($"length {s.Length}, allocated more than 10 KB: {allocated > 10_000}");   // True: quadratic copying

// 3. Use results so the JIT cannot delete the work.
long sink = 0;
for (int i = 0; i < 1000; i++) sink += SumLoop(data);
Console.WriteLine(sink);                                                                    // 4999950000000

static long SumLoop(int[] a) { long s = 0; foreach (int x in a) s += x; return s; }
static string Concat(int n) { string s = ""; for (int i = 0; i < n; i++) s += "x"; return s; }` }],
    codeTitle: ['Measurement pitfalls'],
    viz: {
      title: 'Iterations of a benchmark run',
      gen: function () {
        var times = [950, 410, 120, 22, 21, 20, 21, 20, 20, 21, 20, 64, 20, 21];
        var frames = [];
        frames.push({ narr: 'BenchmarkDotNet first runs <b>Jitting</b> and <b>Pilot</b> stages: the first invocation includes JIT compilation (950 ns per op here).', parts: [{ type: 'bars', label: 'ns/op per iteration', values: times.slice(0, 1), hl: { 0: 'bad' } }] });
        frames.push({ narr: 'Pilot iterations decide how many invocations make one iteration last long enough (≈ 100+ ms by default) for the timer to be precise. Tier0 code is still slow.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: times.slice(0, 3), hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }] });
        frames.push({ narr: '<b>Warm-up</b>: after enough calls the method is recompiled at Tier1. Timings drop and stabilise around 20 ns. Warm-up continues until results stop changing.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: times.slice(0, 6), hl: { 3: 'cur', 4: 'cur', 5: 'cur' } }] });
        frames.push({ narr: '<b>Workload</b> iterations are measured. One iteration hit a GC pause (64 ns) — an <b>upper outlier</b>.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: times.slice(0), hl: { 11: 'bad' } }] });
        frames.push({ narr: 'Statistics are computed on workload iterations only; upper outliers are removed by default. Mean ≈ 20.4 ns, with the 99.9% confidence half-width shown as Error.', parts: [{ type: 'table', label: 'Summary row', columns: ['Method', 'Mean', 'Error', 'StdDev', 'Allocated'], rows: [['SumLoop', '20.4 ns', '0.3 ns', '0.5 ns', '0 B']], hl: { 0: 'ok' } }] });
        frames.push({ narr: 'Compare two benchmarks by their intervals: 20.4 ± 0.3 vs 20.6 ± 0.4 overlap → <b>no evidence</b> of a difference. 20.4 ± 0.3 vs 31.0 ± 0.5 → a real 1.5× difference.', parts: [{ type: 'bars', label: 'Mean ns/op (A, B, C)', values: [20.4, 20.6, 31.0], hl: { 0: 'ok', 1: 'ok', 2: 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'The 0.01 ns benchmark', html: `<p>A benchmark ${C('public void Calc() { Math.Sqrt(42.0); }')} reports almost nothing: the result is unused and the argument is a constant, so the JIT folds and deletes it. Return the value, and read the input from a field set in ${C('[GlobalSetup]')}.</p>` },
      { title: 'Measuring the wrong thing', html: `<p>A benchmark of ${C('list.Contains(x)')} where ${C('x')} is always the first element measures the best case. Use ${C('[Params]')} for sizes and choose inputs that match production (hit/miss ratio, random positions). BenchmarkDotNet makes it easy to test several distributions side by side.</p>` },
      { title: 'Allocations explain the time', html: `<p>Typical summary: ${C('PlusConcat | N=1000 | 410 µs | Allocated 4.3 MB')} vs ${C('Builder | N=1000 | 9 µs | Allocated 12 KB')}. The repeated string copies (each ${C('+=')} allocates a new string of the full length) explain both the time and the gen0 collections.</p>` }
    ],
    deepDive: `<p><b>How BenchmarkDotNet computes Error.</b> It treats workload iteration results as a sample, computes the standard error of the mean, and multiplies by the Student t quantile for a 99.9% confidence level; Error is the half-width of that interval. With few iterations the t quantile is large, so Error is wide. Outliers are detected with Tukey fences (quartiles ± 1.5·IQR) and, by default, only <b>upper</b> outliers are removed because slow runs are usually interference (GC, OS) while fast runs are real.</p>
<p><b>Process isolation and toolchains.</b> Each benchmark case is generated into a separate project and run in its own process, so JIT decisions and static state from one case cannot contaminate another. You can compare runtimes in one run (${C('[SimpleJob(RuntimeMoniker.Net60)]')}, ${C('Net80')}, ${C('NativeAot80')}), environment variables (${C('DOTNET_TieredPGO=0')}) or GC modes.</p>
<p><b>Macro vs micro.</b> Micro-benchmarks answer "which of these implementations is faster in isolation". Production questions need macro-measurements: load tests with realistic concurrency, ${C('dotnet-counters')} for GC/CPU/thread-pool metrics, ${C('dotnet-trace')} or PerfView for CPU sampling and allocation stacks. A 2× faster method that accounts for 0.5% of CPU changes nothing.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a BenchmarkDotNet class for two implementations is instant. <b>Use AI as a partner:</b> ask it to review a benchmark for dead-code elimination, constant folding, setup inside the measured method and unrealistic inputs. <b>Where AI goes wrong:</b> it writes Stopwatch loops, forgets ${C('-c Release')}, benchmarks with a debugger attached, or declares a winner from overlapping intervals. <b>What you must still own:</b> the hypothesis, realistic data, reading Error/StdDev honestly, and checking production profiles before optimising.</p>`,
    problems: [{
      title: 'Benchmark Statistics with Upper-Outlier Removal',
      level: 'Medium', tags: ['statistics', 'benchmarking', 'sorting'], companies: ['Microsoft', 'Netflix', 'Datadog'],
      statement: `<p>Given raw iteration times (ns), remove <b>upper</b> outliers with Tukey's fence and report the rest. Definitions: sort the data; the median is the middle value (mean of the two middle values for even n); Q1 is the median of the lower half and Q3 the median of the upper half, where for odd n the overall median is excluded from both halves; IQR = Q3 − Q1; remove every value greater than Q3 + 1.5·IQR. Return ${C('"mean=M median=D removed=K"')} for the remaining values, M and D with two decimals (invariant culture). For n &lt; 4, remove nothing.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, 0 &lt; times ≤ 10<sup>9</sup>.`,
      example: `<p>${C('[10, 11, 11, 12, 12, 13, 50]')}: median 12, Q1 = 11, Q3 = 13, fence 16 → 50 removed → ${H.c('g', '"mean=11.50 median=11.50 removed=1"')}</p>`,
      brute: { why: `<p>Reporting the plain mean of all iterations lets one GC pause (or an OS hiccup) move the result by tens of percent. Removing outliers with a robust rule (quartiles are not affected by the outliers themselves) gives a stable estimate — which is why benchmark tools do it.</p>`, code: `
static class PlainMean
{
    public static double Mean(double[] t) => t.Average();   // one 50 ns outlier shifts it a lot
}` },
      mcq: { q: 'Why remove only upper outliers in micro-benchmarks?', options: ['Slow runs are usually interference (GC, OS, other processes); unusually fast runs are real', 'Fast runs are always measurement errors', 'Upper outliers are cheaper to compute', 'The median requires it'], answer: 0, explain: 'Nothing makes code run faster than it can, but many things (GC pauses, context switches) make it slower, so upper outliers are noise and lower ones are signal.' },
      hints: [`<p>Hint 1: write a helper ${C('Median(ReadOnlySpan<double> s)')} for a sorted span.</p>`, `<p>Hint 2: lower half = ${C('s[..(n / 2)]')}, upper half = ${C('s[((n + 1) / 2)..]')} — this skips the middle element when n is odd.</p>`, `<p>Hint 3: format with ${C('ToString("F2", CultureInfo.InvariantCulture)')}.</p>`],
      tests: { sig: 'double[] -> string', fn: 'benchStats', cases: [
        [[[10, 11, 11, 12, 12, 13, 50]], 'mean=11.50 median=11.50 removed=1'],
        [[[20, 21, 20, 21]], 'mean=20.50 median=20.50 removed=0'],
        [[[5]], 'mean=5.00 median=5.00 removed=0'],
        [[[1, 100, 2]], 'mean=34.33 median=2.00 removed=0'],
        [[[10, 10, 10, 10, 10, 11, 11, 12, 90, 95]], 'mean=10.50 median=10.00 removed=2'],
        [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], 'mean=5.50 median=5.50 removed=0'],
        [[[3, 1, 2, 4, 1000, 2, 3]], 'mean=2.50 median=2.50 removed=1']
      ] },
      solution: {
        approach: `<p>Sort once; compute quartiles from the sorted halves; the remaining values are a prefix of the sorted array (only upper values are removed), so the new median is computed on that prefix.</p>`,
        code: `
using System.Globalization;

public class Solution
{
    public static string BenchStats(double[] times)
    {
        double[] s = times.Order().ToArray();
        int n = s.Length, keep = n;
        if (n >= 4)
        {
            double q1 = Median(s.AsSpan(0, n / 2));
            double q3 = Median(s.AsSpan((n + 1) / 2));
            double fence = q3 + 1.5 * (q3 - q1);
            while (keep > 0 && s[keep - 1] > fence) keep--;
        }
        var kept = s.AsSpan(0, keep);
        double mean = 0;
        foreach (double t in kept) mean += t;
        mean /= keep;
        var inv = CultureInfo.InvariantCulture;
        return $"mean={mean.ToString("F2", inv)} median={Median(kept).ToString("F2", inv)} removed={n - keep}";
    }

    static double Median(ReadOnlySpan<double> s) =>
        s.Length % 2 == 1 ? s[s.Length / 2] : (s[s.Length / 2 - 1] + s[s.Length / 2]) / 2;
}`,
        dry: { head: ['step', 'value'], rows: [['sorted', '[10, 11, 11, 12, 12, 13, 50]'], ['lower / upper halves', '[10, 11, 11] / [12, 13, 50]'], ['Q1, Q3, IQR', '11, 13, 2'], ['fence', '13 + 3 = 16 → remove 50'], ['mean, median of kept', '11.50, 11.50']] },
        complexity: `<p>O(n log n) for the sort; everything else is linear.</p>`,
        followUps: ['Add the 99.9% confidence interval half-width (Student t) like BenchmarkDotNet\'s Error column.', 'Detect a bimodal distribution (two clusters) and warn.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Finding and removing allocations
     ====================================================================== */
  var T7_CODE = [
    'int threshold = 10;',
    'var big = list.Where(x => x > threshold)   // closure + delegate + iterator',
    '              .Select(x => x * 2)          // delegate (cached) + iterator',
    '              .ToList();                   // List + growing arrays',
    'object o = 42;                             // box: 24 bytes',
    'string s = "id=" + id;                      // new string',
    'Log("{0} {1}", a, b);                       // params object[] + 2 boxes'
  ].join('\n');
  topics.push({
    title: 'Allocation Profiling: Finding Hidden Allocations and Removing Them',
    analogy: `<p>A kitchen where every cook grabs a <b>fresh plate</b> for every taste test looks fine — until the dishwasher (the GC) has to stop the whole kitchen every few minutes to clear the mountain of plates. Allocation itself is cheap (grab the next plate from the stack), but every plate must be washed. The fastest kitchens <b>reuse</b> plates and avoid using one when a spoon will do. Finding where plates come from — often from habits nobody notices — is allocation profiling.</p>`,
    explain: `<p>In .NET, allocation is a pointer bump in a per-thread allocation context — a few nanoseconds. The cost comes later: more gen0 collections, objects promoted to gen1/gen2 if they live a little too long, cache pollution, and pauses. In hot paths (per request, per message, per element) <b>allocations per operation</b> is often the metric that predicts throughput and tail latency.</p>
<h4>1. Common hidden allocations</h4>
${H.table(['Source', 'Why it allocates', 'Fix'], [
  ['Boxing', 'value type → object/interface (' + C('object o = 5') + ', ' + C('IComparable c = 5') + ', ' + C('string.Format("{0}", 5)') + ' before C# 10)', 'generics, interpolated strings, ' + C('IEquatable<T>')],
  ['Closures', 'a lambda capturing locals → display class + delegate', C('static') + ' lambdas, pass state explicitly (' + C('(x, state) => ...') + ' overloads)'],
  ['LINQ', 'iterator objects, delegates, intermediate lists', 'plain loops in hot paths, or spans'],
  [C('params') + ' arrays', 'a new array per call', 'overloads for 1–3 args (BCL does this), ' + C('params ReadOnlySpan<T>') + ' in C# 13'],
  ['String building', C('+') + ' in loops, ' + C('Substring') + ', ' + C('Split'), C('StringBuilder') + ', spans, ' + C('string.Create')],
  ['Enumerating interfaces', C('foreach') + ' over ' + C('IEnumerable<T>') + ' boxes a struct enumerator', 'enumerate the concrete type'],
  ['async', 'state machine box when a method actually awaits; ' + C('Task<T>') + ' per call', C('ValueTask<T>') + ' for often-synchronous paths, cached tasks'],
  ['Resizing collections', 'List/Dictionary/StringBuilder grow by doubling, copying', 'pass a capacity']
])}
<h4>2. Tools</h4>
<ul>
<li>${C('GC.GetAllocatedBytesForCurrentThread()')} — precise per-thread allocation counter, great in tests ("this method allocates 0 bytes").</li>
<li>BenchmarkDotNet ${C('[MemoryDiagnoser]')} — Allocated bytes/op and GC counts.</li>
<li>${C('dotnet-counters monitor -n MyApp')} — live allocation rate, GC counts, heap sizes, time in GC.</li>
<li>${C('dotnet-trace collect --profile gc-verbose')} + PerfView / Visual Studio — allocation stacks: <b>who</b> allocates what.</li>
<li>Visual Studio/Rider memory profilers and heap snapshots for retention (leaks) rather than allocation rate.</li>
</ul>
<h4>3. Allocation-free techniques</h4>
<p>${C('ReadOnlySpan<char>')} slicing instead of ${C('Substring')}/${C('Split')}; ${C('int.Parse(ReadOnlySpan<char>)')}; ${C('stackalloc')} for small buffers; ${C('ArrayPool<T>.Shared')} for large temporary ones; ${C('static')} lambdas; struct enumerators; ${C('TryFormat')} into spans; caching immutable results (e.g. ${C('Task.CompletedTask')}, boxed constants).</p>`,
    clues: ['high "% time in GC" or gen0 collections per second in dotnet-counters', 'BenchmarkDotNet shows non-zero Allocated in a method that "should not allocate"', 'p99 latency spikes that line up with GCs', 'per-element LINQ, Split, Substring, string concatenation or params calls inside a loop'],
    code: [{ lang: 'csharp', run: true, title: 'Measuring allocations of common patterns (runnable)', code: `
long Alloc(Action a)
{
    a(); a();                                              // warm up
    long before = GC.GetAllocatedBytesForCurrentThread();
    a();
    return GC.GetAllocatedBytesForCurrentThread() - before;
}

int[] data = Enumerable.Range(0, 1000).ToArray();
List<int> list = data.ToList();
int threshold = 500;
string line = "alpha beta gamma delta";
int sink = 0;

Console.WriteLine($"for loop          {Alloc(() => { int c = 0; foreach (int x in data) if (x > 500) c++; sink += c; })}");   // 0
Console.WriteLine($"LINQ with closure {Alloc(() => sink += data.Count(x => x > threshold)) > 0}");                         // True
Console.WriteLine($"List foreach      {Alloc(() => { foreach (int x in list) sink += x; })}");                               // 0 (struct enumerator)
Console.WriteLine($"IEnumerable loop  {Alloc(() => { foreach (int x in (IEnumerable<int>)list) sink += x; }) > 0}");          // True (boxed enumerator)
Console.WriteLine($"Split             {Alloc(() => sink += line.Split(' ').Length) > 0}");                                   // True
Console.WriteLine($"span words        {Alloc(() => sink += CountWords(line))}");                                              // 0
Console.WriteLine($"boxing            {Alloc(() => { object o = sink; sink += o.GetHashCode() & 1; })}");                     // 24

static int CountWords(ReadOnlySpan<char> s)
{
    int n = 0; bool inWord = false;
    foreach (char c in s)
    {
        bool ws = char.IsWhiteSpace(c);
        if (!ws && !inWord) n++;
        inWord = !ws;
    }
    return n;
}` }],
    codeTitle: ['Allocation measurements'],
    viz: {
      title: 'Where one innocent-looking block allocates',
      gen: function () {
        var acc = [];
        var steps = [
          [1, 0, 'A local: no allocation yet — but because a lambda captures it, the compiler turns it into a field of a closure object created at the start of the method.'],
          [2, 32 + 64 + 48, '<code>Where</code> with a capturing lambda: the closure object (24–32 B), a delegate (64 B) and a WhereListIterator (≈48 B).'],
          [3, 64 + 56, '<code>Select</code>: a non-capturing lambda is a cached delegate (allocated once per process), but the combined iterator is new (≈56 B).'],
          [4, 32 + 1100, '<code>ToList</code>: a List plus backing arrays that grow 4 → 8 → 16 …, each growth copying the old array.'],
          [5, 24, 'Boxing an int: 24 bytes for a 4-byte value.'],
          [6, 40, 'String concatenation: a new string (and <code>id.ToString()</code> — though small ints are cached in .NET 8).'],
          [7, 32 + 48, '<code>params object[]</code>: a 2-element array (32 B) plus two boxes (48 B) on every call, even if logging is disabled.']
        ];
        return steps.map(function (s, i) {
          acc.push(s[1]);
          var hl = {}; hl[i] = 'cur';
          return { narr: s[2], parts: [{ type: 'code', label: 'Code', lang: 'csharp', code: T7_CODE, hl: (function () { var h = {}; h[s[0]] = 'cur'; return h; })() }, { type: 'bars', label: 'Bytes allocated per line (approx.)', values: acc.slice(), hl: hl }] };
        });
      }
    },
    examples: [
      { title: 'Logging that allocates when disabled', html: `<p>${C('logger.LogDebug("Order {Id} total {Total}", id, total)')} allocates a ${C('params object[]')} and boxes ${C('id')} and ${C('total')} <b>before</b> the logger checks whether Debug is enabled. Use the ${C('[LoggerMessage]')} source generator (strongly typed, checks ${C('IsEnabled')} first, no boxing) or guard with ${C('if (logger.IsEnabled(LogLevel.Debug))')}.</p>` },
      { title: 'A static lambda with explicit state', html: `<p>Many BCL APIs take a state argument so the lambda need not capture anything. Marking the lambda ${C('static')} makes the compiler reject accidental captures.</p>`, code: `
static class Caches
{
    private static readonly Dictionary<string, int> Lengths = new();
    public static int LengthOf(string key, Func<string, int> compute)
        => Lengths.TryGetValue(key, out int v) ? v : Lengths[key] = compute(key);
    public static int Demo(string k) => LengthOf(k, static s => s.Length);   // no closure, cached delegate
}` },
      { title: 'Pre-sizing collections', html: `<p>${C('new List<int>()')} filled with 1,000,000 items reallocates its array about 18 times (4, 8, …, 1,048,576), copying ~2 million elements and leaving garbage arrays on the LOH. ${C('new List<int>(1_000_000)')} allocates once. The same applies to ${C('Dictionary')}, ${C('HashSet')} and ${C('StringBuilder')}.</p>` }
    ],
    deepDive: `<p><b>Allocation contexts.</b> Each thread owns an allocation context: a small region (typically 8 KB) of gen0 handed out by the GC. ${C('new')} bumps a pointer within it; when it runs out, the thread asks for a new region, and after enough allocation (the gen0 budget, sized from cache sizes and survival rates) a gen0 GC is triggered. The cost of a gen0 GC is proportional to <b>surviving</b> objects, not dead ones — so short-lived garbage is cheap, and "mid-life" objects (surviving one or two GCs, then dying) are the most expensive: they get copied and promoted.</p>
<p><b>Allocation sampling.</b> The runtime emits an ${C('AllocationTick')} event roughly every 100 KB of allocations with the type and stack; profilers aggregate these samples. .NET 8+ adds more precise allocation sampling via EventPipe. Heap snapshots answer a different question (what is alive), which is what you need for leaks.</p>
<p><b>Do not over-optimise.</b> Removing allocations often costs readability (spans, pooling, manual loops). Apply it to code a profile shows to be hot, keep the simple version where it does not matter, and lock wins in with tests that assert zero allocations on the hot path (as this module's practice tests do).</p>`,
    aiEra: `<p><b>What AI changes:</b> it is very good at spotting allocation patterns in a code review. <b>Use AI as a partner:</b> <code>List every allocation in this method per call, with the reason, and propose an allocation-free version</code> — then verify with ${C('GC.GetAllocatedBytesForCurrentThread')} or ${C('[MemoryDiagnoser]')}. <b>Where AI goes wrong:</b> it claims interpolated strings box (not since C# 10), misses enumerator boxing through interfaces, or introduces ${C('ArrayPool')} without returning buffers (or returning them twice). <b>What you must still own:</b> measuring, and the trade-off between allocation-free code and maintainability.</p>`,
    problems: [{
      title: 'Count Words Without Allocating',
      level: 'Easy', tags: ['allocations', 'Span', 'strings'], companies: ['Microsoft', 'Stack Overflow', 'Bloomberg'],
      statement: `<p>Write ${C('static int CountWords(ReadOnlySpan<char> s)')} that counts maximal runs of non-whitespace characters (${C('char.IsWhiteSpace')}). It must allocate <b>zero bytes</b>: the tests call it twice to warm up, then measure the third call with ${C('GC.GetAllocatedBytesForCurrentThread()')} and expect ${C('"words alloc=0"')}.</p>`,
      constraints: `0 ≤ length ≤ 10<sup>6</sup>.`,
      example: `<p>${C('"  to be or   not "')} → ${H.c('g', '"4 alloc=0"')}</p>`,
      brute: { why: `<p>${C('s.Split(\' \', StringSplitOptions.RemoveEmptyEntries).Length')} is one line, but allocates an array and one string per word — for a 1 MB log line, megabytes of garbage just to count. It also ignores tabs and newlines unless you list every separator.</p>`, code: `
static class SplitCount
{
    public static int Count(string s) => s.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;   // allocates
}` },
      mcq: { q: 'Why does passing a <code>string</code> to a <code>ReadOnlySpan&lt;char&gt;</code> parameter not allocate?', options: ['The implicit conversion creates a span (a ref + length struct) over the string\'s existing characters', 'The string is copied to the stack', 'The JIT interns it', 'Spans are cached by the runtime'], answer: 0, explain: 'string → ReadOnlySpan&lt;char&gt; is an implicit conversion that points into the string; the span itself is a stack-only struct.' },
      hints: [`<p>Hint 1: iterate with ${C('foreach (char c in s)')} — over a span this has no enumerator object.</p>`, `<p>Hint 2: count a word when you see a non-whitespace character and the previous one was whitespace (or the start).</p>`, `<p>Hint 3: no LINQ, no ${C('Split')}, no ${C('Trim')} (Trim on a string allocates; ${C('span.Trim()')} would not).</p>`],
      tests: { sig: 'string -> string', fn: 'measureWords', harness: { csharp: `
public static class Check
{
    public static string MeasureWords(string s)
    {
        Solution.CountWords(s); Solution.CountWords(s);
        long before = GC.GetAllocatedBytesForCurrentThread();
        int w = Solution.CountWords(s);
        long alloc = GC.GetAllocatedBytesForCurrentThread() - before;
        return w + " alloc=" + alloc;
    }
}` }, cases: [
        [['  to be or   not '], '4 alloc=0'],
        [[''], '0 alloc=0'],
        [['   '], '0 alloc=0'],
        [['one'], '1 alloc=0'],
        [['tab\tand\nnewline'], '3 alloc=0'],
        [['a b c d e'], '5 alloc=0'],
        [[{ $rep: 'ab ', n: 100000 }], '100000 alloc=0']
      ] },
      solution: {
        approach: `<p>A single pass with a boolean "inside a word" flag over a span. No objects are created: the span is a struct on the stack and ${C('foreach')} over a span compiles to an indexed loop.</p>`,
        code: `
public class Solution
{
    public static int CountWords(ReadOnlySpan<char> s)
    {
        int words = 0;
        bool inWord = false;
        foreach (char c in s)
        {
            bool ws = char.IsWhiteSpace(c);
            if (!ws && !inWord) words++;
            inWord = !ws;
        }
        return words;
    }
}`,
        dry: { head: ['char', 'whitespace?', 'inWord before', 'words'], rows: [['" "', 'yes', 'false', '0'], ['t', 'no', 'false', '1'], ['o', 'no', 'true', '1'], ['" "', 'yes', 'true', '1'], ['b', 'no', 'false', '2']] },
        complexity: `<p>O(n) time, O(1) space, 0 bytes allocated.</p>`,
        followUps: ['Return the longest word as a <code>ReadOnlySpan&lt;char&gt;</code> slice.', 'Count words in a UTF-8 <code>ReadOnlySpan&lt;byte&gt;</code> without decoding to a string.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — String interning and common performance traps
     ====================================================================== */
  topics.push({
    title: 'String Interning and the Classic .NET Performance Traps',
    analogy: `<p>A library that buys a new copy of a book every time someone requests it fills its shelves with identical copies. A smarter library keeps <b>one copy</b> of each title and hands out the same one. String <b>interning</b> is that: one shared instance per distinct string value. But a library that permanently keeps one copy of every leaflet anyone ever brought in (the process-wide intern pool, never emptied) runs out of space too. Knowing when to share — and the dozen other "small habits" that cost a fortune at scale — is what separates fast .NET code from merely correct code.</p>`,
    explain: `<h4>1. Interning</h4>
<ul>
<li>All string <b>literals</b> and compile-time constant expressions (${C('"hel" + "lo"')}, ${C('const')} concatenations) in an assembly are interned: equal literals are the <b>same object</b> process-wide.</li>
<li>Strings built at run time (${C('part + "lo"')}, ${C('new string(...)')}, ${C('Substring')}, parsing, ${C('$"{x}"')} with non-constant parts) are new objects.</li>
<li>${C('string.Intern(s)')} returns the pooled instance (adding s if absent); ${C('string.IsInterned(s)')} returns it or null. The pool lives for the whole process and is never collected — do not intern unbounded user input.</li>
<li>${C('==')} on strings compares <b>values</b>, so interning is never needed for correctness; it is a memory (and occasionally speed) optimisation. ${C('ReferenceEquals')} reveals identity.</li>
</ul>
<p>For bounded deduplication (e.g. repeated column values while parsing a large file), a <b>local pool</b> (${C('HashSet<string>.TryGetValue')} or a ${C('Dictionary<string,string>')}) is better: it can be dropped when done.</p>
<h4>2. Traps that show up in real profiles</h4>
${H.table(['Trap', 'Why it is slow', 'Better'], [
  [C('s += x') + ' in a loop', 'O(n²) copying, garbage', C('StringBuilder') + ', ' + C('string.Join') + ', ' + C('string.Create')],
  ['Exceptions for control flow', 'throw/catch costs microseconds (stack trace capture)', C('TryParse') + ', ' + C('TryGetValue') + ', result types'],
  ['Struct keys without ' + C('IEquatable<T>'), C('ValueType.Equals') + '/' + C('GetHashCode') + ' use reflection-like field walking and boxing', 'implement ' + C('IEquatable<T>') + ' (or use record struct)'],
  [C('dict.ContainsKey(k)') + ' then ' + C('dict[k]'), 'two hash lookups', C('TryGetValue') + ', ' + C('CollectionsMarshal.GetValueRefOrAddDefault')],
  [C('list.Count()') + ' / ' + C('Any()') + ' on materialised lists', 'LINQ overhead (small) or full enumeration (large) for lazy sources', C('.Count') + ' property; avoid multiple enumeration'],
  [C('Enum.ToString()') + ' / ' + C('Enum.Parse') + ' on hot paths', 'reflection-backed, allocates', 'cached names, switch expressions, source generators'],
  ['Sync over async (' + C('.Result') + ', ' + C('.Wait()') + ')', 'blocks thread-pool threads; starvation and deadlocks', 'async all the way'],
  [C('Regex') + ' constructed per call', 'parse + compile every time', C('static readonly Regex') + ' or ' + C('[GeneratedRegex]')],
  ['String comparisons with culture', C('StartsWith("x")') + ' and ' + C('ToLower()') + ' are culture-sensitive and slower', C('StringComparison.Ordinal(IgnoreCase)')],
  [C('DateTime.Now') + ' in tight loops', 'time-zone conversion each call', C('DateTime.UtcNow') + ' or ' + C('Stopwatch.GetTimestamp()')]
])}`,
    clues: ['millions of duplicate strings in a heap dump (country codes, status values, column names) → dedupe with a pool', 'a loop building a string with += → StringBuilder', 'exceptions per request in normal operation → Try-pattern', 'Dictionary keyed by a struct that is slow and allocates → IEquatable&lt;T&gt;'],
    code: [{ lang: 'csharp', run: true, title: 'Interning facts and a local string pool (runnable)', code: `
string a = "hello";
string b = "hel" + "lo";                 // constant folded at compile time
string part = "hel";
string c = part + "lo";                  // built at run time
Console.WriteLine(ReferenceEquals(a, b));                  // True
Console.WriteLine(ReferenceEquals(a, c));                  // False
Console.WriteLine(a == c);                                 // True  (value equality)
Console.WriteLine(ReferenceEquals(a, string.Intern(c)));   // True

// A local pool deduplicates without the process-wide, never-freed intern table.
var pool = new HashSet<string>(StringComparer.Ordinal);
string Dedupe(string s) { if (pool.TryGetValue(s, out var existing)) return existing; pool.Add(s); return s; }
string[] cells = "IN,US,IN,IN,US".Split(',');              // five separate string objects
string[] pooled = cells.Select(Dedupe).ToArray();
Console.WriteLine(ReferenceEquals(cells[0], cells[2]));    // False
Console.WriteLine(ReferenceEquals(pooled[0], pooled[2]));  // True

// TryGetValue instead of ContainsKey + indexer (one lookup instead of two)
var counts = new Dictionary<string, int>();
foreach (var s in pooled) counts[s] = counts.TryGetValue(s, out int n) ? n + 1 : 1;
Console.WriteLine(string.Join(",", counts.Select(kv => $"{kv.Key}={kv.Value}")));   // IN=3,US=2

// Ordinal comparisons are faster and culture-independent
Console.WriteLine("file.TXT".EndsWith(".txt", StringComparison.OrdinalIgnoreCase)); // True` }],
    codeTitle: ['Interning and pooling'],
    viz: {
      title: 'Literals, run-time strings and the intern pool',
      gen: function () {
        var g = function (edges, hl) {
          return { type: 'graph', directed: true, height: 44, nodes: [
            { id: 'a', label: 'a', x: 8, y: 8 }, { id: 'b', label: 'b', x: 8, y: 22 }, { id: 'c', label: 'c', x: 8, y: 36 },
            { id: 'L', label: '"hello" (interned literal)', x: 58, y: 12, shape: 'box' }, { id: 'R', label: '"hello" (new object)', x: 58, y: 36, shape: 'box' }],
            edges: edges, hl: hl || {} };
        };
        return [
          { narr: '<code>string a = "hello";</code> — the literal is interned when the code is first run: one object in the pool.', parts: [g([['a', 'L']], { L: 'ok' })] },
          { narr: '<code>string b = "hel" + "lo";</code> — the C# compiler folds the constant expression to the literal "hello". Same pooled object.', parts: [g([['a', 'L'], ['b', 'L']], { b: 'ok', L: 'ok' }), { type: 'vars', vals: { 'ReferenceEquals(a, b)': 'True' }, hl: { 'ReferenceEquals(a, b)': 'ok' } }] },
          { narr: '<code>string c = part + "lo";</code> — <code>part</code> is a variable, so concatenation runs at run time and allocates a <b>new</b> string with the same characters.', parts: [g([['a', 'L'], ['b', 'L'], ['c', 'R']], { R: 'cur' }), { type: 'vars', vals: { 'a == c': 'True', 'ReferenceEquals(a, c)': 'False' }, hl: { 'ReferenceEquals(a, c)': 'bad' } }] },
          { narr: '<code>string.Intern(c)</code> looks up "hello" in the pool and returns the existing literal object. The new object R becomes garbage once c no longer refers to it.', parts: [g([['a', 'L'], ['b', 'L'], ['c', 'L']], { L: 'ok', R: 'bad' }), note('Caution', 'The intern pool is process-wide and never shrinks. Interning unbounded user input is a memory leak.')] }
        ];
      }
    },
    examples: [
      { title: 'Dictionary with a struct key', html: `<p>${C('struct Key { public int A, B; }')} as a dictionary key without ${C('IEquatable<Key>')}: ${C('EqualityComparer<Key>.Default')} falls back to ${C('ValueType.Equals(object)')} (boxing the argument) and ${C('ValueType.GetHashCode')} (which may hash only the first field). Lookups allocate and collide. A ${C('readonly record struct Key(int A, int B)')} fixes both.</p>` },
      { title: 'Exceptions as flow control', html: `<p>${C('try { return int.Parse(s); } catch (FormatException) { return 0; }')} costs several microseconds per bad input because throwing captures a stack trace and unwinds frames. With 10% bad inputs at 100k requests/s that is a CPU core spent on exceptions. ${C('int.TryParse(s, out var v) ? v : 0')} costs nanoseconds.</p>`, code: `
static int ParseOrZero(string s) => int.TryParse(s, out int v) ? v : 0;` },
      { title: 'Building a string of known length', html: `<p>${C('string.Create')} allocates the final string once and lets you fill its characters through a span — no StringBuilder, no intermediate buffers.</p>`, code: `
static string Repeat(char c, int n) => string.Create(n, c, static (span, ch) => span.Fill(ch));` }
    ],
    deepDive: `<p><b>How interning works.</b> The runtime keeps a global hash table from string value to a pinned, permanently rooted string object (historically in the "string literal map" per app domain). ${C('ldstr')} looks up or inserts the literal lazily; frozen string literals in .NET 8 can be allocated on a non-GC "frozen segment", so the JIT can embed their address directly in machine code. ${C('CompilationRelaxations.NoStringInterning')} lets NGen/R2R skip interning of literals in some cases, so never rely on literal identity across assemblies for logic.</p>
<p><b>Small-number string cache.</b> .NET 8 caches the strings for small non-negative integers (${C('5.ToString()')} returns a cached instance), which is why ${C('ReferenceEquals(1.ToString(), 1.ToString())')} is True while larger numbers produce new strings. This is an implementation detail — another reason never to use ReferenceEquals on strings for logic.</p>
<p><b>Frozen collections.</b> .NET 8 added ${C('FrozenDictionary')}/${C('FrozenSet')}: built once (slowly) and then optimised for reads — for example choosing a hash strategy based on the actual keys (length buckets, ordinal ignore-case analysis). Ideal for static lookup tables such as configuration keys or keyword lists.</p>`,
    aiEra: `<p><b>What AI changes:</b> it recognises most traps in this table immediately during review. <b>Use AI as a partner:</b> <code>Review this hot path for the classic .NET performance traps and estimate the impact of each</code>. <b>Where AI goes wrong:</b> it suggests ${C('string.Intern')} for user data (leak), replaces readable code with micro-optimisations in cold paths, or claims ${C('==')} on strings compares references. <b>What you must still own:</b> prioritising by measured impact and keeping correctness (culture vs ordinal comparisons can change behaviour).</p>`,
    problems: [{
      title: 'Deduplicate Strings with a Local Pool',
      level: 'Easy', tags: ['strings', 'interning', 'HashSet'], companies: ['Microsoft', 'Elastic', 'Splunk'],
      statement: `<p>A CSV parser produces a new string object for every cell, even when values repeat. Write a ${C('StringPool')} with ${C('string Get(string s)')} that returns a previously seen equal instance if one exists (ordinal comparison), otherwise stores and returns ${C('s')}. ${C('Dedupe(line)')} splits the line on commas, passes every cell through the pool, and returns ${C('[cells, uniqueValues, reusedInstances, distinctReferencesAfter]')} where reusedInstances counts cells that were replaced by an earlier instance, and distinctReferencesAfter counts distinct object references in the pooled result.</p>`,
      constraints: `Line length ≤ 10<sup>6</sup>. Cells may be empty.`,
      example: `<p>${C('"IN,US,IN,IN,US"')} → ${H.c('g', '[5, 2, 3, 2]')}</p>`,
      brute: { why: `<p>Calling ${C('string.Intern')} on every cell also deduplicates, but the process-wide pool never releases those strings — after parsing many files with free-text columns, memory only grows. A local pool can be discarded with the parser.</p>`, code: `
static class GlobalIntern
{
    public static string[] Dedupe(string line) => line.Split(',').Select(string.Intern).ToArray();   // never freed
}` },
      mcq: { q: 'Why use <code>HashSet&lt;string&gt;.TryGetValue</code> instead of <code>Contains</code> for the pool?', options: ['TryGetValue returns the stored instance, which is what deduplication needs', 'Contains is O(n)', 'Contains is case-insensitive', 'TryGetValue avoids hashing'], answer: 0, explain: 'Contains only says an equal string exists. To reuse the earlier object you need the actual stored reference, which TryGetValue (.NET Core 2.0+) returns.' },
      hints: [`<p>Hint 1: ${C('private readonly HashSet<string> _set = new(StringComparer.Ordinal);')}</p>`, `<p>Hint 2: in ${C('Get')}: ${C('if (_set.TryGetValue(s, out var existing)) return existing; _set.Add(s); return s;')}</p>`, `<p>Hint 3: count distinct references with ${C('new HashSet<string>(pooled, ReferenceEqualityComparer.Instance)')}.</p>`],
      tests: { sig: 'string -> int[]', fn: 'dedupe', cases: [
        [['IN,US,IN,IN,US'], [5, 2, 3, 2]],
        [['a,b,c'], [3, 3, 0, 3]],
        [[''], [1, 1, 0, 1]],
        [[',,'], [3, 1, 0, 1]],
        [['x'], [1, 1, 0, 1]],
        [['A,a,A'], [3, 2, 1, 2]],
        [[{ $concat: ['k', { $rep: ',k', n: 50000 }] }], [50001, 1, 50000, 1]]
      ] },
      solution: {
        approach: `<p>A hash set with ordinal comparison stores the first instance of each value; ${C('TryGetValue')} hands back that instance for later equal cells. Counting distinct references with ${C('ReferenceEqualityComparer')} proves the deduplication.</p>`,
        code: `
public class Solution
{
    public static int[] Dedupe(string line)
    {
        string[] cells = line.Split(',');
        var pool = new StringPool();
        int reused = 0;
        var pooled = new string[cells.Length];
        for (int i = 0; i < cells.Length; i++)
        {
            pooled[i] = pool.Get(cells[i]);
            if (!ReferenceEquals(pooled[i], cells[i])) reused++;
        }
        int distinctRefs = new HashSet<object>(pooled, ReferenceEqualityComparer.Instance).Count;
        return new[] { cells.Length, pool.Count, reused, distinctRefs };
    }
}

public sealed class StringPool
{
    private readonly HashSet<string> _set = new(StringComparer.Ordinal);
    public int Count => _set.Count;
    public string Get(string s)
    {
        if (_set.TryGetValue(s, out string? existing)) return existing;
        _set.Add(s);
        return s;
    }
}`,
        dry: { head: ['cell', 'in pool?', 'returned', 'reused'], rows: [['IN', 'no', 'IN#1', '0'], ['US', 'no', 'US#2', '0'], ['IN', 'yes', 'IN#1', '1'], ['IN', 'yes', 'IN#1', '2'], ['US', 'yes', 'US#2', '3']] },
        complexity: `<p>O(total length) time for hashing; memory holds one instance per distinct value.</p>`,
        followUps: ['Pool directly from <code>ReadOnlySpan&lt;char&gt;</code> slices to avoid creating the duplicate strings at all.', 'Bound the pool size with an LRU policy.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: String Identity and Interning',
    level: 'Easy', tags: ['output prediction', 'strings', 'interning'], companies: ['TCS', 'Infosys', 'Microsoft'],
    statement: `<p>Write down the 7 lines this program prints.</p>${P(`
string a = "hello";
string b = "hel" + "lo";
Console.WriteLine(ReferenceEquals(a, b));
string part = "hel";
string c = part + "lo";
Console.WriteLine(ReferenceEquals(a, c));
Console.WriteLine(a == c);
Console.WriteLine(ReferenceEquals(a, string.Intern(c)));
const string k = "lo";
string d = "hel" + k;
Console.WriteLine(ReferenceEquals(a, d));
Console.WriteLine(ReferenceEquals($"{part}lo", a));
Console.WriteLine((object)a == (object)c);`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 1 is ${H.c('g', 'True')}: ${C('"hel" + "lo"')} is a constant expression, folded by the compiler into the literal "hello", which is interned.</p>`,
    brute: { why: `<p>Assuming "equal strings are the same object" gives True everywhere; assuming "every expression makes a new string" gives False everywhere. The truth depends on <b>compile-time constants</b> (folded and interned) versus <b>run-time</b> concatenation (new objects), and on which ${C('==')} the compiler picks from the static types.</p>`, code: `
static class Guess
{
    public static bool[] Lines() => new[] { true, true, true, true, true, true, true };
}` },
    mcq: { q: 'Why is <code>(object)a == (object)c</code> False although <code>a == c</code> is True?', options: ['With object operands the compiler uses reference equality; string\'s == overload is chosen only when both static types are string', 'The casts copy the strings', 'object == compares hash codes', 'Interning is undone by the cast'], answer: 0, explain: 'Operators are resolved from static types. object == object is reference comparison, and c is a different object from the interned literal.' },
    hints: [`<p>Hint 1: literals and constant expressions (including ${C('const')} locals) are folded at compile time and interned.</p>`, `<p>Hint 2: anything involving a non-const variable is computed at run time into a new string — including interpolation.</p>`, `<p>Hint 3: ${C('string.Intern')} returns the pooled instance for that value.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'True\nFalse\nTrue\nTrue\nTrue\nFalse\nFalse' }] },
    solution: {
      approach: `<p>Classify each string as a compile-time constant (interned literal) or a run-time value (new object), then apply the operator chosen by the static types.</p>`,
      code: `
string a = "hello";
string b = "hel" + "lo";                              // constant folding → same literal
Console.WriteLine(ReferenceEquals(a, b));             // True
string part = "hel";
string c = part + "lo";                               // run-time concat → new object
Console.WriteLine(ReferenceEquals(a, c));             // False
Console.WriteLine(a == c);                            // True  (string == compares values)
Console.WriteLine(ReferenceEquals(a, string.Intern(c))); // True
const string k = "lo";
string d = "hel" + k;                                 // const + literal → folded
Console.WriteLine(ReferenceEquals(a, d));             // True
Console.WriteLine(ReferenceEquals($"{part}lo", a));   // False (run-time interpolation)
Console.WriteLine((object)a == (object)c);            // False (reference ==)`,
      dry: { head: ['expression', 'compile-time constant?', 'same object as a?'], rows: [['"hel" + "lo"', 'yes', 'yes'], ['part + "lo"', 'no', 'no'], ['"hel" + k (const)', 'yes', 'yes'], ['$"{part}lo"', 'no', 'no']] },
      complexity: `<p>O(1). The skill is knowing constant folding, interning and static operator resolution.</p>`,
      followUps: ['What does <code>ReferenceEquals(string.Empty, "")</code> print? (True)', 'Is <code>new string(\'x\', 0)</code> a new object? (No — .NET returns string.Empty.)']
    }
  });

  practice.push({
    title: 'Predict the Output: Boxing and Equality',
    level: 'Easy', tags: ['output prediction', 'boxing', 'equality'], companies: ['Accenture', 'Cognizant', 'Microsoft'],
    statement: `<p>Write down the 7 lines this program prints.</p>${P(`
object x = 5, y = 5;
Console.WriteLine(x == y);
Console.WriteLine(x.Equals(y));
Console.WriteLine((int)x == (int)y);
long l = 5;
Console.WriteLine(x.Equals(l));
int i = 7; object o = i; i = 8;
Console.WriteLine(o);
Console.WriteLine(ReferenceEquals(x, x));
IComparable c = 3;
Console.WriteLine(c.CompareTo(3));`)}`,
    constraints: `.NET 8.`,
    example: `<p>Line 1 is ${H.c('g', 'False')}: each ${C('5')} assigned to ${C('object')} is boxed separately, and ${C('object == object')} compares references.</p>`,
    brute: { why: `<p>Reading boxed values as plain ints predicts True, True, True, True, 8, True, 0. Boxing creates a <b>copy</b> in a new heap object: identity differs, later changes to the original do not affect it, and ${C('Int32.Equals(object)')} is false for a boxed long.</p>`, code: `
static class Guess
{
    public static string[] Lines() => new[] { "True", "True", "True", "True", "8", "True", "0" };
}` },
    mcq: { q: 'Why does <code>x.Equals(l)</code> (boxed int vs long 5) return False?', options: ['Int32.Equals(object) returns true only if the argument is a boxed Int32 with the same value', 'Because 5L != 5', 'Equals compares references', 'The long is truncated'], answer: 0, explain: 'The long is boxed as Int64; Int32.Equals checks the type first. Numeric promotion only happens with the == operator on the unboxed values.' },
    hints: [`<p>Hint 1: every conversion of a value type to ${C('object')} or an interface allocates a new box containing a copy.</p>`, `<p>Hint 2: ${C('==')} on two ${C('object')} variables is reference equality; ${C('Equals')} is virtual and compares values (and types).</p>`, `<p>Hint 3: ${C('IComparable c = 3')} also boxes; ${C('CompareTo(3)')} boxes the argument and compares values.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'False\nTrue\nTrue\nFalse\n7\nTrue\n0' }] },
    solution: {
      approach: `<p>Track what is boxed and when: two separate boxes for x and y, a snapshot box for o, an Int64 box for l in the Equals call, and an interface box for c.</p>`,
      code: `
object x = 5, y = 5;                   // two separate boxes
Console.WriteLine(x == y);             // False (reference ==)
Console.WriteLine(x.Equals(y));        // True  (Int32.Equals: same type and value)
Console.WriteLine((int)x == (int)y);   // True  (unboxed ints)
long l = 5;
Console.WriteLine(x.Equals(l));        // False (argument boxed as Int64)
int i = 7; object o = i; i = 8;        // o holds a copy of 7
Console.WriteLine(o);                  // 7
Console.WriteLine(ReferenceEquals(x, x)); // True
IComparable c = 3;                     // boxed through an interface
Console.WriteLine(c.CompareTo(3));     // 0`,
      dry: { head: ['line', 'boxes involved', 'output'], rows: [['x == y', 'box#1, box#2', 'False'], ['x.Equals(l)', 'box#1 (Int32), new box (Int64)', 'False'], ['o after i = 8', 'box holding 7', '7']] },
      complexity: `<p>O(1). Each boxing is a 24-byte allocation.</p>`,
      followUps: ['What does <code>((object)5).Equals(5)</code> print and does it allocate? (True; it boxes the argument too.)', 'How do generics avoid these boxes?']
    }
  });

  practice.push({
    title: 'Build a Large CSV String Efficiently',
    level: 'Easy', tags: ['StringBuilder', 'strings', 'allocations'], companies: ['Infosys', 'Wipro', 'Amazon'],
    statement: `<p>Return the numbers ${C('0, 1, …, n−1')} joined with commas (no trailing comma; empty string for n = 0). The solution must handle n = 200,000 quickly — a ${C('+=')} loop copies the growing string every time and is quadratic.</p>`,
    constraints: `0 ≤ n ≤ 2·10<sup>5</sup>.`,
    example: `<p>${C('n = 5')} → ${H.c('g', '"0,1,2,3,4"')}; ${C('n = 0')} → the empty string.</p>`,
    brute: { why: `<p>${C('s += i + ","')} creates a new string of the full current length on every iteration: about n²/2 characters copied. For n = 200,000 (≈1.3 million characters) that is on the order of 10<sup>11</sup> character copies and gigabytes of garbage.</p>`, code: `
static class Quadratic
{
    public static string Csv(int n)
    {
        string s = "";
        for (int i = 0; i < n; i++) s += (i == 0 ? "" : ",") + i;   // O(n²)
        return s;
    }
}` },
    mcq: { q: 'Roughly how many characters does the <code>+=</code> version copy for a final length L built in n steps?', options: ['About L·n/2 — every step copies the whole string built so far', 'About L', 'About n', 'About log n · L'], answer: 0, explain: 'Strings are immutable; each concatenation allocates a new string and copies both parts, so total work is the sum of all intermediate lengths.' },
    hints: [`<p>Hint 1: ${C('StringBuilder')} appends into an internal buffer that grows geometrically (amortised O(1) per character).</p>`, `<p>Hint 2: ${C('sb.Append(i)')} has an ${C('int')} overload that formats without creating an intermediate string.</p>`, `<p>Hint 3: alternatively ${C('string.Join(",", Enumerable.Range(0, n))')} — also linear.</p>`],
    tests: { sig: 'int -> string', fn: 'buildCsv', check: '(args, out) => out === Array.from({ length: args[0] }, (_, i) => i).join(",")', cases: [
      [[5], '0,1,2,3,4'],
      [[0], ''],
      [[1], '0'],
      [[11], '0,1,2,3,4,5,6,7,8,9,10'],
      [[1000], 'checked by function'],
      [[200000], 'checked by function']
    ] },
    solution: {
      approach: `<p>Append into one ${C('StringBuilder')} with an estimated capacity, adding a comma before every element except the first. Linear time, a handful of allocations.</p>`,
      code: `
using System.Text;

public class Solution
{
    public static string BuildCsv(int n)
    {
        var sb = new StringBuilder(n * 7);
        for (int i = 0; i < n; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(i);
        }
        return sb.ToString();
    }
}`,
      dry: { head: ['i', 'appended', 'buffer'], rows: [['0', '"0"', '"0"'], ['1', '",1"', '"0,1"'], ['2', '",2"', '"0,1,2"']] },
      complexity: `<p>O(L) time and memory for output length L.</p>`,
      followUps: ['Write it with <code>string.Create</code> after computing the exact length.', 'Stream the output to a <code>TextWriter</code> instead of building one string.']
    }
  });

  practice.push({
    title: 'Heap Size of Strings and Arrays',
    level: 'Medium', tags: ['CLR', 'memory', 'object layout'], companies: ['Microsoft', 'Unity', 'Optiver'],
    statement: `<p>Return the heap size in bytes (64-bit .NET 8) of one object: ${C('"string"')} of length n, or an array ${C('"T[]"')} of length n for T in ${C('byte, char, short, int, float, long, double, object')}. Strings: 16 (header + MethodTable) + 4 (length) + 2·(n + 1) (UTF-16 chars plus a terminating null), rounded up to 8. Arrays: 16 + 8 (length, padded) + n·sizeof(T), rounded up to 8. The empty string is a shared singleton, but report its formula size anyway.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>8</sup>; use long arithmetic.`,
    example: `<p>${C('("string", 5)')} → ${H.c('g', '32')}; ${C('("int[]", 3)')} → ${H.c('g', '40')}</p>`,
    brute: { why: `<p>Estimating "n elements × element size" ignores the 24-byte array header (or 22 bytes for strings) and the rounding. For millions of small strings the overhead dominates: a 3-character string occupies 32 bytes for 6 bytes of characters.</p>`, code: `
static class Naive
{
    public static long Size(string kind, int n) => kind == "string" ? 2L * n : 4L * n;   // ignores headers
}` },
    mcq: { q: 'At which length does a <code>double[]</code> first reach the Large Object Heap threshold of 85,000 bytes?', options: ['10,622', '10,625', '85,000', '10,600'], answer: 0, explain: 'Size = 24 + 8n. 24 + 8 · 10,622 = 85,000 exactly; one element fewer gives 84,992.' },
    hints: [`<p>Hint 1: ${C('static long Round8(long v) => (v + 7) / 8 * 8;')}</p>`, `<p>Hint 2: element sizes: byte 1, char/short 2, int/float 4, long/double/object 8.</p>`, `<p>Hint 3: string: ${C('Round8(22 + 2L * n)')}; array: ${C('Round8(24 + n * elem)')}.</p>`],
    tests: { sig: 'string int -> long', fn: 'heapSize', cases: [
      [['string', 5], 32],
      [['string', 0], 24],
      [['string', 1], 24],
      [['string', 3], 32],
      [['int[]', 3], 40],
      [['int[]', 0], 24],
      [['byte[]', 1], 32],
      [['byte[]', 84976], 85000],
      [['object[]', 2], 40],
      [['double[]', 100000000], '800000024'],
      [['char[]', 7], 40],
      [['string', 100000000], '200000024']
    ] },
    solution: {
      approach: `<p>Apply the layout: fixed overhead (22 for strings including the length field and terminator, 24 for arrays including the padded length), plus payload, rounded to the 8-byte allocation granularity.</p>`,
      code: `
public class Solution
{
    public static long HeapSize(string kind, int n)
    {
        if (kind == "string") return Round8(22 + 2L * n);
        int elem = kind switch
        {
            "byte[]" => 1,
            "char[]" or "short[]" => 2,
            "int[]" or "float[]" => 4,
            _ => 8                       // long[], double[], object[]
        };
        return Round8(24 + (long)n * elem);
    }

    static long Round8(long v) => (v + 7) / 8 * 8;
}`,
      dry: { head: ['input', 'raw', 'rounded'], rows: [['string, 5', '22 + 10 = 32', '32'], ['int[], 3', '24 + 12 = 36', '40'], ['byte[], 84,976', '85,000', '85,000 (LOH)']] },
      complexity: `<p>O(1) time and O(1) extra space.</p>`,
      followUps: ['Verify the formulas with <code>GC.GetAllocatedBytesForCurrentThread()</code>.', 'Compute the size of a <code>List&lt;int&gt;</code> with capacity c (object + array).']
    }
  });

  practice.push({
    title: 'Allocation-Free CSV Integer Sum',
    level: 'Medium', tags: ['Span', 'allocations', 'parsing'], companies: ['Microsoft', 'Bloomberg', 'Cloudflare'],
    statement: `<p>Write ${C('static long SumCsv(ReadOnlySpan<char> line)')} that sums comma-separated integers (optional leading ${C('-')}, possibly surrounded by spaces) and allocates <b>zero bytes</b>. An empty line sums to 0. Use span slicing and ${C('int.Parse(ReadOnlySpan<char>)')} — no ${C('Split')}, no ${C('Substring')}. The tests warm up twice and expect ${C('"sum alloc=0"')} for the measured call.</p>`,
    constraints: `Up to 10<sup>5</sup> numbers, each fits in int; the line is well formed.`,
    example: `<p>${C('"1, 2,-3"')} → ${H.c('g', '"0 alloc=0"')}</p>`,
    brute: { why: `<p>${C('line.Split(\',\').Sum(s => int.Parse(s))')} allocates an array, a string per number and LINQ objects — megabytes for a large line, all garbage immediately. Spans let you parse the characters where they already are.</p>`, code: `
static class SplitSum
{
    public static long Sum(string line) => line.Length == 0 ? 0 : line.Split(',').Sum(s => (long)int.Parse(s));
}` },
    mcq: { q: 'Which call parses without allocating?', options: ['<code>int.Parse(line.AsSpan(start, len))</code>', '<code>int.Parse(line.Substring(start, len))</code>', '<code>Convert.ToInt32(line.Split(\',\')[0])</code>', '<code>int.Parse(new string(line.AsSpan(start, len)))</code>'], answer: 0, explain: 'int.Parse has a ReadOnlySpan&lt;char&gt; overload (and trims surrounding whitespace with the default NumberStyles.Integer). The others create strings.' },
    hints: [`<p>Hint 1: loop: ${C('int comma = line.IndexOf(\',\')')}; take ${C('line[..comma]')} (or the rest), then ${C('line = line[(comma + 1)..]')}.</p>`, `<p>Hint 2: ${C('NumberStyles.Integer')} (the default) allows leading/trailing whitespace and a leading sign.</p>`, `<p>Hint 3: accumulate into a ${C('long')}; check ${C('line.IsEmpty')} first.</p>`],
    tests: { sig: 'string -> string', fn: 'measureSum', harness: { csharp: `
public static class Check
{
    public static string MeasureSum(string s)
    {
        Solution.SumCsv(s); Solution.SumCsv(s);
        long before = GC.GetAllocatedBytesForCurrentThread();
        long sum = Solution.SumCsv(s);
        long alloc = GC.GetAllocatedBytesForCurrentThread() - before;
        return sum + " alloc=" + alloc;
    }
}` }, cases: [
      [['1, 2,-3'], '0 alloc=0'],
      [[''], '0 alloc=0'],
      [['42'], '42 alloc=0'],
      [['2147483647,2147483647'], '4294967294 alloc=0'],
      [['-2147483648, -1'], '-2147483649 alloc=0'],
      [[' 10 , 20 , 30 '], '60 alloc=0'],
      [[{ $concat: ['7', { $rep: ',7', n: 99999 }] }], '700000 alloc=0']
    ] },
    solution: {
      approach: `<p>Walk the span: find the next comma with the vectorized ${C('IndexOf')}, parse the slice in place, move past the comma. Spans are stack-only structs, so nothing reaches the heap.</p>`,
      code: `
public class Solution
{
    public static long SumCsv(ReadOnlySpan<char> line)
    {
        long sum = 0;
        if (line.IsEmpty) return 0;
        while (true)
        {
            int comma = line.IndexOf(',');
            ReadOnlySpan<char> token = comma < 0 ? line : line[..comma];
            sum += int.Parse(token);
            if (comma < 0) return sum;
            line = line[(comma + 1)..];
        }
    }
}`,
      dry: { head: ['remaining', 'token', 'sum'], rows: [['"1, 2,-3"', '"1"', '1'], ['" 2,-3"', '" 2"', '3'], ['"-3"', '"-3"', '0']] },
      complexity: `<p>O(n) time, O(1) space, 0 bytes allocated.</p>`,
      followUps: ['Handle malformed input with <code>int.TryParse</code> and report the position.', 'Parse UTF-8 bytes directly with <code>Utf8Parser</code> or <code>int.Parse(ReadOnlySpan&lt;byte&gt;)</code> (.NET 8).']
    }
  });

  practice.push({
    title: 'Struct Dictionary Keys Without Boxing',
    level: 'Medium', tags: ['IEquatable', 'Dictionary', 'boxing'], companies: ['Unity', 'Microsoft', 'Riot Games'],
    statement: `<p>Create ${C('readonly struct GridPoint : IEquatable<GridPoint>')} with ${C('X')}, ${C('Y')}, ${C('Equals(GridPoint)')}, ${C('Equals(object?)')} and ${C('GetHashCode()')} (use ${C('HashCode.Combine')}). ${C('Build(xs, ys)')} counts how often each point occurs in a ${C('Dictionary<GridPoint, int>')}; ${C('MaxCount(d, xs, ys)')} looks every input point up again and returns the largest count. The test measures ${C('MaxCount')} after warm-up and expects 0 allocated bytes — which fails if the struct lacks ${C('IEquatable<T>')} (the default comparer would box).</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>, coordinates are any int.`,
    example: `<p>points (1,1), (2,2), (1,1) → ${H.c('g', '"2 alloc=0"')}</p>`,
    brute: { why: `<p>A plain ${C('struct GridPoint { public int X, Y; }')} works as a key, but ${C('EqualityComparer<GridPoint>.Default')} then uses ${C('ValueType.Equals(object)')}: every comparison boxes, and the default ${C('ValueType.GetHashCode')} may be slow or poorly distributed. In a hot dictionary that means garbage per lookup.</p>`, code: `
struct SlowPoint { public int X, Y; public SlowPoint(int x, int y) { X = x; Y = y; } }   // no IEquatable: lookups box
static class SlowCounts
{
    public static Dictionary<SlowPoint, int> Build(int[] xs, int[] ys)
    {
        var d = new Dictionary<SlowPoint, int>();
        for (int i = 0; i < xs.Length; i++) { var p = new SlowPoint(xs[i], ys[i]); d[p] = d.TryGetValue(p, out int c) ? c + 1 : 1; }
        return d;
    }
}` },
    mcq: { q: 'What does <code>EqualityComparer&lt;T&gt;.Default</code> return for a struct T implementing <code>IEquatable&lt;T&gt;</code>?', options: ['A generic comparer that calls Equals(T) directly — no boxing', 'An ObjectEqualityComparer that boxes', 'A reflection-based comparer', 'Null'], answer: 0, explain: 'The runtime picks GenericEqualityComparer&lt;T&gt; for IEquatable&lt;T&gt; types; otherwise ObjectEqualityComparer&lt;T&gt;, which calls Equals(object) and boxes value types.' },
    hints: [`<p>Hint 1: ${C('public bool Equals(GridPoint o) => X == o.X && Y == o.Y;')}</p>`, `<p>Hint 2: ${C('public override bool Equals(object? o) => o is GridPoint p && Equals(p);')} and ${C('public override int GetHashCode() => HashCode.Combine(X, Y);')}</p>`, `<p>Hint 3: a ${C('readonly record struct')} generates all of this — but write it by hand here to see the pieces.</p>`],
    tests: { sig: 'int[] int[] -> string', fn: 'probe', harness: { csharp: `
public static class Check
{
    public static string Probe(int[] xs, int[] ys)
    {
        var d = Solution.Build(xs, ys);
        Solution.MaxCount(d, xs, ys); Solution.MaxCount(d, xs, ys);
        long before = GC.GetAllocatedBytesForCurrentThread();
        int best = Solution.MaxCount(d, xs, ys);
        long alloc = GC.GetAllocatedBytesForCurrentThread() - before;
        return best + " alloc=" + alloc;
    }
}` }, cases: [
      [[[1, 2, 1], [1, 2, 1]], '2 alloc=0'],
      [[[0], [0]], '1 alloc=0'],
      [[[1, 1, 1, 1], [1, 2, 3, 4]], '1 alloc=0'],
      [[[5, 5, 5], [7, 7, 7]], '3 alloc=0'],
      [[[-2147483648, 2147483647, -2147483648], [2147483647, -2147483648, 2147483647]], '2 alloc=0'],
      [[{ $range: [0, 100000] }, { $rep: 3, n: 100000 }], '1 alloc=0'],
      [[{ $rep: 9, n: 100000 }, { $rep: 9, n: 100000 }], '100000 alloc=0']
    ] },
    solution: {
      approach: `<p>Implementing ${C('IEquatable<GridPoint>')} makes the dictionary use a generic comparer with direct, inlinable ${C('Equals(GridPoint)')} calls; ${C('HashCode.Combine')} mixes both coordinates well. Lookups then allocate nothing.</p>`,
      code: `
public class Solution
{
    public static Dictionary<GridPoint, int> Build(int[] xs, int[] ys)
    {
        var d = new Dictionary<GridPoint, int>(xs.Length);
        for (int i = 0; i < xs.Length; i++)
        {
            var p = new GridPoint(xs[i], ys[i]);
            d[p] = d.TryGetValue(p, out int c) ? c + 1 : 1;
        }
        return d;
    }

    public static int MaxCount(Dictionary<GridPoint, int> d, int[] xs, int[] ys)
    {
        int best = 0;
        for (int i = 0; i < xs.Length; i++)
            best = Math.Max(best, d[new GridPoint(xs[i], ys[i])]);
        return best;
    }
}

public readonly struct GridPoint(int x, int y) : IEquatable<GridPoint>
{
    public int X { get; } = x;
    public int Y { get; } = y;
    public bool Equals(GridPoint o) => X == o.X && Y == o.Y;
    public override bool Equals(object? o) => o is GridPoint p && Equals(p);
    public override int GetHashCode() => HashCode.Combine(X, Y);
}`,
      dry: { head: ['call', 'comparer used', 'boxing?'], rows: [['d[p] with IEquatable', 'GenericEqualityComparer', 'no'], ['d[p] without IEquatable', 'ObjectEqualityComparer', 'yes (Equals(object))']] },
      complexity: `<p>O(n) expected time; 0 bytes per lookup.</p>`,
      followUps: ['Replace the struct with <code>readonly record struct GridPoint(int X, int Y)</code> and confirm it still allocates nothing.', 'Use <code>CollectionsMarshal.GetValueRefOrAddDefault</code> to count with a single lookup.']
    }
  });

  practice.push({
    title: 'Decode a Double with an Explicit-Layout Union',
    level: 'Medium', tags: ['StructLayout', 'FieldOffset', 'IEEE 754'], companies: ['Jane Street', 'Microsoft', 'Intel'],
    statement: `<p>Declare ${C('[StructLayout(LayoutKind.Explicit)] struct DoubleBits')} with a ${C('double')} and a ${C('ulong')} both at ${C('[FieldOffset(0)]')}. ${C('Parts(double d)')} writes the double and reads the bits to return ${C('"sign exponent 0xMANTISSA"')}: sign bit (0/1), the 11-bit biased exponent in decimal, and the 52-bit fraction as 13 uppercase hex digits.</p>`,
    constraints: `Any finite double.`,
    example: `<p>${C('-2.5')} = −1.25·2<sup>1</sup> → ${H.c('g', '"1 1024 0x4000000000000"')}</p>`,
    brute: { why: `<p>Extracting the parts with arithmetic (${C('Math.Log2')}, repeated division) is slow and wrong for subnormals, −0.0 and rounding edge cases. The bits are already there; a union (or ${C('BitConverter.DoubleToUInt64Bits')}) reads them exactly.</p>`, code: `
static class Arithmetic
{
    public static int Exponent(double d) => (int)Math.Floor(Math.Log2(Math.Abs(d))) + 1023;   // wrong for 0, subnormals
}` },
    mcq: { q: 'What does <code>[FieldOffset(0)]</code> on two fields of an explicit-layout struct mean?', options: ['Both fields occupy the same bytes, so writing one changes what the other reads', 'They are stored in separate structs', 'The second field is ignored', 'It is a compile error'], answer: 0, explain: 'Explicit layout lets fields overlap like a C union. Overlapping a reference with a value type is rejected at type-load time, but two value types are fine.' },
    hints: [`<p>Hint 1: sign = ${C('bits >> 63')}; exponent = ${C('(bits >> 52) & 0x7FF')}; mantissa = ${C('bits & 0xFFFFFFFFFFFFF')}.</p>`, `<p>Hint 2: format with ${C('mantissa.ToString("X13")')}.</p>`, `<p>Hint 3: the safe library equivalent is ${C('BitConverter.DoubleToUInt64Bits(d)')} — use it to double-check.</p>`],
    tests: { sig: 'double -> string', fn: 'parts', cases: [
      [[1.0], '0 1023 0x0000000000000'],
      [[-2.5], '1 1024 0x4000000000000'],
      [[0.0], '0 0 0x0000000000000'],
      [[0.1], '0 1019 0x999999999999A'],
      [[5e-324], '0 0 0x0000000000001'],
      [[-1.7976931348623157e308], '1 2046 0xFFFFFFFFFFFFF'],
      [[3.0], '0 1024 0x8000000000000']
    ] },
    solution: {
      approach: `<p>Write through the double field, read through the ulong field — the same 8 bytes — then mask and shift the IEEE 754 fields.</p>`,
      code: `
using System.Runtime.InteropServices;

public class Solution
{
    public static string Parts(double d)
    {
        var u = new DoubleBits { D = d };
        ulong bits = u.U;
        ulong sign = bits >> 63;
        ulong exp = (bits >> 52) & 0x7FF;
        ulong mant = bits & 0xF_FFFF_FFFF_FFFFUL;
        return $"{sign} {exp} 0x{mant:X13}";
    }
}

[StructLayout(LayoutKind.Explicit)]
public struct DoubleBits
{
    [FieldOffset(0)] public double D;
    [FieldOffset(0)] public ulong U;
}`,
      dry: { head: ['d', 'bits (hex)', 'sign', 'exponent', 'mantissa'], rows: [['1.0', '3FF0000000000000', '0', '1023', '0'], ['-2.5', 'C004000000000000', '1', '1024', '4000000000000'], ['0.1', '3FB999999999999A', '0', '1019', '999999999999A']] },
      complexity: `<p>O(1) time and O(1) extra space.</p>`,
      followUps: ['Return the unbiased exponent and detect subnormals (exponent field 0).', 'Do the same for <code>float</code> and <code>Half</code>.']
    }
  });

  practice.push({
    title: 'Per-Thread Counters Padded Against False Sharing',
    level: 'Medium', tags: ['false sharing', 'StructLayout', 'threads'], companies: ['Microsoft', 'Optiver', 'IMC'],
    statement: `<p>Each of T threads increments its own counter ${C('perThread')} times. Store the counters in an array of ${C('[StructLayout(LayoutKind.Sequential, Size = 64)] struct PaddedCounter { public long Value; }')} so no two counters share a cache line. Start all threads, ${C('Join')} them, and return ${C('"total=N stride=S"')} where S is ${C('Unsafe.SizeOf<PaddedCounter>()')}. The result must be deterministic.</p>`,
    constraints: `1 ≤ T ≤ 16, 0 ≤ perThread ≤ 10<sup>6</sup>.`,
    example: `<p>${C('T = 4, perThread = 1000')} → ${H.c('g', '"total=4000 stride=64"')}</p>`,
    brute: { why: `<p>A plain ${C('long[] counts')} gives the right total too, but neighbouring counters sit in the same 64-byte line: every increment by one core invalidates the line in the others, and the "parallel" loop can be slower than one thread. A single shared counter with ${C('Interlocked.Increment')} is correct but serialises all threads on one line.</p>`, code: `
static class Shared
{
    static long _count;
    public static long Run(int t, int per)
    {
        var ths = Enumerable.Range(0, t).Select(_ => new Thread(() => { for (int i = 0; i < per; i++) Interlocked.Increment(ref _count); })).ToList();
        ths.ForEach(x => x.Start()); ths.ForEach(x => x.Join());
        return _count;
    }
}` },
    mcq: { q: 'Why does padding each counter to 64 bytes help even though every thread writes only its own counter?', options: ['Cache coherence works per cache line; without padding, different counters share a line and the cores keep invalidating each other', 'It makes the writes atomic', 'It prevents the GC from moving the array', 'The JIT vectorizes padded structs'], answer: 0, explain: 'This is false sharing: logically independent data, physically shared cache line. Padding gives each thread its own line.' },
    hints: [`<p>Hint 1: ${C('var counters = new PaddedCounter[t];')} — each element is 64 bytes.</p>`, `<p>Hint 2: capture the loop index in a local inside the loop (${C('int id = k;')}) so each thread gets its own slot.</p>`, `<p>Hint 3: increment ${C('counters[id].Value++')} — no Interlocked needed because each slot has one writer; ${C('Join')} provides the memory visibility for the final sum.</p>`],
    tests: { sig: 'int int -> string', fn: 'parallelCount', cases: [
      [[4, 1000], 'total=4000 stride=64'],
      [[1, 0], 'total=0 stride=64'],
      [[1, 5], 'total=5 stride=64'],
      [[16, 1000000], 'total=16000000 stride=64'],
      [[3, 333333], 'total=999999 stride=64'],
      [[8, 1], 'total=8 stride=64']
    ] },
    solution: {
      approach: `<p>One padded slot per thread, single writer per slot, join all threads, then sum. Padding removes false sharing; joining guarantees we read the final values.</p>`,
      code: `
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

public class Solution
{
    public static string ParallelCount(int t, int perThread)
    {
        var counters = new PaddedCounter[t];
        var threads = new Thread[t];
        for (int k = 0; k < t; k++)
        {
            int id = k;
            threads[k] = new Thread(() =>
            {
                for (int i = 0; i < perThread; i++) counters[id].Value++;
            });
            threads[k].Start();
        }
        foreach (var th in threads) th.Join();
        long total = 0;
        foreach (var c in counters) total += c.Value;
        return $"total={total} stride={Unsafe.SizeOf<PaddedCounter>()}";
    }
}

[StructLayout(LayoutKind.Sequential, Size = 64)]
public struct PaddedCounter { public long Value; }`,
      dry: { head: ['thread', 'slot bytes', 'final value'], rows: [['0', '0–63', '1000'], ['1', '64–127', '1000'], ['2', '128–191', '1000'], ['3', '192–255', '1000'], ['sum', '—', '4000']] },
      complexity: `<p>O(T·perThread) work spread over T threads; memory 64·T bytes.</p>`,
      followUps: ['Use <code>Parallel.For</code> with localInit/localFinally instead of explicit slots.', 'Measure the speed difference against an unpadded <code>long[]</code> with BenchmarkDotNet on a many-core machine.']
    }
  });

  practice.push({
    title: 'Count Without Closure Allocations',
    level: 'Medium', tags: ['closures', 'static lambdas', 'allocations'], companies: ['Microsoft', 'Uber', 'Grab'],
    statement: `<p>A helper ${C('static int CountWhere<TState>(ReadOnlySpan<int> s, TState state, Func<int, TState, bool> pred)')} passes explicit state to its predicate. Implement it and ${C('CountAbove(int[] a, int t)')} using it with a <b>static</b> lambda (${C('static (x, limit) => x > limit')}), so no closure is created per call. The test warms up twice and expects ${C('"count alloc=0"')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>.`,
    example: `<p>${C('CountAbove([5, 1, 9, 7], 5)')} → ${H.c('g', '"2 alloc=0"')}</p>`,
    brute: { why: `<p>${C('a.Count(x => x > t)')} captures ${C('t')}: each call allocates a closure object and a delegate, plus LINQ's enumerator for arrays. Tiny per call — but in a method called a million times per second it is a steady stream of gen0 garbage.</p>`, code: `
static class Linq
{
    public static int CountAbove(int[] a, int t) => a.Count(x => x > t);   // closure + delegate per call
}` },
    mcq: { q: 'What does the <code>static</code> modifier on a lambda guarantee?', options: ['The lambda cannot capture locals or this, so the compiler can cache a single delegate instance', 'The lambda runs on a static thread', 'The lambda is inlined', 'The lambda allocates on the stack'], answer: 0, explain: 'A static lambda (C# 9) is a compile error if it captures anything. Non-capturing lambdas are cached in a static field, so they allocate once per process.' },
    hints: [`<p>Hint 1: inside ${C('CountWhere')}: ${C('foreach (int x in s) if (pred(x, state)) n++;')}</p>`, `<p>Hint 2: call it as ${C('CountWhere(a, t, static (x, limit) => x > limit)')} — ${C('t')} travels as an argument, not a capture.</p>`, `<p>Hint 3: ${C('int[]')} converts implicitly to ${C('ReadOnlySpan<int>')}; generic ${C('TState = int')} avoids boxing the state.</p>`],
    tests: { sig: 'int[] int -> string', fn: 'measureCount', harness: { csharp: `
public static class Check
{
    public static string MeasureCount(int[] a, int t)
    {
        Solution.CountAbove(a, t); Solution.CountAbove(a, t);
        long before = GC.GetAllocatedBytesForCurrentThread();
        int n = Solution.CountAbove(a, t);
        long alloc = GC.GetAllocatedBytesForCurrentThread() - before;
        return n + " alloc=" + alloc;
    }
}` }, cases: [
      [[[5, 1, 9, 7], 5], '2 alloc=0'],
      [[[], 0], '0 alloc=0'],
      [[[1, 2, 3], 3], '0 alloc=0'],
      [[[-1, -2, 0], -2], '2 alloc=0'],
      [[[2147483647], 2147483646], '1 alloc=0'],
      [[{ $range: [0, 1000000] }, 499999], '500000 alloc=0']
    ] },
    solution: {
      approach: `<p>Pass the threshold as explicit generic state and use a static lambda: the delegate is created once and cached by the compiler; the span loop has no enumerator; the generic state is not boxed.</p>`,
      code: `
public class Solution
{
    public static int CountAbove(int[] a, int t) => CountWhere(a, t, static (x, limit) => x > limit);

    public static int CountWhere<TState>(ReadOnlySpan<int> s, TState state, Func<int, TState, bool> pred)
    {
        int n = 0;
        foreach (int x in s)
            if (pred(x, state)) n++;
        return n;
    }
}`,
      dry: { head: ['call', 'allocation'], rows: [['first call ever', 'one cached delegate (static field)'], ['later calls', '0 bytes'], ['a.Count(x => x > t)', 'closure + delegate + enumerator each call']] },
      complexity: `<p>O(n) time; 0 bytes per call after the first.</p>`,
      followUps: ['Why is a delegate call still slower than an inlined comparison? (indirect call, no inlining unless PGO devirtualizes it)', 'Rewrite with a struct predicate <code>where TPred : struct, IPredicate</code> so the call inlines.']
    }
  });

  practice.push({
    title: 'Cache-Friendly Blocked Matrix Transpose',
    level: 'Medium', tags: ['cache', 'memory locality', 'arrays'], companies: ['NVIDIA', 'Microsoft', 'Qualcomm'],
    statement: `<p>Return the transpose of an r × c matrix (jagged ${C('int[][]')}). Implement it with <b>tiling</b>: process 32 × 32 blocks so that both the rows read and the rows written stay in cache. The result must equal the plain transpose.</p>`,
    constraints: `0 ≤ r, c ≤ 1000; rows all have length c.`,
    example: `<p>${C('[[1, 2, 3], [4, 5, 6]]')} → ${H.c('g', '[[1, 4], [2, 5], [3, 6]]')}</p>`,
    brute: { why: `<p>The double loop ${C('t[j][i] = m[i][j]')} reads rows sequentially but writes one element into a different output row every step — a cache miss per write for large matrices. Blocking keeps a small square of both matrices hot; the same number of operations runs several times faster on big inputs.</p>`, code: `
static class Plain
{
    public static int[][] T(int[][] m)
    {
        int r = m.Length, c = r == 0 ? 0 : m[0].Length;
        var t = new int[c][];
        for (int j = 0; j < c; j++) t[j] = new int[r];
        for (int i = 0; i < r; i++) for (int j = 0; j < c; j++) t[j][i] = m[i][j];
        return t;
    }
}` },
    mcq: { q: 'Why does the naive transpose of a large matrix suffer cache misses?', options: ['Consecutive writes go to different rows, each in a different cache line, so lines are evicted before they are reused', 'Transposing requires division', 'The JIT cannot remove bounds checks', 'int[][] is stored column-major'], answer: 0, explain: 'Each output row is a separate array; writing t[j][i] for j = 0..c touches c different cache lines per input row. Tiles bound the working set.' },
    hints: [`<p>Hint 1: allocate ${C('c')} output rows of length ${C('r')} (for r = 0 the result has c empty rows; for c = 0 it is empty).</p>`, `<p>Hint 2: outer loops step ${C('ii')} and ${C('jj')} by 32; inner loops run to ${C('Math.Min(ii + 32, r)')} and ${C('Math.Min(jj + 32, c)')}.</p>`, `<p>Hint 3: inside a tile, hoist ${C('var row = m[i];')} to keep the inner loop simple.</p>`],
    tests: { sig: 'int[][] -> int[][]', fn: 'transpose', check: '(args, out) => { const m = args[0]; const r = m.length, c = r ? m[0].length : 0; if (out.length !== c) return false; for (let j = 0; j < c; j++) { if (out[j].length !== r) return false; for (let i = 0; i < r; i++) if (out[j][i] !== m[i][j]) return false; } return true; }', cases: [
      [[[[1, 2, 3], [4, 5, 6]]], [[1, 4], [2, 5], [3, 6]]],
      [[[[7]]], [[7]]],
      [[[]], []],
      [[[[1], [2], [3]]], [[1, 2, 3]]],
      [[[[1, 2], [3, 4]]], [[1, 3], [2, 4]]],
      [[{ $rep: { $range: [0, 70] }, n: 45 }], 'checked by function'],
      [[{ $rep: { $range: [0, 1000] }, n: 300 }], 'checked by function']
    ] },
    solution: {
      approach: `<p>Same assignments as the plain version, reordered into 32 × 32 tiles: inside a tile the 32 source rows and 32 destination rows (32 × 32 × 4 bytes ≈ 4 KB each) fit easily in L1, so every cache line loaded is fully used.</p>`,
      code: `
public class Solution
{
    public static int[][] Transpose(int[][] m)
    {
        const int B = 32;
        int r = m.Length, c = r == 0 ? 0 : m[0].Length;
        var t = new int[c][];
        for (int j = 0; j < c; j++) t[j] = new int[r];
        for (int ii = 0; ii < r; ii += B)
            for (int jj = 0; jj < c; jj += B)
            {
                int iEnd = Math.Min(ii + B, r), jEnd = Math.Min(jj + B, c);
                for (int i = ii; i < iEnd; i++)
                {
                    int[] row = m[i];
                    for (int j = jj; j < jEnd; j++) t[j][i] = row[j];
                }
            }
        return t;
    }
}`,
      dry: { head: ['tile (ii, jj)', 'rows read', 'rows written'], rows: [['(0, 0)', 'm[0..31]', 't[0..31]'], ['(0, 32)', 'm[0..31]', 't[32..63]'], ['(32, 0)', 'm[32..63]', 't[0..31]']] },
      complexity: `<p>O(r·c) time and space; far fewer cache misses than the plain loop for large matrices.</p>`,
      followUps: ['Use a single <code>int[]</code> of length r·c (row-major) instead of jagged arrays.', 'Transpose a square matrix in place, tile by tile.']
    }
  });

  practice.push({
    title: 'Is the Benchmark Difference Real?',
    level: 'Medium', tags: ['benchmarking', 'statistics', 'confidence intervals'], companies: ['Microsoft', 'Netflix', 'Shopify'],
    statement: `<p>BenchmarkDotNet reports each result as Mean ± Error (half of the 99.9% confidence interval). Given ${C('meanA, errA, meanB, errB')} in ns, return ${C('"same"')} if the intervals [mean − err, mean + err] overlap (touching counts as overlap); otherwise ${C('"A faster x1.52"')} or ${C('"B faster x1.52"')}, where the factor is slowerMean / fasterMean with two decimals (invariant culture).</p>`,
    constraints: `0 &lt; means ≤ 10<sup>9</sup>, 0 ≤ errors &lt; means.`,
    example: `<p>${C('(20.4, 0.3, 31.0, 0.5)')} → ${H.c('g', '"A faster x1.52"')}; ${C('(20.4, 0.3, 20.6, 0.4)')} → ${H.c('g', '"same"')}</p>`,
    brute: { why: `<p>Comparing only the means declares a winner for 20.4 vs 20.6 ns — a 1% "speedup" that is pure noise. Taking the error margins into account is the minimum standard before claiming an improvement.</p>`, code: `
static class MeansOnly
{
    public static string Compare(double a, double b) => a < b ? "A faster" : "B faster";   // ignores noise
}` },
    mcq: { q: 'Two results: 12.7 ± 0.4 ns and 12.9 ± 0.5 ns. What can you conclude?', options: ['Nothing — the intervals overlap, so there is no evidence of a difference', 'The first is 1.6% faster', 'The second is faster', 'Rerun without warm-up'], answer: 0, explain: '12.7 + 0.4 = 13.1 is above 12.9 − 0.5 = 12.4. Overlapping confidence intervals mean the data does not support a difference.' },
    hints: [`<p>Hint 1: intervals overlap iff ${C('loA <= hiB && loB <= hiA')}.</p>`, `<p>Hint 2: the faster one has the smaller mean; factor = ${C('Math.Max(a, b) / Math.Min(a, b)')}.</p>`, `<p>Hint 3: ${C('factor.ToString("F2", CultureInfo.InvariantCulture)')}.</p>`],
    tests: { sig: 'double double double double -> string', fn: 'compare', cases: [
      [[20.4, 0.3, 31.0, 0.5], 'A faster x1.52'],
      [[20.4, 0.3, 20.6, 0.4], 'same'],
      [[100, 1, 50, 1], 'B faster x2.00'],
      [[10, 1, 12, 1], 'same'],
      [[10, 0, 10, 0], 'same'],
      [[1000000000, 0, 1, 0], 'B faster x1000000000.00'],
      [[3, 0.5, 4.5, 0.9], 'A faster x1.50']
    ] },
    solution: {
      approach: `<p>Build both intervals, test overlap, and only if they are disjoint report the faster side and the ratio of means.</p>`,
      code: `
using System.Globalization;

public class Solution
{
    public static string Compare(double meanA, double errA, double meanB, double errB)
    {
        double loA = meanA - errA, hiA = meanA + errA, loB = meanB - errB, hiB = meanB + errB;
        if (loA <= hiB && loB <= hiA) return "same";
        string who = meanA < meanB ? "A" : "B";
        double factor = Math.Max(meanA, meanB) / Math.Min(meanA, meanB);
        return $"{who} faster x{factor.ToString("F2", CultureInfo.InvariantCulture)}";
    }
}`,
      dry: { head: ['case', 'interval A', 'interval B', 'result'], rows: [['20.4 vs 31.0', '[20.1, 20.7]', '[30.5, 31.5]', 'A faster x1.52'], ['20.4 vs 20.6', '[20.1, 20.7]', '[20.2, 21.0]', 'same'], ['10 vs 12 (±1)', '[9, 11]', '[11, 13]', 'same (touching)']] },
      complexity: `<p>O(1) time and O(1) extra space.</p>`,
      followUps: ['Why is non-overlap of 99.9% intervals a conservative test? (A proper two-sample test can detect smaller differences.)', 'Add a minimum practical threshold: report "same" if the ratio is below 1.05 even when intervals do not overlap.']
    }
  });

  practice.push({
    title: 'Predict the Output: Struct Copies and Defensive Copies',
    level: 'Easy', tags: ['output prediction', 'structs', 'readonly'], companies: ['Microsoft', 'Unity', 'Capgemini'],
    statement: `<p>Write down the 6 lines this program prints.</p>${P(`
var h = new Holder();
h.Ro.Increment(); Console.WriteLine(h.Ro.Value);
h.Rw.Increment(); Console.WriteLine(h.Rw.Value);
var arr = new Counter[1];
arr[0].Increment(); Console.WriteLine(arr[0].Value);
var list = new List<Counter> { new Counter() };
var tmp = list[0]; tmp.Increment(); Console.WriteLine(list[0].Value);
list[0].Increment(); Console.WriteLine(list[0].Value);
Console.WriteLine(Bump(new Counter()));

static int Bump(in Counter c) { c.Increment(); return c.Value; }
struct Counter { public int Value; public void Increment() => Value++; }
class Holder { public readonly Counter Ro; public Counter Rw; }`)}`,
    constraints: `.NET 8, C# 12.`,
    example: `<p>Line 1 is ${H.c('g', '0')}: calling a mutating method on a ${C('readonly')} field makes the compiler operate on a <b>defensive copy</b>.</p>`,
    brute: { why: `<p>Treating structs like objects predicts 1, 1, 1, 1, 1, 1. But a struct is copied on every read that is not a <b>variable</b>: a readonly field and an ${C('in')} parameter get defensive copies, ${C('list[0]')} returns a copy from the indexer, and only a field or an array element is mutated in place.</p>`, code: `
static class Guess
{
    public static int[] Lines() => new[] { 1, 1, 1, 1, 1, 1 };
}` },
    mcq: { q: 'Why does <code>arr[0].Increment()</code> change the array but <code>list[0].Increment()</code> does not change the list?', options: ['An array element is a variable (accessed by reference); List&lt;T&gt;\'s indexer returns a copy', 'Arrays are immutable', 'List&lt;T&gt; stores boxed structs', 'The JIT optimises the list call away'], answer: 0, explain: 'arr[0] is a storage location (ldelema gives a reference). list[0] calls get_Item, which returns the struct by value; the method mutates that temporary.' },
    hints: [`<p>Hint 1: ask for each receiver: is it a <b>variable</b> (local, array element, mutable field) or a <b>value</b> (property/indexer result, readonly field, ${C('in')} parameter)?</p>`, `<p>Hint 2: values are copied before a non-readonly method is called on them.</p>`, `<p>Hint 3: ${C('var tmp = list[0];')} copies too; mutating ${C('tmp')} does not touch the list.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '0\n1\n1\n0\n0\n0' }] },
    solution: {
      approach: `<p>Only real variables are mutated in place: the mutable field ${C('Rw')} and the array element. The readonly field and the ${C('in')} parameter get defensive copies, and the list indexer returns copies.</p>`,
      code: { lang: 'csharp', run: true, code: `
var h = new Holder();
h.Ro.Increment(); Console.WriteLine(h.Ro.Value);         // 0  defensive copy of readonly field
h.Rw.Increment(); Console.WriteLine(h.Rw.Value);         // 1  mutable field, in place
var arr = new Counter[1];
arr[0].Increment(); Console.WriteLine(arr[0].Value);     // 1  array element is a variable
var list = new List<Counter> { new Counter() };
var tmp = list[0]; tmp.Increment(); Console.WriteLine(list[0].Value);   // 0  tmp is a copy
list[0].Increment(); Console.WriteLine(list[0].Value);   // 0  indexer returned a copy
Console.WriteLine(Bump(new Counter()));                  // 0  in parameter: defensive copy

static int Bump(in Counter c) { c.Increment(); return c.Value; }
struct Counter { public int Value; public void Increment() => Value++; }
class Holder { public readonly Counter Ro; public Counter Rw; }` },
      dry: { head: ['receiver', 'variable or value?', 'output'], rows: [['h.Ro (readonly field)', 'value → copy', '0'], ['h.Rw', 'variable', '1'], ['arr[0]', 'variable', '1'], ['list[0]', 'value (indexer)', '0'], ['in parameter c', 'value → copy', '0']] },
      complexity: `<p>O(1). For large structs each defensive copy is a real memory copy — mark structs <code>readonly</code> to avoid them.</p>`,
      followUps: ['What changes if Counter is declared <code>readonly struct</code>? (Increment no longer compiles.)', 'How does <code>CollectionsMarshal.AsSpan(list)[0].Increment()</code> behave? (Mutates in place.)']
    }
  });

  practice.push({
    title: 'IL Interpreter with Locals and Branches',
    level: 'Hard', tags: ['IL', 'interpreter', 'control flow'], companies: ['Microsoft', 'JetBrains', 'Unity'],
    statement: `<p>Extend the IL simulator with locals and control flow. Instructions: ${C('ldarg.0')}, ${C('ldc.i4 N')}, ${C('ldloc.K')} / ${C('stloc.K')} (K = 0..3, locals start at 0), ${C('add')}, ${C('sub')}, ${C('mul')}, ${C('clt')} / ${C('cgt')} / ${C('ceq')} (pop b then a, push 1 if a&lt;b / a&gt;b / a==b else 0), ${C('br L')}, ${C('brtrue L')}, ${C('brfalse L')} (pop a value), ${C('ret')}, and label lines ${C('"L:"')}. Arithmetic wraps. Return the returned value as a string; ${C('"invalid"')} on stack underflow, unknown instruction or label, ret on an empty stack, or running off the end; ${C('"timeout"')} if more than 1,000,000 instructions execute.</p>`,
    constraints: `Up to 1000 lines.`,
    example: `<p>The sum-1-to-n program in the hints with arg0 = 10 → ${H.c('g', '"55"')}</p>`,
    brute: { why: `<p>Searching the program for the label text on every branch makes each jump O(lines). Resolving labels to indexes once, in a first pass, makes jumps O(1) — the same reason real assemblers and JITs resolve branch targets before executing or compiling.</p>`, code: `
static class LabelSearch
{
    public static int Find(string[] code, string label) => Array.IndexOf(code, label + ":");   // O(n) per jump
}` },
    mcq: { q: 'In IL, how is <code>while (i &lt;= n) { ... }</code> typically represented?', options: ['Labels and conditional branches (e.g. cgt + brtrue to the exit, br back to the top)', 'A special loop instruction', 'Recursion', 'A switch table'], answer: 0, explain: 'IL has no structured loops; compilers emit comparisons and branches. The JIT rebuilds loops from the control-flow graph.' },
    hints: [`<p>Hint 1: first pass: map ${C('"name:"')} lines to their index; duplicate labels are invalid.</p>`, `<p>Hint 2: use an instruction pointer ${C('pc')}; branches set ${C('pc')} to the label index, everything else does ${C('pc++')}.</p>`, `<p>Hint 3: sample program (sum 1..n): ${C('ldc.i4 0, stloc.0, ldc.i4 1, stloc.1, loop:, ldloc.1, ldarg.0, cgt, brtrue end, ldloc.0, ldloc.1, add, stloc.0, ldloc.1, ldc.i4 1, add, stloc.1, br loop, end:, ldloc.0, ret')}.</p>`],
    tests: { sig: 'string[] int -> string', fn: 'interpret', cases: [
      [[['ldc.i4 0', 'stloc.0', 'ldc.i4 1', 'stloc.1', 'loop:', 'ldloc.1', 'ldarg.0', 'cgt', 'brtrue end', 'ldloc.0', 'ldloc.1', 'add', 'stloc.0', 'ldloc.1', 'ldc.i4 1', 'add', 'stloc.1', 'br loop', 'end:', 'ldloc.0', 'ret'], 10], '55'],
      [[['ldc.i4 0', 'stloc.0', 'ldc.i4 1', 'stloc.1', 'loop:', 'ldloc.1', 'ldarg.0', 'cgt', 'brtrue end', 'ldloc.0', 'ldloc.1', 'add', 'stloc.0', 'ldloc.1', 'ldc.i4 1', 'add', 'stloc.1', 'br loop', 'end:', 'ldloc.0', 'ret'], 0], '0'],
      [[['ldarg.0', 'ldc.i4 0', 'clt', 'brfalse pos', 'ldarg.0', 'ldc.i4 -1', 'mul', 'ret', 'pos:', 'ldarg.0', 'ret'], -7], '7'],
      [[['ldarg.0', 'ldc.i4 0', 'clt', 'brfalse pos', 'ldarg.0', 'ldc.i4 -1', 'mul', 'ret', 'pos:', 'ldarg.0', 'ret'], 5], '5'],
      [[['top:', 'br top'], 0], 'timeout'],
      [[['br nowhere'], 0], 'invalid'],
      [[['ldloc.3', 'ret'], 0], '0'],
      [[['ldc.i4 1', 'ldc.i4 1', 'ceq', 'ret'], 0], '1'],
      [[['ldc.i4 5', 'stloc.0'], 0], 'invalid'],
      [[['brtrue x', 'x:', 'ret'], 0], 'invalid'],
      [[['ldc.i4 0', 'stloc.0', 'ldc.i4 1', 'stloc.1', 'loop:', 'ldloc.1', 'ldarg.0', 'cgt', 'brtrue end', 'ldloc.0', 'ldloc.1', 'add', 'stloc.0', 'ldloc.1', 'ldc.i4 1', 'add', 'stloc.1', 'br loop', 'end:', 'ldloc.0', 'ret'], 70000], '-1844932296']
    ] },
    solution: {
      approach: `<p>Two passes: resolve labels, then execute with a program counter, an int stack and four locals. A step counter guards against infinite loops. Comparison instructions push 0/1, and conditional branches pop the condition — exactly how C# conditions and loops are encoded in IL.</p>`,
      code: `
public class Solution
{
    public static string Interpret(string[] code, int arg0)
    {
        var labels = new Dictionary<string, int>();
        for (int i = 0; i < code.Length; i++)
            if (code[i].EndsWith(':') && !labels.TryAdd(code[i][..^1], i)) return "invalid";

        var st = new Stack<int>();
        var loc = new int[4];
        int pc = 0, steps = 0;
        while (pc < code.Length)
        {
            if (++steps > 1_000_000) return "timeout";
            string[] p = code[pc].Split(' ');
            string op = p[0];
            if (op.EndsWith(':')) { pc++; continue; }
            switch (op)
            {
                case "ldarg.0": st.Push(arg0); break;
                case "ldc.i4" when p.Length == 2 && int.TryParse(p[1], out int n): st.Push(n); break;
                case "ldloc.0" or "ldloc.1" or "ldloc.2" or "ldloc.3": st.Push(loc[op[^1] - '0']); break;
                case "stloc.0" or "stloc.1" or "stloc.2" or "stloc.3":
                    if (st.Count < 1) return "invalid";
                    loc[op[^1] - '0'] = st.Pop(); break;
                case "add" or "sub" or "mul" or "clt" or "cgt" or "ceq":
                {
                    if (st.Count < 2) return "invalid";
                    int b = st.Pop(), a = st.Pop();
                    st.Push(op switch
                    {
                        "add" => unchecked(a + b),
                        "sub" => unchecked(a - b),
                        "mul" => unchecked(a * b),
                        "clt" => a < b ? 1 : 0,
                        "cgt" => a > b ? 1 : 0,
                        _ => a == b ? 1 : 0
                    });
                    break;
                }
                case "br" or "brtrue" or "brfalse":
                {
                    if (p.Length != 2 || !labels.TryGetValue(p[1], out int target)) return "invalid";
                    bool jump = true;
                    if (op != "br")
                    {
                        if (st.Count < 1) return "invalid";
                        int v = st.Pop();
                        jump = op == "brtrue" ? v != 0 : v == 0;
                    }
                    if (jump) { pc = target; continue; }
                    break;
                }
                case "ret": return st.Count >= 1 ? st.Pop().ToString() : "invalid";
                default: return "invalid";
            }
            pc++;
        }
        return "invalid";
    }
}`,
      dry: { head: ['pc', 'instruction', 'stack', 'locals (s, i)'], rows: [['5', 'ldloc.1', '[1]', '0, 1'], ['7', 'cgt (1 > 10?)', '[0]', '0, 1'], ['8', 'brtrue end (no jump)', '[]', '0, 1'], ['12', 'stloc.0', '[]', '1, 1'], ['17', 'br loop', '[]', '1, 2'], ['…', 'after i = 11', '[]', '55, 11 → ret 55']] },
      complexity: `<p>O(lines) for label resolution; O(1) per executed instruction; at most 10<sup>6</sup> steps.</p>`,
      followUps: ['Pre-decode instructions into a struct array to avoid Split in the loop.', 'Detect the maximum stack depth statically (what the C# compiler records as .maxstack).']
    }
  });

  practice.push({
    title: 'Allocation-Free LRU Cache',
    level: 'Hard', tags: ['LRU', 'allocations', 'arrays', 'design'], companies: ['Microsoft', 'Amazon', 'Meta'],
    statement: `<p>Implement ${C('LruCache(int capacity)')} with ${C('int Get(int key)')} (−1 if absent) and ${C('void Put(int key, int value)')}, both O(1), that allocates <b>nothing</b> after construction. Keep entries in parallel arrays (${C('keys')}, ${C('values')}, ${C('prev')}, ${C('next')}) forming a doubly linked list of slot indexes, and a ${C('Dictionary<int, int>')} from key to slot created with the capacity up front. The test runs the operations once on a warm-up instance, then on a fresh instance while measuring allocated bytes; it returns the results of the ${C('Get')} calls followed by the allocated byte count, which must be 0.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>4</sup>, up to 10<sup>5</sup> operations; keys and values are non-negative ints.`,
    example: `<p>capacity 2: put(1,1), put(2,2), get(1), put(3,3), get(2), put(4,4), get(1), get(3), get(4) → ${H.c('g', '[1, -1, -1, 3, 4, 0]')}</p>`,
    brute: { why: `<p>The textbook version with ${C('LinkedList<(int, int)>')} allocates a ${C('LinkedListNode')} on every Put (and the evicted node becomes garbage). In a cache that serves millions of requests, that is a steady allocation stream. Slots in preallocated arrays are reused forever.</p>`, code: `
sealed class NodeLru(int capacity)
{
    private readonly Dictionary<int, LinkedListNode<(int K, int V)>> _map = new();
    private readonly LinkedList<(int K, int V)> _list = new();
    public void Put(int k, int v)
    {
        if (_map.Remove(k, out var old)) _list.Remove(old);
        else if (_map.Count == capacity) { _map.Remove(_list.Last!.Value.K); _list.RemoveLast(); }
        _map[k] = _list.AddFirst((k, v));                    // allocates a node every time
    }
}` },
    mcq: { q: 'Why does a Dictionary created with <code>new Dictionary&lt;int,int&gt;(capacity)</code> not allocate when keys are removed and added within that capacity?', options: ['Removed entries go to an internal free list that later adds reuse; no resize is needed while Count ≤ capacity', 'Dictionaries never allocate', 'int keys are stored on the stack', 'The GC pre-allocates them'], answer: 0, explain: 'Entries live in a preallocated array; Remove links the slot into a free list and Add takes from it. Only growing beyond the capacity triggers a resize (new arrays).' },
    hints: [`<p>Hint 1: slot 0..capacity−1; keep ${C('head')} (most recent) and ${C('tail')} (least recent) indexes, −1 for none, and a ${C('count')} of used slots.</p>`, `<p>Hint 2: Get: look up the slot, unlink it, link it at the head. Put on a new key when full: reuse the tail slot — remove its old key from the dictionary first.</p>`, `<p>Hint 3: write small ${C('Unlink(int s)')} and ${C('PushFront(int s)')} helpers that only update the prev/next arrays.</p>`],
    tests: { sig: 'int int[] int[] int[] -> int[]', fn: 'runLru', harness: { csharp: `
public static class Check
{
    public static int[] RunLru(int capacity, int[] kinds, int[] keys, int[] vals)
    {
        int gets = 0; foreach (int k in kinds) if (k == 0) gets++;
        var results = new int[gets + 1];
        var warm = new LruCache(capacity);
        Play(warm, kinds, keys, vals, results);
        var cache = new LruCache(capacity);
        long before = GC.GetAllocatedBytesForCurrentThread();
        Play(cache, kinds, keys, vals, results);
        results[gets] = (int)(GC.GetAllocatedBytesForCurrentThread() - before);
        return results;
    }
    static void Play(LruCache c, int[] kinds, int[] keys, int[] vals, int[] results)
    {
        int r = 0;
        for (int i = 0; i < kinds.Length; i++)
            if (kinds[i] == 0) results[r++] = c.Get(keys[i]); else c.Put(keys[i], vals[i]);
    }
}` }, check: '(args, out) => { const [cap, kinds, keys, vals] = args; const m = new Map(); const exp = []; for (let i = 0; i < kinds.length; i++) { const k = keys[i]; if (kinds[i] === 0) { if (m.has(k)) { const v = m.get(k); m.delete(k); m.set(k, v); exp.push(v); } else exp.push(-1); } else { if (m.has(k)) m.delete(k); else if (m.size === cap) m.delete(m.keys().next().value); m.set(k, vals[i]); } } exp.push(0); return out.length === exp.length && out.every((v, i) => v === exp[i]); }', cases: [
      [[2, [1, 1, 0, 1, 0, 1, 0, 0, 0], [1, 2, 1, 3, 2, 4, 1, 3, 4], [1, 2, 0, 3, 0, 4, 0, 0, 0]], [1, -1, -1, 3, 4, 0]],
      [[1, [1, 1, 0, 0], [1, 2, 1, 2], [1, 2, 0, 0]], [-1, 2, 0]],
      [[2, [1, 1, 0, 1, 1, 0, 0, 0], [1, 1, 1, 2, 3, 1, 2, 3], [1, 5, 0, 2, 3, 0, 0, 0]], [5, -1, 2, 3, 0]],
      [[3, [0, 0], [7, 8], [0, 0]], [-1, -1, 0]],
      [[2, [1, 1, 0, 1, 0, 0], [1, 2, 1, 3, 1, 2], [10, 20, 0, 30, 0, 0]], [10, 10, -1, 0]],
      [[1000, { $concat: [{ $rep: 1, n: 50000 }, { $rep: 0, n: 50000 }] }, { $concat: [{ $range: [0, 50000] }, { $range: [49000, 99000] }] }, { $concat: [{ $range: [0, 50000] }, { $rep: 0, n: 50000 }] }], 'checked by function']
    ] },
    solution: {
      approach: `<p>Index-based doubly linked list in arrays plus a pre-sized dictionary. Every operation only rewrites ints in existing arrays; eviction recycles the tail slot. No node objects, no resizing — zero allocations per operation.</p>`,
      code: `
public class Solution
{
    public static int Demo()
    {
        var c = new LruCache(2);
        c.Put(1, 1); c.Put(2, 2); c.Get(1); c.Put(3, 3);
        return c.Get(2);   // -1
    }
}

public sealed class LruCache
{
    private readonly int[] _keys, _vals, _prev, _next;
    private readonly Dictionary<int, int> _slot;
    private int _head = -1, _tail = -1, _count;

    public LruCache(int capacity)
    {
        _keys = new int[capacity]; _vals = new int[capacity];
        _prev = new int[capacity]; _next = new int[capacity];
        _slot = new Dictionary<int, int>(capacity);
    }

    public int Get(int key)
    {
        if (!_slot.TryGetValue(key, out int s)) return -1;
        MoveToFront(s);
        return _vals[s];
    }

    public void Put(int key, int value)
    {
        if (_slot.TryGetValue(key, out int s)) { _vals[s] = value; MoveToFront(s); return; }
        if (_count < _keys.Length) s = _count++;
        else { s = _tail; _slot.Remove(_keys[s]); Unlink(s); }
        _keys[s] = key; _vals[s] = value;
        _slot[key] = s;
        PushFront(s);
    }

    private void MoveToFront(int s) { if (s == _head) return; Unlink(s); PushFront(s); }

    private void Unlink(int s)
    {
        int p = _prev[s], n = _next[s];
        if (p >= 0) _next[p] = n; else _head = n;
        if (n >= 0) _prev[n] = p; else _tail = p;
    }

    private void PushFront(int s)
    {
        _prev[s] = -1; _next[s] = _head;
        if (_head >= 0) _prev[_head] = s;
        _head = s;
        if (_tail < 0) _tail = s;
    }
}`,
      dry: { head: ['op', 'list (MRU → LRU)', 'result'], rows: [['put(1,1)', '1', '—'], ['put(2,2)', '2, 1', '—'], ['get(1)', '1, 2', '1'], ['put(3,3)', '3, 1 (2 evicted, slot reused)', '—'], ['get(2)', '3, 1', '-1']] },
      complexity: `<p>O(1) average per operation; O(capacity) memory allocated once; 0 bytes per operation.</p>`,
      followUps: ['Make it generic over <code>TKey : notnull</code> and <code>TValue</code>.', 'Add thread safety with a lock and measure contention, or shard the cache.']
    }
  });

  practice.push({
    title: 'Estimate the Heap Size of a Data Model',
    level: 'Hard', tags: ['memory', 'object layout', 'class vs struct'], companies: ['Microsoft', 'Unity', 'Jane Street'],
    statement: `<p>A ${C('List<Order>')} is created with capacity n and filled with n orders. ${C('Order')} has ${C('string Name')}, ${C('int[] Items')} and ${C('int Id')}; each order gets ${C('new string(\'a\', nameLen)')} and ${C('new int[items]')}. Return the total bytes allocated (64-bit .NET 8) when Order is a class (${C('asStruct = false')}) or a struct. Rules: the List object is 32 bytes; its backing array is not allocated for capacity 0 (it uses ${C('Array.Empty')}), otherwise it is an array of references (8 bytes each) for a class or of 24-byte structs (two references + int, padded) for a struct; an Order object is 40 bytes; a zero-length string is the shared empty string (0 bytes) — otherwise round8(22 + 2·len); ${C('new int[k]')} always allocates round8(24 + 4k), even for k = 0. Array sizes are round8(24 + n·element).</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>, 0 ≤ nameLen, items ≤ 1000. Use long.`,
    example: `<p>${C('n = 1, nameLen = 5, items = 3, class')} → 32 + 32 + 40 + 32 + 40 = ${H.c('g', '176')}; as struct → 32 + 48 + 32 + 40 = ${H.c('g', '152')}</p>`,
    brute: { why: `<p>"Name is 5 chars = 10 bytes, 3 ints = 12 bytes, so 26 bytes per order" underestimates by 6×. Real memory is dominated by headers, method-table pointers, length fields, references and rounding — which is exactly why switching small entities to structs (or columnar arrays) saves so much.</p>`, code: `
static class Payload
{
    public static long Bytes(int n, int nameLen, int items) => (long)n * (2 * nameLen + 4 * items + 4);   // payload only
}` },
    mcq: { q: 'Turning <code>Order</code> from a class into a struct saves, per order, roughly…', options: ['The 40-byte object minus the growth of the array slot from 8 to 24 bytes: 24 bytes', 'Nothing — the same fields are stored', 'All memory for Name and Items', '8 bytes'], answer: 0, explain: 'The class costs a 40-byte object plus an 8-byte reference in the array; the struct costs 24 bytes inline in the array. The strings and int arrays are separate objects either way.' },
    hints: [`<p>Hint 1: ${C('static long R8(long v) => (v + 7) / 8 * 8;')}</p>`, `<p>Hint 2: per order: ${C('(asStruct ? 0 : 40) + (nameLen == 0 ? 0 : R8(22 + 2L * nameLen)) + R8(24 + 4L * items)')}.</p>`, `<p>Hint 3: list part: ${C('32 + (n == 0 ? 0 : R8(24 + (long)n * (asStruct ? 24 : 8)))')}.</p>`],
    tests: { sig: 'int int int bool -> long', fn: 'heapBytes', cases: [
      [[1, 5, 3, false], 176],
      [[1, 5, 3, true], 152],
      [[0, 0, 0, false], 32],
      [[10, 7, 0, false], 1176],
      [[10, 7, 0, true], 936],
      [[3, 0, 10, false], 392],
      [[3, 0, 10, true], 320],
      [[1000000, 10, 4, false], 136000056],
      [[1000000, 10, 4, true], 112000056]
    ] },
    solution: {
      approach: `<p>Sum the objects that are actually allocated: the List, its backing array (size depends on reference vs inline struct elements), and per order the Order object (class only), the name string (unless empty) and the items array. Each size follows the header + payload + rounding rules; these numbers match ${C('GC.GetAllocatedBytesForCurrentThread()')} measurements on .NET 8.</p>`,
      code: `
public class Solution
{
    public static long HeapBytes(int n, int nameLen, int items, bool asStruct)
    {
        long list = 32 + (n == 0 ? 0 : R8(24 + (long)n * (asStruct ? 24 : 8)));
        long perOrder = (asStruct ? 0 : 40)
                      + (nameLen == 0 ? 0 : R8(22 + 2L * nameLen))
                      + R8(24 + 4L * items);
        return list + n * perOrder;
    }

    static long R8(long v) => (v + 7) / 8 * 8;
}`,
      dry: { head: ['part', 'class', 'struct'], rows: [['List object', '32', '32'], ['backing array (n = 1)', '24 + 8 = 32', '24 + 24 = 48'], ['Order object', '40', '— (inline)'], ['Name (5 chars)', '32', '32'], ['Items (3 ints)', '40', '40'], ['total', '176', '152']] },
      complexity: `<p>O(1) time and O(1) extra space.</p>`,
      followUps: ['Model a columnar layout (int[] Ids, string[] Names) and compare.', 'Add List growth: built without a capacity, the backing arrays 4, 8, 16, … are also allocated.']
    }
  });

  /* ======================================================================
     QUIZ (authored with the correct option first; rotated below)
     ====================================================================== */
  quiz.push(
    { q: `Which IL instruction allocates when you pass an <code>int</code> to a parameter of type <code>object</code>?`, options: ['<code>box</code>', '<code>ldarg</code>', '<code>callvirt</code>', '<code>unbox.any</code>'], answer: 0, explain: 'box copies the value into a new heap object (24 bytes for an int on 64-bit).' },
    { q: `A lambda captures a local variable. What does the C# compiler generate?`, options: ['A hidden closure class whose field holds the variable, allocated with newobj', 'A static method only', 'A struct on the stack', 'Nothing — the JIT handles captures'], answer: 0, explain: 'Captured locals are hoisted into a display class (<>c__DisplayClass…); the delegate targets an instance method of it.' },
    { q: `After how many calls does a Tier0 method become eligible for Tier1 recompilation by default?`, options: ['30', '1', '1000', 'Never — only R2R code is recompiled'], answer: 0, explain: 'The default call-count threshold is 30 (after a short start-up delay); the method is then recompiled with full optimisation in the background.' },
    { q: `What does dynamic PGO (default in .NET 8) enable at Tier1?`, options: ['Guarded devirtualization and hot/cold layout based on types and branches observed in Tier0', 'Ahead-of-time compilation', 'Automatic parallelisation of loops', 'Garbage-free code'], answer: 0, explain: 'Instrumented Tier0 code records which types reach virtual/interface calls and which branches are taken; Tier1 uses it.' },
    { q: `What is the main trade-off of Native AOT?`, options: ['Fast start-up and small footprint, but no run-time code generation and no tiered/PGO optimisation', 'Faster peak throughput than JIT in all cases', 'It requires the .NET runtime to be installed', 'It disables the garbage collector'], answer: 0, explain: 'Everything is compiled ahead of time; Reflection.Emit and some dynamic generic instantiations are unavailable, and code cannot be re-optimised from run-time profiles.' },
    { q: `How many bytes does <code>new object()</code> occupy on 64-bit .NET?`, options: ['24', '8', '16', '12'], answer: 0, explain: 'Header (8) + MethodTable pointer (8) = 16, rounded up to the minimum object size of 24.' },
    { q: `What is <code>Unsafe.SizeOf</code> of <code>struct S { byte A; int B; byte C; }</code>?`, options: ['12', '6', '9', '8'], answer: 0, explain: 'Sequential layout: A@0, padding, B@4, C@8, tail padding to a multiple of 4 → 12. Reordering to int, byte, byte gives 8.' },
    { q: `Two threads increment adjacent elements of a <code>long[]</code> in a tight loop. The likely performance problem is…`, options: ['False sharing: both counters live in the same cache line', 'Lock contention', 'Boxing', 'Bounds checks'], answer: 0, explain: 'Each write invalidates the line in the other core\'s cache. Padding each counter to its own 64-byte line fixes it.' },
    { q: `In which loop does the JIT eliminate the bounds check on <code>a[i]</code>?`, options: ['<code>for (int i = 0; i &lt; a.Length; i++)</code>', '<code>for (int i = 0; i &lt; n; i++)</code> with unrelated n', '<code>for (int i = 0; i &lt; _field.Length; i++) _field[i]</code> on a field', '<code>for (int i = a.Length; i &gt;= 0; i--)</code>'], answer: 0, explain: 'The canonical loop over a local array proves 0 ≤ i &lt; a.Length. Unrelated bounds and fields that may change keep the check; the last loop even reads out of range at i = a.Length.' },
    { q: `Why might <code>[MethodImpl(MethodImplOptions.AggressiveInlining)]</code> have no effect?`, options: ['The JIT may still refuse, e.g. for recursive methods or methods that are too large or have unsupported constructs', 'It only works in Debug', 'It must be combined with sealed', 'It applies only to properties'], answer: 0, explain: 'It is a strong hint that raises the size budget; some methods still cannot be inlined.' },
    { q: `A benchmark reports 0.01 ns for <code>Math.Sqrt(42.0)</code> with the result discarded. Most likely…`, options: ['The JIT folded the constant and removed the dead code', 'Sqrt is a single-cycle instruction', 'The timer resolution is too high', 'The GC was disabled'], answer: 0, explain: 'Return the result and read inputs from fields set in GlobalSetup so the work cannot be optimised away.' },
    { q: `In a BenchmarkDotNet summary, Error is…`, options: ['Half of the 99.9% confidence interval of the mean', 'The number of failed iterations', 'The standard deviation', 'The difference from the baseline'], answer: 0, explain: 'If two results\' Mean ± Error intervals overlap, the data does not support a difference.' },
    { q: `Which call allocates on every invocation?`, options: ['<code>data.Count(x =&gt; x &gt; threshold)</code> where threshold is a local', '<code>foreach (var x in list)</code> on a <code>List&lt;int&gt;</code>', '<code>int.Parse(span)</code>', '<code>span.IndexOf(\',\')</code>'], answer: 0, explain: 'The capturing lambda creates a closure and delegate per call (plus the LINQ enumerator). The others allocate nothing.' },
    { q: `<code>string a = "hi"; string b = "h" + "i";</code> — <code>ReferenceEquals(a, b)</code>?`, options: ['True — constant folding produces the interned literal', 'False — concatenation always allocates', 'Depends on the JIT tier', 'Compile error'], answer: 0, explain: 'Both operands are constants, so the compiler emits the single literal "hi", which is interned.' },
    { q: `Why is <code>string.Intern</code> risky for user-provided strings?`, options: ['The intern pool is process-wide and never shrinks, so unbounded input leaks memory', 'It changes the string\'s value', 'It is not thread-safe', 'It only works for ASCII'], answer: 0, explain: 'Use a local pool (HashSet.TryGetValue) that can be discarded instead.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What happens between writing C# and running machine code?', a: `<p>Roslyn compiles C# to <b>IL</b> plus <b>metadata</b> in an assembly (.dll). At run time the CLR loads the assembly, and the first time a method is called its stub invokes the <b>JIT</b> (RyuJIT), which compiles that method's IL to native code for the current CPU. With tiered compilation the first version is a quick Tier0 compile; hot methods are recompiled at Tier1 with full optimisation and, in .NET 8, dynamic PGO. Alternatives: <b>ReadyToRun</b> precompiles IL into the assembly for faster start-up (hot code still re-jitted), and <b>Native AOT</b> compiles the whole app ahead of time into a single native executable with no JIT. Metadata stays available for reflection (subject to trimming).</p>`, followUps: ['What does IL look like for a + b?', 'Why does the first request to a web app take longer?'] },
    { level: 'I', q: 'Explain tiered compilation and on-stack replacement.', a: `<p>Tiered compilation trades start-up speed against steady-state speed. <b>Tier0</b>: the first call compiles quickly with minimal optimisation and instrumentation (call counts, and with PGO type/branch profiles). After ~30 calls (and a start-up delay) the method is queued and a background thread compiles <b>Tier1</b> with full optimisation using the profile; call sites are then patched. A method entered once but containing a long loop would otherwise stay in slow Tier0 code — <b>OSR</b> (.NET 7+) compiles an optimised version and transfers the running frame into it at a loop patchpoint. ${C('[MethodImpl(AggressiveOptimization)]')} bypasses tiering entirely (but loses PGO). Tiering can be disabled with ${C('<TieredCompilation>false</TieredCompilation>')}.</p>`, followUps: ['Why do static readonly fields become constants at Tier1?', 'How does this affect benchmarking?'] },
    { level: 'A', q: 'ReadyToRun vs Native AOT — when would you pick each?', a: `<p><b>ReadyToRun</b> adds precompiled native code to normal IL assemblies. Start-up improves because less JIT work happens, the app keeps full .NET compatibility (reflection, dynamic code, plugins), and hot methods are still re-jitted at Tier1 with PGO, so peak throughput is unchanged. Costs: bigger files, code is less optimised until re-jit. <b>Native AOT</b> produces one self-contained native binary: fastest start-up, lowest memory, no JIT on the machine — ideal for CLI tools, serverless functions and small containerised services. Costs: no ${C('Reflection.Emit')} or run-time code generation, trimming warnings must be solved (source generators instead of reflection), some libraries are incompatible, no dynamic PGO so steady-state throughput can be lower than JIT for some workloads. Choose by measuring start-up, memory and throughput for your actual service.</p>`, followUps: ['What does trimming remove?', 'Why is MakeGenericType a problem under AOT?'] },
    { level: 'I', q: 'Describe the memory layout of a .NET object.', a: `<p>On 64-bit, a reference points to the <b>MethodTable pointer</b>; the 8 bytes before it are the <b>object header</b> (sync block index word: thin-lock owner, cached hash code or a sync block index, GC bits). Fields follow the MT pointer. For classes the runtime uses auto layout: references grouped first, then fields ordered by size to minimise padding. The minimum object size is 24 bytes, total size is rounded to 8. Arrays add a length field (padded to 8) and then elements; strings have a length and UTF-16 chars plus a terminating null. So ${C('new object()')} is 24 bytes, a boxed int 24, ${C('"hello"')} 32, ${C('new int[3]')} 40. The MethodTable holds type information: base size, GC reference map, vtable slots and the interface map.</p>`, followUps: ['Where is the lock state stored?', 'Why is the minimum size 24 bytes?'] },
    { level: 'I', q: 'How does struct layout work and how can you control it?', a: `<p>Structs default to <b>sequential</b> layout: fields in declaration order, each aligned to its natural alignment, total rounded to the largest alignment — so ${C('byte, int, byte')} is 12 bytes while ${C('int, byte, byte')} is 8. Control: ${C('[StructLayout(LayoutKind.Sequential, Pack = n)]')} limits alignment (wire formats), ${C('LayoutKind.Explicit')} with ${C('[FieldOffset]')} gives exact offsets and unions, ${C('Size = 64')} pads to a cache line, ${C('LayoutKind.Auto')} lets the runtime reorder. Structs containing references are laid out automatically by the runtime regardless. Use ${C('Unsafe.SizeOf<T>()')} for managed size; ${C('Marshal.SizeOf')} gives the interop size, which can differ (bool → 4 bytes). C# 12's ${C('[InlineArray(N)]')} embeds a fixed-size buffer without unsafe code.</p>`, followUps: ['What is a blittable type?', 'What is false sharing and how does padding help?'] },
    { level: 'A', q: 'What prevents the JIT from inlining a method, and how do you help it?', a: `<p>Inlining is decided by heuristics: IL size and estimated native size, the benefit at the call site (constant args, inside loops, profile weight), and blockers — virtual calls that cannot be devirtualized, recursion, very large structs, some exception-handling constructs, ${C('[NoInlining]')}, cross-version-bubble restrictions for R2R code. Helping: keep hot methods small; move rare paths (throws, logging) into separate ${C('[NoInlining]')} helper methods (the ThrowHelper pattern); seal classes or use generics over structs so calls devirtualize; apply ${C('[AggressiveInlining]')} sparingly to small, hot, measured methods. Verify with ${C('[DisassemblyDiagnoser]')} or ${C('DOTNET_JitDisasm')} rather than guessing.</p>`, followUps: ['What is guarded devirtualization?', 'Why does sealing a class help performance?'] },
    { level: 'I', q: 'When does the JIT remove array bounds checks?', a: `<p>When it can prove the index is in range. Classic cases: ${C('for (int i = 0; i < a.Length; i++) a[i]')} with ${C('a')} a local or parameter; ${C('foreach')} over arrays and spans; accesses dominated by an explicit check such as ${C('if ((uint)i < (uint)a.Length)')}; constant indexes into arrays of known length after a length check (${C('if (a.Length >= 4) { a[0]..a[3] }')}). Checks stay when looping to an unrelated bound, reading the array from a field (it might change), or with complex index arithmetic; loop cloning may then create a check-free fast path guarded by a runtime test. Spans behave like arrays; slicing first (${C('a.AsSpan(0, n)')}) gives one check up front.</p>`, followUps: ['Why does copying a field to a local help?', 'What does loop cloning do?'] },
    { level: 'B', q: 'How do you benchmark C# code correctly?', a: `<p>Use <b>BenchmarkDotNet</b>, in Release, without a debugger. Put inputs in fields initialised in ${C('[GlobalSetup]')}, return results from ${C('[Benchmark]')} methods (to defeat dead-code elimination), use ${C('[Params]')} for realistic sizes and data distributions, add ${C('[MemoryDiagnoser]')} for allocations and mark one method ${C('Baseline = true')} to get ratios. BenchmarkDotNet runs each case in a separate process, does pilot and warm-up iterations so tiering settles, removes upper outliers and reports Mean, Error (99.9% CI half-width), StdDev, Median and Allocated. Interpret honestly: overlapping intervals mean no evidence of a difference. And confirm with a production profile that the code is hot before optimising.</p>`, followUps: ['Why not a Stopwatch loop?', 'What does a large StdDev suggest?'] },
    { level: 'I', q: 'Name common sources of hidden allocations in C#.', a: `<p>Boxing (value types to object/interfaces, non-generic collections, ${C('Enum.HasFlag')} on old runtimes, struct dictionary keys without ${C('IEquatable<T>')}); closures and delegates from capturing lambdas; LINQ iterators; ${C('params')} arrays; string concatenation, ${C('Substring')}, ${C('Split')}, ${C('ToString')}/formatting; ${C('foreach')} over an interface (boxed struct enumerator); async methods that actually suspend (state machine box) and ${C('Task<T>')} results; collections growing without an initial capacity; ${C('yield return')} iterators; logging APIs with ${C('params object[]')}. Tools to find them: ${C('[MemoryDiagnoser]')}, ${C('GC.GetAllocatedBytesForCurrentThread')}, ${C('dotnet-counters')} (allocation rate), ${C('dotnet-trace')} with the gc-verbose profile or a memory profiler for allocation stacks.</p>`, followUps: ['How do static lambdas help?', 'When is ValueTask&lt;T&gt; worth it?'] },
    { level: 'A', q: 'How would you make a hot parsing path allocation-free?', a: `<p>Work on ${C('ReadOnlySpan<char>')} (or ${C('ReadOnlySpan<byte>')} for UTF-8) instead of strings: find separators with vectorized ${C('IndexOf')}/${C('IndexOfAny')}, slice instead of ${C('Substring')}, parse with span overloads (${C('int.Parse(span)')}, ${C('Utf8Parser')}, ${C('IUtf8SpanParsable')} in .NET 8). Use ${C('stackalloc')} for small scratch buffers and ${C('ArrayPool<T>.Shared')} for large ones (return in ${C('finally')}). Avoid LINQ and capturing lambdas in the loop, pass state explicitly, pre-size output collections, and deduplicate repeated strings with a pool if strings must be produced. Lock it in with a test asserting ${C('GC.GetAllocatedBytesForCurrentThread()')} delta is 0 after warm-up, and benchmark before/after.</p>`, followUps: ['What are the risks of ArrayPool?', 'How does System.IO.Pipelines fit in?'] },
    { level: 'B', q: 'What is string interning?', a: `<p>Interning keeps a single shared instance per distinct string value in a process-wide pool. All literals and compile-time constant expressions are interned automatically, so ${C('"ab" == "a" + "b"')} are the same object. Strings created at run time (concatenation with variables, parsing, ${C('new string')}) are separate objects unless you call ${C('string.Intern')}, which returns the pooled instance. ${C('==')} compares values, so interning matters only for memory (many duplicate strings) or identity checks. The pool is never cleaned, so interning unbounded user data leaks memory; prefer a local pool for deduplication.</p>`, followUps: ['How would you deduplicate strings while parsing a large file?', 'What does string.IsInterned return?'] },
    { level: 'E', q: 'A service spends 30% of CPU in GC. How do you investigate and fix it?', a: `<p>Measure first: ${C('dotnet-counters')} for allocation rate, gen0/1/2 counts, % time in GC, heap sizes, LOH size; check whether it is <b>allocation rate</b> (many gen0s), <b>mid-life crisis</b> (objects surviving to gen1/gen2, many gen2s) or a growing heap (leak). Then find allocators with ${C('dotnet-trace')} (gc-verbose / allocation sampling) or a profiler, ranked by bytes and stack. Typical fixes: remove per-request allocations (spans, pooling, avoiding LINQ/closures/boxing, ${C('[LoggerMessage]')}), pre-size collections, pool large buffers to keep them off the LOH, avoid caching data that dies soon after promotion, and fix leaks (static caches without eviction, event handlers). Configuration can help secondarily: Server GC for throughput, ${C('GCConserveMemory')}, DATAS in .NET 8 for container density, ${C('GCHeapAffinitizeMask')} — but code changes usually give the big wins. Verify with the same counters under the same load.</p>`, followUps: ['What is the mid-life crisis?', 'Server GC vs Workstation GC?'] },
    { level: 'E', q: 'Your benchmark shows the new code is 2× faster. What do you check before merging?', a: `<p>Validity: BenchmarkDotNet in Release, warm-up done, results consumed, realistic inputs and sizes (${C('[Params]')}), intervals clearly separated, stable across runs and machines, and a <b>mechanism</b> that explains it (fewer allocations in MemoryDiagnoser, removed bounds checks in the disassembly, better cache behaviour) rather than an artefact (dead-code elimination, constant folding, a best-case input, different data). Relevance: production profiles show how much CPU this code takes — a 2× win on 0.3% of CPU is not worth complexity. Cost: readability, safety (unsafe code, pooling bugs), maintainability, behaviour changes (culture, ordering). Then check end-to-end metrics (throughput, p99 latency) under load after deployment.</p>`, followUps: ['How would you detect dead-code elimination in a benchmark?', 'What is a regression test for performance?'] },
    { level: 'A', q: 'What is false sharing and how do you avoid it in .NET?', a: `<p>CPUs keep caches coherent per <b>cache line</b> (64 bytes on x64). When two threads write different variables that share a line, each write invalidates the other core's copy and the line bounces between cores, slowing both down even though there is no logical sharing. It shows up with per-thread counters in an array, adjacent fields written by different threads (e.g. head and tail of a queue), or small objects allocated together. Avoid it by giving hot per-thread data its own line: padding structs with ${C('[StructLayout(LayoutKind.Sequential, Size = 64)]')} (or 128 bytes to defeat adjacent-line prefetching), accumulating in locals and combining at the end (${C('Parallel.For')} with localInit/localFinally), or using ${C('ThreadLocal<T>')}. The BCL pads internal fields in concurrent collections for this reason.</p>`, followUps: ['Why might 128 bytes be better than 64?', 'How would you detect false sharing?'] },
    { level: 'I', q: 'Why should struct dictionary keys implement IEquatable&lt;T&gt;?', a: `<p>${C('Dictionary<TKey,TValue>')} uses ${C('EqualityComparer<TKey>.Default')}. For a struct implementing ${C('IEquatable<T>')} that is a generic comparer calling ${C('Equals(T)')} directly — no boxing, and inlinable. Without it, the default comparer calls ${C('ValueType.Equals(object)')}, which boxes the argument on every comparison and compares fields via a slower general path; ${C('ValueType.GetHashCode')} may only use the first field or be slow. Result: allocations per lookup and potentially terrible hash distribution. Implement ${C('IEquatable<T>')}, override ${C('Equals(object)')} and ${C('GetHashCode')} (${C('HashCode.Combine')}), or simply use a ${C('readonly record struct')}, which generates all of it.</p>`, followUps: ['What does HashCode.Combine do?', 'Why must equal keys have equal hash codes?'] }
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
    id: 'csharp12',
    title: 'CLR Internals & Performance',
    lang: 'csharp',
    intro: `<p>You can write correct C# for years without knowing what happens below the language. Then one day a service burns 40% CPU in the garbage collector, a "tiny" change makes a hot loop three times slower, or a benchmark claims a miracle that disappears in production. This module goes <b>below the language</b>: the <b>IL</b> the compiler emits and how it is lowered, the <b>JIT</b> with tiered compilation, dynamic PGO, ReadyToRun and Native AOT, how objects are laid out in memory (<b>object header</b>, <b>method table</b> pointer, field layout and padding), what the JIT does with <b>inlining</b>, devirtualization and bounds-check elimination, how to <b>measure</b> correctly with BenchmarkDotNet, how to find and remove <b>allocations</b>, how <b>string interning</b> works, and the most common <b>performance traps</b> in real code bases.</p>
<p>Each topic has a visualizer and a guided problem; the practice set mixes predict-the-output puzzles with allocation-free implementations whose tests actually <b>measure allocated bytes</b> on .NET 8.</p>`,
    goals: [
      'Read simple IL, explain the evaluation stack and recognise how foreach, using, lambdas and async are lowered',
      'Explain tiered compilation (Tier0, OSR, Tier1, dynamic PGO), ReadyToRun and Native AOT and choose between them',
      'Compute the size of objects, arrays, strings and structs from the object header, method table pointer and field layout rules',
      'Predict what the JIT inlines, devirtualizes and which bounds checks it removes, and write code that helps it',
      'Design trustworthy benchmarks with BenchmarkDotNet and read Mean/Error/StdDev/Allocated correctly',
      'Find allocations (boxing, closures, LINQ, params, string building) and remove them with spans, static lambdas and IEquatable',
      'Explain string interning and avoid the classic performance traps of .NET code'
    ],
    prereqs: `C# 8 (Memory, GC, Boxing &amp; Span&lt;T&gt;) and C# 11 (Reflection, Attributes &amp; Advanced Generics). Comfort with value vs reference types is essential. A .NET 8 SDK; optionally BenchmarkDotNet and the dotnet-counters / dotnet-trace tools.`,
    hours: 18,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
