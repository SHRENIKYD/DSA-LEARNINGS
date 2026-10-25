(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------- shared visualizer helpers (csharp02) ---------- */
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function cp(code, line, cls, label) { var hl = {}; if (line) hl[line] = cls || 'cur'; return { type: 'code', label: label || 'C# (current line highlighted)', lang: 'csharp', code: code, hl: hl }; }
  function vp(obj, hl, label) { var vals = {}; Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); }); return { type: 'vars', label: label || 'Variables', vals: vals, hl: hl || {} }; }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function stepViz(code, steps) {
    return steps.map(function (s) {
      var parts = [cp(code, s.l, s.c)];
      if (s.v) parts.push(vp(s.v, s.h));
      if (s.st) parts.push({ type: 'stack', label: 'Call stack (top = running)', items: s.st, hl: (function () { var h = {}; h[s.st.length - 1] = 'cur'; return h; })() });
      if (s.out !== undefined) parts.push(tx('<pre>' + esc(s.out || ' ') + '</pre>', 'Console output'));
      return fr(s.n, parts);
    });
  }
  function parseInts(input, max, msg) {
    var t = String(input).trim();
    if (!t) return [];
    var a = t.split(/[\s,]+/).map(Number);
    if (a.some(function (x) { return !Number.isInteger(x) || Math.abs(x) > 1e6; })) throw new Error(msg);
    if (a.length > max) throw new Error('Use at most ' + max + ' numbers');
    return a;
  }

  /* ======================================================================
     TOPIC 1 — Control flow
     ====================================================================== */
  topics.push({
    title: 'Control Flow: if, switch Statements & Expressions, and Loops',
    analogy: R`<p>A <b>railway yard</b>. An <code>if</code> is a single point switch: left track or right track. A <code>switch</code> is a <b>turntable</b> with many exits, one per destination — and in C# every exit has a buffer stop (<code>break</code>), so a train never rolls by accident into the next track as it can in C or Java. Loops are the <b>circle line</b>: <code>for</code> runs a known number of laps, <code>while</code> keeps going until a signal turns red, <code>do-while</code> always does at least one lap, and <code>foreach</code> visits every station once.</p>`,
    explain: R`<h4>🟢 Decisions</h4>
<ul>
<li><code>if (cond) { … } else if (…) { … } else { … }</code> — the condition must be a <code>bool</code>. <code>if (x)</code> with an <code>int x</code> does not compile, which kills a whole class of C bugs (<code>if (x = 5)</code>).</li>
<li>Conditional operator: <code>var sign = x &lt; 0 ? "neg" : "non-neg";</code></li>
<li>Logical operators <code>&amp;&amp;</code> and <code>||</code> <b>short-circuit</b>: in <code>s != null &amp;&amp; s.Length &gt; 0</code> the second part never runs on null.</li>
</ul>
<h4>switch statement vs switch expression</h4>
${H.table(['', 'switch statement', 'switch expression (C# 8+)'], [
  ['Shape', '<code>switch (x) { case 1: …; break; }</code>', '<code>var r = x switch { 1 =&gt; "one", _ =&gt; "other" };</code>'],
  ['Produces a value?', 'no (runs statements)', 'yes'],
  ['Fall-through', 'never implicit: every non-empty section must end with <code>break</code>, <code>return</code>, <code>throw</code> or <code>goto case</code>', 'not applicable'],
  ['Default', '<code>default:</code>', '<code>_ =&gt;</code> (discard)'],
  ['Missing cases', 'allowed', 'compiler warning; <code>SwitchExpressionException</code> at run time if nothing matches']
])}
<p>Both support <b>patterns</b>: constants, relational (<code>&lt; 0</code>), logical (<code>&gt;= 90 and &lt;= 100</code>, <code>'a' or 'e'</code>), type patterns (<code>string s</code>) and guards (<code>case int n when n % 2 == 0:</code>). Empty cases stack: <code>case 'a': case 'e': … break;</code></p>
<h4>Loops</h4>
${H.table(['Loop', 'Use when', 'Example'], [
  ['<code>for</code>', 'you need an index or a fixed count', '<code>for (int i = 0; i &lt; n; i++)</code>'],
  ['<code>foreach</code>', 'you visit every element and do not change the collection', '<code>foreach (var x in list)</code>'],
  ['<code>while</code>', 'the stop condition is checked before each round', '<code>while (lo &lt;= hi)</code>'],
  ['<code>do … while</code>', 'the body must run at least once', 'menu loops, retry loops']
])}
<p><code>break</code> leaves the innermost loop, <code>continue</code> jumps to the next round. To exit nested loops, put them in a method and <code>return</code>, or use a flag (a <code>goto</code> label also works but is rarely welcome). Modifying a <code>List</code> inside <code>foreach</code> over it throws <code>InvalidOperationException</code>.</p>`,
    clues: [
      '"map many values to categories" → switch expression with relational patterns',
      '"C# switch fall-through" → not allowed; CS0163 "control cannot fall through"',
      '"loop at least once" (menus, retry) → <code>do … while</code>',
      '"remove items while iterating" → iterate backwards with <code>for</code>, or <code>RemoveAll</code>',
      '"exit two loops at once" → extract a method and <code>return</code>'
    ],
    code: [R`static string Classify(int temperature) => temperature switch
{
    < 0 => "freezing",
    >= 0 and < 15 => "cold",
    >= 15 and < 25 => "mild",
    >= 25 => "hot"
};

static string DayKind(DayOfWeek d)
{
    switch (d)
    {
        case DayOfWeek.Saturday:
        case DayOfWeek.Sunday:          // stacked empty case: allowed
            return "weekend";
        default:
            return "weekday";
    }
}`, { lang: 'csharp', run: true, title: 'Loops and switch together (runnable)', code: R`using System;

class Program
{
    static void Main()
    {
        int[] scores = [72, 95, 40, 88];
        int sum = 0;
        foreach (int s in scores) sum += s;

        for (int i = 0; i < scores.Length; i++)
        {
            if (scores[i] < 50) continue;               // skip failing scores
            string band = scores[i] switch { >= 90 => "A", >= 80 => "B", _ => "C" };
            Console.WriteLine($"#{i}: {scores[i]} -> {band}");
        }

        int tries = 0;
        do { tries++; } while (tries < 3);              // body runs at least once
        Console.WriteLine($"sum={sum} tries={tries}");
    }
}` }],
    codeTitle: ['switch expression and switch statement', 'Loops (runnable)'],
    viz: {
      title: 'Which switch arm matches?',
      input: '87',
      inputLabel: 'A score (−20 .. 120)',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,3}$/.test(t)) throw new Error('Enter a whole number such as 87');
        var x = Number(t);
        if (x < -20 || x > 120) throw new Error('Use a number between -20 and 120');
        var code = 'string g = score switch\n{\n    < 0 or > 100 => "Invalid",\n    >= 90 => "A",\n    >= 80 => "B",\n    >= 70 => "C",\n    >= 60 => "D",\n    _ => "F"\n};';
        var arms = [[3, '< 0 or > 100', x < 0 || x > 100, 'Invalid'], [4, '>= 90', x >= 90, 'A'], [5, '>= 80', x >= 80, 'B'], [6, '>= 70', x >= 70, 'C'], [7, '>= 60', x >= 60, 'D'], [8, '_', true, 'F']];
        var frames = [fr('The switch expression tests its arms <b>top to bottom</b> and stops at the first pattern that matches. score = <b>' + x + '</b>.', [cp(code, 1), vp({ score: x })])];
        for (var i = 0; i < arms.length; i++) {
          var a = arms[i];
          frames.push(fr('Arm <code>' + esc(a[1]) + '</code>: ' + (a[2] ? '<span class="c-g">matches</span> → result <b>"' + a[3] + '"</b>.' : '<span class="c-r">no match</span>, try the next arm.') + (i === 0 && !a[2] ? ' Checking invalid values first means the later arms can assume 0..100.' : ''), [cp(code, a[0], a[2] ? 'ok' : 'bad'), vp({ score: x, g: a[2] ? '"' + a[3] + '"' : '(not yet)' }, a[2] ? { g: 'ok' } : {})]));
          if (a[2]) break;
        }
        frames.push(fr('Order matters: if <code>&gt;= 60</code> came before <code>&gt;= 90</code>, a 95 would wrongly get "D". The compiler reports an arm that can never match (CS8510) when an earlier arm already covers it completely.', [cp(code, 0), tx('Tip: <code>_</code> is the discard pattern — it matches anything, so it must be last.')]));
        return frames;
      }
    },
    examples: [
      { title: 'No fall-through: goto case for deliberate sharing', html: R`<p>In C# a non-empty case section must end explicitly. When you really want to continue into another case, say so with <code>goto case</code>:</p>`, code: R`static int Cost(string size)
{
    int extra = 0;
    switch (size)
    {
        case "large":
            extra += 2;
            goto case "medium";      // explicit, readable
        case "medium":
            extra += 1;
            break;
        default:
            break;
    }
    return 3 + extra;
}` },
      { title: 'Removing while iterating', html: R`<p><code>foreach</code> over a list and calling <code>Remove</code> throws "Collection was modified". Iterate backwards by index, or let the list do it.</p>`, code: R`var xs = new List<int> { 1, 2, 3, 4, 5, 6 };
for (int i = xs.Count - 1; i >= 0; i--)
    if (xs[i] % 2 == 0) xs.RemoveAt(i);          // backwards: indexes stay valid
Console.WriteLine(string.Join(",", xs));         // 1,3,5
var ys = new List<int> { 1, 2, 3, 4 };
ys.RemoveAll(x => x % 2 == 0);                   // the idiomatic one-liner` },
      { title: 'Tuple patterns: FizzBuzz in one expression', html: R`<p>Switch on a tuple to test two conditions at once — a favourite interview opener.</p>`, code: R`static string FizzBuzz(int i) => (i % 3, i % 5) switch
{
    (0, 0) => "FizzBuzz",
    (0, _) => "Fizz",
    (_, 0) => "Buzz",
    _ => i.ToString()
};` }
    ],
    deepDive: R`<h4>🟣 How switches compile, and loop details</h4>
<ul>
<li><b>Jump tables.</b> A switch over dense integer constants compiles to the IL <code>switch</code> instruction (a jump table, O(1)); sparse values become a binary search of comparisons. Switching on strings compiles to length/character checks or a computed hash followed by equality checks — not a linear chain of <code>string.Equals</code>.</li>
<li><b>Exhaustiveness.</b> A switch expression over an enum without a discard gets warning CS8524 (unnamed enum values like <code>(Color)42</code> are legal), and throws <code>SwitchExpressionException</code> at run time if nothing matches.</li>
<li><b>foreach is pattern based</b>: it works on anything with a <code>GetEnumerator()</code> method, not only <code>IEnumerable</code>. Over arrays and <code>Span&lt;T&gt;</code> the compiler emits a plain index loop with no enumerator object; over <code>List&lt;T&gt;</code> it uses a struct enumerator (no allocation).</li>
<li><b>Loop variable capture.</b> Since C# 5 each <code>foreach</code> iteration has a fresh variable, so lambdas capture the value of that round. A <code>for</code> loop variable is still one shared variable — closures created in a <code>for</code> loop all see the final value.</li>
<li><b>Bounds-check elimination.</b> In <code>for (int i = 0; i &lt; a.Length; i++) a[i]…</code> the JIT proves <code>i</code> is in range and removes the per-access bounds check; caching <code>a.Length</code> in a local can actually prevent this optimisation in older runtimes.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI happily converts long <code>if/else</code> chains into switch expressions and back. <b>Use AI as a partner:</b> "rewrite this if-chain as a switch expression and list any inputs that change behaviour". <b>Where AI goes wrong:</b> it orders relational arms incorrectly (a broad arm first swallows the others), forgets the discard, writes Java-style fall-through that does not compile, or modifies a collection inside <code>foreach</code>. <b>What you must still own:</b> reading the arm order like a decision table and testing the boundaries (59/60, 89/90, negative input).</p>`
  });

  /* ======================================================================
     TOPIC 2 — Methods
     ====================================================================== */
  topics.push({
    title: 'Methods: Parameters, Return Values, Tuples, Local Functions & Recursion',
    analogy: R`<p>A method is a <b>vending machine</b>: you put things in the slot (arguments), press the button (call), and something drops out (the return value). You do not need to know the gears inside. A machine can even contain a <b>smaller machine</b> only it uses (a local function), and some machines call a copy of themselves on a smaller order — like Russian dolls — which is <b>recursion</b>. Each pending call waits on a <b>stack of trays</b>; stack too many and the tower falls over (<code>StackOverflowException</code>).</p>`,
    explain: R`<h4>🟢 Anatomy</h4>
<pre>public static int Add(int a, int b)   // access, static?, return type, name, parameters
{
    return a + b;
}
static int Square(int x) =&gt; x * x;     // expression-bodied member</pre>
<ul>
<li><b>Parameters are passed by value</b> by default: the method gets a copy of the variable. For a reference type, the copy is a copy of the <i>reference</i>, so the method can change the object but not make the caller's variable point elsewhere (that needs <code>ref</code>, next topic).</li>
<li><code>void</code> means "returns nothing". Every code path of a non-void method must <code>return</code> or <code>throw</code> (error CS0161).</li>
<li><b>Multiple results</b>: return a tuple — <code>static (int Min, int Max) Range(int[] a)</code> — and deconstruct: <code>var (lo, hi) = Range(a);</code>.</li>
<li><b>Static vs instance</b>: static methods belong to the type (<code>Math.Max</code>); instance methods need an object (<code>s.ToUpper()</code>). Classes are covered in module 3.</li>
</ul>
<h4>Local functions</h4>
<p>A method declared inside another method. It can use the outer method's locals (capturing them) unless marked <code>static</code>. Perfect for recursive helpers and for keeping a helper next to its only caller.</p>
<h4>Recursion</h4>
<p>A method that calls itself needs a <b>base case</b> and progress toward it. Each call pushes a frame (parameters, locals, return address) onto the thread's stack — 1 MB on the main thread by default, so depth around 10<sup>4</sup>–10<sup>5</sup> is the practical limit. A <code>StackOverflowException</code> <b>cannot be caught</b>: the process dies. The C# compiler does not guarantee tail-call elimination, so convert deep recursion to a loop or an explicit <code>Stack&lt;T&gt;</code>.</p>`,
    clues: [
      '"return two values" → tuple return type <code>(int Min, int Max)</code> or <code>out</code> parameters',
      '"helper used only by this method" → local function, often <code>static</code>',
      '"recursion depth up to 10<sup>5</sup>/10<sup>6</sup>" → iterative version; the 1 MB stack overflows',
      '"not all code paths return a value" → CS0161',
      '"does the method change my variable?" → pass-by-value of value vs reference'
    ],
    code: [R`static (int Min, int Max) Range(int[] a)
{
    if (a.Length == 0) throw new ArgumentException("empty array", nameof(a));
    int lo = a[0], hi = a[0];
    foreach (int x in a) { if (x < lo) lo = x; if (x > hi) hi = x; }
    return (lo, hi);                       // tuple literal
}

static long Factorial(int n)
{
    return Go(n);

    static long Go(int k) => k <= 1 ? 1 : k * Go(k - 1);   // static local function, recursive
}

static int SumDigits(int n)
{
    int total = 0;
    Add(n);
    return total;

    void Add(int k)                        // non-static: captures 'total'
    {
        if (k == 0) return;
        total += k % 10;
        Add(k / 10);
    }
}`],
    codeTitle: ['Tuples, static and capturing local functions, recursion'],
    viz: {
      title: 'The call stack during recursion',
      input: '4',
      inputLabel: 'n for Factorial(n) (1..7)',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^\d$/.test(t) || Number(t) < 1 || Number(t) > 7) throw new Error('Enter n between 1 and 7');
        var n = Number(t);
        var code = 'static long Fact(int k)\n{\n    if (k <= 1) return 1;          // base case\n    return k * Fact(k - 1);        // recursive case\n}';
        var steps = [], st = [];
        for (var k = n; k >= 1; k--) {
          st.push('Fact(' + k + ')');
          if (k > 1) steps.push({ l: 4, st: st.slice(), v: { k: k }, n: 'Fact(' + k + ') is not the base case, so it must wait for <b>Fact(' + (k - 1) + ')</b>. A new frame is pushed on the stack.' });
          else steps.push({ l: 3, c: 'ok', st: st.slice(), v: { k: 1, returns: 1 }, h: { returns: 'ok' }, n: 'Base case: <code>k &lt;= 1</code> returns 1 without another call. Now the stack <b>unwinds</b>.' });
        }
        var acc = 1;
        for (var j = 2; j <= n; j++) {
          st.pop(); acc *= j;
          steps.push({ l: 4, c: 'ok', st: st.slice(), v: { k: j, 'Fact(k-1)': acc / j, returns: acc }, h: { returns: 'ok' }, n: 'Back in Fact(' + j + '): ' + j + ' × ' + (acc / j) + ' = <b>' + acc + '</b>. Its frame is popped when it returns.' });
        }
        steps.push({ l: 0, st: ['Main'], v: { result: acc }, h: { result: 'sel' }, n: 'Done: Fact(' + n + ') = ' + acc + '. Depth was ' + n + ' frames. With n = 100,000 the 1 MB stack would overflow — and StackOverflowException cannot be caught.' });
        return stepViz(code, steps);
      }
    },
    examples: [
      { title: 'Returning several values with a tuple', html: R`<p>Tuples with named elements read well at the call site and need no extra class.</p>`, code: R`static (int Quotient, int Remainder) DivMod(int a, int b) => (a / b, a % b);

var (q, r) = DivMod(17, 5);
Console.WriteLine($"{q} {r}");          // 3 2
var both = DivMod(-17, 5);
Console.WriteLine(both.Remainder);      // -2` },
      { title: 'Pass-by-value with a reference type', html: R`<p>The method gets a copy of the reference: it can change the array's contents, but assigning a new array only changes its own copy.</p>`, code: R`static void Touch(int[] a)
{
    a[0] = 99;          // visible to the caller: same array object
    a = new int[] { 7 };// invisible to the caller: only the local copy changes
}

int[] data = { 1, 2, 3 };
Touch(data);
Console.WriteLine(data[0]);   // 99` },
      { title: 'Turning recursion into a loop', html: R`<p>Sum of 1..n recursively needs n stack frames; a loop needs none. For n = 10<sup>6</sup> only the loop survives.</p>`, code: R`static long SumRec(int n) => n == 0 ? 0 : n + SumRec(n - 1);   // ~1e6 frames: stack overflow

static long SumLoop(int n)
{
    long s = 0;
    for (int i = 1; i <= n; i++) s += i;
    return s;
}` }
    ],
    deepDive: R`<h4>🟣 Under the hood</h4>
<ul>
<li><b>Calling conventions.</b> On x64 the first arguments travel in registers (RCX, RDX, R8, R9 on Windows; six registers on Linux/macOS). The JIT <b>inlines</b> small, non-virtual methods (roughly under 16 bytes of IL by default, more with <code>[MethodImpl(MethodImplOptions.AggressiveInlining)]</code>), removing the call entirely.</li>
<li><b>Tuples</b> are <code>System.ValueTuple&lt;…&gt;</code> structs: no heap allocation. Element names exist only at compile time (metadata attributes), at run time they are <code>Item1</code>, <code>Item2</code>.</li>
<li><b>Capturing local functions</b> store captured locals in a compiler-generated struct passed by reference (no allocation), unless the local function is converted to a delegate — then a heap-allocated closure class is used. <code>static</code> local functions guarantee no capture.</li>
<li><b>Tail calls.</b> The IL has a <code>tail.</code> prefix and the x64 JIT sometimes performs tail calls opportunistically, but C# never emits the prefix, so you cannot rely on it.</li>
<li><b>Bigger stacks.</b> <code>new Thread(Work, maxStackSize: 256 * 1024 * 1024)</code> runs deep recursion on a thread with a larger stack — a contest trick, not a design.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI writes recursive solutions readily because they are short. <b>Use AI as a partner:</b> ask "what is the maximum recursion depth of this method for the given constraints?" and "rewrite it iteratively". <b>Where AI goes wrong:</b> deep recursion on 10<sup>5</sup>-node inputs, missing base cases for empty input, methods that return a mutable internal array the caller can corrupt, and <code>out</code> parameters where a tuple would be clearer. <b>What you must still own:</b> method contracts (what goes in, what comes out, what is mutated) and stack-depth reasoning.</p>`
  });

  /* ======================================================================
     TOPIC 3 — ref, out, in
     ====================================================================== */
  topics.push({
    title: 'ref, out & in Parameters: Passing Variables, Not Values',
    analogy: R`<p>Normally you give a method a <b>photocopy</b> of your note: it can scribble on the copy, your original stays clean. <code>ref</code> hands over <b>the original note itself</b>: any change is your change. <code>out</code> hands over an <b>empty envelope</b> the method promises to fill before it returns. <code>in</code> lets the method <b>read the original through glass</b>: no copy is made (handy for a big poster), and it cannot write on it.</p>`,
    explain: R`<h4>🟢 Three modifiers</h4>
${H.table(['Modifier', 'Caller must initialise?', 'Method must assign?', 'Method may change it?', 'Call syntax', 'Typical use'], [
  ['(none)', 'yes', 'no', 'only its own copy', '<code>F(x)</code>', 'almost everything'],
  ['<code>ref</code>', 'yes', 'no', 'yes, the caller sees it', '<code>F(ref x)</code>', 'swap, in-place update of a value type'],
  ['<code>out</code>', 'no', '<b>yes</b>, before returning', 'yes', '<code>F(out var x)</code>', 'Try-pattern: <code>int.TryParse(s, out int v)</code>'],
  ['<code>in</code>', 'yes', 'no', '<b>no</b> (read-only)', '<code>F(in x)</code> or <code>F(x)</code>', 'large structs, avoid copying'],
  ['<code>ref readonly</code> (C# 12)', 'yes', 'no', 'no', '<code>F(in x)</code> / <code>F(ref x)</code>', 'like in, but the caller must pass a variable']
])}
<h4>The Try pattern</h4>
<p>The BCL's standard way to report "it may fail" without exceptions: return <code>bool</code>, deliver the result through <code>out</code>.</p>
<pre>if (int.TryParse(text, out int value)) Use(value);
if (dict.TryGetValue(key, out var list)) list.Add(item);</pre>
<p><code>out var</code> declares the variable right in the call; <code>out _</code> discards a result you do not need.</p>
<h4>ref with reference types</h4>
<p>Passing a <code>List&lt;int&gt;</code> without <code>ref</code> already lets the method change the list's contents. <code>ref</code> additionally lets the method <b>replace</b> the caller's reference (<code>list = new List&lt;int&gt;()</code>). That is rarely needed and usually a design smell.</p>
<h4>Restrictions</h4>
<p><code>ref</code>/<code>out</code>/<code>in</code> parameters cannot be used in <code>async</code> methods, iterators (<code>yield</code>), or captured by lambdas. Properties and indexer results cannot be passed by <code>ref</code> (they are method calls, not variables) — except array elements, which are real variables: <code>Swap(ref a[i], ref a[j])</code> works.</p>`,
    clues: [
      '"return a success flag and a value" → Try pattern with <code>out</code>',
      '"swap two variables in a method" → <code>ref</code> (or tuple swap <code>(a, b) = (b, a)</code>)',
      '"large struct passed in a hot loop" → <code>in</code> / <code>ref readonly</code> to avoid copies',
      '"CS0177: the out parameter must be assigned" → every path must assign it',
      '"can I pass a property by ref?" → no (CS0206); array elements yes'
    ],
    code: [R`static void Swap<T>(ref T a, ref T b) { T tmp = a; a = b; b = tmp; }

static bool TryParsePoint(string s, out int x, out int y)
{
    x = 0; y = 0;                                   // out params must be assigned on every path
    var parts = s.Split(',');
    return parts.Length == 2 && int.TryParse(parts[0], out x) && int.TryParse(parts[1], out y);
}

readonly struct Matrix4 { public readonly double M11, M12, M13, M14, M21, M22, M23, M24; }

static double Trace2(in Matrix4 m) => m.M11 + m.M22;   // no 64-byte copy, cannot modify m

static void Demo()
{
    int[] a = { 5, 9 };
    Swap(ref a[0], ref a[1]);                       // array elements are variables
    if (TryParsePoint("3,4", out int px, out _))     // discard y
        Console.WriteLine($"{a[0]} {a[1]} {px}");    // 9 5 3
}`],
    codeTitle: ['Swap with ref, Try pattern with out, in for big structs'],
    viz: {
      title: 'By value vs ref: what the caller sees',
      input: '5',
      inputLabel: 'Starting value of x',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^-?\d{1,6}$/.test(t)) throw new Error('Enter an integer up to 6 digits');
        var x = Number(t);
        var code = 'static void ByVal(int v) { v = v * 2; }\nstatic void ByRef(ref int v) { v = v * 2; }\n\nint x = ' + x + ';\nByVal(x);\nByRef(ref x);\nConsole.WriteLine(x);';
        function frames2(narr, line, main, method, mhl, mainHl) {
          var parts = [cp(code, line), vp(main, mainHl, 'Main\'s frame')];
          if (method) parts.push(vp(method, mhl, 'Callee\'s frame'));
          return fr(narr, parts);
        }
        return [
          frames2('Main has a local <code>x = ' + x + '</code> in its stack frame.', 4, { x: x }),
          frames2('<code>ByVal(x)</code>: the <b>value</b> ' + x + ' is copied into the new frame\'s parameter <code>v</code>. Two separate boxes.', 5, { x: x }, { v: x }, { v: 'cur' }),
          frames2('Inside ByVal, <code>v = v * 2</code> changes only the copy: v = ' + (2 * x) + '. Main\'s x is untouched.', 1, { x: x }, { v: 2 * x }, { v: 'ok' }, { x: 'done' }),
          frames2('ByVal returns; its frame (and v) disappear. x is still ' + x + '.', 5, { x: x }, null, null, { x: 'cur' }),
          frames2('<code>ByRef(ref x)</code>: no copy. <code>v</code> is an <b>alias</b> — a managed pointer to Main\'s x.', 6, { x: x }, { v: '→ Main.x' }, { v: 'sel' }),
          frames2('<code>v = v * 2</code> writes through the alias straight into Main\'s x: now ' + (2 * x) + '.', 2, { x: 2 * x }, { v: '→ Main.x' }, { v: 'sel' }, { x: 'ok' }),
          frames2('Back in Main the change is visible: prints <b>' + (2 * x) + '</b>. With <code>out</code> the same aliasing happens, but the callee must assign first; with <code>in</code> writing is a compile error.', 7, { x: 2 * x }, null, null, { x: 'ok' })
        ];
      }
    },
    examples: [
      { title: 'TryGetValue avoids a double lookup', html: R`<p><code>if (d.ContainsKey(k)) v = d[k];</code> hashes the key twice. <code>TryGetValue</code> does one lookup and hands the value out through <code>out</code>.</p>`, code: R`var stock = new Dictionary<string, int> { ["apple"] = 3 };
if (stock.TryGetValue("apple", out int n)) Console.WriteLine(n);     // 3
Console.WriteLine(stock.TryGetValue("pear", out _));                 // False` },
      { title: 'Tuple swap vs ref swap', html: R`<p>For locals, the tuple swap needs no helper method. The <code>ref</code> version is needed when a method must swap the caller's variables, e.g. elements inside an array during a sort.</p>`, code: R`int a = 1, b = 2;
(a, b) = (b, a);                         // tuple swap
Console.WriteLine($"{a} {b}");           // 2 1

static void Swap(ref int x, ref int y) => (x, y) = (y, x);
int[] arr = { 3, 4 };
Swap(ref arr[0], ref arr[1]);            // 4 3` },
      { title: 'ref returns and ref locals', html: R`<p>A method can return a reference to a variable, letting the caller update it in place — useful for big arrays of structs.</p>`, code: R`static ref int FindMax(int[] a)
{
    int best = 0;
    for (int i = 1; i < a.Length; i++) if (a[i] > a[best]) best = i;
    return ref a[best];                  // reference to the element, not a copy
}

int[] data = { 4, 10, 7 };
ref int m = ref FindMax(data);
m = 0;                                   // writes into the array
Console.WriteLine(string.Join(",", data)); // 4,0,7` }
    ],
    deepDive: R`<h4>🟣 Managed pointers</h4>
<ul>
<li>In IL, <code>ref</code>, <code>out</code> and <code>in</code> parameters are all the same thing: a <b>managed pointer</b> (<code>int&amp;</code>). <code>out</code> is <code>ref</code> plus an <code>[Out]</code> attribute and a definite-assignment rule enforced only by the C# compiler; <code>in</code> adds <code>[IsReadOnly]</code>.</li>
<li>The GC tracks managed pointers, even ones pointing into the middle of an array or object, and updates them when it compacts the heap. That is why they may live only on the stack (parameters, locals, <code>ref struct</code> fields) — never in heap objects.</li>
<li><b>Defensive copies.</b> Calling a method on an <code>in</code> parameter of a non-readonly struct makes the compiler copy the struct first (the method might mutate it). Mark structs <code>readonly</code> to avoid hidden copies, which can make <code>in</code> slower than by-value for small structs.</li>
<li><b>When in helps.</b> Rule of thumb: structs larger than about 16 bytes passed in hot paths. For <code>int</code> or <code>double</code>, <code>in</code> only adds an indirection.</li>
<li><b>Overloading</b> cannot differ only by <code>ref</code> vs <code>out</code> (CS0663), but <code>F(int)</code> and <code>F(ref int)</code> can coexist.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI sometimes generates C-style APIs with several <code>out</code> parameters. <b>Use AI as a partner:</b> "refactor these out parameters into a tuple or record and update the callers". <b>Where AI goes wrong:</b> it uses <code>ref</code> for reference types "to make changes visible" (they already are), adds <code>in</code> to tiny parameters, or tries to use <code>ref</code> in async methods. <b>What you must still own:</b> choosing between Try-pattern, tuples, exceptions and result types for a given API, and knowing what each modifier costs.</p>`
  });

  /* ======================================================================
     TOPIC 4 — Optional & named arguments, params, overloading
     ====================================================================== */
  topics.push({
    title: 'Optional & Named Arguments, params Arrays and Overload Resolution',
    analogy: R`<p>Ordering coffee. The barista has <b>defaults</b>: medium size, regular milk, no sugar (optional parameters). You can just say "a latte", or name only what you change: "a latte, <b>milk: oat</b>" (named argument) without listing size first. A <b>tip jar</b> takes any number of coins (<code>params</code>). And if the café has two machines — one for espresso, one for tea — the barista picks the machine that fits your order <b>best</b> (overload resolution).</p>`,
    explain: R`<h4>🟢 Optional parameters</h4>
<pre>static string Greet(string name, string greeting = "Hello", bool shout = false)
    =&gt; shout ? $"{greeting.ToUpper()}, {name.ToUpper()}!" : $"{greeting}, {name}!";

Greet("Ada");                       // Hello, Ada!
Greet("Ada", "Hi");                 // Hi, Ada!
Greet("Ada", shout: true);          // HELLO, ADA!   (named: skip greeting)</pre>
<ul>
<li>Optional parameters come <b>after</b> required ones, and defaults must be compile-time constants (<code>null</code>, numbers, strings, <code>default</code>, enum values).</li>
<li><b>Named arguments</b> make calls self-documenting (<code>Resize(width: 800, height: 600)</code>) and let you skip optional parameters. Positional arguments may follow named ones only when the names are in the right position.</li>
</ul>
<h4>params: any number of arguments</h4>
<pre>static int Sum(params int[] xs) { int s = 0; foreach (var x in xs) s += x; return s; }
Sum();            // 0  (empty array)
Sum(1, 2, 3);     // 6  (compiler builds new[] {1, 2, 3})
Sum(arr);         // passes the existing array</pre>
<p>Only one <code>params</code> parameter, and it must be last. (C# 13 extends <code>params</code> to spans and collections; in C# 12 it is arrays only.)</p>
<h4>Overloading</h4>
<p>Several methods may share a name if their parameter lists differ (number, types, or <code>ref</code>/<code>out</code>). The return type alone does not count. The compiler picks the <b>better</b> match:</p>
${H.table(['Call', 'Candidates', 'Chosen', 'Why'], [
  ['<code>Print(5)</code>', '<code>Print(int)</code>, <code>Print(long)</code>, <code>Print(object)</code>', '<code>int</code>', 'identity conversion beats widening'],
  ['<code>Print(5L)</code>', 'same', '<code>long</code>', 'exact match'],
  ['<code>Print((short)5)</code>', 'same', '<code>int</code>', 'short→int is a better conversion than short→long'],
  ['<code>Print("x")</code>', 'same', '<code>object</code>', 'the only applicable one'],
  ['<code>Print(null)</code>', '<code>Print(string)</code>, <code>Print(object)</code>', '<code>string</code>', 'more specific type wins'],
  ['<code>F(1)</code>', '<code>F(int a, int b = 0)</code>, <code>F(int a)</code>', '<code>F(int a)</code>', 'a candidate that needs no default values wins']
])}`,
    clues: [
      '"too many overloads that differ by one flag" → optional parameters / named arguments',
      '"boolean parameters make calls unreadable" → named arguments (<code>Save(path, overwrite: true)</code>)',
      '"variable number of arguments" → <code>params T[]</code>',
      '"ambiguous call" (CS0121) → two overloads equally good; add a cast or remove one',
      '"changed a default value in a library, callers did not change" → defaults are baked into the call site'
    ],
    code: [R`static class Log
{
    public static void Write(string message) => Write(message, level: "INFO");
    public static void Write(string message, string level = "INFO", int indent = 0)
        => Console.WriteLine($"{new string(' ', indent)}[{level}] {message}");
    public static void Write(string format, params object[] args)
        => Console.WriteLine(string.Format(format, args));
}

static class Demo
{
    public static void Run()
    {
        Log.Write("started");                         // exact one-parameter overload
        Log.Write("disk low", level: "WARN");         // named argument
        Log.Write("child", indent: 2);                // skips 'level'
        Log.Write("{0} + {1} = {2}", 1, 2, 3);        // params object[]
    }
}`],
    codeTitle: ['Overloads, optional parameters, named arguments and params together'],
    viz: {
      title: 'Overload resolution step by step',
      input: 'short',
      inputLabel: 'Argument type: int, long, short, double, string or null',
      gen: function (input) {
        var t = String(input).trim();
        var conv = {
          int: { int: 'identity', long: 'implicit widening', double: 'implicit widening', object: 'boxing' },
          long: { long: 'identity', double: 'implicit widening', object: 'boxing' },
          short: { int: 'implicit widening', long: 'implicit widening', double: 'implicit widening', object: 'boxing' },
          double: { double: 'identity', object: 'boxing' },
          string: { object: 'reference conversion' },
          null: { object: 'null literal', 'string?': 'null literal' }
        };
        if (!conv[t]) throw new Error('Type one of: int, long, short, double, string, null');
        var cands = t === 'null' ? ['string?', 'object'] : ['int', 'long', 'double', 'object'];
        var code = cands.map(function (c) { return 'static void P(' + c + ' v) { }'; }).join('\n') + '\n\nP(' + ({ int: '5', long: '5L', short: '(short)5', double: '5.0', string: '"x"', null: 'null' })[t] + ');';
        var rows = cands.map(function (c) { return [c, conv[t][c] ? 'yes: ' + conv[t][c] : 'no conversion']; });
        var frames = [fr('Step 1: find every method named <code>P</code>. The argument has type <b>' + t + '</b>.', [cp(code, cands.length + 2), { type: 'table', label: 'Candidates', columns: ['parameter', 'applicable?'], rows: cands.map(function (c) { return [c, '?']; }) }])];
        var hl1 = {}; cands.forEach(function (c, i) { hl1[i] = conv[t][c] ? 'ok' : 'bad'; });
        frames.push(fr('Step 2: keep the <b>applicable</b> ones — those the argument converts to implicitly.', [{ type: 'table', label: 'Applicable?', columns: ['parameter', 'conversion'], rows: rows, hl: hl1 }]));
        var order = ['identity', 'implicit widening', 'null literal', 'reference conversion', 'boxing'];
        var app = cands.filter(function (c) { return conv[t][c]; });
        app.sort(function (a, b) {
          var d = order.indexOf(conv[t][a]) - order.indexOf(conv[t][b]);
          if (d) return d;
          var spec = ['int', 'long', 'double', 'string?', 'object'];
          return spec.indexOf(a) - spec.indexOf(b);
        });
        frames.push(fr('Step 3: rank them. An identity conversion beats a widening one; among widenings the conversion to the <b>more specific</b> type wins (int over long over double, because int converts to long but not back); string beats object for <code>null</code>; boxing to object comes last.', [{ type: 'table', label: 'Ranking (best first)', columns: ['rank', 'parameter', 'conversion'], rows: app.map(function (c, i) { return [String(i + 1), c, conv[t][c]]; }), hl: { 0: 'sel' } }]));
        var win = app[0], hlc = {}; hlc[cands.indexOf(win) + 1] = 'ok'; hlc[cands.length + 2] = 'ok';
        frames.push(fr('Winner: <b>P(' + win + ')</b>. If two candidates had tied, the compiler would report CS0121 "the call is ambiguous".', [{ type: 'code', label: 'Chosen overload', lang: 'csharp', code: code, hl: hlc }]));
        return frames;
      }
    },
    examples: [
      { title: 'Named arguments for boolean flags', html: R`<p><code>Copy(src, dst, true, false)</code> tells the reader nothing. Named arguments fix that at zero run-time cost.</p>`, code: R`static void Copy(string src, string dst, bool overwrite = false, bool preserveTimes = true)
    => Console.WriteLine($"{src}->{dst} overwrite={overwrite} times={preserveTimes}");

Copy("a.txt", "b.txt", overwrite: true);
Copy(src: "a.txt", dst: "c.txt", preserveTimes: false);` },
      { title: 'params with an existing array', html: R`<p>A <code>params</code> method accepts either separate values or an array you already have. <code>Math.Max</code> takes two; a params helper takes any number.</p>`, code: R`static int MaxOf(int first, params int[] rest)    // "at least one" enforced by the signature
{
    int m = first;
    foreach (int x in rest) if (x > m) m = x;
    return m;
}

int[] more = { 4, 9 };
Console.WriteLine(MaxOf(3));            // 3
Console.WriteLine(MaxOf(3, 8, 1));      // 8
Console.WriteLine(MaxOf(3, more));      // 9` },
      { title: 'The default value is copied into the caller', html: R`<p>Like <code>const</code>, a default value is compiled into each <b>call site</b>. If a library changes <code>timeout = 30</code> to <code>timeout = 60</code>, existing compiled callers keep passing 30 until they are rebuilt. Public APIs often use overloads instead for this reason.</p>` }
    ],
    deepDive: R`<h4>🟣 The fine print</h4>
<ul>
<li><b>Better function member.</b> The spec ranks candidates argument by argument; one candidate is better if it is at least as good for every argument and better for one. A <code>params</code> candidate used in "expanded form" loses to one that applies normally. A generic candidate loses to a non-generic one with the same parameter types.</li>
<li><b>Overloading across inheritance</b> (later module): the compiler first looks at methods declared in the most derived class and only goes to the base class if none is applicable — a classic puzzle where <code>Derived.F(double)</code> is chosen over a better <code>Base.F(int)</code>.</li>
<li><b>params allocates</b> an array on every call with separate arguments. Hot APIs add fixed-arity overloads (<code>string.Concat(a, b, c)</code>) to avoid it; C# 13's <code>params ReadOnlySpan&lt;T&gt;</code> removes the allocation.</li>
<li><b>Optional parameters in interfaces</b>: the default used is the one on the <i>static</i> type of the variable, so a class and its interface with different defaults behave differently depending on how you call — avoid differing defaults.</li>
<li><b>Caller info attributes</b>: <code>[CallerMemberName] string name = ""</code>, <code>[CallerLineNumber]</code> and <code>[CallerArgumentExpression("x")]</code> (C# 10) are optional parameters the compiler fills in — the basis of <code>ArgumentNullException.ThrowIfNull(x)</code> messages.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> generated APIs tend to grow long parameter lists with many optional flags. <b>Use AI as a partner:</b> "which overload does this call bind to and why?" — then verify with the IDE's go-to-definition. <b>Where AI goes wrong:</b> it creates ambiguous overload sets (<code>F(int, double)</code> and <code>F(double, int)</code> with <code>F(1, 1)</code>), puts <code>params</code> before other parameters, or changes default values in a published library expecting callers to pick them up. <b>What you must still own:</b> API shape decisions — when an options object or a builder beats five optional parameters.</p>`
  });

  /* ======================================================================
     TOPIC 5 — Arrays
     ====================================================================== */
  topics.push({
    title: 'Arrays: 1-D, Multidimensional [,] vs Jagged [][], Indices & Ranges',
    analogy: R`<p>A one-dimensional array is a <b>row of numbered lockers</b> bolted to the wall: fixed length, each locker the same size, open any one instantly by its number. A <b>rectangular array</b> <code>[,]</code> is a <b>chessboard</b>: every row has exactly the same number of squares. A <b>jagged array</b> <code>[][]</code> is a <b>bookshelf of separate boxes</b>: each shelf holds its own box of lockers, and boxes can have different lengths (Pascal's triangle!).</p>`,
    explain: R`<h4>🟢 Creating arrays</h4>
<pre>int[] a = new int[5];              // [0, 0, 0, 0, 0]  elements start at default(T)
int[] b = { 3, 1, 4 };             // initializer
int[] c = [3, 1, 4];               // C# 12 collection expression
string[] names = new string[3];    // [null, null, null]
int[,] grid = new int[3, 4];       // rectangular: grid[r, c], grid.GetLength(0) = 3
int[][] tri = new int[3][];        // jagged: rows are null until created
tri[0] = [1]; tri[1] = [1, 1]; tri[2] = [1, 2, 1];</pre>
${H.table(['', '<code>int[,]</code> rectangular', '<code>int[][]</code> jagged'], [
  ['Memory', 'one block, row after row', 'an array of references to separate row arrays'],
  ['Row lengths', 'all equal', 'any; rows can even be null'],
  ['Access', '<code>g[r, c]</code>', '<code>j[r][c]</code>'],
  ['Size', '<code>g.GetLength(0)</code>, <code>g.GetLength(1)</code>', '<code>j.Length</code>, <code>j[r].Length</code>'],
  ['Speed', 'index math per access; JIT optimises less', 'usually faster in loops (row cached, bounds checks removed)'],
  ['Typical', 'images, fixed boards', 'LeetCode-style <code>int[][]</code>, triangles, adjacency lists']
])}
<h4>Indices and ranges (C# 8)</h4>
<pre>int[] x = [10, 20, 30, 40, 50];
x[^1]      // 50  (last; ^n means "n from the end")
x[1..3]    // [20, 30]  (start inclusive, end exclusive) — a NEW array copy
x[..2]     // [10, 20]
x[^2..]    // [40, 50]</pre>
<h4>Useful Array members</h4>
${H.table(['Call', 'Effect', 'Cost'], [
  ['<code>Array.Sort(a)</code> / <code>Array.Sort(a, (p, q) =&gt; q - p)</code>', 'sort in place (introsort)', 'O(n log n)'],
  ['<code>Array.BinarySearch(a, x)</code>', 'index, or a negative number <code>~insertionPoint</code>', 'O(log n), sorted input'],
  ['<code>Array.Reverse(a)</code>, <code>Array.Fill(a, -1)</code>', 'in place', 'O(n)'],
  ['<code>Array.Copy(src, dst, n)</code>, <code>a.AsSpan().CopyTo(b)</code>', 'block copy', 'O(n), very fast'],
  ['<code>Array.IndexOf(a, x)</code>, <code>Array.Exists(a, p)</code>', 'linear search', 'O(n)'],
  ['<code>Array.Resize(ref a, n)</code>', 'allocates a new array and copies', 'O(n)']
])}
<p>Arrays are <b>reference types</b>: <code>int[] y = x;</code> copies the reference, both names see the same elements. Use <code>(int[])x.Clone()</code> or <code>x[..]</code> for a copy. Indexing outside <code>0..Length-1</code> throws <code>IndexOutOfRangeException</code>.</p>`,
    clues: [
      '"matrix given as int[][]" (LeetCode) → jagged array; rows may have different lengths',
      '"last element" → <code>a[^1]</code>; "a slice" → range <code>a[i..j]</code> (copies) or <code>a.AsSpan(i, len)</code> (no copy)',
      '"sort descending" → <code>Array.Sort(a, (p, q) =&gt; q.CompareTo(p))</code> (not <code>q - p</code> with large values)',
      '"rotate the matrix in place" → transpose + reverse each row',
      '"fixed-size table known up front" → array; growing list → <code>List&lt;T&gt;</code>'
    ],
    code: [R`// Rectangular vs jagged, ranges, and Array helpers.
int[,] board = new int[3, 3];
board[1, 1] = 5;
Console.WriteLine($"{board.GetLength(0)}x{board.GetLength(1)} center={board[1, 1]}");

int[][] pascal = new int[5][];
for (int r = 0; r < pascal.Length; r++)
{
    pascal[r] = new int[r + 1];
    pascal[r][0] = pascal[r][r] = 1;
    for (int c = 1; c < r; c++)
        pascal[r][c] = pascal[r - 1][c - 1] + pascal[r - 1][c];
}
Console.WriteLine(string.Join(" ", pascal[4]));       // 1 4 6 4 1

int[] xs = [5, 3, 9, 1, 7];
Array.Sort(xs);                                        // [1, 3, 5, 7, 9]
int i = Array.BinarySearch(xs, 6);                     // ~3 = -4 (would insert at index 3)
Console.WriteLine($"{xs[^1]} {string.Join(",", xs[1..3])} {~i}");   // 9 3,5 3`],
    codeTitle: ['Rectangular, jagged, ranges and Array helpers'],
    viz: {
      title: 'Rotate a square matrix 90° clockwise in place',
      input: '1 2 3, 4 5 6, 7 8 9',
      inputLabel: 'Rows separated by commas (square, up to 5×5)',
      gen: function (input) {
        var rows = String(input).split(',').map(function (r) { return r.trim().split(/\s+/).filter(Boolean).map(Number); });
        var n = rows.length;
        if (n < 1 || n > 5 || rows.some(function (r) { return r.length !== n || r.some(function (x) { return !Number.isFinite(x); }); })) throw new Error('Enter a square matrix like "1 2, 3 4" (up to 5x5)');
        var m = rows.map(function (r) { return r.slice(); });
        var frames = [];
        function g(hl, label) { return { type: 'grid', label: label || 'matrix (jagged int[][])', rows: m.map(function (r) { return r.slice(); }), rowHead: m.map(function (_, i) { return 'r' + i; }), colHead: m[0].map(function (_, i) { return 'c' + i; }), hl: hl || {} }; }
        frames.push(fr('Plan: rotating clockwise = <b>transpose</b> (swap a[i][j] with a[j][i]) then <b>reverse every row</b>. Both steps are in place with O(1) extra memory.', [g()]));
        for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
          var t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t;
          var h = {}; h[i + ',' + j] = 'cur'; h[j + ',' + i] = 'cur';
          frames.push(fr('Transpose: swap <code>a[' + i + '][' + j + ']</code> and <code>a[' + j + '][' + i + ']</code> (only above the diagonal, or each pair would be swapped twice).', [g(h)]));
        }
        frames.push(fr('Transpose done: rows became columns.', [g()]));
        for (var r = 0; r < n; r++) {
          m[r].reverse();
          var h2 = {}; for (var c = 0; c < n; c++) h2[r + ',' + c] = 'ok';
          frames.push(fr('Reverse row ' + r + ' (two pointers, or <code>Array.Reverse(a[' + r + '])</code>).', [g(h2)]));
        }
        frames.push(fr('Done: the first column, read bottom-up, is now the first row. That is a 90° clockwise rotation.', [g({}, 'rotated')]));
        return frames;
      }
    },
    examples: [
      { title: 'Arrays are references: aliasing vs copying', html: R`<p>Assigning an array copies the reference. Ranges and <code>Clone()</code> create new arrays.</p>`, code: R`int[] a = [1, 2, 3];
int[] alias = a;
int[] copy = a[..];        // range over the whole array: a new array
alias[0] = 99;
Console.WriteLine($"{a[0]} {copy[0]}");    // 99 1` },
      { title: 'Sorting with a comparison', html: R`<p>Sort people by age descending, then name. <code>CompareTo</code> avoids the overflow that <code>q - p</code> can cause with extreme values.</p>`, code: R`var people = new (string Name, int Age)[] { ("Ann", 30), ("Bob", 25), ("Cid", 30) };
Array.Sort(people, (p, q) => q.Age != p.Age ? q.Age.CompareTo(p.Age) : string.CompareOrdinal(p.Name, q.Name));
Console.WriteLine(string.Join(" ", people.Select(p => p.Name)));   // Ann Cid Bob` },
      { title: 'Grid neighbours with direction arrays', html: R`<p>A tiny pair of arrays turns four if-statements into a loop — the standard trick for grid BFS/DFS.</p>`, code: R`int[] dr = [-1, 1, 0, 0], dc = [0, 0, -1, 1];
int rows = 3, cols = 4, r0 = 0, c0 = 3, count = 0;
for (int k = 0; k < 4; k++)
{
    int r = r0 + dr[k], c = c0 + dc[k];
    if (r >= 0 && r < rows && c >= 0 && c < cols) count++;
}
Console.WriteLine(count);     // 2 neighbours for a corner cell` }
    ],
    deepDive: R`<h4>🟣 Memory layout and performance</h4>
<ul>
<li>An array object has a header (sync block + method table pointer), a length field and then the elements contiguously. <code>int[1000]</code> is about 4 KB plus 24 bytes on 64-bit. Arrays of 85,000 bytes or more go to the <b>Large Object Heap</b> (module 8).</li>
<li><b>Bounds checks</b>: every <code>a[i]</code> is checked, but the JIT removes the check in the canonical <code>for (i = 0; i &lt; a.Length; i++)</code> pattern. <code>Span&lt;T&gt;</code> loops get the same benefit.</li>
<li><b>Array covariance</b>: <code>object[] objs = new string[2]; objs[0] = 1;</code> compiles but throws <code>ArrayTypeMismatchException</code> at run time — a historical design wart that also makes writes into reference-type arrays slightly slower (a type check per store).</li>
<li><b>Rectangular arrays</b> use <code>Array</code> helper calls for multi-index access in older runtimes; jagged arrays are usually faster in tight loops. For dense numeric work, a flat <code>int[rows * cols]</code> with <code>r * cols + c</code> is fastest and most cache friendly.</li>
<li><b>Ranges allocate</b>: <code>a[1..^1]</code> on an array creates a copy (O(n)). Use <code>a.AsSpan(1..^1)</code> for a zero-copy view.</li>
<li><b>Collection expressions</b> (C# 12) choose the best construction for the target type: <code>int[] a = [];</code> uses the cached <code>Array.Empty&lt;int&gt;()</code>, and spreads <code>[..x, ..y]</code> pre-size the result.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI translates matrix algorithms between languages well. <b>Use AI as a partner:</b> ask for the in-place version and for edge-case inputs (1×1, empty, non-square). <b>Where AI goes wrong:</b> it mixes <code>[,]</code> and <code>[][]</code> syntax, uses <code>Length</code> on a rectangular array expecting rows (it is the total count), forgets that jagged rows start as null, and slices with ranges inside loops, turning O(n) into O(n<sup>2</sup>). <b>What you must still own:</b> index arithmetic, choosing jagged vs rectangular vs flat, and knowing which operations copy.</p>`
  });

  /* ======================================================================
     TOPIC 6 — Strings and immutability
     ====================================================================== */
  topics.push({
    title: 'Strings: Immutability, Comparison, Common Operations & char',
    analogy: R`<p>A C# string is a <b>printed page</b>, not a whiteboard. You cannot erase a letter. Every "change" — <code>ToUpper</code>, <code>Replace</code>, <code>+</code> — sends the page to the printer and gives you a <b>brand-new page</b>, leaving the old one for the recycler (the garbage collector). That makes pages safe to share (no one can change yours behind your back), but writing a book one letter at a time by reprinting the whole page each time is painfully slow.</p>`,
    explain: R`<h4>🟢 What immutability means</h4>
<pre>string s = "hello";
s.ToUpper();            // returns "HELLO" — s is still "hello"!
s = s.ToUpper();        // now s refers to the new string
s[0] = 'J';             // compile error CS0200: indexer is read-only</pre>
<h4>Everyday operations</h4>
${H.table(['Call', 'Result for <code>s = "  Hello, World  "</code>'], [
  ['<code>s.Trim()</code>', '"Hello, World"'],
  ['<code>s.Length</code>', '16'],
  ['<code>s.Contains("World")</code>', 'True'],
  ['<code>s.Trim().Split(", ")</code>', '["Hello", "World"]'],
  ['<code>s.Trim().Substring(7, 5)</code> / <code>s.Trim()[7..12]</code>', '"World"'],
  ['<code>s.IndexOf(\'o\')</code>', '6'],
  ['<code>s.Replace("l", "L")</code>', '"  HeLLo, WorLd  "'],
  ['<code>string.Join("-", new[] { "a", "b" })</code>', '"a-b"'],
  ['<code>new string(\'*\', 3)</code>', '"***"'],
  ['<code>new string(s.Trim().Reverse().ToArray())</code>', '"dlroW ,olleH"']
])}
<h4>Comparing strings correctly</h4>
<ul>
<li><code>==</code> compares <b>contents</b> (ordinal, case-sensitive) — unlike Java, where <code>==</code> compares references.</li>
<li>Case-insensitive: <code>string.Equals(a, b, StringComparison.OrdinalIgnoreCase)</code>, not <code>a.ToLower() == b.ToLower()</code> (allocates and is culture-sensitive).</li>
<li>Ordering: <code>string.CompareOrdinal(a, b)</code> for identifiers, keys and algorithms; <code>string.Compare(a, b, StringComparison.CurrentCulture)</code> only for sorting text shown to people.</li>
<li>Null-safe checks: <code>string.IsNullOrEmpty(s)</code>, <code>string.IsNullOrWhiteSpace(s)</code>.</li>
</ul>
<h4>char helpers</h4>
<p><code>char.IsDigit</code>, <code>char.IsLetter</code>, <code>char.IsLetterOrDigit</code>, <code>char.IsWhiteSpace</code>, <code>char.ToLowerInvariant</code>. Digit value: <code>c - '0'</code>. Letter index: <code>c - 'a'</code>. Note that <code>char.IsDigit</code> also accepts other scripts' digits (Arabic-Indic '٣'); <code>char.IsAsciiDigit</code> (.NET 7+) accepts only 0–9.</p>`,
    clues: [
      '"compare strings ignoring case" → <code>StringComparison.OrdinalIgnoreCase</code>',
      '"s.Replace did not change my string" → immutability; assign the result',
      '"count characters / anagram" → <code>int[26]</code> indexed by <code>c - \'a\'</code>',
      '"palindrome ignoring punctuation" → two pointers with <code>char.IsLetterOrDigit</code>',
      '"substring in a loop is slow" → spans (<code>AsSpan</code>) or indices instead of copies'
    ],
    code: [R`static bool IsPalindrome(string s)
{
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

static bool IsAnagram(string a, string b)
{
    if (a.Length != b.Length) return false;
    var count = new int[26];                 // assumes lowercase a..z
    foreach (char c in a) count[c - 'a']++;
    foreach (char c in b) if (--count[c - 'a'] < 0) return false;
    return true;
}`],
    codeTitle: ['Two pointers and counting arrays on strings'],
    viz: {
      title: 'Immutability: each change makes a new string',
      input: 'cat',
      inputLabel: 'A short word (letters only, up to 8)',
      gen: function (input) {
        var w = String(input).trim();
        if (!/^[A-Za-z]{1,8}$/.test(w)) throw new Error('Enter up to 8 letters');
        var code = 'string s = "' + w + '";\nstring t = s;\ns.ToUpper();\ns = s.ToUpper();\ns += "!";';
        var heap = [['#1', '"' + w + '"']];
        function H2(hl) { return { type: 'map', label: 'Managed heap (string objects)', entries: heap.map(function (e) { return e.slice(); }), hl: hl || {} }; }
        var up = w.toUpperCase();
        var frames = [];
        frames.push(fr('<code>s</code> refers to a string object <b>#1</b> on the heap.', [cp(code, 1), vp({ s: '→ #1' }), H2({ '#1': 'ok' })]));
        frames.push(fr('<code>t = s</code> copies the <b>reference</b>. Both names point at #1. Safe, because #1 can never change.', [cp(code, 2), vp({ s: '→ #1', t: '→ #1' }, { t: 'ok' }), H2({ '#1': 'cur' })]));
        heap.push(['#2', '"' + up + '" (no one refers to it)']);
        frames.push(fr('<code>s.ToUpper()</code> builds a <b>new</b> string #2 and returns it — but the result is thrown away. <code>s</code> still points at #1. Classic bug.', [cp(code, 3, 'bad'), vp({ s: '→ #1', t: '→ #1' }), H2({ '#2': 'bad' })]));
        heap.push(['#3', '"' + up + '"']);
        frames.push(fr('<code>s = s.ToUpper()</code>: another new string #3, and this time <code>s</code> is re-pointed to it. <code>t</code> still sees the original "' + w + '".', [cp(code, 4, 'ok'), vp({ s: '→ #3', t: '→ #1' }, { s: 'ok' }), H2({ '#3': 'ok' })]));
        heap.push(['#4', '"' + up + '!"']);
        frames.push(fr('<code>s += "!"</code> is <code>s = s + "!"</code>: yet another object #4, copying all ' + (up.length + 1) + ' characters. In a loop of n appends this copies about n²/2 characters in total.', [cp(code, 5, 'ok'), vp({ s: '→ #4', t: '→ #1' }, { s: 'ok' }), H2({ '#4': 'ok' })]));
        frames.push(fr('#2 and #3 are now unreachable garbage; the GC will reclaim them. This is why repeated concatenation should use <b>StringBuilder</b> (next topic).', [H2({ '#2': 'done', '#3': 'done' })]));
        return frames;
      }
    },
    examples: [
      { title: '== compares contents', html: R`<p>Two different string objects with the same characters are equal with <code>==</code>. <code>ReferenceEquals</code> tells you whether they are the same object.</p>`, code: R`string a = "hello";
string b = new string(new[] { 'h', 'e', 'l', 'l', 'o' });
Console.WriteLine(a == b);                       // True (contents)
Console.WriteLine(ReferenceEquals(a, b));        // False (different objects)` },
      { title: 'Case-insensitive comparison without allocating', html: R`<p><code>ToLower()</code> creates new strings and, under the Turkish culture, turns "I" into a dotless "ı". Ordinal ignore-case is fast and culture-independent.</p>`, code: R`string cmd = "EXIT";
bool quit = string.Equals(cmd, "exit", StringComparison.OrdinalIgnoreCase);
var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Admin" };
Console.WriteLine($"{quit} {set.Contains("admin")}");    // True True` },
      { title: 'Splitting and joining words', html: R`<p>Reverse the words of a sentence, collapsing extra spaces: split with <code>RemoveEmptyEntries</code>, reverse, join.</p>`, code: R`string text = "  the   sky is blue ";
string[] words = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
Array.Reverse(words);
Console.WriteLine(string.Join(' ', words));      // blue is sky the` }
    ],
    deepDive: R`<h4>🟣 Inside System.String</h4>
<ul>
<li>A string is an object with a length and an inline array of UTF-16 <code>char</code>s (plus a terminating null for interop). <code>s.Length</code> counts <b>UTF-16 code units</b>, so an emoji like 😀 has Length 2. Use <code>s.EnumerateRunes()</code> for Unicode scalars and <code>StringInfo</code> for user-perceived characters (grapheme clusters).</li>
<li><b>Interning.</b> All string literals are interned: identical literals share one object. <code>string.Intern(s)</code> interns at run time. Never rely on reference equality of strings.</li>
<li><b>Hashing.</b> String hash codes are <b>randomised per process</b> in .NET Core (to resist hash-flooding attacks), so never persist <code>GetHashCode()</code> values.</li>
<li><b>Allocation-free slicing.</b> <code>s.AsSpan(start, len)</code> gives a <code>ReadOnlySpan&lt;char&gt;</code> view; most parsing APIs accept spans. <code>Substring</code> and ranges on strings copy.</li>
<li><b>Culture traps.</b> <code>"file".StartsWith("FILE", StringComparison.CurrentCultureIgnoreCase)</code> is culture-sensitive; <code>IndexOf(string)</code> without a comparison uses the current culture (ICU on Linux), which can treat some invisible characters as ignorable. Pass <code>StringComparison.Ordinal</code> in non-UI code; analyzers (CA1309, CA1310) flag the omissions.</li>
<li><b>Immutability pays off</b>: strings are thread-safe without locks, safe as dictionary keys, and can be shared freely.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> AI produces string manipulation in seconds, usually with LINQ one-liners. <b>Use AI as a partner:</b> "rewrite this with spans and no allocations" or "which comparisons here are culture-sensitive?". <b>Where AI goes wrong:</b> <code>ToLower() ==</code> comparisons, forgetting to assign the result of <code>Replace</code>, assuming <code>Length</code> counts characters a human sees, and concatenating in loops. <b>What you must still own:</b> picking ordinal vs culture comparison deliberately, and recognising O(n²) string building.</p>`
  });

  /* ======================================================================
     TOPIC 7 — StringBuilder
     ====================================================================== */
  topics.push({
    title: 'StringBuilder: Efficient String Building and When Not to Use It',
    analogy: R`<p>If a string is a printed page, a <b>StringBuilder</b> is a <b>notebook with spare blank pages</b>. You write letters onto the blank space at the end; when the notebook fills up, you clip on another bundle of pages instead of copying everything. Only when you are done do you send it to the printer once (<code>ToString()</code>) and get a single, final page.</p>`,
    explain: R`<h4>🟢 Why and how</h4>
<p>Building a string with <code>+=</code> in a loop copies everything built so far on each step: n appends of 1 character cost about n²/2 character copies. <code>StringBuilder</code> keeps a <b>mutable buffer</b> with extra capacity, so each append is amortised O(1).</p>
<pre>var sb = new StringBuilder();
for (int i = 0; i &lt; 5; i++)
    sb.Append(i).Append(',');
sb.Length--;                    // drop the last comma
string s = sb.ToString();       // "0,1,2,3,4"</pre>
${H.table(['Member', 'What it does'], [
  ['<code>Append(x)</code>, <code>AppendLine(x)</code>', 'add to the end (many overloads, no boxing for primitives)'],
  ['<code>Append($"...")</code>', 'interpolation directly into the builder (C# 10 handler, no temp string)'],
  ['<code>AppendJoin(", ", items)</code>', 'join a sequence'],
  ['<code>Insert(i, x)</code>, <code>Remove(i, n)</code>, <code>Replace(a, b)</code>', 'edit in place (Insert/Remove are O(n))'],
  ['<code>sb[i]</code>, <code>sb[i] = \'x\'</code>', 'read/write one char (can be slow for huge chunked builders)'],
  ['<code>Length</code>, <code>Capacity</code>, <code>Clear()</code>', 'size, reserved space, reuse the builder'],
  ['<code>new StringBuilder(capacity)</code>', 'pre-size when you know the final length']
])}
<h4>When you do not need it</h4>
<ul>
<li>A fixed number of pieces in <b>one expression</b>: <code>a + b + c</code> compiles to a single <code>string.Concat(a, b, c)</code>; interpolation uses a pooled handler. Both are fine.</li>
<li>Joining a collection: <code>string.Join(", ", items)</code> computes the total length and allocates once.</li>
<li>Characters known up front: build a <code>char[]</code> (or use <code>string.Create</code>) and call <code>new string(chars)</code>.</li>
</ul>
<p>Rule of thumb: <b>loop + string growing = StringBuilder</b> (or <code>Join</code>).</p>`,
    clues: [
      '"build the output for 10<sup>5</sup> lines" → one StringBuilder or a buffered writer',
      '"string concatenation in a loop is slow" → O(n²) copying; use StringBuilder',
      '"run-length encoding / compression" → StringBuilder with counts',
      '"reverse words in place" → char array or StringBuilder (strings are immutable)',
      '"join with separators" → <code>string.Join</code> or <code>AppendJoin</code>'
    ],
    code: [{ lang: 'csharp', run: true, title: 'Concatenation vs StringBuilder (runnable)', code: R`using System;
using System.Diagnostics;
using System.Text;

class Program
{
    static void Main()
    {
        const int N = 20_000;
        var sw = Stopwatch.StartNew();
        string s = "";
        for (int i = 0; i < N; i++) s += 'x';            // copies 1 + 2 + ... + N chars
        long concatMs = sw.ElapsedMilliseconds;

        sw.Restart();
        var sb = new StringBuilder(N);                   // pre-sized: no regrowth at all
        for (int i = 0; i < N; i++) sb.Append('x');
        string t = sb.ToString();
        long builderMs = sw.ElapsedMilliseconds;

        Console.WriteLine($"same result: {s == t}");
        Console.WriteLine($"concat {concatMs} ms, builder {builderMs} ms");
    }
}` }],
    codeTitle: ['Measuring the difference'],
    viz: {
      title: 'StringBuilder buffer growth vs string copying',
      input: '12',
      inputLabel: 'Number of single-character appends (1..24)',
      gen: function (input) {
        var t = String(input).trim();
        if (!/^\d{1,2}$/.test(t) || Number(t) < 1 || Number(t) > 24) throw new Error('Enter a number from 1 to 24');
        var n = Number(t);
        var frames = [], cap = 4, len = 0, chunks = [4], concatCopies = 0, sbCopies = 0;
        frames.push(fr('Start: a StringBuilder with capacity 4 (we use a small starting size so growth is visible; the real default is 16). The string version starts as "".', [{ type: 'bars', label: 'StringBuilder chunks (capacity)', values: chunks.slice(), texts: ['empty'] }, vp({ appends: 0, 'string copies so far': 0, 'builder copies so far': 0 })]));
        for (var i = 1; i <= n; i++) {
          len++;
          concatCopies += i;               // new string of length i
          var grew = false;
          if (len > cap) { var add = Math.max(cap, 1); chunks.push(Math.min(add, 8000)); cap += add; grew = true; }
          sbCopies += 1;
          var used = len, texts = chunks.map(function (c) { var u = Math.min(c, Math.max(0, used)); used -= c; return u + '/' + c; });
          if (grew || i === n || i <= 2) frames.push(fr('Append #' + i + ': ' + (grew ? '<b>buffer full</b> → a new chunk is linked on (no copying of old characters).' : 'written into spare capacity.') + ' The string version had to allocate a new string of length ' + i + ' and copy ' + i + ' chars.', [{ type: 'bars', label: 'StringBuilder chunks (used/capacity)', values: chunks.slice(), texts: texts, hl: grew ? (function () { var h = {}; h[chunks.length - 1] = 'ok'; return h; })() : {} }, vp({ appends: i, 'string copies so far': concatCopies, 'builder copies so far': sbCopies }, { 'string copies so far': 'bad', 'builder copies so far': 'ok' })]));
        }
        frames.push(fr('Total characters copied: string += needs <b>' + concatCopies + '</b> (n(n+1)/2), the builder <b>' + sbCopies + '</b> plus one final copy in <code>ToString()</code>. For n = 100,000 that is 5·10<sup>9</sup> vs 2·10<sup>5</sup>.', [{ type: 'bars', label: 'Copies: string vs builder', values: [concatCopies, sbCopies + n], texts: ['string +=', 'StringBuilder'], hl: { 0: 'bad', 1: 'ok' } }]));
        return frames;
      }
    },
    examples: [
      { title: 'Building a multiplication table', html: R`<p>Many lines of output: append every cell and line break to one builder, then print once at the end.</p>`, code: R`var sb = new StringBuilder();
for (int r = 1; r <= 3; r++)
{
    for (int c = 1; c <= 3; c++) sb.Append($"{r * c,4}");
    sb.AppendLine();
}
Console.Write(sb.ToString());` },
      { title: 'Run-length encoding', html: R`<p>"aaabcc" → "a3bc2": walk runs of equal characters, append the character and the count when it is above 1.</p>`, code: R`static string Rle(string s)
{
    var sb = new StringBuilder(s.Length);
    for (int i = 0; i < s.Length; )
    {
        int j = i;
        while (j < s.Length && s[j] == s[i]) j++;
        sb.Append(s[i]);
        if (j - i > 1) sb.Append(j - i);
        i = j;
    }
    return sb.ToString();
}` },
      { title: 'string.Create for a known length', html: R`<p>When the final length is known, <code>string.Create</code> writes directly into the new string's memory — zero intermediate buffers.</p>`, code: R`string Mask(string card) => string.Create(card.Length, card, (span, src) =>
{
    for (int i = 0; i < span.Length; i++)
        span[i] = i < span.Length - 4 ? '*' : src[i];
});
Console.WriteLine(Mask("4111222233334444"));   // ************4444` }
    ],
    deepDive: R`<h4>🟣 Inside StringBuilder</h4>
<ul>
<li>Since .NET 4, a StringBuilder is a <b>linked list of chunks</b> (each up to 8,000 chars), linked from the newest chunk backwards. Appends are amortised O(1) and never copy old chunks; <code>ToString()</code> copies each chunk once into the final string.</li>
<li>Because of the chunk list, <code>sb[i]</code> on a huge builder walks chunks from the end (O(chunks)); loops that index every char of a big builder can be quadratic. Use <code>GetChunks()</code> or <code>ToString()</code> first.</li>
<li><b>Capacity</b>: the default is 16; growth roughly doubles total capacity. Passing an accurate capacity avoids all regrowth.</li>
<li><b>Pooling</b>: high-throughput code reuses builders (<code>Clear()</code>) or rents from <code>ObjectPool&lt;StringBuilder&gt;</code>; the BCL internally uses a cached <code>StringBuilderCache</code> for small temporary builders.</li>
<li><b>Interpolation into a builder</b>: <code>sb.Append($"{x}:{y}")</code> uses <code>StringBuilder.AppendInterpolatedStringHandler</code>, so no temporary string is created.</li>
<li><b>Beyond strings</b>: for UTF-8 output (HTTP, files) <code>ArrayBufferWriter&lt;byte&gt;</code> plus <code>Utf8Formatter</code> or <code>Utf8JsonWriter</code> avoid UTF-16 altogether.</li>
</ul>`,
    aiEra: R`<p><b>What AI changes:</b> assistants know the StringBuilder rule well and often over-apply it. <b>Use AI as a partner:</b> ask for a micro-benchmark (BenchmarkDotNet) comparing <code>+</code>, interpolation, <code>Join</code> and StringBuilder for your actual sizes. <b>Where AI goes wrong:</b> it wraps three fixed concatenations in a StringBuilder (slower and noisier), or indexes a huge builder character by character. <b>What you must still own:</b> recognising the loop-and-grow pattern, and measuring before micro-optimising.</p>`
  });

  /* ---------- guided problems ---------- */
  topics[0].problems = [{
    title: 'Grade Classifier with a switch Expression',
    level: 'Easy', tags: ['switch expression', 'relational patterns'], companies: ['Infosys', 'Microsoft'],
    statement: R`<p>Write <code>public string Grade(int score)</code> in class <code>Solution</code>: return <code>"A"</code> for 90–100, <code>"B"</code> for 80–89, <code>"C"</code> for 70–79, <code>"D"</code> for 60–69, <code>"F"</code> for 0–59, and <code>"Invalid"</code> for anything outside 0–100.</p>`,
    constraints: R`Any 32-bit integer.`,
    example: R`<p><code>89 → "B"</code>, <code>90 → "A"</code>, <code>101 → "Invalid"</code>, <code>-1 → "Invalid"</code>.</p>`,
    brute: { why: R`<p>A chain of <code>if</code> statements with both bounds on every line works but repeats each boundary twice, which is exactly where off-by-one bugs hide (<code>score &gt; 90</code> instead of <code>&gt;= 90</code>).</p>`, code: R`public class Brute
{
    public string Grade(int score)
    {
        if (score >= 90 && score <= 100) return "A";
        if (score >= 80 && score <= 89) return "B";
        if (score >= 70 && score <= 79) return "C";
        if (score >= 60 && score <= 69) return "D";
        if (score >= 0 && score <= 59) return "F";
        return "Invalid";
    }
}` },
    mcq: { q: 'Arms are tested in order. Which order is correct?', options: ['<code>&gt;= 60</code>, <code>&gt;= 70</code>, <code>&gt;= 80</code>, <code>&gt;= 90</code>', 'invalid first, then <code>&gt;= 90</code>, <code>&gt;= 80</code>, <code>&gt;= 70</code>, <code>&gt;= 60</code>, <code>_</code>', 'Order never matters in a switch expression', '<code>_</code> first'], answer: 1, explain: 'The first matching arm wins. Handle invalid values first, then go from the highest band down, and end with the discard.' },
    hints: [
      R`<p>Hint 1: relational patterns: <code>&gt;= 90 =&gt; "A"</code>.</p>`,
      R`<p>Hint 2: combine with <code>or</code>: <code>&lt; 0 or &gt; 100 =&gt; "Invalid"</code> as the first arm.</p>`,
      R`<p>Hint 3: after the invalid arm, each later arm only needs a lower bound; the discard <code>_</code> catches 0–59.</p>`
    ],
    tests: { sig: 'int -> string', fn: 'grade', cases: [
      [[95], 'A'], [[90], 'A'], [[89], 'B'], [[80], 'B'], [[75], 'C'], [[60], 'D'], [[59], 'F'], [[0], 'F'], [[100], 'A'], [[101], 'Invalid'], [[-1], 'Invalid'], [[-2147483648], 'Invalid']
    ] },
    solution: {
      approach: R`<p>One switch expression: reject out-of-range scores first, then test lower bounds from the top band downwards.</p>`,
      code: R`public class Solution
{
    public string Grade(int score) => score switch
    {
        < 0 or > 100 => "Invalid",
        >= 90 => "A",
        >= 80 => "B",
        >= 70 => "C",
        >= 60 => "D",
        _ => "F"
    };
}`,
      dry: { head: ['score', 'arm tried', 'match?', 'result'], rows: [['89', '< 0 or > 100', 'no', '—'], ['89', '>= 90', 'no', '—'], ['89', '>= 80', '<span class="c-g">yes</span>', '"B"'], ['101', '< 0 or > 100', '<span class="c-g">yes</span>', '"Invalid"']] },
      complexity: R`<p>O(1): at most six comparisons.</p>`,
      followUps: ['Add "+" and "−" suffixes (e.g. 97 → "A+")', 'Return an enum instead of a string']
    }
  }];

  topics[2].problems = [{
    title: 'Min and Max Through out Parameters',
    level: 'Easy', tags: ['out', 'ref', 'arrays'], companies: ['Microsoft', 'Unity'],
    statement: R`<p>Write <code>public void MinMax(int[] a, out int min, out int max)</code> in class <code>Solution</code> that finds the smallest and largest element in one pass. Throw <code>ArgumentException</code> for an empty array. (The test harness calls your method and returns <code>[min, max]</code>.)</p>`,
    constraints: R`1 ≤ a.Length ≤ 10<sup>5</sup>, any int values.`,
    example: R`<p><code>[3, 1, 4, 1, 5]</code> → min <span class="c-g">1</span>, max <span class="c-g">5</span>. <code>[7]</code> → both 7.</p>`,
    brute: { why: R`<p>Sorting a copy and reading both ends works but costs O(n log n) and an extra array. Two separate passes (<code>a.Min()</code>, <code>a.Max()</code>) read the data twice.</p>`, code: R`public class Brute
{
    public void MinMax(int[] a, out int min, out int max)
    {
        var copy = (int[])a.Clone();
        Array.Sort(copy);                 // O(n log n) for an O(n) task
        min = copy[0];
        max = copy[^1];
    }
}` },
    mcq: { q: 'What happens if a path in <code>MinMax</code> returns without assigning <code>max</code>?', options: ['max keeps its old value', 'max becomes 0', 'Compile error CS0177', 'Run-time exception'], answer: 2, explain: 'An out parameter must be definitely assigned on every path before the method returns. The compiler enforces it.' },
    hints: [
      R`<p>Hint 1: initialise both outputs with <code>a[0]</code>, after checking the length.</p>`,
      R`<p>Hint 2: one <code>foreach</code>: update min and max as you go.</p>`,
      R`<p>Hint 3: starting from <code>int.MaxValue</code>/<code>int.MinValue</code> also works, but <code>a[0]</code> makes the intent clearer and handles one element naturally.</p>`
    ],
    tests: { sig: 'int[] -> int[]', fn: 'minMaxCheck', harness: { csharp: 'public static class Check { public static int[] MinMaxCheck(int[] a) { new Solution().MinMax(a, out int mn, out int mx); return [mn, mx]; } }' }, cases: [
      [[[3, 1, 4, 1, 5]], [1, 5]], [[[7]], [7, 7]], [[[-2, -9, 0]], [-9, 0]], [[[2147483647, -2147483648]], [-2147483648, 2147483647]], [[[5, 5, 5]], [5, 5]], [[[10, 9, 8, 7]], [7, 10]], [[{ $range: [0, 100000] }], [0, 99999]]
    ] },
    solution: {
      approach: R`<p>Validate, seed both outputs with the first element, and scan once. The <code>out</code> modifiers let the method deliver two results; a tuple return would be the alternative.</p>`,
      code: R`public class Solution
{
    public void MinMax(int[] a, out int min, out int max)
    {
        if (a.Length == 0) throw new ArgumentException("array is empty", nameof(a));
        min = max = a[0];
        foreach (int x in a)
        {
            if (x < min) min = x;
            else if (x > max) max = x;
        }
    }
}`,
      dry: { head: ['x', 'min', 'max'], rows: [['(start) 3', '3', '3'], ['1', '1', '3'], ['4', '1', '4'], ['1', '1', '4'], ['5', '1', '5']] },
      complexity: R`<p>O(n) time, O(1) extra memory.</p>`,
      followUps: ['Rewrite as <code>(int Min, int Max) MinMax(int[] a)</code> and compare call sites', 'Find both with about 1.5n comparisons by processing pairs']
    }
  }];

  topics[4].problems = [{
    title: 'Pascal\'s Triangle as a Jagged Array',
    level: 'Easy', tags: ['jagged arrays', 'nested loops'], companies: ['Amazon', 'Apple', 'Google'],
    statement: R`<p>Write <code>public int[][] Generate(int numRows)</code> in class <code>Solution</code> that returns the first <code>numRows</code> rows of Pascal's triangle. Row r has r + 1 numbers; each inner number is the sum of the two numbers above it.</p>`,
    constraints: R`0 ≤ numRows ≤ 30 (all values fit in int).`,
    example: R`<p><code>numRows = 5</code> → <span class="c-g">[[1], [1,1], [1,2,1], [1,3,3,1], [1,4,6,4,1]]</span>. A rectangular <code>int[5,5]</code> would waste almost half its cells.</p>`,
    brute: { why: R`<p>Computing every entry with the factorial formula C(r, c) = r! / (c!(r−c)!) overflows <code>int</code> (and even <code>long</code>) long before row 30, and recomputes factorials over and over.</p>`, code: R`public class Brute
{
    static long Fact(int n) { long f = 1; for (int i = 2; i <= n; i++) f *= i; return f; }
    public int[][] Generate(int numRows)
    {
        var res = new int[numRows][];
        for (int r = 0; r < numRows; r++)
        {
            res[r] = new int[r + 1];
            for (int c = 0; c <= r; c++) res[r][c] = (int)(Fact(r) / (Fact(c) * Fact(r - c)));   // overflows past ~20
        }
        return res;
    }
}` },
    mcq: { q: 'After <code>var t = new int[3][];</code>, what is <code>t[1]</code>?', options: ['An empty int array', '<code>null</code>', 'An int[3]', 'It throws'], answer: 1, explain: 'A jagged array is an array of references to rows. Each row starts as null until you assign new int[...] to it.' },
    hints: [
      R`<p>Hint 1: allocate the outer array with <code>new int[numRows][]</code>, then each row with <code>new int[r + 1]</code>.</p>`,
      R`<p>Hint 2: the first and last element of every row are 1.</p>`,
      R`<p>Hint 3: inner cells: <code>row[c] = prev[c - 1] + prev[c]</code>. numRows = 0 returns an empty array.</p>`
    ],
    tests: { sig: 'int -> int[][]', fn: 'generate', cases: [
      [[1], [[1]]], [[2], [[1], [1, 1]]], [[5], [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]], [[0], []],
      [[3], [[1], [1, 1], [1, 2, 1]]], [[6], [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1]]]
    ] },
    solution: {
      approach: R`<p>Build row by row: allocate a row of length r + 1, set the ends to 1 and fill the inside from the previous row. Only additions, so no overflow up to row 30.</p>`,
      code: R`public class Solution
{
    public int[][] Generate(int numRows)
    {
        var rows = new int[numRows][];
        for (int r = 0; r < numRows; r++)
        {
            var row = new int[r + 1];
            row[0] = row[r] = 1;
            for (int c = 1; c < r; c++)
                row[c] = rows[r - 1][c - 1] + rows[r - 1][c];
            rows[r] = row;
        }
        return rows;
    }
}`,
      dry: { head: ['r', 'row before filling', 'inner cells', 'row'], rows: [['0', '[1]', '—', '[1]'], ['1', '[1, 1]', '—', '[1, 1]'], ['2', '[1, 0, 1]', 'c=1: 1+1', '[1, 2, 1]'], ['3', '[1, 0, 0, 1]', 'c=1: 1+2, c=2: 2+1', '[1, 3, 3, 1]']] },
      complexity: R`<p>O(numRows²) time and memory — the size of the output itself.</p>`,
      followUps: ['Return only row k using O(k) memory', 'Store it in a flat int[] with an index formula']
    }
  }];

  topics[6].problems = [{
    title: 'Run-Length Compression with StringBuilder',
    level: 'Easy', tags: ['StringBuilder', 'strings', 'two pointers'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: R`<p>Write <code>public string Compress(string s)</code> in class <code>Solution</code>: replace every run of equal characters by the character followed by the run length, but write the length only when it is greater than 1. Case matters.</p>`,
    constraints: R`0 ≤ s.Length ≤ 10<sup>5</sup>.`,
    example: R`<p><code>"aaabcc"</code> → <span class="c-g">"a3bc2"</span>; <code>"zzzzzzzzzzzz"</code> (12 z) → <span class="c-g">"z12"</span>.</p>`,
    brute: { why: R`<p>Appending to a <code>string</code> with <code>+=</code> copies the whole result on every step: for 10<sup>5</sup> distinct characters that is about 5·10<sup>9</sup> character copies.</p>`, code: R`public class Brute
{
    public string Compress(string s)
    {
        string res = "";
        for (int i = 0; i < s.Length; )
        {
            int j = i;
            while (j < s.Length && s[j] == s[i]) j++;
            res += s[i];                          // O(n) copy each time
            if (j - i > 1) res += (j - i).ToString();
            i = j;
        }
        return res;
    }
}` },
    mcq: { q: 'Why can a run length of 12 not be appended as a single char?', options: ['char cannot hold 12', '<code>(char)12</code> is a control character, not "12"', 'StringBuilder rejects numbers', 'It can'], answer: 1, explain: 'sb.Append(12) appends the text "12"; (char)(12) or \'0\' + 12 would produce a single unrelated character. Use the int overload of Append.' },
    hints: [
      R`<p>Hint 1: for each start i, advance j while <code>s[j] == s[i]</code>; the run length is j − i.</p>`,
      R`<p>Hint 2: <code>sb.Append(s[i])</code> then <code>sb.Append(j - i)</code> when the length is above 1 — <code>Append(int)</code> writes digits without a temporary string.</p>`,
      R`<p>Hint 3: pre-size the builder with <code>s.Length</code>; an empty input returns "".</p>`
    ],
    tests: { sig: 'string -> string', fn: 'compress', cases: [
      [['aaabcc'], 'a3bc2'], [[''], ''], [['a'], 'a'], [['abc'], 'abc'], [['zzzzzzzzzzzz'], 'z12'], [['aabbaa'], 'a2b2a2'], [['AAaa'], 'A2a2'], [[{ $rep: 'x', n: 100000 }], 'x100000']
    ] },
    solution: {
      approach: R`<p>Two indices mark each run; a pre-sized <code>StringBuilder</code> collects the output in amortised O(1) per append.</p>`,
      code: R`using System.Text;

public class Solution
{
    public string Compress(string s)
    {
        var sb = new StringBuilder(s.Length);
        for (int i = 0; i < s.Length; )
        {
            int j = i;
            while (j < s.Length && s[j] == s[i]) j++;
            sb.Append(s[i]);
            if (j - i > 1) sb.Append(j - i);      // Append(int) writes the digits
            i = j;
        }
        return sb.ToString();
    }
}`,
      dry: { head: ['i', 'run', 'j', 'appended', 'sb'], rows: [['0', 'aaa', '3', 'a3', 'a3'], ['3', 'b', '4', 'b', 'a3b'], ['4', 'cc', '6', 'c2', 'a3bc2']] },
      complexity: R`<p>O(n) time; O(n) memory for the output.</p>`,
      followUps: ['Return the original string when compression does not make it shorter', 'Write the decompressor (careful with multi-digit counts)']
    }
  }];

  /* ======================================================================
     PRACTICE
     ====================================================================== */
  practice.push({
    title: 'FizzBuzz with a Tuple Switch',
    level: 'Easy', tags: ['loops', 'switch expression', 'StringBuilder'], companies: ['Microsoft', 'Amazon', 'TCS'],
    statement: R`<p>Read <code>n</code> and print the numbers 1..n, one per line, but print <code>Fizz</code> for multiples of 3, <code>Buzz</code> for multiples of 5 and <code>FizzBuzz</code> for multiples of both.</p>`,
    constraints: R`0 ≤ n ≤ 10<sup>5</sup>.`,
    example: R`<p><code>n = 15</code> → <code>1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz</code> (one per line). 15 must be checked as "both" <b>before</b> the single cases.</p>`,
    brute: { why: R`<p>Checking <code>% 3</code> before <code>% 15</code> prints "Fizz" for 15. And calling <code>Console.WriteLine</code> 10<sup>5</sup> times is slow because every call flushes.</p>`, code: R`int n = int.Parse(Console.ReadLine()!);
for (int i = 1; i <= n; i++)
{
    if (i % 3 == 0) Console.WriteLine("Fizz");          // 15 never reaches FizzBuzz
    else if (i % 5 == 0) Console.WriteLine("Buzz");
    else if (i % 15 == 0) Console.WriteLine("FizzBuzz");
    else Console.WriteLine(i);
}` },
    mcq: { q: 'In <code>(i % 3, i % 5) switch</code>, which arm must come first?', options: ['<code>(0, _)</code>', '<code>(_, 0)</code>', '<code>(0, 0)</code>', '<code>_</code>'], answer: 2, explain: 'The most specific pattern must come first; (0, _) would also match (0, 0) and win.' },
    hints: [
      R`<p>Hint 1: switch on the tuple <code>(i % 3, i % 5)</code>.</p>`,
      R`<p>Hint 2: arms: <code>(0, 0)</code>, <code>(0, _)</code>, <code>(_, 0)</code>, <code>_</code>.</p>`,
      R`<p>Hint 3: collect lines in a <code>StringBuilder</code> and print once.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: '1\n', stdout: '1' },
      { stdin: '3\n', stdout: '1\n2\nFizz' },
      { stdin: '5\n', stdout: '1\n2\nFizz\n4\nBuzz' },
      { stdin: '15\n', stdout: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz' },
      { stdin: '0\n', stdout: '' },
      { stdin: '16\n', stdout: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16' }
    ] },
    solution: {
      approach: R`<p>A tuple switch expression expresses the four cases as a decision table; a StringBuilder collects the output.</p>`,
      code: R`using System.Text;

int n = int.Parse(Console.ReadLine()!);
var sb = new StringBuilder();
for (int i = 1; i <= n; i++)
{
    sb.AppendLine((i % 3, i % 5) switch
    {
        (0, 0) => "FizzBuzz",
        (0, _) => "Fizz",
        (_, 0) => "Buzz",
        _ => i.ToString()
    });
}
Console.Write(sb);`,
      complexity: R`<p>O(n) time and O(n) memory for the buffered output.</p>`,
      followUps: ['Make the rules data-driven: a list of (divisor, word) pairs', 'Add "Bazz" for multiples of 7 without nesting conditions']
    }
  });

  practice.push({
    title: 'Reverse the Words of a Sentence',
    level: 'Easy', tags: ['strings', 'Split', 'Join'], companies: ['Microsoft', 'Amazon', 'Bloomberg'],
    statement: R`<p>Write <code>public string ReverseWords(string s)</code> in class <code>Solution</code>: return the words of <code>s</code> in reverse order, separated by single spaces, with no leading or trailing spaces. Words are runs of non-space characters.</p>`,
    constraints: R`0 ≤ s.Length ≤ 10<sup>4</sup>; s contains letters, digits and spaces.`,
    example: R`<p><code>"  hello world  "</code> → <span class="c-g">"world hello"</span>; <code>"a good   example"</code> → <span class="c-g">"example good a"</span>.</p>`,
    brute: { why: R`<p><code>s.Split(' ')</code> without options produces empty strings for repeated spaces, so the join puts extra spaces back. Building the answer with <code>+=</code> copies it repeatedly.</p>`, code: R`public class Brute
{
    public string ReverseWords(string s)
    {
        var parts = s.Split(' ');                // empty entries for double spaces
        string res = "";
        for (int i = parts.Length - 1; i >= 0; i--) res += parts[i] + " ";
        return res.Trim();                        // inner double spaces remain
    }
}` },
    mcq: { q: 'What does <code>"a  b".Split(\' \')</code> return?', options: ['["a", "b"]', '["a", "", "b"]', '["a", " ", "b"]', '["a  b"]'], answer: 1, explain: 'Each separator splits; two adjacent separators leave an empty string between them. Use StringSplitOptions.RemoveEmptyEntries.' },
    hints: [
      R`<p>Hint 1: <code>s.Split(' ', StringSplitOptions.RemoveEmptyEntries)</code> gives only real words.</p>`,
      R`<p>Hint 2: <code>Array.Reverse(words)</code> reverses the array in place.</p>`,
      R`<p>Hint 3: <code>string.Join(' ', words)</code> builds the result in one allocation.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'reverseWords', cases: [
      [['the sky is blue'], 'blue is sky the'], [['  hello world  '], 'world hello'], [['a good   example'], 'example good a'], [['single'], 'single'], [['   '], ''], [['a b'], 'b a'], [[''], '']
    ] },
    solution: {
      approach: R`<p>Split on spaces removing empties, reverse the array in place, join with single spaces.</p>`,
      code: R`public class Solution
{
    public string ReverseWords(string s)
    {
        string[] words = s.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        Array.Reverse(words);
        return string.Join(' ', words);
    }
}`,
      complexity: R`<p>O(n) time and memory.</p>`,
      followUps: ['Do it in place on a char[] with O(1) extra space (reverse all, then each word)', 'Keep the original spacing between words']
    }
  });

  practice.push({
    title: 'Valid Palindrome (Letters and Digits Only)',
    level: 'Easy', tags: ['strings', 'two pointers', 'char'], companies: ['Meta', 'Microsoft', 'Apple'],
    statement: R`<p>Write <code>public bool IsPalindrome(string s)</code> in class <code>Solution</code>: considering only ASCII letters and digits and ignoring case, does <code>s</code> read the same forwards and backwards?</p>`,
    constraints: R`0 ≤ s.Length ≤ 2·10<sup>5</sup>; printable ASCII.`,
    example: R`<p><code>"A man, a plan, a canal: Panama"</code> → <span class="c-g">true</span>; <code>"race a car"</code> → <span class="c-r">false</span>; <code>"0P"</code> → false (0 and p differ).</p>`,
    brute: { why: R`<p>Building a cleaned lowercase copy and a reversed copy allocates two extra strings of length n. It is correct, but two pointers do it in place.</p>`, code: R`public class Brute
{
    public bool IsPalindrome(string s)
    {
        string clean = new string(s.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());
        string rev = new string(clean.Reverse().ToArray());
        return clean == rev;
    }
}` },
    mcq: { q: 'Which comparison is correct for "A" vs "a" here?', options: ['<code>s[i] == s[j]</code>', '<code>char.ToLowerInvariant(s[i]) == char.ToLowerInvariant(s[j])</code>', '<code>s[i].ToString().ToLower() == s[j].ToString()</code>', '<code>s[i] - s[j] == 32</code>'], answer: 1, explain: 'Lower-case both chars with the invariant culture. Option C allocates strings and lowers only one side; D only works one way round and only for letters.' },
    hints: [
      R`<p>Hint 1: two indices, one starting at each end of the string.</p>`,
      R`<p>Hint 2: skip characters that are not letters or digits (<code>char.IsAsciiLetterOrDigit</code> in .NET 7+).</p>`,
      R`<p>Hint 3: compare lowered characters; an empty or all-punctuation string is a palindrome.</p>`
    ],
    tests: { sig: 'string -> bool', fn: 'isPalindrome', cases: [
      [['A man, a plan, a canal: Panama'], true], [['race a car'], false], [[' '], true], [[''], true], [['0P'], false], [['ab_a'], true], [["No 'x' in Nixon"], true], [['ab'], false]
    ] },
    solution: {
      approach: R`<p>Two pointers move inward, skipping non-alphanumeric characters, comparing case-insensitively. No allocations.</p>`,
      code: R`public class Solution
{
    public bool IsPalindrome(string s)
    {
        int i = 0, j = s.Length - 1;
        while (i < j)
        {
            if (!char.IsAsciiLetterOrDigit(s[i])) { i++; continue; }
            if (!char.IsAsciiLetterOrDigit(s[j])) { j--; continue; }
            if (char.ToLowerInvariant(s[i]) != char.ToLowerInvariant(s[j])) return false;
            i++; j--;
        }
        return true;
    }
}`,
      complexity: R`<p>O(n) time, O(1) extra memory.</p>`,
      followUps: ['Allow deleting at most one character (Valid Palindrome II)', 'Support full Unicode letters']
    }
  });

  practice.push({
    title: 'Count Vowels and Consonants',
    level: 'Easy', tags: ['strings', 'char', 'switch'], companies: ['Infosys', 'Wipro'],
    statement: R`<p>Write <code>public int[] CountVowelsConsonants(string s)</code> in class <code>Solution</code> returning <code>[vowels, consonants]</code>. Vowels are a, e, i, o, u in either case; consonants are the other ASCII letters (y counts as a consonant). Everything else is ignored.</p>`,
    constraints: R`0 ≤ s.Length ≤ 10<sup>5</sup>.`,
    example: R`<p><code>"Hello World"</code> → <span class="c-g">[3, 7]</span>: e, o, o are vowels; H, l, l, W, r, l, d consonants.</p>`,
    brute: { why: R`<p>Calling <code>"aeiouAEIOU".Contains(c)</code> or <code>s.ToLower()</code> works but allocates and scans a string per character. A switch on the lowered char is direct.</p>`, code: R`public class Brute
{
    public int[] CountVowelsConsonants(string s)
    {
        int v = 0, c = 0;
        foreach (char ch in s.ToLower())                    // allocates a copy
        {
            if ("aeiou".Contains(ch)) v++;
            else if (ch >= 'a' && ch <= 'z') c++;
        }
        return new[] { v, c };
    }
}` },
    mcq: { q: 'Which pattern tests for a lower-case vowel in one arm?', options: ['<code>\'a\' and \'e\'</code>', '<code>\'a\' or \'e\' or \'i\' or \'o\' or \'u\'</code>', '<code>in "aeiou"</code>', '<code>&gt;= \'a\' and &lt;= \'u\'</code>'], answer: 1, explain: 'The or pattern combines constant patterns. There is no "in" pattern, and a range would include consonants.' },
    hints: [
      R`<p>Hint 1: <code>char.ToLowerInvariant(ch)</code> folds the case.</p>`,
      R`<p>Hint 2: a switch arm <code>'a' or 'e' or 'i' or 'o' or 'u' =&gt; …</code></p>`,
      R`<p>Hint 3: a consonant is any other char in <code>'a'..'z'</code> after lowering.</p>`
    ],
    tests: { sig: 'string -> int[]', fn: 'countVowelsConsonants', cases: [
      [['Hello World'], [3, 7]], [[''], [0, 0]], [['AEIOU'], [5, 0]], [['xyz'], [0, 3]], [['123 !?'], [0, 0]], [['Programming in C#'], [4, 10]]
    ] },
    solution: {
      approach: R`<p>One pass, lower each char and classify with a switch statement using or-patterns.</p>`,
      code: R`public class Solution
{
    public int[] CountVowelsConsonants(string s)
    {
        int vowels = 0, consonants = 0;
        foreach (char raw in s)
        {
            char ch = char.ToLowerInvariant(raw);
            switch (ch)
            {
                case 'a' or 'e' or 'i' or 'o' or 'u':
                    vowels++;
                    break;
                case >= 'a' and <= 'z':
                    consonants++;
                    break;
            }
        }
        return [vowels, consonants];
    }
}`,
      complexity: R`<p>O(n) time, O(1) memory.</p>`,
      followUps: ['Count each vowel separately with an int[5]', 'Treat y as a vowel when it is not followed by a vowel']
    }
  });

  practice.push({
    title: 'Running Sum Without Overflow',
    level: 'Easy', tags: ['arrays', 'prefix sum', 'long'], companies: ['Amazon', 'Adobe'],
    statement: R`<p>Write <code>public long[] RunningSum(int[] a)</code> in class <code>Solution</code>: element i of the result is a[0] + … + a[i]. The sums may exceed the int range.</p>`,
    constraints: R`0 ≤ a.Length ≤ 10<sup>5</sup>; any int values.`,
    example: R`<p><code>[1, 2, 3, 4]</code> → <span class="c-g">[1, 3, 6, 10]</span>; <code>[2147483647, 2147483647]</code> → <span class="c-g">[2147483647, 4294967294]</span>.</p>`,
    brute: { why: R`<p>Recomputing each prefix from scratch is O(n²). Writing the sums back into the <code>int[]</code> input overflows silently.</p>`, code: R`public class Brute
{
    public long[] RunningSum(int[] a)
    {
        var res = new long[a.Length];
        for (int i = 0; i < a.Length; i++)
            for (int j = 0; j <= i; j++) res[i] += a[j];     // O(n^2)
        return res;
    }
}` },
    mcq: { q: 'Why return <code>long[]</code> rather than modifying the <code>int[]</code> in place?', options: ['long[] is faster', 'Prefix sums of ints can exceed int.MaxValue', 'Arrays cannot be modified', 'int[] cannot be returned'], answer: 1, explain: 'With 10^5 values up to 2^31, sums reach about 2·10^14 — only long can hold them.' },
    hints: [
      R`<p>Hint 1: keep one running <code>long</code> total across the loop.</p>`,
      R`<p>Hint 2: <code>res[i] = total += a[i];</code> adds and stores in one step.</p>`,
      R`<p>Hint 3: an empty input returns an empty array (<code>[]</code>).</p>`
    ],
    tests: { sig: 'int[] -> long[]', fn: 'runningSum', cases: [
      [[[1, 2, 3, 4]], [1, 3, 6, 10]], [[[]], []], [[[5]], [5]], [[[1, -1, 1, -1]], [1, 0, 1, 0]], [[[2147483647, 2147483647]], [2147483647, 4294967294]], [[[-3, -3]], [-3, -6]]
    ] },
    solution: {
      approach: R`<p>Single pass with a long accumulator written into a new long array.</p>`,
      code: R`public class Solution
{
    public long[] RunningSum(int[] a)
    {
        var res = new long[a.Length];
        long total = 0;
        for (int i = 0; i < a.Length; i++)
            res[i] = total += a[i];
        return res;
    }
}`,
      complexity: R`<p>O(n) time, O(n) memory for the output.</p>`,
      followUps: ['Answer range-sum queries in O(1) with the prefix array', 'Do it in place for a long[] input']
    }
  });

  practice.push({
    title: 'Rotate Image In Place (Jagged Array)',
    level: 'Medium', tags: ['jagged arrays', 'matrix', 'in place'], companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: R`<p>Write <code>public void Rotate(int[][] m)</code> in class <code>Solution</code> that rotates an n × n matrix 90° clockwise <b>in place</b>.</p>`,
    constraints: R`0 ≤ n ≤ 200; |m[i][j]| ≤ 1000.`,
    example: R`<p><code>[[1,2,3],[4,5,6],[7,8,9]]</code> → <span class="c-g">[[7,4,1],[8,5,2],[9,6,3]]</span>.</p>`,
    brute: { why: R`<p>Allocating a second matrix with <code>res[j][n-1-i] = m[i][j]</code> is simple but uses O(n²) extra memory, which the problem forbids.</p>`, code: R`public class Brute
{
    public void Rotate(int[][] m)
    {
        int n = m.Length;
        var res = new int[n][];
        for (int i = 0; i < n; i++) res[i] = new int[n];
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++) res[j][n - 1 - i] = m[i][j];
        for (int i = 0; i < n; i++) m[i] = res[i];          // O(n^2) extra memory
    }
}` },
    mcq: { q: 'Transpose then reverse each row gives…', options: ['90° counter-clockwise', '90° clockwise', '180°', 'a mirror image'], answer: 1, explain: 'Transpose maps (i, j) to (j, i); reversing rows maps (j, i) to (j, n−1−i) — exactly the clockwise rotation.' },
    hints: [
      R`<p>Hint 1: transpose: swap <code>m[i][j]</code> and <code>m[j][i]</code> for j &gt; i only.</p>`,
      R`<p>Hint 2: reverse each row with <code>Array.Reverse(m[i])</code>.</p>`,
      R`<p>Hint 3: tuple swap: <code>(m[i][j], m[j][i]) = (m[j][i], m[i][j]);</code></p>`
    ],
    tests: { sig: 'int[][] -> void', fn: 'rotate', mutate: 0, cases: [
      [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [[7, 4, 1], [8, 5, 2], [9, 6, 3]]],
      [[[[1]]], [[1]]],
      [[[[1, 2], [3, 4]]], [[3, 1], [4, 2]]],
      [[[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]], [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]]],
      [[[]], []],
      [[[[-1, 0], [0, -1]]], [[0, -1], [-1, 0]]]
    ] },
    solution: {
      approach: R`<p>Transpose across the main diagonal, then reverse every row. Both steps swap elements in place.</p>`,
      code: R`public class Solution
{
    public void Rotate(int[][] m)
    {
        int n = m.Length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                (m[i][j], m[j][i]) = (m[j][i], m[i][j]);   // transpose
        foreach (int[] row in m)
            Array.Reverse(row);                           // mirror horizontally
    }
}`,
      complexity: R`<p>O(n²) time, O(1) extra memory.</p>`,
      followUps: ['Rotate counter-clockwise', 'Rotate layer by layer with four-way swaps']
    }
  });

  practice.push({
    title: 'Price Formatter with Optional and Named Arguments',
    level: 'Medium', tags: ['optional parameters', 'named arguments', 'decimal', 'formatting'], companies: ['Shopify', 'Stripe', 'Microsoft'],
    statement: R`<p>Write <code>public static string Price(decimal amount, string currency = "USD", int decimals = 2, bool symbol = false)</code> in class <code>Solution</code>. Format the absolute amount with exactly <code>decimals</code> digits (invariant culture) and put a <code>-</code> in front of everything when the amount is negative. Without <code>symbol</code>: <code>"12.50 USD"</code>. With <code>symbol</code>: <code>"$12.50"</code> for USD, otherwise the code and a space in front: <code>"GBP 1234.568"</code>. The test harness calls it in six ways, for example <code>Price(a)</code>, <code>Price(a, decimals: 0)</code> and <code>Price(a, "GBP", symbol: true, decimals: 3)</code>.</p>`,
    constraints: R`|amount| ≤ 10<sup>9</sup>; 0 ≤ decimals ≤ 6.`,
    example: R`<p><code>Price(12.5m)</code> → <span class="c-g">"12.50 USD"</span>; <code>Price(-3.25m, symbol: true)</code> → <span class="c-g">"-$3.25"</span>; <code>Price(1234.5678m, currency: "JPY", decimals: 0, symbol: true)</code> → <span class="c-g">"JPY 1235"</span>.</p>`,
    brute: { why: R`<p>Writing eight overloads (with/without currency, decimals, symbol) multiplies code and still cannot express "only change <code>symbol</code>". Using <code>amount.ToString("F2")</code> without a culture prints commas on some machines.</p>`, code: R`public class Brute
{
    public static string Price(decimal amount) => amount.ToString("F2") + " USD";      // culture-dependent
    public static string Price(decimal amount, string currency) => amount.ToString("F2") + " " + currency;
    public static string Price(decimal amount, string currency, int decimals) => amount.ToString("F" + decimals) + " " + currency;
}` },
    mcq: { q: 'Which call sets only <code>symbol</code> and keeps the other defaults?', options: ['<code>Price(5m, true)</code>', '<code>Price(5m, symbol: true)</code>', '<code>Price(5m, , , true)</code>', '<code>Price(symbol = true, 5m)</code>'], answer: 1, explain: 'A named argument skips the optional parameters in between. Option A does not compile (true is not a string); C and D are not C# syntax.' },
    hints: [
      R`<p>Hint 1: format <code>Math.Abs(amount)</code> with <code>"F" + decimals</code> and <code>CultureInfo.InvariantCulture</code>.</p>`,
      R`<p>Hint 2: compute the sign prefix separately: <code>amount &lt; 0 ? "-" : ""</code>.</p>`,
      R`<p>Hint 3: a switch on <code>(symbol, currency)</code> chooses the layout.</p>`
    ],
    tests: { sig: 'double int -> string', fn: 'priceCheck', harness: { csharp: 'public static class Check { public static string PriceCheck(double a, int mode) { decimal d = (decimal)a; return mode switch { 0 => Solution.Price(d), 1 => Solution.Price(d, "EUR"), 2 => Solution.Price(d, decimals: 0), 3 => Solution.Price(d, symbol: true), 4 => Solution.Price(d, "GBP", symbol: true, decimals: 3), _ => Solution.Price(d, currency: "JPY", decimals: 0, symbol: true) }; } }' }, cases: [
      [[12.5, 0], '12.50 USD'], [[12.5, 1], '12.50 EUR'], [[1234.5678, 2], '1235 USD'], [[12.5, 3], '$12.50'], [[1234.5678, 4], 'GBP 1234.568'], [[1234.5678, 5], 'JPY 1235'],
      [[0, 0], '0.00 USD'], [[-3.25, 3], '-$3.25'], [[-3.25, 0], '-3.25 USD'], [[1000000000, 1], '1000000000.00 EUR']
    ] },
    solution: {
      approach: R`<p>One method with defaults covers every combination; callers pick what they change by name. The body formats the magnitude once and assembles the layout with a switch expression.</p>`,
      code: R`using System.Globalization;

public class Solution
{
    public static string Price(decimal amount, string currency = "USD", int decimals = 2, bool symbol = false)
    {
        string sign = amount < 0 ? "-" : "";
        string digits = Math.Abs(amount).ToString("F" + decimals, CultureInfo.InvariantCulture);
        return (symbol, currency) switch
        {
            (true, "USD") => sign + "$" + digits,
            (true, _) => $"{sign}{currency} {digits}",
            _ => $"{sign}{digits} {currency}"
        };
    }
}`,
      complexity: R`<p>O(d) for d output characters.</p>`,
      followUps: ['Replace the parameters with an options record and a with-expression', 'Add a thousands separator option']
    }
  });

  practice.push({
    title: 'Valid Anagram with a Counting Array',
    level: 'Medium', tags: ['strings', 'counting', 'arrays'], companies: ['Amazon', 'Google', 'Uber'],
    statement: R`<p>Write <code>public bool IsAnagram(string s, string t)</code> in class <code>Solution</code>: true if <code>t</code> uses exactly the same characters as <code>s</code> with the same counts. Characters are any <code>char</code> values (not only a–z).</p>`,
    constraints: R`0 ≤ length ≤ 5·10<sup>4</sup>.`,
    example: R`<p><code>("anagram", "nagaram")</code> → <span class="c-g">true</span>; <code>("rat", "car")</code> → <span class="c-r">false</span>; <code>("ab", "a b")</code> → false (the space counts).</p>`,
    brute: { why: R`<p>Sorting both strings (<code>string.Concat(s.Order())</code>) is O(n log n) and allocates. Counting is O(n).</p>`, code: R`public class Brute
{
    public bool IsAnagram(string s, string t)
    {
        var a = s.ToCharArray(); var b = t.ToCharArray();
        Array.Sort(a); Array.Sort(b);
        return new string(a) == new string(b);
    }
}` },
    mcq: { q: 'Characters can be any char. Which counter fits best?', options: ['<code>int[26]</code>', '<code>int[65536]</code> or a <code>Dictionary&lt;char, int&gt;</code>', '<code>bool[256]</code>', '<code>HashSet&lt;char&gt;</code>'], answer: 1, explain: 'int[26] only covers a–z. A char has 65,536 values, so an int[65536] (256 KB) or a dictionary works; a set loses the counts.' },
    hints: [
      R`<p>Hint 1: different lengths → false immediately.</p>`,
      R`<p>Hint 2: increment counts for s, decrement for t.</p>`,
      R`<p>Hint 3: if any count goes negative while processing t, return false.</p>`
    ],
    tests: { sig: 'string string -> bool', fn: 'isAnagram', cases: [
      [['anagram', 'nagaram'], true], [['rat', 'car'], false], [['', ''], true], [['a', 'aa'], false], [['listen', 'silent'], true], [['aabbcc', 'abcabc'], true], [['ab', 'a b'], false], [['Aa', 'aA'], true], [['Aa', 'aa'], false]
    ] },
    solution: {
      approach: R`<p>Count with a dictionary (any char), decrementing for the second string; a negative count proves a mismatch.</p>`,
      code: R`public class Solution
{
    public bool IsAnagram(string s, string t)
    {
        if (s.Length != t.Length) return false;
        var count = new Dictionary<char, int>();
        foreach (char c in s)
            count[c] = count.GetValueOrDefault(c) + 1;
        foreach (char c in t)
        {
            if (!count.TryGetValue(c, out int k) || k == 0) return false;
            count[c] = k - 1;
        }
        return true;
    }
}`,
      complexity: R`<p>O(n) time, O(k) memory for k distinct characters.</p>`,
      followUps: ['Group a list of words into anagram groups', 'Handle Unicode surrogate pairs as single characters']
    }
  });

  practice.push({
    title: 'Longest Common Prefix',
    level: 'Medium', tags: ['strings', 'arrays', 'vertical scan'], companies: ['Google', 'Amazon', 'Adobe'],
    statement: R`<p>Write <code>public string LongestCommonPrefix(string[] strs)</code> in class <code>Solution</code> returning the longest string that is a prefix of every element; return <code>""</code> for an empty array.</p>`,
    constraints: R`0 ≤ strs.Length ≤ 200; each length ≤ 200.`,
    example: R`<p><code>["flower", "flow", "flight"]</code> → <span class="c-g">"fl"</span>; <code>["dog", "racecar", "car"]</code> → <span class="c-g">""</span>.</p>`,
    brute: { why: R`<p>Trying every prefix of the first word and checking it with <code>StartsWith</code> against all words is O(L² · n) and allocates a substring per attempt.</p>`, code: R`public class Brute
{
    public string LongestCommonPrefix(string[] strs)
    {
        if (strs.Length == 0) return "";
        string best = "";
        for (int len = 1; len <= strs[0].Length; len++)
        {
            string p = strs[0].Substring(0, len);
            if (strs.All(s => s.StartsWith(p, StringComparison.Ordinal))) best = p;
            else break;
        }
        return best;
    }
}` },
    mcq: { q: 'Vertical scanning compares…', options: ['whole strings pairwise', 'character i of every string before moving to i + 1', 'only the first and last string', 'hash codes'], answer: 1, explain: 'Check column i across all strings; stop at the first mismatch or the end of the shortest string.' },
    hints: [
      R`<p>Hint 1: the answer is at most as long as the shortest string.</p>`,
      R`<p>Hint 2: for i = 0, 1, …: compare <code>strs[k][i]</code> with <code>strs[0][i]</code> for every k.</p>`,
      R`<p>Hint 3: return <code>strs[0][..i]</code> at the first mismatch (one allocation).</p>`
    ],
    tests: { sig: 'string[] -> string', fn: 'longestCommonPrefix', cases: [
      [[['flower', 'flow', 'flight']], 'fl'], [[['dog', 'racecar', 'car']], ''], [[['alone']], 'alone'], [[[]], ''], [[['', 'abc']], ''], [[['interview', 'internet', 'interval']], 'inter'], [[['same', 'same']], 'same']
    ] },
    solution: {
      approach: R`<p>Vertical scan: for each column index, verify every string has the same character there; slice the first string once at the end.</p>`,
      code: R`public class Solution
{
    public string LongestCommonPrefix(string[] strs)
    {
        if (strs.Length == 0) return "";
        string first = strs[0];
        for (int i = 0; i < first.Length; i++)
        {
            char c = first[i];
            foreach (string s in strs)
                if (i == s.Length || s[i] != c)
                    return first[..i];
        }
        return first;
    }
}`,
      complexity: R`<p>O(S) where S is the total number of characters compared; O(1) extra memory besides the result.</p>`,
      followUps: ['Solve it by sorting and comparing only the first and last string', 'Answer many prefix queries with a trie']
    }
  });

  practice.push({
    title: 'Spiral Order of a Matrix',
    level: 'Medium', tags: ['jagged arrays', 'simulation', 'boundaries'], companies: ['Microsoft', 'Amazon', 'Meta'],
    statement: R`<p>Write <code>public int[] SpiralOrder(int[][] m)</code> in class <code>Solution</code> returning all elements of an r × c matrix in clockwise spiral order, starting at the top-left.</p>`,
    constraints: R`0 ≤ r, c ≤ 100; all rows have the same length.`,
    example: R`<p><code>[[1,2,3],[4,5,6],[7,8,9]]</code> → <span class="c-g">[1,2,3,6,9,8,7,4,5]</span>.</p>`,
    brute: { why: R`<p>Simulating with a direction vector and a <code>bool[,] visited</code> grid works but needs O(r·c) extra memory and careful turning logic. Four shrinking boundaries need none.</p>`, code: R`public class Brute
{
    public int[] SpiralOrder(int[][] m)
    {
        if (m.Length == 0 || m[0].Length == 0) return [];
        int r = m.Length, c = m[0].Length;
        var seen = new bool[r, c]; var res = new List<int>();
        int[] dr = [0, 1, 0, -1], dc = [1, 0, -1, 0];
        int i = 0, j = 0, d = 0;
        for (int k = 0; k < r * c; k++)
        {
            res.Add(m[i][j]); seen[i, j] = true;
            int ni = i + dr[d], nj = j + dc[d];
            if (ni < 0 || ni >= r || nj < 0 || nj >= c || seen[ni, nj]) { d = (d + 1) % 4; ni = i + dr[d]; nj = j + dc[d]; }
            i = ni; j = nj;
        }
        return res.ToArray();
    }
}` },
    mcq: { q: 'With boundaries top, bottom, left, right, when must you re-check before walking the bottom row leftwards?', options: ['Never', 'When top &gt; bottom after the top row and right column were consumed', 'Only for square matrices', 'Only when right &lt; 0'], answer: 1, explain: 'For a single remaining row, walking right then left would emit it twice. Check top <= bottom (and left <= right for the left column).' },
    hints: [
      R`<p>Hint 1: keep four boundaries and shrink one after each side is walked.</p>`,
      R`<p>Hint 2: order: top row → right column → bottom row (reversed) → left column (upwards).</p>`,
      R`<p>Hint 3: guard the last two sides with <code>if (top &lt;= bottom)</code> and <code>if (left &lt;= right)</code>.</p>`
    ],
    tests: { sig: 'int[][] -> int[]', fn: 'spiralOrder', cases: [
      [[[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], [1, 2, 3, 6, 9, 8, 7, 4, 5]],
      [[[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]],
      [[[[1]]], [1]], [[[[1, 2, 3]]], [1, 2, 3]], [[[[1], [2], [3]]], [1, 2, 3]], [[[]], []], [[[[1, 2], [3, 4]]], [1, 2, 4, 3]]
    ] },
    solution: {
      approach: R`<p>Walk the four sides of the current rectangle, shrinking a boundary after each side and guarding the last two sides against single rows or columns.</p>`,
      code: R`public class Solution
{
    public int[] SpiralOrder(int[][] m)
    {
        if (m.Length == 0 || m[0].Length == 0) return [];
        int top = 0, bottom = m.Length - 1, left = 0, right = m[0].Length - 1;
        var res = new int[m.Length * m[0].Length];
        int k = 0;
        while (top <= bottom && left <= right)
        {
            for (int c = left; c <= right; c++) res[k++] = m[top][c];
            top++;
            for (int r = top; r <= bottom; r++) res[k++] = m[r][right];
            right--;
            if (top <= bottom)
            {
                for (int c = right; c >= left; c--) res[k++] = m[bottom][c];
                bottom--;
            }
            if (left <= right)
            {
                for (int r = bottom; r >= top; r--) res[k++] = m[r][left];
                left++;
            }
        }
        return res;
    }
}`,
      complexity: R`<p>O(r·c) time, O(1) extra memory besides the output.</p>`,
      followUps: ['Generate an n × n matrix filled 1..n² in spiral order', 'Walk the spiral counter-clockwise']
    }
  });

  practice.push({
    title: 'Caesar Cipher for Any Shift',
    level: 'Medium', tags: ['char arithmetic', 'modulo', 'StringBuilder'], companies: ['Cisco', 'Palo Alto Networks'],
    statement: R`<p>Write <code>public string Caesar(string s, int k)</code> in class <code>Solution</code>: shift every ASCII letter by <code>k</code> positions in the alphabet (wrapping around, keeping its case); other characters stay the same. <code>k</code> may be negative or huge.</p>`,
    constraints: R`0 ≤ s.Length ≤ 10<sup>5</sup>; any int k, including <code>int.MinValue</code>.`,
    example: R`<p><code>("Hello, World!", 13)</code> → <span class="c-g">"Uryyb, Jbeyq!"</span>; <code>("abc", -1)</code> → <span class="c-g">"zab"</span>; <code>("abc", int.MinValue)</code> → <span class="c-g">"cde"</span>.</p>`,
    brute: { why: R`<p><code>(c - 'a' + k) % 26</code> breaks for negative k (C#'s % keeps the sign) and overflows when <code>k</code> is near the int limits. <code>Math.Abs(k)</code> throws for <code>int.MinValue</code>.</p>`, code: R`public class Brute
{
    public string Caesar(string s, int k)
    {
        var res = "";
        foreach (char c in s)
            res += char.IsLower(c) ? (char)('a' + (c - 'a' + k) % 26) : c;   // negative k breaks, O(n^2) concat
        return res;
    }
}` },
    mcq: { q: 'What is a safe way to normalise any int k into 0..25?', options: ['<code>k % 26</code>', '<code>Math.Abs(k) % 26</code>', '<code>((k % 26) + 26) % 26</code>', '<code>(k + 26) % 26</code>'], answer: 2, explain: 'k % 26 is in −25..25; adding 26 makes it 1..51 and a second % gives 0..25 without overflow. Math.Abs throws for int.MinValue and (k + 26) overflows near int.MaxValue.' },
    hints: [
      R`<p>Hint 1: normalise the shift once: <code>int sh = ((k % 26) + 26) % 26;</code></p>`,
      R`<p>Hint 2: for a lower-case letter: <code>(char)('a' + (c - 'a' + sh) % 26)</code>; the same with <code>'A'</code>.</p>`,
      R`<p>Hint 3: write into a <code>char[]</code> (or <code>string.Create</code>) since the length does not change.</p>`
    ],
    tests: { sig: 'string int -> string', fn: 'caesar', cases: [
      [['abc', 1], 'bcd'], [['xyz', 3], 'abc'], [['Hello, World!', 13], 'Uryyb, Jbeyq!'], [['abc', -1], 'zab'], [['abc', 52], 'abc'], [['AbZ', -27], 'ZaY'], [['', 5], ''], [['abc', -2147483648], 'cde'], [['Zz9', 2147483647], 'Ww9']
    ] },
    solution: {
      approach: R`<p>Reduce the shift to 0..25 once, then map each letter with char arithmetic into a <code>char[]</code> of the same length.</p>`,
      code: R`public class Solution
{
    public string Caesar(string s, int k)
    {
        int sh = ((k % 26) + 26) % 26;            // safe for every int
        var res = new char[s.Length];
        for (int i = 0; i < s.Length; i++)
        {
            char c = s[i];
            res[i] = c switch
            {
                >= 'a' and <= 'z' => (char)('a' + (c - 'a' + sh) % 26),
                >= 'A' and <= 'Z' => (char)('A' + (c - 'A' + sh) % 26),
                _ => c
            };
        }
        return new string(res);
    }
}`,
      complexity: R`<p>O(n) time and memory.</p>`,
      followUps: ['Break the cipher automatically with letter-frequency analysis', 'Implement the Vigenère cipher']
    }
  });

  practice.push({
    title: 'Multiply Two Huge Numbers Given as Strings',
    level: 'Hard', tags: ['strings', 'arrays', 'StringBuilder', 'math'], companies: ['Meta', 'Microsoft', 'Twitter'],
    statement: R`<p>Write <code>public string Multiply(string a, string b)</code> in class <code>Solution</code> that returns the product of two non-negative integers written in decimal, without converting them to numeric types (no <code>long</code>, no <code>BigInteger</code>).</p>`,
    constraints: R`1 ≤ length ≤ 200; no leading zeros except the number "0" itself.`,
    example: R`<p><code>("123", "456")</code> → <span class="c-g">"56088"</span>; <code>("99999999999999999999", "99999999999999999999")</code> → <span class="c-g">"9999999999999999999800000000000000000001"</span> — 40 digits, far beyond <code>ulong</code>.</p>`,
    brute: { why: R`<p><code>long.Parse(a) * long.Parse(b)</code> overflows for 19+ digit inputs. Simulating schoolbook multiplication with string concatenation (adding shifted partial products as strings) works but allocates O(n) strings of length O(n).</p>`, code: R`public class Brute
{
    public string Multiply(string a, string b) => (long.Parse(a) * long.Parse(b)).ToString();   // overflow / exception
}` },
    mcq: { q: 'Digit a[i] times digit b[j] contributes to which result position (0-based from the left, result length n + m)?', options: ['i + j', 'i + j + 1 (with the carry going to i + j)', 'n + m − i − j', 'i · j'], answer: 1, explain: 'With an int[n + m] buffer, the product of a[i] and b[j] lands at index i + j + 1 and its carry flows into i + j. Position 0 is only used by the final carry.' },
    hints: [
      R`<p>Hint 1: the product has at most n + m digits: allocate <code>int[n + m]</code>.</p>`,
      R`<p>Hint 2: loop i and j from the right; add <code>(a[i] - '0') * (b[j] - '0')</code> to <code>pos[i + j + 1]</code>, then move the carry to <code>pos[i + j]</code>.</p>`,
      R`<p>Hint 3: skip leading zeros when building the answer with a <code>StringBuilder</code>; return "0" if everything is zero.</p>`
    ],
    tests: { sig: 'string string -> string', fn: 'multiply', cases: [
      [['2', '3'], '6'], [['123', '456'], '56088'], [['0', '12345'], '0'], [['999', '999'], '998001'], [['123456789', '987654321'], '121932631112635269'], [['1', '1'], '1'], [['9133', '0'], '0'],
      [['99999999999999999999', '99999999999999999999'], '9999999999999999999800000000000000000001']
    ] },
    solution: {
      approach: R`<p>Schoolbook multiplication into an <code>int[]</code> of n + m digit slots: each digit pair adds into one slot and pushes its carry left immediately. Finally skip leading zeros and convert the slots to characters.</p>`,
      code: R`using System.Text;

public class Solution
{
    public string Multiply(string a, string b)
    {
        int n = a.Length, m = b.Length;
        var pos = new int[n + m];
        for (int i = n - 1; i >= 0; i--)
        {
            int da = a[i] - '0';
            for (int j = m - 1; j >= 0; j--)
            {
                int sum = da * (b[j] - '0') + pos[i + j + 1];
                pos[i + j + 1] = sum % 10;
                pos[i + j] += sum / 10;              // carry; normalised by later steps
            }
        }
        var sb = new StringBuilder(n + m);
        foreach (int d in pos)
            if (sb.Length > 0 || d != 0) sb.Append((char)('0' + d));
        return sb.Length == 0 ? "0" : sb.ToString();
    }
}`,
      complexity: R`<p>O(n·m) time, O(n + m) memory.</p>`,
      followUps: ['Add two huge numbers given as strings', 'Speed it up with base 10<sup>9</sup> limbs or Karatsuba']
    }
  });

  practice.push({
    title: 'Longest Palindromic Substring',
    level: 'Hard', tags: ['strings', 'expand around center', 'spans'], companies: ['Amazon', 'Microsoft', 'Google'],
    statement: R`<p>Write <code>public string LongestPalindrome(string s)</code> in class <code>Solution</code> returning a longest substring of <code>s</code> that reads the same in both directions. If several have the maximum length, any of them is accepted.</p>`,
    constraints: R`1 ≤ s.Length ≤ 1000; letters and digits.`,
    example: R`<p><code>"babad"</code> → <span class="c-g">"bab"</span> (or "aba"); <code>"cbbd"</code> → <span class="c-g">"bb"</span>.</p>`,
    brute: { why: R`<p>Checking all O(n²) substrings, each in O(n), is O(n³) — 10<sup>9</sup> steps for n = 1000 — and calling <code>Substring</code> for each allocates heavily.</p>`, code: R`public class Brute
{
    public string LongestPalindrome(string s)
    {
        string best = s[..1];
        for (int i = 0; i < s.Length; i++)
            for (int j = i + 1; j <= s.Length; j++)
            {
                string sub = s.Substring(i, j - i);                 // allocation per pair
                if (sub.Length > best.Length && sub.SequenceEqual(sub.Reverse())) best = sub;
            }
        return best;
    }
}` },
    mcq: { q: 'How many centres must be expanded for a string of length n?', options: ['n', '2n − 1 (each char and each gap)', 'n / 2', 'n²'], answer: 1, explain: 'Odd-length palindromes centre on a character, even-length ones on the gap between two characters: n + (n − 1) centres.' },
    hints: [
      R`<p>Hint 1: every palindrome mirrors around its centre.</p>`,
      R`<p>Hint 2: write a helper <code>Expand(lo, hi)</code> that moves outward while <code>s[lo] == s[hi]</code> and returns the length.</p>`,
      R`<p>Hint 3: track only the best start and length; slice once at the end with <code>s.Substring(start, len)</code>.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'longestPalindrome', check: '(args, out, exp) => typeof out === "string" && out.length === exp.length && args[0].includes(out) && out === out.split("").reverse().join("")', cases: [
      [['babad'], 'bab'], [['cbbd'], 'bb'], [['a'], 'a'], [['ac'], 'a'], [['forgeeksskeegfor'], 'geeksskeeg'], [['racecar'], 'racecar'], [['aaaa'], 'aaaa'], [['abacdfgdcaba'], 'aba']
    ] },
    solution: {
      approach: R`<p>Expand around all 2n − 1 centres with a local function; remember the best (start, length) and allocate the answer once.</p>`,
      code: R`public class Solution
{
    public string LongestPalindrome(string s)
    {
        int bestStart = 0, bestLen = 1;
        for (int c = 0; c < s.Length; c++)
        {
            int odd = Expand(c, c), even = Expand(c, c + 1);
            int len = Math.Max(odd, even);
            if (len > bestLen) { bestLen = len; bestStart = c - (len - 1) / 2; }
        }
        return s.Substring(bestStart, bestLen);

        int Expand(int lo, int hi)            // captures s
        {
            while (lo >= 0 && hi < s.Length && s[lo] == s[hi]) { lo--; hi++; }
            return hi - lo - 1;
        }
    }
}`,
      complexity: R`<p>O(n²) time in the worst case ("aaaa…"), O(1) extra memory.</p>`,
      followUps: ['Manacher\'s algorithm for O(n)', 'Count all palindromic substrings']
    }
  });

  practice.push({
    title: 'Decode a Nested Repeat String',
    level: 'Hard', tags: ['strings', 'recursion', 'StringBuilder', 'ref'], companies: ['Google', 'Bloomberg', 'Cisco'],
    statement: R`<p>Write <code>public string DecodeString(string s)</code> in class <code>Solution</code>. The encoding <code>k[text]</code> means <code>text</code> repeated <code>k</code> times, and brackets nest: <code>"3[a2[c]]"</code> → <code>"accaccacc"</code>. Letters outside brackets are copied as they are.</p>`,
    constraints: R`0 ≤ s.Length ≤ 30; 1 ≤ k ≤ 300 (k may have several digits); the input is always valid; the output has at most 10<sup>5</sup> characters.`,
    example: R`<p><code>"2[abc]3[cd]ef"</code> → <span class="c-g">"abcabccdcdcdef"</span>; <code>"10[a]"</code> → <span class="c-g">"aaaaaaaaaa"</span> (two-digit count).</p>`,
    brute: { why: R`<p>Repeatedly finding the innermost <code>k[...]</code> with string searches and rebuilding the whole string with <code>Replace</code> works but is quadratic in the output size and fragile with multi-digit counts.</p>`, code: R`public class Brute
{
    public string DecodeString(string s)
    {
        while (s.Contains('['))
        {
            int close = s.IndexOf(']'), open = s.LastIndexOf('[', close);
            int start = open;
            while (start > 0 && char.IsDigit(s[start - 1])) start--;
            int k = int.Parse(s[start..open]);
            string inner = s[(open + 1)..close];
            s = s[..start] + string.Concat(Enumerable.Repeat(inner, k)) + s[(close + 1)..];   // rebuilds everything
        }
        return s;
    }
}` },
    mcq: { q: 'A recursive parser shares its position between calls. How?', options: ['A static field', 'A <code>ref int i</code> parameter, so each call advances the caller\'s index', 'Returning the substring', 'It cannot'], answer: 1, explain: 'Passing the index by ref lets a nested call consume "a2[c]" and leave the caller positioned just after the closing bracket — no globals.' },
    hints: [
      R`<p>Hint 1: parse with recursion: <code>Parse(ref int i)</code> reads until a <code>']'</code> or the end.</p>`,
      R`<p>Hint 2: on a digit, read the whole number, skip <code>'['</code>, call Parse recursively, skip <code>']'</code>, and append the result k times.</p>`,
      R`<p>Hint 3: build each level with its own <code>StringBuilder</code>; <code>sb.Insert</code> is not needed — use <code>Append</code> in a loop.</p>`
    ],
    tests: { sig: 'string -> string', fn: 'decodeString', cases: [
      [['3[a]2[bc]'], 'aaabcbc'], [['3[a2[c]]'], 'accaccacc'], [['2[abc]3[cd]ef'], 'abcabccdcdcdef'], [['abc'], 'abc'], [['10[a]'], 'aaaaaaaaaa'], [[''], ''], [['2[2[2[x]]]'], 'xxxxxxxx'], [['a2[b]c'], 'abbc']
    ] },
    solution: {
      approach: R`<p>Recursive descent with the index passed by <code>ref</code>. Each level owns a StringBuilder; a number introduces a nested level whose result is appended k times. Depth equals bracket nesting (at most 15 for a 30-character input).</p>`,
      code: R`using System.Text;

public class Solution
{
    public string DecodeString(string s)
    {
        int i = 0;
        return Parse(s, ref i);
    }

    private static string Parse(string s, ref int i)
    {
        var sb = new StringBuilder();
        while (i < s.Length && s[i] != ']')
        {
            if (char.IsAsciiDigit(s[i]))
            {
                int k = 0;
                while (char.IsAsciiDigit(s[i])) k = k * 10 + (s[i++] - '0');
                i++;                                  // skip '['
                string inner = Parse(s, ref i);       // advances i to the matching ']'
                i++;                                  // skip ']'
                for (int r = 0; r < k; r++) sb.Append(inner);
            }
            else
            {
                sb.Append(s[i++]);
            }
        }
        return sb.ToString();
    }
}`,
      complexity: R`<p>O(output length) time and memory; recursion depth = nesting depth.</p>`,
      followUps: ['Rewrite it iteratively with two stacks (counts and builders)', 'Write the encoder that produces the shortest encoding']
    }
  });

  practice.push({
    title: 'Integer to English Words',
    level: 'Hard', tags: ['methods', 'arrays', 'recursion', 'StringBuilder'], companies: ['Microsoft', 'Amazon', 'Meta', 'Oracle'],
    statement: R`<p>Write <code>public string NumberToWords(int num)</code> in class <code>Solution</code> that spells a non-negative integer in English words, capitalised, separated by single spaces, without "and": 123 → <code>"One Hundred Twenty Three"</code>.</p>`,
    constraints: R`0 ≤ num ≤ 2<sup>31</sup> − 1.`,
    example: R`<p><code>1234567</code> → <span class="c-g">"One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven"</span>; <code>1000010</code> → <span class="c-g">"One Million Ten"</span> (empty groups are skipped).</p>`,
    brute: { why: R`<p>A giant if/else for every range quickly becomes unreadable and buggy — 1,000,000 printing "One Million Thousand", or double spaces where a group is zero. Splitting into three-digit groups with lookup arrays keeps each piece tiny.</p>`, code: R`public class Brute
{
    public string NumberToWords(int num)
    {
        if (num == 0) return "Zero";
        if (num < 10) return new[] { "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine" }[num];
        return num.ToString();      // gives up beyond single digits
    }
}` },
    mcq: { q: 'How should 1,000,010 be split?', options: ['Digit by digit', 'Into groups of three from the right: 1 | 000 | 010', 'Into groups of three from the left: 100 | 001 | 0', 'By powers of two'], answer: 1, explain: 'English names each three-digit group with a scale word (Billion, Million, Thousand). Groups equal to zero are skipped entirely.' },
    hints: [
      R`<p>Hint 1: arrays for 0–19, the tens (Twenty…Ninety) and scales ("", Thousand, Million, Billion).</p>`,
      R`<p>Hint 2: a helper <code>Below1000(int n)</code> handles one group: hundreds, then a value below 100 (below 20 or tens + ones).</p>`,
      R`<p>Hint 3: loop over groups from the most significant; append the scale only for non-zero groups; handle 0 → "Zero" first.</p>`
    ],
    tests: { sig: 'int -> string', fn: 'numberToWords', cases: [
      [[0], 'Zero'], [[123], 'One Hundred Twenty Three'], [[12345], 'Twelve Thousand Three Hundred Forty Five'],
      [[1234567], 'One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven'], [[1000000], 'One Million'], [[1000010], 'One Million Ten'],
      [[2147483647], 'Two Billion One Hundred Forty Seven Million Four Hundred Eighty Three Thousand Six Hundred Forty Seven'],
      [[100], 'One Hundred'], [[20], 'Twenty'], [[19], 'Nineteen'], [[1000], 'One Thousand'], [[101], 'One Hundred One']
    ] },
    solution: {
      approach: R`<p>Split the number into three-digit groups from the top (billions down to units). A small helper spells one group into the shared StringBuilder; static readonly arrays hold the words.</p>`,
      code: R`using System.Text;

public class Solution
{
    private static readonly string[] Small = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    private static readonly string[] Tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    private static readonly (int Value, string Name)[] Scales = [(1_000_000_000, "Billion"), (1_000_000, "Million"), (1_000, "Thousand"), (1, "")];

    public string NumberToWords(int num)
    {
        if (num == 0) return "Zero";
        var sb = new StringBuilder();
        foreach (var (value, name) in Scales)
        {
            int group = num / value % 1000;
            if (group == 0) continue;
            Below1000(group, sb);
            if (name.Length > 0) sb.Append(' ').Append(name);
            sb.Append(' ');
        }
        return sb.ToString().TrimEnd();
    }

    private static void Below1000(int n, StringBuilder sb)
    {
        if (n >= 100)
        {
            sb.Append(Small[n / 100]).Append(" Hundred");
            n %= 100;
            if (n == 0) return;
            sb.Append(' ');
        }
        if (n < 20) sb.Append(Small[n]);
        else
        {
            sb.Append(Tens[n / 10]);
            if (n % 10 != 0) sb.Append(' ').Append(Small[n % 10]);
        }
    }
}`,
      complexity: R`<p>O(1): at most four groups of constant work.</p>`,
      followUps: ['Support negative numbers and long', 'Produce British English with "and" (One Hundred and One)']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`What happens when a non-empty <code>case</code> section in a C# <code>switch</code> statement has no <code>break</code>?`, options: ['Execution falls through to the next case', 'Compile error CS0163', 'The default section runs', 'A run-time exception'], answer: 1, explain: R`C# forbids implicit fall-through. End each non-empty section with break, return, throw, continue or goto case.` },
    { q: R`What does <code>(i % 3, i % 5) switch { (0, _) =&gt; "Fizz", (0, 0) =&gt; "FizzBuzz", _ =&gt; "" }</code> return for i = 15?`, options: ['"FizzBuzz"', '"Fizz"', '""', 'It does not compile'], answer: 1, explain: R`The first matching arm wins: (0, _) already matches (0, 0). The compiler also reports the second arm as unreachable (CS8510).` },
    { q: R`Which loop always runs its body at least once?`, options: ['for', 'while', 'do … while', 'foreach'], answer: 2, explain: R`do-while checks the condition after the body.` },
    { q: R`What happens if you call <code>list.Remove(x)</code> inside <code>foreach (var x in list)</code>?`, options: ['It works', 'The removed element is skipped silently', 'InvalidOperationException on the next iteration', 'Compile error'], answer: 2, explain: R`List&lt;T&gt; tracks a version number; the enumerator detects the change and throws "Collection was modified".` },
    { q: R`<code>static void F(int[] a) { a = new int[] { 9 }; }</code> — after <code>int[] x = { 1 }; F(x);</code>, what is <code>x[0]</code>?`, options: ['9', '1', '0', 'It throws'], answer: 1, explain: R`The reference is passed by value. Re-assigning the parameter changes only the method's copy; x still refers to the original array.` },
    { q: R`Which statement about <code>out</code> parameters is true?`, options: ['The caller must initialise the variable', 'The method must assign it on every path before returning', 'They can be used in async methods', 'They are read-only inside the method'], answer: 1, explain: R`out requires definite assignment by the callee; the caller may pass an unassigned variable (out var x).` },
    { q: R`Given <code>void P(long v)</code> and <code>void P(double v)</code>, which is called by <code>P(5)</code>?`, options: ['P(long)', 'P(double)', 'Ambiguous: CS0121', 'Neither: no conversion'], answer: 0, explain: R`Both conversions are implicit, but long is the better conversion target: long converts implicitly to double, not the other way round.` },
    { q: R`Where may a <code>params</code> parameter appear?`, options: ['Anywhere', 'Only as the last parameter, at most once', 'Only first', 'Only in static methods'], answer: 1, explain: R`params must be the last parameter and there can only be one.` },
    { q: R`For <code>int[,] g = new int[3, 4];</code>, what is <code>g.Length</code>?`, options: ['3', '4', '12', '7'], answer: 2, explain: R`Length is the total number of elements. Use GetLength(0) for rows (3) and GetLength(1) for columns (4).` },
    { q: R`What does <code>int[] a = [10, 20, 30, 40]; var b = a[1..^1];</code> give, and is it a copy?`, options: ['[20, 30], a new array', '[20, 30], a view into a', '[10, 20, 30], a copy', '[20, 30, 40], a copy'], answer: 0, explain: R`1..^1 is from index 1 up to (not including) the last element. On arrays a range creates a new array; use AsSpan for a view.` },
    { q: R`What does <code>string s = "abc"; s.ToUpper(); Console.WriteLine(s);</code> print?`, options: ['ABC', 'abc', 'Abc', 'Compile error'], answer: 1, explain: R`Strings are immutable; ToUpper returns a new string which is discarded here.` },
    { q: R`Which is the recommended case-insensitive equality check for identifiers?`, options: ['<code>a.ToLower() == b.ToLower()</code>', '<code>string.Equals(a, b, StringComparison.OrdinalIgnoreCase)</code>', '<code>a.Equals(b)</code>', '<code>string.Compare(a, b) == 0</code>'], answer: 1, explain: R`Ordinal ignore-case does not allocate and does not depend on the current culture (e.g. the Turkish I problem).` },
    { q: R`Appending one character n times with <code>s += c</code> costs about…`, options: ['O(n)', 'O(n log n)', 'O(n²) character copies', 'O(1)'], answer: 2, explain: R`Each += allocates a new string and copies the old content: 1 + 2 + … + n ≈ n²/2 copies. StringBuilder makes it O(n).` },
    { q: R`Which call builds <code>"a, b, c"</code> from a <code>string[]</code> in a single allocation?`, options: ['A loop with +=', '<code>string.Join(", ", arr)</code>', '<code>arr.ToString()</code>', '<code>string.Concat(arr)</code>'], answer: 1, explain: R`Join computes the total length first. Concat has no separator; arr.ToString() prints "System.String[]".` }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: R`How does the C# switch differ from Java's or C's, and what can it match?`, level: 'B', a: R`<p>C# has no implicit fall-through: every non-empty section must end with <code>break</code>, <code>return</code>, <code>throw</code> or <code>goto case</code>, which removes a classic bug (empty sections may still stack). It switches on any type, not just integers and strings, and supports patterns: constants, type patterns (<code>case string s:</code>), relational (<code>&lt; 0</code>), logical (<code>and</code>/<code>or</code>/<code>not</code>), property and tuple patterns, plus <code>when</code> guards. The switch <b>expression</b> (<code>x switch { … }</code>) returns a value, uses <code>_</code> as the default, warns about missing cases, and throws <code>SwitchExpressionException</code> if nothing matches.</p>`, followUps: ['How is a switch on strings compiled?', 'When would you still choose if/else?'] },
    { q: R`Explain pass-by-value vs pass-by-reference in C#, for both value and reference types.`, level: 'B', a: R`<p>By default everything is passed <b>by value</b>: the parameter is a copy of the argument. For a value type (int, struct) that is a copy of the data. For a reference type (array, class) it is a copy of the reference, so the method can mutate the shared object but cannot make the caller's variable refer to a different object. With <code>ref</code> (or <code>out</code>/<code>in</code>) the parameter becomes an alias of the caller's variable: assignments are visible to the caller — for a value type that changes the caller's data, for a reference type it can re-point the caller's reference.</p>`, followUps: ['What does ref add when passing a List&lt;T&gt;?', 'Why does C# not need ref for most object mutations?'] },
    { q: R`When would you use <code>out</code>, a tuple, or an exception to return a "maybe" result?`, level: 'I', a: R`<p><b>Try pattern with out</b> (<code>bool TryParse(string, out int)</code>) when failure is common and cheap to check, especially in hot paths — it is the BCL convention. <b>Tuples</b> (<code>(bool Ok, int Value)</code> or <code>(int Min, int Max)</code>) when returning several values that are all meaningful, and in async methods where out is not allowed. <b>Exceptions</b> when failure is exceptional and the caller cannot reasonably continue (a missing configuration file). Nullable returns (<code>int?</code>) or a Result type are other options; consistency across the codebase matters more than the choice.</p>`, followUps: ['Why can async methods not have out parameters?', 'What does the out var syntax do?'] },
    { q: R`What does the <code>in</code> modifier do and when does it actually improve performance?`, level: 'A', a: R`<p><code>in</code> passes an argument by read-only reference: no copy is made and the callee cannot assign to it. It helps for <b>large structs</b> (more than about 16–24 bytes) passed in hot paths, such as matrices or big value tuples. It can hurt: for small types the indirection costs more than a copy, and calling a non-readonly member on an <code>in</code> parameter of a non-readonly struct forces a <b>defensive copy</b> (the compiler cannot prove the member does not mutate). So pair <code>in</code> with <code>readonly struct</code>. C# 12's <code>ref readonly</code> parameters express the same intent while requiring the caller to pass a variable.</p>`, followUps: ['What is a defensive copy?', 'How would you verify the benefit (BenchmarkDotNet)?'] },
    { q: R`Explain overload resolution. Give an example of a surprising pick.`, level: 'I', a: R`<p>The compiler collects methods with the name, keeps those applicable to the arguments (with implicit conversions, optional parameters and params expansion), then picks the <b>better function member</b>: one whose conversions are at least as good for every argument and better for at least one. Identity beats implicit conversions, a conversion to a more specific type wins (int over long over double), non-generic beats generic, normal form beats params expansion, and a candidate needing no default values wins. Surprise 1: <code>P(null)</code> with <code>P(string)</code> and <code>P(object)</code> picks string. Surprise 2: with inheritance, a method in the derived class taking <code>double</code> beats a base-class method taking <code>int</code> for <code>d.F(5)</code>, because the compiler stops at the first class with an applicable method.</p>`, followUps: ['What causes CS0121?', 'How do optional parameters interact with overloads?'] },
    { q: R`What are the risks of optional parameters in public library APIs?`, level: 'A', a: R`<p>Default values are compiled into the <b>call site</b>. Changing a default in a new library version does nothing for already-compiled callers until they rebuild, which leads to version-dependent behaviour. Adding a new optional parameter changes the method signature, which is a <b>binary breaking change</b> (callers compiled against the old signature get <code>MissingMethodException</code>). The .NET design guidelines therefore recommend overloads (or an options object) in public APIs, with optional parameters mostly for internal code. Also, interface and implementation can declare different defaults, and the one used depends on the static type at the call site.</p>`, followUps: ['How would you add a parameter to a published method safely?', 'What is the options pattern?'] },
    { q: R`Rectangular <code>int[,]</code> vs jagged <code>int[][]</code>: differences and when to use each?`, level: 'I', a: R`<p>A rectangular array is one object with all elements in a single contiguous block; every row has the same length; indexing <code>g[r, c]</code> computes an offset. A jagged array is an array of references to separate row arrays; rows may differ in length or be null; indexing <code>j[r][c]</code> dereferences twice. Jagged arrays are usually faster in loops because the JIT optimises single-dimension array access and bounds-check elimination better, and they fit irregular data (triangles, adjacency lists). Rectangular arrays are compact and convenient for fixed grids. For maximum speed in numeric code use a flat 1-D array with <code>r * cols + c</code>.</p>`, followUps: ['How many objects does new int[1000][] with all rows created allocate?', 'Why does array covariance exist?'] },
    { q: R`Why are strings immutable in .NET? What are the consequences?`, level: 'B', a: R`<p>Immutability makes strings <b>safe to share</b>: they can be used as dictionary keys (hash never changes), passed between threads without locking, interned (identical literals share one object), and handed to untrusted code without defensive copies. The cost is that every modification creates a new string: concatenating in a loop is O(n²), and APIs like <code>Replace</code> or <code>ToUpper</code> return new strings — forgetting to assign the result is a common bug. Mitigations: <code>StringBuilder</code>, <code>string.Join</code>, <code>string.Create</code>, and <code>ReadOnlySpan&lt;char&gt;</code> slicing without copying.</p>`, followUps: ['What is string interning?', 'Can you mutate a string with unsafe code, and why is that dangerous?'] },
    { q: R`How do you compare strings correctly? Talk about ordinal vs culture-sensitive comparison.`, level: 'I', a: R`<p><b>Ordinal</b> comparison compares UTF-16 code units numerically: fast, predictable, culture-independent — right for identifiers, file paths on case-sensitive systems, keys, protocols and algorithms. <b>Culture-sensitive</b> comparison follows linguistic rules of a culture (accents, ligatures, sort order) — right for sorting text shown to users. <code>==</code> and <code>string.Equals(a, b)</code> are ordinal. <code>string.Compare</code>, <code>StartsWith(string)</code>, <code>IndexOf(string)</code> and <code>ToUpper()</code> without arguments use the current culture, which causes bugs like the Turkish dotted/dotless I. Always pass a <code>StringComparison</code> or <code>StringComparer</code> (e.g. <code>StringComparer.OrdinalIgnoreCase</code> for a case-insensitive dictionary).</p>`, followUps: ['What is the Turkish I problem?', 'How does a HashSet with OrdinalIgnoreCase hash strings?'] },
    { q: R`How does StringBuilder work internally and when is it not worth it?`, level: 'I', a: R`<p>StringBuilder keeps a mutable buffer of chars with spare capacity; since .NET 4 it is a linked list of chunks (up to 8,000 chars each), so appends are amortised O(1) and growing never copies existing chunks. <code>ToString()</code> copies the chunks once into the final string. It is not worth it for a fixed, small number of pieces in a single expression — <code>a + b + c</code> compiles to one <code>string.Concat</code> and interpolation uses a pooled handler — or for joining a collection (<code>string.Join</code>). Use it when a string grows in a loop or across many method calls, and pre-size it when you know the final length.</p>`, followUps: ['Why can sb[i] be slow on a large builder?', 'What does StringBuilder.Append($"...") compile to?'] },
    { q: R`What is the maximum recursion depth in C# and how do you handle deep recursion?`, level: 'I', a: R`<p>There is no fixed number: depth is limited by the thread's stack size (1 MB by default for the main thread on Windows; typically 8 MB on Linux for the main thread but 1.5 MB for thread-pool threads) divided by the frame size. Practically, plan for about 10<sup>4</sup> frames. A <code>StackOverflowException</code> cannot be caught and terminates the process. The C# compiler does not guarantee tail-call optimisation. For deep inputs (linked lists, degenerate trees, DFS on 10<sup>5</sup> nodes) convert to an explicit loop or <code>Stack&lt;T&gt;</code>, or, as a last resort, run the work on a <code>new Thread(work, maxStackSize)</code>.</p>`, followUps: ['Rewrite an in-order traversal iteratively', 'Why can StackOverflowException not be caught?'] },
    { q: R`What do indices (<code>^1</code>) and ranges (<code>1..3</code>) compile to, and which types support them?`, level: 'A', a: R`<p><code>^n</code> creates a <code>System.Index</code> counting from the end and <code>a..b</code> a <code>System.Range</code>. For a type with a <code>Length</code> or <code>Count</code> property and an <code>int</code> indexer, the compiler rewrites <code>x[^1]</code> to <code>x[x.Length - 1]</code> (no Index object). For ranges it calls a <code>Slice(start, length)</code> method if present (Span, Memory), uses <code>Substring</code> for strings and <code>RuntimeHelpers.GetSubArray</code> for arrays — the last two <b>allocate copies</b>. So <code>a[1..]</code> on an array in a loop is O(n) per use; prefer <code>a.AsSpan(1..)</code> for a zero-copy view. <code>List&lt;T&gt;</code> supports <code>^1</code> but not ranges in C# 12.</p>`, followUps: ['How would you make your own collection support ranges?', 'Why does x[^0] throw?'] },
    { q: R`Write the signature of a method that sums any number of ints, and explain what the call <code>Sum(1, 2, 3)</code> costs.`, level: 'B', a: R`<p><code>static int Sum(params int[] values)</code>. The call <code>Sum(1, 2, 3)</code> is rewritten by the compiler to <code>Sum(new int[] { 1, 2, 3 })</code>, so each call allocates a small array on the heap; <code>Sum()</code> passes an empty array (cached as <code>Array.Empty&lt;int&gt;()</code>). Passing an existing <code>int[]</code> reuses it. In hot paths, APIs provide fixed-arity overloads (<code>Sum(int, int)</code>) or, from C# 13, <code>params ReadOnlySpan&lt;int&gt;</code>, which can use stack memory and avoids the allocation.</p>`, followUps: ['What happens with Sum(null)?', 'Why does Console.WriteLine have so many overloads?'] },
    { q: R`Design question: a log formatter is called 50,000 times per second and allocates heavily. How do you reduce allocations in its string handling?`, level: 'E', a: R`<p>Measure first (dotnet-counters for allocation rate, a memory profiler or BenchmarkDotNet with <code>[MemoryDiagnoser]</code>). Then: avoid building strings for disabled levels (check <code>IsEnabled</code> or use logging source generators with <code>[LoggerMessage]</code>, which also avoid boxing); use message templates instead of interpolation; reuse <code>StringBuilder</code>s via an <code>ObjectPool</code>; format directly into spans or UTF-8 buffers (<code>ISpanFormattable.TryFormat</code>, <code>Utf8Formatter</code>, <code>ArrayBufferWriter&lt;byte&gt;</code>); cache constant strings and interned category names; avoid <code>params object[]</code> overloads that box value types; and write to a buffered stream rather than creating one string per line. Verify the improvement with the same benchmark.</p>`, followUps: ['What does [LoggerMessage] generate?', 'How do you detect Gen0 GC pressure in production?'] }
  );

  registerModule({
    id: 'csharp02',
    title: 'Control Flow, Methods, Arrays & Strings',
    intro: R`<p>With the basics of module 1 in place, we now write real logic. You will make decisions with <code>if</code> and C#'s safer <b>switch</b> (no fall-through, plus powerful switch expressions with patterns), repeat work with the four loop types, and package logic into <b>methods</b> — with tuples for multiple results, local functions and recursion. Then we look at how arguments travel: by value, or by reference with <code>ref</code>, <code>out</code> and <code>in</code>, and at <b>optional and named arguments</b>, <code>params</code> and how the compiler chooses between <b>overloads</b>.</p>
<p>The second half is about data: <b>arrays</b> (1-D, rectangular <code>[,]</code> and jagged <code>[][]</code>, indices and ranges), <b>strings</b> and why their immutability matters, and <b>StringBuilder</b> for efficient building. Visualizers step through switch arms, the call stack during recursion, by-value vs <code>ref</code> frames, overload ranking, in-place matrix rotation, string objects on the heap and StringBuilder chunk growth. These topics appear in nearly every C# coding round, so the practice set is full of classic interview problems solved idiomatically.</p>`,
    goals: [
      'Write clear branching with if, switch statements and switch expressions using relational, logical and tuple patterns',
      'Choose the right loop and avoid modifying collections during foreach',
      'Design methods with tuples, local functions and recursion, and reason about stack depth',
      'Use <code>ref</code>, <code>out</code> and <code>in</code> correctly, including the Try pattern',
      'Use optional and named arguments and <code>params</code>, and predict which overload the compiler picks',
      'Work with 1-D, rectangular and jagged arrays, indices and ranges, and know which operations copy',
      'Manipulate strings correctly (ordinal comparison, immutability) and build them efficiently with StringBuilder'
    ],
    prereqs: R`<p>Module <b>C# 1 (.NET, Syntax, Types &amp; Console I/O)</b>: types, var, string interpolation and console input. Basic loops and functions in any language help.</p>`,
    hours: 11,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
